// Seleção de itens da aba Tag clusters para baixar: chaves, árvore marcada,
// relatórios .md e .png no recorte "selecao".
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { garantirEtiqueta } from '../js/etiquetas.js';
import { criarCluster, atribuirEtiquetasAoCluster } from '../js/tag-clusters.js';
import {
    chaveCluster,
    chaveSoltas,
    chavesParaMarcar,
    chavesExistentes,
    chavesDaTela,
    podarSelecao,
    arvoreSelecionada,
    soltasSelecionadas,
    recorteTagClusters,
} from '../js/selecao-tag-clusters.js';
import { gerarMarkdownTagClusters } from '../js/exportar-tag-clusters.js';
import {
    dadosTagClusters,
    descricaoFiltro,
    sufixoNomeArquivo,
    montarSvgTagClusters,
} from '../js/exportar-tag-clusters-png.js';

const medir = (t) => String(t).length * 6;

// Domínio Imagético: Saúde (Medicina) > Olhos (Oftalmologia), Astros
// (Astrologia); soltas: Alquimia. Tom: Sombrio solto. Relação: Amor solta.
function montar() {
    const dbRef = { etiquetas: [], tagClusters: [], poemas: [], prosas: [] };
    const oft = garantirEtiqueta(dbRef, 'dominioImagetico', 'Oftalmologia');
    const med = garantirEtiqueta(dbRef, 'dominioImagetico', 'Medicina');
    const astro = garantirEtiqueta(dbRef, 'dominioImagetico', 'Astrologia');
    garantirEtiqueta(dbRef, 'dominioImagetico', 'Alquimia');
    garantirEtiqueta(dbRef, 'tom', 'Sombrio');
    garantirEtiqueta(dbRef, 'relacao', 'Amor');
    dbRef.poemas.push({ id: 1, sinalizacoesDominioImagetico: [oft, med] });
    const saude = criarCluster(dbRef, 'Saúde', 'dominioImagetico').cluster;
    atribuirEtiquetasAoCluster(dbRef, [med], saude.id);
    const olhos = criarCluster(dbRef, 'Olhos', 'dominioImagetico', saude.id).cluster;
    atribuirEtiquetasAoCluster(dbRef, [oft], olhos.id);
    const astros = criarCluster(dbRef, 'Astros', 'dominioImagetico').cluster;
    atribuirEtiquetasAoCluster(dbRef, [astro], astros.id);
    return { dbRef, saude, olhos, astros };
}

const nomes = (arvore) => arvore.map((n) => n.nome);

describe('chaves da seleção', () => {
    it('cluster e soltas têm chaves estáveis por id e por categoria', () => {
        const { saude } = montar();
        assert.equal(chaveCluster(saude), `c:${saude.id}`);
        assert.equal(chaveSoltas('tom'), 's:tom');
    });

    it('marcar um cluster de topo leva os subclusters; subcluster leva só ele', () => {
        const { dbRef, saude, olhos } = montar();
        assert.deepEqual(chavesParaMarcar(dbRef, saude), [
            chaveCluster(saude),
            chaveCluster(olhos),
        ]);
        assert.deepEqual(chavesParaMarcar(dbRef, olhos), [chaveCluster(olhos)]);
        assert.deepEqual(chavesParaMarcar(dbRef, null), []);
    });

    it('chavesExistentes cobre clusters, subclusters e categorias com soltas', () => {
        const { dbRef, saude, olhos, astros } = montar();
        assert.deepEqual(
            new Set(chavesExistentes(dbRef)),
            new Set([
                chaveCluster(saude),
                chaveCluster(olhos),
                chaveCluster(astros),
                's:dominioImagetico',
                's:relacao',
                's:tom',
            ]),
        );
    });

    it('podarSelecao descarta o que sumiu', () => {
        const { dbRef, saude } = montar();
        const podada = podarSelecao(dbRef, [chaveCluster(saude), 'c:9999', 's:estilo']);
        assert.deepEqual([...podada], [chaveCluster(saude)]);
    });

    it('chavesDaTela segue o filtro: categoria Tom só traz as soltas de Tom', () => {
        const { dbRef, saude, olhos, astros } = montar();
        assert.deepEqual(chavesDaTela(dbRef, { categoria: 'tom' }), ['s:tom']);
        assert.deepEqual(chavesDaTela(dbRef, { categoria: 'dominioImagetico' }), [
            chaveCluster(astros),
            chaveCluster(saude),
            chaveCluster(olhos),
            's:dominioImagetico',
        ]);
    });
});

