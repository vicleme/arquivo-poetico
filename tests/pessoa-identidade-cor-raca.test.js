import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Fase 1, etapa 1c-0: a Pessoa ganha `identidadeCisTrans` e `corRaca`, com as
// mesmas listas fechadas do Autor. Vazio = não documentado.
const MODAL_HTML = fs.readFileSync(path.resolve(__dirname, '../modais/modal-pessoa.html'), 'utf8');
document.body.innerHTML = MODAL_HTML;

const { db, migrarPessoasIdentidade, mesclarPessoas, importarDB } = await import('../js/db.js');
const { initFormPessoa, editarPessoa } = await import('../js/forms.js');
const { IDENTIDADES_CIS_TRANS, CORES_RACA_AUTOR } = await import('../js/utils.js');

const el = (id) => document.getElementById(id);
const enviar = () => el('form-pessoa').onsubmit({ preventDefault() {} });

function limparModal() {
    el('form-pessoa').reset();
    el('ps-edit-id').value = '';
}

describe('Modal de Pessoa: identidade cis/trans e cor/raça', () => {
    beforeEach(() => {
        db.pessoas = [];
        db.grupos = [];
        db.autores = [];
        limparModal();
        initFormPessoa();
    });

    it('as opções dos selects batem com as listas fechadas do Autor', () => {
        const cisTrans = Array.from(el('ps-identidade-cis-trans').options)
            .map((o) => o.value)
            .filter(Boolean);
        const cor = Array.from(el('ps-cor-raca').options)
            .map((o) => o.value)
            .filter(Boolean);
        assert.deepEqual(cisTrans, IDENTIDADES_CIS_TRANS);
        assert.deepEqual(cor, CORES_RACA_AUTOR);
    });

    it('o padrão dos dois selects é vazio (não documentado)', () => {
        assert.equal(el('ps-identidade-cis-trans').value, '');
        assert.equal(el('ps-cor-raca').value, '');
    });

    it('salva uma Pessoa nova com os dois campos e reabre com eles marcados', async () => {
        el('ps-nome').value = 'Júlia';
        el('ps-genero').value = 'Mulher';
        el('ps-identidade-cis-trans').value = 'Transgênero';
        el('ps-cor-raca').value = 'Parda';
        enviar();

        assert.equal(db.pessoas.length, 1);
        assert.equal(db.pessoas[0].identidadeCisTrans, 'Transgênero');
        assert.equal(db.pessoas[0].corRaca, 'Parda');

        limparModal();
        await editarPessoa(db.pessoas[0].id);
        assert.equal(el('ps-identidade-cis-trans').value, 'Transgênero');
        assert.equal(el('ps-cor-raca').value, 'Parda');
    });

    it('salvar sem preencher grava vazio, nunca um valor assumido', () => {
        el('ps-nome').value = 'Ana';
        enviar();
        assert.equal(db.pessoas[0].identidadeCisTrans, '');
        assert.equal(db.pessoas[0].corRaca, '');
    });

    it('editar outra coisa não apaga os dois campos nem o estado de oculta', async () => {
        db.pessoas = [
            {
                id: 5,
                nome: 'Bia',
                genero: 'Mulher',
                identidadeCisTrans: 'Cisgênero',
                corRaca: 'Preta',
                grupoIds: [],
                autorIds: [],
                oculto: true,
            },
        ];
        await editarPessoa(5);
        el('ps-nome').value = 'Beatriz';
        enviar();
        const p = db.pessoas.find((x) => x.id === 5);
        assert.equal(p.nome, 'Beatriz');
        assert.equal(p.identidadeCisTrans, 'Cisgênero');
        assert.equal(p.corRaca, 'Preta');
        assert.equal(p.oculto, true);
    });

    it('limpar o select e salvar volta o campo para vazio', async () => {
        db.pessoas = [
            {
                id: 6,
                nome: 'Cris',
                genero: '',
                identidadeCisTrans: 'Cisgênero',
                corRaca: 'Branca',
                grupoIds: [],
                autorIds: [],
                oculto: false,
            },
        ];
        await editarPessoa(6);
        el('ps-identidade-cis-trans').value = '';
        el('ps-cor-raca').value = '';
        enviar();
        assert.equal(db.pessoas[0].identidadeCisTrans, '');
        assert.equal(db.pessoas[0].corRaca, '');
    });
});

