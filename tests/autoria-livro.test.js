import './helpers/dom-real.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const {
    PAPEIS_AUTORIA_LIVRO,
    normalizarPapeis,
    normalizarAutoriaLivro,
    autoriaDoLivro,
    camposAutoriaLivro,
    pendenciasDaAutoria,
    papeisLivresUsados,
    papelEhOutro,
    paresAutoriaLivro,
    textoAutoriaLivro,
    livrosDoAutor,
    livroTemAutor,
    autoresDosLivros,
    textosDaArvore,
    autoresDosTextosDoLivro,
    impactoExclusaoAutorNosLivros,
    removerAutorDosLivros,
    restaurarAutorNosLivros,
} = await import('../js/autoria-livro.js');

const autores = () => [
    { id: 1, nome: 'Victor Leme' },
    { id: 2, nome: 'Ana Souza' },
    { id: 3, nome: 'Bruno Lima' },
];

describe('papéis da autoria do livro', () => {
    it('a lista fechada tem os seis papéis combinados', () => {
        assert.deepEqual(PAPEIS_AUTORIA_LIVRO, [
            'Autor',
            'Coautor',
            'Organizador',
            'Tradutor',
            'Prefaciador',
            'Posfaciador',
        ]);
    });

    it('usa a grafia da lista, ignora caixa e acento e não repete', () => {
        assert.deepEqual(normalizarPapeis(['tradutor', 'AUTOR', 'Tradutor', ' autor ']), [
            'Tradutor',
            'Autor',
        ]);
    });

    it('preserva a ordem dos papéis (pode indicar importância)', () => {
        assert.deepEqual(normalizarPapeis(['Posfaciador', 'Autor', 'Organizador']), [
            'Posfaciador',
            'Autor',
            'Organizador',
        ]);
    });

    it('texto livre fica como foi digitado, com espaços arrumados', () => {
        assert.deepEqual(normalizarPapeis(['  Orelhista   do livro ', 'Autor']), [
            'Orelhista do livro',
            'Autor',
        ]);
    });

    it('o rótulo "Outro" sozinho não é papel; vazio e não texto saem', () => {
        assert.deepEqual(normalizarPapeis(['Outro', '', '   ', null, 5, 'outro']), []);
        assert.deepEqual(normalizarPapeis('Autor'), []);
        assert.deepEqual(normalizarPapeis(undefined), []);
    });

    it('papelEhOutro separa a lista fechada do texto livre', () => {
        assert.equal(papelEhOutro('tradutor'), false);
        assert.equal(papelEhOutro('Orelhista'), true);
    });
});

describe('normalizarAutoriaLivro e campos', () => {
    it('junta o mesmo Autor repetido, somando os papéis sem repetir', () => {
        const r = normalizarAutoriaLivro([
            { autorId: 1, papeis: ['Autor'] },
            { autorId: 2, papeis: ['Tradutor'] },
            { autorId: 1, papeis: ['autor', 'Organizador'] },
        ]);
        assert.deepEqual(r, [
            { autorId: 1, papeis: ['Autor', 'Organizador'] },
            { autorId: 2, papeis: ['Tradutor'] },
        ]);
    });

    it('descarta vínculo sem autorId e mantém o que tem lista de papéis vazia', () => {
        const r = normalizarAutoriaLivro([
            { papeis: ['Autor'] },
            null,
            { autorId: '', papeis: ['Autor'] },
            { autorId: 3 },
        ]);
        assert.deepEqual(r, [{ autorId: 3, papeis: [] }]);
    });

    it('livro antigo (sem o campo) vale lista vazia', () => {
        assert.deepEqual(autoriaDoLivro({ id: 1, titulo: 'x' }), []);
        assert.deepEqual(autoriaDoLivro({ autoriaLivro: 'quebrado' }), []);
        assert.deepEqual(autoriaDoLivro(null), []);
    });

    it('camposAutoriaLivro só devolve a chave quando há vínculo', () => {
        assert.deepEqual(camposAutoriaLivro([]), {});
        assert.deepEqual(camposAutoriaLivro(undefined), {});
        assert.deepEqual(camposAutoriaLivro([{ autorId: 1, papeis: ['autor'] }]), {
            autoriaLivro: [{ autorId: 1, papeis: ['Autor'] }],
        });
    });

    it('pendenciasDaAutoria aponta quem ficou sem papel', () => {
        assert.deepEqual(
            pendenciasDaAutoria([
                { autorId: 1, papeis: ['Autor'] },
                { autorId: 2, papeis: ['Outro', ''] },
            ]),
            { semPapel: [2] },
        );
        assert.deepEqual(pendenciasDaAutoria([{ autorId: 1, papeis: ['Autor'] }]), {
            semPapel: [],
        });
    });

    it('papeisLivresUsados lista só o que não é da lista, sem repetir', () => {
        const livros = [
            { autoriaLivro: [{ autorId: 1, papeis: ['Autor', 'Orelhista'] }] },
            { autoriaLivro: [{ autorId: 2, papeis: ['orelhista', 'Curador'] }] },
            { id: 3 },
        ];
        assert.deepEqual(papeisLivresUsados(livros), ['Curador', 'Orelhista']);
    });
});

