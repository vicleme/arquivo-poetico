import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Lista de Períodos Históricos: recolher/expandir ramos, contagem, rótulo com
// caminho no campo dos modais e a visualização somente-leitura (botão Ver).

document.body.innerHTML =
    '<span id="contagem-periodos-historicos"></span>' +
    '<div id="lista-periodos-historicos"></div><div id="filtros-periodo-periodosHistoricos"></div>';

const H = await import('../js/periodos-historicos-hierarquia.js');
const { db } = await import('../js/db.js');
const {
    renderPeriodosHistoricos,
    setFiltroPeriodo,
    alternarRamoPeriodoHistorico,
    recolherTodosPeriodosHistoricos,
    expandirTodosPeriodosHistoricos,
} = await import('../js/render-listas.js');
const { renderVisualizacaoPeriodoHistoricoHtml } =
    await import('../js/visualizar-periodo-historico.js');

const arvore = () => [
    { id: 1, nome: 'Nova República', pertenceA: [] },
    { id: 2, nome: 'Governo Dilma Rousseff', pertenceA: [1] },
    { id: 3, nome: 'Segundo mandato', pertenceA: [2] },
    { id: 4, nome: 'Governo Lula', pertenceA: [1] },
    { id: 5, nome: 'Ditadura Militar', pertenceA: [] },
];
const titulos = () =>
    [...document.querySelectorAll('#lista-periodos-historicos > div')].map(
        (c) => c.querySelector('h4').textContent,
    );
const filtrar = (nome) => {
    document.getElementById('fp-periodosHistoricos-nome').value = nome;
    setFiltroPeriodo('periodosHistoricos');
    renderPeriodosHistoricos();
};

describe('recolher e expandir ramos', () => {
    beforeEach(() => {
        db.periodosHistoricos = arvore();
        db.poemas = [];
        db.prosas = [];
        renderPeriodosHistoricos();
        filtrar('');
        expandirTodosPeriodosHistoricos();
    });

    it('recolher esconde o que está dentro e o card diz quantos', () => {
        alternarRamoPeriodoHistorico(1);
        assert.deepEqual(titulos(), ['Ditadura Militar', 'Nova República']);
        const card = [...document.querySelectorAll('#lista-periodos-historicos > div')].find(
            (c) => c.querySelector('h4').textContent === 'Nova República',
        );
        assert.match(card.textContent, /3 escondidos no ramo/);
        assert.equal(
            card
                .querySelector('[data-action="alternar-ramo-periodo-historico"]')
                .getAttribute('aria-expanded'),
            'false',
        );
        alternarRamoPeriodoHistorico(1);
        assert.equal(titulos().length, 5);
    });

    it('recolher um ramo de dentro esconde só o que é dele', () => {
        alternarRamoPeriodoHistorico(2);
        assert.equal(titulos().includes('Segundo mandato'), false);
        assert.equal(titulos().includes('Governo Lula'), true);
    });

    it('só quem tem períodos dentro ganha o botão', () => {
        const cards = [...document.querySelectorAll('#lista-periodos-historicos > div')];
        const comBotao = cards
            .filter((c) => c.querySelector('[data-action="alternar-ramo-periodo-historico"]'))
            .map((c) => c.querySelector('h4').textContent);
        assert.deepEqual(comBotao.sort(), ['Governo Dilma Rousseff', 'Nova República']);
    });

    it('recolher tudo e expandir tudo', () => {
        recolherTodosPeriodosHistoricos();
        assert.deepEqual(titulos(), ['Ditadura Militar', 'Nova República']);
        expandirTodosPeriodosHistoricos();
        assert.equal(titulos().length, 5);
    });

    it('com filtro ativo o recolhimento é ignorado', () => {
        recolherTodosPeriodosHistoricos();
        filtrar('Segundo');
        assert.ok(titulos().includes('Segundo mandato'));
        filtrar('');
    });

    it('a contagem mostra o total e, com filtro, N de M', () => {
        const el = document.getElementById('contagem-periodos-historicos');
        assert.equal(el.textContent, '5 períodos');
        filtrar('Segundo');
        assert.equal(el.textContent, '1 de 5 períodos');
        filtrar('');
    });
});

