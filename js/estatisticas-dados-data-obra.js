// ============================================================
// estatisticas-dados-data-obra.js: Estatísticas da data da obra (T9, entrega
// 9a de 13: lógica e testes, sem tela). Sem DOM. Parte do corpus filtrado das
// Estatísticas (textosDasEstatisticas), nunca de todo o acervo.
//
// Fontes (`fonte`): 'obras' (Intertextualidade e Hipertextualidade),
// 'referencias' (Marco histórico, Notícia e Pessoa pública) ou 'todas'.
//
// Ponto de referência de uma entrada: o começo da data (`dataObra`), ou o fim
// quando só ele existe. O ano usado é o `de` da data (início do intervalo que
// o nível cobre); numa Pessoa pública isso é o nascimento. Data aproximada
// conta como a data dada.
//
// Regras de contagem:
// - Um texto conta uma vez em cada barra que alguma das suas entradas
//   alcança, então a soma das barras pode passar do total.
// - O denominador (`comEntradas`) são os textos com pelo menos uma entrada da
//   fonte; `semData` são os que têm entradas, mas nenhuma datada.
// - Cada barra traz `ids` (`{ tipo, id }` dos textos). A lista que a barra abre
//   vem da busca (`dataobra:`, `datareferencia:`, `distanciaobra:`,
//   `distanciareferencia:`, ver busca-data-obra.js), com a mesma regra.
//
// Obra pessoal (`modo`): a marca fica na ENTRADA de Intertextualidade e de
// Hipertextualidade (`obraPessoal: true`). `modo` escolhe quais entradas das
// Obras entram: 'todas' (padrão), 'sem' (só as sem a marca) ou 'so' (só as
// marcadas). As Referências não têm a marca e não mudam com o modo, a não ser
// em 'so' na fonte `todas`, onde ficam de fora (não há referência pessoal).
// Numa fonte só de Referências o modo não faz nada. A lista da barra usa os
// prefixos `dataobrapublica:`, `dataobrapessoal:` e os de distância, que olham a
// marca por entrada, como aqui.
// ============================================================

import { db } from './db.js';
import { textosDasEstatisticas } from './estatisticas-dados.js';
import {
    criarDataObra,
    formatarDataObra,
    anoDeReferenciaDaEntrada,
    distanciaEmAnos,
} from './data-da-obra.js';
import { anoDeEscritaDoTexto } from './utils.js';
import { ehObraPessoal } from './intertextualidade.js';
import { textoDoIntervaloDeAnos } from './busca-data-obra.js';
import { chaveDeOrigem, origensDaEntrada } from './origem-da-obra.js';

export const FONTES_DATA_OBRA = ['obras', 'referencias', 'todas'];

const CAMPOS_DA_FONTE = {
    obras: ['intertextualidade', 'hipertextualidade'],
    referencias: ['referenciasExternas'],
    todas: ['intertextualidade', 'hipertextualidade', 'referenciasExternas'],
};

// Filtro "Obra pessoal": todas as obras, só as sem a marca ou só as marcadas.
export const MODOS_OBRA_PESSOAL = ['todas', 'sem', 'so'];

const CAMPOS_DE_OBRA = ['intertextualidade', 'hipertextualidade'];

const tipoDoTexto = (t) => t.tipo || ((db.prosas || []).includes(t) ? 'prosa' : 'poema');

function entradasDoTexto(texto, fonte, modo = 'todas') {
    const campos = CAMPOS_DA_FONTE[fonte] || CAMPOS_DA_FONTE.todas;
    return campos.flatMap((c) => {
        const lista = Array.isArray(texto?.[c]) ? texto[c] : [];
        if (modo === 'todas') return lista;
        if (CAMPOS_DE_OBRA.includes(c)) {
            return lista.filter((e) => (modo === 'so' ? ehObraPessoal(e) : !ehObraPessoal(e)));
        }
        // Referência: não tem a marca. Fica em 'sem'; em 'so' não há nenhuma,
        // a não ser que a fonte seja só de Referências (o modo não vale ali).
        return modo === 'so' && fonte !== 'referencias' ? [] : lista;
    });
}

