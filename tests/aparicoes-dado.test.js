import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    temLugar,
    mesmoLugar,
    normalizarAparicoes,
    aparicoesDeFormatoAntigo,
    listaDeAparicoes,
    migrarAparicoesDosTextos,
    espelhoDasAparicoes,
    aplicarEspelho,
    espelhoDesatualizado,
    definirAparicoes,
    adicionarAparicao,
    removerAparicao,
    moverAparicao,
    contarRestosDeEstrutura,
} from '../js/aparicoes-dado.js';

function dados(extra = {}) {
    return {
        livros: [
            { id: 1, tipo: 'Livro', titulo: 'Primeiro' },
            { id: 2, tipo: 'Livro', titulo: 'Segundo' },
            { id: 3, tipo: 'Livro', titulo: 'Terceiro' },
            { id: 4, tipo: 'Coletânea', titulo: 'Seleta' },
        ],
        partes: [
            { id: 10, livroId: 1, titulo: 'Parte A' },
            { id: 11, livroId: 1, titulo: 'Parte B' },
            { id: 12, livroId: 2, titulo: 'Parte C' },
            { id: 13, livroId: 4, titulo: 'Parte da Seleta' },
        ],
        secoes: [
            { id: 20, paiTipo: 'parte', paiId: 10, titulo: 'Seção na Parte' },
            { id: 21, paiTipo: 'livro', paiId: 2, titulo: 'Seção no Livro' },
            { id: 22, paiTipo: 'parte', paiId: 999, titulo: 'Seção órfã' },
        ],
        elementos: [],
        itensColetanea: [],
        poemas: [],
        prosas: [],
        ...extra,
    };
}

const ap = (livroId, parteId = null, secaoId = null, sequencia = null) => ({
    livroId,
    parteId,
    secaoId,
    sequencia,
});

describe('temLugar e mesmoLugar', () => {
    it('lugar vem de Parte, Seção ou posição', () => {
        assert.equal(temLugar(ap(1)), false);
        assert.equal(temLugar(ap(1, 10)), true);
        assert.equal(temLugar(ap(1, null, 20)), true);
        assert.equal(temLugar(ap(1, null, null, 0)), true);
        assert.equal(temLugar(null), false);
    });

    it('mesmo lugar compara livro, Parte e Seção, não a posição', () => {
        assert.equal(mesmoLugar(ap(1, 10, null, 1), ap('1', '10', null, 5)), true);
        assert.equal(mesmoLugar(ap(1, 10), ap(1, 11)), false);
        assert.equal(mesmoLugar(ap(1), ap(2)), false);
        assert.equal(mesmoLugar(ap(1), ap(1, 10)), false);
        assert.equal(mesmoLugar(null, ap(1)), false);
        assert.equal(mesmoLugar(ap(null), ap(null)), false);
    });
});

