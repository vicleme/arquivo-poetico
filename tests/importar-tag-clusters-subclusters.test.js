// Importação por lista colada com subclusters (Fase 17b, entrega 2):
// linha "Cluster > Subcluster: etiqueta, etiqueta".
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { garantirEtiqueta } from '../js/etiquetas.js';
import { lerListaDeClusters, importarTagClusters } from '../js/importar-tag-clusters.js';
import {
    criarCluster,
    atribuirEtiquetasAoCluster,
    clusterDaEtiqueta,
    subclustersDoCluster,
    clustersDeTopoDaCategoria,
    caminhoDoCluster,
} from '../js/tag-clusters.js';

function montar() {
    const dbRef = { etiquetas: [], tagClusters: [], poemas: [], prosas: [] };
    const ids = {};
    ['Anáfora', 'Poliptoto', 'Paralelismo', 'Gradação', 'Quiasmo'].forEach((n) => {
        ids[n] = garantirEtiqueta(dbRef, 'estilo', n);
    });
    return { dbRef, ids };
}

describe('lerListaDeClusters com ">"', () => {
    it('separa pai e subcluster e mantém o nome da folha em `cluster`', () => {
        const { itens, avisos } = lerListaDeClusters(
            'Repetição > Termos: Anáfora, Poliptoto\nSolto: Gradação',
            'estilo',
        );
        assert.equal(avisos.length, 0);
        assert.equal(itens[0].pai, 'Repetição');
        assert.equal(itens[0].cluster, 'Termos');
        assert.deepEqual(itens[0].nomes, ['Anáfora', 'Poliptoto']);
        assert.equal(itens[1].pai, null);
        assert.equal(itens[1].cluster, 'Solto');
    });

    it('avisa de terceiro nível e de nome vazio ao redor do ">"', () => {
        const { itens, avisos } = lerListaDeClusters(
            'A > B > C: x\n> B: x\nA > : x\nA >B: x',
            'estilo',
        );
        assert.deepEqual(
            avisos.map((a) => a.motivo),
            ['nivel-maximo', 'sem-nome-de-cluster', 'sem-nome-de-cluster'],
        );
        assert.equal(itens.length, 1);
        assert.equal(itens[0].pai, 'A');
    });
});

