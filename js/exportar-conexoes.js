// ============================================================
// exportar-conexoes.js — Relatório da aba Conexões (Elos e Ecos).
//
// Pedido do Victor (19/10/2026): baixar, na aba Conexões, um relatório
// com todas as conexões, só os Elos ou só os Ecos, em .md, .png e .pdf.
// Este módulo cobre o .md (entrega 1); .png e .pdf vêm nas entregas
// seguintes (desenho em exportar-conexoes-png.js) e usam os mesmos escopos.
//
// O .md traz o que cabe no formato: texto simples, sem diagrama. Cada
// aresta vira uma linha, como na tela (render-conexoes.js); o desenho
// em colunas fica para o .png e o .pdf.
//
// A lógica é pura: recebe os dados já calculados por render-conexoes.js
// (calcularBuracos, agruparElos, montarGrafosEcos), então não toca o
// banco nem o DOM. Só `baixarConexoesMarkdown` usa o DOM.
// ============================================================

// 'selecao' é o relatório só com os cartões que a pessoa marcou na aba
// (os dados já chegam filtrados por selecao-conexoes.js).
export const ESCOPOS_CONEXOES = ['tudo', 'elos', 'ecos', 'selecao'];

export const NOME_ARQUIVO_CONEXOES = {
    tudo: 'conexoes',
    elos: 'conexoes-elos',
    ecos: 'conexoes-ecos',
    selecao: 'conexoes-selecao',
};

// Quais seções entram no relatório. Nos escopos fixos, a seção entra mesmo
// vazia (e avisa que não há nada); na seleção só entra o que tem item marcado.
export function secoesDoEscopo(escopo, dados) {
    if (escopo === 'elos') return { buracos: true, elos: true, ecos: false };
    if (escopo === 'ecos') return { buracos: false, elos: false, ecos: true };
    if (escopo === 'selecao') {
        return {
            buracos: Boolean(dados?.buracos?.length),
            elos: Boolean(dados?.clusters?.length),
            ecos: Boolean(dados?.grafos?.length),
        };
    }
    return { buracos: true, elos: true, ecos: true };
}

function titulo(t) {
    return t && String(t).trim() ? String(t).trim() : '(sem título)';
}

function plural(n, singular, pluralForma) {
    return `${n} ${n === 1 ? singular : pluralForma}`;
}

// ─── Buracos ────────────────────────────────────────────────────

function secaoBuracos(buracos) {
    let md = '## Buracos (Elos com só um lado cadastrado)\n\n';
    if (!buracos.length) {
        return md + '_Nenhum: todo Elo registrado tem os dois lados._\n';
    }
    md += buracos
        .map((b) => {
            const rotulo = b.rotulo ? ` (${b.rotulo})` : '';
            return `- ${titulo(b.deTitulo)}${rotulo} → ${titulo(b.paraTitulo)}. Falta o vínculo de volta.`;
        })
        .join('\n');
    return md + '\n';
}

// ─── Elos ───────────────────────────────────────────────────────

function linhaElo(a) {
    const rotulo = a.rotulo ? ` (${a.rotulo})` : '';
    return `- ${titulo(a.aTitulo)}${rotulo} ↔ ${titulo(a.bTitulo)}`;
}

function secaoElos(clusters) {
    let md = '## Elos (pares e clusters)\n\n';
    if (!clusters.length) return md + '_Nenhum Elo cadastrado ainda._\n';

    md +=
        'Cada linha é um Elo registrado. O rótulo entre parênteses é o do lado de quem o registrou.\n';
    let pares = 0;
    let grupos = 0;
    for (const c of clusters) {
        const ehPar = c.tamanho === 2;
        const nome = ehPar ? `Par ${++pares}` : `Cluster ${++grupos} (${c.tamanho} poemas)`;
        md += `\n### ${nome}\n\n${c.arestas.map(linhaElo).join('\n')}\n`;
    }
    return md;
}

// ─── Ecos ───────────────────────────────────────────────────────

function nomeDoNo(grafo, id) {
    return titulo(grafo.nos.find((n) => n.id === id)?.titulo);
}

// Cadeia simples: uma linha só, na ordem do mais novo para o mais
// antigo, com o Tipo de cada Eco antes do texto a que ele aponta.
function cadeiaLinear(grafo) {
    const passos = grafo.camadas.map((c) => c[0]);
    return passos
        .map((id, i) => {
            if (i === 0) return nomeDoNo(grafo, id);
            const aresta = grafo.arestas.find((a) => a.deId === passos[i - 1] && a.paraId === id);
            const tipo = aresta?.tipo ? ` (${aresta.tipo})` : '';
            return `→${tipo} ${nomeDoNo(grafo, id)}`;
        })
        .join(' ');
}

