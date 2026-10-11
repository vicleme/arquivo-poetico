import {
    agregarPorTema,
    agregarPorPessoa,
    coocorrenciaTemasPessoas,
    coocorrenciaTemasGrupos,
    coocorrenciaTemasPersonagens,
    filtrarPorIntervalo,
} from './estatisticas-dados.js';
import {
    getModoColunasCoocorrencia,
    definirModoColunasCoocorrencia,
    getPainelColunasCoocorrenciaAberto,
    definirPainelColunasCoocorrenciaAberto,
    getTemasColunasSelecionados,
    toggleTemaColunaCoocorrencia,
    selecionarTodosTemasColunas,
    limparTemasColunas,
    getOrdemColunasCoocorrencia,
    definirOrdemColunasCoocorrencia,
    getMinimoAparicoes,
    escapeParaOnclick,
} from './estatisticas-filtros.js';
import {
    montarPainel,
    campoMinimoAparicoes,
    renderFiltrosCompartilhados,
} from './estatisticas-tela-comum.js';
import { seletorPapelTema } from './estatisticas-tela-temas.js';
import { escapeHtml } from './utils.js';
import { db } from './db.js';

function getModoCoocorrencia() {
    const valor = document.getElementById('est-coocorrencia-modo')?.value;
    return ['grupos', 'personagens'].includes(valor) ? valor : 'pessoas';
}

// Rótulos de cada modo da matriz: o eixo das linhas, o nome no plural (para a
// mensagem de matriz vazia) e a regra de contagem que a tela explica.
const MODOS_COOCORRENCIA = {
    pessoas: {
        eixo: 'Pessoa × tema',
        plural: 'pessoas',
        textosCom: 'Textos com a pessoa',
        somaColuna: 'Aparições de pessoas (soma da coluna)',
        descricao: 'Coocorrência = número de textos que possuem simultaneamente a pessoa e o tema.',
    },
    grupos: {
        eixo: 'Grupo × tema',
        plural: 'grupos',
        textosCom: 'Textos com o grupo',
        // Sem soma da coluna: com subgrupo, a mesma pessoa contaria em dobro (F1-D4).
        somaColuna: null,
        descricao:
            'Coocorrência = número de textos que possuem simultaneamente uma pessoa pertencente ao grupo e o tema. Cada grupo conta no máximo uma vez por texto.',
    },
    personagens: {
        eixo: 'Personagem × tema',
        plural: 'personagens',
        textosCom: 'Textos com o personagem',
        somaColuna: 'Aparições de personagens (soma da coluna)',
        descricao:
            'Coocorrência = número de textos que possuem simultaneamente o personagem (em qualquer papel) e o tema.',
    },
};

