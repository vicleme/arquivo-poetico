import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    listarLinhasRevisao,
    planejarRevisao,
    aplicarRevisao,
    descreverRevisao,
    valorAplica,
    VALORES_BOOLEANOS_REVISAO,
} from '../js/revisao-fora-do-acervo.js';

// Obra pessoal (entrega 2): a coluna do Modo revisão, nas duas tabelas.

const cenario = () => ({
    poemas: [
        {
            id: 1,
            titulo: 'A',
            intertextualidade: [{ obra: 'Carta', obraPessoal: true }, { obra: 'Águas' }],
            hipertextualidade: [{ hipotexto: 'Diário' }],
        },
    ],
    prosas: [],
});

const INTER0 = 'poema:1:intertextualidade:0';
const INTER1 = 'poema:1:intertextualidade:1';
const HIPER0 = 'poema:1:hipertextualidade:0';
const edicao = (chave, obraPessoal) => [{ chave, valores: { obraPessoal } }];

describe('Modo revisão: coluna Obra pessoal', () => {
    it('é um valor booleano e vale nas duas tabelas', () => {
        assert.ok(VALORES_BOOLEANOS_REVISAO.includes('obraPessoal'));
        assert.equal(valorAplica('intertextualidade', 'obraPessoal'), true);
        assert.equal(valorAplica('hipertextualidade', 'obraPessoal'), true);
    });

    it('cada linha traz se a entrada está marcada', () => {
        const linhas = listarLinhasRevisao(cenario());
        const marcada = Object.fromEntries(linhas.map((l) => [l.chave, l.valores.obraPessoal]));
        assert.deepEqual(marcada, { [INTER0]: true, [INTER1]: false, [HIPER0]: false });
    });

    it('marcar grava true, na Inter e na Hiper; o Desfazer tira de novo', () => {
        const e = cenario();
        const plano = planejarRevisao(e, [...edicao(INTER1, true), ...edicao(HIPER0, true)]);
        assert.equal(plano.erro, '');
        assert.equal(plano.entradas, 2);
        assert.equal(plano.camposAlterados.obraPessoal, 2);
        const feito = aplicarRevisao(plano);
        assert.equal(e.poemas[0].intertextualidade[1].obraPessoal, true);
        assert.equal(e.poemas[0].hipertextualidade[0].obraPessoal, true);
        feito.desfazer();
        assert.equal('obraPessoal' in e.poemas[0].intertextualidade[1], false);
        assert.equal('obraPessoal' in e.poemas[0].hipertextualidade[0], false);
    });

    it('desmarcar tira a chave; o Desfazer devolve a marca', () => {
        const e = cenario();
        const feito = aplicarRevisao(planejarRevisao(e, edicao(INTER0, false)));
        assert.equal('obraPessoal' in e.poemas[0].intertextualidade[0], false);
        feito.desfazer();
        assert.equal(e.poemas[0].intertextualidade[0].obraPessoal, true);
    });

    it('editar para o que já está não é mudança; texto no lugar do check é ignorado', () => {
        const e = cenario();
        assert.equal(planejarRevisao(e, edicao(INTER0, true)).entradas, 0);
        assert.equal(planejarRevisao(e, edicao(INTER1, 'sim')).entradas, 0);
    });

    it('a frase da confirmação mostra "obra pessoal: não → sim"', () => {
        const plano = planejarRevisao(cenario(), edicao(INTER1, true));
        assert.match(descreverRevisao(plano).linhas[0], /obra pessoal: não → sim/);
    });
});
