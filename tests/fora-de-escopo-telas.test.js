import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Fora de escopo nas telas: no Ver do livro e na aba Estrutura. Descartado sai da
// árvore e vive só na seção; migrado fica na árvore do destino com o selo "veio de"
// e aparece no livro de origem; o aviso de livro fora do cadastro vale para o acervo.

globalThis.indexedDB = { open: () => ({}) };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
globalThis.fetch = async (url) => ({
    ok: true,
    status: 200,
    text: async () =>
        fs.readFileSync(path.resolve(__dirname, '../modais', path.basename(url)), 'utf8'),
});
document.body.innerHTML =
    '<main></main><div id="modais-container"></div><div id="estrutura-arvore"></div>';

const { registrarModal, toggleModal } = await import('../js/modais.js');
const { db } = await import('../js/db.js');
const { abrirVisualizacaoLivro, renderEstruturaLivroHtml } =
    await import('../js/visualizar-livro.js');
const { montarArvoreDoLivro } = await import('../js/estrutura-livro.js');
const { dadosForaDeEscopoDaTela } = await import('../js/fora-de-escopo.js');
const { setLivroEstrutura } = await import('../js/render-estrutura.js');

registrarModal('modal-visualizar-livro', 'modal-visualizar-livro.html', () => {});

function dados({ comFantasma = true } = {}) {
    return {
        livros: [
            { id: 1, titulo: 'Livro Um', tipo: 'Inéditos', sequencia: 1 },
            { id: 2, titulo: 'Livro Dois', tipo: 'Inéditos', sequencia: 2 },
            { id: 3, titulo: 'Coletânea', tipo: 'Coletânea', sequencia: 3 },
        ],
        partes: [{ id: 100, livroId: 1, titulo: 'Parte A', sequencia: 1 }],
        secoes: [
            { id: 200, paiTipo: 'parte', paiId: 100, titulo: '1. Viagens', sequencia: 1 },
            { id: 210, paiTipo: 'livro', paiId: 2, titulo: 'Cofre', sequencia: 1 },
        ],
        elementos: [],
        itensColetanea: [],
        prosas: [],
        poemas: [
            { id: 1, titulo: 'Fica na seção', paiTipo: 'secao', paiId: 200, sequencia: 1 },
            {
                id: 2,
                titulo: 'Descartado Z',
                status: 'descartado',
                paiTipo: 'secao',
                paiId: 200,
                sequencia: null,
                livrosIds: [1],
                cortadoDe: { livro: 'Livro Um', secao: 'Parte A / 1. Viagens', posicao: 2 },
            },
            {
                id: 3,
                titulo: 'Migrado M',
                status: 'migrado',
                paiTipo: 'secao',
                paiId: 210,
                sequencia: 1,
                livrosIds: [2],
                cortadoDe: { livro: 'Livro Um', secao: '1. Viagens', posicao: 4 },
            },
            ...(comFantasma
                ? [
                      {
                          id: 4,
                          titulo: 'Migrado F',
                          status: 'migrado',
                          paiTipo: 'secao',
                          paiId: 210,
                          sequencia: 2,
                          livrosIds: [2],
                          cortadoDe: { livro: 'Livro Fantasma', secao: 'X', posicao: 1 },
                      },
                  ]
                : []),
        ],
    };
}

const estruturaDaTela = (livroId) => ({
    ...montarArvoreDoLivro(db, livroId, { semDescartados: true }),
    ...dadosForaDeEscopoDaTela(db, livroId),
});
const nodo = (html) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div;
};

