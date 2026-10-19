import './helpers/localstorage-shim.js';
import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Data de acesso (`dataAcesso`) fora do editor: Visualização, colunas das
// tabelas, `.md` e `.csv`. A data só aparece quando a entrada tem link.

document.body.innerHTML = `
    <main>
        <div id="barra-acoes-poemas" class="hidden"><span id="contador-selecao-poemas"></span></div>
        <div id="painel-colunas-poemas"></div>
        <div id="painel-acoes-poemas"></div>
        <select id="filtro-livro-poemas"></select>
        <table>
            <thead><tr id="cabecalho-poemas"></tr></thead>
            <tbody id="lista-poemas"></tbody>
        </table>
        <div id="paginacao-poemas"></div>
        <div id="barra-acoes-prosas" class="hidden"><span id="contador-selecao-prosas"></span></div>
        <div id="painel-colunas-prosas"></div>
        <div id="painel-acoes-prosas"></div>
        <select id="filtro-livro-prosas"></select>
        <table>
            <thead><tr id="cabecalho-prosas"></tr></thead>
            <tbody id="lista-prosas"></tbody>
        </table>
        <div id="paginacao-prosas"></div>
    </main>
`;

const { db } = await import('../js/db.js');
const { renderPoemas, renderProsas } = await import('../js/render-listas.js');
const { toggleColuna, resetarColunas } = await import('../js/colunas.js');
await import('../js/main.js');
const { renderVisualizacaoHtml } = await import('../js/visualizar.js');
const { gerarMarkdownExportacao } = await import('../js/exportar-md.js');
const { montarRegistro } = await import('../js/exportar.js');
const { gerarCsvTextos } = await import('../js/exportar-csv.js');
const { rotuloAcessoEm, htmlAcessoEm } = await import('../js/utils.js');

const ACESSO = '2026-10-18';
const COM = { link: 'https://x.test/a', dataAcesso: ACESSO };

function textoComTudo() {
    return {
        id: 1,
        tipo: 'poema',
        titulo: 'T',
        texto: 'x',
        intertextualidade: [{ tipo: 'Música', texto: 'Águas', ...COM, nota: 'n' }],
        hipertextualidade: [{ tipo: 'Livro', hipotexto: 'Obra', relacao: 'Paródia', ...COM }],
        referenciasExternas: [{ tipo: 'Marco', texto: 'Enchente', ...COM }],
        anexos: [
            {
                tipo: 'Foto',
                texto: 'capa',
                link: 'https://x.test/f',
                linkTexto: 'Drive',
                dataAcesso: ACESSO,
            },
        ],
    };
}

describe('rotuloAcessoEm e htmlAcessoEm (utils.js)', () => {
    it('só gera o rótulo com link e data válida', () => {
        assert.equal(rotuloAcessoEm(COM), 'acesso em 18/10/2026');
        assert.equal(rotuloAcessoEm({ dataAcesso: ACESSO }), '');
        assert.equal(rotuloAcessoEm({ link: 'https://x.test' }), '');
        assert.equal(rotuloAcessoEm({ link: 'https://x.test', dataAcesso: 'ontem' }), '');
        assert.equal(rotuloAcessoEm(null), '');
        assert.equal(htmlAcessoEm({ link: 'https://x.test' }), '');
        assert.match(htmlAcessoEm(COM), /<span[^>]*>\(acesso em 18\/10\/2026\)<\/span>/);
    });
});

describe('Visualização com data de acesso', () => {
    it('mostra a data nos quatro blocos e usa o Texto do link no Anexo', () => {
        const html = renderVisualizacaoHtml(textoComTudo());
        assert.equal((html.match(/\(acesso em 18\/10\/2026\)/g) || []).length, 4);
        assert.match(html, /<a href="https:\/\/x\.test\/f"[^>]*>Drive<\/a>/);
    });

    it('sem data ou sem link, nada de "acesso em"', () => {
        const item = {
            id: 1,
            tipo: 'poema',
            titulo: 'T',
            texto: 'x',
            intertextualidade: [{ texto: 'a', link: 'https://x.test' }],
            referenciasExternas: [{ texto: 'b', dataAcesso: ACESSO }],
            anexos: [{ texto: 'c', link: 'https://x.test/c' }],
        };
        assert.doesNotMatch(renderVisualizacaoHtml(item), /acesso em/);
    });
});

