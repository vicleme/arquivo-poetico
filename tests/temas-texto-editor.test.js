import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { db } from '../js/db.js';
import {
    renderTemasPoema,
    renderTemasProsa,
    adicionarTemaTexto,
    removerTemaTexto,
    mudarPapelTemaTexto,
    obterTemasTexto,
    resetTemasTexto,
    carregarTemasTexto,
} from '../js/editor.js';

// Grupo "Temas e Assuntos" dos modais de Poema e Prosa (fase 2 dos Temas):
// estado por nome+papel; os ids só são resolvidos ao salvar (forms.js).
function montarDom() {
    document.body.innerHTML = '<div id="p-temas-corpo"></div><div id="pr-temas-corpo"></div>';
    renderTemasPoema();
    renderTemasProsa();
}

describe('grupo Temas e Assuntos (editor.js, DOM real)', () => {
    beforeEach(() => {
        db.temas.length = 0;
        db.assuntos.length = 0;
        montarDom();
        resetTemasTexto('poemas');
        resetTemasTexto('prosas');
    });

    it('renderiza input, seletor de papel e container nos dois modais', () => {
        ['p', 'pr'].forEach((pre) => {
            assert.ok(document.getElementById(`${pre}-tema-input`));
            const papel = document.getElementById(`${pre}-tema-papel`);
            assert.deepEqual(
                [...papel.options].map((o) => o.value),
                ['', 'principal', 'secundario'],
            );
            assert.ok(document.getElementById(`${pre}-temas-container`));
            assert.ok(document.getElementById(`${pre}-temas-assuntos`));
        });
    });

    it('o select de papel não estica: o CSS global dá width:100% a todo select', () => {
        // Sem `w-auto` o select ocupava a linha e o campo de texto do Tema sumia.
        ['p', 'pr'].forEach((pre) => {
            const papel = document.getElementById(`${pre}-tema-papel`);
            assert.ok(papel.classList.contains('w-auto'), `${pre}: select de papel com w-auto`);
            assert.ok(papel.classList.contains('shrink-0'));
        });
        adicionarTemaTexto('poemas', 'Amor');
        const chip = document.querySelector('#p-temas-container select');
        assert.ok(chip.classList.contains('w-auto'), 'select do chip com w-auto');
        assert.ok(chip.classList.contains('mb-0'), 'select do chip sem margem inferior');
    });

    it('adiciona com o papel escolhido; vírgula separa vários; repetido só troca o papel', () => {
        document.getElementById('p-tema-papel').value = 'principal';
        document.getElementById('p-tema-input').value = 'Amor, Luto';
        adicionarTemaTexto('poemas');
        assert.deepEqual(obterTemasTexto('poemas'), [
            { nome: 'Amor', papel: 'principal' },
            { nome: 'Luto', papel: 'principal' },
        ]);
        assert.equal(document.getElementById('p-tema-input').value, '');

        document.getElementById('p-tema-papel').value = 'secundario';
        document.getElementById('p-tema-input').value = 'amor';
        adicionarTemaTexto('poemas');
        assert.deepEqual(obterTemasTexto('poemas'), [
            { nome: 'Amor', papel: 'secundario' },
            { nome: 'Luto', papel: 'principal' },
        ]);
    });

    it('Poema e Prosa têm listas independentes', () => {
        document.getElementById('p-tema-input').value = 'Amor';
        adicionarTemaTexto('poemas');
        assert.equal(obterTemasTexto('prosas').length, 0);
    });

    it('troca o papel e remove por índice', () => {
        document.getElementById('pr-tema-input').value = 'Amor, Luto';
        adicionarTemaTexto('prosas');
        mudarPapelTemaTexto('prosas', 1, 'secundario');
        assert.equal(obterTemasTexto('prosas')[1].papel, 'secundario');
        mudarPapelTemaTexto('prosas', 1, 'qualquer');
        assert.equal(obterTemasTexto('prosas')[1].papel, '');
        removerTemaTexto('prosas', 0);
        assert.deepEqual(obterTemasTexto('prosas'), [{ nome: 'Luto', papel: '' }]);
    });

    it('mostra os Assuntos derivados dos temas (somente leitura)', () => {
        db.assuntos.push({ id: 1, nome: 'Sociedade', notas: '', temas: ['machismo'] });
        document.getElementById('p-tema-input').value = 'Machismo';
        adicionarTemaTexto('poemas');
        assert.match(document.getElementById('p-temas-assuntos').innerHTML, />\s*Sociedade\s*</);
        removerTemaTexto('poemas', 0);
        assert.doesNotMatch(document.getElementById('p-temas-assuntos').innerHTML, /Sociedade/);
    });

    it('carrega do texto por id (nome vem do cadastro) e o reset limpa', () => {
        db.temas.push({ id: 7, nome: 'Amor', notas: '' });
        carregarTemasTexto('poemas', {
            temas: [
                { temaId: 7, papel: 'principal' },
                { temaId: 999, papel: '' },
            ],
        });
        assert.deepEqual(obterTemasTexto('poemas'), [{ nome: 'Amor', papel: 'principal' }]);
        assert.match(document.getElementById('p-temas-container').innerHTML, /Amor/);
        resetTemasTexto('poemas');
        assert.deepEqual(obterTemasTexto('poemas'), []);
    });

    it('texto sem `temas` cai no espelho antigo, sem papel definido', () => {
        carregarTemasTexto('prosas', { sinalizacoesTema: 'Amor, Luto' });
        assert.deepEqual(obterTemasTexto('prosas'), [
            { nome: 'Amor', papel: '' },
            { nome: 'Luto', papel: '' },
        ]);
    });

    it('o campo oculto guarda a lista em JSON e a datalist sugere os Temas do cadastro', () => {
        db.temas.push({ id: 1, nome: 'Zelo', notas: '' }, { id: 2, nome: 'Amor', notas: '' });
        resetTemasTexto('poemas');
        const opcoes = [...document.querySelectorAll('#p-temas-sugestoes option')].map((o) =>
            o.getAttribute('value'),
        );
        assert.deepEqual(opcoes, ['Amor', 'Zelo']);
        document.getElementById('p-tema-input').value = 'Amor';
        adicionarTemaTexto('poemas');
        assert.deepEqual(JSON.parse(document.getElementById('p-temas-json').value), {
            temas: [{ nome: 'Amor', papel: '' }],
            assuntosPapel: [],
            assuntosExcluidos: [],
            assuntosPendentes: [],
        });
    });
});
