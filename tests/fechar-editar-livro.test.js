import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Fechar o Editar livro com alteração não salva pede confirmação, como em Poema e
// Prosa. Usa o formulário real de Livro e o modal real, registrado como no main.js.

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
const { initFormLivro, editarLivro, rastreadorLivro } = await import('../js/forms.js');
const { abrirVisualizacaoLivro, editarLivroDoVisualizador } =
    await import('../js/visualizar-livro.js');
const { prepararNovo } = await import('../js/ui.js');

registrarModal('modal-livro', 'modal-livro.html', initFormLivro, rastreadorLivro);
registrarModal('modal-visualizar-livro', 'modal-visualizar-livro.html', () => {});

const aberto = (id) => {
    const el = document.getElementById(id);
    return !!el && !el.classList.contains('hidden');
};
const botao = (id) => document.getElementById(id);
const esperar = () => new Promise((r) => setTimeout(r, 30));
const deixarSujo = () =>
    document
        .getElementById('form-livro')
        .dispatchEvent(new window.Event('input', { bubbles: true }));

describe('fechar o Editar livro com alteração', () => {
    beforeEach(async () => {
        localStorage.clear();
        db.livros = [
            { id: 7, titulo: 'Livro Sete', sequencia: 1, tipo: 'Inéditos' },
            { id: 8, titulo: 'Livro Oito', sequencia: 2, tipo: 'Inéditos' },
        ];
        db.partes = [];
        db.secoes = [];
        db.poemas = [];
        db.prosas = [];
        db.itensColetanea = [];
        rastreadorLivro.marcarLimpo();
        for (const id of ['modal-livro', 'modal-visualizar-livro']) {
            if (aberto(id)) await toggleModal(id);
        }
        const conf = document.getElementById('modal-confirmar-exclusao');
        if (conf) conf.style.display = 'none';
    });

    it('sem alteração: fecha direto, sem pergunta', async () => {
        await editarLivro(7);
        await toggleModal('modal-livro');
        assert.equal(aberto('modal-livro'), false);
        assert.notEqual(document.getElementById('modal-confirmar-exclusao')?.style.display, 'flex');
    });

    it('com alteração: pergunta e segue aberto até responder', async () => {
        await editarLivro(7);
        document.getElementById('l-titulo').value = 'Mudou';
        deixarSujo();
        await toggleModal('modal-livro');
        assert.equal(aberto('modal-livro'), true);
        assert.equal(document.getElementById('modal-confirmar-exclusao').style.display, 'flex');
        assert.equal(document.getElementById('excl-titulo').textContent, 'Alterações não salvas');
    });

    it('Descartar fecha sem salvar; o título gravado não muda', async () => {
        await editarLivro(7);
        document.getElementById('l-titulo').value = 'Mudou';
        deixarSujo();
        await toggleModal('modal-livro');
        botao('excl-confirmar').click();
        await esperar();
        assert.equal(aberto('modal-livro'), false);
        assert.equal(db.livros.find((l) => l.id === 7).titulo, 'Livro Sete');
        assert.equal(rastreadorLivro.estaSujo(), false);
    });

    it('Cancelar na pergunta mantém o formulário aberto e sujo', async () => {
        await editarLivro(7);
        deixarSujo();
        await toggleModal('modal-livro');
        botao('excl-cancelar').click();
        await esperar();
        assert.equal(aberto('modal-livro'), true);
        assert.equal(rastreadorLivro.estaSujo(), true);
    });

    it('salvar (submit) não pede confirmação ao fechar', async () => {
        await editarLivro(7);
        document.getElementById('l-titulo').value = 'Livro Sete (revisto)';
        deixarSujo();
        document.getElementById('form-livro').requestSubmit();
        await esperar();
        assert.equal(aberto('modal-livro'), false);
        assert.equal(db.livros.find((l) => l.id === 7).titulo, 'Livro Sete (revisto)');
        assert.notEqual(document.getElementById('modal-confirmar-exclusao')?.style.display, 'flex');
    });

    it('livro novo: abrir e fechar sem mexer não pede confirmação', async () => {
        await prepararNovo('livro');
        await toggleModal('modal-livro'); // abre
        assert.equal(aberto('modal-livro'), true);
        await toggleModal('modal-livro'); // fecha
        assert.equal(aberto('modal-livro'), false);
    });

    it('livro novo com alteração também pergunta', async () => {
        await prepararNovo('livro');
        await toggleModal('modal-livro'); // abre
        deixarSujo();
        await toggleModal('modal-livro'); // tenta fechar
        assert.equal(aberto('modal-livro'), true);
        assert.equal(document.getElementById('excl-titulo').textContent, 'Alterações não salvas');
    });

    it('Ver, Editar, alterar, fechar: Descartar volta ao Ver do mesmo livro', async () => {
        await abrirVisualizacaoLivro(8, { ids: [7, 8] });
        await editarLivroDoVisualizador();
        await esperar();
        assert.equal(aberto('modal-livro'), true);
        deixarSujo();
        await toggleModal('modal-livro');
        assert.equal(aberto('modal-livro'), true, 'ainda pergunta antes de voltar');
        assert.equal(aberto('modal-visualizar-livro'), false);
        botao('excl-confirmar').click();
        await esperar();
        assert.equal(aberto('modal-livro'), false);
        assert.equal(aberto('modal-visualizar-livro'), true);
        assert.match(
            document.getElementById('modal-visualizar-livro-titulo').textContent,
            /Livro Oito/,
        );
    });

    it('Ver, Editar, alterar, Cancelar na pergunta: segue no Editar, sem abrir o Ver', async () => {
        await abrirVisualizacaoLivro(8, { ids: [7, 8] });
        await editarLivroDoVisualizador();
        await esperar();
        deixarSujo();
        await toggleModal('modal-livro');
        botao('excl-cancelar').click();
        await esperar();
        assert.equal(aberto('modal-livro'), true);
        assert.equal(aberto('modal-visualizar-livro'), false);
    });
});
