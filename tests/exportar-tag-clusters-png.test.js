// Desenho do relatório dos Tag clusters (.png): dados, montagem do SVG e quebras.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { garantirEtiqueta } from '../js/etiquetas.js';
import { criarCluster, atribuirEtiquetasAoCluster } from '../js/tag-clusters.js';
import {
    dadosTagClusters,
    resumoTagClusters,
    montarSvgTagClusters,
    PALETA_TAG_CLUSTERS,
} from '../js/exportar-tag-clusters-png.js';

// Medida falsa: 6 px por caractere, para o teste não depender de canvas.
const medir = (t) => String(t).length * 6;

function montar() {
    const dbRef = { etiquetas: [], tagClusters: [], poemas: [], prosas: [] };
    const oft = garantirEtiqueta(dbRef, 'dominioImagetico', 'Oftalmologia');
    const med = garantirEtiqueta(dbRef, 'dominioImagetico', 'Medicina');
    const astro = garantirEtiqueta(dbRef, 'dominioImagetico', 'Astrologia');
    const alq = garantirEtiqueta(dbRef, 'dominioImagetico', 'Alquimia');
    const amor = garantirEtiqueta(dbRef, 'relacao', 'Amor');
    dbRef.poemas.push({ id: 1, sinalizacoesDominioImagetico: [oft, med] });
    dbRef.poemas.push({ id: 2, sinalizacoesDominioImagetico: [med], sinalizacoesRelacao: [amor] });
    dbRef.prosas.push({ id: 3, sinalizacoesDominioImagetico: [astro] });
    const saude = criarCluster(dbRef, 'Saúde', 'dominioImagetico').cluster;
    atribuirEtiquetasAoCluster(dbRef, [med], saude.id);
    const olhos = criarCluster(dbRef, 'Olhos', 'dominioImagetico', saude.id).cluster;
    atribuirEtiquetasAoCluster(dbRef, [oft], olhos.id);
    return { dbRef, saude, olhos, astro, alq, amor };
}

describe('dadosTagClusters', () => {
    it('agrupa por categoria em ordem alfabética, com subclusters dentro do pai', () => {
        const { dbRef } = montar();
        const dados = dadosTagClusters(dbRef);
        assert.deepEqual(
            dados.categorias.map((c) => c.categoria),
            ['dominioImagetico', 'relacao'],
        );
        const saude = dados.categorias[0].clusters[0];
        assert.equal(saude.nome, 'Saúde');
        assert.deepEqual(saude.etiquetas, [{ nome: 'Medicina', textos: 2 }]);
        assert.equal(saude.subs.length, 1);
        assert.equal(saude.subs[0].nome, 'Olhos');
        assert.deepEqual(saude.subs[0].etiquetas, [{ nome: 'Oftalmologia', textos: 1 }]);
        // O pai conta as etiquetas dele e as do subcluster, e os textos pela união.
        assert.equal(saude.totalEtiquetas, 2);
        assert.equal(saude.totalTextos, 2);
    });

    it('lista as etiquetas sem cluster, mais usadas primeiro', () => {
        const { dbRef } = montar();
        const soltas = dadosTagClusters(dbRef).categorias[0].soltas.map((e) => e.nome);
        assert.deepEqual(soltas, ['Astrologia', 'Alquimia']);
    });

    it('categoria sem cluster nem etiqueta não aparece, e o resumo conta tudo', () => {
        const { dbRef } = montar();
        const dados = dadosTagClusters(dbRef);
        assert.ok(!dados.categorias.some((c) => c.categoria === 'tom'));
        assert.equal(dados.totalClusters, 2);
        assert.equal(dados.totalSoltas, 3);
        assert.equal(resumoTagClusters(dados), '2 tag clusters · 3 etiquetas sem cluster');
        assert.equal(
            resumoTagClusters({ totalClusters: 1, totalSoltas: 1 }),
            '1 tag cluster · 1 etiqueta sem cluster',
        );
    });
});

