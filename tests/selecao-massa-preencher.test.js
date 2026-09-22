import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Painel "Preencher campo" da barra de ações em massa (Poemas/Prosas).
// Esqueleto de DOM antes do import (mesmo motivo de render-dom.test.js).
document.body.innerHTML = `
    <main>
        <div id="barra-acoes-poemas" class="hidden"><span id="contador-selecao-poemas"></span></div>
        <div id="painel-preencher-massa"></div>
        <table>
            <thead><tr id="cabecalho-poemas"></tr></thead>
            <tbody id="lista-poemas"></tbody>
        </table>
        <div id="paginacao-poemas"></div>
        <div id="painel-colunas-poemas"></div>
        <select id="filtro-livro-poemas"></select>

        <div id="barra-acoes-prosas" class="hidden"><span id="contador-selecao-prosas"></span></div>
        <div id="painel-preencher-massa-prosa"></div>
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
    prepararPainelPreencherMassa,
    trocarCampoPreencherMassa,
    aplicarPreenchimentoEmMassa,
    limparCampoEmMassa,
} = await import('../js/selecao-massa.js');
const { renderPoemas, renderProsas } = await import('../js/render-listas.js');

const el = (id) => document.getElementById(id);
const confirmar = () => el('excl-confirmar').click();

function reset() {
    db.poemas.length = 0;
    db.prosas.length = 0;
    el('painel-preencher-massa').innerHTML = '';
    el('painel-preencher-massa-prosa').innerHTML = '';
    const overlay = el('modal-confirmar-exclusao');
    if (overlay) overlay.style.display = 'none';
}

function escolherCampo(tabela, chave) {
    const suf = tabela === 'poemas' ? '' : '-prosa';
    el(`bulk-campo${suf}`).value = chave;
    trocarCampoPreencherMassa(tabela);
}

describe('Preencher campo em massa', () => {
    beforeEach(reset);

    it('monta o painel a partir da lista de campos, com um select de campo', () => {
        prepararPainelPreencherMassa('poemas');
        const opcoes = [...el('bulk-campo').options].map((o) => o.value);
        assert.ok(opcoes.includes('fonteOrigem'));
        assert.ok(opcoes.includes('pendencia'));
        assert.ok(el('bulk-campo-valor'), 'campo de valor renderizado');
    });

    it('chamar de novo não perde o que foi digitado', () => {
        prepararPainelPreencherMassa('poemas');
        el('bulk-campo-valor').value = 'Obra própria';
        prepararPainelPreencherMassa('poemas');
        assert.equal(el('bulk-campo-valor').value, 'Obra própria');
    });

    it('campo booleano troca o valor por Sim/Não e esconde "sobrescrever"', () => {
        prepararPainelPreencherMassa('poemas');
        escolherCampo('poemas', 'fonteConferido');
        assert.equal(el('bulk-campo-valor').tagName, 'SELECT');
        assert.ok(el('bulk-campo-sobrescrever-wrap').classList.contains('hidden'));
        escolherCampo('poemas', 'pendencia');
        assert.equal(el('bulk-campo-valor').tagName, 'INPUT');
        assert.ok(!el('bulk-campo-sobrescrever-wrap').classList.contains('hidden'));
    });

    it('campo "opcoes" (Grafia) mostra select com as opções e mantém "sobrescrever" visível', () => {
        prepararPainelPreencherMassa('poemas');
        escolherCampo('poemas', 'fonteGrafia');
        assert.equal(el('bulk-campo-valor').tagName, 'SELECT');
        const valores = [...el('bulk-campo-valor').options].map((o) => o.value);
        assert.deepEqual(valores, ['', 'atual', 'etimológica', 'quinhentista']);
        assert.ok(!el('bulk-campo-sobrescrever-wrap').classList.contains('hidden'));
    });

    it('Poemas: preenche Grafia em massa (campo "opcoes")', () => {
        db.poemas.push(
            { id: 1, titulo: 'A', sequencia: 1, paiTipo: 'livro', paiId: 9 },
            { id: 2, titulo: 'B', sequencia: 2, paiTipo: 'livro', paiId: 9 },
        );
        renderPoemas();
        toggleSelecao('poemas', true, 1);
        toggleSelecao('poemas', true, 2);

        prepararPainelPreencherMassa('poemas');
        escolherCampo('poemas', 'fonteGrafia');
        el('bulk-campo-valor').value = 'etimológica';
        aplicarPreenchimentoEmMassa('poemas');
        confirmar();

        assert.equal(db.poemas[0].fonteTexto.grafia, 'etimológica');
        assert.equal(db.poemas[1].fonteTexto.grafia, 'etimológica');
    });

    it('Poemas: preenche Fonte só nos vazios da seleção e pula os que já têm', () => {
        db.poemas.push(
            { id: 1, titulo: 'A', sequencia: 1, paiTipo: 'livro', paiId: 9 },
            {
                id: 2,
                titulo: 'B',
                sequencia: 2,
                paiTipo: 'livro',
                paiId: 9,
                fonteTexto: { origem: 'Wikisource', edicao: '', link: '', conferido: false },
            },
            { id: 3, titulo: 'C', sequencia: 3, paiTipo: 'livro', paiId: 9 },
        );
        renderPoemas();
        toggleSelecao('poemas', true, 1);
        toggleSelecao('poemas', true, 2);

        prepararPainelPreencherMassa('poemas');
        escolherCampo('poemas', 'fonteOrigem');
        el('bulk-campo-valor').value = 'Obra própria';
        aplicarPreenchimentoEmMassa('poemas');

        assert.match(el('excl-mensagem').textContent, /1 poema/);
        assert.match(el('excl-mensagem').textContent, /já tinha valor/);
        confirmar();

        assert.equal(db.poemas[0].fonteTexto.origem, 'Obra própria');
        assert.equal(db.poemas[1].fonteTexto.origem, 'Wikisource');
        assert.ok(!db.poemas[2].fonteTexto, 'poema fora da seleção não muda');
    });

    it('com "sobrescrever" marcado, troca o valor existente', () => {
        db.poemas.push({
            id: 1,
            titulo: 'A',
            sequencia: 1,
            paiTipo: 'livro',
            paiId: 9,
            fonteTexto: { origem: 'Wikisource', edicao: '', link: '', conferido: false },
        });
        renderPoemas();
        toggleSelecao('poemas', true, 1);

        prepararPainelPreencherMassa('poemas');
        escolherCampo('poemas', 'fonteOrigem');
        el('bulk-campo-valor').value = 'Obra própria';
        el('bulk-campo-sobrescrever').checked = true;
        aplicarPreenchimentoEmMassa('poemas');
        confirmar();

        assert.equal(db.poemas[0].fonteTexto.origem, 'Obra própria');
    });

    it('Prosas: usa os ids com sufixo e grava em db.prosas', () => {
        db.prosas.push({ id: 1, titulo: 'P', sequencia: 1, paiTipo: 'livro', paiId: 9 });
        renderProsas();
        toggleSelecao('prosas', true, 1);

        prepararPainelPreencherMassa('prosas');
        escolherCampo('prosas', 'pendencia');
        el('bulk-campo-valor-prosa').value = 'revisar';
        aplicarPreenchimentoEmMassa('prosas');
        assert.match(el('excl-mensagem').textContent, /1 prosa/);
        confirmar();

        assert.equal(db.prosas[0].pendencia, 'revisar');
    });

    it('valor de texto vazio não abre confirmação', () => {
        db.poemas.push({ id: 1, titulo: 'A', sequencia: 1, paiTipo: 'livro', paiId: 9 });
        renderPoemas();
        toggleSelecao('poemas', true, 1);
        prepararPainelPreencherMassa('poemas');
        escolherCampo('poemas', 'pendencia');
        el('bulk-campo-valor').value = '   ';
        aplicarPreenchimentoEmMassa('poemas');
        assert.notEqual(el('modal-confirmar-exclusao')?.style.display, 'flex');
        assert.ok(!db.poemas[0].pendencia);
    });

    it('sem seleção, não faz nada', () => {
        prepararPainelPreencherMassa('poemas');
        escolherCampo('poemas', 'pendencia');
        el('bulk-campo-valor').value = 'x';
        aplicarPreenchimentoEmMassa('poemas');
        assert.notEqual(el('modal-confirmar-exclusao')?.style.display, 'flex');
    });

    it('Limpar campo esvazia só a seleção e conta os já vazios', () => {
        db.poemas.push(
            { id: 1, titulo: 'A', sequencia: 1, paiTipo: 'livro', paiId: 9, pendencia: 'x' },
            { id: 2, titulo: 'B', sequencia: 2, paiTipo: 'livro', paiId: 9 },
            { id: 3, titulo: 'C', sequencia: 3, paiTipo: 'livro', paiId: 9, pendencia: 'y' },
        );
        renderPoemas();
        toggleSelecao('poemas', true, 1);
        toggleSelecao('poemas', true, 2);
        prepararPainelPreencherMassa('poemas');
        escolherCampo('poemas', 'pendencia');
        limparCampoEmMassa('poemas');
        assert.match(el('excl-mensagem').textContent, /1 poema/);
        assert.match(el('excl-mensagem').textContent, /1 já estava vazio/);
        confirmar();

        assert.equal(db.poemas[0].pendencia, '');
        assert.equal(db.poemas[2].pendencia, 'y');
    });

    it('booleano: marcar "Texto conferido" em massa', () => {
        db.poemas.push({ id: 1, titulo: 'A', sequencia: 1, paiTipo: 'livro', paiId: 9 });
        renderPoemas();
        toggleSelecao('poemas', true, 1);
        prepararPainelPreencherMassa('poemas');
        escolherCampo('poemas', 'fonteConferido');
        el('bulk-campo-valor').value = 'sim';
        aplicarPreenchimentoEmMassa('poemas');
        assert.match(el('excl-mensagem').textContent, /marcar "Texto conferido"/);
        confirmar();
        assert.equal(db.poemas[0].fonteTexto.conferido, true);
    });
});
