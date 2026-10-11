import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Estatísticas de Correntes literárias: Postura estética e Programa dos
// textos (valor efetivo, com a herança do pai) e o cruzamento Programa ×
// Postura. O teste mais importante confere que cada barra e cada célula
// batem com a lista que o clique abre.
const { db } = await import('../js/db.js');
const E = await import('../js/estatisticas.js');
const { filtrarTextos } = await import('../js/utils.js');
const { decorarCamposBusca } = await import('../js/render-listas.js');
const { renderCorrentes, resumoDoAtributoDaCorrente } =
    await import('../js/estatisticas-tela-correntes.js');

const HTML = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const SECAO = HTML.match(/<section id="estatisticas-correntes"[\s\S]*?<\/section>/)[0];

// Romantismo (Movimento, Inovadora)
//   └ Romantismo no Brasil (tudo herdado)
//       └ 3ª geração (Postura própria: Iconoclasta)
// Concretismo (Vanguarda, Iconoclasta)
// Pré-Modernismo (Não se aplica nos dois)
// Sem dados (nada)
// Parnasianismo (Escola, Restauradora)
function zerar() {
    localStorage.clear();
    ['livros', 'partes', 'secoes', 'elementos', 'pessoas', 'grupos', 'autores', 'epocas'].forEach(
        (c) => (db[c] = []),
    );
    db.movimentosEscolas = [
        {
            id: 1,
            nome: 'Romantismo',
            paiId: null,
            programa: 'Movimento',
            posturaEstetica: 'Inovadora',
        },
        { id: 2, nome: 'Romantismo no Brasil', paiId: 1 },
        { id: 3, nome: '3ª geração', paiId: 2, posturaEstetica: 'Iconoclasta' },
        {
            id: 4,
            nome: 'Concretismo',
            paiId: null,
            programa: 'Vanguarda',
            posturaEstetica: 'Iconoclasta',
        },
        {
            id: 5,
            nome: 'Pré-Modernismo',
            paiId: null,
            programa: 'Não se aplica',
            posturaEstetica: 'Não se aplica',
        },
        { id: 6, nome: 'Sem dados', paiId: null },
        {
            id: 7,
            nome: 'Parnasianismo',
            paiId: null,
            programa: 'Escola',
            posturaEstetica: 'Restauradora',
        },
    ];
}

const texto = (id, movimentosEscolasIds, extra = {}) => ({
    id,
    titulo: `T${id}`,
    ano: 2020,
    movimentosEscolasIds,
    ...extra,
});

function acervo() {
    zerar();
    db.poemas = [
        texto(1, [3]), // Movimento, Iconoclasta
        texto(2, [2]), // Movimento, Inovadora (herdados)
        texto(3, [4]), // Vanguarda, Iconoclasta
        texto(4, [5]), // Não se aplica nos dois: fora do denominador
        texto(5, [6]), // correntes sem valor: Sem classificação
        texto(6, []), // sem corrente
        texto(7, [3, 7]), // Movimento + Escola, Iconoclasta + Restauradora
    ];
    db.prosas = [
        texto(101, [1, 4]), // Movimento + Vanguarda, Inovadora + Iconoclasta
        texto(102, [999]), // id órfão: sem corrente
        texto(103, [5, 6]), // Não se aplica + vazio: só Não se aplica
    ];
}

const mapa = (r) => Object.fromEntries(r.labels.map((l, i) => [l, r.data[i]]));
const decorados = () => [...db.poemas, ...db.prosas].map((i) => decorarCamposBusca({ ...i }));

describe('agregarPorAtributoDaCorrente: Postura', () => {
    beforeEach(acervo);

    it('conta o valor efetivo, uma vez por texto em cada valor, com Sem classificação por último', () => {
        const r = E.agregarPorAtributoDaCorrente('postura');
        assert.deepEqual(mapa(r), {
            Tradicional: 0,
            Restauradora: 1,
            Reformista: 0,
            Inovadora: 2,
            Iconoclasta: 4,
            Eclética: 0,
            'Sem classificação': 1,
        });
        assert.equal(r.labels.at(-1), 'Sem classificação');
    });

    it('"Não se aplica" fica fora das barras e do denominador; texto sem corrente também', () => {
        const r = E.agregarPorAtributoDaCorrente('postura');
        assert.ok(!r.labels.includes('Não se aplica'));
        assert.equal(r.soNaoSeAplica, 2); // 4 e 103
        assert.equal(r.semCorrente, 2); // 6 e 102 (id órfão)
        assert.equal(r.denominador, 6); // 1, 2, 3, 5, 7 e 101
        assert.equal(r.textos, 10);
        assert.equal(r.soNaoSeAplica + r.semCorrente + r.denominador, r.textos);
    });

    it('respeita o corpus filtrado (só prosas)', () => {
        E.definirFiltrosCompartilhados({ tipo: 'prosas' });
        const r = E.agregarPorAtributoDaCorrente('postura');
        assert.equal(r.textos, 3);
        assert.deepEqual(mapa(r).Iconoclasta, 1);
        assert.deepEqual(mapa(r).Inovadora, 1);
        assert.equal(r.denominador, 1); // 101; 102 sem corrente, 103 só Não se aplica
    });

    it('sem nenhum texto devolve tudo zerado, sem dividir por zero', () => {
        db.poemas = [];
        db.prosas = [];
        const r = E.agregarPorAtributoDaCorrente('postura');
        assert.equal(r.denominador, 0);
        assert.ok(r.data.every((n) => n === 0));
        assert.equal(resumoDoAtributoDaCorrente(r), 'Nenhum texto neste recorte.');
    });
});

