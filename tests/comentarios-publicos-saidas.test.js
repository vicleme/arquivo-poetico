import './helpers/dom-real.js';

import fs from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Comentários ao leitor e Notas públicas, entrega 3: .md, Ver, .csv, .json,
// o pacote da Biblioteca e a documentação.
const { db } = await import('../js/db.js');
const { montarRegistro } = await import('../js/exportar.js');
const { gerarCsvTextos } = await import('../js/exportar-csv.js');
const { gerarMarkdownItem } = await import('../js/exportar-md.js');
const { renderVisualizacaoHtml } = await import('../js/visualizar.js');

const ler = (rel) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');

db.livros = [];
db.partes = [];
db.secoes = [];
db.autores = [];
db.itensColetanea = [];

const poema = (extra = {}) => ({
    id: 1,
    titulo: 'Teste',
    texto: 'verso',
    status: 'publicado',
    notas: 'nota do autor',
    ...extra,
});

describe('.md e Ver', () => {
    it('Notas públicas e Comentários ao leitor entram logo depois de Notas', () => {
        const reg = montarRegistro(
            'poema',
            poema({ notasPublicas: true, comentariosPublicos: 'Escrito na praia' }),
        );
        const md = gerarMarkdownItem(reg);
        assert.match(md, /### Notas\n\nnota do autor/);
        assert.match(md, /### Notas públicas\n\nSim/);
        assert.match(md, /### Comentários ao leitor\n\nEscrito na praia/);
        assert.ok(md.indexOf('### Notas\n') < md.indexOf('### Notas públicas'));
        assert.ok(md.indexOf('### Notas públicas') < md.indexOf('### Comentários ao leitor'));
        const html = renderVisualizacaoHtml(reg);
        assert.match(html, /Notas públicas/);
        assert.match(html, /Comentários ao leitor/);
        assert.match(html, /Escrito na praia/);
    });
    it('sem a marca e sem comentário, nenhum dos dois blocos aparece', () => {
        for (const extra of [{}, { notasPublicas: false, comentariosPublicos: '   ' }]) {
            const reg = montarRegistro('poema', poema(extra));
            const md = gerarMarkdownItem(reg);
            assert.doesNotMatch(md, /Notas públicas/);
            assert.doesNotMatch(md, /Comentários ao leitor/);
            const html = renderVisualizacaoHtml(reg);
            assert.doesNotMatch(html, /Notas públicas/);
            assert.doesNotMatch(html, /Comentários ao leitor/);
        }
    });
    it('o comentário vai escapado no Ver', () => {
        const reg = montarRegistro('poema', poema({ comentariosPublicos: '<b>x</b>' }));
        assert.doesNotMatch(renderVisualizacaoHtml(reg), /<b>x<\/b>/);
    });
});

describe('.csv e .json', () => {
    const csvDe = (itens) => {
        db.poemas = itens;
        db.prosas = [];
        const regs = itens.map((p) => montarRegistro('poema', p));
        const csv = gerarCsvTextos('poema', regs, db);
        const limpo = csv.charCodeAt(0) === 0xfeff ? csv.slice(1) : csv;
        const [cab, ...linhas] = limpo.trim().split(/\r?\n/);
        return { cab: cab.split(','), linhas: linhas.map((l) => l.split(',')) };
    };
    it('colunas notas_publicas ("sim" ou vazio) e comentarios_ao_leitor, depois de notas', () => {
        const { cab, linhas } = csvDe([
            poema({ id: 1, notasPublicas: true, comentariosPublicos: 'oi' }),
            poema({ id: 2 }),
            poema({ id: 3, notasPublicas: false }),
        ]);
        const np = cab.indexOf('notas_publicas');
        const ca = cab.indexOf('comentarios_ao_leitor');
        assert.ok(np >= 0 && ca >= 0, 'colunas ausentes');
        assert.equal(np, cab.indexOf('notas') + 1);
        assert.equal(ca, np + 1);
        assert.deepEqual(
            linhas.map((l) => l[np]),
            ['sim', '', ''],
        );
        assert.deepEqual(
            linhas.map((l) => l[ca]),
            ['oi', '', ''],
        );
    });
    it('.json: o registro leva os dois campos (spread do item)', () => {
        const reg = montarRegistro(
            'poema',
            poema({ notasPublicas: true, comentariosPublicos: 'oi' }),
        );
        assert.equal(reg.notasPublicas, true);
        assert.equal(reg.comentariosPublicos, 'oi');
        const velho = montarRegistro('poema', poema());
        assert.equal(velho.notasPublicas, undefined);
        assert.equal(velho.comentariosPublicos, undefined);
    });
});

describe('pacote da Biblioteca e documentação', () => {
    it('o pacote de texto não leva nenhum dos dois campos', () => {
        const js = ler('../js/pacote-texto.js');
        assert.doesNotMatch(js, /notasPublicas|comentariosPublicos/);
    });
    it('os docs para IAs descrevem os dois campos, em inglês e em português', () => {
        for (const arq of [
            '../docs/campos-poema-prosa-for-ai.md',
            '../docs/campos-poema-prosa-for-ai-pt-br.md',
            '../docs/importar-campos-for-ai.md',
            '../docs/importar-campos-for-ai-pt-br.md',
        ]) {
            const txt = ler(arq);
            assert.match(txt, /`notasPublicas`/, arq);
            assert.match(txt, /`comentariosPublicos`/, arq);
        }
    });
    it('o schema e as decisões têm a seção', () => {
        assert.match(ler('../manutencao/schema.md'), /## Comentários ao leitor e Notas públicas/);
        assert.match(ler('../manutencao/decisoes.md'), /## Comentários ao leitor e Notas públicas/);
    });
    it('a Central de Ajuda tem a pergunta e o sorteio a menciona', () => {
        const faq = ler('../js/faq-conteudo.js');
        assert.match(faq, /id: 'faq-comentarios-ao-leitor'/);
        assert.match(faq, /Comentários ao leitor e, só se marcadas como Públicas, as Notas/);
    });
});
