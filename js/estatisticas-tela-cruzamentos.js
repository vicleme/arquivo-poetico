import {
    agregarPorTema,
    agregarPorPessoa,
    coocorrenciaTemasPessoas,
    coocorrenciaTemasGrupos,
    coocorrenciaTemasPersonagens,
    manterColunasComValor,
    ordenarMatrizCoocorrencia,
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
    getPessoaCoocorrencia,
    definirPessoaCoocorrencia,
    getInverterCoocorrencia,
    definirInverterCoocorrencia,
    getOrdemTabelaCoocorrencia,
    alternarOrdemTabelaCoocorrencia,
    getSoPessoaSozinhaCoocorrencia,
    definirSoPessoaSozinhaCoocorrencia,
    getNaoAnalisadosLigacoes,
    definirNaoAnalisadosLigacoes,
    getPapelTemaEstatisticas,
    ROTULOS_PAPEL_TEMA_ESTATISTICAS,
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
import { renderPainelLigacoes, aoMudarLigacoes } from './ligacoes-tema-pessoa-tela.js';
import { resumoAnaliseLigacoes } from './ligacoes-tema-pessoa.js';

function getModoCoocorrencia() {
    const valor = document.getElementById('est-coocorrencia-modo')?.value;
    return ['grupos', 'personagens'].includes(valor) ? valor : 'pessoas';
}

// Rótulos de cada modo da matriz: o eixo das linhas, o nome no plural (para a
// mensagem de matriz vazia) e a regra de contagem que a tela explica.
const MODOS_COOCORRENCIA = {
    pessoas: {
        eixo: 'Pessoa × tema',
        eixoInvertido: 'Tema × pessoa',
        plural: 'pessoas',
        textosCom: 'Textos com a pessoa',
        somaColuna: 'Aparições de pessoas (soma da coluna)',
        descricao: 'Coocorrência = número de textos que possuem simultaneamente a pessoa e o tema.',
    },
    grupos: {
        eixo: 'Grupo × tema',
        eixoInvertido: 'Tema × grupo',
        plural: 'grupos',
        textosCom: 'Textos com o grupo',
        // Sem soma da coluna: com subgrupo, a mesma pessoa contaria em dobro (F1-D4).
        somaColuna: null,
        descricao:
            'Coocorrência = número de textos que possuem simultaneamente uma pessoa pertencente ao grupo e o tema. Cada grupo conta no máximo uma vez por texto.',
    },
    personagens: {
        eixo: 'Personagem × tema',
        eixoInvertido: 'Tema × personagem',
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
        <label class="text-[10px] uppercase font-bold text-gray-400">${getInverterCoocorrencia() ? 'Linhas (temas)' : 'Colunas'}</label>
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

// Cabeçalho clicável: ordena as linhas da matriz por essa coluna. `campo` é
// 'rotulo', 'total', 'textos' ou 'col' (com `nome` da coluna). A ordem só vale
// na orientação em que foi escolhida: a coluna "Amor" de uma matriz normal não
// é a mesma coisa que a linha "Amor" da invertida.
function ordemAtiva(invertida) {
    const o = getOrdemTabelaCoocorrencia();
    return o && (o.campo !== 'col' || o.invertida === invertida) ? o : null;
}

function thOrdenavel({ rotulo, campo, nome = '', classe, invertida, alinhar = 'center' }) {
    const o = ordemAtiva(invertida);
    const ativo = Boolean(o) && o.campo === campo && (campo !== 'col' || o.nome === nome);
    const sort = ativo ? (o.direcao === 'asc' ? 'ascending' : 'descending') : 'none';
    const arg = campo === 'col' ? `'${campo}', '${escapeParaOnclick(nome)}'` : `'${campo}', ''`;
    const titulo = escapeHtml(`Ordenar por ${rotulo}`);
    return `<th aria-sort="${sort}" class="${classe}"><button type="button" onclick="ordenarTabelaCoocorrencia(${arg})" title="${titulo}" class="th-ordenavel inline-flex items-center gap-1 ${alinhar === 'left' ? 'text-left' : ''} font-bold hover:text-blue-600 dark:hover:text-blue-400 select-none"><span>${escapeHtml(rotulo)}</span></button></th>`;
}

function botaoInverter() {
    const ativo = getInverterCoocorrencia();
    return `<button type="button" onclick="definirInverterCoocorrencia(${!ativo})" title="Troca linhas por colunas" class="px-2 py-1 rounded text-xs font-semibold ${ativo ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300'}">⇄ Inverter linhas e colunas</button>`;
}

// Matriz com os temas nas linhas e pessoas, grupos ou personagens nas colunas.
// A soma da linha (um tema somando todos os grupos) só existe onde existe a
// soma da coluna da matriz normal: com subgrupos a mesma pessoa contaria em dobro.
function tabelaInvertida(dadosBase, linhasBase, rotulosModo) {
    const ordenado = ordenarMatrizCoocorrencia(dadosBase, linhasBase, ordemAtiva(true), true);
    const dados = { ...dadosBase, ...ordenado };
    const linhas = ordenado.linhas;
    const th =
        'px-2 py-1.5 text-center text-[10px] font-bold text-gray-500 dark:text-slate-400 whitespace-nowrap';
    const thTotal =
        'px-2 py-1.5 text-center text-[10px] font-bold text-gray-700 dark:text-slate-200 whitespace-nowrap border-l border-gray-200 dark:border-slate-700';
    const celulaTotal =
        'px-2 py-1.5 text-center text-xs font-bold border-l border-gray-200 dark:border-slate-700';
    const temSomaLinha = Boolean(rotulosModo.somaColuna);
    const header = linhas
        .map((l) => thOrdenavel({ rotulo: l, campo: 'col', nome: l, classe: th, invertida: true }))
        .join('');
    const rows = dados.temas
        .map((tema, j) => {
            const cells = linhas
                .map((linha, i) => {
                    const v = dados.valores[i][j];
                    return `<td title="${escapeHtml(`${linha} × ${tema}: ${v} texto(s)`)}" class="px-2 py-1.5 text-center text-xs ${v ? 'font-semibold' : 'text-gray-300 dark:text-slate-600'}">${v || '—'}</td>`;
                })
                .join('');
            const somaLinha = dados.valores.reduce((acc, linha) => acc + linha[j], 0);
            return `<tr><th class="px-2 py-1.5 text-left text-xs font-semibold text-gray-600 dark:text-slate-300 whitespace-nowrap">${escapeHtml(tema)}</th>${cells}${temSomaLinha ? `<td class="${celulaTotal}">${somaLinha}</td>` : ''}<td class="${celulaTotal}">${dados.textosPorTema[j]}</td></tr>`;
        })
        .join('');
    const borda = 'border-t-2 border-gray-300 dark:border-slate-600';
    const rotulo = `px-2 py-1.5 text-left text-xs font-bold text-gray-600 dark:text-slate-300 whitespace-nowrap ${borda}`;
    const celula = `px-2 py-1.5 text-center text-xs font-bold ${borda}`;
    const celulaVazia = `${celula} border-l border-gray-200 dark:border-slate-700`;
    const somasColuna = dados.valores.map((linha) => linha.reduce((a, b) => a + b, 0));
    const totalGeral = somasColuna.reduce((a, b) => a + b, 0);
    const vaziasFim = `${temSomaLinha ? `<td class="${celulaVazia}"></td>` : ''}<td class="${celulaVazia}"></td>`;
    const linhaSoma = `<tr><th class="${rotulo}">Total (soma da coluna)</th>${somasColuna.map((v) => `<td class="${celula}">${v}</td>`).join('')}${temSomaLinha ? `<td class="${celulaVazia}">${totalGeral}</td>` : ''}<td class="${celulaVazia}"></td></tr>`;
    const linhaTextos = `<tr><th class="px-2 py-1.5 text-left text-xs font-bold text-gray-600 dark:text-slate-300 whitespace-nowrap">${rotulosModo.textosCom}</th>${dados.textosPorLinha.map((v) => `<td class="px-2 py-1.5 text-center text-xs font-bold">${v}</td>`).join('')}${vaziasFim.replaceAll(` ${borda}`, '')}</tr>`;
    const cabecalhoTotais = `${temSomaLinha ? thOrdenavel({ rotulo: 'Total (soma da linha)', campo: 'total', classe: thTotal, invertida: true }) : ''}${thOrdenavel({ rotulo: 'Textos com o tema', campo: 'textos', classe: thTotal, invertida: true })}`;
    const ajuda = `A soma da coluna${temSomaLinha ? ' e a da linha contam' : ' conta'} pares texto × tema: um texto com 3 temas e ${temSomaLinha ? '1 ' + rotulosModo.plural.replace(/s$/, '') : '1 pessoa do grupo'} soma 3. Já "Textos com o tema" e "${rotulosModo.textosCom}" contam cada texto uma vez. Os totais consideram só as linhas e as colunas exibidas.${temSomaLinha ? '' : ' Não há soma da linha aqui porque, com subgrupos, a mesma pessoa contaria mais de uma vez.'}`;
    return `<div class="overflow-x-auto"><table class="w-full border-collapse"><thead><tr>${thOrdenavel({ rotulo: rotulosModo.eixoInvertido, campo: 'rotulo', classe: 'px-2 py-1.5 text-left text-[10px] text-gray-400', invertida: true, alinhar: 'left' })}${header}${cabecalhoTotais}</tr></thead><tbody>${rows}</tbody><tfoot>${linhaSoma}${linhaTextos}</tfoot></table></div><p class="text-[10px] text-gray-400 mt-2">${rotulosModo.descricao}</p><p class="text-[10px] text-gray-400 mt-1">${ajuda}</p>`;
}

function pessoasDaMatriz() {
    return agregarPorPessoa({ modo: 'pessoa', grupoIds: [] }).labels;
}

// A pessoa salva só vale se ainda existe na lista (pode ter sido apagada ou
// ficado fora dos filtros); senão a matriz volta a mostrar todas.
function pessoaEscolhidaNaMatriz(pessoas) {
    const salva = getPessoaCoocorrencia();
    return salva && pessoas.includes(salva) ? salva : '';
}

function seletorPessoa() {
    const pessoas = [...pessoasDaMatriz()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const escolhida = pessoaEscolhidaNaMatriz(pessoas);
    const opcoes = pessoas
        .map(
            (p) =>
                `<option value="${escapeHtml(p)}" ${p === escolhida ? 'selected' : ''}>${escapeHtml(p)}</option>`,
        )
        .join('');
    return `<div class="mb-3 flex flex-wrap items-center gap-2">
        <label for="est-coocorrencia-pessoa" class="text-[10px] uppercase font-bold text-gray-400">Pessoa</label>
        <select id="est-coocorrencia-pessoa" onchange="definirPessoaCoocorrencia(this.value)" style="width:auto;margin:0">
            <option value="" ${escolhida ? '' : 'selected'}>Todas as pessoas</option>
            ${opcoes}
        </select>
        ${
            escolhida
                ? `<label class="flex items-center gap-1 text-xs cursor-pointer">
            <input type="checkbox" id="est-coocorrencia-so-sozinha" ${getSoPessoaSozinhaCoocorrencia() ? 'checked' : ''} onchange="definirSoPessoaSozinhaCoocorrencia(this.checked)">
            Só textos em que ela é a única pessoa
        </label>`
                : ''
        }
        <span class="text-[10px] text-gray-400">${escolhida ? 'Só os temas que se aplicam a esta pessoa viram colunas.' : 'Escolha uma pessoa para ver só os temas dela.'}</span>
    </div>`;
}

// Pessoas e Grupos usam a análise Tema × Pessoa (pares desligados). O que fazer
// com os textos que ainda não foram analisados é escolha da tela; Personagens
// não usa a análise, então o controle some nesse modo.
function seletorNaoAnalisados(modo) {
    if (modo === 'personagens') return '';
    const r = resumoAnaliseLigacoes(db);
    if (!r.total) return '';
    const excluir = getNaoAnalisadosLigacoes() === 'excluir';
    const pendentes = r.pendentes;
    const nota = excluir
        ? `${pendentes} texto(s) com 2 ou mais pessoas e algum tema ainda não analisado(s) ficam fora da matriz.`
        : `Texto ainda não analisado conta o tema para todas as pessoas dele${pendentes ? ` (${pendentes} texto(s) nessa situação)` : ''}.`;
    return `<div class="mb-3 flex flex-wrap items-center gap-2">
        <label for="est-coocorrencia-nao-analisados" class="text-[10px] uppercase font-bold text-gray-400">Textos não analisados</label>
        <select id="est-coocorrencia-nao-analisados" onchange="definirNaoAnalisadosLigacoes(this.value)" style="width:auto;margin:0">
            <option value="contar" ${excluir ? '' : 'selected'}>Contar para todas as pessoas</option>
            <option value="excluir" ${excluir ? 'selected' : ''}>Deixar de fora</option>
        </select>
        <span class="text-[10px] text-gray-400">${nota} Pares desligados na análise nunca contam.</span>
    </div>`;
}

// Calcula a matriz como a tela a mostra (modo, colunas escolhidas, pessoa
// escolhida, ligações), ainda sem a ordem do clique no cabeçalho. Usada pelo
// desenho da tela e pela exportação, para os dois nunca divergirem.
function calcularMatriz() {
    const temasTotalBase = agregarPorTema(['tema']);
    const temasDisponiveis = filtrarPorIntervalo(
        temasTotalBase,
        getMinimoAparicoes('temas') || '',
        '',
    ).labels;
    const modo = getModoCoocorrencia();
    const modoColunas = getModoColunasCoocorrencia();
    const selecionados = new Set(getTemasColunasSelecionados());
    const temas =
        modoColunas === 'todos'
            ? temasDisponiveis
            : temasDisponiveis.filter((t) => selecionados.has(String(t)));
    let dados;
    let pessoaEscolhida = '';
    const ligacoes = { excluirNaoAnalisados: getNaoAnalisadosLigacoes() === 'excluir' };
    if (modo === 'grupos') {
        const grupos = (db.grupos || []).map((g) => g.nome).filter(Boolean);
        dados = coocorrenciaTemasGrupos({ temas, grupos, ligacoes });
    } else if (modo === 'personagens') {
        const personagens = (db.personagens || []).map((p) => p.nome).filter(Boolean);
        dados = coocorrenciaTemasPersonagens({ temas, personagens });
    } else {
        const pessoas = pessoasDaMatriz();
        pessoaEscolhida = pessoaEscolhidaNaMatriz(pessoas);
        dados = coocorrenciaTemasPessoas({
            temas,
            pessoas: pessoaEscolhida ? [pessoaEscolhida] : pessoas,
            soPessoaSozinha: Boolean(pessoaEscolhida) && getSoPessoaSozinhaCoocorrencia(),
            ligacoes,
        });
        // Com uma pessoa escolhida, só ficam as colunas dos temas dela.
        if (pessoaEscolhida) dados = manterColunasComValor(dados);
    }
    return { modo, dados, temas, temasDisponiveis, temasTotalBase, pessoaEscolhida };
}

// A matriz que a tela mostra agora, já na ordem escolhida, no formato que
// `exportar-cruzamentos.js` espera.
export function matrizParaExportar() {
    const { modo, dados, pessoaEscolhida } = calcularMatriz();
    const rotulosModo = MODOS_COOCORRENCIA[modo];
    const invertida = getInverterCoocorrencia();
    const ordem = ordemAtiva(invertida);
    const ordenado = ordenarMatrizCoocorrencia(dados, dados[rotulosModo.plural], ordem, invertida);
    return {
        modo,
        invertida,
        rotulosModo,
        dados: { ...dados, ...ordenado },
        linhas: ordenado.linhas,
        contexto: {
            papelTema: ROTULOS_PAPEL_TEMA_ESTATISTICAS[getPapelTemaEstatisticas()],
            pessoa: pessoaEscolhida,
            soPessoaSozinha: Boolean(pessoaEscolhida) && getSoPessoaSozinhaCoocorrencia(),
            naoAnalisados: modo === 'personagens' ? null : getNaoAnalisadosLigacoes(),
            ordem,
        },
    };
}

function renderCoocorrencia() {
    const el = document.getElementById('tabela-coocorrencia');
    const painel = document.getElementById('painel-colunas-coocorrencia');
    if (!el) return;
    const calculada = calcularMatriz();
    const { modo, temasDisponiveis, temasTotalBase, temas } = calculada;
    let { dados } = calculada;
    const rotulosModo = MODOS_COOCORRENCIA[modo];
    let linhas = dados[rotulosModo.plural];
    const seletor = seletorColunasCoocorrencia(temasDisponiveis, temasTotalBase.labels.length);
    if (painel) painel.innerHTML = seletor;
    montarPainel(
        'painel-pessoa-coocorrencia',
        (modo === 'pessoas' ? seletorPessoa() : '') + seletorNaoAnalisados(modo),
    );
    montarPainel('painel-inverter-coocorrencia', botaoInverter());
    if (!dados.temas.length || !linhas.length) {
        const escolhida = modo === 'pessoas' ? pessoaEscolhidaNaMatriz(pessoasDaMatriz()) : '';
        const vazio = escolhida
            ? `Nenhum tema aplicado a ${escapeHtml(escolhida)} nesta visão.`
            : temas.length
              ? `Não há ${rotulosModo.plural} com coocorrência nesta visão.`
              : 'Selecione ao menos um tema para exibir as colunas da matriz.';
        el.innerHTML = `<p class="text-xs text-gray-400">${vazio}</p>`;
        return;
    }
    if (getInverterCoocorrencia()) {
        el.innerHTML = tabelaInvertida(dados, linhas, rotulosModo);
        return;
    }
    const ordenado = ordenarMatrizCoocorrencia(dados, linhas, ordemAtiva(false), false);
    dados = { ...dados, ...ordenado };
    linhas = ordenado.linhas;
    const thTema =
        'px-2 py-1.5 text-center text-[10px] font-bold text-gray-500 dark:text-slate-400 whitespace-nowrap';
    const header = dados.temas
        .map((t) =>
            thOrdenavel({ rotulo: t, campo: 'col', nome: t, classe: thTema, invertida: false }),
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
    const classeTotal =
        'px-2 py-1.5 text-center text-[10px] font-bold text-gray-700 dark:text-slate-200 whitespace-nowrap border-l border-gray-200 dark:border-slate-700';
    const cabecalhoTotais = `${thOrdenavel({ rotulo: 'Total (soma da linha)', campo: 'total', classe: classeTotal, invertida: false })}${thOrdenavel({ rotulo: rotulosModo.textosCom, campo: 'textos', classe: classeTotal, invertida: false })}`;
    const { eixo, descricao } = rotulosModo;
    const ajudaTotais = `A soma da linha${rotulosModo.somaColuna ? ' e a da coluna contam' : ' conta'} pares texto × tema: um texto com 3 ${rotulosModo.somaColuna ? rotulosModo.plural : 'pessoas do grupo'} e 1 tema soma 3. Já "${rotulosModo.textosCom}" e "Textos com o tema" contam cada texto uma vez. Os totais consideram só as linhas e as colunas exibidas.${rotulosModo.somaColuna ? '' : ' Não há soma da coluna aqui porque, com subgrupos, a mesma pessoa contaria mais de uma vez.'}`;
    el.innerHTML = `<div class="overflow-x-auto"><table class="w-full border-collapse"><thead><tr>${thOrdenavel({ rotulo: eixo, campo: 'rotulo', classe: 'px-2 py-1.5 text-left text-[10px] text-gray-400', invertida: false, alinhar: 'left' })}${header}${cabecalhoTotais}</tr></thead><tbody>${rows}</tbody><tfoot>${linhaSoma}${linhaTextos}</tfoot></table></div><p class="text-[10px] text-gray-400 mt-2">${descricao}</p><p class="text-[10px] text-gray-400 mt-1">${ajudaTotais}</p>`;
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
window.definirPessoaCoocorrencia = definirPessoaCoocorrencia;
window.definirInverterCoocorrencia = definirInverterCoocorrencia;
window.ordenarTabelaCoocorrencia = (campo, nome) =>
    alternarOrdemTabelaCoocorrencia(campo, nome, getInverterCoocorrencia());
window.definirSoPessoaSozinhaCoocorrencia = definirSoPessoaSozinhaCoocorrencia;
window.definirNaoAnalisadosLigacoes = definirNaoAnalisadosLigacoes;
// Salvar uma análise na tela de ligações muda a matriz: redesenha-a também.
aoMudarLigacoes(renderCoocorrencia);
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
    renderPainelLigacoes();
}
