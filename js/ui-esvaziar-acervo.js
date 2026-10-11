// ============================================================
// ui-esvaziar-acervo.js: modal "Esvaziar o acervo" (Fase 13, etapa 13b)
//
// Mostra as três caixas (Dados, Preferências, Cadastros pré-prontos), o
// resumo com contagens, o aviso de backup e o campo da palavra de confirmação
// (F13-D4). Ao confirmar, baixa o backup completo (com capas, mais as Versões
// Alternativas quando existirem, F13-D7) e tira um retrato forçado antes de
// qualquer apagar. A lógica de o que sai e o que fica é de esvaziar-acervo.js.
//
// O apagar efetivo (gravar o acervo esvaziado, limpar localStorage e IndexedDB,
// avisar as outras abas, recarregar) é a etapa 13c e mora em apagar-acervo.js;
// entra aqui como o `apagar` padrão de confirmarEsvaziarAcervo.
// ============================================================

import { db, exportarJSON } from './db.js';
import { tirarSnapshotSeNecessario } from './autobackup.js';
import { contarCapas } from './capas.js';
import { mostrarAviso } from './utils.js';
import { garantirModal, toggleModal } from './modais.js';
import { CHAVE_VERSOES_FILTRADAS } from './inventario-armazenamento.js';
import { nomesDoBackup } from './extras-backup.js';
import { executarEsvaziamento } from './apagar-acervo.js';
import { baixarExtras } from './ui-extras-backup.js';
import {
    contarVersoesFiltradas,
    normalizarCaixas,
    planoArmazenamento,
    resumirEsvaziamento,
} from './esvaziar-acervo.js';

export const PALAVRA_CONFIRMACAO = 'ESVAZIAR';
const ID_MODAL = 'modal-esvaziar-acervo';

const $ = (id) => document.getElementById(id);

// Quantidades que o db não enxerga (capas no IndexedDB, versões no localStorage).
let _externos = { capas: 0, versoesFiltradas: 0, preferencias: 0 };
let _ocupado = false;

// ─── Funções puras (testadas sem DOM) ────────────────────────

export function palavraConfere(texto) {
    return String(texto ?? '').trim() === PALAVRA_CONFIRMACAO;
}

// O botão só libera com pelo menos uma caixa marcada, a palavra exata e nada em andamento.
export function podeConfirmar(caixas, palavra, ocupado = false) {
    const c = normalizarCaixas(caixas);
    return !ocupado && (c.dados || c.preferencias || c.preProntos) && palavraConfere(palavra);
}

const qtd = (n, singular, plural) => `${n} ${n === 1 ? singular : plural}`;

// Texto do resumo, por seção. `configuracoes` é a quantidade de chaves de
// preferência presentes no navegador.
export function descreverResumo(resumo, { configuracoes = 0 } = {}) {
    const secoes = [];
    const notas = [];

    if (resumo.vazio) {
        return { secoes, notas: ['Marque ao menos uma caixa para ver o que será apagado.'] };
    }

    if (resumo.dados) {
        const d = resumo.dados;
        const itens = d.itens.map((i) => `${i.rotulo}: ${i.quantidade}`);
        const proprios = d.cadastrosProprios;
        if (proprios.periodosHistoricos) {
            itens.push(`períodos históricos criados por você: ${proprios.periodosHistoricos}`);
        }
        if (proprios.movimentosEscolas) {
            itens.push(`movimentos e escolas criados por você: ${proprios.movimentosEscolas}`);
        }
        if (proprios.templatesEstrutura) {
            itens.push(`templates criados por você: ${proprios.templatesEstrutura}`);
        }
        if (d.capas) itens.push(`imagens de capa: ${d.capas}`);
        if (d.versoesFiltradas) itens.push(`versões alternativas: ${d.versoesFiltradas}`);
        secoes.push({
            chave: 'dados',
            titulo: 'Dados',
            itens,
            texto: itens.length ? null : 'Não há dados a apagar.',
        });
        notas.push('O acervo fica vazio, sem os Assuntos e Temas de exemplo.');
    }

    if (resumo.preferencias) {
        secoes.push({
            chave: 'preferencias',
            titulo: 'Preferências',
            itens: [],
            texto: configuracoes
                ? `${qtd(configuracoes, 'configuração salva', 'configurações salvas')} neste navegador.`
                : 'Nenhuma preferência salva neste navegador.',
        });
    }

    if (resumo.preProntos) {
        const itens = Object.values(resumo.preProntos.cadastros).map((x) => {
            const ficam = x.mantidosPorUso + x.mantidosPorHierarquia;
            let linha = `${x.rotulo} de fábrica: ${x.apagar} para apagar`;
            if (ficam) {
                linha += `, ${ficam} ${ficam === 1 ? 'fica' : 'ficam'} por ${
                    ficam === 1 ? 'estar' : 'estarem'
                } em uso`;
                if (x.mantidosPorHierarquia) linha += ' ou ligado(s) a um que fica';
            }
            return linha;
        });
        secoes.push({ chave: 'preProntos', titulo: 'Cadastros pré-prontos', itens, texto: null });
        notas.push('Os cadastros de fábrica apagados não voltam sozinhos ao recarregar.');
    } else if (resumo.dados) {
        notas.push(
            'Os cadastros de fábrica ficam e voltam ao estado inicial: os que você tinha excluído reaparecem.',
        );
    }

    return { secoes, notas };
}

