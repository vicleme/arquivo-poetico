import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Painel "Pessoas e papéis" da barra de ações em massa (Poemas/Prosas).
// Esqueleto de DOM antes do import (mesmo motivo de
// selecao-massa-periodos.test.js).
document.body.innerHTML = `
    <main>
        <div id="barra-acoes-poemas" class="hidden"><span id="contador-selecao-poemas"></span></div>
        <div id="painel-pessoas-papeis-massa"></div>
        <table>
            <thead><tr id="cabecalho-poemas"></tr></thead>
            <tbody id="lista-poemas"></tbody>
        </table>
        <div id="paginacao-poemas"></div>
        <div id="painel-colunas-poemas"></div>
        <select id="filtro-livro-poemas"></select>

        <div id="barra-acoes-prosas" class="hidden"><span id="contador-selecao-prosas"></span></div>
        <div id="painel-pessoas-papeis-massa-prosa"></div>
        <table>
            <thead><tr id="cabecalho-prosas"></tr></thead>
            <tbody id="lista-prosas"></tbody>
        </table>
        <div id="paginacao-prosas"></div>
        <div id="painel-colunas-prosas"></div>
        <select id="filtro-livro-prosas"></select>
    </main>
`;

const { db } = await import('../js/db.js');
const {
    toggleSelecao,
    limparSelecao,
    prepararPainelPessoasPapeisMassa,
    adicionarLinhaPessoasPapeisMassa,
    adicionarEuPessoasPapeisMassa,
    removerLinhaPessoasPapeisMassa,
    aplicarPessoasPapeisEmMassa,
    removerPessoasPapeisEmMassa,
} = await import('../js/selecao-massa.js');
const { renderPoemas, renderProsas, selecaoPoemas } = await import('../js/render-listas.js');

const el = (id) => document.getElementById(id);
const confirmar = () => el('excl-confirmar').click();
const modalAberto = () => {
    const overlay = el('modal-confirmar-exclusao');
    return !!overlay && overlay.style.display !== 'none';
};
const mensagemModal = () => el('excl-mensagem').textContent;
const suf = (tabela) => (tabela === 'poemas' ? '' : '-prosa');
const botaoDesfazer = () =>
    [...document.querySelectorAll('button')].filter((b) => b.textContent === 'Desfazer').at(-1);

function reset() {
    db.poemas.length = 0;
    db.prosas.length = 0;
    limparSelecao('poemas');
    limparSelecao('prosas');
    db.autores = [{ id: 1, nome: 'Autor Um' }];
    db.pessoas = [
        { id: 10, nome: 'Victor', souEu: true, autorIds: [1] },
        { id: 11, nome: 'Ana' },
    ];
    el('painel-pessoas-papeis-massa').innerHTML = '';
    el('painel-pessoas-papeis-massa-prosa').innerHTML = '';
    const overlay = el('modal-confirmar-exclusao');
    if (overlay) overlay.style.display = 'none';
}

const linhas = (tabela) => [
    ...el(`bulk-pp-linhas${suf(tabela)}`).querySelectorAll('.bulk-pp-linha'),
];

// Preenche a n-ésima linha: nome e papéis marcados.
function preencher(tabela, n, nome, papeis = []) {
    const linha = linhas(tabela)[n];
    linha.querySelector('.bulk-pp-nome').value = nome;
    linha.querySelectorAll('.bulk-pp-papel').forEach((c) => {
        c.checked = papeis.includes(c.value);
    });
}

const poema = (id, extra = {}) => ({
    id,
    titulo: `P${id}`,
    sequencia: id,
    paiTipo: 'livro',
    paiId: 9,
    autoria: [{ autorId: 1 }],
    ...extra,
});

function selecionarPoemas(...ids) {
    renderPoemas();
    ids.forEach((id) => toggleSelecao('poemas', true, id));
}

