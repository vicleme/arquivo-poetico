// ============================================================
// exportar-temas.js: exporta o cadastro de Temas (com os Assuntos de cada
// um e a contagem de textos) para um .md.
//
// Mesmo propósito e mesmo molde de exportar-assuntos.js e
// exportar-tag-clusters.js: levar a lista para uma IA de fora e pedir
// ajuda para organizar, por exemplo, os temas que ainda não têm assunto.
// Por isso o formato é texto simples, sem tabela, com a contagem de textos
// ao lado de cada tema.
//
// Só leitura e sem seleção: o cadastro inteiro é pequeno. Lógica pura
// (`gerarMarkdownTemas`); o download fica à parte.
// ============================================================

import { contarTextosPorTema } from './temas.js';
import { chaveTema } from './utils.js';

const ordemAlfabetica = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR');
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

// Uma nota pode ter várias linhas; no .md ela vira uma linha só para não
// quebrar o item da lista.
const notaEmUmaLinha = (notas) =>
    String(notas || '')
        .replace(/\s+/g, ' ')
        .trim();

// Um tema: nome, contagem de textos e, se houver, os assuntos e a nota.
function temaParaMarkdown({ tema, textos, assuntos }) {
    let md = `- ${tema.nome} (${textos})`;
    if (assuntos.length) md += `. Assuntos: ${assuntos.map((a) => a.nome).join(', ')}`;
    const nota = notaEmUmaLinha(tema.notas);
    if (nota) md += `\n  Notas: ${nota}`;
    return md;
}

// Devolve o .md completo: os temas que têm assunto e, depois, os que não
// têm (a mesma triagem da aba), cada grupo em ordem alfabética. O número
// entre parênteses é a quantidade de textos (Poemas e Prosas) com o tema;
// 0 quer dizer tema cadastrado que nenhum texto usa ainda.
export function gerarMarkdownTemas(dbRef) {
    const contagem = contarTextosPorTema(dbRef);
    const assuntos = [...(dbRef.assuntos || [])].sort(ordemAlfabetica);

    const linhas = [...(dbRef.temas || [])].sort(ordemAlfabetica).map((tema) => ({
        tema,
        textos: contagem.get(chaveTema(tema.nome)) || 0,
        assuntos: assuntos.filter((a) =>
            (a.temaIds || []).some((id) => String(id) === String(tema.id)),
        ),
    }));

    const comAssunto = linhas.filter((l) => l.assuntos.length > 0);
    const semAssunto = linhas.filter((l) => l.assuntos.length === 0);

    let md = '# Temas\n\n';
    if (linhas.length === 0) return `${md}_Nenhum tema cadastrado ainda._\n`;

    md += `${plural(linhas.length, 'tema', 'temas')}, ${semAssunto.length} sem assunto. `;
    md += 'O número entre parênteses é a quantidade de textos com o tema.\n';

    md += '\n## Temas com assunto\n\n';
    md += comAssunto.length
        ? comAssunto.map(temaParaMarkdown).join('\n') + '\n'
        : '_Nenhum: ainda não há tema ligado a um assunto._\n';

    md += '\n## Temas sem assunto\n\n';
    md += semAssunto.length
        ? semAssunto.map(temaParaMarkdown).join('\n') + '\n'
        : '_Nenhum: todos os temas já pertencem a algum assunto._\n';

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

export function baixarTemasMarkdown(dbRef) {
    baixarArquivo(gerarMarkdownTemas(dbRef), 'text/markdown', 'temas.md');
}
