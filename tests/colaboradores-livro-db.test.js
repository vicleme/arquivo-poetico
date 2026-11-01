import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Colaboradores com o db real (Fase 19, etapa 6, entrega 1): excluir um
// Colaborador tira ele da equipe dos livros (o livro fica), o aviso conta os
// livros, e o Desfazer devolve tudo. Excluir um Autor desliga os Colaboradores
// ligados a ele, e o Desfazer religa. A lógica pura está em
// colaboradores-livro.test.js.

const { db, deleteItem, importarDB } = await import('../js/db.js');

function montar() {
    [
        'autores',
        'colaboradores',
        'livros',
        'poemas',
        'prosas',
        'pessoas',
        'grupos',
        'epocas',
    ].forEach((c) => {
        db[c].length = 0;
    });
    localStorage.clear();
    document.getElementById('modal-confirmar-exclusao')?.remove();
    document.getElementById('avisos-toast')?.remove();

    db.autores.push({ id: 1, nome: 'Victor Leme', sobre: '' });
    db.colaboradores.push(
        { id: 5, nome: 'Ana Souza', papeisHabituais: ['Capista'], contato: '' },
        { id: 6, nome: 'Bruno Lima', papeisHabituais: [], contato: '', autorId: 1 },
    );
    db.livros.push(
        {
            id: 10,
            titulo: 'Água Viva',
            equipeLivro: [
                { colaboradorId: 6, papeis: [{ papel: 'Diagramador' }] },
                {
                    colaboradorId: 5,
                    papeis: [{ papel: 'Ilustrador', escopo: 'Capa' }, { papel: 'Revisor' }],
                },
            ],
        },
        {
            id: 11,
            titulo: 'Só dela',
            equipeLivro: [{ colaboradorId: 5, papeis: [{ papel: 'Editor' }] }],
        },
        { id: 12, titulo: 'Sem equipe' },
    );
}

describe('excluir Colaborador e a equipe dos livros', () => {
    beforeEach(montar);

    it('o aviso diz em quantos livros ele deixa de constar', () => {
        deleteItem('colaboradores', 5);
        const texto = document.getElementById('modal-confirmar-exclusao').textContent;
        assert.match(texto, /Colaborador/);
        assert.match(texto, /sairá da equipe de 2 livros/);
    });

    it('com um livro só, o aviso fica no singular', () => {
        deleteItem('colaboradores', 6);
        const texto = document.getElementById('modal-confirmar-exclusao').textContent;
        assert.match(texto, /sairá da equipe de 1 livro\b/);
    });

    it('sem livro, o aviso não fala de equipe', () => {
        db.colaboradores.push({ id: 7, nome: 'Sem livro', papeisHabituais: [], contato: '' });
        deleteItem('colaboradores', 7);
        const texto = document.getElementById('modal-confirmar-exclusao').textContent;
        assert.doesNotMatch(texto, /equipe/);
    });

    it('excluir tira do cadastro e dos livros, os livros ficam, e Desfazer devolve tudo', () => {
        const antesLivros = JSON.stringify(db.livros);
        const antesColab = JSON.stringify(db.colaboradores);
        deleteItem('colaboradores', 5);
        document.getElementById('excl-confirmar').click();

        assert.equal(db.colaboradores.length, 1);
        assert.equal(db.livros.length, 3);
        assert.deepEqual(
            db.livros[0].equipeLivro.map((v) => v.colaboradorId),
            [6],
        );
        assert.equal('equipeLivro' in db.livros[1], false);

        document.querySelector('#avisos-toast button').click();
        assert.equal(JSON.stringify(db.livros), antesLivros);
        assert.equal(JSON.stringify([...db.colaboradores].sort((a, b) => a.id - b.id)), antesColab);
    });

    it('excluir um Colaborador que não está em nenhum livro não mexe neles', () => {
        db.colaboradores.push({ id: 7, nome: 'Sem livro', papeisHabituais: [], contato: '' });
        const antes = JSON.stringify(db.livros);
        deleteItem('colaboradores', 7);
        document.getElementById('excl-confirmar').click();
        assert.equal(JSON.stringify(db.livros), antes);
        assert.equal(
            db.colaboradores.some((c) => c.id === 7),
            false,
        );
    });
});

describe('excluir Autor e os Colaboradores ligados a ele', () => {
    beforeEach(montar);

    it('o aviso conta os Colaboradores que perdem o vínculo', () => {
        deleteItem('autores', 1);
        const texto = document.getElementById('modal-confirmar-exclusao').textContent;
        assert.match(texto, /1 Colaborador deixará de estar ligado a ele/);
    });

    it('o Colaborador fica, perde o autorId, e Desfazer religa', () => {
        deleteItem('autores', 1);
        document.getElementById('excl-confirmar').click();
        assert.equal(db.colaboradores.length, 2);
        assert.equal('autorId' in db.colaboradores.find((c) => c.id === 6), false);

        document.querySelector('#avisos-toast button').click();
        assert.equal(db.colaboradores.find((c) => c.id === 6).autorId, 1);
    });
});

describe('Colaboradores no backup', () => {
    beforeEach(montar);

    it('backup antigo, sem a chave, importa como lista vazia', () => {
        const antigo = JSON.parse(JSON.stringify(db));
        delete antigo.colaboradores;
        importarDB(antigo);
        assert.deepEqual(db.colaboradores, []);
    });

    it('backup com Colaboradores e equipes importa tudo como veio', () => {
        const copia = JSON.parse(JSON.stringify(db));
        db.colaboradores.length = 0;
        db.livros.forEach((l) => delete l.equipeLivro);
        importarDB(copia);
        assert.equal(db.colaboradores.length, 2);
        assert.equal(db.livros.find((l) => l.id === 10).equipeLivro.length, 2);
    });
});
