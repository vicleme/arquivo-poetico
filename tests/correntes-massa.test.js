import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Edição em massa das Correntes literárias (lógica pura): campos de lista
// (acrescentar/remover), de valor único (definir/limpar) e "Faz parte de".
const { db } = await import('../js/db.js');
const { aplicarMassaCorrentes, restaurarMassaCorrentes, validarOperacaoCorrente } =
    await import('../js/correntes-massa.js');

function montar() {
    db.movimentosEscolas = [
        {
            id: 1,
            nome: 'Romantismo',
            tipo: 'Literário',
            programa: 'Escola',
            posturaEstetica: 'Reformista',
            paiId: null,
            divisao: '',
            generoDivisao: '',
            regiaoOrigem: ['Europa'],
            temas: ['Amor'],
            valores: [],
        },
        { id: 2, nome: 'Barroco', tipo: '', programa: '', posturaEstetica: '', paiId: null },
        {
            id: 3,
            nome: 'Primeira geração',
            tipo: '',
            programa: '',
            posturaEstetica: '',
            paiId: 1,
            divisao: 'Fase ou geração',
            generoDivisao: 'Poesia',
        },
    ];
}
const cor = (id) => db.movimentosEscolas.find((m) => m.id === id);

describe('campos de lista', () => {
    beforeEach(montar);

    it('acrescentar soma sem apagar, não duplica (sem caixa nem acento) e conta quem já tinha', () => {
        const r = aplicarMassaCorrentes(db, [1, 2], {
            campo: 'temas',
            acao: 'adicionar',
            valor: 'amor',
        });
        assert.equal(r.alterados.length, 1);
        assert.equal(r.iguais, 1);
        assert.deepEqual(cor(1).temas, ['Amor']);
        assert.deepEqual(cor(2).temas, ['amor']);
    });

    it('remover tira só aquele valor e ignora quem não tem', () => {
        const r = aplicarMassaCorrentes(db, [1, 2], {
            campo: 'temas',
            acao: 'remover',
            valor: 'AMOR',
        });
        assert.equal(r.alterados.length, 1);
        assert.equal(r.iguais, 1);
        assert.deepEqual(cor(1).temas, []);
    });

    it('cada campo de lista grava no seu campo', () => {
        const pares = [
            ['valores', 'valores'],
            ['tecnicas', 'tecnicas'],
            ['tiposComposicao', 'tiposComposicao'],
            ['lemas', 'lemas'],
            ['manifestos', 'manifestos'],
            ['regiao', 'regiaoOrigem'],
        ];
        pares.forEach(([chave, campo]) => {
            aplicarMassaCorrentes(db, [2], { campo: chave, acao: 'adicionar', valor: 'X' });
            assert.deepEqual(cor(2)[campo], ['X'], campo);
        });
    });

    it('valor vazio é recusado', () => {
        assert.equal(
            validarOperacaoCorrente({ campo: 'lemas', acao: 'adicionar', valor: ' ' }),
            'Digite o valor.',
        );
    });
});

describe('campos de valor único', () => {
    beforeEach(montar);

    it('definir troca o valor e conta quem já estava assim', () => {
        const r = aplicarMassaCorrentes(db, [1, 2], {
            campo: 'programa',
            acao: 'adicionar',
            valor: 'Escola',
        });
        assert.equal(r.alterados.length, 1);
        assert.equal(r.iguais, 1);
        assert.equal(cor(2).programa, 'Escola');
    });

    it('definir sobrescreve o que a corrente tinha', () => {
        aplicarMassaCorrentes(db, [1], {
            campo: 'posturaEstetica',
            acao: 'adicionar',
            valor: 'Iconoclasta',
        });
        assert.equal(cor(1).posturaEstetica, 'Iconoclasta');
    });

    it('valor fora da lista é recusado', () => {
        assert.equal(
            validarOperacaoCorrente({ campo: 'tipo', acao: 'adicionar', valor: 'Inventado' }),
            'Escolha o valor.',
        );
    });

    it('limpar esvazia o campo só de quem tinha e Desfazer devolve', () => {
        const r = aplicarMassaCorrentes(db, [1, 2], { campo: 'tipo', acao: 'remover' });
        assert.equal(r.alterados.length, 1);
        assert.equal(r.iguais, 1);
        assert.equal(cor(1).tipo, '');
        restaurarMassaCorrentes(db, r.alterados);
        assert.equal(cor(1).tipo, 'Literário');
    });
});

describe('Faz parte de', () => {
    beforeEach(montar);

    it('definir põe o pai com Divisão e Aplica-se a', () => {
        const r = aplicarMassaCorrentes(db, [2], {
            campo: 'pai',
            acao: 'adicionar',
            paiId: '1',
            divisao: 'Vertente',
            generoDivisao: 'Prosa',
        });
        assert.equal(r.alterados.length, 1);
        assert.equal(cor(2).paiId, 1);
        assert.equal(cor(2).divisao, 'Vertente');
        assert.equal(cor(2).generoDivisao, 'Prosa');
    });

    it('trocar de pai sem dizer a Divisão mantém a que já havia', () => {
        aplicarMassaCorrentes(db, [3], { campo: 'pai', acao: 'adicionar', paiId: '2' });
        assert.equal(cor(3).paiId, 2);
        assert.equal(cor(3).divisao, 'Fase ou geração');
        assert.equal(cor(3).generoDivisao, 'Poesia');
    });

    it('mesmo pai sem nada novo não muda nada', () => {
        const r = aplicarMassaCorrentes(db, [3], { campo: 'pai', acao: 'adicionar', paiId: '1' });
        assert.equal(r.alterados.length, 0);
        assert.equal(r.iguais, 1);
    });

    it('recusa a própria corrente e o ciclo, mas deixa entrar quem cabe', () => {
        const r = aplicarMassaCorrentes(db, [1, 2, 3], {
            campo: 'pai',
            acao: 'adicionar',
            paiId: '3',
        });
        assert.deepEqual(
            r.recusados.sort((a, b) => a.id - b.id),
            [
                { id: 1, motivo: 'ciclo' },
                { id: 3, motivo: 'proprio' },
            ],
        );
        assert.equal(cor(2).paiId, 3);
        assert.equal(cor(1).paiId, null);
    });

    it('limpar tira o pai e zera Divisão e Aplica-se a; Desfazer devolve', () => {
        const r = aplicarMassaCorrentes(db, [1, 3], { campo: 'pai', acao: 'remover' });
        assert.equal(r.alterados.length, 1);
        assert.equal(r.iguais, 1);
        assert.equal(cor(3).paiId, null);
        assert.equal(cor(3).divisao, '');
        assert.equal(cor(3).generoDivisao, '');
        restaurarMassaCorrentes(db, r.alterados);
        assert.equal(cor(3).paiId, 1);
        assert.equal(cor(3).divisao, 'Fase ou geração');
    });

    it('Desfazer de definir o pai devolve null (não lista vazia)', () => {
        const r = aplicarMassaCorrentes(db, [2], { campo: 'pai', acao: 'adicionar', paiId: '1' });
        restaurarMassaCorrentes(db, r.alterados);
        assert.equal(cor(2).paiId, null);
    });

    it('corrente pai que não existe mais é erro', () => {
        const r = aplicarMassaCorrentes(db, [2], { campo: 'pai', acao: 'adicionar', paiId: '99' });
        assert.match(r.erro, /não existe mais/);
    });
});
