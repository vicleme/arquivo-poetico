import './helpers/localstorage-shim.js';
import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Busca por corrente literária com divisões: `movimento:Romantismo` acha
// também o que está ligado a uma geração ou vertente dele; `movimento:
// "Romantismo no Brasil"` não acha o que é de Portugal; e `movimentodireto:`
// restringe ao que foi ligado diretamente.
const { db } = await import('../js/db.js');
const { filtrarTextos } = await import('../js/utils.js');
const { decorarCamposBusca } = await import('../js/render-listas.js');
const { filtrarAutores } = await import('../js/busca-autores.js');
const { nomesDeBuscaDasCorrentes, impactoDaCorrente } =
    await import('../js/correntes-hierarquia.js');

const ids = (lista) => lista.map((i) => i.id);

function corrente(id, nome, paiId = null) {
    return { id, nome, paiId, divisao: paiId ? 'Fase ou geração' : '', generoDivisao: '' };
}

function zerar() {
    db.movimentosEscolas = [
        corrente(1, 'Romantismo'),
        corrente(2, 'Romantismo no Brasil', 1),
        corrente(3, '3ª geração: Condoreira (Brasil)', 2),
        corrente(4, 'Romance urbano (Brasil)', 2),
        corrente(5, 'Romantismo em Portugal', 1),
        corrente(6, '2ª geração: Ultrarromântica (Portugal)', 5),
        corrente(7, 'Realismo'),
    ];
    db.autores = [];
    db.poemas = [];
    db.prosas = [];
}

const texto = (id, movimentosEscolasIds) => ({ id, titulo: `T${id}`, movimentosEscolasIds });

describe('nomesDeBuscaDasCorrentes', () => {
    beforeEach(zerar);

    it('sem ancestrais devolve só os nomes ligados', () => {
        assert.deepEqual(nomesDeBuscaDasCorrentes(db.movimentosEscolas, [3]), [
            '3ª geração: Condoreira (Brasil)',
        ]);
    });

    it('com ancestrais soma a cadeia inteira, sem repetir', () => {
        assert.deepEqual(
            nomesDeBuscaDasCorrentes(db.movimentosEscolas, [3, 4], { comAncestrais: true }),
            [
                '3ª geração: Condoreira (Brasil)',
                'Romantismo no Brasil',
                'Romantismo',
                'Romance urbano (Brasil)',
            ],
        );
    });

    it('ignora id inexistente', () => {
        assert.deepEqual(nomesDeBuscaDasCorrentes(db.movimentosEscolas, [999, 7]), ['Realismo']);
    });
});

describe('movimento: em textos', () => {
    let itens;
    beforeEach(() => {
        zerar();
        itens = [
            texto(1, [3]), // geração brasileira
            texto(2, [4]), // vertente brasileira
            texto(3, [6]), // geração portuguesa
            texto(4, [1]), // só o Romantismo
            texto(5, [7]), // Realismo
            texto(6, []),
        ].map((i) => decorarCamposBusca(i));
    });

    it('a corrente-mãe acha o que está nas divisões', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'movimento:Romantismo')), [1, 2, 3, 4]);
    });

    it('a variante regional não mistura os países', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'movimento:"Romantismo no Brasil"')), [1, 2]);
        assert.deepEqual(ids(filtrarTextos(itens, 'movimento:"Romantismo em Portugal"')), [3]);
    });

    it('a divisão acha só a si mesma', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'movimento:condoreira')), [1]);
    });

    it('escola: é sinônimo de movimento:', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'escola:"Romantismo no Brasil"')), [1, 2]);
    });

    it('movimentodireto: só acha o que foi ligado diretamente', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'movimentodireto:condoreira')), [1]);
        assert.deepEqual(ids(filtrarTextos(itens, 'movimentodireto:Realismo')), [5]);
        // O nome do pai só aparece na busca hierárquica.
        assert.deepEqual(ids(filtrarTextos(itens, 'movimentodireto:"Romantismo no Brasil"')), []);
    });

    it('exclusão e combinação funcionam', () => {
        assert.deepEqual(
            ids(filtrarTextos(itens, 'movimento:Romantismo -movimento:"Romantismo em Portugal"')),
            [1, 2, 4],
        );
    });
});

describe('movimento: em autores', () => {
    beforeEach(() => {
        zerar();
        db.autores = [
            { id: 1, nome: 'Castro Alves', movimentosEscolasIds: [3] },
            { id: 2, nome: 'Camilo', movimentosEscolasIds: [6] },
            { id: 3, nome: 'Eça', movimentosEscolasIds: [7] },
        ];
    });

    it('o autor de uma geração acha pela corrente-mãe, sem misturar países', () => {
        assert.deepEqual(ids(filtrarAutores(db.autores, 'movimento:Romantismo')), [1, 2]);
        assert.deepEqual(ids(filtrarAutores(db.autores, 'movimento:"Romantismo no Brasil"')), [1]);
    });

    it('movimentodireto: restringe ao vínculo exato', () => {
        assert.deepEqual(ids(filtrarAutores(db.autores, 'movimentodireto:condoreira')), [1]);
        assert.deepEqual(ids(filtrarAutores(db.autores, 'movimentodireto:Romantismo')), []);
    });
});

describe('impactoDaCorrente com divisões (base do "Ver textos" e "Ver autores")', () => {
    beforeEach(() => {
        zerar();
        db.autores = [{ id: 1, movimentosEscolasIds: [3] }];
        db.poemas = [{ id: 10, movimentosEscolasIds: [3] }];
        db.prosas = [{ id: 20, movimentosEscolasIds: [4] }];
    });

    it('o pai sem vínculo direto abre a lista com o que está nas divisões', () => {
        const direto = impactoDaCorrente(db, 1);
        assert.deepEqual([direto.autoresIds, direto.poemasIds, direto.prosasIds], [[], [], []]);
        const todo = impactoDaCorrente(db, 1, { comDivisoes: true });
        assert.deepEqual(todo.autoresIds, [1]);
        assert.deepEqual(todo.poemasIds, [10]);
        assert.deepEqual(todo.prosasIds, [20]);
    });
});
