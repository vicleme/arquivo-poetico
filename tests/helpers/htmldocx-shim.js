// html-docx-js é carregado só via CDN no navegador (ver <script> em
// index.html) e não é uma dependência do package.json — não tem como
// `import` a lib de verdade aqui. Este shim implementa só a fatia da
// API que js/exportar-docx.js efetivamente usa (asBlob) e grava um log
// de chamadas (`htmlDocxFalso.chamadas`) pros testes inspecionarem o
// HTML que de fato chegou até a "conversão".
//
// NÃO gera um .docx de verdade — só o suficiente pra garantir que
// gerarDocxHtmlExportacao produziu o HTML esperado e que baixarDocx
// (exportar-docx.js) repassa esse HTML pra lib corretamente.

export function instalarHtmlDocxFalso() {
    globalThis.window = globalThis.window || {};
    const chamadas = [];
    const htmlDocxFalso = {
        chamadas,
        asBlob(html, opcoes) {
            chamadas.push({ html, opcoes });
            return new Blob([html], {
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            });
        },
    };
    globalThis.window.htmlDocx = htmlDocxFalso;
    return htmlDocxFalso;
}

export function removerHtmlDocxFalso() {
    if (globalThis.window) delete globalThis.window.htmlDocx;
}
