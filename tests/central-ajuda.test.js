import './helpers/dom-real.js';

import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML_CENTRAL_AJUDA = fs.readFileSync(
    path.resolve(__dirname, '../modais/modal-central-ajuda.html'),
    'utf8',
);
const HTML_MODO_APRENDIZADO = fs.readFileSync(
    path.resolve(__dirname, '../modais/modal-modo-aprendizado.html'),
    'utf8',
);

// modais.js carrega cada modal via fetch (lazy), pela URL registrada —
// aqui devolvemos o HTML REAL certo conforme o arquivo pedido, então um
// id renomeado em qualquer um dos dois quebra este teste.
globalThis.fetch = async (url) => ({
    ok: true,
    status: 200,
    text: async () =>
        String(url).includes('modal-central-ajuda') ? HTML_CENTRAL_AJUDA : HTML_MODO_APRENDIZADO,
});
document.body.innerHTML = '<div id="modais-container"></div>';

const { registrarModal, toggleModal } = await import('../js/modais.js');
const ma = await import('../js/modo-aprendizado.js');
const ca = await import('../js/central-ajuda.js');
const tour = await import('../js/tour.js');
const { TAREFAS_COMO_FACO } = await import('../js/como-faco-passos.js');
const { CATEGORIAS_FAQ } = await import('../js/faq-conteudo.js');

registrarModal('modal-modo-aprendizado', 'modal-modo-aprendizado.html', ma.initModoAprendizado);
registrarModal('modal-central-ajuda', 'modal-central-ajuda.html', ca.initCentralAjuda);

const el = (id) => document.getElementById(id);
const aberto = (id) => !el(id).classList.contains('hidden');

describe('Central de Ajuda — modal', () => {
    before(async () => {
        await ca.abrirCentralAjuda();
        await toggleModal('modal-central-ajuda');
    });

    beforeEach(() => {
        localStorage.clear();
        el('modal-central-ajuda').classList.add('hidden');
    });

    it('abre e monta as duas listas a partir dos dados', async () => {
        await ca.abrirCentralAjuda();
        assert.ok(aberto('modal-central-ajuda'));

        const itensComoFaco = el('ca-como-faco-lista').querySelectorAll('summary');
        assert.equal(itensComoFaco.length, TAREFAS_COMO_FACO.length);

        const totalPerguntas = CATEGORIAS_FAQ.flatMap((c) => c.perguntas).length;
        const detalhesFaq = el('ca-faq-lista').querySelectorAll('details');
        assert.equal(detalhesFaq.length, totalPerguntas);
    });

    it('cada tarefa mostra a descrição acima do botão "Mostrar na tela"', async () => {
        await ca.abrirCentralAjuda();
        const itens = el('ca-como-faco-lista').querySelectorAll('details');
        assert.equal(itens.length, TAREFAS_COMO_FACO.length);
        itens.forEach((item, i) => {
            const paragrafo = item.querySelector('p');
            const botao = item.querySelector('button');
            assert.equal(paragrafo.textContent, TAREFAS_COMO_FACO[i].descricao);
            // a descrição vem antes do botão no corpo do item
            assert.ok(paragrafo.compareDocumentPosition(botao) & 4, 'descrição depois do botão');
        });
    });

    it('botão de apresentação diz "Ver" sem perfil salvo', async () => {
        await ca.abrirCentralAjuda();
        assert.equal(el('ca-btn-apresentacao').textContent, 'Ver a apresentação completa');
    });

    it('botão de apresentação diz "Rever" com perfil já salvo', async () => {
        ma.salvarPerfilModoAprendizado('escritor');
        await ca.abrirCentralAjuda();
        assert.equal(el('ca-btn-apresentacao').textContent, 'Rever a apresentação completa');
    });

    it('"Ver/Rever a apresentação" fecha esta e abre o modal do Modo Aprendizado', async () => {
        await ca.abrirCentralAjuda();
        await ca.abrirApresentacaoDaAjuda();
        assert.ok(!aberto('modal-central-ajuda'));
        assert.ok(aberto('modal-modo-aprendizado'));
        await toggleModal('modal-modo-aprendizado'); // devolve ao estado fechado pro próximo teste
    });

    it('"Mostrar na tela" numa tarefa fecha o modal e inicia o mini-tour dela', async () => {
        await ca.abrirCentralAjuda();
        const botao = el('ca-como-faco-lista').querySelector('button');
        botao.dispatchEvent(new Event('click', { bubbles: true }));
        // toggleModal e iniciarTour são assíncronos/imediatos o bastante pra
        // já refletir no próximo tick de microtarefas (mesmo padrão dos
        // outros testes de clique deste arquivo).
        await Promise.resolve();
        await Promise.resolve();
        assert.ok(!aberto('modal-central-ajuda'));
        assert.ok(tour.tourAtivo());
        tour.encerrarTour();
    });
});
