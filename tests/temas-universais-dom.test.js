import './helpers/dom-real.js';

import fs from 'node:fs';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Configuração dos Temas universais na aba Assuntos (entrega 2b): o bloco do
// index.html, as ações ligadas no main.js e o comportamento da tela.
const indexHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const mainJs = fs.readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');

document.body.innerHTML = `
    <main>
        <details id="universais-bloco">
            <span id="universais-resumo"></span>
            <input id="universais-novo-nome" />
            <div id="universais-relatorio" class="hidden"></div>
            <div id="lista-universais"></div>
        </details>
    </main>
`;

const { db } = await import('../js/db.js');
const ui = await import('../js/temas-universais-ui.js');
const { criarTemaUniversal, VITRINE_SUGERIDA } = await import('../js/temas-universais.js');

const $ = (id) => document.getElementById(id);
const desfazer = () =>
    [...document.querySelectorAll('button')].find((b) => b.textContent === 'Desfazer');

beforeEach(() => {
    db.temas = [
        { id: 1, nome: 'Saudade', notas: '' },
        { id: 2, nome: 'Memória', notas: '' },
        { id: 3, nome: 'Luto/Finitude', notas: '' },
    ];
    db.temasUniversais = [];
    $('universais-novo-nome').value = '';
    $('universais-relatorio').classList.add('hidden');
    document.querySelectorAll('button').forEach((b) => {
        if (b.textContent === 'Desfazer') b.closest('div')?.remove();
    });
    ui.renderTemasUniversais();
});

describe('index.html e main.js', () => {
    it('o bloco existe, fechado por padrão, e toda ação do bloco está no main.js', () => {
        const i = indexHtml.indexOf('id="universais-bloco"');
        assert.ok(i > 0);
        const bloco = indexHtml.slice(i, indexHtml.indexOf('</details>', i));
        assert.ok(!/\sopen[\s>]/.test(bloco.slice(0, 200)));
        for (const id of ['universais-resumo', 'universais-novo-nome', 'lista-universais']) {
            assert.ok(bloco.includes(`id="${id}"`), id);
        }
        const acoes = [...bloco.matchAll(/data-action="([^"]+)"/g)].map((m) => m[1]);
        assert.ok(acoes.length >= 3);
        for (const a of [
            ...acoes,
            'renomear-universal',
            'mover-universal',
            'excluir-universal',
            'adicionar-tema-universal',
            'tirar-tema-universal',
        ]) {
            assert.ok(mainJs.includes(`'${a}'`), `main.js sem a ação ${a}`);
        }
        assert.ok(!bloco.includes('onclick='));
    });
});

describe('criar, renomear, mover e excluir', () => {
    it('cria pelo campo, mostra o resumo e limpa o campo', () => {
        $('universais-novo-nome').value = ' Saudade e memória ';
        ui.aoCriarUniversal();
        assert.deepEqual(
            db.temasUniversais.map((u) => u.nome),
            ['Saudade e memória'],
        );
        assert.equal($('universais-novo-nome').value, '');
        assert.equal($('universais-resumo').textContent, '1 de 12');
        assert.ok($('lista-universais').textContent.includes('escondido do sorteio'));
    });
    it('nome vazio, repetido ou acima do teto não grava', () => {
        ui.aoCriarUniversal();
        assert.equal(db.temasUniversais.length, 0);
        criarTemaUniversal(db, 'A');
        $('universais-novo-nome').value = 'a';
        ui.aoCriarUniversal();
        assert.equal(db.temasUniversais.length, 1);
        for (let i = 0; i < 11; i++) criarTemaUniversal(db, `U${i}`);
        $('universais-novo-nome').value = 'extra';
        ui.aoCriarUniversal();
        assert.equal(db.temasUniversais.length, 12);
    });
    it('renomeia pelo campo do cartão', () => {
        const u = criarTemaUniversal(db, 'A').universal;
        ui.renderTemasUniversais();
        $(`universal-nome-${u.id}`).value = 'Novo nome';
        ui.aoRenomearUniversal(u.id);
        assert.equal(u.nome, 'Novo nome');
    });
    it('move e, na ponta, os botões vêm desabilitados', () => {
        const a = criarTemaUniversal(db, 'A').universal;
        const b = criarTemaUniversal(db, 'B').universal;
        ui.renderTemasUniversais();
        assert.equal(
            document.querySelector(
                `[data-action="mover-universal"][data-id="${a.id}"][data-delta="-1"]`,
            ).disabled,
            true,
        );
        ui.aoMoverUniversal(b.id, -1);
        assert.deepEqual(
            db.temasUniversais.map((u) => u.nome),
            ['B', 'A'],
        );
    });
    it('excluir volta com o Desfazer, na mesma posição', () => {
        criarTemaUniversal(db, 'A');
        const b = criarTemaUniversal(db, 'B').universal;
        criarTemaUniversal(db, 'C');
        ui.aoExcluirUniversal(b.id);
        assert.deepEqual(
            db.temasUniversais.map((u) => u.nome),
            ['A', 'C'],
        );
        desfazer().click();
        assert.deepEqual(
            db.temasUniversais.map((u) => u.nome),
            ['A', 'B', 'C'],
        );
    });
});