describe('rótulo do período nos modais de Poema e Prosa', () => {
    it('período dentro de outro leva o caminho; o de topo, só o nome', () => {
        const lista = arvore();
        assert.equal(
            H.rotuloDeEscolhaDoPeriodo(lista, 3),
            'Segundo mandato (Nova República › Governo Dilma Rousseff)',
        );
        assert.equal(H.rotuloDeEscolhaDoPeriodo(lista, 1), 'Nova República');
    });

    it('o rótulo com caminho e o nome puro voltam ao mesmo período', () => {
        const lista = arvore();
        const rotulo = H.rotuloDeEscolhaDoPeriodo(lista, 3);
        assert.deepEqual(H.resolverPeriodoPorRotulo(lista, rotulo), { id: 3 });
        assert.deepEqual(H.resolverPeriodoPorRotulo(lista, 'Segundo mandato'), { id: 3 });
    });

    it('homônimos continuam separados pelo caminho', () => {
        const lista = [
            ...arvore(),
            { id: 6, nome: 'Primeiro mandato', pertenceA: [4] },
            { id: 7, nome: 'Primeiro mandato', pertenceA: [2] },
        ];
        assert.notEqual(H.rotuloDeEscolhaDoPeriodo(lista, 6), H.rotuloDeEscolhaDoPeriodo(lista, 7));
        assert.deepEqual(H.resolverPeriodoPorRotulo(lista, 'Primeiro mandato'), {
            ambiguo: true,
            nome: 'Primeiro mandato',
        });
    });
});

describe('visualização do período', () => {
    it('mostra caminho, outros pais, períodos de dentro e textos', () => {
        const html = renderVisualizacaoPeriodoHistoricoHtml(
            {
                nome: 'Governo Dilma Rousseff',
                notas: 'Duas gestões.',
                inicio: { ano: 2011 },
                fim: { ano: 2016 },
            },
            {
                caminhos: ['Nova República', 'Era PT'],
                dentro: [{ nome: 'Segundo mandato', intervalo: '2015 – 2016' }],
                poemas: [{ id: 1, titulo: 'Poema A' }],
                prosas: [],
                totalDireto: 0,
            },
        );
        assert.match(html, /Faz parte de:<\/strong> Nova República/);
        assert.match(html, /Também em:<\/strong> Era PT/);
        assert.match(html, /Períodos de dentro \(1\)/);
        assert.match(html, /Segundo mandato · 2015 – 2016/);
        assert.match(html, /Poemas \(1, com os de dentro\)/);
        assert.match(html, /Duas gestões\./);
    });

    it('sem textos, avisa que não há nada ligado', () => {
        const html = renderVisualizacaoPeriodoHistoricoHtml({ nome: 'X' }, {});
        assert.match(html, /Ainda não está ligado a nenhum texto/);
    });
});

describe('select "Pertence a" em árvore', () => {
    it('opções em árvore, com os de dentro recuados e sem o próprio período nem os de dentro dele', () => {
        const lista = arvore();
        const alfabetica = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR');
        const arv = H.opcoesDePaiEmArvore(lista, 3, alfabetica).map(({ m, nivel }) => [
            m.id,
            nivel,
        ]);
        // Ditadura (topo); Nova República > Governo Dilma, Governo Lula; sem o 3
        assert.deepEqual(arv, [
            [5, 0],
            [1, 0],
            [2, 1],
            [4, 1],
        ]);
        // editando o 1, saem ele e todos os de dentro
        assert.deepEqual(
            H.opcoesDePaiEmArvore(lista, 1, alfabetica).map(({ m }) => m.id),
            [5],
        );
    });
});
