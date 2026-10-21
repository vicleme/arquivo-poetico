import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// O título de uma Parte ou de uma Seção na Estrutura abre o Ver dela: no Ver do Livro,
// nos Ver de Parte e de Seção (a Seção de dentro de uma Parte) e na aba Estrutura. Ao
// fechar, volta ao Ver de onde veio, com a Estrutura como estava, em cadeia.

globalThis.indexedDB = { open: () => ({}) };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
globalThis.fetch = async (url) => ({
    ok: true,
    status: 200,
    text: async () =>
        fs.readFileSync(path.resolve(__dirname, '../modais', path.basename(url)), 'utf8'),
});
document.body.innerHTML =
    '<main><div id="estrutura-arvore"></div></main><div id="modais-container"></div>';

const { registrarModal, toggleModal } = await import('../js/modais.js');
const { db } = await import('../js/db.js');
const { initFormParte, initFormSecao, rastreadorParte, rastreadorSecao } =
    await import('../js/forms.js');
const { abrirVisualizacaoLivro } = await import('../js/visualizar-livro.js');
const { abrirVisualizacaoParteSecao, abrirParteSecaoDaEstrutura, editarParteSecaoDoVisualizador } =
    await import('../js/visualizar-parte-secao.js');
const { setLivroEstrutura } = await import('../js/render-estrutura.js');

registrarModal('modal-visualizar-livro', 'modal-visualizar-livro.html', () => {});
registrarModal('modal-visualizar-parte', 'modal-visualizar-parte.html', () => {});
registrarModal('modal-visualizar-secao', 'modal-visualizar-secao.html', () => {});
registrarModal('modal-visualizar', 'modal-visualizar.html', () => {});
registrarModal('modal-parte', 'modal-parte.html', initFormParte, rastreadorParte);
registrarModal('modal-secao', 'modal-secao.html', initFormSecao, rastreadorSecao);

const conceitos = { elos: [], ecos: [] };

function dados() {
    return {
        livros: [{ id: 1, titulo: 'Livro Um', tipo: 'Inéditos', sequencia: 1 }],
        partes: [{ id: 10, livroId: 1, titulo: 'Parte A', sequencia: 1 }],
        secoes: [
            { id: 100, paiTipo: 'parte', paiId: 10, titulo: 'Seção A1', sequencia: 1 },
            { id: 101, paiTipo: 'livro', paiId: 1, titulo: 'Seção solta', sequencia: 2 },
        ],
        elementos: [],
        poemas: [
            {
                id: 1,
                titulo: 'Poema na seção',
                paiTipo: 'secao',
                paiId: 100,
                sequencia: 1,
                conceitos,
            },
        ],
        prosas: [],
        itensColetanea: [],
    };
}

const aberto = (id) => {
    const el = document.getElementById(id);
    return !!el && !el.classList.contains('hidden');
};
const abertos = () =>
    [...document.querySelectorAll('.fixed[id^="modal-"]:not(.hidden)')].map((m) => m.id);
const esperar = () => new Promise((r) => setTimeout(r, 20));
const raiz = (tipo) => document.getElementById(`visualizar-${tipo}-conteudo`);
const titulo = (el, texto) =>
    [...el.querySelectorAll('[data-estrutura-ver]')].find((x) => x.textContent.trim() === texto);
const noPorChave = (el, chave) => el.querySelector(`details[data-estrutura-chave="${chave}"]`);

async function fecharTudo() {
    for (let volta = 0; volta < 5 && abertos().length; volta++) {
        for (const id of [
            'modal-visualizar',
            'modal-visualizar-secao',
            'modal-visualizar-parte',
            'modal-visualizar-livro',
        ]) {
            if (aberto(id)) {
                await toggleModal(id);
                await esperar();
            }
        }
    }
}

