// ============================================================
// main.js — Ponto de entrada. Inicializa módulos e expõe
//           funções globais que o HTML chama via onclick="..."
// ============================================================

import {
    exportarJSON,
    importarDB,
    deleteItem,
    getUltimoBackup,
    getUsoStorage,
    migrarImagensLegadasParaIndexedDB,
} from './db.js';
import { mostrarAviso, avisarSalvo, debounce } from './utils.js';
import { listarSnapshots, baixarSnapshot } from './autobackup.js';
import {
    openTab,
    abrirAba,
    toggleModal,
    prepararNovo,
    toggleCamposIntroducao,
    sugerirSequencia,
    filtrarDestinoPoema,
    filtrarDestinoProsa,
    autoPreencherDataPublicacao,
    togglePainel,
    toggleMenuMobile,
    initNav,
} from './ui.js';
import { registrarModal } from './modais.js';
import {
    toggleColuna,
    moverColuna,
    selecionarTodasColunas,
    desmarcarTodasColunas,
    resetarColunas,
} from './colunas.js';
import {
    toggleAcaoColuna,
    setFormatoBaixarColuna,
    resetarAcoesColuna,
    getFormatoBaixar,
} from './acoes-coluna.js';
import { exportarItem } from './exportar.js';
import { abrirVisualizacao, baixarDoModalVisualizacao } from './visualizar.js';
import { initTema, setTema } from './theme.js';
import { renderLists } from './render.js';
import {
    setFiltroPoemas,
    setFiltroProsas,
    setFiltroConteudoPoemas,
    setFiltroConteudoProsas,
    setCombinadorBuscaPoemas,
    setCombinadorBuscaProsas,
    getCombinadorBuscaPoemas,
    getCombinadorBuscaProsas,
    setFiltroLivroPoemas,
    ordenarPoemasPor,
    buscarPorPrefixo,
    setStatusPoemas,
    setItensPorPagina,
    setPaginaPoemas,
    setPaginaProsas,
    toggleSelecaoPoema,
    toggleSelecaoTodosPoemas,
    limparSelecaoPoemas,
    excluirSelecaoPoemas,
    exportarSelecaoPoemasJson,
    exportarSelecaoPoemasMarkdown,
    exportarSelecaoPoemasPdf,
    aplicarPessoaEmMassa,
    removerPessoaEmMassa,
    aplicarSinalEmMassa,
    removerSinalEmMassa,
    atualizarListaSinalBulk,
    aplicarDataEmMassa,
    limparDataEmMassa,
    toggleSelecaoProsa,
    toggleSelecaoTodosProsas,
    limparSelecaoProsas,
    excluirSelecaoProsas,
    exportarSelecaoProsasJson,
    exportarSelecaoProsasMarkdown,
    exportarSelecaoProsasPdf,
    aplicarPessoaEmMassaProsa,
    removerPessoaEmMassaProsa,
    aplicarSinalEmMassaProsa,
    removerSinalEmMassaProsa,
    aplicarGeneroEmMassaProsa,
    removerGeneroEmMassaProsa,
    aplicarDataEmMassaProsa,
    limparDataEmMassaProsa,
    setFiltroLivroPartes,
    setFiltroLivroSecoes,
    setFiltroParteSecoes,
    setFiltroLivroElementos,
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
} from './render-listas.js';
import {
    setLivroEstrutura,
    moverItemEstrutura,
    abrirModalMoverNivel,
    toggleSelecaoEstrutura,
    marcarTodosEstrutura,
    exportarSelecaoEstrutura,
} from './render-estrutura.js';
import {
    previsualizarExportacaoSeletiva,
    executarExportacaoSeletiva,
    executarExportacaoSeletivaMarkdown,
    executarExportacaoSeletivaPdf,
    popularSelecaoExportacao,
    exportarTudoAninhado,
    exportarLivroCompleto,
    exportarLivrosCompletos,
    exportarTudoFlatJson,
    exportarTudoFlatMarkdown,
    exportarTudoFlatPdf,
} from './exportar.js';
import { renderEstatisticas } from './estatisticas.js';
import { renderConexoes, baixarDiagramaReferencias } from './render-conexoes.js';
import {
    initEditor,
    adicionarSinalEstilo,
    removerSinalEstilo,
    adicionarSinalTema,
    removerSinalTema,
    adicionarSinalRelacao,
    removerSinalRelacao,
    adicionarSinalSensibilidade,
    removerSinalSensibilidade,
    adicionarSinalTom,
    removerSinalTom,
    adicionarSinalOutros,
    removerSinalOutros,
    applyStyle,
    wrapText,
    setAlign,
    adicionarPessoa,
    removerPessoa,
    alternarPapelPessoa,
    alternarDropdownPapelPessoa,
    adicionarAutoria,
    removerAutoria,
    alterarPapelAutoria,
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
    adicionarSinalEstiloProsa,
    removerSinalEstiloProsa,
    adicionarSinalTemaProsa,
    removerSinalTemaProsa,
    adicionarSinalRelacaoProsa,
    removerSinalRelacaoProsa,
    adicionarSinalSensibilidadeProsa,
    removerSinalSensibilidadeProsa,
    adicionarSinalTomProsa,
    removerSinalTomProsa,
    adicionarSinalOutrosProsa,
    removerSinalOutrosProsa,
    adicionarPessoaProsa,
    removerPessoaProsa,
    alternarPapelPessoaProsa,
    alternarDropdownPapelPessoaProsa,
    adicionarAutoriaProsa,
    removerAutoriaProsa,
    alterarPapelAutoriaProsa,
    adicionarEnvioProsa,
    editarEnvioProsa,
    cancelarEdicaoEnvioProsa,
    removerEnvioProsa,
    adicionarReconhecimentoProsa,
    editarReconhecimentoProsa,
    cancelarEdicaoReconhecimentoProsa,
    removerReconhecimentoProsa,
    adicionarGeneroProsa,
    removerGeneroProsa,
    adicionarIntertexto,
    removerIntertexto,
    editarIntertexto,
    cancelarEdicaoIntertexto,
    adicionarElo,
    removerElo,
    editarElo,
    cancelarEdicaoElo,
    onRelacaoEloAlterada,
    selecionarDirecaoElo,
    adicionarReferencia,
    removerReferencia,
    editarReferencia,
    cancelarEdicaoReferencia,
    adicionarAnexo,
    removerAnexo,
    editarAnexo,
    cancelarEdicaoAnexo,
    adicionarAnotacao,
    removerAnotacao,
    editarAnotacao,
    cancelarEdicaoAnotacao,
    adicionarEloProsa,
    removerEloProsa,
    editarEloProsa,
    cancelarEdicaoEloProsa,
    onRelacaoEloAlteradaProsa,
    selecionarDirecaoEloProsa,
    adicionarReferenciaProsa,
    removerReferenciaProsa,
    editarReferenciaProsa,
    cancelarEdicaoReferenciaProsa,
    adicionarIntertextoProsa,
    removerIntertextoProsa,
    editarIntertextoProsa,
    cancelarEdicaoIntertextoProsa,
    adicionarAnexoProsa,
    removerAnexoProsa,
    editarAnexoProsa,
    cancelarEdicaoAnexoProsa,
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
    initFormProsa,
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
    initFormMesclar,
    abrirModalMesclar,
    rastreadorPoema,
    rastreadorProsa,
} from './forms.js';
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