describe('normalizarAparicoes', () => {
    it('entrada que não é lista dá lista vazia; lixo é ignorado', () => {
        assert.deepEqual(normalizarAparicoes(dados(), null), []);
        assert.deepEqual(normalizarAparicoes(dados(), 'x'), []);
        assert.deepEqual(normalizarAparicoes(dados(), [null, 3, 'a', {}]), []);
    });

    it('confere o caminho: a Seção manda mais que a Parte, e a Parte mais que o Livro', () => {
        const [a] = normalizarAparicoes(dados(), [{ livroId: 3, parteId: 11, secaoId: 20 }]);
        assert.deepEqual(a, ap(1, 10, 20, null));
        const [b] = normalizarAparicoes(dados(), [{ livroId: 3, parteId: 12 }]);
        assert.deepEqual(b, ap(2, 12, null, null));
        const [c] = normalizarAparicoes(dados(), [{ secaoId: 21 }]);
        assert.deepEqual(c, ap(2, null, 21, null));
    });

    it('descarta lugar que aponta para algo que não existe', () => {
        const r = normalizarAparicoes(dados(), [
            { livroId: 1, parteId: 777 },
            { livroId: 1, secaoId: 888 },
            { livroId: 1, secaoId: 22 },
            { livroId: 99 },
            { parteId: null, livroId: null },
        ]);
        assert.deepEqual(r, []);
    });

    it('descarta Coletânea: ela continua em itensColetanea', () => {
        assert.deepEqual(normalizarAparicoes(dados(), [ap(4), ap(4, 13, null, 2)]), []);
        assert.deepEqual(normalizarAparicoes(dados(), [ap(4), ap(3)]), [ap(3)]);
    });

    it('sequência vira inteiro ou null', () => {
        const r = normalizarAparicoes(dados(), [
            ap(1, 10, null, '3'),
            ap(2, 12, null, 'abc'),
            ap(3, null, null, undefined),
        ]);
        assert.deepEqual(
            r.map((a) => a.sequencia),
            [3, null, null],
        );
    });

    it('lugar repetido vira um só; a primeira fica e herda a posição se não tinha', () => {
        const r = normalizarAparicoes(dados(), [ap(1, 10), ap(1, 10, null, 4), ap(1, 10, null, 9)]);
        assert.deepEqual(r, [ap(1, 10, null, 4)]);
        const s = normalizarAparicoes(dados(), [ap(1, 10, null, 2), ap(1, 10, null, 9)]);
        assert.deepEqual(s, [ap(1, 10, null, 2)]);
    });

    it('"só consta" cai quando o texto já tem lugar no mesmo livro, e fica quando não tem', () => {
        assert.deepEqual(normalizarAparicoes(dados(), [ap(1), ap(1, 10)]), [ap(1, 10)]);
        assert.deepEqual(normalizarAparicoes(dados(), [ap(1, 10), ap(1)]), [ap(1, 10)]);
        assert.deepEqual(normalizarAparicoes(dados(), [ap(1), ap(2, 12)]), [ap(1), ap(2, 12)]);
        assert.deepEqual(normalizarAparicoes(dados(), [ap(1), ap(1)]), [ap(1)]);
    });

    it('duas Partes do mesmo livro são duas aparições', () => {
        const r = normalizarAparicoes(dados(), [ap(1, 10, null, 1), ap(1, 11, null, 1)]);
        assert.equal(r.length, 2);
    });

    it('livro direto com posição conta como lugar', () => {
        assert.deepEqual(normalizarAparicoes(dados(), [ap(1, null, null, 2), ap(1)]), [
            ap(1, null, null, 2),
        ]);
    });

    it('não altera a entrada', () => {
        const entrada = [{ livroId: 3, parteId: 11, secaoId: 20, sequencia: '2' }];
        const copia = JSON.parse(JSON.stringify(entrada));
        normalizarAparicoes(dados(), entrada);
        assert.deepEqual(entrada, copia);
    });

    it('sem a lista de livros no dbRef, não confere a existência do livro', () => {
        assert.deepEqual(normalizarAparicoes({}, [ap(7, null, null, 1)]), [ap(7, null, null, 1)]);
        assert.deepEqual(normalizarAparicoes(undefined, [ap(7)]), [ap(7)]);
    });
});

describe('aparicoesDeFormatoAntigo e listaDeAparicoes', () => {
    it('Destino com posição e livros vinculados', () => {
        const t = { id: 1, paiTipo: 'secao', paiId: 20, sequencia: 2, livrosIds: [2, 3] };
        assert.deepEqual(aparicoesDeFormatoAntigo(dados(), t), [ap(1, 10, 20, 2), ap(2), ap(3)]);
    });

    it('livro no Destino e em livrosIds não duplica', () => {
        const t = { paiTipo: 'parte', paiId: 10, sequencia: 1, livrosIds: [1, 2] };
        assert.deepEqual(aparicoesDeFormatoAntigo(dados(), t), [ap(1, 10, null, 1), ap(2)]);
    });

    it('Destino direto no livro sem posição vira "só consta"', () => {
        const t = { paiTipo: 'livro', paiId: 2, sequencia: null, livrosIds: [] };
        assert.deepEqual(aparicoesDeFormatoAntigo(dados(), t), [ap(2)]);
    });

    it('descarta referência quebrada e livro que não existe mais', () => {
        const t = { paiTipo: 'parte', paiId: 555, sequencia: 1, livrosIds: [99, 3] };
        assert.deepEqual(aparicoesDeFormatoAntigo(dados(), t), [ap(3)]);
    });

    it('texto sem lugar nenhum dá lista vazia', () => {
        assert.deepEqual(aparicoesDeFormatoAntigo(dados(), { paiTipo: null, paiId: null }), []);
        assert.deepEqual(aparicoesDeFormatoAntigo(dados(), {}), []);
    });

    it('não lê Coletânea (ela segue em itensColetanea)', () => {
        const t = { id: 5, paiTipo: null, paiId: null, livrosIds: [4] };
        const db = dados({ itensColetanea: [{ id: 1, parteId: 13, refTipo: 'poema', refId: 5 }] });
        assert.deepEqual(aparicoesDeFormatoAntigo(db, t), []);
    });

    it('listaDeAparicoes usa a lista nova quando existe, sem renormalizar, e lê o formato antigo quando não', () => {
        const nova = [ap(1, 10)];
        assert.equal(listaDeAparicoes(dados(), { aparicoes: nova }), nova);
        assert.deepEqual(listaDeAparicoes(dados(), { aparicoes: [] }), []);
        assert.deepEqual(listaDeAparicoes(dados(), { paiTipo: 'livro', paiId: 1, sequencia: 3 }), [
            ap(1, null, null, 3),
        ]);
        assert.deepEqual(listaDeAparicoes(dados(), null), []);
    });
});

