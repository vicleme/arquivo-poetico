import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Leitura avaliativa: olho (Ver) e seta (Baixar .md) no canto da caixa do texto.
document.body.innerHTML = `<main><div id="leitura-conteudo"></div></main>`;

const { db } = await import('../js/db.js');
const ui = await import('../js/leitura-avaliativa-ui.js');
const { nomeArquivoDoTexto, markdownTituloETexto } =
    await import('../js/leitura-avaliativa-texto.js');

const conteudo = () => document.getElementById('leitura-conteudo');

beforeEach(() => {
    db.poemas = [{ id: 1, titulo: 'Árvore Grande!', texto: 'Raiz e copa', autoclassificacao: 0 }];
    db.prosas = [{ id: 1, titulo: 'Carta', texto: 'Querida', autoclassificacao: 0 }];
    db.leituras = [];
    ui.reiniciarEstado();
    ui.renderLeituraAvaliativa();
});

describe('Leitura avaliativa: Ver e Baixar do texto', () => {
    it('a lista não mostra os botões; o texto aberto mostra o olho e a seta', () => {
        assert.equal(conteudo().querySelector('[onclick="leituraVerTexto()"]'), null);
        assert.equal(conteudo().querySelector('[data-menu-baixar-texto]'), null);
        ui.aoSelecionarTextoLeitura('poema', 1);
        const ver = conteudo().querySelector('[onclick="leituraVerTexto()"]');
        const baixar = conteudo().querySelector('[data-menu-baixar-texto] summary');
        const formatos = [...conteudo().querySelectorAll('[onclick^="leituraBaixarTexto("]')];
        assert.deepEqual(
            formatos.map((b) => b.textContent.trim()),
            ['.md', '.pdf'],
        );
        assert.ok(ver && baixar);
        assert.equal(ver.getAttribute('aria-label'), 'Ver');
        assert.match(baixar.getAttribute('aria-label'), /Baixar/);
        // Ficam fora da área que rola, para não sumirem com a rolagem.
        assert.equal(ver.closest('[data-rolagem]'), null);
    });

    it('o nome do arquivo sai do título, sem acento nem símbolo', () => {
        assert.equal(nomeArquivoDoTexto('Árvore Grande!'), 'arvore-grande.md');
        assert.equal(nomeArquivoDoTexto(''), 'sem-titulo.md');
        assert.equal(nomeArquivoDoTexto('Carta', 'pdf'), 'carta.pdf');
    });

    it('o .md leva só título e texto', () => {
        const md = markdownTituloETexto('poema', {
            titulo: 'Árvore Grande!',
            texto: 'Raiz e copa',
        });
        assert.match(md, /^## "Árvore Grande!" \*\(Poema\)\*/);
        assert.match(md, /Raiz e copa/);
        assert.doesNotMatch(md, /Localização|Notas|Exportação Poética/);
        assert.match(markdownTituloETexto('prosa', { titulo: 'Carta', texto: 'Q' }), /\(Prosa\)/);
    });
});
