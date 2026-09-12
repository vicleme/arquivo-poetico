// ============================================================
// exportar-sonoridade.js — Exportação de uma Escansão avulsa (aba
// Sonoridade) em .json/.md/.pdf/.docx — mesmos 4 formatos do botão
// Baixar de Poemas/Prosas (ver acoes-coluna.js), pra dar uniformidade
// ao sistema (decisão da sessão que criou este arquivo).
//
// Diferente de exportar-md.js/exportar-pdf.js/exportar-docx.js (que
// reaproveitam itemParaMarkdownPartes pra tudo em volta do corpo de
// Texto de um Poema/Prosa), este módulo NÃO reaproveita aquele
// pipeline — Sonoridade não tem "corpo de texto" nenhum, é dado
// estruturado (7 campos de classificação + a grade silábica/tônica +
// pares de rima), então builda sua própria saída em cada formato, do
// zero, mas usando as MESMAS bibliotecas (jsPDF via window.jspdf, docx
// via window.docx) e o mesmo padrão de download (Blob + <a download>)
// dos outros três exportadores.
//
// A grade em si (linhas/tônicas/letras de rima) vem sempre de
// editor-sonoridade.js — mesmas funções que a grade de edição e a
// visualização somente-leitura usam (calcularLetrasRima,
// calcularPosicaoPar, dividirSilabas, trechoLado), pra nunca divergir
// do que a pessoa vê na tela.
// ============================================================

import { db } from './db.js';
import { mostrarAviso } from './utils.js';
import {
    calcularMaxSilabas,
    calcularLetrasRima,
    calcularPosicaoPar,
    calcularDistanciaPar,
    calcularProximidadePar,
    calcularClassificacaoSonora,
    celulasRimadas,
    corDaLetra,
    dividirSilabas,
    trechoLado,
} from './editor-sonoridade.js';

