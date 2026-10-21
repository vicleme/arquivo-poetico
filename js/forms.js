// ============================================================
// forms.js — Submit handlers e funções de edição por entidade
// ============================================================

import {
    preencherCamposPeriodoBiografico,
    lerCamposPeriodoBiografico,
} from './periodo-biografico-ui.js';
import { registrarValoresNovos } from './periodo-biografico-campos.js';
import {
    preencherCamposPeriodoHistorico,
    lerCamposPeriodoHistorico,
} from './periodo-historico-campos-ui.js';
import { registrarValoresNovosPeriodoHistorico } from './periodos-historicos-campos.js';
import { resolverTemasEditados, aplicarAssuntosPendentes } from './temas.js';
import { renderEtiquetas, impactoDaEtiqueta } from './etiquetas-aba.js';
import { mesclarEtiquetas } from './etiquetas.js';
import {
    ETIQUETAS_CATEGORIAS,
    nomesDeEtiquetasDigitados,
    resolverEtiquetasEditadas,
} from './etiquetas.js';
import { impactoDoLocal, mesclarLocais, resolverLocaisEditados } from './locais.js';
import { renderLocais, destinosDeMesclagemDeLocal } from './ui-locais.js';
import {
    carregarPersonagens,
    iniciarGrupoPersonagens,
    lerPersonagens,
    obterPersonagens,
    resetPersonagens,
} from './grupo-personagens.js';
import {
    aplicarPendenciasAncora,
    iniciarAncoraEco,
    registrarProvedorAncora,
} from './ancora-eco-ui.js';
import {
    normalizarDivisaoCorrente,
    normalizarGeneroDivisaoCorrente,
    criaCicloCorrente,
} from './correntes-hierarquia.js';
import { criaCicloPeriodo, paisQueNaoContem } from './periodos-historicos-hierarquia.js';
import {
    filhosInvalidosParaOPai,
    paisInvalidosParaOFilho,
} from './periodos-biograficos-hierarquia.js';
import {
    db,
    save,
    adicionarTemaAoAssunto,
    obterOuCriarEpocaPorNome,
    obterOuCriarPeriodoHistoricoPorNome,
    obterGrupoPaiValido,
    nivelGrupo,
    alturaSubarvoreGrupo,
    NIVEL_MAXIMO_GRUPO,
    obterAutorSouEuId,
    calcularImpactoExclusaoPessoa,
    calcularImpactoExclusaoEpoca,
    calcularImpactoExclusaoPeriodoHistorico,
    calcularImpactoExclusaoMovimentoEscola,
    calcularImpactoExclusaoGrupo,
    mesclarPessoas,
    mesclarEpocas,
    mesclarGrupos,
    mesclarPeriodosHistoricos,
    mesclarMovimentosEscolas,
    getEscansaoDoPoema,
    getEstruturaDoPoema,
    deleteItem,
} from './db.js';
import {
    inicializarEstruturaTextual,
    recalcularEstrofesLinhasIgnoradas,
    obterUnidadesAtuais,
    obterEventosAtuais,
    adicionarUnidade,
    adicionarEvento,
    aplicarTemplateNoEstado,
    extrairClassificacaoParaTemplate,
} from './estrutura-textual.js';
import {
    reordenarPosicao,
    fecharEspaco,
    getIrmaosTopoLivro,
    getIrmaosPorEscopo,
    lerDataParcial,
    preencherDataParcial,
    preencherDataParcialSeVazio,
    lerDataParcialMovimento,
    preencherDataParcialMovimento,
    seqOuNull,
    gerarId,
    escapeHtml,
    mostrarAviso,
    mostrarAvisoComAcao,
    abrirModalConfirmacao,
    criarRastreadorDeAlteracoes,
    violaOrdemDeDatas,
    calcularAnoDominioPublico,
    idadeAutor,
    autorGruposComDados,
    correnteGruposComDados,
    signoDoZodiaco,
    obterSugestaoEpocaPorId,
    periodosBiograficosDoItem,
    CORES_GRUPO,
    CORES_GRUPO_PADRAO,
    pontoCorGrupo,
    FORMAS_POEMA,
    REGULARIDADES_METRICAS,
    TAMANHOS_VERSO,
    ESQUEMA_RIMAS_PRESENCA,
    ESQUEMA_RIMAS_PADRAO,
    ORIGENS_TRADICAO_SONORIDADE,
    REGISTROS_SONORIDADE,
    TONS_SONORIDADE,
    calcularOpcoesCascataSonoridade,
    corrigirPresencaRimaSeVersoBranco,
    sugerirOrigemTradicaoPorTamanho,
    avisoMonorrimaAtipica,
    calcularOpcoesPeMetrico,
    calcularTamanhoVersoForcadoPorPe,
    ehGrafiaAntiga,
    chaveTema,
    nomesTemasDoAssunto,
    podarSobrescritasAssunto,
    podarExcecoesAssunto,
    espelhoDeIdiomas,
    normalizarPosturaEstetica,
    normalizarProgramaMovimento,
    periodosHistoricosIdsDoItem,
    formatarIntervaloPeriodoHistorico,
} from './utils.js';
import { normalizarRegiao } from './regiao.js';

// Rastreadores de alterações não salvas dos formulários de texto longo
// (ver toggleModal em modais.js — confirma antes de fechar se sujo).
// Instanciados aqui (não em utils.js) porque quem sabe quando salvar
// terminou — e portanto quando "limpar" — é o submit handler de cada
// formulário, que mora neste módulo.
export const rastreadorPoema = criarRastreadorDeAlteracoes();
export const rastreadorProsa = criarRastreadorDeAlteracoes();
// Livro: serve ao olho do cabeçalho ("Salvar antes de ver?") e, registrado em
// registrarModal (main.js), à confirmação "Alterações não salvas" ao fechar o
// formulário com alteração, como em Poema e Prosa.
export const rastreadorLivro = criarRastreadorDeAlteracoes();
// Parte e Seção: o mesmo papel do rastreador do Livro (olho do cabeçalho e
// confirmação ao fechar com alteração).
export const rastreadorParte = criarRastreadorDeAlteracoes();
export const rastreadorSecao = criarRastreadorDeAlteracoes();
// Elemento: o mesmo papel (olho do cabeçalho e confirmação ao fechar com alteração).
export const rastreadorElemento = criarRastreadorDeAlteracoes();
import { salvarCapa, deletarCapa } from './capas.js';
import { normalizarLinkImagem } from './imagem-link.js';
import {
    camposDaFicha,
    outrasFichasDoLivro,
    sincronizarLivroComFicha,
    sincronizarFichasComLivro,
} from './ficha-catalografica.js';
import { camposDoSumario } from './sumario.js';
import {
    ligarSumarioNoModal,
    lerSumarioDoModal,
    renderSumarioNoModal,
    limparSumarioDoModal,
} from './ui-sumario.js';
import { getColetaneasDeItem } from './coletaneas.js';
import {
    toggleModal,
    garantirModal,
    renderDropdowns,
    sincronizarFiltroDestino,
    prepararNovo,
} from './ui.js';
import {
    atualizarDatalist,
    atualizarDatalistRegiaoPeriodoHistorico,
    preencherPaisPeriodoHistorico,
    lerPaisPeriodoHistorico,
    atualizarDatalistRegiaoOrigemMovimento,
    preencherOpcoesPaiCorrente,
    sincronizarCamposDivisaoCorrente,
    atualizarDatalistsAutor,
    carregarPessoas,
    obterPessoas,
    resetSinalizacoes,
    carregarSinalizacoes,
    resetTemasTexto,
    carregarTemasTexto,
    obterLocaisTexto,
    resetLocaisTexto,
    carregarLocaisTexto,
    obterIdiomasTexto,
    resetIdiomasTexto,
    carregarIdiomasTexto,
    obterJargaoGiriaTexto,
    resetJargaoGiriaTexto,
    carregarJargaoGiriaTexto,
    obterTemasTexto,
    obterAssuntosPendentesTexto,
    obterAssuntosPapelTexto,
    obterAssuntosExcluidosTexto,
    resetPessoas,
    carregarGruposDiretos,
    obterGruposDiretos,
    resetGruposDiretos,
    carregarAutoria,
    obterAutoria,
    resetAutoria,
    carregarEnvios,
    obterEnvios,
    resetEnvios,
    carregarReconhecimentos,
    obterReconhecimentos,
    resetReconhecimentos,
    resetGeneroProsa,
    carregarGeneroProsa,
    carregarNomesLiterariosAutor,
    adicionarNomeLiterarioAutor,
    carregarOcupacoesAutor,
    adicionarOcupacaoAutor,
    carregarCondicoesClinicasAutor,
    adicionarCondicaoClinicaAutor,
    carregarDeficienciasAutor,
    adicionarDeficienciaAutor,
    carregarNeurodivergenciasAutor,
    adicionarNeurodivergenciaAutor,
    carregarInstituicoesAutor,
    adicionarInstituicaoAutor,
    carregarMovimentosEscolasDiretos,
    obterMovimentosEscolasDiretos,
    carregarPeriodosHistoricosDoTexto,
    obterPeriodosHistoricosDoTexto,
    adicionarEpocaRetratadaDoTexto,
    carregarEpocasRetratadasDoTexto,
    obterEpocasRetratadasDoTexto,
    carregarPremiosAutor,
    carregarObrasAutor,
    carregarCirculoLiterarioAutor,
    carregarLinguasEscritaAutor,
    carregarValoresMovimento,
    carregarRegiaoOrigemMovimento,
    carregarRegiaoPeriodoHistorico,
    adicionarRegiaoOrigemMovimento,
    adicionarRegiaoPeriodoHistorico,
    carregarTemasMovimento,
    adicionarTemaAssunto,
    carregarTemasAssunto,
    atualizarDatalistTemasAssunto,
    carregarTecnicasMovimento,
    carregarTiposComposicaoMovimento,
    carregarLemasMovimento,
    carregarManifestosMovimento,
    atualizarDatalistProsa,
    obterIntertextualidade,
    carregarIntertextualidade,
    resetIntertextualidade,
    obterHipertextualidade,
    carregarHipertextualidade,
    resetHipertextualidade,
    obterReferenciasExternas,
    carregarReferenciasExternas,
    resetReferenciasExternas,
    obterAnexos,
    carregarAnexos,
    resetAnexos,
    obterAnotacoes,
    carregarAnotacoes,
    obterElos,
    carregarElos,
    resetElos,
    obterEcos,
    carregarEcos,
    resetEcos,
    repintarEcos,
    renderPainelElosDerivados,
    atualizarFiltroSecoesMigracao,
    renderPainelElosDerivadosProsa,
    obterLojas,
    carregarLojas,
    resetLojas,
    renderAutoclassificacao,
} from './editor.js';
import { carregarFontesCorrente, lerFontesCorrente } from './fontes-corrente-ui.js';
import {
    carregarFontesPeriodoHistorico,
    lerFontesPeriodoHistorico,
} from './fontes-periodo-historico-ui.js';
import {
    renderPessoas,
    renderGrupos,
    renderEpocas,
    renderPeriodosHistoricos,
    renderMovimentosEscolas,
    renderTemas,
    renderMoldes,
} from './render-listas.js';
import {
    construirLinhasIniciais,
    inicializarGradeSonoridade,
    atualizarPeMetricoSonoridade,
    atualizarTamanhoVersoSonoridade,
    obterLinhasSonoridade,
    obterRimasSonoridade,
    obterEcosSonoridade,
    calcularDivergenciaSilabas,
    calcularVersosComDigrafoDividido,
} from './editor-sonoridade.js';
import {
    inicializarGradeMolde,
    atualizarAlvoGradeMolde,
    atualizarPeMetricoGradeMolde,
    atualizarEsquemaRimaGradeMolde,
    obterLinhasMolde,
    obterParesRimaMolde,
    linhasMoldeParaTextoPoema,
    definirCallbackPromocaoMolde,
    definirCallbackAbrirPoema,
} from './editor-molde.js';
import { validarJsonSonoridade } from './importar-sonoridade.js';
import {
    renomearTema,
    podeExcluirTema,
    excluirTemaDoCadastro,
    assuntosDoTema,
    garantirTema,
    mesclarTemas,
    marcarTemasNaoIguais,
    impactoDoTema,
    resumoExclusaoTemasSemTexto,
    excluirTemasSemTexto,
    excluirTodosAssuntos,
} from './temas.js';
import { baixarMolde } from './ui-molde-json.js';

// Lê o par Livro/Seção de texto livre dos campos de Migração (Cortado
// de / Lançado em) — compartilhado por Poema e Prosa (item 4), por isso
// vive no escopo do módulo em vez de dentro de um dos dois onsubmit.
function lerLivroSecao(prefLivro, prefSecao) {
    const livro = document.getElementById(prefLivro)?.value || '';
    const secao = document.getElementById(prefSecao)?.value || '';
    return livro || secao ? { livro, secao } : null;
}

// ─── Preenchimento declarativo de formulário de edição ──────────────
// Substitui a lista repetitiva de "document.getElementById(id).value =
// objeto.campo || ''" que cada editarX (Livro/Parte/Seção/Poema/Prosa/
// Elemento) tinha, uma linha por campo simples do formulário — por um
// mapa campo → input e uma única chamada. Cada entrada do mapa aceita:
//   'input-id'                          → objeto[campo] ?? ''
//   ['input-id', padrao]                → objeto[campo] ?? padrao
//   ['input-id', padrao, transformar]   → transformar(objeto[campo] ?? padrao)
// Checkbox (input.type === 'checkbox') é detectado automaticamente e
// preenchido via .checked em vez de .value. Input ausente no DOM (ex:
// campo condicional) é simplesmente ignorado.
// Fica de fora do mapa qualquer campo composto ou com lógica própria —
// data parcial (preencherDataParcial), vínculo (paiTipo:paiId), select
// múltiplo, tags — que já não se repetia entre os seis, então não
// precisa dessa abstração.
function preencherCampos(objeto, mapa) {
    for (const [campo, spec] of Object.entries(mapa)) {
        const [inputId, padrao = '', transformar] = Array.isArray(spec) ? spec : [spec];
        const el = document.getElementById(inputId);
        if (!el) continue;
        if (el.type === 'checkbox') {
            el.checked = !!objeto[campo];
            continue;
        }
        const valor = objeto[campo] ?? padrao;
        el.value = transformar ? transformar(valor) : valor;
    }
}

// ─── Indicador somente-leitura "Aparece em: Coletânea X › Parte Y" ──
// Usado no modal de Poema e de Prosa. A edição em si (a qual coletânea,
// qual parte, sequência, override) continua só pela aba Coletâneas —
// isso aqui é só pra não esconder do usuário que o vínculo existe.
function renderColetaneasInfo(containerId, refTipo, refId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const lista = getColetaneasDeItem(refTipo, refId);
    el.innerHTML = lista.length
        ? `<div class="text-[11px] bg-indigo-50 dark:bg-indigo-950 border border-indigo-100 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg px-3 py-2 mt-1">
              📚 Aparece em: ${lista.map((c) => `<strong>${escapeHtml(c.coletaneaTitulo)}</strong> › ${escapeHtml(c.parteTitulo)}`).join(' &nbsp;·&nbsp; ')}
           </div>`
        : '';
}

// ─── Livro ───────────────────────────────────────────────────

// Etiquetas do texto (Fase 16): os grupos de Tradição, Estilo, Relação,
// Sensibilidade, Tom, Domínio Imagético e Outros escrevem os nomes
// (separados por vírgula) no hidden `{prefixo}-sinal-{slug}`. Aqui os nomes
// viram ids do cadastro (criando a etiqueta que ainda não existe) e saem os
// sete campos prontos pra gravar. `prefixo` é 'p' (Poema) ou 'pr' (Prosa).
export function etiquetasParaSalvar(prefixo) {
    const campos = {};
    Object.entries(ETIQUETAS_CATEGORIAS).forEach(([categoria, campo]) => {
        const valor = document.getElementById(`${prefixo}-sinal-${categoria}`)?.value || '';
        campos[campo] = resolverEtiquetasEditadas(db, categoria, nomesDeEtiquetasDigitados(valor));
    });
    return campos;
}

// Temas do texto (fase 2): resolve os nomes do grupo "Temas e Assuntos"
// em ids (criando no cadastro o Tema que ainda não existe) e devolve os
// dois campos a gravar — `temas` (fonte da verdade) e o espelho
// `sinalizacoesTema` (ver temas.js).
//
// Papel do Assunto: grava só as sobrescritas (`assuntosPapel`) que ainda se
// aplicam aos Temas do texto; sem sobrescrita, lista vazia (o papel segue
// os Temas). Idem para `assuntosExcluidos` (Assuntos marcados como "não se
// aplica a este texto"). A poda roda depois de resolver os ids, já com o
// cadastro atualizado.
export function temasParaSalvar(tabela) {
    const entradas = obterTemasTexto(tabela);
    const { temas, espelho } = resolverTemasEditados(db, entradas);
    // Ligações Tema → Assunto marcadas no modal: só agora entram no cadastro.
    const ligadas = aplicarAssuntosPendentes(db, entradas, obterAssuntosPendentesTexto(tabela));
    if (ligadas.vinculos) {
        mostrarAviso(
            `Assuntos atualizados: ${ligadas.vinculos} ligaç${ligadas.vinculos !== 1 ? 'ões' : 'ão'} de tema${
                ligadas.criados
                    ? `, ${ligadas.criados} assunto${ligadas.criados !== 1 ? 's novos' : ' novo'}`
                    : ''
            }.`,
            'sucesso',
        );
    }
    const assuntosPapel = podarSobrescritasAssunto(
        entradas,
        obterAssuntosPapelTexto(tabela),
        db.assuntos,
        db.temas,
    );
    const assuntosExcluidos = podarExcecoesAssunto(
        entradas,
        obterAssuntosExcluidosTexto(tabela),
        db.assuntos,
        db.temas,
    );
    return { temas, sinalizacoesTema: espelho, assuntosPapel, assuntosExcluidos };
}

// Locais do texto, lidos do grupo "Região e Idioma" do modal: Territorialidade
// (ids, mais o espelho por nomes que a busca e as exportações leem) e o Local
// onde foi escrito. Nome digitado que ainda não existe vira Local novo aqui,
// ao salvar (sem tipo e sem pai, para organizar na aba Locais).
export function locaisParaSalvar(tabela) {
    return resolverLocaisEditados(db, obterLocaisTexto(tabela));
}

// Idiomas do texto, lidos do grupo "Região e Idioma" do modal: a lista com
// papel e dialetos (fonte da verdade) e o espelho `idioma` (só os nomes,
// Principais primeiro) que a busca, a coluna e as exportações leem.
export function idiomasParaSalvar(tabela) {
    const idiomas = obterIdiomasTexto(tabela);
    return { idiomas, idioma: espelhoDeIdiomas(idiomas) };
}

// Jargão e gíria do texto, lido do grupo "Região e Idioma" do modal: lista de
// textos livres, no nível do texto (fora de `idiomas`). Entra em `dados` por
// espalhamento, como o idioma.
export function jargaoGiriaParaSalvar(tabela) {
    return { jargaoGiria: obterJargaoGiriaTexto(tabela) };
}

// Último envio do formulário de Livro: uma promessa de "salvou?" (true) ou "recusou"
// (false, por data fora de ordem). Salvar é assíncrono (a capa vai pro IndexedDB),
// então o "Salvar e ver" do olho espera por ela. `null` depois de
// `zerarUltimoEnvioLivro()` significa que nenhum envio começou (validação nativa
// do navegador recusou, por exemplo o título vazio).
let envioLivroEmAndamento = null;

export function ultimoEnvioLivro() {
    return envioLivroEmAndamento;
}

export function zerarUltimoEnvioLivro() {
    envioLivroEmAndamento = null;
}

export function initFormLivro() {
    const form = document.getElementById('form-livro');
    if (!form) return;

    rastreadorLivro.observar(form);

    form.onsubmit = (e) => {
        e.preventDefault();
        envioLivroEmAndamento = salvarLivroDoFormulario();
    };
}

// Devolve true quando salvou (e fechou o modal) e false quando recusou.
async function salvarLivroDoFormulario() {
    const id = document.getElementById('l-edit-id').value;
    const imagemUrl = lerLinkImagem('l-imagem-url');
    if (imagemUrl === null) return false;
    const capaFile = document.getElementById('l-capa').files[0];
    const removerCapa = document.getElementById('l-remover-capa').checked;
    const capaAtual = id ? db.livros.find((x) => x.id == id)?.capa : null;
    // "Remover capa" tem prioridade sobre um arquivo eventualmente selecionado —
    // se a pessoa marcou a caixa, a intenção é ficar sem capa, ponto final.
    let capaFinal;
    if (removerCapa) {
        await deletarCapa(capaAtual);
        capaFinal = null;
    } else {
        // salvarCapa retorna o novo ID (e descarta o antigo) se houver arquivo novo,
        // ou null se não houver — nesse caso mantemos o ID já existente.
        const novoCapaId = capaFile ? await salvarCapa(capaFile, capaAtual) : null;
        capaFinal = novoCapaId ?? capaAtual;
    }

    const dataPublicacao = lerDataParcial('l-data');
    const dataUltimaEdicao = lerDataParcial('l-ultima-edicao');
    if (violaOrdemDeDatas(dataPublicacao, dataUltimaEdicao)) {
        mostrarAviso(
            'A Data da Última Edição não pode ser anterior à Data de Primeira Publicação.',
        );
        return false;
    }

    const situacaoDesde = lerDataParcial('l-situacao-desde');
    if (violaOrdemDeDatas(dataPublicacao, situacaoDesde)) {
        mostrarAviso(
            'A data da situação editorial não pode ser anterior à Data de Primeira Publicação.',
        );
        return false;
    }

    const dados = {
        id: id ? parseInt(id) : gerarId(),
        titulo: document.getElementById('l-titulo').value,
        sequencia: seqOuNull(document.getElementById('l-sequencia').value),
        siglaOficial: document.getElementById('l-sigla-oficial').value,
        siglaPessoal: document.getElementById('l-sigla-pessoal').value,
        data: dataPublicacao,
        dataUltimaEdicao,
        tipo: document.getElementById('l-tipo').value,
        fase: document.getElementById('l-fase').value,
        abertura: document.getElementById('l-abertura').value,
        sinopse: document.getElementById('l-sinopse').value,
        capaDesc: document.getElementById('l-capa-desc').value,
        fraseCapa: document.getElementById('l-frase-capa').value,
        orelha1: document.getElementById('l-orelha-1').value,
        orelha2: document.getElementById('l-orelha-2').value,
        contracapa: document.getElementById('l-contracapa').value,
        isbn13: document.getElementById('l-isbn-13').value.trim(),
        isbn10: document.getElementById('l-isbn-10').value.trim(),
        codigoBarrasUrl: document.getElementById('l-codigo-barras').value.trim(),
        pdfUrl: document.getElementById('l-pdf').value.trim(),
        epubUrl: document.getElementById('l-epub').value.trim(),
        fichaCatalograficaUrl: document.getElementById('l-ficha-catalografica').value.trim(),
        certificadoDireitoAutoralUrl: document
            .getElementById('l-certificado-direito-autoral')
            .value.trim(),
        cartaExclusividadeUrl: document.getElementById('l-carta-exclusividade').value.trim(),
        situacaoEditorial: document.getElementById('l-situacao-editorial').value,
        situacaoDesde,
        situacaoNota: document.getElementById('l-situacao-nota').value.trim(),
        lojas: obterLojas(),
        capa: capaFinal,
        imagemUrl,
    };

    const livroAnterior = id ? db.livros.find((x) => x.id == id) : null;
    const posicaoAntiga = livroAnterior?.sequencia ?? null;
    const fichaUrlAnterior = livroAnterior?.fichaCatalograficaUrl ?? '';

    if (id) db.livros[db.livros.findIndex((x) => x.id == id)] = dados;
    else db.livros.push(dados);

    reordenarPosicao(db.livros, dados, dados.sequencia, posicaoAntiga);

    // Link da ficha mudou no livro: as fichas ligadas a ele acompanham.
    sincronizarFichasComLivro(db, dados.id, fichaUrlAnterior, dados.fichaCatalograficaUrl);

    save();
    rastreadorLivro.marcarLimpo();
    resetLojas();
    toggleModal('modal-livro');
    return true;
}

const MAPA_LIVRO = {
    id: 'l-edit-id',
    imagemUrl: 'l-imagem-url',
    titulo: 'l-titulo',
    sequencia: 'l-sequencia',
    siglaOficial: 'l-sigla-oficial',
    siglaPessoal: 'l-sigla-pessoal',
    tipo: ['l-tipo', 'Inéditos'],
    fase: 'l-fase',
    abertura: 'l-abertura',
    sinopse: 'l-sinopse',
    capaDesc: 'l-capa-desc',
    fraseCapa: 'l-frase-capa',
    orelha1: 'l-orelha-1',
    orelha2: 'l-orelha-2',
    contracapa: 'l-contracapa',
    isbn13: 'l-isbn-13',
    isbn10: 'l-isbn-10',
    codigoBarrasUrl: 'l-codigo-barras',
    pdfUrl: 'l-pdf',
    epubUrl: 'l-epub',
    fichaCatalograficaUrl: 'l-ficha-catalografica',
    certificadoDireitoAutoralUrl: 'l-certificado-direito-autoral',
    cartaExclusividadeUrl: 'l-carta-exclusividade',
    // Livro antigo, sem o campo, abre como "Não especificado" ('') — não
    // como "Em circulação": o padrão de livro NOVO vem do `selected` do
    // HTML (form.reset()), e afirmar circulação de um livro que nunca foi
    // classificado seria inventar um dado.
    situacaoEditorial: ['l-situacao-editorial', ''],
    situacaoNota: 'l-situacao-nota',
};

export async function editarLivro(id) {
    const l = db.livros.find((x) => x.id == id);
    if (!l) return;
    await garantirModal('modal-livro');
    renderDropdowns();

    preencherCampos(l, MAPA_LIVRO);
    preencherDataParcial('l-data', l.data);
    preencherDataParcial('l-ultima-edicao', l.dataUltimaEdicao);
    preencherDataParcial('l-situacao-desde', l.situacaoDesde);
    carregarLojas(l.lojas || []);
    document.getElementById('l-remover-capa').checked = false;
    document.getElementById('modal-livro-titulo').innerText = 'Editar Livro';
    // Preencher por código não dispara 'input': o que está no form agora é o estado
    // inicial, não edição (mesma lógica do toggleModal ao abrir Poema e Prosa).
    rastreadorLivro.marcarLimpo();
    // Livro já salvo tem o que ver: mostra o olho do cabeçalho.
    document.getElementById('livro-ver')?.classList.remove('hidden');
    await toggleModal('modal-livro');
}

// ─── Pessoa ──────────────────────────────────────────────────
// Cadastro central: quem a pessoa É (nome + grupos que pertence),
// constante entre poemas. O papel que ela ocupa em CADA texto
// (Retratado(a)/Dedicatário(a)/etc.) não mora aqui — mora em
// item.pessoas, dentro do próprio poema/prosa (ver criarGrupoDePessoas
// em editor.js). Grupo em si vem de um cadastro à parte (ver Grupo,
// abaixo) — aqui só marcamos quais grupos, já existentes, esta pessoa
// pertence, via checkbox (não cria grupo novo por aqui de propósito:
// grupo cadastrável formalmente é o ponto de não hardcodar "Júlias"/
// "Friends" no código-fonte, então criar mora só na aba Grupos).

