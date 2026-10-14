import './helpers/dom-real.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Lista de Períodos Históricos: quando o filtro esconde o pai, ele fica
// na árvore apagado, só como contexto (como em Correntes literárias).

document.body.innerHTML =
    '<div id="lista-periodos-historicos"></div><div id="filtros-periodo-periodosHistoricos"></div>';

const H = await import('../js/periodos-historicos-hierarquia.js');
const { db } = await import('../js/db.js');
const { renderPeriodosHistoricos, setFiltroPeriodo } = await import('../js/render-listas.js');

const lista = [
    { id: 1, nome: 'Nova República', pertenceA: [] },
    { id: 2, nome: 'Governo Dilma Rousseff', pertenceA: [1] },
    { id: 3, nome: 'Segundo mandato', pertenceA: [2] },
    { id: 4, nome: 'Ditadura Militar', pertenceA: [] },
];

describe('ancestraisForaDoPeriodo', () => {
    it('devolve os ancestrais que não passaram, na ordem do cadastro', () => {
        const fora = H.ancestraisForaDoPeriodo(lista, [lista[2]]);
        assert.deepEqual(
            fora.map((p) => p.id),
            [1, 2],
        );
    });

    it('não repete quem já passou e ignora períodos sem pai', () => {
        const fora = H.ancestraisForaDoPeriodo(lista, [lista[1], lista[2], lista[3]]);
        assert.deepEqual(
            fora.map((p) => p.id),
            [1],
        );
    });
});

describe('lista com filtro por nome', () => {
    it('mostra os pais apagados como contexto e recuados em árvore', () => {
        db.periodosHistoricos = lista.map((p) => ({ ...p }));
        renderPeriodosHistoricos();
        document.getElementById('fp-periodosHistoricos-nome').value = 'Segundo';
        setFiltroPeriodo('periodosHistoricos');
        renderPeriodosHistoricos();
        const cards = [...document.querySelectorAll('#lista-periodos-historicos > div')];
        assert.equal(cards.length, 3);
        assert.equal(cards[0].dataset.contexto, 'true');
        assert.equal(cards[1].dataset.contexto, 'true');
        assert.equal(cards[2].dataset.contexto, undefined);
        assert.equal(cards[2].dataset.dentroDeOutro, 'true');
        assert.match(cards[0].textContent, /Nova República/);
        assert.match(cards[2].textContent, /Segundo mandato/);
        document.getElementById('fp-periodosHistoricos-nome').value = '';
        setFiltroPeriodo('periodosHistoricos');
    });
});
