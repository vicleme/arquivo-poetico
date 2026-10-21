// importar-tag-clusters.js: importa tag clusters de uma lista colada em texto.
//
// Lógica pura, sem DOM e sem save(): a tela (tag-clusters-aba.js) só chama.
// Formato, uma linha por cluster ou subcluster:
//
//   Nome do cluster: etiqueta, etiqueta, etiqueta
//   Cluster > Subcluster: etiqueta, etiqueta
//
// A linha com ">" traz o caminho completo (um nível só): o pai é criado se
// não existir, e o subcluster entra nele. Sem ">", o nome vale como cluster
// de topo. Repetir o mesmo nome de subcluster em pais diferentes é permitido
// (nome único entre irmãos); o que não pode é subcluster com o nome de um
// cluster de topo, nem pai que já é subcluster.
//
// A categoria vem do seletor da tela (`categoriaPadrao`) ou de um título
// "## Tom" no próprio texto, que vale até o próximo título (mesmos nomes de
// categoria do .md exportado). Regras:
//   - nunca cria etiqueta: nome que não existe na categoria vai para
//     `naoAchadas`, porque o cadastro de etiquetas nasce dos textos;
//   - cluster que já existe (sem caixa e sem acento; o de topo pelo nome, o
//     subcluster pelo pai e pelo nome) é reaproveitado: as etiquetas entram
//     nele;
//   - etiqueta que já estava em outro cluster passa para o novo (uma
//     etiqueta fica em um cluster só) e a passagem é avisada em `movidas`;
//   - nome de etiqueta repetido em duas linhas: vale a última, e avisa;
//   - linhas vazias são ignoradas; linha sem ":", sem nome de cluster, com
//     mais de um ">" ou que bate com uma regra de nomes vira aviso e não muda
//     nada.
// Devolve `desfazer`, que desfaz tudo de uma vez (clusters criados e
// etiquetas colocadas).

import { chaveTema } from './utils.js';
import { ROTULOS_ETIQUETAS, limparNomeEtiqueta } from './etiquetas.js';
import {
    CATEGORIAS_COM_CLUSTER,
    categoriaAceitaCluster,
    criarCluster,
    limparNomeCluster,
    atribuirEtiquetasAoCluster,
    clusterDaEtiqueta,
    caminhoDoCluster,
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
// apenas: não toca em `db`. Cada item: { linha, texto, categoria, cluster,
// pai, nomes }; `cluster` é o nome da folha e `pai` é o nome do cluster de
// topo (ou null quando a linha não tem ">").
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
            const caminho = texto
                .slice(0, corte)
                .replace(/^[-*]\s*/, '')
                .split('>')
                .map((parte) => limparNomeCluster(parte));
            if (caminho.some((nome) => !nome)) {
                avisos.push({ linha, motivo: 'sem-nome-de-cluster', texto });
                return;
            }
            if (caminho.length > 2) {
                avisos.push({ linha, motivo: 'nivel-maximo', texto });
                return;
            }
            if (!categoria) {
                avisos.push({ linha, motivo: 'sem-categoria', texto });
                return;
            }
            const [primeiro, segundo] = caminho;
            itens.push({
                linha,
                texto,
                categoria,
                cluster: segundo ?? primeiro,
                pai: segundo ? primeiro : null,
                nomes: nomesDaLista(texto.slice(corte + 1)),
            });
        });

    return { itens, avisos };
}

function etiquetaDaCategoria(dbRef, categoria, nome) {
    const chave = chaveTema(nome);
    return (dbRef.etiquetas || []).find(
        (e) => e.categoria === categoria && chaveTema(e.nome) === chave,
    );
}

// Cluster de topo da categoria com esse nome.
function topoExistente(dbRef, categoria, nome) {
    const chave = chaveTema(nome);
    return (dbRef.tagClusters || []).find(
        (c) => c.categoria === categoria && c.paiId == null && chaveTema(c.nome) === chave,
    );
}

