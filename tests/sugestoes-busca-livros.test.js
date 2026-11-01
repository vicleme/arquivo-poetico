import './helpers/localstorage-shim.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { sugerirBuscaLivros, aplicarSugestaoBuscaLivros } =
    await import('../js/sugestoes-busca-livros.js');

const AUTORES = [
    { id: 1, nome: 'Maria Silva' },
    { id: 2, nome: 'João Pereira' },
    { id: 3, nome: 'Marcos Lima' },
    { id: 4, nome: 'Sem Livro' },
];
const COLABS = [
    { id: 10, nome: 'Ana Souza' },
    { id: 11, nome: 'Bia Lima' },
];
const LIVROS = [
    {
        id: 1,
        titulo: 'A',
        autoriaLivro: [
            { autorId: 1, papeis: ['Autor', 'Tradutor'] },
            { autorId: 2, papeis: ['Organizador', 'Roteirista'] },
        ],
        equipeLivro: [{ colaboradorId: 10, papeis: [{ papel: 'Capista', escopo: 'Capa' }] }],
    },
    {
        id: 2,
        titulo: 'B',
        autoriaLivro: [{ autorId: 3, papeis: ['Autor'] }],
        equipeLivro: [{ colaboradorId: 11, papeis: [{ papel: 'Revisor' }] }],
    },
];

const sug = (q) => sugerirBuscaLivros(q, LIVROS, AUTORES, COLABS);
const textos = (q) => sug(q)?.itens.map((i) => i.texto);

describe('prefixos', () => {
    it('completa o prefixo pelo começo, mantendo o "-"', () => {
        assert.deepEqual(textos('au'), ['autor:']);
        assert.deepEqual(textos('pa'), ['papel:', 'papelequipe:']);
        assert.deepEqual(textos('papele'), ['papelequipe:']);
        assert.deepEqual(textos('-eq'), ['-equipe:']);
        assert.deepEqual(textos('p'), ['papel:', 'papelequipe:']);
    });
    it('o prefixo fica à espera de mais digitação (não completo)', () => {
        assert.equal(sug('au').itens[0].completo, false);
    });
    it('nada a oferecer: vazio, espaço no fim, texto sem relação, prefixo desconhecido', () => {
        assert.equal(sug(''), null);
        assert.equal(sug('autor:Maria '), null);
        assert.equal(sug('zzz'), null);
        assert.equal(sug('titulo:abc'), null);
    });
});

describe('autor:', () => {
    it('só oferece quem consta em algum livro, em ordem alfabética', () => {
        assert.deepEqual(textos('autor:'), [
            'autor:*',
            'autor:"João Pereira"',
            'autor:"Marcos Lima"',
            'autor:"Maria Silva"',
        ]);
    });
    it('filtra por trecho, sem caixa nem acento', () => {
        assert.deepEqual(textos('autor:MAR'), ['autor:"Marcos Lima"', 'autor:"Maria Silva"']);
        assert.deepEqual(textos('autor:joao').slice(0, 1), ['autor:"João Pereira"']);
    });
    it('uma pessoa só: oferece também as combinações com os papéis dela', () => {
        assert.deepEqual(textos('autor:maria'), [
            'autor:"Maria Silva"',
            'autor:"Maria Silva@Autor"',
            'autor:"Maria Silva@Tradutor"',
        ]);
    });
    it('depois do @, só os papéis da pessoa que começam como o digitado', () => {
        assert.deepEqual(textos('autor:"Maria Silva@tr'), ['autor:"Maria Silva@Tradutor"']);
        assert.deepEqual(textos('autor:maria@'), [
            'autor:"Maria Silva@Autor"',
            'autor:"Maria Silva@Tradutor"',
        ]);
        assert.equal(sug('autor:joao@tradutor'), null);
    });
    it('aspas só no nome: "Maria Silva"@tr também sugere os papéis', () => {
        assert.deepEqual(textos('autor:"Maria Silva"@tr'), ['autor:"Maria Silva@Tradutor"']);
    });
    it('mantém o "-" da exclusão', () => {
        assert.deepEqual(textos('-autor:joa').slice(0, 1), ['-autor:"João Pereira"']);
    });
    it('termo já digitado por inteiro não é repetido', () => {
        assert.equal(sug('autor:*'), null);
    });
});

describe('papel: e papelequipe:', () => {
    it('papéis de autoria em uso: a lista fechada primeiro, depois os livres', () => {
        assert.deepEqual(textos('papel:'), [
            'papel:*',
            'papel:Autor',
            'papel:Organizador',
            'papel:Tradutor',
            'papel:Roteirista',
        ]);
    });
    it('filtra por trecho; papel que ninguém usa não aparece', () => {
        assert.deepEqual(textos('papel:tra'), ['papel:Tradutor']);
        assert.equal(sug('papel:coautor'), null);
    });
    it('papéis da equipe (o escopo não entra)', () => {
        assert.deepEqual(textos('papelequipe:'), [
            'papelequipe:*',
            'papelequipe:Capista',
            'papelequipe:Revisor',
        ]);
        assert.equal(sug('papelequipe:capa'), null);
    });
});

describe('equipe:', () => {
    it('nomes e combinações da equipe', () => {
        assert.deepEqual(textos('equipe:'), [
            'equipe:*',
            'equipe:"Ana Souza"',
            'equipe:"Bia Lima"',
        ]);
        assert.deepEqual(textos('equipe:ana'), [
            'equipe:"Ana Souza"',
            'equipe:"Ana Souza@Capista"',
        ]);
    });
    it('apelido colaborador: funciona e mantém o que foi digitado', () => {
        assert.deepEqual(textos('colaborador:bia').slice(0, 1), ['colaborador:"Bia Lima"']);
    });
});

describe('último termo e aplicação', () => {
    it('só o último termo conta, mesmo depois de outros e de aspas', () => {
        const s = sug('dom autor:"Maria Silva" papel:tra');
        assert.deepEqual(
            s.itens.map((i) => i.texto),
            ['papel:Tradutor'],
        );
        assert.equal(s.inicio, 'dom autor:"Maria Silva" '.length);
    });
    it('aplicar troca só o último termo; termo completo ganha espaço', () => {
        const q = 'dom autor:mar';
        const s = sug(q);
        const item = s.itens.find((i) => i.texto === 'autor:"Maria Silva"');
        assert.equal(aplicarSugestaoBuscaLivros(q, s.inicio, item), 'dom autor:"Maria Silva" ');
        const pref = sug('dom au');
        assert.equal(
            aplicarSugestaoBuscaLivros('dom au', pref.inicio, pref.itens[0]),
            'dom autor:',
        );
    });
    it('respeita o limite', () => {
        const s = sugerirBuscaLivros('papel:', LIVROS, AUTORES, COLABS, 2);
        assert.equal(s.itens.length, 2);
    });
    it('a sugestão aplicada é uma consulta que a busca entende', async () => {
        const { filtrarLivrosPorConsulta } = await import('../js/busca-livros.js');
        const s = sug('autor:maria@tr');
        const q = aplicarSugestaoBuscaLivros('autor:maria@tr', s.inicio, s.itens[0]);
        assert.deepEqual(
            filtrarLivrosPorConsulta(LIVROS, q, AUTORES, COLABS).map((l) => l.id),
            [1],
        );
    });
});
