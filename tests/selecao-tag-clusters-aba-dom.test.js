import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Seleção na aba Tag clusters (tag-clusters-aba.js): caixinhas, barra de
// contagem, opção "Só selecionados" e o download no escopo "selecao".
document.body.innerHTML = `
    <main id="tag-clusters">
        <button id="tag-clusters-modo-selecao"></button>
        <select id="tag-clusters-baixar-escopo">
            <option value="tela">tela</option>
            <option value="tudo">tudo</option>
            <option value="selecao" hidden disabled>Só selecionados</option>
        </select>
        <select id="tag-clusters-baixar-formato">
            <option value="md">md</option>
            <option value="png">png</option>
        </select>
        <div id="tag-clusters-selecao-barra" class="hidden">
            <span id="tag-clusters-selecao-contagem"></span>
        </div>
        <input id="busca-tag-clusters" />
        <select id="filtro-categoria-tag-clusters"></select>
        <span id="resumo-tag-clusters"></span>
        <div id="lista-tag-clusters"></div>
        <div id="etiquetas-sem-cluster"></div>
    </main>
`;

const { db } = await import('../js/db.js');
const {
    renderTagClusters,
    alternarModoSelecaoTagClusters,
    toggleSelecaoTagCluster,
    marcarTodosTagClusters,
    limparSelecaoTagClusters,
    baixarTagClusters,
} = await import('../js/tag-clusters-aba.js');
const { sincronizarEtiquetas } = await import('../js/etiquetas.js');
const { criarCluster, atribuirEtiquetasAoCluster } = await import('../js/tag-clusters.js');

const $ = (id) => document.getElementById(id);
const idDe = (nome, categoria) =>
    db.etiquetas.find((e) => e.nome === nome && e.categoria === categoria).id;
const caixas = () => [...document.querySelectorAll('#tag-clusters input[data-chave]')];
const caixaDe = (chave) => caixas().find((c) => c.dataset.chave === chave);
const marcar = (chave, valor = true) => {
    const caixa = caixaDe(chave);
    caixa.checked = valor;
    toggleSelecaoTagCluster(caixa);
};

let saude;
let olhos;
let astros;

function preparar() {
    // Zera o estado do módulo: desliga o modo e limpa o que ficou marcado.
    if ($('tag-clusters-modo-selecao').getAttribute('aria-pressed') === 'true') {
        alternarModoSelecaoTagClusters();
    }
    db.poemas = [
        {
            id: 1,
            titulo: 'A',
            sinalizacoesTom: 'Melancólico, Sombrio',
            sinalizacoesDominioImagetico: 'Medicina, Oftalmologia, Astrologia',
        },
    ];
    db.prosas = [];
    db.etiquetas = [];
    db.tagClusters = [];
    sincronizarEtiquetas(db);
    saude = criarCluster(db, 'Saúde', 'dominioImagetico').cluster;
    atribuirEtiquetasAoCluster(db, [idDe('Medicina', 'dominioImagetico')], saude.id);
    olhos = criarCluster(db, 'Olhos', 'dominioImagetico', saude.id).cluster;
    atribuirEtiquetasAoCluster(db, [idDe('Oftalmologia', 'dominioImagetico')], olhos.id);
    astros = criarCluster(db, 'Astros', 'dominioImagetico').cluster;
    atribuirEtiquetasAoCluster(db, [idDe('Astrologia', 'dominioImagetico')], astros.id);
    $('busca-tag-clusters').value = '';
    $('filtro-categoria-tag-clusters').value = '';
    $('tag-clusters-baixar-escopo').value = 'tela';
    $('tag-clusters-baixar-formato').value = 'md';
    renderTagClusters();
}

