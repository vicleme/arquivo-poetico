// Exportação do cadastro de tag clusters (Fase 17, entrega 3).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { garantirEtiqueta } from '../js/etiquetas.js';
import { criarCluster, atribuirEtiquetasAoCluster } from '../js/tag-clusters.js';
import { gerarMarkdownTagClusters } from '../js/exportar-tag-clusters.js';

function montar() {
    const dbRef = { etiquetas: [], tagClusters: [], poemas: [], prosas: [] };
    const oft = garantirEtiqueta(dbRef, 'dominioImagetico', 'Oftalmologia');
    const med = garantirEtiqueta(dbRef, 'dominioImagetico', 'Medicina');
    const astro = garantirEtiqueta(dbRef, 'dominioImagetico', 'Astrologia');
    const amor = garantirEtiqueta(dbRef, 'relacao', 'Amor');
    const premiado = garantirEtiqueta(dbRef, 'outros', 'Premiado');
    dbRef.poemas.push({ id: 1, sinalizacoesDominioImagetico: [oft, med] });
    dbRef.poemas.push({ id: 2, sinalizacoesDominioImagetico: [med], sinalizacoesRelacao: [amor] });
    dbRef.prosas.push({
        id: 3,
        sinalizacoesDominioImagetico: [astro],
        sinalizacoesOutros: [premiado],
    });
    const saude = criarCluster(dbRef, 'Saúde', 'dominioImagetico').cluster;
    atribuirEtiquetasAoCluster(dbRef, [oft, med], saude.id);
    return { dbRef, saude };
}

