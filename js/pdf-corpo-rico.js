// ============================================================
// pdf-corpo-rico.js: o desenho do corpo do Texto no PDF (cor, fundo,
// negrito, itálico, sublinhado, tamanho e alinhamento por trecho), a
// limpeza de caracteres fora das fontes padrão do jsPDF e a leitura das
// linhas de Markdown que cercam o corpo.
//
// Morava em exportar-pdf.js; foi separado (01/11/2026) para o PDF do sorteio
// (baixar-sorteio-pdf.js) desenhar o texto igual ao do Arquivo sem importar
// exportar-pdf.js, que puxa o `db` global. Comportamento igual ao de antes:
// exportar-pdf.js importa daqui e reexporta `saneParaPdf` e
// `corpoParaLinhasRicas`, como sempre.
// ============================================================

import { corpoParaLinhasRicas, linhaTemFundoUniforme, blocosDeFundoContinuos } from './utils.js';

// ─── Caracteres fora do alcance das fontes padrão do jsPDF ─────────────
// Helvetica/Times/Courier (as três fontes padrão do jsPDF, sem precisar
// vendorizar um arquivo de fonte à parte) só cobrem WinAnsi — na prática
// Latin-1: letras acentuadas do português passam, mas emoji (🟢🟡🔵🔴⚪🔒,
// usados nos rótulos de Status — ver INFO_STATUS em exportar-md.js),
// a seta "→" (usada no Fora de escopo) e "⚠️" (Conteúdo Sensível/Vocabulário
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

export function saneParaPdf(texto) {
    let t = String(texto ?? '');
    SUBSTITUICOES_SEGURAS_PDF.forEach(([re, subst]) => {
        t = t.replace(re, subst);
    });
    // Rede de segurança: qualquer outro caractere fora do Latin-1 que
    // ainda passar (emoji novo, símbolo esquecido na lista acima etc.)
    // é melhor sumir do que corromper a linha inteira de novo. O range
    // \u0000-\u00ff é Latin-1 de propósito (inclui os controles 0-31 e
    // 127-159, que fazem parte da tabela e nunca corrompem o PDF) — não
    // é um \x00 perdido por engano, daí o eslint-disable.
    // As fontes padrão do jsPDF cobrem a WinAnsi (Windows-1252), que além do
    // Latin-1 tem aspas curvas, travessão, meia-risca, reticências, ‹ ›, †, ‡, ‰,
    // €, ™, Œ, œ, Š, š, Ž, ž, Ÿ, ƒ, ˆ e ˜. Esses passam (conferido no jsPDF 2.5.1:
    // saem certos em regular e negrito, sem o efeito de letras esparramadas).
    // Sem esta exceção, “aspas” e — sumiam em silêncio do PDF.
    return t.replace(
        // eslint-disable-next-line no-control-regex
        /[^\u0000-\u00ff\u2013\u2014\u2018-\u201e\u2020\u2021\u2026\u2030\u2039\u203a\u20ac\u2122\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u0192\u02c6\u02dc]/g,
        '',
    );
}

// Converte uma linha "crua" de markdown (sem o marcador de lista "- ",
// já removido por quem chama) na forma como ela deve entrar no PDF:
// nível de título (0 = corpo do texto, 1/2/3 = #, ##, ###), texto sem
// os marcadores de ênfase/HTML inline, e se é uma linha de citação
// (bloco de Conteúdo Sensível/Vocabulário Hiperacionante, ver
// itemParaMarkdown em exportar-md.js). Usada só nas linhas EM VOLTA do
// Texto (meta, Notas, Anexos...) — o corpo do Texto em si passa por
// renderizarCorpoRico(), não por aqui.
export function analisarLinha(linhaBruta) {
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
                tachado: run.tachado,
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
    for (
        let i = direcao === 1 ? bloco.inicio : bloco.fim;
        i >= bloco.inicio && i <= bloco.fim;
        i += direcao
    ) {
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
    const { margem, larguraUtil, estadoY, quebrarPaginaSeNecessario, tamanhoBase, alturaPagina } =
        opcoes;
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
    const espacoFantasmaUltimaLinha =
        ultimoTamanho * 1.4 - extensaoVerticalTexto(ultimoTamanho).descida;
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
    const {
        margem,
        larguraUtil,
        estadoY,
        quebrarPaginaSeNecessario,
        tamanhoBase,
        suprimirFundoDeLinhaInteira,
    } = opcoes;
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

    subLinhas.forEach((sub, indiceSub) => {
        const maiorTamanho = Math.max(...sub.map((p) => p.tamanho));
        const alturaLinha = maiorTamanho * 1.4;
        quebrarPaginaSeNecessario(alturaLinha);

        // Largura total da sub-linha, pra resolver alinhamento.
        const larguraTotal = sub.reduce(
            (acc, p, i) => acc + largura(p) + (i > 0 ? larguraEspaco() : 0),
            0,
        );
        let x = margem;
        // Justificado: em vez de deslocar o x inicial (como right/
        // center), aumenta o ESPAÇO ENTRE PALAVRAS pra ocupar a
        // largura útil inteira — mas só quando há pelo menos 2
        // palavras (senão não há espaço nenhum pra esticar) e a
        // sub-linha NÃO é a última da linha/verso (a última
        // sub-linha de um parágrafo não é esticada em tipografia
        // convencional — senão a última linha de um trecho curto
        // ficaria com espaços enormes entre 2-3 palavras soltas).
        const ehUltimaSubLinha = indiceSub === subLinhas.length - 1;
        let espacoEntrePalavras = larguraEspaco();
        if (alinhamento === 'right') {
            x = margem + (larguraUtil - larguraTotal);
        } else if (alinhamento === 'center') {
            x = margem + (larguraUtil - larguraTotal) / 2;
        } else if (alinhamento === 'justify' && !ehUltimaSubLinha && sub.length > 1) {
            const larguraPalavras = sub.reduce((acc, p) => acc + largura(p), 0);
            espacoEntrePalavras = (larguraUtil - larguraPalavras) / (sub.length - 1);
        }

        // 1º passo: só calcula onde cada palavra vai cair (sem
        // desenhar nada ainda) — o fundo precisa ser desenhado ANTES
        // do texto, mas só sabemos a largura/posição de cada palavra
        // depois de já ter passado por todas (mesmo cálculo de
        // largura(palavra) já usado acima pro empacotamento, reaproveitado
        // aqui em vez de medido de novo dentro do laço de desenho).
        const posicoes = sub.map((palavra, i) => {
            if (i > 0) x += espacoEntrePalavras;
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
            if (palavra.tachado) {
                // Traço na altura média da palavra (proporcional ao
                // tamanho da fonte, ao contrário do sublinhado acima
                // que usa um deslocamento fixo de 1.5pt — abaixo da
                // linha de base um valor fixo funciona bem porque a
                // descida das letras é pequena e pouco variável;
                // achar o "meio" do texto precisa escalar com o
                // tamanho, senão um trecho grande (ex.: 24pt) ficaria
                // com o traço baixo demais, quase colado no sublinhado).
                doc.setDrawColor(
                    palavra.cor ? palavra.cor.r : 0,
                    palavra.cor ? palavra.cor.g : 0,
                    palavra.cor ? palavra.cor.b : 0,
                );
                const yTachado = estadoY.y - palavra.tamanho * 0.3;
                doc.line(xPalavra, yTachado, xPalavra + w, yTachado);
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
export function renderizarCorpoRico(doc, textoOriginal, opcoes) {
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
