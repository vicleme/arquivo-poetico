import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { nomesTemasDoAssunto } from '../js/utils.js';

import {
    garantirTema,
    limparNomeTema,
    resolverTemasEditados,
    temasDoTextoResolvidos,
    reconciliarTemasDoTexto,
    migrarEspelhoParaTemas,
    sincronizarTemas,
    renomearTema,
} from '../js/temas.js';
import { normalizarPapelTema, ROTULOS_PAPEL_TEMA } from '../js/utils.js';
import { nomesDosTemas } from './helpers/temas-do-texto.js';

function dbBase() {
    return {
        poemas: [
            { id: 1, sinalizacoesTema: 'Machismo, Brasil' },
            { id: 2, sinalizacoesTema: 'machismo' },
        ],
        prosas: [{ id: 3, sinalizacoesTema: 'Amor, Machismo' }, { id: 4 }],
        assuntos: [{ id: 10, nome: 'Sociedade', temas: ['Machismo'] }],
        temas: [],
    };
}

const nomeDe = (db, id) => db.temas.find((t) => t.id == id)?.nome;

describe('helpers de papel do Tema', () => {
    it('normaliza papel desconhecido para "sem papel definido"', () => {
        assert.equal(normalizarPapelTema('principal'), 'principal');
        assert.equal(normalizarPapelTema('secundario'), 'secundario');
        assert.equal(normalizarPapelTema('qualquer'), '');
        assert.equal(normalizarPapelTema(undefined), '');
        assert.equal(ROTULOS_PAPEL_TEMA[''], 'Indefinido');
    });
});

describe('garantirTema / resolverTemasEditados', () => {
    it('reusa o Tema existente ignorando caixa/acento e cria só o que falta', () => {
        const db = { temas: [{ id: 5, nome: 'Crítica Cultural', notas: '' }] };
        assert.equal(garantirTema(db, 'critica cultural'), 5);
        const novo = garantirTema(db, 'Amor');
        assert.notEqual(novo, 5);
        assert.equal(db.temas.length, 2);
        assert.equal(garantirTema(db, '   '), null);
    });

    it('mantém a vírgula e tira só os separadores `;` e `|` do nome', () => {
        assert.equal(limparNomeTema('  Amor,  perda '), 'Amor, perda');
        assert.equal(limparNomeTema('Amor; perda | luto'), 'Amor perda luto');
    });

    it('resolve entradas do editor: dedupe por chave, papel normalizado', () => {
        const db = { temas: [] };
        const { temas, ...resto } = resolverTemasEditados(db, [
            { nome: 'Amor', papel: '' },
            { nome: 'Machismo', papel: 'principal' },
            { nome: 'amor', papel: 'secundario' },
            { nome: 'Luto', papel: 'invalido' },
        ]);
        assert.equal(temas.length, 3);
        assert.deepEqual(
            temas.map((t) => [nomeDe(db, t.temaId), t.papel]),
            [
                ['Amor', ''],
                ['Machismo', 'principal'],
                ['Luto', ''],
            ],
        );
        assert.deepEqual(Object.keys(resto), [], 'o espelho não sai mais daqui');
    });
});

