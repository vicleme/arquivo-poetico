// ============================================================
// editor.js — Toolbar de formatação, tags/sinalizações, UX
// Importado por: main.js (inicialização)
// ============================================================

import { db } from './db.js';
import {
    extrairSinalizacoesUnicas,
    extrairPessoasUnicas,
    extrairGenerosUnicos,
    extrairValoresUnicosDeAnotacoes,
    extrairValoresUnicosDeIntertextualidade,
    extrairNomesEpocaUnicos,
    escapeHtml,
    mostrarAviso,
} from './utils.js';

// ─── Estado local ─────────────────────────────────────────────

export let lastSelection = { start: 0, end: 0 };
let alignAtual = null;

// ─── Formatação inline ───────────────────────────────────────

export function wrapText(before, after) {
    const textarea = document.getElementById('p-texto');
    if (!textarea) return;

    textarea.focus();
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end);
    const novo = before + selected + after;

    if (!document.execCommand('insertText', false, novo)) {
        textarea.value = textarea.value.substring(0, start) + novo + textarea.value.substring(end);
    }

    textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
}

export function applyStyle() {
    const colorInput =
        document.getElementById('toolHex')?.value || document.getElementById('toolColor')?.value;
    const fontInput = document.getElementById('toolFont')?.value.trim();
    const sizeInput = document.getElementById('toolSize')?.value.trim();

    const font = fontInput ? `'${fontInput}'` : 'inherit';
    const size = sizeInput ? `${sizeInput}pt` : 'inherit';
    let color = colorInput || 'inherit';
    if (color !== 'inherit' && !color.startsWith('#')) color = '#' + color;

    const alignStyle = alignAtual ? ` text-align: ${alignAtual};` : '';

    wrapText(
        `<div style="color: ${color}; font-family: ${font}; font-size: ${size};${alignStyle} display: inline;">`,
        `</div>`,
    );

    // reseta alinhamento após aplicar
    alignAtual = null;
    ['left', 'right'].forEach((a) => {
        document.getElementById(`toolAlign-${a}`)?.classList.remove('bg-blue-100');
    });
}

export function setAlign(valor) {
    alignAtual = alignAtual === valor ? null : valor;
    ['left', 'right'].forEach((a) => {
        document
            .getElementById(`toolAlign-${a}`)
            ?.classList.toggle('bg-blue-100', alignAtual === a);
    });
}

// ─── Fábrica de grupos de tags/pessoas ────────────────────────
// Poema/Tags, Poema/Pessoas, Prosa/Tags, Prosa/Pessoas são o mesmo
// comportamento (adicionar, remover, renderizar como chips, resetar,
// carregar a partir de uma string "a, b, c") variando só os IDs do
// DOM e a cor do badge. Em vez de 4 cópias, uma única implementação
// parametrizada; cada grupo guarda seu próprio array em closure —
// sem estado global compartilhado entre Poema e Prosa.
function criarGrupoDeTags({ inputId, containerId, hiddenInputId, corClasse, nomeFuncaoRemover }) {
    let itens = [];

    function adicionar(valor = null) {
        const input = document.getElementById(inputId);
        const item = (valor ?? input?.value ?? '').trim();
        if (item && !itens.includes(item)) {
            itens.push(item);
            renderizar();
        }
        if (input) input.value = '';
    }

    function remover(item) {
        itens = itens.filter((i) => i !== item);
        renderizar();
    }

    function renderizar() {
        const container = document.getElementById(containerId);
        const inputOculto = document.getElementById(hiddenInputId);
        if (!container) return;

        container.innerHTML = itens
            .map(
                (i) => `
            <span class="${corClasse} text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1">
                ${escapeHtml(i)}
                <button type="button" data-valor="${escapeHtml(i)}" onclick="${nomeFuncaoRemover}(this.dataset.valor)" class="hover:text-red-200 font-bold ml-1">×</button>
            </span>`,
            )
            .join('');

        if (inputOculto) inputOculto.value = itens.join(', ');
    }

    function reset() {
        itens = [];
        renderizar();
    }

    function carregar(valorStr) {
        itens = valorStr
            ? valorStr
                  .split(',')
                  .map((s) => s.trim())
                  .filter((s) => s)
            : [];
        renderizar();
    }

    return { adicionar, remover, renderizar, reset, carregar };
}

