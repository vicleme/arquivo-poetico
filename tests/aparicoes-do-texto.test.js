import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    caminhoDoDestino,
    livroIdDoDestino,
    aparicoesDoTexto,
    livroIdsDoTexto,
    aparicoesNoLivro,
    textoApareceNoLivro,
    aparicaoPrincipal,
    livroPrincipalDoTexto,
} from '../js/aparicoes-do-texto.js';

function dados() {
    return {
        livros: [
            { id: 1, tipo: 'Livro', titulo: 'Primeiro', data: { ano: 2020, mes: 5 } },
            { id: 2, tipo: 'Livro', titulo: 'Segundo', data: { ano: 2018 } },
            { id: 3, tipo: 'Livro', titulo: 'Sem data' },
            { id: 4, tipo: 'Coletânea', titulo: 'Seleta', data: { ano: 2010 } },
        ],
        partes: [
            { id: 10, livroId: 1, titulo: 'Parte A' },
            { id: 11, livroId: 4, titulo: 'Parte da Seleta' },
            { id: 12, livroId: 4, titulo: 'Outra parte da Seleta' },
        ],
        secoes: [
            { id: 20, paiTipo: 'parte', paiId: 10, titulo: 'Seção na Parte' },
            { id: 21, paiTipo: 'livro', paiId: 2, titulo: 'Seção no Livro' },
            { id: 22, paiTipo: 'parte', paiId: 999, titulo: 'Seção órfã' },
        ],
        itensColetanea: [
            { id: 1, parteId: 11, refTipo: 'poema', refId: 50, sequencia: 3 },
            { id: 2, parteId: 12, refTipo: 'poema', refId: 50 },
            { id: 3, parteId: 11, refTipo: 'prosa', refId: 50 },
            { id: 4, parteId: 10, refTipo: 'poema', refId: 50 }, // Livro comum, não é Coletânea
        ],
    };
}

describe('caminhoDoDestino e livroIdDoDestino', () => {
    it('sem Destino ou sem item, null', () => {
        assert.equal(caminhoDoDestino(null, dados()), null);
        assert.equal(caminhoDoDestino({ paiTipo: null, paiId: null }, dados()), null);
        assert.equal(caminhoDoDestino({ paiTipo: 'livro', paiId: null }, dados()), null);
        assert.equal(livroIdDoDestino({}, dados()), null);
    });

    it('Destino direto no livro', () => {
        assert.deepEqual(caminhoDoDestino({ paiTipo: 'livro', paiId: 2 }, dados()), {
            livroId: 2,
            parteId: null,
            secaoId: null,
        });
        assert.equal(livroIdDoDestino({ paiTipo: 'livro', paiId: 2 }, dados()), 2);
    });

    it('Destino numa Parte', () => {
        assert.deepEqual(caminhoDoDestino({ paiTipo: 'parte', paiId: 10 }, dados()), {
            livroId: 1,
            parteId: 10,
            secaoId: null,
        });
    });

    it('Destino numa Seção da Parte e numa Seção do Livro', () => {
        assert.deepEqual(caminhoDoDestino({ paiTipo: 'secao', paiId: 20 }, dados()), {
            livroId: 1,
            parteId: 10,
            secaoId: 20,
        });
        assert.deepEqual(caminhoDoDestino({ paiTipo: 'secao', paiId: 21 }, dados()), {
            livroId: 2,
            parteId: null,
            secaoId: 21,
        });
    });

    it('compara ids como texto (id numérico contra id em string)', () => {
        assert.equal(livroIdDoDestino({ paiTipo: 'parte', paiId: '10' }, dados()), 1);
    });

    it('Parte ou Seção que não existe, ou Seção órfã: null', () => {
        assert.equal(livroIdDoDestino({ paiTipo: 'parte', paiId: 77 }, dados()), null);
        assert.equal(livroIdDoDestino({ paiTipo: 'secao', paiId: 77 }, dados()), null);
        assert.equal(livroIdDoDestino({ paiTipo: 'secao', paiId: 22 }, dados()), null);
    });

    it('tipo de pai desconhecido: null', () => {
        assert.equal(livroIdDoDestino({ paiTipo: 'outro', paiId: 1 }, dados()), null);
    });

    it('serve para Seção e Elemento (mesmo encaixe)', () => {
        assert.equal(livroIdDoDestino({ paiTipo: 'secao', paiId: 20 }, dados()), 1);
    });
});

