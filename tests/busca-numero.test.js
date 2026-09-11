import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mesma base mínima de DOM usada em colunas-contagem-estrutura-linha.test.js
document.body.innerHTML = `
    <main>
        <div id="lista-livros"></div>
        <div id="barra-acoes-poemas" class="hidden">
            <span id="contador-selecao-poemas"></span>
        </div>
        <div id="barra-acoes-prosas" class="hidden">
            <span id="contador-selecao-prosas"></span>
        </div>
        <div id="painel-colunas-poemas"></div>
        <div id="painel-acoes-poemas"></div>
        <div id="painel-colunas-prosas"></div>
        <div id="painel-acoes-prosas"></div>
        <select id="filtro-livro-poemas"></select>
        <select id="filtro-livro-prosas"></select>
        <table>
            <thead><tr id="cabecalho-poemas"></tr></thead>
            <tbody id="lista-poemas"></tbody>
        </table>
        <div id="paginacao-poemas"></div>
        <table>
            <thead><tr id="cabecalho-prosas"></tr></thead>
            <tbody id="lista-prosas"></tbody>
        </table>
        <div id="paginacao-prosas"></div>
    </main>
`;

const { db } = await import('../js/db.js');
const rl = await import('../js/render-listas.js');
const {
    getListaVisivelPoemas,
    getListaVisivelProsas,
    setFiltroNumeroPoemas,
    setFiltroNumeroProsas,
    setFiltroLivroPoemas,
    setFiltroPoemas,
} = rl;
const { resetarColunas } = await import('../js/colunas.js');
await import('../js/main.js');

function limparDb() {
    db.livros.length = 0;
    db.partes.length = 0;
    db.secoes.length = 0;
    db.poemas.length = 0;
    db.prosas.length = 0;
    resetarColunas('poemas');
    resetarColunas('prosas');
    setFiltroLivroPoemas('');
    setFiltroPoemas('');
    setFiltroNumeroPoemas('');
    setFiltroNumeroProsas('');
}

