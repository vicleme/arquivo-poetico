import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    agruparDatasDaObra,
    capturarDatasDaEntrada,
    chaveDaDataObra,
    chaveDasDatasDaEntrada,
    criarDataObra,
    datasDaEntrada,
    definirDatasDaEntrada,
    formatarDataObra,
    formatarIntervaloDataObra,
    intervaloDeAnosDoPar,
    lerDataObra,
    mesmaDataObra,
    MENSAGENS_ERRO_DATA_OBRA,
    numeroParaRomano,
    restaurarDatasDaEntrada,
    validarDataObra,
    validarIntervaloDaData,
} from '../js/data-da-obra.js';

// Data da obra (entrega 5): lógica pura do nível, do intervalo de anos,
// de "aprox." e "a.C.".

const feito = (entrada) => {
    const { data, erro } = criarDataObra(entrada);
    assert.equal(erro, undefined, `erro inesperado: ${erro}`);
    return data;
};

describe('criarDataObra: o intervalo de anos de cada nível', () => {
    it('século d.C. cobre do ano 1 do século ao ano 100', () => {
        const xx = feito({ nivel: 'seculo', seculo: 20 });
        assert.deepEqual([xx.de, xx.ate], [1901, 2000]);
        const i = feito({ nivel: 'seculo', seculo: 1 });
        assert.deepEqual([i.de, i.ate], [1, 100]);
    });

    it('século a.C. conta para trás e não tem ano zero', () => {
        const v = feito({ nivel: 'seculo', seculo: 5, aC: true });
        assert.deepEqual([v.de, v.ate], [-500, -401]);
        const i = feito({ nivel: 'seculo', seculo: 1, aC: true });
        assert.deepEqual([i.de, i.ate], [-100, -1]);
    });

    it('século aceita romanos, em qualquer caixa, e texto numérico', () => {
        assert.equal(feito({ nivel: 'seculo', seculo: 'XIX' }).seculo, 19);
        assert.equal(feito({ nivel: 'seculo', seculo: ' xxi ' }).seculo, 21);
        assert.equal(feito({ nivel: 'seculo', seculo: '20' }).seculo, 20);
    });

    it('década d.C. cobre dez anos e a.C. cobre os dez anos anteriores', () => {
        const d = feito({ nivel: 'decada', decada: 1920 });
        assert.deepEqual([d.de, d.ate], [1920, 1929]);
        const a = feito({ nivel: 'decada', decada: 430, aC: true });
        assert.deepEqual([a.de, a.ate], [-439, -430]);
    });

    it('ano, mês e dia cobrem só o próprio ano', () => {
        for (const entrada of [
            { nivel: 'ano', ano: 1922 },
            { nivel: 'mes', ano: 1922, mes: 2 },
            { nivel: 'dia', ano: 1922, mes: 2, dia: 11 },
        ]) {
            const d = feito(entrada);
            assert.deepEqual([d.de, d.ate], [1922, 1922]);
        }
        const aC = feito({ nivel: 'dia', ano: 44, mes: 3, dia: 15, aC: true });
        assert.deepEqual([aC.de, aC.ate], [-44, -44]);
    });

    it('a data guarda só as chaves do nível e as marcas sempre booleanas', () => {
        assert.deepEqual(feito({ nivel: 'ano', ano: 1922, mes: 5, dia: 3, seculo: 20 }), {
            nivel: 'ano',
            ano: 1922,
            aC: false,
            aprox: false,
            de: 1922,
            ate: 1922,
        });
        const d = feito({ nivel: 'mes', ano: '1922', mes: '2', aC: 'sim', aprox: true });
        assert.equal(d.aC, false, 'só true vale como marcado');
        assert.equal(d.aprox, true);
        assert.equal(d.ano, 1922);
        assert.equal(d.mes, 2);
    });

    it('aprox. não muda o intervalo de anos', () => {
        const a = feito({ nivel: 'ano', ano: 1500, aprox: true });
        const b = feito({ nivel: 'ano', ano: 1500 });
        assert.deepEqual([a.de, a.ate], [b.de, b.ate]);
    });
});

