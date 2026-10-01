import './helpers/localstorage-shim.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    normalizarIdiomas,
    idiomasDoItem,
    espelhoDeIdiomas,
    extrairIdiomasUnicos,
    extrairDialetosUnicos,
    normalizarDialetos,
    dialetosDoItem,
    normalizarPapelIdioma,
    IDIOMAS_SUGERIDOS,
} from '../js/utils.js';
import { migrarIdioma } from '../js/db.js';

// Idiomas do texto em lista: papel por idioma (Principal/Secundário) e
// dialeto opcional; `idioma` (string) segue como espelho derivado.

describe('normalizarIdiomas', () => {
    it('tira vazios e corta espaços', () => {
        assert.deepEqual(
            normalizarIdiomas([
                { idioma: '  en ', papel: 'principal', dialetos: [' britânico '] },
                { idioma: '   ' },
                null,
            ]),
            [{ idioma: 'en', papel: 'principal', dialetos: ['britânico'] }],
        );
    });

    it('junta repetidos sem diferenciar caixa nem acento; vale o Principal e somam-se os dialetos', () => {
        assert.deepEqual(
            normalizarIdiomas([
                { idioma: 'Espanhol', papel: 'secundario', dialetos: [] },
                { idioma: 'espanhol', papel: 'principal', dialetos: ['rioplatense'] },
                { idioma: 'ESPANHOL', papel: 'secundario', dialetos: ['mexicano'] },
            ]),
            [{ idioma: 'Espanhol', papel: 'principal', dialetos: ['rioplatense', 'mexicano'] }],
        );
    });

    it('papel desconhecido vira Secundário; sem Principal, promove o primeiro', () => {
        assert.equal(normalizarPapelIdioma('qualquer'), 'secundario');
        assert.deepEqual(
            normalizarIdiomas([{ idioma: 'en' }, { idioma: 'es', papel: 'secundario' }]).map(
                (e) => `${e.idioma}:${e.papel}`,
            ),
            ['en:principal', 'es:secundario'],
        );
    });

    it('promove o preferido quando falta Principal', () => {
        const r = normalizarIdiomas([{ idioma: 'en' }, { idioma: 'es' }], 1);
        assert.deepEqual(
            r.map((e) => e.papel),
            ['secundario', 'principal'],
        );
    });

    it('mantém mais de um Principal e lista vazia continua vazia', () => {
        const r = normalizarIdiomas([
            { idioma: 'pt-BR', papel: 'principal' },
            { idioma: 'en', papel: 'principal' },
        ]);
        assert.deepEqual(
            r.map((e) => e.papel),
            ['principal', 'principal'],
        );
        assert.deepEqual(normalizarIdiomas([]), []);
        assert.deepEqual(normalizarIdiomas(undefined), []);
    });
});

describe('idiomasDoItem', () => {
    it('lê `idiomas` quando existe', () => {
        const item = { idioma: 'x', idiomas: [{ idioma: 'fr', papel: 'principal', dialetos: [] }] };
        assert.deepEqual(idiomasDoItem(item), [{ idioma: 'fr', papel: 'principal', dialetos: [] }]);
    });

    it('sem `idiomas`, o `idioma` antigo vira um Principal só, sem dialeto', () => {
        assert.deepEqual(idiomasDoItem({ idioma: 'pt-BR' }), [
            { idioma: 'pt-BR', papel: 'principal', dialetos: [] },
        ]);
    });

    it('sem nada, lista vazia; `idiomas` vazio vale como vazio mesmo com `idioma` antigo', () => {
        assert.deepEqual(idiomasDoItem({}), []);
        assert.deepEqual(idiomasDoItem(undefined), []);
        assert.deepEqual(idiomasDoItem({ idioma: '' }), []);
        assert.deepEqual(idiomasDoItem({ idioma: 'en', idiomas: [] }), []);
    });
});

describe('espelhoDeIdiomas', () => {
    it('nomes, Principais primeiro, estável dentro do papel, sem dialeto', () => {
        assert.equal(
            espelhoDeIdiomas([
                { idioma: 'en', papel: 'secundario', dialetos: ['britânico'] },
                { idioma: 'pt-BR', papel: 'principal' },
                { idioma: 'es', papel: 'principal' },
                { idioma: 'fr', papel: 'secundario' },
            ]),
            'pt-BR, es, en, fr',
        );
    });

    it('lista vazia dá texto vazio', () => {
        assert.equal(espelhoDeIdiomas([]), '');
        assert.equal(espelhoDeIdiomas(undefined), '');
    });
});

describe('extrairIdiomasUnicos com a lista', () => {
    it('soma idiomas de `idiomas` (todos os papéis) e do `idioma` antigo, sem duplicar', () => {
        const itens = [
            {
                idiomas: [
                    { idioma: 'ja', papel: 'principal' },
                    { idioma: 'en', papel: 'secundario' },
                ],
            },
            { idioma: 'ko' },
            { idioma: 'pt-BR' },
        ];
        assert.deepEqual(
            extrairIdiomasUnicos(itens),
            [...new Set([...IDIOMAS_SUGERIDOS, 'ja', 'ko'])].sort(),
        );
    });
});

