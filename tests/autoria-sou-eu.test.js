import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Campo "Este autor sou eu" (db.autores[].souEu): adicionar esse autor a
// um texto com a Fonte vazia preenche a Fonte com "Obra própria". O
// esqueleto de DOM precisa existir ANTES do import (mesmo motivo de
// editor.test.js).
document.body.innerHTML = `
    <input id="p-autor-input" />
    <div id="p-autoria-container"></div>
    <input id="p-fonte-origem" />
    <input id="pr-autor-input" />
    <div id="pr-autoria-container"></div>
    <input id="pr-fonte-origem" />
`;

const { db } = await import('../js/db.js');
const { adicionarAutoria, carregarAutoria, resetAutoria, obterAutoria } =
    await import('../js/editor.js');
const { FONTE_OBRA_PROPRIA } = await import('../js/utils.js');

const fonte = (tabela) =>
    document.getElementById(tabela === 'poemas' ? 'p-fonte-origem' : 'pr-fonte-origem');

describe('Autor "sou eu" preenche a Fonte ao ser adicionado', () => {
    beforeEach(() => {
        db.autores = [
            { id: 1, nome: 'Victor Leme', souEu: true },
            { id: 2, nome: 'Cruz e Sousa' },
        ];
        resetAutoria('poemas');
        resetAutoria('prosas');
        fonte('poemas').value = '';
        fonte('prosas').value = '';
    });

    for (const tabela of ['poemas', 'prosas']) {
        it(`${tabela}: preenche "Obra própria" quando a Fonte está vazia`, () => {
            adicionarAutoria(tabela, 'Victor Leme');
            assert.equal(fonte(tabela).value, FONTE_OBRA_PROPRIA);
            assert.equal(obterAutoria(tabela).length, 1);
        });

        it(`${tabela}: não sobrescreve uma Fonte já digitada`, () => {
            fonte(tabela).value = 'Wikisource';
            adicionarAutoria(tabela, 'Victor Leme');
            assert.equal(fonte(tabela).value, 'Wikisource');
        });

        it(`${tabela}: autor sem "sou eu" não mexe na Fonte`, () => {
            adicionarAutoria(tabela, 'Cruz e Sousa');
            assert.equal(fonte(tabela).value, '');
        });

        it(`${tabela}: carregar um texto existente não mexe na Fonte`, () => {
            carregarAutoria(tabela, [{ autorId: 1, papel: 'Autor' }]);
            assert.equal(fonte(tabela).value, '');
        });
    }

    it('só afeta a tabela do formulário em que o autor foi adicionado', () => {
        adicionarAutoria('poemas', 'Victor Leme');
        assert.equal(fonte('prosas').value, '');
    });

    it('adicionar de novo o mesmo autor (já no chip) não preenche outra vez', () => {
        adicionarAutoria('poemas', 'Victor Leme');
        fonte('poemas').value = '';
        adicionarAutoria('poemas', 'Victor Leme');
        assert.equal(fonte('poemas').value, '');
    });
});
