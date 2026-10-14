import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Fluxo de UI dos filtros De/Até + "sem data" nas abas de período: controles
// montados uma vez, re-render só da lista, cabeçalhos de autor a partir da
// lista já filtrada.
document.body.innerHTML = `
    <main>
        <div id="filtros-periodo-epocas"></div>
        <div id="lista-epocas"></div>
        <div id="filtros-periodo-periodosHistoricos"></div>
        <div id="lista-periodos-historicos"></div>
        <div id="filtros-periodo-movimentosEscolas"></div>
        <div id="lista-movimentos-escolas"></div>
    </main>
`;

const { db } = await import('../js/db.js');
const { renderEpocas, renderPeriodosHistoricos, renderMovimentosEscolas, setFiltroPeriodo } =
    await import('../js/render-listas.js');

const definir = (id, valor) => {
    document.getElementById(id).value = valor;
};
const titulos = (idLista) =>
    [...document.querySelectorAll(`#${idLista} h4`)].map((h) => h.textContent.trim());

// Cópia funda do seed real de Movimento/Escola, tirada antes de qualquer teste
// mexer nele — cada `beforeEach` restaura `db.movimentosEscolas` a partir
// daqui, pra um teste que dá `push` (ex.: o de "Sem data alguma" logo abaixo)
// não vazar item pros testes seguintes do mesmo arquivo.
const seedMovimentosEscolasOriginal = structuredClone(db.movimentosEscolas);