describe('criarDataObra: recusas', () => {
    const erro = (e) => criarDataObra(e).erro;

    it('nível ausente ou desconhecido, e entrada que não é objeto', () => {
        assert.equal(erro({ ano: 1922 }), 'nivel-invalido');
        assert.equal(erro({ nivel: 'semana', ano: 1922 }), 'nivel-invalido');
        assert.equal(erro(null), 'nivel-invalido');
        assert.equal(erro('1922'), 'nivel-invalido');
        assert.equal(erro([]), 'nivel-invalido');
    });

    it('século fora de 1 a 99, vazio ou romano que não existe', () => {
        assert.equal(erro({ nivel: 'seculo', seculo: 0 }), 'seculo-invalido');
        assert.equal(erro({ nivel: 'seculo', seculo: 100 }), 'seculo-invalido');
        assert.equal(erro({ nivel: 'seculo', seculo: '' }), 'seculo-invalido');
        assert.equal(erro({ nivel: 'seculo', seculo: 'IIX' }), 'seculo-invalido');
        assert.equal(erro({ nivel: 'seculo', seculo: 'abc' }), 'seculo-invalido');
        assert.equal(erro({ nivel: 'seculo', seculo: 20.5 }), 'seculo-invalido');
    });

    it('década precisa terminar em zero e ser de 10 em diante', () => {
        assert.equal(erro({ nivel: 'decada', decada: 1925 }), 'decada-invalida');
        assert.equal(erro({ nivel: 'decada', decada: 0 }), 'decada-invalida');
        assert.equal(erro({ nivel: 'decada', decada: 10000 }), 'decada-invalida');
        assert.equal(erro({ nivel: 'decada' }), 'decada-invalida');
    });

    it('ano de 1 a 9999, só dígitos', () => {
        assert.equal(erro({ nivel: 'ano', ano: 0 }), 'ano-invalido');
        assert.equal(erro({ nivel: 'ano', ano: -5 }), 'ano-invalido');
        assert.equal(erro({ nivel: 'ano', ano: 10000 }), 'ano-invalido');
        assert.equal(erro({ nivel: 'ano', ano: '19x2' }), 'ano-invalido');
        assert.equal(erro({ nivel: 'ano', ano: '' }), 'ano-invalido');
        assert.equal(erro({ nivel: 'ano', ano: 1922.5 }), 'ano-invalido');
        assert.equal(erro({ nivel: 'ano', ano: true }), 'ano-invalido');
    });

    it('mês de 1 a 12 e dia que existe naquele mês', () => {
        assert.equal(erro({ nivel: 'mes', ano: 1922, mes: 13 }), 'mes-invalido');
        assert.equal(erro({ nivel: 'mes', ano: 1922 }), 'mes-invalido');
        assert.equal(erro({ nivel: 'dia', ano: 1922, mes: 4, dia: 31 }), 'dia-invalido');
        assert.equal(erro({ nivel: 'dia', ano: 1922, mes: 4 }), 'dia-invalido');
        assert.equal(erro({ nivel: 'dia', ano: 1922, mes: 1, dia: 0 }), 'dia-invalido');
    });

    it('29 de fevereiro só em ano bissexto (gregoriano depois de 1582, juliano antes)', () => {
        const dia29 = (ano, aC = false) => erro({ nivel: 'dia', ano, mes: 2, dia: 29, aC });
        assert.equal(dia29(1922), 'dia-invalido');
        assert.equal(dia29(1924), undefined);
        assert.equal(dia29(1900), 'dia-invalido');
        assert.equal(dia29(2000), undefined);
        assert.equal(dia29(1500), undefined, 'juliano: 1500 é bissexto');
        assert.equal(dia29(45, true), undefined, '45 a.C. foi bissexto (ano astronômico -44)');
        assert.equal(dia29(44, true), 'dia-invalido');
    });

    it('todo código de erro tem mensagem, sem travessão', () => {
        const codigos = [
            'nivel-invalido',
            'seculo-invalido',
            'decada-invalida',
            'ano-invalido',
            'mes-invalido',
            'dia-invalido',
            'fim-antes-do-inicio',
            'texto-invalido',
        ];
        codigos.forEach((c) => {
            assert.ok(MENSAGENS_ERRO_DATA_OBRA[c], c);
            assert.ok(!/[—–]/.test(MENSAGENS_ERRO_DATA_OBRA[c]), c);
        });
        assert.equal(Object.keys(MENSAGENS_ERRO_DATA_OBRA).length, codigos.length);
    });
});

