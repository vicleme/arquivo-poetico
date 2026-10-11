import './helpers/dom-real.js';

import fs from 'node:fs';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Busca por papel do Assunto: assuntoprincipal:, assuntosecundario: e
// assuntoindefinido: (sinônimo assuntosempapel:). O papel é o efetivo no
// texto (herdado do Tema ou fixado na mão); `assunto:` acha em qualquer papel.
const { db } = await import('../js/db.js');
const { filtrarTextos, PREFIXOS_CANONICOS_POR_CAMPO } = await import('../js/utils.js');
const { decorarCamposBusca } = await import('../js/render-listas.js');

const ids = (lista) => lista.map((i) => i.id);

function montar() {
    db.temas = [
        { id: 1, nome: 'Amor', notas: '' },
        { id: 2, nome: 'Machismo', notas: '' },
        { id: 3, nome: 'Brasil', notas: '' },
    ];
    db.assuntos = [
        { id: 10, nome: 'Vida emocional', notas: '', temaIds: [1] },
        { id: 11, nome: 'Sociedade', notas: '', temaIds: [2, 3] },
    ];
    db.pessoas = [];
    db.grupos = [];
    db.autores = [];
    db.livros = [];
    db.epocas = [];
    db.periodosHistoricos = [];
    db.movimentosEscolas = [];
    // 1: Amor principal, Brasil indefinido → Vida emocional principal, Sociedade indefinido.
    // 2: Amor secundário, Machismo principal → Vida emocional secundário, Sociedade principal.
    // 3: só Brasil indefinido, mas com Sociedade fixada como secundário.
    // 4: sem temas.
    const itens = [
        {
            id: 1,
            titulo: 'Um',
            sinalizacoesTema: 'Amor, Brasil',
            temas: [
                { temaId: 1, papel: 'principal' },
                { temaId: 3, papel: '' },
            ],
        },
        {
            id: 2,
            titulo: 'Dois',
            sinalizacoesTema: 'Amor, Machismo',
            temas: [
                { temaId: 1, papel: 'secundario' },
                { temaId: 2, papel: 'principal' },
            ],
        },
        {
            id: 3,
            titulo: 'Três',
            sinalizacoesTema: 'Brasil',
            temas: [{ temaId: 3, papel: '' }],
            assuntosPapel: [{ assuntoId: 11, papel: 'secundario' }],
        },
        { id: 4, titulo: 'Quatro', sinalizacoesTema: '', temas: [] },
    ];
    return itens.map((i) => decorarCamposBusca(i));
}

describe('campos decorados de Assunto por papel', () => {
    let itens;
    beforeEach(() => {
        itens = montar();
    });

    it('trazem os nomes dos Assuntos em cada papel efetivo', () => {
        assert.equal(itens[0]._buscaAssuntoPrincipal, 'Vida emocional');
        assert.equal(itens[0]._buscaAssuntoSecundario, '');
        assert.equal(itens[0]._buscaAssuntoIndefinido, 'Sociedade');
        assert.equal(itens[1]._buscaAssuntoPrincipal, 'Sociedade');
        assert.equal(itens[1]._buscaAssuntoSecundario, 'Vida emocional');
        assert.equal(itens[3]._buscaAssuntoPrincipal, '');
    });
});

describe('prefixos assuntoprincipal:, assuntosecundario:, assuntoindefinido:', () => {
    let itens;
    beforeEach(() => {
        itens = montar();
    });

    it('assuntoprincipal: acha só onde o papel efetivo é principal', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'assuntoprincipal:"vida emocional"')), [1]);
        assert.deepEqual(ids(filtrarTextos(itens, 'assuntoprincipal:sociedade')), [2]);
    });

    it('assuntosecundario: acha só onde o papel efetivo é secundário', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'assuntosecundario:"vida emocional"')), [2]);
        assert.deepEqual(ids(filtrarTextos(itens, 'assuntosecundario:sociedade')), [3]);
    });

    it('assuntoindefinido: e o sinônimo assuntosempapel: acham o papel Indefinido', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'assuntoindefinido:sociedade')), [1]);
        assert.deepEqual(ids(filtrarTextos(itens, 'assuntosempapel:sociedade')), [1]);
    });

    it('papel fixado no texto vale na busca (Sociedade no texto 3)', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'assuntoindefinido:sociedade')), [1]);
        assert.deepEqual(ids(filtrarTextos(itens, 'assuntosecundario:sociedade')), [3]);
    });

    it('assunto: continua achando em qualquer papel', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'assunto:sociedade')), [1, 2, 3]);
        assert.deepEqual(ids(filtrarTextos(itens, 'assunto:"vida emocional"')), [1, 2]);
    });

    it('combina com E e com exclusão, como os demais prefixos', () => {
        assert.deepEqual(
            ids(
                filtrarTextos(
                    itens,
                    'assuntoprincipal:sociedade assuntosecundario:"vida emocional"',
                ),
            ),
            [2],
        );
        assert.deepEqual(
            ids(filtrarTextos(itens, 'assunto:sociedade -assuntoprincipal:sociedade')),
            [1, 3],
        );
    });

    it('assuntoprincipal:* acha quem tem algum Assunto principal', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'assuntoprincipal:*')), [1, 2]);
    });

    it('prefixos canônicos existem para a UI (legenda e atalho de coluna)', () => {
        assert.equal(PREFIXOS_CANONICOS_POR_CAMPO._buscaAssuntoPrincipal, 'assuntoprincipal');
        assert.equal(PREFIXOS_CANONICOS_POR_CAMPO._buscaAssuntoSecundario, 'assuntosecundario');
        assert.equal(PREFIXOS_CANONICOS_POR_CAMPO._buscaAssuntoIndefinido, 'assuntoindefinido');
    });
});

describe('legenda de busca no index.html', () => {
    it('lista os três prefixos em Poemas e em Prosas', () => {
        const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
        const vezes = (trecho) => html.split(trecho).length - 1;
        assert.equal(vezes('<code>assuntoprincipal:</code>'), 2);
        assert.equal(vezes('<code>assuntosecundario:</code>'), 2);
        assert.equal(vezes('<code>assuntoindefinido:</code>'), 2);
    });

    it('o gráfico de Temas e Assuntos não tem mais seletor de papel (os três papéis vão empilhados)', () => {
        const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
        assert.ok(!html.includes('painel-papel-assunto'));
        assert.match(html, /id="grafico-temas-assuntos"/);
    });
});
