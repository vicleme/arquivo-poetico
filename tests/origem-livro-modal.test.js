import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Modais de Poema e Prosa: ao salvar, "Cortado de" e "Lançado em" ganham o
// `livroId` quando o livro digitado está no cadastro (e o título de hoje no
// espelho `livro`). Livro fora do cadastro fica como texto livre, sem id.

globalThis.indexedDB = { open: () => ({}) };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
globalThis.fetch = async (url) => ({
    ok: true,
    status: 200,
    text: async () =>
        fs.readFileSync(path.resolve(__dirname, '../modais', path.basename(url)), 'utf8'),
});

document.body.innerHTML = '<main></main><div id="modais-container"></div>';

const { registrarModal, toggleModal } = await import('../js/modais.js');
const { db } = await import('../js/db.js');
const { initFormPoema, initFormProsa, editarPoema, editarProsa, rastreadorPoema, rastreadorProsa } =
    await import('../js/forms.js');

registrarModal('modal-poema', 'modal-poema.html', initFormPoema, rastreadorPoema);
registrarModal('modal-prosa', 'modal-prosa.html', initFormProsa, rastreadorProsa);

const aberto = (id) => {
    const el = document.getElementById(id);
    return !!el && !el.classList.contains('hidden');
};
const esperar = () => new Promise((r) => setTimeout(r, 30));

const CONF = {
    poema: {
        colecao: 'poemas',
        editar: editarPoema,
        rastreador: rastreadorPoema,
        modal: 'modal-poema',
        form: 'form-poema',
        pref: 'p',
        id: 11,
    },
    prosa: {
        colecao: 'prosas',
        editar: editarProsa,
        rastreador: rastreadorProsa,
        modal: 'modal-prosa',
        form: 'form-prosa',
        pref: 'pr',
        id: 21,
    },
};

function dados() {
    db.livros = [
        { id: 1, titulo: 'Livro Um', sequencia: 1, tipo: 'Inéditos' },
        { id: 2, titulo: 'Livro Dois', sequencia: 2, tipo: 'Inéditos' },
        { id: 3, titulo: 'Gêmeo', sequencia: 3, tipo: 'Inéditos' },
        { id: 4, titulo: 'Gêmeo', sequencia: 4, tipo: 'Inéditos' },
    ];
    db.partes = [];
    db.secoes = [];
    db.elementos = [];
    db.itensColetanea = [];
    const base = (id, extra) => ({
        id,
        titulo: `T${id}`,
        texto: 'a',
        livrosIds: [],
        status: 'migrado',
        sequencia: null,
        justificativaMigracao: 'mudou de livro',
        ...extra,
    });
    db.poemas = [
        base(11, {
            cortadoDe: { livro: 'Livro Um', livroId: 1, secao: 'Viagens', posicao: 3 },
            lancadoEm: { livro: 'Livro Dois', livroId: 2, secao: 'Cofre' },
        }),
        base(12, {
            cortadoDe: { livro: 'Gêmeo', livroId: 4, secao: 'Solta' },
        }),
        base(13, {
            cortadoDe: { livro: 'Antigo sem id', secao: 'Velha' },
        }),
    ];
    db.prosas = [
        base(21, {
            cortadoDe: { livro: 'Livro Um', livroId: 1, secao: 'Viagens', posicao: 3 },
            lancadoEm: { livro: 'Livro Dois', livroId: 2, secao: 'Cofre' },
        }),
        base(22, { cortadoDe: { livro: 'Gêmeo', livroId: 4, secao: 'Solta' } }),
        base(23, { cortadoDe: { livro: 'Antigo sem id', secao: 'Velha' } }),
    ];
}

