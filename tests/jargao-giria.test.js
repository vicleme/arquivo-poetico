import './helpers/localstorage-shim.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    JARGAO_GIRIA_SEMENTES,
    normalizarJargaoGiria,
    jargaoGiriaDoItem,
    extrairJargaoGiriaUnicos,
} from '../js/utils.js';
import { migrarJargaoGiria } from '../js/db.js';

// Jargão e gíria: lista de textos livres no nível do texto (grupo Idioma),
// fora de `idiomas[]`. Etapa 1 do campo: dado, normalização e migração.

describe('normalizarJargaoGiria', () => {
    it('tira vazios, corta espaços e mantém a ordem', () => {
        assert.deepEqual(
            normalizarJargaoGiria(['  Gíria de internet ', '', null, 'Jargão corporativo']),
            ['Gíria de internet', 'Jargão corporativo'],
        );
    });

    it('junta repetidos sem diferenciar caixa nem acento, mantendo a primeira grafia', () => {
        assert.deepEqual(
            normalizarJargaoGiria(['Gíria juvenil', 'GIRIA JUVENIL', 'giria juvenil']),
            ['Gíria juvenil'],
        );
    });

    it('aceita valor que não é lista (undefined, texto solto)', () => {
        assert.deepEqual(normalizarJargaoGiria(undefined), []);
        assert.deepEqual(normalizarJargaoGiria('Linguagem de fandom'), ['Linguagem de fandom']);
    });
});

describe('jargaoGiriaDoItem', () => {
    it('lê a lista do texto, normalizada', () => {
        assert.deepEqual(
            jargaoGiriaDoItem({ jargaoGiria: [' Gíria de internet ', 'gíria de internet'] }),
            ['Gíria de internet'],
        );
    });

    it('texto sem o campo, backup antigo e item nulo leem como lista vazia', () => {
        assert.deepEqual(jargaoGiriaDoItem({}), []);
        assert.deepEqual(jargaoGiriaDoItem(null), []);
        assert.deepEqual(jargaoGiriaDoItem({ jargaoGiria: 'qualquer coisa que não seja lista' }), [
            'qualquer coisa que não seja lista',
        ]);
    });
});

describe('extrairJargaoGiriaUnicos', () => {
    it('sem textos, devolve só as quatro sementes em ordem alfabética', () => {
        assert.deepEqual(extrairJargaoGiriaUnicos([]), [
            'Gíria de internet',
            'Gíria juvenil',
            'Jargão corporativo',
            'Linguagem de fandom',
        ]);
        assert.equal(JARGAO_GIRIA_SEMENTES.length, 4);
    });

    it('soma o que já foi usado, sem repetir semente nem diferenciar caixa e acento', () => {
        const r = extrairJargaoGiriaUnicos([
            { jargaoGiria: ['gíria de internet', 'Juridiquês'] },
            { jargaoGiria: ['JURIDIQUES'] },
            {},
        ]);
        assert.deepEqual(r, [
            'Gíria de internet',
            'Gíria juvenil',
            'Jargão corporativo',
            'Juridiquês',
            'Linguagem de fandom',
        ]);
    });

    it('não grava as sementes em nenhum texto', () => {
        const itens = [{}];
        extrairJargaoGiriaUnicos(itens);
        assert.equal(itens[0].jargaoGiria, undefined);
    });
});

describe('migrarJargaoGiria', () => {
    it('todo texto ganha a lista; sem preenchimento, vazia', () => {
        const itens = [{}, { titulo: 'x' }];
        migrarJargaoGiria(itens);
        assert.deepEqual(itens[0].jargaoGiria, []);
        assert.deepEqual(itens[1].jargaoGiria, []);
    });

    it('normaliza a lista que já existe e não apaga o que foi preenchido', () => {
        const itens = [
            { jargaoGiria: [' Gíria juvenil', 'gíria juvenil', '', 'Jargão corporativo'] },
        ];
        migrarJargaoGiria(itens);
        assert.deepEqual(itens[0].jargaoGiria, ['Gíria juvenil', 'Jargão corporativo']);
    });

    it('é idempotente e não toca nos campos de idioma', () => {
        const itens = [
            {
                idioma: 'pt-BR',
                idiomas: [{ idioma: 'pt-BR', papel: 'principal', dialetos: ['paulistano'] }],
                jargaoGiria: ['Gíria de internet'],
            },
        ];
        const antes = JSON.stringify(itens);
        migrarJargaoGiria(itens);
        migrarJargaoGiria(itens);
        assert.equal(JSON.stringify(itens), antes);
    });

    it('aceita lista nula sem quebrar', () => {
        assert.doesNotThrow(() => migrarJargaoGiria(null));
    });
});
