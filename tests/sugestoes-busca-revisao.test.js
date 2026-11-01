import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { listarLinhasRevisao } from '../js/revisao-fora-do-acervo.js';
import { aplicarSugestaoBuscaRevisao, sugerirBuscaRevisao } from '../js/sugestoes-busca-revisao.js';

// Sugestões da caixa "Buscar nas linhas" do Modo revisão.

let linhas;
const rotulos = (query) => sugerirBuscaRevisao(query, linhas)?.itens.map((i) => i.rotulo) ?? null;

beforeEach(() => {
    const poemas = [
        {
            id: 1,
            titulo: 'Prometeu',
            intertextualidade: [
                { relacao: 'Alusão', tipoObra: 'Mitologia', obra: 'Mito de Prometeu', autor: '' },
                {
                    relacao: 'Citação',
                    tipoObra: 'Mitologia',
                    obra: 'Édipo',
                    autor: 'Sófocles',
                    origemObra: ['Grécia'],
                    personagens: ['Édipo'],
                },
            ],
            hipertextualidade: [
                {
                    relacao: 'Paródia',
                    tipoObra: 'Livro',
                    hipotexto: 'Odisseia',
                    autor: 'Homero',
                    origemObra: ['Grécia', 'Roma'],
                },
            ],
        },
    ];
    const prosas = [
        {
            id: 7,
            titulo: 'Casa',
            intertextualidade: [
                {
                    relacao: 'Alusão',
                    tipoObra: 'Livro',
                    obra: 'Sagarana',
                    autor: 'Guimarães Rosa',
                    origemObra: ['Brasil'],
                },
            ],
        },
    ];
    linhas = listarLinhasRevisao({ poemas, prosas });
});

describe('sugestões de prefixo', () => {
    it('oferece os prefixos que começam como o digitado', () => {
        assert.deepEqual(rotulos('or'), ['origem:']);
        assert.deepEqual(rotulos('te'), ['texto:']);
        assert.deepEqual(rotulos('n'), ['nome:', 'nota:']);
        assert.deepEqual(rotulos('TIP'), ['tipo:']);
    });

    it('mantém o "-" e só olha o último termo', () => {
        const s = sugerirBuscaRevisao('tipo:Livro -or', linhas);
        assert.equal(s.itens[0].texto, '-origem:');
        assert.equal(s.itens[0].completo, false);
        assert.equal(
            aplicarSugestaoBuscaRevisao('tipo:Livro -or', s.inicio, s.itens[0]),
            'tipo:Livro -origem:',
        );
    });

    it('não oferece nada para um termo que não começa nenhum prefixo', () => {
        assert.equal(rotulos('zzz'), null);
        assert.equal(rotulos(''), null);
        assert.equal(rotulos('foo:bar'), null);
        assert.equal(rotulos('"frase'), null);
    });
});

describe('sugestões de valor', () => {
    it('depois do prefixo, oferece * e os valores em uso, o mais usado primeiro', () => {
        assert.deepEqual(rotulos('origem:'), ['*', 'Grécia', 'Brasil', 'Roma']);
        const s = sugerirBuscaRevisao('origem:', linhas);
        assert.equal(s.itens[1].detalhe, '2 linhas');
        assert.equal(s.itens[2].detalhe, '1 linha');
        assert.equal(s.itens[1].texto, 'origem:Grécia');
        assert.equal(s.itens[1].completo, true);
    });

    it('filtra pelo que foi digitado, sem acento nem caixa', () => {
        assert.deepEqual(rotulos('origem:grec'), ['Grécia']);
        assert.deepEqual(rotulos('tipo:mito'), ['Mitologia']);
        assert.deepEqual(rotulos('autor:ROSA'), ['Guimarães Rosa']);
        assert.equal(rotulos('origem:xyz'), null);
    });

    it('põe aspas no valor que tem espaço e mantém o "-"', () => {
        const s = sugerirBuscaRevisao('-autor:guim', linhas);
        assert.equal(s.itens[0].texto, '-autor:"Guimarães Rosa"');
        assert.equal(
            aplicarSugestaoBuscaRevisao('-autor:guim', s.inicio, s.itens[0]),
            '-autor:"Guimarães Rosa" ',
        );
    });

    it('os nomes, as relações, os personagens e as datas também são oferecidos', () => {
        assert.deepEqual(rotulos('nome:od'), ['Odisseia']);
        assert.deepEqual(rotulos('relacao:alu'), ['Alusão']);
        assert.deepEqual(rotulos('personagem:'), ['*', 'Édipo']);
        assert.deepEqual(rotulos('texto:ca'), ['Casa']);
    });

    it('colunas de texto livre e checks só oferecem *', () => {
        for (const p of ['nota', 'descricao', 'trecho', 'link', 'pessoal', 'traduzido', 'acesso']) {
            assert.deepEqual(rotulos(`${p}:`), ['*'], p);
            assert.equal(rotulos(`${p}:abc`), null, p);
        }
    });

    it('termo já completo ou exato não é repetido', () => {
        assert.equal(rotulos('origem:*'), null);
        assert.equal(rotulos('origem:Grécia'), null);
        assert.deepEqual(rotulos('origem:Gr'), ['Grécia']);
    });

    it('respeita o limite', () => {
        const muitas = Array.from({ length: 20 }, (_, i) => ({
            titulo: `T${i}`,
            valores: {
                origens: [`Lugar ${i}`],
                autores: [],
                personagens: [],
            },
        }));
        assert.equal(sugerirBuscaRevisao('origem:', muitas, 5).itens.length, 5);
    });
});