// ─── Nome de arquivo ────────────────────────────────────────────────
function nomeArquivoSeguro(texto) {
    const base = (texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return base || 'sem-titulo';
}

function resolverEscansaoEPoema(id) {
    const es = db.escansoes.find((x) => x.id == id);
    if (!es) return { es: null, poema: null };
    const poema = db.poemas.find((p) => p.id == es.poemaId) || null;
    return { es, poema };
}

function nomeBaseArquivo(poema, es) {
    return nomeArquivoSeguro(poema?.titulo ? `escansao-${poema.titulo}` : `escansao-${es.id}`);
}

function baixarBlob(blob, nomeArquivo) {
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

// ─── Campos de classificação (comuns aos 3 formatos) ────────────────
// Mesmos 7 campos da tabela/formulário (ver acoes-coluna.js/forms.js),
// mais o Esquema de Rimas junto (Presença + Padrão), igual
// valorColunaSonoridade em render-listas.js já faz pra coluna.
function camposClassificacao(es) {
    const linhas = [
        ['Forma', es.formaPoema],
        ['Regularidade Métrica', es.regularidadeMetrica],
        ['Tamanho do Verso', es.tamanhoVerso],
        ['Esquema de Rimas', [es.esquemaRimasPresenca, es.esquemaRimasPadrao].filter(Boolean).join(' · ')],
        ['Origem/Tradição', es.origemTradicao],
        ['Registro', es.registro],
        ['Tom', es.tom],
    ];
    return linhas.filter(([, valor]) => valor);
}

// Uma entrada por verso: sílabas em bruto (cada uma com sua flag de
// tônica) + a letra de rima (se houver) — usada só pelo .md (texto
// linear "1. sí / la (A)", ** negrito ** na tônica): .pdf e .docx
// desenham a Grade Silábica como TABELA de verdade (ver
// gradeParaTabela, abaixo), não em texto corrido.
function versosParaSilabas(linhas, rimas) {
    const letras = calcularLetrasRima(rimas);
    return linhas
        .filter((l) => l.tipo === 'verso')
        .map((linha) => {
            const idx = linhas.indexOf(linha);
            const silabas = dividirSilabas(linha.texto);
            const tonicas = Array.isArray(linha.tonicas) ? linha.tonicas : [];
            const unidades = silabas.map((texto, i) => ({ texto, tonica: tonicas.includes(i) }));
            const letra = letras.get(idx);
            return { numero: linha.numero, unidades, letra: letra || null };
        });
}

// Hex de cada cor da paleta de rima (PALETA_RIMA em editor-sonoridade.js
// — 'rose'/'emerald'/etc.), pra colorir borda/texto da letra de rima nos
// exportadores em TABELA real (.docx/.pdf). A tela usa classes Tailwind
// (ring-{cor}-400 no claro / -600 no escuro); aqui fixamos um meio-termo
// só (-500), que funciona em qualquer fundo branco de papel.
const CORES_RIMA_HEX = {
    rose: 'F43F5E',
    emerald: '10B981',
    cyan: '06B6D4',
    fuchsia: 'D946EF',
    lime: '84CC16',
    teal: '14B8A6',
    orange: 'F97316',
    indigo: '6366F1',
};

function hexParaRgb(hex) {
    return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
    };
}

// Fundo da sílaba tônica nos exportadores em tabela — mesmo amber-200
// (bg-amber-200) usado em renderGradeLeituraHtml.
const FUNDO_TONICA_RGB = { r: 253, g: 230, b: 138 };
const FUNDO_TONICA_HEX = 'FDE68A';

// ─── Grade Silábica em TABELA real (mesma estrutura de
// renderGradeLeituraHtml em editor-sonoridade.js) — usada pelos
// exportadores .docx/.pdf a pedido do Victor (a tabela alinhada por
// coluna é o que deixa visível o padrão métrico entre versos; o .md
// continua em texto linear "1. sí / la (A)" logo abaixo, já que
// markdown puro não tem tabela alinhada por coluna que sobreviva a
// qualquer visualizador).
//
// Devolve `n` (nº de colunas de sílaba, igual calcularMaxSilabas) e uma
// entrada por linha: `{ tipo: 'vazia' }` (separador entre estrofes, como
// na tela) ou `{ tipo: 'verso', numero, celulas: [{texto, tonica,
// letraRima}], letra }`, uma célula por posição de sílaba (preenchida
// mesmo quando o verso é mais curto que o maior verso do poema — célula
// vazia, sem tônica/rima).
function gradeParaTabela(linhas, rimas) {
    const n = calcularMaxSilabas(linhas);
    const letras = calcularLetrasRima(rimas);
    const rimadas = celulasRimadas(rimas, letras);

    const linhasTabela = linhas.map((linha, idx) => {
        if (linha.tipo !== 'verso') return { tipo: 'vazia' };
        const silabas = dividirSilabas(linha.texto);
        const tonicas = Array.isArray(linha.tonicas) ? linha.tonicas : [];
        const celulas = [];
        for (let i = 0; i < n; i++) {
            const ehReal = i < silabas.length && silabas[i] !== '';
            celulas.push({
                texto: ehReal ? silabas[i] : '',
                tonica: ehReal && tonicas.includes(i),
                letraRima: ehReal ? rimadas.get(`${idx}:${i}`) || null : null,
            });
        }
        return { tipo: 'verso', numero: linha.numero, celulas, letra: letras.get(idx) || null };
    });

    return { n, linhas: linhasTabela };
}

function paresParaTexto(rimas, linhas) {
    const letras = calcularLetrasRima(rimas);
    return [...rimas]
        .sort((r1, r2) => r1.a.linha - r2.a.linha)
        .map((par) => {
            const letra = letras.get(par.a.linha) || '';
            const numA = linhas[par.a.linha]?.numero ?? '?';
            const numB = linhas[par.b.linha]?.numero ?? '?';
            const posicao = calcularPosicaoPar(par, linhas);
            const proximidade = calcularProximidadePar(calcularDistanciaPar(par, linhas));
            const classificacao = [par.acentuacao, par.tonalidade, par.riqueza]
                .filter(Boolean)
                .join(' · ');
            return {
                letra,
                numA,
                numB,
                trechoA: trechoLado(par.a, linhas),
                trechoB: trechoLado(par.b, linhas),
                posicao,
                proximidade,
                classificacao,
            };
        });
}

// Linha de resumo ("Com Rimas mais Próximas (3 vizinhas · 1 distante)")
// repetida nos 3 formatos antes da lista de pares — texto puro aqui,
// cada exportador decide como estilizar (parágrafo simples no .md/.pdf,
// itálico no .docx). `null` quando o poema não tem par nenhum, mesmo
// critério de calcularClassificacaoSonora.
function resumoProximidadeTexto(rimas, linhas) {
    const { vizinhas, distantes, rotulo } = calcularClassificacaoSonora(rimas, linhas);
    if (!rotulo) return null;
    return `${rotulo} (${vizinhas} vizinha${vizinhas === 1 ? '' : 's'} · ${distantes} distante${distantes === 1 ? '' : 's'})`;
}

// ─── .md ──────────────────────────────────────────────────────────
export function escansaoParaMarkdown(es, poema) {
    const linhas = Array.isArray(es.escansaoLinhas) ? es.escansaoLinhas : [];
    const rimas = Array.isArray(es.rimas) ? es.rimas : [];

    let md = `## Escansão — ${poema?.titulo || `#${es.id}`}\n\n`;

    camposClassificacao(es).forEach(([rotulo, valor]) => {
        md += `**${rotulo}:** ${valor}\n\n`;
    });

    const versos = versosParaSilabas(linhas, rimas);
    if (versos.length) {
        md += `### Grade Silábica\n\n`;
        md += `_Sílaba tônica em **negrito**; sílabas separadas por " / "; letra ao final indica o esquema de rima._\n\n`;
        versos.forEach((v) => {
            const texto = v.unidades.map((u) => (u.tonica ? `**${u.texto}**` : u.texto)).join(' / ');
            md += `${v.numero}. ${texto}${v.letra ? ` (${v.letra})` : ''}\n`;
        });
        md += `\n`;
    }

    const pares = paresParaTexto(rimas, linhas);
    if (pares.length) {
        md += `### Pares de Rima\n\n`;
        const resumo = resumoProximidadeTexto(rimas, linhas);
        if (resumo) md += `_${resumo}_\n\n`;
        pares.forEach((p) => {
            md += `- **${p.letra || '·'}** — v.${p.numA} "${p.trechoA}" ↔ v.${p.numB} "${p.trechoB}" (${p.posicao} · ${p.proximidade})${
                p.classificacao ? ` — ${p.classificacao}` : ''
            }\n`;
        });
        md += `\n`;
    }

    return md;
}

export function baixarEscansaoMarkdown(es, poema) {
    const conteudo = escansaoParaMarkdown(es, poema);
    baixarBlob(
        new Blob([conteudo], { type: 'text/markdown;charset=utf-8' }),
        `${nomeBaseArquivo(poema, es)}.md`,
    );
}

// ─── .pdf ─────────────────────────────────────────────────────────
// Texto simples (sem grade em colunas/tabela real) — a mesma
// convenção de "sílaba tônica em negrito + letra de rima ao final"
// do .md acima, só que com negrito/cor de verdade (ver linhaMista,
// dentro de gerarPdfEscansao), já que jsPDF não interpreta markdown.
function obterConstrutorJsPdf() {
    return window.jspdf?.jsPDF || null;
}

// Largura fixa das colunas Nº/Rima e largura mínima aceitável pra uma
// coluna de sílaba — abaixo disso a grade fica ilegível (letras
// espremidas), e é esse limiar que decide se a página da Grade Silábica
// vira paisagem (ver decidirOrientacaoGrade, dentro de gerarPdfEscansao).
const PDF_LARGURA_COL_NUMERO = 26;
const PDF_LARGURA_COL_RIMA = 30;
const PDF_MIN_COL_SILABA = 18;
const PDF_ALTURA_LINHA_GRADE = 16;
const PDF_COR_BORDA_PADRAO = { r: 209, g: 213, b: 219 }; // gray-300, grade "neutra"
const PDF_COR_RESERVADO = { r: 156, g: 163, b: 175 }; // gray-400, texto de apoio (nº, régua)

export function gerarPdfEscansao(es, poema) {
    const Ctor = obterConstrutorJsPdf();
    if (!Ctor) {
        throw new Error(
            'A biblioteca de PDF não carregou (verifique a conexão com a internet) — tente novamente em alguns segundos.',
        );
    }
    const doc = new Ctor({ unit: 'pt', format: 'a4' });
    const margem = 48;
    // Capturados ANTES de qualquer addPage — a folha 'a4' é sempre a
    // mesma, só gira; a largura útil de uma página paisagem é a ALTURA
    // da página retrato menos as mesmas margens (e vice-versa), então
    // não precisamos de nenhuma constante mágica pra saber a largura da
    // paisagem sem nunca ter criado uma página paisagem de verdade.
    const larguraUtilRetrato = doc.internal.pageSize.getWidth() - margem * 2;
    const larguraUtilPaisagem = doc.internal.pageSize.getHeight() - margem * 2;

    let orientacaoAtual = 'portrait';
    let largura = larguraUtilRetrato;
    let alturaPagina = doc.internal.pageSize.getHeight();
    let y = margem;

    function atualizarDimensoes() {
        largura = doc.internal.pageSize.getWidth() - margem * 2;
        alturaPagina = doc.internal.pageSize.getHeight();
    }

    function novaPagina(orientacao = orientacaoAtual) {
        doc.addPage('a4', orientacao);
        orientacaoAtual = orientacao;
        atualizarDimensoes();
        y = margem;
    }

    function quebrarSeNecessario(altura) {
        if (y + altura > alturaPagina - margem) {
            novaPagina(orientacaoAtual);
        }
    }

    function paragrafo(texto, { tamanho = 10, negrito = false, espacoDepois = 6 } = {}) {
        doc.setFont('helvetica', negrito ? 'bold' : 'normal');
        doc.setFontSize(tamanho);
        const linhas = doc.splitTextToSize(String(texto ?? ''), largura);
        linhas.forEach((linha) => {
            quebrarSeNecessario(tamanho * 1.35);
            doc.text(linha, margem, y);
            y += tamanho * 1.35;
        });
        y += espacoDepois;
    }

    // Desenha uma sequência de segmentos { texto, negrito?, cor? } na
    // MESMA linha, cada um no seu próprio estilo — run a run, como
    // corpoParaLinhasRicas faz em exportar-pdf.js, só que aqui simplificado
    // pro caso de Sonoridade (sem fundo/itálico/sublinhado, só negrito +
    // cor de texto — os dois estilos que os campos de classificação
    // precisam; a Grade Silábica em si usa desenharCelula, abaixo, que
    // também cobre fundo/borda).
    function linhaMista(segmentos, { tamanho = 10, espacoDepois = 1 } = {}) {
        doc.setFontSize(tamanho);
        const alturaLinha = tamanho * 1.35;
        quebrarSeNecessario(alturaLinha);
        let x = margem;
        segmentos.forEach((seg) => {
            doc.setFont('helvetica', seg.negrito ? 'bold' : 'normal');
            const larguraSeg = doc.getTextWidth(seg.texto);
            if (x > margem && x + larguraSeg > margem + largura) {
                y += alturaLinha;
                quebrarSeNecessario(alturaLinha);
                x = margem;
            }
            const cor = seg.cor || { r: 0, g: 0, b: 0 };
            doc.setTextColor(cor.r, cor.g, cor.b);
            doc.text(seg.texto, x, y);
            x += larguraSeg;
        });
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        y += alturaLinha + espacoDepois;
    }

    // Uma célula da Grade Silábica — retângulo com fundo/borda opcionais
    // + texto centralizado (a centralização vertical de doc.text é
    // aproximada por baseline: y do centro + ~32% do tamanho da fonte,
    // truque padrão pra texto de uma linha só).
    function desenharCelula(x, yCel, largCel, altCel, texto, opts = {}) {
        const { negrito = false, fundo = null, borda = PDF_COR_BORDA_PADRAO, cor = null, tamanho = 9 } = opts;
        if (fundo) {
            doc.setFillColor(fundo.r, fundo.g, fundo.b);
            doc.rect(x, yCel, largCel, altCel, 'F');
        }
        doc.setDrawColor(borda.r, borda.g, borda.b);
        doc.setLineWidth(borda === PDF_COR_BORDA_PADRAO ? 0.4 : 1.1);
        doc.rect(x, yCel, largCel, altCel);
        if (texto) {
            doc.setFont('helvetica', negrito ? 'bold' : 'normal');
            doc.setFontSize(tamanho);
            const corTexto = cor || { r: 0, g: 0, b: 0 };
            doc.setTextColor(corTexto.r, corTexto.g, corTexto.b);
            doc.text(String(texto), x + largCel / 2, yCel + altCel / 2 + tamanho * 0.32, {
                align: 'center',
            });
        }
    }

    // Decide se a Grade Silábica precisa de página paisagem: compara a
    // largura de coluna de sílaba que sobraria em retrato contra o
    // mínimo legível — só muda pra paisagem se isso de fato ajudar
    // (poema absurdamente longo em sílabas continua em retrato mesmo
    // assim, células espremidas, em vez de girar a página à toa).
    function decidirOrientacaoGrade(n) {
        const colRetrato = (larguraUtilRetrato - PDF_LARGURA_COL_NUMERO - PDF_LARGURA_COL_RIMA) / n;
        if (colRetrato >= PDF_MIN_COL_SILABA) return 'portrait';
        const colPaisagem = (larguraUtilPaisagem - PDF_LARGURA_COL_NUMERO - PDF_LARGURA_COL_RIMA) / n;
        return colPaisagem > colRetrato ? 'landscape' : 'portrait';
    }

    // Desenha a Grade Silábica inteira como tabela (cabeçalho com a
    // régua de posições + uma linha por verso) — mesma estrutura visual
    // de renderGradeLeituraHtml (editor-sonoridade.js): sílaba tônica com
    // fundo âmbar, contorno colorido por sílaba rimada (não só por
    // verso), coluna final com a letra do esquema. Repete o cabeçalho se
    // a tabela precisar quebrar de página no meio (poema longo).
    function desenharTabelaGrade(tabela) {
        const colSilaba = Math.max(
            PDF_MIN_COL_SILABA,
            (largura - PDF_LARGURA_COL_NUMERO - PDF_LARGURA_COL_RIMA) / tabela.n,
        );

        function cabecalho() {
            quebrarSeNecessario(PDF_ALTURA_LINHA_GRADE);
            let x = margem;
            desenharCelula(x, y, PDF_LARGURA_COL_NUMERO, PDF_ALTURA_LINHA_GRADE, 'Nº', {
                tamanho: 8,
                cor: PDF_COR_RESERVADO,
            });
            x += PDF_LARGURA_COL_NUMERO;
            for (let i = 1; i <= tabela.n; i++) {
                desenharCelula(x, y, colSilaba, PDF_ALTURA_LINHA_GRADE, String(i), {
                    tamanho: 8,
                    cor: PDF_COR_RESERVADO,
                });
                x += colSilaba;
            }
            desenharCelula(x, y, PDF_LARGURA_COL_RIMA, PDF_ALTURA_LINHA_GRADE, 'Rima', {
                tamanho: 8,
                cor: PDF_COR_RESERVADO,
            });
            y += PDF_ALTURA_LINHA_GRADE;
        }

        cabecalho();
        tabela.linhas.forEach((linha) => {
            if (linha.tipo === 'vazia') {
                y += 6;
                return;
            }
            quebrarSeNecessario(PDF_ALTURA_LINHA_GRADE);
            if (y === margem) cabecalho(); // página nova no meio da tabela — repete a régua
            let x = margem;
            desenharCelula(x, y, PDF_LARGURA_COL_NUMERO, PDF_ALTURA_LINHA_GRADE, String(linha.numero), {
                tamanho: 8,
                cor: PDF_COR_RESERVADO,
            });
            x += PDF_LARGURA_COL_NUMERO;
            linha.celulas.forEach((c) => {
                const corBorda = c.letraRima ? hexParaRgb(CORES_RIMA_HEX[corDaLetra(c.letraRima)]) : PDF_COR_BORDA_PADRAO;
                desenharCelula(x, y, colSilaba, PDF_ALTURA_LINHA_GRADE, c.texto, {
                    tamanho: 9,
                    negrito: c.tonica,
                    fundo: c.tonica ? FUNDO_TONICA_RGB : null,
                    borda: corBorda,
                });
                x += colSilaba;
            });
            const corLetra = linha.letra ? hexParaRgb(CORES_RIMA_HEX[corDaLetra(linha.letra)]) : null;
            desenharCelula(x, y, PDF_LARGURA_COL_RIMA, PDF_ALTURA_LINHA_GRADE, linha.letra || '', {
                tamanho: 9,
                negrito: true,
                cor: corLetra,
            });
            y += PDF_ALTURA_LINHA_GRADE;
        });
    }

    paragrafo(`Escansão — ${poema?.titulo || `#${es.id}`}`, { tamanho: 16, negrito: true });

    camposClassificacao(es).forEach(([rotulo, valor]) => {
        linhaMista(
            [
                { texto: `${rotulo}: `, negrito: true },
                { texto: String(valor) },
            ],
            { tamanho: 10, espacoDepois: 2 },
        );
    });
    y += 6;

    const linhas = Array.isArray(es.escansaoLinhas) ? es.escansaoLinhas : [];
    const rimas = Array.isArray(es.rimas) ? es.rimas : [];
    const tabelaGrade = gradeParaTabela(linhas, rimas);
    const temVersos = tabelaGrade.linhas.some((l) => l.tipo === 'verso');
    let usouPaisagem = false;
    if (temVersos) {
        const orientacaoGrade = decidirOrientacaoGrade(tabelaGrade.n);
        if (orientacaoGrade !== orientacaoAtual) {
            novaPagina(orientacaoGrade);
            usouPaisagem = orientacaoGrade === 'landscape';
        }
        paragrafo('Grade Silábica', { tamanho: 12, negrito: true, espacoDepois: 4 });
        desenharTabelaGrade(tabelaGrade);
        y += 6;
    }

    const pares = paresParaTexto(rimas, linhas);
    if (pares.length) {
        // Volta pro retrato pra continuar o documento normalmente —
        // a paisagem foi só pra grade caber, não é o formato do resto.
        if (usouPaisagem) novaPagina('portrait');
        paragrafo('Pares de Rima', { tamanho: 12, negrito: true, espacoDepois: 4 });
        const resumo = resumoProximidadeTexto(rimas, linhas);
        if (resumo) paragrafo(resumo, { tamanho: 10, espacoDepois: 4 });
        pares.forEach((p) => {
            const base = `${p.letra || '·'} — v.${p.numA} "${p.trechoA}" <-> v.${p.numB} "${p.trechoB}" (${p.posicao} · ${p.proximidade})`;
            paragrafo(p.classificacao ? `${base} — ${p.classificacao}` : base, {
                tamanho: 10,
                espacoDepois: 2,
            });
        });
    }

    return doc;
}

export function baixarEscansaoPdf(es, poema) {
    const doc = gerarPdfEscansao(es, poema);
    doc.save(`${nomeBaseArquivo(poema, es)}.pdf`);
}

// ─── .docx ────────────────────────────────────────────────────────
function obterDocx() {
    return window.docx || null;
}

// Espaçamento padrão do documento — mesmo raciocínio e mesmos valores
// de ESTILOS_PADRAO_DOCUMENTO em exportar-docx.js (ver o comentário lá
// pra por quê: sem isso a lib docx cai no fallback "sem espaço antes/
// depois, linha single" e o documento inteiro fica grudado). Duplicado
// aqui (em vez de importado) porque exportar-docx.js reexportaria mais
// que só a constante — este módulo optou por não depender daquele
// arquivo (ver comentário no topo do arquivo).
const ESTILOS_PADRAO_DOCUMENTO_SONORIDADE = {
    default: {
        document: {
            paragraph: { spacing: { after: 120, line: 264, lineRule: 'auto' } },
        },
        heading1: { paragraph: { spacing: { before: 320, after: 120 } } },
        heading2: { paragraph: { spacing: { before: 240, after: 100 } } },
        listParagraph: { paragraph: { spacing: { after: 80 } } },
    },
};

// Página A4 retrato em twips (1440 twips = 1 polegada) — mesmo default
// implícito que o resto do sistema já usa (nenhum outro exportador seta
// `page.size` explicitamente, então cai no default A4 da própria lib
// docx). Precisamos dos valores por extenso aqui porque a Grade
// Silábica pode pedir paisagem (ver decidirOrientacaoGradeDocx) — a lib
// troca width/height sozinha quando `orientation: LANDSCAPE`, mas exige
// que a gente passe as dimensões em pé de qualquer forma.
const DOCX_PAGINA_A4_RETRATO = { width: 11906, height: 16838 };
const DOCX_MARGEM_TWIPS = 1440; // 1 polegada, default da lib
const DOCX_LARGURA_COL_NUMERO = 500;
const DOCX_LARGURA_COL_RIMA = 600;
const DOCX_MIN_COL_SILABA = 360; // ~0,25", abaixo disso a coluna fica ilegível

// Decide se o documento inteiro nasce em paisagem — diferente do .pdf
// (que só vira a página da grade e volta pro retrato depois), aqui é o
// documento inteiro (uma seção só, curta — título + campos + grade +
// pares), então não vale a complexidade de duas seções com orientações
// diferentes só pra isto.
function decidirOrientacaoGradeDocx(n) {
    const larguraRetrato = DOCX_PAGINA_A4_RETRATO.width - DOCX_MARGEM_TWIPS * 2;
    const colRetrato = (larguraRetrato - DOCX_LARGURA_COL_NUMERO - DOCX_LARGURA_COL_RIMA) / n;
    if (colRetrato >= DOCX_MIN_COL_SILABA) return 'portrait';
    const larguraPaisagem = DOCX_PAGINA_A4_RETRATO.height - DOCX_MARGEM_TWIPS * 2;
    const colPaisagem = (larguraPaisagem - DOCX_LARGURA_COL_NUMERO - DOCX_LARGURA_COL_RIMA) / n;
    return colPaisagem > colRetrato ? 'landscape' : 'portrait';
}

// Monta a Grade Silábica como Table de verdade (mesma estrutura de
// renderGradeLeituraHtml): linha de régua (posições 1..n) + uma linha
// por verso, sílaba tônica com fundo âmbar, borda colorida por sílaba
// rimada (não só por verso), coluna final com a letra do esquema.
// Linhas 'vazia' (separador entre estrofes) viram uma linha mesclada
// (columnSpan) sem borda, só pra abrir espaço visual.
function construirTabelaGradeDocx(docx, tabela, larguraConteudo) {
    const { Table, TableRow, TableCell, Paragraph, TextRun, WidthType, VerticalAlign, BorderStyle, AlignmentType } =
        docx;
    const colSilaba = Math.max(
        DOCX_MIN_COL_SILABA,
        (larguraConteudo - DOCX_LARGURA_COL_NUMERO - DOCX_LARGURA_COL_RIMA) / tabela.n,
    );

    const SEM_BORDA = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    function bordaPadrao() {
        const linha = { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' }; // gray-300
        return { top: linha, bottom: linha, left: linha, right: linha };
    }
    function bordaColorida(hex) {
        const linha = { style: BorderStyle.SINGLE, size: 10, color: hex };
        return { top: linha, bottom: linha, left: linha, right: linha };
    }

    function celula(texto, { largura, negrito = false, fundoHex = null, bordas = bordaPadrao(), corHex = null } = {}) {
        return new TableCell({
            width: { size: largura, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            shading: fundoHex ? { fill: fundoHex } : undefined,
            borders: bordas,
            children: [
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: texto || '', bold: negrito, color: corHex || undefined })],
                }),
            ],
        });
    }

    const linhaCabecalho = new TableRow({
        children: [
            celula('Nº', { largura: DOCX_LARGURA_COL_NUMERO }),
            ...Array.from({ length: tabela.n }, (_, i) => celula(String(i + 1), { largura: colSilaba })),
            celula('Rima', { largura: DOCX_LARGURA_COL_RIMA }),
        ],
    });

    const linhasCorpo = tabela.linhas.map((linha) => {
        if (linha.tipo === 'vazia') {
            return new TableRow({
                children: [
                    new TableCell({
                        columnSpan: tabela.n + 2,
                        borders: { top: SEM_BORDA, bottom: SEM_BORDA, left: SEM_BORDA, right: SEM_BORDA },
                        children: [new Paragraph({ children: [] })],
                    }),
                ],
            });
        }
        const celulasSilaba = linha.celulas.map((c) =>
            celula(c.texto, {
                largura: colSilaba,
                negrito: c.tonica,
                fundoHex: c.tonica ? FUNDO_TONICA_HEX : null,
                bordas: c.letraRima ? bordaColorida(CORES_RIMA_HEX[corDaLetra(c.letraRima)]) : bordaPadrao(),
            }),
        );
        return new TableRow({
            children: [
                celula(String(linha.numero), { largura: DOCX_LARGURA_COL_NUMERO }),
                ...celulasSilaba,
                celula(linha.letra || '', {
                    largura: DOCX_LARGURA_COL_RIMA,
                    negrito: true,
                    corHex: linha.letra ? CORES_RIMA_HEX[corDaLetra(linha.letra)] : null,
                }),
            ],
        });
    });

    return new Table({
        width: { size: larguraConteudo, type: WidthType.DXA },
        rows: [linhaCabecalho, ...linhasCorpo],
    });
}

