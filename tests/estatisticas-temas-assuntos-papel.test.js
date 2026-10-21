import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Fase 1, etapa 1b: Temas e Assuntos num gráfico só, barra empilhada por papel
// (principal, secundário, indefinido). O que mais importa: o total empilhado é
// exatamente a contagem antiga ("Todos"), e clicar num segmento abre uma lista
// com o mesmo número do segmento.
const { db } = await import('../js/db.js');
const E = await import('../js/estatisticas.js');
const { renderTemasAssuntos } = await import('../js/estatisticas-tela-temas.js');
const { filtrarTextos } = await import('../js/utils.js');
const { decorarCamposBusca } = await import('../js/render-listas.js');

const HTML = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const SECAO = HTML.match(/<section id="estatisticas-temas-assuntos"[\s\S]*?<\/section>/)[0];

function acervo() {
    localStorage.clear();
    ['livros', 'partes', 'secoes', 'elementos', 'epocas', 'autores', 'grupos', 'pessoas'].forEach(
        (c) => (db[c] = []),
    );
    db.temas = [
        { id: 1, nome: 'Amor', notas: '' },
        { id: 2, nome: 'Mar', notas: '' },
        { id: 3, nome: 'Cidade', notas: '' },
    ];
    db.assuntos = [
        { id: 10, nome: 'Vida emocional', notas: '', temaIds: [1, 2] },
        { id: 11, nome: 'Urbano', notas: '', temaIds: [3] },
    ];
    const t = (id, temas, extra = {}) => ({
        id,
        titulo: `T${id}`,
        ano: 2020,
        temas,
        sinalizacoesTema: temas.map((e) => db.temas.find((x) => x.id === e.temaId).nome).join(', '),
        ...extra,
    });
    db.poemas = [
        t(1, [
            { temaId: 1, papel: 'principal' },
            { temaId: 2, papel: 'secundario' },
        ]),
        t(2, [{ temaId: 1, papel: 'principal' }]),
        t(3, [{ temaId: 1, papel: 'secundario' }]),
        t(4, [
            { temaId: 1, papel: '' },
            { temaId: 3, papel: 'principal' },
        ]),
        // O mesmo Assunto por dois Temas de papéis diferentes: conta uma vez, no papel mais forte.
        t(5, [
            { temaId: 1, papel: 'secundario' },
            { temaId: 2, papel: 'principal' },
        ]),
    ];
    db.prosas = [t(101, [{ temaId: 3, papel: 'secundario' }])];
}

const mapa = (r) => Object.fromEntries(r.labels.map((l, i) => [l, r.data[i]]));

describe('agregarPorPapel: Temas', () => {
    beforeEach(acervo);

    it('divide cada tema em principal, secundário e indefinido', () => {
        const r = E.agregarPorPapel({ base: 'tema' });
        const linha = (nome) => {
            const i = r.labels.indexOf(nome);
            return [r.principal[i], r.secundario[i], r.semPapel[i]];
        };
        assert.deepEqual(linha('Amor'), [2, 2, 1]);
        assert.deepEqual(linha('Mar'), [1, 1, 0]);
        assert.deepEqual(linha('Cidade'), [1, 1, 0]);
    });

    it('INVARIANTE: o total empilhado é a contagem antiga ("Todos"), tema a tema', () => {
        const antigo = E.agregarPorTema(['tema']); // papel 'todos' por padrão
        const novo = E.agregarPorPapel({ base: 'tema' });
        assert.deepEqual(mapa(novo), mapa(antigo));
        novo.labels.forEach((_, i) =>
            assert.equal(novo.principal[i] + novo.secundario[i] + novo.semPapel[i], novo.data[i]),
        );
    });

    it('ordena pelo total, do maior para o menor', () => {
        const { data } = E.agregarPorPapel({ base: 'tema' });
        assert.deepEqual(
            data,
            [...data].sort((a, b) => b - a),
        );
    });

    it('o mesmo tema duas vezes no texto conta uma vez, no papel mais forte', () => {
        db.poemas = [
            {
                id: 1,
                titulo: 'X',
                ano: 2020,
                temas: [
                    { temaId: 1, papel: 'secundario' },
                    { temaId: 1, papel: 'principal' },
                ],
            },
        ];
        db.prosas = [];
        const r = E.agregarPorPapel({ base: 'tema' });
        assert.deepEqual(r.labels, ['Amor']);
        assert.deepEqual([r.principal[0], r.secundario[0], r.semPapel[0]], [1, 0, 0]);
    });

    it('lê texto.temas por id: o espelho desatualizado não interfere', () => {
        db.poemas.forEach((p) => (p.sinalizacoesTema = 'Nome que não existe'));
        assert.deepEqual(mapa(E.agregarPorPapel({ base: 'tema' })), {
            Amor: 5,
            Mar: 2,
            Cidade: 2,
        });
    });

    it('respeita os filtros das Estatísticas (corpus/tipo): só poemas', () => {
        E.definirFiltrosCompartilhados({ tipo: 'poemas' });
        const r = E.agregarPorPapel({ base: 'tema' });
        assert.equal(r.data[r.labels.indexOf('Cidade')], 1);
        E.definirFiltrosCompartilhados({ tipo: 'todos' });
    });
});

