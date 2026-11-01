// dom-real.js: montarRegistro (exportar.js) puxa a cadeia de imports com DOM.
import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const { db } = await import('../js/db.js');
const { montarRegistro } = await import('../js/exportar.js');
const { gerarCsvTextos } = await import('../js/exportar-csv.js');
const { gerarMarkdownItem } = await import('../js/exportar-md.js');

function montarBanco() {
    db.livros = [
        { id: 1, tipo: 'Coletânea', titulo: 'Seleta B', sequencia: 2 },
        { id: 3, tipo: 'Coletânea', titulo: 'Seleta A', sequencia: 1 },
    ];
    db.partes = [
        { id: 10, livroId: 1, titulo: 'Parte 1' },
        { id: 11, livroId: 1, titulo: 'Parte 2' },
        { id: 12, livroId: 3, titulo: 'Parte única' },
    ];
    db.itensColetanea = [
        { id: 1, parteId: 10, refTipo: 'poema', refId: 50 },
        { id: 2, parteId: 11, refTipo: 'poema', refId: 50 },
        { id: 3, parteId: 12, refTipo: 'poema', refId: 50 },
        { id: 4, parteId: 10, refTipo: 'prosa', refId: 50 },
    ];
    db.poemas = [
        { id: 50, titulo: 'Em duas coletâneas', texto: 'verso um verso dois' },
        { id: 51, titulo: 'Em nenhuma', texto: 'verso solto' },
    ];
    db.prosas = [{ id: 50, titulo: 'Prosa em uma', texto: 'um parágrafo' }];
}

const registroPoema = (id) =>
    montarRegistro(
        'poema',
        db.poemas.find((p) => p.id === id),
    );

// Leitor mínimo: cabeçalho e primeira linha, sem aspas no que testamos.
function colunaDoCsv(csv, nome) {
    const limpo = csv.charCodeAt(0) === 0xfeff ? csv.slice(1) : csv;
    const [cab, linha] = limpo.split('\n');
    return linha.split(',')[cab.split(',').indexOf(nome)];
}

describe('Coletâneas do texto nas exportações', () => {
    beforeEach(montarBanco);

    it('.json: contexto.coletaneas leva os títulos na ordem do acervo', () => {
        assert.deepEqual(registroPoema(50).contexto.coletaneas, ['Seleta A', 'Seleta B']);
    });

    it('.json: texto fora de Coletâneas leva lista vazia', () => {
        assert.deepEqual(registroPoema(51).contexto.coletaneas, []);
    });

    it('.json: na Prosa, só as Coletâneas dela', () => {
        const r = montarRegistro('prosa', db.prosas[0]);
        assert.deepEqual(r.contexto.coletaneas, ['Seleta B']);
    });

    it('.csv: coluna coletaneas, títulos separados por " | "', () => {
        const csv = gerarCsvTextos('poema', [registroPoema(50)], db);
        assert.equal(colunaDoCsv(csv, 'coletaneas'), 'Seleta A | Seleta B');
    });

    it('.csv: texto fora de Coletâneas fica com a célula vazia', () => {
        const csv = gerarCsvTextos('poema', [registroPoema(51)], db);
        assert.equal(colunaDoCsv(csv, 'coletaneas'), '');
    });

    it('.md: linha "Coletâneas" logo depois da Localização (vale também para .pdf e .docx)', () => {
        const md = gerarMarkdownItem(registroPoema(50));
        assert.match(md, /- \*\*Coletâneas:\*\* Seleta A, Seleta B\n/);
    });

    it('.md: texto fora de Coletâneas não ganha a linha', () => {
        const md = gerarMarkdownItem(registroPoema(51));
        assert.ok(!md.includes('Coletâneas'));
    });
});
