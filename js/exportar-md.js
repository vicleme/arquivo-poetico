// ============================================================
// exportar-md.js — Exportação seletiva em Markdown (.md)
//
// Mesma seleção/filtros de exportar.js (gerarExportacaoSeletiva),
// só que em vez de um JSON compacto, gera um documento .md legível
// tanto por humanos quanto por IAs: um cabeçalho por texto, com
// todos os campos preenchidos daquele Poema/Prosa por extenso —
// só omite os campos vazios, pra não poluir o documento.
//
// JSON continua sendo o formato "de trabalho" (reimportável, mais
// compacto); .md é o formato "de leitura" — não é reimportado de
// volta pro acervo.
// ============================================================

import { formatarDataParcial, formatarEpocaRetratada, estaPublicado } from './utils.js';

const INFO_STATUS = {
    publicado: { emoji: '🟢', titulo: 'Publicado' },
    incompleto: { emoji: '🟡', titulo: 'Incompleto' },
    migrado: { emoji: '🔵', titulo: 'Migrado' },
    descartado: { emoji: '🔴', titulo: 'Descartado' },
    completo: { emoji: '⚪', titulo: 'Completo' },
};

// ─── Corpo do texto: HTML da textarea rica → Markdown legível ─────────────
// A textarea já guarda **negrito**/_itálico_ como Markdown puro (inseridos
// pela toolbar via wrapText) — só <u> (sublinhado) e os <div style="...">
// de cor/fonte/tamanho/alinhamento (de applyStyle) são HTML de verdade.
// <u> é mantido como está (Markdown aceita HTML inline, a maioria dos
// leitores renderiza); os <div> de estilo não têm equivalente em Markdown
// puro, então só sobra o texto de dentro, sem a formatação visual.
//
// Quebras de linha da textarea viram "hard breaks" (2 espaços + \n) linha
// a linha, preservando a quebra de verso a verso — importante pra poesia,
// onde uma linha em branco simples (parágrafo) juntaria os versos.
function corpoParaMarkdown(texto) {
    if (!texto) return '';

    const semDivsDeEstilo = texto
        .replace(/<div style="[^"]*"[^>]*>/gi, '')
        .replace(/<\/div>/gi, '');

    return semDivsDeEstilo
        .split('\n')
        .map((linha) => linha.replace(/\s+$/, '')) // evita hard-break duplicado sobre espaço já existente
        .join('  \n');
}

// ─── Campos auxiliares ─────────────────────────────────────────────────

function livroSecaoStr(ls) {
    if (!ls) return null;
    const partes = [ls.livro, ls.secao].filter(Boolean);
    return partes.length ? partes.join(' / ') : null;
}

function linhaMeta(rotulo, valor) {
    return valor ? `- **${rotulo}:** ${valor}\n` : '';
}

function blocoTexto(titulo, texto) {
    const t = (texto || '').trim();
    return t ? `### ${titulo}\n\n${t}\n\n` : '';
}

// ─── Um item (Poema ou Prosa) → seção Markdown ─────────────────────────
function itemParaMarkdown(item, indice) {
    const tipoLabel = item.tipo === 'prosa' ? 'Prosa' : 'Poema';
    let md = `## ${indice}. "${item.titulo || '(sem título)'}" *(${tipoLabel})*\n\n`;

    const ctx = item.contexto || {};
    const caminho = [ctx.livro, ctx.parte, ctx.secao].filter(Boolean).join(' → ');
    md += linhaMeta('Localização', caminho || null);

    if (item.status) {
        const info = INFO_STATUS[item.status] || { emoji: '⚪', titulo: item.status };
        md += linhaMeta('Status', `${info.emoji} ${info.titulo}`);
    } else {
        md += linhaMeta('Publicado', estaPublicado(item) ? 'Sim' : 'Não (rascunho)');
    }

    if (item.dataEscrita) {
        const aprox = item.dataEscrita.exata ? '' : ' (aproximada)';
        md += linhaMeta('Escrito em', `${formatarDataParcial(item.dataEscrita)}${aprox}`);
    }
    if (item.dataPublicacao) {
        md += linhaMeta('Primeira publicação', formatarDataParcial(item.dataPublicacao));
    }
    if (item.epocaRetratada) {
        md += linhaMeta('Época retratada', formatarEpocaRetratada(item.epocaRetratada));
    }
    md += linhaMeta('Dedicado a / Sobre quem', item.pessoas || null);
    md += linhaMeta('Sinalizações', item.sinalizacoes || null);
    if (item.genero) md += linhaMeta('Gênero', item.genero);

    md += '\n';
    md += blocoTexto('Texto', corpoParaMarkdown(item.texto));
    md += blocoTexto('Notas', item.notas);
    md += blocoTexto('Descrição Visual', item.descricaoVisual);
    md += blocoTexto('Contexto Histórico/Pessoal', item.contextoHistorico);
    md += blocoTexto('Ocultação', item.ocultacao);

    if (Array.isArray(item.intertextualidade) && item.intertextualidade.length) {
        md += '### Intertextualidade\n\n';
        item.intertextualidade.forEach((it) => {
            const prefixo = it.tipo ? `**${it.tipo}:** ` : '';
            md += `- ${prefixo}${it.texto || ''}\n`;
        });
        md += '\n';
    }

    if (Array.isArray(item.anexos) && item.anexos.length) {
        md += '### Anexos\n\n';
        item.anexos.forEach((a) => {
            const prefixo = a.tipo ? `**${a.tipo}:** ` : '';
            const link = a.link ? ` — ${a.link}` : '';
            md += `- ${prefixo}${a.texto || ''}${link}\n`;
        });
        md += '\n';
    }

    // Conteúdo Sensível / Vocabulário Hiperacionante em destaque (blockquote),
    // já que sinalizam algo que quem lê deveria notar antes do texto em si.
    if ((item.conteudoSensivel || '').trim()) {
        md += `### ⚠️ Conteúdo Sensível\n\n> ${item.conteudoSensivel.trim().split('\n').join('\n> ')}\n\n`;
    }
    if ((item.vocabularioHiperacionante || '').trim()) {
        md += `### ⚠️ Vocabulário Hiperacionante\n\n> ${item.vocabularioHiperacionante.trim().split('\n').join('\n> ')}\n\n`;
    }

    const cortado = livroSecaoStr(item.cortadoDe);
    const lancado = livroSecaoStr(item.lancadoEm);
    if (cortado || lancado) {
        md += '### Migração entre livros\n\n';
        if (cortado) md += `- Cortado de: ${cortado}\n`;
        if (lancado) md += `- Lançado em: ${lancado}\n`;
        md += '\n';
    }

    md += blocoTexto('Descarte', item.descarte);

    return md;
}

// ─── Documento completo ─────────────────────────────────────────────────
export function gerarMarkdownExportacao(itens) {
    const agora = new Date();
    const dataStr = agora.toLocaleDateString('pt-BR');

    let md = `# Exportação Poética\n\n`;
    md += `_Gerado em ${dataStr} — ${itens.length} texto(s)._\n\n`;
    md += `---\n\n`;

    itens.forEach((item, i) => {
        md += itemParaMarkdown(item, i + 1);
        md += `---\n\n`;
    });

    return md;
}

export function baixarMarkdown(itens, nomeArquivo) {
    const conteudo = gerarMarkdownExportacao(itens);
    const blob = new Blob([conteudo], { type: 'text/markdown;charset=utf-8' });
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
