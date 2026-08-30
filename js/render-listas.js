// ============================================================
// render-listas.js — Renderização das abas em lista/grid/tabela:
// Livros, Partes, Seções, Poemas e Prosas (ambas com seleção
// múltipla e ações em massa) e Elementos.
//
// Extraído de render.js — ver render-estrutura.js (árvore da aba
// "Estrutura") e render-lightbox.js (capas + lightbox, usado aqui
// via preencherCapas).
// ============================================================

import { db, save, deleteItemsEmMassa } from './db.js';
import {
    getElementHierarchy,
    getPosicaoElemento,
    filtrarTextos,
    filtrarPorConteudo,
    formatarDataParcial,
    formatarIntervaloEpocaRetratada,
    escapeHtml,
    sanitizarTextoRico,
    abrirModalConfirmacao,
    itemBateFiltroData,
    filtroDataVazio,
    itemFaltaDataParaFiltro,
    parseFiltroDataRapido,
    itemBateFiltroEpoca,
    itemFaltaEpocaParaFiltro,
} from './utils.js';
import { preencherCapas } from './render-lightbox.js';
import { DEFINICAO_COLUNAS, getColunasAtivas, renderSeletorColunas } from './colunas.js';
import { exportarSelecaoJson, exportarSelecaoMarkdown } from './exportar.js';

// Sempre que uma coluna é ligada/desligada (ver colunas.js) a tabela
// correspondente precisa recalcular cabeçalho + linhas.
window.addEventListener('colunas:alteradas', (ev) => {
    if (ev.detail?.tabela === 'poemas') renderPoemas();
    if (ev.detail?.tabela === 'prosas') renderProsas();
});

// Ícones dos botões Editar/Excluir dos cards e tabelas abaixo. Ficam como
// string pronta (em vez de gerar via DOM) porque entram direto nas
// template strings dos cards, junto com o resto do HTML.
const ICONE_EDITAR = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 inline-block" aria-hidden="true"><path d="M12.5 3.5l4 4L6.5 17.5H2.5v-4L12.5 3.5Z"/><path d="M10.5 5.5l4 4"/></svg>`;
const ICONE_EXCLUIR = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 inline-block" aria-hidden="true"><path d="M4 6h12"/><path d="M8 6V4.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V6"/><path d="M5.5 6l.6 9.5a1.5 1.5 0 0 0 1.5 1.4h4.8a1.5 1.5 0 0 0 1.5-1.4L14.5 6"/><path d="M8.5 9v5"/><path d="M11.5 9v5"/></svg>`;

let filtroPoemas = '';
let filtroProsas = '';
let filtroConteudoPoemas = '';
let filtroConteudoProsas = '';
let combinadorBuscaPoemas = 'e'; // 'e' (precisa bater nos dois campos) ou 'ou' (basta um)
let combinadorBuscaProsas = 'e';
let filtroLivroProsa = '';
let filtroLivroPoemas = '';

// Filtros de faixa de data (De/Até), independentes da busca por texto —
// ver itemBateFiltroData em utils.js pra semântica de sobreposição de
// faixas com datas parciais.
let filtroDataEscritaPoemas = filtroDataVazio();
let filtroDataPublicacaoPoemas = filtroDataVazio();
let filtroEpocaRetratadaPoemas = filtroDataVazio();
let filtroDataEscritaProsas = filtroDataVazio();
let filtroDataPublicacaoProsas = filtroDataVazio();
// Ordenação da tabela de Poemas — clicável pelo cabeçalho das colunas
// (ver thOrdenavel() e DEFINICAO_COLUNAS.poemas[].sortType). `campo` é a
// key da coluna ('titulo' pra a coluna fixa ID/Título, ou uma key de
// DEFINICAO_COLUNAS.poemas); 'estrutura' é o padrão (ordem já vem assim
// do array-base, sem sort adicional).
let ordenacaoPoemas = { campo: 'estrutura', direcao: 'asc' };
let statusPoemas = 'todos';
let selecaoPoemas = new Set();
let selecaoProsas = new Set();
let filtroLivroPartes = '';
let filtroLivroSecoes = '';
let filtroParteSecoes = '';
let filtroLivroElementos = '';

// ─── Paginação (Poemas e Prosas) ────────────────────────────────
// "Itens por página" é uma preferência única, compartilhada entre as
// duas abas (persistida no navegador) — cada aba mantém sua própria
// página atual, já que dependem de filtros diferentes.
const LS_KEY_ITENS_POR_PAGINA = 'arquivoPoetico_itensPorPagina';
const OPCOES_ITENS_POR_PAGINA = [25, 50, 100, 200];

function lerItensPorPaginaSalvo() {
    const bruto = localStorage.getItem(LS_KEY_ITENS_POR_PAGINA);
    if (bruto === 'todos') return Infinity;
    const n = parseInt(bruto);
    return OPCOES_ITENS_POR_PAGINA.includes(n) ? n : 50;
}

let itensPorPagina = lerItensPorPaginaSalvo();
let paginaPoemas = 1;
let paginaProsas = 1;

// Quantos itens ficaram de fora da lista atual só por não terem a data
// cadastrada que o filtro de data (ativo) precisaria pra avaliar —
// distinto de estarem fora da faixa pedida. Atualizado a cada
// getListaVisivelPoemas()/getListaVisivelProsas() e lido por
// renderPoemas()/renderProsas() pra exibir o aviso na tela.
let semDataPoemas = 0;
let semDataProsas = 0;

export function setFiltroLivroPartes(valor) {
    filtroLivroPartes = valor;
    renderPartes();
}

export function setFiltroLivroSecoes(valor) {
    filtroLivroSecoes = valor;
    filtroParteSecoes = ''; // muda o livro, reseta o filtro de parte
    popularFiltroParteSecoes();
    renderSecoes();
}

export function setFiltroParteSecoes(valor) {
    filtroParteSecoes = valor;
    renderSecoes();
}

export function setFiltroLivroElementos(valor) {
    filtroLivroElementos = valor;
    renderElementos();
}

function popularFiltroLivro(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    const valorAtual = sel.value;
    // Coletâneas excluídas: Partes, Seções, Elementos e Prosas pertencem
    // à hierarquia editorial, não à estrutura de curadoria das coletâneas.
    sel.innerHTML =
        '<option value="">-- Todos os livros --</option>' +
        db.livros
            .filter((l) => l.tipo !== 'Coletânea')
            .map((l) => `<option value="${l.id}">${escapeHtml(l.titulo)}</option>`)
            .join('');
    if (Array.from(sel.options).some((o) => o.value === valorAtual)) sel.value = valorAtual;
}

function popularFiltroParteSecoes() {
    const sel = document.getElementById('filtro-parte-secoes');
    if (!sel) return;
    const partes = filtroLivroSecoes
        ? db.partes.filter((p) => String(p.livroId) === String(filtroLivroSecoes))
        : db.partes;
    sel.innerHTML =
        '<option value="">-- Todas as partes --</option>' +
        partes.map((p) => `<option value="${p.id}">${escapeHtml(p.titulo)}</option>`).join('');
}

// Acha a qual Livro uma Seção pertence (direta ou via Parte)
function livroDaSecao(secao) {
    if (!secao) return null;
    if (secao.paiTipo === 'livro') return secao.paiId;
    const parte = db.partes.find((p) => p.id == secao.paiId);
    return parte ? parte.livroId : null;
}

// Acha a qual Livro um Elemento pertence, em qualquer dos 3 níveis
function livroDoElemento(el) {
    if (el.paiTipo === 'livro') return el.paiId;
    if (el.paiTipo === 'parte') {
        const p = db.partes.find((x) => x.id == el.paiId);
        return p ? p.livroId : null;
    }
    if (el.paiTipo === 'secao') {
        const s = db.secoes.find((x) => x.id == el.paiId);
        return s ? livroDaSecao(s) : null;
    }
    return null;
}

// Alias para prosas (mesma lógica)
const livroDaProsa = livroDoElemento;

// Resolve o livroId de um poema (direto, via parte ou via seção)
function livroDoPoema(p) {
    if (!p.paiTipo || !p.paiId) return null;
    if (p.paiTipo === 'livro') return p.paiId;
    if (p.paiTipo === 'parte') {
        const parte = db.partes.find((x) => x.id == p.paiId);
        return parte ? parte.livroId : null;
    }
    if (p.paiTipo === 'secao') {
        const s = db.secoes.find((x) => x.id == p.paiId);
        if (!s) return null;
        if (s.paiTipo === 'parte') {
            const pt = db.partes.find((x) => x.id == s.paiId);
            return pt ? pt.livroId : null;
        }
        return s.paiId;
    }
    return null;
}

// Combina o resultado da busca por metadados (filtrarTextos) com o da
// busca por conteúdo (filtrarPorConteudo). Só quando os dois campos têm
// algo digitado é que o combinador ('e' ou 'ou') realmente entra em jogo;
// com um só preenchido, o resultado é simplesmente o desse campo.
function combinarFiltrosBusca(decorada, filtroMeta, filtroConteudo, combinador) {
    const usaMeta = !!(filtroMeta && filtroMeta.trim());
    const usaConteudo = !!(filtroConteudo && filtroConteudo.trim());
    if (!usaMeta && !usaConteudo) return decorada;

    const idsMeta = usaMeta ? new Set(filtrarTextos(decorada, filtroMeta).map((p) => p.id)) : null;
    const idsConteudo = usaConteudo
        ? new Set(filtrarPorConteudo(decorada, filtroConteudo).map((p) => p.id))
        : null;

    return decorada.filter((p) => {
        if (usaMeta && usaConteudo) {
            const bateMeta = idsMeta.has(p.id);
            const bateConteudo = idsConteudo.has(p.id);
            return combinador === 'ou' ? bateMeta || bateConteudo : bateMeta && bateConteudo;
        }
        return usaMeta ? idsMeta.has(p.id) : idsConteudo.has(p.id);
    });
}

export function setFiltroPoemas(valor) {
    filtroPoemas = valor;
    paginaPoemas = 1;
    renderPoemas();
}

export function setFiltroProsas(valor) {
    filtroProsas = valor;
    paginaProsas = 1;
    renderProsas();
}

export function setFiltroConteudoPoemas(valor) {
    filtroConteudoPoemas = valor;
    paginaPoemas = 1;
    renderPoemas();
}

export function setFiltroConteudoProsas(valor) {
    filtroConteudoProsas = valor;
    paginaProsas = 1;
    renderProsas();
}

// Alterna entre 'e' (precisa bater nos dois campos de busca) e 'ou' (basta
// bater em um deles) — só faz diferença quando os dois campos têm algo
// digitado; com um só preenchido o resultado é o mesmo nos dois modos.
export function setCombinadorBuscaPoemas(valor) {
    combinadorBuscaPoemas = valor === 'ou' ? 'ou' : 'e';
    paginaPoemas = 1;
    renderPoemas();
}

export function setCombinadorBuscaProsas(valor) {
    combinadorBuscaProsas = valor === 'ou' ? 'ou' : 'e';
    paginaProsas = 1;
    renderProsas();
}

export function getCombinadorBuscaPoemas() {
    return combinadorBuscaPoemas;
}

export function getCombinadorBuscaProsas() {
    return combinadorBuscaProsas;
}

export function setFiltroLivroProsa(valor) {
    filtroLivroProsa = valor;
    paginaProsas = 1;
    renderProsas();
}

export function setFiltroLivroPoemas(valor) {
    filtroLivroPoemas = valor;
    paginaPoemas = 1;
    renderPoemas();
}

// Chamado ao clicar no cabeçalho de uma coluna ordenável da tabela de
// Poemas: clicar na coluna já ativa inverte a direção; clicar numa
// coluna diferente troca pra ela, começando em ordem ascendente.
export function ordenarPoemasPor(campo) {
    if (ordenacaoPoemas.campo === campo) {
        ordenacaoPoemas = {
            campo,
            direcao: ordenacaoPoemas.direcao === 'asc' ? 'desc' : 'asc',
        };
    } else {
        ordenacaoPoemas = { campo, direcao: 'asc' };
    }
    paginaPoemas = 1;
    renderPoemas();
}

