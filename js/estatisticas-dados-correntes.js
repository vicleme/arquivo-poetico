// ============================================================
// estatisticas-dados-correntes.js: Estatísticas de Postura estética e
// Programa das correntes literárias. Sem DOM. Parte sempre do corpus
// filtrado das Estatísticas (textosDasEstatisticas), nunca de todo o acervo.
//
// Cada texto tem os valores efetivos (com a herança do pai) das correntes a
// que está ligado (ver posturasDasCorrentes e programasDasCorrentes). Regras
// de contagem, iguais às da busca `postura:` e `programa:`:
// - Um texto conta uma vez em cada valor que alguma das suas correntes tem,
//   então a soma das barras pode passar do total.
// - "Não se aplica" é decisão, não vazio: o texto que só tem esse valor fica
//   fora das barras e do denominador.
// - Texto ligado a correntes, mas sem valor em nenhuma delas, entra em
//   "Sem classificação" (dentro do denominador).
// - Texto sem corrente nenhuma fica fora, e é contado à parte.
// ============================================================

import { db } from './db.js';
import { textosDasEstatisticas } from './estatisticas-dados.js';
import {
    posturasDasCorrentes,
    programasDasCorrentes,
    ancestraisDaCorrente,
    caminhoDaCorrente,
} from './correntes-hierarquia.js';
import { POSTURAS_ESTETICAS, PROGRAMAS_MOVIMENTO, escaparAspasBusca } from './utils.js';

export const SEM_CLASSIFICACAO = 'Sem classificação';
const NAO_SE_APLICA = 'Não se aplica';

const CONFIG_ATRIBUTO = {
    postura: { prefixo: 'postura', valores: POSTURAS_ESTETICAS, doTexto: posturasDasCorrentes },
    programa: { prefixo: 'programa', valores: PROGRAMAS_MOVIMENTO, doTexto: programasDasCorrentes },
};

// Valores que entram nas barras e no cruzamento: os da lista, sem "Não se
// aplica", na ordem canônica da lista.
export function valoresDeAtributoDaCorrente(campo) {
    return CONFIG_ATRIBUTO[campo].valores.filter((v) => v !== NAO_SE_APLICA);
}

const aspas = escaparAspasBusca;

// Busca que abre exatamente os textos de uma barra (ver filtrarTextos).
export function consultaDoValorDaCorrente(campo, valor) {
    const { prefixo } = CONFIG_ATRIBUTO[campo];
    return valor === SEM_CLASSIFICACAO
        ? `movimento:* -${prefixo}:*`
        : `${prefixo}:"${aspas(valor)}"`;
}

// Busca da célula do cruzamento: texto com o Programa e com a Postura (em
// qualquer das correntes dele).
export function consultaDoCruzamentoDaCorrente(programa, postura) {
    return `${consultaDoValorDaCorrente('programa', programa)} ${consultaDoValorDaCorrente('postura', postura)}`;
}

function valoresDoTexto(campo, texto) {
    return CONFIG_ATRIBUTO[campo].doTexto(db.movimentosEscolas, texto.movimentosEscolasIds);
}

function temCorrente(texto) {
    const lista = db.movimentosEscolas || [];
    return (texto.movimentosEscolasIds || []).some((id) =>
        lista.some((m) => String(m.id) === String(id)),
    );
}

// Textos por valor de Postura ou Programa. `campo`: 'postura' | 'programa'.
// Devolve as barras (todos os valores da lista, mesmo com zero, e por último
// "Sem classificação"), as buscas de cada barra e o recorte do denominador:
// `denominador` = textos nas barras (cada um uma vez), `soNaoSeAplica` e
// `semCorrente` = textos de fora, `textos` = total do recorte.
export function agregarPorAtributoDaCorrente(campo, textos = textosDasEstatisticas()) {
    const valores = valoresDeAtributoDaCorrente(campo);
    const contagem = new Map(valores.map((v) => [v, 0]));
    let semClassificacao = 0;
    let soNaoSeAplica = 0;
    let semCorrente = 0;
    let denominador = 0;
    textos.forEach((t) => {
        if (!temCorrente(t)) {
            semCorrente++;
            return;
        }
        const doTexto = valoresDoTexto(campo, t);
        if (doTexto.length === 0) {
            semClassificacao++;
            denominador++;
            return;
        }
        const reais = doTexto.filter((v) => v !== NAO_SE_APLICA);
        if (reais.length === 0) {
            soNaoSeAplica++;
            return;
        }
        denominador++;
        reais.forEach((v) => contagem.set(v, contagem.get(v) + 1));
    });
    const labels = [...valores, SEM_CLASSIFICACAO];
    return {
        labels,
        data: [...valores.map((v) => contagem.get(v)), semClassificacao],
        consultas: labels.map((l) => consultaDoValorDaCorrente(campo, l)),
        denominador,
        soNaoSeAplica,
        semCorrente,
        textos: textos.length,
    };
}

