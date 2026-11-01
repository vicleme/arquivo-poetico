import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Fase 21, entrega 4: excluir Parte ou Seção faz o conteúdo subir um nível
// (Seção em Parte vai para a Parte, Seção no Livro e Parte vão para o Livro),
// para o fim da fila do novo pai, e o Desfazer devolve tudo.

const { db, deleteItem, deleteItemsEmMassa } = await import('../js/db.js');
const { getIrmaosPorEscopo } = await import('../js/utils.js');
const { avisoDeSubida, impactoSubidaDoLugar, novoPaiDoLugar } =
    await import('../js/subir-nivel-ao-excluir.js');

const COLECOES = ['livros', 'partes', 'secoes', 'elementos', 'poemas', 'prosas', 'pessoas'];

// Livro 1
//   Parte 10 (1)        Parte 11 (2)        Poema 105 direto no Livro (3)
//   Fila da Parte 10: Poema 100 (1), Seção 20 (2), Elemento 300 (3), Poema 101 (4)
//   Dentro da Seção 20: Poema 102 (1), Elemento 301 (2), Prosa 201 (3), Poema 103 (sem posição)
//   Seção 21 direto no Livro (4), com o Poema 106 (1) e a Prosa 202 (2)
function montar() {
    COLECOES.forEach((c) => {
        db[c].length = 0;
    });
    localStorage.clear();
    document.getElementById('modal-confirmar-exclusao')?.remove();
    document.getElementById('avisos-toast')?.remove();

    db.livros.push({ id: 1, titulo: 'Livro Um', tipo: 'Inéditos', sequencia: 1 });
    db.partes.push(
        { id: 10, livroId: 1, titulo: 'Parte A', sequencia: 1 },
        { id: 11, livroId: 1, titulo: 'Parte B', sequencia: 2 },
    );
    db.secoes.push(
        { id: 20, paiTipo: 'parte', paiId: 10, titulo: 'Seção X', sequencia: 2 },
        { id: 21, paiTipo: 'livro', paiId: 1, titulo: 'Seção Y', sequencia: 4 },
    );
    db.elementos.push(
        { id: 300, tipo: 'Epígrafe', paiTipo: 'parte', paiId: 10, sequencia: 3 },
        { id: 301, tipo: 'Epígrafe', paiTipo: 'secao', paiId: 20, sequencia: 2 },
    );
    const poema = (id, paiTipo, paiId, sequencia) => ({
        id,
        titulo: `Poema ${id}`,
        texto: 'x',
        paiTipo,
        paiId,
        sequencia,
    });
    db.poemas.push(
        poema(100, 'parte', 10, 1),
        poema(101, 'parte', 10, 4),
        poema(102, 'secao', 20, 1),
        poema(103, 'secao', 20, null),
        poema(105, 'livro', 1, 3),
        poema(106, 'secao', 21, 1),
    );
    db.prosas.push(
        { id: 201, titulo: 'Prosa 201', texto: 'y', paiTipo: 'secao', paiId: 20, sequencia: 3 },
        { id: 202, titulo: 'Prosa 202', texto: 'y', paiTipo: 'secao', paiId: 21, sequencia: 2 },
    );
}

const achar = (col, id) => db[col].find((x) => x.id === id);
const lugar = (col, id) => {
    const x = achar(col, id);
    return [x.paiTipo, x.paiId, x.sequencia];
};
// Posições (só as numeradas) da fila de um lugar, em ordem.
const posicoes = (paiTipo, paiId) =>
    getIrmaosPorEscopo(db, paiTipo, paiId)
        .map((x) => x.sequencia)
        .filter((n) => n !== null)
        .sort((a, b) => a - b);
const confirmar = () => document.getElementById('excl-confirmar').click();
const desfazer = () => document.querySelector('#avisos-toast button').click();
const textoDoModal = () => document.getElementById('modal-confirmar-exclusao').textContent;

