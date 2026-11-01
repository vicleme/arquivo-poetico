// ============================================================
// estatisticas-tela-leituras.js: aba "Leituras" das Estatísticas, vista
// "Padrão" (Fase 22, entrega 4c; F22-D25 e F22-D26). Desenha em gráfico o que
// o bloco "Padrão das leituras" da aba Leitura avaliativa traz em tabela. As
// contas vêm de leitura-avaliativa-padrao.js e as séries de
// leitura-avaliativa-graficos.js; aqui só há texto de apoio e Chart.js.
//
// Recorte: as leituras dos textos que passam nos filtros compartilhados das
// Estatísticas (corpus, tipo, autor e período). Uma leitura por texto, faixa
// pela Classificação atual do texto, traduções sem agrupar (F22-D24).
// A vista "Cruzamento com etiquetas" (entrega 4d) usa o mesmo recorte.
// ============================================================

import { db } from './db.js';
import { textosDasEstatisticas } from './estatisticas-dados.js';
import { renderFiltrosCompartilhados } from './estatisticas-tela-comum.js';
import { calcularPadrao, MINIMO_PARA_PADRAO } from './leitura-avaliativa-padrao.js';
import { acharTextoDaLeitura } from './leitura-avaliativa-acoes.js';
import { dadosDosGraficos } from './leitura-avaliativa-graficos.js';
import { calcularCruzamento, cruzarDetalheDoCluster } from './leitura-avaliativa-cruzamento.js';
import {
    NIVEIS_DE_COR,
    normalizarCategoria,
    normalizarMedida,
    normalizarVista,
    opcoesDeCategoria,
    opcoesDeMedida,
    tabelaParaTela,
    textoDaMedida,
    textoDasColunasEspeciais,
    textoDoAvisoCruzamento,
} from './leitura-avaliativa-cruzamento-vista.js';
import { escapeHtml } from './utils.js';

// Faixas: a mesma ordem do padrão (baixa, média, alta). Cores diferem em
// luminosidade, e o n e o nome da faixa vão sempre escritos (legenda e rótulo).
export const COR_FAIXA = Object.freeze({ baixa: '#94a3b8', media: '#0891b2', alta: '#7c3aed' });
export const COR_POSITIVO = '#0d9488';
export const COR_NEGATIVO = '#d97706';
export const COR_RESPOSTA = Object.freeze({ sim: '#0d9488', talvez: '#f59e0b', nao: '#dc2626' });

const graficos = {};

const numeroPt = (n) => String(n).replace('.', ',');
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

// ─── Recorte ───────────────────────────────────────────────────────────

// Leituras só dos textos que entram nas Estatísticas agora. `textos` são os
// objetos do db (a mesma referência que `acharTextoDaLeitura` devolve).
export function leiturasDoRecorte(dbRef, textos) {
    const permitidos = new Set(textos || []);
    return (Array.isArray(dbRef?.leituras) ? dbRef.leituras : []).filter((l) => {
        const texto = acharTextoDaLeitura(dbRef, l?.tipo, l?.textoId);
        return texto && permitidos.has(texto);
    });
}

export function padraoDoRecorte(dbRef, textos) {
    return calcularPadrao(leiturasDoRecorte(dbRef, textos), {
        classificacaoDe: (tipo, id) => acharTextoDaLeitura(dbRef, tipo, id)?.autoclassificacao,
    });
}

// ─── Textos de apoio ───────────────────────────────────────────────────

export function textoDoAviso(dados) {
    if (!dados.totalTextos) {
        return 'Ainda não há leituras neste recorte. O padrão aparece depois de algumas leituras com corações escolhidos.';
    }
    const partes = [
        `${plural(dados.totalComCoracoes, 'texto entra', 'textos entram')} nas faixas, de ${plural(dados.totalTextos, 'lido', 'lidos')}.`,
    ];
    if (dados.semCoracoes) {
        partes.push(
            `${plural(dados.semCoracoes, 'texto fica', 'textos ficam')} de fora por não ter Classificação nem corações escolhidos.`,
        );
    }
    if (dados.poucos) {
        partes.push(
            `Poucos textos com corações (o ideal é ${MINIMO_PARA_PADRAO} ou mais): leia os números como indício, não como padrão.`,
        );
    }
    return partes.join(' ');
}

