import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    valoresDaOperacao,
    fraseValores,
    rotuloComValores,
    etiquetasDoTexto,
} from '../js/massa-valores.js';
import {
    aplicarMassaPeriodosBiograficos,
    restaurarMassaPeriodosBiograficos,
    validarOperacao,
} from '../js/periodo-biografico-massa.js';
import {
    aplicarMassaPeriodosHistoricos,
    restaurarMassaPeriodosHistoricos,
    validarOperacaoPeriodoHistorico,
} from '../js/periodos-historicos-massa.js';
import {
    aplicarMassaCorrentes,
    restaurarMassaCorrentes,
    validarOperacaoCorrente,
} from '../js/correntes-massa.js';

// Etiquetas nas barras de edição em massa: uma operação de lista leva vários
// valores (`valores`); `valor` segue valendo como lista de um item.

describe('valoresDaOperacao', () => {
    it('limpa espaços, tira vazios e repetidos (ignora caixa)', () => {
        assert.deepEqual(
            valoresDaOperacao({ valores: ['  Amor ', 'amor', '', 'Morte   fria', null] }),
            ['Amor', 'Morte fria'],
        );
    });

    it('cai em `valor` quando não há `valores`', () => {
        assert.deepEqual(valoresDaOperacao({ valor: ' Amor ' }), ['Amor']);
        assert.deepEqual(valoresDaOperacao({ valor: '   ' }), []);
        assert.deepEqual(valoresDaOperacao({}), []);
    });
});

describe('frases', () => {
    it('fraseValores junta com vírgula e "e"', () => {
        assert.equal(fraseValores(['A']), '"A"');
        assert.equal(fraseValores(['A', 'B']), '"A" e "B"');
        assert.equal(fraseValores(['A', 'B', 'C']), '"A", "B" e "C"');
    });

    it('rotuloComValores usa o plural quando há mais de um valor', () => {
        assert.equal(rotuloComValores('Esfera', 'Esferas', ['A']), 'Esfera "A"');
        assert.equal(rotuloComValores('Esfera', 'Esferas', ['A', 'B']), 'Esferas "A" e "B"');
    });

    it('etiquetasDoTexto separa por vírgula, ponto e vírgula e quebra de linha', () => {
        assert.deepEqual(etiquetasDoTexto('Amor, Morte;  Tempo\nSaudade ,, '), [
            'Amor',
            'Morte',
            'Tempo',
            'Saudade',
        ]);
        assert.deepEqual(etiquetasDoTexto(''), []);
    });
});

describe('Período Biográfico: vários valores', () => {
    const montar = () => ({
        epocas: [
            { id: 1, nome: 'A', esferas: ['Afetiva'], categorias: [] },
            { id: 2, nome: 'B', esferas: [], categorias: [] },
            { id: 3, nome: 'C', esferas: ['Afetiva', 'Familiar'], categorias: [] },
        ],
        autores: [],
        pessoas: [],
    });

    it('acrescentar vários: cada período recebe os que não tinha, sem duplicar', () => {
        const dbRef = montar();
        const r = aplicarMassaPeriodosBiograficos(dbRef, [1, 2, 3], {
            campo: 'esfera',
            acao: 'adicionar',
            valores: ['Afetiva', 'Familiar', 'Social'],
        });
        assert.deepEqual(dbRef.epocas[0].esferas, ['Afetiva', 'Familiar', 'Social']);
        assert.deepEqual(dbRef.epocas[1].esferas, ['Afetiva', 'Familiar', 'Social']);
        assert.deepEqual(dbRef.epocas[2].esferas, ['Afetiva', 'Familiar', 'Social']);
        assert.equal(r.alterados.length, 3);
        assert.equal(r.iguais, 0);
    });

    it('período que já tem todos os valores fica em `iguais`', () => {
        const dbRef = montar();
        const r = aplicarMassaPeriodosBiograficos(dbRef, [3], {
            campo: 'esfera',
            acao: 'adicionar',
            valores: ['Afetiva', 'Familiar'],
        });
        assert.equal(r.alterados.length, 0);
        assert.equal(r.iguais, 1);
    });

    it('remover vários tira só os que existem; Desfazer devolve tudo de uma vez', () => {
        const dbRef = montar();
        const r = aplicarMassaPeriodosBiograficos(dbRef, [1, 2, 3], {
            campo: 'esfera',
            acao: 'remover',
            valores: ['Afetiva', 'Familiar'],
        });
        assert.deepEqual(dbRef.epocas[0].esferas, []);
        assert.deepEqual(dbRef.epocas[2].esferas, []);
        assert.equal(r.alterados.length, 2);
        assert.equal(r.iguais, 1);
        restaurarMassaPeriodosBiograficos(dbRef, r.alterados);
        assert.deepEqual(dbRef.epocas[0].esferas, ['Afetiva']);
        assert.deepEqual(dbRef.epocas[2].esferas, ['Afetiva', 'Familiar']);
    });

    it('valida: precisa de ao menos um valor; `valor` único continua valendo', () => {
        assert.equal(
            validarOperacao({ campo: 'categoria', acao: 'adicionar', valores: [] }),
            'Digite o valor.',
        );
        assert.equal(
            validarOperacao({ campo: 'categoria', acao: 'adicionar', valores: [' '] }),
            'Digite o valor.',
        );
        assert.equal(
            validarOperacao({ campo: 'categoria', acao: 'adicionar', valores: ['A'] }),
            null,
        );
        assert.equal(validarOperacao({ campo: 'categoria', acao: 'adicionar', valor: 'A' }), null);
    });
});

