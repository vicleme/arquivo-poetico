// dom-real.js (happy-dom), não dom-shim.js como os outros
// exportar-*.test.js — precisamos de um window.localStorage de
// verdade pra exercitar o toggle "Mostrar Ecos Sonoros"
// (mostrarEcosAtivo/definirMostrarEcos em editor-sonoridade.js, que
// escansaoParaMarkdown consulta); dom-shim.js não expõe
// window.localStorage, então o toggle nunca refletiria mudança sob
// ele. Mesmo motivo de editor-sonoridade.test.js usar dom-real.js.
import './helpers/dom-real.js';
import { instalarJsPdfFalso, removerJsPdfFalso } from './helpers/jspdf-shim.js';
import { instalarDocxReal, removerDocxReal } from './helpers/docx-shim.js';

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Packer } from 'docx';
import JSZip from 'jszip';

import { escansaoParaMarkdown, gerarPdfEscansao, gerarDocxEscansao } from '../js/exportar-sonoridade.js';
import { definirMostrarEcos } from '../js/editor-sonoridade.js';

// ─── Fixture compartilhado ───────────────────────────────────────────
// 2 versos de 2 sílabas, com um Par de Rima (v.1↔v.2, última sílaba de
// cada = "Externa", distância 1 = "Vizinha") e um Eco Sonoro no mesmo
// par de posições — valores conferidos contra os testes já existentes
// de calcularLetrasRima/calcularPosicaoPar/calcularProximidadePar em
// editor-sonoridade.test.js, pra não inventar comportamento.
const linhas = [
    { tipo: 'verso', numero: 1, texto: 'Um/Dois', tonicas: [1] },
    { tipo: 'verso', numero: 2, texto: 'Tres/Quatro', tonicas: [] },
];
const par = {
    a: { linha: 0, silabas: [1] },
    b: { linha: 1, silabas: [1] },
    acentuacao: 'Oxítona',
    tonalidade: 'Soante',
    riqueza: 'Rica',
};
const eco = { a: { linha: 0, silabas: [1] }, b: { linha: 1, silabas: [1] }, tipo: 'Assonância' };

const poema = { id: 10, titulo: 'Meu Poema' };

function esCompleta() {
    return {
        id: 5,
        poemaId: 10,
        formaPoema: 'Soneto',
        regularidadeMetrica: 'Regular',
        tamanhoVerso: 'Redondilha maior',
        esquemaRimasPresenca: 'Com rima',
        esquemaRimasPadrao: 'ABAB',
        origemTradicao: 'Petrarquiano',
        registro: 'Culto',
        tom: 'Melancólico',
        escansaoLinhas: linhas,
        rimas: [par],
        ecos: [eco],
    };
}

beforeEach(() => {
    // Mostrar Ecos Sonoros começa ligado por padrão (ver
    // mostrarEcosAtivo em editor-sonoridade.js) — garante estado
    // limpo entre testes, já que a preferência é persistida.
    definirMostrarEcos(true);
});

