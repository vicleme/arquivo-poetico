// ============================================================
// mapa-escala.js: lógica pura da escala de cor do mapa de calor das origens.
//
// Uma cor só (o roxo das colunas), do claro (poucos textos) ao escuro (muitos).
// País sem texto fica em cinza neutro. Quando um país tem muito mais textos que
// os outros, a escala vira logarítmica, para o resto não ficar todo apagado.
// No tema escuro a escala é invertida: o "muito" é o mais claro e brilhante.
// ============================================================

const CLARO = { vazio: '#e5e7eb', baixo: [237, 233, 254], alto: [76, 29, 149] };
const ESCURO = { vazio: '#334155', baixo: [76, 61, 140], alto: [221, 214, 254] };

function hex(canais) {
    return `#${canais.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
}

function mediana(numeros) {
    if (!numeros.length) return 0;
    const ord = [...numeros].sort((a, b) => a - b);
    const meio = Math.floor(ord.length / 2);
    return ord.length % 2 ? ord[meio] : (ord[meio - 1] + ord[meio]) / 2;
}

// Escala logarítmica quando o maior país tem mais de 5 vezes a mediana (e pelo
// menos 10 textos): sem ela, um país forte apaga todos os outros.
export function usarEscalaLog(paises) {
    const lista = (paises || []).map((p) => p.textos).filter((n) => n > 0);
    if (!lista.length) return false;
    const maximo = Math.max(...lista);
    return maximo >= 10 && maximo > 5 * mediana(lista);
}

// De 0 a 1: o quanto este país está "quente".
export function intensidade(textos, maximo, log = false) {
    if (!(textos > 0) || !(maximo > 0)) return 0;
    const razao = log ? Math.log(1 + textos) / Math.log(1 + maximo) : textos / maximo;
    return Math.min(1, Math.max(0, razao));
}

export function corDoPais(textos, maximo, { log = false, escuro = false } = {}) {
    const paleta = escuro ? ESCURO : CLARO;
    if (!(textos > 0)) return paleta.vazio;
    // Com poucos textos o claro não pode sumir: o piso é 0,15.
    const t = 0.15 + 0.85 * intensidade(textos, maximo, log);
    return hex(paleta.baixo.map((c, i) => c + (paleta.alto[i] - c) * t));
}

export function corDoPaisVazio(escuro = false) {
    return (escuro ? ESCURO : CLARO).vazio;
}

// Degraus da legenda, do menor ao maior: sempre com 1 e com o máximo.
export function degrausDaLegenda(maximo, { log = false, escuro = false, quantos = 5 } = {}) {
    if (!(maximo > 0)) return [];
    const valores = new Set([1, maximo]);
    for (let i = 1; i < quantos - 1; i += 1) {
        const f = i / (quantos - 1);
        const v = log ? Math.exp(Math.log(1 + maximo) * f) - 1 : 1 + (maximo - 1) * f;
        valores.add(Math.max(1, Math.round(v)));
    }
    return [...valores]
        .sort((a, b) => a - b)
        .map((textos) => ({ textos, cor: corDoPais(textos, maximo, { log, escuro }) }));
}
