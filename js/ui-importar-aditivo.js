// ============================================================
// ui-importar-aditivo.js — DOM da aba "Importação" (grupo Dados):
// lê o arquivo, mostra o relatório de resolução de referência
// (Fase 1/2) e aciona a aplicação (Fase 3/4). A lógica de
// classificação/remapeamento em si mora em importar-aditivo.js
// (módulo puro, sem DOM) — mesmo espírito da divisão já usada em
// importar-sonoridade.js/forms.js.
// ============================================================

import { db, save } from './db.js';
import { tirarSnapshotSeNecessario } from './autobackup.js';
import { escapeHtml, mostrarAviso } from './utils.js';
import {
    normalizarItensPayload,
    classificarImportacaoAditiva,
    relatorioProntoParaAplicar,
    aplicarImportacaoAditiva,
} from './importar-aditivo.js';

const ROTULO_CAMPO_REF = {
    pessoas: 'Pessoa',
    grupos: 'Grupo',
    autores: 'Autor',
    'epocaRetratada.epocaId': 'Época',
    livroId: 'Livro',
    duplicataTitulo: 'Título já existe no acervo',
};

// Estado da importação em andamento — um arquivo processado por vez
// (mesmo espírito de outras ferramentas de importação da aba).
let _payloadAtual = null;
let _relatorioAtual = null;

function labelReferencia(r) {
    if (r.campo === 'duplicataTitulo') {
        return `Título igual a um item já existente: "${r.valorOrigem.nome}"`;
    }
    const rotulo = ROTULO_CAMPO_REF[r.campo] || r.campo;
    return `${rotulo}: "${r.valorOrigem.nome}"`;
}

function resumoDecisao(r) {
    if (r.decisao === 'criar') {
        return r.campo === 'duplicataTitulo'
            ? '→ importa como item novo, mesmo com título igual'
            : `→ cria novo ${(ROTULO_CAMPO_REF[r.campo] || '').toLowerCase()}`;
    }
    if (r.decisao === 'casar') {
        if (r.campo === 'duplicataTitulo') return '→ tratado como duplicata, não importado';
        const nome = r.candidatos.find((c) => String(c.id) === String(r.entidadeDestinoId))?.nome;
        return `→ associa a "${nome || r.entidadeDestinoId}" já existente`;
    }
    return '→ decisão pendente';
}

function selectReferencia(itemIdx, refIdx, r) {
    const rotuloCriar =
        r.campo === 'duplicataTitulo'
            ? 'Importar como item novo, mesmo com título igual'
            : `Criar novo${r.valorOrigem.nome ? ` "${escapeHtml(r.valorOrigem.nome)}"` : ''}`;

    const optCriar = `<option value="__criar__" ${r.decisao === 'criar' ? 'selected' : ''}>➕ ${rotuloCriar}</option>`;

    const rotuloCasarPrefixo = r.campo === 'duplicataTitulo' ? 'Já existe — não importar' : '🔗';

    const optsCand = r.candidatos
        .map((c, i) => {
            const selecionado =
                r.decisao === 'casar' && String(r.entidadeDestinoId) === String(c.id);
            const rotulo =
                r.campo === 'duplicataTitulo'
                    ? rotuloCasarPrefixo
                    : `🔗 ${escapeHtml(c.nome)} (${c.match})`;
            return `<option value="${i}" ${selecionado ? 'selected' : ''}>${rotulo}</option>`;
        })
        .join('');

    return `<select
        class="text-xs border border-gray-300 dark:border-slate-600 dark:bg-slate-800 rounded px-1 py-0.5"
        onchange="definirDecisaoReferenciaAditiva(${itemIdx}, ${refIdx}, this.value)"
    >
        <option value="" ${r.decisao === null ? 'selected' : ''} disabled>— escolha —</option>
        ${optCriar}
        ${optsCand}
    </select>`;
}

function rotuloExtras(rel) {
    const partes = [];
    if (rel.extras?.sonoridade) partes.push('+ Sonoridade');
    if (rel.extras?.estruturaTextual) partes.push('+ Estrutura Textual');
    if (!partes.length) return '';
    return ` <span class="text-emerald-600 dark:text-emerald-400">(${partes.join(', ')})</span>`;
}

