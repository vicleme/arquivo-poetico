import './helpers/localstorage-shim.js';
import './helpers/dom-shim.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { db } from '../js/db.js';
import { titulosDeColetaneasDoTexto } from '../js/coletaneas-do-texto.js';
import { renderVisualizacaoHtml } from '../js/visualizar.js';

function dados() {
    return {
        livros: [
            { id: 1, tipo: 'Coletânea', titulo: 'Seleta B', sequencia: 2 },
            { id: 2, tipo: 'Livro', titulo: 'Livro comum', sequencia: 1 },
            { id: 3, tipo: 'Coletânea', titulo: 'Seleta A', sequencia: 1 },
            { id: 4, tipo: 'Coletânea', titulo: 'Seleta sem sequência' },
        ],
        partes: [
            { id: 10, livroId: 1, titulo: 'Parte 1' },
            { id: 11, livroId: 1, titulo: 'Parte 2' },
            { id: 12, livroId: 3, titulo: 'Parte única' },
            { id: 13, livroId: 4, titulo: 'Parte x' },
            { id: 14, livroId: 2, titulo: 'Parte de livro comum' },
        ],
        itensColetanea: [
            { id: 1, parteId: 10, refTipo: 'poema', refId: 50 },
            { id: 2, parteId: 11, refTipo: 'poema', refId: 50 }, // mesma Coletânea, outra Parte
            { id: 3, parteId: 12, refTipo: 'poema', refId: 50 },
            { id: 4, parteId: 13, refTipo: 'poema', refId: 50 },
            { id: 5, parteId: 14, refTipo: 'poema', refId: 50 }, // Livro comum, não é Coletânea
            { id: 6, parteId: 10, refTipo: 'prosa', refId: 50 }, // mesmo refId, outro tipo
            { id: 7, parteId: 999, refTipo: 'poema', refId: 51 }, // Parte que não existe mais
        ],
    };
}

describe('titulosDeColetaneasDoTexto', () => {
    it('sem id (texto ainda não salvo), devolve lista vazia', () => {
        assert.deepEqual(titulosDeColetaneasDoTexto(dados(), 'poema', null), []);
    });

    it('lista as Coletâneas na ordem do acervo, sem sequência no fim', () => {
        assert.deepEqual(titulosDeColetaneasDoTexto(dados(), 'poema', 50), [
            'Seleta A',
            'Seleta B',
            'Seleta sem sequência',
        ]);
    });

    it('cada Coletânea aparece uma vez, mesmo com o texto em duas Partes dela', () => {
        const r = titulosDeColetaneasDoTexto(dados(), 'poema', 50);
        assert.equal(r.filter((t) => t === 'Seleta B').length, 1);
    });

    it('ignora Livro comum e não confunde poema com prosa', () => {
        const d = dados();
        assert.ok(!titulosDeColetaneasDoTexto(d, 'poema', 50).includes('Livro comum'));
        assert.deepEqual(titulosDeColetaneasDoTexto(d, 'prosa', 50), ['Seleta B']);
    });

    it('ignora item cuja Parte não existe mais', () => {
        assert.deepEqual(titulosDeColetaneasDoTexto(dados(), 'poema', 51), []);
    });

    it('funciona com db sem as listas', () => {
        assert.deepEqual(titulosDeColetaneasDoTexto({}, 'poema', 50), []);
    });
});

describe('Ver de Poema e Prosa: linha Coletâneas', () => {
    beforeEach(() => {
        Object.assign(db, dados());
    });

    it('mostra "Coletâneas:" com os títulos, na ordem do acervo', () => {
        const html = renderVisualizacaoHtml({ id: 50, tipo: 'poema', titulo: 'T', texto: 'x' });
        assert.match(html, /Coletâneas:<\/strong> Seleta A, Seleta B, Seleta sem sequência/);
    });

    it('na Prosa, só as Coletâneas dela', () => {
        const html = renderVisualizacaoHtml({ id: 50, tipo: 'prosa', titulo: 'T', texto: 'x' });
        assert.match(html, /Coletâneas:<\/strong> Seleta B</);
        assert.ok(!html.includes('Seleta A'));
    });

    it('texto fora de qualquer Coletânea não ganha a linha', () => {
        const html = renderVisualizacaoHtml({ id: 99, tipo: 'poema', titulo: 'T', texto: 'x' });
        assert.ok(!html.includes('Coletâneas:'));
    });
});
