import './helpers/dom-real.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Prefixos dataescrita: e datapublicacao: — `*` / `-*` separam quem tem e quem
// não tem a data (o filtro De/Até continua à parte e exclui os sem data).
const { db } = await import('../js/db.js');
const { filtrarTextos, PREFIXOS_CANONICOS_POR_CAMPO } = await import('../js/utils.js');
const { decorarCamposBusca } = await import('../js/render-listas.js');

const ids = (lista) => lista.map((i) => i.id);

function montar() {
    db.pessoas = [];
    db.grupos = [];
    db.autores = [];
    db.livros = [];
    db.epocas = [];
    db.periodosHistoricos = [];
    db.movimentosEscolas = [];
    db.temas = [];
    db.assuntos = [];
    const itens = [
        {
            id: 1,
            titulo: 'Completo',
            dataEscrita: { dia: 15, mes: 3, ano: 2020, exata: true },
            dataPublicacao: { ano: 2021 },
        },
        { id: 2, titulo: 'Só escrita', dataEscrita: { mes: 7, ano: 2019 } },
        { id: 3, titulo: 'Só ano legado', ano: 2018 },
        { id: 4, titulo: 'Objeto vazio', dataEscrita: {}, dataPublicacao: null },
        { id: 5, titulo: 'Só hora', dataEscrita: { hora: 10, minuto: 30 } },
    ];
    return itens.map((i) => decorarCamposBusca(i));
}

describe('campos decorados de data', () => {
    it('trazem o texto da data e ficam vazios sem dia/mês/ano', () => {
        const itens = montar();
        assert.equal(itens[0]._buscaDataEscrita, '15/03/2020');
        assert.equal(itens[0]._buscaDataPublicacao, '2021');
        assert.equal(itens[1]._buscaDataEscrita, '07/2019');
        assert.equal(itens[1]._buscaDataPublicacao, '');
        assert.equal(itens[2]._buscaDataEscrita, '');
        assert.equal(itens[3]._buscaDataEscrita, '');
        assert.equal(itens[4]._buscaDataEscrita, '');
    });
});

describe('prefixos dataescrita: e datapublicacao:', () => {
    it('dataescrita:* acha quem tem a data; -dataescrita:* quem não tem', () => {
        const itens = montar();
        assert.deepEqual(ids(filtrarTextos(itens, 'dataescrita:*')), [1, 2]);
        assert.deepEqual(ids(filtrarTextos(itens, '-dataescrita:*')), [3, 4, 5]);
    });

    it('datapublicacao:* e -datapublicacao:* funcionam igual', () => {
        const itens = montar();
        assert.deepEqual(ids(filtrarTextos(itens, 'datapublicacao:*')), [1]);
        assert.deepEqual(ids(filtrarTextos(itens, '-datapublicacao:*')), [2, 3, 4, 5]);
    });

    it('também busca pelo texto da data', () => {
        const itens = montar();
        assert.deepEqual(ids(filtrarTextos(itens, 'dataescrita:2020')), [1]);
        assert.deepEqual(ids(filtrarTextos(itens, 'dataescrita:2019')), [2]);
    });

    it('combina com outros prefixos: escrita sem publicação', () => {
        const itens = montar();
        assert.deepEqual(ids(filtrarTextos(itens, 'dataescrita:* -datapublicacao:*')), [2]);
    });

    it('prefixos canônicos registrados', () => {
        assert.equal(PREFIXOS_CANONICOS_POR_CAMPO._buscaDataEscrita, 'dataescrita');
        assert.equal(PREFIXOS_CANONICOS_POR_CAMPO._buscaDataPublicacao, 'datapublicacao');
    });
});
