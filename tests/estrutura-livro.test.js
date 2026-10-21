import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Estrutura no Ver do Livro: árvore pura (estrutura-livro.js), seção recolhível
// e ligação com a aba Estrutura (mesma ordem, função única).

const __dirname = path.dirname(fileURLToPath(import.meta.url));
globalThis.fetch = async (url) => ({
    ok: true,
    status: 200,
    text: async () =>
        fs.readFileSync(path.resolve(__dirname, '../modais', path.basename(url)), 'utf8'),
});
document.body.innerHTML =
    '<main></main><div id="modais-container"></div><div id="estrutura-arvore"></div>';

const {
    montarArvoreDoLivro,
    contarNosDaArvore,
    filhosTopoDoLivro,
    posicoesRepetidas,
    renumerarIrmaos,
} = await import('../js/estrutura-livro.js');
const { registrarModal, toggleModal } = await import('../js/modais.js');
const { db } = await import('../js/db.js');
const { abrirVisualizacaoLivro, renderEstruturaLivroHtml, contarConteudoDoLivro } =
    await import('../js/visualizar-livro.js');
const { setLivroEstrutura, moverItemEstrutura } = await import('../js/render-estrutura.js');

registrarModal('modal-visualizar-livro', 'modal-visualizar-livro.html', () => {});

function dados() {
    return {
        livros: [
            { id: 1, titulo: 'Livro Um', tipo: 'Inéditos', sequencia: 1 },
            { id: 2, titulo: 'Coletânea Dois', tipo: 'Coletânea', sequencia: 2 },
            { id: 3, titulo: 'Livro Vazio', tipo: 'Inéditos', sequencia: 3 },
        ],
        // Partes fora de ordem de sequência, de propósito
        partes: [
            { id: 11, livroId: 1, titulo: 'Parte B', sequencia: 2 },
            { id: 10, livroId: 1, titulo: 'Parte A', sequencia: 1 },
            { id: 20, livroId: 2, titulo: 'Parte da Coletânea', sequencia: 1 },
        ],
        secoes: [
            { id: 100, paiTipo: 'parte', paiId: 10, titulo: 'Seção A1', sequencia: 1 },
            { id: 101, paiTipo: 'livro', paiId: 1, titulo: 'Seção solta', sequencia: 3 },
        ],
        elementos: [{ id: 900, paiTipo: 'secao', paiId: 100, tipo: 'Respiro', sequencia: 1 }],
        poemas: [
            { id: 1, titulo: 'Poema na seção', paiTipo: 'secao', paiId: 100, sequencia: 2 },
            { id: 2, titulo: 'Poema na parte', paiTipo: 'parte', paiId: 10, sequencia: 2 },
            { id: 3, titulo: 'Poema só vinculado', livrosIds: [1] },
            { id: 4, titulo: 'Poema de outro livro', paiTipo: 'parte', paiId: 20, sequencia: 5 },
        ],
        prosas: [
            { id: 1, titulo: 'Prosa no livro', paiTipo: 'livro', paiId: 1, sequencia: 4 },
            { id: 2, titulo: 'Prosa vinculada', livrosIds: [1] },
            {
                id: 3,
                titulo: 'Prosa também na árvore',
                paiTipo: 'parte',
                paiId: 11,
                sequencia: 1,
                livrosIds: [1],
            },
        ],
        itensColetanea: [
            { id: 1, parteId: 20, titulo: 'Item 2', sequencia: 2, refId: 1, refTipo: 'poema' },
            { id: 2, parteId: 20, titulo: 'Item 1', sequencia: 1 },
        ],
    };
}

const titulos = (nos) => nos.map((n) => n.dados.titulo ?? n.dados.tipo);

