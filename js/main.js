// ============================================================
// main.js — Ponto de entrada. Inicializa módulos e expõe
//           funções globais que o HTML chama via onclick="..."
// ============================================================

import { abrirPorAtalho } from './faixa-origem.js';
import {
    exportarJSON,
    importarDB,
    db,
    save,
    deleteItem,
    getUltimoBackup,
    getUsoStorage,
    migrarImagensLegadasParaIndexedDB,
} from './db.js';
import { mostrarAviso, avisarSalvo, debounce, aoEnterAplicar } from './utils.js';
import { interpretarPaginaDigitada } from './celulas-tabela.js';
import { listarSnapshots, baixarSnapshot } from './autobackup.js';
import {
    openTab,
    abrirAba,
    toggleModal,
    prepararNovo,
    prepararNovoSubgrupo,
    toggleCamposIntroducao,
    toggleCamposFicha,
    sugerirSequencia,
    filtrarDestinoPoema,
    filtrarDestinoProsa,
    autoPreencherDataPublicacao,
    togglePainel,
    toggleMenuMobile,
    initNav,
} from './ui.js';
import { registrarModal } from './modais.js';
import { adicionarFonteCorrente, removerFonteCorrente } from './fontes-corrente-ui.js';
import {
    adicionarFontePeriodoHistorico,
    removerFontePeriodoHistorico,
} from './fontes-periodo-historico-ui.js';
import {
    initOpcoesPeriodoBiografico,
    rastreadorOpcoesPeriodoBiografico,
    abrirOpcoesPeriodoBiografico,
} from './periodo-biografico-opcoes-ui.js';
import {
    initOpcoesPeriodoHistorico,
    rastreadorOpcoesPeriodoHistorico,
    abrirOpcoesPeriodoHistorico,
} from './periodo-historico-opcoes-ui.js';
import {
    toggleColuna,
    moverColuna,
    selecionarTodasColunas,
    desmarcarTodasColunas,
    resetarColunas,
    aplicarPadraoColunas,
    usarArmazenamentoPadroes,
    salvarPadraoColunasUI,
    excluirPadraoColunasUI,
    renomearPadraoColunasUI,
    atualizarPadraoColunasUI,
    filtrarColunas,
} from './colunas.js';
import {
    adicionarColunaContagem,
    removerColunaContagem,
    definirCampoColunaContagem,
    definirOperadorColunaContagem,
    definirValorColunaContagem,
} from './colunas-contagem.js';
import {
    toggleAcaoColuna,
    setFormatoBaixarColuna,
    resetarAcoesColuna,
    getFormatoBaixar,
} from './acoes-coluna.js';
import { exportarItem } from './exportar.js';
import {
    abrirVisualizacao,
    baixarDoModalVisualizacao,
    navegarVisualizacao,
    irParaPosicaoVisualizacao,
    editarDoModalVisualizacao,
    verDoModalEdicao,
    excluirDoModalVisualizacao,
    registrarListaNavegacaoVisualizacao,
} from './visualizar.js';
import { abrirVisualizacaoAutor, editarAutorDoVisualizador } from './visualizar-autor.js';
import {
    abrirVisualizacaoLivro,
    navegarVisualizacaoLivro,
    irParaPosicaoVisualizacaoLivro,
    editarLivroDoVisualizador,
    verDoModalEdicaoLivro,
    excluirLivroDoVisualizador,
    registrarListaNavegacaoLivros,
} from './visualizar-livro.js';
import {
    abrirVisualizacaoParteSecao,
    abrirParteSecaoDaEstrutura,
    verDoModalEdicaoParteSecao,
    navegarVisualizacaoParteSecao,
    irParaPosicaoVisualizacaoParteSecao,
    editarParteSecaoDoVisualizador,
    excluirParteSecaoDoVisualizador,
    registrarListaNavegacaoParteSecao,
} from './visualizar-parte-secao.js';
import {
    abrirVisualizacaoElemento,
    navegarVisualizacaoElemento,
    irParaPosicaoVisualizacaoElemento,
    editarElementoDoVisualizador,
    excluirElementoDoVisualizador,
    registrarListaNavegacaoElemento,
    verDoModalEdicaoElemento,
} from './visualizar-elemento.js';
import {
    abrirVisualizacaoMovimentoEscola,
    editarMovimentoEscolaDoVisualizador,
} from './visualizar-movimento-escola.js';
import {
    abrirVisualizacaoPeriodoHistorico,
    editarPeriodoHistoricoDoVisualizador,
    abrirTextoDoPeriodoHistoricoVer,
    verTodosTextosDoPeriodoHistorico,
} from './visualizar-periodo-historico.js';
import {
    abrirVisualizacaoPeriodoBiografico,
    editarPeriodoBiograficoDoVisualizador,
    alternarOcultasPeriodoBiograficoDoVisualizador,
    abrirTextoDoPeriodoBiograficoVer,
    verTodosTextosDoPeriodoBiografico,
} from './visualizar-periodo-biografico.js';
import {
    toggleSelecaoEpoca,
    toggleSelecaoTodosEpocas,
    limparSelecaoEpocas,
    inverterSelecaoEpocas,
    aplicarMassaEpocas,
    alternarOcultasNaBarraEpocas,
    toggleOcultarEpoca,
} from './epocas-acoes.js';
import {
    toggleSelecaoPeriodoHistorico,
    toggleSelecaoTodosPeriodosHistoricos,
    limparSelecaoPeriodosHistoricos,
    inverterSelecaoPeriodosHistoricos,
    aplicarMassaBarraPeriodosHistoricos,
} from './periodos-historicos-acoes.js';
import {
    toggleSelecaoCorrente,
    toggleSelecaoTodasCorrentes,
    limparSelecaoCorrentes,
    inverterSelecaoCorrentes,
    aplicarMassaBarraCorrentes,
} from './correntes-acoes.js';
import { abrirVisualizacaoGrupo, editarGrupoDoVisualizador } from './visualizar-grupo.js';
import {
    toggleDownloadAbrangente,
    sincronizarCheckboxesComEstadoSalvo,
} from './download-abrangente.js';
import {
    toggleIncluirOcultos,
    toggleLembrarIncluirOcultos,
    montarControlesIncluirOcultos,
} from './ocultos-exportacao.js';
import { toggleAgruparComuns, montarControlesAgruparComuns } from './agrupar-comuns.js';
import { montarControlesPrevias } from './previas-imagem.js';
import { exportarEscansao } from './exportar-sonoridade.js';
import {
    toggleIncluirDadosPessoais,
    sincronizarChecksDadosPessoaisComEstadoSalvo,
} from './pessoas-viagem.js';
import {
    abrirVisualizacaoSonoridade,
    baixarDoModalVisualizacaoSonoridade,
} from './visualizar-sonoridade.js';
import { exportarEstruturaTextual } from './exportar-estrutura-textual.js';
import {
    abrirVisualizacaoEstruturaTextual,
    baixarDoModalVisualizacaoEstruturaTextual,
} from './visualizar-estrutura-textual.js';
import { initTema, setTema } from './theme.js';
import { initFusoHorario, setFusoHorario } from './fuso-horario.js';
import { renderLists } from './render.js';
import {
    setFiltroPoemas,
    setFiltroProsas,
    setFiltroConteudoPoemas,
    setFiltroConteudoProsas,
    setFiltroNumeroPoemas,
    setFiltroNumeroProsas,
    setCombinadorBuscaPoemas,
    setCombinadorBuscaProsas,
    getCombinadorBuscaPoemas,
    getCombinadorBuscaProsas,
    setOpcaoBuscaPoemas as _setOpcaoBuscaPoemas,
    setOpcaoBuscaProsas as _setOpcaoBuscaProsas,
    setFiltroLivroPoemas,
    setFiltroPessoaPoemas,
    setFiltroPapelPoemas,
    setFiltroPessoaProsas,
    setFiltroPapelProsas,
    verTextosPessoa,
    verTextosEpoca,
    verTextosPeriodoHistorico,
    alternarRamoEpoca,
    recolherTodasEpocas,
    expandirTodasEpocas,
    alternarRamoPeriodoHistorico,
    recolherTodosPeriodosHistoricos,
    expandirTodosPeriodosHistoricos,
    alternarRamoCorrente,
    recolherTodasCorrentes,
    expandirTodasCorrentes,
    verTextosAssunto,
    verTextosTema,
    renderTemas,
    definirBuscaTemas,
    filtrarTemasSemAssunto,
    atualizarListaSemAssunto,
    baixarAssuntosMd,
    baixarTemasMd,
    verTextosMovimentoEscola,
    verTextosAutor,
    verAutoresMovimentoEscola,
    ordenarPor,
    buscarPorPrefixo,
    setStatusPoemas,
    setStatusProsas,
    setItensPorPagina,
    setPaginaPoemas,
    setPaginaProsas,
    setPaginaSonoridade,
    setPaginaEstruturaTextual,
    setFiltroLivroPartes,
    setFiltroLivroSecoes,
    setFiltroParteSecoes,
    setFiltroLivroElementos,
    setFiltroTipoElementos,
    setBuscaLivros,
    setFiltroTipoLivros,
    setFiltroFaseLivros,
    setFiltroSituacaoLivros,
    setFiltroPublicacaoLivros,
    setFiltroDataLivros,
    limparFiltrosLivros,
    alternarPreviasImagem,
    definirPreviasImagemTodasAbas,
    setFiltroLivroProsa,
    moverLivro,
    setFiltroDataEscritaPoemas,
    setFiltroDataPublicacaoPoemas,
    setFiltroEpocaRetratadaPoemas,
    setFiltroDataEscritaProsas,
    setFiltroDataPublicacaoProsas,
    setFiltroDataRapidoPoemasEscrita,
    setFiltroDataRapidoPoemasPublicacao,
    setFiltroDataRapidoPoemasEpoca,
    setFiltroDataRapidoProsasEscrita,
    setFiltroDataRapidoProsasPublicacao,
    limparFiltroDataPoemas,
    limparFiltroDataProsas,
    setFiltroSonoridade,
    setFiltroEstruturaTextual,
    setFiltroMoldes,
    setPaginaMoldes,
    definirOrdenacaoMovimentosEscolas,
    definirOrdenacaoEpocas,
    definirOrdenacaoPeriodosHistoricos,
    setFiltroPeriodo,
    limparFiltrosCorrentes,
    limparFiltrosPeriodosHistoricos,
    limparFiltrosPeriodosBiograficos,
    alternarExibirOcultasEpocas,
    toggleColapsoGrupo,
    setFiltroAutorGrupos,
    setFiltroNomeGrupos,
    setVisibilidadeGrupos,
    toggleOcultarGrupo,
    getListaVisivelPoemas,
    getListaVisivelLivros,
    getListaVisivelProsas,
    getListaVisivelPartes,
    getListaVisivelSecoes,
    getListaVisivelElementos,
} from './render-listas.js';
import {
    setFiltroAutores,
    setOpcaoBuscaAutores,
    toggleSelecaoAutor,
    toggleSelecaoTodosAutores,
    limparSelecaoAutores,
    inverterSelecaoAutores,
    exportarSelecaoAutoresJson,
    exportarSelecaoAutoresCsv,
    exportarSelecaoAutoresMarkdown,
} from './autores-acoes.js';
import {
    setFiltroAutorPessoas,
    setFiltroGrupoPessoas,
    setFiltroNomePessoas,
    toggleSelecaoPessoa,
    toggleSelecaoTodosPessoas,
    limparSelecaoPessoas,
    inverterSelecaoPessoas,
    aplicarGrupoEmMassaPessoas,
    aplicarAutorEmMassaPessoas,
    aplicarGeneroEmMassaPessoas,
    limparGeneroEmMassaPessoas,
    aplicarIdentidadeCisTransEmMassaPessoas,
    aplicarCorRacaEmMassaPessoas,
    aplicarOrientacaoEmMassaPessoas,
    limparOrientacaoEmMassaPessoas,
    setVisibilidadePessoas,
    toggleOcultarPessoa,
    ocultarSelecaoPessoas,
    reexibirSelecaoPessoas,
} from './pessoas-acoes.js';
import {
    toggleSelecao,
    toggleSelecaoTodos,
    selecionarPagina,
    selecionarRestantes,
    limparSelecao,
    inverterSelecao,
    excluirSelecao,
    exportarSelecaoAtualJson,
    exportarSelecaoAtualCsv,
    exportarSelecaoAtualMarkdown,
    exportarSelecaoAtualPdf,
    exportarSelecaoAtualDocx,
    baixarSelecaoPorFormato,
    salvarFormatoSelecao,
    aplicarPessoaEmMassa,
    removerPessoaEmMassa,
    aplicarSinalEmMassa,
    removerSinalEmMassa,
    aplicarTemaEmMassa,
    removerTemaEmMassa,
    prepararPainelTemasMassa,
    atualizarListaSinalBulk,
    aplicarDataEmMassa,
    limparDataEmMassa,
    prepararPainelPreencherMassa,
    trocarCampoPreencherMassa,
    aplicarPreenchimentoEmMassa,
    limparCampoEmMassa,
    prepararPainelPeriodosMassa,
    trocarTipoPeriodoMassa,
    aplicarPeriodoEmMassa,
    removerPeriodoEmMassa,
    aplicarGeneroEmMassaProsa,
    removerGeneroEmMassaProsa,
} from './selecao-massa.js';
import {
    setLivroEstrutura,
    moverItemEstrutura,
    abrirModalMoverNivel,
    toggleSelecaoEstrutura,
    marcarTodosEstrutura,
    expandirTodosEstrutura,
    editarPosicaoEstrutura,
    exportarSelecaoEstrutura,
} from './render-estrutura.js';
import {
    previsualizarExportacaoSeletiva,
    executarExportacaoSeletiva,
    executarExportacaoSeletivaMarkdown,
    executarExportacaoSeletivaPdf,
    executarExportacaoSeletivaDocx,
    popularSelecaoExportacao,
    exportarTudoAninhado,
    exportarLivroCompleto,
    exportarLivrosCompletos,
    exportarTudoFlatJson,
    exportarTudoFlatMarkdown,
    exportarTudoFlatPdf,
    exportarTudoFlatDocx,
} from './exportar.js';
import {
    baixarFixo,
    baixarTodosFixos,
    baixarTemplate,
    baixarTodosTemplates,
    excluirTemplate,
    abrirFormularioTemplate,
    fecharFormularioTemplate,
    salvarFormularioTemplate,
    adicionarCriterioFormulario,
} from './exportar-frequentes.js';
import { baixarMoldePorId, importarMoldeDeArquivo } from './ui-molde-json.js';
import {
    processarArquivoImportacaoAditiva,
    definirDecisaoReferenciaAditiva,
    aplicarImportacaoAditivaClick,
    cancelarImportacaoAditiva,
} from './ui-importar-aditivo.js';
import {
    abrirImportarCampos,
    initFormImportarCampos,
    aplicarImportacaoCampos,
    desfazerImportacaoCampos,
    baixarModeloCampos,
} from './ui-importar-campos.js';
import {
    abrirModalEsvaziarAcervo,
    atualizarModalEsvaziarAcervo,
    confirmarEsvaziarAcervo,
} from './ui-esvaziar-acervo.js';
import {
    abrirModalRelatorioPeriodos,
    atualizarModalRelatorioPeriodos,
    baixarRelatorioPeriodos,
} from './ui-relatorio-periodos.js';
import { mostrarAvisoPosEsvaziar, ouvirEsvaziamentoDeOutraAba } from './apagar-acervo.js';
import {
    baixarBackupCompleto,
    baixarSoExtras,
    restaurarExtrasArquivo,
} from './ui-extras-backup.js';
import {
    selecionarPacoteBiblioteca,
    fecharDetalhePacoteBiblioteca,
    usarPacoteBiblioteca as confirmarUsoPacoteBiblioteca,
    alternarSelecaoPacoteBiblioteca,
    alternarSelecionarTodosBiblioteca,
    importarSelecionadosBiblioteca as confirmarImportarSelecionadosBiblioteca,
    importarTodosBiblioteca as confirmarImportarTodosBiblioteca,
} from './ui-biblioteca.js';
import {
    lerArquivoTextoBiblioteca,
    atualizarPreviaTextoBiblioteca,
    enviarTextoParaImportacao as confirmarEnvioTextoBiblioteca,
    limparFormTextoBiblioteca,
} from './ui-biblioteca-texto.js';
import {
    initModoAprendizado,
    abrirModoAprendizado,
    abrirModoAprendizadoSeNecessario,
    avancarModoAprendizadoPerfil,
    voltarModoAprendizadoPerfil,
    iniciarTourModoAprendizado,
} from './modo-aprendizado.js';
import { definirNavegacaoTour } from './tour.js';
import { initCentralAjuda, abrirCentralAjuda, abrirApresentacaoDaAjuda } from './central-ajuda.js';
import {
    renderEstatisticas,
    toggleTipoEtiqueta,
    definirModoGraficoPessoas,
    definirModoGraficoCorrentes,
    definirConsiderarCisTrans,
    toggleGeneroFiltroPessoas,
    limparGenerosFiltroPessoas,
    toggleIdentidadeFiltroPessoas,
    limparIdentidadesFiltroPessoas,
    definirModoTemasAssuntos,
    definirOrdemTemasAssuntos,
    definirModoTerceiros,
    toggleGrupoFiltroPessoas,
    toggleOcultoItem,
    restaurarOcultosGrafico,
    definirOrdemOcultos,
    definirMinimoAparicoes,
    definirMinimoAnos,
    filtrarItensOcultos,
    toggleSelecaoTemporal,
    definirOrdemTemporal,
    definirPapelTemaEstatisticas,
    definirPapelAssuntoEstatisticas,
    definirFiltrosCompartilhados,
    limparFiltrosCompartilhados,
} from './estatisticas.js';
import {
    renderConexoes,
    baixarDiagramaEcos,
    baixarConexoes,
    alternarModoSelecaoConexoes,
    toggleSelecaoConexao,
    marcarTodosConexoes,
    limparSelecaoConexoes,
} from './render-conexoes.js';
import {
    initEditor,
    initEditorProsa,
    adicionarSinalTradicao,
    removerSinalTradicao,
    editarSinalTradicao,
    adicionarSinalEstilo,
    removerSinalEstilo,
    editarSinalEstilo,
    adicionarSinalTema,
    removerSinalTema,
    editarSinalTema,
    adicionarSinalTerritorialidade,
    removerSinalTerritorialidade,
    editarSinalTerritorialidade,
    adicionarSinalRelacao,
    removerSinalRelacao,
    editarSinalRelacao,
    adicionarSinalSensibilidade,
    removerSinalSensibilidade,
    editarSinalSensibilidade,
    adicionarSinalTom,
    removerSinalTom,
    editarSinalTom,
    adicionarSinalDominioImagetico,
    removerSinalDominioImagetico,
    editarSinalDominioImagetico,
    adicionarSinalOutros,
    removerSinalOutros,
    editarSinalOutros,
    applyStyle,
    applyBackground,
    wrapText,
    setAlign,
    adicionarPessoa,
    removerPessoa,
    alternarPapelPessoa,
    alternarDropdownPapelPessoa,
    adicionarGrupoDireto,
    removerGrupoDireto,
    abrirSugestoesGrupoDireto,
    fecharSugestoesGrupoDireto,
    selecionarGrupoDireto,
    adicionarAutoria,
    removerAutoria,
    alterarPapelAutoria,
    alterarAssinaturaAutoria,
    alterarNomeLiterarioAutoria,
    adicionarEnvio,
    editarEnvio,
    cancelarEdicaoEnvio,
    removerEnvio,
    adicionarReconhecimento,
    editarReconhecimento,
    cancelarEdicaoReconhecimento,
    removerReconhecimento,
    atualizarDatalist,
    atualizarDatalistProsa,
    adicionarGeneroProsa,
    removerGeneroProsa,
    editarGeneroProsa,
    adicionarNomeLiterarioAutor,
    removerNomeLiterarioAutor,
    editarNomeLiterarioAutor,
    alterarTipoNomeLiterarioAutor,
    adicionarOcupacaoAutor,
    removerOcupacaoAutor,
    editarOcupacaoAutor,
    adicionarCondicaoClinicaAutor,
    removerCondicaoClinicaAutor,
    editarCondicaoClinicaAutor,
    alterarTipoCondicaoClinicaAutor,
    adicionarDeficienciaAutor,
    removerDeficienciaAutor,
    editarDeficienciaAutor,
    alterarTipoDeficienciaAutor,
    adicionarNeurodivergenciaAutor,
    removerNeurodivergenciaAutor,
    editarNeurodivergenciaAutor,
    adicionarInstituicaoAutor,
    removerInstituicaoAutor,
    editarInstituicaoAutor,
    adicionarMovimentoEscolaDireto,
    adicionarDivisaoCorrenteDireta,
    removerMovimentoEscolaDireto,
    adicionarPeriodoHistoricoDoTexto,
    removerPeriodoHistoricoDoTexto,
    removerEpocaRetratadaDoTexto,
    alterarRecorteEpocaRetratadaDoTexto,
    adicionarValorMovimento,
    adicionarRegiaoOrigemMovimento,
    removerRegiaoOrigemMovimento,
    editarRegiaoOrigemMovimento,
    adicionarRegiaoPeriodoHistorico,
    removerRegiaoPeriodoHistorico,
    editarRegiaoPeriodoHistorico,
    removerValorMovimento,
    editarValorMovimento,
    adicionarTemaMovimento,
    adicionarTemaAssunto,
    removerTemaAssunto,
    editarTemaAssunto,
    removerTemaMovimento,
    editarTemaMovimento,
    adicionarTecnicaMovimento,
    removerTecnicaMovimento,
    editarTecnicaMovimento,
    adicionarTipoComposicaoMovimento,
    removerTipoComposicaoMovimento,
    editarTipoComposicaoMovimento,
    adicionarLemaMovimento,
    removerLemaMovimento,
    editarLemaMovimento,
    adicionarManifestoMovimento,
    removerManifestoMovimento,
    editarManifestoMovimento,
    adicionarPremioAutor,
    removerPremioAutor,
    editarPremioAutor,
    alterarAnoPremioAutor,
    adicionarObraAutor,
    removerObraAutor,
    editarObraAutor,
    alterarAnoObraAutor,
    adicionarCirculoLiterarioAutor,
    removerCirculoLiterarioAutor,
    editarCirculoLiterarioAutor,
    adicionarLinguaEscritaAutor,
    removerLinguaEscritaAutor,
    editarLinguaEscritaAutor,
    adicionarIntertexto,
    removerIntertexto,
    editarIntertexto,
    cancelarEdicaoIntertexto,
    adicionarHipertextualidade,
    removerHipertextualidade,
    editarHipertextualidade,
    cancelarEdicaoHipertextualidade,
    adicionarReferenciaExterna,
    removerReferenciaExterna,
    editarReferenciaExterna,
    cancelarEdicaoReferenciaExterna,
    adicionarElo,
    removerElo,
    editarElo,
    cancelarEdicaoElo,
    onRelacaoEloAlterada,
    selecionarDirecaoElo,
    adicionarEco,
    removerEco,
    editarEco,
    cancelarEdicaoEco,
    adicionarAnexo,
    removerAnexo,
    editarAnexo,
    cancelarEdicaoAnexo,
    adicionarAnotacao,
    removerAnotacao,
    editarAnotacao,
    cancelarEdicaoAnotacao,
    adicionarLoja,
    removerLoja,
    editarLoja,
    cancelarEdicaoLoja,
    renderSinalizacoesProsa,
    renderTemasProsa,
    adicionarTemaTexto,
    renderRegiaoProsa,
    adicionarTerritorialidadeTexto,
    removerTerritorialidadeTexto,
    definirLocalEscritaTexto,
    limparLocalEscritaTexto,
    adicionarIdiomaTexto,
    removerIdiomaTexto,
    definirPapelIdiomaTexto,
    adicionarDialetoIdiomaTexto,
    removerDialetoIdiomaTexto,
    adicionarJargaoGiriaTexto,
    removerJargaoGiriaTexto,
    removerTemaTexto,
    mudarPapelTemaTexto,
    mudarPapelAssuntoTexto,
    abrirAssuntoTemaTexto,
    fecharAssuntoTemaTexto,
    adicionarAssuntoTemaTexto,
    desfazerAssuntoPendenteTexto,
    definirAutoclassificacao,
    limparAutoclassificacao,
} from './editor.js';
import {
    initFormLivro,
    editarLivro,
    initFormParte,
    editarParte,
    initFormSecao,
    editarSecao,
    initFormPoema,
    editarPoema,
    toggleCamposEpocaNa,
    aplicarSugestaoEpoca,
    adicionarEpocaRetratadaComSugestao,
    initFormProsa,
    toggleCamposEpocaNaProsa,
    aplicarSugestaoEpocaProsa,
    editarProsa,
    initFormElemento,
    editarElemento,
    initFormPessoa,
    editarPessoa,
    initFormGrupo,
    editarGrupo,
    initFormAutor,
    editarAutor,
    initFormEpoca,
    editarEpoca,
    initFormPeriodoHistorico,
    editarPeriodoHistorico,
    initFormAssunto,
    editarAssunto,
    initFormTema,
    editarTema,
    excluirTema,
    excluirTemasSemTextoComConfirmacao,
    mesclarDuplicataComConfirmacao,
    marcarNaoIguaisComAviso,
    excluirTodosAssuntosComConfirmacao,
    atribuirTemaDoPainel,
    initFormMovimentoEscola,
    editarMovimentoEscola,
    initFormMesclar,
    abrirModalMesclar,
    initFormSonoridade,
    editarSonoridade,
    prepararNovaSonoridade,
    importarSonoridadeDeArquivo,
    initFormMolde,
    editarMolde,
    prepararNovoMolde,
    promoverMolde,
    baixarMoldeAoVivo,
    initFormEstruturaTextual,
    editarEstruturaTextual,
    prepararNovaEstruturaTextual,
    aplicarTemplateEstruturaTextual,
    adicionarUnidadeEstruturaTextual,
    adicionarEventoEstruturaTextual,
    salvarComoTemplateEstruturaTextual,
    editarTemplateEstruturaSelecionado,
    excluirTemplateEstruturaSelecionado,
    salvarTemplateEstrutura,
    adicionarUnidadeTemplateEdicao,
    adicionarEventoTemplateEdicao,
    removerUnidadeTemplateEdicao,
    removerEventoTemplateEdicao,
    rastreadorPoema,
    rastreadorProsa,
    rastreadorLivro,
    rastreadorParte,
    rastreadorSecao,
    rastreadorElemento,
} from './forms.js';
import {
    toggleEstrofeItem,
    toggleVersoItem,
    setVersosTodosItem,
    removerUnidade,
    removerEvento,
    onToggleDetalhesPosicaoEstrutura,
    onToggleEdicaoEstrutura,
    atualizarCampoEstrutura,
} from './estrutura-textual.js';
import {
    renderColetaneas,
    selecionarColetanea,
    prepararNovaParte,
    editarParteColetanea,
    deletarParteColetanea,
    prepararNovoItem,
    editarItem,
    deletarItemColetanea,
    moverItem,
    onChangeTipoItem,
    toggleOverride,
    initFormColParte,
    initFormColItem,
} from './coletaneas.js';
import {
    renderLocais,
    initFormLocal,
    novoLocal,
    novoSublocal,
    editarLocalNaTela,
    excluirLocalComAviso,
    verTextosLocal,
    alternarColapsoLocal,
    recolherTodosLocais,
    expandirTodosLocais,
} from './ui-locais.js';
import {
    renderEtiquetas,
    novaEtiqueta,
    baixarEtiquetasMd,
    editarEtiqueta,
    initFormEtiqueta,
    verTextosEtiqueta,
    excluirEtiquetaComAviso,
    moverEtiquetaDoCartao,
    alternarCategoriaEtiquetas,
    recolherTodasEtiquetas,
    expandirTodasEtiquetas,
    mesclarDuplicataEtiqueta,
    marcarEtiquetasNaoIguaisComAviso,
} from './etiquetas-aba.js';
import {
    renderTagClusters,
    alternarCategoriaTagClusters,
    irParaEtiquetasSemCluster,
    alternarTagCluster,
    recolherTodosTagClusters,
    expandirTodosTagClusters,
    novoTagCluster,
    baixarTagClusters,
    alternarModoSelecaoTagClusters,
    toggleSelecaoTagCluster,
    marcarTodosTagClusters,
    limparSelecaoTagClusters,
    editarTagCluster,
    initFormTagCluster,
    abrirImportarTagClusters,
    initFormImportarTagClusters,
    desfazerImportacaoTagClusters,
    verTextosTagCluster,
    excluirTagClusterComAviso,
    tirarEtiquetaDoCluster,
    colocarEtiquetaNoCluster,
    adicionarEtiquetaAoClusterDoCartao,
    definirClusterDaEtiqueta,
    abrirMoverEtiquetaDoCluster,
} from './tag-clusters-aba.js';
import {
    editarPersonagem,
    initFormPersonagem,
    novoPersonagem,
    renderPersonagens,
    verTextosPersonagem,
} from './ui-personagens.js';
import { adicionarPersonagem } from './grupo-personagens.js';
import { abrirSugestaoEcos, initSugestaoEcos } from './ui-sugestao-ecos.js';

