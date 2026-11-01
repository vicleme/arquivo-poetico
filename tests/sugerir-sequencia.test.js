import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// A sugestão de posição do modal (agora por aparição, ver `onde-aparece-modal.test.js`) olha a fila inteira do lugar (Seções,
// Elementos, Poemas e Prosas), não só os textos, e entra no fim.

const { db } = await import('../js/db.js');
const { proximaPosicaoDoLugar } = await import('../js/utils.js');

function montar() {
    ['livros', 'partes', 'secoes', 'elementos', 'poemas', 'prosas'].forEach((c) => {
        db[c].length = 0;
    });
    db.livros.push({ id: 1, titulo: 'L', sequencia: 1 });
    db.partes.push({ id: 10, livroId: 1, titulo: 'P', sequencia: 1 });
}

describe('proximaPosicaoDoLugar', () => {
    beforeEach(montar);

    it('lugar vazio sugere 1', () => {
        assert.equal(proximaPosicaoDoLugar(db, 'parte', 10), 1);
    });

    it('sem destino sugere 1', () => {
        assert.equal(proximaPosicaoDoLugar(db, '', ''), 1);
    });

    it('conta Seções da Parte, não só textos (entra no fim)', () => {
        db.secoes.push(
            { id: 20, paiTipo: 'parte', paiId: 10, sequencia: 1 },
            { id: 21, paiTipo: 'parte', paiId: 10, sequencia: 2 },
            { id: 22, paiTipo: 'parte', paiId: 10, sequencia: 3 },
        );
        assert.equal(proximaPosicaoDoLugar(db, 'parte', 10), 4);
    });

    it('conta Elementos, Poemas e Prosas na mesma fila', () => {
        db.elementos.push({ id: 30, paiTipo: 'secao', paiId: 20, sequencia: 1 });
        db.poemas.push({ id: 31, paiTipo: 'secao', paiId: 20, sequencia: 2 });
        db.prosas.push({ id: 32, paiTipo: 'secao', paiId: 20, sequencia: 5 });
        assert.equal(proximaPosicaoDoLugar(db, 'secao', 20), 6);
    });

    it('itens sem posição (null ou 0) não contam', () => {
        db.poemas.push(
            { id: 40, paiTipo: 'parte', paiId: 10, sequencia: null },
            { id: 41, paiTipo: 'parte', paiId: 10, sequencia: 0 },
        );
        assert.equal(proximaPosicaoDoLugar(db, 'parte', 10), 1);
    });

    it('não conta o item em edição', () => {
        const p = { id: 50, paiTipo: 'parte', paiId: 10, sequencia: 3 };
        db.poemas.push(p, { id: 51, paiTipo: 'parte', paiId: 10, sequencia: 2 });
        assert.equal(proximaPosicaoDoLugar(db, 'parte', 10, p), 3);
        assert.equal(proximaPosicaoDoLugar(db, 'parte', 10), 4);
    });

    it('texto descartado não ocupa posição (sai da árvore, vive no Fora de escopo)', () => {
        db.poemas.push(
            { id: 60, paiTipo: 'parte', paiId: 10, sequencia: 1 },
            { id: 61, paiTipo: 'parte', paiId: 10, sequencia: 2, status: 'descartado' },
            { id: 62, paiTipo: 'parte', paiId: 10, sequencia: 3, status: 'descartado' },
        );
        db.prosas.push({ id: 63, paiTipo: 'parte', paiId: 10, sequencia: 4, status: 'descartado' });
        assert.equal(proximaPosicaoDoLugar(db, 'parte', 10), 2);
    });

    it('voltar o status de descartado a outro faz a posição contar de novo', () => {
        const p = { id: 64, paiTipo: 'parte', paiId: 10, sequencia: 5, status: 'descartado' };
        db.poemas.push(p);
        assert.equal(proximaPosicaoDoLugar(db, 'parte', 10), 1);
        p.status = 'publicado';
        assert.equal(proximaPosicaoDoLugar(db, 'parte', 10), 6);
    });

    it('topo do Livro conta Partes junto', () => {
        db.partes.push({ id: 11, livroId: 1, titulo: 'P2', sequencia: 2 });
        assert.equal(proximaPosicaoDoLugar(db, 'livro', 1), 3);
    });
});
