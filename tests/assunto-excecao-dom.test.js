import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Modal do texto: opção "Não se aplica" no seletor de cada
// Assunto. O Assunto excluído continua visível (riscado, com "Restaurar"),
// para a decisão ser reversível. A lógica (estado, poda, salvar, saídas) está
// em assunto-excecao.test.js; aqui só o que depende de DOM de verdade.

const { db } = await import('../js/db.js');
const E = await import('../js/editor.js');

const TEMAS = [
    { id: 1, nome: 'Retrato de caráter', notas: '' },
    { id: 2, nome: 'Amor', notas: '' },
];
const ASSUNTOS = [
    { id: 10, nome: 'Identidade e autoconhecimento', notas: '', temaIds: [1] },
    { id: 11, nome: 'Vínculos e relações', notas: '', temaIds: [1, 2] },
];

const $ = (id) => document.getElementById(id);
const linhas = () => [...$('p-temas-assuntos').children];
const linhaDe = (nome) => linhas().find((el) => el.textContent.includes(nome));

beforeEach(() => {
    db.temas = structuredClone(TEMAS);
    db.assuntos = structuredClone(ASSUNTOS);
    db.pessoas = [];
    db.grupos = [];
    db.autores = [];
    db.livros = [];
    document.body.innerHTML = '<div id="p-temas-corpo"></div><div id="pr-temas-corpo"></div>';
    E.renderTemasPoema();
    E.renderTemasProsa();
    E.resetTemasTexto('poemas');
    E.resetTemasTexto('prosas');
});

describe('modal: "Não se aplica"', () => {
    it('o seletor de cada Assunto tem a opção, com o rótulo certo', () => {
        E.adicionarTemaTexto('poemas', 'Retrato de caráter');
        const sel = linhaDe('Vínculos e relações').querySelector('select');
        const opcao = [...sel.options].find((o) => o.value === 'excluir');
        assert.ok(opcao);
        assert.equal(opcao.textContent, 'Não se aplica');
    });

    it('excluir deixa o Assunto riscado, sem seletor e com o botão Restaurar', () => {
        E.adicionarTemaTexto('poemas', 'Retrato de caráter');
        E.mudarPapelAssuntoTexto('poemas', '11', 'excluir');
        const linha = linhaDe('Vínculos e relações');
        assert.ok(linha, 'o Assunto excluído continua na lista');
        assert.equal(linha.querySelector('select'), null);
        assert.ok(linha.querySelector('.line-through'), 'nome riscado');
        assert.match(linha.textContent, /não se aplica a este texto/);
        assert.match(linha.querySelector('button').textContent, /Restaurar/);
    });

    it('o outro Assunto do mesmo Tema continua normal, com seletor', () => {
        E.adicionarTemaTexto('poemas', 'Retrato de caráter');
        E.mudarPapelAssuntoTexto('poemas', '11', 'excluir');
        const linha = linhaDe('Identidade e autoconhecimento');
        assert.ok(linha.querySelector('select'));
        assert.equal(linha.querySelector('.line-through'), null);
    });

    it('o Assunto excluído vai para o fim da lista', () => {
        E.adicionarTemaTexto('poemas', 'Retrato de caráter');
        E.mudarPapelAssuntoTexto('poemas', '10', 'excluir');
        const ordem = linhas().map((el) => el.textContent);
        assert.match(ordem[0], /Vínculos e relações/);
        assert.match(ordem[1], /Identidade e autoconhecimento/);
    });

    it('Restaurar (clique) devolve o Assunto ao modo automático', () => {
        E.adicionarTemaTexto('poemas', 'Retrato de caráter');
        E.mudarPapelAssuntoTexto('poemas', '11', 'excluir');
        // O happy-dom não executa atributos onclick inline, então um .click() não
        // chamaria nada. Confere que o botão carrega a chamada certa e a executa.
        const botao = linhaDe('Vínculos e relações').querySelector('button');
        assert.equal(
            botao.getAttribute('onclick'),
            "mudarPapelAssuntoTexto('poemas', '11', 'auto')",
        );
        E.mudarPapelAssuntoTexto('poemas', '11', 'auto');
        assert.deepEqual(E.obterAssuntosExcluidosTexto('poemas'), []);
        const linha = linhaDe('Vínculos e relações');
        assert.ok(linha.querySelector('select'));
        assert.equal(linha.querySelector('select').value, 'auto');
    });

    it('tirar o Tema do texto faz o Assunto excluído sumir da lista (a exceção limpa junto)', () => {
        E.adicionarTemaTexto('poemas', 'Retrato de caráter');
        E.mudarPapelAssuntoTexto('poemas', '11', 'excluir');
        E.removerTemaTexto('poemas', 0);
        assert.equal(linhaDe('Vínculos e relações'), undefined);
        E.adicionarTemaTexto('poemas', 'Retrato de caráter');
        assert.ok(linhaDe('Vínculos e relações').querySelector('select'), 'volta ativo');
    });

    it('o campo oculto (rastreio de alterações) muda ao excluir e ao restaurar', () => {
        E.adicionarTemaTexto('poemas', 'Retrato de caráter');
        const antes = $('p-temas-json').value;
        E.mudarPapelAssuntoTexto('poemas', '11', 'excluir');
        const excluido = $('p-temas-json').value;
        assert.notEqual(excluido, antes);
        assert.deepEqual(JSON.parse(excluido).assuntosExcluidos, ['11']);
        E.mudarPapelAssuntoTexto('poemas', '11', 'auto');
        assert.equal($('p-temas-json').value, antes);
    });

    it('abrir um texto com exceção mostra o Assunto riscado', () => {
        E.carregarTemasTexto('poemas', {
            id: 1,
            titulo: 'X',
            temas: [{ temaId: 1, papel: '' }],
            assuntosExcluidos: [11],
        });
        assert.ok(linhaDe('Vínculos e relações').querySelector('.line-through'));
    });
});