// ─── Registro dos modais (carregamento lazy via fetch) ───────
// Cada modal só é buscado em modais/<arquivo> e inicializado
// (onsubmit ligado etc.) na primeira vez que for aberto, seja
// por prepararNovo(tipo) ou por uma das funções editarX().
// modal-poema também carrega o editor de formatação (toolbar,
// tags, pessoas), que só existe dentro desse modal.

registrarModal('modal-livro', 'modal-livro.html', initFormLivro, rastreadorLivro);
registrarModal('modal-parte', 'modal-parte.html', initFormParte, rastreadorParte);
registrarModal('modal-secao', 'modal-secao.html', initFormSecao, rastreadorSecao);
registrarModal(
    'modal-poema',
    'modal-poema.html',
    () => {
        initFormPoema();
        initEditor();
    },
    rastreadorPoema,
);
registrarModal(
    'modal-prosa',
    'modal-prosa.html',
    () => {
        // Preenche o corpo de Sinalizações da Prosa (ver
        // renderSinalizacoesProsa em editor.js) antes de initFormProsa —
        // mesmo motivo do renderSinalizacoesPoema em initEditor.
        renderSinalizacoesProsa();
        renderTemasProsa();
        renderRegiaoProsa();
        initFormProsa();
        // Wiring de Enter dos campos de Prosa (item 4 do plano de
        // manutenibilidade): antes vivia dentro de initEditor(), então só
        // era ligado se o modal de Poema já tivesse carregado. Chamado
        // aqui diretamente, sem depender da ordem de abertura dos modais.
        initEditorProsa();
    },
    rastreadorProsa,
);
registrarModal('modal-elemento', 'modal-elemento.html', initFormElemento, rastreadorElemento);
registrarModal('modal-pessoa', 'modal-pessoa.html', initFormPessoa);
registrarModal('modal-grupo', 'modal-grupo.html', initFormGrupo);
registrarModal('modal-autor', 'modal-autor.html', initFormAutor);
registrarModal('modal-epoca', 'modal-epoca.html', initFormEpoca);
registrarModal(
    'modal-opcoes-periodo-biografico',
    'modal-opcoes-periodo-biografico.html',
    initOpcoesPeriodoBiografico,
    rastreadorOpcoesPeriodoBiografico,
);
registrarModal('modal-periodo-historico', 'modal-periodo-historico.html', initFormPeriodoHistorico);
registrarModal(
    'modal-opcoes-periodo-historico',
    'modal-opcoes-periodo-historico.html',
    initOpcoesPeriodoHistorico,
    rastreadorOpcoesPeriodoHistorico,
);
registrarModal('modal-assunto', 'modal-assunto.html', initFormAssunto);
registrarModal('modal-tema', 'modal-tema.html', initFormTema);
registrarModal('modal-etiqueta', 'modal-etiqueta.html', initFormEtiqueta);
registrarModal('modal-tag-cluster', 'modal-tag-cluster.html', initFormTagCluster);
registrarModal(
    'modal-importar-tag-clusters',
    'modal-importar-tag-clusters.html',
    initFormImportarTagClusters,
);
registrarModal('modal-importar-campos', 'modal-importar-campos.html', initFormImportarCampos);
registrarModal('modal-local', 'modal-local.html', initFormLocal);
registrarModal('modal-personagem', 'modal-personagem.html', initFormPersonagem);
registrarModal('modal-sugestao-ecos', 'modal-sugestao-ecos.html', initSugestaoEcos);
registrarModal('modal-movimento-escola', 'modal-movimento-escola.html', initFormMovimentoEscola);
registrarModal('modal-sonoridade', 'modal-sonoridade.html', initFormSonoridade);
registrarModal('modal-molde', 'modal-molde.html', initFormMolde);
registrarModal(
    'modal-morfofuncionalidade',
    'modal-morfofuncionalidade.html',
    initFormEstruturaTextual,
);
// Sem init próprio — o conteúdo é preenchido a cada abertura por
// editarTemplateEstruturaSelecionado() (forms.js), mesmo espírito de
// modal-visualizar acima.
registrarModal('modal-template-estrutura', 'modal-template-estrutura.html', () => {});
registrarModal('modal-mesclar', 'modal-mesclar.html', initFormMesclar);
registrarModal('modal-modo-aprendizado', 'modal-modo-aprendizado.html', initModoAprendizado);
// Sem init: o conteúdo é redesenhado a cada abertura (ui-esvaziar-acervo.js).
registrarModal('modal-esvaziar-acervo', 'modal-esvaziar-acervo.html', () => {});
// Sem init: a janela se redesenha a cada abertura (ui-relatorio-periodos.js).
registrarModal('modal-relatorio-periodos', 'modal-relatorio-periodos.html', () => {});
registrarModal('modal-central-ajuda', 'modal-central-ajuda.html', initCentralAjuda);
registrarModal('modal-col-parte', 'modal-col-parte.html', initFormColParte);
registrarModal('modal-col-item', 'modal-col-item.html', initFormColItem);
// Sem form/init próprio — o conteúdo é preenchido a cada abertura por
// abrirVisualizacao() (visualizar.js), não há nada pra inicializar uma
// vez só (ver comentário em registrarModal, acima).
registrarModal('modal-visualizar', 'modal-visualizar.html', () => {});
// Anterior/Próximo do modal Ver seguem a lista que a aba mostra (busca, filtros
// e ordenação aplicados), ver navegarVisualizacao em visualizar.js.
registrarListaNavegacaoVisualizacao('poema', () => getListaVisivelPoemas().map((p) => p.id));
registrarListaNavegacaoVisualizacao('prosa', () => getListaVisivelProsas().map((p) => p.id));
// Mesmo espírito acima, agora pra Sonoridade (ver visualizar-sonoridade.js)
// — extensão desta sessão, antes só Poemas/Prosas tinham essa visualização.
registrarModal('modal-visualizar-sonoridade', 'modal-visualizar-sonoridade.html', () => {});
// Idem, pro Autor (ver visualizar-autor.js) — botão "Ver" do card em Autores.
registrarModal('modal-visualizar-autor', 'modal-visualizar-autor.html', () => {});
// Idem, pro Livro (ver visualizar-livro.js) — botão "Ver" do card em Livros e olho
// do modal de edição. Anterior/Próximo seguem a ordem dos cards.
registrarModal('modal-visualizar-livro', 'modal-visualizar-livro.html', () => {});
registrarListaNavegacaoLivros(() => getListaVisivelLivros());
// Idem, pra Parte e Seção (ver visualizar-parte-secao.js) — botão "Ver" do card em
// Partes e em Seções. Anterior/Próximo seguem a ordem e os filtros dos cards.
registrarModal('modal-visualizar-parte', 'modal-visualizar-parte.html', () => {});
registrarModal('modal-visualizar-secao', 'modal-visualizar-secao.html', () => {});
registrarListaNavegacaoParteSecao('parte', () => getListaVisivelPartes());
registrarListaNavegacaoParteSecao('secao', () => getListaVisivelSecoes());
// Idem, pro Elemento textual (ver visualizar-elemento.js) — botão "Ver" do card em
// Elementos Textuais. Anterior/Próximo seguem a ordem e os filtros dos cards.
registrarModal('modal-visualizar-elemento', 'modal-visualizar-elemento.html', () => {});
registrarListaNavegacaoElemento(() => getListaVisivelElementos());
// Idem, pro Movimento/Escola (ver visualizar-movimento-escola.js) —
// botão "Ver" do card em Movimentos/Escolas.
registrarModal(
    'modal-visualizar-movimento-escola',
    'modal-visualizar-movimento-escola.html',
    () => {},
);
// Idem, pro Período Histórico (ver visualizar-periodo-historico.js) —
// botão "Ver" do card em Períodos Históricos.
registrarModal(
    'modal-visualizar-periodo-historico',
    'modal-visualizar-periodo-historico.html',
    () => {},
);
// Idem, pro Período Biográfico (ver visualizar-periodo-biografico.js) —
// botão "Ver" do card em Períodos Biográficos.
registrarModal(
    'modal-visualizar-periodo-biografico',
    'modal-visualizar-periodo-biografico.html',
    () => {},
);
// Idem, pro Grupo (ver visualizar-grupo.js) — botão "Ver" do card em
// Grupos.
registrarModal('modal-visualizar-grupo', 'modal-visualizar-grupo.html', () => {});
// Idem, agora pra Morfofuncionalidade (ver visualizar-estrutura-textual.js).
registrarModal(
    'modal-visualizar-estrutura-textual',
    'modal-visualizar-estrutura-textual.html',
    () => {},
);

