import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Aba Correntes literárias: seleção por cartão, barra de edição em massa
// (campos de lista, de valor único e "Faz parte de") e Desfazer.
const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const secao = indexHtml.match(/<section id="movimentos-escolas"[\s\S]*?<\/section>/)[0];
document.body.innerHTML = `<main>${secao}</main>`;

const { db } = await import('../js/db.js');
const { renderMovimentosEscolas, recolherTodasCorrentes } = await import('../js/render-listas.js');
const E = await import('../js/correntes-acoes.js');

const el = (id) => document.getElementById(id);
const definir = (id, valor) => {
    el(id).value = valor;
    el(id).onchange?.();
};
const checkboxes = () => [
    ...document.querySelectorAll('#lista-movimentos-escolas [data-action="toggle-corrente"]'),
];
const barraVisivel = () => !el('barra-acoes-correntes').classList.contains('hidden');
const opcoes = (id) => [...el(id).options].map((o) => o.textContent);
// O aviso mais recente fica por último (avisos de testes anteriores podem
// continuar na tela).
const botaoDesfazer = () =>
    [...document.querySelectorAll('button')].filter((b) => b.textContent === 'Desfazer').at(-1);
const escondido = (id) => el(id).classList.contains('hidden');

function montar() {
    const base = {
        tipo: '',
        programa: '',
        posturaEstetica: '',
        paiId: null,
        divisao: '',
        generoDivisao: '',
        regiaoOrigem: [],
        temas: [],
        inicio: null,
        fim: null,
        fontes: [],
    };
    db.movimentosEscolas = [
        { ...base, id: 1, nome: 'Barroco', temas: ['Morte'], regiaoOrigem: ['Portugal'] },
        { ...base, id: 2, nome: 'Romantismo' },
        { ...base, id: 3, nome: 'Primeira geração', paiId: 2, divisao: 'Fase ou geração' },
        { ...base, id: 4, nome: 'Simbolismo' },
    ];
    db.poemas = [];
    db.prosas = [];
    db.autores = [];
    E.selecaoCorrentes.clear();
    document.querySelectorAll('#toast-container, [data-toast]').forEach((t) => t.remove());
    renderMovimentosEscolas();
    definir('cor-massa-acao', 'adicionar');
}

describe('seleção por cartão', () => {
    beforeEach(montar);

    it('cada cartão tem checkbox e a barra só aparece com seleção', () => {
        assert.equal(checkboxes().length, 4);
        assert.equal(barraVisivel(), false);
        E.toggleSelecaoCorrente(1, true);
        assert.equal(barraVisivel(), true);
        assert.match(el('contador-selecao-correntes').textContent, /1 corrente selecionada/);
    });

    it('selecionar todas marca o que aparece e o checkbox geral acompanha', () => {
        E.toggleSelecaoTodasCorrentes(true);
        assert.equal(E.selecaoCorrentes.size, 4);
        assert.equal(el('toggle-todas-correntes').checked, true);
        E.toggleSelecaoCorrente(2, false);
        assert.equal(el('toggle-todas-correntes').checked, false);
    });

    it('shift-click marca o intervalo na ordem da tela', () => {
        // Ordem alfabética na árvore: Barroco, Romantismo, Primeira geração, Simbolismo.
        el('ordenacao-movimentos-escolas').value = 'alfabetica';
        E.toggleSelecaoCorrente(1, true);
        E.toggleSelecaoCorrente(3, true, true);
        assert.deepEqual([...E.selecaoCorrentes].sort(), [1, 2, 3]);
    });

    it('inverter, limpar e apagada sai da seleção', () => {
        E.toggleSelecaoCorrente(1, true);
        E.inverterSelecaoCorrentes();
        assert.deepEqual([...E.selecaoCorrentes].sort(), [2, 3, 4]);
        db.movimentosEscolas = db.movimentosEscolas.filter((m) => m.id !== 4);
        renderMovimentosEscolas();
        assert.deepEqual([...E.selecaoCorrentes].sort(), [2, 3]);
        E.limparSelecaoCorrentes();
        assert.equal(barraVisivel(), false);
    });

    it('recolher um ramo tira da seleção quem ficou escondido', () => {
        E.toggleSelecaoCorrente(3, true);
        E.toggleSelecaoCorrente(1, true);
        recolherTodasCorrentes();
        assert.deepEqual([...E.selecaoCorrentes], [1]);
    });
});

