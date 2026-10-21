import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Olho do cabeçalho do Editar livro: abre o Ver do mesmo livro, trocando um
// modal pelo outro (sem empilhar), perguntando antes quando há alteração não
// salva. Usa o formulário real de Livro (initFormLivro) e o modal real.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const lerModal = (arquivo) =>
    fs.readFileSync(path.resolve(__dirname, '../modais', arquivo), 'utf8');

globalThis.fetch = async (url) => ({
    ok: true,
    status: 200,
    text: async () => lerModal(path.basename(url)),
});

document.body.innerHTML = '<main></main><div id="modais-container"></div>';

const { registrarModal, toggleModal } = await import('../js/modais.js');
const { db } = await import('../js/db.js');
const { initFormLivro, editarLivro, rastreadorLivro } = await import('../js/forms.js');
const { abrirVisualizacaoLivro, verDoModalEdicaoLivro, editarLivroDoVisualizador } =
    await import('../js/visualizar-livro.js');
const { prepararNovo } = await import('../js/ui.js');
const { adicionarLoja, removerLoja } = await import('../js/editor.js');

// Igual ao main.js: o rastreador também confirma o fechamento com alteração.
registrarModal('modal-livro', 'modal-livro.html', initFormLivro, rastreadorLivro);
registrarModal('modal-visualizar-livro', 'modal-visualizar-livro.html', () => {});

const aberto = (id) => {
    const el = document.getElementById(id);
    return !!el && !el.classList.contains('hidden');
};
const olho = () => document.getElementById('livro-ver');
const botao = (id) => document.getElementById(id);
const esperar = () => new Promise((r) => setTimeout(r, 30));

function deixarSujo() {
    document
        .getElementById('form-livro')
        .dispatchEvent(new window.Event('input', { bubbles: true }));
}