describe('agregarPorAtributoDaCorrente: Programa', () => {
    beforeEach(acervo);

    it('conta o Programa herdado e separa Sem classificação', () => {
        const r = E.agregarPorAtributoDaCorrente('programa');
        assert.deepEqual(mapa(r), {
            Escola: 1,
            Movimento: 4,
            Vanguarda: 2,
            'Grupo/Círculo': 0,
            Tendência: 0,
            'Sem classificação': 1,
        });
        assert.equal(r.denominador, 6);
        assert.equal(r.soNaoSeAplica, 2);
        assert.equal(r.semCorrente, 2);
    });
});

describe('a barra e a célula batem com a lista que o clique abre', () => {
    beforeEach(acervo);

    for (const campo of ['postura', 'programa']) {
        it(`cada barra de ${campo} abre uma lista com o mesmo número de textos`, () => {
            const itens = decorados();
            const r = E.agregarPorAtributoDaCorrente(campo);
            r.labels.forEach((rotulo, i) => {
                assert.equal(filtrarTextos(itens, r.consultas[i]).length, r.data[i], rotulo);
            });
        });
    }

    it('cada célula do cruzamento abre uma lista com o mesmo número de textos', () => {
        const itens = decorados();
        const c = E.cruzarProgramaPostura();
        c.programas.forEach((pg, i) =>
            c.posturas.forEach((ps, j) => {
                assert.equal(
                    filtrarTextos(itens, c.consultas[i][j]).length,
                    c.valores[i][j],
                    `${pg} × ${ps}`,
                );
            }),
        );
    });
});

describe('cruzarProgramaPostura', () => {
    beforeEach(acervo);

    it('linhas e colunas na ordem das listas, sem "Não se aplica"', () => {
        const c = E.cruzarProgramaPostura();
        assert.deepEqual(c.programas, [
            'Escola',
            'Movimento',
            'Vanguarda',
            'Grupo/Círculo',
            'Tendência',
        ]);
        assert.deepEqual(c.posturas, [
            'Tradicional',
            'Restauradora',
            'Reformista',
            'Inovadora',
            'Iconoclasta',
            'Eclética',
        ]);
    });

    it('conta os textos que têm o Programa e a Postura', () => {
        const c = E.cruzarProgramaPostura();
        const cel = (pg, ps) => c.valores[c.programas.indexOf(pg)][c.posturas.indexOf(ps)];
        assert.equal(cel('Movimento', 'Iconoclasta'), 3); // 1, 7 e 101
        assert.equal(cel('Movimento', 'Inovadora'), 2); // 2 e 101
        assert.equal(cel('Movimento', 'Restauradora'), 1); // 7
        assert.equal(cel('Vanguarda', 'Iconoclasta'), 2); // 3 e 101
        assert.equal(cel('Vanguarda', 'Inovadora'), 1); // 101
        assert.equal(cel('Escola', 'Restauradora'), 1); // 7
        assert.equal(cel('Escola', 'Iconoclasta'), 1); // 7
        assert.equal(cel('Tendência', 'Eclética'), 0);
    });

    it('texto de "Não se aplica" ou sem classificação não entra em nenhuma célula', () => {
        const c = E.cruzarProgramaPostura([db.poemas[3], db.poemas[4], db.prosas[2]]);
        assert.ok(c.valores.flat().every((n) => n === 0));
    });
});