export function textoDasFaixas(dados) {
    const series = dados.pesoPorFaixa.series;
    if (!series.length) return '';
    const escritas = series.map((s) => `${s.rotulo}: ${plural(s.n, 'texto', 'textos')}`).join('; ');
    const omitidas = dados.pesoPorFaixa.omitidas.length
        ? ` Faixa sem texto não é desenhada: ficar de fora quer dizer "não há texto", não "ninguém marcou".`
        : '';
    return `${escritas}.${omitidas}`;
}

export function textoDoContraste(g) {
    if (!g.disponivel) return g.motivo;
    return `Peso médio da faixa alta (n = ${g.nAlta}) menos o da baixa (n = ${g.nBaixa}). Barra para a direita: o item pesa mais nos textos que você mais ama. Para a esquerda: pesa mais nos que menos ama.`;
}

export function textoDaResposta(g) {
    if (!g.disponivel) return 'Ninguém respondeu a esta pergunta nas leituras do recorte.';
    const fora = g.semResposta.length
        ? ` Faixas sem resposta ficam de fora (${g.semResposta.length}).`
        : '';
    return `Proporção sobre quem respondeu em cada faixa; o número de respostas vai no rótulo.${fora}`;
}

// ─── Configurações do Chart.js (puras, testáveis sem DOM) ──────────────

function cores(escuro) {
    return {
        texto: escuro ? '#94a3b8' : '#374151',
        grade: escuro ? 'rgba(148,163,184,0.15)' : 'rgba(0,0,0,0.08)',
    };
}

function opcoesBase(escuro, extra = {}) {
    const c = cores(escuro);
    return {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: { ticks: { color: c.texto }, grid: { color: c.grade }, ...extra.x },
            y: { ticks: { color: c.texto }, grid: { display: false }, ...extra.y },
        },
        plugins: {
            legend: {
                display: extra.legenda !== false,
                position: 'bottom',
                labels: { color: c.texto, boxWidth: 12, font: { size: 11 } },
            },
            tooltip: { callbacks: extra.tooltip || {} },
        },
    };
}

export function configContraste(g, escuro = false) {
    return {
        type: 'bar',
        data: {
            labels: g.rotulos,
            datasets: [
                {
                    data: g.valores,
                    backgroundColor: g.valores.map((v) => (v >= 0 ? COR_POSITIVO : COR_NEGATIVO)),
                    borderRadius: 4,
                },
            ],
        },
        options: opcoesBase(escuro, {
            legenda: false,
            tooltip: { label: (ctx) => `Contraste: ${numeroPt(ctx.raw)}` },
        }),
    };
}

export function configPesoPorFaixa(g, escuro = false) {
    return {
        type: 'bar',
        data: {
            labels: g.rotulos,
            datasets: g.series.map((s) => ({
                label: s.rotuloComN,
                data: s.valores,
                backgroundColor: COR_FAIXA[s.faixa],
                borderRadius: 3,
            })),
        },
        options: opcoesBase(escuro, {
            x: { beginAtZero: true, max: 3 },
            tooltip: { label: (ctx) => `${ctx.dataset.label}: ${numeroPt(ctx.raw)} de 3` },
        }),
    };
}

export function configIncomodou(g, escuro = false) {
    return {
        type: 'bar',
        data: {
            labels: g.rotulos,
            datasets: g.series.map((s) => ({
                label: s.rotuloComN,
                data: s.valores,
                backgroundColor: COR_FAIXA[s.faixa],
                borderRadius: 3,
            })),
        },
        options: opcoesBase(escuro, {
            x: { beginAtZero: true, max: 100, ticks: { callback: (v) => `${v}%` } },
            tooltip: {
                label: (ctx) =>
                    `${ctx.dataset.label}: ${numeroPt(ctx.raw)}% (${g.series[ctx.datasetIndex].legendas[ctx.dataIndex]})`,
            },
        }),
    };
}

