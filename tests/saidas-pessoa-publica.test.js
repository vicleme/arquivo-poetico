import './helpers/dom-real.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Saídas dos campos de Pessoa pública nas Referências (Conhecido(a) como,
// gênero, orientação e cor/raça): busca, coluna da tabela, Ver, .md, .csv
// e .json. Vazio é "não informado": nunca vira palavra nas saídas.
const { db } = await import('../js/db.js');
const { decorarCamposBusca } = await import('../js/render-listas.js');
const { itemParaMarkdown } = await import('../js/exportar-md.js');
const { renderVisualizacaoHtml } = await import('../js/visualizar.js');
const { colunasTexto } = await import('../js/exportar-csv.js');
const { montarRegistro } = await import('../js/exportar.js');
const { descricaoPessoaPublica, selinhosPessoaPublica } =
    await import('../js/caracterizacao-pessoa-publica.js');

const completa = {
    tipo: 'Pessoa pública',
    texto: 'Cássia Eller',
    conhecidoComo: ['Cantor(a)', 'Figura histórica'],
    genero: 'Mulher',
    orientacao: 'LGBT',
    corRaca: 'Branca',
};
const soGenero = { tipo: 'Pessoa pública', texto: 'Fulano', genero: 'Homem' };
const semNada = { tipo: 'Pessoa pública', texto: 'Anônimo' };
const noticia = { tipo: 'Notícia', texto: 'Enchente', genero: 'Homem' };

const textoCom = (...refs) => ({
    id: 1,
    tipo: 'poema',
    titulo: 'T',
    texto: 'verso',
    contexto: {},
    referenciasExternas: refs,
});

describe('descricaoPessoaPublica e selinhos', () => {
    it('descreve só o que foi informado, com tags primeiro', () => {
        assert.equal(
            descricaoPessoaPublica(completa),
            'conhecido(a) como Cantor(a), Figura histórica; Mulher; LGBT; Branca',
        );
        assert.equal(descricaoPessoaPublica(soGenero), 'Homem');
        assert.equal(descricaoPessoaPublica({ ...semNada, orientacao: 'Hétero' }), 'Hétero');
    });

    it('não informado e outro Tipo não geram nada', () => {
        assert.equal(descricaoPessoaPublica(semNada), '');
        assert.equal(descricaoPessoaPublica(noticia), '');
        assert.equal(descricaoPessoaPublica(undefined), '');
        assert.deepEqual(selinhosPessoaPublica(noticia), []);
    });

    it('selinhos: tags, depois gênero, orientação e cor/raça', () => {
        assert.deepEqual(
            selinhosPessoaPublica(completa).map((r) => r.texto),
            ['Cantor(a)', 'Figura histórica', '♀︎', '🏳️‍🌈', 'Branca'],
        );
    });
});

describe('busca', () => {
    it('acha a referência por tag, gênero, orientação e cor/raça', () => {
        const campo = decorarCamposBusca(textoCom(completa, soGenero))._buscaReferenciasExternas;
        ['Cássia Eller', 'Figura histórica', 'Mulher', 'LGBT', 'Branca', 'Homem'].forEach((t) =>
            assert.ok(campo.includes(t), t),
        );
        assert.equal(campo.includes('Hétero'), false);
    });
});

describe('.md', () => {
    it('leva a descrição entre parênteses, só em Pessoa pública', () => {
        const md = itemParaMarkdown(textoCom(completa, soGenero, semNada, noticia), 1);
        assert.match(
            md,
            /Cássia Eller \(conhecido\(a\) como Cantor\(a\), Figura histórica; Mulher; LGBT; Branca\)/,
        );
        assert.match(md, /Fulano \(Homem\)/);
        assert.match(md, /Anônimo(?! \()/);
        assert.match(md, /Enchente(?! \()/);
    });
});

describe('Ver', () => {
    it('mostra a descrição ao lado do nome, com escape', () => {
        const html = renderVisualizacaoHtml(textoCom({ ...completa, conhecidoComo: ['<b>x</b>'] }));
        assert.match(html, /Cássia Eller \(conhecido\(a\) como &lt;b&gt;x&lt;\/b&gt;; Mulher/);
        assert.doesNotMatch(html, /<b>x<\/b>/);
    });

    it('sem caracterização, sai como antes', () => {
        const html = renderVisualizacaoHtml(textoCom(semNada));
        assert.match(html, /Anônimo/);
        assert.doesNotMatch(html, /Anônimo \(/);
    });
});

describe('.csv', () => {
    const colunas = colunasTexto('poema');
    const valor = (nome, registro) =>
        colunas.find((c) => c.cabecalho === nome).valor(registro, { texto: { plano: '' } }, db);

    it('uma coluna por campo, por posição, vazio onde não foi informado', () => {
        const r = { referenciasExternas: [completa, semNada, soGenero] };
        assert.equal(
            valor('referencias_externas_conhecido_como', r),
            'Cantor(a); Figura histórica |  | ',
        );
        assert.equal(valor('referencias_externas_genero', r), 'Mulher |  | Homem');
        assert.equal(valor('referencias_externas_orientacao', r), 'LGBT |  | ');
        assert.equal(valor('referencias_externas_cor_raca', r), 'Branca |  | ');
    });

    it('sem nenhuma informada, as quatro colunas ficam vazias', () => {
        const r = { referenciasExternas: [semNada] };
        ['conhecido_como', 'genero', 'orientacao', 'cor_raca'].forEach((s) =>
            assert.equal(valor(`referencias_externas_${s}`, r), '', s),
        );
    });

    it('a coluna corrida referencias_externas leva a descrição', () => {
        const r = { referenciasExternas: [completa, noticia] };
        assert.equal(
            valor('referencias_externas', r),
            'Pessoa pública: Cássia Eller (conhecido(a) como Cantor(a), Figura histórica; Mulher; LGBT; Branca) | Notícia: Enchente',
        );
    });
});

describe('.json', () => {
    it('o registro exportado leva a entrada inteira, com as chaves novas', () => {
        const item = { ...textoCom(completa, semNada), autoria: [] };
        db.poemas = [item];
        const reg = montarRegistro('poema', item);
        assert.deepEqual(reg.referenciasExternas[0], completa);
        assert.equal('genero' in reg.referenciasExternas[1], false);
        db.poemas = [];
    });
});
