import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Triagem do filtro "Só sem assunto" da aba Temas: a lista é congelada ao
// ligar o filtro, e o tema que ganha assunto fica marcado em vez de sumir.
document.body.innerHTML = `
    <main>
        <input id="busca-temas" />
        <input type="checkbox" id="filtro-temas-sem-assunto" />
        <button id="atualizar-temas-sem-assunto" class="hidden">Atualizar lista</button>
        <select id="ordem-temas">
            <option value="alfabetica"></option>
            <option value="usados"></option>
        </select>
        <span id="resumo-temas"></span>
        <div id="lista-temas"></div>
    </main>
`;

const { db } = await import('../js/db.js');
const { renderTemas, atualizarListaSemAssunto, filtrarTemasSemAssunto, definirBuscaTemas } =
    await import('../js/render-listas.js');

const $ = (id) => document.getElementById(id);
const nomes = () => [...$('lista-temas').querySelectorAll('h4')].map((h) => h.textContent);
const marcados = () =>
    [...$('lista-temas').querySelectorAll('[data-atribuido="true"] h4')].map((h) => h.textContent);
const ligarFiltro = () => {
    $('filtro-temas-sem-assunto').checked = true;
    renderTemas();
};

function preparar() {
    db.poemas = [];
    db.prosas = [];
    db.temas = [
        { id: 1, nome: 'Amor', notas: '' },
        { id: 2, nome: 'Brasil', notas: '' },
        { id: 3, nome: 'Cidade', notas: '' },
        { id: 4, nome: 'Machismo', notas: '' },
    ];
    db.assuntos = [
        { id: 10, nome: 'Sociedade', notas: '', temaIds: [4] },
        { id: 11, nome: 'Afetos', notas: '', temaIds: [] },
    ];
    $('busca-temas').value = '';
    $('filtro-temas-sem-assunto').checked = false;
    $('ordem-temas').value = 'alfabetica';
    renderTemas(); // desligado: zera o retrato da triagem
}

describe('triagem de "Só sem assunto"', () => {
    beforeEach(preparar);

    it('ao ligar o filtro, mostra só os temas sem assunto e o botão Atualizar aparece', () => {
        assert.ok($('atualizar-temas-sem-assunto').classList.contains('hidden'));
        ligarFiltro();
        assert.deepEqual(nomes(), ['Amor', 'Brasil', 'Cidade']);
        assert.ok(!$('atualizar-temas-sem-assunto').classList.contains('hidden'));
        assert.equal($('atualizar-temas-sem-assunto').textContent, 'Atualizar lista');
    });

    it('tema que ganha assunto continua na lista, marcado, e o resumo conta', () => {
        ligarFiltro();
        db.assuntos[1].temaIds.push(1); // Amor → Afetos
        renderTemas();
        assert.deepEqual(nomes(), ['Amor', 'Brasil', 'Cidade']);
        assert.deepEqual(marcados(), ['Amor']);
        assert.match($('lista-temas').textContent, /✓ atribuído/);
        assert.match($('resumo-temas').textContent, /1 atribuído nesta triagem/);
        assert.equal(
            $('atualizar-temas-sem-assunto').textContent,
            'Atualizar lista (1 já atribuído sai)',
        );
    });

    it('um tema pode receber vários assuntos em sequência sem sumir', () => {
        ligarFiltro();
        db.assuntos[1].temaIds.push(3);
        renderTemas();
        db.assuntos[0].temaIds.push(3);
        renderTemas();
        assert.ok(nomes().includes('Cidade'));
        assert.deepEqual(marcados(), ['Cidade']);
    });

    it('"Atualizar lista" tira os atribuídos e esconde a marca', () => {
        ligarFiltro();
        db.assuntos[1].temaIds.push(1, 2);
        renderTemas();
        assert.equal(marcados().length, 2);
        atualizarListaSemAssunto();
        assert.deepEqual(nomes(), ['Cidade']);
        assert.deepEqual(marcados(), []);
        assert.doesNotMatch($('resumo-temas').textContent, /nesta triagem/);
    });

    it('tema novo no cadastro só entra na lista depois de Atualizar', () => {
        ligarFiltro();
        db.temas.push({ id: 5, nome: 'Exílio', notas: '' });
        renderTemas();
        assert.ok(!nomes().includes('Exílio'));
        atualizarListaSemAssunto();
        assert.ok(nomes().includes('Exílio'));
    });

    it('desligar e ligar o filtro tira um novo retrato', () => {
        ligarFiltro();
        db.assuntos[1].temaIds.push(1);
        renderTemas();
        $('filtro-temas-sem-assunto').checked = false;
        renderTemas();
        assert.ok($('atualizar-temas-sem-assunto').classList.contains('hidden'));
        ligarFiltro();
        assert.deepEqual(nomes(), ['Brasil', 'Cidade']);
    });

    it('filtrarTemasSemAssunto (atalho da aba Assuntos) sempre começa com retrato novo', () => {
        ligarFiltro();
        db.assuntos[1].temaIds.push(1);
        renderTemas();
        filtrarTemasSemAssunto();
        assert.deepEqual(nomes(), ['Brasil', 'Cidade']);
    });

    it('definirBuscaTemas desliga o filtro e esconde o botão', () => {
        ligarFiltro();
        definirBuscaTemas('Machismo');
        assert.ok($('atualizar-temas-sem-assunto').classList.contains('hidden'));
        assert.deepEqual(nomes(), ['Machismo']);
    });

    it('a busca vale por cima do retrato, sem refazê-lo', () => {
        ligarFiltro();
        $('busca-temas').value = 'bra';
        renderTemas();
        assert.deepEqual(nomes(), ['Brasil']);
        $('busca-temas').value = '';
        renderTemas();
        assert.deepEqual(nomes(), ['Amor', 'Brasil', 'Cidade']);
    });

    it('sem nenhum tema sem assunto, avisa que todos já têm', () => {
        db.assuntos[1].temaIds.push(1, 2, 3);
        renderTemas();
        ligarFiltro();
        assert.match($('lista-temas').textContent, /Todos os temas já têm assunto/);
    });
});
