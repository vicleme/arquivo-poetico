import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Edição em massa dos Períodos Biográficos (lógica pura): só acrescentar e
// remover, sem duplicar, com relação por pontas e Desfazer.
const { db } = await import('../js/db.js');
const { ROTULOS_VINCULO_DE_FABRICA } = await import('../js/periodo-biografico-campos.js');
const {
    aplicarMassaPeriodosBiograficos,
    restaurarMassaPeriodosBiograficos,
    autoresDaSelecao,
    operacaoUsaAutor,
    validarOperacao,
} = await import('../js/periodo-biografico-massa.js');

function montar() {
    db.autores = [
        { id: 1, nome: 'Ana', genero: 'Mulher' },
        { id: 2, nome: 'Bia', genero: 'Mulher' },
    ];
    db.pessoas = [
        { id: 100, nome: 'Carla', oculto: false },
        { id: 101, nome: 'Davi', oculto: false },
        { id: 102, nome: 'Elisa', oculto: false },
    ];
    db.opcoesPeriodoBiografico = {
        esferas: ['Afetiva'],
        vinculos: ['Amizade', 'Romântico', ...ROTULOS_VINCULO_DE_FABRICA.map((r) => r.nome)],
        rotulosVinculo: ROTULOS_VINCULO_DE_FABRICA.map((r) => ({ ...r })),
    };
    db.epocas = [
        {
            id: 1,
            nome: 'Fase 1',
            autorId: 1,
            esferas: ['Afetiva'],
            categorias: [],
            pessoasEnvolvidas: [{ pessoaId: 100 }],
            relacoes: [{ de: 'autor', para: 100, natureza: '', vinculo: 'Amizade' }],
        },
        {
            id: 2,
            nome: 'Fase 2',
            autorId: 1,
            esferas: [],
            categorias: ['Transição'],
            pessoasEnvolvidas: [],
            relacoes: [],
        },
        {
            id: 3,
            nome: 'Fase 3',
            autorId: 2,
            esferas: [],
            categorias: [],
            pessoasEnvolvidas: [],
            relacoes: [],
        },
    ];
}
const ep = (id) => db.epocas.find((e) => e.id === id);

describe('Esfera e Categoria em massa', () => {
    beforeEach(montar);

    it('acrescentar soma sem apagar o que já tem e conta quem já tinha', () => {
        const r = aplicarMassaPeriodosBiograficos(db, [1, 2], {
            campo: 'esfera',
            acao: 'adicionar',
            valor: 'afetiva',
        });
        assert.equal(r.alterados.length, 1);
        assert.equal(r.iguais, 1);
        assert.deepEqual(ep(1).esferas, ['Afetiva']);
        assert.deepEqual(ep(2).esferas, ['afetiva']);
        assert.deepEqual(ep(2).categorias, ['Transição']);
    });

    it('esfera nova entra no vocabulário', () => {
        aplicarMassaPeriodosBiograficos(db, [2], {
            campo: 'esfera',
            acao: 'adicionar',
            valor: 'Criativa',
        });
        assert.ok(db.opcoesPeriodoBiografico.esferas.includes('Criativa'));
    });

    it('remover tira só aquele valor, sem diferenciar caixa e acento', () => {
        const r = aplicarMassaPeriodosBiograficos(db, [1, 2], {
            campo: 'categoria',
            acao: 'remover',
            valor: 'transicao',
        });
        assert.equal(r.alterados.length, 1);
        assert.deepEqual(ep(2).categorias, []);
        assert.deepEqual(ep(1).esferas, ['Afetiva']);
    });

    it('só mexe nos períodos selecionados', () => {
        aplicarMassaPeriodosBiograficos(db, [2], {
            campo: 'categoria',
            acao: 'adicionar',
            valor: 'Nova',
        });
        assert.deepEqual(ep(3).categorias, []);
    });
});

describe('Pessoa envolvida em massa', () => {
    beforeEach(montar);

    it('acrescenta sem duplicar', () => {
        const r = aplicarMassaPeriodosBiograficos(db, [1, 2], {
            campo: 'pessoa',
            acao: 'adicionar',
            pessoaId: 100,
        });
        assert.equal(r.alterados.length, 1);
        assert.equal(r.iguais, 1);
        assert.deepEqual(ep(2).pessoasEnvolvidas, [{ pessoaId: 100 }]);
    });

    it('remover tira a pessoa e as relações dela, mantendo as outras', () => {
        ep(1).pessoasEnvolvidas.push({ pessoaId: 101 });
        ep(1).relacoes.push({ de: 'autor', para: 101, natureza: '', vinculo: 'Amizade' });
        aplicarMassaPeriodosBiograficos(db, [1], {
            campo: 'pessoa',
            acao: 'remover',
            pessoaId: 100,
        });
        assert.deepEqual(ep(1).pessoasEnvolvidas, [{ pessoaId: 101 }]);
        assert.deepEqual(ep(1).relacoes, [
            { de: 'autor', para: 101, natureza: '', vinculo: 'Amizade' },
        ]);
    });
});

