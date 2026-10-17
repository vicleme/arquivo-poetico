// Fase 17, entrega 1: os tag clusters sobrevivem ao save(), ao backup e ao
// import, e o backup antigo (sem `tagClusters`) abre sem erro.
import './helpers/localstorage-shim.js';
import './helpers/dom-shim.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const { db, importarDB, save } = await import('../js/db.js');
const { criarCluster, atribuirEtiquetasAoCluster, clusterDaEtiqueta } =
    await import('../js/tag-clusters.js');
const DB_KEY = 'arquivoPoetico_v3';

function backupBase() {
    return {
        livros: [],
        poemas: [
            {
                id: 1,
                titulo: 'Um',
                texto: 'x',
                sinalizacoesDominioImagetico: 'Oftalmologia, Medicina',
            },
        ],
        prosas: [],
    };
}

describe('tag clusters: dados e backup', () => {
    beforeEach(async () => {
        localStorage.clear();
        await importarDB(backupBase());
    });

    it('backup antigo, sem tagClusters, abre com lista vazia', () => {
        assert.deepEqual(db.tagClusters, []);
        assert.equal(db.etiquetas.length, 2);
    });

    it('save() guarda os clusters e o clusterId das etiquetas', () => {
        const c = criarCluster(db, 'Saúde', 'dominioImagetico').cluster;
        atribuirEtiquetasAoCluster(db, [db.etiquetas[0].id], c.id);
        save();
        const lido = JSON.parse(localStorage.getItem(DB_KEY));
        assert.equal(lido.tagClusters.length, 1);
        assert.equal(lido.etiquetas.filter((e) => e.clusterId === c.id).length, 1);
    });

    it('exportar e importar de novo mantém clusters e vínculos', async () => {
        const c = criarCluster(db, 'Saúde', 'dominioImagetico').cluster;
        atribuirEtiquetasAoCluster(db, [db.etiquetas[0].id, db.etiquetas[1].id], c.id);
        const copia = JSON.parse(JSON.stringify(db));
        await importarDB(copia);
        assert.equal(db.tagClusters.length, 1);
        assert.equal(db.tagClusters[0].nome, 'Saúde');
        assert.ok(db.etiquetas.every((e) => clusterDaEtiqueta(db, e)?.nome === 'Saúde'));
    });

    it('import solta clusterId órfão sem perder a etiqueta', async () => {
        const copia = JSON.parse(JSON.stringify(db));
        copia.etiquetas[0].clusterId = 987654;
        await importarDB(copia);
        assert.equal(db.etiquetas.length, 2);
        assert.ok(db.etiquetas.every((e) => e.clusterId === undefined));
    });
});
