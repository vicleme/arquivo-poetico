import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIAS_FAQ, perguntaFaq } from '../js/faq-conteudo.js';

const todasAsPerguntas = CATEGORIAS_FAQ.flatMap((c) => c.perguntas);

describe('FAQ: categorias e perguntas', () => {
    it('ids de categoria são únicos', () => {
        const ids = CATEGORIAS_FAQ.map((c) => c.id);
        assert.equal(new Set(ids).size, ids.length);
    });

    it('toda categoria tem rótulo e ao menos 1 pergunta', () => {
        for (const c of CATEGORIAS_FAQ) {
            assert.ok(c.rotulo, `categoria sem rótulo: ${c.id}`);
            assert.ok(c.perguntas.length >= 1, `categoria sem pergunta: ${c.id}`);
        }
    });

    it('ids de pergunta são únicos entre todas as categorias', () => {
        const ids = todasAsPerguntas.map((p) => p.id);
        assert.equal(new Set(ids).size, ids.length);
    });

    it('toda pergunta tem pergunta e resposta', () => {
        for (const p of todasAsPerguntas) {
            assert.ok(p.pergunta && p.resposta, `pergunta incompleta: ${p.id}`);
        }
    });

    it('textos de tela não usam travessão', () => {
        for (const p of todasAsPerguntas) {
            assert.ok(!/[—–]/.test(p.pergunta + p.resposta), `travessão em ${p.id}`);
        }
    });

    it('perguntaFaq acha por id e devolve null pro que não existe', () => {
        assert.equal(
            perguntaFaq('faq-elo-referencia').pergunta,
            'Qual a diferença entre Elo e Referência?',
        );
        assert.equal(perguntaFaq('pergunta-inexistente'), null);
    });

    it('nenhuma pergunta soa procedimental ("como eu faço/clico") — isso pertence ao outro bloco', () => {
        for (const p of todasAsPerguntas) {
            assert.ok(
                !/^como (eu )?(faço|clico)/i.test(p.pergunta.trim()),
                `soa procedimental: ${p.id}`,
            );
        }
    });
});
