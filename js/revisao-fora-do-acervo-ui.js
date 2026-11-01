// ============================================================
// revisao-fora-do-acervo-ui.js: a tela do "Modo revisão" da seção "Fora do
// acervo" da aba Conexões (T9). Uma tabela com uma linha por entrada de
// Intertextualidade ou de Hipertextualidade, cada valor editável na própria
// célula. A lógica (linhas, filtro, plano, gravação) fica em
// `revisao-fora-do-acervo.js`; aqui ficam a tabela, o filtro, o seletor de
// colunas (o mesmo sistema das outras tabelas, chave 'revisao-fora' em
// `colunas.js`), a confirmação, o backup forçado antes de gravar e o Desfazer.
//
// Fluxo: o botão "Modo revisão" troca as listas pela tabela → cada célula
// alterada vira uma edição pendente (só em memória, nada é gravado) →
// "Revisar e gravar" planeja, mostra a confirmação, tira um snapshot (se
// falhar, nada é gravado), planeja de novo, aplica, salva, redesenha e
// oferece "Desfazer".
//
// Colunas escondidas continuam entrando na busca. Personagem, trecho e
// traduzido não existem na Hipertextualidade: nessas linhas a célula fica
// desabilitada. O link novo numa linha sem data de acesso recebe a data de
// hoje, e apagar o link apaga a data (a mesma regra do modal do texto).
//
// Autor e Personagem em lista: a célula é um campo de tags (Enter, vírgula ou
// sair do campo confirma a tag; o × e o Backspace com o campo vazio tiram).
// A edição pendente guarda a lista em `valores.autores` e `valores.personagens`. Valores pendentes e
// valores da linha são comparados por VALOR (`valoresIguais`), nunca por
// referência: a tabela gera listas novas a cada redesenho, e comparar por
// referência descartaria a edição pendente.
// ============================================================

import { db, save } from './db.js';
import { tirarSnapshotSeNecessario } from './autobackup.js';
import {
    abrirModalConfirmacao,
    mostrarAviso,
    mostrarAvisoComAcao,
    escapeHtml,
    hojeIso,
} from './utils.js';
import { getColunasAtivas, renderSeletorColunas, DEFINICAO_COLUNAS } from './colunas.js';
import {
    listarLinhasRevisao,
    filtrarLinhasRevisao,
    PREFIXO_DA_COLUNA,
    PREFIXOS_BUSCA_REVISAO,
    sugestoesDaRevisao,
    planejarRevisao,
    aplicarRevisao,
    descreverRevisao,
    valorAplica,
    VALORES_REVISAO,
    VALORES_BOOLEANOS_REVISAO,
    FILTRO_AUTOR_VARIOS_NOMES,
    MENSAGENS_ERRO_REVISAO,
} from './revisao-fora-do-acervo.js';
import { normalizarAutores, mesmaListaDeAutores } from './autores-da-obra.js';
import { MENSAGENS_ERRO_DATA_OBRA } from './data-da-obra.js';
import { renderForaDoAcervo } from './render-fora-do-acervo.js';
import {
    atualizarSugestoesBuscaRevisao,
    initSugestoesBuscaRevisao,
} from './ui-sugestoes-busca-revisao.js';
import {
    atualizarBarraMassa,
    htmlBarraMassa,
    lerOperacaoDaBarra,
    mensagemDeErroDaMassa,
    pedirEdicaoEmMassa,
} from './revisao-massa-fora-do-acervo-ui.js';

const TABELA = 'revisao-fora';
const POR_PAGINA = 50;
const ID_RAIZ = 'conexoes-revisao';

// Estado da tela. Só em memória: as edições pendentes não sobrevivem a um F5.
let ativo = false;
let consulta = '';
let campoFiltro = '';
let faltando = '';
let pagina = 0;
// chave da linha → { valores: só o que mudou, base: valores da linha quando a
// primeira edição foi feita }. A base serve para descartar a edição se o dado
// mudou por outro caminho (as chaves dependem da posição da entrada).
const pendentes = new Map();
// Chaves das linhas marcadas para a edição em massa (só em memória). Fica sempre
// dentro do que o filtro mostra: mudar a busca ou o filtro solta as que saíram.
const selecionadas = new Set();
let linhasTodas = [];
let porChave = new Map();

const entrada = () => ({ poemas: db.poemas, prosas: db.prosas });
const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;
const el = (id) => document.getElementById(id);

export function modoRevisaoAtivo() {
    return ativo;
}

// ─── Edições pendentes ───────────────────────────────────────

// Listas de autor valem pela ordem e pela grafia; os demais valores, por ===.
function valoresIguais(a, b) {
    if (Array.isArray(a) || Array.isArray(b)) {
        return Array.isArray(a) && Array.isArray(b) && mesmaListaDeAutores(a, b);
    }
    return a === b;
}

function valorEfetivo(chave, v) {
    const p = pendentes.get(chave);
    if (p && v in p.valores) return p.valores[v];
    return porChave.get(chave)?.valores[v];
}

// Define (ou desfaz, se voltou ao original) um valor pendente de uma linha.
function definirPendente(chave, v, valor) {
    const linha = porChave.get(chave);
    if (!linha) return;
    let p = pendentes.get(chave);
    if (!p) p = { valores: {}, base: { ...linha.valores } };
    if (valoresIguais(valor, linha.valores[v])) delete p.valores[v];
    else p.valores[v] = valor;
    if (Object.keys(p.valores).length) pendentes.set(chave, p);
    else pendentes.delete(chave);
}

