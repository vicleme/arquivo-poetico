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

// ─── Faz parte de (pai em comum) ─────────────────────────────────────────
// Reaproveita as regras do modal (ciclo, autor, sobreposição de datas) em cada
// período da seleção; quem não cabe é pulado e devolvido com o motivo.

const data = (ano, mes = null, dia = null) => ({ ano, mes, dia });

function montarHierarquia() {
    db.autores = [
        { id: 1, nome: 'Ana', genero: 'Mulher' },
        { id: 2, nome: 'Bia', genero: 'Mulher' },
    ];
    const base = { esferas: [], categorias: [], pessoasEnvolvidas: [], relacoes: [] };
    db.epocas = [
        { id: 10, nome: 'Ensino médio', autorId: 1, inicio: data(2005), fim: data(2007), ...base },
        { id: 11, nome: 'Primeiro ano', autorId: 1, inicio: data(2005), fim: data(2005), ...base },
        { id: 12, nome: 'Segundo ano', autorId: 1, inicio: data(2006), fim: data(2006), ...base },
        { id: 13, nome: 'Faculdade', autorId: 1, inicio: data(2010), fim: data(2014), ...base },
        { id: 14, nome: 'Sem datas', autorId: 1, ...base },
        { id: 20, nome: 'Ensino médio da Bia', autorId: 2, inicio: data(2005), ...base },
        { id: 21, nome: 'Fase da Bia', autorId: 2, ...base },
    ];
}
const pais = (id) => ep(id).pertenceA ?? [];

