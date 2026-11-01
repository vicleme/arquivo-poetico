import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Autoria do livro com o db real (Fase 19, etapa 4): excluir um Autor tira ele
// da autoria dos livros (o livro fica), o aviso conta os livros, e o Desfazer
// devolve a entrada com os papéis e na mesma posição. A lógica pura está em
// autoria-livro.test.js.

const { db, deleteItem } = await import('../js/db.js');

function montar() {
    ['autores', 'livros', 'poemas', 'prosas', 'pessoas', 'grupos', 'epocas'].forEach((c) => {
        db[c].length = 0;
    });
    localStorage.clear();
    document.getElementById('modal-confirmar-exclusao')?.remove();
    document.getElementById('avisos-toast')?.remove();

    db.autores.push(
        { id: 1, nome: 'Victor Leme', sobre: '' },
        { id: 2, nome: 'Ana Souza', sobre: '' },
    );
    db.livros.push(
        {
            id: 10,
            titulo: 'Água Viva',
            autoriaLivro: [
                { autorId: 2, papeis: ['Organizador'] },
                { autorId: 1, papeis: ['Autor', 'Tradutor'] },
            ],
        },
        { id: 11, titulo: 'Só dele', autoriaLivro: [{ autorId: 1, papeis: ['Autor'] }] },
        { id: 12, titulo: 'Sem autoria' },
    );
}

describe('excluir Autor e a autoria dos livros', () => {
    beforeEach(montar);

    it('o aviso diz em quantos livros o Autor deixa de constar', () => {
        deleteItem('autores', 1);
        const texto = document.getElementById('modal-confirmar-exclusao').textContent;
        assert.match(texto, /sairá da autoria de 2 livros/);
    });

    it('excluir tira o Autor da autoria, o livro fica, e Desfazer devolve tudo', () => {
        const antes = JSON.stringify(db.livros);
        deleteItem('autores', 1);
        document.getElementById('excl-confirmar').click();

        assert.equal(db.livros.length, 3);
        assert.deepEqual(
            db.livros[0].autoriaLivro.map((v) => v.autorId),
            [2],
        );
        assert.equal('autoriaLivro' in db.livros[1], false);

        document.querySelector('#avisos-toast button').click();
        assert.equal(JSON.stringify(db.livros), antes);
    });

    it('excluir um Autor que não está em nenhum livro não mexe neles', () => {
        db.autores.push({ id: 3, nome: 'Sem livro', sobre: '' });
        const antes = JSON.stringify(db.livros);
        deleteItem('autores', 3);
        document.getElementById('excl-confirmar').click();
        assert.equal(JSON.stringify(db.livros), antes);
    });
});
