// ============================================================
// capas-para-exportar.js: carrega as capas dos livros como bytes, para o
// .pdf e o .docx embutirem a imagem (Fase 19, etapa 8).
//
// Só a imagem enviada pelo app, que mora no IndexedDB (capas.js). O "link da
// imagem" não entra: o navegador não consegue baixá-lo (CORS, login), como
// explica imagem-link.js. Capa que não carrega é pulada, nunca derruba o download.
//
// Entrega um mapa id do livro -> { bytes, tipo, largura, altura }, com `tipo`
// 'jpeg' ou 'png' (os dois formatos que o jsPDF e a docx aceitam do mesmo jeito).
// ============================================================

import { lerCapa, revogarURL } from './capas.js';

// Largura e altura reais da imagem, no navegador.
async function medirNoNavegador(blob) {
    if (typeof createImageBitmap === 'function') {
        const bmp = await createImageBitmap(blob);
        const dim = { largura: bmp.width, altura: bmp.height };
        bmp.close?.();
        return dim;
    }
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve({ largura: img.width, altura: img.height });
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('imagem ilegível'));
        };
        img.src = url;
    });
}

// Outros formatos (webp, gif...) viram JPEG com fundo branco.
async function converterParaJpeg(blob) {
    const { largura, altura } = await medirNoNavegador(blob);
    const canvas = document.createElement('canvas');
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, largura, altura);
    const bmp = await createImageBitmap(blob);
    ctx.drawImage(bmp, 0, 0);
    bmp.close?.();
    return new Promise((resolve, reject) =>
        canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('sem conversão'))),
            'image/jpeg',
            0.9,
        ),
    );
}

/**
 * Transforma o blob de uma capa em `{ bytes, tipo, largura, altura }`.
 * `medir` e `converter` só são passados nos testes.
 */
export async function prepararCapa(blob, medir = medirNoNavegador, converter = converterParaJpeg) {
    let b = blob;
    let tipo = b.type === 'image/png' ? 'png' : b.type === 'image/jpeg' ? 'jpeg' : null;
    if (!tipo) {
        b = await converter(b);
        tipo = 'jpeg';
    }
    const { largura, altura } = await medir(b);
    const bytes = new Uint8Array(await b.arrayBuffer());
    return { bytes, tipo, largura, altura };
}

/** Carrega as capas dos livros recebidos. Quem não tem capa, ou cuja capa falha, fica de fora. */
export async function carregarCapasParaExportar(livros) {
    const mapa = new Map();
    for (const livro of livros || []) {
        if (!livro?.capa) continue;
        let url = null;
        try {
            url = await lerCapa(livro.capa);
            if (!url) continue;
            const blob = await (await fetch(url)).blob();
            mapa.set(String(livro.id), await prepararCapa(blob));
        } catch {
            // capa ilegível: o livro sai sem a imagem
        } finally {
            if (url) revogarURL(url);
        }
    }
    return mapa;
}
