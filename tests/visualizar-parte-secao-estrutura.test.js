import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Ver de Parte e de Seção: cada título de texto da Estrutura abre o Ver do texto e,
// ao fechá-lo, o Ver da Parte (ou da Seção) volta com a Estrutura como estava.

globalThis.indexedDB = { open: () => ({}) };

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
const { abrirVisualizacaoParteSecao } = await import('../js/visualizar-parte-secao.js');

registrarModal('modal-visualizar-parte', 'modal-visualizar-parte.html', () => {});
registrarModal('modal-visualizar-secao', 'modal-visualizar-secao.html', () => {});
registrarModal('modal-visualizar', 'modal-visualizar.html', () => {});

const conceitos = { elos: [], ecos: [] };

function dados() {
    return {
        livros: [{ id: 1, titulo: 'Livro Um', tipo: 'Inéditos', sequencia: 1 }],
        partes: [{ id: 10, livroId: 1, titulo: 'Parte A', sequencia: 1 }],
        secoes: [{ id: 100, paiTipo: 'parte', paiId: 10, titulo: 'Seção A1', sequencia: 1 }],
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
            {
                id: 2,
                titulo: 'Poema na parte',
                paiTipo: 'parte',
                paiId: 10,
                sequencia: 2,
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
const tituloClicavel = (tipo, texto) =>
    [...raiz(tipo).querySelectorAll('[data-estrutura-ver]')].find(
        (el) => el.textContent.trim() === texto,
    );

// Fechar o Ver do texto dispara a volta (de propósito), então a limpeza repete até
// nada ficar aberto.
async function fecharTudo() {
    for (let volta = 0; volta < 4 && abertos().length; volta++) {
        for (const id of ['modal-visualizar', 'modal-visualizar-parte', 'modal-visualizar-secao']) {
            if (aberto(id)) {
                await toggleModal(id);
                await esperar();
            }
        }
    }
}

describe('Ver de Parte e Seção: título de texto na Estrutura', () => {
    beforeEach(async () => {
        localStorage.clear();
        Object.assign(db, dados());
        await fecharTudo();
    });

    it('Parte: clicar no título fecha a Parte e abre o texto, um modal só', async () => {
        await abrirVisualizacaoParteSecao('parte', 10);
        raiz('parte').querySelector('details[data-estrutura-livro]').open = true;
        tituloClicavel('parte', 'Poema na parte').click();
        await esperar();
        assert.deepEqual(abertos(), ['modal-visualizar']);
        assert.equal(
            document.getElementById('modal-visualizar-titulo').innerText,
            'Poema na parte',
        );
    });

    it('Parte: fechar o Ver do texto reabre a Parte com a Estrutura como estava', async () => {
        await abrirVisualizacaoParteSecao('parte', 10);
        raiz('parte').querySelector('details[data-estrutura-livro]').open = true;
        raiz('parte').querySelector('details[data-estrutura-chave="secao-100"]').open = true;
        tituloClicavel('parte', 'Poema na seção').click();
        await esperar();
        await toggleModal('modal-visualizar');
        await esperar();
        assert.deepEqual(abertos(), ['modal-visualizar-parte']);
        assert.equal(raiz('parte').querySelector('details[data-estrutura-livro]').open, true);
        assert.equal(
            raiz('parte').querySelector('details[data-estrutura-chave="secao-100"]').open,
            true,
        );
    });

    it('Seção: o título abre o Ver do texto e a volta reabre a Seção', async () => {
        await abrirVisualizacaoParteSecao('secao', 100);
        raiz('secao').querySelector('details[data-estrutura-livro]').open = true;
        tituloClicavel('secao', 'Poema na seção').click();
        await esperar();
        assert.deepEqual(abertos(), ['modal-visualizar']);
        await toggleModal('modal-visualizar');
        await esperar();
        assert.deepEqual(abertos(), ['modal-visualizar-secao']);
        assert.equal(
            document.getElementById('modal-visualizar-secao-titulo').innerText,
            'Seção A1',
        );
    });

    it('texto que não existe mais não fecha a Parte', async () => {
        await abrirVisualizacaoParteSecao('parte', 10);
        raiz('parte').querySelector('details[data-estrutura-livro]').open = true;
        const el = tituloClicavel('parte', 'Poema na parte');
        db.poemas = db.poemas.filter((p) => p.id !== 2);
        el.click();
        await esperar();
        assert.deepEqual(abertos(), ['modal-visualizar-parte']);
    });
});