const grupoTagsPoema = criarGrupoDeTags({
    inputId: 'p-sinal-input',
    containerId: 'p-tags-container',
    hiddenInputId: 'p-sinal',
    corClasse: 'bg-blue-600',
    nomeFuncaoRemover: 'removerTag',
});
const grupoPessoasPoema = criarGrupoDeTags({
    inputId: 'p-pessoa-input',
    containerId: 'p-pessoas-container',
    hiddenInputId: 'p-pessoas',
    corClasse: 'bg-rose-500',
    nomeFuncaoRemover: 'removerPessoa',
});
const grupoTagsProsa = criarGrupoDeTags({
    inputId: 'pr-sinal-input',
    containerId: 'pr-tags-container',
    hiddenInputId: 'pr-sinal',
    corClasse: 'bg-blue-600',
    nomeFuncaoRemover: 'removerTagProsa',
});
const grupoPessoasProsa = criarGrupoDeTags({
    inputId: 'pr-pessoa-input',
    containerId: 'pr-pessoas-container',
    hiddenInputId: 'pr-pessoas',
    corClasse: 'bg-rose-500',
    nomeFuncaoRemover: 'removerPessoaProsa',
});
const grupoGeneroProsa = criarGrupoDeTags({
    inputId: 'pr-genero-input',
    containerId: 'pr-genero-container',
    hiddenInputId: 'pr-genero',
    corClasse: 'bg-amber-600',
    nomeFuncaoRemover: 'removerGeneroProsa',
});

// ─── Listas genéricas de entradas (objetos ou texto livre) ────
// Usado por Intertextualidade (pares tipo+texto) e Anexos (tipo+
// texto+link). Diferente de criarGrupoDeTags: guarda
// um array de verdade (não uma string separada por vírgula), porque
// os valores podem conter vírgulas e/ou ter mais de um campo por item.
//
// Suporta edição in-place: iniciarEdicao(i) marca o item i como "em
// edição" (destacado visualmente); a próxima chamada a salvar() atualiza
// esse item em vez de adicionar um novo. cancelarEdicao() sai do modo
// sem alterar nada. remover() sempre cancela edição em andamento, pra
// não arriscar salvar num índice que mudou de posição.
function criarListaDeEntradas({ containerId, renderItem, nomeFuncaoRemover, nomeFuncaoEditar }) {
    let itens = [];
    let editando = null; // índice do item em edição, ou null

    function salvar(entrada) {
        if (editando !== null) {
            itens[editando] = entrada;
            editando = null;
        } else {
            itens.push(entrada);
        }
        renderizar();
    }

    function remover(indice) {
        itens.splice(indice, 1);
        editando = null; // evita salvar depois num índice que já mudou de posição
        renderizar();
    }

    function iniciarEdicao(indice) {
        editando = indice;
        renderizar();
        return itens[indice];
    }

    function cancelarEdicao() {
        editando = null;
        renderizar();
    }

    function estaEditando() {
        return editando !== null;
    }

    function renderizar() {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = itens
            .map((item, i) => {
                const emEdicao = i === editando;
                return `
            <div class="flex items-start justify-between gap-2 bg-white dark:bg-slate-900 border rounded px-2 py-1.5 text-xs ${
                emEdicao
                    ? 'border-blue-400 dark:border-blue-500 ring-1 ring-blue-300 dark:ring-blue-600'
                    : 'border-gray-200 dark:border-slate-700'
            }">
                <div class="flex-1 min-w-0 whitespace-pre-wrap">${renderItem(item)}</div>
                <div class="flex items-center gap-1 flex-shrink-0">
                    <button type="button" onclick="${nomeFuncaoEditar}(${i})"
                        class="text-blue-400 hover:text-blue-600 dark:hover:text-blue-400 flex-shrink-0 px-1" title="Editar">✎</button>
                    <button type="button" onclick="${nomeFuncaoRemover}(${i})"
                        class="text-red-400 hover:text-red-600 dark:hover:text-red-400 font-bold flex-shrink-0 px-1" title="Remover">×</button>
                </div>
            </div>`;
            })
            .join('');
    }

    function obterItens() {
        return itens;
    }

    function carregar(lista) {
        itens = Array.isArray(lista) ? [...lista] : [];
        editando = null;
        renderizar();
    }

    function reset() {
        itens = [];
        editando = null;
        renderizar();
    }

    return {
        salvar,
        remover,
        renderizar,
        obterItens,
        carregar,
        reset,
        iniciarEdicao,
        cancelarEdicao,
        estaEditando,
    };
}

// ─── Intertextualidade (lista de pares tipo+texto) ────────────
// Um texto pode dialogar com várias referências externas de tipos
// diferentes ao mesmo tempo — por isso é uma lista, não um par único.

const listaIntertextoPoema = criarListaDeEntradas({
    containerId: 'p-intertexto-lista',
    renderItem: (it) =>
        `${
            it.tipo
                ? `<span class="inline-block px-1.5 py-0.5 mr-1 rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-[10px] font-bold uppercase align-middle">${escapeHtml(it.tipo)}</span>`
                : ''
        }${escapeHtml(it.texto || '')}`,
    nomeFuncaoRemover: 'removerIntertexto',
    nomeFuncaoEditar: 'editarIntertexto',
});