// Registra a edição de uma célula e as consequências da regra do link.
function registrarEdicao(chave, v, bruto) {
    const linha = porChave.get(chave);
    if (!linha || !valorAplica(linha.campo, v)) return;
    let valor;
    if (v === 'autores' || v === 'personagens' || v === 'origens')
        valor = normalizarAutores(Array.isArray(bruto) ? bruto : [bruto]);
    else
        valor = VALORES_BOOLEANOS_REVISAO.includes(v) ? Boolean(bruto) : String(bruto ?? '').trim();
    definirPendente(chave, v, valor);
    if (v === 'link') {
        if (!valor) definirPendente(chave, 'dataAcesso', '');
        else if (!valorEfetivo(chave, 'dataAcesso'))
            definirPendente(chave, 'dataAcesso', hojeIso());
    }
    atualizarLinha(chave);
    atualizarResumo();
}

function podarPendentes() {
    let podadas = 0;
    for (const [chave, p] of [...pendentes]) {
        const linha = porChave.get(chave);
        const igual =
            linha && Object.keys(p.base).every((v) => valoresIguais(linha.valores[v], p.base[v]));
        if (!igual) {
            pendentes.delete(chave);
            podadas += 1;
        }
    }
    return podadas;
}

function montarEdicoes() {
    return [...pendentes].map(([chave, p]) => ({ chave, valores: { ...p.valores } }));
}

// ─── Barra e esqueleto ───────────────────────────────────────

const CLASSE_CONTROLE =
    'px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100';
const CLASSE_BOTAO =
    'px-3 py-1.5 text-sm font-semibold rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed';

const OPCOES_FALTANDO = [
    ['', 'Todas as linhas'],
    ['relacao', 'Sem relação'],
    ['nome', 'Sem obra'],
    ['autor', 'Sem autor'],
    ['origem', 'Sem origem'],
    [FILTRO_AUTOR_VARIOS_NOMES, 'Autor parece ter mais de um nome'],
    ['tipoObra', 'Sem tipo de obra'],
    ['descricao', 'Sem descrição'],
    ['dataObra', 'Sem data da obra'],
    ['personagem', 'Sem personagem'],
    ['trecho', 'Sem trecho'],
    ['link', 'Sem link'],
    ['nota', 'Sem nota'],
];

function montarEsqueleto(raiz) {
    const opcoesFaltando = OPCOES_FALTANDO.map(
        ([valor, rotulo]) =>
            `<option value="${valor}"${valor === faltando ? ' selected' : ''}>${escapeHtml(rotulo)}</option>`,
    ).join('');
    const opcoesCampo = [
        ['', 'Intertextualidade e Hipertextualidade'],
        ['intertextualidade', 'Só Intertextualidade'],
        ['hipertextualidade', 'Só Hipertextualidade'],
    ]
        .map(
            ([valor, rotulo]) =>
                `<option value="${valor}"${valor === campoFiltro ? ' selected' : ''}>${escapeHtml(rotulo)}</option>`,
        )
        .join('');
    raiz.innerHTML = `
    <p class="text-xs text-gray-500 dark:text-slate-400 mb-3">
        Uma linha por entrada de Intertextualidade ou de Hipertextualidade, em Poemas e Prosas.
        Edite as células e use "Revisar e gravar": nada é gravado antes disso. A busca também
        olha as colunas escondidas. Para corrigir uma obra ou um autor em todos os textos de uma
        vez, volte às listas.
    </p>
    <details id="revisao-ajuda-busca" class="mb-2 text-xs text-gray-600 dark:text-slate-300">
        <summary class="cursor-pointer select-none font-semibold">Como buscar nas linhas</summary>
        <div class="mt-1 space-y-1">
            <p>Termos soltos valem para todas as colunas e se somam (E). Use <code>ou</code> para alternativas, aspas para frase exata e <code>-termo</code> para excluir. Acento e caixa não importam.</p>
            <p>Para olhar uma coluna só, escreva <code>campo:valor</code> (ou clique na 🔍 do cabeçalho). Prefixos: ${PREFIXOS_BUSCA_REVISAO.map((p) => `<code>${p}:</code>`).join(' ')}. Com <code>campo:*</code> a coluna precisa estar preenchida; <code>-origem:*</code> deixa só as linhas sem origem.</p>
            <p>Exemplos: <code>tipo:Mitologia -origem:*</code>, <code>autor:Homero ou autor:Ovídio</code>, <code>data:1922</code>.</p>
        </div>
    </details>
    <div class="flex flex-wrap items-end gap-3 mb-3">
        <div class="relative w-full md:w-80">
            <label for="revisao-busca" class="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Buscar nas linhas</label>
            <input id="revisao-busca" type="search" autocomplete="off" value="${escapeHtml(consulta)}"
                placeholder='Título, obra, autor... (campo:valor, -termo exclui, "frase", ou)'
                class="w-full ${CLASSE_CONTROLE}" />
            <div id="revisao-sugestoes" role="listbox"
                class="hidden absolute left-0 right-0 top-full mt-1 max-h-64 overflow-y-auto z-30 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg"></div>
        </div>
        <div>
            <label for="revisao-campo" class="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Campo</label>
            <select id="revisao-campo" class="${CLASSE_CONTROLE}">${opcoesCampo}</select>
        </div>
        <div>
            <label for="revisao-faltando" class="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Por preencher</label>
            <select id="revisao-faltando" class="${CLASSE_CONTROLE}">${opcoesFaltando}</select>
        </div>
        <div class="relative">
            <button type="button" onclick="togglePainel('painel-colunas-revisao-fora', this)"
                class="${CLASSE_BOTAO}">Colunas ▾</button>
            <div id="painel-colunas-revisao-fora"
                class="hidden absolute left-0 top-full mt-1 z-20 w-[min(92vw,44rem)] max-h-[55vh] overflow-y-auto bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg"></div>
        </div>
    </div>
    <div class="flex flex-wrap items-center gap-3 mb-3">
        <button type="button" data-rev-acao="gravar" class="px-3 py-1.5 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed" disabled>Revisar e gravar</button>
        <button type="button" data-rev-acao="descartar" class="${CLASSE_BOTAO}" disabled>Descartar alterações</button>
        <span id="revisao-resumo" class="text-xs text-gray-500 dark:text-slate-400" aria-live="polite"></span>
    </div>
    ${htmlBarraMassa()}
    <div id="revisao-tabela"></div>
    <div id="revisao-listas-sugestoes"></div>`;
    raiz.dataset.pronto = '1';
    initSugestoesBuscaRevisao({
        linhas: () => linhasTodas,
        mudou: (valor) => {
            consulta = valor;
            pagina = 0;
            renderizarTabela();
        },
    });
}

