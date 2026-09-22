import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// O checkbox "Este autor sou eu" do modal de Autor grava/relê
// db.autores[].souEu. O DOM vem do modal real (modais/modal-autor.html)
// em vez de um fixture manual — assim o teste não quebra toda vez que
// um campo novo entra no formulário (initFormAutor/editarAutor leem
// todos os campos do modal, não só os que o teste exercita).
document.body.innerHTML = fs.readFileSync(
    path.resolve(__dirname, '../modais/modal-autor.html'),
    'utf8',
);

const { db } = await import('../js/db.js');
const { initFormAutor, editarAutor } = await import('../js/forms.js');

const el = (id) => document.getElementById(id);

describe('Modal de Autor: "Este autor sou eu"', () => {
    beforeEach(() => {
        db.autores = [];
        el('au-edit-id').value = '';
        el('au-nome').value = '';
        el('au-sou-eu').checked = false;
        initFormAutor();
    });

    it('grava souEu: true quando marcado', () => {
        el('au-nome').value = 'Victor Leme';
        el('au-sou-eu').checked = true;
        el('form-autor').onsubmit({ preventDefault() {} });
        assert.equal(db.autores.length, 1);
        assert.equal(db.autores[0].souEu, true);
    });

    it('grava souEu: false quando desmarcado', () => {
        el('au-nome').value = 'Cruz e Sousa';
        el('form-autor').onsubmit({ preventDefault() {} });
        assert.equal(db.autores[0].souEu, false);
    });

    it('editarAutor recarrega o checkbox a partir do cadastro', async () => {
        db.autores = [
            { id: 7, nome: 'Victor Leme', souEu: true },
            { id: 8, nome: 'Camões' },
        ];
        await editarAutor(7);
        assert.equal(el('au-sou-eu').checked, true);
        await editarAutor(8);
        assert.equal(el('au-sou-eu').checked, false);
    });
});
