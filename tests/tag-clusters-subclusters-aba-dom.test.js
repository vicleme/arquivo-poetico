import './helpers/dom-real.js';

import fs from 'node:fs';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Aba Tag clusters com subclusters (Fase 17b, entrega 2): cartões aninhados,
// botão "+ Subcluster", pai no modal, seletores com "Pai > Sub", exclusão do
// pai e importação com ">".
const modal = fs.readFileSync(new URL('../modais/modal-tag-cluster.html', import.meta.url), 'utf8');
const modalImportar = fs.readFileSync(
    new URL('../modais/modal-importar-tag-clusters.html', import.meta.url),
    'utf8',
);
document.body.innerHTML = `
    <main>
        <input id="busca-tag-clusters" />
        <select id="filtro-categoria-tag-clusters"></select>
        <span id="resumo-tag-clusters"></span>
        <div id="lista-tag-clusters"></div>
        <div id="etiquetas-sem-cluster"></div>
        <input id="busca-etiquetas" />
        <select id="filtro-categoria-etiquetas"></select>
        <input type="checkbox" id="filtro-etiquetas-sem-texto" />
        <select id="ordem-etiquetas">
            <option value="alfabetica"></option>
            <option value="usadas"></option>
        </select>
        <span id="resumo-etiquetas"></span>
        <div id="duplicatas-etiquetas"></div>
        <div id="lista-etiquetas"></div>
    </main>
    ${modal}
    ${modalImportar}
`;

const { db } = await import('../js/db.js');
const {
    renderTagClusters,
    novoTagCluster,
    editarTagCluster,
    initFormTagCluster,
    excluirTagClusterComAviso,
    abrirImportarTagClusters,
    initFormImportarTagClusters,
    colocarEtiquetaNoCluster,
    avisoDoNomeDeCluster,
} = await import('../js/tag-clusters-aba.js');
const { renderEtiquetas } = await import('../js/etiquetas-aba.js');
const { sincronizarEtiquetas } = await import('../js/etiquetas.js');
const { criarCluster, atribuirEtiquetasAoCluster, subclustersDoCluster } =
    await import('../js/tag-clusters.js');

const $ = (id) => document.getElementById(id);
const enviar = () => $('form-tag-cluster').dispatchEvent(new Event('submit', { cancelable: true }));
const idDe = (nome, categoria) =>
    db.etiquetas.find((e) => e.nome === nome && e.categoria === categoria).id;
const cartao = (id) => $('lista-tag-clusters').querySelector(`[data-cluster-id="${id}"]`);

// Estilo: pai "Repetição e paralelismo" com subclusters "Termos" (Anáfora) e
// "Estrutura" (Paralelismo); Gradação direto no pai; Poliptoto sem cluster.
function preparar() {
    db.poemas = [
        { id: 1, titulo: 'A', sinalizacoesEstilo: 'Anáfora, Gradação' },
        { id: 2, titulo: 'B', sinalizacoesEstilo: 'Paralelismo, Poliptoto' },
    ];
    db.prosas = [];
    db.etiquetas = [];
    db.tagClusters = [];
    sincronizarEtiquetas(db);
    $('busca-tag-clusters').value = '';
    $('filtro-categoria-tag-clusters').value = '';
    const pai = criarCluster(db, 'Repetição e paralelismo', 'estilo').cluster;
    const termos = criarCluster(db, 'Termos', 'estilo', pai.id).cluster;
    const estrutura = criarCluster(db, 'Estrutura', 'estilo', pai.id).cluster;
    atribuirEtiquetasAoCluster(db, [idDe('Anáfora', 'estilo')], termos.id);
    atribuirEtiquetasAoCluster(db, [idDe('Paralelismo', 'estilo')], estrutura.id);
    atribuirEtiquetasAoCluster(db, [idDe('Gradação', 'estilo')], pai.id);
    return { pai, termos, estrutura };
}

