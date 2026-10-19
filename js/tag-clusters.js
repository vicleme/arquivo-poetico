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
//   - excluir um cluster só solta as etiquetas, nunca mexe em texto;
//   - subcluster (Fase 17b): é um cluster com `paiId` apontando para o pai.
//     Um nível só (o pai não tem pai) e na mesma categoria do pai. A etiqueta
//     continua com um `clusterId` só, o do mais específico, e pertence ao pai
//     por consequência. Também pode ficar direto no pai, sem subcluster.
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

// Conflito de nome (sem caixa e sem acento), com a regra de "nome único entre
// irmãos": cluster de topo não repete nome de nenhum outro cluster da
// categoria; subcluster não repete nome de cluster de topo nem de irmão do
// mesmo pai. Subclusters de pais diferentes podem ter o mesmo nome.
// `paiId` é o pai que o cluster teria (null para cluster de topo).
function acharPorNome(dbRef, categoria, nome, paiId = null, ignorarId = null) {
    const chave = chaveTema(nome);
    return (dbRef.tagClusters || []).find(
        (c) =>
            c.categoria === categoria &&
            c.id != ignorarId &&
            chaveTema(c.nome) === chave &&
            (paiId == null || c.paiId == null || c.paiId == paiId),
    );
}

// "Pai > Sub" para subcluster; só o nome para cluster de topo. É o texto que
// seletores e chips mostram onde o nome aparece sozinho.
export function caminhoDoCluster(dbRef, clusterOuId) {
    const c =
        clusterOuId && typeof clusterOuId === 'object' ? clusterOuId : achar(dbRef, clusterOuId);
    if (!c) return '';
    const pai = c.paiId == null ? null : achar(dbRef, c.paiId);
    return pai ? `${pai.nome} > ${c.nome}` : c.nome;
}

// Clusters da categoria na ordem da árvore: cada cluster de topo seguido dos
// subclusters dele (alfabética em cada nível). É a ordem dos seletores.
export function clustersEmArvoreDaCategoria(dbRef, categoria) {
    const saida = [];
    clustersDeTopoDaCategoria(dbRef, categoria).forEach((topo) => {
        saida.push(topo, ...subclustersDoCluster(dbRef, topo.id));
    });
    return saida;
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
    // Subclusters: solta `paiId` que não vale (pai inexistente, ele mesmo ou
    // de outra categoria) e depois deixa um nível só: quem tem pai e cujo pai
    // também tem pai perde o `paiId`.
    const porId = new Map(dbRef.tagClusters.map((c) => [String(c.id), c]));
    dbRef.tagClusters.forEach((c) => {
        if (!Object.prototype.hasOwnProperty.call(c, 'paiId')) return;
        const pai = c.paiId == null ? null : porId.get(String(c.paiId));
        if (!pai || pai === c || pai.categoria !== c.categoria) delete c.paiId;
    });
    dbRef.tagClusters.forEach((c) => {
        if (c.paiId == null) return;
        const pai = porId.get(String(c.paiId));
        if (pai && pai.paiId != null) delete c.paiId;
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

// Pai do subcluster (objeto) ou null.
export function paiDoCluster(dbRef, clusterOuId) {
    const c =
        clusterOuId && typeof clusterOuId === 'object' ? clusterOuId : achar(dbRef, clusterOuId);
    if (!c || c.paiId == null) return null;
    return achar(dbRef, c.paiId) || null;
}

// Subclusters de um cluster, em ordem alfabética.
export function subclustersDoCluster(dbRef, clusterId) {
    return (dbRef.tagClusters || [])
        .filter((c) => c.paiId != null && c.paiId == clusterId)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

// Clusters de topo (sem pai) de uma categoria, em ordem alfabética.
export function clustersDeTopoDaCategoria(dbRef, categoria) {
    return clustersDaCategoria(dbRef, categoria).filter((c) => c.paiId == null);
}

// Etiquetas postas direto no cluster, em ordem alfabética. Num pai, não
// inclui as dos subclusters (use `etiquetasDoClusterComSub`).
export function etiquetasDoCluster(dbRef, clusterId) {
    return (dbRef.etiquetas || [])
        .filter((e) => e.clusterId != null && e.clusterId == clusterId)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

// Etiquetas do cluster e dos subclusters dele, em ordem alfabética.
export function etiquetasDoClusterComSub(dbRef, clusterId) {
    const ids = new Set(
        [clusterId, ...subclustersDoCluster(dbRef, clusterId).map((s) => s.id)].map(String),
    );
    return (dbRef.etiquetas || [])
        .filter((e) => e.clusterId != null && ids.has(String(e.clusterId)))
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
// duas etiquetas do mesmo cluster conta uma vez (F17-D4). Num pai, vale a
// união dos textos das etiquetas dele e dos subclusters.
export function textosDoCluster(dbRef, clusterId) {
    const cluster = achar(dbRef, clusterId);
    if (!cluster) return { poemasIds: [], prosasIds: [] };
    const ids = new Set(etiquetasDoClusterComSub(dbRef, clusterId).map((e) => String(e.id)));
    const usa = (t) =>
        idsDeEtiquetasDoTexto(dbRef, t, cluster.categoria).some((id) => ids.has(String(id)));
    return {
        poemasIds: (dbRef.poemas || []).filter(usa).map((t) => t.id),
        prosasIds: (dbRef.prosas || []).filter(usa).map((t) => t.id),
    };
}

// Contagem de textos por cluster (Map id → n), cada texto uma vez por
// cluster. A soma passa do total de textos, porque um texto tem várias
// etiquetas (F17-D1). A etiqueta de um subcluster conta também para o pai,
// e o texto conta uma vez por cluster (a união, sem somar).
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
                if (!e) return;
                const proprio = achar(dbRef, e.clusterId);
                const pai = proprio ? paiDoCluster(dbRef, proprio) : null;
                [e.clusterId, pai ? pai.id : null].forEach((cid) => {
                    if (cid == null || vistos.has(String(cid))) return;
                    vistos.add(String(cid));
                    contagem.set(cid, (contagem.get(cid) || 0) + 1);
                });
            });
        });
    });
    return contagem;
}

