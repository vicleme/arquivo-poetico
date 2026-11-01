import './helpers/dom-real.js';

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Botão Baixar no card da aba Livros: um livro só, no formato lembrado.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const mainJs = fs.readFileSync(path.resolve(__dirname, '../js/main.js'), 'utf8');
const i = html.indexOf('<section id="livros"');
const f = html.indexOf('id="lista-livros"', i);
assert.ok(i !== -1 && f !== -1);
document.body.innerHTML = `<main>${html.slice(i, f)}id="lista-livros"></div></section></main><div id="modais-container"></div>`;

const { db } = await import('../js/db.js');
const { renderLivros, limparFiltrosLivros } = await import('../js/render-listas.js');
const { baixarLivro } = await import('../js/baixar-livros.js');

const CHAVE = 'arquivoPoetico_formatoSelecao_livros';
const botoes = () =>
    Array.from(document.querySelectorAll('#lista-livros button[data-action="baixar-livro"]'));

let downloads;
let criarOriginal;
let urlOriginal;
let revogarOriginal;

describe('card de Livros: botão Baixar', () => {
    beforeEach(() => {
        localStorage.clear();
        db.livros = [
            { id: 1, titulo: 'Água Viva', tipo: 'Inéditos', sequencia: 1 },
            { id: 2, titulo: 'Rascunhos', tipo: 'Inéditos', sequencia: 2 },
        ];
        for (const t of [
            'autores',
            'colaboradores',
            'partes',
            'secoes',
            'elementos',
            'poemas',
            'prosas',
            'itensColetanea',
        ]) {
            db[t] = [];
        }
        limparFiltrosLivros();
        downloads = [];
        criarOriginal = document.createElement;
        urlOriginal = globalThis.URL.createObjectURL;
        revogarOriginal = globalThis.URL.revokeObjectURL;
        const porUrl = new Map();
        globalThis.URL.createObjectURL = (blob) => {
            const url = `blob:card-${porUrl.size}`;
            porUrl.set(url, blob);
            return url;
        };
        globalThis.URL.revokeObjectURL = () => {};
        document.createElement = (tag) => {
            const e = criarOriginal.call(document, tag);
            if (tag !== 'a') return e;
            const clicar = e.click.bind(e);
            e.click = () => {
                downloads.push({ nome: e.download, blob: porUrl.get(e.href) });
                clicar();
            };
            return e;
        };
    });
    afterEach(() => {
        document.createElement = criarOriginal;
        globalThis.URL.createObjectURL = urlOriginal;
        globalThis.URL.revokeObjectURL = revogarOriginal;
    });

    it('cada card tem um botão Baixar com o id do livro, entre Ver e Editar', () => {
        renderLivros();
        assert.deepEqual(
            botoes().map((b) => b.dataset.id),
            ['1', '2'],
        );
        const acoes = Array.from(
            document
                .querySelector('#lista-livros [data-livro-card]')
                .querySelectorAll('button[data-action]'),
        ).map((b) => b.dataset.action);
        assert.deepEqual(acoes.slice(0, 3), ['ver-livro', 'baixar-livro', 'editar-livro']);
        assert.equal(botoes()[0].getAttribute('aria-label'), 'Baixar');
        assert.ok(botoes()[0].querySelector('svg'));
    });

    it('a ação baixar-livro está ligada no main.js e usa o id do botão', () => {
        assert.match(
            mainJs,
            /'baixar-livro':\s*\(el\)\s*=>\s*baixarLivro\(Number\(el\.dataset\.id\)\)/,
        );
    });

    it('baixa só aquele livro, em .json por padrão, com o título no nome', async () => {
        baixarLivro(2);
        assert.equal(downloads.length, 1);
        assert.equal(downloads[0].nome, 'rascunhos.json');
        const itens = JSON.parse(
            Buffer.from(await downloads[0].blob.arrayBuffer()).toString('utf-8'),
        ).itens;
        assert.deepEqual(
            itens.map((l) => l.titulo),
            ['Rascunhos'],
        );
    });

    it('usa o formato lembrado (o mesmo do Ver e da aba)', () => {
        localStorage.setItem(CHAVE, 'md');
        baixarLivro(1);
        assert.match(downloads[0].nome, /\.md$/);
    });
});
