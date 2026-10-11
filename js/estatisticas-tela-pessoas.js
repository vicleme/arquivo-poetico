import {
    agregarPorPessoa,
    opcoesFiltroGenero,
    CHAVE_SEM_IDENTIDADE,
    SEM_IDENTIDADE_DOCUMENTADA,
    agregarPessoasPorAno,
    contarTextosFiltrados,
    CHAVE_TOTAL_TEMPORAL,
    filtrarPorIntervalo,
    anosDistintosPorPessoa,
    filtrarPorAnosDistintos,
} from './estatisticas-dados.js';
import {
    getModoGraficoPessoas,
    getGruposFiltroPessoas,
    getConsiderarCisTrans,
    getGenerosFiltroPessoas,
    getIdentidadesFiltroPessoas,
    getOcultosGrafico,
    filtrarOcultos,
    escapeParaOnclick,
    getSelecaoTemporal,
    selecionarTodosGruposFiltro,
    limparGruposFiltroPessoas,
    getMinimoAparicoes,
    getMinimoAnos,
} from './estatisticas-filtros.js';
import {
    criarBarChart,
    criarMultiLineChart,
    montarPainel,
    campoMinimoAparicoes,
    renderFiltrosCompartilhados,
    navegarParaLista,
    tipoDestino,
    bindDrillDownBarra,
    seletorOcultos,
    seletorTemporal,
    textoLegendaTemporal,
} from './estatisticas-tela-comum.js';
import { escapeHtml, IDENTIDADES_CIS_TRANS } from './utils.js';
import { db } from './db.js';

const ROTULOS_MODO_PESSOAS = { pessoa: 'Por pessoa', grupo: 'Por grupo', genero: 'Por gênero' };

function seletorModoPessoas() {
    const modo = getModoGraficoPessoas();
    return Object.entries(ROTULOS_MODO_PESSOAS)
        .map(
            ([v, rotulo]) =>
                `<button type="button" onclick="definirModoGraficoPessoas('${v}')" class="px-2 py-0.5 rounded text-[11px] font-semibold ${modo === v ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400'}">${rotulo}</button>`,
        )
        .join('');
}

// Botão ligável e desligável "Considerar cis/trans" (F1-D3). Aparece nos
// modos "Por pessoa" (acrescenta o filtro de identidade) e "Por gênero"
// (combina Gênero e identidade em cada barra).
function botaoCisTrans() {
    const ativo = getConsiderarCisTrans();
    return `<button type="button" role="switch" aria-checked="${ativo}" onclick="definirConsiderarCisTrans(${!ativo})" class="px-2 py-0.5 rounded text-[11px] font-semibold border ${ativo ? 'bg-violet-600 text-white border-violet-600' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 border-transparent'}">⚧ Considerar cis/trans: ${ativo ? 'ligado' : 'desligado'}</button>
<span class="text-[10px] text-gray-400 ml-1">${ativo ? 'Vazio na Pessoa aparece como "(Identidade não documentada)".' : 'Desligado: a identidade cis/trans é ignorada de propósito.'}</span>`;
}

