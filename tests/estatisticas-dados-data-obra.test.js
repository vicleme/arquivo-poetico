import './helpers/localstorage-shim.js';
import './helpers/dom-shim.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Estatísticas da data da obra (T9, entrega 9a de 13): textos por século e
// década e a distância entre a obra e o texto. Lógica pura, sem tela.

const { db } = await import('../js/db.js');
const { criarDataObra } = await import('../js/data-da-obra.js');
const {
    seculoDoAno,
    decadaDoAno,
    anoDeReferenciaDaEntrada,
    anoDoTexto,
    agregarTextosPorSeculo,
    agregarTextosPorDecada,
    agregarDistanciaDaObra,
    faixasDaDistancia,
    passoDaDistancia,
    faixaPermiteZoom,
} = await import('../js/estatisticas-dados-data-obra.js');

const d = (e) => criarDataObra(e).data;
const ano = (n, aC = false) => d({ nivel: 'ano', ano: String(n), aC });
const seculo = (n) => d({ nivel: 'seculo', seculo: String(n) });
const decada = (n) => d({ nivel: 'decada', decada: String(n) });

beforeEach(() => {
    db.poemas = [];
    db.prosas = [];
});

describe('século e década do ano', () => {
    it('século: 1901 a 2000 é o XX; a.C. tem sinal negativo', () => {
        assert.equal(seculoDoAno(1900), 19);
        assert.equal(seculoDoAno(1901), 20);
        assert.equal(seculoDoAno(2000), 20);
        assert.equal(seculoDoAno(1), 1);
        assert.equal(seculoDoAno(-1), -1);
        assert.equal(seculoDoAno(-100), -1);
        assert.equal(seculoDoAno(-101), -2);
        assert.equal(seculoDoAno(-500), -5);
    });

    it('década: 1920 a 1929; a.C. conta de trás para frente; 1 a 9 ficam em zero', () => {
        assert.deepEqual(decadaDoAno(1929), { n: 1920, aC: false });
        assert.deepEqual(decadaDoAno(1920), { n: 1920, aC: false });
        assert.deepEqual(decadaDoAno(-435), { n: 430, aC: true });
        assert.deepEqual(decadaDoAno(-430), { n: 430, aC: true });
        assert.deepEqual(decadaDoAno(5), { n: 0, aC: false });
        assert.deepEqual(decadaDoAno(-5), { n: 0, aC: true });
    });
});

describe('ano de referência da entrada', () => {
    it('é o início do intervalo do começo; sem começo, o do fim; sem data, null', () => {
        assert.equal(anoDeReferenciaDaEntrada({ dataObra: seculo(20) }), 1901);
        assert.equal(anoDeReferenciaDaEntrada({ dataObra: decada(1920) }), 1920);
        assert.equal(anoDeReferenciaDaEntrada({ dataObraAte: ano(1935) }), 1935);
        assert.equal(anoDeReferenciaDaEntrada({ dataObra: ano(44, true) }), -44);
        assert.equal(anoDeReferenciaDaEntrada({}), null);
    });
});

