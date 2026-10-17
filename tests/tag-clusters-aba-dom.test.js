import './helpers/dom-real.js';

import fs from 'node:fs';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Aba Tag clusters (renderTagClusters em tag-clusters-aba.js), modal
// (modais/modal-tag-cluster.html + initFormTagCluster), os seletores de
// classificação e o cluster no cartão da aba Etiquetas.
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
    alternarCategoriaTagClusters,
    irParaEtiquetasSemCluster,
    alternarTagCluster,
    recolherTodosTagClusters,
    expandirTodosTagClusters,
    abrirImportarTagClusters,
    initFormImportarTagClusters,
    desfazerImportacaoTagClusters,
    novoTagCluster,
    editarTagCluster,
    initFormTagCluster,
    excluirTagClusterComAviso,
    tirarEtiquetaDoCluster,
    colocarEtiquetaNoCluster,
    adicionarEtiquetaAoClusterDoCartao,
    definirClusterDaEtiqueta,
} = await import('../js/tag-clusters-aba.js');
const { renderEtiquetas } = await import('../js/etiquetas-aba.js');
const { sincronizarEtiquetas } = await import('../js/etiquetas.js');
const { criarCluster, atribuirEtiquetasAoCluster, etiquetasDoCluster, etiquetasSemCluster } =
    await import('../js/tag-clusters.js');

const $ = (id) => document.getElementById(id);
const enviar = () => $('form-tag-cluster').dispatchEvent(new Event('submit', { cancelable: true }));
const idDe = (nome, categoria) =>
    db.etiquetas.find((e) => e.nome === nome && e.categoria === categoria).id;
const nomesDosCartoes = () =>
    [...$('lista-tag-clusters').querySelectorAll('[data-cluster-id] h4 span:last-child')].map(
        (h) => h.textContent,
    );
const selecionar = (select, valor) => {
    select.value = valor;
    return select;
};

function preparar() {
    db.poemas = [
        {
            id: 1,
            titulo: 'A',
            sinalizacoesTom: 'Melancólico, Irônico',
            sinalizacoesEstilo: 'Barroco',
        },
        { id: 2, titulo: 'B', sinalizacoesTom: 'melancólico' },
    ];
    db.prosas = [{ id: 3, titulo: 'C', sinalizacoesTom: 'Sombrio' }];
    db.etiquetas = [];
    db.tagClusters = [];
    sincronizarEtiquetas(db);
    $('busca-tag-clusters').value = '';
    $('filtro-categoria-tag-clusters').value = '';
}

