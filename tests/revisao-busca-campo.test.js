import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
    filtrarLinhasRevisao,
    interpretarBuscaRevisao,
    listarLinhasRevisao,
    PREFIXO_DA_COLUNA,
    PREFIXOS_BUSCA_REVISAO,
} from '../js/revisao-fora-do-acervo.js';

// Busca por campo (`campo:valor`) do Modo revisão, na sintaxe das abas de texto.

let linhas;
const obras = (consulta, opcoes) =>
    filtrarLinhasRevisao(linhas, consulta, opcoes)
        .map((l) => l.valores.nome)
        .sort((a, b) => a.localeCompare(b, 'pt-BR'));

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
                    obraPessoal: true,
                    nota: 'Releitura livre',
                },
            ],
            hipertextualidade: [
                { relacao: 'Paródia', tipoObra: 'Livro', hipotexto: 'Odisseia', autor: 'Homero' },
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

describe('busca por campo', () => {
    it('restringe o termo à coluna do prefixo', () => {
        assert.deepEqual(obras('tipo:Mitologia'), ['Édipo', 'Mito de Prometeu']);
        assert.deepEqual(obras('autor:homero'), ['Odisseia']);
        assert.deepEqual(obras('autor:Mitologia'), []);
        assert.deepEqual(obras('nome:odisseia'), ['Odisseia']);
        assert.deepEqual(obras('texto:Casa'), ['Sagarana']);
        assert.deepEqual(obras('titulo:Casa'), ['Sagarana']);
    });

    it('ignora acento e caixa no termo e no prefixo', () => {
        assert.deepEqual(obras('RELAÇÃO:alusao'), ['Mito de Prometeu', 'Sagarana']);
        assert.deepEqual(obras('nota:RELEITURA'), ['Édipo']);
    });

    it('termos soltos se somam e `ou` alterna', () => {
        assert.deepEqual(obras('tipo:Livro autor:Homero'), ['Odisseia']);
        assert.deepEqual(obras('autor:Homero ou autor:Rosa'), ['Odisseia', 'Sagarana']);
    });

    it('`-termo` exclui e vale com prefixo', () => {
        assert.deepEqual(obras('-tipo:Mitologia'), ['Odisseia', 'Sagarana']);
        assert.deepEqual(obras('tipo:Livro -autor:Homero'), ['Sagarana']);
    });

    it('`campo:*` pede a coluna preenchida e `-campo:*` deixa as vazias', () => {
        assert.deepEqual(obras('origem:*'), ['Édipo', 'Sagarana']);
        assert.deepEqual(obras('-origem:*'), ['Mito de Prometeu', 'Odisseia']);
        assert.deepEqual(obras('tipo:Mitologia -origem:*'), ['Mito de Prometeu']);
        assert.deepEqual(obras('pessoal:*'), ['Édipo']);
        assert.deepEqual(obras('personagem:*'), ['Édipo']);
    });

    it('aspas fazem frase exata', () => {
        assert.deepEqual(obras('nome:"Mito de Prometeu"'), ['Mito de Prometeu']);
        assert.deepEqual(obras('nome:"Prometeu de Mito"'), []);
        assert.deepEqual(obras('"Mito de"'), ['Mito de Prometeu']);
    });

    it('sem prefixo o termo vale para todas as colunas, inclusive a origem', () => {
        assert.deepEqual(obras('Sagarana'), ['Sagarana']);
        assert.deepEqual(obras('Grécia'), ['Édipo']);
        assert.deepEqual(obras('Brasil Alusão'), ['Sagarana']);
    });

    it('combina com os filtros Campo e Por preencher', () => {
        assert.deepEqual(obras('tipo:Livro', { campo: 'hipertextualidade' }), ['Odisseia']);
        assert.deepEqual(obras('tipo:Mitologia', { faltando: 'origem' }), ['Mito de Prometeu']);
    });

    it('prefixo sem valor não filtra nada, e prefixo desconhecido é palavra solta', () => {
        assert.equal(obras('origem:').length, 4);
        assert.equal(obras('-origem:').length, 4);
        assert.deepEqual(obras('foo:bar'), []);
    });

    it('a busca de antes continua igual: palavras em qualquer ordem e a literal com pontuação', () => {
        assert.deepEqual(obras('prometeu mito'), ['Édipo', 'Mito de Prometeu']);
        assert.equal(interpretarBuscaRevisao('prometeu mito'), null);
        assert.equal(interpretarBuscaRevisao(', de'), null);
        assert.equal(interpretarBuscaRevisao(''), null);
        assert.ok(interpretarBuscaRevisao('tipo:Livro'));
    });

    it('cada prefixo da lupa existe na busca', () => {
        for (const prefixo of Object.values(PREFIXO_DA_COLUNA)) {
            assert.ok(PREFIXOS_BUSCA_REVISAO.includes(prefixo), prefixo);
        }
    });
});