// ─── Criar, renomear, excluir ──────────────────────────────────────────

// O ">" separa pai e subcluster na importação e nos seletores, então não
// entra em nome de cluster.
function nomeTemSeparador(nome) {
    return String(nome).includes('>');
}

// Cria um cluster vazio. Recusa nome vazio, nome com ">", categoria que não
// aceita cluster e nome repetido pela regra de nome único entre irmãos (sem
// caixa e sem acento; ver `acharPorNome`). Com `paiId`, cria um subcluster: o
// pai precisa existir, ser da mesma categoria e não ter pai.
export function criarCluster(dbRef, nome, categoria, paiId = null) {
    if (!categoriaAceitaCluster(categoria)) return { ok: false, motivo: 'categoria-invalida' };
    const limpo = limparNomeEtiqueta(nome);
    if (!limpo) return { ok: false, motivo: 'vazio' };
    if (nomeTemSeparador(limpo)) return { ok: false, motivo: 'caractere-invalido' };
    if (paiId != null) {
        const pai = achar(dbRef, paiId);
        if (!pai) return { ok: false, motivo: 'pai-inexistente' };
        if (pai.categoria !== categoria) return { ok: false, motivo: 'categoria-diferente' };
        if (pai.paiId != null) return { ok: false, motivo: 'nivel-maximo' };
    }
    const existente = acharPorNome(dbRef, categoria, limpo, paiId);
    if (existente) return { ok: false, motivo: 'duplicado', existente };
    if (!Array.isArray(dbRef.tagClusters)) dbRef.tagClusters = [];
    const cluster = { id: gerarId(), nome: limpo, categoria, notas: '' };
    if (paiId != null) cluster.paiId = paiId;
    dbRef.tagClusters.push(cluster);
    return {
        ok: true,
        cluster,
        desfazer: () => {
            dbRef.tagClusters = dbRef.tagClusters.filter((c) => c.id != cluster.id);
        },
    };
}

