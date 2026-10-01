import {
    agregarPorTema,
    agregarPorPessoa,
    agregarPorGeneroPessoa,
    agregarPorAssunto,
    agregarTemasPorAno,
    agregarPessoasPorAno,
    coocorrenciaTemasPessoas,
    coocorrenciaTemasGrupos,
    contarTextosFiltrados,
    CHAVE_TOTAL_TEMPORAL,
    filtrarPorIntervalo,
    anosDistintosPorTema,
    anosDistintosPorPessoa,
    filtrarPorAnosDistintos,
} from './estatisticas-dados.js';
import {
    getModoGraficoPessoas,
    getPapelTemaEstatisticas,
    PAPEIS_TEMA_ESTATISTICAS,
    ROTULOS_PAPEL_TEMA_ESTATISTICAS,
    getPapelAssuntoEstatisticas,
    PAPEIS_ASSUNTO_ESTATISTICAS,
    ROTULOS_PAPEL_ASSUNTO_ESTATISTICAS,
    getGruposFiltroPessoas,
    getOcultosGrafico,
    filtrarOcultos,
    escapeParaOnclick,
    getOrdemOcultos,
    getSelecaoTemporal,
    getOrdemTemporal,
    selecionarTodosTemporal,
    limparSelecaoTemporal,
    selecionarTodosGruposFiltro,
    limparGruposFiltroPessoas,
    getModoColunasCoocorrencia,
    definirModoColunasCoocorrencia,
    getTemasColunasSelecionados,
    toggleTemaColunaCoocorrencia,
    selecionarTodosTemasColunas,
    limparTemasColunas,
    getOrdemColunasCoocorrencia,
    definirOrdemColunasCoocorrencia,
    getMinimoAparicoes,
    getMinimoAnos,
} from './estatisticas-filtros.js';
import {
    criarBarChart,
    criarMultiLineChart,
    montarPainel,
    campoMinimoAparicoes,
    campoMinimoAnos,
    renderFiltrosCompartilhados,
    navegarParaLista,
    tipoDestino,
    bindDrillDownBarra,
} from './estatisticas-tela-comum.js';
import { escapeHtml } from './utils.js';
import { db } from './db.js';

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

