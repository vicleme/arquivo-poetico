import './helpers/localstorage-shim.js';
import './helpers/dom-shim.js';
import { instalarHtmlDocxFalso, removerHtmlDocxFalso } from './helpers/htmldocx-shim.js';

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { db } from '../js/db.js';
import { gerarDocxHtmlExportacao, baixarDocx } from '../js/exportar-docx.js';

function resetarDb() {
    db.livros = [];
    db.partes = [];
    db.secoes = [];
    db.poemas = [];
    db.prosas = [];
    db.elementos = [];
    db.coletaneas = [];
    db.itensColetanea = [];
    db.pessoas = [];
    db.grupos = [];
}

describe('gerarDocxHtmlExportacao', () => {
    beforeEach(resetarDb);

    it('gera um HTML válido mesmo com lista vazia (só o cabeçalho geral)', () => {
        const html = gerarDocxHtmlExportacao([]);
        assert.match(html, /^<!DOCTYPE html>/);
        assert.match(html, /<h1>Exportação Poética<\/h1>/);
        assert.match(html, /0 texto\(s\)/);
    });

    it('título do item vira <h2>, com o tipo em itálico (*(...)* de itemParaMarkdownPartes)', () => {
        const item = { id: 1, tipo: 'poema', titulo: 'Canção da Solidão', texto: 'verso único' };
        const html = gerarDocxHtmlExportacao([item]);
        assert.match(html, /<h2>1\. "Canção da Solidão" <em>\(Poema\)<\/em><\/h2>/);
    });

    it('prosa é rotulada como "(Prosa)"', () => {
        const item = { id: 1, tipo: 'prosa', titulo: 'T', texto: 'x' };
        const html = gerarDocxHtmlExportacao([item]);
        assert.match(html, /<em>\(Prosa\)<\/em>/);
    });

    it('linhas de meta ("- **Rótulo:** valor") viram <li><strong>Rótulo:</strong> valor</li>', () => {
        const item = {
            id: 1,
            tipo: 'poema',
            titulo: 'T',
            idioma: 'Português',
            texto: 'x',
        };
        const html = gerarDocxHtmlExportacao([item]);
        assert.match(html, /<li><strong>Idioma:<\/strong> Português<\/li>/);
    });

    it('seções ### (ex.: Notas) viram <h3>, com o conteúdo em <p>', () => {
        const item = { id: 1, tipo: 'poema', titulo: 'T', texto: 'x', notas: 'Uma nota qualquer' };
        const html = gerarDocxHtmlExportacao([item]);
        assert.match(html, /<h3>Notas<\/h3>/);
        assert.match(html, /<p>Uma nota qualquer<\/p>/);
    });

    it('Conteúdo Sensível vira blockquote (mesmo destaque do .md/.pdf)', () => {
        const item = {
            id: 1,
            tipo: 'poema',
            titulo: 'T',
            texto: 'x',
            conteudoSensivel: 'aviso importante',
        };
        const html = gerarDocxHtmlExportacao([item]);
        assert.match(html, /<blockquote><p>aviso importante<\/p><\/blockquote>/);
    });

    it('link de Intertextualidade ([texto](url)) vira <a href="url">texto</a>', () => {
        const item = {
            id: 1,
            tipo: 'poema',
            titulo: 'T',
            texto: 'x',
            intertextualidade: [{ tipo: 'Referência', texto: 'algo', link: 'https://ex.com' }],
        };
        const html = gerarDocxHtmlExportacao([item]);
        assert.match(html, /<a href="https:\/\/ex\.com">https:\/\/ex\.com<\/a>/);
    });

    it('escapa &, < e > em campos de texto livre (não deixa HTML solto injetado)', () => {
        const item = {
            id: 1,
            tipo: 'poema',
            titulo: 'T',
            texto: 'x',
            notas: '<script>a & b</script>',
        };
        const html = gerarDocxHtmlExportacao([item]);
        assert.ok(!html.includes('<script>a & b</script>'));
        assert.match(html, /&lt;script&gt;a &amp; b&lt;\/script&gt;/);
    });

    it('item sem Texto preenchido não quebra (não há corpo rico pra renderizar)', () => {
        const item = { id: 1, tipo: 'poema', titulo: 'T' };
        assert.doesNotThrow(() => gerarDocxHtmlExportacao([item]));
    });

    // ─── Corpo rico do Texto (mesmas runs que o PDF usa) ───

    it('negrito: "**palavra**" vira <span style="font-weight:bold">palavra</span>, sem os marcadores', () => {
        const item = { id: 1, tipo: 'poema', titulo: 'T', texto: '**palavra**' };
        const html = gerarDocxHtmlExportacao([item]);
        assert.match(html, /<span style="font-weight:bold">palavra<\/span>/);
        assert.ok(!html.includes('**palavra**'));
    });

    it('itálico: "_palavra_" vira <span style="font-style:italic">palavra</span>', () => {
        const item = { id: 1, tipo: 'poema', titulo: 'T', texto: '_palavra_' };
        const html = gerarDocxHtmlExportacao([item]);
        assert.match(html, /<span style="font-style:italic">palavra<\/span>/);
    });

    it('sublinhado: "<u>palavra</u>" vira <span style="text-decoration:underline">palavra</span>', () => {
        const item = { id: 1, tipo: 'poema', titulo: 'T', texto: '<u>palavra</u>' };
        const html = gerarDocxHtmlExportacao([item]);
        assert.match(html, /<span style="text-decoration:underline">palavra<\/span>/);
    });

    it('cor de um <div style="color:...​"> vira color:rgb(...) no span', () => {
        const item = {
            id: 1,
            tipo: 'poema',
            titulo: 'T',
            texto: '<div style="color: #ff0000;">palavra</div>',
        };
        const html = gerarDocxHtmlExportacao([item]);
        assert.match(html, /color:rgb\(255,0,0\)/);
    });

    it('quebra de linha do corpo (verso a verso) vira um <p> por linha, preservando a estrutura de versos', () => {
        const item = { id: 1, tipo: 'poema', titulo: 'T', texto: 'primeiro verso\nsegundo verso' };
        const html = gerarDocxHtmlExportacao([item]);
        const indicePrimeiro = html.indexOf('primeiro verso');
        const indiceSegundo = html.indexOf('segundo verso');
        assert.ok(indicePrimeiro > -1 && indiceSegundo > indicePrimeiro);
        // Cada verso é seu próprio <p> — não devem cair no mesmo <span>.
        assert.ok(!html.includes('primeiro verso\nsegundo verso'));
    });

    it('linha em branco (parágrafo vazio) vira um <p>&nbsp;</p>, sem quebrar', () => {
        const item = { id: 1, tipo: 'poema', titulo: 'T', texto: 'verso um\n\nverso dois' };
        const html = gerarDocxHtmlExportacao([item]);
        assert.match(html, /<p>&nbsp;<\/p>/);
    });
});

describe('baixarDocx', () => {
    beforeEach(() => {
        resetarDb();
    });
    afterEach(removerHtmlDocxFalso);

    it('lança erro claro quando a lib html-docx-js não carregou (sem window.htmlDocx)', () => {
        removerHtmlDocxFalso();
        assert.throws(() => baixarDocx([], 'teste.docx'), /biblioteca de \.docx não carregou/);
    });

    it('repassa o HTML gerado pra htmlDocx.asBlob quando a lib está disponível', () => {
        const htmlDocxFalso = instalarHtmlDocxFalso();
        const item = { id: 1, tipo: 'poema', titulo: 'Título Único', texto: 'x' };
        baixarDocx([item], 'teste.docx');
        assert.equal(htmlDocxFalso.chamadas.length, 1);
        assert.match(htmlDocxFalso.chamadas[0].html, /Título Único/);
    });
});
