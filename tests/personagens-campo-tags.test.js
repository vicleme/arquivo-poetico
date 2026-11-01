import './helpers/dom-real.js';

import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Personagem da Intertextualidade é um campo de tags (como o Autor) nos modais
// de Poema e de Prosa: o HTML, o comportamento do campo, o salvar (lista
// `personagens`), o editar e a migração do `personagem` antigo.

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const casos = [
    ['modal-poema.html', 'p', ''],
    ['modal-prosa.html', 'pr', '-prosa'],
];

for (const [arquivo, pref, suf] of casos) {
    describe(`${arquivo}: Personagem em tags`, () => {
        const html = fs.readFileSync(path.join(raiz, 'modais', arquivo), 'utf8');
        it('tem o input com sugestões e o contêiner das tags', () => {
            assert.match(
                html,
                new RegExp(
                    `<input[^>]*id="${pref}-intertexto-personagem"[^>]*list="sugestoes-intertexto-personagem${suf}"`,
                ),
            );
            assert.match(html, new RegExp(`id="${pref}-intertexto-personagem-chips"`));
            assert.match(html, new RegExp(`<datalist id="sugestoes-intertexto-personagem${suf}">`));
        });
    });
}

describe('campo de tags de Personagem (editor.js, DOM real)', () => {
    let ed;
    const el = (id) => document.getElementById(id);
    const digitar = (id, valor, tecla) => {
        el(id).value = valor;
        el(id).dispatchEvent(new KeyboardEvent('keydown', { key: tecla, bubbles: true }));
    };

    before(async () => {
        document.body.innerHTML = `
            <input id="p-intertexto-relacao" /><input id="p-intertexto-tipo" />
            <input id="p-intertexto-obra" /><input id="p-intertexto-autor" />
            <div id="p-intertexto-autor-chips"></div>
            <input id="p-intertexto-personagem" /><div id="p-intertexto-personagem-chips"></div>
            <input id="p-intertexto-descricao" /><textarea id="p-intertexto-trecho"></textarea>
            <input type="checkbox" id="p-intertexto-traduzido" />
            <input id="p-intertexto-link" /><input id="p-intertexto-link-texto" />
            <input id="p-intertexto-nota" />
            <button id="p-intertexto-btn-add"></button>
            <button id="p-intertexto-btn-cancelar" class="hidden"></button>
            <div id="p-intertexto-lista"></div>
            <datalist id="sugestoes-intertexto-personagem"></datalist>`;
        ed = await import('../js/editor.js');
        ed.ligarCamposDeAutor('poemas');
    });

    beforeEach(() => {
        ed.resetIntertextualidade('poemas');
        for (const id of ['obra', 'autor', 'personagem']) el(`p-intertexto-${id}`).value = '';
    });

    it('Enter e vírgula confirmam uma tag; adicionar grava a lista na ordem digitada', () => {
        el('p-intertexto-obra').value = 'Mito de Prometeu';
        digitar('p-intertexto-personagem', 'Prometeu', 'Enter');
        digitar('p-intertexto-personagem', 'Zeus', ',');
        assert.deepEqual(ed.personagensDoFormulario('poemas'), ['Prometeu', 'Zeus']);
        assert.match(el('p-intertexto-personagem-chips').textContent, /Prometeu/);
        assert.equal(el('p-intertexto-personagem').value, '');

        ed.adicionarIntertexto('poemas');
        const [e] = ed.obterIntertextualidade('poemas');
        assert.deepEqual(e.personagens, ['Prometeu', 'Zeus']);
        assert.ok(!('personagem' in e));
        assert.deepEqual(ed.personagensDoFormulario('poemas'), []);
        assert.equal(el('p-intertexto-personagem-chips').children.length, 0);
    });

    it('o que está digitado sem Enter entra junto ao adicionar', () => {
        el('p-intertexto-obra').value = 'Medusa';
        digitar('p-intertexto-personagem', 'Perseu', 'Enter');
        el('p-intertexto-personagem').value = 'Medusa';
        ed.adicionarIntertexto('poemas');
        assert.deepEqual(ed.obterIntertextualidade('poemas')[0].personagens, ['Perseu', 'Medusa']);
    });

    it('só personagem já basta para adicionar a entrada', () => {
        el('p-intertexto-personagem').value = 'Capitu';
        ed.adicionarIntertexto('poemas');
        assert.deepEqual(ed.obterIntertextualidade('poemas')[0].personagens, ['Capitu']);
    });

    it('o × remove a tag e Backspace com o campo vazio tira a última', () => {
        digitar('p-intertexto-personagem', 'A', 'Enter');
        digitar('p-intertexto-personagem', 'B', 'Enter');
        digitar('p-intertexto-personagem', 'C', 'Enter');
        el('p-intertexto-personagem-chips').querySelector('[data-autor-remover="0"]').click();
        assert.deepEqual(ed.personagensDoFormulario('poemas'), ['B', 'C']);
        digitar('p-intertexto-personagem', '', 'Backspace');
        assert.deepEqual(ed.personagensDoFormulario('poemas'), ['B']);
        assert.equal(
            el('p-intertexto-personagem-chips').querySelector('button').title,
            'Remover personagem',
        );
    });

    it('editar repopula as tags, e entrada com `personagem` antigo abre como uma tag', () => {
        ed.carregarIntertextualidade('poemas', [
            { obra: 'Mito', personagens: ['Prometeu', 'Zeus'] },
            { obra: 'Dom Casmurro', personagem: 'Capitu' },
        ]);
        const [a, b] = ed.obterIntertextualidade('poemas');
        assert.deepEqual(a.personagens, ['Prometeu', 'Zeus']);
        assert.deepEqual(b.personagens, ['Capitu']);
        assert.ok(!('personagem' in b));

        ed.editarIntertexto('poemas', 0);
        assert.deepEqual(ed.personagensDoFormulario('poemas'), ['Prometeu', 'Zeus']);
        ed.cancelarEdicaoIntertexto('poemas');
        assert.deepEqual(ed.personagensDoFormulario('poemas'), []);
    });

    it('a lista de entradas mostra todos os personagens', () => {
        ed.carregarIntertextualidade('poemas', [
            { obra: 'Mito', personagens: ['Prometeu', 'Zeus'] },
        ]);
        ed.atualizarDatalistIntertexto('poemas');
        assert.match(el('p-intertexto-lista').textContent, /Prometeu e Zeus/);
    });
});