describe('lerDataObra, validarDataObra e identidade', () => {
    it('lê uma data já gravada e recalcula o intervalo em vez de confiar nele', () => {
        const gravada = { nivel: 'ano', ano: 1922, aC: false, aprox: false, de: 1, ate: 2 };
        const lida = lerDataObra(gravada);
        assert.deepEqual([lida.de, lida.ate], [1922, 1922]);
    });

    it('vazio e lixo viram null', () => {
        [null, undefined, '', 'texto', 5, [], {}, { nivel: 'ano' }].forEach((v) => {
            assert.equal(lerDataObra(v), null);
        });
        assert.equal(validarDataObra({ nivel: 'ano', ano: 1922 }), '');
        assert.equal(validarDataObra({ nivel: 'ano' }), 'ano-invalido');
    });

    it('a identidade separa nível, a.C. e aprox., e ignora de e ate', () => {
        const base = { nivel: 'ano', ano: 1922 };
        assert.ok(mesmaDataObra(base, { ...base, de: 9, ate: 9 }));
        assert.ok(!mesmaDataObra(base, { ...base, aprox: true }));
        assert.ok(!mesmaDataObra(base, { ...base, aC: true }));
        assert.ok(!mesmaDataObra(base, { nivel: 'mes', ano: 1922, mes: 1 }));
        assert.equal(chaveDaDataObra(null), '');
        assert.ok(mesmaDataObra(null, undefined), 'duas datas vazias são iguais');
    });
});

describe('formatarDataObra e formatarIntervaloDataObra', () => {
    it('um texto por nível, com a.C. e aprox.', () => {
        const f = (e) => formatarDataObra(e);
        assert.equal(f({ nivel: 'seculo', seculo: 20 }), 'séc. XX');
        assert.equal(f({ nivel: 'seculo', seculo: 5, aC: true }), 'séc. V a.C.');
        assert.equal(f({ nivel: 'decada', decada: 1920 }), 'década de 1920');
        assert.equal(f({ nivel: 'ano', ano: 1922 }), '1922');
        assert.equal(f({ nivel: 'ano', ano: 44, aC: true }), '44 a.C.');
        assert.equal(f({ nivel: 'mes', ano: 1922, mes: 2 }), '02/1922');
        assert.equal(f({ nivel: 'dia', ano: 1922, mes: 2, dia: 1 }), '01/02/1922');
        assert.equal(f({ nivel: 'dia', ano: 44, mes: 3, dia: 15, aC: true }), '15/03/44 a.C.');
        assert.equal(f({ nivel: 'ano', ano: 1500, aprox: true }), 'aprox. 1500');
        assert.equal(
            f({ nivel: 'seculo', seculo: 4, aC: true, aprox: true }),
            'aprox. séc. IV a.C.',
        );
        assert.equal(f(null), '');
        assert.equal(f({ nivel: 'ano' }), '');
    });

    it('escreve os séculos em romanos de 1 a 99', () => {
        assert.equal(numeroParaRomano(1), 'I');
        assert.equal(numeroParaRomano(4), 'IV');
        assert.equal(numeroParaRomano(9), 'IX');
        assert.equal(numeroParaRomano(14), 'XIV');
        assert.equal(numeroParaRomano(19), 'XIX');
        assert.equal(numeroParaRomano(21), 'XXI');
        assert.equal(numeroParaRomano(49), 'XLIX');
        assert.equal(numeroParaRomano(99), 'XCIX');
        assert.equal(numeroParaRomano(0), '');
        assert.equal(numeroParaRomano(100), '');
    });

    it('o intervalo usa "até", sem travessão, e aceita uma ponta só', () => {
        const a = { nivel: 'ano', ano: 1920 };
        const b = { nivel: 'ano', ano: 1935 };
        assert.equal(formatarIntervaloDataObra(a, b), '1920 até 1935');
        assert.equal(formatarIntervaloDataObra(a, null), '1920');
        assert.equal(formatarIntervaloDataObra(null, b), 'até 1935');
        assert.equal(formatarIntervaloDataObra(null, null), '');
    });
});

