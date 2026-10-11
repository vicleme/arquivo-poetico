// ============================================================
// visualizar-movimento-escola.js — Modal de Visualização
// somente-leitura do Movimento/Escola (botão "Ver" do card, ver
// renderMovimentosEscolas em render-listas.js).
//
// O card da lista mostra só a contagem ("N autores, M textos") —
// pedido do Victor foi listar QUEM são esses autores/textos sem
// precisar abrir item por item. Mesmo padrão de visualizar-autor.js:
// parte pura (renderVisualizacaoMovimentoEscolaHtml) separada da
// parte que escreve no DOM (abrirVisualizacaoMovimentoEscola).
// ============================================================

import { garantirModal, toggleModal } from './modais.js';
import { db } from './db.js';
import { editarMovimentoEscola } from './forms.js';
import { escapeHtml, formatarIntervaloMovimentoEscola } from './utils.js';
import {
    caminhoDaCorrente,
    filhosDaCorrente,
    impactoDaCorrente,
    paiDaCorrente,
    posturaEfetivaDaCorrente,
    programaEfetivoDaCorrente,
} from './correntes-hierarquia.js';

// id do Movimento/Escola atualmente aberto — mesmo padrão de
// autorAtualId em visualizar-autor.js.
let movimentoEscolaAtualId = null;

function linhaMetaHtml(rotulo, valor) {
    if (!valor) return '';
    return `<p class="mb-1.5"><strong class="text-gray-600 dark:text-slate-300">${escapeHtml(rotulo)}:</strong> ${escapeHtml(valor)}</p>`;
}

function secaoHtml(titulo, corpo) {
    if (!corpo) return '';
    return `<section class="mt-5"><h4 class="text-[11px] font-bold uppercase text-gray-500 dark:text-slate-400 mb-2 pb-1 border-b border-gray-100 dark:border-slate-700">${escapeHtml(titulo)}</h4>${corpo}</section>`;
}

// Lista simples de nomes (autores/poemas/prosas vinculados) — sem
// link clicável por ora, mesmo espírito de "só mostrar" de
// visualizar-autor.js (contagem de textos, sem listar).
function listaNomesHtml(nomes) {
    if (!nomes.length) return '';
    return `<ul class="text-sm text-gray-700 dark:text-slate-200 space-y-1">${nomes
        .map((n) => `<li>${escapeHtml(n)}</li>`)
        .join('')}</ul>`;
}

// Bloco "Rótulo: [chip] [chip]" — vazio se não houver itens. Mesma
// forma de linhaChipsHtml em visualizar-autor.js.
function linhaChipsHtml(rotulo, itens, cor) {
    if (!itens || !itens.length) return '';
    return `<div class="mb-1.5"><strong class="text-gray-600 dark:text-slate-300 mr-1">${escapeHtml(rotulo)}:</strong>${itens
        .map(
            (i) =>
                `<span class="${cor} text-white text-[11px] px-2 py-0.5 rounded-full inline-block mr-1 mb-1">${escapeHtml(i)}</span>`,
        )
        .join('')}</div>`;
}

// "Escola" ou, quando vem do pai, "Escola (herdado de Romantismo)".
function textoComHerdeiro(efetivo, proprio) {
    if (!efetivo) return proprio || '';
    if (!efetivo.valor) return '';
    return efetivo.herdadoDe ? `${efetivo.valor} (herdado de ${efetivo.herdadoDe})` : efetivo.valor;
}

