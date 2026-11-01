import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
    aplicarEdicaoEmMassa,
    descreverOperacoes,
    MENSAGENS_ERRO_MASSA,
    normalizarOperacoes,
    planejarEdicaoEmMassa,
} from '../js/revisao-massa-fora-do-acervo.js';
import { listarLinhasRevisao, filtrarLinhasRevisao } from '../js/revisao-fora-do-acervo.js';

// Edição em massa do Modo revisão: a mesma operação em todas as linhas que o
// filtro mostra, pelo plano e pelo Desfazer do Modo revisão.

let poemas;
let prosas;
const dados = () => ({ poemas, prosas });
const chavesDe = (consulta = '', opcoes = {}) =>
    filtrarLinhasRevisao(listarLinhasRevisao(dados()), consulta, opcoes).map((l) => l.chave);
const todas = () => listarLinhasRevisao(dados()).map((l) => l.chave);

beforeEach(() => {
    poemas = [
        {
            id: 1,
            titulo: 'Prometeu',
            intertextualidade: [
                { relacao: 'Alusão', tipoObra: 'Mitologia', obra: 'Mito de Prometeu', autor: '' },
                {
                    relacao: 'Citação',
                    tipoObra: 'Mitologia',
                    obra: 'Édipo',
                    autor: '',
                    origemObra: ['Roma'],
                    personagens: ['Édipo'],
                },
            ],
            hipertextualidade: [
                { relacao: 'Paródia', tipoObra: 'Livro', hipotexto: 'Odisseia', autor: 'Homero' },
            ],
        },
    ];
    prosas = [
        {
            id: 7,
            titulo: 'Casa',
            intertextualidade: [
                {
                    relacao: 'Alusão',
                    tipoObra: 'Livro',
                    obra: 'Sagarana',
                    autor: 'Guimarães Rosa',
                    origemObra: ['Brasil'],
                },
            ],
        },
    ];
});

const entradaDe = (obra) =>
    [...poemas, ...prosas]
        .flatMap((t) => [...(t.intertextualidade || []), ...(t.hipertextualidade || [])])
        .find((e) => (e.obra || e.hipotexto) === obra);

describe('normalizarOperacoes', () => {
    it('recusa lista vazia, valor desconhecido e repetido', () => {
        assert.equal(normalizarOperacoes([]).erro, 'sem-operacao');
        assert.equal(
            normalizarOperacoes([{ valor: 'nota', texto: 'x' }]).erro,
            'operacao-invalida',
        );
        assert.equal(
            normalizarOperacoes([
                { valor: 'tipoObra', texto: 'a' },
                { valor: 'tipoObra', texto: 'b' },
            ]).erro,
            'operacao-repetida',
        );
    });

    it('exige valores em adicionar, substituir e remover, mas não em limpar', () => {
        assert.equal(
            normalizarOperacoes([{ valor: 'origem', modo: 'adicionar', valores: [' '] }]).erro,
            'valor-vazio',
        );
        assert.equal(normalizarOperacoes([{ valor: 'origem', modo: 'limpar' }]).erro, '');
        assert.equal(
            normalizarOperacoes([{ valor: 'personagem', modo: 'substituir', valores: ['a'] }]).erro,
            'operacao-invalida',
        );
    });

    it('confere o tipo de cada operação', () => {
        assert.equal(
            normalizarOperacoes([{ valor: 'obraPessoal', marcado: 'sim' }]).erro,
            'operacao-invalida',
        );
        assert.equal(normalizarOperacoes([{ valor: 'tipoObra' }]).erro, 'operacao-invalida');
    });
});