export function setStatusPoemas(valor) {
    statusPoemas = valor;
    paginaPoemas = 1;
    renderPoemas();
}

// Chamado pelo <select> de "itens por página" — vale pra Poemas e Prosas
// ao mesmo tempo, já que é uma preferência única.
export function setItensPorPagina(valor) {
    itensPorPagina = valor === 'todos' ? Infinity : parseInt(valor);
    localStorage.setItem(LS_KEY_ITENS_POR_PAGINA, valor);
    paginaPoemas = 1;
    paginaProsas = 1;
    renderPoemas();
    renderProsas();
}

export function setPaginaPoemas(pagina) {
    paginaPoemas = pagina;
    renderPoemas();
}

export function setPaginaProsas(pagina) {
    paginaProsas = pagina;
    renderProsas();
}

// ─── Filtros de faixa de data (Escrita / Publicação) ───────────
// ladoFaixa: 'de' | 'ate' — parte: 'dia' | 'mes' | 'ano'
// Campo vazio remove a restrição daquela parte (não trava em 0).
function aplicarValorFiltroData(filtro, ladoFaixa, parte, valor) {
    const n = parseInt(valor);
    if (valor === '' || valor == null || isNaN(n)) delete filtro[ladoFaixa][parte];
    else filtro[ladoFaixa][parte] = n;
}

export function setFiltroDataEscritaPoemas(ladoFaixa, parte, valor) {
    aplicarValorFiltroData(filtroDataEscritaPoemas, ladoFaixa, parte, valor);
    paginaPoemas = 1;
    renderPoemas();
}

export function setFiltroDataPublicacaoPoemas(ladoFaixa, parte, valor) {
    aplicarValorFiltroData(filtroDataPublicacaoPoemas, ladoFaixa, parte, valor);
    paginaPoemas = 1;
    renderPoemas();
}

export function setFiltroEpocaRetratadaPoemas(ladoFaixa, parte, valor) {
    aplicarValorFiltroData(filtroEpocaRetratadaPoemas, ladoFaixa, parte, valor);
    paginaPoemas = 1;
    renderPoemas();
}

export function setFiltroDataEscritaProsas(ladoFaixa, parte, valor) {
    aplicarValorFiltroData(filtroDataEscritaProsas, ladoFaixa, parte, valor);
    paginaProsas = 1;
    renderProsas();
}

export function setFiltroDataPublicacaoProsas(ladoFaixa, parte, valor) {
    aplicarValorFiltroData(filtroDataPublicacaoProsas, ladoFaixa, parte, valor);
    paginaProsas = 1;
    renderProsas();
}

// ─── Atalho de digitação (ver parseFiltroDataRapido em utils.js) ──────
// Cada função abaixo corresponde a um dos 4 painéis de filtro de data
// já existentes (Poemas/Prosas × Escrita/Publicação). Texto não
// reconhecido não faz nada — não some com o que já estava filtrado.

export function setFiltroDataRapidoPoemasEscrita(valor) {
    const resultado = parseFiltroDataRapido(valor);
    if (resultado === null) return;
    filtroDataEscritaPoemas = resultado;
    preencherCamposDataNaTela('filtro-pd-esc', resultado);
    paginaPoemas = 1;
    renderPoemas();
}

export function setFiltroDataRapidoPoemasPublicacao(valor) {
    const resultado = parseFiltroDataRapido(valor);
    if (resultado === null) return;
    filtroDataPublicacaoPoemas = resultado;
    preencherCamposDataNaTela('filtro-pd-pub', resultado);
    paginaPoemas = 1;
    renderPoemas();
}

export function setFiltroDataRapidoProsasEscrita(valor) {
    const resultado = parseFiltroDataRapido(valor);
    if (resultado === null) return;
    filtroDataEscritaProsas = resultado;
    preencherCamposDataNaTela('filtro-prd-esc', resultado);
    paginaProsas = 1;
    renderProsas();
}

export function setFiltroDataRapidoProsasPublicacao(valor) {
    const resultado = parseFiltroDataRapido(valor);
    if (resultado === null) return;
    filtroDataPublicacaoProsas = resultado;
    preencherCamposDataNaTela('filtro-prd-pub', resultado);
    paginaProsas = 1;
    renderProsas();
}

export function setFiltroDataRapidoPoemasEpoca(valor) {
    const resultado = parseFiltroDataRapido(valor);
    if (resultado === null) return;
    filtroEpocaRetratadaPoemas = resultado;
    preencherCamposDataNaTela('filtro-pd-epo', resultado);
    paginaPoemas = 1;
    renderPoemas();
}

// Limpa os inputs de dia/mes/ano de um painel de filtro de data em tela
// (não mexe no estado — quem chama já reseta o objeto de filtro).
function limparCamposDataNaTela(prefixo) {
    ['de', 'ate'].forEach((ladoFaixa) => {
        ['dia', 'mes', 'ano'].forEach((parte) => {
            const el = document.getElementById(`${prefixo}-${ladoFaixa}-${parte}`);
            if (el) el.value = '';
        });
    });
}

// Preenche os inputs de dia/mes/ano de um painel de filtro de data em
// tela a partir de um objeto { de: {...}, ate: {...} } — usado pelo
// atalho de digitação (setFiltroDataRapido*) pra manter os campos
// avançados sincronizados com o que foi digitado, caso a pessoa abra o
// painel pra conferir ou ajustar manualmente depois.
function preencherCamposDataNaTela(prefixo, filtro) {
    ['de', 'ate'].forEach((ladoFaixa) => {
        ['dia', 'mes', 'ano'].forEach((parte) => {
            const el = document.getElementById(`${prefixo}-${ladoFaixa}-${parte}`);
            if (el) el.value = filtro[ladoFaixa][parte] ?? '';
        });
    });
}

// Mostra/esconde o avisinho de "N item(ns) fora só por falta de data"
// ao lado do botão "Filtrar por data" — fica visível mesmo com o painel
// de filtro recolhido, já que é justamente um alerta sobre um filtro
// que pode estar ativo sem estar visível na tela.
function atualizarAvisoSemData(elId, quantidade) {
    const el = document.getElementById(elId);
    if (!el) return;
    if (quantidade > 0) {
        const item = quantidade === 1 ? 'item' : 'itens';
        const verbo = quantidade === 1 ? 'ficou' : 'ficaram';
        el.textContent = `⚠️ ${quantidade} ${item} ${verbo} de fora só por falta de data cadastrada`;
        el.classList.remove('hidden');
    } else {
        el.classList.add('hidden');
    }
}

