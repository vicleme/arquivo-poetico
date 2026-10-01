// ============================================================
// estatisticas-tela-comum.js — componentes visuais compartilhados.
// ============================================================

import { abrirPorAtalho } from './faixa-origem.js';
import { escapeHtml } from './utils.js';
import {
    getFiltrosCompartilhados,
    definirFiltrosCompartilhados,
    getCorpusEstatisticas,
    getTipoEstatisticas,
    getMinimoAparicoes,
    getMinimoAnos,
} from './estatisticas-filtros.js';
import { contarTextosFiltrados } from './estatisticas-dados.js';
import { db } from './db.js';

const graficos = {};

// Campo do corte automático "ocultar abaixo de N aparições", usado nos
// painéis de ocultar de Ano/Livro (estatisticas-tela-producao.js) e
// Temas/Pessoas (estatisticas-tela-temas-pessoas.js). A chamadora já
// aplicou o corte (via filtrarPorIntervalo) antes de montar a lista;
// aqui só lemos o valor salvo pra mostrar no input e usamos
// totalAntes/totalDepois pra avisar quantos itens já saíram por causa
// dele. Pedido do Victor, 27/09/2026.
export function campoMinimoAparicoes(chave, totalAntes, totalDepois) {
    const minimo = getMinimoAparicoes(chave);
    const cortados = totalAntes - totalDepois;
    return `<label class="flex items-center gap-1 text-[10px] text-gray-400 mb-1.5">Ocultar com menos de
        <input type="number" min="1" step="1" value="${minimo || ''}" placeholder="—" oninput="definirMinimoAparicoes('${chave}', this.value)" class="w-14 px-1 py-0.5 text-[11px] rounded border border-gray-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
        aparições${cortados > 0 ? ` (${cortados} já ocultos)` : ''}
    </label>`;
}

// Campo do corte automático "ocultar quem aparece em menos de N anos
// distintos", usado só no painel "ao longo do tempo" de Temas/Pessoas
// (estatisticas-tela-temas-pessoas.js) — critério de span temporal, não
// de volume (esse já é o campoMinimoAparicoes acima). A chamadora já
// aplicou o corte (via filtrarPorAnosDistintos) antes de montar a
// lista de checkboxes; aqui só lemos o valor salvo e usamos
// totalAntes/totalDepois (contados já depois do corte por mínimo de
// aparições, que roda antes deste) pra avisar quantos itens saíram por
// causa deste corte especificamente. Pedido do Victor, 27/09/2026.
export function campoMinimoAnos(chave, totalAntes, totalDepois) {
    const minimo = getMinimoAnos(chave);
    const cortados = totalAntes - totalDepois;
    return `<label class="flex items-center gap-1 text-[10px] text-gray-400 mb-1.5">Ocultar quem aparece em menos de
        <input type="number" min="1" step="1" value="${minimo || ''}" placeholder="—" oninput="definirMinimoAnos('${chave}', this.value)" class="w-14 px-1 py-0.5 text-[11px] rounded border border-gray-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
        anos diferentes${cortados > 0 ? ` (${cortados} já ocultos)` : ''}
    </label>`;
}

export function criarBarChart(canvasId, labels, data, cor, total = null) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    if (typeof Chart === 'undefined') {
        let tentativas = 0;
        const espera = setInterval(() => {
            tentativas++;
            if (typeof Chart !== 'undefined') {
                clearInterval(espera);
                criarBarChart(canvasId, labels, data, cor, total);
            } else if (tentativas >= 30) {
                clearInterval(espera);
                console.warn('Chart.js não carregou a tempo para', canvasId);
            }
        }, 100);
        return;
    }
    if (graficos[canvasId]) graficos[canvasId].destroy();
    const escuro = document.documentElement.classList.contains('dark');
    graficos[canvasId] = new Chart(canvas, {
        type: 'bar',
        data: { labels, datasets: [{ data, backgroundColor: cor, borderRadius: 4 }] },
        options: {
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: total
                        ? {
                              label: (ctx) =>
                                  `${ctx.raw} texto(s) - ${total ? ((ctx.raw / total) * 100).toFixed(1) : '0.0'}%`,
                          }
                        : {},
                },
            },
            scales: {
                x: {
                    ticks: { color: escuro ? '#94a3b8' : '#374151' },
                    grid: { color: escuro ? 'rgba(148,163,184,0.15)' : 'rgba(0,0,0,0.08)' },
                },
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0, color: escuro ? '#94a3b8' : '#374151' },
                    grid: { color: escuro ? 'rgba(148,163,184,0.15)' : 'rgba(0,0,0,0.08)' },
                },
            },
        },
    });
}

