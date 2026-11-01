import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Temas × pessoas: escolher uma pessoa recorta a matriz nela e deixa só as
// colunas dos temas que se aplicam a ela.
const { db } = await import('../js/db.js');
const E = await import('../js/estatisticas.js');
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
        { id: 3, nome: 'Sol', notas: '' },
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
        t(1, [1], [1, 3]), // Amor: Ana e Caio
        t(2, [1, 2], [1]), // Amor e Mar: Ana
        t(3, [3], []), // Sol sem ninguém
    ];
    db.prosas = [];
}

describe('soPessoaSozinha', () => {
    beforeEach(acervo);

    it('tira os textos em que a pessoa aparece com mais alguém', () => {
        // Texto 1 (Amor): Ana e Caio. Texto 2 (Amor e Mar): só Ana.
        const todos = E.coocorrenciaTemasPessoas({ temas: ['Amor', 'Mar'], pessoas: ['Ana'] });
        assert.deepEqual(todos.valores, [[2, 1]]);
        const sozinha = E.coocorrenciaTemasPessoas({
            temas: ['Amor', 'Mar'],
            pessoas: ['Ana'],
            soPessoaSozinha: true,
        });
        assert.deepEqual(sozinha.valores, [[1, 1]]);
        assert.deepEqual(sozinha.textosPorLinha, [1]);
        assert.equal(sozinha.totalTextos, 1);
    });

    it('pessoa que só aparece acompanhada fica sem linha', () => {
        const r = E.coocorrenciaTemasPessoas({
            temas: ['Amor'],
            pessoas: ['Caio'],
            soPessoaSozinha: true,
        });
        assert.deepEqual(r.pessoas, []);
    });
});

describe('manterColunasComValor', () => {
    beforeEach(acervo);

    it('tira as colunas sem valor e mantém o resto alinhado', () => {
        const r = E.coocorrenciaTemasPessoas({
            temas: ['Amor', 'Mar', 'Sol'],
            pessoas: ['Caio'],
        });
        const so = E.manterColunasComValor(r);
        assert.deepEqual(so.temas, ['Amor']);
        assert.deepEqual(so.valores, [[1]]);
        assert.deepEqual(so.textosPorTema, [1]);
        assert.deepEqual(so.pessoas, ['Caio']);
    });
});

describe('a tela de Temas × pessoas com uma pessoa escolhida', () => {
    beforeEach(() => {
        acervo();
        document.body.innerHTML = SECAO;
        globalThis.Chart = class {
            destroy() {}
            static getChart() {}
        };
    });
    const colunas = () =>
        [...document.querySelectorAll('#tabela-coocorrencia thead th')].map((c) =>
            c.textContent.trim(),
        );
    // O happy-dom não lê o atributo `selected` em `.value`; confere a opção marcada.
    const pessoaMarcada = () =>
        document.querySelector('#est-coocorrencia-pessoa option[selected]')?.value;
    const linhasDeDados = () =>
        [...document.querySelectorAll('#tabela-coocorrencia tbody tr')].map((tr) =>
            tr.children[0].textContent.trim(),
        );

    it('sem pessoa escolhida mostra todas as pessoas e todos os temas', () => {
        renderCruzamentos();
        assert.deepEqual(linhasDeDados().sort(), ['Ana', 'Caio']);
        assert.ok(colunas().includes('Amor'));
        assert.ok(colunas().includes('Mar'));
        assert.ok(colunas().includes('Sol'));
        assert.ok(document.getElementById('est-coocorrencia-pessoa'));
    });

    it('escolhida a Caio, fica só a linha dele e só a coluna Amor', () => {
        E.definirPessoaCoocorrencia('Caio');
        renderCruzamentos();
        assert.deepEqual(linhasDeDados(), ['Caio']);
        const cab = colunas();
        assert.ok(cab.includes('Amor'));
        assert.ok(!cab.includes('Mar'));
        assert.ok(!cab.includes('Sol'));
        assert.equal(pessoaMarcada(), 'Caio');
    });

    it('escolhida a Ana, ficam Amor e Mar', () => {
        E.definirPessoaCoocorrencia('Ana');
        renderCruzamentos();
        const cab = colunas();
        assert.ok(cab.includes('Amor') && cab.includes('Mar'));
        assert.ok(!cab.includes('Sol'));
    });

    it('pessoa salva que não existe mais volta para todas', () => {
        E.definirPessoaCoocorrencia('Fulano');
        renderCruzamentos();
        assert.deepEqual(linhasDeDados().sort(), ['Ana', 'Caio']);
        assert.equal(pessoaMarcada(), '');
    });

    it('o checkbox só aparece com pessoa escolhida e recorta a contagem', () => {
        renderCruzamentos();
        assert.equal(document.getElementById('est-coocorrencia-so-sozinha'), null);
        E.definirPessoaCoocorrencia('Ana');
        E.definirSoPessoaSozinhaCoocorrencia(true);
        renderCruzamentos();
        const box = document.getElementById('est-coocorrencia-so-sozinha');
        assert.ok(box);
        assert.ok(box.hasAttribute('checked'));
        const linhaAna = [...document.querySelectorAll('#tabela-coocorrencia tbody tr')].map((tr) =>
            [...tr.children].map((c) => c.textContent.trim()),
        )[0];
        // Amor 1 (só o texto 2), Mar 1, total 2, textos 1.
        assert.deepEqual(linhaAna, ['Ana', '1', '1', '2', '1']);
    });

    it('nos modos Grupos e Personagens o seletor de pessoa some', () => {
        E.definirPessoaCoocorrencia('Caio');
        document.getElementById('est-coocorrencia-modo').value = 'grupos';
        renderCruzamentos();
        assert.equal(document.getElementById('est-coocorrencia-pessoa'), null);
    });
});
