// importar-tag-clusters.js: importa tag clusters de uma lista colada em texto.
//
// Lógica pura, sem DOM e sem save(): a tela (tag-clusters-aba.js) só chama.
// Formato, uma linha por cluster:
//
//   Nome do cluster: etiqueta, etiqueta, etiqueta
//
// A categoria vem do seletor da tela (`categoriaPadrao`) ou de um título
// "## Tom" no próprio texto, que vale até o próximo título (mesmos nomes de
// categoria do .md exportado). Regras:
//   - nunca cria etiqueta: nome que não existe na categoria vai para
//     `naoAchadas`, porque o cadastro de etiquetas nasce dos textos;
//   - cluster que já existe na categoria (sem caixa e sem acento) é
//     reaproveitado: as etiquetas entram nele;
//   - etiqueta que já estava em outro cluster passa para o novo (uma
//     etiqueta fica em um cluster só) e a passagem é avisada em `movidas`;
//   - nome de etiqueta repetido em duas linhas: vale a última, e avisa;
//   - linhas vazias são ignoradas; linha sem ":" ou sem nome de cluster
//     vira aviso e não muda nada.
// Devolve `desfazer`, que desfaz tudo de uma vez (clusters criados e
// etiquetas colocadas).

import { chaveTema } from './utils.js';
import { ROTULOS_ETIQUETAS, limparNomeEtiqueta } from './etiquetas.js';
import {
    CATEGORIAS_COM_CLUSTER,
    categoriaAceitaCluster,
    criarCluster,
    atribuirEtiquetasAoCluster,
    clusterDaEtiqueta,
} from './tag-clusters.js';

function categoriaDoTitulo(texto) {
    const chave = chaveTema(texto);
    return CATEGORIAS_COM_CLUSTER.find((c) => chaveTema(ROTULOS_ETIQUETAS[c]) === chave) || null;
}

// "a, b,, c" → ['a', 'b', 'c'], sem repetir (sem caixa e sem acento).
function nomesDaLista(texto) {
    const vistos = new Set();
    const saida = [];
    String(texto)
        .split(',')
        .forEach((parte) => {
            const nome = limparNomeEtiqueta(parte);
            const chave = chaveTema(nome);
            if (!chave || vistos.has(chave)) return;
            vistos.add(chave);
            saida.push(nome);
        });
    return saida;
}

// Lê o texto em linhas já separadas por categoria. Lógica de leitura
// apenas: não toca em `db`. Cada item: { linha, categoria, cluster, nomes }.
export function lerListaDeClusters(texto, categoriaPadrao = null) {
    const itens = [];
    const avisos = [];
    let categoria = categoriaAceitaCluster(categoriaPadrao) ? categoriaPadrao : null;

    String(texto ?? '')
        .split(/\r?\n/)
        .forEach((bruta, i) => {
            const linha = i + 1;
            const texto = bruta.trim();
            if (!texto) return;

            const titulo = texto.match(/^#{1,6}\s*(.+?)\s*#*$/);
            if (titulo) {
                const achada = categoriaDoTitulo(titulo[1]);
                if (achada) categoria = achada;
                else avisos.push({ linha, motivo: 'titulo-ignorado', texto });
                return;
            }

            const corte = texto.indexOf(':');
            if (corte === -1) {
                avisos.push({ linha, motivo: 'sem-dois-pontos', texto });
                return;
            }
            const cluster = limparNomeEtiqueta(texto.slice(0, corte).replace(/^[-*]\s*/, ''));
            if (!cluster) {
                avisos.push({ linha, motivo: 'sem-nome-de-cluster', texto });
                return;
            }
            if (!categoria) {
                avisos.push({ linha, motivo: 'sem-categoria', texto });
                return;
            }
            itens.push({ linha, categoria, cluster, nomes: nomesDaLista(texto.slice(corte + 1)) });
        });

    return { itens, avisos };
}

function etiquetaDaCategoria(dbRef, categoria, nome) {
    const chave = chaveTema(nome);
    return (dbRef.etiquetas || []).find(
        (e) => e.categoria === categoria && chaveTema(e.nome) === chave,
    );
}

function clusterExistente(dbRef, categoria, nome) {
    const chave = chaveTema(nome);
    return (dbRef.tagClusters || []).find(
        (c) => c.categoria === categoria && chaveTema(c.nome) === chave,
    );
}

// Aplica a lista. Devolve:
//   { ok, criados, reaproveitados, etiquetasColocadas, movidas,
//     naoAchadas: [{ cluster, nome, categoria }],
//     repetidas: [{ nome, categoria, de, para }],
//     avisos: [{ linha, motivo, texto }], desfazer }
// `ok` é false só quando não havia nenhuma linha válida (nada mudou).
export function importarTagClusters(dbRef, texto, categoriaPadrao = null) {
    const { itens, avisos } = lerListaDeClusters(texto, categoriaPadrao);
    const resultado = {
        ok: itens.length > 0,
        criados: 0,
        reaproveitados: 0,
        etiquetasColocadas: 0,
        movidas: [],
        naoAchadas: [],
        repetidas: [],
        avisos,
        desfazer: () => {},
    };
    if (itens.length === 0) return resultado;

    const desfazeres = [];
    // Última linha que pediu cada etiqueta (para avisar de repetição).
    const pedidaEm = new Map();

    itens.forEach(({ categoria, cluster: nome, nomes }) => {
        let cluster = clusterExistente(dbRef, categoria, nome);
        if (cluster) {
            resultado.reaproveitados++;
        } else {
            const r = criarCluster(dbRef, nome, categoria);
            if (!r.ok) return;
            cluster = r.cluster;
            desfazeres.push(r.desfazer);
            resultado.criados++;
        }

        const ids = [];
        nomes.forEach((n) => {
            const e = etiquetaDaCategoria(dbRef, categoria, n);
            if (!e) {
                resultado.naoAchadas.push({ cluster: cluster.nome, nome: n, categoria });
                return;
            }
            const chave = `${categoria}:${e.id}`;
            const jaPedida = pedidaEm.get(chave);
            if (jaPedida && jaPedida !== cluster.nome) {
                resultado.repetidas.push({
                    nome: e.nome,
                    categoria,
                    de: jaPedida,
                    para: cluster.nome,
                });
            } else if (!jaPedida) {
                // Só conta como "movida" a que já estava em outro cluster
                // antes da importação (a repetida entra em `repetidas`).
                const antes = clusterDaEtiqueta(dbRef, e);
                if (antes && antes.id != cluster.id) {
                    resultado.movidas.push({ nome: e.nome, de: antes.nome, para: cluster.nome });
                }
            }
            pedidaEm.set(chave, cluster.nome);
            ids.push(e.id);
        });

        if (ids.length === 0) return;
        const r = atribuirEtiquetasAoCluster(dbRef, ids, cluster.id);
        if (!r.ok) return;
        desfazeres.push(r.desfazer);
        resultado.etiquetasColocadas += r.etiquetas;
    });

    resultado.desfazer = () => {
        // Ao contrário: primeiro soltam-se as etiquetas, depois somem os
        // clusters criados.
        [...desfazeres].reverse().forEach((d) => d());
    };
    return resultado;
}