function renderItemImportacao(rel, idx) {
    const rotuloTipo = rel.tipo === 'prosas' ? 'Prosa' : 'Poema';

    if (rel.status === 'erro') {
        return `<div class="border border-red-200 dark:border-red-900 rounded-md p-2 mb-1.5 text-xs">
            <span class="font-medium">${escapeHtml(rel.titulo)}</span>
            <span class="text-gray-400 dark:text-slate-500"> (${rotuloTipo})</span>
            <p class="text-red-600 dark:text-red-400 mt-0.5">${escapeHtml(rel.erro)}</p>
        </div>`;
    }

    if (rel.status === 'pronto') {
        return `<details class="border border-gray-200 dark:border-slate-700 rounded-md p-2 mb-1.5 text-xs">
            <summary class="cursor-pointer font-medium">
                ${escapeHtml(rel.titulo)}
                <span class="text-gray-400 dark:text-slate-500">(${rotuloTipo})</span>${rotuloExtras(rel)}
            </summary>
            ${
                rel.referencias.length
                    ? `<ul class="mt-1 ml-3 list-disc text-gray-500 dark:text-slate-400">${rel.referencias
                          .map(
                              (r) =>
                                  `<li>${escapeHtml(labelReferencia(r))} ${escapeHtml(resumoDecisao(r))}</li>`,
                          )
                          .join('')}</ul>`
                    : '<p class="mt-1 text-gray-400 dark:text-slate-500">Sem referências a resolver — importa direto.</p>'
            }
        </details>`;
    }

    // ambíguo — uma linha por referência pendente (ou já decidida
    // manualmente), cada uma com seu próprio seletor.
    return `<div class="border border-amber-300 dark:border-amber-700 rounded-md p-2 mb-1.5 text-xs">
        <div class="font-medium mb-1">
            ${escapeHtml(rel.titulo)}
            <span class="text-gray-400 dark:text-slate-500">(${rotuloTipo})</span>${rotuloExtras(rel)}
        </div>
        ${rel.referencias
            .map(
                (r, refIdx) => `
            <div class="flex items-center gap-2 py-0.5 flex-wrap">
                <span class="${r.decisao === null ? 'text-amber-700 dark:text-amber-400' : 'text-gray-500 dark:text-slate-400'}">
                    ${escapeHtml(labelReferencia(r))}
                </span>
                ${selectReferencia(idx, refIdx, r)}
            </div>`,
            )
            .join('')}
    </div>`;
}

function renderPreviewImportacaoAditiva() {
    const container = document.getElementById('importacao-aditiva-preview');
    const acoes = document.getElementById('importacao-aditiva-acoes');
    if (!container) return;

    if (!_relatorioAtual) {
        container.innerHTML = `<p class="text-xs text-gray-400 dark:text-slate-500">
            Escolha um arquivo .json exportado (um item ou um recorte com vários) pra ver o
            que vai ser somado ao acervo.
        </p>`;
        if (acoes) acoes.classList.add('hidden');
        return;
    }

    const { itensOrigem, resumo } = _relatorioAtual;
    const pronto = relatorioProntoParaAplicar(_relatorioAtual);

    const resumoHtml = `<p class="text-sm font-medium mb-3">
        ${resumo.total} item(ns) no arquivo — ${resumo.prontos} pronto(s), ${resumo.ambiguos}
        com decisão pendente, ${resumo.comErro} com erro (ficam de fora).
    </p>`;

    const grupos = [
        { status: 'erro', rotulo: '⚠️ Com erro' },
        { status: 'ambiguo', rotulo: '❓ Decisão pendente' },
        { status: 'pronto', rotulo: '✅ Prontos' },
    ];

    const listaHtml = grupos
        .map((g) => {
            const doGrupo = itensOrigem
                .map((rel, idx) => ({ rel, idx }))
                .filter(({ rel }) => rel.status === g.status);
            if (!doGrupo.length) return '';
            return `<div class="mb-3">
                <div class="text-xs font-bold uppercase text-gray-400 dark:text-slate-500 mb-1">
                    ${g.rotulo} (${doGrupo.length})
                </div>
                ${doGrupo.map(({ rel, idx }) => renderItemImportacao(rel, idx)).join('')}
            </div>`;
        })
        .join('');

    container.innerHTML = resumoHtml + listaHtml;

    if (acoes) acoes.classList.remove('hidden');
    const botaoAplicar = document.getElementById('btn-aplicar-importacao-aditiva');
    if (botaoAplicar) botaoAplicar.disabled = !pronto;
}

