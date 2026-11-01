// ============================================================
// exportar-cruzamentos-pdf.js: .pdf da matriz da aba Cruzamentos
// (entrega 2 de 3 da exportação; o .csv, o .json e o .md estão em
// exportar-cruzamentos.js).
//
// O PDF nasce da MESMA tabela do .csv e do .md (`tabelaDeCruzamentos`), então
// os quatro formatos nunca divergem no que entra, na orientação nem na ordem.
// Folha A4 em retrato quando todas as colunas (com os totais) cabem na largura;
// senão, em paisagem. Uma matriz com muitos temas não cabe nem na paisagem:
// as colunas são divididas em blocos, e cada bloco repete a coluna dos
// nomes das linhas. As colunas de total (soma da linha e textos com a linha)
// vão no último bloco, para ninguém ler um total parcial como se fosse o total.
// Texto de verdade (não imagem), então dá para selecionar e buscar no PDF.
//
// Módulo sem DOM: `JsPdf` entra por parâmetro (na página vem de
// window.jspdf; nos testes, de um falso). Só `baixarCruzamentosPdf` salva.
// As fontes padrão do jsPDF só cobrem Latin-1 e a WinAnsi: `textoParaPdf`
// cuida dos símbolos; o "×" é Latin-1 e passa.
// ============================================================

import { textoParaPdf } from './relatorio-pdf.js';
import {
    tabelaDeCruzamentos,
    filtrosDeCruzamentos,
    textoDaOrdemDeCruzamentos,
    tituloDeCruzamentos,
    nomeArquivoCruzamentos,
} from './exportar-cruzamentos.js';

const MARGEM = 36;
const LARGURA_ROTULO = 150;
const LARGURA_COLUNA = 56;
const ALTURA_LINHA = 15;
const TAMANHO_TABELA = 8;
const TAMANHO_CABECALHO = 7;
const LINHA_CABECALHO = 8.5;
const MAX_LINHAS_CABECALHO = 4;
const A4_LARGURA_RETRATO = 595.28;
const CINZA_CABECALHO = [232, 236, 241];
const CINZA_RODAPE = [244, 245, 247];

function construtorJsPdf() {
    return globalThis.window?.jspdf?.jsPDF || globalThis.jspdf?.jsPDF || null;
}

// Parte `n` colunas de dados em blocos de até `capacidade`. As `nTotais`
// colunas de total vão no último bloco; se não couberem ali, ganham um bloco
// só delas. Devolve [{ inicio, fim, totais }] (fim exclusivo).
export function dividirColunasEmBlocos(n, capacidade, nTotais = 0) {
    const cap = Math.max(1, Math.floor(capacidade));
    const blocos = [];
    for (let i = 0; i < n; i += cap) {
        blocos.push({ inicio: i, fim: Math.min(i + cap, n), totais: false });
    }
    if (!blocos.length) blocos.push({ inicio: 0, fim: 0, totais: false });
    if (nTotais) {
        const ultimo = blocos[blocos.length - 1];
        if (ultimo.fim - ultimo.inicio + nTotais <= cap) ultimo.totais = true;
        else blocos.push({ inicio: n, fim: n, totais: true });
    }
    return blocos;
}

// Quebra `texto` em linhas de até `largura`, por palavra; palavra maior que a
// largura é partida por letra. O que passa de `maxLinhas` vira "..." na última.
export function quebrarNaLargura(medir, texto, largura, maxLinhas) {
    const palavras = String(texto ?? '')
        .split(/\s+/)
        .filter(Boolean);
    const linhas = [];
    let atual = '';
    const empurrar = () => {
        if (atual) linhas.push(atual);
        atual = '';
    };
    palavras.forEach((palavra) => {
        let resto = palavra;
        while (medir(resto) > largura) {
            let corte = resto.length - 1;
            while (corte > 1 && medir(resto.slice(0, corte)) > largura) corte -= 1;
            empurrar();
            linhas.push(resto.slice(0, corte));
            resto = resto.slice(corte);
        }
        const tentativa = atual ? `${atual} ${resto}` : resto;
        if (atual && medir(tentativa) > largura) {
            empurrar();
            atual = resto;
        } else {
            atual = tentativa;
        }
    });
    empurrar();
    if (linhas.length <= maxLinhas) return linhas.length ? linhas : [''];
    const cortadas = linhas.slice(0, maxLinhas);
    let ultima = cortadas[maxLinhas - 1];
    while (ultima.length > 1 && medir(`${ultima}...`) > largura) ultima = ultima.slice(0, -1);
    cortadas[maxLinhas - 1] = `${ultima}...`;
    return cortadas;
}

