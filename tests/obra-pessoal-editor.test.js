import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Obra pessoal (entrega 1): o check de Intertextualidade e de Hipertextualidade
// nos modais, a chave `obraPessoal` só quando marcada, o editar que devolve o
// check (senão a marca se perderia ao salvar) e a etiqueta na lista do modal.
// Esqueleto de DOM antes do import, como em data-da-obra-editor.test.js.
const bloco = (nome, extra = '') => `
    <input id="p-${nome}-tipo" />
    ${extra}
    <input id="p-${nome}-link" />
    <input id="p-${nome}-data-acesso" type="date" />
    <input id="p-${nome}-link-texto" />
    <input id="p-${nome}-nota" />
    <input id="p-${nome}-obra-pessoal" type="checkbox" />
    <div id="p-${nome}-data"></div>
    <button id="p-${nome}-btn-add"></button>
    <button id="p-${nome}-btn-cancelar" class="hidden"></button>
    <div id="p-${nome}-lista"></div>`;

const autor = (nome) =>
    `<input id="p-${nome}-autor" /><div id="p-${nome}-autor-chips"></div><input id="p-${nome}-descricao" />`;

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
    <input id="p-fonte-link" />
    <input id="p-fonte-data-acesso" type="date" />
    ${bloco('intertexto', `<input id="p-intertexto-obra" />${autor('intertexto')}<input id="p-intertexto-traduzido" type="checkbox" />`)}
    ${bloco('refext', '<input id="p-refext-texto" />')}
    ${bloco(
        'hipertexto',
        `<input id="p-hipertexto-relacao" /><input id="p-hipertexto-hipotexto" />${autor('hipertexto')}`,
    )}
    <div id="pr-sinalizacoes-corpo"></div>
