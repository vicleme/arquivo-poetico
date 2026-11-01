import './helpers/dom-real.js';

import fs from 'node:fs';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// "Definir por lista" na aba Temas: o seletor de campo no index.html, a troca
// da ajuda, a prévia e o aplicar por assunto e por vitrine, com Desfazer.
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
        <span id="resumo-temas"></span>
        <details id="temas-valencia-lista">
            <select id="temas-lista-campo">
                <option value="valencia">Valência</option>
                <option value="assunto">Assunto</option>
                <option value="vitrine">Vitrine</option>
            </select>
            <p id="temas-lista-ajuda"></p>
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
const escolher = (campo) => {
    $('temas-lista-campo').value = campo;
    ui.aoMudarCampoLista();
};
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
    db.assuntos = [{ id: 10, nome: 'Vínculos', temaIds: [] }];
    db.temas = [];
    sincronizarTemas(db);
    db.assuntos[0].temaIds = [];
    db.temasUniversais = [{ id: 'u1', nome: 'Quando o amor acaba', temaIds: [] }];
    $('busca-temas').value = '';
    $('filtro-temas-sem-assunto').checked = false;
    $('ordem-temas').value = 'alfabetica';
    $('filtro-temas-valencia').value = '';
    escolher('valencia');
    digitar('');
    document.querySelectorAll('button').forEach((b) => {
        if (b.textContent === 'Desfazer') b.closest('div')?.remove();
    });
}

describe('index.html e main.js', () => {
    it('o bloco chama-se "Definir por lista" e tem o seletor com os três campos', () => {
        const bloco = indexHtml.slice(
            indexHtml.indexOf('id="temas-valencia-lista"'),
            indexHtml.indexOf('id="duplicatas-temas"'),
        );
        assert.match(bloco, /Definir por lista/);
        assert.doesNotMatch(bloco, /Definir a valência por lista/);
        assert.match(bloco, /id="temas-lista-campo"/);
        ['valencia', 'assunto', 'vitrine'].forEach((v) =>
            assert.match(bloco, new RegExp(`<option value="${v}">`)),
        );
        assert.match(mainJs, /window\.mudarCampoListaTemas = aoMudarCampoLista/);
    });
});

describe('troca de campo', () => {
    beforeEach(preparar);

    it('troca a ajuda e o exemplo, mantém o texto digitado e esconde o relatório', () => {
        digitar('Agradável: Amizade');
        ui.aoConferirListaValencia();
        assert.equal(relatorio().classList.contains('hidden'), false);
        escolher('assunto');
        assert.match($('temas-lista-ajuda').textContent, /nome do assunto/);
        assert.match($('temas-valencia-lista-texto').placeholder, /Sociedade: Machismo/);
        assert.equal($('temas-valencia-lista-texto').value, 'Agradável: Amizade');
        assert.equal(relatorio().classList.contains('hidden'), true);
        escolher('vitrine');
        assert.match($('temas-lista-ajuda').textContent, /convite da vitrine/);
        escolher('valencia');
        assert.match($('temas-lista-ajuda').textContent, /Escreva a valência/);
    });
});

describe('por assunto', () => {
    beforeEach(() => {
        preparar();
        escolher('assunto');
    });

    it('Conferir mostra o resumo por assunto e não grava nada', () => {
        digitar('Vínculos: Amizade; Luto; Fantasma');
        ui.aoConferirListaValencia();
        assert.match(relatorio().textContent, /Prévia: nada foi gravado/);
        assert.match(relatorio().textContent, /Vínculos: 2 temas encontrados, 2 entram/);
        assert.match(
            relatorio().textContent,
            /Não existem no cadastro, nada foi criado: Fantasma \(Vínculos\)/,
        );
        assert.deepEqual(db.assuntos[0].temaIds, []);
        assert.equal(botaoDesfazer(), undefined);
    });

    it('Aplicar acrescenta ao assunto, avisa com Desfazer e o Desfazer devolve', () => {
        digitar('Vínculos: Amizade; Luto');
        ui.aoAplicarListaValencia();
        assert.equal(db.assuntos[0].temaIds.length, 2);
        assert.match(relatorio().textContent, /Aplicado\./);
        assert.match(relatorio().textContent, /Vínculos: 2 temas encontrados, 2 entraram/);
        const desfazer = botaoDesfazer();
        assert.ok(desfazer);
        desfazer.click();
        assert.deepEqual(db.assuntos[0].temaIds, []);
        assert.equal(relatorio().classList.contains('hidden'), true);
    });

    it('repetir a lista não muda nada e avisa', () => {
        digitar('Vínculos: Amizade');
        ui.aoAplicarListaValencia();
        document.querySelectorAll('button').forEach((b) => {
            if (b.textContent === 'Desfazer') b.closest('div')?.remove();
        });
        ui.aoAplicarListaValencia();
        assert.equal(db.assuntos[0].temaIds.length, 1);
        assert.match(
            relatorio().textContent,
            /Nada mudou: todos os temas já estavam nesses assuntos/,
        );
        assert.equal(botaoDesfazer(), undefined);
    });

    it('cabeçalho que não é assunto não grava e mostra o que ficou de fora', () => {
        digitar('Agradável: Amizade');
        ui.aoAplicarListaValencia();
        assert.deepEqual(db.assuntos[0].temaIds, []);
        assert.equal(db.temas.find((t) => t.nome === 'Amizade').valencia, undefined);
    });
});

describe('por vitrine', () => {
    beforeEach(() => {
        preparar();
        escolher('vitrine');
    });

    it('Aplicar acrescenta ao convite e Desfazer devolve', () => {
        digitar('Quando o amor acaba: Saudade');
        ui.aoAplicarListaValencia();
        assert.equal(db.temasUniversais[0].temaIds.length, 1);
        assert.match(relatorio().textContent, /Quando o amor acaba: 1 tema encontrado, 1 entrou/);
        botaoDesfazer().click();
        assert.deepEqual(db.temasUniversais[0].temaIds, []);
    });

    it('sem convites cadastrados não grava', () => {
        db.temasUniversais = [];
        digitar('Quando o amor acaba: Saudade');
        ui.aoAplicarListaValencia();
        assert.equal(botaoDesfazer(), undefined);
        assert.deepEqual(db.temasUniversais, []);
    });
});

describe('valência continua igual', () => {
    beforeEach(preparar);

    it('com o campo em Valência, Aplicar define a valência como antes', () => {
        digitar('Agradável: Amizade');
        ui.aoAplicarListaValencia();
        assert.equal(db.temas.find((t) => t.nome === 'Amizade').valencia, 'agradavel');
        assert.match(relatorio().textContent, /Agradável: 1 tema encontrado, 1 mudou/);
    });
});
