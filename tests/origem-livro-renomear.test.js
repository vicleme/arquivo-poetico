import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Salvar um Livro com título novo propaga o nome para os textos que o citam em
// "Cortado de" e "Lançado em" (o vínculo é pelo id; o `livro` é o espelho do
// título), e o Fora de escopo segue achando o texto.

globalThis.indexedDB = { open: () => ({}) };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
globalThis.fetch = async (url) => ({
    ok: true,
    status: 200,
    text: async () =>
        fs.readFileSync(path.resolve(__dirname, '../modais', path.basename(url)), 'utf8'),
});

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const m = html.match(/<section id="livros"[\s\S]*?<\/section>/);
document.body.innerHTML = `<main>${m[0]}</main><div id="modais-container"></div>`;

const { registrarModal, toggleModal } = await import('../js/modais.js');
const { db } = await import('../js/db.js');
const { initFormLivro, rastreadorLivro, editarLivro } = await import('../js/forms.js');
const { foraDeEscopoDoLivro } = await import('../js/fora-de-escopo.js');

registrarModal('modal-livro', 'modal-livro.html', initFormLivro, rastreadorLivro);

const esperar = () => new Promise((r) => setTimeout(r, 40));

function dados() {
    db.livros = [
        { id: 1, titulo: 'Vol. 1', sequencia: 1, tipo: 'Inéditos' },
        { id: 2, titulo: 'Livro Dois', sequencia: 2, tipo: 'Inéditos' },
    ];
    db.partes = [];
    db.secoes = [];
    db.elementos = [];
    db.itensColetanea = [];
    db.poemas = [
        {
            id: 11,
            titulo: 'Descartado',
            status: 'descartado',
            livrosIds: [],
            cortadoDe: { livro: 'Vol. 1', livroId: 1, secao: 'Viagens', posicao: 2 },
        },
        {
            id: 12,
            titulo: 'Migrado',
            status: 'migrado',
            livrosIds: [2],
            cortadoDe: { livro: 'Livro Dois', livroId: 2, secao: 'Cofre' },
            lancadoEm: { livro: 'Vol. 1', livroId: 1, secao: 'Nova' },
        },
        {
            id: 13,
            titulo: 'Livre',
            status: 'migrado',
            livrosIds: [],
            cortadoDe: { livro: 'Livro Fantasma', secao: 'Z' },
        },
    ];
    db.prosas = [
        {
            id: 21,
            titulo: 'Prosa migrada',
            status: 'migrado',
            livrosIds: [],
            cortadoDe: { livro: 'Vol. 1', livroId: 1, secao: 'Viagens' },
        },
    ];
}

// A ordem de db.poemas segue a aparição principal (21-4d): buscar por id.
const poema = (id) => db.poemas.find((x) => x.id === id);

async function renomear(id, titulo) {
    await editarLivro(id);
    document.getElementById('l-titulo').value = titulo;
    document
        .getElementById('form-livro')
        .dispatchEvent(new window.Event('submit', { cancelable: true }));
    await esperar();
}

describe('renomear um Livro acompanha os textos', () => {
    beforeEach(async () => {
        dados();
        const el = document.getElementById('modal-livro');
        if (el && !el.classList.contains('hidden')) await toggleModal('modal-livro');
    });

    it('o espelho do título muda em Cortado de e Lançado em, de Poema e de Prosa', async () => {
        await renomear(1, 'Memórias, vol. 1');
        assert.equal(db.livros[0].titulo, 'Memórias, vol. 1');
        assert.equal(poema(11).cortadoDe.livro, 'Memórias, vol. 1');
        assert.equal(poema(12).lancadoEm.livro, 'Memórias, vol. 1');
        assert.equal(db.prosas[0].cortadoDe.livro, 'Memórias, vol. 1');
        assert.equal(poema(11).cortadoDe.livroId, 1);
    });

    it('não mexe no que não é do livro renomeado nem na seção e na posição', async () => {
        await renomear(1, 'Memórias, vol. 1');
        assert.deepEqual(poema(11).cortadoDe, {
            livro: 'Memórias, vol. 1',
            livroId: 1,
            secao: 'Viagens',
            posicao: 2,
        });
        assert.equal(poema(12).cortadoDe.livro, 'Livro Dois');
        assert.deepEqual(poema(13).cortadoDe, { livro: 'Livro Fantasma', secao: 'Z' });
    });

    it('o descartado e o migrado continuam no Fora de escopo do livro renomeado', async () => {
        await renomear(1, 'Outro nome');
        const fora = foraDeEscopoDoLivro(db, 1);
        assert.deepEqual(
            fora.descartados.map((e) => e.id),
            [11],
        );
        assert.deepEqual(fora.migrados.map((e) => e.id).sort(), [21]);
    });

    it('salvar um livro sem trocar o título não muda nada nos textos', async () => {
        await renomear(2, 'Livro Dois');
        assert.equal(poema(12).cortadoDe.livro, 'Livro Dois');
        assert.equal(poema(11).cortadoDe.livro, 'Vol. 1');
    });

    it('um livro novo com o nome de uma origem solta liga os textos que a citam', async () => {
        document.getElementById('l-edit-id').value = '';
        await toggleModal('modal-livro');
        document.getElementById('l-titulo').value = 'Livro Fantasma';
        document
            .getElementById('form-livro')
            .dispatchEvent(new window.Event('submit', { cancelable: true }));
        await esperar();
        const novo = db.livros.find((l) => l.titulo === 'Livro Fantasma');
        assert.ok(novo);
        assert.equal(poema(13).cortadoDe.livroId, novo.id);
    });
});
