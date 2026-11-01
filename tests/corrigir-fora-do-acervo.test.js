import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { montarForaDoAcervo } from '../js/fora-do-acervo.js';
import {
    chaveDaObra,
    planejarCorrecao,
    aplicarPlano,
    MENSAGENS_ERRO_CORRECAO,
} from '../js/corrigir-fora-do-acervo.js';

// Correções da seção "Fora do acervo": renomear e juntar obra ou autor.

let poemas;
let prosas;

beforeEach(() => {
    poemas = [
        {
            id: 1,
            titulo: 'Águas',
            texto: 'não mexer',
            intertextualidade: [
                {
                    relacao: 'Citação',
                    tipoObra: 'Música',
                    obra: 'Águas de Março',
                    autor: 'Tom Jobim',
                },
            ],
            hipertextualidade: [],
        },
        {
            id: 2,
            titulo: 'Casmurro',
            intertextualidade: [
                {
                    relacao: 'Alusão',
                    tipoObra: 'Música',
                    obra: 'aguas de março',
                    autor: 'tom jobim',
                },
            ],
            hipertextualidade: [
                {
                    relacao: 'Paródia',
                    tipoObra: 'Livro',
                    hipotexto: 'Dom Casmurro, de Machado',
                    autor: '',
                },
            ],
        },
    ];
    prosas = [
        {
            id: 7,
            titulo: 'Conto',
            intertextualidade: [
                { relacao: 'Menção', tipoObra: 'Música', obra: 'Águas de Março', autor: '' },
            ],
            hipertextualidade: [
                {
                    relacao: 'Paródia',
                    tipoObra: 'Livro',
                    hipotexto: 'Dom Casmurro',
                    autor: 'Machado de Assis',
                },
            ],
        },
    ];
});

const dados = () => montarForaDoAcervo({ poemas, prosas });
const chaveDe = (obra, autor) => `${obra}|${autor}`;

describe('chaveDaObra', () => {
    it('é a mesma chave que a lista de obras usa', () => {
        const obras = dados().obras;
        const chaves = new Set(obras.map((o) => o.chave));
        const doPoema = poemas[0].intertextualidade[0];
        assert.ok(chaves.has(chaveDaObra(doPoema, 'obra')));
        const hiper = prosas[0].hipertextualidade[0];
        assert.ok(chaves.has(chaveDaObra(hiper, 'hipotexto')));
    });

    it('entrada sem nome não tem chave', () => {
        assert.equal(chaveDaObra({ obra: '  ', autor: 'X' }, 'obra'), '');
    });
});

