// ============================================================
// exportar-conexoes-pdf.js — PDF do relatório de Conexões (entrega 3).
//
// O PDF leva o mesmo desenho do .png (exportar-conexoes-png.js), em
// imagem, fatiado em páginas A4. As fatias só viram a página entre
// blocos (antes de uma seção ou entre cartões), para nenhum cartão ou
// diagrama ser cortado ao meio; um bloco mais alto que a página é o único
// caso de corte seco.
//
// Módulo puro: não toca o DOM. Quem rasteriza o desenho e recorta as
// fatias é render-conexoes.js; a classe do jsPDF vem de fora (na página,
// de window.jspdf; nos testes, de um falso).
// ============================================================

const A4_LARGURA_PT = 595.28;
const A4_ALTURA_PT = 841.89;

export const MARGEM_LATERAL_PT = 28;
export const MARGEM_TOPO_PT = 28;
export const MARGEM_BASE_PT = 40; // deixa espaço para o número da página

// Relatórios largos (diagramas de Ecos grandes) ficam melhores deitados.
export const LARGURA_PAISAGEM_PX = 1000;

export function orientacaoPdf(largura) {
    return largura > LARGURA_PAISAGEM_PX ? 'landscape' : 'portrait';
}

// Divide a altura do desenho em páginas. `quebras` são as alturas onde
// virar a página é seguro; `alturaPagina` é quanto cabe numa página, na
// mesma unidade. Devolve `[{ de, ate }]`, sem lacunas e sem sobreposição.
export function paginarRelatorio(quebras, altura, alturaPagina) {
    if (!(altura > 0) || !(alturaPagina > 0)) return [];
    const pontos = [...new Set(quebras)].filter((q) => q > 0 && q < altura).sort((a, b) => a - b);
    const paginas = [];
    let de = 0;
    while (de < altura) {
        const limite = de + alturaPagina;
        let ate;
        if (limite >= altura) {
            ate = altura;
        } else {
            // A última quebra segura que ainda cabe; sem nenhuma, corte seco.
            ate = limite;
            for (const q of pontos) {
                if (q > de && q <= limite) ate = q;
            }
        }
        paginas.push({ de, ate });
        de = ate;
    }
    return paginas;
}

// Plano do PDF: orientação, escala (pt por px do desenho) e, por página, o
// trecho do desenho (`de` a `ate`, em px) e onde e com que tamanho entra
// na folha (em pt). O desenho nunca é ampliado: só reduzido para caber.
export function planejarPdf({ largura, altura, quebras = [] }) {
    const orientacao = orientacaoPdf(largura);
    const paisagem = orientacao === 'landscape';
    const paginaLargura = paisagem ? A4_ALTURA_PT : A4_LARGURA_PT;
    const paginaAltura = paisagem ? A4_LARGURA_PT : A4_ALTURA_PT;

    const util = paginaLargura - MARGEM_LATERAL_PT * 2;
    const escala = Math.min(1, util / largura);
    const alturaPaginaPx = (paginaAltura - MARGEM_TOPO_PT - MARGEM_BASE_PT) / escala;

    const paginas = paginarRelatorio(quebras, altura, alturaPaginaPx).map(({ de, ate }) => ({
        de,
        ate,
        x: MARGEM_LATERAL_PT,
        y: MARGEM_TOPO_PT,
        largura: largura * escala,
        altura: (ate - de) * escala,
    }));
    return { orientacao, paginaLargura, paginaAltura, escala, paginas };
}

// Monta o documento (ainda não salvo). `fatias` é um dataURL PNG por página
// do plano, na mesma ordem.
export function gerarPdfConexoes({ JsPdf, plano, fatias }) {
    if (!JsPdf) {
        throw new Error(
            'A biblioteca de PDF não carregou (verifique a conexão com a internet). Tente novamente em alguns segundos.',
        );
    }
    if (!plano.paginas.length || fatias.length !== plano.paginas.length) {
        throw new Error('Não foi possível montar as páginas do relatório.');
    }
    const doc = new JsPdf({ orientation: plano.orientacao, unit: 'pt', format: 'a4' });
    const total = plano.paginas.length;
    plano.paginas.forEach((p, i) => {
        if (i > 0) doc.addPage('a4', plano.orientacao);
        doc.addImage(fatias[i], 'PNG', p.x, p.y, p.largura, p.altura);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text(`${i + 1} / ${total}`, plano.paginaLargura / 2, plano.paginaAltura - 20, {
            align: 'center',
        });
    });
    return doc;
}