describe('montarSvgTagClusters', () => {
    it('devolve um SVG com as dimensões declaradas e o fundo do tema', () => {
        const { dbRef } = montar();
        const r = montarSvgTagClusters({ dados: dadosTagClusters(dbRef), medir });
        assert.match(r.svg, /^<svg [^>]*width="840" height="\d+"/);
        assert.equal(r.largura, 840);
        assert.ok(r.altura > 100);
        assert.ok(r.svg.includes(`fill="${PALETA_TAG_CLUSTERS.claro.fundo}"`));
        const escuro = montarSvgTagClusters({
            dados: dadosTagClusters(dbRef),
            paleta: PALETA_TAG_CLUSTERS.escuro,
            medir,
        });
        assert.ok(escuro.svg.includes(`fill="${PALETA_TAG_CLUSTERS.escuro.fundo}"`));
    });

    it('leva título, categorias, clusters, subcluster, etiquetas e a seção das soltas', () => {
        const { dbRef } = montar();
        const { svg } = montarSvgTagClusters({ dados: dadosTagClusters(dbRef), medir });
        for (const trecho of [
            'Tag clusters',
            '2 tag clusters · 3 etiquetas sem cluster',
            'DOMÍNIO IMAGÉTICO',
            'Saúde',
            'Olhos',
            '2 etiquetas · 1 subcluster · aparece em 2 textos',
            'Medicina · 2',
            'Oftalmologia · 1',
            'Etiquetas sem cluster',
            'Alquimia',
        ]) {
            assert.ok(svg.includes(trecho), `faltou: ${trecho}`);
        }
    });

    it('etiqueta sem texto fica cinza e em itálico, a usada fica verde', () => {
        const { dbRef } = montar();
        const { svg } = montarSvgTagClusters({ dados: dadosTagClusters(dbRef), medir });
        assert.ok(svg.includes(PALETA_TAG_CLUSTERS.claro.chipUsadaFundo));
        assert.match(svg, /font: italic 400 10px[^"]*;" fill="#9ca3af">Alquimia</);
    });

    it('escapa caracteres especiais do nome e da nota', () => {
        const { dbRef, saude } = montar();
        saude.nome = 'A & B <c>';
        saude.notas = 'dizem "x" e \'y\'';
        const { svg } = montarSvgTagClusters({ dados: dadosTagClusters(dbRef), medir });
        assert.ok(svg.includes('A &amp; B &lt;c&gt;'));
        assert.ok(svg.includes('dizem &quot;x&quot; e &#39;y&#39;'));
        assert.ok(!svg.includes('<c>'));
    });

    it('a nota inteira entra, quebrada em linhas que cabem no cartão', () => {
        const { dbRef, saude } = montar();
        saude.notas = Array.from({ length: 40 }, (_, i) => `palavra${i}`).join(' ');
        const { svg } = montarSvgTagClusters({ dados: dadosTagClusters(dbRef), medir });
        assert.ok(svg.includes('palavra0'));
        assert.ok(svg.includes('palavra39'));
        // Nenhuma linha de nota passa da largura útil do cartão (coluna 398 px - 28 de margem).
        const linhas = [...svg.matchAll(/font: 400 11px[^"]*;" fill="#6b7280">([^<]+)</g)];
        assert.ok(linhas.length > 1);
        linhas.forEach(([, t]) => assert.ok(medir(t) <= 370, `linha larga: ${t}`));
    });

    it('chips que não cabem numa linha quebram para a seguinte', () => {
        const { dbRef, saude } = montar();
        const muitas = Array.from({ length: 30 }, (_, i) =>
            garantirEtiqueta(dbRef, 'dominioImagetico', `Etiqueta numero ${i}`),
        );
        atribuirEtiquetasAoCluster(dbRef, muitas, saude.id);
        const curto = montarSvgTagClusters({ dados: dadosTagClusters(montar().dbRef), medir });
        const longo = montarSvgTagClusters({ dados: dadosTagClusters(dbRef), medir });
        assert.ok(longo.altura > curto.altura + 60);
    });

    it('título gigante é quebrado e cortado, sem estourar a largura', () => {
        const { dbRef, saude } = montar();
        saude.nome = 'x'.repeat(400);
        const { svg } = montarSvgTagClusters({ dados: dadosTagClusters(dbRef), medir });
        assert.ok(svg.includes('…'));
        assert.ok(!svg.includes('x'.repeat(100)));
    });

    it('cluster sem etiqueta avisa, com e sem subcluster', () => {
        const dbRef = { etiquetas: [], tagClusters: [], poemas: [], prosas: [] };
        const vazio = criarCluster(dbRef, 'Vazio', 'tom').cluster;
        const pai = criarCluster(dbRef, 'Pai', 'tom').cluster;
        criarCluster(dbRef, 'Filho', 'tom', pai.id);
        const { svg } = montarSvgTagClusters({ dados: dadosTagClusters(dbRef), medir });
        assert.ok(vazio.id);
        assert.ok(svg.includes('Nenhuma etiqueta ainda.'));
        assert.ok(svg.includes('Nenhuma etiqueta direto neste cluster.'));
    });

    it('cadastro vazio desenha só o título e o aviso', () => {
        const dbRef = { etiquetas: [], tagClusters: [], poemas: [], prosas: [] };
        const r = montarSvgTagClusters({ dados: dadosTagClusters(dbRef), medir });
        assert.ok(r.svg.includes('Nenhum tag cluster nem etiqueta cadastrados ainda.'));
        assert.deepEqual(r.quebras, []);
    });

    it('as quebras ficam antes das seções e entre fileiras, nunca depois do título', () => {
        const { dbRef } = montar();
        const dados = dadosTagClusters(dbRef);
        // Três clusters de topo na mesma categoria: duas fileiras de cartões.
        criarCluster(dbRef, 'Outro', 'dominioImagetico');
        criarCluster(dbRef, 'Mais um', 'dominioImagetico');
        const r = montarSvgTagClusters({ dados: dadosTagClusters(dbRef), medir });
        const base = montarSvgTagClusters({ dados: dados, medir });
        assert.ok(r.quebras.length > base.quebras.length);
        const ordenadas = [...r.quebras].sort((a, b) => a - b);
        assert.deepEqual(r.quebras, ordenadas);
        assert.ok(r.quebras.every((q) => q > 0 && q < r.altura));
        // A primeira quebra é a da primeira categoria, abaixo do título e do resumo.
        assert.ok(r.quebras[0] >= 56);
    });
});

describe('filtro da aba nas exportações', () => {
    it('busca por etiqueta de um subcluster leva o pai com só o subcluster que casa', () => {
        const { dbRef } = montar();
        const dados = dadosTagClusters(dbRef, { busca: 'oftalmo' });
        const saude = dados.categorias[0].clusters[0];
        assert.equal(saude.nome, 'Saúde');
        assert.deepEqual(
            saude.subs.map((s) => s.nome),
            ['Olhos'],
        );
        assert.equal(dados.categorias.length, 1);
        assert.equal(dados.totalSoltas, 0);
        assert.equal(dados.filtro, 'busca “oftalmo”');
    });

    it('filtro de categoria tira as outras categorias, clusters e soltas', () => {
        const { dbRef } = montar();
        const dados = dadosTagClusters(dbRef, { categoria: 'relacao' });
        assert.deepEqual(
            dados.categorias.map((c) => c.categoria),
            ['relacao'],
        );
        assert.equal(dados.totalClusters, 0);
        assert.equal(dados.totalSoltas, 1);
        assert.equal(dados.filtro, 'categoria Relação');
    });

    it('sem filtro o cadastro sai inteiro e sem a linha de filtro no desenho', () => {
        const { dbRef } = montar();
        const dados = dadosTagClusters(dbRef, {});
        assert.equal(dados.filtro, '');
        const { svg } = montarSvgTagClusters({ dados, medir });
        assert.ok(!svg.includes('Filtro:'));
    });

    it('com filtro, o desenho diz qual foi, em itálico, abaixo do resumo', () => {
        const { dbRef } = montar();
        const dados = dadosTagClusters(dbRef, { busca: 'med', categoria: 'dominioImagetico' });
        const { svg } = montarSvgTagClusters({ dados, medir });
        assert.ok(svg.includes('Filtro: busca “med” · categoria Domínio Imagético'));
        assert.match(svg, /font-style="italic">Filtro:/);
    });

    it('filtro que não casa com nada desenha só o aviso', () => {
        const { dbRef } = montar();
        const dados = dadosTagClusters(dbRef, { busca: 'zzzz' });
        assert.equal(dados.categorias.length, 0);
        const { svg } = montarSvgTagClusters({ dados, medir });
        assert.ok(svg.includes('Nenhum tag cluster nem etiqueta cadastrados ainda.'));
    });
});
