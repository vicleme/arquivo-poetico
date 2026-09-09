import './helpers/localstorage-shim.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mesmo padrão de colunas.test.js: colunas-contagem.js só usa
// localStorage e window.dispatchEvent/CustomEvent, sem tocar em
// document — montamos um "window" próprio que registra os eventos
// disparados, pra poder checar que as mudanças avisam quem escuta.
globalThis.window = {
    _eventos: [],
    dispatchEvent(e) {
        this._eventos.push(e);
    },
    addEventListener() {},
    removeEventListener() {},
};
globalThis.CustomEvent = class CustomEvent {
    constructor(type, opts) {
        this.type = type;
        Object.assign(this, opts);
    }
};

const {
    OPERADORES_CONTAGEM,
    getColunasContagem,
    adicionarColunaContagem,
    removerColunaContagem,
    definirCampoColunaContagem,
    definirOperadorColunaContagem,
    definirValorColunaContagem,
    bateFiltroContagem,
    itemBateFiltrosContagem,
} = await import('../js/colunas-contagem.js');

const LS_PREFIX = 'arquivoPoetico_colunasContagem_';

function resetar() {
    localStorage.clear();
    window._eventos = [];
}

// ─── bateFiltroContagem (comparador puro) ─────────────────────────

describe('bateFiltroContagem', () => {
    beforeEach(resetar);

    it('sem operador ou sem valor, não filtra (sempre true)', () => {
        assert.equal(bateFiltroContagem(3, '', ''), true);
        assert.equal(bateFiltroContagem(3, '', '2'), true);
        assert.equal(bateFiltroContagem(3, '>=', ''), true);
        assert.equal(bateFiltroContagem(3, '>=', null), true);
        assert.equal(bateFiltroContagem(3, '>=', undefined), true);
    });

    it('valor não-numérico não filtra (sempre true)', () => {
        assert.equal(bateFiltroContagem(3, '>=', 'abc'), true);
    });

    it('cada operador compara corretamente', () => {
        assert.equal(bateFiltroContagem(2, '<', 3), true);
        assert.equal(bateFiltroContagem(3, '<', 3), false);
        assert.equal(bateFiltroContagem(3, '<=', 3), true);
        assert.equal(bateFiltroContagem(4, '<=', 3), false);
        assert.equal(bateFiltroContagem(3, '=', 3), true);
        assert.equal(bateFiltroContagem(2, '=', 3), false);
        assert.equal(bateFiltroContagem(3, '>=', 3), true);
        assert.equal(bateFiltroContagem(2, '>=', 3), false);
        assert.equal(bateFiltroContagem(4, '>', 3), true);
        assert.equal(bateFiltroContagem(3, '>', 3), false);
    });

    it('aceita valor como string numérica (vem de input.value)', () => {
        assert.equal(bateFiltroContagem(5, '>=', '5'), true);
        assert.equal(bateFiltroContagem(4, '>=', '5'), false);
    });
});

// ─── Estado (getColunasContagem / adicionar / remover / definir*) ─

