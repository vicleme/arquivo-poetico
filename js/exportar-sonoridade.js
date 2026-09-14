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
    calcularTalyPorEixo,
    EIXOS_CLASSIFICACAO_PAR,
    rotuloCurtoValor,
    celulasRimadas,
    celulasComEco,
    mostrarEcosAtivo,
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
        [
            'Esquema de Rimas',
            [es.esquemaRimasPresenca, es.esquemaRimasPadrao].filter(Boolean).join(' · '),
        ],
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

// Cor neutra única do contorno tracejado de Eco Sonoro — mesmo espírito
// de PALETA_RIMA não se aplicar aqui (eco não é grupo/esquema, então
// nunca varia por par, sempre a mesma cor). gray-400, igual à tela
// (outline-gray-400 em renderGradeLeituraHtml/reconstruirColunas).
const PDF_COR_ECO = { r: 156, g: 163, b: 175 };
const DOCX_COR_ECO_HEX = '9CA3AF';

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
// `ecos` é opcional (chamadas antigas/testes que só passam linhas/rimas
// continuam funcionando — vira array vazio). A marcação de eco em si só
// entra na tabela se mostrarEcosAtivo() estiver ligado — mesma
// preferência persistida que já controla a tela (ver editor-sonoridade.js);
// isso é o que faz o toggle "Mostrar Ecos Sonoros" valer também na hora
// de imprimir/exportar, não só na grade em tela.
export function gradeParaTabela(linhas, rimas, ecos = []) {
    const n = calcularMaxSilabas(linhas);
    const letras = calcularLetrasRima(rimas);
    const rimadas = celulasRimadas(rimas, letras);
    const ecoadas = mostrarEcosAtivo() ? celulasComEco(ecos) : new Map();

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
                eco: ehReal ? Boolean(ecoadas.get(`${idx}:${i}`)) : false,
            });
        }
        return { tipo: 'verso', numero: linha.numero, celulas, letra: letras.get(idx) || null };
    });

    return { n, linhas: linhasTabela };
}

