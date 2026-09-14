import './helpers/localstorage-shim.js';
import './helpers/dom-shim.js';
import { instalarJsPdfFalso, removerJsPdfFalso } from './helpers/jspdf-shim.js';
import { instalarDocxReal, removerDocxReal } from './helpers/docx-shim.js';

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Packer } from 'docx';
import JSZip from 'jszip';

import {
    estruturaParaMarkdown,
    gerarPdfEstrutura,
    gerarDocxEstrutura,
    rotuloItem,
} from '../js/exportar-estrutura-textual.js';

const poema = { id: 10, titulo: 'Soneto de Separação' };

function estruturaCompleta() {
    return {
        id: 3,
        poemaId: 10,
        unidades: [
            {
                id: 'u1',
                unidadeEstrofica: 'Quartetos',
                unidadeDiscursiva: 'Proposição',
                posicao: { estrofes: [1, 2], versos: 'todos' },
            },
            {
                id: 'u2',
                unidadeEstrofica: 'Tercetos',
                unidadeDiscursiva: 'Resolução',
                posicao: { estrofes: [], versos: 'todos' }, // não posicionado
            },
        ],
        eventos: [
            {
                id: 'e1',
                progressaoDialetica: 'Volta',
                posicao: { estrofes: [4], versos: [1] },
            },
        ],
    };
}

// ─── rotuloItem ───────────────────────────────────────────────────
describe('rotuloItem', () => {
    it('Unidade: junta unidadeEstrofica + unidadeDiscursiva com " · "', () => {
        const u = { unidadeEstrofica: 'Quartetos', unidadeDiscursiva: 'Proposição' };
        assert.equal(rotuloItem('unidade', u), 'Quartetos · Proposição');
    });

    it('Unidade sem nenhum dos dois campos cai em "Sem classificação"', () => {
        assert.equal(rotuloItem('unidade', {}), 'Sem classificação');
    });

    it('Evento usa progressaoDialetica direto, ou "Sem classificação" se vazio', () => {
        assert.equal(rotuloItem('evento', { progressaoDialetica: 'Volta' }), 'Volta');
        assert.equal(rotuloItem('evento', {}), 'Sem classificação');
    });
});

// ─── .md ──────────────────────────────────────────────────────────
describe('estruturaParaMarkdown', () => {
    it('usa o título do poema, ou "#id" se o poema não for encontrado', () => {
        assert.match(estruturaParaMarkdown({ id: 9 }, poema), /^## Progressão Morfofuncional — Soneto de Separação/);
        assert.match(estruturaParaMarkdown({ id: 9 }, null), /^## Progressão Morfofuncional — #9/);
    });

    it('sem Unidades/Eventos, cada seção mostra a mensagem de "nenhum cadastrado"', () => {
        const md = estruturaParaMarkdown({ id: 1 }, poema);
        assert.match(md, /### Unidades\n\n_Nenhuma Unidade cadastrada\._/);
        assert.match(md, /### Eventos\n\n_Nenhum Evento cadastrado\._/);
    });

    it('lista Unidades e Eventos com rótulo + resumo de posição, incluindo "Não posicionado"', () => {
        const md = estruturaParaMarkdown(estruturaCompleta(), poema);
        assert.match(md, /- \*\*Quartetos · Proposição\*\* — Estrofes 1, 2, todos os versos/);
        assert.match(md, /- \*\*Tercetos · Resolução\*\* — Não posicionado/);
        assert.match(md, /- \*\*Volta\*\* — Estrofe 4, verso 1/);
    });

    it('ordena os itens por posição no texto, não pela ordem de criação (não posicionados por último)', () => {
        const estrutura = {
            id: 1,
            unidades: [
                { unidadeEstrofica: 'Tercetos', posicao: { estrofes: [3], versos: 'todos' } },
                { unidadeEstrofica: 'Quartetos', posicao: { estrofes: [1], versos: 'todos' } },
                { unidadeEstrofica: 'Sem posição', posicao: { estrofes: [], versos: 'todos' } },
            ],
        };
        const md = estruturaParaMarkdown(estrutura, poema);
        const secaoUnidades = md.split('### Unidades')[1].split('### Eventos')[0];
        const ordem = [...secaoUnidades.matchAll(/\*\*([^*]+)\*\*/g)].map((m) => m[1]);
        assert.deepEqual(ordem, ['Quartetos', 'Tercetos', 'Sem posição']);
    });
});

// ─── .pdf ─────────────────────────────────────────────────────────
describe('gerarPdfEstrutura', () => {
    beforeEach(() => instalarJsPdfFalso());
    afterEach(() => removerJsPdfFalso());

    it('lança erro claro se a biblioteca de PDF não carregou', () => {
        removerJsPdfFalso();
        assert.throws(() => gerarPdfEstrutura({ id: 1 }, poema), /biblioteca de PDF não carregou/);
    });

    it('gera um documento sem lançar, mesmo sem Unidades/Eventos', () => {
        const doc = gerarPdfEstrutura({ id: 1 }, null);
        assert.ok(doc);
    });

    it('escreve o título do poema e os rótulos de Unidade/Evento', () => {
        const doc = gerarPdfEstrutura(estruturaCompleta(), poema);
        const textos = doc.chamadas.filter((c) => c.tipo === 'text').map((c) => c.texto);
        assert.ok(textos.some((t) => String(t).includes('Soneto de Separação')));
        assert.ok(textos.some((t) => String(t).includes('Quartetos · Proposição')));
        assert.ok(textos.some((t) => String(t).includes('Volta')));
    });
});

// ─── .docx ────────────────────────────────────────────────────────
describe('gerarDocxEstrutura', () => {
    beforeEach(() => instalarDocxReal());
    afterEach(() => removerDocxReal());

    it('lança erro claro se a biblioteca de .docx não carregou', () => {
        removerDocxReal();
        assert.throws(
            () => gerarDocxEstrutura({ id: 1 }, poema),
            /biblioteca de \.docx não carregou/,
        );
    });

    it('gera um Document válido (empacota sem lançar), mesmo sem Unidades/Eventos', async () => {
        const documento = gerarDocxEstrutura({ id: 1 }, null);
        const buffer = await Packer.toBuffer(documento);
        assert.ok(buffer.length > 0);
    });

    it('o document.xml contém o título do poema e os rótulos de Unidade/Evento', async () => {
        const documento = gerarDocxEstrutura(estruturaCompleta(), poema);
        const buffer = await Packer.toBuffer(documento);
        const zip = await JSZip.loadAsync(buffer);
        const xml = await zip.file('word/document.xml').async('string');
        assert.match(xml, /Soneto de Separação/);
        assert.match(xml, /Quartetos · Proposição/);
        assert.match(xml, /Volta/);
    });
});