export function initFormPessoa() {
    const form = document.getElementById('form-pessoa');
    if (!form) return;

    form.onsubmit = (e) => {
        e.preventDefault();
        const id = document.getElementById('ps-edit-id').value;
        const nome = document.getElementById('ps-nome').value.trim();
        const genero = document.getElementById('ps-genero').value.trim();
        const orientacao = document.getElementById('ps-orientacao').value.trim();
        const identidadeCisTrans = document.getElementById('ps-identidade-cis-trans').value;
        const corRaca = document.getElementById('ps-cor-raca').value;
        const grupoIds = Array.from(
            document.querySelectorAll('#ps-grupos-container input[type="checkbox"]:checked'),
        ).map((el) => parseInt(el.value));
        // Autores a quem esta Pessoa está associada — N:N e opcional
        // (pedido do Victor, 27/09/2026: "não ficasse presa a atribuir a
        // apenas um autor"), por isso checkbox e não um <select> único
        // (mesmo raciocínio de Grupos acima, não o de Autor em
        // Grupo/Época, que é obrigatório e de escolha única).
        const autorIds = Array.from(
            document.querySelectorAll('#ps-autores-container input[type="checkbox"]:checked'),
        ).map((el) => parseInt(el.value));

        // Grava os dados do form no cadastro (cria se `id` vazio, atualiza
        // no lugar se não) — usado tanto no caminho normal quanto como
        // primeiro passo de "Mesclar agora" abaixo (o registro precisa
        // existir em `db.pessoas` antes de virar `origemId` de
        // mesclarPessoas, que só opera sobre entradas já cadastradas).
        // `oculto` não tem campo neste form (é ação de lista, ver
        // toggleOcultarPessoa em pessoas-acoes.js) — precisa ser carregado
        // do registro existente aqui, senão salvar o form apagaria o
        // estado de oculto a cada edição (dados abaixo substitui o
        // objeto inteiro).
        const existente = id ? db.pessoas.find((x) => x.id == id) : null;
        const gravar = () => {
            const dados = {
                id: id ? parseInt(id) : gerarId(),
                nome,
                genero,
                orientacao,
                identidadeCisTrans,
                corRaca,
                grupoIds,
                autorIds,
                oculto: existente?.oculto || false,
            };
            if (id) db.pessoas[db.pessoas.findIndex((x) => x.id == id)] = dados;
            else db.pessoas.push(dados);
            return dados.id;
        };

        // Nome duplicado (mesmo critério de dedup exato de
        // obterOuCriarPessoaPorNome/migrarPessoasParaCadastro) — não
        // decide sozinho: pode ser a mesma pessoa cadastrada duas vezes
        // (aí faz sentido mesclar) ou duas pessoas diferentes de
        // propósito, mesmo nome (ex.: grupos diferentes) — aí o Victor
        // quer mesmo os dois registros separados. Motivado por uma
        // pergunta dele sobre o mesmo risco em Época, ver abaixo.
        const duplicata = db.pessoas.find((x) => x.nome === nome && x.id != id);

        if (!duplicata) {
            gravar();
            save();
            toggleModal('modal-pessoa');
            return;
        }

        abrirModalConfirmacao({
            titulo: `Já existe uma Pessoa chamada "${duplicata.nome}"`,
            rotulo: 'Nome duplicado',
            mensagem:
                'Pode ser a mesma pessoa cadastrada duas vezes, ou duas pessoas diferentes de propósito (mesmo nome, grupos diferentes, por exemplo). O que você quer fazer?',
            textoConfirmar: 'Mesclar agora',
            corConfirmar: '#d97706',
            acaoSecundaria: {
                texto: 'Salvar mesmo assim',
                onClick: () => {
                    gravar();
                    save();
                    toggleModal('modal-pessoa');
                },
            },
            onConfirmar: () => {
                const origemId = gravar();
                mesclarPessoas(db, origemId, duplicata.id);
                save();
                toggleModal('modal-pessoa');
                renderPessoas();
                mostrarAviso(`Mesclado com "${duplicata.nome}"`, 'sucesso');
            },
        });
    };
}

export async function editarPessoa(id) {
    const p = db.pessoas.find((x) => x.id == id);
    if (!p) return;
    await garantirModal('modal-pessoa');
    renderDropdowns(); // popula #ps-grupos-container e #ps-autores-container

    document.getElementById('ps-edit-id').value = p.id;
    document.getElementById('ps-nome').value = p.nome;
    document.getElementById('ps-genero').value = p.genero || '';
    document.getElementById('ps-orientacao').value = p.orientacao || '';
    document.getElementById('ps-identidade-cis-trans').value = p.identidadeCisTrans || '';
    document.getElementById('ps-cor-raca').value = p.corRaca || '';
    document.querySelectorAll('#ps-grupos-container input[type="checkbox"]').forEach((el) => {
        el.checked = (p.grupoIds || []).includes(parseInt(el.value));
    });
    document.querySelectorAll('#ps-autores-container input[type="checkbox"]').forEach((el) => {
        el.checked = (p.autorIds || []).includes(parseInt(el.value));
    });
    document.getElementById('modal-pessoa-titulo').innerText = 'Editar Pessoa';
    toggleModal('modal-pessoa');
}

// ─── Grupo ───────────────────────────────────────────────────
// Registro dedicado (não tag livre tipo Sinalizações) justamente pra
// poder criar/editar/renomear formalmente, sem hardcode no código-fonte
// (ver conversa que definiu isso) e sem o risco de divergência que uma
// string solta repetida em cada Pessoa teria.

// Desenha as bolinhas de CORES_GRUPO (fonte única, ver utils.js) e marca
// a selecionada com um anel; clique grava em #g-cor (hidden input) e
// redesenha pra mover o anel. Sem input[type=color] de propósito — a
// paleta é curada (ver CORES_GRUPO em utils.js).
export function renderSeletorCorGrupo(corSelecionada) {
    const container = document.getElementById('g-cor-container');
    if (!container) return;
    container.innerHTML = CORES_GRUPO.map(({ chave, rotulo }) => {
        const selecionada = chave === corSelecionada;
        const anel = selecionada
            ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-slate-900'
            : '';
        return `<button type="button" title="${escapeHtml(rotulo)}" aria-label="${escapeHtml(rotulo)}"
            onclick="selecionarCorGrupo('${chave}')"
            class="w-6 h-6 rounded-full ${pontoCorGrupo(chave)} ${anel}"></button>`;
    }).join('');
}

window.selecionarCorGrupo = (chave) => {
    document.getElementById('g-cor').value = chave;
    renderSeletorCorGrupo(chave);
};

// Popula um <select> de Autor (usado em Grupo e Época, um por modal) com
// todo `db.autores`, ordenado por nome — Autor é escolhido, não digitado
// (cadastro fechado, diferente de Grupo/Época em si). `autorIdSelecionado`
// pode ser `null` (novo registro): nesse caso cai no Autor marcado
// "sou eu" como sugestão inicial (ver obterAutorSouEuId em db.js), sem
// travar a escolha — o placeholder "— Selecione —" segue disponível.
export function renderSelectAutor(selectId, autorIdSelecionado) {
    const select = document.getElementById(selectId);
    if (!select) return;
    const autoresOrdenados = [...db.autores].sort((a, b) => a.nome.localeCompare(b, 'pt-BR'));
    const valor = autorIdSelecionado ?? obterAutorSouEuId(db);
    select.innerHTML =
        '<option value="">— Selecione um Autor —</option>' +
        autoresOrdenados
            .map((a) => `<option value="${a.id}">${escapeHtml(a.nome)}</option>`)
            .join('');
    select.value = valor != null ? String(valor) : '';
}

// Popula o <select> "Grupo pai" (#g-pai) com os grupos do Autor
// selecionado em #g-autor que ainda podem receber filho SEM estourar
// NIVEL_MAXIMO_GRUPO — o que depende não só do nível do próprio
// candidato, mas também de quão funda já é a subárvore do grupo em
// edição (se ele já tem filho/neto, a subárvore inteira desce junto ao
// virar filho de alguém; mesma checagem que obterGrupoPaiValido faz de
// novo no submit, mas filtrar aqui já poupa o usuário de escolher algo
// que ia ser recusado silenciosamente). Chamada ao trocar o Autor
// (onchange no HTML) e ao abrir o modal (novo ou edição).
//
// Níveis separados em <optgroup> (pedido do Victor, 27/09/2026): com o
// teto em 5, uma lista só indentada por "↳" repetido virou difícil de
// escanear — <optgroup label="Nível N"> é nativo do <select>, aparece em
// negrito e não-clicável, e deixa claro de cara em que altura da árvore
// cada opção está. O optgroup por si só não diz a qual RAMO a opção
// pertence (dois grupos de nível 2 podem ter pais nível-1 diferentes),
// então toda opção de nível > 1 ganha o nome do pai imediato entre
// parênteses.
window.atualizarSelectGrupoPai = () => {
    const selectPai = document.getElementById('g-pai');
    if (!selectPai) return;
    const autorId = document.getElementById('g-autor')?.value;
    const idEmEdicao = document.getElementById('g-edit-id')?.value;
    const valorAnterior = selectPai.value;
    if (!autorId) {
        selectPai.innerHTML = '<option value="">— Nenhum (nível 1) —</option>';
        return;
    }
    // Descendentes do grupo em edição (filhos e netos) não podem virar
    // pai dele — geraria ciclo. Sem grupo em edição (cadastro novo) não
    // tem descendente a excluir.
    const descendentes = new Set();
    if (idEmEdicao) {
        const filhos = db.grupos.filter((g) => g.paiId == idEmEdicao).map((g) => g.id);
        filhos.forEach((id) => descendentes.add(id));
        db.grupos.filter((g) => filhos.includes(g.paiId)).forEach((g) => descendentes.add(g.id));
    }
    const gruposDoAutor = db.grupos.filter(
        (g) => g.autorId == autorId && g.id != idEmEdicao && !descendentes.has(g.id),
    );
    // Altura da subárvore do grupo em edição: 0 pra cadastro novo (nada
    // descendo junto). Um candidato só entra se nivelGrupo(candidato) + 1
    // (o próprio grupo em edição) + essa altura ainda couber no teto.
    const alturaEmEdicao = idEmEdicao ? alturaSubarvoreGrupo(db, parseInt(idEmEdicao)) : 0;
    const candidatos = gruposDoAutor
        .filter((g) => nivelGrupo(db, g.id) + 1 + alturaEmEdicao <= NIVEL_MAXIMO_GRUPO)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    const porNivel = new Map();
    candidatos.forEach((g) => {
        const nivel = nivelGrupo(db, g.id);
        if (!porNivel.has(nivel)) porNivel.set(nivel, []);
        porNivel.get(nivel).push(g);
    });

    selectPai.innerHTML =
        '<option value="">— Nenhum (nível 1) —</option>' +
        [...porNivel.keys()]
            .sort((a, b) => a - b)
            .map((nivel) => {
                const opcoes = porNivel
                    .get(nivel)
                    .map((g) => {
                        const pai = db.grupos.find((x) => x.id == g.paiId);
                        const contexto = pai ? ` (dentro de ${escapeHtml(pai.nome)})` : '';
                        return `<option value="${g.id}">${escapeHtml(g.nome)}${contexto}</option>`;
                    })
                    .join('');
                return `<optgroup label="Nível ${nivel}">${opcoes}</optgroup>`;
            })
            .join('');
    // Preserva a escolha se o grupo pai continuar sendo um candidato
    // válido pro Autor atual (ex.: reabrir o mesmo Autor depois de ter
    // trocado e voltado) — senão volta pro "Nenhum".
    if (candidatos.some((g) => g.id == valorAnterior)) selectPai.value = valorAnterior;
};

export function initFormGrupo() {
    const form = document.getElementById('form-grupo');
    if (!form) return;

    form.onsubmit = (e) => {
        e.preventDefault();
        const id = document.getElementById('g-edit-id').value;
        const idFinal = id ? parseInt(id) : gerarId();
        const autorId = parseInt(document.getElementById('g-autor').value) || null;
        if (!autorId) return mostrarAviso('Escolha o Autor deste Grupo.');
        const paiIdBruto = document.getElementById('g-pai').value;
        const paiId = paiIdBruto
            ? obterGrupoPaiValido(db, idFinal, autorId, parseInt(paiIdBruto))
            : null;
        const nome = document.getElementById('g-nome').value.trim();

        // Mesmo raciocínio de initFormEpoca abaixo: grava primeiro, pra
        // existir em `db.grupos` antes de virar `origemId` de
        // mesclarGrupos se for esse o caminho escolhido.
        // `oculto` idem ao mesmo campo em initFormPessoa acima — carregado
        // do registro existente, não tem campo neste form.
        const existente = id ? db.grupos.find((x) => x.id == id) : null;
        const gravar = () => {
            const dados = {
                id: idFinal,
                nome,
                cor: document.getElementById('g-cor').value || CORES_GRUPO_PADRAO,
                autorId,
                paiId,
                oculto: existente?.oculto || false,
            };
            if (id) db.grupos[db.grupos.findIndex((x) => x.id == id)] = dados;
            else db.grupos.push(dados);
            return dados.id;
        };

        // Nome duplicado DENTRO DO MESMO AUTOR (dedup por (nome, autorId)
        // desde 27/09/2026 — mesmo critério de obterOuCriarGrupoPorNome/
        // migrarGruposAutorId; nomes iguais em Autores diferentes não são
        // duplicata, ver mesclarGrupos em db.js).
        const duplicata = db.grupos.find(
            (x) => x.nome === nome && x.autorId == autorId && x.id != idFinal,
        );

        if (!duplicata) {
            gravar();
            save();
            toggleModal('modal-grupo');
            return;
        }

        abrirModalConfirmacao({
            titulo: `Já existe um Grupo chamado "${duplicata.nome}" para este Autor`,
            rotulo: 'Nome duplicado',
            mensagem:
                'Pode ser o mesmo Grupo cadastrado duas vezes, ou dois Grupos diferentes de propósito, mesmo nome. O que você quer fazer?',
            textoConfirmar: 'Mesclar agora',
            corConfirmar: '#d97706',
            acaoSecundaria: {
                texto: 'Salvar mesmo assim',
                onClick: () => {
                    gravar();
                    save();
                    toggleModal('modal-grupo');
                },
            },
            onConfirmar: () => {
                const origemId = gravar();
                mesclarGrupos(db, origemId, duplicata.id);
                save();
                toggleModal('modal-grupo');
                renderGrupos();
                mostrarAviso(`Mesclado com "${duplicata.nome}"`, 'sucesso');
            },
        });
    };
}

export async function editarGrupo(id) {
    const g = db.grupos.find((x) => x.id == id);
    if (!g) return;
    await garantirModal('modal-grupo');
    document.getElementById('g-edit-id').value = g.id;
    document.getElementById('g-nome').value = g.nome;
    document.getElementById('g-cor').value = g.cor || CORES_GRUPO_PADRAO;
    renderSeletorCorGrupo(g.cor || CORES_GRUPO_PADRAO);
    renderSelectAutor('g-autor', g.autorId);
    window.atualizarSelectGrupoPai();
    document.getElementById('g-pai').value = g.paiId != null ? String(g.paiId) : '';
    document.getElementById('modal-grupo-titulo').innerText = 'Editar Grupo';
    toggleModal('modal-grupo');
}

// Lê o campo "Link da imagem" de um modal: '' se vazio, o link limpo se for
// http/https, ou null (com aviso) se for outro texto. Quem salva deve parar
// no null ANTES de gravar ou apagar qualquer imagem. Ver imagem-link.js.
export function lerLinkImagem(idCampo) {
    const link = normalizarLinkImagem(document.getElementById(idCampo)?.value);
    if (link === null) mostrarAviso('O link da imagem precisa começar com http:// ou https://.');
    return link;
}

// ─── Autor ───────────────────────────────────────────────────
// Cadastro central (db.autores: { id, nome, sobre }), à parte do de
// Pessoas — quem tem responsabilidade autoral sobre um texto (ver
// migrarAutoria em db.js e AUTORIA_PAPEIS em utils.js). Sem grupos:
// diferente de Pessoa, Autor não tem uma taxonomia própria pra
// agrupar — só nome e uma nota livre ("sobre").

export function initFormAutor() {
    const form = document.getElementById('form-autor');
    if (!form) return;

    form.onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('au-edit-id').value;

        const imagemUrl = normalizarLinkImagem(document.getElementById('au-imagem-url').value);
        if (imagemUrl === null) {
            return mostrarAviso('O link da imagem precisa começar com http:// ou https://.');
        }

        const nascimento = lerDataParcial('au-nasc');
        const obito = lerDataParcial('au-obito');
        if (violaOrdemDeDatas(nascimento, obito)) {
            return mostrarAviso('O Óbito não pode ser anterior ao Nascimento.');
        }

        // Imagem do Autor: mesmo ciclo das capas (IndexedDB, ver capas.js).
        // "Remover" tem prioridade sobre um arquivo eventualmente escolhido.
        const imagemFile = document.getElementById('au-imagem').files[0];
        const removerImagem = document.getElementById('au-remover-imagem').checked;
        const imagemAtual = id ? db.autores.find((x) => x.id == id)?.imagem : null;
        let imagemFinal;
        if (removerImagem) {
            await deletarCapa(imagemAtual);
            imagemFinal = null;
        } else {
            const novaImagemId = imagemFile ? await salvarCapa(imagemFile, imagemAtual) : null;
            imagemFinal = novaImagemId ?? imagemAtual ?? null;
        }

        const dados = {
            id: id ? parseInt(id) : gerarId(),
            nome: document.getElementById('au-nome').value.trim(),
            imagem: imagemFinal,
            imagemUrl,
            isni: document.getElementById('au-isni').value.trim(),
            nomesLiterarios: JSON.parse(
                document.getElementById('au-nomes-literarios').value || '[]',
            ),
            souEu: !!document.getElementById('au-sou-eu')?.checked,
            nacionalidade: document.getElementById('au-nacionalidade').value.trim(),
            sexo: document.getElementById('au-sexo').value,
            corRaca: document.getElementById('au-cor-raca').value,
            genero: document.getElementById('au-genero').value.trim(),
            orientacaoSexual: document.getElementById('au-orientacao-sexual').value.trim(),
            identidadeCisTrans: document.getElementById('au-identidade-cis-trans').value,
            religiao: document.getElementById('au-religiao').value.trim(),
            classeSocial: document.getElementById('au-classe-social').value,
            neurodivergencias: document.getElementById('au-neurodivergencias').value.trim(),
            condicoesClinicas: JSON.parse(
                document.getElementById('au-condicoes-clinicas').value || '[]',
            ),
            deficiencias: JSON.parse(document.getElementById('au-deficiencias').value || '[]'),
            grauAcademico: document.getElementById('au-grau-academico').value.trim(),
            instituicoes: document.getElementById('au-instituicoes').value.trim(),
            ocupacoes: document.getElementById('au-ocupacoes').value.trim(),
            nascimento,
            obito,
            movimentosEscolasIds: obterMovimentosEscolasDiretos('autores'),
            premios: JSON.parse(document.getElementById('au-premios').value || '[]'),
            obras: JSON.parse(document.getElementById('au-obras').value || '[]'),
            circulo: JSON.parse(document.getElementById('au-circulo').value || '[]'),
            linguasEscrita: JSON.parse(document.getElementById('au-linguas-escrita').value || '[]'),
            sobre: document.getElementById('au-sobre').value.trim(),
        };

        if (id) db.autores[db.autores.findIndex((x) => x.id == id)] = dados;
        else db.autores.push(dados);

        save();
        toggleModal('modal-autor');
    };

    // Recalcula "domínio público desde" ao vivo conforme o Óbito é
    // editado (mesmo espírito informativo do card em renderAutores, ver
    // render-listas.js) — não bloqueia nada, só atualiza o texto de apoio.
    ['au-obito-dia', 'au-obito-mes', 'au-obito-ano'].forEach((id) => {
        document.getElementById(id)?.addEventListener('input', atualizarDominioPublicoAutorForm);
    });

    // Idade/Signo do zodíaco: idem, mas reagem tanto ao Nascimento
    // (os dois dependem dele) quanto ao Óbito (só a Idade — signo é
    // fixo, não muda com a morte).
    [
        'au-nasc-dia',
        'au-nasc-mes',
        'au-nasc-ano',
        'au-obito-dia',
        'au-obito-mes',
        'au-obito-ano',
    ].forEach((id) => {
        document.getElementById(id)?.addEventListener('input', atualizarIdadeSignoAutorForm);
    });

    // Enter no input de Nome Literário — mesmo padrão do campo de
    // Gênero (Prosa, ver initEditorProsa em editor.js).
    document.getElementById('au-nome-literario-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            adicionarNomeLiterarioAutor();
        }
    });

    // Enter no input de Ocupações — mesmo padrão acima.
    document.getElementById('au-ocupacao-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            adicionarOcupacaoAutor();
        }
    });

    // Enter nos inputs de Neurodivergência, Condições Clínicas,
    // Deficiências e Instituições Frequentadas — mesmo padrão acima.
    [
        ['au-neurodivergencia-input', adicionarNeurodivergenciaAutor],
        ['au-condicao-clinica-input', adicionarCondicaoClinicaAutor],
        ['au-deficiencia-input', adicionarDeficienciaAutor],
        ['au-instituicao-input', adicionarInstituicaoAutor],
    ].forEach(([inputId, adicionar]) => {
        document.getElementById(inputId)?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                adicionar();
            }
        });
    });
}

function atualizarDominioPublicoAutorForm() {
    const el = document.getElementById('au-dominio-publico');
    if (!el) return;
    const ano = calcularAnoDominioPublico(lerDataParcial('au-obito'));
    if (ano) {
        el.textContent = `Domínio público desde ${ano} (estimativa informativa, não substitui orientação jurídica).`;
        el.classList.remove('hidden');
    } else {
        el.classList.add('hidden');
    }
}

// Idade/Signo — prévia ao vivo, mesmo espírito de
// atualizarDominioPublicoAutorForm acima. Os dois são só leitura (não
// existe input pra eles): quem quiser corrigi-los, corrige o
// Nascimento/Óbito, que é a fonte real do dado (ver idadeAutor/
// signoDoZodiaco em utils.js).
function atualizarIdadeSignoAutorForm() {
    const el = document.getElementById('au-idade-signo');
    if (!el) return;
    const nascimento = lerDataParcial('au-nasc');
    const obito = lerDataParcial('au-obito');
    const idade = idadeAutor({ nascimento, obito });
    const signo = signoDoZodiaco(nascimento);

    const partes = [];
    if (idade)
        partes.push(
            `${idade.aproximada ? '≈ ' : ''}${idade.anos} anos${obito?.ano ? ' (à época do óbito)' : ''}`,
        );
    if (signo) partes.push(signo);

    if (partes.length) {
        el.textContent = partes.join(' · ');
        el.classList.remove('hidden');
    } else {
        el.classList.add('hidden');
    }
}

export async function editarAutor(id) {
    const a = db.autores.find((x) => x.id == id);
    if (!a) return;
    await garantirModal('modal-autor');
    // Modal carregado sob demanda: o refresh inicial não alcançou os datalists.
    renderDropdowns();
    atualizarDatalistsAutor();
    document.getElementById('au-edit-id').value = a.id;
    document.getElementById('au-nome').value = a.nome;
    document.getElementById('au-isni').value = a.isni || '';
    document.getElementById('au-imagem').value = '';
    document.getElementById('au-remover-imagem').checked = false;
    document.getElementById('au-imagem-url').value = a.imagemUrl || '';
    carregarNomesLiterariosAutor(a.nomesLiterarios || []);
    const souEuEl = document.getElementById('au-sou-eu');
    if (souEuEl) souEuEl.checked = !!a.souEu;
    document.getElementById('au-nacionalidade').value = a.nacionalidade || '';
    document.getElementById('au-sexo').value = a.sexo || '';
    document.getElementById('au-cor-raca').value = a.corRaca || '';
    document.getElementById('au-genero').value = a.genero || '';
    document.getElementById('au-orientacao-sexual').value = a.orientacaoSexual || '';
    document.getElementById('au-identidade-cis-trans').value = a.identidadeCisTrans || '';
    document.getElementById('au-religiao').value = a.religiao || '';
    document.getElementById('au-classe-social').value = a.classeSocial || '';
    carregarNeurodivergenciasAutor(a.neurodivergencias || '');
    carregarCondicoesClinicasAutor(a.condicoesClinicas || []);
    carregarDeficienciasAutor(a.deficiencias || []);
    // Grau acadêmico é select fechado; valor fora da lista (dado da época
    // em que o campo era texto livre) ganha uma opção provisória em vez
    // de sumir silenciosamente no próximo salvamento.
    const grauEl = document.getElementById('au-grau-academico');
    grauEl.querySelector('option[data-legado]')?.remove();
    if (a.grauAcademico && !Array.from(grauEl.options).some((o) => o.value === a.grauAcademico)) {
        const legado = document.createElement('option');
        legado.value = a.grauAcademico;
        legado.textContent = `${a.grauAcademico} (fora da lista)`;
        legado.dataset.legado = 'true';
        grauEl.appendChild(legado);
    }
    grauEl.value = a.grauAcademico || '';
    carregarInstituicoesAutor(a.instituicoes || '');
    carregarOcupacoesAutor(a.ocupacoes || '');
    preencherDataParcial('au-nasc', a.nascimento);
    preencherDataParcial('au-obito', a.obito);
    carregarMovimentosEscolasDiretos('autores', a.movimentosEscolasIds || []);
    carregarPremiosAutor(a.premios || []);
    carregarObrasAutor(a.obras || []);
    carregarCirculoLiterarioAutor(a.circulo || []);
    carregarLinguasEscritaAutor(a.linguasEscrita || []);
    document.getElementById('au-sobre').value = a.sobre || '';
    // Grupos colapsáveis: abre só os que já têm algo preenchido.
    const gruposComDados = autorGruposComDados(a);
    document.querySelectorAll('#modal-autor details[data-grupo-autor]').forEach((d) => {
        d.open = !!gruposComDados[d.dataset.grupoAutor];
    });
    atualizarDominioPublicoAutorForm();
    atualizarIdadeSignoAutorForm();
    document.getElementById('modal-autor-titulo').innerText = 'Editar Autor';
    toggleModal('modal-autor');
}

// ─── Época ───────────────────────────────────────────────────
// Cadastro central (db.epocas: { id, nome, notas }),
// item 3 do plano de schema — a que período um poema se refere (ver
// migrarEpocas em db.js). Mesmo espírito de Autor acima: sem grupos,
// só um cadastro simples referenciado por epocaId. O modal de Poema
// não abre este modal diretamente — resolve/cria por nome no submit
// (ver obterOuCriarEpocaPorNome em db.js); este modal serve pra edição
// posterior (notas) e exclusão, na aba de gestão.

// "Em andamento" (Período Biográfico, Período Histórico, Corrente): sem data de
// fim, a duração conta até hoje. Com o "Até" preenchido a marca não faz sentido;
// o formulário avisa em vez de gravar os dois.
const AVISO_EM_ANDAMENTO_COM_FIM =
    'Este período tem data em "Até". Apague o "Até" ou desmarque "Em andamento".';
const fimPreenchido = (fim) => ['dia', 'mes', 'ano', 'decada', 'seculo'].some((k) => fim?.[k]);
const lerEmAndamento = (id) => !!document.getElementById(id)?.checked;
// "Em aberto" é só outro rótulo do mesmo marcador (a duração também conta até
// hoje): guardado em `emAberto: true`, que só vale junto com `emAndamento`.
const lerEmAberto = (id) => document.getElementById(`${id}-rotulo`)?.value === 'aberto';
const sincronizarRotuloSemFim = (id) => {
    const caixa = document.getElementById(id);
    const rotulo = document.getElementById(`${id}-rotulo`);
    if (caixa && rotulo) rotulo.disabled = !caixa.checked;
};
const marcarEmAndamento = (id, valor, emAberto = false) => {
    const el = document.getElementById(id);
    if (el) el.checked = !!valor;
    const rotulo = document.getElementById(`${id}-rotulo`);
    if (rotulo) rotulo.value = valor && emAberto ? 'aberto' : '';
    sincronizarRotuloSemFim(id);
};
if (typeof document !== 'undefined') {
    document.addEventListener('change', (e) => {
        const id = e.target?.id;
        if (id && id.endsWith('-em-andamento')) sincronizarRotuloSemFim(id);
    });
}

const quandoDoPeriodo = (p) => {
    const t = formatarIntervaloPeriodoHistorico(p);
    return t === '—' ? '' : ` (${t})`;
};

// Frase de cada pai que não serve ao período `filho` (ver
// paisInvalidosParaOFilho). `filho` traz `nome`, `inicio` e `fim` avulsos.
function frasesDePaisInvalidos(filho, invalidos) {
    const nomeFilho = filho.nome ? `"${filho.nome}"` : 'Este período';
    return invalidos.map(({ paiId, motivo }) => {
        const pai = db.epocas.find((x) => x.id == paiId);
        const nomePai = `"${pai?.nome}"${quandoDoPeriodo(pai)}`;
        if (motivo === 'autor') {
            return `${nomePai} é de outro autor: um período só pode fazer parte de períodos do mesmo autor.`;
        }
        const como =
            motivo === 'depois'
                ? `começa depois do fim de ${nomePai}`
                : `termina antes do começo de ${nomePai}`;
        return `${nomeFilho}${quandoDoPeriodo(filho)} ${como}. Quem faz parte de um período precisa se sobrepor a ele no tempo.`;
    });
}

