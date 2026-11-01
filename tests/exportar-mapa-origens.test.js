import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { montarDadosDoMapa } from '../js/mapa-origens.js';
import {
    PALETA_MAPA_ORIGENS,
    desenhosPorPais,
    montarSvgMapaOrigens,
    resumoDoMapaExportado,
    sufixoDoMapa,
} from '../js/exportar-mapa-origens.js';
import { planejarPdf } from '../js/exportar-conexoes-pdf.js';

// Medida falsa: 6 px por caractere, para o teste não depender de canvas.
const medir = (t) => String(t).length * 6;

const ref = (id) => ({ tipo: 'poema', id });
const item = (rotulo, ...ids) => ({ rotulo, chave: rotulo.toLowerCase(), ids, textos: ids.length });
const dados = montarDadosDoMapa({
    itens: [
        item('Grécia', ref(1), ref(2), ref(3)),
        item('Portugal', ref(4)),
        item('Desconhecida', ref(5)),
        item('Roma Antiga', ref(6), ref(7)),
    ],
    comEntradas: 8,
    comOrigem: 7,
    semOrigem: 1,
});
const mapa = {
    vista: [0, 0, 1000, 450],
    paises: [
        { id: '300', nome: 'Greece', d: 'M10 10L20 10L20 20Z' },
        { id: '620', nome: 'Portugal', d: 'M30 10L40 10L40 20Z' },
        { id: '076', nome: 'Brazil', d: 'M50 10L60 10L60 20Z' },
    ],
};

describe('montarSvgMapaOrigens', () => {
    it('devolve svg, tamanho e quebras, com título, resumo e países', () => {
        const r = montarSvgMapaOrigens({ mapa, dados, medir });
        assert.ok(r.svg.startsWith('<svg'));
        assert.equal(r.largura, 1000);
        assert.ok(r.altura > 450);
        assert.ok(r.svg.includes('Textos por origem da obra'));
        assert.ok(r.svg.includes('4 textos no mapa'));
        assert.ok(r.svg.includes('Grécia'));
        assert.ok(r.quebras.length >= 2);
        assert.ok(r.quebras.every((q) => q > 0 && q < r.altura));
    });

    it('pinta cada desenho: com texto colorido, sem texto cinza', () => {
        const { svg } = montarSvgMapaOrigens({ mapa, dados, medir });
        const cor = (d) => svg.match(new RegExp(`d="${d}" fill="(#[0-9a-f]{6})"`))[1];
        assert.notEqual(cor('M10 10L20 10L20 20Z'), cor('M50 10L60 10L60 20Z'));
        assert.equal(cor('M50 10L60 10L60 20Z'), '#e5e7eb');
    });

    it('lista Desconhecida e as origens sem lugar, sem sumir com nada', () => {
        const { svg } = montarSvgMapaOrigens({ mapa, dados, medir });
        assert.ok(svg.includes('Sem lugar no mapa (3 textos)'));
        assert.ok(svg.includes('Desconhecida (1)'));
        assert.ok(svg.includes('Roma Antiga (2)'));
    });

    it('com vista enquadrada, o mapa usa a vista e a imagem muda de altura', () => {
        const todo = montarSvgMapaOrigens({ mapa, dados, medir });
        const vista = { x: 0, y: 0, w: 250, h: 225 };
        const perto = montarSvgMapaOrigens({ mapa, dados, medir, vista });
        assert.ok(perto.svg.includes('viewBox="0 0 250 225"'));
        assert.notEqual(perto.altura, todo.altura);
    });

    it('o tema escuro troca o fundo', () => {
        const claro = montarSvgMapaOrigens({ mapa, dados, medir });
        const escuro = montarSvgMapaOrigens({ mapa, dados, medir, escuro: true });
        assert.ok(claro.svg.includes(`fill="${PALETA_MAPA_ORIGENS.claro.fundo}"`));
        assert.ok(escuro.svg.includes(`fill="${PALETA_MAPA_ORIGENS.escuro.fundo}"`));
    });

    it('escapa o filtro e não quebra sem países', () => {
        const vazio = montarDadosDoMapa({ itens: [], comEntradas: 0, comOrigem: 0, semOrigem: 0 });
        const r = montarSvgMapaOrigens({ mapa, dados: vazio, medir, filtro: 'a <b> & c' });
        assert.ok(r.svg.includes('a &lt;b&gt; &amp; c'));
        assert.ok(!r.svg.includes('Textos por país'));
    });

    it('serve ao plano de páginas do PDF', () => {
        const r = montarSvgMapaOrigens({ mapa, dados, medir });
        const plano = planejarPdf(r);
        assert.ok(plano.paginas.length >= 1);
        assert.equal(plano.paginas[plano.paginas.length - 1].ate, r.altura);
    });
});

describe('auxiliares', () => {
    it('sufixo e resumo', () => {
        assert.equal(sufixoDoMapa(false), '');
        assert.equal(sufixoDoMapa(true), '-enquadrado');
        assert.equal(resumoDoMapaExportado(dados), '4 textos no mapa · 2 países');
    });

    it('desenhosPorPais liga o desenho ao país do app', () => {
        const m = desenhosPorPais(dados);
        assert.equal(m.get('300').nome, 'Grécia');
        assert.equal(m.get('076'), undefined);
    });
});
