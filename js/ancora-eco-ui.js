// ancora-eco-ui.js: interface da âncora do Eco nos modais de Poema e Prosa
// (Fase 11, etapa 4a, decisão F11-D6). O dado e as regras vivem em
// ancora-eco.js; aqui ficam o seletor de âncoras (chips marcáveis), a troca
// de tipo com confirmação e o diálogo ao tirar um personagem ou pessoa de um
// dos dois textos.
//
// O editor registra um "provedor" (registrarProvedorAncora) com o que só ele
// sabe: o estado atual do modal (personagens e pessoas ainda não salvos), o id
// do texto aberto e a lista de Ecos do modal. Sem provedor (testes isolados,
// modal fora do DOM) tudo vira no-op e a remoção segue direto.

import { db } from './db.js';
import { abrirModalConfirmacao, escapeHtml } from './utils.js';
import {
    candidatosAncora,
    ecosAncoradosEnvolvendo,
    especieDoTipoEco,
    removerAncoraDosEcos,
} from './ancora-eco.js';

const PREFIXO = { poemas: 'p', prosas: 'pr' };
const TABELA_POR_PREFIXO = { p: 'poemas', pr: 'prosas' };

const NOME_ESPECIE = { personagem: 'personagem', pessoa: 'pessoa' };

// Seleção em andamento no formulário do Eco, por tabela: ids da espécie
// definida pelo tipo escolhido. `tipo` guarda o último tipo aceito, para
// desfazer a troca quando o usuário cancela a confirmação.
const estado = {
    poemas: { ids: [], tipo: '' },
    prosas: { ids: [], tipo: '' },
};

// Remoções "manter" não precisam de nada. As "remover" que atingem Ecos de
// OUTROS textos só valem ao salvar (cancelar o modal não pode alterar outro
// registro): ficam aqui até lá.
const pendencias = { poemas: [], prosas: [] };

let provedor = null;

export function registrarProvedorAncora(p) {
    provedor = p;
}

function el(tabela, sufixo) {
    return document.getElementById(`${PREFIXO[tabela]}-${sufixo}`);
}

function textoPorId(id) {
    return (db.poemas || []).find((p) => p.id == id) || (db.prosas || []).find((p) => p.id == id);
}

function nomeNoCadastro(especie, id) {
    const colecao = especie === 'personagem' ? db.personagens : db.pessoas;
    return (colecao || []).find((x) => x.id == id)?.nome || '(removido)';
}

// ─── Estado da seleção ───────────────────────────────────────

export function ancorasSelecionadas(tabela) {
    const especie = especieDoTipoEco(estado[tabela].tipo);
    if (!especie) return [];
    return estado[tabela].ids.map((id) => ({ especie, id }));
}

// Chamado ao editar um Eco existente: devolve ao formulário o tipo e as
// âncoras dele.
export function definirAncoras(tabela, tipo, lista) {
    const especie = especieDoTipoEco(tipo);
    estado[tabela].tipo = especie ? tipo : '';
    estado[tabela].ids = especie
        ? (lista || []).filter((a) => a.especie === especie).map((a) => a.id)
        : [];
    repintarAncoras(tabela);
}

export function limparAncoras(tabela) {
    estado[tabela] = { ids: [], tipo: '' };
    repintarAncoras(tabela);
}

// ─── Seletor de chips ────────────────────────────────────────