describe('leitura da autoria', () => {
    const livro = {
        autoriaLivro: [
            { autorId: 1, papeis: ['Autor', 'Tradutor'] },
            { autorId: 99, papeis: ['Autor'] },
            { autorId: 2, papeis: ['Organizador'] },
        ],
    };

    it('ignora Autor que não está mais no cadastro', () => {
        const pares = paresAutoriaLivro(livro, autores());
        assert.deepEqual(
            pares.map((p) => [p.autor.nome, p.papeis]),
            [
                ['Victor Leme', ['Autor', 'Tradutor']],
                ['Ana Souza', ['Organizador']],
            ],
        );
    });

    it('textoAutoriaLivro: uma linha com nome e papéis', () => {
        assert.equal(
            textoAutoriaLivro(livro, autores()),
            'Victor Leme (Autor, Tradutor); Ana Souza (Organizador)',
        );
        assert.equal(textoAutoriaLivro({}, autores()), '');
    });

    it('livrosDoAutor e livroTemAutor (com e sem papel)', () => {
        const livros = [
            { id: 10, ...livro },
            { id: 11 },
            { id: 12, autoriaLivro: [{ autorId: 2, papeis: ['Autor'] }] },
        ];
        assert.deepEqual(
            livrosDoAutor(livros, 2).map((l) => l.id),
            [10, 12],
        );
        assert.equal(livroTemAutor(livros[0], 2), true);
        assert.equal(livroTemAutor(livros[0], 2, 'organizador'), true);
        assert.equal(livroTemAutor(livros[0], 2, 'Autor'), false);
        assert.equal(livroTemAutor(livros[1], 2), false);
    });

    it('autoresDosLivros: só quem consta em algum livro, em ordem alfabética', () => {
        const livros = [
            {
                autoriaLivro: [
                    { autorId: 1, papeis: ['Autor'] },
                    { autorId: 2, papeis: ['Autor'] },
                ],
            },
        ];
        assert.deepEqual(
            autoresDosLivros(livros, autores()).map((a) => a.nome),
            ['Ana Souza', 'Victor Leme'],
        );
    });
});

