import {
    agregarPorTema,
    agregarPorPapel,
    recortarPorPapel,
    agregarTemasPorAno,
    contarTextosFiltrados,
    CHAVE_TOTAL_TEMPORAL,
    filtrarPorIntervalo,
    anosDistintosPorTema,
    filtrarPorAnosDistintos,
} from './estatisticas-dados.js';
import {
    getPapelTemaEstatisticas,
    PAPEIS_TEMA_ESTATISTICAS,
    ROTULOS_PAPEL_TEMA_ESTATISTICAS,
    getModoTemasAssuntos,
    getOcultosGrafico,
    filtrarOcultos,
    getSelecaoTemporal,
    getMinimoAparicoes,
    getMinimoAnos,
} from './estatisticas-filtros.js';
import {
    criarBarChartEmpilhado,
    criarMultiLineChart,
    montarPainel,
    renderFiltrosCompartilhados,
    navegarParaLista,
    tipoDestino,
    bindDrillDownBarra,
    seletorOcultos,
    seletorTemporal,
    textoLegendaTemporal,
} from './estatisticas-tela-comum.js';
import { escapeHtml } from './utils.js';

// Seletor "Papel do tema" acima do gráfico de Temas. Vale pra tudo que lê
// Tema nesta tela (barras, "ao longo do tempo", total de ocorrências, anos
// distintos e cruzamento com Pessoas e Grupos). A escolha persiste, então
// o painel diz sempre qual papel está ativo.
export function seletorPapelTema() {
    const atual = getPapelTemaEstatisticas();
    const botoes = PAPEIS_TEMA_ESTATISTICAS.map(
        (v) =>
            `<button type="button" onclick="definirPapelTemaEstatisticas('${v}')" class="px-2 py-0.5 rounded text-[11px] font-semibold ${atual === v ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400'}">${ROTULOS_PAPEL_TEMA_ESTATISTICAS[v]}</button>`,
    ).join('');
    const aviso =
        atual === 'todos'
            ? ''
            : `<p class="text-[10px] text-amber-600 dark:text-amber-400 mt-1">Contando só temas com papel: ${escapeHtml(ROTULOS_PAPEL_TEMA_ESTATISTICAS[atual])}.</p>`;
    return `<div class="flex items-center gap-1 flex-wrap"><span class="text-[11px] text-gray-500 dark:text-slate-400 mr-1">Papel do tema:</span>${botoes}</div>${aviso}`;
}

const CONFIG_TEMAS_ASSUNTOS = {
    tema: {
        chave: 'temas',
        cor: '#10b981',
        topN: 12,
        prefixos: ['temaprincipal:', 'temasecundario:', 'temasempapel:'],
        titulo: 'Temas mais frequentes',
        texto: 'Número de textos que possuem cada tema, dividido pelo papel do tema no texto.',
    },
    assunto: {
        chave: 'assuntos',
        cor: '#059669',
        topN: null,
        prefixos: ['assuntoprincipal:', 'assuntosecundario:', 'assuntoindefinido:'],
        titulo: 'Assuntos mais frequentes',
        texto: 'Textos por Assunto (Cadastros → Assunto), derivado dos Temas que cada texto tem. Um texto com temas de mais de um Assunto conta em cada um; o papel é o do Assunto naquele texto.',
    },
};

function seletorModoTemasAssuntos() {
    const modo = getModoTemasAssuntos();
    return ['tema', 'assunto']
        .map(
            (v) =>
                `<button type="button" onclick="definirModoTemasAssuntos('${v}')" class="px-2 py-0.5 rounded text-[11px] font-semibold ${modo === v ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400'}">${v === 'tema' ? 'Por tema' : 'Por assunto'}</button>`,
        )
        .join('');
}

