// Fase 2, Etapa 4: o formato antigo do Tema (só o espelho `sinalizacoesTema`)
// vira `temas` por id na entrada de dados (importarDB), e o espelho deixa de
// "vencer" quando diverge dos `temas`.
import './helpers/localstorage-shim.js';
import './helpers/dom-shim.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { nomesDosTemas } from './helpers/temas-do-texto.js';

const { db, importarDB, save } = await import('../js/db.js');

const nomeDe = (id) => db.temas.find((t) => t.id == id)?.nome;
const nomesDe = (texto) => texto.temas.map((t) => nomeDe(t.temaId));

describe('Etapa 4: backup antigo entra com Temas por id', () => {
    beforeEach(() => localStorage.clear());

    it('backup só com o espelho: `temas` por id, sem papel, espelho igual', async () => {
        await importarDB({
            poemas: [{ id: 1, titulo: 'Um', texto: 'x', sinalizacoesTema: 'Amor, Exílio' }],
            prosas: [{ id: 2, titulo: 'Dois', texto: 'y' }],
        });
        assert.deepEqual(nomesDe(db.poemas[0]), ['Amor', 'Exílio']);
        assert.deepEqual(
            db.poemas[0].temas.map((t) => t.papel),
            ['', ''],
        );
        assert.equal(nomesDosTemas(db.poemas[0], db), 'Amor, Exílio');
        assert.deepEqual(db.prosas[0].temas, []);
        assert.deepEqual(db.temas.map((t) => t.nome).sort(), ['Amor', 'Exílio']);
    });

    it('backup novo (com `temas` e papéis) fica como está, e o espelho divergente é refeito', async () => {
        await importarDB({
            poemas: [
                {
                    id: 1,
                    titulo: 'Um',
                    texto: 'x',
                    temas: [
                        { temaId: 7, papel: '' },
                        { temaId: 8, papel: 'principal' },
                    ],
                    sinalizacoesTema: 'Qualquer coisa',
                },
            ],
            prosas: [],
            temas: [
                { id: 7, nome: 'Mar', notas: '' },
                { id: 8, nome: 'Luto', notas: '' },
            ],
        });
        assert.deepEqual(nomesDe(db.poemas[0]), ['Mar', 'Luto']);
        assert.deepEqual(
            db.poemas[0].temas.map((t) => t.papel),
            ['', 'principal'],
        );
        assert.equal(nomesDosTemas(db.poemas[0], db), 'Luto, Mar');
        assert.equal(db.temas.length, 2);
    });

    it('o save() é idempotente e não desfaz papel nem recria Tema', async () => {
        await importarDB({
            poemas: [{ id: 1, titulo: 'Um', texto: 'x', sinalizacoesTema: 'Amor, Exílio' }],
            prosas: [],
        });
        db.poemas[0].temas[1].papel = 'principal';
        save();
        const antes = JSON.stringify([db.poemas, db.temas]);
        save();
        assert.equal(JSON.stringify([db.poemas, db.temas]), antes);
        assert.equal(nomesDosTemas(db.poemas[0], db), 'Exílio, Amor');
        assert.equal(db.temas.length, 2);
    });
});
