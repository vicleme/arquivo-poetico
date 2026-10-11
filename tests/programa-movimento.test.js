import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Programa da Corrente literária: como a corrente se organiza e se apresenta
// (Escola, Movimento, Vanguarda, Grupo/Círculo, Tendência, Não se aplica). Eixo
// independente da Postura estética. Vazio = ainda não preenchido ou não
// documentado; "Não se aplica" é uma decisão.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
document.body.innerHTML = fs.readFileSync(
    path.resolve(__dirname, '../modais/modal-movimento-escola.html'),
    'utf8',
);

const U = await import('../js/utils.js');
const D = await import('../js/db.js');
const { db } = D;
const { editarMovimentoEscola, initFormMovimentoEscola } = await import('../js/forms.js');
const { renderVisualizacaoMovimentoEscolaHtml } =
    await import('../js/visualizar-movimento-escola.js');

describe('lista e normalização', () => {
    it('seis programas, cada um com descrição', () => {
        assert.deepEqual(U.PROGRAMAS_MOVIMENTO, [
            'Escola',
            'Movimento',
            'Vanguarda',
            'Grupo/Círculo',
            'Tendência',
            'Não se aplica',
        ]);
        assert.deepEqual(Object.keys(U.DESCRICOES_PROGRAMA_MOVIMENTO), U.PROGRAMAS_MOVIMENTO);
    });

    it('valor fora da lista vira vazio', () => {
        assert.equal(U.normalizarProgramaMovimento('Vanguarda'), 'Vanguarda');
        assert.equal(U.normalizarProgramaMovimento('Tendência'), 'Tendência');
        assert.equal(U.normalizarProgramaMovimento('Não se aplica'), 'Não se aplica');
        assert.equal(U.normalizarProgramaMovimento('Grupo'), '');
        assert.equal(U.normalizarProgramaMovimento(undefined), '');
    });
});

describe('modal', () => {
    it('o select oferece "Não especificado" e os seis programas, com legenda', () => {
        const valores = [...document.querySelectorAll('#me-programa option')].map((o) =>
            o.getAttribute('value'),
        );
        assert.deepEqual(valores, ['', ...U.PROGRAMAS_MOVIMENTO]);
        const legenda = document.querySelector('#me-programa').parentElement.textContent;
        U.PROGRAMAS_MOVIMENTO.forEach((p) => assert.ok(legenda.includes(`${p}:`), p));
    });
});