describe('origem em massa', () => {
    it('adiciona a origem a todas as linhas filtradas e junta às que já existem', () => {
        const chaves = chavesDe('', { campo: 'intertextualidade' }).filter((c) =>
            c.startsWith('poema'),
        );
        const plano = planejarEdicaoEmMassa(dados(), chaves, [
            { valor: 'origem', modo: 'adicionar', valores: ['Grécia'] },
        ]);
        assert.equal(plano.erro, '');
        assert.equal(plano.alvos, 2);
        assert.equal(plano.entradas, 2);
        aplicarEdicaoEmMassa(plano);
        assert.deepEqual(entradaDe('Mito de Prometeu').origemObra, ['Grécia']);
        assert.deepEqual(entradaDe('Édipo').origemObra, ['Roma', 'Grécia']);
        assert.equal('origemObra' in entradaDe('Sagarana'), true);
        assert.deepEqual(entradaDe('Sagarana').origemObra, ['Brasil']);
    });

    it('adicionar ignora acento e caixa e mantém a grafia que já estava', () => {
        const plano = planejarEdicaoEmMassa(dados(), todas(), [
            { valor: 'origem', modo: 'adicionar', valores: ['brasil'] },
        ]);
        aplicarEdicaoEmMassa(plano);
        assert.deepEqual(entradaDe('Sagarana').origemObra, ['Brasil']);
        assert.equal(plano.semMudanca, 1);
        assert.equal(plano.entradas, 3);
    });

    it('substitui a lista inteira, remove só as citadas e limpa tudo', () => {
        let plano = planejarEdicaoEmMassa(dados(), todas(), [
            { valor: 'origem', modo: 'substituir', valores: ['Grécia', 'Roma'] },
        ]);
        aplicarEdicaoEmMassa(plano);
        assert.deepEqual(entradaDe('Sagarana').origemObra, ['Grécia', 'Roma']);

        plano = planejarEdicaoEmMassa(dados(), todas(), [
            { valor: 'origem', modo: 'remover', valores: ['roma'] },
        ]);
        aplicarEdicaoEmMassa(plano);
        assert.deepEqual(entradaDe('Sagarana').origemObra, ['Grécia']);

        plano = planejarEdicaoEmMassa(dados(), todas(), [{ valor: 'origem', modo: 'limpar' }]);
        aplicarEdicaoEmMassa(plano);
        assert.equal('origemObra' in entradaDe('Sagarana'), false);
        assert.equal('origemObra' in entradaDe('Odisseia'), false);
    });

    it('vale na Hipertextualidade', () => {
        const plano = planejarEdicaoEmMassa(dados(), todas(), [
            { valor: 'origem', modo: 'adicionar', valores: ['Grécia'] },
        ]);
        aplicarEdicaoEmMassa(plano);
        assert.deepEqual(entradaDe('Odisseia').origemObra, ['Grécia']);
    });

    it('o Desfazer devolve cada entrada como estava, inclusive sem a chave', () => {
        const antes = JSON.stringify(dados());
        const plano = planejarEdicaoEmMassa(dados(), todas(), [
            { valor: 'origem', modo: 'substituir', valores: ['Grécia'] },
        ]);
        const resultado = aplicarEdicaoEmMassa(plano);
        assert.notEqual(JSON.stringify(dados()), antes);
        resultado.desfazer();
        assert.equal(JSON.stringify(dados()), antes);
    });
});