// Renomeia e/ou troca a nota. Recusa nome vazio, com ">" ou que conflite com
// outro cluster pela regra de nome único entre irmãos (o nível do cluster
// vale: subcluster só disputa nome com o topo e com os irmãos). A categoria não muda (as etiquetas dentro dela valem só
// naquela categoria).
export function editarCluster(dbRef, id, { nome, notas } = {}) {
    const c = achar(dbRef, id);
    if (!c) return { ok: false, motivo: 'inexistente' };
    const antes = { nome: c.nome, notas: c.notas };
    if (nome !== undefined) {
        const limpo = limparNomeEtiqueta(nome);
        if (!limpo) return { ok: false, motivo: 'vazio' };
        if (nomeTemSeparador(limpo)) return { ok: false, motivo: 'caractere-invalido' };
        const duplicado = acharPorNome(dbRef, c.categoria, limpo, c.paiId ?? null, id);
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

// Muda o pai do cluster (`paiId`), ou o torna de topo com `paiId` null.
// Recusa pai inexistente, o próprio cluster, pai de outra categoria, pai que
// já é subcluster (um nível só), cluster que já tem subclusters e mudança de
// nível que faria o nome conflitar (regra de nome único entre irmãos).
export function definirPaiDoCluster(dbRef, id, paiId) {
    const c = achar(dbRef, id);
    if (!c) return { ok: false, motivo: 'inexistente' };
    if (paiId != null) {
        const pai = achar(dbRef, paiId);
        if (!pai) return { ok: false, motivo: 'pai-inexistente' };
        if (pai.id == c.id) return { ok: false, motivo: 'proprio-pai' };
        if (pai.categoria !== c.categoria) return { ok: false, motivo: 'categoria-diferente' };
        if (pai.paiId != null) return { ok: false, motivo: 'nivel-maximo' };
        if (subclustersDoCluster(dbRef, c.id).length) {
            return { ok: false, motivo: 'tem-subclusters' };
        }
    }
    if ((paiId ?? null) != (c.paiId ?? null)) {
        const conflito = acharPorNome(dbRef, c.categoria, c.nome, paiId, c.id);
        if (conflito) return { ok: false, motivo: 'duplicado', existente: conflito };
    }
    const tinha = Object.prototype.hasOwnProperty.call(c, 'paiId');
    const antes = c.paiId;
    let mudou = false;
    if (paiId != null) {
        mudou = c.paiId == null || c.paiId != paiId;
        c.paiId = paiId;
    } else if (tinha) {
        mudou = true;
        delete c.paiId;
    }
    return {
        ok: true,
        mudou,
        desfazer: () => {
            if (tinha) c.paiId = antes;
            else delete c.paiId;
        },
    };
}

// Exclui o cluster e solta as etiquetas dele. Os subclusters (se houver)
// sobem para clusters de topo, com as etiquetas deles. Nenhum texto muda.
export function excluirCluster(dbRef, id) {
    const c = achar(dbRef, id);
    if (!c) return { ok: false, motivo: 'inexistente' };
    const indice = dbRef.tagClusters.findIndex((x) => x.id == id);
    const soltas = etiquetasDoCluster(dbRef, id);
    const filhos = subclustersDoCluster(dbRef, id);
    soltas.forEach((e) => {
        delete e.clusterId;
    });
    filhos.forEach((s) => {
        delete s.paiId;
    });
    dbRef.tagClusters.splice(indice, 1);
    return {
        ok: true,
        etiquetas: soltas.length,
        subclusters: filhos.length,
        desfazer: () => {
            if (!dbRef.tagClusters.some((x) => x.id == c.id)) {
                dbRef.tagClusters.splice(Math.min(indice, dbRef.tagClusters.length), 0, c);
            }
            soltas.forEach((e) => {
                e.clusterId = c.id;
            });
            filhos.forEach((s) => {
                s.paiId = c.id;
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