describe('migrarAparicoesDosTextos', () => {
    function comTextos() {
        return dados({
            poemas: [
                { id: 1, paiTipo: 'secao', paiId: 20, sequencia: 2, livrosIds: [2] },
                { id: 2, paiTipo: null, paiId: null, livrosIds: [] },
                { id: 3, aparicoes: [ap(3)], paiTipo: 'livro', paiId: 1, sequencia: 7 },
            ],
            prosas: [{ id: 1, paiTipo: 'livro', paiId: 1, sequencia: 4 }],
        });
    }

    it('acrescenta a lista só a quem não tem e conta', () => {
        const db = comTextos();
        const r = migrarAparicoesDosTextos(db);
        assert.deepEqual(r, { migrados: 3 });
        assert.deepEqual(db.poemas[0].aparicoes, [ap(1, 10, 20, 2), ap(2)]);
        assert.deepEqual(db.poemas[1].aparicoes, []);
        assert.deepEqual(db.poemas[2].aparicoes, [ap(3)]);
        assert.deepEqual(db.prosas[0].aparicoes, [ap(1, null, null, 4)]);
    });

    it('é idempotente', () => {
        const db = comTextos();
        migrarAparicoesDosTextos(db);
        const depois = JSON.stringify(db);
        assert.deepEqual(migrarAparicoesDosTextos(db), { migrados: 0 });
        assert.equal(JSON.stringify(db), depois);
    });

    it('não mexe no espelho (os campos antigos ficam como estavam)', () => {
        const db = comTextos();
        migrarAparicoesDosTextos(db);
        assert.equal(db.poemas[0].paiTipo, 'secao');
        assert.equal(db.poemas[0].paiId, 20);
        assert.equal(db.poemas[0].sequencia, 2);
        assert.deepEqual(db.poemas[0].livrosIds, [2]);
        assert.equal(db.poemas[2].paiId, 1);
    });

    it('tolera coleções ausentes e itens nulos', () => {
        assert.deepEqual(migrarAparicoesDosTextos({}), { migrados: 0 });
        assert.deepEqual(migrarAparicoesDosTextos({ poemas: [null], prosas: [undefined] }), {
            migrados: 0,
        });
    });
});