// Cruzamento Programa × Postura: em cada célula, os textos que têm aquele
// Programa e aquela Postura (cada um em alguma das suas correntes, como na
// busca `programa:"X" postura:"Y"`). Um texto ligado a correntes de valores
// diferentes pode contar em mais de uma célula. Fora ficam "Não se aplica" e
// os sem valor.
export function cruzarProgramaPostura(textos = textosDasEstatisticas()) {
    const programas = valoresDeAtributoDaCorrente('programa');
    const posturas = valoresDeAtributoDaCorrente('postura');
    const indiceProg = new Map(programas.map((v, i) => [v, i]));
    const indicePost = new Map(posturas.map((v, i) => [v, i]));
    const valores = programas.map(() => posturas.map(() => 0));
    textos.forEach((t) => {
        const progs = valoresDoTexto('programa', t).filter((v) => indiceProg.has(v));
        const posts = valoresDoTexto('postura', t).filter((v) => indicePost.has(v));
        progs.forEach((pg) =>
            posts.forEach((ps) => {
                valores[indiceProg.get(pg)][indicePost.get(ps)]++;
            }),
        );
    });
    return {
        programas,
        posturas,
        valores,
        consultas: programas.map((pg) =>
            posturas.map((ps) => consultaDoCruzamentoDaCorrente(pg, ps)),
        ),
    };
}

// ─── Textos por corrente: modos Agrupado e Separado (F14-D9) ─────────────────
// Agrupado: cada barra é uma corrente de topo e soma o que foi marcado nela e
// em qualquer divisão dela (filho, neto...), mesmo que o pai não esteja
// marcado no texto. Um texto conta uma vez só por grupo, então a soma das
// barras pode passar do total se o texto está em grupos diferentes. Separado:
// uma barra por corrente (de topo ou divisão), cada uma só com os textos
// marcados diretamente nela. Barra com zero textos não aparece (o cadastro tem
// dezenas de correntes). Texto sem corrente cadastrada fica de fora e é
// contado à parte.
export const MODOS_CORRENTES = ['agrupado', 'separado'];

// O clique abre a lista pela busca por nome: `movimento:` é hierárquico (acha
// também as divisões) e `movimentodireto:` só o que foi ligado direto. Como a
// busca é por trecho do nome, um nome contido em outro ("Romantismo" em
// "Romantismo no Brasil") pode trazer textos a mais na lista do que na barra.
export function consultaDaCorrente(modo, nome) {
    const prefixo = modo === 'separado' ? 'movimentodireto' : 'movimento';
    return `${prefixo}:"${escaparAspasBusca(nome)}"`;
}

export function agregarTextosPorCorrente(modo = 'agrupado', textos = textosDasEstatisticas()) {
    const lista = db.movimentosEscolas || [];
    const porId = new Map(lista.map((m) => [String(m.id), m]));
    const contagem = new Map();
    let semCorrente = 0;
    textos.forEach((t) => {
        const ligadas = [...new Set((t.movimentosEscolasIds || []).map(String))].filter((id) =>
            porId.has(id),
        );
        if (ligadas.length === 0) {
            semCorrente++;
            return;
        }
        const alvos =
            modo === 'separado'
                ? ligadas
                : [
                      ...new Set(
                          ligadas.map((id) => {
                              const ancestrais = ancestraisDaCorrente(lista, id);
                              return String(
                                  (ancestrais[ancestrais.length - 1] || porId.get(id)).id,
                              );
                          }),
                      ),
                  ];
        alvos.forEach((id) => contagem.set(id, (contagem.get(id) || 0) + 1));
    });
    const barras = [...contagem.entries()]
        .map(([id, n]) => ({ id, nome: porId.get(id).nome, n }))
        .sort((a, b) => b.n - a.n || a.nome.localeCompare(b.nome, 'pt-BR'));
    const titulos = new Map();
    if (modo === 'separado') {
        barras.forEach((b) => {
            const caminho = caminhoDaCorrente(lista, b.id);
            if (caminho !== b.nome) titulos.set(b.nome, caminho);
        });
    }
    return {
        modo,
        labels: barras.map((b) => b.nome),
        data: barras.map((b) => b.n),
        consultas: barras.map((b) => consultaDaCorrente(modo, b.nome)),
        titulos,
        semCorrente,
        comCorrente: textos.length - semCorrente,
        textos: textos.length,
    };
}