// Frase dos períodos de dentro que deixariam de caber em `pai` com as datas ou
// o autor novos (ver filhosInvalidosParaOPai).
function fraseDeFilhosInvalidos(pai, invalidos) {
    const itens = invalidos.map(({ filhoId, motivo }) => {
        const filho = db.epocas.find((x) => x.id == filhoId);
        const quando = {
            autor: 'é de outro autor',
            depois: 'começaria depois do fim',
            antes: 'terminaria antes do começo',
        }[motivo];
        return `"${filho?.nome}"${quandoDoPeriodo(filho)} ${quando}`;
    });
    const nomePai = pai.nome ? `"${pai.nome}"` : 'deste período';
    return `Essa mudança deixaria períodos de dentro de ${nomePai} fora dele: ${itens.join('; ')}. Ajuste os dados ou tire esses períodos daqui antes.`;
}

// Mensagem do primeiro problema de "Faz parte de" ao salvar, ou null se está
// tudo certo. `dados` é o que o modal vai gravar.
export function validarHierarquiaDaEpoca(dados) {
    if (dados.id && criaCicloPeriodo(db.epocas, dados.id, dados.pertenceA)) {
        return 'Um período não pode fazer parte de si mesmo nem de um período que está dentro dele.';
    }
    const paisRuins = paisInvalidosParaOFilho(db.epocas, dados, dados.pertenceA);
    if (paisRuins.length) return frasesDePaisInvalidos(dados, paisRuins).join(' ');
    if (dados.id) {
        const filhosRuins = filhosInvalidosParaOPai(db.epocas, dados.id, dados);
        if (filhosRuins.length) return fraseDeFilhosInvalidos(dados, filhosRuins);
    }
    return null;
}

export function initFormEpoca() {
    const form = document.getElementById('form-epoca');
    if (!form) return;

    form.onsubmit = (e) => {
        e.preventDefault();
        const id = document.getElementById('ep-edit-id').value;
        const nome = document.getElementById('ep-nome').value.trim();
        const notas = document.getElementById('ep-notas').value.trim();
        // Bloco 3: Esfera, Categoria, Pessoas envolvidas e Relações.
        const { esferas, categorias, pessoasEnvolvidas, relacoes, pertenceA } =
            lerCamposPeriodoBiografico();
        const autorId = parseInt(document.getElementById('ep-autor').value) || null;
        if (!autorId) return mostrarAviso('Escolha o Autor deste Período Biográfico.');
        // Datas oficiais do cadastro (independentes das de epocaRetratada
        // por texto — ver migrarDatasEpoca em db.js). Mesma leitura parcial
        // e mesma validação de ordem do Período Histórico.
        const inicio = lerDataParcial('ep-ini');
        const fim = lerDataParcial('ep-fim');
        if (violaOrdemDeDatas(inicio, fim)) {
            return mostrarAviso('O "Até" não pode ser anterior ao "De".');
        }
        const emAndamento = lerEmAndamento('ep-em-andamento');
        if (emAndamento && fimPreenchido(fim)) return mostrarAviso(AVISO_EM_ANDAMENTO_COM_FIM);
        // F14-D3: só é gravado quando marcado, como `emAndamento`.
        const evento = !!document.getElementById('ep-evento')?.checked;

        // "Faz parte de": sem ciclo, mesmo autor e datas que se sobrepõem às
        // do pai; e, ao editar, os períodos de dentro precisam continuar
        // cabendo neste (datas e autor novos).
        const erroHierarquia = validarHierarquiaDaEpoca({
            id: id ? parseInt(id) : null,
            nome,
            autorId,
            inicio,
            fim,
            pertenceA,
        });
        if (erroHierarquia) return mostrarAviso(erroHierarquia);

        // Mesmo raciocínio de initFormPessoa acima: grava primeiro (cria
        // se `id` vazio, atualiza no lugar se não), pra existir em
        // `db.epocas` antes de virar `origemId` de mesclarEpocas se for
        // esse o caminho escolhido.
        const gravar = () => {
            const dados = {
                // Mantém qualquer campo que este formulário não edita.
                ...(id ? db.epocas.find((x) => x.id == id) : null),
                id: id ? parseInt(id) : gerarId(),
                nome,
                notas,
                autorId,
                inicio,
                fim,
                esferas,
                categorias,
                pessoasEnvolvidas,
                relacoes,
                pertenceA,
            };
            if (emAndamento) dados.emAndamento = true;
            else delete dados.emAndamento;
            if (emAndamento && lerEmAberto('ep-em-andamento')) dados.emAberto = true;
            else delete dados.emAberto;
            if (evento) dados.evento = true;
            else delete dados.evento;
            if (id) db.epocas[db.epocas.findIndex((x) => x.id == id)] = dados;
            else db.epocas.push(dados);
            // Esfera ou Vínculo digitado que ainda não estava na lista entra nela.
            registrarValoresNovos(db, dados);
            return dados.id;
        };

        // Nome duplicado DENTRO DO MESMO AUTOR (dedup por (nome, autorId)
        // desde 27/09/2026 — mesmo critério de obterOuCriarEpocaPorNome/
        // migrarEpocasAutorId; nomes iguais em Autores diferentes não são
        // duplicata).
        const duplicata = db.epocas.find(
            (x) => x.nome === nome && x.autorId == autorId && x.id != id,
        );

        if (!duplicata) {
            gravar();
            save();
            toggleModal('modal-epoca');
            return;
        }

        abrirModalConfirmacao({
            titulo: `Já existe uma Época chamada "${duplicata.nome}" para este Autor`,
            rotulo: 'Nome duplicado',
            mensagem:
                'Pode ser a mesma Época cadastrada duas vezes, ou duas Épocas diferentes de propósito, mesmo nome (ex.: o relacionamento mudou, mas o período ganhou o mesmo apelido). O que você quer fazer?',
            textoConfirmar: 'Mesclar agora',
            corConfirmar: '#d97706',
            acaoSecundaria: {
                texto: 'Salvar mesmo assim',
                onClick: () => {
                    gravar();
                    save();
                    toggleModal('modal-epoca');
                },
            },
            onConfirmar: () => {
                const origemId = gravar();
                mesclarEpocas(db, origemId, duplicata.id);
                save();
                toggleModal('modal-epoca');
                renderEpocas();
                mostrarAviso(`Mesclado com "${duplicata.nome}"`, 'sucesso');
            },
        });
    };
}

export async function editarEpoca(id) {
    const ep = db.epocas.find((x) => x.id == id);
    if (!ep) return;
    await garantirModal('modal-epoca');
    document.getElementById('ep-edit-id').value = ep.id;
    document.getElementById('ep-nome').value = ep.nome;
    document.getElementById('ep-notas').value = ep.notas || '';
    preencherDataParcial('ep-ini', ep.inicio);
    preencherDataParcial('ep-fim', ep.fim);
    marcarEmAndamento('ep-em-andamento', ep.emAndamento, ep.emAberto);
    const caixaEventoEp = document.getElementById('ep-evento');
    if (caixaEventoEp) caixaEventoEp.checked = ep.evento === true;
    renderSelectAutor('ep-autor', ep.autorId);
    preencherCamposPeriodoBiografico(ep);
    document.getElementById('modal-epoca-titulo').innerText = 'Editar Período Biográfico';
    toggleModal('modal-epoca');
}

// Bloco 2e: itens do campo (id ou { novo: 'Nome' }) -> lista de ids sem
// repetir. Período novo é criado no cadastro agora, ao salvar o texto.
function periodosHistoricosDosItens(itens) {
    const ids = (itens || []).map((i) =>
        i && typeof i === 'object'
            ? obterOuCriarPeriodoHistoricoPorNome(i.novo, { evento: i.evento === true })?.id
            : i,
    );
    return periodosHistoricosIdsDoItem({ periodosHistoricosIds: ids });
}

// ─── Período Histórico ──────────────────────────────────────────
// Mesmo espírito de Época acima, mas cadastro mais simples (só
// nome/notas, sem contextoRelacao) e vínculo mais simples também:
// `periodosHistoricosIds` é um campo solto (lista) no Poema/Prosa (não um
// sub-objeto com datas/recorte, como epocaRetratada) — ver
// calcularImpactoExclusaoPeriodoHistorico em db.js. O modal de
// Poema/Prosa resolve/cria por nome no submit (ver
// obterOuCriarPeriodoHistoricoPorNome em db.js); este modal serve pra
// edição posterior e exclusão, na aba de gestão.

// Data do período com a marca "c." (circa). O número continua exato; `aprox`
// é uma marca da data. Sempre gravada (true ou false) quando há data, para a
// migração dos itens de fábrica saber que a pessoa já decidiu. Sem data, a
// marca não tem onde ficar.
function lerDataPeriodoHistorico(prefixo) {
    const data = lerDataParcial(prefixo);
    if (!data) return null;
    return { ...data, aprox: Boolean(document.getElementById(`${prefixo}-aprox`)?.checked) };
}

function preencherDataPeriodoHistorico(prefixo, dataObj) {
    preencherDataParcial(prefixo, dataObj);
    const marca = document.getElementById(`${prefixo}-aprox`);
    if (marca) marca.checked = Boolean(dataObj?.aprox);
}

export function initFormPeriodoHistorico() {
    const form = document.getElementById('form-periodo-historico');
    if (!form) return;

    // O modal é carregado sob demanda: o datalist só existe agora, então o
    // refresh do carregamento inicial (atualizarDatalist) não o alcançou.
    atualizarDatalistRegiaoPeriodoHistorico();

    // Enter no campo de região acrescenta o lugar (não envia o formulário).
    document.getElementById('ph-regiao-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            adicionarRegiaoPeriodoHistorico();
        }
    });

    form.onsubmit = (e) => {
        e.preventDefault();
        const id = document.getElementById('ph-edit-id').value;
        const nome = document.getElementById('ph-nome').value.trim();
        const notas = document.getElementById('ph-notas').value.trim();
        // Texto que ficou digitado e não virou chip entra como lugar (sem isso
        // salvar com o campo ainda preenchido perderia o lugar).
        adicionarRegiaoPeriodoHistorico();
        const regiao = normalizarRegiao(
            JSON.parse(document.getElementById('ph-regiao').value || '[]'),
        );
        // Data do período em si (não do texto que o referencia — ver
        // migrarDatasPeriodoHistorico em db.js). Mesma leitura parcial
        // (dia/mês/ano cada um opcional) e mesma validação de ordem já
        // usadas pra Data de Escrita/Publicação e pro De/Até de Época.
        const inicio = lerDataPeriodoHistorico('ph-ini');
        const fim = lerDataPeriodoHistorico('ph-fim');

        if (violaOrdemDeDatas(inicio, fim)) {
            return mostrarAviso('O "Até" não pode ser anterior ao "De".');
        }
        const emAndamento = lerEmAndamento('ph-em-andamento');
        if (emAndamento && fimPreenchido(fim)) return mostrarAviso(AVISO_EM_ANDAMENTO_COM_FIM);
        // F14-D3: só é gravado quando marcado, como `emAndamento`.
        const evento = !!document.getElementById('ph-evento')?.checked;

        // Períodos pais (o primeiro é o principal). O seletor já não oferece o
        // próprio período nem os de dentro dele; esta checagem é a rede de
        // segurança caso o estado do modal fique defasado.
        const pertenceA = lerPaisPeriodoHistorico();
        const fontes = lerFontesPeriodoHistorico();
        const { esferas, categorias } = lerCamposPeriodoHistorico();
        if (id && criaCicloPeriodo(db.periodosHistoricos, parseInt(id), pertenceA)) {
            return mostrarAviso(
                'Um período não pode pertencer a si mesmo nem a um período que está dentro dele.',
            );
        }

        // Datas fora do intervalo do pai: avisa depois de salvar, sem bloquear
        // (o recorte do texto muitas vezes é aproximado).
        const foraDoPai = paisQueNaoContem(db.periodosHistoricos, { inicio, fim }, pertenceA);
        const avisarForaDoPai = () => {
            if (!foraDoPai.length) return;
            const nomes = foraDoPai
                .map((pid) => db.periodosHistoricos.find((x) => x.id == pid)?.nome)
                .filter(Boolean)
                .map((n) => `"${n}"`)
                .join(', ');
            mostrarAviso(`Salvo, mas as datas saem do intervalo de ${nomes}.`, 'info');
        };

        const gravar = () => {
            const dados = {
                id: id ? parseInt(id) : gerarId(),
                nome,
                notas,
                regiao,
                inicio,
                fim,
                pertenceA,
                fontes,
                esferas,
                categorias,
            };
            if (emAndamento) dados.emAndamento = true;
            if (emAndamento && lerEmAberto('ph-em-andamento')) dados.emAberto = true;
            else delete dados.emAberto;
            if (evento) dados.evento = true;
            if (id) {
                // Preserva `embutido` (item de fábrica editado continua de
                // fábrica) — o objeto novo substitui o antigo por inteiro.
                const idx = db.periodosHistoricos.findIndex((x) => x.id == id);
                if (db.periodosHistoricos[idx]?.embutido) dados.embutido = true;
                db.periodosHistoricos[idx] = dados;
            } else db.periodosHistoricos.push(dados);
            // Esfera ou Categoria nova digitada entra no vocabulário.
            registrarValoresNovosPeriodoHistorico(db, dados);
            return dados.id;
        };

        // Mesmo critério de dedup exato de
        // obterOuCriarPeriodoHistoricoPorNome/migração — mesma pergunta
        // de Época acima: pode ser o mesmo Período Histórico cadastrado
        // duas vezes, ou dois períodos diferentes de propósito com o
        // mesmo nome.
        const duplicata = db.periodosHistoricos.find((x) => x.nome === nome && x.id != id);

        if (!duplicata) {
            gravar();
            save();
            toggleModal('modal-periodo-historico');
            avisarForaDoPai();
            return;
        }

        abrirModalConfirmacao({
            titulo: `Já existe um Período Histórico chamado "${duplicata.nome}"`,
            rotulo: 'Nome duplicado',
            mensagem:
                'Pode ser o mesmo Período Histórico cadastrado duas vezes, ou dois períodos diferentes de propósito, mesmo nome. O que você quer fazer?',
            textoConfirmar: 'Mesclar agora',
            corConfirmar: '#d97706',
            acaoSecundaria: {
                texto: 'Salvar mesmo assim',
                onClick: () => {
                    gravar();
                    save();
                    toggleModal('modal-periodo-historico');
                    avisarForaDoPai();
                },
            },
            onConfirmar: () => {
                const origemId = gravar();
                mesclarPeriodosHistoricos(db, origemId, duplicata.id);
                save();
                toggleModal('modal-periodo-historico');
                renderPeriodosHistoricos();
                mostrarAviso(`Mesclado com "${duplicata.nome}"`, 'sucesso');
            },
        });
    };
}

export async function editarPeriodoHistorico(id) {
    const ph = db.periodosHistoricos.find((x) => x.id == id);
    if (!ph) return;
    await garantirModal('modal-periodo-historico');
    document.getElementById('ph-edit-id').value = ph.id;
    document.getElementById('ph-nome').value = ph.nome;
    document.getElementById('ph-notas').value = ph.notas || '';
    carregarRegiaoPeriodoHistorico(ph.regiao);
    atualizarDatalistRegiaoPeriodoHistorico();
    preencherDataPeriodoHistorico('ph-ini', ph.inicio);
    preencherDataPeriodoHistorico('ph-fim', ph.fim);
    marcarEmAndamento('ph-em-andamento', ph.emAndamento, ph.emAberto);
    const caixaEventoPh = document.getElementById('ph-evento');
    if (caixaEventoPh) caixaEventoPh.checked = ph.evento === true;
    preencherPaisPeriodoHistorico(ph.id, ph.pertenceA || []);
    carregarFontesPeriodoHistorico(ph.fontes || []);
    preencherCamposPeriodoHistorico(ph);
    document.getElementById('modal-periodo-historico-titulo').innerText =
        'Editar Período Histórico';
    toggleModal('modal-periodo-historico');
}

// ─── Movimento/Escola ────────────────────────────────────────────
// Cadastro central (db.movimentosEscolas), mais rico que Período
// Histórico: além de nome/notas/data (aqui com século/década, ver
// lerDataParcialMovimento em utils.js), carrega Tipo, Região de
// origem e os 6 campos de tag livre (Valores/Temas/Técnicas/Tipos de
// Composição/Lemas/Manifestos — cada um com estado próprio em
// editor.js, lido/gravado via hidden input JSON, mesmo padrão de
// condicoesClinicas/deficiencias do Autor). O vínculo com Poema/
// Prosa/Autor é N:N dos dois lados (`movimentosEscolasIds`, array em
// cada um) — resolvido/criado por nome direto no submit de cada um
// desses três modais (ver criarGrupoDeMovimentosEscolas em
// editor.js), não aqui; este modal serve pra edição posterior
// (completar os campos além do nome) e exclusão/mesclagem, na aba de
// gestão.

export function initFormMovimentoEscola() {
    const form = document.getElementById('form-movimento-escola');
    if (!form) return;

    document.getElementById('me-pai')?.addEventListener('change', sincronizarCamposDivisaoCorrente);

    // Enter no campo de região acrescenta o lugar (não envia o formulário).
    document.getElementById('me-regiao-origem-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            adicionarRegiaoOrigemMovimento();
        }
    });

    form.onsubmit = (e) => {
        e.preventDefault();
        const id = document.getElementById('me-edit-id').value;
        const nome = document.getElementById('me-nome').value.trim();
        const notas = document.getElementById('me-notas').value.trim();
        const tipo = document.getElementById('me-tipo').value;
        const posturaEstetica = normalizarPosturaEstetica(
            document.getElementById('me-postura-estetica').value,
        );
        const programa = normalizarProgramaMovimento(document.getElementById('me-programa').value);
        const paiValor = document.getElementById('me-pai').value;
        const paiId = paiValor ? Number(paiValor) : null;
        const divisao =
            paiId == null
                ? ''
                : normalizarDivisaoCorrente(document.getElementById('me-divisao').value);
        const generoDivisao =
            paiId == null
                ? ''
                : normalizarGeneroDivisaoCorrente(
                      document.getElementById('me-genero-divisao').value,
                  );
        adicionarRegiaoOrigemMovimento();
        const regiaoOrigem = normalizarRegiao(
            JSON.parse(document.getElementById('me-regiao-origem').value || '[]'),
        );
        const inicio = lerDataParcialMovimento('me-ini');
        const fim = lerDataParcialMovimento('me-fim');

        if (violaOrdemDeDatas(inicio, fim)) {
            return mostrarAviso('O "Até" não pode ser anterior ao "De".');
        }
        const emAndamento = lerEmAndamento('me-em-andamento');
        if (emAndamento && fimPreenchido(fim)) return mostrarAviso(AVISO_EM_ANDAMENTO_COM_FIM);

        if (id && criaCicloCorrente(db.movimentosEscolas, Number(id), paiId)) {
            return mostrarAviso(
                'Uma corrente não pode fazer parte de si mesma nem de uma das suas divisões.',
            );
        }

        const valores = JSON.parse(document.getElementById('me-valores').value || '[]');
        const temas = JSON.parse(document.getElementById('me-temas').value || '[]');
        const tecnicas = JSON.parse(document.getElementById('me-tecnicas').value || '[]');
        const tiposComposicao = JSON.parse(
            document.getElementById('me-tipos-composicao').value || '[]',
        );
        const lemas = JSON.parse(document.getElementById('me-lemas').value || '[]');
        const manifestos = JSON.parse(document.getElementById('me-manifestos').value || '[]');
        const fontes = lerFontesCorrente();

        const gravar = () => {
            // Parte do registro existente: salvar não pode perder campo que o
            // modal não edita (`embutido`, por exemplo).
            const existente = id ? db.movimentosEscolas.find((x) => x.id == id) : null;
            const dados = {
                ...existente,
                id: id ? parseInt(id) : gerarId(),
                nome,
                notas,
                inicio,
                fim,
                tipo,
                posturaEstetica,
                programa,
                paiId,
                divisao,
                generoDivisao,
                regiaoOrigem,
                valores,
                temas,
                tecnicas,
                tiposComposicao,
                lemas,
                manifestos,
                fontes,
            };
            if (emAndamento) dados.emAndamento = true;
            else delete dados.emAndamento;
            if (emAndamento && lerEmAberto('me-em-andamento')) dados.emAberto = true;
            else delete dados.emAberto;
            if (id) db.movimentosEscolas[db.movimentosEscolas.findIndex((x) => x.id == id)] = dados;
            else db.movimentosEscolas.push(dados);
            return dados.id;
        };

        // Mesmo critério de dedup exato de
        // obterOuCriarMovimentoEscolaPorNome/migração — mesma pergunta
        // de Período Histórico acima.
        const duplicata = db.movimentosEscolas.find((x) => x.nome === nome && x.id != id);

        if (!duplicata) {
            gravar();
            save();
            toggleModal('modal-movimento-escola');
            return;
        }

        abrirModalConfirmacao({
            titulo: `Já existe uma corrente literária chamada "${duplicata.nome}"`,
            rotulo: 'Nome duplicado',
            mensagem:
                'Pode ser a mesma corrente literária cadastrada duas vezes, ou duas correntes diferentes de propósito, com o mesmo nome. O que você quer fazer?',
            textoConfirmar: 'Mesclar agora',
            corConfirmar: '#d97706',
            acaoSecundaria: {
                texto: 'Salvar mesmo assim',
                onClick: () => {
                    gravar();
                    save();
                    toggleModal('modal-movimento-escola');
                },
            },
            onConfirmar: () => {
                const origemId = gravar();
                mesclarMovimentosEscolas(db, origemId, duplicata.id);
                save();
                toggleModal('modal-movimento-escola');
                renderMovimentosEscolas();
                mostrarAviso(`Mesclado com "${duplicata.nome}"`, 'sucesso');
            },
        });
    };
}

export async function editarMovimentoEscola(id) {
    const m = db.movimentosEscolas.find((x) => x.id == id);
    if (!m) return;
    await garantirModal('modal-movimento-escola');
    // Modal carregado sob demanda: o refresh inicial não alcançou o datalist.
    atualizarDatalistRegiaoOrigemMovimento();
    document.getElementById('me-edit-id').value = m.id;
    document.getElementById('me-nome').value = m.nome;
    document.getElementById('me-notas').value = m.notas || '';
    document.getElementById('me-tipo').value = m.tipo || '';
    document.getElementById('me-postura-estetica').value = normalizarPosturaEstetica(
        m.posturaEstetica,
    );
    document.getElementById('me-programa').value = normalizarProgramaMovimento(m.programa);
    preencherOpcoesPaiCorrente(m.id, m.paiId);
    document.getElementById('me-divisao').value = normalizarDivisaoCorrente(m.divisao);
    document.getElementById('me-genero-divisao').value = normalizarGeneroDivisaoCorrente(
        m.generoDivisao,
    );
    carregarRegiaoOrigemMovimento(m.regiaoOrigem);
    preencherDataParcialMovimento('me-ini', m.inicio);
    preencherDataParcialMovimento('me-fim', m.fim);
    marcarEmAndamento('me-em-andamento', m.emAndamento, m.emAberto);
    carregarValoresMovimento(m.valores || []);
    carregarTemasMovimento(m.temas || []);
    carregarTecnicasMovimento(m.tecnicas || []);
    carregarTiposComposicaoMovimento(m.tiposComposicao || []);
    carregarLemasMovimento(m.lemas || []);
    carregarManifestosMovimento(m.manifestos || []);
    carregarFontesCorrente(m.fontes || []);
    // Grupos colapsáveis: abre só os que já têm algo preenchido.
    const gruposComDados = correnteGruposComDados(m);
    document
        .querySelectorAll('#modal-movimento-escola details[data-grupo-corrente]')
        .forEach((d) => {
            d.open = !!gruposComDados[d.dataset.grupoCorrente];
        });
    document.getElementById('modal-movimento-escola-titulo').innerText =
        'Editar Corrente literária';
    toggleModal('modal-movimento-escola');
}

// ─── Assunto ─────────────────────────────────────────────────────
// Cadastro central (db.assuntos) que agrupa Temas — um Tema pode estar
// em vários Assuntos (ver o bloco de Assuntos em utils.js). Nenhum texto
// guarda o Assunto: ele é derivado dos Temas do texto, então salvar,
// editar ou excluir um Assunto nunca mexe em Poema/Prosa. Sem mesclar
// (diferente de Pessoa/Época): dois Assuntos com o mesmo nome não fazem
// sentido, então o nome duplicado é recusado em vez de oferecer mescla.

export function initFormAssunto() {
    const form = document.getElementById('form-assunto');
    if (!form) return;

    // Modal carregado sob demanda: o datalist só existe agora.
    atualizarDatalistTemasAssunto();

    // Enter no input de Tema adiciona o chip (sem enviar o formulário) —
    // mesmo padrão dos chips do modal de Autor.
    document.getElementById('as-tema-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            adicionarTemaAssunto();
        }
    });

    form.onsubmit = (e) => {
        e.preventDefault();
        const id = document.getElementById('as-edit-id').value;
        const nome = document.getElementById('as-nome').value.trim();
        const notas = document.getElementById('as-notas').value.trim();
        // Um tema digitado e ainda não confirmado com "+"/Enter entra
        // junto — senão o texto some em silêncio ao salvar.
        adicionarTemaAssunto();
        let temas;
        try {
            temas = JSON.parse(document.getElementById('as-temas').value || '[]');
        } catch {
            temas = [];
        }

        if (!nome) return mostrarAviso('Dê um nome ao assunto.');
        const duplicata = db.assuntos.find(
            (x) => chaveTema(x.nome) === chaveTema(nome) && x.id != id,
        );
        if (duplicata) {
            return mostrarAviso(`Já existe um Assunto chamado "${duplicata.nome}".`);
        }

        // O Assunto guarda ids: cada nome digitado vira o id do Tema do
        // cadastro (criado aqui se ainda não existe).
        const temaIds = [];
        temas.forEach((nomeTema) => {
            const temaId = garantirTema(db, nomeTema);
            if (temaId != null && !temaIds.includes(temaId)) temaIds.push(temaId);
        });
        const dados = { id: id ? parseInt(id) : gerarId(), nome, notas, temaIds };
        if (id) {
            const idx = db.assuntos.findIndex((x) => x.id == id);
            if (idx !== -1) db.assuntos[idx] = dados;
            else db.assuntos.push(dados);
        } else db.assuntos.push(dados);
        save();
        toggleModal('modal-assunto');
    };
}

// ─── Tema (cadastro central — ver temas.js) ─────────────────────
export function initFormTema() {
    const form = document.getElementById('form-tema');
    if (!form) return;

    form.onsubmit = (e) => {
        e.preventDefault();
        const id = document.getElementById('te-edit-id').value;
        const nome = document.getElementById('te-nome').value.trim();
        const notas = document.getElementById('te-notas').value.trim();
        if (!nome) return mostrarAviso('Dê um nome ao tema.');

        if (id) {
            const tema = db.temas.find((t) => t.id == id);
            if (!tema) return;
            const r = renomearTema(db, id, nome);
            if (!r.ok) {
                return mostrarAviso(
                    r.motivo === 'duplicado'
                        ? `Já existe um Tema chamado "${r.existente.nome}". Para juntar os dois, use Mesclar no cartão do tema.`
                        : 'Não foi possível renomear o tema.',
                );
            }
            tema.notas = notas;
            if (r.textos > 0) {
                mostrarAviso(
                    `Tema renomeado em ${r.textos} texto${r.textos !== 1 ? 's' : ''}.`,
                    'sucesso',
                );
            }
        } else {
            const duplicata = db.temas.find((t) => chaveTema(t.nome) === chaveTema(nome));
            if (duplicata) return mostrarAviso(`Já existe um Tema chamado "${duplicata.nome}".`);
            db.temas.push({ id: gerarId(), nome, notas });
        }
        save();
        toggleModal('modal-tema');
    };
}

