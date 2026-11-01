import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// T6: `pessoa:Nome@Papel` na busca de Poemas e Prosas. O nome e o papel têm
// de estar no MESMO vínculo texto-pessoa; `pessoa:Pedro papel:Dedicatário(a)`
// (dois termos soltos) continua achando o texto mesmo quando o papel é de
// outra pessoa.
const { db } = await import('../js/db.js');
const { filtrarTextos, opcoesBuscaPadrao } = await import('../js/utils.js');
const { decorarCamposBusca } = await import('../js/render-listas.js');

const ids = (lista) => lista.map((i) => i.id);
const vinc = (pessoaId, papeis) => ({ pessoaId, papeis });

function montar() {
    db.pessoas = [
        { id: 1, nome: 'Pedro' },
        { id: 2, nome: 'Maria Silva' },
        { id: 3, nome: 'Ana' },
    ];
    db.grupos = [];
    db.poemas = [];
    db.prosas = [];
    const textos = [
        // 1: Pedro só Mencionado; quem dedica é Ana (o caso que a busca solta erra)
        {
            id: 1,
            titulo: 'A',
            pessoas: [vinc(1, ['Mencionado(a)']), vinc(3, ['Dedicatário(a)'])],
        },
        // 2: Pedro dedicatário
        { id: 2, titulo: 'B', pessoas: [vinc(1, ['Dedicatário(a)'])] },
        // 3: Maria Silva com dois papéis
        { id: 3, titulo: 'C', pessoas: [vinc(2, ['Voz', 'Alocutário(a)'])] },
        // 4: sem pessoas
        { id: 4, titulo: 'D', pessoas: [] },
        // 5: Pedro sem papel definido
        { id: 5, titulo: 'E', pessoas: [vinc(1, [])] },
        // 6: papel que só contém "Voz" como pedaço de palavra
        { id: 6, titulo: 'F', pessoas: [vinc(3, ['Vozes'])] },
        // 7: vínculo com pessoa que não existe mais no cadastro
        { id: 7, titulo: 'G', pessoas: [vinc(99, ['Voz'])] },
    ];
    return textos.map((t) => decorarCamposBusca(t));
}

