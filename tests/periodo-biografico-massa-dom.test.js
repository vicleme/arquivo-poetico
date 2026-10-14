import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Aba Período Biográfico: seleção por cartão, barra de edição em massa,
// aviso de seleção com mais de um autor, Desfazer e pessoa oculta.
const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const secao = indexHtml.match(/<section id="epocas"[\s\S]*?<\/section>/)[0];
document.body.innerHTML = `<main>${secao}</main>`;

const { db } = await import('../js/db.js');
const { renderEpocas } = await import('../js/render-listas.js');
const E = await import('../js/epocas-acoes.js');
const { ROTULOS_VINCULO_DE_FABRICA } = await import('../js/periodo-biografico-campos.js');

const el = (id) => document.getElementById(id);
const definir = (id, valor) => {
    el(id).value = valor;
    el(id).onchange?.();
};
const checkboxes = () => [
    ...document.querySelectorAll('#lista-epocas [data-action="toggle-epoca"]'),
];
const barraVisivel = () => !el('barra-acoes-epocas').classList.contains('hidden');
const opcoes = (id) => [...el(id).options].map((o) => o.textContent);
const botaoDesfazer = () =>
    [...document.querySelectorAll('button')].find((b) => b.textContent === 'Desfazer');

function montar() {
    db.autores = [
        { id: 1, nome: 'Ana', genero: 'Mulher' },
        { id: 2, nome: 'Bia', genero: 'Mulher' },
    ];
    db.pessoas = [
        { id: 100, nome: 'Carla', oculto: false },
        { id: 101, nome: 'Davi', oculto: true },
    ];
    db.opcoesPeriodoBiografico = {
        esferas: ['Afetiva'],
        vinculos: ['Amizade', ...ROTULOS_VINCULO_DE_FABRICA.map((r) => r.nome)],
        rotulosVinculo: ROTULOS_VINCULO_DE_FABRICA.map((r) => ({ ...r })),
    };
    const base = { esferas: [], categorias: [], pessoasEnvolvidas: [], relacoes: [] };
    db.epocas = [
        { id: 1, nome: 'A1', autorId: 1, ...base },
        { id: 2, nome: 'A2', autorId: 1, ...base },
        { id: 3, nome: 'A3', autorId: 1, ...base },
        { id: 4, nome: 'B1', autorId: 2, ...base },
    ];
    db.poemas = [];
    db.prosas = [];
    E.selecaoEpocas.clear();
    document.querySelectorAll('#toast-container, [data-toast]').forEach((t) => t.remove());
    document.getElementById('modal-confirmar-exclusao')?.remove();
    renderEpocas();
    definir('epocas-massa-acao', 'adicionar');
}

describe('seleção por cartão', () => {
    beforeEach(montar);

    it('cada cartão tem checkbox e a barra só aparece com seleção', () => {
        assert.equal(checkboxes().length, 4);
        assert.equal(barraVisivel(), false);
        E.toggleSelecaoEpoca(1, true);
        assert.equal(barraVisivel(), true);
        assert.match(el('contador-selecao-epocas').textContent, /1 período selecionado/);
        assert.equal(checkboxes().find((c) => c.dataset.id === '1').checked, true);
    });

    it('selecionar todos marca o que aparece e o checkbox geral acompanha', () => {
        E.toggleSelecaoTodosEpocas(true);
        assert.equal(E.selecaoEpocas.size, 4);
        assert.equal(el('toggle-todos-epocas').checked, true);
        E.toggleSelecaoEpoca(2, false);
        assert.equal(el('toggle-todos-epocas').checked, false);
    });

    it('shift-click marca o intervalo na ordem da tela', () => {
        E.toggleSelecaoEpoca(1, true);
        E.toggleSelecaoEpoca(3, true, true);
        assert.deepEqual([...E.selecaoEpocas].sort(), [1, 2, 3]);
    });

    it('inverter e limpar', () => {
        E.toggleSelecaoEpoca(1, true);
        E.inverterSelecaoEpocas();
        assert.deepEqual([...E.selecaoEpocas].sort(), [2, 3, 4]);
        E.limparSelecaoEpocas();
        assert.equal(barraVisivel(), false);
    });

    it('período apagado sai da seleção', () => {
        E.toggleSelecaoEpoca(4, true);
        db.epocas = db.epocas.filter((e) => e.id !== 4);
        renderEpocas();
        assert.equal(E.selecaoEpocas.size, 0);
    });
});

