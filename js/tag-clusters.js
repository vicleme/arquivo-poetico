// tag-clusters.js: agrupamentos de etiquetas (Fase 17, entrega 1).
//
// Lógica pura, sem DOM. Um tag cluster agrupa etiquetas de UMA categoria
// (como um Assunto agrupa Temas) e serve para ler as Estatísticas por
// grupo em vez de por etiqueta. Classifica a etiqueta em si, não o uso dela
// no texto: não aparece nos modais e não é gravado em nenhum texto.
//
// Dados:
//   db.tagClusters = [{ id, nome, categoria, notas }]
//   db.etiquetas[i].clusterId  (id do cluster, ou ausente)
//
// Regras (F17-D1 a F17-D3):
//   - uma etiqueta fica em um cluster só, ou em nenhum: o campo mora na
//     etiqueta, então "um só" vale pelo próprio dado;
//   - o cluster pertence a uma categoria e só aceita etiquetas dela;
//   - aceitam cluster Domínio Imagético, Tom, Tradição, Estilo, Relação e
//     Sensibilidade (CATEGORIAS_COM_CLUSTER; as duas últimas entraram na
//     entrega 3, a pedido do Victor); Outros fica de fora até ter categoria
//     real;
//   - excluir um cluster só solta as etiquetas, nunca mexe em texto.
// Toda operação que muda algo devolve `desfazer`.

import { chaveTema, gerarId } from './utils.js';
import {
    ETIQUETAS_CATEGORIAS,
    ROTULOS_ETIQUETAS,
    idsDeEtiquetasDoTexto,
    limparNomeEtiqueta,
} from './etiquetas.js';

// Para abrir outra categoria depois, basta acrescentar a chave aqui.
export const CATEGORIAS_COM_CLUSTER = [
    'dominioImagetico',
    'tom',
    'tradicao',
    'estilo',
    'relacao',
    'sensibilidade',
];

// As mesmas categorias em ordem alfabética pelo rótulo: é a ordem que a
// tela (filtro, modais, seções) e o .md exportado mostram.
export const CATEGORIAS_EM_ORDEM = [...CATEGORIAS_COM_CLUSTER].sort((a, b) =>
    ROTULOS_ETIQUETAS[a].localeCompare(ROTULOS_ETIQUETAS[b], 'pt-BR'),
);

export function categoriaAceitaCluster(categoria) {
    return CATEGORIAS_COM_CLUSTER.includes(categoria);
}

export function rotuloDaCategoriaDeCluster(categoria) {
    return ROTULOS_ETIQUETAS[categoria] || '';
}

function achar(dbRef, id) {
    return (dbRef.tagClusters || []).find((c) => c.id == id);
}

function acharEtiqueta(dbRef, id) {
    return (dbRef.etiquetas || []).find((e) => e.id == id);
}

function acharPorNome(dbRef, categoria, nome, ignorarId = null) {
    const chave = chaveTema(nome);
    return (dbRef.tagClusters || []).find(
        (c) => c.categoria === categoria && c.id != ignorarId && chaveTema(c.nome) === chave,
    );
}

function todosOsTextos(dbRef) {
    return [...(dbRef.poemas || []), ...(dbRef.prosas || [])];
}

// Garante `dbRef.tagClusters` limpo e solta `clusterId` que não vale mais
// (cluster que não existe, ou de outra categoria que a da etiqueta, ou
// categoria que não aceita cluster). Nunca apaga cluster. Roda no load, no
// importar e no save. Devolve quantas etiquetas foram soltas.
export function sincronizarTagClusters(dbRef) {
    const validos = (Array.isArray(dbRef.tagClusters) ? dbRef.tagClusters : []).filter(
        (c) => c && c.id != null && categoriaAceitaCluster(c.categoria),
    );
    const vistos = new Set();
    dbRef.tagClusters = validos.filter((c) => {
        if (vistos.has(String(c.id))) return false;
        vistos.add(String(c.id));
        return true;
    });
    dbRef.tagClusters.forEach((c) => {
        c.nome = limparNomeEtiqueta(c.nome);
        c.notas = typeof c.notas === 'string' ? c.notas : '';
    });
    let soltas = 0;
    (dbRef.etiquetas || []).forEach((e) => {
        if (!Object.prototype.hasOwnProperty.call(e, 'clusterId')) return;
        const cluster = e.clusterId == null ? null : achar(dbRef, e.clusterId);
        if (!cluster || cluster.categoria !== e.categoria) {
            delete e.clusterId;
            soltas++;
        }
    });
    return soltas;
}

