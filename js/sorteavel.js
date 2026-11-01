// sorteavel.js: a marca "sorteável" do texto (31/10/2026).
//
// Campo `sorteavel` (booleano) em poemas e prosas: a pessoa marca à mão os
// textos que podem cair no sorteio de leitura. Desligado por padrão, e texto
// antigo, sem o campo, vale como desligado. Só `true` conta: qualquer outro
// valor (ausente, `false`, texto, número) é "não sorteável". A elegibilidade
// de verdade (a marca mais o status do texto e os Temas universais) é da
// entrega do sorteio; aqui mora só a marca.

export function ehSorteavel(item) {
    return item?.sorteavel === true;
}

// Liga ou desliga a marca. Devolve true se o valor mudou. Desligar grava
// `false` (em vez de apagar o campo) para a exportação ficar explícita.
export function definirSorteavel(item, valor) {
    if (!item) return false;
    const novo = valor === true;
    if (ehSorteavel(item) === novo && typeof item.sorteavel === 'boolean') return false;
    const mudou = ehSorteavel(item) !== novo;
    item.sorteavel = novo;
    return mudou;
}
