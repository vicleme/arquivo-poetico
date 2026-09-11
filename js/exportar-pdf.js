// ============================================================
// exportar-pdf.js — Exportação em PDF (.pdf), formato novo da
// coluna Ações de Poemas/Prosas (ver acoes-coluna.js) e do modal
// de Visualização (ver visualizar.js).
//
// Reaproveita a mesma seleção/ordem de campos de exportar-md.js
// (itemParaMarkdownPartes) pra tudo em volta do corpo do Texto — meta,
// Notas, Anexos etc. — assim .md e .pdf nunca divergem em QUAIS campos
// entram nem em que ordem. O corpo do Texto em si é a exceção: é
// renderizado a partir do HTML/Markdown híbrido ORIGINAL do item (ver
// renderizarCorpoRico), não do Markdown já achatado, porque só assim dá
// pra reproduzir cor/negrito/itálico/sublinhado/alinhamento de verdade
// no PDF (ver corpoParaMarkdown em exportar-md.js, que descarta tudo
// isso — não tem como recuperar o estilo de um Markdown que já não o
// carrega mais).
//
// Depende do jsPDF vendorizado via CDN (ver <script> em index.html,
// mesmo padrão do Tailwind) — carrega só quando o botão Baixar em
// PDF é usado pela primeira vez, então preferimos falhar com uma
// mensagem clara (ver gerarPdfExportacao) a travar a tela se a
// internet cair bem nessa hora.
// ============================================================

import { itemParaMarkdownPartes } from './exportar-md.js';
import { corpoParaLinhasRicas, linhaTemFundoUniforme, blocosDeFundoContinuos } from './utils.js';

function obterConstrutorJsPdf() {
    return window.jspdf?.jsPDF || null;
}

// ─── Caracteres fora do alcance das fontes padrão do jsPDF ─────────────
// Helvetica/Times/Courier (as três fontes padrão do jsPDF, sem precisar
// vendorizar um arquivo de fonte à parte) só cobrem WinAnsi — na prática
// Latin-1: letras acentuadas do português passam, mas emoji (🟢🟡🔵🔴⚪🔒,
// usados nos rótulos de Status — ver INFO_STATUS em exportar-md.js),
// a seta "→" (usada em Localização) e "⚠️" (Conteúdo Sensível/Vocabulário
// Hiperacionante) não. Pior do que só "sumir": ao encontrar QUALQUER
// caractere fora desse alcance numa string, o jsPDF muda o modo de
// codificação da CHAMADA INTEIRA pra um fallback UTF-16 sem CMap de
// verdade pro PDF resultante — cada caractere (inclusive os que eram
// perfeitamente válidos, como "Localização") sai com um byte nulo
// espúrio grudado antes dele, que a maioria dos leitores de PDF desenha
// como um glifo extra/estreito, dando aquele efeito de letras
// esparramadas com espaço enorme entre elas. O "•" usado como marcador
// de lista tem o mesmo problema mesmo sozinho (não está no mapa de
// glifos que o jsPDF carrega pra essas fontes, e simplesmente some).
// Corrige na raiz: troca os símbolos problemáticos por equivalentes
// ASCII ANTES de qualquer doc.text()/splitTextToSize(), só pro PDF (o
// .md e a visualização em tela continuam com os símbolos de verdade).
const SUBSTITUICOES_SEGURAS_PDF = [
    [/→/g, '->'],
    [/⚠️?/g, ''],
    [/[🟢🟡🔵🔴⚪🔒]/gu, ''],
    [/•/g, '-'],
];

function saneParaPdf(texto) {
    let t = String(texto ?? '');
    SUBSTITUICOES_SEGURAS_PDF.forEach(([re, subst]) => {
        t = t.replace(re, subst);
    });
    // Rede de segurança: qualquer outro caractere fora do Latin-1 que
    // ainda passar (emoji novo, símbolo esquecido na lista acima etc.)
    // é melhor sumir do que corromper a linha inteira de novo.
    return t.replace(/[^\u0000-\u00ff]/g, '');
}

