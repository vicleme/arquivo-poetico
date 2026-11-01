// ============================================================
// vinculo-busca.js: pedaços comuns da sintaxe `nome@papel` das buscas
// (Livros: `autor:Maria@Tradutor`; Poemas e Prosas: `pessoa:Maria@Voz`).
//
// Módulo puro, sem imports: fica abaixo de utils.js e de busca-livros.js
// para os dois poderem usá-lo sem dependência circular.
// ============================================================

// Separa "Maria@Tradutor" em { nome: 'Maria', papel: 'Tradutor' }. O `@` vale
// só na última posição; sem ele, o termo inteiro é o nome. Dos dois lados,
// vazio quer dizer "qualquer".
export function separarNomeEPapel(termo) {
    const texto = String(termo ?? '');
    const i = texto.lastIndexOf('@');
    if (i === -1) return { nome: texto.trim(), papel: '' };
    return { nome: texto.slice(0, i).trim(), papel: texto.slice(i + 1).trim() };
}

// Quem digita naturalmente escreve `autor:"Maria Silva"@Tradutor` ou
// `equipe:Ana@"Ilustrador de capa"`, com as aspas só no pedaço que tem espaço.
// O interpretador de termos quebraria isso em dois; aqui os dois pedaços voltam a
// ser um termo só (`autor:"Maria Silva@Tradutor"`) antes de interpretar.
const ASPAS = String.raw`"(?:\\[\s\S]|[^"\\])*"`;
const RE_NOME_ASPAS_PAPEL = new RegExp(`(${ASPAS})@(${ASPAS}|[^\\s"]+)`, 'g');
const RE_NOME_PAPEL_ASPAS = new RegExp(`([^\\s"@:]+)@(${ASPAS})`, 'g');
const tiraAspas = (t) => (t.startsWith('"') ? t.slice(1, -1) : t);

export function juntarVinculosComAspas(query) {
    return String(query ?? '')
        .replace(
            RE_NOME_ASPAS_PAPEL,
            (_, nome, papel) => `"${tiraAspas(nome)}@${tiraAspas(papel)}"`,
        )
        .replace(RE_NOME_PAPEL_ASPAS, (_, nome, papel) => `"${nome}@${tiraAspas(papel)}"`);
}

// Papéis de Pessoa vêm gravados com o gênero entre parênteses ("Dedicatário(a)"),
// então quem busca "Dedicatária" nunca achava nada: o texto gravado não tem essa
// forma escrita. As variantes saem do próprio `o(a)`: `Dedicatário(a)` conhece
// também `Dedicatário` e `Dedicatária`. Só vale para a busca: o dado gravado, a
// tela e as exportações continuam com `(a)`. Papel sem `o(a)` não tem variante.
const RE_GENERO_PAPEL = /o\(a\)/g;

export function variantesDeGeneroDoPapel(papel) {
    const texto = String(papel ?? '');
    if (!RE_GENERO_PAPEL.test(texto)) {
        RE_GENERO_PAPEL.lastIndex = 0;
        return [];
    }
    RE_GENERO_PAPEL.lastIndex = 0;
    return [texto.replace(RE_GENERO_PAPEL, 'o'), texto.replace(RE_GENERO_PAPEL, 'a')];
}

// O papel gravado mais as suas variantes de gênero, sem repetir.
export function papelComVariantes(papel) {
    const texto = String(papel ?? '').trim();
    if (!texto) return [];
    return [texto, ...variantesDeGeneroDoPapel(texto)];
}
