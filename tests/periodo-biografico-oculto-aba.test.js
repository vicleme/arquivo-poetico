import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Aba Período Biográfico com período oculto: o cartão some e não entra na
// contagem; "Exibir ocultas" (o mesmo botão das pessoas) o traz de volta
// marcado; Ocultar/Reexibir no cartão alterna o flag.

document.body.innerHTML = `
    <main>
        <div id="filtros-periodo-epocas"></div>
        <div id="lista-epocas"></div>
    </main>
`;

const { db } = await import('../js/db.js');
const { renderEpocas, alternarExibirOcultasEpocas } = await import('../js/render-listas.js');
const { toggleOcultarEpoca } = await import('../js/epocas-acoes.js');
const { definirExibirOcultasDosPeriodos, exibindoOcultasDosPeriodos } =
    await import('../js/ocultas-periodos.js');

const titulos = () =>
    [...document.querySelectorAll('#lista-epocas h4')].map((h) => h.textContent.trim());
const contagem = () => document.getElementById('fp-epocas-contagem').textContent.trim();
const botao = () => document.getElementById('fp-epocas-ocultas');

function montarBanco() {
    db.autores = [{ id: 1, nome: 'Ana', genero: 'Mulher' }];
    db.pessoas = [{ id: 100, nome: 'Carla', genero: 'Mulher', oculto: false }];
    db.epocas = [
        { id: 10, nome: 'Namoro', autorId: 1, oculto: true, pessoasEnvolvidas: [], relacoes: [] },
        {
            id: 11,
            nome: 'Faculdade',
            autorId: 1,
            oculto: false,
            pessoasEnvolvidas: [],
            relacoes: [],
        },
    ];
    db.poemas = [];
    db.prosas = [];
    definirExibirOcultasDosPeriodos(false);
    renderEpocas();
}

describe('aba Período Biográfico com período oculto', () => {
    beforeEach(montarBanco);

    it('esconde o período oculto e não o conta', () => {
        assert.deepEqual(titulos(), ['Faculdade']);
        assert.equal(contagem(), '1 período');
        assert.ok(!document.getElementById('lista-epocas').textContent.includes('Namoro'));
    });

    it('o botão Exibir ocultas aparece mesmo sem pessoa oculta, por causa do período', () => {
        assert.equal(botao().classList.contains('hidden'), false);
        assert.equal(botao().textContent, 'Exibir ocultas');
    });

    it('Exibir ocultas traz o período de volta, marcado e esmaecido', () => {
        alternarExibirOcultasEpocas();
        assert.equal(exibindoOcultasDosPeriodos(), true);
        assert.equal(botao().textContent, 'Esconder ocultas');
        assert.equal(titulos().length, 2);
        const cartao = [...document.querySelectorAll('#lista-epocas h4')].find((h) =>
            h.textContent.includes('Namoro'),
        );
        assert.ok(cartao.textContent.includes('(oculto)'));
        assert.ok(cartao.closest('div.opacity-60'));
        assert.equal(contagem(), '2 períodos');
        alternarExibirOcultasEpocas();
        assert.deepEqual(titulos(), ['Faculdade']);
    });

    it('sem nenhum oculto (pessoa ou período), o botão some', () => {
        db.epocas[0].oculto = false;
        renderEpocas();
        assert.equal(botao().classList.contains('hidden'), true);
    });

    it('Ocultar e Reexibir alternam o flag e o cartão', () => {
        toggleOcultarEpoca(11);
        assert.equal(db.epocas[1].oculto, true);
        renderEpocas();
        assert.deepEqual(titulos(), []);
        alternarExibirOcultasEpocas();
        toggleOcultarEpoca(11);
        assert.equal(db.epocas[1].oculto, false);
    });
});
