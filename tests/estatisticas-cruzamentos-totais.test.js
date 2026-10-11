import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Fase 1, etapa 1d: soma no fim da coluna e total por linha na matriz de
// Cruzamentos. A soma conta PARES texto × linha (um texto com 3 pessoas e 1 tema
// soma 3); "Textos com..." conta cada texto uma vez.
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
    const nomeTema = (ids) => ids.map((id) => db.temas.find((t) => t.id === id).nome).join(', ');
    const t = (id, temas, pessoas) => ({
        id,
        titulo: `T${id}`,
        ano: 2020,
        temas: tm(...temas),
        sinalizacoesTema: nomeTema(temas),
        pessoas: ps(...pessoas),
    });
    db.poemas = [
        t(1, [1], [1, 2, 3]), // 1 tema, 3 pessoas
        t(2, [1, 2], [1]), // 2 temas, 1 pessoa
        t(3, [2], []), // tema sem pessoa: fora da matriz
        t(4, [], [2]), // pessoa sem tema: fora da matriz
    ];
    db.prosas = [];
}

const soma = (v) => v.reduce((a, b) => a + b, 0);

describe('1d: dados da matriz', () => {
    beforeEach(acervo);

    it('um texto com 3 pessoas e 1 tema dá soma 3 e textos 1', () => {
        const r = E.coocorrenciaTemasPessoas({
            temas: ['Amor'],
            pessoas: ['Ana', 'Bia', 'Caio'],
        });
        // Amor: texto 1 (3 pessoas) e texto 2 (Ana) = 4 pares, 2 textos.
        assert.equal(soma(r.valores.map((l) => l[0])), 4);
        assert.deepEqual(r.textosPorTema, [2]);
    });

    it('soma da coluna = soma das células; soma da linha = soma das células da linha', () => {
        const r = E.coocorrenciaTemasPessoas({
            temas: ['Amor', 'Mar'],
            pessoas: ['Ana', 'Bia', 'Caio'],
        });
        const ana = r.valores[r.pessoas.indexOf('Ana')];
        assert.deepEqual(ana, [2, 1]);
        assert.equal(soma(ana), 3);
        const colunaAmor = r.valores.map((l) => l[0]);
        assert.equal(soma(colunaAmor), 4);
    });

    it('textos por linha e por tema contam cada texto uma vez e só dentro da matriz', () => {
        const r = E.coocorrenciaTemasPessoas({
            temas: ['Amor', 'Mar'],
            pessoas: ['Ana', 'Bia', 'Caio'],
        });
        // Ana: textos 1 e 2 (2 textos, mas 3 pares). Bia: só o 1 (o 4 não tem tema).
        assert.equal(r.textosPorLinha[r.pessoas.indexOf('Ana')], 2);
        assert.equal(r.textosPorLinha[r.pessoas.indexOf('Bia')], 1);
        assert.equal(r.textosPorLinha[r.pessoas.indexOf('Caio')], 1);
        // Mar: o texto 3 não tem pessoa, então só o texto 2 entra.
        assert.deepEqual(r.textosPorTema, [2, 1]);
        assert.equal(r.totalTextos, 2);
    });

    it('respeita as colunas escolhidas', () => {
        const r = E.coocorrenciaTemasPessoas({ temas: ['Mar'], pessoas: ['Ana', 'Bia', 'Caio'] });
        assert.deepEqual(r.textosPorTema, [1]);
        assert.equal(r.totalTextos, 1);
        assert.equal(r.textosPorLinha[r.pessoas.indexOf('Ana')], 1);
    });

    it('Grupos: o subgrupo repica para o pai e a soma da linha segue contando pares', () => {
        const r = E.coocorrenciaTemasGrupos({
            temas: ['Amor', 'Mar'],
            grupos: ['Família', 'Filhos'],
        });
        const familia = r.valores[r.grupos.indexOf('Família')];
        const filhos = r.valores[r.grupos.indexOf('Filhos')];
        assert.deepEqual(familia, [2, 1]); // cada grupo conta uma vez por texto
        assert.deepEqual(filhos, [2, 1]);
        assert.equal(r.textosPorLinha[r.grupos.indexOf('Família')], 2);
        assert.deepEqual(r.textosPorTema, [2, 1]);
    });

    it('Personagens segue o mesmo formato', () => {
        const r = E.coocorrenciaTemasPersonagens({ temas: ['Amor'], personagens: [] });
        assert.ok(Array.isArray(r.textosPorTema));
        assert.ok(Array.isArray(r.textosPorLinha));
        assert.equal(r.textosPorLinha.length, r.personagens.length);
    });
});

