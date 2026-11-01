import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Modais de Poema e Prosa: os campos de migração e de descarte só aparecem no
// status a que pertencem. Migrado mostra Cortado de, Lançado em e a justificativa
// da migração; Descartado mostra só Cortado de e a justificativa do descarte;
// os demais status não mostram nada, e a Pendência fica sempre à vista. Texto que
// já tem dado fora do seu status continua visível, para o dado não ficar invisível.

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
        ids: { migrado: 10, descartado: 11, sobra: 12, limpo: 13 },
    },
    prosa: {
        colecao: 'prosas',
        editar: editarProsa,
        rastreador: rastreadorProsa,
        modal: 'modal-prosa',
        form: 'form-prosa',
        pref: 'pr',
        ids: { migrado: 20, descartado: 21, sobra: 22, limpo: 23 },
    },
};

function dados() {
    db.livros = [{ id: 1, titulo: 'Livro Um', sequencia: 1, tipo: 'Inéditos' }];
    db.partes = [];
    db.secoes = [];
    db.elementos = [];
    db.itensColetanea = [];
    const base = (id, extra) => ({ id, titulo: `T${id}`, texto: 'a', livrosIds: [1], ...extra });
    const conjunto = (m, d, s, l) => [
        base(m, {
            status: 'migrado',
            cortadoDe: { livro: 'Velho', secao: 'S', posicao: 2 },
            lancadoEm: { livro: 'Livro Um', secao: 'Cofre' },
            justificativaMigracao: 'foi para o cofre',
        }),
        base(d, {
            status: 'descartado',
            cortadoDe: { livro: 'Velho', secao: 'S', posicao: 3 },
            descarte: 'não cabia',
        }),
        base(s, {
            status: 'publicado',
            cortadoDe: { livro: 'Velho', secao: 'S' },
            justificativaMigracao: 'sobra de quando foi migrado',
        }),
        base(l, { status: 'publicado' }),
    ];
    db.poemas = conjunto(10, 11, 12, 13);
    db.prosas = conjunto(20, 21, 22, 23);
}

