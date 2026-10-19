import './helpers/localstorage-shim.js';
import './helpers/dom-shim.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { db } from '../js/db.js';
import {
    agruparComunsAtivo,
    resolverAgruparComuns,
    toggleAgruparComuns,
    renderControleAgruparComuns,
} from '../js/agrupar-comuns.js';
import { gerarMarkdownExportacao } from '../js/exportar-md.js';
import { classificarChaveLocalStorage } from '../js/inventario-armazenamento.js';

const LS_KEY = 'arquivoPoetico_agruparComuns';

function montarBanco() {
    db.livros = [];
    db.partes = [];
    db.secoes = [];
    db.prosas = [];
    db.autores = [{ id: 1, nome: 'Victor Leme', sobre: '' }];
    db.movimentosEscolas = [];
    db.poemas = [1, 2].map((id) => ({
        id,
        titulo: `Poema ${id}`,
        texto: `verso ${id}`,
        autoria: [{ autorId: 1, papel: 'Autor' }],
    }));
}

const contar = (texto, re) => (texto.match(re) || []).length;

describe('preferência "Agrupar no topo o que for igual em todos os textos"', () => {
    beforeEach(() => {
        localStorage.removeItem(LS_KEY);
        montarBanco();
    });

    it('vem ligada quando nunca foi mexida', () => {
        assert.equal(agruparComunsAtivo(), true);
    });

    it('desligar e religar fica guardado', () => {
        toggleAgruparComuns(false);
        assert.equal(localStorage.getItem(LS_KEY), '0');
        assert.equal(agruparComunsAtivo(), false);
        toggleAgruparComuns(true);
        assert.equal(localStorage.getItem(LS_KEY), '1');
        assert.equal(agruparComunsAtivo(), true);
    });

    it('opcoes.agruparComuns explícito manda sobre a preferência', () => {
        toggleAgruparComuns(false);
        assert.equal(resolverAgruparComuns({ agruparComuns: true }), true);
        assert.equal(resolverAgruparComuns({}), false);
        toggleAgruparComuns(true);
        assert.equal(resolverAgruparComuns({ agruparComuns: false }), false);
        assert.equal(resolverAgruparComuns(), true);
    });

    it('o .md segue a preferência quando a chamada não diz nada', () => {
        const ligado = gerarMarkdownExportacao(db.poemas);
        assert.match(ligado, /Comum a todos os textos/);
        assert.equal(contar(ligado, /\*\*Autoria:\*\*/g), 1);

        toggleAgruparComuns(false);
        const desligado = gerarMarkdownExportacao(db.poemas);
        assert.doesNotMatch(desligado, /Comum a todos os textos/);
        assert.equal(contar(desligado, /\*\*Autoria:\*\*/g), 2);
    });

    it('a chamada explícita vence a preferência no .md', () => {
        toggleAgruparComuns(false);
        const md = gerarMarkdownExportacao(db.poemas, { agruparComuns: true });
        assert.match(md, /Comum a todos os textos/);
    });

    it('as caixas nascem com o estado salvo e chamam a função certa', () => {
        assert.match(renderControleAgruparComuns(), /agrupar-comuns-check[^>]*checked/s);
        assert.match(renderControleAgruparComuns(), /toggleAgruparComuns\(this\.checked\)/);
        toggleAgruparComuns(false);
        assert.doesNotMatch(renderControleAgruparComuns(), /checked>/);
        assert.match(renderControleAgruparComuns(), /Agrupar no topo \(valores comuns\)/);
    });

    it('o texto da interface não usa travessão', () => {
        assert.doesNotMatch(renderControleAgruparComuns(), /—/);
    });

    it('a chave aparece no inventário de armazenamento como preferência', () => {
        assert.equal(classificarChaveLocalStorage(LS_KEY), 'preferencia');
    });
});