describe('Relação em massa', () => {
    beforeEach(montar);

    it('acrescenta entre duas pessoas e põe as duas entre as envolvidas', () => {
        aplicarMassaPeriodosBiograficos(db, [1, 2], {
            campo: 'relacao',
            acao: 'adicionar',
            de: 101,
            para: 102,
            vinculo: 'Romântico',
        });
        assert.deepEqual(ep(2).relacoes, [
            { de: 101, para: 102, natureza: '', vinculo: 'Romântico' },
        ]);
        assert.deepEqual(
            ep(2)
                .pessoasEnvolvidas.map((e) => e.pessoaId)
                .sort(),
            [101, 102],
        );
        // o período 1 manteve a relação que já tinha
        assert.equal(ep(1).relacoes.length, 2);
    });

    it('"Autor do período" vale para o autor de cada período', () => {
        aplicarMassaPeriodosBiograficos(db, [2, 3], {
            campo: 'relacao',
            acao: 'adicionar',
            de: 'autor',
            para: 101,
            vinculo: 'Amizade',
        });
        assert.deepEqual(ep(2).relacoes, [
            { de: 'autor', para: 101, natureza: '', vinculo: 'Amizade' },
        ]);
        assert.deepEqual(ep(3).relacoes, [
            { de: 'autor', para: 101, natureza: '', vinculo: 'Amizade' },
        ]);
    });

    it('não duplica a mesma relação, nem simétrica invertida', () => {
        const op = (de, para) => ({
            campo: 'relacao',
            acao: 'adicionar',
            de,
            para,
            vinculo: 'Amizade',
        });
        const r = aplicarMassaPeriodosBiograficos(db, [1], op(100, 'autor'));
        assert.equal(r.alterados.length, 0);
        assert.equal(r.iguais, 1);
    });

    it('vínculo orientado: o mesmo fato dito do outro lado conta como a mesma relação', () => {
        const dir = ROTULOS_VINCULO_DE_FABRICA.find((r) => r.inverso);
        aplicarMassaPeriodosBiograficos(db, [2], {
            campo: 'relacao',
            acao: 'adicionar',
            de: 101,
            para: 102,
            vinculo: dir.nome,
        });
        const invertida = aplicarMassaPeriodosBiograficos(db, [2], {
            campo: 'relacao',
            acao: 'adicionar',
            de: 102,
            para: 101,
            vinculo: dir.inverso,
        });
        assert.equal(invertida.alterados.length, 0);
        // mas "de" e "para" trocados com o MESMO nome são outra relação
        const outra = aplicarMassaPeriodosBiograficos(db, [2], {
            campo: 'relacao',
            acao: 'adicionar',
            de: 102,
            para: 101,
            vinculo: dir.nome,
        });
        assert.equal(outra.alterados.length, 1);
    });

    it('remover tira só aquela relação e mantém as pessoas envolvidas', () => {
        aplicarMassaPeriodosBiograficos(db, [1], {
            campo: 'relacao',
            acao: 'remover',
            de: 'autor',
            para: 100,
            vinculo: 'amizade',
        });
        assert.deepEqual(ep(1).relacoes, []);
        assert.deepEqual(ep(1).pessoasEnvolvidas, [{ pessoaId: 100 }]);
    });
});

describe('Desfazer, validação e aviso de autores', () => {
    beforeEach(montar);

    it('restaura os quatro campos de cada período alterado', () => {
        const antes = JSON.stringify(db.epocas);
        const r = aplicarMassaPeriodosBiograficos(db, [1, 2, 3], {
            campo: 'relacao',
            acao: 'adicionar',
            de: 101,
            para: 102,
            vinculo: 'Romântico',
        });
        assert.notEqual(JSON.stringify(db.epocas), antes);
        restaurarMassaPeriodosBiograficos(db, r.alterados);
        assert.equal(JSON.stringify(db.epocas), antes);
    });

    it('restaurar ignora período que foi apagado depois', () => {
        const r = aplicarMassaPeriodosBiograficos(db, [2, 3], {
            campo: 'esfera',
            acao: 'adicionar',
            valor: 'X',
        });
        db.epocas = db.epocas.filter((e) => e.id !== 3);
        assert.equal(restaurarMassaPeriodosBiograficos(db, r.alterados), 1);
    });

    it('operação incompleta devolve erro e não mexe em nada', () => {
        const antes = JSON.stringify(db.epocas);
        for (const op of [
            { campo: 'esfera', acao: 'adicionar', valor: '  ' },
            { campo: 'pessoa', acao: 'adicionar' },
            { campo: 'relacao', acao: 'adicionar', de: 100, para: 100, vinculo: 'Amizade' },
            { campo: 'relacao', acao: 'adicionar', de: 100, para: 101, vinculo: '' },
            { campo: 'esfera', acao: 'trocar', valor: 'X' },
        ]) {
            const r = aplicarMassaPeriodosBiograficos(db, [1, 2], op);
            assert.ok(r.erro, JSON.stringify(op));
            assert.equal(validarOperacao(op), r.erro);
        }
        assert.equal(JSON.stringify(db.epocas), antes);
    });

    it('lista os autores distintos da seleção e sabe quando a operação usa "Autor"', () => {
        assert.deepEqual(autoresDaSelecao(db, [1, 2]), ['Ana']);
        assert.deepEqual(autoresDaSelecao(db, [1, 3]), ['Ana', 'Bia']);
        assert.equal(operacaoUsaAutor({ campo: 'relacao', de: 'autor', para: 100 }), true);
        assert.equal(operacaoUsaAutor({ campo: 'relacao', de: 101, para: 100 }), false);
        assert.equal(operacaoUsaAutor({ campo: 'esfera' }), false);
    });
});