describe('Markdown com data de acesso', () => {
    beforeEach(() => {
        db.autores = [];
        db.livros = [];
    });

    it('acrescenta "(acesso em dd/mm/aaaa)" depois do link e antes da nota', () => {
        const md = gerarMarkdownExportacao([textoComTudo()]);
        assert.match(
            md,
            /\[https:\/\/x\.test\/a\]\(https:\/\/x\.test\/a\) \(acesso em 18\/10\/2026\) \*\(n\)\*/,
        );
        assert.equal((md.match(/\(acesso em 18\/10\/2026\)/g) || []).length, 4);
    });

    it('Anexo com Texto do link vira link Markdown; sem ele segue com a URL crua', () => {
        const md = gerarMarkdownExportacao([
            {
                ...textoComTudo(),
                anexos: [
                    { tipo: 'Foto', texto: 'capa', link: 'https://x.test/f', linkTexto: 'Drive' },
                    { tipo: 'Foto', texto: 'verso', link: 'https://x.test/v' },
                ],
            },
        ]);
        assert.match(md, /- \*\*Foto:\*\* capa — \[Drive\]\(https:\/\/x\.test\/f\)\n/);
        assert.match(md, /- \*\*Foto:\*\* verso — https:\/\/x\.test\/v\n/);
    });

    it('texto sem dataAcesso gera o mesmo Markdown de antes', () => {
        const item = textoComTudo();
        for (const k of [
            'intertextualidade',
            'hipertextualidade',
            'referenciasExternas',
            'anexos',
        ]) {
            item[k].forEach((e) => delete e.dataAcesso);
        }
        assert.doesNotMatch(gerarMarkdownExportacao([item]), /acesso em/);
    });
});

describe('CSV com data de acesso', () => {
    beforeEach(() => {
        db.autores = [];
        db.livros = [];
    });

    it('a data entra em ISO dentro do colchete do link, nas quatro colunas', () => {
        const item = textoComTudo();
        db.poemas = [item];
        const csv = gerarCsvTextos('poema', [montarRegistro('poema', item)], db);
        assert.equal((csv.match(/, acesso 2026-10-18\]/g) || []).length, 4);
        assert.ok(csv.includes('Música: Águas [https://x.test/a, acesso 2026-10-18]'));
    });

    it('sem data, o colchete fica só com o link', () => {
        const item = textoComTudo();
        delete item.intertextualidade[0].dataAcesso;
        db.poemas = [item];
        const csv = gerarCsvTextos('poema', [montarRegistro('poema', item)], db);
        assert.ok(csv.includes('Música: Águas [https://x.test/a] (n)'));
    });
});

describe('Colunas das tabelas com data de acesso', () => {
    const CASOS = [
        { tabela: 'poemas', render: renderPoemas, tbody: 'lista-poemas' },
        { tabela: 'prosas', render: renderProsas, tbody: 'lista-prosas' },
    ];
    const CAMPOS = ['intertextualidade', 'hipertextualidade', 'referenciasExternas'];

    for (const caso of CASOS) {
        for (const campo of CAMPOS) {
            it(`${caso.tabela} / ${campo}: mostra a data junto do link e não sem link`, () => {
                const item = {
                    id: 1,
                    titulo: 'T',
                    [campo]: [
                        { tipo: 'a', texto: 't', hipotexto: 'h', ...COM },
                        { tipo: 'b', texto: 'u', hipotexto: 'i', dataAcesso: ACESSO },
                    ],
                };
                db.livros = [];
                db.poemas = caso.tabela === 'poemas' ? [item] : [];
                db.prosas = caso.tabela === 'prosas' ? [item] : [];
                resetarColunas(caso.tabela);
                for (const c of CAMPOS) toggleColuna(caso.tabela, c, c === campo);
                caso.render();
                const html = document.getElementById(caso.tbody).innerHTML;
                assert.equal((html.match(/acesso em 18\/10\/2026/g) || []).length, 1);
            });
        }
    }
});
