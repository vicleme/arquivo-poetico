// ============================================================
// massa-valores.js: lógica pura (sem DOM) dos campos de etiquetas das barras
// de edição em massa (Período Biográfico, Período Histórico e Correntes).
//
// Uma operação de lista pode levar vários valores de uma vez: `valores` é
// uma lista (as etiquetas do campo); `valor` (texto único) continua valendo
// como uma lista de um item. Cada valor é tratado como se fosse aplicado
// sozinho, na ordem, e o Desfazer da barra devolve todos de uma vez, porque
// cada registro guarda o estado de antes da operação inteira.
// ============================================================

const compactar = (v) =>
    String(v ?? '')
        .replace(/\s+/g, ' ')
        .trim();

// Valores da operação sem vazios e sem repetição (ignora caixa).
export function valoresDaOperacao(op) {
    const bruto = Array.isArray(op?.valores) ? op.valores : [op?.valor];
    const vistos = new Set();
    const saida = [];
    bruto.forEach((v) => {
        const texto = compactar(v);
        const chave = texto.toLocaleLowerCase('pt-BR');
        if (!texto || vistos.has(chave)) return;
        vistos.add(chave);
        saida.push(texto);
    });
    return saida;
}

// Aplica `aplicarUm(opComUmValor)` a cada valor. Devolve true se algum mudou
// alguma coisa (todos são aplicados, mesmo depois do primeiro que mudou).
export function aplicarCadaValor(op, aplicarUm) {
    const resultados = valoresDaOperacao(op).map((valor) => aplicarUm({ ...op, valor }));
    return resultados.some(Boolean);
}

// "A", "A" e "B" / "A", "B" e "C": para as frases do aviso.
export function fraseValores(valores) {
    const citados = valores.map((v) => `"${v}"`);
    if (citados.length <= 1) return citados.join('');
    return `${citados.slice(0, -1).join(', ')} e ${citados.at(-1)}`;
}

// `Esfera "A"` (um valor) ou `Esferas "A" e "B"` (vários).
export function rotuloComValores(singular, plural, valores) {
    return `${valores.length > 1 ? plural : singular} ${fraseValores(valores)}`;
}

// Divide o que foi digitado ou colado em etiquetas: vírgula, ponto e vírgula
// e quebra de linha separam.
export function etiquetasDoTexto(texto) {
    return String(texto ?? '')
        .split(/[,;\n]/)
        .map(compactar)
        .filter(Boolean);
}
