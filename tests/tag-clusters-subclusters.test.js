// Subclusters (Fase 17b, entrega 1). Lógica pura de js/tag-clusters.js.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { garantirEtiqueta } from '../js/etiquetas.js';
import {
    sincronizarTagClusters,
    clusterDaEtiqueta,
    clustersDaCategoria,
    clustersDeTopoDaCategoria,
    paiDoCluster,
    subclustersDoCluster,
    etiquetasDoCluster,
    etiquetasDoClusterComSub,
    textosDoCluster,
    contarTextosPorCluster,
    criarCluster,
    excluirCluster,
    definirPaiDoCluster,
    editarCluster,
    caminhoDoCluster,
    clustersEmArvoreDaCategoria,
    atribuirEtiquetasAoCluster,
} from '../js/tag-clusters.js';

// Estilo: pai "Repetição e paralelismo" com subclusters "Repetição de termos"
// (Anáfora, Poliptoto) e "Estrutura paralela" (Paralelismo). Gradação fica
// direto no pai. Tom: Melancólico, sem cluster.
function montar() {
    const dbRef = { etiquetas: [], tagClusters: [], poemas: [], prosas: [] };
    const anafora = garantirEtiqueta(dbRef, 'estilo', 'Anáfora');
    const poliptoto = garantirEtiqueta(dbRef, 'estilo', 'Poliptoto');
    const paralelismo = garantirEtiqueta(dbRef, 'estilo', 'Paralelismo');
    const gradacao = garantirEtiqueta(dbRef, 'estilo', 'Gradação');
    const melan = garantirEtiqueta(dbRef, 'tom', 'Melancólico');
    dbRef.poemas.push({ id: 1, sinalizacoesEstilo: [anafora, poliptoto] });
    dbRef.poemas.push({ id: 2, sinalizacoesEstilo: [paralelismo], sinalizacoesTom: [melan] });
    dbRef.prosas.push({ id: 3, sinalizacoesEstilo: [gradacao] });
    dbRef.prosas.push({ id: 4, sinalizacoesEstilo: [anafora, paralelismo] });
    const pai = criarCluster(dbRef, 'Repetição e paralelismo', 'estilo').cluster;
    const termos = criarCluster(dbRef, 'Repetição de termos', 'estilo', pai.id).cluster;
    const estrutura = criarCluster(dbRef, 'Estrutura paralela', 'estilo', pai.id).cluster;
    atribuirEtiquetasAoCluster(dbRef, [anafora, poliptoto], termos.id);
    atribuirEtiquetasAoCluster(dbRef, [paralelismo], estrutura.id);
    atribuirEtiquetasAoCluster(dbRef, [gradacao], pai.id);
    return { dbRef, pai, termos, estrutura, anafora, poliptoto, paralelismo, gradacao, melan };
}

describe('Subclusters: criar', () => {
    it('cria subcluster com paiId, na categoria do pai', () => {
        const { dbRef, pai, termos } = montar();
        assert.equal(termos.paiId, pai.id);
        assert.equal(termos.categoria, 'estilo');
        assert.equal(paiDoCluster(dbRef, termos).id, pai.id);
        assert.equal(paiDoCluster(dbRef, pai), null);
    });

    it('cluster de topo não ganha a chave paiId', () => {
        const { pai } = montar();
        assert.equal(Object.prototype.hasOwnProperty.call(pai, 'paiId'), false);
    });

    it('recusa pai inexistente, de outra categoria e subcluster de subcluster', () => {
        const { dbRef, pai, termos } = montar();
        assert.equal(criarCluster(dbRef, 'X', 'estilo', 'nao-existe').motivo, 'pai-inexistente');
        assert.equal(criarCluster(dbRef, 'X', 'tom', pai.id).motivo, 'categoria-diferente');
        assert.equal(criarCluster(dbRef, 'X', 'estilo', termos.id).motivo, 'nivel-maximo');
    });

    it('recusa nome repetido entre irmãos e entre subcluster e topo', () => {
        const { dbRef, pai } = montar();
        // Mesmo pai (sem caixa e sem acento).
        assert.equal(
            criarCluster(dbRef, 'repeticao de termos', 'estilo', pai.id).motivo,
            'duplicado',
        );
        // Topo com o nome de um subcluster.
        assert.equal(criarCluster(dbRef, 'Estrutura Paralela', 'estilo').motivo, 'duplicado');
    });

    it('Desfazer da criação remove o subcluster', () => {
        const { dbRef, pai } = montar();
        const r = criarCluster(dbRef, 'Progressão', 'estilo', pai.id);
        assert.equal(subclustersDoCluster(dbRef, pai.id).length, 3);
        r.desfazer();
        assert.equal(subclustersDoCluster(dbRef, pai.id).length, 2);
    });
});

