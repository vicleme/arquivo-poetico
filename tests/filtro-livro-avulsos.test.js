import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mesma base mínima de DOM usada em busca-numero.test.js
document.body.innerHTML = `
    <main>
        <div id="lista-livros"></div>
        <div id="barra-acoes-poemas" class="hidden">
            <span id="contador-selecao-poemas"></span>
        </div>
        <div id="barra-acoes-prosas" class="hidden">
            <span id="contador-selecao-prosas"></span>
        </div>
        <div id="painel-colunas-poemas"></div>
        <div id="painel-acoes-poemas"></div>
        <div id="painel-colunas-prosas"></div>
        <div id="painel-acoes-prosas"></div>
        <select id="filtro-livro-poemas"></select>
        <select id="filtro-livro-prosas"></select>
        <table>
            <thead><tr id="cabecalho-poemas"></tr></thead>
            <tbody id="lista-poemas"></tbody>
        </table>
        <div id="paginacao-poemas"></div>
        <table>
            <thead><tr id="cabecalho-prosas"></tr></thead>
            <tbody id="lista-prosas"></tbody>
        </table>
        <div id="paginacao-prosas"></div>
    </main>
`;

const { db } = await import('../js/db.js');
const rl = await import('../js/render-listas.js');
const {
    getListaVisivelPoemas,
    getListaVisivelProsas,
    setFiltroLivroPoemas,
    setFiltroLivroProsa,
    renderPoemas,
    renderProsas,
} = rl;
const { resetarColunas } = await import('../js/colunas.js');
await import('../js/main.js');

function limparDb() {
    db.livros.length = 0;
    db.partes.length = 0;
    db.secoes.length = 0;
    db.poemas.length = 0;
    db.prosas.length = 0;
    resetarColunas('poemas');
    resetarColunas('prosas');
    setFiltroLivroPoemas('');
    setFiltroLivroProsa('');
}

describe('Filtro "Avulsos" no select de livro (Poemas e Prosas)', () => {
    beforeEach(limparDb);

    it('opção "Avulsos" aparece no select junto de "Todos os livros", antes dos grupos de livro/coletânea', () => {
        db.livros.push({ id: 1, titulo: 'Livro Único', tipo: 'Livro', sequencia: 1 });
        renderPoemas();
        renderProsas();

        const valoresPoemas = Array.from(
            document.getElementById('filtro-livro-poemas').options,
        ).map((o) => o.value);
        const valoresProsas = Array.from(
            document.getElementById('filtro-livro-prosas').options,
        ).map((o) => o.value);

        assert.deepEqual(valoresPoemas.slice(0, 2), ['', '__avulsos__']);
        assert.deepEqual(valoresProsas.slice(0, 2), ['', '__avulsos__']);
    });

    it('Poemas: filtro "Avulsos" mostra só poemas sem paiTipo/paiId, ignorando os vinculados a livro', () => {
        db.livros.push({ id: 1, titulo: 'Livro Único', tipo: 'Livro', sequencia: 1 });
        db.poemas.push(
            { id: 10, titulo: 'Vinculado', paiTipo: 'livro', paiId: 1 },
            { id: 11, titulo: 'Solto A' },
            { id: 12, titulo: 'Solto B', paiTipo: null, paiId: null },
        );

        setFiltroLivroPoemas('__avulsos__');
        const visiveis = getListaVisivelPoemas();

        assert.deepEqual(visiveis.map((p) => p.titulo).sort(), ['Solto A', 'Solto B']);
    });

    it('Prosas: filtro "Avulsos" mostra só prosas sem paiTipo/paiId, ignorando as vinculadas a livro', () => {
        db.livros.push({ id: 1, titulo: 'Livro Único', tipo: 'Livro', sequencia: 1 });
        db.prosas.push(
            { id: 20, titulo: 'Vinculada', paiTipo: 'livro', paiId: 1 },
            { id: 21, titulo: 'Solta A' },
        );

        setFiltroLivroProsa('__avulsos__');
        const visiveis = getListaVisivelProsas();

        assert.deepEqual(
            visiveis.map((pr) => pr.titulo),
            ['Solta A'],
        );
    });

    it('voltar para "" (Todos os livros) depois de "Avulsos" mostra tudo de novo', () => {
        db.livros.push({ id: 1, titulo: 'Livro Único', tipo: 'Livro', sequencia: 1 });
        db.poemas.push(
            { id: 10, titulo: 'Vinculado', paiTipo: 'livro', paiId: 1 },
            { id: 11, titulo: 'Solto' },
        );

        setFiltroLivroPoemas('__avulsos__');
        assert.equal(getListaVisivelPoemas().length, 1);

        setFiltroLivroPoemas('');
        assert.equal(getListaVisivelPoemas().length, 2);
    });
});
