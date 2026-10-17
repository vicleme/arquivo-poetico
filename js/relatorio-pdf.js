// ============================================================
// relatorio-pdf.js: PDF do relatório dos Períodos Biográficos, dos Períodos
// Históricos e das Correntes literárias (Fase 14, etapa 4).
//
// O PDF nasce do MESMO Markdown do .md (relatorioParaMarkdown), lido linha a
// linha, para os dois arquivos nunca divergirem no que entra. Só desenha:
// títulos por nível, campos "Rótulo: valor" com o rótulo em negrito, itens
// secundários (títulos dos textos) e número de página.
//
// As fontes padrão do jsPDF só cobrem Latin-1. Antes de saneParaPdf (que
// descarta o que sobra), trocamos o que o relatório usa e a fonte não tem:
// travessão e meia-risca por hífen, "›" por ">", aspas e reticências curvas
// por ASCII. O .md fica com os símbolos de verdade.
// ============================================================

import { saneParaPdf } from './exportar-pdf.js';
import { relatorioParaMarkdown } from './relatorio-periodos.js';

const MARGEM = 48;
const TAMANHO_TITULO = { 1: 18, 2: 14, 3: 12.5, 4: 11.5, 5: 11, 6: 10.5 };
const TAMANHO_CORPO = 10;
const RECUO_POR_NIVEL = 12;
const RECUO_MAXIMO = 60;

const TROCAS_DO_RELATORIO = [
    [/[–—]/g, '-'],
    [/›/g, '>'],
    [/[“”]/g, '"'],
    [/[‘’]/g, "'"],
    [/…/g, '...'],
];

export function textoParaPdf(texto) {
    let t = String(texto ?? '');
    TROCAS_DO_RELATORIO.forEach(([re, subst]) => {
        t = t.replace(re, subst);
    });
    return saneParaPdf(t);
}

// Lê uma linha do Markdown do relatório. Devolve null para linha em branco.
export function interpretarLinha(linha) {
    if (!linha || !linha.trim()) return null;
    let m = /^(#{1,6}) (.*)$/.exec(linha);
    if (m) return { tipo: 'titulo', nivel: m[1].length, texto: m[2] };
    m = /^_(.*)_$/.exec(linha);
    if (m) return { tipo: 'nota', texto: m[1] };
    m = /^- \*\*(.+?):\*\* ?(.*)$/.exec(linha);
    if (m) return { tipo: 'campo', rotulo: m[1], texto: m[2] };
    m = /^ {2}- (.*)$/.exec(linha);
    if (m) return { tipo: 'subitem', texto: m[1] };
    return { tipo: 'paragrafo', texto: linha.trim() };
}

function construtorJsPdf() {
    return globalThis.window?.jspdf?.jsPDF || globalThis.jspdf?.jsPDF || null;
}

/**
 * Desenha o modelo do relatório e devolve o `doc` do jsPDF (ainda não salvo).
 * `JsPdf` só é passado nos testes; na página vem de window.jspdf.
 */
export function gerarPdfRelatorio(modelo, JsPdf = construtorJsPdf()) {
    if (!JsPdf) {
        throw new Error(
            'A biblioteca de PDF não carregou (verifique a conexão com a internet). Tente novamente em alguns segundos.',
        );
    }
    const doc = new JsPdf({ unit: 'pt', format: 'a4' });
    const largura = doc.internal.pageSize.getWidth();
    const altura = doc.internal.pageSize.getHeight();
    // Nível do primeiro item: com autor (Período Biográfico) os itens ficam
    // um nível abaixo. Em árvore, cada nível de profundidade recua um pouco.
    const nivelBase = modelo.grupos.some((g) => g.titulo) ? 3 : 2;
    const recuoDoNivel = (nivel) =>
        modelo.organizacao === 'arvore'
            ? Math.min(Math.max(nivel - nivelBase, 0) * RECUO_POR_NIVEL, RECUO_MAXIMO)
            : 0;

    let y = MARGEM;
    let recuo = 0;

    const quebrarSeFaltar = (alturaNecessaria) => {
        if (y + alturaNecessaria > altura - MARGEM) {
            doc.addPage('a4', 'portrait');
            y = MARGEM;
        }
    };

    // Escreve runs [{ texto, negrito }] quebrando por palavra.
    const escrever = (runs, { tamanho, x, cor = [0, 0, 0] }) => {
        const alturaLinha = tamanho * 1.4;
        const palavras = [];
        runs.forEach((run) => {
            textoParaPdf(run.texto)
                .split(/\s+/)
                .filter(Boolean)
                .forEach((p) => palavras.push({ texto: p, negrito: !!run.negrito }));
        });
        doc.setFontSize(tamanho);
        doc.setTextColor(...cor);
        let linha = [];
        let usado = 0;
        const largLinha = largura - MARGEM - x;
        const largPalavra = (p) => {
            doc.setFont('helvetica', p.negrito ? 'bold' : 'normal');
            return doc.getTextWidth(p.texto);
        };
        const descarregar = () => {
            if (!linha.length) return;
            quebrarSeFaltar(alturaLinha);
            let cx = x;
            linha.forEach((p) => {
                doc.setFont('helvetica', p.negrito ? 'bold' : 'normal');
                doc.text(p.texto, cx, y + tamanho);
                cx += doc.getTextWidth(`${p.texto} `);
            });
            y += alturaLinha;
            linha = [];
            usado = 0;
        };
        palavras.forEach((p) => {
            const w = largPalavra(p);
            const espaco = linha.length ? largPalavra({ texto: ' ', negrito: false }) : 0;
            if (linha.length && usado + espaco + w > largLinha) descarregar();
            usado += (linha.length ? espaco : 0) + w;
            linha.push(p);
        });
        descarregar();
    };

    relatorioParaMarkdown(modelo)
        .split('\n')
        .forEach((bruta) => {
            const l = interpretarLinha(bruta);
            if (!l) return;
            if (l.tipo === 'titulo') {
                const tamanho = TAMANHO_TITULO[l.nivel] || TAMANHO_CORPO;
                recuo = recuoDoNivel(l.nivel);
                y += l.nivel === 1 ? 0 : 8;
                // Título nunca fica sozinho no fim da página: reserva espaço para
                // ele e mais duas linhas de corpo.
                quebrarSeFaltar(tamanho * 1.4 + TAMANHO_CORPO * 2.8);
                escrever([{ texto: l.texto, negrito: true }], { tamanho, x: MARGEM + recuo });
                y += 2;
            } else if (l.tipo === 'nota') {
                escrever([{ texto: l.texto }], {
                    tamanho: TAMANHO_CORPO,
                    x: MARGEM,
                    cor: [90, 90, 90],
                });
                y += 4;
            } else if (l.tipo === 'campo') {
                escrever([{ texto: `${l.rotulo}:`, negrito: true }, { texto: l.texto }], {
                    tamanho: TAMANHO_CORPO,
                    x: MARGEM + recuo + 8,
                });
            } else if (l.tipo === 'subitem') {
                escrever([{ texto: `- ${l.texto}` }], {
                    tamanho: TAMANHO_CORPO,
                    x: MARGEM + recuo + 22,
                });
            } else {
                escrever([{ texto: l.texto }], { tamanho: TAMANHO_CORPO, x: MARGEM });
                y += 4;
            }
        });

    const paginas = doc.internal.getNumberOfPages();
    for (let i = 1; i <= paginas; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(`Página ${i} de ${paginas}`, largura / 2, altura - 24, { align: 'center' });
    }
    return doc;
}