// Quantas entradas de Obras (Intertextualidade e Hipertextualidade) o recorte
// tem e quantas delas estão marcadas como obra pessoal. Alimenta o aviso do
// filtro. As Referências não entram na conta.
export function contarEntradasPessoais(textos = textosDasEstatisticas()) {
    let total = 0;
    let pessoais = 0;
    textos.forEach((texto) => {
        CAMPOS_DE_OBRA.forEach((c) => {
            (Array.isArray(texto?.[c]) ? texto[c] : []).forEach((e) => {
                total += 1;
                if (ehObraPessoal(e)) pessoais += 1;
            });
        });
    });
    return { total, pessoais };
}

// O ano de referência da entrada mora em data-da-obra.js (a busca `dataobra:`
// usa a mesma regra); fica reexportado aqui para quem já importava daqui.
export { anoDeReferenciaDaEntrada };

// ─── Século e década ─────────────────────────────────────────

// Século do ano com sinal: 1901 a 2000 = 20; -500 a -401 = -5 (séc. V a.C.).
export function seculoDoAno(ano) {
    return ano > 0 ? Math.ceil(ano / 100) : -Math.ceil(-ano / 100);
}

// Década do ano, como { n, aC }: 1920 a 1929 = { n: 1920 }; 439 a 430 a.C. =
// { n: 430, aC: true }. Os anos de 1 a 9 (e de 9 a 1 a.C.) ficam em n = 0.
export function decadaDoAno(ano) {
    return ano > 0
        ? { n: Math.floor(ano / 10) * 10, aC: false }
        : { n: Math.floor(-ano / 10) * 10, aC: true };
}

function rotuloDoSeculo(n) {
    const d = criarDataObra({ nivel: 'seculo', seculo: String(Math.abs(n)), aC: n < 0 }).data;
    return formatarDataObra(d);
}

function rotuloDaDecada({ n, aC }) {
    if (n === 0) return aC ? 'anos 9 a 1 a.C.' : 'anos 1 a 9';
    const d = criarDataObra({ nivel: 'decada', decada: String(n), aC }).data;
    return formatarDataObra(d);
}

// Textos com entradas da fonte, cada um com os anos de referência das suas
// entradas datadas.
function textosComAnos(textos, fonte, modo = 'todas') {
    return textos
        .map((texto) => {
            const entradas = entradasDoTexto(texto, fonte, modo);
            const anos = entradas.map(anoDeReferenciaDaEntrada).filter((a) => a !== null);
            return { texto, entradas: entradas.length, anos };
        })
        .filter((x) => x.entradas > 0);
}

function agrupar(base, chaveDoAno, rotuloDaChave, ordemDaChave) {
    const grupos = new Map();
    base.forEach(({ texto, anos }) => {
        const chaves = new Map();
        anos.forEach((a) => {
            const c = chaveDoAno(a);
            chaves.set(JSON.stringify(c), c);
        });
        chaves.forEach((c, k) => {
            if (!grupos.has(k)) {
                grupos.set(k, {
                    chave: c,
                    rotulo: rotuloDaChave(c),
                    ordem: ordemDaChave(c),
                    ids: [],
                });
            }
            grupos.get(k).ids.push({ tipo: tipoDoTexto(texto), id: texto.id });
        });
    });
    const itens = [...grupos.values()]
        .sort((a, b) => a.ordem - b.ordem)
        .map((g) => ({ ...g, textos: g.ids.length }));
    return {
        itens,
        comEntradas: base.length,
        comData: base.filter((x) => x.anos.length).length,
        semData: base.filter((x) => !x.anos.length).length,
    };
}

