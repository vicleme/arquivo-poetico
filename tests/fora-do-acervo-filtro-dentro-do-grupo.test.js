import './helpers/dom-real.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    montarForaDoAcervo,
    filtrarAutores,
    filtrarOrigens,
    filtrarObras,
} from '../js/fora-do-acervo.js';

// Filtro por campo DENTRO de cada autor e origem (T15): o item é refeito só com
// as obras que sobram, e some apenas quando não sobra nenhuma.

function dados() {
    return montarForaDoAcervo({
        poemas: [
            {
                id: 1,
                titulo: 'Fogo roubado',
                intertextualidade: [
                    {
                        relacao: 'Alusão',
                        tipoObra: 'Mito',
                        obra: 'Prometeu',
                        origemObra: ['Grécia'],
                    },
                    {
                        relacao: 'Citação',
                        tipoObra: 'Livro',
                        obra: 'Diário de bordo',
                        autor: 'Eu',
                        origemObra: ['Grécia'],
                        obraPessoal: true,
                    },
                ],
            },
            {
                id: 2,
                titulo: 'Titã',
                intertextualidade: [
                    {
                        relacao: 'Citação',
                        tipoObra: 'Livro',
                        obra: 'Rascunho meu',
                        autor: 'Eu',
                        origemObra: ['Roma'],
                        obraPessoal: true,
                    },
                    { relacao: 'Paródia', tipoObra: 'Livro', obra: 'Odisseia', autor: 'Homero' },
                ],
            },
        ],
        prosas: [],
    });
}

const nomes = (lista, campo) => lista.map((x) => x[campo]);

describe('filtro por campo dentro de Origens', () => {
    it('-pessoal:* mantém a origem com só as obras não pessoais', () => {
        const antes = dados().origens.find((g) => g.origem === 'Grécia');
        assert.equal(antes.totalObras, 2);
        const r = filtrarOrigens(dados().origens, '-pessoal:*');
        const grecia = r.find((g) => g.origem === 'Grécia');
        assert.ok(grecia, 'a Grécia não some');
        assert.deepEqual(nomes(grecia.obras, 'obra'), ['Prometeu']);
        assert.equal(grecia.totalObras, 1);
        assert.deepEqual(
            grecia.textos.map((t) => t.titulo),
            ['Fogo roubado'],
        );
        assert.deepEqual(grecia.autores, []);
    });

    it('a origem some quando todas as obras dela são pessoais', () => {
        const r = filtrarOrigens(dados().origens, '-pessoal:*');
        assert.equal(
            r.find((g) => g.origem === 'Roma'),
            undefined,
        );
    });

    it('pessoal:* deixa só as obras pessoais', () => {
        const r = filtrarOrigens(dados().origens, 'pessoal:*');
        assert.deepEqual(nomes(r, 'origem').sort(), ['Grécia', 'Roma']);
        assert.deepEqual(nomes(r.find((g) => g.origem === 'Grécia').obras, 'obra'), [
            'Diário de bordo',
        ]);
    });

    it('origem: casa pelo nome da origem e mantém todas as obras dela', () => {
        const r = filtrarOrigens(dados().origens, 'origem:grecia');
        assert.deepEqual(nomes(r, 'origem'), ['Grécia']);
        assert.equal(r[0].totalObras, 2);
    });

    it('-origem:* acha só o item sem origem, inteiro', () => {
        const r = filtrarOrigens(dados().origens, '-origem:*');
        assert.equal(r.length, 1);
        assert.equal(r[0].semOrigem, true);
    });

    it('as condições de um mesmo ramo valem para a mesma obra', () => {
        // Prometeu é Mito e não pessoal; Diário é Livro e pessoal.
        assert.equal(filtrarOrigens(dados().origens, 'tipo:Mito pessoal:*').length, 0);
        const r = filtrarOrigens(dados().origens, 'tipo:Mito -pessoal:*');
        assert.deepEqual(nomes(r, 'origem'), ['Grécia']);
    });

    it('pessoal:algumas continua achando a origem mista, inteira', () => {
        const r = filtrarOrigens(dados().origens, 'pessoal:algumas');
        assert.deepEqual(nomes(r, 'origem'), ['Grécia']);
        assert.equal(r[0].totalObras, 2);
    });

    it('a consulta sem prefixo segue a busca de antes, no item inteiro', () => {
        const r = filtrarOrigens(dados().origens, 'Prometeu');
        assert.deepEqual(nomes(r, 'origem'), ['Grécia']);
        assert.equal(r[0].totalObras, 2);
    });

    it('não altera os dados originais', () => {
        const d = dados();
        filtrarOrigens(d.origens, '-pessoal:*');
        assert.equal(d.origens.find((g) => g.origem === 'Grécia').totalObras, 2);
    });
});

describe('filtro por campo dentro de Autores', () => {
    it('-pessoal:* tira as obras pessoais do autor e o autor some se não sobra nenhuma', () => {
        const r = filtrarAutores(dados().autores, '-pessoal:*');
        assert.deepEqual(nomes(r, 'autor'), ['Homero']);
    });

    it('relacao: refaz as obras do autor', () => {
        const r = filtrarAutores(dados().autores, 'relacao:Citação');
        const eu = r.find((a) => a.autor === 'Eu');
        assert.equal(eu.obras.length, 2);
        assert.deepEqual(nomes(r, 'autor'), ['Eu']);
    });

    it('autor: casa pelo nome e mantém as obras', () => {
        const r = filtrarAutores(dados().autores, 'autor:eu');
        assert.equal(r.length, 1);
        assert.equal(r[0].obras.length, 2);
    });
});

describe('filtro de Obras continua exato por obra', () => {
    it('-pessoal:* esconde só as obras pessoais', () => {
        const r = filtrarObras(dados().obras, '-pessoal:*');
        assert.deepEqual(nomes(r, 'obra').sort(), ['Odisseia', 'Prometeu']);
    });
});
