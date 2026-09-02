import './helpers/localstorage-shim.js';
import './helpers/dom-shim.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { db } from '../js/db.js';
import { calcularBuracos, agruparElos, montarGrafosReferencias } from '../js/render-conexoes.js';

function resetarDb() {
    db.livros = [];
    db.partes = [];
    db.secoes = [];
    db.poemas = [];
    db.prosas = [];
    db.elementos = [];
    db.coletaneas = [];
    db.itensColetanea = [];
}

// ─── calcularBuracos ────────────────────────────────────────────

describe('calcularBuracos', () => {
    beforeEach(resetarDb);

    it('acervo vazio não tem buracos', () => {
        assert.deepEqual(calcularBuracos(), []);
    });

    it('elo com só um lado cadastrado vira um buraco', () => {
        db.poemas = [
            {
                id: 1,
                titulo: 'A',
                conceitos: {
                    elos: [{ id: 2, relacao: 'Reescrita', direcao: 'destino', texto: '' }],
                },
            },
            { id: 2, titulo: 'B', conceitos: { elos: [] } },
        ];
        const buracos = calcularBuracos();
        assert.equal(buracos.length, 1);
        assert.equal(buracos[0].deId, 1);
        assert.equal(buracos[0].paraId, 2);
        assert.equal(buracos[0].rotulo, 'Reescrita de');
    });

    it('elo com os dois lados cadastrados não é buraco', () => {
        db.poemas = [
            {
                id: 1,
                titulo: 'A',
                conceitos: {
                    elos: [{ id: 2, relacao: 'Resposta', direcao: 'destino', texto: '' }],
                },
            },
            {
                id: 2,
                titulo: 'B',
                conceitos: { elos: [{ id: 1, relacao: 'Resposta', direcao: 'origem', texto: '' }] },
            },
        ];
        assert.deepEqual(calcularBuracos(), []);
    });

    it('ignora elo apontando pra poema removido (id que não existe mais)', () => {
        db.poemas = [
            {
                id: 1,
                titulo: 'A',
                conceitos: { elos: [{ id: 999, relacao: 'Outro', direcao: '', texto: '' }] },
            },
        ];
        assert.deepEqual(calcularBuracos(), []);
    });
});

// ─── agruparElos ────────────────────────────────────────────────

describe('agruparElos', () => {
    beforeEach(resetarDb);

    it('sem elos, sem clusters', () => {
        db.poemas = [{ id: 1, titulo: 'A', conceitos: { elos: [] } }];
        assert.deepEqual(agruparElos(), []);
    });

    it('agrupa um par (2 poemas ligados) num cluster de tamanho 2', () => {
        db.poemas = [
            {
                id: 1,
                titulo: 'A',
                conceitos: { elos: [{ id: 2, relacao: 'Díptico', direcao: '', texto: '' }] },
            },
            { id: 2, titulo: 'B', conceitos: { elos: [] } },
        ];
        const clusters = agruparElos();
        assert.equal(clusters.length, 1);
        assert.equal(clusters[0].tamanho, 2);
        assert.deepEqual(new Set(clusters[0].ids), new Set([1, 2]));
    });

    it('agrupa uma cadeia de 3 poemas ligados num único cluster (não dois pares)', () => {
        db.poemas = [
            {
                id: 1,
                titulo: 'A',
                conceitos: {
                    elos: [{ id: 2, relacao: 'Variação', direcao: 'destino', texto: '' }],
                },
            },
            {
                id: 2,
                titulo: 'B',
                conceitos: {
                    elos: [{ id: 3, relacao: 'Variação', direcao: 'destino', texto: '' }],
                },
            },
            { id: 3, titulo: 'C', conceitos: { elos: [] } },
        ];
        const clusters = agruparElos();
        assert.equal(clusters.length, 1);
        assert.equal(clusters[0].tamanho, 3);
    });

    it('poema sem nenhum elo não aparece em nenhum cluster', () => {
        db.poemas = [
            {
                id: 1,
                titulo: 'A',
                conceitos: { elos: [{ id: 2, relacao: 'Outro', direcao: '', texto: '' }] },
            },
            { id: 2, titulo: 'B', conceitos: { elos: [] } },
            { id: 3, titulo: 'C (isolado)', conceitos: { elos: [] } },
        ];
        const clusters = agruparElos();
        const todosOsIds = clusters.flatMap((c) => c.ids);
        assert.equal(todosOsIds.includes(3), false);
    });
});

// ─── montarGrafosReferencias ─────────────────────────────────────