describe('Pessoas e papéis em massa: painel', () => {
    beforeEach(reset);

    it('monta uma linha em branco, com uma caixa por papel', () => {
        prepararPainelPessoasPapeisMassa('poemas');
        assert.equal(linhas('poemas').length, 1);
        assert.equal(linhas('poemas')[0].querySelectorAll('.bulk-pp-papel').length, 9);
    });

    it('reabrir o painel não perde o que foi digitado', () => {
        prepararPainelPessoasPapeisMassa('poemas');
        preencher('poemas', 0, 'Ana', ['Mencionado(a)']);
        prepararPainelPessoasPapeisMassa('poemas');
        assert.equal(linhas('poemas').length, 1);
        assert.equal(linhas('poemas')[0].querySelector('.bulk-pp-nome').value, 'Ana');
    });

    it('"+ Eu" só aparece quando existe a Pessoa "sou eu"', () => {
        prepararPainelPessoasPapeisMassa('poemas');
        assert.equal(el('bulk-pp-eu').classList.contains('hidden'), false);
        db.pessoas[0].souEu = false;
        prepararPainelPessoasPapeisMassa('poemas');
        assert.equal(el('bulk-pp-eu').classList.contains('hidden'), true);
    });

    it('"+ Eu" põe o nome na linha em branco e não duplica', () => {
        prepararPainelPessoasPapeisMassa('poemas');
        adicionarEuPessoasPapeisMassa('poemas');
        assert.equal(linhas('poemas').length, 1);
        assert.equal(linhas('poemas')[0].querySelector('.bulk-pp-nome').value, 'Victor');
        adicionarEuPessoasPapeisMassa('poemas');
        assert.equal(linhas('poemas').length, 1);
    });

    it('"+ Pessoa" acrescenta linha e o × tira', () => {
        prepararPainelPessoasPapeisMassa('poemas');
        preencher('poemas', 0, 'Ana');
        adicionarLinhaPessoasPapeisMassa('poemas');
        assert.equal(linhas('poemas').length, 2);
        removerLinhaPessoasPapeisMassa(linhas('poemas')[1].querySelector('button'));
        assert.equal(linhas('poemas').length, 1);
    });
});

describe('Pessoas e papéis em massa: ordem de marcação', () => {
    beforeEach(reset);

    // Marca/desmarca como o clique faz: muda a caixa e dispara `change`.
    function clicar(tabela, n, papel) {
        const caixa = [...linhas(tabela)[n].querySelectorAll('.bulk-pp-papel')].find(
            (c) => c.value === papel,
        );
        caixa.checked = !caixa.checked;
        caixa.dispatchEvent(new window.Event('change', { bubbles: true }));
    }

    it('grava os papéis na ordem em que foram marcados, não na do registro', () => {
        db.poemas.push(poema(1));
        selecionarPoemas(1);
        prepararPainelPessoasPapeisMassa('poemas');
        linhas('poemas')[0].querySelector('.bulk-pp-nome').value = 'Ana';
        clicar('poemas', 0, 'Aludido(a)');
        clicar('poemas', 0, 'Retratado(a)');
        clicar('poemas', 0, 'Dedicatário(a)');

        aplicarPessoasPapeisEmMassa('poemas');
        confirmar();
        assert.deepEqual(db.poemas[0].pessoas[0].papeis, [
            'Aludido(a)',
            'Retratado(a)',
            'Dedicatário(a)',
        ]);
    });

    it('desmarcar e marcar de novo manda o papel para o fim', () => {
        db.poemas.push(poema(1));
        selecionarPoemas(1);
        prepararPainelPessoasPapeisMassa('poemas');
        linhas('poemas')[0].querySelector('.bulk-pp-nome').value = 'Ana';
        clicar('poemas', 0, 'Retratado(a)');
        clicar('poemas', 0, 'Aludido(a)');
        clicar('poemas', 0, 'Retratado(a)');
        clicar('poemas', 0, 'Retratado(a)');

        aplicarPessoasPapeisEmMassa('poemas');
        confirmar();
        assert.deepEqual(db.poemas[0].pessoas[0].papeis, ['Aludido(a)', 'Retratado(a)']);
    });

    it('mostra o número de cada papel quando há mais de um marcado', () => {
        prepararPainelPessoasPapeisMassa('poemas');
        clicar('poemas', 0, 'Aludido(a)');
        assert.equal(linhas('poemas')[0].querySelectorAll('.bulk-pp-ordem')[0].textContent, '');
        clicar('poemas', 0, 'Retratado(a)');
        const num = (papel) =>
            [...linhas('poemas')[0].querySelectorAll('.bulk-pp-papel')]
                .find((c) => c.value === papel)
                .closest('label')
                .querySelector('.bulk-pp-ordem')
                .textContent.trim();
        assert.equal(num('Aludido(a)'), '1º');
        assert.equal(num('Retratado(a)'), '2º');
    });
});