// Converte uma linha "crua" de markdown (sem o marcador de lista "- ",
// já removido por quem chama) na forma como ela deve entrar no PDF:
// nível de título (0 = corpo do texto, 1/2/3 = #, ##, ###), texto sem
// os marcadores de ênfase/HTML inline, e se é uma linha de citação
// (bloco de Conteúdo Sensível/Vocabulário Hiperacionante, ver
// itemParaMarkdown em exportar-md.js). Usada só nas linhas EM VOLTA do
// Texto (meta, Notas, Anexos...) — o corpo do Texto em si passa por
// renderizarCorpoRico(), não por aqui.
function analisarLinha(linhaBruta) {
    let linha = linhaBruta;
    let nivelTitulo = 0;
    let citacao = false;

    const tituloMatch = linha.match(/^(#{1,3})\s+(.*)$/);
    if (tituloMatch) {
        nivelTitulo = tituloMatch[1].length;
        linha = tituloMatch[2];
    } else if (linha.startsWith('> ')) {
        citacao = true;
        linha = linha.slice(2);
    }

    linha = linha
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/(^|[^\w])_(.+?)_(?!\w)/g, '$1$2')
        .replace(/<\/?u>/gi, '');

    return { texto: saneParaPdf(linha), nivelTitulo, citacao };
}

// ─── Corpo rico do Texto ────────────────────────────────────────────────
// Reproduz no PDF a formatação aplicada pela toolbar do editor (ver
// wrapText/applyStyle em editor.js): **negrito**, _itálico_,
// <u>sublinhado</u> e um <div style="color/font-family/font-size/
// text-align">...</div> por trecho selecionado (ver ALLOWLIST_TEXTO_RICO
// em utils.js pro conjunto completo aceito na tela — aqui cobrimos o que
// a toolbar de fato produz; qualquer outra tag eventualmente colada de
// fora vira texto puro, sem quebrar o parser). font-family não é
// reproduzida (as fontes padrão do jsPDF são só Helvetica/Times/Courier,
// sem como carregar uma fonte arbitrária sem vendorizar um arquivo à
// parte) — cor, fundo, tamanho, negrito, itálico, sublinhado e alinhamento
// sim. Fundo (shading) é desenhado como um retângulo preenchido ATRÁS do
// texto (ver extensaoVerticalTexto abaixo) — não existe "background"
// nativo de texto no jsPDF, então a caixa é aproximada a partir do
// tamanho da fonte (jsPDF não expõe métricas reais de ascent/descent das
// fontes padrão). Por padrão o retângulo cola nas palavras que têm fundo
// (largura = largura do texto, ver "2º passo" em renderizarCorpoRico) —
// SALVO quando o fundo cobre a linha INTEIRA (linhaTemFundoUniforme,
// utils.js), caso em que o retângulo estica margem a margem (largura
// útil da página), não só ao redor do texto. Ao contrário do .md (ver
// legendaCorParaMarkdown em exportar-md.js), o PDF não ganha uma legenda
// textual descrevendo o fundo — ele mostra o fundo de verdade, então a
// legenda seria redundante aqui.

// analisarEstiloDeDiv/corParaRgb/corpoParaLinhasRicas moraram aqui antes;
// agora moram em utils.js (importado acima) porque exportar-md.js também
// precisa delas pra montar a legenda de cor/fonte (legendaCorParaMarkdown)
// e não pode importar de exportar-pdf.js sem criar um import circular
// (este arquivo já importa itemParaMarkdownPartes de lá). Reexportada
// abaixo só pra exportar-docx.js não precisar saber que o parser mudou
// de casa.
export { corpoParaLinhasRicas };

// Estilo → nome da variante de fonte que o jsPDF espera em setFont().
function variantePorEstilo(negrito, italico) {
    if (negrito && italico) return 'bolditalic';
    if (negrito) return 'bold';
    if (italico) return 'italic';
    return 'normal';
}

// Aproximação de ascent/descent do Helvetica pra desenhar a caixa de
// fundo (shading) coladinha ao texto — jsPDF não expõe métricas reais
// da fonte sem carregar um arquivo à parte (mesma limitação de
// font-family, ver comentário acima). Os fatores (0.78 acima da
// baseline, 0.22 abaixo) foram calibrados visualmente: cobrem
// ascendentes/descendentes comuns (ex.: "ç", "j") sem sobrar espaço
// em branco grande demais acima de texto só com letras baixas.
function extensaoVerticalTexto(tamanho) {
    return { subida: tamanho * 0.78, descida: tamanho * 0.22 };
}

function mesmoFundo(a, b) {
    return JSON.stringify(a || null) === JSON.stringify(b || null);
}

// ─── Caixa contínua (padding/border-radius) ─────────────────────────────
// Um <div style="background-color:...; padding:...; border-radius:...">
// embrulhando várias linhas (ver blocosDeFundoContinuos, utils.js) vira
// UMA caixa só — um retângulo (arredondado quando border-radius > 0)
// desenhado ANTES de qualquer texto do bloco, com o texto deslocado pra
// dentro pelo valor do padding (convertido de px pra pt: 1px = 0.75pt,
// mesma conversão usada no resto do PDF pra font-size). Isso é diferente
// do fundo "chapado" de sempre (uma faixa por linha, colada ao texto) —
// esse continua existindo pra qualquer <div> só com background-color,
// sem padding nem border-radius (ver renderizarLinhaRica abaixo).
//
// Pra desenhar o retângulo ANTES do texto (senão o texto ficaria por
// baixo da caixa) sem "adivinhar" a altura, medimos o bloco inteiro
// primeiro (medirAlturaBloco) usando exatamente o mesmo empacotamento de
// palavras (empacotarPalavras) que o desenho de verdade vai usar depois
// — as duas passadas nunca divergem porque chamam a mesma função pura.
//
// Limitação aceita: se o bloco inteiro não couber nem numa página em
// branco, desistimos da caixa (devolve false) e quem chama cai de volta
// pro desenho linha a linha de sempre, que sabe quebrar página no meio
// — melhor perder a caixa contínua numa poesia excepcionalmente longa
// do que arriscar uma caixa cortada ao meio entre duas páginas.
function empacotarPalavras(doc, runsDaLinha, larguraUtilLinha, tamanhoBase) {
    const palavras = [];
    runsDaLinha.forEach((run) => {
        const partes = saneParaPdf(run.texto).split(/\s+/).filter(Boolean);
        partes.forEach((p) =>
            palavras.push({
                texto: p,
                negrito: run.negrito,
                italico: run.italico,
                sublinhado: run.sublinhado,
                cor: run.cor,
                fundo: run.fundo,
                tamanho: run.tamanho || tamanhoBase,
            }),
        );
    });
    const alinhamento = runsDaLinha.find((r) => r.alinhamento)?.alinhamento || 'left';
    if (!palavras.length) return { subLinhas: [], alinhamento };

    function largura(palavra) {
        doc.setFont('helvetica', variantePorEstilo(palavra.negrito, palavra.italico));
        doc.setFontSize(palavra.tamanho);
        return doc.getTextWidth(palavra.texto);
    }
    const larguraEspaco = (tamanho = tamanhoBase) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(tamanho);
        return doc.getTextWidth(' ');
    };

    const subLinhas = [];
    let atual = [];
    let larguraAtual = 0;
    palavras.forEach((palavra) => {
        const w = largura(palavra);
        const comEspaco = atual.length ? larguraEspaco(palavra.tamanho) : 0;
        if (atual.length && larguraAtual + comEspaco + w > larguraUtilLinha) {
            subLinhas.push(atual);
            atual = [palavra];
            larguraAtual = w;
        } else {
            atual.push(palavra);
            larguraAtual += comEspaco + w;
        }
    });
    if (atual.length) subLinhas.push(atual);

    return { subLinhas, alinhamento };
}