describe('renderTagClusters (DOM real via happy-dom)', () => {
    beforeEach(preparar);

    it('sem cluster, mostra o aviso e a triagem com todas as etiquetas das categorias que aceitam cluster', () => {
        renderTagClusters();
        assert.match($('lista-tag-clusters').textContent, /Nenhum tag cluster cadastrado ainda/);
        assert.match(
            $('resumo-tag-clusters').textContent,
            /0 de 0 tag clusters · 4 etiquetas sem cluster/,
        );
        assert.match($('etiquetas-sem-cluster').textContent, /Etiquetas sem cluster/);
        assert.match($('etiquetas-sem-cluster').textContent, /Crie um tag cluster de Tom/);
    });

    it('"n etiquetas sem cluster" do resumo é um botão que rola até a triagem', () => {
        renderTagClusters();
        const botao = $('resumo-tag-clusters').querySelector(
            '[data-action="ir-etiquetas-sem-cluster"]',
        );
        assert.ok(botao);
        assert.equal(botao.textContent, '4 etiquetas sem cluster');
        const alvo = $('etiquetas-sem-cluster');
        let chamado = null;
        alvo.scrollIntoView = (opcoes) => {
            chamado = opcoes;
        };
        irParaEtiquetasSemCluster();
        assert.deepEqual(chamado, { behavior: 'smooth', block: 'start' });
    });

    it('mostra o cartão com as etiquetas e a contagem de textos (um texto conta uma vez)', () => {
        const c = criarCluster(db, 'Tons sombrios', 'tom').cluster;
        atribuirEtiquetasAoCluster(
            db,
            [idDe('Melancólico', 'tom'), idDe('Sombrio', 'tom'), idDe('Irônico', 'tom')],
            c.id,
        );
        renderTagClusters();
        assert.deepEqual(nomesDosCartoes(), ['Tons sombrios']);
        const texto = $('lista-tag-clusters').textContent;
        assert.match(texto, /3 etiquetas · aparece em 3 textos/);
        assert.match(texto, /Melancólico · 2/);
        assert.match(
            $('resumo-tag-clusters').textContent,
            /1 de 1 tag cluster · 1 etiqueta sem cluster/,
        );
    });

    it('agrupa por categoria, só as que têm cluster, e filtra por categoria e busca', () => {
        criarCluster(db, 'Tons sombrios', 'tom');
        criarCluster(db, 'Escolas antigas', 'estilo');
        renderTagClusters();
        assert.deepEqual(
            [...$('lista-tag-clusters').querySelectorAll('section')].map(
                (s) => s.dataset.categoria,
            ),
            ['estilo', 'tom'],
        );
        $('filtro-categoria-tag-clusters').value = 'estilo';
        renderTagClusters();
        assert.deepEqual(nomesDosCartoes(), ['Escolas antigas']);

        $('filtro-categoria-tag-clusters').value = '';
        const tom = db.tagClusters.find((c) => c.nome === 'Tons sombrios');
        atribuirEtiquetasAoCluster(db, [idDe('Sombrio', 'tom')], tom.id);
        $('busca-tag-clusters').value = 'SOMBRIO';
        renderTagClusters();
        assert.deepEqual(nomesDosCartoes(), ['Tons sombrios']);
    });

    it('o seletor de triagem só oferece clusters da categoria da etiqueta', () => {
        criarCluster(db, 'Tons sombrios', 'tom');
        criarCluster(db, 'Escolas antigas', 'estilo');
        renderTagClusters();
        const linha = $('etiquetas-sem-cluster').querySelector(
            `li[data-etiqueta-id="${idDe('Barroco', 'estilo')}"] select`,
        );
        const opcoes = [...linha.options].map((o) => o.textContent);
        assert.deepEqual(opcoes, ['Pôr em cluster…', 'Escolas antigas']);
    });
});

