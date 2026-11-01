// ============================================================
// exportar-mapa-origens-acoes.js: os botões "Baixar .png" e "Baixar .pdf" do
// mapa de calor das origens. Parte do navegador (canvas, jsPDF, download); o
// desenho em si mora em `exportar-mapa-origens.js`.
//
// O .png sai no tema da página; o .pdf sempre no tema claro (papel), fatiado em
// A4 como os outros relatórios. Mundo todo por padrão; com `enquadrado`, só o
// que a tela mostra agora.
// ============================================================

import { montarSvgMapaOrigens, sufixoDoMapa } from './exportar-mapa-origens.js';
import {
    baixarBlob,
    fatiasDoPlano,
    medirTexto,
    svgTextoParaCanvas,
    svgTextoParaPngBlob,
} from './rasterizar-svg.js';
import { gerarPdfConexoes, planejarPdf } from './exportar-conexoes-pdf.js';

const DICA = 'Use o enquadramento atual ou baixe o gráfico em colunas.';

function relatorio({ mapa, dados, vista, claro, filtro }) {
    const escuro = !claro && document.documentElement.classList.contains('dark');
    return montarSvgMapaOrigens({ mapa, dados, vista, escuro, medir: medirTexto, filtro });
}

// `ctx`: { mapa, dados, vista (ou null para o mundo todo), filtro }
export async function baixarMapaOrigensPng(ctx) {
    try {
        const r = relatorio({ ...ctx, claro: false });
        const blob = await svgTextoParaPngBlob(r.svg, r.largura, r.altura, DICA);
        baixarBlob(blob, `mapa-origens${sufixoDoMapa(!!ctx.vista)}.png`);
    } catch (err) {
        console.error(err);
        alert(err?.message || 'Não foi possível gerar a imagem do mapa.');
    }
}

export async function baixarMapaOrigensPdf(ctx) {
    try {
        const JsPdf = window.jspdf?.jsPDF;
        if (!JsPdf) {
            throw new Error(
                'A biblioteca de PDF não carregou (verifique a conexão com a internet). Tente novamente em alguns segundos.',
            );
        }
        const r = relatorio({ ...ctx, claro: true });
        const { canvas, escala } = await svgTextoParaCanvas(r.svg, r.largura, r.altura, DICA);
        const plano = planejarPdf(r);
        const fatias = fatiasDoPlano(canvas, escala, plano);
        gerarPdfConexoes({ JsPdf, plano, fatias }).save(
            `mapa-origens${sufixoDoMapa(!!ctx.vista)}.pdf`,
        );
    } catch (err) {
        console.error(err);
        alert(err?.message || 'Não foi possível gerar o PDF do mapa.');
    }
}
