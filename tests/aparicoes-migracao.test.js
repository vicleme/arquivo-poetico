import './helpers/dom-real.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    contarTextosSemAparicoes,
    sincronizarAparicoesComCamposAntigos,
} from '../js/aparicoes-dado.js';
import {
    guardarAvisoDeAparicoes,
    lerAvisoDeAparicoes,
    textoDoAvisoDeAparicoes,
} from '../js/aviso-aparicoes.js';

if (!globalThis.history) {
    globalThis.history = {
        state: null,
        replaceState(estado) {
            this.state = estado;
        },
    };
}

const { prepararAparicoesDosTextos, importarDB, save, db } = await import('../js/db.js');

function acervo() {
    return {
        livros: [
            { id: 1, titulo: 'Um', tipo: 'Inéditos' },
            { id: 2, titulo: 'Dois', tipo: 'Inéditos' },
        ],
        partes: [{ id: 10, livroId: 1, titulo: 'A' }],
        secoes: [],
        poemas: [
            { id: 100, titulo: 'a', paiTipo: 'parte', paiId: 10, sequencia: 2, livrosIds: [2] },
            { id: 101, titulo: 'b', paiTipo: null, paiId: null, livrosIds: [] },
        ],
        prosas: [{ id: 200, titulo: 'c', paiTipo: 'livro', paiId: 1, sequencia: '3' }],
    };
}

describe('migração das aparições (21-1b-2, entrega 1)', () => {
    it('preenche a lista de quem não tem e não mexe nos campos antigos', () => {
        const dbRef = acervo();
        const antes = JSON.stringify(dbRef.poemas.map(({ aparicoes: _a, ...r }) => r));
        assert.equal(contarTextosSemAparicoes(dbRef), 3);
        const r = sincronizarAparicoesComCamposAntigos(dbRef);
        assert.deepEqual(r, { migrados: 3, atualizados: 0 });
        assert.equal(contarTextosSemAparicoes(dbRef), 0);
        assert.deepEqual(dbRef.poemas[0].aparicoes, [
            { livroId: 1, parteId: 10, secaoId: null, sequencia: 2 },
            { livroId: 2, parteId: null, secaoId: null, sequencia: null },
        ]);
        assert.deepEqual(dbRef.poemas[1].aparicoes, []);
        assert.equal(dbRef.prosas[0].aparicoes[0].sequencia, 3);
        assert.equal(JSON.stringify(dbRef.poemas.map(({ aparicoes: _a, ...r2 }) => r2)), antes);
    });

    it('é idempotente', () => {
        const dbRef = acervo();
        sincronizarAparicoesComCamposAntigos(dbRef);
        const f = JSON.stringify(dbRef);
        assert.deepEqual(sincronizarAparicoesComCamposAntigos(dbRef), {
            migrados: 0,
            atualizados: 0,
        });
        assert.equal(JSON.stringify(dbRef), f);
    });

    it('refaz a lista de quem foi editado só nos campos antigos', () => {
        const dbRef = acervo();
        sincronizarAparicoesComCamposAntigos(dbRef);
        dbRef.poemas[1].paiTipo = 'livro';
        dbRef.poemas[1].paiId = 2;
        dbRef.poemas[1].sequencia = 1;
        const r = sincronizarAparicoesComCamposAntigos(dbRef);
        assert.deepEqual(r, { migrados: 0, atualizados: 1 });
        assert.deepEqual(dbRef.poemas[1].aparicoes, [
            { livroId: 2, parteId: null, secaoId: null, sequencia: 1 },
        ]);
    });

    it('prepararAparicoesDosTextos conta quantos faltavam', () => {
        const dbRef = acervo();
        const r = prepararAparicoesDosTextos(dbRef);
        assert.equal(r.faltavam, 3);
        assert.equal(r.migrados, 3);
        assert.equal(prepararAparicoesDosTextos(dbRef).faltavam, 0);
    });

    it('importarDB de backup antigo ganha a lista e guarda o aviso', async () => {
        const velho = acervo();
        await importarDB(velho);
        assert.ok(db.poemas.every((p) => Array.isArray(p.aparicoes)));
        assert.ok(db.prosas.every((p) => Array.isArray(p.aparicoes)));
        const aviso = lerAvisoDeAparicoes();
        assert.equal(aviso.textos, 3);
        assert.equal(lerAvisoDeAparicoes(), null);
    });
});

describe('save() mantém a lista em dia (entrega 1)', () => {
    it('dá lista ao texto novo e acompanha a edição dos campos antigos', () => {
        ['livros', 'partes', 'secoes', 'poemas', 'prosas'].forEach((c) => {
            db[c].length = 0;
        });
        db.livros.push({ id: 1, titulo: 'Um', tipo: 'Inéditos', sequencia: 1 });
        db.livros.push({ id: 2, titulo: 'Dois', tipo: 'Inéditos', sequencia: 2 });
        db.poemas.push({ id: 100, titulo: 'a', texto: 'x', paiTipo: 'livro', paiId: 1 });
        save();
        assert.deepEqual(db.poemas[0].aparicoes, [
            { livroId: 1, parteId: null, secaoId: null, sequencia: null },
        ]);
        db.poemas[0].paiTipo = null;
        db.poemas[0].paiId = null;
        db.poemas[0].livrosIds = [2];
        save();
        assert.deepEqual(db.poemas[0].aparicoes, [
            { livroId: 2, parteId: null, secaoId: null, sequencia: null },
        ]);
        db.poemas.length = 0;
        db.livros.length = 0;
    });

    it('custa pouco com um acervo grande', () => {
        const grande = acervo();
        for (let i = 0; i < 3000; i++) {
            grande.poemas.push({
                id: 1000 + i,
                titulo: 't',
                paiTipo: 'parte',
                paiId: 10,
                sequencia: i,
            });
        }
        const t = performance.now();
        sincronizarAparicoesComCamposAntigos(grande);
        const ms = performance.now() - t;
        assert.ok(ms < 500, `levou ${ms.toFixed(0)} ms`);
    });
});

describe('aviso das aparições', () => {
    const fake = () => ({
        state: null,
        replaceState(estado) {
            this.state = estado;
        },
    });

    it('guarda e lê uma vez só', () => {
        const st = fake();
        assert.equal(guardarAvisoDeAparicoes({ textos: 2, copia: true }, st), true);
        assert.deepEqual(lerAvisoDeAparicoes(st), { textos: 2, copia: true });
        assert.equal(lerAvisoDeAparicoes(st), null);
    });

    it('não guarda aviso sem textos', () => {
        const st = fake();
        assert.equal(guardarAvisoDeAparicoes({ textos: 0 }, st), false);
        assert.equal(lerAvisoDeAparicoes(st), null);
    });

    it('o texto diz se a cópia foi guardada, sem travessão', () => {
        assert.match(textoDoAvisoDeAparicoes({ textos: 1, copia: true }), /1 texto\)/);
        assert.match(
            textoDoAvisoDeAparicoes({ textos: 5, copia: true }),
            /cópia automática foi guardada/,
        );
        assert.match(textoDoAvisoDeAparicoes({ textos: 5, copia: false }), /baixe um backup/);
        assert.doesNotMatch(textoDoAvisoDeAparicoes({ textos: 5 }), /cópia/);
        assert.doesNotMatch(textoDoAvisoDeAparicoes({ textos: 5, copia: false }), /—/);
    });
});
