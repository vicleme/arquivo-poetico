// ============================================================
// exportar-assuntos.js — Exporta o cadastro de Assunto (com os Temas de
// cada um) e o painel "Temas sem assunto" para um .md.
//
// Pedido do Victor (29/09/2026): poder levar essa lista pra uma IA de
// fora e pedir ajuda pra agrupar os temas que ainda não têm assunto.
// Por isso o formato prioriza ser fácil de colar num prompt — texto
// simples, sem tabela, contagem de textos ao lado de cada tema — em vez
// de espelhar o header/estrutura de outras exportações .md do acervo.
//
// Só leitura (não seleciona nada, ao contrário de exportar-autores.js):
// a lista inteira de Assuntos é sempre pequena, então não há por que
// pedir uma seleção primeiro.
// ============================================================

import { resumoTemas, temasSemAssunto, chaveTema, nomesTemasDoAssunto } from './utils.js';

// Um Assunto e seus Temas, cada um com a contagem de textos que o usam
// (0 = tema cadastrado no Assunto, mas nenhum texto tem esse tema ainda).
// A busca no mapa de contagem é por chaveTema (ignora caixa/acento),
// igual à comparação usada em toda a feature de Assuntos.
function assuntoParaMarkdown(assunto, contagemPorTema, temasCadastro) {
    const temas = nomesTemasDoAssunto(assunto, temasCadastro);
    const linhasTemas = temas.length
        ? temas.map((t) => `- ${t} (${contagemPorTema.get(chaveTema(t)) || 0})`).join('\n')
        : '- (nenhum tema ainda)';
    let md = `## ${assunto.nome}\n\n${linhasTemas}\n`;
    if (assunto.notas) md += `\n**Notas:** ${assunto.notas}\n`;
    return md;
}

// `textos` = Poemas + Prosas (mesma entrada de renderAssuntos/resumoTemas
// em render-listas.js). Devolve o .md completo: um `##` por Assunto
// cadastrado, na ordem em que aparecem em `assuntos`, e por fim a seção
// "Temas sem assunto" (mais usados primeiro), a mesma lista do painel da
// aba — pra pedir a uma IA que sugira em quais Assuntos eles caberiam.
export function gerarMarkdownAssuntos(assuntos, textos, temasCadastro) {
    const resumo = resumoTemas(textos, assuntos, temasCadastro);
    const contagemPorTema = new Map(resumo.map((t) => [chaveTema(t.nome), t.contagem]));

    let md = '# Assuntos\n\n';
    md +=
        assuntos && assuntos.length
            ? assuntos
                  .map((a) => assuntoParaMarkdown(a, contagemPorTema, temasCadastro))
                  .join('\n---\n\n')
            : '_Nenhum assunto cadastrado ainda._\n';

    const soltos = temasSemAssunto(textos, assuntos, temasCadastro);
    md += '\n---\n\n## Temas sem assunto\n\n';
    md += soltos.length
        ? soltos.map((t) => `- ${t.nome} (${t.contagem})`).join('\n') + '\n'
        : '_Nenhum — todos os temas em uso já pertencem a algum assunto._\n';

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

export function baixarAssuntosMarkdown(assuntos, textos, temasCadastro) {
    baixarArquivo(
        gerarMarkdownAssuntos(assuntos, textos, temasCadastro),
        'text/markdown',
        'assuntos.md',
    );
}
