import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Edição em massa da aba Temas: "Adicionar ao assunto" (lógica pura e barra).
document.body.innerHTML = `
    <main>
        <input id="busca-temas" />
        <input type="checkbox" id="filtro-temas-sem-assunto" />
        <select id="ordem-temas">
            <option value="alfabetica"></option>
            <option value="usados"></option>
        </select>
        <input type="checkbox" id="toggle-todos-temas" />
        <div id="barra-acoes-temas" class="hidden">
            <span id="contador-selecao-temas"></span>
            <div id="temas-massa-assunto-bloco" class="hidden">
                <select id="temas-massa-assunto"><option value=""></option></select>
            </div>
        </div>
        <span id="resumo-temas"></span>
        <div id="lista-temas"></div>
    </main>
`;

const { db } = await import('../js/db.js');
const { renderTemas } = await import('../js/render-listas.js');
const ui = await import('../js/temas-massa-ui.js');
const { selecaoTemas, limparSelecaoTemas, adicionarTemasAoAssuntoEmMassa } =
    await import('../js/temas-massa.js');

const $ = (id) => document.getElementById(id);
const opcoes = (select) => [...select.options].map((o) => o.textContent);
const clicarDesfazer = () => {
    const botoes = [...document.body.querySelectorAll('button')].filter(
        (b) => b.textContent === 'Desfazer',
    );
    botoes.at(-1).click();
};

function preparar() {
    db.poemas = [];
    db.prosas = [];
    db.temas = [
        { id: 1, nome: 'Amor' },
        { id: 2, nome: 'Brasil' },
        { id: 3, nome: 'Cidade' },
    ];
    db.assuntos = [
        { id: 10, nome: 'Afetos', notas: '', temaIds: [1] },
        { id: 11, nome: 'Sociedade', notas: '', temaIds: [] },
    ];
    db.temasUniversais = [];
    $('busca-temas').value = '';
    $('ordem-temas').value = 'alfabetica';
    $('filtro-temas-sem-assunto').checked = false;
    limparSelecaoTemas();
    document.body.querySelectorAll('div[style*="box-shadow"]').forEach((t) => t.remove());
    renderTemas();
}

describe('lógica: adicionarTemasAoAssuntoEmMassa', () => {
    beforeEach(preparar);

    it('junta os temas sem repetir, conta os que já estavam e não tira nada', () => {
        const r = adicionarTemasAoAssuntoEmMassa(db, 10, ['1', '2', 3]);
        assert.equal(r.ok, true);
        assert.equal(r.adicionados, 2);
        assert.equal(r.jaTinham, 1);
        assert.deepEqual(db.assuntos[0].temaIds, [1, 2, 3]);
    });

    it('recusa assunto que não existe e lista sem tema do cadastro', () => {
        assert.deepEqual(adicionarTemasAoAssuntoEmMassa(db, 99, [1]), {
            ok: false,
            motivo: 'assunto-inexistente',
        });
        assert.deepEqual(adicionarTemasAoAssuntoEmMassa(db, 10, [99]), {
            ok: false,
            motivo: 'sem-temas',
        });
    });

    it('cria a lista de temas de um assunto que ainda não a tinha', () => {
        delete db.assuntos[1].temaIds;
        const r = adicionarTemasAoAssuntoEmMassa(db, 11, [2]);
        assert.equal(r.adicionados, 1);
        assert.deepEqual(db.assuntos[1].temaIds, [2]);
    });

    it('quando todos já estavam, nada muda', () => {
        const r = adicionarTemasAoAssuntoEmMassa(db, 10, [1]);
        assert.equal(r.adicionados, 0);
        assert.deepEqual(db.assuntos[0].temaIds, [1]);
    });

    it('desfazer devolve a lista ao que era', () => {
        const r = adicionarTemasAoAssuntoEmMassa(db, 11, [2, 3]);
        r.desfazer();
        assert.deepEqual(db.assuntos[1].temaIds, []);
    });
});

describe('barra em massa: Adicionar ao assunto', () => {
    beforeEach(preparar);

    it('o select lista os assuntos em ordem alfabética e o bloco aparece', () => {
        assert.deepEqual(opcoes($('temas-massa-assunto')), [
            'Escolha um assunto…',
            'Afetos',
            'Sociedade',
        ]);
        assert.ok(!$('temas-massa-assunto-bloco').classList.contains('hidden'));
    });

    it('sem assuntos cadastrados, o bloco some', () => {
        db.assuntos = [];
        renderTemas();
        assert.ok($('temas-massa-assunto-bloco').classList.contains('hidden'));
    });

    it('sem escolher o assunto ou sem selecionar tema, não grava', () => {
        selecaoTemas.add('2');
        ui.aoAdicionarTemasAoAssunto();
        assert.deepEqual(db.assuntos[1].temaIds, []);
        limparSelecaoTemas();
        $('temas-massa-assunto').value = '11';
        ui.aoAdicionarTemasAoAssunto();
        assert.deepEqual(db.assuntos[1].temaIds, []);
    });

    it('junta os selecionados ao assunto, atualiza os cartões e o Desfazer volta', () => {
        selecaoTemas.add('2');
        selecaoTemas.add('3');
        renderTemas();
        $('temas-massa-assunto').value = '11';
        ui.aoAdicionarTemasAoAssunto();
        assert.deepEqual(db.assuntos[1].temaIds, [2, 3]);
        const cartaoBrasil = [...$('lista-temas').children].find(
            (c) => c.querySelector('h4')?.textContent === 'Brasil',
        );
        assert.match(cartaoBrasil.textContent, /Sociedade/);
        clicarDesfazer();
        assert.deepEqual(db.assuntos[1].temaIds, []);
    });

    it('a escolha do select sobrevive ao novo render, se o assunto ainda existe', () => {
        $('temas-massa-assunto').value = '11';
        renderTemas();
        assert.equal($('temas-massa-assunto').value, '11');
    });
});