function atualizarBotaoIntertexto() {
    const btnAdd = document.getElementById('p-intertexto-btn-add');
    const btnCancelar = document.getElementById('p-intertexto-btn-cancelar');
    const emEdicao = listaIntertextoPoema.estaEditando();
    if (btnAdd) btnAdd.textContent = emEdicao ? '✓' : '+';
    if (btnCancelar) btnCancelar.classList.toggle('hidden', !emEdicao);
}

export function atualizarDatalistIntertexto() {
    const datalist = document.getElementById('sugestoes-intertexto');
    if (datalist) {
        datalist.innerHTML = extrairValoresUnicosDeIntertextualidade(db.poemas)
            .map((v) => `<option value="${escapeHtml(v)}">`)
            .join('');
    }
}

export function adicionarIntertexto() {
    const tipoEl = document.getElementById('p-intertexto-tipo');
    const textoEl = document.getElementById('p-intertexto-texto');
    const tipo = tipoEl?.value || '';
    const texto = (textoEl?.value || '').trim();
    if (!tipo && !texto) return;
    listaIntertextoPoema.salvar({ tipo, texto });
    if (tipoEl) tipoEl.value = '';
    if (textoEl) textoEl.value = '';
    atualizarBotaoIntertexto();
    atualizarDatalistIntertexto();
}
export function editarIntertexto(indice) {
    const item = listaIntertextoPoema.iniciarEdicao(indice);
    const tipoEl = document.getElementById('p-intertexto-tipo');
    const textoEl = document.getElementById('p-intertexto-texto');
    if (tipoEl) tipoEl.value = item.tipo || '';
    if (textoEl) textoEl.value = item.texto || '';
    textoEl?.focus();
    atualizarBotaoIntertexto();
}
export function cancelarEdicaoIntertexto() {
    listaIntertextoPoema.cancelarEdicao();
    const tipoEl = document.getElementById('p-intertexto-tipo');
    const textoEl = document.getElementById('p-intertexto-texto');
    if (tipoEl) tipoEl.value = '';
    if (textoEl) textoEl.value = '';
    atualizarBotaoIntertexto();
}
export function removerIntertexto(indice) {
    listaIntertextoPoema.remover(indice);
    atualizarBotaoIntertexto();
}
export function obterIntertextualidade() {
    return listaIntertextoPoema.obterItens();
}
export function carregarIntertextualidade(lista) {
    listaIntertextoPoema.carregar(lista);
    atualizarBotaoIntertexto();
}
export function resetIntertextualidade() {
    listaIntertextoPoema.reset();
    atualizarBotaoIntertexto();
}

// ─── Anexos (lista de tipo+texto+link) ─────────────────────────
// Um texto pode ter um ou vários anexos associados (ilustração,
// foto, lettering, declamação/comentários em vídeo...), cada um com
// tipo + descrição (textarea, texto longo — ver modal-poema.html e
// o atalho Ctrl/Cmd+Enter em initEditor()) + link opcional. Para os
// tipos de vídeo o link é obrigatório, já que a descrição sozinha
// não dá acesso ao conteúdo.
const TIPOS_ANEXO_COM_LINK_OBRIGATORIO = ['Declamação em vídeo', 'Comentários em vídeo'];

const listaAnexosPoema = criarListaDeEntradas({
    containerId: 'p-anexos-lista',
    renderItem: (it) => {
        const badge = it.tipo
            ? `<span class="inline-block px-1.5 py-0.5 mr-1 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold uppercase align-middle">${escapeHtml(it.tipo)}</span>`
            : '';
        const link = it.link
            ? ` <a href="${escapeHtml(it.link)}" target="_blank" rel="noopener" class="text-blue-600 dark:text-blue-400 underline text-[11px]">${escapeHtml(it.link)}</a>`
            : '';
        return `${badge}${escapeHtml(it.texto || '')}${link}`;
    },
    nomeFuncaoRemover: 'removerAnexo',
    nomeFuncaoEditar: 'editarAnexo',
});

function atualizarBotaoAnexo() {
    const btnAdd = document.getElementById('p-anexo-btn-add');
    const btnCancelar = document.getElementById('p-anexo-btn-cancelar');
    const emEdicao = listaAnexosPoema.estaEditando();
    if (btnAdd) btnAdd.textContent = emEdicao ? '✓ Salvar edição' : '+ Adicionar anexo';
    if (btnCancelar) btnCancelar.classList.toggle('hidden', !emEdicao);
}

