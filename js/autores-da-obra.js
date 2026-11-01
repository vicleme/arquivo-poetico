// ============================================================
// autores-da-obra.js: lógica pura (sem DOM, sem db.js e sem imports) da
// autoria em lista das entradas de Intertextualidade e de Hipertextualidade
// (Fora do acervo). Uma obra pode ter mais de um autor ("feat." de música,
// livro de várias pessoas), então o autor da entrada passa a ser uma lista de
// tags de texto livre.
//
// Dois formatos convivem:
//
//   antigo   `autor: 'Nome'`            um texto só
//   novo     `autores: ['A', 'B']`      lista, na ordem em que foi digitada
//
// `autoresDaEntrada` lê os dois, então tudo o que só lê (busca, Ver, .md, .csv,
// Fora do acervo) funciona com qualquer um. Quem grava usa
// `definirAutoresDaEntrada`, que não troca o formato de uma entrada antiga
// quando a lista tem no máximo um autor (a tela ainda lê `autor`).
// `migrarAutoresDasEntradas` converte tudo para o formato novo; a ligação dela
// ao carregamento do db acontece junto com as telas, não antes.
//
// Identidade: a ordem dos autores NÃO conta ("A e B" e "B e A" são a mesma
// obra) e acento, caixa e pontuação também não. A ordem digitada só vale para
// mostrar (um "feat." tem ordem de destaque).
//
// Acervo antigo: cada `autor` vira UMA tag, sem tentar dividir nomes. Para
// achar o que ainda pede divisão, `pareceMaisDeUmNome` aponta tags com " e ",
// " & ", " feat. ", vírgula e afins.
// ============================================================

function texto(valor) {
    return typeof valor === 'string' ? valor.trim() : '';
}

function ehObjeto(valor) {
    return valor !== null && typeof valor === 'object' && !Array.isArray(valor);
}

// Sem acento, sem caixa, sem pontuação e com espaços colapsados (o mesmo
// critério de `chaveDeNome` em fora-do-acervo.js, repetido aqui para este
// módulo não importar nada).
export function chaveDeAutor(valor) {
    return texto(valor)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim();
}

// Aparas, sem vazios e sem repetidos (pela chave: fica a primeira grafia, na
// posição da primeira). O que não é texto é descartado.
export function normalizarAutores(lista) {
    const vistos = new Set();
    const saida = [];
    (Array.isArray(lista) ? lista : []).forEach((nome) => {
        const t = texto(nome);
        const chave = chaveDeAutor(t);
        if (!t || !chave || vistos.has(chave)) return;
        vistos.add(chave);
        saida.push(t);
    });
    return saida;
}

// Os autores da entrada, nos dois formatos. `autores` (lista) vence `autor`
// quando os dois existem. Um `autor` antigo vale como UMA tag, mesmo que
// tenha " e " no meio.
export function autoresDaEntrada(entrada) {
    if (!ehObjeto(entrada)) return [];
    if (Array.isArray(entrada.autores)) return normalizarAutores(entrada.autores);
    return normalizarAutores([entrada.autor]);
}

