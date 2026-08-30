import './helpers/localstorage-shim.js';
import './helpers/dom-shim.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { db } from '../js/db.js';
import { gerarMarkdownExportacao } from '../js/exportar-md.js';

function resetarDb() {
    db.livros = [];
    db.partes = [];
    db.secoes = [];
    db.poemas = [];
    db.prosas = [];
    db.elementos = [];
    db.coletaneas = [];
    db.itensColetanea = [];
}

describe('gerarMarkdownExportacao — Elos e Referências', () => {
    beforeEach(resetarDb);

    it('resolve os ids de conceitos.elos/referencias pros títulos dos poemas ligados', () => {
        db.poemas = [
            { id: 1, titulo: 'Poema A', texto: 'linha 1' },
            { id: 2, titulo: 'Poema B', texto: 'linha 2' },
            {
                id: 3,
                titulo: 'Poema C',
                texto: 'linha 3',
                conceitos: { elos: [1], referencias: [1, 2] },
            },
        ];

        const md = gerarMarkdownExportacao([db.poemas[2]]);

        assert.match(md, /\*\*Elos:\*\* Poema A/);
        assert.match(md, /\*\*Referências:\*\* Poema A, Poema B/);
    });

    it('omite as linhas de Elos/Referências quando o item não tem conceitos', () => {
        db.poemas = [{ id: 1, titulo: 'Solo', texto: 'linha única' }];

        const md = gerarMarkdownExportacao(db.poemas);

        assert.doesNotMatch(md, /\*\*Elos:\*\*/);
        assert.doesNotMatch(md, /\*\*Referências:\*\*/);
    });

    it('ignora ids de elos/referências que não correspondem a nenhum poema existente', () => {
        db.poemas = [
            { id: 1, titulo: 'Único', texto: 'x', conceitos: { elos: [999], referencias: [] } },
        ];

        const md = gerarMarkdownExportacao(db.poemas);

        assert.doesNotMatch(md, /\*\*Elos:\*\*/);
    });
});
