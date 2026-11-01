import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// A Descrição de Intertextualidade e Hipertextualidade é um campo de texto longo
// (textarea) nos modais de Poema e de Prosa, com as sugestões em botões abaixo.

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../modais');
const casos = [
    ['modal-poema.html', 'p', ''],
    ['modal-prosa.html', 'pr', '-prosa'],
];

for (const [arquivo, pref, suf] of casos) {
    describe(`${arquivo}: Descrição de Inter e Hiper`, () => {
        const html = fs.readFileSync(path.join(dir, arquivo), 'utf8');
        for (const tipo of ['intertexto', 'hipertexto']) {
            it(`${tipo} é textarea, com a caixa de sugestões ligada a ela`, () => {
                const id = `${pref}-${tipo}-descricao`;
                assert.match(html, new RegExp(`<textarea[^>]*id="${id}"`));
                assert.doesNotMatch(html, new RegExp(`<input[^>]*id="${id}"`));
                assert.match(
                    html,
                    new RegExp(
                        `id="sugestoes-${tipo}-descricao${suf}"[^>]*data-sugestoes-descricao="${id}"`,
                    ),
                );
                assert.doesNotMatch(html, new RegExp(`<datalist id="sugestoes-${tipo}-descricao`));
            });
        }
    });
}
