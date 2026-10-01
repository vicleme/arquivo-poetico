import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { nomesTemasDoAssunto } from '../js/utils.js';

import {
    garantirTema,
    limparNomeTema,
    resolverTemasEditados,
    temasDoTextoResolvidos,
    reconciliarTemasDoTexto,
    sincronizarTemas,
    renomearTema,
} from '../js/temas.js';
import { espelhoDeTemas, normalizarPapelTema, ROTULOS_PAPEL_TEMA } from '../js/utils.js';

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

    it('espelho ordena principal, secundário, sem papel, estável dentro do papel', () => {
        const espelho = espelhoDeTemas([
            { nome: 'C', papel: '' },
            { nome: 'B', papel: 'secundario' },
            { nome: 'A', papel: 'principal' },
            { nome: 'D', papel: '' },
        ]);
        assert.equal(espelho, 'A, B, C, D');
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

    it('tira vírgula do nome (é o separador do espelho)', () => {
        assert.equal(limparNomeTema('  Amor,  perda '), 'Amor perda');
    });

    it('resolve entradas do editor: dedupe por chave, papel normalizado, espelho pronto', () => {
        const db = { temas: [] };
        const { temas, espelho } = resolverTemasEditados(db, [
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
        assert.equal(espelho, 'Machismo, Amor, Luto');
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
        assert.equal(p1.sinalizacoesTema, 'Machismo, Brasil');
    });

    it('texto sem tema ganha temas vazio; grafias diferentes viram o mesmo id', () => {
        const db = dbBase();
        sincronizarTemas(db);
        assert.deepEqual(db.prosas[1].temas, []);
        assert.equal(db.prosas[1].sinalizacoesTema, '');
        assert.equal(db.poemas[1].temas[0].temaId, db.poemas[0].temas[0].temaId);
        assert.equal(db.poemas[1].sinalizacoesTema, 'Machismo');
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
        assert.equal(p1.sinalizacoesTema, 'Brasil, Machismo');
    });

    it('espelho editado por fora vence e preserva o papel de quem ficou', () => {
        const db = dbBase();
        sincronizarTemas(db);
        const p1 = db.poemas[0];
        p1.temas[0].papel = 'principal'; // Machismo principal
        p1.sinalizacoesTema = 'Machismo, Luto'; // edição em massa tirou Brasil, pôs Luto
        reconciliarTemasDoTexto(db, p1);
        assert.deepEqual(
            p1.temas.map((t) => [nomeDe(db, t.temaId), t.papel]),
            [
                ['Machismo', 'principal'],
                ['Luto', ''],
            ],
        );
        assert.equal(p1.sinalizacoesTema, 'Machismo, Luto');
        assert.ok(db.temas.some((t) => t.nome === 'Luto'));
    });

    it('id que não existe no cadastro (ex.: importado de outro acervo) é descartado', () => {
        const db = dbBase();
        sincronizarTemas(db);
        const p1 = db.poemas[0];
        p1.temas = [{ temaId: 999999, papel: 'principal' }];
        reconciliarTemasDoTexto(db, p1);
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
        assert.equal(db.poemas[0].sinalizacoesTema, 'Misoginia, Brasil');
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
