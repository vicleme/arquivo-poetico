import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Painel "Períodos e movimentos" da barra de ações em massa
// (Poemas/Prosas). Esqueleto de DOM antes do import (mesmo motivo de
// selecao-massa-preencher.test.js).
document.body.innerHTML = `
    <main>
        <div id="barra-acoes-poemas" class="hidden"><span id="contador-selecao-poemas"></span></div>
        <div id="painel-periodos-massa"></div>
        <table>
            <thead><tr id="cabecalho-poemas"></tr></thead>
            <tbody id="lista-poemas"></tbody>
        </table>
        <div id="paginacao-poemas"></div>
        <div id="painel-colunas-poemas"></div>
        <select id="filtro-livro-poemas"></select>

        <div id="barra-acoes-prosas" class="hidden"><span id="contador-selecao-prosas"></span></div>
        <div id="painel-periodos-massa-prosa"></div>
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
    prepararPainelPeriodosMassa,
    trocarTipoPeriodoMassa,
    aplicarPeriodoEmMassa,
    removerPeriodoEmMassa,
} = await import('../js/selecao-massa.js');
const { renderPoemas, renderProsas } = await import('../js/render-listas.js');

const el = (id) => document.getElementById(id);
const confirmar = () => el('excl-confirmar').click();
const modalAberto = () => {
    const overlay = el('modal-confirmar-exclusao');
    return !!overlay && overlay.style.display !== 'none';
};
const suf = (tabela) => (tabela === 'poemas' ? '' : '-prosa');

function reset() {
    db.poemas.length = 0;
    db.prosas.length = 0;
    // A seleção é um Set de módulo: sem limpar, sobra de um teste pro outro.
    limparSelecao('poemas');
    limparSelecao('prosas');
    db.autores = [{ id: 1, nome: 'Autor Um' }];
    db.epocas = [{ id: 100, nome: 'Juventude', autorId: 1 }];
    db.periodosHistoricos = [{ id: 200, nome: 'Ditadura' }];
    db.movimentosEscolas = [{ id: 300, nome: 'Simbolismo' }];
    el('painel-periodos-massa').innerHTML = '';
    el('painel-periodos-massa-prosa').innerHTML = '';
    const overlay = el('modal-confirmar-exclusao');
    if (overlay) overlay.style.display = 'none';
}

function escolher(tabela, tipo, nome) {
    el(`bulk-periodo-tipo${suf(tabela)}`).value = tipo;
    trocarTipoPeriodoMassa(tabela);
    el(`bulk-periodo-nome${suf(tabela)}`).value = nome;
}

function selecionarPoemas(...ids) {
    renderPoemas();
    ids.forEach((id) => toggleSelecao('poemas', true, id));
}

const poema = (id, extra = {}) => ({
    id,
    titulo: `P${id}`,
    sequencia: id,
    paiTipo: 'livro',
    paiId: 9,
    autoria: [{ autorId: 1 }],
    ...extra,
});

describe('Períodos e movimentos em massa: painel', () => {
    beforeEach(reset);

    it('monta o painel com os três campos e o autocompletar do primeiro', () => {
        prepararPainelPeriodosMassa('poemas');
        const opcoes = [...el('bulk-periodo-tipo').options].map((o) => o.value);
        assert.deepEqual(opcoes, ['movimento', 'epoca', 'periodoHistorico']);
        const sugestoes = [...el('bulk-periodo-sugestoes').options].map((o) => o.value);
        assert.deepEqual(sugestoes, ['Simbolismo']);
    });

    it('trocar o campo troca as sugestões, o placeholder e a dica', () => {
        prepararPainelPeriodosMassa('poemas');
        escolher('poemas', 'epoca', '');
        assert.deepEqual(
            [...el('bulk-periodo-sugestoes').options].map((o) => o.value),
            ['Juventude'],
        );
        assert.match(el('bulk-periodo-nome').placeholder, /Período Biográfico/);
        assert.match(el('bulk-periodo-dica').textContent, /pertence a um Autor/);
        assert.match(el('bulk-periodo-dica').textContent, /Aditivo/);
    });

    it('não há "substituir": os três campos são aditivos', () => {
        prepararPainelPeriodosMassa('poemas');
        ['movimento', 'periodoHistorico', 'epoca'].forEach((tipo) => {
            escolher('poemas', tipo, '');
            assert.equal(el('bulk-periodo-sobrescrever-wrap'), null);
            assert.equal(el('bulk-periodo-sobrescrever'), null);
        });
    });

    it('reabrir o painel não perde o que foi digitado e reflete o cadastro novo', () => {
        prepararPainelPeriodosMassa('poemas');
        el('bulk-periodo-nome').value = 'Sim';
        db.movimentosEscolas.push({ id: 301, nome: 'Modernismo' });
        prepararPainelPeriodosMassa('poemas');
        assert.equal(el('bulk-periodo-nome').value, 'Sim');
        assert.equal(el('bulk-periodo-sugestoes').options.length, 2);
    });
});

describe('Períodos e movimentos em massa: Poemas', () => {
    beforeEach(reset);

    it('aplica Movimento/Escola aos selecionados e não mexe nos outros', () => {
        db.poemas.push(poema(1, { movimentosEscolasIds: [999] }), poema(2), poema(3));
        selecionarPoemas(1, 2);
        prepararPainelPeriodosMassa('poemas');
        escolher('poemas', 'movimento', 'Simbolismo');
        aplicarPeriodoEmMassa('poemas');
        confirmar();

        assert.deepEqual(db.poemas[0].movimentosEscolasIds, [999, 300]);
        assert.deepEqual(db.poemas[1].movimentosEscolasIds, [300]);
        assert.equal(db.poemas[2].movimentosEscolasIds, undefined);
        assert.equal(el('bulk-periodo-nome').value, '', 'campo limpo depois de aplicar');
    });

    it('aplica Período Histórico somando ao que o texto já tinha', () => {
        db.periodosHistoricos.push({ id: 201, nome: 'Redemocratização' });
        db.poemas.push(poema(1), poema(2, { periodosHistoricosIds: [201] }));
        selecionarPoemas(1, 2);
        prepararPainelPeriodosMassa('poemas');
        escolher('poemas', 'periodoHistorico', 'Ditadura');
        aplicarPeriodoEmMassa('poemas');
        confirmar();

        assert.deepEqual(db.poemas[0].periodosHistoricosIds, [200]);
        assert.deepEqual(db.poemas[1].periodosHistoricosIds, [201, 200]);
    });

    it('aplica Período Biográfico pelo Autor do texto', () => {
        db.poemas.push(poema(1));
        selecionarPoemas(1);
        prepararPainelPeriodosMassa('poemas');
        escolher('poemas', 'epoca', 'Juventude');
        aplicarPeriodoEmMassa('poemas');
        confirmar();

        assert.deepEqual(db.poemas[0].epocaRetratada.periodos, [{ epocaId: 100, recorte: null }]);
    });

    it('aplica Período Biográfico somando ao que o texto já tinha, sem trocar', () => {
        db.poemas.push(
            poema(1, { epocaRetratada: { periodos: [{ epocaId: 102, recorte: 'momento' }] } }),
        );
        selecionarPoemas(1);
        prepararPainelPeriodosMassa('poemas');
        escolher('poemas', 'epoca', 'Juventude');
        aplicarPeriodoEmMassa('poemas');
        confirmar();

        assert.deepEqual(db.poemas[0].epocaRetratada.periodos, [
            { epocaId: 102, recorte: 'momento' },
            { epocaId: 100, recorte: null },
        ]);
    });

    it('sem nada a alterar: avisa e não abre a confirmação', () => {
        db.poemas.push(poema(1, { movimentosEscolasIds: [300] }));
        selecionarPoemas(1);
        prepararPainelPeriodosMassa('poemas');
        escolher('poemas', 'movimento', 'Simbolismo');
        aplicarPeriodoEmMassa('poemas');
        assert.ok(!modalAberto());
        assert.deepEqual(db.poemas[0].movimentosEscolasIds, [300]);
    });

    it('nome vazio não altera nada nem abre a confirmação', () => {
        db.poemas.push(poema(1));
        selecionarPoemas(1);
        prepararPainelPeriodosMassa('poemas');
        escolher('poemas', 'movimento', '   ');
        aplicarPeriodoEmMassa('poemas');
        assert.ok(!modalAberto());
        assert.equal(db.poemas[0].movimentosEscolasIds, undefined);
    });

    it('sem seleção não faz nada', () => {
        db.poemas.push(poema(1));
        renderPoemas();
        prepararPainelPeriodosMassa('poemas');
        escolher('poemas', 'movimento', 'Simbolismo');
        aplicarPeriodoEmMassa('poemas');
        assert.ok(!modalAberto());
        assert.equal(db.poemas[0].movimentosEscolasIds, undefined);
    });

    it('cancelar a confirmação não grava nada', () => {
        db.poemas.push(poema(1));
        selecionarPoemas(1);
        prepararPainelPeriodosMassa('poemas');
        escolher('poemas', 'movimento', 'Simbolismo');
        aplicarPeriodoEmMassa('poemas');
        assert.ok(modalAberto());
        assert.equal(db.poemas[0].movimentosEscolasIds, undefined);
    });

    it('remove só o valor escolhido dos selecionados', () => {
        db.poemas.push(
            poema(1, { movimentosEscolasIds: [300, 999] }),
            poema(2, { movimentosEscolasIds: [300] }),
        );
        selecionarPoemas(1);
        prepararPainelPeriodosMassa('poemas');
        escolher('poemas', 'movimento', 'Simbolismo');
        removerPeriodoEmMassa('poemas');
        confirmar();

        assert.deepEqual(db.poemas[0].movimentosEscolasIds, [999]);
        assert.deepEqual(db.poemas[1].movimentosEscolasIds, [300], 'não selecionado, intacto');
    });

    it('remover sem ninguém com o valor: avisa e não abre a confirmação', () => {
        db.poemas.push(poema(1, { movimentosEscolasIds: [999] }));
        selecionarPoemas(1);
        prepararPainelPeriodosMassa('poemas');
        escolher('poemas', 'movimento', 'Simbolismo');
        removerPeriodoEmMassa('poemas');
        assert.ok(!modalAberto());
    });
});

describe('Períodos e movimentos em massa: Prosas', () => {
    beforeEach(reset);

    it('usa ids próprios (-prosa) e grava em db.prosas', () => {
        db.prosas.push({
            id: 1,
            titulo: 'R1',
            sequencia: 1,
            paiTipo: 'livro',
            paiId: 9,
            autoria: [{ autorId: 1 }],
        });
        renderProsas();
        toggleSelecao('prosas', true, 1);
        prepararPainelPeriodosMassa('prosas');
        assert.ok(el('bulk-periodo-tipo-prosa'));
        assert.ok(!el('bulk-periodo-tipo'), 'não vaza pro painel de Poemas');
        escolher('prosas', 'movimento', 'Simbolismo');
        aplicarPeriodoEmMassa('prosas');
        confirmar();

        assert.deepEqual(db.prosas[0].movimentosEscolasIds, [300]);
    });
});
