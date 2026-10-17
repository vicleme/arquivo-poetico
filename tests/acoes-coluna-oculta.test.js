import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// A coluna Ações some quando nenhum botão aplicável à aba está ligado.

const A = await import('../js/acoes-coluna.js');

function desligarTodos(tabela, chaves) {
    chaves.forEach((k) => A.toggleAcaoColuna(tabela, k, false));
}

describe('temAcoesVisiveis', () => {
    beforeEach(() => localStorage.clear());

    it('por padrão a coluna aparece em todas as abas', () => {
        for (const t of ['poemas', 'prosas', 'sonoridade', 'estrutura-textual', 'moldes']) {
            assert.equal(A.temAcoesVisiveis(t), true, t);
        }
    });

    it('com todos os botões da aba desligados, a coluna some', () => {
        desligarTodos('poemas', ['ver', 'baixar', 'editar', 'excluir']);
        assert.equal(A.temAcoesVisiveis('poemas'), false);
    });

    it('um botão que sobra mantém a coluna', () => {
        desligarTodos('prosas', ['ver', 'baixar', 'excluir']);
        assert.equal(A.temAcoesVisiveis('prosas'), true);
    });

    it('"promover" ligado não segura a coluna em abas que não têm esse botão', () => {
        // o estado padrão guarda todas as chaves, inclusive 'promover'
        desligarTodos('poemas', ['ver', 'baixar', 'editar', 'excluir']);
        assert.equal(A.isAcaoAtiva('poemas', 'promover'), true);
        assert.equal(A.temAcoesVisiveis('poemas'), false);
    });

    it('em Moldes, Promover sozinho mantém a coluna; sem ele e sem os outros, some', () => {
        desligarTodos('moldes', ['baixar', 'editar', 'excluir']);
        assert.equal(A.temAcoesVisiveis('moldes'), true);
        A.toggleAcaoColuna('moldes', 'promover', false);
        assert.equal(A.temAcoesVisiveis('moldes'), false);
    });

    it('cada aba tem a sua escolha, e "Restaurar padrão" traz a coluna de volta', () => {
        desligarTodos('sonoridade', ['ver', 'baixar', 'editar', 'excluir']);
        assert.equal(A.temAcoesVisiveis('sonoridade'), false);
        assert.equal(A.temAcoesVisiveis('poemas'), true);
        A.resetarAcoesColuna('sonoridade');
        assert.equal(A.temAcoesVisiveis('sonoridade'), true);
    });

    it('o painel avisa que a coluna some sem botões', () => {
        assert.ok(A.renderSeletorAcoes('poemas').includes('a coluna Ações some'));
    });
});