// Botão "Importar" da aba — lê o .json escolhido e monta o relatório
// de resolução de referência (Fase 1, só leitura).
export function processarArquivoImportacaoAditiva(event) {
    const arquivo = event.target?.files?.[0];
    if (!arquivo) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        let payload;
        try {
            payload = JSON.parse(e.target.result);
        } catch {
            mostrarAviso('Erro ao ler o arquivo — confira se é um .json válido.');
            event.target.value = '';
            return;
        }

        if (!normalizarItensPayload(payload).length) {
            mostrarAviso(
                'Nenhum Poema/Prosa encontrado nesse arquivo — confira se é um export com "itens" (Exportação Geral, seleção da tabela ou Exportações Frequentes).',
            );
            event.target.value = '';
            return;
        }

        carregarPayloadImportacaoAditiva(payload);
    };
    reader.readAsText(arquivo);
}

// Ponto de entrada comum: `payload` já parseado (arquivo escolhido na
// aba Importação OU pacote da Biblioteca) vira o relatório de Fase 1 e
// o preview. Devolve false se não houver nenhum Poema/Prosa dentro.
// Clona antes de guardar — o estado da importação nunca compartilha
// referência com quem chamou (ex.: o pacote em cache da Biblioteca).
export function carregarPayloadImportacaoAditiva(payload) {
    if (!normalizarItensPayload(payload).length) return false;
    _payloadAtual = structuredClone(payload);
    _relatorioAtual = classificarImportacaoAditiva(_payloadAtual, db);
    renderPreviewImportacaoAditiva();
    return true;
}

// onchange de cada <select> de referência ambígua (Fase 2) — muda a
// decisão in-place no relatório em memória e re-renderiza (também
// reflete no botão "Aplicar", que só habilita sem pendência nenhuma).
export function definirDecisaoReferenciaAditiva(itemIdx, refIdx, valor) {
    const rel = _relatorioAtual?.itensOrigem[itemIdx];
    const ref = rel?.referencias[refIdx];
    if (!ref) return;

    if (valor === '__criar__') {
        ref.decisao = 'criar';
        ref.entidadeDestinoId = null;
    } else {
        const candidato = ref.candidatos[parseInt(valor, 10)];
        if (!candidato) return;
        ref.decisao = 'casar';
        ref.entidadeDestinoId = candidato.id;
    }
    renderPreviewImportacaoAditiva();
}

// Botão "Aplicar" — Fase 3 (snapshot forçado) + Fase 4 (remapeamento e
// escrita atômica), via aplicarImportacaoAditiva (importar-aditivo.js).
export async function aplicarImportacaoAditivaClick() {
    if (!_relatorioAtual || !_payloadAtual) return;

    const botao = document.getElementById('btn-aplicar-importacao-aditiva');
    if (botao) botao.disabled = true;

    const resultado = await aplicarImportacaoAditiva(_payloadAtual, _relatorioAtual, db, {
        tirarSnapshotSeNecessario,
        save,
    });

    if (!resultado.sucesso) {
        if (botao) botao.disabled = false;
        if (resultado.motivo === 'snapshot') {
            mostrarAviso(
                'Não foi possível tirar o snapshot de segurança antes de aplicar — nada foi importado. Tente de novo.',
            );
        } else {
            mostrarAviso('Ainda há referência(s) pendente(s) de decisão.');
        }
        return;
    }

    const partes = [];
    if (resultado.criados.poemas) partes.push(`${resultado.criados.poemas} poema(s)`);
    if (resultado.criados.prosas) partes.push(`${resultado.criados.prosas} prosa(s)`);
    if (resultado.criados.escansoes) partes.push(`${resultado.criados.escansoes} escansão(ões)`);
    if (resultado.criados.estruturasTextuais)
        partes.push(`${resultado.criados.estruturasTextuais} estrutura(s) textual(is)`);
    let mensagem = partes.length ? `Importado: ${partes.join(' + ')}.` : 'Nada novo foi importado.';
    if (resultado.duplicatasPuladas) {
        mensagem += ` ${resultado.duplicatasPuladas} tratada(s) como duplicata e não importada(s).`;
    }
    mostrarAviso(mensagem, 'sucesso');

    cancelarImportacaoAditiva();
}

// Botão "Cancelar"/reset após aplicar — limpa o estado e o input de
// arquivo, sem mexer em nada que já tenha sido escrito no db.
export function cancelarImportacaoAditiva() {
    _payloadAtual = null;
    _relatorioAtual = null;
    const input = document.getElementById('importacao-aditiva-arquivo');
    if (input) input.value = '';
    renderPreviewImportacaoAditiva();
}
