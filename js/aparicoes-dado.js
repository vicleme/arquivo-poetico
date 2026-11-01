// ============================================================
// aparicoes-dado.js: o formato novo `aparicoes` do Poema e da Prosa (Fase 21,
// etapa 21-1b-1). Só lógica pura, sem DOM e sem importar o `db`: os dados vêm
// por parâmetro (`dbRef`), como em `aparicoes-do-texto.js`. A 21-1b-2 liga ao
// app em entregas: a 1 roda a migração no carregamento e no `importarDB`
// (`sincronizarAparicoesComCamposAntigos`); a lista ainda não é lida por tela.
//
// O texto passa a guardar:
//   aparicoes: [{ livroId, parteId, secaoId, sequencia }]
//   - só livros comuns: Coletânea continua em `itensColetanea` (F21-D3);
//   - `parteId` e `secaoId` são o caminho dentro do livro, ou null;
//   - `sequencia` é a posição entre os irmãos do lugar, ou null (sem posição).
// O lugar de uma aparição é a Seção, se houver; senão a Parte; senão o Livro.
// Duas aparições do mesmo lugar são uma só.
//
// O espelho (F21-D11): `paiTipo`, `paiId`, `sequencia` e `livrosIds` seguem
// existindo no texto, calculados da lista por `espelhoDasAparicoes`, para as
// telas que ainda leem o formato antigo. O Destino do espelho é a primeira
// aparição com lugar; `livrosIds` recebe os outros livros. O espelho perde o
// que o formato antigo não sabe dizer (uma segunda aparição com posição, ou
// duas no mesmo livro): a lista é a verdade, o espelho é só cópia.
//
// Único ponto de escrita: `definirAparicoes`, `adicionarAparicao`,
// `removerAparicao` e `moverAparicao`. Quem grava só o espelho deixa a lista
// velha; `espelhoDesatualizado` serve para os testes pegarem isso.
//
// 21-2, entrega 1: a lista é a verdade. As telas antigas ainda gravam só o
// espelho, então o `save()` chama `reconciliarAparicoesDoTexto`, que descobre
// o que a tela antiga mudou (comparando o espelho com o que a lista diria) e
// aplica só essa diferença na lista. Nada que a lista tem e o espelho não
// sabe dizer (uma segunda aparição com posição) se perde. As filas de posição
// enxergam as aparições que o espelho não mostra (`entradasDeFilaPorAparicao`).
// ============================================================

import { aparicoesDoTexto, caminhoDoDestino } from './aparicoes-do-texto.js';

const mesmoId = (a, b) => a != null && b != null && String(a) === String(b);
const igualOuNulo = (a, b) => (a == null && b == null) || mesmoId(a, b);
const lista = (dbRef, nome) => (Array.isArray(dbRef?.[nome]) ? dbRef[nome] : []);

const seqOuNull = (v) => {
    const n = parseInt(v);
    return Number.isNaN(n) ? null : n;
};

const COLECOES_DE_TEXTO = ['poemas', 'prosas'];

// ─── Lugar ─────────────────────────────────────────────────────

// A aparição tem lugar quando está numa Parte ou Seção, ou tem posição. Sem
// isso o texto só "consta" no livro (F21-D5).
export const temLugar = (a) =>
    !!a && (a.parteId != null || a.secaoId != null || a.sequencia != null);

export const mesmoLugar = (a, b) =>
    !!a &&
    !!b &&
    mesmoId(a.livroId, b.livroId) &&
    igualOuNulo(a.parteId, b.parteId) &&
    igualOuNulo(a.secaoId, b.secaoId);

// Caminho completo de um lugar, derivado do que existe: a Seção manda mais que
// a Parte, e a Parte mais que o Livro. Lugar que aponta para algo que não
// existe devolve null.
function resolverLugar(dbRef, a) {
    const secaoId = a.secaoId ?? null;
    const parteId = a.parteId ?? null;
    if (secaoId != null) {
        const secao = lista(dbRef, 'secoes').find((s) => mesmoId(s.id, secaoId));
        if (!secao) return null;
        if (secao.paiTipo === 'parte') {
            const parte = lista(dbRef, 'partes').find((p) => mesmoId(p.id, secao.paiId));
            return parte ? { livroId: parte.livroId, parteId: parte.id, secaoId: secao.id } : null;
        }
        if (secao.paiTipo === 'livro') {
            return { livroId: secao.paiId, parteId: null, secaoId: secao.id };
        }
        return null;
    }
    if (parteId != null) {
        const parte = lista(dbRef, 'partes').find((p) => mesmoId(p.id, parteId));
        return parte ? { livroId: parte.livroId, parteId: parte.id, secaoId: null } : null;
    }
    return a.livroId == null ? null : { livroId: a.livroId, parteId: null, secaoId: null };
}

