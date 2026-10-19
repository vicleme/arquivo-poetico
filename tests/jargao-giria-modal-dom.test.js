import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Campo "Jargão e gíria" no grupo "Região e Idioma" dos modais de Poema e
// Prosa (etapa 2): chips, sugestões, leitura para salvar e carga de um texto.
document.body.innerHTML = `
    <div id="p-regiao-corpo"></div>
    <div id="pr-regiao-corpo"></div>
`;

const { db } = await import('../js/db.js');
const {
    renderRegiaoPoema,
    renderRegiaoProsa,
    adicionarJargaoGiriaTexto,
    removerJargaoGiriaTexto,
    obterJargaoGiriaTexto,
    resetJargaoGiriaTexto,
    carregarJargaoGiriaTexto,
} = await import('../js/editor.js');
const { jargaoGiriaParaSalvar } = await import('../js/forms.js');

const $ = (id) => document.getElementById(id);
const chips = (id) =>
    [...$(id).querySelectorAll('span')].map((e) => e.textContent.replace('×', '').trim());

function preparar() {
    db.poemas = [];
    db.prosas = [];
    renderRegiaoPoema();
    renderRegiaoProsa();
    resetJargaoGiriaTexto('poemas');
    resetJargaoGiriaTexto('prosas');
}

describe('Jargão e gíria: modal', () => {
    beforeEach(preparar);

    it('renderiza o campo nos dois modais, sem chips e com as quatro sementes como sugestão', () => {
        assert.ok($('p-jargao-giria-input'));
        assert.ok($('pr-jargao-giria-input'));
        assert.deepEqual(chips('p-jargao-giria-container'), []);
        const opcoes = [...$('p-jargao-giria-sugestoes').querySelectorAll('option')].map(
            (o) => o.value,
        );
        assert.deepEqual(opcoes, [
            'Gíria de internet',
            'Gíria juvenil',
            'Jargão corporativo',
            'Linguagem de fandom',
        ]);
    });

    it('adiciona pelo campo; vírgula separa vários e repetido é ignorado', () => {
        $('p-jargao-giria-input').value = 'Gíria de internet, Gíria juvenil, gíria de internet';
        adicionarJargaoGiriaTexto('poemas');
        assert.deepEqual(chips('p-jargao-giria-container'), ['Gíria de internet', 'Gíria juvenil']);
        assert.equal($('p-jargao-giria-input').value, '');
    });

    it('aceita o valor passado direto (onchange e Enter) e esvazia o campo', () => {
        $('p-jargao-giria-input').value = 'Jargão corporativo';
        adicionarJargaoGiriaTexto('poemas', 'Jargão corporativo', false);
        assert.deepEqual(chips('p-jargao-giria-container'), ['Jargão corporativo']);
        assert.equal($('p-jargao-giria-input').value, '');
    });

    it('campo vazio não muda nada', () => {
        adicionarJargaoGiriaTexto('poemas');
        adicionarJargaoGiriaTexto('poemas', '  ,  ');
        assert.deepEqual(chips('p-jargao-giria-container'), []);
    });

    it('remove pela posição', () => {
        adicionarJargaoGiriaTexto('poemas', 'A, B, C');
        removerJargaoGiriaTexto('poemas', 1);
        assert.deepEqual(chips('p-jargao-giria-container'), ['A', 'C']);
    });

    it('poema e prosa têm listas independentes', () => {
        adicionarJargaoGiriaTexto('poemas', 'Gíria juvenil');
        adicionarJargaoGiriaTexto('prosas', 'Linguagem de fandom');
        assert.deepEqual(obterJargaoGiriaTexto('poemas'), ['Gíria juvenil']);
        assert.deepEqual(obterJargaoGiriaTexto('prosas'), ['Linguagem de fandom']);
    });

    it('o campo oculto acompanha a lista (alimenta o rastreador de alterações)', () => {
        adicionarJargaoGiriaTexto('poemas', 'Gíria juvenil');
        assert.deepEqual(JSON.parse($('p-jargao-giria-json').value), ['Gíria juvenil']);
        let avisou = 0;
        $('p-jargao-giria-json').addEventListener('input', () => avisou++);
        removerJargaoGiriaTexto('poemas', 0);
        assert.equal(avisou, 1);
        assert.deepEqual(JSON.parse($('p-jargao-giria-json').value), []);
    });

    it('sugere também o que já foi usado em outros textos do acervo', () => {
        db.poemas = [{ id: 1, jargaoGiria: ['Juridiquês'] }];
        db.prosas = [{ id: 2, jargaoGiria: ['gíria de internet', 'Manosfera'] }];
        resetJargaoGiriaTexto('poemas');
        const opcoes = [...$('p-jargao-giria-sugestoes').querySelectorAll('option')].map(
            (o) => o.value,
        );
        assert.deepEqual(opcoes, [
            'Gíria de internet',
            'Gíria juvenil',
            'Jargão corporativo',
            'Juridiquês',
            'Linguagem de fandom',
            'Manosfera',
        ]);
    });
});

describe('Jargão e gíria: salvar, limpar e carregar', () => {
    beforeEach(preparar);

    it('um valor digitado e não confirmado entra ao salvar', () => {
        adicionarJargaoGiriaTexto('poemas', 'Gíria de internet');
        $('p-jargao-giria-input').value = 'Gíria juvenil, gíria de internet';
        assert.deepEqual(obterJargaoGiriaTexto('poemas'), ['Gíria de internet', 'Gíria juvenil']);
        assert.deepEqual(jargaoGiriaParaSalvar('poemas'), {
            jargaoGiria: ['Gíria de internet', 'Gíria juvenil'],
        });
    });

    it('sem nada preenchido, grava lista vazia', () => {
        assert.deepEqual(jargaoGiriaParaSalvar('prosas'), { jargaoGiria: [] });
    });

    it('carregar um texto mostra os chips; texto sem o campo carrega vazio', () => {
        carregarJargaoGiriaTexto('poemas', {
            jargaoGiria: ['Gíria juvenil', 'Jargão corporativo'],
        });
        assert.deepEqual(chips('p-jargao-giria-container'), [
            'Gíria juvenil',
            'Jargão corporativo',
        ]);
        carregarJargaoGiriaTexto('poemas', {});
        assert.deepEqual(chips('p-jargao-giria-container'), []);
    });

    it('carregar e limpar também esvaziam o que estava digitado', () => {
        $('pr-jargao-giria-input').value = 'resto';
        carregarJargaoGiriaTexto('prosas', { jargaoGiria: ['A'] });
        assert.equal($('pr-jargao-giria-input').value, '');
        $('pr-jargao-giria-input').value = 'resto';
        resetJargaoGiriaTexto('prosas');
        assert.equal($('pr-jargao-giria-input').value, '');
        assert.deepEqual(obterJargaoGiriaTexto('prosas'), []);
    });
});
