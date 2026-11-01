import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Interruptor global "Contar eu como pessoa": com a Pessoa marcada "sou eu" fora
// da conta, ela some das métricas de Pessoa, Grupo, Gênero e Cruzamentos, sem
// mudar o corpus de textos.
const { db } = await import('../js/db.js');
const E = await import('../js/estatisticas.js');
const { renderFiltrosCompartilhados } = await import('../js/estatisticas-tela-comum.js');

function acervo({ comEu = true } = {}) {
    localStorage.clear();
    ['livros', 'partes', 'secoes', 'elementos', 'epocas', 'autores'].forEach((c) => (db[c] = []));
    db.assuntos = [];
    db.grupos = [{ id: 1, nome: 'Família' }];
    db.temas = [
        { id: 1, nome: 'Amor', notas: '' },
        { id: 2, nome: 'Mar', notas: '' },
    ];
    db.pessoas = [
        { id: 1, nome: 'Victor', grupoIds: [1], genero: 'Homem', souEu: comEu },
        { id: 2, nome: 'Ana', grupoIds: [1], genero: 'Mulher' },
        { id: 3, nome: 'Bia', grupoIds: [], genero: 'Mulher' },
    ];
    const ps = (...ids) => ids.map((pessoaId) => ({ pessoaId, papeis: [] }));
    const tm = (...ids) => ids.map((temaId) => ({ temaId, papel: 'principal' }));
    const nomes = (ids) => ids.map((id) => db.temas.find((t) => t.id === id).nome).join(', ');
    const t = (id, ano, temas, pessoas) => ({
        id,
        titulo: `T${id}`,
        ano,
        temas: tm(...temas),
        sinalizacoesTema: nomes(temas),
        pessoas: ps(...pessoas),
    });
    db.poemas = [
        t(1, 2019, [1], [1, 2]), // Amor: eu e Ana
        t(2, 2020, [1, 2], [1]), // Amor e Mar: só eu
        t(3, 2020, [2], [3]), // Mar: Bia
    ];
    db.prosas = [];
}

const ligar = () => E.definirContarEuComoPessoa(true);
const desligar = () => E.definirContarEuComoPessoa(false);
const conta = (r) => Object.fromEntries(r.labels.map((l, i) => [l, r.data[i]]));

