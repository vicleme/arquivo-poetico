import './helpers/localstorage-shim.js';
import './helpers/dom-shim.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { db } from '../js/db.js';
import { renderVisualizacaoHtml } from '../js/visualizar.js';

// Extrai só o conteúdo do bloco "Texto" (entre o <h4>Texto</h4> e o
// próximo <h4> ou o fim), pra não acoplar os testes ao resto do HTML
// (meta, notas etc.) que não é o que está sendo testado aqui.
function blocoTexto(html) {
    const match = html.match(/<h4[^>]*>Texto<\/h4>\s*<div class="([^"]*)">([\s\S]*?)<\/div>/);
    assert.ok(match, 'deveria existir um bloco "Texto" no HTML gerado');
    return { classes: match[1], conteudo: match[2] };
}

describe('renderVisualizacaoHtml — bloco Texto', () => {
    it('a <div> do corpo do texto tem whitespace-pre-wrap, pra respeitar as quebras de linha', () => {
        const item = { id: 1, tipo: 'poema', titulo: 'T', texto: 'verso um\nverso dois' };
        const html = renderVisualizacaoHtml(item);
        const { classes } = blocoTexto(html);
        assert.match(classes, /\bwhitespace-pre-wrap\b/);
    });

    it('preserva os \\n literais no HTML (sem whitespace-pre-wrap eles colapsariam visualmente)', () => {
        const item = {
            id: 1,
            tipo: 'poema',
            titulo: 'T',
            texto: 'verso um\nverso dois\nverso três',
        };
        const html = renderVisualizacaoHtml(item);
        const { conteudo } = blocoTexto(html);
        assert.equal(conteudo, 'verso um\nverso dois\nverso três');
    });

    it('converte **negrito** (markdown inserido pela toolbar) em <strong>', () => {
        const item = { id: 1, tipo: 'poema', titulo: 'T', texto: '**palavra em negrito**' };
        const html = renderVisualizacaoHtml(item);
        const { conteudo } = blocoTexto(html);
        assert.match(conteudo, /<strong>palavra em negrito<\/strong>/);
        assert.ok(!conteudo.includes('**'), 'os marcadores ** não deveriam sobrar no HTML');
    });

    it('converte _itálico_ (markdown inserido pela toolbar) em <em>', () => {
        const item = { id: 1, tipo: 'poema', titulo: 'T', texto: '_palavra em itálico_' };
        const html = renderVisualizacaoHtml(item);
        const { conteudo } = blocoTexto(html);
        assert.match(conteudo, /<em>palavra em itálico<\/em>/);
        assert.ok(
            !/(^|[^<])_palavra/.test(conteudo),
            'os marcadores _ não deveriam sobrar no HTML',
        );
    });

    it('negrito, itálico e quebras de linha funcionam juntos, verso a verso', () => {
        const item = {
            id: 1,
            tipo: 'poema',
            titulo: 'T',
            texto: '**Verso em negrito**\n_Verso em itálico_\nVerso final sem estilo',
        };
        const html = renderVisualizacaoHtml(item);
        const { conteudo } = blocoTexto(html);
        assert.match(
            conteudo,
            /<strong>Verso em negrito<\/strong>\n<em>Verso em itálico<\/em>\nVerso final sem estilo/,
        );
    });

    it('sem tags HTML nem markdown, o texto plano com quebras de linha passa direto', () => {
        const item = { id: 1, tipo: 'poema', titulo: 'T', texto: 'só um verso simples' };
        const html = renderVisualizacaoHtml(item);
        const { conteudo } = blocoTexto(html);
        assert.equal(conteudo, 'só um verso simples');
    });

    it('converte _itálico_ mesmo com quebra de linha dentro do par (verso partido em duas linhas)', () => {
        const item = {
            id: 1,
            tipo: 'poema',
            titulo: 'T',
            texto: '_(Com quantos anos você parou de crescer? \nCatorze?)_',
        };
        const html = renderVisualizacaoHtml(item);
        const { conteudo } = blocoTexto(html);
        assert.match(
            conteudo,
            /<em>\(Com quantos anos você parou de crescer\? \nCatorze\?\)<\/em>/,
        );
        assert.ok(!conteudo.includes('_'), 'os marcadores _ não deveriam sobrar no HTML');
    });

    it('converte **negrito** mesmo com quebra de linha dentro do par', () => {
        const item = {
            id: 1,
            tipo: 'poema',
            titulo: 'T',
            texto: '**primeira linha\nsegunda linha**',
        };
        const html = renderVisualizacaoHtml(item);
        const { conteudo } = blocoTexto(html);
        assert.match(conteudo, /<strong>primeira linha\nsegunda linha<\/strong>/);
    });
});

