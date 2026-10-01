// Fase 3: Assunto por id, mesclagem de Temas e Tema por papel nas saídas.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    sincronizarTemas,
    migrarAssuntosParaIds,
    mesclarTemas,
    impactoDoTema,
    assuntosDoTema,
    temasCadastradosSemAssunto,
    renomearTema,
} from '../js/temas.js';
import {
    nomesTemasDoAssunto,
    assuntosDoTexto,
    temasComPapel,
    textoTemasComPapel,
    nomesTemasPorPapel,
    sinalizacoesAgrupadas,
    contarTextosPorAssunto,
} from '../js/utils.js';

function dbBase() {
    return {
        poemas: [
            {
                id: 1,
                temas: [
                    { temaId: 1, papel: 'principal' },
                    { temaId: 2, papel: 'secundario' },
                    { temaId: 3, papel: '' },
                ],
                sinalizacoesTema: 'Amor, Machismo, Brasil',
            },
            {
                id: 2,
                temas: [
                    { temaId: 1, papel: 'secundario' },
                    { temaId: 4, papel: 'principal' },
                ],
                sinalizacoesTema: 'Amor, Machismos',
            },
        ],
        prosas: [{ id: 3, temas: [{ temaId: 4, papel: '' }], sinalizacoesTema: 'Machismos' }],
        temas: [
            { id: 1, nome: 'Amor', notas: '' },
            { id: 2, nome: 'Machismo', notas: 'nota A' },
            { id: 3, nome: 'Brasil', notas: '' },
            { id: 4, nome: 'Machismos', notas: 'nota B' },
        ],
        assuntos: [
            { id: 10, nome: 'Sociedade', notas: '', temaIds: [2, 4] },
            { id: 11, nome: 'Gênero', notas: '', temaIds: [4] },
        ],
    };
}

describe('migrarAssuntosParaIds', () => {
    it('converte nomes em ids, descarta ids inexistentes e não repete', () => {
        const db = dbBase();
        db.assuntos = [
            { id: 1, nome: 'A', temas: ['machismo', 'MACHISMOS', 'Amor', 'Amor'] },
            { id: 2, nome: 'B', temaIds: [3, 99, 3] },
            { id: 3, nome: 'C', temaIds: [1], temas: ['brasil'] },
        ];
        migrarAssuntosParaIds(db);
        assert.deepEqual(db.assuntos[0].temaIds, [2, 4, 1]);
        assert.deepEqual(db.assuntos[1].temaIds, [3]);
        assert.deepEqual(db.assuntos[2].temaIds, [1, 3]);
        db.assuntos.forEach((a) => assert.equal(a.temas, undefined));
    });
    it('é idempotente', () => {
        const db = dbBase();
        db.assuntos = [{ id: 1, nome: 'A', temas: ['Amor'] }];
        migrarAssuntosParaIds(db);
        const antes = JSON.stringify(db.assuntos);
        migrarAssuntosParaIds(db);
        assert.equal(JSON.stringify(db.assuntos), antes);
    });
    it('sincronizarTemas cria o Tema que só existia num Assunto antigo', () => {
        const db = {
            poemas: [],
            prosas: [],
            temas: [],
            assuntos: [{ id: 1, nome: 'A', temas: ['Luto'] }],
        };
        sincronizarTemas(db);
        assert.equal(db.temas.length, 1);
        assert.deepEqual(db.assuntos[0].temaIds, [db.temas[0].id]);
        assert.deepEqual(nomesTemasDoAssunto(db.assuntos[0], db.temas), ['Luto']);
    });
});

describe('Assunto por id: renomear não mexe no Assunto', () => {
    it('o nome novo aparece pelo cadastro', () => {
        const db = dbBase();
        const antes = JSON.stringify(db.assuntos);
        assert.equal(renomearTema(db, 2, 'Misoginia').ok, true);
        assert.equal(JSON.stringify(db.assuntos), antes);
        assert.deepEqual(nomesTemasDoAssunto(db.assuntos[0], db.temas), ['Misoginia', 'Machismos']);
    });
});