// ─── Listener delegado para as listas (render-listas.js) ─────
// render-listas.js gera botões/checkboxes com data-action + data-id/
// data-tipo/data-dir/data-pagina em vez de onclick="..." inline —
// isso tira ~20 onclick espalhados em template strings (Livros,
// Partes, Seções, Poemas, Prosas, Elementos, paginação e checkboxes
// de seleção em massa). Um único listener aqui, no <main> que
// engloba todas essas listas, substitui os handlers individuais;
// como as listas são recriadas via innerHTML a cada render, delegar
// no ancestral estável evita ter que re-ligar listeners depois de
// cada renderLists(). index.html (botões estáticos) e os modais
// continuam usando onclick por enquanto — ver conversa anterior.
const ACOES_LISTA = {
    'editar-livro': (el) => editarLivro(Number(el.dataset.id)),
    'editar-parte': (el) => editarParte(Number(el.dataset.id)),
    'editar-secao': (el) => editarSecao(Number(el.dataset.id)),
    'editar-poema': (el) => editarPoema(Number(el.dataset.id)),
    'editar-prosa': (el) => editarProsa(Number(el.dataset.id)),
    'editar-elemento': (el) => editarElemento(Number(el.dataset.id)),
    'ver-textos-pessoa': (el) => verTextosPessoa(Number(el.dataset.id)),
    'ver-textos-epoca': (el) => verTextosEpoca(Number(el.dataset.id)),
    'toggle-ocultar-epoca': (el) => toggleOcultarEpoca(Number(el.dataset.id)),
    'ver-periodo-historico': (el) => abrirVisualizacaoPeriodoHistorico(Number(el.dataset.id)),
    'ver-periodo-biografico': (el) => abrirVisualizacaoPeriodoBiografico(Number(el.dataset.id)),
    'alternar-ramo-epoca': (el) => alternarRamoEpoca(Number(el.dataset.id)),
    'recolher-todas-epocas': () => recolherTodasEpocas(),
    'expandir-todas-epocas': () => expandirTodasEpocas(),
    'alternar-ramo-periodo-historico': (el) => alternarRamoPeriodoHistorico(Number(el.dataset.id)),
    'recolher-todos-periodos-historicos': () => recolherTodosPeriodosHistoricos(),
    'expandir-todos-periodos-historicos': () => expandirTodosPeriodosHistoricos(),
    'alternar-ramo-corrente': (el) => alternarRamoCorrente(Number(el.dataset.id)),
    'recolher-todas-correntes': () => recolherTodasCorrentes(),
    'expandir-todas-correntes': () => expandirTodasCorrentes(),
    'ver-textos-periodo-historico': (el) => verTextosPeriodoHistorico(Number(el.dataset.id)),
    'ver-textos-movimento-escola': (el) => verTextosMovimentoEscola(Number(el.dataset.id)),
    'ver-textos-autor': (el) => verTextosAutor(Number(el.dataset.id)),
    'ver-autores-movimento-escola': (el) => verAutoresMovimentoEscola(Number(el.dataset.id)),
    'editar-pessoa': (el) => editarPessoa(Number(el.dataset.id)),
    'editar-personagem': (el) => editarPersonagem(Number(el.dataset.id)),
    'ver-textos-personagem': (el) => verTextosPersonagem(Number(el.dataset.id)),
    'sugerir-ecos': (el) => abrirSugestaoEcos(el.dataset.especie, Number(el.dataset.id)),
    'editar-grupo': (el) => editarGrupo(Number(el.dataset.id)),
    'ver-grupo': (el) => abrirVisualizacaoGrupo(Number(el.dataset.id)),
    'novo-subgrupo': (el) => prepararNovoSubgrupo(Number(el.dataset.id)),
    'toggle-grupo-colapso': (el) => toggleColapsoGrupo(Number(el.dataset.id)),
    'editar-autor': (el) => editarAutor(Number(el.dataset.id)),
    'ver-autor': (el) => abrirVisualizacaoAutor(Number(el.dataset.id)),
    'ver-livro': (el) => abrirVisualizacaoLivro(Number(el.dataset.id)),
    'ver-parte': (el) => abrirVisualizacaoParteSecao('parte', Number(el.dataset.id)),
    'ver-secao': (el) => abrirVisualizacaoParteSecao('secao', Number(el.dataset.id)),
    'ver-elemento': (el) => abrirVisualizacaoElemento(Number(el.dataset.id)),
    // Título de Elemento na aba Estrutura: abre o Ver sem lista de navegação.
    'ver-elemento-estrutura': (el) =>
        abrirVisualizacaoElemento(Number(el.dataset.id), { navegar: false }),
    // Título de Parte e de Seção na aba Estrutura: abre o Ver sem lista de navegação.
    // O título fica dentro do <summary>: sem preventDefault o clique recolheria.
    'ver-parte-estrutura': (el, e) => {
        e?.preventDefault?.();
        e?.stopPropagation?.();
        abrirParteSecaoDaEstrutura('parte', Number(el.dataset.id));
    },
    'ver-secao-estrutura': (el, e) => {
        e?.preventDefault?.();
        e?.stopPropagation?.();
        abrirParteSecaoDaEstrutura('secao', Number(el.dataset.id));
    },
    'editar-epoca': (el) => editarEpoca(Number(el.dataset.id)),
    'editar-periodo-historico': (el) => editarPeriodoHistorico(Number(el.dataset.id)),
    'editar-assunto': (el) => editarAssunto(Number(el.dataset.id)),
    'ver-textos-assunto': (el) => verTextosAssunto(Number(el.dataset.id)),
    'editar-tema': (el) => editarTema(Number(el.dataset.id)),
    'ver-textos-tema': (el) => verTextosTema(Number(el.dataset.id)),
    'excluir-tema': (el) => excluirTema(Number(el.dataset.id)),
    'alternar-categoria-etiquetas': (el) => alternarCategoriaEtiquetas(el.dataset.categoria),
    'recolher-todas-etiquetas': () => recolherTodasEtiquetas(),
    'expandir-todas-etiquetas': () => expandirTodasEtiquetas(),
    'editar-etiqueta': (el) => editarEtiqueta(Number(el.dataset.id)),
    'ver-textos-etiqueta': (el) => verTextosEtiqueta(Number(el.dataset.id)),
    'excluir-etiqueta': (el) => excluirEtiquetaComAviso(Number(el.dataset.id)),
    'alternar-categoria-tag-clusters': (el) => alternarCategoriaTagClusters(el.dataset.categoria),
    'ir-etiquetas-sem-cluster': () => irParaEtiquetasSemCluster(),
    'alternar-tag-cluster': (el) => alternarTagCluster(Number(el.dataset.id)),
    'recolher-todos-tag-clusters': () => recolherTodosTagClusters(),
    'expandir-todos-tag-clusters': () => expandirTodosTagClusters(),
    'importar-tag-clusters': () => abrirImportarTagClusters(),
    'baixar-tag-clusters': () => baixarTagClusters(),
    'alternar-modo-selecao-tag-clusters': () => alternarModoSelecaoTagClusters(),
    'toggle-selecao-tag-cluster': (el) => toggleSelecaoTagCluster(el),
    'marcar-todos-tag-clusters': () => marcarTodosTagClusters(),
    'limpar-selecao-tag-clusters': () => limparSelecaoTagClusters(),
    'abrir-importar-campos': () => abrirImportarCampos(),
    'aplicar-importar-campos': () => aplicarImportacaoCampos(),
    'desfazer-importar-campos': () => desfazerImportacaoCampos(),
    'baixar-modelo-campos': () => baixarModeloCampos(),
    'baixar-modelo-campos-vocabulario': () => baixarModeloCampos({ comVocabulario: true }),
    'desfazer-importacao-tag-clusters': () => desfazerImportacaoTagClusters(),
    'novo-subcluster': (el) => novoTagCluster(Number(el.dataset.id)),
    'editar-tag-cluster': (el) => editarTagCluster(Number(el.dataset.id)),
    'ver-textos-tag-cluster': (el) => verTextosTagCluster(Number(el.dataset.id)),
    'excluir-tag-cluster': (el) => excluirTagClusterComAviso(Number(el.dataset.id)),
    'tirar-etiqueta-do-cluster': (el) => tirarEtiquetaDoCluster(Number(el.dataset.id)),
    'mover-etiqueta-cluster': (el) => abrirMoverEtiquetaDoCluster(el),
    'mesclar-duplicata-etiqueta': (el) =>
        mesclarDuplicataEtiqueta(Number(el.dataset.manter), Number(el.dataset.remover)),
    'nao-sao-iguais-etiqueta': (el) =>
        marcarEtiquetasNaoIguaisComAviso(Number(el.dataset.a), Number(el.dataset.b)),
    'editar-local': (el) => editarLocalNaTela(Number(el.dataset.id)),
    'novo-sublocal': (el) => novoSublocal(Number(el.dataset.id)),
    'excluir-local': (el) => excluirLocalComAviso(Number(el.dataset.id)),
    'ver-textos-local': (el) => verTextosLocal(Number(el.dataset.id)),
    'toggle-local-colapso': (el) => alternarColapsoLocal(Number(el.dataset.id)),
    'recolher-todos-locais': () => recolherTodosLocais(),
    'expandir-todos-locais': () => expandirTodosLocais(),
    'mesclar-duplicata': (el) =>
        mesclarDuplicataComConfirmacao(Number(el.dataset.manter), Number(el.dataset.remover)),
    'nao-sao-iguais': (el) => marcarNaoIguaisComAviso(Number(el.dataset.a), Number(el.dataset.b)),
    // Assunto → Tema: abre a aba Temas já filtrada pelo nome clicado.
    'ir-para-tema': (el) =>
        abrirPorAtalho({
            destino: 'temas',
            descricao: `Filtrando temas por “${el.dataset.nome}”`,
            controles: ['busca-temas', 'filtro-temas-sem-assunto'],
            aplicar: () => definirBuscaTemas(el.dataset.nome),
            limpar: () => definirBuscaTemas(''),
        }),
    'ir-para-temas-sem-assunto': () =>
        abrirPorAtalho({
            destino: 'temas',
            descricao: 'Mostrando só temas sem assunto',
            controles: ['busca-temas', 'filtro-temas-sem-assunto'],
            aplicar: () => filtrarTemasSemAssunto(),
            limpar: () => {
                const semAssunto = document.getElementById('filtro-temas-sem-assunto');
                if (semAssunto) semAssunto.checked = false;
                definirBuscaTemas('');
            },
        }),
    'editar-movimento-escola': (el) => editarMovimentoEscola(Number(el.dataset.id)),
    'ver-movimento-escola': (el) => abrirVisualizacaoMovimentoEscola(Number(el.dataset.id)),
    'editar-sonoridade': (el) => editarSonoridade(Number(el.dataset.id)),
    'editar-molde': (el) => editarMolde(Number(el.dataset.id)),
    'promover-molde': (el) => promoverMolde(Number(el.dataset.id)),
    'baixar-molde': (el) => baixarMoldePorId(Number(el.dataset.id)),
    'editar-estrutura-textual': (el) => editarEstruturaTextual(Number(el.dataset.id)),
    // "Ver" ganhou visualização somente-leitura própria nesta sessão
    // (antes abria o mesmo modal de edição — ver visualizar-sonoridade.js
    // pro porquê de ser um modal à parte em vez de reaproveitar
    // modal-visualizar, que é específico de Poemas/Prosas).
    'ver-sonoridade': (el) => abrirVisualizacaoSonoridade(Number(el.dataset.id)),
    'baixar-sonoridade': (el) =>
        exportarEscansao(Number(el.dataset.id), getFormatoBaixar('sonoridade')),
    // Mesmo padrão de Ver/Baixar de Sonoridade acima, agora pra
    // Morfofuncionalidade (painel "⚙️ Ações ▾" replicado de Sonoridade;
    // painel "Colunas ▾" — Unidades/Eventos — adicionado numa leva
    // seguinte, ver celulaAcoesEstruturaTextual/renderEstruturaTextual
    // em render-listas.js).
    'ver-estrutura-textual': (el) => abrirVisualizacaoEstruturaTextual(Number(el.dataset.id)),
    'baixar-estrutura-textual': (el) =>
        exportarEstruturaTextual(Number(el.dataset.id), getFormatoBaixar('estrutura-textual')),
    'mesclar-item': (el) => abrirModalMesclar(el.dataset.tipo, Number(el.dataset.id)),
    'excluir-item': (el) => deleteItem(el.dataset.tipo, Number(el.dataset.id)),
    'ver-item': (el) =>
        abrirVisualizacao(el.dataset.tipo, Number(el.dataset.id), { navegar: true }),
    // Ver um poema sem lista de navegação (usado nas Conexões, onde não há
    // uma tabela de referência para o Anterior/Próximo).
    'ver-poema': (el) => abrirVisualizacao('poema', Number(el.dataset.id)),
    // Idem para prosa (títulos da aba Estrutura).
    'editar-posicao-estrutura': (el, e) => editarPosicaoEstrutura(el, e),
    'ver-prosa': (el) => abrirVisualizacao('prosa', Number(el.dataset.id)),
    'baixar-item': (el) =>
        exportarItem(el.dataset.tipo, Number(el.dataset.id), getFormatoBaixar(el.dataset.tabela)),
    'mover-livro': (el) => moverLivro(Number(el.dataset.id), el.dataset.dir),
    'pagina-poemas': (el) => setPaginaPoemas(Number(el.dataset.pagina)),
    'pagina-prosas': (el) => setPaginaProsas(Number(el.dataset.pagina)),
    'pagina-sonoridade': (el) => setPaginaSonoridade(Number(el.dataset.pagina)),
    'pagina-moldes': (el) => setPaginaMoldes(Number(el.dataset.pagina)),
    'pagina-estrutura-textual': (el) => setPaginaEstruturaTextual(Number(el.dataset.pagina)),
    'toggle-poema': (el, e) =>
        toggleSelecao('poemas', el.checked, Number(el.dataset.id), e?.shiftKey),
    'toggle-prosa': (el, e) =>
        toggleSelecao('prosas', el.checked, Number(el.dataset.id), e?.shiftKey),
    'toggle-autor': (el, e) => toggleSelecaoAutor(Number(el.dataset.id), el.checked, e?.shiftKey),
    'toggle-todos-autores': (el) => toggleSelecaoTodosAutores(el.checked),
    'toggle-pessoa': (el, e) => toggleSelecaoPessoa(Number(el.dataset.id), el.checked, e?.shiftKey),
    'toggle-todos-pessoas': (el) => toggleSelecaoTodosPessoas(el.checked),
    'toggle-epoca': (el, e) => toggleSelecaoEpoca(Number(el.dataset.id), el.checked, e?.shiftKey),
    'toggle-todos-epocas': (el) => toggleSelecaoTodosEpocas(el.checked),
    'aplicar-massa-epocas': () => aplicarMassaEpocas(),
    'alternar-ocultas-massa-epocas': () => alternarOcultasNaBarraEpocas(),
    'inverter-selecao-epocas': () => inverterSelecaoEpocas(),
    'limpar-selecao-epocas': () => limparSelecaoEpocas(),
    'toggle-periodo-historico': (el, e) =>
        toggleSelecaoPeriodoHistorico(Number(el.dataset.id), el.checked, e?.shiftKey),
    'toggle-todos-periodos-historicos': (el) => toggleSelecaoTodosPeriodosHistoricos(el.checked),
    'aplicar-massa-periodos-historicos': () => aplicarMassaBarraPeriodosHistoricos(),
    'inverter-selecao-periodos-historicos': () => inverterSelecaoPeriodosHistoricos(),
    'limpar-selecao-periodos-historicos': () => limparSelecaoPeriodosHistoricos(),
    'toggle-corrente': (el, e) =>
        toggleSelecaoCorrente(Number(el.dataset.id), el.checked, e?.shiftKey),
    'toggle-todas-correntes': (el) => toggleSelecaoTodasCorrentes(el.checked),
    'aplicar-massa-correntes': () => aplicarMassaBarraCorrentes(),
    'inverter-selecao-correntes': () => inverterSelecaoCorrentes(),
    'limpar-selecao-correntes': () => limparSelecaoCorrentes(),
    'toggle-ocultar-pessoa': (el) => toggleOcultarPessoa(Number(el.dataset.id)),
    'toggle-ocultar-grupo': (el) => toggleOcultarGrupo(Number(el.dataset.id)),
    'toggle-todos-poemas': (el) => toggleSelecaoTodos('poemas', el.checked),
    'toggle-todos-prosas': (el) => toggleSelecaoTodos('prosas', el.checked),
    'selecionar-pagina-poemas': (el) =>
        selecionarPagina('poemas', el.dataset.ids.split(',').map(Number)),
    'selecionar-pagina-prosas': (el) =>
        selecionarPagina('prosas', el.dataset.ids.split(',').map(Number)),
    'selecionar-restantes-poemas': (el) =>
        selecionarRestantes('poemas', el.dataset.ids.split(',').map(Number)),
    'selecionar-restantes-prosas': (el) =>
        selecionarRestantes('prosas', el.dataset.ids.split(',').map(Number)),
    'baixar-diagrama-ecos': (el) => baixarDiagramaEcos(el),
    'baixar-conexoes': () => baixarConexoes(),
    'alternar-modo-selecao-conexoes': () => alternarModoSelecaoConexoes(),
    'toggle-selecao-conexao': (el) => toggleSelecaoConexao(el),
    'marcar-todos-conexoes': () => marcarTodosConexoes(),
    'limpar-selecao-conexoes': () => limparSelecaoConexoes(),
};

