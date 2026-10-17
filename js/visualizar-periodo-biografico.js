// ============================================================
// visualizar-periodo-biografico.js — Modal de Visualização
// somente-leitura do Período Biográfico (botão "Ver" do card, ver
// cartaoEpoca em render-listas.js).
//
// Mostra o que o card não cabe: autor, esferas, categorias, pessoas e
// relações por extenso, notas e quais textos estão ligados ao período.
// Mesmo padrão de visualizar-periodo-historico.js: parte pura
// (renderVisualizacaoPeriodoBiograficoHtml) separada da parte que
// escreve no DOM (abrirVisualizacaoPeriodoBiografico).
//
// Privacidade: pessoa oculta nunca aparece aqui. A relação que envolve
// uma pessoa oculta some inteira, como no card (ver
// periodo-biografico-campos.js). O texto antigo "Contexto do
// relacionamento" só aparece quando nenhuma pessoa está ligada ao
// período, mesma regra do card, porque ele pode citar a pessoa oculta
// pelo nome.
// ============================================================

import { garantirModal, toggleModal } from './modais.js';
import { db, calcularImpactoExclusaoEpoca } from './db.js';
import { editarEpoca } from './forms.js';
import { escapeHtml, formatarIntervaloPeriodoHistorico, comDuracao } from './utils.js';
import { opcoesDuracao } from './fuso-horario.js';
import { linhasDoPeriodoBiografico, periodosVisiveis } from './periodo-biografico-campos.js';
import { opcoesOcultasDosPeriodos } from './ocultas-periodos.js';
import {
    caminhoDoPeriodo,
    caminhoDosAncestraisDoPeriodo,
    datasEfetivasDoPeriodo,
    filhosDoPeriodo,
    paisDoPeriodo,
} from './periodos-biograficos-hierarquia.js';
import { listaTextosPeriodoHtml, tituloSecaoTextos } from './lista-textos-periodo.js';
import { abrirVisualizacao } from './visualizar.js';
import { verTextosEpoca } from './render-listas.js';

let periodoBiograficoAtualId = null;
// "Mostrar ocultas": só enquanto este modal está aberto, nunca guardado, e
// volta a esconder toda vez que a Visualização abre (mesma regra do modal de
// edição do período).
let mostrarOcultas = false;

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

// Parte pura: recebe o período, o banco (para resolver autor, pessoas e
// relações) e os textos já resolvidos (`{ id, titulo, dataEscrita }`);
// devolve HTML. Cada seção mostra até 6 textos clicáveis e, passando disso,
// o botão "Ver todos".
export function renderVisualizacaoPeriodoBiograficoHtml(
    periodo,
    dbRef,
    { poemas = [], prosas = [], mostrarOcultas: incluirOcultas = false } = {},
) {
    const ep = periodo || {};
    let html = '';

    const autor = (dbRef.autores || []).find((a) => a.id == ep.autorId);
    html += linhaMetaHtml('Autor', autor?.nome || '');
    // A hierarquia é lida só entre os períodos visíveis: pai ou filho oculto
    // não aparece (nem o nome).
    const visiveis = periodosVisiveis(dbRef.epocas, opcoesOcultasDosPeriodos());
    const datas = datasEfetivasDoPeriodo(visiveis, ep);
    const intervalo = comDuracao(
        formatarIntervaloPeriodoHistorico(datas),
        datas.inicio,
        datas.fim,
        opcoesDuracao(ep),
    );
    html += linhaMetaHtml(
        'Período',
        intervalo === '—'
            ? ''
            : datas.derivado
              ? // Com duração já entre parênteses, a origem vem depois da vírgula.
                intervalo.endsWith(')')
                  ? `${intervalo}, dos períodos de dentro`
                  : `${intervalo} (dos períodos de dentro)`
              : intervalo,
    );
    html += linhaMetaHtml('Faz parte de', caminhoDosAncestraisDoPeriodo(visiveis, ep.id));
    html += linhaMetaHtml(
        'Também faz parte de',
        paisDoPeriodo(visiveis, ep.id)
            .slice(1)
            .map((pid) => caminhoDoPeriodo(visiveis, pid))
            .filter(Boolean)
            .join('; '),
    );
    html += linhaMetaHtml('Esfera', (ep.esferas || []).join(', '));
    html += linhaMetaHtml('Categoria', (ep.categorias || []).join(', '));

    const dentro = filhosDoPeriodo(visiveis, ep.id)
        .map((fid) => visiveis.find((x) => x.id == fid))
        .filter(Boolean)
        .map((f) => {
            const t = formatarIntervaloPeriodoHistorico(f);
            return t === '—' ? f.nome : `${f.nome} (${t})`;
        });
    html += secaoHtml(
        dentro.length ? `Períodos dentro (${dentro.length})` : '',
        listaNomesHtml(dentro),
    );

    const linhas = linhasDoPeriodoBiografico(ep, dbRef, { incluirOcultas });
    html += secaoHtml('Pessoas e relações', listaNomesHtml(linhas));

    if (ep.notas) {
        html += secaoHtml(
            'Notas',
            `<p class="text-sm text-gray-700 dark:text-slate-200" style="white-space: pre-wrap">${escapeHtml(ep.notas)}</p>`,
        );
    }

    const acaoVerTodos = `verTodosTextosDoPeriodoBiografico(${Number(ep.id)})`;
    html += secaoHtml(
        tituloSecaoTextos('Poemas', poemas.length),
        listaTextosPeriodoHtml(poemas, {
            tipo: 'poema',
            funcaoAbrir: 'abrirTextoDoPeriodoBiograficoVer',
            acaoVerTodos,
        }),
    );
    html += secaoHtml(
        tituloSecaoTextos('Prosas', prosas.length),
        listaTextosPeriodoHtml(prosas, {
            tipo: 'prosa',
            funcaoAbrir: 'abrirTextoDoPeriodoBiograficoVer',
            acaoVerTodos,
        }),
    );
    if (!poemas.length && !prosas.length) {
        html +=
            '<p class="text-sm text-gray-400 dark:text-slate-500 mt-4">Ainda não está ligado a nenhum texto.</p>';
    }

    return html;
}

