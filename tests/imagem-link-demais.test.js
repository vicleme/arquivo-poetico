import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const lerModal = (arquivo) =>
    fs.readFileSync(path.resolve(__dirname, '../modais', arquivo), 'utf8');

// Entrega 2 do "link da imagem": Livro (capa), Parte, Seção, Elemento e Parte
// de Coletânea. O link é só de acesso (ver imagem-link.js); a imagem exibida
// continua vindo do upload. happy-dom não tem IndexedDB: `open` que nunca
// responde deixa o preencherCapas esperando, sem rejeição solta.
globalThis.indexedDB = { open: () => ({}) };

document.body.innerHTML = `
    <select id="filtro-livro-partes"></select>
    <div id="lista-livros"></div>
    <div id="lista-partes"></div>
    <div id="lista-secoes"></div>
    <select id="filtro-livro-elementos"></select>
    <select id="filtro-tipo-elementos"></select>
    <div id="lista-elementos"></div>
`;

const { db } = await import('../js/db.js');
const { renderLivros, renderPartes, renderSecoes, renderElementos } =
    await import('../js/render-listas.js');
const { renderVisualizacaoLivroHtml } = await import('../js/visualizar-livro.js');

const LINK = 'https://i.ibb.co/abc/capa.jpg';

describe('Modais têm o campo "Link da imagem"', () => {
    const campos = {
        'modal-livro.html': 'l-imagem-url',
        'modal-parte.html': 'part-imagem-url',
        'modal-secao.html': 'sec-imagem-url',
        'modal-elemento.html': 'el-imagem-url',
        'modal-col-parte.html': 'cp-imagem-url',
    };
    for (const [arquivo, id] of Object.entries(campos)) {
        it(`${arquivo} tem #${id} do tipo url`, () => {
            const html = lerModal(arquivo);
            assert.match(html, new RegExp(`<input[^>]*type="url"[^>]*id="${id}"`, 's'));
        });
    }
});

describe('Cards mostram "Abrir imagem original" só com link válido', () => {
    beforeEach(() => {
        ['livros', 'partes', 'secoes', 'elementos'].forEach((c) => (db[c].length = 0));
        db.livros.push({
            id: 1,
            titulo: 'Livro A',
            tipo: 'Inéditos',
            sequencia: 1,
            imagemUrl: LINK,
        });
        db.partes.push(
            { id: 1, livroId: 1, titulo: 'P com', sequencia: 1, imagemUrl: LINK },
            { id: 2, livroId: 1, titulo: 'P sem', sequencia: 2 },
            { id: 3, livroId: 1, titulo: 'P ruim', sequencia: 3, imagemUrl: 'javascript:alert(1)' },
        );
        db.secoes.push(
            { id: 1, paiTipo: 'livro', paiId: 1, titulo: 'S com', imagemUrl: LINK },
            { id: 2, paiTipo: 'livro', paiId: 1, titulo: 'S sem' },
        );
        db.elementos.push(
            { id: 1, tipo: 'Epígrafe', paiTipo: 'livro', paiId: 1, texto: 'x', imagemUrl: LINK },
            { id: 2, tipo: 'Epígrafe', paiTipo: 'livro', paiId: 1, texto: 'y' },
        );
    });

    const textos = (sel) => Array.from(document.querySelectorAll(sel)).map((c) => c.innerHTML);

    it('Livro', () => {
        renderLivros();
        const [card] = textos('#lista-livros > div');
        assert.match(card, new RegExp(`href="${LINK}"`));
        assert.match(card, /Abrir imagem original/);
    });

    it('Parte', () => {
        renderPartes();
        const [com, sem, ruim] = textos('#lista-partes > div');
        assert.match(com, /Abrir imagem original/);
        assert.doesNotMatch(sem, /Abrir imagem original/);
        assert.doesNotMatch(ruim, /Abrir imagem original|javascript:/);
    });

    it('Seção', () => {
        renderSecoes();
        const [com, sem] = textos('#lista-secoes > div');
        assert.match(com, /Abrir imagem original/);
        assert.doesNotMatch(sem, /Abrir imagem original/);
    });

    it('Elemento', () => {
        renderElementos();
        const [com, sem] = textos('#lista-elementos > div');
        assert.match(com, /Abrir imagem original/);
        assert.doesNotMatch(sem, /Abrir imagem original/);
    });
});

describe('Ver do Livro', () => {
    it('lista o link da imagem da capa em "Arquivos e documentos"; sem link, nada', () => {
        const com = renderVisualizacaoLivroHtml({ id: 1, titulo: 'L', imagemUrl: LINK });
        assert.match(com, /Arquivos e documentos/);
        assert.match(com, new RegExp(`href="${LINK}"`));
        const sem = renderVisualizacaoLivroHtml({ id: 1, titulo: 'L' });
        assert.doesNotMatch(sem, /Imagem da capa \(original\)/);
        const ruim = renderVisualizacaoLivroHtml({ id: 1, titulo: 'L', imagemUrl: 'javascript:x' });
        assert.doesNotMatch(ruim, /javascript:/);
    });
});

describe('Salvar com link inválido não grava nada', () => {
    it('Parte e Seção recusam e não mexem no banco', async () => {
        document.body.insertAdjacentHTML('beforeend', lerModal('modal-parte.html'));
        document.body.insertAdjacentHTML('beforeend', lerModal('modal-secao.html'));
        const { initFormParte, initFormSecao } = await import('../js/forms.js');
        initFormParte();
        initFormSecao();
        db.partes.length = 0;
        db.secoes.length = 0;

        document.getElementById('part-titulo').value = 'Nova';
        document.getElementById('part-imagem-url').value = 'ftp://x/y.png';
        await document.getElementById('form-parte').onsubmit({ preventDefault() {} });
        assert.equal(db.partes.length, 0);

        const opt = document.createElement('option');
        opt.value = 'livro:1';
        document.getElementById('sec-vinculo').appendChild(opt);
        document.getElementById('sec-vinculo').value = 'livro:1';
        document.getElementById('sec-titulo').value = 'Nova';
        document.getElementById('sec-imagem-url').value = 'texto solto';
        await document.getElementById('form-secao').onsubmit({ preventDefault() {} });
        assert.equal(db.secoes.length, 0);

        document.getElementById('sec-imagem-url').value = LINK;
        await document.getElementById('form-secao').onsubmit({ preventDefault() {} });
        assert.equal(db.secoes.length, 1);
        assert.equal(db.secoes[0].imagemUrl, LINK);
    });
});