function seletorColunasCoocorrencia(temasDisponiveis, totalAntesDoCorte) {
    const modo = getModoColunasCoocorrencia();
    const aberto = getPainelColunasCoocorrenciaAberto();
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
        ${
            modo === 'selecionar'
                ? `<button type="button" onclick="definirPainelColunasCoocorrenciaAberto(${!aberto})" class="font-semibold text-blue-600 dark:text-blue-400 hover:underline text-[11px]">🏷️ ${aberto ? 'Recolher lista ▴' : 'Editar seleção ▾'}</button>`
                : ''
        }
        <span class="text-[10px] text-gray-400">${modo === 'selecionar' && !aberto ? `${visiveis.length} de ${total} temas exibidos.` : 'A seleção altera apenas a visualização da matriz.'}</span>
    </div>
    <div id="painel-colunas-coocorrencia" class="${modo === 'selecionar' && aberto ? '' : 'hidden'} mb-3 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
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
    const modo = getModoCoocorrencia();
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
    } else if (modo === 'personagens') {
        const personagens = (db.personagens || []).map((p) => p.nome).filter(Boolean);
        dados = coocorrenciaTemasPersonagens({ temas, personagens });
    } else {
        const pessoas = agregarPorPessoa({ modo: 'pessoa', grupoIds: [] }).labels;
        dados = coocorrenciaTemasPessoas({ temas, pessoas });
    }
    const rotulosModo = MODOS_COOCORRENCIA[modo];
    const linhas = dados[rotulosModo.plural];
    const seletor = seletorColunasCoocorrencia(temasDisponiveis, temasTotalBase.labels.length);
    if (painel) painel.innerHTML = seletor;
    if (!dados.temas.length || !linhas.length) {
        el.innerHTML = `<p class="text-xs text-gray-400">${temas.length ? `Não há ${rotulosModo.plural} com coocorrência nesta visão.` : 'Selecione ao menos um tema para exibir as colunas da matriz.'}</p>`;
        return;
    }
    const header = dados.temas
        .map(
            (t) =>
                `<th class="px-2 py-1.5 text-center text-[10px] font-bold text-gray-500 dark:text-slate-400 whitespace-nowrap">${escapeHtml(t)}</th>`,
        )
        .join('');
    const celulaTotal =
        'px-2 py-1.5 text-center text-xs font-bold border-l border-gray-200 dark:border-slate-700';
    const rows = linhas
        .map((linha, i) => {
            const cells = dados.valores[i]
                .map((v, j) => {
                    const tema = dados.temas[j];
                    const entidade = `${linha} × ${tema}`;
                    return `<td title="${escapeHtml(`${entidade}: ${v} texto(s)`)}" class="px-2 py-1.5 text-center text-xs ${v ? 'font-semibold' : 'text-gray-300 dark:text-slate-600'}">${v || '—'}</td>`;
                })
                .join('');
            const somaLinha = dados.valores[i].reduce((a, b) => a + b, 0);
            return `<tr><th class="px-2 py-1.5 text-left text-xs font-semibold text-gray-600 dark:text-slate-300 whitespace-nowrap">${escapeHtml(linha)}</th>${cells}<td class="${celulaTotal}">${somaLinha}</td><td class="${celulaTotal}">${dados.textosPorLinha[i]}</td></tr>`;
        })
        .join('');
    // Rodapé (Fase 1, etapa 1d): "soma da coluna" conta pares texto × linha;
    // "Textos com o tema" conta cada texto uma vez. Os dois só consideram as
    // linhas e as colunas exibidas.
    const bordaRodape = 'border-t-2 border-gray-300 dark:border-slate-600';
    const rotuloRodape = `px-2 py-1.5 text-left text-xs font-bold text-gray-600 dark:text-slate-300 whitespace-nowrap ${bordaRodape}`;
    const celulaRodape = `px-2 py-1.5 text-center text-xs font-bold ${bordaRodape}`;
    const celulaRodapeVazia = `${celulaRodape} border-l border-gray-200 dark:border-slate-700`;
    const somasColuna = dados.temas.map((_, j) =>
        dados.valores.reduce((acc, linha) => acc + linha[j], 0),
    );
    const totalGeral = somasColuna.reduce((a, b) => a + b, 0);
    const linhaSoma = rotulosModo.somaColuna
        ? `<tr><th class="${rotuloRodape}">${rotulosModo.somaColuna}</th>${somasColuna.map((v) => `<td class="${celulaRodape}">${v}</td>`).join('')}<td class="${celulaRodapeVazia}">${totalGeral}</td><td class="${celulaRodapeVazia}"></td></tr>`
        : '';
    const bordaTextos = rotulosModo.somaColuna ? '' : bordaRodape;
    const rotuloTextos = `px-2 py-1.5 text-left text-xs font-bold text-gray-600 dark:text-slate-300 whitespace-nowrap ${bordaTextos}`;
    const celulaTextos = `px-2 py-1.5 text-center text-xs font-bold ${bordaTextos}`;
    const linhaTextos = `<tr><th class="${rotuloTextos}">Textos com o tema</th>${dados.textosPorTema.map((v) => `<td class="${celulaTextos}">${v}</td>`).join('')}<td class="${celulaTextos} border-l border-gray-200 dark:border-slate-700"></td><td class="${celulaTextos} border-l border-gray-200 dark:border-slate-700"></td></tr>`;
    const cabecalhoTotais = `<th class="px-2 py-1.5 text-center text-[10px] font-bold text-gray-700 dark:text-slate-200 whitespace-nowrap border-l border-gray-200 dark:border-slate-700">Total (soma da linha)</th><th class="px-2 py-1.5 text-center text-[10px] font-bold text-gray-700 dark:text-slate-200 whitespace-nowrap border-l border-gray-200 dark:border-slate-700">${rotulosModo.textosCom}</th>`;
    const { eixo, descricao } = rotulosModo;
    const ajudaTotais = `A soma da linha${rotulosModo.somaColuna ? ' e a da coluna contam' : ' conta'} pares texto × tema: um texto com 3 ${rotulosModo.somaColuna ? rotulosModo.plural : 'pessoas do grupo'} e 1 tema soma 3. Já "${rotulosModo.textosCom}" e "Textos com o tema" contam cada texto uma vez. Os totais consideram só as linhas e as colunas exibidas.${rotulosModo.somaColuna ? '' : ' Não há soma da coluna aqui porque, com subgrupos, a mesma pessoa contaria mais de uma vez.'}`;
    el.innerHTML = `<div class="overflow-x-auto"><table class="w-full border-collapse"><thead><tr><th class="px-2 py-1.5 text-left text-[10px] text-gray-400">${eixo}</th>${header}${cabecalhoTotais}</tr></thead><tbody>${rows}</tbody><tfoot>${linhaSoma}${linhaTextos}</tfoot></table></div><p class="text-[10px] text-gray-400 mt-2">${descricao}</p><p class="text-[10px] text-gray-400 mt-1">${ajudaTotais}</p>`;
}

// Handlers globais usados pela UI da matriz.
window.definirModoColunasCoocorrencia = definirModoColunasCoocorrencia;
window.definirPainelColunasCoocorrenciaAberto = definirPainelColunasCoocorrenciaAberto;
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

export function renderCruzamentos() {
    renderFiltrosCompartilhados();
    montarPainel('painel-papel-tema-cruzamentos', seletorPapelTema());
    renderCoocorrencia();
}
