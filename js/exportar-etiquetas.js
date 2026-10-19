// ============================================================
// exportar-etiquetas.js: exporta o cadastro de Etiquetas (Tags), por
// categoria, com a contagem de textos e o tag cluster de cada uma, para um
// .md.
//
// Mesmo propósito e mesmo molde de exportar-assuntos.js, exportar-temas.js
// e exportar-tag-clusters.js: levar a lista para uma IA de fora e pedir
// ajuda para triar (por exemplo, o que está em "Outros (triagem)" ou o que
// ainda não tem cluster). Por isso o formato é texto simples, sem tabela,
// com a contagem de textos ao lado de cada etiqueta.
//
// Só leitura e sem seleção: o cadastro inteiro é pequeno. Lógica pura
// (`gerarMarkdownEtiquetas`); o download fica à parte.
// ============================================================

import { ETIQUETAS_CATEGORIAS, ROTULOS_ETIQUETAS, contarTextosPorEtiqueta } from './etiquetas.js';
import { caminhoDoCluster, clusterDaEtiqueta } from './tag-clusters.js';

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

// Uma nota pode ter várias linhas; no .md ela vira uma linha só para não
// quebrar o item da lista.
const notaEmUmaLinha = (notas) =>
    String(notas || '')
        .replace(/\s+/g, ' ')
        .trim();

// Mesmo rótulo da aba: "Outros" aparece como "Outros (triagem)".
const rotuloDaCategoria = (categoria) =>
    categoria === 'outros' ? 'Outros (triagem)' : ROTULOS_ETIQUETAS[categoria];

// Uma etiqueta: nome, contagem de textos e, se houver, o cluster (com o
// pai, "Pai > Sub") e a nota.
function etiquetaParaMarkdown(dbRef, etiqueta, textos) {
    let md = `- ${etiqueta.nome} (${textos})`;
    const cluster = clusterDaEtiqueta(dbRef, etiqueta);
    if (cluster) md += `. Cluster: ${caminhoDoCluster(dbRef, cluster)}`;
    const nota = notaEmUmaLinha(etiqueta.notas);
    if (nota) md += `\n  Notas: ${nota}`;
    return md;
}

// Devolve o .md completo: uma seção por categoria (na ordem da aba; só as
// que têm etiqueta), cada uma em ordem alfabética. O número entre
// parênteses é a quantidade de textos (Poemas e Prosas) com a etiqueta; 0
// quer dizer etiqueta cadastrada que nenhum texto usa ainda. A soma das
// contagens não é o total de textos, porque um texto tem várias etiquetas.
export function gerarMarkdownEtiquetas(dbRef) {
    const uso = contarTextosPorEtiqueta(dbRef);
    const todas = dbRef.etiquetas || [];

    let md = '# Etiquetas (Tags)\n\n';
    if (todas.length === 0) return `${md}_Nenhuma etiqueta cadastrada ainda._\n`;

    const semTexto = todas.filter((e) => !uso.get(e.id)).length;
    md += `${plural(todas.length, 'etiqueta', 'etiquetas')}, ${semTexto} sem texto. `;
    md += 'O número entre parênteses é a quantidade de textos com a etiqueta.\n';

    Object.keys(ETIQUETAS_CATEGORIAS).forEach((categoria) => {
        const daCategoria = todas
            .filter((e) => e.categoria === categoria)
            .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        if (daCategoria.length === 0) return;
        md += `\n## ${rotuloDaCategoria(categoria)}\n\n`;
        if (categoria === 'outros') md += '_O que ainda não tem categoria._\n\n';
        md +=
            daCategoria.map((e) => etiquetaParaMarkdown(dbRef, e, uso.get(e.id) || 0)).join('\n') +
            '\n';
    });

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

export function baixarEtiquetasMarkdown(dbRef) {
    baixarArquivo(gerarMarkdownEtiquetas(dbRef), 'text/markdown', 'etiquetas.md');
}