describe('renderVisualizacaoHtml — markdown em outros campos de texto longo', () => {
    it('converte _itálico_ e **negrito** no campo Notas, não só no Texto', () => {
        const item = {
            id: 1,
            tipo: 'poema',
            titulo: 'T',
            texto: 'corpo do poema',
            notas: 'Anotação _em itálico_ e outra em **negrito**.',
        };
        const html = renderVisualizacaoHtml(item);
        const match = html.match(/<h4[^>]*>Notas<\/h4>\s*<div[^>]*>([\s\S]*?)<\/div>/);
        assert.ok(match, 'deveria existir um bloco "Notas" no HTML gerado');
        assert.match(
            match[1],
            /Anotação <em>em itálico<\/em> e outra em <strong>negrito<\/strong>\./,
        );
    });

    it('converte _itálico_ com quebra de linha no campo Descrição Visual', () => {
        const item = {
            id: 1,
            tipo: 'poema',
            titulo: 'T',
            texto: 'corpo do poema',
            descricaoVisual: '_(Com quantos anos você parou de crescer? \nCatorze?)_',
        };
        const html = renderVisualizacaoHtml(item);
        const match = html.match(/<h4[^>]*>Descrição Visual<\/h4>\s*<div[^>]*>([\s\S]*?)<\/div>/);
        assert.ok(match, 'deveria existir um bloco "Descrição Visual" no HTML gerado');
        assert.match(
            match[1],
            /<em>\(Com quantos anos você parou de crescer\? \nCatorze\?\)<\/em>/,
        );
    });

    it('campos de texto longo continuam escapando HTML perigoso antes de aplicar o markdown', () => {
        const item = {
            id: 1,
            tipo: 'poema',
            titulo: 'T',
            texto: 'corpo do poema',
            notas: '<script>alert(1)</script> _itálico_ normal',
        };
        const html = renderVisualizacaoHtml(item);
        const match = html.match(/<h4[^>]*>Notas<\/h4>\s*<div[^>]*>([\s\S]*?)<\/div>/);
        assert.ok(match, 'deveria existir um bloco "Notas" no HTML gerado');
        assert.ok(
            !match[1].includes('<script>'),
            'a tag <script> não deveria sobreviver ao escapeHtml',
        );
        assert.match(match[1], /<em>itálico<\/em> normal/);
    });
});

describe('renderVisualizacaoHtml — Autoria (item 8/Autoria, faltava na Visualização)', () => {
    beforeEach(() => {
        db.autores = [];
    });

    it('mostra a linha "Autoria" no formato "Nome (Papel)" quando o item tem vínculo', () => {
        db.autores = [{ id: 1, nome: 'Victor Leme', sobre: '' }];
        const item = {
            id: 1,
            tipo: 'poema',
            titulo: 'T',
            texto: 'x',
            autoria: [{ autorId: 1, papel: 'Autor' }],
        };
        const html = renderVisualizacaoHtml(item);
        assert.match(html, /<strong[^>]*>Autoria:<\/strong> Victor Leme \(Autor\)/);
    });

    it('não mostra a linha "Autoria" quando o campo não está preenchido (dado ainda não migrado)', () => {
        const item = { id: 1, tipo: 'poema', titulo: 'T', texto: 'x' };
        const html = renderVisualizacaoHtml(item);
        assert.ok(!html.includes('Autoria:'));
    });

    it('a linha "Autoria" tem margem acima (mt-4), pra não ficar colada no bloco de Texto/Notas', () => {
        db.autores = [{ id: 1, nome: 'Victor Leme', sobre: '' }];
        const item = {
            id: 1,
            tipo: 'poema',
            titulo: 'T',
            texto: 'x',
            autoria: [{ autorId: 1, papel: 'Autor' }],
        };
        const html = renderVisualizacaoHtml(item);
        const match = html.match(/<p class="([^"]*)"><strong[^>]*>Autoria:/);
        assert.ok(match, 'deveria existir a linha de Autoria com classe própria');
        assert.match(match[1], /\bmt-4\b/);
    });
});