// Os modais moram em #modais-container, fora de <main>: sem o segundo
// listener, os botões com data-action dentro de um modal (ex.: Importar
// campos) não respondem.
function delegarAcoes(e) {
    const alvo = e.target.closest('[data-action]');
    if (!alvo) return;
    const acao = ACOES_LISTA[alvo.dataset.action];
    if (acao) acao(alvo, e);
}
document.querySelector('main')?.addEventListener('click', delegarAcoes);
document.getElementById('modais-container')?.addEventListener('click', delegarAcoes);

// Caixa "Página N de M" da paginação (montarPaginacao): ao confirmar o número
// (Enter ou sair do campo), abre a página pedida pela mesma ação dos botões
// Anterior/Próxima. Valor inválido ou igual à página atual só restaura a caixa.
document.querySelector('main')?.addEventListener('change', (e) => {
    const campo = e.target.closest?.('input[data-pagina-input]');
    if (!campo) return;
    const atual = Number(campo.dataset.paginaAtual);
    const destino = interpretarPaginaDigitada(campo.value, Number(campo.dataset.paginaTotal));
    if (destino === null || destino === atual) {
        campo.value = String(atual);
        return;
    }
    ACOES_LISTA[campo.dataset.paginaInput]?.({ dataset: { pagina: String(destino) } });
});