function atualizarResumo() {
    const raiz = el(ID_RAIZ);
    if (!raiz) return;
    const n = pendentes.size;
    const resumo = el('revisao-resumo');
    if (resumo) {
        resumo.textContent = n
            ? `${plural(n, 'linha alterada', 'linhas alteradas')}, ainda não gravada${n === 1 ? '' : 's'}.`
            : 'Nenhuma alteração pendente.';
    }
    raiz.querySelectorAll('[data-rev-acao="gravar"], [data-rev-acao="descartar"]').forEach((b) => {
        b.disabled = n === 0;
    });
}

// ─── Tabela ──────────────────────────────────────────────────

const CLASSE_CELULA =
    'w-full px-2 py-1 text-xs rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100 disabled:opacity-40 disabled:bg-gray-100 dark:disabled:bg-slate-800';
const CLASSE_LINHA_ALTERADA = ['bg-amber-50', 'dark:bg-amber-950/30'];

const LISTA_DA_COLUNA = {
    nome: 'rev-dl-nome',
    autor: 'rev-dl-autor',
    tipoObra: 'rev-dl-tipo',
    personagem: 'rev-dl-personagem',
    origem: 'rev-dl-origem',
};
const LARGURA_DA_COLUNA = {
    campo: 'min-w-[9rem]',
    relacao: 'min-w-[9rem]',
    nome: 'min-w-[14rem]',
    autor: 'min-w-[11rem]',
    origem: 'min-w-[10rem]',
    tipoObra: 'min-w-[8rem]',
    descricao: 'min-w-[16rem]',
    dataObra: 'min-w-[10rem]',
    dataObraAte: 'min-w-[10rem]',
    obraPessoal: 'min-w-[5rem]',
    personagem: 'min-w-[10rem]',
    trecho: 'min-w-[16rem]',
    traduzido: 'min-w-[5rem]',
    link: 'min-w-[14rem]',
    linkTexto: 'min-w-[10rem]',
    dataAcesso: 'min-w-[9rem]',
    nota: 'min-w-[14rem]',
};
const TEXTAREAS = ['descricao', 'trecho', 'nota'];

// A lupa do cabeçalho: põe o prefixo da coluna (`origem:`) no fim da busca.
function htmlLupa(coluna) {
    const prefixo = PREFIXO_DA_COLUNA[coluna];
    if (!prefixo) return '';
    return ` <button type="button" data-rev-acao="lupa" data-rev-prefixo="${prefixo}" title="Buscar por ${prefixo}:" aria-label="Buscar por ${prefixo}:" class="normal-case font-normal text-gray-300 dark:text-slate-600 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer">🔍</button>`;
}

// Acrescenta `prefixo:` à busca (com um espaço antes, se já há texto) e deixa o
// cursor logo depois, para a pessoa digitar o valor.
export function buscarPorPrefixoNaRevisao(prefixo) {
    const campo = el('revisao-busca');
    if (!campo || !prefixo) return;
    const atual = campo.value;
    const separador = atual && !/\s$/.test(atual) ? ' ' : '';
    consulta = `${atual}${separador}${prefixo}:`;
    campo.value = consulta;
    pagina = 0;
    renderizarTabela();
    campo.focus();
    campo.setSelectionRange?.(consulta.length, consulta.length);
    atualizarSugestoesBuscaRevisao();
}

function rotuloDaColuna(key) {
    return DEFINICAO_COLUNAS[TABELA].find((c) => c.key === key)?.label || key;
}

// A mensagem de uma recusa do plano. Na data que não vale, diz qual coluna e o
// motivo (`erroData`); o texto de `texto-invalido` já traz exemplos.
export function mensagemDeErroDaRevisao(plano) {
    if (plano?.erro === 'data-obra-invalida') {
        const coluna = plano.valorComErro ? rotuloDaColuna(plano.valorComErro) : 'Data da obra';
        const motivo = MENSAGENS_ERRO_DATA_OBRA[plano.erroData];
        return motivo ? `${coluna}: ${motivo}` : MENSAGENS_ERRO_REVISAO['data-obra-invalida'];
    }
    return MENSAGENS_ERRO_REVISAO[plano?.erro] || 'Não foi possível gravar.';
}

function listaDaCelula(linha, v) {
    if (v === 'relacao') {
        return linha.campo === 'intertextualidade'
            ? 'rev-dl-relacao-inter'
            : 'rev-dl-relacao-hiper';
    }
    return LISTA_DA_COLUNA[v] || '';
}

