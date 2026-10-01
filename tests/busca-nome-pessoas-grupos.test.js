import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Busca por nome nas abas Pessoas e Grupos (28/09/2026): substring, sem
// diferenciar caixa nem acento; em Grupos, o resultado traz os ancestrais
// (contexto da árvore) e ignora o recolhimento manual.
document.body.innerHTML = `
    <main>
        <div id="lista-pessoas"></div>
        <span id="contagem-pessoas"></span>
        <div id="lista-grupos"></div>
    </main>
`;

const { db } = await import('../js/db.js');
const { renderGrupos, setFiltroNomeGrupos, toggleColapsoGrupo } =
    await import('../js/render-listas.js');
const { setFiltroNomePessoas, setFiltroAutorPessoas, setVisibilidadePessoas } =
    await import('../js/pessoas-acoes.js');

const nomes = (idLista) =>
    [...document.querySelectorAll(`#${idLista} h4`)].map((h) => h.textContent.trim());

describe('Pessoas — busca por nome', () => {
    beforeEach(() => {
        db.autores = [
            { id: 1, nome: 'Ana' },
            { id: 2, nome: 'Bruno' },
        ];
        db.grupos = [];
        db.pessoas = [
            { id: 1, nome: 'João Pedro', autorIds: [1], grupoIds: [] },
            { id: 2, nome: 'Joana', autorIds: [2], grupoIds: [] },
            { id: 3, nome: 'Maria', autorIds: [1], grupoIds: [], oculto: true },
        ];
        setFiltroAutorPessoas('');
        setVisibilidadePessoas('ativas');
        setFiltroNomePessoas('');
    });

    it('ignora maiúsculas e acentos', () => {
        setFiltroNomePessoas('JOAO');
        assert.deepEqual(nomes('lista-pessoas'), ['João Pedro']);
    });

    it('combina com o filtro de autor e mostra "N de M"', () => {
        setFiltroNomePessoas('jo');
        assert.deepEqual(nomes('lista-pessoas'), ['Joana', 'João Pedro']);
        setFiltroAutorPessoas('2');
        assert.deepEqual(nomes('lista-pessoas'), ['Joana']);
        assert.match(document.getElementById('contagem-pessoas').textContent, /1 de 3 pessoas/);
    });

    it('sem resultado, avisa que é por causa do filtro; limpar volta tudo', () => {
        setFiltroNomePessoas('zzz');
        assert.match(document.getElementById('lista-pessoas').textContent, /para esse filtro/);
        setFiltroNomePessoas('');
        assert.deepEqual(nomes('lista-pessoas'), ['Joana', 'João Pedro']);
    });
});

describe('Grupos — busca por nome', () => {
    beforeEach(() => {
        db.autores = [{ id: 1, nome: 'Ana' }];
        db.pessoas = [];
        db.grupos = [
            { id: 1, nome: 'Família', autorId: 1, paiId: null },
            { id: 2, nome: 'Irmãos', autorId: 1, paiId: 1 },
            { id: 3, nome: 'Amigos', autorId: 1, paiId: null },
        ];
        setFiltroNomeGrupos('');
        renderGrupos();
    });

    it('mostra o grupo que bate junto do pai, sem os que não batem', () => {
        setFiltroNomeGrupos('irmaos');
        assert.deepEqual(
            nomes('lista-grupos').map((n) => n.replace('↳', '').trim()),
            ['Família', 'Irmãos'],
        );
    });

    it('ignora o recolhimento manual do pai enquanto há busca', () => {
        toggleColapsoGrupo(1);
        assert.deepEqual(nomes('lista-grupos').length, 2); // Família (recolhida) + Amigos
        setFiltroNomeGrupos('irmãos');
        assert.equal(nomes('lista-grupos').length, 2); // Família + Irmãos
        toggleColapsoGrupo(1); // desfaz o estado global do módulo
    });

    it('sem resultado mostra mensagem de busca', () => {
        setFiltroNomeGrupos('xyz');
        assert.match(document.getElementById('lista-grupos').textContent, /para essa busca/);
    });
});
