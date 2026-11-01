import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Exportação da matriz de Cruzamentos em .csv, .json e .md.
const { db } = await import('../js/db.js');
const F = await import('../js/estatisticas-filtros.js');
const X = await import('../js/exportar-cruzamentos.js');
const { matrizParaExportar } = await import('../js/estatisticas-tela-cruzamentos.js');

function acervo() {
    localStorage.clear();
    ['livros', 'partes', 'secoes', 'elementos', 'epocas', 'autores'].forEach((c) => (db[c] = []));
    db.assuntos = [];
    db.temas = [
        { id: 1, nome: 'Amor', notas: '' },
        { id: 2, nome: 'Mar', notas: '' },
    ];
    db.grupos = [{ id: 10, nome: 'Família', paiId: null }];
    db.pessoas = [
        { id: 1, nome: 'Ana', grupoIds: [10] },
        { id: 2, nome: 'Bia', grupoIds: [10] },
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
    db.poemas = [t(1, [1], [3]), t(2, [1], [3]), t(3, [1, 2], [2]), t(4, [2], [1])];
    db.prosas = [];
    document.body.innerHTML =
        '<select id="est-coocorrencia-modo"><option value="pessoas"></option></select>';
}

const linhasCsv = (csv) =>
    csv
        .replace(/^\uFEFF/, '')
        .trim()
        .split('\r\n');

describe('tabelaDeCruzamentos', () => {
    beforeEach(acervo);

    it('matriz normal: pessoas nas linhas, temas nas colunas, com totais e rodapé', () => {
        const t = X.tabelaDeCruzamentos(matrizParaExportar());
        assert.equal(t.eixo, 'Pessoa × tema');
        assert.deepEqual(t.colunas, ['Amor', 'Mar']);
        assert.deepEqual(
            t.linhas.map((l) => [l.rotulo, ...l.valores, l.total, l.textos]),
            [
                ['Caio', 2, 0, 2, 2],
                ['Bia', 1, 1, 2, 1],
                ['Ana', 0, 1, 1, 1],
            ],
        );
        assert.equal(t.rodape[0].total, 5);
        assert.deepEqual(t.rodape[1].valores, [3, 2]);
    });

    it('matriz invertida: temas nas linhas, pessoas nas colunas', () => {
        F.definirInverterCoocorrencia(true);
        const t = X.tabelaDeCruzamentos(matrizParaExportar());
        assert.equal(t.eixo, 'Tema × pessoa');
        assert.deepEqual(t.colunas, ['Caio', 'Bia', 'Ana']);
        assert.deepEqual(t.linhas[0].valores, [2, 1, 0]);
        assert.equal(t.linhas[0].rotulo, 'Amor');
        assert.equal(t.linhas[0].textos, 3);
        assert.deepEqual(t.rodape[1].valores, [2, 1, 1]);
    });

    it('sai na ordem escolhida pelo clique no cabeçalho', () => {
        F.alternarOrdemTabelaCoocorrencia('col', 'Mar', false);
        const t = X.tabelaDeCruzamentos(matrizParaExportar());
        assert.deepEqual(
            t.linhas.map((l) => l.rotulo),
            ['Ana', 'Bia', 'Caio'],
        );
    });

    it('com uma pessoa escolhida, só as colunas dos temas dela', () => {
        F.definirPessoaCoocorrencia('Ana');
        const t = X.tabelaDeCruzamentos(matrizParaExportar());
        assert.deepEqual(t.colunas, ['Mar']);
        assert.deepEqual(
            t.linhas.map((l) => l.rotulo),
            ['Ana'],
        );
    });
});

describe('gerarCsvCruzamentos', () => {
    beforeEach(acervo);

    it('cabeçalho, linhas e rodapé, com BOM e células de total em branco onde a tela deixa', () => {
        const csv = X.gerarCsvCruzamentos(matrizParaExportar());
        assert.ok(csv.startsWith('\uFEFF'));
        assert.deepEqual(linhasCsv(csv), [
            'Pessoa × tema,Amor,Mar,Total (soma da linha),Textos com a pessoa',
            'Caio,2,0,2,2',
            'Bia,1,1,2,1',
            'Ana,0,1,1,1',
            'Aparições de pessoas (soma da coluna),3,2,5,',
            'Textos com o tema,3,2,,',
        ]);
    });

    it('nome com vírgula vai entre aspas', () => {
        db.pessoas[2].nome = 'Caio, Jr.';
        const csv = X.gerarCsvCruzamentos(matrizParaExportar());
        assert.match(csv, /"Caio, Jr\.",2,0,2,2/);
    });
});

describe('gerarJsonCruzamentos', () => {
    beforeEach(acervo);

    it('estrutura com valores por coluna, rodapé, filtros e ordem', () => {
        F.alternarOrdemTabelaCoocorrencia('col', 'Amor', false);
        const j = JSON.parse(
            X.gerarJsonCruzamentos(matrizParaExportar(), new Date('2026-10-27T12:00:00Z')),
        );
        assert.equal(j.cruzamento, 'Temas × pessoas');
        assert.equal(j.orientacao, 'temas nas colunas');
        assert.equal(j.geradoEm, '2026-10-27T12:00:00.000Z');
        assert.equal(j.filtros.Pessoa, 'Todas as pessoas');
        assert.equal(j.ordem, 'coluna Amor, do maior para o menor');
        assert.deepEqual(j.linhas[0], {
            rotulo: 'Caio',
            valores: { Amor: 2, Mar: 0 },
            total: 2,
            textos: 2,
        });
        assert.deepEqual(j.rodape[1].valores, { Amor: 3, Mar: 2 });
    });

    it('ordem de outra orientação não é descrita', () => {
        F.alternarOrdemTabelaCoocorrencia('col', 'Amor', false);
        F.definirInverterCoocorrencia(true);
        const j = JSON.parse(X.gerarJsonCruzamentos(matrizParaExportar()));
        assert.equal(j.ordem, null);
    });
});

describe('gerarMarkdownCruzamentos', () => {
    beforeEach(acervo);

    it('tabela com cabeçalho, alinhamento, zero como traço e rodapé em negrito', () => {
        const md = X.gerarMarkdownCruzamentos(matrizParaExportar());
        assert.match(md, /^# Cruzamentos: Temas × pessoas/);
        assert.match(
            md,
            /\| Pessoa × tema \| Amor \| Mar \| Total \(soma da linha\) \| Textos com a pessoa \|\n\| --- \| ---: \| ---: \| ---: \| ---: \|/,
        );
        assert.match(md, /\| Caio \| 2 \| — \| 2 \| 2 \|/);
        assert.match(md, /\| \*\*Textos com o tema\*\* \| 3 \| 2 \| {2}\| {2}\|/);
        assert.match(md, /- Pessoa: Todas as pessoas/);
    });

    it('barra vertical no nome é escapada', () => {
        db.pessoas[0].nome = 'Ana | Maria';
        const md = X.gerarMarkdownCruzamentos(matrizParaExportar());
        assert.match(md, /Ana \\\| Maria/);
    });
});

describe('nomeArquivoCruzamentos', () => {
    it('um nome por modo', () => {
        assert.equal(X.nomeArquivoCruzamentos('pessoas', 'csv'), 'cruzamentos-temas-pessoas.csv');
        assert.equal(X.nomeArquivoCruzamentos('grupos', 'md'), 'cruzamentos-temas-grupos.md');
        assert.equal(
            X.nomeArquivoCruzamentos('personagens', 'json'),
            'cruzamentos-temas-personagens.json',
        );
    });
});