// ─── Normalização ──────────────────────────────────────────────

// Devolve a lista limpa: caminho conferido, sequência inteira ou null, sem
// Coletânea, sem livro que não existe, sem repetir lugar (a primeira fica; se
// ela não tem posição, herda a da repetida) e sem "só consta" num livro onde o
// texto já tem lugar.
export function normalizarAparicoes(dbRef, entrada) {
    const livros = lista(dbRef, 'livros');
    const verifica = Array.isArray(dbRef?.livros);
    const saida = [];
    for (const bruta of Array.isArray(entrada) ? entrada : []) {
        if (!bruta || typeof bruta !== 'object') continue;
        const lugar = resolverLugar(dbRef, bruta);
        if (!lugar || lugar.livroId == null) continue;
        const livro = livros.find((l) => mesmoId(l.id, lugar.livroId));
        if (verifica && !livro) continue;
        if (livro?.tipo === 'Coletânea') continue;
        const ap = { ...lugar, sequencia: seqOuNull(bruta.sequencia) };
        const repetida = saida.find((x) => mesmoLugar(x, ap));
        if (repetida) {
            if (repetida.sequencia == null) repetida.sequencia = ap.sequencia;
            continue;
        }
        saida.push(ap);
    }
    return saida.filter(
        (a) =>
            temLugar(a) ||
            !saida.some((b) => b !== a && temLugar(b) && mesmoId(b.livroId, a.livroId)),
    );
}

// ─── Migração do formato antigo ────────────────────────────────

// O que o formato antigo (Destino e `livrosIds`) diz, na forma nova. Usa o
// mesmo leitor da 21-1a, então o que a tela mostra hoje é o que a lista guarda.
export function aparicoesDeFormatoAntigo(dbRef, item) {
    const lidas = aparicoesDoTexto(dbRef, null, item).filter((a) => a.origem !== 'coletanea');
    return normalizarAparicoes(
        dbRef,
        lidas.map((a) => ({
            livroId: a.livroId,
            parteId: a.parteId,
            secaoId: a.secaoId,
            sequencia: a.sequencia,
        })),
    );
}

// A lista do texto: a nova, se ele já tem; senão a lida do formato antigo.
export function listaDeAparicoes(dbRef, item) {
    if (!item) return [];
    return Array.isArray(item.aparicoes) ? item.aparicoes : aparicoesDeFormatoAntigo(dbRef, item);
}

// Acrescenta `aparicoes` a cada Poema e Prosa que ainda não tem. Idempotente
// (quem já tem a lista não é tocado) e NÃO mexe no espelho (F21-D15): os
// campos antigos ficam como estão até a primeira gravação do texto.
export function migrarAparicoesDosTextos(dbRef) {
    let migrados = 0;
    COLECOES_DE_TEXTO.forEach((col) => {
        lista(dbRef, col).forEach((item) => {
            if (!item || Array.isArray(item.aparicoes)) return;
            item.aparicoes = aparicoesDeFormatoAntigo(dbRef, item);
            migrados++;
        });
    });
    return { migrados };
}

// Quantos textos ainda não têm a lista (os que a migração vai preencher).
export function contarTextosSemAparicoes(dbRef) {
    let n = 0;
    COLECOES_DE_TEXTO.forEach((col) => {
        lista(dbRef, col).forEach((item) => {
            if (item && !Array.isArray(item.aparicoes)) n++;
        });
    });
    return n;
}

// ─── Reconciliação (a lista é a verdade) ───────────────────────

const idsDe = (v) => (Array.isArray(v) ? v.filter((x) => x != null) : []);

// O Destino de um objeto com `paiTipo`, `paiId` e `sequencia` (o texto, ou o
// espelho da lista) na forma de aparição, ou null. Não confere se o Livro existe.
function destinoDosCampos(dbRef, campos) {
    const c = caminhoDoDestino(campos, dbRef);
    if (!c || c.livroId == null) return null;
    return {
        livroId: c.livroId,
        parteId: c.parteId ?? null,
        secaoId: c.secaoId ?? null,
        sequencia: seqOuNull(campos.sequencia),
    };
}

const mesmoDestino = (a, b) =>
    (!a && !b) || (!!a && !!b && mesmoLugar(a, b) && a.sequencia === b.sequencia);