export function adicionarAnexo(valor = null) {
    const tipoEl = document.getElementById('p-anexo-tipo');
    const linkEl = document.getElementById('p-anexo-link');
    const textoEl = document.getElementById('p-anexo-input');

    const tipo = tipoEl?.value || '';
    const link = (linkEl?.value || '').trim();
    const texto = (valor ?? textoEl?.value ?? '').trim();

    if (!tipo && !texto && !link) return;

    if (TIPOS_ANEXO_COM_LINK_OBRIGATORIO.includes(tipo) && !link) {
        mostrarAviso(`Anexos do tipo "${tipo}" precisam de um link.`);
        return;
    }

    listaAnexosPoema.salvar({ tipo, texto, link });
    if (tipoEl) tipoEl.value = '';
    if (linkEl) linkEl.value = '';
    if (textoEl) textoEl.value = '';
    atualizarBotaoAnexo();
}
export function editarAnexo(indice) {
    const item = listaAnexosPoema.iniciarEdicao(indice);
    const tipoEl = document.getElementById('p-anexo-tipo');
    const linkEl = document.getElementById('p-anexo-link');
    const textoEl = document.getElementById('p-anexo-input');
    if (tipoEl) tipoEl.value = item.tipo || '';
    if (linkEl) linkEl.value = item.link || '';
    if (textoEl) textoEl.value = item.texto || '';
    textoEl?.focus();
    atualizarBotaoAnexo();
}
export function cancelarEdicaoAnexo() {
    listaAnexosPoema.cancelarEdicao();
    const tipoEl = document.getElementById('p-anexo-tipo');
    const linkEl = document.getElementById('p-anexo-link');
    const textoEl = document.getElementById('p-anexo-input');
    if (tipoEl) tipoEl.value = '';
    if (linkEl) linkEl.value = '';
    if (textoEl) textoEl.value = '';
    atualizarBotaoAnexo();
}
export function removerAnexo(indice) {
    listaAnexosPoema.remover(indice);
    atualizarBotaoAnexo();
}
export function obterAnexos() {
    return listaAnexosPoema.obterItens();
}
export function carregarAnexos(lista) {
    // Compatível com o formato antigo (array de strings, só descrição).
    const normalizada = Array.isArray(lista)
        ? lista.map((it) => (typeof it === 'string' ? { tipo: '', texto: it, link: '' } : it))
        : [];
    listaAnexosPoema.carregar(normalizada);
    atualizarBotaoAnexo();
}
export function resetAnexos() {
    listaAnexosPoema.reset();
    atualizarBotaoAnexo();
}

// ─── Anotações Marginais (lista de trecho+posição+fonte+texto) ─
// Comentários de outra "voz" escritos por cima do texto — em geral
// numa fonte cursiva diferente da do poema — associados a um verso ou
// estrofe específico. Diferente de Intertextualidade (diálogo com algo
// externo ao arquivo) e de Descrição Visual (o próprio poema disposto
// de forma incomum no espaço): aqui é um comentário externo ao poema,
// sobre um trecho dele.
//
// Posição e Fonte são texto livre (não um <select> fechado), porque a
// posição pode ser composta ("abaixo e à esquerda") e a fonte, embora
// costume ser a mesma, pode variar — ambas com autocompletar (ver
// atualizarDatalistAnotacoes) alimentado pelo que já foi digitado antes,
// pra puxar consistência sem travar o formato.
//
// Uma mesma referência (verso/estrofe) pode ter mais de uma anotação —
// ex.: uma "à direita" e sua continuação "abaixo e à esquerda" — cada
// lado é uma entrada própria, agrupadas na lista por aparecerem com a
// mesma referência de trecho.

const listaAnotacoesPoema = criarListaDeEntradas({
    containerId: 'p-anotacoes-lista',
    renderItem: (it) => {
        const trecho = it.trecho
            ? `<span class="block text-[11px] text-gray-400 dark:text-slate-500 italic mb-0.5">${escapeHtml(it.trecho)}</span>`
            : '';
        const meta = [it.posicao, it.fonte].filter(Boolean).map(escapeHtml).join(' · ');
        const metaHtml = meta
            ? `<span class="inline-block px-1.5 py-0.5 mr-1 rounded bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 text-[10px] font-bold align-middle">${meta}</span>`
            : '';
        return `${trecho}${metaHtml}${escapeHtml(it.texto || '')}`;
    },
    nomeFuncaoRemover: 'removerAnotacao',
    nomeFuncaoEditar: 'editarAnotacao',
});

function atualizarBotaoAnotacao() {
    const btnAdd = document.getElementById('p-anotacao-btn-add');
    const btnCancelar = document.getElementById('p-anotacao-btn-cancelar');
    const emEdicao = listaAnotacoesPoema.estaEditando();
    if (btnAdd) btnAdd.textContent = emEdicao ? '✓ Salvar edição' : '+ Adicionar anotação';
    if (btnCancelar) btnCancelar.classList.toggle('hidden', !emEdicao);
}

