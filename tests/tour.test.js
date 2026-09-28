import './helpers/dom-real.js';

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const tour = await import('../js/tour.js');

const el = (id) => document.getElementById(id);
const oculto = (id) => el(id).classList.contains('hidden');

// happy-dom não faz layout: getBoundingClientRect volta zerado. Cada teste
// diz explicitamente quais elementos "aparecem" na tela.
function darTamanho(id, rect = { top: 100, left: 50, width: 100, height: 40 }) {
    const r = { ...rect, bottom: rect.top + rect.height, right: rect.left + rect.width };
    el(id).getBoundingClientRect = () => r;
}

let visitas;

beforeEach(() => {
    document.body.innerHTML = `
        <section id="aba-a" class="tab-content active"></section>
        <section id="aba-b" class="tab-content"></section>
        <button id="alvo1">um</button>
        <button id="alvo2">dois</button>
        <button id="oculto">oculto</button>
    `;
    darTamanho('alvo1');
    darTamanho('alvo2', { top: 300, left: 60, width: 80, height: 30 });
    visitas = [];
    tour.definirNavegacaoTour((aba) => {
        visitas.push(aba);
        document.querySelectorAll('.tab-content').forEach((s) => {
            s.classList.toggle('active', s.id === aba);
        });
    });
});

afterEach(() => tour.encerrarTour());

const passos = [
    { id: 'p1', titulo: 'Um', texto: 'Texto um', seletor: '#alvo1', aba: 'aba-b' },
    {
        id: 'p2',
        titulo: 'Dois',
        texto: 'Texto dois',
        seletor: '#oculto',
        seletorAlternativo: '#alvo2',
    },
    { id: 'p3', titulo: 'Três', texto: 'Texto três', seletor: '#nao-existe' },
];

describe('Tour: motor', () => {
    it('sem passos não abre nada', () => {
        assert.equal(tour.iniciarTour({ passos: [] }), false);
        assert.equal(tour.tourAtivo(), false);
        assert.equal(el('tour-cartao'), null);
    });

    it('abre no passo 1 com progresso, título, texto e destaque no elemento', () => {
        assert.equal(tour.iniciarTour({ passos }), true);
        assert.ok(tour.tourAtivo());
        assert.equal(el('tour-progresso').textContent, '1 de 3');
        assert.equal(el('tour-titulo').textContent, 'Um');
        assert.equal(el('tour-texto').textContent, 'Texto um');
        assert.equal(el('tour-destaque').style.display, 'block');
        assert.ok(oculto('tour-anterior'));
        assert.equal(el('tour-proximo').textContent, 'Próximo');
    });

    it('abre a aba do passo antes de destacar', () => {
        tour.iniciarTour({ passos });
        assert.deepEqual(visitas, ['aba-b']);
    });

    it('o destaque não bloqueia a página (pointer-events: none)', () => {
        tour.iniciarTour({ passos });
        assert.match(el('tour-destaque').style.cssText, /pointer-events:\s*none/);
    });

    it('Próximo avança e Anterior volta', () => {
        tour.iniciarTour({ passos });
        el('tour-proximo').click();
        assert.equal(el('tour-progresso').textContent, '2 de 3');
        assert.ok(!oculto('tour-anterior'));
        el('tour-anterior').click();
        assert.equal(el('tour-progresso').textContent, '1 de 3');
    });

    it('usa o seletor alternativo quando o principal não está visível', () => {
        tour.iniciarTour({ passos });
        el('tour-proximo').click();
        assert.equal(el('tour-destaque').style.display, 'block');
        assert.equal(el('tour-destaque').style.top, '294px'); // 300 menos o padding do destaque
    });

    it('sem nenhum alvo visível mostra só o cartão, sem destaque', () => {
        tour.iniciarTour({ passos });
        el('tour-proximo').click();
        el('tour-proximo').click();
        assert.equal(el('tour-destaque').style.display, 'none');
        assert.equal(el('tour-titulo').textContent, 'Três');
    });

    it('no último passo vira "Concluir", esconde "Pular" e concluir fecha o tour', () => {
        tour.iniciarTour({ passos });
        el('tour-proximo').click();
        el('tour-proximo').click();
        assert.equal(el('tour-proximo').textContent, 'Concluir');
        assert.ok(oculto('tour-pular'));
        el('tour-proximo').click();
        assert.equal(tour.tourAtivo(), false);
        assert.equal(el('tour-cartao'), null);
        assert.equal(el('tour-destaque'), null);
    });

    it('"Pular tour" e Esc fecham em qualquer passo', () => {
        tour.iniciarTour({ passos });
        assert.ok(!oculto('tour-pular'));
        el('tour-pular').click();
        assert.equal(tour.tourAtivo(), false);

        tour.iniciarTour({ passos });
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        assert.equal(tour.tourAtivo(), false);
    });

    it('ao terminar devolve a pessoa pra aba em que estava', () => {
        tour.iniciarTour({ passos });
        assert.ok(el('aba-b').classList.contains('active'));
        el('tour-pular').click();
        assert.ok(el('aba-a').classList.contains('active'));
        assert.deepEqual(visitas, ['aba-b', 'aba-a']);
    });

    it('não navega de volta se a aba já é a original', () => {
        tour.iniciarTour({ passos: [passos[1], passos[2]] });
        el('tour-pular').click();
        assert.deepEqual(visitas, []);
    });

    it('encerrar sem tour aberto é inofensivo', () => {
        tour.encerrarTour();
        tour.encerrarTour();
        assert.equal(tour.tourAtivo(), false);
    });

    it('iniciar de novo com um tour aberto não duplica a camada', () => {
        tour.iniciarTour({ passos });
        tour.iniciarTour({ passos });
        assert.equal(document.querySelectorAll('#tour-cartao').length, 1);
        assert.equal(document.querySelectorAll('#tour-destaque').length, 1);
    });
});

describe('Tour: roteiro do outro perfil', () => {
    const extra = {
        rotulo: 'Estudioso(a) de Literatura',
        passos: [{ id: 'x1', titulo: 'Extra', texto: 'Texto extra', seletor: '#alvo1' }],
    };

    it('só oferece no último passo', () => {
        tour.iniciarTour({ passos, extra });
        assert.ok(oculto('tour-extra'));
        el('tour-proximo').click();
        el('tour-proximo').click();
        assert.ok(!oculto('tour-extra'));
        assert.equal(
            el('tour-extra').textContent,
            'Ver também o roteiro de Estudioso(a) de Literatura',
        );
    });

    it('clicar troca pros passos do outro perfil e não oferece de novo', () => {
        tour.iniciarTour({ passos, extra });
        el('tour-proximo').click();
        el('tour-proximo').click();
        el('tour-extra').click();
        assert.ok(tour.tourAtivo());
        assert.equal(el('tour-progresso').textContent, '1 de 1');
        assert.equal(el('tour-titulo').textContent, 'Extra');
        assert.ok(oculto('tour-extra'));
        assert.equal(el('tour-proximo').textContent, 'Concluir');
    });

    it('sem extra o botão nunca aparece', () => {
        tour.iniciarTour({ passos });
        el('tour-proximo').click();
        el('tour-proximo').click();
        assert.ok(oculto('tour-extra'));
    });
});