describe('importarTagClusters com subclusters', () => {
    it('cria o pai que falta, cria o subcluster e coloca as etiquetas nele', () => {
        const { dbRef, ids } = montar();
        const r = importarTagClusters(
            dbRef,
            'Repetição e paralelismo > Repetição de termos: Anáfora, Poliptoto',
            'estilo',
        );
        assert.equal(r.ok, true);
        assert.equal(r.criados, 2);
        assert.equal(r.subclustersCriados, 1);
        assert.equal(r.etiquetasColocadas, 2);
        const [pai] = clustersDeTopoDaCategoria(dbRef, 'estilo');
        assert.equal(pai.nome, 'Repetição e paralelismo');
        const [sub] = subclustersDoCluster(dbRef, pai.id);
        assert.equal(sub.nome, 'Repetição de termos');
        assert.equal(clusterDaEtiqueta(dbRef, ids['Anáfora']).id, sub.id);
    });

    it('reaproveita o pai e o subcluster que já existem', () => {
        const { dbRef, ids } = montar();
        const pai = criarCluster(dbRef, 'Repetição', 'estilo').cluster;
        const sub = criarCluster(dbRef, 'Termos', 'estilo', pai.id).cluster;
        const r = importarTagClusters(dbRef, 'repeticao > TERMOS: Anáfora', 'estilo');
        assert.equal(r.criados, 0);
        assert.equal(r.reaproveitados, 1);
        assert.equal(clusterDaEtiqueta(dbRef, ids['Anáfora']).id, sub.id);
    });

    it('aceita o mesmo nome de subcluster em pais diferentes', () => {
        const { dbRef } = montar();
        const r = importarTagClusters(
            dbRef,
            'Tipografia > Outros: Gradação\nJogos de palavras > Outros: Quiasmo',
            'estilo',
        );
        assert.equal(r.avisos.length, 0);
        assert.equal(r.subclustersCriados, 2);
        const outros = dbRef.tagClusters.filter((c) => c.nome === 'Outros');
        assert.equal(outros.length, 2);
        assert.notEqual(outros[0].paiId, outros[1].paiId);
    });

    it('recusa subcluster com o nome de um cluster de topo, sem criar nada', () => {
        const { dbRef } = montar();
        criarCluster(dbRef, 'Ritmo', 'estilo');
        const r = importarTagClusters(dbRef, 'Tipografia > Ritmo: Gradação', 'estilo');
        assert.deepEqual(
            r.avisos.map((a) => a.motivo),
            ['subcluster-nome-de-topo'],
        );
        assert.equal(r.subclustersCriados, 0);
        assert.equal(r.etiquetasColocadas, 0);
    });

    it('recusa pai que já é subcluster e nome solto que só existe como subcluster', () => {
        const { dbRef } = montar();
        const pai = criarCluster(dbRef, 'Repetição', 'estilo').cluster;
        criarCluster(dbRef, 'Termos', 'estilo', pai.id);
        const r = importarTagClusters(dbRef, 'Termos > Fino: Gradação\nTermos: Quiasmo', 'estilo');
        assert.deepEqual(
            r.avisos.map((a) => a.motivo),
            ['pai-e-subcluster', 'nome-e-subcluster'],
        );
        assert.equal(r.criados, 0);
        assert.equal(r.etiquetasColocadas, 0);
    });

    it('avisos de repetida e de movida usam o caminho "Pai > Sub"', () => {
        const { dbRef, ids } = montar();
        const a = criarCluster(dbRef, 'Antigo', 'estilo').cluster;
        atribuirEtiquetasAoCluster(dbRef, [ids['Paralelismo']], a.id);
        const r = importarTagClusters(
            dbRef,
            'P1 > S: Anáfora, Paralelismo\nP2 > S: Anáfora',
            'estilo',
        );
        assert.deepEqual(r.movidas, [{ nome: 'Paralelismo', de: 'Antigo', para: 'P1 > S' }]);
        assert.deepEqual(r.repetidas, [
            { nome: 'Anáfora', categoria: 'estilo', de: 'P1 > S', para: 'P2 > S' },
        ]);
        assert.equal(caminhoDoCluster(dbRef, clusterDaEtiqueta(dbRef, ids['Anáfora'])), 'P2 > S');
    });

    it('etiqueta não achada cita o caminho e nada é criado para ela', () => {
        const { dbRef } = montar();
        const r = importarTagClusters(dbRef, 'P > S: Inexistente', 'estilo');
        assert.deepEqual(r.naoAchadas, [
            { cluster: 'P > S', nome: 'Inexistente', categoria: 'estilo' },
        ]);
        assert.equal(dbRef.etiquetas.length, 5);
    });

    it('desfazer remove subclusters, pais criados e as etiquetas colocadas', () => {
        const { dbRef, ids } = montar();
        const r = importarTagClusters(dbRef, 'P > S: Anáfora, Gradação\nOutro: Quiasmo', 'estilo');
        assert.equal(dbRef.tagClusters.length, 3);
        r.desfazer();
        assert.equal(dbRef.tagClusters.length, 0);
        assert.equal(clusterDaEtiqueta(dbRef, ids['Anáfora']), null);
        assert.equal(clusterDaEtiqueta(dbRef, ids['Quiasmo']), null);
    });

    it('linha só com o caminho (sem etiquetas) cria a estrutura vazia', () => {
        const { dbRef } = montar();
        const r = importarTagClusters(dbRef, 'P > S:', 'estilo');
        assert.equal(r.ok, true);
        assert.equal(r.criados, 2);
        assert.equal(r.etiquetasColocadas, 0);
    });
});