// Leva a lista do texto ao que as telas antigas gravaram, aplicando só a
// DIFERENÇA entre o espelho do texto e o espelho que a lista produziria:
//   - Destino mudou de lugar ou de posição: a aparição que o espelho mostrava
//     é trocada no mesmo ponto da lista (ou sai, se o Destino foi limpo);
//   - Destino novo sem aparição anterior: entra (no lugar do "só consta" do
//     mesmo livro, se houver);
//   - livro saiu de `livrosIds`: saem as aparições dele (menos a do Destino);
//   - livro entrou em `livrosIds` sem aparição: entra como "só consta".
// Sem diferença, a lista fica como está (inclusive o que o espelho não vê).
// Texto sem lista ganha a lida do formato antigo. No fim a lista é limpa
// (`normalizarAparicoes`). Não mexe no espelho (F21-D15). Idempotente.
// Devolve 'migrado', 'atualizado' ou 'igual'.
export function reconciliarAparicoesDoTexto(dbRef, item) {
    if (!item) return 'igual';
    if (!Array.isArray(item.aparicoes)) {
        item.aparicoes = aparicoesDeFormatoAntigo(dbRef, item);
        return 'migrado';
    }
    const antes = JSON.stringify(item.aparicoes);
    const esperado = espelhoDasAparicoes(item.aparicoes);
    const discorda =
        JSON.stringify(aparicoesDeFormatoAntigo(dbRef, item)) !==
        JSON.stringify(aparicoesDeFormatoAntigo(dbRef, esperado));
    let nova = item.aparicoes.map((a) => ({ ...a }));

    if (discorda) {
        const dEsp = destinoDosCampos(dbRef, esperado);
        const dItem = destinoDosCampos(dbRef, item);
        let alvo = null;
        if (!mesmoDestino(dEsp, dItem)) {
            const idx = dEsp ? nova.findIndex((a) => mesmoLugar(a, dEsp)) : -1;
            if (idx >= 0) {
                if (dItem) {
                    alvo = { ...dItem };
                    nova[idx] = alvo;
                } else {
                    nova.splice(idx, 1);
                }
            } else if (dItem) {
                alvo = { ...dItem };
                const iConsta = nova.findIndex(
                    (a) => !temLugar(a) && mesmoId(a.livroId, dItem.livroId),
                );
                if (iConsta >= 0) nova[iConsta] = alvo;
                else nova.push(alvo);
            }
            // O Destino que a tela acabou de gravar vale mais que uma aparição
            // antiga do mesmo lugar (a posição que ela tinha é a de antes).
            if (alvo) nova = nova.filter((a) => a === alvo || !mesmoLugar(a, alvo));
        }
        const emItem = idsDe(item.livrosIds);
        const emEsp = idsDe(esperado.livrosIds);
        const tem = (lista, id) => lista.some((x) => mesmoId(x, id));
        emEsp
            .filter((id) => !tem(emItem, id))
            .forEach((id) => {
                nova = nova.filter((a) => !mesmoId(a.livroId, id) || (alvo && mesmoLugar(a, alvo)));
            });
        emItem
            .filter((id) => !tem(emEsp, id))
            .forEach((id) => {
                if (nova.some((a) => mesmoId(a.livroId, id))) return;
                nova.push({ livroId: id, parteId: null, secaoId: null, sequencia: null });
            });
    }

    item.aparicoes = normalizarAparicoes(dbRef, nova);
    return JSON.stringify(item.aparicoes) === antes ? 'igual' : 'atualizado';
}

// Roda a reconciliação em todo Poema e Prosa. É o que o `save()` e o
// carregamento chamam. Devolve `{ migrados, atualizados }`.
export function sincronizarAparicoesComCamposAntigos(dbRef) {
    let migrados = 0;
    let atualizados = 0;
    COLECOES_DE_TEXTO.forEach((col) => {
        lista(dbRef, col).forEach((item) => {
            const r = reconciliarAparicoesDoTexto(dbRef, item);
            if (r === 'migrado') migrados++;
            else if (r === 'atualizado') atualizados++;
        });
    });
    return { migrados, atualizados };
}

// ─── Filas de posição ──────────────────────────────────────────

// O escopo de fila de uma aparição: [paiTipo, paiId] do lugar mais fundo.
export function escopoDoLugar(a) {
    if (a.secaoId != null) return ['secao', a.secaoId];
    if (a.parteId != null) return ['parte', a.parteId];
    return ['livro', a.livroId];
}

