// jsPDF é carregado só via CDN no navegador (ver <script> em index.html)
// e não é uma dependência do package.json — não tem como `import` a lib
// de verdade aqui. Este shim implementa só a fatia da API que
// js/exportar-pdf.js e js/exportar-sonoridade.js efetivamente usam
// (setFont, setFontSize, setTextColor, setDrawColor, setFillColor,
// setLineWidth, setLineDashPattern, rect, text, line,
// splitTextToSize, getTextWidth, addPage, internal.pageSize,
// output/save) e grava um log de chamadas
// (`doc.chamadas`) pra os testes inspecionarem.
//
// NÃO tenta reproduzir métricas de fonte reais nem gerar um PDF de
// verdade — só o suficiente pra exercitar quebra de linha/palavra de
// forma determinística e pra verificar QUAIS chamadas foram feitas, com
// QUE argumentos (saneamento de caracteres, negrito/itálico/sublinhado/
// cor/tamanho/alinhamento aplicados, paginação disparada etc.). Testes
// que dependem de medidas reais de fonte ou querem inspecionar o PDF
// final byte a byte precisam da lib real (ver repro.mjs, roteiro manual
// fora da suíte automatizada).

const A4_LARGURA_PT = 595.28;
const A4_ALTURA_PT = 841.89;

// Aproximação grosseira mas determinística: cada caractere vale
// tamanho*0.5pt de largura. Não é fiel à métrica real da Helvetica —
// só precisa ser consistente o bastante pra exercitar a lógica de
// quebra de linha/palavra do chamador.
function larguraAproximada(texto, tamanho) {
    return [...String(texto)].length * tamanho * 0.5;
}

export function criarConstrutorJsPdfFalso() {
    class JsPdfFalso {
        constructor(opcoes = {}) {
            this.opcoes = opcoes;
            this.chamadas = [];
            this.paginas = 1;
            this._fonte = { nome: 'helvetica', estilo: 'normal' };
            this._tamanho = 10;
            this.internal = {
                pageSize: {
                    getWidth: () => A4_LARGURA_PT,
                    getHeight: () => A4_ALTURA_PT,
                },
            };
        }

        setFont(nome, estilo) {
            this._fonte = { nome, estilo };
            this.chamadas.push({ tipo: 'setFont', nome, estilo });
        }

        setFontSize(tamanho) {
            this._tamanho = tamanho;
            this.chamadas.push({ tipo: 'setFontSize', tamanho });
        }

        setTextColor(r, g, b) {
            this.chamadas.push({ tipo: 'setTextColor', r, g, b });
        }

        setDrawColor(r, g, b) {
            this.chamadas.push({ tipo: 'setDrawColor', r, g, b });
        }

        setLineWidth(largura) {
            this.chamadas.push({ tipo: 'setLineWidth', largura });
        }

        setLineDashPattern(padrao, fase) {
            this.chamadas.push({ tipo: 'setLineDashPattern', padrao, fase });
        }

        setFillColor(r, g, b) {
            this.chamadas.push({ tipo: 'setFillColor', r, g, b });
        }

        rect(x, y, w, h, estilo) {
            this.chamadas.push({ tipo: 'rect', x, y, w, h, estilo });
        }

        getTextWidth(texto) {
            return larguraAproximada(texto, this._tamanho);
        }

        // Quebra greedy por palavra, mesma ideia da lib real — só com a
        // métrica aproximada acima no lugar da métrica de fonte real.
        splitTextToSize(texto, larguraMax) {
            const palavras = String(texto).split(/\s+/).filter(Boolean);
            const linhas = [];
            let atual = '';
            palavras.forEach((p) => {
                const tentativa = atual ? atual + ' ' + p : p;
                if (larguraAproximada(tentativa, this._tamanho) > larguraMax && atual) {
                    linhas.push(atual);
                    atual = p;
                } else {
                    atual = tentativa;
                }
            });
            if (atual) linhas.push(atual);
            return linhas.length ? linhas : [''];
        }

        text(texto, x, y) {
            this.chamadas.push({
                tipo: 'text',
                texto,
                x,
                y,
                fonte: { ...this._fonte },
                tamanho: this._tamanho,
            });
        }

        line(x1, y1, x2, y2) {
            this.chamadas.push({ tipo: 'line', x1, y1, x2, y2 });
        }

        // `orientacao` opcional (2º argumento, como jsPDF de verdade —
        // addPage(format, orientation)) — default 'portrait', igual antes
        // desta mudança, pra não afetar nenhum chamador existente que só
        // fazia addPage() sem argumentos. Quando vem 'landscape', troca
        // getWidth()/getHeight() da mesma forma que a lib real faz numa
        // folha 'a4' virada: é o que js/exportar-sonoridade.js
        // (gerarPdfEscansao) e js/exportar-pdf.js (Grade Silábica larga do
        // Download Abrangente) dependem pra decidir a largura útil da
        // página logo depois de chamar addPage.
        addPage(formato, orientacao = 'portrait') {
            this.paginas += 1;
            this.chamadas.push({ tipo: 'addPage', formato, orientacao });
            this.internal.pageSize.getWidth = () =>
                orientacao === 'landscape' ? A4_ALTURA_PT : A4_LARGURA_PT;
            this.internal.pageSize.getHeight = () =>
                orientacao === 'landscape' ? A4_LARGURA_PT : A4_ALTURA_PT;
        }

        output() {
            return new ArrayBuffer(0);
        }

        save(nomeArquivo) {
            this.chamadas.push({ tipo: 'save', nomeArquivo });
        }
    }

    return JsPdfFalso;
}

// Instala (ou reinstala) o construtor falso em window.jspdf.jsPDF, do
// jeito que exportar-pdf.js espera achar (ver obterConstrutorJsPdf).
export function instalarJsPdfFalso() {
    globalThis.window = globalThis.window || {};
    const Construtor = criarConstrutorJsPdfFalso();
    globalThis.window.jspdf = { jsPDF: Construtor };
    return Construtor;
}

export function removerJsPdfFalso() {
    if (globalThis.window) delete globalThis.window.jspdf;
}