describe('Subclusters: consultas', () => {
    it('lista subclusters e clusters de topo em ordem alfabética', () => {
        const { dbRef, pai } = montar();
        assert.deepEqual(
            subclustersDoCluster(dbRef, pai.id).map((c) => c.nome),
            ['Estrutura paralela', 'Repetição de termos'],
        );
        assert.deepEqual(
            clustersDeTopoDaCategoria(dbRef, 'estilo').map((c) => c.nome),
            ['Repetição e paralelismo'],
        );
        assert.equal(clustersDaCategoria(dbRef, 'estilo').length, 3);
    });

    it('etiquetasDoCluster é direto; ComSub inclui os subclusters', () => {
        const { dbRef, pai } = montar();
        assert.deepEqual(
            etiquetasDoCluster(dbRef, pai.id).map((e) => e.nome),
            ['Gradação'],
        );
        assert.deepEqual(
            etiquetasDoClusterComSub(dbRef, pai.id).map((e) => e.nome),
            ['Anáfora', 'Gradação', 'Paralelismo', 'Poliptoto'],
        );
    });

    it('a etiqueta aponta para o subcluster (o mais específico)', () => {
        const { dbRef, anafora, termos } = montar();
        assert.equal(clusterDaEtiqueta(dbRef, anafora).id, termos.id);
    });
});

describe('Subclusters: textos e contagem', () => {
    it('textos do pai são a união dos textos dele e dos subclusters', () => {
        const { dbRef, pai, termos } = montar();
        assert.deepEqual(textosDoCluster(dbRef, pai.id), { poemasIds: [1, 2], prosasIds: [3, 4] });
        assert.deepEqual(textosDoCluster(dbRef, termos.id), { poemasIds: [1], prosasIds: [4] });
    });

    it('o pai conta cada texto uma vez, sem somar os filhos', () => {
        const { dbRef, pai, termos, estrutura } = montar();
        const c = contarTextosPorCluster(dbRef);
        assert.equal(c.get(termos.id), 2);
        assert.equal(c.get(estrutura.id), 2);
        // textos 1, 2, 3 e 4: o texto 4 usa Anáfora e Paralelismo e conta uma vez
        assert.equal(c.get(pai.id), 4);
    });
});