export function renderTemasAssuntos() {
    renderFiltrosCompartilhados();

    const total = contarTextosFiltrados().total || null;

    // Gráfico único de Temas e Assuntos, empilhado por papel. Corte por
    // mínimo, "Ocultar" e Top N valem para o TOTAL da barra (a soma dos três
    // papéis, igual à antiga barra "Todos") e usam as chaves 'temas' e 'assuntos'.
    const modo = getModoTemasAssuntos();
    const cfg = CONFIG_TEMAS_ASSUNTOS[modo];
    const papeisBase = agregarPorPapel({ base: modo });
    const papeisCortados = filtrarPorIntervalo(papeisBase, getMinimoAparicoes(cfg.chave) || '', '');
    const papeisVisiveis = filtrarOcultos(papeisCortados, getOcultosGrafico(cfg.chave));
    const rotulosBarra = cfg.topN
        ? papeisVisiveis.labels.slice(0, cfg.topN)
        : papeisVisiveis.labels;
    const barras = recortarPorPapel(papeisBase, rotulosBarra);
    criarBarChartEmpilhado('grafico-temas-assuntos', barras.labels, barras, cfg.cor, total);
    montarPainel('painel-modo-temas-assuntos', seletorModoTemasAssuntos());
    const titulo = document.getElementById('titulo-temas-assuntos');
    if (titulo) titulo.textContent = cfg.titulo;
    const texto = document.getElementById('texto-temas-assuntos');
    if (texto) texto.textContent = cfg.texto;
    montarPainel(
        'painel-ocultos-temas-assuntos',
        seletorOcultos(cfg.chave, papeisCortados.labels, papeisBase.labels.length),
    );
    // O clique no segmento abre a lista com o prefixo do papel clicado.
    bindDrillDownBarra('grafico-temas-assuntos', (label, indiceConjunto) =>
        navegarParaLista(cfg.prefixos[indiceConjunto] || cfg.prefixos[0], label, tipoDestino()),
    );

    // Base do painel "ao longo do tempo" (e da matriz): temas por papel escolhido
    // ali, com o mesmo corte por mínimo de aparições.
    const temasBase = agregarPorTema(['tema']);
    const temasCortados = filtrarPorIntervalo(temasBase, getMinimoAparicoes('temas') || '', '');
    montarPainel('painel-papel-tema-tempo', seletorPapelTema());

    // Painel "ao longo do tempo": corte por mínimo de aparições (o mesmo dos
    // gráficos de barra) e, por cima, o corte por mínimo de anos distintos
    // (anosDistintosPorTema, em estatisticas-dados.js). Pedido do Victor, 27/09/2026.
    const temasTemporalFinal = filtrarPorAnosDistintos(
        temasCortados.labels,
        anosDistintosPorTema(),
        getMinimoAnos('tema'),
    );
    montarPainel(
        'painel-temporal-temas',
        seletorTemporal(
            'tema',
            'temas',
            temasBase.labels.length,
            temasCortados.labels,
            temasTemporalFinal,
            'Total (todos os temas)',
        ),
    );
    // Total entra primeiro (se marcado), na frente dos itens específicos, e só
    // entram itens que sobreviveram aos dois cortes.
    const selecaoTema = getSelecaoTemporal('tema');
    const temasEspecificos = temasTemporalFinal.filter((t) => selecaoTema.includes(t));
    const temasParaGrafico = selecaoTema.includes(CHAVE_TOTAL_TEMPORAL)
        ? [CHAVE_TOTAL_TEMPORAL, ...temasEspecificos]
        : temasEspecificos;
    const legendaTema = document.getElementById('est-tema-temporal-legenda');
    if (legendaTema)
        legendaTema.textContent = textoLegendaTemporal(
            temasParaGrafico.map((t) =>
                t === CHAVE_TOTAL_TEMPORAL ? 'Total (todos os temas)' : t,
            ),
            'tema',
            'temas',
        );
    const temaSerie = agregarTemasPorAno(temasParaGrafico);
    criarMultiLineChart('grafico-tema-tempo', temaSerie.labels, temaSerie.series);
}
