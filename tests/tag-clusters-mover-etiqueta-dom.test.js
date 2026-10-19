import './helpers/dom-real.js';

import fs from 'node:fs';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mover etiqueta entre clusters na aba Tag clusters (Fase 17b, entrega 2):
// botão ⇄ do chip (qualquer tela) e arrastar e soltar (só tela grande, mouse).
const modal = fs.readFileSync(new URL('../modais/modal-tag-cluster.html', import.meta.url), 'utf8');
document.body.innerHTML = `
    <main>
        <input id="busca-tag-clusters" />
        <select id="filtro-categoria-tag-clusters"></select>
        <span id="resumo-tag-clusters"></span>
        <div id="lista-tag-clusters"></div>
        <div id="etiquetas-sem-cluster"></div>
    </main>
    ${modal}
`;

const { db } = await import('../js/db.js');
const { renderTagClusters, abrirMoverEtiquetaDoCluster } =
    await import('../js/tag-clusters-aba.js');
const { sincronizarEtiquetas } = await import('../js/etiquetas.js');
const { criarCluster, atribuirEtiquetasAoCluster } = await import('../js/tag-clusters.js');

const $ = (id) => document.getElementById(id);
const etiqueta = (nome) => db.etiquetas.find((e) => e.nome === nome);
const cartao = (id) => $('lista-tag-clusters').querySelector(`[data-cluster-id="${id}"]`);
const chip = (nome) =>
    [...$('lista-tag-clusters').querySelectorAll('span[title]')].find((c) =>
        c.textContent.trim().startsWith(nome),
    );

function telaGrande(grande) {
    window.matchMedia = () => ({
        matches: grande,
        addEventListener() {},
        removeEventListener() {},
    });
}

// Dispara um evento de arrastar com um dataTransfer mínimo.
function arrastar(tipo, alvo) {
    const ev = new Event(tipo, { bubbles: true, cancelable: true });
    ev.dataTransfer = { setData() {}, effectAllowed: '', dropEffect: '' };
    alvo.dispatchEvent(ev);
    return ev;
}

// Estilo: pai com subclusters "Termos" e "Estrutura"; Gradação direto no pai;
// Anáfora em "Termos"; Poliptoto sem cluster. Tom: Calma, num cluster de Tom.
function preparar() {
    db.poemas = [
        { id: 1, titulo: 'A', sinalizacoesEstilo: 'Anáfora, Gradação, Poliptoto, Paralelismo' },
        { id: 2, titulo: 'B', sinalizacoesTom: 'Calma' },
    ];
    db.prosas = [];
    db.etiquetas = [];
    db.tagClusters = [];
    sincronizarEtiquetas(db);
    $('busca-tag-clusters').value = '';
    $('filtro-categoria-tag-clusters').value = '';
    const pai = criarCluster(db, 'Repetição', 'estilo').cluster;
    const termos = criarCluster(db, 'Termos', 'estilo', pai.id).cluster;
    const estrutura = criarCluster(db, 'Estrutura', 'estilo', pai.id).cluster;
    const tom = criarCluster(db, 'Tons claros', 'tom').cluster;
    atribuirEtiquetasAoCluster(db, [etiqueta('Anáfora').id], termos.id);
    atribuirEtiquetasAoCluster(db, [etiqueta('Gradação').id], pai.id);
    atribuirEtiquetasAoCluster(db, [etiqueta('Calma').id], tom.id);
    return { pai, termos, estrutura, tom };
}

describe('botão ⇄ do chip (DOM real via happy-dom)', () => {
    beforeEach(() => telaGrande(false));

    it('todo chip tem o ⇄, também em tela pequena, e nenhum é arrastável', () => {
        preparar();
        renderTagClusters();
        const botao = chip('Gradação').querySelector('[data-action="mover-etiqueta-cluster"]');
        assert.ok(botao);
        assert.equal(botao.textContent, '⇄');
        assert.equal($('lista-tag-clusters').querySelector('[draggable="true"]'), null);
    });

    it('abre um select com "Pai > Sub" e "Sem cluster", sem o cluster atual, e move direto', () => {
        const { termos } = preparar();
        renderTagClusters();
        abrirMoverEtiquetaDoCluster(
            chip('Gradação').querySelector('[data-action="mover-etiqueta-cluster"]'),
        );
        const select = chip('Gradação').nextElementSibling;
        assert.deepEqual(
            [...select.options].map((o) => o.textContent),
            ['Mover para…', 'Sem cluster', 'Repetição > Estrutura', 'Repetição > Termos'],
        );
        select.value = String(termos.id);
        select.onchange();
        assert.equal(etiqueta('Gradação').clusterId, termos.id);
        // O select some depois da escolha.
        assert.equal($('lista-tag-clusters').querySelector('select[data-mover-etiqueta]'), null);
    });

    it('"Sem cluster" solta a etiqueta e o ⇄ de novo fecha o select', () => {
        preparar();
        renderTagClusters();
        const botao = () => chip('Anáfora').querySelector('[data-action="mover-etiqueta-cluster"]');
        abrirMoverEtiquetaDoCluster(botao());
        assert.ok(chip('Anáfora').nextElementSibling.dataset.moverEtiqueta);
        abrirMoverEtiquetaDoCluster(botao());
        assert.equal(chip('Anáfora').nextElementSibling, null);
        abrirMoverEtiquetaDoCluster(botao());
        const select = chip('Anáfora').nextElementSibling;
        select.value = 'solta';
        select.onchange();
        assert.equal(Object.prototype.hasOwnProperty.call(etiqueta('Anáfora'), 'clusterId'), false);
    });

    it('só oferece clusters da categoria da etiqueta', () => {
        preparar();
        renderTagClusters();
        abrirMoverEtiquetaDoCluster(
            chip('Calma').querySelector('[data-action="mover-etiqueta-cluster"]'),
        );
        const select = chip('Calma').nextElementSibling;
        assert.deepEqual(
            [...select.options].map((o) => o.textContent),
            ['Mover para…', 'Sem cluster'],
        );
    });
});

