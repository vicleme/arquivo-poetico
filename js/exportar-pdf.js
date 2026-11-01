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
// pra reproduzir cor/negrito/itálico/sublinhado/tachado/alinhamento (incl.
// justificado) de verdade no PDF (ver corpoParaMarkdown em exportar-md.js, que descarta tudo
// isso — não tem como recuperar o estilo de um Markdown que já não o
// carrega mais).
//
// Depende do jsPDF vendorizado via CDN (ver <script> em index.html,
// mesmo padrão do Tailwind) — carrega só quando o botão Baixar em
// PDF é usado pela primeira vez, então preferimos falhar com uma
// mensagem clara (ver gerarPdfExportacao) a travar a tela se a
// internet cair bem nessa hora.
// ============================================================

import { itemParaMarkdownPartes, linhasComunsDosItens } from './exportar-md.js';
import { blocoLinhasComuns } from './exportar-comuns.js';
import { resolverAgruparComuns } from './agrupar-comuns.js';
import { corpoParaLinhasRicas } from './utils.js';
import { blocoEstruturaMarkdown, blocoLeiturasMarkdown } from './download-abrangente.js';
import {
    escansaoCabecalhoMarkdown,
    escansaoParesEcosMarkdown,
    gradeParaTabela,
    desenharGradeSilabicaPdf,
    decidirOrientacaoGradePdf,
} from './exportar-sonoridade.js';

function obterConstrutorJsPdf() {
    return window.jspdf?.jsPDF || null;
}

import { saneParaPdf, analisarLinha, renderizarCorpoRico } from './pdf-corpo-rico.js';

export { saneParaPdf, corpoParaLinhasRicas };