describe('filtros dos cadastros de período (UI)', () => {
    beforeEach(() => {
        db.autores = [
            { id: 1, nome: 'Ana' },
            { id: 2, nome: 'Bruno' },
        ];
        db.epocas = [
            { id: 10, nome: 'Infância', autorId: 1, inicio: { ano: 1990 }, fim: { ano: 2000 } },
            { id: 11, nome: 'Luto', autorId: 1, inicio: null, fim: null },
            { id: 12, nome: 'Faculdade', autorId: 2, inicio: { ano: 2010 }, fim: { ano: 2014 } },
        ];
        db.periodosHistoricos = [
            { id: 20, nome: 'Guerra', notas: '', inicio: { ano: 1939 }, fim: { ano: 1945 } },
            { id: 21, nome: 'Sem data', notas: '', inicio: null, fim: null },
        ];
        db.movimentosEscolas = structuredClone(seedMovimentosEscolasOriginal);
        renderEpocas();
        renderPeriodosHistoricos();
        renderMovimentosEscolas();
        // volta os filtros ao estado inicial entre testes
        ['epocas', 'periodosHistoricos', 'movimentosEscolas'].forEach((aba) => {
            definir(`fp-${aba}-nome`, '');
            definir(`fp-${aba}-de`, '');
            definir(`fp-${aba}-ate`, '');
            definir(`fp-${aba}-modo`, 'todos');
            if (aba === 'epocas') definir('fp-epocas-autor', '');
            setFiltroPeriodo(aba);
        });
    });

    it('monta os controles uma única vez e o card mostra o intervalo cadastrado', () => {
        assert.ok(document.getElementById('fp-epocas-autor'));
        // Autor, Esfera, Categoria, Pessoa, Natureza, Vínculo e o modo de data.
        assert.equal(document.querySelectorAll('#filtros-periodo-epocas select').length, 7);
        renderEpocas();
        assert.equal(document.querySelectorAll('#filtros-periodo-epocas select').length, 7);
        assert.match(document.getElementById('lista-epocas').textContent, /1990/);
    });

    it('filtro por autor deixa só as épocas do autor, e o cabeçalho do outro some', () => {
        definir('fp-epocas-autor', '2');
        setFiltroPeriodo('epocas');
        assert.deepEqual(titulos('lista-epocas'), ['Faculdade']);
        const cabecalhos = [...document.querySelectorAll('#lista-epocas h3')].map((h) =>
            h.textContent.trim(),
        );
        assert.deepEqual(cabecalhos, ['Bruno']);
    });

    it('busca por nome ignora maiúsculas e acentos, nas três abas', () => {
        definir('fp-epocas-nome', 'INFANCIA');
        setFiltroPeriodo('epocas');
        assert.deepEqual(titulos('lista-epocas'), ['Infância']);

        definir('fp-periodosHistoricos-nome', 'gue');
        setFiltroPeriodo('periodosHistoricos');
        assert.deepEqual(titulos('lista-periodos-historicos'), ['Guerra']);

        definir('fp-movimentosEscolas-nome', 'romantismo');
        setFiltroPeriodo('movimentosEscolas');
        assert.ok(titulos('lista-movimentos-escolas').every((t) => /romantismo/i.test(t)));
        assert.ok(titulos('lista-movimentos-escolas').length > 0);
    });

    it('busca por nome combina com os outros filtros e, sem resultado, diz que é por causa do filtro', () => {
        definir('fp-epocas-nome', 'a');
        definir('fp-epocas-autor', '2');
        setFiltroPeriodo('epocas');
        assert.deepEqual(titulos('lista-epocas'), ['Faculdade']);

        definir('fp-periodosHistoricos-nome', 'zzz');
        setFiltroPeriodo('periodosHistoricos');
        assert.match(
            document.getElementById('lista-periodos-historicos').textContent,
            /com esse filtro/,
        );
    });

    it('"Só sem data" lista o que falta preencher e desabilita De/Até', () => {
        definir('fp-epocas-modo', 'sem-data');
        setFiltroPeriodo('epocas');
        assert.deepEqual(titulos('lista-epocas'), ['Luto']);
        assert.equal(document.getElementById('fp-epocas-de').disabled, true);
        assert.equal(document.getElementById('fp-epocas-ate').disabled, true);
    });

    it('De/Até por sobreposição em Período Histórico; "Só com data" esconde os sem data', () => {
        definir('fp-periodosHistoricos-de', '1944');
        definir('fp-periodosHistoricos-ate', '1950');
        definir('fp-periodosHistoricos-modo', 'com-data');
        setFiltroPeriodo('periodosHistoricos');
        assert.deepEqual(titulos('lista-periodos-historicos'), ['Guerra']);
    });

    it('texto de data inválido vale como campo vazio (sem erro)', () => {
        definir('fp-periodosHistoricos-de', 'abc');
        setFiltroPeriodo('periodosHistoricos');
        assert.deepEqual(titulos('lista-periodos-historicos').sort(), ['Guerra', 'Sem data']);
    });

    it('lista vazia por causa do filtro diz isso, em vez de "nenhum cadastrado"', () => {
        definir('fp-periodosHistoricos-de', '2100');
        definir('fp-periodosHistoricos-modo', 'com-data');
        setFiltroPeriodo('periodosHistoricos');
        assert.match(
            document.getElementById('lista-periodos-historicos').textContent,
            /com esse filtro/,
        );
    });

    it('Movimento/Escola: seed completo aparece; "Só sem data" esvazia (todos têm data)', () => {
        db.movimentosEscolas = [
            ...db.movimentosEscolas,
            { id: 999, nome: 'Sem data alguma', inicio: null, fim: null },
        ];
        definir('fp-movimentosEscolas-modo', 'sem-data');
        setFiltroPeriodo('movimentosEscolas');
        assert.deepEqual(titulos('lista-movimentos-escolas'), ['Sem data alguma']);
    });

    // Bug relatado por Victor (27/09/2026): filtrar De "1500" Até "1600"
    // mostrava os 22 movimentos pré-cadastrados inteiros, sem filtrar nada
    // — causa era parseFiltroDataRapido (utils.js) rejeitando qualquer ano
    // fora de 1900-2100 e devolvendo null, que setFiltroPeriodo trata como
    // "sem filtro". Corrigido lá; este teste trava o comportamento certo
    // usando o seed de verdade (Humanismo termina em 1500 — século XV —,
    // Classicismo/Quinhentismo começa em 1550, os únicos dois que tocam
    // essa janela).
    it('De/Até em Movimento/Escola aceita ano pré-1900 (regressão do bug de 1500-1600)', () => {
        definir('fp-movimentosEscolas-de', '1500');
        definir('fp-movimentosEscolas-ate', '1600');
        setFiltroPeriodo('movimentosEscolas');
        assert.deepEqual(titulos('lista-movimentos-escolas').sort(), [
            'Classicismo (Quinhentismo)',
            'Humanismo',
        ]);
    });
});
