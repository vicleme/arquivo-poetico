import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    BLOCOS_CONEXOES,
    BLOCOS_DENTRO_DO_ACERVO,
    LS_BLOCOS_CONEXOES_FECHADOS,
    blocoEstaAberto,
    definirBlocoAberto,
    definirTodosBlocos,
    lerBlocosFechados,
    tituloComContagem,
} from '../js/blocos-recolhiveis.js';

// Armazenamento de mentira, no formato mínimo de localStorage.
function memoria(inicial = {}) {
    const m = { ...inicial };
    return {
        getItem: (k) => (k in m ? m[k] : null),
        setItem: (k, v) => {
            m[k] = String(v);
        },
        dados: m,
    };
}

describe('blocos recolhíveis da aba Conexões: estado guardado', () => {
    it('sem nada guardado, todos os blocos estão abertos', () => {
        const s = memoria();
        assert.equal(lerBlocosFechados(s).size, 0);
        BLOCOS_CONEXOES.forEach((c) => assert.equal(blocoEstaAberto(c, s), true, c));
    });

    it('fechar um bloco guarda só ele; reabrir tira da lista', () => {
        const s = memoria();
        assert.equal(definirBlocoAberto('autores', false, s), true);
        assert.deepEqual([...lerBlocosFechados(s)], ['autores']);
        assert.equal(blocoEstaAberto('autores', s), false);
        assert.equal(blocoEstaAberto('obras', s), true);
        definirBlocoAberto('autores', true, s);
        assert.equal(lerBlocosFechados(s).size, 0);
    });

    it('guarda na ordem da tela, sem repetir', () => {
        const s = memoria();
        definirBlocoAberto('referencias', false, s);
        definirBlocoAberto('obras', false, s);
        definirBlocoAberto('obras', false, s);
        assert.deepEqual(JSON.parse(s.dados[LS_BLOCOS_CONEXOES_FECHADOS]), [
            'obras',
            'referencias',
        ]);
    });

    it('chave desconhecida é ignorada ao gravar e descartada ao ler', () => {
        const s = memoria();
        assert.equal(definirBlocoAberto('nao-existe', false, s), false);
        assert.equal(LS_BLOCOS_CONEXOES_FECHADOS in s.dados, false);
        const t = memoria({ [LS_BLOCOS_CONEXOES_FECHADOS]: '["obras","velha"]' });
        assert.deepEqual([...lerBlocosFechados(t)], ['obras']);
    });

    it('valor quebrado ou de outro formato vira "tudo aberto"', () => {
        ['{ruim', '"obras"', '{"a":1}', '123'].forEach((v) => {
            const s = memoria({ [LS_BLOCOS_CONEXOES_FECHADOS]: v });
            assert.equal(lerBlocosFechados(s).size, 0, v);
        });
    });

    it('Recolher tudo fecha todos; Expandir tudo abre todos', () => {
        const s = memoria();
        definirTodosBlocos(false, s);
        assert.equal(lerBlocosFechados(s).size, BLOCOS_CONEXOES.length);
        definirTodosBlocos(true, s);
        assert.equal(lerBlocosFechados(s).size, 0);
    });

    it('armazenamento que falha ao gravar não quebra', () => {
        const ruim = {
            getItem: () => null,
            setItem: () => {
                throw new Error('cheio');
            },
        };
        const aviso = console.warn;
        console.warn = () => {};
        try {
            assert.equal(definirBlocoAberto('obras', false, ruim), false);
        } finally {
            console.warn = aviso;
        }
    });

    it('o título leva a contagem', () => {
        assert.equal(tituloComContagem('Obras', 124), 'Obras (124)');
        assert.equal(tituloComContagem('Obras', 0), 'Obras (0)');
        assert.equal(tituloComContagem('Obras', undefined), 'Obras');
    });
});

describe('subtítulos de Dentro do acervo: mesma chave de armazenamento', () => {
    it('Buracos, Elos e Ecos valem como chaves e ficam antes dos blocos de Fora, na ordem', () => {
        assert.deepEqual(BLOCOS_DENTRO_DO_ACERVO, ['buracos', 'elos', 'ecos']);
        const s = memoria();
        definirBlocoAberto('obras', false, s);
        definirBlocoAberto('ecos', false, s);
        definirBlocoAberto('buracos', false, s);
        assert.deepEqual(JSON.parse(s.dados[LS_BLOCOS_CONEXOES_FECHADOS]), [
            'buracos',
            'ecos',
            'obras',
        ]);
        assert.equal(blocoEstaAberto('elos', s), true);
        assert.equal(blocoEstaAberto('ecos', s), false);
    });

    it('Recolher tudo e Expandir tudo só mexem nas chaves da própria seção', () => {
        const s = memoria();
        definirBlocoAberto('obras', false, s);
        definirTodosBlocos(false, s, BLOCOS_DENTRO_DO_ACERVO);
        assert.deepEqual([...lerBlocosFechados(s)].sort(), ['buracos', 'ecos', 'elos', 'obras']);
        definirTodosBlocos(true, s, BLOCOS_DENTRO_DO_ACERVO);
        assert.deepEqual([...lerBlocosFechados(s)], ['obras']);
        // O padrão continua sendo Fora do acervo e preserva o estado de Dentro.
        definirBlocoAberto('elos', false, s);
        definirTodosBlocos(true, s);
        assert.deepEqual([...lerBlocosFechados(s)], ['elos']);
        definirTodosBlocos(false, s);
        assert.equal(lerBlocosFechados(s).size, BLOCOS_CONEXOES.length + 1);
    });
});
