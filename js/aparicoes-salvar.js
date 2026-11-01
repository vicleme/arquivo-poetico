// ============================================================
// aparicoes-salvar.js: a função única que grava as linhas do modal "Onde
// aparece" e renumera cada fila de posição (Fase 21, etapa 21-2, entrega 1).
// Só lógica pura, sem DOM e sem importar o `db`: os dados vêm por `dbRef`.
//
// Cada linha do modal é { livroId, parteId, secaoId, sequencia, modo }:
//   - `parteId` e `secaoId` são o lugar dentro do livro (a Seção manda mais que
//     a Parte, e a Parte mais que o Livro), ou null;
//   - `modo` diz como ler a posição: 'especifica' (o `sequencia` digitado; o
//     padrão), 'fim' (no fim da fila do lugar) ou 'nenhuma' (sem posição).
// Coletânea não entra aqui: ela continua em `itensColetanea` (F21-D3), e uma
// linha de Coletânea é ignorada.
//
// O que a função faz, nesta ordem:
//   1. lê as linhas (lugar conferido, posição do modo, lugar repetido vira um);
//   2. grava a lista e recalcula o espelho (`definirAparicoes`);
//   3. para cada lugar que o texto tinha ou passa a ter, acerta a fila daquele
//      lugar: posição nova empurra quem estava na frente, posição que mudou
//      desloca só quem estava no meio, posição que saiu fecha o buraco. A fila
//      mistura Seções, Elementos, Poemas, Prosas (e Partes, no topo do livro),
//      e inclui as aparições dos outros textos (ver `getIrmaosPorEscopo`);
//   4. reconcilia a lista dos outros textos que a renumeração mexeu, porque os
//      que têm o lugar como Destino guardam a posição no espelho.
// Nada é gravado em disco: quem chama faz o `save()`.
// ============================================================

import {
    aparicoesDeFormatoAntigo,
    definirAparicoes,
    escopoDoLugar,
    normalizarAparicoes,
    reconciliarAparicoesDoTexto,
    mesmoLugar,
    temLugar,
} from './aparicoes-dado.js';
import {
    abrirEspaco,
    fecharEspaco,
    getIrmaosPorEscopo,
    proximaPosicaoDoLugar,
    reordenarPosicao,
    seqOuNull,
} from './utils.js';

const COLECOES_DE_TEXTO = ['poemas', 'prosas'];
const MODOS = ['especifica', 'fim', 'nenhuma'];

const mesmoId = (a, b) => a != null && b != null && String(a) === String(b);

// A fila do lugar sem o texto em edição (nem as entradas dele).
function filaDoLugarSemOTexto(dbRef, item, paiTipo, paiId) {
    return getIrmaosPorEscopo(dbRef, paiTipo, paiId).filter(
        (it) => it !== item && it._texto !== item,
    );
}

// Posição "no fim da fila": a próxima livre, ou, se o texto já tem posição
// neste lugar, a dele quando ele já é o último, senão o maior dos OUTROS (o
// `reordenarPosicao` fecha o buraco que ele deixa). Mesma regra de
// `posicaoNoFimDaFila`, mas olhando a aparição e não o Destino.
function posicaoNoFim(dbRef, item, lugar, antiga) {
    const [paiTipo, paiId] = escopoDoLugar(lugar);
    const proxima = proximaPosicaoDoLugar(dbRef, paiTipo, paiId, item);
    if (antiga == null) return proxima;
    const maiorDosOutros = proxima - 1;
    return Math.max(antiga > maiorDosOutros ? antiga : maiorDosOutros, 1);
}

// A posição do modo "no fim da fila" de um lugar para o texto `item` (null para
// um texto novo): a que ele teria se fosse salvo agora. O modal a usa na dica
// e ao trocar para "posição específica".
export function posicaoNoFimDoLugar(dbRef, item, lugar) {
    const aparicoes = Array.isArray(item?.aparicoes) ? item.aparicoes : [];
    const anterior = aparicoes.find((a) => mesmoLugar(a, lugar));
    const antiga = anterior && temLugar(anterior) ? seqOuNull(anterior.sequencia) : null;
    return posicaoNoFim(dbRef, item || null, lugar, antiga);
}

