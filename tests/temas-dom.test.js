import './helpers/dom-real.js';

import fs from 'node:fs';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Aba Temas (renderTemas em render-listas.js) e modal de Tema
// (modais/modal-tema.html + initFormTema em forms.js).
const modal = fs.readFileSync(new URL('../modais/modal-tema.html', import.meta.url), 'utf8');
document.body.innerHTML = `
    <main>
        <input id="busca-temas" />
        <input type="checkbox" id="filtro-temas-sem-assunto" />
        <select id="ordem-temas">
            <option value="alfabetica"></option>
            <option value="usados"></option>
        </select>
        <span id="resumo-temas"></span>
        <div id="lista-temas"></div>
    </main>
    ${modal}
`;

const { db } = await import('../js/db.js');
const { renderTemas, definirBuscaTemas } = await import('../js/render-listas.js');
const { initFormTema, editarTema, excluirTema } = await import('../js/forms.js');
const { prepararNovo } = await import('../js/ui.js');
const { sincronizarTemas } = await import('../js/temas.js');
const { nomesTemasDoAssunto } = await import('../js/utils.js');

const $ = (id) => document.getElementById(id);
const nomesNaLista = () => [...$('lista-temas').querySelectorAll('h4')].map((h) => h.textContent);
const enviar = () => $('form-tema').dispatchEvent(new Event('submit', { cancelable: true }));

function preparar() {
    db.poemas = [
        { id: 1, titulo: 'A', sinalizacoesTema: 'Machismo, Brasil' },
        { id: 2, titulo: 'B', sinalizacoesTema: 'machismo' },
    ];
    db.prosas = [{ id: 3, titulo: 'C', sinalizacoesTema: 'Amor' }];
    db.assuntos = [{ id: 10, nome: 'Sociedade', notas: '', temas: ['Machismo'] }];
    db.temas = [];
    sincronizarTemas(db);
    $('busca-temas').value = '';
    $('filtro-temas-sem-assunto').checked = false;
    $('ordem-temas').value = 'alfabetica';
}

describe('renderTemas (DOM real via happy-dom)', () => {
    beforeEach(preparar);

    it('lista os temas em ordem alfabética com contagem de textos', () => {
        renderTemas();
        assert.deepEqual(nomesNaLista(), ['Amor', 'Brasil', 'Machismo']);
        assert.match($('lista-temas').textContent, /Machismo\s*2 textos/);
        assert.match($('resumo-temas').textContent, /3 de 3 temas · 2 sem assunto/);
    });

    it('ordena por mais usados quando pedido', () => {
        $('ordem-temas').value = 'usados';
        renderTemas();
        assert.equal(nomesNaLista()[0], 'Machismo');
    });

    it('busca sem diferenciar caixa/acento e filtra só os sem assunto', () => {
        $('busca-temas').value = 'MACH';
        renderTemas();
        assert.deepEqual(nomesNaLista(), ['Machismo']);

        $('busca-temas').value = '';
        $('filtro-temas-sem-assunto').checked = true;
        renderTemas();
        assert.deepEqual(nomesNaLista(), ['Amor', 'Brasil']);
    });

    it('mostra o Assunto do tema como link e oferece só os Assuntos que faltam', () => {
        renderTemas();
        const card = [...$('lista-temas').children].find((c) => c.textContent.includes('Machismo'));
        const link = card.querySelector('[data-action="editar-assunto"]');
        assert.equal(link.dataset.id, '10');
        assert.equal(card.querySelector('select'), null); // já está no único Assunto
        const outro = [...$('lista-temas').children].find((c) => c.textContent.includes('Amor'));
        assert.ok(outro.querySelector('select[data-tema="Amor"]'));
    });

    it('definirBuscaTemas preenche a busca e desmarca "só sem assunto"', () => {
        $('filtro-temas-sem-assunto').checked = true;
        definirBuscaTemas('Machismo');
        assert.equal($('busca-temas').value, 'Machismo');
        assert.equal($('filtro-temas-sem-assunto').checked, false);
        assert.deepEqual(nomesNaLista(), ['Machismo']);
    });
});

describe('modal de Tema (DOM real via happy-dom)', () => {
    beforeEach(() => {
        preparar();
        initFormTema();
        $('te-edit-id').value = '';
        $('te-nome').value = '';
        $('te-notas').value = '';
    });

    it('cria um Tema sem texto e recusa duplicata sem diferenciar caixa/acento', () => {
        $('te-nome').value = 'Cidade grande';
        $('te-notas').value = 'sobre SP';
        enviar();
        const criado = db.temas.find((t) => t.nome === 'Cidade grande');
        assert.equal(criado.notas, 'sobre SP');

        const total = db.temas.length;
        $('te-nome').value = 'CIDADE GRANDE';
        enviar();
        assert.equal(db.temas.length, total);
    });

    it('editar renomeia e propaga aos textos e Assuntos', async () => {
        const id = db.temas.find((t) => t.nome === 'Machismo').id;
        await editarTema(id);
        assert.equal($('te-nome').value, 'Machismo');
        $('te-nome').value = 'Misoginia';
        $('te-notas').value = 'nota nova';
        enviar();
        assert.equal(db.poemas[0].sinalizacoesTema, 'Misoginia, Brasil');
        assert.deepEqual(nomesTemasDoAssunto(db.assuntos[0], db.temas), ['Misoginia']);
        assert.equal(db.temas.find((t) => t.id === id).notas, 'nota nova');
    });

    it('"Novo tema" depois de "Editar" cria um tema novo, sem sobrescrever o editado', async () => {
        const original = db.temas.find((t) => t.nome === 'Machismo');
        await editarTema(original.id);
        assert.equal($('te-edit-id').value, String(original.id));

        await prepararNovo('tema');
        assert.equal($('te-edit-id').value, '');
        assert.equal($('te-nome').value, '');
        assert.equal($('modal-tema-titulo').innerText, 'Cadastrar Tema');

        $('te-nome').value = 'Saudade';
        enviar();
        assert.ok(db.temas.some((t) => t.nome === 'Saudade'));
        assert.equal(db.temas.find((t) => t.id === original.id).nome, 'Machismo');
    });
});

describe('excluirTema', () => {
    beforeEach(preparar);

    it('não exclui tema em uso por textos', () => {
        const id = db.temas.find((t) => t.nome === 'Machismo').id;
        excluirTema(id);
        assert.ok(db.temas.some((t) => t.id === id));
    });

    it('exclui tema sem texto e tira o nome do Assunto', () => {
        db.temas.push({ id: 9001, nome: 'Sobra', notas: '' });
        db.assuntos[0].temaIds.push(9001);
        const id = 9001;
        excluirTema(id);
        assert.ok(!db.temas.some((t) => t.id === id));
        assert.deepEqual(nomesTemasDoAssunto(db.assuntos[0], db.temas), ['Machismo']);
    });
});