describe('aparicoesDoTexto', () => {
    it('texto sem nada: lista vazia', () => {
        assert.deepEqual(aparicoesDoTexto(dados(), 'poema', { id: 1 }), []);
        assert.deepEqual(aparicoesDoTexto(dados(), 'poema', null), []);
    });

    it('o Destino vira uma aparição com a posição e o caminho', () => {
        const t = { id: 1, paiTipo: 'secao', paiId: 20, sequencia: 4 };
        assert.deepEqual(aparicoesDoTexto(dados(), 'poema', t), [
            {
                origem: 'destino',
                livroId: 1,
                parteId: 10,
                secaoId: 20,
                sequencia: 4,
                itemColetaneaId: null,
            },
        ]);
    });

    it('sequencia vazia ou inválida vira null', () => {
        const t = { id: 1, paiTipo: 'livro', paiId: 1, sequencia: '' };
        assert.equal(aparicoesDoTexto(dados(), 'poema', t)[0].sequencia, null);
        assert.equal(aparicoesDoTexto(dados(), 'poema', { ...t, sequencia: '7' })[0].sequencia, 7);
    });

    it('livro de livrosIds vira aparição sem posição', () => {
        const t = { id: 1, livrosIds: [2, 3] };
        const r = aparicoesDoTexto(dados(), 'poema', t);
        assert.deepEqual(
            r.map((a) => [a.origem, a.livroId, a.sequencia]),
            [
                ['vinculo', 2, null],
                ['vinculo', 3, null],
            ],
        );
    });

    it('livro no Destino e em livrosIds não duplica', () => {
        const t = { id: 1, paiTipo: 'parte', paiId: 10, sequencia: 1, livrosIds: [1, 2, 2] };
        const r = aparicoesDoTexto(dados(), 'poema', t);
        assert.deepEqual(
            r.map((a) => [a.origem, a.livroId]),
            [
                ['destino', 1],
                ['vinculo', 2],
            ],
        );
    });

    it('livro que não existe mais fica de fora (Destino e livrosIds)', () => {
        const t = { id: 1, paiTipo: 'livro', paiId: 99, livrosIds: [98, 3] };
        assert.deepEqual(
            aparicoesDoTexto(dados(), 'poema', t).map((a) => a.livroId),
            [3],
        );
    });

    it('Coletânea: uma aparição por item, só do tipo certo e só de Coletânea', () => {
        const r = aparicoesDoTexto(dados(), 'poema', { id: 50 });
        assert.deepEqual(
            r.map((a) => [a.origem, a.livroId, a.parteId, a.sequencia, a.itemColetaneaId]),
            [
                ['coletanea', 4, 11, 3, 1],
                ['coletanea', 4, 12, null, 2],
            ],
        );
        const pr = aparicoesDoTexto(dados(), 'prosa', { id: 50 });
        assert.deepEqual(
            pr.map((a) => a.itemColetaneaId),
            [3],
        );
    });

    it('sem tipo ou sem id, as Coletâneas ficam de fora', () => {
        assert.deepEqual(aparicoesDoTexto(dados(), undefined, { id: 50 }), []);
        assert.deepEqual(aparicoesDoTexto(dados(), 'poema', { livrosIds: [1] }).length, 1);
    });

    it('Destino, vínculo e Coletânea juntos, nessa ordem', () => {
        const t = { id: 50, paiTipo: 'livro', paiId: 1, sequencia: 2, livrosIds: [2] };
        assert.deepEqual(
            aparicoesDoTexto(dados(), 'poema', t).map((a) => a.origem),
            ['destino', 'vinculo', 'coletanea', 'coletanea'],
        );
    });

    it('sem lista de livros no acervo, não confere a existência', () => {
        const sem = { partes: [], secoes: [] };
        const t = { id: 1, paiTipo: 'livro', paiId: 99, livrosIds: [98] };
        assert.deepEqual(
            aparicoesDoTexto(sem, 'poema', t).map((a) => a.livroId),
            [99, 98],
        );
    });

    it('não altera o texto nem o acervo', () => {
        const d = dados();
        const t = { id: 50, paiTipo: 'livro', paiId: 1, livrosIds: [2] };
        const antes = JSON.stringify([d, t]);
        aparicoesDoTexto(d, 'poema', t);
        assert.equal(JSON.stringify([d, t]), antes);
    });
});

