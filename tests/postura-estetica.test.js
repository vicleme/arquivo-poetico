import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Postura estética do Movimento/Escola: atitude diante da tradição anterior,
// na época em que o movimento surgiu. Lista fechada; vazio = não documentado.

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
    it('seis posturas na ordem do afastamento da tradição, mais "Não se aplica" no fim', () => {
        assert.deepEqual(U.POSTURAS_ESTETICAS, [
            'Tradicional',
            'Restauradora',
            'Reformista',
            'Inovadora',
            'Iconoclasta',
            'Eclética',
            'Não se aplica',
        ]);
    });

    it('toda postura tem uma descrição', () => {
        U.POSTURAS_ESTETICAS.forEach((p) => {
            assert.ok(U.DESCRICOES_POSTURA_ESTETICA[p], p);
        });
        assert.equal(
            Object.keys(U.DESCRICOES_POSTURA_ESTETICA).length,
            U.POSTURAS_ESTETICAS.length,
        );
    });

    it('valor fora da lista (inclusive a grafia antiga "Reacionária") vira vazio', () => {
        assert.equal(U.normalizarPosturaEstetica('Iconoclasta'), 'Iconoclasta');
        assert.equal(U.normalizarPosturaEstetica('Reacionária'), '');
        assert.equal(U.normalizarPosturaEstetica(undefined), '');
        assert.equal(U.normalizarPosturaEstetica(null), '');
    });
});

describe('modal', () => {
    it('o select oferece "Não especificada" e todas as posturas, na mesma ordem da constante', () => {
        const valores = [...document.querySelectorAll('#me-postura-estetica option')].map((o) =>
            o.getAttribute('value'),
        );
        assert.deepEqual(valores, ['', ...U.POSTURAS_ESTETICAS]);
    });

    it('a legenda traz uma linha por postura', () => {
        const legenda = document.querySelector('#me-postura-estetica').parentElement.textContent;
        U.POSTURAS_ESTETICAS.forEach((p) => assert.match(legenda, new RegExp(`${p}:`)));
    });
});

