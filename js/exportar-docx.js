// ============================================================
// exportar-docx.js — Exportação em Word (.docx), terceira ponta ao
// lado de exportar-md.js e exportar-pdf.js.
//
// Mesma filosofia dos outros dois: reaproveita itemParaMarkdownPartes
// (exportar-md.js) pra tudo em volta do corpo do Texto — meta, Notas,
// Anexos etc. — assim os três formatos nunca divergem em QUAIS campos
// entram nem em que ordem. O corpo do Texto em si reaproveita
// corpoParaLinhasRicas (utils.js) — as mesmas runs
// (texto/negrito/itálico/sublinhado/cor/fundo/fonte/tamanho/alinhamento)
// que o PDF usa pra desenhar, só que aqui viram TextRun de verdade da
// lib docx em vez de comandos de desenho — negrito/itálico/sublinhado/
// cor/fundo/fonte sobrevivem no .docx igual já sobrevivem no PDF (fundo
// e fonte não são desenhados no PDF, ver comentário em
// analisarEstiloDeDiv/utils.js pra saber por quê) — o .md "achata" tudo
// isso, ver corpoParaMarkdown em exportar-md.js, mas descreve fundo/
// cor/fonte numa legenda textual à parte (legendaCorParaMarkdown).
//
// Geração de verdade fica por conta da lib docx (npm: docx),
// vendorizada via CDN como window.docx (build UMD, mesmo padrão do
// jsPDF — ver <script> em index.html). Antes disso a exportação usava
// html-docx-js, que não faz conversão HTML→OOXML nenhuma: empacota o
// HTML cru como .mht e delega a conversão de verdade pro motor de
// importação HTML do próprio Word (uma caixa-preta, sem controle fino
// sobre "isso é sombreamento de RUN" vs. "isso é sombreamento de
// PARÁGRAFO" — na prática, cada verso virando seu próprio <p style=
// "background-color:...">, o Word promovia aquele fundo a algo que se
// comporta como sombreamento de parágrafo/linha inteira, em vez de
// ficar colado ao texto). A lib docx monta o OOXML run a run: por
// padrão, cada trecho com fundo (run.fundo, abaixo) vira um TextRun
// com `shading` explícito — um w:shd dentro do w:rPr do PRÓPRIO RUN,
// nunca no w:pPr do parágrafo — então a caixa de fundo cola
// exatamente no texto. A EXCEÇÃO é quando o fundo cobre a linha
// INTEIRA (todo run com texto na linha tem o mesmo fundo, ver
// linhaTemFundoUniforme em utils.js): nesse caso o sombreamento sobe
// pro w:pPr do Paragraph — pedido explícito de que o fundo de uma
// linha toda ocupe a largura da página inteira, não só o texto. Uma
// linha com fundo só numa palavra/trecho (ou com fundos diferentes
// lado a lado) continua no caminho de RUN de sempre.
// ============================================================

import { itemParaMarkdownPartes } from './exportar-md.js';
import { corpoParaLinhasRicas, linhaTemFundoUniforme, blocosDeFundoContinuos } from './utils.js';

function obterDocx() {
    return window.docx || null;
}

