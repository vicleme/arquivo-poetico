import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Gênero, orientação e cor/raça das Referências de tipo Pessoa pública, na
// tela (Poema e Prosa). Esqueleto de DOM antes do import, como em
// conhecido-como-editor.test.js.
const refext = (p, sufixo) => `
    <input id="${p}-refext-tipo" />
    <input id="${p}-refext-texto" />
    <div id="${p}-refext-conhecido-bloco" class="hidden">
        <input id="${p}-refext-conhecido" list="sugestoes-refext-conhecido${sufixo}" />
        <button id="${p}-refext-conhecido-btn" type="button"></button>
        <div id="${p}-refext-conhecido-chips"></div>
    </div>
    <div id="${p}-refext-carac-bloco" class="hidden">
        <div id="${p}-refext-genero"></div>
        <div id="${p}-refext-orientacao"></div>
        <select id="${p}-refext-cor-raca"><option value="">Cor/raça...</option></select>
    </div>
    <input id="${p}-refext-link" />
    <input id="${p}-refext-data-acesso" type="date" />
    <input id="${p}-refext-link-texto" />
    <input id="${p}-refext-nota" />
    <button id="${p}-refext-btn-add"></button>
    <button id="${p}-refext-btn-cancelar" class="hidden"></button>
    <div id="${p}-refext-lista"></div>
    <datalist id="sugestoes-refext${sufixo}"></datalist>
    <datalist id="sugestoes-refext-tipo${sufixo}"></datalist>
    <datalist id="sugestoes-refext-conhecido${sufixo}"></datalist>`;

document.body.innerHTML = `
    <div id="p-pessoa-input-wrapper">
        <input id="p-pessoa-input" />
        <div id="p-pessoas-container"></div>
        <div id="p-pessoas-grupos-info"></div>
    </div>
    <input id="p-grupo-direto-input" />
    <div id="p-grupos-diretos-container"></div>
    <input id="pr-grupo-direto-input" />
    <div id="pr-grupos-diretos-container"></div>
    ${refext('p', '')}
    ${refext('pr', '-prosa')}
    <div id="pr-sinalizacoes-corpo"></div>
`;

const ed = await import('../js/editor.js');
const { db } = await import('../js/db.js');

const val = (id, v) => (document.getElementById(id).value = v);
const el = (id) => document.getElementById(id);
const lista = (p) => el(`${p}-refext-lista`).innerHTML;

function digitarTipo(p, tipo) {
    val(`${p}-refext-tipo`, tipo);
    el(`${p}-refext-tipo`).dispatchEvent(new window.Event('input', { bubbles: true }));
    el(`${p}-refext-tipo`).dispatchEvent(new window.Event('change', { bubbles: true }));
}

function digitarNome(p, nome) {
    val(`${p}-refext-texto`, nome);
    el(`${p}-refext-texto`).dispatchEvent(new window.Event('change', { bubbles: true }));
}

const botaoGenero = (p, valor) =>
    el(`${p}-refext-genero`).querySelector(`[data-genero="${valor}"]`);
const botaoOrientacao = (p, valor) =>
    el(`${p}-refext-orientacao`).querySelector(`[data-orientacao="${valor}"]`);
const marcado = (botao) => botao.getAttribute('aria-pressed') === 'true';

function escolherCor(p, cor) {
    val(`${p}-refext-cor-raca`, cor);
    el(`${p}-refext-cor-raca`).dispatchEvent(new window.Event('change', { bubbles: true }));
}

function limpar() {
    document.querySelectorAll('input, textarea').forEach((e) => (e.value = ''));
    document.querySelectorAll('select').forEach((e) => (e.value = ''));
    ed.resetReferenciasExternas('poemas');
    ed.resetReferenciasExternas('prosas');
    db.poemas = [];
    db.prosas = [];
}

ed.ligarConhecidoComo('poemas');
ed.ligarConhecidoComo('prosas');