describe('mesclarTemas', () => {
    it('recusa igual e inexistente', () => {
        const db = dbBase();
        assert.equal(mesclarTemas(db, 2, 2).motivo, 'igual');
        assert.equal(mesclarTemas(db, 2, 99).motivo, 'inexistente');
        assert.equal(db.temas.length, 4);
    });
    it('passa textos e Assuntos ao destino, soma notas e remove a origem', () => {
        const db = dbBase();
        assert.deepEqual(impactoDoTema(db, 4), {
            poemasIds: [2],
            prosasIds: [3],
            assuntosIds: [10, 11],
        });
        const r = mesclarTemas(db, 4, 2);
        assert.deepEqual(
            { ok: r.ok, textos: r.textos, assuntos: r.assuntos },
            { ok: true, textos: 2, assuntos: 2 },
        );
        assert.equal(typeof r.desfazer, 'function');
        assert.ok(!db.temas.some((t) => t.id === 4));
        assert.equal(db.temas.find((t) => t.id === 2).notas, 'nota A\n\nnota B');
        // poema 2: só tinha a origem (principal) → vira o destino, papel mantido
        assert.deepEqual(db.poemas[1].temas, [
            { temaId: 1, papel: 'secundario' },
            { temaId: 2, papel: 'principal' },
        ]);
        assert.equal(db.poemas[1].sinalizacoesTema, 'Machismo, Amor');
        assert.deepEqual(db.prosas[0].temas, [{ temaId: 2, papel: '' }]);
        assert.equal(db.prosas[0].sinalizacoesTema, 'Machismo');
        // Assunto 10 tinha os dois: fica um só; 11 troca a origem pelo destino
        assert.deepEqual(db.assuntos[0].temaIds, [2]);
        assert.deepEqual(db.assuntos[1].temaIds, [2]);
    });
    it('texto com os dois Temas fica com uma entrada e o papel mais forte', () => {
        const db = dbBase();
        db.poemas[0].temas.push({ temaId: 4, papel: 'principal' });
        db.poemas[0].temas.find((e) => e.temaId === 2).papel = 'secundario';
        mesclarTemas(db, 4, 2);
        const doDestino = db.poemas[0].temas.filter((e) => e.temaId === 2);
        assert.equal(doDestino.length, 1);
        assert.equal(doDestino[0].papel, 'principal');
        assert.equal(db.poemas[0].sinalizacoesTema, 'Amor, Machismo, Brasil');
    });
    it('não repete a nota quando é igual e ignora nota vazia', () => {
        const db = dbBase();
        db.temas.find((t) => t.id === 4).notas = 'nota A';
        mesclarTemas(db, 4, 2);
        assert.equal(db.temas.find((t) => t.id === 2).notas, 'nota A');
    });
});

describe('consultas por id', () => {
    it('assuntosDoTema e temasCadastradosSemAssunto', () => {
        const db = dbBase();
        assert.deepEqual(
            assuntosDoTema(db, 'machismos').map((a) => a.id),
            [10, 11],
        );
        assert.deepEqual(
            temasCadastradosSemAssunto(db).map((t) => t.nome),
            ['Amor', 'Brasil'],
        );
    });
    it('assuntosDoTexto e contagem usam o cadastro', () => {
        const db = dbBase();
        assert.deepEqual(
            assuntosDoTexto(db.poemas[1], db.assuntos, db.temas).map((a) => a.id),
            [10, 11],
        );
        const contagem = contarTextosPorAssunto(
            [...db.poemas, ...db.prosas],
            db.assuntos,
            db.temas,
        );
        assert.equal(contagem.get(10), 3);
        assert.equal(contagem.get(11), 2);
    });
});

describe('Tema por papel nas saídas', () => {
    it('temasComPapel ordena principal → secundário → sem papel', () => {
        const db = dbBase();
        assert.deepEqual(
            temasComPapel(db.poemas[0], db.temas).map((e) => [e.nome, e.papel]),
            [
                ['Amor', 'principal'],
                ['Machismo', 'secundario'],
                ['Brasil', ''],
            ],
        );
    });
    it('textoTemasComPapel e nomesTemasPorPapel', () => {
        const db = dbBase();
        assert.equal(
            textoTemasComPapel(db.poemas[0], db.temas),
            'Amor (principal), Machismo (secundário), Brasil',
        );
        assert.deepEqual(nomesTemasPorPapel(db.poemas[0], db.temas, 'secundario'), ['Machismo']);
        assert.deepEqual(nomesTemasPorPapel(db.poemas[0], db.temas, ''), ['Brasil']);
        assert.deepEqual(nomesTemasPorPapel(db.prosas[0], db.temas, 'principal'), []);
    });
    it('texto antigo (sem `temas`) cai no espelho, sem papel', () => {
        const antigo = { sinalizacoesTema: 'Amor, Brasil' };
        assert.equal(textoTemasComPapel(antigo, []), 'Amor, Brasil');
        assert.deepEqual(nomesTemasPorPapel(antigo, [], 'principal'), []);
    });
    it('sinalizacoesAgrupadas: com cadastro traz o papel; sem cadastro, o espelho', () => {
        const db = dbBase();
        const com = sinalizacoesAgrupadas(db.poemas[0], db.temas).find((b) => b.rotulo === 'Tema');
        assert.equal(com.valor, 'Amor (principal), Machismo (secundário), Brasil');
        const sem = sinalizacoesAgrupadas(db.poemas[0]).find((b) => b.rotulo === 'Tema');
        assert.equal(sem.valor, 'Amor, Machismo, Brasil');
    });
});
