import './helpers/dom-real.js';

import fs from 'node:fs';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Valência por lista na aba Temas (entrega 2 de 3): o bloco do index.html, as
// três ações ligadas no main.js, a prévia sem gravar, o aplicar com relatório
// e o Desfazer.
const indexHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const mainJs = fs.readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');

document.body.innerHTML = `
    <main>
        <input id="busca-temas" />
        <input type="checkbox" id="filtro-temas-sem-assunto" />
        <select id="ordem-temas">
            <option value="alfabetica"></option>
            <option value="usados"></option>
        </select>
        <select id="filtro-temas-valencia">
            <option value=""></option>
            <option value="sem"></option>
        </select>
        <input type="checkbox" id="toggle-todos-temas" />
        <div id="barra-acoes-temas" class="hidden">
            <span id="contador-selecao-temas"></span>
            <select id="temas-massa-valencia"><option value="__nenhuma__"></option></select>
        </div>
        <span id="resumo-temas"></span>
        <details id="temas-valencia-lista">
            <textarea id="temas-valencia-lista-texto"></textarea>
            <div id="temas-valencia-lista-relatorio" class="hidden"></div>
        </details>
        <div id="lista-temas"></div>
    </main>
`;

const { db } = await import('../js/db.js');
const { sincronizarTemas } = await import('../js/temas.js');
const ui = await import('../js/temas-massa-ui.js');

const $ = (id) => document.getElementById(id);
const tema = (nome) => db.temas.find((t) => t.nome === nome);
const digitar = (texto) => {
    $('temas-valencia-lista-texto').value = texto;
};
const relatorio = () => $('temas-valencia-lista-relatorio');
const botaoDesfazer = () =>
    [...document.querySelectorAll('button')].find((b) => b.textContent === 'Desfazer');

function preparar() {
    db.poemas = [
        { id: 1, titulo: 'A', sinalizacoesTema: 'Luto, Amizade' },
        { id: 2, titulo: 'B', sinalizacoesTema: 'Saudade, Cotidiano' },
    ];
    db.prosas = [];
    db.assuntos = [];
    db.temas = [];
    sincronizarTemas(db);
    tema('Saudade').valencia = 'ambivalente';
    $('busca-temas').value = '';
    $('filtro-temas-sem-assunto').checked = false;
    $('ordem-temas').value = 'alfabetica';
    $('filtro-temas-valencia').value = '';
    digitar('');
    relatorio().innerHTML = '';
    relatorio().classList.add('hidden');
    document.querySelectorAll('button').forEach((b) => {
        if (b.textContent === 'Desfazer') b.closest('div')?.remove();
    });
}

describe('index.html e main.js', () => {
    it('o bloco existe na aba Temas, com o campo, o relatório e os três botões', () => {
        assert.match(indexHtml, /id="temas-valencia-lista"/);
        assert.match(indexHtml, /id="temas-valencia-lista-texto"/);
        assert.match(indexHtml, /id="temas-valencia-lista-relatorio"/);
        ['conferir-valencia-lista', 'aplicar-valencia-lista', 'limpar-valencia-lista'].forEach(
            (acao) => {
                assert.match(indexHtml, new RegExp(`data-action="${acao}"`));
                assert.match(mainJs, new RegExp(`'${acao}':`));
            },
        );
    });

    it('o texto de interface do bloco não tem travessão', () => {
        const bloco = indexHtml.slice(
            indexHtml.indexOf('id="temas-valencia-lista"'),
            indexHtml.indexOf('id="duplicatas-temas"'),
        );
        assert.ok(bloco.length > 100);
        assert.doesNotMatch(bloco, /—|–/);
    });
});