export function montarPainel(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
}

function normalizarBusca(s) {
    return String(s ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

// Busca ao vivo dentro de um painel de "ocultar" (Ano, Livro, Etiquetas,
// Pessoas — todos com id="painel-ocultos-*"), de seleção temporal
// (id="painel-temporal-*") ou de Grupos, tanto o filtro (id="painel-
// grupo-pessoas") quanto a variante temporal (id="painel-grupo-pessoa-
// tempo") — filtra os <label> existentes via style.display, sem refazer
// o HTML do painel. Refazer via montarPainel a cada tecla destruiria e
// recriaria o próprio campo de busca, perdendo o foco no meio da
// digitação — aqui o DOM do painel continua o mesmo, só alguns itens
// somem da vista. Nos painéis de Grupos, a busca é sobre o nome do
// grupo mesmo: se um grupo não bate mas um subgrupo dele bate, o
// subgrupo continua visível sozinho, sem o cabeçalho do grupo-pai —
// mesmo comportamento já aceito nos demais painéis. Ignora acentos
// (normalizarBusca) pra "tema" achar "Temática" e afins. Pedido do
// Victor, 27/09/2026.
export function filtrarItensOcultos(input) {
    const termo = normalizarBusca(input.value);
    const painel = input.closest(
        '[id^="painel-ocultos-"], [id^="painel-temporal-"], [id^="painel-grupo-"]',
    );
    if (!painel) return;
    painel.querySelectorAll('label').forEach((label) => {
        label.style.display =
            !termo || normalizarBusca(label.textContent).includes(termo) ? '' : 'none';
    });
    // Painéis de Grupos (seletorGrupos/seletorOcultosGrupos, em
    // estatisticas-tela-temas-pessoas.js) agrupam os checkboxes em
    // seções por Autor (.grupo-secao-busca, cabeçalho <h4> + família de
    // grupos). Sem isso, filtrar por nome esconderia os grupos mas
    // deixaria o <h4> do Autor "órfão", sem nada visível embaixo dele —
    // aqui a seção inteira some quando nenhum grupo dela sobrevive à
    // busca. Não-op nos demais painéis, que não têm essa classe.
    painel.querySelectorAll('.grupo-secao-busca').forEach((secao) => {
        const temVisivel = Array.from(secao.querySelectorAll('label')).some(
            (label) => label.style.display !== 'none',
        );
        secao.style.display = temVisivel ? '' : 'none';
    });
}

// Paleta cíclica pras linhas do gráfico multi-série: se houver mais
// itens selecionados do que cores, repete a partir do início — melhor
// que travar num número máximo de séries.
const PALETA_LINHAS = [
    '#10b981',
    '#e11d48',
    '#6366f1',
    '#f59e0b',
    '#06b6d4',
    '#8b5cf6',
    '#ec4899',
    '#0ea5e9',
    '#84cc16',
    '#f97316',
];

// Gráfico de linha com uma ou mais séries — usado pelos gráficos "ao
// longo do tempo" de Tema e Pessoa, pra cruzar dois ou mais itens no
// mesmo eixo de anos. `series` é [{ nome, data }], já alinhado ao mesmo
// eixo `labels` (ver unirSeriesPorAno em estatisticas-dados.js). Com
// uma série só, a legenda fica escondida — mesmo visual de antes,
// quando só existia uma linha por vez.
export function criarMultiLineChart(canvasId, labels, series) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;
    if (graficos[canvasId]) graficos[canvasId].destroy();
    const escuro = document.documentElement.classList.contains('dark');
    let indiceCor = 0;
    graficos[canvasId] = new Chart(canvas, {
        type: 'line',
        data: {
            labels,
            datasets: series.map((s) => {
                // A série "Total" (agregarTemasPorAno/agregarPessoasPorAno com
                // CHAVE_TOTAL_TEMPORAL) é um agregado, não um item escolhido —
                // fica tracejada e cinza, fora da paleta, pra não se confundir
                // visualmente com as linhas dos itens selecionados nem
                // "gastar" uma cor da paleta que devia ser de um item de
                // verdade.
                if (s.total) {
                    return {
                        label: s.nome,
                        data: s.data,
                        borderColor: escuro ? '#94a3b8' : '#6b7280',
                        backgroundColor: escuro ? '#94a3b8' : '#6b7280',
                        borderDash: [6, 4],
                        tension: 0.25,
                        fill: false,
                        pointRadius: 2,
                    };
                }
                const cor = PALETA_LINHAS[indiceCor % PALETA_LINHAS.length];
                indiceCor++;
                return {
                    label: s.nome,
                    data: s.data,
                    borderColor: cor,
                    backgroundColor: cor,
                    tension: 0.25,
                    fill: false,
                    pointRadius: 3,
                };
            }),
        },
        options: {
            plugins: {
                legend: {
                    display: series.length > 1,
                    position: 'bottom',
                    labels: {
                        color: escuro ? '#94a3b8' : '#374151',
                        boxWidth: 12,
                        font: { size: 11 },
                    },
                },
            },
            scales: {
                x: {
                    ticks: { color: escuro ? '#94a3b8' : '#374151' },
                    grid: { color: escuro ? 'rgba(148,163,184,0.15)' : 'rgba(0,0,0,0.08)' },
                },
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0, color: escuro ? '#94a3b8' : '#374151' },
                    grid: { color: escuro ? 'rgba(148,163,184,0.15)' : 'rgba(0,0,0,0.08)' },
                },
            },
        },
    });
}

