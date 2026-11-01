import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Autoclassificação (corações) pesquisável: prefixo `autoclassificacao:` (apelido
// `coracoes:`), com `*`, valor exato e faixas (4.., ..2, 3..4,5). O 0 e o campo
// ausente são "não avaliado": ficam de fora de valores e faixas, e só entram em
// `-autoclassificacao:*`.
const { db } = await import('../js/db.js');
const { filtrarTextos, PREFIXOS_CANONICOS_POR_CAMPO } = await import('../js/utils.js');
const { decorarCamposBusca } = await import('../js/render-listas.js');
const { DEFINICAO_COLUNAS, toggleColuna, resetarColunas } = await import('../js/colunas.js');
const { montarCabecalho } = await import('../js/celulas-tabela.js');
const { sugerirBuscaTexto } = await import('../js/sugestoes-busca-texto.js');

const ids = (lista) => lista.map((i) => i.id);

describe('autoclassificacao: busca por prefixo', () => {
    let itens;
    beforeEach(() => {
        db.temas = [];
        db.assuntos = [];
        db.pessoas = [];
        db.grupos = [];
        db.autores = [];
        db.livros = [];
        db.epocas = [];
        db.periodosHistoricos = [];
        db.movimentosEscolas = [];
        db.locais = [];
        const t = (id, autoclassificacao) =>
            decorarCamposBusca({ id, titulo: `T${id}`, autoclassificacao });
        itens = [t(1, 0.5), t(2, 3.5), t(3, 4), t(4, 5), t(5, 0), t(6, undefined), t(7, 7)];
    });

    it('a cadeia do prefixo está completa (canônico, apelido e coluna)', () => {
        assert.equal(PREFIXOS_CANONICOS_POR_CAMPO._buscaAutoclassificacao, 'autoclassificacao');
        for (const tabela of ['poemas', 'prosas']) {
            assert.ok(DEFINICAO_COLUNAS[tabela].some((c) => c.key === 'autoclassificacao'));
        }
    });

    it('`*` separa avaliados de não avaliados (0, ausente e inválido são não avaliados)', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'autoclassificacao:*')), [1, 2, 3, 4]);
        assert.deepEqual(ids(filtrarTextos(itens, '-autoclassificacao:*')), [5, 6, 7]);
    });

    it('valor exato, com vírgula ou ponto', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'autoclassificacao:3,5')), [2]);
        assert.deepEqual(ids(filtrarTextos(itens, 'autoclassificacao:3.5')), [2]);
        assert.deepEqual(ids(filtrarTextos(itens, 'autoclassificacao:4')), [3]);
        assert.deepEqual(ids(filtrarTextos(itens, 'autoclassificacao:0,5')), [1]);
    });

    it('faixas abertas e fechadas, sem pegar o "não avaliado"', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'autoclassificacao:4..')), [3, 4]);
        assert.deepEqual(ids(filtrarTextos(itens, 'autoclassificacao:..1')), [1]);
        assert.deepEqual(ids(filtrarTextos(itens, 'autoclassificacao:3..4,5')), [2, 3]);
        assert.deepEqual(ids(filtrarTextos(itens, 'autoclassificacao:3,5..4')), [2, 3]);
    });

    it('`coracoes:` é o mesmo que `autoclassificacao:`', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'coracoes:5')), [4]);
        assert.deepEqual(ids(filtrarTextos(itens, 'coracoes:*')), [1, 2, 3, 4]);
    });

    it('valor que não é número não acha nada, e a busca solta não olha o campo', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'autoclassificacao:abc')), []);
        assert.deepEqual(ids(filtrarTextos(itens, '3,5')), []);
    });

    it('combina com outros termos', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'autoclassificacao:3.. titulo:T3')), [3]);
    });
});

describe('autoclassificacao: cabeçalho e sugestões', () => {
    for (const tabela of ['poemas', 'prosas']) {
        it(`${tabela}: a coluna ligada mostra a lupa de autoclassificacao:`, () => {
            resetarColunas(tabela);
            toggleColuna(tabela, 'autoclassificacao', true);
            const html = montarCabecalho(tabela, '', '');
            assert.ok(html.includes(`buscarPorPrefixo('${tabela}', '_buscaAutoclassificacao')`));
            assert.ok(html.includes('Buscar por autoclassificacao:'));
            resetarColunas(tabela);
        });
    }

    it('a caixinha oferece o prefixo, o apelido e o `*`', () => {
        const r = sugerirBuscaTexto('autoclass', {});
        assert.deepEqual(
            r.itens.map((i) => i.texto),
            ['autoclassificacao:'],
        );
        const a = sugerirBuscaTexto('cora', {});
        assert.deepEqual(
            a.itens.map((i) => i.texto),
            ['coracoes:'],
        );
        assert.match(a.itens[0].detalhe, /o mesmo que autoclassificacao:/);
        const v = sugerirBuscaTexto('autoclassificacao:', {});
        assert.equal(v.itens[0].texto, 'autoclassificacao:*');
    });
});
