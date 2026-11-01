import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { variantesDeGeneroDoPapel, papelComVariantes } = await import('../js/vinculo-busca.js');

describe('variantes de gênero do papel', () => {
    it('Dedicatário(a) conhece as formas masculina e feminina', () => {
        assert.deepEqual(variantesDeGeneroDoPapel('Dedicatário(a)'), [
            'Dedicatário',
            'Dedicatária',
        ]);
        assert.deepEqual(variantesDeGeneroDoPapel('Associado(a) retroativamente'), [
            'Associado retroativamente',
            'Associada retroativamente',
        ]);
    });

    it('papel sem o(a) não tem variante, e chamar duas vezes dá o mesmo', () => {
        assert.deepEqual(variantesDeGeneroDoPapel('Voz'), []);
        assert.deepEqual(variantesDeGeneroDoPapel('Inspiração para'), []);
        assert.deepEqual(variantesDeGeneroDoPapel('Mencionado(a)'), ['Mencionado', 'Mencionada']);
        assert.deepEqual(variantesDeGeneroDoPapel('Mencionado(a)'), ['Mencionado', 'Mencionada']);
        assert.deepEqual(variantesDeGeneroDoPapel(null), []);
    });

    it('papelComVariantes põe o gravado primeiro e ignora vazio', () => {
        assert.deepEqual(papelComVariantes(' Aludido(a) '), ['Aludido(a)', 'Aludido', 'Aludida']);
        assert.deepEqual(papelComVariantes('Voz'), ['Voz']);
        assert.deepEqual(papelComVariantes(''), []);
    });
});
