// valencia-texto.js: a valência do TEXTO (31/10/2026).
//
// A valência já existe no Tema (`db.temas[].valencia`: agradável, neutro,
// desagradável, ambivalente) e as Estatísticas a somam por autor, ano, período
// e livro. Aqui a mesma conta vale para um texto só, e o resultado é uma de três
// faixas, que servem de coluna, de campo no Ver e nas saídas e de critério do
// sorteio:
//   'leve'    mais leve (predominam temas agradáveis)
//   'neutro'  neutro ou ambivalente (nenhum lado predomina, ou só temas
//             ambivalentes)
//   'pesado'  mais pesado (predominam temas desagradáveis)
//   ''        sem valência (nenhum Tema classificado)
//
// Duas origens, nesta ordem:
//   1. o AJUSTE do autor, `valenciaAjuste` no texto ('leve', 'neutro', 'pesado';
//      '' = seguir os temas, o padrão): vale quando o juízo do autor sobre o
//      texto difere do que os temas dizem;
//   2. os TEMAS: o mesmo índice das Estatísticas, (desagradáveis - agradáveis) /
//      (agradáveis + neutros + desagradáveis), de -1 a +1, com cada Tema contado
//      uma vez, qualquer que seja o papel. Ambivalente fica fora do índice.
//      Faixas: índice até -1/3 é leve, de +1/3 para cima é pesado, e o meio é
//      neutro. Sem nenhum Tema classificado, mas com Tema ambivalente, o texto
//      é neutro (o ambivalente pesa e alivia ao mesmo tempo).
//
// Parte pura: recebe o cadastro de Temas, não lê o `db` global.

import { chaveTema, temasComPapel } from './utils.js';
import { normalizarValenciaTema } from './temas.js';

export const VALENCIA_LEVE = 'leve';
export const VALENCIA_NEUTRO = 'neutro';
export const VALENCIA_PESADO = 'pesado';

export const FAIXAS_VALENCIA_TEXTO = Object.freeze([
    VALENCIA_LEVE,
    VALENCIA_NEUTRO,
    VALENCIA_PESADO,
]);

export const ROTULOS_VALENCIA_TEXTO = Object.freeze({
    [VALENCIA_LEVE]: 'Leve',
    [VALENCIA_NEUTRO]: 'Neutro ou ambivalente',
    [VALENCIA_PESADO]: 'Pesado',
});

// Opções do "Preencher campo" (o ajuste): "Limpar campo" volta a seguir os temas.
export const OPCOES_VALENCIA_AJUSTE = Object.freeze(
    FAIXAS_VALENCIA_TEXTO.map((valor) => ({ valor, rotulo: ROTULOS_VALENCIA_TEXTO[valor] })),
);

export const ROTULO_SEM_VALENCIA = 'Sem valência';

// Corte do índice: um terço de cada lado. É escolha de projeto (não vem de
// teoria nenhuma) e mora aqui para mudar num lugar só.
export const CORTE_INDICE = 1 / 3;
const FOLGA = 1e-9;

export function rotuloValenciaTexto(faixa) {
    return ROTULOS_VALENCIA_TEXTO[faixa] || '';
}

// O ajuste válido do texto; o que não é reconhecido vale como "seguir os temas".
export function valenciaAjusteDe(item) {
    const v = item?.valenciaAjuste;
    return typeof v === 'string' && FAIXAS_VALENCIA_TEXTO.includes(v) ? v : '';
}

// Valência de cada Tema do texto (um por Tema) e a contagem delas.
export function contagemDeTemasDoTexto(item, temasCadastro) {
    const total = { agradavel: 0, neutro: 0, desagradavel: 0, ambivalente: 0, semValencia: 0 };
    const vistos = new Set();
    temasComPapel(item, temasCadastro).forEach((e) => {
        const chave = chaveTema(e.nome);
        if (vistos.has(chave)) return;
        vistos.add(chave);
        const cadastro =
            e.temaId != null
                ? (temasCadastro || []).find((t) => String(t.id) === String(e.temaId))
                : (temasCadastro || []).find((t) => chaveTema(t.nome) === chave);
        const v = normalizarValenciaTema(cadastro?.valencia);
        if (v) total[v] += 1;
        else total.semValencia += 1;
    });
    return total;
}

// A faixa de um índice de -1 a +1.
export function faixaDoIndice(indice) {
    if (indice === null || indice === undefined || Number.isNaN(indice)) return '';
    if (indice <= -CORTE_INDICE + FOLGA) return VALENCIA_LEVE;
    if (indice >= CORTE_INDICE - FOLGA) return VALENCIA_PESADO;
    return VALENCIA_NEUTRO;
}

