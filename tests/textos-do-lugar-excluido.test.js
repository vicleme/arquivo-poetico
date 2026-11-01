import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// T7 (F21-D10): excluir um Livro tira só as aparições dos textos naquele livro
// (o texto que só estava nele fica avulso), nunca exclui o texto, e o Desfazer
// devolve tudo. Para Parte e Seção, a aparição sobe um nível desde a Fase 21
// (tests/subir-nivel-ao-excluir.test.js e tests/exclusao-por-aparicao.test.js).

const { db, deleteItem } = await import('../js/db.js');
const {
    impactoExclusaoNosTextos,
    avisoDeImpactoNosTextos,
    desvincularTextosDoLugar,
    restaurarTextosDoLugar,
} = await import('../js/textos-do-lugar-excluido.js');
const { getListaVisivelPoemas, setFiltroLivroPoemas } = await import('../js/render-listas.js');

function montar() {
    ['livros', 'partes', 'secoes', 'elementos', 'poemas', 'prosas', 'pessoas'].forEach((c) => {
        db[c].length = 0;
    });
    localStorage.clear();
    document.getElementById('modal-confirmar-exclusao')?.remove();
    document.getElementById('avisos-toast')?.remove();

    db.livros.push(
        { id: 1, titulo: 'Livro Um', tipo: 'Inéditos', sequencia: 1 },
        { id: 2, titulo: 'Livro Dois', tipo: 'Inéditos', sequencia: 2 },
        { id: 5, titulo: 'Livro Cinco', tipo: 'Inéditos', sequencia: 3 },
        { id: 7, titulo: 'Livro Sete', tipo: 'Inéditos', sequencia: 4 },
    );
    db.partes.push({ id: 10, livroId: 1, titulo: 'Parte A', sequencia: 1 });
    db.secoes.push({ id: 20, paiTipo: 'parte', paiId: 10, titulo: 'Seção X', sequencia: 1 });
    db.poemas.push(
        { id: 100, titulo: 'Na parte', texto: 'a', paiTipo: 'parte', paiId: 10, sequencia: 2 },
        { id: 101, titulo: 'Na seção', texto: 'b', paiTipo: 'secao', paiId: 20, sequencia: 1 },
        { id: 102, titulo: 'No livro', texto: 'c', paiTipo: 'livro', paiId: 1, sequencia: 3 },
        {
            id: 103,
            titulo: 'Só vinculado',
            texto: 'd',
            paiTipo: null,
            paiId: null,
            livrosIds: [5, 2, 7],
        },
        { id: 104, titulo: 'Outro livro', texto: 'e', paiTipo: 'livro', paiId: 2, sequencia: 1 },
    );
    db.prosas.push({
        id: 200,
        titulo: 'Prosa na parte',
        texto: 'f',
        paiTipo: 'parte',
        paiId: 10,
        sequencia: 5,
    });
}

const poema = (id) => db.poemas.find((p) => p.id === id);
const prosa = (id) => db.prosas.find((p) => p.id === id);
const confirmar = () => document.getElementById('excl-confirmar').click();
const desfazer = () => document.querySelector('#avisos-toast button').click();

