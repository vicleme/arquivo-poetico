// Sugestão de Temas duplicados (só mesma forma escrita) e Desfazer da
// mesclagem de Temas. Lógica pura de js/temas.js.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    formaTema,
    sugerirTemasDuplicados,
    marcarTemasNaoIguais,
    mesclarTemas,
} from '../js/temas.js';

function dbBase() {
    return {
        temas: [
            { id: 1, nome: 'Auto-acolhimento', notas: 'nota 1' },
            { id: 2, nome: 'Autoacolhimento', notas: '' },
            { id: 3, nome: 'Memória', notas: '' },
            { id: 4, nome: 'Memórias', notas: '' },
            { id: 5, nome: 'Luto', notas: '' },
            { id: 6, nome: 'Luto/Finitude', notas: '' },
            { id: 7, nome: 'País', notas: '' },
            { id: 8, nome: 'Pai', notas: '' },
        ],
        assuntos: [{ id: 100, nome: 'Vida emocional', temaIds: [1, 2] }],
        poemas: [
            {
                id: 1,
                sinalizacoesTema: 'Auto-acolhimento, Autoacolhimento',
                temas: [
                    { temaId: 1, papel: 'secundario' },
                    { temaId: 2, papel: 'principal' },
                ],
            },
            {
                id: 2,
                sinalizacoesTema: 'Autoacolhimento',
                temas: [{ temaId: 2, papel: '' }],
            },
        ],
        prosas: [],
    };
}

describe('formaTema', () => {
    it('ignora caixa, acento, hífen, espaço e pontuação', () => {
        assert.equal(formaTema('Auto-acolhimento'), formaTema('autoacolhimento'));
        assert.equal(formaTema('Mal-estar'), formaTema('Mal estar'));
        assert.equal(formaTema('Violência doméstica'), formaTema('violencia domestica'));
    });

    it('trata o plural palavra a palavra', () => {
        assert.equal(formaTema('Desigualdades sociais'), formaTema('Desigualdade social'));
        assert.equal(formaTema('Paixões'), formaTema('Paixão'));
        assert.equal(formaTema('Homens'), formaTema('Homem'));
        assert.equal(formaTema('Amores'), formaTema('Amor'));
        assert.equal(formaTema('Memórias'), formaTema('Memória'));
    });

    it('não junta palavras curtas nem nomes que só se parecem', () => {
        assert.notEqual(formaTema('País'), formaTema('Pai'));
        assert.notEqual(formaTema('Caos'), formaTema('Cão'));
        assert.notEqual(formaTema('Machismo'), formaTema('Racismo'));
        assert.notEqual(formaTema('Luto'), formaTema('Luto/Finitude'));
        assert.notEqual(formaTema('Consumismo'), formaTema('Consumo'));
    });
});

describe('sugerirTemasDuplicados', () => {
    it('sugere só pares com a mesma forma, sem nome contido em outro', () => {
        const pares = sugerirTemasDuplicados(dbBase()).map((p) => [p.a.nome, p.b.nome]);
        assert.deepEqual(pares, [
            ['Autoacolhimento', 'Auto-acolhimento'],
            ['Memória', 'Memórias'],
        ]);
    });

    it('põe o mais usado como `a` e informa as contagens', () => {
        const [par] = sugerirTemasDuplicados(dbBase());
        assert.equal(par.a.nome, 'Autoacolhimento');
        assert.equal(par.textosA, 2);
        assert.equal(par.textosB, 1);
    });

    it('um grupo de três gera os três pares', () => {
        const db = dbBase();
        db.temas.push({ id: 9, nome: 'Autoacolhimentos', notas: '' });
        const pares = sugerirTemasDuplicados(db).filter((p) => /uto-?acolhimento/i.test(p.a.nome));
        assert.equal(pares.length, 3);
    });

    it('não sugere de novo o par marcado como "não são iguais"', () => {
        const db = dbBase();
        assert.equal(marcarTemasNaoIguais(db, 3, 4).ok, true);
        const nomes = sugerirTemasDuplicados(db).map((p) => p.a.nome);
        assert.deepEqual(nomes, ['Autoacolhimento']);
    });

    it('a marca vale nos dois sentidos e o Desfazer traz o par de volta', () => {
        const db = dbBase();
        const r = marcarTemasNaoIguais(db, 4, 3);
        assert.deepEqual(db.temas.find((t) => t.id == 3).naoIguais, [4]);
        assert.deepEqual(db.temas.find((t) => t.id == 4).naoIguais, [3]);
        r.desfazer();
        assert.equal('naoIguais' in db.temas.find((t) => t.id == 3), false);
        assert.equal(sugerirTemasDuplicados(db).length, 2);
    });

    it('recusa marcar o mesmo tema ou um id que não existe', () => {
        const db = dbBase();
        assert.equal(marcarTemasNaoIguais(db, 3, 3).ok, false);
        assert.equal(marcarTemasNaoIguais(db, 3, 999).ok, false);
    });
});

describe('mesclarTemas: Desfazer', () => {
    it('devolve exatamente o estado de antes (textos, assunto, nota, posição)', () => {
        const db = dbBase();
        const antes = JSON.stringify(db);
        const r = mesclarTemas(db, 1, 2);
        assert.equal(r.ok, true);
        assert.equal(
            db.temas.some((t) => t.id == 1),
            false,
        );
        assert.deepEqual(db.assuntos[0].temaIds, [2]);
        assert.deepEqual(db.poemas[0].temas, [{ temaId: 2, papel: 'principal' }]);
        assert.equal(db.poemas[0].sinalizacoesTema, 'Autoacolhimento');
        assert.match(db.temas.find((t) => t.id == 2).notas, /nota 1/);

        r.desfazer();
        assert.equal(JSON.stringify(db), antes);
    });

    it('a marca "não são iguais" da origem passa ao destino e o Desfazer a restaura', () => {
        const db = dbBase();
        db.temas.push({ id: 9, nome: 'Outro', notas: '', naoIguais: [1] });
        db.temas.find((t) => t.id == 1).naoIguais = [9];
        const antes = JSON.stringify(db);
        const r = mesclarTemas(db, 1, 2);
        assert.deepEqual(db.temas.find((t) => t.id == 9).naoIguais, [2]);
        assert.deepEqual(db.temas.find((t) => t.id == 2).naoIguais, [9]);
        r.desfazer();
        assert.equal(JSON.stringify(db), antes);
    });

    it('não devolve `desfazer` quando a mesclagem é recusada', () => {
        const db = dbBase();
        assert.equal(mesclarTemas(db, 1, 1).desfazer, undefined);
        assert.equal(mesclarTemas(db, 1, 999).desfazer, undefined);
    });
});