// Texto da caixa de backup: { texto, extra, obrigatorio, marcado, visivel }.
export function descreverBackup(resumo) {
    const b = resumo.backup;
    if (resumo.vazio || (!b.obrigatorio && !b.acervo && !b.incluiExtras)) {
        return { texto: '', extra: '', obrigatorio: false, marcado: false, visivel: false };
    }
    const extra = b.incluiExtras
        ? `Também baixa o arquivo de extras, com as preferências e as Versões Alternativas, que o JSON do acervo não inclui.${
              b.acervo ? ' O navegador pode pedir permissão para baixar dois arquivos.' : ''
          }`
        : '';
    if (b.obrigatorio) {
        return {
            texto: 'Baixar o backup completo (com as capas) antes de apagar. É obrigatório quando Dados está marcado.',
            extra,
            obrigatorio: true,
            marcado: true,
            visivel: true,
        };
    }
    return {
        texto: b.acervo
            ? 'Baixar o backup completo antes de apagar (recomendado).'
            : 'Baixar o arquivo de extras (preferências e Versões Alternativas) antes de apagar (recomendado).',
        extra,
        obrigatorio: false,
        marcado: true,
        visivel: true,
    };
}

// ─── Leitura do estado do modal ──────────────────────────────

export function lerCaixas() {
    return normalizarCaixas({
        dados: $('esv-chk-dados')?.checked === true,
        preferencias: $('esv-chk-preferencias')?.checked === true,
        preProntos: $('esv-chk-pre-prontos')?.checked === true,
    });
}

function chavesDoNavegador() {
    try {
        return Object.keys(localStorage);
    } catch {
        return [];
    }
}

function lerVersoesFiltradasBrutas() {
    try {
        return localStorage.getItem(CHAVE_VERSOES_FILTRADAS);
    } catch {
        return null;
    }
}

async function carregarExternos() {
    _externos = {
        capas: await contarCapas(),
        versoesFiltradas: contarVersoesFiltradas(lerVersoesFiltradasBrutas()),
        preferencias: planoArmazenamento({ preferencias: true }, chavesDoNavegador())
            .localStorageRemover.length,
    };
}

// ─── Desenho ─────────────────────────────────────────────────

function desenharResumo(resumo) {
    const alvo = $('esv-resumo');
    if (!alvo) return;
    const configuracoes = planoArmazenamento({ preferencias: true }, chavesDoNavegador())
        .localStorageRemover.length;
    const { secoes, notas } = descreverResumo(resumo, { configuracoes });

    alvo.replaceChildren();
    for (const secao of secoes) {
        const bloco = document.createElement('div');
        const titulo = document.createElement('p');
        titulo.className = 'font-semibold text-red-700 dark:text-red-400';
        titulo.textContent = secao.titulo;
        bloco.appendChild(titulo);
        if (secao.texto) {
            const p = document.createElement('p');
            p.className = 'text-gray-700 dark:text-slate-300';
            p.textContent = secao.texto;
            bloco.appendChild(p);
        }
        if (secao.itens.length) {
            const ul = document.createElement('ul');
            ul.className = 'list-disc pl-5 text-gray-700 dark:text-slate-300';
            for (const item of secao.itens) {
                const li = document.createElement('li');
                li.textContent = item;
                ul.appendChild(li);
            }
            bloco.appendChild(ul);
        }
        alvo.appendChild(bloco);
    }
    for (const nota of notas) {
        const p = document.createElement('p');
        p.className = 'text-xs text-gray-500 dark:text-slate-400';
        p.textContent = nota;
        alvo.appendChild(p);
    }
}

function desenharBackup(resumo) {
    const info = descreverBackup(resumo);
    const bloco = $('esv-backup');
    if (bloco) bloco.classList.toggle('hidden', !info.visivel);
    const chk = $('esv-chk-backup');
    if (chk) {
        chk.disabled = info.obrigatorio;
        if (info.obrigatorio) chk.checked = true;
    }
    const texto = $('esv-backup-texto');
    if (texto) texto.textContent = info.texto;
    const extra = $('esv-backup-extra');
    if (extra) {
        extra.textContent = info.extra;
        extra.classList.toggle('hidden', !info.extra);
    }
}