describe('olho do Editar livro', () => {
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
        // Limpa antes de fechar: com o rastreador registrado, fechar sujo pede confirmação.
        rastreadorLivro.marcarLimpo();
        for (const id of ['modal-livro', 'modal-visualizar-livro']) {
            if (aberto(id)) await toggleModal(id);
        }
        const conf = document.getElementById('modal-confirmar-exclusao');
        if (conf) conf.style.display = 'none';
        document.getElementById('avisos-toast')?.replaceChildren();
    });

    it('o botão existe, é o primeiro do cabeçalho e começa escondido', async () => {
        await toggleModal('modal-livro');
        assert.ok(olho(), 'botão do olho');
        assert.ok(olho().classList.contains('hidden'));
        assert.match(olho().getAttribute('onclick'), /verDoModalEdicaoLivro\(\)/);
        assert.equal(olho().getAttribute('aria-label'), 'Ver');
        const botoes = [...olho().parentElement.querySelectorAll('button')];
        assert.equal(botoes[0], olho(), 'antes do check e do X');
        assert.equal(botoes.length, 3);
    });

    it('editar um livro mostra o olho; novo livro esconde', async () => {
        await editarLivro(7);
        assert.ok(!olho().classList.contains('hidden'), 'livro existente mostra o olho');
        await prepararNovo('livro');
        assert.ok(olho().classList.contains('hidden'), 'livro novo esconde o olho');
    });

    it('abrir o Editar não deixa o formulário sujo', async () => {
        await editarLivro(7);
        assert.equal(rastreadorLivro.estaSujo(), false);
    });

    it('sem alteração: troca o Editar pelo Ver do mesmo livro, sem pergunta', async () => {
        await editarLivro(7);
        await verDoModalEdicaoLivro();
        await esperar();
        assert.equal(aberto('modal-livro'), false, 'o Editar fechou');
        assert.equal(aberto('modal-visualizar-livro'), true, 'o Ver abriu');
        assert.match(
            document.getElementById('modal-visualizar-livro-titulo').textContent,
            /Livro Sete/,
        );
    });

    it('livro novo (sem id) não faz nada', async () => {
        await prepararNovo('livro');
        await toggleModal('modal-livro');
        await verDoModalEdicaoLivro();
        await esperar();
        assert.equal(aberto('modal-livro'), true);
        assert.equal(aberto('modal-visualizar-livro'), false);
    });

    it('com alteração: pergunta "Salvar antes de ver?" e nada muda até responder', async () => {
        await editarLivro(7);
        deixarSujo();
        assert.equal(rastreadorLivro.estaSujo(), true);
        await verDoModalEdicaoLivro();
        const caixa = document.getElementById('modal-confirmar-exclusao');
        assert.equal(caixa.style.display, 'flex');
        assert.equal(document.getElementById('excl-titulo').textContent, 'Salvar antes de ver?');
        assert.equal(botao('excl-confirmar').textContent.trim(), 'Salvar e ver');
        assert.equal(botao('excl-secundaria').textContent.trim(), 'Descartar e ver');
        assert.equal(aberto('modal-livro'), true);
        assert.equal(aberto('modal-visualizar-livro'), false);
    });

    it('digitar no título conta como alteração', async () => {
        await editarLivro(7);
        const campo = document.getElementById('l-titulo');
        campo.value = 'Livro Sete (revisto)';
        campo.dispatchEvent(new window.Event('input', { bubbles: true }));
        assert.equal(rastreadorLivro.estaSujo(), true);
    });

    it('adicionar e remover loja contam como alteração', async () => {
        await editarLivro(7);
        document.getElementById('l-loja-nome').value = 'Loja Nova';
        document.getElementById('l-loja-url').value = 'https://exemplo.com/x';
        rastreadorLivro.marcarLimpo();
        adicionarLoja();
        assert.equal(rastreadorLivro.estaSujo(), true, 'adicionar');
        rastreadorLivro.marcarLimpo();
        removerLoja(0);
        assert.equal(rastreadorLivro.estaSujo(), true, 'remover');
    });

    it('Salvar e ver: salva de verdade, fecha o Editar e abre o Ver com o título novo', async () => {
        await editarLivro(7);
        document.getElementById('l-titulo').value = 'Livro Sete (revisto)';
        deixarSujo();
        await verDoModalEdicaoLivro();
        botao('excl-confirmar').click();
        await esperar();
        assert.equal(db.livros.find((l) => l.id === 7).titulo, 'Livro Sete (revisto)');
        assert.equal(aberto('modal-livro'), false);
        assert.equal(aberto('modal-visualizar-livro'), true);
        assert.match(
            document.getElementById('modal-visualizar-livro-titulo').textContent,
            /Livro Sete \(revisto\)/,
        );
        assert.equal(rastreadorLivro.estaSujo(), false);
    });

    it('Salvar e ver com data fora de ordem: segue no Editar e um X depois não abre o Ver', async () => {
        await editarLivro(7);
        document.getElementById('l-data-ano').value = '2020';
        document.getElementById('l-ultima-edicao-ano').value = '2010';
        deixarSujo();
        await verDoModalEdicaoLivro();
        botao('excl-confirmar').click();
        await esperar();
        assert.equal(aberto('modal-livro'), true, 'continua no Editar');
        assert.equal(aberto('modal-visualizar-livro'), false);
        assert.equal(db.livros.find((l) => l.id === 7).titulo, 'Livro Sete', 'nada foi gravado');
        // fecha pelo X: o formulário segue com alteração, então confirma o descarte;
        // e não pode aparecer um Ver que ninguém pediu
        await toggleModal('modal-livro');
        assert.equal(aberto('modal-livro'), true, 'pediu confirmação antes de fechar');
        botao('excl-confirmar').click();
        await esperar();
        assert.equal(aberto('modal-livro'), false);
        assert.equal(aberto('modal-visualizar-livro'), false);
    });

    it('Salvar e ver com título vazio (validação do navegador): segue no Editar', async () => {
        await editarLivro(7);
        document.getElementById('l-titulo').value = '';
        deixarSujo();
        await verDoModalEdicaoLivro();
        botao('excl-confirmar').click();
        await esperar();
        assert.equal(aberto('modal-livro'), true);
        assert.equal(aberto('modal-visualizar-livro'), false);
        assert.equal(db.livros.find((l) => l.id === 7).titulo, 'Livro Sete');
        await toggleModal('modal-livro');
        botao('excl-confirmar').click(); // Descartar
        await esperar();
        assert.equal(aberto('modal-livro'), false);
        assert.equal(aberto('modal-visualizar-livro'), false, 'o combinado foi desfeito');
    });

    it('Descartar e ver: fecha o Editar sem salvar e abre o Ver', async () => {
        await editarLivro(7);
        document.getElementById('l-titulo').value = 'Mudou mas vai ser descartado';
        deixarSujo();
        await verDoModalEdicaoLivro();
        botao('excl-secundaria').click();
        await esperar();
        assert.equal(aberto('modal-livro'), false);
        assert.equal(aberto('modal-visualizar-livro'), true);
        assert.match(
            document.getElementById('modal-visualizar-livro-titulo').textContent,
            /Livro Sete$/,
        );
        assert.equal(db.livros.find((l) => l.id === 7).titulo, 'Livro Sete');
    });

    it('Cancelar na pergunta não muda nada', async () => {
        await editarLivro(7);
        deixarSujo();
        await verDoModalEdicaoLivro();
        botao('excl-cancelar').click();
        await esperar();
        assert.equal(aberto('modal-livro'), true);
        assert.equal(aberto('modal-visualizar-livro'), false);
        assert.equal(rastreadorLivro.estaSujo(), true, 'continua com a alteração');
        // fechar o Editar agora não pode abrir um Ver que ninguém pediu
        rastreadorLivro.marcarLimpo();
        await toggleModal('modal-livro');
        await esperar();
        assert.equal(aberto('modal-visualizar-livro'), false);
    });

    it('Ver, Editar, olho: o Ver abre uma vez só, na mesma lista de navegação', async () => {
        await abrirVisualizacaoLivro(8, { ids: [7, 8] });
        await editarLivroDoVisualizador();
        await esperar();
        assert.equal(aberto('modal-visualizar-livro'), false, 'o Ver fechou ao ir editar');
        assert.equal(aberto('modal-livro'), true);
        await verDoModalEdicaoLivro();
        await esperar();
        assert.equal(aberto('modal-livro'), false);
        assert.equal(aberto('modal-visualizar-livro'), true);
        assert.match(
            document.getElementById('modal-visualizar-livro-titulo').textContent,
            /Livro Oito/,
        );
        assert.equal(document.getElementById('visualizar-livro-posicao').value, '2');
        assert.equal(document.getElementById('visualizar-livro-total').textContent, 'de 2');
        // fecha o Ver e o Editar não reabre nada sozinho
        await toggleModal('modal-visualizar-livro');
        await esperar();
        assert.equal(aberto('modal-visualizar-livro'), false);
        assert.equal(aberto('modal-livro'), false);
    });

    it('Editar, olho, Editar de novo: ida e volta sem empilhar', async () => {
        await editarLivro(7);
        await verDoModalEdicaoLivro();
        await esperar();
        assert.equal(aberto('modal-visualizar-livro'), true);
        await editarLivroDoVisualizador();
        await esperar();
        assert.equal(aberto('modal-visualizar-livro'), false);
        assert.equal(aberto('modal-livro'), true);
        await verDoModalEdicaoLivro();
        await esperar();
        assert.equal(aberto('modal-livro'), false);
        assert.equal(aberto('modal-visualizar-livro'), true);
    });
});