describe('migrarPessoasIdentidade', () => {
    it('Pessoa antiga, sem os campos, ganha vazio e o resto fica intacto', () => {
        const pessoas = [{ id: 1, nome: 'Leo', genero: 'Homem', grupoIds: [2], autorIds: [] }];
        migrarPessoasIdentidade(pessoas);
        assert.deepEqual(pessoas[0], {
            id: 1,
            nome: 'Leo',
            genero: 'Homem',
            grupoIds: [2],
            autorIds: [],
            identidadeCisTrans: '',
            corRaca: '',
            orientacao: '',
        });
    });

    it('valor válido não é tocado e valor fora da lista vira vazio', () => {
        const pessoas = [
            { id: 1, nome: 'A', identidadeCisTrans: 'Cisgênero', corRaca: 'Indígena' },
            { id: 2, nome: 'B', identidadeCisTrans: 'cis', corRaca: 'Azul' },
        ];
        migrarPessoasIdentidade(pessoas);
        assert.equal(pessoas[0].identidadeCisTrans, 'Cisgênero');
        assert.equal(pessoas[0].corRaca, 'Indígena');
        assert.equal(pessoas[1].identidadeCisTrans, '');
        assert.equal(pessoas[1].corRaca, '');
    });

    it('é idempotente e aceita lista ausente', () => {
        const pessoas = [{ id: 1, nome: 'A', identidadeCisTrans: 'Transgênero', corRaca: 'Parda' }];
        migrarPessoasIdentidade(pessoas);
        const antes = JSON.stringify(pessoas);
        migrarPessoasIdentidade(pessoas);
        assert.equal(JSON.stringify(pessoas), antes);
        assert.doesNotThrow(() => migrarPessoasIdentidade(undefined));
    });
});

describe('Mesclar Pessoas: identidade e cor/raça', () => {
    const base = (extra) => ({ nome: 'X', grupoIds: [], autorIds: [], oculto: false, ...extra });

    it('o destino nunca é sobrescrito', () => {
        const dbRef = {
            poemas: [],
            prosas: [],
            pessoas: [
                { id: 1, ...base({ identidadeCisTrans: 'Cisgênero', corRaca: 'Branca' }) },
                { id: 2, ...base({ identidadeCisTrans: 'Transgênero', corRaca: 'Preta' }) },
            ],
        };
        mesclarPessoas(dbRef, 2, 1);
        assert.equal(dbRef.pessoas.length, 1);
        assert.equal(dbRef.pessoas[0].identidadeCisTrans, 'Cisgênero');
        assert.equal(dbRef.pessoas[0].corRaca, 'Branca');
    });

    it('o que estava vazio no destino é preenchido pela origem', () => {
        const dbRef = {
            poemas: [],
            prosas: [],
            pessoas: [
                { id: 1, ...base({ identidadeCisTrans: '', corRaca: '' }) },
                { id: 2, ...base({ identidadeCisTrans: 'Transgênero', corRaca: 'Preta' }) },
            ],
        };
        mesclarPessoas(dbRef, 2, 1);
        assert.equal(dbRef.pessoas[0].identidadeCisTrans, 'Transgênero');
        assert.equal(dbRef.pessoas[0].corRaca, 'Preta');
    });

    it('origem e destino sem os campos (registro antigo) não quebram', () => {
        const dbRef = {
            poemas: [],
            prosas: [],
            pessoas: [
                { id: 1, nome: 'A', grupoIds: [] },
                { id: 2, nome: 'A', grupoIds: [] },
            ],
        };
        assert.doesNotThrow(() => mesclarPessoas(dbRef, 2, 1));
        assert.equal(dbRef.pessoas.length, 1);
    });
});

describe('Backup antigo, sem os campos', () => {
    it('importarDB devolve a Pessoa com os dois campos vazios, sem erro', async () => {
        await importarDB({
            pessoas: [{ id: 1, nome: 'Antiga', genero: 'Mulher', grupoIds: [] }],
        });
        const p = db.pessoas.find((x) => x.id === 1);
        assert.equal(p.nome, 'Antiga');
        assert.equal(p.genero, 'Mulher');
        assert.equal(p.identidadeCisTrans, '');
        assert.equal(p.corRaca, '');
    });

    it('importarDB preserva os valores de um backup novo', async () => {
        await importarDB({
            pessoas: [
                { id: 2, nome: 'Nova', identidadeCisTrans: 'Transgênero', corRaca: 'Indígena' },
            ],
        });
        const p = db.pessoas.find((x) => x.id === 2);
        assert.equal(p.identidadeCisTrans, 'Transgênero');
        assert.equal(p.corRaca, 'Indígena');
    });
});