// Painel do filtro de Gênero (e, com cis/trans ligado, de identidade) do
// modo "Por pessoa". Os itens de Gênero são deduplicados sem caixa nem
// acento; a contagem entre parênteses é de Pessoas cadastradas.
function seletorGeneros() {
    const opcoes = opcoesFiltroGenero();
    const marcados = new Set(getGenerosFiltroPessoas());
    const rotuloLimpar = (fn) =>
        `<button type="button" onclick="${fn}()" class="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline">Limpar seleção</button>`;
    const item = (marcado, onchange, texto) =>
        `<label class="flex items-center gap-2 py-0.5 px-1 text-xs cursor-pointer whitespace-nowrap w-full"><input type="checkbox" ${marcado ? 'checked' : ''} onchange="${onchange}">${texto}</label>`;
    const generos = opcoes.length
        ? opcoes
              .map((o) =>
                  item(
                      marcados.has(o.chave),
                      `toggleGeneroFiltroPessoas('${escapeParaOnclick(o.chave)}', this.checked)`,
                      `${escapeHtml(o.rotulo)} <span class="text-gray-400">(${o.pessoas})</span>`,
                  ),
              )
              .join('')
        : '<p class="text-[11px] text-gray-400 px-1">Nenhuma pessoa cadastrada.</p>';
    let html = `<div class="w-full"><h4 class="text-[10px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">Gênero ${rotuloLimpar('limparGenerosFiltroPessoas')}</h4>${generos}</div>`;
    if (getConsiderarCisTrans()) {
        const idMarcadas = new Set(getIdentidadesFiltroPessoas());
        const valores = [...IDENTIDADES_CIS_TRANS, CHAVE_SEM_IDENTIDADE];
        const itens = valores
            .map((v) =>
                item(
                    idMarcadas.has(v),
                    `toggleIdentidadeFiltroPessoas('${escapeParaOnclick(v)}', this.checked)`,
                    escapeHtml(v === CHAVE_SEM_IDENTIDADE ? SEM_IDENTIDADE_DOCUMENTADA : v),
                ),
            )
            .join('');
        html += `<div class="w-full mt-2"><h4 class="text-[10px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">Identidade ${rotuloLimpar('limparIdentidadesFiltroPessoas')}</h4>${itens}</div>`;
    }
    return html;
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

// Handlers dos botões "Selecionar todos"/"Limpar seleção" dos painéis de Grupos
// (mesmo estado nos dois painéis que reaproveitam seletorGrupos).
window.selecionarTodosGruposPainel = () => {
    const ids = (db.grupos || []).map((g) => g.id);
    selecionarTodosGruposFiltro(ids);
};
window.limparGruposPainel = limparGruposFiltroPessoas;

export function renderPessoasGrupos() {
    renderFiltrosCompartilhados();

    const total = contarTextosFiltrados().total || null;
    const modoGrafico = getModoGraficoPessoas();
    const gruposSelecionados = getGruposFiltroPessoas();
    const considerarCisTrans = getConsiderarCisTrans();
    const pessoasBase = agregarPorPessoa({
        modo: modoGrafico,
        grupoIds: gruposSelecionados,
        generos: getGenerosFiltroPessoas(),
        identidades: getIdentidadesFiltroPessoas(),
        considerarCisTrans,
    });
    const pessoasTemporalBase = agregarPorPessoa({ modo: 'pessoa', grupoIds: gruposSelecionados });
    const chaveOcultosPessoas = `pessoas-${modoGrafico}`;
    const pessoasCortados = filtrarPorIntervalo(
        pessoasBase,
        getMinimoAparicoes(chaveOcultosPessoas) || '',
        '',
    );
    const pessoas = filtrarOcultos(pessoasCortados, getOcultosGrafico(chaveOcultosPessoas));
    const pessoasTop =
        modoGrafico === 'pessoa'
            ? { labels: pessoas.labels.slice(0, 12), data: pessoas.data.slice(0, 12) }
            : { labels: pessoas.labels, data: pessoas.data };
    criarBarChart(
        'grafico-pessoas',
        pessoasTop.labels,
        pessoasTop.data,
        modoGrafico === 'genero' ? '#8b5cf6' : '#e11d48',
        total,
    );
    if (modoGrafico === 'genero') {
        // A barra de gênero não abre lista ao clicar, por ora (F1-D3).
        const canvas = document.getElementById('grafico-pessoas');
        if (canvas) canvas.onclick = null;
    } else {
        bindDrillDownBarra('grafico-pessoas', (label) =>
            navegarParaLista(modoGrafico === 'grupo' ? 'grupo:' : 'pessoa:', label, tipoDestino()),
        );
    }
    montarPainel('painel-modo-pessoas', seletorModoPessoas());
    montarPainel('painel-cistrans-pessoas', modoGrafico === 'grupo' ? '' : botaoCisTrans());
    montarPainel(
        'painel-grupo-pessoas',
        modoGrafico === 'grupo'
            ? '<p class="text-[11px] text-gray-400 px-1">O modo "Por grupo" já mostra os grupos diretamente no gráfico.</p>'
            : seletorGrupos(),
    );
    montarPainel(
        'painel-genero-pessoas',
        modoGrafico === 'pessoa'
            ? seletorGeneros()
            : '<p class="text-[11px] text-gray-400 px-1">O filtro de gênero vale só no modo "Por pessoa".</p>',
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

    montarPainel('painel-grupo-pessoa-tempo', seletorGrupos());

    // Painel "ao longo do tempo": usa sempre o modo "por pessoa" (chave
    // 'pessoas-pessoa'), independente do modo escolhido no gráfico de barra, e
    // por cima o corte por mínimo de anos distintos. Pedido do Victor, 27/09/2026.
    const pessoasTemporalCortadas = filtrarPorIntervalo(
        pessoasTemporalBase,
        getMinimoAparicoes('pessoas-pessoa') || '',
        '',
    );
    const pessoasTemporalFinal = filtrarPorAnosDistintos(
        pessoasTemporalCortadas.labels,
        anosDistintosPorPessoa(),
        getMinimoAnos('pessoa'),
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
    const selecaoPessoa = getSelecaoTemporal('pessoa');
    const pessoasEspecificas = pessoasTemporalFinal.filter((p) => selecaoPessoa.includes(p));
    const pessoasParaGrafico = selecaoPessoa.includes(CHAVE_TOTAL_TEMPORAL)
        ? [CHAVE_TOTAL_TEMPORAL, ...pessoasEspecificas]
        : pessoasEspecificas;
    const legendaPessoa = document.getElementById('est-pessoa-temporal-legenda');
    if (legendaPessoa)
        legendaPessoa.textContent = textoLegendaTemporal(
            pessoasParaGrafico.map((p) =>
                p === CHAVE_TOTAL_TEMPORAL ? 'Total (todas as pessoas)' : p,
            ),
            'pessoa',
            'pessoas',
        );
    const pessoaSerie = agregarPessoasPorAno(pessoasParaGrafico, gruposSelecionados);
    criarMultiLineChart('grafico-pessoa-tempo', pessoaSerie.labels, pessoaSerie.series);
}
