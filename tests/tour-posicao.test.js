import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calcularPosicaoCartao } from '../js/tour.js';

const viewport = { largura: 1000, altura: 700 };
const cartao = { largura: 340, altura: 200 };
const alvo = (top, left, width = 100, height = 40) => ({
    top,
    left,
    width,
    height,
    bottom: top + height,
    right: left + width,
});

describe('Tour: posição do cartão', () => {
    it('vai abaixo do alvo quando cabe', () => {
        assert.deepEqual(calcularPosicaoCartao(alvo(100, 50), cartao, viewport), {
            top: 152,
            left: 50,
        });
    });

    it('vai acima quando não cabe abaixo', () => {
        const pos = calcularPosicaoCartao(alvo(600, 50), cartao, viewport);
        assert.equal(pos.top, 600 - 12 - 200);
    });

    it('cola no rodapé quando não cabe nem abaixo nem acima', () => {
        const pos = calcularPosicaoCartao(alvo(150, 50, 100, 500), cartao, viewport);
        assert.equal(pos.top, 700 - 200 - 12);
    });

    it('nunca sai da tela na horizontal', () => {
        assert.equal(calcularPosicaoCartao(alvo(100, 950), cartao, viewport).left, 1000 - 340 - 12);
        assert.equal(calcularPosicaoCartao(alvo(100, -30), cartao, viewport).left, 12);
    });

    it('sem alvo, centraliza', () => {
        assert.deepEqual(calcularPosicaoCartao(null, cartao, viewport), { top: 250, left: 330 });
    });

    it('tela menor que o cartão: mantém a folga mínima', () => {
        const pos = calcularPosicaoCartao(null, cartao, { largura: 300, altura: 150 });
        assert.deepEqual(pos, { top: 12, left: 12 });
    });
});