describe('modal e ações da aba Tag clusters (DOM real via happy-dom)', () => {
    beforeEach(() => {
        preparar();
        initFormTagCluster();
    });

    it('cria tag cluster na categoria escolhida, com nota, e recusa nome repetido na categoria', async () => {
        await novoTagCluster();
        $('tc-nome').value = 'Tons sombrios';
        $('tc-categoria').value = 'tom';
        $('tc-notas').value = 'o lado escuro';
        enviar();
        const criado = db.tagClusters.find((c) => c.nome === 'Tons sombrios');
        assert.equal(criado.categoria, 'tom');
        assert.equal(criado.notas, 'o lado escuro');

        const total = db.tagClusters.length;
        $('tc-nome').value = 'TONS SOMBRIOS';
        enviar();
        assert.equal(db.tagClusters.length, total);
        // O mesmo nome em outra categoria é outro cluster.
        $('tc-nome').value = 'Tons sombrios';
        $('tc-categoria').value = 'estilo';
        enviar();
        assert.equal(db.tagClusters.length, total + 1);
    });

    it('só oferece as 6 categorias que aceitam cluster, em ordem alfabética, sem nenhuma escolhida', async () => {
        $('filtro-categoria-tag-clusters').value = '';
        await novoTagCluster();
        assert.deepEqual(
            [...$('tc-categoria').options].map((o) => o.value),
            ['', 'dominioImagetico', 'estilo', 'relacao', 'sensibilidade', 'tom', 'tradicao'],
        );
        assert.equal($('tc-categoria').value, '');
    });

    it('sem categoria escolhida, não cria e avisa', async () => {
        await novoTagCluster();
        $('tc-nome').value = 'Sem categoria';
        enviar();
        assert.equal(
            db.tagClusters.some((c) => c.nome === 'Sem categoria'),
            false,
        );
    });

    it('com filtro de categoria ligado, o modal já vem nela', async () => {
        $('filtro-categoria-tag-clusters').innerHTML = '<option value="estilo">Estilo</option>';
        $('filtro-categoria-tag-clusters').value = 'estilo';
        await novoTagCluster();
        assert.equal($('tc-categoria').value, 'estilo');
        $('filtro-categoria-tag-clusters').innerHTML = '';
    });

    it('editar renomeia, guarda a nota e trava a categoria', async () => {
        const c = criarCluster(db, 'Tons sombrios', 'tom').cluster;
        await editarTagCluster(c.id);
        assert.equal($('tc-nome').value, 'Tons sombrios');
        assert.equal($('tc-categoria').disabled, true);
        $('tc-nome').value = 'Tons escuros';
        $('tc-notas').value = 'nota nova';
        enviar();
        assert.equal(c.nome, 'Tons escuros');
        assert.equal(c.notas, 'nota nova');
    });

    it('"Novo" depois de "Editar" libera a categoria e limpa o id', async () => {
        const c = criarCluster(db, 'Tons sombrios', 'tom').cluster;
        await editarTagCluster(c.id);
        await novoTagCluster();
        assert.equal($('tc-edit-id').value, '');
        assert.equal($('tc-categoria').disabled, false);
        assert.equal($('tc-nome').value, '');
    });

    it('excluir solta as etiquetas e não mexe em nenhum texto', () => {
        const c = criarCluster(db, 'Tons sombrios', 'tom').cluster;
        const melancolico = idDe('Melancólico', 'tom');
        atribuirEtiquetasAoCluster(db, [melancolico], c.id);
        // O save() acrescenta campos padrão aos textos; o que importa é que
        // as etiquetas de cada texto continuam as mesmas.
        const etiquetasDosTextos = () =>
            JSON.stringify(
                [...db.poemas, ...db.prosas].map((t) => [t.sinalizacoesTom, t.sinalizacoesEstilo]),
            );
        const textosAntes = etiquetasDosTextos();
        excluirTagClusterComAviso(c.id);
        assert.equal(db.tagClusters.length, 0);
        assert.equal(db.etiquetas.find((e) => e.id === melancolico).clusterId, undefined);
        assert.equal(etiquetasDosTextos(), textosAntes);
    });

    it('triagem: "Pôr em cluster…" classifica a etiqueta e o select volta ao início', () => {
        const c = criarCluster(db, 'Tons sombrios', 'tom').cluster;
        const sombrio = idDe('Sombrio', 'tom');
        const select = document.createElement('select');
        select.dataset.etiqueta = String(sombrio);
        select.innerHTML = `<option value=""></option><option value="${c.id}"></option>`;
        colocarEtiquetaNoCluster(selecionar(select, String(c.id)));
        assert.equal(db.etiquetas.find((e) => e.id === sombrio).clusterId, c.id);
        assert.equal(select.value, '');
        assert.ok(!etiquetasSemCluster(db, 'tom').some((e) => e.id === sombrio));
    });

    it('no cartão do cluster, "Adicionar etiqueta…" só lista etiquetas livres da categoria', () => {
        const c = criarCluster(db, 'Tons sombrios', 'tom').cluster;
        atribuirEtiquetasAoCluster(db, [idDe('Melancólico', 'tom')], c.id);
        renderTagClusters();
        const select = $('lista-tag-clusters').querySelector(`select[data-cluster="${c.id}"]`);
        assert.deepEqual(
            [...select.options].map((o) => o.textContent),
            ['Adicionar etiqueta…', 'Irônico', 'Sombrio'],
        );
        adicionarEtiquetaAoClusterDoCartao(selecionar(select, String(idDe('Sombrio', 'tom'))));
        assert.deepEqual(
            etiquetasDoCluster(db, c.id).map((e) => e.nome),
            ['Melancólico', 'Sombrio'],
        );
    });

    it('o × do chip tira a etiqueta do cluster', () => {
        const c = criarCluster(db, 'Tons sombrios', 'tom').cluster;
        const melancolico = idDe('Melancólico', 'tom');
        atribuirEtiquetasAoCluster(db, [melancolico], c.id);
        tirarEtiquetaDoCluster(melancolico);
        assert.equal(etiquetasDoCluster(db, c.id).length, 0);
    });
});