describe('livroIdsDoTexto, aparicoesNoLivro e textoApareceNoLivro', () => {
    const t = { id: 50, paiTipo: 'livro', paiId: 1, livrosIds: [2] };

    it('ids dos livros sem repetir (a Coletânea com duas Partes conta uma vez)', () => {
        assert.deepEqual(livroIdsDoTexto(dados(), 'poema', t), [1, 2, 4]);
    });

    it('aparições num livro só (duas Partes da mesma Coletânea)', () => {
        assert.equal(aparicoesNoLivro(dados(), 'poema', t, 4).length, 2);
        assert.equal(aparicoesNoLivro(dados(), 'poema', t, '2').length, 1);
        assert.equal(aparicoesNoLivro(dados(), 'poema', t, 3).length, 0);
    });

    it('textoApareceNoLivro', () => {
        assert.equal(textoApareceNoLivro(dados(), 'poema', t, 2), true);
        assert.equal(textoApareceNoLivro(dados(), 'poema', t, 3), false);
    });
});

describe('aparição principal (F21-D2)', () => {
    it('sem aparições, null', () => {
        assert.equal(aparicaoPrincipal(dados(), []), null);
        assert.equal(livroPrincipalDoTexto(dados(), 'poema', { id: 1 }), null);
    });

    it('vence o livro com a publicação mais antiga, mesmo que não seja o Destino', () => {
        const t = { id: 1, paiTipo: 'livro', paiId: 1, livrosIds: [2] };
        assert.equal(livroPrincipalDoTexto(dados(), 'poema', t), 2);
    });

    it('livro com data ganha de livro sem data', () => {
        const t = { id: 1, paiTipo: 'livro', paiId: 3, livrosIds: [1] };
        assert.equal(livroPrincipalDoTexto(dados(), 'poema', t), 1);
    });

    it('empate ou sem datas: a primeira da lista (o Destino)', () => {
        const d = dados();
        d.livros.push({ id: 5, tipo: 'Livro', titulo: 'Mesmo ano', data: { ano: 2018 } });
        assert.equal(
            livroPrincipalDoTexto(d, 'poema', {
                id: 1,
                paiTipo: 'livro',
                paiId: 5,
                livrosIds: [2],
            }),
            5,
        );
        assert.equal(
            livroPrincipalDoTexto(d, 'poema', { id: 1, paiTipo: 'livro', paiId: 3, livrosIds: [] }),
            3,
        );
    });

    it('mês e dia desempatam quando há', () => {
        const d = dados();
        d.livros[0].data = { ano: 2018, mes: 3 };
        d.livros[1].data = { ano: 2018, mes: 1, dia: 20 };
        assert.equal(livroPrincipalDoTexto(d, 'poema', { id: 1, livrosIds: [1, 2] }), 2);
    });

    it('Coletânea só é principal quando não há livro comum', () => {
        // Coletânea (2010) é mais antiga que o Livro 1 (2020), mas não ganha dele.
        assert.equal(
            livroPrincipalDoTexto(dados(), 'poema', { id: 50, paiTipo: 'livro', paiId: 1 }),
            1,
        );
        assert.equal(livroPrincipalDoTexto(dados(), 'poema', { id: 50 }), 4);
    });
});