// Seletor "Papel do tema" acima do gráfico de Temas. Vale pra tudo que lê
// Tema nesta tela (barras, "ao longo do tempo", total de ocorrências, anos
// distintos e cruzamento com Pessoas e Grupos). A escolha persiste, então
// o painel diz sempre qual papel está ativo.
function seletorPapelTema() {
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

// Seletor "Papel do assunto" acima do gráfico de Assuntos. Conta pelo papel
// efetivo do Assunto no texto (herdado do Tema, ou fixado na mão). A escolha
// persiste, então o painel diz sempre qual papel está ativo.
function seletorPapelAssunto() {
    const atual = getPapelAssuntoEstatisticas();
    const botoes = PAPEIS_ASSUNTO_ESTATISTICAS.map(
        (v) =>
            `<button type="button" onclick="definirPapelAssuntoEstatisticas('${v}')" class="px-2 py-0.5 rounded text-[11px] font-semibold ${atual === v ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400'}">${ROTULOS_PAPEL_ASSUNTO_ESTATISTICAS[v]}</button>`,
    ).join('');
    const aviso =
        atual === 'todos'
            ? ''
            : `<p class="text-[10px] text-amber-600 dark:text-amber-400 mt-1">Contando só assuntos com papel: ${escapeHtml(ROTULOS_PAPEL_ASSUNTO_ESTATISTICAS[atual])}.</p>`;
    return `<div class="flex items-center gap-1 flex-wrap"><span class="text-[11px] text-gray-500 dark:text-slate-400 mr-1">Papel do assunto:</span>${botoes}</div>${aviso}`;
}

function seletorModoPessoas() {
    const modo = getModoGraficoPessoas();
    return ['pessoa', 'grupo']
        .map(
            (v) =>
                `<button type="button" onclick="definirModoGraficoPessoas('${v}')" class="px-2 py-0.5 rounded text-[11px] font-semibold ${modo === v ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400'}">${v === 'pessoa' ? 'Por pessoa' : 'Por grupo'}</button>`,
        )
        .join('');
}

// Lista de checkboxes de Grupo, organizada como renderGrupos
// (render-listas.js): cabeçalho por Autor, e dentro de cada Autor a
// família inteira (nível 1 + descendência) empilhada em pré-ordem
// alfabética, com indentação por nível. Antes era um `db.grupos.map`
// cru — nem ordenado, sem Autor nem nível — o que virou um problema
// real depois que Grupo passou a pertencer a um Autor (27/09/2026):
// nome deixou de ser único globalmente, então dois Autores podem ter
// cada um um grupo "Família" e a lista antiga os mostraria como um
// único checkbox indistinguível. Pedido do Victor, 27/09/2026.
function seletorGrupos() {
    if (!db?.grupos?.length)
        return '<p class="text-[11px] text-gray-400 px-1">Nenhum grupo cadastrado.</p>';
    const s = new Set(getGruposFiltroPessoas().map(String));
    const checkbox = (g, nivel) => {
        const indent = nivel > 1 ? ` style="padding-left:${(nivel - 1) * 0.9}rem"` : '';
        const seta = nivel > 1 ? '↳ ' : '';
        return `<label class="flex items-center gap-2 py-0.5 px-1 text-xs cursor-pointer whitespace-nowrap w-full"${indent}><input type="checkbox" ${s.has(String(g.id)) ? 'checked' : ''} onchange="toggleGrupoFiltroPessoas('${g.id}', this.checked)">${seta}${escapeHtml(g.nome)}</label>`;
    };
    const familia = (g, gruposDoAutor, nivel) => {
        const filhos = gruposDoAutor
            .filter((sub) => sub.paiId == g.id)
            .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        return (
            checkbox(g, nivel) + filhos.map((f) => familia(f, gruposDoAutor, nivel + 1)).join('')
        );
    };
    const autoresComGrupo = [...new Set(db.grupos.map((g) => g.autorId))]
        .map((id) => db.autores?.find((a) => a.id == id))
        .filter(Boolean)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const busca =
        '<input type="text" placeholder="Buscar..." oninput="filtrarItensOcultos(this)" class="w-full mb-1.5 px-1.5 py-0.5 text-[11px] rounded border border-gray-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 placeholder-gray-400" />';
    const controles = `<div class="flex items-center gap-2 mb-1.5">
        <button type="button" onclick="selecionarTodosGruposPainel()" class="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline">Selecionar todos</button>
        <button type="button" onclick="limparGruposPainel()" class="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline">Limpar seleção</button>
    </div>`;
    const corpo = autoresComGrupo
        .map((autor) => {
            const gruposDoAutor = db.grupos.filter((g) => g.autorId == autor.id);
            const nivel1 = gruposDoAutor
                .filter((g) => g.paiId == null)
                .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
            const itens = nivel1.map((g) => familia(g, gruposDoAutor, 1)).join('');
            return `<div class="grupo-secao-busca w-full"><h4 class="w-full text-[10px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mt-1.5 first:mt-0">${escapeHtml(autor.nome)}</h4>${itens}</div>`;
        })
        .join('');
    return busca + controles + corpo;
}

// Variante hierárquica de seletorOcultos, exclusiva do gráfico em modo
// "Por grupo": mesma árvore de seletorGrupos (cabeçalho por Autor,
// família em pré-ordem alfabética, indentação por nível), mas com
// checkbox de "ocultar do gráfico" (toggleOcultoItem) no lugar do
// checkbox de filtro. Só entra na árvore quem está em `labels` — ou
// seja, quem tem barra no gráfico. Isso não perde nenhum grupo com
// dado: o repique de agregarPorPessoa (estatisticas-dados.js) soma a
// contagem de um grupo em todos os ancestrais dele via
// cadeiaAncestraisGrupo, então se um subgrupo tem dado, o(s) grupo(s)
// acima dele na hierarquia também têm — a árvore filtrada por `labels`
// nunca corta um galho no meio. Pedido do Victor, 27/09/2026.
function seletorOcultosGrupos(chave, labels, totalAntesDoCorte) {
    const ocultos = getOcultosGrafico(chave);
    const campoMinimo = campoMinimoAparicoes(chave, totalAntesDoCorte, labels.length);
    if (!labels.length)
        return (
            campoMinimo + '<p class="text-[11px] text-gray-400 px-1">Nada para ocultar ainda.</p>'
        );
    const busca =
        '<input type="text" placeholder="Buscar..." oninput="filtrarItensOcultos(this)" class="w-full mb-1.5 px-1.5 py-0.5 text-[11px] rounded border border-gray-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 placeholder-gray-400" />';
    const restaurar = ocultos.size
        ? `<button type="button" onclick="restaurarOcultosGrafico('${chave}')" class="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline block mb-1.5">Mostrar todos (${ocultos.size})</button>`
        : '';
    const comDado = new Set(labels);
    const checkbox = (g, nivel) => {
        const indent = nivel > 1 ? ` style="padding-left:${(nivel - 1) * 0.9}rem"` : '';
        const seta = nivel > 1 ? '↳ ' : '';
        return `<label class="flex items-center gap-2 py-0.5 px-1 text-xs cursor-pointer whitespace-nowrap w-full"${indent}><input type="checkbox" ${ocultos.has(g.nome) ? 'checked' : ''} onchange="toggleOcultoItem('${chave}', '${escapeParaOnclick(g.nome)}')">${seta}${escapeHtml(g.nome)}</label>`;
    };
    const familia = (g, gruposDoAutor, nivel) => {
        const filhos = gruposDoAutor
            .filter((sub) => sub.paiId == g.id)
            .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        const proprio = comDado.has(g.nome) ? checkbox(g, nivel) : '';
        return proprio + filhos.map((f) => familia(f, gruposDoAutor, nivel + 1)).join('');
    };
    const autoresComGrupo = [...new Set(db.grupos.map((g) => g.autorId))]
        .map((id) => db.autores?.find((a) => a.id == id))
        .filter(Boolean)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const corpo = autoresComGrupo
        .map((autor) => {
            const gruposDoAutor = db.grupos.filter((g) => g.autorId == autor.id);
            const nivel1 = gruposDoAutor
                .filter((g) => g.paiId == null)
                .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
            const itens = nivel1.map((g) => familia(g, gruposDoAutor, 1)).join('');
            if (!itens) return '';
            return `<div class="grupo-secao-busca w-full"><h4 class="w-full text-[10px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mt-1.5 first:mt-0">${escapeHtml(autor.nome)}</h4>${itens}</div>`;
        })
        .join('');
    return campoMinimo + busca + restaurar + corpo;
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
function seletorTemporal(chave, chaveAparicoes, totalBase, labelsAntes, labelsFinal, rotuloTotal) {
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
function textoLegendaTemporal(nomes, singular, plural) {
    if (!nomes.length)
        return `Selecione um ou mais ${plural} abaixo para comparar a presença deles por ano.`;
    if (nomes.length === 1) return `Acompanhando ${singular}: ${nomes[0]}.`;
    return `Comparando ${nomes.length} ${plural}: ${nomes.join(', ')}.`;
}

function getModoCoocorrencia() {
    return document.getElementById('est-coocorrencia-modo')?.value || 'pessoas';
}

function seletorColunasCoocorrencia(temasDisponiveis, totalAntesDoCorte) {
    const modo = getModoColunasCoocorrencia();
    const selecionados = new Set(getTemasColunasSelecionados());
    const total = temasDisponiveis.length;
    const campoMinimo = campoMinimoAparicoes('temas', totalAntesDoCorte, total);
    const visiveis =
        modo === 'todos'
            ? temasDisponiveis
            : temasDisponiveis.filter((t) => selecionados.has(String(t)));
    const buscaId = 'est-busca-temas-coocorrencia';
    const ordem = getOrdemColunasCoocorrencia();
    const temasOrdenados =
        ordem === 'alfabetica'
            ? [...temasDisponiveis].sort((a, b) => a.localeCompare(b, 'pt-BR'))
            : temasDisponiveis;
    const botaoOrdem = (valor, rotulo) =>
        `<button type="button" onclick="definirOrdemColunasCoocorrencia('${valor}')" class="px-1.5 py-0.5 rounded text-[10px] font-semibold ${ordem === valor ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400'}">${rotulo}</button>`;
    const controles = `<div class="flex items-center gap-2 mb-2 flex-wrap">
        <button type="button" onclick="selecionarTodosTemasColunasCoocorrencia()" class="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline">Selecionar todos</button>
        <button type="button" onclick="limparTemasColunasCoocorrencia()" class="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline">Limpar seleção</button>
        <div class="flex items-center gap-1">${botaoOrdem('frequencia', 'Mais citados')}${botaoOrdem('alfabetica', 'A–Z')}</div>
        ${campoMinimo}
        <span class="text-[10px] text-gray-400">${modo === 'todos' ? `Todos os ${total} temas` : `${visiveis.length} de ${total} temas exibidos`}</span>
    </div>`;
    const checks = temasOrdenados
        .map(
            (
                tema,
            ) => `<label data-tema-coluna="${escapeHtml(tema).toLowerCase()}" class="flex items-center gap-2 py-0.5 px-1 text-xs cursor-pointer whitespace-nowrap">
        <input type="checkbox" ${selecionados.has(String(tema)) ? 'checked' : ''} ${modo === 'todos' ? 'disabled' : ''} onchange="toggleTemaColunaCoocorrencia('${escapeParaOnclick(tema)}', this.checked)">
        ${escapeHtml(tema)}
    </label>`,
        )
        .join('');
    return `<div class="mb-3 flex flex-wrap items-center gap-2">
        <label class="text-[10px] uppercase font-bold text-gray-400">Colunas</label>
        <select id="est-coocorrencia-colunas-modo" onchange="definirModoColunasCoocorrencia(this.value)" style="width:auto;margin:0">
            <option value="todos" ${modo === 'todos' ? 'selected' : ''}>Todos os temas</option>
            <option value="selecionar" ${modo === 'selecionar' ? 'selected' : ''}>Selecionar temas</option>
        </select>
        <span class="text-[10px] text-gray-400">A seleção altera apenas a visualização da matriz.</span>
    </div>
    <div id="painel-colunas-coocorrencia" class="${modo === 'selecionar' ? '' : 'hidden'} mb-3 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
        ${controles}
        <input id="${buscaId}" type="search" placeholder="Buscar tema…" oninput="filtrarTemasColunasCoocorrencia(this.value)" class="mb-2 w-full md:w-72 text-xs">
        <div id="lista-temas-colunas-coocorrencia" class="flex flex-wrap gap-x-3 max-h-40 overflow-y-auto">${checks}</div>
    </div>`;
}

// Reaproveita a chave 'temas' do corte por mínimo de aparições (mesma
// do gráfico de Temas) — é o mesmo conjunto de temas, só que aqui como
// colunas da matriz em vez de barras; um tema abaixo do mínimo some
// dali também. Pedido do Victor, 27/09/2026.
function temasAcimaDoMinimo() {
    return filtrarPorIntervalo(agregarPorTema(['tema']), getMinimoAparicoes('temas') || '', '')
        .labels;
}

function renderCoocorrencia() {
    const temasTotalBase = agregarPorTema(['tema']);
    const temasDisponiveis = filtrarPorIntervalo(
        temasTotalBase,
        getMinimoAparicoes('temas') || '',
        '',
    ).labels;
    const el = document.getElementById('tabela-coocorrencia');
    const painel = document.getElementById('painel-colunas-coocorrencia');
    if (!el) return;
    const modo = getModoCoocorrencia() === 'grupos' ? 'grupos' : 'pessoas';
    const modoColunas = getModoColunasCoocorrencia();
    const selecionados = new Set(getTemasColunasSelecionados());
    const temas =
        modoColunas === 'todos'
            ? temasDisponiveis
            : temasDisponiveis.filter((t) => selecionados.has(String(t)));
    let dados;
    if (modo === 'grupos') {
        const grupos = (db.grupos || []).map((g) => g.nome).filter(Boolean);
        dados = coocorrenciaTemasGrupos({ temas, grupos });
    } else {
        const pessoas = agregarPorPessoa({ modo: 'pessoa', grupoIds: [] }).labels;
        dados = coocorrenciaTemasPessoas({ temas, pessoas });
    }
    const linhas = modo === 'grupos' ? dados.grupos : dados.pessoas;
    const seletor = seletorColunasCoocorrencia(temasDisponiveis, temasTotalBase.labels.length);
    if (painel) painel.innerHTML = seletor;
    if (!dados.temas.length || !linhas.length) {
        el.innerHTML = `<p class="text-xs text-gray-400">${temas.length ? `Não há ${modo === 'grupos' ? 'grupos' : 'pessoas'} com coocorrência nesta visão.` : 'Selecione ao menos um tema para exibir as colunas da matriz.'}</p>`;
        return;
    }
    const header = dados.temas
        .map(
            (t) =>
                `<th class="px-2 py-1.5 text-center text-[10px] font-bold text-gray-500 dark:text-slate-400 whitespace-nowrap">${escapeHtml(t)}</th>`,
        )
        .join('');
    const rows = linhas
        .map((linha, i) => {
            const cells = dados.valores[i]
                .map((v, j) => {
                    const tema = dados.temas[j];
                    const entidade = `${linha} × ${tema}`;
                    return `<td title="${escapeHtml(`${entidade}: ${v} texto(s)`)}" class="px-2 py-1.5 text-center text-xs ${v ? 'font-semibold' : 'text-gray-300 dark:text-slate-600'}">${v || '—'}</td>`;
                })
                .join('');
            return `<tr><th class="px-2 py-1.5 text-left text-xs font-semibold text-gray-600 dark:text-slate-300 whitespace-nowrap">${escapeHtml(linha)}</th>${cells}</tr>`;
        })
        .join('');
    const eixo = modo === 'grupos' ? 'Grupo × tema' : 'Pessoa × tema';
    const descricao =
        modo === 'grupos'
            ? 'Coocorrência = número de textos que possuem simultaneamente uma pessoa pertencente ao grupo e o tema. Cada grupo conta no máximo uma vez por texto.'
            : 'Coocorrência = número de textos que possuem simultaneamente a pessoa e o tema.';
    el.innerHTML = `<div class="overflow-x-auto"><table class="w-full border-collapse"><thead><tr><th class="px-2 py-1.5 text-left text-[10px] text-gray-400">${eixo}</th>${header}</tr></thead><tbody>${rows}</tbody></table></div><p class="text-[10px] text-gray-400 mt-2">${descricao}</p>`;
}

// Handlers globais usados pela UI da matriz.
window.definirModoColunasCoocorrencia = definirModoColunasCoocorrencia;
window.toggleTemaColunaCoocorrencia = toggleTemaColunaCoocorrencia;
window.selecionarTodosTemasColunasCoocorrencia = () => {
    selecionarTodosTemasColunas(temasAcimaDoMinimo());
};
window.limparTemasColunasCoocorrencia = limparTemasColunas;
window.definirOrdemColunasCoocorrencia = definirOrdemColunasCoocorrencia;
window.filtrarTemasColunasCoocorrencia = (termo) => {
    const normalizado = String(termo || '')
        .trim()
        .toLocaleLowerCase('pt-BR');
    document
        .querySelectorAll('#lista-temas-colunas-coocorrencia [data-tema-coluna]')
        .forEach((el) => {
            el.classList.toggle(
                'hidden',
                normalizado && !el.dataset.temaColuna.includes(normalizado),
            );
        });
};

// Handlers globais dos botões "Selecionar todos"/"Limpar seleção" dos
// painéis de Grupos (filtro por pessoa/grupo — mesmo estado nos dois
// painéis que reaproveitam seletorGrupos) e dos painéis "ao longo do
// tempo" de Tema/Pessoa. "Selecionar todos" recalcula a lista de itens
// na hora (não usa o HTML já renderizado, que pode estar filtrado pela
// busca) — mesmo padrão de selecionarTodosTemasColunasCoocorrencia
// acima. No temporal, preserva o item "Total" se já estava marcado,
// pra não desmarcar ele de surpresa ao clicar em "Selecionar todos".
// Pedido do Victor, 27/09/2026.
window.selecionarTodosGruposPainel = () => {
    const ids = (db.grupos || []).map((g) => g.id);
    selecionarTodosGruposFiltro(ids);
};
window.limparGruposPainel = limparGruposFiltroPessoas;
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

export function renderTemasPessoas() {
    renderFiltrosCompartilhados();

    const temasBase = agregarPorTema(['tema']);
    const temasCortados = filtrarPorIntervalo(temasBase, getMinimoAparicoes('temas') || '', '');
    const temas = filtrarOcultos(temasCortados, getOcultosGrafico('temas'));
    const temasTop = { labels: temas.labels.slice(0, 12), data: temas.data.slice(0, 12) };
    const total = contarTextosFiltrados().total || null;
    criarBarChart('grafico-temas', temasTop.labels, temasTop.data, '#10b981', total);
    montarPainel(
        'painel-ocultos-temas',
        seletorOcultos('temas', temasCortados.labels, temasBase.labels.length),
    );
    bindDrillDownBarra('grafico-temas', (label) => navegarParaLista('tema:', label, tipoDestino()));

    const modoGrafico = getModoGraficoPessoas();
    const gruposSelecionados = getGruposFiltroPessoas();
    const pessoasBase = agregarPorPessoa({ modo: modoGrafico, grupoIds: gruposSelecionados });
    const pessoasTemporalBase = agregarPorPessoa({ modo: 'pessoa', grupoIds: gruposSelecionados });
    const chaveOcultosPessoas = modoGrafico === 'grupo' ? 'pessoas-grupo' : 'pessoas-pessoa';
    const pessoasCortados = filtrarPorIntervalo(
        pessoasBase,
        getMinimoAparicoes(chaveOcultosPessoas) || '',
        '',
    );
    const pessoas = filtrarOcultos(pessoasCortados, getOcultosGrafico(chaveOcultosPessoas));
    const pessoasTop =
        modoGrafico === 'grupo'
            ? { labels: pessoas.labels, data: pessoas.data }
            : { labels: pessoas.labels.slice(0, 12), data: pessoas.data.slice(0, 12) };
    criarBarChart('grafico-pessoas', pessoasTop.labels, pessoasTop.data, '#e11d48', total);
    bindDrillDownBarra('grafico-pessoas', (label) =>
        navegarParaLista(modoGrafico === 'grupo' ? 'grupo:' : 'pessoa:', label, tipoDestino()),
    );
    montarPainel('painel-modo-pessoas', seletorModoPessoas());
    montarPainel('painel-papel-tema', seletorPapelTema());
    montarPainel(
        'painel-grupo-pessoas',
        modoGrafico === 'pessoa'
            ? seletorGrupos()
            : '<p class="text-[11px] text-gray-400 px-1">O modo "Por grupo" já mostra os grupos diretamente no gráfico.</p>',
    );
    montarPainel(
        'painel-ocultos-pessoas',
        modoGrafico === 'grupo'
            ? seletorOcultosGrupos(
                  chaveOcultosPessoas,
                  pessoasCortados.labels,
                  pessoasBase.labels.length,
              )
            : seletorOcultos(
                  chaveOcultosPessoas,
                  pessoasCortados.labels,
                  pessoasBase.labels.length,
              ),
    );
    // "Gênero das pessoas retratadas" (pedido do Victor, 27/09/2026):
    // agrupa pelo valor literal de Gênero (agregarPorGeneroPessoa, já
    // filtrado por corpus/Autor/tipo/período via textoEntraNoFiltroEstatisticas
    // dentro de todosOsTextos), com o mesmo corte por mínimo de
    // aparições e o mesmo painel de ocultar dos demais gráficos da aba
    // — chave própria 'generos-pessoa', sem cruzar com 'pessoas-pessoa'.
    // Sem slice de Top N (poucas categorias, ao contrário de Tema/Pessoa)
    // e sem drill-down por enquanto: a navegação atual só sabe filtrar
    // por tema/pessoa/grupo isolados, não por "Autor + Gênero" combinados.
    const generosBase = agregarPorGeneroPessoa();
    const generosCortados = filtrarPorIntervalo(
        generosBase,
        getMinimoAparicoes('generos-pessoa') || '',
        '',
    );
    const generos = filtrarOcultos(generosCortados, getOcultosGrafico('generos-pessoa'));
    criarBarChart('grafico-generos-pessoa', generos.labels, generos.data, '#8b5cf6', total);

    // Assuntos (Cadastros → Assunto): mesmo padrão simples do gráfico de
    // Gênero acima (sem Top N, sem drill-down temporal) — a contagem já
    // vem sem categorias de contagem zero (agregarPorAssunto).
    const assuntosBase = agregarPorAssunto();
    const assuntosCortados = filtrarPorIntervalo(
        assuntosBase,
        getMinimoAparicoes('assuntos') || '',
        '',
    );
    const assuntos = filtrarOcultos(assuntosCortados, getOcultosGrafico('assuntos'));
    criarBarChart('grafico-assuntos', assuntos.labels, assuntos.data, '#059669', total);
    montarPainel(
        'painel-ocultos-assuntos',
        seletorOcultos('assuntos', assuntosCortados.labels, assuntosBase.labels.length),
    );
    // O clique na barra abre a lista com o mesmo recorte do gráfico: com um
    // papel escolhido, usa o prefixo daquele papel (assuntoprincipal: etc.).
    const prefixoAssunto =
        {
            principal: 'assuntoprincipal:',
            secundario: 'assuntosecundario:',
            semPapel: 'assuntoindefinido:',
        }[getPapelAssuntoEstatisticas()] || 'assunto:';
    bindDrillDownBarra('grafico-assuntos', (label) =>
        navegarParaLista(prefixoAssunto, label, tipoDestino()),
    );
    montarPainel('painel-papel-assunto', seletorPapelAssunto());
    montarPainel(
        'painel-ocultos-generos-pessoa',
        seletorOcultos('generos-pessoa', generosCortados.labels, generosBase.labels.length),
    );

    montarPainel('painel-grupo-pessoa-tempo', seletorGrupos());

    // Painel "ao longo do tempo": dois cortes empilhados, cada um com
    // seu critério. Primeiro reaproveita o mesmo corte por mínimo de
    // aparições dos gráficos de barra (temasCortados já vem pronto
    // acima; pessoas usa sempre o modo "por pessoa" aqui, então usa a
    // chave 'pessoas-pessoa' independente do modo escolhido no gráfico
    // de barra). Por cima, o corte por mínimo de anos distintos —
    // critério próprio desse painel (ver anosDistintosPorTema/Pessoa em
    // estatisticas-dados.js): um item com muitas citações mas só num
    // ano não mostra tendência nenhuma numa linha. Pedido do Victor,
    // 27/09/2026.
    const pessoasTemporalCortadas = filtrarPorIntervalo(
        pessoasTemporalBase,
        getMinimoAparicoes('pessoas-pessoa') || '',
        '',
    );
    const temasTemporalFinal = filtrarPorAnosDistintos(
        temasCortados.labels,
        anosDistintosPorTema(),
        getMinimoAnos('tema'),
    );
    const pessoasTemporalFinal = filtrarPorAnosDistintos(
        pessoasTemporalCortadas.labels,
        anosDistintosPorPessoa(),
        getMinimoAnos('pessoa'),
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
    montarPainel(
        'painel-temporal-pessoas',
        seletorTemporal(
            'pessoa',
            'pessoas-pessoa',
            pessoasTemporalBase.labels.length,
            pessoasTemporalCortadas.labels,
            pessoasTemporalFinal,
            'Total (todas as pessoas)',
        ),
    );

    // Total sempre entra primeiro (se marcado), na frente dos itens
    // específicos — mantém a linha tracejada/agregada num lugar
    // previsível na legenda, independente da ordem de seleção. Filtra
    // contra a lista já cortada (não a base crua): um item que saiu da
    // lista por um dos dois cortes também some do gráfico, mesmo que
    // já estivesse marcado antes — mesmo critério de "some da lista
    // também" já usado no corte por mínimo de aparições.
    const selecaoTema = getSelecaoTemporal('tema');
    const temasEspecificos = temasTemporalFinal.filter((t) => selecaoTema.includes(t));
    const temasParaGrafico = selecaoTema.includes(CHAVE_TOTAL_TEMPORAL)
        ? [CHAVE_TOTAL_TEMPORAL, ...temasEspecificos]
        : temasEspecificos;

    const selecaoPessoa = getSelecaoTemporal('pessoa');
    const pessoasEspecificas = pessoasTemporalFinal.filter((p) => selecaoPessoa.includes(p));
    const pessoasParaGrafico = selecaoPessoa.includes(CHAVE_TOTAL_TEMPORAL)
        ? [CHAVE_TOTAL_TEMPORAL, ...pessoasEspecificas]
        : pessoasEspecificas;

    const nomeExibicao = (item, rotuloTotal) =>
        item === CHAVE_TOTAL_TEMPORAL ? rotuloTotal : item;
    const legendaTema = document.getElementById('est-tema-temporal-legenda');
    if (legendaTema)
        legendaTema.textContent = textoLegendaTemporal(
            temasParaGrafico.map((t) => nomeExibicao(t, 'Total (todos os temas)')),
            'tema',
            'temas',
        );
    const legendaPessoa = document.getElementById('est-pessoa-temporal-legenda');
    if (legendaPessoa)
        legendaPessoa.textContent = textoLegendaTemporal(
            pessoasParaGrafico.map((p) => nomeExibicao(p, 'Total (todas as pessoas)')),
            'pessoa',
            'pessoas',
        );

    const temaSerie = agregarTemasPorAno(temasParaGrafico);
    const pessoaSerie = agregarPessoasPorAno(pessoasParaGrafico, gruposSelecionados);
    criarMultiLineChart('grafico-tema-tempo', temaSerie.labels, temaSerie.series);
    criarMultiLineChart('grafico-pessoa-tempo', pessoaSerie.labels, pessoaSerie.series);

    renderCoocorrencia();
}
