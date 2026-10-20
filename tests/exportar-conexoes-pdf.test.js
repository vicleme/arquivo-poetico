// PDF do relatório de Conexões: paginação, plano de páginas e montagem do documento.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { criarConstrutorJsPdfFalso } from './helpers/jspdf-shim.js';
import {
    paginarRelatorio,
    planejarPdf,
    gerarPdfConexoes,
    orientacaoPdf,
    MARGEM_LATERAL_PT,
    MARGEM_TOPO_PT,
    MARGEM_BASE_PT,
} from '../js/exportar-conexoes-pdf.js';

describe('paginarRelatorio', () => {
    it('cabendo numa página só, devolve uma página', () => {
        assert.deepEqual(paginarRelatorio([100, 200], 500, 1000), [{ de: 0, ate: 500 }]);
    });

    it('vira a página na última quebra segura que cabe', () => {
        const paginas = paginarRelatorio([300, 600, 900], 1200, 700);
        assert.deepEqual(paginas, [
            { de: 0, ate: 600 },
            { de: 600, ate: 1200 },
        ]);
    });

    it('as páginas cobrem o desenho todo, sem lacuna nem sobreposição', () => {
        const paginas = paginarRelatorio([250, 500, 750, 1000, 1250], 1500, 600);
        assert.equal(paginas[0].de, 0);
        assert.equal(paginas.at(-1).ate, 1500);
        paginas.slice(1).forEach((p, i) => assert.equal(p.de, paginas[i].ate));
        assert.ok(paginas.every((p) => p.ate - p.de <= 600));
    });

    it('bloco mais alto que a página sofre corte seco, e o resto segue normal', () => {
        // Entre 100 e 1000 não há quebra segura: cortes secos de 400 em 400.
        // O último trecho (900 a 1300) cabe inteiro, então não precisa virar em 1000.
        const paginas = paginarRelatorio([100, 1000], 1300, 400);
        assert.deepEqual(paginas, [
            { de: 0, ate: 100 },
            { de: 100, ate: 500 },
            { de: 500, ate: 900 },
            { de: 900, ate: 1300 },
        ]);
    });

    it('sem quebras nenhuma, corta no limite de cada página', () => {
        assert.deepEqual(paginarRelatorio([], 1000, 400), [
            { de: 0, ate: 400 },
            { de: 400, ate: 800 },
            { de: 800, ate: 1000 },
        ]);
    });

    it('ignora quebras repetidas, fora do desenho ou no começo', () => {
        assert.deepEqual(paginarRelatorio([0, 500, 500, 5000, -3], 900, 600), [
            { de: 0, ate: 500 },
            { de: 500, ate: 900 },
        ]);
    });

    it('medidas inválidas não geram página', () => {
        assert.deepEqual(paginarRelatorio([], 0, 100), []);
        assert.deepEqual(paginarRelatorio([], 100, 0), []);
    });
});

describe('planejarPdf', () => {
    it('relatório de largura normal sai em retrato, reduzido para caber na largura útil', () => {
        const plano = planejarPdf({ largura: 760, altura: 500, quebras: [] });
        assert.equal(plano.orientacao, 'portrait');
        assert.ok(plano.escala < 1);
        const p = plano.paginas[0];
        assert.ok(Math.abs(p.largura - (plano.paginaLargura - MARGEM_LATERAL_PT * 2)) < 1e-6);
        assert.equal(p.x, MARGEM_LATERAL_PT);
        assert.equal(p.y, MARGEM_TOPO_PT);
    });

    it('relatório estreito não é ampliado', () => {
        const plano = planejarPdf({ largura: 300, altura: 200 });
        assert.equal(plano.escala, 1);
        assert.equal(plano.paginas[0].largura, 300);
    });

    it('relatório muito largo vai para paisagem', () => {
        assert.equal(orientacaoPdf(1000), 'portrait');
        assert.equal(orientacaoPdf(1001), 'landscape');
        const plano = planejarPdf({ largura: 1500, altura: 400 });
        assert.equal(plano.orientacao, 'landscape');
        assert.ok(plano.paginaLargura > plano.paginaAltura);
    });

    it('cada página cabe na folha, entre as margens de topo e de base', () => {
        const plano = planejarPdf({
            largura: 760,
            altura: 6000,
            quebras: [800, 1600, 2400, 3200, 4000, 4800, 5600],
        });
        assert.ok(plano.paginas.length > 1);
        for (const p of plano.paginas) {
            assert.ok(p.y + p.altura <= plano.paginaAltura - MARGEM_BASE_PT + 1e-6);
        }
        const soma = plano.paginas.reduce((s, p) => s + (p.ate - p.de), 0);
        assert.equal(soma, 6000);
    });
});

describe('gerarPdfConexoes', () => {
    const JsPdf = criarConstrutorJsPdfFalso();
    const plano = planejarPdf({ largura: 760, altura: 2400, quebras: [700, 1400, 2000] });
    const fatias = plano.paginas.map((_, i) => `data:image/png;base64,PAGINA${i}`);

    it('uma imagem por página, com o recorte e a posição do plano', () => {
        const doc = gerarPdfConexoes({ JsPdf, plano, fatias });
        const imagens = doc.chamadas.filter((c) => c.tipo === 'addImage');
        assert.equal(imagens.length, plano.paginas.length);
        imagens.forEach((img, i) => {
            assert.equal(img.dados, fatias[i]);
            assert.equal(img.formato, 'PNG');
            assert.equal(img.x, plano.paginas[i].x);
            assert.equal(img.largura, plano.paginas[i].largura);
            assert.equal(img.altura, plano.paginas[i].altura);
        });
    });

    it('adiciona uma página a cada fatia depois da primeira, na orientação do plano', () => {
        const doc = gerarPdfConexoes({ JsPdf, plano, fatias });
        assert.equal(doc.opcoes.orientation, plano.orientacao);
        assert.equal(
            doc.chamadas.filter((c) => c.tipo === 'addPage').length,
            plano.paginas.length - 1,
        );
    });

    it('numera as páginas "n / total"', () => {
        const doc = gerarPdfConexoes({ JsPdf, plano, fatias });
        const numeros = doc.chamadas.filter((c) => c.tipo === 'text').map((c) => c.texto);
        const total = plano.paginas.length;
        assert.deepEqual(
            numeros,
            plano.paginas.map((_, i) => `${i + 1} / ${total}`),
        );
    });

    it('sem a biblioteca de PDF, explica o que houve', () => {
        assert.throws(() => gerarPdfConexoes({ JsPdf: null, plano, fatias }), /biblioteca de PDF/);
    });

    it('quantidade de fatias diferente da de páginas é recusada', () => {
        assert.throws(() => gerarPdfConexoes({ JsPdf, plano, fatias: fatias.slice(1) }));
    });
});
