import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Uso de IA do livro com o db real (Fase 19, etapa 5, entrega 2): excluir um
// poema ou uma prosa apontado por um uso desfaz só o vínculo (o uso fica), o
// aviso conta os livros e o Desfazer devolve o vínculo.

const { db, deleteItem } = await import('../js/db.js');

function montar() {
    ['livros', 'poemas', 'prosas', 'autores'].forEach((c) => {
        db[c].length = 0;
    });
    localStorage.clear();
    document.getElementById('modal-confirmar-exclusao')?.remove();
    document.getElementById('avisos-toast')?.remove();
    db.poemas.push({ id: 1, titulo: 'Poema Um' }, { id: 2, titulo: 'Poema Dois' });
    db.prosas.push({ id: 1, titulo: 'Prosa Um' });
    db.livros.push(
        {
            id: 10,
            titulo: 'Livro IA',
            usoIa: {
                estado: 'usou',
                usos: [
                    { onde: 'Texto', texto: { tipo: 'poema', id: 1 } },
                    { onde: 'Capa', texto: { tipo: 'prosa', id: 1 } },
                ],
            },
        },
        {
            id: 11,
            titulo: 'Outro',
            usoIa: { estado: 'usou', usos: [{ onde: 'Revisão', texto: { tipo: 'poema', id: 1 } }] },
        },
        { id: 12, titulo: 'Sem IA' },
    );
}

describe('excluir texto e o Uso de IA dos livros', () => {
    beforeEach(montar);

    it('o aviso conta os livros afetados', () => {
        deleteItem('poemas', 1);
        const texto = document.getElementById('modal-confirmar-exclusao').textContent;
        assert.match(texto, /Uso de IA de 2 livros/);
    });

    it('poema sem vínculo não ganha aviso', () => {
        deleteItem('poemas', 2);
        const texto = document.getElementById('modal-confirmar-exclusao').textContent;
        assert.doesNotMatch(texto, /Uso de IA/);
    });

    it('excluir tira só o vínculo do poema (id de prosa igual fica), e Desfazer devolve', () => {
        const antes = JSON.stringify(db.livros);
        deleteItem('poemas', 1);
        document.getElementById('excl-confirmar').click();

        const l10 = db.livros[0].usoIa.usos;
        assert.equal(l10.length, 2);
        assert.equal('texto' in l10[0], false);
        assert.deepEqual(l10[1].texto, { tipo: 'prosa', id: 1 });
        assert.equal('texto' in db.livros[1].usoIa.usos[0], false);

        document.querySelector('#avisos-toast button').click();
        assert.equal(JSON.stringify(db.livros), antes);
    });
});
