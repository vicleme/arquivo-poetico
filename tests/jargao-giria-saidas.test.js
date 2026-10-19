import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Jargão e gíria, entrega 4: o campo sai no .md, no .csv, no .json e na
// Visualização. O teste-guarda de exportar-csv.test.js só enxerga chaves
// escritas direto em `dados` (forms.js), e jargaoGiria entra por espalhamento,
// então a cobertura da coluna é cobrada aqui, explicitamente.
const { db } = await import('../js/db.js');
const { gerarMarkdownExportacao } = await import('../js/exportar-md.js');
const { renderVisualizacaoHtml } = await import('../js/visualizar.js');
const { colunasTexto, gerarCsvTextos, SEPARADOR_LISTA } = await import('../js/exportar-csv.js');
const { montarRegistro } = await import('../js/exportar.js');

function limpar() {
    db.livros.length = 0;
    db.partes.length = 0;
    db.secoes.length = 0;
    db.poemas.length = 0;
    db.prosas.length = 0;
}

// Leitura simples de CSV de uma linha de dados (sem quebras dentro de células).
function linhaCsv(csv) {
    const linhas = csv
        .replace(/^\uFEFF/, '')
        .trim()
        .split(/\r?\n/);
    const cab = linhas[0].split(',');
    const val = linhas[1].split(',');
    return Object.fromEntries(cab.map((c, i) => [c, val[i]]));
}

describe('.md', () => {
    beforeEach(limpar);

    it('traz a linha Jargão e gíria logo depois de Idioma, com os itens separados por vírgula', () => {
        db.poemas = [
            {
                id: 1,
                titulo: 'Gen Z',
                texto: 'verso',
                idioma: 'pt-BR',
                jargaoGiria: ['Gíria de internet', 'Gíria juvenil'],
            },
        ];
        const md = gerarMarkdownExportacao(db.poemas);
        assert.match(md, /- \*\*Jargão e gíria:\*\* Gíria de internet, Gíria juvenil\n/);
        assert.ok(md.indexOf('**Idioma:**') < md.indexOf('**Jargão e gíria:**'));
    });

    it('texto sem o campo, ou com lista vazia, não ganha a linha', () => {
        db.poemas = [
            { id: 2, titulo: 'Sem', texto: 'x', idioma: 'pt-BR' },
            { id: 3, titulo: 'Vazio', texto: 'x', idioma: 'pt-BR', jargaoGiria: [] },
        ];
        assert.doesNotMatch(gerarMarkdownExportacao(db.poemas), /Jargão e gíria/);
    });

    it('Prosa também', () => {
        db.prosas = [
            {
                id: 4,
                tipo: 'prosa',
                titulo: 'Conto',
                texto: 'x',
                jargaoGiria: ['Jargão corporativo'],
            },
        ];
        assert.match(
            gerarMarkdownExportacao(db.prosas),
            /- \*\*Jargão e gíria:\*\* Jargão corporativo\n/,
        );
    });
});

describe('Visualização', () => {
    it('mostra a linha depois de Idioma e some quando o campo está vazio', () => {
        const com = renderVisualizacaoHtml({
            id: 1,
            titulo: 'Gen Z',
            texto: 'x',
            idioma: 'pt-BR',
            jargaoGiria: ['Gíria de internet'],
        });
        assert.match(com, /Jargão e gíria/);
        assert.match(com, /Gíria de internet/);
        assert.ok(com.indexOf('Idioma') < com.indexOf('Jargão e gíria'));

        const sem = renderVisualizacaoHtml({ id: 2, titulo: 'Sem', texto: 'x', jargaoGiria: [] });
        assert.doesNotMatch(sem, /Jargão e gíria/);
    });
});

describe('.csv', () => {
    beforeEach(limpar);

    for (const tipo of ['poema', 'prosa']) {
        it(`${tipo}: tem a coluna jargao_giria, logo depois de dialetos, ligada ao campo jargaoGiria`, () => {
            const colunas = colunasTexto(tipo);
            const nomes = colunas.map((c) => c.cabecalho);
            assert.equal(nomes[nomes.indexOf('dialetos') + 1], 'jargao_giria');
            // Cobrança do guarda: o campo precisa estar declarado em alguma coluna.
            assert.ok(colunas.some((c) => c.campos.includes('jargaoGiria')));
        });
    }

    it('a linha junta os itens com o separador de listas', () => {
        const item = {
            id: 1,
            titulo: 'Gen Z',
            texto: 'verso',
            jargaoGiria: ['Gíria de internet', 'Gíria juvenil'],
        };
        const csv = gerarCsvTextos('poema', [montarRegistro('poema', item)], db);
        const l = linhaCsv(csv);
        assert.equal(l.jargao_giria, ['Gíria de internet', 'Gíria juvenil'].join(SEPARADOR_LISTA));
    });

    it('texto sem o campo sai com a célula vazia', () => {
        const csv = gerarCsvTextos(
            'poema',
            [montarRegistro('poema', { id: 2, titulo: 'Sem', texto: 'x' })],
            db,
        );
        assert.equal(linhaCsv(csv).jargao_giria, '');
    });
});

describe('.json (montarRegistro)', () => {
    it('o campo viaja intacto pelo espalhamento do item, em Poema e Prosa', () => {
        const lista = ['Gíria de internet', 'Linguagem de fandom'];
        assert.deepEqual(
            montarRegistro('poema', { id: 1, titulo: 'a', jargaoGiria: lista }).jargaoGiria,
            lista,
        );
        assert.deepEqual(
            montarRegistro('prosa', { id: 2, titulo: 'b', jargaoGiria: lista }).jargaoGiria,
            lista,
        );
    });
});
