import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Aba Assunto (renderAssuntos em render-listas.js): cards dos Assuntos,
// contagem de textos derivada dos Temas e linha-aviso "N temas sem assunto"
// (que leva à aba Temas filtrada). O Assunto guarda ids (`temaIds`).
// Também cobre o fluxo do select de atribuição (atribuirTemaDoPainel), que
// hoje mora nos cartões da aba Temas.
document.body.innerHTML = `
    <main>
        <div id="lista-assuntos"></div>
        <div id="temas-sem-assunto"></div>
        <input id="busca-temas" />
        <input type="checkbox" id="filtro-temas-sem-assunto" />
    </main>
`;

const { db } = await import('../js/db.js');
const { renderAssuntos } = await import('../js/render-listas.js');
const { atribuirTemaDoPainel } = await import('../js/forms.js');

const lista = () => document.getElementById('lista-assuntos');
const aviso = () => document.getElementById('temas-sem-assunto');

const TEMAS = () => [
    { id: 1, nome: 'Machismo', notas: '' },
    { id: 2, nome: 'Brasil', notas: '' },
    { id: 3, nome: 'Objetificação', notas: '' },
    { id: 4, nome: 'Amor', notas: '' },
    { id: 5, nome: 'Fantasma', notas: '' },
];

describe('renderAssuntos (DOM real via happy-dom)', () => {
    beforeEach(() => {
        db.poemas = [
            { id: 1, titulo: 'A', sinalizacoesTema: 'Machismo, Brasil' },
            { id: 2, titulo: 'B', sinalizacoesTema: 'machismo' },
        ];
        db.prosas = [{ id: 3, titulo: 'C', sinalizacoesTema: 'Objetificação, Amor' }];
        db.temas = TEMAS();
        db.assuntos = [
            { id: 10, nome: 'Sociedade', notas: '', temaIds: [1] },
            { id: 11, nome: 'Gênero', notas: '', temaIds: [1, 3, 5] },
        ];
    });

    it('lista os Assuntos em ordem alfabética com contagem de textos', () => {
        renderAssuntos();
        const nomes = [...lista().querySelectorAll('h4')].map((h) => h.textContent);
        assert.deepEqual(nomes, ['Gênero', 'Sociedade']);
        const textoCards = lista().textContent;
        assert.match(textoCards, /3 temas · aparece em 3 textos/);
        assert.match(textoCards, /1 tema · aparece em 2 textos/);
    });

    it('marca como sem uso o tema do Assunto que nenhum texto tem', () => {
        renderAssuntos();
        const fantasma = [...lista().querySelectorAll('[data-action="ir-para-tema"]')].find((s) =>
            s.textContent.includes('Fantasma'),
        );
        assert.match(fantasma.getAttribute('title'), /^Nenhum texto usa este tema/);
    });

    it('renomear o Tema no cadastro aparece no Assunto sem tocar nele', () => {
        db.temas.find((t) => t.id === 1).nome = 'Misoginia';
        renderAssuntos();
        assert.match(lista().textContent, /Misoginia/);
    });

    it('linha-aviso conta os temas do cadastro sem Assunto e tem o botão da aba Temas', () => {
        renderAssuntos();
        // Brasil e Amor não estão em nenhum Assunto
        assert.match(aviso().textContent, /2 temas sem assunto/);
        assert.ok(aviso().querySelector('[data-action="ir-para-temas-sem-assunto"]'));
    });

    it('todos os temas em algum assunto: aviso diz que não sobrou nenhum', () => {
        db.assuntos[0].temaIds.push(2, 4);
        renderAssuntos();
        assert.match(
            aviso().textContent,
            /Todos os temas cadastrados já pertencem a algum assunto/,
        );
        assert.equal(aviso().querySelector('button'), null);
    });

    it('sem Assuntos cadastrados: mensagem vazia na lista', () => {
        db.assuntos = [];
        renderAssuntos();
        assert.match(lista().textContent, /Nenhum assunto cadastrado ainda/);
    });

    it('sem nenhum tema no cadastro: aviso some', () => {
        db.poemas = [{ id: 1, titulo: 'A' }];
        db.prosas = [];
        db.temas = [];
        db.assuntos = [];
        renderAssuntos();
        assert.equal(aviso().textContent.trim(), '');
    });

    it('escapa HTML em nome de Assunto e de tema', () => {
        db.temas = [{ id: 1, nome: '<b>t</b>', notas: '' }];
        db.assuntos = [{ id: 1, nome: '<img src=x>', notas: '', temaIds: [1] }];
        renderAssuntos();
        assert.equal(lista().querySelector('img'), null);
        assert.equal(lista().querySelector('b'), null);
    });
});

describe('atribuirTemaDoPainel', () => {
    beforeEach(() => {
        db.poemas = [{ id: 1, titulo: 'A', sinalizacoesTema: 'Brasil' }];
        db.prosas = [];
        db.temas = [{ id: 2, nome: 'Brasil', notas: '' }];
        db.assuntos = [{ id: 10, nome: 'Sociedade', notas: '', temaIds: [] }];
    });

    const criarSelect = (valor) => {
        const select = document.createElement('select');
        select.dataset.tema = 'Brasil';
        select.innerHTML =
            '<option value="">Atribuir a…</option><option value="10">Sociedade</option>';
        select.value = valor;
        return select;
    };

    it('acrescenta o id do tema ao Assunto escolhido no select', () => {
        atribuirTemaDoPainel(criarSelect('10'));
        assert.deepEqual(db.assuntos[0].temaIds, [2]);
    });

    it('não faz nada com a opção "Atribuir a…" (valor vazio)', () => {
        atribuirTemaDoPainel(criarSelect(''));
        assert.deepEqual(db.assuntos[0].temaIds, []);
    });
});