// Parte pura: recebe o Movimento/Escola e os itens vinculados
// (já resolvidos pra nome), devolve HTML.
export function renderVisualizacaoMovimentoEscolaHtml(
    movimento,
    { autores = [], poemas = [], prosas = [], pai = '', divisoes = [], programa, postura } = {},
) {
    const m = movimento || {};
    let html = '';

    const intervalo = formatarIntervaloMovimentoEscola(m);
    html += linhaMetaHtml('Período', intervalo !== '—' ? intervalo : '');
    html += linhaMetaHtml('Tipo', m.tipo);
    html += linhaMetaHtml('Faz parte de', pai);
    html += linhaMetaHtml('Divisão', m.divisao);
    html += linhaMetaHtml('Aplica-se a', m.generoDivisao);
    html += linhaMetaHtml('Programa', textoComHerdeiro(programa, m.programa));
    html += linhaMetaHtml('Postura estética', textoComHerdeiro(postura, m.posturaEstetica));
    html += linhaMetaHtml('Região de origem', m.regiaoOrigem);

    if (m.notas) {
        html += secaoHtml(
            'Notas',
            `<p class="text-sm text-gray-700 dark:text-slate-200" style="white-space: pre-wrap">${escapeHtml(m.notas)}</p>`,
        );
    }

    // Os 6 campos de lista do modal de edição (grid abaixo da Data em
    // modal-movimento-escola.html) — faltavam aqui até esta sessão (só
    // Notas/Tipo/Região/Data tinham entrado, sem querer).
    html += secaoHtml(
        'Caracterização',
        linhaChipsHtml('Valores', m.valores, 'bg-indigo-600') +
            linhaChipsHtml('Temas', m.temas, 'bg-purple-600') +
            linhaChipsHtml('Técnicas', m.tecnicas, 'bg-blue-600') +
            linhaChipsHtml('Tipos de composição', m.tiposComposicao, 'bg-teal-600') +
            linhaChipsHtml('Lemas', m.lemas, 'bg-amber-600') +
            linhaChipsHtml('Manifestos', m.manifestos, 'bg-rose-600'),
    );

    html += secaoHtml(
        `Divisões (${divisoes.length})`,
        listaNomesHtml(
            divisoes.map((d) =>
                [d.nome, [d.divisao, d.generoDivisao].filter(Boolean).join(', ')]
                    .filter(Boolean)
                    .join(' · '),
            ),
        ),
    );
    // Com divisões, as três listas somam o que está ligado a elas (cada item
    // uma vez); o rótulo avisa, para o total bater com o card da lista.
    const sufixo = divisoes.length ? ', com as divisões' : '';
    html += secaoHtml(`Autores (${autores.length}${sufixo})`, listaNomesHtml(autores));
    html += secaoHtml(`Poemas (${poemas.length}${sufixo})`, listaNomesHtml(poemas));
    html += secaoHtml(`Prosas (${prosas.length}${sufixo})`, listaNomesHtml(prosas));

    if (!autores.length && !poemas.length && !prosas.length) {
        html +=
            '<p class="text-sm text-gray-400 dark:text-slate-500 mt-4">Ainda não está vinculado a nenhum autor ou texto.</p>';
    }

    return html;
}

export async function abrirVisualizacaoMovimentoEscola(id) {
    const movimento = db.movimentosEscolas.find((x) => x.id == id);
    if (!movimento) return;
    movimentoEscolaAtualId = movimento.id;

    await garantirModal('modal-visualizar-movimento-escola');

    const { autoresIds, poemasIds, prosasIds } = impactoDaCorrente(db, movimento.id, {
        comDivisoes: true,
    });
    const autores = autoresIds
        .map((idAutor) => db.autores.find((a) => a.id == idAutor)?.nome)
        .filter(Boolean);
    const poemas = poemasIds
        .map((idPoema) => db.poemas.find((p) => p.id == idPoema)?.titulo)
        .filter(Boolean);
    const prosas = prosasIds
        .map((idProsa) => db.prosas.find((p) => p.id == idProsa)?.titulo)
        .filter(Boolean);

    const titulo = document.getElementById('modal-visualizar-movimento-escola-titulo');
    if (titulo) titulo.innerText = movimento.nome;

    const conteudo = document.getElementById('visualizar-movimento-escola-conteudo');
    if (conteudo) {
        const lista = db.movimentosEscolas;
        conteudo.innerHTML = renderVisualizacaoMovimentoEscolaHtml(movimento, {
            autores,
            poemas,
            prosas,
            pai: paiDaCorrente(lista, movimento.id)
                ? caminhoDaCorrente(lista, paiDaCorrente(lista, movimento.id).id)
                : '',
            divisoes: filhosDaCorrente(lista, movimento.id)
                .slice()
                .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
            programa: programaEfetivoDaCorrente(lista, movimento),
            postura: posturaEfetivaDaCorrente(lista, movimento),
        });
    }

    await toggleModal('modal-visualizar-movimento-escola');
}

// Botão "Editar" do próprio modal: fecha a visualização e abre o
// formulário de edição do mesmo Movimento/Escola.
export async function editarMovimentoEscolaDoVisualizador() {
    if (movimentoEscolaAtualId == null) return;
    const id = movimentoEscolaAtualId;
    await toggleModal('modal-visualizar-movimento-escola');
    await editarMovimentoEscola(id);
}