describe('corrigir uma obra', () => {
    it('renomeia em todos os textos do grupo, juntando as grafias', () => {
        const plano = planejarCorrecao(
            { poemas, prosas },
            {
                tipo: 'obra',
                alvos: [chaveDe('aguas de marco', 'tom jobim')],
                novo: { obra: 'Águas de Março', autor: 'Tom Jobim' },
            },
        );
        assert.equal(plano.erro, '');
        assert.equal(plano.entradas, 1);
        assert.equal(plano.jaIguais, 1);
        assert.equal(plano.textos, 1);
        aplicarPlano(plano);
        assert.equal(poemas[1].intertextualidade[0].obra, 'Águas de Março');
        assert.equal(poemas[1].intertextualidade[0].autor, 'Tom Jobim');
    });

    it('corrige o nome em Hipertextualidade (hipotexto) e não mexe no resto', () => {
        const plano = planejarCorrecao(
            { poemas, prosas },
            {
                tipo: 'obra',
                alvos: [chaveDe('dom casmurro de machado', '')],
                novo: { obra: 'Dom Casmurro', autor: 'Machado de Assis' },
            },
        );
        aplicarPlano(plano);
        const h = poemas[1].hipertextualidade[0];
        assert.equal(h.hipotexto, 'Dom Casmurro');
        assert.equal(h.autor, 'Machado de Assis');
        assert.equal(h.relacao, 'Paródia');
        assert.equal(h.tipoObra, 'Livro');
        assert.equal(poemas[0].texto, 'não mexer');
    });

    it('conta quantos textos já tinham a obra de destino (junta com ela)', () => {
        const plano = planejarCorrecao(
            { poemas, prosas },
            {
                tipo: 'obra',
                alvos: [chaveDe('dom casmurro de machado', '')],
                novo: { obra: 'Dom Casmurro', autor: 'Machado de Assis' },
            },
        );
        assert.equal(plano.juntaCom, 1);
    });

    it('tipoObra ausente mantém o tipo; informado, troca', () => {
        const alvos = [chaveDe('aguas de marco', '')];
        const manter = planejarCorrecao(
            { poemas, prosas },
            { tipo: 'obra', alvos, novo: { obra: 'Águas de Março', autor: 'Tom Jobim' } },
        );
        aplicarPlano(manter);
        assert.equal(prosas[0].intertextualidade[0].tipoObra, 'Música');
        const trocar = planejarCorrecao(
            { poemas, prosas },
            {
                tipo: 'obra',
                alvos: [chaveDe('aguas de marco', 'tom jobim')],
                novo: { obra: 'Águas de Março', autor: 'Tom Jobim', tipoObra: 'Canção' },
            },
        );
        aplicarPlano(trocar);
        assert.equal(poemas[0].intertextualidade[0].tipoObra, 'Canção');
    });

    it('autor vazio vale: tira o autor da obra', () => {
        const plano = planejarCorrecao(
            { poemas, prosas },
            {
                tipo: 'obra',
                alvos: [chaveDe('aguas de marco', 'tom jobim')],
                novo: { obra: 'Águas de Março', autor: '' },
            },
        );
        aplicarPlano(plano);
        assert.equal(poemas[0].intertextualidade[0].autor, '');
        assert.equal(poemas[1].intertextualidade[0].autor, '');
    });

    it('nome vazio é recusado e nada muda', () => {
        const antes = JSON.stringify({ poemas, prosas });
        const plano = planejarCorrecao(
            { poemas, prosas },
            { tipo: 'obra', alvos: [chaveDe('aguas de marco', 'tom jobim')], novo: { obra: '  ' } },
        );
        assert.equal(plano.erro, 'nome-vazio');
        assert.equal(plano.alteracoes.length, 0);
        aplicarPlano(plano);
        assert.equal(JSON.stringify({ poemas, prosas }), antes);
    });
});

describe('juntar obras', () => {
    it('vários alvos viram a mesma obra', () => {
        const plano = planejarCorrecao(
            { poemas, prosas },
            {
                tipo: 'obra',
                alvos: [chaveDe('aguas de marco', 'tom jobim'), chaveDe('aguas de marco', '')],
                novo: { obra: 'Águas de Março', autor: 'Tom Jobim' },
            },
        );
        aplicarPlano(plano);
        const obras = dados().obras.filter((o) => o.chaveObra === 'aguas de marco');
        assert.equal(obras.length, 1);
        assert.equal(obras[0].totalTextos, 3);
        assert.equal(dados().quaseDuplicatas.filter((q) => q.motivo === 'autor').length, 0);
    });
});

describe('corrigir um autor', () => {
    it('troca o autor em Intertextualidade e em Hipertextualidade', () => {
        const plano = planejarCorrecao(
            { poemas, prosas },
            { tipo: 'autor', alvos: ['machado de assis'], novo: { autor: 'Machado' } },
        );
        assert.equal(plano.entradas, 1);
        aplicarPlano(plano);
        assert.equal(prosas[0].hipertextualidade[0].autor, 'Machado');
    });

    it('junta autores escritos de jeitos diferentes', () => {
        const plano = planejarCorrecao(
            { poemas, prosas },
            { tipo: 'autor', alvos: ['tom jobim'], novo: { autor: 'Antonio Carlos Jobim' } },
        );
        assert.equal(plano.entradas, 2);
        assert.equal(plano.textos, 2);
        aplicarPlano(plano);
        assert.equal(poemas[0].intertextualidade[0].autor, 'Antonio Carlos Jobim');
        assert.equal(poemas[1].intertextualidade[0].autor, 'Antonio Carlos Jobim');
        assert.equal(dados().autores.filter((a) => a.chave === 'tom jobim').length, 0);
    });

    it('autor vazio é recusado', () => {
        const plano = planejarCorrecao(
            { poemas, prosas },
            { tipo: 'autor', alvos: ['tom jobim'], novo: { autor: '' } },
        );
        assert.equal(plano.erro, 'autor-vazio');
        assert.equal(plano.entradas, 0);
    });

    it('nome igual ao que já está não gera alteração', () => {
        const plano = planejarCorrecao(
            { poemas, prosas },
            { tipo: 'autor', alvos: ['machado de assis'], novo: { autor: 'Machado de Assis' } },
        );
        assert.equal(plano.entradas, 0);
        assert.equal(plano.jaIguais, 1);
    });
});

