import './helpers/dom-real.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Instalação existente (já há algo salvo no navegador) nunca recebe o seed,
// nem quando o cadastro de Temas está vazio, nem quando a chave nem existe.
localStorage.setItem(
    'arquivoPoetico_v3',
    JSON.stringify({ poemas: [{ id: 1, titulo: 'Antigo', texto: 'x' }], prosas: [] }),
);
const { db } = await import('../js/db.js');

describe('seed de Temas e Assuntos: instalação existente', () => {
    it('não semeia Assuntos nem Temas por cima de um acervo salvo', () => {
        assert.equal(db.assuntos.length, 0);
        assert.equal(db.temas.length, 0);
        assert.equal(db.poemas.length, 1);
    });
});