describe('espelhoDasAparicoes, aplicarEspelho e espelhoDesatualizado', () => {
    it('sem aparições, tudo vazio', () => {
        assert.deepEqual(espelhoDasAparicoes([]), {
            paiTipo: null,
            paiId: null,
            sequencia: null,
            livrosIds: [],
        });
        assert.deepEqual(espelhoDasAparicoes(null).livrosIds, []);
    });

    it('o Destino é a primeira aparição com lugar; livrosIds recebe os outros livros', () => {
        const e = espelhoDasAparicoes([ap(3), ap(1, 10, 20, 2), ap(2, 12, null, 1)]);
        assert.deepEqual(e, { paiTipo: 'secao', paiId: 20, sequencia: 2, livrosIds: [3, 2] });
    });

    it('o tipo do Destino segue Seção, Parte, Livro', () => {
        assert.equal(espelhoDasAparicoes([ap(1, 10, null, 1)]).paiTipo, 'parte');
        assert.equal(espelhoDasAparicoes([ap(1, null, null, 1)]).paiTipo, 'livro');
        assert.equal(espelhoDasAparicoes([ap(1, null, 21)]).paiId, 21);
    });

    it('só "consta": sem Destino, todos os livros em livrosIds', () => {
        const e = espelhoDasAparicoes([ap(1), ap(2)]);
        assert.deepEqual(e, { paiTipo: null, paiId: null, sequencia: null, livrosIds: [1, 2] });
    });

    it('o espelho perde o que o formato antigo não diz: segunda aparição com lugar, ou duas no mesmo livro', () => {
        const e = espelhoDasAparicoes([ap(1, 10, null, 1), ap(1, 11, null, 2), ap(2, 12, null, 3)]);
        assert.equal(e.paiId, 10);
        assert.deepEqual(e.livrosIds, [2]);
    });

    it('aplicarEspelho copia os campos e não compartilha a lista', () => {
        const e = espelhoDasAparicoes([ap(1, 10, null, 1), ap(2)]);
        const t = {};
        aplicarEspelho(t, e);
        assert.deepEqual(t, { paiTipo: 'parte', paiId: 10, sequencia: 1, livrosIds: [2] });
        t.livrosIds.push(9);
        assert.deepEqual(e.livrosIds, [2]);
    });

    it('espelhoDesatualizado: falso sem lista, falso quando bate, verdadeiro quando não', () => {
        assert.equal(espelhoDesatualizado(null), false);
        assert.equal(espelhoDesatualizado({ paiTipo: 'livro', paiId: 1 }), false);
        const t = { aparicoes: [ap(1, 10, null, 1), ap(2)] };
        assert.equal(espelhoDesatualizado(t), true);
        aplicarEspelho(t, espelhoDasAparicoes(t.aparicoes));
        assert.equal(espelhoDesatualizado(t), false);
        t.paiId = 11;
        assert.equal(espelhoDesatualizado(t), true);
        t.paiId = 10;
        t.livrosIds = [];
        assert.equal(espelhoDesatualizado(t), true);
        t.livrosIds = ['2'];
        assert.equal(espelhoDesatualizado(t), false);
        t.sequencia = 5;
        assert.equal(espelhoDesatualizado(t), true);
    });

    it('espelhoDesatualizado não acusa sequência guardada como texto', () => {
        const t = { aparicoes: [ap(1, 10, null, 3)], paiTipo: 'parte', paiId: 10, livrosIds: [] };
        t.sequencia = '3';
        assert.equal(espelhoDesatualizado(t), false);
    });

    it('texto sem aparições e com Destino antigo está desatualizado', () => {
        assert.equal(
            espelhoDesatualizado({ aparicoes: [], paiTipo: 'livro', paiId: 1, sequencia: 2 }),
            true,
        );
    });
});

describe('definirAparicoes', () => {
    it('grava a lista normalizada e recalcula o espelho', () => {
        const db = dados();
        const t = { paiTipo: 'livro', paiId: 3, sequencia: 9, livrosIds: [1] };
        const r = definirAparicoes(db, t, [
            { livroId: 9, parteId: 11, secaoId: null, sequencia: '2' },
            ap(4),
            ap(2),
        ]);
        assert.deepEqual(r, [ap(1, 11, null, 2), ap(2)]);
        assert.equal(t.aparicoes, r);
        assert.equal(t.paiTipo, 'parte');
        assert.equal(t.paiId, 11);
        assert.equal(t.sequencia, 2);
        assert.deepEqual(t.livrosIds, [2]);
        assert.equal(espelhoDesatualizado(t), false);
    });

    it('lista vazia limpa o Destino e os livros', () => {
        const t = { paiTipo: 'livro', paiId: 3, sequencia: 9, livrosIds: [1], aparicoes: [ap(3)] };
        definirAparicoes(dados(), t, []);
        assert.deepEqual(t.aparicoes, []);
        assert.equal(t.paiTipo, null);
        assert.equal(t.paiId, null);
        assert.equal(t.sequencia, null);
        assert.deepEqual(t.livrosIds, []);
    });
});

