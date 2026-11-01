import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Sinopse curta do Livro: campo no modal com contador (só informa, não trava),
// salvar e editar, Ver, e saídas .json, .md e .csv.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
globalThis.fetch = async (url) => ({
    ok: true,
    status: 200,
    text: async () =>
        fs.readFileSync(path.resolve(__dirname, '../modais', path.basename(url)), 'utf8'),
});

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const m = html.match(/<section id="livros"[\s\S]*?<\/section>/);
document.body.innerHTML = `<main>${m[0]}</main><div id="modais-container"></div>`;

const { registrarModal, toggleModal } = await import('../js/modais.js');
const { db } = await import('../js/db.js');
const { initFormLivro, editarLivro, rastreadorLivro } = await import('../js/forms.js');
const { prepararNovo } = await import('../js/ui.js');
const { renderLivros, limparFiltrosLivros } = await import('../js/render-listas.js');
const { contarCaracteres, rotuloContadorSinopseCurta, initContadorSinopseCurta } =
    await import('../js/contador-sinopse-livro.js');
const { renderVisualizacaoLivroHtml } = await import('../js/visualizar-livro.js');
const { montarRegistroLivro, gerarMarkdownLivros, gerarCsvLivros, modeloDocumentoLivro } =
    await import('../js/exportar-livros.js');

registrarModal('modal-livro', 'modal-livro.html', initFormLivro, rastreadorLivro);
initContadorSinopseCurta();

const aberto = (id) => {
    const el = document.getElementById(id);
    return !!el && !el.classList.contains('hidden');
};
const esperar = () => new Promise((r) => setTimeout(r, 30));
const digitar = (el, valor) => {
    el.value = valor;
    el.dispatchEvent(new window.Event('input', { bubbles: true }));
};
const contador = () => document.getElementById('l-sinopse-curta-contador').textContent.trim();

describe('contador de caracteres (lógica pura)', () => {
    it('conta caracteres de verdade, não unidades internas', () => {
        assert.equal(contarCaracteres(''), 0);
        assert.equal(contarCaracteres(undefined), 0);
        assert.equal(contarCaracteres('ação'), 4);
        assert.equal(contarCaracteres('a😀b'), 3);
        assert.equal(contarCaracteres('linha 1\nlinha 2'), 15);
    });

    it('singular e plural', () => {
        assert.equal(rotuloContadorSinopseCurta(''), '0 caracteres');
        assert.equal(rotuloContadorSinopseCurta('a'), '1 caractere');
        assert.equal(rotuloContadorSinopseCurta('ab'), '2 caracteres');
    });
});

describe('Sinopse curta no modal do Livro', () => {
    beforeEach(async () => {
        localStorage.clear();
        db.autores = [];
        db.poemas = [];
        db.prosas = [];
        db.partes = [];
        db.secoes = [];
        db.itensColetanea = [];
        db.elementos = [];
        db.livros = [
            {
                id: 1,
                titulo: 'Com curta',
                sequencia: 1,
                tipo: 'Inéditos',
                sinopseCurta: 'Em uma frase.',
            },
            { id: 2, titulo: 'Antigo', sequencia: 2, tipo: 'Inéditos', sinopse: 'Longa.' },
        ];
        rastreadorLivro.marcarLimpo();
        if (aberto('modal-livro')) await toggleModal('modal-livro');
        const conf = document.getElementById('modal-confirmar-exclusao');
        if (conf) conf.style.display = 'none';
    });

    it('o campo fica logo acima da Sinopse, com o contador embaixo', async () => {
        await editarLivro(1);
        const curta = document.getElementById('l-sinopse-curta');
        const longa = document.getElementById('l-sinopse');
        assert.ok(curta && longa);
        assert.ok(
            curta.compareDocumentPosition(longa) & window.Node.DOCUMENT_POSITION_FOLLOWING,
            'a curta vem antes da longa',
        );
        assert.ok(document.getElementById('l-sinopse-curta-contador'));
    });

    it('Editar carrega o texto e já mostra a contagem; livro antigo abre vazio', async () => {
        await editarLivro(1);
        assert.equal(document.getElementById('l-sinopse-curta').value, 'Em uma frase.');
        assert.equal(contador(), '13 caracteres');
        await toggleModal('modal-livro');
        await editarLivro(2);
        assert.equal(document.getElementById('l-sinopse-curta').value, '');
        assert.equal(contador(), '0 caracteres');
    });

    it('digitar atualiza o contador, sem cortar nem travar', async () => {
        await editarLivro(2);
        const longo = 'x'.repeat(600);
        digitar(document.getElementById('l-sinopse-curta'), longo);
        assert.equal(contador(), '600 caracteres');
        assert.equal(document.getElementById('l-sinopse-curta').value.length, 600);
        assert.equal(document.getElementById('l-sinopse-curta').maxLength, -1);
    });

    it('salvar grava a sinopse curta e preserva a longa', async () => {
        await editarLivro(2);
        digitar(document.getElementById('l-sinopse-curta'), 'Curta nova');
        document.getElementById('form-livro').requestSubmit();
        await esperar();
        const l = db.livros.find((x) => x.id === 2);
        assert.equal(l.sinopseCurta, 'Curta nova');
        assert.equal(l.sinopse, 'Longa.');
    });

    it('livro novo abre com o campo e o contador zerados', async () => {
        await editarLivro(1);
        await toggleModal('modal-livro');
        await prepararNovo('livro');
        assert.equal(document.getElementById('l-sinopse-curta').value, '');
        assert.equal(contador(), '0 caracteres');
    });
});