describe('Subclusters: definir pai', () => {
    it('torna um cluster de topo subcluster de outro, e Desfazer devolve', () => {
        const { dbRef, pai } = montar();
        const solto = criarCluster(dbRef, 'Cadência', 'estilo').cluster;
        const r = definirPaiDoCluster(dbRef, solto.id, pai.id);
        assert.equal(r.ok, true);
        assert.equal(solto.paiId, pai.id);
        r.desfazer();
        assert.equal(Object.prototype.hasOwnProperty.call(solto, 'paiId'), false);
    });

    it('com null, o subcluster volta a ser de topo, e Desfazer devolve o pai', () => {
        const { dbRef, pai, termos } = montar();
        const r = definirPaiDoCluster(dbRef, termos.id, null);
        assert.equal(r.ok, true);
        assert.equal(termos.paiId, undefined);
        r.desfazer();
        assert.equal(termos.paiId, pai.id);
    });

    it('recusa o próprio cluster, outra categoria, nível além do máximo e pai com filhos', () => {
        const { dbRef, pai, termos } = montar();
        const solto = criarCluster(dbRef, 'Cadência', 'estilo').cluster;
        const tom = criarCluster(dbRef, 'Calma', 'tom').cluster;
        assert.equal(definirPaiDoCluster(dbRef, solto.id, solto.id).motivo, 'proprio-pai');
        assert.equal(definirPaiDoCluster(dbRef, tom.id, pai.id).motivo, 'categoria-diferente');
        assert.equal(definirPaiDoCluster(dbRef, solto.id, termos.id).motivo, 'nivel-maximo');
        assert.equal(definirPaiDoCluster(dbRef, pai.id, solto.id).motivo, 'tem-subclusters');
        assert.equal(definirPaiDoCluster(dbRef, 'nao-existe', null).motivo, 'inexistente');
        assert.equal(definirPaiDoCluster(dbRef, solto.id, 'nao-existe').motivo, 'pai-inexistente');
    });
});

describe('Subclusters: excluir', () => {
    it('excluir o pai sobe os subclusters para o topo e solta as etiquetas diretas', () => {
        const { dbRef, pai, termos, estrutura, anafora, gradacao } = montar();
        const r = excluirCluster(dbRef, pai.id);
        assert.equal(r.ok, true);
        assert.equal(r.etiquetas, 1);
        assert.equal(r.subclusters, 2);
        assert.equal(termos.paiId, undefined);
        assert.equal(estrutura.paiId, undefined);
        assert.equal(clusterDaEtiqueta(dbRef, anafora).id, termos.id);
        assert.equal(clusterDaEtiqueta(dbRef, gradacao), null);
        assert.equal(clustersDeTopoDaCategoria(dbRef, 'estilo').length, 2);
    });

    it('Desfazer devolve o pai, o vínculo dos filhos e as etiquetas diretas', () => {
        const { dbRef, pai, termos, estrutura, gradacao } = montar();
        const r = excluirCluster(dbRef, pai.id);
        r.desfazer();
        assert.equal(termos.paiId, pai.id);
        assert.equal(estrutura.paiId, pai.id);
        assert.equal(clusterDaEtiqueta(dbRef, gradacao).id, pai.id);
        assert.equal(clustersDaCategoria(dbRef, 'estilo').length, 3);
    });

    it('excluir um subcluster solta só as etiquetas dele; o pai continua', () => {
        const { dbRef, pai, termos, anafora } = montar();
        const r = excluirCluster(dbRef, termos.id);
        assert.equal(r.subclusters, 0);
        assert.equal(clusterDaEtiqueta(dbRef, anafora), null);
        assert.equal(subclustersDoCluster(dbRef, pai.id).length, 1);
    });
});

