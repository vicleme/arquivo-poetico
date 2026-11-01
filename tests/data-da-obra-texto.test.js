import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    chaveDaDataObra,
    criarDataObra,
    formatarDataObra,
    lerTextoDataObra,
    MENSAGENS_ERRO_DATA_OBRA,
    pedidoDeDatas,
} from '../js/data-da-obra.js';

// Data da obra (entrega 7): o leitor do texto da célula do Modo revisão e o
// pedido de datas do diálogo "Corrigir obra" (só a ponta que mudou).

const le = (texto) => {
    const { data, erro } = lerTextoDataObra(texto);
    assert.equal(erro, undefined, `erro inesperado em ${JSON.stringify(texto)}: ${erro}`);
    return data;
};
const escrito = (texto) => formatarDataObra(le(texto));
const erro = (texto) => lerTextoDataObra(texto).erro;

describe('lerTextoDataObra: o que formatarDataObra escreve', () => {
    it('lê de volta toda forma escrita, em todos os níveis, com a.C. e aprox.', () => {
        const base = [
            { nivel: 'seculo', seculo: 20 },
            { nivel: 'seculo', seculo: 5 },
            { nivel: 'seculo', seculo: 99 },
            { nivel: 'decada', decada: 1920 },
            { nivel: 'decada', decada: 430 },
            { nivel: 'decada', decada: 10 },
            { nivel: 'ano', ano: 1922 },
            { nivel: 'ano', ano: 44 },
            { nivel: 'ano', ano: 1 },
            { nivel: 'mes', ano: 1922, mes: 2 },
            { nivel: 'mes', ano: 1922, mes: 12 },
            { nivel: 'dia', ano: 1922, mes: 2, dia: 11 },
            { nivel: 'dia', ano: 44, mes: 3, dia: 15 },
        ];
        let conferidas = 0;
        base.forEach((dado) => {
            [false, true].forEach((aC) => {
                [false, true].forEach((aprox) => {
                    const { data } = criarDataObra({ ...dado, aC, aprox });
                    const texto = formatarDataObra(data);
                    const volta = lerTextoDataObra(texto);
                    assert.equal(volta.erro, undefined, `${texto}: ${volta.erro}`);
                    assert.equal(chaveDaDataObra(volta.data), chaveDaDataObra(data), texto);
                    assert.deepEqual(volta.data, data, texto);
                    conferidas += 1;
                });
            });
        });
        assert.equal(conferidas, 52);
    });

    it('os exemplos do pedido: 1922, séc. XX e década de 1920', () => {
        assert.equal(le('1922').nivel, 'ano');
        assert.equal(le('séc. XX').seculo, 20);
        assert.equal(le('década de 1920').decada, 1920);
    });
});

describe('lerTextoDataObra: formas de digitar', () => {
    it('século: sem acento, sem ponto, com número, romano minúsculo ou ordinal', () => {
        ['séc. XX', 'sec XX', 'sec. xx', 'século XX', 'Século 20', 'séc.20', '20º século'].forEach(
            (t) => assert.equal(escrito(t), 'séc. XX', t),
        );
        assert.equal(escrito('séc. v a.C.'), 'séc. V a.C.');
        assert.equal(escrito('5º século a.C.'), 'séc. V a.C.');
    });

    it('década: década de, década, anos e o s final, com o ano inteiro', () => {
        ['década de 1920', 'decada 1920', 'Década De 1920', 'anos 1920', '1920s'].forEach((t) =>
            assert.equal(escrito(t), 'década de 1920', t),
        );
        assert.equal(escrito('década de 430 a.C.'), 'década de 430 a.C.');
    });

    it('"anos 20" e "20s" não valem: podem ser 1920 ou 2020', () => {
        assert.equal(erro('anos 20'), 'decada-invalida');
        assert.equal(erro('20s'), 'decada-invalida');
        assert.equal(erro('anos 1925'), 'decada-invalida');
    });

    it('ano: número, "ano" na frente e d.C. ou a.C. atrás, com qualquer pontuação', () => {
        assert.equal(escrito('  1922  '), '1922');
        assert.equal(escrito('ano 1922'), '1922');
        assert.equal(escrito('1922 d.C.'), '1922');
        assert.equal(escrito('1922 dC'), '1922');
        ['44 a.C.', '44 aC', '44 AC', '44 a. C.', '44 a.c.', '44 antes de Cristo'].forEach((t) =>
            assert.equal(escrito(t), '44 a.C.', t),
        );
    });

    it('mês: 02/1922, 2/1922, 1922-02, nome inteiro ou abreviado', () => {
        [
            '02/1922',
            '2/1922',
            '1922-02',
            '1922/02',
            'fevereiro de 1922',
            'Fevereiro 1922',
            'fev/1922',
            'fev. de 1922',
            'fev 1922',
        ].forEach((t) => assert.equal(escrito(t), '02/1922', t));
        assert.equal(escrito('março de 1922'), '03/1922');
        assert.equal(escrito('marco de 1922'), '03/1922');
    });

    it('dia: dia/mês/ano, com barra, traço ou ponto, ISO ou por extenso', () => {
        [
            '11/02/1922',
            '11/2/1922',
            '11-02-1922',
            '11.02.1922',
            '1922-02-11',
            '1922/02/11',
            '11 de fevereiro de 1922',
            '11 fev 1922',
            '11 de fev. de 1922',
        ].forEach((t) => assert.equal(escrito(t), '11/02/1922', t));
        assert.equal(escrito('15/03/44 a.C.'), '15/03/44 a.C.');
    });

    it('aprox.: na frente ou atrás, com as grafias comuns', () => {
        [
            'aprox. 1922',
            'aprox 1922',
            'Aproximadamente 1922',
            '1922 aprox.',
            '1922 (aprox.)',
            'ca. 1922',
            'c. 1922',
            'circa 1922',
            'cerca de 1922',
            '~1922',
        ].forEach((t) => assert.equal(escrito(t), 'aprox. 1922', t));
        assert.equal(escrito('aprox. séc. XX'), 'aprox. séc. XX');
        assert.equal(escrito('aprox. 44 a.C.'), 'aprox. 44 a.C.');
        assert.equal(escrito('44 a.C. aprox.'), 'aprox. 44 a.C.');
    });
});