describe('lógica pura', () => {
    beforeEach(montar);

    it('o novo pai da Seção é a Parte, ou o Livro quando ela está direto nele', () => {
        assert.deepEqual(novoPaiDoLugar(db, 'secoes', achar('secoes', 20)), {
            paiTipo: 'parte',
            paiId: 10,
            rotulo: 'a Parte “Parte A”',
        });
        assert.equal(novoPaiDoLugar(db, 'secoes', achar('secoes', 21)).paiTipo, 'livro');
    });

    it('o novo pai da Parte é o Livro dela; sem Livro que exista, não há pai', () => {
        assert.deepEqual(novoPaiDoLugar(db, 'partes', achar('partes', 10)), {
            paiTipo: 'livro',
            paiId: 1,
            rotulo: 'o Livro “Livro Um”',
        });
        assert.equal(novoPaiDoLugar(db, 'partes', { id: 99, livroId: 77 }), null);
        assert.equal(novoPaiDoLugar(db, 'secoes', { id: 99, paiTipo: 'parte', paiId: 77 }), null);
        assert.equal(novoPaiDoLugar(db, 'livros', achar('livros', 1)), null);
    });

    it('conta textos, seções e elementos do que sobe', () => {
        const impacto = impactoSubidaDoLugar(db, 'secoes', 20);
        assert.deepEqual(
            [impacto.textos, impacto.secoes, impacto.elementos, impacto.total],
            [3, 0, 1, 4],
        );
        const daParte = impactoSubidaDoLugar(db, 'partes', 10);
        assert.deepEqual(
            [daParte.textos, daParte.secoes, daParte.elementos, daParte.total],
            [2, 1, 1, 4],
        );
    });

    it('o aviso fala no singular, no plural e no destino', () => {
        const destino = { rotulo: 'a Parte “A”' };
        assert.equal(
            avisoDeSubida({ textos: 1, secoes: 0, elementos: 0, total: 1, destino }),
            '1 texto subirá para a Parte “A”',
        );
        assert.equal(
            avisoDeSubida({ textos: 2, secoes: 1, elementos: 1, total: 4, destino }),
            '2 textos, 1 seção e 1 elemento subirão para a Parte “A”',
        );
        assert.equal(
            avisoDeSubida({ textos: 2, secoes: 0, elementos: 0, total: 2, destino: null }),
            '2 textos ficarão sem lugar',
        );
        assert.equal(avisoDeSubida({ textos: 0, secoes: 0, elementos: 0, total: 0 }), '');
    });
});