export function atualizarDatalistAnotacoes() {
    const datalistPosicoes = document.getElementById('sugestoes-posicoes-anotacoes');
    if (datalistPosicoes) {
        datalistPosicoes.innerHTML = extrairValoresUnicosDeAnotacoes(db.poemas, 'posicao')
            .map((v) => `<option value="${escapeHtml(v)}">`)
            .join('');
    }
    const datalistFontes = document.getElementById('sugestoes-fontes-anotacoes');
    if (datalistFontes) {
        datalistFontes.innerHTML = extrairValoresUnicosDeAnotacoes(db.poemas, 'fonte')
            .map((v) => `<option value="${escapeHtml(v)}">`)
            .join('');
    }
}

export function adicionarAnotacao() {
    const trechoEl = document.getElementById('p-anotacao-trecho');
    const posicaoEl = document.getElementById('p-anotacao-posicao');
    const fonteEl = document.getElementById('p-anotacao-fonte');
    const textoEl = document.getElementById('p-anotacao-texto');

    const trecho = (trechoEl?.value || '').trim();
    const posicao = (posicaoEl?.value || '').trim();
    const fonte = (fonteEl?.value || '').trim();
    const texto = (textoEl?.value || '').trim();
    if (!trecho && !posicao && !fonte && !texto) return;

    listaAnotacoesPoema.salvar({ trecho, posicao, fonte, texto });
    if (trechoEl) trechoEl.value = '';
    if (posicaoEl) posicaoEl.value = '';
    if (fonteEl) fonteEl.value = '';
    if (textoEl) textoEl.value = '';
    atualizarBotaoAnotacao();
    atualizarDatalistAnotacoes();
}
export function editarAnotacao(indice) {
    const item = listaAnotacoesPoema.iniciarEdicao(indice);
    const trechoEl = document.getElementById('p-anotacao-trecho');
    const posicaoEl = document.getElementById('p-anotacao-posicao');
    const fonteEl = document.getElementById('p-anotacao-fonte');
    const textoEl = document.getElementById('p-anotacao-texto');
    if (trechoEl) trechoEl.value = item.trecho || '';
    if (posicaoEl) posicaoEl.value = item.posicao || '';
    if (fonteEl) fonteEl.value = item.fonte || '';
    if (textoEl) textoEl.value = item.texto || '';
    trechoEl?.focus();
    atualizarBotaoAnotacao();
}
export function cancelarEdicaoAnotacao() {
    listaAnotacoesPoema.cancelarEdicao();
    const trechoEl = document.getElementById('p-anotacao-trecho');
    const posicaoEl = document.getElementById('p-anotacao-posicao');
    const fonteEl = document.getElementById('p-anotacao-fonte');
    const textoEl = document.getElementById('p-anotacao-texto');
    if (trechoEl) trechoEl.value = '';
    if (posicaoEl) posicaoEl.value = '';
    if (fonteEl) fonteEl.value = '';
    if (textoEl) textoEl.value = '';
    atualizarBotaoAnotacao();
}
export function removerAnotacao(indice) {
    listaAnotacoesPoema.remover(indice);
    atualizarBotaoAnotacao();
}
export function obterAnotacoes() {
    return listaAnotacoesPoema.obterItens();
}
export function carregarAnotacoes(lista) {
    listaAnotacoesPoema.carregar(lista);
    atualizarBotaoAnotacao();
}
export function resetAnotacoes() {
    listaAnotacoesPoema.reset();
    atualizarBotaoAnotacao();
}

// ─── Tags (Sinalizações) ─────────────────────────────────────

export function atualizarDatalist() {
    const datalist = document.getElementById('sugestoes-sinais');
    if (datalist) {
        datalist.innerHTML = extrairSinalizacoesUnicas(db.poemas)
            .map((tag) => `<option value="${escapeHtml(tag)}">`)
            .join('');
    }
    atualizarDatalistPessoas();
    atualizarDatalistMigracao();
    atualizarDatalistAnotacoes();
    atualizarDatalistIntertexto();
    atualizarDatalistEpoca();
}

export function atualizarDatalistEpoca() {
    const datalist = document.getElementById('sugestoes-epoca-nome');
    if (datalist) {
        datalist.innerHTML = extrairNomesEpocaUnicos(db.poemas)
            .map((v) => `<option value="${escapeHtml(v)}">`)
            .join('');
    }
}

// Sugestões pros campos "Cortado de"/"Lançado em" (Livro e Parte/Seção)
// — texto livre (o livro de origem pode nem existir mais como registro),
// mas com autocompletar pra acertar o nome de algo já cadastrado sem
// digitar de novo/errado.
//
// A lista de Seção de cada par fica filtrada pelo Livro já digitado ao
// lado (quando esse texto bate com um livro do acervo) — e escolher/
// digitar uma Seção já cadastrada preenche o Livro correspondente
// sozinho, contanto que o nome não seja ambíguo (mesma Seção existindo
// em mais de um Livro). Se o livro digitado não existir no acervo (ex.:
// origem antiga, nunca cadastrada aqui), a sugestão de Seção volta a
// mostrar a lista inteira, sem filtro.

