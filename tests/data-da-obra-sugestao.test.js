import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    dataUnicaDaObra,
    dataUnicaDaReferencia,
    descricaoUnicaDaObra,
    extrairDatasDaObra,
    extrairDatasDaReferencia,
    extrairDescricoesDaObra,
} from '../js/intertextualidade.js';

// Data da obra (entrega 5): sugestão por obra e autor, no mesmo critério da
// Descrição, e a sugestão das Referências (tipo e texto).

const ano = (n, extra = {}) => ({ nivel: 'ano', ano: n, ...extra });

function acervo() {
    return [
        {
            id: 1,
            intertextualidade: [
                {
                    tipoObra: 'Música',
                    obra: 'Águas de Março',
                    autores: ['Tom Jobim'],
                    descricao: 'canção',
                    dataObra: ano(1972),
                },
                {
                    tipoObra: 'Livro',
                    obra: 'Dom Casmurro',
                    autores: ['Machado de Assis'],
                    dataObra: ano(1899),
                },
            ],
            hipertextualidade: [
                {
                    tipoObra: 'Livro',
                    hipotexto: 'dom casmurro',
                    autores: ['Machado de Assis'],
                    dataObra: ano(1899),
                },
            ],
            referenciasExternas: [
                {
                    tipo: 'Pessoa pública',
                    texto: 'Cleópatra',
                    dataObra: ano(69, { aC: true }),
                    dataObraAte: ano(30, { aC: true }),
                },
                { tipo: 'Marco histórico', texto: 'Revolução Francesa', dataObra: ano(1789) },
            ],
        },
        {
            id: 2,
            intertextualidade: [
                {
                    tipoObra: 'Música',
                    obra: 'águas de março',
                    autores: ['Elis Regina', 'Tom Jobim'],
                    dataObra: ano(1973),
                },
                { tipoObra: 'Música', obra: 'Águas de Março', autores: ['Tom Jobim'] },
            ],
            referenciasExternas: [
                { tipo: 'Pessoa pública', texto: 'cleópatra', dataObra: ano(69, { aC: true }) },
                { tipo: 'Notícia', texto: 'Revolução Francesa', dataObra: ano(1790) },
            ],
        },
    ];
}

describe('extrairDatasDaObra', () => {
    it('acha as datas da mesma obra, sem caixa, e do mais usado ao menos usado', () => {
        const datas = extrairDatasDaObra(acervo(), {
            obra: 'AGUAS DE MARÇO'.replace('AGUAS', 'ÁGUAS'),
        });
        assert.deepEqual(
            datas.map((d) => [d.texto, d.usos]),
            [
                ['1972', 1],
                ['1973', 1],
            ],
        );
    });

    it('o autor só restringe quando preenchido, e tem de estar entre os autores da entrada', () => {
        const itens = acervo();
        assert.deepEqual(
            extrairDatasDaObra(itens, { obra: 'Águas de Março', autores: ['Elis Regina'] }).map(
                (d) => d.texto,
            ),
            ['1973'],
        );
        assert.deepEqual(
            extrairDatasDaObra(itens, { obra: 'Águas de Março', autor: 'tom jobim' }).map(
                (d) => d.texto,
            ),
            ['1972', '1973'],
        );
        assert.deepEqual(
            extrairDatasDaObra(itens, { obra: 'Águas de Março', autores: ['Outra Pessoa'] }),
            [],
        );
    });

    it('o tipo de obra só restringe quando preenchido', () => {
        const itens = acervo();
        assert.equal(extrairDatasDaObra(itens, { obra: 'Águas de Março' }).length, 2);
        assert.deepEqual(
            extrairDatasDaObra(itens, { obra: 'Águas de Março', tipoObra: 'Livro' }),
            [],
        );
    });

    it('Intertextualidade e Hipertextualidade dividem o universo da obra', () => {
        const [d] = extrairDatasDaObra(acervo(), { obra: 'Dom Casmurro' });
        assert.equal(d.texto, '1899');
        assert.equal(d.usos, 2);
    });

    it('obra vazia não sugere nada, e entrada sem data não entra', () => {
        assert.deepEqual(extrairDatasDaObra(acervo(), { obra: '  ' }), []);
        assert.deepEqual(extrairDatasDaObra(acervo()), []);
        assert.deepEqual(extrairDatasDaObra(undefined, { obra: 'X' }), []);
    });

    it('as datas voltam normalizadas, com o par começo e fim', () => {
        const itens = [
            {
                intertextualidade: [
                    {
                        obra: 'Obra longa',
                        autores: [],
                        dataObra: { nivel: 'seculo', seculo: 5, aC: true },
                        dataObraAte: { nivel: 'seculo', seculo: 4, aC: true },
                    },
                ],
            },
        ];
        const [d] = extrairDatasDaObra(itens, { obra: 'Obra longa' });
        assert.equal(d.texto, 'séc. V a.C. até séc. IV a.C.');
        assert.deepEqual([d.inicio.de, d.inicio.ate], [-500, -401]);
        assert.deepEqual([d.fim.de, d.fim.ate], [-400, -301]);
    });
});

