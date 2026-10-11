import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Botões "Selecionar estes N" e "Selecionar restantes (M)" da paginação de
// Poemas/Prosas: os dois alternam (marcam o lote; clicando de novo, desmarcam)
// e o rótulo acompanha a seleção, inclusive quando as linhas são marcadas à mão.
document.body.innerHTML = `
    <main>
        <div id="barra-acoes-poemas" class="hidden"><span id="contador-selecao-poemas"></span></div>
        <table>
            <thead><tr id="cabecalho-poemas"></tr></thead>
            <tbody id="lista-poemas"></tbody>
        </table>
        <div id="paginacao-poemas"></div>
        <div id="painel-colunas-poemas"></div>
        <select id="filtro-livro-poemas"></select>

        <div id="barra-acoes-prosas" class="hidden"><span id="contador-selecao-prosas"></span></div>
        <table>
            <thead><tr id="cabecalho-prosas"></tr></thead>
            <tbody id="lista-prosas"></tbody>
        </table>
        <div id="paginacao-prosas"></div>
        <div id="painel-colunas-prosas"></div>
        <select id="filtro-livro-prosas"></select>
    </main>
`;

const { db } = await import('../js/db.js');
const { toggleSelecao, selecionarPagina, selecionarRestantes } =
    await import('../js/selecao-massa.js');
const { renderPoemas, setItensPorPagina, selecaoPoemas } = await import('../js/render-listas.js');

const el = (id) => document.getElementById(id);
const botao = (tipo) => el('paginacao-poemas').querySelector(`[data-sel-lote="${tipo}"]`);
const idsDaPagina = () => botao('pagina').dataset.ids.split(',').map(Number);

function reset(n) {
    db.poemas.length = 0;
    for (let i = 1; i <= n; i++)
        db.poemas.push({ id: i, titulo: `P${i}`, sequencia: i, paiTipo: 'livro', paiId: 9 });
    selecaoPoemas.clear();
    setItensPorPagina(25);
    renderPoemas();
}

describe('Selecionar página / restantes (paginação de Poemas)', () => {
    beforeEach(() => reset(60)); // 25 + 25 + 10

    it('mostra os dois botões só com mais de uma página', () => {
        assert.match(botao('pagina').textContent, /^Selecionar estes 25$/);
        assert.match(botao('restantes').textContent, /^Selecionar restantes \(35\)$/);
        reset(10);
        assert.equal(botao('pagina'), null);
        assert.equal(botao('restantes'), null);
    });

    it('"Selecionar estes N" alterna: marca a página e, ao clicar de novo, desmarca', () => {
        selecionarPagina('poemas', idsDaPagina());
        assert.equal(selecaoPoemas.size, 25);
        assert.match(botao('pagina').textContent, /^Desselecionar estes 25$/);

        selecionarPagina('poemas', idsDaPagina());
        assert.equal(selecaoPoemas.size, 0);
        assert.match(botao('pagina').textContent, /^Selecionar estes 25$/);
    });

    it('desselecionar a página não mexe no que está selecionado em outras páginas', () => {
        selecionarRestantes('poemas', idsDaPagina());
        selecionarPagina('poemas', idsDaPagina());
        assert.equal(selecaoPoemas.size, 60);
        selecionarPagina('poemas', idsDaPagina());
        assert.equal(selecaoPoemas.size, 35);
        assert.ok(!selecaoPoemas.has(1) && selecaoPoemas.has(26));
    });

    it('"Selecionar restantes" marca só o que está fora da página, e alterna', () => {
        selecionarRestantes('poemas', idsDaPagina());
        assert.equal(selecaoPoemas.size, 35);
        assert.ok(!selecaoPoemas.has(1) && selecaoPoemas.has(26) && selecaoPoemas.has(60));
        assert.match(botao('restantes').textContent, /^Desselecionar restantes \(35\)$/);

        selecionarRestantes('poemas', idsDaPagina());
        assert.equal(selecaoPoemas.size, 0);
        assert.match(botao('restantes').textContent, /^Selecionar restantes \(35\)$/);
    });

    it('rótulo acompanha a marcação manual das linhas (sem re-renderizar)', () => {
        for (const id of idsDaPagina()) toggleSelecao('poemas', true, id);
        assert.match(botao('pagina').textContent, /^Desselecionar estes 25$/);
        toggleSelecao('poemas', false, 3);
        assert.match(botao('pagina').textContent, /^Selecionar estes 25$/);
    });
});