describe('renderVisualizacaoHtml — Envios e Reações (item 7, faltava na Visualização)', () => {
    it('mostra o bloco "Envios e Reações" com pessoa/meio/data no início de cada linha', () => {
        const item = {
            id: 1,
            tipo: 'poema',
            titulo: 'T',
            texto: 'x',
            envios: [
                {
                    pessoa: 'Dani',
                    data: { dia: 12, mes: 5, ano: 2023 },
                    meio: 'WhatsApp',
                    reacao: 'Achou a metáfora da aragonita bonita.',
                    notas: '',
                },
            ],
        };
        const html = renderVisualizacaoHtml(item);
        assert.match(html, /<h4[^>]*>Envios e Reações<\/h4>/);
        assert.match(
            html,
            /<strong>Dani, via WhatsApp, 12\/05\/2023:<\/strong> Achou a metáfora da aragonita bonita\./,
        );
    });

    it('mostra a nota entre parênteses e em itálico, separada da reação', () => {
        const item = {
            id: 1,
            tipo: 'poema',
            titulo: 'T',
            texto: 'x',
            envios: [{ pessoa: 'Dani', reacao: 'Gostou', notas: 'Enviei sem querer 2x' }],
        };
        const html = renderVisualizacaoHtml(item);
        assert.match(html, /Gostou <em>\(Enviei sem querer 2x\)<\/em>/);
    });

    it('não mostra o bloco "Envios e Reações" quando não há envios (campo ausente ou lista vazia)', () => {
        const item = { id: 1, tipo: 'poema', titulo: 'T', texto: 'x', envios: [] };
        const html = renderVisualizacaoHtml(item);
        assert.ok(!html.includes('Envios e Reações'));
    });

    it('preserva quebras de linha dentro da Reação (whitespace-pre-wrap no <li>, não só nos blocos de texto longo)', () => {
        const item = {
            id: 1,
            tipo: 'poema',
            titulo: 'T',
            texto: 'x',
            envios: [{ pessoa: 'Dani', reacao: 'Primeira linha\nSegunda linha' }],
        };
        const html = renderVisualizacaoHtml(item);
        const match = html.match(/<li class="([^"]*)"><strong>Dani:<\/strong>[\s\S]*?<\/li>/);
        assert.ok(match, 'deveria existir o <li> do envio da Dani');
        assert.match(match[1], /\bwhitespace-pre-wrap\b/);
        // o \n literal precisa sobreviver no HTML gerado (é o CSS que faz
        // a quebra aparecer, mas o caractere em si não pode ter sido
        // substituído/colapsado antes de chegar no DOM)
        assert.ok(html.includes('Primeira linha\nSegunda linha'));
    });
});

describe('renderVisualizacaoHtml — Reconhecimentos (item 8, faltava na Visualização)', () => {
    it('mostra o bloco "Reconhecimentos" com prêmio/posição/ano no início de cada linha', () => {
        const item = {
            id: 1,
            tipo: 'poema',
            titulo: 'beija-flor',
            texto: 'x',
            reconhecimentos: [
                {
                    premio: 'Concurso X',
                    posicao: '1º lugar',
                    ano: 2020,
                    texto: 'Categoria poesia.',
                },
            ],
        };
        const html = renderVisualizacaoHtml(item);
        assert.match(html, /<h4[^>]*>Reconhecimentos<\/h4>/);
        assert.match(html, /<strong>Concurso X, 1º lugar, 2020:<\/strong> Categoria poesia\./);
    });

    it('não mostra o bloco "Reconhecimentos" quando não há reconhecimentos (campo ausente ou lista vazia)', () => {
        const item = { id: 1, tipo: 'poema', titulo: 'T', texto: 'x', reconhecimentos: [] };
        const html = renderVisualizacaoHtml(item);
        assert.ok(!html.includes('Reconhecimentos'));
    });

    it('omite campos ausentes do início da linha (ex.: sem ano)', () => {
        const item = {
            id: 1,
            tipo: 'poema',
            titulo: 'T',
            texto: 'x',
            reconhecimentos: [{ premio: 'Concurso X', posicao: '1º lugar', texto: 'Nota' }],
        };
        const html = renderVisualizacaoHtml(item);
        assert.match(html, /<strong>Concurso X, 1º lugar:<\/strong> Nota/);
    });
});