describe('dado', () => {
    it('migração: vazio onde não há, vazio onde é inválido, preserva o válido', () => {
        const lista = [
            { id: 1, nome: 'A' },
            { id: 2, nome: 'B', programa: 'Banda' },
            { id: 3, nome: 'C', programa: 'Escola' },
        ];
        D.migrarMovimentosEscolas(lista);
        assert.deepEqual(
            lista.map((m) => m.programa),
            ['', '', 'Escola'],
        );
    });

    // Proposta aprovada pelo Victor em 03/10/2026 (Tendência no lugar de
    // "Não se aplica" para os rótulos retrospectivos).
    const PROGRAMAS_DE_FABRICA = {
        Trovadorismo: 'Movimento',
        Humanismo: 'Movimento',
        'Classicismo (Quinhentismo)': 'Escola',
        Barroco: 'Movimento',
        'Arcadismo (Neoclassicismo)': 'Escola',
        Romantismo: 'Movimento',
        Realismo: 'Movimento',
        Naturalismo: 'Escola',
        Parnasianismo: 'Escola',
        Simbolismo: 'Movimento',
        'Pré-Modernismo': 'Tendência',
        Futurismo: 'Vanguarda',
        Expressionismo: 'Vanguarda',
        'Cubismo literário': 'Vanguarda',
        Dadaísmo: 'Vanguarda',
        Modernismo: 'Movimento',
        Surrealismo: 'Vanguarda',
        'Geração de 45': 'Grupo/Círculo',
        Concretismo: 'Vanguarda',
        Tropicalismo: 'Movimento',
        'Pós-modernismo': 'Tendência',
        'Literatura Contemporânea': 'Tendência',
    };

    it('os 22 movimentos de fábrica nascem com o programa aprovado', () => {
        const porNome = Object.fromEntries(db.movimentosEscolas.map((m) => [m.nome, m]));
        assert.equal(Object.keys(PROGRAMAS_DE_FABRICA).length, 22);
        for (const [nome, programa] of Object.entries(PROGRAMAS_DE_FABRICA)) {
            assert.equal(porNome[nome]?.programa, programa, nome);
        }
    });

    it('registro de fábrica sem o campo recebe o programa do seed, por nome', () => {
        const lista = [
            { id: 1, nome: 'Barroco' },
            { id: 2, nome: 'Meu movimento' },
            { id: 3, nome: 'Pré-Modernismo', embutido: true },
        ];
        D.migrarMovimentosEscolas(lista);
        assert.deepEqual(
            lista.map((m) => m.programa),
            ['Movimento', '', 'Tendência'],
        );
    });

    it('acervo que já tinha o campo vazio recebe o programa de fábrica uma única vez', () => {
        const banco = {
            movimentosEscolas: [
                { id: 1, nome: 'Barroco', programa: '' },
                { id: 2, nome: 'Realismo', programa: 'Escola' },
                { id: 3, nome: 'Meu movimento', programa: '' },
                { id: 4, nome: 'Dadaísmo', programa: '', embutido: false },
            ],
        };
        D.aplicarProgramaDeFabricaUmaVez(banco);
        assert.deepEqual(
            banco.movimentosEscolas.map((m) => m.programa),
            ['Movimento', 'Escola', '', ''],
        );
        assert.equal(banco.programaDeFabricaAplicado, true);
        // Depois da marca, um vazio deixado de propósito não é pisado.
        banco.movimentosEscolas[0].programa = '';
        D.aplicarProgramaDeFabricaUmaVez(banco);
        assert.equal(banco.movimentosEscolas[0].programa, '');
    });

    it('criação por nome nasce vazia; mesclar herda só se o destino estiver vazio', () => {
        const m = D.obterOuCriarMovimentoEscolaPorNome('Movimento Programa X');
        assert.equal(m.programa, '');
        const dbRef = {
            autores: [],
            poemas: [],
            prosas: [],
            movimentosEscolas: [
                { id: 1, nome: 'O', programa: 'Vanguarda' },
                { id: 2, nome: 'D1', programa: '' },
                { id: 3, nome: 'D2', programa: 'Escola' },
                { id: 4, nome: 'O2', programa: 'Grupo/Círculo' },
            ],
        };
        D.mesclarMovimentosEscolas(dbRef, 1, 2);
        D.mesclarMovimentosEscolas(dbRef, 4, 3);
        const por = (id) => dbRef.movimentosEscolas.find((x) => x.id === id).programa;
        assert.equal(por(2), 'Vanguarda');
        assert.equal(por(3), 'Escola');
    });
});

describe('formulário e visualização', () => {
    beforeEach(() => {
        db.movimentosEscolas = [
            { id: 7, nome: 'Concretismo', programa: 'Vanguarda', posturaEstetica: 'Iconoclasta' },
            { id: 8, nome: 'Sem programa' },
        ];
    });

    it('editar carrega o programa; salvar grava e preserva a postura', async () => {
        initFormMovimentoEscola();
        await editarMovimentoEscola(7);
        assert.equal(document.getElementById('me-programa').value, 'Vanguarda');
        document.getElementById('me-programa').value = 'Escola';
        document.getElementById('form-movimento-escola').requestSubmit();
        const m = db.movimentosEscolas.find((x) => x.id === 7);
        assert.equal(m.programa, 'Escola');
        assert.equal(m.posturaEstetica, 'Iconoclasta');
        await editarMovimentoEscola(8);
        assert.equal(document.getElementById('me-programa').value, '');
    });

    it('a Visualização mostra o Programa só quando há', () => {
        assert.match(
            renderVisualizacaoMovimentoEscolaHtml({ nome: 'X', programa: 'Escola' }),
            /Programa/,
        );
        assert.doesNotMatch(renderVisualizacaoMovimentoEscolaHtml({ nome: 'X' }), /Programa/);
    });
});
