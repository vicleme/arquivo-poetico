import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Aba Período Histórico: seleção por cartão, barra de edição em massa e
// Desfazer.
const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const secao = indexHtml.match(/<section id="periodos-historicos"[\s\S]*?<\/section>/)[0];
document.body.innerHTML = `<main>${secao}</main>`;

const { db } = await import('../js/db.js');
const { renderPeriodosHistoricos, recolherTodosPeriodosHistoricos } =
    await import('../js/render-listas.js');
const E = await import('../js/periodos-historicos-acoes.js');

const el = (id) => document.getElementById(id);
const definir = (id, valor) => {
    el(id).value = valor;
    el(id).onchange?.();
};
const checkboxes = () => [
    ...document.querySelectorAll(
        '#lista-periodos-historicos [data-action="toggle-periodo-historico"]',
    ),
];
const barraVisivel = () => !el('barra-acoes-periodos-historicos').classList.contains('hidden');
// O aviso mais recente fica por último (avisos de testes anteriores podem
// continuar na tela).
const botaoDesfazer = () =>
    [...document.querySelectorAll('button')].filter((b) => b.textContent === 'Desfazer').at(-1);

function montar() {
    db.opcoesPeriodoHistorico = { esferas: ['Política'], categorias: ['Revolução'] };
    db.periodosHistoricos = [
        { id: 1, nome: 'Era A', esferas: [], categorias: [], regiao: [] },
        { id: 2, nome: 'Era B', esferas: [], categorias: [], regiao: [] },
        { id: 3, nome: 'Era C', esferas: [], categorias: [], regiao: [], pertenceA: [1] },
        { id: 4, nome: 'Era D', esferas: [], categorias: [], regiao: [] },
    ];
    db.poemas = [];
    db.prosas = [];
    E.selecaoPeriodosHistoricos.clear();
    document.querySelectorAll('#toast-container, [data-toast]').forEach((t) => t.remove());
    renderPeriodosHistoricos();
    definir('ph-massa-acao', 'adicionar');
}

describe('seleção por cartão', () => {
    beforeEach(montar);

    it('cada cartão tem checkbox e a barra só aparece com seleção', () => {
        assert.equal(checkboxes().length, 4);
        assert.equal(barraVisivel(), false);
        E.toggleSelecaoPeriodoHistorico(1, true);
        assert.equal(barraVisivel(), true);
        assert.match(
            el('contador-selecao-periodos-historicos').textContent,
            /1 período selecionado/,
        );
        assert.equal(checkboxes().find((c) => c.dataset.id === '1').checked, true);
    });

    it('selecionar todos marca o que aparece e o checkbox geral acompanha', () => {
        E.toggleSelecaoTodosPeriodosHistoricos(true);
        assert.equal(E.selecaoPeriodosHistoricos.size, 4);
        assert.equal(el('toggle-todos-periodos-historicos').checked, true);
        E.toggleSelecaoPeriodoHistorico(2, false);
        assert.equal(el('toggle-todos-periodos-historicos').checked, false);
    });

    it('inverter e limpar', () => {
        E.toggleSelecaoPeriodoHistorico(1, true);
        E.inverterSelecaoPeriodosHistoricos();
        assert.deepEqual([...E.selecaoPeriodosHistoricos].sort(), [2, 3, 4]);
        E.limparSelecaoPeriodosHistoricos();
        assert.equal(barraVisivel(), false);
    });

    it('período apagado sai da seleção', () => {
        E.toggleSelecaoPeriodoHistorico(4, true);
        db.periodosHistoricos = db.periodosHistoricos.filter((p) => p.id !== 4);
        renderPeriodosHistoricos();
        assert.equal(E.selecaoPeriodosHistoricos.size, 0);
    });

    it('recolher um ramo tira da seleção quem ficou escondido', () => {
        E.toggleSelecaoPeriodoHistorico(3, true);
        E.toggleSelecaoPeriodoHistorico(2, true);
        recolherTodosPeriodosHistoricos();
        assert.deepEqual([...E.selecaoPeriodosHistoricos], [2]);
    });
});

describe('barra de edição em massa', () => {
    beforeEach(montar);

    it('acrescentar Esfera nos selecionados e Desfazer', () => {
        E.toggleSelecaoPeriodoHistorico(1, true);
        E.toggleSelecaoPeriodoHistorico(2, true);
        definir('ph-massa-campo', 'esfera');
        el('ph-massa-valor').value = 'Política';
        E.aplicarMassaBarraPeriodosHistoricos();
        assert.deepEqual(db.periodosHistoricos[0].esferas, ['Política']);
        assert.deepEqual(db.periodosHistoricos[1].esferas, ['Política']);
        assert.deepEqual(db.periodosHistoricos[2].esferas, []);
        assert.match(el('lista-periodos-historicos').textContent, /Política/);
        botaoDesfazer().click();
        assert.deepEqual(db.periodosHistoricos[0].esferas, []);
        assert.deepEqual(db.periodosHistoricos[1].esferas, []);
    });

    it('o campo de valor usa as sugestões do campo escolhido', () => {
        E.toggleSelecaoPeriodoHistorico(1, true);
        definir('ph-massa-campo', 'categoria');
        assert.equal(el('ph-massa-valor').getAttribute('list'), 'sugestoes-ph-massa-categorias');
        definir('ph-massa-campo', 'regiao');
        assert.equal(el('ph-massa-valor').getAttribute('list'), 'sugestoes-ph-massa-regioes');
    });

    it('Marca de evento: marca os selecionados e mostra o selo', () => {
        E.toggleSelecaoPeriodoHistorico(1, true);
        definir('ph-massa-campo', 'evento');
        E.aplicarMassaBarraPeriodosHistoricos();
        assert.equal(db.periodosHistoricos[0].evento, true);
        assert.match(el('lista-periodos-historicos').textContent, /Evento/);
        assert.match(document.body.textContent, /1 período marcado como evento/);
    });

    it('Faz parte de: acrescenta o pai e avisa quem não entrou', () => {
        E.toggleSelecaoPeriodoHistorico(1, true);
        E.toggleSelecaoPeriodoHistorico(2, true);
        definir('ph-massa-campo', 'pai');
        definir('ph-massa-pai', '3');
        E.aplicarMassaBarraPeriodosHistoricos();
        assert.deepEqual(db.periodosHistoricos[1].pertenceA, [3]);
        assert.equal(db.periodosHistoricos[0].pertenceA, undefined);
        assert.match(
            document.body.textContent,
            /Não entraram: "Era A" \(o pai escolhido está dentro dele\)/,
        );
        botaoDesfazer().click();
        assert.equal(db.periodosHistoricos[1].pertenceA, undefined);
    });

    it('campo incompleto não muda nada', () => {
        E.toggleSelecaoPeriodoHistorico(1, true);
        definir('ph-massa-campo', 'esfera');
        el('ph-massa-valor').value = '';
        E.aplicarMassaBarraPeriodosHistoricos();
        assert.deepEqual(db.periodosHistoricos[0].esferas, []);
    });
});
