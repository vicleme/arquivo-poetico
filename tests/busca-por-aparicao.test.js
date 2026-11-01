import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { db } from '../js/db.js';
import {
    camposDeBuscaDasAparicoes,
    textoEhAvulso,
    textoApareceNoLivro,
} from '../js/aparicoes-do-texto.js';
import { decorarCamposBusca } from '../js/render-listas.js';
import { filtrarTextos } from '../js/utils.js';
import { correspondeFiltro } from '../js/exportar.js';

// Fase 21, etapa 21-4a: `livro:`, `parte:`, `secao:` e `coletanea:` olham todas as
// aparições do texto; o filtro de livro (aba e exportação) e o Avulso também.

const ap = (livroId, parteId, secaoId, sequencia) => ({ livroId, parteId, secaoId, sequencia });

function montar() {
    db.livros = [
        { id: 1, titulo: 'Livro Um', tipo: 'Livro' },
        { id: 2, titulo: 'Livro Dois', tipo: 'Livro' },
        { id: 3, titulo: 'Antologia Tres', tipo: 'Coletânea' },
    ];
    db.partes = [
        { id: 10, titulo: 'Parte Alfa', livroId: 1 },
        { id: 30, titulo: 'Parte Beta', livroId: 2 },
        { id: 40, titulo: 'Parte Gama', livroId: 3 },
    ];
    db.secoes = [{ id: 50, titulo: 'Secao Delta', paiTipo: 'livro', paiId: 2 }];
    db.itensColetanea = [{ id: 7, parteId: 40, refTipo: 'poema', refId: 1, sequencia: 1 }];
    db.poemas = [
        {
            id: 1,
            titulo: 'Em dois livros e uma coletânea',
            paiTipo: 'parte',
            paiId: 10,
            sequencia: 1,
            livrosIds: [2],
            aparicoes: [ap(1, 10, null, 1), ap(2, null, 50, 3)],
        },
        {
            id: 2,
            titulo: 'So consta',
            paiTipo: null,
            paiId: null,
            sequencia: null,
            livrosIds: [1],
            aparicoes: [ap(1, null, null, null)],
        },
        { id: 3, titulo: 'Solto', paiTipo: null, paiId: null, livrosIds: [], aparicoes: [] },
    ];
    db.prosas = [];
}

describe('Busca e filtros por aparição (21-4a)', () => {
    beforeEach(montar);

    it('campos de busca juntam livros, partes, seções e coletâneas de todas as aparições', () => {
        const c = camposDeBuscaDasAparicoes(db, 'poema', db.poemas[0]);
        assert.equal(c.livro, 'Livro Um Livro Dois Antologia Tres');
        assert.equal(c.parte, 'Parte Alfa Parte Gama');
        assert.equal(c.secao, 'Secao Delta');
        assert.equal(c.coletanea, 'Antologia Tres');
    });

    it('sem tipo, a coletânea fica de fora', () => {
        const c = camposDeBuscaDasAparicoes(db, undefined, db.poemas[0]);
        assert.equal(c.coletanea, '');
        assert.equal(c.livro, 'Livro Um Livro Dois');
    });

    it('prefixos achem pela segunda aparição e pela coletânea', () => {
        const lista = db.poemas.map((p) => decorarCamposBusca(p, '', 'poema'));
        const titulos = (q) => filtrarTextos(lista, q).map((p) => p.titulo);
        assert.deepEqual(titulos('secao:Delta'), ['Em dois livros e uma coletânea']);
        assert.deepEqual(titulos('parte:Beta'), []);
        assert.deepEqual(titulos('parte:Gama'), ['Em dois livros e uma coletânea']);
        assert.deepEqual(titulos('coletanea:Antologia'), ['Em dois livros e uma coletânea']);
        assert.deepEqual(titulos('livro:Antologia'), ['Em dois livros e uma coletânea']);
        assert.deepEqual(titulos('livro:"Livro Um"').sort(), [
            'Em dois livros e uma coletânea',
            'So consta',
        ]);
    });

    it('avulso é quem não aparece em nenhum livro comum (só consta não é avulso)', () => {
        assert.equal(textoEhAvulso(db, 'poema', db.poemas[0]), false);
        assert.equal(textoEhAvulso(db, 'poema', db.poemas[1]), false);
        assert.equal(textoEhAvulso(db, 'poema', db.poemas[2]), true);
    });

    it('textoApareceNoLivro acha a coletânea e a segunda aparição', () => {
        assert.equal(textoApareceNoLivro(db, 'poema', db.poemas[0], 3), true);
        assert.equal(textoApareceNoLivro(db, 'poema', db.poemas[0], 2), true);
        assert.equal(textoApareceNoLivro(db, 'poema', db.poemas[2], 1), false);
    });

    it('filtro de livro da exportação vale para qualquer aparição', () => {
        const base = {
            livrosIncluir: [],
            pessoasIncluir: [],
            temasIncluir: [],
            temasExcluir: [],
            dataDe: '',
            dataAte: '',
            status: 'todos',
        };
        const so2 = { ...base, livrosIncluir: ['2'] };
        assert.equal(correspondeFiltro(db.poemas[0], so2, 'poema'), true);
        assert.equal(correspondeFiltro(db.poemas[1], so2, 'poema'), false);
        assert.equal(
            correspondeFiltro(db.poemas[0], { ...base, livrosIncluir: ['3'] }, 'poema'),
            true,
        );
    });
});