describe('outros valores em massa', () => {
    it('define o tipo de obra, a obra pessoal e a relação nas linhas escolhidas', () => {
        const chaves = chavesDe('Livro');
        const plano = planejarEdicaoEmMassa(dados(), chaves, [
            { valor: 'tipoObra', texto: 'Epopeia' },
            { valor: 'obraPessoal', marcado: true },
            { valor: 'relacao', texto: 'Referência' },
        ]);
        aplicarEdicaoEmMassa(plano);
        assert.equal(entradaDe('Odisseia').tipoObra, 'Epopeia');
        assert.equal(entradaDe('Odisseia').obraPessoal, true);
        assert.equal(entradaDe('Odisseia').relacao, 'Referência');
        assert.equal(entradaDe('Édipo').tipoObra, 'Mitologia');
    });

    it('define a data da obra e recusa o par com o fim antes do começo', () => {
        let plano = planejarEdicaoEmMassa(dados(), todas(), [{ valor: 'dataObra', texto: '1922' }]);
        assert.equal(plano.erro, '');
        aplicarEdicaoEmMassa(plano);
        assert.equal(entradaDe('Sagarana').dataObra.ano, 1922);

        plano = planejarEdicaoEmMassa(dados(), todas(), [
            { valor: 'dataObra', texto: '1950' },
            { valor: 'dataObraAte', texto: '1900' },
        ]);
        assert.equal(plano.erro, 'data-obra-fim-antes-do-inicio');
        assert.equal(plano.entradas, 0);
    });

    it('recusa uma data que não entende, sem gravar nada', () => {
        const plano = planejarEdicaoEmMassa(dados(), todas(), [
            { valor: 'dataObra', texto: 'xyz' },
        ]);
        assert.equal(plano.erro, 'data-obra-invalida');
    });

    it('personagem e traduzido só valem na Intertextualidade', () => {
        const plano = planejarEdicaoEmMassa(dados(), todas(), [
            { valor: 'personagem', modo: 'adicionar', valores: ['Zeus'] },
            { valor: 'traduzido', marcado: true },
        ]);
        aplicarEdicaoEmMassa(plano);
        assert.deepEqual(entradaDe('Mito de Prometeu').personagens, ['Zeus']);
        assert.deepEqual(entradaDe('Édipo').personagens, ['Édipo', 'Zeus']);
        assert.equal(entradaDe('Sagarana').traduzido, true);
        assert.equal('personagens' in entradaDe('Odisseia'), false);
        assert.equal('traduzido' in entradaDe('Odisseia'), false);
        assert.equal(plano.semAplicacao, 1);
        assert.equal(plano.alvos, 4);
    });

    it('uma linha em que nada vale conta em semAplicacao e nada se grava', () => {
        const chaves = chavesDe('Odisseia');
        const plano = planejarEdicaoEmMassa(dados(), chaves, [
            { valor: 'traduzido', marcado: true },
        ]);
        assert.equal(plano.erro, 'sem-edicao');
        assert.equal(plano.semAplicacao, 1);
    });
});

describe('recusas e mensagens', () => {
    it('sem linhas, sem operação e chaves que não existem', () => {
        const op = [{ valor: 'tipoObra', texto: 'x' }];
        assert.equal(planejarEdicaoEmMassa(dados(), [], op).erro, 'sem-linhas');
        assert.equal(
            planejarEdicaoEmMassa(dados(), ['poema:9:intertextualidade:0'], op).erro,
            'sem-linhas',
        );
        assert.equal(planejarEdicaoEmMassa(dados(), todas(), []).erro, 'sem-operacao');
        for (const erro of [
            'sem-linhas',
            'sem-operacao',
            'operacao-invalida',
            'operacao-repetida',
            'valor-vazio',
        ]) {
            assert.ok(MENSAGENS_ERRO_MASSA[erro], erro);
        }
        assert.ok(MENSAGENS_ERRO_MASSA['data-obra-invalida']);
    });

    it('descreve as operações em frases curtas', () => {
        assert.deepEqual(
            descreverOperacoes([
                { valor: 'origem', modo: 'adicionar', valores: ['Grécia', 'Roma'] },
                { valor: 'tipoObra', texto: 'Mitologia' },
                { valor: 'dataObra', texto: '' },
                { valor: 'obraPessoal', marcado: false },
                { valor: 'personagem', modo: 'limpar' },
            ]),
            [
                'adicionar origem «Grécia» e «Roma»',
                'tipo: «Mitologia»',
                'data da obra: tirar',
                'obra pessoal: não',
                'tirar todos os personagens',
            ],
        );
    });

    it('não repete a mesma chave nem muda quem já está igual', () => {
        const [primeira] = todas();
        const plano = planejarEdicaoEmMassa(
            dados(),
            [primeira, primeira],
            [{ valor: 'tipoObra', texto: 'Mitologia' }],
        );
        assert.equal(plano.alvos, 1);
        assert.equal(plano.entradas + plano.semMudanca, 1);
    });
});
