import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Leitura avaliativa (Fase 22, entrega 3a): excluir um poema ou uma prosa leva
// as leituras dele junto, o aviso conta, e o Desfazer devolve.

const { db, deleteItem, deleteItemsEmMassa } = await import('../js/db.js');

const leitura = (id, textoId, tipo) => ({ id, textoId, tipo, data: '2026-11-01' });

function montar() {
    document.getElementById('avisos-toast')?.remove();
    document.getElementById('modal-confirmar-exclusao')?.remove();
    for (const k of [
        'livros',
        'partes',
        'secoes',
        'pessoas',
        'grupos',
        'autores',
        'epocas',
        'moldes',
        'escansoes',
        'estruturasTextuais',
        'itensColetanea',
    ]) {
        db[k] = [];
    }
    db.poemas = [
        { id: 1, titulo: 'Um' },
        { id: 2, titulo: 'Dois' },
    ];
    db.prosas = [{ id: 1, titulo: 'Prosa um' }];
    db.leituras = [
        leitura(10, 1, 'poema'),
        leitura(11, 1, 'poema'),
        leitura(12, 1, 'prosa'),
        leitura(13, 2, 'poema'),
    ];
}

describe('excluir texto e as leituras avaliativas', () => {
    beforeEach(montar);

    it('o aviso conta as leituras que saem junto', () => {
        deleteItem('poemas', 1);
        assert.match(
            document.getElementById('modal-confirmar-exclusao').textContent,
            /2 leituras avaliativas serão apagadas junto/,
        );
    });

    it('sem leituras, o aviso não fala delas', () => {
        db.leituras = [];
        deleteItem('poemas', 1);
        assert.doesNotMatch(
            document.getElementById('modal-confirmar-exclusao').textContent,
            /leitura/,
        );
    });

    it('excluir leva só as leituras do mesmo texto e do mesmo tipo', () => {
        deleteItem('poemas', 1);
        document.getElementById('excl-confirmar').click();
        assert.deepEqual(db.leituras.map((l) => l.id).sort(), [12, 13]);
    });

    it('Desfazer devolve as leituras', () => {
        const antes = JSON.stringify([...db.leituras].sort((a, b) => a.id - b.id));
        deleteItem('poemas', 1);
        document.getElementById('excl-confirmar').click();
        document.querySelector('#avisos-toast button').click();
        assert.equal(db.poemas.length, 2);
        assert.equal(JSON.stringify([...db.leituras].sort((a, b) => a.id - b.id)), antes);
    });

    it('a prosa também leva as dela, e a exclusão em massa também', () => {
        deleteItemsEmMassa('prosas', [1]);
        assert.deepEqual(db.leituras.map((l) => l.id).sort(), [10, 11, 13]);
        deleteItemsEmMassa('poemas', [1, 2]);
        assert.deepEqual(db.leituras, []);
        document.querySelector('#avisos-toast button').click();
        assert.deepEqual(db.leituras.map((l) => l.id).sort(), [10, 11, 13]);
    });
});
