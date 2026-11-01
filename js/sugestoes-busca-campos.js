// ============================================================
// sugestoes-busca-campos.js: o núcleo das sugestões enquanto se digita numa
// caixa de busca por campo (`campo:valor`). Lógica pura, sem DOM: recebe o texto
// da caixa e a configuração de quem chama (os campos, os valores que existem nos
// itens) e devolve o que oferecer para o ÚLTIMO termo (o que está sendo
// digitado). Usado pelo Modo revisão (`sugestoes-busca-revisao.js`) e pelas
// listas de Obras, Autores e Origens da aba Conexões
// (`sugestoes-busca-conexoes.js`).
//
//   "or"            → origem:
//   "origem:"       → * (preenchida) e as origens que existem, da mais usada
//   "origem:gr"     → as origens que contêm "gr" (sem acento nem caixa)
//   "-tipo:mi"      → o "-" é mantido
//
// Só oferece valores que existem em algum item, para a sugestão nunca levar a
// uma lista vazia por engano. Os campos sem função em `valores` só oferecem `*`.
// ============================================================

import { normalizarBusca } from './utils.js';
import { comAspasSePrecisar, inicioDoUltimoTermo } from './sugestoes-busca-livros.js';

export const LIMITE_SUGESTOES_BUSCA = 8;

function contem(texto, parcial) {
    return normalizarBusca(texto).includes(normalizarBusca(parcial));
}

// Os valores distintos do campo, com quantos itens têm cada um (a primeira
// grafia encontrada vence), do mais usado para o menos usado.
function valoresEmUso(itens, valoresDoItem) {
    const quantos = new Map();
    for (const item of itens) {
        const vistos = new Set();
        for (const bruto of valoresDoItem(item)) {
            const valor = String(bruto ?? '').trim();
            const chave = normalizarBusca(valor);
            if (!valor || vistos.has(chave)) continue;
            vistos.add(chave);
            const atual = quantos.get(chave) || { valor, total: 0 };
            atual.total += 1;
            quantos.set(chave, atual);
        }
    }
    return [...quantos.values()].sort(
        (a, b) => b.total - a.total || a.valor.localeCompare(b.valor, 'pt-BR'),
    );
}

// `config`:
//   campos      nome digitado (sem acento) → campo (o mesmo mapa do interpretador)
//   prefixos    os prefixos canônicos, na ordem em que são oferecidos
//   descricoes  prefixo → frase curta
//   valores     campo → (item) => lista de valores que valem oferecer
//   itens       os itens de onde vêm os valores
//   unidade     ['linha', 'linhas']: como contar os itens no detalhe
//
// Devolve `null` (nada a oferecer) ou
// `{ inicio, itens: [{ rotulo, detalhe, texto, completo }] }`: `texto` substitui
// o último termo (de `inicio` até o fim da caixa); `completo` diz se o termo
// ficou pronto (a tela põe um espaço depois) ou ainda espera mais digitação.
export function sugerirPorCampos(query, config, limite = LIMITE_SUGESTOES_BUSCA) {
    const { campos, prefixos, descricoes, valores = {}, itens: base = [] } = config;
    const [um, varios] = config.unidade || ['linha', 'linhas'];
    const texto = String(query ?? '');
    const inicio = inicioDoUltimoTermo(texto);
    const termo = texto.slice(inicio);
    if (!termo) return null;

    const m = termo.match(/^(-?)([a-zA-Zà-úÀ-Ú]+):([\s\S]*)$/);
    const campo = m ? campos[normalizarBusca(m[2])] : undefined;

    // Ainda sem prefixo completo: oferece os prefixos que começam como o digitado.
    if (!campo) {
        if (m || termo.includes('"') || termo.includes(':')) return null;
        const sinal = termo.startsWith('-') ? '-' : '';
        const digitado = normalizarBusca(termo.slice(sinal.length));
        if (!digitado) return null;
        const itens = prefixos
            .filter((p) => p.startsWith(digitado))
            .map((p) => ({
                rotulo: `${p}:`,
                detalhe: descricoes[p],
                texto: `${sinal}${p}:`,
                completo: false,
            }));
        return itens.length ? { inicio, itens: itens.slice(0, limite) } : null;
    }

    const prefixo = `${m[1]}${m[2]}:`;
    let valor = m[3];
    if (valor.startsWith('"')) valor = valor.slice(1);
    if (valor.endsWith('"') && !valor.endsWith('\\"')) valor = valor.slice(0, -1);
    // "campo:*" já é um termo completo.
    if (valor === '*') return null;

    const itens = [];
    if (!valor) {
        itens.push({
            rotulo: '*',
            detalhe: 'preenchido',
            texto: `${prefixo}*`,
            completo: true,
        });
    }
    if (valores[campo]) {
        valoresEmUso(base, valores[campo])
            .filter((v) => !valor || contem(v.valor, valor))
            .forEach((v) =>
                itens.push({
                    rotulo: v.valor,
                    detalhe: `${v.total} ${v.total === 1 ? um : varios}`,
                    texto: `${prefixo}${comAspasSePrecisar(v.valor)}`,
                    completo: true,
                }),
            );
    }
    // Já está exatamente digitado: não repete a mesma coisa como sugestão.
    const unicos = itens.filter(
        (it, i) => itens.findIndex((o) => o.texto === it.texto) === i && it.texto !== termo,
    );
    return unicos.length ? { inicio, itens: unicos.slice(0, limite) } : null;
}

// Aplica a sugestão à caixa: devolve o texto novo. Termo completo ganha um
// espaço depois, para a pessoa seguir digitando.
export function aplicarSugestaoBusca(query, inicio, item) {
    return `${String(query ?? '').slice(0, inicio)}${item.texto}${item.completo ? ' ' : ''}`;
}
