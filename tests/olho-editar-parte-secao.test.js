import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Olho do cabeçalho do Editar parte e do Editar seção: abre o Ver do mesmo item,
// trocando um modal pelo outro (sem empilhar), perguntando antes quando há alteração
// não salva; e o aviso "Alterações não salvas" ao fechar com alteração. Usa os
// formulários reais e os modais reais, registrados como no main.js.

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
const { initFormParte, initFormSecao, editarParte, editarSecao, rastreadorParte, rastreadorSecao } =
    await import('../js/forms.js');
const { abrirVisualizacaoParteSecao, verDoModalEdicaoParteSecao, editarParteSecaoDoVisualizador } =
    await import('../js/visualizar-parte-secao.js');
const { prepararNovo } = await import('../js/ui.js');

registrarModal('modal-parte', 'modal-parte.html', initFormParte, rastreadorParte);
registrarModal('modal-secao', 'modal-secao.html', initFormSecao, rastreadorSecao);
registrarModal('modal-visualizar-parte', 'modal-visualizar-parte.html', () => {});
registrarModal('modal-visualizar-secao', 'modal-visualizar-secao.html', () => {});

const CONF = {
    parte: {
        colecao: 'partes',
        editar: editarParte,
        rastreador: rastreadorParte,
        modal: 'modal-parte',
        ver: 'modal-visualizar-parte',
        form: 'form-parte',
        olho: 'parte-ver',
        titulo: 'part-titulo',
        id1: 10,
        id2: 11,
        nome1: 'Parte Dez',
        nome2: 'Parte Onze',
        // Link da imagem inválido: o formulário recusa o envio.
        recusar: () => {
            document.getElementById('part-imagem-url').value = 'isto não é um link';
        },
    },
    secao: {
        colecao: 'secoes',
        editar: editarSecao,
        rastreador: rastreadorSecao,
        modal: 'modal-secao',
        ver: 'modal-visualizar-secao',
        form: 'form-secao',
        olho: 'secao-ver',
        titulo: 'sec-titulo',
        id1: 20,
        id2: 21,
        nome1: 'Seção Vinte',
        nome2: 'Seção Vinte e Um',
        recusar: () => {
            document.getElementById('sec-imagem-url').value = 'isto não é um link';
        },
    },
};

const aberto = (id) => {
    const el = document.getElementById(id);
    return !!el && !el.classList.contains('hidden');
};
const botao = (id) => document.getElementById(id);
const esperar = () => new Promise((r) => setTimeout(r, 30));

function dados() {
    db.livros = [{ id: 1, titulo: 'Livro Um', sequencia: 1, tipo: 'Inéditos' }];
    db.partes = [
        { id: 10, livroId: 1, titulo: 'Parte Dez', sequencia: 1 },
        { id: 11, livroId: 1, titulo: 'Parte Onze', sequencia: 2 },
    ];
    db.secoes = [
        { id: 20, paiTipo: 'livro', paiId: 1, titulo: 'Seção Vinte', sequencia: 3 },
        { id: 21, paiTipo: 'livro', paiId: 1, titulo: 'Seção Vinte e Um', sequencia: 4 },
    ];
    db.poemas = [];
    db.prosas = [];
    db.elementos = [];
    db.itensColetanea = [];
}

