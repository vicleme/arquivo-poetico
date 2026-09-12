import './helpers/dom-real.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { validarJsonSonoridade } = await import('../js/importar-sonoridade.js');

const POEMAS = [
    { id: 111, titulo: 'Olhar lírico', texto: 'Primeiro verso\nSegundo verso' },
    { id: 222, titulo: 'Horizonte de eventos', texto: 'Um verso só' },
];

describe('validarJsonSonoridade — resolução do poema', () => {
    it('rejeita entrada que não é objeto', () => {
        assert.equal(
            validarJsonSonoridade(null, POEMAS, '').erro,
            'Arquivo não é um JSON de escansão válido.',
        );
        assert.ok(validarJsonSonoridade([1, 2], POEMAS, '').erro);
        assert.ok(validarJsonSonoridade('texto', POEMAS, '').erro);
    });

    it('usa o poemaId do JSON quando ele existe no acervo, mesmo com outro poema já selecionado', () => {
        const r = validarJsonSonoridade({ poemaId: 222 }, POEMAS, '111');
        assert.equal(r.poema.id, 222);
        // sem aviso de "poema errado" — o poemaId bateu direto, sem
        // precisar do fallback pro poema já selecionado.
        assert.equal(
            r.avisos.some((a) => a.includes('outro poema')),
            false,
        );
    });

    it('cai pro poema já selecionado quando o poemaId do JSON não existe no acervo', () => {
        const r = validarJsonSonoridade(
            { poemaId: 999, poemaTitulo: 'Outro título' },
            POEMAS,
            '111',
        );
        assert.equal(r.poema.id, 111);
        assert.ok(r.avisos.some((a) => a.includes('outro poema')));
    });

    it('sem poema selecionado, casa pelo título quando o poemaId não existe/não veio', () => {
        const r = validarJsonSonoridade({ poemaTitulo: 'Horizonte de eventos' }, POEMAS, '');
        assert.equal(r.poema.id, 222);
        assert.ok(r.avisos.some((a) => a.includes('identificado pelo título')));
    });

    it('retorna erro quando não dá pra identificar o poema de jeito nenhum', () => {
        const r = validarJsonSonoridade({ formaPoema: 'Haikai' }, POEMAS, '');
        assert.ok(r.erro);
    });

    it('não avisa sobre divergência de título quando o JSON não trouxe poemaTitulo', () => {
        const r = validarJsonSonoridade({}, POEMAS, '111');
        assert.equal(r.poema.id, 111);
        assert.equal(
            r.avisos.some((a) => a.includes('outro poema')),
            false,
        );
    });
});

describe('validarJsonSonoridade — classificação (7 campos)', () => {
    it('aceita valores válidos e ignora/avisa sobre valores fora da lista fechada', () => {
        const r = validarJsonSonoridade(
            {
                poemaId: 111,
                formaPoema: 'Haikai',
                regularidadeMetrica: 'valor inventado',
                tom: 'Épico / Solene',
            },
            POEMAS,
            '',
        );
        assert.equal(r.valores.formaPoema, 'Haikai');
        assert.equal(r.valores.regularidadeMetrica, null);
        assert.equal(r.valores.tom, 'Épico / Solene');
        assert.ok(r.avisos.some((a) => a.includes('Regularidade Métrica')));
    });

    it('campos ausentes ficam null sem gerar aviso de classificação', () => {
        const r = validarJsonSonoridade({ poemaId: 111 }, POEMAS, '');
        assert.equal(r.valores.formaPoema, null);
        assert.equal(
            r.avisos.some((a) => a.includes('não reconhecido')),
            false,
        );
    });
});

describe('validarJsonSonoridade — grade silábica', () => {
    it('reconstrói do texto do poema quando o JSON não traz escansaoLinhas', () => {
        const r = validarJsonSonoridade({ poemaId: 111 }, POEMAS, '');
        assert.equal(r.linhas.filter((l) => l.tipo === 'verso').length, 2);
        assert.ok(r.avisos.some((a) => a.includes('não trouxe grade silábica')));
    });

    it('renumera os versos do zero, ignorando o número que veio no JSON', () => {
        const r = validarJsonSonoridade(
            {
                poemaId: 111,
                escansaoLinhas: [
                    { tipo: 'verso', numero: 99, texto: 'Pri/mei/ro' },
                    { tipo: 'vazia' },
                    { tipo: 'verso', numero: 5, texto: 'Se/gun/do' },
                ],
            },
            POEMAS,
            '',
        );
        assert.equal(r.linhas[0].numero, 1);
        assert.equal(r.linhas[2].numero, 2);
    });

    it('descarta tônicas fora do range de sílabas da linha', () => {
        const r = validarJsonSonoridade(
            {
                poemaId: 111,
                escansaoLinhas: [{ tipo: 'verso', texto: 'a/b/c', tonicas: [1, 5, -1] }],
            },
            POEMAS,
            '',
        );
        assert.deepEqual(r.linhas[0].tonicas, [1]);
        assert.ok(r.avisos.some((a) => a.includes('tônica')));
    });

    it('avisa quando a contagem de versos do JSON diverge do poema selecionado', () => {
        const r = validarJsonSonoridade(
            {
                poemaId: 111,
                escansaoLinhas: [{ tipo: 'verso', texto: 'só um verso' }],
            },
            POEMAS,
            '',
        );
        assert.ok(r.avisos.some((a) => a.includes('confira a grade')));
    });
});

describe('validarJsonSonoridade — pares de rima', () => {
    const linhasBase = {
        poemaId: 222,
        escansaoLinhas: [
            { tipo: 'verso', texto: 'a/b/c' },
            { tipo: 'verso', texto: 'd/e/f' },
        ],
    };

    it('aceita um par válido, com classificação de lista fechada', () => {
        const r = validarJsonSonoridade(
            {
                ...linhasBase,
                rimas: [
                    {
                        a: { linha: 0, silabas: [2] },
                        b: { linha: 1, silabas: [2] },
                        acentuacao: 'Aguda / Oxítona',
                        tonalidade: 'valor invalido',
                    },
                ],
            },
            POEMAS,
            '',
        );
        assert.equal(r.rimas.length, 1);
        assert.equal(r.rimas[0].acentuacao, 'Aguda / Oxítona');
        assert.equal(r.rimas[0].tonalidade, undefined);
        assert.equal(
            r.avisos.some((a) => a.includes('descartado')),
            false,
        );
    });

    it('descarta par com índice de linha fora da grade', () => {
        const r = validarJsonSonoridade(
            {
                ...linhasBase,
                rimas: [{ a: { linha: 0, silabas: [0] }, b: { linha: 9, silabas: [0] } }],
            },
            POEMAS,
            '',
        );
        assert.equal(r.rimas.length, 0);
        assert.ok(r.avisos.some((a) => a.includes('par de rima')));
    });

    it('descarta par com índice de sílaba fora do verso', () => {
        const r = validarJsonSonoridade(
            {
                ...linhasBase,
                rimas: [{ a: { linha: 0, silabas: [99] }, b: { linha: 1, silabas: [0] } }],
            },
            POEMAS,
            '',
        );
        assert.equal(r.rimas.length, 0);
    });
});
