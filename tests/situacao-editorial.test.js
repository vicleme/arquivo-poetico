// Situação editorial de Livro e Coletânea (Esgotado / Fora de catálogo /
// Reeditado / Em circulação / Não especificado) — pedido do Victor em
// 03/10/2026. Coletânea é um Livro com tipo 'Coletânea', então o campo
// vive em db.livros e cobre os dois.
import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML_MODAL = fs.readFileSync(path.resolve(__dirname, '../modais/modal-livro.html'), 'utf8');

document.body.innerHTML = `
    <main>
        <div id="lista-livros"></div>
        <div id="lista-coletaneas"></div>
        <div id="editor-coletanea"></div>
    </main>
`;

const { db } = await import('../js/db.js');
const {
    SITUACOES_EDITORIAIS,
    situacaoEditorialDoLivro,
    rotuloSituacaoEditorial,
    livroForaDeCirculacao,
    textoSituacaoEditorial,
    htmlSeloSituacaoEditorial,
} = await import('../js/utils.js');
const { renderLivros } = await import('../js/render-listas.js');
const { renderColetaneas } = await import('../js/coletaneas.js');

describe('Situação editorial — funções puras (utils.js)', () => {
    it('lista os 5 estados combinados, com Não especificado = string vazia', () => {
        assert.deepEqual(
            SITUACOES_EDITORIAIS.map((s) => s.valor),
            ['em-circulacao', 'esgotado', 'fora-de-catalogo', 'reeditado', ''],
        );
    });

    it('livro antigo (sem o campo) ou com valor desconhecido vale "não especificado"', () => {
        assert.equal(situacaoEditorialDoLivro({ titulo: 'Antigo' }), '');
        assert.equal(situacaoEditorialDoLivro({ situacaoEditorial: 'xyz' }), '');
        assert.equal(situacaoEditorialDoLivro(null), '');
        assert.equal(situacaoEditorialDoLivro({ situacaoEditorial: 'esgotado' }), 'esgotado');
    });

    it('rótulos', () => {
        assert.equal(rotuloSituacaoEditorial('fora-de-catalogo'), 'Fora de catálogo');
        assert.equal(rotuloSituacaoEditorial(''), 'Não especificado');
    });

    it('fora de circulação = esgotado, fora de catálogo e reeditado; o resto não', () => {
        for (const v of ['esgotado', 'fora-de-catalogo', 'reeditado']) {
            assert.equal(livroForaDeCirculacao({ situacaoEditorial: v }), true, v);
        }
        for (const v of ['em-circulacao', '', undefined]) {
            assert.equal(livroForaDeCirculacao({ situacaoEditorial: v }), false, String(v));
        }
    });

    it('texto: junta "desde" quando há data parcial; vazio quando não especificado', () => {
        assert.equal(textoSituacaoEditorial({ situacaoEditorial: 'esgotado' }), 'Esgotado');
        assert.equal(
            textoSituacaoEditorial({
                situacaoEditorial: 'esgotado',
                situacaoDesde: { mes: 3, ano: 2024 },
            }),
            'Esgotado desde 03/2024',
        );
        assert.equal(textoSituacaoEditorial({ titulo: 'Sem campo' }), '');
    });

    it('selo: vazio quando não especificado; escapa a nota no tooltip', () => {
        assert.equal(htmlSeloSituacaoEditorial({ titulo: 'x' }), '');
        const html = htmlSeloSituacaoEditorial({
            situacaoEditorial: 'fora-de-catalogo',
            situacaoNota: 'retirei <b>de propósito</b>',
        });
        assert.match(html, /data-situacao-editorial="fora-de-catalogo"/);
        assert.match(html, /Fora de catálogo/);
        assert.ok(!html.includes('<b>'), 'a nota deveria estar escapada');
    });
});