// Uma barra por faixa, empilhada até 100%, com Sim, Talvez e Não.
export function configResposta(g, escuro = false) {
    return {
        type: 'bar',
        data: {
            labels: g.faixas.map((f) => f.rotuloComN),
            datasets: g.respostas.map((r, i) => ({
                label: r.rotulo,
                data: g.faixas.map((f) => f.percentuais[i]),
                backgroundColor: COR_RESPOSTA[r.id],
            })),
        },
        options: opcoesBase(escuro, {
            x: { stacked: true, beginAtZero: true, max: 100, ticks: { callback: (v) => `${v}%` } },
            y: { stacked: true },
            tooltip: {
                label: (ctx) =>
                    `${ctx.dataset.label}: ${numeroPt(ctx.raw)}% (${g.faixas[ctx.dataIndex].contagens[ctx.datasetIndex]} de ${g.faixas[ctx.dataIndex].respondidas})`,
            },
        }),
    };
}

// ─── Desenho ───────────────────────────────────────────────────────────

function escrever(id, texto) {
    const el = document.getElementById(id);
    if (el) el.textContent = texto;
}

// Altura do gráfico em px: cada item ganha espaço pelo número de séries.
export function alturaDoGrafico(itens, series) {
    return Math.max(120, itens * (Math.max(1, series) * 14 + 12) + 56);
}

function desenhar(canvasId, config, altura, tentativas = 0) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    if (typeof Chart === 'undefined') {
        if (tentativas < 30)
            setTimeout(() => desenhar(canvasId, config, altura, tentativas + 1), 100);
        return;
    }
    graficos[canvasId]?.destroy();
    const caixa = canvas.parentElement;
    if (caixa) caixa.style.height = `${altura}px`;
    graficos[canvasId] = new Chart(canvas, config);
}

function mostrarCaixa(canvasId, visivel) {
    const caixa = document.getElementById(canvasId)?.parentElement;
    if (caixa) caixa.classList.toggle('hidden', !visivel);
}

function limpar(canvasId) {
    graficos[canvasId]?.destroy();
    delete graficos[canvasId];
    mostrarCaixa(canvasId, false);
}

function desenharSeDisponivel(canvasId, g, config, itens, series) {
    if (!g.disponivel) return limpar(canvasId);
    mostrarCaixa(canvasId, true);
    desenhar(canvasId, config, alturaDoGrafico(itens, series));
}

export function renderLeituras() {
    if (!document.getElementById('estatisticas-leituras')) return;
    renderFiltrosCompartilhados();
    aplicarVista();
    if (estado.vista === 'cruzamento') {
        renderCruzamento();
        return;
    }
    const escuro = document.documentElement.classList.contains('dark');
    const padrao = padraoDoRecorte(db, textosDasEstatisticas());
    const dados = dadosDosGraficos(padrao);

    escrever('est-leituras-aviso', textoDoAviso(dados));
    escrever('est-leituras-faixas', textoDasFaixas(dados));

    escrever('est-leituras-contraste-contexto', textoDoContraste(dados.contraste));
    desenharSeDisponivel(
        'grafico-leituras-contraste',
        dados.contraste,
        configContraste(dados.contraste, escuro),
        dados.contraste.valores.length,
        1,
    );

    const peso = dados.pesoPorFaixa;
    escrever(
        'est-leituras-peso-contexto',
        peso.disponivel
            ? 'Peso médio de cada item por faixa, de 0 a 3 (pontual 1, marcante 2, central 3; quem não marcou conta 0).'
            : 'Sem textos com corações neste recorte.',
    );
    desenharSeDisponivel(
        'grafico-leituras-peso',
        peso,
        configPesoPorFaixa(peso, escuro),
        peso.rotulos.length,
        peso.series.length,
    );

    const inc = dados.incomodou;
    escrever(
        'est-leituras-incomodou-contexto',
        inc.disponivel
            ? 'Proporção dos textos de cada faixa em que o item incomodou, com "x de n" no balão. Faixas de tamanhos diferentes: a contagem bruta enganaria.'
            : 'Sem textos com corações neste recorte.',
    );
    desenharSeDisponivel(
        'grafico-leituras-incomodou',
        inc,
        configIncomodou(inc, escuro),
        inc.rotulos.length,
        inc.series.length,
    );

    [
        ['releria', 'grafico-leituras-releria', 'est-leituras-releria-contexto'],
        ['mostraria', 'grafico-leituras-mostraria', 'est-leituras-mostraria-contexto'],
    ].forEach(([campo, canvasId, contextoId]) => {
        const g = dados[campo];
        escrever(contextoId, textoDaResposta(g));
        desenharSeDisponivel(canvasId, g, configResposta(g, escuro), g.faixas.length * 2, 1);
    });
}