describe('Busca por Nº (Caixa B) — filtra pela numeração de estrutura (_numEstrutura)', () => {
    beforeEach(limparDb);

    it('seleciona só os itens cujo _numEstrutura está na lista digitada', () => {
        db.livros.push({ id: 1, titulo: 'Livro Único', sequencia: 1 });
        db.poemas.push(
            { id: 10, titulo: 'Um', paiTipo: 'livro', paiId: 1, sequencia: 1 },
            { id: 11, titulo: 'Dois', paiTipo: 'livro', paiId: 1, sequencia: 2 },
            { id: 12, titulo: 'Três', paiTipo: 'livro', paiId: 1, sequencia: 3 },
            { id: 13, titulo: 'Quatro', paiTipo: 'livro', paiId: 1, sequencia: 4 },
        );

        setFiltroNumeroPoemas('2,4');
        const visiveis = getListaVisivelPoemas();

        assert.deepEqual(visiveis.map((p) => p.titulo).sort(), ['Dois', 'Quatro']);
        assert.deepEqual(visiveis.map((p) => p._numEstrutura).sort(), [2, 4]);
    });

    it('sem nada digitado na Caixa B, não filtra nada', () => {
        db.livros.push({ id: 1, titulo: 'Livro Único', sequencia: 1 });
        db.poemas.push(
            { id: 10, titulo: 'Um', paiTipo: 'livro', paiId: 1, sequencia: 1 },
            { id: 11, titulo: 'Dois', paiTipo: 'livro', paiId: 1, sequencia: 2 },
        );

        assert.equal(getListaVisivelPoemas().length, 2);
    });

    it('combina número + prefixo (ex. titulo:) — recorta DENTRO do conjunto de números, sem deslocar a numeração', () => {
        db.livros.push({ id: 1, titulo: 'Livro Único', sequencia: 1 });
        db.poemas.push(
            { id: 10, titulo: 'Aurora', paiTipo: 'livro', paiId: 1, sequencia: 1 },
            { id: 11, titulo: 'Bruma', paiTipo: 'livro', paiId: 1, sequencia: 2 },
            { id: 12, titulo: 'Aurora Nova', paiTipo: 'livro', paiId: 1, sequencia: 3 },
        );

        // Números 1 e 3 = "Aurora" e "Aurora Nova"; título "aurora"
        // bate nos dois, então o recorte por prefixo não tira nenhum.
        setFiltroNumeroPoemas('1,3 titulo:aurora');
        let visiveis = getListaVisivelPoemas();
        assert.deepEqual(visiveis.map((p) => p.titulo).sort(), ['Aurora', 'Aurora Nova']);

        // Mesmos números, mas agora um prefixo que só bate num dos dois.
        setFiltroNumeroPoemas('1,3 titulo:nova');
        visiveis = getListaVisivelPoemas();
        assert.deepEqual(
            visiveis.map((p) => p.titulo),
            ['Aurora Nova'],
        );
        // A numeração usada continua sendo a de estrutura inteira (3),
        // não "1" (posição dentro do recorte já filtrado) — prova de que
        // o prefixo só filtrou o resultado, não recalculou _numEstrutura.
        assert.equal(visiveis[0]._numEstrutura, 3);
    });

    it('ordem dos termos dentro da Caixa B não importa (número antes ou depois do prefixo dá o mesmo resultado)', () => {
        db.livros.push({ id: 1, titulo: 'Livro Único', sequencia: 1 });
        db.poemas.push(
            { id: 10, titulo: 'Aurora', paiTipo: 'livro', paiId: 1, sequencia: 1 },
            { id: 11, titulo: 'Bruma', paiTipo: 'livro', paiId: 1, sequencia: 2 },
            { id: 12, titulo: 'Aurora Nova', paiTipo: 'livro', paiId: 1, sequencia: 3 },
        );

        setFiltroNumeroPoemas('1,3 titulo:nova');
        const resultadoA = getListaVisivelPoemas().map((p) => p.id);

        setFiltroNumeroPoemas('titulo:nova 1,3');
        const resultadoB = getListaVisivelPoemas().map((p) => p.id);

        assert.deepEqual(resultadoA, resultadoB);
    });

    it('a Caixa A (busca de metadados) continua deslocando a numeração normalmente — só a Caixa B não desloca', () => {
        db.livros.push({ id: 1, titulo: 'Livro Único', sequencia: 1 });
        db.poemas.push(
            { id: 10, titulo: 'Aurora', paiTipo: 'livro', paiId: 1, sequencia: 1 },
            { id: 11, titulo: 'Bruma', paiTipo: 'livro', paiId: 1, sequencia: 2 },
            { id: 12, titulo: 'Aurora Nova', paiTipo: 'livro', paiId: 1, sequencia: 3 },
        );

        // Sem filtro de Caixa A: "Aurora Nova" é o item nº 3.
        assert.equal(
            getListaVisivelPoemas().find((p) => p.titulo === 'Aurora Nova')._numEstrutura,
            3,
        );

        // Com "Bruma" excluído via Caixa A (metadados), a numeração se
        // reorganiza: "Aurora Nova" passa a ser o nº 2.
        setFiltroPoemas('-Bruma');
        assert.equal(
            getListaVisivelPoemas().find((p) => p.titulo === 'Aurora Nova')._numEstrutura,
            2,
        );
    });

    it('funciona igual em Prosas, de forma independente de Poemas', () => {
        db.livros.push({ id: 1, titulo: 'Livro Único', sequencia: 1 });
        db.prosas.push(
            { id: 20, titulo: 'Um', paiTipo: 'livro', paiId: 1, sequencia: 1 },
            { id: 21, titulo: 'Dois', paiTipo: 'livro', paiId: 1, sequencia: 2 },
            { id: 22, titulo: 'Três', paiTipo: 'livro', paiId: 1, sequencia: 3 },
        );

        setFiltroNumeroProsas('1,3');
        const visiveis = getListaVisivelProsas();
        assert.deepEqual(visiveis.map((pr) => pr.titulo).sort(), ['Três', 'Um']);
    });
});
