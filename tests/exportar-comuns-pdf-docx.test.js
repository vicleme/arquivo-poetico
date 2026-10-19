import './helpers/localstorage-shim.js';
import './helpers/dom-shim.js';
import { instalarJsPdfFalso, removerJsPdfFalso } from './helpers/jspdf-shim.js';
import { instalarDocxReal, removerDocxReal } from './helpers/docx-shim.js';

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Packer } from 'docx';
import JSZip from 'jszip';

import { db } from '../js/db.js';
import { gerarPdfExportacao } from '../js/exportar-pdf.js';
import { gerarDocxDocumento } from '../js/exportar-docx.js';

function resetarDb() {
    db.livros = [];
    db.partes = [];
    db.secoes = [];
    db.poemas = [];
    db.prosas = [];
    db.elementos = [];
    db.coletaneas = [];
    db.itensColetanea = [];
    db.pessoas = [];
    db.grupos = [];
    db.autores = [{ id: 1, nome: 'Victor Leme', sobre: '' }];
    db.movimentosEscolas = [];
}

const autoria = [{ autorId: 1, papel: 'Autor' }];
const poema = (id, extra = {}) => ({
    id,
    tipo: 'poema',
    titulo: `Poema ${id}`,
    texto: `verso ${id}`,
    autoria,
    fonteTexto: { origem: 'Obra própria' },
    ...extra,
});

const contar = (texto, re) => (texto.match(re) || []).length;

function textoPdf(doc) {
    return doc.chamadas
        .filter((c) => c.tipo === 'text')
        .map((c) => c.texto)
        .join('\n');
}

async function textoDocx(documento) {
    const zip = await JSZip.loadAsync(await Packer.toBuffer(documento));
    const xml = await zip.file('word/document.xml').async('string');
    return (xml.match(/<w:t(?: [^>]*)?>[^<]*<\/w:t>/g) || [])
        .map((t) => t.replace(/<[^>]+>/g, ''))
        .join('\n');
}

describe('PDF com linhas comuns', () => {
    beforeEach(() => {
        resetarDb();
        instalarJsPdfFalso();
    });
    afterEach(removerJsPdfFalso);

    it('sobe Autoria e Fonte iguais para o topo, uma vez só', () => {
        const texto = textoPdf(gerarPdfExportacao([poema(1), poema(2), poema(3)]));
        assert.match(texto, /Comum a todos os textos/);
        assert.equal(contar(texto, /Autoria:/g), 1);
        assert.equal(contar(texto, /Fonte:/g), 1);
        assert.match(texto, /Poema 1/);
        assert.match(texto, /verso\s+3/);
    });

    it('com agruparComuns: false, cada texto leva as suas linhas', () => {
        const texto = textoPdf(gerarPdfExportacao([poema(1), poema(2)], { agruparComuns: false }));
        assert.doesNotMatch(texto, /Comum a todos os textos/);
        assert.equal(contar(texto, /Autoria:/g), 2);
    });

    it('um texto só sai completo, sem bloco comum', () => {
        const texto = textoPdf(gerarPdfExportacao([poema(1)]));
        assert.doesNotMatch(texto, /Comum a todos os textos/);
        assert.equal(contar(texto, /Autoria:/g), 1);
    });

    it('o que difere entre os textos continua em cada um', () => {
        const texto = textoPdf(
            gerarPdfExportacao([poema(1), poema(2, { fonteTexto: { origem: 'Antologia X' } })]),
        );
        assert.equal(contar(texto, /Autoria:/g), 1);
        assert.equal(contar(texto, /Fonte:/g), 2);
    });
});

describe('DOCX com linhas comuns', () => {
    beforeEach(() => {
        resetarDb();
        instalarDocxReal();
    });
    afterEach(removerDocxReal);

    it('sobe Autoria e Fonte iguais para o topo, uma vez só', async () => {
        const texto = await textoDocx(gerarDocxDocumento([poema(1), poema(2), poema(3)]));
        assert.match(texto, /Comum a todos os textos/);
        assert.equal(contar(texto, /Autoria:/g), 1);
        assert.equal(contar(texto, /Fonte:/g), 1);
        assert.match(texto, /Poema 2/);
        assert.match(texto, /verso 3/);
    });

    it('com agruparComuns: false, cada texto leva as suas linhas', async () => {
        const texto = await textoDocx(
            gerarDocxDocumento([poema(1), poema(2)], { agruparComuns: false }),
        );
        assert.doesNotMatch(texto, /Comum a todos os textos/);
        assert.equal(contar(texto, /Autoria:/g), 2);
    });

    it('um texto só sai completo, sem bloco comum', async () => {
        const texto = await textoDocx(gerarDocxDocumento([poema(1)]));
        assert.doesNotMatch(texto, /Comum a todos os textos/);
        assert.equal(contar(texto, /Autoria:/g), 1);
    });

    it('o que difere entre os textos continua em cada um', async () => {
        const texto = await textoDocx(
            gerarDocxDocumento([poema(1), poema(2, { fonteTexto: { origem: 'Antologia X' } })]),
        );
        assert.equal(contar(texto, /Autoria:/g), 1);
        assert.equal(contar(texto, /Fonte:/g), 2);
    });
});
