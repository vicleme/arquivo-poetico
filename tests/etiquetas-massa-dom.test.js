import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Campo de etiquetas (chips) nas três barras de edição em massa: Período
// Biográfico, Período Histórico e Correntes literárias.
const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const secao = (id) => indexHtml.match(new RegExp(`<section id="${id}"[\\s\\S]*?</section>`))[0];
document.body.innerHTML = `<main>${secao('epocas')}${secao('periodos-historicos')}${secao('movimentos-escolas')}</main>`;

const { db } = await import('../js/db.js');
const { renderEpocas, renderPeriodosHistoricos, renderMovimentosEscolas } =
    await import('../js/render-listas.js');
const EP = await import('../js/epocas-acoes.js');
const PH = await import('../js/periodos-historicos-acoes.js');
const CO = await import('../js/correntes-acoes.js');

const el = (id) => document.getElementById(id);
const definir = (id, valor) => {
    el(id).value = valor;
    el(id).onchange?.();
};
const chips = (idBase) =>
    [...el(`${idBase}-chips`).querySelectorAll('span > span')].map((s) => s.textContent);
const teclar = (id, key) => el(id).onkeydown({ key, preventDefault() {}, stopPropagation() {} });
const digitar = (id, texto, key = 'Enter') => {
    el(id).value = texto;
    teclar(id, key);
};
const botaoDesfazer = () =>
    [...document.querySelectorAll('button')].filter((b) => b.textContent === 'Desfazer').at(-1);

const barras = [
    {
        nome: 'Período Biográfico',
        campo: 'epocas-massa-campo',
        acao: 'epocas-massa-acao',
        valor: 'epocas-massa-valor',
        escolher: 'esfera',
        selecionar: (id) => EP.toggleSelecaoEpoca(id, true),
        aplicar: () => EP.aplicarMassaEpocas(),
        montar() {
            db.epocas = [
                { id: 1, nome: 'A', esferas: ['Afetiva'], categorias: [] },
                { id: 2, nome: 'B', esferas: [], categorias: [] },
            ];
            db.pessoas = [];
            db.autores = [];
            db.poemas = [];
            db.prosas = [];
            EP.selecaoEpocas.clear();
            renderEpocas();
        },
        ler: () => db.epocas.map((e) => e.esferas),
        outroCampo: 'categoria',
    },
    {
        nome: 'Período Histórico',
        campo: 'ph-massa-campo',
        acao: 'ph-massa-acao',
        valor: 'ph-massa-valor',
        escolher: 'esfera',
        selecionar: (id) => PH.toggleSelecaoPeriodoHistorico(id, true),
        aplicar: () => PH.aplicarMassaBarraPeriodosHistoricos(),
        montar() {
            db.opcoesPeriodoHistorico = { esferas: [], categorias: [] };
            db.periodosHistoricos = [
                { id: 1, nome: 'A', esferas: ['Social'], categorias: [], regiao: [] },
                { id: 2, nome: 'B', esferas: [], categorias: [], regiao: [] },
            ];
            db.poemas = [];
            db.prosas = [];
            PH.selecaoPeriodosHistoricos.clear();
            renderPeriodosHistoricos();
        },
        ler: () => db.periodosHistoricos.map((p) => p.esferas),
        outroCampo: 'regiao',
    },
    {
        nome: 'Correntes literárias',
        campo: 'cor-massa-campo',
        acao: 'cor-massa-acao',
        valor: 'cor-massa-valor',
        escolher: 'temas',
        selecionar: (id) => CO.toggleSelecaoCorrente(id, true),
        aplicar: () => CO.aplicarMassaBarraCorrentes(),
        montar() {
            const base = { tipo: '', programa: '', posturaEstetica: '', paiId: null };
            db.movimentosEscolas = [
                { ...base, id: 1, nome: 'Barroco', temas: ['Morte'], regiaoOrigem: [] },
                { ...base, id: 2, nome: 'Romantismo', temas: [], regiaoOrigem: [] },
            ];
            db.poemas = [];
            db.prosas = [];
            db.autores = [];
            CO.selecaoCorrentes.clear();
            renderMovimentosEscolas();
        },
        ler: () => db.movimentosEscolas.map((m) => m.temas),
        outroCampo: 'valores',
    },
];

for (const b of barras) {
    describe(`etiquetas na barra de ${b.nome}`, () => {
        beforeEach(() => {
            b.montar();
            document.querySelectorAll('#toast-container, [data-toast]').forEach((t) => t.remove());
            b.selecionar(1);
            b.selecionar(2);
            // Passar por outro campo esvazia as etiquetas que sobraram de outro teste.
            definir(b.campo, b.outroCampo);
            definir(b.campo, b.escolher);
            definir(b.acao, 'adicionar');
        });

        it('Enter e vírgula viram etiquetas, sem repetir', () => {
            digitar(b.valor, 'Amor');
            digitar(b.valor, 'Tempo', ',');
            digitar(b.valor, 'amor');
            assert.deepEqual(chips(b.valor), ['Amor', 'Tempo']);
            assert.equal(el(b.valor).value, '');
        });

        it('texto colado com vírgulas ou ponto e vírgula vira várias etiquetas', () => {
            digitar(b.valor, 'Luz; Sombra, Mar');
            assert.deepEqual(chips(b.valor), ['Luz', 'Sombra', 'Mar']);
        });

        it('o × tira uma etiqueta e Backspace com o campo vazio tira a última', () => {
            digitar(b.valor, 'Amor');
            digitar(b.valor, 'Tempo');
            digitar(b.valor, 'Mar');
            el(`${b.valor}-chips`).querySelectorAll('button')[0].onclick();
            assert.deepEqual(chips(b.valor), ['Tempo', 'Mar']);
            teclar(b.valor, 'Backspace');
            assert.deepEqual(chips(b.valor), ['Tempo']);
        });

        it('sair do campo com texto também vira etiqueta', () => {
            el(b.valor).value = 'Saudade';
            el(b.valor).onblur();
            assert.deepEqual(chips(b.valor), ['Saudade']);
        });

        it('Aplicar acrescenta todas as etiquetas, limpa o campo e Desfazer devolve tudo', () => {
            digitar(b.valor, 'Amor');
            digitar(b.valor, 'Tempo');
            const antes = JSON.stringify(b.ler());
            b.aplicar();
            for (const lista of b.ler()) {
                assert.ok(lista.includes('Amor') && lista.includes('Tempo'));
            }
            assert.deepEqual(chips(b.valor), []);
            assert.match(document.body.textContent, /Amor/);
            botaoDesfazer().click();
            assert.equal(JSON.stringify(b.ler()), antes);
        });

        it('texto ainda não confirmado entra junto ao aplicar', () => {
            digitar(b.valor, 'Amor');
            el(b.valor).value = 'Tempo';
            b.aplicar();
            for (const lista of b.ler()) {
                assert.ok(lista.includes('Amor') && lista.includes('Tempo'));
            }
        });

        it('sem etiqueta nenhuma, Aplicar avisa e não muda nada', () => {
            const antes = JSON.stringify(b.ler());
            b.aplicar();
            assert.equal(JSON.stringify(b.ler()), antes);
        });

        it('trocar de campo esvazia as etiquetas; redesenhar a barra não', () => {
            digitar(b.valor, 'Amor');
            // Selecionar mais um item redesenha a barra: as etiquetas ficam.
            assert.deepEqual(chips(b.valor), ['Amor']);
            definir(b.campo, b.outroCampo);
            assert.deepEqual(chips(b.valor), []);
        });
    });
}