function celulaTitulo(linha) {
    // Abre o Ver com Anterior/Próximo pelos textos da página (a tabela leva
    // `data-lista-textos`).
    const tipoDaLinha = linha.tipo === 'prosa' ? 'prosa' : 'poema';
    const marca =
        linha.tipo === 'prosa'
            ? ' <span class="inline-block px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 text-[10px] font-bold uppercase align-middle">prosa</span>'
            : '';
    const marcada = selecionadas.has(linha.chave) ? ' checked' : '';
    const caixa = `<input type="checkbox" data-rev-sel="${escapeHtml(linha.chave)}" aria-label="Selecionar esta linha" class="mr-2 align-middle"${marcada} />`;
    return `<td class="p-2 align-top min-w-[11rem]">${caixa}<span class="cursor-pointer hover:underline text-xs font-semibold" data-action="ver-texto-da-lista" data-tipo="${tipoDaLinha}" data-id="${escapeHtml(String(linha.id))}">${escapeHtml(linha.titulo)}</span>${marca}</td>`;
}

function celulaCampo(linha) {
    const cor =
        linha.campo === 'intertextualidade'
            ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
            : 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300';
    return `<td class="p-2 align-top ${LARGURA_DA_COLUNA.campo}"><span class="inline-block px-1.5 py-0.5 rounded ${cor} text-[10px] font-bold uppercase">${escapeHtml(linha.rotuloCampo)}</span></td>`;
}

const CLASSE_CHIP =
    'inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px]';

// As duas colunas de tags: o que muda de uma para a outra é a lista que a
// pendência guarda e os atributos `data-rev-<atributo>-input|chips|remover|chave`.
const TAGS_DA_REVISAO = {
    autores: { atributo: 'autor', rotulo: 'autor' },
    personagens: { atributo: 'personagem', rotulo: 'personagem' },
    origens: { atributo: 'origem', rotulo: 'origem' },
};

// Os chips de uma linha; `lista` é 'autores' ou 'personagens'.
function htmlChips(chave, lista) {
    const { atributo, rotulo } = TAGS_DA_REVISAO[lista];
    return (valorEfetivo(chave, lista) || [])
        .map(
            (nome, i) =>
                `<span class="${CLASSE_CHIP}">${escapeHtml(nome)}<button type="button" data-rev-${atributo}-remover="${i}" data-rev-${atributo}-chave="${escapeHtml(chave)}" title="Remover ${rotulo}" aria-label="Remover ${escapeHtml(nome)}" class="text-red-400 hover:text-red-600 dark:hover:text-red-400 font-bold px-0.5">×</button></span>`,
        )
        .join('');
}

function htmlChipsAutor(chave) {
    return htmlChips(chave, 'autores');
}

function celulaAutor(linha) {
    const chave = escapeHtml(linha.chave);
    const rotulo = `Autores de ${linha.titulo}`;
    return `<td class="p-2 align-top ${LARGURA_DA_COLUNA.autor}"><div data-rev-autor-chips="${chave}" class="flex flex-wrap gap-1 mb-1 empty:hidden">${htmlChipsAutor(linha.chave)}</div><input type="text" autocomplete="off" list="rev-dl-autor" placeholder="Autor" data-rev-autor-input="${chave}" aria-label="${escapeHtml(rotulo)}" class="${CLASSE_CELULA}" /></td>`;
}

function celulaOrigem(linha) {
    const chave = escapeHtml(linha.chave);
    const rotulo = `Origem de ${linha.titulo}`;
    return `<td class="p-2 align-top ${LARGURA_DA_COLUNA.origem}"><div data-rev-origem-chips="${chave}" class="flex flex-wrap gap-1 mb-1 empty:hidden">${htmlChips(linha.chave, 'origens')}</div><input type="text" autocomplete="off" list="rev-dl-origem" placeholder="Origem" data-rev-origem-input="${chave}" aria-label="${escapeHtml(rotulo)}" class="${CLASSE_CELULA}" /></td>`;
}

function celulaPersonagem(linha) {
    const chave = escapeHtml(linha.chave);
    const rotulo = `Personagens de ${linha.titulo}`;
    return `<td class="p-2 align-top ${LARGURA_DA_COLUNA.personagem}"><div data-rev-personagem-chips="${chave}" class="flex flex-wrap gap-1 mb-1 empty:hidden">${htmlChips(linha.chave, 'personagens')}</div><input type="text" autocomplete="off" list="rev-dl-personagem" placeholder="Personagem" data-rev-personagem-input="${chave}" aria-label="${escapeHtml(rotulo)}" class="${CLASSE_CELULA}" /></td>`;
}