export async function editarTema(id) {
    const tema = db.temas.find((t) => t.id == id);
    if (!tema) return;
    await garantirModal('modal-tema');
    document.getElementById('te-edit-id').value = tema.id;
    document.getElementById('te-nome').value = tema.nome;
    document.getElementById('te-notas').value = tema.notas || '';
    document.getElementById('modal-tema-titulo').innerText = 'Editar Tema';
    toggleModal('modal-tema');
}

// Exclui do cadastro só Tema que nenhum texto usa (ver podeExcluirTema);
// com texto, avisa quantos e não faz nada. "Desfazer" devolve o registro
// (com as notas) e o nome às listas dos Assuntos de onde saiu.
export function excluirTema(id) {
    const tema = db.temas.find((t) => t.id == id);
    if (!tema) return;
    const pode = podeExcluirTema(db, id);
    if (!pode.ok) {
        return mostrarAviso(
            `"${tema.nome}" está em ${pode.textos} texto${pode.textos !== 1 ? 's' : ''}. Tire o tema dos textos (ou renomeie) antes de excluir.`,
        );
    }
    const assuntoIds = assuntosDoTema(db, tema.nome).map((a) => a.id);
    const { removido } = excluirTemaDoCadastro(db, id);
    save();
    mostrarAvisoComAcao(`Tema "${removido.nome}" excluído`, 'Desfazer', () => {
        db.temas.push(removido);
        assuntoIds.forEach((aid) => adicionarTemaAoAssunto(db, aid, removido.id));
        save();
    });
}

// "Excluir temas sem texto" (aba Temas): tira do cadastro todo Tema que
// nenhum texto usa e mantém os que estão em uso. Confirma antes, dizendo
// quantos saem e quantos ficam; "Desfazer" devolve tudo (notas e lugar nos
// Assuntos incluídos). Nunca mexe nos textos.
export function excluirTemasSemTextoComConfirmacao() {
    const { excluir, manter } = resumoExclusaoTemasSemTexto(db);
    if (excluir === 0) {
        return mostrarAviso(
            manter === 0
                ? 'Não há temas cadastrados.'
                : 'Todos os temas estão em uso em algum texto, então nenhum foi excluído.',
        );
    }
    const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
    const ficam =
        manter > 0
            ? ` ${plural(manter, 'tema fica', 'temas ficam')}, porque algum texto o${manter === 1 ? '' : 's'} usa.`
            : '';
    abrirModalConfirmacao({
        titulo: `Excluir ${plural(excluir, 'tema sem texto', 'temas sem texto')}?`,
        rotulo: 'Temas',
        mensagem: `Nenhum texto usa ${excluir === 1 ? 'este tema' : 'estes temas'}, então nenhum texto é alterado.${ficam} Você terá alguns segundos para desfazer.`,
        textoConfirmar: 'Excluir',
        corConfirmar: '#dc2626',
        onConfirmar: () => {
            const r = excluirTemasSemTexto(db);
            if (!r.excluidos) return;
            save();
            mostrarAvisoComAcao(
                `${plural(r.excluidos, 'tema excluído', 'temas excluídos')}`,
                'Desfazer',
                () => {
                    r.desfazer();
                    save();
                },
            );
        },
    });
}

// "Excluir todos os assuntos" (aba Assuntos): esvazia o cadastro de
// Assuntos. Nenhum texto e nenhum Tema é alterado (os Temas só passam a
// ficar sem assunto). "Desfazer" devolve todos.
export function excluirTodosAssuntosComConfirmacao() {
    const total = (db.assuntos || []).length;
    if (total === 0) return mostrarAviso('Não há assuntos cadastrados.');
    const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
    abrirModalConfirmacao({
        titulo: `Excluir ${total === 1 ? 'o único assunto' : `todos os ${total} assuntos`}?`,
        rotulo: 'Assuntos',
        mensagem: `Os temas e os textos não são alterados: o assunto de um texto é sempre derivado dos temas dele. Você terá alguns segundos para desfazer.`,
        textoConfirmar: 'Excluir',
        corConfirmar: '#dc2626',
        onConfirmar: () => {
            const r = excluirTodosAssuntos(db);
            if (!r.excluidos) return;
            save();
            mostrarAvisoComAcao(
                plural(r.excluidos, 'assunto excluído', 'assuntos excluídos'),
                'Desfazer',
                () => {
                    r.desfazer();
                    save();
                },
            );
        },
    });
}

export async function editarAssunto(id) {
    const as = db.assuntos.find((x) => x.id == id);
    if (!as) return;
    await garantirModal('modal-assunto');
    document.getElementById('as-edit-id').value = as.id;
    document.getElementById('as-nome').value = as.nome;
    document.getElementById('as-notas').value = as.notas || '';
    carregarTemasAssunto(nomesTemasDoAssunto(as, db.temas));
    atualizarDatalistTemasAssunto();
    document.getElementById('modal-assunto-titulo').innerText = 'Editar Assunto';
    toggleModal('modal-assunto');
}

// "Atribuir a um Assunto" do painel "Temas sem Assunto": acrescenta o
// Tema ao Assunto escolhido, sem abrir o modal — pensado pra classificar
// dezenas de temas soltos de uma vez. Devolve true se acrescentou.
export function atribuirTemaAAssunto(nomeTema, assuntoId) {
    const tema = db.temas.find((t) => chaveTema(t.nome) === chaveTema(nomeTema));
    if (!tema || !adicionarTemaAoAssunto(db, assuntoId, tema.id)) return false;
    save();
    return true;
}

// Handler do select do painel (onchange inline, gerado em
// renderTemasSemAssunto): lê o tema do data-tema e o Assunto do valor.
// O save() re-renderiza a lista (evento db:saved), então o tema sai do
// painel e aparece no card do Assunto.
export function atribuirTemaDoPainel(select) {
    const assuntoId = Number(select.value);
    const tema = select.dataset.tema;
    if (!assuntoId || !tema) return;
    const assunto = db.assuntos.find((a) => a.id == assuntoId);
    if (atribuirTemaAAssunto(tema, assuntoId)) {
        mostrarAviso(`"${tema}" agora está em "${assunto.nome}".`, 'sucesso');
    } else {
        select.value = '';
    }
}

// ─── Mesclar (Pessoa/Época/Período Histórico) ───────────────────
// Modal genérico (modal-mesclar.html), reaproveitado pelas duas abas de
// gestão que têm o mesmo risco de duplicata por nome — renomear uma
// Pessoa/Época pra igual a outra não mescla nada sozinho (ver
// mesclarPessoas/mesclarEpocas em db.js pra detalhe da mecânica e da
// conversa que motivou isso). `RENDER_MESCLAR` isola a única parte que
// muda entre os dois tipos (rótulo, como calcular impacto, qual função
// de mesclagem chamar, qual lista re-renderizar depois) — o fluxo do
// modal em si (abrir, escolher destino, confirmar, executar) é idêntico.
const RENDER_MESCLAR = {
    pessoas: {
        rotulo: 'Pessoa',
        impacto: (id) => calcularImpactoExclusaoPessoa(db, id),
        mesclar: (origemId, destinoId) => mesclarPessoas(db, origemId, destinoId),
        rerender: renderPessoas,
    },
    grupos: {
        rotulo: 'Grupo',
        impacto: (id) => calcularImpactoExclusaoGrupo(db, id),
        mesclar: (origemId, destinoId) => mesclarGrupos(db, origemId, destinoId),
        rerender: renderGrupos,
    },
    epocas: {
        rotulo: 'Período Biográfico',
        impacto: (id) => calcularImpactoExclusaoEpoca(db, id),
        mesclar: (origemId, destinoId) => mesclarEpocas(db, origemId, destinoId),
        rerender: renderEpocas,
    },
    periodosHistoricos: {
        rotulo: 'Período Histórico',
        impacto: (id) => calcularImpactoExclusaoPeriodoHistorico(db, id),
        mesclar: (origemId, destinoId) => mesclarPeriodosHistoricos(db, origemId, destinoId),
        rerender: renderPeriodosHistoricos,
    },
    movimentosEscolas: {
        rotulo: 'Corrente literária',
        impacto: (id) => calcularImpactoExclusaoMovimentoEscola(db, id),
        mesclar: (origemId, destinoId) => mesclarMovimentosEscolas(db, origemId, destinoId),
        rerender: renderMovimentosEscolas,
    },
    // Tema: além dos textos, a mesclagem passa os Assuntos do Tema de
    // origem para o de destino (ver mesclarTemas em temas.js).
    temas: {
        rotulo: 'Tema',
        desfazivel: true,
        impacto: (id) => impactoDoTema(db, id),
        mesclar: (origemId, destinoId) => mesclarTemas(db, origemId, destinoId),
        rerender: renderTemas,
    },
    // Etiqueta: só se mescla dentro da mesma categoria (ver
    // abrirModalMesclar e mesclarEtiquetas em etiquetas.js).
    etiquetas: {
        rotulo: 'Etiqueta',
        desfazivel: true,
        impacto: (id) => impactoDaEtiqueta(db, id),
        mesclar: (origemId, destinoId) => mesclarEtiquetas(db, origemId, destinoId),
        rerender: renderEtiquetas,
    },
    // Local: textos (citados e local de escrita) e locais filhos passam ao
    // destino; o destino nunca pode ser quem pertence à origem (ver
    // destinosDeMesclagemDeLocal e mesclarLocais em locais.js).
    locais: {
        rotulo: 'Local',
        desfazivel: true,
        impacto: (id) => impactoDoLocal(db, id),
        mesclar: (origemId, destinoId) => mesclarLocais(db, origemId, destinoId),
        rerender: renderLocais,
    },
};

export function initFormMesclar() {
    const form = document.getElementById('form-mesclar');
    if (!form) return;

    form.onsubmit = (e) => {
        e.preventDefault();
        const tipo = document.getElementById('ms-tipo').value;
        const origemId = parseInt(document.getElementById('ms-origem-id').value);
        const destinoId = parseInt(document.getElementById('ms-destino-id').value);
        const cfg = RENDER_MESCLAR[tipo];
        if (!cfg || !destinoId) return;

        const origem = db[tipo].find((x) => x.id == origemId);
        const destino = db[tipo].find((x) => x.id == destinoId);
        if (!origem || !destino) return;

        // `impacto` devolve poemasIds/prosasIds sempre, e autoresIds só
        // no caso de Movimento/Escola (relação N:N dos dois lados — ver
        // calcularImpactoExclusaoMovimentoEscola em db.js). Soma tudo
        // pra decidir se há impacto; a frase discrimina autor(es) à
        // parte de texto(s) só quando existir, pra não dizer "autor" pra
        // quem mescla Pessoa/Época/Período Histórico (que nunca tem
        // autoresIds).
        const impacto = cfg.impacto(origemId);
        const autoresCount = impacto.autoresIds?.length || 0;
        const pessoasCount = impacto.pessoasIds?.length || 0;
        const assuntosCount = impacto.assuntosIds?.length || 0;
        const textosCount = impacto.poemasIds.length + impacto.prosasIds.length;
        const total = autoresCount + pessoasCount + textosCount + assuntosCount;
        const partes = [];
        if (autoresCount) partes.push(`${autoresCount} autor${autoresCount !== 1 ? 'es' : ''}`);
        if (pessoasCount) partes.push(`${pessoasCount} pessoa${pessoasCount !== 1 ? 's' : ''}`);
        if (textosCount) partes.push(`${textosCount} texto${textosCount !== 1 ? 's' : ''}`);
        if (assuntosCount) {
            partes.push(`${assuntosCount} assunto${assuntosCount !== 1 ? 's' : ''}`);
        }
        const resumoImpacto = partes.join(' e ');
        // Períodos que estão dentro da origem (só Período Histórico): passam
        // a ficar dentro do destino. Não entram na conta de "textos".
        const filhosCount = impacto.filhosIds?.length || 0;
        const avisoFilhos = filhosCount
            ? ` ${filhosCount} período${filhosCount !== 1 ? 's' : ''} dentro dele ${filhosCount !== 1 ? 'passam' : 'passa'} a ficar em "${destino.nome}".`
            : '';

        // Fecha o modal de escolha antes de abrir o de confirmação — os
        // dois usam a mesma tecla Esc/foco-trap (ver modais.js), então
        // empilhar os dois ao mesmo tempo confundiria qual fecha primeiro.
        toggleModal('modal-mesclar');
        const aviso = cfg.desfazivel
            ? 'Você terá alguns segundos para desfazer.'
            : 'Essa ação não pode ser desfeita.';
        abrirModalConfirmacao({
            titulo: `${origem.nome} → ${destino.nome}`,
            rotulo: `Mesclar ${cfg.rotulo}`,
            mensagem:
                total > 0
                    ? `${resumoImpacto} que ${total !== 1 ? 'referenciam' : 'referencia'} "${origem.nome}" ${total !== 1 ? 'passam' : 'passa'} a referenciar "${destino.nome}".${avisoFilhos} "${origem.nome}" será removido(a) do cadastro. ${aviso}`
                    : `"${origem.nome}" será removido(a) do cadastro.${avisoFilhos} ${aviso}`,
            textoConfirmar: 'Mesclar',
            corConfirmar: '#d97706',
            onConfirmar: () => {
                const r = cfg.mesclar(origemId, destinoId);
                save();
                cfg.rerender();
                if (typeof r?.desfazer === 'function') {
                    mostrarAvisoComAcao(
                        `Mesclado: "${origem.nome}" → "${destino.nome}"`,
                        'Desfazer',
                        () => {
                            r.desfazer();
                            save();
                            cfg.rerender();
                        },
                    );
                    return;
                }
                mostrarAviso(`Mesclado: "${origem.nome}" → "${destino.nome}"`, 'sucesso');
            },
        });
    };
}

// Painel "Possíveis duplicatas" (aba Temas): junta `removerId` em
// `manterId` pelo mesmo caminho da mesclagem comum, com confirmação que diz
// o impacto e Desfazer.
export function mesclarDuplicataComConfirmacao(manterId, removerId) {
    const manter = (db.temas || []).find((t) => t.id == manterId);
    const remover = (db.temas || []).find((t) => t.id == removerId);
    if (!manter || !remover) return;
    const impacto = impactoDoTema(db, removerId);
    const textos = impacto.poemasIds.length + impacto.prosasIds.length;
    const assuntos = impacto.assuntosIds?.length || 0;
    const partes = [];
    if (textos) partes.push(`${textos} texto${textos !== 1 ? 's' : ''}`);
    if (assuntos) partes.push(`${assuntos} assunto${assuntos !== 1 ? 's' : ''}`);
    const total = textos + assuntos;
    const impactoTexto =
        total > 0
            ? `${partes.join(' e ')} que ${total !== 1 ? 'referenciam' : 'referencia'} "${remover.nome}" ${total !== 1 ? 'passam' : 'passa'} a referenciar "${manter.nome}". `
            : '';
    abrirModalConfirmacao({
        titulo: `${remover.nome} → ${manter.nome}`,
        rotulo: 'Mesclar Tema',
        mensagem: `${impactoTexto}"${remover.nome}" será removido do cadastro. Você terá alguns segundos para desfazer.`,
        textoConfirmar: 'Mesclar',
        corConfirmar: '#d97706',
        onConfirmar: () => {
            const r = mesclarTemas(db, removerId, manterId);
            if (!r.ok) return;
            save();
            renderTemas();
            mostrarAvisoComAcao(
                `Mesclado: "${remover.nome}" → "${manter.nome}"`,
                'Desfazer',
                () => {
                    r.desfazer();
                    save();
                    renderTemas();
                },
            );
        },
    });
}

// "Não são iguais": o par deixa de ser sugerido. Desfazer traz de volta.
export function marcarNaoIguaisComAviso(idA, idB) {
    const r = marcarTemasNaoIguais(db, idA, idB);
    if (!r.ok) return;
    save();
    renderTemas();
    mostrarAvisoComAcao('Par marcado como diferente', 'Desfazer', () => {
        r.desfazer();
        save();
        renderTemas();
    });
}

// ─── Sonoridade (Escansão) ──────────────────────────────────────
// Bloco 1 (dados + tabela) e Bloco 2 completo — a grade em si (grade
// silábica, Modo Sílaba Tônica, Mapeamento de Rimas) mora em
// js/editor-sonoridade.js; este arquivo só decide QUANDO carregá-la
// (carregarGradeSonoridade) e lê o resultado final na hora de salvar
// (obterLinhasSonoridade/obterRimasSonoridade).
function popularSelectOpcoes(id, opcoes, valorAtual = '') {
    const sel = document.getElementById(id);
    if (!sel) return;
    const placeholder = sel.options[0]; // "-- Não classificado --" / "-- Presença --" etc.
    sel.innerHTML = '';
    sel.appendChild(placeholder);
    opcoes.forEach((op) => {
        const opt = document.createElement('option');
        opt.value = op;
        opt.textContent = op;
        sel.appendChild(opt);
    });
    // Se o valor atual não está (mais) na lista — típico de repopular
    // com uma lista filtrada pela cascata do Bloco 3 depois de trocar
    // formaPoema — cai pro placeholder em vez de deixar o <select>
    // sem nenhuma opção selecionada (valor "fantasma").
    sel.value = valorAtual && opcoes.includes(valorAtual) ? valorAtual : '';
}

// Bloco 3 (Matriz de Validação em Cascata) — relê os 3 campos que
// disparam restrição (formaPoema/regularidadeMetrica/
// esquemaRimasPresenca já escolhidos) e repopula os 5 selects em
// cascata com a lista filtrada de calcularOpcoesCascataSonoridade,
// preservando o valor de cada um se ele ainda for válido (senão volta
// pro placeholder — ver popularSelectOpcoes). Chamada tanto ao abrir o
// modal (popularCamposSonoridade, pra uma escansão já salva abrir já
// filtrada) quanto a cada troca de formaPoema/regularidadeMetrica/
// esquemaRimasPresenca (ver initFormSonoridade).
function aplicarCascataSonoridade() {
    const formaPoema = document.getElementById('son-forma-poema')?.value || '';
    const regularidadeMetrica = document.getElementById('son-regularidade-metrica')?.value || '';
    const esquemaRimasPresenca = document.getElementById('son-esquema-rimas-presenca')?.value || '';

    const opcoes = calcularOpcoesCascataSonoridade({
        formaPoema,
        regularidadeMetrica,
        esquemaRimasPresenca,
    });

    popularSelectOpcoes(
        'son-regularidade-metrica',
        opcoes.regularidadeMetrica,
        regularidadeMetrica,
    );
    popularSelectOpcoes(
        'son-tamanho-verso',
        opcoes.tamanhoVerso,
        document.getElementById('son-tamanho-verso')?.value,
    );
    popularSelectOpcoes(
        'son-esquema-rimas-presenca',
        opcoes.esquemaRimasPresenca,
        esquemaRimasPresenca,
    );
    popularSelectOpcoes(
        'son-esquema-rimas-padrao',
        opcoes.esquemaRimasPadrao,
        document.getElementById('son-esquema-rimas-padrao')?.value,
    );
    popularSelectOpcoes(
        'son-origem-tradicao',
        opcoes.origemTradicao,
        document.getElementById('son-origem-tradicao')?.value,
    );

    // Pé Métrico trava nos dois sentidos com Tamanho do Verso (ver
    // calcularOpcoesPeMetrico/calcularTamanhoVersoForcadoPorPe em
    // utils.js) — essa é a metade "Tamanho manda no Pé": sempre que a
    // cascata acima roda (troca de Forma/Regularidade), recalcula as
    // opções de Pé Métrico a partir do Tamanho do Verso já resolvido
    // (popularSelectOpcoes já limpa o valor se ele deixou de ser válido).
    // A outra metade ("Pé manda no Tamanho") mora no listener de
    // son-pe-metrico, em initFormSonoridade.
    popularSelectOpcoes(
        'son-pe-metrico',
        calcularOpcoesPeMetrico(document.getElementById('son-tamanho-verso')?.value || ''),
        document.getElementById('son-pe-metrico')?.value,
    );
}

// junto com um aviso (não bloqueante) se o poema escolhido já tiver
// uma escansão cadastrada (edição em cima dela substitui; cadastro novo
// nesse poema criaria uma segunda, o que getEscansaoDoPoema não prevê
// — ver comentário em db.js: no máximo uma por poema).
function popularSelectPoemasSonoridade(poemaIdAtual = '') {
    const sel = document.getElementById('son-poema-id');
    if (!sel) return;
    const ordenados = [...db.poemas].sort((a, b) =>
        (a.titulo || '').localeCompare(b.titulo || '', 'pt-BR'),
    );
    sel.innerHTML = '<option value="">-- Escolha um poema --</option>';
    ordenados.forEach((p) => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.titulo || `#${p.id}`;
        sel.appendChild(opt);
    });
    sel.value = poemaIdAtual || '';
}

function atualizarAvisoPoemaSonoridade() {
    const sel = document.getElementById('son-poema-id');
    const aviso = document.getElementById('son-poema-aviso');
    const idEmEdicao = document.getElementById('son-edit-id')?.value;
    if (!sel || !aviso) return;
    const existente = sel.value ? getEscansaoDoPoema(parseInt(sel.value)) : null;
    if (existente && String(existente.id) !== String(idEmEdicao)) {
        aviso.textContent =
            'Esse poema já tem uma escansão cadastrada — salvar aqui substitui a existente.';
        aviso.classList.remove('hidden');
    } else {
        aviso.classList.add('hidden');
    }
}

// Mesmo padrão de atualizarAvisoPoemaSonoridade, pra fonteTexto.grafia
// (ver utils.js): a grade abaixo divide sílabas por regras atuais, então
// qualquer grafia antiga marcada (etimológica, quinhentista...) faz a
// contagem/tônica saírem erradas em silêncio. Não bloqueia nem corrige
// nada — só avisa, como o resto dos avisos da Sonoridade. Dispara pra
// QUALQUER valor não vazio E diferente de GRAFIA_ATUAL (não só um valor
// específico — ver ehGrafiaAntiga em utils.js), pra novas tradições de
// grafia que ainda venham a existir também acionarem o aviso sem
// precisar tocar aqui. "Atual" marcado de propósito e "nunca definido"
// (vazio) NÃO acionam — nenhum dos dois é grafia antiga.
function atualizarAvisoGrafiaSonoridade() {
    const sel = document.getElementById('son-poema-id');
    const aviso = document.getElementById('son-grafia-aviso');
    if (!sel || !aviso) return;
    const poema = sel.value ? db.poemas.find((p) => p.id === parseInt(sel.value)) : null;
    aviso.classList.toggle('hidden', !ehGrafiaAntiga(poema?.fonteTexto?.grafia));
}

// Carrega a grade do editor visual (js/editor-sonoridade.js) a partir do
// estado atual do <select> de poema + do id em edição:
// - sem poema escolhido → grade vazia;
// - editando uma escansão já existente E o poema no select ainda é o
//   mesmo dela → recarrega a grade salva (`es.escansaoLinhas`), preservando
//   a divisão silábica já feita;
// - poema novo OU trocado (edição apontando pra outro poema agora) →
//   reconstrói do zero a partir do texto do poema (construirLinhasIniciais)
//   — troca de poema no meio de uma edição existente perde a grade
//   anterior, decisão aceita (ver conversa do Bloco 2).
// Reconstrói do texto do poema sempre que "Linhas a ignorar" muda,
// mesmo com escansaoLinhas já salva pra esse poema — senão a grade
// salva (de antes do ajuste) ficaria presa, ignorando o campo. Só
// reaproveita es.escansaoLinhas quando o valor salvo de
// linhasIgnoradas bate com o que está no campo agora (mesma lógica de
// "trocar de poema descarta a grade anterior", ver comentário logo
// abaixo — trocar as linhas ignoradas é tratado do mesmo jeito).
function carregarGradeSonoridade() {
    const container = document.getElementById('son-grade-container');
    if (!container) return;
    const poemaId = parseInt(document.getElementById('son-poema-id')?.value);
    const linhasIgnoradas = document.getElementById('son-linhas-ignoradas')?.value || '';
    const peMetrico = document.getElementById('son-pe-metrico')?.value || '';
    const tamanhoVerso = document.getElementById('son-tamanho-verso')?.value || '';
    if (!poemaId) {
        inicializarGradeSonoridade(container, [], [], [], peMetrico, tamanhoVerso);
        return;
    }
    const poema = db.poemas.find((p) => p.id === poemaId);
    if (!poema) {
        inicializarGradeSonoridade(container, [], [], [], peMetrico, tamanhoVerso);
        return;
    }
    const idEmEdicao = document.getElementById('son-edit-id')?.value;
    const es = idEmEdicao ? db.escansoes.find((x) => String(x.id) === idEmEdicao) : null;
    const mesmoRecorte = es && (es.linhasIgnoradas || '') === linhasIgnoradas;
    const linhas =
        es && String(es.poemaId) === String(poemaId) && mesmoRecorte && es.escansaoLinhas?.length
            ? es.escansaoLinhas
            : construirLinhasIniciais(poema.texto, linhasIgnoradas);
    const rimas =
        es && String(es.poemaId) === String(poemaId) && mesmoRecorte ? es.rimas || [] : [];
    const ecos = es && String(es.poemaId) === String(poemaId) && mesmoRecorte ? es.ecos || [] : [];
    inicializarGradeSonoridade(container, linhas, rimas, ecos, peMetrico, tamanhoVerso);
}

// Repopula os 7 selects (poema + 6 campos de classificação) do zero —
// chamada tanto ao abrir "Adicionar Escansão" quanto ao editar, nunca
// só uma vez no registrarModal(): ao contrário do onsubmit (que pode
// ser wireado uma única vez, ver initFormSonoridade), a lista de poemas
// muda ao longo do uso, então precisa recarregar toda vez que o modal
// abre — mesmo raciocínio de renderDropdowns() em ui.js, chamado por
// prepararNovo a cada abertura.
function popularCamposSonoridade(valores = {}) {
    popularSelectPoemasSonoridade(valores.poemaId || '');
    const campoLinhasIgnoradas = document.getElementById('son-linhas-ignoradas');
    if (campoLinhasIgnoradas) campoLinhasIgnoradas.value = valores.linhasIgnoradas || '';
    popularSelectOpcoes('son-forma-poema', FORMAS_POEMA, valores.formaPoema);
    popularSelectOpcoes(
        'son-regularidade-metrica',
        REGULARIDADES_METRICAS,
        valores.regularidadeMetrica,
    );
    popularSelectOpcoes('son-tamanho-verso', TAMANHOS_VERSO, valores.tamanhoVerso);
    popularSelectOpcoes(
        'son-esquema-rimas-presenca',
        ESQUEMA_RIMAS_PRESENCA,
        valores.esquemaRimasPresenca,
    );
    popularSelectOpcoes(
        'son-esquema-rimas-padrao',
        ESQUEMA_RIMAS_PADRAO,
        valores.esquemaRimasPadrao,
    );
    popularSelectOpcoes('son-origem-tradicao', ORIGENS_TRADICAO_SONORIDADE, valores.origemTradicao);
    popularSelectOpcoes('son-registro', REGISTROS_SONORIDADE, valores.registro);
    popularSelectOpcoes('son-tom', TONS_SONORIDADE, valores.tom);
    // Pé Métrico já nasce restrito ao Tamanho do Verso salvo (se houver)
    // — aplicarCascataSonoridade, logo abaixo, relê esse valor do DOM e
    // preserva se ainda for válido, mesmo padrão dos outros campos da
    // cascata.
    popularSelectOpcoes(
        'son-pe-metrico',
        calcularOpcoesPeMetrico(valores.tamanhoVerso || ''),
        valores.peMetrico,
    );
    // Bloco 3: estreita os 5 selects em cascata pro que já está salvo em
    // formaPoema/regularidadeMetrica/esquemaRimasPresenca — feito depois
    // de popular tudo com a lista cheia (acima), não antes, senão os
    // valores.* ainda não estariam no DOM pra aplicarCascataSonoridade ler.
    aplicarCascataSonoridade();
    atualizarAvisoPoemaSonoridade();
    atualizarAvisoGrafiaSonoridade();
    carregarGradeSonoridade();
}

