import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    personagensDaEntrada,
    textoPersonagensDaEntrada,
    entradaTemOsPersonagens,
    definirPersonagensDaEntrada,
    migrarPersonagensDaEntrada,
} from '../js/personagens-da-obra.js';
import { extrairPersonagensUnicos } from '../js/intertextualidade.js';
import { partesEntradaIntertexto } from '../js/utils.js';

describe('personagens da entrada de Intertextualidade (lista)', () => {
    it('lê o formato antigo (texto) e o novo (lista)', () => {
        assert.deepEqual(personagensDaEntrada({ personagem: 'Capitu' }), ['Capitu']);
        assert.deepEqual(personagensDaEntrada({ personagens: ['Prometeu', 'Zeus'] }), [
            'Prometeu',
            'Zeus',
        ]);
        assert.deepEqual(personagensDaEntrada({ personagem: ' ' }), []);
        assert.deepEqual(personagensDaEntrada(null), []);
    });

    it('a lista vence o texto, sem repetidos nem vazios (ignora acento e caixa)', () => {
        assert.deepEqual(
            personagensDaEntrada({
                personagem: 'X',
                personagens: ['Zeus', ' zeus ', '', 'Prometeu'],
            }),
            ['Zeus', 'Prometeu'],
        );
    });

    it('texto de exibição e checagem de quem tem todos', () => {
        const e = { personagens: ['Prometeu', 'Zeus', 'Hera'] };
        assert.equal(textoPersonagensDaEntrada(e), 'Prometeu, Zeus e Hera');
        assert.equal(entradaTemOsPersonagens(e, ['zeus', 'Hera']), true);
        assert.equal(entradaTemOsPersonagens(e, ['Atena']), false);
    });

    it('definir grava a lista e tira o texto antigo; migrar é idempotente', () => {
        const e = { personagem: 'Capitu' };
        assert.equal(migrarPersonagensDaEntrada(e), true);
        assert.deepEqual(e, { personagens: ['Capitu'] });
        assert.equal(migrarPersonagensDaEntrada(e), false);
        definirPersonagensDaEntrada(e, ['A', 'B']);
        assert.deepEqual(e, { personagens: ['A', 'B'] });
    });

    it('as sugestões soltam um personagem por tag e respeitam a obra', () => {
        const itens = [
            {
                intertextualidade: [
                    { obra: 'Mito de Prometeu', personagens: ['Prometeu', 'Zeus'] },
                    { obra: 'Dom Casmurro', personagem: 'Capitu' },
                ],
            },
        ];
        assert.deepEqual(extrairPersonagensUnicos(itens), ['Capitu', 'Prometeu', 'Zeus']);
        assert.deepEqual(extrairPersonagensUnicos(itens, { obra: 'Mito de Prometeu' }), [
            'Prometeu',
            'Zeus',
        ]);
    });

    it('o Ver, o .md e o .csv mostram um ou vários personagens', () => {
        assert.equal(
            partesEntradaIntertexto({
                obra: 'Dom Casmurro',
                autor: 'Machado',
                personagem: 'Capitu',
            }).corpo,
            'Dom Casmurro (Machado; personagem Capitu)',
        );
        assert.equal(
            partesEntradaIntertexto({ obra: 'Mito de Prometeu', personagens: ['Prometeu', 'Zeus'] })
                .corpo,
            'Mito de Prometeu (personagens Prometeu e Zeus)',
        );
    });
});
