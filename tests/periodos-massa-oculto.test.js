import './helpers/localstorage-shim.js';

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { db } from '../js/db.js';
import { nomesCadastroPeriodoMassa } from '../js/periodos-massa.js';
import { definirExibirOcultasDosPeriodos } from '../js/ocultas-periodos.js';

describe('Período em massa: sugestões e períodos ocultos', () => {
    beforeEach(() => {
        definirExibirOcultasDosPeriodos(false);
        db.epocas = [
            { id: 1, nome: 'Juventude', autorId: 1 },
            { id: 2, nome: 'Namoro', autorId: 1, oculto: true },
            { id: 3, nome: 'Luto', autorId: 1 },
        ];
        db.movimentosEscolas = [{ id: 10, nome: 'Modernismo' }];
        db.periodosHistoricos = [{ id: 20, nome: 'Ditadura' }];
    });

    afterEach(() => definirExibirOcultasDosPeriodos(false));

    it('não sugere o nome de período biográfico oculto', () => {
        assert.deepEqual(nomesCadastroPeriodoMassa('epoca'), ['Juventude', 'Luto']);
    });

    it('sugere o nome oculto quando Mostrar ocultas está ligado', () => {
        definirExibirOcultasDosPeriodos(true);
        assert.deepEqual(nomesCadastroPeriodoMassa('epoca'), ['Juventude', 'Luto', 'Namoro']);
    });

    it('não mexe nas sugestões de Movimento e Período Histórico', () => {
        assert.deepEqual(nomesCadastroPeriodoMassa('movimento'), ['Modernismo']);
        assert.deepEqual(nomesCadastroPeriodoMassa('periodoHistorico'), ['Ditadura']);
    });
});