// ─── Vista "Cruzamento com etiquetas" (entrega 4d-2) ───────────────────

// Escolhas da tela (só na sessão, como o resto das Estatísticas sem filtro salvo).
const estado = { vista: 'padrao', categoria: 'tom', medida: 'pegou', clusterAberto: null };

const COR_CELULA = Object.freeze({ pegou: '13,148,136', incomodou: '217,119,6' });
const ALFA_POR_NIVEL = Object.freeze([0, 0.14, 0.3, 0.48, 0.68]);

export function estadoLeituras() {
    return { ...estado };
}

// Fundo da célula pelo nível (0 a 4); nível 0 não tem cor.
export function fundoDaCelula(nivel, medida) {
    const n = Math.min(NIVEIS_DE_COR, Math.max(0, Number(nivel) || 0));
    if (!n) return '';
    return `background-color: rgba(${COR_CELULA[normalizarMedida(medida)]}, ${ALFA_POR_NIVEL[n]});`;
}

function htmlDaCelula(c, medida) {
    const estilo = fundoDaCelula(c.nivel, medida);
    const cor = c.vazia ? 'text-gray-300 dark:text-slate-600' : 'font-semibold';
    const baixo = c.secundario
        ? `<div class="text-[9px] font-normal opacity-70">${escapeHtml(c.secundario)}</div>`
        : '';
    return `<td title="${escapeHtml(c.titulo)}" ${estilo ? `style="${estilo}"` : ''} class="px-2 py-1.5 text-center text-xs border border-gray-100 dark:border-slate-800 ${cor}"><div>${escapeHtml(c.principal)}</div>${baixo}</td>`;
}

// Tabela item × coluna. `abrir` liga o botão do cabeçalho dos clusters.
export function htmlDaTabelaCruzamento(dados, { abrir = true } = {}) {
    const t = tabelaParaTela(dados);
    if (t.semColunas) return '';
    const cab = t.colunas
        .map((c) => {
            const pequena = c.pequena
                ? '<div class="text-[9px] font-normal text-gray-400">indício</div>'
                : '';
            const nome =
                abrir && c.abrivel
                    ? `<button type="button" onclick="leiturasAbrirCluster('${escapeHtml(String(c.clusterId))}')" title="Ver as etiquetas deste cluster" class="font-bold underline decoration-dotted hover:text-blue-600 dark:hover:text-blue-400">${escapeHtml(c.rotulo)}</button>`
                    : `<span class="font-bold">${escapeHtml(c.rotulo)}</span>`;
            return `<th class="px-2 py-1.5 text-center text-[10px] text-gray-600 dark:text-slate-300 align-bottom">${nome}<div class="font-normal text-gray-400">n = ${c.n}</div>${pequena}</th>`;
        })
        .join('');
    const linhas = t.linhas
        .map(
            (l) =>
                `<tr><th class="px-2 py-1.5 text-left text-xs font-semibold text-gray-600 dark:text-slate-300 whitespace-nowrap">${escapeHtml(l.rotulo)}</th>${htmlDaCelula(l.total, t.medida)}${l.celulas.map((c) => htmlDaCelula(c, t.medida)).join('')}</tr>`,
        )
        .join('');
    return `<div class="overflow-x-auto"><table class="w-full border-collapse"><thead><tr><th class="px-2 py-1.5 text-left text-[10px] text-gray-400">Item</th><th class="px-2 py-1.5 text-center text-[10px] text-gray-600 dark:text-slate-300 align-bottom"><span class="font-bold">Todos</span><div class="font-normal text-gray-400">n = ${dados.totalTextos}</div></th>${cab}</tr></thead><tbody>${linhas}</tbody></table></div>`;
}

