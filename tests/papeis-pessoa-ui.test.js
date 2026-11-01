import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

document.body.innerHTML = `
    <main>
        <div id="lista-pessoas"></div>
        <span id="contagem-pessoas"></span>
        <div id="secao-papeis-pessoa"></div>
    </main>
`;

const { db } = await import('../js/db.js');
const { papeisPessoaDeFabrica } = await import('../js/papeis-pessoa.js');
const ui = await import('../js/papeis-pessoa-ui.js');

const secao = () => document.getElementById('secao-papeis-pessoa');

describe('seção Papéis da aba Pessoas', () => {
    beforeEach(() => {
        db.autores = [];
        db.grupos = [];
        db.pessoas = [{ id: 1, nome: 'Ana', autorIds: [], grupoIds: [] }];
        db.papeisPessoa = papeisPessoaDeFabrica();
        db.poemas = [];
        db.prosas = [];
    });

    it('lista os 9 papéis de fábrica, com a regra de Relacionado(a) por extenso', () => {
        ui.renderPapeisPessoa();
        assert.equal(secao().querySelectorAll('tbody tr').length, 9);
        assert.match(secao().textContent, /Exclusivo: não convive com nenhum outro papel/);
        assert.match(secao().textContent, /Não convive com: Aludido\(a\)/);
    });

    it('mostra o uso e o botão que abre os textos', () => {
        db.poemas = [{ id: 1, pessoas: [{ pessoaId: 1, papeis: ['Voz'] }] }];
        ui.renderPapeisPessoa();
        assert.match(secao().textContent, /1 vínculo em 1 texto/);
        assert.ok(secao().querySelector('button[onclick^="verTextosComPapelUI"]'));
    });

    it('papel de fábrica não tem Apagar nem nome editável; o acrescentado tem', () => {
        const r = ui.adicionarPapelPessoaUI;
        ui.renderPapeisPessoa();
        document.getElementById('papel-novo-nome').value = 'Confidente';
        r();
        const linhas = [...secao().querySelectorAll('tbody tr')];
        assert.equal(linhas.length, 10);
        assert.equal(linhas.filter((l) => l.textContent.includes('Apagar')).length, 1);
        assert.equal(linhas.at(-1).querySelector('input[data-nome]').value, 'Confidente');
    });

    it('editar apelido grava no registro', () => {
        ui.editarApelidoPapelPessoaUI('Voz', 'Fala');
        assert.equal(db.papeisPessoa.find((p) => p.nome === 'Voz').apelido, 'Fala');
    });
});
