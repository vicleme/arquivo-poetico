// ============================================================
// exportar-fora-do-acervo-pdf.js: PDF do relatório da seção "Fora do acervo"
// da aba Conexões (T9, entrega 11 de 13; o botão na seção vem na 12).
//
// O PDF nasce do MESMO Markdown do .md (gerarMarkdownForaDoAcervo), lido
// linha a linha, para os dois arquivos nunca divergirem no que entra, nos
// escopos nem no filtro e na ordem. Só desenha: títulos por nível, itens com
// marcador, subitens "Rótulo: valor" com o rótulo em negrito, trechos em
// negrito dentro da linha, notas e número de página. Texto de verdade (não
// imagem), então dá para selecionar e buscar no PDF.
//
// Módulo sem DOM: `JsPdf` entra por parâmetro (na página vem de
// window.jspdf; nos testes, de um falso). Só `baixarForaDoAcervoPdf` salva.
//
// As fontes padrão do jsPDF só cobrem Latin-1 (e a WinAnsi). Além das trocas
// que `textoParaPdf` já faz, aqui entram "←" e "≈" do relatório; o .md fica
// com os símbolos de verdade.
// ============================================================

import { textoParaPdf } from './relatorio-pdf.js';
import {
    gerarMarkdownForaDoAcervo,
    escopoDoRelatorioForaDoAcervo,
    NOME_ARQUIVO_FORA_DO_ACERVO,
} from './exportar-fora-do-acervo.js';

const MARGEM = 48;
const TAMANHO_TITULO = { 1: 18, 2: 14, 3: 12 };
const TAMANHO_CORPO = 10;
const RECUO_ITEM = 10; // do marcador ao texto
const RECUO_SUBITEM = 22;

const TROCAS_DO_FORA_DO_ACERVO = [
    [/←/g, '<-'],
    [/≈/g, '~'],
];

export function textoParaPdfForaDoAcervo(texto) {
    let t = String(texto ?? '');
    TROCAS_DO_FORA_DO_ACERVO.forEach(([re, subst]) => {
        t = t.replace(re, subst);
    });
    return textoParaPdf(t);
}

// "a **b** c" vira [{ texto: 'a ' }, { texto: 'b', negrito: true }, { texto: ' c' }].
// Um "**" sem par fica como texto.
export function partirNegrito(texto) {
    const runs = [];
    const re = /\*\*(.+?)\*\*/g;
    const s = String(texto ?? '');
    let ultimo = 0;
    let m;
    while ((m = re.exec(s))) {
        if (m.index > ultimo) runs.push({ texto: s.slice(ultimo, m.index), negrito: false });
        runs.push({ texto: m[1], negrito: true });
        ultimo = m.index + m[0].length;
    }
    if (ultimo < s.length) runs.push({ texto: s.slice(ultimo), negrito: false });
    return runs;
}

