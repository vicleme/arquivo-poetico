// ============================================================
// exportar-docx.js — Exportação em Word (.docx), terceira ponta ao
// lado de exportar-md.js e exportar-pdf.js.
//
// Mesma filosofia dos outros dois: reaproveita itemParaMarkdownPartes
// (exportar-md.js) pra tudo em volta do corpo do Texto — meta, Notas,
// Anexos etc. — assim os três formatos nunca divergem em QUAIS campos
// entram nem em que ordem. O corpo do Texto em si reaproveita
// corpoParaLinhasRicas (exportar-pdf.js) — as mesmas runs
// (texto/negrito/itálico/sublinhado/cor/tamanho/alinhamento) que o PDF
// desenha, só que aqui viram HTML em vez de comandos de desenho —
// então negrito/itálico/sublinhado/cor sobrevivem no .docx igual já
// sobrevivem no PDF (o .md "achata" tudo isso, ver corpoParaMarkdown).
//
// Geração de verdade (HTML → .docx) fica por conta do html-docx-js,
// vendorizado via CDN (ver <script> em index.html, mesmo padrão do
// jsPDF) — carrega só quando o botão "Baixar em .docx" é usado pela
// primeira vez.
// ============================================================

import { itemParaMarkdownPartes } from './exportar-md.js';
import { corpoParaLinhasRicas } from './exportar-pdf.js';

function obterConversorDocx() {
    return window.htmlDocx || null;
}

function escaparHtml(texto) {
    return String(texto ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// ─── Markdown "simples" → HTML ──────────────────────────────────────────
// Cobre só o subconjunto de Markdown que itemParaMarkdownPartes de fato
// produz (ver exportar-md.js): #/##/### (título geral/item/seção),
// listas "- ", citação "> ", **negrito**, *itálico* (asterisco único,
// usado nas notas/anexos — diferente do _itálico_ do corpo do Texto,
// que tem tratamento próprio abaixo), links [texto](url) e "---" como
// separador. Não é um parser de Markdown genérico — não precisa ser,
// já que só recebe Markdown gerado por itemParaMarkdownPartes.
function inlineParaHtml(texto) {
    let t = escaparHtml(texto);
    t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/\*(.+?)\*/g, '<em>$1</em>');
    return t;
}

function markdownParaHtml(md) {
    let html = '';
    let emLista = false;
    let emCitacao = false;

    function fecharLista() {
        if (emLista) {
            html += '</ul>';
            emLista = false;
        }
    }
    function fecharCitacao() {
        if (emCitacao) {
            html += '</blockquote>';
            emCitacao = false;
        }
    }

    md.split('\n').forEach((linhaBruta) => {
        const linha = linhaBruta.trim();
        if (!linha) {
            fecharLista();
            fecharCitacao();
            return;
        }
        if (linha === '---') {
            fecharLista();
            fecharCitacao();
            html += '<hr>';
            return;
        }

        const tituloMatch = linha.match(/^(#{1,3})\s+(.*)$/);
        if (tituloMatch) {
            fecharLista();
            fecharCitacao();
            const nivel = tituloMatch[1].length; // # -> h1, ## -> h2, ### -> h3
            html += `<h${nivel}>${inlineParaHtml(tituloMatch[2])}</h${nivel}>`;
            return;
        }

        if (linha.startsWith('> ')) {
            fecharLista();
            if (!emCitacao) {
                html += '<blockquote>';
                emCitacao = true;
            }
            html += `<p>${inlineParaHtml(linha.slice(2))}</p>`;
            return;
        }
        fecharCitacao();

        const listaMatch = linha.match(/^- (.*)$/);
        if (listaMatch) {
            if (!emLista) {
                html += '<ul>';
                emLista = true;
            }
            html += `<li>${inlineParaHtml(listaMatch[1])}</li>`;
            return;
        }
        fecharLista();

        html += `<p>${inlineParaHtml(linha)}</p>`;
    });

    fecharLista();
    fecharCitacao();
    return html;
}

// ─── Corpo rico do Texto ────────────────────────────────────────────────
// corpoParaLinhasRicas (exportar-pdf.js) já resolve a cascata de
// **negrito**/_itálico_/<u>/<div style="...">  em runs com estilo
// definitivo — aqui só converte cada run num <span> com o estilo
// equivalente em CSS inline. Cada "linha" das runs vira seu próprio
// <p> (não reflui como parágrafo comum): poesia depende da quebra de
// verso a verso, igual o PDF preserva linha a linha.
function corpoParaHtml(textoOriginal) {
    const linhas = corpoParaLinhasRicas(textoOriginal || '');
    let html = '';

    linhas.forEach((runsDaLinha) => {
        if (!runsDaLinha.length) {
            html += '<p>&nbsp;</p>';
            return;
        }

        const alinhamento = runsDaLinha.find((r) => r.alinhamento)?.alinhamento || 'left';
        const conteudo = runsDaLinha
            .map((run) => {
                const estilos = [];
                if (run.negrito) estilos.push('font-weight:bold');
                if (run.italico) estilos.push('font-style:italic');
                if (run.sublinhado) estilos.push('text-decoration:underline');
                if (run.cor) estilos.push(`color:rgb(${run.cor.r},${run.cor.g},${run.cor.b})`);
                if (run.tamanho) estilos.push(`font-size:${run.tamanho}pt`);
                const styleAttr = estilos.length ? ` style="${estilos.join(';')}"` : '';
                return `<span${styleAttr}>${escaparHtml(run.texto)}</span>`;
            })
            .join('');

        html += `<p style="margin:0;text-align:${alinhamento}">${conteudo}</p>`;
    });

    return html;
}

// ─── Documento completo ─────────────────────────────────────────────────
// Mesma estrutura de gerarPdfExportacao (exportar-pdf.js): corta o
// Markdown de "antesDoTexto" bem no marcador "### Texto\n\n" e troca o
// que viria depois (o corpo achatado) pelo corpo rico em HTML.
export function gerarDocxHtmlExportacao(itens) {
    const agora = new Date();
    const dataStr = agora.toLocaleDateString('pt-BR');

    let corpo = markdownParaHtml(
        `# Exportação Poética\n\n_Gerado em ${dataStr} — ${itens.length} texto(s)._\n\n---\n\n`,
    );

    itens.forEach((item, i) => {
        const { antesDoTexto, depoisDoTexto } = itemParaMarkdownPartes(item, i + 1);

        const marcador = '### Texto\n\n';
        const indiceMarcador = antesDoTexto.indexOf(marcador);
        if (indiceMarcador === -1) {
            corpo += markdownParaHtml(antesDoTexto);
        } else {
            corpo += markdownParaHtml(antesDoTexto.slice(0, indiceMarcador + marcador.length));
            corpo += corpoParaHtml(item.texto);
        }

        corpo += markdownParaHtml(depoisDoTexto);
        corpo += markdownParaHtml('---\n\n');
    });

    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${corpo}</body></html>`;
}

export function baixarDocx(itens, nomeArquivo) {
    const htmlDocx = obterConversorDocx();
    if (!htmlDocx) {
        throw new Error(
            'A biblioteca de .docx não carregou (verifique a conexão com a internet) — tente novamente em alguns segundos.',
        );
    }

    const html = gerarDocxHtmlExportacao(itens);
    const blob = htmlDocx.asBlob(html);
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
