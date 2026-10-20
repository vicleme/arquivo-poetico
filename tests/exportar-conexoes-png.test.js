// Desenho do relatório de Conexões (.png): montagem do SVG e limites do canvas.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
    montarSvgRelatorio,
    calcularEscalaExport,
    PALETA_RELATORIO,
} from '../js/exportar-conexoes-png.js';

// Medida falsa: 6 px por caractere, sempre igual, para o teste não depender de canvas.
const medir = (t) => String(t).length * 6;

const par = (a, b, ra = 'Resposta a', rb = 'Respondido em') => ({
    ids: [1, 2],
    tamanho: 2,
    arestas: [
        { aId: 1, aTitulo: a, bId: 2, bTitulo: b, rotulo: ra },
        { aId: 2, aTitulo: b, bId: 1, bTitulo: a, rotulo: rb },
    ],
});

const buraco = { deId: 3, deTitulo: 'C', paraId: 4, paraTitulo: 'D', rotulo: 'Reescrita de' };

function diagrama(largura = 500, altura = 120) {
    return {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${largura}" height="${altura}"><g id="marca-diagrama"></g></svg>`,
        largura,
        altura,
    };
}

const grafo = { nos: [], arestas: [{}, {}], camadas: [], linear: false };

function dimensoes(svg) {
    const m = svg.match(/^<svg [^>]*width="(\d+)" height="(\d+)"/);
    return { largura: Number(m[1]), altura: Number(m[2]) };
}

