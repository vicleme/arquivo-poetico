import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Campo "Sobre" de Parte e de Seção: está nos dois modais, é carregado no Editar,
// gravado ao salvar (e some ao apagar o texto), aparece no Ver antes da Abertura e
// não aparece quando vazio. Usa os formulários e os modais reais, como no main.js.

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
const { renderVisualizacaoParteHtml, renderVisualizacaoSecaoHtml } =
    await import('../js/visualizar-parte-secao.js');
const { prepararNovo } = await import('../js/ui.js');

registrarModal('modal-parte', 'modal-parte.html', initFormParte, rastreadorParte);
registrarModal('modal-secao', 'modal-secao.html', initFormSecao, rastreadorSecao);

const CONF = {
    parte: {
        colecao: 'partes',
        editar: editarParte,
        rastreador: rastreadorParte,
        modal: 'modal-parte',
        form: 'form-parte',
        campo: 'part-sobre',
        abertura: 'part-abertura',
        render: renderVisualizacaoParteHtml,
    },
    secao: {
        colecao: 'secoes',
        editar: editarSecao,
        rastreador: rastreadorSecao,
        modal: 'modal-secao',
        form: 'form-secao',
        campo: 'sec-sobre',
        abertura: 'sec-abertura',
        render: renderVisualizacaoSecaoHtml,
    },
};

const aberto = (id) => {
    const el = document.getElementById(id);
    return !!el && !el.classList.contains('hidden');
};
const esperar = () => new Promise((r) => setTimeout(r, 30));

function dados() {
    db.livros = [{ id: 1, titulo: 'Livro Um', sequencia: 1, tipo: 'Inéditos' }];
    db.partes = [
        {
            id: 10,
            livroId: 1,
            titulo: 'Parte Dez',
            sequencia: 1,
            sobre: 'Sobre a parte\nem duas linhas',
        },
        { id: 11, livroId: 1, titulo: 'Parte Onze', sequencia: 2 },
    ];
    db.secoes = [
        {
            id: 20,
            paiTipo: 'livro',
            paiId: 1,
            titulo: 'Seção Vinte',
            sequencia: 3,
            sobre: 'Sobre a seção',
        },
        { id: 21, paiTipo: 'livro', paiId: 1, titulo: 'Seção Vinte e Um', sequencia: 4 },
    ];
    db.poemas = [];
    db.prosas = [];
    db.elementos = [];
    db.itensColetanea = [];
}

for (const tipo of ['parte', 'secao']) {
    const c = CONF[tipo];
    const [idComSobre, idSemSobre] = tipo === 'parte' ? [10, 11] : [20, 21];
    const campo = () => document.getElementById(c.campo);

    describe(`Sobre na ${tipo === 'parte' ? 'Parte' : 'Seção'}`, () => {
        beforeEach(async () => {
            localStorage.clear();
            dados();
            c.rastreador.marcarLimpo();
            if (aberto(c.modal)) await toggleModal(c.modal);
        });

        it('o modal tem o campo Sobre, antes dos Versos de Abertura', async () => {
            await toggleModal(c.modal);
            assert.ok(campo(), 'campo Sobre');
            assert.equal(campo().tagName, 'TEXTAREA');
            const rotulo = campo().previousElementSibling;
            assert.equal(rotulo.textContent.trim(), 'Sobre');
            const ordem = campo().compareDocumentPosition(document.getElementById(c.abertura));
            assert.ok(ordem & 4, 'Abertura vem depois do Sobre');
        });

        it('Editar carrega o Sobre salvo; sem Sobre, o campo vem vazio', async () => {
            await c.editar(idComSobre);
            assert.equal(
                campo().value,
                tipo === 'parte' ? 'Sobre a parte\nem duas linhas' : 'Sobre a seção',
            );
            await c.editar(idSemSobre);
            assert.equal(campo().value, '');
        });

        it('salvar grava o Sobre digitado, e apagar o texto limpa o campo', async () => {
            await c.editar(idSemSobre);
            campo().value = 'Um texto novo\ncom quebra';
            document.getElementById(c.form).requestSubmit();
            await esperar();
            assert.equal(
                db[c.colecao].find((x) => x.id === idSemSobre).sobre,
                'Um texto novo\ncom quebra',
            );

            await c.editar(idComSobre);
            campo().value = '';
            document.getElementById(c.form).requestSubmit();
            await esperar();
            assert.equal(db[c.colecao].find((x) => x.id === idComSobre).sobre, '');
        });

        it('item novo abre com o Sobre vazio', async () => {
            await c.editar(idComSobre);
            await prepararNovo(tipo);
            assert.equal(campo().value, '');
        });

        it('o Ver mostra o Sobre antes da Abertura; vazio não aparece', () => {
            const item = { id: 1, titulo: 'X', sobre: 'Texto <b>sobre</b>', abertura: 'Versos' };
            const html = c.render(item, {});
            assert.match(html, /Sobre/);
            assert.match(html, /Texto &lt;b&gt;sobre&lt;\/b&gt;/, 'escapa HTML');
            assert.ok(html.indexOf('Sobre') < html.indexOf('Abertura'), 'Sobre vem antes');
            const vazio = c.render({ id: 2, titulo: 'Y', abertura: 'Versos' }, {});
            assert.doesNotMatch(vazio, /Sobre/);
            assert.match(vazio, /Abertura/);
        });
    });
}
