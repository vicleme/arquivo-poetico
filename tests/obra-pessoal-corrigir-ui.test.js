import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Obra pessoal (entrega 2): o check do diálogo "Corrigir obra" (com o estado
// meio-marcado quando as entradas divergem) e a etiqueta no cartão da obra.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const i = html.indexOf('<section id="conexoes"');
const f = html.indexOf('<section id="sonoridade"', i);
assert.ok(i !== -1 && f !== -1);
document.body.innerHTML = `<main>${html.slice(i, f)}</main>`;

const { db } = await import('../js/db.js');
const { renderConexoes } = await import('../js/render-conexoes.js');
const { abrirCorrecaoObra, fecharDialogo } = await import('../js/corrigir-fora-do-acervo-ui.js');

const el = (id) => document.getElementById(id);
const tick = () => new Promise((r) => setTimeout(r, 0));
const snapshotOk = async () => true;
const CAIXA = 'corrigir-fora-obra-pessoal';

// Três obras: "Diario" marcada em UMA das duas entradas, "Carta" marcada nas
// duas e "Anuncio" em nenhuma.
function cenario() {
    Object.assign(db, {
        livros: [],
        partes: [],
        secoes: [],
        elementos: [],
        itensColetanea: [],
        poemas: [
            {
                id: 1,
                titulo: 'A',
                intertextualidade: [
                    { relacao: 'Citação', obra: 'Diario', obraPessoal: true },
                    { relacao: 'Citação', obra: 'Carta', obraPessoal: true },
                    { relacao: 'Citação', obra: 'Anuncio' },
                ],
            },
            {
                id: 2,
                titulo: 'B',
                intertextualidade: [
                    { relacao: 'Citação', obra: 'Diario' },
                    { relacao: 'Citação', obra: 'Carta', obraPessoal: true },
                ],
            },
        ],
        prosas: [],
    });
    fecharDialogo();
    el('modal-confirmar-exclusao')?.remove();
    document.querySelectorAll('button').forEach((b) => {
        if (b.textContent === 'Desfazer') b.closest('div')?.remove();
    });
    renderConexoes();
}

async function confirmar() {
    const botao = el('excl-confirmar');
    assert.ok(botao, 'confirmação aberta');
    botao.onclick();
    await tick();
    await tick();
}

const revisar = () => document.querySelector('[data-corrigir="revisar"]').click();
const marcaDe = (poema, indice) => db.poemas[poema].intertextualidade[indice].obraPessoal;

describe('Corrigir obra: check "Obra pessoal"', () => {
    beforeEach(cenario);

    it('abre meio-marcado quando as entradas divergem, marcado quando todas, vazio quando nenhuma', () => {
        abrirCorrecaoObra('diario|');
        assert.equal(el(CAIXA).indeterminate, true);
        assert.match(el('modal-corrigir-fora-do-acervo').textContent, /marcada em 1 de 2 entradas/);
        fecharDialogo();
        abrirCorrecaoObra('carta|');
        assert.equal(el(CAIXA).checked, true);
        assert.equal(el(CAIXA).indeterminate, false);
        fecharDialogo();
        abrirCorrecaoObra('anuncio|');
        assert.equal(el(CAIXA).checked, false);
        assert.equal(el(CAIXA).indeterminate, false);
    });

    it('meio-marcado e sem mexer: a marca não vai no pedido (só o que mexeu muda)', async () => {
        abrirCorrecaoObra('diario|', { tirarSnapshot: snapshotOk });
        el('corrigir-fora-obra').value = 'Diário';
        revisar();
        assert.doesNotMatch(el('excl-mensagem').textContent, /marca de obra pessoal/);
        await confirmar();
        assert.equal(db.poemas[0].intertextualidade[0].obra, 'Diário');
        assert.equal(marcaDe(0, 0), true);
        assert.equal(marcaDe(1, 0), undefined);
    });

    it('clicar no meio-marcado marca todas; a confirmação conta; Desfazer devolve', async () => {
        abrirCorrecaoObra('diario|', { tirarSnapshot: snapshotOk });
        el(CAIXA).click();
        assert.equal(el(CAIXA).checked, true);
        assert.equal(el(CAIXA).indeterminate, false);
        revisar();
        assert.match(
            el('excl-mensagem').textContent,
            /A marca de obra pessoal muda em 1 entrada\./,
        );
        await confirmar();
        assert.equal(marcaDe(0, 0), true);
        assert.equal(marcaDe(1, 0), true);
        assert.match(el('conexoes-fora').textContent, /obra pessoal/i);

        const desfazer = [...document.querySelectorAll('button')].find(
            (b) => b.textContent === 'Desfazer',
        );
        assert.ok(desfazer, 'aviso com Desfazer');
        desfazer.click();
        assert.equal(marcaDe(0, 0), true);
        assert.equal('obraPessoal' in db.poemas[1].intertextualidade[0], false);
    });

    it('desmarcar uma obra toda marcada tira a marca de todas as entradas', async () => {
        abrirCorrecaoObra('carta|', { tirarSnapshot: snapshotOk });
        el(CAIXA).click();
        assert.equal(el(CAIXA).checked, false);
        revisar();
        assert.match(el('excl-mensagem').textContent, /muda em 2 entradas/);
        await confirmar();
        assert.equal('obraPessoal' in db.poemas[0].intertextualidade[1], false);
        assert.equal('obraPessoal' in db.poemas[1].intertextualidade[1], false);
    });

    it('obra sem marca, sem mexer no check: a marca não aparece', async () => {
        abrirCorrecaoObra('anuncio|', { tirarSnapshot: snapshotOk });
        el('corrigir-fora-obra').value = 'Anúncio';
        revisar();
        await confirmar();
        assert.equal('obraPessoal' in db.poemas[0].intertextualidade[2], false);
    });

    it('marcar uma obra sem marca vale para todos os textos dela', async () => {
        abrirCorrecaoObra('anuncio|', { tirarSnapshot: snapshotOk });
        el(CAIXA).click();
        revisar();
        await confirmar();
        assert.equal(marcaDe(0, 2), true);
    });
});

describe('Cartão da obra em Fora do acervo', () => {
    beforeEach(cenario);

    it('mostra "obra pessoal" quando todas, "em N de M entradas" quando divergem, nada quando nenhuma', () => {
        const texto = el('conexoes-fora').textContent;
        assert.match(texto, /obra pessoal em 1 de 2 entradas/i);
        const cartoes = [...el('conexoes-fora').querySelectorAll('summary')];
        const de = (nome) => cartoes.find((c) => c.textContent.includes(nome))?.textContent || '';
        assert.match(de('Carta'), /obra pessoal(?! em)/i);
        assert.doesNotMatch(de('Anuncio'), /obra pessoal/i);
    });
});
