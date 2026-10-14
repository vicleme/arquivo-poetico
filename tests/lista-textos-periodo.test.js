import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Ver do Período Biográfico e do Período Histórico: textos clicáveis, limite
// de 6 por seção, "Ver todos os N" só acima do limite, total no título.

const { db } = await import('../js/db.js');
const { LIMITE_TEXTOS_NO_VER, ordenarTextosDoPeriodo, listaTextosPeriodoHtml, tituloSecaoTextos } =
    await import('../js/lista-textos-periodo.js');
const { renderVisualizacaoPeriodoBiograficoHtml } =
    await import('../js/visualizar-periodo-biografico.js');
const { renderVisualizacaoPeriodoHistoricoHtml } =
    await import('../js/visualizar-periodo-historico.js');

const textos = (n, prefixo = 'Texto') =>
    Array.from({ length: n }, (_, i) => ({ id: i + 1, titulo: `${prefixo} ${i + 1}` }));
const cria = (html) => {
    const el = document.createElement('div');
    el.innerHTML = html;
    return el;
};
const botoesDeTexto = (el) => [...el.querySelectorAll('li button')];
const botaoVerTodos = (el) =>
    [...el.querySelectorAll('button')].filter((b) => /^Ver todos/.test(b.textContent));

describe('ordenarTextosDoPeriodo', () => {
    it('ordena por data de escrita; sem data, por título, no fim', () => {
        const ordem = ordenarTextosDoPeriodo([
            { id: 1, titulo: 'Sem data B' },
            { id: 2, titulo: 'De 2015', dataEscrita: { ano: 2015, mes: 3 } },
            { id: 3, titulo: 'Sem data A' },
            { id: 4, titulo: 'De 2012', dataEscrita: { ano: 2012 } },
            { id: 5, titulo: 'De 2015 antes', dataEscrita: { ano: 2015, mes: 1, dia: 9 } },
        ]).map((t) => t.id);
        assert.deepEqual(ordem, [4, 5, 2, 3, 1]);
    });

    it('não altera a lista recebida', () => {
        const original = [
            { id: 2, titulo: 'B' },
            { id: 1, titulo: 'A' },
        ];
        ordenarTextosDoPeriodo(original);
        assert.deepEqual(
            original.map((t) => t.id),
            [2, 1],
        );
    });
});

describe('listaTextosPeriodoHtml', () => {
    const abrir = { funcaoAbrir: 'abrirX', acaoVerTodos: 'verTodosX(10)' };

    for (const [n, esperados, comBotao] of [
        [0, 0, false],
        [1, 1, false],
        [6, 6, false],
        [7, 6, true],
        [20, 6, true],
    ]) {
        it(`${n} texto(s): mostra ${esperados}, Ver todos ${comBotao ? 'sim' : 'não'}`, () => {
            const el = cria(listaTextosPeriodoHtml(textos(n), { tipo: 'poema', ...abrir }));
            assert.equal(botoesDeTexto(el).length, esperados);
            assert.equal(botaoVerTodos(el).length, comBotao ? 1 : 0);
            if (comBotao) {
                assert.equal(botaoVerTodos(el)[0].textContent, `Ver todos os ${n} poemas`);
            }
        });
    }

    it('o limite padrão é 6', () => {
        assert.equal(LIMITE_TEXTOS_NO_VER, 6);
    });

    it('cada título chama a função de abrir com tipo e id certos', () => {
        const el = cria(
            listaTextosPeriodoHtml([{ id: 42, titulo: 'Alvo' }], { tipo: 'prosa', ...abrir }),
        );
        assert.equal(botoesDeTexto(el)[0].getAttribute('onclick'), "abrirX('prosa', 42)");
    });

    it('o botão Ver todos usa a ação recebida e o rótulo de prosas', () => {
        const el = cria(listaTextosPeriodoHtml(textos(8), { tipo: 'prosa', ...abrir }));
        assert.equal(botaoVerTodos(el)[0].getAttribute('onclick'), 'verTodosX(10)');
        assert.equal(botaoVerTodos(el)[0].textContent, 'Ver todos os 8 prosas');
    });

    it('texto sem título aparece como (sem título); escapa HTML', () => {
        const el = cria(
            listaTextosPeriodoHtml(
                [
                    { id: 1, titulo: '' },
                    { id: 2, titulo: '<b>x</b>' },
                ],
                { tipo: 'poema', ...abrir },
            ),
        );
        const nomes = botoesDeTexto(el).map((b) => b.textContent);
        assert.ok(nomes.includes('(sem título)'));
        assert.ok(nomes.includes('<b>x</b>'));
        assert.equal(el.querySelectorAll('b').length, 0);
    });

    it('o título da seção leva o total, não só os mostrados', () => {
        assert.equal(tituloSecaoTextos('Poemas', 20), 'Poemas (20)');
        assert.equal(
            tituloSecaoTextos('Poemas', 3, ', com os de dentro'),
            'Poemas (3, com os de dentro)',
        );
    });
});

