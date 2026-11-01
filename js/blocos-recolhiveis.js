// ============================================================
// blocos-recolhiveis.js: o estado de aberto e fechado dos blocos da seção
// "Fora do acervo" da aba Conexões (Obras, Autores, Origens, Hipertextualidade,
// Referências recorrentes e Avisos) e dos três subtítulos da seção "Dentro do
// acervo" (Buracos, Elos e Ecos). Lógica pura, sem DOM.
//
// A seção é redesenhada a cada atualização, então o estado não pode morar no
// HTML. Guarda-se o que está FECHADO (os blocos começam abertos, como sempre
// foram), em `localStorage`, para valer também depois de recarregar a página.
// O armazenamento é recebido por parâmetro para o teste não depender do
// navegador; sem ele, usa `localStorage` quando existe.
// ============================================================

export const LS_BLOCOS_CONEXOES_FECHADOS = 'arquivoPoetico_blocosConexoesFechados';

// Os subtítulos de "Dentro do acervo", na ordem da tela. Ficam na mesma
// chave de armazenamento, mas "Expandir tudo" e "Recolher tudo" de cada seção
// só mexem nos blocos dela.
export const BLOCOS_DENTRO_DO_ACERVO = ['buracos', 'elos', 'ecos'];

// As chaves dos blocos de "Fora do acervo", na ordem em que aparecem na tela.
export const BLOCOS_CONEXOES = [
    'obras',
    'autores',
    'origens',
    'hipertextualidade',
    'referencias',
    'quase-duplicatas',
];

const TODAS_AS_CHAVES = [...BLOCOS_DENTRO_DO_ACERVO, ...BLOCOS_CONEXOES];

function armazenamento(storage) {
    if (storage) return storage;
    try {
        return typeof localStorage !== 'undefined' ? localStorage : null;
    } catch {
        return null;
    }
}

// Lê o conjunto de blocos fechados. Valor ausente, quebrado ou de outro
// formato vira conjunto vazio (tudo aberto); chave desconhecida é descartada.
export function lerBlocosFechados(storage) {
    const s = armazenamento(storage);
    if (!s) return new Set();
    try {
        const lista = JSON.parse(s.getItem(LS_BLOCOS_CONEXOES_FECHADOS) || '[]');
        if (!Array.isArray(lista)) return new Set();
        return new Set(lista.filter((c) => TODAS_AS_CHAVES.includes(c)));
    } catch {
        return new Set();
    }
}

export function gravarBlocosFechados(fechados, storage) {
    const s = armazenamento(storage);
    if (!s) return false;
    try {
        const ordenados = TODAS_AS_CHAVES.filter((c) => fechados.has(c));
        s.setItem(LS_BLOCOS_CONEXOES_FECHADOS, JSON.stringify(ordenados));
        return true;
    } catch (e) {
        console.warn('[blocos-recolhiveis.js] Não foi possível salvar os blocos fechados:', e);
        return false;
    }
}

export function blocoEstaAberto(chave, storage) {
    return !lerBlocosFechados(storage).has(chave);
}

// Grava a escolha de um bloco. Chave desconhecida é ignorada.
export function definirBlocoAberto(chave, aberto, storage) {
    if (!TODAS_AS_CHAVES.includes(chave)) return false;
    const fechados = lerBlocosFechados(storage);
    if (aberto) fechados.delete(chave);
    else fechados.add(chave);
    return gravarBlocosFechados(fechados, storage);
}

// "Recolher tudo" e "Expandir tudo". Só mexe nas `chaves` dadas (por padrão, os
// blocos de "Fora do acervo"); o estado dos outros fica como estava.
export function definirTodosBlocos(aberto, storage, chaves = BLOCOS_CONEXOES) {
    const fechados = lerBlocosFechados(storage);
    chaves.forEach((c) => (aberto ? fechados.delete(c) : fechados.add(c)));
    return gravarBlocosFechados(fechados, storage);
}

// Texto do título com a contagem, para o tamanho aparecer mesmo com o bloco
// fechado: "Obras (124)".
export function tituloComContagem(titulo, total) {
    return Number.isFinite(total) ? `${titulo} (${total})` : titulo;
}