describe('pessoa:Nome@Papel', () => {
    let itens;
    beforeEach(() => {
        itens = montar();
    });
    const achar = (q, opts) => ids(filtrarTextos(itens, q, opts));

    it('exige nome e papel no mesmo vínculo', () => {
        assert.deepEqual(achar('pessoa:Pedro@Dedicatário(a)'), [2]);
        assert.deepEqual(achar('pessoa:Ana@Dedicatário(a)'), [1]);
        assert.deepEqual(achar('pessoa:Pedro@Mencionado(a)'), [1]);
    });

    it('os dois termos soltos continuam achando o texto do outro vínculo (por isso o @)', () => {
        assert.deepEqual(achar('pessoa:Pedro papel:Dedicatário(a)'), [1, 2]);
    });

    it('ignora acento e caixa, e o papel vale sem o (a)', () => {
        assert.deepEqual(achar('pessoa:pedro@dedicatario'), [2]);
        assert.deepEqual(achar('PESSOA:PEDRO@MENCIONADO'), [1]);
    });

    it('vazio de um lado quer dizer qualquer', () => {
        assert.deepEqual(achar('pessoa:Maria@'), [3]);
        assert.deepEqual(achar('pessoa:@Voz'), [3]);
        assert.deepEqual(achar('pessoa:@Dedicatário(a)'), [1, 2]);
    });

    it('nome por trecho, papel por palavra inteira', () => {
        assert.deepEqual(achar('pessoa:Mar@Voz'), [3]);
        // "Vozes" não é o papel Voz
        assert.deepEqual(achar('pessoa:Ana@Voz'), []);
        assert.deepEqual(achar('pessoa:@Voz'), [3]);
    });

    it('aceita aspas só no pedaço que tem espaço', () => {
        assert.deepEqual(achar('pessoa:"Maria Silva"@Voz'), [3]);
        assert.deepEqual(achar('pessoa:"Maria Silva"@"Alocutário(a)"'), [3]);
        assert.deepEqual(achar('pessoa:Maria@"Alocutário(a)"'), [3]);
        assert.deepEqual(achar('pessoa:"Maria Silva"@Mencionado(a)'), []);
    });

    it('um vínculo com vários papéis casa por qualquer um', () => {
        assert.deepEqual(achar('pessoa:Maria@Voz'), [3]);
        assert.deepEqual(achar('pessoa:Maria@Alocutário(a)'), [3]);
        assert.deepEqual(achar('pessoa:Maria@Voz pessoa:Maria@Alocutário(a)'), [3]);
    });

    it('- exclui quem tem o par', () => {
        assert.deepEqual(achar('-pessoa:Pedro@Dedicatário(a)'), [1, 3, 4, 5, 6, 7]);
        assert.deepEqual(achar('-pessoa:@Voz'), [1, 2, 4, 5, 6, 7]);
    });

    it('ou combina pares', () => {
        assert.deepEqual(achar('pessoa:Pedro@Dedicatário(a) ou pessoa:Maria@Voz'), [2, 3]);
    });

    it('termos soltos se combinam por E com o par', () => {
        assert.deepEqual(achar('pessoa:Pedro@Mencionado(a) pessoa:Ana@Dedicatário(a)'), [1]);
        assert.deepEqual(achar('pessoa:Pedro@Dedicatário(a) pessoa:Ana@Dedicatário(a)'), []);
        assert.deepEqual(achar('pessoa:Pedro@Dedicatário(a) titulo:B'), [2]);
    });

    it('vínculo de pessoa que saiu do cadastro não conta', () => {
        assert.deepEqual(achar('pessoa:@Voz'), [3]);
        assert.ok(!achar('pessoa:@Voz').includes(7));
    });

    it('o interruptor de palavra inteira vale para o nome', () => {
        const opts = { ...opcoesBuscaPadrao(), palavraInteira: true };
        assert.deepEqual(achar('pessoa:Mar@Voz', opts), []);
        assert.deepEqual(achar('pessoa:Maria@Voz', opts), [3]);
    });

    it('o caso comum, sem @, segue como sempre', () => {
        assert.deepEqual(achar('pessoa:Pedro'), [1, 2, 5]);
        assert.deepEqual(achar('pessoa:dedicatário'), [1, 2]);
        assert.deepEqual(achar('papel:Voz'), [3, 6, 7]);
        assert.deepEqual(achar('pessoa:*'), [1, 2, 3, 5, 6, 7]);
        assert.deepEqual(achar('-pessoa:*'), [4]);
    });

    it('item sem os vínculos decorados não quebra e não casa', () => {
        const cru = [{ id: 9, titulo: 'X', pessoas: [vinc(1, ['Voz'])] }];
        assert.deepEqual(ids(filtrarTextos(cru, 'pessoa:Pedro@Voz')), []);
    });

    it('a decoração guarda nome e papéis juntos', () => {
        const d = itens.find((i) => i.id === 3);
        assert.deepEqual(d._vinculosPessoas, [
            { nome: 'Maria Silva', papeis: ['Voz', 'Alocutário(a)'] },
        ]);
        assert.deepEqual(itens.find((i) => i.id === 4)._vinculosPessoas, []);
    });
});

// T6, entrega 2: o papel é gravado como "Dedicatário(a)" e a busca devia aceitar
// também a forma feminina e a masculina, sem mexer no dado.
describe('variantes de gênero do papel (Dedicatária)', () => {
    let itens;
    beforeEach(() => {
        itens = montar();
    });
    const achar = (q, opts) => ids(filtrarTextos(itens, q, opts));

    it('pessoa:Nome@Papel aceita a forma feminina e a masculina', () => {
        assert.deepEqual(achar('pessoa:Ana@Dedicatária'), [1]);
        assert.deepEqual(achar('pessoa:Pedro@dedicataria'), [2]);
        assert.deepEqual(achar('pessoa:Pedro@Dedicatário'), [2]);
        assert.deepEqual(achar('pessoa:@Mencionada'), [1]);
    });

    it('papel: e pessoa: soltos também aceitam', () => {
        assert.deepEqual(achar('papel:Dedicatária'), [1, 2]);
        assert.deepEqual(achar('pessoa:Alocutária'), [3]);
        assert.deepEqual(achar('pessoa:Ana papel:dedicatária'), [1]);
    });

    it('continua por palavra inteira e sem confundir outro papel', () => {
        assert.deepEqual(achar('pessoa:@Dedicatárias'), []);
        assert.deepEqual(achar('pessoa:Ana@Mencionada'), []);
        assert.deepEqual(achar('pessoa:@Voz'), [3]);
    });

    it('o dado gravado não muda', () => {
        assert.deepEqual(db.poemas, []);
        assert.equal(itens[0].pessoas[1].papeis[0], 'Dedicatário(a)');
    });
});