describe('interruptor "Contar eu como pessoa"', () => {
    beforeEach(acervo);

    it('o padrão é ligado e a escolha fica salva', () => {
        assert.equal(E.getContarEuComoPessoa(), true);
        desligar();
        assert.equal(E.getContarEuComoPessoa(), false);
        ligar();
        assert.equal(E.getContarEuComoPessoa(), true);
    });

    it('ligado, a Pessoa "eu" conta como qualquer outra', () => {
        const r = conta(E.agregarPorPessoa({ modo: 'pessoa', grupoIds: [] }));
        assert.deepEqual(r, { Victor: 2, Ana: 1, Bia: 1 });
    });

    it('desligado, some do gráfico por pessoa', () => {
        desligar();
        const r = conta(E.agregarPorPessoa({ modo: 'pessoa', grupoIds: [] }));
        assert.deepEqual(r, { Ana: 1, Bia: 1 });
    });

    it('desligado, não entra no gráfico por grupo', () => {
        assert.deepEqual(conta(E.agregarPorPessoa({ modo: 'grupo' })), { Família: 3 });
        desligar();
        assert.deepEqual(conta(E.agregarPorPessoa({ modo: 'grupo' })), { Família: 1 });
    });

    it('desligado, não entra no gráfico por gênero nem no filtro de gênero', () => {
        assert.deepEqual(conta(E.agregarPorPessoa({ modo: 'genero' })), { Homem: 2, Mulher: 2 });
        assert.equal(E.opcoesFiltroGenero().length, 2);
        desligar();
        assert.deepEqual(conta(E.agregarPorPessoa({ modo: 'genero' })), { Mulher: 2 });
        const opcoes = E.opcoesFiltroGenero();
        assert.deepEqual(
            opcoes.map((o) => [o.rotulo, o.pessoas]),
            [['Mulher', 2]],
        );
    });

    it('desligado, a linha do tempo de pessoas não a conta', () => {
        desligar();
        assert.deepEqual(conta(E.agregarPessoaPorAno('Victor')), {});
        assert.deepEqual(conta(E.agregarPessoaPorAno('Ana')), { 2019: 1 });
        assert.deepEqual(conta(E.agregarTotalDedicatoriasPessoaPorAno()), { 2019: 1, 2020: 1 });
        assert.equal(E.anosDistintosPorPessoa().Victor, undefined);
    });

    it('desligado, a matriz Temas × pessoas não tem a linha dela', () => {
        const todas = E.coocorrenciaTemasPessoas({ temas: ['Amor', 'Mar'] });
        assert.ok(todas.pessoas.includes('Victor'));
        desligar();
        const sem = E.coocorrenciaTemasPessoas({ temas: ['Amor', 'Mar'] });
        assert.deepEqual([...sem.pessoas].sort(), ['Ana', 'Bia']);
        // Texto 2 só tinha "eu": deixa de contar na matriz.
        assert.equal(sem.totalTextos, 2);
    });

    it('desligado, "só ela" ignora a pessoa "eu" no mesmo texto', () => {
        const comEu = E.coocorrenciaTemasPessoas({
            temas: ['Amor'],
            pessoas: ['Ana'],
            soPessoaSozinha: true,
        });
        assert.deepEqual(comEu.pessoas, []);
        desligar();
        const semEu = E.coocorrenciaTemasPessoas({
            temas: ['Amor'],
            pessoas: ['Ana'],
            soPessoaSozinha: true,
        });
        assert.deepEqual(semEu.valores, [[1]]);
    });

    it('desligado, a matriz Temas × grupos não a conta', () => {
        const antes = E.coocorrenciaTemasGrupos({ temas: ['Amor', 'Mar'], grupos: ['Família'] });
        assert.deepEqual(antes.textosPorLinha, [2]);
        desligar();
        const depois = E.coocorrenciaTemasGrupos({ temas: ['Amor', 'Mar'], grupos: ['Família'] });
        assert.deepEqual(depois.textosPorLinha, [1]);
    });

    it('não muda o corpus de textos', () => {
        const antes = E.contarTextosFiltrados();
        desligar();
        assert.deepEqual(E.contarTextosFiltrados(), antes);
    });

    it('sem Pessoa marcada "eu", o interruptor não muda nada', () => {
        acervo({ comEu: false });
        desligar();
        assert.deepEqual(conta(E.agregarPorPessoa({ modo: 'pessoa', grupoIds: [] })), {
            Victor: 2,
            Ana: 1,
            Bia: 1,
        });
    });
});

describe('barra de filtros compartilhada', () => {
    beforeEach(() => {
        acervo();
        document.body.innerHTML = '<div class="est-filtros-compartilhados"></div>';
    });

    it('mostra o checkbox ligado quando existe Pessoa "eu"', () => {
        renderFiltrosCompartilhados();
        const cb = document.getElementById('est-contar-eu');
        assert.ok(cb);
        assert.equal(cb.checked, true);
        assert.match(document.body.innerHTML, /Contar o próprio autor como pessoa/);
        assert.doesNotMatch(document.body.innerHTML, /Contagens de pessoas, grupos/);
    });

    it('desligado, mostra a nota curta', () => {
        desligar();
        renderFiltrosCompartilhados();
        assert.equal(document.getElementById('est-contar-eu').checked, false);
        assert.match(document.body.innerHTML, /Contagens de pessoas, grupos, gênero/);
    });

    it('sem Pessoa de autor nem "eu", o checkbox não aparece', () => {
        acervo({ comEu: false });
        renderFiltrosCompartilhados();
        assert.equal(document.getElementById('est-contar-eu'), null);
    });
});