describe('resumoDoAtributoDaCorrente', () => {
    beforeEach(acervo);

    it('diz o que entra, o que fica fora e por que a soma passa do total', () => {
        const texto = resumoDoAtributoDaCorrente(E.agregarPorAtributoDaCorrente('postura'));
        assert.match(texto, /6 textos entram nas barras, de 10 textos neste recorte/);
        assert.match(texto, /2 sem corrente literária ligada/);
        assert.match(texto, /2 só em correntes marcadas Não se aplica/);
        assert.match(texto, /soma das barras \(8\) passa do total/);
    });

    it('sem soma excedente nem exclusões, o texto fica curto', () => {
        db.poemas = [texto(1, [1])];
        db.prosas = [];
        const r = resumoDoAtributoDaCorrente(E.agregarPorAtributoDaCorrente('postura'));
        assert.equal(r, '1 texto entra nas barras, de 1 texto neste recorte.');
    });
});

describe('tela Correntes literárias', () => {
    const graficos = {};
    let consultas;

    beforeEach(() => {
        acervo();
        document.body.innerHTML = `${SECAO}
            <section id="poemas" class="tab-content"><input id="busca-poemas" /></section>
            <section id="prosas" class="tab-content"><input id="busca-prosas" /></section>`;
        Object.keys(graficos).forEach((k) => delete graficos[k]);
        globalThis.Chart = class {
            constructor(canvas, cfg) {
                this.canvas = canvas;
                this.data = cfg.data;
                graficos[canvas.id] = this;
            }
            destroy() {}
            getElementsAtEventForMode() {
                return [{ index: globalThis.Chart.clique }];
            }
            static getChart(canvas) {
                return graficos[canvas.id];
            }
        };
        consultas = [];
        window.abrirAba = () => {};
        window.setFiltroPoemas = (q) => consultas.push(q);
        window.setFiltroProsas = (q) => consultas.push(q);
    });

    const clicar = (canvasId, indice) => {
        globalThis.Chart.clique = indice;
        document.getElementById(canvasId).onclick({});
    };

    it('desenha os dois gráficos e a tabela, e escreve o resumo', () => {
        renderCorrentes();
        assert.deepEqual(graficos['grafico-correntes-postura'].data.labels.slice(0, 2), [
            'Tradicional',
            'Restauradora',
        ]);
        assert.equal(graficos['grafico-correntes-postura'].data.labels.at(-1), 'Sem classificação');
        assert.equal(graficos['grafico-correntes-programa'].data.labels[0], 'Escola');
        assert.match(
            document.getElementById('est-correntes-postura-contexto').textContent,
            /6 textos entram nas barras/,
        );
        assert.ok(document.querySelector('#tabela-correntes-cruzamento table'));
    });

    it('todos os ids que a tela usa existem no index.html e a aba está no menu', () => {
        [
            'grafico-correntes-postura',
            'est-correntes-postura-contexto',
            'grafico-correntes-programa',
            'est-correntes-programa-contexto',
            'tabela-correntes-cruzamento',
        ].forEach((id) => assert.ok(SECAO.includes(`id="${id}"`), id));
        assert.ok(SECAO.includes('est-filtros-compartilhados'));
        assert.ok(HTML.includes(`abrirAba('estatisticas-correntes')`));
        assert.ok(HTML.includes('id="btn-estatisticas-correntes"'));
    });

    it('clicar na barra abre Poemas com a busca da barra', () => {
        renderCorrentes();
        const rotulos = graficos['grafico-correntes-postura'].data.labels;
        clicar('grafico-correntes-postura', rotulos.indexOf('Iconoclasta'));
        assert.equal(consultas.at(-1), 'postura:"Iconoclasta"');
        clicar('grafico-correntes-postura', rotulos.indexOf('Sem classificação'));
        assert.equal(consultas.at(-1), 'movimento:* -postura:*');
        const prog = graficos['grafico-correntes-programa'].data.labels;
        clicar('grafico-correntes-programa', prog.indexOf('Movimento'));
        assert.equal(consultas.at(-1), 'programa:"Movimento"');
    });

    it('clicar numa célula abre a lista com Programa e Postura; célula zerada não é clicável', () => {
        renderCorrentes();
        const botoes = [...document.querySelectorAll('#tabela-correntes-cruzamento button')];
        const alvo = botoes.find((b) => b.title === 'Movimento × Iconoclasta: 3 texto(s)');
        assert.ok(alvo, 'célula Movimento × Iconoclasta');
        window.abrirListaCorrenteEstatisticas(alvo);
        assert.equal(consultas.at(-1), 'programa:"Movimento" postura:"Iconoclasta"');
        // Só as células com texto viram botão: 7 combinações no acervo de teste.
        assert.equal(botoes.length, 7);
    });

    it('sem texto classificado, a tabela avisa em vez de desenhar zeros', () => {
        db.poemas = [texto(1, [5])];
        db.prosas = [];
        renderCorrentes();
        assert.match(
            document.getElementById('tabela-correntes-cruzamento').textContent,
            /Nenhum texto tem, ao mesmo tempo, Programa e Postura classificados/,
        );
    });
});
