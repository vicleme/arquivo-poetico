// ============================================================
// render-listas.js — Renderização das abas em lista/grid/tabela:
// Livros, Partes, Seções, Poemas e Prosas (ambas com seleção
// múltipla e ações em massa) e Elementos.
//
// Extraído de render.js — ver render-estrutura.js (árvore da aba
// "Estrutura") e render-lightbox.js (capas + lightbox, usado aqui
// via preencherCapas).
// ============================================================

import {
    db,
    save,
    calcularImpactoExclusaoPessoa,
    calcularImpactoExclusaoGrupo,
    calcularImpactoExclusaoAutor,
    calcularImpactoExclusaoEpoca,
} from './db.js';
import {
    getElementHierarchy,
    getPosicaoElemento,
    filtrarTextos,
    filtrarPorConteudo,
    opcoesBuscaPadrao,
    formatarDataParcial,
    formatarIntervaloEpocaRetratada,
    nomeEpoca,
    ROTULOS_RECORTE_EPOCA,
    escapeHtml,
    sanitizarTextoRico,
    itemBateFiltroData,
    filtroDataVazio,
    itemFaltaDataParaFiltro,
    parseFiltroDataRapido,
    itemBateFiltroEpoca,
    itemFaltaEpocaParaFiltro,
    sinalizacoesCombinadas,
    PREFIXOS_CANONICOS_POR_CAMPO,
    rotuloElo,
    nomesPessoas,
    paresGrupoPessoa,
    classesCorGrupo,
    pontoCorGrupo,
    paresAutoria,
    estaPublicado,
    CAMPOS_CONTAVEIS,
    PAPEIS_PESSOA,
} from './utils.js';
import { preencherCapas } from './render-lightbox.js';
import { getColunasAtivas } from './colunas.js';
import { getColunasContagem, PREFIXO_ORDENACAO as PREFIXO_ORDENACAO_CONTAGEM } from './colunas-contagem.js';
import { contarCamposPreenchidos } from './exportar-md.js';
import {
    celulaAcoesItem,
    resolverTituloPoemaOuProsa,
    titulosPoemasPorId,
    rotuloEntradaElo,
    rotuloEntradaReferencia,
    trechoNota,
    celulaCamposPreenchidos,
    montarPaginacao,
    montarCabecalho,
    atualizarPainelColunas,
    atualizarPainelAcoes,
    badgesEtiquetas,
    badgesEtiquetasPorCategoria,
    badgesPessoas,
    badgesGrupos,
    badgesAutoria,
    badgesEnvios,
    badgesReconhecimentos,
    badgeEpocaRetratada,
} from './celulas-tabela.js';
// selecao-massa.js importa `selecaoPoemas`/`selecaoProsas`/
// `getListaVisivelPoemas`/`getListaVisivelProsas`/`renderPoemas`/
// `renderProsas` daqui — import circular proposital, ver nota no topo
// de selecao-massa.js.
import { atualizarBarraSelecao, atualizarBarraSelecaoProsas } from './selecao-massa.js';

// Sempre que uma coluna é ligada/desligada (ver colunas.js) a tabela
// correspondente precisa recalcular cabeçalho + linhas.
window.addEventListener('colunas:alteradas', (ev) => {
    if (ev.detail?.tabela === 'poemas') renderPoemas();
    if (ev.detail?.tabela === 'prosas') renderProsas();
});

// O mesmo vale pra coluna Ações (ver acoes-coluna.js) — trocar quais
// botões aparecem, ou o formato do Baixar, também exige recalcular a
// linha inteira (a célula de Ações é montada junto no template).
window.addEventListener('acoes-coluna:alteradas', (ev) => {
    if (ev.detail?.tabela === 'poemas') renderPoemas();
    if (ev.detail?.tabela === 'prosas') renderProsas();
});

// Idem pras colunas de contagem (ver colunas-contagem.js) — só existem
// em Poemas.
window.addEventListener('colunas-contagem:alteradas', (ev) => {
    if (ev.detail?.tabela === 'poemas') renderPoemas();
});

// Ícones dos botões Editar/Excluir dos cards e tabelas abaixo. Ficam como
// string pronta (em vez de gerar via DOM) porque entram direto nas
// template strings dos cards, junto com o resto do HTML.
export const ICONE_EDITAR = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 inline-block" aria-hidden="true"><path d="M12.5 3.5l4 4L6.5 17.5H2.5v-4L12.5 3.5Z"/><path d="M10.5 5.5l4 4"/></svg>`;
export const ICONE_EXCLUIR = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 inline-block" aria-hidden="true"><path d="M4 6h12"/><path d="M8 6V4.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V6"/><path d="M5.5 6l.6 9.5a1.5 1.5 0 0 0 1.5 1.4h4.8a1.5 1.5 0 0 0 1.5-1.4L14.5 6"/><path d="M8.5 9v5"/><path d="M11.5 9v5"/></svg>`;
// Duas linhas convergindo num ponto só — mesmo espírito visual de
// "mesclar" em apps de versionamento (git merge), usado no botão de
// Mesclar de Pessoas/Épocas (ver renderPessoas/renderEpocas abaixo).
const ICONE_MESCLAR = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 inline-block" aria-hidden="true"><path d="M4 3v5a4 4 0 0 0 4 4h0"/><path d="M16 3v5a4 4 0 0 1-4 4h0"/><path d="M10 12v5"/><path d="M7.5 14.5l2.5 2.5 2.5-2.5"/></svg>`;

let filtroPoemas = '';
let filtroProsas = '';
let filtroConteudoPoemas = '';
let filtroConteudoProsas = '';
let combinadorBuscaPoemas = 'e'; // 'e' (precisa bater nos dois campos) ou 'ou' (basta um)
let combinadorBuscaProsas = 'e';
// Interruptores de busca (Diferenciar maiúsculas/minúsculas, Diferenciar
// diacríticos, Palavra inteira) — um conjunto por lista, valendo pras
// duas caixas (Metadados e Conteúdo) daquela lista, mesmo escopo do
// combinador E/OU acima. Todos desligados por padrão (ver
// opcoesBuscaPadrao em utils.js).
let opcoesBuscaPoemas = opcoesBuscaPadrao();
let opcoesBuscaProsas = opcoesBuscaPadrao();
let filtroLivroProsa = '';
let filtroLivroPoemas = '';
// Filtro dedicado Pessoa+Papel — par (pessoaId, papel) independente da
// busca por texto, pra resolver o caso que a busca por texto não
// consegue: "papel:Dedicatário(a) pessoa:Pedro" bate mesmo se Pedro só
// for Mencionado(a) e outra pessoa qualquer for a Dedicatária, porque
// _buscaPessoas/_buscaPapeis são strings achatadas sem vínculo entre
// qual papel pertence a qual pessoa (ver decorarCamposBusca acima). Os
// dois seletores também funcionam sozinhos (só pessoa = qualquer papel
// dela; só papel = qualquer pessoa com aquele papel), igual aos
// prefixos pessoa:/papel: já existentes — a diferença só aparece
// quando os dois estão preenchidos ao mesmo tempo (ver
// getListaVisivelPoemas/getListaVisivelProsas abaixo).
let filtroPessoaPoemas = '';
let filtroPapelPoemas = '';
let filtroPessoaProsas = '';
let filtroPapelProsas = '';

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
export let ordenacaoPoemas = { campo: 'estrutura', direcao: 'asc' };
let statusPoemas = 'todos';
// Nunca reatribuídos (só .add/.delete/.clear/.has) — por isso dá pra
// exportar como const e deixar selecao-massa.js importar e mutar a
// mesma instância. A leitura (.has, pro checkbox de cada linha) mora
// aqui; a escrita (toggle/limpar/ações em massa) mora lá.
export const selecaoPoemas = new Set();
export const selecaoProsas = new Set();
let filtroLivroPartes = '';
let filtroLivroSecoes = '';
let filtroParteSecoes = '';
let filtroLivroElementos = '';

