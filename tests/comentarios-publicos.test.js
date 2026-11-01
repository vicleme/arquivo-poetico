import './helpers/dom-real.js';

import fs from 'node:fs';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Comentários públicos e Notas públicas, entrega 1: o dado, os modais, o
// salvar e a exibição na página do sorteio.
const {
    ehNotaPublica,
    definirNotaPublica,
    comentariosPublicosDe,
    notasPublicasDe,
    blocosPublicosDoTexto,
} = await import('../js/comentarios-publicos.js');
const { montarSortear, montarBlocosPublicos } = await import('../js/sortear-pagina.js');

const ler = (caminho) => fs.readFileSync(new URL(caminho, import.meta.url), 'utf8');

describe('lógica pura', () => {
    it('só `true` marca a nota como pública', () => {
        assert.equal(ehNotaPublica({ notasPublicas: true }), true);
        for (const v of [false, undefined, null, 'true', 1, 'sim']) {
            assert.equal(ehNotaPublica({ notasPublicas: v }), false);
        }
        assert.equal(ehNotaPublica(null), false);
        assert.equal(ehNotaPublica({}), false);
    });

    it('definirNotaPublica liga, desliga (grava false) e diz se mudou', () => {
        const item = {};
        assert.equal(definirNotaPublica(item, true), true);
        assert.equal(item.notasPublicas, true);
        assert.equal(definirNotaPublica(item, true), false);
        assert.equal(definirNotaPublica(item, false), true);
        assert.equal(item.notasPublicas, false);
        assert.equal(definirNotaPublica({}, false), false);
        assert.equal(definirNotaPublica(null, true), false);
    });

    it('comentariosPublicosDe tira os espaços das pontas e ignora o que não é texto', () => {
        assert.equal(comentariosPublicosDe({ comentariosPublicos: '  oi  ' }), 'oi');
        assert.equal(comentariosPublicosDe({ comentariosPublicos: 5 }), '');
        assert.equal(comentariosPublicosDe({}), '');
        assert.equal(comentariosPublicosDe(null), '');
    });

    it('notasPublicasDe só devolve as Notas quando marcadas', () => {
        assert.equal(notasPublicasDe({ notas: 'segredo', notasPublicas: false }), '');
        assert.equal(notasPublicasDe({ notas: 'segredo' }), '');
        assert.equal(notasPublicasDe({ notas: ' aberta ', notasPublicas: true }), 'aberta');
        assert.equal(notasPublicasDe({ notas: '   ', notasPublicas: true }), '');
    });

    it('blocosPublicosDoTexto traz Comentários e depois Notas, sem bloco vazio', () => {
        assert.deepEqual(
            blocosPublicosDoTexto({
                comentariosPublicos: 'c',
                notas: 'n',
                notasPublicas: true,
            }),
            [
                { rotulo: 'Comentários ao leitor', texto: 'c' },
                { rotulo: 'Notas', texto: 'n' },
            ],
        );
        assert.deepEqual(blocosPublicosDoTexto({ notas: 'n', notasPublicas: false }), []);
        assert.deepEqual(blocosPublicosDoTexto({ notas: 'n', notasPublicas: true }), [
            { rotulo: 'Notas', texto: 'n' },
        ]);
    });
});

describe('modais e salvar', () => {
    for (const [arquivo, prefixo] of [
        ['../modais/modal-poema.html', 'p'],
        ['../modais/modal-prosa.html', 'pr'],
    ]) {
        it(`${arquivo}: Notas ganha a caixa Pública e há o campo Comentários ao leitor`, () => {
            const html = ler(arquivo);
            assert.match(html, new RegExp(`id="${prefixo}-notas-publicas"`));
            assert.match(html, new RegExp(`id="${prefixo}-comentarios-publicos"`));
            const ordem = [
                `id="${prefixo}-notas"`,
                `id="${prefixo}-notas-publicas"`,
                `id="${prefixo}-comentarios-publicos"`,
            ].map((x) => html.indexOf(x));
            assert.ok(ordem.every((n) => n > 0));
            assert.deepEqual(
                [...ordem].sort((a, b) => a - b),
                ordem,
            );
        });
    }

    it('forms.js grava e preenche os dois campos nas duas telas', () => {
        const js = ler('../js/forms.js');
        for (const p of ['p', 'pr']) {
            assert.match(
                js,
                new RegExp(`getElementById\\('${p}-notas-publicas'\\)\\?\\.checked === true`),
            );
            assert.match(js, new RegExp(`getElementById\\('${p}-comentarios-publicos'\\)`));
            assert.match(js, new RegExp(`notasPublicas: '${p}-notas-publicas'`));
            assert.match(js, new RegExp(`comentariosPublicos: '${p}-comentarios-publicos'`));
        }
    });
});