function alturaLinhaEmBranco(linhas, indice, tamanhoBase) {
    const proximaComTexto = linhas.slice(indice + 1).find((l) => l.length);
    const maiorTamanhoVizinho = proximaComTexto
        ? Math.max(...proximaComTexto.map((r) => r.tamanho || tamanhoBase))
        : tamanhoBase;
    return Math.max(tamanhoBase, maiorTamanhoVizinho) * 1.4;
}

function medirAlturaBloco(doc, linhas, bloco, larguraUtilBloco, tamanhoBase) {
    let altura = 0;
    for (let indice = bloco.inicio; indice <= bloco.fim; indice++) {
        const runsDaLinha = linhas[indice];
        if (!runsDaLinha.length) {
            altura += alturaLinhaEmBranco(linhas, indice, tamanhoBase);
            continue;
        }
        const { subLinhas } = empacotarPalavras(doc, runsDaLinha, larguraUtilBloco, tamanhoBase);
        if (!subLinhas.length) {
            altura += tamanhoBase * 1.4;
            continue;
        }
        subLinhas.forEach((sub) => {
            altura += Math.max(...sub.map((p) => p.tamanho)) * 1.4;
        });
    }
    return altura;
}

// Tamanho (maior entre os runs) da primeira ou última linha COM texto
// de um bloco — usado só pra calibrar a extensão vertical real (subida/
// descida, ver extensaoVerticalTexto) das bordas do bloco: sem isso, o
// padding do topo/base seria medido a partir da BASELINE do texto, não
// do topo/fundo visual das letras (ver comentário em
// renderizarBlocoComCaixa). `direcao` é 1 pra buscar a partir do início
// (primeira linha com texto) ou -1 a partir do fim (última).
function tamanhoNaBorda(linhas, bloco, tamanhoBase, direcao) {
    for (let i = direcao === 1 ? bloco.inicio : bloco.fim; i >= bloco.inicio && i <= bloco.fim; i += direcao) {
        const runs = linhas[i];
        if (runs && runs.length) return Math.max(...runs.map((r) => r.tamanho || tamanhoBase));
    }
    return tamanhoBase;
}

