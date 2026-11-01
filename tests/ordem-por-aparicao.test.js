import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { db, sortPoemas, sortProsas } from '../js/db.js';
import { chaveDeOrdemDoTexto, estruturaDoTextoNaTabela } from '../js/aparicoes-do-texto.js';

// Fase 21, etapa 21-4d (F21-D9): a tabela ordena pela aparição principal e a
// coluna Estrutura/Vínculo mostra uma linha por texto, com as outras no tooltip.

const ap = (livroId, parteId, secaoId, sequencia) => ({ livroId, parteId, secaoId, sequencia });

function montar() {
    db.livros = [
        { id: 1, titulo: 'Livro Novo', tipo: 'Livro', data: { ano: 2024 } },
        { id: 2, titulo: 'Livro Velho', tipo: 'Livro', data: { ano: 2019 } },
        { id: 3, titulo: 'Antologia', tipo: 'Coletânea' },
    ];
    db.partes = [
        { id: 10, titulo: 'Parte Alfa', livroId: 1, sequencia: 1 },
        { id: 20, titulo: 'Parte Beta', livroId: 2, sequencia: 1 },
        { id: 30, titulo: 'Parte Gama', livroId: 3, sequencia: 1 },
    ];
    db.secoes = [{ id: 100, titulo: 'Secao X', paiTipo: 'parte', paiId: 20, sequencia: 1 }];
    db.itensColetanea = [];
    db.poemas = [];
    db.prosas = [];
}

describe('chaveDeOrdemDoTexto (aparição principal)', () => {
    beforeEach(montar);

    it('usa a aparição do livro mais antigo, não a do Destino', () => {
        const p = { id: 1, aparicoes: [ap(1, 10, null, 2), ap(2, 20, null, 5)] };
        const k = chaveDeOrdemDoTexto(db, 'poema', p);
        assert.deepEqual(k, { livro: 1, parte: 1, secao: -1, sequencia: 5 });
    });

    it('avulso e texto só em Coletânea ficam com tudo 999', () => {
        db.poemas = [{ id: 2 }];
        db.itensColetanea = [{ id: 7, refTipo: 'poema', refId: 2, parteId: 30, sequencia: 1 }];
        assert.equal(chaveDeOrdemDoTexto(db, 'poema', { id: 9 }).livro, 999);
        assert.equal(chaveDeOrdemDoTexto(db, 'poema', db.poemas[0]).livro, 999);
    });

    it('"só consta" fica no fim do próprio livro', () => {
        const k = chaveDeOrdemDoTexto(db, 'poema', { id: 3, aparicoes: [ap(2, null, null, null)] });
        assert.deepEqual(k, { livro: 1, parte: -1, secao: -1, sequencia: 9999 });
    });
});

describe('sortPoemas e sortProsas pela aparição principal', () => {
    beforeEach(montar);

    it('texto nos dois livros ordena sob o livro mais antigo', () => {
        const emDois = { id: 1, aparicoes: [ap(1, 10, null, 1), ap(2, 20, null, 1)] };
        const soNovo = { id: 2, aparicoes: [ap(1, 10, null, 2)] };
        const soVelho = { id: 3, aparicoes: [ap(2, 20, null, 2)] };
        const avulso = { id: 4, aparicoes: [] };
        const lista = [avulso, soNovo, soVelho, emDois];
        sortPoemas(lista, db.livros, db.partes, db.secoes, db);
        assert.deepEqual(
            lista.map((x) => x.id),
            [2, 1, 3, 4],
        );
    });

    it('sem dbRef, texto só com Destino mantém a ordem Livro, Parte, Seção, posição', () => {
        const a = { id: 1, paiTipo: 'secao', paiId: 100, sequencia: 1 };
        const b = { id: 2, paiTipo: 'parte', paiId: 10, sequencia: 1 };
        const c = { id: 3, paiTipo: 'livro', paiId: 1, sequencia: 1 };
        const lista = [a, b, c];
        sortProsas(lista, db.livros, db.partes, db.secoes);
        assert.deepEqual(
            lista.map((x) => x.id),
            [3, 2, 1],
        );
    });
});

describe('estruturaDoTextoNaTabela', () => {
    beforeEach(montar);

    it('uma aparição: só o lugar, sem extras', () => {
        const r = estruturaDoTextoNaTabela(db, 'poema', { id: 1, aparicoes: [ap(2, 20, 100, 1)] });
        assert.deepEqual(r.lugar, { titulo: 'Secao X', rotulo: 'SEC' });
        assert.equal(r.extras, 0);
    });

    it('duas aparições: lugar da principal e a outra no tooltip', () => {
        const r = estruturaDoTextoNaTabela(db, 'poema', {
            id: 1,
            aparicoes: [ap(1, 10, null, 3), ap(2, 20, null, 4)],
        });
        assert.deepEqual(r.lugar, { titulo: 'Parte Beta', rotulo: 'PART' });
        assert.equal(r.extras, 1);
        assert.match(r.outras[0], /Livro Novo › Parte Alfa/);
    });

    it('só em Coletânea: sem lugar, e a Coletânea aparece no tooltip', () => {
        db.poemas = [{ id: 5 }];
        db.itensColetanea = [{ id: 7, refTipo: 'poema', refId: 5, parteId: 30, sequencia: 2 }];
        const r = estruturaDoTextoNaTabela(db, 'poema', db.poemas[0]);
        assert.equal(r.lugar, null);
        assert.equal(r.extras, 1);
        assert.match(r.outras[0], /\(Coletânea\)/);
    });
});