// Gera o documento jsPDF (objeto `doc`, ainda não salvo) a partir dos
// mesmos itens que iriam pro .md — ver gerarMarkdownExportacao().
// `opcoes.agruparComuns` (padrão: a preferência guardada, ver agrupar-comuns.js) sobe pro topo as linhas de metadado
// iguais em todos os textos, igual ao .md (ver exportar-comuns.js).
export function gerarPdfExportacao(itens, opcoes = {}) {
    const JsPDF = obterConstrutorJsPdf();
    if (!JsPDF) {
        throw new Error(
            'A biblioteca de PDF não carregou (verifique a conexão com a internet) — tente novamente em alguns segundos.',
        );
    }

    const doc = new JsPDF({ unit: 'pt', format: 'a4' });
    const margem = 48;
    // Capturadas ANTES de qualquer addPage — a folha 'a4' é sempre a
    // mesma, só gira; a largura útil de uma página paisagem é a ALTURA da
    // página retrato menos as mesmas margens (e vice-versa). Mesmo padrão
    // de gerarPdfEscansao (exportar-sonoridade.js) — só existem aqui pra
    // alimentar decidirOrientacaoGradePdf na hora da Grade Silábica, logo
    // abaixo: o resto do documento (texto corrido) nunca sai do retrato.
    const larguraUtilRetrato = doc.internal.pageSize.getWidth() - margem * 2;
    const larguraUtilPaisagem = doc.internal.pageSize.getHeight() - margem * 2;

    let orientacaoAtual = 'portrait';
    let larguraUtil = larguraUtilRetrato;
    let alturaPagina = doc.internal.pageSize.getHeight();
    const estadoY = { y: margem };

    // Cria uma página nova na orientação pedida (default: a atual) e
    // recalcula largura/altura úteis a partir da própria página recém-
    // criada — depois de doc.addPage('a4', 'landscape'), pageSize.getWidth/
    // getHeight já vêm trocados, então não precisamos de nenhuma constante
    // própria de "altura da paisagem". SEMPRE passa a orientação explícita
    // pro addPage (nunca doc.addPage() sem argumentos) — mesmo cuidado
    // documentado em novaPagina/gerarPdfEscansao (exportar-sonoridade.js),
    // pra não depender de jsPDF "lembrar" a orientação anterior sozinho.
    function mudarPagina(orientacao = orientacaoAtual) {
        doc.addPage('a4', orientacao);
        orientacaoAtual = orientacao;
        larguraUtil = doc.internal.pageSize.getWidth() - margem * 2;
        alturaPagina = doc.internal.pageSize.getHeight();
        estadoY.y = margem;
    }

    function quebrarPaginaSeNecessario(alturaLinha) {
        if (estadoY.y + alturaLinha > alturaPagina - margem) {
            mudarPagina(orientacaoAtual);
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
            // "- **Autoria:** ...\n### Inspiração...", sem
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
                const preEspacoTitulo = nivelTitulo === 1 ? 16 : nivelTitulo === 2 ? 12 : 8;
                if (estadoY.y + preEspacoTitulo + tamanho * 1.4 > alturaPagina - margem) {
                    // Título ficaria colado no rodapé (ou cortado) — quebra a
                    // página em vez de gastar o respiro extra num espaço que
                    // a página não tem mais.
                    mudarPagina(orientacaoAtual);
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
    const { comuns, omitir } = resolverAgruparComuns(opcoes)
        ? linhasComunsDosItens(itens)
        : { comuns: [], omitir: new Set() };
    renderizarLinhasSimples(
        `# Exportação Poética\n\n_Gerado em ${dataStr} — ${itens.length} texto(s)._\n\n` +
            `${blocoLinhasComuns(comuns)}---\n\n`,
    );

    itens.forEach((item, i) => {
        const { antesDoTexto, depoisDoTexto } = itemParaMarkdownPartes(item, i + 1, {
            omitirRotulos: omitir,
        });

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

        // Seção extra de Sonoridade — só presente quando o item passou por
        // enriquecerItensComExtras (itensDaSelecao, exportar.js) com
        // "Download abrangente" ligado (do contrário item.sonoridade nem
        // existe e este bloco inteiro não roda). Cabeçalho (campos de
        // classificação) e Pares de Rima/Ecos Sonoros continuam como texto
        // simples via escansaoCabecalhoMarkdown/escansaoParesEcosMarkdown
        // (mesmo renderizarLinhasSimples de sempre) — só a Grade Silábica
        // muda: em vez do texto linear "1. sí / la (A)" (o que esta seção
        // usava até aqui, herdado de escansaoParaMarkdown), desenha a
        // MESMA tabela de verdade que a aba de Sonoridade já desenha no
        // download avulso (gerarPdfEscansao/desenharGradeSilabicaPdf, ver
        // exportar-sonoridade.js) — inclusive a decisão de página paisagem
        // (decidirOrientacaoGradePdf, mesmo limiar de lá): só enquanto a
        // grade dura, e só quando o poema é longo o bastante em sílabas
        // pra precisar; o resto deste documento, item a item, nunca sai
        // do retrato — assim os dois PDFs nunca mais divergem em como
        // mostram a grade, com ou sem paisagem.
        if (item.sonoridade) {
            const poemaRef = { titulo: item.titulo };
            renderizarLinhasSimples(escansaoCabecalhoMarkdown(item.sonoridade, poemaRef));

            const linhasGrade = Array.isArray(item.sonoridade.escansaoLinhas)
                ? item.sonoridade.escansaoLinhas
                : [];
            const rimasGrade = Array.isArray(item.sonoridade.rimas) ? item.sonoridade.rimas : [];
            const ecosGrade = Array.isArray(item.sonoridade.ecos) ? item.sonoridade.ecos : [];
            const tabelaGrade = gradeParaTabela(
                linhasGrade,
                rimasGrade,
                ecosGrade,
                item.sonoridade.tamanhoVerso,
            );
            if (tabelaGrade.linhas.some((l) => l.tipo === 'verso')) {
                // Mesma decisão de paisagem que o download avulso de
                // Escansão já faz (gerarPdfEscansao, exportar-sonoridade.js)
                // — reaproveita a função de módulo pra nunca divergir do
                // limiar de lá. `orientacaoAtual` só entra aqui porque cada
                // item começa sempre em retrato (garantido pelo `if
                // (usouPaisagem)` que volta antes de sair deste bloco, logo
                // abaixo) — então só muda de página quando a grade PEDE
                // paisagem de verdade, poema estreito continua sem nenhuma
                // página extra, exatamente como antes desta mudança.
                const orientacaoGrade = decidirOrientacaoGradePdf(
                    tabelaGrade.n,
                    larguraUtilRetrato,
                    larguraUtilPaisagem,
                );
                const usouPaisagem = orientacaoGrade === 'landscape';
                if (orientacaoGrade !== orientacaoAtual) mudarPagina(orientacaoGrade);

                // "###" pra herdar o mesmo respiro-antes-de-título que
                // renderizarLinhasSimples já dá a qualquer subtítulo do
                // documento (ver preEspacoTitulo ali embaixo) — só que o
                // conteúdo que vem a seguir não é mais texto, por isso a
                // tabela é desenhada à parte, não incluída nesta string.
                renderizarLinhasSimples('### Grade Silábica\n\n');
                desenharGradeSilabicaPdf(doc, tabelaGrade, {
                    margem,
                    largura: larguraUtil,
                    obterY: () => estadoY.y,
                    definirY: (novoY) => {
                        estadoY.y = novoY;
                    },
                    quebrarPaginaSeNecessario,
                });
                // Respiro depois da tabela — mesmo valor de "blank line"
                // usado no resto do documento (ver blank/--- acima), pra
                // "Pares de Rima" não vir colado na borda de baixo da
                // tabela.
                estadoY.y += 8;

                // Volta pro retrato antes de continuar (Pares de Rima/Ecos
                // Sonoros, Morfofuncionalidade, o próximo item...) — a
                // paisagem foi só pra grade caber, não é o formato do
                // resto do documento. Mesma lógica de gerarPdfEscansao,
                // só que aqui precisa rodar sempre (não só quando há
                // Pares de Rima a seguir), porque depois deste item ainda
                // vem blocoEstruturaMarkdown() e, possivelmente, outro
                // item inteiro — nenhum dos dois pode herdar a paisagem.
                if (usouPaisagem) mudarPagina('portrait');
            }

            renderizarLinhasSimples(escansaoParesEcosMarkdown(item.sonoridade, poemaRef));
        }

        // Seção extra de Morfofuncionalidade — mesmo texto linear de
        // sempre (estruturaParaMarkdown não tem nenhuma tabela pra
        // desenhar, então continua pelo caminho de Markdown genérico).
        renderizarLinhasSimples(blocoEstruturaMarkdown(item));
        // Leituras avaliativas (Poema e Prosa), só com a caixa "Leituras" ligada.
        renderizarLinhasSimples(blocoLeiturasMarkdown(item));
        renderizarLinhasSimples('---\n\n');
    });

    return doc;
}

export function baixarPdf(itens, nomeArquivo, opcoes = {}) {
    const doc = gerarPdfExportacao(itens, opcoes);
    doc.save(nomeArquivo);
}
