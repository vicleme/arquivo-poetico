// ============================================================
// exportar-estrutura-textual.js — Exportação de uma Progressão
// Morfofuncional avulsa (aba Morfofuncionalidade) em .json/.md/.pdf/
// .docx — mesmos 4 formatos do botão Baixar de Sonoridade (ver
// acoes-coluna.js), pra manter a uniformidade do sistema.
//
// Bem mais simples que exportar-sonoridade.js: Unidades/Eventos não
// têm grade silábica nem pares pra desenhar em tabela — cada item vira
// uma linha de lista com a classificação + resumoPosicao() (a mesma
// função usada nos cartões do modal, pra nunca divergir do que a
// pessoa vê lá — ver estrutura-textual.js). Itens em cada lista seguem
// a mesma ordem de ordenarPorPosicao() (posicionados por posição no
// texto, não posicionados ao final).
// ============================================================

import { db } from './db.js';
import { mostrarAviso } from './utils.js';
import { ordenarPorPosicao, resumoPosicao } from './estrutura-textual.js';

// ─── Nome de arquivo (mesma lógica de exportar-sonoridade.js) ───────
function nomeArquivoSeguro(texto) {
    const base = (texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return base || 'sem-titulo';
}

function resolverEstruturaEPoema(id) {
    const estrutura = db.estruturasTextuais.find((x) => x.id == id);
    if (!estrutura) return { estrutura: null, poema: null };
    const poema = db.poemas.find((p) => p.id == estrutura.poemaId) || null;
    return { estrutura, poema };
}

function nomeBaseArquivo(poema, estrutura) {
    return nomeArquivoSeguro(
        poema?.titulo ? `progressao-${poema.titulo}` : `progressao-${estrutura.id}`,
    );
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

// Rótulo de uma Unidade ("Quartetos · Proposição") ou Evento ("Volta")
// — mesmo critério de título usado no cartão do modal (montarCartaoHtml
// em estrutura-textual.js). Exportado pra visualizar-estrutura-textual.js
// reaproveitar sem duplicar o critério.
export function rotuloItem(tipo, item) {
    if (tipo === 'unidade') {
        return [item.unidadeEstrofica, item.unidadeDiscursiva].filter(Boolean).join(' · ') ||
            'Sem classificação';
    }
    return item.progressaoDialetica || 'Sem classificação';
}

// ─── .md ──────────────────────────────────────────────────────────
export function estruturaParaMarkdown(estrutura, poema) {
    const unidades = ordenarPorPosicao(estrutura.unidades || []);
    const eventos = ordenarPorPosicao(estrutura.eventos || []);

    let md = `## Progressão Morfofuncional — ${poema?.titulo || `#${estrutura.id}`}\n\n`;

    md += `### Unidades\n\n`;
    if (unidades.length) {
        unidades.forEach((u) => {
            md += `- **${rotuloItem('unidade', u)}** — ${resumoPosicao(u.posicao)}\n`;
        });
    } else {
        md += `_Nenhuma Unidade cadastrada._\n`;
    }
    md += `\n### Eventos\n\n`;
    if (eventos.length) {
        eventos.forEach((e) => {
            md += `- **${rotuloItem('evento', e)}** — ${resumoPosicao(e.posicao)}\n`;
        });
    } else {
        md += `_Nenhum Evento cadastrado._\n`;
    }

    return md;
}

export function baixarEstruturaMarkdown(estrutura, poema) {
    const conteudo = estruturaParaMarkdown(estrutura, poema);
    baixarBlob(
        new Blob([conteudo], { type: 'text/markdown;charset=utf-8' }),
        `${nomeBaseArquivo(poema, estrutura)}.md`,
    );
}

// ─── .pdf ─────────────────────────────────────────────────────────
function obterConstrutorJsPdf() {
    return window.jspdf?.jsPDF || null;
}

export function gerarPdfEstrutura(estrutura, poema) {
    const Ctor = obterConstrutorJsPdf();
    if (!Ctor) {
        throw new Error(
            'A biblioteca de PDF não carregou (verifique a conexão com a internet) — tente novamente em alguns segundos.',
        );
    }
    const doc = new Ctor({ unit: 'pt', format: 'a4' });
    const margem = 48;
    const largura = doc.internal.pageSize.getWidth() - margem * 2;
    const alturaPagina = doc.internal.pageSize.getHeight();
    let y = margem;

    function quebrarSeNecessario(altura) {
        if (y + altura > alturaPagina - margem) {
            doc.addPage();
            y = margem;
        }
    }

    function paragrafo(texto, { tamanho = 10, negrito = false, espacoDepois = 6 } = {}) {
        doc.setFont('helvetica', negrito ? 'bold' : 'normal');
        doc.setFontSize(tamanho);
        const linhas = doc.splitTextToSize(String(texto ?? ''), largura);
        linhas.forEach((linha) => {
            quebrarSeNecessario(tamanho * 1.35);
            doc.text(linha, margem, y);
            y += tamanho * 1.35;
        });
        y += espacoDepois;
    }

    function itemLista(rotulo, posicaoTexto) {
        paragrafo(`•  ${rotulo} — ${posicaoTexto}`, { tamanho: 10, espacoDepois: 3 });
    }

    paragrafo(`Progressão Morfofuncional — ${poema?.titulo || `#${estrutura.id}`}`, {
        tamanho: 16,
        negrito: true,
    });

    const unidades = ordenarPorPosicao(estrutura.unidades || []);
    const eventos = ordenarPorPosicao(estrutura.eventos || []);

    paragrafo('Unidades', { tamanho: 12, negrito: true, espacoDepois: 4 });
    if (unidades.length) {
        unidades.forEach((u) => itemLista(rotuloItem('unidade', u), resumoPosicao(u.posicao)));
    } else {
        paragrafo('Nenhuma Unidade cadastrada.', { tamanho: 10, espacoDepois: 3 });
    }
    y += 6;

    paragrafo('Eventos', { tamanho: 12, negrito: true, espacoDepois: 4 });
    if (eventos.length) {
        eventos.forEach((e) => itemLista(rotuloItem('evento', e), resumoPosicao(e.posicao)));
    } else {
        paragrafo('Nenhum Evento cadastrado.', { tamanho: 10, espacoDepois: 3 });
    }

    return doc;
}

export function baixarEstruturaPdf(estrutura, poema) {
    const doc = gerarPdfEstrutura(estrutura, poema);
    doc.save(`${nomeBaseArquivo(poema, estrutura)}.pdf`);
}

// ─── .docx ────────────────────────────────────────────────────────
function obterDocx() {
    return window.docx || null;
}

const ESTILOS_PADRAO_DOCUMENTO_ESTRUTURA = {
    default: {
        document: {
            paragraph: { spacing: { after: 120, line: 264, lineRule: 'auto' } },
        },
        heading1: { paragraph: { spacing: { before: 320, after: 120 } } },
        heading2: { paragraph: { spacing: { before: 240, after: 100 } } },
        listParagraph: { paragraph: { spacing: { after: 80 } } },
    },
};

export function gerarDocxEstrutura(estrutura, poema) {
    const docx = obterDocx();
    if (!docx) {
        throw new Error(
            'A biblioteca de .docx não carregou (verifique a conexão com a internet) — tente novamente em alguns segundos.',
        );
    }
    const { Document, Paragraph, TextRun, HeadingLevel } = docx;
    const filhos = [];

    filhos.push(
        new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
                new TextRun({
                    text: `Progressão Morfofuncional — ${poema?.titulo || `#${estrutura.id}`}`,
                }),
            ],
        }),
    );

    const unidades = ordenarPorPosicao(estrutura.unidades || []);
    const eventos = ordenarPorPosicao(estrutura.eventos || []);

    function secao(titulo, itens, tipo) {
        filhos.push(
            new Paragraph({
                heading: HeadingLevel.HEADING_2,
                children: [new TextRun(titulo)],
            }),
        );
        if (!itens.length) {
            filhos.push(
                new Paragraph({
                    spacing: { after: 80 },
                    children: [new TextRun({ text: `Nenhum${tipo === 'unidade' ? 'a' : ''} ${titulo.slice(0, -1).toLowerCase()} cadastrad${tipo === 'unidade' ? 'a' : 'o'}.`, italics: true })],
                }),
            );
            return;
        }
        itens.forEach((item) => {
            filhos.push(
                new Paragraph({
                    bullet: { level: 0 },
                    spacing: { after: 60 },
                    children: [
                        new TextRun({ text: `${rotuloItem(tipo, item)} — `, bold: true }),
                        new TextRun({ text: resumoPosicao(item.posicao) }),
                    ],
                }),
            );
        });
    }

    secao('Unidades', unidades, 'unidade');
    secao('Eventos', eventos, 'evento');

    return new Document({
        styles: ESTILOS_PADRAO_DOCUMENTO_ESTRUTURA,
        sections: [{ children: filhos }],
    });
}