// Mesmo espírito de paresParaTexto, mas pra Ecos Sonoros — sem letra de
// esquema (não é grupo) nem 3 eixos de classificação, só o `tipo` livre
// (ver TIPOS_ECO_SONORO em utils.js).
function ecosParaTexto(ecos, linhas) {
    return [...ecos]
        .sort((e1, e2) => e1.a.linha - e2.a.linha)
        .map((eco) => {
            const numA = linhas[eco.a.linha]?.numero ?? '?';
            const numB = linhas[eco.b.linha]?.numero ?? '?';
            const posicao = calcularPosicaoPar(eco, linhas);
            const proximidade = calcularProximidadePar(calcularDistanciaPar(eco, linhas));
            return {
                numA,
                numB,
                trechoA: trechoLado(eco.a, linhas),
                trechoB: trechoLado(eco.b, linhas),
                posicao,
                proximidade,
                tipo: eco.tipo || null,
            };
        });
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

// Linhas de resumo (uma por eixo) repetidas nos 3 formatos antes da
// lista de pares — reaproveita exatamente as mesmas funções de contagem
// de editor-sonoridade.js (calcularClassificacaoSonora/
// calcularTalyPorEixo/EIXOS_CLASSIFICACAO_PAR) usadas na tela, pra nunca
// divergir do que aparece no editor/na leitura. Texto puro aqui — cada
// exportador decide como estilizar (parágrafo simples no .md/.pdf,
// itálico no .docx). Array vazio quando o poema não tem par nenhum.
function linhasResumoParesTexto(rimas, linhas) {
    const textos = [];
    const { vizinhas, distantes, rotulo } = calcularClassificacaoSonora(rimas, linhas);
    if (rotulo) {
        textos.push(
            `${rotulo} (${vizinhas} vizinha${vizinhas === 1 ? '' : 's'} · ${distantes} distante${distantes === 1 ? '' : 's'})`,
        );
    }
    ['posicao', 'acentuacao', 'tonalidade', 'riqueza'].forEach((chave) => {
        const { label, extrairValor } = EIXOS_CLASSIFICACAO_PAR[chave];
        const { valores, semClassificar } = calcularTalyPorEixo(rimas, linhas, extrairValor);
        const partes = Object.entries(valores).map(
            ([valor, n]) => `${n} ${rotuloCurtoValor(valor)}`,
        );
        if (!partes.length) return;
        const aviso = semClassificar > 0 ? ` (${semClassificar} sem ${label} definida)` : '';
        textos.push(`${label}: ${partes.join(' · ')}${aviso}`);
    });
    return textos;
}

// ─── .md ──────────────────────────────────────────────────────────
// Dividido em 3 pedaços componíveis — cabeçalho (título + campos de
// classificação), grade e pares/ecos — pra escansaoParaMarkdown() (usada
// por .md/.docx/download abrangente em .pdf via texto simples) poder
// continuar gerando tudo junto, MAS o exportador de PDF "abrangente"
// (gerarPdfExportacao, exportar-pdf.js) também poder pedir só cabeçalho
// e pares/ecos como markdown, desenhando a Grade Silábica à parte como
// TABELA de verdade (ver desenharGradeSilabicaPdf, mais abaixo) — mesma
// tabela que a aba de Sonoridade já desenha no download avulso, agora
// reaproveitada ali também (antes o abrangente só tinha a versão linear
// de texto "1. sí / la (A)", puramente porque isso era mais simples de
// encaixar no renderizador de Markdown genérico do PDF — ver decisão
// registrada em download-abrangente.js).
function blocoCabecalhoMarkdown(es, poema) {
    let md = `## Escansão — ${poema?.titulo || `#${es.id}`}\n\n`;
    camposClassificacao(es).forEach(([rotulo, valor]) => {
        md += `**${rotulo}:** ${valor}\n\n`;
    });
    return md;
}

// `poema` não é usado aqui (só entra pra manter a mesma assinatura de
// blocoCabecalhoMarkdown, que precisa dele pro título) — quem chama as
// três em sequência (ver abaixo) passa os mesmos dois argumentos pras
// três sem precisar pensar em qual usa o quê.
function blocoGradeMarkdown(es, _poema) {
    const linhas = Array.isArray(es.escansaoLinhas) ? es.escansaoLinhas : [];
    const rimas = Array.isArray(es.rimas) ? es.rimas : [];
    const versos = versosParaSilabas(linhas, rimas);
    if (!versos.length) return '';

    let md = `### Grade Silábica\n\n`;
    md += `_Sílaba tônica em **negrito**; sílabas separadas por " / "; letra ao final indica o esquema de rima._\n\n`;
    versos.forEach((v) => {
        const texto = v.unidades.map((u) => (u.tonica ? `**${u.texto}**` : u.texto)).join(' / ');
        md += `${v.numero}. ${texto}${v.letra ? ` (${v.letra})` : ''}\n`;
    });
    md += `\n`;
    return md;
}

// Mesmo motivo de blocoGradeMarkdown acima: `poema` só existe aqui pra
// manter a assinatura igual às outras duas.
function blocoParesEcosMarkdown(es, _poema) {
    const linhas = Array.isArray(es.escansaoLinhas) ? es.escansaoLinhas : [];
    const rimas = Array.isArray(es.rimas) ? es.rimas : [];
    const ecos = Array.isArray(es.ecos) ? es.ecos : [];
    let md = '';

    const pares = paresParaTexto(rimas, linhas);
    if (pares.length) {
        md += `### Pares de Rima\n\n`;
        linhasResumoParesTexto(rimas, linhas).forEach((linha) => {
            md += `_${linha}_\n\n`;
        });
        pares.forEach((p) => {
            md += `- **${p.letra || '·'}** — v.${p.numA} "${p.trechoA}" ↔ v.${p.numB} "${p.trechoB}" (${p.posicao} · ${p.proximidade})${
                p.classificacao ? ` — ${p.classificacao}` : ''
            }\n`;
        });
        md += `\n`;
    }

    // Some do .md inteiro quando o toggle "Mostrar Ecos Sonoros" está
    // desligado — mesma preferência que já esconde a marcação na tela e
    // no .pdf/.docx (ver mostrarEcosAtivo em editor-sonoridade.js).
    const ecosVisiveis = mostrarEcosAtivo() ? ecosParaTexto(ecos, linhas) : [];
    if (ecosVisiveis.length) {
        md += `### Ecos Sonoros\n\n`;
        md += `_Quase-rimas intencionais — ecos sonoros de fim/meio de verso que não chegam a rimar pela teoria._\n\n`;
        ecosVisiveis.forEach((e) => {
            md += `- v.${e.numA} "${e.trechoA}" ↔ v.${e.numB} "${e.trechoB}" (${e.posicao} · ${e.proximidade})${
                e.tipo ? ` — ${e.tipo}` : ''
            }\n`;
        });
        md += `\n`;
    }

    return md;
}

export function escansaoParaMarkdown(es, poema) {
    return blocoCabecalhoMarkdown(es, poema) + blocoGradeMarkdown(es, poema) + blocoParesEcosMarkdown(es, poema);
}

// Pedaços avulsos pro exportador de PDF abrangente (ver comentário
// acima) — mesmo texto que escansaoParaMarkdown produziria pras mesmas
// seções, só sem a Grade Silábica no meio.
export function escansaoCabecalhoMarkdown(es, poema) {
    return blocoCabecalhoMarkdown(es, poema);
}
export function escansaoParesEcosMarkdown(es, poema) {
    return blocoParesEcosMarkdown(es, poema);
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
// vira paisagem (ver decidirOrientacaoGradePdf, logo abaixo).
const PDF_LARGURA_COL_NUMERO = 26;
const PDF_LARGURA_COL_RIMA = 30;
const PDF_MIN_COL_SILABA = 18;
const PDF_ALTURA_LINHA_GRADE = 16;
const PDF_COR_BORDA_PADRAO = { r: 209, g: 213, b: 219 }; // gray-300, grade "neutra"
const PDF_COR_RESERVADO = { r: 156, g: 163, b: 175 }; // gray-400, texto de apoio (nº, régua)

// Decide se a Grade Silábica precisa de página paisagem: compara a
// largura de coluna de sílaba que sobraria em retrato (dadas as duas
// larguras úteis — a normal e a que a mesma folha teria virada, ambas
// capturadas pelo chamador ANTES de qualquer addPage, ver comentário em
// gerarPdfEscansao) contra o mínimo legível — só muda pra paisagem se
// isso de fato ajudar (poema absurdamente longo em sílabas continua em
// retrato mesmo assim, células espremidas, em vez de girar a página à
// toa). Função de módulo (pura, sem fechar sobre nenhum estado de
// gerarPdfEscansao) pra poder ser reaproveitada por outros exportadores
// que desenham a mesma Grade Silábica em PDF (ver exportar-pdf.js, seção
// de Sonoridade do Download Abrangente) sem duplicar o limiar.
export function decidirOrientacaoGradePdf(n, larguraUtilRetrato, larguraUtilPaisagem) {
    const colRetrato = (larguraUtilRetrato - PDF_LARGURA_COL_NUMERO - PDF_LARGURA_COL_RIMA) / n;
    if (colRetrato >= PDF_MIN_COL_SILABA) return 'portrait';
    const colPaisagem = (larguraUtilPaisagem - PDF_LARGURA_COL_NUMERO - PDF_LARGURA_COL_RIMA) / n;
    return colPaisagem > colRetrato ? 'landscape' : 'portrait';
}

// Uma célula da Grade Silábica — retângulo com fundo/borda opcionais +
// texto centralizado (a centralização vertical de doc.text é aproximada
// por baseline: y do centro + ~32% do tamanho da fonte, truque padrão
// pra texto de uma linha só). Função de módulo (recebe `doc` explícito,
// não fecha sobre nenhum estado de gerarPdfEscansao) pra poder ser
// chamada tanto dali quanto de desenharGradeSilabicaPdf, abaixo.
export function desenharCelulaGradePdf(doc, x, yCel, largCel, altCel, texto, opts = {}) {
    const {
        negrito = false,
        fundo = null,
        borda = PDF_COR_BORDA_PADRAO,
        cor = null,
        tamanho = 9,
        tracejado = false,
    } = opts;
    if (fundo) {
        doc.setFillColor(fundo.r, fundo.g, fundo.b);
        doc.rect(x, yCel, largCel, altCel, 'F');
    }
    doc.setDrawColor(borda.r, borda.g, borda.b);
    doc.setLineWidth(borda === PDF_COR_BORDA_PADRAO ? 0.4 : 1.1);
    doc.rect(x, yCel, largCel, altCel);
    // Eco sonoro (quase-rima) — contorno tracejado cinza-neutro por cima
    // do contorno normal/colorido acima: as duas marcações convivem sem
    // conflito (mesma decisão da tela, onde ring/box-shadow de rima e
    // outline tracejado de eco são propriedades CSS diferentes) — ver
    // PDF_COR_ECO/setLineDashPattern.
    if (tracejado) {
        doc.setLineDashPattern([1, 0.8], 0);
        doc.setDrawColor(PDF_COR_ECO.r, PDF_COR_ECO.g, PDF_COR_ECO.b);
        doc.setLineWidth(0.5);
        const inset = 0.6;
        doc.rect(x + inset, yCel + inset, largCel - inset * 2, altCel - inset * 2);
        doc.setLineDashPattern([], 0);
    }
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

// Desenha a Grade Silábica inteira como tabela (cabeçalho com a régua de
// posições + uma linha por verso) — mesma estrutura visual de
// renderGradeLeituraHtml (editor-sonoridade.js): sílaba tônica com fundo
// âmbar, contorno colorido por sílaba rimada (não só por verso), coluna
// final com a letra do esquema. Repete o cabeçalho se a tabela precisar
// quebrar de página no meio (poema longo).
//
// Função de módulo (não fecha sobre o estado y/quebrarSeNecessario de
// nenhum gerador específico) pra poder ser chamada tanto de dentro de
// gerarPdfEscansao (download avulso da aba Sonoridade) quanto de
// gerarPdfExportacao (download abrangente, exportar-pdf.js) — cada
// chamador passa seu próprio jeito de ler/mudar a posição vertical
// corrente e de quebrar de página, então a tabela nunca diverge entre
// os dois PDFs.
//
// `ctx`: { margem, largura, obterY(), definirY(novoY), quebrarPaginaSeNecessario(altura) }.
export function desenharGradeSilabicaPdf(doc, tabela, ctx) {
    const { margem, largura, obterY, definirY, quebrarPaginaSeNecessario } = ctx;
    const colSilaba = Math.max(
        PDF_MIN_COL_SILABA,
        (largura - PDF_LARGURA_COL_NUMERO - PDF_LARGURA_COL_RIMA) / tabela.n,
    );

    function cabecalho() {
        quebrarPaginaSeNecessario(PDF_ALTURA_LINHA_GRADE);
        let x = margem;
        const y = obterY();
        desenharCelulaGradePdf(doc, x, y, PDF_LARGURA_COL_NUMERO, PDF_ALTURA_LINHA_GRADE, 'Nº', {
            tamanho: 8,
            cor: PDF_COR_RESERVADO,
        });
        x += PDF_LARGURA_COL_NUMERO;
        for (let i = 1; i <= tabela.n; i++) {
            desenharCelulaGradePdf(doc, x, y, colSilaba, PDF_ALTURA_LINHA_GRADE, String(i), {
                tamanho: 8,
                cor: PDF_COR_RESERVADO,
            });
            x += colSilaba;
        }
        desenharCelulaGradePdf(doc, x, y, PDF_LARGURA_COL_RIMA, PDF_ALTURA_LINHA_GRADE, 'Rima', {
            tamanho: 8,
            cor: PDF_COR_RESERVADO,
        });
        definirY(y + PDF_ALTURA_LINHA_GRADE);
    }

    cabecalho();
    tabela.linhas.forEach((linha) => {
        if (linha.tipo === 'vazia') {
            definirY(obterY() + 6);
            return;
        }
        quebrarPaginaSeNecessario(PDF_ALTURA_LINHA_GRADE);
        if (obterY() === margem) cabecalho(); // página nova no meio da tabela — repete a régua
        let x = margem;
        const y = obterY();
        desenharCelulaGradePdf(
            doc,
            x,
            y,
            PDF_LARGURA_COL_NUMERO,
            PDF_ALTURA_LINHA_GRADE,
            String(linha.numero),
            { tamanho: 8, cor: PDF_COR_RESERVADO },
        );
        x += PDF_LARGURA_COL_NUMERO;
        linha.celulas.forEach((c) => {
            const corBorda = c.letraRima
                ? hexParaRgb(CORES_RIMA_HEX[corDaLetra(c.letraRima)])
                : PDF_COR_BORDA_PADRAO;
            desenharCelulaGradePdf(doc, x, y, colSilaba, PDF_ALTURA_LINHA_GRADE, c.texto, {
                tamanho: 9,
                negrito: c.tonica,
                fundo: c.tonica ? FUNDO_TONICA_RGB : null,
                borda: corBorda,
                tracejado: c.eco,
            });
            x += colSilaba;
        });
        const corLetra = linha.letra ? hexParaRgb(CORES_RIMA_HEX[corDaLetra(linha.letra)]) : null;
        desenharCelulaGradePdf(doc, x, y, PDF_LARGURA_COL_RIMA, PDF_ALTURA_LINHA_GRADE, linha.letra || '', {
            tamanho: 9,
            negrito: true,
            cor: corLetra,
        });
        definirY(y + PDF_ALTURA_LINHA_GRADE);
    });
}

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

    // Título de seção (Grade Silábica/Pares de Rima/Ecos Sonoros) —
    // sempre com o MESMO respiro extra antes, pra não vir "colado" no
    // que veio antes (tabela com borda, ou último parágrafo/bullet da
    // seção anterior). Sem isso, cada título herdava só o espacoDepois
    // do elemento anterior (6pt depois de um parágrafo, mas só 2pt
    // depois do último "Pares de Rima" quando "Ecos Sonoros" vinha em
    // seguida — daí o espaçamento "ínfimo" antes desse título
    // especificamente). Pula o respiro só quando a seção já está
    // começando bem no topo de uma página nova (y ainda == margem) —
    // aí a margem da página sozinha já é espaço de sobra, dobrar
    // deixaria vazio demais.
    const ESPACO_ANTES_TITULO_SECAO = 14;
    function tituloSecao(texto) {
        if (y > margem) y += ESPACO_ANTES_TITULO_SECAO;
        paragrafo(texto, { tamanho: 12, negrito: true, espacoDepois: 4 });
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

    // Decide se a Grade Silábica precisa de página paisagem — ver
    // decidirOrientacaoGrade (função de módulo, abaixo), que faz a conta de
    // verdade. Fica só este wrapper fino aqui porque o resto de
    // gerarPdfEscansao já conhece larguraUtilRetrato/larguraUtilPaisagem
    // desta closure e chama por `n`.
    function decidirOrientacaoGrade(n) {
        return decidirOrientacaoGradePdf(n, larguraUtilRetrato, larguraUtilPaisagem);
    }

    // Desenha a Grade Silábica inteira como tabela — delega pra
    // desenharGradeSilabicaPdf (função de módulo, ver acima), passando o
    // `y` desta closure via getter/setter: o resto de gerarPdfEscansao
    // (paragrafo/linhaMista/tituloSecao/novaPagina) continua lendo e
    // mudando a mesma variável `y` direto, sem precisar virar objeto só
    // por causa da grade.
    function desenharTabelaGrade(tabela) {
        desenharGradeSilabicaPdf(doc, tabela, {
            margem,
            largura,
            obterY: () => y,
            definirY: (novoY) => {
                y = novoY;
            },
            quebrarPaginaSeNecessario: quebrarSeNecessario,
        });
    }

    paragrafo(`Escansão — ${poema?.titulo || `#${es.id}`}`, { tamanho: 16, negrito: true });

    camposClassificacao(es).forEach(([rotulo, valor]) => {
        linhaMista([{ texto: `${rotulo}: `, negrito: true }, { texto: String(valor) }], {
            tamanho: 10,
            espacoDepois: 2,
        });
    });

    const linhas = Array.isArray(es.escansaoLinhas) ? es.escansaoLinhas : [];
    const rimas = Array.isArray(es.rimas) ? es.rimas : [];
    const ecos = Array.isArray(es.ecos) ? es.ecos : [];
    const tabelaGrade = gradeParaTabela(linhas, rimas, ecos);
    const temVersos = tabelaGrade.linhas.some((l) => l.tipo === 'verso');
    let usouPaisagem = false;
    if (temVersos) {
        const orientacaoGrade = decidirOrientacaoGrade(tabelaGrade.n);
        if (orientacaoGrade !== orientacaoAtual) {
            novaPagina(orientacaoGrade);
            usouPaisagem = orientacaoGrade === 'landscape';
        }
        tituloSecao('Grade Silábica');
        desenharTabelaGrade(tabelaGrade);
    }

    const pares = paresParaTexto(rimas, linhas);
    if (pares.length) {
        // Volta pro retrato pra continuar o documento normalmente —
        // a paisagem foi só pra grade caber, não é o formato do resto.
        if (usouPaisagem) novaPagina('portrait');
        tituloSecao('Pares de Rima');
        linhasResumoParesTexto(rimas, linhas).forEach((linha) => {
            paragrafo(linha, { tamanho: 10, espacoDepois: 2 });
        });
        pares.forEach((p) => {
            const base = `${p.letra || '·'} — v.${p.numA} "${p.trechoA}" <-> v.${p.numB} "${p.trechoB}" (${p.posicao} · ${p.proximidade})`;
            paragrafo(p.classificacao ? `${base} — ${p.classificacao}` : base, {
                tamanho: 10,
                espacoDepois: 2,
            });
        });
    }

    // Some do PDF inteiro quando o toggle "Mostrar Ecos Sonoros" está
    // desligado — mesma preferência de mostrarEcosAtivo() já aplicada na
    // grade acima (ver gradeParaTabela).
    const ecosVisiveis = mostrarEcosAtivo() ? ecosParaTexto(ecos, linhas) : [];
    if (ecosVisiveis.length) {
        if (usouPaisagem && !pares.length) novaPagina('portrait');
        tituloSecao('Ecos Sonoros');
        ecosVisiveis.forEach((e) => {
            const base = `v.${e.numA} "${e.trechoA}" <-> v.${e.numB} "${e.trechoB}" (${e.posicao} · ${e.proximidade})`;
            paragrafo(e.tipo ? `${base} — ${e.tipo}` : base, { tamanho: 10, espacoDepois: 2 });
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
    const {
        Table,
        TableRow,
        TableCell,
        Paragraph,
        TextRun,
        WidthType,
        VerticalAlign,
        BorderStyle,
        AlignmentType,
    } = docx;
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
    // Eco sonoro — mesma ideia de bordaColorida, mas tracejada
    // (BorderStyle.DASHED) e cor neutra por padrão (DOCX_COR_ECO_HEX). Se
    // a mesma célula também for rimada, usa a cor da rima só que
    // tracejada — docx.js só aceita 1 estilo de borda por lado da
    // célula, então as duas marcações não dá pra sobrepor de verdade
    // aqui como na tela (ring + outline são camadas CSS distintas); o
    // tracejado prevalece porque ele já indica "tem algo especial nesta
    // sílaba", e a cor (quando houver) ainda conta a qual esquema de
    // rima pertence.
    function bordaTracejada(hex) {
        const linha = { style: BorderStyle.DASHED, size: 8, color: hex };
        return { top: linha, bottom: linha, left: linha, right: linha };
    }

    function celula(
        texto,
        { largura, negrito = false, fundoHex = null, bordas = bordaPadrao(), corHex = null } = {},
    ) {
        return new TableCell({
            width: { size: largura, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            shading: fundoHex ? { fill: fundoHex } : undefined,
            borders: bordas,
            children: [
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({
                            text: texto || '',
                            bold: negrito,
                            color: corHex || undefined,
                        }),
                    ],
                }),
            ],
        });
    }

    const linhaCabecalho = new TableRow({
        children: [
            celula('Nº', { largura: DOCX_LARGURA_COL_NUMERO }),
            ...Array.from({ length: tabela.n }, (_, i) =>
                celula(String(i + 1), { largura: colSilaba }),
            ),
            celula('Rima', { largura: DOCX_LARGURA_COL_RIMA }),
        ],
    });

    const linhasCorpo = tabela.linhas.map((linha) => {
        if (linha.tipo === 'vazia') {
            return new TableRow({
                children: [
                    new TableCell({
                        columnSpan: tabela.n + 2,
                        borders: {
                            top: SEM_BORDA,
                            bottom: SEM_BORDA,
                            left: SEM_BORDA,
                            right: SEM_BORDA,
                        },
                        children: [new Paragraph({ children: [] })],
                    }),
                ],
            });
        }
        const celulasSilaba = linha.celulas.map((c) => {
            let bordas = bordaPadrao();
            if (c.eco) {
                bordas = bordaTracejada(
                    c.letraRima ? CORES_RIMA_HEX[corDaLetra(c.letraRima)] : DOCX_COR_ECO_HEX,
                );
            } else if (c.letraRima) {
                bordas = bordaColorida(CORES_RIMA_HEX[corDaLetra(c.letraRima)]);
            }
            return celula(c.texto, {
                largura: colSilaba,
                negrito: c.tonica,
                fundoHex: c.tonica ? FUNDO_TONICA_HEX : null,
                bordas,
            });
        });
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
    const ecos = Array.isArray(es.ecos) ? es.ecos : [];
    const tabelaGrade = gradeParaTabela(linhas, rimas, ecos);
    const temVersos = tabelaGrade.linhas.some((l) => l.tipo === 'verso');
    const orientacao = temVersos ? decidirOrientacaoGradeDocx(tabelaGrade.n) : 'portrait';
    const emPaisagem = orientacao === 'landscape';

    if (temVersos) {
        filhos.push(
            new Paragraph({
                heading: HeadingLevel.HEADING_2,
                children: [new TextRun('Grade Silábica')],
            }),
        );
        const larguraPagina = emPaisagem
            ? DOCX_PAGINA_A4_RETRATO.height
            : DOCX_PAGINA_A4_RETRATO.width;
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
            new Paragraph({
                heading: HeadingLevel.HEADING_2,
                children: [new TextRun('Pares de Rima')],
            }),
        );
        linhasResumoParesTexto(rimas, linhas).forEach((linha) => {
            filhos.push(
                new Paragraph({
                    spacing: { after: 60 },
                    children: [new TextRun({ text: linha, italics: true })],
                }),
            );
        });
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

    // Some do .docx inteiro quando o toggle "Mostrar Ecos Sonoros" está
    // desligado — mesma preferência já aplicada na grade (gradeParaTabela).
    const ecosVisiveis = mostrarEcosAtivo() ? ecosParaTexto(ecos, linhas) : [];
    if (ecosVisiveis.length) {
        filhos.push(
            new Paragraph({
                heading: HeadingLevel.HEADING_2,
                children: [new TextRun('Ecos Sonoros')],
            }),
        );
        ecosVisiveis.forEach((e) => {
            const texto = `v.${e.numA} "${e.trechoA}" ↔ v.${e.numB} "${e.trechoB}" (${e.posicao} · ${e.proximidade})${
                e.tipo ? ` — ${e.tipo}` : ''
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
                            orientation: emPaisagem
                                ? PageOrientation.LANDSCAPE
                                : PageOrientation.PORTRAIT,
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