// Cluster da etiqueta (objeto) ou null.
export function clusterDaEtiqueta(dbRef, etiquetaOuId) {
    const e =
        etiquetaOuId && typeof etiquetaOuId === 'object'
            ? etiquetaOuId
            : acharEtiqueta(dbRef, etiquetaOuId);
    if (!e || e.clusterId == null) return null;
    return achar(dbRef, e.clusterId) || null;
}

// ─── Consultas ─────────────────────────────────────────────────────────

// Clusters de uma categoria, em ordem alfabética.
export function clustersDaCategoria(dbRef, categoria) {
    return (dbRef.tagClusters || [])
        .filter((c) => c.categoria === categoria)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

// Etiquetas do cluster, em ordem alfabética.
export function etiquetasDoCluster(dbRef, clusterId) {
    return (dbRef.etiquetas || [])
        .filter((e) => e.clusterId != null && e.clusterId == clusterId)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

// Etiquetas de categoria que aceita cluster e que ainda não estão em
// nenhum (triagem). `categoria` opcional restringe a uma.
export function etiquetasSemCluster(dbRef, categoria = null) {
    return (dbRef.etiquetas || [])
        .filter((e) => categoriaAceitaCluster(e.categoria))
        .filter((e) => !categoria || e.categoria === categoria)
        .filter((e) => clusterDaEtiqueta(dbRef, e) === null)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

// Ids de Poemas e Prosas que usam alguma etiqueta do cluster. Um texto com
// duas etiquetas do mesmo cluster conta uma vez (F17-D4).
export function textosDoCluster(dbRef, clusterId) {
    const cluster = achar(dbRef, clusterId);
    if (!cluster) return { poemasIds: [], prosasIds: [] };
    const ids = new Set(etiquetasDoCluster(dbRef, clusterId).map((e) => String(e.id)));
    const usa = (t) =>
        idsDeEtiquetasDoTexto(dbRef, t, cluster.categoria).some((id) => ids.has(String(id)));
    return {
        poemasIds: (dbRef.poemas || []).filter(usa).map((t) => t.id),
        prosasIds: (dbRef.prosas || []).filter(usa).map((t) => t.id),
    };
}

// Contagem de textos por cluster (Map id → n), cada texto uma vez por
// cluster. A soma passa do total de textos, porque um texto tem várias
// etiquetas (F17-D1).
export function contarTextosPorCluster(dbRef) {
    const contagem = new Map();
    const porEtiqueta = new Map();
    (dbRef.etiquetas || []).forEach((e) => {
        if (e.clusterId != null) porEtiqueta.set(String(e.id), e);
    });
    todosOsTextos(dbRef).forEach((t) => {
        const vistos = new Set();
        Object.keys(ETIQUETAS_CATEGORIAS).forEach((categoria) => {
            idsDeEtiquetasDoTexto(dbRef, t, categoria).forEach((id) => {
                const e = porEtiqueta.get(String(id));
                if (!e || vistos.has(String(e.clusterId))) return;
                vistos.add(String(e.clusterId));
                contagem.set(e.clusterId, (contagem.get(e.clusterId) || 0) + 1);
            });
        });
    });
    return contagem;
}

// ─── Criar, renomear, excluir ──────────────────────────────────────────

// Cria um cluster vazio. Recusa nome vazio, categoria que não aceita
// cluster e nome repetido na mesma categoria (sem caixa e sem acento).
export function criarCluster(dbRef, nome, categoria) {
    if (!categoriaAceitaCluster(categoria)) return { ok: false, motivo: 'categoria-invalida' };
    const limpo = limparNomeEtiqueta(nome);
    if (!limpo) return { ok: false, motivo: 'vazio' };
    const existente = acharPorNome(dbRef, categoria, limpo);
    if (existente) return { ok: false, motivo: 'duplicado', existente };
    if (!Array.isArray(dbRef.tagClusters)) dbRef.tagClusters = [];
    const cluster = { id: gerarId(), nome: limpo, categoria, notas: '' };
    dbRef.tagClusters.push(cluster);
    return {
        ok: true,
        cluster,
        desfazer: () => {
            dbRef.tagClusters = dbRef.tagClusters.filter((c) => c.id != cluster.id);
        },
    };
}

// Renomeia e/ou troca a nota. Recusa nome vazio ou de OUTRO cluster da
// mesma categoria. A categoria não muda (as etiquetas dentro dela valem só
// naquela categoria).
export function editarCluster(dbRef, id, { nome, notas } = {}) {
    const c = achar(dbRef, id);
    if (!c) return { ok: false, motivo: 'inexistente' };
    const antes = { nome: c.nome, notas: c.notas };
    if (nome !== undefined) {
        const limpo = limparNomeEtiqueta(nome);
        if (!limpo) return { ok: false, motivo: 'vazio' };
        const duplicado = acharPorNome(dbRef, c.categoria, limpo, id);
        if (duplicado) return { ok: false, motivo: 'duplicado', existente: duplicado };
        c.nome = limpo;
    }
    if (notas !== undefined) c.notas = String(notas ?? '');
    return {
        ok: true,
        desfazer: () => {
            c.nome = antes.nome;
            c.notas = antes.notas;
        },
    };
}

// Exclui o cluster e solta as etiquetas dele. Nenhum texto muda.
export function excluirCluster(dbRef, id) {
    const c = achar(dbRef, id);
    if (!c) return { ok: false, motivo: 'inexistente' };
    const indice = dbRef.tagClusters.findIndex((x) => x.id == id);
    const soltas = etiquetasDoCluster(dbRef, id);
    soltas.forEach((e) => {
        delete e.clusterId;
    });
    dbRef.tagClusters.splice(indice, 1);
    return {
        ok: true,
        etiquetas: soltas.length,
        desfazer: () => {
            if (!dbRef.tagClusters.some((x) => x.id == c.id)) {
                dbRef.tagClusters.splice(Math.min(indice, dbRef.tagClusters.length), 0, c);
            }
            soltas.forEach((e) => {
                e.clusterId = c.id;
            });
        },
    };
}

// ─── Atribuir etiquetas ────────────────────────────────────────────────

// Põe as etiquetas `etiquetaIds` no cluster (ou as solta, com
// `clusterId` null). Uma etiqueta que já estava em outro cluster passa para
// este. Recusa categoria diferente da do cluster. Devolve quantas mudaram.
export function atribuirEtiquetasAoCluster(dbRef, etiquetaIds, clusterId) {
    const cluster = clusterId == null ? null : achar(dbRef, clusterId);
    if (clusterId != null && !cluster) return { ok: false, motivo: 'cluster-inexistente' };
    const alvos = [];
    for (const id of etiquetaIds || []) {
        const e = acharEtiqueta(dbRef, id);
        if (!e) return { ok: false, motivo: 'etiqueta-inexistente' };
        if (cluster && e.categoria !== cluster.categoria) {
            return { ok: false, motivo: 'categoria-diferente', etiqueta: e };
        }
        if (!cluster && !categoriaAceitaCluster(e.categoria)) {
            return { ok: false, motivo: 'categoria-invalida', etiqueta: e };
        }
        alvos.push(e);
    }
    const antes = alvos.map((e) => ({
        etiqueta: e,
        tinha: Object.prototype.hasOwnProperty.call(e, 'clusterId'),
        valor: e.clusterId,
    }));
    let mudaram = 0;
    alvos.forEach((e) => {
        if (cluster) {
            if (e.clusterId != null && e.clusterId == cluster.id) return;
            e.clusterId = cluster.id;
            mudaram++;
        } else if (Object.prototype.hasOwnProperty.call(e, 'clusterId')) {
            delete e.clusterId;
            mudaram++;
        }
    });
    return {
        ok: true,
        etiquetas: mudaram,
        desfazer: () => {
            antes.forEach(({ etiqueta, tinha, valor }) => {
                if (tinha) etiqueta.clusterId = valor;
                else delete etiqueta.clusterId;
            });
        },
    };
}