describe('dataUnicaDaObra', () => {
    it('só preenche sozinha quando existe exatamente um par', () => {
        const itens = acervo();
        const unica = dataUnicaDaObra(itens, { obra: 'Dom Casmurro' });
        assert.equal(unica.inicio.ano, 1899);
        assert.equal(unica.fim, null);
        assert.equal(dataUnicaDaObra(itens, { obra: 'Águas de Março' }), null, 'duas datas');
        assert.equal(dataUnicaDaObra(itens, { obra: 'Inexistente' }), null, 'nenhuma');
        assert.equal(dataUnicaDaObra(itens, undefined), null);
    });

    it('uma data aproximada e a exata do mesmo ano contam como duas', () => {
        const itens = [
            {
                intertextualidade: [
                    { obra: 'X', dataObra: ano(1500, { aprox: true }) },
                    { obra: 'X', dataObra: ano(1500) },
                ],
            },
        ];
        assert.equal(dataUnicaDaObra(itens, { obra: 'X' }), null);
    });
});

describe('a Descrição continua igual depois do critério compartilhado', () => {
    it('extrairDescricoesDaObra e descricaoUnicaDaObra', () => {
        const itens = acervo();
        assert.deepEqual(extrairDescricoesDaObra(itens, { obra: 'Águas de Março' }), ['canção']);
        assert.equal(descricaoUnicaDaObra(itens, { obra: 'Águas de Março' }), 'canção');
        assert.equal(descricaoUnicaDaObra(itens, { obra: 'Dom Casmurro' }), '');
        assert.deepEqual(extrairDescricoesDaObra(itens), []);
        assert.deepEqual(extrairDescricoesDaObra(itens, { obra: '' }), []);
    });
});

describe('datas das Referências (tipo e texto)', () => {
    it('acha o nascimento e o óbito da mesma pessoa em vários textos', () => {
        const datas = extrairDatasDaReferencia(acervo(), {
            tipo: 'Pessoa pública',
            texto: 'Cleópatra',
        });
        assert.deepEqual(
            datas.map((d) => [d.texto, d.usos]),
            [
                ['69 a.C. até 30 a.C.', 1],
                ['69 a.C.', 1],
            ],
        );
    });

    it('o tipo separa o mesmo nome em tipos diferentes e, sem tipo, vale tudo', () => {
        const itens = acervo();
        assert.deepEqual(
            extrairDatasDaReferencia(itens, {
                tipo: 'Marco histórico',
                texto: 'Revolução Francesa',
            }).map((d) => d.texto),
            ['1789'],
        );
        assert.deepEqual(
            extrairDatasDaReferencia(itens, { texto: 'Revolução Francesa' }).map((d) => d.texto),
            ['1789', '1790'],
        );
    });

    it('texto vazio não sugere nada; a data única só vale com um par', () => {
        const itens = acervo();
        assert.deepEqual(extrairDatasDaReferencia(itens, { tipo: 'Notícia' }), []);
        assert.equal(
            dataUnicaDaReferencia(itens, { tipo: 'Pessoa pública', texto: 'Cleópatra' }),
            null,
        );
        const unica = dataUnicaDaReferencia(itens, {
            tipo: 'Notícia',
            texto: 'Revolução Francesa',
        });
        assert.equal(unica.inicio.ano, 1790);
        assert.equal(dataUnicaDaReferencia(itens, undefined), null);
    });
});
