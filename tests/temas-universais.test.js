import './helpers/localstorage-shim.js';

// Temas universais (vitrine do sorteio), lógica pura.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    MAX_TEMAS_UNIVERSAIS,
    VITRINE_SUGERIDA,
    limparNomeUniversal,
    vagasDeUniversais,
    criarTemaUniversal,
    renomearTemaUniversal,
    definirTemasDoUniversal,
    excluirTemaUniversal,
    moverTemaUniversal,
    removerTemaDosUniversais,
    substituirTemaNosUniversais,
    limparTemasUniversais,
    planejarVitrineSugerida,
    aplicarVitrineSugerida,
    sanearTemasUniversais,
    guardarTemasDosUniversais,
} from '../js/temas-universais.js';

const dbBase = () => ({
    temas: [
        { id: 1, nome: 'Término amoroso', notas: '' },
        { id: 2, nome: 'Saudade', notas: '' },
        { id: 3, nome: 'Memória', notas: '' },
        { id: 4, nome: 'Luto/Finitude', notas: '' },
    ],
});

const nomes = (db) => db.temasUniversais.map((u) => u.nome);

describe('limparNomeUniversal', () => {
    it('colapsa espaços e tira as pontas', () => {
        assert.equal(limparNomeUniversal('  Quando   o amor\tacaba '), 'Quando o amor acaba');
        assert.equal(limparNomeUniversal(null), '');
    });
});

describe('criarTemaUniversal', () => {
    it('cria o array se não existe e grava só Temas do cadastro, sem repetir', () => {
        const db = dbBase();
        const r = criarTemaUniversal(db, ' Saudade e memória ', [2, '3', 3, 99]);
        assert.equal(r.ok, true);
        assert.equal(r.universal.nome, 'Saudade e memória');
        assert.deepEqual(r.universal.temaIds, [2, 3]);
        assert.equal(db.temasUniversais.length, 1);
        assert.ok(r.universal.id);
    });
    it('recusa nome vazio e nome repetido (sem caixa nem acento)', () => {
        const db = dbBase();
        assert.deepEqual(criarTemaUniversal(db, '   '), { ok: false, motivo: 'vazio' });
        criarTemaUniversal(db, 'Perda e finitude');
        assert.deepEqual(criarTemaUniversal(db, 'perda E FINITUDE'), {
            ok: false,
            motivo: 'duplicado',
        });
        assert.equal(db.temasUniversais.length, 1);
    });
    it('trava no teto de 12', () => {
        const db = dbBase();
        for (let i = 1; i <= MAX_TEMAS_UNIVERSAIS; i++) {
            assert.equal(criarTemaUniversal(db, `U${i}`, [1]).ok, true);
        }
        assert.equal(vagasDeUniversais(db), 0);
        assert.deepEqual(criarTemaUniversal(db, 'U13', [1]), { ok: false, motivo: 'limite' });
        assert.equal(db.temasUniversais.length, 12);
        excluirTemaUniversal(db, db.temasUniversais[0].id);
        assert.equal(vagasDeUniversais(db), 1);
        assert.equal(criarTemaUniversal(db, 'U13', [1]).ok, true);
    });
    it('um Tema pode estar em mais de um universal', () => {
        const db = dbBase();
        criarTemaUniversal(db, 'A', [1, 2]);
        criarTemaUniversal(db, 'B', [2, 3]);
        assert.deepEqual(
            db.temasUniversais.map((u) => u.temaIds),
            [
                [1, 2],
                [2, 3],
            ],
        );
    });
});

