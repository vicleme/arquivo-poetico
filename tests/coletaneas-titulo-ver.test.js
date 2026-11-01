import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Aba Coletâneas: o título de poema ou prosa do acervo é um link para o Ver do
// texto (`verTextoDaColetanea`, ligado em main.js); inédito e referência que
// não existe mais ficam como texto simples.

globalThis.indexedDB = { open: () => ({}) };

document.body.innerHTML = `
    <div id="lista-coletaneas"></div>
    <div id="editor-coletanea"></div>`;

const { db } = await import('../js/db.js');
const { renderColetaneas, selecionarColetanea } = await import('../js/coletaneas.js');

function dados() {
    db.livros = [{ id: 3, titulo: 'Coletânea X', sequencia: 1, tipo: 'Coletânea' }];
    db.partes = [{ id: 30, livroId: 3, titulo: 'Parte da X', sequencia: 1 }];
    db.secoes = [];
    db.elementos = [];
    db.poemas = [{ id: 1, titulo: 'Poema do acervo', texto: 'x', status: 'completo' }];
    db.prosas = [{ id: 2, titulo: 'Prosa do acervo', texto: 'y', status: 'completo' }];
    db.itensColetanea = [
        { id: 1, parteId: 30, refTipo: 'poema', refId: 1, titulo: 'Poema do acervo', sequencia: 1 },
        { id: 2, parteId: 30, refTipo: 'prosa', refId: 2, titulo: 'Prosa do acervo', sequencia: 2 },
        { id: 3, parteId: 30, refTipo: null, refId: null, titulo: 'Inédito aqui', sequencia: 3 },
        { id: 4, parteId: 30, refTipo: 'poema', refId: 99, titulo: 'Sumiu', sequencia: 4 },
        {
            id: 5,
            parteId: 30,
            refTipo: 'poema',
            refId: 1,
            titulo: 'Poema do acervo',
            textoOverride: 'versão',
            sequencia: 5,
        },
    ];
}

const botoes = () =>
    Array.from(document.querySelectorAll('#editor-coletanea button[onclick^="verTexto"]'));

describe('Aba Coletâneas: título linkado ao Ver', () => {
    beforeEach(() => {
        dados();
        selecionarColetanea(3);
        renderColetaneas();
    });

    it('poema e prosa do acervo viram link; inédito e referência perdida não', () => {
        const chamadas = botoes().map((b) => b.getAttribute('onclick'));
        assert.deepEqual(chamadas, [
            "verTextoDaColetanea('poema',1)",
            "verTextoDaColetanea('prosa',2)",
            "verTextoDaColetanea('poema',1)",
        ]);
        const html = document.getElementById('editor-coletanea').textContent;
        assert.match(html, /Inédito aqui/);
        assert.match(html, /Sumiu/);
    });

    it('com versão alternativa, o link avisa que o Ver abre o texto do acervo', () => {
        const [normal, , alternativa] = botoes();
        assert.equal(normal.title, 'Abrir o Ver do texto');
        assert.match(alternativa.title, /versão alternativa/);
    });
});