describe('desfazer e robustez', () => {
    it('desfazer devolve tudo como estava, uma vez só', () => {
        const antes = JSON.stringify({ poemas, prosas });
        const plano = planejarCorrecao(
            { poemas, prosas },
            { tipo: 'autor', alvos: ['tom jobim'], novo: { autor: 'Outro' } },
        );
        const feito = aplicarPlano(plano);
        assert.notEqual(JSON.stringify({ poemas, prosas }), antes);
        feito.desfazer();
        assert.equal(JSON.stringify({ poemas, prosas }), antes);
        feito.desfazer();
        assert.equal(JSON.stringify({ poemas, prosas }), antes);
    });

    it('planejar não altera os dados', () => {
        const antes = JSON.stringify({ poemas, prosas });
        planejarCorrecao(
            { poemas, prosas },
            { tipo: 'autor', alvos: ['tom jobim'], novo: { autor: 'Outro' } },
        );
        assert.equal(JSON.stringify({ poemas, prosas }), antes);
    });

    it('pedido sem alvo, tipo errado ou entrada vazia não quebram', () => {
        assert.equal(
            planejarCorrecao({ poemas, prosas }, { tipo: 'obra', alvos: [] }).erro,
            'sem-alvo',
        );
        assert.equal(
            planejarCorrecao({ poemas, prosas }, { tipo: 'x', alvos: ['a'] }).erro,
            'tipo-invalido',
        );
        assert.doesNotThrow(() => planejarCorrecao(undefined, undefined));
        assert.doesNotThrow(() => aplicarPlano(undefined));
        assert.equal(Object.keys(MENSAGENS_ERRO_CORRECAO).length, 7);
    });

    it('entradas fora do formato são ignoradas', () => {
        poemas.push({
            id: 9,
            titulo: 'X',
            intertextualidade: ['lixo', null, { obra: 'Sem autor' }],
        });
        const plano = planejarCorrecao(
            { poemas, prosas },
            { tipo: 'autor', alvos: ['tom jobim'], novo: { autor: 'Outro' } },
        );
        assert.equal(plano.erro, '');
    });
});

describe('chave nos avisos de quase-duplicata', () => {
    it('cada item traz a chave da obra, para o botão Juntar', () => {
        const q = dados().quaseDuplicatas;
        assert.ok(q.length >= 1);
        q.forEach((aviso) => aviso.itens.forEach((i) => assert.equal(typeof i.chave, 'string')));
        const porAutor = q.find((a) => a.motivo === 'autor');
        assert.ok(porAutor.itens.every((i) => i.chave.startsWith('aguas de marco|')));
    });
});