describe('Subclusters: saneamento', () => {
    it('solta paiId de pai inexistente, de si mesmo e de outra categoria', () => {
        const dbRef = {
            etiquetas: [],
            tagClusters: [
                { id: 'a', nome: 'A', categoria: 'estilo', notas: '', paiId: 'sumiu' },
                { id: 'b', nome: 'B', categoria: 'estilo', notas: '', paiId: 'b' },
                { id: 'c', nome: 'C', categoria: 'tom', notas: '' },
                { id: 'd', nome: 'D', categoria: 'estilo', notas: '', paiId: 'c' },
            ],
        };
        sincronizarTagClusters(dbRef);
        dbRef.tagClusters.forEach((c) => {
            assert.equal(Object.prototype.hasOwnProperty.call(c, 'paiId'), false, c.nome);
        });
    });

    it('mantém um nível só: cadeia A, B, C deixa C de topo', () => {
        const dbRef = {
            etiquetas: [],
            tagClusters: [
                { id: 'a', nome: 'A', categoria: 'estilo', notas: '' },
                { id: 'b', nome: 'B', categoria: 'estilo', notas: '', paiId: 'a' },
                { id: 'c', nome: 'C', categoria: 'estilo', notas: '', paiId: 'b' },
            ],
        };
        sincronizarTagClusters(dbRef);
        assert.equal(dbRef.tagClusters[1].paiId, 'a');
        assert.equal(dbRef.tagClusters[2].paiId, undefined);
    });

    it('ciclo A e B termina em um nível, sem perder cluster', () => {
        const dbRef = {
            etiquetas: [],
            tagClusters: [
                { id: 'a', nome: 'A', categoria: 'estilo', notas: '', paiId: 'b' },
                { id: 'b', nome: 'B', categoria: 'estilo', notas: '', paiId: 'a' },
            ],
        };
        sincronizarTagClusters(dbRef);
        assert.equal(dbRef.tagClusters.length, 2);
        const comPai = dbRef.tagClusters.filter((c) => c.paiId != null);
        assert.equal(comPai.length, 1);
    });

    it('dado válido passa intacto e backup sem paiId abre normal', () => {
        const { dbRef, pai, termos } = montar();
        assert.equal(sincronizarTagClusters(dbRef), 0);
        assert.equal(termos.paiId, pai.id);
        const antigo = { etiquetas: [], tagClusters: [{ id: 'x', nome: 'X', categoria: 'tom' }] };
        sincronizarTagClusters(antigo);
        assert.equal(antigo.tagClusters.length, 1);
    });
});