export function gerarDocxEscansao(es, poema) {
    const docx = obterDocx();
    if (!docx) {
        throw new Error(
            'A biblioteca de .docx não carregou (verifique a conexão com a internet) — tente novamente em alguns segundos.',
        );
    }
    const { Document, Paragraph, TextRun, HeadingLevel, PageOrientation } = docx;
    const filhos = [];

    filhos.push(
        new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: `Escansão — ${poema?.titulo || `#${es.id}`}` })],
        }),
    );

    camposClassificacao(es).forEach(([rotulo, valor]) => {
        filhos.push(
            new Paragraph({
                spacing: { after: 40 },
                children: [
                    new TextRun({ text: `${rotulo}: `, bold: true }),
                    new TextRun({ text: String(valor) }),
                ],
            }),
        );
    });

    const linhas = Array.isArray(es.escansaoLinhas) ? es.escansaoLinhas : [];
    const rimas = Array.isArray(es.rimas) ? es.rimas : [];
    const tabelaGrade = gradeParaTabela(linhas, rimas);
    const temVersos = tabelaGrade.linhas.some((l) => l.tipo === 'verso');
    const orientacao = temVersos ? decidirOrientacaoGradeDocx(tabelaGrade.n) : 'portrait';
    const emPaisagem = orientacao === 'landscape';

    if (temVersos) {
        filhos.push(
            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('Grade Silábica')] }),
        );
        const larguraPagina = emPaisagem ? DOCX_PAGINA_A4_RETRATO.height : DOCX_PAGINA_A4_RETRATO.width;
        const larguraConteudo = larguraPagina - DOCX_MARGEM_TWIPS * 2;
        filhos.push(construirTabelaGradeDocx(docx, tabelaGrade, larguraConteudo));
        // Parágrafo vazio depois da tabela — a lib docx não aceita duas
        // Table seguidas sem nada entre elas se vier mais conteúdo abaixo
        // (Pares de Rima), e o spacing "after" de Table não é aplicado
        // como o de Paragraph.
        filhos.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
    }

    const pares = paresParaTexto(rimas, linhas);
    if (pares.length) {
        filhos.push(
            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('Pares de Rima')] }),
        );
        const resumo = resumoProximidadeTexto(rimas, linhas);
        if (resumo) {
            filhos.push(
                new Paragraph({
                    spacing: { after: 100 },
                    children: [new TextRun({ text: resumo, italics: true })],
                }),
            );
        }
        pares.forEach((p) => {
            const texto = `${p.letra || '·'} — v.${p.numA} "${p.trechoA}" ↔ v.${p.numB} "${p.trechoB}" (${p.posicao} · ${p.proximidade})${
                p.classificacao ? ` — ${p.classificacao}` : ''
            }`;
            filhos.push(
                new Paragraph({
                    bullet: { level: 0 },
                    spacing: { after: 60 },
                    children: [new TextRun(texto)],
                }),
            );
        });
    }

    return new Document({
        styles: ESTILOS_PADRAO_DOCUMENTO_SONORIDADE,
        sections: [
            {
                properties: {
                    page: {
                        size: {
                            width: DOCX_PAGINA_A4_RETRATO.width,
                            height: DOCX_PAGINA_A4_RETRATO.height,
                            orientation: emPaisagem ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
                        },
                    },
                },
                children: filhos,
            },
        ],
    });
}