// Lê as linhas do modal e devolve a lista de aparições já com a posição
// resolvida (mesmo lugar duas vezes: vale a primeira). `antes` é a lista que o
// texto tinha, para o modo 'fim' saber a posição de onde ele vem.
function lerLinhas(dbRef, item, linhas, antes) {
    const brutas = (Array.isArray(linhas) ? linhas : []).map((linha) => {
        const base = {
            livroId: linha?.livroId ?? null,
            parteId: linha?.parteId ?? null,
            secaoId: linha?.secaoId ?? null,
            sequencia: null,
        };
        const modo = MODOS.includes(linha?.modo) ? linha.modo : 'especifica';
        return { base, modo, digitada: seqOuNull(linha?.sequencia) };
    });
    // `normalizarAparicoes` confere o caminho, tira livro que não existe e
    // Coletânea; passa pelo mesmo filtro para saber o lugar de cada linha.
    const lugares = brutas.map((b) => normalizarAparicoes(dbRef, [b.base])[0] || null);
    const saida = [];
    brutas.forEach((b, i) => {
        const lugar = lugares[i];
        if (!lugar) return;
        if (saida.some((x) => mesmoLugar(x, lugar))) return;
        const anterior = antes.find((a) => mesmoLugar(a, lugar));
        let sequencia = null;
        if (b.modo === 'especifica') sequencia = b.digitada;
        else if (b.modo === 'fim')
            sequencia = posicaoNoFim(dbRef, item, lugar, anterior?.sequencia ?? null);
        saida.push({ ...lugar, sequencia });
    });
    return saida;
}

// Grava as linhas do modal no texto e renumera as filas. Devolve
// `{ aparicoes, antes, filas }`: a lista gravada, uma cópia da que o texto tinha
// e quantas filas foram acertadas.
export function salvarAparicoesDoTexto(dbRef, item, linhas) {
    const antes = (
        Array.isArray(item.aparicoes) ? item.aparicoes : aparicoesDeFormatoAntigo(dbRef, item)
    ).map((a) => ({ ...a }));
    const novas = lerLinhas(dbRef, item, linhas, antes);

    // Posição por lugar de antes, para saber se a mudança é inserir, mover ou fechar.
    const gravada = definirAparicoes(dbRef, item, novas);

    const escopos = new Map();
    const marcar = (a) => {
        const [tipo, id] = escopoDoLugar(a);
        escopos.set(`${tipo}:${id}`, { tipo, id, lugar: a });
    };
    antes.forEach(marcar);
    gravada.forEach(marcar);

    const tocados = new Set();
    let filas = 0;
    escopos.forEach(({ tipo, id, lugar }) => {
        const velha = antes.find((a) => mesmoLugar(a, lugar));
        const nova = gravada.find((a) => mesmoLugar(a, lugar));
        const posAntiga = velha && temLugar(velha) ? seqOuNull(velha.sequencia) : null;
        const posNova = nova ? seqOuNull(nova.sequencia) : null;
        if (posAntiga === posNova) return;
        const outros = filaDoLugarSemOTexto(dbRef, item, tipo, id);
        if (posNova == null) {
            fecharEspaco(outros, posAntiga);
        } else {
            // `reordenarPosicao` mexe na posição do item que recebe; a aparição
            // já vale `posNova`, então o auxiliar só carrega o valor.
            const auxiliar = { id: `auxiliar:${tipo}:${id}`, sequencia: posNova };
            reordenarPosicao([...outros, auxiliar], auxiliar, posNova, posAntiga);
        }
        filas++;
        outros.forEach((it) => tocados.add(it._texto || it));
    });

    // Os outros textos que têm o lugar como Destino guardam a posição no
    // espelho: a lista deles acompanha.
    COLECOES_DE_TEXTO.forEach((col) => {
        (dbRef[col] || []).forEach((t) => {
            if (t !== item && tocados.has(t)) reconciliarAparicoesDoTexto(dbRef, t);
        });
    });

    return { aparicoes: item.aparicoes, antes, filas };
}

// Para o Desfazer da exclusão de um texto (db.js): fecha o buraco que cada
// aparição dele (menos o Destino, que o `db.js` já fecha) deixa na fila do
// lugar, e devolve o que precisa para reabrir. O texto já saiu do `db`.
export function fecharFilasDasAparicoes(dbRef, item) {
    const fechadas = [];
    if (!item || !Array.isArray(item.aparicoes)) return fechadas;
    item.aparicoes.forEach((a) => {
        if (!temLugar(a)) return;
        const posicao = seqOuNull(a.sequencia);
        if (posicao == null) return;
        const [paiTipo, paiId] = escopoDoLugar(a);
        if (item.paiTipo === paiTipo && mesmoId(item.paiId, paiId)) return;
        fecharEspaco(getIrmaosPorEscopo(dbRef, paiTipo, paiId), posicao);
        fechadas.push({ paiTipo, paiId, posicao });
    });
    return fechadas;
}

export function reabrirFilasDasAparicoes(dbRef, fechadas) {
    [...(fechadas || [])].reverse().forEach(({ paiTipo, paiId, posicao }) => {
        abrirEspaco(getIrmaosPorEscopo(dbRef, paiTipo, paiId), posicao);
    });
}