// Aplica só os 7 selects de classificação (sem mexer no <select> de
// Poema nem na grade) — subconjunto de popularCamposSonoridade(),
// reaproveitado pela importação de JSON abaixo, que resolve poema e
// grade separadamente (poema pode já estar selecionado antes do
// upload; a grade vem sanitizada de validarJsonSonoridade, não de
// construirLinhasIniciais/es.escansaoLinhas).
function aplicarClassificacaoSonoridade(valores) {
    popularSelectOpcoes('son-forma-poema', FORMAS_POEMA, valores.formaPoema);
    popularSelectOpcoes(
        'son-regularidade-metrica',
        REGULARIDADES_METRICAS,
        valores.regularidadeMetrica,
    );
    popularSelectOpcoes('son-tamanho-verso', TAMANHOS_VERSO, valores.tamanhoVerso);
    popularSelectOpcoes(
        'son-esquema-rimas-presenca',
        ESQUEMA_RIMAS_PRESENCA,
        valores.esquemaRimasPresenca,
    );
    popularSelectOpcoes(
        'son-esquema-rimas-padrao',
        ESQUEMA_RIMAS_PADRAO,
        valores.esquemaRimasPadrao,
    );
    popularSelectOpcoes('son-origem-tradicao', ORIGENS_TRADICAO_SONORIDADE, valores.origemTradicao);
    popularSelectOpcoes('son-registro', REGISTROS_SONORIDADE, valores.registro);
    popularSelectOpcoes('son-tom', TONS_SONORIDADE, valores.tom);
    // Mesmo raciocínio de popularCamposSonoridade acima: Pé Métrico nasce
    // restrito ao Tamanho do Verso já populado, e aplicarCascataSonoridade
    // (chamada logo abaixo) relê o valor do DOM depois.
    popularSelectOpcoes(
        'son-pe-metrico',
        calcularOpcoesPeMetrico(valores.tamanhoVerso || ''),
        valores.peMetrico,
    );
    aplicarCascataSonoridade();
}

// Botão "Importar JSON" do modal de Sonoridade — lê um .json no mesmo
// formato do baixado por baixarEscansaoJson (exportar-sonoridade.js) e
// preenche poema/classificação/grade a partir dele, em vez de tudo
// manual. A validação/sanitização em si mora em importar-sonoridade.js
// (módulo puro, sem DOM); esta função só lê o arquivo e aplica o
// resultado no formulário já aberto.
export function importarSonoridadeDeArquivo(event) {
    const arquivo = event.target?.files?.[0];
    if (!arquivo) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        let dados;
        try {
            dados = JSON.parse(e.target.result);
        } catch {
            mostrarAviso('Erro ao ler o arquivo — confira se é um .json válido.');
            event.target.value = '';
            return;
        }

        const poemaSelecionadoId = document.getElementById('son-poema-id')?.value;
        const resultado = validarJsonSonoridade(dados, db.poemas, poemaSelecionadoId);
        if (resultado.erro) {
            mostrarAviso(resultado.erro);
            event.target.value = '';
            return;
        }

        const { poema, valores, linhas, rimas, ecos, avisos } = resultado;

        const selPoema = document.getElementById('son-poema-id');
        if (selPoema) selPoema.value = poema.id;
        atualizarAvisoPoemaSonoridade();
        atualizarAvisoGrafiaSonoridade();

        aplicarClassificacaoSonoridade(valores);
        const campoLinhasIgnoradas = document.getElementById('son-linhas-ignoradas');
        if (campoLinhasIgnoradas) campoLinhasIgnoradas.value = valores.linhasIgnoradas || '';

        const container = document.getElementById('son-grade-container');
        if (container) {
            const peMetrico = document.getElementById('son-pe-metrico')?.value || '';
            const tamanhoVerso = document.getElementById('son-tamanho-verso')?.value || '';
            inicializarGradeSonoridade(container, linhas, rimas, ecos, peMetrico, tamanhoVerso);
        }

        if (avisos.length) avisos.forEach((msg) => mostrarAviso(msg));
        else mostrarAviso('JSON importado.', 'sucesso');

        event.target.value = '';
    };
    reader.readAsText(arquivo);
}

// Abre o modal pra uma escansão NOVA (botão "Adicionar Escansão") — a
// contraparte de editarSonoridade abaixo. Função própria (em vez de
// reaproveitar prepararNovo(tipo) de ui.js) porque o reset desse modal
// precisa repopular os selects a cada abertura, não só uma vez — mesmo
// padrão já usado por prepararNovaParte/prepararNovoItem em
// coletaneas.js pro mesmo tipo de necessidade.
export async function prepararNovaSonoridade() {
    await garantirModal('modal-sonoridade');
    const form = document.getElementById('form-sonoridade');
    if (!form) return;
    form.reset();
    document.getElementById('son-edit-id').value = '';
    document.getElementById('modal-sonoridade-titulo').innerText = 'Adicionar Escansão';
    popularCamposSonoridade();
    toggleModal('modal-sonoridade');
}

export function initFormSonoridade() {
    const selPoema = document.getElementById('son-poema-id');
    if (selPoema) {
        selPoema.onchange = () => {
            atualizarAvisoPoemaSonoridade();
            atualizarAvisoGrafiaSonoridade();
            carregarGradeSonoridade();
        };
    }

    // Bloco 3 — os 3 campos que disparam restrição/correção nos outros:
    // formaPoema e regularidadeMetrica recalculam a cascata inteira (um
    // muda quem trava o quê, o outro decide se o caso composto Forma
    // Livre + Versos Livres se aplica); esquemaRimasPresenca primeiro
    // corrige o próprio valor (regra 1 — Versos Brancos) e só depois
    // recalcula (o Padrão depende do valor já corrigido de Presença).
    document.getElementById('son-forma-poema')?.addEventListener('change', () => {
        aplicarCascataSonoridade();
    });
    document.getElementById('son-regularidade-metrica')?.addEventListener('change', () => {
        aplicarCascataSonoridade();
    });
    document.getElementById('son-esquema-rimas-presenca')?.addEventListener('change', (e) => {
        const regularidadeMetrica = document.getElementById('son-regularidade-metrica')?.value;
        const corrigido = corrigirPresencaRimaSeVersoBranco(e.target.value, regularidadeMetrica);
        if (corrigido !== e.target.value) e.target.value = corrigido;
        aplicarCascataSonoridade();
    });
    // "Linhas a ignorar" — recalcula a grade a cada mudança, mesmo
    // padrão de trocar de poema (ver carregarGradeSonoridade acima).
    document.getElementById('son-linhas-ignoradas')?.addEventListener('change', () => {
        carregarGradeSonoridade();
    });

    // Regra adicional 2 — sugestão, não trava: só preenche Origem/
    // Tradição se o campo ainda estiver vazio, pra não sobrescrever uma
    // escolha manual já feita.
    document.getElementById('son-tamanho-verso')?.addEventListener('change', (e) => {
        const selOrigem = document.getElementById('son-origem-tradicao');
        if (!selOrigem || selOrigem.value) return;
        const sugestao = sugerirOrigemTradicaoPorTamanho(e.target.value);
        if (sugestao && Array.from(selOrigem.options).some((o) => o.value === sugestao)) {
            selOrigem.value = sugestao;
        }
    });

    // Pé Métrico ↔ Tamanho do Verso — trava bidirecional (ver
    // utils.js). Metade "Tamanho manda no Pé": trocar o Tamanho direto
    // (sem passar por Forma/Regularidade, que já disparam
    // aplicarCascataSonoridade sozinhas) também precisa refiltrar as
    // opções de Pé Métrico — senão um Pé fixo incompatível com o novo
    // Tamanho ficaria selecionado até a próxima troca de Forma.
    document.getElementById('son-tamanho-verso')?.addEventListener('change', (e) => {
        popularSelectOpcoes(
            'son-pe-metrico',
            calcularOpcoesPeMetrico(e.target.value || ''),
            document.getElementById('son-pe-metrico')?.value,
        );
        // A troca de Tamanho pode ter zerado o Pé Métrico selecionado
        // (um fixo que não cabia mais no novo Tamanho) — relê o valor já
        // resolvido pelo popularSelectOpcoes acima, não e.target.value
        // (que é o Tamanho, não o Pé).
        atualizarPeMetricoSonoridade(document.getElementById('son-pe-metrico')?.value);
        // Recalcula a célula "Cont." e o rótulo "Alvo" da grade contra o
        // novo Tamanho — mesma complementaridade que editor-molde.js já
        // tinha (atualizarAlvoGradeMolde), trazida agora pra Sonoridade.
        atualizarTamanhoVersoSonoridade(e.target.value);
    });

    // Metade "Pé manda no Tamanho": um Pé Métrico fixo (Heroico, Sáfico,
    // Martelo Agalopado, Arte Maior) força o Tamanho do Verso pro valor
    // que exige — mesmo espírito da trava de Forma do Poema, só que essa
    // via também existe no sentido contrário (ver
    // calcularTamanhoVersoForcadoPorPe). Pé contínuo não força nada.
    document.getElementById('son-pe-metrico')?.addEventListener('change', (e) => {
        const forcado = calcularTamanhoVersoForcadoPorPe(e.target.value);
        if (forcado) {
            const selTamanho = document.getElementById('son-tamanho-verso');
            if (selTamanho) selTamanho.value = forcado;
        }
        aplicarCascataSonoridade();
        // Recalcula a divergência de tônica esperada na grade (Bloco 2
        // sub-passo 2) — reconstrói só as colunas de sílaba, sem perder
        // Modo Tônica/Rima em curso nem o cursor de quem estiver
        // digitando um verso.
        atualizarPeMetricoSonoridade(e.target.value);
        // Um Pé fixo pode ter forçado o Tamanho do Verso (selTamanho.value
        // acima) sem disparar o listener `change` de son-tamanho-verso —
        // relê o valor já resolvido do próprio select pra manter a célula
        // "Cont."/rótulo "Alvo" em sincronia com o Tamanho realmente
        // selecionado agora.
        atualizarTamanhoVersoSonoridade(document.getElementById('son-tamanho-verso')?.value);
    });

    const form = document.getElementById('form-sonoridade');
    if (!form) return;

    form.onsubmit = (e) => {
        e.preventDefault();
        const id = document.getElementById('son-edit-id').value;
        const poemaId = parseInt(document.getElementById('son-poema-id').value);
        if (!poemaId) return;

        // Substitui a escansão existente do poema (se houver e não for a
        // que já está em edição), em vez de criar uma segunda — mesmo
        // aviso não bloqueante mostrado em atualizarAvisoPoemaSonoridade.
        const existente = getEscansaoDoPoema(poemaId);
        const idAlvo = id ? parseInt(id) : existente ? existente.id : gerarId();

        const dados = {
            id: idAlvo,
            poemaId,
            formaPoema: document.getElementById('son-forma-poema').value || null,
            regularidadeMetrica: document.getElementById('son-regularidade-metrica').value || null,
            tamanhoVerso: document.getElementById('son-tamanho-verso').value || null,
            esquemaRimasPresenca:
                document.getElementById('son-esquema-rimas-presenca').value || null,
            esquemaRimasPadrao: document.getElementById('son-esquema-rimas-padrao').value || null,
            origemTradicao: document.getElementById('son-origem-tradicao').value || null,
            peMetrico: document.getElementById('son-pe-metrico')?.value || null,
            registro: document.getElementById('son-registro').value || null,
            tom: document.getElementById('son-tom').value || null,
            linhasIgnoradas: document.getElementById('son-linhas-ignoradas')?.value || '',
            escansaoLinhas: obterLinhasSonoridade(),
            rimas: obterRimasSonoridade(),
            ecos: obterEcosSonoridade(),
        };

        // Regra adicional 3 (avisos não-bloqueantes) — não impedem o
        // salvamento, só avisam depois pra revisão. Monorrima atípica
        // primeiro (mais específico); divergência de sílabas só faz
        // sentido em poema Isométrico (ver calcularDivergenciaSilabas);
        // dígrafo dividido (-rr-/-ss-) vale pra qualquer poema, não só
        // Isométrico — é erro de escansão, independe de regularidade.
        const avisoMonorrima = avisoMonorrimaAtipica(dados.formaPoema, dados.esquemaRimasPadrao);
        if (avisoMonorrima) mostrarAviso(avisoMonorrima);
        if (dados.regularidadeMetrica === 'Isométrico') {
            const divergentes = calcularDivergenciaSilabas(
                dados.escansaoLinhas,
                dados.tamanhoVerso,
            );
            if (divergentes.length) {
                mostrarAviso(
                    `Verso${divergentes.length > 1 ? 's' : ''} ${divergentes.join(', ')} ${
                        divergentes.length > 1 ? 'não batem' : 'não bate'
                    } com ${dados.tamanhoVerso} — confira a escansão.`,
                );
            }
        }
        const versosComDigrafo = calcularVersosComDigrafoDividido(dados.escansaoLinhas);
        if (versosComDigrafo.length) {
            mostrarAviso(
                `Verso${versosComDigrafo.length > 1 ? 's' : ''} ${versosComDigrafo.join(', ')} ${
                    versosComDigrafo.length > 1 ? 'dividem' : 'divide'
                } um dígrafo (rr/ss) entre sílabas — confira a escansão.`,
            );
        }

        const anterior = db.escansoes.find((x) => x.id == idAlvo);
        if (anterior) {
            const idx = db.escansoes.findIndex((x) => x.id == idAlvo);
            db.escansoes[idx] = dados;
        } else {
            db.escansoes.push(dados);
        }

        save();
        toggleModal('modal-sonoridade');
    };
}

export async function editarSonoridade(id) {
    const es = db.escansoes.find((x) => x.id == id);
    if (!es) return;
    await garantirModal('modal-sonoridade');

    document.getElementById('son-edit-id').value = es.id;
    popularCamposSonoridade(es);
    document.getElementById('modal-sonoridade-titulo').innerText = 'Editar Escansão';
    toggleModal('modal-sonoridade');
}

// ─── Molde (aba Criação) ─────────────────────────────────────
// Bloco 1 (dados + tabela + meta). Reaproveita a mesma taxonomia e a
// mesma matriz de validação em cascata da Sonoridade (aplicarCascataMolde
// é uma réplica de aplicarCascataSonoridade, só com os ids 'molde-*') —
// decisão explícita da conversa: Molde é a mesma classificação, só que
// preenchida ANTES do texto existir, como meta, não como constatação.
// Sem <select> de Poema (Molde ainda não tem um) nem grade de versos —
// isso entra no Bloco 2 (editor de escrita orientado pela meta).

// ─── Bloco 3, 2ª metade — "Promover a Poema" ─────────────────────────
// Guarda só o id do Molde sendo promovido (não o objeto inteiro) entre
// iniciarPromocaoMolde (abre modal-poema pré-preenchido) e o
// form.onsubmit de Poema salvar de verdade — só nesse momento (ver
// aplicarPromocaoMoldeSePendente) o Molde é marcado como promovido e a
// Escansão é criada, nunca antes. `null` significa "nenhuma promoção em
// curso" — é o estado de praticamente todo o tempo; qualquer caminho de
// abrir/editar um Poema que NÃO seja através da promoção precisa
// limpá-lo explicitamente (ver limparPromocaoMoldeEmCurso, exportada,
// chamada por ui.js dentro de prepararNovo('poema') e por editarPoema
// logo abaixo) — senão um Poema comum salvo por acaso enquanto uma
// promoção ficou pendente acabaria promovendo o Molde errado.
let moldePromovendoContexto = null;

export function limparPromocaoMoldeEmCurso() {
    moldePromovendoContexto = null;
}

// Lê os mesmos campos que o form.onsubmit do Molde (initFormMolde,
// abaixo) grava em db.moldes — extraído pra função própria porque
// promoverMoldeAoVivo (chamada pelo botão de DENTRO do modal, ver
// definirCallbackPromocaoMolde) precisa do mesmo snapshot sem passar
// por um submit de verdade. status/poemaId ficam de fora de propósito:
// nunca são lidos do form (não existe campo pra eles na UI) — quem
// grava os dois é sempre o chamador (form.onsubmit ou
// promoverMoldeAoVivo), preservando o que já estiver salvo.
function coletarEstadoAtualMolde() {
    return {
        titulo: document.getElementById('molde-titulo')?.value.trim() || '',
        formaPoema: document.getElementById('molde-forma-poema').value || null,
        regularidadeMetrica: document.getElementById('molde-regularidade-metrica').value || null,
        tamanhoVerso: document.getElementById('molde-tamanho-verso').value || null,
        esquemaRimasPresenca: document.getElementById('molde-esquema-rimas-presenca').value || null,
        esquemaRimasPadrao: document.getElementById('molde-esquema-rimas-padrao').value || null,
        origemTradicao: document.getElementById('molde-origem-tradicao').value || null,
        peMetrico: document.getElementById('molde-pe-metrico')?.value || null,
        registro: document.getElementById('molde-registro').value || null,
        tom: document.getElementById('molde-tom').value || null,
        moldeLinhas: obterLinhasMolde(),
        paresRima: obterParesRimaMolde(),
    };
}

// Botão "Baixar JSON" de DENTRO do modal de Molde — exporta o estado AO
// VIVO do editor (mesmo espírito de promoverMoldeAoVivo abaixo: o que está
// na tela, não só o que foi salvo da última vez). `status` vem do que já
// está salvo (o form nunca o edita); Molde novo ainda sem salvar sai como
// 'em andamento'. O botão da TABELA exporta direto de db.moldes (ver
// baixarMoldePorId, ui-molde-json.js).
export function baixarMoldeAoVivo() {
    const id = document.getElementById('molde-edit-id')?.value;
    const anterior = id ? db.moldes.find((x) => x.id == id) : null;
    baixarMolde({ ...coletarEstadoAtualMolde(), status: anterior?.status ?? 'em andamento' });
}

// Abre modal-poema pré-preenchido (Título/Texto vindos do Molde) — o
// Victor completa Livro/Data/etc. e salva normalmente; a Escansão só é
// criada de verdade quando esse Poema for salvo (ver
// aplicarPromocaoMoldeSePendente, chamada no fim do form.onsubmit de
// Poema, só quando for um Poema NOVO). Reaproveita prepararNovo('poema')
// (ui.js) pra herdar toda a limpeza de estado de "Adicionar Poema"
// (Sinalizações/Pessoas/Autoria/etc.) — moldePromovendoContexto só é
// setado DEPOIS de prepararNovo resolver, porque prepararNovo('poema')
// já limpa esse mesmo contexto por segurança (ver
// limparPromocaoMoldeEmCurso acima), sempre que "Adicionar Poema" é
// aberto por qualquer caminho, promoção incluída.
async function iniciarPromocaoMolde(molde) {
    await prepararNovo('poema');
    moldePromovendoContexto = { moldeId: molde.id };
    const campoTitulo = document.getElementById('p-titulo');
    if (campoTitulo) campoTitulo.value = molde.titulo || '';
    const campoTexto = document.getElementById('p-texto');
    if (campoTexto) campoTexto.value = linhasMoldeParaTextoPoema(molde.moldeLinhas || []);
}

// Chamada pelo botão "Promover a Poema" de DENTRO do modal de Molde
// (ver definirCallbackPromocaoMolde, registrada em initFormMolde
// abaixo) — salva o Molde com o estado AO VIVO do editor (o mesmo que
// um clique em SALVAR gravaria), fecha o modal-molde e só então abre
// o modal-poema por cima (iniciarPromocaoMolde). Sem isso, promover um
// Molde recém-editado mas ainda não salvo perderia o que foi escrito
// desde a última vez que o formulário foi submetido.
function promoverMoldeAoVivo() {
    const id = document.getElementById('molde-edit-id')?.value;
    const idAlvo = id ? parseInt(id) : gerarId();
    const anterior = db.moldes.find((x) => x.id == idAlvo);

    const dados = {
        id: idAlvo,
        ...coletarEstadoAtualMolde(),
        status: anterior?.status ?? 'em andamento',
        poemaId: anterior?.poemaId ?? null,
    };

    if (anterior) {
        const idx = db.moldes.findIndex((x) => x.id == idAlvo);
        db.moldes[idx] = dados;
    } else {
        db.moldes.push(dados);
    }
    save();
    // Molde novo (nunca salvo antes de clicar em "Promover a Poema")
    // ganha o id agora — sem isso, o campo oculto ficaria vazio depois
    // do form.reset() implícito de toggleModal, e uma eventual reedição
    // desse mesmo Molde (ex.: reabrir pra corrigir algo) não acharia o
    // registro já promovido.
    const campoId = document.getElementById('molde-edit-id');
    if (campoId) campoId.value = dados.id;

    toggleModal('modal-molde');
    iniciarPromocaoMolde(dados);
}

// Chamada pela ação "Promover a Poema" da TABELA de Moldes (Molde já
// salvo, sem modal aberto — ver ACOES_LISTA em main.js e
// celulaAcoesMolde em render-listas.js) — diferente de
// promoverMoldeAoVivo acima, usa direto o que já está em db.moldes, sem
// coletar nada de formulário nenhum.
export function promoverMolde(id) {
    const molde = db.moldes.find((x) => x.id == id);
    if (!molde) return;
    // Já promovido: a própria tabela já troca essa ação por "Ver Poema"
    // (celulaAcoesMolde) — clique repetido (ex. atalho de teclado,
    // clique duplo) não deveria abrir uma 2ª promoção pro mesmo Molde.
    if (molde.status === 'promovido') return;
    iniciarPromocaoMolde(molde);
}

// Chamada no fim do form.onsubmit de Poema (initFormPoema, abaixo), só
// quando `!idInput` — Poema NOVO, nunca numa edição comum — pra nunca
// promover o Molde errado se alguém editar um Poema qualquer enquanto
// uma promoção ficasse pendente por engano. Marca o Molde original como
// promovido (status/poemaId) e cria a Escansão correspondente a partir
// do que já foi declarado durante a escrita (moldeLinhas/paresRima),
// sem precisar re-escandir do zero (ver Bloco 3, criacao-molde.md). O
// Molde original nunca é apagado — fica arquivado como origem/processo
// do Poema, mesma pegada arquivística do resto do projeto. Não chama
// save() por conta própria: o form.onsubmit de Poema que a invoca já
// chama save() logo depois, persistindo Poema/Molde/Escansão juntos
// numa única gravação.
function aplicarPromocaoMoldeSePendente(poemaId) {
    if (!moldePromovendoContexto) return;
    const { moldeId } = moldePromovendoContexto;
    moldePromovendoContexto = null;

    const idxMolde = db.moldes.findIndex((x) => x.id == moldeId);
    if (idxMolde === -1) return;
    const molde = db.moldes[idxMolde];
    db.moldes[idxMolde] = { ...molde, status: 'promovido', poemaId };

    // Substitui uma Escansão pré-existente do Poema em vez de criar uma
    // segunda (mesmo cuidado de initFormSonoridade/getEscansaoDoPoema) —
    // não deveria acontecer num Poema recém-criado pela própria
    // promoção, mas por segurança segue a mesma regra do resto do app.
    const existente = getEscansaoDoPoema(poemaId);
    const idAlvo = existente ? existente.id : gerarId();
    const escansao = {
        id: idAlvo,
        poemaId,
        formaPoema: molde.formaPoema,
        regularidadeMetrica: molde.regularidadeMetrica,
        tamanhoVerso: molde.tamanhoVerso,
        esquemaRimasPresenca: molde.esquemaRimasPresenca,
        esquemaRimasPadrao: molde.esquemaRimasPadrao,
        origemTradicao: molde.origemTradicao,
        peMetrico: molde.peMetrico,
        registro: molde.registro,
        tom: molde.tom,
        linhasIgnoradas: '',
        escansaoLinhas: molde.moldeLinhas || [],
        rimas: molde.paresRima || [],
        ecos: [],
    };
    if (existente) {
        const idxEs = db.escansoes.findIndex((x) => x.id == idAlvo);
        db.escansoes[idxEs] = escansao;
    } else {
        db.escansoes.push(escansao);
    }

    // Render imediato da tabela de Moldes (mesmo padrão de renderPessoas/
    // renderEpocas após mesclarPessoas/mesclarEpocas, acima) — o
    // form.onsubmit de Poema já chama save() (dispara 'db:saved', que
    // recobre isso também), mas o Victor está vendo o modal de Poema
    // fechar agora, não a tabela de Moldes por trás.
    renderMoldes();
}

function aplicarCascataMolde() {
    const formaPoema = document.getElementById('molde-forma-poema')?.value || '';
    const regularidadeMetrica = document.getElementById('molde-regularidade-metrica')?.value || '';
    const esquemaRimasPresenca =
        document.getElementById('molde-esquema-rimas-presenca')?.value || '';

    const opcoes = calcularOpcoesCascataSonoridade({
        formaPoema,
        regularidadeMetrica,
        esquemaRimasPresenca,
    });

    popularSelectOpcoes(
        'molde-regularidade-metrica',
        opcoes.regularidadeMetrica,
        regularidadeMetrica,
    );
    popularSelectOpcoes(
        'molde-tamanho-verso',
        opcoes.tamanhoVerso,
        document.getElementById('molde-tamanho-verso')?.value,
    );
    popularSelectOpcoes(
        'molde-esquema-rimas-presenca',
        opcoes.esquemaRimasPresenca,
        esquemaRimasPresenca,
    );
    popularSelectOpcoes(
        'molde-esquema-rimas-padrao',
        opcoes.esquemaRimasPadrao,
        document.getElementById('molde-esquema-rimas-padrao')?.value,
    );
    popularSelectOpcoes(
        'molde-origem-tradicao',
        opcoes.origemTradicao,
        document.getElementById('molde-origem-tradicao')?.value,
    );

    // A cascata pode restringir/resetar o Tamanho do Verso (ex.: trocar
    // pra "Soneto" trava as opções) — a coluna de alvo da grade precisa
    // acompanhar o valor final, não só reagir ao listener 'change' direto
    // do próprio select (que não dispara quando é a cascata, não o
    // usuário, quem muda o valor).
    atualizarAlvoGradeMolde(document.getElementById('molde-tamanho-verso')?.value || '');

    // Réplica da metade "Tamanho manda no Pé" de aplicarCascataSonoridade
    // (ver comentário lá) — molde-pe-metrico precisa do mesmo tratamento,
    // já que a cascata acima também pode ter mexido no Tamanho do Verso.
    popularSelectOpcoes(
        'molde-pe-metrico',
        calcularOpcoesPeMetrico(document.getElementById('molde-tamanho-verso')?.value || ''),
        document.getElementById('molde-pe-metrico')?.value,
    );
    // Recalcula a divergência de tônica esperada na grade (Bloco 2
    // sub-passo 2, lado do Molde) — relê o valor já resolvido pelo
    // popularSelectOpcoes acima (a cascata pode ter zerado um Pé fixo
    // que não cabia mais), mesmo padrão de atualizarAlvoGradeMolde logo
    // acima nesta função.
    atualizarPeMetricoGradeMolde(document.getElementById('molde-pe-metrico')?.value || '');

    // Recalcula a coluna "Rima" (Bloco 2 sub-passo 3) — a cascata acima
    // pode ter mexido em molde-esquema-rimas-presenca/-padrao (ex.:
    // trocar Forma do Poema trava/reseta o Padrão), então relê os dois
    // já resolvidos, mesmo padrão das duas chamadas acima.
    atualizarEsquemaRimaGradeMolde(
        document.getElementById('molde-esquema-rimas-presenca')?.value || '',
        document.getElementById('molde-esquema-rimas-padrao')?.value || '',
    );
}