describe('Natureza em massa (item 3)', () => {
    beforeEach(montar);

    const op = (extra) => ({ campo: 'relacao', acao: 'adicionar', de: 101, para: 102, ...extra });

    it('acrescenta uma relação só com Natureza (vínculo vazio)', () => {
        const r = aplicarMassaPeriodosBiograficos(db, [2, 3], op({ natureza: 'Familiar' }));
        assert.equal(r.alterados.length, 2);
        assert.deepEqual(ep(2).relacoes, [
            { de: 101, para: 102, natureza: 'Familiar', vinculo: '' },
        ]);
        assert.deepEqual(
            ep(2).pessoasEnvolvidas.map((e) => e.pessoaId),
            [101, 102],
        );
    });

    it('acrescenta com Natureza e Vínculo juntos e registra os dois no vocabulário', () => {
        aplicarMassaPeriodosBiograficos(db, [2], op({ natureza: 'Romance', vinculo: 'Namorados' }));
        assert.deepEqual(ep(2).relacoes, [
            { de: 101, para: 102, natureza: 'Romance', vinculo: 'Namorados' },
        ]);
        assert.ok(db.opcoesPeriodoBiografico.naturezas.includes('Romance'));
        assert.ok(db.opcoesPeriodoBiografico.vinculos.includes('Namorados'));
    });

    it('mesma dupla com Natureza diferente é outra relação', () => {
        aplicarMassaPeriodosBiograficos(db, [2], op({ natureza: 'Amizade' }));
        const outra = aplicarMassaPeriodosBiograficos(db, [2], op({ natureza: 'Profissional' }));
        assert.equal(outra.alterados.length, 1);
        assert.equal(ep(2).relacoes.length, 2);
    });

    it('não duplica: mesmos lados, Natureza e Vínculo (também invertida, se simétrica)', () => {
        aplicarMassaPeriodosBiograficos(db, [2], op({ natureza: 'Amizade' }));
        const igual = aplicarMassaPeriodosBiograficos(
            db,
            [2],
            op({ de: 102, para: 101, natureza: 'amizade' }),
        );
        assert.equal(igual.alterados.length, 0);
        assert.equal(igual.iguais, 1);
    });

    it('remover só a Natureza não tira a relação que tem Natureza e Vínculo', () => {
        aplicarMassaPeriodosBiograficos(db, [2], op({ natureza: 'Romance', vinculo: 'Namorados' }));
        const nada = aplicarMassaPeriodosBiograficos(
            db,
            [2],
            op({ acao: 'remover', natureza: 'Romance' }),
        );
        assert.equal(nada.alterados.length, 0);
        assert.equal(ep(2).relacoes.length, 1);
        aplicarMassaPeriodosBiograficos(
            db,
            [2],
            op({ acao: 'remover', natureza: 'Romance', vinculo: 'Namorados' }),
        );
        assert.deepEqual(ep(2).relacoes, []);
    });

    it('a relação antiga só com vínculo (Natureza vazia) continua achável para remover', () => {
        const r = aplicarMassaPeriodosBiograficos(db, [1], {
            campo: 'relacao',
            acao: 'remover',
            de: 'autor',
            para: 100,
            natureza: '',
            vinculo: 'Amizade',
        });
        assert.equal(r.alterados.length, 1);
        assert.deepEqual(ep(1).relacoes, []);
    });

    it('a validação aceita Natureza sem vínculo e recusa os dois vazios', () => {
        assert.equal(validarOperacao(op({ natureza: 'Familiar' })), null);
        assert.equal(validarOperacao(op({ vinculo: 'Mentoria' })), null);
        assert.equal(
            validarOperacao(op({ natureza: '', vinculo: '' })),
            'Escolha a Natureza ou digite o vínculo.',
        );
    });

    it('Desfazer devolve os períodos ao estado de antes', () => {
        const antes = JSON.stringify(db.epocas);
        const r = aplicarMassaPeriodosBiograficos(db, [1, 2, 3], op({ natureza: 'Familiar' }));
        assert.notEqual(JSON.stringify(db.epocas), antes);
        restaurarMassaPeriodosBiograficos(db, r.alterados);
        assert.equal(JSON.stringify(db.epocas), antes);
    });
});