// ─── Espaçamento padrão do documento ────────────────────────────────────
// Sem isso, a lib docx não define w:docDefaults nem spacing nenhum nos
// estilos de heading/lista embutidos (Heading1/2/3, ListParagraph) — ao
// abrir no Word, tudo cai no fallback "sem espaço antes/depois, linha
// single" e o documento inteiro fica "grudado": título colado no
// parágrafo seguinte, cada item colado no próximo, cada linha de meta
// colada na de cima, Notas colada no fim do bloco de Texto etc. — bem
// diferente do respiro que a tela (CSS) e o PDF (que já soma espaço
// antes/depois de título, ver preEspacoTitulo/"+= 8"/"+= 4" em
// renderizarLinhasSimples, exportar-pdf.js) sempre tiveram.
//
// Valores abaixo espelham o MESMO ritmo do PDF (que usa pt: título
// maior = mais respiro antes, "depois" sempre pequeno pra colar no
// conteúdo do próprio título) — só convertidos pra twips (1pt = 20
// twips, a unidade de spacing/margin da lib docx):
//   H1 (preEspacoTitulo 16pt / +4pt no PDF)  → before 320 / after 80
//   H2 (preEspacoTitulo 12pt / +4pt no PDF)  → before 240 / after 80
//   H3 (preEspacoTitulo  8pt / +4pt no PDF)  → before 160 / after 80
// O padrão geral (Normal, usado por parágrafos comuns — Notas, citação,
// linhas de texto livre) ganha um "after" pequeno (120 twips = 6pt) pra
// blocos de texto corrido não colarem um no outro, com linha um pouco
// mais folgada (line 264 ≈ 1,1) — mas deliberadamente MENOR que os
// versos do corpo do Texto (line 360 = 1,5, ver linhaParaDocxParagrafo),
// que têm sua própria proporção pensada pra poesia. ListParagraph (as
// linhas "- **Rótulo:** valor" de meta) fica com "after" bem menor (40
// twips) — no PDF, cada linha de meta é só uma quebra de linha comum,
// sem respiro extra entre uma e outra, então a lista deve continuar
// visualmente compacta mesmo com o Normal geral mais espaçado.
const ESTILOS_PADRAO_DOCUMENTO = {
    default: {
        document: {
            paragraph: { spacing: { after: 120, line: 264, lineRule: 'auto' } },
        },
        heading1: { paragraph: { spacing: { before: 320, after: 80 } } },
        heading2: { paragraph: { spacing: { before: 240, after: 80 } } },
        heading3: { paragraph: { spacing: { before: 160, after: 80 } } },
        listParagraph: { paragraph: { spacing: { after: 40 } } },
    },
};

function corRgbParaHex(rgb) {
    const h = (n) => n.toString(16).padStart(2, '0');
    return `${h(rgb.r)}${h(rgb.g)}${h(rgb.b)}`.toUpperCase();
}

// ─── Markdown inline "simples" → runs ────────────────────────────────────
// Cobre só o subconjunto que itemParaMarkdownPartes de fato produz (ver
// exportar-md.js) dentro de uma linha: links [texto](url), **negrito** e
// *itálico* (asterisco único — usado nos rótulos de tipo "*(Poema)*" e
// nas notas/anexos, diferente do _itálico_ do corpo do Texto, que tem
// tratamento próprio em corpoParaDocxParagrafos). Mesma ordem de
// precedência que o antigo inlineParaHtml (link → negrito → itálico):
// em vez de substituições de string em cadeia (que geravam HTML), cada
// passo fatia um array de "segmentos" — string crua ainda não
// analisada, ou token já resolvido — e só aplica a próxima regex sobre
// os pedaços que ainda são string, preservando o mesmo efeito de
// precedência sequencial sem reprocessar o que já virou token.
function aplicarRegexEmSegmentos(segmentos, regex, criarToken) {
    const resultado = [];
    segmentos.forEach((seg) => {
        if (typeof seg !== 'string') {
            resultado.push(seg);
            return;
        }
        let ultimoIndex = 0;
        let match;
        regex.lastIndex = 0;
        while ((match = regex.exec(seg)) !== null) {
            if (match.index > ultimoIndex) resultado.push(seg.slice(ultimoIndex, match.index));
            resultado.push(criarToken(match));
            ultimoIndex = regex.lastIndex;
        }
        if (ultimoIndex < seg.length) resultado.push(seg.slice(ultimoIndex));
    });
    return resultado;
}

function inlineParaSegmentos(texto) {
    let segmentos = [texto];
    segmentos = aplicarRegexEmSegmentos(segmentos, /\[([^\]]+)\]\(([^)]+)\)/g, (m) => ({
        tipo: 'link',
        texto: m[1],
        url: m[2],
    }));
    segmentos = aplicarRegexEmSegmentos(segmentos, /\*\*(.+?)\*\*/g, (m) => ({
        tipo: 'texto',
        texto: m[1],
        negrito: true,
    }));
    segmentos = aplicarRegexEmSegmentos(segmentos, /\*(.+?)\*/g, (m) => ({
        tipo: 'texto',
        texto: m[1],
        italico: true,
    }));
    return segmentos
        .map((seg) => (typeof seg === 'string' ? { tipo: 'texto', texto: seg } : seg))
        .filter((seg) => seg.texto !== '');
}

function segmentosParaRuns(docx, segmentos) {
    const { TextRun, ExternalHyperlink } = docx;
    return segmentos.map((seg) => {
        if (seg.tipo === 'link') {
            return new ExternalHyperlink({
                link: seg.url,
                children: [new TextRun({ text: seg.texto, style: 'Hyperlink' })],
            });
        }
        return new TextRun({
            text: seg.texto,
            bold: seg.negrito || undefined,
            italics: seg.italico || undefined,
        });
    });
}

