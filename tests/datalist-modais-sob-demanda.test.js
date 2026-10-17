import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Os modais são carregados por fetch só na primeira abertura (ver
// garantirModal em modais.js), então o refresh inicial dos datalists
// (atualizarDatalist, no DOMContentLoaded) roda antes de eles existirem
// e não os alcança. Aqui o DOM dos modais reais entra "frio", com os
// datalists vazios, e cada caminho de abertura precisa preenchê-los.
const modais = ['modal-autor.html', 'modal-prosa.html', 'modal-movimento-escola.html'];
document.body.innerHTML = modais
    .map((arquivo) => fs.readFileSync(path.resolve(__dirname, '../modais/', arquivo), 'utf8'))
    .join('\n');

const { db } = await import('../js/db.js');
const { editarAutor, editarMovimentoEscola, editarProsa } = await import('../js/forms.js');
const { prepararNovo } = await import('../js/ui.js');

const opcoes = (id) =>
    Array.from(document.querySelectorAll(`#${id} option`)).map((o) => o.getAttribute('value'));
const esvaziar = (...ids) =>
    ids.forEach((id) => {
        document.getElementById(id).innerHTML = '';
    });
const proximoTick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('Datalists de modais carregados sob demanda', () => {
    beforeEach(() => {
        db.movimentosEscolas = [
            { id: 1, nome: 'Simbolismo', regiaoOrigem: ['França'] },
            { id: 2, nome: 'Barroco', regiaoOrigem: ['Itália', 'Europa'] },
        ];
        db.periodosHistoricos = [
            { id: 20, nome: 'Guerra Fria', regiao: ['Internacional', 'Europa'] },
        ];
        db.autores = [{ id: 10, nome: 'Cruz e Sousa', movimentosEscolasIds: [1] }];
        db.epocas = [
            { id: 31, nome: 'Faculdade', autorId: 10 },
            { id: 32, nome: 'Formatura', autorId: 10, evento: true },
        ];
        db.periodosHistoricos.push({ id: 21, nome: 'Semana de Arte Moderna', evento: true });
        db.prosas = [{ id: 50, titulo: 'Prosa de teste', autoria: [{ autorId: 10 }] }];
        esvaziar(
            'sugestoes-epoca-nome-prosa',
            'sugestoes-evento-biografico-nome-prosa',
            'sugestoes-periodo-historico-nome-prosa',
            'sugestoes-evento-historico-nome-prosa',
            'sugestoes-movimentos-escolas-autor',
            'sugestoes-movimentos-escolas-prosa',
            'sugestoes-linguas-escrita-autor',
            'sugestoes-regiao-origem-movimento',
        );
    });

    it('Autor: editarAutor sugere os movimentos do cadastro, em ordem alfabética', async () => {
        assert.deepEqual(opcoes('sugestoes-movimentos-escolas-autor'), []);
        await editarAutor(10);
        assert.deepEqual(opcoes('sugestoes-movimentos-escolas-autor'), ['Barroco', 'Simbolismo']);
    });

    it('Autor: "Novo Autor" sugere os movimentos do cadastro', async () => {
        await prepararNovo('autor');
        assert.deepEqual(opcoes('sugestoes-movimentos-escolas-autor'), ['Barroco', 'Simbolismo']);
    });

    it('Autor: um movimento criado depois aparece na próxima abertura', async () => {
        await editarAutor(10);
        db.movimentosEscolas.push({ id: 3, nome: 'Parnasianismo' });
        await editarAutor(10);
        assert.deepEqual(opcoes('sugestoes-movimentos-escolas-autor'), [
            'Barroco',
            'Parnasianismo',
            'Simbolismo',
        ]);
    });

    it('Autor: abrir o modal também popula as línguas de escrita sugeridas', async () => {
        await editarAutor(10);
        assert.ok(opcoes('sugestoes-linguas-escrita-autor').length > 0);
    });

    it('Autor: abrir o modal sugere os círculos literários de outros Autores, sem quebrar com lista vazia', async () => {
        db.autores = [
            { id: 10, nome: 'Cruz e Sousa', circulo: [] },
            { id: 11, nome: 'Outro', circulo: ['Grupo Sul'] },
        ];
        esvaziar('sugestoes-circulo-literario');
        await editarAutor(10);
        assert.deepEqual(opcoes('sugestoes-circulo-literario'), ['Grupo Sul']);
    });

    it('Prosa: "Nova Prosa" sugere os movimentos do cadastro', async () => {
        await prepararNovo('prosa');
        await proximoTick();
        assert.deepEqual(opcoes('sugestoes-movimentos-escolas-prosa'), ['Barroco', 'Simbolismo']);
    });

    const PERIODOS_EVENTOS_PROSA = {
        'sugestoes-epoca-nome-prosa': ['Faculdade'],
        'sugestoes-evento-biografico-nome-prosa': ['Formatura'],
        'sugestoes-periodo-historico-nome-prosa': ['Guerra Fria'],
        'sugestoes-evento-historico-nome-prosa': ['Semana de Arte Moderna'],
    };
    const conferirPeriodosEventosProsa = () =>
        Object.entries(PERIODOS_EVENTOS_PROSA).forEach(([id, esperado]) =>
            assert.deepEqual(opcoes(id), esperado, id),
        );

    it('Prosa: "Nova Prosa" já sugere Períodos e Eventos (biográficos e históricos)', async () => {
        await prepararNovo('prosa');
        await proximoTick();
        conferirPeriodosEventosProsa();
    });

    it('Prosa: editar sugere Períodos e Eventos (biográficos e históricos)', async () => {
        await editarProsa(50);
        conferirPeriodosEventosProsa();
    });

    it('Movimento/Escola: "Novo" sugere os lugares já usados em Correntes e Períodos Históricos', async () => {
        await prepararNovo('movimento-escola');
        assert.deepEqual(opcoes('sugestoes-regiao-origem-movimento'), [
            'Europa',
            'França',
            'Internacional',
            'Itália',
        ]);
    });

    it('Movimento/Escola: editar sugere os lugares já usados em Correntes e Períodos Históricos', async () => {
        await editarMovimentoEscola(1);
        assert.deepEqual(opcoes('sugestoes-regiao-origem-movimento'), [
            'Europa',
            'França',
            'Internacional',
            'Itália',
        ]);
    });
});
