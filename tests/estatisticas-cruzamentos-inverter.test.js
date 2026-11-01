import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Inverter linhas e colunas na matriz de Cruzamentos.
const { db } = await import('../js/db.js');
const E = await import('../js/estatisticas.js');
const { renderCruzamentos } = await import('../js/estatisticas-tela-cruzamentos.js');

const HTML = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const SECAO = HTML.match(/<section id="estatisticas-cruzamentos"[\s\S]*?<\/section>/)[0];

function acervo() {
    localStorage.clear();
    ['livros', 'partes', 'secoes', 'elementos', 'epocas', 'autores'].forEach((c) => (db[c] = []));
    db.assuntos = [];
    db.temas = [
        { id: 1, nome: 'Amor', notas: '' },
        { id: 2, nome: 'Mar', notas: '' },
    ];
    db.grupos = [
        { id: 10, nome: 'Família', paiId: null },
        { id: 11, nome: 'Filhos', paiId: 10 },
    ];
    db.pessoas = [
        { id: 1, nome: 'Ana', grupoIds: [11] },
        { id: 2, nome: 'Bia', grupoIds: [11] },
        { id: 3, nome: 'Caio', grupoIds: [10] },
    ];
    const ps = (...ids) => ids.map((pessoaId) => ({ pessoaId, papeis: [] }));
    const tm = (...ids) => ids.map((temaId) => ({ temaId, papel: 'principal' }));
    const nomes = (ids) => ids.map((id) => db.temas.find((t) => t.id === id).nome).join(', ');
    const t = (id, temas, pessoas) => ({
        id,
        titulo: `T${id}`,
        ano: 2020,
        temas: tm(...temas),
        sinalizacoesTema: nomes(temas),
        pessoas: ps(...pessoas),
    });
    db.poemas = [t(1, [1], [1, 2, 3]), t(2, [1, 2], [1])];
    db.prosas = [];
}

describe('inverter linhas e colunas', () => {
    beforeEach(() => {
        acervo();
        document.body.innerHTML = SECAO;
        globalThis.Chart = class {
            destroy() {}
            static getChart() {}
        };
    });
    const linhas = () =>
        [...document.querySelectorAll('#tabela-coocorrencia tr')].map((tr) =>
            [...tr.children].map((c) => c.textContent.trim()),
        );

    it('por padrão as linhas são pessoas e o botão existe desligado', () => {
        renderCruzamentos();
        assert.equal(E.getInverterCoocorrencia(), false);
        assert.ok(document.querySelector('#painel-inverter-coocorrencia button'));
        assert.equal(linhas()[0][0], 'Pessoa × tema');
    });

    it('invertida, as linhas são os temas e as colunas são as pessoas', () => {
        E.definirInverterCoocorrencia(true);
        renderCruzamentos();
        const l = linhas();
        assert.equal(l[0][0], 'Tema × pessoa');
        assert.deepEqual(l[0].slice(1, 4), ['Ana', 'Bia', 'Caio']);
        const amor = l.find((x) => x[0] === 'Amor');
        // Ana 2, Bia 1, Caio 1; soma da linha 4; textos com o tema 2.
        assert.deepEqual(amor.slice(1), ['2', '1', '1', '4', '2']);
        const mar = l.find((x) => x[0] === 'Mar');
        assert.deepEqual(mar.slice(1), ['1', '—', '—', '1', '1']);
    });

    it('rodapé: soma da coluna por pessoa e textos com a pessoa', () => {
        E.definirInverterCoocorrencia(true);
        renderCruzamentos();
        const l = linhas();
        const soma = l.find((x) => x[0] === 'Total (soma da coluna)');
        assert.deepEqual(soma.slice(1), ['3', '1', '1', '5', '']);
        const textos = l.find((x) => x[0] === 'Textos com a pessoa');
        assert.deepEqual(textos.slice(1, 4), ['2', '1', '1']);
    });

    it('Grupos invertido: sem soma da linha (subgrupo contaria em dobro)', () => {
        E.definirInverterCoocorrencia(true);
        document.getElementById('est-coocorrencia-modo').value = 'grupos';
        renderCruzamentos();
        const l = linhas();
        assert.equal(l[0][0], 'Tema × grupo');
        assert.ok(!l[0].includes('Total (soma da linha)'));
        assert.ok(l[0].includes('Textos com o tema'));
        assert.match(document.getElementById('tabela-coocorrencia').innerHTML, /soma da linha/);
    });

    it('desligar volta à matriz normal', () => {
        E.definirInverterCoocorrencia(true);
        E.definirInverterCoocorrencia(false);
        renderCruzamentos();
        assert.equal(linhas()[0][0], 'Pessoa × tema');
    });
});
