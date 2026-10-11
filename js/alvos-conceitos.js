// ============================================================
// alvos-conceitos.js — texto-alvo de Elos e Ecos entre acervos
//
// Elo e Eco guardam o id do texto que ligam (`conceitos.elos[].id` e
// `conceitos.ecos[].id`). O id não vale em outro acervo, e a Importação
// Aditiva dá id novo a cada texto que cria. Este módulo (puro, sem DOM)
// cuida das duas pontas:
//   - exportação: cada Elo e Eco leva `alvoTitulo`, o título do alvo;
//   - importação: o alvo é resolvido nesta ordem (F11-D9):
//       1. texto do mesmo lote  → o id novo que ele ganhou;
//       2. duplicata casada     → o id do texto que já existe no destino;
//       3. título exato único   → o texto do destino com esse título
//          (só quando o arquivo traz `alvoTitulo`);
//       4. nada disso           → a entrada é SOLTA (nunca fica apontando
//          para um id arbitrário). Decisão do Victor: Eco sem alvo não
//          cumpre a função, então sai inteiro, com a nota e a âncora.
// ============================================================

function chaveTitulo(s) {
    return String(s ?? '')
        .trim()
        .toLowerCase();
}

function textoPorId(dbRef, id) {
    return (
        (dbRef.poemas || []).find((t) => t.id == id) ||
        (dbRef.prosas || []).find((t) => t.id == id) ||
        null
    );
}

// ─── Exportação ──────────────────────────────────────────────

/**
 * Elos ou Ecos de um texto prontos para o JSON: cada entrada ganha
 * `alvoTitulo`. Alvo que não existe mais (ou sem título) passa como está.
 */
export function comAlvoTitulo(dbRef, lista) {
    if (!Array.isArray(lista)) return lista;
    return lista.map((e) => {
        if (!e || typeof e !== 'object' || e.id == null) return e;
        const titulo = textoPorId(dbRef, e.id)?.titulo;
        return titulo ? { ...e, alvoTitulo: titulo } : e;
    });
}

// ─── Importação ──────────────────────────────────────────────

/**
 * Contexto da resolução, montado a partir do relatório já decidido:
 * - `noLote`: ids de origem (string) dos itens que serão criados;
 * - `duplicataDestino`: id de origem → id do texto existente, nos itens
 *   tratados como duplicata (decisão "casar" em `duplicataTitulo`).
 * Item com erro fica fora. Decisão ainda pendente conta como "no lote".
 */
export function montarContextoAlvos(relatorio, dbRef) {
    const noLote = new Set();
    const duplicataDestino = new Map();
    (relatorio?.itensOrigem || []).forEach((rel) => {
        if (rel.status === 'erro' || rel.idOrigem == null) return;
        const dup = (rel.referencias || []).find((r) => r.campo === 'duplicataTitulo');
        if (dup && dup.decisao === 'casar' && dup.entidadeDestinoId != null) {
            duplicataDestino.set(String(rel.idOrigem), dup.entidadeDestinoId);
            return;
        }
        noLote.add(String(rel.idOrigem));
    });
    return { noLote, duplicataDestino, dbRef };
}

/**
 * Id de destino do alvo de uma entrada (Elo ou Eco), ou null se não houver.
 * `mapaNovosIds` (Map idOrigem → id novo) existe só na aplicação; na prévia
 * um alvo do lote conta como resolvido sem precisar do id final.
 */
export function resolverAlvo(entrada, ctx, mapaNovosIds = null) {
    if (entrada?.id == null) return null;
    const chave = String(entrada.id);

    if (ctx.noLote.has(chave)) {
        return mapaNovosIds ? (mapaNovosIds.get(chave) ?? null) : chave;
    }
    if (ctx.duplicataDestino.has(chave)) return ctx.duplicataDestino.get(chave);

    const titulo = chaveTitulo(entrada.alvoTitulo);
    if (!titulo) return null;
    const achados = [...(ctx.dbRef.poemas || []), ...(ctx.dbRef.prosas || [])].filter(
        (t) => chaveTitulo(t.titulo) === titulo,
    );
    // Mais de um texto com o mesmo título é ambíguo: solta, não chuta.
    return achados.length === 1 ? achados[0].id : null;
}

function tituloDoSolto(entrada) {
    return String(entrada?.alvoTitulo ?? '').trim();
}

/**
 * Para a prévia: o que seria solto num texto do arquivo.
 * Devolve { elos: [{ titulo }], ecos: [{ titulo }] } (listas vazias se nada).
 */
export function alvosSoltosDoItem(itemOrigem, ctx) {
    const soltos = { elos: [], ecos: [] };
    const conceitos = itemOrigem?.conceitos;
    if (!conceitos) return soltos;
    ['elos', 'ecos'].forEach((campo) => {
        (Array.isArray(conceitos[campo]) ? conceitos[campo] : []).forEach((e) => {
            if (resolverAlvo(e, ctx) == null) soltos[campo].push({ titulo: tituloDoSolto(e) });
        });
    });
    return soltos;
}

/**
 * Para a prévia: uma posição por item do relatório (mesmo índice de
 * `relatorio.itensOrigem`), com os alvos soltos; null para o que não será
 * importado (erro ou duplicata casada).
 */
export function alvosSoltosPorItem(payload, relatorio, dbRef) {
    const ctx = montarContextoAlvos(relatorio, dbRef);
    const porId = new Map(
        (Array.isArray(payload?.itens) ? payload.itens : []).map((it) => [String(it?.id), it]),
    );
    return (relatorio?.itensOrigem || []).map((rel) => {
        if (rel.status === 'erro' || rel.idOrigem == null) return null;
        if (ctx.duplicataDestino.has(String(rel.idOrigem))) return null;
        const item = porId.get(String(rel.idOrigem));
        return item ? alvosSoltosDoItem(item, ctx) : null;
    });
}

/**
 * Na aplicação: reescreve os alvos de Elos e Ecos de um texto já remontado.
 * Entrada com alvo vira o id de destino (sem `alvoTitulo`); sem alvo, sai.
 * Devolve { conceitos, soltos: { elos, ecos } } (contagens); `conceitos`
 * é o mesmo objeto se o texto não tem nenhum dos dois.
 */
export function remapearAlvosDoConceitos(conceitos, ctx, mapaNovosIds) {
    const soltos = { elos: 0, ecos: 0 };
    if (!conceitos || typeof conceitos !== 'object') return { conceitos, soltos };

    const novo = { ...conceitos };
    ['elos', 'ecos'].forEach((campo) => {
        if (!Array.isArray(conceitos[campo])) return;
        novo[campo] = conceitos[campo].flatMap((e) => {
            const destino = resolverAlvo(e, ctx, mapaNovosIds);
            if (destino == null) {
                soltos[campo]++;
                return [];
            }
            const { alvoTitulo, ...resto } = e;
            void alvoTitulo; // só existia para achar o alvo, não persiste
            return [{ ...resto, id: destino }];
        });
    });
    return { conceitos: novo, soltos };
}