export function repintarAncoras(tabela) {
    const area = el(tabela, 'eco-ancoras');
    if (!area) return;
    const tipo = el(tabela, 'eco-tipo')?.value || '';
    const especie = especieDoTipoEco(tipo);
    if (!especie || !provedor) {
        area.classList.add('hidden');
        area.innerHTML = '';
        return;
    }
    area.classList.remove('hidden');

    const rotuloCampo = `Âncora (opcional): ${
        especie === 'personagem' ? 'quais personagens' : 'quais pessoas'
    } sustentam este eco`;
    const cabecalho = `<p class="text-[11px] font-bold text-gray-500 dark:text-slate-400 mb-1">${rotuloCampo}</p>`;

    const alvo = textoPorId(el(tabela, 'eco-poema')?.value);
    if (!alvo) {
        area.innerHTML = `${cabecalho}<p class="text-[11px] text-gray-400 dark:text-slate-500">Escolha o texto para ver quem aparece nos dois.</p>`;
        return;
    }

    const candidatos = candidatosAncora(db, provedor.estadoModal(tabela), alvo, especie);
    const selecionados = new Set(estado[tabela].ids.map(String));
    // Âncora já gravada que deixou de valer (um dos textos perdeu o vínculo):
    // continua à vista, marcada, para dar para tirar ou conferir.
    const antigas = estado[tabela].ids
        .filter((id) => !candidatos.some((c) => c.id == id))
        .map((id) => ({ id, nome: nomeNoCadastro(especie, id), antiga: true }));

    const chips = [...candidatos, ...antigas]
        .map((c) => {
            const marcado = selecionados.has(String(c.id)) ? 'checked' : '';
            const aviso = c.antiga
                ? ' <span class="text-amber-600 dark:text-amber-400" title="Não está mais nos dois textos">⚠</span>'
                : '';
            return `<label class="inline-flex items-center gap-1 mr-3 mb-1 text-xs cursor-pointer">
                <input type="checkbox" data-eco-ancora="${especie}:${c.id}" ${marcado}>
                <span>${escapeHtml(c.nome)}${aviso}</span>
            </label>`;
        })
        .join('');

    area.innerHTML =
        cabecalho +
        (chips ||
            `<p class="text-[11px] text-gray-400 dark:text-slate-500">Nenhum ${NOME_ESPECIE[especie]} aparece nos dois textos. A âncora é opcional.</p>`);
}

function alternar(tabela, valor, marcado) {
    const id = parseInt(String(valor).split(':')[1], 10);
    const atual = estado[tabela].ids;
    estado[tabela].ids = marcado
        ? atual.some((x) => x == id)
            ? atual
            : [...atual, id]
        : atual.filter((x) => x != id);
}

// Troca de tipo: guarda a espécie nova. Se já havia âncoras de outra espécie,
// pede confirmação e limpa; cancelar devolve o tipo anterior.
function aoTrocarTipo(tabela) {
    const select = el(tabela, 'eco-tipo');
    const novo = select?.value || '';
    const especieNova = especieDoTipoEco(novo);
    const especieAntiga = especieDoTipoEco(estado[tabela].tipo);
    const perderia =
        estado[tabela].ids.length > 0 && especieAntiga && especieAntiga !== especieNova;

    if (!perderia) {
        if (especieNova !== especieAntiga) estado[tabela].ids = [];
        estado[tabela].tipo = especieNova ? novo : '';
        repintarAncoras(tabela);
        return;
    }
    abrirModalConfirmacao({
        rotulo: 'Âncora de Eco',
        titulo: 'Trocar o tipo do Eco?',
        mensagem:
            'As âncoras escolhidas são de outra espécie e serão limpas. Para usar as duas espécies, crie outro Eco.',
        textoConfirmar: 'Trocar e limpar',
        corConfirmar: '#7c3aed',
        onConfirmar: () => {
            estado[tabela].ids = [];
            estado[tabela].tipo = especieNova ? novo : '';
            repintarAncoras(tabela);
        },
    });
    // Enquanto a confirmação está aberta, o select volta ao tipo anterior; se
    // confirmar, o tipo novo é aplicado pelo onConfirmar.
    document.getElementById('excl-cancelar')?.addEventListener(
        'click',
        () => {
            if (select) select.value = estado[tabela].tipo;
        },
        { once: true },
    );
    if (select) {
        const novoValor = select.value;
        select.value = estado[tabela].tipo;
        const botao = document.getElementById('excl-confirmar');
        const original = botao?.onclick;
        if (botao && original) {
            botao.onclick = () => {
                select.value = novoValor;
                original();
            };
        }
    }
}

let ligado = false;
// Escuta delegada no documento: os modais são carregados depois, e o HTML dos
// chips é recriado a cada repintura.
export function iniciarAncoraEco() {
    if (ligado || typeof document === 'undefined') return;
    ligado = true;
    document.addEventListener('change', (e) => {
        const alvo = e.target;
        if (!(alvo instanceof HTMLElement)) return;

        const chip = alvo.closest('[data-eco-ancora]');
        if (chip) {
            const area = chip.closest('[data-eco-ancoras-tabela]');
            const tabela = area?.getAttribute('data-eco-ancoras-tabela');
            if (tabela && estado[tabela]) {
                alternar(tabela, chip.getAttribute('data-eco-ancora'), chip.checked);
            }
            return;
        }
        for (const [prefixo, tabela] of Object.entries(TABELA_POR_PREFIXO)) {
            if (alvo.id === `${prefixo}-eco-tipo`) return aoTrocarTipo(tabela);
            if (alvo.id === `${prefixo}-eco-poema`) return repintarAncoras(tabela);
        }
    });
}