`;

const ed = await import('../js/editor.js');
const { db } = await import('../js/db.js');
const { ehObraPessoal, campoObraPessoal } = await import('../js/intertextualidade.js');

const el = (id) => document.getElementById(id);

function limpar() {
    document.querySelectorAll('input, textarea, select').forEach((e) => {
        if (e.type === 'checkbox') e.checked = false;
        else e.value = '';
    });
    ed.resetIntertextualidade('poemas');
    ed.resetHipertextualidade('poemas');
    ed.resetReferenciasExternas('poemas');
    db.poemas = [];
}

ed.ligarCamposDeData('poemas');
ed.ligarCamposDeAutor('poemas');
ed.ligarConhecidoComo('poemas');

describe('ehObraPessoal e campoObraPessoal (lógica pura)', () => {
    it('só true marca; ausente, false, texto e lixo não marcam', () => {
        assert.equal(ehObraPessoal({ obraPessoal: true }), true);
        assert.equal(ehObraPessoal({ obraPessoal: false }), false);
        assert.equal(ehObraPessoal({ obraPessoal: 'true' }), false);
        assert.equal(ehObraPessoal({}), false);
        assert.equal(ehObraPessoal(null), false);
        assert.equal(ehObraPessoal('x'), false);
    });

    it('a chave só existe quando marcada', () => {
        assert.deepEqual(campoObraPessoal(true), { obraPessoal: true });
        assert.deepEqual(campoObraPessoal(false), {});
        assert.deepEqual(campoObraPessoal(undefined), {});
    });
});

describe('Obra pessoal na Intertextualidade do modal', () => {
    beforeEach(limpar);

    it('marcada, grava obraPessoal: true; desmarcada, a chave nem existe', () => {
        el('p-intertexto-obra').value = 'Diário de 2019';
        el('p-intertexto-obra-pessoal').checked = true;
        ed.adicionarIntertexto('poemas');
        el('p-intertexto-obra').value = 'Águas de Março';
        ed.adicionarIntertexto('poemas');
        const [a, b] = ed.obterIntertextualidade('poemas');
        assert.equal(a.obraPessoal, true);
        assert.equal('obraPessoal' in b, false);
    });

    it('depois de adicionar, o check volta desmarcado', () => {
        el('p-intertexto-obra').value = 'Carta';
        el('p-intertexto-obra-pessoal').checked = true;
        ed.adicionarIntertexto('poemas');
        assert.equal(el('p-intertexto-obra-pessoal').checked, false);
    });

    it('editar devolve o check, e salvar de novo mantém a marca', () => {
        el('p-intertexto-obra').value = 'Carta';
        el('p-intertexto-obra-pessoal').checked = true;
        ed.adicionarIntertexto('poemas');
        ed.editarIntertexto('poemas', 0);
        assert.equal(el('p-intertexto-obra-pessoal').checked, true);
        ed.adicionarIntertexto('poemas');
        assert.equal(ed.obterIntertextualidade('poemas')[0].obraPessoal, true);
    });

    it('editar uma entrada sem a marca deixa o check desmarcado; desmarcar tira a chave', () => {
        el('p-intertexto-obra').value = 'Carta';
        ed.adicionarIntertexto('poemas');
        ed.editarIntertexto('poemas', 0);
        assert.equal(el('p-intertexto-obra-pessoal').checked, false);
        el('p-intertexto-obra-pessoal').checked = true;
        ed.adicionarIntertexto('poemas');
        ed.editarIntertexto('poemas', 0);
        el('p-intertexto-obra-pessoal').checked = false;
        ed.adicionarIntertexto('poemas');
        assert.equal('obraPessoal' in ed.obterIntertextualidade('poemas')[0], false);
    });

    it('cancelar a edição limpa o check', () => {
        el('p-intertexto-obra').value = 'Carta';
        el('p-intertexto-obra-pessoal').checked = true;
        ed.adicionarIntertexto('poemas');
        ed.editarIntertexto('poemas', 0);
        ed.cancelarEdicaoIntertexto('poemas');
        assert.equal(el('p-intertexto-obra-pessoal').checked, false);
    });

    it('a lista do modal mostra "(obra pessoal)" só na entrada marcada', () => {
        el('p-intertexto-obra').value = 'Carta';
        el('p-intertexto-obra-pessoal').checked = true;
        ed.adicionarIntertexto('poemas');
        el('p-intertexto-obra').value = 'Águas de Março';
        ed.adicionarIntertexto('poemas');
        const linhas = [...el('p-intertexto-lista').children].map((l) => l.textContent);
        assert.match(linhas[0], /Carta.*\(obra pessoal\)/);
        assert.doesNotMatch(linhas[1], /obra pessoal/);
    });
});

describe('Obra pessoal na Hipertextualidade do modal', () => {
    beforeEach(limpar);

    it('marcada, grava obraPessoal: true; o editar devolve o check', () => {
        el('p-hipertexto-hipotexto').value = 'Caderno de infância';
        el('p-hipertexto-obra-pessoal').checked = true;
        ed.adicionarHipertextualidade('poemas');
        const [h] = ed.obterHipertextualidade('poemas');
        assert.equal(h.obraPessoal, true);
        assert.equal(el('p-hipertexto-obra-pessoal').checked, false);
        ed.editarHipertextualidade('poemas', 0);
        assert.equal(el('p-hipertexto-obra-pessoal').checked, true);
        ed.adicionarHipertextualidade('poemas');
        assert.equal(ed.obterHipertextualidade('poemas')[0].obraPessoal, true);
    });

    it('sem marcar, a chave não existe, e a lista não mostra a etiqueta', () => {
        el('p-hipertexto-hipotexto').value = 'Dom Casmurro';
        ed.adicionarHipertextualidade('poemas');
        assert.equal('obraPessoal' in ed.obterHipertextualidade('poemas')[0], false);
        assert.doesNotMatch(el('p-hipertexto-lista').textContent, /obra pessoal/);
    });

    it('a marca da Inter e a da Hiper são independentes', () => {
        el('p-intertexto-obra').value = 'Carta';
        el('p-intertexto-obra-pessoal').checked = true;
        el('p-hipertexto-hipotexto').value = 'Dom Casmurro';
        ed.adicionarIntertexto('poemas');
        ed.adicionarHipertextualidade('poemas');
        assert.equal(ed.obterIntertextualidade('poemas')[0].obraPessoal, true);
        assert.equal('obraPessoal' in ed.obterHipertextualidade('poemas')[0], false);
    });
});