function celulaEditavel(linha, v) {
    if (v === 'autor') return celulaAutor(linha);
    if (v === 'origem') return celulaOrigem(linha);
    if (v === 'personagem' && valorAplica(linha.campo, v)) return celulaPersonagem(linha);
    const largura = LARGURA_DA_COLUNA[v] || '';
    const rotulo = `${rotuloDaColuna(v)} de ${linha.titulo}`;
    if (!valorAplica(linha.campo, v)) {
        const caixa = VALORES_BOOLEANOS_REVISAO.includes(v);
        return `<td class="p-2 align-top ${largura}"><input type="${caixa ? 'checkbox' : 'text'}" disabled title="Não existe em Hipertextualidade" aria-label="${escapeHtml(rotulo)} (não existe em Hipertextualidade)" class="${caixa ? '' : CLASSE_CELULA}" /></td>`;
    }
    const chave = escapeHtml(linha.chave);
    const atributos = `data-rev-chave="${chave}" data-rev-valor="${v}" aria-label="${escapeHtml(rotulo)}"`;
    const valor = valorEfetivo(linha.chave, v);
    if (VALORES_BOOLEANOS_REVISAO.includes(v)) {
        return `<td class="p-2 align-top text-center ${largura}"><input type="checkbox" ${valor ? 'checked' : ''} ${atributos} /></td>`;
    }
    if (TEXTAREAS.includes(v)) {
        return `<td class="p-2 align-top ${largura}"><textarea rows="2" ${atributos} class="${CLASSE_CELULA} resize-y">${escapeHtml(valor || '')}</textarea></td>`;
    }
    if (v === 'dataAcesso') {
        const semLink = !valorEfetivo(linha.chave, 'link');
        return `<td class="p-2 align-top ${largura}"><input type="date" value="${escapeHtml(valor || '')}" ${semLink ? 'disabled title="Escreva o link primeiro"' : ''} ${atributos} class="${CLASSE_CELULA}" /></td>`;
    }
    const lista = listaDaCelula(linha, v);
    return `<td class="p-2 align-top ${largura}"><input type="text" autocomplete="off" value="${escapeHtml(valor || '')}" ${lista ? `list="${lista}"` : ''} ${atributos} class="${CLASSE_CELULA}" /></td>`;
}

function htmlLinha(linha, colunas) {
    const alterada = pendentes.has(linha.chave);
    const celulas = colunas
        .map((key) => (key === 'campo' ? celulaCampo(linha) : celulaEditavel(linha, key)))
        .join('');
    return `<tr data-rev-linha="${escapeHtml(linha.chave)}" class="border-b border-gray-100 dark:border-slate-800 ${alterada ? CLASSE_LINHA_ALTERADA.join(' ') : ''}">${celulaTitulo(linha)}${celulas}</tr>`;
}

function htmlDatalists(sugestoes) {
    const lista = (id, valores) =>
        `<datalist id="${id}">${valores.map((v) => `<option value="${escapeHtml(v)}"></option>`).join('')}</datalist>`;
    return [
        lista('rev-dl-relacao-inter', sugestoes.relacaoIntertextualidade),
        lista('rev-dl-relacao-hiper', sugestoes.relacaoHipertextualidade),
        lista('rev-dl-tipo', sugestoes.tipoObra),
        lista('rev-dl-autor', sugestoes.autor),
        lista('rev-dl-nome', sugestoes.nome),
        lista('rev-dl-origem', sugestoes.origem),
        lista('rev-dl-personagem', sugestoes.personagem),
    ].join('');
}

function linhasFiltradas() {
    return filtrarLinhasRevisao(linhasTodas, consulta, { campo: campoFiltro, faltando });
}

function htmlPaginacao(total, de, ate, paginas) {
    if (total <= POR_PAGINA) {
        return `<p class="text-[11px] text-gray-400 dark:text-slate-500 mt-2">${plural(total, 'linha', 'linhas')}.</p>`;
    }
    return `
    <div class="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-500 dark:text-slate-400">
        <button type="button" data-rev-acao="anterior" class="${CLASSE_BOTAO}" ${pagina === 0 ? 'disabled' : ''}>Anterior</button>
        <span>Linhas ${de} a ${ate} de ${total} (página ${pagina + 1} de ${paginas})</span>
        <button type="button" data-rev-acao="proxima" class="${CLASSE_BOTAO}" ${pagina >= paginas - 1 ? 'disabled' : ''}>Próxima</button>
    </div>`;
}

function renderizarTabela() {
    const alvo = el('revisao-tabela');
    if (!alvo) return;
    const filtradas = linhasFiltradas();
    const visiveisNoFiltro = new Set(filtradas.map((l) => l.chave));
    [...selecionadas].forEach((c) => {
        if (!visiveisNoFiltro.has(c)) selecionadas.delete(c);
    });
    atualizarBarraMassa(el(ID_RAIZ), filtradas.length, selecionadas.size);
    const paginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
    pagina = Math.min(Math.max(0, pagina), paginas - 1);

    const painel = el('painel-colunas-revisao-fora');
    if (painel) painel.innerHTML = renderSeletorColunas(TABELA);
    const sugestoes = el('revisao-listas-sugestoes');
    if (sugestoes) sugestoes.innerHTML = htmlDatalists(sugestoesDaRevisao(linhasTodas));

    if (!linhasTodas.length) {
        alvo.innerHTML =
            '<p class="text-sm text-gray-400 dark:text-slate-500">Nenhuma entrada de Intertextualidade ou de Hipertextualidade cadastrada.</p>';
        atualizarResumo();
        return;
    }
    if (!filtradas.length) {
        alvo.innerHTML =
            '<p class="text-sm text-gray-400 dark:text-slate-500">Nenhuma linha combina com a busca.</p>';
        atualizarResumo();
        return;
    }

    const colunas = getColunasAtivas(TABELA);
    const inicio = pagina * POR_PAGINA;
    const visiveis = filtradas.slice(inicio, inicio + POR_PAGINA);
    const cabecalho = [
        '<th class="p-2 min-w-[11rem]"><input type="checkbox" id="revisao-sel-todas" aria-label="Selecionar todas as linhas do filtro" class="mr-2 align-middle" />Texto' +
            htmlLupa('titulo') +
            '</th>',
        ...colunas.map(
            (key) =>
                `<th class="p-2 ${LARGURA_DA_COLUNA[key] || ''}">${escapeHtml(rotuloDaColuna(key))}${htmlLupa(key)}</th>`,
        ),
    ].join('');
    alvo.innerHTML = `
    <div data-lista-textos data-rotulo="Modo revisão" class="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <table class="min-w-full text-left">
            <thead class="text-[11px] uppercase tracking-wider text-gray-500 dark:text-slate-400 border-b border-gray-200 dark:border-slate-700">
                <tr>${cabecalho}</tr>
            </thead>
            <tbody>${visiveis.map((l) => htmlLinha(l, colunas)).join('')}</tbody>
        </table>
    </div>
    ${htmlPaginacao(filtradas.length, inicio + 1, inicio + visiveis.length, paginas)}`;
    atualizarResumo();
    sincronizarSelecao(filtradas.length);
}

