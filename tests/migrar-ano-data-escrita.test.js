import './helpers/localstorage-shim.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { migrarAnoParaDataEscrita } from '../js/db.js';

// `ano` legado (texto antigo, sem dataEscrita) vira dataEscrita { ano, exata: false }.

describe('migrarAnoParaDataEscrita', () => {
    it('ano numérico sem dataEscrita vira dataEscrita aproximada', () => {
        const itens = [{ id: 1, ano: 1998 }];
        migrarAnoParaDataEscrita(itens);
        assert.deepEqual(itens[0].dataEscrita, { ano: 1998, exata: false });
        assert.equal(itens[0].ano, 1998);
    });

    it('ano em texto só com dígitos também migra (vira número)', () => {
        const itens = [{ id: 1, ano: ' 2005 ' }];
        migrarAnoParaDataEscrita(itens);
        assert.deepEqual(itens[0].dataEscrita, { ano: 2005, exata: false });
    });

    it('dataEscrita vazia ({}, null, só exata ou só hora) é completada com o ano', () => {
        const itens = [
            { id: 1, ano: 2001, dataEscrita: {} },
            { id: 2, ano: 2002, dataEscrita: null },
            { id: 3, ano: 2003, dataEscrita: { exata: true } },
            { id: 4, ano: 2004, dataEscrita: { hora: 10, minuto: 30 } },
        ];
        migrarAnoParaDataEscrita(itens);
        assert.deepEqual(
            itens.map((i) => i.dataEscrita),
            [
                { ano: 2001, exata: false },
                { ano: 2002, exata: false },
                { ano: 2003, exata: false },
                { ano: 2004, exata: false },
            ],
        );
    });

    it('nunca sobrescreve uma data já preenchida, mesmo com ano diferente', () => {
        const itens = [
            { id: 1, ano: 2020, dataEscrita: { dia: 15, mes: 3, ano: 2020, exata: true } },
            { id: 2, ano: 1999, dataEscrita: { mes: 7, ano: 2019 } },
            { id: 3, ano: 1990, dataEscrita: { mes: 5 } },
        ];
        const antes = JSON.stringify(itens);
        migrarAnoParaDataEscrita(itens);
        assert.equal(JSON.stringify(itens), antes);
    });

    it('ano vazio, ausente, com texto, decimal ou fora de 1–2100 fica como está', () => {
        const itens = [
            { id: 1, ano: '' },
            { id: 2 },
            { id: 3, ano: null },
            { id: 4, ano: '1998?' },
            { id: 5, ano: 19.5 },
            { id: 6, ano: 0 },
            { id: 7, ano: 2101 },
            { id: 8, ano: -5 },
        ];
        migrarAnoParaDataEscrita(itens);
        itens.forEach((i) => assert.equal(i.dataEscrita, undefined));
    });

    it('é idempotente', () => {
        const itens = [{ id: 1, ano: 1998 }];
        migrarAnoParaDataEscrita(itens);
        const primeira = JSON.stringify(itens);
        migrarAnoParaDataEscrita(itens);
        assert.equal(JSON.stringify(itens), primeira);
    });
});