export function renderFiltrosCompartilhados() {
    const container = document.querySelectorAll('.est-filtros-compartilhados');
    if (!container.length) return;
    const f = getFiltrosCompartilhados();
    const n = contarTextosFiltrados();
    const op = (value, label) =>
        `<option value="${value}" ${f.corpus === value ? 'selected' : ''}>${label}</option>`;
    const tipoOp = (value, label) =>
        `<option value="${value}" ${f.tipo === value ? 'selected' : ''}>${label}</option>`;
    // Autor ordenado alfabeticamente, igual aos demais selects de Autor
    // do app (ver renderDropdowns em ui.js) — "Todos os autores" sempre
    // primeiro, valor '' (ver getAutorEstatisticas/textoEntraNoFiltroEstatisticas
    // em estatisticas-filtros.js).
    const autoresOrdenados = [...(db.autores || [])].sort((a, b) =>
        a.nome.localeCompare(b.nome, 'pt-BR'),
    );
    const autorOp = autoresOrdenados
        .map(
            (a) =>
                `<option value="${a.id}" ${String(f.autorId) === String(a.id) ? 'selected' : ''}>${escapeHtml(a.nome)}</option>`,
        )
        .join('');
    container.forEach((el) => {
        el.innerHTML = `
            <div class="bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex flex-wrap items-end gap-3">
                <div>
                    <label class="block text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 mb-1">Corpus</label>
                    <select onchange="definirFiltrosCompartilhados({corpus: this.value})" style="width:auto;margin:0">
                        ${op('meus', 'Meus textos')}${op('importadas', 'Obras importadas')}${op('tudo', 'Tudo')}
                    </select>
                </div>
                <div>
                    <label class="block text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 mb-1">Autor</label>
                    <select onchange="definirFiltrosCompartilhados({autorId: this.value})" style="width:auto;margin:0">
                        <option value="" ${!f.autorId ? 'selected' : ''}>Todos os autores</option>
                        ${autorOp}
                    </select>
                </div>
                <div>
                    <label class="block text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 mb-1">Tipo</label>
                    <select onchange="definirFiltrosCompartilhados({tipo: this.value})" style="width:auto;margin:0">
                        ${tipoOp('todos', 'Poemas e prosas')}${tipoOp('poemas', 'Só poemas')}${tipoOp('prosas', 'Só prosas')}
                    </select>
                </div>
                <div>
                    <label class="block text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 mb-1">Período de escrita</label>
                    <div class="flex items-center gap-1">
                        <input type="number" min="0" placeholder="de" value="${escapeHtml(f.anoDe)}" onchange="definirFiltrosCompartilhados({anoDe: this.value})" style="width:72px;margin:0" />
                        <span class="text-xs text-gray-400">até</span>
                        <input type="number" min="0" placeholder="até" value="${escapeHtml(f.anoAte)}" onchange="definirFiltrosCompartilhados({anoAte: this.value})" style="width:72px;margin:0" />
                    </div>
                </div>
                <button type="button" onclick="limparFiltrosCompartilhados()" class="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline">Limpar filtros</button>
                <div class="ml-auto text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap">N textos nesta visão: <strong class="text-gray-700 dark:text-slate-200">${n.total}</strong> (${n.poemas} poemas · ${n.prosas} prosas)</div>
            </div>`;
    });
}

