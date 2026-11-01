import './helpers/dom-real.js';

import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

// Teste de ligação do grupo "Ferramentas": o menu desktop (HTML escrito à mão
// em index.html), o menu mobile (montado por ui.js a partir de FERRAMENTAS_NAV)
// e as páginas de destino têm de concordar. Sem isso, uma ferramenta pode
// entrar só num dos menus (e ficar inacessível no celular, ou no computador),
// ou apontar para uma página que não existe.

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lerArquivo = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

const { FERRAMENTAS_NAV, toggleMenuMobile } = await import('../js/ui.js');

// Os links do dropdown desktop: do botão do grupo até o fim da <nav>.
function linksDesktop() {
    const html = lerArquivo('index.html');
    const inicio = html.indexOf('id="grupo-ferramentas-btn"');
    assert.ok(inicio > 0, 'o botão do grupo Ferramentas sumiu do index.html');
    const fim = html.indexOf('</nav>', inicio);
    const trecho = html.slice(inicio, fim);
    return [...trecho.matchAll(/<a\s[^>]*href="([^"]+)"[^>]*>\s*([^<]+?)\s*<\/a/g)].map((m) => ({
        href: m[1],
        rotulo: m[2],
    }));
}

describe('Ferramentas: menu desktop, menu mobile e páginas', () => {
    it('a lista tem Sortear leitura apontando para sortear.html', () => {
        assert.ok(
            FERRAMENTAS_NAV.some(
                (f) => f.href === 'sortear.html' && f.rotulo === 'Sortear leitura',
            ),
        );
    });

    it('o dropdown do index.html tem os mesmos itens, na mesma ordem, que FERRAMENTAS_NAV', () => {
        assert.deepEqual(linksDesktop(), FERRAMENTAS_NAV);
    });

    it('o menu mobile mostra o grupo Ferramentas com um link para cada item', () => {
        document.body.innerHTML =
            '<span id="icone-menu-mobile"></span><div id="painel-menu-mobile" class="hidden"></div>';
        toggleMenuMobile();
        const painel = document.getElementById('painel-menu-mobile');
        assert.equal(painel.classList.contains('hidden'), false);
        assert.match(painel.textContent, /Ferramentas/);
        const links = [...painel.querySelectorAll('a')].map((a) => ({
            href: a.getAttribute('href'),
            rotulo: a.textContent.trim(),
        }));
        assert.deepEqual(links, FERRAMENTAS_NAV);
    });

    it('cada destino existe no projeto', () => {
        for (const { href } of FERRAMENTAS_NAV) {
            assert.ok(fs.existsSync(path.join(RAIZ, href)), `${href} não existe`);
        }
    });

    it('cada página de destino tem o título e um jeito de voltar ao Arquivo', () => {
        for (const { href, rotulo } of FERRAMENTAS_NAV) {
            const html = lerArquivo(href);
            assert.match(html, /<title>[^<]*<\/title>/, `${href} sem <title>`);
            assert.match(html, /href="index\.html"/, `${href} não tem link de volta`);
            if (href === 'sortear.html') {
                assert.match(html, new RegExp(`<title>[^<]*${rotulo}[^<]*</title>`));
            }
        }
    });

    it('as páginas de destino não repetem um href no menu', () => {
        const hrefs = FERRAMENTAS_NAV.map((f) => f.href);
        assert.equal(new Set(hrefs).size, hrefs.length);
    });
});
