import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    corDoPais,
    corDoPaisVazio,
    degrausDaLegenda,
    intensidade,
    usarEscalaLog,
} from '../js/mapa-escala.js';
import {
    ZOOM_MAXIMO,
    centralizarEm,
    deslocarVista,
    enquadrar,
    nivelDeZoom,
    pontoDaMiniatura,
    retanguloNaMiniatura,
    zoomNoPonto,
} from '../js/mapa-zoom.js';

const BASE = { x: 0, y: -2, w: 1000, h: 447 };

describe('mapa-escala', () => {
    it('país sem texto fica cinza, nos dois temas', () => {
        assert.equal(corDoPais(0, 10), corDoPaisVazio(false));
        assert.equal(corDoPais(0, 10, { escuro: true }), corDoPaisVazio(true));
        assert.notEqual(corDoPaisVazio(false), corDoPaisVazio(true));
    });

    it('mais textos dá cor mais escura no claro e mais clara no escuro', () => {
        const soma = (hex) => parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16);
        assert.ok(soma(corDoPais(10, 10)) < soma(corDoPais(1, 10)));
        assert.ok(
            soma(corDoPais(10, 10, { escuro: true })) > soma(corDoPais(1, 10, { escuro: true })),
        );
    });

    it('intensidade fica entre 0 e 1 e a log suaviza o topo', () => {
        assert.equal(intensidade(0, 10), 0);
        assert.equal(intensidade(10, 10), 1);
        assert.ok(intensidade(2, 100, true) > intensidade(2, 100, false));
        assert.equal(intensidade(5, 0), 0);
    });

    it('usa escala log só quando um país destoa muito', () => {
        const p = (...n) => n.map((textos) => ({ textos }));
        assert.equal(usarEscalaLog(p(3, 4, 5)), false);
        assert.equal(usarEscalaLog(p(1, 1, 2, 3, 60)), true);
        assert.equal(usarEscalaLog(p(1, 1, 2, 3, 8)), false);
        assert.equal(usarEscalaLog([]), false);
    });

    it('legenda tem 1 e o máximo, em ordem', () => {
        const g = degrausDaLegenda(40, { log: true });
        assert.equal(g[0].textos, 1);
        assert.equal(g[g.length - 1].textos, 40);
        assert.deepEqual(
            g.map((d) => d.textos),
            [...g.map((d) => d.textos)].sort((a, b) => a - b),
        );
        assert.deepEqual(degrausDaLegenda(0), []);
        assert.deepEqual(
            degrausDaLegenda(1).map((d) => d.textos),
            [1],
        );
    });
});

describe('mapa-zoom', () => {
    it('aproximar mantém o ponto sob o cursor parado', () => {
        const ponto = { x: 600, y: 100 };
        const v = zoomNoPonto(BASE, BASE, 4, ponto);
        assert.equal(nivelDeZoom(v, BASE), 4);
        assert.ok(ponto.x >= v.x && ponto.x <= v.x + v.w);
        assert.ok(ponto.y >= v.y && ponto.y <= v.y + v.h);
        const antes = (ponto.x - BASE.x) / BASE.w;
        const depois = (ponto.x - v.x) / v.w;
        assert.ok(Math.abs(antes - depois) < 1e-9);
    });

    it('não afasta além do mundo inteiro nem aproxima além do máximo', () => {
        assert.equal(nivelDeZoom(zoomNoPonto(BASE, BASE, 0.1, { x: 1, y: 1 }), BASE), 1);
        assert.equal(nivelDeZoom(zoomNoPonto(BASE, BASE, 1e6, { x: 1, y: 1 }), BASE), ZOOM_MAXIMO);
    });

    it('arrastar nunca sai da base', () => {
        const v = zoomNoPonto(BASE, BASE, 4, { x: 500, y: 200 });
        const longe = deslocarVista(v, BASE, 1e5, -1e5);
        assert.ok(longe.x + longe.w <= BASE.x + BASE.w + 1e-9);
        assert.ok(longe.y >= BASE.y - 1e-9);
        assert.deepEqual(deslocarVista(BASE, BASE, 50, 50), BASE);
    });

    it('enquadra uma caixa pequena, com zoom e centro certos', () => {
        const caixa = { x: 480, y: 100, w: 10, h: 8 };
        const v = enquadrar(BASE, caixa);
        assert.ok(nivelDeZoom(v, BASE) > 1);
        assert.ok(caixa.x >= v.x && caixa.x + caixa.w <= v.x + v.w);
    });

    it('a miniatura traduz a vista em frações e o clique em ponto', () => {
        assert.deepEqual(retanguloNaMiniatura(BASE, BASE), { x: 0, y: 0, w: 1, h: 1 });
        const v = zoomNoPonto(BASE, BASE, 2, { x: 500, y: 200 });
        const r = retanguloNaMiniatura(v, BASE);
        assert.equal(r.w, 0.5);
        const ponto = pontoDaMiniatura(BASE, 0.5, 0.5);
        assert.deepEqual(ponto, { x: 500, y: BASE.y + BASE.h / 2 });
        const c = centralizarEm(v, BASE, ponto);
        assert.ok(Math.abs(c.x + c.w / 2 - 500) < 1e-9);
    });
});