describe('renomear, definir Temas, excluir e mover', () => {
    it('renomeia, aceita trocar só a caixa do próprio nome e recusa colisão', () => {
        const db = dbBase();
        const a = criarTemaUniversal(db, 'Amor').universal;
        criarTemaUniversal(db, 'Perda');
        assert.equal(renomearTemaUniversal(db, a.id, 'AMOR').ok, true);
        assert.equal(a.nome, 'AMOR');
        assert.deepEqual(renomearTemaUniversal(db, a.id, 'perda'), {
            ok: false,
            motivo: 'duplicado',
        });
        assert.deepEqual(renomearTemaUniversal(db, a.id, ' '), { ok: false, motivo: 'vazio' });
        assert.deepEqual(renomearTemaUniversal(db, 999, 'X'), {
            ok: false,
            motivo: 'inexistente',
        });
    });
    it('definirTemasDoUniversal troca a lista e filtra o que não existe', () => {
        const db = dbBase();
        const u = criarTemaUniversal(db, 'Amor', [1]).universal;
        const r = definirTemasDoUniversal(db, u.id, [3, 3, 42, '4']);
        assert.equal(r.ok, true);
        assert.deepEqual(u.temaIds, [3, 4]);
        assert.equal(definirTemasDoUniversal(db, u.id, []).ok, true);
        assert.deepEqual(u.temaIds, []);
        assert.equal(definirTemasDoUniversal(db, 999, [1]).ok, false);
    });
    it('excluir não mexe nos Temas', () => {
        const db = dbBase();
        const u = criarTemaUniversal(db, 'Amor', [1]).universal;
        assert.equal(excluirTemaUniversal(db, u.id).ok, true);
        assert.equal(db.temasUniversais.length, 0);
        assert.equal(db.temas.length, 4);
        assert.deepEqual(excluirTemaUniversal(db, u.id), { ok: false, motivo: 'inexistente' });
    });
    it('mover sobe e desce, e na ponta não faz nada', () => {
        const db = dbBase();
        ['A', 'B', 'C'].forEach((n) => criarTemaUniversal(db, n));
        const [a, , c] = db.temasUniversais;
        assert.deepEqual(moverTemaUniversal(db, c.id, -1), { ok: true, moveu: true });
        assert.deepEqual(nomes(db), ['A', 'C', 'B']);
        assert.deepEqual(moverTemaUniversal(db, a.id, -1), { ok: true, moveu: false });
        assert.deepEqual(moverTemaUniversal(db, a.id, 1), { ok: true, moveu: true });
        assert.deepEqual(nomes(db), ['C', 'A', 'B']);
        assert.equal(moverTemaUniversal(db, 999, 1).ok, false);
    });
});

describe('limpeza quando um Tema some', () => {
    it('removerTemaDosUniversais tira o id e conta os universais afetados', () => {
        const db = dbBase();
        criarTemaUniversal(db, 'A', [1, 2]);
        criarTemaUniversal(db, 'B', [2, 3]);
        criarTemaUniversal(db, 'C', [3]);
        assert.equal(removerTemaDosUniversais(db, 2), 2);
        assert.deepEqual(
            db.temasUniversais.map((u) => u.temaIds),
            [[1], [3], [3]],
        );
        assert.equal(removerTemaDosUniversais(db, 2), 0);
    });
    it('substituirTemaNosUniversais troca na mesma posição e não repete o destino', () => {
        const db = dbBase();
        criarTemaUniversal(db, 'A', [1, 2, 3]);
        criarTemaUniversal(db, 'B', [2]);
        criarTemaUniversal(db, 'C', [4]);
        assert.equal(substituirTemaNosUniversais(db, 2, 3), 2);
        assert.deepEqual(
            db.temasUniversais.map((u) => u.temaIds),
            [[1, 3], [3], [4]],
        );
    });
    it('limparTemasUniversais tira ids de Temas que não existem mais e repetições', () => {
        const db = dbBase();
        criarTemaUniversal(db, 'A', [1, 2]);
        db.temasUniversais[0].temaIds.push(2, 77);
        db.temas = db.temas.filter((t) => t.id !== 1);
        assert.equal(limparTemasUniversais(db), 3);
        assert.deepEqual(db.temasUniversais[0].temaIds, [2]);
        assert.equal(limparTemasUniversais(db), 0);
    });
    it('universal que fica sem Temas continua cadastrado', () => {
        const db = dbBase();
        criarTemaUniversal(db, 'A', [1]);
        removerTemaDosUniversais(db, 1);
        assert.deepEqual(db.temasUniversais[0].temaIds, []);
    });
});

