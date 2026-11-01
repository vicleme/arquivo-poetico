// ============================================================
// conhecido-como.js: lógica pura (sem DOM) do campo "Conhecido(a) como",
// das entradas de Referências (Externas) cujo Tipo é "Pessoa pública".
//
// O campo é uma lista de tags de texto livre (`conhecidoComo: ['Cantor(a)',
// 'Escritor(a)']`), porque uma pessoa costuma ser mais de uma coisa. Diz
// como a pessoa é reconhecida fora do texto, não o que ela faz dentro dele.
// Mora em cada entrada de `referenciasExternas`, e não num cadastro de
// pessoas públicas, de propósito: a mesma pessoa pode ser outra coisa
// conforme a época, e a entrada registra a versão que aquele texto cita.
// O objetivo é contar de que áreas e tipos de pessoa o autor mais tira
// referências (a contagem vem numa entrega à parte).
//
// Sem migração: o campo é opcional, e entrada antiga abre sem tags. A
// chave só existe quando há tag, e só quando o Tipo é Pessoa pública.
// Pedido do Victor, 22/10/2026.
// ============================================================

export const TIPO_PESSOA_PUBLICA = 'Pessoa pública';

// Sugestões de fábrica: semeiam o autocompletar para a lista não começar
// vazia. Qualquer outra tag digitada vale e passa a ser sugerida também.
export const CONHECIDO_COMO_SUGERIDOS = [
    'Figura histórica',
    'Cantor(a)',
    'Escritor(a)',
    'Ator/Atriz',
    'Político(a)',
    'Filósofo(a)',
    'Cientista',
    'Artista visual',
    'Atleta',
    'Influenciador(a)',
];

// Chave de comparação: ignora caixa, acento e espaços repetidos.
function chave(texto) {
    return String(texto)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

// Exportada para outros campos de Pessoa pública compararem nomes e valores
// do mesmo jeito (caracterizacao-pessoa-publica.js).
export const chaveDeComparacao = chave;

const FABRICA_POR_CHAVE = new Map(CONHECIDO_COMO_SUGERIDOS.map((tag) => [chave(tag), tag]));

// O Tipo é texto livre com sugestão, então "pessoa publica" e "Pessoa
// pública " também contam.
export function ehPessoaPublica(tipo) {
    return typeof tipo === 'string' && chave(tipo) === chave(TIPO_PESSOA_PUBLICA);
}

// Limpa uma lista de tags: tira espaços das pontas e repetidos, descarta
// vazio e o que não é texto, e não repete a mesma tag ignorando caixa e
// acento (vale a primeira, na ordem em que o usuário a pôs). Quando a tag
// casa com uma sugestão de fábrica, grava a grafia da fábrica ("cantor(a)"
// vira "Cantor(a)"), para a contagem não separar a mesma coisa. Devolve
// sempre uma lista nova.
export function normalizarConhecidoComo(lista) {
    if (!Array.isArray(lista)) return [];
    const vistas = new Set();
    const resultado = [];
    lista.forEach((valor) => {
        if (typeof valor !== 'string') return;
        const texto = valor.replace(/\s+/g, ' ').trim();
        if (!texto) return;
        const k = chave(texto);
        if (vistas.has(k)) return;
        vistas.add(k);
        resultado.push(FABRICA_POR_CHAVE.get(k) || texto);
    });
    return resultado;
}

// Lê as tags de uma entrada de Referências, qualquer que seja o formato
// em que ela chegou (sem o campo, com lixo ou com repetição).
export function conhecidoComoDaEntrada(entrada) {
    return normalizarConhecidoComo(entrada && entrada.conhecidoComo);
}

// Campos a espalhar na entrada ao salvar: só devolve `conhecidoComo` quando
// o Tipo é Pessoa pública e sobrou alguma tag. Trocar o Tipo para outro
// apaga as tags, porque a chave deixa de ser gravada (mesmo padrão de
// `camposDoSumario`).
export function camposConhecidoComo(tipo, lista) {
    if (!ehPessoaPublica(tipo)) return {};
    const tags = normalizarConhecidoComo(lista);
    return tags.length ? { conhecidoComo: tags } : {};
}

// Sugestões do autocompletar: as de fábrica mais as tags já usadas nas
// entradas de Referências de `textos` (poemas ou prosas), sem repetir
// ignorando caixa e acento, em ordem alfabética. Uma tag já usada com
// grafia própria entra com ela, a não ser que seja a de uma sugestão de
// fábrica.
export function extrairConhecidoComoUnicos(textos) {
    const porChave = new Map(FABRICA_POR_CHAVE);
    (Array.isArray(textos) ? textos : []).forEach((texto) => {
        const refs = texto && texto.referenciasExternas;
        if (!Array.isArray(refs)) return;
        refs.forEach((entrada) => {
            conhecidoComoDaEntrada(entrada).forEach((tag) => {
                const k = chave(tag);
                if (!porChave.has(k)) porChave.set(k, tag);
            });
        });
    });
    return Array.from(porChave.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
