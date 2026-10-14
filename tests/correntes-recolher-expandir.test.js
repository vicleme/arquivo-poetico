import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Correntes literárias em árvore: recolher/expandir um ramo, "Recolher tudo" e
// "Expandir tudo". Com filtro ativo o recolhimento é ignorado.
document.body.innerHTML = `
    <main>
        <div id="filtros-periodo-movimentosEscolas"></div>
        <div id="lista-movimentos-escolas"></div>
    </main>
`;

const { db } = await import('../js/db.js');
const { alternarRamoCorrente, recolherTodasCorrentes, expandirTodasCorrentes, setFiltroPeriodo } =
    await import('../js/render-listas.js');

const titulos = () =>
    [...document.querySelectorAll('#lista-movimentos-escolas h4')].map((h) => h.textContent.trim());
const setas = () => [...document.querySelectorAll('[data-action="alternar-ramo-corrente"]')];
const texto = () => document.getElementById('lista-movimentos-escolas').textContent;

describe('Correntes literárias: recolher e expandir', () => {
    beforeEach(() => {
        db.autores = [];
        db.poemas = [];
        db.prosas = [];
        db.movimentosEscolas = [
            { id: 1, nome: 'Romantismo', paiId: null, inicio: { ano: 1836 } },
            { id: 2, nome: 'Primeira geração', paiId: 1, inicio: { ano: 1836 } },
            { id: 3, nome: 'Segunda geração', paiId: 1, inicio: { ano: 1853 } },
            { id: 4, nome: 'Ultrarromantismo', paiId: 3, inicio: { ano: 1853 } },
            { id: 5, nome: 'Barroco', paiId: null, inicio: { ano: 1601 } },
        ];
        expandirTodasCorrentes();
    });

    it('só corrente com divisões ganha a seta, e tudo começa expandido', () => {
        assert.equal(titulos().length, 5);
        // Romantismo e Segunda geração têm divisões
        assert.deepEqual(
            setas().map((b) => b.dataset.id),
            ['1', '3'],
        );
        assert.ok(setas().every((b) => b.getAttribute('aria-expanded') === 'true'));
    });

    it('recolher um ramo esconde toda a descendência e conta o que escondeu', () => {
        alternarRamoCorrente(1);
        assert.deepEqual(titulos(), ['Barroco', 'Romantismo']);
        assert.match(texto(), /3 divisões escondidas no ramo/);
        assert.equal(setas()[0].getAttribute('aria-expanded'), 'false');
    });

    it('recolher só o ramo interno esconde só o que está dentro dele', () => {
        alternarRamoCorrente(3);
        assert.deepEqual(titulos(), [
            'Barroco',
            'Romantismo',
            'Primeira geração',
            'Segunda geração',
        ]);
        assert.match(texto(), /1 divisão escondida no ramo/);
    });

    it('alternar de novo expande', () => {
        alternarRamoCorrente(1);
        alternarRamoCorrente(1);
        assert.equal(titulos().length, 5);
    });

    it('Recolher tudo e Expandir tudo', () => {
        recolherTodasCorrentes();
        assert.deepEqual(titulos(), ['Barroco', 'Romantismo']);
        expandirTodasCorrentes();
        assert.equal(titulos().length, 5);
    });

    it('com filtro ativo o recolhimento é ignorado', () => {
        recolherTodasCorrentes();
        document.getElementById('fp-movimentosEscolas-nome').value = 'Ultra';
        setFiltroPeriodo('movimentosEscolas');
        assert.ok(titulos().includes('Ultrarromantismo'));
        document.getElementById('fp-movimentosEscolas-nome').value = '';
        setFiltroPeriodo('movimentosEscolas');
        assert.deepEqual(titulos(), ['Barroco', 'Romantismo']);
    });
});