describe('montarSvgRelatorio', () => {
    it('"tudo" desenha título, resumo, as três seções e o diagrama dos Ecos', () => {
        const dados = { buracos: [buraco], clusters: [par('A', 'B')], grafos: [grafo] };
        const r = montarSvgRelatorio({
            dados,
            escopo: 'tudo',
            paleta: PALETA_RELATORIO.claro,
            medir,
            diagramasEcos: [diagrama()],
        });
        assert.match(r.svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
        assert.ok(r.svg.endsWith('</svg>'));
        for (const trecho of [
            '>Conexões<',
            'Buracos (Elos com só um lado cadastrado)',
            'Elos (pares e clusters)',
            'Ecos (cadeias e grafos)',
            '(falta o vínculo de volta)',
            'id="marca-diagrama"',
            '>PAR<',
            '>↔<',
        ]) {
            assert.ok(r.svg.includes(trecho), `faltou: ${trecho}`);
        }
    });

    it('o tamanho do SVG bate com o que a função devolve e cobre o desenho todo', () => {
        const dados = { buracos: [], clusters: [par('A', 'B')], grafos: [grafo] };
        const r = montarSvgRelatorio({
            dados,
            escopo: 'tudo',
            medir,
            diagramasEcos: [diagrama(500, 120)],
        });
        assert.deepEqual(dimensoes(r.svg), { largura: r.largura, altura: r.altura });
        assert.ok(r.largura >= 760);
        assert.ok(r.altura > 120 + 28);
    });

    it('"elos" não leva Ecos e "ecos" não leva Elos nem Buracos', () => {
        const dados = { buracos: [buraco], clusters: [par('A', 'B')], grafos: [grafo] };
        const elos = montarSvgRelatorio({ dados, escopo: 'elos', medir, diagramasEcos: [] });
        assert.ok(elos.svg.includes('>Conexões: Elos<'));
        assert.ok(!elos.svg.includes('Ecos (cadeias e grafos)'));
        const ecos = montarSvgRelatorio({
            dados,
            escopo: 'ecos',
            medir,
            diagramasEcos: [diagrama()],
        });
        assert.ok(ecos.svg.includes('>Conexões: Ecos<'));
        assert.ok(!ecos.svg.includes('Elos (pares e clusters)'));
        assert.ok(!ecos.svg.includes('Buracos'));
    });

    it('seções vazias avisam, e o relatório ainda sai', () => {
        const r = montarSvgRelatorio({
            dados: { buracos: [], clusters: [], grafos: [] },
            escopo: 'tudo',
            medir,
        });
        assert.ok(r.svg.includes('Nenhum buraco: todo Elo registrado tem os dois lados.'));
        assert.ok(r.svg.includes('Nenhum Elo cadastrado ainda.'));
        assert.ok(r.svg.includes('Nenhum Eco cadastrado ainda.'));
        assert.ok(r.altura > 0);
    });

    it('diagrama mais largo que o mínimo alarga o relatório', () => {
        const r = montarSvgRelatorio({
            dados: { grafos: [grafo] },
            escopo: 'ecos',
            medir,
            diagramasEcos: [diagrama(1200, 100)],
        });
        assert.ok(r.largura >= 1200);
    });

    it('escapa caracteres especiais dos títulos', () => {
        const r = montarSvgRelatorio({
            dados: { clusters: [par('Pão & "Vinho"', '<B>')] },
            escopo: 'elos',
            medir,
        });
        assert.ok(r.svg.includes('Pão &amp; &quot;Vinho&quot;'));
        assert.ok(r.svg.includes('&lt;B&gt;'));
        assert.ok(!r.svg.includes('<B>'));
    });

    it('título longo não deixa o cartão sem altura: a linha quebra em duas', () => {
        const curto = montarSvgRelatorio({
            dados: { clusters: [par('A', 'B')] },
            escopo: 'elos',
            medir,
        });
        const longo = montarSvgRelatorio({
            dados: { clusters: [par('T'.repeat(60), 'U'.repeat(60))] },
            escopo: 'elos',
            medir,
        });
        assert.ok(longo.altura > curto.altura);
        assert.ok(longo.svg.includes('…'), 'o título que não cabe é cortado com reticências');
    });

    it('título vazio vira "(sem título)"', () => {
        const r = montarSvgRelatorio({
            dados: { clusters: [par('', 'B')] },
            escopo: 'elos',
            medir,
        });
        assert.ok(r.svg.includes('(sem título)'));
    });

    it('cluster de 3 ou mais poemas leva o tamanho no rótulo do cartão', () => {
        const cluster = { ids: [1, 2, 3], tamanho: 3, arestas: par('X', 'Y').arestas };
        const r = montarSvgRelatorio({ dados: { clusters: [cluster] }, escopo: 'elos', medir });
        assert.ok(r.svg.includes('CLUSTER (3 POEMAS)'));
    });

    it('usa as cores da paleta escolhida e o fundo do tema', () => {
        const dados = { clusters: [par('A', 'B')] };
        const claro = montarSvgRelatorio({
            dados,
            escopo: 'elos',
            paleta: PALETA_RELATORIO.claro,
            medir,
        });
        const escuro = montarSvgRelatorio({
            dados,
            escopo: 'elos',
            paleta: PALETA_RELATORIO.escuro,
            medir,
        });
        assert.ok(claro.svg.includes(`fill="${PALETA_RELATORIO.claro.fundo}"`));
        assert.ok(escuro.svg.includes(`fill="${PALETA_RELATORIO.escuro.fundo}"`));
        assert.ok(!escuro.svg.includes(PALETA_RELATORIO.claro.badgeEloFundo));
    });

    it('dois pares ficam lado a lado, e o terceiro desce', () => {
        const um = montarSvgRelatorio({
            dados: { clusters: [par('A', 'B')] },
            escopo: 'elos',
            medir,
        });
        const dois = montarSvgRelatorio({
            dados: { clusters: [par('A', 'B'), par('C', 'D')] },
            escopo: 'elos',
            medir,
        });
        const tres = montarSvgRelatorio({
            dados: { clusters: [par('A', 'B'), par('C', 'D'), par('E', 'F')] },
            escopo: 'elos',
            medir,
        });
        assert.equal(dois.altura, um.altura);
        assert.ok(tres.altura > dois.altura);
    });

    it('não usa travessão nos textos', () => {
        const r = montarSvgRelatorio({
            dados: { buracos: [buraco], clusters: [par('A', 'B')], grafos: [grafo] },
            escopo: 'tudo',
            medir,
            diagramasEcos: [diagrama()],
        });
        assert.ok(!r.svg.includes('—'));
    });
});

describe('montarSvgRelatorio: pontos de quebra para o PDF', () => {
    const dados = {
        buracos: [buraco],
        clusters: [par('A', 'B'), par('C', 'D'), par('E', 'F'), par('G', 'H'), par('I', 'J')],
        grafos: [grafo, grafo],
    };
    const r = montarSvgRelatorio({
        dados,
        escopo: 'tudo',
        medir,
        diagramasEcos: [diagrama(500, 120), diagrama(500, 120)],
    });

    it('devolve quebras dentro do desenho, em ordem crescente', () => {
        assert.ok(r.quebras.length > 0);
        assert.ok(r.quebras.every((q) => q > 0 && q < r.altura));
        assert.deepEqual(
            [...r.quebras].sort((a, b) => a - b),
            r.quebras,
        );
    });

    it('há quebra antes de cada seção, entre as fileiras de cartões e entre os diagramas', () => {
        // 3 seções + 2 quebras entre as 3 fileiras de pares + 1 entre os 2 diagramas
        assert.equal(r.quebras.length, 3 + 2 + 1);
    });

    it('não há quebra entre o título de uma seção e o primeiro bloco dela', () => {
        // Entre duas quebras consecutivas sempre cabe um bloco inteiro (título + conteúdo)
        // ou uma fileira de cartões: nenhuma quebra encosta no título da seção.
        const gaps = r.quebras.slice(1).map((q, i) => q - r.quebras[i]);
        assert.ok(gaps.every((g) => g > 40));
    });

    it('escopo "elos" não leva quebras de Ecos', () => {
        const so = montarSvgRelatorio({ dados, escopo: 'elos', medir });
        assert.equal(so.quebras.length, 2 + 2);
    });
});

describe('calcularEscalaExport', () => {
    it('imagem pequena sai em 2x', () => {
        assert.equal(calcularEscalaExport(800, 600), 2);
    });

    it('imagem comprida reduz a escala para caber no canvas', () => {
        const escala = calcularEscalaExport(800, 6000);
        assert.ok(escala < 2 && escala >= 0.5);
        assert.ok(800 * escala * 6000 * escala <= 16_000_000 + 1);
    });

    it('imagem enorme (menos de 0,5x) é recusada', () => {
        assert.equal(calcularEscalaExport(800, 100000), null);
    });

    it('medidas inválidas são recusadas', () => {
        assert.equal(calcularEscalaExport(0, 100), null);
        assert.equal(calcularEscalaExport(NaN, 100), null);
    });
});

describe('seletor de formato na aba', () => {
    it('o index.html oferece .md, .png e .pdf', () => {
        const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
        const bloco = html.slice(html.indexOf('id="conexoes-baixar-formato"'));
        const fim = bloco.indexOf('</select>');
        assert.match(bloco.slice(0, fim), /value="md"[\s\S]*value="png"[\s\S]*value="pdf"/);
    });
});