// ─── Markdown "simples" → parágrafos ────────────────────────────────────
// Mesmo subconjunto de markdownParaHtml (versão anterior, baseada em
// HTML): #/##/### (título geral/item/seção), listas "- " (sub-itens
// "  - " de itemParaMarkdownDepoisDoTexto caem na mesma regra depois do
// trim — mesma limitação/fidelidade da versão em HTML, sem nesting),
// citação "> ", e "---" como separador. Não é um parser de Markdown
// genérico — só recebe Markdown gerado por itemParaMarkdownPartes.
function criarSeparador(docx) {
    const { Paragraph, BorderStyle } = docx;
    return new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' } },
        spacing: { before: 120, after: 200 },
    });
}

function markdownParaParagrafos(docx, md) {
    const { Paragraph, HeadingLevel, BorderStyle } = docx;
    const NIVEL_TITULO = {
        1: HeadingLevel.HEADING_1,
        2: HeadingLevel.HEADING_2,
        3: HeadingLevel.HEADING_3,
    };
    const paragrafos = [];

    md.split('\n').forEach((linhaBruta) => {
        const linha = linhaBruta.trim();
        if (!linha) return;

        if (linha === '---') {
            paragrafos.push(criarSeparador(docx));
            return;
        }

        const tituloMatch = linha.match(/^(#{1,3})\s+(.*)$/);
        if (tituloMatch) {
            paragrafos.push(
                new Paragraph({
                    heading: NIVEL_TITULO[tituloMatch[1].length],
                    children: segmentosParaRuns(docx, inlineParaSegmentos(tituloMatch[2])),
                }),
            );
            return;
        }

        if (linha.startsWith('> ')) {
            paragrafos.push(
                new Paragraph({
                    indent: { left: 360 },
                    border: { left: { style: BorderStyle.SINGLE, size: 12, color: '999999' } },
                    children: segmentosParaRuns(docx, inlineParaSegmentos(linha.slice(2))),
                }),
            );
            return;
        }

        const listaMatch = linha.match(/^- (.*)$/);
        if (listaMatch) {
            paragrafos.push(
                new Paragraph({
                    bullet: { level: 0 },
                    children: segmentosParaRuns(docx, inlineParaSegmentos(listaMatch[1])),
                }),
            );
            return;
        }

        paragrafos.push(
            new Paragraph({ children: segmentosParaRuns(docx, inlineParaSegmentos(linha)) }),
        );
    });

    return paragrafos;
}

// ─── Corpo rico do Texto ────────────────────────────────────────────────
// corpoParaLinhasRicas (utils.js) já resolve a cascata de
// **negrito**/_itálico_/<u>/<div style="..."> em runs com estilo
// definitivo — aqui cada run vira um TextRun com as propriedades
// equivalentes. O fundo (run.fundo) normalmente vira `shading` DENTRO
// do próprio TextRun (w:shd no w:rPr do run), nunca uma propriedade do
// Paragraph — SALVO quando a linha inteira compartilha o mesmo fundo
// (linhaTemFundoUniforme, ver comentário no topo do arquivo), caso em
// que o shading sobe pro próprio Paragraph (w:shd no w:pPr), cobrindo
// margem a margem. Cada "linha" das runs vira seu próprio Paragraph
// (não reflui como parágrafo comum): poesia depende da quebra de
// verso a verso, igual o PDF preserva linha a linha.
//
// Extraído de corpoParaDocxParagrafos pra poder ser chamado tanto no
// caminho normal quanto de dentro de uma caixa contínua (ver
// linhaParaDocxParagrafo abaixo) — `suprimirFundo` evita repetir, no
// w:pPr do próprio verso, um fundo que a TABELA que o envolve já
// desenha atrás dele (ver criarTabelaComCaixa).
function linhaParaDocxParagrafo(docx, runsDaLinha, { suprimirFundo = false } = {}) {
    const { Paragraph, TextRun, ShadingType, AlignmentType } = docx;
    const MAPA_ALINHAMENTO = {
        left: AlignmentType.LEFT,
        right: AlignmentType.RIGHT,
        center: AlignmentType.CENTER,
    };

    if (!runsDaLinha.length) {
        return new Paragraph({
            spacing: { after: 0, line: 360, lineRule: 'auto' },
            children: [],
        });
    }

    const alinhamento = runsDaLinha.find((r) => r.alinhamento)?.alinhamento || 'left';
    const fundoUniforme = !suprimirFundo && linhaTemFundoUniforme(runsDaLinha);
    const children = runsDaLinha.map((run) => {
        const opcoes = { text: run.texto };
        if (run.negrito) opcoes.bold = true;
        if (run.italico) opcoes.italics = true;
        if (run.sublinhado) opcoes.underline = {};
        if (run.cor) opcoes.color = corRgbParaHex(run.cor);
        if (run.fundo && !fundoUniforme && !suprimirFundo) {
            // Sombreamento de RUN — colado ao texto, nunca à linha inteira
            // (ver comentário no topo do arquivo). Quando a linha inteira
            // tem o mesmo fundo, ele vai pro Paragraph abaixo em vez de
            // repetir aqui.
            opcoes.shading = {
                type: ShadingType.CLEAR,
                color: 'auto',
                fill: corRgbParaHex(run.fundo),
            };
        }
        if (run.fonte) opcoes.font = run.fonte;
        if (run.tamanho) opcoes.size = Math.round(run.tamanho * 2); // pt → meio-ponto
        return new TextRun(opcoes);
    });

    const opcoesParagrafo = {
        alignment: MAPA_ALINHAMENTO[alinhamento],
        // "line: 360" (1,5 linha, no vocabulário do próprio Word) em
        // vez do espaçamento single padrão — sem isso, cada verso
        // (Paragraph) usa a métrica "auto" nativa da fonte, que sobra
        // MUITO menos respiro do que o fator usado no PDF (tamanho *
        // 1.4 de altura de linha, ver alturaLinha em exportar-pdf.js);
        // o efeito era o fundo (shading) colando quase direto no
        // texto, sem quase nenhuma margem interna acima/abaixo dele —
        // reportado como "tudo muito espremidinho" depois da troca
        // html-docx-js → docx. `after: 0` continua — isso é o que
        // mantém versos consecutivos (e, dentro deles, fundo de linha
        // inteira mesclado entre versos vizinhos, ver
        // linhaTemFundoUniforme) sem um vão em branco a mais entre um
        // verso e o próximo.
        spacing: { after: 0, line: 360, lineRule: 'auto' },
        children,
    };
    if (fundoUniforme) {
        // Fundo de linha inteira: sombreamento de PARÁGRAFO, cobre
        // margem a margem (largura da página), não só o texto.
        opcoesParagrafo.shading = {
            type: ShadingType.CLEAR,
            color: 'auto',
            fill: corRgbParaHex(fundoUniforme),
        };
    }
    return new Paragraph(opcoesParagrafo);
}

// ─── Caixa contínua (padding/border-radius) ─────────────────────────────
// Equivalente docx de renderizarBlocoComCaixa em exportar-pdf.js: um
// bloco identificado por blocosDeFundoContinuos (utils.js) — várias
// linhas seguidas com o mesmo fundo/padding/raio, quebras de estrofe em
// branco incluídas — vira UMA caixa só, não N faixas coladas linha a
// linha. Word não tem uma primitiva de "fundo de bloco com respiro"
// fora de tabela, então a caixa é uma tabela 1×1 sem bordas: o
// sombreamento (`shading`) vai na CÉLULA (cobre o bloco inteiro, largura
// da página) e o padding vira `margins` da célula (px→twips: 1px =
// 0,75pt = 15 twips — mesma conversão px→pt usada no PDF, só que daí
// pra twips, que é a unidade de margem/espaçamento da lib docx). Os
// parágrafos de cada linha do bloco entram como filhos da célula, com
// `suprimirFundo: true` (a célula já pinta o fundo; repetir no w:pPr de
// cada verso não muda o visual mas polui o XML).
//
// border-radius NÃO tem equivalente em tabela do Word (cantos de célula
// são sempre retos) — bloco.raio é ignorado aqui de propósito; a caixa
// sai com cantos quadrados no .docx mesmo quando arredondada na tela e
// no PDF. Isso é avisado a Victor fora do código, não no documento
// gerado.
function criarTabelaComCaixa(docx, bloco, paragrafosDoBloco) {
    const { Table, TableRow, TableCell, BorderStyle, WidthType, ShadingType } = docx;
    const PX_PARA_TWIPS = 15;
    const margemPadding = Math.round((bloco.padding || 0) * PX_PARA_TWIPS);
    const semBorda = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };

    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
            top: semBorda,
            bottom: semBorda,
            left: semBorda,
            right: semBorda,
            insideHorizontal: semBorda,
            insideVertical: semBorda,
        },
        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        shading: {
                            type: ShadingType.CLEAR,
                            color: 'auto',
                            fill: corRgbParaHex(bloco.fundo),
                        },
                        margins: {
                            top: margemPadding,
                            bottom: margemPadding,
                            left: margemPadding,
                            right: margemPadding,
                        },
                        children: paragrafosDoBloco,
                    }),
                ],
            }),
        ],
    });
}

