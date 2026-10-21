import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// happy-dom não tem IndexedDB: um `open` que nunca responde deixa o preencherCapas
// esperando em silêncio, em vez de gerar uma rejeição solta depois do teste.
globalThis.indexedDB = { open: () => ({}) };

document.body.innerHTML = `
    <select id="filtro-livro-partes"></select>
    <div id="lista-partes"></div>
    <select id="filtro-livro-elementos"></select>
    <select id="filtro-tipo-elementos"></select>
    <div id="lista-elementos"></div>
`;

const { db } = await import('../js/db.js');
const { renderPartes, renderElementos, setFiltroLivroElementos, setFiltroTipoElementos } =
    await import('../js/render-listas.js');

function limpar() {
    db.livros.length = 0;
    db.partes.length = 0;
    db.secoes.length = 0;
    db.elementos.length = 0;
    setFiltroLivroElementos('');
    setFiltroTipoElementos('');
    db.livros.push({ id: 1, titulo: 'Livro A', tipo: 'Inéditos', sequencia: 1 });
}

describe('Aba Partes: card igual ao da Seção', () => {
    beforeEach(limpar);

    it('sem imagem, mostra o espaço cinza no topo', () => {
        db.partes.push({ id: 1, livroId: 1, titulo: 'Parte A', sequencia: 1 });
        renderPartes();
        const card = document.querySelector('#lista-partes > div');
        assert.ok(card.querySelector('div.h-24.bg-gray-100'));
        assert.equal(card.querySelector('img'), null);
        assert.match(card.textContent, /Parte A/);
        assert.ok(card.querySelector('[data-action="editar-parte"]'));
        assert.ok(card.querySelector('[data-action="excluir-item"]'));
    });

    it('com imagem, a faixa de 96px vem antes do título', () => {
        db.partes.push({ id: 2, livroId: 1, titulo: 'Parte B', sequencia: 1, capa: 'c1' });
        renderPartes();
        const img = document.querySelector('#lista-partes img[data-capa-id="c1"]');
        assert.ok(img);
        assert.match(img.className, /w-full h-24 object-cover/);
        assert.equal(document.querySelector('#lista-partes div.h-24.bg-gray-100'), null);
    });
});

describe('Aba Elementos: bloco de imagem por tipo', () => {
    beforeEach(limpar);

    const base = { paiTipo: 'livro', paiId: 1, texto: 'x' };
    const blocos = () => document.querySelectorAll('[data-bloco-imagem-elemento]');

    it('Respiro, Multimídia e Ficha sem imagem ganham o espaço cinza', () => {
        ['Respiro (Imagem)', 'Conteúdo Multimídia', 'Ficha catalográfica'].forEach((tipo, i) =>
            db.elementos.push({ ...base, id: i + 1, tipo, sequencia: i + 1 }),
        );
        renderElementos();
        assert.equal(blocos().length, 3);
    });

    it('os outros tipos sem imagem não ganham o bloco', () => {
        ['Introdução', 'Epígrafe', 'Pórtico', 'Sumário', 'Posfácio'].forEach((tipo, i) =>
            db.elementos.push({ ...base, id: i + 1, tipo, sequencia: i + 1 }),
        );
        renderElementos();
        assert.equal(blocos().length, 0);
    });

    it('qualquer tipo com imagem mostra o bloco, com a imagem inteira (sem recorte)', () => {
        db.elementos.push({ ...base, id: 1, tipo: 'Epígrafe', sequencia: 1, imagem: 'i1' });
        renderElementos();
        assert.equal(blocos().length, 1);
        const img = document.querySelector('[data-bloco-imagem-elemento] img[data-capa-id="i1"]');
        assert.ok(img);
        assert.match(img.className, /object-contain/);
        assert.doesNotMatch(img.className, /object-cover/);
    });
});
