import './helpers/dom-real.js';

// Leitura avaliativa (Fase 22, entrega 1): a tabela `db.leituras` no db.
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { db, getLeiturasDoTexto, importarDB } from '../js/db.js';

const leitura = (id, textoId, tipo, data) => ({ id, textoId, tipo, data });

describe('db.leituras', () => {
    beforeEach(() => {
        db.leituras = [];
    });

    it('existe e começa vazia', () => {
        assert.ok(Array.isArray(db.leituras));
        assert.equal(db.leituras.length, 0);
    });

    it('getLeiturasDoTexto traz só as do texto e do tipo, da mais recente à mais antiga', () => {
        db.leituras = [
            leitura(1, 10, 'poema', '2026-10-01'),
            leitura(2, 10, 'poema', '2026-11-01'),
            leitura(3, 10, 'prosa', '2026-11-02'),
            leitura(4, 11, 'poema', '2026-11-03'),
        ];
        assert.deepEqual(
            getLeiturasDoTexto(10, 'poema').map((l) => l.id),
            [2, 1],
        );
        assert.deepEqual(
            getLeiturasDoTexto(10, 'prosa').map((l) => l.id),
            [3],
        );
        assert.deepEqual(getLeiturasDoTexto(99, 'poema'), []);
    });

    it('compara o id do texto sem se importar com número ou texto', () => {
        db.leituras = [leitura(1, '10', 'poema', '2026-10-01')];
        assert.equal(getLeiturasDoTexto(10, 'poema').length, 1);
    });

    it('importarDB com backup antigo, sem o campo, deixa a lista vazia', () => {
        db.leituras = [leitura(1, 10, 'poema', '2026-10-01')];
        importarDB({ livros: [], partes: [], secoes: [], poemas: [], prosas: [] });
        assert.deepEqual(db.leituras, []);
    });

    it('importarDB traz as leituras do backup', () => {
        importarDB({
            livros: [],
            partes: [],
            secoes: [],
            poemas: [],
            prosas: [],
            leituras: [leitura(5, 10, 'poema', '2026-11-01')],
        });
        assert.equal(db.leituras.length, 1);
        assert.equal(db.leituras[0].id, 5);
    });
});