describe('estado das colunas de contagem', () => {
    beforeEach(resetar);

    it('nova coluna nasce sem filtro (operador e valor vazios)', () => {
        adicionarColunaContagem('poemas');
        const [coluna] = getColunasContagem('poemas');
        assert.equal(coluna.operador, '');
        assert.equal(coluna.valor, '');
    });

    it('definirOperadorColunaContagem só aceita operadores da lista fechada', () => {
        adicionarColunaContagem('poemas');
        const [coluna] = getColunasContagem('poemas');
        definirOperadorColunaContagem('poemas', coluna.id, '>=');
        assert.equal(getColunasContagem('poemas')[0].operador, '>=');

        definirOperadorColunaContagem('poemas', coluna.id, 'operador-invalido');
        assert.equal(
            getColunasContagem('poemas')[0].operador,
            '>=',
            'operador inválido não deve sobrescrever o valor válido anterior',
        );
    });

    it('definirValorColunaContagem guarda o valor cru do input', () => {
        adicionarColunaContagem('poemas');
        const [coluna] = getColunasContagem('poemas');
        definirValorColunaContagem('poemas', coluna.id, '2');
        assert.equal(getColunasContagem('poemas')[0].valor, '2');
    });

    it('estado salvo ANTES desta feature (sem operador/valor) recebe os defaults ao ler', () => {
        // Simula uma coluna de contagem criada por uma versão anterior do
        // app, persistida sem os campos novos — lerEstado (via
        // getColunasContagem) deve preencher operador/valor com ''.
        localStorage.setItem(LS_PREFIX + 'poemas', JSON.stringify([{ id: 1, campo: 'pessoas' }]));
        const [coluna] = getColunasContagem('poemas');
        assert.equal(coluna.operador, '');
        assert.equal(coluna.valor, '');
    });

    it('removerColunaContagem tira a coluna e dispara o evento de alteração', () => {
        adicionarColunaContagem('poemas');
        const [coluna] = getColunasContagem('poemas');
        window._eventos = [];
        removerColunaContagem('poemas', coluna.id);
        assert.equal(getColunasContagem('poemas').length, 0);
        assert.equal(window._eventos.length, 1);
        assert.equal(window._eventos[0].type, 'colunas-contagem:alteradas');
    });

    it('OPERADORES_CONTAGEM começa com a opção vazia ("sem filtro")', () => {
        assert.equal(OPERADORES_CONTAGEM[0].value, '');
    });
});

// ─── itemBateFiltrosContagem (aplicação no item, ver getListaVisivelPoemas) ─

describe('itemBateFiltrosContagem', () => {
    beforeEach(resetar);

    it('sem nenhuma coluna com filtro configurado, todo item bate', () => {
        adicionarColunaContagem('poemas'); // sem operador/valor
        const item = { pessoas: [{ pessoaId: 1, papeis: [] }] };
        assert.equal(itemBateFiltrosContagem(item, 'poemas', {}), true);
    });

    it('filtra pela contagem do campo configurado (ex.: Qtd. Pessoas >= 2)', () => {
        adicionarColunaContagem('poemas');
        const [coluna] = getColunasContagem('poemas');
        definirCampoColunaContagem('poemas', coluna.id, 'pessoas');
        definirOperadorColunaContagem('poemas', coluna.id, '>=');
        definirValorColunaContagem('poemas', coluna.id, '2');

        const comDuas = { pessoas: [{ pessoaId: 1, papeis: [] }, { pessoaId: 2, papeis: [] }] };
        const comUma = { pessoas: [{ pessoaId: 1, papeis: [] }] };

        assert.equal(itemBateFiltrosContagem(comDuas, 'poemas', {}), true);
        assert.equal(itemBateFiltrosContagem(comUma, 'poemas', {}), false);
    });

    it('combina múltiplas colunas de contagem com filtro como E (precisa bater em todas)', () => {
        adicionarColunaContagem('poemas');
        adicionarColunaContagem('poemas');
        const [c1, c2] = getColunasContagem('poemas');
        definirCampoColunaContagem('poemas', c1.id, 'pessoas');
        definirOperadorColunaContagem('poemas', c1.id, '>=');
        definirValorColunaContagem('poemas', c1.id, '1');
        definirCampoColunaContagem('poemas', c2.id, 'elos');
        definirOperadorColunaContagem('poemas', c2.id, '=');
        definirValorColunaContagem('poemas', c2.id, '0');

        const bateOsDois = { pessoas: [{ pessoaId: 1, papeis: [] }], conceitos: { elos: [] } };
        const bateSoUm = {
            pessoas: [{ pessoaId: 1, papeis: [] }],
            conceitos: { elos: [{ relacao: 'x' }] },
        };

        assert.equal(itemBateFiltrosContagem(bateOsDois, 'poemas', {}), true);
        assert.equal(itemBateFiltrosContagem(bateSoUm, 'poemas', {}), false);
    });
});
