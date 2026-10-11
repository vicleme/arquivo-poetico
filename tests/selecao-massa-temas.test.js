import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Painel "Temas" da barra de ações em massa (Poemas/Prosas), com DOM real.
document.body.innerHTML = `
    <main>
        <div id="barra-acoes-poemas" class="hidden"><span id="contador-selecao-poemas"></span></div>
        <input id="bulk-tema-input" list="sugestoes-temas-bulk" />
        <datalist id="sugestoes-temas-bulk"></datalist>
        <table>
            <thead><tr id="cabecalho-poemas"></tr></thead>
            <tbody id="lista-poemas"></tbody>
        </table>
        <div id="paginacao-poemas"></div>
        <div id="painel-colunas-poemas"></div>
        <select id="filtro-livro-poemas"></select>

        <div id="barra-acoes-prosas" class="hidden"><span id="contador-selecao-prosas"></span></div>
        <input id="bulk-tema-input-prosa" list="sugestoes-temas-bulk-prosa" />
        <datalist id="sugestoes-temas-bulk-prosa"></datalist>
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
const {
    toggleSelecao,
    limparSelecao,
    prepararPainelTemasMassa,
    atualizarSugestoesTemasMassa,
    aplicarTemaEmMassa,
    removerTemaEmMassa,
} = await import('../js/selecao-massa.js');
const { renderPoemas, renderProsas } = await import('../js/render-listas.js');

const el = (id) => document.getElementById(id);
const confirmar = () => el('excl-confirmar').click();
const modalAberto = () => {
    const overlay = el('modal-confirmar-exclusao');
    return !!overlay && overlay.style.display !== 'none';
};
const suf = (tabela) => (tabela === 'poemas' ? '' : '-prosa');
const digitar = (tabela, texto) => {
    el(`bulk-tema-input${suf(tabela)}`).value = texto;
};
const nomes = (item) => item.temas.map((e) => db.temas.find((t) => t.id === e.temaId).nome);

function reset() {
    db.poemas.length = 0;
    db.prosas.length = 0;
    limparSelecao('poemas');
    limparSelecao('prosas');
    db.temas = [
        { id: 101, nome: 'Amor', notas: '' },
        { id: 102, nome: 'Saudade', notas: '' },
    ];
    el('bulk-tema-input').value = '';
    el('bulk-tema-input-prosa').value = '';
    el('sugestoes-temas-bulk').innerHTML = '';
    el('sugestoes-temas-bulk-prosa').innerHTML = '';
    const overlay = el('modal-confirmar-exclusao');
    if (overlay) overlay.style.display = 'none';
}

const poema = (id, extra = {}) => ({ id, titulo: `P${id}`, sequencia: id, ...extra });

function selecionarPoemas(...ids) {
    renderPoemas();
    ids.forEach((id) => toggleSelecao('poemas', true, id));
}

describe('Temas em massa: sugestões', () => {
    beforeEach(reset);

    it('lista o cadastro em ordem alfabética ao abrir o painel', () => {
        db.temas.push({ id: 103, nome: 'Exílio', notas: '' });
        prepararPainelTemasMassa('poemas');
        const valores = [...el('sugestoes-temas-bulk').querySelectorAll('option')].map(
            (o) => o.value,
        );
        assert.deepEqual(valores, ['Amor', 'Exílio', 'Saudade']);
    });

    it('encadeia o que já foi digitado e usa o datalist de Prosa nas prosas', () => {
        digitar('prosas', 'Amor, ');
        atualizarSugestoesTemasMassa('prosas');
        const valores = [...el('sugestoes-temas-bulk-prosa').querySelectorAll('option')].map(
            (o) => o.value,
        );
        assert.deepEqual(valores, ['Amor, Saudade']);
        assert.equal(el('sugestoes-temas-bulk').children.length, 0);
    });
});

describe('Temas em massa: aplicar', () => {
    beforeEach(reset);

    it('adiciona vários temas aos selecionados após confirmar, e limpa campo e seleção', () => {
        db.poemas.push(poema(1), poema(2), poema(3));
        selecionarPoemas(1, 2);
        digitar('poemas', 'Amor, Exílio');
        aplicarTemaEmMassa('poemas');
        assert.ok(modalAberto());
        assert.equal(db.poemas[0].temas, undefined, 'nada muda antes de confirmar');
        confirmar();
        assert.deepEqual(nomes(db.poemas[0]), ['Amor', 'Exílio']);
        assert.deepEqual(nomes(db.poemas[1]), ['Amor', 'Exílio']);
        assert.equal(db.poemas[0].sinalizacoesTema, 'Amor, Exílio');
        assert.ok(!db.poemas[2].temas || db.poemas[2].temas.length === 0);
        assert.ok(db.temas.some((t) => t.nome === 'Exílio'));
        assert.equal(el('bulk-tema-input').value, '');
    });

    it('a confirmação avisa dos temas que serão criados', () => {
        db.poemas.push(poema(1));
        selecionarPoemas(1);
        digitar('poemas', 'Amor, Exílio');
        aplicarTemaEmMassa('poemas');
        assert.match(document.body.textContent, /"Exílio" ainda não existe no cadastro/);
    });

    it('campo vazio não abre confirmação', () => {
        db.poemas.push(poema(1));
        selecionarPoemas(1);
        digitar('poemas', ' , ');
        aplicarTemaEmMassa('poemas');
        assert.ok(!modalAberto());
    });

    it('sem seleção não abre confirmação', () => {
        db.poemas.push(poema(1));
        renderPoemas();
        digitar('poemas', 'Amor');
        aplicarTemaEmMassa('poemas');
        assert.ok(!modalAberto());
    });

    it('funciona nas Prosas', () => {
        db.prosas.push({ id: 7, titulo: 'X', sequencia: 1 });
        renderProsas();
        toggleSelecao('prosas', true, 7);
        digitar('prosas', 'Saudade');
        aplicarTemaEmMassa('prosas');
        confirmar();
        assert.deepEqual(nomes(db.prosas[0]), ['Saudade']);
    });
});

describe('Temas em massa: remover', () => {
    beforeEach(reset);

    it('remove só o vínculo dos selecionados e mantém o tema no cadastro', () => {
        db.poemas.push(
            poema(1, { sinalizacoesTema: 'Amor, Saudade' }),
            poema(2, { sinalizacoesTema: 'Amor' }),
        );
        selecionarPoemas(1);
        digitar('poemas', 'amor');
        removerTemaEmMassa('poemas');
        confirmar();
        assert.deepEqual(nomes(db.poemas[0]), ['Saudade']);
        assert.deepEqual(nomes(db.poemas[1]), ['Amor']);
        assert.equal(db.temas.length, 2);
    });

    it('tema fora do cadastro não abre confirmação nem cria nada', () => {
        db.poemas.push(poema(1, { sinalizacoesTema: 'Amor' }));
        selecionarPoemas(1);
        digitar('poemas', 'Inexistente');
        removerTemaEmMassa('poemas');
        assert.ok(!modalAberto());
        assert.equal(db.temas.length, 2);
        assert.equal(el('bulk-tema-input').value, '');
    });
});
