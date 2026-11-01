// autor-em-sigilo.js: o campo `autorEmSigilo` do texto (31/10/2026).
//
// Terceiro nível do sigilo (ver `autor-sigiloso.js`): o Autor é sigiloso
// (caixa no cadastro do Autor), o nome literário anonimiza o autor (marca no
// nome) e o TEXTO está com o autor em sigilo (esta caixa, em Poema e Prosa).
// "Sigiloso" é o que o Autor é; "em sigilo" é o que ele está naquele texto.
//
// Campo `autorEmSigilo` (booleano) em poemas e prosas. Desligado por padrão, e
// texto antigo, sem o campo, vale como desligado. Só `true` conta. O efeito é o
// mesmo dos outros níveis: o nome civil não aparece junto do texto nas telas
// públicas. Nenhum nível libera o que outro escondeu.

export function ehAutorEmSigilo(item) {
    return item?.autorEmSigilo === true;
}

// Liga ou desliga a marca. Devolve true se o valor mudou. Desligar grava
// `false` (em vez de apagar o campo), como `sorteavel`.
export function definirAutorEmSigilo(item, valor) {
    if (!item) return false;
    const novo = valor === true;
    if (ehAutorEmSigilo(item) === novo && typeof item.autorEmSigilo === 'boolean') return false;
    const mudou = ehAutorEmSigilo(item) !== novo;
    item.autorEmSigilo = novo;
    return mudou;
}
