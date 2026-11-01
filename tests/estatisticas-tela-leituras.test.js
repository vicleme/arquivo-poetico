import './helpers/localstorage-shim.js';
import './helpers/dom-shim.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Aba "Leituras" das Estatísticas, vista Padrão (Fase 22, entrega 4c): recorte,
// textos de apoio e configurações do Chart.js. O desenho fica para o navegador.

const {
    COR_FAIXA,
    COR_NEGATIVO,
    COR_POSITIVO,
    alturaDoGrafico,
    configContraste,
    configIncomodou,
    configPesoPorFaixa,
    configResposta,
    escolherCategoriaLeituras,
    escolherMedidaLeituras,
    escolherVistaLeituras,
    estadoLeituras,
    fundoDaCelula,
    htmlDaTabelaCruzamento,
    leiturasDoRecorte,
    padraoDoRecorte,
    textoDaResposta,
    textoDasFaixas,
    textoDoAviso,
    textoDoContraste,
} = await import('../js/estatisticas-tela-leituras.js');
const { dadosDosGraficos } = await import('../js/leitura-avaliativa-graficos.js');
const { calcularCruzamento } = await import('../js/leitura-avaliativa-cruzamento.js');
const { garantirEtiqueta } = await import('../js/etiquetas.js');
const { atribuirEtiquetasAoCluster, criarCluster } = await import('../js/tag-clusters.js');
const { calcularPadrao } = await import('../js/leitura-avaliativa-padrao.js');

const HTML = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

let seq = 0;
const leitura = (extra = {}) => ({
    id: ++seq,
    textoId: seq,
    tipo: 'poema',
    data: '2026-11-01',
    pegou: [],
    incomodou: [],
    releria: null,
    mostraria: null,
    sugerido: null,
    escolhido: 4,
    ...extra,
});

const dados = (leituras) => dadosDosGraficos(calcularPadrao(leituras));

describe('recorte pelos filtros das Estatísticas', () => {
    it('só entram as leituras de textos que passam nos filtros', () => {
        const a = { id: 1, autoclassificacao: 5 };
        const b = { id: 2, autoclassificacao: 1 };
        const c = { id: 3 };
        const dbRef = {
            poemas: [a, b],
            prosas: [c],
            leituras: [
                leitura({ textoId: 1 }),
                leitura({ textoId: 2 }),
                leitura({ textoId: 3, tipo: 'prosa' }),
                leitura({ textoId: 99 }),
            ],
        };
        assert.equal(leiturasDoRecorte(dbRef, [a, c]).length, 2);
        assert.equal(leiturasDoRecorte(dbRef, []).length, 0);
        assert.equal(leiturasDoRecorte({}, [a]).length, 0);
    });

    it('a faixa vem da Classificação atual do texto (F22-D19)', () => {
        const a = { id: 1, autoclassificacao: 5 };
        const b = { id: 2, autoclassificacao: 1 };
        const dbRef = {
            poemas: [a, b],
            prosas: [],
            leituras: [
                leitura({ textoId: 1, escolhido: null }),
                leitura({ textoId: 2, escolhido: 5 }),
            ],
        };
        const p = padraoDoRecorte(dbRef, [a, b]);
        assert.equal(p.faixas.find((f) => f.id === 'alta').n, 1);
        assert.equal(p.faixas.find((f) => f.id === 'baixa').n, 1);
    });
});

describe('textos de apoio', () => {
    it('sem leituras, diz que ainda não há', () => {
        assert.match(textoDoAviso(dados([])), /Ainda não há leituras/);
    });

    it('diz quantos entram, quantos ficam de fora e avisa dos poucos', () => {
        const t = textoDoAviso(dados([leitura({ escolhido: 5 }), leitura({ escolhido: null })]));
        assert.match(t, /1 texto entra nas faixas, de 2 lidos\./);
        assert.match(t, /1 texto fica de fora/);
        assert.match(t, /Poucos textos com corações/);
    });

    it('as faixas escrevem o n e explicam a faixa omitida', () => {
        const t = textoDasFaixas(dados([leitura({ escolhido: 5 }), leitura({ escolhido: 1 })]));
        assert.match(t, /0,5 a 2 corações: 1 texto/);
        assert.match(t, /4 a 5 corações: 1 texto/);
        assert.match(t, /não há texto/);
        assert.equal(textoDasFaixas(dados([])), '');
    });

    it('o contraste explica a leitura ou diz o que falta', () => {
        const ok = dados([leitura({ escolhido: 5 }), leitura({ escolhido: 1 })]);
        assert.match(textoDoContraste(ok.contraste), /faixa alta \(n = 1\).*baixa \(n = 1\)/);
        assert.match(textoDoContraste(dados([leitura()]).contraste), /Falta a faixa baixa/);
    });

    it('releria e mostraria: sem resposta ou com faixa de fora', () => {
        const d = dados([leitura({ escolhido: 5, releria: 'sim' }), leitura({ escolhido: 1 })]);
        assert.match(textoDaResposta(d.releria), /Faixas sem resposta ficam de fora \(1\)/);
        assert.match(textoDaResposta(d.mostraria), /Ninguém respondeu/);
    });
});

