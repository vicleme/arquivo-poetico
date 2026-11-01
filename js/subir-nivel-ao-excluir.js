// ============================================================
// subir-nivel-ao-excluir.js: o que acontece com o conteúdo de uma Parte ou de
// uma Seção quando ela é excluída (Fase 21, entrega 4).
//
// Regra única: o que estava dentro do que foi excluído sobe um nível.
//   - Seção dentro de uma Parte: o conteúdo vai para a Parte.
//   - Seção ligada direto ao Livro: o conteúdo vai para o Livro.
//   - Parte: o conteúdo vai para o Livro da Parte.
// "Conteúdo" é tudo o que a fila do lugar mistura: Poemas, Prosas, Elementos e,
// no caso da Parte, Seções. Nada é excluído, só muda de pai.
//
// Posição: o conteúdo entra no fim da fila do novo pai, mantendo a ordem
// relativa que tinha. Quem estava sem posição (`null`) continua sem posição.
// A posição do próprio item excluído conta como ocupada, porque o
// `fecharEspaco` do db.js ainda vai fechar esse buraco depois: sem isso, o
// último filho cairia na mesma posição do penúltimo.
//
// Sem novo pai válido (Seção ou Parte órfã, sem pai que exista), o conteúdo
// perde o lugar e fica avulso, como já acontecia na T7.
//
// Fase 21 (21-3a): Poema e Prosa sobem POR APARIÇÃO. O texto que tem uma
// aparição no lugar excluído leva só essa aparição para o pai (as outras, em
// outros lugares, não mudam, e nenhuma é apagada em silêncio pelo `save()`).
// Se o texto já aparece no pai, as duas aparições se fundem: fica a que já
// estava lá (se ela não tinha posição e a que subiu tinha, ela passa a ter uma,
// no fim da fila). Sem pai que exista, a aparição sai. O resultado guarda a
// lista e o espelho de cada texto tocado, para o Desfazer devolver tudo.
//
// Lógica pura, sem DOM. O resultado de `subirConteudoDoLugar` tem o mesmo
// formato do Desfazer da T7 (`restaurarTextosDoLugar`), então a restauração é
// a mesma função.
// ============================================================

import {
    aparicoesDeFormatoAntigo,
    definirAparicoes,
    listaDeAparicoes,
    mesmoLugar,
} from './aparicoes-dado.js';
import { getIrmaosPorEscopo, seqOuNull } from './utils.js';

const TIPO_DO_PAI = { partes: 'parte', secoes: 'secao' };
const COLECOES_DO_CONTEUDO = ['secoes', 'elementos', 'poemas', 'prosas'];
const COLECOES_DE_TEXTO = ['poemas', 'prosas'];

const mesmoId = (a, b) => a != null && b != null && String(a) === String(b);

// A aparição está no lugar excluído? Lê os ids como estão gravados (o lugar já
// pode ter saído do `db`, então não dá para resolver o caminho). Seção: a
// aparição na Seção. Parte: a aparição direto na Parte, não a que está numa
// Seção dela (essa Seção é que sobe).
const aparicaoNoLugar = (col, id) => (a) =>
    col === 'secoes' ? mesmoId(a.secaoId, id) : mesmoId(a.parteId, id) && a.secaoId == null;

// Cópia do que o Desfazer precisa de um texto: a lista, o espelho e, se o
// texto antigo apontava para a Seção excluída só por `secaoId`, esse campo.
export function copiaDoTexto(itemCol, texto, tinhaLista = true) {
    const guardado = {
        itemCol,
        itemId: texto.id,
        lista:
            tinhaLista && Array.isArray(texto.aparicoes)
                ? texto.aparicoes.map((a) => ({ ...a }))
                : null,
        espelho: {
            paiTipo: texto.paiTipo ?? null,
            paiId: texto.paiId ?? null,
            sequencia: texto.sequencia ?? null,
            livrosIds: Array.isArray(texto.livrosIds) ? [...texto.livrosIds] : [],
        },
    };
    if (texto.secaoId !== undefined) guardado.secaoId = texto.secaoId;
    return guardado;
}

// Dá lista a quem ainda não tem (acervo que só tem o formato antigo), lendo
// com o lugar excluído de volta no `db`, porque o caminho precisa dele.
// Devolve os textos que não tinham, para o Desfazer saber.
export function garantirListasDeAparicoes(dbRef, col, itemExcluido) {
    const visao = itemExcluido ? { ...dbRef, [col]: [...(dbRef[col] || []), itemExcluido] } : dbRef;
    const sem = new Set();
    COLECOES_DE_TEXTO.forEach((itemCol) => {
        (dbRef[itemCol] || []).forEach((t) => {
            if (Array.isArray(t.aparicoes)) return;
            sem.add(t);
            t.aparicoes = aparicoesDeFormatoAntigo(visao, t);
        });
    });
    return sem;
}