describe('o par começo e fim', () => {
    const ano = (n, aC = false) => ({ nivel: 'ano', ano: n, aC });

    it('fim antes do começo é recusado; igual e depois valem', () => {
        assert.equal(validarIntervaloDaData(ano(1935), ano(1920)), 'fim-antes-do-inicio');
        assert.equal(validarIntervaloDaData(ano(1920), ano(1935)), '');
        assert.equal(validarIntervaloDaData(ano(1920), ano(1920)), '');
    });

    it('a.C. vem antes de d.C. e, entre a.C., o número maior vem antes', () => {
        assert.equal(validarIntervaloDaData(ano(1), ano(1, true)), 'fim-antes-do-inicio');
        assert.equal(validarIntervaloDaData(ano(44, true), ano(1)), '');
        assert.equal(validarIntervaloDaData(ano(44, true), ano(50, true)), 'fim-antes-do-inicio');
        assert.equal(validarIntervaloDaData(ano(50, true), ano(44, true)), '');
    });

    it('datas que se sobrepõem valem (1920 até séc. XX)', () => {
        assert.equal(validarIntervaloDaData(ano(1920), { nivel: 'seculo', seculo: 20 }), '');
        assert.equal(
            validarIntervaloDaData(
                { nivel: 'seculo', seculo: 20 },
                { nivel: 'decada', decada: 1950 },
            ),
            '',
        );
        assert.equal(
            validarIntervaloDaData(ano(1950), { nivel: 'seculo', seculo: 19 }),
            'fim-antes-do-inicio',
        );
    });

    it('dentro do mesmo ano compara mês e dia', () => {
        const mes = (m) => ({ nivel: 'mes', ano: 1922, mes: m });
        const dia = (m, d) => ({ nivel: 'dia', ano: 1922, mes: m, dia: d });
        assert.equal(validarIntervaloDaData(mes(5), mes(3)), 'fim-antes-do-inicio');
        assert.equal(validarIntervaloDaData(mes(3), mes(5)), '');
        assert.equal(validarIntervaloDaData(dia(5, 10), dia(5, 9)), 'fim-antes-do-inicio');
        assert.equal(validarIntervaloDaData(dia(5, 10), dia(5, 10)), '');
        assert.equal(validarIntervaloDaData(mes(5), dia(5, 31)), '');
        assert.equal(validarIntervaloDaData(ano(1922), dia(1, 1)), '');
    });

    it('com uma ponta só, ou nenhuma, sempre vale', () => {
        assert.equal(validarIntervaloDaData(ano(1935), null), '');
        assert.equal(validarIntervaloDaData(null, ano(1920)), '');
        assert.equal(validarIntervaloDaData(null, null), '');
    });

    it('o intervalo de anos do par vai do começo do primeiro ao fim do último', () => {
        assert.deepEqual(
            intervaloDeAnosDoPar(
                { nivel: 'seculo', seculo: 19 },
                { nivel: 'decada', decada: 1920 },
            ),
            { de: 1801, ate: 1929 },
        );
        assert.deepEqual(intervaloDeAnosDoPar(ano(1922), null), { de: 1922, ate: 1922 });
        assert.deepEqual(intervaloDeAnosDoPar(null, ano(40, true)), { de: -40, ate: -40 });
        assert.equal(intervaloDeAnosDoPar(null, null), null);
    });
});

