import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    ESCOPO_PADRAO_LIVROS,
    intervaloDeIds,
    livrosDoEscopo,
    nomeBaseDownloadLivros,
    podarSelecaoLivros,
    rotulosEscopoLivros,
} from '../js/selecao-livros.js';

const todos = [
    { id: 1, titulo: 'A' },
    { id: 2, titulo: 'B' },
    { id: 3, titulo: 'C' },
    { id: 4, titulo: 'D' },
];

describe('escopo do download de livros', () => {
    it('o padrão é o que a tela mostra', () => {
        assert.equal(ESCOPO_PADRAO_LIVROS, 'filtrados');
    });

    it('filtrados devolve a lista da tela, na ordem recebida', () => {
        const filtrados = [todos[2], todos[0]];
        assert.deepEqual(livrosDoEscopo('filtrados', { todos, filtrados }), filtrados);
    });

    it('tudo ignora o filtro', () => {
        assert.deepEqual(livrosDoEscopo('tudo', { todos, filtrados: [todos[0]] }), todos);
    });

    it('selecao vale por si (fora do filtro) e sai na ordem da aba', () => {
        const lista = livrosDoEscopo('selecao', {
            todos,
            filtrados: [todos[0]],
            selecao: new Set([4, 2]),
        });
        assert.deepEqual(
            lista.map((l) => l.id),
            [2, 4],
        );
    });

    it('selecao vazia ou escopo desconhecido não quebram', () => {
        assert.deepEqual(livrosDoEscopo('selecao', { todos, selecao: new Set() }), []);
        assert.deepEqual(livrosDoEscopo('x', { todos, filtrados: [todos[1]] }), [todos[1]]);
        assert.deepEqual(livrosDoEscopo('tudo'), []);
    });
});

describe('seleção de livros', () => {
    it('poda ids de livros que não existem mais', () => {
        const podada = podarSelecaoLivros(todos, new Set([1, 9, 3]));
        assert.deepEqual([...podada], [1, 3]);
    });

    it('poda compara id como texto e aceita seleção vazia', () => {
        assert.deepEqual([...podarSelecaoLivros(todos, new Set(['2']))], ['2']);
        assert.equal(podarSelecaoLivros(todos, undefined).size, 0);
    });

    it('intervalo de shift-click segue a lista visível, nos dois sentidos', () => {
        const ids = [1, 2, 3, 4];
        assert.deepEqual(intervaloDeIds(ids, 1, 3), [1, 2, 3]);
        assert.deepEqual(intervaloDeIds(ids, 4, 2), [2, 3, 4]);
    });

    it('sem âncora ou com âncora fora da lista, só o clicado', () => {
        assert.deepEqual(intervaloDeIds([1, 2, 3], null, 2), [2]);
        assert.deepEqual(intervaloDeIds([1, 2, 3], 9, 2), [2]);
    });
});

describe('nome do arquivo e rótulos', () => {
    it('nomeia pelo escopo', () => {
        assert.equal(nomeBaseDownloadLivros('tudo'), 'livros');
        assert.equal(nomeBaseDownloadLivros('selecao'), 'livros-selecionados');
        assert.equal(nomeBaseDownloadLivros('filtrados', true), 'livros-filtrados');
    });

    it('filtrados sem nenhum filtro ligado é a aba inteira', () => {
        assert.equal(nomeBaseDownloadLivros('filtrados', false), 'livros');
    });

    it('rótulos levam a contagem, e a seleção vazia fica sem número', () => {
        const r = rotulosEscopoLivros({ total: 10, filtrados: 3, selecionados: 0 });
        assert.match(r.filtrados, /\(3\)/);
        assert.match(r.tudo, /\(10\)/);
        assert.equal(r.selecao, 'Só selecionados');
        assert.match(rotulosEscopoLivros({ selecionados: 2 }).selecao, /\(2\)/);
    });
});
