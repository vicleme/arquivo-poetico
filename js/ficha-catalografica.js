// ficha-catalografica.js: lógica pura (sem DOM) do tipo de elemento
// "Ficha catalográfica". O link da ficha mora em dois lugares que andam
// juntos: o campo "Ficha Catalográfica" do livro (fichaCatalograficaUrl)
// e o campo de link do elemento (fichaUrl). Mudar um muda o outro.
// Pedido do Victor, 21/10/2026.

export const TIPO_FICHA = 'Ficha catalográfica';

// Campos próprios da ficha, além de imagem e texto (que o elemento já tem).
// O ISBN, a editora, o local e o ano já existem no livro e não se repetem aqui.
export const CAMPOS_FICHA = [
    'fichaUrl',
    'fichaCdd',
    'fichaNumeroControle',
    'fichaBibliotecario',
    'fichaCrb',
];

export function ehFicha(elemento) {
    return !!elemento && elemento.tipo === TIPO_FICHA;
}

// Só a ficha ligada direto a um Livro sincroniza (Parte e Seção não).
export function fichaLigadaAoLivro(elemento) {
    return ehFicha(elemento) && elemento.paiTipo === 'livro';
}

function textoLimpo(valor) {
    return typeof valor === 'string' ? valor.trim() : '';
}

// Lê os campos da ficha de um objeto qualquer e devolve só os preenchidos
// (campo vazio não é gravado), ou {} quando o elemento não é uma ficha.
export function camposDaFicha(tipo, valores) {
    if (tipo !== TIPO_FICHA) return {};
    const saida = {};
    for (const campo of CAMPOS_FICHA) {
        const v = textoLimpo(valores?.[campo]);
        if (v) saida[campo] = v;
    }
    return saida;
}

// Outras fichas (além de `elemento`) ligadas ao mesmo livro.
export function outrasFichasDoLivro(db, elemento) {
    if (!fichaLigadaAoLivro(elemento)) return [];
    return (db.elementos || []).filter(
        (e) =>
            fichaLigadaAoLivro(e) &&
            String(e.paiId) === String(elemento.paiId) &&
            String(e.id) !== String(elemento.id),
    );
}

// Elemento salvo -> livro: o link da ficha vira o link do livro.
// Devolve true quando o livro mudou.
export function sincronizarLivroComFicha(db, elemento) {
    if (!fichaLigadaAoLivro(elemento)) return false;
    const livro = (db.livros || []).find((l) => String(l.id) === String(elemento.paiId));
    if (!livro) return false;
    const novo = textoLimpo(elemento.fichaUrl);
    if (textoLimpo(livro.fichaCatalograficaUrl) === novo) return false;
    livro.fichaCatalograficaUrl = novo;
    return true;
}

// Livro salvo -> fichas: só propaga quando o link do livro mudou de fato,
// para não apagar o link de uma segunda ficha por engano.
// Devolve quantas fichas mudaram.
export function sincronizarFichasComLivro(db, livroId, urlAnterior, urlNova) {
    const antes = textoLimpo(urlAnterior);
    const depois = textoLimpo(urlNova);
    if (antes === depois) return 0;
    let mudadas = 0;
    for (const e of db.elementos || []) {
        if (!fichaLigadaAoLivro(e) || String(e.paiId) !== String(livroId)) continue;
        if (textoLimpo(e.fichaUrl) === depois) continue;
        if (depois) e.fichaUrl = depois;
        else delete e.fichaUrl;
        mudadas++;
    }
    return mudadas;
}

// Link que o campo da ficha deve mostrar quando está vazio e a ficha está
// ligada a um livro: o link que o livro já tem.
export function linkDoLivroParaFicha(db, livroId) {
    const livro = (db.livros || []).find((l) => String(l.id) === String(livroId));
    return textoLimpo(livro?.fichaCatalograficaUrl);
}