// Desenha uma caixa contínua pro bloco inteiro (retângulo — arredondado
// quando bloco.raio > 0 — preenchido com bloco.fundo, com padding
// convertido pra pt) e delega o texto de cada linha do bloco pra
// renderizarLinhaRica, deslocado/estreitado pelo padding e com o fundo
// "de linha" de sempre suprimido (a caixa já cobre tudo). Devolve
// `true` quando desenhou a caixa, `false` quando desistiu (não coube
// nem numa página em branco — ver comentário acima).
function renderizarBlocoComCaixa(doc, linhas, bloco, opcoes) {
    const { margem, larguraUtil, estadoY, quebrarPaginaSeNecessario, tamanhoBase, alturaPagina } = opcoes;
    const PX_PARA_PT = 0.75;
    const paddingPt = (bloco.padding || 0) * PX_PARA_PT;
    const raioPt = (bloco.raio || 0) * PX_PARA_PT;
    const larguraUtilBloco = larguraUtil - paddingPt * 2;
    if (larguraUtilBloco < 20) return false; // padding absurdo — não força um bloco ilegível

    const alturaConteudo = medirAlturaBloco(doc, linhas, bloco, larguraUtilBloco, tamanhoBase);

    // O laço de renderização (igual o de fora, ver renderizarLinhaRica)
    // avança `tamanho*1.4` por linha — baseline até a PRÓXIMA baseline —
    // então a primeira linha nasce colada no topo (a "subida"/ascent da
    // fonte não está reservada antes dela) e a última deixa, depois de
    // si, um respiro do tamanho de uma linha INTEIRA que nunca chega a
    // ser usado (não existe próxima linha ali dentro). Resultado, com o
    // padding somado por cima disso tudo: praticamente nenhuma margem
    // visual no topo (padding < subida da fonte já come o respiro) e
    // uma sobra enorme, pintada, no fundo — e ainda assim, como a caixa
    // termina bem em cima da baseline real do próximo campo (Notas/
    // Autoria), aquele campo nasce com a própria "subida" invadindo a
    // área pintada. Corrigido reservando embaixo só a "descida" real da
    // última linha (não a linha fantasma inteira) e embaixo dela mais
    // um respiro de segurança (fora da caixa) do tamanho da maior fonte
    // que costuma vir logo depois (Notas em H3/11,5pt); em cima, soma-se
    // a "subida" da primeira linha ao padding, pra sobrar exatamente o
    // padding pedido entre a borda e o topo visual das letras.
    const primeiroTamanho = tamanhoNaBorda(linhas, bloco, tamanhoBase, 1);
    const ultimoTamanho = tamanhoNaBorda(linhas, bloco, tamanhoBase, -1);
    const extraTopo = extensaoVerticalTexto(primeiroTamanho).subida;
    const espacoFantasmaUltimaLinha = ultimoTamanho * 1.4 - extensaoVerticalTexto(ultimoTamanho).descida;
    const reservaSeguranca = extensaoVerticalTexto(Math.max(tamanhoBase, 11.5)).subida;

    const alturaTotal = alturaConteudo + paddingPt * 2 + extraTopo - espacoFantasmaUltimaLinha;
    const alturaPaginaUtil = alturaPagina - margem * 2;
    if (alturaTotal > alturaPaginaUtil) return false;

    quebrarPaginaSeNecessario(alturaTotal);

    const boxTopoY = estadoY.y;
    doc.setFillColor(bloco.fundo.r, bloco.fundo.g, bloco.fundo.b);
    if (raioPt > 0 && typeof doc.roundedRect === 'function') {
        doc.roundedRect(margem, boxTopoY, larguraUtil, alturaTotal, raioPt, raioPt, 'F');
    } else {
        doc.rect(margem, boxTopoY, larguraUtil, alturaTotal, 'F');
    }

    estadoY.y += paddingPt + extraTopo;
    for (let indice = bloco.inicio; indice <= bloco.fim; indice++) {
        renderizarLinhaRica(doc, linhas, indice, {
            margem: margem + paddingPt,
            larguraUtil: larguraUtilBloco,
            estadoY,
            quebrarPaginaSeNecessario,
            tamanhoBase,
            suprimirFundoDeLinhaInteira: true,
        });
    }
    // Desfaz o respiro fantasma da última linha (chegamos exatamente na
    // borda inferior real da caixa) e só então soma o padding de baixo.
    estadoY.y += paddingPt - espacoFantasmaUltimaLinha;
    // Respiro de segurança FORA da caixa, pra o próximo campo (Notas/
    // Autoria/Anexos) não nascer com a própria subida invadindo a área
    // pintada — ver comentário acima.
    estadoY.y += reservaSeguranca;
    return true;
}

