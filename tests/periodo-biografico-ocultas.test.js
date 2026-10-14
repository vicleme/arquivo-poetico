import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// "Mostrar ocultas": botão temporário no modal do período e na Visualização.
// Vale só com a janela aberta, nunca é guardado, e o padrão é esconder.
const html = readFileSync(new URL('../modais/modal-epoca.html', import.meta.url), 'utf8');
document.body.innerHTML = `<div id="modais-container">${html}</div>`;

const { db } = await import('../js/db.js');
const { ROTULOS_VINCULO_DE_FABRICA, linhasDoPeriodoBiografico } =
    await import('../js/periodo-biografico-campos.js');
const { preencherCamposPeriodoBiografico, lerCamposPeriodoBiografico } =
    await import('../js/periodo-biografico-ui.js');
const { renderVisualizacaoPeriodoBiograficoHtml } =
    await import('../js/visualizar-periodo-biografico.js');

const el = (id) => document.getElementById(id);
const chips = () => [...el('ep-pessoas-lista').children].map((c) => c.textContent);
const opcoesSelect = () => [...el('ep-pessoas-select').options].map((o) => o.textContent);
const textoDe = (h) => {
    const d = document.createElement('div');
    d.innerHTML = h;
    return d.textContent.replace(/\s+/g, ' ').trim();
};

function montarBanco({ comOculta = true } = {}) {
    db.autores = [{ id: 1, nome: 'Ana', genero: 'Mulher' }];
    db.pessoas = [
        { id: 100, nome: 'Carla', genero: 'Mulher', oculto: false },
        { id: 101, nome: 'Davi', genero: 'Homem', oculto: comOculta },
    ];
    db.opcoesPeriodoBiografico = {
        esferas: [],
        vinculos: ['Amizade', 'Romântico', ...ROTULOS_VINCULO_DE_FABRICA.map((r) => r.nome)],
        rotulosVinculo: ROTULOS_VINCULO_DE_FABRICA.map((r) => ({ ...r })),
    };
    db.epocas = [
        {
            id: 10,
            nome: 'Faculdade',
            autorId: 1,
            pessoasEnvolvidas: [{ pessoaId: 100 }, { pessoaId: 101 }],
            relacoes: [
                { de: 'autor', para: 100, natureza: '', vinculo: 'Amizade' },
                { de: 'autor', para: 101, natureza: '', vinculo: 'Romântico' },
            ],
        },
    ];
    el('ep-autor').innerHTML = '<option value="1">Ana</option>';
    el('ep-autor').value = '1';
}

describe('Mostrar ocultas no modal do período', () => {
    beforeEach(() => montarBanco());

    it('começa escondendo e o botão aparece quando há pessoa oculta', () => {
        preencherCamposPeriodoBiografico(db.epocas[0]);
        assert.deepEqual(chips(), ['Carla×']);
        assert.equal(el('ep-mostrar-ocultas').classList.contains('hidden'), false);
        assert.equal(el('ep-mostrar-ocultas').getAttribute('aria-pressed'), 'false');
        assert.equal(el('ep-relacoes-lista').children.length, 1);
    });

    it('ligar mostra a pessoa oculta marcada, a relação com ela e a oferece no seletor', () => {
        preencherCamposPeriodoBiografico(db.epocas[0]);
        el('ep-mostrar-ocultas').click();
        assert.equal(el('ep-mostrar-ocultas').textContent.trim(), 'Esconder ocultas');
        assert.equal(el('ep-mostrar-ocultas').getAttribute('aria-pressed'), 'true');
        assert.ok(chips().some((t) => t.startsWith('Davi (oculta)')));
        assert.equal(el('ep-relacoes-lista').children.length, 2);
        _removeDaListaParaVerSeletor();
        assert.ok(opcoesSelect().includes('Davi (oculta)'));
    });

    it('não muda o flag da pessoa nem os dados gravados', () => {
        preencherCamposPeriodoBiografico(db.epocas[0]);
        const antes = JSON.stringify(lerCamposPeriodoBiografico());
        el('ep-mostrar-ocultas').click();
        el('ep-mostrar-ocultas').click();
        assert.equal(db.pessoas[1].oculto, true);
        assert.equal(JSON.stringify(lerCamposPeriodoBiografico()), antes);
    });

    it('reabrir o modal volta a esconder', () => {
        preencherCamposPeriodoBiografico(db.epocas[0]);
        el('ep-mostrar-ocultas').click();
        preencherCamposPeriodoBiografico(db.epocas[0]);
        assert.deepEqual(chips(), ['Carla×']);
        assert.equal(el('ep-mostrar-ocultas').getAttribute('aria-pressed'), 'false');
    });

    it('sem nenhuma pessoa oculta no cadastro o botão fica escondido', () => {
        montarBanco({ comOculta: false });
        preencherCamposPeriodoBiografico(db.epocas[0]);
        assert.equal(el('ep-mostrar-ocultas').classList.contains('hidden'), true);
    });
});

// O seletor só lista quem ainda não está no período; esvazia a lista para
// conferir que as ocultas entram nele quando o botão está ligado.
function _removeDaListaParaVerSeletor() {
    preencherCamposPeriodoBiografico({ ...db.epocas[0], pessoasEnvolvidas: [], relacoes: [] });
    el('ep-mostrar-ocultas').click();
}

describe('Mostrar ocultas nas funções de visibilidade e na Visualização', () => {
    beforeEach(() => montarBanco());

    it('por padrão a relação com pessoa oculta some; com a opção ela volta', () => {
        const padrao = linhasDoPeriodoBiografico(db.epocas[0], db);
        assert.equal(padrao.length, 1);
        const todas = linhasDoPeriodoBiografico(db.epocas[0], db, { incluirOcultas: true });
        assert.equal(todas.length, 2);
    });

    it('a Visualização só mostra a pessoa oculta com mostrarOcultas', () => {
        assert.doesNotMatch(
            textoDe(renderVisualizacaoPeriodoBiograficoHtml(db.epocas[0], db)),
            /Davi/,
        );
        assert.match(
            textoDe(
                renderVisualizacaoPeriodoBiograficoHtml(db.epocas[0], db, { mostrarOcultas: true }),
            ),
            /Davi/,
        );
    });
});
