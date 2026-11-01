import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    dadosDosGraficos,
    graficoContraste,
    graficoIncomodou,
    graficoPesoPorFaixa,
    graficoResposta,
    rotuloComN,
} from '../js/leitura-avaliativa-graficos.js';
import { calcularPadrao } from '../js/leitura-avaliativa-padrao.js';
import { ITENS_INCOMODOU, ITENS_PEGOU } from '../js/leitura-avaliativa.js';

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

const duasFaixas = () =>
    calcularPadrao([
        leitura({ escolhido: 5, pegou: [{ item: 'voz', peso: 'centro' }], releria: 'sim' }),
        leitura({ escolhido: 4.5, pegou: [{ item: 'voz', peso: 'leve' }], releria: 'sim' }),
        leitura({
            escolhido: 1,
            pegou: [{ item: 'imagem', peso: 'forte' }],
            incomodou: ['cliche', 'frouxo'],
            releria: 'nao',
            mostraria: 'talvez',
        }),
    ]);

describe('contraste', () => {
    it('leva os 13 itens do maior para o menor, com o n das duas faixas', () => {
        const g = graficoContraste(duasFaixas());
        assert.equal(g.disponivel, true);
        assert.equal(g.rotulos.length, ITENS_PEGOU.length);
        assert.equal(g.valores.length, ITENS_PEGOU.length);
        assert.equal(g.itens[0], 'voz');
        assert.equal(g.valores[0], 2); // (3 + 1) / 2 = 2, contra 0 na baixa
        assert.equal(g.itens.at(-1), 'imagem');
        assert.equal(g.valores.at(-1), -2);
        assert.equal(g.nAlta, 2);
        assert.equal(g.nBaixa, 1);
        for (let i = 1; i < g.valores.length; i += 1) assert.ok(g.valores[i - 1] >= g.valores[i]);
    });

    it('sem uma das faixas não desenha e diz o que falta', () => {
        const so = calcularPadrao([leitura({ escolhido: 5 })]);
        const g = graficoContraste(so);
        assert.equal(g.disponivel, false);
        assert.match(g.motivo, /faixa baixa/);
        assert.doesNotMatch(g.motivo, /faixa alta/);
        assert.deepEqual(g.valores, []);
        const nenhuma = graficoContraste(calcularPadrao([]));
        assert.match(nenhuma.motivo, /faixa alta e a faixa baixa/);
    });
});

describe('peso por faixa', () => {
    it('uma série por faixa com texto, 13 valores cada, e o n escrito no rótulo', () => {
        const g = graficoPesoPorFaixa(duasFaixas());
        assert.equal(g.disponivel, true);
        assert.deepEqual(
            g.series.map((s) => s.faixa),
            ['baixa', 'alta'],
        );
        const alta = g.series.find((s) => s.faixa === 'alta');
        assert.equal(alta.valores.length, ITENS_PEGOU.length);
        assert.equal(alta.valores[g.itens.indexOf('voz')], 2);
        assert.equal(alta.n, 2);
        assert.equal(alta.rotuloComN, '4 a 5 corações (n = 2)');
    });

    it('faixa sem nenhum texto é omitida, nunca vira zero', () => {
        const g = graficoPesoPorFaixa(duasFaixas());
        assert.deepEqual(g.omitidas, ['media']);
        assert.equal(
            g.series.some((s) => s.faixa === 'media'),
            false,
        );
    });

    it('sem nenhum texto, não há gráfico', () => {
        const g = graficoPesoPorFaixa(calcularPadrao([]));
        assert.equal(g.disponivel, false);
        assert.deepEqual(g.series, []);
        assert.deepEqual(g.omitidas, ['baixa', 'media', 'alta']);
    });
});

