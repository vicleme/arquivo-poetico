import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// "Inverter seleção" nas abas Pessoas, Autores, Poemas e Prosas: marca o que
// não estava marcado e desmarca o que estava, só entre os itens que a tela
// mostra agora. O que o filtro esconde não é tocado.
document.body.innerHTML = `
    <main>
        <div id="lista-pessoas"></div>
        <span id="contagem-pessoas"></span>
        <div id="lista-autores"></div>
        <span id="contagem-autores"></span>
        <div id="lista-poemas"></div>
        <div id="lista-prosas"></div>
    </main>
`;

const { db } = await import('../js/db.js');
const { selecaoPessoas, limparSelecaoPessoas, inverterSelecaoPessoas, setFiltroNomePessoas } =
    await import('../js/pessoas-acoes.js');
const { selecaoAutores, limparSelecaoAutores, inverterSelecaoAutores, setFiltroAutores } =
    await import('../js/autores-acoes.js');
const { selecaoPoemas, selecaoProsas } = await import('../js/render-listas.js');
const { inverterSelecao, limparSelecao } = await import('../js/selecao-massa.js');

const ordenados = (set) => [...set].sort((a, b) => a - b);

describe('Inverter seleção, Pessoas', () => {
    beforeEach(() => {
        db.autores = [];
        db.grupos = [];
        db.pessoas = [
            { id: 1, nome: 'Ana', autorIds: [], grupoIds: [] },
            { id: 2, nome: 'Bia', autorIds: [], grupoIds: [] },
            { id: 3, nome: 'Caio', autorIds: [], grupoIds: [] },
            { id: 4, nome: 'Dani', autorIds: [], grupoIds: [], oculto: true },
        ];
        setFiltroNomePessoas('');
        limparSelecaoPessoas();
    });

    it('marca as que não estavam e desmarca as que estavam', () => {
        selecaoPessoas.add(1);
        inverterSelecaoPessoas();
        assert.deepEqual(ordenados(selecaoPessoas), [2, 3]);
    });

    it('com a seleção vazia, seleciona todas as visíveis (ocultas ficam de fora)', () => {
        inverterSelecaoPessoas();
        assert.deepEqual(ordenados(selecaoPessoas), [1, 2, 3]);
    });

    it('inverter duas vezes volta ao estado de antes', () => {
        selecaoPessoas.add(2);
        inverterSelecaoPessoas();
        inverterSelecaoPessoas();
        assert.deepEqual(ordenados(selecaoPessoas), [2]);
    });

    it('com filtro, só mexe no que está visível e não toca no resto', () => {
        selecaoPessoas.add(1);
        selecaoPessoas.add(3);
        setFiltroNomePessoas('bia');
        inverterSelecaoPessoas();
        assert.deepEqual(ordenados(selecaoPessoas), [1, 2, 3]);
        inverterSelecaoPessoas();
        assert.deepEqual(ordenados(selecaoPessoas), [1, 3]);
    });
});

describe('Inverter seleção, Autores', () => {
    beforeEach(() => {
        db.autores = [
            { id: 1, nome: 'Ana' },
            { id: 2, nome: 'Bia' },
            { id: 3, nome: 'Caio' },
        ];
        setFiltroAutores('');
        limparSelecaoAutores();
    });

    it('inverte entre os autores visíveis', () => {
        selecaoAutores.add(2);
        inverterSelecaoAutores();
        assert.deepEqual(ordenados(selecaoAutores), [1, 3]);
    });

    it('com filtro, não toca nos autores que a busca esconde', () => {
        selecaoAutores.add(1);
        setFiltroAutores('caio');
        inverterSelecaoAutores();
        assert.deepEqual(ordenados(selecaoAutores), [1, 3]);
    });
});

describe('Inverter seleção, Poemas e Prosas', () => {
    beforeEach(() => {
        db.poemas = [1, 2, 3, 4].map((id) => ({ id, titulo: `P${id}`, versos: '' }));
        db.prosas = [1, 2, 3].map((id) => ({ id: id + 10, titulo: `R${id}`, texto: '' }));
        limparSelecao('poemas');
        limparSelecao('prosas');
    });

    it('Poemas: inverte a seleção da lista visível', () => {
        selecaoPoemas.add(1);
        selecaoPoemas.add(2);
        inverterSelecao('poemas');
        assert.deepEqual(ordenados(selecaoPoemas), [3, 4]);
    });

    it('Prosas: inverte e não mistura com a seleção de Poemas', () => {
        selecaoPoemas.add(1);
        selecaoProsas.add(11);
        inverterSelecao('prosas');
        assert.deepEqual(ordenados(selecaoProsas), [12, 13]);
        assert.deepEqual(ordenados(selecaoPoemas), [1]);
    });
});
