import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { db } from '../js/db.js';
import {
    renderTemasPoema,
    renderTemasProsa,
    adicionarTemaTexto,
    removerTemaTexto,
    resetTemasTexto,
    abrirAssuntoTemaTexto,
    fecharAssuntoTemaTexto,
    adicionarAssuntoTemaTexto,
    desfazerAssuntoPendenteTexto,
    obterAssuntosPendentesTexto,
} from '../js/editor.js';
import { temasParaSalvar } from '../js/forms.js';

// "+ Assunto" no grupo Temas e Assuntos do modal: liga o Tema a um Assunto do
// cadastro (existente ou novo), só gravando ao salvar o texto.
const $ = (id) => document.getElementById(id);

function montarDom() {
    document.body.innerHTML = '<div id="p-temas-corpo"></div><div id="pr-temas-corpo"></div>';
    renderTemasPoema();
    renderTemasProsa();
}

function digitarAssunto(texto, pre = 'p') {
    $(`${pre}-assunto-input`).value = texto;
}
const blocoDerivados = () => $('p-temas-assuntos').textContent.replace(/\s+/g, ' ');
const blocoTemas = () => $('p-temas-container').textContent.replace(/\s+/g, ' ');

describe('"+ Assunto" no modal (editor.js, DOM real)', () => {
    beforeEach(() => {
        db.temas.length = 0;
        db.assuntos.length = 0;
        db.temas.push({ id: 1, nome: 'Amor', notas: '' }, { id: 2, nome: 'Machismo', notas: '' });
        db.assuntos.push(
            { id: 10, nome: 'Sociedade', notas: '', temaIds: [2] },
            { id: 11, nome: 'Afetos', notas: '', temaIds: [] },
        );
        db.poemas.length = 0;
        db.prosas.length = 0;
        montarDom();
        resetTemasTexto('poemas');
        resetTemasTexto('prosas');
    });

    it('mostra os assuntos do tema e avisa quando não há nenhum', () => {
        adicionarTemaTexto('poemas', 'Amor, Machismo');
        assert.match(blocoTemas(), /Sem assunto ainda/);
        assert.match(blocoTemas(), /Assuntos: Sociedade/);
        assert.equal(
            $('p-temas-container').querySelectorAll('[onclick^="abrirAssuntoTemaTexto"]').length,
            2,
        );
    });

    it('abre um mini-formulário só para o tema escolhido, com o aviso de efeito geral', () => {
        adicionarTemaTexto('poemas', 'Amor, Machismo');
        abrirAssuntoTemaTexto('poemas', 0);
        assert.ok($('p-assunto-input'));
        assert.equal(document.querySelectorAll('#p-temas-container input').length, 1);
        assert.match(blocoTemas(), /vale para todos os textos com ele \(hoje: 0\)/);
        abrirAssuntoTemaTexto('poemas', 1);
        assert.equal(document.querySelectorAll('#p-temas-container input').length, 1);
        fecharAssuntoTemaTexto('poemas');
        assert.equal($('p-assunto-input'), null);
    });

    it('a contagem do aviso usa os textos que já têm o tema', () => {
        db.poemas.push({ id: 5, titulo: 'X', sinalizacoesTema: 'Amor' });
        db.prosas.push({ id: 6, titulo: 'Y', sinalizacoesTema: 'amor' });
        db.poemas.forEach(() => {});
        adicionarTemaTexto('poemas', 'Amor');
        abrirAssuntoTemaTexto('poemas', 0);
        assert.match(blocoTemas(), /\(hoje: 2\)/);
    });

    it('liga a um assunto existente: aparece como pendente e nos assuntos do texto, sem tocar no cadastro', () => {
        adicionarTemaTexto('poemas', 'Amor');
        abrirAssuntoTemaTexto('poemas', 0);
        digitarAssunto('afetos');
        adicionarAssuntoTemaTexto('poemas', 0);
        assert.deepEqual(obterAssuntosPendentesTexto('poemas'), [
            { temaChave: 'amor', assuntoId: 11, nome: 'Afetos' },
        ]);
        assert.match(blocoTemas(), /Assuntos: Afetos/);
        assert.match(blocoDerivados(), /Afetos/);
        assert.deepEqual(db.assuntos[1].temaIds, []);
        // o formulário continua aberto e limpo, para ligar a outro assunto
        assert.equal($('p-assunto-input').value, '');
    });

    it('assunto novo: marcado como novo, sem seletor de papel, e nada entra no cadastro', () => {
        adicionarTemaTexto('poemas', 'Amor');
        abrirAssuntoTemaTexto('poemas', 0);
        digitarAssunto('Corpo e desejo');
        adicionarAssuntoTemaTexto('poemas', 0);
        assert.match(blocoTemas(), /Corpo e desejo \(novo\)/);
        assert.match(blocoDerivados(), /Corpo e desejo/);
        assert.match(blocoDerivados(), /novo, entra ao salvar/);
        assert.equal($('p-temas-assuntos').querySelectorAll('select').length, 0);
        assert.equal(db.assuntos.length, 2);
    });

    it('"já está" e vazio não criam pendência', () => {
        adicionarTemaTexto('poemas', 'Machismo');
        abrirAssuntoTemaTexto('poemas', 0);
        digitarAssunto('Sociedade');
        adicionarAssuntoTemaTexto('poemas', 0);
        digitarAssunto('   ');
        adicionarAssuntoTemaTexto('poemas', 0);
        assert.deepEqual(obterAssuntosPendentesTexto('poemas'), []);
    });

    it('"×" desfaz a pendência', () => {
        adicionarTemaTexto('poemas', 'Amor');
        abrirAssuntoTemaTexto('poemas', 0);
        digitarAssunto('Afetos');
        adicionarAssuntoTemaTexto('poemas', 0);
        desfazerAssuntoPendenteTexto('poemas', 0);
        assert.deepEqual(obterAssuntosPendentesTexto('poemas'), []);
        assert.match(blocoTemas(), /Sem assunto ainda/);
    });

    it('tirar o tema do texto descarta a pendência e fecha o formulário', () => {
        adicionarTemaTexto('poemas', 'Amor');
        abrirAssuntoTemaTexto('poemas', 0);
        digitarAssunto('Afetos');
        adicionarAssuntoTemaTexto('poemas', 0);
        removerTemaTexto('poemas', 0);
        assert.deepEqual(obterAssuntosPendentesTexto('poemas'), []);
        assert.equal($('p-assunto-input'), null);
    });

    it('Poema e Prosa têm pendências independentes; reset limpa', () => {
        adicionarTemaTexto('poemas', 'Amor');
        adicionarTemaTexto('prosas', 'Amor');
        abrirAssuntoTemaTexto('poemas', 0);
        digitarAssunto('Afetos');
        adicionarAssuntoTemaTexto('poemas', 0);
        assert.equal(obterAssuntosPendentesTexto('prosas').length, 0);
        resetTemasTexto('poemas');
        assert.deepEqual(obterAssuntosPendentesTexto('poemas'), []);
    });

    it('o campo escondido do formulário carrega as pendências (rastreador de alterações)', () => {
        adicionarTemaTexto('poemas', 'Amor');
        abrirAssuntoTemaTexto('poemas', 0);
        digitarAssunto('Afetos');
        adicionarAssuntoTemaTexto('poemas', 0);
        const estado = JSON.parse($('p-temas-json').value);
        assert.equal(estado.assuntosPendentes.length, 1);
    });

    it('layout da coluna estreita: tudo empilhado, sem tabela e com campo de largura total', () => {
        adicionarTemaTexto('poemas', 'Amor');
        abrirAssuntoTemaTexto('poemas', 0);
        const card = $('p-temas-container').firstElementChild;
        assert.equal(card.querySelector('table'), null);
        assert.ok($('p-assunto-input').classList.contains('w-full'));
        assert.ok(card.classList.contains('flex-col'));
    });
});