// Corta numa linha só, com "..." quando passa da largura.
export function cortarNaLargura(medir, texto, largura) {
    const t = String(texto ?? '');
    if (medir(t) <= largura) return t;
    let corte = t.length;
    while (corte > 1 && medir(`${t.slice(0, corte)}...`) > largura) corte -= 1;
    return `${t.slice(0, corte)}...`;
}

// Quantas colunas (de dados e de total) cabem lado a lado numa folha de
// largura `larguraFolha`, depois da coluna dos nomes.
export function colunasPorFolha(larguraFolha) {
    return Math.max(1, Math.floor((larguraFolha - 2 * MARGEM - LARGURA_ROTULO) / LARGURA_COLUNA));
}

// Retrato quando a matriz inteira cabe na largura dele; senão, paisagem.
export function orientacaoDoPdf(nColunas, nTotais) {
    return nColunas + nTotais <= colunasPorFolha(A4_LARGURA_RETRATO) ? 'portrait' : 'landscape';
}

const numeroPdf = (v) => (v === null || v === undefined ? '' : v === 0 ? '-' : String(v));

/**
 * Desenha a matriz e devolve o `doc` do jsPDF (ainda não salvo).
 * `matriz` é o resultado de `matrizParaExportar`.
 */
export function gerarPdfCruzamentos(matriz, JsPdf = construtorJsPdf()) {
    if (!JsPdf) {
        throw new Error(
            'A biblioteca de PDF não carregou (verifique a conexão com a internet). Tente novamente em alguns segundos.',
        );
    }
    const t = tabelaDeCruzamentos(matriz);
    const nTotais = (t.totalRotulo ? 1 : 0) + 1;
    const orientacao = orientacaoDoPdf(t.colunas.length, nTotais);
    const doc = new JsPdf({ unit: 'pt', format: 'a4', orientation: orientacao });
    const largura = doc.internal.pageSize.getWidth();
    const altura = doc.internal.pageSize.getHeight();
    const limiteY = altura - MARGEM - 8;
    let y = MARGEM;

    const san = (s) => textoParaPdf(s);
    const fonte = (tamanho, estilo = 'normal', cor = [0, 0, 0]) => {
        doc.setFont('helvetica', estilo);
        doc.setFontSize(tamanho);
        doc.setTextColor(...cor);
    };
    const medir = (s) => doc.getTextWidth(s);
    const novaPagina = () => {
        doc.addPage('a4', orientacao);
        y = MARGEM;
    };
    const garantir = (alturaNecessaria) => {
        if (y + alturaNecessaria > limiteY) novaPagina();
    };

    // Título e recorte.
    fonte(15, 'bold');
    doc.text(san(`Cruzamentos: ${tituloDeCruzamentos(t.modo)}`), MARGEM, y + 15);
    y += 24;
    fonte(9, 'normal', [70, 70, 70]);
    const recorte = [
        t.invertida ? 'Matriz invertida: os temas são as linhas.' : 'Os temas são as colunas.',
        ...filtrosDeCruzamentos(matriz).map(([nome, valor]) => `${nome}: ${valor}`),
    ];
    const ordem = textoDaOrdemDeCruzamentos(t, matriz.contexto?.ordem);
    if (ordem) recorte.push(`Ordem das linhas: ${ordem}`);
    recorte.forEach((linha) => {
        garantir(13);
        doc.text(san(linha), MARGEM, y + 9);
        y += 13;
    });
    y += 8;

    // Colunas de dados por bloco: cabem as que a largura da página aguenta.
    const capacidade = colunasPorFolha(largura);
    const blocos = dividirColunasEmBlocos(t.colunas.length, capacidade, nTotais);

    const cabecalhoDoBloco = (bloco) => {
        const colunas = t.colunas.slice(bloco.inicio, bloco.fim).map((nome) => ({ nome }));
        if (bloco.totais) {
            if (t.totalRotulo) colunas.push({ nome: t.totalRotulo, total: true });
            colunas.push({ nome: t.textosRotulo, textos: true, total: true });
        }
        return colunas;
    };

    blocos.forEach((bloco, b) => {
        const colunas = cabecalhoDoBloco(bloco);
        fonte(TAMANHO_CABECALHO, 'bold');
        const linhasCab = [
            quebrarNaLargura(medir, san(t.eixo), LARGURA_ROTULO - 8, MAX_LINHAS_CABECALHO),
            ...colunas.map((c) =>
                quebrarNaLargura(medir, san(c.nome), LARGURA_COLUNA - 6, MAX_LINHAS_CABECALHO),
            ),
        ];
        const alturaCab = Math.max(...linhasCab.map((l) => l.length)) * LINHA_CABECALHO + 8;
        const larguraTabela = LARGURA_ROTULO + colunas.length * LARGURA_COLUNA;

        const desenharCabecalho = () => {
            doc.setFillColor(...CINZA_CABECALHO);
            doc.rect(MARGEM, y, larguraTabela, alturaCab, 'F');
            fonte(TAMANHO_CABECALHO, 'bold', [50, 55, 65]);
            linhasCab[0].forEach((linha, k) => {
                doc.text(linha, MARGEM + 4, y + 10 + k * LINHA_CABECALHO);
            });
            colunas.forEach((c, i) => {
                const cx = MARGEM + LARGURA_ROTULO + i * LARGURA_COLUNA + LARGURA_COLUNA / 2;
                linhasCab[i + 1].forEach((linha, k) => {
                    doc.text(linha, cx, y + 10 + k * LINHA_CABECALHO, { align: 'center' });
                });
            });
            y += alturaCab;
        };

        // O bloco não começa sozinho no fim da página: reserva cabeçalho e 3 linhas.
        garantir(alturaCab + ALTURA_LINHA * 3 + 18);
        if (blocos.length > 1) {
            fonte(8, 'normal', [90, 90, 90]);
            const partes = [];
            if (bloco.fim > bloco.inicio) {
                partes.push(`colunas ${bloco.inicio + 1} a ${bloco.fim} de ${t.colunas.length}`);
            }
            if (bloco.totais) partes.push('totais');
            doc.text(
                san(`Parte ${b + 1} de ${blocos.length}: ${partes.join(' e ')}`),
                MARGEM,
                y + 8,
            );
            y += 14;
        }
        desenharCabecalho();

        const linhaDe = (rotulo, valores, total, textos, ehRodape) => {
            garantir(ALTURA_LINHA);
            if (y === MARGEM) desenharCabecalho();
            if (ehRodape) {
                doc.setFillColor(...CINZA_RODAPE);
                doc.rect(MARGEM, y, larguraTabela, ALTURA_LINHA, 'F');
            }
            // O rótulo do rodapé é longo ("... (soma da coluna)"): fonte menor para caber inteiro.
            fonte(ehRodape ? 7 : TAMANHO_TABELA, ehRodape ? 'bold' : 'normal');
            doc.text(cortarNaLargura(medir, san(rotulo), LARGURA_ROTULO - 8), MARGEM + 4, y + 10.5);
            colunas.forEach((c, i) => {
                let v;
                if (!c.total) v = valores[bloco.inicio + i];
                else v = c.textos ? textos : total;
                const cx = MARGEM + LARGURA_ROTULO + i * LARGURA_COLUNA + LARGURA_COLUNA / 2;
                const texto = numeroPdf(v);
                if (!texto) return;
                fonte(TAMANHO_TABELA, c.total || ehRodape ? 'bold' : 'normal', [0, 0, 0]);
                doc.text(texto, cx, y + 10.5, { align: 'center' });
            });
            doc.setDrawColor(215, 218, 224);
            doc.line(MARGEM, y + ALTURA_LINHA, MARGEM + larguraTabela, y + ALTURA_LINHA);
            y += ALTURA_LINHA;
        };

        t.linhas.forEach((l) => linhaDe(l.rotulo, l.valores, l.total, l.textos, false));
        t.rodape.forEach((r, k) => {
            const ultimo = k === t.rodape.length - 1;
            // A linha "Textos com ..." (última do rodapé) não tem total.
            linhaDe(r.rotulo, r.valores, ultimo ? null : r.total, null, true);
        });
        y += 14;
    });

    // Notas finais.
    fonte(8, 'normal', [90, 90, 90]);
    [
        matriz.rotulosModo.descricao,
        'Os totais consideram só as linhas e as colunas exibidas. Célula com - não tem texto em comum.',
    ].forEach((nota) => {
        quebrarNaLargura(medir, san(nota), largura - 2 * MARGEM, 3).forEach((linha) => {
            garantir(11);
            doc.text(linha, MARGEM, y + 8);
            y += 11;
        });
    });

    const paginas = doc.internal.getNumberOfPages();
    for (let i = 1; i <= paginas; i++) {
        doc.setPage(i);
        fonte(8, 'normal', [120, 120, 120]);
        doc.text(`Página ${i} de ${paginas}`, largura / 2, altura - 20, { align: 'center' });
    }
    return doc;
}

export function nomeDoPdfCruzamentos(modo) {
    return nomeArquivoCruzamentos(modo, 'pdf');
}

export function baixarCruzamentosPdf(matriz) {
    const doc = gerarPdfCruzamentos(matriz);
    doc.save(nomeDoPdfCruzamentos(matriz.modo));
}