// ─── Remoção de personagem ou pessoa de um texto ─────────────

function titulosUnicos(titulos) {
    return [...new Set(titulos.filter(Boolean))];
}

function temAncora(eco, especie, id) {
    return (eco.ancoras || []).some((a) => a.especie === especie && a.id == id);
}

/**
 * Chamado antes de tirar um Personagem ou Pessoa do texto aberto no modal.
 * Se ele ancora algum Eco com este texto, pergunta: manter a âncora (com
 * aviso), remover a âncora ou cancelar. Sem Eco afetado, ou sem provedor,
 * `remover()` roda direto. `remover` é quem de fato tira o vínculo do modal.
 */
export function confirmarRemocaoVinculo({ tabela, especie, id, nome, remover }) {
    if (!provedor) {
        remover();
        return;
    }
    const ecosModal = provedor.ecosDoModal(tabela);
    const doModal = ecosModal.filter((eco) => temAncora(eco, especie, id));
    const textoId = provedor.textoId(tabela);
    // Ecos de outros textos que apontam para este (o Eco mora no mais novo).
    // Os que moram neste texto já estão em `ecosModal`, que vale mais que o db.
    const doBanco =
        textoId == null
            ? []
            : ecosAncoradosEnvolvendo(db, textoId, especie, id).filter((f) => f.donoId != textoId);

    if (!doModal.length && !doBanco.length) {
        remover();
        return;
    }

    const titulos = titulosUnicos([
        ...doModal.map((eco) => textoPorId(eco.id)?.titulo),
        ...doBanco.map((f) => f.titulo),
    ]);
    const total = doModal.length + doBanco.length;
    const quantos = `${total} Eco${total !== 1 ? 's' : ''}`;
    const lista = titulos.length ? ` (${titulos.map((t) => `"${t}"`).join(', ')})` : '';

    const tirarAncora = () => {
        doModal.forEach((eco) => {
            eco.ancoras = eco.ancoras.filter((a) => !(a.especie === especie && a.id == id));
            if (!eco.ancoras.length) delete eco.ancoras;
        });
        estado[tabela].ids = estado[tabela].ids.filter((x) => x != id);
        if (doBanco.length) pendencias[tabela].push({ especie, id, afetados: doBanco });
    };

    abrirModalConfirmacao({
        rotulo: 'Âncora de Eco',
        titulo: `Tirar ${nome} deste texto?`,
        mensagem: `${nome} ancora ${quantos} com este texto${lista}. "Manter com aviso" deixa a âncora marcada como "não está mais nos dois textos". "Remover a âncora" tira só a âncora; o Eco continua. A mudança vale ao salvar.`,
        textoConfirmar: 'Manter com aviso',
        corConfirmar: '#7c3aed',
        focarConfirmar: true,
        acaoSecundaria: {
            texto: 'Remover a âncora',
            onClick: () => {
                remover();
                tirarAncora();
                provedor.repintarEcos(tabela);
                repintarAncoras(tabela);
            },
        },
        onConfirmar: () => {
            remover();
            provedor.repintarEcos(tabela);
            repintarAncoras(tabela);
        },
    });
}

// Ao salvar o texto: aplica as remoções de âncora que atingem Ecos de outros
// textos. Se a pessoa/personagem voltou ao texto antes de salvar, a âncora
// volta a valer e a remoção é descartada.
export function aplicarPendenciasAncora(tabela) {
    const fila = pendencias[tabela];
    pendencias[tabela] = [];
    if (!fila.length || !provedor) return 0;
    const modal = provedor.estadoModal(tabela);
    let removidas = 0;
    fila.forEach(({ especie, id, afetados }) => {
        const lista = especie === 'personagem' ? modal.personagens : modal.pessoas;
        const campo = especie === 'personagem' ? 'personagemId' : 'pessoaId';
        if ((lista || []).some((v) => v[campo] == id)) return;
        removidas += removerAncoraDosEcos(db, afetados, especie, id).length;
    });
    return removidas;
}

export function limparPendenciasAncora(tabela) {
    pendencias[tabela] = [];
}