// Reavalia tudo a partir do estado atual das caixas e do campo da palavra.
export function atualizarModalEsvaziarAcervo() {
    const caixas = lerCaixas();
    const resumo = resumirEsvaziamento(db, caixas, _externos);
    desenharResumo(resumo);
    desenharBackup(resumo);
    const botao = $('esv-btn-confirmar');
    if (botao) botao.disabled = !podeConfirmar(caixas, $('esv-palavra')?.value, _ocupado);
}

function mostrarStatus(texto) {
    const el = $('esv-status');
    if (!el) return;
    el.textContent = texto || '';
    el.classList.toggle('hidden', !texto);
}

export async function abrirModalEsvaziarAcervo() {
    await garantirModal(ID_MODAL);
    for (const id of ['esv-chk-dados', 'esv-chk-preferencias', 'esv-chk-pre-prontos']) {
        const el = $(id);
        if (el) el.checked = false;
    }
    const palavra = $('esv-palavra');
    if (palavra) palavra.value = '';
    const backup = $('esv-chk-backup');
    if (backup) backup.checked = true;
    _ocupado = false;
    mostrarStatus('');
    await carregarExternos();
    atualizarModalEsvaziarAcervo();

    const modal = $(ID_MODAL);
    if (modal && modal.classList.contains('hidden')) await toggleModal(ID_MODAL);
}

// ─── Confirmação ─────────────────────────────────────────────

const MENSAGENS_FALHA_APAGAR = {
    gravacao: 'Não foi possível gravar o acervo esvaziado. Nada foi apagado. Tente de novo.',
    'sem-caixa': 'Marque ao menos uma caixa. Nada foi apagado.',
};

// Botão "Baixar backup e esvaziar". Ordem: backup, retrato forçado, apagar.
// Qualquer falha antes do apagar interrompe tudo e nada é apagado.
// `deps` existe para teste.
export async function confirmarEsvaziarAcervo(deps = {}) {
    const d = {
        exportarJSON,
        tirarSnapshotSeNecessario,
        baixarExtras,
        apagar: (caixas) => executarEsvaziamento(caixas),
        ...deps,
    };
    if (_ocupado) return { sucesso: false, motivo: 'ocupado' };

    const caixas = lerCaixas();
    if (!podeConfirmar(caixas, $('esv-palavra')?.value)) {
        return { sucesso: false, motivo: 'nao-liberado' };
    }

    const resumo = resumirEsvaziamento(db, caixas, _externos);
    const baixarBackup = resumo.backup.obrigatorio || $('esv-chk-backup')?.checked === true;
    const alteraDb = caixas.dados || caixas.preProntos;

    _ocupado = true;
    atualizarModalEsvaziarAcervo();
    try {
        if (baixarBackup) {
            mostrarStatus('Baixando o backup...');
            const nomes = nomesDoBackup(new Date());
            if (resumo.backup.acervo) await d.exportarJSON(true, nomes.acervo);
            if (resumo.backup.incluiExtras) d.baixarExtras(nomes.extras);
        }

        if (alteraDb) {
            mostrarStatus('Tirando o retrato de segurança...');
            const ok = await d.tirarSnapshotSeNecessario(db, true);
            if (!ok) {
                mostrarStatus('');
                mostrarAviso(
                    'Não foi possível tirar o retrato de segurança. Nada foi apagado. Tente de novo.',
                );
                return { sucesso: false, motivo: 'snapshot' };
            }
        }

        // Com sucesso, a página recarrega dentro de `apagar` e o que vem depois
        // só roda em teste (ou na janela de milissegundos até a recarga).
        mostrarStatus('Apagando...');
        const resultado = await d.apagar(caixas, resumo);
        if (resultado?.apagado) {
            mostrarStatus('Apagado. Recarregando a página...');
            return { sucesso: true, apagado: true, resumo, falhas: resultado.falhas || [] };
        }
        const motivo = resultado?.motivo || 'desconhecido';
        mostrarStatus('');
        mostrarAviso(
            MENSAGENS_FALHA_APAGAR[motivo] || 'O apagar não foi concluído. Nada foi apagado.',
        );
        return { sucesso: false, apagado: false, motivo };
    } catch (err) {
        console.error('[ui-esvaziar-acervo.js] Falha antes de apagar:', err);
        mostrarStatus('');
        mostrarAviso('Algo falhou antes de apagar. Nada foi apagado. Tente de novo.');
        return { sucesso: false, motivo: 'erro' };
    } finally {
        _ocupado = false;
        const palavra = $('esv-palavra');
        if (palavra) palavra.value = '';
        atualizarModalEsvaziarAcervo();
    }
}
