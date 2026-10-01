import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    sincronizarTemas,
    contarTextosPorTema,
    textosDoTema,
    assuntosDoTema,
    renomearTema,
    podeExcluirTema,
    excluirTemaDoCadastro,
} from '../js/temas.js';
import { nomesTemasDoAssunto } from '../js/utils.js';

function dbBase() {
    return {
        poemas: [
            { id: 1, sinalizacoesTema: 'Machismo, Brasil' },
            { id: 2, sinalizacoesTema: 'machismo' },
        ],
        prosas: [{ id: 3, sinalizacoesTema: 'Amor, Machismo' }],
        assuntos: [
            { id: 10, nome: 'Sociedade', temas: ['Machismo', 'Fantasma'] },
            { id: 11, nome: 'Gênero', temas: ['machismo'] },
        ],
        temas: [],
    };
}

describe('sincronizarTemas', () => {
    it('registra os temas em uso nos textos e nos Assuntos, sem repetir por caixa/acento', () => {
        const db = dbBase();
        const criados = sincronizarTemas(db);
        const nomes = db.temas.map((t) => t.nome).sort();
        assert.deepEqual(nomes, ['Amor', 'Brasil', 'Fantasma', 'Machismo']);
        assert.equal(criados, 4);
        db.temas.forEach((t) => {
            assert.equal(typeof t.id, 'number');
            assert.equal(t.notas, '');
        });
    });

    it('é idempotente e preserva nome e notas já cadastrados', () => {
        const db = dbBase();
        db.temas = [{ id: 99, nome: 'MACHISMO', notas: 'minha nota' }];
        sincronizarTemas(db);
        const antes = db.temas.length;
        assert.equal(sincronizarTemas(db), 0);
        assert.equal(db.temas.length, antes);
        const m = db.temas.find((t) => t.id === 99);
        assert.equal(m.nome, 'MACHISMO');
        assert.equal(m.notas, 'minha nota');
    });
});

describe('contagens e consultas', () => {
    it('conta textos por tema (chave sem caixa/acento) e lista os ids exatos', () => {
        const db = dbBase();
        sincronizarTemas(db);
        const contagem = contarTextosPorTema(db);
        assert.equal(contagem.get('machismo'), 3);
        assert.deepEqual(textosDoTema(db, 'MACHISMO'), { poemasIds: [1, 2], prosasIds: [3] });
        assert.deepEqual(
            assuntosDoTema(db, 'machismo').map((a) => a.id),
            [10, 11],
        );
    });
});

describe('renomearTema', () => {
    it('propaga o novo nome pra textos e Assuntos, preservando a ordem', () => {
        const db = dbBase();
        sincronizarTemas(db);
        const id = db.temas.find((t) => t.nome === 'Machismo').id;
        const r = renomearTema(db, id, 'Misoginia');
        assert.deepEqual(r, { ok: true, textos: 3, assuntos: 2 });
        assert.equal(db.poemas[0].sinalizacoesTema, 'Misoginia, Brasil');
        assert.equal(db.poemas[1].sinalizacoesTema, 'Misoginia');
        assert.equal(db.prosas[0].sinalizacoesTema, 'Amor, Misoginia');
        // Assunto guarda ids: o nome novo aparece sem nenhum Assunto ser reescrito.
        assert.deepEqual(nomesTemasDoAssunto(db.assuntos[0], db.temas), ['Misoginia', 'Fantasma']);
        assert.deepEqual(nomesTemasDoAssunto(db.assuntos[1], db.temas), ['Misoginia']);
    });

    it('recusa nome vazio e nome de outro Tema, sem mudar nada', () => {
        const db = dbBase();
        sincronizarTemas(db);
        const id = db.temas.find((t) => t.nome === 'Machismo').id;
        assert.equal(renomearTema(db, id, '  ').motivo, 'vazio');
        const r = renomearTema(db, id, 'brasil');
        assert.equal(r.motivo, 'duplicado');
        assert.equal(db.poemas[0].sinalizacoesTema, 'Machismo, Brasil');
    });

    it('permite corrigir só caixa/acento do próprio nome', () => {
        const db = dbBase();
        sincronizarTemas(db);
        const id = db.temas.find((t) => t.nome === 'Amor').id;
        assert.equal(renomearTema(db, id, 'AMOR').ok, true);
        assert.equal(db.prosas[0].sinalizacoesTema, 'AMOR, Machismo');
    });
});

describe('exclusão', () => {
    it('não deixa excluir tema em uso e informa quantos textos', () => {
        const db = dbBase();
        sincronizarTemas(db);
        const id = db.temas.find((t) => t.nome === 'Machismo').id;
        assert.deepEqual(podeExcluirTema(db, id), { ok: false, motivo: 'em-uso', textos: 3 });
        assert.equal(excluirTemaDoCadastro(db, id).ok, false);
        assert.ok(db.temas.some((t) => t.id === id));
    });

    it('exclui tema sem texto e tira o nome das listas dos Assuntos', () => {
        const db = dbBase();
        sincronizarTemas(db);
        const id = db.temas.find((t) => t.nome === 'Fantasma').id;
        const r = excluirTemaDoCadastro(db, id);
        assert.equal(r.ok, true);
        assert.equal(r.removido.nome, 'Fantasma');
        assert.deepEqual(nomesTemasDoAssunto(db.assuntos[0], db.temas), ['Machismo']);
        // sem o id na lista do Assunto, a sincronização não o traz de volta
        sincronizarTemas(db);
        assert.ok(!db.temas.some((t) => t.nome === 'Fantasma'));
    });
});
