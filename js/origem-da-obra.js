// ============================================================
// origem-da-obra.js: lógica pura (só importa autores-da-obra.js, que também é
// pura) da origem das entradas de Intertextualidade e de Hipertextualidade: o
// lugar ou a cultura de onde a obra vem ("Grécia", "Brasil"). Serve sobretudo
// para obras sem autor único, como o mito de Prometeu. O que a obra É
// (Mitologia, Conto de fadas, Folclore) continua no Tipo de obra, e o tempo
// mora na data da obra: a origem é só o lugar.
//
// Um formato só:
//
//   `origemObra: ['Grécia']`   lista de tags de texto livre, na ordem digitada
//
// A chave só existe quando preenchida, então as entradas antigas ficam como
// estão. Acento e caixa não distinguem duas tags ("Grécia" e "grécia" são a
// mesma) e a primeira grafia vence, como no Autor. A origem não entra na
// identidade da obra (título mais autores): é uma característica dela, e cada
// entrada guarda a sua cópia. Texto livre, sem relação com o cadastro de Locais.
// ============================================================

import {
    chaveDeAutor,
    mesmaListaDeAutores,
    normalizarAutores,
    textoDosAutores,
} from './autores-da-obra.js';

function ehObjeto(valor) {
    return valor !== null && typeof valor === 'object' && !Array.isArray(valor);
}

// Aparas, sem vazios e sem repetidos (pela chave: sem acento nem caixa).
export const normalizarOrigens = normalizarAutores;

// A chave de uma origem (a mesma regra do autor).
export const chaveDeOrigem = chaveDeAutor;

// As origens da entrada. Só vale lista; qualquer outra coisa é "sem origem".
export function origensDaEntrada(entrada) {
    if (!ehObjeto(entrada) || !Array.isArray(entrada.origemObra)) return [];
    return normalizarOrigens(entrada.origemObra);
}

// "A", "A e B", "A, B e C": o jeito de mostrar a lista em uma frase.
export function textoDasOrigens(lista) {
    return textoDosAutores(lista);
}

export function textoOrigemDaEntrada(entrada) {
    return textoDasOrigens(origensDaEntrada(entrada));
}

// O rótulo das listas e do .csv: "origem Grécia" (vazio sem origem).
export function rotuloDaOrigem(entrada) {
    const texto = textoOrigemDaEntrada(entrada);
    return texto ? `origem ${texto}` : '';
}

// A entrada tem todas as origens pedidas? Compara pela chave.
export function entradaTemAsOrigens(entrada, pedidas) {
    const tem = new Set(origensDaEntrada(entrada).map(chaveDeOrigem));
    return normalizarOrigens(pedidas).every((nome) => tem.has(chaveDeOrigem(nome)));
}

// Mesma lista, na mesma ordem e com a mesma grafia.
export const mesmaListaDeOrigens = mesmaListaDeAutores;

// O que a entrada tem hoje na chave, para o Desfazer devolver tudo como
// estava (inclusive a ausência da chave).
export function capturarOrigensDaEntrada(entrada) {
    return {
        temOrigem: 'origemObra' in entrada,
        origemObra: Array.isArray(entrada.origemObra)
            ? [...entrada.origemObra]
            : entrada.origemObra,
    };
}

export function restaurarOrigensDaEntrada(entrada, captura) {
    if (captura.temOrigem) entrada.origemObra = captura.origemObra;
    else delete entrada.origemObra;
}

// Grava a lista na entrada. Lista vazia tira a chave (ela só existe preenchida).
export function definirOrigensDaEntrada(entrada, lista) {
    const normal = normalizarOrigens(lista);
    if (normal.length) entrada.origemObra = normal;
    else delete entrada.origemObra;
}

// Limpa a lista que já existe (aparas, repetidos) e tira a chave se ficou
// vazia. Nunca cria a chave. Idempotente. Devolve true quando mudou algo.
export function migrarOrigensDaEntrada(entrada) {
    if (!ehObjeto(entrada) || !('origemObra' in entrada)) return false;
    const atual = entrada.origemObra;
    if (!Array.isArray(atual)) return false;
    const normal = normalizarOrigens(atual);
    if (!normal.length) {
        delete entrada.origemObra;
        return true;
    }
    const mudou = normal.length !== atual.length || normal.some((nome, i) => nome !== atual[i]);
    entrada.origemObra = normal;
    return mudou;
}
