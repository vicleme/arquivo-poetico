import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Jargão e gíria, entrega 3: busca por prefixo `jargao:` e coluna na tabela
// de Poemas e Prosas. Guarda as DUAS entradas da cadeia de busca
// (CAMPOS_ATRIBUTO e PREFIXOS_CANONICOS_POR_CAMPO): já houve prefixo que
// aparecia na UI e nunca funcionou por faltar uma delas.
const { db } = await import('../js/db.js');
const { filtrarTextos, PREFIXOS_CANONICOS_POR_CAMPO } = await import('../js/utils.js');
const { decorarCamposBusca } = await import('../js/render-listas.js');
const { DEFINICAO_COLUNAS, toggleColuna, resetarColunas } = await import('../js/colunas.js');
const { montarCabecalho } = await import('../js/celulas-tabela.js');

const ids = (lista) => lista.map((i) => i.id);

function texto(id, jargaoGiria, extra = {}) {
    return decorarCamposBusca({ id, titulo: `T${id}`, jargaoGiria, ...extra });
}

describe('jargao: busca por prefixo', () => {
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
        itens = [
            texto(1, ['Gíria de internet']),
            texto(2, ['Gíria juvenil', 'Jargão corporativo']),
            texto(3, []),
            texto(4, undefined),
            // Caso negativo do plano: fala DE tecnologia, não COM o vocabulário.
            texto(5, [], { titulo: 'Ciberamor' }),
        ];
    });

    it('acha pelo texto do campo, sem diferenciar caixa nem acento', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'jargao:"gíria de internet"')), [1]);
        assert.deepEqual(ids(filtrarTextos(itens, 'jargao:GIRIA')), [1, 2]);
        assert.deepEqual(ids(filtrarTextos(itens, 'jargao:corporativo')), [2]);
    });

    it('acha em qualquer dos itens da lista', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'jargao:juvenil')), [2]);
        assert.deepEqual(ids(filtrarTextos(itens, 'jargao:juvenil jargao:corporativo')), [2]);
    });

    it('jargao:* separa quem tem de quem não tem o campo', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'jargao:*')), [1, 2]);
        assert.deepEqual(ids(filtrarTextos(itens, '-jargao:*')), [3, 4, 5]);
    });

    it('texto sem o campo lê como vazio e nada o acha', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'jargao:fandom')), []);
        assert.equal(itens[3]._buscaJargaoGiria, '');
    });

    it('as duas entradas da cadeia apontam para o mesmo campo decorado', () => {
        assert.equal(PREFIXOS_CANONICOS_POR_CAMPO._buscaJargaoGiria, 'jargao');
        assert.equal(itens[1]._buscaJargaoGiria, 'Gíria juvenil, Jargão corporativo');
    });

    it('não confunde com dialeto: (campos separados)', () => {
        const comDialeto = texto(6, [], {
            idiomas: [{ idioma: 'pt-BR', papel: 'principal', dialetos: ['paulistano'] }],
        });
        assert.deepEqual(ids(filtrarTextos([comDialeto, ...itens], 'jargao:paulistano')), []);
        assert.deepEqual(ids(filtrarTextos([comDialeto, ...itens], 'dialeto:paulistano')), [6]);
    });
});

describe('coluna Jargão e gíria', () => {
    for (const tabela of ['poemas', 'prosas']) {
        it(`${tabela}: vem logo depois de Idioma, desligada e ordenável`, () => {
            const def = DEFINICAO_COLUNAS[tabela];
            const posIdioma = def.findIndex((c) => c.key === 'idioma');
            const coluna = def[posIdioma + 1];
            assert.equal(coluna.key, 'jargaoGiria');
            assert.equal(coluna.label, 'Jargão e gíria');
            assert.equal(coluna.default, false);
            assert.equal(coluna.sortType, 'alfabetico');
        });
    }
});

describe('cabeçalho da coluna Jargão e gíria', () => {
    for (const tabela of ['poemas', 'prosas']) {
        it(`${tabela}: desligada não aparece; ligada ordena e mostra a lupa de jargao:`, () => {
            resetarColunas(tabela);
            assert.ok(!montarCabecalho(tabela, '', '').includes('jargaoGiria'));
            toggleColuna(tabela, 'jargaoGiria', true);
            const html = montarCabecalho(tabela, '', '');
            assert.ok(html.includes(`ordenarPor('${tabela}', 'jargaoGiria')`));
            assert.ok(html.includes('Buscar por jargao:'));
            resetarColunas(tabela);
        });
    }
});
