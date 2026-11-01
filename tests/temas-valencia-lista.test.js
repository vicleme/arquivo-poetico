import './helpers/dom-real.js';

// Valência do Tema por lista de texto ("valência: tema; tema"), lógica pura.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    lerListaValencia,
    planejarListaValencia,
    aplicarListaValencia,
} from '../js/temas-valencia-lista.js';

const dbBase = () => ({
    temas: [
        { id: 1, nome: 'Luto', notas: '' },
        { id: 2, nome: 'Saudade', notas: '', valencia: 'ambivalente' },
        { id: 3, nome: 'Amor, perda', notas: '' },
        { id: 4, nome: 'Cotidiano', notas: '' },
        { id: 5, nome: 'Violência simbólica', notas: '', valencia: 'desagradavel' },
    ],
});

const valencias = (db) => Object.fromEntries(db.temas.map((t) => [t.nome, t.valencia]));

describe('lerListaValencia', () => {
    it('lê blocos "valência: tema; tema" na mesma linha ou em linhas separadas', () => {
        const r = lerListaValencia('Agradável: A; B\nDesagradável: C; D; Neutro: E');
        assert.deepEqual(r.blocos, [
            { valencia: 'agradavel', nomes: ['A', 'B'] },
            { valencia: 'desagradavel', nomes: ['C', 'D'] },
            { valencia: 'neutro', nomes: ['E'] },
        ]);
        assert.deepEqual(r.semCabecalho, []);
    });

    it('aceita a chave ou o rótulo, sem caixa nem acento', () => {
        const r = lerListaValencia('DESAGRADAVEL: a\nagradável: b\nAmbivalente: c');
        assert.deepEqual(
            r.blocos.map((b) => b.valencia),
            ['desagradavel', 'agradavel', 'ambivalente'],
        );
    });

    it('a vírgula faz parte do nome, mas sobra de ponta some', () => {
        const r = lerListaValencia('Agradável: Amor, perda; tema 4,;tema 5');
        assert.deepEqual(r.blocos[0].nomes, ['Amor, perda', 'tema 4', 'tema 5']);
    });

    it('um dois-pontos que não é cabeçalho fica no nome', () => {
        const r = lerListaValencia('Agradável: Luto: perda; Alegre: Festa');
        assert.deepEqual(r.blocos[0].nomes, ['Luto: perda', 'Alegre: Festa']);
    });

    it('nomes antes do primeiro cabeçalho vão para semCabecalho', () => {
        const r = lerListaValencia('Solto; Outro\nNeutro: X');
        assert.deepEqual(r.semCabecalho, ['Solto', 'Outro']);
        assert.deepEqual(r.blocos[0].nomes, ['X']);
    });

    it('"sem valência" é cabeçalho que limpa', () => {
        const r = lerListaValencia('Sem valência: A; B');
        assert.deepEqual(r.blocos, [{ valencia: '', nomes: ['A', 'B'] }]);
    });

    it('cabeçalho sozinho na linha vale para as linhas seguintes', () => {
        const r = lerListaValencia('Neutro:\nA\nB');
        assert.deepEqual(r.blocos[0].nomes, ['A', 'B']);
    });
});

