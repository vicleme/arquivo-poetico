// ============================================================
// exportar-livros-pdf.js: download das informações do Livro em .pdf
// (Fase 19, etapa 8). Só desenha o modelo de `modeloDocumentoLivro`
// (exportar-livros.js), o mesmo que o .md e o .docx leem: títulos, campos
// "Rótulo: valor" com o rótulo em negrito, o Uso de IA e os textos longos do
// livro. Nunca o conteúdo dos poemas e prosas. Com a opção "Incluir estrutura"
// (`modelo.estrutura`), fecha cada livro com a lista de títulos, com recuo por nível.
//
// As fontes padrão do jsPDF cobrem a WinAnsi: aspas curvas, travessão e
// reticências passam como estão; emoji e símbolos fora dela são descartados por
// `saneParaPdf` (exportar-pdf.js).
//
// Links (http e https) saem clicáveis, em azul e sublinhados. A capa, quando o
// livro tem uma, entra embutida abaixo do título: quem chama carrega os bytes
// e passa em `opcoes.capas` (mapa id do livro -> { bytes, tipo, largura, altura }).
// ============================================================

import { saneParaPdf } from './exportar-pdf.js';
import { dividirCamposDaFicha, modeloDocumentoLivro, segmentarLinks } from './exportar-livros.js';
import { textoDaLinhaForaDeEscopo } from './estrutura-livro-saida.js';

const MARGEM = 48;
const TAMANHO_H1 = 18;
const TAMANHO_H2 = 14;
const TAMANHO_CORPO = 10;
const ESPACO_CAPA = 16;
const RECUO_ITEM = 22;
const COR_LINK = [5, 99, 193];
const CAPA_LARGURA_MAX = 120;
const CAPA_ALTURA_MAX = 170;

function construtorJsPdf() {
    return globalThis.window?.jspdf?.jsPDF || globalThis.jspdf?.jsPDF || null;
}

/**
 * Desenha os livros e devolve o `doc` do jsPDF (ainda não salvo). Com mais de
 * um livro, o documento abre com o título "Livros". `JsPdf` só é passado nos
 * testes; na página vem de window.jspdf.
 */
