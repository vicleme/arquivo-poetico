import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Aba Autores: shift-click no checkbox estende a seleção ao intervalo
// entre o último checkbox clicado e este, na ordem da lista visível
// (mesmo padrão de Poemas, Prosas e Pessoas).
document.body.innerHTML = `
    <main>
        <div id="lista-autores"></div>
        <span id="contagem-autores"></span>
    </main>
`;

const { db } = await import('../js/db.js');
const { selecaoAutores, toggleSelecaoAutor, limparSelecaoAutores, setFiltroAutores } =
    await import('../js/autores-acoes.js');

const ids = () => [...selecaoAutores].sort((a, b) => a - b);

describe('Autores, seleção com Shift', () => {
    beforeEach(() => {
        // ordem alfabética: Ana(1) Bia(2) Caio(3) Dani(4) Edu(5)
        db.autores = [
            { id: 5, nome: 'Edu' },
            { id: 1, nome: 'Ana' },
            { id: 3, nome: 'Caio' },
            { id: 2, nome: 'Bia' },
            { id: 4, nome: 'Dani' },
        ];
        setFiltroAutores('');
        limparSelecaoAutores();
        toggleSelecaoAutor(1, true);
        toggleSelecaoAutor(1, false);
        limparSelecaoAutores();
    });

    it('sem Shift, marca um por vez', () => {
        toggleSelecaoAutor(2, true);
        toggleSelecaoAutor(4, true);
        assert.deepEqual(ids(), [2, 4]);
    });

    it('Shift marca o intervalo entre o último clique e este, na ordem da lista', () => {
        toggleSelecaoAutor(2, true);
        toggleSelecaoAutor(4, true, true);
        assert.deepEqual(ids(), [2, 3, 4]);
    });

    it('Shift funciona para cima e ao desmarcar', () => {
        toggleSelecaoAutor(5, true);
        toggleSelecaoAutor(1, true, true);
        assert.deepEqual(ids(), [1, 2, 3, 4, 5]);
        toggleSelecaoAutor(2, false);
        toggleSelecaoAutor(4, false, true);
        assert.deepEqual(ids(), [1, 5]);
    });

    it('se a âncora saiu da lista visível, cai no clique simples', () => {
        toggleSelecaoAutor(5, true);
        setFiltroAutores('ana');
        toggleSelecaoAutor(1, true, true);
        assert.deepEqual(ids(), [1, 5]);
    });
});
