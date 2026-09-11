// docx (npm) é carregada só via CDN no navegador (ver <script> em
// index.html) e não é uma dependência de PRODUÇÃO do package.json —
// entra como devDependency só pra isso: os testes importam o pacote
// real e o registram como window.docx, exatamente como o script da CDN
// faria no navegador (build UMD, global window.docx — ver comentário em
// index.html). Diferente do antigo htmldocx-shim.js (que simulava só a
// fatia da API usada, sem gerar um .docx de verdade), este shim usa a
// biblioteca de verdade — os testes de exportar-docx.test.js empacotam
// (Packer.toBuffer) e reabrem o .zip resultante de verdade, inspecionando
// o word/document.xml gerado, pra garantir que o sombreamento de fundo
// realmente fica no w:rPr do RUN (não no w:pPr do parágrafo) — a
// regressão que motivou a troca do html-docx-js pela docx.
import * as docx from 'docx';

export function instalarDocxReal() {
    globalThis.window = globalThis.window || {};
    globalThis.window.docx = docx;
    return docx;
}

export function removerDocxReal() {
    if (globalThis.window) delete globalThis.window.docx;
}
