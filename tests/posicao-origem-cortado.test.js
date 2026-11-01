import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Posição de origem em "Cortado de" (migração entre livros): campo opcional nos
// modais de Poema e Prosa, gravado só quando preenchido (sem o 0), carregado no
// Editar e mostrado no texto de origem das saídas. "Lançado em" não ganha posição:
// a do destino já é a sequência do próprio texto.

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
const { livroSecaoStr } = await import('../js/exportar-md.js');

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
    },
    prosa: {
        colecao: 'prosas',
        editar: editarProsa,
        rastreador: rastreadorProsa,
        modal: 'modal-prosa',
        form: 'form-prosa',
        pref: 'pr',
    },
};

function dados() {
    db.livros = [{ id: 1, titulo: 'Livro Um', sequencia: 1, tipo: 'Inéditos' }];
    db.partes = [];
    db.secoes = [];
    db.elementos = [];
    db.itensColetanea = [];
    db.poemas = [
        {
            id: 10,
            titulo: 'Com origem',
            texto: 'a',
            status: 'migrado',
            livrosIds: [1],
            cortadoDe: { livro: 'Livro Velho', secao: 'Seção Velha', posicao: 4 },
            lancadoEm: { livro: 'Livro Um', secao: '' },
        },
        { id: 11, titulo: 'Sem origem', texto: 'b', livrosIds: [1] },
    ];
    db.prosas = [
        {
            id: 20,
            titulo: 'Prosa com origem',
            texto: 'a',
            status: 'migrado',
            livrosIds: [1],
            cortadoDe: { livro: 'Livro Velho', secao: '', posicao: 2 },
        },
        { id: 21, titulo: 'Prosa sem origem', texto: 'b', livrosIds: [1] },
    ];
}

for (const tipo of ['poema', 'prosa']) {
    const c = CONF[tipo];
    const [comOrigem, semOrigem] = tipo === 'poema' ? [10, 11] : [20, 21];
    const el = (sufixo) => document.getElementById(`${c.pref}-${sufixo}`);

    describe(`Posição de origem no ${tipo}`, () => {
        beforeEach(async () => {
            localStorage.clear();
            dados();
            c.rastreador.marcarLimpo();
            if (aberto(c.modal)) await toggleModal(c.modal);
        });

        it('o modal tem o campo, numérico, mínimo 1, depois da Seção de origem', async () => {
            await toggleModal(c.modal);
            const campo = el('cortado-posicao');
            assert.ok(campo, 'campo de posição de origem');
            assert.equal(campo.type, 'number');
            assert.equal(campo.min, '1');
            assert.ok(el('cortado-secao').compareDocumentPosition(campo) & 4);
            assert.equal(el('lancado-posicao'), null, 'Lançado em não tem posição');
        });

        it('layout: Livro ocupa a linha toda; Seção e posição ficam lado a lado, com a posição estreita', async () => {
            await toggleModal(c.modal);
            const livro = el('cortado-livro');
            const grade = livro.parentElement;
            assert.ok(livro.classList.contains('col-span-2'), 'livro ocupa as duas colunas');
            assert.equal(el('cortado-secao').parentElement, grade);
            assert.equal(el('cortado-posicao').parentElement, grade);
            assert.match(grade.className, /grid-cols-\[minmax\(0,1fr\)_7rem\]/);
            assert.equal(
                el('cortado-posicao').getAttribute('aria-label'),
                'Posição de origem: o número que o texto tinha na época (opcional)',
            );
        });

        it('Editar carrega a posição salva; sem origem, o campo vem vazio', async () => {
            await c.editar(comOrigem);
            assert.equal(el('cortado-posicao').value, tipo === 'poema' ? '4' : '2');
            await c.editar(semOrigem);
            assert.equal(el('cortado-posicao').value, '');
        });

        it('salvar grava a posição digitada junto com livro e seção', async () => {
            await c.editar(semOrigem);
            el('cortado-livro').value = 'Livro X';
            el('cortado-secao').value = 'Seção Y';
            el('cortado-posicao').value = '7';
            document.getElementById(c.form).requestSubmit();
            await esperar();
            const salvo = db[c.colecao].find((x) => x.id === semOrigem);
            assert.deepEqual(salvo.cortadoDe, { livro: 'Livro X', secao: 'Seção Y', posicao: 7 });
        });

        it('posição apagada não vira chave; livro e seção continuam', async () => {
            await c.editar(comOrigem);
            el('cortado-posicao').value = '';
            document.getElementById(c.form).requestSubmit();
            await esperar();
            const salvo = db[c.colecao].find((x) => x.id === comOrigem);
            assert.equal('posicao' in salvo.cortadoDe, false);
            assert.equal(salvo.cortadoDe.livro, 'Livro Velho');
        });

        it('o 0 é barrado pelo mínimo 1 do campo (validação nativa)', async () => {
            await toggleModal(c.modal);
            el('cortado-posicao').value = '0';
            assert.equal(el('cortado-posicao').validity.rangeUnderflow, true);
        });

        it('apagar tudo deixa cortadoDe nulo', async () => {
            await c.editar(comOrigem);
            el('cortado-livro').value = '';
            el('cortado-secao').value = '';
            el('cortado-posicao').value = '';
            document.getElementById(c.form).requestSubmit();
            await esperar();
            assert.equal(db[c.colecao].find((x) => x.id === comOrigem).cortadoDe, null);
        });

        it('Lançado em segue sem a chave posicao', async () => {
            await c.editar(comOrigem);
            document.getElementById(c.form).requestSubmit();
            await esperar();
            const salvo = db[c.colecao].find((x) => x.id === comOrigem);
            if (salvo.lancadoEm) assert.equal('posicao' in salvo.lancadoEm, false);
        });
    });
}

describe('livroSecaoStr com posição', () => {
    it('acrescenta a posição ao livro e à seção', () => {
        assert.equal(
            livroSecaoStr({ livro: 'A', secao: 'B', posicao: 3 }),
            'A › B · era a nº 3 na época',
        );
        assert.equal(
            livroSecaoStr({ livro: 'A', secao: '', posicao: 3 }),
            'A · era a nº 3 na época',
        );
    });

    it('sem posição, sai como antes', () => {
        assert.equal(livroSecaoStr({ livro: 'A', secao: 'B' }), 'A › B');
        assert.equal(livroSecaoStr({ livro: '', secao: '' }), null);
        assert.equal(livroSecaoStr(null), null);
    });

    it('posição sozinha ainda é mostrada; 0 e lixo são ignorados', () => {
        assert.equal(livroSecaoStr({ livro: '', secao: '', posicao: 5 }), 'era a nº 5 na época');
        assert.equal(livroSecaoStr({ livro: 'A', secao: '', posicao: 0 }), 'A');
        assert.equal(livroSecaoStr({ livro: 'A', secao: '', posicao: 'x' }), 'A');
    });
});