// Desenha UMA linha (índice `indice` de `linhas`) — extraído de
// renderizarCorpoRico pra poder ser chamado tanto no caminho normal
// (fundo "chapado" linha a linha) quanto de dentro de
// renderizarBlocoComCaixa (texto deslocado pelo padding, com o fundo de
// linha suprimido porque a caixa contínua já foi desenhada por trás).
function renderizarLinhaRica(doc, linhas, indice, opcoes) {
    const { margem, larguraUtil, estadoY, quebrarPaginaSeNecessario, tamanhoBase, suprimirFundoDeLinhaInteira } =
        opcoes;
    const runsDaLinha = linhas[indice];
    if (!runsDaLinha.length) {
            // Linha em branco (verso/parágrafo vazio, ex.: um Enter duplo
            // no editor) — o efeito pretendido é uma quebra de parágrafo,
            // que precisa ocupar PELO MENOS o espaço de uma linha normal.
            // Antes usava um valor fixo (tamanhoBase*0.8 = 8pt pro
            // tamanhoBase de 10 usado aqui), menor que a altura de uma
            // linha comum (tamanhoBase*1.4 = 14pt) — ou seja, uma quebra
            // de PARÁGRAFO ficava com MENOS respiro do que uma simples
            // quebra de LINHA, o oposto do esperado, e por isso a linha
            // em branco "sumia" visualmente no PDF. Também olha a linha
            // seguinte com conteúdo: se ela tiver um tamanho de fonte bem
            // maior (ex.: um <div style="font-size:48pt">, caso comum de
            // uma palavra de destaque), o respiro escala junto — senão um
            // texto grande vem colado num respiro pensado pro corpo
            // normal, pequeno demais pra ele.
            const proximaComTexto = linhas.slice(indice + 1).find((l) => l.length);
            const maiorTamanhoVizinho = proximaComTexto
                ? Math.max(...proximaComTexto.map((r) => r.tamanho || tamanhoBase))
                : tamanhoBase;
            estadoY.y += Math.max(tamanhoBase, maiorTamanhoVizinho) * 1.4;
            return;
        }

        // Alinhamento da linha: o primeiro run que declarar um vale pra
        // linha inteira (na prática, applyStyle sempre envolve o verso
        // inteiro quando o objetivo é alinhar, então não costuma haver
        // mistura de alinhamentos numa mesma linha).
        const alinhamento = runsDaLinha.find((r) => r.alinhamento)?.alinhamento || 'left';
        // Fundo de linha inteira (todo run com texto na linha compartilha
        // o mesmo fundo) vira faixa de largura total em vez de colar nas
        // palavras — ver comentário no topo do arquivo.
        const fundoUniforme = linhaTemFundoUniforme(runsDaLinha);

        // Empacotamento em sub-linhas (quebra de palavra) — fatorado em
        // empacotarPalavras() pra ser a MESMA função usada por
        // medirAlturaBloco() na medição prévia de uma caixa contínua
        // (ver comentário acima de renderizarBlocoComCaixa); assim as
        // duas passadas nunca divergem.
        const { subLinhas } = empacotarPalavras(doc, runsDaLinha, larguraUtil, tamanhoBase);
        if (!subLinhas.length) {
            estadoY.y += tamanhoBase * 1.4;
            return;
        }

        function largura(palavra) {
            doc.setFont('helvetica', variantePorEstilo(palavra.negrito, palavra.italico));
            doc.setFontSize(palavra.tamanho);
            return doc.getTextWidth(palavra.texto);
        }
        // Largura do espaço no tamanho da palavra à direita dele (não no
        // tamanhoBase fixo) — senão um espaço "normal" de 10pt some
        // visualmente colado entre duas palavras num trecho maior (ex.:
        // 16pt de <div style="font-size:16pt">), como se tivesse virado
        // uma palavra só.
        const larguraEspaco = (tamanho = tamanhoBase) => {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(tamanho);
            return doc.getTextWidth(' ');
        };

        subLinhas.forEach((sub) => {
            const maiorTamanho = Math.max(...sub.map((p) => p.tamanho));
            const alturaLinha = maiorTamanho * 1.4;
            quebrarPaginaSeNecessario(alturaLinha);

            // Largura total da sub-linha, pra resolver alinhamento.
            const larguraTotal = sub.reduce(
                (acc, p, i) => acc + largura(p) + (i > 0 ? larguraEspaco() : 0),
                0,
            );
            let x = margem;
            if (alinhamento === 'right') x = margem + (larguraUtil - larguraTotal);
            else if (alinhamento === 'center') x = margem + (larguraUtil - larguraTotal) / 2;

            // 1º passo: só calcula onde cada palavra vai cair (sem
            // desenhar nada ainda) — o fundo precisa ser desenhado ANTES
            // do texto, mas só sabemos a largura/posição de cada palavra
            // depois de já ter passado por todas (mesmo cálculo de
            // largura(palavra) já usado acima pro empacotamento, reaproveitado
            // aqui em vez de medido de novo dentro do laço de desenho).
            const posicoes = sub.map((palavra, i) => {
                if (i > 0) x += larguraEspaco();
                const w = largura(palavra);
                const posicao = { palavra, x, w };
                x += w;
                return posicao;
            });

            // 2º passo: fundo (shading), desenhado ATRÁS do texto. Suprimido
            // quando a linha faz parte de uma caixa contínua (ver
            // renderizarBlocoComCaixa) — a caixa inteira já foi pintada por
            // trás do bloco, repetir aqui só faria o mesmo fundo por cima
            // de novo, sem efeito visual, e sem respeitar o padding.
            if (fundoUniforme && !suprimirFundoDeLinhaInteira) {
                // Linha inteira com o mesmo fundo: um retângulo só, margem
                // a margem (largura útil da página) — não ao redor das
                // palavras.
                const { subida, descida } = extensaoVerticalTexto(maiorTamanho);
                doc.setFillColor(fundoUniforme.r, fundoUniforme.g, fundoUniforme.b);
                doc.rect(margem, estadoY.y - subida, larguraUtil, subida + descida, 'F');
            } else if (!fundoUniforme) {
                // Palavras ADJACENTES com o mesmo fundo viram um único
                // retângulo — cobrindo também o espaço entre elas — em vez
                // de uma caixa por palavra com uma lasquinha branca no
                // espaço; mesmo cuidado que motivou a troca da geração de
                // .docx pro OOXML nativo (shading colado ao texto, sem
                // buracos artificiais).
                let grupoFundo = null;
                const fecharGrupoFundo = () => {
                    if (!grupoFundo) return;
                    const { subida, descida } = extensaoVerticalTexto(grupoFundo.maiorTamanho);
                    doc.setFillColor(grupoFundo.fundo.r, grupoFundo.fundo.g, grupoFundo.fundo.b);
                    doc.rect(
                        grupoFundo.xInicio,
                        estadoY.y - subida,
                        grupoFundo.xFim - grupoFundo.xInicio,
                        subida + descida,
                        'F',
                    );
                    grupoFundo = null;
                };
                posicoes.forEach(({ palavra, x: xPalavra, w }) => {
                    if (!palavra.fundo) {
                        fecharGrupoFundo();
                        return;
                    }
                    if (grupoFundo && mesmoFundo(grupoFundo.fundo, palavra.fundo)) {
                        grupoFundo.xFim = xPalavra + w;
                        grupoFundo.maiorTamanho = Math.max(grupoFundo.maiorTamanho, palavra.tamanho);
                    } else {
                        fecharGrupoFundo();
                        grupoFundo = {
                            fundo: palavra.fundo,
                            xInicio: xPalavra,
                            xFim: xPalavra + w,
                            maiorTamanho: palavra.tamanho,
                        };
                    }
                });
                fecharGrupoFundo();
            }

            // 3º passo: texto por cima do fundo já desenhado (e sublinhado
            // por cima do texto, como já era antes).
            posicoes.forEach(({ palavra, x: xPalavra, w }) => {
                doc.setFont('helvetica', variantePorEstilo(palavra.negrito, palavra.italico));
                doc.setFontSize(palavra.tamanho);
                if (palavra.cor) doc.setTextColor(palavra.cor.r, palavra.cor.g, palavra.cor.b);
                else doc.setTextColor(0, 0, 0);

                doc.text(palavra.texto, xPalavra, estadoY.y);
                if (palavra.sublinhado) {
                    doc.setDrawColor(
                        palavra.cor ? palavra.cor.r : 0,
                        palavra.cor ? palavra.cor.g : 0,
                        palavra.cor ? palavra.cor.b : 0,
                    );
                    doc.line(xPalavra, estadoY.y + 1.5, xPalavra + w, estadoY.y + 1.5);
                }
            });

            doc.setTextColor(0, 0, 0);
            estadoY.y += alturaLinha;
        });
}