describe('Temas do universal', () => {
    it('adiciona por nome (sem caixa nem acento) e tira pelo ×', () => {
        const u = criarTemaUniversal(db, 'A').universal;
        ui.renderTemasUniversais();
        $(`universal-tema-${u.id}`).value = 'saudade';
        ui.aoAdicionarTemaAoUniversal(u.id);
        assert.deepEqual(u.temaIds, [1]);
        assert.ok($('lista-universais').textContent.includes('Saudade'));
        ui.aoTirarTemaDoUniversal(u.id, 1);
        assert.deepEqual(u.temaIds, []);
    });
    it('nome que não existe no cadastro não cria Tema nem entra', () => {
        const u = criarTemaUniversal(db, 'A').universal;
        ui.renderTemasUniversais();
        $(`universal-tema-${u.id}`).value = 'Tema inventado';
        ui.aoAdicionarTemaAoUniversal(u.id);
        assert.deepEqual(u.temaIds, []);
        assert.equal(db.temas.length, 3);
    });
    it('não repete o mesmo Tema', () => {
        const u = criarTemaUniversal(db, 'A', [2]).universal;
        ui.renderTemasUniversais();
        $(`universal-tema-${u.id}`).value = 'Memória';
        ui.aoAdicionarTemaAoUniversal(u.id);
        assert.deepEqual(u.temaIds, [2]);
    });
    it('escapa nomes com HTML', () => {
        db.temas.push({ id: 9, nome: '<b>x</b>', notas: '' });
        const u = criarTemaUniversal(db, '<i>y</i>', [9]).universal;
        ui.renderTemasUniversais();
        // Atributos serializam `<` sem escapar; o que importa é não nascer elemento.
        assert.equal($('lista-universais').querySelectorAll('b, i').length, 0);
        assert.equal($(`universal-nome-${u.id}`).value, '<i>y</i>');
    });
});

describe('vitrine sugerida', () => {
    it('Conferir mostra a prévia e não grava', () => {
        ui.aoConferirVitrine();
        assert.equal(db.temasUniversais.length, 0);
        assert.ok(!$('universais-relatorio').classList.contains('hidden'));
        assert.ok($('universais-relatorio').textContent.includes('Nada foi gravado'));
        assert.ok($('universais-relatorio').textContent.includes('Saudade e memória'));
    });
    it('Criar grava, relata os temas ausentes e o Desfazer remove só os criados', () => {
        criarTemaUniversal(db, 'Meu');
        ui.aoAplicarVitrine();
        const nomes = db.temasUniversais.map((u) => u.nome);
        assert.ok(nomes.includes('Saudade e memória'));
        assert.ok(nomes.includes('Perda e finitude'));
        assert.ok($('universais-relatorio').textContent.includes('o cadastro não tem'));
        desfazer().click();
        assert.deepEqual(
            db.temasUniversais.map((u) => u.nome),
            ['Meu'],
        );
        assert.ok($('universais-relatorio').classList.contains('hidden'));
    });
    it('a vitrine sugerida tem 11 universais (uma vaga livre)', () => {
        assert.equal(VITRINE_SUGERIDA.length, 11);
    });
});