export function gerarPdfLivros(registros, JsPdf = construtorJsPdf(), opcoes = {}) {
    if (!JsPdf) {
        throw new Error(
            'A biblioteca de PDF não carregou (verifique a conexão com a internet). Tente novamente em alguns segundos.',
        );
    }
    const doc = new JsPdf({ unit: 'pt', format: 'a4' });
    const largura = doc.internal.pageSize.getWidth();
    const altura = doc.internal.pageSize.getHeight();
    let y = MARGEM;

    const quebrarSeFaltar = (necessario) => {
        if (y + necessario > altura - MARGEM) {
            doc.addPage('a4', 'portrait');
            y = MARGEM;
        }
    };

    // Escreve runs [{ texto, negrito, url }] quebrando por palavra. Endereços
    // viram trechos clicáveis; uma palavra mais larga que a linha (um link
    // longo) é partida em pedaços que cabem.
    const escrever = (runs, { tamanho = TAMANHO_CORPO, x = MARGEM, cor = [0, 0, 0] } = {}) => {
        const alturaLinha = tamanho * 1.4;
        const larguraLinha = largura - MARGEM - x;
        const palavras = [];
        runs.forEach((run) => {
            const trechos = run.url
                ? [run]
                : segmentarLinks(run.texto).map((t) => ({ ...run, ...t }));
            trechos.forEach((trecho, i) => {
                // Pontuação colada ao endereço ("[https://x]", "https://x,") não
                // ganha espaço: só os espaços do texto original contam.
                const anterior = i > 0 ? trechos[i - 1].texto : '';
                const colaNoAnterior = i > 0 && /\S$/.test(anterior) && /^\S/.test(trecho.texto);
                saneParaPdf(trecho.texto)
                    .split(/\s+/)
                    .filter(Boolean)
                    .forEach((p, j) =>
                        palavras.push({
                            texto: p,
                            negrito: !!trecho.negrito,
                            url: trecho.url,
                            cola: j === 0 && colaNoAnterior,
                        }),
                    );
            });
        });
        doc.setFontSize(tamanho);
        const medir = (p) => {
            doc.setFont('helvetica', p.negrito ? 'bold' : 'normal');
            return doc.getTextWidth(p.texto);
        };
        const partir = (p) => {
            if (medir(p) <= larguraLinha) return [p];
            const pedacos = [];
            let atual = '';
            for (const ch of p.texto) {
                if (atual && medir({ ...p, texto: atual + ch }) > larguraLinha) {
                    pedacos.push({ ...p, texto: atual, cola: p.cola || pedacos.length > 0 });
                    atual = '';
                }
                atual += ch;
            }
            if (atual) pedacos.push({ ...p, texto: atual, cola: p.cola || pedacos.length > 0 });
            return pedacos;
        };
        let linha = [];
        let usado = 0;
        const descarregar = () => {
            if (!linha.length) return;
            quebrarSeFaltar(alturaLinha);
            let cx = x;
            linha.forEach((p, i) => {
                doc.setFont('helvetica', p.negrito ? 'bold' : 'normal');
                doc.setTextColor(...(p.url ? COR_LINK : cor));
                doc.text(p.texto, cx, y + tamanho);
                const larguraTexto = doc.getTextWidth(p.texto);
                if (p.url) {
                    doc.link(cx, y, larguraTexto, alturaLinha, { url: p.url });
                    if (doc.line) {
                        doc.setDrawColor(...COR_LINK);
                        doc.line(cx, y + tamanho + 1.5, cx + larguraTexto, y + tamanho + 1.5);
                    }
                }
                const proxima = linha[i + 1];
                cx += doc.getTextWidth(proxima?.cola ? p.texto : `${p.texto} `);
            });
            y += alturaLinha;
            linha = [];
            usado = 0;
        };
        palavras.flatMap(partir).forEach((p) => {
            const w = medir(p);
            const espaco = linha.length && !p.cola ? medir({ texto: ' ', negrito: false }) : 0;
            if (linha.length && usado + espaco + w > larguraLinha) descarregar();
            usado += espaco + w;
            linha.push(p);
        });
        descarregar();
    };

    // Um título nunca fica sozinho no fim da página.
    const titulo = (texto, tamanho, antes) => {
        y += antes;
        quebrarSeFaltar(tamanho * 1.4 + TAMANHO_CORPO * 2.8);
        escrever([{ texto, negrito: true }], { tamanho });
        y += 2;
    };

    // Texto longo: um parágrafo do PDF por linha do texto original.
    const paragrafos = (texto, x = MARGEM) => {
        String(texto)
            .split(/\n+/)
            .filter((l) => l.trim())
            .forEach((l) => {
                escrever([{ texto: l.trim() }], { x });
                y += 4;
            });
    };

    const modelos = (registros || []).map(modeloDocumentoLivro);
    if (modelos.length > 1) titulo('Livros', TAMANHO_H1, 0);

    modelos.forEach((m, indice) => {
        const unico = modelos.length === 1;
        if (unico) titulo(m.titulo, TAMANHO_H1, 0);
        else titulo(m.titulo, TAMANHO_H2, indice === 0 ? 4 : 18);

        // Ficha do livro: a capa à esquerda e os campos ao lado, à direita. Sem
        // capa, os campos ocupam a largura toda, com o mesmo recuo da margem.
        const capa = opcoes.capas?.get(String(registros[indice]?.id));
        const temCapa = !!(capa?.bytes && capa.largura > 0 && capa.altura > 0);
        let xCampos = MARGEM;
        let fimCapa = null;
        let paginaCapa = null;
        if (temCapa) {
            const escala = Math.min(
                CAPA_LARGURA_MAX / capa.largura,
                CAPA_ALTURA_MAX / capa.altura,
                1,
            );
            const w = capa.largura * escala;
            const h = capa.altura * escala;
            y += 4;
            quebrarSeFaltar(h);
            doc.addImage(capa.bytes, capa.tipo === 'png' ? 'PNG' : 'JPEG', MARGEM, y, w, h);
            xCampos = MARGEM + w + ESPACO_CAPA;
            fimCapa = y + h + 8;
            paginaCapa = doc.internal.getNumberOfPages();
        }

        // Com a imagem embutida, "Capa: tem capa" seria redundante.
        const { aoLado, abaixo } = temCapa
            ? dividirCamposDaFicha(m.campos.filter((c) => c.rotulo !== 'Capa'))
            : { aoLado: [], abaixo: m.campos };
        const escreverCampo = (c, x) =>
            escrever([{ texto: `${c.rotulo}:`, negrito: true }, { texto: c.valor }], { x });
        aoLado.forEach((c) => escreverCampo(c, xCampos));
        // Campos mais curtos que a capa: o resto continua abaixo dela. Se os
        // campos viraram a página, a capa já ficou para trás.
        if (fimCapa !== null && doc.internal.getNumberOfPages() === paginaCapa) {
            y = Math.max(y, fimCapa);
        }
        abaixo.forEach((c) => escreverCampo(c, MARGEM));

        if (m.usoIa) {
            y += 6;
            escrever([{ texto: 'Uso de IA:', negrito: true }, { texto: m.usoIa.estado }]);
            m.usoIa.itens.forEach((item) => {
                escrever([{ texto: `- ${item}` }], { x: MARGEM + RECUO_ITEM });
            });
            if (m.usoIa.nota) {
                y += 2;
                paragrafos(m.usoIa.nota);
            }
        }

        m.blocos.forEach((b) => {
            y += 6;
            quebrarSeFaltar(TAMANHO_CORPO * 1.4 * 3);
            escrever([{ texto: `${b.rotulo}:`, negrito: true }]);
            paragrafos(b.texto);
        });

        if (m.estrutura) {
            y += 6;
            quebrarSeFaltar(TAMANHO_CORPO * 1.4 * 3);
            escrever([{ texto: 'Estrutura:', negrito: true }]);
            const item = (rotulo, texto, nivel) =>
                escrever([{ texto: `- ${rotulo ? `${rotulo}: ` : ''}${texto}` }], {
                    x: MARGEM + RECUO_ITEM * nivel,
                });
            if (m.estrutura.linhas.length === 0) escrever([{ texto: 'Sem conteúdo.' }]);
            m.estrutura.linhas.forEach((l) => item(l.rotulo, l.titulo, l.nivel));
            if (m.estrutura.vinculados.length) {
                y += 6;
                quebrarSeFaltar(TAMANHO_CORPO * 1.4 * 3);
                escrever([{ texto: 'Vinculados, sem posição na estrutura:', negrito: true }]);
                m.estrutura.vinculados.forEach((v) => item(v.rotulo, v.titulo, 1));
            }
            const fora = m.estrutura.foraDeEscopo;
            if (fora) {
                y += 6;
                quebrarSeFaltar(TAMANHO_CORPO * 1.4 * 3);
                escrever([{ texto: 'Fora de escopo:', negrito: true }]);
                if (!fora.migrados.length && !fora.descartados.length) {
                    escrever([{ texto: 'Nada fora de escopo.' }]);
                }
                [
                    ['Migrados:', fora.migrados],
                    ['Descartados:', fora.descartados],
                ].forEach(([rotulo, linhas]) => {
                    if (!linhas.length) return;
                    escrever([{ texto: rotulo }], { x: MARGEM + RECUO_ITEM });
                    linhas.forEach((l) => item('', textoDaLinhaForaDeEscopo(l), 2));
                });
            }
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

// Gera e baixa. `nomeBase` é o nome do arquivo sem a extensão.
export function baixarPdfLivros(registros, nomeBase, opcoes = {}) {
    const doc = gerarPdfLivros(registros, undefined, opcoes);
    doc.save(`${nomeBase}.pdf`);
}