export function agregarTextosPorSeculo(
    fonte = 'todas',
    textos = textosDasEstatisticas(),
    modo = 'todas',
) {
    return agrupar(textosComAnos(textos, fonte, modo), seculoDoAno, rotuloDoSeculo, (n) => n);
}

export function agregarTextosPorDecada(
    fonte = 'todas',
    textos = textosDasEstatisticas(),
    modo = 'todas',
) {
    return agrupar(textosComAnos(textos, fonte, modo), decadaDoAno, rotuloDaDecada, (d) =>
        d.aC ? -d.n - 0.5 : d.n,
    );
}

// ─── Origem das obras ─────────────────────────────────────────

// De que lugares ou culturas vêm as obras citadas. Olha as entradas de
// Obras (Intertextualidade e Hipertextualidade) e segue a fonte e o filtro de
// obra pessoal como os outros gráficos da aba: só Obras têm origem, então a
// fonte "Referências" não tem barras e "Todas" vale como "Obras". O filtro
// escolhe quais entradas entram (todas, sem as pessoais ou só as pessoais); a
// lista que a barra abre usa `origem:`, `origempublica:` ou `origempessoal:`. Um texto
// conta uma vez em cada origem que alguma das suas entradas traz (a soma das
// barras pode passar do total), pela chave (sem acento nem caixa), com a
// primeira grafia vista no rótulo. `comEntradas` são os textos com alguma
// entrada de Obras, `semOrigem` os que têm entradas, mas nenhuma com origem.
export function agregarTextosPorOrigem(
    textos = textosDasEstatisticas(),
    fonte = 'obras',
    modo = 'todas',
) {
    const grupos = new Map();
    let comEntradas = 0;
    let comOrigem = 0;
    textos.forEach((texto) => {
        // Referências não têm origem: a fonte só de Referências fica sem entradas.
        const entradas = fonte === 'referencias' ? [] : entradasDoTexto(texto, 'obras', modo);
        if (!entradas.length) return;
        comEntradas += 1;
        const doTexto = new Map();
        entradas.flatMap(origensDaEntrada).forEach((nome) => {
            const chave = chaveDeOrigem(nome);
            if (!doTexto.has(chave)) doTexto.set(chave, nome);
        });
        if (doTexto.size) comOrigem += 1;
        doTexto.forEach((nome, chave) => {
            if (!grupos.has(chave)) grupos.set(chave, { chave, rotulo: nome, ids: [] });
            grupos.get(chave).ids.push({ tipo: tipoDoTexto(texto), id: texto.id });
        });
    });
    const itens = [...grupos.values()]
        .map((g) => ({ ...g, textos: g.ids.length }))
        .sort((a, b) => b.textos - a.textos || a.rotulo.localeCompare(b.rotulo, 'pt-BR'));
    return { itens, comEntradas, comOrigem, semOrigem: comEntradas - comOrigem };
}

// ─── Distância temporal entre obra e texto ────────────────────────

// Faixas da distância em anos (ano do texto menos ano da obra). Elas não são
// fixas: saem do intervalo que o recorte realmente cobre, para o gráfico ter
// granularidade onde os textos estão (se tudo cai entre 10 e 49 anos, as barras
// dividem esse trecho, e não um balde só). A obra datada DEPOIS do texto (anos
// negativos) fica numa barra própria, "Depois do texto" (pode ser engano de
// data). As demais faixas têm largura igual (o passo), alinhada a múltiplos do
// passo, vão do trecho do menor ao do maior valor e incluem as vazias do meio.
export const PASSOS_DISTANCIA = [
    1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000,
];
export const MAXIMO_FAIXAS_DISTANCIA = 12;

const FAIXA_DEPOIS = { chave: 'depois', rotulo: 'Depois do texto', min: -Infinity, max: -1 };

const rotuloDaFaixa = (min, max) =>
    min === max ? `${min} ${min === 1 ? 'ano' : 'anos'}` : `${min} a ${max} anos`;

