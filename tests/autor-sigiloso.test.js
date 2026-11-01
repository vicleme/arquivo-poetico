import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// A caixa "Autor sigiloso" do modal de Autor (31/10/2026): lógica pura do
// campo e do aviso, e o ciclo do modal real (salvar, reabrir, avisar).
document.body.innerHTML = fs.readFileSync(
    path.resolve(__dirname, '../modais/modal-autor.html'),
    'utf8',
);

const {
    autorEhSigiloso,
    temNomeLiterario,
    deveAvisarSigilo,
    nomesLiterariosDoCampo,
    nomeAnonimiza,
} = await import('../js/autor-sigiloso.js');
const { db } = await import('../js/db.js');
const { initFormAutor, editarAutor } = await import('../js/forms.js');
const {
    adicionarNomeLiterarioAutor,
    atualizarAvisoSigiloAutor,
    alterarAnonimizarNomeLiterarioAutor,
    editarNomeLiterarioAutor,
    alterarTipoNomeLiterarioAutor,
    removerNomeLiterarioAutor,
} = await import('../js/editor.js');

const el = (id) => document.getElementById(id);
const aviso = () => el('au-sigiloso-aviso');
const visivel = () => !aviso().classList.contains('hidden') && aviso().textContent !== '';

describe('autor-sigiloso: lógica pura', () => {
    it('só `sigiloso: true` conta; ausente e falso não', () => {
        assert.equal(autorEhSigiloso({ sigiloso: true }), true);
        assert.equal(autorEhSigiloso({ sigiloso: false }), false);
        assert.equal(autorEhSigiloso({}), false);
        assert.equal(autorEhSigiloso(null), false);
        assert.equal(autorEhSigiloso({ sigiloso: 'sim' }), false);
    });

    it('nome literário vazio ou em branco não conta', () => {
        assert.equal(temNomeLiterario([{ nome: 'Job', tipo: 'Pseudônimo' }]), true);
        assert.equal(temNomeLiterario([{ nome: '  ', tipo: 'Pseudônimo' }]), false);
        assert.equal(temNomeLiterario([]), false);
        assert.equal(temNomeLiterario(undefined), false);
    });

    it('avisa só com nome literário e a caixa desligada', () => {
        const nomes = [{ nome: 'Job', tipo: 'Pseudônimo' }];
        assert.equal(deveAvisarSigilo(nomes, false), true);
        assert.equal(deveAvisarSigilo(nomes, true), false);
        assert.equal(deveAvisarSigilo([], false), false);
    });

    it('lê o campo escondido com tolerância a valor ausente ou inválido', () => {
        assert.deepEqual(nomesLiterariosDoCampo('[{"nome":"A","tipo":"Heterônimo"}]'), [
            { nome: 'A', tipo: 'Heterônimo' },
        ]);
        assert.deepEqual(nomesLiterariosDoCampo(''), []);
        assert.deepEqual(nomesLiterariosDoCampo(undefined), []);
        assert.deepEqual(nomesLiterariosDoCampo('não é json'), []);
        assert.deepEqual(nomesLiterariosDoCampo('{"a":1}'), []);
    });
});

