// ============================================================
// visualizar-periodo-historico.js — Modal de Visualização
// somente-leitura do Período Histórico (botão "Ver" do card, ver
// renderPeriodosHistoricos em render-listas.js).
//
// Mostra o que o card não cabe: onde o período está na hierarquia
// (caminho e outros pais), os períodos de dentro e quais textos estão
// ligados a ele. Mesmo padrão de visualizar-movimento-escola.js: parte
// pura (renderVisualizacaoPeriodoHistoricoHtml) separada da parte que
// escreve no DOM (abrirVisualizacaoPeriodoHistorico).
// ============================================================

import { garantirModal, toggleModal } from './modais.js';
import { db, textosDoPeriodoHistorico } from './db.js';
import { editarPeriodoHistorico } from './forms.js';
import { textoDaRegiao } from './regiao.js';
import { listaFontesHtml, normalizarFontes } from './fontes-corrente.js';
import { escapeHtml, formatarIntervaloPeriodoHistorico, comDuracao } from './utils.js';
import { opcoesDuracao } from './fuso-horario.js';
import {
    caminhoDoPeriodo,
    filhosDoPeriodo,
    paisDoPeriodo,
} from './periodos-historicos-hierarquia.js';
import { listaTextosPeriodoHtml, tituloSecaoTextos } from './lista-textos-periodo.js';
import { abrirVisualizacao } from './visualizar.js';
import { verTextosPeriodoHistorico } from './render-listas.js';

let periodoHistoricoAtualId = null;

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

// Parte pura: recebe o período e o que já foi resolvido (nomes), devolve HTML.
// `caminhos` são os caminhos dos pais (o primeiro é o principal); `dentro` os
// períodos de dentro, como `{ nome, intervalo }`.
export function renderVisualizacaoPeriodoHistoricoHtml(
    periodo,
    { caminhos = [], dentro = [], poemas = [], prosas = [], totalDireto = 0 } = {},
) {
    const ph = periodo || {};
    let html = '';

    const intervalo = comDuracao(
        formatarIntervaloPeriodoHistorico(ph),
        ph.inicio,
        ph.fim,
        opcoesDuracao(ph),
    );
    html += linhaMetaHtml('Período', intervalo !== '—' ? intervalo : '');
    html += linhaMetaHtml('Região', textoDaRegiao(ph.regiao));
    html += linhaMetaHtml('Esfera', (ph.esferas || []).join(', '));
    html += linhaMetaHtml('Categoria', (ph.categorias || []).join(', '));
    html += linhaMetaHtml('Faz parte de', caminhos[0] || '');
    if (caminhos.length > 1) html += linhaMetaHtml('Também em', caminhos.slice(1).join('; '));

    if (ph.notas) {
        html += secaoHtml(
            'Notas',
            `<p class="text-sm text-gray-700 dark:text-slate-200" style="white-space: pre-wrap">${escapeHtml(ph.notas)}</p>`,
        );
    }

    html += secaoHtml(`Fontes (${normalizarFontes(ph.fontes).length})`, listaFontesHtml(ph.fontes));

    html += secaoHtml(
        `Períodos de dentro (${dentro.length})`,
        listaNomesHtml(dentro.map((d) => [d.nome, d.intervalo].filter(Boolean).join(' · '))),
    );
    // Com períodos de dentro, as listas somam os textos deles (cada texto uma
    // vez); o rótulo avisa, para o total bater com o card da lista.
    const sufixo = dentro.length ? ', com os de dentro' : '';
    const acaoVerTodos = `verTodosTextosDoPeriodoHistorico(${Number(ph.id)})`;
    html += secaoHtml(
        tituloSecaoTextos('Poemas', poemas.length, sufixo),
        listaTextosPeriodoHtml(poemas, {
            tipo: 'poema',
            funcaoAbrir: 'abrirTextoDoPeriodoHistoricoVer',
            acaoVerTodos,
        }),
    );
    html += secaoHtml(
        tituloSecaoTextos('Prosas', prosas.length, sufixo),
        listaTextosPeriodoHtml(prosas, {
            tipo: 'prosa',
            funcaoAbrir: 'abrirTextoDoPeriodoHistoricoVer',
            acaoVerTodos,
        }),
    );

    if (!poemas.length && !prosas.length) {
        html +=
            '<p class="text-sm text-gray-400 dark:text-slate-500 mt-4">Ainda não está ligado a nenhum texto.</p>';
    } else if (dentro.length) {
        html += `<p class="text-[11px] text-gray-400 dark:text-slate-500 mt-3">${totalDireto} ligado${totalDireto !== 1 ? 's' : ''} direto a este período; o resto vem dos de dentro.</p>`;
    }

    return html;
}

export async function abrirVisualizacaoPeriodoHistorico(id) {
    const ph = db.periodosHistoricos.find((x) => x.id == id);
    if (!ph) return;
    periodoHistoricoAtualId = ph.id;

    await garantirModal('modal-visualizar-periodo-historico');

    const lista = db.periodosHistoricos;
    const { poemasIds, prosasIds } = textosDoPeriodoHistorico(db, ph.id, { comDentro: true });
    const direto = textosDoPeriodoHistorico(db, ph.id);
    const resolver = (lista, ids) =>
        ids
            .map((i) => lista.find((t) => t.id == i))
            .filter(Boolean)
            .map((t) => ({ id: t.id, titulo: t.titulo, dataEscrita: t.dataEscrita }));
    const poemas = resolver(db.poemas, poemasIds);
    const prosas = resolver(db.prosas, prosasIds);

    const titulo = document.getElementById('modal-visualizar-periodo-historico-titulo');
    if (titulo) titulo.innerText = ph.nome;

    const conteudo = document.getElementById('visualizar-periodo-historico-conteudo');
    if (conteudo) {
        conteudo.innerHTML = renderVisualizacaoPeriodoHistoricoHtml(ph, {
            caminhos: paisDoPeriodo(lista, ph.id).map((pid) => caminhoDoPeriodo(lista, pid)),
            dentro: filhosDoPeriodo(lista, ph.id)
                .map((fid) => lista.find((x) => x.id == fid))
                .filter(Boolean)
                .map((f) => ({
                    nome: f.nome,
                    intervalo:
                        formatarIntervaloPeriodoHistorico(f) !== '—'
                            ? formatarIntervaloPeriodoHistorico(f)
                            : '',
                }))
                .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
            poemas,
            prosas,
            totalDireto: direto.poemasIds.length + direto.prosasIds.length,
        });
    }

    await toggleModal('modal-visualizar-periodo-historico');
}

export async function editarPeriodoHistoricoDoVisualizador() {
    if (periodoHistoricoAtualId == null) return;
    const id = periodoHistoricoAtualId;
    await toggleModal('modal-visualizar-periodo-historico');
    await editarPeriodoHistorico(id);
}

// Clique no título de um texto: fecha o Ver do período e abre o texto.
export async function abrirTextoDoPeriodoHistoricoVer(tipo, id) {
    await toggleModal('modal-visualizar-periodo-historico');
    await abrirVisualizacao(tipo, id);
}

// "Ver todos": fecha o Ver e abre a lista filtrada (mesma ação da lupa do
// cartão, com os períodos de dentro).
export async function verTodosTextosDoPeriodoHistorico(id) {
    await toggleModal('modal-visualizar-periodo-historico');
    verTextosPeriodoHistorico(id);
}
