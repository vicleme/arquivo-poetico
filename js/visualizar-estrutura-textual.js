// ============================================================
// visualizar-estrutura-textual.js — Modal de Visualização somente-
// leitura da Progressão Morfofuncional (botão "Ver" da tabela de
// Morfofuncionalidade, ver render-listas.js).
//
// Espelha o papel de visualizar-sonoridade.js: um modal à parte do de
// edição, sem os controles de posição (marcar estrofe/verso, aplicar
// Template) — só os itens já classificados, com título + posição
// resumida, igual ao que os cartões do modal de edição já mostram e ao
// que a exportação em .md/.pdf/.docx lista (mesmo rotuloItem/
// resumoPosicao dos dois lugares, pra nunca divergir do que a pessoa
// vê ali — ver exportar-estrutura-textual.js e estrutura-textual.js).
// ============================================================

import { garantirModal, toggleModal } from './modais.js';
import { db } from './db.js';
import { ordenarPorPosicao, resumoPosicao } from './estrutura-textual.js';
import { rotuloItem, exportarEstruturaTextual } from './exportar-estrutura-textual.js';
import { escapeHtml } from './utils.js';

// id da Progressão Morfofuncional atualmente aberta — os botões de
// Baixar do próprio modal usam esse estado (mesmo padrão de
// escansaoAtualId em visualizar-sonoridade.js).
let estruturaAtualId = null;

function listaItensHtml(itens, tipo) {
    if (!itens || itens.length === 0) {
        return `<p class="text-xs text-gray-400 dark:text-slate-500 italic">Nenhum${tipo === 'unidade' ? 'a' : ''} ${tipo === 'unidade' ? 'Unidade' : 'Evento'} cadastrad${tipo === 'unidade' ? 'a' : 'o'}.</p>`;
    }
    return `<ul class="space-y-1.5">${ordenarPorPosicao(itens)
        .map(
            (item) => `
        <li class="text-sm">
            <strong class="text-gray-700 dark:text-slate-200">${escapeHtml(rotuloItem(tipo, item))}</strong>
            <span class="text-[11px] text-gray-500 dark:text-slate-400"> — ${escapeHtml(resumoPosicao(item.posicao))}</span>
        </li>`,
        )
        .join('')}</ul>`;
}

// Parte pura (só monta e devolve a string de HTML, sem tocar em
// `document`) — mesmo padrão de renderVisualizacaoHtml em visualizar.js
// e de renderVisualizacaoSonoridadeHtml em visualizar-sonoridade.js,
// extraído já na criação deste módulo pra ser testável sem DOM de
// verdade (ver tests/visualizar-estrutura-textual.test.js).
export function renderVisualizacaoEstruturaTextualHtml(estrutura) {
    let html = '';
    html += `
        <h4 class="text-xs font-bold uppercase text-gray-400 dark:text-slate-500 mb-2">Unidades</h4>
        ${listaItensHtml(estrutura.unidades, 'unidade')}`;
    html += `
        <h4 class="text-xs font-bold uppercase text-gray-400 dark:text-slate-500 mt-4 mb-2">Eventos</h4>
        ${listaItensHtml(estrutura.eventos, 'evento')}`;
    return html;
}

function renderConteudoEstruturaTextual(estrutura) {
    const conteudo = document.getElementById('visualizar-estrutura-textual-conteudo');
    if (!conteudo) return;
    conteudo.innerHTML = renderVisualizacaoEstruturaTextualHtml(estrutura);
}

export async function abrirVisualizacaoEstruturaTextual(id) {
    const estrutura = db.estruturasTextuais.find((x) => x.id == id);
    if (!estrutura) return;
    const poema = db.poemas.find((p) => p.id == estrutura.poemaId);
    estruturaAtualId = id;

    await garantirModal('modal-visualizar-estrutura-textual');

    const titulo = document.getElementById('modal-visualizar-estrutura-textual-titulo');
    if (titulo) titulo.innerText = poema?.titulo || `Progressão #${estrutura.id}`;

    renderConteudoEstruturaTextual(estrutura);

    toggleModal('modal-visualizar-estrutura-textual');
}

// Chamado pelos botões "Baixar em .md/.pdf/.docx/.json" dentro do
// próprio modal — mesmos 4 formatos sempre visíveis ali, independente
// do formato configurado na coluna Ações (ver painel "⚙️ Ações ▾"),
// mesmo espírito de baixarDoModalVisualizacaoSonoridade.
export function baixarDoModalVisualizacaoEstruturaTextual(formato) {
    if (estruturaAtualId == null) return;
    exportarEstruturaTextual(estruturaAtualId, formato);
}