// Repopula título + os 7 selects de classificação do zero — mesmo
// motivo de popularCamposSonoridade (chamada tanto ao abrir "Adicionar
// Molde" quanto ao editar um já existente).
function popularCamposMolde(valores = {}) {
    const campoTitulo = document.getElementById('molde-titulo');
    if (campoTitulo) campoTitulo.value = valores.titulo || '';
    popularSelectOpcoes('molde-forma-poema', FORMAS_POEMA, valores.formaPoema);
    popularSelectOpcoes(
        'molde-regularidade-metrica',
        REGULARIDADES_METRICAS,
        valores.regularidadeMetrica,
    );
    popularSelectOpcoes('molde-tamanho-verso', TAMANHOS_VERSO, valores.tamanhoVerso);
    popularSelectOpcoes(
        'molde-esquema-rimas-presenca',
        ESQUEMA_RIMAS_PRESENCA,
        valores.esquemaRimasPresenca,
    );
    popularSelectOpcoes(
        'molde-esquema-rimas-padrao',
        ESQUEMA_RIMAS_PADRAO,
        valores.esquemaRimasPadrao,
    );
    popularSelectOpcoes(
        'molde-origem-tradicao',
        ORIGENS_TRADICAO_SONORIDADE,
        valores.origemTradicao,
    );
    popularSelectOpcoes('molde-registro', REGISTROS_SONORIDADE, valores.registro);
    popularSelectOpcoes('molde-tom', TONS_SONORIDADE, valores.tom);
    // Mesmo raciocínio de popularCamposSonoridade: nasce restrito ao
    // Tamanho do Verso já salvo, aplicarCascataMolde (abaixo) confirma.
    popularSelectOpcoes(
        'molde-pe-metrico',
        calcularOpcoesPeMetrico(valores.tamanhoVerso || ''),
        valores.peMetrico,
    );
    // Estreita os 5 selects em cascata pro que já está salvo — feito
    // depois de popular tudo com a lista cheia, mesmo motivo de
    // popularCamposSonoridade.
    aplicarCascataMolde();

    // Grade de escrita (Bloco 2, sub-passo 1) — nasce vazia em "Adicionar
    // Molde" (valores.moldeLinhas indefinido) ou carrega o que já foi
    // escrito em "Editar Molde". O alvo (sílabas esperadas) é sempre o
    // Tamanho do Verso já populado acima, nunca um valor salvo à parte.
    const container = document.getElementById('molde-grade-container');
    if (container) {
        inicializarGradeMolde(
            container,
            valores.moldeLinhas || [],
            document.getElementById('molde-tamanho-verso')?.value || '',
            document.getElementById('molde-pe-metrico')?.value || '',
            document.getElementById('molde-esquema-rimas-presenca')?.value || '',
            document.getElementById('molde-esquema-rimas-padrao')?.value || '',
            valores.paresRima || [],
            valores.status || 'em andamento',
            valores.poemaId ?? null,
        );
    }
}

// Abre o modal pra um Molde NOVO — contraparte de editarMolde abaixo,
// mesmo padrão de prepararNovaSonoridade (função própria em vez de
// prepararNovo(tipo) de ui.js, porque precisa repopular os selects a
// cada abertura, não só uma vez).
export async function prepararNovoMolde() {
    await garantirModal('modal-molde');
    const form = document.getElementById('form-molde');
    if (!form) return;
    form.reset();
    document.getElementById('molde-edit-id').value = '';
    document.getElementById('modal-molde-titulo').innerText = 'Adicionar Molde';
    popularCamposMolde();
    toggleModal('modal-molde');
}

export function initFormMolde() {
    // Registrado uma única vez (initFormMolde só roda uma vez, ao
    // resolver o fetch do modal — ver registrarModal em main.js) — o
    // próprio editor-molde.js não sabe nada sobre Poema/Escansão, só
    // avisa o clique (ver definirCallbackPromocaoMolde, editor-molde.js).
    definirCallbackPromocaoMolde(promoverMoldeAoVivo);
    // Mesmo raciocínio, pro link do id de Poema dentro do selo "✓
    // Promovido" (ver definirCallbackAbrirPoema, editor-molde.js) — o
    // modal do Molde fica fora de <main> (ver registrarModal), então
    // não dá pra reaproveitar a delegação global de data-action;
    // editarPoema é quem sabe abrir o modal de Poema.
    definirCallbackAbrirPoema(editarPoema);

    // Mesmo raciocínio do Bloco 3 de Sonoridade: formaPoema e
    // regularidadeMetrica recalculam a cascata inteira; esquemaRimasPresenca
    // primeiro corrige o próprio valor (regra "Versos Brancos") e só depois
    // recalcula.
    document.getElementById('molde-forma-poema')?.addEventListener('change', () => {
        aplicarCascataMolde();
    });
    document.getElementById('molde-regularidade-metrica')?.addEventListener('change', () => {
        aplicarCascataMolde();
    });
    document.getElementById('molde-esquema-rimas-presenca')?.addEventListener('change', (e) => {
        const regularidadeMetrica = document.getElementById('molde-regularidade-metrica')?.value;
        const corrigido = corrigirPresencaRimaSeVersoBranco(e.target.value, regularidadeMetrica);
        if (corrigido !== e.target.value) e.target.value = corrigido;
        aplicarCascataMolde();
    });
    // Padrão não participa da cascata em cima de outros campos (só
    // Presença/Forma/Regularidade fazem isso) — trocar só ele não
    // precisa de aplicarCascataMolde inteira, só recalcular a coluna
    // "Rima" (Bloco 2 sub-passo 3).
    document.getElementById('molde-esquema-rimas-padrao')?.addEventListener('change', (e) => {
        atualizarEsquemaRimaGradeMolde(
            document.getElementById('molde-esquema-rimas-presenca')?.value || '',
            e.target.value || '',
        );
    });

    // Sugestão (não trava) de Medida Velha/Nova — só se Origem/Tradição
    // ainda estiver vazio, mesmo cuidado de não sobrescrever escolha manual.
    document.getElementById('molde-tamanho-verso')?.addEventListener('change', (e) => {
        atualizarAlvoGradeMolde(e.target.value || '');
        const selOrigem = document.getElementById('molde-origem-tradicao');
        if (!selOrigem || selOrigem.value) return;
        const sugestao = sugerirOrigemTradicaoPorTamanho(e.target.value);
        if (sugestao && Array.from(selOrigem.options).some((o) => o.value === sugestao)) {
            selOrigem.value = sugestao;
        }
    });

    // Pé Métrico ↔ Tamanho do Verso — réplica das duas metades wireadas
    // em initFormSonoridade (ver comentários lá).
    document.getElementById('molde-tamanho-verso')?.addEventListener('change', (e) => {
        popularSelectOpcoes(
            'molde-pe-metrico',
            calcularOpcoesPeMetrico(e.target.value || ''),
            document.getElementById('molde-pe-metrico')?.value,
        );
        // A troca de Tamanho pode ter zerado o Pé Métrico selecionado
        // (um fixo que não cabia mais no novo Tamanho) — relê o valor
        // já resolvido pelo popularSelectOpcoes acima, mesmo padrão de
        // son-tamanho-verso em initFormSonoridade.
        atualizarPeMetricoGradeMolde(document.getElementById('molde-pe-metrico')?.value || '');
    });
    document.getElementById('molde-pe-metrico')?.addEventListener('change', (e) => {
        const forcado = calcularTamanhoVersoForcadoPorPe(e.target.value);
        if (forcado) {
            const selTamanho = document.getElementById('molde-tamanho-verso');
            if (selTamanho) selTamanho.value = forcado;
        }
        aplicarCascataMolde();
        // Recalcula a divergência de tônica esperada na grade — mesmo
        // padrão de son-pe-metrico em initFormSonoridade.
        atualizarPeMetricoGradeMolde(e.target.value);
    });

    const form = document.getElementById('form-molde');
    if (!form) return;

    form.onsubmit = (e) => {
        e.preventDefault();
        const id = document.getElementById('molde-edit-id').value;
        const idAlvo = id ? parseInt(id) : gerarId();
        const anterior = db.moldes.find((x) => x.id == idAlvo);

        const dados = {
            id: idAlvo,
            ...coletarEstadoAtualMolde(),
            // status/poemaId nunca são preenchidos por este formulário
            // (não existe campo pra eles na UI, ver modal-molde.html) —
            // só a promoção (aplicarPromocaoMoldeSePendente, acima) os
            // toca. Preserva o que já estiver salvo; um Molde novo nasce
            // no mesmo padrão de migrarCamposBloco3Molde (db.js).
            status: anterior?.status ?? 'em andamento',
            poemaId: anterior?.poemaId ?? null,
        };

        if (anterior) {
            const idx = db.moldes.findIndex((x) => x.id == idAlvo);
            db.moldes[idx] = dados;
        } else {
            db.moldes.push(dados);
        }

        save();
        toggleModal('modal-molde');
    };
}

export async function editarMolde(id) {
    const molde = db.moldes.find((x) => x.id == id);
    if (!molde) return;
    await garantirModal('modal-molde');

    document.getElementById('molde-edit-id').value = molde.id;
    popularCamposMolde(molde);
    document.getElementById('modal-molde-titulo').innerText = 'Editar Molde';
    toggleModal('modal-molde');
}

// ─── Morfofuncionalidade (Progressão Morfofuncional) ───────────
// Ver manutencao/progressao-morfofuncional.md pro requisito completo.
// Estado de edição (Unidades/Eventos atuais, estrofes derivadas do
// poema) mora em estrutura-textual.js — mesma separação de
// responsabilidade que já existe entre este arquivo e
// editor-sonoridade.js: aqui só decide QUANDO chamar e lê o
// resultado final na hora de salvar.

function popularSelectPoemasEstrutura(poemaIdAtual = '') {
    const sel = document.getElementById('estr-poema-id');
    if (!sel) return;
    const ordenados = [...db.poemas].sort((a, b) =>
        (a.titulo || '').localeCompare(b.titulo || '', 'pt-BR'),
    );
    sel.innerHTML = '<option value="">-- Escolha um poema --</option>';
    ordenados.forEach((p) => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.titulo || `#${p.id}`;
        sel.appendChild(opt);
    });
    sel.value = poemaIdAtual || '';
}

// Embutidos primeiro (regra 8 do .md — só duplicáveis), depois os do
// usuário em ordem alfabética.
function popularSelectTemplatesEstrutura() {
    const sel = document.getElementById('estr-template-id');
    if (!sel) return;
    const embutidos = db.templatesEstrutura.filter((t) => t.embutido);
    const doUsuario = [...db.templatesEstrutura]
        .filter((t) => !t.embutido)
        .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
    sel.innerHTML =
        '<option value="">-- Escolha um template --</option>' +
        [...embutidos, ...doUsuario]
            .map(
                (t) =>
                    `<option value="${t.id}">${escapeHtml(t.nome)}${t.embutido ? ' (padrão)' : ''}</option>`,
            )
            .join('');
}

// ─── Editar/Excluir Template ────────────────────────────────────
// Estado local da edição de um Template — separado de
// unidadesAtuais/eventosAtuais (estrutura-textual.js), que pertencem à
// Progressão do poema em edição, não ao Template em si. Templates não
// têm posição/estrofes, só a classificação (mesmo formato de
// extrairClassificacaoParaTemplate); o `id` de cada linha aqui é só
// pra a lista da UI conseguir remover a linha certa, não é salvo.
let templateEmEdicaoId = null;
let templateUnidadesEdicao = [];
let templateEventosEdicao = [];

function renderListaTemplateUnidades() {
    const container = document.getElementById('tpl-lista-unidades');
    if (!container) return;
    if (templateUnidadesEdicao.length === 0) {
        container.innerHTML =
            '<p class="text-xs text-gray-400 dark:text-slate-500 italic">Nenhuma Unidade ainda.</p>';
        return;
    }
    container.innerHTML = templateUnidadesEdicao
        .map(
            (
                u,
            ) => `<div class="flex items-center justify-between gap-2 text-sm border border-gray-200 dark:border-slate-700 rounded px-2 py-1 mb-1">
                <span>${escapeHtml([u.unidadeEstrofica, u.unidadeDiscursiva].filter(Boolean).join(' · ') || '—')}</span>
                <button type="button" onclick="removerUnidadeTemplateEdicao(${u.id})" title="Remover" aria-label="Remover"
                    class="text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 text-xs">✕</button>
            </div>`,
        )
        .join('');
}

function renderListaTemplateEventos() {
    const container = document.getElementById('tpl-lista-eventos');
    if (!container) return;
    if (templateEventosEdicao.length === 0) {
        container.innerHTML =
            '<p class="text-xs text-gray-400 dark:text-slate-500 italic">Nenhum Evento ainda.</p>';
        return;
    }
    container.innerHTML = templateEventosEdicao
        .map(
            (
                e,
            ) => `<div class="flex items-center justify-between gap-2 text-sm border border-gray-200 dark:border-slate-700 rounded px-2 py-1 mb-1">
                <span>${escapeHtml(e.progressaoDialetica || '—')}</span>
                <button type="button" onclick="removerEventoTemplateEdicao(${e.id})" title="Remover" aria-label="Remover"
                    class="text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 text-xs">✕</button>
            </div>`,
        )
        .join('');
}

export function adicionarUnidadeTemplateEdicao() {
    const estroficaEl = document.getElementById('tpl-nova-unidade-estrofica');
    const discursivaEl = document.getElementById('tpl-nova-unidade-discursiva');
    const unidadeEstrofica = (estroficaEl?.value || '').trim();
    const unidadeDiscursiva = (discursivaEl?.value || '').trim();
    if (!unidadeEstrofica && !unidadeDiscursiva) return;
    templateUnidadesEdicao.push({ id: gerarId(), unidadeEstrofica, unidadeDiscursiva });
    if (estroficaEl) estroficaEl.value = '';
    if (discursivaEl) discursivaEl.value = '';
    renderListaTemplateUnidades();
}

export function adicionarEventoTemplateEdicao() {
    const el = document.getElementById('tpl-novo-evento');
    const progressaoDialetica = (el?.value || '').trim();
    if (!progressaoDialetica) return;
    templateEventosEdicao.push({ id: gerarId(), progressaoDialetica });
    if (el) el.value = '';
    renderListaTemplateEventos();
}

export function removerUnidadeTemplateEdicao(id) {
    templateUnidadesEdicao = templateUnidadesEdicao.filter((u) => u.id !== id);
    renderListaTemplateUnidades();
}

export function removerEventoTemplateEdicao(id) {
    templateEventosEdicao = templateEventosEdicao.filter((e) => e.id !== id);
    renderListaTemplateEventos();
}

// Botão "✏️" ao lado do seletor de Templates — abre o modal de edição
// já populado. Embutidos entram aqui também: "padrão" não trava mais
// edição, só sinaliza origem (decisão do Victor — se pensa diferente
// do template de fábrica, edita). A única diferença de tratamento
// acontece ao salvar, ver salvarTemplateEstrutura abaixo.
export async function editarTemplateEstruturaSelecionado() {
    const id = document.getElementById('estr-template-id')?.value;
    if (!id) {
        mostrarAviso('Escolha um template pra editar.');
        return;
    }
    const template = db.templatesEstrutura.find((t) => t.id == id);
    if (!template) return;
    await garantirModal('modal-template-estrutura');
    templateEmEdicaoId = template.id;
    templateUnidadesEdicao = (template.unidades || []).map((u) => ({
        id: gerarId(),
        unidadeEstrofica: u.unidadeEstrofica || '',
        unidadeDiscursiva: u.unidadeDiscursiva || '',
    }));
    templateEventosEdicao = (template.eventos || []).map((e) => ({
        id: gerarId(),
        progressaoDialetica: e.progressaoDialetica || '',
    }));
    document.getElementById('tpl-nome').value = template.nome || '';
    const aviso = document.getElementById('tpl-aviso-padrao');
    if (aviso) aviso.classList.toggle('hidden', !template.embutido);
    renderListaTemplateUnidades();
    renderListaTemplateEventos();
    toggleModal('modal-template-estrutura');
}

// Salva as alterações do Template em edição. Renomear um embutido vira
// um "fork": a cópia editada perde `embutido` (some o "(padrão)" e a
// prioridade no topo da lista) e o original de fábrica volta a ser
// recriado sozinho no próximo carregamento, sob o nome antigo (mesma
// checagem por nome+embutido de migrarTemplatesEstruturaEmbutidos em
// db.js) — assim não sobra um embutido com nome fora da lista de
// fábrica, o mesmo problema que gerou o "Soneto" órfão. Só mudar o
// conteúdo (Unidades/Eventos) sem renomear não dispara isso: o
// template embutido continua representando o mesmo nome, só que agora
// com a classificação sua.
export function salvarTemplateEstrutura() {
    const template = db.templatesEstrutura.find((t) => t.id == templateEmEdicaoId);
    if (!template) return;
    const novoNome = (document.getElementById('tpl-nome')?.value || '').trim();
    if (!novoNome) {
        mostrarAviso('Dê um nome ao Template antes de salvar.');
        return;
    }
    if (templateUnidadesEdicao.length === 0 && templateEventosEdicao.length === 0) {
        mostrarAviso('O Template precisa de ao menos uma Unidade ou Evento.');
        return;
    }
    if (template.embutido && novoNome !== template.nome) {
        template.embutido = false;
    }
    template.nome = novoNome;
    template.unidades = templateUnidadesEdicao.map((u) => ({
        unidadeEstrofica: u.unidadeEstrofica,
        unidadeDiscursiva: u.unidadeDiscursiva,
    }));
    template.eventos = templateEventosEdicao.map((e) => ({
        progressaoDialetica: e.progressaoDialetica,
    }));
    save();
    popularSelectTemplatesEstrutura();
    const sel = document.getElementById('estr-template-id');
    if (sel) sel.value = template.id;
    toggleModal('modal-template-estrutura');
    mostrarAviso(`Template "${template.nome}" salvo.`, 'sucesso');
}

// Botão "🗑️" ao lado do seletor — mesmo fluxo de confirmação/desfazer
// do resto do app (deleteItem, db.js). Passa um callback pra refazer o
// select só depois que a exclusão for de fato confirmada (não antes —
// abrirModalExclusao só chama o onConfirmar depois do clique em
// "Excluir" no modal de confirmação).
export function excluirTemplateEstruturaSelecionado() {
    const id = document.getElementById('estr-template-id')?.value;
    if (!id) {
        mostrarAviso('Escolha um template pra excluir.');
        return;
    }
    deleteItem('templatesEstrutura', id, () => {
        popularSelectTemplatesEstrutura();
        const sel = document.getElementById('estr-template-id');
        if (sel) sel.value = '';
    });
}

// Datalists dos 3 campos livres crescem com o que já foi usado no
// acervo, além de um ponto de partida com os valores do template
// Soneto (mesmo espírito de atualizarDatalistIntertexto em editor.js,
// versão mais simples — sem filtrar por tipo, já que não há campo
// dependente aqui, ver decisão de design 1 do .md).
function atualizarDatalistsEstruturaTextual() {
    const valoresUnicos = (extrator) => {
        const vistos = new Set();
        db.estruturasTextuais.forEach((e) => {
            (e.unidades || []).forEach((u) => {
                const v = extrator(u);
                if (v) vistos.add(v);
            });
            (e.eventos || []).forEach((ev) => {
                const v = extrator(ev);
                if (v) vistos.add(v);
            });
        });
        return [...vistos].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    };
    const preencher = (id, base, valores) => {
        const datalist = document.getElementById(id);
        if (!datalist) return;
        datalist.innerHTML = [...new Set([...base, ...valores])]
            .map((v) => `<option value="${escapeHtml(v)}">`)
            .join('');
    };
    preencher(
        'sugestoes-unidade-estrofica',
        ['Oitava', 'Sexteto', 'Quartetos', 'Tercetos', 'Dístico'],
        valoresUnicos((i) => i.unidadeEstrofica),
    );
    preencher(
        'sugestoes-unidade-discursiva',
        ['Proposição', 'Resolução'],
        valoresUnicos((i) => i.unidadeDiscursiva),
    );
    preencher(
        'sugestoes-progressao-dialetica',
        ['Tensão', 'Volta', 'Síntese'],
        valoresUnicos((i) => i.progressaoDialetica),
    );
}

// Mesmo padrão de atualizarAvisoPoemaSonoridade — avisa, não bloqueia
// (regra "no máximo um registro por poema" do .md).
function atualizarAvisoPoemaEstrutura() {
    const sel = document.getElementById('estr-poema-id');
    const aviso = document.getElementById('estr-poema-aviso');
    const idEmEdicao = document.getElementById('estr-edit-id')?.value;
    if (!sel || !aviso) return;
    const existente = sel.value ? getEstruturaDoPoema(parseInt(sel.value)) : null;
    if (existente && String(existente.id) !== String(idEmEdicao)) {
        aviso.textContent =
            'Esse poema já tem uma Progressão Morfofuncional cadastrada — salvar aqui substitui a existente.';
        aviso.classList.remove('hidden');
    } else {
        aviso.classList.add('hidden');
    }
}

// Trocar de poema no meio da edição recalcula as estrofes derivadas do
// texto novo, mas preserva a classificação já digitada nesta sessão do
// modal (trocar de poema não deveria descartar Unidades/Eventos que a
// pessoa já cadastrou, mesmo que a posição marcada não faça mais
// sentido no texto novo — ela ajusta na mão).
function carregarEstrofesDoPoemaEstrutura() {
    const poemaId = parseInt(document.getElementById('estr-poema-id')?.value);
    const poema = db.poemas.find((p) => p.id == poemaId) || null;
    const linhasIgnoradas = document.getElementById('estr-linhas-ignoradas')?.value || '';
    inicializarEstruturaTextual(
        document.getElementById('estr-lista-unidades'),
        document.getElementById('estr-lista-eventos'),
        poema,
        { unidades: obterUnidadesAtuais(), eventos: obterEventosAtuais() },
        linhasIgnoradas,
    );
    atualizarAvisoPoemaEstrutura();
}

// Contraparte de carregarEstrofesDoPoemaEstrutura acima, só pro campo
// "Linhas a ignorar" (poema continua o mesmo, só o recorte de linhas
// muda) — usa recalcularEstrofesLinhasIgnoradas em vez de
// inicializarEstruturaTextual pra RECONCILIAR a posição já marcada nas
// Unidades/Eventos existentes contra as novas estrofes, em vez de só
// preservá-la como está (bug reportado pelo Victor: unidade criada
// antes de preencher o campo continuava "marcada" numa estrofe que,
// depois de ignorar a linha, passou a significar outro trecho do
// texto). Trocar de poema continua sem reconciliar — decisão
// deliberada, ver comentário de carregarEstrofesDoPoemaEstrutura no
// .md (o Victor prefere ajustar a posição na mão nesse caso).
function recalcularLinhasIgnoradasEstrutura() {
    const poemaId = parseInt(document.getElementById('estr-poema-id')?.value);
    const poema = db.poemas.find((p) => p.id == poemaId) || null;
    const linhasIgnoradas = document.getElementById('estr-linhas-ignoradas')?.value || '';
    recalcularEstrofesLinhasIgnoradas(poema, linhasIgnoradas);
    atualizarAvisoPoemaEstrutura();
}

// Abre o modal pra uma Progressão NOVA — a contraparte de
// editarEstruturaTextual abaixo. Função própria (em vez de reaproveitar
// prepararNovo(tipo) de ui.js) pelo mesmo motivo de
// prepararNovaSonoridade: precisa repopular selects a cada abertura.
export async function prepararNovaEstruturaTextual() {
    await garantirModal('modal-morfofuncionalidade');
    const form = document.getElementById('form-estrutura-textual');
    if (!form) return;
    form.reset();
    document.getElementById('estr-edit-id').value = '';
    document.getElementById('modal-morfofuncionalidade-titulo').innerText = 'Adicionar Progressão';
    document.getElementById('estr-linhas-ignoradas').value = '';
    popularSelectPoemasEstrutura();
    popularSelectTemplatesEstrutura();
    atualizarDatalistsEstruturaTextual();
    inicializarEstruturaTextual(
        document.getElementById('estr-lista-unidades'),
        document.getElementById('estr-lista-eventos'),
        null,
        null,
    );
    atualizarAvisoPoemaEstrutura();
    toggleModal('modal-morfofuncionalidade');
}

export async function editarEstruturaTextual(id) {
    const estrutura = db.estruturasTextuais.find((x) => x.id == id);
    if (!estrutura) return;
    await garantirModal('modal-morfofuncionalidade');
    document.getElementById('estr-edit-id').value = estrutura.id;
    document.getElementById('modal-morfofuncionalidade-titulo').innerText = 'Editar Progressão';
    document.getElementById('estr-linhas-ignoradas').value = estrutura.linhasIgnoradas || '';
    popularSelectPoemasEstrutura(estrutura.poemaId);
    popularSelectTemplatesEstrutura();
    atualizarDatalistsEstruturaTextual();
    const poema = db.poemas.find((p) => p.id == estrutura.poemaId) || null;
    inicializarEstruturaTextual(
        document.getElementById('estr-lista-unidades'),
        document.getElementById('estr-lista-eventos'),
        poema,
        estrutura,
        estrutura.linhasIgnoradas || '',
    );
    atualizarAvisoPoemaEstrutura();
    toggleModal('modal-morfofuncionalidade');
}

// Botão "Aplicar" da seção Templates — concatena (não substitui) com o
// que já está no estado (regra 8 do .md).
export function aplicarTemplateEstruturaTextual() {
    const id = document.getElementById('estr-template-id')?.value;
    if (!id) return;
    const template = db.templatesEstrutura.find((t) => t.id == id);
    if (!template) return;
    aplicarTemplateNoEstado(template);
}

export function adicionarUnidadeEstruturaTextual() {
    const nomeEl = document.getElementById('estr-nova-unidade-nome');
    const estroficaEl = document.getElementById('estr-nova-unidade-estrofica');
    const discursivaEl = document.getElementById('estr-nova-unidade-discursiva');
    adicionarUnidade(nomeEl?.value || '', estroficaEl?.value || '', discursivaEl?.value || '');
    if (nomeEl) nomeEl.value = '';
    if (estroficaEl) estroficaEl.value = '';
    if (discursivaEl) discursivaEl.value = '';
    atualizarDatalistsEstruturaTextual();
}

export function adicionarEventoEstruturaTextual() {
    const el = document.getElementById('estr-novo-evento');
    adicionarEvento(el?.value || '');
    if (el) el.value = '';
    atualizarDatalistsEstruturaTextual();
}

// Botão "Salvar como Template" — extrai só a classificação atual
// (regra 8: nunca a posição) e pede um nome.
export function salvarComoTemplateEstruturaTextual() {
    const unidades = obterUnidadesAtuais();
    const eventos = obterEventosAtuais();
    if (unidades.length === 0 && eventos.length === 0) {
        mostrarAviso('Classifique ao menos uma Unidade ou Evento antes de salvar como Template.');
        return;
    }
    const nome = (prompt('Nome do Template:') || '').trim();
    if (!nome) return;
    db.templatesEstrutura.push({
        id: gerarId(),
        nome,
        embutido: false,
        ...extrairClassificacaoParaTemplate(unidades, eventos),
    });
    save();
    popularSelectTemplatesEstrutura();
    mostrarAviso(`Template "${nome}" salvo.`, 'sucesso');
}

// Enter, dentro de qualquer um dos 3 campos de adicionar Unidade/Evento
// (regra: unidade estrófica, unidade discursiva e progressão dialética
// nunca fecham o modal ao dar Enter — adicionam o item, como clicar no
// "+"). Sem isso, Enter cai no submit nativo do <form> (o botão
// SALVAR é type="submit"), fechando o modal em vez de adicionar.
function initEnterAdicionaEstruturaTextual() {
    const camposUnidade = [
        'estr-nova-unidade-nome',
        'estr-nova-unidade-estrofica',
        'estr-nova-unidade-discursiva',
    ];
    camposUnidade.forEach((id) => {
        document.getElementById(id)?.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            adicionarUnidadeEstruturaTextual();
        });
    });
    document.getElementById('estr-novo-evento')?.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        adicionarEventoEstruturaTextual();
    });
}

export function initFormEstruturaTextual() {
    const selPoema = document.getElementById('estr-poema-id');
    if (selPoema) selPoema.onchange = carregarEstrofesDoPoemaEstrutura;

    document.getElementById('estr-linhas-ignoradas')?.addEventListener('change', () => {
        recalcularLinhasIgnoradasEstrutura();
    });

    initEnterAdicionaEstruturaTextual();

    const form = document.getElementById('form-estrutura-textual');
    if (!form) return;

    form.onsubmit = (e) => {
        e.preventDefault();
        const id = document.getElementById('estr-edit-id').value;
        const poemaId = parseInt(document.getElementById('estr-poema-id').value);
        if (!poemaId) return;

        // Substitui a Progressão existente do poema (se houver e não for
        // a que já está em edição), em vez de criar uma segunda — mesmo
        // padrão de Sonoridade (ver form.onsubmit de initFormSonoridade).
        const existente = getEstruturaDoPoema(poemaId);
        const idAlvo = id ? parseInt(id) : existente ? existente.id : gerarId();

        const dados = {
            id: idAlvo,
            poemaId,
            linhasIgnoradas: document.getElementById('estr-linhas-ignoradas')?.value || '',
            unidades: obterUnidadesAtuais(),
            eventos: obterEventosAtuais(),
        };

        const anterior = db.estruturasTextuais.find((x) => x.id == idAlvo);
        if (anterior) {
            const idx = db.estruturasTextuais.findIndex((x) => x.id == idAlvo);
            db.estruturasTextuais[idx] = dados;
        } else {
            db.estruturasTextuais.push(dados);
        }

        save();
        toggleModal('modal-morfofuncionalidade');
    };
}