describe('arvoreSelecionada', () => {
    it('topo marcado sai com os subclusters marcados', () => {
        const { dbRef, saude, olhos } = montar();
        const arvore = arvoreSelecionada(dbRef, [chaveCluster(saude), chaveCluster(olhos)]);
        assert.deepEqual(nomes(arvore), ['Saúde']);
        assert.deepEqual(
            arvore[0].subs.map((s) => s.nome),
            ['Olhos'],
        );
    });

    it('topo marcado sem o subcluster marcado sai sem ele', () => {
        const { dbRef, saude } = montar();
        const arvore = arvoreSelecionada(dbRef, [chaveCluster(saude)]);
        assert.deepEqual(arvore[0].subs, []);
    });

    it('subcluster marcado sozinho vira cartão solto com o nome "Pai > Sub"', () => {
        const { dbRef, olhos } = montar();
        const arvore = arvoreSelecionada(dbRef, [chaveCluster(olhos)]);
        assert.deepEqual(nomes(arvore), ['Saúde > Olhos']);
        assert.deepEqual(arvore[0].subs, []);
        assert.equal(arvore[0].topo.id, olhos.id);
    });

    it('segue a ordem da tela, não a da marcação', () => {
        const { dbRef, saude, astros } = montar();
        const arvore = arvoreSelecionada(dbRef, [chaveCluster(saude), chaveCluster(astros)]);
        assert.deepEqual(nomes(arvore), ['Astros', 'Saúde']);
    });

    it('não leva nada que não foi marcado', () => {
        const { dbRef } = montar();
        assert.deepEqual(arvoreSelecionada(dbRef, []), []);
        assert.deepEqual(arvoreSelecionada(dbRef, new Set(['s:tom'])), []);
    });
});

describe('soltasSelecionadas e recorteTagClusters', () => {
    it('só traz as soltas das categorias marcadas', () => {
        const { dbRef } = montar();
        assert.deepEqual(
            soltasSelecionadas(dbRef, ['s:tom']).map((e) => e.nome),
            ['Sombrio'],
        );
        assert.deepEqual(soltasSelecionadas(dbRef, []), []);
    });

    it('com selecao, ignora busca e categoria; sem, usa a regra da tela', () => {
        const { dbRef, astros } = montar();
        const marcado = recorteTagClusters(dbRef, {
            busca: 'nada',
            categoria: 'tom',
            selecao: new Set([chaveCluster(astros)]),
        });
        assert.deepEqual(nomes(marcado.arvore), ['Astros']);
        assert.deepEqual(marcado.soltas, []);
        const daTela = recorteTagClusters(dbRef, { categoria: 'tom' });
        assert.deepEqual(daTela.arvore, []);
        assert.deepEqual(
            daTela.soltas.map((e) => e.nome),
            ['Sombrio'],
        );
    });
});

describe('descrição e nome do arquivo', () => {
    it('seleção vira "seleção de N itens" e sufixo -selecao', () => {
        assert.equal(descricaoFiltro({ selecao: new Set(['c:1']) }), 'seleção de 1 item');
        assert.equal(descricaoFiltro({ selecao: new Set(['c:1', 's:tom']) }), 'seleção de 2 itens');
        assert.equal(sufixoNomeArquivo({ selecao: new Set(['c:1']) }), '-selecao');
        assert.equal(sufixoNomeArquivo({ categoria: 'tom' }), '-filtrado');
        assert.equal(sufixoNomeArquivo({}), '');
    });
});

describe('relatório .md da seleção', () => {
    it('leva só os marcados, com a linha de seleção no topo', () => {
        const { dbRef, saude, olhos } = montar();
        const md = gerarMarkdownTagClusters(dbRef, {
            selecao: new Set([chaveCluster(saude), chaveCluster(olhos), 's:tom']),
        });
        assert.match(md, /_Filtro: seleção de 3 itens\._/);
        assert.match(md, /### Saúde \(1 texto\)/);
        assert.match(md, /#### Olhos/);
        assert.doesNotMatch(md, /Astros/);
        assert.doesNotMatch(md, /Relação/);
        assert.match(md, /## Tom[\s\S]*### Etiquetas sem cluster[\s\S]*- Sombrio \(0\)/);
        // Soltas de Domínio Imagético não foram marcadas.
        assert.doesNotMatch(md, /Alquimia/);
    });

    it('subcluster marcado sozinho aparece como "Pai > Sub"', () => {
        const { dbRef, olhos } = montar();
        const md = gerarMarkdownTagClusters(dbRef, { selecao: new Set([chaveCluster(olhos)]) });
        assert.match(md, /### Saúde > Olhos \(1 texto\)/);
        assert.match(md, /- Oftalmologia \(1\)/);
        assert.doesNotMatch(md, /Medicina/);
    });
});

describe('relatório .png da seleção', () => {
    it('dados e SVG só têm o que foi marcado', () => {
        const { dbRef, astros } = montar();
        const filtro = { selecao: new Set([chaveCluster(astros), 's:relacao']) };
        const dados = dadosTagClusters(dbRef, filtro);
        assert.equal(dados.filtro, 'seleção de 2 itens');
        assert.equal(dados.totalClusters, 1);
        assert.equal(dados.totalSoltas, 1);
        const { svg } = montarSvgTagClusters({ dados, medir });
        assert.match(svg, /Filtro: seleção de 2 itens/);
        assert.match(svg, /Astros/);
        assert.doesNotMatch(svg, /Saúde/);
        assert.doesNotMatch(svg, /Alquimia/);
        assert.match(svg, /Amor/);
    });

    it('subcluster solto leva o nome "Pai > Sub" no cartão', () => {
        const { dbRef, olhos } = montar();
        const dados = dadosTagClusters(dbRef, { selecao: new Set([chaveCluster(olhos)]) });
        assert.equal(dados.categorias[0].clusters[0].nome, 'Saúde > Olhos');
    });
});
