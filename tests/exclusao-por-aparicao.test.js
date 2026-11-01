import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Fase 21, etapa 21-3a: excluir Seção, Parte ou Livro mexe só na APARIÇÃO do
// texto naquele lugar. A que não é o Destino do texto (a segunda, em outro
// lugar) também sobe ou sai, em vez de ser apagada em silêncio pelo `save()`.
// Seção e Parte: a aparição sobe para o pai, no fim da fila; se o texto já
// está no pai, as duas se fundem. Livro: as aparições dele saem. O aviso diz
// quantos textos mudam e o Desfazer devolve lista, espelho e posições.

const { db, deleteItem } = await import('../js/db.js');
const { definirAparicoes } = await import('../js/aparicoes-dado.js');
const { getIrmaosPorEscopo } = await import('../js/utils.js');

const COLECOES = ['livros', 'partes', 'secoes', 'elementos', 'poemas', 'prosas', 'pessoas'];

// Livro 1: Parte 10 (1), Parte 11 (2), Seção 20 dentro da Parte 10 (posição 2)
//   Fila da Parte 10: Poema 1 (1), Seção 20 (2), Poema 4 (3)
// Livro 2: Parte 30 (1)
const ap = (livroId, parteId, secaoId, sequencia) => ({ livroId, parteId, secaoId, sequencia });

function texto(id, aparicoes, extra = {}) {
    const t = { id, titulo: `Texto ${id}`, texto: 'x', paiTipo: null, paiId: null, ...extra };
    definirAparicoes(db, t, aparicoes);
    return t;
}

function montar() {
    COLECOES.forEach((c) => {
        db[c].length = 0;
    });
    localStorage.clear();
    document.getElementById('modal-confirmar-exclusao')?.remove();
    document.getElementById('avisos-toast')?.remove();

    db.livros.push(
        { id: 1, titulo: 'Livro Um', tipo: 'Inéditos', sequencia: 1 },
        { id: 2, titulo: 'Livro Dois', tipo: 'Inéditos', sequencia: 2 },
    );
    db.partes.push(
        { id: 10, livroId: 1, titulo: 'Parte A', sequencia: 1 },
        { id: 11, livroId: 1, titulo: 'Parte B', sequencia: 2 },
        { id: 30, livroId: 2, titulo: 'Parte C', sequencia: 1 },
    );
    db.secoes.push({ id: 20, paiTipo: 'parte', paiId: 10, titulo: 'Seção X', sequencia: 2 });
}

const poema = (id) => db.poemas.find((p) => p.id === id);
const confirmar = () => document.getElementById('excl-confirmar').click();
const desfazer = () => document.querySelector('#avisos-toast button').click();
const textoDoModal = () => document.getElementById('modal-confirmar-exclusao').textContent;
const lista = (id) =>
    poema(id).aparicoes.map((a) => [a.livroId, a.parteId, a.secaoId, a.sequencia]);
// O `save()` acrescenta campos padrão e pode reordenar o array: compara só o que
// esta etapa mexe, por id.
const copia = () =>
    JSON.stringify({
        poemas: [...db.poemas]
            .sort((a, b) => a.id - b.id)
            .map((p) => [p.id, p.paiTipo, p.paiId, p.sequencia, p.livrosIds, p.aparicoes]),
        secoes: db.secoes.map((x) => [x.id, x.paiTipo, x.paiId, x.sequencia]),
        partes: db.partes.map((x) => [x.id, x.livroId, x.sequencia]),
    });

