import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// happy-dom não tem IndexedDB: um `open` que nunca responde deixa o preencherCapas
// esperando em silêncio, em vez de gerar uma rejeição solta depois do teste.
globalThis.indexedDB = { open: () => ({}) };

document.body.innerHTML = `
    <main>
        <div class="previas-imagem-slot" data-aba="livros"></div>
        <div id="lista-livros"></div>
        <select id="filtro-livro-partes"></select>
        <div id="lista-partes"></div>
        <select id="filtro-livro-secoes"></select>
        <select id="filtro-parte-secoes"></select>
        <div id="lista-secoes"></div>
        <select id="filtro-livro-elementos"></select>
        <select id="filtro-tipo-elementos"></select>
        <div id="lista-elementos"></div>
        <div id="lista-autores"></div>
    </main>
`;

const { db } = await import('../js/db.js');
const { renderLivros, renderPartes, renderSecoes, renderElementos, renderAutores } =
    await import('../js/render-listas.js');
const { alternarPreviasImagem, definirPreviasImagemTodasAbas } =
    await import('../js/render-listas.js');
const { previasAtivas, montarControlesPrevias } = await import('../js/previas-imagem.js');
await import('../js/main.js');

const lista = (id) => document.getElementById(id);
// Faixa de imagem do card: <img data-capa-id> ou o espaço cinza "sem imagem".
const temFaixa = (id) =>
    lista(id).querySelector(
        'img[data-capa-id], div.bg-gray-100.rounded, [data-bloco-imagem-elemento]',
    ) !== null;

function montar() {
    db.livros.length = 0;
    db.partes.length = 0;
    db.secoes.length = 0;
    db.elementos.length = 0;
    db.autores.length = 0;
    db.livros.push({ id: 1, titulo: 'Livro A', tipo: 'Livro', sequencia: 1, capa: 'c1' });
    db.partes.push({ id: 1, livroId: 1, titulo: 'Parte 1', sequencia: 1, capa: 'c2' });
    db.secoes.push({
        id: 1,
        paiTipo: 'livro',
        paiId: 1,
        titulo: 'Seção 1',
        sequencia: 1,
        capa: 'c3',
    });
    db.elementos.push({
        id: 1,
        paiTipo: 'livro',
        paiId: 1,
        tipo: 'Respiro (Imagem)',
        titulo: 'R1',
        sequencia: 1,
        imagem: 'c4',
        imagemUrl: 'https://exemplo.com/r1.png',
    });
    db.autores.push({ id: 1, nome: 'Autora', imagem: 'c5' });
}

function renderTudo() {
    renderLivros();
    renderPartes();
    renderSecoes();
    renderElementos();
    renderAutores();
}

describe('Exibir prévias: cards das cinco abas', () => {
    beforeEach(() => {
        localStorage.clear();
        montar();
    });

    it('ligado (padrão), cada aba mostra a faixa de imagem', () => {
        renderTudo();
        [
            'lista-livros',
            'lista-partes',
            'lista-secoes',
            'lista-elementos',
            'lista-autores',
        ].forEach((id) => assert.equal(temFaixa(id), true, id));
    });

    it('desligar uma aba tira a imagem só dela e mantém o link da imagem', () => {
        renderTudo();
        alternarPreviasImagem('elementos', false);
        assert.equal(temFaixa('lista-elementos'), false);
        assert.match(lista('lista-elementos').innerHTML, /exemplo\.com\/r1\.png/);
        assert.equal(temFaixa('lista-livros'), true);
        assert.equal(temFaixa('lista-autores'), true);
    });

    it('o placeholder cinza de "sem imagem" também some', () => {
        db.livros[0].capa = '';
        db.partes[0].capa = '';
        alternarPreviasImagem('livros', false);
        alternarPreviasImagem('partes', false);
        assert.equal(temFaixa('lista-livros'), false);
        assert.equal(temFaixa('lista-partes'), false);
    });

    it('desligar todas e ligar todas redesenha as cinco abas', () => {
        renderTudo();
        definirPreviasImagemTodasAbas(false);
        [
            'lista-livros',
            'lista-partes',
            'lista-secoes',
            'lista-elementos',
            'lista-autores',
        ].forEach((id) => assert.equal(temFaixa(id), false, id));
        definirPreviasImagemTodasAbas(true);
        [
            'lista-livros',
            'lista-partes',
            'lista-secoes',
            'lista-elementos',
            'lista-autores',
        ].forEach((id) => assert.equal(temFaixa(id), true, id));
    });

    it('a caixa montada na aba reflete a escolha e fica sincronizada', () => {
        montarControlesPrevias();
        const caixa = document.querySelector('.previas-imagem-check[data-aba="livros"]');
        assert.equal(caixa.checked, true);
        alternarPreviasImagem('livros', false);
        assert.equal(previasAtivas('livros'), false);
        assert.equal(caixa.checked, false);
    });
});
