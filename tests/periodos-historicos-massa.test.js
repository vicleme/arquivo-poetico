import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Edição em massa dos Períodos Históricos (lógica pura): só acrescentar e
// remover, sem duplicar, "Faz parte de" com recusa de ciclo e Desfazer.
const { db } = await import('../js/db.js');
const { aplicarMassaPeriodosHistoricos, restaurarMassaPeriodosHistoricos } =
    await import('../js/periodos-historicos-massa.js');

function montar() {
    db.opcoesPeriodoHistorico = { esferas: ['Política'], categorias: ['Revolução'] };
    db.periodosHistoricos = [
        {
            id: 1,
            nome: 'Era A',
            esferas: ['Política'],
            categorias: [],
            regiao: ['França'],
            inicio: { dia: null, mes: null, ano: 1800 },
            fim: { dia: null, mes: null, ano: 1850 },
        },
        { id: 2, nome: 'Era B', esferas: [], categorias: ['Revolução'], regiao: [] },
        {
            id: 3,
            nome: 'Era C',
            pertenceA: [1],
            inicio: { dia: null, mes: null, ano: 1900 },
            fim: { dia: null, mes: null, ano: 1910 },
        },
    ];
}
const per = (id) => db.periodosHistoricos.find((p) => p.id === id);

describe('Esfera, Categoria e Região em massa', () => {
    beforeEach(montar);

    it('acrescentar soma sem apagar, não duplica e conta quem já tinha', () => {
        const r = aplicarMassaPeriodosHistoricos(db, [1, 2], {
            campo: 'esfera',
            acao: 'adicionar',
            valor: 'política',
        });
        assert.equal(r.alterados.length, 1);
        assert.equal(r.iguais, 1);
        assert.deepEqual(per(1).esferas, ['Política']);
        assert.deepEqual(per(2).esferas, ['política']);
        assert.deepEqual(per(2).categorias, ['Revolução']);
    });

    it('valor novo entra no vocabulário', () => {
        aplicarMassaPeriodosHistoricos(db, [2], {
            campo: 'categoria',
            acao: 'adicionar',
            valor: 'Crise',
        });
        assert.ok(db.opcoesPeriodoHistorico.categorias.includes('Crise'));
    });

    it('remover tira só aquele valor e ignora quem não tem', () => {
        const r = aplicarMassaPeriodosHistoricos(db, [1, 2], {
            campo: 'esfera',
            acao: 'remover',
            valor: 'Política',
        });
        assert.equal(r.alterados.length, 1);
        assert.equal(r.iguais, 1);
        assert.deepEqual(per(1).esferas, []);
    });

    it('Região: soma lugar sem repetir (ignora caixa) e remove', () => {
        aplicarMassaPeriodosHistoricos(db, [1, 2], {
            campo: 'regiao',
            acao: 'adicionar',
            valor: 'frança',
        });
        assert.deepEqual(per(1).regiao, ['França']);
        assert.deepEqual(per(2).regiao, ['frança']);
        aplicarMassaPeriodosHistoricos(db, [1, 2], {
            campo: 'regiao',
            acao: 'remover',
            valor: 'França',
        });
        assert.deepEqual(per(1).regiao, []);
        assert.deepEqual(per(2).regiao, []);
    });

    it('valor vazio é recusado', () => {
        const r = aplicarMassaPeriodosHistoricos(db, [1], {
            campo: 'esfera',
            acao: 'adicionar',
            valor: '  ',
        });
        assert.equal(r.erro, 'Digite o valor.');
    });
});

describe('Marca de evento em massa', () => {
    beforeEach(montar);

    it('acrescentar marca, remover apaga o campo, Desfazer devolve ausente', () => {
        const r = aplicarMassaPeriodosHistoricos(db, [1, 2], {
            campo: 'evento',
            acao: 'adicionar',
        });
        assert.equal(r.alterados.length, 2);
        assert.equal(per(1).evento, true);
        restaurarMassaPeriodosHistoricos(db, r.alterados);
        assert.equal('evento' in per(1), false);
        per(2).evento = true;
        const r2 = aplicarMassaPeriodosHistoricos(db, [1, 2], { campo: 'evento', acao: 'remover' });
        assert.equal(r2.alterados.length, 1);
        assert.equal(r2.iguais, 1);
        assert.equal('evento' in per(2), false);
    });
});