// ─── Registro dos modais (carregamento lazy via fetch) ───────
// Cada modal só é buscado em modais/<arquivo> e inicializado
// (onsubmit ligado etc.) na primeira vez que for aberto, seja
// por prepararNovo(tipo) ou por uma das funções editarX().
// modal-poema também carrega o editor de formatação (toolbar,
// tags, pessoas), que só existe dentro desse modal.

registrarModal('modal-livro', 'modal-livro.html', initFormLivro);
registrarModal('modal-parte', 'modal-parte.html', initFormParte);
registrarModal('modal-secao', 'modal-secao.html', initFormSecao);
registrarModal(
    'modal-poema',
    'modal-poema.html',
    () => {
        initFormPoema();
        initEditor();
    },
    rastreadorPoema,
);
registrarModal('modal-prosa', 'modal-prosa.html', initFormProsa, rastreadorProsa);
registrarModal('modal-elemento', 'modal-elemento.html', initFormElemento);
registrarModal('modal-pessoa', 'modal-pessoa.html', initFormPessoa);
registrarModal('modal-grupo', 'modal-grupo.html', initFormGrupo);
registrarModal('modal-autor', 'modal-autor.html', initFormAutor);
registrarModal('modal-epoca', 'modal-epoca.html', initFormEpoca);
registrarModal('modal-mesclar', 'modal-mesclar.html', initFormMesclar);
registrarModal('modal-col-parte', 'modal-col-parte.html', initFormColParte);
registrarModal('modal-col-item', 'modal-col-item.html', initFormColItem);
// Sem form/init próprio — o conteúdo é preenchido a cada abertura por
// abrirVisualizacao() (visualizar.js), não há nada pra inicializar uma
// vez só (ver comentário em registrarModal, acima).
registrarModal('modal-visualizar', 'modal-visualizar.html', () => {});

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
    'editar-pessoa': (el) => editarPessoa(Number(el.dataset.id)),
    'editar-grupo': (el) => editarGrupo(Number(el.dataset.id)),
    'editar-autor': (el) => editarAutor(Number(el.dataset.id)),
    'editar-epoca': (el) => editarEpoca(Number(el.dataset.id)),
    'mesclar-item': (el) => abrirModalMesclar(el.dataset.tipo, Number(el.dataset.id)),
    'excluir-item': (el) => deleteItem(el.dataset.tipo, Number(el.dataset.id)),
    'ver-item': (el) => abrirVisualizacao(el.dataset.tipo, Number(el.dataset.id)),
    'baixar-item': (el) =>
        exportarItem(el.dataset.tipo, Number(el.dataset.id), getFormatoBaixar(el.dataset.tabela)),
    'mover-livro': (el) => moverLivro(Number(el.dataset.id), el.dataset.dir),
    'pagina-poemas': (el) => setPaginaPoemas(Number(el.dataset.pagina)),
    'pagina-prosas': (el) => setPaginaProsas(Number(el.dataset.pagina)),
    'toggle-poema': (el, e) => toggleSelecaoPoema(el.checked, Number(el.dataset.id), e?.shiftKey),
    'toggle-prosa': (el, e) => toggleSelecaoProsa(el.checked, Number(el.dataset.id), e?.shiftKey),
    'toggle-todos-poemas': (el) => toggleSelecaoTodosPoemas(el.checked),
    'toggle-todos-prosas': (el) => toggleSelecaoTodosProsas(el.checked),
    'baixar-diagrama-referencias': (el) => baixarDiagramaReferencias(el),
};