for (const [p, tabela] of [
    ['p', 'poemas'],
    ['pr', 'prosas'],
]) {
    describe(`Gênero, orientação e cor/raça na tela (${tabela})`, () => {
        beforeEach(limpar);

        it('os campos somem por padrão e só aparecem com o Tipo Pessoa pública', () => {
            const bloco = el(`${p}-refext-carac-bloco`);
            assert.ok(bloco.classList.contains('hidden'));
            digitarTipo(p, 'Pessoa pública');
            assert.equal(bloco.classList.contains('hidden'), false);
            digitarTipo(p, 'Notícia');
            assert.ok(bloco.classList.contains('hidden'));
        });

        it('desenha ♀, ♂ e 🜬 NB, a bandeira e ⚤, e as 5 cores no select, todos desmarcados', () => {
            const generos = [...el(`${p}-refext-genero`).querySelectorAll('button')];
            assert.deepEqual(
                generos.map((b) => b.dataset.genero),
                ['Mulher', 'Homem', 'Não-binário'],
            );
            assert.deepEqual(
                generos.map((b) => b.textContent),
                ['♀︎', '♂︎', '🜬 NB'],
            );
            const orient = [...el(`${p}-refext-orientacao`).querySelectorAll('button')];
            assert.deepEqual(
                orient.map((b) => b.textContent),
                ['🏳️‍🌈', '⚤︎'],
            );
            assert.ok([...generos, ...orient].every((b) => !marcado(b)));
            assert.deepEqual(
                [...el(`${p}-refext-cor-raca`).options].map((o) => o.value),
                ['', 'Branca', 'Preta', 'Parda', 'Amarela', 'Indígena'],
            );
        });

        it('gênero é escolha única: clicar troca, clicar de novo desmarca', () => {
            digitarTipo(p, 'Pessoa pública');
            botaoGenero(p, 'Mulher').click();
            assert.equal(marcado(botaoGenero(p, 'Mulher')), true);
            botaoGenero(p, 'Não-binário').click();
            assert.equal(marcado(botaoGenero(p, 'Mulher')), false);
            assert.equal(marcado(botaoGenero(p, 'Não-binário')), true);
            botaoGenero(p, 'Não-binário').click();
            assert.equal(marcado(botaoGenero(p, 'Não-binário')), false);
        });

        it('orientação tem três estados: LGBT, Hétero e não informado', () => {
            digitarTipo(p, 'Pessoa pública');
            botaoOrientacao(p, 'LGBT').click();
            assert.equal(marcado(botaoOrientacao(p, 'LGBT')), true);
            botaoOrientacao(p, 'Hétero').click();
            assert.equal(marcado(botaoOrientacao(p, 'LGBT')), false);
            assert.equal(marcado(botaoOrientacao(p, 'Hétero')), true);
            botaoOrientacao(p, 'Hétero').click();
            assert.equal(marcado(botaoOrientacao(p, 'Hétero')), false);
        });

        it('salva os três campos, mostra selinhos na lista e limpa o formulário', () => {
            digitarTipo(p, 'Pessoa pública');
            val(`${p}-refext-texto`, 'Cássia Eller');
            botaoGenero(p, 'Mulher').click();
            botaoOrientacao(p, 'LGBT').click();
            escolherCor(p, 'Branca');
            ed.adicionarReferenciaExterna(tabela);

            const [item] = ed.obterReferenciasExternas(tabela);
            assert.equal(item.genero, 'Mulher');
            assert.equal(item.orientacao, 'LGBT');
            assert.equal(item.corRaca, 'Branca');
            assert.match(lista(p), /♀/);
            assert.match(lista(p), /🏳️‍🌈/);
            assert.match(lista(p), /Branca/);
            // formulário limpo
            assert.equal(marcado(botaoGenero(p, 'Mulher')), false);
            assert.equal(marcado(botaoOrientacao(p, 'LGBT')), false);
            assert.equal(el(`${p}-refext-cor-raca`).value, '');
        });

        it('sem marcar nada, a entrada não ganha nenhuma das três chaves', () => {
            digitarTipo(p, 'Pessoa pública');
            val(`${p}-refext-texto`, 'Fulano');
            ed.adicionarReferenciaExterna(tabela);

            const [item] = ed.obterReferenciasExternas(tabela);
            ['genero', 'orientacao', 'corRaca'].forEach((k) => assert.equal(k in item, false, k));
        });

        it('Hétero é gravado; sem marca, orientacao não existe (não vira hétero)', () => {
            digitarTipo(p, 'Pessoa pública');
            val(`${p}-refext-texto`, 'A');
            botaoOrientacao(p, 'Hétero').click();
            ed.adicionarReferenciaExterna(tabela);
            digitarTipo(p, 'Pessoa pública');
            val(`${p}-refext-texto`, 'B');
            botaoGenero(p, 'Homem').click();
            ed.adicionarReferenciaExterna(tabela);

            const [a, b] = ed.obterReferenciasExternas(tabela);
            assert.equal(a.orientacao, 'Hétero');
            assert.equal('orientacao' in b, false);
        });

        it('com outro Tipo, o que foi marcado é descartado ao salvar', () => {
            digitarTipo(p, 'Pessoa pública');
            botaoGenero(p, 'Homem').click();
            escolherCor(p, 'Preta');
            digitarTipo(p, 'Notícia');
            val(`${p}-refext-texto`, 'Enchente');
            ed.adicionarReferenciaExterna(tabela);

            const [item] = ed.obterReferenciasExternas(tabela);
            ['genero', 'orientacao', 'corRaca'].forEach((k) => assert.equal(k in item, false, k));
        });

        it('Editar traz os três de volta e salvar grava a versão alterada', () => {
            digitarTipo(p, 'Pessoa pública');
            val(`${p}-refext-texto`, 'Fulano');
            botaoGenero(p, 'Homem').click();
            botaoOrientacao(p, 'Hétero').click();
            escolherCor(p, 'Parda');
            ed.adicionarReferenciaExterna(tabela);

            ed.editarReferenciaExterna(tabela, 0);
            assert.equal(marcado(botaoGenero(p, 'Homem')), true);
            assert.equal(marcado(botaoOrientacao(p, 'Hétero')), true);
            assert.equal(el(`${p}-refext-cor-raca`).value, 'Parda');

            botaoGenero(p, 'Homem').click(); // desmarca
            botaoOrientacao(p, 'LGBT').click();
            ed.adicionarReferenciaExterna(tabela);

            const itens = ed.obterReferenciasExternas(tabela);
            assert.equal(itens.length, 1);
            assert.equal('genero' in itens[0], false);
            assert.equal(itens[0].orientacao, 'LGBT');
            assert.equal(itens[0].corRaca, 'Parda');
        });

        it('Cancelar, carregar outro texto e resetar zeram os campos', () => {
            digitarTipo(p, 'Pessoa pública');
            botaoGenero(p, 'Mulher').click();
            escolherCor(p, 'Amarela');
            ed.cancelarEdicaoReferenciaExterna(tabela);
            assert.equal(marcado(botaoGenero(p, 'Mulher')), false);
            assert.equal(el(`${p}-refext-cor-raca`).value, '');

            digitarTipo(p, 'Pessoa pública');
            botaoOrientacao(p, 'LGBT').click();
            ed.carregarReferenciasExternas(tabela, []);
            assert.equal(marcado(botaoOrientacao(p, 'LGBT')), false);

            digitarTipo(p, 'Pessoa pública');
            botaoGenero(p, 'Homem').click();
            ed.resetReferenciasExternas(tabela);
            assert.equal(marcado(botaoGenero(p, 'Homem')), false);
        });

        it('entrada antiga, sem os campos, abre sem nada marcado', () => {
            ed.carregarReferenciasExternas(tabela, [{ tipo: 'Pessoa pública', texto: 'Antiga' }]);
            ed.editarReferenciaExterna(tabela, 0);
            assert.equal(marcado(botaoGenero(p, 'Mulher')), false);
            assert.equal(marcado(botaoOrientacao(p, 'LGBT')), false);
            assert.equal(el(`${p}-refext-cor-raca`).value, '');
        });
    });

    describe(`Preenchimento por nome repetido (${tabela})`, () => {
        beforeEach(limpar);

        const textoComPessoa = (extra) => ({
            referenciasExternas: [{ tipo: 'Pessoa pública', texto: 'Clarice Lispector', ...extra }],
        });

        it('ao citar de novo, propõe gênero, orientação e cor/raça da última vez', () => {
            db[tabela] = [
                textoComPessoa({ genero: 'Mulher', orientacao: 'LGBT', corRaca: 'Branca' }),
            ];
            digitarTipo(p, 'Pessoa pública');
            digitarNome(p, 'clarice lispector');
            assert.equal(marcado(botaoGenero(p, 'Mulher')), true);
            assert.equal(marcado(botaoOrientacao(p, 'LGBT')), true);
            assert.equal(el(`${p}-refext-cor-raca`).value, 'Branca');
        });

        it('só preenche campos vazios e não sobrescreve o que o autor marcou', () => {
            db[tabela] = [
                textoComPessoa({ genero: 'Mulher', orientacao: 'LGBT', corRaca: 'Branca' }),
            ];
            digitarTipo(p, 'Pessoa pública');
            botaoGenero(p, 'Não-binário').click();
            digitarNome(p, 'Clarice Lispector');
            assert.equal(marcado(botaoGenero(p, 'Não-binário')), true);
            assert.equal(marcado(botaoGenero(p, 'Mulher')), false);
            assert.equal(marcado(botaoOrientacao(p, 'LGBT')), true);
        });

        it('nome novo, ou Tipo que não é Pessoa pública, não propõe nada', () => {
            db[tabela] = [textoComPessoa({ genero: 'Mulher' })];
            digitarTipo(p, 'Pessoa pública');
            digitarNome(p, 'Caetano Veloso');
            assert.equal(marcado(botaoGenero(p, 'Mulher')), false);

            digitarTipo(p, 'Notícia');
            digitarNome(p, 'Clarice Lispector');
            assert.equal(marcado(botaoGenero(p, 'Mulher')), false);
        });

        it('tampouco mexe numa entrada que está sendo editada', () => {
            db[tabela] = [textoComPessoa({ genero: 'Mulher', corRaca: 'Branca' })];
            ed.carregarReferenciasExternas(tabela, [
                { tipo: 'Pessoa pública', texto: 'Clarice Lispector' },
            ]);
            ed.editarReferenciaExterna(tabela, 0);
            digitarNome(p, 'Clarice Lispector');
            assert.equal(marcado(botaoGenero(p, 'Mulher')), false);
            assert.equal(el(`${p}-refext-cor-raca`).value, '');
        });

        it('considera também entradas ainda não salvas na janela aberta', () => {
            digitarTipo(p, 'Pessoa pública');
            val(`${p}-refext-texto`, 'Fulano');
            botaoGenero(p, 'Homem').click();
            ed.adicionarReferenciaExterna(tabela);

            digitarTipo(p, 'Pessoa pública');
            digitarNome(p, 'Fulano');
            assert.equal(marcado(botaoGenero(p, 'Homem')), true);
        });
    });
}
