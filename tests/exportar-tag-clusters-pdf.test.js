// PDF do relatório dos Tag clusters: plano de páginas sobre o desenho real
// (as quebras vêm de montarSvgTagClusters) e o roteamento do botão.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { garantirEtiqueta } from '../js/etiquetas.js';
import { criarCluster, atribuirEtiquetasAoCluster } from '../js/tag-clusters.js';
import { dadosTagClusters, montarSvgTagClusters } from '../js/exportar-tag-clusters-png.js';
import { planejarPdf, gerarPdfConexoes } from '../js/exportar-conexoes-pdf.js';
import { criarConstrutorJsPdfFalso } from './helpers/jspdf-shim.js';

const medir = (t) => String(t).length * 6;

// 40 clusters de Tom, cada um com 12 etiquetas: o relatório passa de uma página.
function dbGrande() {
    const dbRef = { etiquetas: [], tagClusters: [], poemas: [], prosas: [] };
    for (let i = 0; i < 40; i++) {
        const c = criarCluster(dbRef, `Cluster ${i}`, 'tom').cluster;
        const ids = Array.from({ length: 12 }, (_, j) =>
            garantirEtiqueta(dbRef, 'tom', `Etiqueta ${i}-${j}`),
        );
        atribuirEtiquetasAoCluster(dbRef, ids, c.id);
    }
    return dbRef;
}

describe('plano do PDF dos Tag clusters', () => {
    it('divide em várias páginas A4 retrato, só em quebras seguras', () => {
        const relatorio = montarSvgTagClusters({
            dados: dadosTagClusters(dbGrande()),
            medir,
        });
        const plano = planejarPdf(relatorio);
        assert.equal(plano.orientacao, 'portrait');
        assert.ok(plano.paginas.length > 1);
        const seguras = new Set([0, relatorio.altura, ...relatorio.quebras]);
        plano.paginas.forEach((p) => assert.ok(seguras.has(p.ate), `corte seco em ${p.ate}`));
        assert.equal(plano.paginas.at(-1).ate, relatorio.altura);
    });

    it('gera um documento com uma imagem e um número por página', () => {
        const relatorio = montarSvgTagClusters({
            dados: dadosTagClusters(dbGrande()),
            medir,
        });
        const plano = planejarPdf(relatorio);
        const fatias = plano.paginas.map((_, i) => `data:image/png;base64,P${i}`);
        const JsPdf = criarConstrutorJsPdfFalso();
        const doc = gerarPdfConexoes({ JsPdf, plano, fatias });
        const imagens = doc.chamadas.filter((c) => c.tipo === 'addImage');
        assert.equal(imagens.length, plano.paginas.length);
    });
});