// Percorre as linhas do corpo (`corpoParaLinhasRicas`) devolvendo um
// array de Paragraph/Table pra `sections[0].children` do Document.
// Linhas dentro de um bloco com padding/border-radius (ver
// blocosDeFundoContinuos, utils.js) são desviadas pra
// criarTabelaComCaixa; o resto segue o caminho de sempre, um Paragraph
// por linha.
function corpoParaDocxParagrafos(docx, textoOriginal) {
    const linhas = corpoParaLinhasRicas(textoOriginal || '');
    const blocosComCaixa = blocosDeFundoContinuos(linhas).filter((b) => b.padding || b.raio);
    const blocoPorInicio = new Map(blocosComCaixa.map((b) => [b.inicio, b]));

    const resultado = [];
    let indice = 0;
    while (indice < linhas.length) {
        const bloco = blocoPorInicio.get(indice);
        if (bloco) {
            const paragrafosDoBloco = [];
            for (let i = bloco.inicio; i <= bloco.fim; i++) {
                paragrafosDoBloco.push(
                    linhaParaDocxParagrafo(docx, linhas[i], { suprimirFundo: true }),
                );
            }
            resultado.push(criarTabelaComCaixa(docx, bloco, paragrafosDoBloco));
            indice = bloco.fim + 1;
            continue;
        }
        resultado.push(linhaParaDocxParagrafo(docx, linhas[indice]));
        indice++;
    }
    return resultado;
}