describe('Ver do Livro: título de Parte e de Seção abre o Ver', () => {
    beforeEach(async () => {
        localStorage.clear();
        Object.assign(db, dados());
        await fecharTudo();
    });

    it('Parte e Seção são clicáveis; o clique não alterna o <details> ao redor', async () => {
        await abrirVisualizacaoLivro(1);
        const el = document.getElementById('visualizar-livro-conteudo');
        const parte = titulo(el, 'Parte A');
        assert.equal(parte.dataset.tipo, 'parte');
        assert.equal(parte.dataset.id, '10');
        assert.equal(titulo(el, 'Seção solta').dataset.tipo, 'secao');
        const ev = new window.Event('click', { bubbles: true, cancelable: true });
        parte.dispatchEvent(ev);
        assert.equal(ev.defaultPrevented, true);
        await esperar();
        await fecharTudo();
    });

    it('Parte: fecha o livro e abre o Ver da Parte (um modal só); ao fechar, o livro volta', async () => {
        await abrirVisualizacaoLivro(1);
        const el = document.getElementById('visualizar-livro-conteudo');
        el.querySelector('details[data-estrutura-livro]').open = true;
        noPorChave(el, 'parte-10').open = true;
        titulo(el, 'Parte A').click();
        await esperar();
        assert.deepEqual(abertos(), ['modal-visualizar-parte']);
        assert.equal(document.getElementById('modal-visualizar-parte-titulo').innerText, 'Parte A');
        // aberto da Estrutura: sem lista de navegação
        assert.ok(document.getElementById('visualizar-parte-nav').classList.contains('hidden'));
        await toggleModal('modal-visualizar-parte');
        await esperar();
        assert.deepEqual(abertos(), ['modal-visualizar-livro']);
        const volta = document.getElementById('visualizar-livro-conteudo');
        assert.equal(volta.querySelector('details[data-estrutura-livro]').open, true);
        assert.equal(noPorChave(volta, 'parte-10').open, true, 'a Estrutura segue como estava');
    });

    it('Seção solta no livro: abre o Ver da Seção e volta', async () => {
        await abrirVisualizacaoLivro(1);
        const el = document.getElementById('visualizar-livro-conteudo');
        el.querySelector('details[data-estrutura-livro]').open = true;
        titulo(el, 'Seção solta').click();
        await esperar();
        assert.deepEqual(abertos(), ['modal-visualizar-secao']);
        assert.equal(
            document.getElementById('modal-visualizar-secao-titulo').innerText,
            'Seção solta',
        );
        await toggleModal('modal-visualizar-secao');
        await esperar();
        assert.deepEqual(abertos(), ['modal-visualizar-livro']);
    });

    it('cadeia Livro, Parte, Seção: cada fechar volta um passo', async () => {
        await abrirVisualizacaoLivro(1);
        const el = document.getElementById('visualizar-livro-conteudo');
        el.querySelector('details[data-estrutura-livro]').open = true;
        titulo(el, 'Parte A').click();
        await esperar();
        raiz('parte').querySelector('details[data-estrutura-livro]').open = true;
        noPorChave(raiz('parte'), 'secao-100').open = true;
        titulo(raiz('parte'), 'Seção A1').click();
        await esperar();
        assert.deepEqual(abertos(), ['modal-visualizar-secao'], 'um modal só');
        await toggleModal('modal-visualizar-secao');
        await esperar();
        assert.deepEqual(abertos(), ['modal-visualizar-parte'], 'volta à Parte');
        assert.equal(
            noPorChave(raiz('parte'), 'secao-100').open,
            true,
            'Estrutura da Parte como estava',
        );
        await toggleModal('modal-visualizar-parte');
        await esperar();
        assert.deepEqual(abertos(), ['modal-visualizar-livro'], 'e ao livro');
    });

    it('Editar no Ver da Parte (vinda do livro): o livro espera; só ao fechar a Parte ele volta', async () => {
        await abrirVisualizacaoLivro(1);
        const el = document.getElementById('visualizar-livro-conteudo');
        el.querySelector('details[data-estrutura-livro]').open = true;
        titulo(el, 'Parte A').click();
        await esperar();
        await editarParteSecaoDoVisualizador('parte');
        await esperar();
        assert.deepEqual(abertos(), ['modal-parte'], 'só o Editar, o livro não reabriu ainda');
        rastreadorParte.marcarLimpo();
        await toggleModal('modal-parte');
        await esperar();
        assert.deepEqual(abertos(), ['modal-visualizar-parte'], 'o Ver da Parte voltou');
        await toggleModal('modal-visualizar-parte');
        await esperar();
        assert.deepEqual(abertos(), ['modal-visualizar-livro']);
    });

    it('Parte que não existe mais não fecha o livro', async () => {
        await abrirVisualizacaoLivro(1);
        const { abrirTextoDaEstruturaLivro } = await import('../js/visualizar-livro.js');
        await abrirTextoDaEstruturaLivro('parte', 999);
        assert.deepEqual(abertos(), ['modal-visualizar-livro']);
    });

    it('Ver da Parte aberto fora do livro não herda uma volta antiga', async () => {
        await abrirVisualizacaoLivro(1);
        const el = document.getElementById('visualizar-livro-conteudo');
        el.querySelector('details[data-estrutura-livro]').open = true;
        titulo(el, 'Parte A').click();
        await esperar();
        await toggleModal('modal-visualizar-parte');
        await esperar();
        await fecharTudo();
        await abrirVisualizacaoParteSecao('parte', 10);
        await toggleModal('modal-visualizar-parte');
        await esperar();
        assert.deepEqual(abertos(), []);
    });
});

describe('aba Estrutura: título de Parte e de Seção abre o Ver', () => {
    beforeEach(async () => {
        localStorage.clear();
        Object.assign(db, dados());
        await fecharTudo();
        setLivroEstrutura(1);
    });

    it('os títulos de Parte e de Seção levam as ações próprias da aba', () => {
        const arvore = document.getElementById('estrutura-arvore');
        const acoes = [...arvore.querySelectorAll('[data-action$="-estrutura"]')]
            .filter((el) => el.dataset.action.startsWith('ver-'))
            .map((el) => [el.dataset.action, el.dataset.id, el.textContent.trim()]);
        assert.deepEqual(acoes.sort(), [
            ['ver-parte-estrutura', '10', 'Parte A'],
            ['ver-secao-estrutura', '100', 'Seção A1'],
            ['ver-secao-estrutura', '101', 'Seção solta'],
        ]);
    });

    it('abre o Ver sem lista de navegação e, ao fechar, não reabre nada', async () => {
        await abrirParteSecaoDaEstrutura('parte', 10);
        assert.deepEqual(abertos(), ['modal-visualizar-parte']);
        assert.ok(document.getElementById('visualizar-parte-nav').classList.contains('hidden'));
        await toggleModal('modal-visualizar-parte');
        await esperar();
        assert.deepEqual(abertos(), []);
    });
});
