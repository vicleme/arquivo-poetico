// Linhas comuns da exportação: quando todos os textos exportados têm uma
// linha de metadado (`- **Rótulo:** valor`) com exatamente o mesmo valor,
// ela sobe uma vez para o topo do arquivo e deixa de se repetir em cada
// texto. Módulo puro, sem DOM e sem acesso ao banco: quem gera as linhas
// de cada texto é exportar-md.js (linhasMetaDoItem), e aqui só se decide
// o que é comum.

// Rótulos que podem subir para o topo, na ordem em que aparecem lá.
// Acrescentar um rótulo aqui basta para ele passar a ser considerado,
// desde que o texto exportado o gere por linhaMeta (exportar-md.js).
export const ROTULOS_COMUNS = [
    'Autoria',
    'Fonte',
    'Edição',
    'Link da fonte',
    'Grafia',
    'Texto conferido',
    'Domínio público',
    'Corrente literária',
    'Idioma',
];

// Menos que isto, não há o que agrupar (um texto só, ou nenhum).
export const MINIMO_TEXTOS_PARA_AGRUPAR = 2;

export const TITULO_COMUNS = 'Comum a todos os textos';
export const INTRO_COMUNS =
    'Estas linhas valem para todos os textos abaixo e por isso não se repetem em cada um.';

// `linhasPorItem`: um Map por texto exportado, de rótulo para a lista de
// linhas que o texto gerou com aquele rótulo (sem a quebra final). Um
// rótulo pode ter mais de uma linha (Domínio público, uma por autor).
//
// Regra estrita: o rótulo só é comum se TODOS os textos o têm e com a
// mesma lista de linhas, na mesma ordem. Texto sem a linha conta como
// diferente.
//
// Devolve `{ comuns, omitir }`: `comuns` é a lista de linhas para o topo
// (na ordem de `rotulos`) e `omitir` é o Set de rótulos que não devem
// mais sair em cada texto.
export function separarLinhasComuns(linhasPorItem, rotulos = ROTULOS_COMUNS) {
    const comuns = [];
    const omitir = new Set();
    if (!Array.isArray(linhasPorItem) || linhasPorItem.length < MINIMO_TEXTOS_PARA_AGRUPAR) {
        return { comuns, omitir };
    }
    rotulos.forEach((rotulo) => {
        const primeira = linhasPorItem[0]?.get(rotulo);
        if (!primeira || !primeira.length) return;
        const chave = primeira.join('\n');
        const todosIguais = linhasPorItem.every((mapa) => {
            const linhas = mapa?.get(rotulo);
            return Array.isArray(linhas) && linhas.join('\n') === chave;
        });
        if (!todosIguais) return;
        omitir.add(rotulo);
        comuns.push(...primeira);
    });
    return { comuns, omitir };
}

// Bloco Markdown do topo, ou '' quando não há linha comum.
export function blocoLinhasComuns(comuns) {
    if (!Array.isArray(comuns) || !comuns.length) return '';
    return `## ${TITULO_COMUNS}\n\n${INTRO_COMUNS}\n\n${comuns.join('\n')}\n\n`;
}
