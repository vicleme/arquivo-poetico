// ============================================================
// exportar-livros-docx.js: download das informações do Livro em .docx
// (Fase 19, etapa 8). Lê o mesmo modelo do .md e do .pdf
// (`modeloDocumentoLivro`, exportar-livros.js) e monta o Document com a
// biblioteca docx (window.docx, via CDN, como nos outros .docx do app).
// Nunca o conteúdo dos poemas e prosas. Com a opção "Incluir estrutura"
// (`modelo.estrutura`), fecha cada livro com a lista de títulos em marcadores,
// um nível de recuo por nível da árvore.
//
// Links (http e https) saem clicáveis. A capa, quando o livro tem uma, entra
// embutida abaixo do título: quem chama carrega os bytes e passa em
// `opcoes.capas` (mapa id do livro -> { bytes, tipo, largura, altura }).
// ============================================================

import { dividirCamposDaFicha, modeloDocumentoLivro, segmentarLinks } from './exportar-livros.js';
import { textoDaLinhaForaDeEscopo } from './estrutura-livro-saida.js';

const CAPA_LARGURA_MAX = 160;
const CAPA_ALTURA_MAX = 230;
// Colunas da ficha (twips, A4 com margens de 2,54 cm = 9026 de largura útil).
const COL_CAPA = 2500;
const COL_CAMPOS = 6526;
const ESPACO_CAPA = 280;

const MSG_SEM_BIBLIOTECA =
    'A biblioteca de .docx não carregou (verifique a conexão com a internet). Tente novamente em alguns segundos.';

function obterDocx() {
    return globalThis.window?.docx || null;
}

const ESTILOS = {
    default: {
        document: { paragraph: { spacing: { after: 100, line: 264, lineRule: 'auto' } } },
        heading1: { paragraph: { spacing: { before: 320, after: 120 } } },
        heading2: { paragraph: { spacing: { before: 360, after: 120 } } },
        listParagraph: { paragraph: { spacing: { after: 60 } } },
    },
};