// As filas de Livro, Parte e Seção (`getIrmaosPorEscopo`) são feitas de objetos
// com `sequencia`. O texto entra na fila pelo Destino do espelho; as outras
// aparições dele (com lugar) não apareciam. Esta função devolve uma entrada
// para cada uma delas no escopo pedido: um objeto cujo `sequencia` lê e grava
// a própria aparição, para `reordenarPosicao`, `fecharEspaco` e `abrirEspaco`
// funcionarem sem saber da diferença. `_texto` é o texto dono e `_colecao` a
// coleção dele; `id` é próprio (texto e Elemento podem repetir número).
// Aparição "só consta" no livro (sem Parte, Seção ou posição) não compete.
export function entradasDeFilaPorAparicao(dbRef, paiTipo, paiId) {
    if (!paiTipo || paiId == null || paiId === '') return [];
    const entradas = [];
    COLECOES_DE_TEXTO.forEach((col) => {
        lista(dbRef, col).forEach((texto) => {
            if (!texto || !Array.isArray(texto.aparicoes)) return;
            const espelhoAqui = texto.paiTipo === paiTipo && mesmoId(texto.paiId, paiId);
            if (espelhoAqui) return;
            texto.aparicoes.forEach((a) => {
                if (!temLugar(a)) return;
                const [tipo, id] = escopoDoLugar(a);
                if (tipo !== paiTipo || !mesmoId(id, paiId)) return;
                entradas.push({
                    id: `aparicao:${col}:${texto.id}:${tipo}:${id}`,
                    titulo: texto.titulo,
                    status: texto.status,
                    paiTipo: tipo,
                    paiId: id,
                    _texto: texto,
                    _colecao: col,
                    _aparicao: a,
                    get sequencia() {
                        return a.sequencia ?? null;
                    },
                    set sequencia(v) {
                        a.sequencia = v;
                    },
                });
            });
        });
    });
    return entradas;
}

// ─── Espelho ───────────────────────────────────────────────────

export function espelhoDasAparicoes(aparicoes) {
    const todas = Array.isArray(aparicoes) ? aparicoes : [];
    const destino = todas.find(temLugar) || null;
    const livrosIds = [];
    todas.forEach((a) => {
        if (a === destino) return;
        if (destino && mesmoId(a.livroId, destino.livroId)) return;
        if (!livrosIds.some((id) => mesmoId(id, a.livroId))) livrosIds.push(a.livroId);
    });
    if (!destino) return { paiTipo: null, paiId: null, sequencia: null, livrosIds };
    const [paiTipo, paiId] =
        destino.secaoId != null
            ? ['secao', destino.secaoId]
            : destino.parteId != null
              ? ['parte', destino.parteId]
              : ['livro', destino.livroId];
    return { paiTipo, paiId, sequencia: destino.sequencia, livrosIds };
}

export function aplicarEspelho(item, espelho) {
    item.paiTipo = espelho.paiTipo;
    item.paiId = espelho.paiId;
    item.sequencia = espelho.sequencia;
    item.livrosIds = [...espelho.livrosIds];
}

// Os campos antigos do texto batem com o que a lista dele dá? Não olha o `db`.
export function espelhoDesatualizado(item) {
    if (!item || !Array.isArray(item.aparicoes)) return false;
    const esperado = espelhoDasAparicoes(item.aparicoes);
    const ids = (v) => (Array.isArray(v) ? v.map(String) : []);
    return (
        (item.paiTipo ?? null) !== esperado.paiTipo ||
        String(item.paiId ?? null) !== String(esperado.paiId ?? null) ||
        seqOuNull(item.sequencia) !== esperado.sequencia ||
        ids(item.livrosIds).join('|') !== ids(esperado.livrosIds).join('|')
    );
}

// ─── Escrita (o único ponto) ───────────────────────────────────

// Grava a lista (normalizada) e recalcula o espelho. Devolve a lista gravada.
export function definirAparicoes(dbRef, item, novas) {
    const final = normalizarAparicoes(dbRef, novas);
    item.aparicoes = final;
    aplicarEspelho(item, espelhoDasAparicoes(final));
    return final;
}

// `indice` (opcional) põe a aparição nessa posição da lista; serve ao Desfazer.
export function adicionarAparicao(dbRef, item, aparicao, { indice = null } = {}) {
    const base = [...listaDeAparicoes(dbRef, item)];
    const alvo = indice == null ? base.length : Math.min(Math.max(indice, 0), base.length);
    base.splice(alvo, 0, aparicao);
    return definirAparicoes(dbRef, item, base);
}

// Tira a aparição daquele lugar. Devolve `{ removida, indice }` para o Desfazer
// (`removida` null quando o texto não aparecia ali, e nada muda).
export function removerAparicao(dbRef, item, lugar) {
    const base = listaDeAparicoes(dbRef, item);
    const alvo = resolverLugar(dbRef, lugar || {});
    const indice = alvo ? base.findIndex((a) => mesmoLugar(a, alvo)) : -1;
    if (indice === -1) return { removida: null, indice: -1 };
    const removida = base[indice];
    definirAparicoes(
        dbRef,
        item,
        base.filter((_, i) => i !== indice),
    );
    return { removida, indice };
}