// ─── Documento completo ─────────────────────────────────────────────────
// Mesma estrutura da versão anterior (gerarDocxHtmlExportacao): corta o
// Markdown de "antesDoTexto" bem no marcador "### Texto\n\n" e troca o
// que viria depois (o corpo achatado) pelo corpo rico em Paragraph/
// TextRun de verdade.
export function gerarDocxDocumento(itens) {
    const docx = obterDocx();
    if (!docx) {
        throw new Error(
            'A biblioteca de .docx não carregou (verifique a conexão com a internet) — tente novamente em alguns segundos.',
        );
    }

    const agora = new Date();
    const dataStr = agora.toLocaleDateString('pt-BR');

    let corpo = markdownParaParagrafos(
        docx,
        `# Exportação Poética\n\n_Gerado em ${dataStr} — ${itens.length} texto(s)._\n\n---\n\n`,
    );

    itens.forEach((item, i) => {
        const { antesDoTexto, depoisDoTexto } = itemParaMarkdownPartes(item, i + 1);

        const marcador = '### Texto\n\n';
        const indiceMarcador = antesDoTexto.indexOf(marcador);
        if (indiceMarcador === -1) {
            corpo = corpo.concat(markdownParaParagrafos(docx, antesDoTexto));
        } else {
            corpo = corpo.concat(
                markdownParaParagrafos(
                    docx,
                    antesDoTexto.slice(0, indiceMarcador + marcador.length),
                ),
            );
            corpo = corpo.concat(corpoParaDocxParagrafos(docx, item.texto));
        }

        corpo = corpo.concat(markdownParaParagrafos(docx, depoisDoTexto));
        corpo = corpo.concat(markdownParaParagrafos(docx, '---\n\n'));
    });

    return new docx.Document({ styles: ESTILOS_PADRAO_DOCUMENTO, sections: [{ children: corpo }] });
}

export async function baixarDocx(itens, nomeArquivo) {
    const docx = obterDocx();
    if (!docx) {
        throw new Error(
            'A biblioteca de .docx não carregou (verifique a conexão com a internet) — tente novamente em alguns segundos.',
        );
    }

    const documento = gerarDocxDocumento(itens);
    const blob = await docx.Packer.toBlob(documento);
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