const PARES_MIGRACAO = [
    { livro: 'p-cortado-livro', secao: 'p-cortado-secao', datalist: 'sugestoes-secoes-migracao-cortado' },
    { livro: 'p-lancado-livro', secao: 'p-lancado-secao', datalist: 'sugestoes-secoes-migracao-lancado' },
];

// Seção pode estar presa direto no Livro ou dentro de uma Parte.
function livroIdDaSecao(secao) {
    if (secao.paiTipo === 'livro') return secao.paiId;
    if (secao.paiTipo === 'parte') return db.partes.find((p) => p.id == secao.paiId)?.livroId ?? null;
    return null;
}

// { titulo, livroId, livroTitulo } de cada Parte/Seção do acervo, com o
// livro já resolvido — base tanto pro filtro quanto pro autopreenchimento.
function mapaSecoesMigracao() {
    const partes = db.partes.map((p) => ({ titulo: p.titulo, livroId: p.livroId }));
    const secoes = db.secoes.map((s) => ({ titulo: s.titulo, livroId: livroIdDaSecao(s) }));
    return [...partes, ...secoes]
        .filter((x) => x.titulo && x.livroId != null)
        .map((x) => ({ ...x, livroTitulo: db.livros.find((l) => l.id == x.livroId)?.titulo || null }))
        .filter((x) => x.livroTitulo);
}

// Preenche o datalist de Seção de um par com as opções do livro digitado
// no campo `livroInputId` ao lado — ou a lista inteira, se esse texto não
// bater com nenhum livro cadastrado.
function preencherDatalistSecoesMigracao(datalistId, livroInputId) {
    const datalist = document.getElementById(datalistId);
    if (!datalist) return;

    const mapa = mapaSecoesMigracao();
    const livroDigitado = (document.getElementById(livroInputId)?.value || '').trim();
    const livro = livroDigitado
        ? db.livros.find((l) => (l.titulo || '').trim().toLowerCase() === livroDigitado.toLowerCase())
        : null;

    const titulos = new Set((livro ? mapa.filter((x) => x.livroId == livro.id) : mapa).map((x) => x.titulo));
    datalist.innerHTML = Array.from(titulos)
        .sort((a, b) => a.localeCompare(b, 'pt-BR'))
        .map((titulo) => `<option value="${escapeHtml(titulo)}">`)
        .join('');
}

// Ao digitar/escolher uma Seção, se o texto bater — sem ambiguidade — com
// uma Parte/Seção já cadastrada no acervo, preenche sozinho o Livro
// correspondente. Fica quieto se não achar nada ou se o mesmo nome existir
// em mais de um livro (aí quem escolhe é a pessoa mesmo).
function autopreencherLivroDaSecao(secaoInputId, livroInputId) {
    const secaoDigitada = (document.getElementById(secaoInputId)?.value || '').trim();
    if (!secaoDigitada) return;

    const encontrados = mapaSecoesMigracao().filter(
        (x) => x.titulo.trim().toLowerCase() === secaoDigitada.toLowerCase(),
    );
    const livrosUnicos = new Set(encontrados.map((x) => x.livroId));
    if (livrosUnicos.size !== 1) return;

    const livroInput = document.getElementById(livroInputId);
    if (livroInput) livroInput.value = encontrados[0].livroTitulo;
}

export function atualizarDatalistMigracao() {
    const datalistLivros = document.getElementById('sugestoes-livros-migracao');
    if (datalistLivros) {
        datalistLivros.innerHTML = db.livros
            .map((l) => l.titulo)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b, 'pt-BR'))
            .map((titulo) => `<option value="${escapeHtml(titulo)}">`)
            .join('');
    }

    atualizarFiltroSecoesMigracao();
}

// Reaplica o filtro de Seção pelo que já estiver nos dois campos de Livro
// — chamado sozinho depois que editarPoema() seta os 4 campos de migração
// de uma vez (setar .value direto no JS não dispara 'input').
export function atualizarFiltroSecoesMigracao() {
    PARES_MIGRACAO.forEach(({ livro, datalist }) => preencherDatalistSecoesMigracao(datalist, livro));
}

// Liga os listeners dos 4 campos de migração (livro ⇄ seção) — chamado
// uma vez por initEditor(), quando modal-poema é carregado pela primeira vez.
function initListenersMigracao() {
    PARES_MIGRACAO.forEach(({ livro, secao, datalist }) => {
        document
            .getElementById(livro)
            ?.addEventListener('input', () => preencherDatalistSecoesMigracao(datalist, livro));
        document.getElementById(secao)?.addEventListener('input', () => {
            autopreencherLivroDaSecao(secao, livro);
            preencherDatalistSecoesMigracao(datalist, livro);
        });
    });
}