describe('cluster no cartão da aba Etiquetas', () => {
    beforeEach(() => {
        preparar();
        $('busca-etiquetas').value = '';
        $('filtro-categoria-etiquetas').value = '';
        $('filtro-etiquetas-sem-texto').checked = false;
        $('ordem-etiquetas').value = 'alfabetica';
    });

    const seletorDe = (nome, categoria) =>
        $('lista-etiquetas').querySelector(
            `select[data-etiqueta="${idDe(nome, categoria)}"][onchange^="definirCluster"]`,
        );

    it('categoria que aceita cluster ganha o seletor; Outros não', () => {
        db.poemas[1].sinalizacoesOutros = 'Rascunho';
        sincronizarEtiquetas(db);
        criarCluster(db, 'Tons sombrios', 'tom');
        renderEtiquetas();
        const opcoes = [...seletorDe('Melancólico', 'tom').options].map((o) => o.textContent);
        assert.deepEqual(opcoes, ['Sem cluster', 'Tons sombrios']);
        assert.equal(seletorDe('Rascunho', 'outros'), null);
    });

    it('Relação e Sensibilidade também ganham o seletor de cluster', () => {
        db.poemas[0].sinalizacoesRelacao = 'Amor';
        db.poemas[0].sinalizacoesSensibilidade = 'Luto';
        sincronizarEtiquetas(db);
        criarCluster(db, 'Afetos', 'relacao');
        criarCluster(db, 'Dor', 'sensibilidade');
        renderEtiquetas();
        assert.deepEqual(
            [...seletorDe('Amor', 'relacao').options].map((o) => o.textContent),
            ['Sem cluster', 'Afetos'],
        );
        assert.deepEqual(
            [...seletorDe('Luto', 'sensibilidade').options].map((o) => o.textContent),
            ['Sem cluster', 'Dor'],
        );
    });

    it('mostra o selo com o nome do cluster e o seletor marca o cluster atual', () => {
        const c = criarCluster(db, 'Tons sombrios', 'tom').cluster;
        atribuirEtiquetasAoCluster(db, [idDe('Melancólico', 'tom')], c.id);
        renderEtiquetas();
        assert.equal(seletorDe('Melancólico', 'tom').value, String(c.id));
        assert.match($('lista-etiquetas').textContent, /Tons sombrios/);
        assert.equal(seletorDe('Sombrio', 'tom').value, '');
    });

    it('classifica ali mesmo e "Sem cluster" solta', () => {
        const c = criarCluster(db, 'Tons sombrios', 'tom').cluster;
        const sombrio = idDe('Sombrio', 'tom');
        renderEtiquetas();
        definirClusterDaEtiqueta(selecionar(seletorDe('Sombrio', 'tom'), String(c.id)));
        assert.equal(db.etiquetas.find((e) => e.id === sombrio).clusterId, c.id);
        definirClusterDaEtiqueta(selecionar(seletorDe('Sombrio', 'tom'), ''));
        assert.equal(db.etiquetas.find((e) => e.id === sombrio).clusterId, undefined);
    });

    it('cluster de outra categoria não aparece nas opções da etiqueta', () => {
        criarCluster(db, 'Escolas antigas', 'estilo');
        renderEtiquetas();
        assert.deepEqual(
            [...seletorDe('Melancólico', 'tom').options].map((o) => o.textContent),
            ['Sem cluster'],
        );
    });
});

