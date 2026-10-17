// ============================================================
// ui-relatorio-periodos.js: janela "Baixar relatório" das abas Período
// Biográfico, Período Histórico e Correntes literárias (Fase 14, etapa 4).
//
// A pessoa escolhe a linha do tempo (por data, em árvore ou as duas), os
// textos ligados (nenhum, contagem ou títulos) e, no Período Biográfico, se
// entram os dados ocultados. Cada combinação de organização e formato é um
// arquivo. Todos são gerados ANTES do primeiro download, para nada sair pela
// metade se um deles falhar.
//
// A lógica do relatório é de relatorio-periodos.js. Aqui ficam as funções
// puras que montam a lista de arquivos (testadas sem DOM) e a tela.
// ============================================================

import { db } from './db.js';
import { hojeDoUsuario } from './fuso-horario.js';
import { mostrarAviso } from './utils.js';
import { garantirModal, toggleModal } from './modais.js';
import {
    gerarMarkdownRelatorio,
    montarRelatorio,
    nomeDoArquivoDoRelatorio,
    ORGANIZACOES_RELATORIO,
    rotulosDoRelatorio,
    TIPOS_RELATORIO,
} from './relatorio-periodos.js';

const ID_MODAL = 'modal-relatorio-periodos';
const INTERVALO_ENTRE_DOWNLOADS_MS = 400;

// Formatos que a janela oferece, na ordem em que os arquivos são gerados.
export const FORMATOS_RELATORIO = ['md', 'pdf'];

const MIME = { md: 'text/markdown', pdf: 'application/pdf' };
const ROTULO_ORGANIZACAO = { data: 'por data', arvore: 'em árvore' };

const $ = (id) => document.getElementById(id);

let _tipo = 'periodosHistoricos';
let _ocupado = false;

// ─── Funções puras (testadas sem DOM) ────────────────────────

// Os arquivos que saem para uma escolha: um por organização marcada e formato
// marcado, sempre na ordem fixa (por data antes de árvore; .md antes de .pdf).
export function arquivosDoRelatorio(tipo, { organizacoes = [], formatos = [] } = {}) {
    const orgs = ORGANIZACOES_RELATORIO.filter((o) => organizacoes.includes(o));
    const forms = FORMATOS_RELATORIO.filter((f) => formatos.includes(f));
    const arquivos = [];
    orgs.forEach((organizacao) => {
        forms.forEach((formato) => {
            arquivos.push({
                organizacao,
                formato,
                nome: nomeDoArquivoDoRelatorio(tipo, organizacao, formato),
            });
        });
    });
    return arquivos;
}

export function podeBaixar(arquivos, ocupado = false) {
    return !ocupado && arquivos.length > 0;
}

export function descreverArquivo(arquivo) {
    return `${arquivo.nome} (${ROTULO_ORGANIZACAO[arquivo.organizacao]})`;
}

// Gera o conteúdo de todos os arquivos. `geradores` troca a geração por
// formato (o PDF é assíncrono e vem de relatorio-pdf.js).
export async function gerarArquivosDoRelatorio(
    tipo,
    selecao,
    dbRef,
    hoje,
    geradores = GERADORES_PADRAO,
) {
    const arquivos = arquivosDoRelatorio(tipo, selecao);
    const saida = [];
    for (const arquivo of arquivos) {
        const opcoes = {
            organizacao: arquivo.organizacao,
            textos: selecao.textos,
            incluirOcultos: !!selecao.incluirOcultos,
        };
        const conteudo = await geradores[arquivo.formato](tipo, dbRef, opcoes, hoje);
        saida.push({ ...arquivo, conteudo, mime: MIME[arquivo.formato] });
    }
    return saida;
}

// O PDF carrega relatorio-pdf.js só quando alguém pede, e devolve os bytes.
const GERADORES_PADRAO = {
    md: (tipo, dbRef, opcoes, hoje) => gerarMarkdownRelatorio(tipo, dbRef, opcoes, hoje),
    pdf: async (tipo, dbRef, opcoes, hoje) => {
        const { gerarPdfRelatorio } = await import('./relatorio-pdf.js');
        return gerarPdfRelatorio(montarRelatorio(tipo, dbRef, opcoes, hoje)).output('arraybuffer');
    },
};