describe('Sinopse curta no Ver e nas saídas', () => {
    const livro = {
        id: 1,
        titulo: 'Com curta',
        sinopseCurta: 'Em uma frase.',
        sinopse: 'A sinopse inteira.',
    };

    it('o Ver mostra a curta antes da longa e escapa HTML', () => {
        const htmlVer = renderVisualizacaoLivroHtml({ ...livro, sinopseCurta: 'a <b>b</b>' }, []);
        assert.ok(htmlVer.includes('Sinopse curta'));
        assert.ok(htmlVer.includes('a &lt;b&gt;b&lt;/b&gt;'));
        assert.ok(htmlVer.indexOf('Sinopse curta') < htmlVer.indexOf('A sinopse inteira.'));
    });

    it('livro sem a curta não ganha a seção', () => {
        const htmlVer = renderVisualizacaoLivroHtml({ id: 2, titulo: 'X', sinopse: 'L' }, []);
        assert.equal(htmlVer.includes('Sinopse curta'), false);
    });

    it('.json leva a chave; .md e .csv levam o texto, a curta antes da longa', () => {
        const banco = { autores: [], colaboradores: [], poemas: [], prosas: [] };
        const reg = montarRegistroLivro(livro, banco);
        assert.equal(reg.sinopseCurta, 'Em uma frase.');
        const md = gerarMarkdownLivros([reg]);
        assert.ok(md.includes('Em uma frase.'));
        assert.ok(md.includes('Sinopse curta'));
        assert.ok(md.indexOf('Em uma frase.') < md.indexOf('A sinopse inteira.'));
        const csv = gerarCsvLivros([reg]);
        const cab = csv.split('\n')[0].split(',');
        assert.ok(cab.includes('sinopse_curta'));
        assert.ok(cab.indexOf('sinopse_curta') < cab.indexOf('sinopse'));
        assert.ok(csv.includes('Em uma frase.'));
    });

    it('o modelo do documento (.pdf e .docx) traz o bloco antes da Sinopse', () => {
        const banco = { autores: [], colaboradores: [], poemas: [], prosas: [] };
        const modelo = modeloDocumentoLivro(montarRegistroLivro(livro, banco));
        const rotulos = modelo.blocos.map((b) => b.rotulo);
        assert.deepEqual(rotulos.slice(0, 2), ['Sinopse curta', 'Sinopse']);
    });
});

describe('Sinopse curta do livro: card', () => {
    it('o card mostra a sinopse curta só quando há texto, com escape de HTML', () => {
        const antes = db.livros;
        db.livros = [
            {
                id: 901,
                titulo: 'Com curta',
                sequencia: 1,
                sinopseCurta: '  Uma frase <b>só</b>.  ',
            },
            { id: 902, titulo: 'Sem curta', sequencia: 2 },
            { id: 903, titulo: 'Em branco', sequencia: 3, sinopseCurta: '   ' },
        ];
        limparFiltrosLivros();
        renderLivros();
        const card = (id) => document.querySelector(`#lista-livros [data-livro-card="${id}"]`);
        const p = card(901).querySelector('[data-sinopse-curta-livro]');
        assert.ok(p);
        assert.equal(p.textContent, 'Uma frase <b>só</b>.');
        assert.equal(p.querySelector('b'), null);
        assert.equal(card(902).querySelector('[data-sinopse-curta-livro]'), null);
        assert.equal(card(903).querySelector('[data-sinopse-curta-livro]'), null);
        db.livros = antes;
    });
});