describe('Conferir (prévia)', () => {
    beforeEach(preparar);

    it('mostra o resumo e não grava nada', () => {
        digitar('Desagradável: Luto; Fantasma\nAgradável: Amizade; Cotidiano');
        ui.aoConferirListaValencia();
        assert.equal(relatorio().classList.contains('hidden'), false);
        assert.match(relatorio().textContent, /Prévia: nada foi gravado/);
        assert.match(relatorio().textContent, /Desagradável: 1 tema encontrado, 1 muda/);
        assert.match(relatorio().textContent, /Agradável: 2 temas encontrados, 2 mudam/);
        assert.match(relatorio().textContent, /Não existem no cadastro, nada foi criado: Fantasma/);
        assert.equal(tema('Luto').valencia, undefined);
        assert.equal(tema('Amizade').valencia, undefined);
        assert.equal(botaoDesfazer(), undefined);
    });

    it('lista vazia, sem cabeçalho e sem tema do cadastro não mostram prévia de sucesso', () => {
        ui.aoConferirListaValencia();
        assert.equal(relatorio().classList.contains('hidden'), true);

        digitar('Luto; Amizade');
        ui.aoConferirListaValencia();
        assert.match(
            relatorio().textContent,
            /Antes do primeiro cabeçalho, ficaram de fora: Luto; Amizade/,
        );

        digitar('Agradável: Fantasma');
        ui.aoConferirListaValencia();
        assert.match(relatorio().textContent, /Fantasma/);
        assert.equal(
            db.temas.some((t) => t.nome === 'Fantasma'),
            false,
        );
    });

    it('o nome digitado é escapado no relatório', () => {
        digitar('Agradável: <b>negrito</b>');
        ui.aoConferirListaValencia();
        assert.equal(relatorio().querySelector('b + b, p b + b'), null);
        assert.match(relatorio().innerHTML, /&lt;b&gt;negrito&lt;\/b&gt;/);
    });
});

describe('Aplicar e Desfazer', () => {
    beforeEach(preparar);

    it('grava a valência, mostra "Aplicado" e oferece o Desfazer', () => {
        digitar('Desagradável: Luto\nAgradável: Amizade; Saudade');
        ui.aoAplicarListaValencia();
        assert.equal(tema('Luto').valencia, 'desagradavel');
        assert.equal(tema('Amizade').valencia, 'agradavel');
        assert.equal(tema('Saudade').valencia, 'agradavel');
        assert.match(relatorio().textContent, /^Aplicado\./);
        assert.ok(botaoDesfazer());
    });

    it('Desfazer volta o que estava antes e esconde o relatório', () => {
        digitar('Desagradável: Luto\nAgradável: Saudade');
        ui.aoAplicarListaValencia();
        botaoDesfazer().click();
        assert.equal(tema('Luto').valencia, undefined);
        assert.equal(tema('Saudade').valencia, 'ambivalente');
        assert.equal(relatorio().classList.contains('hidden'), true);
    });

    it('"Sem valência" limpa a valência do tema', () => {
        digitar('Sem valência: Saudade');
        ui.aoAplicarListaValencia();
        assert.equal(tema('Saudade').valencia || '', '');
    });

    it('tudo igual: não oferece Desfazer e o relatório diz que nada mudou', () => {
        digitar('Ambivalente: Saudade');
        ui.aoAplicarListaValencia();
        assert.equal(botaoDesfazer(), undefined);
        assert.match(relatorio().textContent, /^Nada mudou/);
        assert.match(relatorio().textContent, /1 tema encontrado, 0 mudaram/);
    });

    it('lista inválida não grava nada', () => {
        digitar('Agradável: Fantasma');
        ui.aoAplicarListaValencia();
        assert.equal(tema('Luto').valencia, undefined);
        assert.equal(botaoDesfazer(), undefined);
    });

    it('conflito: o tema nas duas valências fica como estava e entra no relatório', () => {
        digitar('Agradável: Luto; Amizade\nDesagradável: Luto');
        ui.aoAplicarListaValencia();
        assert.equal(tema('Luto').valencia, undefined);
        assert.equal(tema('Amizade').valencia, 'agradavel');
        assert.match(
            relatorio().textContent,
            /Em mais de uma valência na lista, ficaram de fora: Luto/,
        );
    });
});

describe('Limpar campo', () => {
    beforeEach(preparar);

    it('esvazia o campo e esconde o relatório', () => {
        digitar('Agradável: Amizade');
        ui.aoConferirListaValencia();
        ui.aoLimparListaValencia();
        assert.equal($('temas-valencia-lista-texto').value, '');
        assert.equal(relatorio().classList.contains('hidden'), true);
    });
});
