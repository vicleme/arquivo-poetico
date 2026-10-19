import './helpers/localstorage-shim.js';
import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Colunas de Intertextualidade, Hipertextualidade e Referências nas tabelas
// de Poemas e Prosas: o link aparece com o nome que a pessoa definiu
// (`linkTexto`); sem nome, cai na própria URL. O href é sempre a URL.

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

const URL_LONGA =
    'https://web.archive.org/web/2022/https://rr4.googlevideo.com/videoplayback?expire=1';
const NOME = 'Cadê a chave - IMPEACHMENT';

const entrada = (extra = {}) => ({
    tipo: 'vídeo',
    texto: 'Cadê a chave',
    link: URL_LONGA,
    linkTexto: NOME,
    ...extra,
});

const CASOS = [
    { tabela: 'poemas', render: renderPoemas, tbody: 'lista-poemas' },
    { tabela: 'prosas', render: renderProsas, tbody: 'lista-prosas' },
];
const CAMPOS = ['intertextualidade', 'hipertextualidade', 'referenciasExternas'];

function linksDaColuna({ tabela, render, tbody }, campo, itens) {
    db.livros = [];
    const texto = { id: 1, titulo: 'T', [campo]: itens };
    db.poemas = tabela === 'poemas' ? [texto] : [];
    db.prosas = tabela === 'prosas' ? [texto] : [];
    resetarColunas(tabela);
    for (const c of CAMPOS) toggleColuna(tabela, c, c === campo);
    render();
    return [...document.getElementById(tbody).querySelectorAll('a')];
}

describe('colunas com link: texto do link (linkTexto)', () => {
    beforeEach(() => {
        db.poemas = [];
        db.prosas = [];
    });

    for (const caso of CASOS) {
        for (const campo of CAMPOS) {
            it(`${caso.tabela} / ${campo}: mostra o nome definido e mantém a URL no href`, () => {
                const links = linksDaColuna(caso, campo, [entrada()]);
                assert.equal(links.length, 1);
                assert.equal(links[0].textContent, NOME);
                assert.equal(links[0].getAttribute('href'), URL_LONGA);
            });

            it(`${caso.tabela} / ${campo}: sem nome definido, mostra a própria URL`, () => {
                const links = linksDaColuna(caso, campo, [entrada({ linkTexto: '' })]);
                assert.equal(links.length, 1);
                assert.equal(links[0].textContent, URL_LONGA);
                assert.equal(links[0].getAttribute('href'), URL_LONGA);
            });
        }
    }
});
