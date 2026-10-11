// Etapa 3b dos Personagens: grupo "Personagens" nos modais de Poema e Prosa
// (papéis em lista, centralidade e os quatro campos de relação em tags).
import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lerArquivo = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

const montar = () => {
    document.body.innerHTML = `
        <form id="f">
            <input id="p-personagem-input" list="p-sugestoes-personagens" />
            <datalist id="p-sugestoes-personagens"></datalist>
            <div id="p-personagens-container"></div>
        </form>`;
};
montar();

const { db } = await import('../js/db.js');
const G = await import('../js/grupo-personagens.js');

const container = () => document.getElementById('p-personagens-container');
const cartoes = () => [...container().querySelectorAll('[data-pers-vinculo]')];

function semear() {
    db.personagens.length = 0;
    db.personagens.push(
        { id: 1, nome: 'Capitu', origem: 'Reinterpretado', notas: '' },
        { id: 2, nome: 'Medusa', origem: 'Criado', notas: '' },
    );
    db.poemas.length = 0;
    db.prosas.length = 0;
}

describe('grupo Personagens nos modais', () => {
    beforeEach(() => {
        semear();
        montar();
        G.resetPersonagens('poemas');
        G.iniciarGrupoPersonagens('poemas');
    });

    it('sugere os nomes do cadastro em ordem alfabética', () => {
        const nomes = [...document.querySelectorAll('#p-sugestoes-personagens option')].map(
            (o) => o.value,
        );
        assert.deepEqual(nomes, ['Capitu', 'Medusa']);
    });

    it('nome existente (sem caixa/acento) vira um cartão, uma vez só', () => {
        G.adicionarPersonagem('poemas', 'CAPITU');
        G.adicionarPersonagem('poemas', 'capitu');
        assert.equal(cartoes().length, 1);
        assert.match(cartoes()[0].textContent, /Capitu/);
        assert.deepEqual(G.obterPersonagens('poemas'), [
            {
                personagemId: 1,
                papeis: [],
                centralidade: '',
                papelNarrativo: [],
                arco: [],
                tropes: [],
                funcaoTematica: [],
            },
        ]);
    });

    it('papéis só de Menção/Alusão desabilitam a centralidade e a zeram', () => {
        G.carregarPersonagens('poemas', [
            { personagemId: 1, papeis: ['Voz'], centralidade: 'protagonista' },
        ]);
        assert.ok(container().querySelector('[data-pers-centralidade]'));

        const voz = container().querySelector('[data-pers-papel="Voz"]');
        voz.checked = false;
        container().querySelector('[data-pers-papel="Menção"]').checked = true;
        voz.dispatchEvent(new Event('change', { bubbles: true }));

        assert.equal(container().querySelector('[data-pers-centralidade]'), null);
        const [v] = G.obterPersonagens('poemas');
        assert.deepEqual(v.papeis, ['Menção']);
        assert.equal(v.centralidade, '');
    });

    it('Enter adiciona a tag; o texto digitado e não confirmado entra ao salvar', () => {
        G.carregarPersonagens('poemas', [{ personagemId: 2 }]);
        const campo = container().querySelector('[data-pers-tag-input="arco"]');
        campo.value = 'Queda, Redenção';
        campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        assert.equal(container().querySelectorAll('[data-pers-tag-remover="arco"]').length, 2);

        container().querySelector('[data-pers-tag-input="tropes"]').value = 'Monstro';
        const [v] = G.obterPersonagens('poemas');
        assert.deepEqual(v.arco, ['Queda', 'Redenção']);
        assert.deepEqual(v.tropes, ['Monstro']);
    });

    it('o × da tag remove só aquela tag', () => {
        G.carregarPersonagens('poemas', [{ personagemId: 2, arco: ['Queda', 'Redenção'] }]);
        container().querySelector('[data-pers-tag-remover="arco"][data-valor="Queda"]').click();
        assert.deepEqual(G.obterPersonagens('poemas')[0].arco, ['Redenção']);
    });

    it('remover o cartão tira o vínculo; reset esvazia', () => {
        G.carregarPersonagens('poemas', [{ personagemId: 1 }, { personagemId: 2 }]);
        container().querySelector('[data-pers-remover]').click();
        assert.equal(G.obterPersonagens('poemas').length, 1);
        G.resetPersonagens('poemas');
        assert.deepEqual(G.obterPersonagens('poemas'), []);
        assert.equal(cartoes().length, 0);
    });

    it('a relação abre sozinha quando já tem dado e a escolha de abrir sobrevive ao render', () => {
        G.carregarPersonagens('poemas', [{ personagemId: 1 }, { personagemId: 2, tropes: ['X'] }]);
        const [a, b] = cartoes().map((c) => c.querySelector('[data-pers-relacao]'));
        assert.equal(a.open, false);
        assert.equal(b.open, true);
    });

    it('editar um vínculo não mexe nos outros', () => {
        G.carregarPersonagens('poemas', [
            { personagemId: 1, papeis: ['Voz'], arco: ['A'] },
            { personagemId: 2, papeis: ['Aparição'], arco: ['B'] },
        ]);
        container()
            .querySelectorAll('[data-pers-vinculo]')[0]
            .querySelector('[data-pers-tag-remover]')
            .click();
        const r = G.obterPersonagens('poemas');
        assert.deepEqual(r[0].arco, []);
        assert.deepEqual(r[1].arco, ['B']);
    });
});

describe('ligação nos modais e no formulário', () => {
    const forms = lerArquivo('js/forms.js');
    for (const [arquivo, pre, tabela] of [
        ['modais/modal-poema.html', 'p', 'poemas'],
        ['modais/modal-prosa.html', 'pr', 'prosas'],
    ]) {
        it(`${arquivo} tem input, datalist, container e botão do grupo`, () => {
            const html = lerArquivo(arquivo);
            assert.ok(html.includes(`id="${pre}-personagem-input"`));
            assert.ok(html.includes(`id="${pre}-sugestoes-personagens"`));
            assert.ok(html.includes(`id="${pre}-personagens-container"`));
            assert.ok(html.includes(`onclick="adicionarPersonagem('${tabela}')"`));
        });
    }

    it('o salvar lê o grupo, o editar carrega e o novo/salvar zeram, nos dois modais', () => {
        for (const t of ['poemas', 'prosas']) {
            assert.ok(forms.includes(`personagens: obterPersonagens('${t}')`), `salvar ${t}`);
            assert.ok(forms.includes(`carregarPersonagens('${t}'`), `editar ${t}`);
            assert.ok(forms.includes(`resetPersonagens('${t}')`), `reset ${t}`);
            assert.ok(forms.includes(`iniciarGrupoPersonagens('${t}')`), `init ${t}`);
        }
        assert.ok(!forms.includes('personagensParaSalvar'), 'provisório removido');
        assert.ok(lerArquivo('js/ui.js').includes("resetPersonagens('poemas')"));
        assert.ok(lerArquivo('js/ui.js').includes("resetPersonagens('prosas')"));
    });

    it('window.adicionarPersonagem está registrado em main.js', () => {
        assert.ok(lerArquivo('js/main.js').includes('window.adicionarPersonagem'));
    });
});
