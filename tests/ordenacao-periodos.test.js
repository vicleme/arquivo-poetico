import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Ordenação alfabética/cronológica em Época (Período Biográfico) e
// Período Histórico — mesma feature que já existia em Movimento/Escola
// (ver describe correspondente em render-dom.test.js), estendida pro
// Victor pedir os dois cadastros de período que faltavam.
document.body.innerHTML = `
    <main>
        <div id="filtros-periodo-epocas"></div>
        <div id="lista-epocas"></div>
        <div id="filtros-periodo-periodosHistoricos"></div>
        <div id="lista-periodos-historicos"></div>
    </main>
`;

const { db } = await import('../js/db.js');
const {
    renderEpocas,
    renderPeriodosHistoricos,
    definirOrdenacaoEpocas,
    definirOrdenacaoPeriodosHistoricos,
} = await import('../js/render-listas.js');

function nomesEpocas() {
    return [...document.querySelectorAll('#lista-epocas h4')].map((h4) => h4.textContent);
}

function nomesPeriodosHistoricos() {
    return [...document.querySelectorAll('#lista-periodos-historicos h4')].map(
        (h4) => h4.textContent,
    );
}

describe('Época — ordenação alfabética/cronológica (DOM real via happy-dom)', () => {
    beforeEach(() => {
        db.autores = [{ id: 1, nome: 'Autor Único' }];
        db.epocas = [];
        definirOrdenacaoEpocas('alfabetica');
    });

    it('alfabética ordena por nome', () => {
        db.epocas.push(
            { id: 1, nome: 'Namoro', autorId: 1, inicio: { ano: 2018 }, fim: {} },
            { id: 2, nome: 'Infância', autorId: 1, inicio: { ano: 1995 }, fim: {} },
            { id: 3, nome: 'Faculdade', autorId: 1, inicio: { ano: 2010 }, fim: {} },
        );
        renderEpocas();

        assert.deepEqual(nomesEpocas(), ['Faculdade', 'Infância', 'Namoro']);
    });

    it('cronológica ordena por data de início, e item sem nenhuma data vai pro final', () => {
        db.epocas.push(
            { id: 1, nome: 'Namoro', autorId: 1, inicio: { ano: 2018 }, fim: {} },
            { id: 2, nome: 'Infância', autorId: 1, inicio: { ano: 1995 }, fim: {} },
            { id: 3, nome: 'Faculdade', autorId: 1, inicio: { ano: 2010 }, fim: {} },
            { id: 4, nome: 'Sem Data Nenhuma', autorId: 1, inicio: null, fim: null },
        );
        definirOrdenacaoEpocas('cronologica');

        assert.deepEqual(nomesEpocas(), ['Infância', 'Faculdade', 'Namoro', 'Sem Data Nenhuma']);
    });

    it('voltar pra alfabética a partir da cronológica reordena de novo', () => {
        db.epocas.push(
            { id: 1, nome: 'Arcadismo', autorId: 1, inicio: { ano: 1900 }, fim: {} },
            { id: 2, nome: 'Zeitgeist', autorId: 1, inicio: { ano: 1100 }, fim: {} },
        );
        definirOrdenacaoEpocas('cronologica');
        assert.deepEqual(nomesEpocas(), ['Zeitgeist', 'Arcadismo']);

        definirOrdenacaoEpocas('alfabetica');
        assert.deepEqual(nomesEpocas(), ['Arcadismo', 'Zeitgeist']);
    });
});

describe('Período Histórico — ordenação alfabética/cronológica (DOM real via happy-dom)', () => {
    beforeEach(() => {
        db.periodosHistoricos = [];
        definirOrdenacaoPeriodosHistoricos('alfabetica');
    });

    it('alfabética ordena por nome', () => {
        db.periodosHistoricos.push(
            { id: 1, nome: 'Segunda Guerra', inicio: { ano: 1939 }, fim: { ano: 1945 } },
            { id: 2, nome: 'Belle Époque', inicio: { ano: 1871 }, fim: { ano: 1914 } },
            { id: 3, nome: 'Primeira Guerra', inicio: { ano: 1914 }, fim: { ano: 1918 } },
        );
        renderPeriodosHistoricos();

        assert.deepEqual(nomesPeriodosHistoricos(), [
            'Belle Époque',
            'Primeira Guerra',
            'Segunda Guerra',
        ]);
    });

    it('cronológica ordena por data de início, e item sem nenhuma data vai pro final', () => {
        db.periodosHistoricos.push(
            { id: 1, nome: 'Segunda Guerra', inicio: { ano: 1939 }, fim: { ano: 1945 } },
            { id: 2, nome: 'Belle Époque', inicio: { ano: 1871 }, fim: { ano: 1914 } },
            { id: 3, nome: 'Primeira Guerra', inicio: { ano: 1914 }, fim: { ano: 1918 } },
            { id: 4, nome: 'Sem Data Nenhuma', inicio: null, fim: null },
        );
        definirOrdenacaoPeriodosHistoricos('cronologica');

        assert.deepEqual(nomesPeriodosHistoricos(), [
            'Belle Époque',
            'Primeira Guerra',
            'Segunda Guerra',
            'Sem Data Nenhuma',
        ]);
    });

    it('voltar pra alfabética a partir da cronológica reordena de novo', () => {
        db.periodosHistoricos.push(
            { id: 1, nome: 'Arcadismo', inicio: { ano: 1900 }, fim: {} },
            { id: 2, nome: 'Zeitgeist', inicio: { ano: 1100 }, fim: {} },
        );
        definirOrdenacaoPeriodosHistoricos('cronologica');
        assert.deepEqual(nomesPeriodosHistoricos(), ['Zeitgeist', 'Arcadismo']);

        definirOrdenacaoPeriodosHistoricos('alfabetica');
        assert.deepEqual(nomesPeriodosHistoricos(), ['Arcadismo', 'Zeitgeist']);
    });
});
