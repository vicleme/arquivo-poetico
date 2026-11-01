import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Coletâneas no grupo "Onde aparece" (Fase 21, 21-2 entrega 3): só leitura
// (F21-D3, a gravação segue na aba Coletâneas), com um atalho por coletânea que
// fecha o modal e abre a aba já nela. Modal com alterações não salvas: o fechar
// pede confirmação e o atalho não navega por cima do modal ainda aberto.

globalThis.indexedDB = { open: () => ({}) };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
globalThis.fetch = async (url) => ({
    ok: true,
    status: 200,
    text: async () =>
        fs.readFileSync(path.resolve(__dirname, '../modais', path.basename(url)), 'utf8'),
});

document.body.innerHTML = `
    <nav>
        <button id="btn-poemas">Poemas</button>
        <button id="btn-coletaneas">Coletâneas</button>
    </nav>
    <section id="poemas" class="tab-content active"></section>
    <section id="coletaneas" class="tab-content"><div id="lista-coletaneas"></div></section>
    <div id="modais-container"></div>`;

// abrirAba de mentira: só troca a aba ativa, como openTab faz.
const trocarAba = (id) => {
    document.querySelectorAll('.tab-content').forEach((x) => x.classList.remove('active'));
    document.getElementById(id)?.classList.add('active');
};

const { registrarModal, toggleModal } = await import('../js/modais.js');
const { db } = await import('../js/db.js');
const { removerFaixaDeOrigem, temFaixaDeOrigem } = await import('../js/faixa-origem.js');
const { prepararNovo } = await import('../js/ui.js');
const { initFormPoema, initFormProsa, editarPoema, editarProsa, rastreadorPoema, rastreadorProsa } =
    await import('../js/forms.js');

registrarModal('modal-poema', 'modal-poema.html', initFormPoema, rastreadorPoema);
registrarModal('modal-prosa', 'modal-prosa.html', initFormProsa, rastreadorProsa);

const aberto = (id) => {
    const e = document.getElementById(id);
    return !!e && !e.classList.contains('hidden');
};
const esperar = () => new Promise((r) => setTimeout(r, 30));

const CONF = {
    poema: {
        colecao: 'poemas',
        editar: editarPoema,
        rastreador: rastreadorPoema,
        modal: 'modal-poema',
        pref: 'p',
        ids: { emColetanea: 11, avulso: 12 },
    },
    prosa: {
        colecao: 'prosas',
        editar: editarProsa,
        rastreador: rastreadorProsa,
        modal: 'modal-prosa',
        pref: 'pr',
        ids: { emColetanea: 21, avulso: 22 },
    },
};

function dados(c) {
    db.livros = [
        { id: 1, titulo: 'Um', sequencia: 1, tipo: 'Inéditos' },
        { id: 3, titulo: 'Coletânea X', sequencia: 2, tipo: 'Coletânea' },
        { id: 4, titulo: 'Coletânea Y', sequencia: 3, tipo: 'Coletânea' },
    ];
    db.partes = [
        { id: 10, livroId: 1, titulo: 'Parte', sequencia: 1 },
        { id: 30, livroId: 3, titulo: 'Parte da X', sequencia: 1 },
        { id: 40, livroId: 4, titulo: 'Parte da Y', sequencia: 1 },
    ];
    db.secoes = [];
    db.elementos = [];
    db.poemas = [];
    db.prosas = [];
    const base = (id) => ({
        id,
        titulo: `T${id}`,
        texto: 'x',
        status: 'completo',
        paiTipo: null,
        paiId: null,
        sequencia: null,
        livrosIds: [],
    });
    db[c.colecao] = [base(c.ids.emColetanea), base(c.ids.avulso)];
    const refTipo = c.colecao === 'poemas' ? 'poema' : 'prosa';
    db.itensColetanea = [
        { id: 1, parteId: 30, refTipo, refId: c.ids.emColetanea, sequencia: 1 },
        { id: 2, parteId: 40, refTipo, refId: c.ids.emColetanea, sequencia: 1 },
    ];
}