describe('Cruzamentos com a pessoa "eu" escolhida', () => {
    beforeEach(() => {
        acervo();
        document.body.innerHTML =
            '<div class="est-filtros-compartilhados"></div><div id="painel-papel-tema-cruzamentos"></div>' +
            '<div id="painel-pessoa-coocorrencia"></div><div id="painel-inverter-coocorrencia"></div>' +
            '<div id="painel-colunas-coocorrencia"></div><div id="tabela-coocorrencia"></div>';
    });

    it('desligado, a pessoa "eu" some do seletor e a matriz volta para Todas', async () => {
        const { renderCruzamentos } = await import('../js/estatisticas-tela-cruzamentos.js');
        E.definirPessoaCoocorrencia('Victor');
        renderCruzamentos();
        // O happy-dom não lê o atributo `selected` em `.value`; confere a opção marcada.
        const marcada = () =>
            document.querySelector('#est-coocorrencia-pessoa option[selected]')?.value;
        assert.equal(marcada(), 'Victor');
        desligar();
        renderCruzamentos();
        const depois = document.getElementById('est-coocorrencia-pessoa');
        assert.equal(marcada(), '');
        assert.ok(![...depois.options].some((o) => o.value === 'Victor'));
        assert.match(document.getElementById('tabela-coocorrencia').innerHTML, /Ana/);
        assert.doesNotMatch(document.getElementById('tabela-coocorrencia').innerHTML, /Victor/);
    });
});

describe('Pessoa ligada a um Autor qualquer (sem "sou eu")', () => {
    beforeEach(() => {
        acervo({ comEu: false });
        db.autores = [
            { id: 100, nome: 'Florbela' },
            { id: 101, nome: 'Outro' },
        ];
        // Florbela (pessoa 1, ligada ao Autor 100) escreve sobre si e sobre Ana.
        db.pessoas[0] = {
            id: 1,
            nome: 'Florbela',
            grupoIds: [1],
            genero: 'Mulher',
            autorIds: [100],
        };
        db.poemas.forEach((t) => (t.autoria = [{ autorId: 100, papel: 'autor' }]));
        // Um poema de OUTRO autor que cita a Florbela.
        db.poemas.push({
            id: 9,
            titulo: 'T9',
            ano: 2021,
            temas: [{ temaId: 1, papel: 'principal' }],
            sinalizacoesTema: 'Amor',
            pessoas: [{ pessoaId: 1, papeis: [] }],
            autoria: [{ autorId: 101, papel: 'autor' }],
        });
    });

    it('o checkbox aparece sem ninguém marcado "sou eu"', () => {
        document.body.innerHTML = '<div class="est-filtros-compartilhados"></div>';
        renderFiltrosCompartilhados();
        assert.ok(document.getElementById('est-contar-eu'));
    });

    it('desligado, a pessoa some só nos textos do autor ligado a ela', () => {
        assert.equal(conta(E.agregarPorPessoa({ modo: 'pessoa', grupoIds: [] })).Florbela, 3);
        desligar();
        // Só sobra o poema 9, de outro autor.
        assert.equal(conta(E.agregarPorPessoa({ modo: 'pessoa', grupoIds: [] })).Florbela, 1);
    });

    it('desligado, vale também para grupo e para a matriz', () => {
        desligar();
        assert.deepEqual(conta(E.agregarPorPessoa({ modo: 'grupo' })), { Família: 2 });
        const m = E.coocorrenciaTemasPessoas({ temas: ['Amor'] });
        assert.deepEqual(m.textosPorLinha[m.pessoas.indexOf('Florbela')], 1);
    });

    it('o filtro de gênero continua listando quem ainda conta em algum texto', () => {
        desligar();
        assert.ok(E.opcoesFiltroGenero().some((o) => o.rotulo === 'Mulher'));
    });
});