describe('Faz parte de em massa', () => {
    beforeEach(montar);

    it('acrescenta o pai no fim da lista e remove só ele', () => {
        const r = aplicarMassaPeriodosHistoricos(db, [2, 3], {
            campo: 'pai',
            acao: 'adicionar',
            paiId: '1',
        });
        assert.deepEqual(per(2).pertenceA, [1]);
        assert.equal(r.iguais, 1, 'o 3 já era filho do 1');
        per(3).pertenceA = [2, 1];
        aplicarMassaPeriodosHistoricos(db, [3], { campo: 'pai', acao: 'remover', paiId: '1' });
        assert.deepEqual(per(3).pertenceA, [2]);
    });

    it('recusa o próprio período e o ciclo, mas deixa entrar quem cabe', () => {
        const r = aplicarMassaPeriodosHistoricos(db, [1, 2, 3], {
            campo: 'pai',
            acao: 'adicionar',
            paiId: '3',
        });
        // 3 é o próprio pai; 1 é pai de 3 (entrar em 3 fecharia ciclo); 2 entra.
        assert.deepEqual(
            r.recusados.sort((a, b) => a.id - b.id),
            [
                { id: 1, motivo: 'ciclo' },
                { id: 3, motivo: 'proprio' },
            ],
        );
        assert.deepEqual(per(2).pertenceA, [3]);
        assert.equal(per(1).pertenceA, undefined);
    });

    it('datas fora do intervalo do pai entram, mas vêm em foraDoPai', () => {
        const r = aplicarMassaPeriodosHistoricos(db, [3], {
            campo: 'pai',
            acao: 'adicionar',
            paiId: '2',
        });
        assert.equal(r.alterados.length, 1);
        const r2 = aplicarMassaPeriodosHistoricos(db, [2], {
            campo: 'pai',
            acao: 'remover',
            paiId: '1',
        });
        assert.equal(r2.alterados.length, 0);
        per(2).inicio = { dia: null, mes: null, ano: 1700 };
        per(2).fim = { dia: null, mes: null, ano: 1750 };
        const r3 = aplicarMassaPeriodosHistoricos(db, [2], {
            campo: 'pai',
            acao: 'adicionar',
            paiId: '1',
        });
        assert.deepEqual(r3.foraDoPai, [2]);
        assert.deepEqual(per(2).pertenceA, [1]);
    });

    it('pai que não existe mais é erro', () => {
        const r = aplicarMassaPeriodosHistoricos(db, [2], {
            campo: 'pai',
            acao: 'adicionar',
            paiId: '99',
        });
        assert.match(r.erro, /não existe mais/);
    });
});

describe('Desfazer', () => {
    beforeEach(montar);

    it('devolve exatamente o estado anterior, inclusive campo ausente', () => {
        const antes = JSON.stringify(db.periodosHistoricos);
        const r = aplicarMassaPeriodosHistoricos(db, [1, 2, 3], {
            campo: 'pai',
            acao: 'adicionar',
            paiId: '2',
        });
        assert.ok(r.alterados.length >= 1);
        restaurarMassaPeriodosHistoricos(db, r.alterados);
        assert.equal(JSON.stringify(db.periodosHistoricos), antes);
    });

    it('período apagado depois do aplicar não quebra o Desfazer', () => {
        const r = aplicarMassaPeriodosHistoricos(db, [1, 2], {
            campo: 'evento',
            acao: 'adicionar',
        });
        db.periodosHistoricos = db.periodosHistoricos.filter((p) => p.id !== 2);
        assert.equal(restaurarMassaPeriodosHistoricos(db, r.alterados), 1);
    });
});
