// ============================================================
// selecao-tag-clusters.js: escolha de itens da aba Tag clusters para baixar.
//
// Pedido do Victor (20/10/2026): como nas Conexões, marcar alguns cartões e
// baixar só esses. Lógica pura, sem DOM: a tela guarda o Set de chaves e
// passa para cá.
//
// Cada item tem uma chave estável, feita com o id e não com a posição:
//
//   cluster  c:<id>        (tag cluster de topo ou subcluster)
//   soltas   s:<categoria> (o bloco "Etiquetas sem cluster" de uma categoria)
//
// Regras:
//   - Marcar um cluster de topo marca os subclusters dele junto (a tela usa
//     `chavesParaMarcar`); dá para desmarcar um subcluster depois.
//   - Cluster de topo marcado sai com os subclusters que estiverem marcados.
//   - Subcluster marcado com o pai desmarcado sai como cartão solto, com o
//     nome "Pai > Sub".
//   - A seleção vale por si: não passa pela busca nem pelo filtro de
//     categoria da tela.
// ============================================================

import {
    CATEGORIAS_EM_ORDEM,
    arvoreTagClusters,
    soltasTagClusters,
    caminhoDoCluster,
    clustersDeTopoDaCategoria,
    subclustersDoCluster,
    etiquetasSemCluster,
} from './tag-clusters.js';

export const chaveCluster = (cluster) => `c:${cluster.id}`;
export const chaveSoltas = (categoria) => `s:${categoria}`;

const comoSet = (chaves) => (chaves instanceof Set ? chaves : new Set(chaves || []));

// Chaves que ligam ao marcar o cartão de um cluster: ele e, se for de topo,
// os subclusters dele.
export function chavesParaMarcar(dbRef, cluster) {
    if (!cluster) return [];
    const chaves = [chaveCluster(cluster)];
    if (cluster.paiId == null) {
        subclustersDoCluster(dbRef, cluster.id).forEach((sub) => chaves.push(chaveCluster(sub)));
    }
    return chaves;
}

// Todas as chaves que existem hoje (para descartar marcações de itens que
// sumiram: cluster excluído, categoria que ficou sem etiqueta solta).
export function chavesExistentes(dbRef) {
    const chaves = [];
    CATEGORIAS_EM_ORDEM.forEach((categoria) => {
        clustersDeTopoDaCategoria(dbRef, categoria).forEach((topo) => {
            chaves.push(chaveCluster(topo));
            subclustersDoCluster(dbRef, topo.id).forEach((sub) => chaves.push(chaveCluster(sub)));
        });
        if (etiquetasSemCluster(dbRef, categoria).length) chaves.push(chaveSoltas(categoria));
    });
    return chaves;
}

// Tira da seleção o que não existe mais. Devolve um Set novo.
export function podarSelecao(dbRef, chaves) {
    const existentes = new Set(chavesExistentes(dbRef));
    return new Set([...comoSet(chaves)].filter((c) => existentes.has(c)));
}

// Chaves de tudo o que a tela mostra agora (para "Marcar todos"): clusters
// da árvore filtrada, com os subclusters, e os blocos de soltas visíveis.
export function chavesDaTela(dbRef, filtro = {}) {
    const chaves = [];
    arvoreTagClusters(dbRef, filtro).forEach(({ topo, subs }) => {
        chaves.push(chaveCluster(topo), ...subs.map(chaveCluster));
    });
    const categorias = new Set(soltasTagClusters(dbRef, filtro).map((e) => e.categoria));
    CATEGORIAS_EM_ORDEM.filter((c) => categorias.has(c)).forEach((c) =>
        chaves.push(chaveSoltas(c)),
    );
    return chaves;
}

// Árvore só com o que foi marcado, na ordem da tela:
// `[{ categoria, topo, subs, nome }]`. `nome` é o do cluster, ou "Pai > Sub"
// para o subcluster que saiu sem o pai.
export function arvoreSelecionada(dbRef, chaves) {
    const marcadas = comoSet(chaves);
    const arvore = [];
    CATEGORIAS_EM_ORDEM.forEach((categoria) => {
        clustersDeTopoDaCategoria(dbRef, categoria).forEach((topo) => {
            const subs = subclustersDoCluster(dbRef, topo.id).filter((s) =>
                marcadas.has(chaveCluster(s)),
            );
            if (marcadas.has(chaveCluster(topo))) {
                arvore.push({ categoria, topo, subs, nome: topo.nome });
                return;
            }
            subs.forEach((sub) =>
                arvore.push({
                    categoria,
                    topo: sub,
                    subs: [],
                    nome: caminhoDoCluster(dbRef, sub),
                }),
            );
        });
    });
    return arvore;
}

// Etiquetas sem cluster das categorias marcadas (todas as dela).
export function soltasSelecionadas(dbRef, chaves) {
    const marcadas = comoSet(chaves);
    return CATEGORIAS_EM_ORDEM.filter((c) => marcadas.has(chaveSoltas(c))).flatMap((c) =>
        etiquetasSemCluster(dbRef, c),
    );
}

// O que o relatório mostra para um filtro: a seleção, se houver, ou a regra
// de busca e categoria da tela. Um ponto só para o .md e o .png.
export function recorteTagClusters(dbRef, filtro = {}) {
    if (filtro.selecao) {
        return {
            arvore: arvoreSelecionada(dbRef, filtro.selecao),
            soltas: soltasSelecionadas(dbRef, filtro.selecao),
        };
    }
    return { arvore: arvoreTagClusters(dbRef, filtro), soltas: soltasTagClusters(dbRef, filtro) };
}
