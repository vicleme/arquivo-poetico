import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Caixinhas de sugestões das buscas de Metadados de Poemas e Prosas, nas
// seções reais do index.html.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const secao = (id) => {
    const m = html.match(new RegExp(`<section id="${id}"[\\s\\S]*?</section>`));
    assert.ok(m, `seção ${id} não achada`);
    return m[0];
};
document.body.innerHTML = `<main>${secao('poemas')}${secao('prosas')}</main><div id="modais-container"></div>`;

const { db } = await import('../js/db.js');
const { initSugestoesBuscaTexto, atualizarSugestoesBuscaTexto, fecharSugestoesBuscaTexto } =
    await import('../js/ui-sugestoes-busca-texto.js');

const caixa = (tabela) => document.getElementById(`busca-${tabela}`);
const painel = (tabela) => document.getElementById(`sugestoes-busca-${tabela}`);
const linhas = (tabela) => Array.from(painel(tabela).querySelectorAll('[data-indice]'));
const rotulos = (tabela) => linhas(tabela).map((l) => l.firstChild.textContent);
const digitar = (tabela, texto) => {
    caixa(tabela).value = texto;
    caixa(tabela).dispatchEvent(new window.Event('input', { bubbles: true }));
};
const tecla = (tabela, key) =>
    caixa(tabela).dispatchEvent(
        new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    );

describe('sugestões na busca de Poemas e Prosas', () => {
    beforeEach(() => {
        localStorage.clear();
        db.temas = [
            { id: 1, nome: 'Luto' },
            { id: 2, nome: 'Amor' },
        ];
        db.etiquetas = [];
        db.poemas = [
            { id: 1, titulo: 'A', temas: [{ temaId: 1, papel: 'principal' }] },
            { id: 2, titulo: 'B', temas: [{ temaId: 2, papel: 'principal' }] },
        ];
        db.prosas = [{ id: 3, titulo: 'C', genero: ['Conto'], temas: [] }];
        initSugestoesBuscaTexto();
        fecharSugestoesBuscaTexto('poemas');
        fecharSugestoesBuscaTexto('prosas');
        caixa('poemas').value = '';
        caixa('prosas').value = '';
    });

    it('o markup tem as duas caixinhas, escondidas, e as caixas sem autocompletar do navegador', () => {
        ['poemas', 'prosas'].forEach((tabela) => {
            assert.ok(painel(tabela), `caixinha de ${tabela}`);
            assert.equal(painel(tabela).classList.contains('hidden'), true);
            assert.equal(caixa(tabela).getAttribute('autocomplete'), 'off');
            assert.equal(caixa(tabela).dataset.sugestoesLigadas, 'sim');
        });
    });

    it('digitar um prefixo abre as opções; sem relação, fecha', () => {
        digitar('poemas', 'temap');
        assert.equal(painel('poemas').classList.contains('hidden'), false);
        assert.deepEqual(rotulos('poemas'), ['temaprincipal:']);
        digitar('poemas', 'zzz');
        assert.equal(painel('poemas').classList.contains('hidden'), true);
    });

    it('Enter aplica a primeira e segue oferecendo o que vem depois', () => {
        digitar('poemas', 'temaprincipal:lu');
        tecla('poemas', 'Enter');
        assert.equal(caixa('poemas').value, 'temaprincipal:Luto ');
    });

    it('as setas movem a escolha, Tab aplica e Esc fecha', () => {
        digitar('poemas', 'tema:');
        assert.deepEqual(rotulos('poemas'), ['*', 'Amor', 'Luto']);
        tecla('poemas', 'ArrowDown');
        tecla('poemas', 'ArrowDown');
        assert.equal(linhas('poemas')[2].getAttribute('aria-selected'), 'true');
        tecla('poemas', 'Tab');
        assert.equal(caixa('poemas').value, 'tema:Luto ');
        digitar('poemas', 'tema:');
        tecla('poemas', 'Escape');
        assert.equal(painel('poemas').classList.contains('hidden'), true);
    });

    it('as duas abas são independentes', () => {
        digitar('poemas', 'temap');
        digitar('prosas', 'gen');
        assert.deepEqual(rotulos('poemas'), ['temaprincipal:']);
        assert.deepEqual(rotulos('prosas'), ['genero:']);
        fecharSugestoesBuscaTexto('prosas');
        assert.equal(painel('poemas').classList.contains('hidden'), false);
    });

    it('genero aparece em Prosas e não em Poemas', () => {
        digitar('poemas', 'gen');
        assert.equal(painel('poemas').classList.contains('hidden'), true);
        digitar('prosas', 'genero:');
        assert.deepEqual(rotulos('prosas'), ['*', 'Conto']);
    });

    it('clicar (mousedown) numa linha aplica', () => {
        digitar('poemas', 'tema:am');
        linhas('poemas')[0].dispatchEvent(
            new window.MouseEvent('mousedown', { bubbles: true, cancelable: true }),
        );
        assert.equal(caixa('poemas').value, 'tema:Amor ');
    });

    it('atualizar sem a caixa na página não lança', () => {
        assert.doesNotThrow(() => atualizarSugestoesBuscaTexto('poemas'));
    });
    it('avisa quando a lista foi cortada pelo limite, e não avisa quando cabe tudo', () => {
        db.pessoas = Array.from({ length: 20 }, (_, i) => ({ id: 100 + i, nome: `Pessoa ${i}` }));
        digitar('poemas', 'pessoa:');
        const aviso = painel('poemas').querySelector('[data-aviso-corte]');
        assert.ok(aviso, 'aviso de corte');
        assert.equal(linhas('poemas').length, 12);
        assert.match(aviso.textContent, /Mostrando 12 de 21\./);
        assert.match(aviso.textContent, /Digite mais letras/);

        // o aviso não é uma opção: clicar nele não aplica nada e a caixa segue como estava
        aviso.dispatchEvent(
            new window.MouseEvent('mousedown', { bubbles: true, cancelable: true }),
        );
        assert.equal(caixa('poemas').value, 'pessoa:');

        // afunilando, cabe tudo e o aviso some
        digitar('poemas', 'pessoa:Pessoa 1');
        assert.equal(painel('poemas').querySelector('[data-aviso-corte]'), null);
        db.pessoas = [];
    });
});
