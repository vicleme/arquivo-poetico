import './helpers/localstorage-shim.js';
import './helpers/dom-shim.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Esfera e Categoria dos Períodos Históricos no backup completo: ida e volta,
// backup anterior à feature (migração única dos 16 de fábrica) e vocabulário
// que a pessoa esvaziou de propósito.
const { db, importarDB } = await import('../js/db.js');

// Os 16 de fábrica, já sem classificação nenhuma: `importarDB` recria os que
// faltam no backup, e a classificação deles alimentaria o vocabulário.
const fabricaSemClassificacao = () =>
    db.periodosHistoricos
        .filter((p) => p.embutido)
        .map((p) => ({ ...p, esferas: [], categorias: [] }));

describe('backup: Esfera e Categoria do período histórico', () => {
    it('ida e volta preserva as listas dos períodos e o vocabulário', async () => {
        db.periodosHistoricos = [
            ...fabricaSemClassificacao(),
            {
                id: 501,
                nome: 'Cisma',
                regiao: [],
                esferas: ['Religiosa'],
                categorias: ['Crise'],
                pertenceA: [],
            },
        ];
        db.opcoesPeriodoHistorico = { esferas: ['Religiosa', 'Política'], categorias: ['Crise'] };
        const backup = JSON.parse(JSON.stringify(db));
        db.periodosHistoricos = [];
        db.opcoesPeriodoHistorico = null;

        await importarDB(backup);

        const p = db.periodosHistoricos.find((x) => x.id === 501);
        assert.deepEqual(p.esferas, ['Religiosa']);
        assert.deepEqual(p.categorias, ['Crise']);
        assert.deepEqual(db.opcoesPeriodoHistorico.esferas.sort(), ['Política', 'Religiosa']);
        assert.deepEqual(db.opcoesPeriodoHistorico.categorias, ['Crise']);
    });

    it('backup anterior à feature: os de fábrica ganham a classificação, uma vez', async () => {
        await importarDB({
            periodosHistoricos: [{ id: 1, nome: 'Guerra Fria', embutido: true, regiao: [] }],
        });
        const guerra = db.periodosHistoricos.find((p) => p.nome === 'Guerra Fria');
        assert.deepEqual(guerra.esferas, ['Política']);
        assert.deepEqual(guerra.categorias, ['Guerra e conflito']);
        assert.ok(db.opcoesPeriodoHistorico.categorias.includes('Guerra e conflito'));
        assert.ok(db.opcoesPeriodoHistorico.esferas.includes('Sanitária'));
    });

    it('o que a pessoa esvaziou num período de fábrica não volta no backup seguinte', async () => {
        await importarDB({
            periodosHistoricos: [
                {
                    id: 1,
                    nome: 'Guerra Fria',
                    embutido: true,
                    regiao: [],
                    esferas: [],
                    categorias: [],
                },
            ],
        });
        const guerra = db.periodosHistoricos.find((p) => p.nome === 'Guerra Fria');
        assert.deepEqual(guerra.esferas, []);
        assert.deepEqual(guerra.categorias, []);
    });

    it('vocabulário apagado de propósito não é semeado de novo', async () => {
        await importarDB({
            periodosHistoricos: fabricaSemClassificacao(),
            opcoesPeriodoHistorico: { esferas: ['Política'], categorias: [] },
        });
        assert.deepEqual(db.opcoesPeriodoHistorico.categorias, []);
        assert.deepEqual(db.opcoesPeriodoHistorico.esferas, ['Política']);
    });
});