describe('adicionarAparicao', () => {
    it('acrescenta no fim e atualiza o espelho', () => {
        const t = {
            aparicoes: [ap(1, 10, null, 1)],
            paiTipo: 'parte',
            paiId: 10,
            sequencia: 1,
            livrosIds: [],
        };
        const r = adicionarAparicao(dados(), t, ap(2));
        assert.deepEqual(r, [ap(1, 10, null, 1), ap(2)]);
        assert.deepEqual(t.livrosIds, [2]);
        assert.equal(espelhoDesatualizado(t), false);
    });

    it('com `indice`, põe naquela posição (serve ao Desfazer); indice fora da lista é limitado', () => {
        const t = { aparicoes: [ap(2), ap(3)] };
        adicionarAparicao(dados(), t, ap(1, 10, null, 1), { indice: 1 });
        assert.deepEqual(
            t.aparicoes.map((a) => a.livroId),
            [2, 1, 3],
        );
        adicionarAparicao(dados(), t, ap(1, 11, null, 1), { indice: 99 });
        assert.equal(t.aparicoes.at(-1).parteId, 11);
        adicionarAparicao(dados(), t, ap(2, 12, null, 1), { indice: -5 });
        assert.equal(t.aparicoes[0].parteId, 12);
    });

    it('lugar que o texto já tem não duplica, e o que já existia não perde a posição', () => {
        const t = { aparicoes: [ap(1, 10, null, 1)] };
        adicionarAparicao(dados(), t, ap(1, 10, null, 8));
        assert.deepEqual(t.aparicoes, [ap(1, 10, null, 1)]);
        const u = { aparicoes: [ap(1, 10)] };
        adicionarAparicao(dados(), u, ap(1, 10, null, 8));
        assert.deepEqual(u.aparicoes, [ap(1, 10, null, 8)]);
    });

    it('lugar numa Coletânea ou num livro inexistente é descartado', () => {
        const t = { aparicoes: [ap(1)] };
        adicionarAparicao(dados(), t, ap(4, 13, null, 1));
        adicionarAparicao(dados(), t, ap(99));
        assert.deepEqual(t.aparicoes, [ap(1)]);
    });

    it('texto ainda no formato antigo: parte do que o formato antigo diz', () => {
        const t = { paiTipo: 'parte', paiId: 10, sequencia: 2, livrosIds: [3] };
        const r = adicionarAparicao(dados(), t, ap(2, 12, null, 1));
        assert.deepEqual(r, [ap(1, 10, null, 2), ap(3), ap(2, 12, null, 1)]);
        assert.equal(t.paiId, 10);
        assert.deepEqual(t.livrosIds, [3, 2]);
    });

    it('"só consta" num livro onde o texto já tem lugar não muda nada', () => {
        const t = { aparicoes: [ap(1, 10, null, 1)] };
        adicionarAparicao(dados(), t, ap(1));
        assert.deepEqual(t.aparicoes, [ap(1, 10, null, 1)]);
    });
});

describe('removerAparicao', () => {
    function texto() {
        const t = { aparicoes: [ap(1, 10, 20, 3), ap(2), ap(3, null, null, 1)] };
        aplicarEspelho(t, espelhoDasAparicoes(t.aparicoes));
        return t;
    }

    it('tira a aparição daquele lugar e devolve o que saiu e onde estava', () => {
        const t = texto();
        const r = removerAparicao(dados(), t, { livroId: 2 });
        assert.deepEqual(r, { removida: ap(2), indice: 1 });
        assert.deepEqual(t.aparicoes, [ap(1, 10, 20, 3), ap(3, null, null, 1)]);
        assert.deepEqual(t.livrosIds, [3]);
        assert.equal(espelhoDesatualizado(t), false);
    });

    it('acha pelo caminho completo; Seção identifica o lugar sozinha', () => {
        const t = texto();
        const r = removerAparicao(dados(), t, { secaoId: 20 });
        assert.equal(r.indice, 0);
        assert.equal(t.paiTipo, 'livro');
        assert.equal(t.paiId, 3);
    });

    it('quando sai a única com lugar, o Destino antigo some', () => {
        const t = { aparicoes: [ap(1, 10, null, 1)] };
        removerAparicao(dados(), t, { parteId: 10 });
        assert.deepEqual(t.aparicoes, []);
        assert.equal(t.paiTipo, null);
        assert.equal(t.paiId, null);
    });

    it('lugar que o texto não tem: nada muda', () => {
        const t = texto();
        const antes = JSON.stringify(t);
        assert.deepEqual(removerAparicao(dados(), t, { livroId: 1 }), {
            removida: null,
            indice: -1,
        });
        assert.deepEqual(removerAparicao(dados(), t, { livroId: 99 }), {
            removida: null,
            indice: -1,
        });
        assert.deepEqual(removerAparicao(dados(), t, null), { removida: null, indice: -1 });
        assert.equal(JSON.stringify(t), antes);
    });

    it('Desfazer devolve a aparição no mesmo lugar da lista', () => {
        const t = texto();
        const antes = JSON.stringify(t);
        const { removida, indice } = removerAparicao(dados(), t, { parteId: 10, secaoId: 20 });
        adicionarAparicao(dados(), t, removida, { indice });
        assert.equal(JSON.stringify(t), antes);
    });

    it('texto no formato antigo: remove a partir do que o formato antigo diz', () => {
        const t = { paiTipo: 'parte', paiId: 10, sequencia: 2, livrosIds: [3] };
        const r = removerAparicao(dados(), t, { livroId: 3 });
        assert.equal(r.indice, 1);
        assert.deepEqual(t.aparicoes, [ap(1, 10, null, 2)]);
        assert.deepEqual(t.livrosIds, []);
    });
});

