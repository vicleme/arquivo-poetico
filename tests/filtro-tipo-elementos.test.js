import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

document.body.innerHTML = `
    <main>
        <select id="filtro-livro-elementos"></select>
        <select id="filtro-tipo-elementos"></select>
        <div id="lista-elementos"></div>
    </main>
`;

const { db } = await import('../js/db.js');
const { renderElementos, setFiltroLivroElementos, setFiltroTipoElementos } =
    await import('../js/render-listas.js');
await import('../js/main.js');

function titulosNaTela() {
    return Array.from(document.querySelectorAll('#lista-elementos p.font-semibold')).map(
        (p) => p.textContent,
    );
}

function limparDb() {
    db.livros.length = 0;
    db.partes.length = 0;
    db.secoes.length = 0;
    db.elementos.length = 0;
    setFiltroLivroElementos('');
    setFiltroTipoElementos('');
}

describe('Aba Elementos Textuais: filtro por tipo', () => {
    beforeEach(() => {
        limparDb();
        db.livros.push({ id: 1, titulo: 'Livro A', tipo: 'Livro', sequencia: 1 });
        db.livros.push({ id: 2, titulo: 'Livro B', tipo: 'Livro', sequencia: 2 });
        const base = { paiTipo: 'livro', texto: 'x' };
        db.elementos.push(
            { ...base, id: 1, paiId: 1, tipo: 'Epígrafe', titulo: 'E1', sequencia: 1 },
            { ...base, id: 2, paiId: 1, tipo: 'Pórtico', titulo: 'P1', sequencia: 2 },
            { ...base, id: 3, paiId: 1, tipo: 'Introdução', titulo: 'I1', sequencia: 3 },
            { ...base, id: 4, paiId: 2, tipo: 'Epígrafe', titulo: 'E2', sequencia: 1 },
            { ...base, id: 5, paiId: 1, tipo: 'Comentário', titulo: 'C1', sequencia: 4 },
        );
    });

    it('sem filtro mostra todos os elementos', () => {
        renderElementos();
        assert.equal(titulosNaTela().length, 5);
    });

    it('filtra por Epígrafe e por Pórtico', () => {
        setFiltroTipoElementos('Epígrafe');
        assert.deepEqual(titulosNaTela().sort(), ['E1', 'E2']);
        setFiltroTipoElementos('Pórtico');
        assert.deepEqual(titulosNaTela(), ['P1']);
    });

    it('combina com o filtro de livro', () => {
        setFiltroLivroElementos('1');
        setFiltroTipoElementos('Epígrafe');
        assert.deepEqual(titulosNaTela(), ['E1']);
    });

    it('Comentário e Conteúdo Multimídia são filtros separados', () => {
        setFiltroTipoElementos('Comentário');
        assert.deepEqual(titulosNaTela(), ['C1']);
        setFiltroTipoElementos('Conteúdo Multimídia');
        assert.deepEqual(titulosNaTela(), []);
    });

    it('voltar para "Todos os tipos" limpa o filtro', () => {
        setFiltroTipoElementos('Pórtico');
        setFiltroTipoElementos('');
        assert.equal(titulosNaTela().length, 5);
    });
});

describe('Opções de tipo de elemento no HTML', () => {
    const valores = (arquivo, id) => {
        const html = readFileSync(arquivo, 'utf8');
        const trecho = html.split(`id="${id}"`)[1].split('</select>')[0];
        return [...trecho.matchAll(/<option value="([^"]*)"/g)].map((m) => m[1]);
    };

    it('o select do modal tem Epígrafe e Pórtico', () => {
        const v = valores('modais/modal-elemento.html', 'el-tipo');
        assert.ok(v.includes('Epígrafe'));
        assert.ok(v.includes('Pórtico'));
    });

    it('o filtro da aba lista os mesmos tipos do modal', () => {
        const modal = valores('modais/modal-elemento.html', 'el-tipo');
        const filtro = valores('index.html', 'filtro-tipo-elementos').filter(Boolean);
        assert.deepEqual(filtro.sort(), modal.sort());
    });
});
