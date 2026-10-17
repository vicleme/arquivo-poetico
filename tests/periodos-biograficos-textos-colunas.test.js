import './helpers/localstorage-shim.js';
import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Esfera e Categoria dos Períodos Biográficos chegando às colunas dos textos
// (derivadas, o texto não guarda nada): colunas em Poemas e Prosas, ordenação e
// busca por `esfera:` e `categoria:` (que já existiam). Período oculto não
// entra, igual à busca.

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
    { id: 1, nome: 'Faculdade', autorId: 1, esferas: ['Acadêmica'], categorias: ['Novo começo'] },
    {
        id: 2,
        nome: 'Mudança',
        autorId: 1,
        esferas: ['Moradia/Mudança', 'Afetiva'],
        categorias: ['Transição ou mudança', 'Novo começo'],
    },
    { id: 3, nome: 'Sem nada', autorId: 1, esferas: [], categorias: [] },
    {
        id: 4,
        nome: 'Escondido',
        autorId: 1,
        oculto: true,
        esferas: ['Saúde'],
        categorias: ['Crise'],
    },
];

const poema = (id, epocaIds) => ({
    id,
    titulo: `P${id}`,
    epocaRetratada: epocaIds.length ? { periodos: epocaIds.map((epocaId) => ({ epocaId })) } : null,
});

function zerar() {
    db.epocas = cadastro();
    db.periodosHistoricos = [];
    db.movimentosEscolas = [];
    db.autores = [{ id: 1, nome: 'Ana' }];
    db.poemas = [];
    db.prosas = [];
    resetarColunas('poemas');
}

describe('colunas Esfera e Categoria do Período Biográfico', () => {
    beforeEach(zerar);

    it('estão em Poemas e Prosas, logo depois do Período Biográfico Retratado, desligadas', () => {
        for (const tabela of ['poemas', 'prosas']) {
            const chaves = DEFINICAO_COLUNAS[tabela].map((c) => c.key);
            const i = chaves.indexOf('epocaRetratada');
            assert.equal(chaves[i + 1], 'esferaPeriodoBiografico', tabela);
            assert.equal(chaves[i + 2], 'categoriaPeriodoBiografico', tabela);
            const col = DEFINICAO_COLUNAS[tabela].find((c) => c.key === 'esferaPeriodoBiografico');
            assert.equal(col.default, false);
            assert.equal(col.label, 'Esfera do Período Biográfico');
        }
    });

    function celula(rotulo, linha = 0) {
        const cabecalhos = Array.from(document.querySelectorAll('#cabecalho-poemas th'));
        const i = cabecalhos.findIndex((th) => th.textContent.includes(rotulo));
        assert.ok(i >= 0, `coluna "${rotulo}" deveria estar no cabeçalho`);
        return document.querySelectorAll('#lista-poemas tr')[linha].querySelectorAll('td')[i];
    }
    const selos = (td) => [...td.querySelectorAll('span')].map((s) => s.textContent.trim());

    it('mostram um selo por valor, sem repetir, e traço quando não há', () => {
        db.poemas = [poema(1, [1, 2]), poema(2, []), poema(3, [3])];
        toggleColuna('poemas', 'esferaPeriodoBiografico', true);
        toggleColuna('poemas', 'categoriaPeriodoBiografico', true);
        renderPoemas();
        assert.deepEqual(selos(celula('Esfera do Período Biográfico', 0)), [
            'Acadêmica',
            'Moradia/Mudança',
            'Afetiva',
        ]);
        assert.deepEqual(selos(celula('Categoria do Período Biográfico', 0)), [
            'Novo começo',
            'Transição ou mudança',
        ]);
        assert.equal(celula('Esfera do Período Biográfico', 1).textContent.trim(), '—');
        assert.equal(celula('Categoria do Período Biográfico', 2).textContent.trim(), '—');
    });

    it('período oculto não entra na coluna, igual à busca', () => {
        db.poemas = [poema(1, [1, 4])];
        toggleColuna('poemas', 'esferaPeriodoBiografico', true);
        toggleColuna('poemas', 'categoriaPeriodoBiografico', true);
        renderPoemas();
        assert.deepEqual(selos(celula('Esfera do Período Biográfico', 0)), ['Acadêmica']);
        assert.deepEqual(selos(celula('Categoria do Período Biográfico', 0)), ['Novo começo']);
        const lista = db.poemas.map((p) => decorarCamposBusca(p, 'poemas'));
        assert.deepEqual(ids(filtrarTextos(lista, 'esfera:saúde')), []);
        assert.deepEqual(ids(filtrarTextos(lista, 'categoria:crise')), []);
    });

    it('ordenam pelo texto dos valores (vazio por último)', () => {
        db.poemas = [poema(1, [1]), poema(2, []), poema(3, [2])];
        toggleColuna('poemas', 'esferaPeriodoBiografico', true);
        renderPoemas();
        ordenarPor('poemas', 'esferaPeriodoBiografico');
        const titulos = [...document.querySelectorAll('#lista-poemas tr')].map(
            (tr) => tr.textContent.match(/P\d/)?.[0],
        );
        // "Acadêmica" (P1) antes de "Moradia/Mudança, Afetiva" (P3); vazio por último.
        assert.deepEqual(titulos, ['P1', 'P3', 'P2']);
    });

    it('a busca esfera: e categoria: acha pelo cadastro e segue o que for renomeado', () => {
        db.poemas = [poema(1, [1]), poema(2, [2]), poema(3, [1, 2]), poema(4, [])];
        const lista = () => db.poemas.map((p) => decorarCamposBusca(p, 'poemas'));
        assert.deepEqual(ids(filtrarTextos(lista(), 'categoria:"novo começo"')), [1, 2, 3]);
        assert.deepEqual(ids(filtrarTextos(lista(), 'esfera:afetiva')), [2, 3]);
        db.epocas[0].esferas = ['Estudos'];
        assert.deepEqual(ids(filtrarTextos(lista(), 'esfera:estudos')), [1, 3]);
        assert.deepEqual(ids(filtrarTextos(lista(), 'esfera:acadêmica')), []);
    });

    it('têm forma canônica (alimenta o atalho de lupa da coluna)', () => {
        assert.equal(PREFIXOS_CANONICOS_POR_CAMPO._buscaEsferas, 'esfera');
        assert.equal(PREFIXOS_CANONICOS_POR_CAMPO._buscaCategorias, 'categoria');
    });
});
