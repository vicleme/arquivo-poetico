import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// O grupo "Onde aparece" dos modais de Poema e Prosa (Fase 21, 21-2 entrega 2):
// uma linha por aparição (livro, lugar, posição), "+ Aparição", tirar, dicas,
// repetidas, rastreador de alterações e o salvar pela função única, com as filas
// de posição acertadas.

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
        form: 'form-poema',
        pref: 'p',
        ids: { na10: [101, 102], dois: 201, outro: 202 },
    },
    prosa: {
        colecao: 'prosas',
        editar: editarProsa,
        rastreador: rastreadorProsa,
        modal: 'modal-prosa',
        form: 'form-prosa',
        pref: 'pr',
        ids: { na10: [301, 302], dois: 401, outro: 402 },
    },
};

function dados(c) {
    db.livros = [
        { id: 1, titulo: 'Um', sequencia: 1, tipo: 'Inéditos', data: { ano: 2020 } },
        { id: 2, titulo: 'Dois', sequencia: 2, tipo: 'Inéditos' },
        { id: 3, titulo: 'Coletânea X', sequencia: 3, tipo: 'Coletânea' },
    ];
    db.partes = [{ id: 10, livroId: 1, titulo: 'Parte', sequencia: 1 }];
    db.secoes = [{ id: 22, paiTipo: 'livro', paiId: 2, titulo: 'Do Dois', sequencia: 1 }];
    db.elementos = [];
    db.itensColetanea = [];
    db.poemas = [];
    db.prosas = [];
    const [a, b] = c.ids.na10;
    const base = (id, extra) => ({
        id,
        titulo: `T${id}`,
        texto: 'x',
        status: 'completo',
        ...extra,
    });
    db[c.colecao] = [
        base(a, { paiTipo: 'parte', paiId: 10, sequencia: 1, livrosIds: [] }),
        base(b, { paiTipo: 'parte', paiId: 10, sequencia: 2, livrosIds: [] }),
        // Dois lugares com posição: o espelho mostra só o primeiro.
        base(c.ids.dois, {
            paiTipo: 'parte',
            paiId: 10,
            sequencia: 3,
            livrosIds: [],
            aparicoes: [
                { livroId: 1, parteId: 10, secaoId: null, sequencia: 3 },
                { livroId: 2, parteId: null, secaoId: 22, sequencia: 1 },
            ],
        }),
        base(c.ids.outro, { paiTipo: 'secao', paiId: 22, sequencia: 2, livrosIds: [] }),
    ];
}

