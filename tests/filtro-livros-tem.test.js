import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Aba Livros: botões de 3 estados Capa, ISBN e Loja (Fase 19, etapa 3, o que
// sobrou). Cada um gira entre tanto faz, com e sem.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const inicio = html.indexOf('<section id="livros"');
const fim = html.indexOf('id="lista-livros"', inicio);
assert.ok(inicio !== -1 && fim !== -1);
document.body.innerHTML = `<main>${html.slice(inicio, fim)}id="lista-livros"></div></section></main><div id="modais-container"></div>`;

const { db } = await import('../js/db.js');
const { definirPreviasImagem } = await import('../js/previas-imagem.js');
const {
    filtrarLivros,
    filtrosLivrosAtivos,
    filtrosLivrosVazios,
    livroTemCapa,
    livroTemIsbn,
    livroTemLoja,
    estadoTem,
    proximoEstadoTem,
} = await import('../js/filtro-livros.js');
const { renderLivros, setFiltroTemLivros, limparFiltrosLivros, getListaVisivelLivros } =
    await import('../js/render-listas.js');

const livros = [
    {
        id: 1,
        titulo: 'Completo',
        tipo: 'Inéditos',
        capa: 10,
        isbn13: '9788512345678',
        lojas: [{ nome: 'Loja A', url: 'https://a.example' }],
    },
    { id: 2, titulo: 'Só capa', tipo: 'Coletânea', capa: 11 },
    { id: 3, titulo: 'Só ISBN-10', tipo: 'Inéditos', isbn10: '8512345679' },
    { id: 4, titulo: 'Só loja sem link', tipo: 'Inéditos', lojas: [{ nome: 'Sebo', url: '' }] },
    { id: 5, titulo: 'Nada', tipo: 'Inéditos', isbn13: '  ', lojas: [{ nome: ' ', url: '' }] },
];
const ids = (lista) => lista.map((l) => l.id);
const botao = (id) => document.getElementById(id);
const titulosNaTela = () =>
    Array.from(document.querySelectorAll('#lista-livros h4')).map((h) => h.textContent);

describe('regras de "tem"', () => {
    it('capa: precisa do id da imagem; o link da imagem não conta', () => {
        assert.equal(livroTemCapa({ capa: 10 }), true);
        assert.equal(livroTemCapa({ capa: 0 }), true);
        assert.equal(livroTemCapa({ capa: '' }), false);
        assert.equal(livroTemCapa({ capa: null }), false);
        assert.equal(livroTemCapa({ imagemUrl: 'https://x.example/a.jpg' }), false);
        assert.equal(livroTemCapa(undefined), false);
    });

    it('ISBN: o 13 ou o 10, ignorando espaços', () => {
        assert.equal(livroTemIsbn({ isbn13: '978' }), true);
        assert.equal(livroTemIsbn({ isbn10: '851' }), true);
        assert.equal(livroTemIsbn({ isbn13: '  ', isbn10: '' }), false);
        assert.equal(livroTemIsbn({}), false);
    });

    it('loja: nome ou link em pelo menos uma; linha vazia e lista torta não contam', () => {
        assert.equal(livroTemLoja({ lojas: [{ nome: 'A', url: '' }] }), true);
        assert.equal(livroTemLoja({ lojas: [{ nome: '', url: 'https://a.example' }] }), true);
        assert.equal(livroTemLoja({ lojas: [{ nome: ' ', url: '' }] }), false);
        assert.equal(livroTemLoja({ lojas: [] }), false);
        assert.equal(livroTemLoja({ lojas: 'x' }), false);
        assert.equal(livroTemLoja({}), false);
    });
});

describe('estados do botão', () => {
    it('só "com" e "sem" valem; true (forma antiga) é "com"; o resto é tanto faz', () => {
        assert.equal(estadoTem('com'), 'com');
        assert.equal(estadoTem('sem'), 'sem');
        assert.equal(estadoTem(true), 'com');
        assert.equal(estadoTem(false), '');
        assert.equal(estadoTem(undefined), '');
        assert.equal(estadoTem('qualquer'), '');
    });

    it('o clique gira: tanto faz, com, sem, tanto faz', () => {
        assert.equal(proximoEstadoTem(''), 'com');
        assert.equal(proximoEstadoTem('com'), 'sem');
        assert.equal(proximoEstadoTem('sem'), '');
        assert.equal(proximoEstadoTem(undefined), 'com');
    });
});

describe('filtrarLivros com os botões', () => {
    it('em tanto faz, não filtram', () => {
        assert.equal(filtrarLivros(livros, filtrosLivrosVazios()).length, 5);
    });

    it('"com" sozinho', () => {
        assert.deepEqual(ids(filtrarLivros(livros, { temCapa: 'com' })), [1, 2]);
        assert.deepEqual(ids(filtrarLivros(livros, { temIsbn: 'com' })), [1, 3]);
        assert.deepEqual(ids(filtrarLivros(livros, { temLoja: 'com' })), [1, 4]);
    });

    it('"sem" é o contrário de "com", e os dois somam todos', () => {
        assert.deepEqual(ids(filtrarLivros(livros, { temCapa: 'sem' })), [3, 4, 5]);
        assert.deepEqual(ids(filtrarLivros(livros, { temIsbn: 'sem' })), [2, 4, 5]);
        assert.deepEqual(ids(filtrarLivros(livros, { temLoja: 'sem' })), [2, 3, 5]);
        ['temCapa', 'temIsbn', 'temLoja'].forEach((chave) => {
            const com = ids(filtrarLivros(livros, { [chave]: 'com' }));
            const sem = ids(filtrarLivros(livros, { [chave]: 'sem' }));
            assert.equal(com.length + sem.length, livros.length, chave);
        });
    });

    it('a forma antiga true ainda vale como "com"', () => {
        assert.deepEqual(ids(filtrarLivros(livros, { temCapa: true })), [1, 2]);
    });

    it('juntos valem E, e combinam com os outros filtros', () => {
        assert.deepEqual(ids(filtrarLivros(livros, { temCapa: 'com', temIsbn: 'com' })), [1]);
        assert.deepEqual(ids(filtrarLivros(livros, { temCapa: 'com', temIsbn: 'sem' })), [2]);
        assert.deepEqual(ids(filtrarLivros(livros, { temCapa: 'sem', temLoja: 'com' })), [4]);
        assert.deepEqual(ids(filtrarLivros(livros, { temCapa: 'com', tipo: 'Coletânea' })), [2]);
        assert.deepEqual(
            ids(filtrarLivros(livros, { temCapa: 'com', temIsbn: 'com', temLoja: 'sem' })),
            [],
        );
    });

    it('"com" e "sem" contam como filtro ligado', () => {
        assert.equal(filtrosLivrosAtivos(filtrosLivrosVazios()), false);
        ['temCapa', 'temIsbn', 'temLoja'].forEach((chave) => {
            assert.equal(filtrosLivrosAtivos({ [chave]: 'com' }), true, chave);
            assert.equal(filtrosLivrosAtivos({ [chave]: 'sem' }), true, chave);
            assert.equal(filtrosLivrosAtivos({ [chave]: '' }), false, chave);
        });
    });
});

describe('aba Livros: botões na tela', () => {
    beforeEach(() => {
        localStorage.clear();
        // Sem prévia a capa nem é lida do IndexedDB (que o teste não tem).
        definirPreviasImagem('livros', false);
        db.livros = livros.map((l, i) => ({ ...l, sequencia: i + 1 }));
        db.autores = [];
        db.colaboradores = [];
        db.partes = [];
        db.secoes = [];
        db.elementos = [];
        db.poemas = [];
        db.prosas = [];
        db.itensColetanea = [];
        limparFiltrosLivros();
    });

    it('o markup tem os três botões, ligados por data-action e data-chave', () => {
        [
            ['filtro-tem-capa-livros', 'temCapa'],
            ['filtro-tem-isbn-livros', 'temIsbn'],
            ['filtro-tem-loja-livros', 'temLoja'],
        ].forEach(([id, chave]) => {
            assert.equal(botao(id).tagName, 'BUTTON');
            assert.equal(botao(id).dataset.action, 'filtro-tem-livros');
            assert.equal(botao(id).dataset.chave, chave);
        });
    });

    it('o clique gira o botão: rótulo, estado e lista mudam', () => {
        renderLivros();
        assert.equal(botao('filtro-tem-capa-livros').textContent.trim(), 'Capa');
        assert.equal(titulosNaTela().length, 5);

        setFiltroTemLivros('temCapa');
        assert.equal(botao('filtro-tem-capa-livros').textContent.trim(), '✓ Com capa');
        assert.equal(botao('filtro-tem-capa-livros').dataset.estado, 'com');
        assert.equal(botao('filtro-tem-capa-livros').getAttribute('aria-pressed'), 'true');
        assert.deepEqual(titulosNaTela(), ['Completo', 'Só capa']);
        assert.equal(document.getElementById('contagem-livros').textContent, '2 de 5 livros');
        assert.equal(
            document.getElementById('limpar-filtros-livros').classList.contains('hidden'),
            false,
        );

        setFiltroTemLivros('temCapa');
        assert.equal(botao('filtro-tem-capa-livros').textContent.trim(), '✕ Sem capa');
        assert.equal(botao('filtro-tem-capa-livros').dataset.estado, 'sem');
        assert.equal(botao('filtro-tem-capa-livros').getAttribute('aria-pressed'), 'mixed');
        assert.deepEqual(titulosNaTela(), ['Só ISBN-10', 'Só loja sem link', 'Nada']);
        assert.equal(document.getElementById('contagem-livros').textContent, '3 de 5 livros');

        setFiltroTemLivros('temCapa');
        assert.equal(botao('filtro-tem-capa-livros').textContent.trim(), 'Capa');
        assert.equal(botao('filtro-tem-capa-livros').dataset.estado, '');
        assert.equal(titulosNaTela().length, 5);
    });

    it('os botões se combinam, e a lista do Ver segue o filtro', () => {
        renderLivros();
        setFiltroTemLivros('temCapa', 'com');
        setFiltroTemLivros('temIsbn', 'com');
        assert.deepEqual(getListaVisivelLivros(), [1]);
        setFiltroTemLivros('temIsbn', 'sem');
        assert.deepEqual(getListaVisivelLivros(), [2]);
    });

    it('Limpar filtros volta os três para tanto faz', () => {
        renderLivros();
        setFiltroTemLivros('temCapa', 'com');
        setFiltroTemLivros('temIsbn', 'sem');
        setFiltroTemLivros('temLoja', 'com');
        limparFiltrosLivros();
        [
            ['filtro-tem-capa-livros', 'Capa'],
            ['filtro-tem-isbn-livros', 'ISBN'],
            ['filtro-tem-loja-livros', 'Loja'],
        ].forEach(([id, rotulo]) => {
            assert.equal(botao(id).textContent.trim(), rotulo, id);
            assert.equal(botao(id).dataset.estado, '', id);
        });
        assert.equal(titulosNaTela().length, 5);
    });

    it('chave desconhecida é ignorada', () => {
        renderLivros();
        setFiltroTemLivros('temAlgumaCoisa', 'com');
        assert.equal(titulosNaTela().length, 5);
    });
});