// Grafo com ramificação ou convergência: uma linha por Eco, na ordem
// das camadas do desenho (a camada do nó de origem, depois a posição).
function linhasGrafo(grafo) {
    const ordem = new Map();
    let n = 0;
    grafo.camadas.forEach((camada) => camada.forEach((id) => ordem.set(id, n++)));
    return [...grafo.arestas]
        .sort(
            (x, y) =>
                ordem.get(x.deId) - ordem.get(y.deId) || ordem.get(x.paraId) - ordem.get(y.paraId),
        )
        .map((a) => {
            const tipo = a.tipo ? ` (${a.tipo})` : '';
            return `- ${titulo(a.deTitulo)} →${tipo} ${titulo(a.paraTitulo)}`;
        })
        .join('\n');
}

function secaoEcos(grafos) {
    let md = '## Ecos (cadeias e grafos)\n\n';
    if (!grafos.length) return md + '_Nenhum Eco cadastrado ainda._\n';

    md +=
        'Cada seta vai do texto mais novo, que ecoa, para o mais antigo, que é ecoado. O Tipo do Eco fica entre parênteses.\n';
    let cadeias = 0;
    let complexos = 0;
    for (const g of grafos) {
        if (g.linear) {
            md += `\n### Cadeia ${++cadeias} (${g.nos.length} poemas)\n\n${cadeiaLinear(g)}\n`;
        } else {
            md += `\n### Grafo ${++complexos} (${g.nos.length} poemas, ${plural(g.arestas.length, 'Eco', 'Ecos')})\n\n${linhasGrafo(g)}\n`;
        }
    }
    return md;
}

// ─── Relatório completo ─────────────────────────────────────────

function resumoClusters(clusters) {
    const arestas = clusters.reduce((s, c) => s + c.arestas.length, 0);
    const pares = clusters.filter((c) => c.tamanho === 2).length;
    const grupos = clusters.length - pares;
    return `${plural(arestas, 'Elo', 'Elos')} em ${plural(pares, 'par', 'pares')} e ${plural(grupos, 'cluster', 'clusters')}`;
}

function resumoElos(clusters, buracos) {
    return `${resumoClusters(clusters)}, ${plural(buracos.length, 'buraco', 'buracos')}`;
}

function resumoEcos(grafos) {
    const arestas = grafos.reduce((s, g) => s + g.arestas.length, 0);
    const cadeias = grafos.filter((g) => g.linear).length;
    const complexos = grafos.length - cadeias;
    return `${plural(arestas, 'Eco', 'Ecos')} em ${plural(cadeias, 'cadeia', 'cadeias')} e ${plural(complexos, 'grafo', 'grafos')}`;
}

export const TITULOS_CONEXOES = {
    tudo: 'Conexões',
    elos: 'Conexões: Elos',
    ecos: 'Conexões: Ecos',
    selecao: 'Conexões: seleção',
};

// Frase de contagens que abre o relatório, em qualquer formato.
export function resumoConexoes(dados, escopo = 'tudo') {
    const buracos = dados?.buracos || [];
    const clusters = dados?.clusters || [];
    const grafos = dados?.grafos || [];
    if (escopo === 'selecao') {
        const partes = [];
        if (clusters.length) partes.push(resumoClusters(clusters));
        if (buracos.length) partes.push(plural(buracos.length, 'buraco', 'buracos'));
        if (grafos.length) partes.push(resumoEcos(grafos));
        return partes.length ? `${partes.join('; ')}.` : 'Nada selecionado.';
    }
    if (escopo === 'elos') return `${resumoElos(clusters, buracos)}.`;
    if (escopo === 'ecos') return `${resumoEcos(grafos)}.`;
    return `${resumoElos(clusters, buracos)}; ${resumoEcos(grafos)}.`;
}

// `dados` = { buracos, clusters, grafos }, na forma devolvida por
// calcularBuracos(), agruparElos() e montarGrafosEcos(). `escopo` é
// 'tudo' (padrão), 'elos', 'ecos' ou 'selecao'. Os buracos pertencem aos
// Elos, então saem em 'tudo' e em 'elos' (e na seleção, se marcados).
export function gerarMarkdownConexoes(dados, escopo = 'tudo') {
    const buracos = dados?.buracos || [];
    const clusters = dados?.clusters || [];
    const grafos = dados?.grafos || [];
    const e = ESCOPOS_CONEXOES.includes(escopo) ? escopo : 'tudo';

    const secoes = secoesDoEscopo(e, dados);
    const partes = [`# ${TITULOS_CONEXOES[e]}\n\n${resumoConexoes(dados, e)}\n`];
    if (secoes.buracos) partes.push(secaoBuracos(buracos));
    if (secoes.elos) partes.push(secaoElos(clusters));
    if (secoes.ecos) partes.push(secaoEcos(grafos));
    return partes.join('\n---\n\n');
}

// ─── Download ───────────────────────────────────────────────────

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

export function baixarConexoesMarkdown(dados, escopo = 'tudo') {
    const e = ESCOPOS_CONEXOES.includes(escopo) ? escopo : 'tudo';
    baixarArquivo(
        gerarMarkdownConexoes(dados, e),
        'text/markdown',
        `${NOME_ARQUIVO_CONEXOES[e]}.md`,
    );
}