describe('montarArvoreDoLivro (pura)', () => {
    it('Partes e itens do topo na ordem de sequência, com filhos aninhados', () => {
        const { arvore } = montarArvoreDoLivro(dados(), 1);
        assert.deepEqual(titulos(arvore), ['Parte A', 'Parte B', 'Seção solta', 'Prosa no livro']);
        const parteA = arvore[0];
        assert.deepEqual(titulos(parteA.filhos), ['Seção A1', 'Poema na parte']);
        assert.deepEqual(titulos(parteA.filhos[0].filhos), ['Respiro', 'Poema na seção']);
    });

    it('texto ligado só por livrosIds vai para "vinculados"; quem já está na árvore não repete', () => {
        const { vinculados } = montarArvoreDoLivro(dados(), 1);
        assert.deepEqual(titulos(vinculados), ['Poema só vinculado', 'Prosa vinculada']);
    });

    it('Coletânea: Partes e itens por sequência, sem vinculados', () => {
        const { arvore, vinculados } = montarArvoreDoLivro(dados(), 2);
        assert.deepEqual(titulos(arvore), ['Parte da Coletânea']);
        assert.deepEqual(titulos(arvore[0].filhos), ['Item 1', 'Item 2']);
        assert.equal(arvore[0].filhos[0].tipo, 'item');
        assert.deepEqual(vinculados, []);
    });

    it('livro sem nada e livro inexistente devolvem vazio', () => {
        assert.deepEqual(montarArvoreDoLivro(dados(), 3), { arvore: [], vinculados: [] });
        assert.deepEqual(montarArvoreDoLivro(dados(), 999), { arvore: [], vinculados: [] });
    });

    it('a contagem por tipo bate com a do rodapé do Ver (contarConteudoDoLivro)', () => {
        const d = dados();
        const c = contarNosDaArvore(montarArvoreDoLivro(d, 1));
        const r = contarConteudoDoLivro(d, 1);
        assert.equal(c.partes, r.partes);
        assert.equal(c.secoes, r.secoes);
        assert.equal(c.poemas, r.poemas);
        assert.equal(c.prosas, r.prosas);
    });

    it('Coletânea: contagem igual à do rodapé', () => {
        const d = dados();
        const c = contarNosDaArvore(montarArvoreDoLivro(d, 2));
        const r = contarConteudoDoLivro(d, 2);
        assert.equal(c.partes, r.partes);
        assert.equal(c.itens, r.itens);
    });
});

describe('seção Estrutura no Ver', () => {
    const container = () => document.getElementById('visualizar-livro-conteudo');
    const secao = () => container().querySelector('details[data-estrutura-livro]');

    beforeEach(async () => {
        localStorage.clear();
        Object.assign(db, dados());
        if (!document.getElementById('modal-visualizar-livro')?.classList.contains('hidden')) {
            await toggleModal('modal-visualizar-livro');
        }
    });

    it('livro sem conteúdo não mostra a seção', () => {
        assert.equal(renderEstruturaLivroHtml({ arvore: [], vinculados: [] }), '');
        assert.equal(renderEstruturaLivroHtml(null), '');
    });

    it('abre fechada, com Partes e Seções também fechadas', async () => {
        await abrirVisualizacaoLivro(1);
        assert.ok(secao(), 'seção existe');
        assert.equal(secao().open, false);
        const nos = [...container().querySelectorAll('details[data-estrutura-no]')];
        assert.ok(nos.length >= 4);
        assert.ok(nos.every((n) => n.open === false));
    });

    it('fica depois dos dados do livro e antes da contagem do rodapé', async () => {
        await abrirVisualizacaoLivro(1);
        const html = container().innerHTML;
        assert.ok(html.indexOf('data-estrutura-livro') < html.indexOf('Contém '));
    });

    it('mostra a ordem da aba Estrutura e o grupo "Vinculados, sem posição" no fim', async () => {
        await abrirVisualizacaoLivro(1);
        const texto = container().querySelector('[data-estrutura-arvore]').textContent;
        const pos = (t) => texto.indexOf(t);
        assert.ok(pos('Parte A') < pos('Parte B'));
        assert.ok(pos('Parte B') < pos('Seção solta'));
        assert.ok(pos('Seção solta') < pos('Prosa no livro'));
        assert.ok(pos('Prosa no livro') < pos('Vinculados, sem posição'));
        assert.ok(pos('Vinculados, sem posição') < pos('Poema só vinculado'));
    });

    it('Expandir tudo abre todos os níveis e Recolher tudo fecha', async () => {
        await abrirVisualizacaoLivro(1);
        secao().open = true;
        container().querySelector('[data-estrutura-acao="expandir"]').click();
        const nos = () => [...container().querySelectorAll('details[data-estrutura-no]')];
        assert.ok(nos().every((n) => n.open));
        container().querySelector('[data-estrutura-acao="recolher"]').click();
        assert.ok(nos().every((n) => !n.open));
    });

    it('ao navegar para outro livro, volta recolhida', async () => {
        await abrirVisualizacaoLivro(1, { ids: [1, 2] });
        secao().open = true;
        container().querySelector('[data-estrutura-acao="expandir"]').click();
        const { navegarVisualizacaoLivro } = await import('../js/visualizar-livro.js');
        navegarVisualizacaoLivro(1);
        assert.match(
            document.getElementById('modal-visualizar-livro-titulo').innerText,
            /Coletânea/,
        );
        assert.equal(secao().open, false);
        await abrirVisualizacaoLivro(1, { ids: [1, 2] });
        assert.equal(secao().open, false, 'reabrir o livro 1 também começa recolhida');
    });

    it('Coletânea mostra Partes e itens, com o rótulo de origem', async () => {
        await abrirVisualizacaoLivro(2);
        const texto = container().querySelector('[data-estrutura-arvore]').textContent;
        assert.match(texto, /Parte da Coletânea/);
        assert.match(texto, /Item 1/);
        assert.match(texto, /inédito/);
        assert.match(texto, /poema/);
        assert.doesNotMatch(texto, /Vinculados/);
    });

    it('título com HTML é escapado', () => {
        const html = renderEstruturaLivroHtml({
            arvore: [{ tipo: 'poema', dados: { titulo: '<img src=x onerror=1>', sequencia: 1 } }],
            vinculados: [],
        });
        assert.ok(!html.includes('<img src=x'));
        assert.ok(html.includes('&lt;img'));
    });
});