export function adicionarTag(valor = null) {
    grupoTagsPoema.adicionar(valor);
}
export function removerTag(tag) {
    grupoTagsPoema.remover(tag);
}
export function renderizarTags() {
    grupoTagsPoema.renderizar();
}
export function resetTags() {
    grupoTagsPoema.reset();
}
export function carregarTags(sinalizacoesStr) {
    grupoTagsPoema.carregar(sinalizacoesStr);
}

// ─── Pessoas (Dedicado a) ──────────────────────────────────────
// Mesmo padrão das Sinalizações, mas em grupo separado: pessoas
// não são tema, são "a quem o texto se refere/é dedicado".

export function atualizarDatalistPessoas() {
    const datalist = document.getElementById('sugestoes-pessoas');
    if (!datalist) return;
    datalist.innerHTML = extrairPessoasUnicas(db.poemas)
        .map((nome) => `<option value="${escapeHtml(nome)}">`)
        .join('');
}

export function adicionarPessoa(valor = null) {
    grupoPessoasPoema.adicionar(valor);
}
export function removerPessoa(nome) {
    grupoPessoasPoema.remover(nome);
}
export function renderizarPessoas() {
    grupoPessoasPoema.renderizar();
}
export function resetPessoas() {
    grupoPessoasPoema.reset();
}
export function carregarPessoas(pessoasStr) {
    grupoPessoasPoema.carregar(pessoasStr);
}

// ─── Inicialização dos listeners ─────────────────────────────

// ─── Tags/Pessoas: Prosa (espelha o padrão do Poema) ─────────

export function atualizarDatalistProsa() {
    const sinaisUnicos = extrairSinalizacoesUnicas([...db.poemas, ...(db.prosas || [])]);
    const pessoasUnicas = extrairPessoasUnicas([...db.poemas, ...(db.prosas || [])]);
    const generosUnicos = extrairGenerosUnicos(db.prosas || []);

    // Datalists dentro do modal de Prosa (só existem depois que o modal
    // é carregado ao menos uma vez — ver modal-prosa.html / modais.js)
    const datalistSinais = document.getElementById('sugestoes-sinais-prosa');
    if (datalistSinais) {
        datalistSinais.innerHTML = sinaisUnicos
            .map((tag) => `<option value="${escapeHtml(tag)}">`)
            .join('');
    }
    const datalistPessoas = document.getElementById('sugestoes-pessoas-prosa');
    if (datalistPessoas) {
        datalistPessoas.innerHTML = pessoasUnicas
            .map((nome) => `<option value="${escapeHtml(nome)}">`)
            .join('');
    }

    // Datalists sempre presentes no index.html, usados pela barra de
    // edição em massa da aba Prosas (independem do modal ter sido aberto)
    const datalistSinaisBulk = document.getElementById('sugestoes-sinais-bulk-prosa');
    if (datalistSinaisBulk) {
        datalistSinaisBulk.innerHTML = sinaisUnicos
            .map((tag) => `<option value="${escapeHtml(tag)}">`)
            .join('');
    }
    const datalistPessoasBulk = document.getElementById('sugestoes-pessoas-bulk-prosa');
    if (datalistPessoasBulk) {
        datalistPessoasBulk.innerHTML = pessoasUnicas
            .map((nome) => `<option value="${escapeHtml(nome)}">`)
            .join('');
    }

    const datalistGenero = document.getElementById('sugestoes-genero-prosa');
    if (datalistGenero) {
        datalistGenero.innerHTML = generosUnicos
            .map((g) => `<option value="${escapeHtml(g)}">`)
            .join('');
    }
    const datalistGeneroBulk = document.getElementById('sugestoes-genero-bulk-prosa');
    if (datalistGeneroBulk) {
        datalistGeneroBulk.innerHTML = generosUnicos
            .map((g) => `<option value="${escapeHtml(g)}">`)
            .join('');
    }
}

export function adicionarTagProsa(valor = null) {
    grupoTagsProsa.adicionar(valor);
}
export function removerTagProsa(tag) {
    grupoTagsProsa.remover(tag);
}
export function renderizarTagsProsa() {
    grupoTagsProsa.renderizar();
}
export function resetTagsProsa() {
    grupoTagsProsa.reset();
}
export function carregarTagsProsa(sinalizacoesStr) {
    grupoTagsProsa.carregar(sinalizacoesStr);
}

export function adicionarPessoaProsa(valor = null) {
    grupoPessoasProsa.adicionar(valor);
}
export function removerPessoaProsa(nome) {
    grupoPessoasProsa.remover(nome);
}
export function renderizarPessoasProsa() {
    grupoPessoasProsa.renderizar();
}
export function resetPessoasProsa() {
    grupoPessoasProsa.reset();
}
export function carregarPessoasProsa(pessoasStr) {
    grupoPessoasProsa.carregar(pessoasStr);
}

