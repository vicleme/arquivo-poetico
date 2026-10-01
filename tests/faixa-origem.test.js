import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Faixa "Voltar para <aba> · Limpar filtro" (js/faixa-origem.js) e a
// ligação dela com os atalhos "Ver textos" (abrirListaComConsulta).
document.body.innerHTML = `
    <nav>
        <button id="btn-locais">Locais</button>
        <button id="btn-poemas">Poemas</button>
        <button id="btn-prosas">Prosas</button>
    </nav>
    <section id="locais" class="tab-content active"></section>
    <section id="poemas" class="tab-content"><input id="busca-poemas" /></section>
    <section id="prosas" class="tab-content"><input id="busca-prosas" /></section>
`;

// abrirAba de mentira: só troca a aba ativa, como openTab faz.
window.abrirAba = (id) => {
    document.querySelectorAll('.tab-content').forEach((s) => s.classList.remove('active'));
    document.getElementById(id)?.classList.add('active');
};

const { abrirPorAtalho, removerFaixaDeOrigem, temFaixaDeOrigem } =
    await import('../js/faixa-origem.js');
const { db } = await import('../js/db.js');
const { abrirListaComConsulta } = await import('../js/render-listas.js');

const $ = (id) => document.getElementById(id);
const faixa = (destino) => document.querySelector(`[data-faixa-origem="${destino}"]`);
const ativa = () => document.querySelector('.tab-content.active').id;

function reset() {
    ['poemas', 'prosas', 'locais'].forEach(removerFaixaDeOrigem);
    window.abrirAba('locais');
    $('busca-poemas').value = '';
    $('busca-prosas').value = '';
}

describe('faixa-origem: módulo', () => {
    beforeEach(reset);

    function atalho(extra = {}) {
        let filtro = '';
        const chamadas = { limpar: 0 };
        abrirPorAtalho({
            destino: 'poemas',
            descricao: 'Filtrando por tema “Amor”',
            controles: ['busca-poemas'],
            aplicar: () => {
                filtro = 'tema:"Amor"';
                $('busca-poemas').value = filtro;
            },
            limpar: () => {
                chamadas.limpar++;
                filtro = '';
                $('busca-poemas').value = '';
            },
            ...extra,
        });
        return { chamadas, filtro: () => filtro };
    }

    it('abre a aba de destino, aplica o filtro e mostra a faixa no topo', () => {
        const a = atalho();
        assert.equal(ativa(), 'poemas');
        assert.equal(a.filtro(), 'tema:"Amor"');
        assert.ok(faixa('poemas'));
        assert.equal($('poemas').firstChild, faixa('poemas'));
        assert.match(faixa('poemas').textContent, /Filtrando por tema “Amor”/);
        assert.match(faixa('poemas').textContent, /Voltar para Locais/);
    });

    it('Voltar reabre a aba de origem, desfaz o filtro e remove a faixa', () => {
        const a = atalho();
        faixa('poemas').querySelector('[data-faixa="voltar"]').click();
        assert.equal(ativa(), 'locais');
        assert.equal(a.chamadas.limpar, 1);
        assert.equal($('busca-poemas').value, '');
        assert.equal(temFaixaDeOrigem('poemas'), false);
        assert.equal(faixa('poemas'), null);
    });

    it('Limpar filtro desfaz o filtro, fica na aba e remove a faixa', () => {
        const a = atalho();
        faixa('poemas').querySelector('[data-faixa="limpar"]').click();
        assert.equal(ativa(), 'poemas');
        assert.equal(a.chamadas.limpar, 1);
        assert.equal(temFaixaDeOrigem('poemas'), false);
    });

    it('editar a caixa de busca à mão encerra a faixa sem mexer no que foi digitado', () => {
        const a = atalho();
        $('busca-poemas').value = 'outra coisa';
        $('busca-poemas').dispatchEvent(new window.Event('input', { bubbles: true }));
        assert.equal(temFaixaDeOrigem('poemas'), false);
        assert.equal(a.chamadas.limpar, 0);
        assert.equal($('busca-poemas').value, 'outra coisa');
    });

    it('trocar de aba pela navegação NÃO remove a faixa', () => {
        atalho();
        window.abrirAba('locais');
        window.abrirAba('poemas');
        assert.ok(faixa('poemas'));
    });

    it('um segundo atalho para o mesmo destino troca a faixa, sem empilhar', () => {
        atalho();
        atalho({ descricao: 'Filtrando por tema “Mar”' });
        assert.equal(document.querySelectorAll('[data-faixa-origem="poemas"]').length, 1);
        assert.match(faixa('poemas').textContent, /Mar/);
    });

    it('sem aba de origem diferente do destino, não há botão Voltar', () => {
        window.abrirAba('poemas');
        atalho();
        assert.equal(faixa('poemas').querySelector('[data-faixa="voltar"]'), null);
        assert.ok(faixa('poemas').querySelector('[data-faixa="limpar"]'));
    });

    it('escapa HTML na descrição', () => {
        atalho({ descricao: '<img src=x onerror=alert(1)>' });
        assert.equal(faixa('poemas').querySelector('img'), null);
    });

    it('destino ausente no DOM: o atalho ainda aplica o filtro, sem faixa', () => {
        let aplicou = false;
        abrirPorAtalho({
            destino: 'nao-existe',
            descricao: 'x',
            aplicar: () => (aplicou = true),
            limpar: () => {},
        });
        assert.equal(aplicou, true);
        assert.equal(temFaixaDeOrigem('nao-existe'), false);
    });
});

describe('faixa-origem: ligada a "Ver textos" (abrirListaComConsulta)', () => {
    beforeEach(() => {
        reset();
        db.poemas = [{ id: 1, titulo: 'A', temas: [] }];
        db.prosas = [];
    });

    it('abre Poemas com a consulta na caixa de busca e mostra a faixa', () => {
        abrirListaComConsulta('territorialidade:"Lapa"', [1], [], 'Textos que citam “Lapa”');
        assert.equal(ativa(), 'poemas');
        assert.equal($('busca-poemas').value, 'territorialidade:"Lapa"');
        assert.match(faixa('poemas').textContent, /Textos que citam “Lapa”/);
    });

    it('vai para Prosas quando só há prosa', () => {
        abrirListaComConsulta('tema:"X"', [], [5]);
        assert.equal(ativa(), 'prosas');
        assert.ok(faixa('prosas'));
    });

    it('Voltar volta para Locais e zera o filtro de Poemas', () => {
        abrirListaComConsulta('tema:"X"', [1], []);
        faixa('poemas').querySelector('[data-faixa="voltar"]').click();
        assert.equal(ativa(), 'locais');
        assert.equal($('busca-poemas').value, '');
    });
});