describe('tag clusters recolhíveis', () => {
    beforeEach(() => {
        preparar();
        expandirTodosTagClusters();
        const c = criarCluster(db, 'Tons sombrios', 'tom').cluster;
        atribuirEtiquetasAoCluster(db, [idDe('Sombrio', 'tom')], c.id);
        criarCluster(db, 'Barrocos', 'estilo');
        renderTagClusters();
    });

    const secao = (c) => $('lista-tag-clusters').querySelector(`section[data-categoria="${c}"]`);
    const cartao = (nome) =>
        [...$('lista-tag-clusters').querySelectorAll('[data-cluster-id]')].find(
            (el) => el.querySelector('h4 span:last-child').textContent === nome,
        );

    it('alterna uma categoria e mantém o estado ao re-renderizar', () => {
        alternarCategoriaTagClusters('tom');
        assert.equal(secao('tom').dataset.recolhida, 'true');
        assert.equal(secao('estilo').dataset.recolhida, 'false');
        renderTagClusters();
        assert.equal(secao('tom').dataset.recolhida, 'true');
        alternarCategoriaTagClusters('tom');
        assert.equal(secao('tom').dataset.recolhida, 'false');
    });

    it('alterna um cartão: esconde as etiquetas, mas mantém nome e botões', () => {
        const c = db.tagClusters.find((x) => x.nome === 'Tons sombrios');
        alternarTagCluster(c.id);
        const el = cartao('Tons sombrios');
        assert.equal(el.dataset.recolhido, 'true');
        assert.ok(el.querySelector('.hidden')?.textContent.includes('Sombrio'));
        assert.ok(el.querySelector('[data-action="editar-tag-cluster"]'));
        assert.equal(cartao('Barrocos').dataset.recolhido, 'false');
        alternarTagCluster(c.id);
        assert.equal(cartao('Tons sombrios').dataset.recolhido, 'false');
    });

    it('recolhe e expande todos', () => {
        recolherTodosTagClusters();
        assert.equal(secao('tom').dataset.recolhida, 'true');
        assert.equal(secao('estilo').dataset.recolhida, 'true');
        expandirTodosTagClusters();
        assert.equal(secao('tom').dataset.recolhida, 'false');
        assert.equal(cartao('Tons sombrios').dataset.recolhido, 'false');
        recolherTodosTagClusters();
        alternarCategoriaTagClusters('tom');
        assert.equal(cartao('Tons sombrios').dataset.recolhido, 'true');
    });

    it('com busca ligada nada fica recolhido', () => {
        recolherTodosTagClusters();
        $('busca-tag-clusters').value = 'sombrio';
        renderTagClusters();
        assert.equal(secao('tom').dataset.recolhida, 'false');
        assert.equal(cartao('Tons sombrios').dataset.recolhido, 'false');
        $('busca-tag-clusters').value = '';
    });

    it('ignora categoria inválida e id inexistente', () => {
        alternarCategoriaTagClusters('outros');
        alternarTagCluster(99999);
        assert.equal(secao('tom').dataset.recolhida, 'false');
    });
});

describe('filtro de categoria da barra', () => {
    it('lista as categorias em ordem alfabética', () => {
        preparar();
        $('filtro-categoria-tag-clusters').innerHTML = '';
        renderTagClusters();
        assert.deepEqual(
            [...$('filtro-categoria-tag-clusters').options].map((o) => o.value),
            ['', 'dominioImagetico', 'estilo', 'relacao', 'sensibilidade', 'tom', 'tradicao'],
        );
    });
});