// O menor passo que cobre de `menor` a `maior` (anos, >= 0) em até
// MAXIMO_FAIXAS_DISTANCIA faixas.
export function passoDaDistancia(menor, maior) {
    const passo = PASSOS_DISTANCIA.find(
        (p) => Math.floor(maior / p) - Math.floor(menor / p) + 1 <= MAXIMO_FAIXAS_DISTANCIA,
    );
    return passo ?? PASSOS_DISTANCIA[PASSOS_DISTANCIA.length - 1];
}

// As faixas para as distâncias dadas (em anos, positivas ou negativas):
// `{ passo, faixas }`, com `passo` null quando nenhuma distância é >= 0.
export function faixasDaDistancia(anos) {
    const faixas = [];
    const depois = anos.some((a) => a < 0);
    if (depois) faixas.push(FAIXA_DEPOIS);
    const naoNegativas = anos.filter((a) => a >= 0);
    if (!naoNegativas.length) return { passo: null, faixas };
    const menor = Math.min(...naoNegativas);
    const maior = Math.max(...naoNegativas);
    const passo = passoDaDistancia(menor, maior);
    for (let min = Math.floor(menor / passo) * passo; min <= maior; min += passo) {
        const max = min + passo - 1;
        faixas.push({ chave: `${min}-${max}`, rotulo: rotuloDaFaixa(min, max), min, max });
    }
    return { passo, faixas };
}

// O ano de escrita do texto (`dataEscrita.ano`, com o espelho legado `ano`),
// ou null. A função mora em utils.js, junto da busca `distanciaobra:`.
export const anoDoTexto = anoDeEscritaDoTexto;

// Uma linha por entrada datada de texto com ano de escrita:
// `{ tipo, id, anos }`. `entradasSemAnoDoTexto` conta as datadas cujo texto
// não tem ano de escrita (ficam fora das barras).
export function distanciasDaObra(
    fonte = 'todas',
    textos = textosDasEstatisticas(),
    modo = 'todas',
) {
    const linhas = [];
    let entradasSemAnoDoTexto = 0;
    let textosComEntradas = 0;
    textos.forEach((texto) => {
        const entradas = entradasDoTexto(texto, fonte, modo);
        if (!entradas.length) return;
        textosComEntradas += 1;
        const anoTexto = anoDoTexto(texto);
        entradas.forEach((e) => {
            const anoObra = anoDeReferenciaDaEntrada(e);
            if (anoObra === null) return;
            if (anoTexto === null) {
                entradasSemAnoDoTexto += 1;
                return;
            }
            const anos = distanciaEmAnos(anoTexto, anoObra);
            linhas.push({ tipo: tipoDoTexto(texto), id: texto.id, anos });
        });
    });
    return { linhas, entradasSemAnoDoTexto, textosComEntradas };
}

// `recorte` (opcional, `{ min, max }` em anos): o zoom do gráfico. Só as entradas
// dessa faixa entram, e as faixas das barras são recalculadas para ela (o passo
// é o menor que cobre do menor ao maior valor que sobrou, em até 12 barras).
export function agregarDistanciaDaObra(
    fonte = 'todas',
    textos = textosDasEstatisticas(),
    modo = 'todas',
    recorte = null,
) {
    const todas = distanciasDaObra(fonte, textos, modo);
    const { entradasSemAnoDoTexto, textosComEntradas } = todas;
    const linhas = recorte
        ? todas.linhas.filter((l) => l.anos >= recorte.min && l.anos <= recorte.max)
        : todas.linhas;
    const { passo, faixas } = faixasDaDistancia(linhas.map((l) => l.anos));
    const itens = faixas.map((f) => {
        const doGrupo = linhas.filter((l) => l.anos >= f.min && l.anos <= f.max);
        const vistos = new Map(
            doGrupo.map((l) => [`${l.tipo}:${l.id}`, { tipo: l.tipo, id: l.id }]),
        );
        return {
            chave: f.chave,
            rotulo: f.rotulo,
            min: f.min,
            max: f.max,
            entradas: doGrupo.length,
            textos: vistos.size,
            ids: [...vistos.values()],
        };
    });
    const positivas = linhas.map((l) => l.anos).filter((a) => a >= 0);
    return {
        itens,
        passo,
        recorte: recorte ? { min: recorte.min, max: recorte.max } : null,
        menor: positivas.length ? Math.min(...positivas) : null,
        maior: positivas.length ? Math.max(...positivas) : null,
        entradasComDistancia: linhas.length,
        entradasSemAnoDoTexto,
        textosComEntradas,
    };
}