describe('a data na entrada', () => {
    it('lê as duas pontas e trata entrada sem data', () => {
        const e = { dataObra: { nivel: 'ano', ano: 1922 }, dataObraAte: 'lixo' };
        const { inicio, fim } = datasDaEntrada(e);
        assert.equal(inicio.ano, 1922);
        assert.equal(fim, null);
        assert.deepEqual(datasDaEntrada({}), { inicio: null, fim: null });
        assert.deepEqual(datasDaEntrada(null), { inicio: null, fim: null });
        assert.equal(chaveDasDatasDaEntrada({}), '');
        assert.notEqual(chaveDasDatasDaEntrada(e), '');
    });

    it('grava normalizado, não mexe no que é undefined e tira a chave com null', () => {
        const e = { obra: 'X' };
        definirDatasDaEntrada(e, { inicio: { nivel: 'ano', ano: '1922' } });
        assert.deepEqual(Object.keys(e), ['obra', 'dataObra']);
        assert.equal(e.dataObra.ano, 1922);
        assert.equal(e.dataObra.ate, 1922);

        definirDatasDaEntrada(e, { fim: { nivel: 'ano', ano: 1930 } });
        assert.equal(e.dataObra.ano, 1922, 'o começo ficou como estava');
        assert.equal(e.dataObraAte.ano, 1930);

        definirDatasDaEntrada(e, { inicio: null });
        assert.ok(!('dataObra' in e));
        definirDatasDaEntrada(e, { fim: { nivel: 'ano' } });
        assert.ok(!('dataObraAte' in e), 'data que não vale tira a chave');
        assert.deepEqual(e, { obra: 'X' });
    });

    it('entrada sem data não ganha chave ao gravar vazio', () => {
        const e = { obra: 'X' };
        definirDatasDaEntrada(e, { inicio: null, fim: null });
        definirDatasDaEntrada(e);
        assert.deepEqual(e, { obra: 'X' });
    });

    it('capturar e restaurar devolve valores e ausência de chaves', () => {
        const e = { dataObra: { nivel: 'ano', ano: 1922 } };
        const antes = capturarDatasDaEntrada(e);
        definirDatasDaEntrada(e, { inicio: null, fim: { nivel: 'ano', ano: 1930 } });
        assert.ok(!('dataObra' in e));
        assert.ok('dataObraAte' in e);
        restaurarDatasDaEntrada(e, antes);
        assert.deepEqual(e, { dataObra: { nivel: 'ano', ano: 1922 } });
        assert.ok(!('dataObraAte' in e), 'a chave que não existia some de novo');
    });

    it('a captura é uma cópia: mudar a data depois não a altera', () => {
        const e = { dataObra: { nivel: 'ano', ano: 1922 } };
        const antes = capturarDatasDaEntrada(e);
        e.dataObra.ano = 1999;
        assert.equal(antes.inicio.ano, 1922);
    });
});

describe('agruparDatasDaObra', () => {
    const par = (a, b) => ({
        inicio: a ? { nivel: 'ano', ano: a } : null,
        fim: b ? { nivel: 'ano', ano: b } : null,
    });

    it('junta pares iguais, do mais usado ao menos usado; no empate, o completo e depois o mais antigo', () => {
        const grupos = agruparDatasDaObra([
            par(1950),
            par(1922),
            par(1922),
            par(1900),
            par(1922, 1930),
        ]);
        assert.deepEqual(
            grupos.map((g) => [g.texto, g.usos]),
            [
                ['1922', 2],
                ['1922 até 1930', 1],
                ['1900', 1],
                ['1950', 1],
            ],
        );
    });

    it('par sem data não entra, e começo igual com fim diferente são pares diferentes', () => {
        const grupos = agruparDatasDaObra([par(), null, undefined, par(1922), par(1922, 1923)]);
        assert.equal(grupos.length, 2);
        assert.deepEqual(agruparDatasDaObra(undefined), []);
    });

    it('aprox. e exata são datas diferentes', () => {
        const grupos = agruparDatasDaObra([
            { inicio: { nivel: 'ano', ano: 1500, aprox: true } },
            { inicio: { nivel: 'ano', ano: 1500 } },
        ]);
        assert.deepEqual(grupos.map((g) => g.texto).sort(), ['1500', 'aprox. 1500']);
    });

    it('o par devolvido leva as datas normalizadas', () => {
        const [g] = agruparDatasDaObra([par(1922)]);
        assert.equal(g.inicio.de, 1922);
        assert.equal(g.fim, null);
    });
});
