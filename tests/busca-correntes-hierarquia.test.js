import './helpers/localstorage-shim.js';
import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Busca por corrente literária com divisões: `corrente:Romantismo` acha
// também o que está ligado a uma geração ou vertente dele; `corrente:
// "Romantismo no Brasil"` não acha o que é de Portugal; e `correntedireta:`
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

describe('corrente: em textos', () => {
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
        assert.deepEqual(ids(filtrarTextos(itens, 'corrente:Romantismo')), [1, 2, 3, 4]);
    });

    it('a variante regional não mistura os países', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'corrente:"Romantismo no Brasil"')), [1, 2]);
        assert.deepEqual(ids(filtrarTextos(itens, 'corrente:"Romantismo em Portugal"')), [3]);
    });

    it('a divisão acha só a si mesma', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'corrente:condoreira')), [1]);
    });

    it('correntedireta: só acha o que foi ligado diretamente', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'correntedireta:condoreira')), [1]);
        assert.deepEqual(ids(filtrarTextos(itens, 'correntedireta:Realismo')), [5]);
        // O nome do pai só aparece na busca hierárquica.
        assert.deepEqual(ids(filtrarTextos(itens, 'correntedireta:"Romantismo no Brasil"')), []);
    });

    it('exclusão e combinação funcionam', () => {
        assert.deepEqual(
            ids(filtrarTextos(itens, 'corrente:Romantismo -corrente:"Romantismo em Portugal"')),
            [1, 2, 4],
        );
    });
});

describe('corrente: em autores', () => {
    beforeEach(() => {
        zerar();
        db.autores = [
            { id: 1, nome: 'Castro Alves', movimentosEscolasIds: [3] },
            { id: 2, nome: 'Camilo', movimentosEscolasIds: [6] },
            { id: 3, nome: 'Eça', movimentosEscolasIds: [7] },
        ];
    });

    it('o autor de uma geração acha pela corrente-mãe, sem misturar países', () => {
        assert.deepEqual(ids(filtrarAutores(db.autores, 'corrente:Romantismo')), [1, 2]);
        assert.deepEqual(ids(filtrarAutores(db.autores, 'corrente:"Romantismo no Brasil"')), [1]);
    });

    it('correntedireta: restringe ao vínculo exato', () => {
        assert.deepEqual(ids(filtrarAutores(db.autores, 'correntedireta:condoreira')), [1]);
        assert.deepEqual(ids(filtrarAutores(db.autores, 'correntedireta:Romantismo')), []);
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

// T4: `corrente:` não olha o Programa; `movimento:` e `escola:` só acham
// correntes cujo Programa (com a herança do pai) é Movimento ou Escola.
describe('movimento: e escola: respeitam o Programa da corrente', () => {
    let itens;
    beforeEach(() => {
        zerar();
        const comPrograma = (id, programa) => {
            db.movimentosEscolas.find((m) => m.id === id).programa = programa;
        };
        comPrograma(1, 'Movimento'); // Romantismo; as divisões herdam
        comPrograma(7, 'Escola'); // Realismo
        db.movimentosEscolas.push({ ...corrente(8, 'Parnasianismo'), programa: 'Escola' });
        db.movimentosEscolas.push({ ...corrente(9, 'Fase própria', 7), programa: 'Movimento' });
        itens = [
            texto(1, [3]), // geração brasileira, herda Movimento
            texto(2, [1]), // Romantismo
            texto(3, [7]), // Realismo, Escola
            texto(4, [8]), // Parnasianismo, Escola
            texto(5, [9]), // divisão de Realismo com Programa próprio (Movimento)
            texto(6, [2, 8]), // Romantismo no Brasil e Parnasianismo
            texto(7, []),
        ].map((i) => decorarCamposBusca(i));
    });

    it('movimento: acha só correntes de Programa Movimento, com o que está dentro', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'movimento:Romantismo')), [1, 2, 6]);
        assert.deepEqual(ids(filtrarTextos(itens, 'movimento:Parnasianismo')), []);
    });

    it('a divisão herda o Programa do pai', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'movimento:condoreira')), [1]);
    });

    it('escola: acha só correntes de Programa Escola', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'escola:Parnasianismo')), [4, 6]);
        assert.deepEqual(ids(filtrarTextos(itens, 'escola:Realismo')), [3, 5]);
        assert.deepEqual(ids(filtrarTextos(itens, 'escola:Romantismo')), []);
    });

    it('a divisão com Programa próprio vale pelo próprio, e o pai Escola continua Escola', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'movimento:"Fase própria"')), [5]);
        assert.deepEqual(ids(filtrarTextos(itens, 'escola:"Fase própria"')), []);
        // Só a própria divisão conta como Movimento; o pai Realismo é Escola e acha
        // o texto da divisão pela hierarquia.
        assert.deepEqual(ids(filtrarTextos(itens, 'movimento:Realismo')), []);
        assert.deepEqual(ids(filtrarTextos(itens, 'escola:Realismo')), [3, 5]);
    });

    it('corrente: não olha o Programa', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'corrente:Parnasianismo')), [4, 6]);
        assert.deepEqual(ids(filtrarTextos(itens, 'corrente:Romantismo')), [1, 2, 6]);
        assert.deepEqual(ids(filtrarTextos(itens, 'corrente:Realismo')), [3, 5]);
    });

    it('movimentodireto: e escoladireta: pedem o vínculo exato e o Programa', () => {
        // A busca é por trecho do nome: "Romantismo no Brasil" também contém "Romantismo".
        assert.deepEqual(ids(filtrarTextos(itens, 'movimentodireto:Romantismo')), [2, 6]);
        assert.deepEqual(ids(filtrarTextos(itens, 'movimentodireto:condoreira')), [1]);
        assert.deepEqual(ids(filtrarTextos(itens, 'escoladireta:Parnasianismo')), [4, 6]);
        assert.deepEqual(ids(filtrarTextos(itens, 'escoladireta:Romantismo')), []);
    });

    it('vale também para autores', () => {
        db.autores = [
            { id: 1, nome: 'Castro Alves', movimentosEscolasIds: [3] },
            { id: 2, nome: 'Olavo Bilac', movimentosEscolasIds: [8] },
        ];
        assert.deepEqual(ids(filtrarAutores(db.autores, 'movimento:Romantismo')), [1]);
        assert.deepEqual(ids(filtrarAutores(db.autores, 'escola:Parnasianismo')), [2]);
        assert.deepEqual(ids(filtrarAutores(db.autores, 'movimento:Parnasianismo')), []);
        assert.deepEqual(ids(filtrarAutores(db.autores, 'corrente:Parnasianismo')), [2]);
        assert.deepEqual(ids(filtrarAutores(db.autores, 'escoladireta:Parnasianismo')), [2]);
    });
});