describe('extrairDialetosUnicos', () => {
    const itens = [
        { idiomas: [{ idioma: 'es', papel: 'principal', dialetos: ['rioplatense'] }] },
        { idiomas: [{ idioma: 'ES', papel: 'secundario', dialetos: ['mexicano'] }] },
        { idiomas: [{ idioma: 'es', papel: 'secundario', dialetos: ['rioplatense'] }] },
        { idiomas: [{ idioma: 'pt-BR', papel: 'principal', dialetos: ['caiçara'] }] },
        { idioma: 'es' },
    ];

    it('só os dialetos daquele idioma, sem repetir e em ordem alfabética', () => {
        assert.deepEqual(extrairDialetosUnicos(itens, 'es'), ['mexicano', 'rioplatense']);
        assert.deepEqual(extrairDialetosUnicos(itens, 'pt-BR'), ['caiçara']);
    });

    it('idioma sem dialeto registrado, ou sem itens, dá lista vazia', () => {
        assert.deepEqual(extrairDialetosUnicos(itens, 'fr'), []);
        assert.deepEqual(extrairDialetosUnicos(undefined, 'es'), []);
    });
});

describe('migrarIdioma com a lista', () => {
    it('texto antigo ganha `idiomas` com um Principal e o espelho continua igual', () => {
        const itens = [{ idioma: 'en' }];
        migrarIdioma(itens);
        assert.deepEqual(itens[0].idiomas, [{ idioma: 'en', papel: 'principal', dialetos: [] }]);
        assert.equal(itens[0].idioma, 'en');
    });

    it('texto sem o campo recebe pt-BR como Principal (padrão de sempre)', () => {
        const itens = [{}];
        migrarIdioma(itens);
        assert.equal(itens[0].idioma, 'pt-BR');
        assert.deepEqual(itens[0].idiomas, [{ idioma: 'pt-BR', papel: 'principal', dialetos: [] }]);
    });

    it('idioma vazio de propósito continua sem idioma', () => {
        const itens = [{ idioma: '' }];
        migrarIdioma(itens);
        assert.deepEqual(itens[0].idiomas, []);
        assert.equal(itens[0].idioma, '');
    });

    it('`idiomas` já existente é normalizado e refaz o espelho (fonte da verdade)', () => {
        const itens = [
            {
                idioma: 'velho',
                idiomas: [
                    { idioma: 'en', papel: 'secundario', dialetos: [] },
                    { idioma: 'es', papel: 'secundario', dialetos: ['rioplatense'] },
                ],
            },
        ];
        migrarIdioma(itens);
        assert.deepEqual(
            itens[0].idiomas.map((e) => `${e.idioma}:${e.papel}`),
            ['en:principal', 'es:secundario'],
        );
        assert.equal(itens[0].idioma, 'en, es');
    });

    it('é idempotente', () => {
        const itens = [{ idioma: 'fr' }, { idiomas: [{ idioma: 'de', papel: 'principal' }] }];
        migrarIdioma(itens);
        const antes = JSON.stringify(itens);
        migrarIdioma(itens);
        assert.equal(JSON.stringify(itens), antes);
    });
});

describe('dialetos em lista', () => {
    it('normalizarDialetos tira vazios e repetidos (sem caixa nem acento), mantendo a ordem', () => {
        assert.deepEqual(normalizarDialetos(['Gaúcho', ' ', 'paulistano', 'GAUCHO', null]), [
            'Gaúcho',
            'paulistano',
        ]);
        assert.deepEqual(normalizarDialetos(['mineiro'], 'carioca'), ['mineiro', 'carioca']);
        assert.deepEqual(normalizarDialetos(undefined, ''), []);
    });

    it('dado antigo, com `dialeto` de texto único, vira `dialetos` de um item', () => {
        assert.deepEqual(
            normalizarIdiomas([{ idioma: 'es', papel: 'principal', dialeto: 'rioplatense' }]),
            [{ idioma: 'es', papel: 'principal', dialetos: ['rioplatense'] }],
        );
    });

    it('a migração converte `dialeto` em `dialetos` e é idempotente', () => {
        const itens = [
            { idioma: 'es', idiomas: [{ idioma: 'es', papel: 'principal', dialeto: 'mexicano' }] },
        ];
        migrarIdioma(itens);
        assert.deepEqual(itens[0].idiomas, [
            { idioma: 'es', papel: 'principal', dialetos: ['mexicano'] },
        ]);
        const depois = JSON.stringify(itens);
        migrarIdioma(itens);
        assert.equal(JSON.stringify(itens), depois);
    });

    it('dialetosDoItem lista todos, cada um com o seu idioma', () => {
        const item = {
            idiomas: [
                { idioma: 'pt-BR', papel: 'principal', dialetos: ['paulistano', 'gaúcho'] },
                { idioma: 'es', papel: 'secundario', dialetos: ['rioplatense'] },
            ],
        };
        assert.deepEqual(dialetosDoItem(item), [
            'paulistano (pt-BR)',
            'gaúcho (pt-BR)',
            'rioplatense (es)',
        ]);
    });
});
