import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Esqueleto mínimo de DOM que o módulo de Pessoas do editor precisa
// (input + container de chips + painel somente-leitura de Grupos, ver
// modal-poema.html/modal-prosa.html) — precisa existir ANTES do import,
// mesmo motivo do render-dom.test.js.
document.body.innerHTML = `
    <div id="p-pessoa-input-wrapper">
        <input id="p-pessoa-input" />
        <div id="p-pessoas-container"></div>
        <div id="p-pessoas-grupos-info"></div>
    </div>
`;

const { db } = await import('../js/db.js');
const { adicionarPessoa, removerPessoa, resetPessoas, carregarPessoas, obterPessoas } =
    await import('../js/editor.js');

function limparDb() {
    db.pessoas.length = 0;
    db.grupos.length = 0;
    document.getElementById('modal-confirmar-exclusao')?.remove();
    resetPessoas();
}

describe('Criação de pessoa nova via chip (editor.js, DOM real)', () => {
    beforeEach(limparDb);

    it('nome que bate com pessoa já cadastrada reaproveita o id direto, sem pedir confirmação', () => {
        db.pessoas.push({ id: 1, nome: 'Ana', grupoIds: [] });

        adicionarPessoa('Ana');

        assert.equal(document.getElementById('modal-confirmar-exclusao'), null);
        assert.deepEqual(obterPessoas(), [{ pessoaId: 1, papeis: [] }]);
        assert.equal(db.pessoas.length, 1, 'não deveria duplicar a pessoa existente');
    });

    it('nome sem correspondência pede confirmação antes de criar — cancelar não cria nada', () => {
        adicionarPessoa('Beatriz');

        const overlay = document.getElementById('modal-confirmar-exclusao');
        assert.ok(overlay, 'deveria abrir o modal de confirmação de pessoa nova');
        assert.match(document.getElementById('excl-titulo').textContent, /Beatriz/);

        document.getElementById('excl-cancelar').click();

        assert.equal(db.pessoas.length, 0);
        assert.deepEqual(obterPessoas(), []);
    });

    it('nome sem correspondência, ao confirmar, cria a pessoa no cadastro central sem grupo e gera o chip', () => {
        adicionarPessoa('Carla');

        document.getElementById('excl-confirmar').click();

        assert.equal(db.pessoas.length, 1);
        const criada = db.pessoas[0];
        assert.equal(criada.nome, 'Carla');
        assert.deepEqual(criada.grupoIds, [], 'pessoa nova via chip não vem com grupo atribuído');

        assert.deepEqual(obterPessoas(), [{ pessoaId: criada.id, papeis: [] }]);
        assert.match(
            document.getElementById('p-pessoas-container').textContent,
            /Carla/,
            'o chip da pessoa recém-criada deveria aparecer no container',
        );
    });

    it('adicionar a mesma pessoa duas vezes não duplica o chip', () => {
        db.pessoas.push({ id: 5, nome: 'Duda', grupoIds: [] });

        adicionarPessoa('Duda');
        adicionarPessoa('Duda');

        assert.equal(obterPessoas().length, 1);
    });

    it('remover um chip tira a pessoa da lista de itens, sem afetar o cadastro central', () => {
        db.pessoas.push({ id: 9, nome: 'Elis', grupoIds: [] });
        adicionarPessoa('Elis');

        removerPessoa(9);

        assert.deepEqual(obterPessoas(), []);
        assert.equal(db.pessoas.length, 1, 'remover o chip não remove a pessoa do cadastro');
    });

    it('input com espaços/vazio não gera pessoa nem confirmação', () => {
        adicionarPessoa('   ');

        assert.equal(document.getElementById('modal-confirmar-exclusao'), null);
        assert.equal(db.pessoas.length, 0);
        assert.deepEqual(obterPessoas(), []);
    });
});

describe('Painel somente-leitura de Grupos embaixo dos chips (editor.js, DOM real)', () => {
    beforeEach(limparDb);

    it('some (fica vazio) quando nenhuma pessoa selecionada está em grupo', () => {
        db.pessoas.push({ id: 1, nome: 'Fábio', grupoIds: [] });
        carregarPessoas([{ pessoaId: 1, papeis: [] }]);

        assert.equal(document.getElementById('p-pessoas-grupos-info').innerHTML, '');
    });

    it('mostra "Grupo (Pessoa)" pra cada grupo que a pessoa selecionada pertence', () => {
        db.grupos.push({ id: 10, nome: 'Namorado', cor: 'blue' });
        db.pessoas.push({ id: 1, nome: 'Dalton', grupoIds: [10] });
        carregarPessoas([{ pessoaId: 1, papeis: [] }]);

        const texto = document.getElementById('p-pessoas-grupos-info').textContent;
        assert.match(texto, /Namorado/);
        assert.match(texto, /Dalton/);
    });

    it('pessoa em mais de um grupo gera um badge por grupo, não uma linha combinada', () => {
        db.grupos.push(
            { id: 10, nome: 'Namorado', cor: 'blue' },
            { id: 11, nome: 'Ex-namorado', cor: 'amber' },
        );
        db.pessoas.push({ id: 1, nome: 'Pedro', grupoIds: [10, 11] });
        carregarPessoas([{ pessoaId: 1, papeis: [] }]);

        const badges = document
            .getElementById('p-pessoas-grupos-info')
            .querySelectorAll('span span');
        // Um <span> de nome+grupo por par — 2 grupos = 2 badges com "(Pedro)".
        const comPedro = Array.from(badges).filter((s) => /Pedro/.test(s.textContent));
        assert.equal(comPedro.length, 2);
    });

    it('painel some de novo ao remover a pessoa que trazia o único grupo', () => {
        db.grupos.push({ id: 10, nome: 'Amigos', cor: 'emerald' });
        db.pessoas.push({ id: 1, nome: 'Gustavo', grupoIds: [10] });
        carregarPessoas([{ pessoaId: 1, papeis: [] }]);

        assert.notEqual(document.getElementById('p-pessoas-grupos-info').innerHTML, '');

        removerPessoa(1);

        assert.equal(document.getElementById('p-pessoas-grupos-info').innerHTML, '');
    });
});