// "A", "A e B", "A, B e C": o jeito de mostrar a lista em uma frase.
export function textoDosAutores(lista) {
    const nomes = normalizarAutores(lista);
    if (nomes.length <= 1) return nomes[0] || '';
    return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`;
}

// O texto de exibição dos autores de uma entrada (atalho dos leitores).
export function textoAutoresDaEntrada(entrada) {
    return textoDosAutores(autoresDaEntrada(entrada));
}

// Identidade da lista: as chaves em ordem alfabética, então "A e B" e "B e A"
// dão o mesmo valor. Lista vazia dá ''.
export function chaveDosAutores(lista) {
    return normalizarAutores(lista).map(chaveDeAutor).sort().join('|');
}

// As chaves de autor da lista, sem repetir.
export function chavesDosAutores(lista) {
    return normalizarAutores(lista).map(chaveDeAutor);
}

// Mesma lista, na mesma ordem e com a mesma grafia (para saber se uma
// correção de fato muda algo: trocar "tom jobim" por "Tom Jobim" muda).
export function mesmaListaDeAutores(a, b) {
    const x = normalizarAutores(a);
    const y = normalizarAutores(b);
    return x.length === y.length && x.every((nome, i) => nome === y[i]);
}

// ─── Gravar sem mudar o formato à toa ────────────────────────

// O que a entrada tem hoje nas duas chaves, para o Desfazer devolver tudo
// como estava (inclusive a ausência de uma chave).
export function capturarAutoresDaEntrada(entrada) {
    return {
        temAutor: 'autor' in entrada,
        autor: entrada.autor,
        temAutores: 'autores' in entrada,
        autores: Array.isArray(entrada.autores) ? [...entrada.autores] : entrada.autores,
    };
}

export function restaurarAutoresDaEntrada(entrada, captura) {
    if (captura.temAutor) entrada.autor = captura.autor;
    else delete entrada.autor;
    if (captura.temAutores) entrada.autores = captura.autores;
    else delete entrada.autores;
}

// Grava a lista na entrada. Entrada que já está no formato novo, ou lista com
// mais de um autor, grava `autores` e tira `autor`. Entrada antiga com no
// máximo um autor continua com `autor` (texto), como a tela atual espera.
export function definirAutoresDaEntrada(entrada, lista) {
    const nomes = normalizarAutores(lista);
    if (Array.isArray(entrada.autores) || nomes.length > 1) {
        entrada.autores = nomes;
        delete entrada.autor;
    } else {
        entrada.autor = nomes[0] || '';
        delete entrada.autores;
    }
}

// Troca, na lista, cada autor cuja chave está em `chavesAlvo` por `novoNome`,
// no lugar do primeiro que casou; se sobrar o mesmo autor mais de uma vez,
// junta. Devolve a lista nova (a original não muda).
export function substituirAutorNaLista(lista, chavesAlvo, novoNome) {
    const alvos = chavesAlvo instanceof Set ? chavesAlvo : new Set(chavesAlvo || []);
    const novo = texto(novoNome);
    let colocou = false;
    const saida = [];
    normalizarAutores(lista).forEach((nome) => {
        if (!alvos.has(chaveDeAutor(nome))) {
            saida.push(nome);
            return;
        }
        if (!colocou) {
            saida.push(novo);
            colocou = true;
        }
    });
    return normalizarAutores(saida);
}

// ─── Migração ────────────────────────────────────────────────

const CAMPOS_COM_AUTOR = ['intertextualidade', 'hipertextualidade'];

// Passa a entrada para o formato novo, no lugar. Cada `autor` vira uma tag só.
// Idempotente. Se por acaso a entrada tem os dois, `autores` vence e o `autor`
// que não está na lista entra no fim (nada é perdido). Devolve true se mudou.
export function migrarAutoresDaEntrada(entrada) {
    if (!ehObjeto(entrada)) return false;
    if (!('autor' in entrada) && Array.isArray(entrada.autores)) return false;
    const base = Array.isArray(entrada.autores) ? entrada.autores : [];
    entrada.autores = normalizarAutores([...base, entrada.autor]);
    delete entrada.autor;
    return true;
}

// Migra Intertextualidade e Hipertextualidade de cada item (Poema ou Prosa).
// Devolve quantos itens mudaram.
export function migrarAutoresDasEntradas(itens) {
    let alterados = 0;
    (itens || []).forEach((item) => {
        if (!ehObjeto(item)) return;
        let mudou = false;
        CAMPOS_COM_AUTOR.forEach((campo) => {
            if (!Array.isArray(item[campo])) return;
            item[campo].forEach((entrada) => {
                if (migrarAutoresDaEntrada(entrada)) mudou = true;
            });
        });
        if (mudou) alterados += 1;
    });
    return alterados;
}

// ─── Autor que parece ter mais de um nome ────────────────────

// " e ", " and ", " & ", " + ", vírgula, ponto e vírgula e "feat.", "ft.",
// "featuring" ou "part." soltos. É só uma dica para o Modo revisão achar o que
// ainda pede divisão em tags; nome com " e " no meio que é um nome só passa
// pelo filtro e a pessoa decide.
const SEPARADORES_DE_AUTOR =
    /,|;|\s&\s|\s\+\s|\s(?:e|and)\s|(?:^|[\s([])(?:feat|ft|featuring|part)\b\.?/i;

export function pareceMaisDeUmNome(valor) {
    return SEPARADORES_DE_AUTOR.test(texto(valor));
}

// Alguma tag da entrada parece ter mais de um nome?
export function entradaTemAutorComVariosNomes(entrada) {
    return autoresDaEntrada(entrada).some(pareceMaisDeUmNome);
}