describe('Pessoas e papéis em massa: aplicar', () => {
    beforeEach(reset);

    it('liga Pessoas com papéis diferentes e cria a nova', () => {
        db.poemas.push(poema(1), poema(2));
        selecionarPoemas(1, 2);
        prepararPainelPessoasPapeisMassa('poemas');
        adicionarEuPessoasPapeisMassa('poemas');
        preencher('poemas', 0, 'Victor', ['Retratado(a)', 'Inspiração para']);
        adicionarLinhaPessoasPapeisMassa('poemas');
        preencher('poemas', 1, 'Beatriz', ['Mencionado(a)']);

        aplicarPessoasPapeisEmMassa('poemas');
        assert.equal(modalAberto(), true);
        assert.match(mensagemModal(), /"Beatriz" ainda não existe no cadastro e será criada/);
        confirmar();

        const beatriz = db.pessoas.find((p) => p.nome === 'Beatriz');
        assert.ok(beatriz);
        db.poemas.forEach((p) => {
            const v = Object.fromEntries(p.pessoas.map((x) => [x.pessoaId, x.papeis]));
            assert.deepEqual(v[10], ['Retratado(a)', 'Inspiração para']);
            assert.deepEqual(v[beatriz.id], ['Mencionado(a)']);
        });
        assert.equal(selecaoPoemas.size, 0);
    });

    it('quem já tem a Pessoa só ganha os papéis que faltam', () => {
        db.poemas.push(poema(1, { pessoas: [{ pessoaId: 11, papeis: ['Aludido(a)'] }] }));
        selecionarPoemas(1);
        prepararPainelPessoasPapeisMassa('poemas');
        preencher('poemas', 0, 'Ana', ['Retratado(a)']);
        aplicarPessoasPapeisEmMassa('poemas');
        confirmar();
        assert.deepEqual(db.poemas[0].pessoas[0].papeis, ['Aludido(a)', 'Retratado(a)']);
    });

    it('o Desfazer devolve os textos e apaga a Pessoa criada', () => {
        db.poemas.push(poema(1), poema(2, { pessoas: [{ pessoaId: 11, papeis: [] }] }));
        selecionarPoemas(1, 2);
        prepararPainelPessoasPapeisMassa('poemas');
        preencher('poemas', 0, 'Nova Pessoa', ['Dedicatário(a)']);
        aplicarPessoasPapeisEmMassa('poemas');
        confirmar();
        assert.ok(db.pessoas.find((p) => p.nome === 'Nova Pessoa'));
        assert.equal(db.poemas[0].pessoas.length, 1);

        botaoDesfazer().click();
        assert.equal(
            db.pessoas.some((p) => p.nome === 'Nova Pessoa'),
            false,
        );
        assert.equal('pessoas' in db.poemas[0], false);
        assert.deepEqual(db.poemas[1].pessoas, [{ pessoaId: 11, papeis: [] }]);
    });

    it('sem nome, sem seleção ou sem mudança não abre a confirmação', () => {
        db.poemas.push(poema(1, { pessoas: [{ pessoaId: 11, papeis: ['Aludido(a)'] }] }));
        prepararPainelPessoasPapeisMassa('poemas');
        preencher('poemas', 0, 'Ana', ['Aludido(a)']);
        aplicarPessoasPapeisEmMassa('poemas'); // sem seleção
        assert.equal(modalAberto(), false);

        selecionarPoemas(1);
        preencher('poemas', 0, '', []);
        aplicarPessoasPapeisEmMassa('poemas'); // sem nome
        assert.equal(modalAberto(), false);

        preencher('poemas', 0, 'Ana', ['Aludido(a)']);
        aplicarPessoasPapeisEmMassa('poemas'); // já estava assim
        assert.equal(modalAberto(), false);
    });

    it('nome ambíguo fica de fora', () => {
        db.pessoas.push({ id: 12, nome: 'ANA' });
        db.pessoas[1].nome = 'Ána';
        db.poemas.push(poema(1));
        selecionarPoemas(1);
        prepararPainelPessoasPapeisMassa('poemas');
        preencher('poemas', 0, 'ana', ['Mencionado(a)']);
        aplicarPessoasPapeisEmMassa('poemas');
        assert.equal(modalAberto(), false);
        assert.equal(db.poemas[0].pessoas, undefined);
    });

    it('funciona em Prosas, com os ids do sufixo', () => {
        db.prosas.push(poema(5));
        renderProsas();
        toggleSelecao('prosas', true, 5);
        prepararPainelPessoasPapeisMassa('prosas');
        preencher('prosas', 0, 'Ana', ['Mencionado(a)']);
        aplicarPessoasPapeisEmMassa('prosas');
        assert.match(mensagemModal(), /1 prosa/);
        confirmar();
        assert.deepEqual(db.prosas[0].pessoas, [{ pessoaId: 11, papeis: ['Mencionado(a)'] }]);
    });
});