describe('configurações do Chart.js', () => {
    const d = dados([
        leitura({
            escolhido: 5,
            pegou: [{ item: 'voz', peso: 'centro' }],
            releria: 'sim',
            incomodou: ['cliche'],
        }),
        leitura({ escolhido: 1, pegou: [{ item: 'imagem', peso: 'forte' }], releria: 'nao' }),
    ]);

    it('contraste: barras horizontais, positivo e negativo em cores diferentes, sem legenda', () => {
        const c = configContraste(d.contraste);
        assert.equal(c.options.indexAxis, 'y');
        assert.equal(c.options.plugins.legend.display, false);
        const cores = c.data.datasets[0].backgroundColor;
        assert.equal(cores[0], COR_POSITIVO);
        assert.equal(cores.at(-1), COR_NEGATIVO);
        assert.equal(c.data.labels.length, d.contraste.valores.length);
    });

    it('peso por faixa: uma série por faixa com texto, o n no rótulo, escala de 0 a 3', () => {
        const c = configPesoPorFaixa(d.pesoPorFaixa);
        assert.deepEqual(
            c.data.datasets.map((s) => s.label),
            ['0,5 a 2 corações (n = 1)', '4 a 5 corações (n = 1)'],
        );
        assert.equal(c.data.datasets[1].backgroundColor, COR_FAIXA.alta);
        assert.equal(c.options.scales.x.max, 3);
        assert.equal(c.options.scales.x.beginAtZero, true);
    });

    it('incomodou: escala de 0 a 100 e balão com "x de n"', () => {
        const c = configIncomodou(d.incomodou);
        assert.equal(c.options.scales.x.max, 100);
        const i = d.incomodou.itens.indexOf('cliche');
        const altaIdx = d.incomodou.series.findIndex((s) => s.faixa === 'alta');
        const texto = c.options.plugins.tooltip.callbacks.label({
            dataset: c.data.datasets[altaIdx],
            raw: c.data.datasets[altaIdx].data[i],
            datasetIndex: altaIdx,
            dataIndex: i,
        });
        assert.match(texto, /100% \(1 de 1\)/);
    });

    it('releria: barras empilhadas até 100% com Sim, Talvez e Não', () => {
        const c = configResposta(d.releria);
        assert.equal(c.options.scales.x.stacked, true);
        assert.equal(c.options.scales.x.max, 100);
        assert.deepEqual(
            c.data.datasets.map((s) => s.label),
            ['Sim', 'Talvez', 'Não'],
        );
        assert.equal(c.data.labels.length, d.releria.faixas.length);
        const texto = c.options.plugins.tooltip.callbacks.label({
            dataset: c.data.datasets[0],
            raw: 100,
            datasetIndex: 0,
            dataIndex: 1,
        });
        assert.match(texto, /Sim: 100% \(1 de 1\)/);
    });

    it('modo escuro muda a cor dos textos e da grade', () => {
        const claro = configPesoPorFaixa(d.pesoPorFaixa, false).options.scales.x.ticks.color;
        const escuro = configPesoPorFaixa(d.pesoPorFaixa, true).options.scales.x.ticks.color;
        assert.notEqual(claro, escuro);
    });

    it('a altura cresce com itens e séries e tem um mínimo', () => {
        assert.ok(alturaDoGrafico(13, 3) > alturaDoGrafico(13, 1));
        assert.ok(alturaDoGrafico(13, 1) > alturaDoGrafico(5, 1));
        assert.equal(alturaDoGrafico(0, 0), 120);
    });
});