describe('agregarPorPapel: Assuntos', () => {
    beforeEach(acervo);

    it('um Assunto com dois Temas no mesmo texto conta uma vez, no papel efetivo', () => {
        const r = E.agregarPorPapel({ base: 'assunto' });
        const i = r.labels.indexOf('Vida emocional');
        // T1 principal; T2 principal; T3 secundário; T4 indefinido; T5 principal (Mar principal vence Amor secundário)
        assert.deepEqual([r.principal[i], r.secundario[i], r.semPapel[i]], [3, 1, 1]);
        assert.equal(r.data[i], 5);
    });

    it('INVARIANTE: o total empilhado é a contagem antiga de Assuntos', () => {
        const antigo = E.agregarPorAssunto('todos');
        assert.deepEqual(mapa(E.agregarPorPapel({ base: 'assunto' })), mapa(antigo));
    });
});

describe('recortarPorPapel', () => {
    beforeEach(acervo);
    it('mantém a ordem e os vetores alinhados', () => {
        const r = E.agregarPorPapel({ base: 'tema' });
        const c = E.recortarPorPapel(r, ['Mar', 'Amor']);
        assert.deepEqual(c.labels, ['Mar', 'Amor']);
        assert.deepEqual(c.data, [2, 5]);
        assert.deepEqual(c.principal, [1, 2]);
    });
});

describe('ordenarRotulosPorPapel', () => {
    // Amor 2/2/1 (total 5), Mar 1/1/0 (2), Cidade 1/1/0 (2) e Luto 0/3/0 (3).
    function comLuto() {
        acervo();
        db.temas.push({ id: 4, nome: 'Luto', notas: '' });
        const luto = (id) => ({
            id,
            titulo: `L${id}`,
            ano: 2020,
            temas: [{ temaId: 4, papel: 'secundario' }],
        });
        db.poemas.push(luto(201), luto(202), luto(203));
    }
    beforeEach(comLuto);

    it('total mantém a ordem recebida (a ordem de sempre)', () => {
        const r = E.agregarPorPapel({ base: 'tema' });
        assert.deepEqual(r.labels, ['Amor', 'Luto', 'Mar', 'Cidade']);
        assert.deepEqual(E.ordenarRotulosPorPapel(r, r.labels, 'total'), r.labels);
        assert.deepEqual(E.ordenarRotulosPorPapel(r, r.labels, 'qualquer'), r.labels);
    });

    it('por secundários: mais secundários primeiro, mesmo com total menor', () => {
        const r = E.agregarPorPapel({ base: 'tema' });
        // Luto (3) à frente de Amor (2); Mar e Cidade empatam em 1 secundário e em
        // total, e o empate se resolve em ordem alfabética.
        assert.deepEqual(E.ordenarRotulosPorPapel(r, r.labels, 'secundario'), [
            'Luto',
            'Amor',
            'Cidade',
            'Mar',
        ]);
    });

    it('por principais: quem não tem principal vai para o fim', () => {
        const r = E.agregarPorPapel({ base: 'tema' });
        assert.deepEqual(E.ordenarRotulosPorPapel(r, r.labels, 'principal'), [
            'Amor',
            'Cidade',
            'Mar',
            'Luto',
        ]);
    });

    it('por indefinidos: só o Amor tem; os demais ficam por total e depois nome', () => {
        const r = E.agregarPorPapel({ base: 'tema' });
        assert.deepEqual(E.ordenarRotulosPorPapel(r, r.labels, 'semPapel'), [
            'Amor',
            'Luto',
            'Cidade',
            'Mar',
        ]);
    });

    it('só reordena os nomes recebidos (não traz de volta o que foi cortado ou ocultado)', () => {
        const r = E.agregarPorPapel({ base: 'tema' });
        assert.deepEqual(E.ordenarRotulosPorPapel(r, ['Mar', 'Luto'], 'secundario'), [
            'Luto',
            'Mar',
        ]);
    });
});