describe('Fora de escopo no Ver do livro (HTML)', () => {
    beforeEach(() => Object.assign(db, dados()));

    it('livro de origem: seção com migrados e descartados, cada um com a sua linha', () => {
        const raiz = nodo(renderEstruturaLivroHtml(estruturaDaTela(1)));
        const fora = raiz.querySelector('[data-estrutura-fora]');
        assert.ok(fora, 'seção Fora de escopo');
        assert.equal(fora.open, false, 'abre fechada');
        const texto = fora.textContent.replace(/\s+/g, ' ');
        assert.match(
            texto,
            /Migrado M.*Migrado \(de 1\. Viagens · era a nº 4 na época → agora em Livro Dois › Cofre · posição 1\)/,
        );
        assert.match(
            texto,
            /Descartado Z.*Descartado \(de Parte A › 1\. Viagens · era a nº 2 na época\)/,
        );
    });

    it('descartado não aparece na árvore, só no Fora de escopo', () => {
        const raiz = nodo(renderEstruturaLivroHtml(estruturaDaTela(1)));
        const arvore = [...raiz.querySelectorAll('[data-estrutura-folha]')].map(
            (e) => e.textContent,
        );
        assert.ok(arvore.some((t) => t.includes('Fica na seção')));
        assert.ok(!arvore.some((t) => t.includes('Descartado Z')));
        assert.equal(raiz.querySelectorAll('[data-fora-entrada]').length, 2);
    });

    it('título da entrada abre o Ver do texto (mesmo gancho da árvore)', () => {
        const raiz = nodo(renderEstruturaLivroHtml(estruturaDaTela(1)));
        const titulo = raiz.querySelector('[data-fora-entrada] [data-estrutura-ver]');
        assert.ok(titulo);
        assert.equal(titulo.dataset.tipo, 'poema');
    });

    it('livro de destino: migrado na árvore com o selo "veio de"', () => {
        const raiz = nodo(renderEstruturaLivroHtml(estruturaDaTela(2)));
        const selos = [...raiz.querySelectorAll('[data-estrutura-selo]')].map((s) => s.textContent);
        assert.ok(
            selos.includes('veio de Livro Um › 1. Viagens · era a nº 4 na época'),
            selos.join('|'),
        );
        // no destino ele NÃO entra em Fora de escopo
        assert.equal(raiz.querySelectorAll('[data-fora-entrada]').length, 0);
    });

    it('aviso de migrado com livro fora do cadastro, uma linha, no topo da seção', () => {
        const raiz = nodo(renderEstruturaLivroHtml(estruturaDaTela(1)));
        const aviso = raiz.querySelector('[data-fora-aviso]');
        assert.ok(aviso);
        assert.match(
            aviso.textContent,
            /1 migrado cita um livro que não está no cadastro: “Livro Fantasma” \(Migrado F\)\./,
        );
    });

    it('sem entradas e sem aviso, a seção não existe', () => {
        Object.assign(db, dados({ comFantasma: false }));
        const raiz = nodo(renderEstruturaLivroHtml(estruturaDaTela(2)));
        assert.equal(raiz.querySelector('[data-estrutura-fora]'), null);
    });

    it('livro com árvore vazia mas com Fora de escopo ainda mostra a Estrutura', () => {
        Object.assign(db, dados({ comFantasma: false }));
        db.poemas = db.poemas.filter((p) => p.id !== 1); // só sobra o descartado na seção
        const html = renderEstruturaLivroHtml({
            arvore: [],
            vinculados: [],
            ...dadosForaDeEscopoDaTela(db, 1),
        });
        assert.ok(html.includes('data-estrutura-fora'));
        assert.ok(!html.includes('()'), 'resumo não fica vazio');
    });

    it('Coletânea não tem Fora de escopo nem aviso', () => {
        const d = dadosForaDeEscopoDaTela(db, 3);
        assert.equal(d.fora.migrados.length + d.fora.descartados.length, 0);
        assert.equal(d.aviso, '');
        assert.equal(d.selos.size, 0);
    });

    it('título com HTML é escapado', () => {
        db.poemas[1].titulo = '<img src=x onerror=1>';
        const html = renderEstruturaLivroHtml(estruturaDaTela(1));
        assert.ok(!html.includes('<img src=x'));
    });
});

describe('Fora de escopo no Ver do livro (modal)', () => {
    const container = () => document.getElementById('visualizar-livro-conteudo');
    beforeEach(async () => {
        localStorage.clear();
        Object.assign(db, dados());
        if (!document.getElementById('modal-visualizar-livro')?.classList.contains('hidden')) {
            await toggleModal('modal-visualizar-livro');
        }
    });

    it('o Ver mostra a seção e deixa o descartado fora da árvore', async () => {
        await abrirVisualizacaoLivro(1);
        assert.ok(container().querySelector('[data-estrutura-fora]'));
        const folhas = [...container().querySelectorAll('[data-estrutura-folha]')].map(
            (e) => e.textContent,
        );
        assert.ok(!folhas.some((t) => t.includes('Descartado Z')));
    });

    it('Expandir tudo também abre o Fora de escopo', async () => {
        await abrirVisualizacaoLivro(1);
        container().querySelector('[data-estrutura-acao="expandir"]').click();
        assert.equal(container().querySelector('[data-estrutura-fora]').open, true);
    });
});

describe('Fora de escopo na aba Estrutura', () => {
    const aba = () => document.getElementById('estrutura-arvore');
    beforeEach(() => Object.assign(db, dados()));

    it('descartado sai da árvore e entra no Fora de escopo do fim', () => {
        setLivroEstrutura(1);
        const linhas = [...aba().children].map((el) => el.textContent.replace(/\s+/g, ' '));
        const fora = aba().querySelector('details[data-fora-chave="fora-de-escopo"]');
        assert.ok(fora, 'seção Fora de escopo');
        assert.equal(fora.open, false);
        assert.equal(aba().lastElementChild, fora, 'no fim da aba');
        const arvore = linhas.slice(0, -1).join(' ');
        assert.ok(arvore.includes('Fica na seção'));
        assert.ok(!arvore.includes('Descartado Z'));
        const entradas = [...fora.querySelectorAll('[data-fora-entrada]')];
        assert.equal(entradas.length, 2);
        assert.ok(entradas.some((e) => e.textContent.includes('era a nº 2 na época')));
    });

    it('o título da entrada abre o Ver do texto pela ação da aba', () => {
        setLivroEstrutura(1);
        const titulo = aba().querySelector(
            '[data-fora-entrada] [data-action="ver-poema"][data-id="2"]',
        );
        assert.ok(titulo, 'o descartado Z (id 2) abre pelo ver-poema');
    });

    it('migrado no destino ganha o selo "veio de" na linha', () => {
        setLivroEstrutura(2);
        const selo = aba().querySelector('[data-estrutura-selo]');
        assert.ok(selo);
        assert.equal(selo.textContent, 'veio de Livro Um › 1. Viagens · era a nº 4 na época');
    });

    it('o grupo que o Victor abriu continua aberto depois de renderizar de novo', () => {
        setLivroEstrutura(1);
        const fora = aba().querySelector('details[data-fora-chave="fora-de-escopo"]');
        fora.open = true;
        fora.dispatchEvent(new Event('toggle'));
        setLivroEstrutura(1);
        assert.equal(aba().querySelector('details[data-fora-chave="fora-de-escopo"]').open, true);
    });

    it('aviso aparece na seção', () => {
        setLivroEstrutura(1);
        assert.match(aba().querySelector('[data-fora-aviso]').textContent, /Livro Fantasma/);
    });
});