describe('Faz parte de em massa', () => {
    beforeEach(montarHierarquia);

    it('acrescentar põe vários períodos dentro do mesmo pai', () => {
        const r = aplicarMassaPeriodosBiograficos(db, [11, 12], {
            campo: 'pai',
            acao: 'adicionar',
            paiId: 10,
        });
        assert.equal(r.erro, undefined);
        assert.equal(r.alterados.length, 2);
        assert.deepEqual(r.recusados, []);
        assert.deepEqual(pais(11), [10]);
        assert.deepEqual(pais(12), [10]);
    });

    it('aceita o id como texto (vem de um <select>)', () => {
        aplicarMassaPeriodosBiograficos(db, [11], { campo: 'pai', acao: 'adicionar', paiId: '10' });
        assert.deepEqual(pais(11), [10]);
    });

    it('soma ao que já tem: o pai antigo continua e o primeiro segue como principal', () => {
        db.epocas.find((e) => e.id === 14).pertenceA = [13];
        aplicarMassaPeriodosBiograficos(db, [14], { campo: 'pai', acao: 'adicionar', paiId: 10 });
        assert.deepEqual(pais(14), [13, 10]);
    });

    it('quem já está dentro desse pai não duplica e é contado à parte', () => {
        db.epocas.find((e) => e.id === 11).pertenceA = [10];
        const r = aplicarMassaPeriodosBiograficos(db, [11, 12], {
            campo: 'pai',
            acao: 'adicionar',
            paiId: 10,
        });
        assert.equal(r.alterados.length, 1);
        assert.equal(r.iguais, 1);
        assert.deepEqual(pais(11), [10]);
    });

    it('o próprio pai na seleção é recusado ("proprio") e os outros entram', () => {
        const r = aplicarMassaPeriodosBiograficos(db, [10, 11], {
            campo: 'pai',
            acao: 'adicionar',
            paiId: 10,
        });
        assert.deepEqual(r.recusados, [{ id: 10, motivo: 'proprio' }]);
        assert.equal(r.alterados.length, 1);
        assert.deepEqual(pais(10), []);
        assert.deepEqual(pais(11), [10]);
    });

    it('não deixa um período virar filho de quem está dentro dele ("ciclo")', () => {
        db.epocas.find((e) => e.id === 11).pertenceA = [10];
        const r = aplicarMassaPeriodosBiograficos(db, [10], {
            campo: 'pai',
            acao: 'adicionar',
            paiId: 11,
        });
        assert.deepEqual(r.recusados, [{ id: 10, motivo: 'ciclo' }]);
        assert.deepEqual(pais(10), []);
    });

    it('dois períodos que se escolheriam como pai: só o primeiro vale (o outro vira ciclo)', () => {
        const r1 = aplicarMassaPeriodosBiograficos(db, [14], {
            campo: 'pai',
            acao: 'adicionar',
            paiId: 10,
        });
        const r2 = aplicarMassaPeriodosBiograficos(db, [10], {
            campo: 'pai',
            acao: 'adicionar',
            paiId: 14,
        });
        assert.equal(r1.alterados.length, 1);
        assert.deepEqual(r2.recusados, [{ id: 10, motivo: 'ciclo' }]);
        assert.deepEqual(pais(10), []);
    });

    it('recusa período de outro autor e deixa passar os do mesmo', () => {
        const r = aplicarMassaPeriodosBiograficos(db, [11, 21], {
            campo: 'pai',
            acao: 'adicionar',
            paiId: 10,
        });
        assert.deepEqual(r.recusados, [{ id: 21, motivo: 'autor' }]);
        assert.deepEqual(pais(11), [10]);
        assert.deepEqual(pais(21), []);
    });

    it('recusa quem começa depois do fim do pai ("depois") e quem termina antes dele ("antes")', () => {
        const r = aplicarMassaPeriodosBiograficos(db, [13], {
            campo: 'pai',
            acao: 'adicionar',
            paiId: 10,
        });
        assert.deepEqual(r.recusados, [{ id: 13, motivo: 'depois' }]);
        const r2 = aplicarMassaPeriodosBiograficos(db, [11], {
            campo: 'pai',
            acao: 'adicionar',
            paiId: 13,
        });
        assert.deepEqual(r2.recusados, [{ id: 11, motivo: 'antes' }]);
        assert.deepEqual(pais(13), []);
    });

    it('período sem datas nunca é recusado por intervalo', () => {
        const r = aplicarMassaPeriodosBiograficos(db, [14], {
            campo: 'pai',
            acao: 'adicionar',
            paiId: 10,
        });
        assert.deepEqual(r.recusados, []);
        assert.deepEqual(pais(14), [10]);
    });

    it('remover tira só aquele pai e ignora quem não o tinha', () => {
        db.epocas.find((e) => e.id === 11).pertenceA = [10, 13];
        db.epocas.find((e) => e.id === 12).pertenceA = [10];
        const r = aplicarMassaPeriodosBiograficos(db, [11, 12, 14], {
            campo: 'pai',
            acao: 'remover',
            paiId: 10,
        });
        assert.equal(r.alterados.length, 2);
        assert.equal(r.iguais, 1);
        assert.deepEqual(pais(11), [13]);
        assert.deepEqual(pais(12), []);
    });

    it('remover não confere regra nenhuma (nem de outro autor)', () => {
        db.epocas.find((e) => e.id === 21).pertenceA = [10]; // dado de fora do modal
        const r = aplicarMassaPeriodosBiograficos(db, [21], {
            campo: 'pai',
            acao: 'remover',
            paiId: 10,
        });
        assert.deepEqual(r.recusados, []);
        assert.deepEqual(pais(21), []);
    });

    it('sem pai escolhido a operação é inválida', () => {
        assert.equal(
            validarOperacao({ campo: 'pai', acao: 'adicionar', paiId: '' }),
            'Escolha o período pai.',
        );
        assert.equal(validarOperacao({ campo: 'pai', acao: 'adicionar', paiId: 10 }), null);
    });

    it('pai que não existe mais devolve erro e não mexe em nada', () => {
        const r = aplicarMassaPeriodosBiograficos(db, [11], {
            campo: 'pai',
            acao: 'adicionar',
            paiId: 999,
        });
        assert.match(r.erro, /não existe mais/);
        assert.equal('pertenceA' in ep(11), false);
    });

    it('não conta como Autor do período (não pede o aviso de vários autores)', () => {
        assert.equal(operacaoUsaAutor({ campo: 'pai', acao: 'adicionar', paiId: 10 }), false);
    });

    it('Desfazer devolve só os alterados e preserva quem nunca teve o campo', () => {
        const antes = JSON.stringify(db.epocas);
        const r = aplicarMassaPeriodosBiograficos(db, [11, 12, 21], {
            campo: 'pai',
            acao: 'adicionar',
            paiId: 10,
        });
        assert.equal(r.alterados.length, 2);
        assert.equal(restaurarMassaPeriodosBiograficos(db, r.alterados), 2);
        assert.equal(JSON.stringify(db.epocas), antes);
    });

    it('outros campos dos períodos ficam como estavam', () => {
        db.epocas.find((e) => e.id === 11).esferas = ['Escolar'];
        aplicarMassaPeriodosBiograficos(db, [11], { campo: 'pai', acao: 'adicionar', paiId: 10 });
        assert.deepEqual(ep(11).esferas, ['Escolar']);
    });
});

describe('Marca de evento em massa', () => {
    beforeEach(montar);
    const ep = (id) => db.epocas.find((e) => e.id === id);

    it('acrescentar marca, não repete e Desfazer devolve o campo ausente', () => {
        ep(2).evento = true;
        const r = aplicarMassaPeriodosBiograficos(db, [1, 2], {
            campo: 'evento',
            acao: 'adicionar',
        });
        assert.equal(r.alterados.length, 1);
        assert.equal(r.iguais, 1);
        assert.equal(ep(1).evento, true);
        restaurarMassaPeriodosBiograficos(db, r.alterados);
        assert.equal('evento' in ep(1), false);
        assert.equal(ep(2).evento, true);
    });

    it('remover apaga o campo (não grava false) e Desfazer o recoloca', () => {
        ep(1).evento = true;
        const r = aplicarMassaPeriodosBiograficos(db, [1, 2], {
            campo: 'evento',
            acao: 'remover',
        });
        assert.equal(r.alterados.length, 1);
        assert.equal('evento' in ep(1), false);
        restaurarMassaPeriodosBiograficos(db, r.alterados);
        assert.equal(ep(1).evento, true);
    });

    it('não precisa de valor para validar', () => {
        assert.equal(validarOperacao({ campo: 'evento', acao: 'adicionar' }), null);
    });
});