export const colecaoSobeNivel = (col) => col in TIPO_DO_PAI;

const ROTULO_DO_TIPO = { livro: 'o Livro', parte: 'a Parte' };
const COLECAO_DO_TIPO = { livro: 'livros', parte: 'partes' };

// Quem é o novo pai, ou null quando não há pai que exista.
export function novoPaiDoLugar(dbRef, col, item) {
    if (!item || !colecaoSobeNivel(col)) return null;
    const paiTipo = col === 'partes' ? 'livro' : item.paiTipo;
    const paiId = col === 'partes' ? item.livroId : item.paiId;
    if (!COLECAO_DO_TIPO[paiTipo] || paiId === null || paiId === undefined || paiId === '') {
        return null;
    }
    const pai = (dbRef[COLECAO_DO_TIPO[paiTipo]] || []).find((x) => x.id == paiId);
    if (!pai) return null;
    return {
        paiTipo,
        paiId: pai.id,
        rotulo: `${ROTULO_DO_TIPO[paiTipo]} “${pai.titulo || `#${pai.id}`}”`,
    };
}

// O que está dentro do lugar excluído, na ordem em que sobe: pela posição, e
// em empate por Seção, Elemento, Poema e Prosa. Sem posição vai para o fim.
// Seção e Elemento entram pelo Destino deles; Poema e Prosa entram uma vez por
// aparição no lugar (`{ itemCol, item, aparicao }`), não pelo Destino do texto.
// Só quando a lista não tem a aparição e o espelho aponta para o lugar o texto
// entra sem `aparicao` e sobe pelo espelho.
export function conteudoDoLugar(dbRef, col, id) {
    const paiTipo = TIPO_DO_PAI[col];
    if (!paiTipo) return [];
    const dentro = (it) => it.paiTipo === paiTipo && it.paiId == id;
    const achados = COLECOES_DO_CONTEUDO.flatMap((itemCol) => {
        // Seção não contém Seção.
        if (itemCol === 'secoes' && col === 'secoes') return [];
        if (COLECOES_DE_TEXTO.includes(itemCol)) {
            return (dbRef[itemCol] || []).flatMap((item) => {
                const aparicao = listaDeAparicoes(dbRef, item).find(aparicaoNoLugar(col, id));
                if (aparicao) {
                    return [{ itemCol, item, aparicao, seq: seqOuNull(aparicao.sequencia) }];
                }
                // Sem aparição na lista, mas o espelho ainda aponta para o lugar
                // (dado quebrado, ou lista atrasada): sobe pelo espelho, como antes.
                // Prosa antiga ainda pode apontar para a Seção só por `secaoId`.
                const peloEspelho =
                    dentro(item) ||
                    (itemCol === 'prosas' && col === 'secoes' && item.secaoId == id);
                return peloEspelho ? [{ itemCol, item, seq: seqOuNull(item.sequencia) }] : [];
            });
        }
        return (dbRef[itemCol] || [])
            .filter(dentro)
            .map((item) => ({ itemCol, item, seq: seqOuNull(item.sequencia) }));
    });
    return achados
        .map((x, i) => ({ ...x, ordem: i }))
        .sort((a, b) => {
            if (a.seq === null && b.seq === null) return a.ordem - b.ordem;
            if (a.seq === null) return 1;
            if (b.seq === null) return -1;
            return a.seq - b.seq || a.ordem - b.ordem;
        })
        .map(({ itemCol, item, aparicao }) =>
            aparicao ? { itemCol, item, aparicao } : { itemCol, item },
        );
}

// Onde a aparição cairia no novo pai (o livro é o mesmo, só sobe um nível).
const lugarDeDestino = (a, novo) => ({
    livroId: a.livroId,
    parteId: novo.paiTipo === 'parte' ? novo.paiId : null,
    secaoId: null,
});

// Contagem e destino, para o aviso da confirmação. `item` é o próprio
// registro do lugar (ainda no db nesse momento). `fundem` conta os textos que
// já aparecem no novo pai: neles as duas aparições viram uma.
export function impactoSubidaDoLugar(dbRef, col, id) {
    const item = (dbRef[col] || []).find((x) => x.id == id);
    const conteudo = conteudoDoLugar(dbRef, col, id);
    const destino = novoPaiDoLugar(dbRef, col, item);
    const conta = (itemCol) => conteudo.filter((x) => x.itemCol === itemCol).length;
    const textos = conta('poemas') + conta('prosas');
    const fundem = destino
        ? conteudo.filter(
              (x) =>
                  x.aparicao &&
                  listaDeAparicoes(dbRef, x.item).some(
                      (o) => o !== x.aparicao && mesmoLugar(o, lugarDeDestino(x.aparicao, destino)),
                  ),
          ).length
        : 0;
    return {
        textos,
        secoes: conta('secoes'),
        elementos: conta('elementos'),
        total: conteudo.length,
        fundem,
        destino,
    };
}

