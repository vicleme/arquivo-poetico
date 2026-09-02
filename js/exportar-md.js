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

import {
    formatarDataParcial,
    formatarEpocaRetratada,
    estaPublicado,
    sinalizacoesCombinadas,
    rotuloElo,
    paresGrupoPessoa,
    paresAutoria,
} from './utils.js';
import { db } from './db.js';

export const INFO_STATUS = {
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

export function livroSecaoStr(ls) {
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

// Elos guarda { id, relacao, direcao, texto } (redesenho Relação+Direção,
// ver rotuloElo em utils.js); Referências guarda { id, tipo, texto }
// (schema mais simples, sem Direção — não mudou). Resolve pros títulos,
// igual titulosPoemasPorId em render-listas.js, só que em texto puro
// (sem HTML) pro Markdown. O rótulo entra como prefixo quando existe, e
// a nota livre (texto) vai entre parênteses no fim.
export function titulosPorIds(lista) {
    if (!Array.isArray(lista) || !lista.length) return null;
    const partes = lista
        .map((entrada) => {
            // Item 4: o alvo pode ser Poema ou Prosa (ver resolverItemVinculado
            // em editor.js / resolverTituloPoemaOuProsa em render-listas.js —
            // mesmo critério aqui: ids nunca colidem entre os dois arrays).
            const titulo = (
                db.poemas.find((p) => p.id == entrada.id) ||
                (db.prosas || []).find((pr) => pr.id == entrada.id)
            )?.titulo;
            if (!titulo) return null;
            const rotulo =
                entrada.relacao !== undefined
                    ? rotuloElo(entrada.relacao, entrada.direcao)
                    : entrada.tipo;
            let s = rotulo ? `${rotulo}: ${titulo}` : titulo;
            if (entrada.texto) s += ` (${entrada.texto})`;
            return s;
        })
        .filter(Boolean);
    return partes.length ? partes.join(', ') : null;
}

// ─── Quantos campos estão preenchidos ──────────────────────────────────
// Mesma lista de campos que itemParaMarkdown() considera (mesma ordem,
// só que aqui cada um vira um true/false em vez de virar texto) — usada
// pela coluna "Campos Preenchidos" (ver colunas.js/render-listas.js) pra
// identificar rapidamente os textos com estrutura mais rica/complexa.
// Uma lista só, testada e referenciada nos dois lugares (contagem e
// TOTAL_CAMPOS_CONSIDERADOS), pra não divergir com o tempo de quais
// campos "contam".
function verificacoesDeCampos(item) {
    const ctx = item.contexto || {};
    return [
        !!(ctx.livro || ctx.parte || ctx.secao),
        !!item.status,
        !!item.dataEscrita,
        !!item.dataPublicacao,
        !!item.epocaRetratada,
        !!textoPessoas(item),
        !!textoGrupos(item),
        !!sinalizacoesCombinadas(item),
        !!item.genero,
        !!titulosPorIds(item.conceitos?.elos),
        !!titulosPorIds(item.conceitos?.referencias),
        !!(item.texto || '').trim(),
        !!(item.notas || '').trim(),
        !!(item.descricaoVisual || '').trim(),
        !!(item.contextoHistorico || '').trim(),
        !!(item.ocultacao || '').trim(),
        Array.isArray(item.intertextualidade) && item.intertextualidade.length > 0,
        Array.isArray(item.anexos) && item.anexos.length > 0,
        !!(item.anexosNotaGeral || '').trim(),
        Array.isArray(item.anotacoesMarginais) && item.anotacoesMarginais.length > 0,
        Array.isArray(item.envios) && item.envios.length > 0,
        Array.isArray(item.reconhecimentos) && item.reconhecimentos.length > 0,
        !!(item.conteudoSensivel || '').trim(),
        !!(item.vocabularioHiperacionante || '').trim(),
        !!livroSecaoStr(item.cortadoDe),
        !!livroSecaoStr(item.lancadoEm),
        !!(item.justificativaMigracao || '').trim(),
        !!(item.pendencia || '').trim(),
        !!(item.descarte || '').trim(),
    ];
}

export function contarCamposPreenchidos(item) {
    return verificacoesDeCampos(item).filter(Boolean).length;
}

// Total de campos considerados na contagem acima — calculado a partir de
// um item vazio (em vez de um número fixo) pra nunca ficar dessincronizado
// se verificacoesDeCampos() ganhar/perder alguma verificação.
export const TOTAL_CAMPOS_CONSIDERADOS = verificacoesDeCampos({}).length;

// ─── Um item (Poema ou Prosa) → seção Markdown ─────────────────────────
// pessoas é array de objeto {pessoaId, papeis} (papeis: array, desde o
// multi-select — ver migrarPapeisPessoa em db.js); o nome não mora mais
// no item, mora no cadastro central db.pessoas (ver
// migrarPessoasParaCadastro em db.js) — resolve pessoaId → nome antes
// de montar o texto. Mostra "Nome (Papel1, Papel2)" quando há papéis
// marcados, na ordem em que foram marcados no editor, só o nome quando
// não há nenhum (mesmo critério de exibição do resto do app — ver
// badgesPessoas em render-listas.js). pessoaId sem correspondência no
// cadastro (não deveria acontecer, mas dado importado de fora pode vir
// incompleto) é ignorado, não quebra a lista pros demais.
export function textoPessoas(item) {
    if (!Array.isArray(item.pessoas)) return null;
    const partes = item.pessoas
        .map((p) => ({ nome: db.pessoas.find((x) => x.id == p.pessoaId)?.nome, papeis: p.papeis }))
        .filter((p) => p.nome)
        .map((p) => (p.papeis && p.papeis.length ? `${p.nome} (${p.papeis.join(', ')})` : p.nome));
    return partes.length ? partes.join(', ') : null;
}

// Grupo a que cada pessoa do item pertence (não é o mesmo dado de
// textoPessoas acima: ali é o papel da pessoa NESTE texto — Retratado(a)/
// Dedicatária/etc.; aqui é o Grupo, característica da própria Pessoa,
// constante entre textos — ver paresGrupoPessoa em utils.js, mesma
// resolução usada na coluna "Grupos" das tabelas — ver badgesGrupos em
// render-listas.js — e no painel do modal — ver renderPainelGrupos em
// editor.js). Formato "Grupo (Pessoa)", não "Pessoa (Grupo)": o pedido
// original foi por essa ordem, pra não confundir com o parêntese de
// papel de textoPessoas.
export function textoGrupos(item) {
    const pares = paresGrupoPessoa(item, db.pessoas, db.grupos);
    if (!pares.length) return null;
    return pares.map(({ grupo, pessoa }) => `${grupo.nome} (${pessoa.nome})`).join(', ');
}

// Autoria: array {autorId, papel} (ver migrarAutoria em db.js) —
// resolve autorId → nome no cadastro central db.autores (ver
// paresAutoria em utils.js). Papel aqui é sempre único e sempre
// preenchido (migração garante isso), então sempre mostra "Nome
// (Papel)" por extenso — diferente de textoPessoas, que só parentiza
// quando há papéis marcados.
export function textoAutoria(item) {
    const pares = paresAutoria(item, db.autores);
    if (!pares.length) return null;
    return pares.map(({ autor, papel }) => `${autor.nome} (${papel})`).join(', ');
}

// `indice` é opcional — omitido (ou falsy), o cabeçalho sai sem
// numeração, útil pra gerar o Markdown de um único item avulso (ex.:
// modal de Visualização) fora do contexto de uma lista exportada.
// Dividido em "antes"/"depois" do bloco de Texto (ver itemParaMarkdownPartes
// logo abaixo) — quem só quer o Markdown final (gerarMarkdownExportacao,
// gerarMarkdownItem) simplesmente concatena os três pedaços, então esse
// refactor não muda o Markdown gerado em nada. O motivo de existir a
// versão dividida: exportar-pdf.js precisa renderizar o corpo do Texto a
// partir do HTML/Markdown híbrido original (cores, negrito, sublinhado,
// itálico — ver corpoParaMarkdown acima, que descarta tudo isso), então
// só reaproveita este Markdown pra tudo em volta do Texto, não pro Texto
// em si.
function itemParaMarkdownAntesDoTexto(item, indice) {
    const tipoLabel = item.tipo === 'prosa' ? 'Prosa' : 'Poema';
    const prefixoNumero = indice ? `${indice}. ` : '';
    let md = `## ${prefixoNumero}"${item.titulo || '(sem título)'}" *(${tipoLabel})*\n\n`;

    const ctx = item.contexto || {};
    const caminho = [ctx.livro, ctx.parte, ctx.secao].filter(Boolean).join(' → ');
    md += linhaMeta('Localização', caminho || null);
    md += linhaMeta('Idioma', item.idioma || null);

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
        md += linhaMeta('Época retratada', formatarEpocaRetratada(item.epocaRetratada, db.epocas));
    }
    md += linhaMeta('Pessoas', textoPessoas(item));
    md += linhaMeta('Grupos', textoGrupos(item));
    md += linhaMeta('Sinalizações', sinalizacoesCombinadas(item) || null);
    if (item.genero) md += linhaMeta('Gênero', item.genero);
    md += linhaMeta('Elos', titulosPorIds(item.conceitos?.elos));
    md += linhaMeta('Referências', titulosPorIds(item.conceitos?.referencias));

    md += '\n';
    md += blocoTexto('Texto', corpoParaMarkdown(item.texto));

    return md;
}

function itemParaMarkdownDepoisDoTexto(item) {
    let md = '';
    md += blocoTexto('Notas', item.notas);
    md += linhaMeta('Autoria', textoAutoria(item));
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
    md += blocoTexto('Nota sobre o conjunto de anexos', item.anexosNotaGeral);

    if (Array.isArray(item.anotacoesMarginais) && item.anotacoesMarginais.length) {
        md += '### Anotações Marginais\n\n';
        item.anotacoesMarginais.forEach((a) => {
            const meta = [a.posicao, a.fonte].filter(Boolean).join(', ');
            const trecho = a.trecho ? `*(${a.trecho})* ` : '';
            const prefixo = meta ? `**${meta}:** ` : '';
            md += `- ${trecho}${prefixo}${a.texto || ''}\n`;
        });
        md += '\n';
    }

    if (Array.isArray(item.envios) && item.envios.length) {
        md += '### Envios e Reações\n\n';
        item.envios.forEach((e) => {
            const partes = [
                e.pessoa,
                e.meio ? `via ${e.meio}` : '',
                e.data && formatarDataParcial(e.data) !== '—' ? formatarDataParcial(e.data) : '',
            ]
                .filter(Boolean)
                .join(', ');
            const prefixo = partes ? `**${partes}:** ` : '';
            const notas = e.notas ? ` *(${e.notas})*` : '';
            md += `- ${prefixo}${e.reacao || ''}${notas}\n`;
        });
        md += '\n';
    }

    if (Array.isArray(item.reconhecimentos) && item.reconhecimentos.length) {
        md += '### Reconhecimentos\n\n';
        item.reconhecimentos.forEach((r) => {
            const ano = r.ano || r.ano === 0 ? String(r.ano) : '';
            const meta = [r.premio, r.posicao, ano].filter(Boolean).join(', ');
            const prefixo = meta ? `**${meta}:** ` : '';
            md += `- ${prefixo}${r.texto || ''}\n`;
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
    md += blocoTexto('Justificativa da Migração', item.justificativaMigracao);

    md += blocoTexto('Pendência', item.pendencia);
    md += blocoTexto('Descarte', item.descarte);

    return md;
}

// { antesDoTexto, depoisDoTexto } — ver comentário de
// itemParaMarkdownAntesDoTexto acima. gerarPdfExportacao (exportar-pdf.js)
// é quem usa a versão dividida; itemParaMarkdown (abaixo) é só as duas
// metades coladas, pro resto do app continuar chamando uma função só.
export function itemParaMarkdownPartes(item, indice) {
    return {
        antesDoTexto: itemParaMarkdownAntesDoTexto(item, indice),
        depoisDoTexto: itemParaMarkdownDepoisDoTexto(item),
    };
}

export function itemParaMarkdown(item, indice) {
    const { antesDoTexto, depoisDoTexto } = itemParaMarkdownPartes(item, indice);
    return antesDoTexto + depoisDoTexto;
}

// Markdown de um único item avulso, sem numeração nem cabeçalho de
// "Exportação Poética" — usado pelo modal de Visualização (ver
// visualizar.js) e por baixarMarkdown() quando chamado com 1 item só.
export function gerarMarkdownItem(item) {
    return itemParaMarkdown(item);
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
