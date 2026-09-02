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

function obterConstrutorJsPdf() {
    return window.jspdf?.jsPDF || null;
}

// ─── Caracteres fora do alcance das fontes padrão do jsPDF ─────────────
// Helvetica/Times/Courier (as três fontes padrão do jsPDF, sem precisar
// vendorizar um arquivo de fonte à parte) só cobrem WinAnsi — na prática
// Latin-1: letras acentuadas do português passam, mas emoji (🟢🟡🔵🔴⚪,
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
    [/[🟢🟡🔵🔴⚪]/gu, ''],
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
// parte) — cor, tamanho, negrito, itálico, sublinhado e alinhamento sim.

function corParaRgb(valorCor) {
    if (!valorCor || valorCor === 'inherit') return null;
    const hex = valorCor.trim().replace('#', '');
    const cheio =
        hex.length === 3
            ? hex
                  .split('')
                  .map((c) => c + c)
                  .join('')
            : hex;
    if (!/^[0-9a-fA-F]{6}$/.test(cheio)) return null;
    return {
        r: parseInt(cheio.slice(0, 2), 16),
        g: parseInt(cheio.slice(2, 4), 16),
        b: parseInt(cheio.slice(4, 6), 16),
    };
}

function analisarEstiloDeDiv(atributoStyle) {
    const estilo = {};
    const corMatch = atributoStyle.match(/color:\s*([^;]+);/);
    if (corMatch) {
        const rgb = corParaRgb(corMatch[1]);
        if (rgb) estilo.cor = rgb;
    }
    const tamanhoMatch = atributoStyle.match(/font-size:\s*([\d.]+)pt/);
    if (tamanhoMatch) estilo.tamanho = Math.min(28, Math.max(7, parseFloat(tamanhoMatch[1])));
    const alinhoMatch = atributoStyle.match(/text-align:\s*(left|right|center)/);
    if (alinhoMatch) estilo.alinhamento = alinhoMatch[1];
    return estilo;
}

const ESTILO_BASE = {
    negrito: false,
    italico: false,
    sublinhado: false,
    cor: null,
    tamanho: null,
    alinhamento: null,
};

// String bruta do campo `texto` → array de linhas, cada linha um array
// de "runs" ({ texto, negrito, italico, sublinhado, cor, tamanho,
// alinhamento }) com estilo já resolvido (cascata de tags aninhadas
// aplicada). Tolerante a HTML malformado (tag sem par correspondente):
// ignora o desbalanceamento em vez de quebrar, já que o dado real do
// acervo tem anos de HTML colado de fontes diversas (ver comentário em
// sanitizarTextoRico, utils.js).
function corpoParaLinhasRicas(textoOriginal) {
    const linhas = [[]];
    // Pilha de frames { estilo, origem }; origem identifica quem abriu o
    // frame ('negrito'/'italico'/'u'/'div'), pra saber qual token fecha
    // ele — necessário porque ** e _ não têm marcador de abertura/
    // fechamento distinto (o mesmo "**" abre e fecha).
    const pilha = [{ estilo: ESTILO_BASE, origem: null }];
    const topo = () => pilha[pilha.length - 1];

    function empurrar(origem, parcial) {
        pilha.push({ estilo: { ...topo().estilo, ...parcial }, origem });
    }
    function desempilharSeForOrigem(origem) {
        if (pilha.length > 1 && topo().origem === origem) pilha.pop();
    }
    function emitirRun(texto) {
        if (!texto) return;
        linhas[linhas.length - 1].push({ texto, ...topo().estilo });
    }

    const tokenRegex = /(<div style="([^"]*)"[^>]*>|<\/div>|<u>|<\/u>|\n|\*\*|_)/g;
    let ultimoIndex = 0;
    let match;

    while ((match = tokenRegex.exec(textoOriginal)) !== null) {
        if (match.index > ultimoIndex) {
            emitirRun(textoOriginal.slice(ultimoIndex, match.index));
        }
        const token = match[1];
        if (token === '\n') {
            linhas.push([]);
        } else if (token === '**') {
            if (topo().origem === 'negrito') desempilharSeForOrigem('negrito');
            else empurrar('negrito', { negrito: true });
        } else if (token === '_') {
            if (topo().origem === 'italico') desempilharSeForOrigem('italico');
            else empurrar('italico', { italico: true });
        } else if (token === '<u>') {
            empurrar('u', { sublinhado: true });
        } else if (token === '</u>') {
            desempilharSeForOrigem('u');
        } else if (token.startsWith('<div')) {
            empurrar('div', analisarEstiloDeDiv(match[2] || ''));
        } else if (token === '</div>') {
            desempilharSeForOrigem('div');
        }
        ultimoIndex = tokenRegex.lastIndex;
    }
    if (ultimoIndex < textoOriginal.length) {
        emitirRun(textoOriginal.slice(ultimoIndex));
    }

    return linhas;
}