// A faixa de uma barra pode virar zoom quando cobre mais de um ano e tem anos
// (a barra "Depois do texto" e as de um ano só não dão zoom).
export function faixaPermiteZoom(faixa) {
    return (
        !!faixa && Number.isFinite(faixa.min) && Number.isFinite(faixa.max) && faixa.max > faixa.min
    );
}

// ─── Da barra para a busca ───────────────────────────────────
// A lista que uma barra abre é a busca com a mesma regra que a contou (ver
// busca-data-obra.js). Cada função devolve a consulta pronta para a caixa de
// busca; na fonte `todas`, as duas buscas (obras e referências) juntas, com `ou`.

// Anos que cobre o século (com sinal, sem ano zero): séc. XX = 1901 a 2000;
// séc. V a.C. (n = -5) = -500 a -401.
export function intervaloDoSeculo(n) {
    return n > 0 ? { de: (n - 1) * 100 + 1, ate: n * 100 } : { de: n * 100, ate: n * 100 + 99 };
}

// Anos que cobre a década de `decadaDoAno`: { n: 1920 } = 1920 a 1929; os anos
// de 1 a 9 ({ n: 0 }) = 1 a 9; { n: 430, aC: true } = -439 a -430; { n: 0,
// aC: true } = -9 a -1.
export function intervaloDaDecada({ n, aC }) {
    if (!aC) return n === 0 ? { de: 1, ate: 9 } : { de: n, ate: n + 9 };
    return n === 0 ? { de: -9, ate: -1 } : { de: -(n + 9), ate: -n };
}

// Prefixos de cada fonte: [data, distância]. As Obras têm uma variante por modo
// do filtro "Obra pessoal"; as Referências, não.
const PREFIXOS_DE_OBRA = {
    todas: ['dataobra', 'distanciaobra'],
    sem: ['dataobrapublica', 'distanciaobrapublica'],
    so: ['dataobrapessoal', 'distanciaobrapessoal'],
};
const PREFIXOS_DE_REFERENCIA = ['datareferencia', 'distanciareferencia'];

function consultaPorFonte(fonte, indice, valor, modo = 'todas') {
    const obra = `${(PREFIXOS_DE_OBRA[modo] || PREFIXOS_DE_OBRA.todas)[indice]}:${valor}`;
    const referencia = `${PREFIXOS_DE_REFERENCIA[indice]}:${valor}`;
    if (fonte === 'referencias') return referencia;
    if (fonte === 'todas') {
        // Em 'so' não há referência pessoal: só a busca das Obras.
        return modo === 'so' ? obra : `${obra} ou ${referencia}`;
    }
    return obra;
}

// Consulta da barra de século ou de década: `{ de, ate }` do intervalo de anos.
export function consultaDeDataDaBarra(fonte, { de, ate }, modo = 'todas') {
    return consultaPorFonte(fonte, 0, textoDoIntervaloDeAnos(de, ate), modo);
}

// Consulta da barra de distância: a faixa da barra (`min` e `max`; a de "Depois
// do texto" tem -Infinity na ponta).
export function consultaDeDistanciaDaFaixa(fonte, faixa, modo = 'todas') {
    return consultaPorFonte(fonte, 1, textoDoIntervaloDeAnos(faixa.min, faixa.max), modo);
}