describe('excluir Seção: a aparição sobe por conta própria', () => {
    beforeEach(montar);

    it('a segunda aparição (que não é o Destino) sobe para a Parte, no fim da fila', () => {
        db.poemas.push(
            texto(1, [ap(1, 10, null, 1)]),
            texto(4, [ap(1, 10, null, 3)]),
            // Destino na Parte C do Livro 2; a aparição da Seção X é a segunda.
            texto(2, [ap(2, 30, null, 1), ap(1, 10, 20, 1)]),
        );
        deleteItem('secoes', 20);
        confirmar();
        // O Destino não mudou e a segunda aparição não foi apagada.
        assert.deepEqual(lista(2), [
            [2, 30, null, 1],
            [1, 10, null, 3],
        ]);
        assert.equal(poema(2).paiTipo, 'parte');
        assert.equal(poema(2).paiId, 30);
        // Fila da Parte A sem buraco: 1, 2 (era 3) e a que subiu em 3.
        const fila = getIrmaosPorEscopo(db, 'parte', 10)
            .map((it) => [it.titulo, it.sequencia])
            .sort((a, b) => a[1] - b[1]);
        assert.deepEqual(fila, [
            ['Texto 1', 1],
            ['Texto 4', 2],
            ['Texto 2', 3],
        ]);
    });

    it('o texto que já está na Parte funde as duas aparições (fica a que já estava)', () => {
        db.poemas.push(texto(1, [ap(1, 10, null, 1), ap(1, 10, 20, 2)]));
        deleteItem('secoes', 20);
        assert.match(textoDoModal(), /1 texto subirá para a Parte “Parte A”/);
        assert.match(textoDoModal(), /1 texto já está lá e as duas aparições se fundem/);
        confirmar();
        assert.deepEqual(lista(1), [[1, 10, null, 1]]);
        assert.equal(poema(1).paiId, 10);
        assert.equal(poema(1).sequencia, 1);
    });

    it('na fusão, quem já estava no pai sem posição ganha a posição de quem subiu', () => {
        db.poemas.push(texto(1, [ap(1, 10, null, null), ap(1, 10, 20, 1)]));
        deleteItem('secoes', 20);
        confirmar();
        assert.deepEqual(lista(1), [[1, 10, null, 2]]);
    });

    it('aparição sem posição sobe sem posição', () => {
        db.poemas.push(texto(1, [ap(1, 10, 20, null), ap(2, 30, null, 1)]));
        deleteItem('secoes', 20);
        confirmar();
        assert.deepEqual(lista(1), [
            [1, 10, null, null],
            [2, 30, null, 1],
        ]);
    });

    it('as aparições de outros lugares e o "só consta" não mudam', () => {
        db.poemas.push(texto(1, [ap(1, 10, 20, 1), ap(1, 11, null, 4), ap(2, null, null, null)]));
        deleteItem('secoes', 20);
        confirmar();
        // A fila da Parte A só tinha a Seção (posição 2): a aparição entra no fim (3)
        // e o buraco que a Seção deixa fecha, então ela fica em 2.
        assert.deepEqual(lista(1), [
            [1, 10, null, 2],
            [1, 11, null, 4],
            [2, null, null, null],
        ]);
    });

    it('o aviso conta os textos que mudam, e o Desfazer devolve lista, espelho e posições', () => {
        db.poemas.push(
            texto(1, [ap(1, 10, null, 1)]),
            texto(4, [ap(1, 10, null, 3)]),
            texto(2, [ap(2, 30, null, 1), ap(1, 10, 20, 1)]),
            texto(3, [ap(1, 10, 20, 2)]),
        );
        const antes = copia();
        deleteItem('secoes', 20);
        assert.match(textoDoModal(), /2 textos subirão para a Parte “Parte A”/);
        confirmar();
        assert.notEqual(copia(), antes);
        desfazer();
        assert.equal(copia(), antes);
    });

    it('Seção direto no Livro: a aparição sobe para o Livro e fica sem Parte', () => {
        db.secoes.push({ id: 21, paiTipo: 'livro', paiId: 1, titulo: 'Seção Y', sequencia: 3 });
        db.poemas.push(texto(1, [ap(1, null, 21, 1), ap(2, 30, null, 1)]));
        deleteItem('secoes', 21);
        assert.match(textoDoModal(), /1 texto subirá para o Livro “Livro Um”/);
        confirmar();
        // Fila do Livro só com a Seção Y (posição 3): a aparição entra em 4 e fecha para 3.
        assert.deepEqual(lista(1), [
            [1, null, null, 3],
            [2, 30, null, 1],
        ]);
    });

    it('Prosa também', () => {
        db.prosas.push({ id: 9, titulo: 'Prosa', texto: 'y', paiTipo: null, paiId: null });
        definirAparicoes(db, db.prosas[0], [ap(2, 30, null, 1), ap(1, 10, 20, 1)]);
        deleteItem('secoes', 20);
        confirmar();
        assert.deepEqual(
            db.prosas[0].aparicoes.map((a) => [a.livroId, a.parteId, a.secaoId]),
            [
                [2, 30, null],
                [1, 10, null],
            ],
        );
        desfazer();
        assert.deepEqual(
            db.prosas[0].aparicoes.map((a) => [a.livroId, a.parteId, a.secaoId]),
            [
                [2, 30, null],
                [1, 10, 20],
            ],
        );
    });
});