describe('moverAparicao', () => {
    it('muda o lugar no mesmo ponto da lista e atualiza o espelho', () => {
        const t = { aparicoes: [ap(1, 10, null, 1), ap(2)] };
        const r = moverAparicao(dados(), t, { parteId: 10 }, ap(1, 11, null, 5));
        assert.deepEqual(r.movida, ap(1, 11, null, 5));
        assert.deepEqual(r.anterior, ap(1, 10, null, 1));
        assert.deepEqual(t.aparicoes, [ap(1, 11, null, 5), ap(2)]);
        assert.equal(t.paiId, 11);
        assert.equal(t.sequencia, 5);
        assert.equal(espelhoDesatualizado(t), false);
    });

    it('pode mudar de livro', () => {
        const t = { aparicoes: [ap(1, 10, null, 1)] };
        const r = moverAparicao(
            dados(),
            t,
            { livroId: 1, parteId: 10 },
            { livroId: 2, parteId: 12, sequencia: 2 },
        );
        assert.deepEqual(r.movida, ap(2, 12, null, 2));
        assert.deepEqual(t.aparicoes, [ap(2, 12, null, 2)]);
    });

    it('só mudar a posição dentro do mesmo lugar', () => {
        const t = { aparicoes: [ap(1, 10, null, 1)] };
        const r = moverAparicao(dados(), t, { parteId: 10 }, ap(1, 10, null, 7));
        assert.deepEqual(r.movida, ap(1, 10, null, 7));
        assert.deepEqual(t.aparicoes, [ap(1, 10, null, 7)]);
    });

    it('para um lugar que o texto já tem, as duas se fundem', () => {
        const t = { aparicoes: [ap(1, 10, null, 1), ap(1, 11, null, 2), ap(2)] };
        const r = moverAparicao(dados(), t, { parteId: 10 }, ap(1, 11));
        assert.deepEqual(t.aparicoes, [ap(1, 11, null, 2), ap(2)]);
        assert.deepEqual(r.movida, ap(1, 11, null, 2));
    });

    it('para "só consta" num livro onde o texto já tem lugar, funde com a desse livro', () => {
        const t = { aparicoes: [ap(1, 10, null, 1), ap(2, 12, null, 4)] };
        const r = moverAparicao(dados(), t, { parteId: 10 }, ap(2));
        assert.deepEqual(t.aparicoes, [ap(2, 12, null, 4)]);
        assert.deepEqual(r.movida, ap(2, 12, null, 4));
        assert.deepEqual(r.anterior, ap(1, 10, null, 1));
    });

    it('`de` que o texto não tem: nada muda', () => {
        const t = { aparicoes: [ap(1, 10, null, 1)] };
        const antes = JSON.stringify(t);
        const r = moverAparicao(dados(), t, { parteId: 11 }, ap(2));
        assert.deepEqual(r, { movida: null, anterior: null, antes: null });
        assert.equal(JSON.stringify(t), antes);
        assert.deepEqual(moverAparicao(dados(), t, null, ap(2)).movida, null);
    });

    it('`para` num livro que não existe, Coletânea ou lugar quebrado: nada muda, a aparição não se perde', () => {
        const t = { aparicoes: [ap(1, 10, null, 1)] };
        const antes = JSON.stringify(t);
        for (const para of [
            ap(99),
            ap(4, 13, null, 1),
            { parteId: 777 },
            { secaoId: 22 },
            null,
            {},
        ]) {
            const r = moverAparicao(dados(), t, { parteId: 10 }, para);
            assert.deepEqual(r, { movida: null, anterior: null, antes: null });
            assert.equal(JSON.stringify(t), antes);
        }
    });

    it('`antes` permite o Desfazer exato, inclusive depois de uma fusão', () => {
        const t = { aparicoes: [ap(1, 10, null, 1), ap(1, 11, null, 2), ap(2)] };
        aplicarEspelho(t, espelhoDasAparicoes(t.aparicoes));
        const antesTudo = JSON.stringify(t);
        const r = moverAparicao(dados(), t, { parteId: 10 }, ap(1, 11));
        assert.notEqual(JSON.stringify(t), antesTudo);
        definirAparicoes(dados(), t, r.antes);
        assert.equal(JSON.stringify(t), antesTudo);
    });

    it('texto no formato antigo: move a partir do que o formato antigo diz', () => {
        const t = { paiTipo: 'parte', paiId: 10, sequencia: 2, livrosIds: [] };
        moverAparicao(dados(), t, { parteId: 10 }, ap(1, 11, null, 1));
        assert.deepEqual(t.aparicoes, [ap(1, 11, null, 1)]);
        assert.equal(t.paiId, 11);
    });
});