// Abre a lista (Poemas ou Prosas) já filtrada, a partir de um clique em
// barra de gráfico. `prefixo` é um dos prefixos de busca de CAMPOS_ATRIBUTO
// (utils.js) — 'tema:', 'pessoa:', 'grupo:', 'livro:' — ou '' quando só o
// ano importa (drill-down de data, sem texto de busca). `tipo` vem de
// tipoDestino() abaixo: 'prosa' ou 'poema' (padrão).
//
// Chamada direto como função JS (não construída como string de onclick),
// então `valor` não precisa de escape de aspas/onclick aqui.
export function navegarParaLista(prefixo, valor, tipo, ano = null) {
    const ehProsa = tipo === 'prosa';
    const destino = ehProsa ? 'prosas' : 'poemas';
    const consulta = prefixo ? prefixo + String(valor ?? '') : '';
    const partes = [];
    if (consulta) partes.push(consulta);
    if (ano != null) partes.push(`ano ${ano}`);
    abrirPorAtalho({
        destino,
        descricao: `Filtrando por ${partes.join(' · ') || 'Estatísticas'}`,
        controles: [`busca-${destino}`],
        aplicar: () => {
            if (prefixo) {
                if (ehProsa) window.setFiltroProsas?.(consulta);
                else window.setFiltroPoemas?.(consulta);
                const caixa = document.getElementById(`busca-${destino}`);
                if (caixa) caixa.value = consulta;
            }
            if (ano != null) {
                if (ehProsa) window.setFiltroDataRapidoProsasEscrita?.(String(ano));
                else window.setFiltroDataRapidoPoemasEscrita?.(String(ano));
            }
        },
        limpar: () => {
            if (prefixo) {
                if (ehProsa) window.setFiltroProsas?.('');
                else window.setFiltroPoemas?.('');
                const caixa = document.getElementById(`busca-${destino}`);
                if (caixa) caixa.value = '';
            }
            // Texto vazio zera o filtro de data (parseFiltroDataRapido).
            if (ano != null) {
                if (ehProsa) window.setFiltroDataRapidoProsasEscrita?.('');
                else window.setFiltroDataRapidoPoemasEscrita?.('');
            }
        },
    });
}

// Corpus/Tipo compartilhados definem se o drill-down abre em Poemas ou
// Prosas quando o filtro de Tipo está em "Poemas e prosas" (padrão: Poema).
export function tipoDestino() {
    return getTipoEstatisticas() === 'prosas' ? 'prosa' : 'poema';
}

// Liga o clique de uma barra de Chart.js (gráfico de barras, já
// renderizado em `canvasId`) a `aoClicarLabel(label)`, chamado com o
// label da barra clicada. Centraliza a extração do ponto clicado
// (getElementsAtEventForMode) pra não repetir esse trecho em cada tela
// que precisa de drill-down — usar isso + navegarParaLista é o padrão
// pra qualquer gráfico de barras novo que precisar ficar clicável.
export function bindDrillDownBarra(canvasId, aoClicarLabel) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    canvas.onclick = (event) => {
        const chart = typeof Chart !== 'undefined' ? Chart.getChart(canvas) : null;
        const pts =
            chart?.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true) || [];
        if (!pts.length) return;
        aoClicarLabel(chart.data.labels[pts[0].index]);
    };
}

export { getCorpusEstatisticas, getTipoEstatisticas, definirFiltrosCompartilhados };