describe('barra de edição em massa', () => {
    beforeEach(montar);

    it('acrescentar Esfera nos selecionados e Desfazer', () => {
        E.toggleSelecaoEpoca(1, true);
        E.toggleSelecaoEpoca(2, true);
        definir('epocas-massa-campo', 'esfera');
        el('epocas-massa-valor').value = 'Afetiva';
        E.aplicarMassaEpocas();
        assert.deepEqual(db.epocas[0].esferas, ['Afetiva']);
        assert.deepEqual(db.epocas[1].esferas, ['Afetiva']);
        assert.deepEqual(db.epocas[2].esferas, []);
        botaoDesfazer().click();
        assert.deepEqual(db.epocas[0].esferas, []);
        assert.deepEqual(db.epocas[1].esferas, []);
    });

    it('campo incompleto não muda nada', () => {
        E.toggleSelecaoEpoca(1, true);
        definir('epocas-massa-campo', 'esfera');
        el('epocas-massa-valor').value = '';
        E.aplicarMassaEpocas();
        assert.deepEqual(db.epocas[0].esferas, []);
    });

    it('relação com "Autor do período" e seleção de um só autor aplica direto', () => {
        E.toggleSelecaoEpoca(1, true);
        E.toggleSelecaoEpoca(2, true);
        definir('epocas-massa-campo', 'relacao');
        definir('epocas-massa-de', 'autor');
        definir('epocas-massa-para', '100');
        el('epocas-massa-vinculo').value = 'Amizade';
        E.aplicarMassaEpocas();
        assert.equal(document.getElementById('modal-confirmar-exclusao'), null);
        assert.equal(db.epocas[0].relacoes.length, 1);
        assert.equal(db.epocas[1].relacoes.length, 1);
    });

    it('avisa quando a seleção mistura autores e só aplica depois de confirmar', () => {
        E.toggleSelecaoEpoca(1, true);
        E.toggleSelecaoEpoca(4, true);
        definir('epocas-massa-campo', 'relacao');
        definir('epocas-massa-de', 'autor');
        definir('epocas-massa-para', '100');
        el('epocas-massa-vinculo').value = 'Amizade';
        E.aplicarMassaEpocas();
        const modal = document.getElementById('modal-confirmar-exclusao');
        assert.ok(modal, 'a confirmação deveria aparecer');
        assert.match(modal.textContent, /Ana, Bia/);
        assert.equal(db.epocas[0].relacoes.length, 0, 'nada muda antes de confirmar');
        const confirmar = [...modal.querySelectorAll('button')].find(
            (b) => b.textContent === 'Aplicar mesmo assim',
        );
        confirmar.click();
        assert.equal(db.epocas[0].relacoes.length, 1);
        assert.equal(db.epocas[3].relacoes.length, 1);
    });

    it('mistura de autores sem usar "Autor do período" não pede confirmação', () => {
        E.toggleSelecaoEpoca(1, true);
        E.toggleSelecaoEpoca(4, true);
        definir('epocas-massa-campo', 'categoria');
        el('epocas-massa-valor').value = 'Nova';
        E.aplicarMassaEpocas();
        assert.equal(document.getElementById('modal-confirmar-exclusao'), null);
        assert.deepEqual(db.epocas[3].categorias, ['Nova']);
    });

    it('pessoa oculta fora dos seletores até ligar "Mostrar ocultas"; some ao limpar a seleção', () => {
        E.toggleSelecaoEpoca(1, true);
        assert.ok(!opcoes('epocas-massa-pessoa').some((t) => t.startsWith('Davi')));
        assert.ok(!opcoes('epocas-massa-de').some((t) => t.startsWith('Davi')));
        assert.equal(el('epocas-massa-ocultas').classList.contains('hidden'), false);
        E.alternarOcultasNaBarraEpocas();
        assert.ok(opcoes('epocas-massa-pessoa').includes('Davi (oculta)'));
        assert.ok(opcoes('epocas-massa-para').includes('Davi (oculta)'));
        E.limparSelecaoEpocas();
        E.toggleSelecaoEpoca(1, true);
        assert.ok(!opcoes('epocas-massa-pessoa').some((t) => t.startsWith('Davi')));
    });

    it('remover uma Pessoa em massa tira também as relações dela', () => {
        db.epocas[0].pessoasEnvolvidas = [{ pessoaId: 100 }];
        db.epocas[0].relacoes = [{ de: 'autor', para: 100, natureza: '', vinculo: 'Amizade' }];
        E.toggleSelecaoEpoca(1, true);
        definir('epocas-massa-acao', 'remover');
        definir('epocas-massa-campo', 'pessoa');
        definir('epocas-massa-pessoa', '100');
        E.aplicarMassaEpocas();
        assert.deepEqual(db.epocas[0].pessoasEnvolvidas, []);
        assert.deepEqual(db.epocas[0].relacoes, []);
    });
});