export async function abrirModalMesclar(tipo, origemId) {
    const cfg = RENDER_MESCLAR[tipo];
    if (!cfg) return;
    const origem = db[tipo]?.find((x) => x.id == origemId);
    if (!origem) return;

    // Grupo e Época (Período Biográfico) são escopados por Autor desde
    // 27/09/2026 — mesclar só faz sentido dentro do mesmo Autor (ver
    // mesclarGrupos/mesclarEpocas em db.js), então as opções de destino
    // já vêm filtradas, em vez de deixar o usuário escolher um destino
    // que a mesclagem recusaria silenciosamente.
    const escopadoPorAutor = tipo === 'grupos' || tipo === 'epocas';
    const outras =
        tipo === 'locais'
            ? destinosDeMesclagemDeLocal(origemId).map((d) => ({ id: d.id, nome: d.rotulo }))
            : (db[tipo] || [])
                  .filter((x) => x.id != origemId)
                  .filter((x) => (escopadoPorAutor ? x.autorId == origem.autorId : true))
                  .filter((x) => (tipo === 'etiquetas' ? x.categoria === origem.categoria : true))
                  .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    if (outras.length === 0) {
        mostrarAviso(
            escopadoPorAutor
                ? `Não há outra ${cfg.rotulo.toLowerCase()} do mesmo Autor pra mesclar.`
                : `Não há outra ${cfg.rotulo.toLowerCase()} cadastrada pra mesclar.`,
        );
        return;
    }

    await garantirModal('modal-mesclar');
    document.getElementById('modal-mesclar-titulo').innerText = `Mesclar ${cfg.rotulo}`;
    document.getElementById('ms-tipo').value = tipo;
    document.getElementById('ms-origem-id').value = origemId;
    document.getElementById('ms-origem-nome').innerText = origem.nome;
    document.getElementById('ms-destino-id').innerHTML = outras
        .map((x) => `<option value="${x.id}">${escapeHtml(x.nome)}</option>`)
        .join('');
    toggleModal('modal-mesclar');
}

// ─── Parte ───────────────────────────────────────────────────

// Último envio dos formulários de Parte e de Seção: uma promessa de "salvou?"
// (true) ou "recusou" (false), como no Livro (ver `ultimoEnvioLivro`). Salvar é
// assíncrono (a imagem vai pro IndexedDB), então o "Salvar e ver" do olho espera
// por ela. `null` depois de `zerarUltimoEnvioParteSecao` significa que nenhum
// envio começou (validação nativa do navegador recusou, por exemplo o título vazio).
const enviosParteSecao = { parte: null, secao: null };

export function ultimoEnvioParteSecao(tipo) {
    return enviosParteSecao[tipo] ?? null;
}

export function zerarUltimoEnvioParteSecao(tipo) {
    enviosParteSecao[tipo] = null;
}

export function initFormParte() {
    const form = document.getElementById('form-parte');
    if (!form) return;

    rastreadorParte.observar(form);

    form.onsubmit = (e) => {
        e.preventDefault();
        enviosParteSecao.parte = salvarParteDoFormulario();
    };
}

// Devolve true quando salvou (e fechou o modal) e false quando recusou.
async function salvarParteDoFormulario() {
    const id = document.getElementById('part-edit-id').value;
    const imagemUrl = lerLinkImagem('part-imagem-url');
    if (imagemUrl === null) return false;
    const capaFile = document.getElementById('part-capa').files[0];
    const removerCapa = document.getElementById('part-remover-capa').checked;
    const capaAtual = id ? db.partes.find((x) => x.id == id)?.capa : null;
    let capaFinal;
    if (removerCapa) {
        await deletarCapa(capaAtual);
        capaFinal = null;
    } else {
        const novoCapaId = capaFile ? await salvarCapa(capaFile, capaAtual) : null;
        capaFinal = novoCapaId ?? capaAtual;
    }

    const dados = {
        id: id ? parseInt(id) : gerarId(),
        titulo: document.getElementById('part-titulo').value,
        livroId: document.getElementById('part-livro').value,
        sequencia: seqOuNull(document.getElementById('part-sequencia').value),
        capaDesc: document.getElementById('part-capa-desc').value,
        sobre: document.getElementById('part-sobre').value,
        abertura: document.getElementById('part-abertura').value,
        capa: capaFinal,
        imagemUrl,
    };

    const anterior = id ? db.partes.find((x) => x.id == id) : null;
    const posicaoAntiga =
        anterior && String(anterior.livroId) === String(dados.livroId)
            ? (anterior.sequencia ?? null)
            : null;

    if (id) db.partes[db.partes.findIndex((x) => x.id == id)] = dados;
    else db.partes.push(dados);

    // Se mudou de livro, fecha o buraco que deixou no livro antigo
    if (anterior && String(anterior.livroId) !== String(dados.livroId)) {
        fecharEspaco(getIrmaosTopoLivro(db, anterior.livroId), anterior.sequencia ?? null);
    }

    reordenarPosicao(getIrmaosTopoLivro(db, dados.livroId), dados, dados.sequencia, posicaoAntiga);

    save();
    rastreadorParte.marcarLimpo();
    toggleModal('modal-parte');
    return true;
}

const MAPA_PARTE = {
    id: 'part-edit-id',
    imagemUrl: 'part-imagem-url',
    titulo: 'part-titulo',
    livroId: 'part-livro',
    sequencia: 'part-sequencia',
    capaDesc: 'part-capa-desc',
    sobre: 'part-sobre',
    abertura: 'part-abertura',
};

export async function editarParte(id) {
    const p = db.partes.find((x) => x.id == id);
    if (!p) return;
    await garantirModal('modal-parte');
    renderDropdowns();

    preencherCampos(p, MAPA_PARTE);
    document.getElementById('part-capa').value = ''; // limpa seleção anterior — sem arquivo novo, preserva capa atual
    document.getElementById('part-remover-capa').checked = false;
    document.getElementById('modal-parte-titulo').innerText = 'Editar Parte';
    // Preencher por código não dispara 'input': o que está no form agora é o estado
    // inicial, não edição.
    rastreadorParte.marcarLimpo();
    // Parte já salva tem o que ver: mostra o olho do cabeçalho.
    document.getElementById('parte-ver')?.classList.remove('hidden');
    await toggleModal('modal-parte');
}

// ─── Seção ───────────────────────────────────────────────────

export function initFormSecao() {
    const form = document.getElementById('form-secao');
    if (!form) return;

    rastreadorSecao.observar(form);

    form.onsubmit = (e) => {
        e.preventDefault();
        enviosParteSecao.secao = salvarSecaoDoFormulario();
    };
}

// Devolve true quando salvou (e fechou o modal) e false quando recusou.
async function salvarSecaoDoFormulario() {
    const idInput = document.getElementById('sec-edit-id').value;
    const vinculo = document.getElementById('sec-vinculo').value;
    if (!vinculo) {
        mostrarAviso('Selecione um vínculo para a seção!');
        return false;
    }
    const imagemUrl = lerLinkImagem('sec-imagem-url');
    if (imagemUrl === null) return false;

    const [tipo, idPai] = vinculo.split(':');
    const id = idInput ? parseInt(idInput) : gerarId();
    const capaFile = document.getElementById('sec-capa').files[0];
    const removerCapa = document.getElementById('sec-remover-capa').checked;
    const capaAtual = idInput ? db.secoes.find((x) => x.id == id)?.capa : null;
    let capaFinal;
    if (removerCapa) {
        await deletarCapa(capaAtual);
        capaFinal = null;
    } else {
        const novoCapaId = capaFile ? await salvarCapa(capaFile, capaAtual) : null;
        capaFinal = novoCapaId ?? capaAtual;
    }

    const dados = {
        id,
        titulo: document.getElementById('sec-titulo').value,
        paiTipo: tipo,
        paiId: idPai,
        sobre: document.getElementById('sec-sobre').value,
        abertura: document.getElementById('sec-abertura').value,
        sequencia: seqOuNull(document.getElementById('sec-sequencia')?.value),
        capaDesc: document.getElementById('sec-capa-desc').value,
        capa: capaFinal,
        imagemUrl,
    };

    const anterior = idInput ? db.secoes.find((x) => x.id == id) : null;
    const mesmoEscopo =
        anterior &&
        anterior.paiTipo === dados.paiTipo &&
        String(anterior.paiId) === String(dados.paiId);
    const posicaoAntiga = mesmoEscopo ? (anterior.sequencia ?? null) : null;

    if (idInput) {
        const idx = db.secoes.findIndex((x) => x.id == id);
        if (idx !== -1) db.secoes[idx] = dados;
    } else {
        db.secoes.push(dados);
    }

    if (anterior && !mesmoEscopo) {
        fecharEspaco(
            getIrmaosPorEscopo(db, anterior.paiTipo, anterior.paiId),
            anterior.sequencia ?? null,
        );
    }
    reordenarPosicao(
        getIrmaosPorEscopo(db, dados.paiTipo, dados.paiId),
        dados,
        dados.sequencia,
        posicaoAntiga,
    );

    save();
    rastreadorSecao.marcarLimpo();
    toggleModal('modal-secao');
    return true;
}

const MAPA_SECAO = {
    id: 'sec-edit-id',
    imagemUrl: 'sec-imagem-url',
    titulo: 'sec-titulo',
    sequencia: 'sec-sequencia',
    sobre: 'sec-sobre',
    abertura: 'sec-abertura',
    capaDesc: 'sec-capa-desc',
};

export async function editarSecao(id) {
    const s = db.secoes.find((x) => x.id == id);
    if (!s) return;
    await garantirModal('modal-secao');
    renderDropdowns();

    preencherCampos(s, MAPA_SECAO);
    document.getElementById('sec-vinculo').value = `${s.paiTipo}:${s.paiId}`;
    document.getElementById('sec-capa').value = '';
    document.getElementById('sec-remover-capa').checked = false;
    document.getElementById('modal-secao-titulo').innerText = 'Editar Seção';
    rastreadorSecao.marcarLimpo();
    // Seção já salva tem o que ver: mostra o olho do cabeçalho.
    document.getElementById('secao-ver')?.classList.remove('hidden');
    await toggleModal('modal-secao');
}

// ─── Poema ───────────────────────────────────────────────────

// Desliga/liga visualmente os campos De/Até de Época Retratada quando o
// checkbox N/A é marcado/desmarcado — os valores digitados neles são
// ignorados no submit se N/A estiver marcado (ver initFormPoema), então
// desabilitar é só pra deixar isso claro em tela, não uma trava de dados.
export function toggleCamposEpocaNa() {
    const na = document.getElementById('p-epoca-na')?.checked;
    ['p-epoca-ini', 'p-epoca-fim'].forEach((prefixo) => {
        ['dia', 'mes', 'ano'].forEach((parte) => {
            const el = document.getElementById(`${prefixo}-${parte}`);
            if (el) el.disabled = !!na;
        });
    });
}

// Botão "+" (ou Enter, ou sair do campo) do Período Biográfico Retratado:
// acrescenta o período à lista do texto e, se o nome já existe no cadastro,
// sugere as datas e o contexto do texto mais recente com ele (só nos campos
// vazios, ver aplicarSugestaoEpoca).
export function adicionarEpocaRetratadaComSugestao(tabela, valor = null, tipo = 'periodos') {
    const nome = adicionarEpocaRetratadaDoTexto(tabela, valor, tipo);
    if (!nome) return;
    if (tabela === 'prosas') aplicarSugestaoEpocaProsa(nome);
    else aplicarSugestaoEpoca(nome);
}

// Lista de itens do campo (`{ epocaId, recorte }` ou `{ novo, recorte }`) ->
// `epocaRetratada.periodos`, sem repetir. Período novo é criado no cadastro
// agora, ao salvar o texto, para o primeiro Autor dele; sem Autor, não dá para
// criar (avisa), mas o resto do formulário segue.
function periodosRetratadosDosItens(itens, autorId) {
    const lista = [];
    let faltouAutor = false;
    (itens || []).forEach((i) => {
        let epocaId = i.epocaId ?? null;
        if (i.novo !== undefined) {
            if (!autorId) {
                faltouAutor = true;
                return;
            }
            epocaId =
                obterOuCriarEpocaPorNome(i.novo, autorId, { evento: i.evento === true })?.id ??
                null;
        }
        if (epocaId == null || lista.some((x) => x.epocaId == epocaId)) return;
        lista.push({ epocaId, recorte: i.recorte || null });
    });
    if (faltouAutor) {
        mostrarAviso('Adicione um Autor ao texto antes de criar um Período Biográfico novo.');
    }
    return lista;
}

// Aplica a sugestão automática de datas/contexto ao repetir um nome de
// período já usado (ver p-epoca-nome em modal-poema.html) — só entra
// nos campos que estiverem vazios (De/Até de Época Retratada e Contexto
// Histórico/Pessoal), nunca sobrescrevendo o que já foi digitado. O
// nome digitado só dispara sugestão se já existir uma Época cadastrada
// com esse nome exato (db.epocas) — nome novo não tem histórico ainda
// pra sugerir. Ver obterSugestaoEpocaPorId em utils.js pra critério de
// "mais recente".
export function aplicarSugestaoEpoca(nomeArg = null) {
    const nome = (nomeArg ?? document.getElementById('p-epoca-nome')?.value ?? '').trim();
    if (!nome) return;
    const epoca = db.epocas.find((e) => e.nome === nome);
    if (!epoca) return;
    // Item 4: Época é cadastro central compartilhado (item 3) — busca no
    // texto mais recente com esse epocaId em Poemas E Prosas, não só
    // Poemas, já que uma prosa pode ter documentado o período primeiro.
    const sugestao = obterSugestaoEpocaPorId([...db.poemas, ...(db.prosas || [])], epoca.id);
    if (!sugestao) return;
    preencherDataParcialSeVazio('p-epoca-ini', sugestao.inicio);
    preencherDataParcialSeVazio('p-epoca-fim', sugestao.fim);
    const contextoEl = document.getElementById('p-contexto');
    if (contextoEl && !contextoEl.value.trim() && sugestao.contextoHistorico) {
        contextoEl.value = sugestao.contextoHistorico;
    }
}

// ─── Fonte do texto (Poema/Prosa) ────────────────────────────
// `fonteTexto`: { origem, edicao, link, dataAcesso?, conferido, grafia } — de onde
// veio o texto (edição de terceiros, transcrição) + a ortografia em que
// foi transcrito. `grafia` é '' só quando o campo nunca foi definido —
// "Atual (padrão)" escolhido de propósito grava GRAFIA_ATUAL, um valor
// próprio, não '' (ver OPCOES_GRAFIA/GRAFIA_ATUAL em utils.js). Isso é
// o que permite ao `if` abaixo distinguir "nunca mexi em Fonte" (grafia
// também vazia, objeto vira null) de "só confirmei Atual e não preenchi
// mais nada" (grafia não-vazia, objeto é mantido). `prefixo` é 'p'
// (Poema) ou 'pr' (Prosa).
function lerFonteTexto(prefixo) {
    const origem = document.getElementById(`${prefixo}-fonte-origem`).value.trim();
    const edicao = document.getElementById(`${prefixo}-fonte-edicao`).value.trim();
    const link = document.getElementById(`${prefixo}-fonte-link`).value.trim();
    const conferido = document.getElementById(`${prefixo}-fonte-conferido`).checked;
    const grafia = document.getElementById(`${prefixo}-fonte-grafia`)?.value || '';
    // Data de acesso: só com link, e a chave só existe quando preenchida.
    const dataAcesso = link
        ? document.getElementById(`${prefixo}-fonte-data-acesso`)?.value || ''
        : '';
    if (!origem && !edicao && !link && !conferido && !grafia) return null;
    return { origem, edicao, link, ...(dataAcesso ? { dataAcesso } : {}), conferido, grafia };
}

function preencherFonteTexto(prefixo, fonte) {
    document.getElementById(`${prefixo}-fonte-origem`).value = fonte?.origem || '';
    document.getElementById(`${prefixo}-fonte-edicao`).value = fonte?.edicao || '';
    document.getElementById(`${prefixo}-fonte-link`).value = fonte?.link || '';
    const dataAcessoEl = document.getElementById(`${prefixo}-fonte-data-acesso`);
    if (dataAcessoEl) dataAcessoEl.value = fonte?.dataAcesso || '';
    document.getElementById(`${prefixo}-fonte-conferido`).checked = !!fonte?.conferido;
    const selGrafia = document.getElementById(`${prefixo}-fonte-grafia`);
    if (selGrafia) selGrafia.value = fonte?.grafia || '';
}

// A âncora do Eco (ancora-eco-ui.js) precisa saber do que só o editor sabe: o
// que está no modal ainda sem salvar e qual texto está aberto (F11-D6).
registrarProvedorAncora({
    estadoModal: (tabela) => ({
        personagens: lerPersonagens(tabela),
        pessoas: obterPessoas(tabela),
    }),
    ecosDoModal: (tabela) => obterEcos(tabela),
    textoId: (tabela) => {
        const prefixo = tabela === 'poemas' ? 'p' : 'pr';
        const v = document.getElementById(`${prefixo}-edit-id`)?.value;
        return v ? parseInt(v, 10) : null;
    },
    repintarEcos: (tabela) => repintarEcos(tabela),
});

export function initFormPoema() {
    const form = document.getElementById('form-poema');
    if (!form) return;

    rastreadorPoema.observar(form);
    iniciarGrupoPersonagens('poemas');
    iniciarAncoraEco();

    form.onsubmit = (e) => {
        e.preventDefault();

        const idInput = document.getElementById('p-edit-id').value;
        const id = idInput ? parseInt(idInput) : gerarId();

        // Períodos Históricos Retratados (0 a N): os chips do campo, mais o
        // que ficou digitado sem apertar "+". Nome ambíguo (homônimos) já foi
        // avisado ao adicionar e fica no campo, então não salva até escolher.
        const periodosHistoricosItens = obterPeriodosHistoricosDoTexto('poemas');
        if (
            ['p-periodo-historico-nome', 'p-evento-historico-nome'].some((campo) =>
                (document.getElementById(campo)?.value || '').trim(),
            )
        )
            return;
        const destino = document.getElementById('p-destino').value;

        let paiTipo = null,
            paiId = null;
        if (destino) {
            const partes = destino.split(':');
            paiTipo = partes[0];
            paiId = parseInt(partes[1]);
        }

        const dataEscrita = lerDataParcial('p-data-esc');
        const dataPublicacao = lerDataParcial('p-data-pub');
        // Metadados de arquivo (Word etc.) frequentemente dão só uma data
        // aproximada, ou selecionada por contexto — a maioria do acervo
        // é assim, por isso o padrão é "não exata" (ver colunas.js/render-listas.js).
        if (dataEscrita) dataEscrita.exata = document.getElementById('p-data-esc-exata').checked;

        if (violaOrdemDeDatas(dataEscrita, dataPublicacao)) {
            return mostrarAviso(
                'A Data de Primeira Publicação não pode ser anterior à Data de Escrita.',
            );
        }

        // Época Retratada é um intervalo (não um ponto no tempo), com um
        // terceiro estado além de "preenchido"/"vazio": N/A marcado é uma
        // exclusão deliberada, distinta de "ainda não categorizado" (o
        // campo inteiro fica null). O nome digitado é resolvido/criado no
        // cadastro central db.epocas (mesmo caminho de
        // obterOuCriarAutorPorNome) — ver formatarEpocaRetratada em
        // utils.js.
        const epocaNa = document.getElementById('p-epoca-na').checked;
        const epocasItens = obterEpocasRetratadasDoTexto('poemas');
        const epocaInicio = lerDataParcial('p-epoca-ini');
        const epocaFim = lerDataParcial('p-epoca-fim');

        if (violaOrdemDeDatas(epocaInicio, epocaFim)) {
            return mostrarAviso(
                'O "Até" do Período Biográfico Retratado não pode ser anterior ao "De".',
            );
        }

        // Época pertence a um Autor desde 27/09/2026 — usa o primeiro
        // Autor do texto como dono de uma Época nova criada aqui (mesmo
        // critério de criarGrupoDeGruposDiretos.adicionar em editor.js,
        // pro campo irmão "Grupos (referência direta)"). Sem nenhum
        // Autor ainda no texto, não dá pra criar — mas dá pra deixar o
        // resto do formulário seguir; só a Época em si fica de fora.
        const autorIdEpoca = obterAutoria('poemas')[0]?.autorId ?? null;
        const epocasPeriodos = periodosRetratadosDosItens(epocasItens, autorIdEpoca);

        // Vários períodos por texto: o recorte é de cada período (nos chips);
        // De/Até e N/A valem para o texto inteiro.
        const epocaRetratada =
            epocaNa || epocaInicio || epocaFim || epocasPeriodos.length
                ? {
                      periodos: epocasPeriodos,
                      inicio: epocaInicio,
                      fim: epocaFim,
                      na: epocaNa,
                  }
                : null;

        // Período Histórico: campo solto e simples (só nome, sem
        // datas/recorte próprios — diferente de epocaRetratada acima),
        // resolvido/criado no cadastro central db.periodosHistoricos do
        // mesmo jeito que Época. Coexiste com epocaRetratada no mesmo
        // texto (ver calcularImpactoExclusaoPeriodoHistorico em db.js).
        const periodosHistoricosIds = periodosHistoricosDosItens(periodosHistoricosItens);

        const dados = {
            id,
            titulo: document.getElementById('p-titulo').value,
            texto: document.getElementById('p-texto').value,
            paiTipo,
            paiId,
            sequencia: seqOuNull(document.getElementById('p-sequencia').value),
            ...idiomasParaSalvar('poemas'),
            ...jargaoGiriaParaSalvar('poemas'),
            dataEscrita,
            dataPublicacao,
            ano: dataEscrita?.ano || '', // mantido por compatibilidade (ordenação/estatísticas/exportação)
            livrosIds: Array.from(document.getElementById('p-livros').selectedOptions).map((o) =>
                parseInt(o.value),
            ),
            conceitos: {
                elos: obterElos('poemas'),
                ecos: obterEcos('poemas'),
            },
            notas: document.getElementById('p-notas').value,
            ...etiquetasParaSalvar('p'),
            ...temasParaSalvar('poemas'),
            ...locaisParaSalvar('poemas'),
            personagens: obterPersonagens('poemas'),
            pessoas: obterPessoas('poemas'),
            gruposDiretos: obterGruposDiretos('poemas'),
            autoria: obterAutoria('poemas'),
            envios: obterEnvios('poemas'),
            reconhecimentos: obterReconhecimentos('poemas'),
            autoavaliacao: document.getElementById('p-autoavaliacao').value,
            autoclassificacao: Number(document.getElementById('p-autoclassificacao').value) || 0,
            status: document.getElementById('p-status').value,
            epocaRetratada,
            periodosHistoricosIds,
            movimentosEscolasIds: obterMovimentosEscolasDiretos('poemas'),
            intertextualidade: obterIntertextualidade('poemas'),
            hipertextualidade: obterHipertextualidade('poemas'),
            referenciasExternas: obterReferenciasExternas('poemas'),
            anexos: obterAnexos('poemas'),
            anexosNotaGeral: document.getElementById('p-anexos-nota-geral').value,
            anotacoesMarginais: obterAnotacoes(),
            descricaoVisual: document.getElementById('p-visual').value,
            contextoHistorico: document.getElementById('p-contexto').value,
            ocultacao: document.getElementById('p-ocultacao').value,
            conteudoSensivel: document.getElementById('p-sensivel').value,
            vocabularioHiperacionante: document.getElementById('p-hiperacionante').value,
            cortadoDe: lerLivroSecao('p-cortado-livro', 'p-cortado-secao'),
            lancadoEm: lerLivroSecao('p-lancado-livro', 'p-lancado-secao'),
            justificativaMigracao: document.getElementById('p-migracao-justificativa').value,
            descarte: document.getElementById('p-descarte').value,
            pendencia: document.getElementById('p-pendencia').value,
            fonteTexto: lerFonteTexto('p'),
        };

        // Aviso não-bloqueante: os campos de Migração e Descarte só fazem
        // sentido junto do status correspondente. Não impede salvar — só
        // avisa, pra não travar o fluxo caso o texto seja escrito antes de
        // trocar o status, ou o status mude sem que o campo seja limpo.
        if (
            (dados.cortadoDe || dados.lancadoEm || dados.justificativaMigracao.trim()) &&
            dados.status !== 'migrado'
        ) {
            mostrarAvisoComAcao(
                'Migração entre livros preenchida, mas o status não é "Migrado".',
                'Reabrir',
                () => editarPoema(dados.id),
            );
        }
        if (dados.descarte.trim() && dados.status !== 'descartado') {
            mostrarAvisoComAcao(
                'Descarte preenchido, mas o status não é "Descartado".',
                'Reabrir',
                () => editarPoema(dados.id),
            );
        }

        const anterior = idInput ? db.poemas.find((x) => x.id == id) : null;
        const mesmoEscopo =
            anterior &&
            anterior.paiTipo === dados.paiTipo &&
            String(anterior.paiId) === String(dados.paiId);
        const posicaoAntiga = mesmoEscopo ? (anterior.sequencia ?? null) : null;

        if (idInput) {
            const idx = db.poemas.findIndex((x) => x.id == id);
            if (idx !== -1) db.poemas[idx] = dados;
        } else {
            db.poemas.push(dados);
        }

        // Remoções de âncora que atingem Ecos de outros textos (escolhidas no aviso
        // ao tirar um personagem/pessoa) só valem agora, ao salvar.
        aplicarPendenciasAncora('poemas');

        // Poema avulso (sem destino) não disputa posição com nada
        if (anterior && !mesmoEscopo && anterior.paiTipo && anterior.paiId) {
            fecharEspaco(
                getIrmaosPorEscopo(db, anterior.paiTipo, anterior.paiId),
                anterior.sequencia ?? null,
            );
        }
        if (dados.paiTipo && dados.paiId) {
            reordenarPosicao(
                getIrmaosPorEscopo(db, dados.paiTipo, dados.paiId),
                dados,
                dados.sequencia,
                posicaoAntiga,
            );
        }

        // Só quando este Poema é NOVO (nunca numa edição comum) — evita
        // que editar um Poema qualquer, com uma promoção pendente por
        // engano, acabe promovendo um Molde que não tem nada a ver com
        // ele (ver aplicarPromocaoMoldeSePendente, seção Molde acima).
        if (!idInput) aplicarPromocaoMoldeSePendente(dados.id);

        save();
        rastreadorPoema.marcarLimpo();
        toggleModal('modal-poema');
        resetSinalizacoes('poemas');
        resetTemasTexto('poemas');
        resetLocaisTexto('poemas');
        resetIdiomasTexto('poemas');
        resetJargaoGiriaTexto('poemas');
        resetPersonagens('poemas');
        resetPessoas('poemas');
        resetGruposDiretos('poemas');
        resetAutoria('poemas');
        resetEnvios('poemas');
        resetReconhecimentos('poemas');
        form.reset();
    };
}

const MAPA_POEMA = {
    id: 'p-edit-id',
    titulo: 'p-titulo',
    texto: 'p-texto',
    sequencia: 'p-sequencia',
    notas: 'p-notas',
    autoavaliacao: 'p-autoavaliacao',
    autoclassificacao: ['p-autoclassificacao', 0],
    anexosNotaGeral: 'p-anexos-nota-geral',
    status: 'p-status', // select — preencherCampos seta .value por já não ser checkbox
    descricaoVisual: 'p-visual',
    contextoHistorico: 'p-contexto',
    ocultacao: 'p-ocultacao',
    conteudoSensivel: 'p-sensivel',
    vocabularioHiperacionante: 'p-hiperacionante',
    descarte: 'p-descarte',
    pendencia: 'p-pendencia',
};