function desenharConteudo() {
    const ep = db.epocas.find((x) => x.id == periodoBiograficoAtualId);
    if (!ep) return;
    const { poemasIds, prosasIds } = calcularImpactoExclusaoEpoca(db, ep.id);
    const resolver = (lista, ids) =>
        ids
            .map((i) => lista.find((t) => t.id == i))
            .filter(Boolean)
            .map((t) => ({ id: t.id, titulo: t.titulo, dataEscrita: t.dataEscrita }));
    const poemas = resolver(db.poemas, poemasIds);
    const prosas = resolver(db.prosas, prosasIds);

    const conteudo = document.getElementById('visualizar-periodo-biografico-conteudo');
    if (conteudo) {
        conteudo.innerHTML = renderVisualizacaoPeriodoBiograficoHtml(ep, db, {
            poemas,
            prosas,
            mostrarOcultas,
        });
    }
    const botao = document.getElementById('visualizar-periodo-biografico-ocultas');
    if (botao) {
        // Sem nenhuma pessoa oculta no cadastro o botão não teria o que mostrar.
        botao.classList.toggle('hidden', !db.pessoas.some((p) => p.oculto));
        botao.setAttribute('aria-pressed', String(mostrarOcultas));
        botao.textContent = mostrarOcultas ? 'Esconder ocultas' : 'Mostrar ocultas';
    }
}

export function alternarOcultasPeriodoBiograficoDoVisualizador() {
    mostrarOcultas = !mostrarOcultas;
    desenharConteudo();
}

export async function abrirVisualizacaoPeriodoBiografico(id) {
    const ep = db.epocas.find((x) => x.id == id);
    if (!ep) return;
    periodoBiograficoAtualId = ep.id;
    mostrarOcultas = false;

    await garantirModal('modal-visualizar-periodo-biografico');

    const titulo = document.getElementById('modal-visualizar-periodo-biografico-titulo');
    if (titulo) titulo.innerText = ep.nome;
    desenharConteudo();

    await toggleModal('modal-visualizar-periodo-biografico');
}

export async function editarPeriodoBiograficoDoVisualizador() {
    if (periodoBiograficoAtualId == null) return;
    const id = periodoBiograficoAtualId;
    await toggleModal('modal-visualizar-periodo-biografico');
    await editarEpoca(id);
}

// Clique no título de um texto: fecha o Ver do período e abre o texto.
export async function abrirTextoDoPeriodoBiograficoVer(tipo, id) {
    await toggleModal('modal-visualizar-periodo-biografico');
    await abrirVisualizacao(tipo, id);
}

// "Ver todos": fecha o Ver e abre a lista filtrada (mesma ação da lupa do cartão).
export async function verTodosTextosDoPeriodoBiografico(id) {
    await toggleModal('modal-visualizar-periodo-biografico');
    verTextosEpoca(id);
}