describe('lógica pura', () => {
    beforeEach(montar);

    it('conta o impacto do Livro: textos que perdem a aparição e os que ficam avulsos', () => {
        // 104 só estava no Livro 2; 103 também está nos Livros 5 e 7.
        assert.deepEqual(impactoExclusaoNosTextos(db, 'livros', 2), { textos: 2, avulsos: 1 });
    });

    it('o texto em Seção do Livro também perde a aparição', () => {
        assert.deepEqual(impactoExclusaoNosTextos(db, 'livros', 1), { textos: 4, avulsos: 4 });
    });

    it('Parte e Seção não usam este aviso (a aparição sobe)', () => {
        assert.equal(impactoExclusaoNosTextos(db, 'partes', 10).textos, 0);
        assert.equal(impactoExclusaoNosTextos(db, 'secoes', 20).textos, 0);
    });

    it('outras coleções e itens sem texto não têm impacto', () => {
        assert.equal(impactoExclusaoNosTextos(db, 'pessoas', 1).textos, 0);
        assert.equal(impactoExclusaoNosTextos(db, 'livros', 999).textos, 0);
        assert.equal(avisoDeImpactoNosTextos({ textos: 0, avulsos: 0 }), '');
    });

    it('o aviso fala no singular e no plural', () => {
        assert.equal(
            avisoDeImpactoNosTextos({ textos: 1, avulsos: 0 }),
            '1 texto perderá a aparição neste livro',
        );
        assert.equal(
            avisoDeImpactoNosTextos({ textos: 1, avulsos: 1 }),
            '1 texto perderá a aparição neste livro (1 ficará avulso)',
        );
        assert.equal(
            avisoDeImpactoNosTextos({ textos: 3, avulsos: 2 }),
            '3 textos perderão a aparição neste livro (2 ficarão avulsos)',
        );
    });

    it('desvincula e restaura, devolvendo o espelho e o índice em livrosIds', () => {
        const i2 = db.livros.findIndex((l) => l.id === 2);
        const livro = db.livros.splice(i2, 1)[0];
        const guardado = desvincularTextosDoLugar(db, 'livros', 2, livro);
        assert.equal(poema(104).paiTipo, null);
        assert.deepEqual(poema(104).aparicoes, []);
        assert.deepEqual(poema(103).livrosIds, [5, 7]);
        assert.deepEqual(
            poema(103).aparicoes.map((a) => a.livroId),
            [5, 7],
        );
        db.livros.splice(i2, 0, livro);
        restaurarTextosDoLugar(db, guardado);
        assert.deepEqual(poema(103).livrosIds, [5, 2, 7]);
        assert.equal(poema(104).paiTipo, 'livro');
        assert.equal(poema(104).paiId, 2);
        assert.equal(poema(104).sequencia, 1);
        // Os textos não tinham a lista antes: o Desfazer não deixa uma de resto.
        assert.equal('aparicoes' in poema(104), false);
    });

    it('com a lista, o Desfazer devolve a lista exata, na mesma ordem', () => {
        poema(103).aparicoes = [
            { livroId: 5, parteId: null, secaoId: null, sequencia: null },
            { livroId: 2, parteId: null, secaoId: null, sequencia: null },
            { livroId: 7, parteId: null, secaoId: null, sequencia: null },
        ];
        const i2 = db.livros.findIndex((l) => l.id === 2);
        const livro = db.livros.splice(i2, 1)[0];
        const guardado = desvincularTextosDoLugar(db, 'livros', 2, livro);
        assert.deepEqual(
            poema(103).aparicoes.map((a) => a.livroId),
            [5, 7],
        );
        db.livros.splice(i2, 0, livro);
        restaurarTextosDoLugar(db, guardado);
        assert.deepEqual(
            poema(103).aparicoes.map((a) => a.livroId),
            [5, 2, 7],
        );
        assert.deepEqual(poema(103).livrosIds, [5, 2, 7]);
    });
});

describe('excluir Livro com o db real', () => {
    beforeEach(montar);

    it('o filtro de avulsos lista o texto que perdeu o lugar ao excluir o Livro', () => {
        deleteItem('livros', 2);
        confirmar();
        setFiltroLivroPoemas('__avulsos__');
        const ids = getListaVisivelPoemas().map((p) => p.id);
        setFiltroLivroPoemas('');
        assert.ok(ids.includes(104));
        // 103 segue constando nos Livros 5 e 7 (sem posição): desde a 21-4a isso
        // não é avulso.
        assert.ok(!ids.includes(103));
    });

    it('Livro: a aparição sai, o texto só desse livro fica avulso e o livro sai de livrosIds', () => {
        deleteItem('livros', 2);
        const texto = document.getElementById('modal-confirmar-exclusao').textContent;
        assert.match(texto, /2 textos perderão a aparição neste livro \(1 ficará avulso\)/);
        confirmar();
        assert.equal(poema(104).paiTipo, null);
        assert.deepEqual(poema(103).livrosIds, [5, 7]);
        assert.equal(poema(102).paiId, 1); // do outro livro, intacto
    });

    it('Desfazer devolve Destino, posição e livrosIds', () => {
        deleteItem('livros', 2);
        confirmar();
        desfazer();
        assert.equal(poema(104).paiTipo, 'livro');
        assert.equal(poema(104).paiId, 2);
        assert.equal(poema(104).sequencia, 1);
        assert.deepEqual(poema(103).livrosIds, [5, 2, 7]);
        assert.ok(db.livros.some((l) => l.id === 2));
    });

    it('Parte e Seção sem conteúdo: o aviso não fala em textos', () => {
        db.partes.push({ id: 11, livroId: 1, titulo: 'Vazia', sequencia: 2 });
        deleteItem('partes', 11);
        const texto = document.getElementById('modal-confirmar-exclusao').textContent;
        assert.doesNotMatch(texto, /subir/);
    });

    it('texto excluído não mexe nos outros (o mecanismo só vale para Livro, Parte e Seção)', () => {
        deleteItem('poemas', 100);
        confirmar();
        assert.equal(poema(101).paiTipo, 'secao');
        assert.equal(prosa(200).paiTipo, 'parte');
    });
});