describe('Pessoas e papéis em massa: remover', () => {
    beforeEach(reset);

    const comAna = (id) =>
        poema(id, { pessoas: [{ pessoaId: 11, papeis: ['Retratado(a)', 'Mencionado(a)'] }] });

    it('com papéis marcados tira só esses e o vínculo fica', () => {
        db.poemas.push(comAna(1), comAna(2));
        selecionarPoemas(1, 2);
        prepararPainelPessoasPapeisMassa('poemas');
        preencher('poemas', 0, 'Ana', ['Retratado(a)']);
        removerPessoasPapeisEmMassa('poemas');
        assert.equal(modalAberto(), true);
        confirmar();
        db.poemas.forEach((p) =>
            assert.deepEqual(p.pessoas, [{ pessoaId: 11, papeis: ['Mencionado(a)'] }]),
        );
    });

    it('sem papéis tira a Pessoa do texto, e o Desfazer devolve', () => {
        db.poemas.push(comAna(1));
        selecionarPoemas(1);
        prepararPainelPessoasPapeisMassa('poemas');
        preencher('poemas', 0, 'Ana', []);
        removerPessoasPapeisEmMassa('poemas');
        confirmar();
        assert.deepEqual(db.poemas[0].pessoas, []);
        assert.ok(db.pessoas.find((p) => p.nome === 'Ana'));
        botaoDesfazer().click();
        assert.equal(db.poemas[0].pessoas.length, 1);
        assert.deepEqual(db.poemas[0].pessoas[0].papeis, ['Retratado(a)', 'Mencionado(a)']);
    });

    it('nome fora do cadastro não é criado nem abre confirmação', () => {
        db.poemas.push(comAna(1));
        selecionarPoemas(1);
        prepararPainelPessoasPapeisMassa('poemas');
        preencher('poemas', 0, 'Fantasma', []);
        removerPessoasPapeisEmMassa('poemas');
        assert.equal(modalAberto(), false);
        assert.equal(
            db.pessoas.some((p) => p.nome === 'Fantasma'),
            false,
        );
    });
});
