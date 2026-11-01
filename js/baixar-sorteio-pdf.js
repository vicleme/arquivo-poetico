// baixar-sorteio-pdf.js: o texto sorteado em PDF para quem lê (01/11/2026).
//
// Mesmo conteúdo do `.md` (baixar-sorteio.js, `blocosDoSorteio`): título, tipo e
// extensão, texto, o que o autor deixou para quem lê, paratexto e ficha, sem
// campo privado. O corpo do texto é desenhado pelo mesmo desenhista do PDF do
// Arquivo (pdf-corpo-rico.js): cor, fundo, negrito, itálico, sublinhado, tamanho
// e alinhamento aparecem como no editor. Não importa exportar-pdf.js, que puxa o
// `db` global; a página do sorteio recebe o acervo pronto.
//
// O jsPDF não está na página `sortear.html`: `carregarJsPdf` busca o mesmo
// arquivo do CDN que o `index.html` usa, só no primeiro clique em "Baixar .pdf".

import { blocosDoSorteio, nomeArquivoSorteio, tirarComentariosDoEditor } from './baixar-sorteio.js';
import { saneParaPdf, renderizarCorpoRico } from './pdf-corpo-rico.js';

const URL_JSPDF = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
export const MENSAGEM_SEM_JSPDF =
    'A biblioteca de PDF não carregou (verifique a conexão com a internet). Tente de novo em alguns segundos.';

let carregando = null;

// Resolve quando `window.jspdf.jsPDF` existe. Falha de rede recusa a Promise com
// a mensagem acima e deixa tentar de novo no próximo clique.
export function carregarJsPdf() {
    if (globalThis.window?.jspdf?.jsPDF) return Promise.resolve();
    if (carregando) return carregando;
    carregando = new Promise((resolve, reject) => {
        const tag = document.createElement('script');
        tag.src = URL_JSPDF;
        tag.onload = () => resolve();
        tag.onerror = () => {
            carregando = null;
            tag.remove();
            reject(new Error(MENSAGEM_SEM_JSPDF));
        };
        document.head.appendChild(tag);
    });
    return carregando;
}

function segmentosParaTexto(segmentos) {
    return segmentos.map((s) => (s.href ? `${s.texto} (${s.href})` : s.texto)).join('');
}

// O documento jsPDF (ainda não salvo). Lança se a biblioteca não carregou.
export function gerarPdfSorteio(dbRef, tipo, item, opcoes = {}) {
    const JsPDF = globalThis.window?.jspdf?.jsPDF;
    if (!JsPDF) throw new Error(MENSAGEM_SEM_JSPDF);

    const doc = new JsPDF({ unit: 'pt', format: 'a4' });
    const margem = 48;
    const larguraUtil = doc.internal.pageSize.getWidth() - margem * 2;
    const alturaPagina = doc.internal.pageSize.getHeight();
    const estadoY = { y: margem };

    function quebrarPaginaSeNecessario(alturaLinha) {
        if (estadoY.y + alturaLinha > alturaPagina - margem) {
            doc.addPage('a4', 'portrait');
            estadoY.y = margem;
        }
    }

    // Texto corrido: cada quebra de linha do autor é respeitada, e linha em branco
    // vira um respiro. `antes` não vale no topo da página.
    function escrever(
        texto,
        { tamanho = 10, estilo = 'normal', cor = 0, antes = 0, depois = 0 } = {},
    ) {
        if (antes && estadoY.y > margem) {
            if (estadoY.y + antes + tamanho * 2.8 > alturaPagina - margem) {
                doc.addPage('a4', 'portrait');
                estadoY.y = margem;
            } else {
                estadoY.y += antes;
            }
        }
        doc.setFont('helvetica', estilo);
        doc.setFontSize(tamanho);
        doc.setTextColor(cor, cor, cor);
        String(texto)
            .split('\n')
            .forEach((linha) => {
                if (!linha.trim()) {
                    estadoY.y += 8;
                    return;
                }
                doc.splitTextToSize(saneParaPdf(linha), larguraUtil).forEach((l) => {
                    quebrarPaginaSeNecessario(tamanho * 1.4);
                    doc.text(l, margem, estadoY.y);
                    estadoY.y += tamanho * 1.4;
                });
            });
        estadoY.y += depois;
    }

    blocosDoSorteio(dbRef, tipo, item, opcoes).forEach((bloco) => {
        if (bloco.tipo === 'titulo') {
            escrever(bloco.texto, { tamanho: 18, estilo: 'bold', depois: 2 });
        } else if (bloco.tipo === 'tipo') {
            escrever(bloco.texto, { estilo: 'italic', cor: 90, depois: 8 });
        } else if (bloco.tipo === 'corpo') {
            renderizarCorpoRico(doc, tirarComentariosDoEditor(bloco.texto), {
                margem,
                larguraUtil,
                estadoY,
                quebrarPaginaSeNecessario,
                tamanhoBase: 10,
                alturaPagina,
            });
            estadoY.y += 4;
        } else if (bloco.tipo === 'ficha') {
            escrever('Ficha', { tamanho: 13, estilo: 'bold', antes: 14, depois: 4 });
            bloco.itens.forEach(({ rotulo, valor }) => escrever(`-  ${rotulo}: ${valor}`));
        } else {
            escrever(bloco.rotulo, { tamanho: 13, estilo: 'bold', antes: 14, depois: 4 });
            if (bloco.itens) {
                bloco.itens.forEach((segmentos) => escrever(`-  ${segmentosParaTexto(segmentos)}`));
            } else {
                escrever(bloco.texto);
            }
        }
    });

    return doc;
}

// Carrega o jsPDF (se preciso), monta o PDF e salva. `carregar` e `salvar` são
// injetáveis nos testes.
export async function baixarPdfSorteio(
    dbRef,
    tipo,
    item,
    opcoes = {},
    { carregar = carregarJsPdf, salvar = (doc, nome) => doc.save(nome) } = {},
) {
    await carregar();
    const doc = gerarPdfSorteio(dbRef, tipo, item, opcoes);
    salvar(doc, nomeArquivoSorteio(item, 'pdf'));
}
