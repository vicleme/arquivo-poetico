import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Ver aberto a partir de uma lista de textos da aba Conexões (Obras, Autores,
// Referências): o Anterior/Próximo percorre os textos da mesma lista, com Poemas
// e Prosas misturados, e o cabeçalho diz de que lista se trata.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const lerModal = (arquivo) =>
    fs.readFileSync(path.resolve(__dirname, '../modais', arquivo), 'utf8');

globalThis.fetch = async (url) => ({
    ok: true,
    status: 200,
    text: async () => lerModal(path.basename(url)),
});

document.body.innerHTML = '<main></main><div id="modais-container"></div>';

const { registrarModal } = await import('../js/modais.js');
const { db } = await import('../js/db.js');
const { navegarVisualizacao, irParaPosicaoVisualizacao } = await import('../js/visualizar.js');
const { abrirTextoDaLista, itensDaListaNoDom } = await import('../js/ver-texto-da-lista.js');
const { htmlForaDoAcervo } = await import('../js/render-fora-do-acervo.js');
const { montarForaDoAcervo } = await import('../js/fora-do-acervo.js');

registrarModal('modal-visualizar', 'modal-visualizar.html', () => {});

const titulo = () => document.getElementById('modal-visualizar-titulo').innerText;
const posicao = () =>
    `${document.getElementById('visualizar-posicao').value} ${document.getElementById('visualizar-total').textContent}`;
const rotulo = () => document.getElementById('visualizar-lista-rotulo');
const ant = () => document.getElementById('visualizar-anterior');
const prox = () => document.getElementById('visualizar-proximo');

function montarTela() {
    db.poemas = [
        {
            id: 1,
            titulo: 'Poema A',
            texto: 'a',
            autoria: [],
            intertextualidade: [{ tipo: 'Literário', obra: 'Dom Casmurro', autor: 'Machado' }],
        },
        {
            id: 2,
            titulo: 'Poema B',
            texto: 'b',
            autoria: [],
            intertextualidade: [{ tipo: 'Literário', obra: 'Dom Casmurro', autor: 'Machado' }],
        },
    ];
    db.prosas = [
        {
            id: 7,
            titulo: 'Prosa C',
            texto: 'c',
            autoria: [],
            intertextualidade: [{ tipo: 'Literário', obra: 'Dom Casmurro', autor: 'Machado' }],
        },
    ];
    const dados = montarForaDoAcervo({ poemas: db.poemas, prosas: db.prosas });
    document
        .getElementById('modais-container')
        .insertAdjacentHTML(
            'beforebegin',
            `<div id="tela-conexoes">${htmlForaDoAcervo(dados)}</div>`,
        );
}

describe('Conexões: lista de textos abre o Ver com navegação', () => {
    beforeEach(() => {
        document.getElementById('tela-conexoes')?.remove();
        document.getElementById('modal-visualizar')?.classList.add('hidden');
        montarTela();
    });

    it('os títulos de uma obra levam a ação de lista, com tipo e rótulo', () => {
        const lista = document.querySelector('#tela-conexoes [data-lista-textos]');
        assert.ok(lista, 'há uma lista de textos');
        assert.match(lista.dataset.rotulo, /^Obra: Dom Casmurro/);
        const acoes = [...lista.querySelectorAll('[data-action]')];
        assert.ok(acoes.length >= 3);
        assert.ok(acoes.every((a) => a.dataset.action === 'ver-texto-da-lista'));
        assert.ok(acoes.some((a) => a.dataset.tipo === 'prosa'));
    });

    it('itensDaListaNoDom devolve a ordem da tela, misturando Poemas e Prosas', () => {
        const alvo = document.querySelector('#tela-conexoes [data-action="ver-texto-da-lista"]');
        const { itens, rotulo: r } = itensDaListaNoDom(alvo);
        assert.equal(itens.length, 3);
        assert.deepEqual(
            new Set(itens.map((i) => `${i.tipo}:${i.id}`)),
            new Set(['poema:1', 'poema:2', 'prosa:7']),
        );
        assert.match(r, /Dom Casmurro/);
    });

    it('Próximo e Anterior percorrem os textos da lista, de um tipo para o outro', async () => {
        const lista = [
            ...document.querySelectorAll('#tela-conexoes [data-action="ver-texto-da-lista"]'),
        ];
        const primeiro = lista[0];
        await abrirTextoDaLista(primeiro);
        assert.equal(posicao(), '1 de 3');
        assert.ok(ant().disabled);
        assert.equal(titulo(), primeiro.textContent);
        assert.match(rotulo().textContent, /Obra: Dom Casmurro/);
        assert.ok(!rotulo().classList.contains('hidden'));

        navegarVisualizacao(1);
        assert.equal(titulo(), lista[1].textContent);
        navegarVisualizacao(1);
        assert.equal(titulo(), lista[2].textContent);
        assert.equal(posicao(), '3 de 3');
        assert.ok(prox().disabled);
        navegarVisualizacao(-1);
        assert.equal(posicao(), '2 de 3');
        irParaPosicaoVisualizacao(1);
        assert.equal(titulo(), lista[0].textContent);
    });

    it('abrir pelo meio da lista começa na posição certa', async () => {
        const lista = [
            ...document.querySelectorAll('#tela-conexoes [data-action="ver-texto-da-lista"]'),
        ];
        await abrirTextoDaLista(lista[2]);
        assert.equal(posicao(), '3 de 3');
        assert.equal(titulo(), lista[2].textContent);
    });

    it('pula o texto que deixou de existir, mesmo de outro tipo', async () => {
        const lista = [
            ...document.querySelectorAll('#tela-conexoes [data-action="ver-texto-da-lista"]'),
        ];
        await abrirTextoDaLista(lista[1]);
        const marcado = lista[2].textContent;
        // O texto do meio deixa de existir; o Ver segue para o seguinte.
        const idMeio = Number(lista[1].dataset.id);
        const tipoMeio = lista[1].dataset.tipo;
        const colecao = tipoMeio === 'prosa' ? 'prosas' : 'poemas';
        db[colecao] = db[colecao].filter((x) => x.id !== idMeio);
        navegarVisualizacao(1);
        assert.equal(titulo(), marcado);
    });
});

describe('Ver sem lista não mostra rótulo', () => {
    it('o rótulo some quando não há navegação', async () => {
        document.getElementById('tela-conexoes')?.remove();
        const { abrirVisualizacao } = await import('../js/visualizar.js');
        db.poemas = [{ id: 1, titulo: 'Solto', texto: 'a', autoria: [] }];
        db.prosas = [];
        await abrirVisualizacao('poema', 1);
        assert.ok(rotulo().classList.contains('hidden'));
        assert.equal(rotulo().textContent, '');
    });
});

describe('ligação em main.js', () => {
    it('a ação ver-texto-da-lista está ligada ao abrirTextoDaLista', () => {
        const main = fs.readFileSync(path.resolve(__dirname, '../js/main.js'), 'utf8');
        assert.match(main, /'ver-texto-da-lista': \(el\) => abrirTextoDaLista\(el\)/);
        assert.match(main, /from '\.\/ver-texto-da-lista\.js'/);
    });
});
