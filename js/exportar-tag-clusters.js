// ============================================================
// exportar-tag-clusters.js: exporta o cadastro de tag clusters (com as
// etiquetas de cada um) e a triagem "Etiquetas sem cluster" para um .md.
//
// Mesmo propósito e mesmo molde de exportar-assuntos.js: levar a lista
// para uma IA de fora e pedir ajuda para agrupar as etiquetas que ainda
// não têm cluster. Por isso o formato é texto simples, sem tabela, com a
// contagem de textos ao lado de cada etiqueta.
//
// Só leitura. Leva o cadastro inteiro, o que a tela mostra (busca e categoria)
// ou só os cartões marcados (`filtro.selecao`). Lógica pura
// (`gerarMarkdownTagClusters`); o download fica à parte.
// ============================================================

import { ROTULOS_ETIQUETAS, contarTextosPorEtiqueta } from './etiquetas.js';
import {
    CATEGORIAS_EM_ORDEM,
    clustersDaCategoria,
    etiquetasDoCluster,
    contarTextosPorCluster,
} from './tag-clusters.js';
import { descricaoFiltro, sufixoNomeArquivo } from './exportar-tag-clusters-png.js';
import { recorteTagClusters } from './selecao-tag-clusters.js';

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

// Um cluster (### se for de topo, #### se for subcluster). O pai lista as
// etiquetas postas direto nele e, depois da nota, os subclusters aninhados:
// quem está dentro de quem aparece pela posição e pelo nível do título.
// A contagem do pai é a união dos textos dele e dos subclusters.
function clusterParaMarkdown(
    dbRef,
    cluster,
    usoEtiquetas,
    usoClusters,
    nivel = 3,
    subs = [],
    nome = cluster.nome,
) {
    const marca = '#'.repeat(nivel);
    const etiquetas = etiquetasDoCluster(dbRef, cluster.id);
    let md = `${marca} ${nome} (${plural(usoClusters.get(cluster.id) || 0, 'texto', 'textos')})\n`;
    if (etiquetas.length) {
        md += `\n${etiquetas.map((e) => `- ${e.nome} (${usoEtiquetas.get(e.id) || 0})`).join('\n')}\n`;
    } else if (subs.length === 0) {
        md += '\n- (nenhuma etiqueta ainda)\n';
    }
    if (cluster.notas) md += `\n**Notas:** ${cluster.notas}\n`;
    subs.forEach((sub) => {
        md += `\n${clusterParaMarkdown(dbRef, sub, usoEtiquetas, usoClusters, 4)}`;
    });
    return md;
}

// Devolve o .md completo. Para cada categoria que aceita cluster (em ordem
// alfabética): os tag clusters de topo dela (em ordem alfabética), cada um
// com as etiquetas, a contagem de textos e os subclusters aninhados, e depois as etiquetas dessa categoria sem cluster
// (mais usadas primeiro). Categoria sem nenhuma etiqueta nem cluster não
// aparece. A contagem do cluster não soma o total de textos, porque um
// texto tem várias etiquetas (F17-D1).
export function gerarMarkdownTagClusters(dbRef, filtro = {}) {
    const usoEtiquetas = contarTextosPorEtiqueta(dbRef);
    const usoClusters = contarTextosPorCluster(dbRef);
    const { arvore, soltas: soltasFiltradas } = recorteTagClusters(dbRef, filtro);
    const descricao = descricaoFiltro(filtro);
    const secoes = [];

    CATEGORIAS_EM_ORDEM.forEach((categoria) => {
        const clusters = arvore.filter((n) => n.categoria === categoria);
        const temCluster = clustersDaCategoria(dbRef, categoria).length > 0;
        const soltas = soltasFiltradas
            .filter((e) => e.categoria === categoria)
            .sort(
                (a, b) =>
                    (usoEtiquetas.get(b.id) || 0) - (usoEtiquetas.get(a.id) || 0) ||
                    a.nome.localeCompare(b.nome, 'pt-BR'),
            );
        if (clusters.length === 0 && soltas.length === 0) return;
        let md = `## ${ROTULOS_ETIQUETAS[categoria]}\n\n`;
        if (clusters.length) {
            md += clusters
                .map(({ topo, subs, nome }) =>
                    clusterParaMarkdown(dbRef, topo, usoEtiquetas, usoClusters, 3, subs, nome),
                )
                .join('\n');
        } else if (!temCluster) {
            md += '_Nenhum tag cluster nesta categoria ainda._\n';
        }
        // Com filtro, "nenhuma sem cluster" seria enganoso: ela só não passou.
        if (soltas.length || !descricao) {
            md += '\n### Etiquetas sem cluster\n\n';
            md += soltas.length
                ? soltas.map((e) => `- ${e.nome} (${usoEtiquetas.get(e.id) || 0})`).join('\n') +
                  '\n'
                : '_Nenhuma: todas as etiquetas desta categoria já estão em um tag cluster._\n';
        }
        secoes.push(md);
    });

    let md = '# Tag clusters\n\n';
    if (descricao) md += `_Filtro: ${descricao}._\n\n`;
    md += secoes.length
        ? secoes.join('\n---\n\n')
        : descricao
          ? '_Nada bate com o filtro._\n'
          : '_Nenhum tag cluster nem etiqueta cadastrados ainda._\n';
    return md;
}

function baixarArquivo(conteudo, tipoMime, nomeArquivo) {
    const blob = new Blob([conteudo], { type: `${tipoMime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

export function baixarTagClustersMarkdown(dbRef, filtro = {}) {
    baixarArquivo(
        gerarMarkdownTagClusters(dbRef, filtro),
        'text/markdown',
        `tag-clusters${sufixoNomeArquivo(filtro)}.md`,
    );
}
