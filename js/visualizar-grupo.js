// ============================================================
// visualizar-grupo.js — Modal de Visualização somente-leitura do
// Grupo (botão "Ver" do card, ver cartaoGrupo em render-listas.js).
//
// O card já mostra uma prévia truncada das pessoas (ver
// LIMITE_PESSOAS_NO_CARD_GRUPO em render-listas.js) — pra não virar
// uma lista longa naquela visão superficial. Aqui mora a lista
// completa, sem corte, mais os subgrupos diretos (o card só dá a
// contagem deles). Mesmo padrão de visualizar-autor.js: parte pura
// (renderVisualizacaoGrupoHtml) separada da parte que escreve no DOM
// (abrirVisualizacaoGrupo).
// ============================================================

import { garantirModal, toggleModal } from './modais.js';
import { db, calcularImpactoExclusaoGrupo } from './db.js';
import { editarGrupo } from './forms.js';
import { escapeHtml } from './utils.js';

// id do Grupo atualmente aberto — mesmo padrão de autorAtualId em
// visualizar-autor.js.
let grupoAtualId = null;

function linhaMetaHtml(rotulo, valor) {
    if (!valor) return '';
    return `<p class="mb-1.5"><strong class="text-gray-600 dark:text-slate-300">${escapeHtml(rotulo)}:</strong> ${escapeHtml(valor)}</p>`;
}

function secaoHtml(titulo, corpo) {
    if (!corpo) return '';
    return `<section class="mt-5"><h4 class="text-[11px] font-bold uppercase text-gray-500 dark:text-slate-400 mb-2 pb-1 border-b border-gray-100 dark:border-slate-700">${escapeHtml(titulo)}</h4>${corpo}</section>`;
}

function listaNomesHtml(nomes) {
    if (!nomes.length) return '';
    return `<ul class="text-sm text-gray-700 dark:text-slate-200 space-y-1">${nomes
        .map((n) => `<li>${escapeHtml(n)}</li>`)
        .join('')}</ul>`;
}

// Parte pura: recebe o Grupo e os nomes já resolvidos (autor, grupo
// pai, pessoas e subgrupos diretos), devolve HTML.
export function renderVisualizacaoGrupoHtml(
    grupo,
    { nomeAutor = '', nomeGrupoPai = '', pessoas = [], subgrupos = [] } = {},
) {
    const g = grupo || {};
    let html = '';

    html += linhaMetaHtml('Autor', nomeAutor);
    html += linhaMetaHtml('Grupo pai', nomeGrupoPai);

    html += secaoHtml(`Pessoas (${pessoas.length})`, listaNomesHtml(pessoas));
    html += secaoHtml(`Subgrupos (${subgrupos.length})`, listaNomesHtml(subgrupos));

    if (!pessoas.length && !subgrupos.length) {
        html +=
            '<p class="text-sm text-gray-400 dark:text-slate-500 mt-4">Nenhuma pessoa ou subgrupo neste grupo ainda.</p>';
    }

    return html;
}

export async function abrirVisualizacaoGrupo(id) {
    const grupo = db.grupos.find((x) => x.id == id);
    if (!grupo) return;
    grupoAtualId = grupo.id;

    await garantirModal('modal-visualizar-grupo');

    const { pessoasIds, subgruposIds } = calcularImpactoExclusaoGrupo(db, grupo.id);
    const pessoas = pessoasIds
        .map((idPessoa) => db.pessoas.find((p) => p.id == idPessoa)?.nome)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const subgrupos = subgruposIds
        .map((idSub) => db.grupos.find((sg) => sg.id == idSub)?.nome)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const nomeAutor = db.autores.find((a) => a.id == grupo.autorId)?.nome || '';
    const nomeGrupoPai = grupo.paiId
        ? db.grupos.find((sg) => sg.id == grupo.paiId)?.nome || ''
        : '';

    const titulo = document.getElementById('modal-visualizar-grupo-titulo');
    if (titulo) titulo.innerText = grupo.nome;

    const conteudo = document.getElementById('visualizar-grupo-conteudo');
    if (conteudo) {
        conteudo.innerHTML = renderVisualizacaoGrupoHtml(grupo, {
            nomeAutor,
            nomeGrupoPai,
            pessoas,
            subgrupos,
        });
    }

    await toggleModal('modal-visualizar-grupo');
}

// Botão "Editar" do próprio modal: fecha a visualização e abre o
// formulário de edição do mesmo Grupo.
export async function editarGrupoDoVisualizador() {
    if (grupoAtualId == null) return;
    const id = grupoAtualId;
    await toggleModal('modal-visualizar-grupo');
    await editarGrupo(id);
}
