import './helpers/dom-real.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Filtros e busca da Equipe e créditos (etapa 6, entrega 3), lógica pura.

const { filtrarLivros, filtrosLivrosAtivos, filtrosLivrosVazios, livroCombinaComBusca } =
    await import('../js/filtro-livros.js');

const colaboradores = [
    { id: 1, nome: 'Ana Souza' },
    { id: 2, nome: 'Bruno Lima' },
];
const livros = () => [
    {
        id: 1,
        titulo: 'A',
        equipeLivro: [
            {
                colaboradorId: 1,
                papeis: [{ papel: 'Capista', escopo: 'Capa' }, { papel: 'Revisor' }],
            },
            { colaboradorId: 2, papeis: [{ papel: 'Editor' }] },
        ],
    },
    { id: 2, titulo: 'B', equipeLivro: [{ colaboradorId: 2, papeis: [{ papel: 'Capista' }] }] },
    { id: 3, titulo: 'C' },
];
const ids = (lista) => lista.map((l) => l.id);
const filtrar = (f) => ids(filtrarLivros(livros(), f, undefined, [], colaboradores));

describe('filtro por equipe, agora pela busca', () => {
    const buscar = (busca) => filtrar({ busca });

    it('o filtro não tem mais campos de pessoa e papel da equipe', () => {
        const v = filtrosLivrosVazios();
        assert.equal('equipe' in v, false);
        assert.equal('papelEquipe' in v, false);
        assert.equal(filtrosLivrosAtivos(v), false);
    });

    it('a busca com prefixo liga o filtro', () => {
        assert.equal(filtrosLivrosAtivos({ busca: 'equipe:ana' }), true);
        assert.equal(filtrosLivrosAtivos({ busca: 'papelequipe:Capista' }), true);
    });

    it('por pessoa', () => {
        assert.deepEqual(buscar('equipe:bruno'), [1, 2]);
        assert.deepEqual(buscar('equipe:ana'), [1]);
    });

    it('por papel, de qualquer pessoa, ignorando caixa e o escopo', () => {
        assert.deepEqual(buscar('papelequipe:Capista'), [1, 2]);
        assert.deepEqual(buscar('papelequipe:capista'), [1, 2]);
        assert.deepEqual(buscar('papelequipe:Revisor'), [1]);
        assert.deepEqual(buscar('papelequipe:Capa'), []);
    });

    it('pessoa e papel no mesmo livro (@) e soltos', () => {
        assert.deepEqual(buscar('equipe:Bruno@Capista'), [2]);
        assert.deepEqual(buscar('equipe:Ana@Editor'), []);
        // soltos: Ana está no livro 1 e há um Editor lá (o Bruno)
        assert.deepEqual(buscar('equipe:Ana papelequipe:Editor'), [1]);
    });

    it('"sem equipe" é -equipe:*', () => {
        assert.deepEqual(buscar('-equipe:*'), [3]);
        assert.deepEqual(buscar('equipe:*'), [1, 2]);
    });

    it('equipe e autoria na mesma busca valem E', () => {
        const lista = [
            {
                id: 1,
                titulo: 'A',
                autoriaLivro: [{ autorId: 9, papeis: ['Autor'] }],
                equipeLivro: [{ colaboradorId: 1, papeis: [{ papel: 'Revisor' }] }],
            },
            {
                id: 2,
                titulo: 'B',
                equipeLivro: [{ colaboradorId: 1, papeis: [{ papel: 'Revisor' }] }],
            },
        ];
        const resultado = filtrarLivros(
            lista,
            { busca: 'autor:Zé equipe:Ana' },
            undefined,
            [{ id: 9, nome: 'Zé Autor' }],
            colaboradores,
        );
        assert.deepEqual(ids(resultado), [1]);
    });
});

describe('busca pela equipe', () => {
    it('acha pelo nome, papel e escopo, sem caixa nem acento', () => {
        const [a, b, c] = livros();
        assert.ok(livroCombinaComBusca(a, 'ANA', [], colaboradores));
        assert.ok(livroCombinaComBusca(a, 'capista: capa', [], colaboradores));
        assert.ok(livroCombinaComBusca(b, 'bruno', [], colaboradores));
        assert.ok(!livroCombinaComBusca(c, 'bruno', [], colaboradores));
    });

    it('sem o cadastro a busca é a de antes (equipe não entra)', () => {
        assert.ok(!livroCombinaComBusca(livros()[0], 'ana'));
    });
});
