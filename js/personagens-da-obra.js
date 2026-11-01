// ============================================================
// personagens-da-obra.js: lógica pura (só importa autores-da-obra.js, que também
// é pura) dos personagens das entradas de Intertextualidade. Uma entrada pode
// citar mais de um personagem da obra (Prometeu e Zeus no mito de Prometeu), então
// o personagem passa a ser uma lista de tags de texto livre, como o Autor.
//
// Dois formatos convivem, como no Autor:
//
//   antigo   `personagem: 'Nome'`         um texto só
//   novo     `personagens: ['A', 'B']`    lista, na ordem em que foi digitada
//
// `personagensDaEntrada` lê os dois, então tudo o que só lê (busca, Ver, .md,
// .csv, sugestões) funciona com qualquer um. `migrarPersonagensDaEntrada`
// converte para o formato novo. Cada `personagem` antigo vira UMA tag, sem
// tentar dividir nomes. Texto livre: não tem relação com o cadastro Personagens
// (db.personagens), que é só do que o autor criou ou reinterpretou.
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
export const normalizarPersonagens = normalizarAutores;

// A chave de um personagem (a mesma regra do autor).
export const chaveDePersonagem = chaveDeAutor;

// Os personagens da entrada, nos dois formatos. `personagens` (lista) vence
// `personagem` quando os dois existem.
export function personagensDaEntrada(entrada) {
    if (!ehObjeto(entrada)) return [];
    if (Array.isArray(entrada.personagens)) return normalizarPersonagens(entrada.personagens);
    return normalizarPersonagens([entrada.personagem]);
}

// "A", "A e B", "A, B e C": o jeito de mostrar a lista em uma frase.
export function textoDosPersonagens(lista) {
    return textoDosAutores(lista);
}

export function textoPersonagensDaEntrada(entrada) {
    return textoDosPersonagens(personagensDaEntrada(entrada));
}

// A entrada tem todos os personagens pedidos? Compara pela chave.
export function entradaTemOsPersonagens(entrada, pedidos) {
    const tem = new Set(personagensDaEntrada(entrada).map(chaveDePersonagem));
    return normalizarPersonagens(pedidos).every((nome) => tem.has(chaveDePersonagem(nome)));
}

// Mesma lista, na mesma ordem e com a mesma grafia.
export const mesmaListaDePersonagens = mesmaListaDeAutores;

// O que a entrada tem hoje nas duas chaves, para o Desfazer devolver tudo
// como estava (inclusive a ausência de uma chave).
export function capturarPersonagensDaEntrada(entrada) {
    return {
        temPersonagem: 'personagem' in entrada,
        personagem: entrada.personagem,
        temPersonagens: 'personagens' in entrada,
        personagens: Array.isArray(entrada.personagens)
            ? [...entrada.personagens]
            : entrada.personagens,
    };
}

export function restaurarPersonagensDaEntrada(entrada, captura) {
    if (captura.temPersonagem) entrada.personagem = captura.personagem;
    else delete entrada.personagem;
    if (captura.temPersonagens) entrada.personagens = captura.personagens;
    else delete entrada.personagens;
}

// Grava a lista na entrada, sempre no formato novo (tira `personagem`).
export function definirPersonagensDaEntrada(entrada, lista) {
    entrada.personagens = normalizarPersonagens(lista);
    delete entrada.personagem;
}

// Entrada no formato novo: `personagem` (texto) vira `personagens` (lista).
// Idempotente. Devolve true quando mudou algo.
export function migrarPersonagensDaEntrada(entrada) {
    if (!ehObjeto(entrada)) return false;
    if (Array.isArray(entrada.personagens)) {
        const normal = normalizarPersonagens(entrada.personagens);
        const mudou = 'personagem' in entrada || normal.length !== entrada.personagens.length;
        entrada.personagens = normal;
        delete entrada.personagem;
        return mudou;
    }
    const lista = normalizarPersonagens([entrada.personagem]);
    const mudou = !('personagens' in entrada) || 'personagem' in entrada;
    entrada.personagens = lista;
    delete entrada.personagem;
    return mudou;
}
