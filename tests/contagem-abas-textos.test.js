import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

document.body.innerHTML = `
    <main>
        <p id="contagem-poemas"></p>
        <p id="contagem-prosas"></p>
        <p id="contagem-elementos"></p>
        <select id="filtro-livro-poemas"></select>
        <select id="filtro-livro-prosas"></select>
        <select id="filtro-livro-elementos"></select>
        <select id="filtro-tipo-elementos"></select>
        <table><tbody id="lista-poemas"></tbody></table>
        <table><tbody id="lista-prosas"></tbody></table>
        <div id="lista-elementos"></div>
    </main>
`;

const { db } = await import('../js/db.js');
const {
    renderPoemas,
    renderProsas,
    renderElementos,
    setFiltroLivroElementos,
    setFiltroTipoElementos,
    setFiltroPoemas,
    setFiltroProsas,
} = await import('../js/render-listas.js');
await import('../js/main.js');

const texto = (id) => document.getElementById(id).textContent;

function limpar() {
    db.livros.length = 0;
    db.partes.length = 0;
    db.secoes.length = 0;
    db.poemas.length = 0;
    db.prosas.length = 0;
    db.elementos.length = 0;
    setFiltroLivroElementos('');
    setFiltroTipoElementos('');
    setFiltroPoemas('');
    setFiltroProsas('');
}

describe('Contagem sob o título das abas de textos', () => {
    beforeEach(limpar);

    it('Poemas: total sem filtro, singular e "N de M" com busca', () => {
        db.poemas.push({ id: 1, titulo: 'Alfa', texto: 'a' });
        renderPoemas();
        assert.equal(texto('contagem-poemas'), '1 poema');

        db.poemas.push({ id: 2, titulo: 'Beta', texto: 'b' });
        db.poemas.push({ id: 3, titulo: 'Gama', texto: 'c' });
        renderPoemas();
        assert.equal(texto('contagem-poemas'), '3 poemas');

        setFiltroPoemas('Beta');
        renderPoemas();
        assert.equal(texto('contagem-poemas'), '1 de 3 poemas');
    });

    it('Poemas: descartados e privados entram no total', () => {
        db.poemas.push({ id: 1, titulo: 'Alfa', texto: 'a', status: 'publicado' });
        db.poemas.push({ id: 2, titulo: 'Beta', texto: 'b', status: 'descartado' });
        db.poemas.push({ id: 3, titulo: 'Gama', texto: 'c', status: 'privado' });
        renderPoemas();
        assert.equal(texto('contagem-poemas'), '3 poemas');
    });

    it('Poemas: lista vazia mostra "0 poemas"', () => {
        renderPoemas();
        assert.equal(texto('contagem-poemas'), '0 poemas');
    });

    it('Prosas: total e "N de M" com busca', () => {
        db.prosas.push({ id: 1, titulo: 'Um', texto: 'a' });
        db.prosas.push({ id: 2, titulo: 'Dois', texto: 'b' });
        renderProsas();
        assert.equal(texto('contagem-prosas'), '2 prosas');

        setFiltroProsas('Dois');
        renderProsas();
        assert.equal(texto('contagem-prosas'), '1 de 2 prosas');
    });

    it('Elementos: total e "N de M" com filtro de tipo', () => {
        const base = { paiTipo: 'livro', paiId: 1, texto: 'x' };
        db.livros.push({ id: 1, titulo: 'Livro A', tipo: 'Livro', sequencia: 1 });
        db.elementos.push({ id: 1, ...base, tipo: 'Epígrafe', sequencia: 1 });
        renderElementos();
        assert.equal(texto('contagem-elementos'), '1 elemento');

        db.elementos.push({ id: 2, ...base, tipo: 'Pórtico', sequencia: 2 });
        db.elementos.push({ id: 3, ...base, tipo: 'Pórtico', sequencia: 3 });
        renderElementos();
        assert.equal(texto('contagem-elementos'), '3 elementos');

        setFiltroTipoElementos('Pórtico');
        renderElementos();
        assert.equal(texto('contagem-elementos'), '2 de 3 elementos');
    });

    it('os títulos das abas e as linhas de contagem existem no index.html', () => {
        const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
        assert.ok(html.includes('<h2 class="text-xl font-semibold">Poemas</h2>'));
        assert.ok(!html.includes('Conteúdo Literário'));
        for (const id of ['contagem-poemas', 'contagem-prosas', 'contagem-elementos']) {
            assert.ok(html.includes(`id="${id}"`), id);
        }
    });
});