describe('aba Tag clusters com subclusters (DOM real via happy-dom)', () => {
    beforeEach(() => {
        preparar();
        initFormTagCluster();
        initFormImportarTagClusters();
    });

    it('aninha os subclusters no cartão do pai, com contagem pela união dos textos', () => {
        const { pai, termos, estrutura } = preparar();
        renderTagClusters();
        const cartaoPai = cartao(pai.id);
        assert.equal(cartaoPai.dataset.subcluster, undefined);
        const subs = [...cartaoPai.querySelectorAll('[data-subcluster="true"]')];
        assert.deepEqual(
            subs.map((s) => s.dataset.clusterId),
            [String(estrutura.id), String(termos.id)],
        );
        // O pai conta os 2 poemas uma vez cada (a união), com 3 etiquetas e 2 subclusters.
        assert.match(cartaoPai.textContent, /3 etiquetas · 2 subclusters · aparece em 2 textos/);
        assert.match(cartao(termos.id).textContent, /1 etiqueta · aparece em 1 texto/);
        // Só o cluster de topo tem o botão "+ Subcluster".
        assert.equal(cartao(termos.id).querySelector('[data-action="novo-subcluster"]'), null);
        assert.ok(cartaoPai.querySelector('[data-action="novo-subcluster"]'));
        assert.match($('resumo-tag-clusters').textContent, /3 de 3 tag clusters/);
    });

    it('"+ Subcluster" abre o modal com o pai e a categoria já escolhidos e cria o subcluster', async () => {
        const { pai } = preparar();
        await novoTagCluster(pai.id);
        assert.equal($('tc-pai').value, String(pai.id));
        assert.equal($('tc-categoria').value, 'estilo');
        assert.equal($('tc-categoria').disabled, true);
        assert.match($('modal-tag-cluster-titulo').textContent, /Subcluster/);
        $('tc-nome').value = 'Progressão';
        enviar();
        const criado = db.tagClusters.find((c) => c.nome === 'Progressão');
        assert.equal(criado.paiId, pai.id);
        assert.equal(subclustersDoCluster(db, pai.id).length, 3);
    });

    it('o cadastro novo só oferece clusters de topo como pai, e troca a lista com a categoria', async () => {
        const { pai } = preparar();
        criarCluster(db, 'Calma', 'tom');
        await novoTagCluster();
        $('tc-categoria').value = 'estilo';
        $('tc-categoria').dispatchEvent(new Event('change'));
        assert.deepEqual(
            [...$('tc-pai').options].map((o) => o.textContent),
            ['Nenhum (cluster de topo)', 'Repetição e paralelismo'],
        );
        $('tc-categoria').value = 'tom';
        $('tc-categoria').dispatchEvent(new Event('change'));
        assert.deepEqual(
            [...$('tc-pai').options].map((o) => o.textContent),
            ['Nenhum (cluster de topo)', 'Calma'],
        );
        assert.ok(pai);
    });

    it('recusa nome repetido entre irmãos e com cluster de topo, mas aceita em outro pai', async () => {
        const { pai } = preparar();
        const outro = criarCluster(db, 'Jogos de palavras', 'estilo').cluster;
        const total = db.tagClusters.length;
        // Irmão do mesmo pai.
        await novoTagCluster(pai.id);
        $('tc-nome').value = 'termos';
        enviar();
        assert.equal(db.tagClusters.length, total);
        // Nome de cluster de topo.
        await novoTagCluster(pai.id);
        $('tc-nome').value = 'Jogos de palavras';
        enviar();
        assert.equal(db.tagClusters.length, total);
        // Mesmo nome em outro pai.
        await novoTagCluster(outro.id);
        $('tc-nome').value = 'Termos';
        enviar();
        assert.equal(db.tagClusters.length, total + 1);
    });

    it('editar: muda o pai pelo modal; cluster que já tem subclusters fica com o select travado', async () => {
        const { pai, termos } = preparar();
        const outro = criarCluster(db, 'Jogos de palavras', 'estilo').cluster;
        await editarTagCluster(termos.id);
        assert.equal($('tc-pai').value, String(pai.id));
        assert.equal($('tc-pai').disabled, false);
        // O próprio cluster não aparece como opção de pai.
        assert.equal(
            [...$('tc-pai').options].some((o) => o.value === String(termos.id)),
            false,
        );
        $('tc-pai').value = String(outro.id);
        enviar();
        assert.equal(termos.paiId, outro.id);

        await editarTagCluster(pai.id);
        assert.equal($('tc-pai').disabled, true);
        assert.equal($('tc-pai-dica').classList.contains('hidden'), false);
    });

    it('editar: se a troca de pai falhar, o nome novo não fica gravado', async () => {
        const { termos } = preparar();
        const outro = criarCluster(db, 'Jogos de palavras', 'estilo').cluster;
        criarCluster(db, 'Termos novo', 'estilo', outro.id);
        await editarTagCluster(termos.id);
        $('tc-nome').value = 'Termos novo';
        $('tc-pai').value = String(outro.id);
        enviar();
        assert.equal(termos.nome, 'Termos');
        assert.equal(termos.paiId != null && termos.paiId != outro.id, true);
    });

    it('a triagem e o cartão da aba Etiquetas mostram "Pai > Sub" nos seletores', () => {
        preparar();
        renderTagClusters();
        const seletor = $('etiquetas-sem-cluster').querySelector('select');
        assert.deepEqual(
            [...seletor.options].map((o) => o.textContent),
            [
                'Pôr em cluster…',
                'Repetição e paralelismo',
                'Repetição e paralelismo > Estrutura',
                'Repetição e paralelismo > Termos',
            ],
        );
        renderEtiquetas();
        const lista = $('lista-etiquetas').textContent;
        assert.match(lista, /Repetição e paralelismo > Termos/);
    });

    it('colocar uma etiqueta num subcluster avisa e grava o clusterId do subcluster', () => {
        const { termos } = preparar();
        renderTagClusters();
        const seletor = $('etiquetas-sem-cluster').querySelector('select');
        seletor.value = String(termos.id);
        colocarEtiquetaNoCluster(seletor);
        assert.equal(db.etiquetas.find((e) => e.nome === 'Poliptoto').clusterId, termos.id);
    });

    it('busca por uma etiqueta de subcluster mostra o pai com só esse subcluster', () => {
        const { pai, termos, estrutura } = preparar();
        $('busca-tag-clusters').value = 'anafora';
        renderTagClusters();
        assert.ok(cartao(pai.id));
        assert.ok(cartao(termos.id));
        assert.equal(cartao(estrutura.id), null);
        assert.match($('resumo-tag-clusters').textContent, /2 de 3 tag clusters/);
    });

    it('excluir o pai sobe os subclusters para o topo, e o Desfazer devolve tudo', () => {
        const { pai, termos, estrutura } = preparar();
        excluirTagClusterComAviso(pai.id);
        assert.equal(
            db.tagClusters.some((c) => c.id == pai.id),
            false,
        );
        assert.equal(termos.paiId, undefined);
        assert.equal(estrutura.paiId, undefined);
        assert.equal(db.etiquetas.find((e) => e.nome === 'Gradação').clusterId, undefined);
        assert.equal(db.etiquetas.find((e) => e.nome === 'Anáfora').clusterId, termos.id);
    });

    it('importa "Pai > Sub" pela tela e o relatório conta o subcluster criado', async () => {
        db.tagClusters = [];
        db.etiquetas.forEach((e) => delete e.clusterId);
        await abrirImportarTagClusters();
        $('itc-categoria').value = 'estilo';
        $('itc-texto').value = 'Repetição > Termos: Anáfora, Poliptoto\nSolto: Gradação';
        $('form-importar-tag-clusters').dispatchEvent(new Event('submit', { cancelable: true }));
        assert.match($('itc-relatorio').textContent, /3 tag clusters criados \(1 subcluster\)/);
        const pai = db.tagClusters.find((c) => c.nome === 'Repetição');
        assert.equal(subclustersDoCluster(db, pai.id).length, 1);
    });

    it('linha de importação com problema de nome aparece no relatório', async () => {
        db.tagClusters = [];
        criarCluster(db, 'Ritmo', 'estilo');
        await abrirImportarTagClusters();
        $('itc-categoria').value = 'estilo';
        $('itc-texto').value = 'Repetição > Ritmo: Anáfora\nA > B > C: Poliptoto';
        $('form-importar-tag-clusters').dispatchEvent(new Event('submit', { cancelable: true }));
        const texto = $('itc-relatorio').textContent;
        assert.match(texto, /linha 1: o subcluster teria o nome de um cluster de topo/);
        assert.match(texto, /linha 2: só há um nível/);
    });
});