describe('excluir Parte: só a aparição direto nela sobe', () => {
    beforeEach(montar);

    it('a aparição na Parte vai para o Livro; a que está na Seção dela fica na Seção', () => {
        db.poemas.push(
            texto(1, [ap(2, 30, null, 1), ap(1, 10, null, 1)]),
            texto(2, [ap(1, 10, 20, 1)]),
        );
        deleteItem('partes', 10);
        assert.match(textoDoModal(), /1 texto e 1 seção subirão para o Livro “Livro Um”/);
        confirmar();
        // Fila do Livro: Parte B vira 1 (o buraco da Parte A fecha), o texto entra em 2
        // e a Seção, que também sobe, em 3.
        assert.deepEqual(lista(1), [
            [2, 30, null, 1],
            [1, null, null, 2],
        ]);
        // O texto da Seção continua na Seção, que agora está direto no Livro.
        assert.deepEqual(lista(2), [[1, null, 20, 1]]);
        assert.equal(db.secoes[0].paiTipo, 'livro');
    });

    it('o texto que já tem aparição direto no Livro funde as duas', () => {
        db.poemas.push(texto(1, [ap(1, 10, null, 1), ap(1, null, null, 5)]));
        deleteItem('partes', 10);
        assert.match(textoDoModal(), /1 texto já está lá/);
        confirmar();
        // A que já estava no Livro (5) fica, e desce para 4 com o buraco da Parte A.
        assert.deepEqual(lista(1), [[1, null, null, 4]]);
    });

    it('Desfazer devolve tudo', () => {
        db.poemas.push(
            texto(1, [ap(2, 30, null, 1), ap(1, 10, null, 1)]),
            texto(2, [ap(1, 10, 20, 1)]),
        );
        const antes = copia();
        deleteItem('partes', 10);
        confirmar();
        desfazer();
        assert.equal(copia(), antes);
    });
});

describe('excluir Livro: as aparições dele saem', () => {
    beforeEach(montar);

    it('o texto em dois livros perde só a do livro excluído; o de um livro só fica avulso', () => {
        db.poemas.push(
            texto(1, [ap(1, 10, null, 1), ap(2, 30, null, 1)]),
            texto(2, [ap(1, 10, 20, 1)]),
            texto(3, [ap(2, 30, null, 2)]),
        );
        deleteItem('livros', 1);
        assert.match(
            textoDoModal(),
            /2 textos perderão a aparição neste livro \(1 ficará avulso\)/,
        );
        confirmar();
        assert.deepEqual(lista(1), [[2, 30, null, 1]]);
        assert.equal(poema(1).paiId, 30);
        assert.deepEqual(lista(2), []);
        assert.equal(poema(2).paiTipo, null);
        assert.deepEqual(lista(3), [[2, 30, null, 2]]);
    });

    it('as várias aparições do texto no mesmo livro saem juntas', () => {
        db.poemas.push(texto(1, [ap(1, 10, null, 1), ap(1, 11, null, 1), ap(2, null, null, null)]));
        deleteItem('livros', 1);
        confirmar();
        assert.deepEqual(lista(1), [[2, null, null, null]]);
    });

    it('Desfazer devolve a lista e o espelho', () => {
        db.poemas.push(
            texto(1, [ap(1, 10, null, 1), ap(2, 30, null, 1)]),
            texto(2, [ap(1, 10, 20, 1)]),
        );
        const antes = copia();
        deleteItem('livros', 1);
        confirmar();
        desfazer();
        assert.equal(copia(), antes);
        assert.ok(db.livros.some((l) => l.id === 1));
    });
});