// Desenha o corpo rico de um item (uma linha por verso/parágrafo do
// campo `texto`), com quebra de página e de linha (respeitando a
// largura útil, com quebra de palavra) e negrito/itálico/sublinhado/
// cor/tamanho/alinhamento por trecho. Mutabiliza `estadoY` (objeto com
// `{ y }`, ver gerarPdfExportacao) e usa `quebrarPaginaSeNecessario` do
// chamador — mesmo padrão dos outros blocos, pra todo mundo respeitar a
// mesma paginação. Linhas dentro de um bloco com padding/border-radius
// (ver blocosDeFundoContinuos, utils.js) são desviadas pra
// renderizarBlocoComCaixa, que desenha a caixa contínua e delega cada
// linha de volta pra renderizarLinhaRica; o resto segue o caminho de
// sempre, linha a linha.
function renderizarCorpoRico(doc, textoOriginal, opcoes) {
    const linhas = corpoParaLinhasRicas(textoOriginal || '');
    const blocosComCaixa = blocosDeFundoContinuos(linhas).filter((b) => b.padding || b.raio);
    const blocoPorInicio = new Map(blocosComCaixa.map((b) => [b.inicio, b]));

    let indice = 0;
    while (indice < linhas.length) {
        const bloco = blocoPorInicio.get(indice);
        if (bloco && renderizarBlocoComCaixa(doc, linhas, bloco, opcoes)) {
            indice = bloco.fim + 1;
            continue;
        }
        renderizarLinhaRica(doc, linhas, indice, {
            ...opcoes,
            suprimirFundoDeLinhaInteira: false,
        });
        indice++;
    }
}