describe('aba Estrutura e Ver usam a mesma ordem', () => {
    it('a árvore da aba segue filhosTopoDoLivro', () => {
        Object.assign(db, dados());
        setLivroEstrutura(1);
        const linhas = [
            ...document.querySelectorAll('#estrutura-arvore [data-key], #estrutura-arvore > div'),
        ];
        assert.ok(linhas.length > 0);
        const topoAba = [...document.getElementById('estrutura-arvore').children].map((el) =>
            el.textContent.replace(/\s+/g, ' '),
        );
        const topoComum = filhosTopoDoLivro(db, 1).map((n) => n.dados.titulo);
        topoComum.forEach((t, i) => assert.ok(topoAba[i].includes(t), `${t} na posição ${i}`));
    });
});

// Caso real do Victor: Parte 1, Introdução 1 e Conteúdo Multimídia 2 no topo do livro.
// A posição repetida deixa a ordem ao acaso e travava o ▲▼ (trocar 1 com 1 não muda nada).
describe('posições repetidas na Estrutura', () => {
    const cenario = () => ({
        livros: [{ id: 1, titulo: 'Livro', tipo: 'Inéditos', sequencia: 1 }],
        partes: [{ id: 10, livroId: 1, titulo: 'I. Drama Adolescente', sequencia: 1 }],
        secoes: [],
        elementos: [
            { id: 1, paiTipo: 'livro', paiId: 1, tipo: 'Introdução', sequencia: 1 },
            { id: 2, paiTipo: 'livro', paiId: 1, tipo: 'Conteúdo Multimídia', sequencia: 2 },
        ],
        poemas: [],
        prosas: [],
        itensColetanea: [],
    });
    const ordem = () => filhosTopoDoLivro(db, 1).map((n) => n.dados.titulo ?? n.dados.tipo);

    beforeEach(() => {
        localStorage.clear();
        Object.assign(db, cenario());
    });

    it('detecta a posição repetida', () => {
        assert.deepEqual([...posicoesRepetidas(filhosTopoDoLivro(db, 1))], [1]);
        assert.equal(posicoesRepetidas([]).size, 0);
        assert.equal(
            posicoesRepetidas([
                { dados: { sequencia: 1 } },
                { dados: { sequencia: 2 } },
                { dados: { sequencia: null } },
                { dados: { sequencia: null } },
            ]).size,
            0,
            'sem posição não conta como repetida',
        );
    });

    it('renumerarIrmaos fixa 1..N na ordem mostrada e deixa quem não tem posição', () => {
        const nos = [
            { dados: { sequencia: 1 } },
            { dados: { sequencia: 1 } },
            { dados: { sequencia: 2 } },
            { dados: { sequencia: null } },
        ];
        assert.equal(renumerarIrmaos(nos), 2);
        assert.deepEqual(
            nos.map((n) => n.dados.sequencia),
            [1, 2, 3, null],
        );
        assert.equal(renumerarIrmaos(nos), 0, 'já em 1..N: não mexe em nada');
    });

    it('hoje a Parte aparece antes dos elementos (empate desfeito pela ordem de inserção)', () => {
        assert.deepEqual(ordem(), ['I. Drama Adolescente', 'Introdução', 'Conteúdo Multimídia']);
    });

    it('▲ na Introdução passa a valer: ela sobe para antes da Parte', () => {
        moverItemEstrutura('elemento', 1, 'up');
        assert.deepEqual(ordem(), ['Introdução', 'I. Drama Adolescente', 'Conteúdo Multimídia']);
        assert.deepEqual(
            filhosTopoDoLivro(db, 1).map((n) => n.dados.sequencia),
            [1, 2, 3],
        );
    });

    it('os dois elementos antes da Parte, com dois ▲ no segundo', () => {
        moverItemEstrutura('elemento', 1, 'up');
        moverItemEstrutura('elemento', 2, 'up');
        assert.deepEqual(ordem(), ['Introdução', 'Conteúdo Multimídia', 'I. Drama Adolescente']);
        assert.equal(posicoesRepetidas(filhosTopoDoLivro(db, 1)).size, 0);
    });

    it('selo âmbar nos itens que dividem a posição, e some depois de ordenar', () => {
        setLivroEstrutura(1);
        const selos = () => [
            ...document.querySelectorAll('#estrutura-arvore span[title^="Outro item"]'),
        ];
        assert.equal(selos().length, 2, 'Parte e Introdução, que dividem a posição 1');
        moverItemEstrutura('elemento', 1, 'up');
        setLivroEstrutura(1);
        assert.equal(selos().length, 0);
    });

    it('sem repetição, o ▲▼ continua só trocando dois vizinhos (não renumera o resto)', () => {
        db.partes[0].sequencia = 1;
        db.elementos[0].sequencia = 2;
        db.elementos[1].sequencia = 5; // buraco de propósito: não é repetição
        moverItemEstrutura('elemento', 2, 'up');
        assert.deepEqual(
            filhosTopoDoLivro(db, 1).map((n) => [
                n.dados.titulo ?? n.dados.tipo,
                n.dados.sequencia,
            ]),
            [
                ['I. Drama Adolescente', 1],
                ['Conteúdo Multimídia', 2],
                ['Introdução', 5],
            ],
        );
    });
});