describe('preferência da ordem das barras', () => {
    beforeEach(acervo);
    it('padrão é total, guarda cada papel e ignora valor estranho', () => {
        assert.equal(E.getOrdemTemasAssuntos(), 'total');
        for (const o of ['principal', 'secundario', 'semPapel']) {
            E.definirOrdemTemasAssuntos(o);
            assert.equal(E.getOrdemTemasAssuntos(), o);
        }
        E.definirOrdemTemasAssuntos('qualquer');
        assert.equal(E.getOrdemTemasAssuntos(), 'total');
    });
});

describe('preferência do modo', () => {
    beforeEach(acervo);
    it('padrão é por tema, guarda por assunto e ignora valor estranho', () => {
        assert.equal(E.getModoTemasAssuntos(), 'tema');
        E.definirModoTemasAssuntos('assunto');
        assert.equal(E.getModoTemasAssuntos(), 'assunto');
        E.definirModoTemasAssuntos('qualquer');
        assert.equal(E.getModoTemasAssuntos(), 'tema');
    });
});

describe('tela Temas e Assuntos', () => {
    const graficos = {};
    let consultas;

    beforeEach(() => {
        acervo();
        document.body.innerHTML = `${SECAO}
            <section id="poemas" class="tab-content"><input id="busca-poemas" /></section>
            <section id="prosas" class="tab-content"><input id="busca-prosas" /></section>`;
        Object.keys(graficos).forEach((k) => delete graficos[k]);
        globalThis.Chart = class {
            static defaults = { plugins: { legend: { labels: { generateLabels: () => [] } } } };
            constructor(canvas, cfg) {
                this.data = cfg.data;
                this.cfg = cfg;
                graficos[canvas.id] = this;
            }
            destroy() {}
            getElementsAtEventForMode() {
                return [
                    {
                        index: globalThis.Chart.clique,
                        datasetIndex: globalThis.Chart.conjunto,
                    },
                ];
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

    const clicar = (indice, conjunto) => {
        globalThis.Chart.clique = indice;
        globalThis.Chart.conjunto = conjunto;
        document.getElementById('grafico-temas-assuntos').onclick({});
    };

    it('o gráfico é empilhado, com três conjuntos: principal, secundário e indefinido tracejado', () => {
        renderTemasAssuntos();
        const g = graficos['grafico-temas-assuntos'];
        assert.deepEqual(
            g.data.datasets.map((d) => d.label),
            ['Principal', 'Secundário', 'Indefinido'],
        );
        assert.equal(g.cfg.options.scales.x.stacked, true);
        assert.equal(g.cfg.options.scales.y.stacked, true);
        assert.equal(g.cfg.options.plugins.legend.display, true);
        // Só o indefinido tem contorno tracejado (a leitura não depende só da cor).
        assert.deepEqual(
            g.data.datasets.map((d) => Boolean(d.borderDash)),
            [false, false, true],
        );
        assert.ok(g.cfg.plugins.some((p) => p.id === 'contornoTracejado'));
    });

    it('os segmentos somam o total antigo, e os dois seletores de papel saíram do gráfico', () => {
        renderTemasAssuntos();
        const g = graficos['grafico-temas-assuntos'];
        const soma = (i) => g.data.datasets.reduce((acc, d) => acc + d.data[i], 0);
        const total = Object.fromEntries(g.data.labels.map((l, i) => [l, soma(i)]));
        assert.deepEqual(total, mapa(E.agregarPorTema(['tema'])));
        assert.ok(!document.getElementById('painel-papel-tema'));
        assert.ok(!document.getElementById('painel-papel-assunto'));
    });

    it('o botão Por tema / Por assunto troca o gráfico e o título', () => {
        renderTemasAssuntos();
        assert.match(document.getElementById('painel-modo-temas-assuntos').innerHTML, /Por tema/);
        assert.match(
            document.getElementById('painel-modo-temas-assuntos').innerHTML,
            /Por assunto/,
        );
        E.definirModoTemasAssuntos('assunto');
        renderTemasAssuntos();
        const g = graficos['grafico-temas-assuntos'];
        assert.deepEqual([...g.data.labels].sort(), ['Urbano', 'Vida emocional']);
        assert.equal(
            document.getElementById('titulo-temas-assuntos').textContent,
            'Assuntos mais frequentes',
        );
    });

    describe('tooltip: porção do papel e total da barra', () => {
        const itensDe = (g, i) =>
            g.data.datasets.map((ds, k) => ({ dataset: ds, raw: ds.data[i], datasetIndex: k }));

        it('vale para a barra inteira, sem exigir o mouse sobre o segmento', () => {
            renderTemasAssuntos();
            const { interaction } = graficos['grafico-temas-assuntos'].cfg.options;
            assert.equal(interaction.mode, 'index');
            assert.equal(interaction.intersect, false);
        });

        it('cada linha traz a porção do papel e o rodapé traz o total da barra', () => {
            renderTemasAssuntos();
            const g = graficos['grafico-temas-assuntos'];
            const { label, footer } = g.cfg.options.plugins.tooltip.callbacks;
            const i = g.data.labels.indexOf('Amor'); // principal 2, secundário 2, indefinido 1
            const itens = itensDe(g, i);
            assert.match(label(itens[1]), /^Secundário: 2 texto\(s\)/);
            assert.match(footer(itens.map((it) => ({ ...it, dataIndex: i }))), /: 5 texto\(s\)/);
        });

        it('o total da barra não depende de quantos segmentos o tooltip listou', () => {
            renderTemasAssuntos();
            const g = graficos['grafico-temas-assuntos'];
            const { footer } = g.cfg.options.plugins.tooltip.callbacks;
            const i = g.data.labels.indexOf('Amor');
            const soUm = [{ ...itensDe(g, i)[0], dataIndex: i }];
            assert.match(footer(soUm), /Total \(todos os papéis\): 5 texto\(s\)/);
        });
    });

    describe('ordenar por mais principais, secundários ou indefinidos', () => {
        function acervoComLuto() {
            db.temas.push({ id: 4, nome: 'Luto', notas: '' });
            db.poemas.push(
                ...[201, 202, 203].map((id) => ({
                    id,
                    titulo: `L${id}`,
                    ano: 2020,
                    temas: [{ temaId: 4, papel: 'secundario' }],
                })),
            );
        }

        it('por padrão a ordem é a do total e o título é o de sempre', () => {
            acervoComLuto();
            renderTemasAssuntos();
            assert.deepEqual(graficos['grafico-temas-assuntos'].data.labels, [
                'Amor',
                'Luto',
                'Mar',
                'Cidade',
            ]);
            assert.equal(
                document.getElementById('titulo-temas-assuntos').textContent,
                'Temas mais frequentes',
            );
        });

        it('os botões aparecem, com o ativo marcado, e chamam definirOrdemTemasAssuntos', () => {
            renderTemasAssuntos();
            const html = document.getElementById('painel-ordem-temas-assuntos').innerHTML;
            for (const rotulo of ['Total', 'Principais', 'Secundários', 'Indefinidos'])
                assert.match(html, new RegExp(rotulo));
            for (const v of ['total', 'principal', 'secundario', 'semPapel'])
                assert.match(html, new RegExp(`definirOrdemTemasAssuntos\\('${v}'\\)`));
            assert.equal((html.match(/bg-blue-600/g) || []).length, 1, 'só o ativo');
        });

        it('secundários: reordena as barras, mantém os dados de cada tema e muda o título', () => {
            acervoComLuto();
            E.definirOrdemTemasAssuntos('secundario');
            renderTemasAssuntos();
            const g = graficos['grafico-temas-assuntos'];
            assert.deepEqual(g.data.labels, ['Luto', 'Amor', 'Cidade', 'Mar']);
            const linha = (nome) => {
                const i = g.data.labels.indexOf(nome);
                return g.data.datasets.map((d) => d.data[i]);
            };
            assert.deepEqual(linha('Luto'), [0, 3, 0]);
            assert.deepEqual(linha('Amor'), [2, 2, 1]);
            assert.equal(
                document.getElementById('titulo-temas-assuntos').textContent,
                'Temas com mais secundários',
            );
        });

        it('no modo Assuntos o título acompanha', () => {
            E.definirModoTemasAssuntos('assunto');
            E.definirOrdemTemasAssuntos('principal');
            renderTemasAssuntos();
            assert.equal(
                document.getElementById('titulo-temas-assuntos').textContent,
                'Assuntos com mais principais',
            );
        });

        it('a ordem vale antes do Top 12: entra quem tem mais do papel, não só do total', () => {
            acervoComLuto();
            // 12 temas com 4 principais cada: no total ocupam o Top 12 e deixam o Luto de fora.
            for (let n = 1; n <= 12; n++) {
                const id = 100 + n;
                db.temas.push({ id, nome: `F${String(n).padStart(2, '0')}`, notas: '' });
                for (let k = 0; k < 4; k++)
                    db.poemas.push({
                        id: id * 10 + k,
                        titulo: `F${n}-${k}`,
                        ano: 2020,
                        temas: [{ temaId: id, papel: 'principal' }],
                    });
            }
            renderTemasAssuntos();
            const porTotal = [...graficos['grafico-temas-assuntos'].data.labels];
            assert.equal(porTotal.length, 12);
            assert.ok(!porTotal.includes('Luto'), 'Luto (total 3) fica fora do Top 12 por total');

            E.definirOrdemTemasAssuntos('secundario');
            renderTemasAssuntos();
            const porSecundario = graficos['grafico-temas-assuntos'].data.labels;
            assert.equal(porSecundario.length, 12);
            assert.equal(porSecundario[0], 'Luto');
            assert.equal(porSecundario[1], 'Amor');
        });

        it('o clique no segmento continua abrindo a lista do papel certo na nova ordem', () => {
            acervoComLuto();
            E.definirOrdemTemasAssuntos('secundario');
            renderTemasAssuntos();
            clicar(0, 1); // Luto, Secundário
            assert.equal(consultas.length, 1);
            assert.ok(consultas[0].startsWith('temasecundario:'), consultas[0]);
            assert.match(consultas[0], /Luto/);
        });
    });

    it('o corte por mínimo vale para o total e usa a chave temas', () => {
        E.definirMinimoAparicoes('temas', 3);
        renderTemasAssuntos();
        assert.deepEqual(graficos['grafico-temas-assuntos'].data.labels, ['Amor']);
    });

    it('Ocultar tira o tema do gráfico (chave temas)', () => {
        E.toggleOcultoItem('temas', 'Amor');
        renderTemasAssuntos();
        assert.ok(!graficos['grafico-temas-assuntos'].data.labels.includes('Amor'));
    });

    describe('clique no segmento: a lista aberta tem o mesmo número do segmento', () => {
        const PREFIXO_TEMA = ['temaprincipal', 'temasecundario', 'temasempapel'];
        const PREFIXO_ASSUNTO = ['assuntoprincipal', 'assuntosecundario', 'assuntoindefinido'];

        function conferirTodos(modo, prefixos) {
            E.definirModoTemasAssuntos(modo);
            renderTemasAssuntos();
            const g = graficos['grafico-temas-assuntos'];
            const itens = [...db.poemas, ...db.prosas].map((i) => decorarCamposBusca({ ...i }));
            let conferidos = 0;
            g.data.labels.forEach((label, i) => {
                g.data.datasets.forEach((ds, k) => {
                    if (!ds.data[i]) return;
                    consultas.length = 0;
                    clicar(i, k);
                    assert.equal(consultas.length, 1, `${label}/${k}`);
                    assert.ok(consultas[0].startsWith(`${prefixos[k]}:`), consultas[0]);
                    assert.equal(
                        filtrarTextos(itens, consultas[0]).length,
                        ds.data[i],
                        `${label} (${ds.label}) → ${consultas[0]}`,
                    );
                    conferidos++;
                });
            });
            assert.ok(conferidos >= 4, 'conferiu poucos segmentos');
        }

        it('Temas', () => conferirTodos('tema', PREFIXO_TEMA));
        it('Assuntos', () => conferirTodos('assunto', PREFIXO_ASSUNTO));
    });
});

describe('HTML da aba', () => {
    it('um cartão só, com o botão de modo e sem seletores de papel; o do tema fica no tempo', () => {
        assert.ok(SECAO.includes('id="painel-modo-temas-assuntos"'));
        assert.ok(SECAO.includes('id="painel-ordem-temas-assuntos"'));
        assert.ok(SECAO.includes('id="painel-papel-tema-tempo"'));
        assert.ok(!SECAO.includes('id="grafico-assuntos"'));
        assert.ok(!SECAO.includes('painel-papel-assunto'));
        assert.ok(HTML.includes('id="painel-papel-tema-cruzamentos"'));
    });
});
