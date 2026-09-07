import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(__dirname, '..');

// Escopo deste teste: só os HTMLs que dependem do hub central em main.js
// (index.html + modais/*.html). filtrar.html e localizar-substituir.html
// são páginas standalone com <script> inline próprio — as funções ali já
// nascem no escopo global daquele HTML e nunca precisam de um window.x
// em main.js, então ficam de fora de propósito, não por lacuna.
const HTMLS_DO_HUB = [
    'index.html',
    ...fs
        .readdirSync(path.join(RAIZ, 'modais'))
        .filter((f) => f.endsWith('.html'))
        .map((f) => path.join('modais', f)),
];

function extrairFuncoesDeOnclick(conteudoHtml) {
    // Casa onclick="minhaFuncao(...)" e onclick='minhaFuncao(...)',
    // ignorando expressões que não são uma chamada de função simples
    // (ex.: "return false", "algo.prop = 1") — essas não dependem de
    // window.x e não fazem sentido cobrar binding.
    const regex = /onclick\s*=\s*["']([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
    const nomes = new Set();
    let m;
    while ((m = regex.exec(conteudoHtml))) {
        nomes.add(m[1]);
    }
    return nomes;
}

function extrairBindingsDeMainJs(conteudoJs) {
    // Casa "window.nome = nome" no início de linha (padrão usado em
    // main.js pra expor função clicável globalmente).
    const regex = /^window\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/gm;
    const nomes = new Set();
    let m;
    while ((m = regex.exec(conteudoJs))) {
        nomes.add(m[1]);
    }
    return nomes;
}

describe('wiring onclick <-> window.x (main.js)', () => {
    const mainJs = fs.readFileSync(path.join(RAIZ, 'js/main.js'), 'utf8');
    const bindings = extrairBindingsDeMainJs(mainJs);

    for (const relPath of HTMLS_DO_HUB) {
        it(`todo onclick de ${relPath} tem window.x correspondente em main.js`, () => {
            const html = fs.readFileSync(path.join(RAIZ, relPath), 'utf8');
            const usados = extrairFuncoesDeOnclick(html);
            const faltando = [...usados].filter((nome) => !bindings.has(nome));

            assert.deepEqual(
                faltando,
                [],
                `Função(ões) usada(s) em onclick="..." em ${relPath} sem "window.x = x" correspondente em main.js: ${faltando.join(', ')}`,
            );
        });
    }

    it('lista de HTMLs do hub não está vazia (sanity check do próprio teste)', () => {
        assert.ok(HTMLS_DO_HUB.length > 0);
    });
});
