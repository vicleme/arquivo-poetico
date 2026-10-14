// ============================================================
// render-listas.js — Renderização das abas em lista/grid/tabela:
// Livros, Partes, Seções, Poemas e Prosas (ambas com seleção
// múltipla e ações em massa) e Elementos.
//
// Extraído de render.js — ver render-estrutura.js (árvore da aba
// "Estrutura") e render-lightbox.js (capas + lightbox, usado aqui
// via preencherCapas).
// ============================================================

import { nomesDasAncoras } from './ancora-eco.js';
import {
    db,
    save,
    calcularImpactoExclusaoPessoa,
    calcularImpactoExclusaoGrupo,
    calcularImpactoExclusaoAutor,
    calcularImpactoExclusaoEpoca,
    calcularImpactoExclusaoPeriodoHistorico,
    textosDoPeriodoHistorico,
    NIVEL_MAXIMO_GRUPO,
} from './db.js';
import { baixarAssuntosMarkdown } from './exportar-assuntos.js';
import {
    nomesPersonagens,
    nomesPersonagensPorCentralidade,
    nomesPersonagensPorPapel,
} from './personagens.js';
import {
    ordenarCorrentesEmArvore,
    impactoDaCorrente,
    nomesDeBuscaDasCorrentes,
    filhosDaCorrente,
    caminhoDaCorrente,
    posturaEfetivaDaCorrente,
    programaEfetivoDaCorrente,
    filtrarCorrentesPorAtributos,
    filtroDeAtributosAtivo,
    opcoesDeRegiaoDasCorrentes,
    ancestraisForaDe,
    periodoEfetivoDaCorrente,
    posturasDasCorrentes,
    programasDasCorrentes,
    FILTRO_CORRENTE_VAZIO,
} from './correntes-hierarquia.js';
import {
    ordenarPeriodosEmArvore,
    ancestraisForaDoPeriodo,
    caminhoDoPeriodo,
    caminhoDosAncestraisDoPeriodo,
    paisDoPeriodo,
    filhosDoPeriodo,
    nomesDeBuscaDosPeriodos,
} from './periodos-historicos-hierarquia.js';
import {
    criarComparadorDeEpocas,
    datasEfetivasDoPeriodo,
} from './periodos-biograficos-hierarquia.js';
import {
    contarTextosPorTema,
    textosDoTema,
    temasCadastradosSemAssunto,
    sugerirTemasDuplicados,
} from './temas.js';
import {
    getElementHierarchy,
    getPosicaoElemento,
    filtrarTextos,
    filtrarPorConteudo,
    normalizarBusca,
    parseConsultaNumero,
    opcoesBuscaPadrao,
    formatarDataParcial,
    formatarIntervaloEpocaRetratada,
    formatarIntervaloPeriodoHistorico,
    formatarIntervaloMovimentoEscola,
    anoEquivalenteMovimento,
    nomeEpocaExibivel,
    nomesMovimentosEscolas,
    TIPOS_MOVIMENTO_ESCOLA,
    PROGRAMAS_MOVIMENTO,
    POSTURAS_ESTETICAS,
    situacaoDominioPublico,
    rotuloDominioPublico,
    ROTULOS_RECORTE_EPOCA,
    escapeHtml,
    sanitizarTextoRico,
    mostrarAviso,
    mostrarAvisoComAcao,
    itemBateFiltroData,
    filtroDataVazio,
    itemFaltaDataParaFiltro,
    parseFiltroDataRapido,
    filtrarPeriodosPorData,
    periodoTemData,
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
    PAPEIS_PESSOA,
    corpoEntradaHipertextualidade,
    OPCOES_GRAFIA,
    simboloGeneroPessoa,
    formaOcultaAdjetivoPorGenero,
    assuntosDoTexto,
    assuntosComPapel,
    nomesAssuntosPorPapel,
    temasComPapel,
    chaveTema,
    contarTextosPorAssunto,
    resumoTemas,
    nomesTemasDoAssunto,
    nomesTemasPorPapel,
    nomesIdiomasPorPapel,
    textoIdiomasComPapel,
    dialetosDoItem,
    htmlSeloSituacaoEditorial,
    livroForaDeCirculacao,
    rotuloSituacaoEditorial,
    periodosHistoricosIdsDoItem,
    escaparAspasBusca,
} from './utils.js';
import { regiaoVazia, textoDaRegiao } from './regiao.js';
import {
    exibindoOcultasDosPeriodos,
    definirExibirOcultasDosPeriodos,
    opcoesOcultasDosPeriodos,
} from './ocultas-periodos.js';
import {
    FILTRO_PERIODO_BIOGRAFICO_VAZIO,
    filtroPeriodoBiograficoAtivo,
    filtrarPeriodosBiograficos,
    opcoesDeFiltroBiografico,
    linhasDoPeriodoBiografico,
    periodosVisiveis,
    textoBuscaEsferas,
    textoBuscaCategorias,
    textoBuscaNaturezas,
    textoBuscaVinculos,
    textoBuscaPessoasDoPeriodo,
} from './periodo-biografico-campos.js';
import {
    buscaTerritorialidadeDoTexto,
    buscaLocalEscritaDoTexto,
    caminhoDoLocal,
    territorialidadeDoTexto,
    textoLocalComCaminho,
    textoLocalEscrita,
    textoTerritorialidadeComCaminho,
} from './locais.js';
import { preencherCapas } from './render-lightbox.js';
import { getColunasAtivas, DEFINICAO_COLUNAS, renderSeletorColunas } from './colunas.js';
import {
    getColunasContagem,
    PREFIXO_ORDENACAO as PREFIXO_ORDENACAO_CONTAGEM,
    itemBateFiltrosContagem,
    registroContavel,
    renderOpcoesCampoContagem,
} from './colunas-contagem.js';
import { contarCamposPreenchidos } from './exportar-md.js';
import { isAcaoAtiva } from './acoes-coluna.js';
import {
    celulaAcoesItem,
    resolverTituloPoemaOuProsa,
    titulosPoemasPorId,
    rotuloEntradaElo,
    rotuloEntradaEco,
    trechoNota,
    celulaAutoclassificacao,
    celulaCamposPreenchidos,
    montarPaginacao,
    montarCabecalho,
    atualizarPainelColunas,
    atualizarPainelAcoes,
    badgesEtiquetas,
    badgesEtiquetasPorCategoria,
    badgesTemas,
    badgesAssuntos,
    badgesPessoas,
    badgesPersonagens,
    badgesGrupos,
    badgesAutoria,
    badgesEnvios,
    badgesReconhecimentos,
    badgeEpocaRetratada,
    celulaFonte,
    celulaGrafia,
} from './celulas-tabela.js';
// selecao-massa.js importa `selecaoPoemas`/`selecaoProsas`/
// `getListaVisivelPoemas`/`getListaVisivelProsas`/`renderPoemas`/
// `renderProsas` daqui — import circular proposital, ver nota no topo
// de selecao-massa.js.
import { atualizarBarraSelecao } from './selecao-massa.js';
// Circular com autores-acoes.js, mesmo padrão (seguro) já documentado
// no header de lá: usado só dentro de verAutoresMovimentoEscola abaixo,
// nunca no topo do módulo.
import { setFiltroAutores } from './autores-acoes.js';
import { abrirPorAtalho } from './faixa-origem.js';
import {
    selecaoAutores,
    getFiltroAutores,
    getListaVisivelAutores,
    podarSelecaoAutores,
    atualizarBarraSelecaoAutores,
} from './autores-acoes.js';
// pessoas-acoes.js importa `renderPessoas` daqui — mesmo import
// circular proposital de autores-acoes.js (ver nota junto do import
// dele, acima).
import {
    selecaoPessoas,
    getFiltroAutorPessoas,
    getFiltroGrupoPessoas,
    getFiltroNomePessoas,
    getListaVisivelPessoas,
    podarSelecaoPessoas,
    atualizarBarraSelecaoPessoas,
    getVisibilidadePessoas,
    getQtdOcultasPessoas,
} from './pessoas-acoes.js';
// epocas-acoes.js importa `renderEpocas` e `getListaVisivelEpocas` daqui:
// mesmo import circular proposital de pessoas-acoes.js.
import { selecaoEpocas, podarSelecaoEpocas, atualizarBarraSelecaoEpocas } from './epocas-acoes.js';

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

