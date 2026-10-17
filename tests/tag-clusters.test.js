// Tag clusters (Fase 17, entrega 1). Lógica pura de js/tag-clusters.js e os
// efeitos em Mover de categoria e Mesclar (js/etiquetas.js).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { garantirEtiqueta, mesclarEtiquetas, moverEtiquetaDeCategoria } from '../js/etiquetas.js';
import {
    CATEGORIAS_COM_CLUSTER,
    categoriaAceitaCluster,
    sincronizarTagClusters,
    clusterDaEtiqueta,
    clustersDaCategoria,
    etiquetasDoCluster,
    etiquetasSemCluster,
    textosDoCluster,
    contarTextosPorCluster,
    criarCluster,
    editarCluster,
    excluirCluster,
    atribuirEtiquetasAoCluster,
} from '../js/tag-clusters.js';

function montar() {
    const dbRef = { etiquetas: [], tagClusters: [], poemas: [], prosas: [] };
    const oft = garantirEtiqueta(dbRef, 'dominioImagetico', 'Oftalmologia');
    const med = garantirEtiqueta(dbRef, 'dominioImagetico', 'Medicina');
    const enf = garantirEtiqueta(dbRef, 'dominioImagetico', 'Enfermagem');
    const astro = garantirEtiqueta(dbRef, 'dominioImagetico', 'Astrologia');
    const melan = garantirEtiqueta(dbRef, 'tom', 'Melancólico');
    const premiado = garantirEtiqueta(dbRef, 'outros', 'Premiado');
    dbRef.poemas.push({ id: 1, sinalizacoesDominioImagetico: [oft, med] });
    dbRef.poemas.push({ id: 2, sinalizacoesDominioImagetico: [enf], sinalizacoesTom: [melan] });
    dbRef.prosas.push({ id: 3, sinalizacoesDominioImagetico: [astro] });
    return { dbRef, oft, med, enf, astro, melan, premiado };
}

describe('Tag clusters: categorias', () => {
    it('Domínio Imagético, Tom, Tradição, Estilo, Relação e Sensibilidade aceitam cluster', () => {
        assert.deepEqual(CATEGORIAS_COM_CLUSTER, [
            'dominioImagetico',
            'tom',
            'tradicao',
            'estilo',
            'relacao',
            'sensibilidade',
        ]);
        assert.equal(categoriaAceitaCluster('outros'), false);
        assert.equal(categoriaAceitaCluster('relacao'), true);
        assert.equal(categoriaAceitaCluster('sensibilidade'), true);
        assert.equal(categoriaAceitaCluster('tom'), true);
    });
});

describe('Tag clusters: criar, editar, excluir', () => {
    it('cria cluster e recusa vazio, categoria sem cluster e nome repetido', () => {
        const { dbRef } = montar();
        const r = criarCluster(dbRef, '  Saúde ', 'dominioImagetico');
        assert.equal(r.ok, true);
        assert.equal(r.cluster.nome, 'Saúde');
        assert.equal(criarCluster(dbRef, '', 'tom').motivo, 'vazio');
        assert.equal(criarCluster(dbRef, 'X', 'outros').motivo, 'categoria-invalida');
        assert.equal(criarCluster(dbRef, 'saude', 'dominioImagetico').motivo, 'duplicado');
        // mesmo nome em outra categoria é permitido
        assert.equal(criarCluster(dbRef, 'Saúde', 'tom').ok, true);
    });

    it('desfazer criar remove o cluster', () => {
        const { dbRef } = montar();
        const r = criarCluster(dbRef, 'Saúde', 'tom');
        r.desfazer();
        assert.equal(dbRef.tagClusters.length, 0);
    });

    it('edita nome e nota, recusa nome de outro cluster, e desfaz', () => {
        const { dbRef } = montar();
        const a = criarCluster(dbRef, 'A', 'tom').cluster;
        const b = criarCluster(dbRef, 'B', 'tom').cluster;
        assert.equal(editarCluster(dbRef, b.id, { nome: 'a' }).motivo, 'duplicado');
        assert.equal(editarCluster(dbRef, b.id, { nome: ' ' }).motivo, 'vazio');
        const r = editarCluster(dbRef, a.id, { nome: 'Novo', notas: 'nota' });
        assert.equal(a.nome, 'Novo');
        assert.equal(a.notas, 'nota');
        r.desfazer();
        assert.equal(a.nome, 'A');
        assert.equal(a.notas, '');
        // mudar só a caixa do próprio nome é permitido
        assert.equal(editarCluster(dbRef, a.id, { nome: 'a' }).ok, true);
    });

    it('excluir solta as etiquetas, não mexe em texto, e desfaz', () => {
        const { dbRef, oft, med } = montar();
        const c = criarCluster(dbRef, 'Saúde', 'dominioImagetico').cluster;
        atribuirEtiquetasAoCluster(dbRef, [oft, med], c.id);
        const textosAntes = JSON.stringify(dbRef.poemas);
        const r = excluirCluster(dbRef, c.id);
        assert.equal(r.ok, true);
        assert.equal(r.etiquetas, 2);
        assert.equal(dbRef.tagClusters.length, 0);
        assert.ok(dbRef.etiquetas.every((e) => e.clusterId === undefined));
        assert.equal(JSON.stringify(dbRef.poemas), textosAntes);
        r.desfazer();
        assert.equal(dbRef.tagClusters.length, 1);
        assert.equal(etiquetasDoCluster(dbRef, c.id).length, 2);
        assert.equal(excluirCluster(dbRef, 99999).motivo, 'inexistente');
    });
});

