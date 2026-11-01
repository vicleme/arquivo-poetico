import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Lógica pura do grupo "Onde aparece" (Fase 21, 21-2 entrega 2): linhas do modal
// <-> aparições, opções de lugar de um livro, repetidas, Destino e Descartado.

const {
    destinoDasLinhas,
    linhasDoTexto,
    linhasParaSalvar,
    linhasRepetidas,
    linhasSemPosicao,
    livrosParaAparicao,
    lugarDaAparicao,
    opcoesDeLugar,
    partesDoLugar,
} = await import('../js/onde-aparece-linhas.js');

function acervo() {
    return {
        livros: [
            { id: 1, titulo: 'Um', tipo: 'Inéditos' },
            { id: 2, titulo: 'Dois', tipo: 'Inéditos' },
            { id: 3, titulo: 'Coletânea X', tipo: 'Coletânea' },
        ],
        partes: [
            { id: 10, livroId: 1, titulo: 'Parte B', sequencia: 2 },
            { id: 11, livroId: 1, titulo: 'Parte A', sequencia: 1 },
        ],
        secoes: [
            { id: 20, paiTipo: 'parte', paiId: 11, titulo: 'Seção da A', sequencia: 1 },
            { id: 21, paiTipo: 'livro', paiId: 1, titulo: 'Solta', sequencia: 3 },
            { id: 22, paiTipo: 'livro', paiId: 2, titulo: 'Do Dois', sequencia: 1 },
        ],
    };
}

describe('livrosParaAparicao', () => {
    it('só livros comuns (Coletânea fica de fora)', () => {
        assert.deepEqual(
            livrosParaAparicao(acervo()).map((l) => l.id),
            [1, 2],
        );
    });
});

describe('opcoesDeLugar', () => {
    it('sem livro: só "consta no livro"', () => {
        const o = opcoesDeLugar(acervo(), null);
        assert.equal(o.length, 1);
        assert.equal(o[0].valor, '');
    });

    it('com livro: só consta, o livro inteiro e a estrutura na ordem real', () => {
        const o = opcoesDeLugar(acervo(), 1);
        assert.deepEqual(
            o.map((x) => x.valor),
            ['', 'livro:1', 'parte:11', 'secao:20', 'parte:10', 'secao:21'],
        );
        assert.deepEqual(
            o.map((x) => x.nivel),
            [0, 0, 1, 2, 1, 1],
        );
    });

    it('não traz a estrutura de outro livro', () => {
        const o = opcoesDeLugar(acervo(), 2);
        assert.deepEqual(
            o.map((x) => x.valor),
            ['', 'livro:2', 'secao:22'],
        );
    });

    it('livro que não existe: só "consta no livro"', () => {
        assert.equal(opcoesDeLugar(acervo(), 99).length, 1);
    });
});

describe('lugarDaAparicao e partesDoLugar', () => {
    it('a Seção manda mais que a Parte, e a Parte mais que o Livro', () => {
        assert.equal(lugarDaAparicao({ livroId: 1, parteId: 11, secaoId: 20 }), 'secao:20');
        assert.equal(lugarDaAparicao({ livroId: 1, parteId: 11, secaoId: null }), 'parte:11');
        assert.equal(
            lugarDaAparicao({ livroId: 1, parteId: null, secaoId: null, sequencia: 2 }),
            'livro:1',
        );
    });
    it('só consta (sem Parte, Seção nem posição) vira ""', () => {
        assert.equal(
            lugarDaAparicao({ livroId: 1, parteId: null, secaoId: null, sequencia: null }),
            '',
        );
    });
    it('partesDoLugar quebra o valor do select', () => {
        assert.deepEqual(partesDoLugar('parte:11'), ['parte', 11]);
        assert.deepEqual(partesDoLugar(''), [null, null]);
    });
});

describe('linhasDoTexto', () => {
    it('texto novo não tem linha', () => {
        assert.deepEqual(linhasDoTexto(acervo(), null), []);
    });

    it('lê a lista de aparições: posição vira "específica", lugar sem posição "nenhuma", só consta sem modo', () => {
        const item = {
            aparicoes: [
                { livroId: 1, parteId: 11, secaoId: null, sequencia: 4 },
                { livroId: 1, parteId: null, secaoId: 21, sequencia: null },
                { livroId: 2, parteId: null, secaoId: null, sequencia: null },
            ],
        };
        assert.deepEqual(linhasDoTexto(acervo(), item), [
            { livroId: 1, lugar: 'parte:11', modo: 'especifica', sequencia: 4 },
            { livroId: 1, lugar: 'secao:21', modo: 'nenhuma', sequencia: null },
            { livroId: 2, lugar: '', modo: null, sequencia: null },
        ]);
    });

    it('texto ainda no formato antigo lê do Destino e de livrosIds', () => {
        const item = { paiTipo: 'parte', paiId: 11, sequencia: 2, livrosIds: [2] };
        assert.deepEqual(linhasDoTexto(acervo(), item), [
            { livroId: 1, lugar: 'parte:11', modo: 'especifica', sequencia: 2 },
            { livroId: 2, lugar: '', modo: null, sequencia: null },
        ]);
    });
});