// Captura o arquivo baixado (nome e conteúdo) sem tocar no navegador.
async function baixarCapturando() {
    let nome = null;
    let conteudo = null;
    const criar = URL.createObjectURL;
    const OrigBlob = globalThis.Blob;
    globalThis.Blob = class extends OrigBlob {
        constructor(partes, o) {
            super(partes, o);
            conteudo = partes.join('');
        }
    };
    URL.createObjectURL = () => 'blob:x';
    URL.revokeObjectURL = () => {};
    const criarElemento = document.createElement.bind(document);
    document.createElement = (tag) => {
        const el = criarElemento(tag);
        if (tag === 'a') el.click = () => (nome = el.download);
        return el;
    };
    try {
        await baixarTagClusters();
    } finally {
        globalThis.Blob = OrigBlob;
        URL.createObjectURL = criar;
        document.createElement = criarElemento;
    }
    return { nome, conteudo };
}

describe('seleção na aba Tag clusters (DOM real via happy-dom)', () => {
    beforeEach(preparar);

    it('sem o modo ligado, não há caixinhas nem barra', () => {
        assert.equal(caixas().length, 0);
        assert.ok($('tag-clusters-selecao-barra').classList.contains('hidden'));
        assert.equal($('tag-clusters-modo-selecao').textContent, '☐ Selecionar');
    });

    it('ligar o modo mostra a caixinha de cada cluster, subcluster e bloco de soltas', () => {
        alternarModoSelecaoTagClusters();
        const chaves = caixas().map((c) => c.dataset.chave);
        assert.deepEqual(
            new Set(chaves),
            new Set([`c:${saude.id}`, `c:${olhos.id}`, `c:${astros.id}`, 's:tom']),
        );
        assert.ok(!$('tag-clusters-selecao-barra').classList.contains('hidden'));
        assert.equal($('tag-clusters-modo-selecao').textContent, '☑ Selecionando');
        assert.match($('tag-clusters-selecao-contagem').textContent, /Nada selecionado/);
        assert.equal(
            $('tag-clusters-baixar-escopo').querySelector('[value="selecao"]').disabled,
            true,
        );
    });

    it('marcar um cluster de topo marca os subclusters, conta e põe "Só selecionados" no escopo', () => {
        alternarModoSelecaoTagClusters();
        marcar(`c:${saude.id}`);
        assert.ok(caixaDe(`c:${olhos.id}`).checked);
        assert.ok(!caixaDe(`c:${astros.id}`).checked);
        assert.equal($('tag-clusters-selecao-contagem').textContent, '2 itens selecionados');
        const select = $('tag-clusters-baixar-escopo');
        assert.equal(select.value, 'selecao');
        assert.equal(select.querySelector('[value="selecao"]').textContent, 'Só selecionados (2)');
        const card = document.querySelector(`[data-cluster-id="${saude.id}"]`);
        assert.ok(card.classList.contains('ring-2'));
    });

    it('desmarcar só o subcluster mantém o pai marcado', () => {
        alternarModoSelecaoTagClusters();
        marcar(`c:${saude.id}`);
        marcar(`c:${olhos.id}`, false);
        assert.ok(caixaDe(`c:${saude.id}`).checked);
        assert.ok(!caixaDe(`c:${olhos.id}`).checked);
        assert.equal($('tag-clusters-selecao-contagem').textContent, '1 item selecionado');
    });

    it('a marcação sobrevive a um redesenho e some ao excluir o cluster', () => {
        alternarModoSelecaoTagClusters();
        marcar(`c:${astros.id}`);
        renderTagClusters();
        assert.ok(caixaDe(`c:${astros.id}`).checked);
        db.tagClusters = db.tagClusters.filter((c) => c.id !== astros.id);
        sincronizarEtiquetas(db);
        renderTagClusters();
        assert.match($('tag-clusters-selecao-contagem').textContent, /Nada selecionado/);
        assert.equal($('tag-clusters-baixar-escopo').value, 'tela');
    });

    it('Marcar todos marca o que a tela mostra (respeita o filtro de categoria)', () => {
        $('filtro-categoria-tag-clusters').value = 'tom';
        alternarModoSelecaoTagClusters();
        marcarTodosTagClusters();
        assert.equal($('tag-clusters-selecao-contagem').textContent, '1 item selecionado');
        assert.ok(caixaDe('s:tom').checked);
        $('filtro-categoria-tag-clusters').value = '';
        marcarTodosTagClusters();
        assert.equal($('tag-clusters-selecao-contagem').textContent, '4 itens selecionados');
    });

    it('Limpar desmarca tudo e volta o escopo', () => {
        alternarModoSelecaoTagClusters();
        marcar(`c:${astros.id}`);
        limparSelecaoTagClusters();
        assert.match($('tag-clusters-selecao-contagem').textContent, /Nada selecionado/);
        assert.equal($('tag-clusters-baixar-escopo').value, 'tela');
    });

    it('desligar o modo descarta a seleção', () => {
        alternarModoSelecaoTagClusters();
        marcar(`c:${astros.id}`);
        alternarModoSelecaoTagClusters();
        assert.equal(caixas().length, 0);
        alternarModoSelecaoTagClusters();
        assert.match($('tag-clusters-selecao-contagem').textContent, /Nada selecionado/);
    });

    it('baixa só os marcados, com o sufixo -selecao no nome', async () => {
        alternarModoSelecaoTagClusters();
        marcar(`c:${astros.id}`);
        const { nome, conteudo } = await baixarCapturando();
        assert.equal(nome, 'tag-clusters-selecao.md');
        assert.match(conteudo, /seleção de 1 item/);
        assert.match(conteudo, /### Astros/);
        assert.doesNotMatch(conteudo, /Saúde/);
    });

    it('a seleção passa por cima da busca da tela', async () => {
        alternarModoSelecaoTagClusters();
        marcar(`c:${astros.id}`);
        $('busca-tag-clusters').value = 'Saúde';
        const { conteudo } = await baixarCapturando();
        assert.match(conteudo, /### Astros/);
        assert.doesNotMatch(conteudo, /Saúde/);
    });

    it('"Só selecionados" sem nada marcado avisa e não baixa', async () => {
        const avisos = [];
        const guardado = globalThis.alert;
        globalThis.alert = (m) => avisos.push(m);
        $('tag-clusters-baixar-escopo').querySelector('[value="selecao"]').disabled = false;
        $('tag-clusters-baixar-escopo').value = 'selecao';
        try {
            const { nome } = await baixarCapturando();
            assert.equal(nome, null);
        } finally {
            globalThis.alert = guardado;
        }
        assert.equal(avisos.length, 1);
        assert.match(avisos[0], /Marque ao menos um item/);
    });

    it('os escopos "tela" e "tudo" seguem como antes', async () => {
        $('busca-tag-clusters').value = 'Astros';
        let r = await baixarCapturando();
        assert.equal(r.nome, 'tag-clusters-filtrado.md');
        $('tag-clusters-baixar-escopo').value = 'tudo';
        r = await baixarCapturando();
        assert.equal(r.nome, 'tag-clusters.md');
        assert.match(r.conteudo, /Saúde/);
    });

    it('o formato .pdf chama o PDF (sem a biblioteca, avisa em vez de baixar)', async () => {
        const avisos = [];
        const guardado = globalThis.alert;
        const jspdf = window.jspdf;
        globalThis.alert = (m) => avisos.push(m);
        window.jspdf = undefined;
        $('tag-clusters-baixar-formato').innerHTML += '<option value="pdf">pdf</option>';
        $('tag-clusters-baixar-formato').value = 'pdf';
        try {
            const { nome } = await baixarCapturando();
            assert.equal(nome, null);
        } finally {
            globalThis.alert = guardado;
            window.jspdf = jspdf;
        }
        assert.equal(avisos.length, 1);
        assert.match(avisos[0], /biblioteca de PDF/);
    });
});