describe('Tag clusters: atribuir etiquetas', () => {
    it('atribui, troca de cluster e solta, com Desfazer', () => {
        const { dbRef, oft, med } = montar();
        const saude = criarCluster(dbRef, 'Saúde', 'dominioImagetico').cluster;
        const corpo = criarCluster(dbRef, 'Corpo', 'dominioImagetico').cluster;
        const r1 = atribuirEtiquetasAoCluster(dbRef, [oft, med], saude.id);
        assert.equal(r1.etiquetas, 2);
        assert.equal(clusterDaEtiqueta(dbRef, oft).id, saude.id);

        const r2 = atribuirEtiquetasAoCluster(dbRef, [oft], corpo.id);
        assert.equal(r2.etiquetas, 1);
        assert.equal(clusterDaEtiqueta(dbRef, oft).id, corpo.id);
        r2.desfazer();
        assert.equal(clusterDaEtiqueta(dbRef, oft).id, saude.id);

        const r3 = atribuirEtiquetasAoCluster(dbRef, [oft], null);
        assert.equal(clusterDaEtiqueta(dbRef, oft), null);
        r3.desfazer();
        assert.equal(clusterDaEtiqueta(dbRef, oft).id, saude.id);
    });

    it('já estar no cluster não conta como mudança', () => {
        const { dbRef, oft } = montar();
        const c = criarCluster(dbRef, 'Saúde', 'dominioImagetico').cluster;
        atribuirEtiquetasAoCluster(dbRef, [oft], c.id);
        assert.equal(atribuirEtiquetasAoCluster(dbRef, [oft], c.id).etiquetas, 0);
    });

    it('recusa categoria diferente e Outros, sem mudar nada', () => {
        const { dbRef, oft, melan, premiado } = montar();
        const c = criarCluster(dbRef, 'Saúde', 'dominioImagetico').cluster;
        const r = atribuirEtiquetasAoCluster(dbRef, [oft, melan], c.id);
        assert.equal(r.ok, false);
        assert.equal(r.motivo, 'categoria-diferente');
        assert.equal(clusterDaEtiqueta(dbRef, oft), null);
        assert.equal(
            atribuirEtiquetasAoCluster(dbRef, [premiado], null).motivo,
            'categoria-invalida',
        );
        assert.equal(atribuirEtiquetasAoCluster(dbRef, [oft], 12345).motivo, 'cluster-inexistente');
        assert.equal(atribuirEtiquetasAoCluster(dbRef, [777], c.id).motivo, 'etiqueta-inexistente');
    });
});

describe('Tag clusters: consultas', () => {
    it('etiquetas sem cluster ignoram categorias sem cluster e filtram por categoria', () => {
        const { dbRef, oft, med, enf, astro, melan, premiado } = montar();
        const c = criarCluster(dbRef, 'Saúde', 'dominioImagetico').cluster;
        atribuirEtiquetasAoCluster(dbRef, [oft, med], c.id);
        const ids = etiquetasSemCluster(dbRef).map((e) => e.id);
        assert.deepEqual(new Set(ids), new Set([enf, astro, melan]));
        assert.ok(!ids.includes(premiado));
        assert.deepEqual(
            etiquetasSemCluster(dbRef, 'tom').map((e) => e.id),
            [melan],
        );
    });

    it('clustersDaCategoria vem em ordem alfabética', () => {
        const { dbRef } = montar();
        criarCluster(dbRef, 'Zoologia', 'tom');
        criarCluster(dbRef, 'Ágil', 'tom');
        criarCluster(dbRef, 'Outro', 'estilo');
        assert.deepEqual(
            clustersDaCategoria(dbRef, 'tom').map((c) => c.nome),
            ['Ágil', 'Zoologia'],
        );
    });

    it('conta o texto uma vez por cluster, mesmo com duas etiquetas do cluster', () => {
        const { dbRef, oft, med, enf } = montar();
        const c = criarCluster(dbRef, 'Saúde', 'dominioImagetico').cluster;
        atribuirEtiquetasAoCluster(dbRef, [oft, med, enf], c.id);
        // poema 1 tem Oftalmologia e Medicina (as duas no cluster): conta 1
        assert.equal(contarTextosPorCluster(dbRef).get(c.id), 2);
        const t = textosDoCluster(dbRef, c.id);
        assert.deepEqual(t.poemasIds, [1, 2]);
        assert.deepEqual(t.prosasIds, []);
    });
});