// Subcluster com esse nome dentro de um pai; sem `paiId`, de qualquer pai.
function subExistente(dbRef, categoria, nome, paiId = null) {
    const chave = chaveTema(nome);
    return (dbRef.tagClusters || []).find(
        (c) =>
            c.categoria === categoria &&
            c.paiId != null &&
            (paiId == null || c.paiId == paiId) &&
            chaveTema(c.nome) === chave,
    );
}

// Aplica a lista. Devolve:
//   { ok, criados, subclustersCriados, reaproveitados, etiquetasColocadas, movidas,
//     naoAchadas: [{ cluster, nome, categoria }],
//     repetidas: [{ nome, categoria, de, para }],
//     avisos: [{ linha, motivo, texto }], desfazer }
// `ok` é false só quando não havia nenhuma linha válida (nada mudou).
export function importarTagClusters(dbRef, texto, categoriaPadrao = null) {
    const { itens, avisos } = lerListaDeClusters(texto, categoriaPadrao);
    const resultado = {
        ok: itens.length > 0,
        criados: 0,
        subclustersCriados: 0,
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

    // Cria o cluster pedido (topo ou subcluster) e conta; devolve null e põe um
    // aviso quando a regra de nomes impede.
    function resolverCluster({ linha, texto, categoria, cluster: nome, pai: nomePai }) {
        const avisar = (motivo) => {
            resultado.avisos.push({ linha, motivo, texto });
            return null;
        };
        const criar = (nomeNovo, paiId = null) => {
            const r = criarCluster(dbRef, nomeNovo, categoria, paiId);
            if (!r.ok) return null;
            desfazeres.push(r.desfazer);
            resultado.criados++;
            if (paiId != null) resultado.subclustersCriados++;
            return r.cluster;
        };

        if (!nomePai) {
            const topo = topoExistente(dbRef, categoria, nome);
            if (topo) {
                resultado.reaproveitados++;
                return topo;
            }
            // Só existe subcluster com esse nome: o nome sozinho é ambíguo.
            if (subExistente(dbRef, categoria, nome)) return avisar('nome-e-subcluster');
            return criar(nome);
        }

        let pai = topoExistente(dbRef, categoria, nomePai);
        if (!pai) {
            if (subExistente(dbRef, categoria, nomePai)) return avisar('pai-e-subcluster');
            pai = criar(nomePai);
            if (!pai) return null;
        }
        const sub = subExistente(dbRef, categoria, nome, pai.id);
        if (sub) {
            resultado.reaproveitados++;
            return sub;
        }
        // Subcluster não pode ter o nome de um cluster de topo da categoria.
        if (topoExistente(dbRef, categoria, nome)) return avisar('subcluster-nome-de-topo');
        return criar(nome, pai.id);
    }

    itens.forEach((item) => {
        const { categoria, nomes } = item;
        const cluster = resolverCluster(item);
        if (!cluster) return;
        const caminho = caminhoDoCluster(dbRef, cluster);

        const ids = [];
        nomes.forEach((n) => {
            const e = etiquetaDaCategoria(dbRef, categoria, n);
            if (!e) {
                resultado.naoAchadas.push({ cluster: caminho, nome: n, categoria });
                return;
            }
            const chave = `${categoria}:${e.id}`;
            const jaPedida = pedidaEm.get(chave);
            if (jaPedida && jaPedida.id != cluster.id) {
                resultado.repetidas.push({
                    nome: e.nome,
                    categoria,
                    de: jaPedida.caminho,
                    para: caminho,
                });
            } else if (!jaPedida) {
                // Só conta como "movida" a que já estava em outro cluster
                // antes da importação (a repetida entra em `repetidas`).
                const antes = clusterDaEtiqueta(dbRef, e);
                if (antes && antes.id != cluster.id) {
                    resultado.movidas.push({
                        nome: e.nome,
                        de: caminhoDoCluster(dbRef, antes),
                        para: caminho,
                    });
                }
            }
            pedidaEm.set(chave, { id: cluster.id, caminho });
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