for (const tipo of ['poema', 'prosa']) {
    const c = CONF[tipo];
    const info = () => document.getElementById(`${c.pref}-coletaneas-info`);
    const atalhos = () => Array.from(info().querySelectorAll('.col-atalho'));
    let abertas;

    describe(`Coletâneas em leitura no Onde aparece (${tipo})`, () => {
        beforeEach(async () => {
            localStorage.clear();
            dados(c);
            c.rastreador.marcarLimpo();
            abertas = [];
            window.abrirAba = (id) => {
                abertas.push(id);
                trocarAba(id);
            };
            removerFaixaDeOrigem('coletaneas');
            trocarAba('poemas');
            if (aberto(c.modal)) await toggleModal(c.modal);
        });

        it('texto em duas coletâneas: um atalho por coletânea, com a Parte', async () => {
            await c.editar(c.ids.emColetanea);
            const botoes = atalhos();
            assert.equal(botoes.length, 2);
            assert.equal(botoes[0].dataset.coletaneaId, '3');
            assert.match(botoes[0].textContent, /Coletânea X › Parte da X/);
            assert.equal(botoes[1].dataset.coletaneaId, '4');
            assert.match(botoes[1].textContent, /Coletânea Y › Parte da Y/);
            assert.match(info().textContent, /aba Coletâneas/);
        });

        it('texto fora de coletânea e texto novo: sem indicador', async () => {
            await c.editar(c.ids.avulso);
            assert.equal(info().innerHTML.trim(), '');
            await toggleModal(c.modal);
            await prepararNovo(tipo);
            assert.equal(info().innerHTML.trim(), '');
        });

        it('o atalho fecha o modal e abre a aba Coletâneas na coletânea escolhida', async () => {
            await c.editar(c.ids.emColetanea);
            await esperar();
            assert.equal(aberto(c.modal), true);
            atalhos()[1].click();
            await esperar();
            assert.equal(aberto(c.modal), false);
            assert.deepEqual(abertas, ['coletaneas']);
            assert.match(document.getElementById('lista-coletaneas').textContent, /Coletânea Y/);
        });

        it('a aba Coletâneas abre com a faixa "Voltar", sem "Limpar filtro"', async () => {
            await c.editar(c.ids.emColetanea);
            await esperar();
            atalhos()[0].click();
            await esperar();
            const faixa = document.querySelector('[data-faixa-origem="coletaneas"]');
            assert.ok(faixa, 'faixa na aba Coletâneas');
            assert.match(faixa.textContent, /Aberta a partir de (o poema|a prosa) “T/);
            assert.match(faixa.textContent, /Voltar para Poemas/);
            assert.equal(faixa.querySelector('[data-faixa="limpar"]'), null);
            faixa.querySelector('[data-faixa="voltar"]').click();
            assert.equal(temFaixaDeOrigem('coletaneas'), false);
            assert.equal(document.querySelector('.tab-content.active').id, 'poemas');
        });

        it('a faixa some sozinha quando a pessoa sai da aba Coletâneas', async () => {
            await c.editar(c.ids.emColetanea);
            await esperar();
            atalhos()[0].click();
            await esperar();
            assert.equal(temFaixaDeOrigem('coletaneas'), true);
            trocarAba('poemas');
            await esperar();
            assert.equal(temFaixaDeOrigem('coletaneas'), false);
        });

        it('com alterações não salvas o atalho não navega por cima do modal', async () => {
            await c.editar(c.ids.emColetanea);
            await esperar();
            assert.equal(aberto(c.modal), true);
            document.getElementById(`${c.pref}-titulo`).value = 'Mudou';
            document
                .getElementById(`${c.pref}-titulo`)
                .dispatchEvent(new Event('input', { bubbles: true }));
            assert.equal(c.rastreador.estaSujo(), true);
            atalhos()[0].click();
            await esperar();
            assert.equal(aberto(c.modal), true, 'o modal pede confirmação e segue aberto');
            assert.deepEqual(abertas, []);
            c.rastreador.marcarLimpo();
        });
    });
}