describe('Descrição da obra', () => {
    const alvoJobim = () => [chaveDe('aguas de marco', 'tom jobim')];
    const pedido = (novo) => ({
        tipo: 'obra',
        alvos: alvoJobim(),
        novo: { obra: 'Águas de Março', autor: 'Tom Jobim', ...novo },
    });

    beforeEach(() => {
        poemas[0].intertextualidade[0].descricao = 'Canção de 1972';
        poemas[1].intertextualidade[0].descricao = 'Música brasileira';
    });

    it('descrição ausente no pedido mantém a de cada entrada', () => {
        const plano = planejarCorrecao({ poemas, prosas }, pedido({ tipoObra: 'Canção' }));
        aplicarPlano(plano);
        assert.equal(poemas[0].intertextualidade[0].descricao, 'Canção de 1972');
        assert.equal(poemas[1].intertextualidade[0].descricao, 'Música brasileira');
        assert.equal(plano.descricoesSobrescritas, 0);
    });

    it('descrição informada vale para todas as entradas da obra e conta as sobrescritas', () => {
        const plano = planejarCorrecao({ poemas, prosas }, pedido({ descricao: '  Bossa, 1972 ' }));
        assert.equal(plano.descricoesSobrescritas, 2);
        aplicarPlano(plano);
        assert.equal(poemas[0].intertextualidade[0].descricao, 'Bossa, 1972');
        assert.equal(poemas[1].intertextualidade[0].descricao, 'Bossa, 1972');
    });

    it('só a descrição diferente já é uma mudança; tudo igual é "já está assim"', () => {
        Object.assign(poemas[1].intertextualidade[0], {
            obra: 'Águas de Março',
            autor: 'Tom Jobim',
            descricao: 'Canção de 1972',
        });
        const igual = planejarCorrecao({ poemas, prosas }, pedido({ descricao: 'Canção de 1972' }));
        assert.ok(igual.jaIguais >= 2);
        const mudou = planejarCorrecao({ poemas, prosas }, pedido({ descricao: 'Outra' }));
        assert.equal(mudou.alteracoes.length, mudou.entradas);
        assert.ok(mudou.entradas >= 2);
    });

    it('descrição vazia limpa a descrição', () => {
        const plano = planejarCorrecao({ poemas, prosas }, pedido({ descricao: '' }));
        aplicarPlano(plano);
        assert.equal(poemas[0].intertextualidade[0].descricao, '');
        assert.equal(poemas[1].intertextualidade[0].descricao, '');
    });

    it('não conta como sobrescrita quem não tinha descrição', () => {
        poemas[1].intertextualidade[0].descricao = '';
        const plano = planejarCorrecao({ poemas, prosas }, pedido({ descricao: 'Nova' }));
        assert.equal(plano.descricoesSobrescritas, 1);
    });

    it('Desfazer devolve a descrição e remove o campo de quem não o tinha', () => {
        delete poemas[1].intertextualidade[0].descricao;
        const plano = planejarCorrecao({ poemas, prosas }, pedido({ descricao: 'Nova' }));
        const feito = aplicarPlano(plano);
        assert.equal(poemas[1].intertextualidade[0].descricao, 'Nova');
        feito.desfazer();
        assert.equal(poemas[0].intertextualidade[0].descricao, 'Canção de 1972');
        assert.equal('descricao' in poemas[1].intertextualidade[0], false);
    });

    it('correções sem descrição não criam o campo nas entradas que não o tinham', () => {
        delete poemas[1].intertextualidade[0].descricao;
        const plano = planejarCorrecao(
            { poemas, prosas },
            { tipo: 'autor', alvos: ['tom jobim'], novo: { autor: 'Antonio Carlos Jobim' } },
        );
        aplicarPlano(plano);
        assert.equal('descricao' in poemas[1].intertextualidade[0], false);
        assert.equal(poemas[0].intertextualidade[0].descricao, 'Canção de 1972');
    });

    it('vale também para o hipotexto de Hipertextualidade', () => {
        poemas[1].hipertextualidade[0].descricao = 'Romance de 1899';
        const plano = planejarCorrecao(
            { poemas, prosas },
            {
                tipo: 'obra',
                alvos: [chaveDe('dom casmurro de machado', '')],
                novo: {
                    obra: 'Dom Casmurro',
                    autor: 'Machado de Assis',
                    descricao: 'Romance, 1899',
                },
            },
        );
        aplicarPlano(plano);
        assert.equal(poemas[1].hipertextualidade[0].descricao, 'Romance, 1899');
    });

    it('a obra mostra a descrição mais usada e as diferentes', () => {
        poemas[1].intertextualidade[0].descricao = 'Canção de 1972';
        prosas[0].intertextualidade[0].descricao = 'Música brasileira';
        const dados = montarForaDoAcervo({ poemas, prosas });
        const obra = dados.obras.find((o) => o.chave === 'aguas de marco|tom jobim');
        assert.equal(obra.descricao, 'Canção de 1972');
        assert.deepEqual(obra.descricoes, ['Canção de 1972']);
    });
});