describe('Subclusters: nome único entre irmãos', () => {
    it('aceita o mesmo nome de subcluster em pais diferentes', () => {
        const { dbRef, pai, termos } = montar();
        const outroPai = criarCluster(dbRef, 'Jogos de palavras', 'estilo').cluster;
        const a = criarCluster(dbRef, 'Outros', 'estilo', pai.id);
        const b = criarCluster(dbRef, 'outros', 'estilo', outroPai.id);
        assert.equal(a.ok, true);
        assert.equal(b.ok, true);
        assert.equal(criarCluster(dbRef, 'OUTROS', 'estilo', pai.id).motivo, 'duplicado');
        assert.notEqual(termos.id, a.cluster.id);
    });

    it('recusa subcluster com o nome de um cluster de topo da categoria', () => {
        const { dbRef, pai } = montar();
        criarCluster(dbRef, 'Ritmo', 'estilo');
        const r = criarCluster(dbRef, 'ritmo', 'estilo', pai.id);
        assert.equal(r.ok, false);
        assert.equal(r.motivo, 'duplicado');
        assert.equal(r.existente.nome, 'Ritmo');
    });

    it('a regra vale por categoria: o mesmo nome em outra categoria é livre', () => {
        const { dbRef, pai } = montar();
        criarCluster(dbRef, 'Calma', 'tom');
        assert.equal(criarCluster(dbRef, 'Calma', 'estilo', pai.id).ok, true);
    });

    it('editarCluster aplica a regra pelo nível do cluster', () => {
        const { dbRef, pai, termos, estrutura } = montar();
        const outroPai = criarCluster(dbRef, 'Jogos de palavras', 'estilo').cluster;
        const sub = criarCluster(dbRef, 'Cadência', 'estilo', outroPai.id).cluster;
        // Irmão do mesmo pai: recusa.
        assert.equal(
            editarCluster(dbRef, termos.id, { nome: 'estrutura paralela' }).motivo,
            'duplicado',
        );
        // Mesmo nome de subcluster de outro pai: aceita.
        assert.equal(editarCluster(dbRef, sub.id, { nome: 'Estrutura paralela' }).ok, true);
        // Nome de cluster de topo: recusa.
        assert.equal(
            editarCluster(dbRef, estrutura.id, { nome: 'Jogos de palavras' }).motivo,
            'duplicado',
        );
        // Manter o próprio nome (outra caixa) não conflita consigo mesmo.
        assert.equal(editarCluster(dbRef, pai.id, { nome: 'REPETIÇÃO E PARALELISMO' }).ok, true);
    });

    it('recusa ">" no nome, porque separa pai e subcluster', () => {
        const { dbRef, pai, termos } = montar();
        assert.equal(criarCluster(dbRef, 'A > B', 'estilo').motivo, 'caractere-invalido');
        assert.equal(criarCluster(dbRef, 'A > B', 'estilo', pai.id).motivo, 'caractere-invalido');
        assert.equal(
            editarCluster(dbRef, termos.id, { nome: 'X > Y' }).motivo,
            'caractere-invalido',
        );
    });

    it('definirPaiDoCluster recusa mudar de nível se o nome passar a conflitar', () => {
        const { dbRef, pai, termos } = montar();
        const outroPai = criarCluster(dbRef, 'Jogos de palavras', 'estilo').cluster;
        criarCluster(dbRef, 'Repetição de termos', 'estilo', outroPai.id);
        // Subcluster de outro pai com o mesmo nome: pode mudar de pai? Não, conflita no destino.
        const mover = definirPaiDoCluster(dbRef, termos.id, outroPai.id);
        assert.equal(mover.ok, false);
        assert.equal(mover.motivo, 'duplicado');
        assert.equal(termos.paiId, pai.id);
        // Subir para o topo com o nome de um subcluster de outro pai: recusa,
        // porque o topo não repete nome de nenhum cluster da categoria.
        const solto = definirPaiDoCluster(dbRef, termos.id, null);
        assert.equal(solto.ok, false);
        assert.equal(solto.motivo, 'duplicado');
        assert.equal(termos.paiId, pai.id);
    });

    it('definirPaiDoCluster aceita o mesmo pai e o desfazer volta ao estado anterior', () => {
        const { dbRef, pai, termos } = montar();
        const mesmo = definirPaiDoCluster(dbRef, termos.id, pai.id);
        assert.equal(mesmo.ok, true);
        assert.equal(mesmo.mudou, false);
        const topo = criarCluster(dbRef, 'Soltar', 'estilo').cluster;
        const r = definirPaiDoCluster(dbRef, topo.id, pai.id);
        assert.equal(r.ok, true);
        assert.equal(topo.paiId, pai.id);
        r.desfazer();
        assert.equal(Object.prototype.hasOwnProperty.call(topo, 'paiId'), false);
        // Subir para o topo com nome livre funciona e o desfazer devolve o pai.
        const sobe = definirPaiDoCluster(dbRef, termos.id, null);
        assert.equal(sobe.ok, true);
        assert.equal(Object.prototype.hasOwnProperty.call(termos, 'paiId'), false);
        sobe.desfazer();
        assert.equal(termos.paiId, pai.id);
    });
});

describe('Subclusters: caminho e ordem de árvore', () => {
    it('caminhoDoCluster mostra "Pai > Sub" só para subcluster', () => {
        const { dbRef, pai, termos } = montar();
        assert.equal(caminhoDoCluster(dbRef, pai), 'Repetição e paralelismo');
        assert.equal(
            caminhoDoCluster(dbRef, termos),
            'Repetição e paralelismo > Repetição de termos',
        );
        assert.equal(caminhoDoCluster(dbRef, 'nao-existe'), '');
    });

    it('clustersEmArvoreDaCategoria põe cada subcluster logo depois do pai', () => {
        const { dbRef } = montar();
        criarCluster(dbRef, 'Aaa topo', 'estilo');
        assert.deepEqual(
            clustersEmArvoreDaCategoria(dbRef, 'estilo').map((c) => c.nome),
            ['Aaa topo', 'Repetição e paralelismo', 'Estrutura paralela', 'Repetição de termos'],
        );
    });
});
