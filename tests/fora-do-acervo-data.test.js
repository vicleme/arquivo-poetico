import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { montarForaDoAcervo } from '../js/fora-do-acervo.js';

// Data da obra (entrega 5): o índice de obras e de referências traz a data.

const ano = (n, extra = {}) => ({ nivel: 'ano', ano: n, ...extra });

function montar() {
    const poemas = [
        {
            id: 1,
            titulo: 'A',
            intertextualidade: [
                { obra: 'Águas de Março', autores: ['Tom Jobim'], dataObra: ano(1972) },
            ],
            referenciasExternas: [
                {
                    tipo: 'Pessoa pública',
                    texto: 'Machado de Assis',
                    dataObra: ano(1839),
                    dataObraAte: ano(1908),
                },
            ],
        },
        {
            id: 2,
            titulo: 'B',
            intertextualidade: [
                { obra: 'águas de março', autores: ['tom jobim'], dataObra: ano(1972) },
            ],
            hipertextualidade: [{ hipotexto: 'Dom Casmurro', autores: ['Machado de Assis'] }],
            referenciasExternas: [
                { tipo: 'Pessoa pública', texto: 'machado de assis', dataObra: ano(1839) },
            ],
        },
    ];
    const prosas = [
        {
            id: 3,
            titulo: 'C',
            intertextualidade: [
                { obra: 'Águas de Março', autores: ['Tom Jobim'], dataObra: ano(1973) },
                { obra: 'Sem data', autores: [] },
            ],
        },
    ];
    return montarForaDoAcervo({ poemas, prosas });
}

describe('a data nas obras', () => {
    it('a obra traz o par mais usado e todos os pares, do mais usado ao menos usado', () => {
        const obra = montar().obras.find((o) => o.obra === 'Águas de Março');
        assert.equal(obra.dataObra.ano, 1972);
        assert.equal(obra.dataObraAte, null);
        assert.deepEqual(
            obra.datas.map((d) => [d.texto, d.usos]),
            [
                ['1972', 2],
                ['1973', 1],
            ],
        );
    });

    it('obra sem data fica com null e lista vazia', () => {
        const { obras } = montar();
        for (const nome of ['Sem data', 'Dom Casmurro']) {
            const obra = obras.find((o) => o.obra === nome);
            assert.equal(obra.dataObra, null);
            assert.equal(obra.dataObraAte, null);
            assert.deepEqual(obra.datas, []);
        }
    });

    it('a data não muda a identidade da obra', () => {
        const { obras } = montar();
        assert.equal(obras.filter((o) => o.chaveObra === 'aguas de marco').length, 1);
    });
});

describe('a data nas referências', () => {
    it('a pessoa traz o nascimento e o óbito do par mais usado', () => {
        const { referencias } = montar();
        const machado = referencias.find((r) => r.chave.endsWith('machado de assis'));
        assert.equal(machado.dataObra.ano, 1839);
        assert.equal(machado.dataObraAte.ano, 1908);
        assert.deepEqual(
            machado.datas.map((d) => d.texto),
            ['1839 até 1908', '1839'],
            'empate de usos: o par com as duas pontas vem primeiro',
        );
    });
});

describe('sem data nada muda', () => {
    it('um acervo sem datas devolve null e lista vazia em tudo', () => {
        const r = montarForaDoAcervo({
            poemas: [
                {
                    id: 1,
                    titulo: 'A',
                    intertextualidade: [{ obra: 'X', autores: [] }],
                    referenciasExternas: [{ tipo: 'Notícia', texto: 'Y' }],
                },
            ],
        });
        assert.equal(r.obras[0].dataObra, null);
        assert.deepEqual(r.obras[0].datas, []);
        assert.equal(r.referencias[0].dataObra, null);
        assert.deepEqual(r.referencias[0].datas, []);
    });
});