// Gera o documento jsPDF (objeto `doc`, ainda não salvo) a partir dos
// mesmos itens que iriam pro .md — ver gerarMarkdownExportacao().
export function gerarPdfExportacao(itens) {
    const JsPDF = obterConstrutorJsPdf();
    if (!JsPDF) {
        throw new Error(
            'A biblioteca de PDF não carregou (verifique a conexão com a internet) — tente novamente em alguns segundos.',
        );
    }

    const doc = new JsPDF({ unit: 'pt', format: 'a4' });
    const margem = 48;
    const larguraUtil = doc.internal.pageSize.getWidth() - margem * 2;
    const alturaPagina = doc.internal.pageSize.getHeight();
    const estadoY = { y: margem };

    function quebrarPaginaSeNecessario(alturaLinha) {
        if (estadoY.y + alturaLinha > alturaPagina - margem) {
            doc.addPage();
            estadoY.y = margem;
        }
    }

    // Renderiza um trecho de markdown "simples" (meta, Notas, Anexos,
    // cabeçalhos etc.) linha a linha — mesma lógica de sempre, só que
    // fatorada pra ser chamada duas vezes por item (antes/depois do
    // corpo do Texto, que tem seu próprio renderizador acima).
    function renderizarLinhasSimples(md) {
        // Reconhece SEQUÊNCIAS de linha em branco (\n\n\n..., ou "---"
        // logo emendado numa linha vazia) e soma o respiro de 8pt só na
        // PRIMEIRA da sequência — as blanks seguintes, consecutivas, não
        // somam de novo. Sem isso, um "### Texto\n\n" (uma linha de
        // título + UMA linha em branco de verdade) processado por
        // .split('\n') vira três entradas — título, "", "" — e cada
        // string vazia extra soma +8pt sozinha, inflando o respiro real
        // pretendido (uma linha em branco) pro dobro.
        let ultimaFoiBranco = false;
        md.split('\n').forEach((linhaBruta) => {
            const linhaSemEspacos = linhaBruta.trim();
            if (!linhaSemEspacos || linhaSemEspacos === '---') {
                if (!ultimaFoiBranco) estadoY.y += 8;
                ultimaFoiBranco = true;
                return;
            }

            const listaMatch = linhaBruta.match(/^- (.*)$/);
            const { texto, nivelTitulo, citacao } = analisarLinha(
                listaMatch ? listaMatch[1] : linhaBruta,
            );
            const prefixo = listaMatch ? '-  ' : '';

            let tamanho = 10;
            let estilo = 'normal';
            if (nivelTitulo === 1) {
                tamanho = 18;
                estilo = 'bold';
            } else if (nivelTitulo === 2) {
                tamanho = 14;
                estilo = 'bold';
            } else if (nivelTitulo === 3) {
                tamanho = 11.5;
                estilo = 'bold';
            }

            // Espaço ANTES do título. Sem isso, um "### Título" que vem
            // colado direto no campo anterior no Markdown de origem (ex.:
            // "- **Autoria:** ...\n### Contexto Histórico/Pessoal...", sem
            // linha em branco entre os dois — ver itemParaMarkdownDepoisDoTexto
            // em exportar-md.js) não ganhava respiro nenhum: só existia
            // espaço DEPOIS do título (+4 no fim desta função), nunca antes.
            // Resultado: cada seção parecia "grudada" na anterior, mesmo
            // quando o Markdown tinha uma linha em branco antes do título
            // (a linha em branco sozinha só rende 8pt — pouco pra separar
            // visualmente um título em negrito do texto corrido acima).
            // Maior pro nível 1/2 (separa blocos inteiros), menor pro 3
            // (subseção dentro do mesmo bloco). Não aplica no topo da
            // página (estadoY.y === margem: nada foi desenhado ainda ali).
            // Se a linha em branco anterior já rendeu o respiro de 8pt
            // (ultimaFoiBranco), o título não precisa do preEspacoTitulo
            // inteiro por cima — é o mesmo respiro contado duas vezes
            // (uma pela linha vazia do Markdown, outra por esta regra).
            // Continua aplicando o respiro cheio só quando o título vem
            // colado direto no conteúdo anterior, sem blank entre eles
            // (motivo original desta regra, ver comentário acima).
            if (nivelTitulo && estadoY.y > margem && !ultimaFoiBranco) {
                const preEspacoTitulo = nivelTitulo === 1 ? 16 : nivelTitulo === 2 ? 12 : 4;
                if (estadoY.y + preEspacoTitulo + tamanho * 1.4 > alturaPagina - margem) {
                    // Título ficaria colado no rodapé (ou cortado) — quebra a
                    // página em vez de gastar o respiro extra num espaço que
                    // a página não tem mais.
                    doc.addPage();
                    estadoY.y = margem;
                } else {
                    estadoY.y += preEspacoTitulo;
                }
            }
            ultimaFoiBranco = false;

            doc.setFont('helvetica', estilo);
            doc.setFontSize(tamanho);
            doc.setTextColor(0, 0, 0);

            const indentacao = citacao ? 16 : 0;
            const linhasQuebradas = doc.splitTextToSize(prefixo + texto, larguraUtil - indentacao);

            linhasQuebradas.forEach((l) => {
                quebrarPaginaSeNecessario(tamanho * 1.4);
                doc.text(l, margem + indentacao, estadoY.y);
                estadoY.y += tamanho * 1.4;
            });

            if (nivelTitulo) estadoY.y += 4;
        });
    }

    // Cabeçalho geral do documento (título + data), igual ao início de
    // gerarMarkdownExportacao().
    const agora = new Date();
    const dataStr = agora.toLocaleDateString('pt-BR');
    renderizarLinhasSimples(
        `# Exportação Poética\n\n_Gerado em ${dataStr} — ${itens.length} texto(s)._\n\n---\n\n`,
    );

    itens.forEach((item, i) => {
        const { antesDoTexto, depoisDoTexto } = itemParaMarkdownPartes(item, i + 1);

        // antesDoTexto termina com "### Texto\n\n" seguido do corpo em
        // Markdown achatado (ver blocoTexto em exportar-md.js) — corta
        // ali: renderiza só até o cabeçalho "### Texto", e o corpo vem
        // do renderizador rico, direto do item.texto original.
        const marcador = '### Texto\n\n';
        const indiceMarcador = antesDoTexto.indexOf(marcador);
        if (indiceMarcador === -1) {
            // Item sem campo Texto preenchido (blocoTexto não emitiu
            // nada) — não há corpo rico pra renderizar, só o resto.
            renderizarLinhasSimples(antesDoTexto);
        } else {
            renderizarLinhasSimples(antesDoTexto.slice(0, indiceMarcador + marcador.length));
            renderizarCorpoRico(doc, item.texto, {
                margem,
                larguraUtil,
                estadoY,
                quebrarPaginaSeNecessario,
                tamanhoBase: 10,
                alturaPagina,
            });
            // Respiro entre o corpo rico e o próximo campo (Notas/Autoria/
            // etc.). Antes era 8pt fixos, somados por cima de qualquer
            // linha em branco que o Markdown de "depoisDoTexto" já tivesse
            // antes do primeiro campo — reduzido pra 4pt, valor mais perto
            // do "+4 pós-título" comum ao resto do documento.
            estadoY.y += 4;
        }

        renderizarLinhasSimples(depoisDoTexto);
        renderizarLinhasSimples('---\n\n');
    });

    return doc;
}

export function baixarPdf(itens, nomeArquivo) {
    const doc = gerarPdfExportacao(itens);
    doc.save(nomeArquivo);
}