describe('reconciliarTemasDoTexto', () => {
    it('migra texto antigo (só espelho) para temas por id "sem papel definido"', () => {
        const db = dbBase();
        sincronizarTemas(db);
        const p1 = db.poemas[0];
        assert.equal(p1.temas.length, 2);
        assert.ok(p1.temas.every((t) => t.papel === ''));
        assert.deepEqual(
            p1.temas.map((t) => nomeDe(db, t.temaId)),
            ['Machismo', 'Brasil'],
        );
        assert.equal(nomesDosTemas(p1, db), 'Machismo, Brasil');
    });

    it('texto sem tema ganha temas vazio; grafias diferentes viram o mesmo id', () => {
        const db = dbBase();
        sincronizarTemas(db);
        assert.deepEqual(db.prosas[1].temas, []);
        assert.equal(nomesDosTemas(db.prosas[1], db), '');
        assert.equal(db.poemas[1].temas[0].temaId, db.poemas[0].temas[0].temaId);
        assert.equal(nomesDosTemas(db.poemas[1], db), 'Machismo');
    });

    it('é idempotente e devolve false quando nada muda', () => {
        const db = dbBase();
        sincronizarTemas(db);
        const antes = JSON.stringify(db);
        sincronizarTemas(db);
        assert.equal(JSON.stringify(db), antes);
        assert.equal(reconciliarTemasDoTexto(db, db.poemas[0]), false);
    });

    it('mantém papéis quando temas e espelho falam dos mesmos Temas', () => {
        const db = dbBase();
        sincronizarTemas(db);
        const p1 = db.poemas[0];
        p1.temas[1].papel = 'principal'; // Brasil principal
        reconciliarTemasDoTexto(db, p1);
        assert.equal(p1.temas[1].papel, 'principal');
        assert.equal(nomesDosTemas(p1, db), 'Brasil, Machismo');
    });

    it('os `temas` mandam: espelho editado por fora é refeito e o papel fica', () => {
        const db = dbBase();
        sincronizarTemas(db);
        const p1 = db.poemas[0];
        p1.temas[0].papel = 'principal'; // Machismo principal
        p1.sinalizacoesTema = 'Machismo, Luto'; // alguém mexeu só no espelho
        reconciliarTemasDoTexto(db, p1);
        assert.deepEqual(
            p1.temas.map((t) => [nomeDe(db, t.temaId), t.papel]),
            [
                ['Machismo', 'principal'],
                ['Brasil', ''],
            ],
        );
        assert.equal(nomesDosTemas(p1, db), 'Machismo, Brasil');
        assert.equal(
            db.temas.some((t) => t.nome === 'Luto'),
            false,
        );
    });

    it('migrarEspelhoParaTemas: só o texto de formato antigo, sem papel, e é idempotente', () => {
        const db = dbBase();
        db.poemas[1].temas = [];
        assert.equal(migrarEspelhoParaTemas(db), 3);
        assert.deepEqual(
            db.poemas[0].temas.map((t) => [nomeDe(db, t.temaId), t.papel]),
            [
                ['Machismo', ''],
                ['Brasil', ''],
            ],
        );
        assert.deepEqual(db.prosas[1].temas ?? [], []);
        assert.equal(migrarEspelhoParaTemas(db), 0);
        // texto que já tem `temas` não é tocado, mesmo com o espelho diferente
        db.poemas[0].temas[0].papel = 'principal';
        db.poemas[0].sinalizacoesTema = 'Outro';
        assert.equal(migrarEspelhoParaTemas(db), 0);
        assert.equal(db.poemas[0].temas[0].papel, 'principal');
    });

    it('id que não existe no cadastro (ex.: importado de outro acervo) é descartado e, sem nada sobrando, o espelho é a fonte', () => {
        const db = dbBase();
        sincronizarTemas(db);
        const p1 = db.poemas[0];
        // Formato antigo reposto à mão: o `sincronizarTemas` acima já apagou o campo.
        p1.sinalizacoesTema = 'Machismo, Brasil';
        p1.temas = [{ temaId: 999999, papel: 'principal' }];
        reconciliarTemasDoTexto(db, p1);
        assert.equal('sinalizacoesTema' in p1, false);
        assert.deepEqual(
            p1.temas.map((t) => nomeDe(db, t.temaId)),
            ['Machismo', 'Brasil'],
        );
    });

    it('renomear o Tema mantém texto e espelho coerentes (sem criar Tema duplicado)', () => {
        const db = dbBase();
        sincronizarTemas(db);
        const id = db.poemas[0].temas[0].temaId;
        const total = db.temas.length;
        const r = renomearTema(db, id, 'Misoginia');
        assert.equal(r.ok, true);
        sincronizarTemas(db);
        assert.equal(db.temas.length, total);
        assert.equal(nomesDosTemas(db.poemas[0], db), 'Misoginia, Brasil');
        assert.equal(nomeDe(db, db.poemas[0].temas[0].temaId), 'Misoginia');
        assert.deepEqual(nomesTemasDoAssunto(db.assuntos[0], db.temas), ['Misoginia']);
    });
});

describe('temasDoTextoResolvidos', () => {
    it('devolve id, nome e papel na ordem gravada, ignorando ids inexistentes', () => {
        const db = { temas: [{ id: 1, nome: 'Amor', notas: '' }] };
        const item = {
            temas: [
                { temaId: 1, papel: 'principal' },
                { temaId: 2, papel: '' },
            ],
        };
        assert.deepEqual(temasDoTextoResolvidos(db, item), [
            { temaId: 1, nome: 'Amor', papel: 'principal' },
        ]);
    });
});