describe('autores dos textos do livro (derivado)', () => {
    const dbRef = () => ({
        autores: autores(),
        poemas: [
            { id: 1, autoria: [{ autorId: 1, papel: 'Autor' }] },
            {
                id: 2,
                autoria: [
                    { autorId: 1, papel: 'Autor' },
                    { autorId: 2, papel: 'Coautor' },
                ],
            },
            { id: 3, autoria: [{ autorId: 3, papel: 'Autor' }] },
        ],
        prosas: [{ id: 7, autoria: [{ autorId: 2, papel: 'Autor' }] }],
    });

    it('textosDaArvore junta árvore, itens de coletânea e vinculados, sem repetir', () => {
        const arvore = {
            arvore: [
                { tipo: 'parte', dados: { id: 1 }, filhos: [{ tipo: 'poema', dados: { id: 1 } }] },
                { tipo: 'item', dados: { refTipo: 'prosa', refId: 7 } },
                { tipo: 'item', dados: { refTipo: '', refId: null } },
                { tipo: 'elemento', dados: { id: 5 } },
            ],
            vinculados: [
                { tipo: 'poema', dados: { id: 1 } },
                { tipo: 'poema', dados: { id: 2 } },
            ],
        };
        assert.deepEqual(textosDaArvore(arvore), [
            { tipo: 'poema', id: 1 },
            { tipo: 'prosa', id: 7 },
            { tipo: 'poema', id: 2 },
        ]);
    });

    it('conta quantos textos do livro cada Autor assina, do maior para o menor, e desempata por nome', () => {
        const arvore = {
            arvore: [
                { tipo: 'poema', dados: { id: 1 } },
                { tipo: 'poema', dados: { id: 2 } },
                { tipo: 'prosa', dados: { id: 7 } },
            ],
            vinculados: [],
        };
        const r = autoresDosTextosDoLivro(dbRef(), arvore);
        assert.deepEqual(
            r.map((x) => [x.autor.nome, x.textos]),
            [
                ['Ana Souza', 2],
                ['Victor Leme', 2],
            ],
        );
    });

    it('quem assina mais textos vem primeiro', () => {
        const arvore = {
            arvore: [
                { tipo: 'poema', dados: { id: 1 } },
                { tipo: 'poema', dados: { id: 2 } },
                { tipo: 'poema', dados: { id: 3 } },
            ],
            vinculados: [],
        };
        const r = autoresDosTextosDoLivro(dbRef(), arvore);
        assert.deepEqual(
            r.map((x) => [x.autor.nome, x.textos]),
            [
                ['Victor Leme', 2],
                ['Ana Souza', 1],
                ['Bruno Lima', 1],
            ],
        );
    });

    it('livro sem textos devolve lista vazia', () => {
        assert.deepEqual(autoresDosTextosDoLivro(dbRef(), { arvore: [], vinculados: [] }), []);
        assert.deepEqual(autoresDosTextosDoLivro(dbRef(), undefined), []);
    });
});

describe('exclusão de Autor e Desfazer', () => {
    const mundo = () => ({
        livros: [
            {
                id: 10,
                autoriaLivro: [
                    { autorId: 2, papeis: ['Organizador'] },
                    { autorId: 1, papeis: ['Autor'] },
                    { autorId: 3, papeis: ['Autor'] },
                ],
            },
            { id: 11, autoriaLivro: [{ autorId: 1, papeis: ['Autor'] }] },
            { id: 12 },
        ],
    });

    it('impacto conta os livros do Autor', () => {
        assert.deepEqual(impactoExclusaoAutorNosLivros(mundo(), 1), { livrosIds: [10, 11] });
        assert.deepEqual(impactoExclusaoAutorNosLivros(mundo(), 9), { livrosIds: [] });
    });

    it('remover tira o Autor e apaga a chave do livro que ficou sem ninguém', () => {
        const db = mundo();
        const removidos = removerAutorDosLivros(db, 1);
        assert.equal(removidos.length, 2);
        assert.deepEqual(
            db.livros[0].autoriaLivro.map((v) => v.autorId),
            [2, 3],
        );
        assert.equal('autoriaLivro' in db.livros[1], false);
    });

    it('desfazer devolve cada entrada, com papéis e na posição de antes', () => {
        const db = mundo();
        const antes = JSON.stringify(db);
        const removidos = removerAutorDosLivros(db, 1);
        restaurarAutorNosLivros(db, removidos);
        assert.equal(JSON.stringify(db), antes);
    });

    it('desfazer com livro que sumiu não quebra e não duplica', () => {
        const db = mundo();
        const removidos = removerAutorDosLivros(db, 1);
        db.livros = db.livros.filter((l) => l.id !== 11);
        restaurarAutorNosLivros(db, removidos);
        restaurarAutorNosLivros(db, removidos);
        assert.deepEqual(
            db.livros[0].autoriaLivro.map((v) => v.autorId),
            [2, 1, 3],
        );
    });
});