// Idem pras colunas de contagem (ver colunas-contagem.js) — agora
// disponíveis nas duas tabelas (ver Prosa e Poema.md, item 1).
window.addEventListener('colunas-contagem:alteradas', (ev) => {
    if (ev.detail?.tabela === 'poemas') renderPoemas();
    if (ev.detail?.tabela === 'prosas') renderProsas();
    if (ev.detail?.tabela === 'sonoridade') renderSonoridade();
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
// Placa de proibido/permitido — botão "Ocultar"/"Reexibir" dos cards de
// Pessoa e Grupo (ver renderPessoas/cartaoGrupo abaixo e
// migrarPessoasOculto/migrarGruposOculto em db.js). Ícone à parte do olho
// (ICONE_VER, mais abaixo) de propósito: o olho é usado em toda a
// aplicação só pra "Ver"/abrir modal (Autor, Sonoridade, Estrutura
// Textual, Movimento/Escola e o próprio "Ver" do Grupo), então reservar
// essa mesma forma pro toggle Ocultar/Reexibir confundiria as duas ações
// bem ali no card de Grupo, que tem os dois lado a lado. Círculo
// barrado/com check ecoa o 🚫 que a aba Estatísticas já usa pro conceito
// de "ocultar" (index.html, botões "🚫 Ocultar" dos painéis de Ano/Livro/
// Etiquetas/Pessoas), só que como par de estado (barrado = oculto,
// clique reexibe; com check = visível, clique oculta) em vez de emoji solto.
const ICONE_PROIBIDO = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 inline-block" aria-hidden="true"><circle cx="10" cy="10" r="7.25"/><path d="M4.9 4.9l10.2 10.2"/></svg>`;
const ICONE_PERMITIDO = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 inline-block" aria-hidden="true"><circle cx="10" cy="10" r="7.25"/><path d="M6.7 10.2l2.2 2.2 4.3-4.6"/></svg>`;

// Botão "Novo subgrupo" no card de um Grupo (ver cartaoGrupo abaixo) —
// some no último nível permitido (NIVEL_MAXIMO_GRUPO, ver db.js), que já
// é o mais fundo e não pode ter filho.
const ICONE_NOVO_SUBGRUPO = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 inline-block" aria-hidden="true"><path d="M10 5v10"/><path d="M5 10h10"/></svg>`;

// Três linhas — botão "Ver textos" do card de Pessoa (ver renderPessoas/
// verTextosPessoa abaixo). Ícone à parte de ICONE_VER (usado em outras
// telas pra abrir modal) de propósito: "Ver textos" não abre um modal de
// edição, abre a lista de poemas/prosas vinculados a essa Pessoa —
// reaproveitar o mesmo olho sugeriria a ação errada.
export const ICONE_LISTA_TEXTOS = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 inline-block" aria-hidden="true"><path d="M4 5.5h12"/><path d="M4 10h8"/><path d="M4 14.5h10"/></svg>`;
// Sugerir Ecos (Pessoa e Personagem): dois arcos que se repetem, como um eco.
export const ICONE_SUGERIR_ECOS = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 inline-block" aria-hidden="true"><circle cx="5" cy="10" r="1.6"/><path d="M9 6.5a5 5 0 0 1 0 7"/><path d="M12.5 4a8.5 8.5 0 0 1 0 12"/></svg>`;

// Duas cabeças — botão "Ver autores" do card de Movimento/Escola (ver
// renderMovimentosEscolas/verAutoresMovimentoEscola abaixo). Só
// Movimento/Escola tem esse botão: é o único dos três cadastros de
// período com vínculo direto a Autor (ver
// calcularImpactoExclusaoMovimentoEscola em db.js) — Época e Período
// Histórico só vinculam Poema/Prosa, então só ganham "Ver textos".
const ICONE_PESSOAS = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 inline-block" aria-hidden="true"><circle cx="7" cy="6.5" r="2.25"/><path d="M2.5 16c0-2.6 2-4.5 4.5-4.5s4.5 1.9 4.5 4.5"/><circle cx="14.5" cy="7.5" r="1.9"/><path d="M12.7 11.7c1.9.2 3.3 1.9 3.3 4"/></svg>`;

let filtroPoemas = '';
let filtroProsas = '';
let filtroConteudoPoemas = '';
let filtroConteudoProsas = '';
// "Caixa B" — busca pelo número da coluna Contagem de Poemas/Prosas
// (_numEstrutura), separada da Caixa A (filtroPoemas/filtroConteudoPoemas
// acima) de propósito: tudo que está na Caixa A entra ANTES do cálculo
// de _numEstrutura (pode deslocar a numeração); tudo que está aqui entra
// DEPOIS (só recorta o resultado, nunca realimenta a numeração) — ver
// aplicação em getListaVisivelPoemas/getListaVisivelProsas abaixo.
let filtroNumeroPoemas = '';
let filtroNumeroProsas = '';
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
// Ordenação das tabelas de Poemas e Prosas — clicável pelo cabeçalho das
// colunas (ver thOrdenavel() e DEFINICAO_COLUNAS[tabela][].sortType).
// `campo` é a key da coluna ('titulo' pra a coluna fixa ID/Título, ou uma
// key de DEFINICAO_COLUNAS[tabela]); CAMPO_ESTRUTURA_POR_TABELA[tabela] é
// o padrão de cada uma (ordem já vem assim do array-base, sem sort
// adicional) — 'estrutura' em Poemas, 'vinculo' em Prosas (mesmo dado,
// nome de coluna diferente, ver colunas.js).
export const CAMPO_ESTRUTURA_POR_TABELA = { poemas: 'estrutura', prosas: 'vinculo' };
export let ordenacaoPoemas = { campo: 'estrutura', direcao: 'asc' };
export let ordenacaoProsas = { campo: 'vinculo', direcao: 'asc' };
let statusPoemas = 'todos';
// Item 2 do plano de integração (ver Prosa e Poema.md): mesmo filtro de
// status de Poemas, aplicado a Prosas — o campo `status` (e `pendencia`,
// pro caso "Só pendentes") é idêntico nos dois (ver aplicarFiltroStatus).
let statusProsas = 'todos';
// Nunca reatribuídos (só .add/.delete/.clear/.has) — por isso dá pra
// exportar como const e deixar selecao-massa.js importar e mutar a
// mesma instância. A leitura (.has, pro checkbox de cada linha) mora
// aqui; a escrita (toggle/limpar/ações em massa) mora lá.
// Ids da lista filtrada que não estão na página exibida (base do botão
// "Selecionar restantes" da paginação).
function idsForaDaPagina(listaFiltrada, listaPagina) {
    const naPagina = new Set(listaPagina.map((x) => x.id));
    return listaFiltrada.map((x) => x.id).filter((id) => !naPagina.has(id));
}

export const selecaoPoemas = new Set();
export const selecaoProsas = new Set();
let filtroLivroPartes = '';
let filtroLivroSecoes = '';
let filtroParteSecoes = '';
let filtroLivroElementos = '';
// Filtro por Autor da aba Grupos — como grupo já pertence a um único
// Autor (g.autorId, obrigatório), aqui basta recortar quais cabeçalhos
// de Autor aparecem, sem precisar de N:N como o filtro equivalente de
// Pessoas (getFiltroAutorPessoas em pessoas-acoes.js). Vive aqui, perto
// de renderGrupos, e não em pessoas-acoes.js: não precisa de seleção
// nem ação em massa, só o filtro. Pedido do Victor, 27/09/2026.
let filtroAutorGrupos = '';
// Busca por nome na aba Grupos (sem diferenciar caixa/acento). Como Grupo
// é uma árvore, um grupo que bate na busca aparece junto com seus
// ancestrais (senão sobraria um subgrupo solto, sem o pai que dá contexto)
// e sem os descendentes que não batem; recolher/expandir é ignorado
// enquanto houver busca, pra um resultado nunca ficar escondido atrás de
// um pai recolhido. Ver idsGruposPorBusca/renderGrupos.
let filtroNomeGrupos = '';
// Set de ids visíveis pela busca atual (batidas + ancestrais) ou null sem
// busca — recalculado a cada renderGrupos, lido por cartoesDaFamilia.
let _idsBuscaGrupos = null;
// "Ocultar" (ver migrarGruposOculto em db.js) — mesmo espírito de
// visibilidadePessoas em pessoas-acoes.js (três estados: 'ativos'
// esconde os ocultos, 'todos' mostra tudo junto, 'ocultos' mostra só os
// ocultos), mas com uma diferença: aqui é em cascata — ocultar um Grupo
// esconde toda a família abaixo dele também (ver cartoesDaFamilia
// abaixo), já que "Ex-namorados" oculto some com os subgrupos dele
// junto — não dá pra reexibir só um neto sem o resto da árvore
// reaparecer. Por isso o modo 'ocultos' não usa cartoesDaFamilia: lista
// os grupos com `oculto: true` de fato (não a descendência que some
// junto por herança) de forma achatada, fora da árvore — é uma tela de
// gerenciar/recuperar, não a visão hierárquica normal (ver renderGrupos
// abaixo). Pedido do Victor, 27/09/2026.
let visibilidadeGrupos = 'ativos';

export function getVisibilidadeGrupos() {
    return visibilidadeGrupos;
}

export function setVisibilidadeGrupos(valor) {
    visibilidadeGrupos = ['ativos', 'todos', 'ocultos'].includes(valor) ? valor : 'ativos';
    renderGrupos();
}

// ─── Paginação (Poemas e Prosas) ────────────────────────────────
// "Itens por página" é uma preferência única, compartilhada entre as
// duas abas (persistida no navegador) — cada aba mantém sua própria
// página atual, já que dependem de filtros diferentes.
const LS_KEY_ITENS_POR_PAGINA = 'arquivoPoetico_itensPorPagina';
export const OPCOES_ITENS_POR_PAGINA = [10, 25, 50, 100, 200];

function lerItensPorPaginaSalvo() {
    const bruto = localStorage.getItem(LS_KEY_ITENS_POR_PAGINA);
    if (bruto === 'todos') return Infinity;
    const n = parseInt(bruto);
    return OPCOES_ITENS_POR_PAGINA.includes(n) ? n : 50;
}

export let itensPorPagina = lerItensPorPaginaSalvo();
let paginaPoemas = 1;
let paginaProsas = 1;
// Réplica do mesmo esquema pra Sonoridade e Morfofuncionalidade —
// ambas também podem crescer bastante (poema com escansão + estrofes
// classificadas linha a linha), então ganham paginação no mesmo
// espírito de Poemas/Prosas, com a mesma preferência "itens por
// página" compartilhada (ver setItensPorPagina abaixo).
let paginaSonoridade = 1;
let paginaEstruturaTextual = 1;

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

export function setFiltroAutorGrupos(valor) {
    filtroAutorGrupos = valor || '';
    renderGrupos();
}

export function setFiltroNomeGrupos(valor) {
    filtroNomeGrupos = valor || '';
    renderGrupos();
}

// Ids dos grupos cujo nome contém `termo` + todos os seus ancestrais
// (paiId acima), ou null se a busca está vazia. `vistos` evita laço se um
// dado corrompido tiver paiId circular.
function idsGruposPorBusca(termo) {
    const alvo = normalizarBusca((termo || '').trim());
    if (!alvo) return null;
    const ids = new Set();
    db.grupos.forEach((g) => {
        if (!normalizarBusca(g.nome).includes(alvo)) return;
        const vistos = new Set();
        let atual = g;
        while (atual && !vistos.has(atual.id)) {
            vistos.add(atual.id);
            ids.add(atual.id);
            atual = atual.paiId == null ? null : db.grupos.find((x) => x.id == atual.paiId);
        }
    });
    return ids;
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

// Select genérico de Autor — usado no filtro de Pessoas/Grupos
// (`placeholder` = "-- Todos os autores --") e no seletor "Vincular ao
// autor" da barra de ação em massa de Pessoas (`placeholder` =
// "Escolher autor…", sem opção "Todos", já que ali precisa de um autor
// de verdade escolhido pra aplicar). Mesmo espírito de
// popularFiltroLivro acima, mas Autor não tem uma lista já filtrada
// por tipo, então não precisa do .filter() daquela.
function popularSelectAutores(selectId, placeholder) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    if (!db.autores.length) {
        sel.innerHTML = '<option value="">Nenhum autor cadastrado ainda</option>';
        sel.disabled = true;
        return;
    }
    sel.disabled = false;
    const valorAtual = sel.value;
    sel.innerHTML =
        `<option value="">${placeholder}</option>` +
        [...db.autores]
            .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
            .map((a) => `<option value="${a.id}">${escapeHtml(a.nome)}</option>`)
            .join('');
    if (Array.from(sel.options).some((o) => o.value === valorAtual)) sel.value = valorAtual;
}

// Select "Adicionar ao grupo" da barra de ação em massa de Pessoas (e,
// desde o filtro por Grupo em Pessoas, também o próprio filtro) — mesma
// árvore Autor → família de grupos (nível 1 + descendência indentada)
// de `ps-grupos-container` (checkboxes do Modal de Pessoa, ver
// renderDropdowns em ui.js), só que como <option> dentro de <optgroup>
// por Autor, já que aqui só cabe escolher um grupo por vez.
// `placeholder` default mantém o texto de ação em massa; o filtro passa
// o seu próprio ("-- Todos os grupos --", mesmo padrão do filtro por
// Autor em popularSelectAutores).
function popularSelectGrupos(selectId, placeholder = 'Escolher grupo…') {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    if (!db.grupos.length) {
        sel.innerHTML = '<option value="">Nenhum grupo cadastrado ainda</option>';
        sel.disabled = true;
        return;
    }
    sel.disabled = false;
    const valorAtual = sel.value;
    const opcaoGrupo = (g, nivel) =>
        `<option value="${g.id}">${'— '.repeat(nivel - 1)}${escapeHtml(g.nome)}</option>`;
    const familiaOpcoes = (g, gruposDoAutor, nivel) => {
        const filhos = gruposDoAutor
            .filter((sub) => sub.paiId == g.id)
            .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        return (
            opcaoGrupo(g, nivel) +
            filhos.map((f) => familiaOpcoes(f, gruposDoAutor, nivel + 1)).join('')
        );
    };
    const autoresComGrupo = [...new Set(db.grupos.map((g) => g.autorId))]
        .map((id) => db.autores.find((a) => a.id == id))
        .filter(Boolean)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    sel.innerHTML =
        `<option value="">${placeholder}</option>` +
        autoresComGrupo
            .map((autor) => {
                const gruposDoAutor = db.grupos.filter((g) => g.autorId == autor.id);
                const nivel1 = gruposDoAutor
                    .filter((g) => g.paiId == null)
                    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
                const opcoes = nivel1.map((g) => familiaOpcoes(g, gruposDoAutor, 1)).join('');
                return `<optgroup label="${escapeHtml(autor.nome)}">${opcoes}</optgroup>`;
            })
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

// Atalho de clique no cabeçalho da coluna (ver thOrdenavel/iconeBuscaColuna):
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

// Setters da Caixa B (ver comentário em filtroNumeroPoemas acima) — mesmo
// padrão de setFiltroConteudoPoemas/Prosas: reseta a página e re-renderiza.
export function setFiltroNumeroPoemas(valor) {
    filtroNumeroPoemas = valor;
    paginaPoemas = 1;
    renderPoemas();
}

export function setFiltroNumeroProsas(valor) {
    filtroNumeroProsas = valor;
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

// Botão "Ver textos" do card de Pessoa (pedido do Victor, 27/09/2026,
// depois de descartar a ideia de um modal — ver conversa: autores e
// grupos já aparecem em badge no próprio card, o gap real era só não
// ter como chegar aos textos). Leva pra aba Poemas ou Prosas já
// filtrada por esta Pessoa, reaproveitando o filtro dedicado
// Pessoa+Papel que a própria aba já tem (filtroPessoaPoemas/
// filtroPessoaProsas — ver filtrarPorPessoaEPapel acima), não o
// prefixo `pessoa:` da busca por texto que as Estatísticas usam
// (navegarParaLista, estatisticas-tela-comum.js): aqui já existe um
// filtro por ID, mais preciso que casar por nome. Zera o filtro de
// Papel junto, senão um papel deixado marcado numa visita anterior
// esconderia textos desta pessoa sem nenhum aviso. Vai pra Poemas por
// padrão; só abre em Prosas se a pessoa não aparecer em nenhum poema
// mas aparecer em alguma prosa.
export function verTextosPessoa(id) {
    const { poemasIds, prosasIds } = calcularImpactoExclusaoPessoa(db, id);
    const destino = poemasIds.length === 0 && prosasIds.length > 0 ? 'prosas' : 'poemas';
    const pessoa = (db.pessoas || []).find((p) => p.id == id);
    const setPessoa = destino === 'prosas' ? setFiltroPessoaProsas : setFiltroPessoaPoemas;
    const setPapel = destino === 'prosas' ? setFiltroPapelProsas : setFiltroPapelPoemas;
    abrirPorAtalho({
        destino,
        descricao: `Textos com a pessoa “${pessoa?.nome ?? ''}”`,
        controles: [`filtro-pessoa-${destino}`, `filtro-papel-${destino}`],
        aplicar: () => {
            setPapel('');
            setPessoa(id);
            // Os dois setFiltro* acima já dispararam o re-render da lista (com o
            // filtro certo já aplicado); só falta sincronizar os <select>
            // visíveis, que no meio desse render leram o valor antigo direto do
            // próprio DOM (ver popularSelectPessoaFiltro/popularSelectPapelFiltro
            // acima) em vez do id que acabamos de passar.
            const selPessoa = document.getElementById(`filtro-pessoa-${destino}`);
            if (selPessoa) selPessoa.value = id;
            const selPapel = document.getElementById(`filtro-papel-${destino}`);
            if (selPapel) selPapel.value = '';
        },
        limpar: () => {
            setPessoa('');
            setPapel('');
            const selPessoa = document.getElementById(`filtro-pessoa-${destino}`);
            if (selPessoa) selPessoa.value = '';
            const selPapel = document.getElementById(`filtro-papel-${destino}`);
            if (selPapel) selPapel.value = '';
        },
    });
}

export function setFiltroPapelProsas(valor) {
    filtroPapelProsas = valor;
    paginaProsas = 1;
    renderProsas();
}

// Botões "Ver textos" de Época/Período Histórico/Movimento/Escola
// (pedido do Victor, 27/09/2026, na sequência do de Pessoa acima —
// mesma ideia, mas sem o filtro dedicado por ID que Pessoa tem
// (filtroPessoaPoemas/filtroPessoaProsas): essas três entidades só têm
// vínculo com Poema/Prosa via campo solto (epocaRetratada.epocaId,
// periodoHistoricoId, movimentosEscolasIds — ver db.js), sem UI de
// filtro por ID equivalente nas abas Poemas/Prosas. Em vez de criar
// esse filtro do zero pras três, reaproveita o mesmo mecanismo que a
// aba Estatísticas já usa pra drill-down (navegarParaLista,
// estatisticas-tela-comum.js): a Caixa A de busca já entende os
// prefixos `epoca:`, `periodohistorico:` e `movimento:`/`escola:` (ver
// CAMPOS_ATRIBUTO em utils.js), então basta jogar `prefixo:"Nome"` na
// mesma caixa. Nome entre aspas de propósito — sem aspas, um nome com
// mais de uma palavra vira vários termos soltos (ver
// parseConsultaBusca) e a busca deixa de ser exata. Vai pra Poemas por
// padrão; só abre em Prosas se o item não aparecer em nenhum poema mas
// aparecer em alguma prosa (mesmo critério de verTextosPessoa acima).
function abrirListaFiltrada(prefixo, nome, poemasIds, prosasIds) {
    abrirListaComConsulta(
        `${prefixo}:"${escaparAspasBusca(nome)}"`,
        poemasIds,
        prosasIds,
        `Textos filtrados por ${prefixo} “${nome}”`,
    );
}

// Mesma abertura de abrirListaFiltrada, com a consulta já montada — pra
// quem precisa de mais de um termo (ex.: "Ver textos" de um Assunto, que
// junta os Temas dele com "ou"). Mostra a faixa "Voltar / Limpar filtro"
// (faixa-origem.js) na aba de destino.
export function abrirListaComConsulta(consulta, poemasIds, prosasIds, descricao) {
    const destino = poemasIds.length === 0 && prosasIds.length > 0 ? 'prosas' : 'poemas';
    const setFiltro = destino === 'prosas' ? setFiltroProsas : setFiltroPoemas;
    abrirPorAtalho({
        destino,
        descricao: descricao || `Filtrando por ${consulta}`,
        controles: [`busca-${destino}`],
        aplicar: () => {
            setFiltro(consulta);
            // O setFiltro* já re-renderizou a lista com o filtro certo, só falta
            // refletir o valor na caixa de busca visível (ela lê o próprio DOM,
            // não este estado, então re-render sozinho não atualiza o digitado).
            const caixaBusca = document.getElementById(`busca-${destino}`);
            if (caixaBusca) caixaBusca.value = consulta;
        },
        limpar: () => {
            setFiltro('');
            const caixaBusca = document.getElementById(`busca-${destino}`);
            if (caixaBusca) caixaBusca.value = '';
        },
    });
}

// Período visível na tela agora: não oculto, ou "Exibir ocultas" ligado.
function periodoVisivelNaTela(epoca) {
    return !epoca?.oculto || exibindoOcultasDosPeriodos();
}

// Bloco 3: texto de busca dos campos novos do período biográfico do texto
// (o texto guarda só o epocaId; os campos moram em db.epocas).
function camposBuscaDoPeriodoBiografico(item) {
    const achada = item.epocaRetratada?.epocaId
        ? db.epocas.find((e) => e.id == item.epocaRetratada.epocaId)
        : null;
    // Período oculto não entra na busca (nem o nome, nem Esfera/Categoria/
    // pessoas), a menos que "Exibir ocultas" esteja ligado.
    const epoca = achada && periodoVisivelNaTela(achada) ? achada : null;
    return {
        _buscaEsferas: epoca ? textoBuscaEsferas(epoca) : '',
        _buscaCategorias: epoca ? textoBuscaCategorias(epoca) : '',
        _buscaNaturezas: epoca ? textoBuscaNaturezas(epoca, db, opcoesOcultasDaAba()) : '',
        _buscaVinculos: epoca ? textoBuscaVinculos(epoca, db, opcoesOcultasDaAba()) : '',
        _buscaPessoasPeriodo: epoca
            ? textoBuscaPessoasDoPeriodo(epoca, db, opcoesOcultasDaAba())
            : '',
    };
}

export function verTextosEpoca(id) {
    const ep = db.epocas.find((e) => e.id == id);
    if (!ep) return;
    const { poemasIds, prosasIds } = calcularImpactoExclusaoEpoca(db, id);
    abrirListaFiltrada('epoca', ep.nome, poemasIds, prosasIds);
}

export function verTextosPeriodoHistorico(id) {
    const ph = db.periodosHistoricos.find((p) => p.id == id);
    if (!ph) return;
    // Com os períodos de dentro: o pai (Nova República) abre a lista com os
    // textos do Governo Dilma e do Segundo mandato, e o prefixo
    // `periodohistorico:` já é hierárquico.
    const { poemasIds, prosasIds } = textosDoPeriodoHistorico(db, id, { comDentro: true });
    abrirListaFiltrada('periodohistorico', ph.nome, poemasIds, prosasIds);
}

export function verTextosMovimentoEscola(id) {
    const m = db.movimentosEscolas.find((x) => x.id == id);
    if (!m) return;
    // Com as divisões: o pai (Romantismo) abre a lista com os textos das
    // gerações e vertentes dele, e o prefixo `movimento:` já é hierárquico.
    const { poemasIds, prosasIds } = impactoDaCorrente(db, id, { comDivisoes: true });
    abrirListaFiltrada('movimento', m.nome, poemasIds, prosasIds);
}

// "Ver autores" do card de Movimento/Escola (único dos três com vínculo
// direto a Autor — ver calcularImpactoExclusaoMovimentoEscola em
// db.js): mesmo mecanismo de abrirListaFiltrada acima, mas pra aba
// Autores, que tem sua própria caixa de busca por prefixo com o mesmo
// `movimento:` (ver CAMPOS_ATRIBUTO_AUTOR em busca-autores.js).
export function verAutoresMovimentoEscola(id) {
    const m = db.movimentosEscolas.find((x) => x.id == id);
    if (!m) return;
    const consulta = `movimento:"${escaparAspasBusca(m.nome)}"`;
    abrirPorAtalho({
        destino: 'autores',
        descricao: `Autores da corrente literária “${m.nome}”`,
        controles: ['busca-autores'],
        aplicar: () => {
            setFiltroAutores(consulta);
            const caixaBusca = document.getElementById('busca-autores');
            if (caixaBusca) caixaBusca.value = consulta;
        },
        limpar: () => {
            setFiltroAutores('');
            const caixaBusca = document.getElementById('busca-autores');
            if (caixaBusca) caixaBusca.value = '';
        },
    });
}

// "Ver textos" do card de Autor (pedido do Victor, 28/09/2026): mesmo
// mecanismo de abrirListaFiltrada acima, com o prefixo `autor:` da
// busca (nome + nome literário + papel, ver _buscaAutoria). Casa por
// texto, não por id — dois autores com nomes que contêm um ao outro
// podem se misturar no resultado.
export function verTextosAutor(id) {
    const a = db.autores.find((x) => x.id == id);
    if (!a) return;
    const { poemasIds, prosasIds } = calcularImpactoExclusaoAutor(db, id);
    abrirListaFiltrada('autor', a.nome, poemasIds, prosasIds);
}

// Chamado ao clicar no cabeçalho de uma coluna ordenável da tabela de
// Poemas OU de Prosas (item 1 do plano de integração — ver Prosa e
// Poema.md): clicar na coluna já ativa inverte a direção; clicar numa
// coluna diferente troca pra ela, começando em ordem ascendente.
export function ordenarPor(tabela, campo) {
    if (tabela === 'prosas') {
        if (ordenacaoProsas.campo === campo) {
            ordenacaoProsas = {
                campo,
                direcao: ordenacaoProsas.direcao === 'asc' ? 'desc' : 'asc',
            };
        } else {
            ordenacaoProsas = { campo, direcao: 'asc' };
        }
        paginaProsas = 1;
        renderProsas();
        return;
    }
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

export function setStatusProsas(valor) {
    statusProsas = valor;
    paginaProsas = 1;
    renderProsas();
}

// Chamado pelo <select> de "itens por página" — vale pra Poemas e Prosas
// ao mesmo tempo, já que é uma preferência única.
export function setItensPorPagina(valor) {
    itensPorPagina = valor === 'todos' ? Infinity : parseInt(valor);
    localStorage.setItem(LS_KEY_ITENS_POR_PAGINA, valor);
    paginaPoemas = 1;
    paginaProsas = 1;
    paginaSonoridade = 1;
    paginaEstruturaTextual = 1;
    renderPoemas();
    renderProsas();
    renderSonoridade();
    renderEstruturaTextual();
}

export function setPaginaPoemas(pagina) {
    paginaPoemas = pagina;
    renderPoemas();
}

export function setPaginaProsas(pagina) {
    paginaProsas = pagina;
    renderProsas();
}

export function setPaginaSonoridade(pagina) {
    paginaSonoridade = pagina;
    renderSonoridade();
}

export function setPaginaEstruturaTextual(pagina) {
    paginaEstruturaTextual = pagina;
    renderEstruturaTextual();
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

// Texto de uma data parcial pra busca: vazio quando não há dia, mês nem ano
// (mesmo critério de itemFaltaDataParaFiltro em utils.js — hora sozinha não
// conta como data), pra `campo:*` distinguir "tem data" de "não tem".
function textoDataParaBusca(dataObj) {
    if (!dataObj || (!dataObj.dia && !dataObj.mes && !dataObj.ano)) return '';
    return formatarDataParcial(dataObj);
}

// Deriva, a partir do vínculo estrutural do item (paiTipo/paiId), os
// campos auxiliares usados pelo filtro por atributo "livro:"/"parte:"/
// "secao:" em filtrarTextos (utils.js). extraLivros é usado só pra
// Poemas, que também podem estar vinculados a outros livros/coletâneas
// via livrosIds (ver nomesLivros acima).
export function decorarCamposBusca(item, extraLivros = '') {
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
        _buscaReferenciasExternas: Array.isArray(item.referenciasExternas)
            ? item.referenciasExternas
                  .map(
                      (it) =>
                          `${it.tipo || ''} ${it.texto || ''} ${it.link || ''} ${it.nota || ''}`,
                  )
                  .join(' ')
            : '',
        _buscaHipertexto: Array.isArray(item.hipertextualidade)
            ? item.hipertextualidade
                  .map(
                      (h) =>
                          `${h.tipo || ''} ${h.relacao || ''} ${h.hipotexto || ''} ${h.link || ''} ${h.nota || ''}`,
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
                          `${it.trecho || ''} ${it.posicao || ''} ${it.fonte || ''} ${it.texto || ''} ${it.notas || ''}`,
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
        _buscaEcos: Array.isArray(item.conceitos?.ecos)
            ? item.conceitos.ecos
                  .map(
                      (it) =>
                          `${it.tipo || ''} ${nomesDasAncoras(db, it.ancoras)} ${it.texto || ''} ${resolverTituloPoemaOuProsa(it.id)}`,
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
            .map(
                ({ autor, papel, nomeLiterario }) =>
                    `${autor.nome} ${nomeLiterario || ''} ${papel || ''}`,
            )
            .join(' '),
        // Personagens guarda só o id (nome mora em db.personagens — ver
        // personagens.js); o nome entra na busca geral e no prefixo
        // "personagem:".
        _buscaPersonagens: nomesPersonagens(item, db.personagens).join(' '),
        // Por papel e por centralidade do vínculo (nomesPersonagensPorPapel e
        // nomesPersonagensPorCentralidade em personagens.js): alimentam
        // personagemvoz: ... personagemalusao: e personagemprotagonista:,
        // personagemsecundario:, personagemsemcentralidade:. Vazio quando
        // ninguém bate, então `prefixo:*` e `-prefixo:*` funcionam.
        _buscaPersonagemVoz: nomesPersonagensPorPapel(item, db.personagens, 'Voz').join(', '),
        _buscaPersonagemInterlocutor: nomesPersonagensPorPapel(
            item,
            db.personagens,
            'Interlocutor',
        ).join(', '),
        _buscaPersonagemAparicao: nomesPersonagensPorPapel(item, db.personagens, 'Aparição').join(
            ', ',
        ),
        _buscaPersonagemMencao: nomesPersonagensPorPapel(item, db.personagens, 'Menção').join(', '),
        _buscaPersonagemAlusao: nomesPersonagensPorPapel(item, db.personagens, 'Alusão').join(', '),
        _buscaPersonagemProtagonista: nomesPersonagensPorCentralidade(
            item,
            db.personagens,
            'protagonista',
        ).join(', '),
        _buscaPersonagemSecundario: nomesPersonagensPorCentralidade(
            item,
            db.personagens,
            'secundario',
        ).join(', '),
        _buscaPersonagemSemCentralidade: nomesPersonagensPorCentralidade(
            item,
            db.personagens,
            '',
        ).join(', '),
        // epocaRetratada guarda só epocaId (nome mora no cadastro central
        // db.epocas — ver migrarEpocas em db.js); nome e recorte entram na
        // busca geral e no prefixo "epoca:" (ver CAMPOS_ATRIBUTO em
        // utils.js), mesmo padrão de _buscaAutoria acima.
        _buscaEpoca: item.epocaRetratada
            ? [
                  // Período oculto: a busca acha o rótulo "(período oculto)",
                  // não o nome real.
                  nomeEpocaExibivel(item.epocaRetratada, db.epocas, opcoesOcultasDosPeriodos()),
                  ROTULOS_RECORTE_EPOCA[item.epocaRetratada.recorte] || '',
              ]
                  .filter(Boolean)
                  .join(' ')
            : '',
        // Bloco 3: Esfera, Categoria, Natureza, Vínculo e Pessoas do Período
        // Biográfico do texto (prefixos esfera:, categoria:, natureza:, vinculo:,
        // pessoaperiodo:;
        // ver CAMPOS_ATRIBUTO em utils.js). Pessoa oculta não entra.
        ...camposBuscaDoPeriodoBiografico(item),
        // dataEscrita/dataPublicacao são objetos {dia, mes, ano, exata} (não
        // texto); aqui viram o texto formatado (ex.: "15/03/2020") pros
        // prefixos "dataescrita:" e "datapublicacao:" (ver CAMPOS_ATRIBUTO
        // em utils.js). Sem nenhuma parte da data (dia/mês/ano), o campo fica
        // vazio — é isso que faz `dataescrita:*` e `-dataescrita:*` separarem
        // quem tem e quem não tem data. O filtro De/Até continua à parte.
        _buscaDataEscrita: textoDataParaBusca(item.dataEscrita),
        _buscaDataPublicacao: textoDataParaBusca(item.dataPublicacao),
        // periodoHistoricoId guarda só o id (nome mora no cadastro central
        // db.periodosHistoricos — ver migrarPeriodosHistoricos em db.js);
        // nome entra na busca geral e no prefixo "periodohistorico:" (ver
        // CAMPOS_ATRIBUTO em utils.js), mesmo padrão de _buscaEpoca acima —
        // sem recorte de data, porque Período Histórico não tem esse campo.
        // Hierárquico (ver periodos-historicos-hierarquia.js): o nome do
        // período e o dos que o contêm; `periodohistoricodireto:` só o exato.
        // Bloco 2e: o texto pode ter vários períodos (`periodosHistoricosIds`);
        // qualquer um deles, ou qualquer ancestral de qualquer um, acha o texto.
        _buscaPeriodoHistorico: nomesDeBuscaDosPeriodos(
            db.periodosHistoricos,
            periodosHistoricosIdsDoItem(item),
            { comAncestrais: true },
        ).join(' '),
        _buscaPeriodoHistoricoDireto: nomesDeBuscaDosPeriodos(
            db.periodosHistoricos,
            periodosHistoricosIdsDoItem(item),
        ).join(' '),
        // movimentosEscolasIds guarda só os ids (nomes moram no cadastro
        // central db.movimentosEscolas — ver migrarMovimentosEscolasIds em
        // db.js); nomes entram na busca geral e no prefixo "movimento:"
        // (ver CAMPOS_ATRIBUTO em utils.js), mesmo padrão de
        // _buscaPeriodoHistorico acima, só que é N:N (join com espaço).
        // Hierárquico (ver nomesDeBuscaDasCorrentes): `movimento:Romantismo`
        // acha também o texto ligado a uma geração ou vertente dele.
        // `movimentodireto:` restringe ao que foi ligado diretamente.
        _buscaMovimentosEscolas: nomesDeBuscaDasCorrentes(
            db.movimentosEscolas,
            item.movimentosEscolasIds,
            { comAncestrais: true },
        ).join(' '),
        _buscaMovimentosEscolasDireto: nomesDeBuscaDasCorrentes(
            db.movimentosEscolas,
            item.movimentosEscolasIds,
        ).join(' '),
        // Postura estética e Programa efetivos (com a herança do pai) das
        // correntes ligadas ao texto: `postura:` e `programa:`.
        _buscaPosturas: posturasDasCorrentes(db.movimentosEscolas, item.movimentosEscolasIds).join(
            ', ',
        ),
        _buscaProgramas: programasDasCorrentes(
            db.movimentosEscolas,
            item.movimentosEscolasIds,
        ).join(', '),
        // Tema por papel (item.temas[].papel — ver nomesTemasPorPapel em
        // utils.js): alimenta os prefixos temaprincipal:, temasecundario: e
        // temasempapel:. `tema:` segue lendo o espelho e acha em qualquer papel.
        // Territorialidade e Local onde foi escrito, hierárquicos (citar a
        // Estação Lapa conta para Lapa, São Paulo e Brasil — ver
        // buscaTerritorialidadeDoTexto em locais.js): alimentam
        // territorialidade:, localescrita: e as versões ...direta: (só o
        // Local exato). Idioma por papel e dialeto: idiomaprincipal:,
        // idiomasecundario: e dialeto: (`idioma:` segue lendo o espelho).
        _buscaTerritorialidade: buscaTerritorialidadeDoTexto(db, item),
        _buscaTerritorialidadeDireta: buscaTerritorialidadeDoTexto(db, item, { direta: true }),
        _buscaLocalEscrita: buscaLocalEscritaDoTexto(db, item),
        _buscaLocalEscritaDireta: buscaLocalEscritaDoTexto(db, item, { direta: true }),
        _buscaIdiomaPrincipal: nomesIdiomasPorPapel(item, 'principal').join(', '),
        _buscaIdiomaSecundario: nomesIdiomasPorPapel(item, 'secundario').join(', '),
        _buscaDialeto: dialetosDoItem(item).join(', '),
        _buscaTemaPrincipal: nomesTemasPorPapel(item, db.temas, 'principal').join(', '),
        _buscaTemaSecundario: nomesTemasPorPapel(item, db.temas, 'secundario').join(', '),
        _buscaTemaSemPapel: nomesTemasPorPapel(item, db.temas, '').join(', '),
        // Assuntos derivados dos Temas do texto (db.assuntos — ver
        // assuntosDoTexto em utils.js); nomes entram na busca geral e no
        // prefixo "assunto:" (ver CAMPOS_ATRIBUTO), mesmo padrão de
        // _buscaMovimentosEscolas acima.
        _buscaAssuntos: assuntosDoTexto(item, db.assuntos, db.temas)
            .map((a) => a.nome)
            .join(' '),
        // Assunto por papel efetivo (nomesAssuntosPorPapel em utils.js: herdado
        // do Tema ou fixado no texto): alimenta assuntoprincipal:,
        // assuntosecundario: e assuntoindefinido:. `assunto:` acha em qualquer papel.
        _buscaAssuntoPrincipal: nomesAssuntosPorPapel(
            item,
            db.assuntos,
            db.temas,
            'principal',
        ).join(', '),
        _buscaAssuntoSecundario: nomesAssuntosPorPapel(
            item,
            db.assuntos,
            db.temas,
            'secundario',
        ).join(', '),
        _buscaAssuntoIndefinido: nomesAssuntosPorPapel(item, db.assuntos, db.temas, '').join(', '),
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
        // Fonte do texto (grupo Fonte do modal — celulaFonte em
        // celulas-tabela.js mostra só origem+edição na tabela, mas a
        // busca por "fonte:" cobre os três campos de texto livre do
        // grupo, incluindo o link, mesmo padrão de _buscaEnvios/
        // _buscaAnotacoes acima).
        _buscaFonte: item.fonteTexto
            ? [item.fonteTexto.origem, item.fonteTexto.edicao, item.fonteTexto.link]
                  .filter(Boolean)
                  .join(' ')
            : '',
        // Grafia (mesmo grupo Fonte, campo fechado — OPCOES_GRAFIA em
        // utils.js): busca pelo rótulo completo (não só o valor cru do
        // enum), pra "grafia:etimológica"/"grafia:quinhentista"/
        // "grafia:atual" acharem sem precisar saber a constante interna
        // — mesma lógica de resolução usada em celulaGrafia. Com
        // GRAFIA_ATUAL sendo um valor não-vazio (não mais ''), esse
        // `item.fonteTexto?.grafia ?` já distingue sozinho "Atual"
        // escolhido de propósito (bate em "grafia:atual") de "nunca
        // definido" (fica de fora — string vazia não bate em nenhum
        // prefixo de busca).
        _buscaGrafia: item.fonteTexto?.grafia
            ? OPCOES_GRAFIA.find((o) => o.valor === item.fonteTexto.grafia)?.rotulo ||
              item.fonteTexto.grafia
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
        pessoasOrdenadas
            .map((p) => `<option value="${p.id}">${escapeHtml(p.nome)}</option>`)
            .join('');
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
        PAPEIS_PESSOA.map(
            (papel) => `<option value="${escapeHtml(papel)}">${escapeHtml(papel)}</option>`,
        ).join('');
    if (Array.from(sel.options).some((o) => o.value === valorAtual)) sel.value = valorAtual;
}

// Filtro de status compartilhado por Poemas e Prosas (item 2 do plano de
// integração — ver Prosa e Poema.md): os dois campos que ele consulta
// (`status`, `pendencia`) são idênticos nas duas tabelas.
function aplicarFiltroStatus(base, status) {
    if (status === 'publicados') return base.filter((i) => i.status === 'publicado');
    if (status === 'nao-publicados') return base.filter((i) => i.status !== 'publicado');
    if (status === 'completos') return base.filter((i) => i.status === 'completo');
    if (status === 'incompletos') return base.filter((i) => i.status === 'incompleto');
    if (status === 'migrados') return base.filter((i) => i.status === 'migrado');
    if (status === 'pendentes') return base.filter((i) => i.pendencia?.trim());
    if (status === 'descartados') return base.filter((i) => i.status === 'descartado');
    if (status === 'privados') return base.filter((i) => i.status === 'privado');
    return base;
}

// ─── Seleção múltipla de Poemas (ações em massa) ──────────────

// Retorna a lista de poemas atualmente visível, já com status, busca
// (incluindo nomes de livros) e ordenação aplicados — usada tanto pela
// renderização quanto pela seleção em massa, pra ficarem sempre coerentes.
export function getListaVisivelPoemas() {
    let base = aplicarFiltroStatus(db.poemas, statusPoemas);

    if (filtroLivroPoemas === '__avulsos__') {
        base = base.filter((p) => !p.paiTipo || !p.paiId);
    } else if (filtroLivroPoemas) {
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
    base = base.filter((p) => itemBateFiltrosContagem(p, 'poemas', db));

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

    // Numeração pra coluna "Contagem de Poemas" (ver colunas.js e
    // celulaCamposPreenchidos/CELULAS_POEMAS abaixo): 1..N na ordem da
    // estrutura do livro entre os itens que sobreviveram a todos os
    // filtros acima — precisa ser calculada AQUI, antes de aplicarOrdenacao,
    // porque até este ponto `lista` só passou por .filter/.map (nunca por
    // .sort), então ainda preserva a ordem estrutural original de
    // db.poemas (ver sortPoemas em db.js). Guardar o número no próprio
    // item (_numEstrutura) faz ele "grudar" no item e sobreviver ao sort
    // de aplicarOrdenacao logo abaixo, não importa por qual coluna o
    // usuário escolha ordenar a tabela depois.
    lista = lista.map((p, i) => ({ ...p, _numEstrutura: i + 1 }));

    // Caixa B (busca por Nº) — ver comentário em filtroNumeroPoemas: entra
    // só AQUI, depois de _numEstrutura já atribuído, então nunca desloca a
    // numeração — só recorta o que já foi numerado. numeros vazio (nada
    // digitado, ou só prefixos sem número solto) não filtra por número,
    // igual ao resto do arquivo quando um filtro está "sem valor".
    if (filtroNumeroPoemas && filtroNumeroPoemas.trim()) {
        const { numeros, resto } = parseConsultaNumero(filtroNumeroPoemas);
        if (numeros.size) lista = lista.filter((p) => numeros.has(p._numEstrutura));
        if (resto.trim()) lista = filtrarTextos(lista, resto, opcoesBuscaPoemas);
    }

    return aplicarOrdenacao(lista, 'poemas', ordenacaoPoemas);
}

// Retorna a lista de prosas atualmente visível (livro/coletânea +
// busca já aplicados) — usada tanto pela renderização quanto pela
// seleção em massa (selecao-massa.js), pra ficarem sempre coerentes.
// Fica aqui (e não em selecao-massa.js) porque reatribui `semDataProsas`,
// estado que só este arquivo é dono.
export function getListaVisivelProsas() {
    let base = aplicarFiltroStatus(db.prosas, statusProsas);
    if (filtroLivroProsa === '__avulsos__') {
        base = base.filter((pr) => !pr.paiTipo || !pr.paiId);
    } else if (filtroLivroProsa) {
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
    base = base.filter((pr) => itemBateFiltrosContagem(pr, 'prosas', db));

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

    // Ver comentário equivalente em getListaVisivelPoemas acima.
    lista = lista.map((pr, i) => ({ ...pr, _numEstrutura: i + 1 }));

    // Caixa B — ver comentário equivalente em getListaVisivelPoemas acima.
    if (filtroNumeroProsas && filtroNumeroProsas.trim()) {
        const { numeros, resto } = parseConsultaNumero(filtroNumeroProsas);
        if (numeros.size) lista = lista.filter((pr) => numeros.has(pr._numEstrutura));
        if (resto.trim()) lista = filtrarTextos(lista, resto, opcoesBuscaProsas);
    }

    return aplicarOrdenacao(lista, 'prosas', ordenacaoProsas);
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

// Comparador numérico genérico — mesmo critério de "vazio por último,
// independente da direção" do comparador de texto acima, só que aqui
// "vazio" é 0 (ou não-número), não string vazia. Usado por
// Autoclassificação, onde 0 é exatamente "não avaliado" (ver
// autoclassificacaoValida em utils.js) — nunca uma nota de verdade,
// então tratá-lo como "sem valor" na ordenação é o comportamento certo,
// não um efeito colateral de tratar 0 como falsy.
function compararPorNumero(pegarNumero) {
    return (a, b, asc) => {
        const na = Number(pegarNumero(a)) || 0;
        const nb = Number(pegarNumero(b)) || 0;
        if (!na && !nb) return 0;
        if (!na) return 1;
        if (!nb) return -1;
        return asc ? na - nb : nb - na;
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

// Compartilhado entre Poemas e Prosas (item 1 do plano de integração — ver
// Prosa e Poema.md): os campos têm o mesmo nome e formato nas duas tabelas,
// então o mesmo comparador serve pras duas — só 'genero' é exclusivo de
// Prosa (ver DEFINICAO_COLUNAS.prosas em colunas.js) e 'anotacoesMarginais'/
// 'descricaoVisual' exclusivos de Poema; nenhum problema em ficarem juntos
// aqui, já que só são de fato buscados pra coluna que os declara.
// Célula da coluna Assunto (Poemas e Prosas): Assuntos derivados dos
// Temas do texto, um selo por Assunto — mesmo formato dos selos de
// Movimento/Escola, em verde pra não se confundir com eles.
// Quantos caminhos de período histórico a célula da tabela mostra antes
// das reticências; o resto fica no tooltip (e inteiro no modal Ver).
const LIMITE_PERIODOS_NA_CELULA = 3;

// Um caminho por linha (Bloco 2e). Passou do limite: "…" e o restante no
// title da célula.
function celulaPeriodosHistoricos(item) {
    const caminhos = periodosHistoricosIdsDoItem(item, db.periodosHistoricos)
        .map((id) => caminhoDoPeriodo(db.periodosHistoricos, id))
        .filter(Boolean);
    if (!caminhos.length) {
        return '<td class="p-4 text-xs text-gray-300 dark:text-slate-600">—</td>';
    }
    const visiveis = caminhos.slice(0, LIMITE_PERIODOS_NA_CELULA);
    const resto = caminhos.length - visiveis.length;
    const linhas = visiveis.map((c) => `<div>${escapeHtml(c)}</div>`).join('');
    const reticencias = resto > 0 ? `<div title="${escapeHtml(caminhos.join('\n'))}">…</div>` : '';
    return `<td class="p-4 text-xs text-gray-500 dark:text-slate-400">${linhas}${reticencias}</td>`;
}

function celulaAssuntos(item) {
    return `<td class="p-4">${badgesAssuntos(item)}</td>`;
}

// Célula da coluna Idioma (Poemas e Prosas): idiomas com papel e dialetos,
// como no .md ("pt-BR (principal; dialeto: paulistano), Inglês (secundário)");
// um idioma Principal sem dialeto sai só com o nome.
function celulaIdioma(item) {
    const texto = textoIdiomasComPapel(item) || 'pt-BR';
    return `<td class="p-4 text-xs text-gray-400 dark:text-slate-500 font-mono">${escapeHtml(texto)}</td>`;
}

// Célula da coluna Local onde foi escrito: nome e, em cinza, o caminho até a
// raiz (o mesmo texto do .md).
function celulaLocalEscrita(item) {
    const texto = textoLocalEscrita(db, item);
    return `<td class="p-4 text-xs ${texto ? 'text-gray-500 dark:text-slate-400' : 'text-gray-300 dark:text-slate-600'}">${texto ? escapeHtml(texto) : '—'}</td>`;
}

// Células de Postura estética e Programa: os valores efetivos (com a herança do
// pai) das correntes ligadas ao texto, um selo por valor distinto.
function celulaAtributoDaCorrente(valores, classes) {
    return `<td class="p-4">${
        valores.length
            ? valores
                  .map(
                      (v) =>
                          `<span class="text-[9px] ${classes} px-1.5 py-0.5 rounded mr-1 mb-1 inline-block">${escapeHtml(v)}</span>`,
                  )
                  .join('')
            : '<span class="text-gray-300 dark:text-slate-600">—</span>'
    }</td>`;
}

const CLASSES_SELO_POSTURA =
    'bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300';
const CLASSES_SELO_PROGRAMA = 'bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300';

function celulaPosturaDaCorrente(item) {
    return celulaAtributoDaCorrente(
        posturasDasCorrentes(db.movimentosEscolas, item.movimentosEscolasIds),
        CLASSES_SELO_POSTURA,
    );
}

function celulaProgramaDaCorrente(item) {
    return celulaAtributoDaCorrente(
        programasDasCorrentes(db.movimentosEscolas, item.movimentosEscolasIds),
        CLASSES_SELO_PROGRAMA,
    );
}

// Célula da coluna Territorialidade: um selo por Local citado, com o caminho
// na dica. Texto sem ids (só o espelho de nomes) mostra os nomes do espelho.
function celulaTerritorialidade(item) {
    const selo = (nome, dica) =>
        `<span title="${escapeHtml(dica)}" class="text-[9px] bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 px-1.5 py-0.5 rounded mr-1 mb-1 inline-block">${escapeHtml(nome)}</span>`;
    const ids = territorialidadeDoTexto(db, item);
    const selos = ids.length
        ? ids.map((id) => selo(caminhoDoLocal(db, id)[0].nome, textoLocalComCaminho(db, id)))
        : String(item.sinalizacoesTerritorialidade || '')
              .split(',')
              .map((n) => n.trim())
              .filter(Boolean)
              .map((n) => selo(n, n));
    return `<td class="p-4">${selos.length ? selos.join('') : '<span class="text-gray-300 dark:text-slate-600">—</span>'}</td>`;
}

const COMPARADORES_ORDENACAO = {
    titulo: compararPorTexto((p) => p.titulo),
    idioma: compararPorTexto((p) => p.idioma),
    localEscrita: compararPorTexto((p) => textoLocalEscrita(db, p)),
    posturaEstetica: compararPorTexto((p) =>
        posturasDasCorrentes(db.movimentosEscolas, p.movimentosEscolasIds).join(', '),
    ),
    programa: compararPorTexto((p) =>
        programasDasCorrentes(db.movimentosEscolas, p.movimentosEscolasIds).join(', '),
    ),
    territorialidade: compararPorTexto((p) => textoTerritorialidadeComCaminho(db, p)),
    dataEscrita: compararPorData((p) => p.dataEscrita),
    dataPublicacao: compararPorData((p) => p.dataPublicacao),
    epocaRetratada: compararPorEpocaRetratada,
    assuntos: compararPorTexto((p) =>
        assuntosComPapel(p, db.assuntos, db.temas)
            .map((a) => a.nome)
            .join(', '),
    ),
    temas: compararPorTexto((p) =>
        temasComPapel(p, db.temas)
            .map((t) => t.nome)
            .join(', '),
    ),
    status: compararPorStatus,
    pessoas: compararPorTexto((p) => nomesPessoas(p, db.pessoas).join(', ')),
    personagens: compararPorTexto((p) => nomesPersonagens(p, db.personagens).join(', ')),
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
    ecos: compararPorTexto((p) => textoTitulosPoemasPorId(p.conceitos?.ecos, rotuloEntradaEco)),
    intertextualidade: compararPorTexto((p) =>
        Array.isArray(p.intertextualidade)
            ? p.intertextualidade.map((it) => it.texto).join(' ')
            : '',
    ),
    hipertextualidade: compararPorTexto((p) =>
        Array.isArray(p.hipertextualidade)
            ? p.hipertextualidade.map((h) => corpoEntradaHipertextualidade(h)).join(' ')
            : '',
    ),
    referenciasExternas: compararPorTexto((p) =>
        Array.isArray(p.referenciasExternas)
            ? p.referenciasExternas.map((it) => it.texto).join(' ')
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
    genero: compararPorTexto((pr) =>
        Array.isArray(pr.genero) ? pr.genero.join(', ') : pr.genero || '',
    ),
    contextoHistorico: compararPorTexto((p) => p.contextoHistorico),
    autoavaliacao: compararPorTexto((p) => p.autoavaliacao),
    autoclassificacao: compararPorNumero((p) => p.autoclassificacao),
    fonte: compararPorTexto((p) => p.fonteTexto?.origem),
    grafia: compararPorTexto((p) => p.fonteTexto?.grafia),
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
    // 'idSistema' — ver comentário em colunas.js (compartilhado entre
    // Poemas e Prosas, mesmo campo `id` nos dois).
    idSistema: compararPorNumero((p) => p.id),
    // Ordenar por "Contagem de Poemas/Prosas" dá o mesmo resultado que
    // ordenar pela coluna de estrutura ('estrutura'/'vinculo'), já que
    // _numEstrutura É a posição nessa ordem (ver getListaVisivelPoemas/
    // getListaVisivelProsas acima) — mas faz sentido existir como
    // comparador próprio: sem ele, clicar no cabeçalho dessa coluna pra
    // ordenar não faria nada (aplicarOrdenacao devolve a lista sem
    // mexer quando não acha comparador pra `estado.campo`).
    // 'contagemLinha' não entra aqui de propósito — ver comentário em
    // colunas.js.
    contagemTipo: (a, b, asc) => {
        const diff = (a._numEstrutura ?? 0) - (b._numEstrutura ?? 0);
        return asc ? diff : -diff;
    },
};

// Dispatcher de ordenação compartilhado entre getListaVisivelPoemas e
// getListaVisivelProsas (item 1 do plano de integração — ver Prosa e
// Poema.md): resolve os três casos possíveis pro campo de `estado`
// (padrão estrutural da tabela, coluna de contagem dinâmica, ou
// comparador fixo de COMPARADORES_ORDENACAO) e devolve a lista já
// ordenada. `tabela` decide qual campo é o "padrão estrutural" (ver
// CAMPO_ESTRUTURA_POR_TABELA) e qual conjunto de colunas de contagem
// consultar (ver colunas-contagem.js — já é agnóstico de tabela).
function aplicarOrdenacao(lista, tabela, estado) {
    if (estado.campo === CAMPO_ESTRUTURA_POR_TABELA[tabela]) {
        // Ordem padrão = a ordem em que a lista já veio (estrutura); desc
        // é só ela invertida, não precisa de comparador.
        return estado.direcao === 'desc' ? [...lista].reverse() : lista;
    }
    if (estado.campo.startsWith(PREFIXO_ORDENACAO_CONTAGEM)) {
        // Coluna de contagem dinâmica (ver colunas-contagem.js) — o campo
        // que ela conta pode mudar a qualquer momento (seletor no
        // cabeçalho), então resolve pela coluna ativa no momento do sort
        // em vez de um comparador fixo em COMPARADORES_ORDENACAO.
        const id = estado.campo.slice(PREFIXO_ORDENACAO_CONTAGEM.length);
        const coluna = getColunasContagem(tabela).find((c) => String(c.id) === id);
        const contar = coluna ? registroContavel(tabela)[coluna.campo]?.contar : null;
        if (!contar) return lista;
        const asc = estado.direcao === 'asc';
        return [...lista].sort((a, b) => {
            const diff = contar(a, db) - contar(b, db);
            return asc ? diff : -diff;
        });
    }
    const comparador = COMPARADORES_ORDENACAO[estado.campo];
    if (!comparador) return lista;
    const asc = estado.direcao === 'asc';
    return [...lista].sort((a, b) => comparador(a, b, asc));
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
            ${
                htmlSeloSituacaoEditorial(l)
                    ? `<div class="mt-2">${htmlSeloSituacaoEditorial(l)}</div>`
                    : ''
            }
            ${
                l.situacaoNota && htmlSeloSituacaoEditorial(l)
                    ? `<p class="text-[10px] italic text-gray-500 dark:text-slate-400 mt-1">${escapeHtml(l.situacaoNota)}</p>`
                    : ''
            }
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
                livroForaDeCirculacao(l) &&
                Array.isArray(l.lojas) &&
                l.lojas.some((loja) => loja.url)
                    ? `<p data-aviso-lojas-fora-de-circulacao class="text-[10px] text-amber-700 dark:text-amber-300 mt-1">⚠️ ${escapeHtml(rotuloSituacaoEditorial(l.situacaoEditorial))}: confira se os links de compra ainda funcionam.</p>`
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
            '<option value="__avulsos__">Avulsos</option>' +
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
    atualizarBarraSelecao('poemas');

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
            'poemas',
            listaPagina.map((p) => p.id),
            idsForaDaPagina(listaFiltrada, listaPagina),
            selecaoPoemas,
        );

    const CELULAS_POEMAS = {
        idioma: (p) => celulaIdioma(p),
        localEscrita: (p) => celulaLocalEscrita(p),
        posturaEstetica: (p) => celulaPosturaDaCorrente(p),
        programa: (p) => celulaProgramaDaCorrente(p),
        territorialidade: (p) => celulaTerritorialidade(p),
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
        personagens: (p) => `<td class="p-4">${badgesPersonagens(p)}</td>`,
        grupos: (p) => `<td class="p-4">${badgesGrupos(p)}</td>`,
        fonte: (p) => celulaFonte(p),
        grafia: (p) => celulaGrafia(p),
        autoria: (p) => `<td class="p-4">${badgesAutoria(p)}</td>`,
        envios: (p) => `<td class="p-4">${badgesEnvios(p)}</td>`,
        reconhecimentos: (p) => `<td class="p-4">${badgesReconhecimentos(p)}</td>`,
        elos: (p) =>
            `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 max-w-xs">${titulosPoemasPorId(p.conceitos?.elos, rotuloEntradaElo, 'bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300')}</td>`,
        ecos: (p) =>
            `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 max-w-xs">${titulosPoemasPorId(p.conceitos?.ecos, rotuloEntradaEco, 'bg-fuchsia-100 dark:bg-fuchsia-900 text-fuchsia-700 dark:text-fuchsia-300')}</td>`,
        etiquetas: (p) =>
            `<td class="p-4">${badgesEtiquetasPorCategoria(p, { semTema: true, semTerritorialidade: true })}</td>`,
        temas: (p) => `<td class="p-4">${badgesTemas(p)}</td>`,
        notas: (p) =>
            `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 max-w-xs">${trechoNota(p.notas)}</td>`,
        autoavaliacao: (p) =>
            `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 max-w-xs">${trechoNota(p.autoavaliacao)}</td>`,
        autoclassificacao: (p) => celulaAutoclassificacao(p),
        epocaRetratada: (p) => {
            const epoca = p.epocaRetratada;
            const na = epoca?.na;
            return `<td class="p-4 text-xs ${na ? 'text-gray-300 dark:text-slate-600 italic' : 'text-gray-400 dark:text-slate-500'}">${badgeEpocaRetratada(epoca)}<span class="font-mono">${formatarIntervaloEpocaRetratada(epoca)}</span></td>`;
        },
        periodoHistoricoId: (p) => celulaPeriodosHistoricos(p),
        assuntos: (p) => celulaAssuntos(p),
        movimentosEscolas: (p) => {
            const nomes = nomesMovimentosEscolas(p.movimentosEscolasIds, db.movimentosEscolas);
            return `<td class="p-4">${
                nomes.length
                    ? nomes
                          .map(
                              (n) =>
                                  `<span class="text-[9px] bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded mr-1 mb-1 inline-block">${escapeHtml(n)}</span>`,
                          )
                          .join('')
                    : '<span class="text-gray-300 dark:text-slate-600">—</span>'
            }</td>`;
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
        hipertextualidade: (p) => {
            const lista = Array.isArray(p.hipertextualidade) ? p.hipertextualidade : [];
            if (!lista.length)
                return `<td class="p-4 text-xs text-gray-300 dark:text-slate-600">—</td>`;
            const html = lista
                .map((h) => {
                    const badge = h.tipo
                        ? `<span class="inline-block px-1.5 py-0.5 mr-1 rounded bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 text-[10px] font-bold uppercase align-middle">${escapeHtml(h.tipo)}</span>`
                        : '';
                    const link = h.link
                        ? ` <a href="${escapeHtml(h.link)}" target="_blank" rel="noopener" class="text-blue-600 dark:text-blue-400 underline">${escapeHtml(h.link)}</a>`
                        : '';
                    const nota = h.nota ? ` — ${trechoNota(h.nota)}` : '';
                    return `<div>${badge}${trechoNota(corpoEntradaHipertextualidade(h))}${link}${nota}</div>`;
                })
                .join('');
            return `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 max-w-xs">${html}</td>`;
        },
        referenciasExternas: (p) => {
            const lista = Array.isArray(p.referenciasExternas) ? p.referenciasExternas : [];
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
        // Id real no banco (p.id) — ver comentário em colunas.js. Mesmo
        // estilo visual do id que já aparece em Molde/Sonoridade/Estrutura
        // Textual (mono, cinza, discreto) — aqui é opcional, não a coluna
        // fixa (que mostra a sequência estrutural, um dado diferente).
        idSistema: (p) =>
            `<td class="p-4 text-xs text-gray-400 dark:text-slate-500 font-mono">#${p.id}</td>`,
        // 'contagemTipo' usa o número já calculado em getListaVisivelPoemas
        // (_numEstrutura) — não depende da posição na página.
        contagemTipo: (p) =>
            `<td class="p-4 text-xs text-gray-400 dark:text-slate-500 font-mono text-right">${p._numEstrutura ?? '—'}</td>`,
        // 'contagemLinha' é a exceção: precisa da posição na página atual
        // (2º argumento, `numeroLinha`, calculado no .map abaixo), não de
        // um campo do próprio item.
        contagemLinha: (_p, numeroLinha) =>
            `<td class="p-4 text-xs text-gray-400 dark:text-slate-500 font-mono text-right">${numeroLinha}</td>`,
    };

    // Offset de paginação pra "Contagem de Linhas" continuar contando
    // (ex.: linha 21 no topo da página 2 com 20 itens/página) em vez de
    // reiniciar em 1 a cada página — Infinity ("todos") não tem offset.
    const offsetPaginaPoemas =
        itensPorPagina === Infinity ? 0 : (paginaPoemas - 1) * itensPorPagina;

    container.innerHTML = listaPagina
        .map((p, idxNaPagina) => {
            const numeroLinha = offsetPaginaPoemas + idxNaPagina + 1;
            const celulasMeio = colunasAtivas
                .map((key) => (CELULAS_POEMAS[key] ? CELULAS_POEMAS[key](p, numeroLinha) : ''))
                .join('');
            // Colunas de contagem (ver colunas-contagem.js) — uma <td> por
            // instância ativa, com a contagem do campo selecionado naquele
            // momento (não é fixo por linha, muda se o seletor no
            // cabeçalho mudar de campo).
            const celulasContagem = colunasContagemAtivas
                .map((c) => {
                    const contar = registroContavel('poemas')[c.campo]?.contar;
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
            '<option value="__avulsos__">Avulsos</option>' +
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
    atualizarBarraSelecao('prosas');

    const colunasAtivas = getColunasAtivas('prosas');
    const colunasContagemAtivas = getColunasContagem('prosas');
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
        container.innerHTML = `<tr><td colspan="${colunasAtivas.length + colunasContagemAtivas.length + 3}" class="p-6 text-center text-gray-400 dark:text-slate-500 text-sm">Nenhuma prosa encontrada.</td></tr>`;
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
            'prosas',
            listaPaginaPr.map((pr) => pr.id),
            idsForaDaPagina(listaFiltrada, listaPaginaPr),
            selecaoProsas,
        );

    const CELULAS_PROSAS = {
        idioma: (pr) => celulaIdioma(pr),
        localEscrita: (pr) => celulaLocalEscrita(pr),
        posturaEstetica: (pr) => celulaPosturaDaCorrente(pr),
        programa: (pr) => celulaProgramaDaCorrente(pr),
        territorialidade: (pr) => celulaTerritorialidade(pr),
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
        personagens: (pr) => `<td class="p-4">${badgesPersonagens(pr)}</td>`,
        grupos: (pr) => `<td class="p-4">${badgesGrupos(pr)}</td>`,
        fonte: (pr) => celulaFonte(pr),
        grafia: (pr) => celulaGrafia(pr),
        autoria: (pr) => `<td class="p-4">${badgesAutoria(pr)}</td>`,
        envios: (pr) => `<td class="p-4">${badgesEnvios(pr)}</td>`,
        reconhecimentos: (pr) => `<td class="p-4">${badgesReconhecimentos(pr)}</td>`,
        etiquetas: (pr) =>
            `<td class="p-4">${badgesEtiquetasPorCategoria(pr, { semTema: true, semTerritorialidade: true })}</td>`,
        temas: (pr) => `<td class="p-4">${badgesTemas(pr)}</td>`,
        genero: (pr) =>
            `<td class="p-4">${badgesEtiquetas(pr.genero, 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-400')}</td>`,
        notas: (pr) =>
            `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 max-w-xs">${trechoNota(pr.notas)}</td>`,
        autoavaliacao: (pr) =>
            `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 max-w-xs">${trechoNota(pr.autoavaliacao)}</td>`,
        autoclassificacao: (pr) => celulaAutoclassificacao(pr),
        epocaRetratada: (pr) => {
            const epoca = pr.epocaRetratada;
            const na = epoca?.na;
            return `<td class="p-4 text-xs ${na ? 'text-gray-300 dark:text-slate-600 italic' : 'text-gray-400 dark:text-slate-500'}">${badgeEpocaRetratada(epoca)}<span class="font-mono">${formatarIntervaloEpocaRetratada(epoca)}</span></td>`;
        },
        periodoHistoricoId: (pr) => celulaPeriodosHistoricos(pr),
        assuntos: (pr) => celulaAssuntos(pr),
        movimentosEscolas: (pr) => {
            const nomes = nomesMovimentosEscolas(pr.movimentosEscolasIds, db.movimentosEscolas);
            return `<td class="p-4">${
                nomes.length
                    ? nomes
                          .map(
                              (n) =>
                                  `<span class="text-[9px] bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded mr-1 mb-1 inline-block">${escapeHtml(n)}</span>`,
                          )
                          .join('')
                    : '<span class="text-gray-300 dark:text-slate-600">—</span>'
            }</td>`;
        },
        contextoHistorico: (pr) =>
            `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 max-w-xs">${trechoNota(pr.contextoHistorico)}</td>`,
        elos: (pr) =>
            `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 max-w-xs">${titulosPoemasPorId(pr.conceitos?.elos, rotuloEntradaElo, 'bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300')}</td>`,
        ecos: (pr) =>
            `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 max-w-xs">${titulosPoemasPorId(pr.conceitos?.ecos, rotuloEntradaEco, 'bg-fuchsia-100 dark:bg-fuchsia-900 text-fuchsia-700 dark:text-fuchsia-300')}</td>`,
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
        hipertextualidade: (pr) => {
            const lista = Array.isArray(pr.hipertextualidade) ? pr.hipertextualidade : [];
            if (!lista.length)
                return `<td class="p-4 text-xs text-gray-300 dark:text-slate-600">—</td>`;
            const html = lista
                .map((h) => {
                    const badge = h.tipo
                        ? `<span class="inline-block px-1.5 py-0.5 mr-1 rounded bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 text-[10px] font-bold uppercase align-middle">${escapeHtml(h.tipo)}</span>`
                        : '';
                    const link = h.link
                        ? ` <a href="${escapeHtml(h.link)}" target="_blank" rel="noopener" class="text-blue-600 dark:text-blue-400 underline">${escapeHtml(h.link)}</a>`
                        : '';
                    const nota = h.nota ? ` — ${trechoNota(h.nota)}` : '';
                    return `<div>${badge}${trechoNota(corpoEntradaHipertextualidade(h))}${link}${nota}</div>`;
                })
                .join('');
            return `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 max-w-xs">${html}</td>`;
        },
        referenciasExternas: (pr) => {
            const lista = Array.isArray(pr.referenciasExternas) ? pr.referenciasExternas : [];
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
        // Ver comentário equivalente (idSistema) em CELULAS_POEMAS acima.
        idSistema: (pr) =>
            `<td class="p-4 text-xs text-gray-400 dark:text-slate-500 font-mono">#${pr.id}</td>`,
        // Ver comentário equivalente em CELULAS_POEMAS acima.
        contagemTipo: (pr) =>
            `<td class="p-4 text-xs text-gray-400 dark:text-slate-500 font-mono text-right">${pr._numEstrutura ?? '—'}</td>`,
        contagemLinha: (_pr, numeroLinha) =>
            `<td class="p-4 text-xs text-gray-400 dark:text-slate-500 font-mono text-right">${numeroLinha}</td>`,
    };

    // Ver comentário equivalente em renderPoemas acima.
    const offsetPaginaProsas =
        itensPorPagina === Infinity ? 0 : (paginaProsas - 1) * itensPorPagina;

    container.innerHTML = listaPaginaPr
        .map((pr, idxNaPagina) => {
            const numeroLinha = offsetPaginaProsas + idxNaPagina + 1;
            const pubBadge = estaPublicado(pr)
                ? `<span class="text-[9px] bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded font-bold uppercase">pub</span>`
                : '';
            const celulasMeio = colunasAtivas
                .map((key) => (CELULAS_PROSAS[key] ? CELULAS_PROSAS[key](pr, numeroLinha) : ''))
                .join('');
            // Colunas de contagem (ver colunas-contagem.js) — mesmo padrão
            // de renderPoemas acima.
            const celulasContagem = colunasContagemAtivas
                .map((c) => {
                    const contar = registroContavel('prosas')[c.campo]?.contar;
                    const valor = contar ? contar(pr, db) : 0;
                    return `<td class="p-4 text-xs text-gray-500 dark:text-slate-400 font-mono text-right">${valor}</td>`;
                })
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
            ${celulasContagem}
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
//
// Filtro por Autor, seleção (checkbox por card) e atribuição em massa
// de Grupo/Autor: estado e ações em pessoas-acoes.js, mesma divisão de
// responsabilidade de Poemas/Prosas (selecao-massa.js) e Autores
// (autores-acoes.js) — aqui só o desenho. A lista é sempre a de
// getListaVisivelPessoas() (já filtrada pelo Autor escolhido). Pedido
// do Victor, 27/09/2026.

export function renderPessoas() {
    const container = document.getElementById('lista-pessoas');
    if (!container) return;

    popularSelectAutores('filtro-autor-pessoas', '-- Todos os autores --');
    popularSelectGrupos('filtro-grupo-pessoas', '-- Todos os grupos --');
    popularSelectAutores('pessoas-massa-autor', 'Escolher autor…');
    popularSelectGrupos('pessoas-massa-grupo');
    podarSelecaoPessoas();

    const visiveis = getListaVisivelPessoas();
    const filtrandoAutor = getFiltroAutorPessoas() !== '';
    const filtrandoGrupo = getFiltroGrupoPessoas() !== '';
    const filtrandoNome = getFiltroNomePessoas().trim() !== '';
    const filtrando = filtrandoAutor || filtrandoGrupo || filtrandoNome;
    const visibilidade = getVisibilidadePessoas();

    // Contagem "N de M" só aparece com algum filtro (Autor e/ou Grupo)
    // ligado; "N ocultas" só aparece no modo padrão ('ativas'), como um
    // convite pra trocar de modo — nos outros dois modos elas já estão
    // à vista (misturadas em 'todas', sozinhas em 'ocultas'), então o
    // aviso ficaria redundante. O checkbox de "selecionar todos"
    // reflete se tudo o que está visível já está marcado — mesmo
    // padrão de renderAutores.
    const contagem = document.getElementById('contagem-pessoas');
    if (contagem) {
        const partes = [];
        if (filtrando) partes.push(`${visiveis.length} de ${db.pessoas.length} pessoas`);
        const qtdOcultas = getQtdOcultasPessoas();
        if (qtdOcultas > 0 && visibilidade === 'ativas') {
            partes.push(`${qtdOcultas} oculta${qtdOcultas !== 1 ? 's' : ''}`);
        }
        contagem.textContent = partes.join(' · ');
    }
    const todos = document.getElementById('toggle-todos-pessoas');
    if (todos) {
        todos.checked = visiveis.length > 0 && visiveis.every((p) => selecaoPessoas.has(p.id));
        todos.disabled = visiveis.length === 0;
    }
    atualizarBarraSelecaoPessoas();

    if (visiveis.length === 0) {
        const mensagem =
            visibilidade === 'ocultas'
                ? `Nenhuma pessoa oculta${filtrando ? ' para esse filtro' : ''}.`
                : filtrando
                  ? 'Nenhuma pessoa encontrada para esse filtro.'
                  : 'Nenhuma pessoa cadastrada ainda.';
        container.innerHTML = `<div class="col-span-full text-center text-gray-400 dark:text-slate-500 text-sm py-6">${mensagem}</div>`;
        return;
    }

    container.innerHTML = visiveis
        .map((p) => {
            // Objetos de Grupo (não só nome, ver nomesGrupos em utils.js)
            // pra cada badge poder usar a cor própria daquele grupo —
            // ver classesCorGrupo/CORES_GRUPO em utils.js.
            const grupos = (p.grupoIds || [])
                .map((id) => db.grupos.find((g) => g.id === id))
                .filter(Boolean);
            // Autores a quem esta Pessoa está associada (N:N, opcional —
            // ver migrarPessoasAutorIds em db.js). Badge à parte dos
            // Grupos (cor neutra, sem CORES_GRUPO: Autor não é Grupo),
            // só pra dar uma noção de vínculo direto na lista sem
            // precisar abrir o modal de edição.
            const autoresDaPessoa = (p.autorIds || [])
                .map((id) => db.autores?.find((a) => a.id === id))
                .filter(Boolean);
            const { poemasIds, prosasIds } = calcularImpactoExclusaoPessoa(db, p.id);
            const totalTextos = poemasIds.length + prosasIds.length;
            // Opacidade + badge "(oculta)" só fazem sentido no modo
            // 'todas' (ativas e ocultas misturadas na mesma lista) — no
            // modo 'ocultas' toda linha já é oculta, então o destaque
            // seria redundante.
            const destacarOculta = p.oculto && visibilidade === 'todas';
            // Símbolo ♀/♂ a partir do campo livre de Gênero — só
            // aparece quando reconhecido (mesma regra de
            // simboloGeneroPessoa em utils.js: nada de glifo genérico
            // pra quem não é binário ou não tem Gênero cadastrado).
            const simboloGenero = simboloGeneroPessoa(p.genero);
            return `
        <div class="bg-white dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm flex items-center gap-3${destacarOculta ? ' opacity-60' : ''}">
            <input type="checkbox" data-action="toggle-pessoa" data-id="${p.id}" ${
                selecaoPessoas.has(p.id) ? 'checked' : ''
            } aria-label="Selecionar ${escapeHtml(p.nome)}" class="w-4 h-4 flex-shrink-0 mb-0" />
            <div class="flex-1 min-w-0">
                <h4 class="font-bold text-gray-800 dark:text-slate-100">${escapeHtml(p.nome)}${
                    simboloGenero
                        ? ` <span class="text-gray-400 dark:text-slate-500 font-normal" title="${escapeHtml(p.genero)}">${simboloGenero}</span>`
                        : ''
                }${
                    destacarOculta
                        ? ` <span class="text-[9px] font-normal uppercase tracking-wide text-gray-400 dark:text-slate-500">(${formaOcultaAdjetivoPorGenero(p.genero)})</span>`
                        : ''
                }</h4>
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
                    ${autoresDaPessoa
                        .map(
                            (a) =>
                                `<span class="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">${escapeHtml(a.nome)}</span>`,
                        )
                        .join('')}
                </div>
                ${
                    p.orientacao || p.identidadeCisTrans || p.corRaca
                        ? `<p class="text-[10px] text-gray-500 dark:text-slate-400 mt-1">${[
                              p.orientacao,
                              p.identidadeCisTrans,
                              p.corRaca,
                          ]
                              .filter(Boolean)
                              .map(escapeHtml)
                              .join(' · ')}</p>`
                        : ''
                }
                <p class="text-[10px] text-gray-400 dark:text-slate-500 font-mono mt-1">
                    aparece em ${totalTextos} texto${totalTextos !== 1 ? 's' : ''}
                </p>
            </div>
            <div class="flex gap-3 flex-shrink-0">
                ${
                    totalTextos > 0
                        ? `<button data-action="ver-textos-pessoa" data-id="${p.id}" title="Ver textos" aria-label="Ver textos" class="inline-flex items-center justify-center p-1.5 rounded text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700">${ICONE_LISTA_TEXTOS}</button>`
                        : ''
                }
                ${
                    totalTextos > 1
                        ? `<button data-action="sugerir-ecos" data-especie="pessoa" data-id="${p.id}" title="Sugerir Ecos" aria-label="Sugerir Ecos" class="inline-flex items-center justify-center p-1.5 rounded text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40">${ICONE_SUGERIR_ECOS}</button>`
                        : ''
                }
                <button data-action="editar-pessoa" data-id="${p.id}" title="Editar" aria-label="Editar" class="inline-flex items-center justify-center p-1.5 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40">${ICONE_EDITAR}</button>
                <button data-action="mesclar-item" data-tipo="pessoas" data-id="${p.id}" title="Mesclar com outra pessoa" aria-label="Mesclar" class="inline-flex items-center justify-center p-1.5 rounded text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40">${ICONE_MESCLAR}</button>
                <button data-action="toggle-ocultar-pessoa" data-id="${p.id}" title="${p.oculto ? 'Reexibir' : 'Ocultar'}" aria-label="${p.oculto ? 'Reexibir' : 'Ocultar'}" class="inline-flex items-center justify-center p-1.5 rounded text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800">${p.oculto ? ICONE_PERMITIDO : ICONE_PROIBIDO}</button>
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
//
// Desde 27/09/2026, Grupo pertence a um Autor e pode ter até
// NIVEL_MAXIMO_GRUPO níveis (2 até essa data, destravado pro 3º no mesmo
// dia por um caso de uso real que não cabia em 2 — "Ex-namorados" >
// "Pedro" > subgrupos do universo de Pedro —, e direto pro 5º ainda no
// mesmo dia, decisão explícita do Victor de já deixar gordura em vez de
// destravar de novo no próximo caso; ver obterGrupoPaiValido em db.js e
// decisoes.md). A lista reflete
// isso agrupando por Autor (cabeçalho de seção) e, dentro de cada Autor,
// por "família" (um grupo de nível 1 e toda a sua descendência) — cada
// família inteira vai num único bloco empilhado verticalmente (em vez de
// os cards caindo soltos num grid de colunas), pra pai e filhos sempre
// ficarem visualmente juntos e na ordem certa, não lado a lado
// desalinhados (era assim antes; ver conversa de 27/09/2026 sobre o
// print mostrando "Pedro" e seus subgrupos espalhados pelas duas
// colunas do grid).
//
// Recolher/expandir (sessão seguinte, mesmo dia): grupos com filho
// ganham um botão de recolher no próprio card — mesmo raciocínio de
// _detailsColapsados em render-estrutura.js (Set de ids fechados
// manualmente, sobrevive a re-render pra não reabrir tudo de novo a
// cada ação), mas sem usar <details>/<summary> nativos: os botões de
// ação do card (editar/mesclar/excluir/novo subgrupo) já são
// data-action delegados, e colocá-los dentro de um <summary> faria
// clicar neles também disparar o toggle nativo (mesmo problema que
// botoesMover em render-estrutura.js resolve com stopPropagation em
// cada botão — aqui, com vários botões por card, replicar isso em
// cada um seria mais frágil do que só ter mais um data-action).
const _gruposColapsados = new Set();

export function toggleColapsoGrupo(id) {
    if (_gruposColapsados.has(id)) _gruposColapsados.delete(id);
    else _gruposColapsados.add(id);
    renderGrupos();
}

// Botão "Ocultar"/"Reexibir" de um card de Grupo — ver
// visibilidadeGrupos acima pra semântica de cascata (esconde a
// família inteira abaixo dele, quando ligado). Ocultar oferece
// "Desfazer" (mesmo padrão de toggleOcultarPessoa em pessoas-acoes.js):
// reverte só o `oculto` deste grupo, buscando pelo id de novo — a
// cascata na família recalcula sozinha no próximo render.
export function toggleOcultarGrupo(id) {
    const g = db.grupos.find((x) => x.id === id);
    if (!g) return;
    g.oculto = !g.oculto;
    save();
    if (g.oculto) {
        mostrarAvisoComAcao(`"${g.nome}" ocultado.`, 'Desfazer', () => {
            const alvo = db.grupos.find((x) => x.id === id);
            if (!alvo) return;
            alvo.oculto = false;
            save();
        });
    } else {
        mostrarAviso(`"${g.nome}" reexibido.`, 'sucesso');
    }
}

// Quantos nomes de pessoas aparecem soltos no próprio card do Grupo
// antes de fechar em "entre outras" (ver cartaoGrupo abaixo) — pedido
// do Victor pra não encher essa visão superficial do card com uma
// lista longa; o total de verdade já está na contagem logo acima.
const LIMITE_PESSOAS_NO_CARD_GRUPO = 5;

function cartaoGrupo(g, { nivel = 1, comColapso = true } = {}) {
    const { pessoasIds, subgruposIds } = calcularImpactoExclusaoGrupo(db, g.id);
    const contagem = [
        `${pessoasIds.length} pessoa${pessoasIds.length !== 1 ? 's' : ''}`,
        subgruposIds.length
            ? `${subgruposIds.length} subgrupo${subgruposIds.length !== 1 ? 's' : ''}`
            : null,
    ]
        .filter(Boolean)
        .join(' · ');
    // Prévia dos nomes das pessoas do grupo, alfabética, truncada em
    // LIMITE_PESSOAS_NO_CARD_GRUPO — a lista completa (sem corte) fica no
    // botão "Ver" (ver abrirVisualizacaoGrupo em visualizar-grupo.js).
    const pessoasNomes = pessoasIds
        .map((id) => db.pessoas.find((p) => p.id == id)?.nome)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const previewPessoas = pessoasNomes.length
        ? `<p class="text-[10px] text-gray-400 dark:text-slate-500 mt-1 truncate">${pessoasNomes
              .slice(0, LIMITE_PESSOAS_NO_CARD_GRUPO)
              .map(escapeHtml)
              .join(', ')}${
              pessoasNomes.length > LIMITE_PESSOAS_NO_CARD_GRUPO ? ', entre outras' : ''
          }</p>`
        : '';
    // Indentação cresce 1.5rem por nível abaixo do 1º (valor arbitrário do
    // Tailwind, já que a escala padrão não tem passo constante além de
    // ml-6/ml-12 — precisa continuar linear pra caber em NIVEL_MAXIMO_GRUPO
    // níveis sem virar um degrau maluco no fim).
    const indentacao = nivel > 1 ? ` ml-[${(nivel - 1) * 1.5}rem]` : '';
    // Botão "Novo subgrupo" some no último nível permitido: já é o mais
    // fundo (obterGrupoPaiValido recusaria o filho na hora de salvar).
    const botaoNovoSubgrupo =
        nivel < NIVEL_MAXIMO_GRUPO
            ? `<button data-action="novo-subgrupo" data-id="${g.id}" title="Novo subgrupo dentro de &quot;${escapeHtml(g.nome)}&quot;" aria-label="Novo subgrupo" class="inline-flex items-center justify-center p-1.5 rounded text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40">${ICONE_NOVO_SUBGRUPO}</button>`
            : '';
    // Botão de recolher/expandir só aparece em quem tem filho — nada pra
    // esconder numa folha (grupo sem subgrupo) — e só faz sentido na
    // árvore normal: na listagem achatada de "só ocultos" (ver
    // renderGrupos abaixo) os filhos nunca são desenhados aqui, então o
    // botão ficaria sem efeito.
    const colapsado = _gruposColapsados.has(g.id);
    const botaoColapso =
        comColapso && subgruposIds.length
            ? `<button data-action="toggle-grupo-colapso" data-id="${g.id}" title="${colapsado ? 'Expandir' : 'Recolher'} subgrupos" aria-label="${colapsado ? 'Expandir' : 'Recolher'} subgrupos" class="inline-flex items-center justify-center p-1.5 rounded text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-600 dark:hover:text-slate-300">${colapsado ? '▸' : '▾'}</button>`
            : '';
    return `
        <div class="bg-white dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm flex justify-between items-center${indentacao}${nivel > 1 ? ' border-l-4 border-l-gray-300 dark:border-l-slate-600' : ''}${g.oculto ? ' opacity-60' : ''}">
            <div class="flex-1 min-w-0">
                <h4 class="font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                    ${nivel > 1 ? '<span class="text-gray-400 dark:text-slate-500" aria-hidden="true">↳</span>' : ''}
                    <span class="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${pontoCorGrupo(g.cor)}" title="Cor do grupo" aria-hidden="true"></span>
                    ${escapeHtml(g.nome)}
                    ${g.oculto ? '<span class="text-[9px] font-normal uppercase tracking-wide text-gray-400 dark:text-slate-500">(oculto)</span>' : ''}
                </h4>
                <p class="text-[10px] text-gray-400 dark:text-slate-500 font-mono mt-1">${contagem}</p>
                ${previewPessoas}
            </div>
            <div class="flex gap-3 flex-shrink-0">
                ${botaoNovoSubgrupo}
                <button data-action="ver-grupo" data-id="${g.id}" title="Ver" aria-label="Ver" class="inline-flex items-center justify-center p-1.5 rounded text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700">${ICONE_VER}</button>
                <button data-action="editar-grupo" data-id="${g.id}" title="Editar" aria-label="Editar" class="inline-flex items-center justify-center p-1.5 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40">${ICONE_EDITAR}</button>
                <button data-action="mesclar-item" data-tipo="grupos" data-id="${g.id}" title="Mesclar com outro grupo do mesmo Autor" aria-label="Mesclar" class="inline-flex items-center justify-center p-1.5 rounded text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40">${ICONE_MESCLAR}</button>
                <button data-action="toggle-ocultar-grupo" data-id="${g.id}" title="${g.oculto ? 'Reexibir' : 'Ocultar (esconde os subgrupos junto)'}" aria-label="${g.oculto ? 'Reexibir' : 'Ocultar'}" class="inline-flex items-center justify-center p-1.5 rounded text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800">${g.oculto ? ICONE_PERMITIDO : ICONE_PROIBIDO}</button>
                <button data-action="excluir-item" data-tipo="grupos" data-id="${g.id}" title="Excluir" aria-label="Excluir" class="inline-flex items-center justify-center p-1.5 rounded text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40">${ICONE_EXCLUIR}</button>
                ${botaoColapso}
            </div>
        </div>`;
}

// Monta recursivamente um grupo e toda a sua descendência (até
// NIVEL_MAXIMO_GRUPO), cada nível ordenado alfabeticamente dentro do pai
// — usada por
// renderGrupos abaixo pra montar o bloco de uma família inteira de uma
// vez. Se o grupo estiver na lista dos recolhidos manualmente
// (_gruposColapsados), a descendência nem entra no HTML — reaparece do
// jeito que estava (com os netos abertos/fechados como estavam) quando
// o usuário expandir de novo, já que o Set guarda por id, não some com
// o toggle.
function cartoesDaFamilia(g, gruposDoAutor, nivel) {
    // Oculto e modo 'ativos' (padrão): nem o próprio nem a descendência
    // entram no HTML — cascata proposital (ver visibilidadeGrupos
    // acima), checada aqui primeiro pra não gastar trabalho descendo
    // numa árvore que não vai aparecer. Usada só nos modos 'ativos' e
    // 'todos' — o modo 'ocultos' tem seu próprio caminho achatado em
    // renderGrupos, que nem chama esta função.
    if (g.oculto && visibilidadeGrupos !== 'todos') return '';
    // Com busca por nome: só entra quem bate ou é ancestral de quem bate,
    // e o recolhimento manual não esconde resultado.
    if (_idsBuscaGrupos && !_idsBuscaGrupos.has(g.id)) return '';
    if (!_idsBuscaGrupos && _gruposColapsados.has(g.id)) return cartaoGrupo(g, { nivel });
    const filhos = gruposDoAutor
        .filter((sub) => sub.paiId == g.id)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    return (
        cartaoGrupo(g, { nivel }) +
        filhos.map((f) => cartoesDaFamilia(f, gruposDoAutor, nivel + 1)).join('')
    );
}

export function renderGrupos() {
    const container = document.getElementById('lista-grupos');
    if (!container) return;

    popularSelectAutores('filtro-autor-grupos', '-- Todos os autores --');
    _idsBuscaGrupos = idsGruposPorBusca(filtroNomeGrupos);

    if (db.grupos.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center text-gray-400 dark:text-slate-500 text-sm py-6">Nenhum grupo cadastrado ainda.</div>`;
        return;
    }

    const gruposNoRecorte = filtroAutorGrupos
        ? db.grupos.filter((g) => String(g.autorId) === String(filtroAutorGrupos))
        : db.grupos;
    const qtdOcultos = gruposNoRecorte.filter((g) => g.oculto).length;

    // "N ocultos" só aparece no modo padrão ('ativos'), como convite pra
    // trocar de modo — nos outros dois modos eles já estão à vista
    // (mesmo raciocínio de renderPessoas). Conta o grupo em si, não a
    // descendência que ele carrega junto (contaria disparado pra "1
    // grupo oculto" com 3 subgrupos escondidos junto).
    const contagemEl = document.getElementById('contagem-grupos');
    if (contagemEl) {
        contagemEl.textContent =
            qtdOcultos > 0 && visibilidadeGrupos === 'ativos'
                ? `${qtdOcultos} oculto${qtdOcultos !== 1 ? 's' : ''}`
                : '';
    }

    let autoresComGrupo = [...new Set(db.grupos.map((g) => g.autorId))]
        .map((id) => db.autores.find((a) => a.id == id))
        .filter(Boolean)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    if (filtroAutorGrupos) {
        autoresComGrupo = autoresComGrupo.filter(
            (autor) => String(autor.id) === String(filtroAutorGrupos),
        );
        if (!autoresComGrupo.length) {
            container.innerHTML = `<div class="col-span-full text-center text-gray-400 dark:text-slate-500 text-sm py-6">Esse autor ainda não tem grupo cadastrado.</div>`;
            return;
        }
    }

    // Modo 'ocultos': listagem achatada, fora da árvore (ver
    // visibilidadeGrupos acima pro porquê — cascata visual não implica
    // `oculto: true` na descendência, então não dá pra reaproveitar
    // cartoesDaFamilia aqui). Cada card vem com `comColapso: false`, já
    // que os filhos nunca são desenhados nesta lista.
    if (visibilidadeGrupos === 'ocultos') {
        const blocosOcultos = autoresComGrupo
            .map((autor) => {
                const ocultosDoAutor = db.grupos
                    .filter(
                        (g) =>
                            g.autorId == autor.id &&
                            g.oculto &&
                            (!_idsBuscaGrupos ||
                                normalizarBusca(g.nome).includes(
                                    normalizarBusca(filtroNomeGrupos.trim()),
                                )),
                    )
                    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
                if (!ocultosDoAutor.length) return '';
                const cards = ocultosDoAutor
                    .map((g) => cartaoGrupo(g, { nivel: 1, comColapso: false }))
                    .join('');
                return `
        <h3 class="text-sm font-semibold text-gray-500 dark:text-slate-400 mt-4 first:mt-0 uppercase tracking-wide">${escapeHtml(autor.nome)}</h3>
        <div class="flex flex-col gap-3">${cards}</div>`;
            })
            .join('');
        container.innerHTML =
            blocosOcultos ||
            `<div class="col-span-full text-center text-gray-400 dark:text-slate-500 text-sm py-6">Nenhum grupo oculto${filtroAutorGrupos || _idsBuscaGrupos ? ' para esse filtro' : ''}.</div>`;
        return;
    }

    const blocos = autoresComGrupo
        .map((autor) => {
            const gruposDoAutor = db.grupos.filter((g) => g.autorId == autor.id);
            const nivel1 = gruposDoAutor
                .filter((g) => g.paiId == null)
                .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
            // Cada família (nível 1 + toda a descendência) vira um único
            // bloco vertical (flex-col), pra pai e filhos nunca se
            // separarem visualmente, nem quando o container tiver mais
            // de uma coluna. Família cuja raiz está oculta (e modo
            // 'ativos') vem vazia de cartoesDaFamilia — filtrada aqui
            // antes de embrulhar em <div>, senão sobra um bloco vazio
            // no meio da lista.
            const familias = nivel1
                .map((g) => cartoesDaFamilia(g, gruposDoAutor, 1))
                .filter(Boolean)
                .map((html) => `<div class="flex flex-col gap-3">${html}</div>`)
                .join('');
            // Autor sem nenhuma família visível (todas ocultas): nem o
            // cabeçalho do Autor aparece — não faz sentido um título sem
            // nada embaixo.
            if (!familias) return '';
            return `
        <h3 class="text-sm font-semibold text-gray-500 dark:text-slate-400 mt-4 first:mt-0 uppercase tracking-wide">${escapeHtml(autor.nome)}</h3>
        <div class="flex flex-col gap-3">${familias}</div>`;
        })
        .join('');

    container.innerHTML =
        blocos ||
        (_idsBuscaGrupos
            ? `<div class="col-span-full text-center text-gray-400 dark:text-slate-500 text-sm py-6">Nenhum grupo encontrado para essa busca.</div>`
            : '') ||
        `<div class="col-span-full text-center text-gray-400 dark:text-slate-500 text-sm py-6">Todos os grupos estão ocultos. Escolha "Ocultos: mostrar junto" ou "só eles" pra vê-los.</div>`;
}

// ─── Autores ─────────────────────────────────────────────────
// Cadastro central (ver migrarAutoria em db.js), à parte de Pessoas —
// mesmo espírito de renderPessoas acima, mas sem grupos (Autor não tem
// taxonomia própria) e mostrando "sobre" em vez de badges.
//
// Busca por campo, seleção (checkbox por card) e exportação: estado e
// ações em autores-acoes.js; aqui só o desenho. A lista é sempre a de
// getListaVisivelAutores() (já filtrada pela busca).

// Resumo dos nomes literários do Autor pro card (pedido do Victor,
// 28/09/2026): agrupa por tipo (Heterônimo/Pseudônimo), mostra no máximo
// `max` nomes no total e sinaliza o resto com "+N" — Pessoa sozinho tem
// vários heterônimos e a linha não pode crescer sem limite. Aceita
// também o formato legado (strings soltas, sem tipo). Devolve '' se não
// houver nenhum nome.
export function resumoNomesLiterarios(nomesLiterarios, max = 3) {
    const itens = (Array.isArray(nomesLiterarios) ? nomesLiterarios : [])
        .map((i) =>
            typeof i === 'string'
                ? { nome: i.trim(), tipo: '' }
                : { nome: (i?.nome || '').trim(), tipo: i?.tipo || '' },
        )
        .filter((i) => i.nome);
    if (!itens.length) return '';
    const grupos = [
        { tipo: 'Heterônimo', singular: 'Heterônimo', plural: 'Heterônimos' },
        { tipo: 'Pseudônimo', singular: 'Pseudônimo', plural: 'Pseudônimos' },
        { tipo: '', singular: 'Nome literário', plural: 'Nomes literários' },
    ];
    let restantes = max;
    let omitidos = 0;
    const partes = [];
    grupos.forEach((g) => {
        // Tipo desconhecido cai em "Nome literário", junto dos sem tipo.
        const doGrupo = itens.filter((i) =>
            g.tipo ? i.tipo === g.tipo : !['Heterônimo', 'Pseudônimo'].includes(i.tipo),
        );
        if (!doGrupo.length) return;
        const mostrados = doGrupo.slice(0, Math.max(restantes, 0));
        restantes -= mostrados.length;
        omitidos += doGrupo.length - mostrados.length;
        if (mostrados.length) {
            partes.push(
                `${doGrupo.length === 1 ? g.singular : g.plural}: ${mostrados.map((i) => i.nome).join(', ')}`,
            );
        }
    });
    return partes.join(' · ') + (omitidos ? ` +${omitidos}` : '');
}

// "12 poemas e 3 prosas" — só as partes que existem; nenhum dos dois
// → "0 textos" (mesmo texto que o card já dava antes da separação).
export function resumoContagemTextosAutor(totalPoemas, totalProsas) {
    const partes = [];
    if (totalPoemas) partes.push(`${totalPoemas} poema${totalPoemas !== 1 ? 's' : ''}`);
    if (totalProsas) partes.push(`${totalProsas} prosa${totalProsas !== 1 ? 's' : ''}`);
    return partes.length ? partes.join(' e ') : '0 textos';
}

export function renderAutores() {
    const container = document.getElementById('lista-autores');
    if (!container) return;

    podarSelecaoAutores();
    const visiveis = getListaVisivelAutores();
    const filtrando = getFiltroAutores().trim() !== '';

    // Contagem "N de M" só aparece com a busca ligada; o checkbox de
    // "selecionar todos" reflete se tudo o que está visível já está marcado.
    const contagem = document.getElementById('contagem-autores');
    if (contagem) {
        contagem.textContent = filtrando
            ? `${visiveis.length} de ${db.autores.length} autores`
            : '';
    }
    const todos = document.getElementById('toggle-todos-autores');
    if (todos) {
        todos.checked = visiveis.length > 0 && visiveis.every((a) => selecaoAutores.has(a.id));
        todos.disabled = visiveis.length === 0;
    }
    atualizarBarraSelecaoAutores();

    if (visiveis.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center text-gray-400 dark:text-slate-500 text-sm py-6">${
            filtrando ? 'Nenhum autor encontrado.' : 'Nenhum autor cadastrado ainda.'
        }</div>`;
        return;
    }

    container.innerHTML = visiveis
        .map((a) => {
            const { poemasIds, prosasIds } = calcularImpactoExclusaoAutor(db, a.id);
            const totalTextos = poemasIds.length + prosasIds.length;
            const nascObito =
                a.nascimento || a.obito
                    ? `${a.nascimento ? formatarDataParcial(a.nascimento) : '?'} – ${a.obito ? formatarDataParcial(a.obito) : ''}`
                    : '';
            // Movimentos/Escolas (pedido do Victor, 28/09/2026): nomes
            // resolvidos pelo cadastro central, ids órfãos filtrados
            // (mesmo helper da busca de Autores e das tabelas).
            const nomesLit = resumoNomesLiterarios(a.nomesLiterarios);
            // Domínio público (informativo, derivado do óbito — ver
            // situacaoDominioPublico em utils.js). Sem óbito, sem selo.
            const sitDP = situacaoDominioPublico(a);
            const seloDP =
                sitDP.estado === 'sem-obito'
                    ? ''
                    : `<span class="${
                          sitDP.estado === 'livre'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                      }">${escapeHtml(rotuloDominioPublico(sitDP))}</span>`;
            const movimentos = nomesMovimentosEscolas(a.movimentosEscolasIds, db.movimentosEscolas);
            return `
        <div class="bg-white dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm flex justify-between items-center gap-3">
            <input type="checkbox" data-action="toggle-autor" data-id="${a.id}" ${
                selecaoAutores.has(a.id) ? 'checked' : ''
            } aria-label="Selecionar ${escapeHtml(a.nome)}" class="w-4 h-4 flex-shrink-0 mb-0" />
            <div class="flex-1 min-w-0">
                <h4 class="font-bold text-gray-800 dark:text-slate-100">${escapeHtml(a.nome)}${
                    a.souEu
                        ? ' <span class="text-[10px] font-normal text-indigo-500 dark:text-indigo-400">(você)</span>'
                        : ''
                }</h4>
                ${
                    a.nacionalidade || nascObito || seloDP
                        ? `<p class="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">${[escapeHtml(a.nacionalidade || ''), escapeHtml(nascObito), seloDP].filter(Boolean).join(' · ')}</p>`
                        : ''
                }
                ${
                    nomesLit
                        ? `<p class="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">${escapeHtml(nomesLit)}</p>`
                        : ''
                }
                ${
                    movimentos.length
                        ? `<p class="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">${movimentos.map(escapeHtml).join(' · ')}</p>`
                        : ''
                }
                <p class="text-[10px] text-gray-400 dark:text-slate-500 font-mono mt-1">
                    aparece em ${resumoContagemTextosAutor(poemasIds.length, prosasIds.length)}
                </p>
            </div>
            <div class="flex gap-3 flex-shrink-0">
                ${
                    totalTextos > 0
                        ? `<button data-action="ver-textos-autor" data-id="${a.id}" title="Ver textos" aria-label="Ver textos" class="inline-flex items-center justify-center p-1.5 rounded text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700">${ICONE_LISTA_TEXTOS}</button>`
                        : ''
                }
                <button data-action="ver-autor" data-id="${a.id}" title="Ver" aria-label="Ver" class="inline-flex items-center justify-center p-1.5 rounded text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700">${ICONE_VER}</button>
                <button data-action="editar-autor" data-id="${a.id}" title="Editar" aria-label="Editar" class="inline-flex items-center justify-center p-1.5 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40">${ICONE_EDITAR}</button>
                <button data-action="excluir-item" data-tipo="autores" data-id="${a.id}" title="Excluir" aria-label="Excluir" class="inline-flex items-center justify-center p-1.5 rounded text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40">${ICONE_EXCLUIR}</button>
            </div>
        </div>`;
        })
        .join('');
}

// ─── Sonoridade (Escansão) ──────────────────────────────────────
// Bloco 1 (dados + tabela): tabela própria, mais simples que a de
// Poemas/Prosas de propósito — sem paginação, seleção em massa nem
// cabeçalho ordenável (montarCabecalho/thOrdenavel em celulas-tabela.js
// são hoje específicos de 'poemas'/'prosas', ver ordenacaoPoemas/
// ordenacaoProsas hardcoded lá). Reaproveita só o que já é genérico por
// `tabela`: DEFINICAO_COLUNAS/getColunasAtivas/renderSeletorColunas
// (colunas.js) e o próprio evento 'colunas:alteradas'. Busca é só por
// título do poema vinculado — sem os operadores de prefixo (`campo:`)
// que Poemas/Prosas têm.
// Olho — "Ver"/abrir modal em toda a aplicação (Autor, Sonoridade,
// Estrutura Textual, Movimento/Escola e também Grupo, ver cartaoGrupo
// acima); Ocultar/Reexibir de Pessoa e Grupo usa outra forma de propósito
// (ICONE_PROIBIDO/ICONE_PERMITIDO, mais acima), pra não repetir o olho no
// mesmo card do Grupo.
const ICONE_VER = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 inline-block" aria-hidden="true"><path d="M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6Z"/><circle cx="10" cy="10" r="2.25"/></svg>`;
const ICONE_BAIXAR = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 inline-block" aria-hidden="true"><path d="M10 3v9.5"/><path d="M6 9l4 4 4-4"/><path d="M3.5 15.5h13"/></svg>`;

let filtroSonoridade = '';

export function setFiltroSonoridade(valor) {
    filtroSonoridade = (valor || '').trim().toLowerCase();
    renderSonoridade();
}

window.addEventListener('colunas:alteradas', (ev) => {
    if (ev.detail?.tabela === 'sonoridade') renderSonoridade();
});
// Mesmo padrão do listener de 'colunas:alteradas' acima — reage à
// configuração de botões/formato do painel "⚙️ Ações ▾" (ver
// acoes-coluna.js, estendido pra Sonoridade nesta sessão junto com o
// toggle de botões abaixo, celulaAcoesSonoridade).
window.addEventListener('acoes-coluna:alteradas', (ev) => {
    if (ev.detail?.tabela === 'sonoridade') renderSonoridade();
});

// Valor de exibição de cada coluna dinâmica — os 6 campos de
// classificação são texto simples (sem badge/cor própria ainda, ao
// contrário de Etiquetas/Pessoas em Poemas), exceto 'esquemaRimas', que
// junta os dois subcampos (Presença + Padrão) numa célula só pra não
// precisar de 2 colunas pra um conceito do formulário.
function valorColunaSonoridade(es, key) {
    const vazio = '<span class="text-gray-300 dark:text-slate-600">—</span>';
    if (key === 'esquemaRimas') {
        const partes = [es.esquemaRimasPresenca, es.esquemaRimasPadrao].filter(Boolean);
        return partes.length ? escapeHtml(partes.join(' · ')) : vazio;
    }
    return es[key] ? escapeHtml(es[key]) : vazio;
}

// Botões da coluna Ações da Sonoridade (Ver/Baixar/Editar/Excluir),
// montados conforme a configuração salva do painel "⚙️ Ações ▾" — só
// os habilitados, na ordem fixa de DEFINICAO_ACOES (acoes-coluna.js).
// Bloco 1 tinha isso fixo em 4 botões sempre visíveis (ver
// comentário antigo em 'ver-sonoridade' de main.js); esta sessão
// estendeu o mesmo painel genérico que já existia pra Poemas/Prosas
// (celulaAcoesItem, em celulas-tabela.js) — não reaproveita aquela
// função porque os data-action de Sonoridade são outros
// (ver-sonoridade/baixar-sonoridade/editar-sonoridade, não
// ver-item/baixar-item/editar-${tipo}).
function celulaAcoesSonoridade(id) {
    const ativas = new Set(
        ['ver', 'baixar', 'editar', 'excluir'].filter((k) => isAcaoAtiva('sonoridade', k)),
    );
    const botoes = [];
    if (ativas.has('ver'))
        botoes.push(
            `<button data-action="ver-sonoridade" data-id="${id}" title="Ver" aria-label="Ver" class="inline-flex items-center justify-center p-1.5 rounded text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700">${ICONE_VER}</button>`,
        );
    if (ativas.has('baixar'))
        botoes.push(
            `<button data-action="baixar-sonoridade" data-id="${id}" title="Baixar" aria-label="Baixar" class="inline-flex items-center justify-center p-1.5 rounded text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700">${ICONE_BAIXAR}</button>`,
        );
    if (ativas.has('editar'))
        botoes.push(
            `<button data-action="editar-sonoridade" data-id="${id}" title="Editar" aria-label="Editar" class="inline-flex items-center justify-center bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 p-1.5 rounded hover:bg-blue-200 dark:hover:bg-blue-800">${ICONE_EDITAR}</button>`,
        );
    if (ativas.has('excluir'))
        botoes.push(
            `<button data-action="excluir-item" data-tipo="escansoes" data-id="${id}" title="Excluir" aria-label="Excluir" class="inline-flex items-center justify-center p-1.5 rounded text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40">${ICONE_EXCLUIR}</button>`,
        );
    return botoes.join('');
}

export function renderSonoridade() {
    const tbody = document.getElementById('lista-sonoridade');
    if (!tbody) return;

    atualizarPainelColunas('sonoridade', 'painel-colunas-sonoridade');
    atualizarPainelAcoes('sonoridade', 'painel-acoes-sonoridade');

    // Colunas de contagem (ver colunas-contagem.js) — Sonoridade nunca
    // teve cabeçalho ordenável nas colunas fixas (ao contrário de
    // Poemas/Prosas, que passaram por thOrdenavel no item 1 do plano de
    // integração), então aqui o <th> fica sem o botão de ordenar de
    // thContagem — só o <select> de campo + remover, no mesmo espírito
    // simplificado do resto desta tabela.
    const colunasContagemAtivas = getColunasContagem('sonoridade');
    const registroSonoridade = registroContavel('sonoridade');
    const thsContagem = colunasContagemAtivas
        .map(
            (c) => `<th class="p-4 border-b border-gray-200 dark:border-slate-700">
                <div>Qtd.</div>
                <div class="flex items-center gap-1 mt-1 font-normal">
                    <select onchange="definirCampoColunaContagem('sonoridade', ${c.id}, this.value)"
                        class="text-[10px] border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-800 dark:text-slate-200 py-0.5 max-w-[7rem]">
                        ${renderOpcoesCampoContagem('sonoridade', c.campo)}
                    </select>
                    <button type="button" onclick="removerColunaContagem('sonoridade', ${c.id})"
                        title="Remover essa coluna de contagem"
                        class="text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400">✕</button>
                </div>
            </th>`,
        )
        .join('');

    const cabecalho = document.getElementById('cabecalho-sonoridade');
    if (cabecalho) {
        const ativas = getColunasAtivas('sonoridade');
        const def = DEFINICAO_COLUNAS.sonoridade;
        const thsMeio = ativas
            .map((key) => def.find((c) => c.key === key))
            .filter(Boolean)
            .map(
                (c) =>
                    `<th class="p-4 border-b border-gray-200 dark:border-slate-700">${escapeHtml(c.label)}</th>`,
            )
            .join('');
        cabecalho.innerHTML = `
            <th class="p-4 border-b border-gray-200 dark:border-slate-700">ID / Título</th>
            ${thsMeio}
            ${thsContagem}
            <th class="p-4 border-b text-right border-gray-200 dark:border-slate-700">Ações</th>`;
    }

    const ativas = getColunasAtivas('sonoridade');
    const filtradas = db.escansoes.filter((es) => {
        if (filtroSonoridade) {
            const poema = db.poemas.find((p) => p.id == es.poemaId);
            if (!(poema?.titulo || '').toLowerCase().includes(filtroSonoridade)) return false;
        }
        return itemBateFiltrosContagem(es, 'sonoridade', db);
    });
    const ordenadas = [...filtradas].sort((a, b) => {
        const ta = db.poemas.find((p) => p.id == a.poemaId)?.titulo || '';
        const tb = db.poemas.find((p) => p.id == b.poemaId)?.titulo || '';
        return ta.localeCompare(tb, 'pt-BR');
    });

    const paginacaoContainerSon = document.getElementById('paginacao-sonoridade');

    if (ordenadas.length === 0) {
        const colspan = 2 + ativas.length + colunasContagemAtivas.length;
        tbody.innerHTML = `<tr><td colspan="${colspan}" class="text-center text-gray-400 dark:text-slate-500 text-sm py-6">${
            db.escansoes.length === 0
                ? 'Nenhuma escansão cadastrada ainda.'
                : 'Nenhuma escansão encontrada para essa busca.'
        }</td></tr>`;
        if (paginacaoContainerSon) paginacaoContainerSon.innerHTML = '';
        return;
    }

    // Clampa a página atual, mesmo raciocínio de renderPoemas/renderProsas
    // (o filtro pode ter reduzido o total desde a última renderização, ou
    // "itens por página" pode ter mudado).
    const totalPaginasSon =
        itensPorPagina === Infinity ? 1 : Math.max(1, Math.ceil(ordenadas.length / itensPorPagina));
    if (paginaSonoridade > totalPaginasSon) paginaSonoridade = totalPaginasSon;
    if (paginaSonoridade < 1) paginaSonoridade = 1;

    const paginaAtualOrdenadas =
        itensPorPagina === Infinity
            ? ordenadas
            : ordenadas.slice(
                  (paginaSonoridade - 1) * itensPorPagina,
                  paginaSonoridade * itensPorPagina,
              );

    // Sem `tabela`/`idsPagina` — Sonoridade não tem seleção em massa
    // (checkbox de linha), então o botão "Selecionar estes N" não faz
    // sentido aqui (ver montarPaginacao em celulas-tabela.js).
    if (paginacaoContainerSon)
        paginacaoContainerSon.innerHTML = montarPaginacao(
            ordenadas.length,
            paginaSonoridade,
            'pagina-sonoridade',
        );

    tbody.innerHTML = paginaAtualOrdenadas
        .map((es) => {
            const poema = db.poemas.find((p) => p.id == es.poemaId);
            const titulo = poema ? escapeHtml(poema.titulo) : '<em>Poema não encontrado</em>';
            const tds = ativas
                .map(
                    (key) =>
                        `<td class="p-4 border-b border-gray-100 dark:border-slate-800">${valorColunaSonoridade(es, key)}</td>`,
                )
                .join('');
            // Mesmo padrão de celulasContagem em renderPoemas/renderProsas
            // (linhas 1836/2113 antes da generalização) — uma <td> por
            // coluna ativa, contar() vindo do registro de Sonoridade.
            const tdsContagem = colunasContagemAtivas
                .map((c) => {
                    const contar = registroSonoridade[c.campo]?.contar;
                    const valor = contar ? contar(es) : 0;
                    return `<td class="p-4 border-b border-gray-100 dark:border-slate-800 text-center">${valor}</td>`;
                })
                .join('');
            return `
        <tr>
            <td class="p-4 border-b border-gray-100 dark:border-slate-800">
                <span class="text-[10px] text-gray-400 dark:text-slate-500 font-mono">#${es.id}</span><br>
                ${titulo}
            </td>
            ${tds}
            ${tdsContagem}
            <td class="p-4 border-b border-gray-100 dark:border-slate-800 text-right whitespace-nowrap">
                ${celulaAcoesSonoridade(es.id)}
            </td>
        </tr>`;
        })
        .join('');
}

// ─── Moldes (aba Criação) ────────────────────────────────────────
// Bloco 1 (dados + tabela + meta): tabela própria, ainda mais simples
// que a de Sonoridade de propósito — colunas fixas (sem
// DEFINICAO_COLUNAS/colunas de contagem, que Molde não tem por ora) e
// Ações configuráveis (Baixar .json/Editar/Promover/Excluir, sem Ver —
// Molde ainda não tem visualização somente-leitura). Busca é só por
// título.
let filtroMoldes = '';
let paginaMoldes = 1;

export function setFiltroMoldes(valor) {
    filtroMoldes = (valor || '').trim().toLowerCase();
    paginaMoldes = 1;
    renderMoldes();
}

export function setPaginaMoldes(pagina) {
    paginaMoldes = pagina;
    renderMoldes();
}

function valorColunaMolde(molde, key) {
    const vazio = '<span class="text-gray-300 dark:text-slate-600">—</span>';
    if (key === 'esquemaRimas') {
        const partes = [molde.esquemaRimasPresenca, molde.esquemaRimasPadrao].filter(Boolean);
        return partes.length ? escapeHtml(partes.join(' · ')) : vazio;
    }
    if (key === 'status') {
        if (molde.status === 'promovido' && molde.poemaId != null) {
            return `<span class="cursor-pointer hover:underline text-[11px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700" data-action="editar-poema" data-id="${molde.poemaId}" title="Ver Poema promovido">✓ Promovido</span>`;
        }
        return `<span class="text-[11px] font-bold px-2 py-0.5 rounded-full border bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700">Em andamento</span>`;
    }
    return molde[key] ? escapeHtml(molde[key]) : vazio;
}

// Bloco 3 (Promoção a Poema, ver criacao-molde.md) — seta pra cima, sem
// círculo (diferente de ICONE_VER/ICONE_MESCLAR, que usam formas
// fechadas): "elevar" o Molde a Poema, mesmo espírito do selo "✓
// Promovido" que editor-molde.js mostra dentro do próprio modal.
const ICONE_PROMOVER = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 inline-block" aria-hidden="true"><path d="M10 16V6"/><path d="M5.5 10.5L10 6l4.5 4.5"/><path d="M4 16h12"/></svg>`;

// Molde ainda não promovido ganha o botão "Promover a Poema"
// (data-action="promover-molde", ver ACOES_LISTA em main.js); já
// promovido (status/poemaId já salvos, ver migrarCamposBloco3Molde em
// db.js) reaproveita a mesma ação de "editar-poema" apontando pro
// poemaId — mesmo padrão de link direto que o selo dentro do modal usa
// (blocoPromocaoMolde, editor-molde.js), só que aqui como botão em vez
// de selo estático (a tabela sempre tem espaço pra ação, o modal só
// mostra selo quando não há mais nada a fazer ali).
// Botões conforme o painel "⚙️ Ações ▾" (isAcaoAtiva/DEFINICAO_ACOES,
// acoes-coluna.js) — Moldes tem Baixar (.json)/Editar/Promover/Excluir
// (sem Ver, ver ACOES_APLICAVEIS lá). "Promover" cobre os dois
// estados: botão de promover (ainda não promovido) ou link pro Poema
// já promovido — comportamento inalterado, só passou a ser opcional.
function celulaAcoesMolde(id, status, poemaId) {
    const botoes = [];
    if (isAcaoAtiva('moldes', 'baixar')) {
        botoes.push(
            `<button data-action="baixar-molde" data-id="${id}" title="Baixar JSON" aria-label="Baixar JSON" class="inline-flex items-center justify-center p-1.5 rounded text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700">${ICONE_BAIXAR}</button>`,
        );
    }
    if (isAcaoAtiva('moldes', 'editar')) {
        botoes.push(
            `<button data-action="editar-molde" data-id="${id}" title="Editar" aria-label="Editar" class="inline-flex items-center justify-center bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 p-1.5 rounded hover:bg-blue-200 dark:hover:bg-blue-800">${ICONE_EDITAR}</button>`,
        );
    }
    if (isAcaoAtiva('moldes', 'promover')) {
        botoes.push(
            status === 'promovido' && poemaId != null
                ? `<button data-action="editar-poema" data-id="${poemaId}" title="Ver Poema promovido" aria-label="Ver Poema promovido" class="inline-flex items-center justify-center p-1.5 rounded text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40">${ICONE_PROMOVER}</button>`
                : `<button data-action="promover-molde" data-id="${id}" title="Promover a Poema" aria-label="Promover a Poema" class="inline-flex items-center justify-center p-1.5 rounded text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40">${ICONE_PROMOVER}</button>`,
        );
    }
    if (isAcaoAtiva('moldes', 'excluir')) {
        botoes.push(
            `<button data-action="excluir-item" data-tipo="moldes" data-id="${id}" title="Excluir" aria-label="Excluir" class="inline-flex items-center justify-center p-1.5 rounded text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40">${ICONE_EXCLUIR}</button>`,
        );
    }
    return botoes.join('');
}

// Painel "🧱 Colunas ▾" dos Moldes — reaproveita renderSeletorColunas
// (colunas.js) direto, sem passar por atualizarPainelColunas
// (celulas-tabela.js): aquele também anexa "colunas de contagem"
// (colunas-contagem.js), que não se aplica aqui (nenhum campo de Molde
// é uma lista pra contar itens dentro). Mesmo motivo/padrão de
// atualizarPainelColunasEstruturaTextual, mais abaixo neste arquivo.
function atualizarPainelColunasMoldes() {
    const painel = document.getElementById('painel-colunas-moldes');
    if (!painel) return;
    painel.innerHTML = renderSeletorColunas('moldes');
}

window.addEventListener('colunas:alteradas', (ev) => {
    if (ev.detail?.tabela === 'moldes') renderMoldes();
});
window.addEventListener('acoes-coluna:alteradas', (ev) => {
    if (ev.detail?.tabela === 'moldes') renderMoldes();
});

export function renderMoldes() {
    const tbody = document.getElementById('lista-moldes');
    if (!tbody) return;

    atualizarPainelColunasMoldes();
    atualizarPainelAcoes('moldes', 'painel-acoes-moldes');

    const ativas = getColunasAtivas('moldes');
    const def = DEFINICAO_COLUNAS.moldes;
    const colunas = ativas.map((key) => def.find((c) => c.key === key)).filter(Boolean);

    const cabecalho = document.getElementById('cabecalho-moldes');
    if (cabecalho) {
        const thsMeio = colunas
            .map(
                (c) =>
                    `<th class="p-4 border-b border-gray-200 dark:border-slate-700">${escapeHtml(c.label)}</th>`,
            )
            .join('');
        cabecalho.innerHTML = `
            <th class="p-4 border-b border-gray-200 dark:border-slate-700">ID / Título</th>
            ${thsMeio}
            <th class="p-4 border-b text-right border-gray-200 dark:border-slate-700">Ações</th>`;
    }

    const filtradas = db.moldes.filter((m) =>
        filtroMoldes ? (m.titulo || '').toLowerCase().includes(filtroMoldes) : true,
    );
    const ordenadas = [...filtradas].sort((a, b) =>
        (a.titulo || '').localeCompare(b.titulo || '', 'pt-BR'),
    );

    const paginacaoContainer = document.getElementById('paginacao-moldes');

    if (ordenadas.length === 0) {
        const colspan = 2 + colunas.length;
        tbody.innerHTML = `<tr><td colspan="${colspan}" class="text-center text-gray-400 dark:text-slate-500 text-sm py-6">${
            db.moldes.length === 0
                ? 'Nenhum Molde cadastrado ainda.'
                : 'Nenhum Molde encontrado para essa busca.'
        }</td></tr>`;
        if (paginacaoContainer) paginacaoContainer.innerHTML = '';
        return;
    }

    const totalPaginas =
        itensPorPagina === Infinity ? 1 : Math.max(1, Math.ceil(ordenadas.length / itensPorPagina));
    if (paginaMoldes > totalPaginas) paginaMoldes = totalPaginas;
    if (paginaMoldes < 1) paginaMoldes = 1;

    const paginaAtualOrdenadas =
        itensPorPagina === Infinity
            ? ordenadas
            : ordenadas.slice((paginaMoldes - 1) * itensPorPagina, paginaMoldes * itensPorPagina);

    if (paginacaoContainer)
        paginacaoContainer.innerHTML = montarPaginacao(
            ordenadas.length,
            paginaMoldes,
            'pagina-moldes',
        );

    tbody.innerHTML = paginaAtualOrdenadas
        .map((m) => {
            const titulo = m.titulo
                ? escapeHtml(m.titulo)
                : '<em class="text-gray-400 dark:text-slate-500">Sem título ainda</em>';
            const tds = colunas
                .map(
                    (c) =>
                        `<td class="p-4 border-b border-gray-100 dark:border-slate-800">${valorColunaMolde(m, c.key)}</td>`,
                )
                .join('');
            return `
        <tr>
            <td class="p-4 border-b border-gray-100 dark:border-slate-800">
                <span class="text-[10px] text-gray-400 dark:text-slate-500 font-mono">#${m.id}</span><br>
                ${titulo}
            </td>
            ${tds}
            <td class="p-4 border-b border-gray-100 dark:border-slate-800 text-right whitespace-nowrap">
                ${celulaAcoesMolde(m.id, m.status, m.poemaId)}
            </td>
        </tr>`;
        })
        .join('');
}

// ─── Morfofuncionalidade (Progressão Morfofuncional) ───────────
// Ver manutencao/progressao-morfofuncional.md pro requisito completo.
// Colunas Unidades/Eventos agora são toggleáveis (ver DEFINICAO_COLUNAS
// em colunas.js, chave 'estrutura-textual') — o Victor tinha decidido
// deixá-las fixas na leva anterior, mas voltou atrás depois que a
// exibição enumerada (ver resumoItensEstrutura abaixo) passou a
// crescer verticalmente: poder ocultar a coluna mais densa ajuda a
// rolar. ID/Título e Ações continuam sempre fixas, mesmo padrão de
// Sonoridade (ver renderSonoridade acima — cabeçalho montado à mão
// aqui também, não via montarCabecalho, que é só pra Poemas/Prosas).
// Painel "⚙️ Ações ▾" continua igual (Ver/Baixar/Editar/Excluir
// configuráveis + formato do Baixar).

let filtroEstruturaTextual = '';

export function setFiltroEstruturaTextual(valor) {
    filtroEstruturaTextual = (valor || '').trim().toLowerCase();
    renderEstruturaTextual();
}

window.addEventListener('colunas:alteradas', (ev) => {
    if (ev.detail?.tabela === 'estrutura-textual') renderEstruturaTextual();
});

window.addEventListener('acoes-coluna:alteradas', (ev) => {
    if (ev.detail?.tabela === 'estrutura-textual') renderEstruturaTextual();
});

// Resumo de Unidades/Eventos pra célula da tabela: um item por linha,
// enumerado (1., 2., 3.) em vez do texto corrido separado por vírgula
// de antes — ficava poluído com poemas de muitas Unidades (ver
// screenshot que o Victor mandou). Pra Unidade, prioriza o `nome`
// (rótulo livre da camada, ex. "Presença e ausência") quando
// preenchido — só cai pra "unidadeEstrofica · unidadeDiscursiva"
// quando não há nome; Evento não tem campo `nome`, então usa sempre
// `progressaoDialetica`.
function resumoItensEstrutura(itens, rotulador) {
    if (!itens || itens.length === 0) {
        return '<span class="text-gray-300 dark:text-slate-600">—</span>';
    }
    return itens
        .map(
            (item, idx) =>
                `<div>${idx + 1}. ${escapeHtml(rotulador(item) || '(sem classificação)')}</div>`,
        )
        .join('');
}

function rotuloUnidadeNaTabela(u) {
    return u.nome || [u.unidadeEstrofica, u.unidadeDiscursiva].filter(Boolean).join(' · ');
}

// Mesmo padrão de celulaAcoesSonoridade acima: só os botões
// habilitados no painel "⚙️ Ações ▾" (isAcaoAtiva/DEFINICAO_ACOES em
// acoes-coluna.js), na ordem fixa Ver/Baixar/Editar/Excluir.
function celulaAcoesEstruturaTextual(id) {
    const ativas = new Set(
        ['ver', 'baixar', 'editar', 'excluir'].filter((k) => isAcaoAtiva('estrutura-textual', k)),
    );
    const botoes = [];
    if (ativas.has('ver'))
        botoes.push(
            `<button data-action="ver-estrutura-textual" data-id="${id}" title="Ver" aria-label="Ver" class="inline-flex items-center justify-center p-1.5 rounded text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700">${ICONE_VER}</button>`,
        );
    if (ativas.has('baixar'))
        botoes.push(
            `<button data-action="baixar-estrutura-textual" data-id="${id}" title="Baixar" aria-label="Baixar" class="inline-flex items-center justify-center p-1.5 rounded text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700">${ICONE_BAIXAR}</button>`,
        );
    if (ativas.has('editar'))
        botoes.push(
            `<button data-action="editar-estrutura-textual" data-id="${id}" title="Editar" aria-label="Editar" class="inline-flex items-center justify-center bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 p-1.5 rounded hover:bg-blue-200 dark:hover:bg-blue-800">${ICONE_EDITAR}</button>`,
        );
    if (ativas.has('excluir'))
        botoes.push(
            `<button data-action="excluir-item" data-tipo="estruturasTextuais" data-id="${id}" title="Excluir" aria-label="Excluir" class="inline-flex items-center justify-center p-1.5 rounded text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40">${ICONE_EXCLUIR}</button>`,
        );
    return botoes.join('');
}

// Valor de exibição de cada coluna dinâmica (Unidades/Eventos) — mesmo
// papel de valorColunaSonoridade acima, só que aqui cada "valor" já é
// o bloco enumerado inteiro de resumoItensEstrutura, não um campo
// simples.
function valorColunaEstruturaTextual(e, key) {
    if (key === 'unidades') return resumoItensEstrutura(e.unidades, rotuloUnidadeNaTabela);
    if (key === 'eventos') return resumoItensEstrutura(e.eventos, (ev) => ev.progressaoDialetica);
    return '';
}

function atualizarPainelColunasEstruturaTextual() {
    const painel = document.getElementById('painel-colunas-estrutura-textual');
    if (!painel) return;
    // Reaproveita renderSeletorColunas (colunas.js) direto, sem passar
    // por atualizarPainelColunas (celulas-tabela.js) — aquele também
    // anexa o seletor de "colunas de contagem" (colunas-contagem.js),
    // que não faz sentido aqui: os campos contáveis são os de
    // Poemas/Prosas/Sonoridade, nada bate com um registro de
    // Unidades/Eventos.
    painel.innerHTML = renderSeletorColunas('estrutura-textual');
}

export function renderEstruturaTextual() {
    const tbody = document.getElementById('lista-estrutura-textual');
    if (!tbody) return;

    atualizarPainelColunasEstruturaTextual();
    atualizarPainelAcoes('estrutura-textual', 'painel-acoes-estrutura-textual');

    const ativas = getColunasAtivas('estrutura-textual');
    const def = DEFINICAO_COLUNAS['estrutura-textual'];

    const cabecalho = document.getElementById('cabecalho-estrutura-textual');
    if (cabecalho) {
        const thsMeio = ativas
            .map((key) => def.find((c) => c.key === key))
            .filter(Boolean)
            .map(
                (c) =>
                    `<th class="p-4 border-b border-gray-200 dark:border-slate-700">${escapeHtml(c.label)}</th>`,
            )
            .join('');
        cabecalho.innerHTML = `
            <th class="p-4 border-b border-gray-200 dark:border-slate-700">ID / Título</th>
            ${thsMeio}
            <th class="p-4 border-b text-right border-gray-200 dark:border-slate-700">Ações</th>`;
    }

    const filtradas = db.estruturasTextuais.filter((e) => {
        if (!filtroEstruturaTextual) return true;
        const poema = db.poemas.find((p) => p.id == e.poemaId);
        return (poema?.titulo || '').toLowerCase().includes(filtroEstruturaTextual);
    });
    const ordenadas = [...filtradas].sort((a, b) => {
        const ta = db.poemas.find((p) => p.id == a.poemaId)?.titulo || '';
        const tb = db.poemas.find((p) => p.id == b.poemaId)?.titulo || '';
        return ta.localeCompare(tb, 'pt-BR');
    });

    const paginacaoContainerEstr = document.getElementById('paginacao-estrutura-textual');

    if (ordenadas.length === 0) {
        const colspan = 2 + ativas.length;
        tbody.innerHTML = `<tr><td colspan="${colspan}" class="text-center text-gray-400 dark:text-slate-500 text-sm py-6">${
            db.estruturasTextuais.length === 0
                ? 'Nenhuma progressão cadastrada ainda.'
                : 'Nenhuma progressão encontrada para essa busca.'
        }</td></tr>`;
        if (paginacaoContainerEstr) paginacaoContainerEstr.innerHTML = '';
        return;
    }

    // Mesma paginação de Sonoridade (ver renderSonoridade acima) — sem
    // `tabela`/`idsPagina`, já que esta tabela também não tem seleção
    // em massa.
    const totalPaginasEstr =
        itensPorPagina === Infinity ? 1 : Math.max(1, Math.ceil(ordenadas.length / itensPorPagina));
    if (paginaEstruturaTextual > totalPaginasEstr) paginaEstruturaTextual = totalPaginasEstr;
    if (paginaEstruturaTextual < 1) paginaEstruturaTextual = 1;

    const paginaAtualOrdenadas =
        itensPorPagina === Infinity
            ? ordenadas
            : ordenadas.slice(
                  (paginaEstruturaTextual - 1) * itensPorPagina,
                  paginaEstruturaTextual * itensPorPagina,
              );

    if (paginacaoContainerEstr)
        paginacaoContainerEstr.innerHTML = montarPaginacao(
            ordenadas.length,
            paginaEstruturaTextual,
            'pagina-estrutura-textual',
        );

    tbody.innerHTML = paginaAtualOrdenadas
        .map((e) => {
            const poema = db.poemas.find((p) => p.id == e.poemaId);
            const titulo = poema ? escapeHtml(poema.titulo) : '<em>Poema não encontrado</em>';
            const tds = ativas
                .map(
                    (key) =>
                        `<td class="p-4 border-b border-gray-100 dark:border-slate-800 text-sm">${valorColunaEstruturaTextual(e, key)}</td>`,
                )
                .join('');
            return `
        <tr>
            <td class="p-4 border-b border-gray-100 dark:border-slate-800">
                <span class="text-[10px] text-gray-400 dark:text-slate-500 font-mono">#${e.id}</span><br>
                ${titulo}
            </td>
            ${tds}
            <td class="p-4 border-b border-gray-100 dark:border-slate-800 text-right whitespace-nowrap">
                ${celulaAcoesEstruturaTextual(e.id)}
            </td>
        </tr>`;
        })
        .join('');
}

// ─── Épocas ──────────────────────────────────────────────────
// Cadastro central (ver migrarEpocas em db.js), item 3 do plano de
// schema — mesmo espírito de renderAutores acima: sem grupos/badges
// próprios, mostrando as pessoas e relações do período. Contagem considera Poema e Prosa (corrigido
// numa sessão posterior — ver comentário de calcularImpactoExclusaoEpoca
// em db.js; comentário antigo aqui dizia "só Poema" por resquício do
// mesmo gap). Botão "Mesclar" (ver renderPessoas acima e Mesclar
// (Pessoa/Época) em forms.js) — mesma lacuna de duplicata por rename
// existe pra Época.
//
// Desde 27/09/2026, Época (Período Biográfico) também pertence a um
// Autor (ver migrarEpocasAutorId em db.js), então a lista passou a
// agrupar por Autor (cabeçalho de seção), mesmo padrão de renderGrupos
// acima — mas sem os dois níveis de renderGrupos (Época nunca teve
// `paiId`; ninguém pediu subgrupo pra Período Biográfico), então cada
// seção de Autor é uma lista achatada, ordenada por nome.

// Bloco 3: Esfera e Categoria viram etiquetas; as pessoas aparecem com o
// vínculo. Pessoa oculta não aparece (o período continua na lista, só o nome
// some). O antigo texto "Contexto do relacionamento" foi absorvido pela
// migração (ver periodo-biografico-campos.js).
// "Exibir ocultas" da aba: só na tela, na hora. Fica em memória (volta a
// esconder ao recarregar a página), nunca é guardado e não muda o flag da
// pessoa nem do período. Vale para pessoas E períodos ocultos: quando ligado,
// filtros, busca e cartões tratam as pessoas ocultas (e as relações com elas)
// e os períodos ocultos como os demais, com a marca "(oculta)"/"(oculto)". O
// estado mora em ocultas-periodos.js porque a coluna Época Retratada e as
// sugestões do modal do texto também o consultam.
const opcoesOcultasDaAba = () => opcoesOcultasDosPeriodos();

export function alternarExibirOcultasEpocas() {
    definirExibirOcultasDosPeriodos(!exibindoOcultasDosPeriodos());
    renderEpocas();
    // A coluna Época Retratada de Poemas/Prosas segue o mesmo interruptor (as
    // sugestões do modal são refeitas por quem chama, ver main.js).
    renderPoemas();
    renderProsas();
}

function htmlEtiquetasPeriodoBiografico(ep) {
    const etiqueta = (texto, classe) =>
        `<span class="inline-block px-1.5 py-0.5 rounded text-[10px] ${classe}">${escapeHtml(texto)}</span>`;
    const esferas = (ep.esferas || []).map((v) =>
        etiqueta(v, 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'),
    );
    const categorias = (ep.categorias || []).map((v) =>
        etiqueta(v, 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300'),
    );
    const todas = [...esferas, ...categorias];
    return todas.length ? `<div class="flex flex-wrap gap-1 mt-1">${todas.join('')}</div>` : '';
}

function htmlPessoasPeriodoBiografico(ep) {
    // Uma frase por relação visível ("Ana é mãe de Eva") e o nome das pessoas
    // visíveis sem relação visível. Relação com pessoa oculta some inteira.
    const linhas = linhasDoPeriodoBiografico(ep, db, opcoesOcultasDaAba());
    if (linhas.length > 0) {
        return `<p class="text-[10px] text-gray-500 dark:text-slate-400 mt-1 line-clamp-3">${escapeHtml(
            linhas.join(' · '),
        )}</p>`;
    }
    return '';
}

// Busca por nome da aba: além do nome, acha pelas pessoas visíveis e pelas
// etiquetas (Esfera, Categoria, Natureza, Vínculo).
function textoExtraPeriodoBiografico(ep) {
    return [
        textoBuscaPessoasDoPeriodo(ep, db, opcoesOcultasDaAba()),
        textoBuscaEsferas(ep),
        textoBuscaCategorias(ep),
        textoBuscaNaturezas(ep, db, opcoesOcultasDaAba()),
        textoBuscaVinculos(ep, db, opcoesOcultasDaAba()),
    ].join(' ');
}

// `ctx` vem de renderEpocas: `visiveis` (a lista em que a hierarquia é lida),
// `nivel` (recuo na árvore), `contexto` (pai que o filtro tirou, mostrado
// apagado só para não perder o fio) e `escondidos` (quantos períodos estão
// dentro de um ramo recolhido).
function cartaoEpoca(ep, ctx = {}) {
    const { visiveis = [ep], nivel = 0, contexto: soContexto = false, escondidos = 0 } = ctx;
    const { poemasIds, prosasIds } = calcularImpactoExclusaoEpoca(db, ep.id);
    const total = poemasIds.length + prosasIds.length;
    // Período oculto só chega aqui com "Exibir ocultas" ligado: fica
    // esmaecido e marcado, como a Pessoa oculta na aba Pessoas.
    const rotuloOcultar = ep.oculto ? 'Reexibir' : 'Ocultar';
    const numFilhos = filhosDoPeriodo(visiveis, ep.id).length;
    const recolhido = escondidos > 0;
    // Pai que o filtro tirou da lista: o cartão de topo diz de onde vem. Os
    // outros pais (além do principal) aparecem como "também em".
    const acima = nivel === 0 ? caminhoDosAncestraisDoPeriodo(visiveis, ep.id) : '';
    const tambemEm = paisDoPeriodo(visiveis, ep.id)
        .slice(1)
        .map((pid) => caminhoDoPeriodo(visiveis, pid))
        .filter(Boolean);
    const dicas = [
        acima ? `dentro de ${acima}` : null,
        tambemEm.length ? `também em ${tambemEm.join('; ')}` : null,
        soContexto ? 'só como contexto (não passa no filtro)' : null,
        recolhido ? `${escondidos} escondido${escondidos !== 1 ? 's' : ''} no ramo` : null,
    ]
        .filter(Boolean)
        .map(escapeHtml)
        .join(' · ');
    // Sem datas próprias, mostra (só na tela) o que os períodos de dentro cobrem.
    const datas = datasEfetivasDoPeriodo(visiveis, ep);
    const intervalo = formatarIntervaloPeriodoHistorico(datas);
    const linhaIntervalo =
        intervalo === '—'
            ? ''
            : `<p class="text-[10px] text-gray-400 dark:text-slate-500 font-mono mt-1${datas.derivado ? ' italic' : ''}">${escapeHtml(datas.derivado ? `dos períodos de dentro: ${intervalo}` : intervalo)}</p>`;
    return `
        <div class="bg-white dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm flex items-center gap-3${nivel > 0 ? ' border-l-4 border-l-indigo-300 dark:border-l-indigo-500/60' : ''}${ep.oculto || soContexto ? ' opacity-60' : ''}" style="margin-left: ${nivel * 1.5}rem"${nivel > 0 ? ' data-dentro-de-outro="true"' : ''}${soContexto ? ' data-contexto="true"' : ''}>
            ${
                soContexto
                    ? ''
                    : `<input type="checkbox" data-action="toggle-epoca" data-id="${ep.id}" ${
                          selecaoEpocas.has(ep.id) ? 'checked' : ''
                      } aria-label="Selecionar ${escapeHtml(ep.nome)}" class="w-4 h-4 flex-shrink-0 mb-0" />`
            }
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1">${
                    numFilhos
                        ? `<button type="button" data-action="alternar-ramo-epoca" data-id="${ep.id}" aria-expanded="${recolhido ? 'false' : 'true'}" title="${recolhido ? 'Expandir' : 'Recolher'}" aria-label="${recolhido ? 'Expandir' : 'Recolher'} ${escapeHtml(ep.nome)}" class="inline-flex items-center justify-center w-5 h-5 rounded text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 flex-shrink-0"><span aria-hidden="true">${recolhido ? '▸' : '▾'}</span></button>`
                        : ''
                }<h4 class="font-bold text-gray-800 dark:text-slate-100">${escapeHtml(ep.nome)}${
                    ep.oculto
                        ? ' <span class="text-[10px] font-semibold text-amber-600 dark:text-amber-400">(oculto)</span>'
                        : ''
                }</h4></div>
                ${linhaIntervalo}
                ${htmlEtiquetasPeriodoBiografico(ep)}
                ${htmlPessoasPeriodoBiografico(ep)}
                <p class="text-[10px] text-gray-400 dark:text-slate-500 font-mono mt-1">
                    aparece em ${total} texto${total !== 1 ? 's' : ''}${numFilhos ? ` · ${numFilhos} período${numFilhos !== 1 ? 's' : ''} dentro` : ''}${dicas ? ` · ${dicas}` : ''}
                </p>
            </div>
            <div class="flex gap-3 flex-shrink-0">
                <button data-action="ver-periodo-biografico" data-id="${ep.id}" title="Ver" aria-label="Ver" class="inline-flex items-center justify-center p-1.5 rounded text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700">${ICONE_VER}</button>
                <button data-action="ver-textos-epoca" data-id="${ep.id}" title="Ver textos" aria-label="Ver textos" class="inline-flex items-center justify-center p-1.5 rounded text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700">${ICONE_LISTA_TEXTOS}</button>
                <button data-action="editar-epoca" data-id="${ep.id}" title="Editar" aria-label="Editar" class="inline-flex items-center justify-center p-1.5 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40">${ICONE_EDITAR}</button>
                <button data-action="toggle-ocultar-epoca" data-id="${ep.id}" title="${rotuloOcultar}" aria-label="${rotuloOcultar}" class="inline-flex items-center justify-center p-1.5 rounded text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700">${ep.oculto ? ICONE_PERMITIDO : ICONE_PROIBIDO}</button>
                <button data-action="mesclar-item" data-tipo="epocas" data-id="${ep.id}" title="Mesclar com outra época do mesmo Autor" aria-label="Mesclar" class="inline-flex items-center justify-center p-1.5 rounded text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40">${ICONE_MESCLAR}</button>
                <button data-action="excluir-item" data-tipo="epocas" data-id="${ep.id}" title="Excluir" aria-label="Excluir" class="inline-flex items-center justify-center p-1.5 rounded text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40">${ICONE_EXCLUIR}</button>
            </div>
        </div>`;
}

// ─── Filtros dos cadastros de período (Biográfico, Histórico, Movimento/Escola) ─
// Estado em memória (zera ao recarregar, como os filtros de Pessoas/Grupos).
// `de`/`ate` guardam o texto digitado (aceita "2020", "03/2020",
// "15/03/2020" — ver parseFiltroDataRapido); texto inválido vale como
// campo vazio, sem mensagem. `modo` = 'todos' | 'com-data' | 'sem-data'
// (ver filtrarPeriodosPorData em utils.js). `autor` só existe em Biográfico.
const filtrosPeriodo = {
    epocas: {
        nome: '',
        autor: '',
        de: '',
        ate: '',
        modo: 'todos',
        ...FILTRO_PERIODO_BIOGRAFICO_VAZIO,
    },
    periodosHistoricos: { nome: '', de: '', ate: '', modo: 'todos' },
    // Tipo, Região, Programa e Postura: '' = todos; FILTRO_CORRENTE_VAZIO =
    // só os sem valor (ver filtrarCorrentesPorAtributos).
    movimentosEscolas: {
        nome: '',
        de: '',
        ate: '',
        modo: 'todos',
        tipo: '',
        regiao: '',
        programa: '',
        postura: '',
    },
};

const RENDER_POR_ABA_PERIODO = {
    epocas: () => renderEpocas(),
    periodosHistoricos: () => renderPeriodosHistoricos(),
    movimentosEscolas: () => renderMovimentosEscolas(),
};

// Lê os controles da aba e re-renderiza só a lista dela.
export function setFiltroPeriodo(aba) {
    const f = filtrosPeriodo[aba];
    if (!f) return;
    const lerValor = (sufixo) => document.getElementById(`fp-${aba}-${sufixo}`)?.value ?? '';
    f.nome = lerValor('nome').trim();
    f.de = lerValor('de').trim();
    f.ate = lerValor('ate').trim();
    f.modo = lerValor('modo') || 'todos';
    if (aba === 'epocas') {
        f.autor = lerValor('autor');
        ['esfera', 'categoria', 'pessoa', 'natureza', 'vinculo'].forEach((campo) => {
            f[campo] = lerValor(campo);
        });
    }
    if (aba === 'movimentosEscolas') {
        ['tipo', 'regiao', 'programa', 'postura'].forEach((campo) => {
            f[campo] = lerValor(campo);
        });
    }
    RENDER_POR_ABA_PERIODO[aba]();
}

// Monta os controles uma única vez por aba (o container fica vazio no
// index.html). Re-renderizar a lista não recria os inputs, então o que
// foi digitado não se perde.
function garantirControlesFiltroPeriodo(aba) {
    const container = document.getElementById(`filtros-periodo-${aba}`);
    if (!container) return;
    if (!container.dataset.montado) {
        const campoTexto = (sufixo, rotulo) => `
            <label class="flex items-center gap-1.5 text-xs text-gray-600 dark:text-slate-400">
                ${rotulo}
                <input type="text" id="fp-${aba}-${sufixo}" oninput="setFiltroPeriodo('${aba}')"
                    placeholder="aaaa ou mm/aaaa" title="Ano, mês/ano ou dia/mês/ano"
                    autocomplete="off" style="width: 8.5rem; margin-bottom: 0" />
            </label>`;
        // Busca por nome: substring, sem diferenciar caixa nem acento (mesmo
        // critério padrão da busca de Poemas/Prosas — ver normalizarBusca).
        const campoNome = `
            <input type="text" id="fp-${aba}-nome" oninput="setFiltroPeriodo('${aba}')"
                placeholder="Buscar por nome" title="Buscar pelo nome (ignora maiúsculas e acentos)"
                autocomplete="off" style="width: 12rem; margin-bottom: 0" />`;
        const seletorAutor =
            aba === 'epocas'
                ? `<select id="fp-epocas-autor" onchange="setFiltroPeriodo('epocas')"
                        style="width: auto; margin-bottom: 0"></select>`
                : '';
        // Bloco 3: Esfera, Categoria, Pessoa, Natureza e Vínculo (opções montadas a cada
        // render, só com o que algum período usa).
        const seletoresBiograficos =
            aba === 'epocas'
                ? ['esfera', 'categoria', 'pessoa', 'natureza', 'vinculo']
                      .map(
                          (
                              campo,
                          ) => `<select id="fp-epocas-${campo}" onchange="setFiltroPeriodo('epocas')"
                        title="Filtrar por ${campo}" style="width: auto; margin-bottom: 0"></select>`,
                      )
                      .join('')
                : '';
        const acoesBiograficas =
            aba === 'epocas'
                ? `<button type="button" id="fp-epocas-limpar" onclick="limparFiltrosPeriodosBiograficos()"
                class="text-xs text-blue-600 dark:text-blue-400 hover:underline" style="margin-bottom: 0">Limpar filtros</button>
            <button type="button" id="fp-epocas-ocultas" onclick="alternarExibirOcultasEpocas()"
                class="text-xs hover:underline hidden" style="margin-bottom: 0"
                aria-pressed="false"
                title="Mostra as pessoas e os períodos ocultos nos filtros, na busca e nos cartões, só enquanto a página estiver aberta"></button>
            <button type="button" id="fp-epocas-opcoes" onclick="abrirOpcoesPeriodoBiografico()"
                class="text-xs text-blue-600 dark:text-blue-400 hover:underline" style="margin-bottom: 0"
                title="Editar as listas de Esfera, de Natureza e de Vínculo">Gerenciar esferas, naturezas e vínculos</button>
            <span id="fp-epocas-contagem" class="text-xs text-gray-500 dark:text-slate-400" aria-live="polite"></span>`
                : '';
        // Só em Correntes literárias: Tipo, Região, Programa e Postura. As
        // opções fixas saem das listas do app; a Região é montada a cada
        // render (ver popularSelectRegiaoCorrentes), com o que o cadastro usa.
        const selectAtributo = (sufixo, titulo, vazio, opcoes, rotuloVazio) => `
            <select id="fp-${aba}-${sufixo}" onchange="setFiltroPeriodo('${aba}')"
                title="${titulo}" style="width: auto; margin-bottom: 0">
                <option value="">${vazio}</option>
                ${opcoes.map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('')}
                <option value="${FILTRO_CORRENTE_VAZIO}">${rotuloVazio}</option>
            </select>`;
        const seletoresCorrente =
            aba === 'movimentosEscolas'
                ? `${selectAtributo('tipo', 'Tipo da corrente', '-- Todos os tipos --', TIPOS_MOVIMENTO_ESCOLA, 'Tipo não especificado')}
            <select id="fp-movimentosEscolas-regiao" onchange="setFiltroPeriodo('movimentosEscolas')"
                title="Região de origem (a divisão sem região usa a do pai)" style="width: auto; margin-bottom: 0"></select>
            ${selectAtributo('programa', 'Programa (a divisão sem programa usa o do pai)', '-- Todos os programas --', PROGRAMAS_MOVIMENTO, 'Programa não preenchido')}
            ${selectAtributo('postura', 'Postura estética (a divisão sem postura usa a do pai)', '-- Todas as posturas --', POSTURAS_ESTETICAS, 'Postura não preenchida')}`
                : '';
        const acoesCorrente =
            aba === 'movimentosEscolas'
                ? `<button type="button" id="fp-movimentosEscolas-limpar" onclick="limparFiltrosCorrentes()"
                class="text-xs text-blue-600 dark:text-blue-400 hover:underline" style="margin-bottom: 0">Limpar filtros</button>
            <span id="fp-movimentosEscolas-contagem" class="text-xs text-gray-500 dark:text-slate-400" aria-live="polite"></span>`
                : '';
        container.className = 'flex flex-wrap items-center gap-x-4 gap-y-2 mb-4';
        container.innerHTML = `
            ${campoNome}
            ${seletorAutor}
            ${seletoresBiograficos}
            ${seletoresCorrente}
            ${campoTexto('de', 'De')}
            ${campoTexto('ate', 'Até')}
            <select id="fp-${aba}-modo" onchange="setFiltroPeriodo('${aba}')"
                title="Como tratar os itens sem data" style="width: auto; margin-bottom: 0">
                <option value="todos">Com e sem data</option>
                <option value="com-data">Só com data</option>
                <option value="sem-data">Só sem data</option>
            </select>
            ${acoesCorrente}
            ${acoesBiograficas}`;
        container.dataset.montado = '1';
    }
    // Em "Só sem data" o intervalo não tem o que filtrar: desabilita em vez
    // de aceitar um valor que seria ignorado.
    const somenteSemData = filtrosPeriodo[aba].modo === 'sem-data';
    ['de', 'ate'].forEach((sufixo) => {
        const el = document.getElementById(`fp-${aba}-${sufixo}`);
        if (el) el.disabled = somenteSemData;
    });
    if (aba === 'epocas') {
        popularSelectAutores('fp-epocas-autor', '-- Todos os autores --');
        popularSelectsBiograficos();
        atualizarBotaoExibirOcultasEpocas();
    }
    if (aba === 'movimentosEscolas') popularSelectRegiaoCorrentes();
}

// Região: um item por lugar usado no cadastro ("Brasil/Portugal" vira Brasil
// e Portugal). Refeito a cada render para acompanhar cadastros novos; se o
// lugar escolhido deixou de existir, volta para "Todas".
function popularSelectRegiaoCorrentes() {
    const select = document.getElementById('fp-movimentosEscolas-regiao');
    if (!select) return;
    const lugares = opcoesDeRegiaoDasCorrentes(db.movimentosEscolas);
    const atual = filtrosPeriodo.movimentosEscolas.regiao;
    const valido = !atual || atual === FILTRO_CORRENTE_VAZIO || lugares.includes(atual);
    if (!valido) filtrosPeriodo.movimentosEscolas.regiao = '';
    select.innerHTML = `<option value="">-- Todas as regiões --</option>${lugares
        .map((l) => `<option value="${escapeHtml(l)}">${escapeHtml(l)}</option>`)
        .join('')}<option value="${FILTRO_CORRENTE_VAZIO}">Sem região</option>`;
    select.value = filtrosPeriodo.movimentosEscolas.regiao;
}

// Botão "Limpar filtros" de Correntes literárias: zera nome, período e os
// quatro atributos de uma vez.
export function limparFiltrosCorrentes() {
    const f = filtrosPeriodo.movimentosEscolas;
    Object.assign(f, {
        nome: '',
        de: '',
        ate: '',
        modo: 'todos',
        tipo: '',
        regiao: '',
        programa: '',
        postura: '',
    });
    ['nome', 'de', 'ate', 'tipo', 'regiao', 'programa', 'postura'].forEach((sufixo) => {
        const el = document.getElementById(`fp-movimentosEscolas-${sufixo}`);
        if (el) el.value = '';
    });
    const modo = document.getElementById('fp-movimentosEscolas-modo');
    if (modo) modo.value = 'todos';
    renderMovimentosEscolas();
}

// O botão só aparece se há alguma pessoa oculta no cadastro (sem ela, não teria
// o que mostrar). Ligado, fica em âmbar para não passar despercebido.
function atualizarBotaoExibirOcultasEpocas() {
    const botao = document.getElementById('fp-epocas-ocultas');
    if (!botao) return;
    const exibindo = exibindoOcultasDosPeriodos();
    const haOcultas =
        (db.pessoas || []).some((p) => p.oculto) || (db.epocas || []).some((e) => e.oculto);
    botao.classList.toggle('hidden', !haOcultas && !exibindo);
    botao.setAttribute('aria-pressed', String(exibindo));
    botao.textContent = exibindo ? 'Esconder ocultas' : 'Exibir ocultas';
    botao.classList.toggle('text-amber-600', exibindo);
    botao.classList.toggle('dark:text-amber-400', exibindo);
    botao.classList.toggle('text-blue-600', !exibindo);
    botao.classList.toggle('dark:text-blue-400', !exibindo);
}

// Bloco 3: opções dos filtros Esfera/Categoria/Pessoa/Natureza/Vínculo. Se o valor
// escolhido deixou de existir (período editado ou pessoa oculta depois),
// volta para "Todos" sem mensagem.
function popularSelectsBiograficos() {
    const f = filtrosPeriodo.epocas;
    const opcoes = opcoesDeFiltroBiografico(db, opcoesOcultasDaAba());
    const montar = (campo, vazio, itens) => {
        const select = document.getElementById(`fp-epocas-${campo}`);
        if (!select) return;
        const valido = !f[campo] || itens.some(([valor]) => String(valor) === String(f[campo]));
        if (!valido) f[campo] = '';
        select.innerHTML =
            `<option value="">${vazio}</option>` +
            itens
                .map(
                    ([valor, rotulo]) =>
                        `<option value="${escapeHtml(String(valor))}">${escapeHtml(rotulo)}</option>`,
                )
                .join('');
        select.value = f[campo];
    };
    montar(
        'esfera',
        '-- Todas as esferas --',
        opcoes.esferas.map((v) => [v, v]),
    );
    montar(
        'categoria',
        '-- Todas as categorias --',
        opcoes.categorias.map((v) => [v, v]),
    );
    montar(
        'pessoa',
        '-- Todas as pessoas --',
        opcoes.pessoas.map((p) => [p.id, p.oculto ? `${p.nome} (oculta)` : p.nome]),
    );
    montar(
        'natureza',
        '-- Todas as naturezas --',
        opcoes.naturezas.map((v) => [v, v]),
    );
    montar(
        'vinculo',
        '-- Todos os vínculos --',
        opcoes.vinculos.map((v) => [v.valor, v.rotulo]),
    );
}

export function limparFiltrosPeriodosBiograficos() {
    const f = filtrosPeriodo.epocas;
    Object.assign(f, {
        nome: '',
        autor: '',
        de: '',
        ate: '',
        modo: 'todos',
        ...FILTRO_PERIODO_BIOGRAFICO_VAZIO,
    });
    ['nome', 'de', 'ate', 'autor', 'esfera', 'categoria', 'pessoa', 'natureza', 'vinculo'].forEach(
        (sufixo) => {
            const el = document.getElementById(`fp-epocas-${sufixo}`);
            if (el) el.value = '';
        },
    );
    const modo = document.getElementById('fp-epocas-modo');
    if (modo) modo.value = 'todos';
    renderEpocas();
}

function aplicarFiltroPeriodo(aba, itens, opcoes = {}) {
    const f = filtrosPeriodo[aba];
    const de = f.de ? parseFiltroDataRapido(f.de) : null;
    const ate = f.ate ? parseFiltroDataRapido(f.ate) : null;
    const termoNome = normalizarBusca(f.nome);
    const { textoExtra, ...opcoesDeData } = opcoes;
    const porNome = termoNome
        ? itens.filter((it) =>
              normalizarBusca([it.nome, textoExtra ? textoExtra(it) : ''].join(' ')).includes(
                  termoNome,
              ),
          )
        : itens;
    return filtrarPeriodosPorData(porNome, {
        intervalo: { de: de?.de || {}, ate: ate?.ate || {} },
        modoData: f.modo,
        ...opcoesDeData,
    });
}

function filtroPeriodoAtivo(aba) {
    const f = filtrosPeriodo[aba];
    return !!(
        f.nome ||
        f.de ||
        f.ate ||
        f.modo !== 'todos' ||
        f.autor ||
        filtroPeriodoBiograficoAtivo(f) ||
        filtroDeAtributosAtivo(f)
    );
}

// Ordenação escolhível pela pessoa, mesmo padrão de
// ordenacaoMovimentosEscolas abaixo (ver comentário lá pro histórico da
// decisão) — desde 27/09/2026 Época e Período Histórico também ganharam
// a opção, além de Movimento/Escola. Época/Período Histórico não têm
// década/século (só dia/mês/ano — ver DADOS_SEED_MOVIMENTOS_ESCOLAS em
// db.js), então `anoEquivalenteMovimento` aqui só está sendo reaproveitado
// pelo que ele já faz de qualquer forma com uma data comum: ler `d.ano`.
// Estado em memória, não persiste — reseta ao recarregar a página, como
// ordenacaoMovimentosEscolas.
// Padrão cronológica desde 28/09/2026 (pedido do Victor) nas três abas
// (Época, Período Histórico, Movimento/Escola); o <select> de cada aba no
// index.html abre com essa opção marcada.
export let ordenacaoEpocas = 'cronologica'; // 'alfabetica' | 'cronologica'

export function definirOrdenacaoEpocas(modo) {
    ordenacaoEpocas = modo === 'cronologica' ? 'cronologica' : 'alfabetica';
    renderEpocas();
}

// Ramos recolhidos da árvore (ids dos períodos cujo conteúdo está escondido).
// Estado em memória, como a ordenação: volta a tudo expandido ao recarregar.
// Com filtro ativo o recolhimento é ignorado, para um resultado da busca
// nunca ficar escondido dentro de um ramo fechado.
const epocasRecolhidas = new Set();

// Períodos que sumiram da tela por causa de um recolhimento (existem na árvore,
// passam no filtro e estão dentro de um ramo fechado). Serve para tirá-los da
// seleção em lote: a barra de ações não pode contar o que não se vê.
function idsEscondidosPorRecolhimentoEpocas() {
    const com = new Set(
        gruposEpocasVisiveis()
            .grupos.flatMap((g) => g.itens)
            .map((i) => String(i.m.id)),
    );
    return gruposEpocasVisiveis({ ignorarRecolhimento: true })
        .grupos.flatMap((g) => g.itens)
        .map((i) => i.m.id)
        .filter((id) => !com.has(String(id)));
}

function tirarEscondidosDaSelecao() {
    idsEscondidosPorRecolhimentoEpocas().forEach((id) => selecaoEpocas.delete(id));
}

export function alternarRamoEpoca(id) {
    const k = String(id);
    if (epocasRecolhidas.has(k)) epocasRecolhidas.delete(k);
    else epocasRecolhidas.add(k);
    tirarEscondidosDaSelecao();
    renderEpocas();
}

export function recolherTodasEpocas() {
    db.epocas.forEach((p) => {
        if (filhosDoPeriodo(db.epocas, p.id).length) epocasRecolhidas.add(String(p.id));
    });
    tirarEscondidosDaSelecao();
    renderEpocas();
}

export function expandirTodasEpocas() {
    epocasRecolhidas.clear();
    renderEpocas();
}

// Períodos que a tela mostra, agrupados por autor (alfabético) e, dentro de
// cada autor, em árvore: cada período seguido dos que fazem parte dele,
// recuados ("Faz parte de"), na ordem escolhida. Cabeçalhos saem da lista JÁ
// filtrada, senão sobraria cabeçalho de autor sem nenhum cartão embaixo.
// Período de autor sem cadastro não aparece (e por isso também não entra na
// seleção em lote). A hierarquia é lida só entre os períodos visíveis: pai
// oculto some por inteiro (nem o nome aparece) e o filho vira período de topo.
// Cada item é `{ m, nivel, contexto, escondidos }`; `contexto` marca o pai que o
// filtro tirou, mostrado apagado só para a árvore não perder o fio.
function gruposEpocasVisiveis({ ignorarRecolhimento = false } = {}) {
    const visiveis = periodosVisiveis(db.epocas, opcoesOcultasDaAba());
    const porAutor = filtrosPeriodo.epocas.autor
        ? visiveis.filter((ep) => String(ep.autorId) === String(filtrosPeriodo.epocas.autor))
        : visiveis;
    const porCampos = filtrarPeriodosBiograficos(
        porAutor,
        filtrosPeriodo.epocas,
        db,
        opcoesOcultasDaAba(),
    );
    const filtradas = aplicarFiltroPeriodo('epocas', porCampos, {
        textoExtra: textoExtraPeriodoBiografico,
    });
    const contexto = ancestraisForaDoPeriodo(visiveis, filtradas);
    const idsContexto = new Set(contexto.map((p) => String(p.id)));
    const comparar = criarComparadorDeEpocas(visiveis, ordenacaoEpocas);
    const recolhidos =
        filtroPeriodoAtivo('epocas') || ignorarRecolhimento ? new Set() : epocasRecolhidas;
    // O agrupamento por autor continua sempre alfabético (não há "cronológico"
    // pra um conjunto de nomes de pessoa); só a ordem DENTRO de cada autor
    // respeita ordenacaoEpocas.
    const autores = [...new Set(filtradas.map((ep) => ep.autorId))]
        .map((id) => db.autores.find((a) => a.id == id))
        .filter(Boolean)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    return {
        filtradas,
        visiveis,
        grupos: autores.map((autor) => {
            const doAutor = [...filtradas, ...contexto].filter((ep) => ep.autorId == autor.id);
            const emArvore = ordenarPeriodosEmArvore(doAutor, comparar);
            const { visiveis: naTela, escondidos } = aplicarRecolhimentoPeriodos(
                emArvore,
                recolhidos,
            );
            return {
                autor,
                itens: naTela.map(({ m, nivel }) => ({
                    m,
                    nivel,
                    contexto: idsContexto.has(String(m.id)),
                    escondidos: escondidos.get(String(m.id)) || 0,
                })),
            };
        }),
    };
}

// Na ordem da tela, sem o que está dentro de um ramo recolhido nem o pai que só
// aparece como contexto (usada pelo shift-click e pelo "selecionar todos").
export function getListaVisivelEpocas() {
    return gruposEpocasVisiveis()
        .grupos.flatMap((g) => g.itens)
        .filter((i) => !i.contexto)
        .map((i) => i.m);
}

export function renderEpocas() {
    const container = document.getElementById('lista-epocas');
    if (!container) return;

    garantirControlesFiltroPeriodo('epocas');
    podarSelecaoEpocas();

    // Só os períodos que a tela pode mostrar contam (oculto não entra no total,
    // senão a contagem entregaria que há períodos escondidos).
    const totalVisivel = periodosVisiveis(db.epocas, opcoesOcultasDaAba()).length;
    if (totalVisivel === 0) {
        container.innerHTML = `<div class="col-span-full text-center text-gray-400 dark:text-slate-500 text-sm py-6">Nenhuma época cadastrada ainda.</div>`;
        atualizarSelecaoEpocasNaTela([]);
        return;
    }

    const { filtradas: epocasFiltradas, grupos, visiveis } = gruposEpocasVisiveis();

    const contagemEl = document.getElementById('fp-epocas-contagem');
    if (contagemEl) {
        const total = totalVisivel;
        contagemEl.textContent = filtroPeriodoAtivo('epocas')
            ? `${epocasFiltradas.length} de ${total} período${total !== 1 ? 's' : ''}`
            : `${total} período${total !== 1 ? 's' : ''}`;
    }
    atualizarSelecaoEpocasNaTela(
        grupos.flatMap((g) => g.itens.filter((i) => !i.contexto).map((i) => i.m)),
    );

    if (epocasFiltradas.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center text-gray-400 dark:text-slate-500 text-sm py-6">Nenhum período biográfico encontrado com esse filtro.</div>`;
        return;
    }

    container.innerHTML = grupos
        .map(
            ({ autor, itens }) => `
        <h3 class="col-span-full text-sm font-semibold text-gray-500 dark:text-slate-400 mt-4 first:mt-0 uppercase tracking-wide">${escapeHtml(autor.nome)}</h3>
        ${itens.map((item) => cartaoEpoca(item.m, { ...item, visiveis })).join('')}`,
        )
        .join('');
}

// "Selecionar todos" reflete se tudo o que está à vista já está marcado, e a
// barra de ações aparece só com seleção.
function atualizarSelecaoEpocasNaTela(visiveis) {
    const todos = document.getElementById('toggle-todos-epocas');
    if (todos) {
        todos.checked = visiveis.length > 0 && visiveis.every((e) => selecaoEpocas.has(e.id));
        todos.disabled = visiveis.length === 0;
    }
    atualizarBarraSelecaoEpocas();
}

// ─── Períodos Históricos ─────────────────────────────────────────
// Cadastro central (ver comentário em calcularImpactoExclusaoPeriodoHistorico
// em db.js) — mesmo espírito de renderEpocas acima, mais simples (sem
// contextoRelacao) e vínculo direto via `periodoHistoricoId` (campo
// solto no Poema/Prosa, não sub-objeto).

// Mesmo padrão de ordenacaoEpocas acima (ver comentário lá).
export let ordenacaoPeriodosHistoricos = 'cronologica'; // 'alfabetica' | 'cronologica'

export function definirOrdenacaoPeriodosHistoricos(modo) {
    ordenacaoPeriodosHistoricos = modo === 'cronologica' ? 'cronologica' : 'alfabetica';
    renderPeriodosHistoricos();
}

function compararPeriodosHistoricos(a, b) {
    if (ordenacaoPeriodosHistoricos !== 'cronologica') return a.nome.localeCompare(b.nome, 'pt-BR');
    const anoA = anoEquivalenteMovimento(a.inicio) ?? anoEquivalenteMovimento(a.fim);
    const anoB = anoEquivalenteMovimento(b.inicio) ?? anoEquivalenteMovimento(b.fim);
    if (anoA == null && anoB == null) return a.nome.localeCompare(b.nome, 'pt-BR');
    if (anoA == null) return 1;
    if (anoB == null) return -1;
    if (anoA !== anoB) return anoA - anoB;
    return a.nome.localeCompare(b.nome, 'pt-BR');
}

// Ramos recolhidos da árvore (ids dos períodos cujo conteúdo está escondido).
// Estado em memória, como a ordenação: volta a tudo expandido ao recarregar.
// Com filtro ativo o recolhimento é ignorado, para um resultado da busca
// nunca ficar escondido dentro de um ramo fechado.
const periodosHistoricosRecolhidos = new Set();

export function alternarRamoPeriodoHistorico(id) {
    const k = String(id);
    if (periodosHistoricosRecolhidos.has(k)) periodosHistoricosRecolhidos.delete(k);
    else periodosHistoricosRecolhidos.add(k);
    renderPeriodosHistoricos();
}

export function recolherTodosPeriodosHistoricos() {
    db.periodosHistoricos.forEach((p) => {
        if (filhosDoPeriodo(db.periodosHistoricos, p.id).length) {
            periodosHistoricosRecolhidos.add(String(p.id));
        }
    });
    renderPeriodosHistoricos();
}

export function expandirTodosPeriodosHistoricos() {
    periodosHistoricosRecolhidos.clear();
    renderPeriodosHistoricos();
}

// Da lista em árvore `[{ m, nivel }]`, tira o que está dentro de um ramo
// recolhido. Devolve a lista visível e quantos itens ficaram escondidos
// dentro de cada ramo recolhido (id -> número).
function aplicarRecolhimentoPeriodos(ordenados, recolhidos) {
    const visiveis = [];
    const escondidos = new Map();
    let corte = null; // { id, nivel } do ramo recolhido em curso
    ordenados.forEach((item) => {
        if (corte && item.nivel > corte.nivel) {
            escondidos.set(corte.id, (escondidos.get(corte.id) || 0) + 1);
            return;
        }
        corte = null;
        visiveis.push(item);
        if (recolhidos.has(String(item.m.id))) corte = { id: String(item.m.id), nivel: item.nivel };
    });
    return { visiveis, escondidos };
}

export function renderPeriodosHistoricos() {
    const container = document.getElementById('lista-periodos-historicos');
    if (!container) return;

    garantirControlesFiltroPeriodo('periodosHistoricos');

    // Em árvore: cada período seguido dos que estão dentro dele, recuados.
    // Período cujo pai o filtro tirou da lista aparece como de topo (e o
    // card diz de onde ele vem).
    const filtrados = aplicarFiltroPeriodo('periodosHistoricos', [...db.periodosHistoricos]);
    // O pai que o filtro tirou, mas que tem período dentro que passou, fica na
    // lista apagado, só como contexto (como em Correntes literárias).
    const contextoPeriodos = ancestraisForaDoPeriodo(db.periodosHistoricos, filtrados);
    const idsContextoPeriodos = new Set(contextoPeriodos.map((p) => String(p.id)));
    const ordenados = ordenarPeriodosEmArvore(
        [...filtrados, ...contextoPeriodos],
        compararPeriodosHistoricos,
    );

    const contagemEl = document.getElementById('contagem-periodos-historicos');
    if (contagemEl) {
        const total = db.periodosHistoricos.length;
        contagemEl.textContent = filtroPeriodoAtivo('periodosHistoricos')
            ? `${filtrados.length} de ${total} período${total !== 1 ? 's' : ''}`
            : `${total} período${total !== 1 ? 's' : ''}`;
    }
    const { visiveis, escondidos } = aplicarRecolhimentoPeriodos(
        ordenados,
        filtroPeriodoAtivo('periodosHistoricos') ? new Set() : periodosHistoricosRecolhidos,
    );

    if (filtrados.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center text-gray-400 dark:text-slate-500 text-sm py-6">${filtroPeriodoAtivo('periodosHistoricos') ? 'Nenhum período histórico encontrado com esse filtro.' : 'Nenhum período histórico cadastrado ainda.'}</div>`;
        return;
    }

    container.innerHTML = visiveis
        .map(({ m: ph, nivel }) => {
            const { poemasIds, prosasIds } = calcularImpactoExclusaoPeriodoHistorico(db, ph.id);
            const total = poemasIds.length + prosasIds.length;
            const comDentro = textosDoPeriodoHistorico(db, ph.id, { comDentro: true });
            const totalComDentro = comDentro.poemasIds.length + comDentro.prosasIds.length;
            const intervalo = formatarIntervaloPeriodoHistorico(ph);
            const paisIds = paisDoPeriodo(db.periodosHistoricos, ph.id);
            const numFilhos = filhosDoPeriodo(db.periodosHistoricos, ph.id).length;
            // Contexto: de topo na lista mas com pai no cadastro (o filtro tirou
            // o pai), mostra o caminho acima; os outros pais (além do principal)
            // aparecem como "também em".
            const soContexto = idsContextoPeriodos.has(String(ph.id));
            const nEscondidos = escondidos.get(String(ph.id)) || 0;
            const recolhido = nEscondidos > 0;
            const acima =
                nivel === 0 ? caminhoDosAncestraisDoPeriodo(db.periodosHistoricos, ph.id) : '';
            const tambemEm = paisIds
                .slice(1)
                .map((pid) => caminhoDoPeriodo(db.periodosHistoricos, pid))
                .filter(Boolean);
            const contexto = [
                acima ? `dentro de ${acima}` : null,
                tambemEm.length ? `também em ${tambemEm.join('; ')}` : null,
                soContexto ? 'só como contexto (não passa no filtro)' : null,
                recolhido
                    ? `${nEscondidos} escondido${nEscondidos !== 1 ? 's' : ''} no ramo`
                    : null,
            ]
                .filter(Boolean)
                .map(escapeHtml)
                .join(' · ');
            return `
        <div class="bg-white dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm flex justify-between items-center${nivel > 0 ? ' border-l-4 border-l-indigo-300 dark:border-l-indigo-500/60' : ''}${soContexto ? ' opacity-60' : ''}" style="margin-left: ${nivel * 1.5}rem"${nivel > 0 ? ' data-dentro-de-outro="true"' : ''}${soContexto ? ' data-contexto="true"' : ''}>
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1">${
                    numFilhos
                        ? `<button type="button" data-action="alternar-ramo-periodo-historico" data-id="${ph.id}" aria-expanded="${recolhido ? 'false' : 'true'}" title="${recolhido ? 'Expandir' : 'Recolher'}" aria-label="${recolhido ? 'Expandir' : 'Recolher'} ${escapeHtml(ph.nome)}" class="inline-flex items-center justify-center w-5 h-5 rounded text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 flex-shrink-0"><span aria-hidden="true">${recolhido ? '▸' : '▾'}</span></button>`
                        : ''
                }<h4 class="font-bold text-gray-800 dark:text-slate-100">${escapeHtml(ph.nome)}</h4></div>
                ${
                    intervalo !== '—' || !regiaoVazia(ph.regiao)
                        ? `<p class="text-[10px] text-gray-400 dark:text-slate-500 font-mono mt-1">${[
                              intervalo !== '—' ? intervalo : null,
                              textoDaRegiao(ph.regiao) || null,
                          ]
                              .filter(Boolean)
                              .map(escapeHtml)
                              .join(' · ')}</p>`
                        : ''
                }
                <p class="text-[10px] text-gray-400 dark:text-slate-500 font-mono mt-1">
                    aparece em ${total} texto${total !== 1 ? 's' : ''}${numFilhos ? ` (${totalComDentro} com os de dentro) · ${numFilhos} período${numFilhos !== 1 ? 's' : ''} dentro` : ''} · ${(ph.fontes || []).length ? `${ph.fontes.length} fonte${ph.fontes.length !== 1 ? 's' : ''}` : 'sem fontes'}${contexto ? ` · ${contexto}` : ''}
                </p>
            </div>
            <div class="flex gap-3 flex-shrink-0">
                <button data-action="ver-periodo-historico" data-id="${ph.id}" title="Ver" aria-label="Ver" class="inline-flex items-center justify-center p-1.5 rounded text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700">${ICONE_VER}</button>
                <button data-action="ver-textos-periodo-historico" data-id="${ph.id}" title="Ver textos" aria-label="Ver textos" class="inline-flex items-center justify-center p-1.5 rounded text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700">${ICONE_LISTA_TEXTOS}</button>
                <button data-action="editar-periodo-historico" data-id="${ph.id}" title="Editar" aria-label="Editar" class="inline-flex items-center justify-center p-1.5 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40">${ICONE_EDITAR}</button>
                <button data-action="mesclar-item" data-tipo="periodosHistoricos" data-id="${ph.id}" title="Mesclar com outro período histórico" aria-label="Mesclar" class="inline-flex items-center justify-center p-1.5 rounded text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40">${ICONE_MESCLAR}</button>
                <button data-action="excluir-item" data-tipo="periodosHistoricos" data-id="${ph.id}" title="Excluir" aria-label="Excluir" class="inline-flex items-center justify-center p-1.5 rounded text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40">${ICONE_EXCLUIR}</button>
            </div>
        </div>`;
        })
        .join('');
}

// ─── Movimento/Escola ────────────────────────────────────────────
// Mesmo espírito de renderPeriodosHistoricos acima, mas o impacto de
// exclusão cobre TRÊS coleções (Autor, Poema, Prosa — relação N:N dos
// dois lados, ver calcularImpactoExclusaoMovimentoEscola em db.js), e
// o card mostra Tipo (Artístico/Literário) além do intervalo de datas.
//
// Foi a primeira lista de cadastro central a ganhar ordenação
// escolhível pela pessoa (Época e Período Histórico ganharam a mesma
// opção depois — ver ordenacaoEpocas/ordenacaoPeriodosHistoricos
// acima): com 20+ itens pré-cadastrados cobrindo do Trovadorismo ao
// Pós-Modernismo, ver a evolução em ordem cronológica é útil e a
// alfabética embaralha isso. Estado em memória, não persiste — mesmo
// padrão de ordenacaoPoemas/ordenacaoProsas acima, reseta ao recarregar
// a página.
export let ordenacaoMovimentosEscolas = 'cronologica'; // 'alfabetica' | 'cronologica'

export function definirOrdenacaoMovimentosEscolas(modo) {
    ordenacaoMovimentosEscolas = modo === 'cronologica' ? 'cronologica' : 'alfabetica';
    renderMovimentosEscolas();
}

// Cronológica usa `inicio` do movimento, caindo pro `fim` só se o
// início estiver todo vazio (ex.: um item cadastrado só com data de
// fim/extinção); sem nenhuma das duas datas, vai pro final da lista,
// independente da posição alfabética. Empate no mesmo ano/época
// desempata por nome, pra ordem ficar estável entre re-renders.
function compararMovimentosEscolas(a, b) {
    if (ordenacaoMovimentosEscolas !== 'cronologica') return a.nome.localeCompare(b.nome, 'pt-BR');
    const anoA = anoEquivalenteMovimento(a.inicio) ?? anoEquivalenteMovimento(a.fim);
    const anoB = anoEquivalenteMovimento(b.inicio) ?? anoEquivalenteMovimento(b.fim);
    if (anoA == null && anoB == null) return a.nome.localeCompare(b.nome, 'pt-BR');
    if (anoA == null) return 1;
    if (anoB == null) return -1;
    if (anoA !== anoB) return anoA - anoB;
    return a.nome.localeCompare(b.nome, 'pt-BR');
}

// Ramos recolhidos da árvore de Correntes literárias (ids das correntes cujas
// divisões estão escondidas). Mesmo critério de Período Histórico: estado em
// memória, volta a tudo expandido ao recarregar, e com filtro ativo o
// recolhimento é ignorado, para um resultado da busca nunca ficar escondido
// dentro de um ramo fechado.
const correntesRecolhidas = new Set();

export function alternarRamoCorrente(id) {
    const k = String(id);
    if (correntesRecolhidas.has(k)) correntesRecolhidas.delete(k);
    else correntesRecolhidas.add(k);
    renderMovimentosEscolas();
}

export function recolherTodasCorrentes() {
    db.movimentosEscolas.forEach((m) => {
        if (filhosDaCorrente(db.movimentosEscolas, m.id).length) {
            correntesRecolhidas.add(String(m.id));
        }
    });
    renderMovimentosEscolas();
}

export function expandirTodasCorrentes() {
    correntesRecolhidas.clear();
    renderMovimentosEscolas();
}

export function renderMovimentosEscolas() {
    const container = document.getElementById('lista-movimentos-escolas');
    if (!container) return;

    garantirControlesFiltroPeriodo('movimentosEscolas');

    // Divisão sem data própria vale, no De/Até, pelo período do pai.
    const filtradas = aplicarFiltroPeriodo('movimentosEscolas', [...db.movimentosEscolas], {
        movimento: true,
        periodoEfetivo: (m) =>
            periodoEfetivoDaCorrente(db.movimentosEscolas, m, (x) =>
                periodoTemData(x, { movimento: true }),
            ),
    });
    // Em árvore: cada corrente seguida das suas divisões, recuadas. Divisão
    // cujo pai o filtro tirou da lista entra como corrente de topo (e o card
    // diz de quem ela faz parte).
    // Tipo, Região, Programa e Postura leem o valor efetivo (a divisão sem
    // valor próprio vale pelo do pai). O pai que não passa mas tem divisão
    // que passa fica na lista só como contexto, apagado, para a árvore não
    // perder o fio.
    const { passam } = filtrarCorrentesPorAtributos(
        db.movimentosEscolas,
        filtradas,
        filtrosPeriodo.movimentosEscolas,
    );
    // O contexto vale para qualquer filtro (nome, período ou atributos): o pai
    // que ficou de fora aparece apagado quando alguma divisão dele passa.
    const contexto = ancestraisForaDe(db.movimentosEscolas, passam);
    const idsContexto = new Set(contexto.map((m) => String(m.id)));
    const emArvore = ordenarCorrentesEmArvore([...passam, ...contexto], compararMovimentosEscolas);
    // Divisões dentro de um ramo recolhido saem da lista; o card do ramo diz
    // quantas ficaram escondidas (mesma função de Período Histórico).
    const { visiveis: ordenados, escondidos } = aplicarRecolhimentoPeriodos(
        emArvore,
        filtroPeriodoAtivo('movimentosEscolas') ? new Set() : correntesRecolhidas,
    );

    const contagem = document.getElementById('fp-movimentosEscolas-contagem');
    if (contagem) {
        contagem.textContent = filtroPeriodoAtivo('movimentosEscolas')
            ? `${passam.length} de ${db.movimentosEscolas.length} correntes`
            : '';
    }

    if (passam.length === 0) {
        container.innerHTML = `<div class="text-center text-gray-400 dark:text-slate-500 text-sm py-6">${filtroPeriodoAtivo('movimentosEscolas') ? 'Nenhuma corrente literária encontrada com esse filtro.' : 'Nenhuma corrente literária cadastrada ainda.'}</div>`;
        return;
    }

    container.innerHTML = ordenados
        .map(({ m, nivel }) => {
            const soContexto = idsContexto.has(String(m.id));
            // O card soma o que está nas divisões (cada item conta uma vez); a
            // exclusão olha só os vínculos do próprio registro.
            const temDivisoes = filhosDaCorrente(db.movimentosEscolas, m.id).length > 0;
            const nEscondidas = escondidos.get(String(m.id)) || 0;
            const recolhida = nEscondidas > 0;
            const { autoresIds, poemasIds, prosasIds } = impactoDaCorrente(db, m.id, {
                comDivisoes: temDivisoes,
            });
            const total = autoresIds.length + poemasIds.length + prosasIds.length;
            const intervalo = formatarIntervaloMovimentoEscola(m);
            const programa = programaEfetivoDaCorrente(db.movimentosEscolas, m);
            const postura = posturaEfetivaDaCorrente(db.movimentosEscolas, m);
            const paiForaDaLista =
                m.paiId != null &&
                nivel === 0 &&
                caminhoDaCorrente(db.movimentosEscolas, m.paiId) !== '';
            return `
        <div class="bg-white dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm flex justify-between items-center${soContexto ? ' opacity-60' : ''}" style="margin-left: ${nivel * 1.5}rem"${nivel > 0 ? ' data-divisao="true"' : ''}${soContexto ? ' data-contexto="true"' : ''}>
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1">${
                    temDivisoes
                        ? `<button type="button" data-action="alternar-ramo-corrente" data-id="${m.id}" aria-expanded="${recolhida ? 'false' : 'true'}" title="${recolhida ? 'Expandir' : 'Recolher'}" aria-label="${recolhida ? 'Expandir' : 'Recolher'} ${escapeHtml(m.nome)}" class="inline-flex items-center justify-center w-5 h-5 rounded text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 flex-shrink-0"><span aria-hidden="true">${recolhida ? '▸' : '▾'}</span></button>`
                        : ''
                }<h4 class="font-bold text-gray-800 dark:text-slate-100">${escapeHtml(m.nome)}</h4></div>
                <p class="text-[10px] text-gray-400 dark:text-slate-500 font-mono mt-1">
                    ${[
                        m.divisao || null,
                        m.generoDivisao || null,
                        intervalo !== '—' ? intervalo : null,
                        m.tipo || null,
                        programa.valor
                            ? programa.herdadoDe
                                ? `${programa.valor} (herdado)`
                                : programa.valor
                            : null,
                        postura.valor
                            ? postura.herdadoDe
                                ? `${postura.valor} (herdada)`
                                : postura.valor
                            : null,
                        textoDaRegiao(m.regiaoOrigem) || null,
                    ]
                        .filter(Boolean)
                        .map(escapeHtml)
                        .join(' · ')}
                </p>
                <p class="text-[10px] text-gray-400 dark:text-slate-500 font-mono mt-1">
                    ${autoresIds.length} autor${autoresIds.length !== 1 ? 'es' : ''}, ${total - autoresIds.length} texto${total - autoresIds.length !== 1 ? 's' : ''}${temDivisoes ? ' (com as divisões)' : ''} · ${(m.fontes || []).length ? `${m.fontes.length} fonte${m.fontes.length !== 1 ? 's' : ''}` : 'sem fontes'}${recolhida ? ` · ${nEscondidas} ${nEscondidas !== 1 ? 'divisões escondidas' : 'divisão escondida'} no ramo` : ''}${paiForaDaLista ? ` · parte de ${escapeHtml(caminhoDaCorrente(db.movimentosEscolas, m.paiId))}` : ''}${soContexto ? ' · só como contexto (não passa no filtro)' : ''}
                </p>
            </div>
            <div class="flex gap-3 flex-shrink-0">
                <button data-action="ver-movimento-escola" data-id="${m.id}" title="Ver" aria-label="Ver" class="inline-flex items-center justify-center p-1.5 rounded text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700">${ICONE_VER}</button>
                <button data-action="ver-autores-movimento-escola" data-id="${m.id}" title="Ver autores" aria-label="Ver autores" class="inline-flex items-center justify-center p-1.5 rounded text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700">${ICONE_PESSOAS}</button>
                <button data-action="ver-textos-movimento-escola" data-id="${m.id}" title="Ver textos" aria-label="Ver textos" class="inline-flex items-center justify-center p-1.5 rounded text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700">${ICONE_LISTA_TEXTOS}</button>
                <button data-action="editar-movimento-escola" data-id="${m.id}" title="Editar" aria-label="Editar" class="inline-flex items-center justify-center p-1.5 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40">${ICONE_EDITAR}</button>
                <button data-action="mesclar-item" data-tipo="movimentosEscolas" data-id="${m.id}" title="Mesclar com outra corrente literária" aria-label="Mesclar" class="inline-flex items-center justify-center p-1.5 rounded text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40">${ICONE_MESCLAR}</button>
                <button data-action="excluir-item" data-tipo="movimentosEscolas" data-id="${m.id}" title="Excluir" aria-label="Excluir" class="inline-flex items-center justify-center p-1.5 rounded text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40">${ICONE_EXCLUIR}</button>
            </div>
        </div>`;
        })
        .join('');
}

// ─── Assunto ─────────────────────────────────────────────────────
// Cadastro que agrupa Temas (ver o bloco de Assuntos em utils.js): o
// Assunto de um texto é derivado dos Temas dele, então o card mostra
// quantos textos caem no Assunto, contando cada texto uma vez por
// Assunto, e cada Tema do Assunto com a própria contagem de textos.
// Abaixo da lista, uma linha-aviso diz quantos Temas do cadastro ainda não
// têm Assunto e leva à aba Temas já filtrada por "só sem assunto" (a
// triagem em si mora lá).
// Sem filtro por período nem ordenação escolhível: a lista é pequena e
// fica em ordem alfabética.

// "Ver textos" do card: os textos do Assunto (derivado dos Temas), pela
// mesma abertura de "Ver textos" dos outros cadastros — a caixa de busca
// de Poemas/Prosas com o prefixo `assunto:"Nome"` (ver CAMPOS_ATRIBUTO em
// utils.js). Vai pra Prosas só se o Assunto não aparecer em nenhum poema.
export function verTextosAssunto(id) {
    const assunto = db.assuntos.find((a) => a.id == id);
    if (!assunto) return;
    const noAssunto = (t) => assuntosDoTexto(t, db.assuntos, db.temas).some((a) => a.id == id);
    const poemasIds = db.poemas.filter(noAssunto).map((t) => t.id);
    const prosasIds = (db.prosas || []).filter(noAssunto).map((t) => t.id);
    if (poemasIds.length + prosasIds.length === 0) {
        return mostrarAviso('Nenhum texto tem os temas deste assunto ainda.');
    }
    abrirListaFiltrada('assunto', assunto.nome, poemasIds, prosasIds);
}

// Botão "Baixar .md" da aba: exporta o cadastro inteiro de uma vez (com
// os Temas de cada Assunto e os Temas sem assunto), pensado pra colar
// numa IA e pedir ajuda pra agrupar os temas soltos (ver
// exportar-assuntos.js). Sem seleção — a lista costuma ser pequena.
export function baixarAssuntosMd() {
    baixarAssuntosMarkdown(db.assuntos, [...db.poemas, ...(db.prosas || [])], db.temas);
}

function badgeTemaAssunto(nome, contagem) {
    const usado = contagem > 0;
    const cor = usado
        ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300'
        : 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 italic';
    const titulo = usado
        ? `${contagem} texto${contagem !== 1 ? 's' : ''} com este tema`
        : 'Nenhum texto usa este tema';
    return `<button type="button" data-action="ir-para-tema" data-nome="${escapeHtml(nome)}" title="${titulo} — abrir na aba Temas" class="text-[9px] ${cor} px-1.5 py-0.5 rounded mr-1 mb-1 inline-block hover:underline">${escapeHtml(nome)}${usado ? ` · ${contagem}` : ''}</button>`;
}

export function renderAssuntos() {
    const container = document.getElementById('lista-assuntos');
    if (!container) return;

    const textos = [...db.poemas, ...(db.prosas || [])];
    const contagemPorAssunto = contarTextosPorAssunto(textos, db.assuntos, db.temas);
    const resumo = resumoTemas(textos, db.assuntos, db.temas);
    const contagemPorTema = new Map(resumo.map((t) => [chaveTema(t.nome), t.contagem]));
    const ordenados = [...db.assuntos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    if (ordenados.length === 0) {
        container.innerHTML =
            '<div class="col-span-full text-center text-gray-400 dark:text-slate-500 text-sm py-6">Nenhum assunto cadastrado ainda.</div>';
    } else {
        container.innerHTML = ordenados
            .map((a) => {
                const temas = nomesTemasDoAssunto(a, db.temas);
                const totalTextos = contagemPorAssunto.get(a.id) || 0;
                const badges = temas
                    .map((t) => badgeTemaAssunto(t, contagemPorTema.get(chaveTema(t)) || 0))
                    .join('');
                return `
        <div class="bg-white dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm flex justify-between items-start gap-3">
            <div class="flex-1 min-w-0">
                <h4 class="font-bold text-gray-800 dark:text-slate-100">${escapeHtml(a.nome)}</h4>
                <p class="text-[10px] text-gray-400 dark:text-slate-500 font-mono mt-1">
                    ${temas.length} tema${temas.length !== 1 ? 's' : ''} · aparece em ${totalTextos} texto${totalTextos !== 1 ? 's' : ''}
                </p>
                ${badges ? `<div class="mt-2">${badges}</div>` : ''}
            </div>
            <div class="flex gap-3 flex-shrink-0">
                <button data-action="ver-textos-assunto" data-id="${a.id}" title="Ver textos" aria-label="Ver textos" class="inline-flex items-center justify-center p-1.5 rounded text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700">${ICONE_LISTA_TEXTOS}</button>
                <button data-action="editar-assunto" data-id="${a.id}" title="Editar" aria-label="Editar" class="inline-flex items-center justify-center p-1.5 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40">${ICONE_EDITAR}</button>
                <button data-action="excluir-item" data-tipo="assuntos" data-id="${a.id}" title="Excluir" aria-label="Excluir" class="inline-flex items-center justify-center p-1.5 rounded text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40">${ICONE_EXCLUIR}</button>
            </div>
        </div>`;
            })
            .join('');
    }

    renderTemasSemAssunto();
}

// Linha-aviso no fim da aba Assuntos: quantos Temas do cadastro nenhum
// Assunto lista (o mesmo recorte do filtro "Só sem assunto" da aba Temas,
// que é pra onde o botão leva).
function renderTemasSemAssunto() {
    const aviso = document.getElementById('temas-sem-assunto');
    if (!aviso) return;
    const soltos = temasCadastradosSemAssunto(db).length;
    if ((db.temas || []).length === 0) {
        aviso.innerHTML = '';
        return;
    }
    if (soltos === 0) {
        aviso.innerHTML =
            '<p class="text-sm text-gray-400 dark:text-slate-500">Todos os temas cadastrados já pertencem a algum assunto.</p>';
        return;
    }
    aviso.innerHTML = `
        <p class="text-sm text-gray-600 dark:text-slate-300">
            ${soltos} tema${soltos !== 1 ? 's' : ''} sem assunto.
            <button type="button" data-action="ir-para-temas-sem-assunto" class="text-blue-600 dark:text-blue-400 underline hover:no-underline">Abrir na aba Temas</button>
        </p>`;
}

// Abre a lista de Temas já filtrada por "Só sem assunto" (botão da
// linha-aviso da aba Assuntos).
export function filtrarTemasSemAssunto() {
    const campo = document.getElementById('busca-temas');
    if (campo) campo.value = '';
    const semAssunto = document.getElementById('filtro-temas-sem-assunto');
    if (semAssunto) semAssunto.checked = true;
    triagemSemAssunto = null; // entrada nova na triagem: retrato novo
    renderTemas();
}

// ─── Temas (Cadastros → Temas) ──────────────────────────────────
// Cadastro central de Tema (db.temas — ver temas.js). Lista com busca,
// filtro "sem assunto" e ordenação; cada linha mostra os Assuntos do
// Tema (clicáveis, abrem o Assunto), um seletor pra atribuí-lo a mais um
// Assunto (mesmo handler do painel da aba Assunto) e as ações
// Ver textos / Editar / Excluir. Os controles vivem no index.html; o
// estado do filtro é lido do DOM a cada render.

export function definirBuscaTemas(texto) {
    const campo = document.getElementById('busca-temas');
    if (campo) campo.value = texto || '';
    const semAssunto = document.getElementById('filtro-temas-sem-assunto');
    if (semAssunto) semAssunto.checked = false;
    renderTemas();
}

// "Ver textos" do card do Tema: mesma abertura de "Ver textos" do
// Assunto, com a busca `tema:"Nome"` — os ids vêm da comparação exata
// (temas.js), a busca por prefixo casa por trecho.
export function verTextosTema(id) {
    const tema = (db.temas || []).find((t) => t.id == id);
    if (!tema) return;
    const { poemasIds, prosasIds } = textosDoTema(db, tema.nome);
    if (poemasIds.length + prosasIds.length === 0) {
        return mostrarAviso('Nenhum texto tem este tema ainda.');
    }
    abrirListaFiltrada('tema', tema.nome, poemasIds, prosasIds);
}

// Painel "Possíveis duplicatas" no alto da aba Temas: pares com a mesma
// forma escrita (ver sugerirTemasDuplicados em temas.js). Nada é mesclado
// sozinho; cada par tem "Manter X" (o outro entra nele), "Manter Y" e
// "Não são iguais". Some quando não há par.
function renderDuplicatasTemas() {
    const painel = document.getElementById('duplicatas-temas');
    if (!painel) return;
    const pares = sugerirTemasDuplicados(db);
    if (pares.length === 0) {
        painel.innerHTML = '';
        return;
    }
    const textos = (n) => `${n} texto${n !== 1 ? 's' : ''}`;
    const botao = 'text-xs px-2 py-1 rounded border';
    const linhas = pares
        .map(({ a, b, textosA, textosB }) => {
            const manter = (deste, outro) =>
                `<button type="button" data-action="mesclar-duplicata" data-manter="${deste.id}" data-remover="${outro.id}" title="Junta “${escapeHtml(outro.nome)}” em “${escapeHtml(deste.nome)}”" class="${botao} border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40">Manter “${escapeHtml(deste.nome)}”</button>`;
            return `
        <li class="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5">
            <span class="text-sm text-gray-800 dark:text-slate-100"><strong>${escapeHtml(a.nome)}</strong> <span class="text-[10px] font-mono text-gray-400 dark:text-slate-500">${textos(textosA)}</span> e <strong>${escapeHtml(b.nome)}</strong> <span class="text-[10px] font-mono text-gray-400 dark:text-slate-500">${textos(textosB)}</span></span>
            <span class="flex flex-wrap gap-1.5">
                ${manter(a, b)}
                ${manter(b, a)}
                <button type="button" data-action="nao-sao-iguais" data-a="${a.id}" data-b="${b.id}" class="${botao} border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800">Não são iguais</button>
            </span>
        </li>`;
        })
        .join('');
    painel.innerHTML = `
        <details open class="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-2">
            <summary class="text-sm text-amber-800 dark:text-amber-200 cursor-pointer">${pares.length} possíve${pares.length !== 1 ? 'is duplicatas' : 'l duplicata'}: temas que só mudam em hífen, plural ou acento</summary>
            <ul class="mt-1 divide-y divide-amber-100 dark:divide-amber-900/50">${linhas}</ul>
        </details>`;
}

// Triagem do filtro "Só sem assunto": ao ligar o filtro, a lista de Temas
// sem assunto é congelada (ids). Atribuir um assunto a um tema NÃO o tira
// da lista na hora (um tema costuma pertencer a mais de um assunto, e
// sumir obrigaria a caçá-lo de novo): ele fica marcado como atribuído até
// a pessoa clicar em "Atualizar lista" ou desligar e ligar o filtro.
// null = filtro desligado ou ainda sem retrato.
let triagemSemAssunto = null;

export function atualizarListaSemAssunto() {
    triagemSemAssunto = null;
    renderTemas();
}

export function renderTemas() {
    const container = document.getElementById('lista-temas');
    if (!container) return;
    renderDuplicatasTemas();

    const busca = chaveTema(document.getElementById('busca-temas')?.value || '');
    const soSemAssunto = !!document.getElementById('filtro-temas-sem-assunto')?.checked;
    const ordem = document.getElementById('ordem-temas')?.value || 'alfabetica';
    const contagem = contarTextosPorTema(db);
    const assuntos = [...db.assuntos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    const linhas = (db.temas || []).map((t) => {
        const chave = chaveTema(t.nome);
        return {
            tema: t,
            textos: contagem.get(chave) || 0,
            assuntos: assuntos.filter((a) => (a.temaIds || []).some((id) => id == t.id)),
        };
    });

    if (!soSemAssunto) {
        triagemSemAssunto = null;
    } else if (!triagemSemAssunto) {
        triagemSemAssunto = new Set(
            linhas.filter((l) => l.assuntos.length === 0).map((l) => String(l.tema.id)),
        );
    }
    // Temas que estavam sem assunto no retrato e já ganharam um nesta triagem.
    const jaAtribuidos = soSemAssunto
        ? linhas.filter((l) => triagemSemAssunto.has(String(l.tema.id)) && l.assuntos.length > 0)
              .length
        : 0;
    const botaoAtualizar = document.getElementById('atualizar-temas-sem-assunto');
    if (botaoAtualizar) {
        botaoAtualizar.classList.toggle('hidden', !soSemAssunto);
        botaoAtualizar.textContent = jaAtribuidos
            ? `Atualizar lista (${jaAtribuidos} já atribuído${jaAtribuidos !== 1 ? 's saem' : ' sai'})`
            : 'Atualizar lista';
    }

    const resumo = document.getElementById('resumo-temas');
    const filtradas = linhas
        .filter((l) => !busca || chaveTema(l.tema.nome).includes(busca))
        .filter((l) => !soSemAssunto || triagemSemAssunto.has(String(l.tema.id)))
        .sort((a, b) =>
            ordem === 'usados'
                ? b.textos - a.textos || a.tema.nome.localeCompare(b.tema.nome, 'pt-BR')
                : a.tema.nome.localeCompare(b.tema.nome, 'pt-BR'),
        );
    if (resumo) {
        const semAssunto = linhas.filter((l) => l.assuntos.length === 0).length;
        resumo.textContent = `${filtradas.length} de ${linhas.length} tema${linhas.length !== 1 ? 's' : ''} · ${semAssunto} sem assunto${
            jaAtribuidos
                ? ` · ${jaAtribuidos} atribuído${jaAtribuidos !== 1 ? 's' : ''} nesta triagem`
                : ''
        }`;
    }

    if (filtradas.length === 0) {
        container.innerHTML = `<div class="text-center text-gray-400 dark:text-slate-500 text-sm py-6">${
            linhas.length === 0
                ? 'Nenhum tema cadastrado ainda.'
                : soSemAssunto && !busca && triagemSemAssunto.size === 0
                  ? 'Todos os temas já têm assunto.'
                  : 'Nenhum tema bate com o filtro.'
        }</div>`;
        return;
    }

    container.innerHTML = filtradas
        .map(({ tema: t, textos, assuntos: dele }) => {
            const badges = dele
                .map(
                    (a) =>
                        `<button type="button" data-action="editar-assunto" data-id="${a.id}" title="Abrir o assunto" class="text-[9px] bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded mr-1 inline-block hover:underline">${escapeHtml(a.nome)}</button>`,
                )
                .join('');
            const disponiveis = assuntos.filter((a) => !dele.some((d) => d.id === a.id));
            const seletor =
                disponiveis.length === 0
                    ? ''
                    : `<select data-tema="${escapeHtml(t.nome)}" onchange="atribuirTemaDoPainel(this)" aria-label="Atribuir o tema ${escapeHtml(t.nome)} a um assunto" style="width: auto; margin-bottom: 0">
                        <option value="">${dele.length ? 'Adicionar a…' : 'Atribuir a…'}</option>
                        ${disponiveis.map((a) => `<option value="${a.id}">${escapeHtml(a.nome)}</option>`).join('')}
                    </select>`;
            const nota = t.notas
                ? `<p class="text-[11px] text-gray-500 dark:text-slate-400 mt-1 line-clamp-2">${escapeHtml(t.notas)}</p>`
                : '';
            // Na triagem, tema que já ganhou assunto continua na lista, marcado.
            const atribuido = soSemAssunto && dele.length > 0;
            return `
<div data-atribuido="${atribuido}" class="bg-white dark:bg-slate-900 px-4 py-3 rounded-lg border border-gray-200 dark:border-slate-700 ${atribuido ? 'border-l-4 border-l-emerald-400 dark:border-l-emerald-500' : ''} shadow-sm flex justify-between items-start gap-3">
    <div class="flex-1 min-w-0">
        <div class="flex flex-wrap items-baseline gap-x-2">
            <h4 class="font-bold text-gray-800 dark:text-slate-100">${escapeHtml(t.nome)}</h4>
            <span class="text-[10px] text-gray-400 dark:text-slate-500 font-mono">${textos} texto${textos !== 1 ? 's' : ''}</span>
            ${atribuido ? '<span class="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">✓ atribuído</span>' : ''}
        </div>
        ${nota}
        <div class="mt-2 flex flex-wrap items-center gap-y-1">${badges}${seletor}</div>
    </div>
    <div class="flex gap-3 flex-shrink-0">
        <button data-action="ver-textos-tema" data-id="${t.id}" title="Ver textos" aria-label="Ver textos" class="inline-flex items-center justify-center p-1.5 rounded text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700">${ICONE_LISTA_TEXTOS}</button>
        <button data-action="editar-tema" data-id="${t.id}" title="Editar" aria-label="Editar" class="inline-flex items-center justify-center p-1.5 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40">${ICONE_EDITAR}</button>
        <button data-action="mesclar-item" data-tipo="temas" data-id="${t.id}" title="Mesclar com outro tema" aria-label="Mesclar" class="inline-flex items-center justify-center p-1.5 rounded text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40">${ICONE_MESCLAR}</button>
        <button data-action="excluir-tema" data-id="${t.id}" title="Excluir" aria-label="Excluir" class="inline-flex items-center justify-center p-1.5 rounded text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40">${ICONE_EXCLUIR}</button>
    </div>
</div>`;
        })
        .join('');
}
