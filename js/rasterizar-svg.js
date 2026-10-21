// ============================================================
// rasterizar-svg.js: do SVG ao PNG, no navegador. Compartilhado pelos
// relatórios que desenham um SVG só (Conexões e Tag clusters): rasteriza
// no canvas, na escala que o navegador aguenta, e baixa o arquivo.
// `medirTexto` mede com o mesmo canvas, para as quebras de linha do SVG
// baterem com o que o navegador desenha.
// ============================================================

import { calcularEscalaExport } from './exportar-conexoes-png.js';

let _ctxMedicao = null;
export function medirTexto(texto, fonte) {
    if (!_ctxMedicao) _ctxMedicao = document.createElement('canvas').getContext('2d');
    _ctxMedicao.font = fonte;
    return _ctxMedicao.measureText(texto).width;
}

// Rasteriza um SVG já serializado (com fundo opaco) num canvas, na
// escala que o navegador aguenta. Devolve { canvas, escala }.
export function svgTextoParaCanvas(svgTexto, largura, altura, dica = 'Baixe um escopo menor.') {
    const escala = calcularEscalaExport(largura, altura);
    if (!escala) {
        return Promise.reject(new Error(`A imagem ficaria grande demais para exportar. ${dica}`));
    }
    const svgBlob = new Blob([svgTexto], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(svgUrl);
            const canvas = document.createElement('canvas');
            canvas.width = Math.floor(largura * escala);
            canvas.height = Math.floor(altura * escala);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve({ canvas, escala: canvas.width / largura });
        };
        img.onerror = () => {
            URL.revokeObjectURL(svgUrl);
            reject(new Error('Falha ao carregar o diagrama pra exportação.'));
        };
        img.src = svgUrl;
    });
}

export async function svgTextoParaPngBlob(svgTexto, largura, altura, dica) {
    const { canvas } = await svgTextoParaCanvas(svgTexto, largura, altura, dica);
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('Falha ao gerar PNG do diagrama.'));
                return;
            }
            resolve(blob);
        }, 'image/png');
    });
}

// Recorta o canvas do desenho em uma fatia PNG (dataURL) por página do plano
// do PDF. Início e fim arredondados do mesmo jeito nas duas pontas, para duas
// páginas seguidas não deixarem uma linha de pixels de fora nem repetida.
export function fatiasDoPlano(canvas, escala, plano) {
    return plano.paginas.map((p) => {
        const topo = Math.round(p.de * escala);
        const altura = Math.max(1, Math.round(p.ate * escala) - topo);
        const fatia = document.createElement('canvas');
        fatia.width = canvas.width;
        fatia.height = altura;
        fatia
            .getContext('2d')
            .drawImage(canvas, 0, topo, canvas.width, altura, 0, 0, canvas.width, altura);
        return fatia.toDataURL('image/png');
    });
}

export function baixarBlob(blob, nomeArquivo) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    a.click();
    URL.revokeObjectURL(url);
}