function nomeDoCluster(dbRef, clusterId) {
    const c = (dbRef?.tagClusters || []).find((x) => String(x.id) === String(clusterId));
    return c ? c.nome : '';
}

function preencherSelect(id, opcoes, valor) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = opcoes
        .map(
            (o) =>
                `<option value="${escapeHtml(o.id)}"${o.id === valor ? ' selected' : ''}>${escapeHtml(o.rotulo)}</option>`,
        )
        .join('');
}

function aplicarVista() {
    const cruz = estado.vista === 'cruzamento';
    document.getElementById('est-leituras-vista-padrao')?.classList.toggle('hidden', cruz);
    document.getElementById('est-leituras-vista-cruzamento')?.classList.toggle('hidden', !cruz);
    [
        ['est-leituras-btn-vista-padrao', !cruz],
        ['est-leituras-btn-vista-cruzamento', cruz],
    ].forEach(([id, ativo]) => {
        const b = document.getElementById(id);
        if (!b) return;
        b.setAttribute('aria-pressed', String(ativo));
        b.classList.toggle('bg-blue-600', ativo);
        b.classList.toggle('text-white', ativo);
    });
}

export function renderCruzamento() {
    const textos = textosDasEstatisticas();
    const leituras = leiturasDoRecorte(db, textos);
    const opcoes = { categoria: estado.categoria, medida: estado.medida };
    preencherSelect('est-leituras-cruz-categoria', opcoesDeCategoria(), estado.categoria);
    preencherSelect('est-leituras-cruz-medida', opcoesDeMedida(), estado.medida);

    const dados = calcularCruzamento(leituras, db, opcoes);
    escrever('est-leituras-cruz-aviso', textoDoAvisoCruzamento(dados));
    escrever('est-leituras-cruz-medida-texto', textoDaMedida(estado.medida));
    const tabela = document.getElementById('est-leituras-cruz-tabela');
    if (tabela) tabela.innerHTML = htmlDaTabelaCruzamento(dados);
    escrever('est-leituras-cruz-legenda', textoDasColunasEspeciais(dados));

    const detalhe = document.getElementById('est-leituras-cruz-detalhe');
    if (!detalhe) return;
    if (estado.clusterAberto == null) {
        detalhe.classList.add('hidden');
        detalhe.innerHTML = '';
        return;
    }
    const nome = nomeDoCluster(db, estado.clusterAberto);
    const d = cruzarDetalheDoCluster(leituras, db, {
        ...opcoes,
        clusterId: estado.clusterAberto,
    });
    detalhe.classList.remove('hidden');
    detalhe.innerHTML = `<div class="flex flex-wrap items-center justify-between gap-2 mb-2"><h3 class="text-sm font-bold text-gray-600 dark:text-slate-300">Etiquetas do cluster ${escapeHtml(nome)}</h3><button type="button" onclick="leiturasFecharCluster()" class="px-2 py-1 text-xs rounded border border-gray-300 dark:border-slate-600">Fechar</button></div><p class="text-xs text-gray-600 dark:text-slate-300 mb-3">${escapeHtml(textoDoAvisoCruzamento(d, { nomeDoCluster: nome }))}</p>${htmlDaTabelaCruzamento(d, { abrir: false })}`;
}

export function escolherVistaLeituras(vista) {
    estado.vista = normalizarVista(vista);
    renderLeituras();
}

export function escolherCategoriaLeituras(categoria) {
    estado.categoria = normalizarCategoria(categoria);
    estado.clusterAberto = null;
    renderLeituras();
}

export function escolherMedidaLeituras(medida) {
    estado.medida = normalizarMedida(medida);
    renderLeituras();
}

export function abrirClusterLeituras(clusterId) {
    estado.clusterAberto = clusterId == null || clusterId === '' ? null : String(clusterId);
    renderLeituras();
    document
        .getElementById('est-leituras-cruz-detalhe')
        ?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
}

export function fecharClusterLeituras() {
    estado.clusterAberto = null;
    renderLeituras();
}