// ─── Paginação (Poemas e Prosas) ────────────────────────────────
// "Itens por página" é uma preferência única, compartilhada entre as
// duas abas (persistida no navegador) — cada aba mantém sua própria
// página atual, já que dependem de filtros diferentes.
const LS_KEY_ITENS_POR_PAGINA = 'arquivoPoetico_itensPorPagina';
export const OPCOES_ITENS_POR_PAGINA = [25, 50, 100, 200];

function lerItensPorPaginaSalvo() {
    const bruto = localStorage.getItem(LS_KEY_ITENS_POR_PAGINA);
    if (bruto === 'todos') return Infinity;
    const n = parseInt(bruto);
    return OPCOES_ITENS_POR_PAGINA.includes(n) ? n : 50;
}

export let itensPorPagina = lerItensPorPaginaSalvo();
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
function combinarFiltrosBusca(decorada, filtroMeta, filtroConteudo, combinador, opcoesBusca) {
    const usaMeta = !!(filtroMeta && filtroMeta.trim());
    const usaConteudo = !!(filtroConteudo && filtroConteudo.trim());
    if (!usaMeta && !usaConteudo) return decorada;

    const idsMeta = usaMeta
        ? new Set(filtrarTextos(decorada, filtroMeta, opcoesBusca).map((p) => p.id))
        : null;
    const idsConteudo = usaConteudo
        ? new Set(filtrarPorConteudo(decorada, filtroConteudo, opcoesBusca).map((p) => p.id))
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

// Atalho de clique no cabeçalho da coluna (ver thOrdenavel/thComLupa):
// joga o prefixo "campo:" correspondente pronto no campo de busca de
// metadados (de Poemas ou de Prosas, conforme `tabela`) e foca nele —
// pra quem não lembra a sintaxe de prefixo não precisar decorar nada, só
// clicar na coluna que já está olhando. Se já houver algo digitado, o
// prefixo é acrescentado ao final (separado por espaço) em vez de
// substituir, pra permitir combinar com outros termos.
export function buscarPorPrefixo(tabela, campoItem) {
    const prefixo = PREFIXOS_CANONICOS_POR_CAMPO[campoItem];
    if (!prefixo) return;
    const input = document.getElementById(`busca-${tabela}`);
    if (!input) return;
    const atual = input.value.trim();
    const novo = atual ? `${atual} ${prefixo}:` : `${prefixo}:`;
    input.value = novo;
    (tabela === 'prosas' ? setFiltroProsas : setFiltroPoemas)(novo);
    input.focus();
    input.setSelectionRange(novo.length, novo.length);
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

// Interruptores de busca — cada um liga/desliga um campo de
// opcoesBuscaPoemas/opcoesBuscaProsas (ver opcoesBuscaPadrao em utils.js)
// e re-renderiza, mesmo padrão de setCombinadorBuscaPoemas acima.
export function setOpcaoBuscaPoemas(chave, valor) {
    opcoesBuscaPoemas = { ...opcoesBuscaPoemas, [chave]: !!valor };
    paginaPoemas = 1;
    renderPoemas();
}

export function setOpcaoBuscaProsas(chave, valor) {
    opcoesBuscaProsas = { ...opcoesBuscaProsas, [chave]: !!valor };
    paginaProsas = 1;
    renderProsas();
}

export function getOpcoesBuscaPoemas() {
    return opcoesBuscaPoemas;
}

export function getOpcoesBuscaProsas() {
    return opcoesBuscaProsas;
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

export function setFiltroPessoaPoemas(valor) {
    filtroPessoaPoemas = valor;
    paginaPoemas = 1;
    renderPoemas();
}

export function setFiltroPapelPoemas(valor) {
    filtroPapelPoemas = valor;
    paginaPoemas = 1;
    renderPoemas();
}

export function setFiltroPessoaProsas(valor) {
    filtroPessoaProsas = valor;
    paginaProsas = 1;
    renderProsas();
}

export function setFiltroPapelProsas(valor) {
    filtroPapelProsas = valor;
    paginaProsas = 1;
    renderProsas();
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
            ? item.intertextualidade
                  .map(
                      (it) =>
                          `${it.tipo || ''} ${it.texto || ''} ${it.link || ''} ${it.nota || ''}`,
                  )
                  .join(' ')
            : '',
        _buscaAnexos: Array.isArray(item.anexos)
            ? item.anexos
                  .map((it) => `${it.tipo || ''} ${it.texto || ''} ${it.link || ''}`)
                  .join(' ')
            : '',
        _buscaAnotacoes: Array.isArray(item.anotacoesMarginais)
            ? item.anotacoesMarginais
                  .map(
                      (it) =>
                          `${it.trecho || ''} ${it.posicao || ''} ${it.fonte || ''} ${it.texto || ''}`,
                  )
                  .join(' ')
            : '',
        _buscaCortadoDe: item.cortadoDe
            ? `${item.cortadoDe.livro || ''} ${item.cortadoDe.secao || ''}`.trim()
            : '',
        _buscaLancadoEm: item.lancadoEm
            ? `${item.lancadoEm.livro || ''} ${item.lancadoEm.secao || ''}`.trim()
            : '',
        // Elos/Referências apontam pra "outro texto do acervo (poema ou
        // prosa)" — ids são gerados por um contador global único
        // (gerarId()), então um id de poema nunca colide com um id de
        // prosa; resolver o título é só checar os dois arrays (ver
        // resolverTituloPoemaOuProsa acima).
        _buscaElos: Array.isArray(item.conceitos?.elos)
            ? item.conceitos.elos
                  .map(
                      (it) =>
                          `${rotuloElo(it.relacao, it.direcao)} ${it.relacao || ''} ${it.texto || ''} ${resolverTituloPoemaOuProsa(it.id)}`,
                  )
                  .join(' ')
            : '',
        _buscaReferencias: Array.isArray(item.conceitos?.referencias)
            ? item.conceitos.referencias
                  .map(
                      (it) =>
                          `${it.tipo || ''} ${it.texto || ''} ${resolverTituloPoemaOuProsa(it.id)}`,
                  )
                  .join(' ')
            : '',
        // Sinalizações combinadas das 5 categorias — só pra busca geral
        // "etiqueta:"; quem quer restringir por categoria usa
        // estilo:/tema:/relacao:/sensibilidade:/tom: direto (ver
        // CAMPOS_ATRIBUTO em utils.js).
        _buscaSinalizacoes: sinalizacoesCombinadas(item),
        // pessoas é array de objeto {pessoaId, papeis} (nome mora no
        // cadastro central db.pessoas desde migrarPessoasParaCadastro —
        // ver db.js; papeis: array, desde o multi-select, ver
        // migrarPapeisPessoa) — nome e papéis entram na busca geral e no
        // prefixo "pessoa:" (ver CAMPOS_ATRIBUTO em utils.js), assim
        // "pessoa:dedicatária" também acha alguém por qualquer um dos
        // papéis marcados, não só pelo nome.
        _buscaPessoas: Array.isArray(item.pessoas)
            ? item.pessoas
                  .map((p) => {
                      const nome = db.pessoas.find((x) => x.id == p.pessoaId)?.nome || '';
                      return `${nome} ${(p.papeis || []).join(' ')}`;
                  })
                  .join(' ')
            : '',
        // Só os papéis (sem nome) — pro prefixo "papel:" (ver
        // CAMPOS_ATRIBUTO em utils.js), pra quem quer restringir por
        // papel especificamente, sem risco de um termo bater só porque é
        // parecido com o nome de alguém marcado no texto.
        _buscaPapeis: Array.isArray(item.pessoas)
            ? item.pessoas.flatMap((p) => p.papeis || []).join(' ')
            : '',
        // Grupo é característica da Pessoa (constante entre poemas), não
        // do vínculo poema↔pessoa — ver comentário de nomesGrupos/
        // paresGrupoPessoa em utils.js. Resolvido aqui pro prefixo
        // "grupo:", que acha o texto pelo grupo de alguém mencionado
        // (ex.: "grupo:família"), mesmo sem citar o nome da pessoa. Junta
        // também os grupos referenciados diretamente (item.gruposDiretos),
        // pra achar o texto mesmo quando o grupo é citado sem nenhuma
        // pessoa dele em particular.
        _buscaGrupos: [
            ...new Set([
                ...paresGrupoPessoa(item, db.pessoas, db.grupos).map((par) => par.grupo.nome),
                ...(item.gruposDiretos || [])
                    .map((id) => db.grupos.find((g) => g.id == id)?.nome)
                    .filter(Boolean),
            ]),
        ].join(' '),
        // autoria é array {autorId, papel} (nome mora no cadastro
        // central db.autores — ver migrarAutoria em db.js); nome e papel
        // entram na busca geral e no prefixo "autor:" (ver
        // CAMPOS_ATRIBUTO em utils.js), mesmo padrão de _buscaPessoas.
        _buscaAutoria: paresAutoria(item, db.autores)
            .map(({ autor, papel }) => `${autor.nome} ${papel || ''}`)
            .join(' '),
        // epocaRetratada guarda só epocaId (nome mora no cadastro central
        // db.epocas — ver migrarEpocas em db.js); nome e recorte entram na
        // busca geral e no prefixo "epoca:" (ver CAMPOS_ATRIBUTO em
        // utils.js), mesmo padrão de _buscaAutoria acima.
        _buscaEpoca: item.epocaRetratada
            ? [
                  nomeEpoca(item.epocaRetratada, db.epocas),
                  ROTULOS_RECORTE_EPOCA[item.epocaRetratada.recorte] || '',
              ]
                  .filter(Boolean)
                  .join(' ')
            : '',
        // envios é array {pessoa, data, meio, reacao, notas} — pessoa/meio
        // são texto livre (não vínculo por id), entram na busca geral e
        // no prefixo "envio:" junto de reação/notas (ver CAMPOS_ATRIBUTO
        // em utils.js), mesmo padrão de _buscaAnotacoes acima.
        _buscaEnvios: Array.isArray(item.envios)
            ? item.envios
                  .map(
                      (e) => `${e.pessoa || ''} ${e.meio || ''} ${e.reacao || ''} ${e.notas || ''}`,
                  )
                  .join(' ')
            : '',
        // reconhecimentos é array {premio, posicao, ano, texto} — premio é
        // texto livre (não vínculo por id), entram na busca geral e no
        // prefixo "reconhecimento:"/"reconhecimentos:" (ver CAMPOS_ATRIBUTO
        // em utils.js), mesmo padrão de _buscaEnvios acima.
        _buscaReconhecimentos: Array.isArray(item.reconhecimentos)
            ? item.reconhecimentos
                  .map(
                      (r) => `${r.premio || ''} ${r.posicao || ''} ${r.ano || ''} ${r.texto || ''}`,
                  )
                  .join(' ')
            : '',
    };
}

// Filtro dedicado Pessoa+Papel (ver comentário de filtroPessoaPoemas
// acima) — pessoaId e papel são independentes na UI (dois selects lado
// a lado), então os três casos possíveis são: nenhum preenchido (não
// filtra), só um preenchido (equivale a pessoa:/papel: da busca por
// texto — qualquer papel daquela pessoa, ou qualquer pessoa com aquele
// papel) e os dois preenchidos (exige o par exato: aquele papel
// especificamente naquela pessoa, resolvendo o caso que pessoa:X
// papel:Y na busca por texto não consegue).
function filtrarPorPessoaEPapel(lista, pessoaId, papel) {
    if (!pessoaId && !papel) return lista;
    return lista.filter((item) => {
        if (!Array.isArray(item.pessoas)) return false;
        return item.pessoas.some((p) => {
            const bateP = !pessoaId || String(p.pessoaId) === String(pessoaId);
            const batePapel = !papel || (p.papeis || []).includes(papel);
            return bateP && batePapel;
        });
    });
}

// Popula o select de Pessoa do filtro dedicado Pessoa+Papel (ver
// filtroPessoaPoemas acima) com todo o cadastro central db.pessoas,
// em ordem alfabética — mesmo padrão de preservar a seleção atual já
// usado no select de Livro (ver renderPoemas/renderProsas).
function popularSelectPessoaFiltro(id) {
    const sel = document.getElementById(id);
    if (!sel) return;
    const valorAtual = sel.value;
    const pessoasOrdenadas = [...db.pessoas].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    sel.innerHTML =
        '<option value="">-- Qualquer pessoa --</option>' +
        pessoasOrdenadas.map((p) => `<option value="${p.id}">${escapeHtml(p.nome)}</option>`).join('');
    if (Array.from(sel.options).some((o) => o.value === valorAtual)) sel.value = valorAtual;
}

// Popula o select de Papel do filtro dedicado Pessoa+Papel — lista
// fechada PAPEIS_PESSOA (ver utils.js), não muda entre renders, mas
// populamos aqui mesmo assim pra ficar no mesmo lugar/padrão do select
// de Pessoa acima.
function popularSelectPapelFiltro(id) {
    const sel = document.getElementById(id);
    if (!sel) return;
    const valorAtual = sel.value;
    sel.innerHTML =
        '<option value="">-- Qualquer papel --</option>' +
        PAPEIS_PESSOA.map((papel) => `<option value="${escapeHtml(papel)}">${escapeHtml(papel)}</option>`).join('');
    if (Array.from(sel.options).some((o) => o.value === valorAtual)) sel.value = valorAtual;
}

// ─── Seleção múltipla de Poemas (ações em massa) ──────────────

// Retorna a lista de poemas atualmente visível, já com status, busca
// (incluindo nomes de livros) e ordenação aplicados — usada tanto pela
// renderização quanto pela seleção em massa, pra ficarem sempre coerentes.
export function getListaVisivelPoemas() {
    let base = db.poemas;
    if (statusPoemas === 'publicados') base = base.filter((p) => p.status === 'publicado');
    else if (statusPoemas === 'nao-publicados') base = base.filter((p) => p.status !== 'publicado');
    else if (statusPoemas === 'completos') base = base.filter((p) => p.status === 'completo');
    else if (statusPoemas === 'incompletos') base = base.filter((p) => p.status === 'incompleto');
    else if (statusPoemas === 'migrados') base = base.filter((p) => p.status === 'migrado');
    else if (statusPoemas === 'pendentes') base = base.filter((p) => p.pendencia?.trim());
    else if (statusPoemas === 'descartados') base = base.filter((p) => p.status === 'descartado');
    else if (statusPoemas === 'privados') base = base.filter((p) => p.status === 'privado');

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

    base = filtrarPorPessoaEPapel(base, filtroPessoaPoemas, filtroPapelPoemas);

    const decorada = base.map((p) => {
        const _livros = nomesLivros(p);
        return decorarCamposBusca({ ...p, _livros }, _livros);
    });
    let lista = combinarFiltrosBusca(
        decorada,
        filtroPoemas,
        filtroConteudoPoemas,
        combinadorBuscaPoemas,
        opcoesBuscaPoemas,
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
    } else if (ordenacaoPoemas.campo.startsWith(PREFIXO_ORDENACAO_CONTAGEM)) {
        // Coluna de contagem dinâmica (ver colunas-contagem.js) — o campo
        // que ela conta pode mudar a qualquer momento (seletor no
        // cabeçalho), então resolve pela coluna ativa no momento do sort
        // em vez de um comparador fixo em COMPARADORES_ORDENACAO_POEMAS.
        const id = ordenacaoPoemas.campo.slice(PREFIXO_ORDENACAO_CONTAGEM.length);
        const coluna = getColunasContagem('poemas').find((c) => String(c.id) === id);
        const contar = coluna ? CAMPOS_CONTAVEIS[coluna.campo]?.contar : null;
        if (contar) {
            const asc = ordenacaoPoemas.direcao === 'asc';
            lista = [...lista].sort((a, b) => {
                const diff = contar(a, db) - contar(b, db);
                return asc ? diff : -diff;
            });
        }
    } else {
        const comparador = COMPARADORES_ORDENACAO_POEMAS[ordenacaoPoemas.campo];
        if (comparador) {
            const asc = ordenacaoPoemas.direcao === 'asc';
            lista = [...lista].sort((a, b) => comparador(a, b, asc));
        }
    }
    return lista;
}

// Retorna a lista de prosas atualmente visível (livro/coletânea +
// busca já aplicados) — usada tanto pela renderização quanto pela
// seleção em massa (selecao-massa.js), pra ficarem sempre coerentes.
// Fica aqui (e não em selecao-massa.js) porque reatribui `semDataProsas`,
// estado que só este arquivo é dono.
export function getListaVisivelProsas() {
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

    base = filtrarPorPessoaEPapel(base, filtroPessoaProsas, filtroPapelProsas);

    const decorada = base.map((pr) => decorarCamposBusca(pr));
    let lista = combinarFiltrosBusca(
        decorada,
        filtroProsas,
        filtroConteudoProsas,
        combinadorBuscaProsas,
        opcoesBuscaProsas,
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
const ORDEM_STATUS = {
    incompleto: 0,
    completo: 1,
    publicado: 2,
    migrado: 3,
    descartado: 4,
    privado: 5,
};
function compararPorStatus(a, b, asc) {
    const sa = ORDEM_STATUS[a.status] ?? 1;
    const sb = ORDEM_STATUS[b.status] ?? 1;
    return asc ? sa - sb : sb - sa;
}

// Texto puro (sem HTML) dos títulos ligados por Elos/Referências — usado
// só pra ordenação; a célula em si (titulosPoemasPorId) escapa e formata
// à parte. `resolverRotulo` mesma função passada pra titulosPoemasPorId,
// pra ordenar pelo mesmo texto que aparece na coluna.
function textoTitulosPoemasPorId(lista, resolverRotulo) {
    if (!lista || !lista.length) return '';
    return lista
        .map((entrada) => {
            const titulo = resolverTituloPoemaOuProsa(entrada.id);
            if (!titulo) return null;
            const rotulo = resolverRotulo(entrada);
            return rotulo ? `${rotulo}: ${titulo}` : titulo;
        })
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
    idioma: compararPorTexto((p) => p.idioma),
    dataEscrita: compararPorData((p) => p.dataEscrita),
    dataPublicacao: compararPorData((p) => p.dataPublicacao),
    epocaRetratada: compararPorEpocaRetratada,
    status: compararPorStatus,
    pessoas: compararPorTexto((p) => nomesPessoas(p, db.pessoas).join(', ')),
    grupos: compararPorTexto((p) =>
        [
            ...paresGrupoPessoa(p, db.pessoas, db.grupos).map(({ grupo }) => grupo.nome),
            ...(p.gruposDiretos || [])
                .map((id) => db.grupos.find((g) => g.id == id)?.nome)
                .filter(Boolean),
        ].join(', '),
    ),
    autoria: compararPorTexto((p) =>
        paresAutoria(p, db.autores)
            .map(({ autor }) => autor.nome)
            .join(', '),
    ),
    envios: compararPorTexto((p) =>
        Array.isArray(p.envios) ? p.envios.map((e) => e.pessoa || '').join(', ') : '',
    ),
    reconhecimentos: compararPorTexto((p) =>
        Array.isArray(p.reconhecimentos)
            ? p.reconhecimentos.map((r) => r.premio || '').join(', ')
            : '',
    ),
    elos: compararPorTexto((p) => textoTitulosPoemasPorId(p.conceitos?.elos, rotuloEntradaElo)),
    referencias: compararPorTexto((p) =>
        textoTitulosPoemasPorId(p.conceitos?.referencias, rotuloEntradaReferencia),
    ),
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
        Array.isArray(p.anotacoesMarginais)
            ? p.anotacoesMarginais.map((it) => it.texto).join(' ')
            : '',
    ),
    descricaoVisual: compararPorTexto((p) => p.descricaoVisual),
    contextoHistorico: compararPorTexto((p) => p.contextoHistorico),
    autoavaliacao: compararPorTexto((p) => p.autoavaliacao),
    etiquetas: compararPorTexto((p) => sinalizacoesCombinadas(p)),
    notas: compararPorTexto((p) => p.notas),
    ocultacao: compararPorTexto((p) => p.ocultacao),
    conteudoSensivel: compararPorTexto((p) => p.conteudoSensivel),
    vocabularioHiperacionante: compararPorTexto((p) => p.vocabularioHiperacionante),
    cortadoDe: compararPorTexto((p) =>
        [p.cortadoDe?.livro, p.cortadoDe?.secao].filter(Boolean).join(' '),
    ),
    lancadoEm: compararPorTexto((p) =>
        [p.lancadoEm?.livro, p.lancadoEm?.secao].filter(Boolean).join(' '),
    ),
    justificativaMigracao: compararPorTexto((p) => p.justificativaMigracao),
    descarte: compararPorTexto((p) => p.descarte),
    pendencia: compararPorTexto((p) => p.pendencia),
    camposPreenchidos: (a, b, asc) => {
        const diff = contarCamposPreenchidos(a) - contarCamposPreenchidos(b);
        return asc ? diff : -diff;
    },
};

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
            ${
                l.isbn13 || l.isbn10
                    ? `<p class="text-[10px] font-mono text-gray-400 dark:text-slate-500 mt-0.5">${[l.isbn13 ? `ISBN-13: ${escapeHtml(l.isbn13)}` : '', l.isbn10 ? `ISBN-10: ${escapeHtml(l.isbn10)}` : ''].filter(Boolean).join(' · ')}</p>`
                    : ''
            }
            ${
                Array.isArray(l.lojas) && l.lojas.some((loja) => loja.url)
                    ? `<div class="flex flex-wrap gap-1 mt-2">
                        ${l.lojas
                            .filter((loja) => loja.url)
                            .map(
                                (loja) =>
                                    `<a href="${escapeHtml(loja.url)}" target="_blank" rel="noopener" class="text-[10px] bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800">🛒 ${escapeHtml(loja.nome) || 'Comprar'}</a>`,
                            )
                            .join('')}
                    </div>`
                    : ''
            }
            ${
                l.codigoBarrasUrl ||
                l.fichaCatalograficaUrl ||
                l.certificadoDireitoAutoralUrl ||
                l.cartaExclusividadeUrl ||
                l.pdfUrl ||
                l.epubUrl
                    ? `<div class="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[10px]">
                        ${l.pdfUrl ? `<a href="${escapeHtml(l.pdfUrl)}" target="_blank" rel="noopener" class="text-blue-600 dark:text-blue-400 underline">PDF</a>` : ''}
                        ${l.epubUrl ? `<a href="${escapeHtml(l.epubUrl)}" target="_blank" rel="noopener" class="text-blue-600 dark:text-blue-400 underline">Epub</a>` : ''}
                        ${l.codigoBarrasUrl ? `<a href="${escapeHtml(l.codigoBarrasUrl)}" target="_blank" rel="noopener" class="text-blue-600 dark:text-blue-400 underline">Código de barras</a>` : ''}
                        ${l.fichaCatalograficaUrl ? `<a href="${escapeHtml(l.fichaCatalograficaUrl)}" target="_blank" rel="noopener" class="text-blue-600 dark:text-blue-400 underline">Ficha catalográfica</a>` : ''}
                        ${l.certificadoDireitoAutoralUrl ? `<a href="${escapeHtml(l.certificadoDireitoAutoralUrl)}" target="_blank" rel="noopener" class="text-blue-600 dark:text-blue-400 underline">Certificado de direito autoral</a>` : ''}
                        ${l.cartaExclusividadeUrl ? `<a href="${escapeHtml(l.cartaExclusividadeUrl)}" target="_blank" rel="noopener" class="text-blue-600 dark:text-blue-400 underline">Carta de exclusividade</a>` : ''}
                    </div>`
                    : ''
            }
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
    popularSelectPessoaFiltro('filtro-pessoa-poemas');
    popularSelectPapelFiltro('filtro-papel-poemas');

    const listaFiltrada = getListaVisivelPoemas();
    atualizarAvisoSemData('aviso-sem-data-poemas', semDataPoemas);
    atualizarBarraSelecao();

    const colunasAtivas = getColunasAtivas('poemas');
    const colunasContagemAtivas = getColunasContagem('poemas');
    atualizarPainelColunas('poemas', 'painel-colunas-poemas');
    atualizarPainelAcoes('poemas', 'painel-acoes-poemas');

    const cabecalho = document.getElementById('cabecalho-poemas');
    if (cabecalho) {
        cabecalho.innerHTML = montarCabecalho(
            'poemas',
            `<th class="p-4 border-b w-8 border-gray-200 dark:border-slate-700 sticky left-0 top-0 z-20 bg-gray-100 dark:bg-slate-700"><input type="checkbox" id="check-todos-poemas" data-action="toggle-todos-poemas"></th>`,
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
        container.innerHTML = `<tr><td colspan="${colunasAtivas.length + colunasContagemAtivas.length + 3}" class="p-6 text-center text-gray-400 dark:text-slate-500 text-sm">Nenhum poema encontrado.</td></tr>`;
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
        idioma: (p) =>
            `<td class="p-4 text-xs text-gray-400 dark:text-slate-500 font-mono">${escapeHtml(p.idioma || 'pt-BR')}</td>`,
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
                privado: { emoji: '🔒', titulo: 'Privado' },
            };
            const { emoji, titulo } = INFO_STATUS[p.status] || { emoji: '⚪', titulo: 'Completo' };
            // Pendência agora é um campo independente do status — o 🟠 é
            // exibido junto do círculo de status normal (não no lugar dele)
            // sempre que houver texto preenchido em item.pendencia.
            const temPendencia = !!p.pendencia?.trim();
            const badgePendencia = temPendencia
                ? `<span title="Pendente: ${escapeHtml(p.pendencia.trim())}">🟠</span>`
                : '';
            return `<td class="p-4" title="${titulo}"><span class="inline-flex items-center gap-1">${emoji}${badgePendencia}</span></td>`;
        },
        dataPublicacao: (p) =>
            `<td class="p-4 text-xs text-gray-400 dark:text-slate-500 font-mono">${p.dataPublicacao ? formatarDataParcial(p.dataPublicacao) : '—'}</td>`,
        pessoas: (p) => `<td class="p-4">${badgesPessoas(p.pessoas)}</td>`,
        grupos: (p) => `<td class="p-4">${badgesGrupos(p)}</td>`,
        autoria: (p) => `<td class="p-4">${badgesAutoria(p)}</td>`,
        envios: (p) => `<td class="p-4">${badgesEnvios(p)}</td>`,
        reconhecimentos: (p) => `<td class="p-4">${badgesReconhecimentos(p)}</td>`,
        elos: (p) =>
            `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 max-w-xs">${titulosPoemasPorId(p.conceitos?.elos, rotuloEntradaElo, 'bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300')}</td>`,
        referencias: (p) =>
            `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 max-w-xs">${titulosPoemasPorId(p.conceitos?.referencias, rotuloEntradaReferencia, 'bg-fuchsia-100 dark:bg-fuchsia-900 text-fuchsia-700 dark:text-fuchsia-300')}</td>`,
        etiquetas: (p) => `<td class="p-4">${badgesEtiquetasPorCategoria(p)}</td>`,
        notas: (p) =>
            `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 max-w-xs">${trechoNota(p.notas)}</td>`,
        autoavaliacao: (p) =>
            `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 max-w-xs">${trechoNota(p.autoavaliacao)}</td>`,
        epocaRetratada: (p) => {
            const epoca = p.epocaRetratada;
            const na = epoca?.na;
            return `<td class="p-4 text-xs ${na ? 'text-gray-300 dark:text-slate-600 italic' : 'text-gray-400 dark:text-slate-500'}">${badgeEpocaRetratada(epoca)}<span class="font-mono">${formatarIntervaloEpocaRetratada(epoca)}</span></td>`;
        },
        intertextualidade: (p) => {
            const lista = Array.isArray(p.intertextualidade) ? p.intertextualidade : [];
            if (!lista.length)
                return `<td class="p-4 text-xs text-gray-300 dark:text-slate-600">—</td>`;
            const html = lista
                .map((it) => {
                    const badge = it.tipo
                        ? `<span class="inline-block px-1.5 py-0.5 mr-1 rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-[10px] font-bold uppercase align-middle">${escapeHtml(it.tipo)}</span>`
                        : '';
                    const link = it.link
                        ? ` <a href="${escapeHtml(it.link)}" target="_blank" rel="noopener" class="text-blue-600 dark:text-blue-400 underline">${escapeHtml(it.link)}</a>`
                        : '';
                    const nota = it.nota ? ` — ${trechoNota(it.nota)}` : '';
                    return `<div>${badge}${trechoNota(it.texto)}${link}${nota}</div>`;
                })
                .join('');
            return `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 max-w-xs">${html}</td>`;
        },
        anexos: (p) => {
            const lista = Array.isArray(p.anexos) ? p.anexos : [];
            if (!lista.length)
                return `<td class="p-4 text-xs text-gray-300 dark:text-slate-600">—</td>`;
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
            if (!lista.length)
                return `<td class="p-4 text-xs text-gray-300 dark:text-slate-600">—</td>`;
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
        justificativaMigracao: (p) =>
            `<td class="p-4 text-xs max-w-xs ${p.justificativaMigracao ? 'text-blue-700 dark:text-blue-400 border-l-2 border-blue-300 dark:border-blue-700' : 'text-gray-300 dark:text-slate-600'}">${p.justificativaMigracao ? trechoNota(p.justificativaMigracao) : '—'}</td>`,
        descarte: (p) =>
            `<td class="p-4 text-xs max-w-xs ${p.descarte ? 'text-amber-700 dark:text-amber-400 border-l-2 border-amber-300 dark:border-amber-700' : 'text-gray-300 dark:text-slate-600'}">${p.descarte ? trechoNota(p.descarte) : '—'}</td>`,
        pendencia: (p) =>
            `<td class="p-4 text-xs max-w-xs ${p.pendencia ? 'text-orange-700 dark:text-orange-400 border-l-2 border-orange-300 dark:border-orange-700' : 'text-gray-300 dark:text-slate-600'}">${p.pendencia ? trechoNota(p.pendencia) : '—'}</td>`,
        camposPreenchidos: (p) => celulaCamposPreenchidos(p),
    };

    container.innerHTML = listaPagina
        .map((p) => {
            const celulasMeio = colunasAtivas
                .map((key) => (CELULAS_POEMAS[key] ? CELULAS_POEMAS[key](p) : ''))
                .join('');
            // Colunas de contagem (ver colunas-contagem.js) — uma <td> por
            // instância ativa, com a contagem do campo selecionado naquele
            // momento (não é fixo por linha, muda se o seletor no
            // cabeçalho mudar de campo).
            const celulasContagem = colunasContagemAtivas
                .map((c) => {
                    const contar = CAMPOS_CONTAVEIS[c.campo]?.contar;
                    const valor = contar ? contar(p, db) : 0;
                    return `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 font-mono text-right">${valor}</td>`;
                })
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
            ${celulasContagem}
            <td class="p-4 text-right space-x-2">
                ${celulaAcoesItem('poemas', 'poema', 'poemas', p.id)}
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
    popularSelectPessoaFiltro('filtro-pessoa-prosas');
    popularSelectPapelFiltro('filtro-papel-prosas');

    const listaFiltrada = getListaVisivelProsas();
    atualizarAvisoSemData('aviso-sem-data-prosas', semDataProsas);
    atualizarBarraSelecaoProsas();

    const colunasAtivas = getColunasAtivas('prosas');
    atualizarPainelColunas('prosas', 'painel-colunas-prosas');
    atualizarPainelAcoes('prosas', 'painel-acoes-prosas');

    const cabecalho = document.getElementById('cabecalho-prosas');
    if (cabecalho) {
        cabecalho.innerHTML = montarCabecalho(
            'prosas',
            `<th class="p-4 border-b w-8 border-gray-200 dark:border-slate-700 sticky left-0 top-0 z-20 bg-gray-100 dark:bg-slate-700"><input type="checkbox" id="check-todos-prosas" data-action="toggle-todos-prosas"></th>`,
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
        idioma: (pr) =>
            `<td class="p-4 text-xs text-gray-400 dark:text-slate-500 font-mono">${escapeHtml(pr.idioma || 'pt-BR')}</td>`,
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
        // Item 4: Prosa ganha o mesmo círculo de status de Poema (ver
        // CELULAS_POEMAS.status acima) — badgePendencia idêntico, mesmo
        // critério (texto em pr.pendencia, independente do status).
        status: (pr) => {
            const INFO_STATUS = {
                publicado: { emoji: '🟢', titulo: 'Publicado' },
                incompleto: { emoji: '🟡', titulo: 'Incompleto' },
                migrado: { emoji: '🔵', titulo: 'Migrado' },
                descartado: { emoji: '🔴', titulo: 'Descartado' },
                privado: { emoji: '🔒', titulo: 'Privado' },
            };
            const { emoji, titulo } = INFO_STATUS[pr.status] || { emoji: '⚪', titulo: 'Completo' };
            const temPendencia = !!pr.pendencia?.trim();
            const badgePendencia = temPendencia
                ? `<span title="Pendente: ${escapeHtml(pr.pendencia.trim())}">🟠</span>`
                : '';
            return `<td class="p-4" title="${titulo}"><span class="inline-flex items-center gap-1">${emoji}${badgePendencia}</span></td>`;
        },
        dataPublicacao: (pr) =>
            `<td class="p-4 text-xs text-gray-400 dark:text-slate-500 font-mono">${pr.dataPublicacao ? formatarDataParcial(pr.dataPublicacao) : '—'}</td>`,
        pessoas: (pr) => `<td class="p-4">${badgesPessoas(pr.pessoas)}</td>`,
        grupos: (pr) => `<td class="p-4">${badgesGrupos(pr)}</td>`,
        autoria: (pr) => `<td class="p-4">${badgesAutoria(pr)}</td>`,
        envios: (pr) => `<td class="p-4">${badgesEnvios(pr)}</td>`,
        reconhecimentos: (pr) => `<td class="p-4">${badgesReconhecimentos(pr)}</td>`,
        etiquetas: (pr) => `<td class="p-4">${badgesEtiquetasPorCategoria(pr)}</td>`,
        genero: (pr) =>
            `<td class="p-4">${badgesEtiquetas(pr.genero, 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-400')}</td>`,
        notas: (pr) =>
            `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 max-w-xs">${trechoNota(pr.notas)}</td>`,
        autoavaliacao: (pr) =>
            `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 max-w-xs">${trechoNota(pr.autoavaliacao)}</td>`,
        epocaRetratada: (pr) => {
            const epoca = pr.epocaRetratada;
            const na = epoca?.na;
            return `<td class="p-4 text-xs ${na ? 'text-gray-300 dark:text-slate-600 italic' : 'text-gray-400 dark:text-slate-500'}">${badgeEpocaRetratada(epoca)}<span class="font-mono">${formatarIntervaloEpocaRetratada(epoca)}</span></td>`;
        },
        contextoHistorico: (pr) =>
            `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 max-w-xs">${trechoNota(pr.contextoHistorico)}</td>`,
        elos: (pr) =>
            `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 max-w-xs">${titulosPoemasPorId(pr.conceitos?.elos, rotuloEntradaElo, 'bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300')}</td>`,
        referencias: (pr) =>
            `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 max-w-xs">${titulosPoemasPorId(pr.conceitos?.referencias, rotuloEntradaReferencia, 'bg-fuchsia-100 dark:bg-fuchsia-900 text-fuchsia-700 dark:text-fuchsia-300')}</td>`,
        intertextualidade: (pr) => {
            const lista = Array.isArray(pr.intertextualidade) ? pr.intertextualidade : [];
            if (!lista.length)
                return `<td class="p-4 text-xs text-gray-300 dark:text-slate-600">—</td>`;
            const html = lista
                .map((it) => {
                    const badge = it.tipo
                        ? `<span class="inline-block px-1.5 py-0.5 mr-1 rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-[10px] font-bold uppercase align-middle">${escapeHtml(it.tipo)}</span>`
                        : '';
                    const link = it.link
                        ? ` <a href="${escapeHtml(it.link)}" target="_blank" rel="noopener" class="text-blue-600 dark:text-blue-400 underline">${escapeHtml(it.link)}</a>`
                        : '';
                    const nota = it.nota ? ` — ${trechoNota(it.nota)}` : '';
                    return `<div>${badge}${trechoNota(it.texto)}${link}${nota}</div>`;
                })
                .join('');
            return `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 max-w-xs">${html}</td>`;
        },
        anexos: (pr) => {
            const lista = Array.isArray(pr.anexos) ? pr.anexos : [];
            if (!lista.length)
                return `<td class="p-4 text-xs text-gray-300 dark:text-slate-600">—</td>`;
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
        anexosNotaGeral: (pr) =>
            `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 max-w-xs">${trechoNota(pr.anexosNotaGeral)}</td>`,
        ocultacao: (pr) =>
            `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 max-w-xs">${trechoNota(pr.ocultacao)}</td>`,
        conteudoSensivel: (pr) =>
            `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 max-w-xs">${trechoNota(pr.conteudoSensivel)}</td>`,
        vocabularioHiperacionante: (pr) =>
            `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 max-w-xs">${trechoNota(pr.vocabularioHiperacionante)}</td>`,
        cortadoDe: (pr) =>
            `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 max-w-xs">${pr.cortadoDe ? escapeHtml(`${pr.cortadoDe.livro || ''} ${pr.cortadoDe.secao || ''}`.trim()) : '—'}</td>`,
        lancadoEm: (pr) =>
            `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 max-w-xs">${pr.lancadoEm ? escapeHtml(`${pr.lancadoEm.livro || ''} ${pr.lancadoEm.secao || ''}`.trim()) : '—'}</td>`,
        justificativaMigracao: (pr) =>
            `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 max-w-xs">${trechoNota(pr.justificativaMigracao)}</td>`,
        pendencia: (pr) =>
            `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 max-w-xs">${trechoNota(pr.pendencia)}</td>`,
        descarte: (pr) =>
            `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 max-w-xs">${trechoNota(pr.descarte)}</td>`,
        camposPreenchidos: (pr) => celulaCamposPreenchidos(pr),
    };

    container.innerHTML = listaPaginaPr
        .map((pr) => {
            const pubBadge = estaPublicado(pr)
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
                ${celulaAcoesItem('prosas', 'prosa', 'prosas', pr.id)}
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

// ─── Pessoas ─────────────────────────────────────────────────
// Cadastro central (ver migrarPessoasParaCadastro em db.js). Ordenada
// alfabeticamente — diferente de Livros/Partes, não tem uma "ordem
// editorial" própria pra Pessoa, então não há botões de mover.

export function renderPessoas() {
    const container = document.getElementById('lista-pessoas');
    if (!container) return;

    const ordenadas = [...db.pessoas].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    if (ordenadas.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center text-gray-400 dark:text-slate-500 text-sm py-6">Nenhuma pessoa cadastrada ainda.</div>`;
        return;
    }

    container.innerHTML = ordenadas
        .map((p) => {
            // Objetos de Grupo (não só nome, ver nomesGrupos em utils.js)
            // pra cada badge poder usar a cor própria daquele grupo —
            // ver classesCorGrupo/CORES_GRUPO em utils.js.
            const grupos = (p.grupoIds || [])
                .map((id) => db.grupos.find((g) => g.id === id))
                .filter(Boolean);
            const { poemasIds, prosasIds } = calcularImpactoExclusaoPessoa(db, p.id);
            const totalTextos = poemasIds.length + prosasIds.length;
            return `
        <div class="bg-white dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm flex justify-between items-center">
            <div class="flex-1 min-w-0">
                <h4 class="font-bold text-gray-800 dark:text-slate-100">${escapeHtml(p.nome)}</h4>
                <div class="flex flex-wrap gap-1 mt-1">
                    ${
                        grupos.length
                            ? grupos
                                  .map(
                                      (g) =>
                                          `<span class="text-[9px] ${classesCorGrupo(g.cor)} px-1.5 py-0.5 rounded">${escapeHtml(g.nome)}</span>`,
                                  )
                                  .join('')
                            : `<span class="text-[10px] text-gray-300 dark:text-slate-600 italic">sem grupo</span>`
                    }
                </div>
                <p class="text-[10px] text-gray-400 dark:text-slate-500 font-mono mt-1">
                    aparece em ${totalTextos} texto${totalTextos !== 1 ? 's' : ''}
                </p>
            </div>
            <div class="flex gap-3 flex-shrink-0">
                <button data-action="editar-pessoa" data-id="${p.id}" title="Editar" aria-label="Editar" class="inline-flex items-center justify-center p-1.5 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40">${ICONE_EDITAR}</button>
                <button data-action="mesclar-item" data-tipo="pessoas" data-id="${p.id}" title="Mesclar com outra pessoa" aria-label="Mesclar" class="inline-flex items-center justify-center p-1.5 rounded text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40">${ICONE_MESCLAR}</button>
                <button data-action="excluir-item" data-tipo="pessoas" data-id="${p.id}" title="Excluir" aria-label="Excluir" class="inline-flex items-center justify-center p-1.5 rounded text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40">${ICONE_EXCLUIR}</button>
            </div>
        </div>`;
        })
        .join('');
}

// ─── Grupos ──────────────────────────────────────────────────
// Registro dedicado (ver conversa que definiu isso: cadastrável de
// verdade, não tag livre) — cria/edita/renomeia formalmente, sem
// hardcode no código-fonte. Mostra quantas pessoas pertencem a cada
// grupo, pra dar uma noção de impacto antes de excluir.

export function renderGrupos() {
    const container = document.getElementById('lista-grupos');
    if (!container) return;

    const ordenados = [...db.grupos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    if (ordenados.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center text-gray-400 dark:text-slate-500 text-sm py-6">Nenhum grupo cadastrado ainda.</div>`;
        return;
    }

    container.innerHTML = ordenados
        .map((g) => {
            const { pessoasIds } = calcularImpactoExclusaoGrupo(db, g.id);
            return `
        <div class="bg-white dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm flex justify-between items-center">
            <div class="flex-1 min-w-0">
                <h4 class="font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                    <span class="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${pontoCorGrupo(g.cor)}" title="Cor do grupo" aria-hidden="true"></span>
                    ${escapeHtml(g.nome)}
                </h4>
                <p class="text-[10px] text-gray-400 dark:text-slate-500 font-mono mt-1">
                    ${pessoasIds.length} pessoa${pessoasIds.length !== 1 ? 's' : ''}
                </p>
            </div>
            <div class="flex gap-3 flex-shrink-0">
                <button data-action="editar-grupo" data-id="${g.id}" title="Editar" aria-label="Editar" class="inline-flex items-center justify-center p-1.5 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40">${ICONE_EDITAR}</button>
                <button data-action="excluir-item" data-tipo="grupos" data-id="${g.id}" title="Excluir" aria-label="Excluir" class="inline-flex items-center justify-center p-1.5 rounded text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40">${ICONE_EXCLUIR}</button>
            </div>
        </div>`;
        })
        .join('');
}

// ─── Autores ─────────────────────────────────────────────────
// Cadastro central (ver migrarAutoria em db.js), à parte de Pessoas —
// mesmo espírito de renderPessoas acima, mas sem grupos (Autor não tem
// taxonomia própria) e mostrando "sobre" em vez de badges.

export function renderAutores() {
    const container = document.getElementById('lista-autores');
    if (!container) return;

    const ordenados = [...db.autores].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    if (ordenados.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center text-gray-400 dark:text-slate-500 text-sm py-6">Nenhum autor cadastrado ainda.</div>`;
        return;
    }

    container.innerHTML = ordenados
        .map((a) => {
            const { poemasIds, prosasIds } = calcularImpactoExclusaoAutor(db, a.id);
            const totalTextos = poemasIds.length + prosasIds.length;
            return `
        <div class="bg-white dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm flex justify-between items-center">
            <div class="flex-1 min-w-0">
                <h4 class="font-bold text-gray-800 dark:text-slate-100">${escapeHtml(a.nome)}</h4>
                ${
                    a.isni
                        ? `<p class="text-[10px] font-mono text-gray-400 dark:text-slate-500 mt-0.5">ISNI: ${escapeHtml(a.isni)}</p>`
                        : ''
                }
                ${
                    a.sobre
                        ? `<p class="text-[10px] text-gray-400 dark:text-slate-500 mt-1 line-clamp-2">${escapeHtml(a.sobre)}</p>`
                        : ''
                }
                <p class="text-[10px] text-gray-400 dark:text-slate-500 font-mono mt-1">
                    aparece em ${totalTextos} texto${totalTextos !== 1 ? 's' : ''}
                </p>
            </div>
            <div class="flex gap-3 flex-shrink-0">
                <button data-action="editar-autor" data-id="${a.id}" title="Editar" aria-label="Editar" class="inline-flex items-center justify-center p-1.5 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40">${ICONE_EDITAR}</button>
                <button data-action="excluir-item" data-tipo="autores" data-id="${a.id}" title="Excluir" aria-label="Excluir" class="inline-flex items-center justify-center p-1.5 rounded text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40">${ICONE_EXCLUIR}</button>
            </div>
        </div>`;
        })
        .join('');
}

// ─── Épocas ──────────────────────────────────────────────────
// Cadastro central (ver migrarEpocas em db.js), item 3 do plano de
// schema — mesmo espírito de renderAutores acima: sem grupos/badges
// próprios, mostrando o "contextoRelacao" (ex.: "Parceiro A e Parceiro
// B") em vez de "sobre". Contagem considera Poema e Prosa (corrigido
// numa sessão posterior — ver comentário de calcularImpactoExclusaoEpoca
// em db.js; comentário antigo aqui dizia "só Poema" por resquício do
// mesmo gap). Botão "Mesclar" (ver renderPessoas acima e Mesclar
// (Pessoa/Época) em forms.js) — mesma lacuna de duplicata por rename
// existe pra Época.

export function renderEpocas() {
    const container = document.getElementById('lista-epocas');
    if (!container) return;

    const ordenadas = [...db.epocas].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    if (ordenadas.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center text-gray-400 dark:text-slate-500 text-sm py-6">Nenhuma época cadastrada ainda.</div>`;
        return;
    }

    container.innerHTML = ordenadas
        .map((ep) => {
            const { poemasIds, prosasIds } = calcularImpactoExclusaoEpoca(db, ep.id);
            const total = poemasIds.length + prosasIds.length;
            return `
        <div class="bg-white dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm flex justify-between items-center">
            <div class="flex-1 min-w-0">
                <h4 class="font-bold text-gray-800 dark:text-slate-100">${escapeHtml(ep.nome)}</h4>
                ${
                    ep.contextoRelacao
                        ? `<p class="text-[10px] text-gray-400 dark:text-slate-500 mt-1 line-clamp-2">${escapeHtml(ep.contextoRelacao)}</p>`
                        : ''
                }
                <p class="text-[10px] text-gray-400 dark:text-slate-500 font-mono mt-1">
                    aparece em ${total} texto${total !== 1 ? 's' : ''}
                </p>
            </div>
            <div class="flex gap-3 flex-shrink-0">
                <button data-action="editar-epoca" data-id="${ep.id}" title="Editar" aria-label="Editar" class="inline-flex items-center justify-center p-1.5 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40">${ICONE_EDITAR}</button>
                <button data-action="mesclar-item" data-tipo="epocas" data-id="${ep.id}" title="Mesclar com outra época" aria-label="Mesclar" class="inline-flex items-center justify-center p-1.5 rounded text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40">${ICONE_MESCLAR}</button>
                <button data-action="excluir-item" data-tipo="epocas" data-id="${ep.id}" title="Excluir" aria-label="Excluir" class="inline-flex items-center justify-center p-1.5 rounded text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40">${ICONE_EXCLUIR}</button>
            </div>
        </div>`;
        })
        .join('');
}