// Lê uma linha do Markdown do relatório. Devolve null para linha em branco.
export function interpretarLinhaForaDoAcervo(linha) {
    if (!linha || !linha.trim()) return null;
    if (/^-{3,}$/.test(linha.trim())) return { tipo: 'separador' };
    let m = /^(#{1,6}) (.*)$/.exec(linha);
    if (m) return { tipo: 'titulo', nivel: m[1].length, texto: m[2] };
    m = /^_(.*)_$/.exec(linha);
    if (m) return { tipo: 'nota', texto: m[1] };
    m = /^ {2}- (.*)$/.exec(linha);
    if (m) {
        const campo = /^(.{1,40}?): (.*)$/.exec(m[1]);
        return campo
            ? { tipo: 'subitem', rotulo: campo[1], texto: campo[2] }
            : { tipo: 'subitem', texto: m[1] };
    }
    m = /^- (.*)$/.exec(linha);
    if (m) return { tipo: 'item', texto: m[1] };
    return { tipo: 'paragrafo', texto: linha.trim() };
}

function construtorJsPdf() {
    return globalThis.window?.jspdf?.jsPDF || globalThis.jspdf?.jsPDF || null;
}

/**
 * Desenha o relatório e devolve o `doc` do jsPDF (ainda não salvo).
 * `dados` é o resultado de `montarForaDoAcervo`; `escopo` e `opcoes`
 * (`{ consulta, ordem }`) são os do .md.
 */
export function gerarPdfForaDoAcervo(
    dados,
    escopo = 'tudo',
    opcoes = {},
    JsPdf = construtorJsPdf(),
) {
    if (!JsPdf) {
        throw new Error(
            'A biblioteca de PDF não carregou (verifique a conexão com a internet). Tente novamente em alguns segundos.',
        );
    }
    const doc = new JsPdf({ unit: 'pt', format: 'a4' });
    const largura = doc.internal.pageSize.getWidth();
    const altura = doc.internal.pageSize.getHeight();
    let y = MARGEM;

    const quebrarSeFaltar = (alturaNecessaria) => {
        if (y + alturaNecessaria > altura - MARGEM) {
            doc.addPage('a4', 'portrait');
            y = MARGEM;
        }
    };

    // Escreve runs [{ texto, negrito }] quebrando por palavra. `marcador`, se
    // vier, é desenhado à esquerda de `x` na primeira linha (recuo pendurado).
    const escrever = (runs, { tamanho, x, cor = [0, 0, 0], marcador = null }) => {
        const alturaLinha = tamanho * 1.4;
        const palavras = [];
        runs.forEach((run) => {
            textoParaPdfForaDoAcervo(run.texto)
                .split(/\s+/)
                .filter(Boolean)
                .forEach((p) => palavras.push({ texto: p, negrito: !!run.negrito }));
        });
        doc.setFontSize(tamanho);
        doc.setTextColor(...cor);
        const largLinha = largura - MARGEM - x;
        const largPalavra = (p) => {
            doc.setFont('helvetica', p.negrito ? 'bold' : 'normal');
            return doc.getTextWidth(p.texto);
        };
        let linha = [];
        let usado = 0;
        let primeira = true;
        const descarregar = () => {
            if (!linha.length) return;
            quebrarSeFaltar(alturaLinha);
            if (primeira && marcador) {
                doc.setFont('helvetica', 'normal');
                doc.text(marcador, x - RECUO_ITEM, y + tamanho);
            }
            primeira = false;
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

    gerarMarkdownForaDoAcervo(dados, escopoDoRelatorioForaDoAcervo(escopo), opcoes)
        .split('\n')
        .forEach((bruta) => {
            const l = interpretarLinhaForaDoAcervo(bruta);
            if (!l) return;
            if (l.tipo === 'separador') {
                y += 4;
                quebrarSeFaltar(8);
                doc.setDrawColor(200, 200, 200);
                doc.line(MARGEM, y, largura - MARGEM, y);
                y += 6;
            } else if (l.tipo === 'titulo') {
                const tamanho = TAMANHO_TITULO[l.nivel] || TAMANHO_CORPO;
                y += l.nivel === 1 ? 0 : 6;
                // Título nunca fica sozinho no fim da página: reserva espaço
                // para ele e mais duas linhas de corpo.
                quebrarSeFaltar(tamanho * 1.4 + TAMANHO_CORPO * 2.8);
                escrever([{ texto: l.texto, negrito: true }], { tamanho, x: MARGEM });
                y += 4;
            } else if (l.tipo === 'nota') {
                escrever([{ texto: l.texto }], {
                    tamanho: TAMANHO_CORPO,
                    x: MARGEM,
                    cor: [90, 90, 90],
                });
                y += 4;
            } else if (l.tipo === 'item') {
                // O item não fica sozinho no fim da página: reserva a sua linha
                // e a primeira do subitem.
                y += 3;
                quebrarSeFaltar(TAMANHO_CORPO * 2.8 + 3);
                escrever(partirNegrito(l.texto), {
                    tamanho: TAMANHO_CORPO,
                    x: MARGEM + RECUO_ITEM,
                    marcador: '-',
                });
            } else if (l.tipo === 'subitem') {
                const runs = l.rotulo
                    ? [{ texto: `${l.rotulo}:`, negrito: true }, ...partirNegrito(l.texto)]
                    : partirNegrito(l.texto);
                escrever(runs, { tamanho: TAMANHO_CORPO, x: MARGEM + RECUO_SUBITEM });
            } else {
                escrever(partirNegrito(l.texto), { tamanho: TAMANHO_CORPO, x: MARGEM });
                y += 2;
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

export function nomeDoPdfForaDoAcervo(escopo = 'tudo') {
    return `${NOME_ARQUIVO_FORA_DO_ACERVO[escopoDoRelatorioForaDoAcervo(escopo)]}.pdf`;
}

export function baixarForaDoAcervoPdf(dados, escopo = 'tudo', opcoes = {}) {
    const doc = gerarPdfForaDoAcervo(dados, escopo, opcoes);
    doc.save(nomeDoPdfForaDoAcervo(escopo));
}