export function limparFiltroDataPoemas() {
    filtroDataEscritaPoemas = filtroDataVazio();
    filtroDataPublicacaoPoemas = filtroDataVazio();
    filtroEpocaRetratadaPoemas = filtroDataVazio();
    limparCamposDataNaTela('filtro-pd-esc');
    limparCamposDataNaTela('filtro-pd-pub');
    limparCamposDataNaTela('filtro-pd-epo');
    ['filtro-pd-esc-rapido', 'filtro-pd-pub-rapido', 'filtro-pd-epo-rapido'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    paginaPoemas = 1;
    renderPoemas();
}

export function limparFiltroDataProsas() {
    filtroDataEscritaProsas = filtroDataVazio();
    filtroDataPublicacaoProsas = filtroDataVazio();
    limparCamposDataNaTela('filtro-prd-esc');
    limparCamposDataNaTela('filtro-prd-pub');
    ['filtro-prd-esc-rapido', 'filtro-prd-pub-rapido'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    paginaProsas = 1;
    renderProsas();
}

// Retorna os títulos dos livros vinculados a um poema (via livrosIds)
function nomesLivros(p) {
    return (p.livrosIds || [])
        .map((id) => db.livros.find((l) => l.id == id)?.titulo)
        .filter(Boolean)
        .join(', ');
}

// Deriva, a partir do vínculo estrutural do item (paiTipo/paiId), os
// campos auxiliares usados pelo filtro por atributo "livro:"/"parte:"/
// "secao:" em filtrarTextos (utils.js). extraLivros é usado só pra
// Poemas, que também podem estar vinculados a outros livros/coletâneas
// via livrosIds (ver nomesLivros acima).
function decorarCamposBusca(item, extraLivros = '') {
    let livroTitulo = '',
        parteTitulo = '',
        secaoTitulo = '';

    if (item.paiTipo === 'livro') {
        livroTitulo = db.livros.find((l) => l.id == item.paiId)?.titulo || '';
    } else if (item.paiTipo === 'parte') {
        const parte = db.partes.find((p) => p.id == item.paiId);
        parteTitulo = parte?.titulo || '';
        if (parte) livroTitulo = db.livros.find((l) => l.id == parte.livroId)?.titulo || '';
    } else if (item.paiTipo === 'secao') {
        const secao = db.secoes.find((s) => s.id == item.paiId);
        secaoTitulo = secao?.titulo || '';
        if (secao?.paiTipo === 'parte') {
            const parte = db.partes.find((p) => p.id == secao.paiId);
            parteTitulo = parte?.titulo || '';
            if (parte) livroTitulo = db.livros.find((l) => l.id == parte.livroId)?.titulo || '';
        } else if (secao) {
            livroTitulo = db.livros.find((l) => l.id == secao.paiId)?.titulo || '';
        }
    }

    return {
        ...item,
        _buscaLivro: [livroTitulo, extraLivros].filter(Boolean).join(' '),
        _buscaParte: parteTitulo,
        _buscaSecao: secaoTitulo,
        _buscaIntertexto: Array.isArray(item.intertextualidade)
            ? item.intertextualidade.map((it) => `${it.tipo || ''} ${it.texto || ''}`).join(' ')
            : '',
        _buscaAnexos: Array.isArray(item.anexos)
            ? item.anexos.map((it) => `${it.tipo || ''} ${it.texto || ''} ${it.link || ''}`).join(' ')
            : '',
        _buscaAnotacoes: Array.isArray(item.anotacoesMarginais)
            ? item.anotacoesMarginais
                  .map((it) => `${it.trecho || ''} ${it.posicao || ''} ${it.fonte || ''} ${it.texto || ''}`)
                  .join(' ')
            : '',
        _buscaCortadoDe: item.cortadoDe
            ? `${item.cortadoDe.livro || ''} ${item.cortadoDe.secao || ''}`.trim()
            : '',
        _buscaLancadoEm: item.lancadoEm
            ? `${item.lancadoEm.livro || ''} ${item.lancadoEm.secao || ''}`.trim()
            : '',
    };
}

// ─── Colunas dinâmicas de Poemas/Prosas ────────────────────────

// Badges de etiqueta (reaproveitado nas colunas opcionais "Etiquetas" e
// "Gênero" — mesma lógica de string "a, b, c" → chips, cor customizável).
function badgesEtiquetas(
    sinalizacoes,
    corClasse = 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400',
) {
    if (!sinalizacoes) return '<span class="text-gray-300 dark:text-slate-600">—</span>';
    return (
        sinalizacoes
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
            .map(
                (t) =>
                    `<span class="text-[9px] ${corClasse} px-1.5 py-0.5 rounded mr-1 mb-1 inline-block">${escapeHtml(t)}</span>`,
            )
            .join('') || '<span class="text-gray-300 dark:text-slate-600">—</span>'
    );
}

// Títulos dos poemas referenciados por uma lista de IDs (Elos/Referências)
function titulosPoemasPorId(ids) {
    if (!ids || !ids.length) return '<span class="text-gray-300 dark:text-slate-600">—</span>';
    const titulos = ids.map((id) => db.poemas.find((p) => p.id == id)?.titulo).filter(Boolean);
    if (!titulos.length) return '<span class="text-gray-300 dark:text-slate-600">—</span>';
    return titulos.map((t) => escapeHtml(t)).join(', ');
}

function trechoNota(notas) {
    if (!notas) return '<span class="text-gray-300 dark:text-slate-600">—</span>';
    const limpo = notas.trim();
    const trecho = limpo.length > 80 ? limpo.slice(0, 80) + '…' : limpo;
    return `<span title="${escapeHtml(limpo)}">${escapeHtml(trecho)}</span>`;
}

// Monta o <thead> de Poemas ou Prosas de acordo com as colunas ativas.
// `celulaCheck`/`celulaTitulo`/`celulaAcoes` são o HTML fixo de início/fim
// (checkbox, título e Ações), que não passam pelo seletor de colunas.
// Monta a barra de paginação (itens por página + Anterior/Próxima) exibida
// abaixo da tabela. totalItens é o total já filtrado (não só o da página).
function montarPaginacao(totalItens, paginaAtual, acaoPagina) {
    if (totalItens === 0) return '';

    const porPagina = itensPorPagina === Infinity ? totalItens : itensPorPagina;
    const totalPaginas =
        itensPorPagina === Infinity ? 1 : Math.max(1, Math.ceil(totalItens / itensPorPagina));
    const inicio = (paginaAtual - 1) * porPagina + 1;
    const fim = Math.min(paginaAtual * porPagina, totalItens);

    const seletor = `
        <label class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
            Itens por página:
            <select onchange="setItensPorPagina(this.value)"
                class="border border-gray-300 dark:border-slate-600 dark:bg-slate-800 rounded px-1.5 py-1 text-xs">
                ${OPCOES_ITENS_POR_PAGINA.map((n) => `<option value="${n}" ${itensPorPagina === n ? 'selected' : ''}>${n}</option>`).join('')}
                <option value="todos" ${itensPorPagina === Infinity ? 'selected' : ''}>Todos</option>
            </select>
        </label>`;

    const navegacao =
        totalPaginas > 1
            ? `
        <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
            <button data-action="${acaoPagina}" data-pagina="${paginaAtual - 1}" ${paginaAtual <= 1 ? 'disabled' : ''}
                class="px-2 py-1 border border-gray-300 dark:border-slate-600 rounded disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700">‹ Anterior</button>
            <span>Página ${paginaAtual} de ${totalPaginas}</span>
            <button data-action="${acaoPagina}" data-pagina="${paginaAtual + 1}" ${paginaAtual >= totalPaginas ? 'disabled' : ''}
                class="px-2 py-1 border border-gray-300 dark:border-slate-600 rounded disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700">Próxima ›</button>
        </div>`
            : '<span></span>';

    return `
        <div class="flex flex-wrap items-center justify-between gap-3 mt-3 px-1">
            ${seletor}
            <span class="text-xs text-gray-400 dark:text-slate-500">${inicio}–${fim} de ${totalItens}</span>
            ${navegacao}
        </div>`;
}

// Seta indicando a coluna ativa e sua direção — ou um ícone neutro (↕)
// nas demais colunas ordenáveis, pra sinalizar que também dá pra clicar
// nelas.
function iconeOrdenacao(ativo, direcao) {
    if (!ativo) return '<span class="inline-block w-3 text-gray-300 dark:text-slate-600">↕</span>';
    return `<span class="inline-block w-3 text-blue-600 dark:text-blue-400">${direcao === 'asc' ? '▲' : '▼'}</span>`;
}

// <th> clicável: alterna a ordenação da tabela de Poemas pra essa coluna
// (ver ordenarPoemasPor). `campo` é a key usada em COMPARADORES_ORDENACAO_POEMAS
// (ou 'titulo'/'estrutura', os dois casos especiais).
// `sticky top-0` vai direto em cada <th> (não no <thead>, nem no <tr>) —
// em vários navegadores, sticky em table-row-group/table-row é ignorado ou
// inconsistente, ainda mais combinado com border-collapse; em <th>
// (table-cell) funciona de forma confiável, então é aí que a regra mora.
function thOrdenavel(campo, label, estado, classeExtra = '') {
    const ativo = estado.campo === campo;
    return `<th class="p-4 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-20 bg-gray-100 dark:bg-slate-700 ${classeExtra}">
        <button type="button" onclick="ordenarPoemasPor('${campo}')"
            class="flex items-center gap-1 font-semibold hover:text-blue-600 dark:hover:text-blue-400 select-none"
            title="Ordenar por ${escapeHtml(label)}">
            <span>${label}</span>
            ${iconeOrdenacao(ativo, estado.direcao)}
        </button>
    </th>`;
}

function montarCabecalho(tabela, celulaCheck, celulaTitulo, celulaAcoes) {
    const ativas = getColunasAtivas(tabela);
    const def = DEFINICAO_COLUNAS[tabela];

    // Só Poemas tem cabeçalho clicável por enquanto (ver DEFINICAO_COLUNAS —
    // é a única tabela cujas colunas têm sortType definido).
    if (tabela === 'poemas') {
        const tituloOrdenavel = thOrdenavel('titulo', 'ID / Título', ordenacaoPoemas, 'left-8');
        const meio = ativas
            .map((key) => def.find((c) => c.key === key))
            .filter(Boolean)
            .map((c) => thOrdenavel(c.key, c.label, ordenacaoPoemas))
            .join('');
        return celulaCheck + tituloOrdenavel + meio + celulaAcoes;
    }

    const meio = ativas
        .map((key) => def.find((c) => c.key === key))
        .filter(Boolean)
        .map(
            (c) =>
                `<th class="p-4 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-20 bg-gray-100 dark:bg-slate-700">${c.label}</th>`,
        )
        .join('');
    return celulaCheck + celulaTitulo + meio + celulaAcoes;
}

function atualizarPainelColunas(tabela, painelId) {
    const painel = document.getElementById(painelId);
    if (painel) painel.innerHTML = renderSeletorColunas(tabela);
}

// ─── Seleção múltipla de Poemas (ações em massa) ──────────────

// Retorna a lista de poemas atualmente visível, já com status, busca
// (incluindo nomes de livros) e ordenação aplicados — usada tanto pela
// renderização quanto pela seleção em massa, pra ficarem sempre coerentes.
function getListaVisivelPoemas() {
    let base = db.poemas;
    if (statusPoemas === 'publicados') base = base.filter((p) => p.status === 'publicado');
    else if (statusPoemas === 'nao-publicados') base = base.filter((p) => p.status !== 'publicado');
    else if (statusPoemas === 'completos') base = base.filter((p) => p.status === 'completo');
    else if (statusPoemas === 'incompletos') base = base.filter((p) => p.status === 'incompleto');
    else if (statusPoemas === 'migrados') base = base.filter((p) => p.status === 'migrado');
    else if (statusPoemas === 'descartados') base = base.filter((p) => p.status === 'descartado');

    if (filtroLivroPoemas) {
        const livroSel = db.livros.find((l) => String(l.id) === String(filtroLivroPoemas));
        if (livroSel?.tipo === 'Coletânea') {
            // Poemas numa coletânea vivem em itensColetanea (via refId), não em paiId
            const partesIds = new Set(
                db.partes
                    .filter((p) => String(p.livroId) === String(filtroLivroPoemas))
                    .map((p) => String(p.id)),
            );
            const refIds = new Set(
                (db.itensColetanea || [])
                    .filter(
                        (i) => partesIds.has(String(i.parteId)) && i.refTipo === 'poema' && i.refId,
                    )
                    .map((i) => String(i.refId)),
            );
            base = base.filter((p) => refIds.has(String(p.id)));
        } else {
            base = base.filter((p) => String(livroDoPoema(p)) === String(filtroLivroPoemas));
        }
    }

    const decorada = base.map((p) => {
        const _livros = nomesLivros(p);
        return decorarCamposBusca({ ...p, _livros }, _livros);
    });
    let lista = combinarFiltrosBusca(
        decorada,
        filtroPoemas,
        filtroConteudoPoemas,
        combinadorBuscaPoemas,
    );

    semDataPoemas = lista.filter(
        (p) =>
            itemFaltaDataParaFiltro(p.dataEscrita, filtroDataEscritaPoemas) ||
            itemFaltaDataParaFiltro(p.dataPublicacao, filtroDataPublicacaoPoemas) ||
            itemFaltaEpocaParaFiltro(p.epocaRetratada, filtroEpocaRetratadaPoemas),
    ).length;

    lista = lista.filter(
        (p) =>
            itemBateFiltroData(p.dataEscrita, filtroDataEscritaPoemas) &&
            itemBateFiltroData(p.dataPublicacao, filtroDataPublicacaoPoemas) &&
            itemBateFiltroEpoca(p.epocaRetratada, filtroEpocaRetratadaPoemas),
    );

    if (ordenacaoPoemas.campo === 'estrutura') {
        // Ordem padrão = a ordem em que a lista já veio (estrutura); desc
        // é só ela invertida, não precisa de comparador.
        if (ordenacaoPoemas.direcao === 'desc') lista = [...lista].reverse();
    } else {
        const comparador = COMPARADORES_ORDENACAO_POEMAS[ordenacaoPoemas.campo];
        if (comparador) {
            const asc = ordenacaoPoemas.direcao === 'asc';
            lista = [...lista].sort((a, b) => comparador(a, b, asc));
        }
    }
    return lista;
}

// Comparador cronológico genérico (ano/mês/dia parciais) — usado pelas
// colunas "Escrito em" e "Publicação". Datas ausentes sempre vão pro
// fim, independente da direção pedida.
function compararPorData(pegarData) {
    return (a, b, asc) => compararDatasParciais(pegarData(a), pegarData(b), asc);
}

// Comparação cronológica de duas datas parciais (dia/mês/ano, cada um
// opcional) — núcleo comum reaproveitado tanto por compararPorData
// (um único campo de data) quanto por compararPorEpocaRetratada (que
// precisa comparar dois campos, De e Até, em sequência).
//
// `ausenteComoMinimo` decide o que um mês/dia em branco representa: por
// padrão (false — usado por Escrita/Publicação e pelo "Até" da Época
// Retratada) um sub-campo ausente é tratado como o valor MÁXIMO dentro
// do mês/ano conhecido (ex.: só o ano preenchido soa como "aconteceu no
// fim daquele ano"; um "Até" só com mês soa como "durou até o fim do
// mês"). Já pro "De" de um intervalo o raciocínio é o oposto: "não sei o
// dia exato" deveria, na dúvida, contar como o começo mais cedo
// possível — por isso compararPorEpocaRetratada passa true ali.
function compararDatasParciais(da, db_, asc, ausenteComoMinimo = false) {
    if (!da && !db_) return 0;
    if (!da) return 1;
    if (!db_) return -1;
    if (da.ano !== db_.ano) return asc ? da.ano - db_.ano : db_.ano - da.ano;
    const ausente = ausenteComoMinimo ? -Infinity : Infinity;
    const mA = da.mes ?? ausente,
        mB = db_.mes ?? ausente;
    if (mA !== mB) return asc ? mA - mB : mB - mA;
    const dA = da.dia ?? ausente,
        dB = db_.dia ?? ausente;
    if (dA !== dB) return asc ? dA - dB : dB - dA;
    return 0;
}

// Comparador alfabético genérico (pt-BR, insensível a maiúscula/acento)
// — usado por Título, Elos, Referências, Etiquetas e Notas. Vazio sempre
// vai pro fim, independente da direção.
function compararPorTexto(pegarTexto) {
    return (a, b, asc) => {
        const ta = (pegarTexto(a) || '').trim();
        const tb = (pegarTexto(b) || '').trim();
        if (!ta && !tb) return 0;
        if (!ta) return 1;
        if (!tb) return -1;
        const r = ta.localeCompare(tb, 'pt-BR', { sensitivity: 'base' });
        return asc ? r : -r;
    };
}

// Sem uma ordem "natural" entre os status (não é alfabético nem
// cronológico), então esse é só um critério fixo e arbitrário, mas
// consistente, do "menos pronto" ao "mais pronto".
const ORDEM_STATUS = { incompleto: 0, completo: 1, publicado: 2, migrado: 3, descartado: 4 };
function compararPorStatus(a, b, asc) {
    const sa = ORDEM_STATUS[a.status] ?? 1;
    const sb = ORDEM_STATUS[b.status] ?? 1;
    return asc ? sa - sb : sb - sa;
}

// Texto puro (sem HTML) dos títulos ligados por Elos/Referências — usado
// só pra ordenação; a célula em si (titulosPoemasPorId) escapa e formata
// à parte.
function textoTitulosPoemasPorId(ids) {
    if (!ids || !ids.length) return '';
    return ids
        .map((id) => db.poemas.find((p) => p.id == id)?.titulo)
        .filter(Boolean)
        .join(', ');
}

// Época Retratada ordena pelo início do intervalo ("De") e, quando dois
// itens empatam nele (mesmo mês/ano, ou ambos em branco), desempata pelo
// fim ("Até") — sem isso, poemas com o mesmo "De" mas "Até" bem
// diferentes ficavam embaralhados entre si, na ordem de inserção. N/A e
// "sem época atribuída" contam igualmente como "sem valor", então ambos
// vão pro fim, independente da direção.
//
// O "De" usa ausenteComoMinimo=true (mês/dia em branco = "começou o mais
// cedo possível"); o "Até" usa o padrão (mês/dia em branco = "durou até
// o mais tarde possível") — senão um período só com mês/ano no "De"
// (ex.: "02/2023") aparecia ordenado depois de outro que já tem o dia
// exato no mesmo mês, quando na verdade pode ter começado antes.
function compararPorEpocaRetratada(a, b, asc) {
    const ea = a.epocaRetratada && !a.epocaRetratada.na ? a.epocaRetratada : null;
    const eb = b.epocaRetratada && !b.epocaRetratada.na ? b.epocaRetratada : null;
    if (!ea && !eb) return 0;
    if (!ea) return 1;
    if (!eb) return -1;
    const porInicio = compararDatasParciais(ea.inicio, eb.inicio, asc, true);
    if (porInicio !== 0) return porInicio;
    return compararDatasParciais(ea.fim, eb.fim, asc);
}

const COMPARADORES_ORDENACAO_POEMAS = {
    titulo: compararPorTexto((p) => p.titulo),
    dataEscrita: compararPorData((p) => p.dataEscrita),
    dataPublicacao: compararPorData((p) => p.dataPublicacao),
    epocaRetratada: compararPorEpocaRetratada,
    status: compararPorStatus,
    pessoas: compararPorTexto((p) => p.pessoas),
    elos: compararPorTexto((p) => textoTitulosPoemasPorId(p.conceitos?.elos)),
    referencias: compararPorTexto((p) => textoTitulosPoemasPorId(p.conceitos?.referencias)),
    intertextualidade: compararPorTexto((p) =>
        Array.isArray(p.intertextualidade)
            ? p.intertextualidade.map((it) => it.texto).join(' ')
            : '',
    ),
    anexos: compararPorTexto((p) =>
        Array.isArray(p.anexos) ? p.anexos.map((it) => it.texto).join(' ') : '',
    ),
    anexosNotaGeral: compararPorTexto((p) => p.anexosNotaGeral),
    anotacoesMarginais: compararPorTexto((p) =>
        Array.isArray(p.anotacoesMarginais) ? p.anotacoesMarginais.map((it) => it.texto).join(' ') : '',
    ),
    descricaoVisual: compararPorTexto((p) => p.descricaoVisual),
    contextoHistorico: compararPorTexto((p) => p.contextoHistorico),
    etiquetas: compararPorTexto((p) => p.sinalizacoes),
    notas: compararPorTexto((p) => p.notas),
    ocultacao: compararPorTexto((p) => p.ocultacao),
    conteudoSensivel: compararPorTexto((p) => p.conteudoSensivel),
    vocabularioHiperacionante: compararPorTexto((p) => p.vocabularioHiperacionante),
    cortadoDe: compararPorTexto((p) => [p.cortadoDe?.livro, p.cortadoDe?.secao].filter(Boolean).join(' ')),
    lancadoEm: compararPorTexto((p) => [p.lancadoEm?.livro, p.lancadoEm?.secao].filter(Boolean).join(' ')),
    descarte: compararPorTexto((p) => p.descarte),
};

export function toggleSelecaoPoema(checked, id) {
    if (checked) selecaoPoemas.add(id);
    else selecaoPoemas.delete(id);
    atualizarBarraSelecao();
}

export function toggleSelecaoTodosPoemas(checked) {
    const visiveis = getListaVisivelPoemas().map((p) => p.id);
    if (checked) visiveis.forEach((id) => selecaoPoemas.add(id));
    else visiveis.forEach((id) => selecaoPoemas.delete(id));
    renderPoemas();
}

export function limparSelecaoPoemas() {
    selecaoPoemas.clear();
    renderPoemas();
}

function atualizarBarraSelecao() {
    const barra = document.getElementById('barra-acoes-poemas');
    const contador = document.getElementById('contador-selecao-poemas');
    if (!barra) return;
    if (selecaoPoemas.size > 0) {
        barra.classList.remove('hidden');
        if (contador) contador.innerText = `${selecaoPoemas.size} selecionado(s)`;
    } else {
        barra.classList.add('hidden');
    }
}

function adicionarValorEmCampo(poema, campo, valorNovo) {
    const atuais = poema[campo]
        ? poema[campo]
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
        : [];
    if (!atuais.includes(valorNovo)) atuais.push(valorNovo);
    poema[campo] = atuais.join(', ');
}

function removerValorDeCampo(poema, campo, valor) {
    if (!poema[campo]) return;
    const atuais = poema[campo]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    poema[campo] = atuais.filter((v) => v !== valor).join(', ');
}

export function aplicarPessoaEmMassa() {
    const input = document.getElementById('bulk-pessoa-input');
    const nome = (input?.value || '').trim();
    if (!nome || selecaoPoemas.size === 0) return;

    const n = selecaoPoemas.size;
    abrirModalConfirmacao({
        titulo: `Dedicar a "${nome}"`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai adicionar "${nome}" aos dedicados de ${n} poema${n !== 1 ? 's' : ''} selecionado${n !== 1 ? 's' : ''}.`,
        textoConfirmar: 'Aplicar',
        corConfirmar: '#e11d48',
        onConfirmar: () => {
            db.poemas.forEach((p) => {
                if (selecaoPoemas.has(p.id)) adicionarValorEmCampo(p, 'pessoas', nome);
            });
            if (input) input.value = '';
            selecaoPoemas.clear();
            save(); // dispara re-render via evento db:saved
        },
    });
}

export function removerPessoaEmMassa() {
    const input = document.getElementById('bulk-pessoa-input');
    const nome = (input?.value || '').trim();
    if (!nome || selecaoPoemas.size === 0) return;

    const n = selecaoPoemas.size;
    abrirModalConfirmacao({
        titulo: `Remover "${nome}"`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai remover "${nome}" dos dedicados de ${n} poema${n !== 1 ? 's' : ''} selecionado${n !== 1 ? 's' : ''}.`,
        textoConfirmar: 'Remover',
        corConfirmar: '#dc2626',
        onConfirmar: () => {
            db.poemas.forEach((p) => {
                if (selecaoPoemas.has(p.id)) removerValorDeCampo(p, 'pessoas', nome);
            });
            if (input) input.value = '';
            selecaoPoemas.clear();
            save();
        },
    });
}

export function aplicarSinalEmMassa() {
    const input = document.getElementById('bulk-sinal-input');
    const tag = (input?.value || '').trim();
    if (!tag || selecaoPoemas.size === 0) return;

    const n = selecaoPoemas.size;
    abrirModalConfirmacao({
        titulo: `Marcar "${tag}"`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai adicionar a sinalização "${tag}" a ${n} poema${n !== 1 ? 's' : ''} selecionado${n !== 1 ? 's' : ''}.`,
        textoConfirmar: 'Aplicar',
        corConfirmar: '#2563eb',
        onConfirmar: () => {
            db.poemas.forEach((p) => {
                if (selecaoPoemas.has(p.id)) adicionarValorEmCampo(p, 'sinalizacoes', tag);
            });
            if (input) input.value = '';
            selecaoPoemas.clear();
            save();
        },
    });
}

export function removerSinalEmMassa() {
    const input = document.getElementById('bulk-sinal-input');
    const tag = (input?.value || '').trim();
    if (!tag || selecaoPoemas.size === 0) return;

    const n = selecaoPoemas.size;
    abrirModalConfirmacao({
        titulo: `Remover "${tag}"`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai remover a sinalização "${tag}" de ${n} poema${n !== 1 ? 's' : ''} selecionado${n !== 1 ? 's' : ''}.`,
        textoConfirmar: 'Remover',
        corConfirmar: '#dc2626',
        onConfirmar: () => {
            db.poemas.forEach((p) => {
                if (selecaoPoemas.has(p.id)) removerValorDeCampo(p, 'sinalizacoes', tag);
            });
            if (input) input.value = '';
            selecaoPoemas.clear();
            save();
        },
    });
}

// Exclusão em massa dos poemas selecionados. A remoção de fato (e o
// "Desfazer" com um único toast pro lote inteiro) fica em
// deleteItemsEmMassa (db.js) — aqui só confirma com a pessoa e limpa a
// seleção depois. Não precisa re-renderizar manualmente: deleteItemsEmMassa
// chama save(), que dispara 'db:saved' -> renderLists() -> renderPoemas(),
// que já esconde a barra de seleção sozinho (ver atualizarBarraSelecao()).
export function excluirSelecaoPoemas() {
    if (selecaoPoemas.size === 0) return;
    const n = selecaoPoemas.size;
    abrirModalConfirmacao({
        titulo: `Excluir ${n} poema${n !== 1 ? 's' : ''}`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai excluir ${n} poema${n !== 1 ? 's' : ''} selecionado${n !== 1 ? 's' : ''}. Vai aparecer um "Desfazer" logo em seguida, caso mude de ideia.`,
        textoConfirmar: 'Excluir',
        corConfirmar: '#dc2626',
        onConfirmar: () => {
            deleteItemsEmMassa('poemas', [...selecaoPoemas]);
            selecaoPoemas.clear();
        },
    });
}

// Exporta só os poemas marcados na tabela — diferente da aba Exportação,
// que filtra por atributos (pessoa/tema/data/status), aqui é exatamente
// a seleção feita na listagem. Não limpa a seleção depois: exportar não
// é destrutivo, então a pessoa pode baixar em JSON e depois em MD sem
// re-marcar tudo de novo.
export function exportarSelecaoPoemasJson() {
    exportarSelecaoJson('poema', [...selecaoPoemas]);
}
export function exportarSelecaoPoemasMarkdown() {
    exportarSelecaoMarkdown('poema', [...selecaoPoemas]);
}

// ─── Datas em massa (Poemas): Escrita / Publicação ─────────────
// Mesma mecânica da versão de Prosas logo abaixo — ver os comentários lá.
export function aplicarDataEmMassa() {
    if (selecaoPoemas.size === 0) return;
    const tipo = document.getElementById('bulk-data-tipo')?.value || 'escrita';
    const parcial = lerDataParcialBulk('bulk-data');
    if (!Object.keys(parcial).length) return;

    const campo = tipo === 'publicacao' ? 'dataPublicacao' : 'dataEscrita';
    const rotuloCampo = rotuloTipoData(tipo);
    const exataChecked = !!document.getElementById('bulk-data-exata')?.checked;

    const partes = ['dia', 'mes', 'ano']
        .filter((c) => parcial[c] != null)
        .map((c) => `${c === 'mes' ? 'mês' : c} ${parcial[c]}`);

    const n = selecaoPoemas.size;
    abrirModalConfirmacao({
        titulo: `Definir ${rotuloCampo.toLowerCase()}`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai definir ${partes.join(', ')} na ${rotuloCampo} de ${n} poema${n !== 1 ? 's' : ''} selecionado${n !== 1 ? 's' : ''}, mantendo os demais campos da data (se já preenchidos em cada um).`,
        textoConfirmar: 'Aplicar',
        corConfirmar: '#2563eb',
        onConfirmar: () => {
            db.poemas.forEach((p) => {
                if (!selecaoPoemas.has(p.id)) return;
                const atual = { ...(p[campo] || {}), ...parcial };
                if (campo === 'dataEscrita') atual.exata = exataChecked;
                p[campo] = atual;
                // p.ano espelha dataEscrita.ano por compatibilidade (ver forms.js)
                if (campo === 'dataEscrita') p.ano = atual.ano || '';
            });
            selecaoPoemas.clear();
            save();
        },
    });
}

export function limparDataEmMassa() {
    if (selecaoPoemas.size === 0) return;
    const tipo = document.getElementById('bulk-data-tipo')?.value || 'escrita';
    const campo = tipo === 'publicacao' ? 'dataPublicacao' : 'dataEscrita';
    const rotuloCampo = rotuloTipoData(tipo);

    const n = selecaoPoemas.size;
    abrirModalConfirmacao({
        titulo: `Limpar ${rotuloCampo.toLowerCase()}`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai apagar a ${rotuloCampo} de ${n} poema${n !== 1 ? 's' : ''} selecionado${n !== 1 ? 's' : ''}.`,
        textoConfirmar: 'Limpar',
        corConfirmar: '#dc2626',
        onConfirmar: () => {
            db.poemas.forEach((p) => {
                if (!selecaoPoemas.has(p.id)) return;
                p[campo] = null;
                if (campo === 'dataEscrita') p.ano = '';
            });
            selecaoPoemas.clear();
            save();
        },
    });
}

// ─── Seleção múltipla de Prosas (ações em massa) ──────────────
// Mesma lógica da seleção de Poemas acima, adaptada pra Prosas.

// Retorna a lista de prosas atualmente visível (livro/coletânea +
// busca já aplicados) — usada tanto pela renderização quanto pela
// seleção em massa, pra ficarem sempre coerentes.
function getListaVisivelProsas() {
    let base = db.prosas;
    if (filtroLivroProsa) {
        const livroSel = db.livros.find((l) => String(l.id) === String(filtroLivroProsa));
        if (livroSel?.tipo === 'Coletânea') {
            // Prosas numa coletânea vivem em itensColetanea (via refId), não em paiId
            const partesIds = new Set(
                db.partes
                    .filter((p) => String(p.livroId) === String(filtroLivroProsa))
                    .map((p) => String(p.id)),
            );
            const refIds = new Set(
                (db.itensColetanea || [])
                    .filter(
                        (i) => partesIds.has(String(i.parteId)) && i.refTipo === 'prosa' && i.refId,
                    )
                    .map((i) => String(i.refId)),
            );
            base = base.filter((pr) => refIds.has(String(pr.id)));
        } else {
            base = base.filter((pr) => String(livroDaProsa(pr)) === String(filtroLivroProsa));
        }
    }
    const decorada = base.map((pr) => decorarCamposBusca(pr));
    let lista = combinarFiltrosBusca(
        decorada,
        filtroProsas,
        filtroConteudoProsas,
        combinadorBuscaProsas,
    );

    semDataProsas = lista.filter(
        (pr) =>
            itemFaltaDataParaFiltro(pr.dataEscrita, filtroDataEscritaProsas) ||
            itemFaltaDataParaFiltro(pr.dataPublicacao, filtroDataPublicacaoProsas),
    ).length;

    lista = lista.filter(
        (pr) =>
            itemBateFiltroData(pr.dataEscrita, filtroDataEscritaProsas) &&
            itemBateFiltroData(pr.dataPublicacao, filtroDataPublicacaoProsas),
    );
    return lista;
}

export function toggleSelecaoProsa(checked, id) {
    if (checked) selecaoProsas.add(id);
    else selecaoProsas.delete(id);
    atualizarBarraSelecaoProsas();
}

export function toggleSelecaoTodosProsas(checked) {
    const visiveis = getListaVisivelProsas().map((pr) => pr.id);
    if (checked) visiveis.forEach((id) => selecaoProsas.add(id));
    else visiveis.forEach((id) => selecaoProsas.delete(id));
    renderProsas();
}

export function limparSelecaoProsas() {
    selecaoProsas.clear();
    renderProsas();
}

function atualizarBarraSelecaoProsas() {
    const barra = document.getElementById('barra-acoes-prosas');
    const contador = document.getElementById('contador-selecao-prosas');
    if (!barra) return;
    if (selecaoProsas.size > 0) {
        barra.classList.remove('hidden');
        if (contador) contador.innerText = `${selecaoProsas.size} selecionada(s)`;
    } else {
        barra.classList.add('hidden');
    }
}

export function aplicarPessoaEmMassaProsa() {
    const input = document.getElementById('bulk-pessoa-input-prosa');
    const nome = (input?.value || '').trim();
    if (!nome || selecaoProsas.size === 0) return;

    const n = selecaoProsas.size;
    abrirModalConfirmacao({
        titulo: `Dedicar a "${nome}"`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai adicionar "${nome}" aos dedicados de ${n} prosa${n !== 1 ? 's' : ''} selecionada${n !== 1 ? 's' : ''}.`,
        textoConfirmar: 'Aplicar',
        corConfirmar: '#e11d48',
        onConfirmar: () => {
            db.prosas.forEach((pr) => {
                if (selecaoProsas.has(pr.id)) adicionarValorEmCampo(pr, 'pessoas', nome);
            });
            if (input) input.value = '';
            selecaoProsas.clear();
            save(); // dispara re-render via evento db:saved
        },
    });
}

export function removerPessoaEmMassaProsa() {
    const input = document.getElementById('bulk-pessoa-input-prosa');
    const nome = (input?.value || '').trim();
    if (!nome || selecaoProsas.size === 0) return;

    const n = selecaoProsas.size;
    abrirModalConfirmacao({
        titulo: `Remover "${nome}"`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai remover "${nome}" dos dedicados de ${n} prosa${n !== 1 ? 's' : ''} selecionada${n !== 1 ? 's' : ''}.`,
        textoConfirmar: 'Remover',
        corConfirmar: '#dc2626',
        onConfirmar: () => {
            db.prosas.forEach((pr) => {
                if (selecaoProsas.has(pr.id)) removerValorDeCampo(pr, 'pessoas', nome);
            });
            if (input) input.value = '';
            selecaoProsas.clear();
            save();
        },
    });
}

export function aplicarSinalEmMassaProsa() {
    const input = document.getElementById('bulk-sinal-input-prosa');
    const tag = (input?.value || '').trim();
    if (!tag || selecaoProsas.size === 0) return;

    const n = selecaoProsas.size;
    abrirModalConfirmacao({
        titulo: `Marcar "${tag}"`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai adicionar a sinalização "${tag}" a ${n} prosa${n !== 1 ? 's' : ''} selecionada${n !== 1 ? 's' : ''}.`,
        textoConfirmar: 'Aplicar',
        corConfirmar: '#2563eb',
        onConfirmar: () => {
            db.prosas.forEach((pr) => {
                if (selecaoProsas.has(pr.id)) adicionarValorEmCampo(pr, 'sinalizacoes', tag);
            });
            if (input) input.value = '';
            selecaoProsas.clear();
            save();
        },
    });
}

export function removerSinalEmMassaProsa() {
    const input = document.getElementById('bulk-sinal-input-prosa');
    const tag = (input?.value || '').trim();
    if (!tag || selecaoProsas.size === 0) return;

    const n = selecaoProsas.size;
    abrirModalConfirmacao({
        titulo: `Remover "${tag}"`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai remover a sinalização "${tag}" de ${n} prosa${n !== 1 ? 's' : ''} selecionada${n !== 1 ? 's' : ''}.`,
        textoConfirmar: 'Remover',
        corConfirmar: '#dc2626',
        onConfirmar: () => {
            db.prosas.forEach((pr) => {
                if (selecaoProsas.has(pr.id)) removerValorDeCampo(pr, 'sinalizacoes', tag);
            });
            if (input) input.value = '';
            selecaoProsas.clear();
            save();
        },
    });
}

export function aplicarGeneroEmMassaProsa() {
    const input = document.getElementById('bulk-genero-input-prosa');
    const genero = (input?.value || '').trim();
    if (!genero || selecaoProsas.size === 0) return;

    const n = selecaoProsas.size;
    abrirModalConfirmacao({
        titulo: `Marcar "${genero}"`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai adicionar o gênero "${genero}" a ${n} prosa${n !== 1 ? 's' : ''} selecionada${n !== 1 ? 's' : ''}.`,
        textoConfirmar: 'Aplicar',
        corConfirmar: '#d97706',
        onConfirmar: () => {
            db.prosas.forEach((pr) => {
                if (selecaoProsas.has(pr.id)) adicionarValorEmCampo(pr, 'genero', genero);
            });
            if (input) input.value = '';
            selecaoProsas.clear();
            save();
        },
    });
}

export function removerGeneroEmMassaProsa() {
    const input = document.getElementById('bulk-genero-input-prosa');
    const genero = (input?.value || '').trim();
    if (!genero || selecaoProsas.size === 0) return;

    const n = selecaoProsas.size;
    abrirModalConfirmacao({
        titulo: `Remover "${genero}"`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai remover o gênero "${genero}" de ${n} prosa${n !== 1 ? 's' : ''} selecionada${n !== 1 ? 's' : ''}.`,
        textoConfirmar: 'Remover',
        corConfirmar: '#dc2626',
        onConfirmar: () => {
            db.prosas.forEach((pr) => {
                if (selecaoProsas.has(pr.id)) removerValorDeCampo(pr, 'genero', genero);
            });
            if (input) input.value = '';
            selecaoProsas.clear();
            save();
        },
    });
}

// ─── Datas em massa (Prosas): Escrita / Publicação ─────────────
// Diferente das tags acima, aqui o valor não é uma string "a, b, c" e
// sim um objeto parcial { dia?, mes?, ano? }. Só os subcampos
// preenchidos no formulário de massa são aplicados — os demais, em
// cada prosa, ficam como estavam (não apaga dia/mês já cadastrados
// só porque a pessoa quis fixar o ano de um lote, por exemplo).
function lerDataParcialBulk(prefixo) {
    const campos = ['dia', 'mes', 'ano'];
    const obj = {};
    campos.forEach((c) => {
        const el = document.getElementById(`${prefixo}-${c}`);
        const v = el?.value;
        if (v !== '' && v != null) obj[c] = parseInt(v);
    });
    return obj;
}

function rotuloTipoData(tipo) {
    return tipo === 'publicacao' ? 'Data de Publicação' : 'Data de Escrita';
}

export function aplicarDataEmMassaProsa() {
    if (selecaoProsas.size === 0) return;
    const tipo = document.getElementById('bulk-data-tipo-prosa')?.value || 'escrita';
    const parcial = lerDataParcialBulk('bulk-data-prosa');
    if (!Object.keys(parcial).length) return;

    const campo = tipo === 'publicacao' ? 'dataPublicacao' : 'dataEscrita';
    const rotuloCampo = rotuloTipoData(tipo);
    const exataChecked = !!document.getElementById('bulk-data-exata-prosa')?.checked;

    const partes = ['dia', 'mes', 'ano']
        .filter((c) => parcial[c] != null)
        .map((c) => `${c === 'mes' ? 'mês' : c} ${parcial[c]}`);

    const n = selecaoProsas.size;
    abrirModalConfirmacao({
        titulo: `Definir ${rotuloCampo.toLowerCase()}`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai definir ${partes.join(', ')} na ${rotuloCampo} de ${n} prosa${n !== 1 ? 's' : ''} selecionada${n !== 1 ? 's' : ''}, mantendo os demais campos da data (se já preenchidos em cada uma).`,
        textoConfirmar: 'Aplicar',
        corConfirmar: '#2563eb',
        onConfirmar: () => {
            db.prosas.forEach((pr) => {
                if (!selecaoProsas.has(pr.id)) return;
                const atual = { ...(pr[campo] || {}), ...parcial };
                if (campo === 'dataEscrita') atual.exata = exataChecked;
                pr[campo] = atual;
                // pr.ano espelha dataEscrita.ano por compatibilidade (ver forms.js)
                if (campo === 'dataEscrita') pr.ano = atual.ano || '';
            });
            selecaoProsas.clear();
            save();
        },
    });
}

export function limparDataEmMassaProsa() {
    if (selecaoProsas.size === 0) return;
    const tipo = document.getElementById('bulk-data-tipo-prosa')?.value || 'escrita';
    const campo = tipo === 'publicacao' ? 'dataPublicacao' : 'dataEscrita';
    const rotuloCampo = rotuloTipoData(tipo);

    const n = selecaoProsas.size;
    abrirModalConfirmacao({
        titulo: `Limpar ${rotuloCampo.toLowerCase()}`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai apagar a ${rotuloCampo} de ${n} prosa${n !== 1 ? 's' : ''} selecionada${n !== 1 ? 's' : ''}.`,
        textoConfirmar: 'Limpar',
        corConfirmar: '#dc2626',
        onConfirmar: () => {
            db.prosas.forEach((pr) => {
                if (!selecaoProsas.has(pr.id)) return;
                pr[campo] = null;
                if (campo === 'dataEscrita') pr.ano = '';
            });
            selecaoProsas.clear();
            save();
        },
    });
}

// Equivalente de excluirSelecaoPoemas() pra prosas — ver os comentários lá.
export function excluirSelecaoProsas() {
    if (selecaoProsas.size === 0) return;
    const n = selecaoProsas.size;
    abrirModalConfirmacao({
        titulo: `Excluir ${n} prosa${n !== 1 ? 's' : ''}`,
        rotulo: 'Ação em massa',
        mensagem: `Isso vai excluir ${n} prosa${n !== 1 ? 's' : ''} selecionada${n !== 1 ? 's' : ''}. Vai aparecer um "Desfazer" logo em seguida, caso mude de ideia.`,
        textoConfirmar: 'Excluir',
        corConfirmar: '#dc2626',
        onConfirmar: () => {
            deleteItemsEmMassa('prosas', [...selecaoProsas]);
            selecaoProsas.clear();
        },
    });
}

export function exportarSelecaoProsasJson() {
    exportarSelecaoJson('prosa', [...selecaoProsas]);
}
export function exportarSelecaoProsasMarkdown() {
    exportarSelecaoMarkdown('prosa', [...selecaoProsas]);
}

// ─── Livros ──────────────────────────────────────────────────

// Troca a sequência do livro com a de seu vizinho (acima/abaixo na
// lista já ordenada) — mesmo padrão de moverItemEstrutura(), pra não
// ser preciso abrir o modal e digitar um número só pra reordenar.
export function moverLivro(id, direcao) {
    const ordenados = [...db.livros].sort(
        (a, b) => (parseInt(a.sequencia) || 9999) - (parseInt(b.sequencia) || 9999),
    );
    const idx = ordenados.findIndex((l) => l.id == id);
    if (idx === -1) return;

    const alvoIdx = direcao === 'up' ? idx - 1 : idx + 1;
    if (alvoIdx < 0 || alvoIdx >= ordenados.length) return;

    const atual = ordenados[idx];
    const alvo = ordenados[alvoIdx];
    const seqAtual = atual.sequencia;
    atual.sequencia = alvo.sequencia;
    alvo.sequencia = seqAtual;

    save();
}

export function renderLivros() {
    const container = document.getElementById('lista-livros');
    if (!container) return;

    const ordenados = [...db.livros].sort(
        (a, b) => (parseInt(a.sequencia) || 9999) - (parseInt(b.sequencia) || 9999),
    );

    if (ordenados.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center text-gray-400 dark:text-slate-500 text-sm py-6">Nenhum livro encontrado.</div>`;
        return;
    }

    container.innerHTML = ordenados
        .map(
            (l) => `
        <div class="bg-white dark:bg-slate-900 p-5 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
            ${
                l.capa
                    ? `<img data-capa-id="${l.capa}" src="" alt="Capa de ${escapeHtml(l.titulo)}" class="w-full h-32 object-cover rounded mb-4 opacity-0 transition-opacity duration-200">`
                    : `<div class="h-32 bg-gray-100 dark:bg-slate-700 rounded mb-4"></div>`
            }
            <div class="flex justify-between items-start">
                <h4 class="font-bold text-blue-800 dark:text-blue-200">${escapeHtml(l.titulo)}</h4>
                <span class="text-[10px] bg-blue-50 dark:bg-blue-950 text-blue-500 dark:text-blue-400 px-2 py-0.5 rounded font-mono">SEQ: ${l.sequencia || '0'}</span>
            </div>
            <p class="text-xs font-mono text-gray-500 dark:text-slate-400">${escapeHtml(l.siglaOficial) || '---'} | ${l.data ? (typeof l.data === 'string' ? l.data : formatarDataParcial(l.data)) : 'S/D'}${l.dataUltimaEdicao ? ` <span title="Última edição">· ed. ${formatarDataParcial(l.dataUltimaEdicao)}</span>` : ''}</p>
            <div class="flex justify-between items-center mt-4">
                <div class="flex gap-4">
                    <button data-action="editar-livro" data-id="${l.id}" title="Editar" aria-label="Editar" class="inline-flex items-center justify-center p-1.5 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40">${ICONE_EDITAR}</button>
                    <button data-action="excluir-item" data-tipo="livros" data-id="${l.id}" title="Excluir" aria-label="Excluir" class="inline-flex items-center justify-center p-1.5 rounded text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40">${ICONE_EXCLUIR}</button>
                </div>
                <div class="flex gap-1">
                    <button data-action="mover-livro" data-id="${l.id}" data-dir="up" class="text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 px-1 text-xs" title="Subir">▲</button>
                    <button data-action="mover-livro" data-id="${l.id}" data-dir="down" class="text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 px-1 text-xs" title="Descer">▼</button>
                </div>
            </div>
        </div>`,
        )
        .join('');
    preencherCapas(container);
}

// ─── Partes ──────────────────────────────────────────────────

export function renderPartes() {
    const container = document.getElementById('lista-partes');
    if (!container) return;

    popularFiltroLivro('filtro-livro-partes');

    const ordenadas = [...db.partes]
        .filter((p) => {
            const livro = db.livros.find((l) => l.id == p.livroId);
            if (!livro || livro.tipo === 'Coletânea') return false;
            if (filtroLivroPartes && String(p.livroId) !== String(filtroLivroPartes)) return false;
            return true;
        })
        .sort((a, b) => {
            const livroIdxA = db.livros.findIndex((l) => l.id == a.livroId);
            const livroIdxB = db.livros.findIndex((l) => l.id == b.livroId);
            if (livroIdxA !== livroIdxB) return livroIdxA - livroIdxB;
            return (parseInt(a.sequencia) || 9999) - (parseInt(b.sequencia) || 9999);
        });

    if (ordenadas.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center text-gray-400 dark:text-slate-500 text-sm py-6">Nenhuma parte encontrada.</div>`;
        return;
    }

    container.innerHTML = ordenadas
        .map((p) => {
            const livro = db.livros.find((l) => l.id == p.livroId);
            return `
        <div class="bg-white dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm flex justify-between items-center">
            ${p.capa ? `<img data-capa-id="${p.capa}" src="" alt="Capa de ${escapeHtml(p.titulo)}" class="w-16 h-16 object-cover rounded mr-3 flex-shrink-0 opacity-0 transition-opacity duration-200">` : ''}
            <div class="flex-1 min-w-0">
                <h4 class="font-bold text-gray-800 dark:text-slate-100">${escapeHtml(p.titulo)}</h4>
                <p class="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
                    ${livro ? escapeHtml(livro.titulo) : 'Sem livro'}
                </p>
                <p class="text-[10px] text-gray-400 dark:text-slate-500 font-mono">SEQ: ${p.sequencia || '0'}</p>
            </div>
            <div class="flex gap-3 flex-shrink-0">
                <button data-action="editar-parte" data-id="${p.id}" title="Editar" aria-label="Editar" class="inline-flex items-center justify-center p-1.5 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40">${ICONE_EDITAR}</button>
                <button data-action="excluir-item" data-tipo="partes" data-id="${p.id}" title="Excluir" aria-label="Excluir" class="inline-flex items-center justify-center p-1.5 rounded text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40">${ICONE_EXCLUIR}</button>
            </div>
        </div>`;
        })
        .join('');
    preencherCapas(container);
}

// ─── Seções ──────────────────────────────────────────────────

export function renderSecoes() {
    const container = document.getElementById('lista-secoes');
    if (!container) return;

    popularFiltroLivro('filtro-livro-secoes');
    popularFiltroParteSecoes();

    const filtradas = db.secoes.filter((s) => {
        if (filtroParteSecoes) {
            return s.paiTipo === 'parte' && String(s.paiId) === String(filtroParteSecoes);
        }
        if (filtroLivroSecoes) {
            return String(livroDaSecao(s)) === String(filtroLivroSecoes);
        }
        return true;
    });

    const ordenadas = [...filtradas].sort((a, b) => {
        const hA = getElementHierarchy({ paiTipo: a.paiTipo, paiId: a.paiId }, db);
        const hB = getElementHierarchy({ paiTipo: b.paiTipo, paiId: b.paiId }, db);
        if (hA[0] !== hB[0]) return hA[0] - hB[0];

        // Posição dentro do livro: uma Seção ligada direto ao Livro (sem Parte)
        // usa a própria sequência pra competir de igual pra igual com as Partes
        // — antes ela sempre caía pro fim, porque herdava o valor "sem parte" (9999).
        const posA = a.paiTipo === 'livro' ? parseInt(a.sequencia) || 9999 : hA[2];
        const posB = b.paiTipo === 'livro' ? parseInt(b.sequencia) || 9999 : hB[2];
        if (posA !== posB) return posA - posB;

        return (parseInt(a.sequencia) || 9999) - (parseInt(b.sequencia) || 9999);
    });

    if (ordenadas.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center text-gray-400 dark:text-slate-500 text-sm py-6">Nenhuma seção encontrada.</div>`;
        return;
    }

    container.innerHTML = ordenadas
        .map((s) => {
            const pai =
                s.paiTipo === 'livro'
                    ? db.livros.find((l) => l.id == s.paiId)
                    : db.partes.find((p) => p.id == s.paiId);
            return `
        <div class="bg-white dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm">
            ${
                s.capa
                    ? `<img data-capa-id="${s.capa}" src="" alt="Capa de ${escapeHtml(s.titulo)}" class="w-full h-24 object-cover rounded mb-3 border opacity-0 transition-opacity duration-200 border-gray-300 dark:border-slate-600">`
                    : `<div class="h-24 bg-gray-100 dark:bg-slate-700 rounded mb-3"></div>`
            }
            <div class="flex justify-between items-center">
                <div>
                    <h4 class="font-bold text-gray-800 dark:text-slate-100">${escapeHtml(s.titulo)}</h4>
                    <p class="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-bold tracking-wider">
                        ${s.paiTipo}: ${pai ? escapeHtml(pai.titulo) : '---'}
                    </p>
                    <p class="text-[10px] text-gray-400 dark:text-slate-500">POSIÇÃO: ${s.sequencia ?? '—'}</p>
                </div>
                <div class="flex gap-3">
                    <button data-action="editar-secao" data-id="${s.id}" title="Editar" aria-label="Editar" class="inline-flex items-center justify-center p-1.5 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40">${ICONE_EDITAR}</button>
                    <button data-action="excluir-item" data-tipo="secoes" data-id="${s.id}" title="Excluir" aria-label="Excluir" class="inline-flex items-center justify-center p-1.5 rounded text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40">${ICONE_EXCLUIR}</button>
                </div>
            </div>
        </div>`;
        })
        .join('');
    preencherCapas(container);
}

// ─── Poemas ──────────────────────────────────────────────────

export function renderPoemas() {
    const container = document.getElementById('lista-poemas');
    if (!container) return;

    // Popula o filtro de livro/coletânea (todos os livros + coletâneas juntos)
    const filtroSel = document.getElementById('filtro-livro-poemas');
    if (filtroSel) {
        const valorAtual = filtroSel.value;
        const livrosComuns = db.livros.filter((l) => l.tipo !== 'Coletânea');
        const coletaneas = db.livros.filter((l) => l.tipo === 'Coletânea');
        filtroSel.innerHTML =
            '<option value="">-- Todos os livros --</option>' +
            (livrosComuns.length
                ? '<optgroup label="Livros">' +
                  livrosComuns
                      .map((l) => `<option value="${l.id}">${escapeHtml(l.titulo)}</option>`)
                      .join('') +
                  '</optgroup>'
                : '') +
            (coletaneas.length
                ? '<optgroup label="Coletâneas">' +
                  coletaneas
                      .map((c) => `<option value="${c.id}">${escapeHtml(c.titulo)}</option>`)
                      .join('') +
                  '</optgroup>'
                : '');
        if (Array.from(filtroSel.options).some((o) => o.value === valorAtual))
            filtroSel.value = valorAtual;
    }

    const listaFiltrada = getListaVisivelPoemas();
    atualizarAvisoSemData('aviso-sem-data-poemas', semDataPoemas);
    atualizarBarraSelecao();

    const colunasAtivas = getColunasAtivas('poemas');
    atualizarPainelColunas('poemas', 'painel-colunas-poemas');

    const cabecalho = document.getElementById('cabecalho-poemas');
    if (cabecalho) {
        cabecalho.innerHTML = montarCabecalho(
            'poemas',
            `<th class="p-4 border-b w-8 border-gray-200 dark:border-slate-700 sticky left-0 top-0 z-20 bg-gray-100 dark:bg-slate-700"><input type="checkbox" id="check-todos-poemas" data-action="toggle-todos-poemas"></th>`,
            `<th class="p-4 border-b border-gray-200 dark:border-slate-700">ID / Título</th>`,
            `<th class="p-4 border-b text-right border-gray-200 dark:border-slate-700 sticky top-0 z-20 bg-gray-100 dark:bg-slate-700">Ações</th>`,
        );
        // O checkbox mestre é recriado a cada render do cabeçalho — reaplica o estado
        const novoMaster = document.getElementById('check-todos-poemas');
        if (novoMaster)
            novoMaster.checked =
                listaFiltrada.length > 0 && listaFiltrada.every((p) => selecaoPoemas.has(p.id));
    }

    const paginacaoContainer = document.getElementById('paginacao-poemas');

    if (listaFiltrada.length === 0) {
        container.innerHTML = `<tr><td colspan="${colunasAtivas.length + 3}" class="p-6 text-center text-gray-400 dark:text-slate-500 text-sm">Nenhum poema encontrado.</td></tr>`;
        if (paginacaoContainer) paginacaoContainer.innerHTML = '';
        return;
    }

    // Clampa a página atual (o filtro pode ter reduzido o total de itens
    // desde a última renderização, ou "itens por página" pode ter mudado).
    const totalPaginas =
        itensPorPagina === Infinity
            ? 1
            : Math.max(1, Math.ceil(listaFiltrada.length / itensPorPagina));
    if (paginaPoemas > totalPaginas) paginaPoemas = totalPaginas;
    if (paginaPoemas < 1) paginaPoemas = 1;

    const listaPagina =
        itensPorPagina === Infinity
            ? listaFiltrada
            : listaFiltrada.slice(
                  (paginaPoemas - 1) * itensPorPagina,
                  paginaPoemas * itensPorPagina,
              );

    if (paginacaoContainer)
        paginacaoContainer.innerHTML = montarPaginacao(
            listaFiltrada.length,
            paginaPoemas,
            'pagina-poemas',
        );

    const CELULAS_POEMAS = {
        dataEscrita: (p) => {
            const aproximada = !!(p.dataEscrita && !p.dataEscrita.exata);
            const dicas = [];
            if (aproximada) dicas.push('Data aproximada — sem certeza de que é exatamente essa');
            if (p.dataPublicacao)
                dicas.push('Publicação: ' + formatarDataParcial(p.dataPublicacao));
            return `<td class="p-4 text-xs text-gray-400 dark:text-slate-500 font-mono" title="${dicas.join(' · ')}">${aproximada ? '<span class="text-amber-500 dark:text-amber-400">~</span> ' : ''}${p.dataEscrita ? formatarDataParcial(p.dataEscrita) : p.ano || '—'}</td>`;
        },
        estrutura: (p) => {
            const paiObjeto =
                p.paiTipo === 'secao'
                    ? db.secoes.find((s) => s.id == p.paiId)
                    : p.paiTipo === 'parte'
                      ? db.partes.find((pt) => pt.id == p.paiId)
                      : db.livros.find((l) => l.id == p.paiId);
            let infoPai = 'Avulso';
            if (paiObjeto) {
                const rotulo =
                    p.paiTipo === 'secao' ? 'SEC' : p.paiTipo === 'parte' ? 'PART' : 'LIVRO';
                infoPai = `${escapeHtml(paiObjeto.titulo)} [${rotulo}]`;
            }
            return `<td class="p-4 text-xs text-gray-400 dark:text-slate-500">${infoPai}</td>`;
        },
        status: (p) => {
            const INFO_STATUS = {
                publicado: { emoji: '🟢', titulo: 'Publicado' },
                incompleto: { emoji: '🟡', titulo: 'Incompleto' },
                migrado: { emoji: '🔵', titulo: 'Migrado' },
                descartado: { emoji: '🔴', titulo: 'Descartado' },
            };
            const { emoji, titulo } = INFO_STATUS[p.status] || { emoji: '⚪', titulo: 'Completo' };
            return `<td class="p-4" title="${titulo}">${emoji}</td>`;
        },
        dataPublicacao: (p) =>
            `<td class="p-4 text-xs text-gray-400 dark:text-slate-500 font-mono">${p.dataPublicacao ? formatarDataParcial(p.dataPublicacao) : '—'}</td>`,
        pessoas: (p) =>
            `<td class="p-4">${badgesEtiquetas(p.pessoas, 'bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-400')}</td>`,
        elos: (p) =>
            `<td class="p-4 text-xs text-gray-500 dark:text-slate-400">${titulosPoemasPorId(p.conceitos?.elos)}</td>`,
        referencias: (p) =>
            `<td class="p-4 text-xs text-gray-500 dark:text-slate-400">${titulosPoemasPorId(p.conceitos?.referencias)}</td>`,
        etiquetas: (p) => `<td class="p-4">${badgesEtiquetas(p.sinalizacoes)}</td>`,
        notas: (p) =>
            `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 max-w-xs">${trechoNota(p.notas)}</td>`,
        epocaRetratada: (p) => {
            const epoca = p.epocaRetratada;
            const na = epoca?.na;
            const nomeBadge = epoca?.nome
                ? `<span class="inline-block px-1.5 py-0.5 mr-1 rounded bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 text-[10px] font-bold align-middle">${escapeHtml(epoca.nome)}</span>`
                : '';
            return `<td class="p-4 text-xs ${na ? 'text-gray-300 dark:text-slate-600 italic' : 'text-gray-400 dark:text-slate-500'}">${nomeBadge}<span class="font-mono">${formatarIntervaloEpocaRetratada(epoca)}</span></td>`;
        },
        intertextualidade: (p) => {
            const lista = Array.isArray(p.intertextualidade) ? p.intertextualidade : [];
            if (!lista.length) return `<td class="p-4 text-xs text-gray-300 dark:text-slate-600">—</td>`;
            const html = lista
                .map((it) => {
                    const badge = it.tipo
                        ? `<span class="inline-block px-1.5 py-0.5 mr-1 rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-[10px] font-bold uppercase align-middle">${escapeHtml(it.tipo)}</span>`
                        : '';
                    return `<div>${badge}${trechoNota(it.texto)}</div>`;
                })
                .join('');
            return `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 max-w-xs">${html}</td>`;
        },
        anexos: (p) => {
            const lista = Array.isArray(p.anexos) ? p.anexos : [];
            if (!lista.length) return `<td class="p-4 text-xs text-gray-300 dark:text-slate-600">—</td>`;
            const html = lista
                .map((it) => {
                    const badge = it.tipo
                        ? `<span class="inline-block px-1.5 py-0.5 mr-1 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold uppercase align-middle">${escapeHtml(it.tipo)}</span>`
                        : '';
                    return `<div>${badge}${trechoNota(it.texto)}</div>`;
                })
                .join('');
            return `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 max-w-xs">${html}</td>`;
        },
        anexosNotaGeral: (p) =>
            `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 max-w-xs">${trechoNota(p.anexosNotaGeral)}</td>`,
        anotacoesMarginais: (p) => {
            const lista = Array.isArray(p.anotacoesMarginais) ? p.anotacoesMarginais : [];
            if (!lista.length) return `<td class="p-4 text-xs text-gray-300 dark:text-slate-600">—</td>`;
            const html = lista
                .map((it) => {
                    const meta = [it.posicao, it.fonte].filter(Boolean).join(' · ');
                    const badge = meta
                        ? `<span class="inline-block px-1.5 py-0.5 mr-1 rounded bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 text-[10px] font-bold align-middle">${escapeHtml(meta)}</span>`
                        : '';
                    return `<div>${badge}${trechoNota(it.texto)}</div>`;
                })
                .join('');
            return `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 max-w-xs">${html}</td>`;
        },
        descricaoVisual: (p) =>
            `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 max-w-xs ${p.descricaoVisual ? 'border-l-2 border-indigo-200 dark:border-indigo-800' : ''}">${trechoNota(p.descricaoVisual)}</td>`,
        contextoHistorico: (p) =>
            `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 max-w-xs">${trechoNota(p.contextoHistorico)}</td>`,
        ocultacao: (p) =>
            `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 max-w-xs">${trechoNota(p.ocultacao)}</td>`,
        conteudoSensivel: (p) =>
            `<td class="p-4 text-xs max-w-xs ${p.conteudoSensivel ? 'text-amber-700 dark:text-amber-400 border-l-2 border-amber-300 dark:border-amber-700' : 'text-gray-300 dark:text-slate-600'}">${p.conteudoSensivel ? trechoNota(p.conteudoSensivel) : '—'}</td>`,
        vocabularioHiperacionante: (p) =>
            `<td class="p-4 text-xs max-w-xs ${p.vocabularioHiperacionante ? 'text-amber-700 dark:text-amber-400 border-l-2 border-amber-300 dark:border-amber-700' : 'text-gray-300 dark:text-slate-600'}">${p.vocabularioHiperacionante ? trechoNota(p.vocabularioHiperacionante) : '—'}</td>`,
        cortadoDe: (p) => {
            if (!p.cortadoDe || (!p.cortadoDe.livro && !p.cortadoDe.secao))
                return `<td class="p-4 text-xs text-gray-300 dark:text-slate-600">—</td>`;
            return `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 max-w-xs">${escapeHtml([p.cortadoDe.livro, p.cortadoDe.secao].filter(Boolean).join(' / '))}</td>`;
        },
        lancadoEm: (p) => {
            if (!p.lancadoEm || (!p.lancadoEm.livro && !p.lancadoEm.secao))
                return `<td class="p-4 text-xs text-gray-300 dark:text-slate-600">—</td>`;
            return `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 max-w-xs">${escapeHtml([p.lancadoEm.livro, p.lancadoEm.secao].filter(Boolean).join(' / '))}</td>`;
        },
        descarte: (p) =>
            `<td class="p-4 text-xs max-w-xs ${p.descarte ? 'text-amber-700 dark:text-amber-400 border-l-2 border-amber-300 dark:border-amber-700' : 'text-gray-300 dark:text-slate-600'}">${p.descarte ? trechoNota(p.descarte) : '—'}</td>`,
    };

    container.innerHTML = listaPagina
        .map((p) => {
            const celulasMeio = colunasAtivas
                .map((key) => (CELULAS_POEMAS[key] ? CELULAS_POEMAS[key](p) : ''))
                .join('');
            return `
        <tr class="border-b hover:bg-blue-50/50 dark:hover:bg-blue-950/50 border-gray-200 dark:border-slate-700">
            <td class="p-4 sticky left-0 z-10 bg-white dark:bg-slate-900">
                <input type="checkbox" class="check-poema" ${selecaoPoemas.has(p.id) ? 'checked' : ''}
                    data-action="toggle-poema" data-id="${p.id}">
            </td>
            <td class="p-4 font-bold text-gray-700 dark:text-slate-200 sticky left-8 z-10 bg-white dark:bg-slate-900">
                <span class="text-[10px] text-blue-400 mr-2">${p.sequencia ?? '—'}</span>
                ${escapeHtml(p.titulo)}
                ${p._livros ? `<div class="text-[10px] text-indigo-500 dark:text-indigo-400 font-normal mt-1">Livros: ${escapeHtml(p._livros)}</div>` : ''}
            </td>
            ${celulasMeio}
            <td class="p-4 text-right space-x-2">
                <button data-action="editar-poema" data-id="${p.id}" title="Editar" aria-label="Editar" class="inline-flex items-center justify-center bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 p-1.5 rounded hover:bg-blue-200 dark:hover:bg-blue-800">${ICONE_EDITAR}</button>
                <button data-action="excluir-item" data-tipo="poemas" data-id="${p.id}" title="Excluir" aria-label="Excluir" class="inline-flex items-center justify-center p-1.5 rounded text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40">${ICONE_EXCLUIR}</button>
            </td>
        </tr>`;
        })
        .join('');
}

// ─── Prosas ──────────────────────────────────────────────────

export function renderProsas() {
    const container = document.getElementById('lista-prosas');
    if (!container) return;

    // Popula o filtro com Livros e Coletâneas em grupos separados
    const filtroSelPr = document.getElementById('filtro-livro-prosas');
    if (filtroSelPr) {
        const valorAtual = filtroSelPr.value;
        const livrosComuns = db.livros.filter((l) => l.tipo !== 'Coletânea');
        const coletaneas = db.livros.filter((l) => l.tipo === 'Coletânea');
        filtroSelPr.innerHTML =
            '<option value="">-- Todos os livros --</option>' +
            (livrosComuns.length
                ? '<optgroup label="Livros">' +
                  livrosComuns
                      .map((l) => `<option value="${l.id}">${escapeHtml(l.titulo)}</option>`)
                      .join('') +
                  '</optgroup>'
                : '') +
            (coletaneas.length
                ? '<optgroup label="Coletâneas">' +
                  coletaneas
                      .map((c) => `<option value="${c.id}">${escapeHtml(c.titulo)}</option>`)
                      .join('') +
                  '</optgroup>'
                : '');
        if (Array.from(filtroSelPr.options).some((o) => o.value === valorAtual))
            filtroSelPr.value = valorAtual;
    }

    const listaFiltrada = getListaVisivelProsas();
    atualizarAvisoSemData('aviso-sem-data-prosas', semDataProsas);
    atualizarBarraSelecaoProsas();

    const colunasAtivas = getColunasAtivas('prosas');
    atualizarPainelColunas('prosas', 'painel-colunas-prosas');

    const cabecalho = document.getElementById('cabecalho-prosas');
    if (cabecalho) {
        cabecalho.innerHTML = montarCabecalho(
            'prosas',
            `<th class="p-4 border-b w-8 border-gray-200 dark:border-slate-700 sticky left-0 top-0 z-20 bg-gray-100 dark:bg-slate-700"><input type="checkbox" id="check-todos-prosas" data-action="toggle-todos-prosas"></th>`,
            `<th class="p-4 border-b border-gray-200 dark:border-slate-700 sticky left-8 top-0 z-20 bg-gray-100 dark:bg-slate-700">Título</th>`,
            `<th class="p-4 border-b text-right border-gray-200 dark:border-slate-700 sticky top-0 z-20 bg-gray-100 dark:bg-slate-700">Ações</th>`,
        );
        const novoMaster = document.getElementById('check-todos-prosas');
        if (novoMaster)
            novoMaster.checked =
                listaFiltrada.length > 0 && listaFiltrada.every((pr) => selecaoProsas.has(pr.id));
    }

    const paginacaoContainerPr = document.getElementById('paginacao-prosas');

    if (listaFiltrada.length === 0) {
        container.innerHTML = `<tr><td colspan="${colunasAtivas.length + 3}" class="p-6 text-center text-gray-400 dark:text-slate-500 text-sm">Nenhuma prosa encontrada.</td></tr>`;
        if (paginacaoContainerPr) paginacaoContainerPr.innerHTML = '';
        return;
    }

    const totalPaginasPr =
        itensPorPagina === Infinity
            ? 1
            : Math.max(1, Math.ceil(listaFiltrada.length / itensPorPagina));
    if (paginaProsas > totalPaginasPr) paginaProsas = totalPaginasPr;
    if (paginaProsas < 1) paginaProsas = 1;

    const listaPaginaPr =
        itensPorPagina === Infinity
            ? listaFiltrada
            : listaFiltrada.slice(
                  (paginaProsas - 1) * itensPorPagina,
                  paginaProsas * itensPorPagina,
              );

    if (paginacaoContainerPr)
        paginacaoContainerPr.innerHTML = montarPaginacao(
            listaFiltrada.length,
            paginaProsas,
            'pagina-prosas',
        );

    const CELULAS_PROSAS = {
        dataEscrita: (pr) => {
            const aproximada = !!(pr.dataEscrita && !pr.dataEscrita.exata);
            const dicas = [];
            if (aproximada) dicas.push('Data aproximada — sem certeza de que é exatamente essa');
            if (pr.dataPublicacao)
                dicas.push('Publicação: ' + formatarDataParcial(pr.dataPublicacao));
            return `<td class="p-4 text-xs text-gray-400 dark:text-slate-500 font-mono" title="${dicas.join(' · ')}">${aproximada ? '<span class="text-amber-500 dark:text-amber-400">~</span> ' : ''}${pr.dataEscrita ? formatarDataParcial(pr.dataEscrita) : pr.ano || '—'}</td>`;
        },
        vinculo: (pr) => {
            let paiObjeto = null,
                rotulo = 'Avulso';
            if (pr.paiTipo === 'secao') {
                paiObjeto = db.secoes.find((s) => s.id == pr.paiId);
                rotulo = 'SEC';
            } else if (pr.paiTipo === 'parte') {
                paiObjeto = db.partes.find((p) => p.id == pr.paiId);
                rotulo = 'PART';
            } else if (pr.paiTipo === 'livro') {
                paiObjeto = db.livros.find((l) => l.id == pr.paiId);
                rotulo = 'LIVRO';
            }
            const infoVinc = paiObjeto
                ? `${escapeHtml(paiObjeto.titulo)} [${rotulo}]`
                : 'Sem vínculo';
            return `<td class="p-4 text-xs text-gray-400 dark:text-slate-500">${infoVinc}</td>`;
        },
        dataPublicacao: (pr) =>
            `<td class="p-4 text-xs text-gray-400 dark:text-slate-500 font-mono">${pr.dataPublicacao ? formatarDataParcial(pr.dataPublicacao) : '—'}</td>`,
        pessoas: (pr) =>
            `<td class="p-4">${badgesEtiquetas(pr.pessoas, 'bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-400')}</td>`,
        etiquetas: (pr) => `<td class="p-4">${badgesEtiquetas(pr.sinalizacoes)}</td>`,
        genero: (pr) =>
            `<td class="p-4">${badgesEtiquetas(pr.genero, 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-400')}</td>`,
        notas: (pr) =>
            `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 max-w-xs">${trechoNota(pr.notas)}</td>`,
    };

    container.innerHTML = listaPaginaPr
        .map((pr) => {
            const pubBadge = pr.publicado
                ? `<span class="text-[9px] bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded font-bold uppercase">pub</span>`
                : '';
            const celulasMeio = colunasAtivas
                .map((key) => (CELULAS_PROSAS[key] ? CELULAS_PROSAS[key](pr) : ''))
                .join('');

            return `
        <tr class="border-b hover:bg-blue-50/50 dark:hover:bg-blue-950/50 border-gray-200 dark:border-slate-700">
            <td class="p-4 sticky left-0 z-10 bg-white dark:bg-slate-900">
                <input type="checkbox" class="check-prosa" ${selecaoProsas.has(pr.id) ? 'checked' : ''}
                    data-action="toggle-prosa" data-id="${pr.id}">
            </td>
            <td class="p-4 sticky left-8 z-10 bg-white dark:bg-slate-900">
                <div class="font-bold text-gray-700 dark:text-slate-200 flex items-center gap-2">${escapeHtml(pr.titulo)} ${pubBadge}</div>
            </td>
            ${celulasMeio}
            <td class="p-4 text-right space-x-2">
                <button data-action="editar-prosa" data-id="${pr.id}" title="Editar" aria-label="Editar" class="inline-flex items-center justify-center bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 p-1.5 rounded hover:bg-blue-200 dark:hover:bg-blue-800">${ICONE_EDITAR}</button>
                <button data-action="excluir-item" data-tipo="prosas" data-id="${pr.id}" title="Excluir" aria-label="Excluir" class="inline-flex items-center justify-center p-1.5 rounded text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40">${ICONE_EXCLUIR}</button>
            </td>
        </tr>`;
        })
        .join('');
}

// ─── Elementos ───────────────────────────────────────────────

export function renderElementos() {
    const container = document.getElementById('lista-elementos');
    if (!container) return;

    popularFiltroLivro('filtro-livro-elementos');

    const filtrados = filtroLivroElementos
        ? db.elementos.filter((e) => String(livroDoElemento(e)) === String(filtroLivroElementos))
        : db.elementos;

    const ordenados = [...filtrados].sort((a, b) => {
        const [lA, ppA, psA] = getPosicaoElemento(a, db);
        const [lB, ppB, psB] = getPosicaoElemento(b, db);
        if (lA !== lB) return lA - lB;
        if (ppA !== ppB) return ppA - ppB;
        if (psA !== psB) return psA - psB;
        return (parseInt(a.sequencia) || 9999) - (parseInt(b.sequencia) || 9999);
    });

    if (ordenados.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center text-gray-400 dark:text-slate-500 text-sm py-6">Nenhum elemento encontrado.</div>`;
        return;
    }

    container.innerHTML = ordenados
        .map((el) => {
            const pai =
                el.paiTipo === 'livro'
                    ? db.livros.find((l) => l.id == el.paiId)
                    : el.paiTipo === 'parte'
                      ? db.partes.find((p) => p.id == el.paiId)
                      : db.secoes.find((s) => s.id == el.paiId);

            return `
        <div class="bg-white dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm flex flex-col h-full">
            <div class="flex justify-between items-start mb-2">
                <span class="text-[10px] bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded uppercase font-bold text-gray-500 dark:text-slate-400">${el.tipo}</span>
                <div class="flex gap-2">
                    <button data-action="editar-elemento" data-id="${el.id}" title="Editar" aria-label="Editar" class="inline-flex items-center justify-center p-1.5 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40">${ICONE_EDITAR}</button>
                    <button data-action="excluir-item" data-tipo="elementos" data-id="${el.id}" title="Excluir" aria-label="Excluir" class="inline-flex items-center justify-center p-1.5 rounded text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40">${ICONE_EXCLUIR}</button>
                </div>
            </div>
            ${el.titulo ? `<p class="text-sm font-semibold text-gray-700 dark:text-slate-200 mt-1 mb-1">${escapeHtml(el.titulo)}</p>` : ''}
            ${el.imagem ? `<img data-capa-id="${el.imagem}" src="" alt="${el.titulo ? 'Imagem de ' + escapeHtml(el.titulo) : 'Imagem do elemento'}" class="w-full h-24 object-cover rounded mb-2 border opacity-0 transition-opacity duration-200 border-gray-300 dark:border-slate-600">` : ''}
            <p class="text-sm text-gray-600 dark:text-slate-300 line-clamp-3 italic mb-auto" style="white-space: pre-line;">${el.texto ? sanitizarTextoRico(el.texto) : '(Sem texto)'}</p>
            ${
                el.notas
                    ? `
                <div class="mt-2 p-2 bg-amber-50 dark:bg-amber-950 border-l-2 border-amber-200 dark:border-amber-800 text-[10px] text-amber-700 dark:text-amber-300 italic">
                    <strong class="uppercase">Nota:</strong>
                    <span class="line-clamp-2">${escapeHtml(el.notas)}</span>
                </div>`
                    : ''
            }
            <div class="flex justify-between items-center mt-3 pt-2 border-t border-gray-50 dark:border-slate-800">
                <p class="text-[10px] text-blue-500 dark:text-blue-400 font-bold uppercase">Vínculo: ${pai ? escapeHtml(pai.titulo) : '---'}</p>
                <span class="text-[9px] font-mono text-gray-300 dark:text-slate-600">#${el.sequencia ?? '—'}</span>
            </div>
        </div>`;
        })
        .join('');
    preencherCapas(container);
}
