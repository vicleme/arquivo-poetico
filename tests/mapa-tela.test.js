import './helpers/dom-real.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { montarDadosDoMapa } from '../js/mapa-origens.js';
import { carregarMapaMundi, montarMapaOrigens } from '../js/mapa-tela.js';

const ref = (id) => ({ tipo: 'poema', id });
const item = (rotulo, ...ids) => ({ rotulo, chave: rotulo.toLowerCase(), ids, textos: ids.length });

const agregado = {
    itens: [
        item('Grécia', ref(1), ref(2), ref(3)),
        item('Portugal', ref(4)),
        item('Desconhecida', ref(5)),
        item('Roma Antiga', ref(6), ref(7)),
    ],
    comEntradas: 8,
    comOrigem: 7,
    semOrigem: 1,
};

// Um mapa mínimo à mão: dois países e um desenho sem nome.
const mapaFalso = {
    largura: 1000,
    altura: 487,
    vista: [0, 0, 1000, 450],
    paises: [
        { id: '300', nome: 'Greece', d: 'M10 10L20 10L20 20Z' },
        { id: '620', nome: 'Portugal', d: 'M30 10L40 10L40 20Z' },
        { id: '076', nome: 'Brazil', d: 'M50 10L60 10L60 20Z' },
    ],
};

describe('montarMapaOrigens', () => {
    it('pinta só os países com texto e deixa os outros cinza', () => {
        const raiz = montarMapaOrigens(mapaFalso, montarDadosDoMapa(agregado), {});
        const grecia = raiz.querySelector('[data-desenho="300"]');
        const brasil = raiz.querySelector('[data-desenho="076"]');
        assert.equal(grecia.getAttribute('data-pais'), '300');
        assert.equal(brasil.getAttribute('data-pais'), null);
        assert.notEqual(grecia.getAttribute('fill'), brasil.getAttribute('fill'));
    });

    it('mostra Desconhecida e as origens sem lugar, sem sumir com nada', () => {
        const raiz = montarMapaOrigens(mapaFalso, montarDadosDoMapa(agregado), {});
        const texto = raiz.textContent;
        assert.match(texto, /Sem lugar no mapa \(3 textos\)/);
        assert.match(texto, /Desconhecida \(1\)/);
        assert.match(texto, /Roma Antiga \(2\)/);
    });

    it('os botões de fora do mapa abrem a lista da origem', () => {
        const abertas = [];
        const raiz = montarMapaOrigens(mapaFalso, montarDadosDoMapa(agregado), {
            aoAbrirOrigem: (r) => abertas.push(r),
        });
        const botao = [...raiz.querySelectorAll('button')].find((b) =>
            b.textContent.startsWith('Roma Antiga'),
        );
        botao.click();
        assert.deepEqual(abertas, ['Roma Antiga']);
    });

    it('o mais e o voltar ao mundo todo mexem na vista e na miniatura', () => {
        const raiz = montarMapaOrigens(mapaFalso, montarDadosDoMapa(agregado), {});
        const tela = raiz.querySelector('svg[role="img"]');
        const mini = raiz.querySelector('svg[aria-hidden="true"]');
        const botoes = raiz.querySelectorAll('button[title]');
        const mais = [...botoes].find((b) => b.title === 'Aproximar');
        const tudo = [...botoes].find((b) => b.title === 'Voltar ao mundo todo');
        assert.equal(mini.style.display, 'none');
        const larguraAntes = Number(tela.getAttribute('viewBox').split(' ')[2]);
        mais.click();
        assert.ok(Number(tela.getAttribute('viewBox').split(' ')[2]) < larguraAntes);
        assert.equal(mini.style.display, 'block');
        tudo.click();
        assert.equal(Number(tela.getAttribute('viewBox').split(' ')[2]), larguraAntes);
        assert.equal(mini.style.display, 'none');
    });

    it('informa a vista só quando há zoom, para a exportação', () => {
        const raiz = montarMapaOrigens(mapaFalso, montarDadosDoMapa(agregado), {});
        assert.equal(raiz.obterVista(), null);
        [...raiz.querySelectorAll('button[title]')].find((b) => b.title === 'Aproximar').click();
        const vista = raiz.obterVista();
        assert.ok(vista && vista.w < 1000);
    });

    it('traz a tabela acessível com as contagens', () => {
        const raiz = montarMapaOrigens(mapaFalso, montarDadosDoMapa(agregado), {});
        const linhas = [...raiz.querySelectorAll('tr')].map((l) => l.textContent);
        assert.deepEqual(linhas, ['Grécia3', 'Portugal1']);
    });
});

describe('carregarMapaMundi', () => {
    it('avisa quando o arquivo não pode ser lido', async () => {
        await assert.rejects(
            () => carregarMapaMundi(async () => ({ ok: false }), 'x.json'),
            /mapa-múndi/,
        );
    });
});