describe('contarRestosDeEstrutura', () => {
    it('acervo limpo: tudo zerado', () => {
        const db = dados({
            poemas: [{ id: 1, paiTipo: 'parte', paiId: 10, sequencia: 1, livrosIds: [2] }],
        });
        db.secoes = db.secoes.filter((s) => s.id !== 22);
        assert.deepEqual(contarRestosDeEstrutura(db), {
            partesOrfas: [],
            secoesOrfas: [],
            elementosOrfaos: [],
            textosComReferenciaPerdida: [],
            destinosDiretosSemPosicao: 0,
        });
    });

    it('acha Partes, Seções e Elementos órfãos', () => {
        const db = dados({
            partes: [...dados().partes, { id: 14, livroId: 999 }],
            elementos: [
                { id: 30, paiTipo: 'livro', paiId: 1 },
                { id: 31, paiTipo: 'livro', paiId: 999 },
                { id: 32, paiTipo: 'secao', paiId: 22 },
                { id: 33, paiTipo: 'secao', paiId: 20 },
            ],
        });
        const r = contarRestosDeEstrutura(db);
        assert.deepEqual(r.partesOrfas, [14]);
        assert.deepEqual(r.secoesOrfas, [22]);
        assert.deepEqual(r.elementosOrfaos, [31, 32]);
    });

    it('conta as referências que a migração descartaria, por texto e coleção', () => {
        const db = dados({
            poemas: [
                { id: 1, paiTipo: 'parte', paiId: 555, livrosIds: [99, 98] },
                { id: 2, paiTipo: 'livro', paiId: 1, sequencia: 2, livrosIds: [2] },
            ],
            prosas: [{ id: 7, paiTipo: 'livro', paiId: 99, livrosIds: [] }],
        });
        const r = contarRestosDeEstrutura(db);
        assert.deepEqual(r.textosComReferenciaPerdida, [
            { colecao: 'poemas', id: 1, perdidas: 3 },
            { colecao: 'prosas', id: 7, perdidas: 1 },
        ]);
    });

    it('conta Destinos diretos no livro sem posição (viram "só consta")', () => {
        const db = dados({
            poemas: [
                { id: 1, paiTipo: 'livro', paiId: 1, sequencia: null },
                { id: 2, paiTipo: 'livro', paiId: 1, sequencia: 3 },
                { id: 3, paiTipo: 'livro', paiId: 2 },
                { id: 4, paiTipo: 'parte', paiId: 10 },
            ],
            prosas: [{ id: 1, paiTipo: 'livro', paiId: 3, sequencia: 'x' }],
        });
        assert.equal(contarRestosDeEstrutura(db).destinosDiretosSemPosicao, 3);
    });

    it('só lê: não altera o acervo', () => {
        const db = dados({ poemas: [{ id: 1, paiTipo: 'livro', paiId: 99, livrosIds: [98] }] });
        const antes = JSON.stringify(db);
        contarRestosDeEstrutura(db);
        assert.equal(JSON.stringify(db), antes);
    });

    it('acervo vazio ou sem listas não quebra', () => {
        assert.deepEqual(contarRestosDeEstrutura({}).partesOrfas, []);
        assert.equal(contarRestosDeEstrutura(undefined).destinosDiretosSemPosicao, 0);
    });
});
