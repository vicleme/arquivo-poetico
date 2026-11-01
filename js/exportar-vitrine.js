// ============================================================
// exportar-vitrine.js: exporta a Vitrine de leitura (os convites do sorteio
// de texto, cada um com os temas que reúne) para um .md, com os temas que
// ficaram fora da vitrine no fim.
//
// Mesmo propósito e mesmo molde de exportar-temas.js e exportar-assuntos.js:
// levar a lista para uma IA de fora e pedir ajuda, aqui para decidir em que
// convite cada tema solto caberia. Por isso o formato é texto simples, sem
// tabela, com a contagem de textos ao lado de cada tema.
//
// Só leitura e sem seleção: a vitrine tem no máximo 12 convites. Lógica pura
// (`gerarMarkdownVitrine`); o download fica à parte.
// ============================================================

import { contarTextosPorTema } from './temas.js';
import { chaveTema } from './utils.js';
import { listarTemasUniversais, universaisDoTema } from './temas-universais.js';

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const porNome = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR');

// Devolve o .md completo: um `##` por convite, na ordem da tela, com os temas
// dele em ordem alfabética, e por fim "Temas fora da vitrine" (os que nenhum
// convite reúne), os mais usados primeiro e, no empate, em ordem alfabética.
// O número ao lado de cada tema é a quantidade de textos (Poemas e Prosas)
// com ele; 0 quer dizer tema cadastrado que nenhum texto usa ainda.
export function gerarMarkdownVitrine(dbRef) {
    const temas = dbRef.temas || [];
    const convites = listarTemasUniversais(dbRef);
    let md = '# Vitrine de leitura\n\n';
    if (temas.length === 0 && convites.length === 0) {
        return `${md}_Nenhum tema cadastrado ainda._\n`;
    }

    const contagem = contarTextosPorTema(dbRef);
    const textosDe = (tema) => contagem.get(chaveTema(tema.nome)) || 0;
    const temaPorId = new Map(temas.map((t) => [String(t.id), t]));
    const linhaDoTema = (t) => `- ${t.nome} (${textosDe(t)})`;

    const fora = temas
        .filter((t) => universaisDoTema(dbRef, t.id).length === 0)
        .sort((a, b) => textosDe(b) - textosDe(a) || porNome(a, b));

    md += `${plural(convites.length, 'convite', 'convites')}, ${plural(
        fora.length,
        'tema fora da vitrine',
        'temas fora da vitrine',
    )}. `;
    md += 'O número entre parênteses é a quantidade de textos com o tema.\n';

    if (convites.length === 0) {
        md += '\n_Nenhum convite ainda: todos os temas estão fora da vitrine._\n';
    }
    convites.forEach((convite) => {
        const doConvite = (convite.temaIds || [])
            .map((id) => temaPorId.get(String(id)))
            .filter(Boolean)
            .sort(porNome);
        md += `\n## ${convite.nome} (${plural(doConvite.length, 'tema', 'temas')})\n\n`;
        md += doConvite.length
            ? doConvite.map(linhaDoTema).join('\n') + '\n'
            : '_Nenhum tema ainda (o convite fica escondido do sorteio)._\n';
    });

    md += `\n## Temas fora da vitrine (${fora.length})\n\n`;
    md += fora.length
        ? fora.map(linhaDoTema).join('\n') + '\n'
        : '_Nenhum: todos os temas já estão em algum convite._\n';

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

export function baixarVitrineMarkdown(dbRef) {
    baixarArquivo(gerarMarkdownVitrine(dbRef), 'text/markdown', 'vitrine.md');
}
