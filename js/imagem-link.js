// ============================================================
// imagem-link.js — Link da imagem (só acesso, nunca exibição)
//
// Decisão de 21/10/2026: a imagem exibida continua vindo só do
// upload (IndexedDB, ver capas.js), porque links do Drive e do
// imgbb com álbum não listado não podem ser baixados pelo
// navegador (CORS, login). O "link da imagem" é um campo opcional
// à parte, que só guarda o endereço de onde a imagem original
// mora. Ele aparece no card e no Ver apenas quando preenchido, e
// abre em outra aba. O app não baixa, não exibe e não valida o
// conteúdo desse endereço.
//
// Lógica pura, sem DOM: o salvar, o card e o Ver usam as mesmas
// funções, então o que entra e o que sai seguem a mesma regra.
// ============================================================

import { escapeHtml } from './utils.js';

/**
 * Devolve o link limpo (http ou https) ou '' se o texto estiver
 * vazio. Texto que não é um endereço http/https devolve null, para
 * quem salva poder avisar em vez de gravar lixo (ou um
 * `javascript:` num href).
 * @param {unknown} texto
 * @returns {string|null}
 */
export function normalizarLinkImagem(texto) {
    const limpo = String(texto ?? '').trim();
    if (!limpo) return '';
    let url;
    try {
        url = new URL(limpo);
    } catch {
        return null;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return limpo;
}

/**
 * Versão tolerante, para exibição: dado que veio de importação ou
 * de backup antigo, só mostra o que for http/https válido.
 * @param {unknown} texto
 * @returns {string}
 */
export function linkImagemExibivel(texto) {
    return normalizarLinkImagem(texto) || '';
}

/**
 * HTML do atalho "Abrir imagem original" (vazio sem link válido).
 * @param {unknown} texto
 * @param {string} [classes] classes extras do <a>
 * @returns {string}
 */
export function linkImagemHtml(texto, classes = '') {
    const url = linkImagemExibivel(texto);
    if (!url) return '';
    return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 underline ${classes}">Abrir imagem original</a>`;
}
