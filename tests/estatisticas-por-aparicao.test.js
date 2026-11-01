import './helpers/localstorage-shim.js';
import './helpers/dom-shim.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { db } from '../js/db.js';
import {
    contarPorLivro,
    resumoGeral,
    resumoLinguagem,
    palavrasMaisFrequentes,
    resumoTextosEmVariosLivros,
} from '../js/estatisticas.js';

// Fase 21, etapa 21-4c (F21-D8): "Por Livro" conta o texto em cada livro onde
// ele aparece (Destino, "só consta" e lista `aparicoes`); o total geral conta
// cada texto uma vez; Coletânea segue contada pelos itens.

const ap = (livroId, parteId, secaoId, sequencia) => ({ livroId, parteId, secaoId, sequencia });

function montarBanco() {
    db.livros = [
        { id: 1, tipo: 'Livro', titulo: 'Livro Um', siglaOficial: 'L1', data: { ano: 2020 } },
        { id: 2, tipo: 'Livro', titulo: 'Livro Dois', siglaOficial: 'L2', data: { ano: 2018 } },
        { id: 3, tipo: 'Coletânea', titulo: 'Seleta', siglaOficial: 'SEL' },
    ];
    db.partes = [
        { id: 10, livroId: 1, titulo: 'Parte Alfa' },
        { id: 11, livroId: 1, titulo: 'Parte Beta' },
        { id: 40, livroId: 3, titulo: 'Parte Seleta' },
    ];
    db.secoes = [];
    db.elementos = [];
    db.coletaneas = [];
    db.itensColetanea = [];
    db.prosas = [];
    db.poemas = [];
    db.pessoas = [];
    db.grupos = [];
    db.autores = [];
    db.assuntos = [];
    localStorage.clear();
}

describe('Estatísticas Por Livro por aparição (F21-D8)', () => {
    beforeEach(montarBanco);

    it('texto em dois livros conta em cada um, e o total geral conta uma vez', () => {
        db.poemas = [
            {
                id: 1,
                texto: 'um dois',
                paiTipo: 'parte',
                paiId: 10,
                aparicoes: [ap(1, 10, null, 1), ap(2, null, null, 3)],
            },
            { id: 2, texto: 'tres', paiTipo: 'livro', paiId: 2 },
        ];
        const r = contarPorLivro();
        assert.deepEqual(Object.fromEntries(r.labels.map((l, i) => [l, r.data[i]])), {
            L1: 1,
            L2: 2,
        });
        assert.equal(resumoGeral().totalPoemas, 2);
        assert.deepEqual(resumoTextosEmVariosLivros(), { emVarios: 1, total: 2 });
    });

    it('texto que só consta no livro (sem posição) conta nesse livro e não vira Avulso', () => {
        db.poemas = [{ id: 1, texto: 'a', livrosIds: [2] }];
        assert.deepEqual(contarPorLivro(), { labels: ['L2'], data: [1] });
    });

    it('duas aparições no mesmo livro (duas Partes) contam uma vez nele', () => {
        db.poemas = [
            {
                id: 1,
                texto: 'a',
                paiTipo: 'parte',
                paiId: 10,
                aparicoes: [ap(1, 10, null, 1), ap(1, 11, null, 2)],
            },
        ];
        assert.deepEqual(contarPorLivro(), { labels: ['L1'], data: [1] });
        assert.deepEqual(resumoTextosEmVariosLivros(), { emVarios: 0, total: 1 });
    });

    it('prosas entram do mesmo jeito', () => {
        db.prosas = [
            { id: 1, texto: 'a', aparicoes: [ap(1, null, null, 1), ap(2, null, null, 1)] },
        ];
        const r = contarPorLivro();
        assert.deepEqual([...r.labels].sort(), ['L1', 'L2']);
        assert.deepEqual(r.data, [1, 1]);
    });

    it('texto só em Coletânea segue Avulso entre os livros e conta na Coletânea pelo item', () => {
        db.poemas = [{ id: 1, texto: 'a' }];
        db.itensColetanea = [{ id: 1, parteId: 40, refTipo: 'poema', refId: 1, sequencia: 1 }];
        const r = contarPorLivro();
        assert.deepEqual(Object.fromEntries(r.labels.map((l, i) => [l, r.data[i]])), {
            Avulso: 1,
            SEL: 1,
        });
    });

    it('texto num livro e numa Coletânea conta no livro e na Coletânea', () => {
        db.poemas = [{ id: 1, texto: 'a', paiTipo: 'livro', paiId: 1 }];
        db.itensColetanea = [{ id: 1, parteId: 40, refTipo: 'poema', refId: 1, sequencia: 1 }];
        const r = contarPorLivro();
        assert.deepEqual(Object.fromEntries(r.labels.map((l, i) => [l, r.data[i]])), {
            L1: 1,
            SEL: 1,
        });
        assert.deepEqual(resumoTextosEmVariosLivros(), { emVarios: 0, total: 1 });
    });

    it('livro excluído não gera barra: o texto vira Avulso', () => {
        db.poemas = [{ id: 1, texto: 'a', aparicoes: [ap(99, null, null, 1)] }];
        assert.deepEqual(contarPorLivro(), { labels: ['Avulso'], data: [1] });
    });

    it('livroComMais usa a nova contagem', () => {
        db.poemas = [
            { id: 1, texto: 'a', aparicoes: [ap(1, null, null, 1), ap(2, null, null, 1)] },
            { id: 2, texto: 'b', aparicoes: [ap(2, null, null, 2)] },
        ];
        assert.equal(resumoGeral().livroComMais, 'L2');
    });

    it('Palavras por livro: o texto vale em cada livro onde aparece', () => {
        db.poemas = [
            {
                id: 1,
                texto: 'saudade saudade',
                aparicoes: [ap(1, null, null, 1), ap(2, null, null, 1)],
            },
            { id: 2, texto: 'horizonte distante', aparicoes: [ap(1, null, null, 2)] },
        ];
        assert.equal(resumoLinguagem('1').textos, 2);
        assert.equal(resumoLinguagem('2').textos, 1);
        assert.equal(resumoLinguagem('').textos, 2);
        assert.deepEqual(palavrasMaisFrequentes('2', 5), [['saudade', 2]]);
    });

    it('Palavras por livro: texto só vinculado (livrosIds) entra', () => {
        db.prosas = [{ id: 1, texto: 'memoria viva', livrosIds: [2] }];
        assert.equal(resumoLinguagem('2').textos, 1);
        assert.equal(resumoLinguagem('1').textos, 0);
    });
});