describe('gerarMarkdownTagClusters', () => {
    it('lista o cluster com as etiquetas e a contagem, e conta o texto uma vez por cluster', () => {
        const { dbRef } = montar();
        const md = gerarMarkdownTagClusters(dbRef);
        assert.match(md, /^# Tag clusters/);
        assert.match(
            md,
            /## Domínio Imagético\n\n### Saúde \(2 textos\)\n\n- Medicina \(2\)\n- Oftalmologia \(1\)/,
        );
    });

    it('mostra as notas quando existem e omite quando vazias', () => {
        const { dbRef, saude } = montar();
        assert.ok(!gerarMarkdownTagClusters(dbRef).includes('**Notas:**'));
        saude.notas = 'tudo que cuida do corpo';
        assert.match(gerarMarkdownTagClusters(dbRef), /\*\*Notas:\*\* tudo que cuida do corpo/);
    });

    it('lista as etiquetas sem cluster da categoria, mais usadas primeiro', () => {
        const { dbRef } = montar();
        garantirEtiqueta(dbRef, 'dominioImagetico', 'Alquimia');
        const md = gerarMarkdownTagClusters(dbRef);
        assert.match(md, /### Etiquetas sem cluster\n\n- Astrologia \(1\)\n- Alquimia \(0\)/);
    });

    it('categoria só com etiquetas, sem cluster, avisa e ainda lista as etiquetas', () => {
        const { dbRef } = montar();
        const md = gerarMarkdownTagClusters(dbRef);
        assert.match(md, /## Relação\n\n_Nenhum tag cluster nesta categoria ainda\._/);
        assert.match(md, /- Amor \(1\)/);
    });

    it('cluster vazio mostra o marcador, e categoria totalmente vazia não aparece', () => {
        const { dbRef } = montar();
        criarCluster(dbRef, 'Vazio', 'tom');
        const md = gerarMarkdownTagClusters(dbRef);
        assert.match(md, /### Vazio \(0 textos\)\n\n- \(nenhuma etiqueta ainda\)/);
        assert.ok(!md.includes('## Sensibilidade'));
        assert.ok(!md.includes('Premiado'));
    });

    it('sem nada cadastrado, avisa isso', () => {
        const md = gerarMarkdownTagClusters({
            etiquetas: [],
            tagClusters: [],
            poemas: [],
            prosas: [],
        });
        assert.match(md, /_Nenhum tag cluster nem etiqueta cadastrados ainda\._/);
    });

    it('as categorias saem em ordem alfabética', () => {
        const { dbRef } = montar();
        garantirEtiqueta(dbRef, 'tom', 'Solar');
        garantirEtiqueta(dbRef, 'estilo', 'Barroco');
        const titulos = [...gerarMarkdownTagClusters(dbRef).matchAll(/^## (.+)$/gm)].map(
            (m) => m[1],
        );
        assert.deepEqual(titulos, ['Domínio Imagético', 'Estilo', 'Relação', 'Tom']);
    });

    it('aninha os subclusters sob o pai (### e ####) e conta a união dos textos', () => {
        const { dbRef, saude } = montar();
        const astro = dbRef.etiquetas.find((e) => e.nome === 'Astrologia');
        const sub = criarCluster(dbRef, 'Céu', 'dominioImagetico', saude.id).cluster;
        atribuirEtiquetasAoCluster(dbRef, [astro.id], sub.id);
        sub.notas = 'o que se olha de longe';
        const md = gerarMarkdownTagClusters(dbRef);
        assert.match(
            md,
            /### Saúde \(3 textos\)\n\n- Medicina \(2\)\n- Oftalmologia \(1\)\n\n#### Céu \(1 texto\)\n\n- Astrologia \(1\)\n\n\*\*Notas:\*\* o que se olha de longe/,
        );
        assert.ok(!/^### Céu/m.test(md));
        assert.ok(!md.includes('### Etiquetas sem cluster\n\n- Astrologia'));
    });

    it('pai só com subclusters não mostra o marcador de vazio, e subcluster vazio mostra', () => {
        const { dbRef } = montar();
        const pai = criarCluster(dbRef, 'Tons', 'tom').cluster;
        criarCluster(dbRef, 'Claros', 'tom', pai.id);
        const md = gerarMarkdownTagClusters(dbRef);
        assert.match(
            md,
            /### Tons \(0 textos\)\n\n#### Claros \(0 textos\)\n\n- \(nenhuma etiqueta ainda\)/,
        );
    });

    it('subcluster com o mesmo nome em dois pais sai sob cada pai', () => {
        const { dbRef } = montar();
        const a = criarCluster(dbRef, 'A', 'tom').cluster;
        const b = criarCluster(dbRef, 'B', 'tom').cluster;
        criarCluster(dbRef, 'Outros', 'tom', a.id);
        criarCluster(dbRef, 'Outros', 'tom', b.id);
        const md = gerarMarkdownTagClusters(dbRef);
        assert.match(
            md,
            /### A \(0 textos\)\n\n#### Outros[\s\S]*### B \(0 textos\)\n\n#### Outros/,
        );
    });
});

describe('gerarMarkdownTagClusters com filtro da aba', () => {
    it('busca leva só o que casa, avisa o filtro e não afirma que não há etiqueta solta', () => {
        const { dbRef } = montar();
        const md = gerarMarkdownTagClusters(dbRef, { busca: 'oftalmo' });
        assert.match(md, /^# Tag clusters\n\n_Filtro: busca “oftalmo”\._/);
        assert.match(md, /### Saúde/);
        assert.ok(!md.includes('Astrologia'));
        assert.ok(!md.includes('Etiquetas sem cluster'));
        assert.ok(!md.includes('Nenhuma: todas'));
    });

    it('filtro de categoria deixa só ela', () => {
        const { dbRef } = montar();
        const md = gerarMarkdownTagClusters(dbRef, { categoria: 'relacao' });
        assert.match(md, /## Relação/);
        assert.ok(!md.includes('Domínio Imagético'));
        assert.match(md, /- Amor \(1\)/);
    });

    it('filtro sem resultado avisa, e sem filtro nada muda', () => {
        const { dbRef } = montar();
        assert.match(
            gerarMarkdownTagClusters(dbRef, { busca: 'zzzz' }),
            /_Nada bate com o filtro\._/,
        );
        assert.equal(gerarMarkdownTagClusters(dbRef, {}), gerarMarkdownTagClusters(dbRef));
    });
});
