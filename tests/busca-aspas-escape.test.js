import './helpers/dom-real.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { parseConsultaBusca, escaparAspasBusca } = await import('../js/utils.js');

const termos = (q) => parseConsultaBusca(q).gruposIncluir.flat();

describe('escape de aspas na busca', () => {
    it('escaparAspasBusca escapa aspas e barras', () => {
        assert.equal(escaparAspasBusca('"Na verdade, tem sim"'), '\\"Na verdade, tem sim\\"');
        assert.equal(escaparAspasBusca('a\\b'), 'a\\\\b');
        assert.equal(escaparAspasBusca('Faculdade'), 'Faculdade');
    });

    it('o período com aspas no nome vira um termo só', () => {
        const [t] = termos('epoca:"\\"Na verdade, tem sim\\""');
        assert.equal(t.campo, '_buscaEpoca');
        assert.equal(t.termo, '"Na verdade, tem sim"');
        assert.equal(termos('epoca:"\\"Na verdade, tem sim\\""').length, 1);
    });

    it('aspa só no começo, só no fim e no meio', () => {
        assert.equal(termos('titulo:"\\"abre"')[0].termo, '"abre');
        assert.equal(termos('titulo:"fecha\\""')[0].termo, 'fecha"');
        assert.equal(termos('titulo:"um \\"meio\\" dois"')[0].termo, 'um "meio" dois');
    });

    it('barra literal e ida e volta com escaparAspasBusca', () => {
        for (const nome of ['a\\b', '"x"', 'termina\\', 'sem nada']) {
            const [t] = termos(`epoca:"${escaparAspasBusca(nome)}"`);
            assert.equal(t.termo, nome);
        }
    });

    it('continua funcionando sem escape, com exclusão e com ou', () => {
        assert.equal(termos('epoca:"Faculdade"')[0].termo, 'Faculdade');
        assert.equal(termos('"beira do mar"')[0].termo, 'beira do mar');
        const r = parseConsultaBusca('-epoca:"A \\"B\\"" x ou y');
        assert.equal(r.termosExcluir[0].termo, 'A "B"');
        assert.equal(r.gruposIncluir.length, 2);
    });

    it('termo sem aspas não trata a barra como especial', () => {
        assert.equal(termos('a\\b')[0].termo, 'a\\b');
    });
});
