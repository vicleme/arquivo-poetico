// leitura-autonoma.js: o campo `leituraAutonoma` do texto (31/10/2026).
//
// Diz se o texto se lê sozinho ou só junto de outros textos. Importa para o
// sorteio de leitura (entrega 5): um texto que só faz sentido em sequência
// ou em conjunto não deve ser sorteado sozinho. Não tem relação direta com
// Elos e Ecos, que só conectam textos.
//
// Valores (string guardada no texto):
//   ''          Lê-se sozinho (padrão; texto antigo, sem o campo, vale assim)
//   'sequencia' Só em sequência (depende dos textos que vêm antes ou depois)
//   'conjunto'  Só em conjunto (precisa dos outros textos juntos)
//   'inicio'    Só como início (abre algo, mas só serve como ponto de partida)
// Qualquer outro valor (ausente, texto desconhecido, número) vale como o
// padrão. Incompleto, Díptico e Resposta não entram aqui: o autor decide.

export const LEITURA_SOZINHO = '';
export const LEITURA_SEQUENCIA = 'sequencia';
export const LEITURA_CONJUNTO = 'conjunto';
export const LEITURA_INICIO = 'inicio';

export const OPCOES_LEITURA_AUTONOMA = [
    { valor: LEITURA_SOZINHO, rotulo: 'Lê-se sozinho' },
    { valor: LEITURA_SEQUENCIA, rotulo: 'Só em sequência' },
    { valor: LEITURA_CONJUNTO, rotulo: 'Só em conjunto' },
    { valor: LEITURA_INICIO, rotulo: 'Só como início' },
];

const VALORES = new Set(OPCOES_LEITURA_AUTONOMA.map((o) => o.valor));

// O valor válido do texto; o que não é reconhecido vale como o padrão.
export function leituraAutonomaDe(item) {
    const v = item?.leituraAutonoma;
    return typeof v === 'string' && VALORES.has(v) ? v : LEITURA_SOZINHO;
}

// Verdadeiro quando o texto NÃO se lê sozinho.
export function temLeituraCondicionada(item) {
    return leituraAutonomaDe(item) !== LEITURA_SOZINHO;
}

// Verdadeiro quando o texto não deve ser sorteado sozinho: só "Só em sequência"
// e "Só em conjunto". "Só como início" não impede: o texto pode ser sorteado
// para apresentar o começo de algo, com uma marca junto ao tipo (ver sorteio.js).
export function impedeSorteio(item) {
    const v = leituraAutonomaDe(item);
    return v === LEITURA_SEQUENCIA || v === LEITURA_CONJUNTO;
}

export function ehSoComoInicio(item) {
    return leituraAutonomaDe(item) === LEITURA_INICIO;
}

export function rotuloLeituraAutonoma(valor) {
    return OPCOES_LEITURA_AUTONOMA.find((o) => o.valor === valor)?.rotulo || '';
}

// O rótulo para as saídas (`.md` e Ver): só quando o texto NÃO se lê sozinho.
// "Lê-se sozinho" é o padrão e não aparece, como os outros campos vazios.
export function rotuloLeituraCondicionada(item) {
    return temLeituraCondicionada(item) ? rotuloLeituraAutonoma(leituraAutonomaDe(item)) : '';
}

// O aviso do modal do texto: quando o texto está marcado "Pode ser sorteado" e
// NÃO se lê sozinho, o sorteio de leitura o ignora. Recebe o estado do modal
// (`{ sorteavel, leituraAutonoma }`). Devolve o texto do aviso, ou '' quando não
// há o que avisar. Não bloqueia nada: o autor pode manter as duas marcas.
export function avisoSorteioLeituraCondicionada(estado) {
    if (estado?.sorteavel !== true || !impedeSorteio(estado)) return '';
    const rotulo = rotuloLeituraAutonoma(leituraAutonomaDe(estado));
    return `Este texto está como "${rotulo}" e não se lê sozinho: o sorteio de leitura vai ignorá-lo enquanto a Leitura autônoma estiver assim.`;
}

// Define o valor. Devolve true se mudou. Valor desconhecido vira o padrão.
// O campo é sempre gravado (string), como o `sorteavel` grava `false`.
export function definirLeituraAutonoma(item, valor) {
    if (!item) return false;
    const novo = typeof valor === 'string' && VALORES.has(valor) ? valor : LEITURA_SOZINHO;
    const mudou = leituraAutonomaDe(item) !== novo;
    item.leituraAutonoma = novo;
    return mudou;
}

// Lê o valor de um arquivo de importação: aceita o valor, o rótulo ou uma
// forma solta (sem caixa, acento ou pontuação). Devolve o valor, ou
// `undefined` se não reconhece. "sozinho" devolve '' (o padrão).
const ALIASES = new Map();
function chave(t) {
    return String(t)
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '');
}
OPCOES_LEITURA_AUTONOMA.forEach((o) => {
    if (o.valor) ALIASES.set(chave(o.valor), o.valor);
    ALIASES.set(chave(o.rotulo), o.valor);
});
ALIASES.set('sozinho', LEITURA_SOZINHO);
ALIASES.set('socomoorigem', LEITURA_INICIO); // nome que o Victor usou na conversa

export function lerLeituraAutonoma(bruto) {
    if (bruto === undefined || bruto === null) return undefined;
    const c = chave(bruto);
    return ALIASES.has(c) ? ALIASES.get(c) : undefined;
}