describe('1d: a tela', () => {
    beforeEach(() => {
        acervo();
        document.body.innerHTML = SECAO;
        globalThis.Chart = class {
            destroy() {}
            static getChart() {}
        };
    });
    const tabela = () => document.getElementById('tabela-coocorrencia');
    const textoLinhas = () =>
        [...tabela().querySelectorAll('tr')].map((tr) =>
            [...tr.children].map((c) => c.textContent.trim()),
        );

    it('Pessoas: coluna final, rodapé de soma e rodapé de textos', () => {
        renderCruzamentos();
        const linhas = textoLinhas();
        const cab = linhas[0];
        assert.ok(cab.includes('Total (soma da linha)'));
        assert.ok(cab.includes('Textos com a pessoa'));
        const ana = linhas.find((l) => l[0] === 'Ana');
        // Amor 2, Mar 1, total 3, textos 2.
        assert.deepEqual(ana.slice(1), ['2', '1', '3', '2']);
        const somaCol = linhas.find((l) => l[0] === 'Aparições de pessoas (soma da coluna)');
        assert.deepEqual(somaCol.slice(1), ['4', '1', '5', '']);
        const textos = linhas.find((l) => l[0] === 'Textos com o tema');
        assert.deepEqual(textos.slice(1), ['2', '1', '', '']);
        assert.match(tabela().innerHTML, /pares texto × tema/);
    });

    it('Grupos: só "Textos com o tema" no rodapé, sem soma da coluna', () => {
        document.getElementById('est-coocorrencia-modo').value = 'grupos';
        renderCruzamentos();
        const linhas = textoLinhas();
        assert.ok(!linhas.some((l) => /soma da coluna/.test(l[0])));
        assert.ok(linhas.some((l) => l[0] === 'Textos com o tema'));
        assert.ok(linhas[0].includes('Textos com o grupo'));
        assert.ok(linhas[0].includes('Total (soma da linha)'));
        assert.match(tabela().innerHTML, /mesma pessoa contaria mais de uma vez/);
    });

    it('a soma de cada coluna do rodapé bate com as células e o total geral fecha', () => {
        renderCruzamentos();
        const linhas = textoLinhas();
        const dados = linhas.filter(
            (l) => !['Total (soma da linha)'].some((x) => l.includes(x)) && /^[A-Z]/.test(l[0]),
        );
        const pessoas = dados.filter((l) => ['Ana', 'Bia', 'Caio'].includes(l[0]));
        const colunas = [0, 1].map((j) => soma(pessoas.map((l) => Number(l[1 + j]) || 0)));
        const somaCol = linhas.find((l) => l[0] === 'Aparições de pessoas (soma da coluna)');
        assert.deepEqual(somaCol.slice(1, 3).map(Number), colunas);
        assert.equal(Number(somaCol[3]), soma(colunas));
        assert.equal(soma(pessoas.map((l) => Number(l[3]))), soma(colunas));
    });

    it('o rodapé tem borda superior e negrito', () => {
        renderCruzamentos();
        const rodape = tabela().querySelector('tfoot').innerHTML;
        assert.match(rodape, /border-t-2/);
        assert.match(rodape, /font-bold/);
        assert.match(rodape, /dark:border-slate-600/);
    });
});
