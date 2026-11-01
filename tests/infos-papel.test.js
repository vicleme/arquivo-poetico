import './helpers/localstorage-shim.js';
import './helpers/dom-shim.js';

import { readFileSync } from 'node:fs';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { db } from '../js/db.js';
import {
    infosPapelAtivo,
    resolverInfosPapel,
    toggleInfosPapel,
    renderControleInfosPapel,
    renderInfosPapelAcoes,
} from '../js/infos-papel.js';
import { comLegendaPapeis, CHAVE_LEGENDA_PAPEIS } from '../js/legenda-papeis-pessoa.js';
import { gerarMarkdownExportacao } from '../js/exportar-md.js';
import { classificarChaveLocalStorage } from '../js/inventario-armazenamento.js';

const LS_KEY = 'arquivoPoetico_infosPapel';
const LS_KEY_IND = 'arquivoPoetico_infosPapelIndividual';

function montarBanco() {
    db.livros = [];
    db.partes = [];
    db.secoes = [];
    db.prosas = [];
    db.autores = [];
    db.movimentosEscolas = [];
    db.pessoas = [{ id: 1, nome: 'Pedro' }];
    db.poemas = [
        {
            id: 1,
            titulo: 'Poema 1',
            texto: 'verso',
            pessoas: [{ pessoaId: 1, papeis: ['Voz'] }],
        },
    ];
}