describe('lerTextoDataObra: vazio e erros', () => {
    it('texto vazio, só espaços, null e undefined querem dizer "sem data"', () => {
        ['', '   ', null, undefined].forEach((t) =>
            assert.deepEqual(lerTextoDataObra(t), { data: null }),
        );
    });

    it('o que não dá para entender é texto-invalido', () => {
        ['xx', 'ontem', 'séc.', 'década de', '1920 a 1935', '1922 - 1935', 'a.C.', '19 22'].forEach(
            (t) => assert.equal(erro(t), 'texto-invalido', t),
        );
        assert.equal(erro('11 de foo de 1922'), 'texto-invalido');
        assert.equal(erro('foo 1922'), 'texto-invalido');
    });

    it('entendeu a forma mas o valor não vale: o código de criarDataObra', () => {
        assert.equal(erro('30/02/1922'), 'dia-invalido');
        assert.equal(erro('29/02/1923'), 'dia-invalido');
        assert.equal(erro('13/1922'), 'mes-invalido');
        assert.equal(erro('0/1922'), 'mes-invalido');
        assert.equal(erro('década de 1925'), 'decada-invalida');
        assert.equal(erro('séc. C'), 'seculo-invalido');
        assert.equal(erro('séc. 100'), 'texto-invalido');
        assert.equal(erro('0'), 'ano-invalido');
        assert.equal(erro('10000'), 'ano-invalido');
    });

    it('29/02 vale em ano bissexto', () => {
        assert.equal(escrito('29/02/1924'), '29/02/1924');
    });

    it('todo código de erro do leitor tem mensagem, sem travessão', () => {
        ['texto-invalido', 'decada-invalida', 'dia-invalido', 'ano-invalido'].forEach((c) => {
            assert.ok(MENSAGENS_ERRO_DATA_OBRA[c], c);
            assert.ok(!/[—–]/.test(MENSAGENS_ERRO_DATA_OBRA[c]), c);
        });
    });

    it('a data devolvida traz o intervalo de anos', () => {
        const xx = le('séc. XX');
        assert.deepEqual([xx.de, xx.ate], [1901, 2000]);
        const aC = le('séc. V a.C.');
        assert.deepEqual([aC.de, aC.ate], [-500, -401]);
    });
});

describe('pedidoDeDatas: só a ponta que mudou', () => {
    const d = (texto) => le(texto);

    it('nada mudou: pedido vazio, mesmo que a data tenha vindo de outro objeto', () => {
        assert.deepEqual(
            pedidoDeDatas(
                { inicio: d('1922'), fim: d('1935') },
                { inicio: d('1922'), fim: d('1935') },
            ),
            {},
        );
        assert.deepEqual(pedidoDeDatas({}, {}), {});
        assert.deepEqual(pedidoDeDatas(), {});
        assert.deepEqual(
            pedidoDeDatas({ inicio: null, fim: null }, { inicio: null, fim: null }),
            {},
        );
    });

    it('só o começo mudou: só dataObra vai no pedido', () => {
        const pedido = pedidoDeDatas(
            { inicio: d('1922'), fim: d('1935') },
            { inicio: d('1923'), fim: d('1935') },
        );
        assert.deepEqual(Object.keys(pedido), ['dataObra']);
        assert.equal(formatarDataObra(pedido.dataObra), '1923');
    });

    it('só o fim mudou: só dataObraAte vai no pedido', () => {
        const pedido = pedidoDeDatas(
            { inicio: d('1922'), fim: null },
            { inicio: d('1922'), fim: d('séc. XX') },
        );
        assert.deepEqual(Object.keys(pedido), ['dataObraAte']);
        assert.equal(formatarDataObra(pedido.dataObraAte), 'séc. XX');
    });

    it('apagar uma ponta vai como null', () => {
        const pedido = pedidoDeDatas(
            { inicio: d('1922'), fim: d('1935') },
            { inicio: d('1922'), fim: null },
        );
        assert.deepEqual(pedido, { dataObraAte: null });
    });

    it('aprox. ou a.C. diferentes contam como mudança; a mesma data não', () => {
        assert.deepEqual(
            Object.keys(pedidoDeDatas({ inicio: d('1922') }, { inicio: d('aprox. 1922') })),
            ['dataObra'],
        );
        assert.deepEqual(pedidoDeDatas({ inicio: d('44') }, { inicio: d('44 d.C.') }), {});
    });

    it('as duas pontas mudando entram as duas, e data que não vale conta como vazia', () => {
        const pedido = pedidoDeDatas(
            { inicio: d('1922'), fim: d('1935') },
            { inicio: d('1930'), fim: { nivel: 'ano', ano: 'xx' } },
        );
        assert.equal(formatarDataObra(pedido.dataObra), '1930');
        assert.equal(pedido.dataObraAte, null);
    });

    it('o pedido é de data completa, com o intervalo de anos', () => {
        const pedido = pedidoDeDatas({}, { inicio: d('década de 1920') });
        assert.deepEqual([pedido.dataObra.de, pedido.dataObra.ate], [1920, 1929]);
    });
});