describe('dado: migração, seed, criação e mesclagem', () => {
    it('nomes antigos (Modernista, Vanguardista) gravados antes da troca viram Inovadora e Iconoclasta', () => {
        const lista = [
            { id: 1, nome: 'X', posturaEstetica: 'Modernista' },
            { id: 2, nome: 'Y', posturaEstetica: 'Vanguardista' },
            { id: 3, nome: 'Z', posturaEstetica: 'Reformista' },
        ];
        D.migrarMovimentosEscolas(lista);
        assert.deepEqual(
            lista.map((m) => m.posturaEstetica),
            ['Inovadora', 'Iconoclasta', 'Reformista'],
        );
    });

    it('migrarMovimentosEscolas põe vazio onde não há e limpa valor inválido, sem tocar no válido', () => {
        const lista = [
            { id: 1, nome: 'A' },
            { id: 2, nome: 'B', posturaEstetica: 'Reacionária' },
            { id: 3, nome: 'C', posturaEstetica: 'Eclética' },
        ];
        D.migrarMovimentosEscolas(lista);
        assert.deepEqual(
            lista.map((m) => m.posturaEstetica),
            ['', '', 'Eclética'],
        );
    });

    // Proposta revisada e aprovada pelo Victor em 03/10/2026.
    const POSTURAS_DE_FABRICA = {
        Trovadorismo: 'Não se aplica',
        Humanismo: 'Reformista',
        'Classicismo (Quinhentismo)': 'Restauradora',
        Barroco: 'Reformista',
        'Arcadismo (Neoclassicismo)': 'Restauradora',
        Romantismo: 'Inovadora',
        Realismo: 'Reformista',
        Naturalismo: 'Reformista',
        Parnasianismo: 'Restauradora',
        Simbolismo: 'Reformista',
        'Pré-Modernismo': 'Reformista',
        Futurismo: 'Iconoclasta',
        Expressionismo: 'Iconoclasta',
        'Cubismo literário': 'Iconoclasta',
        Dadaísmo: 'Iconoclasta',
        Modernismo: 'Inovadora',
        Surrealismo: 'Iconoclasta',
        'Geração de 45': 'Restauradora',
        Concretismo: 'Iconoclasta',
        Tropicalismo: 'Eclética',
        'Pós-modernismo': 'Eclética',
        'Literatura Contemporânea': 'Não se aplica',
    };

    it('os 22 movimentos de fábrica nascem com a postura aprovada, e todos os valores são válidos', () => {
        const porNome = Object.fromEntries(db.movimentosEscolas.map((m) => [m.nome, m]));
        assert.equal(Object.keys(POSTURAS_DE_FABRICA).length, 22);
        for (const [nome, postura] of Object.entries(POSTURAS_DE_FABRICA)) {
            assert.equal(porNome[nome]?.posturaEstetica, postura, nome);
        }
    });

    it('instalação ou backup antigo (sem o campo) recebe a postura de fábrica uma única vez, por nome', () => {
        const lista = [
            { id: 1, nome: 'Barroco' },
            { id: 2, nome: 'Meu movimento' },
            { id: 3, nome: 'Realismo', embutido: true },
        ];
        D.migrarMovimentosEscolas(lista);
        assert.deepEqual(
            lista.map((m) => m.posturaEstetica),
            ['Reformista', '', 'Reformista'],
        );
    });

    it('a migração nunca sobrescreve: nem valor escolhido, nem vazio deixado de propósito', () => {
        const lista = [
            { id: 1, nome: 'Barroco', posturaEstetica: 'Iconoclasta' },
            { id: 2, nome: 'Realismo', posturaEstetica: '' },
        ];
        D.migrarMovimentosEscolas(lista);
        D.migrarMovimentosEscolas(lista);
        assert.deepEqual(
            lista.map((m) => m.posturaEstetica),
            ['Iconoclasta', ''],
        );
    });

    it('migrarMovimentosEscolasEmbutidos cria o que falta já com a postura de fábrica, sem pisar no que existe', () => {
        const lista = [];
        D.migrarMovimentosEscolasEmbutidos(lista, []);
        assert.ok(lista.length > 20);
        assert.equal(lista.find((m) => m.nome === 'Futurismo').posturaEstetica, 'Iconoclasta');
        lista[0].posturaEstetica = 'Tradicional';
        D.migrarMovimentosEscolasEmbutidos(lista, []);
        assert.equal(lista[0].posturaEstetica, 'Tradicional');
    });

    it('obterOuCriarMovimentoEscolaPorNome cria com o campo vazio', () => {
        db.movimentosEscolas.length = 0;
        const m = D.obterOuCriarMovimentoEscolaPorNome('Movimento X');
        assert.equal(m.posturaEstetica, '');
    });

    it('mesclar: o destino herda a postura só quando a dele está vazia', () => {
        const dbRef = {
            autores: [],
            poemas: [],
            prosas: [],
            movimentosEscolas: [
                { id: 1, nome: 'O', posturaEstetica: 'Iconoclasta' },
                { id: 2, nome: 'D1', posturaEstetica: '' },
                { id: 3, nome: 'D2', posturaEstetica: 'Tradicional' },
            ],
        };
        D.mesclarMovimentosEscolas(dbRef, 1, 2);
        assert.equal(
            dbRef.movimentosEscolas.find((m) => m.id === 2).posturaEstetica,
            'Iconoclasta',
        );
        dbRef.movimentosEscolas.push({ id: 4, nome: 'O2', posturaEstetica: 'Eclética' });
        D.mesclarMovimentosEscolas(dbRef, 4, 3);
        assert.equal(
            dbRef.movimentosEscolas.find((m) => m.id === 3).posturaEstetica,
            'Tradicional',
        );
    });
});

describe('formulário e visualização', () => {
    beforeEach(() => {
        db.movimentosEscolas = [
            { id: 7, nome: 'Concretismo', tipo: 'Literário', posturaEstetica: 'Iconoclasta' },
            { id: 8, nome: 'Sem postura', tipo: '' },
        ];
    });

    it('editar carrega a postura no select; sem postura, "Não especificada"', async () => {
        await editarMovimentoEscola(7);
        assert.equal(document.getElementById('me-postura-estetica').value, 'Iconoclasta');
        await editarMovimentoEscola(8);
        assert.equal(document.getElementById('me-postura-estetica').value, '');
    });

    it('salvar grava a postura escolhida e preserva os outros campos', async () => {
        initFormMovimentoEscola();
        await editarMovimentoEscola(7);
        document.getElementById('me-postura-estetica').value = 'Reformista';
        document.getElementById('form-movimento-escola').requestSubmit();
        const m = db.movimentosEscolas.find((x) => x.id === 7);
        assert.equal(m.posturaEstetica, 'Reformista');
        assert.equal(m.nome, 'Concretismo');
        assert.equal(m.tipo, 'Literário');
    });

    it('a Visualização mostra a linha só quando há postura', () => {
        const com = renderVisualizacaoMovimentoEscolaHtml({
            nome: 'X',
            posturaEstetica: 'Eclética',
        });
        const sem = renderVisualizacaoMovimentoEscolaHtml({ nome: 'X', posturaEstetica: '' });
        assert.match(com, /Postura estética/);
        assert.match(com, /Eclética/);
        assert.doesNotMatch(sem, /Postura estética/);
    });
});
