import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Modais de Poema e Prosa: com o status Descartado, o grupo "Onde aparece"
// (as linhas de aparição e o "+ Aparição") fica travado e avisa que a origem está
// em "Cortado de". Os dados continuam nos campos e são gravados como estão (sem
// posição na fila), para que voltar o status destrave tudo sem perder o vínculo.

globalThis.indexedDB = { open: () => ({}) };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
globalThis.fetch = async (url) => ({
    ok: true,
    status: 200,
    text: async () =>
        fs.readFileSync(path.resolve(__dirname, '../modais', path.basename(url)), 'utf8'),
});

document.body.innerHTML = '<main></main><div id="modais-container"></div>';

const { registrarModal, toggleModal } = await import('../js/modais.js');
const { db } = await import('../js/db.js');
const { initFormPoema, initFormProsa, editarPoema, editarProsa, rastreadorPoema, rastreadorProsa } =
    await import('../js/forms.js');

registrarModal('modal-poema', 'modal-poema.html', initFormPoema, rastreadorPoema);
registrarModal('modal-prosa', 'modal-prosa.html', initFormProsa, rastreadorProsa);

const aberto = (id) => {
    const el = document.getElementById(id);
    return !!el && !el.classList.contains('hidden');
};
const esperar = () => new Promise((r) => setTimeout(r, 30));

const CONF = {
    poema: {
        colecao: 'poemas',
        editar: editarPoema,
        rastreador: rastreadorPoema,
        modal: 'modal-poema',
        form: 'form-poema',
        pref: 'p',
        ids: { descartado: 11, comum: 13 },
    },
    prosa: {
        colecao: 'prosas',
        editar: editarProsa,
        rastreador: rastreadorProsa,
        modal: 'modal-prosa',
        form: 'form-prosa',
        pref: 'pr',
        ids: { descartado: 21, comum: 23 },
    },
};

function dados() {
    db.livros = [{ id: 1, titulo: 'Livro Um', sequencia: 1, tipo: 'Inéditos' }];
    db.partes = [];
    db.secoes = [{ id: 5, titulo: 'Viagens', paiTipo: 'livro', paiId: 1, sequencia: 1 }];
    db.elementos = [];
    db.itensColetanea = [];
    const base = (id, extra) => ({
        id,
        titulo: `T${id}`,
        texto: 'a',
        livrosIds: [1],
        paiTipo: 'secao',
        paiId: 5,
        ...extra,
    });
    const conjunto = (d, l) => [
        base(d, {
            status: 'descartado',
            sequencia: null,
            cortadoDe: { livro: 'Livro Um', secao: 'Viagens', posicao: 3 },
            descarte: 'não cabia',
        }),
        base(l, { status: 'publicado', sequencia: 2 }),
    ];
    db.poemas = conjunto(11, 13);
    db.prosas = conjunto(21, 23);
}

for (const tipo of ['poema', 'prosa']) {
    const c = CONF[tipo];
    const el = (sufixo) => document.getElementById(`${c.pref}-${sufixo}`);
    const trocarStatus = (valor) => {
        el('status').value = valor;
        el('status').dispatchEvent(new Event('change', { bubbles: true }));
    };
    // Trava do grupo: o "+ Aparição" e, quando há linha, o livro, o lugar e o tirar.
    const travados = () => ({
        adicionar: el('onde-add').disabled,
        ...Object.fromEntries(
            ['ol-livro', 'ol-lugar', 'ol-remover'].map((classe) => {
                const campo = el('onde-linhas').querySelector(`.${classe}`);
                return [classe, campo ? campo.disabled : undefined];
            }),
        ),
    });
    const todos = (v, comLinha = true) => ({
        adicionar: v,
        'ol-livro': comLinha ? v : undefined,
        'ol-lugar': comLinha ? v : undefined,
        'ol-remover': comLinha ? v : undefined,
    });
    const aviso = () => !el('onde-trava').classList.contains('hidden');
    const escolher = (seletor, valor) => {
        const campo = el('onde-linhas').querySelector(seletor);
        campo.value = valor;
        campo.dispatchEvent(new Event('change', { bubbles: true }));
    };

    describe(`Trava do destino no Descartado (${tipo})`, () => {
        beforeEach(async () => {
            localStorage.clear();
            dados();
            c.rastreador.marcarLimpo();
            if (aberto(c.modal)) await toggleModal(c.modal);
        });

        it('texto novo: tudo livre e sem aviso', async () => {
            await toggleModal(c.modal);
            assert.deepEqual(travados(), todos(false, false));
            assert.equal(aviso(), false);
        });

        it('escolher Descartado trava o grupo e mostra o aviso; sair do status destrava', async () => {
            await toggleModal(c.modal);
            el('onde-add').click();
            assert.deepEqual(travados(), todos(false));
            trocarStatus('descartado');
            assert.deepEqual(travados(), todos(true));
            assert.equal(aviso(), true);
            trocarStatus('publicado');
            assert.deepEqual(travados(), todos(false));
            assert.equal(aviso(), false);
        });

        it('o Cortado de ainda é proposto a partir da primeira aparição escolhida antes da trava', async () => {
            await toggleModal(c.modal);
            el('onde-add').click();
            escolher('.ol-livro', '1');
            escolher('.ol-lugar', 'secao:5');
            trocarStatus('descartado');
            assert.equal(el('cortado-livro').value, 'Livro Um');
            assert.equal(el('cortado-secao').value, 'Viagens');
            assert.deepEqual(travados(), todos(true));
        });

        it('Editar um descartado já abre travado, com os valores guardados nos campos', async () => {
            await c.editar(c.ids.descartado);
            assert.deepEqual(travados(), todos(true));
            assert.equal(aviso(), true);
            assert.equal(el('onde-linhas').children.length, 1);
            assert.equal(el('onde-linhas').querySelector('.ol-livro').value, '1');
            assert.equal(el('onde-linhas').querySelector('.ol-lugar').value, 'secao:5');
        });

        it('Editar um texto comum abre livre', async () => {
            await c.editar(c.ids.comum);
            assert.deepEqual(travados(), todos(false));
            assert.equal(aviso(), false);
        });

        it('salvar um descartado mantém o vínculo e o livro, só sem posição na fila', async () => {
            await c.editar(c.ids.descartado);
            document.getElementById(c.form).requestSubmit();
            await esperar();
            const salvo = db[c.colecao].find((x) => x.id === c.ids.descartado);
            assert.deepEqual(salvo.aparicoes, [
                { livroId: 1, parteId: null, secaoId: 5, sequencia: null },
            ]);
            assert.equal(salvo.paiTipo, 'secao');
            assert.equal(String(salvo.paiId), '5');
            assert.equal(salvo.sequencia, null);
            assert.equal(salvo.cortadoDe.livro, 'Livro Um');
        });

        it('destravar e salvar com outro status devolve a posição normal ao texto', async () => {
            await c.editar(c.ids.descartado);
            trocarStatus('publicado');
            assert.deepEqual(travados(), todos(false));
            document.getElementById(c.form).requestSubmit();
            await esperar();
            const salvo = db[c.colecao].find((x) => x.id === c.ids.descartado);
            assert.equal(salvo.status, 'publicado');
            assert.equal(String(salvo.paiId), '5');
        });

        it('Novo depois de editar um descartado volta tudo livre', async () => {
            await c.editar(c.ids.descartado);
            assert.deepEqual(travados(), todos(true));
            document.getElementById(c.form).reset();
            await esperar();
            assert.equal(el('status').value, 'completo');
            assert.deepEqual(travados(), todos(false, false));
            assert.equal(aviso(), false);
        });
    });
}
