// ============================================================
// exportar-tag-clusters.js: exporta o cadastro de tag clusters (com as
// etiquetas de cada um) e a triagem "Etiquetas sem cluster" para um .md.
//
// Mesmo propósito e mesmo molde de exportar-assuntos.js: levar a lista
// para uma IA de fora e pedir ajuda para agrupar as etiquetas que ainda
// não têm cluster. Por isso o formato é texto simples, sem tabela, com a
// contagem de textos ao lado de cada etiqueta.
//
// Só leitura e sem seleção: o cadastro inteiro é pequeno. Lógica pura
// (`gerarMarkdownTagClusters`); o download fica à parte.
// ============================================================

import { ROTULOS_ETIQUETAS, contarTextosPorEtiqueta } from './etiquetas.js';
import {
    CATEGORIAS_EM_ORDEM,
    clustersDaCategoria,
    etiquetasDoCluster,
    etiquetasSemCluster,
    contarTextosPorCluster,
} from './tag-clusters.js';

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

function clusterParaMarkdown(dbRef, cluster, usoEtiquetas, usoClusters) {
    const etiquetas = etiquetasDoCluster(dbRef, cluster.id);
    const linhas = etiquetas.length
        ? etiquetas.map((e) => `- ${e.nome} (${usoEtiquetas.get(e.id) || 0})`).join('\n')
        : '- (nenhuma etiqueta ainda)';
    let md = `### ${cluster.nome} (${plural(usoClusters.get(cluster.id) || 0, 'texto', 'textos')})\n\n${linhas}\n`;
    if (cluster.notas) md += `\n**Notas:** ${cluster.notas}\n`;
    return md;
}

// Devolve o .md completo. Para cada categoria que aceita cluster (em ordem
// alfabética): os tag
// clusters dela (em ordem alfabética), cada um com as etiquetas e a
// contagem de textos, e depois as etiquetas dessa categoria sem cluster
// (mais usadas primeiro). Categoria sem nenhuma etiqueta nem cluster não
// aparece. A contagem do cluster não soma o total de textos, porque um
// texto tem várias etiquetas (F17-D1).
export function gerarMarkdownTagClusters(dbRef) {
    const usoEtiquetas = contarTextosPorEtiqueta(dbRef);
    const usoClusters = contarTextosPorCluster(dbRef);
    const secoes = [];

    CATEGORIAS_EM_ORDEM.forEach((categoria) => {
        const clusters = clustersDaCategoria(dbRef, categoria);
        const soltas = etiquetasSemCluster(dbRef, categoria).sort(
            (a, b) =>
                (usoEtiquetas.get(b.id) || 0) - (usoEtiquetas.get(a.id) || 0) ||
                a.nome.localeCompare(b.nome, 'pt-BR'),
        );
        if (clusters.length === 0 && soltas.length === 0) return;
        let md = `## ${ROTULOS_ETIQUETAS[categoria]}\n\n`;
        md += clusters.length
            ? clusters
                  .map((c) => clusterParaMarkdown(dbRef, c, usoEtiquetas, usoClusters))
                  .join('\n')
            : '_Nenhum tag cluster nesta categoria ainda._\n';
        md += '\n### Etiquetas sem cluster\n\n';
        md += soltas.length
            ? soltas.map((e) => `- ${e.nome} (${usoEtiquetas.get(e.id) || 0})`).join('\n') + '\n'
            : '_Nenhuma: todas as etiquetas desta categoria já estão em um tag cluster._\n';
        secoes.push(md);
    });

    let md = '# Tag clusters\n\n';
    md += secoes.length
        ? secoes.join('\n---\n\n')
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

export function baixarTagClustersMarkdown(dbRef) {
    baixarArquivo(gerarMarkdownTagClusters(dbRef), 'text/markdown', 'tag-clusters.md');
}
