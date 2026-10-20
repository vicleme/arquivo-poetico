// ============================================================
// selecao-conexoes.js: escolha de itens da aba Conexões para baixar.
//
// Pedido do Victor (19/10/2026): em vez de baixar um cartão só ou tudo,
// marcar alguns Buracos, Elos e Ecos e baixar só esses.
//
// Lógica pura, sem DOM e sem banco. Cada item tem uma chave estável, feita
// com os IDs dos poemas e não com a posição na lista: "Par 3" muda de
// número quando entra um Elo novo, mas o conjunto de poemas do par não.
//
//   buraco  b:<deId>><paraId>
//   cluster e:<ids dos poemas, ordenados>   (par ou cluster de Elos)
//   grafo   c:<ids dos poemas, ordenados>   (cadeia ou grafo de Ecos)
//
// Se a pessoa ligar um Eco novo a um grafo marcado, o conjunto de poemas
// muda e a marcação daquele grafo se perde. É raro e fácil de notar.
// ============================================================

function juntarIds(ids) {
    return [...ids].map(String).sort().join(',');
}

export function chaveBuraco(buraco) {
    return `b:${buraco.deId}>${buraco.paraId}`;
}

export function chaveCluster(cluster) {
    return `e:${juntarIds(cluster.ids || [])}`;
}

export function chaveGrafo(grafo) {
    return `c:${juntarIds((grafo.nos || []).map((no) => no.id))}`;
}

// Todas as chaves que existem hoje, para "Marcar todos" e para descartar
// marcações de itens que sumiram.
export function todasAsChaves(dados) {
    return [
        ...(dados?.buracos || []).map(chaveBuraco),
        ...(dados?.clusters || []).map(chaveCluster),
        ...(dados?.grafos || []).map(chaveGrafo),
    ];
}

// Mantém só os itens marcados, na mesma ordem da tela.
export function filtrarSelecionados(dados, chaves) {
    const marcadas = chaves instanceof Set ? chaves : new Set(chaves || []);
    return {
        buracos: (dados?.buracos || []).filter((b) => marcadas.has(chaveBuraco(b))),
        clusters: (dados?.clusters || []).filter((c) => marcadas.has(chaveCluster(c))),
        grafos: (dados?.grafos || []).filter((g) => marcadas.has(chaveGrafo(g))),
    };
}