describe('barra de edição em massa', () => {
    beforeEach(montar);

    it('a Ação muda de rótulo com o campo e o grupo certo aparece', () => {
        E.toggleSelecaoCorrente(1, true);
        definir('cor-massa-campo', 'programa');
        assert.deepEqual(opcoes('cor-massa-acao'), ['Definir', 'Limpar']);
        assert.equal(escondido('cor-massa-grupo-unico'), false);
        assert.equal(escondido('cor-massa-grupo-texto'), true);
        definir('cor-massa-acao', 'remover');
        assert.equal(escondido('cor-massa-grupo-unico'), true, 'limpar não precisa de valor');
        definir('cor-massa-campo', 'temas');
        assert.deepEqual(opcoes('cor-massa-acao'), ['Acrescentar', 'Remover']);
        assert.equal(escondido('cor-massa-grupo-texto'), false);
        definir('cor-massa-acao', 'adicionar');
        definir('cor-massa-campo', 'pai');
        assert.equal(escondido('cor-massa-grupo-pai'), false);
    });

    it('definir Programa nos selecionados e Desfazer', () => {
        E.toggleSelecaoCorrente(1, true);
        E.toggleSelecaoCorrente(2, true);
        definir('cor-massa-campo', 'programa');
        definir('cor-massa-unico', 'Escola');
        E.aplicarMassaBarraCorrentes();
        assert.equal(db.movimentosEscolas[0].programa, 'Escola');
        assert.equal(db.movimentosEscolas[1].programa, 'Escola');
        assert.equal(db.movimentosEscolas[2].programa, '');
        assert.match(document.body.textContent, /Programa definido como "Escola" em 2 correntes/);
        botaoDesfazer().click();
        assert.equal(db.movimentosEscolas[0].programa, '');
    });

    it('acrescentar Tema usa as sugestões do que já foi digitado', () => {
        E.toggleSelecaoCorrente(2, true);
        definir('cor-massa-campo', 'temas');
        assert.deepEqual(
            [...el('sugestoes-cor-massa').options].map((o) => o.value),
            ['Morte'],
        );
        el('cor-massa-valor').value = 'Morte';
        E.aplicarMassaBarraCorrentes();
        assert.deepEqual(db.movimentosEscolas[1].temas, ['Morte']);
    });

    it('remover Região de origem tira só esse lugar', () => {
        E.toggleSelecaoCorrente(1, true);
        definir('cor-massa-campo', 'regiao');
        definir('cor-massa-acao', 'remover');
        el('cor-massa-valor').value = 'Portugal';
        E.aplicarMassaBarraCorrentes();
        assert.deepEqual(db.movimentosEscolas[0].regiaoOrigem, []);
    });

    it('Faz parte de: define o pai com Divisão e mostra o texto no cartão', () => {
        E.toggleSelecaoCorrente(4, true);
        definir('cor-massa-campo', 'pai');
        definir('cor-massa-pai', '2');
        definir('cor-massa-divisao', 'Vertente');
        E.aplicarMassaBarraCorrentes();
        assert.equal(db.movimentosEscolas[3].paiId, 2);
        assert.equal(db.movimentosEscolas[3].divisao, 'Vertente');
        botaoDesfazer().click();
        assert.equal(db.movimentosEscolas[3].paiId, null);
    });

    it('Faz parte de: avisa a corrente que não pôde entrar', () => {
        E.toggleSelecaoCorrente(2, true);
        E.toggleSelecaoCorrente(4, true);
        definir('cor-massa-campo', 'pai');
        definir('cor-massa-pai', '3');
        E.aplicarMassaBarraCorrentes();
        assert.equal(db.movimentosEscolas[3].paiId, 3);
        assert.equal(db.movimentosEscolas[1].paiId, null);
        assert.match(document.body.textContent, /Não entraram: "Romantismo"/);
    });

    it('Limpar o pai deixa a corrente de topo', () => {
        E.toggleSelecaoCorrente(3, true);
        definir('cor-massa-campo', 'pai');
        definir('cor-massa-acao', 'remover');
        E.aplicarMassaBarraCorrentes();
        assert.equal(db.movimentosEscolas[2].paiId, null);
        assert.equal(db.movimentosEscolas[2].divisao, '');
    });

    it('definir sem escolher o valor não muda nada', () => {
        E.toggleSelecaoCorrente(1, true);
        definir('cor-massa-campo', 'tipo');
        definir('cor-massa-unico', '');
        E.aplicarMassaBarraCorrentes();
        assert.equal(db.movimentosEscolas[0].tipo, '');
    });
});