describe('caixa "Infos de papel"', () => {
    beforeEach(() => {
        localStorage.removeItem(LS_KEY);
        localStorage.removeItem(LS_KEY_IND);
        montarBanco();
    });

    it('vem ligada quando nunca foi mexida; desligar e religar fica guardado', () => {
        assert.equal(infosPapelAtivo(), true);
        toggleInfosPapel(false);
        assert.equal(localStorage.getItem(LS_KEY), '0');
        assert.equal(infosPapelAtivo(), false);
        toggleInfosPapel(true);
        assert.equal(localStorage.getItem(LS_KEY), '1');
    });

    it('opcoes.infosPapel explícito manda sobre a preferência', () => {
        toggleInfosPapel(false);
        assert.equal(resolverInfosPapel({ infosPapel: true }), true);
        assert.equal(resolverInfosPapel({}), false);
    });

    it('o .json leva a legenda ligado e não leva desligado', () => {
        const saida = { export_format: 'selecao', itens: db.poemas };
        assert.ok(comLegendaPapeis(saida, db.poemas)[CHAVE_LEGENDA_PAPEIS]);
        toggleInfosPapel(false);
        assert.equal(comLegendaPapeis(saida, db.poemas), saida);
    });

    it('o .md leva a seção ligado e não leva desligado, mas mantém o papel no texto', () => {
        assert.match(gerarMarkdownExportacao(db.poemas), /## Legenda dos papéis de Pessoa/);
        toggleInfosPapel(false);
        const sem = gerarMarkdownExportacao(db.poemas);
        assert.doesNotMatch(sem, /Legenda dos papéis/);
        assert.match(sem, /Pedro \(Voz\)/);
        assert.match(
            gerarMarkdownExportacao(db.poemas, { infosPapel: true }),
            /Legenda dos papéis/,
        );
    });

    it('a caixa chama toggleInfosPapel e a chave está no inventário', () => {
        assert.match(renderControleInfosPapel(), /toggleInfosPapel\(this\.checked, 'lote'\)/);
        assert.equal(classificarChaveLocalStorage(LS_KEY), 'preferencia');
    });

    it('o painel Ações (Poemas e Prosas) e o modal de Visualização têm a caixa', () => {
        assert.match(renderInfosPapelAcoes(), /infos-papel-check/);
        const fonte = readFileSync(new URL('../js/celulas-tabela.js', import.meta.url), 'utf8');
        assert.match(
            fonte,
            /tabela === 'poemas' \|\| tabela === 'prosas' \? renderInfosPapelAcoes\(\)/,
        );
        const modal = readFileSync(
            new URL('../modais/modal-visualizar.html', import.meta.url),
            'utf8',
        );
        assert.match(modal, /infos-papel-slot/);
    });

    it('o carregamento do modal e da navegação monta a caixa do Visualizar', () => {
        const fonte = readFileSync(new URL('../js/visualizar.js', import.meta.url), 'utf8');
        const chamadas = fonte.match(/montarControlesInfosPapel\(\);/g) || [];
        const ocultos = fonte.match(/montarControlesIncluirOcultos\(\);/g) || [];
        assert.equal(chamadas.length, ocultos.length);
    });

    it('lote e individual são escolhas independentes, cada uma com sua chave', () => {
        assert.equal(infosPapelAtivo('individual'), true);
        toggleInfosPapel(false, 'individual');
        assert.equal(localStorage.getItem(LS_KEY_IND), '0');
        assert.equal(localStorage.getItem(LS_KEY), null);
        assert.equal(infosPapelAtivo('individual'), false);
        assert.equal(infosPapelAtivo('lote'), true);
        assert.equal(infosPapelAtivo(), true);

        toggleInfosPapel(true, 'individual');
        toggleInfosPapel(false, 'lote');
        assert.equal(infosPapelAtivo('individual'), true);
        assert.equal(infosPapelAtivo('lote'), false);
    });

    it('opcoes.escopo escolhe qual preferência vale; infosPapel explícito ainda manda', () => {
        toggleInfosPapel(false, 'individual');
        assert.equal(resolverInfosPapel({ escopo: 'individual' }), false);
        assert.equal(resolverInfosPapel({ escopo: 'lote' }), true);
        assert.equal(resolverInfosPapel({ escopo: 'individual', infosPapel: true }), true);
    });

    it('sem legenda só no individual: o .json e o .md de um texto saem sem, o do lote sai com', () => {
        toggleInfosPapel(false, 'individual');
        const saida = { export_format: 'selecao', itens: db.poemas };
        const individual = comLegendaPapeis(saida, db.poemas, undefined, { escopo: 'individual' });
        assert.equal(individual, saida);
        assert.ok(comLegendaPapeis(saida, db.poemas)[CHAVE_LEGENDA_PAPEIS]);
        assert.doesNotMatch(
            gerarMarkdownExportacao(db.poemas, { escopo: 'individual' }),
            /Legenda dos papéis/,
        );
        assert.match(gerarMarkdownExportacao(db.poemas), /Legenda dos papéis/);
    });

    it('o inverso: sem legenda só no lote', () => {
        toggleInfosPapel(false, 'lote');
        const saida = { export_format: 'selecao', itens: db.poemas };
        assert.equal(comLegendaPapeis(saida, db.poemas), saida);
        assert.ok(
            comLegendaPapeis(saida, db.poemas, undefined, { escopo: 'individual' })[
                CHAVE_LEGENDA_PAPEIS
            ],
        );
    });

    it('as caixas de Ações e Visualização são individuais; as de lote ficam no index.html', () => {
        assert.match(renderInfosPapelAcoes(), /data-escopo="individual"/);
        assert.match(renderInfosPapelAcoes(), /toggleInfosPapel\(this\.checked, 'individual'\)/);
        const modal = readFileSync(
            new URL('../modais/modal-visualizar.html', import.meta.url),
            'utf8',
        );
        assert.match(modal, /infos-papel-slot" data-escopo="individual"/);
        const index = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
        assert.doesNotMatch(index, /infos-papel-slot" data-escopo="individual"/);
        const exportar = readFileSync(new URL('../js/exportar.js', import.meta.url), 'utf8');
        assert.match(
            exportar,
            /baixarMarkdown\(itens, `\$\{nomeBase\}\.md`, \{ escopo: 'individual' \}\)/,
        );
        assert.match(exportar, /escopo: 'individual'/);
    });

    it('o inventário conhece as duas chaves', () => {
        assert.equal(classificarChaveLocalStorage(LS_KEY_IND), 'preferencia');
    });
});