describe('salvar o texto grava as ligações no cadastro (forms.js)', () => {
    beforeEach(() => {
        db.temas.length = 0;
        db.assuntos.length = 0;
        db.temas.push({ id: 1, nome: 'Amor', notas: '' });
        db.assuntos.push({ id: 11, nome: 'Afetos', notas: '', temaIds: [] });
        montarDom();
        resetTemasTexto('poemas');
    });

    it('liga ao existente, cria o novo e cria o tema que ainda não existia', () => {
        adicionarTemaTexto('poemas', 'Amor, Exílio');
        abrirAssuntoTemaTexto('poemas', 0);
        digitarAssunto('Afetos');
        adicionarAssuntoTemaTexto('poemas', 0);
        digitarAssunto('Corpo');
        adicionarAssuntoTemaTexto('poemas', 0);
        abrirAssuntoTemaTexto('poemas', 1);
        digitarAssunto('Corpo');
        adicionarAssuntoTemaTexto('poemas', 1);

        const dados = temasParaSalvar('poemas');
        const exilio = db.temas.find((t) => t.nome === 'Exílio');
        assert.ok(exilio, 'tema novo criado ao salvar');
        assert.deepEqual(db.assuntos.find((a) => a.id === 11).temaIds, [1]);
        const corpo = db.assuntos.find((a) => a.nome === 'Corpo');
        assert.deepEqual(corpo.temaIds, [1, exilio.id]);
        assert.equal(db.assuntos.filter((a) => a.nome === 'Corpo').length, 1);
        assert.equal(dados.temas.length, 2);
        assert.equal(dados.sinalizacoesTema, 'Amor, Exílio');
    });

    it('sem salvar (modal cancelado) o cadastro fica como estava', () => {
        adicionarTemaTexto('poemas', 'Amor');
        abrirAssuntoTemaTexto('poemas', 0);
        digitarAssunto('Corpo');
        adicionarAssuntoTemaTexto('poemas', 0);
        resetTemasTexto('poemas');
        assert.equal(db.assuntos.length, 1);
        assert.deepEqual(db.assuntos[0].temaIds, []);
    });

    it('a ligação vale para outros textos com o tema (assunto derivado do cadastro)', () => {
        adicionarTemaTexto('poemas', 'Amor');
        abrirAssuntoTemaTexto('poemas', 0);
        digitarAssunto('Afetos');
        adicionarAssuntoTemaTexto('poemas', 0);
        temasParaSalvar('poemas');
        montarDom();
        resetTemasTexto('prosas');
        adicionarTemaTexto('prosas', 'Amor');
        assert.match($('pr-temas-assuntos').textContent, /Afetos/);
    });
});