export async function baixarEstruturaDocx(estrutura, poema) {
    const docx = obterDocx();
    if (!docx) {
        throw new Error(
            'A biblioteca de .docx não carregou (verifique a conexão com a internet) — tente novamente em alguns segundos.',
        );
    }
    const documento = gerarDocxEstrutura(estrutura, poema);
    const blob = await docx.Packer.toBlob(documento);
    baixarBlob(blob, `${nomeBaseArquivo(poema, estrutura)}.docx`);
}

// ─── .json ────────────────────────────────────────────────────────
export function baixarEstruturaJson(estrutura, poema) {
    const payload = { ...estrutura, poemaTitulo: poema?.titulo || null };
    baixarBlob(
        new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }),
        `${nomeBaseArquivo(poema, estrutura)}.json`,
    );
}

// ─── Dispatcher (botão "Baixar" da coluna Ações e modal de
// Visualização) — mesmo papel que exportarEscansao() tem pra
// Sonoridade. `formato` é 'md' | 'pdf' | 'docx' | 'json'.
export async function exportarEstruturaTextual(id, formato) {
    const { estrutura, poema } = resolverEstruturaEPoema(id);
    if (!estrutura) {
        mostrarAviso('Progressão Morfofuncional não encontrada.');
        return;
    }

    if (formato === 'pdf') {
        try {
            baixarEstruturaPdf(estrutura, poema);
        } catch (err) {
            mostrarAviso(err.message || 'Não foi possível gerar o PDF.');
        }
        return;
    }

    if (formato === 'docx') {
        try {
            await baixarEstruturaDocx(estrutura, poema);
        } catch (err) {
            mostrarAviso(err.message || 'Não foi possível gerar o .docx.');
        }
        return;
    }

    if (formato === 'json') {
        baixarEstruturaJson(estrutura, poema);
        return;
    }

    baixarEstruturaMarkdown(estrutura, poema);
}