// Mostra a seleção na tela sem redesenhar a tabela: as caixinhas, a do
// cabeçalho (marcada ou "no meio") e o botão da barra de edição em massa.
function sincronizarSelecao(totalFiltradas = linhasFiltradas().length) {
    const raiz = el(ID_RAIZ);
    if (!raiz) return;
    raiz.querySelectorAll('[data-rev-sel]').forEach((c) => {
        c.checked = selecionadas.has(c.dataset.revSel);
    });
    const todas = el('revisao-sel-todas');
    if (todas) {
        todas.checked = totalFiltradas > 0 && selecionadas.size === totalFiltradas;
        todas.indeterminate = selecionadas.size > 0 && selecionadas.size < totalFiltradas;
    }
    atualizarBarraMassa(raiz, totalFiltradas, selecionadas.size);
}

// Atualiza só a linha editada (cor de fundo e a data de acesso), sem redesenhar
// a tabela, para o cursor não sair da célula.
function atualizarLinha(chave) {
    const raiz = el(ID_RAIZ);
    if (!raiz) return;
    const tr = [...raiz.querySelectorAll('[data-rev-linha]')].find(
        (t) => t.dataset.revLinha === chave,
    );
    if (!tr) return;
    CLASSE_LINHA_ALTERADA.forEach((c) => tr.classList.toggle(c, pendentes.has(chave)));
    const chips = tr.querySelector('[data-rev-autor-chips]');
    if (chips) chips.innerHTML = htmlChips(chave, 'autores');
    const chipsOrigem = tr.querySelector('[data-rev-origem-chips]');
    if (chipsOrigem) chipsOrigem.innerHTML = htmlChips(chave, 'origens');
    const chipsPersonagem = tr.querySelector('[data-rev-personagem-chips]');
    if (chipsPersonagem) chipsPersonagem.innerHTML = htmlChips(chave, 'personagens');
    const data = [...tr.querySelectorAll('[data-rev-valor="dataAcesso"]')][0];
    if (data) {
        const link = valorEfetivo(chave, 'link');
        data.disabled = !link;
        if (link) data.removeAttribute('title');
        else data.title = 'Escreva o link primeiro';
        data.value = valorEfetivo(chave, 'dataAcesso') || '';
    }
}

// Redesenha tudo (as linhas vêm do dado de agora). Usado ao abrir, quando a
// seção é redesenhada e depois de gravar ou desfazer.
function renderizarRevisao() {
    const raiz = el(ID_RAIZ);
    if (!raiz) return;
    linhasTodas = listarLinhasRevisao(entrada());
    porChave = new Map(linhasTodas.map((l) => [l.chave, l]));
    const podadas = podarPendentes();
    if (!raiz.dataset.pronto) montarEsqueleto(raiz);
    renderizarTabela();
    if (podadas) {
        mostrarAviso(
            `${plural(podadas, 'alteração não gravada foi descartada', 'alterações não gravadas foram descartadas')}, porque os dados mudaram.`,
            'info',
        );
    }
}

// ─── Mostrar e esconder ──────────────────────────────────────

function aplicarVisibilidade() {
    const raiz = el(ID_RAIZ);
    const listas = el('conexoes-fora-listas');
    const botao = el('conexoes-revisao-alternar');
    if (raiz) raiz.classList.toggle('hidden', !ativo);
    if (listas) listas.classList.toggle('hidden', ativo);
    if (botao) {
        botao.textContent = ativo ? 'Voltar às listas' : 'Modo revisão';
        botao.setAttribute('aria-pressed', ativo ? 'true' : 'false');
    }
}

export function alternarModoRevisao(forcar) {
    iniciarRevisaoForaDoAcervo();
    ativo = typeof forcar === 'boolean' ? forcar : !ativo;
    aplicarVisibilidade();
    if (ativo) renderizarRevisao();
}

// A seção "Fora do acervo" foi redesenhada: o botão só aparece havendo
// entradas, e a tabela (se aberta) se refaz com o dado de agora.
function aoRedesenharSecao() {
    linhasTodas = listarLinhasRevisao(entrada());
    porChave = new Map(linhasTodas.map((l) => [l.chave, l]));
    const barra = el('conexoes-fora-barra');
    if (barra) barra.classList.toggle('hidden', !linhasTodas.length);
    if (ativo && !linhasTodas.length) {
        alternarModoRevisao(false);
        return;
    }
    if (ativo) renderizarRevisao();
}

window.addEventListener('fora-do-acervo:renderizado', aoRedesenharSecao);
window.addEventListener('colunas:alteradas', (ev) => {
    if (ev.detail?.tabela === TABELA && ativo) renderizarTabela();
});

// ─── Eventos da tabela ───────────────────────────────────────

// ─── Tags de autor e de personagem ───────────────────────────

