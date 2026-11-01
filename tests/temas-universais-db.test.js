import './helpers/dom-real.js';

// Temas universais ligados ao cadastro de Temas e ao db (exclusão, mesclagem,
// desfazer, backup e esvaziar).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { db, importarDB } from '../js/db.js';
import { excluirTemaDoCadastro, mesclarTemas, excluirTemasSemTexto } from '../js/temas.js';
import { criarTemaUniversal } from '../js/temas-universais.js';
import { chavesDbDe } from '../js/inventario-armazenamento.js';

const base = () => ({
    temas: [
        { id: 1, nome: 'A', notas: '' },
        { id: 2, nome: 'B', notas: '' },
        { id: 3, nome: 'C', notas: '' },
    ],
    assuntos: [],
    poemas: [{ id: 10, temas: [{ temaId: 1, papel: 'principal' }] }],
    prosas: [],
});
const ids = (d) => d.temasUniversais.map((u) => u.temaIds);

describe('Temas universais acompanham o cadastro de Temas', () => {
    it('excluir um Tema tira o id dos universais', () => {
        const d = base();
        criarTemaUniversal(d, 'U', [2, 3]);
        assert.equal(excluirTemaDoCadastro(d, 2).ok, true);
        assert.deepEqual(ids(d), [[3]]);
    });
    it('mesclar troca origem por destino e o desfazer volta tudo', () => {
        const d = base();
        criarTemaUniversal(d, 'U', [2, 3]);
        criarTemaUniversal(d, 'V', [3]);
        const r = mesclarTemas(d, 2, 3);
        assert.equal(r.ok, true);
        assert.deepEqual(ids(d), [[3], [3]]);
        r.desfazer();
        assert.deepEqual(ids(d), [[2, 3], [3]]);
    });
    it('excluir Temas sem texto tira dos universais e o desfazer restaura', () => {
        const d = base();
        criarTemaUniversal(d, 'U', [1, 2, 3]);
        const r = excluirTemasSemTexto(d);
        assert.equal(r.excluidos, 2);
        assert.deepEqual(ids(d), [[1]]);
        r.desfazer();
        assert.deepEqual(ids(d), [[1, 2, 3]]);
    });
});

describe('db.temasUniversais', () => {
    it('existe como cadastro de dado, para o esvaziar e o inventário', () => {
        assert.ok(Array.isArray(db.temasUniversais));
        assert.ok(chavesDbDe('dado').includes('temasUniversais'));
    });
    it('importarDB mantém os universais válidos e tolera backup antigo sem a chave', async () => {
        await importarDB({
            temas: [{ id: 1, nome: 'A', notas: '' }],
            temasUniversais: [
                { id: 7, nome: 'Amor', temaIds: [1, 99] },
                { id: 8, nome: 'amor', temaIds: [1] },
            ],
        });
        assert.equal(db.temasUniversais.length, 1);
        assert.deepEqual(db.temasUniversais[0].temaIds, [1]);
        await importarDB({ temas: [{ id: 1, nome: 'A', notas: '' }] });
        assert.deepEqual(db.temasUniversais, []);
    });
});
