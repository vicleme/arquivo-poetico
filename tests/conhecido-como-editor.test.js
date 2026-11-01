import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Campo "Conhecido(a) como" das Referências de tipo Pessoa pública, na tela
// (Poema e Prosa). Esqueleto de DOM antes do import, como em
// data-acesso-editor.test.js (o módulo de Pessoas procura estes elementos
// ao carregar).
const refext = (p, sufixo) => `
    <input id="${p}-refext-tipo" />
    <input id="${p}-refext-texto" />
    <div id="${p}-refext-conhecido-bloco" class="hidden">
        <input id="${p}-refext-conhecido" list="sugestoes-refext-conhecido${sufixo}" />
        <button id="${p}-refext-conhecido-btn" type="button"></button>
        <div id="${p}-refext-conhecido-chips"></div>
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
const bloco = (p) => el(`${p}-refext-conhecido-bloco`);
const chips = (p) => el(`${p}-refext-conhecido-chips`);
const lista = (p) => el(`${p}-refext-lista`).innerHTML;

function tecla(id, key) {
    const e = new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    el(id).dispatchEvent(e);
    return e;
}

function digitarTipo(p, tipo) {
    val(`${p}-refext-tipo`, tipo);
    el(`${p}-refext-tipo`).dispatchEvent(new window.Event('input', { bubbles: true }));
}

function limpar() {
    document.querySelectorAll('input, textarea, select').forEach((e) => (e.value = ''));
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
    describe(`Conhecido(a) como na tela (${tabela})`, () => {
        beforeEach(limpar);

        it('o campo some por padrão e só aparece com o Tipo Pessoa pública', () => {
            assert.ok(bloco(p).classList.contains('hidden'));
            digitarTipo(p, 'Pessoa pública');
            assert.equal(bloco(p).classList.contains('hidden'), false);
            digitarTipo(p, 'Notícia');
            assert.ok(bloco(p).classList.contains('hidden'));
            digitarTipo(p, 'pessoa publica');
            assert.equal(bloco(p).classList.contains('hidden'), false);
        });

        it('Enter adiciona a tag como chip, limpa o campo e não repete', () => {
            digitarTipo(p, 'Pessoa pública');
            val(`${p}-refext-conhecido`, 'cantor(a)');
            const e = tecla(`${p}-refext-conhecido`, 'Enter');
            assert.equal(e.defaultPrevented, true);
            assert.equal(el(`${p}-refext-conhecido`).value, '');
            assert.match(chips(p).innerHTML, /Cantor\(a\)/);

            val(`${p}-refext-conhecido`, 'CANTOR(A)');
            tecla(`${p}-refext-conhecido`, 'Enter');
            assert.equal(chips(p).querySelectorAll('[data-conhecido-remover]').length, 1);
        });

        it('o botão "+ tag" adiciona e o × do chip remove só aquela tag', () => {
            digitarTipo(p, 'Pessoa pública');
            val(`${p}-refext-conhecido`, 'Poeta');
            el(`${p}-refext-conhecido-btn`).click();
            val(`${p}-refext-conhecido`, 'Escritor(a)');
            el(`${p}-refext-conhecido-btn`).click();
            const botoes = chips(p).querySelectorAll('[data-conhecido-remover]');
            assert.equal(botoes.length, 2);

            botoes[0].click();
            const restantes = chips(p).querySelectorAll('[data-conhecido-remover]');
            assert.equal(restantes.length, 1);
            assert.match(chips(p).innerHTML, /Escritor\(a\)/);
            assert.doesNotMatch(chips(p).innerHTML, /Poeta/);
        });

        it('salva a entrada com as tags, mostra na lista e limpa o formulário', () => {
            digitarTipo(p, 'Pessoa pública');
            val(`${p}-refext-texto`, 'Cássia Eller');
            val(`${p}-refext-conhecido`, 'Cantor(a)');
            tecla(`${p}-refext-conhecido`, 'Enter');
            val(`${p}-refext-conhecido`, 'Figura histórica');
            tecla(`${p}-refext-conhecido`, 'Enter');
            ed.adicionarReferenciaExterna(tabela);

            const [item] = ed.obterReferenciasExternas(tabela);
            assert.deepEqual(item.conhecidoComo, ['Cantor(a)', 'Figura histórica']);
            assert.equal(item.texto, 'Cássia Eller');
            assert.match(lista(p), /Cantor\(a\)/);
            assert.match(lista(p), /Figura histórica/);
            assert.equal(chips(p).innerHTML, '');
            assert.ok(bloco(p).classList.contains('hidden'));
            assert.equal(el(`${p}-refext-tipo`).value, '');
        });

        it('tag digitada sem Enter entra junto ao salvar a entrada', () => {
            digitarTipo(p, 'Pessoa pública');
            val(`${p}-refext-texto`, 'Clarice Lispector');
            val(`${p}-refext-conhecido`, 'escritor(a)');
            ed.adicionarReferenciaExterna(tabela);

            const [item] = ed.obterReferenciasExternas(tabela);
            assert.deepEqual(item.conhecidoComo, ['Escritor(a)']);
        });

        it('sem tag nenhuma, a entrada não ganha a chave', () => {
            digitarTipo(p, 'Pessoa pública');
            val(`${p}-refext-texto`, 'Fulano');
            ed.adicionarReferenciaExterna(tabela);

            const [item] = ed.obterReferenciasExternas(tabela);
            assert.equal('conhecidoComo' in item, false);
        });

        it('com outro Tipo as tags escolhidas são descartadas ao salvar', () => {
            digitarTipo(p, 'Pessoa pública');
            val(`${p}-refext-conhecido`, 'Cantor(a)');
            tecla(`${p}-refext-conhecido`, 'Enter');
            digitarTipo(p, 'Notícia');
            val(`${p}-refext-texto`, 'Enchente');
            ed.adicionarReferenciaExterna(tabela);

            const [item] = ed.obterReferenciasExternas(tabela);
            assert.equal('conhecidoComo' in item, false);
            assert.doesNotMatch(lista(p), /Cantor/);
        });

        it('Editar carrega as tags nos chips e salvar grava a lista alterada', () => {
            digitarTipo(p, 'Pessoa pública');
            val(`${p}-refext-texto`, 'Fulano');
            val(`${p}-refext-conhecido`, 'Poeta');
            tecla(`${p}-refext-conhecido`, 'Enter');
            ed.adicionarReferenciaExterna(tabela);

            ed.editarReferenciaExterna(tabela, 0);
            assert.equal(bloco(p).classList.contains('hidden'), false);
            assert.match(chips(p).innerHTML, /Poeta/);

            val(`${p}-refext-conhecido`, 'Cientista');
            tecla(`${p}-refext-conhecido`, 'Enter');
            ed.adicionarReferenciaExterna(tabela);

            const itens = ed.obterReferenciasExternas(tabela);
            assert.equal(itens.length, 1);
            assert.deepEqual(itens[0].conhecidoComo, ['Poeta', 'Cientista']);
        });

        it('Editar uma entrada sem tags abre o campo vazio, e Cancelar limpa tudo', () => {
            digitarTipo(p, 'Pessoa pública');
            val(`${p}-refext-texto`, 'Fulano');
            ed.adicionarReferenciaExterna(tabela);

            ed.editarReferenciaExterna(tabela, 0);
            assert.equal(chips(p).innerHTML, '');

            val(`${p}-refext-conhecido`, 'Atleta');
            tecla(`${p}-refext-conhecido`, 'Enter');
            ed.cancelarEdicaoReferenciaExterna(tabela);
            assert.equal(chips(p).innerHTML, '');
            assert.equal(el(`${p}-refext-conhecido`).value, '');
            assert.ok(bloco(p).classList.contains('hidden'));
            assert.equal('conhecidoComo' in ed.obterReferenciasExternas(tabela)[0], false);
        });

        it('abrir outro texto (carregar) ou texto novo (reset) zera as tags em edição', () => {
            digitarTipo(p, 'Pessoa pública');
            val(`${p}-refext-conhecido`, 'Atleta');
            tecla(`${p}-refext-conhecido`, 'Enter');
            ed.carregarReferenciasExternas(tabela, []);
            assert.equal(chips(p).innerHTML, '');

            digitarTipo(p, 'Pessoa pública');
            val(`${p}-refext-conhecido`, 'Atleta');
            tecla(`${p}-refext-conhecido`, 'Enter');
            ed.resetReferenciasExternas(tabela);
            assert.equal(chips(p).innerHTML, '');
            assert.equal(el(`${p}-refext-conhecido`).value, '');
        });

        it('as sugestões juntam as de fábrica com as tags já usadas no acervo', () => {
            const textos = [
                {
                    referenciasExternas: [
                        { tipo: 'Pessoa pública', texto: 'F', conhecidoComo: ['Poeta maldito'] },
                    ],
                },
            ];
            if (tabela === 'poemas') db.poemas = textos;
            else db.prosas = textos;
            ed.atualizarDatalistReferenciaExterna(tabela);

            const sufixo = tabela === 'prosas' ? '-prosa' : '';
            const opcoes = Array.from(
                el(`sugestoes-refext-conhecido${sufixo}`).querySelectorAll('option'),
            ).map((o) => o.getAttribute('value'));
            assert.ok(opcoes.includes('Figura histórica'));
            assert.ok(opcoes.includes('Cantor(a)'));
            assert.ok(opcoes.includes('Poeta maldito'));
        });
    });
}

describe('Conhecido(a) como na tela: Poema e Prosa não se misturam', () => {
    beforeEach(limpar);

    it('as tags de uma tabela não vazam para a outra', () => {
        digitarTipo('p', 'Pessoa pública');
        val('p-refext-conhecido', 'Cantor(a)');
        tecla('p-refext-conhecido', 'Enter');
        assert.match(chips('p').innerHTML, /Cantor/);
        assert.equal(chips('pr').innerHTML, '');
    });
});
