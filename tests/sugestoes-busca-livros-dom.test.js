import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Caixinha de sugestões da busca da aba Livros, na seção real do index.html.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const m = html.match(/<section id="livros"[\s\S]*?<\/section>/);
assert.ok(m);
document.body.innerHTML = `<main>${m[0]}</main><div id="modais-container"></div>`;

const { db } = await import('../js/db.js');
const { definirPreviasImagem } = await import('../js/previas-imagem.js');
const { renderLivros, getListaVisivelLivros, limparFiltrosLivros } =
    await import('../js/render-listas.js');
const { initSugestoesBuscaLivros, atualizarSugestoesBuscaLivros, fecharSugestoesBuscaLivros } =
    await import('../js/ui-sugestoes-busca-livros.js');

const caixa = () => document.getElementById('filtro-busca-livros');
const painel = () => document.getElementById('sugestoes-busca-livros');
const linhas = () => Array.from(painel().querySelectorAll('[data-indice]'));
const digitar = (texto) => {
    caixa().value = texto;
    caixa().dispatchEvent(new window.Event('input', { bubbles: true }));
};
const tecla = (key) =>
    caixa().dispatchEvent(
        new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    );

describe('sugestões na busca de Livros', () => {
    beforeEach(() => {
        localStorage.clear();
        definirPreviasImagem('livros', false);
        db.autores = [
            { id: 1, nome: 'Maria Silva' },
            { id: 2, nome: 'João Pereira' },
        ];
        db.colaboradores = [];
        db.partes = [];
        db.secoes = [];
        db.elementos = [];
        db.poemas = [];
        db.prosas = [];
        db.itensColetanea = [];
        db.livros = [
            {
                id: 1,
                titulo: 'A',
                sequencia: 1,
                autoriaLivro: [{ autorId: 1, papeis: ['Autor', 'Tradutor'] }],
            },
            { id: 2, titulo: 'B', sequencia: 2, autoriaLivro: [{ autorId: 2, papeis: ['Autor'] }] },
        ];
        limparFiltrosLivros();
        renderLivros();
        initSugestoesBuscaLivros();
        fecharSugestoesBuscaLivros();
    });

    it('o markup tem a caixinha, escondida', () => {
        assert.ok(painel());
        assert.equal(painel().classList.contains('hidden'), true);
    });

    it('digitar um prefixo abre as opções; sem relação, fecha', () => {
        digitar('au');
        assert.equal(painel().classList.contains('hidden'), false);
        assert.deepEqual(
            linhas().map((l) => l.firstChild.textContent),
            ['autor:'],
        );
        digitar('zzz');
        assert.equal(painel().classList.contains('hidden'), true);
    });

    it('Enter aplica a primeira, filtra a lista e segue oferecendo o que vem depois', () => {
        digitar('autor:ma');
        tecla('Enter');
        assert.equal(caixa().value, 'autor:"Maria Silva" ');
        assert.deepEqual(getListaVisivelLivros(), [1]);
    });

    it('as setas movem a escolha e o Esc fecha', () => {
        digitar('autor:');
        tecla('ArrowDown');
        tecla('ArrowDown');
        const escolhida = linhas().findIndex((l) => l.getAttribute('aria-selected') === 'true');
        assert.equal(escolhida, 2);
        tecla('Enter');
        assert.equal(caixa().value, 'autor:"Maria Silva" ');
        digitar('autor:');
        tecla('Escape');
        assert.equal(painel().classList.contains('hidden'), true);
    });

    it('o clique (mousedown) aplica a linha', () => {
        digitar('papel:tra');
        linhas()[0].dispatchEvent(
            new window.MouseEvent('mousedown', { bubbles: true, cancelable: true }),
        );
        assert.equal(caixa().value, 'papel:Tradutor ');
        assert.deepEqual(getListaVisivelLivros(), [1]);
    });

    it('prefixo aplicado fica sem espaço, esperando o valor', () => {
        digitar('eq');
        tecla('Tab');
        assert.equal(caixa().value, 'equipe:');
    });

    it('sem nada a sugerir, Enter não é engolido', () => {
        digitar('zzz');
        atualizarSugestoesBuscaLivros();
        const ev = new window.KeyboardEvent('keydown', {
            key: 'Enter',
            bubbles: true,
            cancelable: true,
        });
        caixa().dispatchEvent(ev);
        assert.equal(ev.defaultPrevented, false);
    });
});
