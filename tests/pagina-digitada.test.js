import './helpers/dom-real.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { interpretarPaginaDigitada, montarPaginacao } = await import('../js/celulas-tabela.js');

describe('interpretarPaginaDigitada', () => {
    it('aceita um número dentro do intervalo', () => {
        assert.equal(interpretarPaginaDigitada('7', 29), 7);
        assert.equal(interpretarPaginaDigitada(' 12 ', 29), 12);
    });

    it('encaixa números fora do intervalo', () => {
        assert.equal(interpretarPaginaDigitada('0', 29), 1);
        assert.equal(interpretarPaginaDigitada('-3', 29), 1);
        assert.equal(interpretarPaginaDigitada('99', 29), 29);
    });

    it('arredonda decimal para baixo', () => {
        assert.equal(interpretarPaginaDigitada('4.9', 29), 4);
        assert.equal(interpretarPaginaDigitada('4,9', 29), 4);
    });

    it('devolve null para vazio ou texto', () => {
        assert.equal(interpretarPaginaDigitada('', 29), null);
        assert.equal(interpretarPaginaDigitada('   ', 29), null);
        assert.equal(interpretarPaginaDigitada('abc', 29), null);
        assert.equal(interpretarPaginaDigitada(undefined, 29), null);
    });
});

describe('montarPaginacao com caixa de página', () => {
    const html = montarPaginacao(290, 3, 'pagina-poemas', 'poemas', [1, 2], [], new Set());

    it('mostra a página atual numa caixa, mantém o total e os botões', () => {
        assert.match(html, /<input type="number"[^>]*value="3"/);
        assert.match(html, /max="6"/);
        assert.match(html, /data-pagina-input="pagina-poemas"/);
        assert.match(html, /de 6/);
        assert.match(html, /‹ Anterior/);
        assert.match(html, /Próxima ›/);
        assert.match(html, /data-pagina="2"/);
        assert.match(html, /data-pagina="4"/);
    });

    it('não mostra a caixa quando há uma página só', () => {
        const unica = montarPaginacao(5, 1, 'pagina-poemas', 'poemas', [1], [], new Set());
        assert.doesNotMatch(unica, /data-pagina-input/);
    });
});
