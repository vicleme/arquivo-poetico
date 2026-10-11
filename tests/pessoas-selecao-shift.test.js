import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Aba Pessoas: shift-click no checkbox estende a seleção ao intervalo
// entre o último checkbox clicado e este, na ordem da lista visível
// (mesmo padrão de Poemas e Prosas, ver toggleSelecao em selecao-massa.js).
document.body.innerHTML = `
    <main>
        <div id="lista-pessoas"></div>
        <span id="contagem-pessoas"></span>
    </main>
`;

const { db } = await import('../js/db.js');
const { selecaoPessoas, toggleSelecaoPessoa, limparSelecaoPessoas, setFiltroNomePessoas } =
    await import('../js/pessoas-acoes.js');

const ids = () => [...selecaoPessoas].sort((a, b) => a - b);

describe('Pessoas, seleção com Shift', () => {
    beforeEach(() => {
        db.autores = [];
        db.grupos = [];
        // ordem alfabética: Ana(1) Bia(2) Caio(3) Dani(4) Edu(5)
        db.pessoas = [
            { id: 5, nome: 'Edu', autorIds: [], grupoIds: [] },
            { id: 1, nome: 'Ana', autorIds: [], grupoIds: [] },
            { id: 3, nome: 'Caio', autorIds: [], grupoIds: [] },
            { id: 2, nome: 'Bia', autorIds: [], grupoIds: [] },
            { id: 4, nome: 'Dani', autorIds: [], grupoIds: [] },
        ];
        setFiltroNomePessoas('');
        limparSelecaoPessoas();
        // zera a âncora: um clique simples seguido de outro, sem Shift
        toggleSelecaoPessoa(1, true);
        toggleSelecaoPessoa(1, false);
        limparSelecaoPessoas();
    });

    it('sem Shift, marca um por vez', () => {
        toggleSelecaoPessoa(2, true);
        toggleSelecaoPessoa(4, true);
        assert.deepEqual(ids(), [2, 4]);
    });

    it('Shift marca o intervalo entre o último clique e este, na ordem da lista', () => {
        toggleSelecaoPessoa(2, true);
        toggleSelecaoPessoa(4, true, true);
        assert.deepEqual(ids(), [2, 3, 4]);
    });

    it('Shift funciona para cima também', () => {
        toggleSelecaoPessoa(5, true);
        toggleSelecaoPessoa(3, true, true);
        assert.deepEqual(ids(), [3, 4, 5]);
    });

    it('Shift ao desmarcar tira o intervalo inteiro', () => {
        toggleSelecaoPessoa(1, true);
        toggleSelecaoPessoa(5, true, true);
        assert.deepEqual(ids(), [1, 2, 3, 4, 5]);
        toggleSelecaoPessoa(2, false);
        toggleSelecaoPessoa(4, false, true);
        assert.deepEqual(ids(), [1, 5]);
    });

    it('respeita o filtro: o intervalo é só o que está visível', () => {
        setFiltroNomePessoas('a'); // Ana, Bia, Caio, Dani (sem Edu)
        toggleSelecaoPessoa(1, true);
        toggleSelecaoPessoa(4, true, true);
        assert.deepEqual(ids(), [1, 2, 3, 4]);
    });

    it('se a âncora saiu da lista visível, cai no clique simples', () => {
        toggleSelecaoPessoa(5, true); // âncora: Edu
        setFiltroNomePessoas('ana'); // só Ana fica visível
        toggleSelecaoPessoa(1, true, true);
        assert.deepEqual(ids(), [1, 5]);
    });
});