describe('Modal de Autor: "Autor sigiloso"', () => {
    beforeEach(() => {
        db.autores = [];
        el('au-edit-id').value = '';
        el('au-nome').value = '';
        el('au-sou-eu').checked = false;
        el('au-sigiloso').checked = false;
        el('au-nomes-literarios').value = '';
        initFormAutor();
        atualizarAvisoSigiloAutor();
    });

    it('a caixa vem desligada e o aviso escondido', () => {
        assert.equal(el('au-sigiloso').checked, false);
        assert.equal(visivel(), false);
    });

    it('grava sigiloso: true quando marcado e false quando desmarcado', () => {
        el('au-nome').value = 'Fernando Pessoa';
        el('au-sigiloso').checked = true;
        el('form-autor').onsubmit({ preventDefault() {} });
        assert.equal(db.autores[0].sigiloso, true);

        db.autores = [];
        el('au-nome').value = 'Cruz e Sousa';
        el('au-sigiloso').checked = false;
        el('form-autor').onsubmit({ preventDefault() {} });
        assert.equal(db.autores[0].sigiloso, false);
    });

    it('editarAutor recarrega a caixa; cadastro antigo, sem o campo, abre desligado', async () => {
        db.autores = [
            { id: 7, nome: 'Anônima', sigiloso: true },
            { id: 8, nome: 'Camões' },
        ];
        await editarAutor(7);
        assert.equal(el('au-sigiloso').checked, true);
        await editarAutor(8);
        assert.equal(el('au-sigiloso').checked, false);
    });

    it('avisa ao abrir um Autor com nome literário e a caixa desligada', async () => {
        db.autores = [
            { id: 1, nome: 'A', nomesLiterarios: [{ nome: 'Job', tipo: 'Pseudônimo' }] },
            {
                id: 2,
                nome: 'B',
                sigiloso: true,
                nomesLiterarios: [{ nome: 'Job', tipo: 'Pseudônimo' }],
            },
            { id: 3, nome: 'C' },
        ];
        await editarAutor(1);
        assert.equal(visivel(), true);
        assert.match(aviso().textContent, /Autor sigiloso/);
        await editarAutor(2);
        assert.equal(visivel(), false);
        await editarAutor(3);
        assert.equal(visivel(), false);
    });

    it('ligar a caixa some com o aviso, desligar traz de volta', async () => {
        db.autores = [{ id: 1, nome: 'A', nomesLiterarios: [{ nome: 'Job', tipo: 'Pseudônimo' }] }];
        await editarAutor(1);
        initFormAutor();
        assert.equal(visivel(), true);
        el('au-sigiloso').checked = true;
        el('au-sigiloso').onchange();
        assert.equal(visivel(), false);
        el('au-sigiloso').checked = false;
        el('au-sigiloso').onchange();
        assert.equal(visivel(), true);
    });

    it('cadastrar o primeiro nome literário, com a caixa desligada, acende o aviso', () => {
        assert.equal(visivel(), false);
        adicionarNomeLiterarioAutor('Álvaro de Campos');
        assert.equal(visivel(), true);
    });
});

