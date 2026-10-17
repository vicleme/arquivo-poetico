import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Filtro por Região na aba Período Histórico: casamento exato com o lugar
// escolhido, opção "Sem região" e opções montadas só com o que o cadastro usa.

document.body.innerHTML =
    '<div id="lista-periodos-historicos"></div><div id="filtros-periodo-periodosHistoricos"></div>' +
    '<span id="contagem-periodos-historicos"></span>';

const H = await import('../js/periodos-historicos-hierarquia.js');
const { db } = await import('../js/db.js');
const R = await import('../js/render-listas.js');

const lista = [
    { id: 1, nome: 'Renascimento', regiao: ['Europa'] },
    { id: 2, nome: 'Revolução Francesa', regiao: ['França'] },
    { id: 3, nome: 'Primeira Revolução Industrial', regiao: ['Inglaterra', 'Europa'] },
    { id: 4, nome: 'Sem lugar', regiao: [] },
    { id: 5, nome: 'Texto antigo', regiao: 'Brasil/Portugal' },
];

describe('filtro de Região (funções puras)', () => {
    it('sem filtro devolve tudo', () => {
        assert.equal(H.filtrarPeriodosHistoricosPorRegiao(lista, '').length, 5);
    });

    it('casa exatamente: Europa não traz o que só tem França', () => {
        const nomes = H.filtrarPeriodosHistoricosPorRegiao(lista, 'Europa').map((p) => p.nome);
        assert.deepEqual(nomes, ['Renascimento', 'Primeira Revolução Industrial']);
    });

    it('lê o formato antigo com barras', () => {
        const nomes = H.filtrarPeriodosHistoricosPorRegiao(lista, 'Portugal').map((p) => p.nome);
        assert.deepEqual(nomes, ['Texto antigo']);
    });

    it('"Sem região" traz só os sem lugar', () => {
        const nomes = H.filtrarPeriodosHistoricosPorRegiao(
            lista,
            H.FILTRO_PERIODO_HISTORICO_SEM_REGIAO,
        ).map((p) => p.nome);
        assert.deepEqual(nomes, ['Sem lugar']);
    });

    it('as opções são os lugares usados, sem repetir, em ordem alfabética', () => {
        assert.deepEqual(H.opcoesDeRegiaoDosPeriodosHistoricos(lista), [
            'Brasil',
            'Europa',
            'França',
            'Inglaterra',
            'Portugal',
        ]);
    });
});

describe('filtro de Região na aba', () => {
    beforeEach(() => {
        db.periodosHistoricos = lista.map((p) => ({ ...p, pertenceA: [] }));
        R.limparFiltrosPeriodosHistoricos();
    });

    it('monta o select, filtra e limpa', () => {
        R.renderPeriodosHistoricos();
        const select = document.getElementById('fp-periodosHistoricos-regiao');
        assert.ok(select);
        assert.equal(select.options.length, 5 + 2);
        select.value = 'Europa';
        R.setFiltroPeriodo('periodosHistoricos');
        const html = document.getElementById('lista-periodos-historicos').innerHTML;
        assert.ok(html.includes('Renascimento'));
        assert.ok(!html.includes('Revolução Francesa'));
        assert.match(document.getElementById('contagem-periodos-historicos').textContent, /2 de 5/);
        R.limparFiltrosPeriodosHistoricos();
        assert.ok(
            document
                .getElementById('lista-periodos-historicos')
                .innerHTML.includes('Revolução Francesa'),
        );
    });

    it('lugar escolhido que sumiu do cadastro volta para "Todas"', () => {
        R.renderPeriodosHistoricos();
        const select = document.getElementById('fp-periodosHistoricos-regiao');
        select.value = 'França';
        R.setFiltroPeriodo('periodosHistoricos');
        db.periodosHistoricos = db.periodosHistoricos.filter((p) => p.id !== 2);
        R.renderPeriodosHistoricos();
        assert.equal(select.value, '');
    });
});