describe('ordem das seções', () => {
    it('cartões e triagem seguem a ordem alfabética das categorias', () => {
        preparar();
        criarCluster(db, 'Tons', 'tom');
        criarCluster(db, 'Barrocos', 'estilo');
        criarCluster(db, 'Mar', 'dominioImagetico');
        db.etiquetas.push(
            { id: 9001, nome: 'Solta T', categoria: 'tom' },
            { id: 9002, nome: 'Solta E', categoria: 'estilo' },
            { id: 9003, nome: 'Solta D', categoria: 'dominioImagetico' },
        );
        renderTagClusters();
        const cats = (alvo) =>
            [...$(alvo).querySelectorAll('section[data-categoria]')].map(
                (s) => s.dataset.categoria,
            );
        assert.deepEqual(cats('lista-tag-clusters'), ['dominioImagetico', 'estilo', 'tom']);
        assert.deepEqual(cats('etiquetas-sem-cluster'), ['dominioImagetico', 'estilo', 'tom']);
    });
});

describe('importar clusters por lista colada (DOM real via happy-dom)', () => {
    beforeEach(() => {
        preparar();
        initFormImportarTagClusters();
    });

    const importar = (texto, categoria) => {
        $('itc-texto').value = texto;
        $('itc-categoria').value = categoria;
        $('form-importar-tag-clusters').dispatchEvent(new Event('submit', { cancelable: true }));
    };

    it('abre com a categoria em branco, em ordem alfabética, e sem relatório', async () => {
        $('filtro-categoria-tag-clusters').value = '';
        await abrirImportarTagClusters();
        assert.deepEqual(
            [...$('itc-categoria').options].map((o) => o.value),
            ['', 'dominioImagetico', 'estilo', 'relacao', 'sensibilidade', 'tom', 'tradicao'],
        );
        assert.equal($('itc-categoria').value, '');
        assert.equal($('itc-relatorio').innerHTML, '');
    });

    it('cria tudo de uma vez, grava e mostra o relatório com o que não achou', async () => {
        await abrirImportarTagClusters();
        importar('Tons sombrios: Melancólico, Sombrio, Fantasma\nTons leves: Irônico', 'tom');
        assert.deepEqual(db.tagClusters.map((c) => c.nome).sort(), ['Tons leves', 'Tons sombrios']);
        const sombrios = db.tagClusters.find((c) => c.nome === 'Tons sombrios');
        assert.deepEqual(
            etiquetasDoCluster(db, sombrios.id).map((e) => e.nome),
            ['Melancólico', 'Sombrio'],
        );
        const rel = $('itc-relatorio').textContent;
        assert.match(rel, /2 tag clusters criados · 3 etiquetas colocadas/);
        assert.match(rel, /Fantasma/);
        assert.match(rel, /não existe nessa categoria/);
        assert.ok(
            $('itc-relatorio').querySelector('[data-action="desfazer-importacao-tag-clusters"]'),
        );
    });

    it('Desfazer do relatório volta tudo e só vale uma vez', async () => {
        await abrirImportarTagClusters();
        importar('Tons sombrios: Melancólico', 'tom');
        assert.equal(db.tagClusters.length, 1);
        desfazerImportacaoTagClusters();
        assert.equal(db.tagClusters.length, 0);
        assert.equal(etiquetasSemCluster(db, 'tom').length, 3);
        assert.match($('itc-relatorio').textContent, /Importação desfeita/);
        desfazerImportacaoTagClusters();
        assert.equal(db.tagClusters.length, 0);
    });

    it('lista sem linha válida avisa e não muda nada', async () => {
        await abrirImportarTagClusters();
        importar('texto sem dois pontos', 'tom');
        assert.equal(db.tagClusters.length, 0);
        assert.match($('itc-relatorio').textContent, /faltou o ":"/);
        importar('   ', 'tom');
        assert.equal(db.tagClusters.length, 0);
    });

    it('a aba mostra os clusters importados depois de re-renderizar', async () => {
        await abrirImportarTagClusters();
        importar('Tons sombrios: Melancólico', 'tom');
        renderTagClusters();
        assert.deepEqual(nomesDosCartoes(), ['Tons sombrios']);
    });
});