// ─── .md ──────────────────────────────────────────────────────────
describe('escansaoParaMarkdown', () => {
    it('sem nenhum campo/linha/rima/eco, só o título aparece', () => {
        const md = escansaoParaMarkdown({ id: 7 }, null);
        assert.equal(md, '## Escansão — #7\n\n');
    });

    it('usa o título do poema quando disponível', () => {
        const md = escansaoParaMarkdown({ id: 7 }, poema);
        assert.match(md, /^## Escansão — Meu Poema\n\n/);
    });

    it('lista só os campos de classificação preenchidos', () => {
        const md = escansaoParaMarkdown({ id: 1, formaPoema: 'Soneto' }, poema);
        assert.match(md, /\*\*Forma:\*\* Soneto/);
        assert.ok(!md.includes('Regularidade Métrica'));
    });

    it('junta Presença + Padrão do Esquema de Rimas numa linha só', () => {
        const md = escansaoParaMarkdown(
            { id: 1, esquemaRimasPresenca: 'Com rima', esquemaRimasPadrao: 'ABAB' },
            poema,
        );
        assert.match(md, /\*\*Esquema de Rimas:\*\* Com rima · ABAB/);
    });

    it('Grade Silábica: sílaba tônica em negrito, letra de rima entre parênteses', () => {
        const md = escansaoParaMarkdown(esCompleta(), poema);
        assert.match(md, /### Grade Silábica/);
        assert.match(md, /1\. Um \/ \*\*Dois\*\* \(A\)/);
        assert.match(md, /2\. Tres \/ Quatro \(A\)/);
    });

    it('Pares de Rima: letra, versos, trechos, posição/proximidade e classificação', () => {
        const md = escansaoParaMarkdown(esCompleta(), poema);
        assert.match(md, /### Pares de Rima/);
        assert.match(
            md,
            /\*\*A\*\* — v\.1 "Dois" ↔ v\.2 "Quatro" \(Externa · Vizinha\) — Oxítona · Soante · Rica/,
        );
    });

    it('Ecos Sonoros aparecem quando o toggle "Mostrar Ecos" está ligado', () => {
        definirMostrarEcos(true);
        const md = escansaoParaMarkdown(esCompleta(), poema);
        assert.match(md, /### Ecos Sonoros/);
        assert.match(md, /v\.1 "Dois" ↔ v\.2 "Quatro" \(Externa · Vizinha\) — Assonância/);
    });

    it('Ecos Sonoros somem inteiros quando o toggle está desligado', () => {
        definirMostrarEcos(false);
        const md = escansaoParaMarkdown(esCompleta(), poema);
        assert.ok(!md.includes('### Ecos Sonoros'));
    });

    it('sem escansaoLinhas, Grade Silábica não aparece (não há versos pra listar)', () => {
        const md = escansaoParaMarkdown({ id: 1, rimas: [par] }, poema);
        assert.ok(!md.includes('### Grade Silábica'));
    });

    // Caso de dado inconsistente (rimas sem as linhas que elas referenciam
    // — não deveria ocorrer via UI, mas a função não guarda contra isso):
    // "### Pares de Rima" ainda aparece, com números/trechos de verso em
    // branco ("v.?", trecho vazio). Registrando o comportamento real
    // (inclui a proximidade saindo como texto "null", já que
    // calcularProximidadePar não tem distância pra calcular sem linhas) —
    // não é o ideal, mas é o que a implementação atual faz.
    it('rimas sem escansaoLinhas (dado inconsistente): Pares de Rima ainda aparece, degradado', () => {
        const md = escansaoParaMarkdown({ id: 1, rimas: [par] }, poema);
        assert.match(md, /### Pares de Rima/);
        assert.match(md, /v\.\? "" ↔ v\.\? "" \(Interna · null\)/);
    });
});

// ─── .pdf ─────────────────────────────────────────────────────────
describe('gerarPdfEscansao', () => {
    beforeEach(() => instalarJsPdfFalso());
    afterEach(() => removerJsPdfFalso());

    it('lança erro claro se a biblioteca de PDF não carregou', () => {
        removerJsPdfFalso();
        assert.throws(() => gerarPdfEscansao({ id: 1 }, poema), /biblioteca de PDF não carregou/);
    });

    it('gera um documento sem lançar, mesmo sem campos/linhas', () => {
        const doc = gerarPdfEscansao({ id: 1 }, null);
        assert.ok(doc);
    });

    it('escreve o título do poema e os campos de classificação preenchidos', () => {
        const doc = gerarPdfEscansao(esCompleta(), poema);
        const textos = doc.chamadas.filter((c) => c.tipo === 'text').map((c) => c.texto);
        assert.ok(textos.some((t) => String(t).includes('Meu Poema')));
        assert.ok(textos.some((t) => String(t).includes('Soneto')));
    });
});

// ─── .docx ────────────────────────────────────────────────────────
describe('gerarDocxEscansao', () => {
    beforeEach(() => instalarDocxReal());
    afterEach(() => removerDocxReal());

    it('lança erro claro se a biblioteca de .docx não carregou', () => {
        removerDocxReal();
        assert.throws(
            () => gerarDocxEscansao({ id: 1 }, poema),
            /biblioteca de \.docx não carregou/,
        );
    });

    it('gera um Document válido (empacota sem lançar), mesmo sem campos/linhas', async () => {
        const documento = gerarDocxEscansao({ id: 1 }, null);
        const buffer = await Packer.toBuffer(documento);
        assert.ok(buffer.length > 0);
    });

    it('o document.xml contém o título do poema e um campo de classificação', async () => {
        const documento = gerarDocxEscansao(esCompleta(), poema);
        const buffer = await Packer.toBuffer(documento);
        const zip = await JSZip.loadAsync(buffer);
        const xml = await zip.file('word/document.xml').async('string');
        assert.match(xml, /Meu Poema/);
        assert.match(xml, /Soneto/);
    });
});