// Padrões de colunas salvos pela pessoa (seletor "Colunas") moram em
// `db.padroesColunas`, não no localStorage: assim vão no backup JSON, nos
// snapshots e voltam na restauração. Registrado antes do primeiro render.
usarArmazenamentoPadroes({
    ler: (tabela) => db.padroesColunas?.[tabela] ?? [],
    gravar: (tabela, lista) => {
        db.padroesColunas = { ...db.padroesColunas, [tabela]: lista };
        save();
    },
});

// ─── Inicialização ───────────────────────────────────────────
// Note que initEditor/initFormX não são mais chamados aqui — eles
// rodam sob demanda, depois que o fetch do modal correspondente
// resolve (ver registrarModal acima e modais.js).

// Esvaziar o acervo em outra aba (Fase 13, etapa 13c): esta aba ainda tem o db
// antigo na memória e, se gravasse, traria tudo de volta. O ouvinte trava o
// salvamento e recarrega. Registrado já no carregamento do módulo, antes de
// qualquer await, para não haver janela em que a mensagem se perca.
ouvirEsvaziamentoDeOutraAba({ avisar: (texto) => mostrarAviso(texto, 'info') });

document.addEventListener('DOMContentLoaded', async () => {
    // Migra imagens/capas salvas no formato antigo (base64 dentro do db)
    // antes do primeiro render — ver comentário em db.js. Roda uma vez;
    // depois disso não há mais pendentes e a função retorna na hora.
    await migrarImagensLegadasParaIndexedDB();

    initTema();
    initFusoHorario();
    initNav();
    renderColetaneas();
    renderLists();
    atualizarDatalist();
    atualizarDatalistProsa();
    popularSelecaoExportacao();
    atualizarIndicadorBackup();
    atualizarIndicadorStorage();
    renderListaSnapshots();
    // Aplica o estado salvo de "Download abrangente" ao checkbox estático
    // da barra de seleção em massa de Poemas (o do modal "Ver" e o do
    // painel "⚙️ Ações ▾" já nascem com o estado certo, um por ser
    // atualizado a cada abertura — visualizar.js — e o outro por ser
    // remontado via innerHTML a cada render — celulas-tabela.js).
    sincronizarCheckboxesComEstadoSalvo();
    sincronizarChecksDadosPessoaisComEstadoSalvo();
    montarControlesIncluirOcultos();
    montarControlesAgruparComuns();
    montarControlesPrevias();

    // Lembra a última escolha de "incluir capas" no backup (padrão: marcado,
    // já que o botão "Baixar JSON" é o backup "de verdade" — melhor pecar
    // por incluir demais do que a pessoa esquecer de marcar e perder capas).
    const chkCapas = document.getElementById('chk-incluir-capas');
    const prefCapas = localStorage.getItem('arquivoPoetico_incluirCapasBackup');
    if (chkCapas && prefCapas !== null) chkCapas.checked = prefCapas === 'true';

    // Resultado do "Esvaziar o acervo" que acabou de recarregar a página.
    mostrarAvisoPosEsvaziar((texto) => mostrarAviso(texto, 'sucesso'));

    // Por último: só abre sozinho se a pessoa nunca marcou "não exibir
    // novamente" — depois do resto da tela já estar montada, senão o
    // modal abriria por cima de uma página ainda incompleta.
    await abrirModoAprendizadoSeNecessario();
});

