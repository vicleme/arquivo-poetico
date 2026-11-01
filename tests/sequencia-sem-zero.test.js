import './helpers/dom-real.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Posição começa em 1; "sem posição" é sempre null. O 0 legado migra para null.

const { db, migrarSequenciaZero, importarDB } = await import('../js/db.js');
const { seqOuNull } = await import('../js/utils.js');

describe('migrarSequenciaZero', () => {
    it('0, "0" e vazio viram null em todas as coleções com posição', () => {
        const d = {
            livros: [{ id: 1, sequencia: 0 }],
            partes: [{ id: 2, sequencia: '0' }],
            secoes: [{ id: 3, sequencia: '' }],
            elementos: [{ id: 4, sequencia: 0 }],
            poemas: [{ id: 5, sequencia: 0 }],
            prosas: [{ id: 6, sequencia: 0 }],
            itensColetanea: [{ id: 7, sequencia: 0 }],
        };
        assert.equal(migrarSequenciaZero(d), 7);
        Object.values(d).forEach((lista) => assert.equal(lista[0].sequencia, null));
    });

    it('posições reais e null ficam como estão', () => {
        const d = { poemas: [{ id: 1, sequencia: 3 }, { id: 2, sequencia: null }, { id: 3 }] };
        assert.equal(migrarSequenciaZero(d), 0);
        assert.deepEqual(
            d.poemas.map((p) => p.sequencia),
            [3, null, undefined],
        );
    });

    it('é idempotente e aceita coleção ausente', () => {
        const d = { poemas: [{ id: 1, sequencia: 0 }] };
        assert.equal(migrarSequenciaZero(d), 1);
        assert.equal(migrarSequenciaZero(d), 0);
    });
});

describe('importarDB com backup antigo', () => {
    it('corrige o 0 ao importar', async () => {
        const antes = JSON.stringify(db);
        try {
            const novo = JSON.parse(antes);
            novo.poemas = [
                {
                    id: 91,
                    titulo: 'Descartado',
                    texto: 'x',
                    sequencia: 0,
                    paiTipo: 'secao',
                    paiId: 1,
                },
            ];
            await importarDB(novo);
            assert.equal(db.poemas.find((p) => p.id === 91).sequencia, null);
        } finally {
            await importarDB(JSON.parse(antes));
        }
    });
});

describe('seqOuNull', () => {
    it('0 não é posição', () => {
        assert.equal(seqOuNull(0), null);
        assert.equal(seqOuNull('0'), null);
    });
});