describe('vitrine sugerida', () => {
    it('tem 11 universais, dentro do teto, sem nome repetido', () => {
        assert.equal(VITRINE_SUGERIDA.length, 11);
        assert.ok(VITRINE_SUGERIDA.length < MAX_TEMAS_UNIVERSAIS);
        assert.equal(new Set(VITRINE_SUGERIDA.map(([n]) => n.toLowerCase())).size, 11);
    });
    it('planeja sem gravar: casa Temas sem caixa nem acento e relata os ausentes', () => {
        const db = dbBase();
        const p = planejarVitrineSugerida(db);
        assert.equal(db.temasUniversais, undefined);
        const porNome = Object.fromEntries(p.criar.map((c) => [c.nome, c.temaIds]));
        assert.deepEqual(porNome['Quando o amor acaba'], [1]);
        assert.deepEqual(porNome['Saudade e memória'], [2, 3]);
        assert.deepEqual(porNome['Perda e finitude'], [4]);
        assert.equal(p.criar.length, 3);
        assert.equal(p.ignorados.filter((i) => i.motivo === 'sem-temas').length, 8);
        const aus = p.ausentes.find((a) => a.universal === 'Saudade e memória');
        assert.deepEqual(aus.nomes, ['Saudosismo', 'Memória histórica']);
    });
    it('aplica só acrescentando e não duplica o que já existe', () => {
        const db = dbBase();
        criarTemaUniversal(db, 'perda e finitude', [2]);
        const r = aplicarVitrineSugerida(db);
        assert.deepEqual(
            r.criados.map((u) => u.nome),
            ['Quando o amor acaba', 'Saudade e memória'],
        );
        assert.ok(
            r.ignorados.some((i) => i.nome === 'Perda e finitude' && i.motivo === 'duplicado'),
        );
        assert.deepEqual(db.temasUniversais[0].temaIds, [2]);
        assert.equal(db.temasUniversais.length, 3);
    });
    it('desfazer tira exatamente os criados', () => {
        const db = dbBase();
        criarTemaUniversal(db, 'Meu', [1]);
        const r = aplicarVitrineSugerida(db);
        assert.ok(db.temasUniversais.length > 1);
        r.desfazer();
        assert.deepEqual(nomes(db), ['Meu']);
    });
    it('respeita o teto: sem vaga, o que sobra vai para ignorados como limite', () => {
        const db = dbBase();
        db.temas = [];
        VITRINE_SUGERIDA.flatMap(([, ts]) => ts).forEach((nome, i) => {
            db.temas.push({ id: 100 + i, nome, notas: '' });
        });
        for (let i = 1; i <= 10; i++) criarTemaUniversal(db, `U${i}`, [100]);
        const r = aplicarVitrineSugerida(db);
        assert.equal(r.criados.length, 2);
        assert.equal(db.temasUniversais.length, MAX_TEMAS_UNIVERSAIS);
        assert.equal(r.ignorados.filter((i) => i.motivo === 'limite').length, 9);
    });
    it('com o cadastro completo, cria os 11 com todos os Temas', () => {
        const db = { temas: [] };
        VITRINE_SUGERIDA.flatMap(([, ts]) => ts).forEach((nome, i) => {
            if (!db.temas.some((t) => t.nome === nome))
                db.temas.push({ id: i + 1, nome, notas: '' });
        });
        const r = aplicarVitrineSugerida(db);
        assert.equal(r.criados.length, 11);
        assert.deepEqual(r.ausentes, []);
        assert.equal(vagasDeUniversais(db), 1);
    });
});

describe('sanearTemasUniversais (dado que veio de fora)', () => {
    it('descarta lixo, nome vazio ou repetido, dá id e tira Temas inexistentes', () => {
        const db = dbBase();
        db.temasUniversais = [
            null,
            'x',
            { nome: '  ', temaIds: [1] },
            { id: 5, nome: 'Amor', temaIds: [1, 99, 1] },
            { id: 6, nome: 'amor', temaIds: [2] },
            { nome: 'Perda', temaIds: [4] },
            { id: 8, nome: 'Sem lista' },
        ];
        assert.equal(sanearTemasUniversais(db), 4);
        assert.deepEqual(nomes(db), ['Amor', 'Perda', 'Sem lista']);
        assert.deepEqual(db.temasUniversais[0].temaIds, [1]);
        assert.ok(db.temasUniversais[1].id);
        assert.deepEqual(db.temasUniversais[2].temaIds, []);
    });
    it('corta no teto de 12 e aceita ausência do campo', () => {
        const db = dbBase();
        db.temasUniversais = Array.from({ length: 15 }, (_, i) => ({ id: i + 1, nome: `U${i}` }));
        assert.equal(sanearTemasUniversais(db), 3);
        assert.equal(db.temasUniversais.length, 12);
        const vazio = dbBase();
        assert.equal(sanearTemasUniversais(vazio), 0);
        assert.deepEqual(vazio.temasUniversais, []);
    });
});

describe('guardarTemasDosUniversais', () => {
    it('restaura as listas e deixa de fora o universal que foi excluído', () => {
        const db = dbBase();
        const a = criarTemaUniversal(db, 'A', [1, 2]).universal;
        const b = criarTemaUniversal(db, 'B', [2]).universal;
        const voltar = guardarTemasDosUniversais(db);
        removerTemaDosUniversais(db, 2);
        excluirTemaUniversal(db, b.id);
        voltar();
        assert.deepEqual(a.temaIds, [1, 2]);
        assert.deepEqual(nomes(db), ['A']);
    });
});
