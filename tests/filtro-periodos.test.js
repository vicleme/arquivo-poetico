import './helpers/localstorage-shim.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { filtrarPeriodosPorData, periodoTemData, faixaDePeriodo } from '../js/utils.js';

const p = (nome, inicio, fim) => ({ nome, inicio, fim });
const nomes = (itens) => itens.map((i) => i.nome);

const itens = [
    p('Guerra', { ano: 1939 }, { ano: 1945 }),
    p('Iluminismo', { ano: 1715 }, { ano: 1789 }),
    p('Pandemia', { ano: 2020 }, null),
    p('Só fim', null, { ano: 1900 }),
    p('Sem data A', null, null),
    p('Sem data B', { dia: null, mes: null, ano: null }, {}),
];

describe('periodoTemData / faixaDePeriodo (o que conta como "sem data")', () => {
    it('sem data = nem início nem fim com qualquer parte preenchida', () => {
        assert.equal(periodoTemData(p('x', null, null)), false);
        assert.equal(periodoTemData(p('x', { dia: null, mes: null, ano: null }, {})), false);
        assert.equal(periodoTemData(p('x', undefined, undefined)), false);
    });

    it('só início ou só fim já é datado (faixa aberta do outro lado)', () => {
        assert.equal(periodoTemData(p('x', { ano: 2020 }, null)), true);
        assert.equal(periodoTemData(p('x', null, { ano: 1900 })), true);
        assert.equal(faixaDePeriodo(p('x', { ano: 2020 }, null))[1], 99991231);
        assert.equal(faixaDePeriodo(p('x', null, { ano: 1900 }))[0], 0);
    });

    it('Movimento/Escola aceita década e século nas pontas', () => {
        const m = p('Modernismo', { decada: 1920 }, { seculo: 'XX' });
        assert.equal(
            periodoTemData(m),
            false,
            'sem a opção de movimento, década/século não contam',
        );
        assert.equal(periodoTemData(m, { movimento: true }), true);
        const [ini, fim] = faixaDePeriodo(m, { movimento: true });
        assert.equal(ini, 19200101);
        assert.equal(fim, 20001231, 'fim em século = último ano do século aproximado');
    });
});

describe('filtrarPeriodosPorData (De/Até + tratamento dos sem data)', () => {
    const vazio = { de: {}, ate: {} };

    it('modo "todos" sem intervalo mostra tudo', () => {
        assert.equal(
            filtrarPeriodosPorData(itens, { intervalo: vazio, modoData: 'todos' }).length,
            6,
        );
    });

    it('modo "com-data" esconde só os sem data', () => {
        const r = filtrarPeriodosPorData(itens, { intervalo: vazio, modoData: 'com-data' });
        assert.deepEqual(nomes(r), ['Guerra', 'Iluminismo', 'Pandemia', 'Só fim']);
    });

    it('modo "sem-data" mostra só os sem data', () => {
        const r = filtrarPeriodosPorData(itens, { intervalo: vazio, modoData: 'sem-data' });
        assert.deepEqual(nomes(r), ['Sem data A', 'Sem data B']);
    });

    it('intervalo é de sobreposição: período longo não some ao filtrar uma janela dentro dele', () => {
        const r = filtrarPeriodosPorData(itens, {
            intervalo: { de: { ano: 1750 }, ate: { ano: 1760 } },
            modoData: 'com-data',
        });
        assert.deepEqual(nomes(r), ['Iluminismo', 'Só fim']);
    });

    it('período com fim em aberto sobrepõe qualquer janela posterior ao início', () => {
        const r = filtrarPeriodosPorData(itens, {
            intervalo: { de: { ano: 2024 }, ate: {} },
            modoData: 'com-data',
        });
        assert.deepEqual(nomes(r), ['Pandemia']);
    });

    it('com intervalo e modo "todos", os sem data continuam visíveis (só os datados são recortados)', () => {
        const r = filtrarPeriodosPorData(itens, {
            intervalo: { de: { ano: 1940 }, ate: { ano: 1944 } },
            modoData: 'todos',
        });
        assert.deepEqual(nomes(r), ['Guerra', 'Sem data A', 'Sem data B']);
    });

    it('modo "sem-data" ignora o intervalo (item sem data não satisfaz intervalo)', () => {
        const r = filtrarPeriodosPorData(itens, {
            intervalo: { de: { ano: 1940 }, ate: { ano: 1944 } },
            modoData: 'sem-data',
        });
        assert.deepEqual(nomes(r), ['Sem data A', 'Sem data B']);
    });

    it('datas parciais: filtrar por ano encontra período cadastrado só com o ano', () => {
        const r = filtrarPeriodosPorData([p('X', { ano: 1945 }, null)], {
            intervalo: { de: { mes: 6, ano: 1945 }, ate: { mes: 6, ano: 1945 } },
            modoData: 'com-data',
        });
        assert.equal(r.length, 1);
    });
});