describe('Estrutura no Ver do Livro: Ficha catalográfica e Sumário', () => {
    const arvoreComElementos = (elementos) => ({
        arvore: elementos.map((e) => ({ tipo: 'elemento', dados: e })),
        vinculados: [],
    });

    it('a Ficha mostra CDD, controle e bibliotecário logo abaixo da linha', () => {
        const html = renderEstruturaLivroHtml(
            arvoreComElementos([
                {
                    id: 1,
                    tipo: 'Ficha catalográfica',
                    sequencia: 1,
                    fichaCdd: 'B869.1',
                    fichaNumeroControle: '23-153911',
                    fichaBibliotecario: 'Tábata',
                    fichaCrb: 'CRB-8/9253',
                },
            ]),
        );
        assert.match(html, /data-estrutura-detalhe-ficha/);
        assert.match(html, /B869\.1/);
        assert.match(html, /23-153911/);
        assert.match(html, /Tábata, CRB-8\/9253/);
    });

    it('Ficha sem dados próprios não ganha bloco', () => {
        const html = renderEstruturaLivroHtml(
            arvoreComElementos([{ id: 1, tipo: 'Ficha catalográfica', sequencia: 1 }]),
        );
        assert.doesNotMatch(html, /data-estrutura-detalhe-ficha/);
    });

    it('o Sumário vira uma lista recolhida com os itens e o recuo por nível', () => {
        const html = renderEstruturaLivroHtml(
            arvoreComElementos([
                {
                    id: 2,
                    tipo: 'Sumário',
                    sequencia: 1,
                    itensSumario: [
                        { nivel: 1, item: 'Parte <i>I</i>', pagina: '9' },
                        { nivel: 3, item: 'Poema', pagina: 'xii' },
                    ],
                },
            ]),
        );
        const raiz = document.createElement('div');
        raiz.innerHTML = html;
        const det = raiz.querySelector('details[data-estrutura-chave="sumario-2"]');
        assert.ok(det);
        assert.equal(det.open, false);
        assert.match(det.textContent, /Itens do sumário \(2\)/);
        assert.match(det.innerHTML, /padding-left:24px/);
        assert.equal(det.querySelector('i'), null);
    });

    it('Expandir tudo abre o Sumário e Sumário sem itens ou outro tipo não ganha bloco', () => {
        const html = renderEstruturaLivroHtml(
            arvoreComElementos([
                { id: 3, tipo: 'Sumário', sequencia: 1, itensSumario: [] },
                { id: 4, tipo: 'Epígrafe', sequencia: 2 },
            ]),
        );
        assert.doesNotMatch(html, /sumario-3/);
        assert.doesNotMatch(html, /Itens do sumário/);
    });
});