describe('arrastar e soltar (tela grande)', () => {
    it('em tela grande, chips e linhas da triagem ficam arrastáveis', () => {
        telaGrande(true);
        preparar();
        renderTagClusters();
        assert.equal(chip('Gradação').getAttribute('draggable'), 'true');
        const linha = $('etiquetas-sem-cluster').querySelector('li[data-etiqueta-id]');
        assert.equal(linha.getAttribute('draggable'), 'true');
    });

    it('arrasta o chip do pai e solta no cartão do subcluster', () => {
        telaGrande(true);
        const { termos, estrutura } = preparar();
        renderTagClusters();
        arrastar('dragstart', chip('Gradação'));
        const sobre = arrastar('dragover', cartao(estrutura.id));
        assert.equal(sobre.defaultPrevented, true);
        assert.ok(cartao(estrutura.id).classList.contains('ring-2'));
        // Passar para outro cartão tira o destaque do anterior.
        arrastar('dragover', cartao(termos.id));
        assert.equal(cartao(estrutura.id).classList.contains('ring-2'), false);
        const solto = arrastar('drop', cartao(termos.id));
        assert.equal(solto.defaultPrevented, true);
        assert.equal(etiqueta('Gradação').clusterId, termos.id);
    });

    it('solta no subcluster (cartão mais interno), não no pai que o contém', () => {
        telaGrande(true);
        const { pai, estrutura } = preparar();
        renderTagClusters();
        arrastar('dragstart', chip('Anáfora'));
        arrastar('drop', cartao(estrutura.id).querySelector('h4'));
        assert.equal(etiqueta('Anáfora').clusterId, estrutura.id);
        assert.notEqual(etiqueta('Anáfora').clusterId, pai.id);
    });

    it('arrasta da triagem (sem cluster) para um cartão', () => {
        telaGrande(true);
        const { estrutura } = preparar();
        renderTagClusters();
        const linha = [...$('etiquetas-sem-cluster').querySelectorAll('li[data-etiqueta-id]')].find(
            (l) => l.textContent.includes('Poliptoto'),
        );
        arrastar('dragstart', linha);
        arrastar('drop', cartao(estrutura.id));
        assert.equal(etiqueta('Poliptoto').clusterId, estrutura.id);
    });

    it('cartão de outra categoria não aceita a etiqueta', () => {
        telaGrande(true);
        const { tom } = preparar();
        renderTagClusters();
        arrastar('dragstart', chip('Gradação'));
        const sobre = arrastar('dragover', cartao(tom.id));
        assert.equal(sobre.defaultPrevented, false);
        arrastar('drop', cartao(tom.id));
        assert.notEqual(etiqueta('Gradação').clusterId, tom.id);
    });

    it('em tela pequena nada é arrastável e o dragstart é ignorado', () => {
        telaGrande(false);
        const { estrutura } = preparar();
        renderTagClusters();
        assert.equal(chip('Gradação').getAttribute('draggable'), null);
        arrastar('dragstart', chip('Gradação'));
        arrastar('drop', cartao(estrutura.id));
        assert.notEqual(etiqueta('Gradação').clusterId, estrutura.id);
    });

    it('soltar no cluster onde a etiqueta já está não muda nada', () => {
        telaGrande(true);
        const { pai } = preparar();
        renderTagClusters();
        arrastar('dragstart', chip('Gradação'));
        arrastar('drop', cartao(pai.id).querySelector('h4'));
        assert.equal(etiqueta('Gradação').clusterId, pai.id);
    });
});