describe('excluir Seção', () => {
    beforeEach(montar);

    it('o aviso diz para onde o conteúdo sobe', () => {
        deleteItem('secoes', 20);
        assert.match(textoDoModal(), /3 textos e 1 elemento subirão para a Parte “Parte A”/);
    });

    it('Seção dentro de Parte: o conteúdo vai para o fim da Parte, na ordem que tinha', () => {
        deleteItem('secoes', 20);
        confirmar();
        assert.equal(db.secoes.length, 1);
        assert.equal(db.poemas.length, 6);
        assert.equal(db.prosas.length, 2);
        // Fila da Parte antes: P100 1, Seção 2, E300 3, P101 4. Depois de sair a
        // Seção, o buraco fecha e o conteúdo dela entra no fim.
        assert.deepEqual(lugar('poemas', 100), ['parte', 10, 1]);
        assert.deepEqual(lugar('elementos', 300), ['parte', 10, 2]);
        assert.deepEqual(lugar('poemas', 101), ['parte', 10, 3]);
        assert.deepEqual(lugar('poemas', 102), ['parte', 10, 4]);
        assert.deepEqual(lugar('elementos', 301), ['parte', 10, 5]);
        assert.deepEqual(lugar('prosas', 201), ['parte', 10, 6]);
        assert.deepEqual(posicoes('parte', 10), [1, 2, 3, 4, 5, 6]);
    });

    it('quem estava sem posição continua sem posição, mas sobe', () => {
        deleteItem('secoes', 20);
        confirmar();
        assert.deepEqual(lugar('poemas', 103), ['parte', 10, null]);
    });

    it('Seção ligada direto ao Livro: o conteúdo vai para o Livro, atrás das Partes', () => {
        deleteItem('secoes', 21);
        const aviso = textoDoModal();
        assert.match(aviso, /subirão para o Livro “Livro Um”/);
        confirmar();
        // Fila do Livro: Parte 1, Parte 2, P105 3, (Seção 4 sai). Conteúdo entra em 4 e 5.
        assert.deepEqual(lugar('poemas', 106), ['livro', 1, 4]);
        assert.deepEqual(lugar('prosas', 202), ['livro', 1, 5]);
        assert.deepEqual(posicoes('livro', 1), [1, 2, 3, 4, 5]);
    });

    it('Seção que era a última da fila: ninguém cai na mesma posição', () => {
        // A Seção Y está na posição 4, a maior do Livro: o conteúdo precisa
        // entrar depois dela, e o buraco dela fechar sem colisão.
        deleteItem('secoes', 21);
        confirmar();
        const seqs = posicoes('livro', 1);
        assert.equal(new Set(seqs).size, seqs.length);
    });

    it('Desfazer devolve o conteúdo, as posições e a Seção', () => {
        deleteItem('secoes', 20);
        confirmar();
        desfazer();
        assert.ok(achar('secoes', 20));
        assert.deepEqual(lugar('poemas', 102), ['secao', 20, 1]);
        assert.deepEqual(lugar('elementos', 301), ['secao', 20, 2]);
        assert.deepEqual(lugar('prosas', 201), ['secao', 20, 3]);
        assert.deepEqual(lugar('poemas', 103), ['secao', 20, null]);
        assert.deepEqual(lugar('poemas', 100), ['parte', 10, 1]);
        assert.deepEqual(lugar('secoes', 20), ['parte', 10, 2]);
        assert.deepEqual(lugar('elementos', 300), ['parte', 10, 3]);
        assert.deepEqual(lugar('poemas', 101), ['parte', 10, 4]);
    });

    it('Seção sem pai que exista: o conteúdo fica avulso', () => {
        db.secoes.push({ id: 22, paiTipo: 'parte', paiId: 999, titulo: 'Órfã', sequencia: 1 });
        db.poemas.push({
            id: 107,
            titulo: 'Poema 107',
            texto: 'x',
            paiTipo: 'secao',
            paiId: 22,
            sequencia: 1,
        });
        deleteItem('secoes', 22);
        assert.match(textoDoModal(), /ficará sem lugar/);
        confirmar();
        assert.deepEqual(lugar('poemas', 107), [null, null, null]);
        desfazer();
        assert.deepEqual(lugar('poemas', 107), ['secao', 22, 1]);
    });

    it('prosa antiga ligada à Seção só por secaoId também sobe, e o Desfazer devolve', () => {
        db.prosas.push({
            id: 203,
            titulo: 'Prosa antiga',
            texto: 'z',
            secaoId: 20,
            paiTipo: null,
            paiId: null,
            sequencia: null,
        });
        deleteItem('secoes', 20);
        confirmar();
        assert.deepEqual(lugar('prosas', 203), ['parte', 10, null]);
        assert.equal(achar('prosas', 203).secaoId, null);
        desfazer();
        assert.equal(achar('prosas', 203).secaoId, 20);
        assert.deepEqual(lugar('prosas', 203), [null, null, null]);
    });
});

