import './helpers/localstorage-shim.js';
import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Esfera e Categoria dos Períodos Históricos chegando aos textos (derivadas,
// o texto não guarda nada): colunas em Poemas e Prosas, ordenação e busca
// por `esferahistorica:` e `categoriahistorica:`.

document.body.innerHTML = `
    <main>
        <div id="lista-livros"></div>
        <div id="barra-acoes-poemas" class="hidden"><span id="contador-selecao-poemas"></span></div>
        <div id="painel-colunas-poemas"></div>
        <div id="painel-acoes-poemas"></div>
        <select id="filtro-livro-poemas"></select>
        <table>
            <thead><tr id="cabecalho-poemas"></tr></thead>
            <tbody id="lista-poemas"></tbody>
        </table>
        <div id="paginacao-poemas"></div>
    </main>
`;

const { db } = await import('../js/db.js');
const { filtrarTextos, PREFIXOS_CANONICOS_POR_CAMPO } = await import('../js/utils.js');
const { decorarCamposBusca, renderPoemas, ordenarPor } = await import('../js/render-listas.js');
const { toggleColuna, resetarColunas, DEFINICAO_COLUNAS } = await import('../js/colunas.js');
await import('../js/main.js');

const ids = (lista) => lista.map((i) => i.id);

const cadastro = () => [
    {
        id: 1,
        nome: 'Guerra Fria',
        regiao: [],
        esferas: ['Política'],
        categorias: ['Guerra e conflito'],
        pertenceA: [],
    },
    {
        id: 2,
        nome: 'Belle Époque',
        regiao: [],
        esferas: ['Artística e cultural', 'Social'],
        categorias: ['Movimento artístico'],
        pertenceA: [],
    },
    { id: 3, nome: 'Sem nada', regiao: [], esferas: [], categorias: [], pertenceA: [] },
];

const poema = (id, periodosHistoricosIds) => ({ id, titulo: `P${id}`, periodosHistoricosIds });

function zerar() {
    db.periodosHistoricos = cadastro();
    db.movimentosEscolas = [];
    db.autores = [];
    db.poemas = [];
    db.prosas = [];
    resetarColunas('poemas');
}

describe('busca esferahistorica: e categoriahistorica:', () => {
    beforeEach(zerar);

    function decorados() {
        db.poemas = [poema(1, [1]), poema(2, [2]), poema(3, [1, 2]), poema(4, [3]), poema(5, [])];
        return db.poemas.map((p) => decorarCamposBusca(p, 'poemas'));
    }

    it('esferahistorica: acha pela esfera de qualquer período do texto', () => {
        const lista = decorados();
        assert.deepEqual(ids(filtrarTextos(lista, 'esferahistorica:política')), [1, 3]);
        assert.deepEqual(ids(filtrarTextos(lista, 'esferahistorica:social')), [2, 3]);
    });

    it('categoriahistorica: acha pela categoria, com aspas para nome com espaço', () => {
        const lista = decorados();
        assert.deepEqual(
            ids(filtrarTextos(lista, 'categoriahistorica:"guerra e conflito"')),
            [1, 3],
        );
        assert.deepEqual(
            ids(filtrarTextos(lista, 'categoriahistorica:"movimento artístico"')),
            [2, 3],
        );
    });

    it('presença: :* acha quem tem alguma, -:* quem não tem (período sem classificação conta como sem)', () => {
        const lista = decorados();
        assert.deepEqual(ids(filtrarTextos(lista, 'esferahistorica:*')), [1, 2, 3]);
        assert.deepEqual(ids(filtrarTextos(lista, '-esferahistorica:*')), [4, 5]);
        assert.deepEqual(ids(filtrarTextos(lista, '-categoriahistorica:*')), [4, 5]);
    });

    it('não se confunde com esfera: e categoria: (período biográfico)', () => {
        const lista = decorados();
        assert.deepEqual(ids(filtrarTextos(lista, 'esfera:política')), []);
        assert.deepEqual(ids(filtrarTextos(lista, 'categoria:"guerra e conflito"')), []);
    });

    it('fora da busca sem prefixo', () => {
        const lista = decorados();
        assert.deepEqual(ids(filtrarTextos(lista, 'política')), []);
    });

    it('renomear a esfera no cadastro vale para todos os textos, sem vínculo órfão', () => {
        db.poemas = [poema(1, [1])];
        db.periodosHistoricos[0].esferas = ['Diplomacia'];
        const lista = db.poemas.map((p) => decorarCamposBusca(p, 'poemas'));
        assert.deepEqual(ids(filtrarTextos(lista, 'esferahistorica:diplomacia')), [1]);
        assert.deepEqual(ids(filtrarTextos(lista, 'esferahistorica:política')), []);
    });

    it('têm forma canônica (alimenta o atalho de lupa da coluna)', () => {
        assert.equal(PREFIXOS_CANONICOS_POR_CAMPO._buscaEsferasHistoricas, 'esferahistorica');
        assert.equal(PREFIXOS_CANONICOS_POR_CAMPO._buscaCategoriasHistoricas, 'categoriahistorica');
    });
});

describe('colunas Esfera e Categoria do Período Histórico', () => {
    beforeEach(zerar);

    it('estão em Poemas e Prosas, logo depois do Período Histórico Retratado, desligadas', () => {
        for (const tabela of ['poemas', 'prosas']) {
            const chaves = DEFINICAO_COLUNAS[tabela].map((c) => c.key);
            const i = chaves.indexOf('periodoHistoricoId');
            assert.equal(chaves[i + 1], 'esferaPeriodoHistorico', tabela);
            assert.equal(chaves[i + 2], 'categoriaPeriodoHistorico', tabela);
            const col = DEFINICAO_COLUNAS[tabela].find((c) => c.key === 'esferaPeriodoHistorico');
            assert.equal(col.default, false);
            assert.equal(col.label, 'Esfera do Período Histórico');
        }
    });

    function celula(rotulo, linha = 0) {
        const cabecalhos = Array.from(document.querySelectorAll('#cabecalho-poemas th'));
        const i = cabecalhos.findIndex((th) => th.textContent.includes(rotulo));
        assert.ok(i >= 0, `coluna "${rotulo}" deveria estar no cabeçalho`);
        return document.querySelectorAll('#lista-poemas tr')[linha].querySelectorAll('td')[i];
    }

    it('mostram um selo por valor, sem repetir, e traço quando não há', () => {
        db.poemas = [poema(1, [1, 2]), poema(2, []), poema(3, [3])];
        toggleColuna('poemas', 'esferaPeriodoHistorico', true);
        toggleColuna('poemas', 'categoriaPeriodoHistorico', true);
        renderPoemas();
        const selos = (td) => [...td.querySelectorAll('span')].map((s) => s.textContent.trim());
        assert.deepEqual(selos(celula('Esfera do Período Histórico', 0)), [
            'Política',
            'Artística e cultural',
            'Social',
        ]);
        assert.deepEqual(selos(celula('Categoria do Período Histórico', 0)), [
            'Guerra e conflito',
            'Movimento artístico',
        ]);
        assert.equal(celula('Esfera do Período Histórico', 1).textContent.trim(), '—');
        assert.equal(celula('Categoria do Período Histórico', 2).textContent.trim(), '—');
    });

    it('ordenam pelo texto dos valores (vazio por último)', () => {
        db.poemas = [poema(1, [1]), poema(2, []), poema(3, [2])];
        toggleColuna('poemas', 'esferaPeriodoHistorico', true);
        renderPoemas();
        ordenarPor('poemas', 'esferaPeriodoHistorico');
        const titulos = [...document.querySelectorAll('#lista-poemas tr')].map(
            (tr) => tr.textContent.match(/P\d/)?.[0],
        );
        // "Artística e cultural, Social" (P3) antes de "Política" (P1); vazio por último.
        assert.deepEqual(titulos, ['P3', 'P1', 'P2']);
    });
});