describe('Tag clusters: efeitos em Mover e Mesclar', () => {
    it('mover de categoria solta do cluster, e Desfazer devolve', () => {
        const { dbRef, oft } = montar();
        const c = criarCluster(dbRef, 'Saúde', 'dominioImagetico').cluster;
        atribuirEtiquetasAoCluster(dbRef, [oft], c.id);
        const r = moverEtiquetaDeCategoria(dbRef, oft, 'estilo');
        assert.equal(r.ok, true);
        assert.equal(clusterDaEtiqueta(dbRef, oft), null);
        r.desfazer();
        assert.equal(clusterDaEtiqueta(dbRef, oft).id, c.id);
    });

    it('mesclar: destino herda o cluster da origem só se não tem o seu', () => {
        const { dbRef, oft, med, enf } = montar();
        const saude = criarCluster(dbRef, 'Saúde', 'dominioImagetico').cluster;
        const corpo = criarCluster(dbRef, 'Corpo', 'dominioImagetico').cluster;
        atribuirEtiquetasAoCluster(dbRef, [oft], saude.id);
        atribuirEtiquetasAoCluster(dbRef, [enf], corpo.id);

        // destino sem cluster herda
        const r1 = mesclarEtiquetas(dbRef, oft, med);
        assert.equal(r1.ok, true);
        assert.equal(clusterDaEtiqueta(dbRef, med).id, saude.id);
        r1.desfazer();
        assert.equal(clusterDaEtiqueta(dbRef, med), null);
        assert.equal(clusterDaEtiqueta(dbRef, oft).id, saude.id);

        // destino com cluster mantém o seu
        const r2 = mesclarEtiquetas(dbRef, oft, enf);
        assert.equal(r2.ok, true);
        assert.equal(clusterDaEtiqueta(dbRef, enf).id, corpo.id);
    });
});

describe('Tag clusters: sincronizar', () => {
    it('cria o array, descarta cluster inválido e solta etiqueta com cluster que não vale', () => {
        const { dbRef, oft, melan } = montar();
        const c = criarCluster(dbRef, 'Saúde', 'dominioImagetico').cluster;
        atribuirEtiquetasAoCluster(dbRef, [oft], c.id);
        dbRef.etiquetas.find((e) => e.id === melan).clusterId = c.id; // categoria errada
        dbRef.tagClusters.push({ id: 5, nome: 'Lixo', categoria: 'outros' });
        const soltas = sincronizarTagClusters(dbRef);
        assert.equal(soltas, 1);
        assert.equal(dbRef.tagClusters.length, 1);
        assert.equal(clusterDaEtiqueta(dbRef, oft).id, c.id);
        assert.equal(clusterDaEtiqueta(dbRef, melan), null);
    });

    it('solta clusterId de cluster que não existe mais e é idempotente', () => {
        const { dbRef, oft } = montar();
        dbRef.etiquetas.find((e) => e.id === oft).clusterId = 999;
        assert.equal(sincronizarTagClusters(dbRef), 1);
        assert.equal(sincronizarTagClusters(dbRef), 0);
        const vazio = { etiquetas: [] };
        sincronizarTagClusters(vazio);
        assert.deepEqual(vazio.tagClusters, []);
    });

    it('normaliza nome e nota e remove id repetido', () => {
        const dbRef = {
            etiquetas: [],
            tagClusters: [
                { id: 1, nome: ' a,  b ', categoria: 'tom' },
                { id: 1, nome: 'dup', categoria: 'tom' },
            ],
        };
        sincronizarTagClusters(dbRef);
        assert.equal(dbRef.tagClusters.length, 1);
        assert.equal(dbRef.tagClusters[0].nome, 'a b');
        assert.equal(dbRef.tagClusters[0].notas, '');
    });
});
