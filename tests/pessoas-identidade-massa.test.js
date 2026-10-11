import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Edição em massa de Identidade cis/trans e Cor/Raça na aba Pessoas:
// substitui o valor das selecionadas, "Não documentado (apagar)" limpa, e
// "Desfazer" devolve o valor anterior de cada uma.
document.body.innerHTML = `
    <main>
        <div id="lista-pessoas"></div>
        <span id="contagem-pessoas"></span>
        <select id="pessoas-massa-identidade-cis-trans">
            <option value="">Escolher...</option>
            <option value="__limpar__">Não documentado (apagar)</option>
            <option value="Cisgênero">Cisgênero</option>
            <option value="Transgênero">Transgênero</option>
            <option value="Não se aplica">Não se aplica</option>
        </select>
        <select id="pessoas-massa-cor-raca">
            <option value="">Escolher...</option>
            <option value="__limpar__">Não documentado (apagar)</option>
            <option value="Branca">Branca</option>
            <option value="Preta">Preta</option>
            <option value="Parda">Parda</option>
        </select>
    </main>
`;

const { db } = await import('../js/db.js');
const {
    selecaoPessoas,
    limparSelecaoPessoas,
    aplicarIdentidadeCisTransEmMassaPessoas,
    aplicarCorRacaEmMassaPessoas,
} = await import('../js/pessoas-acoes.js');

const $ = (id) => document.getElementById(id);
const desfazer = () =>
    [...document.querySelectorAll('button')].filter((b) => b.textContent === 'Desfazer').at(-1);

describe('Pessoas, edição em massa de identidade cis/trans e cor/raça', () => {
    beforeEach(() => {
        db.autores = [];
        db.grupos = [];
        db.pessoas = [
            { id: 1, nome: 'Ana', autorIds: [], grupoIds: [], identidadeCisTrans: '', corRaca: '' },
            {
                id: 2,
                nome: 'Bia',
                autorIds: [],
                grupoIds: [],
                identidadeCisTrans: 'Cisgênero',
                corRaca: 'Preta',
            },
            {
                id: 3,
                nome: 'Caio',
                autorIds: [],
                grupoIds: [],
                identidadeCisTrans: '',
                corRaca: '',
            },
        ];
        limparSelecaoPessoas();
        $('pessoas-massa-identidade-cis-trans').value = '';
        $('pessoas-massa-cor-raca').value = '';
        document.querySelectorAll('button').forEach((b) => b.remove());
    });

    it('define a identidade só nas selecionadas, substituindo o valor anterior', () => {
        selecaoPessoas.add(1);
        selecaoPessoas.add(2);
        $('pessoas-massa-identidade-cis-trans').value = 'Transgênero';
        aplicarIdentidadeCisTransEmMassaPessoas();
        assert.deepEqual(
            db.pessoas.map((p) => p.identidadeCisTrans),
            ['Transgênero', 'Transgênero', ''],
        );
        assert.equal($('pessoas-massa-identidade-cis-trans').value, '');
    });

    it('define a cor/raça e "Desfazer" devolve o valor anterior de cada uma', () => {
        selecaoPessoas.add(1);
        selecaoPessoas.add(2);
        $('pessoas-massa-cor-raca').value = 'Parda';
        aplicarCorRacaEmMassaPessoas();
        assert.deepEqual(
            db.pessoas.map((p) => p.corRaca),
            ['Parda', 'Parda', ''],
        );
        desfazer().click();
        assert.deepEqual(
            db.pessoas.map((p) => p.corRaca),
            ['', 'Preta', ''],
        );
    });

    it('"Não documentado (apagar)" limpa o campo das selecionadas', () => {
        selecaoPessoas.add(2);
        $('pessoas-massa-cor-raca').value = '__limpar__';
        aplicarCorRacaEmMassaPessoas();
        assert.equal(db.pessoas[1].corRaca, '');
        desfazer().click();
        assert.equal(db.pessoas[1].corRaca, 'Preta');
    });

    it('sem seleção ou sem escolha no select, não altera nada', () => {
        $('pessoas-massa-cor-raca').value = 'Branca';
        aplicarCorRacaEmMassaPessoas();
        selecaoPessoas.add(1);
        $('pessoas-massa-cor-raca').value = '';
        aplicarCorRacaEmMassaPessoas();
        assert.deepEqual(
            db.pessoas.map((p) => p.corRaca),
            ['', 'Preta', ''],
        );
    });

    it('valor fora da lista fechada é ignorado', () => {
        selecaoPessoas.add(1);
        const sel = $('pessoas-massa-cor-raca');
        sel.innerHTML += '<option value="Roxa">Roxa</option>';
        sel.value = 'Roxa';
        aplicarCorRacaEmMassaPessoas();
        assert.equal(db.pessoas[0].corRaca, '');
    });
});