for (const tipo of ['poema', 'prosa']) {
    const c = CONF[tipo];
    const $ = (sufixo) => document.getElementById(`${c.pref}-${sufixo}`);
    const linhas = () => Array.from($('onde-linhas').children);
    const campo = (i, classe) => linhas()[i].querySelector(`.${classe}`);
    const escolher = (i, classe, valor) => {
        const e = campo(i, classe);
        e.value = valor;
        e.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const adicionar = () => $('onde-add').click();
    const salvar = async () => {
        document.getElementById(c.form).requestSubmit();
        await esperar();
    };
    const texto = (id) => db[c.colecao].find((x) => x.id === id);
    const seq = (id) => texto(id).sequencia;

    describe(`Grupo Onde aparece (${tipo})`, () => {
        beforeEach(async () => {
            localStorage.clear();
            dados(c);
            c.rastreador.marcarLimpo();
            if (aberto(c.modal)) await toggleModal(c.modal);
        });

        it('texto novo: sem linha, com a mensagem de avulso', async () => {
            await prepararNovo(tipo);
            await esperar();
            assert.equal(linhas().length, 0);
            assert.equal($('onde-vazio').classList.contains('hidden'), false);
        });

        it('"+ Aparição" cria uma linha só com livros comuns; a mensagem some', async () => {
            await prepararNovo(tipo);
            await esperar();
            adicionar();
            assert.equal(linhas().length, 1);
            assert.equal($('onde-vazio').classList.contains('hidden'), true);
            const livros = Array.from(campo(0, 'ol-livro').options).map((o) => o.value);
            assert.deepEqual(livros, ['', '1', '2']);
        });

        it('escolher o livro mostra só a estrutura dele; sem lugar não há posição', async () => {
            await prepararNovo(tipo);
            await esperar();
            adicionar();
            escolher(0, 'ol-livro', '1');
            const lugares = Array.from(campo(0, 'ol-lugar').options).map((o) => o.value);
            assert.deepEqual(lugares, ['', 'livro:1', 'parte:10']);
            assert.equal(
                linhas()[0].querySelector('.ol-posicao').classList.contains('hidden'),
                true,
            );
            assert.match(campo(0, 'ol-dica').textContent, /sem lugar e sem posição/);
        });

        it('escolher o lugar mostra o modo "fim" com a dica da próxima posição', async () => {
            await prepararNovo(tipo);
            await esperar();
            adicionar();
            escolher(0, 'ol-livro', '1');
            escolher(0, 'ol-lugar', 'parte:10');
            assert.equal(campo(0, 'ol-modo').value, 'fim');
            assert.equal(campo(0, 'ol-seq').classList.contains('hidden'), true);
            // Há 3 textos na Parte (posições 1, 2 e 3): a próxima livre é 4.
            assert.match(campo(0, 'ol-dica').textContent, /posição 4/);
        });

        it('trocar para "específica" mostra o campo e o preenche com o fim', async () => {
            await prepararNovo(tipo);
            await esperar();
            adicionar();
            escolher(0, 'ol-livro', '1');
            escolher(0, 'ol-lugar', 'parte:10');
            escolher(0, 'ol-modo', 'especifica');
            assert.equal(campo(0, 'ol-seq').classList.contains('hidden'), false);
            assert.equal(campo(0, 'ol-seq').value, '4');
        });

        it('adicionar e tirar linha marca o formulário como alterado; abrir não', async () => {
            await c.editar(c.ids.dois);
            assert.equal(c.rastreador.estaSujo(), false);
            adicionar();
            assert.equal(c.rastreador.estaSujo(), true);
            c.rastreador.marcarLimpo();
            campo(2, 'ol-remover').click();
            assert.equal(c.rastreador.estaSujo(), true);
        });

        it('abrir um texto com duas aparições com posição mostra as duas linhas', async () => {
            await c.editar(c.ids.dois);
            assert.equal(linhas().length, 2);
            assert.equal(campo(0, 'ol-livro').value, '1');
            assert.equal(campo(0, 'ol-lugar').value, 'parte:10');
            assert.equal(campo(0, 'ol-modo').value, 'especifica');
            assert.equal(campo(0, 'ol-seq').value, '3');
            assert.equal(campo(1, 'ol-livro').value, '2');
            assert.equal(campo(1, 'ol-lugar').value, 'secao:22');
            assert.equal(campo(1, 'ol-seq').value, '1');
        });

        it('salvar um texto novo com duas aparições grava a lista, o espelho e empurra a fila', async () => {
            await prepararNovo(tipo);
            await esperar();
            $('titulo').value = 'Novo';
            adicionar();
            escolher(0, 'ol-livro', '1');
            escolher(0, 'ol-lugar', 'parte:10');
            escolher(0, 'ol-modo', 'especifica');
            campo(0, 'ol-seq').value = '1';
            adicionar();
            escolher(1, 'ol-livro', '2');
            await salvar();
            const novo = db[c.colecao].find((x) => x.titulo === 'Novo');
            assert.deepEqual(novo.aparicoes, [
                { livroId: 1, parteId: 10, secaoId: null, sequencia: 1 },
                { livroId: 2, parteId: null, secaoId: null, sequencia: null },
            ]);
            assert.equal(novo.paiTipo, 'parte');
            assert.equal(String(novo.paiId), '10');
            assert.equal(novo.sequencia, 1);
            assert.deepEqual(novo.livrosIds.map(String), ['2']);
            // Quem estava na posição 1 ou depois desceu uma casa.
            assert.deepEqual([...c.ids.na10, c.ids.dois].map(seq), [2, 3, 4]);
        });

        it('mudar a posição da aparição que o espelho não mostra renumera a fila dela', async () => {
            await c.editar(c.ids.dois);
            escolher(1, 'ol-seq', '2');
            await salvar();
            const t = texto(c.ids.dois);
            assert.equal(t.aparicoes[1].sequencia, 2);
            assert.equal(t.aparicoes[0].sequencia, 3);
            assert.equal(seq(c.ids.outro), 1);
        });

        it('tirar uma linha tira só aquela aparição e fecha o buraco da fila', async () => {
            await c.editar(c.ids.dois);
            campo(1, 'ol-remover').click();
            assert.equal(linhas().length, 1);
            await salvar();
            const t = texto(c.ids.dois);
            assert.equal(t.aparicoes.length, 1);
            assert.equal(t.aparicoes[0].parteId, 10);
            assert.equal(seq(c.ids.outro), 1);
        });

        it('mover a aparição para outro lugar fecha a fila de onde saiu', async () => {
            await c.editar(c.ids.na10[0]);
            escolher(0, 'ol-livro', '2');
            escolher(0, 'ol-lugar', 'secao:22');
            escolher(0, 'ol-modo', 'nenhuma');
            await salvar();
            assert.equal(seq(c.ids.na10[1]), 1);
            assert.equal(seq(c.ids.dois), 2);
            const t = texto(c.ids.na10[0]);
            assert.equal(t.paiTipo, 'secao');
            assert.equal(t.sequencia, null);
        });

        it('duas linhas do mesmo lugar: avisa e só a primeira vale', async () => {
            await c.editar(c.ids.na10[0]);
            adicionar();
            escolher(1, 'ol-livro', '1');
            escolher(1, 'ol-lugar', 'parte:10');
            assert.equal(
                linhas()[1].querySelector('.ol-repetida').classList.contains('hidden'),
                false,
            );
            assert.equal(
                linhas()[0].querySelector('.ol-repetida').classList.contains('hidden'),
                true,
            );
            await salvar();
            assert.equal(texto(c.ids.na10[0]).aparicoes.length, 1);
        });

        it('a data de publicação é sugerida só pelo livro da primeira linha', async () => {
            await prepararNovo(tipo);
            await esperar();
            adicionar();
            escolher(0, 'ol-livro', '2');
            assert.equal($('data-pub-ano').value, '');
            escolher(0, 'ol-livro', '1');
            assert.equal($('data-pub-ano').value, '2020');
        });

        it('texto sem linha nenhuma salva como avulso e fecha o lugar que deixa', async () => {
            await c.editar(c.ids.na10[0]);
            campo(0, 'ol-remover').click();
            await salvar();
            const t = texto(c.ids.na10[0]);
            assert.equal(t.paiTipo, null);
            assert.equal(t.sequencia, null);
            assert.deepEqual(t.aparicoes, []);
            assert.equal(seq(c.ids.na10[1]), 1);
        });
    });
}