describe('página do sorteio', () => {
    const memoria = () => {
        const dados = {};
        return {
            getItem: (k) => (k in dados ? dados[k] : null),
            setItem: (k, v) => {
                dados[k] = String(v);
            },
        };
    };
    const base = (extra = {}) => ({
        temas: [],
        temasUniversais: [],
        prosas: [],
        poemas: [
            {
                id: 1,
                titulo: 'T1',
                texto: 'verso 1',
                status: 'publicado',
                sorteavel: true,
                temas: [],
                ...extra,
            },
        ],
    });
    let raiz;
    beforeEach(() => {
        document.body.innerHTML = '<main id="raiz"></main>';
        raiz = document.getElementById('raiz');
    });
    const sortear = (db) => {
        montarSortear(raiz, { db, aleatorio: () => 0, armazenamento: memoria() });
        raiz.querySelector('#sortear-botao')?.click();
    };

    it('montarBlocosPublicos devolve null sem nada público', () => {
        assert.equal(montarBlocosPublicos({ notas: 'privada' }), null);
    });

    it('mostra Comentários e Notas públicas, em texto puro e com as quebras', () => {
        const sec = montarBlocosPublicos({
            comentariosPublicos: 'linha 1\nlinha 2 <b>x</b>',
            notas: 'nota',
            notasPublicas: true,
        });
        assert.equal(sec.id, 'sortear-comentarios');
        assert.match(sec.textContent, /Comentários ao leitor/);
        assert.match(sec.textContent, /linha 1\nlinha 2 <b>x<\/b>/);
        assert.equal(sec.querySelector('b'), null);
        assert.match(sec.textContent, /Notas/);
    });

    it('Notas sem a marca Pública não aparecem no sorteio', () => {
        sortear(
            base({ notas: 'só no cadastro', notasPublicas: false, comentariosPublicos: 'olá' }),
        );
        const txt = raiz.textContent;
        assert.match(txt, /olá/);
        assert.doesNotMatch(txt, /só no cadastro/);
    });

    it('Notas marcadas como públicas aparecem; texto sem nada público não ganha o bloco', () => {
        sortear(base({ notas: 'aberta', notasPublicas: true }));
        assert.match(raiz.querySelector('#sortear-comentarios').textContent, /aberta/);
        sortear(base());
        assert.equal(raiz.querySelector('#sortear-comentarios'), null);
    });

    it('fica depois do texto e antes da ficha', () => {
        sortear(base({ comentariosPublicos: 'olá' }));
        const bloco = raiz.querySelector('#sortear-comentarios');
        const ficha = raiz.querySelector('#sortear-ficha');
        assert.ok(bloco);
        if (ficha) {
            assert.ok(
                bloco.compareDocumentPosition(ficha) & window.Node.DOCUMENT_POSITION_FOLLOWING,
                'a ficha vem depois dos comentários',
            );
        }
    });

    it('com conteúdo sensível fechado, nada do autor aparece até ler mesmo assim', () => {
        sortear(base({ conteudoSensivel: 'luto', comentariosPublicos: 'olá leitor' }));
        assert.equal(raiz.querySelector('#sortear-comentarios'), null);
        assert.doesNotMatch(raiz.textContent, /olá leitor/);
        raiz.querySelector('#sortear-ler-mesmo-assim').click();
        assert.match(raiz.querySelector('#sortear-comentarios').textContent, /olá leitor/);
    });
});