for (const tipo of ['poema', 'prosa']) {
    const c = CONF[tipo];
    const el = (sufixo) => document.getElementById(`${c.pref}-${sufixo}`);
    const preencher = (sufixo, valor) => {
        el(sufixo).value = valor;
        el(sufixo).dispatchEvent(new Event('input', { bubbles: true }));
    };
    const salvar = async () => {
        document.getElementById(c.form).requestSubmit();
        await esperar();
    };
    const texto = (id) => db[c.colecao].find((t) => t.id === id);
    const outroId = tipo === 'poema' ? 12 : 22;
    const antigoId = tipo === 'poema' ? 13 : 23;

    describe(`Livro por id no modal (${tipo})`, () => {
        beforeEach(async () => {
            localStorage.clear();
            dados();
            c.rastreador.marcarLimpo();
            if (aberto(c.modal)) await toggleModal(c.modal);
        });

        it('salvar sem mexer mantém o id e o título do cadastro', async () => {
            await c.editar(c.id);
            await salvar();
            assert.deepEqual(texto(c.id).cortadoDe, {
                livro: 'Livro Um',
                livroId: 1,
                secao: 'Viagens',
                posicao: 3,
            });
            assert.deepEqual(texto(c.id).lancadoEm, {
                livro: 'Livro Dois',
                livroId: 2,
                secao: 'Cofre',
            });
        });

        it('digitar um livro cadastrado (outra caixa e espaços) grava o id e o título do cadastro', async () => {
            await c.editar(c.id);
            preencher('cortado-livro', '  livro  DOIS ');
            preencher('lancado-livro', 'livro um');
            await salvar();
            assert.equal(texto(c.id).cortadoDe.livroId, 2);
            assert.equal(texto(c.id).cortadoDe.livro, 'Livro Dois');
            assert.equal(texto(c.id).lancadoEm.livroId, 1);
            assert.equal(texto(c.id).lancadoEm.livro, 'Livro Um');
        });

        it('livro que não está no cadastro vira texto livre, sem id (o id antigo sai)', async () => {
            await c.editar(c.id);
            preencher('cortado-livro', 'Livro Fantasma');
            await salvar();
            assert.deepEqual(texto(c.id).cortadoDe, {
                livro: 'Livro Fantasma',
                secao: 'Viagens',
                posicao: 3,
            });
        });

        it('limpar o livro tira o id e deixa o resto', async () => {
            await c.editar(c.id);
            preencher('lancado-livro', '');
            await salvar();
            assert.deepEqual(texto(c.id).lancadoEm, { livro: '', secao: 'Cofre' });
        });

        it('título repetido no cadastro: um texto novo fica sem id', async () => {
            await c.editar(c.id);
            preencher('cortado-livro', 'Gêmeo');
            await salvar();
            assert.equal('livroId' in texto(c.id).cortadoDe, false);
            assert.equal(texto(c.id).cortadoDe.livro, 'Gêmeo');
        });

        it('título repetido: editar sem mexer mantém o id que já estava certo', async () => {
            await c.editar(outroId);
            await salvar();
            assert.equal(texto(outroId).cortadoDe.livroId, 4);
            assert.equal(texto(outroId).cortadoDe.livro, 'Gêmeo');
        });

        it('livro antigo sem id e fora do cadastro continua como estava', async () => {
            await c.editar(antigoId);
            await salvar();
            assert.deepEqual(texto(antigoId).cortadoDe, { livro: 'Antigo sem id', secao: 'Velha' });
        });

        it('livro antigo sem id que casa com o cadastro ganha o id ao salvar', async () => {
            texto(c.id).cortadoDe = { livro: 'livro um', secao: 'X' };
            await c.editar(c.id);
            await salvar();
            assert.equal(texto(c.id).cortadoDe.livroId, 1);
            assert.equal(texto(c.id).cortadoDe.livro, 'Livro Um');
        });

        it('descartar um texto grava o Cortado de proposto já com o id', async () => {
            db.secoes = [{ id: 5, titulo: 'Viagens', paiTipo: 'livro', paiId: 1, sequencia: 1 }];
            const t = texto(c.id);
            Object.assign(t, {
                status: 'publicado',
                paiTipo: 'secao',
                paiId: 5,
                livrosIds: [1],
                sequencia: 2,
                cortadoDe: null,
                lancadoEm: null,
                justificativaMigracao: '',
            });
            await c.editar(c.id);
            el('status').value = 'descartado';
            el('status').dispatchEvent(new Event('change', { bubbles: true }));
            await salvar();
            assert.equal(texto(c.id).status, 'descartado');
            assert.equal(texto(c.id).cortadoDe.livroId, 1);
            assert.equal(texto(c.id).cortadoDe.livro, 'Livro Um');
            assert.equal(texto(c.id).cortadoDe.secao, 'Viagens');
        });
    });
}
