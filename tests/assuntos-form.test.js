import './helpers/dom-real.js';

import fs from 'node:fs';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Modal de Assunto (modais/modal-assunto.html + initFormAssunto em
// forms.js): criar, editar, recusar nome duplicado e não perder o tema
// digitado que ainda não foi confirmado com "+"/Enter.
const html = fs.readFileSync(new URL('../modais/modal-assunto.html', import.meta.url), 'utf8');
document.body.innerHTML = `<main>${html}</main>`;

const { db } = await import('../js/db.js');
const { initFormAssunto, editarAssunto } = await import('../js/forms.js');
const { carregarTemasAssunto, resetTemasAssunto } = await import('../js/editor.js');
const { nomesTemasDoAssunto } = await import('../js/utils.js');

// O Assunto guarda ids do cadastro de Temas; estes são os nomes dele.
const nomesDoAssunto = (i = 0) => nomesTemasDoAssunto(db.assuntos[i], db.temas);

const $ = (id) => document.getElementById(id);

function enviar() {
    $('form-assunto').dispatchEvent(new Event('submit', { cancelable: true }));
}

describe('modal de Assunto (DOM real via happy-dom)', () => {
    beforeEach(() => {
        db.poemas = [{ id: 1, titulo: 'A', sinalizacoesTema: 'Machismo, Brasil' }];
        db.prosas = [];
        db.assuntos = [];
        db.temas = [
            { id: 1, nome: 'Machismo', notas: '' },
            { id: 2, nome: 'Brasil', notas: '' },
        ];
        initFormAssunto();
        $('as-edit-id').value = '';
        $('as-nome').value = '';
        $('as-notas').value = '';
        $('as-tema-input').value = '';
        resetTemasAssunto();
    });

    it('cria um Assunto com os temas dos chips', () => {
        $('as-nome').value = 'Sociedade';
        carregarTemasAssunto(['Machismo', 'Polarização']);
        enviar();
        assert.equal(db.assuntos.length, 1);
        assert.equal(db.assuntos[0].nome, 'Sociedade');
        assert.deepEqual(nomesDoAssunto(), ['Machismo', 'Polarização']);
        // 'Polarização' ainda não existia: o cadastro ganhou o Tema e o Assunto guarda o id
        assert.ok(db.temas.some((t) => t.nome === 'Polarização'));
        assert.equal(db.assuntos[0].temas, undefined);
        assert.equal(typeof db.assuntos[0].id, 'number');
    });

    it('inclui o tema digitado que ainda não foi confirmado com "+"', () => {
        $('as-nome').value = 'Sociedade';
        carregarTemasAssunto(['Machismo']);
        $('as-tema-input').value = 'Brasil';
        enviar();
        assert.deepEqual(nomesDoAssunto(), ['Machismo', 'Brasil']);
    });

    it('recusa nome duplicado sem diferenciar caixa/acento', () => {
        db.assuntos = [{ id: 5, nome: 'Gênero', notas: '', temaIds: [] }];
        $('as-nome').value = 'genero';
        enviar();
        assert.equal(db.assuntos.length, 1);
    });

    it('editar carrega o Assunto e salvar substitui sem duplicar', async () => {
        db.assuntos = [{ id: 5, nome: 'Gênero', notas: 'n', temaIds: [1] }];
        await editarAssunto(5);
        assert.equal($('as-edit-id').value, '5');
        assert.equal($('as-nome').value, 'Gênero');
        assert.equal($('as-notas').value, 'n');
        assert.deepEqual(JSON.parse($('as-temas').value), ['Machismo']);

        $('as-nome').value = 'Gênero e corpo';
        carregarTemasAssunto(['Machismo', 'Objetificação']);
        enviar();
        assert.equal(db.assuntos.length, 1);
        assert.equal(db.assuntos[0].id, 5);
        assert.equal(db.assuntos[0].nome, 'Gênero e corpo');
        assert.deepEqual(nomesDoAssunto(), ['Machismo', 'Objetificação']);
    });

    it('salvar o próprio Assunto com o mesmo nome não conta como duplicata', async () => {
        db.assuntos = [{ id: 5, nome: 'Gênero', notas: '', temaIds: [] }];
        await editarAssunto(5);
        enviar();
        assert.equal(db.assuntos.length, 1);
    });

    it('sugere no datalist os temas em uso, sem repetir variações', () => {
        db.poemas.push({ id: 2, titulo: 'B', sinalizacoesTema: 'machismo' });
        initFormAssunto();
        const opcoes = [...$('sugestoes-temas-assunto').querySelectorAll('option')].map((o) =>
            o.getAttribute('value'),
        );
        assert.deepEqual(opcoes.sort(), ['Brasil', 'Machismo']);
    });
});
