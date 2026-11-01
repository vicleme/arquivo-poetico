import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Mapa de calor das origens, entrega 1: a tabela de países em português e o
// arquivo do mapa-múndi (`assets/mapa/mapa-mundi.json`).

import {
    DESENHOS_SEM_NOME,
    PAISES,
    codigoDoPaisDaOrigem,
    ehOrigemDesconhecida,
    paisPorCodigo,
} from '../js/mapa-paises.js';

const mapa = JSON.parse(
    readFileSync(new URL('../assets/mapa/mapa-mundi.json', import.meta.url), 'utf8'),
);

describe('Origem digitada para país do mapa', () => {
    it('acha o país pelo nome em português, sem ligar para acento, caixa e pontuação', () => {
        assert.equal(codigoDoPaisDaOrigem('Brasil'), '076');
        assert.equal(codigoDoPaisDaOrigem('grécia'), '300');
        assert.equal(codigoDoPaisDaOrigem('GRECIA'), '300');
        assert.equal(codigoDoPaisDaOrigem('  Timor Leste '), '626');
        assert.equal(codigoDoPaisDaOrigem('Costa do Marfim'), '384');
        assert.equal(codigoDoPaisDaOrigem('Papua Nova Guiné'), '598');
    });

    it('entende os nomes de uso comum e as siglas', () => {
        assert.equal(codigoDoPaisDaOrigem('EUA'), '840');
        assert.equal(codigoDoPaisDaOrigem('Estados Unidos da América'), '840');
        assert.equal(codigoDoPaisDaOrigem('Holanda'), '528');
        assert.equal(codigoDoPaisDaOrigem('Países Baixos'), '528');
        assert.equal(codigoDoPaisDaOrigem('República Tcheca'), '203');
        assert.equal(codigoDoPaisDaOrigem('Birmânia'), '104');
        assert.equal(codigoDoPaisDaOrigem('Suazilândia'), '748');
    });

    it('as partes de um país que o mapa não separa pintam o país', () => {
        ['Inglaterra', 'Escócia', 'País de Gales', 'Irlanda do Norte', 'Reino Unido'].forEach(
            (nome) => assert.equal(codigoDoPaisDaOrigem(nome), '826', nome),
        );
    });

    it('o que não é país do mapa dá null (não chuta)', () => {
        ['Roma Antiga', 'Celta', 'URSS', 'Mesopotâmia', 'Europa', '', null, undefined].forEach(
            (rotulo) => assert.equal(codigoDoPaisDaOrigem(rotulo), null, String(rotulo)),
        );
    });

    it('"Desconhecida" é reconhecida à parte e não é país', () => {
        ['Desconhecida', 'desconhecida', 'DESCONHECIDO', 'Origem desconhecida'].forEach((r) =>
            assert.ok(ehOrigemDesconhecida(r), r),
        );
        assert.ok(!ehOrigemDesconhecida('Brasil'));
        assert.equal(codigoDoPaisDaOrigem('Desconhecida'), null);
    });

    it('Chipre e Somália pintam também os desenhos vizinhos', () => {
        assert.deepEqual(paisPorCodigo('196').desenhos, ['196', 'NCY']);
        assert.deepEqual(paisPorCodigo('706').desenhos, ['706', 'SOL']);
        assert.deepEqual(paisPorCodigo('076').desenhos, ['076']);
        assert.equal(paisPorCodigo('999'), null);
    });
});

describe('A tabela de países', () => {
    it('não repete código nem nome (o módulo já recusa nome repetido ao carregar)', () => {
        assert.equal(new Set(PAISES.map((p) => p.codigo)).size, PAISES.length);
        assert.equal(new Set(PAISES.map((p) => p.nome)).size, PAISES.length);
    });

    it('não usa travessão nos nomes mostrados na tela (só hífen)', () => {
        PAISES.forEach((p) => assert.ok(!/[–—]/.test(p.nome), p.nome));
    });
});

describe('O arquivo do mapa-múndi', () => {
    it('tem a forma esperada', () => {
        assert.equal(mapa.largura, 1000);
        assert.ok(mapa.altura > 480 && mapa.altura < 490);
        assert.equal(mapa.vista.length, 4);
        assert.ok(mapa.paises.length > 200);
        mapa.paises.forEach((p) => {
            assert.equal(typeof p.id, 'string');
            assert.ok(p.d.startsWith('M') && p.d.endsWith('Z'), p.id);
            assert.ok(p.area >= 0, p.id); // ilhas minúsculas (Bermudas) arredondam para 0
            assert.equal(p.centro.length, 2);
        });
        assert.equal(new Set(mapa.paises.map((p) => p.id)).size, mapa.paises.length);
    });

    it('todo desenho do mapa tem um país na tabela (ou está na lista dos sem nome)', () => {
        const nomeados = new Set(PAISES.flatMap((p) => p.desenhos));
        mapa.paises.forEach((p) => {
            assert.ok(
                nomeados.has(p.id) || DESENHOS_SEM_NOME.includes(p.id),
                `${p.id} (${p.nome}) não está na tabela de países`,
            );
        });
    });

    it('todo desenho que a tabela manda pintar existe no mapa', () => {
        const ids = new Set(mapa.paises.map((p) => p.id));
        PAISES.forEach((p) =>
            p.desenhos.forEach((d) => assert.ok(ids.has(d), `${p.nome}: desenho ${d} some`)),
        );
    });

    it('nenhum contorno pula de uma ponta do mapa à outra (o defeito do meridiano 180)', () => {
        mapa.paises.forEach((p) => {
            p.d.split('Z').forEach((anel) => {
                const xs = [...anel.matchAll(/[ML]?(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map(
                    (m) => Number(m[1]),
                );
                xs.forEach((x, i) => {
                    if (i > 0)
                        assert.ok(Math.abs(x - xs[i - 1]) < 500, `${p.id}: salto de ponta a ponta`);
                });
            });
        });
    });

    it('as áreas guardam as proporções reais (Brasil maior que Portugal, Rússia maior que Brasil)', () => {
        const area = (id) => mapa.paises.find((p) => p.id === id).area;
        assert.ok(area('643') > area('076'));
        assert.ok(area('076') > area('620') * 50);
        // O Brasil tem uns 8,5 milhões de km² e a Rússia uns 17,1: razão perto de 2.
        const razao = area('643') / area('076');
        assert.ok(razao > 1.8 && razao < 2.3, `razão Rússia/Brasil ${razao}`);
    });
});