describe('aviso do ">" na digitação do nome (F20-D16)', () => {
    beforeEach(() => {
        preparar();
        initFormTagCluster();
    });

    it('avisoDoNomeDeCluster só reage ao ">"', () => {
        assert.match(avisoDoNomeDeCluster('A > B'), /não pode estar no nome/);
        assert.equal(avisoDoNomeDeCluster('Arte, cultura e jogo'), '');
        assert.equal(avisoDoNomeDeCluster(null), '');
    });

    it('mostra o aviso ao digitar o ">" e some ao tirá-lo', async () => {
        await novoTagCluster();
        assert.equal($('tc-nome-dica').classList.contains('hidden'), true);
        $('tc-nome').value = 'Jogos > sons';
        $('tc-nome').dispatchEvent(new Event('input'));
        assert.equal($('tc-nome-dica').classList.contains('hidden'), false);
        assert.match($('tc-nome-dica').textContent, /separa o pai do subcluster/);
        $('tc-nome').value = 'Jogos e sons';
        $('tc-nome').dispatchEvent(new Event('input'));
        assert.equal($('tc-nome-dica').classList.contains('hidden'), true);
    });

    it('reabrir o cadastro limpa o aviso, e o salvar continua recusando o ">"', async () => {
        await novoTagCluster();
        $('tc-nome').value = 'A > B';
        $('tc-nome').dispatchEvent(new Event('input'));
        const antes = db.tagClusters.length;
        enviar();
        assert.equal(db.tagClusters.length, antes);
        await novoTagCluster();
        assert.equal($('tc-nome-dica').classList.contains('hidden'), true);
    });
});