describe('textos por século e por década', () => {
    function cenario() {
        db.poemas = [
            {
                id: 1,
                intertextualidade: [
                    { obra: 'A', dataObra: ano(1972) },
                    { obra: 'B', dataObra: ano(1975) },
                ],
            },
            {
                id: 2,
                intertextualidade: [{ obra: 'C', dataObra: ano(1899) }],
                hipertextualidade: [{ hipotexto: 'D', dataObra: seculo(17) }],
            },
            { id: 3, intertextualidade: [{ obra: 'E' }] },
            { id: 4, titulo: 'sem entradas' },
            {
                id: 5,
                referenciasExternas: [{ tipo: 'Pessoa pública', texto: 'X', dataObra: ano(1920) }],
            },
        ];
        db.prosas = [{ id: 1, intertextualidade: [{ obra: 'F', dataObra: ano(1972) }] }];
    }

    it('um texto conta uma vez por século, mesmo com duas entradas nele', () => {
        cenario();
        const r = agregarTextosPorSeculo('obras', [...db.poemas, ...db.prosas]);
        assert.deepEqual(
            r.itens.map((i) => [i.rotulo, i.textos]),
            [
                ['séc. XVII', 1],
                ['séc. XIX', 1],
                ['séc. XX', 2],
            ],
        );
        assert.equal(r.comEntradas, 4);
        assert.equal(r.comData, 3);
        assert.equal(r.semData, 1);
    });

    it('a fonte separa obras e referências, e "todas" soma', () => {
        cenario();
        const todos = [...db.poemas, ...db.prosas];
        const refs = agregarTextosPorSeculo('referencias', todos);
        assert.deepEqual(
            refs.itens.map((i) => i.rotulo),
            ['séc. XX'],
        );
        assert.equal(refs.comEntradas, 1);
        const todas = agregarTextosPorSeculo('todas', todos);
        assert.equal(todas.itens.find((i) => i.rotulo === 'séc. XX').textos, 3);
        assert.equal(todas.comEntradas, 5);
    });

    it('as barras trazem os textos (tipo e id), poema e prosa com o mesmo id separados', () => {
        cenario();
        const r = agregarTextosPorSeculo('obras', [...db.poemas, ...db.prosas]);
        const xx = r.itens.find((i) => i.rotulo === 'séc. XX');
        assert.deepEqual(xx.ids, [
            { tipo: 'poema', id: 1 },
            { tipo: 'prosa', id: 1 },
        ]);
    });

    it('por década: na ordem do tempo, a.C. antes', () => {
        db.poemas = [
            { id: 1, intertextualidade: [{ obra: 'A', dataObra: ano(1972) }] },
            { id: 2, intertextualidade: [{ obra: 'B', dataObra: ano(435, true) }] },
            { id: 3, intertextualidade: [{ obra: 'C', dataObra: ano(1979) }] },
            { id: 4, intertextualidade: [{ obra: 'D', dataObra: ano(5) }] },
        ];
        const r = agregarTextosPorDecada('obras', db.poemas);
        assert.deepEqual(
            r.itens.map((i) => [i.rotulo, i.textos]),
            [
                ['década de 430 a.C.', 1],
                ['anos 1 a 9', 1],
                ['década de 1970', 2],
            ],
        );
    });

    it('sem entradas da fonte: tudo zerado', () => {
        const r = agregarTextosPorSeculo('obras', []);
        assert.deepEqual(r, { itens: [], comEntradas: 0, comData: 0, semData: 0 });
    });
});

describe('distância entre a obra e o texto', () => {
    it('o passo é o menor que cobre o trecho em até 12 faixas', () => {
        assert.equal(passoDaDistancia(12, 12), 1);
        assert.equal(passoDaDistancia(10, 21), 1);
        assert.equal(passoDaDistancia(10, 49), 5);
        assert.equal(passoDaDistancia(0, 30), 5);
        assert.equal(passoDaDistancia(3, 2000), 200);
    });

    it('as faixas cobrem do trecho do menor ao do maior, com as vazias do meio', () => {
        const { passo, faixas } = faixasDaDistancia([12, 14, 33, 49]);
        assert.equal(passo, 5);
        assert.deepEqual(
            faixas.map((f) => [f.rotulo, f.min, f.max]),
            [10, 15, 20, 25, 30, 35, 40, 45].map((m) => [`${m} a ${m + 4} anos`, m, m + 4]),
        );
    });

    it('obra depois do texto tem faixa própria; um valor só vira uma faixa de um ano', () => {
        const { faixas } = faixasDaDistancia([-3, 7]);
        assert.equal(faixas[0].chave, 'depois');
        assert.equal(faixas[0].max, -1);
        assert.deepEqual(
            faixas.slice(1).map((f) => f.rotulo),
            ['7 anos'],
        );
        assert.equal(faixasDaDistancia([1]).faixas[0].rotulo, '1 ano');
        assert.deepEqual(faixasDaDistancia([]), { passo: null, faixas: [] });
        assert.equal(faixasDaDistancia([-2]).passo, null);
    });

    it('o ano do texto vem de dataEscrita, com o espelho legado como reserva', () => {
        assert.equal(anoDoTexto({ dataEscrita: { ano: 2020 } }), 2020);
        assert.equal(anoDoTexto({ ano: 1999 }), 1999);
        assert.equal(anoDoTexto({}), null);
    });

    it('agrupa por faixa, conta entradas e textos, e separa quem não tem ano do texto', () => {
        db.poemas = [
            {
                id: 1,
                dataEscrita: { ano: 2020 },
                intertextualidade: [
                    { obra: 'A', dataObra: ano(2015) },
                    { obra: 'B', dataObra: ano(2018) },
                    { obra: 'C', dataObra: ano(1899) },
                ],
            },
            {
                id: 2,
                dataEscrita: { ano: 2020 },
                hipertextualidade: [{ hipotexto: 'D', dataObra: ano(1000) }],
            },
            { id: 3, intertextualidade: [{ obra: 'E', dataObra: ano(1990) }] },
            {
                id: 4,
                dataEscrita: { ano: 1990 },
                intertextualidade: [{ obra: 'F', dataObra: ano(2000) }, { obra: 'G' }],
            },
        ];
        const r = agregarDistanciaDaObra('obras', db.poemas);
        const por = Object.fromEntries(r.itens.map((i) => [i.chave, i]));
        // Distâncias: 5, 2, 121 (texto 1), 1020 (texto 2), -10 (texto 4); passo 100.
        assert.equal(r.passo, 100);
        assert.equal(por['0-99'].entradas, 2);
        assert.equal(por['0-99'].textos, 1);
        assert.equal(por['100-199'].entradas, 1);
        assert.equal(por['1000-1099'].textos, 1);
        assert.equal(por['500-599'].entradas, 0);
        assert.equal(r.menor, 2);
        assert.equal(r.maior, 1020);
        assert.equal(por.depois.entradas, 1);
        assert.equal(r.entradasComDistancia, 5);
        assert.equal(r.entradasSemAnoDoTexto, 1);
        assert.equal(r.textosComEntradas, 4);
    });

    it('não existe ano zero: de 1 a.C. a 1 d.C. passa 1 ano', () => {
        db.poemas = [
            {
                id: 1,
                dataEscrita: { ano: 10 },
                referenciasExternas: [
                    { tipo: 'Marco histórico', texto: 'X', dataObra: ano(5, true) },
                ],
            },
        ];
        const r = agregarDistanciaDaObra('referencias', db.poemas);
        // 5 a.C. até 10 d.C. são 14 anos (e não 15).
        assert.equal(r.itens.length, 1);
        assert.equal(r.itens[0].rotulo, '14 anos');
    });
});