// Estilo → nome da variante de fonte que o jsPDF espera em setFont().
function variantePorEstilo(negrito, italico) {
    if (negrito && italico) return 'bolditalic';
    if (negrito) return 'bold';
    if (italico) return 'italic';
    return 'normal';
}

// Desenha o corpo rico de um item (uma linha por verso/parágrafo do
// campo `texto`), com quebra de página e de linha (respeitando a
// largura útil, com quebra de palavra) e negrito/itálico/sublinhado/
// cor/tamanho/alinhamento por trecho. Mutabiliza `estadoY` (objeto com
// `{ y }`, ver gerarPdfExportacao) e usa `quebrarPaginaSeNecessario` do
// chamador — mesmo padrão dos outros blocos, pra todo mundo respeitar a
// mesma paginação.
function renderizarCorpoRico(doc, textoOriginal, opcoes) {
    const { margem, larguraUtil, estadoY, quebrarPaginaSeNecessario, tamanhoBase } = opcoes;
    const linhas = corpoParaLinhasRicas(textoOriginal || '');

    linhas.forEach((runsDaLinha, indice) => {
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

        // Tokeniza em palavras (mantendo o estilo de cada uma) — espaços
        // internos múltiplos são normalizados pra um só; espaçamento
        // exato entre palavras não sobrevive (limitação aceita, não é
        // isso que a toolbar de formatação controla).
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
                    tamanho: run.tamanho || tamanhoBase,
                }),
            );
        });
        if (!palavras.length) {
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

        // Empacota greedy em sub-linhas respeitando larguraUtil.
        const subLinhas = [];
        let atual = [];
        let larguraAtual = 0;
        palavras.forEach((palavra) => {
            const w = largura(palavra);
            const comEspaco = atual.length ? larguraEspaco(palavra.tamanho) : 0;
            if (atual.length && larguraAtual + comEspaco + w > larguraUtil) {
                subLinhas.push(atual);
                atual = [palavra];
                larguraAtual = w;
            } else {
                atual.push(palavra);
                larguraAtual += comEspaco + w;
            }
        });
        if (atual.length) subLinhas.push(atual);

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

            sub.forEach((palavra, i) => {
                if (i > 0) x += larguraEspaco();
                doc.setFont('helvetica', variantePorEstilo(palavra.negrito, palavra.italico));
                doc.setFontSize(palavra.tamanho);
                if (palavra.cor) doc.setTextColor(palavra.cor.r, palavra.cor.g, palavra.cor.b);
                else doc.setTextColor(0, 0, 0);

                doc.text(palavra.texto, x, estadoY.y);
                const w = doc.getTextWidth(palavra.texto);
                if (palavra.sublinhado) {
                    doc.setDrawColor(
                        palavra.cor ? palavra.cor.r : 0,
                        palavra.cor ? palavra.cor.g : 0,
                        palavra.cor ? palavra.cor.b : 0,
                    );
                    doc.line(x, estadoY.y + 1.5, x + w, estadoY.y + 1.5);
                }
                x += w;
            });

            doc.setTextColor(0, 0, 0);
            estadoY.y += alturaLinha;
        });
    });
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
        md.split('\n').forEach((linhaBruta) => {
            const linhaSemEspacos = linhaBruta.trim();
            if (!linhaSemEspacos || linhaSemEspacos === '---') {
                estadoY.y += 8;
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
            if (nivelTitulo && estadoY.y > margem) {
                const preEspacoTitulo = nivelTitulo === 1 ? 16 : nivelTitulo === 2 ? 12 : 8;
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
            });
            estadoY.y += 8;
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