// Só o Período Biográfico tem itens ocultos.
export function tipoTemOcultos(tipo) {
    return tipo === 'epocas';
}

// ─── Tela ────────────────────────────────────────────────────

function selecaoDaTela() {
    const organizacoes = [];
    if ($('rel-per-org-data')?.checked) organizacoes.push('data');
    if ($('rel-per-org-arvore')?.checked) organizacoes.push('arvore');
    const textos =
        document.querySelector('input[name="rel-per-textos"]:checked')?.value || 'contagem';
    const formatos = [];
    if ($('rel-per-fmt-md')?.checked) formatos.push('md');
    if ($('rel-per-fmt-pdf')?.checked) formatos.push('pdf');
    return {
        organizacoes,
        formatos,
        textos,
        incluirOcultos: tipoTemOcultos(_tipo) && !!$('rel-per-ocultos')?.checked,
    };
}

function valoresPadrao() {
    $('rel-per-org-data').checked = true;
    $('rel-per-org-arvore').checked = false;
    $('rel-per-fmt-md').checked = true;
    $('rel-per-fmt-pdf').checked = false;
    $('rel-per-textos-contagem').checked = true;
    $('rel-per-ocultos').checked = false;
}

export function atualizarModalRelatorioPeriodos() {
    const arquivos = arquivosDoRelatorio(_tipo, selecaoDaTela());
    const lista = $('rel-per-arquivos');
    if (!lista) return;
    lista.innerHTML = '';
    if (!arquivos.length) {
        const li = document.createElement('li');
        li.textContent = 'Marque pelo menos uma linha do tempo e um formato.';
        lista.appendChild(li);
    }
    arquivos.forEach((arquivo) => {
        const li = document.createElement('li');
        li.textContent = descreverArquivo(arquivo);
        lista.appendChild(li);
    });
    $('rel-per-aviso-varios').classList.toggle('hidden', arquivos.length < 2);
    $('rel-per-baixar').disabled = !podeBaixar(arquivos, _ocupado);
}

export async function abrirModalRelatorioPeriodos(tipo) {
    _tipo = TIPOS_RELATORIO.includes(tipo) ? tipo : 'periodosHistoricos';
    await garantirModal(ID_MODAL);
    const rotulos = rotulosDoRelatorio(_tipo);
    valoresPadrao();
    $('modal-relatorio-periodos-titulo').textContent = `Baixar relatório: ${rotulos.titulo}`;
    $('rel-per-intro').textContent =
        'O relatório leva o cadastro inteiro desta aba e ignora os filtros da tela. ' +
        'Escolha como quer a linha do tempo e o que mostrar dos textos.';
    $('rel-per-bloco-ocultos').classList.toggle('hidden', !tipoTemOcultos(_tipo));
    atualizarModalRelatorioPeriodos();
    const el = $(ID_MODAL);
    if (el && el.classList.contains('hidden')) await toggleModal(ID_MODAL);
}

function baixarConteudo(conteudo, tipoMime, nomeArquivo) {
    const tipo = tipoMime.startsWith('text/') ? `${tipoMime};charset=utf-8` : tipoMime;
    const blob = new Blob([conteudo], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function baixarRelatorioPeriodos() {
    if (_ocupado) return;
    const selecao = selecaoDaTela();
    if (!podeBaixar(arquivosDoRelatorio(_tipo, selecao))) return;
    _ocupado = true;
    atualizarModalRelatorioPeriodos();
    try {
        const arquivos = await gerarArquivosDoRelatorio(_tipo, selecao, db, hojeDoUsuario());
        for (let i = 0; i < arquivos.length; i++) {
            if (i > 0) await esperar(INTERVALO_ENTRE_DOWNLOADS_MS);
            baixarConteudo(arquivos[i].conteudo, arquivos[i].mime, arquivos[i].nome);
        }
        mostrarAviso(
            arquivos.length === 1
                ? 'Relatório baixado.'
                : `${arquivos.length} relatórios baixados.`,
            'sucesso',
        );
        await toggleModal(ID_MODAL);
    } catch (erro) {
        console.error('Falha ao gerar o relatório:', erro);
        mostrarAviso('Não foi possível gerar o relatório. Nada foi baixado.');
    } finally {
        _ocupado = false;
        atualizarModalRelatorioPeriodos();
    }
}