// "2 textos e 1 seção subirão para a Parte “A”", ou '' sem conteúdo.
export function avisoDeSubida(impacto) {
    if (!impacto || impacto.total === 0) return '';
    const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
    const itens = [];
    if (impacto.textos > 0) itens.push(plural(impacto.textos, 'texto', 'textos'));
    if (impacto.secoes > 0) itens.push(plural(impacto.secoes, 'seção', 'seções'));
    if (impacto.elementos > 0) itens.push(plural(impacto.elementos, 'elemento', 'elementos'));
    const lista =
        itens.length > 1
            ? `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`
            : itens[0];
    const varios = impacto.total > 1;
    if (!impacto.destino) return `${lista} ${varios ? 'ficarão' : 'ficará'} sem lugar`;
    const base = `${lista} ${varios ? 'subirão' : 'subirá'} para ${impacto.destino.rotulo}`;
    const n = impacto.fundem || 0;
    if (n === 0) return base;
    return `${base} (${n === 1 ? '1 texto já está lá e as duas aparições se fundem' : `${n} textos já estão lá e as aparições se fundem`})`;
}

// Faz o conteúdo subir e devolve o que o Desfazer precisa. Chamada depois que
// o item excluído saiu do db (`itemExcluido` é o registro que saiu).
export function subirConteudoDoLugar(dbRef, col, id, itemExcluido) {
    const semLista = garantirListasDeAparicoes(dbRef, col, itemExcluido);
    const conteudo = conteudoDoLugar(dbRef, col, id);
    const novo = novoPaiDoLugar(dbRef, col, itemExcluido);
    // Só Seção e Elemento saem da fila do novo pai ao subir: o texto aparece
    // nela por aparição, e a que já estava lá conta como ocupada.
    const movem = new Set(conteudo.filter((x) => !x.aparicao).map((x) => x.item));

    let proxima = 1;
    if (novo) {
        const maiorDosOutros = getIrmaosPorEscopo(dbRef, novo.paiTipo, novo.paiId)
            .filter((it) => !movem.has(it) && it !== itemExcluido)
            .reduce((m, it) => Math.max(m, seqOuNull(it.sequencia) || 0), 0);
        const daqueleQueSai = seqOuNull(itemExcluido?.sequencia) || 0;
        proxima = Math.max(maiorDosOutros, daqueleQueSai) + 1;
    }

    const destinos = [];
    const aparicoes = [];
    const tocados = new Map();

    conteudo.forEach(({ itemCol, item, aparicao }) => {
        if (aparicao) {
            if (!tocados.has(item)) {
                tocados.set(item, itemCol);
                aparicoes.push(copiaDoTexto(itemCol, item, !semLista.has(item)));
            }
            const tinhaPosicao = seqOuNull(aparicao.sequencia) !== null;
            const lista = item.aparicoes;
            if (!novo) {
                lista.splice(lista.indexOf(aparicao), 1);
                return;
            }
            const alvo = lugarDeDestino(aparicao, novo);
            const existente = lista.find((o) => o !== aparicao && mesmoLugar(o, alvo));
            if (existente) {
                // Fusão: fica a aparição que já estava no pai.
                if (seqOuNull(existente.sequencia) === null && tinhaPosicao) {
                    existente.sequencia = proxima;
                    proxima += 1;
                }
                lista.splice(lista.indexOf(aparicao), 1);
                return;
            }
            aparicao.parteId = alvo.parteId;
            aparicao.secaoId = null;
            if (tinhaPosicao) {
                aparicao.sequencia = proxima;
                proxima += 1;
            } else {
                aparicao.sequencia = null;
            }
            return;
        }

        const guardado = {
            itemCol,
            itemId: item.id,
            paiTipo: item.paiTipo ?? null,
            paiId: item.paiId ?? null,
            sequencia: item.sequencia ?? null,
        };
        if (item.secaoId !== undefined) guardado.secaoId = item.secaoId;

        const tinhaPosicao = seqOuNull(item.sequencia) !== null;
        item.paiTipo = novo ? novo.paiTipo : null;
        item.paiId = novo ? novo.paiId : null;
        if (novo && tinhaPosicao) {
            item.sequencia = proxima;
            proxima += 1;
        } else {
            item.sequencia = null;
        }
        if (item.secaoId !== undefined) item.secaoId = null;
        destinos.push(guardado);
    });

    // Com todas as Seções e Elementos já no pai novo, cada texto tocado
    // confere o caminho da lista e recalcula o espelho.
    tocados.forEach((itemCol, texto) => {
        if (col === 'secoes' && texto.secaoId !== undefined && mesmoId(texto.secaoId, id)) {
            texto.secaoId = null;
        }
        definirAparicoes(dbRef, texto, texto.aparicoes);
    });

    return { destinos, livros: [], aparicoes };
}