describe('Período Histórico: vários valores', () => {
    const montar = () => ({
        periodosHistoricos: [
            { id: 1, nome: 'A', esferas: [], categorias: [], regiao: ['Brasil'] },
            { id: 2, nome: 'B', esferas: [], categorias: [], regiao: [] },
        ],
        opcoesPeriodoHistorico: {},
        poemas: [],
        prosas: [],
    });

    it('Esfera e Categoria: vários de uma vez', () => {
        const dbRef = montar();
        aplicarMassaPeriodosHistoricos(dbRef, [1, 2], {
            campo: 'esfera',
            acao: 'adicionar',
            valores: ['Política', 'Social'],
        });
        aplicarMassaPeriodosHistoricos(dbRef, [1], {
            campo: 'categoria',
            acao: 'adicionar',
            valores: ['Guerra e conflito', 'Crise'],
        });
        assert.deepEqual(dbRef.periodosHistoricos[0].esferas, ['Política', 'Social']);
        assert.deepEqual(dbRef.periodosHistoricos[1].esferas, ['Política', 'Social']);
        assert.deepEqual(dbRef.periodosHistoricos[0].categorias, ['Guerra e conflito', 'Crise']);
    });

    it('Região: vários lugares, sem repetir o que já estava, e Desfazer', () => {
        const dbRef = montar();
        const r = aplicarMassaPeriodosHistoricos(dbRef, [1, 2], {
            campo: 'regiao',
            acao: 'adicionar',
            valores: ['Brasil', 'Portugal'],
        });
        assert.deepEqual([...dbRef.periodosHistoricos[0].regiao].sort(), ['Brasil', 'Portugal']);
        assert.deepEqual([...dbRef.periodosHistoricos[1].regiao].sort(), ['Brasil', 'Portugal']);
        assert.equal(r.alterados.length, 2);
        restaurarMassaPeriodosHistoricos(dbRef, r.alterados);
        assert.deepEqual(dbRef.periodosHistoricos[0].regiao, ['Brasil']);
        assert.deepEqual(dbRef.periodosHistoricos[1].regiao, []);
    });

    it('valida: lista vazia é recusada', () => {
        assert.equal(
            validarOperacaoPeriodoHistorico({ campo: 'regiao', acao: 'adicionar', valores: [] }),
            'Digite o valor.',
        );
    });
});

describe('Correntes: vários valores', () => {
    const base = { regiaoOrigem: [], temas: [], tecnicas: [], paiId: null };
    const montar = () => ({
        movimentosEscolas: [
            { ...base, id: 1, nome: 'Barroco', temas: ['Morte'], regiaoOrigem: ['Portugal'] },
            { ...base, id: 2, nome: 'Romantismo' },
        ],
    });

    it('Temas: acrescenta vários e pula o que a corrente já tinha', () => {
        const dbRef = montar();
        const r = aplicarMassaCorrentes(dbRef, [1, 2], {
            campo: 'temas',
            acao: 'adicionar',
            valores: ['Amor', 'Morte', 'Tempo'],
        });
        assert.deepEqual(dbRef.movimentosEscolas[0].temas, ['Morte', 'Amor', 'Tempo']);
        assert.deepEqual(dbRef.movimentosEscolas[1].temas, ['Amor', 'Morte', 'Tempo']);
        assert.equal(r.alterados.length, 2);
    });

    it('Região de origem: vários lugares e remoção de vários', () => {
        const dbRef = montar();
        aplicarMassaCorrentes(dbRef, [1, 2], {
            campo: 'regiao',
            acao: 'adicionar',
            valores: ['Brasil', 'Portugal'],
        });
        assert.deepEqual([...dbRef.movimentosEscolas[0].regiaoOrigem].sort(), [
            'Brasil',
            'Portugal',
        ]);
        const r = aplicarMassaCorrentes(dbRef, [1, 2], {
            campo: 'regiao',
            acao: 'remover',
            valores: ['Brasil', 'Portugal'],
        });
        assert.deepEqual(dbRef.movimentosEscolas[0].regiaoOrigem, []);
        assert.deepEqual(dbRef.movimentosEscolas[1].regiaoOrigem, []);
        restaurarMassaCorrentes(dbRef, r.alterados);
        assert.equal(dbRef.movimentosEscolas[0].regiaoOrigem.length, 2);
    });

    it('valida: lista vazia é recusada; `valor` único continua valendo', () => {
        assert.equal(
            validarOperacaoCorrente({ campo: 'temas', acao: 'adicionar', valores: [] }),
            'Digite o valor.',
        );
        assert.equal(
            validarOperacaoCorrente({ campo: 'temas', acao: 'adicionar', valor: 'A' }),
            null,
        );
    });
});