describe('montarGrafosReferencias', () => {
    beforeEach(resetarDb);

    it('sem referências, sem grafos', () => {
        db.poemas = [{ id: 1, titulo: 'A', conceitos: { referencias: [] } }];
        assert.deepEqual(montarGrafosReferencias(), []);
    });

    it('monta uma cadeia linear (sem ramificação nem convergência) mais novo → mais antigo', () => {
        // A referencia B, B referencia C, C referencia D — A → B → C → D
        db.poemas = [
            {
                id: 1,
                titulo: 'A',
                conceitos: { referencias: [{ id: 2, tipo: 'Aceno a', texto: '' }] },
            },
            {
                id: 2,
                titulo: 'B',
                conceitos: { referencias: [{ id: 3, tipo: 'Personagem em comum', texto: '' }] },
            },
            {
                id: 3,
                titulo: 'C',
                conceitos: { referencias: [{ id: 4, tipo: 'Outro', texto: '' }] },
            },
            { id: 4, titulo: 'D', conceitos: { referencias: [] } },
        ];
        const grafos = montarGrafosReferencias();
        assert.equal(grafos.length, 1);
        assert.equal(grafos[0].linear, true);
        assert.deepEqual(grafos[0].camadas, [[1], [2], [3], [4]]);
        assert.equal(grafos[0].nos.length, 4);
        assert.equal(grafos[0].arestas.length, 3);
    });

    it('regressão: convergência (mesmo poema referenciado por várias origens) vira um único nó, não um por caminho', () => {
        // Reproduz o caso relatado: "Sob o sol comum das horas" (1) tem
        // vários Acenos (pra 2 e direto pra 4), "[Insone]" (2) tem duas
        // referências de Imagem central compartilhada (pra 3 e direto
        // pra 4) — "Garoto Café" (4) é alcançado por 3 caminhos
        // diferentes. Antes, virava árvore e "Garoto Café" aparecia
        // repetido; agora é nó único, com uma aresta chegando de cada
        // origem.
        db.poemas = [
            {
                id: 1,
                titulo: 'Sob o sol comum das horas',
                conceitos: {
                    referencias: [
                        { id: 2, tipo: 'Aceno a', texto: '' },
                        { id: 4, tipo: 'Aceno a', texto: '' },
                    ],
                },
            },
            {
                id: 2,
                titulo: '[Insone]',
                conceitos: {
                    referencias: [
                        { id: 3, tipo: 'Imagem central compartilhada', texto: '' },
                        { id: 4, tipo: 'Imagem central compartilhada', texto: '' },
                    ],
                },
            },
            {
                id: 3,
                titulo: 'coffe breaks',
                conceitos: { referencias: [{ id: 4, tipo: 'Outro', texto: '' }] },
            },
            { id: 4, titulo: 'Garoto Café', conceitos: { referencias: [] } },
        ];
        const grafos = montarGrafosReferencias();
        assert.equal(grafos.length, 1);
        const grafo = grafos[0];

        // "Garoto Café" (id 4) é um único nó — não um por caminho.
        assert.equal(grafo.nos.filter((n) => n.id === 4).length, 1);
        assert.equal(grafo.nos.length, 4);
        // Nenhuma das 5 arestas originais foi descartada.
        assert.equal(grafo.arestas.length, 5);
        // Ramifica (1 tem 2 saídas) e converge (4 tem 3 entradas) — não é linear.
        assert.equal(grafo.linear, false);

        // "Garoto Café" fica na camada mais funda: o caminho mais longo
        // até ele é 1 → 2 → 3 → 4 (camada 3), mesmo com atalhos diretos
        // de 1 e de 2 chegando nele também.
        const camadaDoId = (id) => grafo.camadas.findIndex((c) => c.includes(id));
        assert.equal(camadaDoId(1), 0);
        assert.equal(camadaDoId(2), 1);
        assert.equal(camadaDoId(3), 2);
        assert.equal(camadaDoId(4), 3);
    });

    it('poema sem nenhuma referência não aparece em nenhum grafo', () => {
        db.poemas = [
            {
                id: 1,
                titulo: 'A',
                conceitos: { referencias: [{ id: 2, tipo: 'Outro', texto: '' }] },
            },
            { id: 2, titulo: 'B', conceitos: { referencias: [] } },
            { id: 3, titulo: 'C (isolado)', conceitos: { referencias: [] } },
        ];
        const grafos = montarGrafosReferencias();
        const todosOsIds = new Set(grafos.flatMap((g) => g.nos.map((n) => n.id)));
        assert.equal(todosOsIds.has(3), false);
    });

    it('mesmo sem uma raiz de grau de entrada zero (ciclo entre duas referências), todo nó envolvido aparece no grafo, sem perder nenhuma das arestas', () => {
        db.poemas = [
            {
                id: 1,
                titulo: 'A',
                conceitos: { referencias: [{ id: 2, tipo: 'Outro', texto: '' }] },
            },
            {
                id: 2,
                titulo: 'B',
                conceitos: { referencias: [{ id: 1, tipo: 'Outro', texto: '' }] },
            },
        ];
        const grafos = montarGrafosReferencias();
        assert.equal(grafos.length, 1);
        assert.deepEqual(new Set(grafos[0].nos.map((n) => n.id)), new Set([1, 2]));
        assert.equal(grafos[0].arestas.length, 2);
        // Ciclo de 2 (2 arestas pra 2 nós) não conta como cadeia linear
        // simples, mesmo que caia numa camada por nó — precisa do
        // diagrama pra não esconder uma das duas arestas.
        assert.equal(grafos[0].linear, false);
    });
});