// ─── Gênero (Cartas, Diálogos, Ensaios, Prosas poéticas...) ───

export function adicionarGeneroProsa(valor = null) {
    grupoGeneroProsa.adicionar(valor);
}
export function removerGeneroProsa(genero) {
    grupoGeneroProsa.remover(genero);
}
export function renderizarGeneroProsa() {
    grupoGeneroProsa.renderizar();
}
export function resetGeneroProsa() {
    grupoGeneroProsa.reset();
}
export function carregarGeneroProsa(generoStr) {
    grupoGeneroProsa.carregar(generoStr);
}

export function initEditor() {
    const textarea = document.getElementById('p-texto');
    const toolbar = document.querySelector('.bg-slate-50.border-slate-200');

    // Sincroniza toolColor ↔ toolHex
    const toolColor = document.getElementById('toolColor');
    const toolHex = document.getElementById('toolHex');

    if (toolColor && toolHex) {
        toolColor.addEventListener('input', (e) => {
            toolHex.value = e.target.value.toUpperCase();
        });
        toolHex.addEventListener('change', (e) => {
            let hex = e.target.value;
            if (!hex.startsWith('#')) hex = '#' + hex;
            if (/^#[0-9A-F]{6}$/i.test(hex)) toolColor.value = hex;
        });
    }

    // toolSize → applyStyle ao pressionar Enter
    const toolSize = document.getElementById('toolSize');
    if (toolSize) {
        toolSize.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                applyStyle();
            }
        });
    }

    // Liga os 4 campos de migração (livro ⇄ seção) — independe da
    // textarea existir, então roda antes do early return abaixo.
    initListenersMigracao();

    if (!textarea) return;

    // Persiste a seleção enquanto o usuário interage com a toolbar
    const updateSelection = () => {
        lastSelection.start = textarea.selectionStart;
        lastSelection.end = textarea.selectionEnd;
    };

    textarea.addEventListener('select', updateSelection);
    textarea.addEventListener('mouseup', updateSelection);
    textarea.addEventListener('keyup', updateSelection);

    if (toolbar) {
        const restore = () => {
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(lastSelection.start, lastSelection.end);
            }, 0);
        };

        toolbar.addEventListener('pointerdown', (e) => {
            const tag = e.target.tagName;
            const type = e.target.type;
            const isEditableInput = tag === 'INPUT' && (type === 'text' || type === 'number');
            if (isEditableInput) return;
            e.preventDefault();
            restore();
        });

        [toolHex, document.getElementById('toolFont'), toolSize].forEach((input) => {
            if (!input) return;
            input.addEventListener('blur', () => restore());
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    input.blur();
                    restore();
                }
            });
        });
    }

    // Previne perda de seleção ao clicar nos inputs de ferramenta
    ['toolColor', 'toolHex', 'toolFont', 'toolSize'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('mousedown', () => {
                const s = textarea.selectionStart;
                const e_sel = textarea.selectionEnd;
                setTimeout(() => textarea.setSelectionRange(s, e_sel), 10);
            });
        }
    });

    // Enter no input de tags
    const inputSinal = document.getElementById('p-sinal-input');
    if (inputSinal) {
        inputSinal.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                adicionarTag();
            }
        });
    }

    // Enter no input de pessoas
    const inputPessoa = document.getElementById('p-pessoa-input');
    if (inputPessoa) {
        inputPessoa.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                adicionarPessoa();
            }
        });
    }

    // Enter no input de texto da Intertextualidade
    const inputIntertexto = document.getElementById('p-intertexto-texto');
    if (inputIntertexto) {
        inputIntertexto.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                adicionarIntertexto();
            }
        });
    }

    // Anexos usa textarea (texto longo) — Enter quebra linha na
    // descrição normalmente; Ctrl/Cmd+Enter é quem adiciona o item
    // (mesmo padrão do atalho de salvar o modal inteiro).
    const inputAnexo = document.getElementById('p-anexo-input');
    if (inputAnexo) {
        inputAnexo.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                adicionarAnexo();
            }
        });
    }

    // Enter nos inputs de prosa (tags e pessoas)
    const inputSinalProsa = document.getElementById('pr-sinal-input');
    if (inputSinalProsa) {
        inputSinalProsa.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                adicionarTagProsa();
            }
        });
    }
    const inputPessoaProsa = document.getElementById('pr-pessoa-input');
    if (inputPessoaProsa) {
        inputPessoaProsa.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                adicionarPessoaProsa();
            }
        });
    }
    const inputGeneroProsa = document.getElementById('pr-genero-input');
    if (inputGeneroProsa) {
        inputGeneroProsa.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                adicionarGeneroProsa();
            }
        });
    }
}
