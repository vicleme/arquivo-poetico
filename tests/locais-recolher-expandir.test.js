import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Aba Locais em árvore: "Recolher tudo" e "Expandir tudo". Só têm efeito na
// árvore; com busca ou filtro ativo a lista é plana e os botões ficam
// desativados.
document.body.innerHTML = `
    <main>
        <input id="busca-locais" />
        <select id="filtro-locais"><option value="todos">Todos</option><option value="sem-tipo">Só sem tipo</option></select>
        <select id="filtro-uso-locais"><option value="todos">Todos</option></select>
        <button id="btn-recolher-locais"></button>
        <button id="btn-expandir-locais"></button>
        <span id="resumo-locais"></span>
        <div id="lista-locais"></div>
    </main>
`;

const { db } = await import('../js/db.js');
const { renderLocais, recolherTodosLocais, expandirTodosLocais, alternarColapsoLocal } =
    await import('../js/ui-locais.js');

const nomes = () =>
    [...document.querySelectorAll('#lista-locais h4')].map((h) => h.textContent.trim());
const setas = () => [...document.querySelectorAll('[data-action="toggle-local-colapso"]')];

describe('Locais: recolher e expandir tudo', () => {
    beforeEach(() => {
        db.poemas = [];
        db.prosas = [];
        db.locais = [
            { id: 1, nome: 'Brasil', tipo: 'País', pertenceA: [] },
            { id: 2, nome: 'São Paulo', tipo: 'Estado', pertenceA: [1] },
            { id: 3, nome: 'Santos', tipo: 'Cidade', pertenceA: [2] },
            { id: 4, nome: 'Portugal', tipo: 'País', pertenceA: [] },
        ];
        document.getElementById('busca-locais').value = '';
        document.getElementById('filtro-locais').value = 'todos';
        expandirTodosLocais();
    });

    it('começa tudo expandido', () => {
        assert.deepEqual(nomes().sort(), ['Brasil', 'Portugal', 'Santos', 'São Paulo']);
    });

    it('Recolher tudo deixa só as raízes; só quem tem filhos ganha seta', () => {
        recolherTodosLocais();
        assert.deepEqual(nomes().sort(), ['Brasil', 'Portugal']);
        assert.equal(setas().length, 1);
    });

    it('depois de Recolher tudo, abrir um ramo mostra o nível de baixo, ainda recolhido', () => {
        recolherTodosLocais();
        alternarColapsoLocal(1);
        assert.deepEqual(nomes().sort(), ['Brasil', 'Portugal', 'São Paulo']);
        assert.ok(!nomes().includes('Santos'));
    });

    it('Expandir tudo mostra a árvore inteira de novo', () => {
        recolherTodosLocais();
        expandirTodosLocais();
        assert.equal(nomes().length, 4);
    });

    it('botões ficam desativados com filtro ativo e voltam sem ele', () => {
        const rec = document.getElementById('btn-recolher-locais');
        const exp = document.getElementById('btn-expandir-locais');
        renderLocais();
        assert.equal(rec.disabled, false);
        assert.equal(exp.disabled, false);

        document.getElementById('busca-locais').value = 'sant';
        renderLocais();
        assert.equal(rec.disabled, true);
        assert.equal(exp.disabled, true);

        document.getElementById('busca-locais').value = '';
        renderLocais();
        assert.equal(rec.disabled, false);
    });
});