describe('excluir Parte', () => {
    beforeEach(montar);

    it('o aviso conta textos, seções e elementos e diz o Livro', () => {
        deleteItem('partes', 10);
        assert.match(
            textoDoModal(),
            /2 textos, 1 seção e 1 elemento subirão para o Livro “Livro Um”/,
        );
    });

    it('Seções, Elementos e textos da Parte vão para o fim do Livro', () => {
        deleteItem('partes', 10);
        confirmar();
        assert.equal(db.partes.length, 1);
        // Fila do Livro antes: Parte A 1, Parte B 2, P105 3, Seção Y 4. A Parte A
        // sai (buraco no 1), e o conteúdo dela entra depois da Seção Y.
        assert.deepEqual(lugar('partes', 11), [undefined, undefined, 1]);
        assert.deepEqual(lugar('poemas', 105), ['livro', 1, 2]);
        assert.deepEqual(lugar('secoes', 21), ['livro', 1, 3]);
        assert.deepEqual(lugar('poemas', 100), ['livro', 1, 4]);
        assert.deepEqual(lugar('secoes', 20), ['livro', 1, 5]);
        assert.deepEqual(lugar('elementos', 300), ['livro', 1, 6]);
        assert.deepEqual(lugar('poemas', 101), ['livro', 1, 7]);
        assert.deepEqual(posicoes('livro', 1), [1, 2, 3, 4, 5, 6, 7]);
    });

    it('o que estava dentro da Seção que subiu continua na Seção', () => {
        deleteItem('partes', 10);
        confirmar();
        assert.deepEqual(lugar('poemas', 102), ['secao', 20, 1]);
        assert.deepEqual(lugar('prosas', 201), ['secao', 20, 3]);
    });

    it('Desfazer devolve tudo ao lugar e à posição de antes', () => {
        deleteItem('partes', 10);
        confirmar();
        desfazer();
        assert.ok(achar('partes', 10));
        assert.deepEqual(lugar('poemas', 100), ['parte', 10, 1]);
        assert.deepEqual(lugar('secoes', 20), ['parte', 10, 2]);
        assert.deepEqual(lugar('elementos', 300), ['parte', 10, 3]);
        assert.deepEqual(lugar('poemas', 101), ['parte', 10, 4]);
        assert.equal(achar('partes', 10).sequencia, 1);
        assert.equal(achar('partes', 11).sequencia, 2);
        assert.deepEqual(lugar('poemas', 105), ['livro', 1, 3]);
        assert.deepEqual(lugar('secoes', 21), ['livro', 1, 4]);
    });

    it('Parte vazia: o aviso não fala em subir', () => {
        deleteItem('partes', 11);
        assert.doesNotMatch(textoDoModal(), /subir/);
    });
});

describe('exclusão em massa e Livro', () => {
    beforeEach(montar);

    it('Seção e depois a Parte dela: o conteúdo sobe duas vezes, e o Desfazer pendente é só o da Parte', () => {
        deleteItemsEmMassa('secoes', [20]);
        deleteItemsEmMassa('partes', [10]);
        assert.deepEqual(lugar('poemas', 102)[0], 'livro');
        desfazer();
        // o Desfazer pendente é só o da Parte; a Seção segue excluída
        assert.deepEqual(lugar('poemas', 102)[0], 'parte');
        assert.equal(achar('secoes', 20), undefined);
    });

    it('duas Partes de uma vez: Desfazer devolve as duas', () => {
        db.poemas.push({
            id: 110,
            titulo: 'Na B',
            texto: 'g',
            paiTipo: 'parte',
            paiId: 11,
            sequencia: 1,
        });
        deleteItemsEmMassa('partes', [10, 11]);
        assert.equal(lugar('poemas', 100)[0], 'livro');
        assert.equal(lugar('poemas', 110)[0], 'livro');
        desfazer();
        assert.deepEqual(lugar('poemas', 100), ['parte', 10, 1]);
        assert.deepEqual(lugar('poemas', 110), ['parte', 11, 1]);
        assert.deepEqual(posicoes('livro', 1), [1, 2, 3, 4]);
    });

    it('Livro continua deixando os textos avulsos (não há nível acima)', () => {
        db.poemas.push({
            id: 111,
            titulo: 'No Livro',
            texto: 'h',
            paiTipo: 'livro',
            paiId: 1,
            sequencia: 9,
        });
        deleteItem('livros', 1);
        assert.match(textoDoModal(), /ficarão avulsos/);
        confirmar();
        assert.deepEqual(lugar('poemas', 111), [null, null, null]);
    });
});
