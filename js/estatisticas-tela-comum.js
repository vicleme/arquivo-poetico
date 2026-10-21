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
    getOcultosGrafico,
    getOrdemOcultos,
    escapeParaOnclick,
    getSelecaoTemporal,
    getOrdemTemporal,
    selecionarTodosTemporal,
    limparSelecaoTemporal,
    getGruposFiltroPessoas,
} from './estatisticas-filtros.js';
import {
    contarTextosFiltrados,
    agregarPorTema,
    agregarPorPessoa,
    filtrarPorIntervalo,
    anosDistintosPorTema,
    anosDistintosPorPessoa,
    filtrarPorAnosDistintos,
    CHAVE_TOTAL_TEMPORAL,
} from './estatisticas-dados.js';
import { db } from './db.js';

const graficos = {};

// Campo do corte automático "ocultar abaixo de N aparições", usado nos
// painéis de ocultar de Ano/Livro (estatisticas-tela-producao.js) e
// Temas/Pessoas (estatisticas-tela-temas.js e estatisticas-tela-pessoas.js). A chamadora já
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
// (estatisticas-tela-temas.js e estatisticas-tela-pessoas.js) — critério de span temporal, não
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

// `titulos` (opcional): Map(rótulo → texto) com o que o tooltip mostra como
// título no lugar do rótulo (ex.: o nome completo de um Local que aparece
// pelo apelido). Rótulo ausente do Map mantém o próprio rótulo.
export function criarBarChart(canvasId, labels, data, cor, total = null, titulos = null) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    if (typeof Chart === 'undefined') {
        let tentativas = 0;
        const espera = setInterval(() => {
            tentativas++;
            if (typeof Chart !== 'undefined') {
                clearInterval(espera);
                criarBarChart(canvasId, labels, data, cor, total, titulos);
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
                    callbacks: {
                        ...(titulos?.size
                            ? { title: (itens) => titulos.get(itens[0]?.label) ?? itens[0]?.label }
                            : {}),
                        ...(total
                            ? {
                                  label: (ctx) =>
                                      `${ctx.raw} texto(s) - ${total ? ((ctx.raw / total) * 100).toFixed(1) : '0.0'}%`,
                              }
                            : {}),
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

// ─── Barras empilhadas por papel (Temas e Assuntos) ──────────────────
function hexParaRgba(hex, alfa) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alfa})`;
}

const TRACEJADO = [5, 3];

// Chart.js não desenha borda tracejada em barras (BarElement ignora
// borderDash), então este plugin contorna à mão os conjuntos marcados com
// `borderDash`. É o que faz o papel "Indefinido" ser legível sem depender só da cor.
const pluginContornoTracejado = {
    id: 'contornoTracejado',
    afterDatasetsDraw(chart) {
        chart.data.datasets.forEach((ds, i) => {
            if (!ds.borderDash?.length || !chart.isDatasetVisible(i)) return;
            const ctx = chart.ctx;
            ctx.save();
            ctx.setLineDash(ds.borderDash);
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = ds.contornoCor;
            chart.getDatasetMeta(i).data.forEach((barra) => {
                const { x, y, base, width } = barra.getProps(['x', 'y', 'base', 'width'], true);
                const altura = Math.abs(base - y);
                if (!altura) return;
                ctx.strokeRect(
                    x - width / 2 + 0.75,
                    Math.min(y, base) + 0.75,
                    width - 1.5,
                    altura - 1.5,
                );
            });
            ctx.restore();
        });
    },
};

// Três papéis: principal (cor forte), secundário (cor fraca) e indefinido
// (preenchimento bem claro + contorno tracejado). `valores` = { principal,
// secundario, semPapel }. `total` (nº de textos do recorte) alimenta a porcentagem.
export function criarBarChartEmpilhado(canvasId, labels, valores, cor, total = null) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    if (typeof Chart === 'undefined') {
        let tentativas = 0;
        const espera = setInterval(() => {
            tentativas++;
            if (typeof Chart !== 'undefined') {
                clearInterval(espera);
                criarBarChartEmpilhado(canvasId, labels, valores, cor, total);
            } else if (tentativas >= 30) {
                clearInterval(espera);
                console.warn('Chart.js não carregou a tempo para', canvasId);
            }
        }, 100);
        return;
    }
    if (graficos[canvasId]) graficos[canvasId].destroy();
    const escuro = document.documentElement.classList.contains('dark');
    const conjuntos = [
        { label: 'Principal', data: valores.principal, backgroundColor: cor },
        { label: 'Secundário', data: valores.secundario, backgroundColor: hexParaRgba(cor, 0.4) },
        {
            label: 'Indefinido',
            data: valores.semPapel,
            backgroundColor: hexParaRgba(cor, 0.1),
            borderDash: TRACEJADO,
            contornoCor: cor,
        },
    ].map((c) => ({ ...c, borderWidth: 0 }));
    const pct = (n) => (total ? ((n / total) * 100).toFixed(1) : '0.0');
    const somaDaBarra = (i) =>
        [valores.principal, valores.secundario, valores.semPapel].reduce(
            (acc, v) => acc + (v?.[i] || 0),
            0,
        );
    graficos[canvasId] = new Chart(canvas, {
        type: 'bar',
        data: { labels, datasets: conjuntos },
        plugins: [pluginContornoTracejado],
        options: {
            // O tooltip vale para a barra inteira (e não só para o segmento sob o
            // mouse): lista os três papéis e fecha com o total. O clique do
            // drill-down continua pedindo o segmento (bindDrillDownBarra).
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: escuro ? '#cbd5e1' : '#374151',
                        generateLabels: (chart) =>
                            Chart.defaults.plugins.legend.labels
                                .generateLabels(chart)
                                .map((item) => {
                                    const ds = chart.data.datasets[item.datasetIndex];
                                    return ds.borderDash
                                        ? {
                                              ...item,
                                              strokeStyle: ds.contornoCor,
                                              lineWidth: 1.5,
                                              lineDash: ds.borderDash,
                                          }
                                        : item;
                                }),
                    },
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) =>
                            `${ctx.dataset.label}: ${ctx.raw} texto(s)${total ? ` - ${pct(ctx.raw)}%` : ''}`,
                        footer: (itens) => {
                            const i = itens[0]?.dataIndex;
                            if (i == null) return '';
                            const soma = somaDaBarra(i);
                            return `Total (todos os papéis): ${soma} texto(s)${total ? ` - ${pct(soma)}%` : ''}`;
                        },
                    },
                },
            },
            scales: {
                x: {
                    stacked: true,
                    ticks: { color: escuro ? '#94a3b8' : '#374151' },
                    grid: { color: escuro ? 'rgba(148,163,184,0.15)' : 'rgba(0,0,0,0.08)' },
                },
                y: {
                    stacked: true,
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
    // estatisticas-tela-temas.js e estatisticas-tela-pessoas.js) agrupam os checkboxes em
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
// label da barra clicada e, como segundo argumento, o índice do conjunto de
// dados (o segmento, nos gráficos empilhados; 0 nos de uma série só). Centraliza a extração do ponto clicado
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
        aoClicarLabel(chart.data.labels[pts[0].index], pts[0].datasetIndex ?? 0);
    };
}

export { getCorpusEstatisticas, getTipoEstatisticas, definirFiltrosCompartilhados };

// ─── Componentes usados por mais de uma aba ─────────────────────────
// Moravam em estatisticas-tela-temas-pessoas.js; vieram para cá na divisão
// da aba (Fase 1, etapa 1a).

// labels chega ordenado por frequência (agregarPorTema/agregarPorPessoa
// já sorteiam por contagem desc.); aqui só reordena pra alfabética se
// for o modo escolhido pra essa chave — a chamadora nunca precisa saber
// da preferência de ordem. Busca é ao vivo via filtrarItensOcultos
// (estatisticas-tela-comum.js), sem re-render.
export function seletorOcultos(chave, labels, totalAntesDoCorte) {
    const ocultos = getOcultosGrafico(chave);
    const campoMinimo = campoMinimoAparicoes(chave, totalAntesDoCorte, labels.length);
    if (!labels.length)
        return (
            campoMinimo + '<p class="text-[11px] text-gray-400 px-1">Nada para ocultar ainda.</p>'
        );
    const ordem = getOrdemOcultos(chave);
    const labelsOrdenados =
        ordem === 'alfabetica' ? [...labels].sort((a, b) => a.localeCompare(b, 'pt-BR')) : labels;
    const restaurar = ocultos.size
        ? `<button type="button" onclick="restaurarOcultosGrafico('${chave}')" class="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline block mb-1.5">Mostrar todos (${ocultos.size})</button>`
        : '';
    const botaoOrdem = (valor, rotulo) =>
        `<button type="button" onclick="definirOrdemOcultos('${chave}', '${valor}')" class="px-1.5 py-0.5 rounded text-[10px] font-semibold ${ordem === valor ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400'}">${rotulo}</button>`;
    const cabecalho = `
        ${campoMinimo}
        <input type="text" placeholder="Buscar..." oninput="filtrarItensOcultos(this)" class="w-full mb-1 px-1.5 py-0.5 text-[11px] rounded border border-gray-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 placeholder-gray-400" />
        <div class="flex items-center gap-1 mb-1.5">${botaoOrdem('frequencia', 'Mais citados')}${botaoOrdem('alfabetica', 'A–Z')}</div>
        ${restaurar}`;
    return (
        cabecalho +
        labelsOrdenados
            .map(
                (label) =>
                    `<label class="flex items-center gap-2 py-0.5 px-1 text-xs cursor-pointer whitespace-nowrap"><input type="checkbox" ${ocultos.has(label) ? 'checked' : ''} onchange="toggleOcultoItem('${chave}', '${escapeParaOnclick(label)}')">${escapeHtml(label)}</label>`,
            )
            .join('')
    );
}

// Checkboxes múltiplos pros gráficos "ao longo do tempo" (Tema/Pessoa):
// substitui o antigo <select> de item único, que não permitia cruzar
// mais de uma curva no mesmo gráfico. O corte por mínimo de aparições
// é compartilhado com o painel de barra (mesma chave `chaveAparicoes` —
// 'temas' ou 'pessoas-pessoa'), mas o campo pra ajustá-lo mora só lá;
// mostrar o mesmo campo aqui também evita que quem tá olhando só pro
// "ao longo do tempo" precise ir noutro painel pra entender ou mudar
// por que um item sumiu da lista. `totalBase` é a contagem antes de
// qualquer corte (pro campo de aparições reportar quantos já saíram);
// `labelsAntes` já vem cortado pelo mínimo de aparições (pro campo de
// anos reportar só o que ele mesmo cortou); `labelsFinal` é quem
// realmente vira checkbox, depois dos dois cortes — chega ordenado por
// frequência, reordena pra alfabética se for o modo escolhido pra essa
// chave (mesmo padrão de seletorOcultos, mas com estado próprio —
// getOrdemTemporal, não getOrdemOcultos — pra não acoplar a ordem dos
// dois painéis). `rotuloTotal` é o texto do item especial "Total", que
// fica fixo no topo (fora da ordenação/busca por nome, já que não é um
// item real da lista) — ver CHAVE_TOTAL_TEMPORAL em estatisticas-dados.js.
export function seletorTemporal(
    chave,
    chaveAparicoes,
    totalBase,
    labelsAntes,
    labelsFinal,
    rotuloTotal,
) {
    const campoAparicoes = campoMinimoAparicoes(chaveAparicoes, totalBase, labelsAntes.length);
    const campoAnos = campoMinimoAnos(chave, labelsAntes.length, labelsFinal.length);
    const campos = campoAparicoes + campoAnos;
    if (!labelsFinal.length)
        return campos + '<p class="text-[11px] text-gray-400 px-1">Nada para selecionar ainda.</p>';
    const selecionados = new Set(getSelecaoTemporal(chave));
    const ordem = getOrdemTemporal(chave);
    const labelsOrdenados =
        ordem === 'alfabetica'
            ? [...labelsFinal].sort((a, b) => a.localeCompare(b, 'pt-BR'))
            : labelsFinal;
    const botaoOrdem = (valor, rotulo) =>
        `<button type="button" onclick="definirOrdemTemporal('${chave}', '${valor}')" class="px-1.5 py-0.5 rounded text-[10px] font-semibold ${ordem === valor ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400'}">${rotulo}</button>`;
    const itemTotal = `<label class="flex items-center gap-2 py-0.5 px-1 mb-1 pb-1.5 text-xs font-semibold cursor-pointer whitespace-nowrap border-b border-gray-200 dark:border-slate-600"><input type="checkbox" ${selecionados.has(CHAVE_TOTAL_TEMPORAL) ? 'checked' : ''} onchange="toggleSelecaoTemporal('${chave}', '${CHAVE_TOTAL_TEMPORAL}', this.checked)">📊 ${rotuloTotal}</label>`;
    const cabecalho = `
        ${campos}
        <input type="text" placeholder="Buscar..." oninput="filtrarItensOcultos(this)" class="w-full mb-1 px-1.5 py-0.5 text-[11px] rounded border border-gray-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 placeholder-gray-400" />
        <div class="flex items-center gap-1 mb-1.5">${botaoOrdem('frequencia', 'Mais citados')}${botaoOrdem('alfabetica', 'A–Z')}</div>
        <div class="flex items-center gap-2 mb-1.5">
            <button type="button" onclick="selecionarTodosTemporalPainel('${chave}')" class="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline">Selecionar todos</button>
            <button type="button" onclick="limparSelecaoTemporalPainel('${chave}')" class="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline">Limpar seleção</button>
        </div>
        ${itemTotal}`;
    return (
        cabecalho +
        labelsOrdenados
            .map(
                (label) =>
                    `<label class="flex items-center gap-2 py-0.5 px-1 text-xs cursor-pointer whitespace-nowrap"><input type="checkbox" ${selecionados.has(label) ? 'checked' : ''} onchange="toggleSelecaoTemporal('${chave}', '${escapeParaOnclick(label)}', this.checked)">${escapeHtml(label)}</label>`,
            )
            .join('')
    );
}

// Texto descritivo acima do gráfico, reflete o que está selecionado —
// `nomes` já vem com CHAVE_TOTAL_TEMPORAL trocado pelo rótulo de
// exibição (ver renderTemasPessoas), então aqui não precisa saber da
// distinção entre item real e Total.
export function textoLegendaTemporal(nomes, singular, plural) {
    if (!nomes.length)
        return `Selecione um ou mais ${plural} abaixo para comparar a presença deles por ano.`;
    if (nomes.length === 1) return `Acompanhando ${singular}: ${nomes[0]}.`;
    return `Comparando ${nomes.length} ${plural}: ${nomes.join(', ')}.`;
}

// Handlers dos botões "Selecionar todos"/"Limpar seleção" dos painéis "ao
// longo do tempo" de Tema e Pessoa. "Selecionar todos" recalcula a lista na
// hora (não usa o HTML já renderizado, que pode estar filtrado pela busca) e
// preserva o item "Total" se já estava marcado.
window.selecionarTodosTemporalPainel = (chave) => {
    // Recalcula com os dois cortes aplicados (mínimo de aparições +
    // mínimo de anos distintos), senão "Selecionar todos" ressuscita na
    // seleção itens que o painel nem mostra mais como checkbox.
    const base =
        chave === 'tema'
            ? agregarPorTema(['tema'])
            : agregarPorPessoa({ modo: 'pessoa', grupoIds: getGruposFiltroPessoas() });
    const chaveAparicoes = chave === 'tema' ? 'temas' : 'pessoas-pessoa';
    const cortados = filtrarPorIntervalo(base, getMinimoAparicoes(chaveAparicoes) || '', '');
    const anosPorItem = chave === 'tema' ? anosDistintosPorTema() : anosDistintosPorPessoa();
    const labels = filtrarPorAnosDistintos(cortados.labels, anosPorItem, getMinimoAnos(chave));
    const incluirTotal = getSelecaoTemporal(chave).includes(CHAVE_TOTAL_TEMPORAL);
    selecionarTodosTemporal(chave, incluirTotal ? [CHAVE_TOTAL_TEMPORAL, ...labels] : labels);
};
window.limparSelecaoTemporalPainel = limparSelecaoTemporal;