// O campo de tags a que um elemento pertence: a lista ('autores' ou
// 'personagens') e a chave da linha; `null` se o elemento não é um campo de tags.
function tagsDoInput(el) {
    const d = el?.dataset;
    if (!d) return null;
    if (d.revAutorInput !== undefined) return { lista: 'autores', chave: d.revAutorInput };
    if (d.revOrigemInput !== undefined) return { lista: 'origens', chave: d.revOrigemInput };
    if (d.revPersonagemInput !== undefined)
        return { lista: 'personagens', chave: d.revPersonagemInput };
    return null;
}

// Confirma o texto digitado no campo como uma tag (a lista pendente ganha o
// nome; repetido não entra) e esvazia o campo.
function confirmarTag(input, { lista, chave }) {
    const texto = input.value.trim();
    input.value = '';
    if (!texto) return;
    const atuais = valorEfetivo(chave, lista) || [];
    registrarEdicao(chave, lista, [...atuais, texto]);
}

function removerTag(lista, chave, indice) {
    const atuais = valorEfetivo(chave, lista) || [];
    if (!Number.isInteger(indice) || indice < 0 || indice >= atuais.length) return;
    registrarEdicao(
        chave,
        lista,
        atuais.filter((_, i) => i !== indice),
    );
}

function aoTeclar(e) {
    const input = e.target;
    const tags = tagsDoInput(input);
    if (!tags) return;
    if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        confirmarTag(input, tags);
    } else if (e.key === 'Backspace' && !input.value) {
        const atuais = valorEfetivo(tags.chave, tags.lista) || [];
        if (atuais.length) {
            e.preventDefault();
            removerTag(tags.lista, tags.chave, atuais.length - 1);
        }
    }
}

function aoDigitar(e) {
    const alvo = e.target;
    const tags = tagsDoInput(alvo);
    if (tags) {
        // Escolher uma sugestão da lista confirma na hora; digitar não.
        if (e.inputType === 'insertReplacementText') confirmarTag(alvo, tags);
        return;
    }
    if (alvo.id === 'revisao-busca') {
        consulta = alvo.value;
        pagina = 0;
        renderizarTabela();
        return;
    }
    if (!alvo.dataset?.revValor || alvo.type === 'checkbox') return;
    registrarEdicao(alvo.dataset.revChave, alvo.dataset.revValor, alvo.value);
}

function aoMudar(e) {
    const alvo = e.target;
    const tags = tagsDoInput(alvo);
    if (tags) {
        // Sair do campo com texto digitado também confirma a tag: numa tabela
        // não há botão "+", e o texto solto se perderia em silêncio.
        confirmarTag(alvo, tags);
    } else if (alvo.dataset?.revSel !== undefined) {
        if (alvo.checked) selecionadas.add(alvo.dataset.revSel);
        else selecionadas.delete(alvo.dataset.revSel);
        sincronizarSelecao();
    } else if (alvo.id === 'revisao-sel-todas') {
        selecionadas.clear();
        if (alvo.checked) linhasFiltradas().forEach((l) => selecionadas.add(l.chave));
        sincronizarSelecao();
    } else if (alvo.id === 'revisao-massa-campo' || alvo.id === 'revisao-massa-modo') {
        atualizarBarraMassa(el(ID_RAIZ), linhasFiltradas().length, selecionadas.size);
    } else if (alvo.id === 'revisao-campo') {
        campoFiltro = alvo.value;
        pagina = 0;
        renderizarTabela();
    } else if (alvo.id === 'revisao-faltando') {
        faltando =
            VALORES_REVISAO.includes(alvo.value) || alvo.value === FILTRO_AUTOR_VARIOS_NOMES
                ? alvo.value
                : '';
        pagina = 0;
        renderizarTabela();
    } else if (alvo.dataset?.revValor && alvo.type === 'checkbox') {
        registrarEdicao(alvo.dataset.revChave, alvo.dataset.revValor, alvo.checked);
    }
}

function aoClicar(e) {
    const tirar = e.target.closest('[data-rev-autor-remover]');
    if (tirar) {
        removerTag('autores', tirar.dataset.revAutorChave, Number(tirar.dataset.revAutorRemover));
        return;
    }
    const tirarOrigem = e.target.closest('[data-rev-origem-remover]');
    if (tirarOrigem) {
        removerTag(
            'origens',
            tirarOrigem.dataset.revOrigemChave,
            Number(tirarOrigem.dataset.revOrigemRemover),
        );
        return;
    }
    const tirarPersonagem = e.target.closest('[data-rev-personagem-remover]');
    if (tirarPersonagem) {
        removerTag(
            'personagens',
            tirarPersonagem.dataset.revPersonagemChave,
            Number(tirarPersonagem.dataset.revPersonagemRemover),
        );
        return;
    }
    const botao = e.target.closest('[data-rev-acao]');
    if (!botao || botao.disabled) return;
    const acao = botao.dataset.revAcao;
    if (acao === 'gravar') pedirRevisao();
    else if (acao === 'massa') aplicarMassaDaBarra();
    else if (acao === 'lupa') buscarPorPrefixoNaRevisao(botao.dataset.revPrefixo);
    else if (acao === 'descartar') descartarAlteracoes();
    else if (acao === 'anterior') irParaPagina(pagina - 1);
    else if (acao === 'proxima') irParaPagina(pagina + 1);
}

