import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { flattenLivroAninhado, juntarTextosRepetidos, rotuloDosLugares } from '../js/nesting.js';

// Fase 21, pendência do `filtrar.html`: texto em dois livros sai duas vezes do
// desaninhamento; a lista de lá trabalha por tipo e id e precisa de uma linha
// por texto, com todos os lugares.

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const livro = (titulo, parteTitulo, poemas) => ({
    titulo,
    conteudo_partes: [{ titulo: parteTitulo, conteudo_poemas_diretos: poemas }],
});

describe('juntarTextosRepetidos', () => {
    it('texto em dois livros vira uma linha com os dois lugares', () => {
        const poemas = [];
        flattenLivroAninhado(livro('L1', 'Alfa', [{ id: 7, titulo: 'Dois' }]), poemas, []);
        flattenLivroAninhado(livro('L2', 'Beta', [{ id: 7, titulo: 'Dois' }]), poemas, []);
        assert.equal(poemas.length, 2);
        const junto = juntarTextosRepetidos(poemas);
        assert.equal(junto.length, 1);
        assert.deepEqual(junto[0].contexto, { livro: 'L1', parte: 'Alfa', secao: null });
        assert.deepEqual(
            junto[0].contextos.map((c) => c.livro),
            ['L1', 'L2'],
        );
        assert.equal(rotuloDosLugares(junto[0]), 'L1, L2');
    });

    it('mantém a ordem da primeira aparição e não mexe em texto que aparece uma vez', () => {
        const lista = [
            { id: 1, contexto: { livro: 'A', parte: null, secao: null } },
            { id: 2, contexto: { livro: 'A', parte: null, secao: null } },
            { id: 1, contexto: { livro: 'B', parte: null, secao: null } },
        ];
        const junto = juntarTextosRepetidos(lista);
        assert.deepEqual(
            junto.map((x) => x.id),
            [1, 2],
        );
        assert.equal('contextos' in junto[1], false);
        assert.equal(rotuloDosLugares(junto[1]), 'A');
    });

    it('o mesmo lugar duas vezes não vira dois lugares, e id de tipo diferente (texto x número) casa', () => {
        const ctx = { livro: 'A', parte: 'P', secao: null };
        const junto = juntarTextosRepetidos([
            { id: 5, contexto: { ...ctx } },
            { id: '5', contexto: { ...ctx } },
        ]);
        assert.equal(junto.length, 1);
        assert.equal('contextos' in junto[0], false);
    });

    it('item sem id passa como está', () => {
        const a = { titulo: 'sem id' };
        const b = { titulo: 'sem id' };
        assert.equal(juntarTextosRepetidos([a, b]).length, 2);
    });
});

describe('rotuloDosLugares', () => {
    it('usa livro, senão Parte, senão Seção, e null sem contexto', () => {
        assert.equal(rotuloDosLugares({ contexto: { livro: 'L', parte: 'P' } }), 'L');
        assert.equal(rotuloDosLugares({ contexto: { livro: null, parte: 'P' } }), 'P');
        assert.equal(rotuloDosLugares({ contexto: { secao: 'S' } }), 'S');
        assert.equal(
            rotuloDosLugares({ contexto: { livro: null, parte: null, secao: null } }),
            null,
        );
        assert.equal(rotuloDosLugares({}), null);
    });
});

describe('filtrar.html usa a junção nos três formatos aninhados', () => {
    it('as três montagens de db e o rótulo passam por juntarTextosRepetidos e rotuloDosLugares', () => {
        const html = fs.readFileSync(path.resolve(__dirname, '../filtrar.html'), 'utf8');
        assert.equal((html.match(/poemas: juntarTextosRepetidos\(poemasOut\)/g) || []).length, 3);
        assert.equal((html.match(/prosas: juntarTextosRepetidos\(prosasOut\)/g) || []).length, 3);
        assert.match(html, /return rotuloDosLugares\(item\)/);
        assert.match(html, /juntarTextosRepetidos = m\.juntarTextosRepetidos/);
    });
});
