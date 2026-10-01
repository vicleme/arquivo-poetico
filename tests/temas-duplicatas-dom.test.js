import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Painel "Possíveis duplicatas" da aba Temas (renderTemas em
// render-listas.js) e o "Não são iguais" (forms.js).
document.body.innerHTML = `
    <main>
        <input id="busca-temas" />
        <input type="checkbox" id="filtro-temas-sem-assunto" />
        <select id="ordem-temas">
            <option value="alfabetica"></option>
            <option value="usados"></option>
        </select>
        <span id="resumo-temas"></span>
        <div id="duplicatas-temas"></div>
        <div id="lista-temas"></div>
    </main>
`;

const { db } = await import('../js/db.js');
const { renderTemas } = await import('../js/render-listas.js');
const { marcarNaoIguaisComAviso } = await import('../js/forms.js');

const $ = (id) => document.getElementById(id);

function preparar() {
    db.poemas = [{ id: 1, titulo: 'A', temas: [{ temaId: 1, papel: '' }] }];
    db.prosas = [];
    db.assuntos = [];
    db.temas = [
        { id: 1, nome: 'Memória', notas: '' },
        { id: 2, nome: 'Memórias', notas: '' },
        { id: 3, nome: 'Luto', notas: '' },
        { id: 4, nome: 'Luto/Finitude', notas: '' },
    ];
    $('busca-temas').value = '';
    $('filtro-temas-sem-assunto').checked = false;
    $('ordem-temas').value = 'alfabetica';
}

describe('painel de duplicatas da aba Temas', () => {
    beforeEach(preparar);

    it('mostra o par de mesma forma, com os dois "Manter" e "Não são iguais"', () => {
        renderTemas();
        const painel = $('duplicatas-temas');
        assert.match(painel.textContent, /1 possível duplicata/);
        assert.match(painel.textContent, /Memória/);
        const acoes = [...painel.querySelectorAll('button')].map((b) => b.dataset.action);
        assert.deepEqual(acoes, ['mesclar-duplicata', 'mesclar-duplicata', 'nao-sao-iguais']);
        const [manterA, manterB] = painel.querySelectorAll('[data-action="mesclar-duplicata"]');
        assert.equal(manterA.dataset.manter, '1');
        assert.equal(manterA.dataset.remover, '2');
        assert.equal(manterB.dataset.manter, '2');
        assert.equal(manterB.dataset.remover, '1');
    });

    it('não sugere nome contido em outro ("Luto" e "Luto/Finitude")', () => {
        renderTemas();
        assert.doesNotMatch($('duplicatas-temas').textContent, /Finitude/);
    });

    it('fica vazio quando não há par', () => {
        db.temas = db.temas.filter((t) => t.id !== 2);
        renderTemas();
        assert.equal($('duplicatas-temas').innerHTML.trim(), '');
    });

    it('"Não são iguais" tira o par do painel e o Desfazer o devolve', () => {
        renderTemas();
        marcarNaoIguaisComAviso(1, 2);
        assert.equal($('duplicatas-temas').innerHTML.trim(), '');
        const desfazer = [...document.querySelectorAll('button')].find(
            (b) => b.textContent.trim() === 'Desfazer',
        );
        assert.ok(desfazer, 'o aviso traz o botão Desfazer');
        desfazer.click();
        assert.match($('duplicatas-temas').textContent, /1 possível duplicata/);
    });

    it('a lista de temas continua mostrando todos os temas', () => {
        renderTemas();
        assert.equal($('lista-temas').querySelectorAll('h4').length, 4);
    });
});
