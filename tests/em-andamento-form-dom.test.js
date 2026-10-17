import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Caixa "Em andamento" do modal de Período Biográfico: grava a marca, recusa
// junto com data em "Até" e é lida de volta ao editar.
const html = readFileSync(new URL('../modais/modal-epoca.html', import.meta.url), 'utf8');
document.body.innerHTML = `<div id="modais-container">${html}</div>`;

const { db } = await import('../js/db.js');
const { initFormEpoca, editarEpoca } = await import('../js/forms.js');

const el = (id) => document.getElementById(id);
const enviar = () =>
    el('form-epoca').dispatchEvent(new window.Event('submit', { cancelable: true, bubbles: true }));

function preparar() {
    db.autores = [{ id: 1, nome: 'Ana', genero: 'Mulher' }];
    db.pessoas = [];
    db.epocas = [];
    el('ep-autor').innerHTML = '<option value="1">Ana</option>';
    el('ep-autor').value = '1';
    el('ep-edit-id').value = '';
    el('ep-nome').value = 'Faculdade';
    el('ep-ini-ano').value = '2024';
    el('ep-fim-dia').value = '';
    el('ep-fim-mes').value = '';
    el('ep-fim-ano').value = '';
    el('ep-em-andamento').checked = false;
    el('ep-em-andamento-rotulo').value = '';
}

describe('Em andamento no Período Biográfico', () => {
    beforeEach(() => {
        preparar();
        initFormEpoca();
    });

    it('marcada, sem data de fim: grava emAndamento: true', () => {
        el('ep-em-andamento').checked = true;
        enviar();
        assert.equal(db.epocas.length, 1);
        assert.equal(db.epocas[0].emAndamento, true);
    });

    it('desmarcada: o campo nem existe no registro', () => {
        enviar();
        assert.equal(db.epocas.length, 1);
        assert.equal('emAndamento' in db.epocas[0], false);
    });

    it('marcada com data em "Até": recusa e não grava', () => {
        el('ep-em-andamento').checked = true;
        el('ep-fim-ano').value = '2026';
        enviar();
        assert.equal(db.epocas.length, 0);
    });

    it('ao editar, a caixa volta como estava; e desmarcar tira a marca', async () => {
        db.epocas = [
            {
                id: 7,
                nome: 'Faculdade',
                autorId: 1,
                inicio: { ano: 2024 },
                fim: null,
                emAndamento: true,
            },
        ];
        await editarEpoca(7);
        assert.equal(el('ep-em-andamento').checked, true);
        el('ep-em-andamento').checked = false;
        enviar();
        assert.equal(db.epocas.length, 1);
        assert.equal('emAndamento' in db.epocas[0], false);
    });

    it('rótulo "Em aberto" escolhido com a caixa marcada: grava emAberto: true', () => {
        el('ep-em-andamento').checked = true;
        el('ep-em-andamento-rotulo').value = 'aberto';
        enviar();
        assert.equal(db.epocas[0].emAndamento, true);
        assert.equal(db.epocas[0].emAberto, true);
    });

    it('rótulo "Em aberto" com a caixa desmarcada: nada é gravado', () => {
        el('ep-em-andamento-rotulo').value = 'aberto';
        enviar();
        assert.equal('emAndamento' in db.epocas[0], false);
        assert.equal('emAberto' in db.epocas[0], false);
    });

    it('a escolha do rótulo só fica ativa com a caixa marcada', () => {
        const caixa = el('ep-em-andamento');
        caixa.checked = true;
        caixa.dispatchEvent(new window.Event('change', { bubbles: true }));
        assert.equal(el('ep-em-andamento-rotulo').disabled, false);
        caixa.checked = false;
        caixa.dispatchEvent(new window.Event('change', { bubbles: true }));
        assert.equal(el('ep-em-andamento-rotulo').disabled, true);
    });

    it('ao editar, o rótulo volta como estava; trocar para "Em andamento" tira emAberto', async () => {
        db.epocas = [
            {
                id: 9,
                nome: 'Luto',
                autorId: 1,
                inicio: { ano: 2024 },
                fim: null,
                emAndamento: true,
                emAberto: true,
            },
        ];
        await editarEpoca(9);
        assert.equal(el('ep-em-andamento').checked, true);
        assert.equal(el('ep-em-andamento-rotulo').value, 'aberto');
        assert.equal(el('ep-em-andamento-rotulo').disabled, false);
        el('ep-em-andamento-rotulo').value = '';
        enviar();
        assert.equal(db.epocas[0].emAndamento, true);
        assert.equal('emAberto' in db.epocas[0], false);
    });
});