describe('distância temporal: zoom por recorte', () => {
    const montar = () => {
        db.poemas = [
            {
                id: 1,
                dataEscrita: { ano: 2020 },
                intertextualidade: [
                    { obra: 'A', dataObra: ano(2010) },
                    { obra: 'B', dataObra: ano(1900) },
                    { obra: 'C', dataObra: ano(1800) },
                    { obra: 'D', dataObra: ano(730, true) },
                ],
            },
        ];
    };

    it('sem recorte, as faixas cobrem o acervo todo (anos 10, 120, 220 e 2749)', () => {
        montar();
        const r = agregarDistanciaDaObra('obras', db.poemas);
        assert.equal(r.recorte, null);
        assert.equal(r.entradasComDistancia, 4);
        assert.equal(r.passo, 250);
    });

    it('com recorte, só entram as entradas da faixa e o passo é recalculado', () => {
        montar();
        const r = agregarDistanciaDaObra('obras', db.poemas, 'todas', { min: 0, max: 249 });
        assert.deepEqual(r.recorte, { min: 0, max: 249 });
        assert.equal(r.entradasComDistancia, 3);
        assert.equal(r.menor, 10);
        assert.equal(r.maior, 220);
        assert.equal(r.passo, 20);
        assert.ok(r.itens.every((i) => i.min >= 0 && i.max <= 259));
        assert.equal(
            r.itens.reduce((a, i) => a + i.entradas, 0),
            3,
        );
    });

    it('as barras do recorte são as faixas de 20 anos que têm entradas', () => {
        montar();
        const r = agregarDistanciaDaObra('obras', db.poemas, 'todas', { min: 0, max: 249 });
        assert.deepEqual(
            r.itens.filter((i) => i.entradas).map((i) => i.chave),
            ['0-19', '120-139', '220-239'],
        );
    });

    it('recorte sem entradas dá zero barras', () => {
        montar();
        const r = agregarDistanciaDaObra('obras', db.poemas, 'todas', { min: 300, max: 400 });
        assert.equal(r.entradasComDistancia, 0);
        assert.deepEqual(r.itens, []);
    });

    it('só faixas de mais de um ano permitem zoom (não a "Depois do texto" nem a de um ano)', () => {
        assert.equal(faixaPermiteZoom({ min: 0, max: 249 }), true);
        assert.equal(faixaPermiteZoom({ min: 12, max: 12 }), false);
        assert.equal(faixaPermiteZoom({ min: -Infinity, max: -1 }), false);
        assert.equal(faixaPermiteZoom(null), false);
    });
});
