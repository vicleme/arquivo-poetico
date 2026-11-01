import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Cruzamentos: clicar no cabeçalho de uma coluna ordena as linhas da matriz.
const { db } = await import('../js/db.js');
const E = await import('../js/estatisticas.js');
const F = await import('../js/estatisticas-filtros.js');
const { renderCruzamentos } = await import('../js/estatisticas-tela-cruzamentos.js');

const HTML = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const SECAO = HTML.match(/<section id="estatisticas-cruzamentos"[\s\S]*?<\/section>/)[0];

function acervo() {
    localStorage.clear();
    ['livros', 'partes', 'secoes', 'elementos', 'epocas', 'autores', 'grupos'].forEach(
        (c) => (db[c] = []),
    );
    db.assuntos = [];
    db.temas = [
        { id: 1, nome: 'Amor', notas: '' },
        { id: 2, nome: 'Mar', notas: '' },
    ];
    db.pessoas = [
        { id: 1, nome: 'Ana', grupoIds: [] },
        { id: 2, nome: 'Bia', grupoIds: [] },
        { id: 3, nome: 'Caio', grupoIds: [] },
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
    db.poemas = [
        t(1, [1], [3]), // Amor: Caio
        t(2, [1], [3]), // Amor: Caio
        t(3, [1, 2], [2]), // Amor e Mar: Bia
        t(4, [2], [1]), // Mar: Ana
    ];
    db.prosas = [];
}

function ordemDasLinhas(html) {
    const corpo = html.match(/<tbody>([\s\S]*?)<\/tbody>/)[1];
    return [...corpo.matchAll(/<tr><th[^>]*>([^<]*)<\/th>/g)].map((m) => m[1]);
}

function montar() {
    document.body.innerHTML = `<div id="tabela-coocorrencia"></div><div id="painel-colunas-coocorrencia"></div>${SECAO}`;
}

describe('ordenarMatrizCoocorrencia (lógica pura)', () => {
    beforeEach(acervo);

    const dados = () =>
        E.coocorrenciaTemasPessoas({ temas: ['Amor', 'Mar'], pessoas: ['Ana', 'Bia', 'Caio'] });

    it('ordena as linhas pelos valores de uma coluna, do maior para o menor', () => {
        const d = dados();
        const r = E.ordenarMatrizCoocorrencia(
            d,
            d.pessoas,
            { campo: 'col', nome: 'Amor', direcao: 'desc' },
            false,
        );
        assert.deepEqual(r.linhas, ['Caio', 'Bia', 'Ana']);
        assert.deepEqual(r.valores, [
            [2, 0],
            [1, 1],
            [0, 1],
        ]);
        assert.deepEqual(r.textosPorLinha, [2, 1, 1]);
    });

    it('desempata pelo nome da linha', () => {
        const d = dados();
        const r = E.ordenarMatrizCoocorrencia(
            d,
            d.pessoas,
            { campo: 'col', nome: 'Mar', direcao: 'desc' },
            false,
        );
        assert.deepEqual(r.linhas, ['Ana', 'Bia', 'Caio']);
    });

    it('ordena pelo nome da linha em A-Z e Z-A', () => {
        const d = dados();
        const z = E.ordenarMatrizCoocorrencia(
            d,
            d.pessoas,
            { campo: 'rotulo', direcao: 'desc' },
            false,
        );
        assert.deepEqual(z.linhas, ['Caio', 'Bia', 'Ana']);
    });

    it('ordena pela soma da linha e pelos textos com a linha', () => {
        const d = dados();
        const total = E.ordenarMatrizCoocorrencia(
            d,
            d.pessoas,
            { campo: 'total', direcao: 'desc' },
            false,
        );
        assert.deepEqual(total.linhas, ['Bia', 'Caio', 'Ana']);
        const textos = E.ordenarMatrizCoocorrencia(
            d,
            d.pessoas,
            { campo: 'textos', direcao: 'asc' },
            false,
        );
        assert.deepEqual(textos.linhas, ['Ana', 'Bia', 'Caio']);
    });

    it('na matriz invertida as linhas são os temas e as colunas, as pessoas', () => {
        const d = dados();
        const r = E.ordenarMatrizCoocorrencia(
            d,
            d.pessoas,
            { campo: 'col', nome: 'Ana', direcao: 'desc' },
            true,
        );
        assert.deepEqual(r.temas, ['Mar', 'Amor']);
        assert.deepEqual(r.valores, [
            [0, 2],
            [1, 1],
            [1, 0],
        ]);
        assert.deepEqual(r.textosPorTema, [2, 3]);
        assert.deepEqual(r.linhas, d.pessoas);
    });

    it('coluna que não existe ou sem ordem deixa a matriz como veio', () => {
        const d = dados();
        const sem = E.ordenarMatrizCoocorrencia(d, d.pessoas, null, false);
        assert.deepEqual(sem.linhas, d.pessoas);
        const inexistente = E.ordenarMatrizCoocorrencia(
            d,
            d.pessoas,
            { campo: 'col', nome: 'Luz', direcao: 'desc' },
            false,
        );
        assert.deepEqual(inexistente.linhas, d.pessoas);
        assert.deepEqual(inexistente.valores, d.valores);
    });
});

describe('ciclo de cliques e tela', () => {
    beforeEach(() => {
        acervo();
        montar();
    });

    it('coluna de número: maior primeiro, depois menor primeiro, depois volta ao padrão', () => {
        F.alternarOrdemTabelaCoocorrencia('col', 'Amor', false);
        assert.equal(F.getOrdemTabelaCoocorrencia().direcao, 'desc');
        F.alternarOrdemTabelaCoocorrencia('col', 'Amor', false);
        assert.equal(F.getOrdemTabelaCoocorrencia().direcao, 'asc');
        F.alternarOrdemTabelaCoocorrencia('col', 'Amor', false);
        assert.equal(F.getOrdemTabelaCoocorrencia(), null);
    });

    it('nome da linha começa em A-Z; trocar de coluna recomeça o ciclo', () => {
        F.alternarOrdemTabelaCoocorrencia('rotulo', '', false);
        assert.equal(F.getOrdemTabelaCoocorrencia().direcao, 'asc');
        F.alternarOrdemTabelaCoocorrencia('col', 'Mar', false);
        const o = F.getOrdemTabelaCoocorrencia();
        assert.equal(o.nome, 'Mar');
        assert.equal(o.direcao, 'desc');
    });

    it('a tabela reordena as linhas e marca o cabeçalho ativo', () => {
        renderCruzamentos();
        assert.deepEqual(ordemDasLinhas(document.getElementById('tabela-coocorrencia').innerHTML), [
            ...ordemDasLinhas(document.getElementById('tabela-coocorrencia').innerHTML),
        ]);
        window.ordenarTabelaCoocorrencia('col', 'Amor');
        renderCruzamentos();
        const html = document.getElementById('tabela-coocorrencia').innerHTML;
        assert.equal(ordemDasLinhas(html)[0], 'Caio');
        assert.match(html, /aria-sort="descending"/);
    });

    it('inverter a matriz ignora a ordem de uma coluna da outra orientação', () => {
        window.ordenarTabelaCoocorrencia('col', 'Amor');
        F.definirInverterCoocorrencia(true);
        renderCruzamentos();
        const html = document.getElementById('tabela-coocorrencia').innerHTML;
        assert.doesNotMatch(html, /aria-sort="(de|a)scending"/);
    });

    it('com a matriz invertida, clicar numa pessoa ordena os temas', () => {
        F.definirInverterCoocorrencia(true);
        window.ordenarTabelaCoocorrencia('col', 'Ana');
        renderCruzamentos();
        const html = document.getElementById('tabela-coocorrencia').innerHTML;
        assert.equal(ordemDasLinhas(html)[0], 'Mar');
    });
});
