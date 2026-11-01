import './helpers/dom-real.js';

import fs from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Marca "sorteável" do texto (entrega 3a): o campo, os dois modais, o salvar e
// o preencher, as saídas (.md, .csv, .json, Ver) e o pacote de texto.
const { ehSorteavel, definirSorteavel } = await import('../js/sorteavel.js');
const { db } = await import('../js/db.js');
const { montarRegistro } = await import('../js/exportar.js');
const { gerarCsvTextos } = await import('../js/exportar-csv.js');
const { gerarMarkdownItem } = await import('../js/exportar-md.js');
const { renderVisualizacaoHtml } = await import('../js/visualizar.js');

const ler = (rel) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');

describe('ehSorteavel e definirSorteavel', () => {
    it('só `true` conta; ausente, false e outros valores não', () => {
        assert.equal(ehSorteavel({ sorteavel: true }), true);
        for (const v of [undefined, false, 'true', 1, null]) {
            assert.equal(ehSorteavel({ sorteavel: v }), false);
        }
        assert.equal(ehSorteavel(null), false);
        assert.equal(ehSorteavel({}), false);
    });
    it('definir liga e desliga, grava false (não apaga) e diz se mudou', () => {
        const t = {};
        assert.equal(definirSorteavel(t, true), true);
        assert.equal(t.sorteavel, true);
        assert.equal(definirSorteavel(t, true), false);
        assert.equal(definirSorteavel(t, false), true);
        assert.equal(t.sorteavel, false);
        assert.equal(definirSorteavel({ sorteavel: false }, false), false);
        assert.equal(definirSorteavel(null, true), false);
    });
    it('texto antigo sem o campo, ao receber false, só ganha o campo (não "mudou")', () => {
        const t = { titulo: 'velho' };
        assert.equal(definirSorteavel(t, false), false);
        assert.equal(t.sorteavel, false);
    });
});

describe('modais e formulário', () => {
    for (const [arq, pref] of [
        ['../modais/modal-poema.html', 'p'],
        ['../modais/modal-prosa.html', 'pr'],
    ]) {
        it(`${arq}: checkbox ${pref}-sorteavel, desligado por padrão e no grupo de Status`, () => {
            const html = ler(arq);
            const m = html.match(new RegExp(`<input[^>]*id="${pref}-sorteavel"[^>]*>`));
            assert.ok(m, 'checkbox ausente');
            assert.ok(/type="checkbox"/.test(m[0]));
            assert.ok(!/checked/.test(m[0]));
            const grupo = html.indexOf('<summary>Status e Pendências</summary>');
            assert.ok(grupo > 0 && html.indexOf(`id="${pref}-sorteavel"`) > grupo);
        });
    }
    it('forms.js lê e preenche a marca nos dois formulários', () => {
        const forms = ler('../js/forms.js');
        for (const pref of ['p', 'pr']) {
            assert.ok(
                forms.includes(
                    `sorteavel: document.getElementById('${pref}-sorteavel')?.checked === true`,
                ),
            );
            assert.ok(forms.includes(`sorteavel: '${pref}-sorteavel'`));
        }
    });
});

const poema = (extra = {}) => ({
    id: 1,
    titulo: 'Teste',
    texto: 'verso',
    status: 'publicado',
    ...extra,
});

describe('saídas', () => {
    db.livros = [];
    db.partes = [];
    db.secoes = [];
    db.autores = [];
    db.itensColetanea = [];

    it('.json: o registro leva a marca (spread do item)', () => {
        assert.equal(montarRegistro('poema', poema({ sorteavel: true })).sorteavel, true);
        assert.equal(montarRegistro('poema', poema()).sorteavel, undefined);
    });
    it('.md e Ver: linha "Sorteio de leitura" só quando marcado', () => {
        const on = montarRegistro('poema', poema({ sorteavel: true }));
        const off = montarRegistro('poema', poema({ sorteavel: false }));
        assert.match(gerarMarkdownItem(on), /Sorteio de leitura\n\nPode ser sorteado/);
        assert.doesNotMatch(gerarMarkdownItem(off), /Sorteio de leitura/);
        assert.match(renderVisualizacaoHtml(on), /Sorteio de leitura/);
        assert.doesNotMatch(renderVisualizacaoHtml(off), /Sorteio de leitura/);
    });
    it('.csv: coluna `sorteavel` com "sim" ou vazio', () => {
        db.poemas = [
            poema({ id: 1, sorteavel: true }),
            poema({ id: 2 }),
            poema({ id: 3, sorteavel: false }),
        ];
        db.prosas = [];
        const regs = db.poemas.map((p) => montarRegistro('poema', p));
        const csv = gerarCsvTextos('poema', regs, db);
        const limpo = csv.charCodeAt(0) === 0xfeff ? csv.slice(1) : csv;
        const [cab, ...linhas] = limpo.trim().split(/\r?\n/);
        const i = cab.split(',').indexOf('sorteavel');
        assert.ok(i >= 0, 'coluna sorteavel ausente');
        assert.deepEqual(
            linhas.map((l) => l.split(',')[i]),
            ['sim', '', ''],
        );
    });
});
