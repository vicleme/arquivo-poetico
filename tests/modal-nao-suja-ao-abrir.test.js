import './helpers/dom-real.js';
import './helpers/localstorage-shim.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Abrir um modal de Poema/Prosa (novo ou edição) e fechar sem mexer em nada
// não pode pedir "Alterações não salvas": o rastreador só deve marcar sujo
// por interação real. Vários campos ocultos (temas/locais/idiomas, chips de
// personagem...) disparam 'input'/'change' ao serem sincronizados — inclusive
// pelo próprio carregamento do item —, e isso não pode contar como edição.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const lerModal = (nome) => fs.readFileSync(path.resolve(__dirname, '../modais', nome), 'utf8');
const HTML = {
    'modal-poema.html': lerModal('modal-poema.html'),
    'modal-prosa.html': lerModal('modal-prosa.html'),
};
globalThis.fetch = async (url) => ({
    ok: true,
    status: 200,
    text: async () => HTML[String(url).split('/').pop()] || '',
});
document.body.innerHTML = '<div id="modais-container"></div>';

const { db } = await import('../js/db.js');
const { registrarModal, toggleModal } = await import('../js/modais.js');
const forms = await import('../js/forms.js');
const {
    initEditor,
    initEditorProsa,
    renderSinalizacoesProsa,
    renderTemasProsa,
    renderRegiaoProsa,
} = await import('../js/editor.js');
const { prepararNovo } = await import('../js/ui.js');

registrarModal(
    'modal-poema',
    'modal-poema.html',
    () => {
        forms.initFormPoema();
        initEditor();
    },
    forms.rastreadorPoema,
);
// Mesmo init de main.js (renders da Prosa antes de initFormProsa).
registrarModal(
    'modal-prosa',
    'modal-prosa.html',
    () => {
        renderSinalizacoesProsa();
        renderTemasProsa();
        renderRegiaoProsa();
        forms.initFormProsa();
        initEditorProsa();
    },
    forms.rastreadorProsa,
);

// editarPoema/editarProsa/prepararNovo chamam toggleModal sem await — espera o fim.
const assentar = () => new Promise((r) => setTimeout(r, 20));
const aberto = (id) => !document.getElementById(id).classList.contains('hidden');
const sujoPoema = () => forms.rastreadorPoema.estaSujo();
const sujoProsa = () => forms.rastreadorProsa.estaSujo();

function semear() {
    db.pessoas = [];
    db.grupos = [];
    db.autores = [];
    db.livros = [];
    db.epocas = [];
    db.locais = [{ id: 1, nome: 'Brasil', tipo: 'País', pertenceA: [], notas: '' }];
    db.temas = [{ id: 1, nome: 'Amor', notas: '' }];
    db.assuntos = [];
    db.personagens = [{ id: 1, nome: 'Íris', notas: '' }];
    db.periodosHistoricos = [];
    db.movimentosEscolas = [];
    db.poemas = [
        {
            id: 100,
            titulo: 'Completo',
            texto: 'um verso\noutro verso',
            idiomas: [{ idioma: 'pt-BR', papel: 'principal', dialetos: [] }],
            temas: [{ temaId: 1, papel: 'principal' }],
            personagens: [{ personagemId: 1, papeis: ['Voz'] }],
            dataEscrita: { dia: 1, mes: 2, ano: 2020, exata: true },
        },
        { id: 101, titulo: 'Simples', texto: 'só isso' },
    ];
    db.prosas = [{ id: 200, titulo: 'Prosa', texto: 'corpo da prosa' }];
}

describe('abrir e fechar sem editar não suja o formulário', () => {
    beforeEach(async () => {
        semear();
        for (const id of ['modal-poema', 'modal-prosa']) {
            const el = document.getElementById(id);
            if (el && !el.classList.contains('hidden')) {
                forms.rastreadorPoema.marcarLimpo();
                forms.rastreadorProsa.marcarLimpo();
                await toggleModal(id);
                await assentar();
            }
        }
        forms.rastreadorPoema.marcarLimpo();
        forms.rastreadorProsa.marcarLimpo();
    });

    it('editar Poema completo', async () => {
        await forms.editarPoema(100);
        await assentar();
        assert.ok(aberto('modal-poema'));
        assert.equal(sujoPoema(), false);
    });

    it('editar Poema simples', async () => {
        await forms.editarPoema(101);
        await assentar();
        assert.equal(sujoPoema(), false);
    });

    it('novo Poema', async () => {
        await prepararNovo('poema');
        await assentar();
        assert.ok(aberto('modal-poema'));
        assert.equal(sujoPoema(), false);
    });

    it('editar Prosa', async () => {
        await forms.editarProsa(200);
        await assentar();
        assert.ok(aberto('modal-prosa'));
        assert.equal(sujoProsa(), false);
    });

    it('nova Prosa', async () => {
        await prepararNovo('prosa');
        await assentar();
        assert.equal(sujoProsa(), false);
    });

    it('depois de editar de verdade e descartar, reabrir volta limpo', async () => {
        await forms.editarPoema(101);
        await assentar();
        const titulo = document.getElementById('p-titulo');
        titulo.value = 'mudou';
        titulo.dispatchEvent(new Event('input', { bubbles: true }));
        assert.equal(sujoPoema(), true);
        forms.rastreadorPoema.marcarLimpo();
        await toggleModal('modal-poema');
        await forms.editarPoema(100);
        await assentar();
        assert.equal(sujoPoema(), false);
    });

    it('interação real depois de abrir ainda marca sujo', async () => {
        await forms.editarPoema(101);
        await assentar();
        const titulo = document.getElementById('p-titulo');
        titulo.value = 'mudou';
        titulo.dispatchEvent(new Event('input', { bubbles: true }));
        assert.equal(sujoPoema(), true);
    });
});