// Muda a aparição de `de` para `para` ({ livroId, parteId, secaoId, sequencia }),
// no mesmo lugar da lista. Se `para` já é um lugar do texto, as duas se fundem;
// se `para` é só "consta" num livro onde o texto já tem lugar, a aparição se
// funde com a desse livro. Devolve `{ movida, anterior, antes }`: `movida` é a
// aparição que ficou no lugar da movida, `anterior` a que saiu e `antes` uma
// cópia da lista de antes (o Desfazer exato, via `definirAparicoes`). Nada muda
// (`movida` e `anterior` null) quando não havia aparição em `de` ou quando
// `para` aponta para livro que não existe ou para Coletânea: sem isso a
// aparição se perderia em silêncio.
export function moverAparicao(dbRef, item, de, para) {
    const base = listaDeAparicoes(dbRef, item);
    const origem = resolverLugar(dbRef, de || {});
    const indice = origem ? base.findIndex((a) => mesmoLugar(a, origem)) : -1;
    if (indice === -1) return { movida: null, anterior: null, antes: null };
    const nova = {
        livroId: para?.livroId ?? null,
        parteId: para?.parteId ?? null,
        secaoId: para?.secaoId ?? null,
        sequencia: para?.sequencia ?? null,
    };
    if (!normalizarAparicoes(dbRef, [nova]).length) {
        return { movida: null, anterior: null, antes: null };
    }
    const anterior = base[indice];
    const antes = base.map((a) => ({ ...a }));
    const final = definirAparicoes(
        dbRef,
        item,
        base.map((a, i) => (i === indice ? nova : a)),
    );
    const destino = resolverLugar(dbRef, nova);
    const movida =
        final.find((a) => mesmoLugar(a, destino)) ||
        final.find((a) => mesmoId(a.livroId, destino.livroId)) ||
        null;
    return { movida, anterior, antes };
}

// ─── Verificador de restos (para saber o tamanho antes de migrar) ──

function livroExiste(dbRef, id) {
    return id != null && lista(dbRef, 'livros').some((l) => mesmoId(l.id, id));
}

// Cadeia do pai (Livro, Parte ou Seção) que chega a um Livro que existe?
function paiChegaAoLivro(dbRef, paiTipo, paiId) {
    const caminho = caminhoDoDestino({ paiTipo, paiId }, dbRef);
    return !!caminho && livroExiste(dbRef, caminho.livroId);
}

// Conta o que a migração e a exclusão de Livro comum deixaram para trás:
// Partes, Seções e Elementos órfãos, textos com referência a algo que não
// existe (a migração descarta da lista) e textos com Destino direto no Livro
// sem posição (viram "só consta" no espelho quando o texto for regravado).
// Só lê; devolve ids para o Victor conferir.
export function contarRestosDeEstrutura(dbRef) {
    const partesOrfas = lista(dbRef, 'partes')
        .filter((p) => !livroExiste(dbRef, p.livroId))
        .map((p) => p.id);
    const secoesOrfas = lista(dbRef, 'secoes')
        .filter((s) => !paiChegaAoLivro(dbRef, s.paiTipo, s.paiId))
        .map((s) => s.id);
    const elementosOrfaos = lista(dbRef, 'elementos')
        .filter((e) => !paiChegaAoLivro(dbRef, e.paiTipo, e.paiId))
        .map((e) => e.id);

    const textosComReferenciaPerdida = [];
    let destinosDiretosSemPosicao = 0;
    COLECOES_DE_TEXTO.forEach((colecao) => {
        lista(dbRef, colecao).forEach((t) => {
            let perdidas = 0;
            if (t.paiTipo && t.paiId != null) {
                if (!paiChegaAoLivro(dbRef, t.paiTipo, t.paiId)) perdidas++;
                else if (t.paiTipo === 'livro' && seqOuNull(t.sequencia) == null) {
                    destinosDiretosSemPosicao++;
                }
            }
            (Array.isArray(t.livrosIds) ? t.livrosIds : []).forEach((id) => {
                if (!livroExiste(dbRef, id)) perdidas++;
            });
            if (perdidas) textosComReferenciaPerdida.push({ colecao, id: t.id, perdidas });
        });
    });

    return {
        partesOrfas,
        secoesOrfas,
        elementosOrfaos,
        textosComReferenciaPerdida,
        destinosDiretosSemPosicao,
    };
}