for (const tipo of ['parte', 'secao']) {
    const c = CONF[tipo];
    const olho = () => botao(c.olho);
    const sujar = () =>
        document.getElementById(c.form).dispatchEvent(new window.Event('input', { bubbles: true }));
    const verAberto = () => aberto(c.ver);
    const tituloDoVer = () => document.getElementById(`${c.ver}-titulo`).textContent;

    describe(`olho do Editar ${tipo === 'parte' ? 'parte' : 'seção'}`, () => {
        beforeEach(async () => {
            localStorage.clear();
            dados();
            c.rastreador.marcarLimpo();
            for (const id of [c.modal, c.ver]) {
                if (aberto(id)) await toggleModal(id);
            }
            const conf = document.getElementById('modal-confirmar-exclusao');
            if (conf) conf.style.display = 'none';
            document.getElementById('avisos-toast')?.replaceChildren();
        });

        it('o botão existe, é o primeiro do cabeçalho e começa escondido', async () => {
            await toggleModal(c.modal);
            assert.ok(olho(), 'botão do olho');
            assert.ok(olho().classList.contains('hidden'));
            assert.match(
                olho().getAttribute('onclick'),
                new RegExp(`verDoModalEdicaoParteSecao\\('${tipo}'\\)`),
            );
            assert.equal(olho().getAttribute('aria-label'), 'Ver');
            const botoes = [...olho().parentElement.querySelectorAll('button')];
            assert.equal(botoes[0], olho(), 'antes do check e do X');
            assert.equal(botoes.length, 3);
        });

        it('editar mostra o olho; novo esconde', async () => {
            await c.editar(c.id1);
            assert.ok(!olho().classList.contains('hidden'), 'item existente mostra o olho');
            await prepararNovo(tipo);
            assert.ok(olho().classList.contains('hidden'), 'item novo esconde o olho');
        });

        it('abrir o Editar não deixa o formulário sujo', async () => {
            await c.editar(c.id1);
            assert.equal(c.rastreador.estaSujo(), false);
        });

        it('sem alteração: troca o Editar pelo Ver do mesmo item, sem pergunta', async () => {
            await c.editar(c.id1);
            await verDoModalEdicaoParteSecao(tipo);
            await esperar();
            assert.equal(aberto(c.modal), false, 'o Editar fechou');
            assert.equal(verAberto(), true, 'o Ver abriu');
            assert.match(tituloDoVer(), new RegExp(c.nome1));
        });

        it('item novo (sem id) não faz nada', async () => {
            await prepararNovo(tipo);
            await toggleModal(c.modal);
            await verDoModalEdicaoParteSecao(tipo);
            await esperar();
            assert.equal(aberto(c.modal), true);
            assert.equal(verAberto(), false);
        });

        it('com alteração: pergunta "Salvar antes de ver?" e nada muda até responder', async () => {
            await c.editar(c.id1);
            sujar();
            assert.equal(c.rastreador.estaSujo(), true);
            await verDoModalEdicaoParteSecao(tipo);
            const caixa = document.getElementById('modal-confirmar-exclusao');
            assert.equal(caixa.style.display, 'flex');
            assert.equal(
                document.getElementById('excl-titulo').textContent,
                'Salvar antes de ver?',
            );
            assert.equal(botao('excl-confirmar').textContent.trim(), 'Salvar e ver');
            assert.equal(botao('excl-secundaria').textContent.trim(), 'Descartar e ver');
            assert.equal(aberto(c.modal), true);
            assert.equal(verAberto(), false);
        });

        it('digitar no título conta como alteração', async () => {
            await c.editar(c.id1);
            const campo = document.getElementById(c.titulo);
            campo.value = `${c.nome1} (revisto)`;
            campo.dispatchEvent(new window.Event('input', { bubbles: true }));
            assert.equal(c.rastreador.estaSujo(), true);
        });

        it('Salvar e ver: salva de verdade, fecha o Editar e abre o Ver com o título novo', async () => {
            await c.editar(c.id1);
            document.getElementById(c.titulo).value = `${c.nome1} (revisto)`;
            sujar();
            await verDoModalEdicaoParteSecao(tipo);
            botao('excl-confirmar').click();
            await esperar();
            assert.equal(db[c.colecao].find((x) => x.id === c.id1).titulo, `${c.nome1} (revisto)`);
            assert.equal(aberto(c.modal), false);
            assert.equal(verAberto(), true);
            assert.match(tituloDoVer(), /\(revisto\)/);
            assert.equal(c.rastreador.estaSujo(), false);
        });

        it('Salvar e ver recusado pelo formulário: segue no Editar e um X depois não abre o Ver', async () => {
            await c.editar(c.id1);
            c.recusar();
            sujar();
            await verDoModalEdicaoParteSecao(tipo);
            botao('excl-confirmar').click();
            await esperar();
            assert.equal(aberto(c.modal), true, 'continua no Editar');
            assert.equal(verAberto(), false);
            assert.equal(db[c.colecao].find((x) => x.id === c.id1).titulo, c.nome1);
            // fecha pelo X: o formulário segue com alteração, então confirma o descarte;
            // e não pode aparecer um Ver que ninguém pediu
            await toggleModal(c.modal);
            assert.equal(aberto(c.modal), true, 'pediu confirmação antes de fechar');
            botao('excl-confirmar').click();
            await esperar();
            assert.equal(aberto(c.modal), false);
            assert.equal(verAberto(), false);
        });

        it('Salvar e ver com título vazio (validação do navegador): segue no Editar', async () => {
            await c.editar(c.id1);
            document.getElementById(c.titulo).value = '';
            sujar();
            await verDoModalEdicaoParteSecao(tipo);
            botao('excl-confirmar').click();
            await esperar();
            assert.equal(aberto(c.modal), true);
            assert.equal(verAberto(), false);
            assert.equal(db[c.colecao].find((x) => x.id === c.id1).titulo, c.nome1);
            await toggleModal(c.modal);
            botao('excl-confirmar').click(); // Descartar
            await esperar();
            assert.equal(aberto(c.modal), false);
            assert.equal(verAberto(), false, 'o combinado foi desfeito');
        });

        it('Descartar e ver: fecha o Editar sem salvar e abre o Ver', async () => {
            await c.editar(c.id1);
            document.getElementById(c.titulo).value = 'Mudou mas vai ser descartado';
            sujar();
            await verDoModalEdicaoParteSecao(tipo);
            botao('excl-secundaria').click();
            await esperar();
            assert.equal(aberto(c.modal), false);
            assert.equal(verAberto(), true);
            assert.match(tituloDoVer(), new RegExp(`${c.nome1}$`));
            assert.equal(db[c.colecao].find((x) => x.id === c.id1).titulo, c.nome1);
        });

        it('Cancelar na pergunta não muda nada', async () => {
            await c.editar(c.id1);
            sujar();
            await verDoModalEdicaoParteSecao(tipo);
            botao('excl-cancelar').click();
            await esperar();
            assert.equal(aberto(c.modal), true);
            assert.equal(verAberto(), false);
            assert.equal(c.rastreador.estaSujo(), true, 'continua com a alteração');
            c.rastreador.marcarLimpo();
            await toggleModal(c.modal);
            await esperar();
            assert.equal(verAberto(), false);
        });

        it('fechar o Editar com alteração pede confirmação; sem alteração fecha direto', async () => {
            await c.editar(c.id1);
            await toggleModal(c.modal);
            assert.equal(aberto(c.modal), false, 'sem alteração fecha direto');
            await c.editar(c.id1);
            sujar();
            await toggleModal(c.modal);
            assert.equal(aberto(c.modal), true, 'com alteração, espera a resposta');
            assert.equal(
                document.getElementById('excl-titulo').textContent,
                'Alterações não salvas',
            );
            botao('excl-confirmar').click(); // Descartar
            await esperar();
            assert.equal(aberto(c.modal), false);
        });

        it('Ver, Editar, olho: o Ver abre uma vez só, na mesma lista de navegação', async () => {
            await abrirVisualizacaoParteSecao(tipo, c.id2, { ids: [c.id1, c.id2] });
            await editarParteSecaoDoVisualizador(tipo);
            await esperar();
            assert.equal(verAberto(), false, 'o Ver fechou ao ir editar');
            assert.equal(aberto(c.modal), true);
            await verDoModalEdicaoParteSecao(tipo);
            await esperar();
            assert.equal(aberto(c.modal), false);
            assert.equal(verAberto(), true);
            assert.match(tituloDoVer(), new RegExp(c.nome2));
            assert.equal(document.getElementById(`visualizar-${tipo}-posicao`).value, '2');
            assert.equal(document.getElementById(`visualizar-${tipo}-total`).textContent, 'de 2');
            // fecha o Ver e o Editar não reabre nada sozinho
            await toggleModal(c.ver);
            await esperar();
            assert.equal(verAberto(), false);
            assert.equal(aberto(c.modal), false);
        });

        it('Editar, olho, Editar de novo: ida e volta sem empilhar', async () => {
            await c.editar(c.id1);
            await verDoModalEdicaoParteSecao(tipo);
            await esperar();
            assert.equal(verAberto(), true);
            await editarParteSecaoDoVisualizador(tipo);
            await esperar();
            assert.equal(verAberto(), false);
            assert.equal(aberto(c.modal), true);
            await verDoModalEdicaoParteSecao(tipo);
            await esperar();
            assert.equal(aberto(c.modal), false);
            assert.equal(verAberto(), true);
        });
    });
}
