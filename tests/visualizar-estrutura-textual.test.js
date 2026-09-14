import './helpers/localstorage-shim.js';
import './helpers/dom-shim.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { renderVisualizacaoEstruturaTextualHtml } from '../js/visualizar-estrutura-textual.js';

describe('renderVisualizacaoEstruturaTextualHtml', () => {
    it('sem Unidades/Eventos, cada seção mostra a mensagem de "nenhum cadastrado"', () => {
        const html = renderVisualizacaoEstruturaTextualHtml({});
        assert.match(html, /Nenhuma Unidade cadastrada\./);
        assert.match(html, /Nenhum Evento cadastrado\./);
    });

    it('lista Unidades e Eventos com rótulo + resumo de posição, incluindo "Não posicionado"', () => {
        const estrutura = {
            unidades: [
                {
                    unidadeEstrofica: 'Quartetos',
                    unidadeDiscursiva: 'Proposição',
                    posicao: { estrofes: [1, 2], versos: 'todos' },
                },
                {
                    unidadeEstrofica: 'Tercetos',
                    unidadeDiscursiva: 'Resolução',
                    posicao: { estrofes: [], versos: 'todos' },
                },
            ],
            eventos: [{ progressaoDialetica: 'Volta', posicao: { estrofes: [4], versos: [1] } }],
        };
        const html = renderVisualizacaoEstruturaTextualHtml(estrutura);
        assert.match(html, /<strong[^>]*>Quartetos · Proposição<\/strong>/);
        assert.match(html, /Estrofes 1, 2, todos os versos/);
        assert.match(html, /<strong[^>]*>Tercetos · Resolução<\/strong>/);
        assert.match(html, /Não posicionado/);
        assert.match(html, /<strong[^>]*>Volta<\/strong>/);
        assert.match(html, /Estrofe 4, verso 1/);
    });

    it('ordena os itens por posição no texto, não pela ordem de criação', () => {
        const estrutura = {
            unidades: [
                { unidadeEstrofica: 'Tercetos', posicao: { estrofes: [3], versos: 'todos' } },
                { unidadeEstrofica: 'Quartetos', posicao: { estrofes: [1], versos: 'todos' } },
            ],
        };
        const html = renderVisualizacaoEstruturaTextualHtml(estrutura);
        const posQuartetos = html.indexOf('Quartetos');
        const posTercetos = html.indexOf('Tercetos');
        assert.ok(posQuartetos < posTercetos, 'Quartetos (estrofe 1) deveria vir antes de Tercetos (estrofe 3)');
    });

    it('escapa HTML no rótulo (evita injeção via campo livre com datalist)', () => {
        const estrutura = { eventos: [{ progressaoDialetica: '<img src=x>' }] };
        const html = renderVisualizacaoEstruturaTextualHtml(estrutura);
        assert.ok(!html.includes('<img src=x>'));
        assert.match(html, /&lt;img/);
    });
});