/** Monta o Document (ainda não empacotado). Com mais de um livro, abre com "Livros". */
export function gerarDocxLivros(registros, opcoes = {}) {
    const docx = obterDocx();
    if (!docx) throw new Error(MSG_SEM_BIBLIOTECA);
    const {
        Document,
        Paragraph,
        TextRun,
        HeadingLevel,
        ExternalHyperlink,
        ImageRun,
        Table,
        TableRow,
        TableCell,
        WidthType,
        BorderStyle,
        TableLayoutType,
    } = docx;

    // Texto com os endereços como links clicáveis.
    const runsDoTexto = (texto) =>
        segmentarLinks(texto).map((t) =>
            t.url
                ? new ExternalHyperlink({
                      link: t.url,
                      children: [new TextRun({ text: t.texto, style: 'Hyperlink' })],
                  })
                : new TextRun(t.texto),
        );

    const campo = (rotulo, valor) =>
        new Paragraph({
            spacing: { after: 60 },
            children: [new TextRun({ text: `${rotulo}: `, bold: true }), ...runsDoTexto(valor)],
        });

    const paragrafos = (texto) =>
        String(texto)
            .split(/\n+/)
            .filter((l) => l.trim())
            .map((l) => new Paragraph({ children: runsDoTexto(l.trim()) }));

    const modelos = (registros || []).map(modeloDocumentoLivro);
    const filhos = [];
    if (modelos.length > 1) {
        filhos.push(
            new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Livros')] }),
        );
    }

    modelos.forEach((m, indice) => {
        filhos.push(
            new Paragraph({
                heading: modelos.length > 1 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_1,
                children: [new TextRun(m.titulo)],
            }),
        );
        // Ficha do livro: com capa, uma tabela de duas colunas sem bordas (capa
        // à esquerda, campos à direita). Sem capa, os campos ficam em parágrafos.
        const capa = opcoes.capas?.get(String(registros[indice]?.id));
        const temCapa = !!(capa?.bytes && capa.largura > 0 && capa.altura > 0);
        // Com a imagem embutida, "Capa: tem capa" seria redundante.
        const { aoLado, abaixo } = temCapa
            ? dividirCamposDaFicha(m.campos.filter((c) => c.rotulo !== 'Capa'))
            : { aoLado: [], abaixo: m.campos };
        const paragrafosCampos = aoLado.map((c) => campo(c.rotulo, c.valor));
        if (temCapa) {
            const escala = Math.min(
                CAPA_LARGURA_MAX / capa.largura,
                CAPA_ALTURA_MAX / capa.altura,
                1,
            );
            const semBorda = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
            const bordas = {
                top: semBorda,
                bottom: semBorda,
                left: semBorda,
                right: semBorda,
            };
            const celula = (largura, children, margemEsq = 0) =>
                new TableCell({
                    width: { size: largura, type: WidthType.DXA },
                    borders: bordas,
                    margins: { top: 0, bottom: 0, left: margemEsq, right: 0 },
                    children,
                });
            const capaParagrafo = new Paragraph({
                spacing: { after: 0 },
                children: [
                    new ImageRun({
                        type: capa.tipo === 'png' ? 'png' : 'jpg',
                        data: capa.bytes,
                        transformation: {
                            width: Math.round(capa.largura * escala),
                            height: Math.round(capa.altura * escala),
                        },
                        altText: {
                            title: `Capa de ${m.titulo}`,
                            description: `Capa de ${m.titulo}`,
                            name: 'capa',
                        },
                    }),
                ],
            });
            filhos.push(
                new Table({
                    width: { size: COL_CAPA + COL_CAMPOS, type: WidthType.DXA },
                    columnWidths: [COL_CAPA, COL_CAMPOS],
                    layout: TableLayoutType.FIXED,
                    borders: { ...bordas, insideHorizontal: semBorda, insideVertical: semBorda },
                    rows: [
                        new TableRow({
                            children: [
                                celula(COL_CAPA, [capaParagrafo]),
                                celula(
                                    COL_CAMPOS,
                                    paragrafosCampos.length
                                        ? paragrafosCampos
                                        : [new Paragraph({ children: [] })],
                                    ESPACO_CAPA,
                                ),
                            ],
                        }),
                    ],
                }),
                new Paragraph({ spacing: { after: 0 }, children: [] }),
            );
        }
        filhos.push(...abaixo.map((c) => campo(c.rotulo, c.valor)));

        if (m.usoIa) {
            filhos.push(campo('Uso de IA', m.usoIa.estado));
            m.usoIa.itens.forEach((item) =>
                filhos.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun(item)] })),
            );
            filhos.push(...paragrafos(m.usoIa.nota));
        }

        m.blocos.forEach((b) => {
            filhos.push(
                new Paragraph({
                    spacing: { before: 120, after: 60 },
                    children: [new TextRun({ text: `${b.rotulo}:`, bold: true })],
                }),
            );
            filhos.push(...paragrafos(b.texto));
        });

        if (m.estrutura) {
            const titulinho = (texto) =>
                new Paragraph({
                    spacing: { before: 120, after: 60 },
                    children: [new TextRun({ text: texto, bold: true })],
                });
            const item = (rotulo, texto, nivel) =>
                new Paragraph({
                    bullet: { level: Math.min(Math.max(nivel, 0), 8) },
                    children: [new TextRun(`${rotulo ? `${rotulo}: ` : ''}${texto}`)],
                });
            filhos.push(titulinho('Estrutura:'));
            if (m.estrutura.linhas.length === 0) {
                filhos.push(new Paragraph({ children: [new TextRun('Sem conteúdo.')] }));
            }
            m.estrutura.linhas.forEach((l) => filhos.push(item(l.rotulo, l.titulo, l.nivel - 1)));
            if (m.estrutura.vinculados.length) {
                filhos.push(titulinho('Vinculados, sem posição na estrutura:'));
                m.estrutura.vinculados.forEach((v) => filhos.push(item(v.rotulo, v.titulo, 0)));
            }
            const fora = m.estrutura.foraDeEscopo;
            if (fora) {
                filhos.push(titulinho('Fora de escopo:'));
                if (!fora.migrados.length && !fora.descartados.length) {
                    filhos.push(new Paragraph({ children: [new TextRun('Nada fora de escopo.')] }));
                }
                [
                    ['Migrados', fora.migrados],
                    ['Descartados', fora.descartados],
                ].forEach(([rotulo, linhas]) => {
                    if (!linhas.length) return;
                    filhos.push(item('', rotulo, 0));
                    linhas.forEach((l) => filhos.push(item('', textoDaLinhaForaDeEscopo(l), 1)));
                });
            }
        }
    });

    return new Document({ styles: ESTILOS, sections: [{ children: filhos }] });
}

function baixarBlob(blob, nomeArquivo) {
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

// Gera e baixa. `nomeBase` é o nome do arquivo sem a extensão.
export async function baixarDocxLivros(registros, nomeBase, opcoes = {}) {
    const docx = obterDocx();
    if (!docx) throw new Error(MSG_SEM_BIBLIOTECA);
    const blob = await docx.Packer.toBlob(gerarDocxLivros(registros, opcoes));
    baixarBlob(blob, `${nomeBase}.docx`);
}