// A valência que os temas dão ao texto, sem o ajuste:
// `{ faixa, indice, contagem }`. `faixa` vazia quando nenhum Tema está
// classificado.
export function valenciaPelosTemas(item, temasCadastro) {
    const contagem = contagemDeTemasDoTexto(item, temasCadastro);
    const base = contagem.agradavel + contagem.neutro + contagem.desagradavel;
    if (base > 0) {
        const indice = (contagem.desagradavel - contagem.agradavel) / base;
        return { faixa: faixaDoIndice(indice), indice, contagem };
    }
    return {
        faixa: contagem.ambivalente > 0 ? VALENCIA_NEUTRO : '',
        indice: null,
        contagem,
    };
}

// A valência do texto: `{ faixa, origem, pelosTemas }`. `origem` é 'ajuste'
// (juízo do autor), 'temas' (derivada) ou '' (sem valência). `pelosTemas` leva
// a faixa que os temas dariam, para as telas mostrarem quando o ajuste difere.
export function valenciaDoTexto(item, temasCadastro) {
    const pelosTemas = valenciaPelosTemas(item, temasCadastro);
    const ajuste = valenciaAjusteDe(item);
    if (ajuste) return { faixa: ajuste, origem: 'ajuste', pelosTemas };
    return { faixa: pelosTemas.faixa, origem: pelosTemas.faixa ? 'temas' : '', pelosTemas };
}

// Só a faixa, para filtro e ordenação.
export function faixaDeValencia(item, temasCadastro) {
    return valenciaDoTexto(item, temasCadastro).faixa;
}

// A linha de texto para o Ver e o `.md`: "Pesado (pelos temas)", "Leve (ajuste do
// autor; os temas dão Pesado)". Vazia quando o texto não tem valência.
export function textoDaValencia(item, temasCadastro) {
    const v = valenciaDoTexto(item, temasCadastro);
    if (!v.faixa) return '';
    const rotulo = rotuloValenciaTexto(v.faixa);
    if (v.origem === 'temas') return `${rotulo} (pelos temas)`;
    const doTemas = v.pelosTemas.faixa;
    if (doTemas === v.faixa) return `${rotulo} (ajuste do autor; os temas dão o mesmo)`;
    return doTemas
        ? `${rotulo} (ajuste do autor; os temas dão ${rotuloValenciaTexto(doTemas)})`
        : `${rotulo} (ajuste do autor; os temas não classificam)`;
}

// Posição da faixa para ordenar da mais leve à mais pesada: 1, 2 e 3; 0 sem valência.
export function ordemDaValencia(item, temasCadastro) {
    return FAIXAS_VALENCIA_TEXTO.indexOf(faixaDeValencia(item, temasCadastro)) + 1;
}

// Define o ajuste. Devolve true se mudou. Valor desconhecido vira '' (seguir os
// temas). O campo é sempre gravado (string), como `leituraAutonoma`.
export function definirValenciaAjuste(item, valor) {
    if (!item) return false;
    const novo = typeof valor === 'string' && FAIXAS_VALENCIA_TEXTO.includes(valor) ? valor : '';
    const mudou = valenciaAjusteDe(item) !== novo;
    item.valenciaAjuste = novo;
    return mudou;
}

// Lê o valor de um arquivo de importação: aceita a chave, o rótulo ou uma forma
// solta (sem caixa, acento ou pontuação). Devolve a faixa, '' para "seguir os
// temas" ou `undefined` se não reconhece.
const ALIASES = new Map();
function chave(t) {
    return String(t)
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '');
}
FAIXAS_VALENCIA_TEXTO.forEach((f) => {
    ALIASES.set(chave(f), f);
    ALIASES.set(chave(ROTULOS_VALENCIA_TEXTO[f]), f);
});
ALIASES.set('leves', VALENCIA_LEVE);
ALIASES.set('maisleve', VALENCIA_LEVE);
ALIASES.set('ambivalente', VALENCIA_NEUTRO);
ALIASES.set('neutroouambivalente', VALENCIA_NEUTRO);
ALIASES.set('neutrosouambivalentes', VALENCIA_NEUTRO);
ALIASES.set('pesados', VALENCIA_PESADO);
ALIASES.set('maispesado', VALENCIA_PESADO);
ALIASES.set('maispesados', VALENCIA_PESADO);
ALIASES.set('maisleves', VALENCIA_LEVE);
ALIASES.set('temas', '');
ALIASES.set('seguirostemas', '');
ALIASES.set('pelostemas', '');

export function lerValenciaTexto(bruto) {
    if (bruto === undefined || bruto === null) return undefined;
    const c = chave(bruto);
    return ALIASES.has(c) ? ALIASES.get(c) : undefined;
}