describe('planejarListaValencia', () => {
    it('texto vazio e texto sem cabeçalho não são lista', () => {
        assert.equal(planejarListaValencia(dbBase(), '  ').motivo, 'vazio');
        const r = planejarListaValencia(dbBase(), 'Luto; Saudade');
        assert.equal(r.motivo, 'sem-cabecalho');
        assert.deepEqual(r.semCabecalho, ['Luto', 'Saudade']);
    });

    it('casa por nome sem caixa nem acento e não grava nada', () => {
        const db = dbBase();
        const antes = JSON.stringify(db);
        const r = planejarListaValencia(
            db,
            'Desagradável: luto; amor, PERDA\nAmbivalente: saudade',
        );
        assert.equal(r.ok, true);
        assert.deepEqual(
            r.aplicaveis.map((a) => [a.nome, a.valencia, a.muda]),
            [
                ['Luto', 'desagradavel', true],
                ['Amor, perda', 'desagradavel', true],
                ['Saudade', 'ambivalente', false],
            ],
        );
        assert.equal(JSON.stringify(db), antes);
    });

    it('Tema que não existe vai para inexistentes e nunca é criado', () => {
        const db = dbBase();
        const r = planejarListaValencia(db, 'Agradável: Luto; Fantasma');
        assert.deepEqual(r.inexistentes, [{ nome: 'Fantasma', valencia: 'agradavel' }]);
        assert.equal(db.temas.length, 5);
    });

    it('o mesmo Tema em duas valências é conflito e fica de fora', () => {
        const r = planejarListaValencia(dbBase(), 'Agradável: Luto; Cotidiano\nNeutro: luto');
        assert.deepEqual(r.conflitos, [{ nome: 'Luto', valencias: ['agradavel', 'neutro'] }]);
        assert.deepEqual(
            r.aplicaveis.map((a) => a.nome),
            ['Cotidiano'],
        );
    });

    it('repetir o Tema na mesma valência não é conflito', () => {
        const r = planejarListaValencia(dbBase(), 'Agradável: Luto; luto');
        assert.deepEqual(r.conflitos, []);
        assert.equal(r.aplicaveis.length, 1);
    });

    it('resumo por valência, na ordem do primeiro cabeçalho', () => {
        const r = planejarListaValencia(
            dbBase(),
            'Desagradável: Luto; Violência simbólica\nAgradável: Cotidiano\nDesagradável: Amor, perda',
        );
        assert.deepEqual(r.resumo, [
            { valencia: 'desagradavel', encontrados: 3, mudam: 2 },
            { valencia: 'agradavel', encontrados: 1, mudam: 1 },
        ]);
    });
});

describe('aplicarListaValencia', () => {
    it('grava a valência de cada bloco e conta alterados e iguais', () => {
        const db = dbBase();
        const r = aplicarListaValencia(
            db,
            'Desagradável: Luto; Violência simbólica; Amor, perda\nAgradável: Cotidiano',
        );
        assert.equal(r.ok, true);
        assert.equal(r.alterados, 3);
        assert.equal(r.iguais, 1);
        assert.deepEqual(valencias(db), {
            Luto: 'desagradavel',
            Saudade: 'ambivalente',
            'Amor, perda': 'desagradavel',
            Cotidiano: 'agradavel',
            'Violência simbólica': 'desagradavel',
        });
    });

    it('"sem valência" apaga o campo, sem deixar valencia vazia', () => {
        const db = dbBase();
        const r = aplicarListaValencia(db, 'Sem valência: Saudade');
        assert.equal(r.alterados, 1);
        assert.equal('valencia' in db.temas[1], false);
    });

    it('desfazer devolve tudo, inclusive o campo ausente', () => {
        const db = dbBase();
        const antes = JSON.stringify(db);
        const r = aplicarListaValencia(
            db,
            'Neutro: Luto; Saudade\nSem valência: Violência simbólica',
        );
        assert.notEqual(JSON.stringify(db), antes);
        r.desfazer();
        assert.equal(JSON.stringify(db), antes);
    });

    it('sem Tema aplicável não grava e devolve o relatório', () => {
        const db = dbBase();
        const antes = JSON.stringify(db);
        const r = aplicarListaValencia(db, 'Agradável: Fantasma');
        assert.equal(r.ok, false);
        assert.equal(r.motivo, 'sem-temas');
        assert.deepEqual(r.inexistentes, [{ nome: 'Fantasma', valencia: 'agradavel' }]);
        assert.equal(JSON.stringify(db), antes);
    });

    it('a lista em um bloco só, como o Victor descreveu', () => {
        const db = dbBase();
        const r = aplicarListaValencia(
            db,
            'agradável: Cotidiano; Luto; desagradável: Amor, perda;;Saudade',
        );
        assert.equal(r.ok, true);
        assert.equal(db.temas[0].valencia, 'agradavel');
        assert.equal(db.temas[3].valencia, 'agradavel');
        assert.equal(db.temas[2].valencia, 'desagradavel');
        assert.equal(db.temas[1].valencia, 'desagradavel');
    });
});
