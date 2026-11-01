import './helpers/dom-real.js';

import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Origem da obra é um campo de tags nos modais de Poema e de Prosa, em
// Intertextualidade e em Hipertextualidade: o HTML, o comportamento do campo,
// o salvar (`origemObra` só quando há origem), o editar e a lista.

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const casos = [
    ['modal-poema.html', 'p', ''],
    ['modal-prosa.html', 'pr', '-prosa'],
];

for (const [arquivo, pref, suf] of casos) {
    describe(`${arquivo}: Origem em tags`, () => {
        const html = fs.readFileSync(path.join(raiz, 'modais', arquivo), 'utf8');
        for (const campo of ['intertexto', 'hipertexto']) {
            it(`${campo}: input com sugestões, contêiner das tags e datalist`, () => {
                assert.match(
                    html,
                    new RegExp(
                        `<input[^>]*id="${pref}-${campo}-origem"[^>]*list="sugestoes-${campo}-origem${suf}"`,
                    ),
                );
                assert.match(html, new RegExp(`id="${pref}-${campo}-origem-chips"`));
                assert.match(html, new RegExp(`<datalist id="sugestoes-${campo}-origem${suf}">`));
            });
        }
    });
}

describe('campo de tags de Origem (editor.js, DOM real)', () => {
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
            <input id="p-intertexto-origem" /><div id="p-intertexto-origem-chips"></div>
            <input id="p-intertexto-personagem" /><div id="p-intertexto-personagem-chips"></div>
            <input id="p-intertexto-descricao" /><textarea id="p-intertexto-trecho"></textarea>
            <input type="checkbox" id="p-intertexto-traduzido" />
            <input id="p-intertexto-link" /><input id="p-intertexto-link-texto" />
            <input id="p-intertexto-nota" />
            <button id="p-intertexto-btn-add"></button>
            <button id="p-intertexto-btn-cancelar" class="hidden"></button>
            <div id="p-intertexto-lista"></div>
            <datalist id="sugestoes-intertexto-origem"></datalist>
            <input id="p-hipertexto-relacao" /><input id="p-hipertexto-tipo" />
            <input id="p-hipertexto-hipotexto" /><input id="p-hipertexto-autor" />
            <div id="p-hipertexto-autor-chips"></div>
            <input id="p-hipertexto-origem" /><div id="p-hipertexto-origem-chips"></div>
            <input id="p-hipertexto-descricao" /><input id="p-hipertexto-link" />
            <input id="p-hipertexto-link-texto" /><input id="p-hipertexto-nota" />
            <button id="p-hipertexto-btn-add"></button>
            <button id="p-hipertexto-btn-cancelar" class="hidden"></button>
            <div id="p-hipertexto-lista"></div>
            <datalist id="sugestoes-hipertexto-origem"></datalist>`;
        ed = await import('../js/editor.js');
        ed.ligarCamposDeAutor('poemas');
    });

    beforeEach(() => {
        ed.resetIntertextualidade('poemas');
        ed.resetHipertextualidade('poemas');
        for (const id of [
            'intertexto-obra',
            'intertexto-origem',
            'hipertexto-hipotexto',
            'hipertexto-origem',
        ])
            el(`p-${id}`).value = '';
    });

    it('Enter e vírgula confirmam; adicionar grava `origemObra` na ordem digitada', () => {
        el('p-intertexto-obra').value = 'Mito de Prometeu';
        digitar('p-intertexto-origem', 'Grécia', 'Enter');
        digitar('p-intertexto-origem', 'grecia', ',');
        assert.deepEqual(ed.origensDoFormulario('poemas', 'intertexto'), ['Grécia']);
        assert.match(el('p-intertexto-origem-chips').textContent, /Grécia/);
        ed.adicionarIntertexto('poemas');
        const [e] = ed.obterIntertextualidade('poemas');
        assert.deepEqual(e.origemObra, ['Grécia']);
        assert.deepEqual(ed.origensDoFormulario('poemas', 'intertexto'), []);
        assert.equal(el('p-intertexto-origem-chips').children.length, 0);
    });

    it('sem origem a chave não existe; só origem já basta para adicionar', () => {
        el('p-intertexto-obra').value = 'Dom Casmurro';
        ed.adicionarIntertexto('poemas');
        assert.ok(!('origemObra' in ed.obterIntertextualidade('poemas')[0]));
        ed.resetIntertextualidade('poemas');
        el('p-intertexto-origem').value = 'Brasil';
        ed.adicionarIntertexto('poemas');
        assert.deepEqual(ed.obterIntertextualidade('poemas')[0].origemObra, ['Brasil']);
    });

    it('o × remove, Backspace tira a última e o rótulo é "origem"', () => {
        digitar('p-intertexto-origem', 'A', 'Enter');
        digitar('p-intertexto-origem', 'B', 'Enter');
        digitar('p-intertexto-origem', 'C', 'Enter');
        el('p-intertexto-origem-chips').querySelector('[data-autor-remover="0"]').click();
        assert.deepEqual(ed.origensDoFormulario('poemas', 'intertexto'), ['B', 'C']);
        digitar('p-intertexto-origem', '', 'Backspace');
        assert.deepEqual(ed.origensDoFormulario('poemas', 'intertexto'), ['B']);
        assert.equal(
            el('p-intertexto-origem-chips').querySelector('button').title,
            'Remover origem',
        );
    });

    it('editar repopula as tags e a lista mostra "origem X"', () => {
        ed.carregarIntertextualidade('poemas', [
            { obra: 'Mito', origemObra: ['Grécia'], personagens: ['Prometeu', 'Zeus'] },
        ]);
        ed.atualizarDatalistIntertexto('poemas');
        assert.match(el('p-intertexto-lista').textContent, /origem Grécia, Prometeu e Zeus/);
        ed.editarIntertexto('poemas', 0);
        assert.deepEqual(ed.origensDoFormulario('poemas', 'intertexto'), ['Grécia']);
        ed.cancelarEdicaoIntertexto('poemas');
        assert.deepEqual(ed.origensDoFormulario('poemas', 'intertexto'), []);
    });

    it('Hipertextualidade: adicionar, listar e editar a origem', () => {
        el('p-hipertexto-hipotexto').value = 'Odisseia';
        digitar('p-hipertexto-origem', 'Grécia', 'Enter');
        ed.adicionarHipertextualidade('poemas');
        const [h] = ed.obterHipertextualidade('poemas');
        assert.deepEqual(h.origemObra, ['Grécia']);
        assert.match(el('p-hipertexto-lista').textContent, /origem Grécia/);
        ed.editarHipertextualidade('poemas', 0);
        assert.deepEqual(ed.origensDoFormulario('poemas', 'hipertexto'), ['Grécia']);
        ed.cancelarEdicaoHipertextualidade('poemas');
        assert.deepEqual(ed.origensDoFormulario('poemas', 'hipertexto'), []);
    });

    it('as sugestões vêm das origens já usadas e não repetem a tag escolhida', async () => {
        const { db } = await import('../js/db.js');
        db.poemas = [{ id: 1, intertextualidade: [{ obra: 'A', origemObra: ['Grécia', 'Roma'] }] }];
        digitar('p-intertexto-origem', 'Roma', 'Enter');
        const opcoes = [...el('sugestoes-intertexto-origem').children].map((o) => o.value);
        assert.deepEqual(opcoes, ['Grécia']);
        db.poemas = [];
    });

    describe('preenchimento automático pela mesma obra', () => {
        let db;
        before(async () => {
            ({ db } = await import('../js/db.js'));
        });
        const cenario = (entradas) => {
            ed.cancelarEdicaoIntertexto('poemas');
            db.poemas = [{ id: 1, intertextualidade: entradas }];
            el('p-intertexto-obra').value = 'Odisseia';
            el('p-intertexto-autor').value = '';
        };

        it('preenche quando a mesma obra tem uma única lista de origens', () => {
            cenario([
                { obra: 'Odisseia', autores: ['Homero'], origemObra: ['Grécia'] },
                { obra: 'Odisseia', autores: ['Homero'], origemObra: ['grécia'] },
                { obra: 'Odisseia', autores: ['Homero'] },
            ]);
            digitar('p-intertexto-autor', 'Homero', 'Enter');
            assert.deepEqual(ed.origensDoFormulario('poemas', 'intertexto'), ['Grécia']);
            db.poemas = [];
        });

        it('com duas listas diferentes, ou com tag já digitada, não mexe', () => {
            cenario([
                { obra: 'Odisseia', autores: ['Homero'], origemObra: ['Grécia'] },
                { obra: 'Odisseia', autores: ['Homero'], origemObra: ['Roma'] },
            ]);
            digitar('p-intertexto-autor', 'Homero', 'Enter');
            assert.deepEqual(ed.origensDoFormulario('poemas', 'intertexto'), []);
            db.poemas = [];

            ed.resetIntertextualidade('poemas');
            el('p-intertexto-autor-chips').replaceChildren();
            cenario([{ obra: 'Odisseia', autores: ['Homero', 'Outro'], origemObra: ['Grécia'] }]);
            digitar('p-intertexto-origem', 'Itália', 'Enter');
            digitar('p-intertexto-autor', 'Homero', 'Enter');
            digitar('p-intertexto-autor', 'Outro', 'Enter');
            assert.deepEqual(ed.origensDoFormulario('poemas', 'intertexto'), ['Itália']);
            db.poemas = [];
        });
    });
});