export async function baixarEscansaoDocx(es, poema) {
    const docx = obterDocx();
    if (!docx) {
        throw new Error(
            'A biblioteca de .docx não carregou (verifique a conexão com a internet) — tente novamente em alguns segundos.',
        );
    }
    const documento = gerarDocxEscansao(es, poema);
    const blob = await docx.Packer.toBlob(documento);
    baixarBlob(blob, `${nomeBaseArquivo(poema, es)}.docx`);
}

// ─── .json (mesmo payload que já existia antes desta sessão, só
// realocado pra cá — ver comentário antigo em render-listas.js) ─────
export function baixarEscansaoJson(es, poema) {
    const payload = { ...es, poemaTitulo: poema?.titulo || null };
    baixarBlob(
        new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }),
        `${nomeBaseArquivo(poema, es)}.json`,
    );
}

// ─── Dispatcher (botão "Baixar" da coluna Ações e modal de
// Visualização) — mesmo papel que exportarItem() tem pra Poemas/Prosas
// (ver exportar.js). `formato` é 'md' | 'pdf' | 'docx' | 'json'.
export async function exportarEscansao(id, formato) {
    const { es, poema } = resolverEscansaoEPoema(id);
    if (!es) {
        mostrarAviso('Escansão não encontrada.');
        return;
    }

    if (formato === 'pdf') {
        try {
            baixarEscansaoPdf(es, poema);
        } catch (err) {
            mostrarAviso(err.message || 'Não foi possível gerar o PDF.');
        }
        return;
    }

    if (formato === 'docx') {
        try {
            await baixarEscansaoDocx(es, poema);
        } catch (err) {
            mostrarAviso(err.message || 'Não foi possível gerar o .docx.');
        }
        return;
    }

    if (formato === 'json') {
        baixarEscansaoJson(es, poema);
        return;
    }

    baixarEscansaoMarkdown(es, poema);
}