describe('Situação editorial — cards (DOM real)', () => {
    beforeEach(() => {
        db.livros.length = 0;
    });

    it('card do livro mostra o selo e a nota', () => {
        db.livros.push({
            id: 1,
            titulo: 'Esgotadão',
            sequencia: 1,
            situacaoEditorial: 'esgotado',
            situacaoDesde: { ano: 2023 },
            situacaoNota: 'Tiragem acabou',
        });
        renderLivros();
        const selo = document.querySelector('[data-situacao-editorial="esgotado"]');
        assert.ok(selo);
        assert.match(selo.textContent, /Esgotado desde 2023/);
        assert.match(document.getElementById('lista-livros').textContent, /Tiragem acabou/);
    });

    it('livro sem o campo não ganha selo', () => {
        db.livros.push({ id: 2, titulo: 'Antigo', sequencia: 1 });
        renderLivros();
        assert.equal(document.querySelector('[data-situacao-editorial]'), null);
    });

    it('avisa nas Lojas só quando está fora de circulação E há link de compra', () => {
        db.livros.push(
            {
                id: 3,
                titulo: 'Fora com loja',
                sequencia: 1,
                situacaoEditorial: 'fora-de-catalogo',
                lojas: [{ nome: 'Amazon', url: 'https://exemplo.com/l' }],
            },
            {
                id: 4,
                titulo: 'Fora sem loja',
                sequencia: 2,
                situacaoEditorial: 'esgotado',
                lojas: [],
            },
            {
                id: 5,
                titulo: 'Circulando com loja',
                sequencia: 3,
                situacaoEditorial: 'em-circulacao',
                lojas: [{ nome: 'Amazon', url: 'https://exemplo.com/m' }],
            },
        );
        renderLivros();
        assert.equal(document.querySelectorAll('[data-aviso-lojas-fora-de-circulacao]').length, 1);
    });

    it('aba Coletâneas mostra a situação na lista e no cabeçalho do editor', () => {
        db.partes.length = 0;
        db.livros.push({
            id: 9,
            titulo: 'Coletânea X',
            tipo: 'Coletânea',
            sequencia: 1,
            situacaoEditorial: 'reeditado',
        });
        renderColetaneas();
        assert.match(document.getElementById('lista-coletaneas').textContent, /Reeditado/);
        assert.match(document.getElementById('editor-coletanea').textContent, /Reeditado/);
    });
});

describe('Situação editorial — modal e formulário', () => {
    it('o select do modal tem exatamente os valores de SITUACOES_EDITORIAIS, com "Em circulação" como padrão', () => {
        const m = HTML_MODAL.match(/<select id="l-situacao-editorial">([\s\S]*?)<\/select>/);
        assert.ok(m, 'select l-situacao-editorial não encontrado no modal');
        const valores = [...m[1].matchAll(/<option value="([^"]*)"/g)].map((x) => x[1]);
        assert.deepEqual(
            valores,
            SITUACOES_EDITORIAIS.map((s) => s.valor),
        );
        assert.match(m[1], /<option value="em-circulacao" selected>/);
    });

    it('o modal tem os campos de data (dia/mês/ano) e de nota', () => {
        for (const id of [
            'l-situacao-desde-dia',
            'l-situacao-desde-mes',
            'l-situacao-desde-ano',
            'l-situacao-nota',
        ]) {
            assert.ok(HTML_MODAL.includes(`id="${id}"`), id);
        }
    });

    it('salvar grava os 3 campos; editar os devolve ao formulário', async () => {
        const { initFormLivro, editarLivro } = await import('../js/forms.js');
        document.body.insertAdjacentHTML(
            'beforeend',
            `<div id="modais-container">${HTML_MODAL}</div>`,
        );
        initFormLivro();
        db.livros.length = 0;

        const set = (id, v) => (document.getElementById(id).value = v);
        set('l-titulo', 'Livro Teste');
        set('l-situacao-editorial', 'fora-de-catalogo');
        set('l-situacao-desde-mes', '5');
        set('l-situacao-desde-ano', '2025');
        set('l-situacao-nota', '  retirei para revisar  ');
        document
            .getElementById('form-livro')
            .dispatchEvent(new Event('submit', { cancelable: true }));
        await new Promise((r) => setTimeout(r, 50));

        const salvo = db.livros.find((l) => l.titulo === 'Livro Teste');
        assert.ok(salvo, 'livro deveria ter sido salvo');
        assert.equal(salvo.situacaoEditorial, 'fora-de-catalogo');
        assert.deepEqual(salvo.situacaoDesde, { mes: 5, ano: 2025 });
        assert.equal(salvo.situacaoNota, 'retirei para revisar');

        set('l-situacao-editorial', 'em-circulacao');
        set('l-situacao-nota', '');
        await editarLivro(salvo.id);
        assert.equal(document.getElementById('l-situacao-editorial').value, 'fora-de-catalogo');
        assert.equal(document.getElementById('l-situacao-desde-ano').value, '2025');
        assert.equal(document.getElementById('l-situacao-nota').value, 'retirei para revisar');
    });

    it('livro antigo (sem o campo) abre como "Não especificado", não como "Em circulação"', async () => {
        const { editarLivro } = await import('../js/forms.js');
        db.livros.push({ id: 77, titulo: 'Antigo', tipo: 'Inéditos' });
        await editarLivro(77);
        assert.equal(document.getElementById('l-situacao-editorial').value, '');
    });

    it('recusa data da situação anterior à primeira publicação', async () => {
        const { initFormLivro } = await import('../js/forms.js');
        initFormLivro();
        db.livros.length = 0;
        const set = (id, v) => (document.getElementById(id).value = v);
        set('l-titulo', 'Data Ruim');
        set('l-data-ano', '2020');
        set('l-situacao-editorial', 'esgotado');
        set('l-situacao-desde-ano', '2019');
        document
            .getElementById('form-livro')
            .dispatchEvent(new Event('submit', { cancelable: true }));
        await new Promise((r) => setTimeout(r, 50));
        assert.equal(
            db.livros.find((l) => l.titulo === 'Data Ruim'),
            undefined,
        );
    });
});
