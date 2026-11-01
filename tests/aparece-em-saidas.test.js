// dom-real.js: montarRegistro (exportar.js) puxa a cadeia de imports com DOM.
import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const { db } = await import('../js/db.js');
const { montarRegistro } = await import('../js/exportar.js');
const { gerarCsvTextos } = await import('../js/exportar-csv.js');
const { gerarMarkdownItem } = await import('../js/exportar-md.js');
const { renderVisualizacaoHtml } = await import('../js/visualizar.js');
const { textosApareceEm } = await import('../js/aparicoes-do-texto.js');

// Fase 21, etapa 21-4b: o contexto das saídas leva todas as aparições do texto
// (`contexto.aparece_em`), e .md, Ver e .csv mostram a linha "Aparece em".

const ap = (livroId, parteId, secaoId, sequencia) => ({ livroId, parteId, secaoId, sequencia });

function montarBanco() {
    db.livros = [
        { id: 1, tipo: 'Livro', titulo: 'Livro Um', data: { ano: 2020 } },
        { id: 2, tipo: 'Livro', titulo: 'Livro Dois', data: { ano: 2018 } },
        { id: 3, tipo: 'Coletânea', titulo: 'Seleta' },
    ];
    db.partes = [
        { id: 10, livroId: 1, titulo: 'Parte Alfa' },
        { id: 40, livroId: 3, titulo: 'Parte Seleta' },
    ];
    db.secoes = [{ id: 50, titulo: 'Secao Delta', paiTipo: 'livro', paiId: 2 }];
    db.itensColetanea = [{ id: 1, parteId: 40, refTipo: 'poema', refId: 1, sequencia: 2 }];
    db.poemas = [
        {
            id: 1,
            titulo: 'Em dois livros',
            texto: 'verso',
            paiTipo: 'parte',
            paiId: 10,
            sequencia: 1,
            livrosIds: [2],
            aparicoes: [ap(1, 10, null, 1), ap(2, null, 50, 3)],
        },
        {
            id: 2,
            titulo: 'Num so',
            texto: 'verso',
            paiTipo: 'livro',
            paiId: 1,
            sequencia: 2,
            livrosIds: [],
            aparicoes: [ap(1, null, null, 2)],
        },
        {
            id: 3,
            titulo: 'Descartado',
            texto: 'verso',
            status: 'descartado',
            livrosIds: [],
            aparicoes: [],
        },
    ];
    db.prosas = [];
    db.elementos = [];
}

const reg = (id) =>
    montarRegistro(
        'poema',
        db.poemas.find((p) => p.id === id),
    );

function colunaDoCsv(csv, nome) {
    const limpo = csv.charCodeAt(0) === 0xfeff ? csv.slice(1) : csv;
    const [cab, linha] = limpo.split('\n');
    return linha.split(',')[cab.split(',').indexOf(nome)];
}

describe('Aparece em nas saídas (21-4b)', () => {
    beforeEach(montarBanco);

    it('.json: contexto.aparece_em lista todas as aparições, com a principal marcada', () => {
        const lista = reg(1).contexto.aparece_em;
        assert.equal(lista.length, 3);
        assert.deepEqual(lista[0], {
            livro: 'Livro Um',
            parte: 'Parte Alfa',
            secao: null,
            posicao: 1,
            coletanea: false,
            principal: false,
        });
        // Livro Dois tem a publicação mais antiga (2018): é a principal.
        assert.equal(lista[1].livro, 'Livro Dois');
        assert.equal(lista[1].secao, 'Secao Delta');
        assert.equal(lista[1].principal, true);
        assert.equal(lista[2].coletanea, true);
        assert.equal(lista[2].livro, 'Seleta');
    });

    it('.json: contexto.livro, parte e secao seguem sendo só o Destino', () => {
        const c = reg(1).contexto;
        assert.equal(c.livro, 'Livro Um');
        assert.equal(c.parte, 'Parte Alfa');
        assert.equal(c.secao, null);
    });

    it('.json: texto avulso leva lista vazia', () => {
        assert.deepEqual(reg(3).contexto.aparece_em, []);
    });

    it('textosApareceEm: só com duas ou mais aparições em livros comuns, sem Coletânea e sem descartado', () => {
        assert.deepEqual(textosApareceEm(reg(1)), [
            'Livro Um › Parte Alfa · posição 1',
            'Livro Dois › Secao Delta · posição 3',
        ]);
        assert.deepEqual(textosApareceEm(reg(2)), []);
        assert.deepEqual(textosApareceEm(reg(3)), []);
    });

    it('.md: linha "Aparece em" só para o texto em mais de um livro', () => {
        const dois = gerarMarkdownItem(reg(1));
        assert.match(dois, /Aparece em[^\n]*Livro Um › Parte Alfa · posição 1; Livro Dois/);
        assert.doesNotMatch(gerarMarkdownItem(reg(2)), /Aparece em/);
    });

    it('Ver: mesma linha "Aparece em"', () => {
        assert.match(renderVisualizacaoHtml(reg(1)), /Aparece em/);
        assert.doesNotMatch(renderVisualizacaoHtml(reg(2)), /Aparece em/);
    });

    it('.csv: coluna aparece_em com as aparições separadas por " | "', () => {
        const csv = gerarCsvTextos('poema', [reg(1)], db);
        const limpo = csv.charCodeAt(0) === 0xfeff ? csv.slice(1) : csv;
        assert.ok(limpo.split('\n')[0].split(',').includes('aparece_em'));
        assert.match(
            csv,
            /Livro Um › Parte Alfa · posição 1 \| Livro Dois › Secao Delta · posição 3/,
        );
        assert.equal(colunaDoCsv(gerarCsvTextos('poema', [reg(2)], db), 'aparece_em'), '');
    });
});