for (const tipo of ['poema', 'prosa']) {
    const c = CONF[tipo];
    const el = (sufixo) => document.getElementById(`${c.pref}-${sufixo}`);
    const modal = () => document.getElementById(c.modal);
    // Visível = nem ele nem um ancestral até o modal tem a classe `hidden`.
    const visivel = (e) => {
        for (let n = e; n && n !== modal(); n = n.parentElement) {
            if (n.classList.contains('hidden')) return false;
        }
        return true;
    };
    const trocarStatus = (valor) => {
        el('status').value = valor;
        el('status').dispatchEvent(new Event('change', { bubbles: true }));
    };
    const campos = () => ({
        cortado: visivel(el('cortado-livro')) && visivel(el('cortado-posicao')),
        lancado: visivel(el('lancado-livro')) && visivel(el('lancado-secao')),
        justMigracao: visivel(el('migracao-justificativa')),
        descarte: visivel(el('descarte')),
    });

    describe(`Campos de migração e descarte por status (${tipo})`, () => {
        beforeEach(async () => {
            localStorage.clear();
            dados();
            c.rastreador.marcarLimpo();
            if (aberto(c.modal)) await toggleModal(c.modal);
        });

        it('texto novo (Completo): nada de migração nem de descarte à vista', async () => {
            await toggleModal(c.modal);
            assert.equal(el('status').value, 'completo');
            assert.deepEqual(campos(), {
                cortado: false,
                lancado: false,
                justMigracao: false,
                descarte: false,
            });
            assert.equal(visivel(el('status-campos')), false);
        });

        it('Migrado mostra Cortado de, Lançado em e a justificativa da migração, sem Descarte', async () => {
            await toggleModal(c.modal);
            trocarStatus('migrado');
            assert.deepEqual(campos(), {
                cortado: true,
                lancado: true,
                justMigracao: true,
                descarte: false,
            });
        });

        it('Descartado mostra só Cortado de e o Descarte, sem Lançado em nem justificativa da migração', async () => {
            await toggleModal(c.modal);
            trocarStatus('descartado');
            assert.deepEqual(campos(), {
                cortado: true,
                lancado: false,
                justMigracao: false,
                descarte: true,
            });
        });

        it('no Descartado, o Descarte vem logo depois do Cortado de, na mesma caixa', async () => {
            await toggleModal(c.modal);
            trocarStatus('descartado');
            const caixa = el('status-campos');
            assert.ok(caixa.contains(el('cortado-livro')));
            assert.ok(caixa.contains(el('descarte')));
            assert.ok(el('cortado-posicao').compareDocumentPosition(el('descarte')) & 4);
        });

        it('o título da caixa acompanha o status', async () => {
            await toggleModal(c.modal);
            const titulos = () =>
                Array.from(el('status-campos').querySelectorAll('label.form-label > span'))
                    .filter((s) => s.hasAttribute('data-status-visivel') && visivel(s))
                    .map((s) => s.textContent.trim());
            trocarStatus('migrado');
            assert.deepEqual(titulos(), ['Migração entre livros']);
            trocarStatus('descartado');
            assert.ok(titulos().includes('Descarte'));
            assert.ok(!titulos().includes('Migração entre livros'));
        });

        it('a Pendência fica fora da caixa e visível em todos os status', async () => {
            await toggleModal(c.modal);
            assert.equal(el('status-campos').contains(el('pendencia')), false);
            for (const status of [
                'incompleto',
                'completo',
                'publicado',
                'migrado',
                'descartado',
                'privado',
            ]) {
                trocarStatus(status);
                assert.equal(visivel(el('pendencia')), true, `pendência no status ${status}`);
            }
        });

        it('Publicado, Privado, Incompleto e Completo sem dado não mostram a caixa', async () => {
            await toggleModal(c.modal);
            for (const status of ['incompleto', 'completo', 'publicado', 'privado']) {
                trocarStatus(status);
                assert.equal(visivel(el('status-campos')), false, status);
            }
        });

        it('voltar de Migrado para um status comum, com os campos vazios, esconde tudo de novo', async () => {
            await toggleModal(c.modal);
            trocarStatus('migrado');
            assert.equal(visivel(el('status-campos')), true);
            trocarStatus('completo');
            assert.equal(visivel(el('status-campos')), false);
        });

        it('Editar um migrado já abre com os campos de migração à vista', async () => {
            await c.editar(c.ids.migrado);
            assert.deepEqual(campos(), {
                cortado: true,
                lancado: true,
                justMigracao: true,
                descarte: false,
            });
            assert.equal(el('cortado-livro').value, 'Velho');
            assert.equal(el('migracao-justificativa').value, 'foi para o cofre');
        });

        it('Editar um descartado já abre com Cortado de e Descarte à vista', async () => {
            await c.editar(c.ids.descartado);
            assert.deepEqual(campos(), {
                cortado: true,
                lancado: false,
                justMigracao: false,
                descarte: true,
            });
            assert.equal(el('descarte').value, 'não cabia');
        });

        it('Editar um texto comum sem dado de migração não mostra a caixa', async () => {
            await c.editar(c.ids.limpo);
            assert.equal(visivel(el('status-campos')), false);
        });

        it('dado fora do status continua à vista, só nos pedaços que têm texto, com o aviso', async () => {
            await c.editar(c.ids.sobra);
            assert.equal(visivel(el('status-campos')), true);
            assert.deepEqual(campos(), {
                cortado: true,
                lancado: false,
                justMigracao: true,
                descarte: false,
            });
            const aviso = Array.from(
                el('status-campos').querySelectorAll('p[data-status-visivel="outro"]'),
            );
            assert.equal(aviso.length, 1);
            assert.equal(visivel(aviso[0]), true);
        });

        it('esvaziar a sobra e trocar o status de novo esconde a caixa', async () => {
            await c.editar(c.ids.sobra);
            el('cortado-livro').value = '';
            el('cortado-secao').value = '';
            el('cortado-posicao').value = '';
            el('migracao-justificativa').value = '';
            trocarStatus('completo');
            assert.equal(visivel(el('status-campos')), false);
        });

        it('esconder o campo não apaga o que está nele: o salvar continua gravando', async () => {
            await c.editar(c.ids.migrado);
            trocarStatus('publicado');
            document.getElementById(c.form).requestSubmit();
            await esperar();
            const salvo = db[c.colecao].find((x) => x.id === c.ids.migrado);
            assert.equal(salvo.justificativaMigracao, 'foi para o cofre');
            assert.equal(salvo.cortadoDe.livro, 'Velho');
        });

        it('Novo depois de editar um migrado volta a esconder a caixa', async () => {
            await c.editar(c.ids.migrado);
            assert.equal(visivel(el('status-campos')), true);
            document.getElementById(c.form).reset();
            await esperar();
            assert.equal(el('status').value, 'completo');
            assert.equal(visivel(el('status-campos')), false);
        });
    });
}
