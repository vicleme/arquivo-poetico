import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Ocultar uma Pessoa que aparece em períodos biográficos visíveis pergunta o
// que fazer com eles (só a pessoa, ou a pessoa e os períodos). Ocultar sozinho
// pegaria de surpresa um período que a pessoa queria manter visível.

const { db } = await import('../js/db.js');
const { toggleOcultarPessoa, ocultarSelecaoPessoas, selecaoPessoas } =
    await import('../js/pessoas-acoes.js');

const el = (id) => document.getElementById(id);
const modalAberto = () => el('modal-confirmar-exclusao')?.style.display === 'flex';

function montarBanco() {
    document.body.innerHTML = '';
    db.autores = [{ id: 1, nome: 'Ana' }];
    db.pessoas = [
        { id: 100, nome: 'Carla', genero: 'Mulher', oculto: false },
        { id: 101, nome: 'Davi', genero: 'Homem', oculto: false },
        { id: 102, nome: 'Eva', genero: 'Mulher', oculto: false },
    ];
    db.epocas = [
        {
            id: 10,
            nome: 'Namoro com Davi',
            autorId: 1,
            oculto: false,
            pessoasEnvolvidas: [{ pessoaId: 101 }],
            relacoes: [],
        },
        {
            id: 11,
            nome: 'Amizade com Davi e Eva',
            autorId: 1,
            oculto: false,
            pessoasEnvolvidas: [{ pessoaId: 101 }, { pessoaId: 102 }],
            relacoes: [],
        },
        {
            id: 12,
            nome: 'Já oculto',
            autorId: 1,
            oculto: true,
            pessoasEnvolvidas: [{ pessoaId: 101 }],
            relacoes: [],
        },
    ];
    selecaoPessoas.clear();
}

describe('ocultar Pessoa individual', () => {
    beforeEach(montarBanco);

    it('sem período ligado, oculta direto e não abre o aviso', () => {
        toggleOcultarPessoa(100);
        assert.equal(db.pessoas[0].oculto, true);
        assert.equal(modalAberto(), false);
    });

    it('com períodos visíveis ligados, abre o aviso e ainda não oculta nada', () => {
        toggleOcultarPessoa(101);
        assert.equal(modalAberto(), true);
        assert.equal(db.pessoas[1].oculto, false);
        assert.ok(el('excl-titulo').textContent.includes('Davi'));
        assert.ok(el('excl-secundaria').textContent.includes('2 períodos'));
    });

    it('"Ocultar só a pessoa" não mexe nos períodos', () => {
        toggleOcultarPessoa(101);
        el('excl-confirmar').onclick();
        assert.equal(db.pessoas[1].oculto, true);
        assert.deepEqual(
            db.epocas.map((e) => e.oculto),
            [false, false, true],
        );
    });

    it('"Ocultar também os períodos" oculta a pessoa e só os períodos ainda visíveis', () => {
        toggleOcultarPessoa(101);
        el('excl-secundaria').onclick();
        assert.equal(db.pessoas[1].oculto, true);
        assert.deepEqual(
            db.epocas.map((e) => e.oculto),
            [true, true, true],
        );
    });

    it('Cancelar não oculta nada', () => {
        toggleOcultarPessoa(101);
        el('excl-cancelar').onclick();
        assert.equal(db.pessoas[1].oculto, false);
        assert.deepEqual(
            db.epocas.map((e) => e.oculto),
            [false, false, true],
        );
    });

    it('Desfazer reexibe a pessoa e só os períodos que a ação ocultou', () => {
        toggleOcultarPessoa(101);
        el('excl-secundaria').onclick();
        const desfazer = [...document.querySelectorAll('button')].find(
            (b) => b.textContent === 'Desfazer',
        );
        assert.ok(desfazer, 'o aviso deve oferecer Desfazer');
        desfazer.click();
        assert.equal(db.pessoas[1].oculto, false);
        // O período 12 já estava oculto antes e continua assim.
        assert.deepEqual(
            db.epocas.map((e) => e.oculto),
            [false, false, true],
        );
    });
});

describe('ocultar Pessoas em massa', () => {
    beforeEach(montarBanco);

    it('une os períodos das pessoas selecionadas, sem repetir', () => {
        selecaoPessoas.add(101);
        selecaoPessoas.add(102);
        ocultarSelecaoPessoas();
        assert.equal(modalAberto(), true);
        assert.ok(el('excl-secundaria').textContent.includes('2 períodos'));
        el('excl-secundaria').onclick();
        assert.deepEqual(
            db.pessoas.map((p) => p.oculto),
            [false, true, true],
        );
        assert.deepEqual(
            db.epocas.map((e) => e.oculto),
            [true, true, true],
        );
    });

    it('sem períodos ligados, oculta direto', () => {
        selecaoPessoas.add(100);
        ocultarSelecaoPessoas();
        assert.equal(modalAberto(), false);
        assert.equal(db.pessoas[0].oculto, true);
    });
});
