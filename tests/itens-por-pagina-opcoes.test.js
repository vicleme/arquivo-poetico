import './helpers/dom-real.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { OPCOES_ITENS_POR_PAGINA } = await import('../js/render-listas.js');

describe('Itens por página', () => {
    it('oferece 10 para trabalhar com amostras pequenas, em ordem crescente', () => {
        assert.deepEqual(OPCOES_ITENS_POR_PAGINA, [10, 25, 50, 100, 200]);
    });
});