// ─── Lista de backups automáticos (ver autobackup.js) ─────────
function formatarDataSnapshot(iso) {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

async function renderListaSnapshots() {
    const container = document.getElementById('lista-snapshots');
    if (!container) return;

    const snapshots = await listarSnapshots();
    if (snapshots.length === 0) {
        container.innerHTML =
            '<p class="text-gray-400 dark:text-slate-500">Nenhum snapshot automático ainda — aparece aqui depois de um tempinho de uso.</p>';
        return;
    }

    container.innerHTML = snapshots
        .map(
            (s, i) => `
        <div class="flex items-center justify-between bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5">
            <span class="text-gray-600 dark:text-slate-300">${formatarDataSnapshot(s.dataISO)}${i === 0 ? ' <span class="text-emerald-600 dark:text-emerald-400 font-bold">· mais recente</span>' : ''}</span>
            <button data-snapshot-id="${s.id}" onclick="baixarSnapshotPorId(this.dataset.snapshotId)"
                class="text-blue-600 dark:text-blue-400 hover:underline font-bold">baixar</button>
        </div>`,
        )
        .join('');
}
window.addEventListener('backup:feito', renderListaSnapshots);
window.addEventListener('snapshot:criado', renderListaSnapshots);

window.baixarSnapshotPorId = async function (id) {
    const snapshots = await listarSnapshots();
    const registro = snapshots.find((s) => s.id === id);
    if (registro) baixarSnapshot(registro);
};

// ─── Indicador de "último backup" ─────────────────────────────
// Item 5 da revisão: antes o único jeito de saber se o backup estava
// desatualizado era lembrar de cabeça. Mostra há quanto tempo o botão
// "Baixar JSON" foi clicado pela última vez, com cor de alerta crescente.
function atualizarIndicadorBackup() {
    const el = document.getElementById('indicador-backup');
    if (!el) return;

    const ultimo = getUltimoBackup();
    if (!ultimo) {
        el.textContent = 'Nenhum backup baixado ainda';
        el.className = 'text-xs font-medium text-red-500 dark:text-red-400';
        return;
    }

    const dias = Math.floor((Date.now() - ultimo.getTime()) / 86400000);
    let texto, cor;
    if (dias <= 0) {
        texto = 'Último backup: hoje';
        cor = 'text-emerald-600 dark:text-emerald-400';
    } else if (dias === 1) {
        texto = 'Último backup: ontem';
        cor = 'text-emerald-600 dark:text-emerald-400';
    } else if (dias <= 3) {
        texto = `Último backup: há ${dias} dias`;
        cor = 'text-gray-400 dark:text-slate-500';
    } else if (dias <= 7) {
        texto = `Último backup: há ${dias} dias`;
        cor = 'text-amber-600 dark:text-amber-400';
    } else {
        texto = `Último backup: há ${dias} dias`;
        cor = 'text-red-500 dark:text-red-400';
    }

    el.textContent = texto;
    el.className = `text-xs font-medium ${cor}`;
}
window.addEventListener('backup:feito', atualizarIndicadorBackup);

// ─── Indicador de uso do storage ───────────────────────────────
// Antecipa o erro de quota (ver try/catch em save()): mostra uma barra com
// a estimativa de uso do localStorage a cada salvamento, em vez de só
// reagir quando o navegador já recusou gravar. É estimativa (JSON.stringify
// não bate 1:1 com bytes reais), então a barra é só um sinal de alerta —
// os limiares (60/85%) têm folga de propósito.
let avisoStorageMostrado = false; // evita repetir o toast a cada save() na mesma sessão

function atualizarIndicadorStorage() {
    const barra = document.getElementById('barra-storage');
    const el = document.getElementById('indicador-storage');
    if (!barra || !el) return;

    const { bytes, percentual, limiteBytes } = getUsoStorage();
    const kb = Math.round(bytes / 1024).toLocaleString('pt-BR');
    const limiteMb = Math.round(limiteBytes / (1024 * 1024));

    let cor, corBarra;
    if (percentual < 60) {
        cor = 'text-gray-400 dark:text-slate-500';
        corBarra = 'bg-emerald-500';
    } else if (percentual < 85) {
        cor = 'text-amber-600 dark:text-amber-400';
        corBarra = 'bg-amber-500';
    } else {
        cor = 'text-red-500 dark:text-red-400';
        corBarra = 'bg-red-500';
    }

    barra.className = `h-full rounded-full transition-all ${corBarra}`;
    barra.style.width = `${Math.max(3, percentual)}%`; // largura mínima só pra barra não sumir com uso baixo

    el.textContent = `${percentual.toFixed(0)}% · ${kb} KB`;
    el.className = `text-xs font-medium ${cor}`;
    el.title = `Estimativa de uso do localStorage (limite real varia por navegador — usamos ~${limiteMb} MB como referência conservadora)`;

    if (percentual >= 85 && !avisoStorageMostrado) {
        avisoStorageMostrado = true;
        mostrarAviso(
            `⚠️ Armazenamento em ${percentual.toFixed(0)}% da estimativa — baixe um backup em JSON antes de continuar adicionando itens.`,
            'erro',
        );
    } else if (percentual < 85) {
        avisoStorageMostrado = false; // se a pessoa liberar espaço (ex: apagar itens), o aviso pode voltar a aparecer depois
    }
}
window.addEventListener('db:saved', atualizarIndicadorStorage);

// ─── Feedback de "salvo" ────────────────────────────────────────
// Sem backend, não existe "sincronizando..." — esse toast é o único
// jeito de saber que a ação realmente foi persistida no localStorage
// (ver avisarSalvo() em utils.js pro porquê de ele coalescer e nunca
// empilhar vários "✓ salvo" em sequências rápidas de ações).
window.addEventListener('db:saved', () => avisarSalvo());

// ─── Importar / Exportar JSON ────────────────────────────────

window.exportarJSON = exportarJSON;

window.importarJSON = function (event) {
    const reader = new FileReader();
    reader.onload = async function (e) {
        try {
            const novoDb = JSON.parse(e.target.result);
            await importarDB(novoDb);
            location.reload();
        } catch {
            mostrarAviso('Erro ao importar arquivo JSON.');
        }
    };
    reader.readAsText(event.target.files[0]);
};

// ─── Funções globais exigidas pelos onclick no HTML ──────────
// O HTML usa onclick="funcao()" inline, então precisam estar
// no escopo global (window). Com ES Modules isso é explícito.

window.openTab = openTab;
window.abrirAba = abrirAba;
window.toggleMenuMobile = toggleMenuMobile;
window.toggleModal = toggleModal;
window.prepararNovo = prepararNovo;
window.prepararNovaSonoridade = prepararNovaSonoridade;
window.prepararNovoMolde = prepararNovoMolde;
window.importarMoldeDeArquivo = importarMoldeDeArquivo;
window.baixarMoldeAoVivo = baixarMoldeAoVivo;
window.importarSonoridadeDeArquivo = importarSonoridadeDeArquivo;
window.processarArquivoImportacaoAditiva = processarArquivoImportacaoAditiva;
window.definirDecisaoReferenciaAditiva = definirDecisaoReferenciaAditiva;
window.aplicarImportacaoAditivaClick = aplicarImportacaoAditivaClick;
window.abrirModalEsvaziarAcervo = abrirModalEsvaziarAcervo;
window.atualizarModalEsvaziarAcervo = atualizarModalEsvaziarAcervo;
window.confirmarEsvaziarAcervo = confirmarEsvaziarAcervo;
window.abrirModalRelatorioPeriodos = abrirModalRelatorioPeriodos;
window.atualizarModalRelatorioPeriodos = atualizarModalRelatorioPeriodos;
window.baixarRelatorioPeriodos = baixarRelatorioPeriodos;
window.baixarBackupCompleto = baixarBackupCompleto;
window.baixarSoExtras = baixarSoExtras;
window.restaurarExtrasArquivo = restaurarExtrasArquivo;
window.cancelarImportacaoAditiva = cancelarImportacaoAditiva;
window.selecionarPacoteBiblioteca = selecionarPacoteBiblioteca;
window.fecharDetalhePacoteBiblioteca = fecharDetalhePacoteBiblioteca;
window.usarPacoteBiblioteca = function () {
    if (confirmarUsoPacoteBiblioteca()) abrirAba('importacao-aditiva');
};
window.alternarSelecaoPacoteBiblioteca = alternarSelecaoPacoteBiblioteca;
window.alternarSelecionarTodosBiblioteca = alternarSelecionarTodosBiblioteca;
window.importarSelecionadosBiblioteca = async function () {
    if (await confirmarImportarSelecionadosBiblioteca()) abrirAba('importacao-aditiva');
};
window.importarTodosBiblioteca = async function () {
    if (await confirmarImportarTodosBiblioteca()) abrirAba('importacao-aditiva');
};
window.lerArquivoTextoBiblioteca = lerArquivoTextoBiblioteca;
window.atualizarPreviaTextoBiblioteca = atualizarPreviaTextoBiblioteca;
window.enviarTextoParaImportacao = function () {
    if (confirmarEnvioTextoBiblioteca()) abrirAba('importacao-aditiva');
};
window.limparFormTextoBiblioteca = limparFormTextoBiblioteca;
window.sugerirSequencia = sugerirSequencia;
window.abrirModoAprendizado = abrirModoAprendizado;
window.avancarModoAprendizadoPerfil = avancarModoAprendizadoPerfil;
window.voltarModoAprendizadoPerfil = voltarModoAprendizadoPerfil;
window.iniciarTourModoAprendizado = iniciarTourModoAprendizado;
window.abrirCentralAjuda = abrirCentralAjuda;
window.abrirApresentacaoDaAjuda = abrirApresentacaoDaAjuda;
// O tour troca de aba pelo mesmo caminho da nav (abrirAba); injetado aqui
// pra tour.js não importar ui.js.
definirNavegacaoTour(abrirAba);
window.filtrarDestinoPoema = filtrarDestinoPoema;
window.filtrarDestinoProsa = filtrarDestinoProsa;
window.autoPreencherDataPublicacao = autoPreencherDataPublicacao;

// editarLivro/Parte/Secao/Poema/Prosa/Elemento e deleteItem não
// precisam mais de window.X — só eram chamados via onclick gerado em
// render-listas.js, que agora usa data-action + o listener delegado
// acima. Continuam importados normalmente (uso local no ACOES_LISTA).

window.adicionarSinalTradicao = adicionarSinalTradicao;
window.removerSinalTradicao = removerSinalTradicao;
window.editarSinalTradicao = editarSinalTradicao;
window.adicionarSinalEstilo = adicionarSinalEstilo;
window.removerSinalEstilo = removerSinalEstilo;
window.editarSinalEstilo = editarSinalEstilo;
window.adicionarTemaTexto = adicionarTemaTexto;
window.adicionarTerritorialidadeTexto = adicionarTerritorialidadeTexto;
window.removerTerritorialidadeTexto = removerTerritorialidadeTexto;
window.definirLocalEscritaTexto = definirLocalEscritaTexto;
window.limparLocalEscritaTexto = limparLocalEscritaTexto;
window.adicionarIdiomaTexto = adicionarIdiomaTexto;
window.removerIdiomaTexto = removerIdiomaTexto;
window.definirPapelIdiomaTexto = definirPapelIdiomaTexto;
window.adicionarDialetoIdiomaTexto = adicionarDialetoIdiomaTexto;
window.removerDialetoIdiomaTexto = removerDialetoIdiomaTexto;
window.adicionarJargaoGiriaTexto = adicionarJargaoGiriaTexto;
window.removerJargaoGiriaTexto = removerJargaoGiriaTexto;
window.removerTemaTexto = removerTemaTexto;
window.mudarPapelTemaTexto = mudarPapelTemaTexto;
window.mudarPapelAssuntoTexto = mudarPapelAssuntoTexto;
window.abrirAssuntoTemaTexto = abrirAssuntoTemaTexto;
window.fecharAssuntoTemaTexto = fecharAssuntoTemaTexto;
window.adicionarAssuntoTemaTexto = adicionarAssuntoTemaTexto;
window.desfazerAssuntoPendenteTexto = desfazerAssuntoPendenteTexto;
window.adicionarSinalTema = adicionarSinalTema;
window.removerSinalTema = removerSinalTema;
window.editarSinalTema = editarSinalTema;
window.adicionarSinalTerritorialidade = adicionarSinalTerritorialidade;
window.removerSinalTerritorialidade = removerSinalTerritorialidade;
window.editarSinalTerritorialidade = editarSinalTerritorialidade;
window.adicionarSinalRelacao = adicionarSinalRelacao;
window.removerSinalRelacao = removerSinalRelacao;
window.editarSinalRelacao = editarSinalRelacao;
window.adicionarSinalSensibilidade = adicionarSinalSensibilidade;
window.removerSinalSensibilidade = removerSinalSensibilidade;
window.editarSinalSensibilidade = editarSinalSensibilidade;
window.adicionarSinalTom = adicionarSinalTom;
window.removerSinalTom = removerSinalTom;
window.editarSinalTom = editarSinalTom;
window.adicionarSinalDominioImagetico = adicionarSinalDominioImagetico;
window.removerSinalDominioImagetico = removerSinalDominioImagetico;
window.editarSinalDominioImagetico = editarSinalDominioImagetico;
window.adicionarSinalOutros = adicionarSinalOutros;
window.removerSinalOutros = removerSinalOutros;
window.editarSinalOutros = editarSinalOutros;
window.adicionarPessoa = adicionarPessoa;
window.adicionarPersonagem = (tabela) => adicionarPersonagem(tabela);
window.removerPessoa = removerPessoa;
window.alternarPapelPessoa = alternarPapelPessoa;
window.alternarDropdownPapelPessoa = alternarDropdownPapelPessoa;
window.adicionarGrupoDireto = adicionarGrupoDireto;
window.removerGrupoDireto = removerGrupoDireto;
window.abrirSugestoesGrupoDireto = abrirSugestoesGrupoDireto;
window.fecharSugestoesGrupoDireto = fecharSugestoesGrupoDireto;
window.selecionarGrupoDireto = selecionarGrupoDireto;
window.adicionarAutoria = adicionarAutoria;
window.removerAutoria = removerAutoria;
window.alterarPapelAutoria = alterarPapelAutoria;
window.alterarAssinaturaAutoria = alterarAssinaturaAutoria;
window.alterarNomeLiterarioAutoria = alterarNomeLiterarioAutoria;
window.definirAutoclassificacao = definirAutoclassificacao;
window.limparAutoclassificacao = limparAutoclassificacao;
window.adicionarEnvio = adicionarEnvio;
window.editarEnvio = editarEnvio;
window.cancelarEdicaoEnvio = cancelarEdicaoEnvio;
window.removerEnvio = removerEnvio;
window.adicionarReconhecimento = adicionarReconhecimento;
window.editarReconhecimento = editarReconhecimento;
window.cancelarEdicaoReconhecimento = cancelarEdicaoReconhecimento;
window.removerReconhecimento = removerReconhecimento;
window.adicionarGeneroProsa = adicionarGeneroProsa;
window.removerGeneroProsa = removerGeneroProsa;
window.editarGeneroProsa = editarGeneroProsa;
window.adicionarNomeLiterarioAutor = adicionarNomeLiterarioAutor;
window.adicionarOcupacaoAutor = adicionarOcupacaoAutor;
window.removerOcupacaoAutor = removerOcupacaoAutor;
window.editarOcupacaoAutor = editarOcupacaoAutor;
window.removerNomeLiterarioAutor = removerNomeLiterarioAutor;
window.editarNomeLiterarioAutor = editarNomeLiterarioAutor;
window.alterarTipoNomeLiterarioAutor = alterarTipoNomeLiterarioAutor;
window.adicionarCondicaoClinicaAutor = adicionarCondicaoClinicaAutor;
window.removerCondicaoClinicaAutor = removerCondicaoClinicaAutor;
window.editarCondicaoClinicaAutor = editarCondicaoClinicaAutor;
window.alterarTipoCondicaoClinicaAutor = alterarTipoCondicaoClinicaAutor;
window.adicionarDeficienciaAutor = adicionarDeficienciaAutor;
window.removerDeficienciaAutor = removerDeficienciaAutor;
window.editarDeficienciaAutor = editarDeficienciaAutor;
window.alterarTipoDeficienciaAutor = alterarTipoDeficienciaAutor;
window.adicionarNeurodivergenciaAutor = adicionarNeurodivergenciaAutor;
window.removerNeurodivergenciaAutor = removerNeurodivergenciaAutor;
window.editarNeurodivergenciaAutor = editarNeurodivergenciaAutor;
window.adicionarInstituicaoAutor = adicionarInstituicaoAutor;
window.removerInstituicaoAutor = removerInstituicaoAutor;
window.editarInstituicaoAutor = editarInstituicaoAutor;
window.adicionarMovimentoEscolaDireto = adicionarMovimentoEscolaDireto;
window.adicionarDivisaoCorrenteDireta = adicionarDivisaoCorrenteDireta;
window.removerMovimentoEscolaDireto = removerMovimentoEscolaDireto;
window.adicionarPeriodoHistoricoDoTexto = adicionarPeriodoHistoricoDoTexto;
window.removerPeriodoHistoricoDoTexto = removerPeriodoHistoricoDoTexto;
window.removerEpocaRetratadaDoTexto = removerEpocaRetratadaDoTexto;
window.alterarRecorteEpocaRetratadaDoTexto = alterarRecorteEpocaRetratadaDoTexto;
window.adicionarEpocaRetratadaComSugestao = adicionarEpocaRetratadaComSugestao;
window.adicionarValorMovimento = adicionarValorMovimento;
window.adicionarRegiaoOrigemMovimento = adicionarRegiaoOrigemMovimento;
window.removerRegiaoOrigemMovimento = removerRegiaoOrigemMovimento;
window.editarRegiaoOrigemMovimento = editarRegiaoOrigemMovimento;
window.adicionarRegiaoPeriodoHistorico = adicionarRegiaoPeriodoHistorico;
window.removerRegiaoPeriodoHistorico = removerRegiaoPeriodoHistorico;
window.editarRegiaoPeriodoHistorico = editarRegiaoPeriodoHistorico;
window.removerValorMovimento = removerValorMovimento;
window.editarValorMovimento = editarValorMovimento;
window.adicionarTemaMovimento = adicionarTemaMovimento;
window.adicionarTemaAssunto = adicionarTemaAssunto;
window.removerTemaAssunto = removerTemaAssunto;
window.editarTemaAssunto = editarTemaAssunto;
window.atribuirTemaDoPainel = atribuirTemaDoPainel;
window.renderTemas = renderTemas;
window.renderEtiquetas = renderEtiquetas;
window.novaEtiqueta = novaEtiqueta;
window.baixarEtiquetasMd = baixarEtiquetasMd;
window.moverEtiquetaDoCartao = moverEtiquetaDoCartao;
window.renderTagClusters = renderTagClusters;
window.novoTagCluster = novoTagCluster;
window.colocarEtiquetaNoCluster = colocarEtiquetaNoCluster;
window.adicionarEtiquetaAoClusterDoCartao = adicionarEtiquetaAoClusterDoCartao;
window.definirClusterDaEtiqueta = definirClusterDaEtiqueta;
window.atualizarListaSemAssunto = atualizarListaSemAssunto;
window.renderLocais = renderLocais;
window.renderPersonagens = renderPersonagens;
window.novoPersonagem = novoPersonagem;
window.novoLocal = novoLocal;
window.baixarAssuntosMd = baixarAssuntosMd;
window.baixarTemasMd = baixarTemasMd;
window.excluirTemasSemTexto = excluirTemasSemTextoComConfirmacao;
window.excluirTodosAssuntos = excluirTodosAssuntosComConfirmacao;
window.removerTemaMovimento = removerTemaMovimento;
window.editarTemaMovimento = editarTemaMovimento;
window.adicionarTecnicaMovimento = adicionarTecnicaMovimento;
window.removerTecnicaMovimento = removerTecnicaMovimento;
window.editarTecnicaMovimento = editarTecnicaMovimento;
window.adicionarTipoComposicaoMovimento = adicionarTipoComposicaoMovimento;
window.removerTipoComposicaoMovimento = removerTipoComposicaoMovimento;
window.editarTipoComposicaoMovimento = editarTipoComposicaoMovimento;
window.adicionarLemaMovimento = adicionarLemaMovimento;
window.removerLemaMovimento = removerLemaMovimento;
window.editarLemaMovimento = editarLemaMovimento;
window.adicionarManifestoMovimento = adicionarManifestoMovimento;
window.removerManifestoMovimento = removerManifestoMovimento;
window.editarManifestoMovimento = editarManifestoMovimento;
window.adicionarFonteCorrente = adicionarFonteCorrente;
window.removerFonteCorrente = removerFonteCorrente;
window.adicionarFontePeriodoHistorico = adicionarFontePeriodoHistorico;
window.removerFontePeriodoHistorico = removerFontePeriodoHistorico;
window.adicionarPremioAutor = adicionarPremioAutor;
window.removerPremioAutor = removerPremioAutor;
window.editarPremioAutor = editarPremioAutor;
window.alterarAnoPremioAutor = alterarAnoPremioAutor;
window.adicionarObraAutor = adicionarObraAutor;
window.removerObraAutor = removerObraAutor;
window.editarObraAutor = editarObraAutor;
window.alterarAnoObraAutor = alterarAnoObraAutor;
window.adicionarCirculoLiterarioAutor = adicionarCirculoLiterarioAutor;
window.removerCirculoLiterarioAutor = removerCirculoLiterarioAutor;
window.editarCirculoLiterarioAutor = editarCirculoLiterarioAutor;
window.adicionarLinguaEscritaAutor = adicionarLinguaEscritaAutor;
window.removerLinguaEscritaAutor = removerLinguaEscritaAutor;
window.editarLinguaEscritaAutor = editarLinguaEscritaAutor;
window.adicionarIntertexto = adicionarIntertexto;
window.removerIntertexto = removerIntertexto;
window.editarIntertexto = editarIntertexto;
window.cancelarEdicaoIntertexto = cancelarEdicaoIntertexto;
window.adicionarHipertextualidade = adicionarHipertextualidade;
window.removerHipertextualidade = removerHipertextualidade;
window.editarHipertextualidade = editarHipertextualidade;
window.cancelarEdicaoHipertextualidade = cancelarEdicaoHipertextualidade;
window.adicionarReferenciaExterna = adicionarReferenciaExterna;
window.removerReferenciaExterna = removerReferenciaExterna;
window.editarReferenciaExterna = editarReferenciaExterna;
window.cancelarEdicaoReferenciaExterna = cancelarEdicaoReferenciaExterna;
window.adicionarElo = adicionarElo;
window.removerElo = removerElo;
window.editarElo = editarElo;
window.cancelarEdicaoElo = cancelarEdicaoElo;
window.onRelacaoEloAlterada = onRelacaoEloAlterada;
window.selecionarDirecaoElo = selecionarDirecaoElo;
window.adicionarEco = adicionarEco;
window.removerEco = removerEco;
window.editarEco = editarEco;
window.cancelarEdicaoEco = cancelarEdicaoEco;
window.adicionarAnexo = adicionarAnexo;
window.removerAnexo = removerAnexo;
window.editarAnexo = editarAnexo;
window.cancelarEdicaoAnexo = cancelarEdicaoAnexo;
window.adicionarAnotacao = adicionarAnotacao;
window.removerAnotacao = removerAnotacao;
window.editarAnotacao = editarAnotacao;
window.cancelarEdicaoAnotacao = cancelarEdicaoAnotacao;
window.adicionarLoja = adicionarLoja;
window.removerLoja = removerLoja;
window.editarLoja = editarLoja;
window.cancelarEdicaoLoja = cancelarEdicaoLoja;
window.applyStyle = applyStyle;
window.applyBackground = applyBackground;
window.wrapText = wrapText;
// Debounce de 200ms: cada tecla digitada dispara um renderPoemas()/
// renderProsas() completo (reconstrói a tabela via innerHTML), então
// sem isso a digitação rápida engasga conforme o acervo cresce.
window.setFiltroPoemas = debounce(setFiltroPoemas, 200);
window.setFiltroSonoridade = debounce(setFiltroSonoridade, 200);
window.setFiltroAutores = debounce(setFiltroAutores, 200);
window.setOpcaoBuscaAutores = (chave, chk) => setOpcaoBuscaAutores(chave, chk.checked);
window.limparSelecaoAutores = limparSelecaoAutores;
window.inverterSelecaoAutores = inverterSelecaoAutores;
window.exportarSelecaoAutoresJson = exportarSelecaoAutoresJson;
window.exportarSelecaoAutoresCsv = exportarSelecaoAutoresCsv;
window.exportarSelecaoAutoresMarkdown = exportarSelecaoAutoresMarkdown;
window.setFiltroAutorGrupos = setFiltroAutorGrupos;
window.setFiltroNomeGrupos = setFiltroNomeGrupos;
window.setFiltroNomePessoas = setFiltroNomePessoas;
window.setFiltroAutorPessoas = setFiltroAutorPessoas;
window.setFiltroGrupoPessoas = setFiltroGrupoPessoas;
window.limparSelecaoPessoas = limparSelecaoPessoas;
window.inverterSelecaoPessoas = inverterSelecaoPessoas;
window.aplicarGrupoEmMassaPessoas = aplicarGrupoEmMassaPessoas;
window.aplicarAutorEmMassaPessoas = aplicarAutorEmMassaPessoas;
window.aplicarGeneroEmMassaPessoas = aplicarGeneroEmMassaPessoas;
window.limparGeneroEmMassaPessoas = limparGeneroEmMassaPessoas;
window.aplicarIdentidadeCisTransEmMassaPessoas = aplicarIdentidadeCisTransEmMassaPessoas;
window.aplicarCorRacaEmMassaPessoas = aplicarCorRacaEmMassaPessoas;
window.aplicarOrientacaoEmMassaPessoas = aplicarOrientacaoEmMassaPessoas;
window.limparOrientacaoEmMassaPessoas = limparOrientacaoEmMassaPessoas;
window.setVisibilidadePessoas = setVisibilidadePessoas;
window.ocultarSelecaoPessoas = ocultarSelecaoPessoas;
window.reexibirSelecaoPessoas = reexibirSelecaoPessoas;
window.setVisibilidadeGrupos = setVisibilidadeGrupos;
window.setFiltroMoldes = debounce(setFiltroMoldes, 200);
window.setFiltroEstruturaTextual = debounce(setFiltroEstruturaTextual, 200);
window.prepararNovaEstruturaTextual = prepararNovaEstruturaTextual;
window.aplicarTemplateEstruturaTextual = aplicarTemplateEstruturaTextual;
window.adicionarUnidadeEstruturaTextual = adicionarUnidadeEstruturaTextual;
window.adicionarEventoEstruturaTextual = adicionarEventoEstruturaTextual;
window.salvarComoTemplateEstruturaTextual = salvarComoTemplateEstruturaTextual;
window.editarTemplateEstruturaSelecionado = editarTemplateEstruturaSelecionado;
window.excluirTemplateEstruturaSelecionado = excluirTemplateEstruturaSelecionado;
window.salvarTemplateEstrutura = salvarTemplateEstrutura;
window.adicionarUnidadeTemplateEdicao = adicionarUnidadeTemplateEdicao;
window.adicionarEventoTemplateEdicao = adicionarEventoTemplateEdicao;
window.removerUnidadeTemplateEdicao = removerUnidadeTemplateEdicao;
window.removerEventoTemplateEdicao = removerEventoTemplateEdicao;
// Chamadas diretamente pelo HTML gerado em estrutura-textual.js
// (montarSeletorPosicaoHtml/montarCartaoHtml) — mapeiam 1:1 pras
// funções do módulo, sem wrapper, já que as assinaturas já batem
// com o que o onchange/onclick inline passa.
window.toggleEstrofeEstrutura = toggleEstrofeItem;
window.toggleVersoEstrutura = toggleVersoItem;
window.setVersosTodosEstrutura = setVersosTodosItem;
window.removerUnidadeEstrutura = removerUnidade;
window.removerEventoEstrutura = removerEvento;
window.onToggleDetalhesPosicaoEstrutura = onToggleDetalhesPosicaoEstrutura;
// Botão "✏️ Editar" (nome/unidadeEstrofica/unidadeDiscursiva/
// progressaoDialetica) que faltava nos cartões — só a posição era
// editável antes desta sessão.
window.onToggleEdicaoEstrutura = onToggleEdicaoEstrutura;
window.atualizarCampoEstrutura = atualizarCampoEstrutura;
window.setFiltroProsas = debounce(setFiltroProsas, 200);
window.setFiltroConteudoPoemas = debounce(setFiltroConteudoPoemas, 200);
window.setFiltroConteudoProsas = debounce(setFiltroConteudoProsas, 200);
window.setFiltroNumeroPoemas = debounce(setFiltroNumeroPoemas, 200);
window.setFiltroNumeroProsas = debounce(setFiltroNumeroProsas, 200);

// Alterna o botão E/OU entre os dois campos de busca (metadados +
// conteúdo) e atualiza o próprio rótulo do botão.
window.alternarCombinadorBuscaPoemas = (btn) => {
    const novo = getCombinadorBuscaPoemas() === 'ou' ? 'e' : 'ou';
    setCombinadorBuscaPoemas(novo);
    atualizarBotaoCombinador(btn, novo);
};
window.alternarCombinadorBuscaProsas = (btn) => {
    const novo = getCombinadorBuscaProsas() === 'ou' ? 'e' : 'ou';
    setCombinadorBuscaProsas(novo);
    atualizarBotaoCombinador(btn, novo);
};

// Interruptores de busca (checkbox): "chave" é 'caseSensitive',
// 'matchDiacritics' ou 'palavraInteira' (ver opcoesBuscaPadrao em
// utils.js) — sem debounce, porque checkbox não dispara por tecla.
window.setOpcaoBuscaPoemas = (chave, chk) => _setOpcaoBuscaPoemas(chave, chk.checked);
window.setOpcaoBuscaProsas = (chave, chk) => _setOpcaoBuscaProsas(chave, chk.checked);
function atualizarBotaoCombinador(btn, valor) {
    if (!btn) return;
    btn.textContent = valor === 'ou' ? 'OU' : 'E';
    btn.title =
        valor === 'ou'
            ? 'Basta bater em um dos dois campos (clique pra exigir os dois)'
            : 'Precisa bater nos dois campos (clique pra bastar um)';
}
window.setFiltroLivroProsa = setFiltroLivroProsa;
window.setFiltroLivroPoemas = setFiltroLivroPoemas;
window.setFiltroPessoaPoemas = setFiltroPessoaPoemas;
window.setFiltroPapelPoemas = setFiltroPapelPoemas;
window.setFiltroPessoaProsas = setFiltroPessoaProsas;
window.setFiltroPapelProsas = setFiltroPapelProsas;
window.ordenarPor = ordenarPor;
window.buscarPorPrefixo = buscarPorPrefixo;
window.setStatusPoemas = setStatusPoemas;
window.definirOrdenacaoMovimentosEscolas = definirOrdenacaoMovimentosEscolas;
window.definirOrdenacaoEpocas = definirOrdenacaoEpocas;
window.definirOrdenacaoPeriodosHistoricos = definirOrdenacaoPeriodosHistoricos;
window.setFiltroPeriodo = setFiltroPeriodo;
window.limparFiltrosCorrentes = limparFiltrosCorrentes;
window.limparFiltrosPeriodosHistoricos = limparFiltrosPeriodosHistoricos;
window.limparFiltrosPeriodosBiograficos = limparFiltrosPeriodosBiograficos;
window.alternarExibirOcultasEpocas = alternarExibirOcultasEpocas;
window.abrirOpcoesPeriodoBiografico = abrirOpcoesPeriodoBiografico;
window.abrirOpcoesPeriodoHistorico = abrirOpcoesPeriodoHistorico;
window.setStatusProsas = setStatusProsas;
window.setItensPorPagina = setItensPorPagina;
window.togglePainel = togglePainel;
window.toggleColuna = toggleColuna;
window.moverColuna = moverColuna;
window.selecionarTodasColunas = selecionarTodasColunas;
window.desmarcarTodasColunas = desmarcarTodasColunas;
window.resetarColunas = resetarColunas;
window.aplicarPadraoColunas = aplicarPadraoColunas;
window.salvarPadraoColunasUI = salvarPadraoColunasUI;
window.excluirPadraoColunasUI = excluirPadraoColunasUI;
window.renomearPadraoColunasUI = renomearPadraoColunasUI;
window.atualizarPadraoColunasUI = atualizarPadraoColunasUI;
window.filtrarColunas = filtrarColunas;
window.adicionarColunaContagem = adicionarColunaContagem;
window.removerColunaContagem = removerColunaContagem;
window.definirCampoColunaContagem = definirCampoColunaContagem;
window.definirOperadorColunaContagem = definirOperadorColunaContagem;
window.definirValorColunaContagem = definirValorColunaContagem;
window.toggleAcaoColuna = toggleAcaoColuna;
window.setFormatoBaixarColuna = setFormatoBaixarColuna;
window.resetarAcoesColuna = resetarAcoesColuna;
window.toggleDownloadAbrangente = toggleDownloadAbrangente;
window.toggleIncluirDadosPessoais = toggleIncluirDadosPessoais;
window.toggleIncluirOcultos = toggleIncluirOcultos;
window.toggleLembrarIncluirOcultos = toggleLembrarIncluirOcultos;
window.toggleAgruparComuns = toggleAgruparComuns;
window.baixarDoModalVisualizacao = baixarDoModalVisualizacao;
window.navegarVisualizacao = navegarVisualizacao;
window.irParaPosicaoVisualizacao = irParaPosicaoVisualizacao;
window.editarDoModalVisualizacao = editarDoModalVisualizacao;
window.verDoModalEdicao = verDoModalEdicao;
window.excluirDoModalVisualizacao = excluirDoModalVisualizacao;
window.editarAutorDoVisualizador = editarAutorDoVisualizador;
window.navegarVisualizacaoLivro = navegarVisualizacaoLivro;
window.irParaPosicaoVisualizacaoLivro = irParaPosicaoVisualizacaoLivro;
window.editarLivroDoVisualizador = editarLivroDoVisualizador;
window.verDoModalEdicaoLivro = verDoModalEdicaoLivro;
window.navegarVisualizacaoParteSecao = navegarVisualizacaoParteSecao;
window.irParaPosicaoVisualizacaoParteSecao = irParaPosicaoVisualizacaoParteSecao;
window.editarParteSecaoDoVisualizador = editarParteSecaoDoVisualizador;
window.verDoModalEdicaoParteSecao = verDoModalEdicaoParteSecao;
window.excluirParteSecaoDoVisualizador = excluirParteSecaoDoVisualizador;
window.navegarVisualizacaoElemento = navegarVisualizacaoElemento;
window.irParaPosicaoVisualizacaoElemento = irParaPosicaoVisualizacaoElemento;
window.editarElementoDoVisualizador = editarElementoDoVisualizador;
window.excluirElementoDoVisualizador = excluirElementoDoVisualizador;
window.verDoModalEdicaoElemento = verDoModalEdicaoElemento;
window.excluirLivroDoVisualizador = excluirLivroDoVisualizador;
window.editarMovimentoEscolaDoVisualizador = editarMovimentoEscolaDoVisualizador;
window.editarPeriodoHistoricoDoVisualizador = editarPeriodoHistoricoDoVisualizador;
window.editarPeriodoBiograficoDoVisualizador = editarPeriodoBiograficoDoVisualizador;
window.alternarOcultasPeriodoBiograficoDoVisualizador =
    alternarOcultasPeriodoBiograficoDoVisualizador;
window.abrirTextoDoPeriodoBiograficoVer = abrirTextoDoPeriodoBiograficoVer;
window.verTodosTextosDoPeriodoBiografico = verTodosTextosDoPeriodoBiografico;
window.abrirTextoDoPeriodoHistoricoVer = abrirTextoDoPeriodoHistoricoVer;
window.verTodosTextosDoPeriodoHistorico = verTodosTextosDoPeriodoHistorico;
window.editarGrupoDoVisualizador = editarGrupoDoVisualizador;
window.baixarDoModalVisualizacaoSonoridade = baixarDoModalVisualizacaoSonoridade;
window.baixarDoModalVisualizacaoEstruturaTextual = baixarDoModalVisualizacaoEstruturaTextual;
window.setTema = setTema;
window.setFusoHorario = setFusoHorario;
window.setFiltroDataEscritaPoemas = setFiltroDataEscritaPoemas;
window.setFiltroDataPublicacaoPoemas = setFiltroDataPublicacaoPoemas;
window.setFiltroEpocaRetratadaPoemas = setFiltroEpocaRetratadaPoemas;
window.setFiltroDataEscritaProsas = setFiltroDataEscritaProsas;
window.setFiltroDataPublicacaoProsas = setFiltroDataPublicacaoProsas;
window.setFiltroDataRapidoPoemasEscrita = setFiltroDataRapidoPoemasEscrita;
window.setFiltroDataRapidoPoemasPublicacao = setFiltroDataRapidoPoemasPublicacao;
window.setFiltroDataRapidoPoemasEpoca = setFiltroDataRapidoPoemasEpoca;
window.setFiltroDataRapidoProsasEscrita = setFiltroDataRapidoProsasEscrita;
window.setFiltroDataRapidoProsasPublicacao = setFiltroDataRapidoProsasPublicacao;
window.limparFiltroDataPoemas = limparFiltroDataPoemas;
window.limparFiltroDataProsas = limparFiltroDataProsas;
window.toggleCamposEpocaNa = toggleCamposEpocaNa;
window.aplicarSugestaoEpoca = aplicarSugestaoEpoca;
window.toggleCamposEpocaNaProsa = toggleCamposEpocaNaProsa;
window.aplicarSugestaoEpocaProsa = aplicarSugestaoEpocaProsa;
// toggleSelecaoTodos segue em window: index.html ainda tem um onclick
// estático nesse checkbox, em Poemas e em Prosas (fica pra quando
// migrarmos index.html).
window.toggleSelecaoTodos = toggleSelecaoTodos;
window.limparSelecao = limparSelecao;
window.inverterSelecao = inverterSelecao;
window.excluirSelecao = excluirSelecao;
window.exportarSelecaoAtualJson = exportarSelecaoAtualJson;
window.exportarSelecaoAtualCsv = exportarSelecaoAtualCsv;
window.exportarSelecaoAtualMarkdown = exportarSelecaoAtualMarkdown;
window.exportarSelecaoAtualPdf = exportarSelecaoAtualPdf;
window.exportarSelecaoAtualDocx = exportarSelecaoAtualDocx;
window.baixarSelecaoPorFormato = baixarSelecaoPorFormato;
window.salvarFormatoSelecao = salvarFormatoSelecao;
window.aoEnterAplicar = aoEnterAplicar;
window.aplicarPessoaEmMassa = aplicarPessoaEmMassa;
window.removerPessoaEmMassa = removerPessoaEmMassa;
window.aplicarSinalEmMassa = aplicarSinalEmMassa;
window.removerSinalEmMassa = removerSinalEmMassa;
window.aplicarTemaEmMassa = aplicarTemaEmMassa;
window.removerTemaEmMassa = removerTemaEmMassa;
window.prepararPainelTemasMassa = prepararPainelTemasMassa;
window.atualizarListaSinalBulk = atualizarListaSinalBulk;
window.aplicarDataEmMassa = aplicarDataEmMassa;
window.limparDataEmMassa = limparDataEmMassa;
window.prepararPainelPreencherMassa = prepararPainelPreencherMassa;
window.trocarCampoPreencherMassa = trocarCampoPreencherMassa;
window.aplicarPreenchimentoEmMassa = aplicarPreenchimentoEmMassa;
window.limparCampoEmMassa = limparCampoEmMassa;
window.prepararPainelPeriodosMassa = prepararPainelPeriodosMassa;
window.trocarTipoPeriodoMassa = trocarTipoPeriodoMassa;
window.aplicarPeriodoEmMassa = aplicarPeriodoEmMassa;
window.removerPeriodoEmMassa = removerPeriodoEmMassa;
window.aplicarGeneroEmMassaProsa = aplicarGeneroEmMassaProsa;
window.removerGeneroEmMassaProsa = removerGeneroEmMassaProsa;
window.setLivroEstrutura = setLivroEstrutura;
window.moverItemEstrutura = moverItemEstrutura;
window.abrirModalMoverNivel = abrirModalMoverNivel;
window.setFiltroLivroPartes = setFiltroLivroPartes;
window.setFiltroLivroSecoes = setFiltroLivroSecoes;
window.setFiltroParteSecoes = setFiltroParteSecoes;
window.setFiltroLivroElementos = setFiltroLivroElementos;
window.setFiltroTipoElementos = setFiltroTipoElementos;
window.setBuscaLivros = setBuscaLivros;
window.setFiltroTipoLivros = setFiltroTipoLivros;
window.setFiltroFaseLivros = setFiltroFaseLivros;
window.setFiltroSituacaoLivros = setFiltroSituacaoLivros;
window.setFiltroPublicacaoLivros = setFiltroPublicacaoLivros;
window.setFiltroDataLivros = setFiltroDataLivros;
window.limparFiltrosLivros = limparFiltrosLivros;
window.alternarPreviasImagem = alternarPreviasImagem;
window.definirPreviasImagemTodasAbas = definirPreviasImagemTodasAbas;
window.previsualizarExportacaoSeletiva = previsualizarExportacaoSeletiva;
window.executarExportacaoSeletiva = executarExportacaoSeletiva;
window.executarExportacaoSeletivaMarkdown = executarExportacaoSeletivaMarkdown;
window.executarExportacaoSeletivaPdf = executarExportacaoSeletivaPdf;
window.executarExportacaoSeletivaDocx = executarExportacaoSeletivaDocx;
window.renderEstatisticas = renderEstatisticas;
window.toggleTipoEtiqueta = toggleTipoEtiqueta;
window.definirModoGraficoPessoas = definirModoGraficoPessoas;
window.definirModoGraficoCorrentes = definirModoGraficoCorrentes;
window.definirConsiderarCisTrans = definirConsiderarCisTrans;
window.toggleGeneroFiltroPessoas = toggleGeneroFiltroPessoas;
window.limparGenerosFiltroPessoas = limparGenerosFiltroPessoas;
window.toggleIdentidadeFiltroPessoas = toggleIdentidadeFiltroPessoas;
window.limparIdentidadesFiltroPessoas = limparIdentidadesFiltroPessoas;
window.definirModoTemasAssuntos = definirModoTemasAssuntos;
window.definirOrdemTemasAssuntos = definirOrdemTemasAssuntos;
window.definirModoTerceiros = definirModoTerceiros;
window.toggleGrupoFiltroPessoas = toggleGrupoFiltroPessoas;
window.toggleOcultoItem = toggleOcultoItem;
window.restaurarOcultosGrafico = restaurarOcultosGrafico;
window.definirOrdemOcultos = definirOrdemOcultos;
window.definirMinimoAparicoes = definirMinimoAparicoes;
window.definirMinimoAnos = definirMinimoAnos;
window.filtrarItensOcultos = filtrarItensOcultos;
window.toggleSelecaoTemporal = toggleSelecaoTemporal;
window.definirOrdemTemporal = definirOrdemTemporal;
window.definirPapelTemaEstatisticas = definirPapelTemaEstatisticas;
window.definirPapelAssuntoEstatisticas = definirPapelAssuntoEstatisticas;
window.definirFiltrosCompartilhados = definirFiltrosCompartilhados;
window.limparFiltrosCompartilhados = limparFiltrosCompartilhados;
window.renderConexoes = renderConexoes;
window.exportarTudoAninhado = exportarTudoAninhado;
window.exportarLivroCompleto = exportarLivroCompleto;
window.exportarLivrosCompletos = exportarLivrosCompletos;
window.exportarTudoFlatJson = exportarTudoFlatJson;
window.exportarTudoFlatMarkdown = exportarTudoFlatMarkdown;
window.exportarTudoFlatPdf = exportarTudoFlatPdf;
window.exportarTudoFlatDocx = exportarTudoFlatDocx;
window.baixarFixo = baixarFixo;
window.baixarTodosFixos = baixarTodosFixos;
window.baixarTemplate = baixarTemplate;
window.baixarTodosTemplates = baixarTodosTemplates;
window.excluirTemplate = excluirTemplate;
window.abrirFormularioTemplate = abrirFormularioTemplate;
window.fecharFormularioTemplate = fecharFormularioTemplate;
window.salvarFormularioTemplate = salvarFormularioTemplate;
window.adicionarCriterioFormulario = adicionarCriterioFormulario;

window.toggleSelecaoEstrutura = toggleSelecaoEstrutura;
window.marcarTodosEstrutura = marcarTodosEstrutura;
window.expandirTodosEstrutura = expandirTodosEstrutura;
window.exportarSelecaoEstrutura = exportarSelecaoEstrutura;

window.toggleCamposIntroducao = toggleCamposIntroducao;
window.toggleCamposFicha = toggleCamposFicha;

window.selecionarColetanea = selecionarColetanea;
window.prepararNovaParte = prepararNovaParte;
window.editarParteColetanea = editarParteColetanea;
window.deletarParteColetanea = deletarParteColetanea;
window.prepararNovoItem = prepararNovoItem;
window.editarItem = editarItem;
window.deletarItemColetanea = deletarItemColetanea;
window.moverItem = moverItem;
window.onChangeTipoItem = onChangeTipoItem;
window.toggleOverride = toggleOverride;
window.setAlign = setAlign;
