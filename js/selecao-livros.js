// ============================================================
// selecao-livros.js: escopo e seleção do download da aba Livros
// (Fase 19, etapa 7, entrega 3). Lógica pura, sem DOM: a tela guarda o Set
// de ids e passa para cá.
//
// Escopos (mesmo desenho do Baixar da aba Tag clusters):
//   filtrados  o que a tela mostra agora (busca e filtros); é o padrão
//   tudo       todos os livros, sem filtro
//   selecao    só os marcados; vale por si, não passa pelos filtros da tela
// A ordem do arquivo é sempre a da aba (por sequência).
// ============================================================

export const ESCOPOS_DOWNLOAD_LIVROS = ['filtrados', 'tudo', 'selecao'];
export const ESCOPO_PADRAO_LIVROS = 'filtrados';

const comoSet = (ids) => new Set([...(ids || [])].map(String));

// Tira da seleção ids de livros que já não existem (excluídos depois de
// marcados). Devolve um Set novo, com os ids como estavam.
export function podarSelecaoLivros(livros, selecao) {
    const existentes = comoSet((livros || []).map((l) => l.id));
    return new Set([...(selecao || [])].filter((id) => existentes.has(String(id))));
}

// Livros do escopo, na ordem de `todos` (a da aba). `filtrados` já vem na
// ordem da aba e é devolvido como está.
export function livrosDoEscopo(escopo, { todos = [], filtrados = [], selecao = [] } = {}) {
    if (escopo === 'tudo') return [...todos];
    if (escopo === 'selecao') {
        const marcados = comoSet(selecao);
        return todos.filter((l) => marcados.has(String(l.id)));
    }
    return [...filtrados];
}

// Nome do arquivo, sem extensão. "Filtrados" sem nenhum filtro ligado é a
// aba inteira, então leva o nome simples.
export function nomeBaseDownloadLivros(escopo, filtrando = false) {
    if (escopo === 'selecao') return 'livros-selecionados';
    if (escopo === 'filtrados' && filtrando) return 'livros-filtrados';
    return 'livros';
}

// Rótulos do select de escopo, com a contagem de cada um.
export function rotulosEscopoLivros({ total = 0, filtrados = 0, selecionados = 0 } = {}) {
    return {
        filtrados: `Filtrados, o que a tela mostra (${filtrados})`,
        tudo: `Todos os livros (${total})`,
        selecao: selecionados ? `Só selecionados (${selecionados})` : 'Só selecionados',
    };
}

// Ids entre a âncora e o clicado (shift-click), na ordem da lista visível.
// Sem âncora ou com âncora fora da lista, devolve só o clicado.
export function intervaloDeIds(idsVisiveis, ancora, atual) {
    const ids = (idsVisiveis || []).map(String);
    const iAncora = ancora == null ? -1 : ids.indexOf(String(ancora));
    const iAtual = ids.indexOf(String(atual));
    if (iAncora === -1 || iAtual === -1) return [atual];
    const [ini, fim] = iAncora < iAtual ? [iAncora, iAtual] : [iAtual, iAncora];
    return (idsVisiveis || []).slice(ini, fim + 1);
}