describe('linhasParaSalvar', () => {
    it('converte lugar em parteId e secaoId; sem lugar vira só consta', () => {
        const saida = linhasParaSalvar([
            { livroId: 1, lugar: 'parte:11', modo: 'fim', sequencia: '' },
            { livroId: 1, lugar: 'secao:21', modo: 'especifica', sequencia: '3' },
            { livroId: 2, lugar: '', modo: null, sequencia: '7' },
            { livroId: 2, lugar: 'livro:2', modo: 'especifica', sequencia: '1' },
        ]);
        assert.deepEqual(saida, [
            { livroId: 1, parteId: 11, secaoId: null, sequencia: null, modo: 'fim' },
            { livroId: 1, parteId: null, secaoId: 21, sequencia: 3, modo: 'especifica' },
            { livroId: 2, parteId: null, secaoId: null, sequencia: null, modo: 'nenhuma' },
            { livroId: 2, parteId: null, secaoId: null, sequencia: 1, modo: 'especifica' },
        ]);
    });

    it('linha sem livro (em branco) é ignorada', () => {
        assert.deepEqual(linhasParaSalvar([{ livroId: null, lugar: '', modo: null }]), []);
        assert.deepEqual(linhasParaSalvar(null), []);
    });
});

describe('linhasRepetidas', () => {
    it('acha o índice da repetida (mesmo livro e lugar), não da primeira', () => {
        assert.deepEqual(
            linhasRepetidas([
                { livroId: 1, lugar: 'parte:11' },
                { livroId: 1, lugar: 'parte:10' },
                { livroId: 1, lugar: 'parte:11' },
                { livroId: 2, lugar: '' },
                { livroId: 2, lugar: '' },
            ]),
            [2, 4],
        );
    });
    it('linhas sem livro não contam', () => {
        assert.deepEqual(linhasRepetidas([{ livroId: null }, { livroId: null }]), []);
    });
});

describe('destinoDasLinhas', () => {
    it('é a primeira linha com lugar; sem lugar nenhum é avulso', () => {
        const linhas = [
            { livroId: 2, lugar: '', modo: null, sequencia: '' },
            { livroId: 1, lugar: 'secao:21', modo: 'especifica', sequencia: '5' },
            { livroId: 1, lugar: 'parte:10', modo: 'especifica', sequencia: '9' },
        ];
        assert.deepEqual(destinoDasLinhas(linhas), { paiTipo: 'secao', paiId: 21, sequencia: 5 });
        assert.deepEqual(destinoDasLinhas([linhas[0]]), {
            paiTipo: null,
            paiId: null,
            sequencia: null,
        });
    });
    it('modo "fim" pede a posição à função recebida; "nenhuma" é null', () => {
        const fim = [{ livroId: 1, lugar: 'parte:10', modo: 'fim' }];
        assert.equal(destinoDasLinhas(fim, () => 8).sequencia, 8);
        const nenhuma = [{ livroId: 1, lugar: 'parte:10', modo: 'nenhuma', sequencia: '3' }];
        assert.equal(destinoDasLinhas(nenhuma, () => 8).sequencia, null);
    });
});

describe('linhasSemPosicao (Descartado)', () => {
    it('toda linha com lugar vira "nenhuma"; só consta fica como está; não muda a entrada', () => {
        const entrada = [
            { livroId: 1, lugar: 'parte:10', modo: 'especifica', sequencia: 4 },
            { livroId: 2, lugar: '', modo: null, sequencia: null },
        ];
        const saida = linhasSemPosicao(entrada);
        assert.deepEqual(saida, [
            { livroId: 1, lugar: 'parte:10', modo: 'nenhuma', sequencia: null },
            { livroId: 2, lugar: '', modo: null, sequencia: null },
        ]);
        assert.equal(entrada[0].modo, 'especifica');
    });
});
