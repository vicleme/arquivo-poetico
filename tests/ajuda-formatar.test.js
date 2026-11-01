import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { blocosDaResposta, trechosDaLinha, respostaSemMarcas } from '../js/ajuda-formatar.js';
import { CATEGORIAS_FAQ } from '../js/faq-conteudo.js';

describe('ajuda-formatar: blocos', () => {
    it('texto sem marca vira um parágrafo só', () => {
        assert.deepEqual(blocosDaResposta('Uma frase. Outra frase.'), [
            { tipo: 'p', texto: 'Uma frase. Outra frase.' },
        ]);
    });

    it('linha em branco separa parágrafos', () => {
        const b = blocosDaResposta('Um.\n\nDois.\n\n\nTrês.');
        assert.deepEqual(
            b.map((x) => x.texto),
            ['Um.', 'Dois.', 'Três.'],
        );
    });

    it('linhas com "- " viram uma lista, e a linha seguinte continua o item', () => {
        const b = blocosDaResposta('Antes:\n- a\n- b\n  segue\n\nDepois.');
        assert.deepEqual(b, [
            { tipo: 'p', texto: 'Antes:' },
            { tipo: 'ul', itens: ['a', 'b segue'] },
            { tipo: 'p', texto: 'Depois.' },
        ]);
    });

    it('"## " vira subtítulo', () => {
        assert.deepEqual(blocosDaResposta('## Parte\nTexto.'), [
            { tipo: 'h', texto: 'Parte' },
            { tipo: 'p', texto: 'Texto.' },
        ]);
    });

    it('vazio e indefinido não geram bloco', () => {
        assert.deepEqual(blocosDaResposta(''), []);
        assert.deepEqual(blocosDaResposta(undefined), []);
    });
});

describe('ajuda-formatar: trechos', () => {
    it('negrito, itálico e código', () => {
        assert.deepEqual(trechosDaLinha('a **b** _c_ `d`'), [
            { texto: 'a ', estilo: null },
            { texto: 'b', estilo: 'b' },
            { texto: ' ', estilo: null },
            { texto: 'c', estilo: 'i' },
            { texto: ' ', estilo: null },
            { texto: 'd', estilo: 'code' },
        ]);
    });

    it('o que está entre crases não é interpretado', () => {
        const t = trechosDaLinha('`**x**` e `_y_`');
        assert.equal(t[0].estilo, 'code');
        assert.equal(t[0].texto, '**x**');
        assert.equal(t[2].texto, '_y_');
    });

    it('asterisco e sublinhado soltos ficam como estão', () => {
        const t = trechosDaLinha('campo:* e -origem:* e gasto_reais_total');
        assert.equal(t.length, 1);
        assert.equal(t[0].texto, 'campo:* e -origem:* e gasto_reais_total');
    });
});

describe('ajuda-formatar: busca', () => {
    it('respostaSemMarcas tira os sinais e junta os blocos', () => {
        assert.equal(
            respostaSemMarcas('Veja **isto** e `aquilo`.\n\n- um\n- _dois_'),
            'Veja isto e aquilo. um dois',
        );
    });
});

describe('ajuda-formatar: FAQ real', () => {
    const todas = CATEGORIAS_FAQ.flatMap((c) => c.perguntas);

    it('resposta sem marcação sai idêntica, só com espaços normalizados', () => {
        for (const p of todas.filter((x) => !/\n|\*\*|(?<!\w)_\S/.test(x.resposta))) {
            assert.equal(
                respostaSemMarcas(p.resposta).replace(/`/g, ''),
                p.resposta.replace(/`/g, ''),
                p.id,
            );
        }
    });

    it('resposta com mais de 450 caracteres tem mais de um bloco (parágrafo, lista ou subtítulo)', () => {
        for (const p of todas.filter((x) => x.resposta.length > 450)) {
            assert.ok(blocosDaResposta(p.resposta).length > 1, `${p.id}: bloco único`);
        }
    });

    it('nenhum parágrafo passa de 350 caracteres e nenhum item de lista, de 370', () => {
        for (const p of todas) {
            for (const b of blocosDaResposta(p.resposta)) {
                if (b.tipo === 'p') assert.ok(b.texto.length <= 350, `${p.id}: parágrafo longo`);
                if (b.tipo === 'ul') {
                    for (const item of b.itens) {
                        assert.ok(item.length <= 370, `${p.id}: item de lista longo`);
                    }
                }
            }
        }
    });
});