describe('Ver do Período Biográfico com muitos textos', () => {
    beforeEach(() => {
        db.autores = [{ id: 1, nome: 'Ana' }];
        db.pessoas = [];
    });
    const periodo = { id: 10, nome: 'Faculdade', autorId: 1, esferas: [], categorias: [] };

    it('poemas e prosas são limitados separadamente, cada um com o seu total', () => {
        const html = renderVisualizacaoPeriodoBiograficoHtml(periodo, db, {
            poemas: textos(20, 'P'),
            prosas: textos(7, 'R'),
        });
        const el = cria(html);
        assert.match(el.textContent, /Poemas \(20\)/);
        assert.match(el.textContent, /Prosas \(7\)/);
        assert.equal(botoesDeTexto(el).length, 12);
        assert.deepEqual(
            botaoVerTodos(el).map((b) => b.textContent),
            ['Ver todos os 20 poemas', 'Ver todos os 7 prosas'],
        );
        assert.equal(
            botaoVerTodos(el)[0].getAttribute('onclick'),
            'verTodosTextosDoPeriodoBiografico(10)',
        );
        assert.match(
            botoesDeTexto(el)[0].getAttribute('onclick'),
            /^abrirTextoDoPeriodoBiograficoVer\('poema', \d+\)$/,
        );
    });

    it('com 3 textos não há Ver todos; sem texto, a mensagem de sempre', () => {
        const tres = cria(
            renderVisualizacaoPeriodoBiograficoHtml(periodo, db, { poemas: textos(3) }),
        );
        assert.equal(botaoVerTodos(tres).length, 0);
        const zero = cria(renderVisualizacaoPeriodoBiograficoHtml(periodo, db));
        assert.match(zero.textContent, /Ainda não está ligado a nenhum texto\./);
    });
});

describe('Ver do Período Histórico com muitos textos', () => {
    const periodo = { id: 7, nome: 'Governo X' };

    it('limita a 6, com total no título e Ver todos ligado à lupa do histórico', () => {
        const el = cria(
            renderVisualizacaoPeriodoHistoricoHtml(periodo, {
                poemas: textos(20, 'P'),
                prosas: textos(2, 'R'),
            }),
        );
        assert.match(el.textContent, /Poemas \(20\)/);
        assert.equal(botoesDeTexto(el).length, 8);
        assert.equal(botaoVerTodos(el).length, 1);
        assert.equal(
            botaoVerTodos(el)[0].getAttribute('onclick'),
            'verTodosTextosDoPeriodoHistorico(7)',
        );
        assert.match(
            botoesDeTexto(el)[0].getAttribute('onclick'),
            /^abrirTextoDoPeriodoHistoricoVer\('poema', \d+\)$/,
        );
    });

    it('mantém o aviso "com os de dentro" no título', () => {
        const el = cria(
            renderVisualizacaoPeriodoHistoricoHtml(periodo, {
                dentro: [{ nome: 'Filho' }],
                poemas: textos(7),
                totalDireto: 1,
            }),
        );
        assert.match(el.textContent, /Poemas \(7, com os de dentro\)/);
    });
});
