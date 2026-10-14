// Região como lista de lugares. Vale para os dois cadastros que têm o campo:
// Período Histórico (`regiao`) e Corrente literária (`regiaoOrigem`).
//
// O dado em si é um array de strings (["Inglaterra", "Europa"]). Registros
// antigos guardavam um texto só, com barra entre os lugares ("Inglaterra/
// Europa"); `lugaresDaRegiao` aceita os dois formatos e é por ela que passam
// a migração, a importação e a leitura. Toda leitura e escrita de região deve
// passar por aqui.

// Lugares de uma região, sem vazios e sem repetição (a comparação ignora
// maiúsculas, o primeiro que aparece vence). Aceita array, texto com barras
// (formato antigo) ou vazio.
export function lugaresDaRegiao(valor) {
    const brutos = Array.isArray(valor) ? valor : String(valor ?? '').split('/');
    const vistos = new Set();
    const lugares = [];
    brutos.forEach((item) => {
        const lugar = String(item ?? '').trim();
        if (!lugar) return;
        const chave = lugar.toLocaleLowerCase('pt-BR');
        if (vistos.has(chave)) return;
        vistos.add(chave);
        lugares.push(lugar);
    });
    return lugares;
}

// Forma gravada no registro: sempre array.
export function normalizarRegiao(valor) {
    return lugaresDaRegiao(valor);
}

// Texto para mostrar numa linha ("Inglaterra, Europa, América do Norte").
export function textoDaRegiao(valor, separador = ', ') {
    return lugaresDaRegiao(valor).join(separador);
}

export function regiaoVazia(valor) {
    return lugaresDaRegiao(valor).length === 0;
}

// Duas regiões têm os mesmos lugares (ordem e maiúsculas não contam)?
export function mesmaRegiao(a, b) {
    const chaves = (v) => lugaresDaRegiao(v).map((l) => l.toLocaleLowerCase('pt-BR'));
    const ca = chaves(a).sort();
    const cb = chaves(b).sort();
    return ca.length === cb.length && ca.every((x, i) => x === cb[i]);
}

// União dos lugares de várias listas de registros, em ordem alfabética:
// alimenta as sugestões de autocompletar dos dois cadastros.
// `leitores` são funções que recebem um registro e devolvem a região dele.
export function lugaresUsados(...grupos) {
    const mapa = new Map();
    grupos.forEach(({ lista, ler }) => {
        (lista || []).forEach((registro) => {
            lugaresDaRegiao(ler(registro)).forEach((lugar) => {
                const chave = lugar.toLocaleLowerCase('pt-BR');
                if (!mapa.has(chave)) mapa.set(chave, lugar);
            });
        });
    });
    return [...mapa.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
