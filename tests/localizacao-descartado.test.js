import './helpers/dom-real.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Texto descartado já saiu do livro: a linha de lugar do Ver e das exportações vira
// "Cortado de ..." (o que o campo gravou) e o Controle do acervo não repete a origem.

const { textoLocalizacaoDoTexto, rotuloLocalizacaoDoTexto, livroSecaoStr } =
    await import('../js/utils.js');
const exportarMd = await import('../js/exportar-md.js');
const { renderVisualizacaoHtml } = await import('../js/visualizar.js');

const base = { tipo: 'poema', id: 1, titulo: 'T', texto: 'x', sequencia: null };
const cortado = { livro: 'Livro Um', secao: 'Parte A / 1. Viagens', posicao: 3 };
const descartado = {
    ...base,
    status: 'descartado',
    cortadoDe: cortado,
    descarte: 'Não coube no tom do livro.',
    contexto: { livro: 'Livro Um', parte: 'Parte A', secao: '1. Viagens' },
};

describe('linha de lugar do descartado', () => {
    it('rótulo e texto vêm do Cortado de, com o caminho e a posição de época', () => {
        assert.equal(rotuloLocalizacaoDoTexto(descartado), 'Cortado de');
        assert.equal(
            textoLocalizacaoDoTexto(descartado),
            'Livro Um › Parte A › 1. Viagens · era a nº 3 na época',
        );
    });

    it('usa o desenho da Localização (seta e "·"), mas com a posição de época, não a de hoje', () => {
        const texto = textoLocalizacaoDoTexto({ ...descartado, sequencia: 7 });
        assert.ok(texto.includes(' › '));
        assert.ok(texto.includes(' · era a nº 3 na época'));
        assert.ok(!texto.includes('posição 7'));
        assert.ok(!texto.includes('sem posição'));
    });

    it('Lançado em segue o mesmo desenho, sem posição', () => {
        assert.equal(
            livroSecaoStr({ livro: 'Livro Dois', secao: 'Parte B / Volta' }),
            'Livro Dois › Parte B › Volta',
        );
        assert.equal(livroSecaoStr({ livro: 'Livro Dois', secao: 'Volta' }), 'Livro Dois › Volta');
    });

    it('descartado antigo, sem Cortado de gravado: cai no caminho do vínculo, sem posição', () => {
        const antigo = { ...descartado, cortadoDe: undefined };
        assert.equal(textoLocalizacaoDoTexto(antigo), 'Livro Um › Parte A › 1. Viagens');
    });

    it('descartado sem Cortado de e sem vínculo: nada a mostrar', () => {
        assert.equal(
            textoLocalizacaoDoTexto({ ...base, status: 'descartado', contexto: {} }),
            null,
        );
    });

    it('texto de outro status segue como antes', () => {
        const comum = {
            ...base,
            status: 'completo',
            sequencia: 2,
            cortadoDe: cortado,
            contexto: { livro: 'L', parte: 'P' },
        };
        assert.equal(rotuloLocalizacaoDoTexto(comum), 'Localização');
        assert.equal(textoLocalizacaoDoTexto(comum), 'L › P · posição 2');
    });

    it('livroSecaoStr segue exportada pelo exportar-md (outros módulos importam de lá)', () => {
        assert.equal(exportarMd.livroSecaoStr, livroSecaoStr);
    });
});

describe('Ver e .md do descartado', () => {
    it('.md: linha "Cortado de" no alto e só a justificativa em Controle', () => {
        const md = exportarMd.itemParaMarkdown(descartado, 1);
        assert.match(
            md,
            /\*\*Cortado de:\*\* Livro Um › Parte A › 1\. Viagens · era a nº 3 na época/,
        );
        assert.ok(!md.includes('**Localização:**'));
        assert.ok(!md.includes('### Migração entre livros'));
        assert.match(md, /Descarte/);
        assert.match(md, /Não coube no tom do livro\./);
        assert.equal(md.split('Livro Um › Parte A › 1. Viagens').length - 1, 1);
    });

    it('Ver: mesma coisa, sem repetir a origem no Controle do acervo', () => {
        const html = renderVisualizacaoHtml(descartado);
        assert.match(html, /Cortado de/);
        assert.ok(!html.includes('Migração entre livros'));
        assert.match(html, /Não coube no tom do livro\./);
        assert.equal(html.split('Livro Um › Parte A › 1. Viagens').length - 1, 1);
    });

    it('migrado continua com Localização e com o bloco Migração entre livros', () => {
        const migrado = {
            ...base,
            status: 'migrado',
            sequencia: 2,
            cortadoDe: cortado,
            lancadoEm: { livro: 'Livro Dois', secao: 'Volta' },
            contexto: { livro: 'Livro Dois', secao: 'Volta' },
        };
        const md = exportarMd.itemParaMarkdown(migrado, 1);
        assert.match(md, /\*\*Localização:\*\* Livro Dois › Volta · posição 2/);
        assert.match(md, /### Migração entre livros/);
        assert.match(md, /- Cortado de: Livro Um/);
        const html = renderVisualizacaoHtml(migrado);
        assert.match(html, /Migração entre livros/);
        assert.match(html, /Localização/);
    });
});