document.querySelector('main')?.addEventListener('click', (e) => {
    const alvo = e.target.closest('[data-action]');
    if (!alvo) return;
    const acao = ACOES_LISTA[alvo.dataset.action];
    if (acao) acao(alvo, e);
});

// ─── Inicialização ───────────────────────────────────────────
// Note que initEditor/initFormX não são mais chamados aqui — eles
// rodam sob demanda, depois que o fetch do modal correspondente
// resolve (ver registrarModal acima e modais.js).

document.addEventListener('DOMContentLoaded', async () => {
    // Migra imagens/capas salvas no formato antigo (base64 dentro do db)
    // antes do primeiro render — ver comentário em db.js. Roda uma vez;
    // depois disso não há mais pendentes e a função retorna na hora.
    await migrarImagensLegadasParaIndexedDB();

    initTema();
    initNav();
    renderColetaneas();
    renderLists();
    atualizarDatalist();
    atualizarDatalistProsa();
    popularSelecaoExportacao();
    atualizarIndicadorBackup();
    atualizarIndicadorStorage();
    renderListaSnapshots();

    // Lembra a última escolha de "incluir capas" no backup (padrão: marcado,
    // já que o botão "Baixar JSON" é o backup "de verdade" — melhor pecar
    // por incluir demais do que a pessoa esquecer de marcar e perder capas).
    const chkCapas = document.getElementById('chk-incluir-capas');
    const prefCapas = localStorage.getItem('arquivoPoetico_incluirCapasBackup');
    if (chkCapas && prefCapas !== null) chkCapas.checked = prefCapas === 'true';
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
window.sugerirSequencia = sugerirSequencia;
window.filtrarDestinoPoema = filtrarDestinoPoema;
window.filtrarDestinoProsa = filtrarDestinoProsa;
window.autoPreencherDataPublicacao = autoPreencherDataPublicacao;

// editarLivro/Parte/Secao/Poema/Prosa/Elemento e deleteItem não
// precisam mais de window.X — só eram chamados via onclick gerado em
// render-listas.js, que agora usa data-action + o listener delegado
// acima. Continuam importados normalmente (uso local no ACOES_LISTA).

window.adicionarSinalEstilo = adicionarSinalEstilo;
window.removerSinalEstilo = removerSinalEstilo;
window.adicionarSinalTema = adicionarSinalTema;
window.removerSinalTema = removerSinalTema;
window.adicionarSinalRelacao = adicionarSinalRelacao;
window.removerSinalRelacao = removerSinalRelacao;
window.adicionarSinalSensibilidade = adicionarSinalSensibilidade;
window.removerSinalSensibilidade = removerSinalSensibilidade;
window.adicionarSinalTom = adicionarSinalTom;
window.removerSinalTom = removerSinalTom;
window.adicionarSinalOutros = adicionarSinalOutros;
window.removerSinalOutros = removerSinalOutros;
window.adicionarPessoa = adicionarPessoa;
window.removerPessoa = removerPessoa;
window.alternarPapelPessoa = alternarPapelPessoa;
window.alternarDropdownPapelPessoa = alternarDropdownPapelPessoa;
window.adicionarAutoria = adicionarAutoria;
window.removerAutoria = removerAutoria;
window.alterarPapelAutoria = alterarPapelAutoria;
window.adicionarEnvio = adicionarEnvio;
window.editarEnvio = editarEnvio;
window.cancelarEdicaoEnvio = cancelarEdicaoEnvio;
window.removerEnvio = removerEnvio;
window.adicionarReconhecimento = adicionarReconhecimento;
window.editarReconhecimento = editarReconhecimento;
window.cancelarEdicaoReconhecimento = cancelarEdicaoReconhecimento;
window.removerReconhecimento = removerReconhecimento;
window.adicionarSinalEstiloProsa = adicionarSinalEstiloProsa;
window.removerSinalEstiloProsa = removerSinalEstiloProsa;
window.adicionarSinalTemaProsa = adicionarSinalTemaProsa;
window.removerSinalTemaProsa = removerSinalTemaProsa;
window.adicionarSinalRelacaoProsa = adicionarSinalRelacaoProsa;
window.removerSinalRelacaoProsa = removerSinalRelacaoProsa;
window.adicionarSinalSensibilidadeProsa = adicionarSinalSensibilidadeProsa;
window.removerSinalSensibilidadeProsa = removerSinalSensibilidadeProsa;
window.adicionarSinalTomProsa = adicionarSinalTomProsa;
window.removerSinalTomProsa = removerSinalTomProsa;
window.adicionarSinalOutrosProsa = adicionarSinalOutrosProsa;
window.removerSinalOutrosProsa = removerSinalOutrosProsa;
window.adicionarPessoaProsa = adicionarPessoaProsa;
window.removerPessoaProsa = removerPessoaProsa;
window.alternarPapelPessoaProsa = alternarPapelPessoaProsa;
window.alternarDropdownPapelPessoaProsa = alternarDropdownPapelPessoaProsa;
window.adicionarAutoriaProsa = adicionarAutoriaProsa;
window.removerAutoriaProsa = removerAutoriaProsa;
window.alterarPapelAutoriaProsa = alterarPapelAutoriaProsa;
window.adicionarEnvioProsa = adicionarEnvioProsa;
window.editarEnvioProsa = editarEnvioProsa;
window.cancelarEdicaoEnvioProsa = cancelarEdicaoEnvioProsa;
window.removerEnvioProsa = removerEnvioProsa;
window.adicionarReconhecimentoProsa = adicionarReconhecimentoProsa;
window.editarReconhecimentoProsa = editarReconhecimentoProsa;
window.cancelarEdicaoReconhecimentoProsa = cancelarEdicaoReconhecimentoProsa;
window.removerReconhecimentoProsa = removerReconhecimentoProsa;
window.adicionarGeneroProsa = adicionarGeneroProsa;
window.removerGeneroProsa = removerGeneroProsa;
window.adicionarIntertexto = adicionarIntertexto;
window.removerIntertexto = removerIntertexto;
window.editarIntertexto = editarIntertexto;
window.cancelarEdicaoIntertexto = cancelarEdicaoIntertexto;
window.adicionarElo = adicionarElo;
window.removerElo = removerElo;
window.editarElo = editarElo;
window.cancelarEdicaoElo = cancelarEdicaoElo;
window.onRelacaoEloAlterada = onRelacaoEloAlterada;
window.selecionarDirecaoElo = selecionarDirecaoElo;
window.adicionarReferencia = adicionarReferencia;
window.removerReferencia = removerReferencia;
window.editarReferencia = editarReferencia;
window.cancelarEdicaoReferencia = cancelarEdicaoReferencia;
window.adicionarAnexo = adicionarAnexo;
window.removerAnexo = removerAnexo;
window.editarAnexo = editarAnexo;
window.cancelarEdicaoAnexo = cancelarEdicaoAnexo;
window.adicionarAnotacao = adicionarAnotacao;
window.removerAnotacao = removerAnotacao;
window.editarAnotacao = editarAnotacao;
window.cancelarEdicaoAnotacao = cancelarEdicaoAnotacao;
window.adicionarEloProsa = adicionarEloProsa;
window.removerEloProsa = removerEloProsa;
window.editarEloProsa = editarEloProsa;
window.cancelarEdicaoEloProsa = cancelarEdicaoEloProsa;
window.onRelacaoEloAlteradaProsa = onRelacaoEloAlteradaProsa;
window.selecionarDirecaoEloProsa = selecionarDirecaoEloProsa;
window.adicionarReferenciaProsa = adicionarReferenciaProsa;
window.removerReferenciaProsa = removerReferenciaProsa;
window.editarReferenciaProsa = editarReferenciaProsa;
window.cancelarEdicaoReferenciaProsa = cancelarEdicaoReferenciaProsa;
window.adicionarIntertextoProsa = adicionarIntertextoProsa;
window.removerIntertextoProsa = removerIntertextoProsa;
window.editarIntertextoProsa = editarIntertextoProsa;
window.cancelarEdicaoIntertextoProsa = cancelarEdicaoIntertextoProsa;
window.adicionarAnexoProsa = adicionarAnexoProsa;
window.removerAnexoProsa = removerAnexoProsa;
window.editarAnexoProsa = editarAnexoProsa;
window.cancelarEdicaoAnexoProsa = cancelarEdicaoAnexoProsa;
window.applyStyle = applyStyle;
window.wrapText = wrapText;
// Debounce de 200ms: cada tecla digitada dispara um renderPoemas()/
// renderProsas() completo (reconstrói a tabela via innerHTML), então
// sem isso a digitação rápida engasga conforme o acervo cresce.
window.setFiltroPoemas = debounce(setFiltroPoemas, 200);
window.setFiltroProsas = debounce(setFiltroProsas, 200);
window.setFiltroConteudoPoemas = debounce(setFiltroConteudoPoemas, 200);
window.setFiltroConteudoProsas = debounce(setFiltroConteudoProsas, 200);

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
window.ordenarPoemasPor = ordenarPoemasPor;
window.buscarPorPrefixo = buscarPorPrefixo;
window.setStatusPoemas = setStatusPoemas;
window.setItensPorPagina = setItensPorPagina;
window.togglePainel = togglePainel;
window.toggleColuna = toggleColuna;
window.moverColuna = moverColuna;
window.selecionarTodasColunas = selecionarTodasColunas;
window.desmarcarTodasColunas = desmarcarTodasColunas;
window.resetarColunas = resetarColunas;
window.toggleAcaoColuna = toggleAcaoColuna;
window.setFormatoBaixarColuna = setFormatoBaixarColuna;
window.resetarAcoesColuna = resetarAcoesColuna;
window.baixarDoModalVisualizacao = baixarDoModalVisualizacao;
window.setTema = setTema;
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
// toggleSelecaoTodosPoemas segue em window: index.html ainda tem um
// onclick estático nesse checkbox (fica pra quando migrarmos index.html).
window.toggleSelecaoTodosPoemas = toggleSelecaoTodosPoemas;
window.limparSelecaoPoemas = limparSelecaoPoemas;
window.excluirSelecaoPoemas = excluirSelecaoPoemas;
window.exportarSelecaoPoemasJson = exportarSelecaoPoemasJson;
window.exportarSelecaoPoemasMarkdown = exportarSelecaoPoemasMarkdown;
window.exportarSelecaoPoemasPdf = exportarSelecaoPoemasPdf;
window.aplicarPessoaEmMassa = aplicarPessoaEmMassa;
window.removerPessoaEmMassa = removerPessoaEmMassa;
window.aplicarSinalEmMassa = aplicarSinalEmMassa;
window.removerSinalEmMassa = removerSinalEmMassa;
window.atualizarListaSinalBulk = atualizarListaSinalBulk;
window.aplicarDataEmMassa = aplicarDataEmMassa;
window.limparDataEmMassa = limparDataEmMassa;
// idem: toggleSelecaoTodosProsas segue em window pelo mesmo motivo.
window.toggleSelecaoTodosProsas = toggleSelecaoTodosProsas;
window.limparSelecaoProsas = limparSelecaoProsas;
window.excluirSelecaoProsas = excluirSelecaoProsas;
window.exportarSelecaoProsasJson = exportarSelecaoProsasJson;
window.exportarSelecaoProsasMarkdown = exportarSelecaoProsasMarkdown;
window.exportarSelecaoProsasPdf = exportarSelecaoProsasPdf;
window.aplicarPessoaEmMassaProsa = aplicarPessoaEmMassaProsa;
window.removerPessoaEmMassaProsa = removerPessoaEmMassaProsa;
window.aplicarSinalEmMassaProsa = aplicarSinalEmMassaProsa;
window.removerSinalEmMassaProsa = removerSinalEmMassaProsa;
window.aplicarGeneroEmMassaProsa = aplicarGeneroEmMassaProsa;
window.removerGeneroEmMassaProsa = removerGeneroEmMassaProsa;
window.aplicarDataEmMassaProsa = aplicarDataEmMassaProsa;
window.limparDataEmMassaProsa = limparDataEmMassaProsa;
window.setLivroEstrutura = setLivroEstrutura;
window.moverItemEstrutura = moverItemEstrutura;
window.abrirModalMoverNivel = abrirModalMoverNivel;
window.setFiltroLivroPartes = setFiltroLivroPartes;
window.setFiltroLivroSecoes = setFiltroLivroSecoes;
window.setFiltroParteSecoes = setFiltroParteSecoes;
window.setFiltroLivroElementos = setFiltroLivroElementos;
window.previsualizarExportacaoSeletiva = previsualizarExportacaoSeletiva;
window.executarExportacaoSeletiva = executarExportacaoSeletiva;
window.executarExportacaoSeletivaMarkdown = executarExportacaoSeletivaMarkdown;
window.executarExportacaoSeletivaPdf = executarExportacaoSeletivaPdf;
window.renderEstatisticas = renderEstatisticas;
window.renderConexoes = renderConexoes;
window.exportarTudoAninhado = exportarTudoAninhado;
window.exportarLivroCompleto = exportarLivroCompleto;
window.exportarLivrosCompletos = exportarLivrosCompletos;
window.exportarTudoFlatJson = exportarTudoFlatJson;
window.exportarTudoFlatMarkdown = exportarTudoFlatMarkdown;
window.exportarTudoFlatPdf = exportarTudoFlatPdf;

window.toggleSelecaoEstrutura = toggleSelecaoEstrutura;
window.marcarTodosEstrutura = marcarTodosEstrutura;
window.exportarSelecaoEstrutura = exportarSelecaoEstrutura;

window.toggleCamposIntroducao = toggleCamposIntroducao;

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