// A barra "Editar em massa": a mudança escolhida vale para todas as linhas
// que o filtro mostra (não só a página aberta).
export function aplicarMassaDaBarra(deps = {}) {
    if (pendentes.size) {
        return pedirEdicaoEmMassa({ pendentes: pendentes.size }, deps);
    }
    const { operacao, erro } = lerOperacaoDaBarra(el(ID_RAIZ));
    if (erro) {
        mostrarAviso(mensagemDeErroDaMassa({ erro }));
        return false;
    }
    // Com linhas marcadas, só elas; sem nenhuma marcada, todas as do filtro.
    const filtradas = linhasFiltradas().map((l) => l.chave);
    const marcadas = filtradas.filter((c) => selecionadas.has(c));
    const alvo = marcadas.length ? 'selecionadas' : 'filtro';
    const chaves = marcadas.length ? marcadas : filtradas;
    return pedirEdicaoEmMassa({ chaves, operacoes: [operacao], alvo }, deps);
}

function irParaPagina(nova) {
    pagina = nova;
    renderizarTabela();
    el('revisao-tabela')?.scrollIntoView?.({ block: 'start' });
}

// Liga os eventos uma vez só, na raiz que já existe no index.html.
export function iniciarRevisaoForaDoAcervo() {
    const raiz = el(ID_RAIZ);
    if (!raiz || raiz.dataset.eventos) return;
    raiz.dataset.eventos = '1';
    raiz.addEventListener('input', aoDigitar);
    raiz.addEventListener('change', aoMudar);
    raiz.addEventListener('click', aoClicar);
    raiz.addEventListener('keydown', aoTeclar);
}

// ─── Descartar ───────────────────────────────────────────────

export function descartarAlteracoes() {
    if (!pendentes.size) return false;
    abrirModalConfirmacao({
        titulo: 'Descartar alterações',
        rotulo: 'Modo revisão',
        mensagem: `${plural(pendentes.size, 'linha alterada volta', 'linhas alteradas voltam')} ao que está gravado. Nada foi gravado até agora.`,
        textoConfirmar: 'Descartar',
        onConfirmar: () => {
            pendentes.clear();
            renderizarRevisao();
        },
    });
    return true;
}

// ─── Revisar e gravar ────────────────────────────────────────

function irParaLinha(chave) {
    const indice = linhasFiltradas().findIndex((l) => l.chave === chave);
    if (indice === -1) return;
    pagina = Math.floor(indice / POR_PAGINA);
    renderizarTabela();
    const raiz = el(ID_RAIZ);
    const tr = [...(raiz?.querySelectorAll('[data-rev-linha]') || [])].find(
        (t) => t.dataset.revLinha === chave,
    );
    tr?.scrollIntoView?.({ block: 'center' });
}

function mensagemDeConfirmacao(plano) {
    const { linhas, restantes } = descreverRevisao(plano);
    const exemplos =
        linhas.join('; ') + (restantes ? ` e mais ${plural(restantes, 'linha', 'linhas')}` : '');
    const fora = plano.naoEncontradas
        ? ` ${plural(plano.naoEncontradas, 'linha mudou de lugar e fica', 'linhas mudaram de lugar e ficam')} de fora.`
        : '';
    return (
        `Em ${plural(plano.textos, 'texto', 'textos')} (${plural(plano.entradas, 'entrada', 'entradas')}): ${exemplos}.${fora} ` +
        'Um backup é guardado antes de gravar, e dá para desfazer logo depois.'
    );
}

// `deps` existe para os testes (sem IndexedDB de verdade).
export function pedirRevisao(deps = {}) {
    const snapshot = deps.tirarSnapshot || tirarSnapshotSeNecessario;
    const plano = planejarRevisao(entrada(), montarEdicoes());
    if (plano.erro && plano.erro !== 'sem-edicao') {
        mostrarAviso(mensagemDeErroDaRevisao(plano));
        if (plano.linhaComErro) irParaLinha(plano.linhaComErro);
        return false;
    }
    if (!plano.entradas) {
        mostrarAviso('Nada a gravar: as linhas já estão assim.', 'info');
        return false;
    }

    abrirModalConfirmacao({
        titulo: 'Gravar a revisão',
        rotulo: 'Modo revisão',
        mensagem: mensagemDeConfirmacao(plano),
        textoConfirmar: 'Gravar',
        corConfirmar: '#2563eb',
        focarConfirmar: true,
        onConfirmar: async () => {
            const ok = await snapshot(db, true);
            if (!ok) {
                mostrarAviso('Não foi possível guardar o backup antes. Nada foi alterado.');
                return;
            }
            // Planeja de novo: os dados podem ter mudado desde a confirmação.
            const atual = planejarRevisao(entrada(), montarEdicoes());
            if (atual.erro) {
                mostrarAviso(mensagemDeErroDaRevisao(atual));
                return;
            }
            const feito = aplicarRevisao(atual);
            if (!feito.entradas) return;
            save();
            pendentes.clear();
            renderForaDoAcervo();
            mostrarAvisoComAcao(
                plural(feito.entradas, 'entrada atualizada', 'entradas atualizadas'),
                'Desfazer',
                () => {
                    feito.desfazer();
                    save();
                    renderForaDoAcervo();
                },
                8000,
            );
        },
    });
    return true;
}

// Só para os testes: volta ao estado de quando a página abre.
export function reiniciarRevisaoParaTestes() {
    ativo = false;
    consulta = '';
    campoFiltro = '';
    faltando = '';
    pagina = 0;
    pendentes.clear();
    selecionadas.clear();
    linhasTodas = [];
    porChave = new Map();
    const raiz = el(ID_RAIZ);
    if (raiz) {
        raiz.innerHTML = '';
        delete raiz.dataset.pronto;
    }
}