describe('o que incomodou em proporção da faixa', () => {
    it('dá a proporção da faixa e a legenda "x de n"', () => {
        const g = graficoIncomodou(duasFaixas());
        assert.equal(g.rotulos.length, ITENS_INCOMODOU.length);
        const baixa = g.series.find((s) => s.faixa === 'baixa');
        const i = g.itens.indexOf('cliche');
        assert.equal(baixa.valores[i], 100);
        assert.equal(baixa.legendas[i], '1 de 1');
        const alta = g.series.find((s) => s.faixa === 'alta');
        assert.equal(alta.valores[i], 0);
        assert.equal(alta.legendas[i], '0 de 2');
    });

    it('a proporção corrige o tamanho diferente das faixas (1 de 4 é 25%, não igual a 1 de 1)', () => {
        const p = calcularPadrao([
            leitura({ escolhido: 5, incomodou: ['cliche'] }),
            leitura({ escolhido: 5 }),
            leitura({ escolhido: 5 }),
            leitura({ escolhido: 5 }),
            leitura({ escolhido: 1, incomodou: ['cliche'] }),
        ]);
        const g = graficoIncomodou(p);
        const i = g.itens.indexOf('cliche');
        assert.equal(g.series.find((s) => s.faixa === 'alta').valores[i], 25);
        assert.equal(g.series.find((s) => s.faixa === 'baixa').valores[i], 100);
    });

    it('arredonda a uma casa', () => {
        const p = calcularPadrao([
            leitura({ escolhido: 5, incomodou: ['cliche'] }),
            leitura({ escolhido: 5 }),
            leitura({ escolhido: 5 }),
        ]);
        const g = graficoIncomodou(p);
        assert.equal(g.series[0].valores[g.itens.indexOf('cliche')], 33.3);
    });
});

describe('releria e mostraria', () => {
    it('percentuais de Sim, Talvez e Não sobre quem respondeu', () => {
        const g = graficoResposta(duasFaixas(), 'releria');
        assert.deepEqual(
            g.respostas.map((r) => r.id),
            ['sim', 'talvez', 'nao'],
        );
        const alta = g.faixas.find((f) => f.faixa === 'alta');
        assert.deepEqual(alta.contagens, [2, 0, 0]);
        assert.deepEqual(alta.percentuais, [100, 0, 0]);
        const baixa = g.faixas.find((f) => f.faixa === 'baixa');
        assert.deepEqual(baixa.percentuais, [0, 0, 100]);
        assert.match(baixa.rotuloComN, /n = 1, 1 resposta\)/);
        assert.match(alta.rotuloComN, /n = 2, 2 respostas\)/);
    });

    it('faixa com texto mas sem resposta sai do gráfico e é listada à parte', () => {
        const g = graficoResposta(duasFaixas(), 'mostraria');
        assert.deepEqual(
            g.faixas.map((f) => f.faixa),
            ['baixa'],
        );
        assert.deepEqual(g.semResposta, ['alta']);
        assert.equal(g.faixas[0].percentuais[1], 100);
    });

    it('sem nenhuma resposta, não há gráfico', () => {
        const g = graficoResposta(calcularPadrao([leitura({ escolhido: 5 })]), 'releria');
        assert.equal(g.disponivel, false);
        assert.deepEqual(g.faixas, []);
    });
});

describe('conjunto dos gráficos', () => {
    it('junta os quatro na ordem da tela, com os avisos', () => {
        const d = dadosDosGraficos(duasFaixas());
        assert.deepEqual(Object.keys(d).slice(4, 9), [
            'contraste',
            'pesoPorFaixa',
            'incomodou',
            'releria',
            'mostraria',
        ]);
        assert.equal(d.totalTextos, 3);
        assert.equal(d.totalComCoracoes, 3);
        assert.equal(d.poucos, true);
        assert.equal(d.divergencias, 0);
    });

    it('padrão vazio ou ausente não quebra', () => {
        assert.equal(dadosDosGraficos(undefined).poucos, true);
        assert.equal(dadosDosGraficos(calcularPadrao([])).contraste.disponivel, false);
    });

    it('rotuloComN escreve o n da faixa', () => {
        assert.equal(rotuloComN({ rotulo: '0,5 a 2 corações', n: 4 }), '0,5 a 2 corações (n = 4)');
    });
});