export async function editarPoema(id) {
    const p = db.poemas.find((x) => x.id == id);
    if (!p) return;
    // Nunca herda uma promoção de Molde pendente (ex.: o Victor abriu a
    // promoção, mudou de ideia e foi editar outro Poema qualquer antes
    // de salvar o de promoção) — ver moldePromovendoContexto acima.
    limparPromocaoMoldeEmCurso();
    await garantirModal('modal-poema');

    renderDropdowns();
    atualizarDatalist();

    preencherCampos(p, MAPA_POEMA);
    renderAutoclassificacao('poemas');
    preencherDataParcial('p-data-esc', p.dataEscrita);
    preencherDataParcial('p-data-pub', p.dataPublicacao);
    document.getElementById('p-data-esc-exata').checked = !!p.dataEscrita?.exata;
    preencherDataParcial('p-epoca-ini', p.epocaRetratada?.inicio);
    preencherDataParcial('p-epoca-fim', p.epocaRetratada?.fim);
    document.getElementById('p-epoca-na').checked = !!p.epocaRetratada?.na;
    document.getElementById('p-epoca-nome').value = '';
    document.getElementById('p-evento-biografico-nome').value = '';
    document.getElementById('p-evento-historico-nome').value = '';
    carregarEpocasRetratadasDoTexto('poemas', periodosBiograficosDoItem(p));
    toggleCamposEpocaNa();
    document.getElementById('p-periodo-historico-nome').value = '';
    carregarPeriodosHistoricosDoTexto('poemas', p.periodosHistoricosIds || []);
    carregarMovimentosEscolasDiretos('poemas', p.movimentosEscolasIds || []);
    document.getElementById('p-intertexto-tipo').value = '';
    document.getElementById('p-intertexto-texto').value = '';
    carregarIntertextualidade('poemas', p.intertextualidade || []);
    document.getElementById('p-hipertexto-tipo').value = '';
    document.getElementById('p-hipertexto-relacao').value = '';
    document.getElementById('p-hipertexto-hipotexto').value = '';
    carregarHipertextualidade('poemas', p.hipertextualidade || []);
    document.getElementById('p-refext-tipo').value = '';
    document.getElementById('p-refext-texto').value = '';
    carregarReferenciasExternas('poemas', p.referenciasExternas || []);
    carregarElos('poemas', p.conceitos?.elos || []);
    carregarEcos('poemas', p.conceitos?.ecos || []);
    renderPainelElosDerivados(p.id);
    document.getElementById('p-anexo-tipo').value = '';
    document.getElementById('p-anexo-link').value = '';
    document.getElementById('p-anexo-link-texto').value = '';
    document.getElementById('p-anexo-data-acesso').value = '';
    carregarAnexos('poemas', p.anexos || p.ilustracoes || []);
    document.getElementById('p-anotacao-trecho').value = '';
    document.getElementById('p-anotacao-posicao').value = '';
    document.getElementById('p-anotacao-fonte').value = '';
    carregarAnotacoes(p.anotacoesMarginais || []);
    document.getElementById('p-cortado-livro').value = p.cortadoDe?.livro || '';
    document.getElementById('p-cortado-secao').value = p.cortadoDe?.secao || '';
    document.getElementById('p-lancado-livro').value = p.lancadoEm?.livro || '';
    document.getElementById('p-lancado-secao').value = p.lancadoEm?.secao || '';
    document.getElementById('p-migracao-justificativa').value = p.justificativaMigracao || '';
    preencherFonteTexto('p', p.fonteTexto);
    // .value= direto não dispara 'input' — reaplica o filtro de Seção
    // manualmente pros 4 campos que acabaram de ser preenchidos.
    atualizarFiltroSecoesMigracao();
    sincronizarFiltroDestino(
        'p-destino-filtro',
        'p-destino',
        p.paiTipo && p.paiId ? `${p.paiTipo}:${p.paiId}` : '',
    );

    const setM = (elId, vals) => {
        const el = document.getElementById(elId);
        if (!el) return;
        const arr = Array.isArray(vals) ? vals.map(String) : [];
        Array.from(el.options).forEach((opt) => {
            opt.selected = arr.includes(String(opt.value));
        });
    };

    setM('p-livros', p.livrosIds || []);

    carregarSinalizacoes('poemas', p);
    carregarTemasTexto('poemas', p);
    carregarLocaisTexto('poemas', p);
    carregarIdiomasTexto('poemas', p);
    carregarJargaoGiriaTexto('poemas', p);
    carregarPersonagens('poemas', p.personagens);
    carregarPessoas('poemas', p.pessoas);
    carregarGruposDiretos('poemas', p.gruposDiretos);
    carregarAutoria('poemas', p.autoria);
    carregarEnvios('poemas', p.envios);
    carregarReconhecimentos('poemas', p.reconhecimentos);
    renderColetaneasInfo('p-coletaneas-info', 'poema', p.id);
    document.getElementById('modal-poema-titulo').innerText = 'Editar Poema';
    // O olho (abrir o Ver) só existe para poema já salvo.
    document.getElementById('poema-ver')?.classList.remove('hidden');
    toggleModal('modal-poema');
}

// ─── Prosa ───────────────────────────────────────────────────
// Item 4: Prosa ganha os mesmos campos de Poema — ver toggleCamposEpocaNa/
// aplicarSugestaoEpoca acima pro comentário completo, mesma lógica aqui.

export function toggleCamposEpocaNaProsa() {
    const na = document.getElementById('pr-epoca-na')?.checked;
    ['pr-epoca-ini', 'pr-epoca-fim'].forEach((prefixo) => {
        ['dia', 'mes', 'ano'].forEach((parte) => {
            const el = document.getElementById(`${prefixo}-${parte}`);
            if (el) el.disabled = !!na;
        });
    });
}

export function aplicarSugestaoEpocaProsa(nomeArg = null) {
    const nome = (nomeArg ?? document.getElementById('pr-epoca-nome')?.value ?? '').trim();
    if (!nome) return;
    const epoca = db.epocas.find((e) => e.nome === nome);
    if (!epoca) return;
    // Época é cadastro central compartilhado (item 3) — a sugestão de
    // datas/contexto busca no texto mais recente com esse epocaId em
    // QUALQUER um dos dois arrays (não só Prosa), já que um poema pode
    // ter documentado o período primeiro. `obterSugestaoEpocaPorId`
    // ordena por id, e ids nunca colidem entre os dois tipos.
    const sugestao = obterSugestaoEpocaPorId([...db.poemas, ...(db.prosas || [])], epoca.id);
    if (!sugestao) return;
    preencherDataParcialSeVazio('pr-epoca-ini', sugestao.inicio);
    preencherDataParcialSeVazio('pr-epoca-fim', sugestao.fim);
    const contextoEl = document.getElementById('pr-contexto');
    if (contextoEl && !contextoEl.value.trim() && sugestao.contextoHistorico) {
        contextoEl.value = sugestao.contextoHistorico;
    }
}

export function initFormProsa() {
    const form = document.getElementById('form-prosa');
    if (!form) return;

    rastreadorProsa.observar(form);
    iniciarGrupoPersonagens('prosas');
    iniciarAncoraEco();

    form.onsubmit = (e) => {
        e.preventDefault();

        const idInput = document.getElementById('pr-edit-id').value;
        const id = idInput ? parseInt(idInput) : gerarId();

        // Períodos Históricos Retratados (0 a N): os chips do campo, mais o
        // que ficou digitado sem apertar "+". Nome ambíguo (homônimos) já foi
        // avisado ao adicionar e fica no campo, então não salva até escolher.
        const periodosHistoricosItens = obterPeriodosHistoricosDoTexto('prosas');
        if (
            ['pr-periodo-historico-nome', 'pr-evento-historico-nome'].some((campo) =>
                (document.getElementById(campo)?.value || '').trim(),
            )
        )
            return;
        const destino = document.getElementById('pr-destino').value;

        let paiTipo = null,
            paiId = null;
        if (destino && destino.includes(':')) {
            const partes = destino.split(':');
            paiTipo = partes[0];
            paiId = parseInt(partes[1]);
        }

        const dataEscrita = lerDataParcial('pr-data-esc');
        const dataPublicacao = lerDataParcial('pr-data-pub');
        if (dataEscrita) dataEscrita.exata = document.getElementById('pr-data-esc-exata').checked;

        if (violaOrdemDeDatas(dataEscrita, dataPublicacao)) {
            return mostrarAviso(
                'A Data de Primeira Publicação não pode ser anterior à Data de Escrita.',
            );
        }

        // Época Retratada — mesmo formato de Poema (ver initFormPoema
        // acima pro comentário completo).
        const epocaNa = document.getElementById('pr-epoca-na').checked;
        const epocasItens = obterEpocasRetratadasDoTexto('prosas');
        const epocaInicio = lerDataParcial('pr-epoca-ini');
        const epocaFim = lerDataParcial('pr-epoca-fim');

        if (violaOrdemDeDatas(epocaInicio, epocaFim)) {
            return mostrarAviso(
                'O "Até" do Período Biográfico Retratado não pode ser anterior ao "De".',
            );
        }

        // Mesmo critério de initFormPoema acima.
        const autorIdEpoca = obterAutoria('prosas')[0]?.autorId ?? null;
        const epocasPeriodos = periodosRetratadosDosItens(epocasItens, autorIdEpoca);

        const epocaRetratada =
            epocaNa || epocaInicio || epocaFim || epocasPeriodos.length
                ? {
                      periodos: epocasPeriodos,
                      inicio: epocaInicio,
                      fim: epocaFim,
                      na: epocaNa,
                  }
                : null;

        const periodosHistoricosIds = periodosHistoricosDosItens(periodosHistoricosItens);

        const dados = {
            id,
            titulo: document.getElementById('pr-titulo').value,
            texto: document.getElementById('pr-texto').value,
            sequencia: seqOuNull(document.getElementById('pr-sequencia').value),
            ...idiomasParaSalvar('prosas'),
            ...jargaoGiriaParaSalvar('prosas'),
            dataEscrita,
            dataPublicacao,
            ano: dataEscrita?.ano || '', // mantido por compatibilidade (ordenação/estatísticas/exportação)
            paiTipo,
            paiId,
            livrosIds: Array.from(document.getElementById('pr-livros').selectedOptions).map((o) =>
                parseInt(o.value),
            ),
            conceitos: {
                elos: obterElos('prosas'),
                ecos: obterEcos('prosas'),
            },
            notas: document.getElementById('pr-notas').value,
            ...etiquetasParaSalvar('pr'),
            ...temasParaSalvar('prosas'),
            ...locaisParaSalvar('prosas'),
            personagens: obterPersonagens('prosas'),
            pessoas: obterPessoas('prosas'),
            gruposDiretos: obterGruposDiretos('prosas'),
            autoria: obterAutoria('prosas'),
            envios: obterEnvios('prosas'),
            reconhecimentos: obterReconhecimentos('prosas'),
            autoavaliacao: document.getElementById('pr-autoavaliacao').value,
            autoclassificacao: Number(document.getElementById('pr-autoclassificacao').value) || 0,
            genero: document.getElementById('pr-genero').value,
            publicado: document.getElementById('pr-pub').checked,
            status: document.getElementById('pr-status').value,
            epocaRetratada,
            periodosHistoricosIds,
            movimentosEscolasIds: obterMovimentosEscolasDiretos('prosas'),
            intertextualidade: obterIntertextualidade('prosas'),
            hipertextualidade: obterHipertextualidade('prosas'),
            referenciasExternas: obterReferenciasExternas('prosas'),
            anexos: obterAnexos('prosas'),
            anexosNotaGeral: document.getElementById('pr-anexos-nota-geral').value,
            contextoHistorico: document.getElementById('pr-contexto').value,
            ocultacao: document.getElementById('pr-ocultacao').value,
            conteudoSensivel: document.getElementById('pr-sensivel').value,
            vocabularioHiperacionante: document.getElementById('pr-hiperacionante').value,
            cortadoDe: lerLivroSecao('pr-cortado-livro', 'pr-cortado-secao'),
            lancadoEm: lerLivroSecao('pr-lancado-livro', 'pr-lancado-secao'),
            justificativaMigracao: document.getElementById('pr-migracao-justificativa').value,
            descarte: document.getElementById('pr-descarte').value,
            pendencia: document.getElementById('pr-pendencia').value,
            fonteTexto: lerFonteTexto('pr'),
        };

        // Avisos não-bloqueantes — mesmo critério de initFormPoema.
        if (
            (dados.cortadoDe || dados.lancadoEm || dados.justificativaMigracao.trim()) &&
            dados.status !== 'migrado'
        ) {
            mostrarAvisoComAcao(
                'Migração entre livros preenchida, mas o status não é "Migrado".',
                'Reabrir',
                () => editarProsa(dados.id),
            );
        }
        if (dados.descarte.trim() && dados.status !== 'descartado') {
            mostrarAvisoComAcao(
                'Descarte preenchido, mas o status não é "Descartado".',
                'Reabrir',
                () => editarProsa(dados.id),
            );
        }

        const anterior = idInput ? db.prosas.find((x) => x.id == id) : null;
        const mesmoEscopo =
            anterior &&
            anterior.paiTipo === dados.paiTipo &&
            String(anterior.paiId) === String(dados.paiId);
        const posicaoAntiga = mesmoEscopo ? (anterior.sequencia ?? null) : null;

        if (idInput) {
            const idx = db.prosas.findIndex((x) => x.id == id);
            if (idx !== -1) db.prosas[idx] = dados;
            else db.prosas.push(dados);
        } else {
            db.prosas.push(dados);
        }

        aplicarPendenciasAncora('prosas');

        if (anterior && !mesmoEscopo && anterior.paiTipo && anterior.paiId) {
            fecharEspaco(
                getIrmaosPorEscopo(db, anterior.paiTipo, anterior.paiId),
                anterior.sequencia ?? null,
            );
        }
        if (dados.paiTipo && dados.paiId) {
            reordenarPosicao(
                getIrmaosPorEscopo(db, dados.paiTipo, dados.paiId),
                dados,
                dados.sequencia,
                posicaoAntiga,
            );
        }

        save();
        rastreadorProsa.marcarLimpo();
        toggleModal('modal-prosa');
        resetSinalizacoes('prosas');
        resetTemasTexto('prosas');
        resetLocaisTexto('prosas');
        resetIdiomasTexto('prosas');
        resetJargaoGiriaTexto('prosas');
        resetPersonagens('prosas');
        resetPessoas('prosas');
        resetGruposDiretos('prosas');
        resetAutoria('prosas');
        resetEnvios('prosas');
        resetReconhecimentos('prosas');
        resetGeneroProsa();
        resetIntertextualidade('prosas');
        resetHipertextualidade('prosas');
        resetReferenciasExternas('prosas');
        resetAnexos('prosas');
        resetElos('prosas');
        resetEcos('prosas');
        form.reset();
    };
}

const MAPA_PROSA = {
    id: 'pr-edit-id',
    titulo: 'pr-titulo',
    texto: 'pr-texto',
    sequencia: ['pr-sequencia', 0],
    notas: 'pr-notas',
    autoavaliacao: 'pr-autoavaliacao',
    autoclassificacao: ['pr-autoclassificacao', 0],
    publicado: 'pr-pub',
    anexosNotaGeral: 'pr-anexos-nota-geral',
    contextoHistorico: 'pr-contexto',
    ocultacao: 'pr-ocultacao',
    conteudoSensivel: 'pr-sensivel',
    vocabularioHiperacionante: 'pr-hiperacionante',
    descarte: 'pr-descarte',
    pendencia: 'pr-pendencia',
};

export async function editarProsa(id) {
    const pr = db.prosas.find((x) => x.id == id);
    if (!pr) return;
    await garantirModal('modal-prosa');
    renderDropdowns();

    preencherCampos(pr, MAPA_PROSA);
    renderAutoclassificacao('prosas');
    preencherDataParcial('pr-data-esc', pr.dataEscrita);
    preencherDataParcial('pr-data-pub', pr.dataPublicacao);
    document.getElementById('pr-data-esc-exata').checked = !!pr.dataEscrita?.exata;
    preencherDataParcial('pr-epoca-ini', pr.epocaRetratada?.inicio);
    preencherDataParcial('pr-epoca-fim', pr.epocaRetratada?.fim);
    document.getElementById('pr-epoca-na').checked = !!pr.epocaRetratada?.na;
    document.getElementById('pr-epoca-nome').value = '';
    document.getElementById('pr-evento-biografico-nome').value = '';
    document.getElementById('pr-evento-historico-nome').value = '';
    carregarEpocasRetratadasDoTexto('prosas', periodosBiograficosDoItem(pr));
    toggleCamposEpocaNaProsa();
    document.getElementById('pr-periodo-historico-nome').value = '';
    carregarPeriodosHistoricosDoTexto('prosas', pr.periodosHistoricosIds || []);
    carregarMovimentosEscolasDiretos('prosas', pr.movimentosEscolasIds || []);
    document.getElementById('pr-intertexto-tipo').value = '';
    document.getElementById('pr-intertexto-texto').value = '';
    carregarIntertextualidade('prosas', pr.intertextualidade || []);
    document.getElementById('pr-hipertexto-tipo').value = '';
    document.getElementById('pr-hipertexto-relacao').value = '';
    document.getElementById('pr-hipertexto-hipotexto').value = '';
    carregarHipertextualidade('prosas', pr.hipertextualidade || []);
    document.getElementById('pr-refext-tipo').value = '';
    document.getElementById('pr-refext-texto').value = '';
    carregarReferenciasExternas('prosas', pr.referenciasExternas || []);
    carregarElos('prosas', pr.conceitos?.elos || []);
    carregarEcos('prosas', pr.conceitos?.ecos || []);
    renderPainelElosDerivadosProsa(pr.id);
    document.getElementById('pr-anexo-tipo').value = '';
    document.getElementById('pr-anexo-link').value = '';
    document.getElementById('pr-anexo-link-texto').value = '';
    document.getElementById('pr-anexo-data-acesso').value = '';
    carregarAnexos('prosas', pr.anexos || []);
    document.getElementById('pr-cortado-livro').value = pr.cortadoDe?.livro || '';
    document.getElementById('pr-cortado-secao').value = pr.cortadoDe?.secao || '';
    document.getElementById('pr-lancado-livro').value = pr.lancadoEm?.livro || '';
    document.getElementById('pr-lancado-secao').value = pr.lancadoEm?.secao || '';
    document.getElementById('pr-migracao-justificativa').value = pr.justificativaMigracao || '';
    preencherFonteTexto('pr', pr.fonteTexto);
    // .value= direto não dispara 'input' — reaplica o filtro de Seção
    // manualmente pros 4 campos que acabaram de ser preenchidos (mesmo
    // motivo de atualizarFiltroSecoesMigracao em editarPoema).
    atualizarFiltroSecoesMigracao();

    // Status: campo novo (item 4) — prosas existentes só tinham o
    // checkbox `publicado`, sem noção de Incompleto/Migrado/Descartado.
    // Default inteligente no carregamento pra não perder essa distinção
    // ao reabrir uma prosa antiga pra editar — sem migração de dado (só
    // afeta o que aparece pré-selecionado no `<select>`; se a pessoa não
    // mexer nele, o valor gravado no submit passa a ser explícito).
    document.getElementById('pr-status').value =
        pr.status || (pr.publicado ? 'publicado' : 'completo');

    const setM = (elId, vals) => {
        const el = document.getElementById(elId);
        if (!el) return;
        const arr = Array.isArray(vals) ? vals.map(String) : [];
        Array.from(el.options).forEach((opt) => {
            opt.selected = arr.includes(String(opt.value));
        });
    };
    setM('pr-livros', pr.livrosIds || []);

    const destinoStr =
        pr.paiTipo && pr.paiId
            ? `${pr.paiTipo}:${pr.paiId}`
            : pr.secaoId
              ? `secao:${pr.secaoId}`
              : ''; // compatibilidade: prosas salvas antes da remoção do campo legado
    sincronizarFiltroDestino('pr-destino-filtro', 'pr-destino', destinoStr);

    carregarSinalizacoes('prosas', pr);
    carregarTemasTexto('prosas', pr);
    carregarLocaisTexto('prosas', pr);
    carregarIdiomasTexto('prosas', pr);
    carregarJargaoGiriaTexto('prosas', pr);
    carregarPersonagens('prosas', pr.personagens);
    carregarPessoas('prosas', pr.pessoas);
    carregarGruposDiretos('prosas', pr.gruposDiretos);
    carregarAutoria('prosas', pr.autoria);
    carregarEnvios('prosas', pr.envios);
    carregarReconhecimentos('prosas', pr.reconhecimentos);
    carregarGeneroProsa(pr.genero);
    atualizarDatalistProsa();
    renderColetaneasInfo('pr-coletaneas-info', 'prosa', pr.id);
    document.getElementById('modal-prosa-titulo').innerText = 'Editar Prosa';
    toggleModal('modal-prosa');
}

// ─── Elemento ────────────────────────────────────────────────

// Último envio do formulário de Elemento: uma promessa de "salvou?" (true) ou
// "recusou" (false), como em Parte e Seção (ver `ultimoEnvioParteSecao`). O "Salvar e
// ver" do olho espera por ela. `null` depois de `zerarUltimoEnvioElemento` significa
// que nenhum envio começou (validação nativa do navegador recusou, por exemplo).
let envioElemento = null;

export function ultimoEnvioElemento() {
    return envioElemento;
}

export function zerarUltimoEnvioElemento() {
    envioElemento = null;
}

export function initFormElemento() {
    const form = document.getElementById('form-elemento');
    if (!form) return;

    rastreadorElemento.observar(form);

    form.onsubmit = (e) => {
        e.preventDefault();
        envioElemento = salvarElementoDoFormulario(form);
        return envioElemento;
    };

    ligarSumarioNoModal();
}

// Devolve true quando salvou (e fechou o modal) e false quando recusou. Com o aviso
// da segunda ficha, a promessa só se resolve depois da resposta: o resultado do
// salvamento se confirmar, false se cancelar (nada foi gravado até a confirmação).
async function salvarElementoDoFormulario(form, { fichaConfirmada = false } = {}) {
    const idInput = document.getElementById('el-edit-id').value;
    const id = idInput ? parseInt(idInput) : gerarId();
    const vinculo = document.getElementById('el-vinculo').value;
    if (!vinculo) {
        mostrarAviso('Selecione um vínculo.');
        return false;
    }
    const imagemUrl = lerLinkImagem('el-imagem-url');
    if (imagemUrl === null) return false;

    const [tipoPai, idPaiStr] = vinculo.split(':');
    const idPai = parseInt(idPaiStr);
    const tipoEscolhido = document.getElementById('el-tipo').value;

    // Segunda ficha no mesmo livro: avisa antes de salvar (nada foi gravado ainda).
    if (!fichaConfirmada) {
        const outras = outrasFichasDoLivro(db, {
            id,
            tipo: tipoEscolhido,
            paiTipo: tipoPai,
            paiId: idPai,
        });
        if (outras.length) {
            const livro = db.livros.find((l) => l.id == idPai);
            return new Promise((resolve) => {
                abrirModalConfirmacao({
                    titulo: livro?.titulo || 'Livro',
                    rotulo: 'Ficha catalográfica',
                    mensagem:
                        'Este livro já tem uma ficha catalográfica. Salvar mesmo assim cria uma segunda, e o último link salvo vale para o campo do livro.',
                    textoConfirmar: 'Salvar mesmo assim',
                    corConfirmar: '#2563eb',
                    onConfirmar: () =>
                        resolve(salvarElementoDoFormulario(form, { fichaConfirmada: true })),
                    onCancelar: () => resolve(false),
                });
            });
        }
    }

    const fileEl = document.getElementById('el-img');
    const capaFile = fileEl && fileEl.files.length > 0 ? fileEl.files[0] : null;
    const removerImagem = document.getElementById('el-remover-imagem').checked;
    const capaAtual = idInput ? db.elementos.find((x) => x.id == id)?.imagem : null;
    let imagemFinal;
    if (removerImagem) {
        await deletarCapa(capaAtual);
        imagemFinal = null;
    } else {
        const novaImagemId = capaFile ? await salvarCapa(capaFile, capaAtual) : null;
        imagemFinal = novaImagemId ?? capaAtual;
    }

    const dados = {
        id,
        tipo: tipoEscolhido,
        titulo: document.getElementById('el-titulo')?.value || '',
        texto: document.getElementById('el-texto').value,
        notas: document.getElementById('el-notas').value,
        paiTipo: tipoPai,
        paiId: idPai,
        sequencia: seqOuNull(document.getElementById('el-sequencia')?.value),
        avisoConteudo: document.getElementById('el-aviso').value,
        versosPosIntroducao: document.getElementById('el-pos-versos').value,
        imagem: imagemFinal,
        imagemUrl,
        ...camposDaFicha(tipoEscolhido, {
            // O link só vale com a ficha ligada direto a um livro.
            fichaUrl: tipoPai === 'livro' ? document.getElementById('el-ficha-url').value : '',
            fichaCdd: document.getElementById('el-ficha-cdd').value,
            fichaNumeroControle: document.getElementById('el-ficha-numero-controle').value,
            fichaBibliotecario: document.getElementById('el-ficha-bibliotecario').value,
            fichaCrb: document.getElementById('el-ficha-crb').value,
        }),
        // Só o tipo Sumário guarda a lista de itens.
        ...camposDoSumario(tipoEscolhido, lerSumarioDoModal()),
    };

    const anterior = idInput ? db.elementos.find((x) => x.id == id) : null;
    const mesmoEscopo =
        anterior &&
        anterior.paiTipo === dados.paiTipo &&
        String(anterior.paiId) === String(dados.paiId);
    const posicaoAntiga = mesmoEscopo ? (anterior.sequencia ?? null) : null;

    if (idInput) {
        const idx = db.elementos.findIndex((x) => x.id == id);
        if (idx !== -1) db.elementos[idx] = dados;
    } else {
        db.elementos.push(dados);
    }

    if (anterior && !mesmoEscopo) {
        fecharEspaco(
            getIrmaosPorEscopo(db, anterior.paiTipo, anterior.paiId),
            anterior.sequencia ?? null,
        );
    }
    reordenarPosicao(
        getIrmaosPorEscopo(db, dados.paiTipo, dados.paiId),
        dados,
        dados.sequencia,
        posicaoAntiga,
    );

    // Ficha ligada a um livro: o link vira o link do campo do livro.
    sincronizarLivroComFicha(db, dados);

    save();
    rastreadorElemento.marcarLimpo();
    toggleModal('modal-elemento');
    form.reset();
    limparSumarioDoModal();
    return true;
}

const MAPA_ELEMENTO = {
    id: 'el-edit-id',
    imagemUrl: 'el-imagem-url',
    sequencia: 'el-sequencia',
    tipo: ['el-tipo', '', (v) => (v === 'Comentário' ? 'Conteúdo Multimídia' : v)],
    titulo: 'el-titulo',
    texto: 'el-texto',
    notas: 'el-notas',
    avisoConteudo: 'el-aviso',
    versosPosIntroducao: 'el-pos-versos',
    fichaUrl: 'el-ficha-url',
    fichaCdd: 'el-ficha-cdd',
    fichaNumeroControle: 'el-ficha-numero-controle',
    fichaBibliotecario: 'el-ficha-bibliotecario',
    fichaCrb: 'el-ficha-crb',
};

export async function editarElemento(id) {
    const el = db.elementos.find((x) => x.id == id);
    if (!el) return;
    await garantirModal('modal-elemento');
    renderDropdowns();

    preencherCampos(el, MAPA_ELEMENTO);
    document.getElementById('el-vinculo').value = `${el.paiTipo}:${el.paiId}`;
    document.getElementById('el-remover-imagem').checked = false;
    renderSumarioNoModal(el.itensSumario || []);

    // Importa toggleCamposIntroducao dinamicamente para evitar circular
    import('./ui.js').then(({ toggleCamposIntroducao }) => toggleCamposIntroducao());
    document.getElementById('modal-elemento-titulo').innerText = 'Editar Elemento';
    // Preencher por código não dispara 'input': o que está no form agora é o estado
    // inicial, não edição.
    rastreadorElemento.marcarLimpo();
    // Elemento já salvo tem o que ver: mostra o olho do cabeçalho.
    document.getElementById('elemento-ver')?.classList.remove('hidden');
    await toggleModal('modal-elemento');
}
