import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// "Esta pessoa sou eu": a ponte entre o Autor "sou eu" (quem escreve) e a Pessoa
// que aparece nos textos. Só uma Pessoa pode ser "eu"; o Autor "sou eu" entra nos
// Autores dela; mesclar e carregar o backup nunca perdem nem duplicam a marca.
const MODAL_HTML = fs.readFileSync(path.resolve(__dirname, '../modais/modal-pessoa.html'), 'utf8');
document.body.innerHTML = MODAL_HTML;

const { db, migrarPessoasSouEu, mesclarPessoas, obterPessoaSouEuId, definirPessoaSouEu } =
    await import('../js/db.js');
const { initFormPessoa, editarPessoa } = await import('../js/forms.js');

const el = (id) => document.getElementById(id);
const enviar = () => el('form-pessoa').onsubmit({ preventDefault() {} });
const limparModal = () => {
    el('form-pessoa').reset();
    el('ps-edit-id').value = '';
};

const pessoa = (id, nome, extra = {}) => ({
    id,
    nome,
    grupoIds: [],
    autorIds: [],
    oculto: false,
    ...extra,
});

describe('definirPessoaSouEu', () => {
    it('é exclusivo: marcar uma desmarca a outra', () => {
        const d = {
            pessoas: [pessoa(1, 'Victor', { souEu: true }), pessoa(2, 'Ana')],
            autores: [],
        };
        assert.equal(obterPessoaSouEuId(d), 1);
        assert.equal(definirPessoaSouEu(d, 2), true);
        assert.deepEqual(
            d.pessoas.map((p) => p.souEu),
            [false, true],
        );
        assert.equal(obterPessoaSouEuId(d), 2);
    });

    it('liga o Autor "sou eu" à Pessoa sem tirar os outros Autores e sem repetir', () => {
        const d = {
            pessoas: [pessoa(1, 'Victor', { autorIds: [7] })],
            autores: [
                { id: 7, nome: 'Outro' },
                { id: 9, nome: 'Victor Leme', souEu: true },
            ],
        };
        definirPessoaSouEu(d, 1);
        assert.deepEqual(d.pessoas[0].autorIds, [7, 9]);
        definirPessoaSouEu(d, 1);
        assert.deepEqual(d.pessoas[0].autorIds, [7, 9]);
    });

    it('sem Autor "sou eu", só marca a Pessoa', () => {
        const d = { pessoas: [pessoa(1, 'Victor')], autores: [{ id: 7, nome: 'Outro' }] };
        definirPessoaSouEu(d, 1);
        assert.equal(d.pessoas[0].souEu, true);
        assert.deepEqual(d.pessoas[0].autorIds, []);
    });

    it('false só desmarca; id inexistente devolve false', () => {
        const d = { pessoas: [pessoa(1, 'Victor', { souEu: true })], autores: [] };
        assert.equal(definirPessoaSouEu(d, 1, false), true);
        assert.equal(obterPessoaSouEuId(d), null);
        assert.equal(definirPessoaSouEu(d, 99), false);
    });
});

describe('migrarPessoasSouEu', () => {
    it('preenche false onde falta e deixa só a primeira marcada', () => {
        const ps = [
            pessoa(1, 'A'),
            pessoa(2, 'B', { souEu: true }),
            pessoa(3, 'C', { souEu: true }),
        ];
        migrarPessoasSouEu(ps);
        assert.deepEqual(
            ps.map((p) => p.souEu),
            [false, true, false],
        );
        migrarPessoasSouEu(ps);
        assert.deepEqual(
            ps.map((p) => p.souEu),
            [false, true, false],
        );
    });

    it('valor que não é true (texto, número) vira false', () => {
        const ps = [pessoa(1, 'A', { souEu: 'sim' }), pessoa(2, 'B', { souEu: 1 })];
        migrarPessoasSouEu(ps);
        assert.deepEqual(
            ps.map((p) => p.souEu),
            [false, false],
        );
    });
});

describe('mesclar Pessoa', () => {
    beforeEach(() => {
        db.poemas = [];
        db.prosas = [];
        db.epocas = [];
    });

    it('se a origem era "eu", o destino passa a ser', () => {
        db.pessoas = [pessoa(1, 'Victor', { souEu: true }), pessoa(2, 'Vic')];
        mesclarPessoas(db, 1, 2);
        assert.equal(db.pessoas.length, 1);
        assert.equal(db.pessoas[0].souEu, true);
    });

    it('se só o destino era "eu", continua', () => {
        db.pessoas = [pessoa(1, 'Vic'), pessoa(2, 'Victor', { souEu: true })];
        mesclarPessoas(db, 1, 2);
        assert.equal(db.pessoas[0].souEu, true);
    });
});

describe('Modal de Pessoa: Esta pessoa sou eu', () => {
    beforeEach(() => {
        db.pessoas = [];
        db.grupos = [];
        db.autores = [{ id: 9, nome: 'Victor Leme', souEu: true }];
        limparModal();
        initFormPessoa();
    });

    it('o padrão é desmarcado', () => {
        assert.equal(el('ps-sou-eu').checked, false);
    });

    it('salva marcada, liga ao Autor "sou eu" e reabre marcada', async () => {
        el('ps-nome').value = 'Victor';
        el('ps-sou-eu').checked = true;
        enviar();
        assert.equal(db.pessoas[0].souEu, true);
        assert.deepEqual(db.pessoas[0].autorIds, [9]);
        limparModal();
        await editarPessoa(db.pessoas[0].id);
        assert.equal(el('ps-sou-eu').checked, true);
    });

    it('marcar outra Pessoa desmarca a anterior', async () => {
        db.pessoas = [pessoa(1, 'Victor', { souEu: true }), pessoa(2, 'Vic')];
        limparModal();
        await editarPessoa(2);
        el('ps-sou-eu').checked = true;
        enviar();
        assert.deepEqual(
            db.pessoas.map((p) => p.souEu),
            [false, true],
        );
    });

    it('editar outra coisa não apaga a marca; salvar sem marcar a remove', async () => {
        db.pessoas = [pessoa(1, 'Victor', { souEu: true })];
        limparModal();
        await editarPessoa(1);
        el('ps-genero').value = 'Homem';
        enviar();
        assert.equal(db.pessoas[0].souEu, true);
        assert.equal(db.pessoas[0].genero, 'Homem');
        await editarPessoa(1);
        el('ps-sou-eu').checked = false;
        enviar();
        assert.equal(db.pessoas[0].souEu, false);
    });
});