describe('ligação no app', () => {
    it('a seção, o botão e os canvases existem no HTML', () => {
        assert.ok(HTML.includes('<section id="estatisticas-leituras"'));
        assert.ok(HTML.includes('id="btn-estatisticas-leituras"'));
        for (const id of [
            'grafico-leituras-contraste',
            'grafico-leituras-peso',
            'grafico-leituras-incomodou',
            'grafico-leituras-releria',
            'grafico-leituras-mostraria',
            'est-leituras-aviso',
            'est-leituras-faixas',
        ]) {
            assert.ok(HTML.includes(`id="${id}"`), id);
        }
    });

    it('o despachante das Estatísticas importa, desenha e redesenha a aba', () => {
        const src = readFileSync(new URL('../js/estatisticas.js', import.meta.url), 'utf8');
        assert.ok(src.includes("from './estatisticas-tela-leituras.js'"));
        assert.ok(src.includes('renderLeituras();'));
        assert.ok(src.includes("'estatisticas-leituras'"));
    });
});

describe('vista Cruzamento com etiquetas (entrega 4d-2)', () => {
    const montar = () => {
        const dbRef = { etiquetas: [], tagClusters: [], poemas: [], prosas: [] };
        const melan = garantirEtiqueta(dbRef, 'tom', 'Melancólico');
        const sombrio = criarCluster(dbRef, 'Sombrio <b', 'tom').cluster;
        atribuirEtiquetasAoCluster(dbRef, [melan], sombrio.id);
        dbRef.poemas.push({ id: 1, sinalizacoesTom: [melan] });
        return { dbRef, sombrio };
    };

    it('a tabela traz o cluster como botão que abre, com o n e o "x de n"', () => {
        const { dbRef, sombrio } = montar();
        const dados = calcularCruzamento(
            [leitura({ textoId: 1, pegou: [{ item: 'voz', peso: 'centro' }] })],
            dbRef,
        );
        const html = htmlDaTabelaCruzamento(dados);
        assert.ok(html.includes(`onclick="leiturasAbrirCluster('${sombrio.id}')"`));
        assert.ok(html.includes('n = 1'));
        assert.ok(html.includes('indício'));
        assert.ok(html.includes('1 de 1'));
        assert.ok(html.includes('Sombrio &lt;b'));
        assert.ok(!html.includes('Sombrio <b'));
    });

    it('no detalhe (abrir: false) o cabeçalho não tem botão', () => {
        const { dbRef } = montar();
        const dados = calcularCruzamento([leitura({ textoId: 1 })], dbRef);
        assert.ok(
            !htmlDaTabelaCruzamento(dados, { abrir: false }).includes('leiturasAbrirCluster'),
        );
    });

    it('sem colunas não desenha tabela', () => {
        const { dbRef } = montar();
        assert.equal(htmlDaTabelaCruzamento(calcularCruzamento([], dbRef)), '');
    });

    it('o fundo da célula tem cor só de nível 1 a 4, e cada medida tem a sua', () => {
        assert.equal(fundoDaCelula(0, 'pegou'), '');
        assert.match(fundoDaCelula(1, 'pegou'), /13,148,136/);
        assert.match(fundoDaCelula(4, 'incomodou'), /217,119,6/);
        assert.equal(fundoDaCelula(9, 'pegou'), fundoDaCelula(4, 'pegou'));
    });

    it('as escolhas normalizam valores desconhecidos e fechar o cluster acompanha a categoria', () => {
        escolherVistaLeituras('cruzamento');
        assert.equal(estadoLeituras().vista, 'cruzamento');
        escolherVistaLeituras('x');
        assert.equal(estadoLeituras().vista, 'padrao');
        escolherCategoriaLeituras('estilo');
        assert.equal(estadoLeituras().categoria, 'estilo');
        escolherCategoriaLeituras('x');
        assert.equal(estadoLeituras().categoria, 'tom');
        escolherMedidaLeituras('incomodou');
        assert.equal(estadoLeituras().medida, 'incomodou');
        assert.equal(estadoLeituras().clusterAberto, null);
    });

    it('o HTML tem a vista, os seletores e os dois botões, e a Padrão fica dentro da sua caixa', () => {
        [
            'est-leituras-vista-padrao',
            'est-leituras-vista-cruzamento',
            'est-leituras-btn-vista-padrao',
            'est-leituras-btn-vista-cruzamento',
            'est-leituras-cruz-categoria',
            'est-leituras-cruz-medida',
            'est-leituras-cruz-aviso',
            'est-leituras-cruz-tabela',
            'est-leituras-cruz-detalhe',
        ].forEach((id) => assert.ok(HTML.includes(`id="${id}"`), id));
        const a = HTML.indexOf('id="est-leituras-vista-padrao"');
        const b = HTML.indexOf('id="est-leituras-vista-cruzamento"');
        assert.ok(a < HTML.indexOf('id="grafico-leituras-contraste"'));
        assert.ok(HTML.indexOf('id="grafico-leituras-mostraria"') < b);
    });
});