describe('Anonimizar autor, por nome literário', () => {
    const nomesNoCampo = () => JSON.parse(el('au-nomes-literarios').value || '[]');
    const caixasDosChips = () =>
        Array.from(el('au-nomes-literarios-container').querySelectorAll('input[type="checkbox"]'));

    beforeEach(() => {
        db.autores = [];
        el('au-edit-id').value = '';
        el('au-nome').value = '';
        el('au-sigiloso').checked = false;
        el('au-nomes-literarios').value = '';
        initFormAutor();
        // zera a lista de nomes do grupo
        editarAutor.length;
        db.autores = [{ id: 99, nome: 'Vazio' }];
    });

    it('só `anonimizar: true` marca o nome', () => {
        assert.equal(nomeAnonimiza({ nome: 'Job', anonimizar: true }), true);
        assert.equal(nomeAnonimiza({ nome: 'Job', anonimizar: false }), false);
        assert.equal(nomeAnonimiza({ nome: 'Job' }), false);
        assert.equal(nomeAnonimiza({ nome: 'Job', anonimizar: 'sim' }), false);
        assert.equal(nomeAnonimiza(null), false);
    });

    it('o aviso só vale para nome sem a marca: com todos marcados, não avisa', () => {
        const solto = { nome: 'Job', tipo: 'Pseudônimo' };
        const marcado = { nome: 'Álvaro', tipo: 'Heterônimo', anonimizar: true };
        assert.equal(deveAvisarSigilo([solto], false), true);
        assert.equal(deveAvisarSigilo([marcado], false), false);
        assert.equal(deveAvisarSigilo([marcado, solto], false), true);
        assert.equal(deveAvisarSigilo([solto], true), false);
        // nome vazio não pede aviso
        assert.equal(deveAvisarSigilo([{ nome: '  ', tipo: 'Pseudônimo' }], false), false);
    });

    it('cada chip ganha a caixa, desligada por padrão, e ligar grava `anonimizar: true`', async () => {
        db.autores = [{ id: 1, nome: 'Maria Real' }];
        await editarAutor(1);
        adicionarNomeLiterarioAutor('Job');
        assert.equal(caixasDosChips().length, 1);
        assert.equal(caixasDosChips()[0].checked, false);
        assert.deepEqual(nomesNoCampo(), [{ nome: 'Job', tipo: 'Heterônimo' }]);

        alterarAnonimizarNomeLiterarioAutor('Job', true);
        assert.equal(caixasDosChips()[0].checked, true);
        assert.deepEqual(nomesNoCampo(), [{ nome: 'Job', tipo: 'Heterônimo', anonimizar: true }]);

        // desligar tira a chave (não grava `anonimizar: false`)
        alterarAnonimizarNomeLiterarioAutor('Job', false);
        assert.deepEqual(nomesNoCampo(), [{ nome: 'Job', tipo: 'Heterônimo' }]);
    });

    it('salvar e reabrir mantém a marca só no nome marcado', async () => {
        db.autores = [{ id: 1, nome: 'Maria Real' }];
        await editarAutor(1);
        initFormAutor();
        adicionarNomeLiterarioAutor('Job');
        adicionarNomeLiterarioAutor('Álvaro');
        alterarAnonimizarNomeLiterarioAutor('Job', true);
        el('form-autor').onsubmit({ preventDefault() {} });
        const salvo = db.autores.find((a) => a.id === 1);
        assert.deepEqual(salvo.nomesLiterarios, [
            { nome: 'Job', tipo: 'Heterônimo', anonimizar: true },
            { nome: 'Álvaro', tipo: 'Heterônimo' },
        ]);

        await editarAutor(1);
        const marcas = caixasDosChips().map((c) => c.checked);
        assert.deepEqual(marcas, [true, false]);
    });

    it('cadastro antigo, sem a chave, abre com a caixa do nome desligada', async () => {
        db.autores = [{ id: 1, nome: 'A', nomesLiterarios: [{ nome: 'Job', tipo: 'Pseudônimo' }] }];
        await editarAutor(1);
        assert.deepEqual(
            caixasDosChips().map((c) => c.checked),
            [false],
        );
    });

    it('mudar o tipo do nome não perde a marca', async () => {
        db.autores = [
            {
                id: 1,
                nome: 'A',
                nomesLiterarios: [{ nome: 'Job', tipo: 'Pseudônimo', anonimizar: true }],
            },
        ];
        await editarAutor(1);
        alterarTipoNomeLiterarioAutor('Job', 'Heterônimo');
        assert.deepEqual(nomesNoCampo(), [{ nome: 'Job', tipo: 'Heterônimo', anonimizar: true }]);
    });

    it('editar (✎) e adicionar de novo devolve a marca; remover a descarta', async () => {
        db.autores = [
            {
                id: 1,
                nome: 'A',
                nomesLiterarios: [{ nome: 'Job', tipo: 'Pseudônimo', anonimizar: true }],
            },
        ];
        await editarAutor(1);
        editarNomeLiterarioAutor('Job');
        assert.deepEqual(nomesNoCampo(), []);
        assert.equal(el('au-nome-literario-input').value, 'Job');
        adicionarNomeLiterarioAutor();
        assert.equal(nomesNoCampo()[0].anonimizar, true);

        // a marca pendente não vaza para o próximo nome depois de um remover
        editarNomeLiterarioAutor('Job');
        removerNomeLiterarioAutor('qualquer');
        adicionarNomeLiterarioAutor('Outro');
        assert.equal(nomesNoCampo().find((n) => n.nome === 'Outro').anonimizar, undefined);
    });

    it('marcar o único nome, com a caixa do Autor desligada, some com o aviso', async () => {
        db.autores = [{ id: 1, nome: 'A', nomesLiterarios: [{ nome: 'Job', tipo: 'Pseudônimo' }] }];
        await editarAutor(1);
        assert.equal(visivel(), true);
        alterarAnonimizarNomeLiterarioAutor('Job', true);
        assert.equal(visivel(), false);
        alterarAnonimizarNomeLiterarioAutor('Job', false);
        assert.equal(visivel(), true);
    });
});