describe('Natureza na barra de edição em massa (item 3)', () => {
    beforeEach(() => {
        montar();
        db.opcoesPeriodoBiografico.naturezas = ['Familiar', 'Amizade', 'Romance'];
        E.toggleSelecaoEpoca(1, true);
        E.toggleSelecaoEpoca(2, true);
        definir('epocas-massa-campo', 'relacao');
        definir('epocas-massa-de', 'autor');
        definir('epocas-massa-para', '100');
    });

    it('a barra tem o seletor de Natureza com as do vocabulário', () => {
        E.toggleSelecaoEpoca(3, true); // redesenha os seletores
        assert.deepEqual(opcoes('epocas-massa-natureza'), [
            'Natureza…',
            'Amizade',
            'Familiar',
            'Romance',
        ]);
    });

    it('acrescenta uma relação só com Natureza (sem vínculo)', () => {
        definir('epocas-massa-natureza', 'Amizade');
        el('epocas-massa-vinculo').value = '';
        E.aplicarMassaEpocas();
        assert.deepEqual(db.epocas[0].relacoes, [
            { de: 'autor', para: 100, natureza: 'Amizade', vinculo: '' },
        ]);
        assert.equal(db.epocas[1].relacoes.length, 1);
    });

    it('acrescenta com Natureza e Vínculo, e o aviso descreve os dois', () => {
        definir('epocas-massa-natureza', 'Romance');
        el('epocas-massa-vinculo').value = 'Namorados';
        E.aplicarMassaEpocas();
        assert.deepEqual(db.epocas[0].relacoes, [
            { de: 'autor', para: 100, natureza: 'Romance', vinculo: 'Namorados' },
        ]);
        assert.match(document.body.textContent, /Romance \/ Namorados/);
    });

    it('sem Natureza e sem vínculo não muda nada', () => {
        definir('epocas-massa-natureza', '');
        el('epocas-massa-vinculo').value = '';
        E.aplicarMassaEpocas();
        assert.deepEqual(db.epocas[0].relacoes, []);
    });

    it('Desfazer devolve os períodos ao que eram', () => {
        definir('epocas-massa-natureza', 'Familiar');
        E.aplicarMassaEpocas();
        assert.equal(db.epocas[0].relacoes.length, 1);
        botaoDesfazer().click();
        assert.deepEqual(db.epocas[0].relacoes, []);
        assert.deepEqual(db.epocas[1].relacoes, []);
    });
});
