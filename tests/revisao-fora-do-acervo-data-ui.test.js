import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Modo revisão com as colunas "Data da obra" e "Até" (T9, entrega 7, parte 2):
// células de texto, forma canônica, recusa com a coluna e o motivo, e o filtro
// "Sem data da obra".

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const i = html.indexOf('<section id="conexoes"');
const f = html.indexOf('<section id="sonoridade"', i);
assert.ok(i !== -1 && f !== -1);
document.body.innerHTML = `<main>${html.slice(i, f)}</main>`;

const { db } = await import('../js/db.js');
const { renderConexoes } = await import('../js/render-conexoes.js');
const { toggleColuna, resetarColunas, getColunasAtivas } = await import('../js/colunas.js');
const { criarDataObra } = await import('../js/data-da-obra.js');
const { alternarModoRevisao, pedirRevisao, reiniciarRevisaoParaTestes, mensagemDeErroDaRevisao } =
    await import('../js/revisao-fora-do-acervo-ui.js');

const el = (id) => document.getElementById(id);
const tick = () => new Promise((r) => setTimeout(r, 0));
const confirmacaoAberta = () => {
    const c = el('modal-confirmar-exclusao');
    return Boolean(c) && c.style.display !== 'none';
};
const snapshotOk = async () => true;

const linhas = () => [...el('conexoes-revisao').querySelectorAll('[data-rev-linha]')];
const celula = (chave, valor) =>
    [...el('conexoes-revisao').querySelectorAll('[data-rev-valor]')].find(
        (c) => c.dataset.revChave === chave && c.dataset.revValor === valor,
    );
const cabecalhos = () =>
    [...el('conexoes-revisao').querySelectorAll('thead th')].map((t) =>
        t.textContent.replace(/🔍/g, '').trim(),
    );

function digitar(campo, valor) {
    campo.value = valor;
    campo.dispatchEvent(new window.Event('input', { bubbles: true }));
}

const ano = (n) => criarDataObra({ nivel: 'ano', ano: String(n) }).data;
const CHAVE = 'poema:1:intertextualidade:0';

function cenario() {
    Object.assign(db, {
        livros: [],
        partes: [],
        secoes: [],
        elementos: [],
        itensColetanea: [],
        poemas: [
            {
                id: 1,
                titulo: 'Águas',
                intertextualidade: [
                    {
                        relacao: 'Citação',
                        tipoObra: 'Música',
                        obra: 'Águas de Março',
                        autor: 'Tom Jobim',
                        dataObra: ano(1972),
                    },
                ],
            },
            {
                id: 2,
                titulo: 'Casmurro',
                intertextualidade: [
                    { relacao: 'Alusão', tipoObra: 'Livro', obra: 'Sagarana', autor: 'Rosa' },
                ],
                hipertextualidade: [
                    { relacao: 'Paródia', tipoObra: 'Livro', hipotexto: 'Dom Casmurro', autor: '' },
                ],
            },
        ],
        prosas: [],
    });
    reiniciarRevisaoParaTestes();
    resetarColunas('revisao-fora');
    document.getElementById('modal-confirmar-exclusao')?.remove();
    document.querySelectorAll('button').forEach((b) => {
        if (b.textContent === 'Desfazer') b.closest('div')?.remove();
    });
    renderConexoes();
}

async function confirmar() {
    const botao = el('excl-confirmar');
    assert.ok(botao, 'confirmação aberta');
    botao.onclick();
    await tick();
    await tick();
}

describe('Modo revisão: colunas de data', () => {
    beforeEach(() => {
        cenario();
        alternarModoRevisao(true);
        toggleColuna('revisao-fora', 'dataObra', true);
        toggleColuna('revisao-fora', 'dataObraAte', true);
    });

    it('as colunas vêm desligadas de fábrica e entram depois de Descrição', () => {
        resetarColunas('revisao-fora');
        assert.equal(getColunasAtivas('revisao-fora').includes('dataObra'), false);
        toggleColuna('revisao-fora', 'dataObra', true);
        toggleColuna('revisao-fora', 'dataObraAte', true);
        const h = cabecalhos();
        assert.ok(h.indexOf('Data da obra') > h.indexOf('Descrição'));
        assert.equal(h.indexOf('Até'), h.indexOf('Data da obra') + 1);
    });

    it('a célula mostra a data gravada em texto', () => {
        assert.equal(celula(CHAVE, 'dataObra').value, '1972');
        assert.equal(celula(CHAVE, 'dataObraAte').value, '');
    });

    it('digitar "séc. XX" e gravar guarda o século', async () => {
        digitar(celula(CHAVE, 'dataObra'), 'sec xx');
        pedirRevisao({ tirarSnapshot: snapshotOk });
        assert.equal(confirmacaoAberta(), true);
        await confirmar();
        const d = db.poemas[0].intertextualidade[0].dataObra;
        assert.equal(d.nivel, 'seculo');
        assert.equal(d.seculo, 20);
    });

    it('apagar o texto tira a data', async () => {
        digitar(celula(CHAVE, 'dataObra'), '');
        pedirRevisao({ tirarSnapshot: snapshotOk });
        await confirmar();
        assert.equal('dataObra' in db.poemas[0].intertextualidade[0], false);
    });

    it('preencher o "Até" grava só o fim', async () => {
        digitar(celula(CHAVE, 'dataObraAte'), '1980');
        pedirRevisao({ tirarSnapshot: snapshotOk });
        await confirmar();
        const e = db.poemas[0].intertextualidade[0];
        assert.equal(e.dataObra.ano, 1972);
        assert.equal(e.dataObraAte.ano, 1980);
    });

    it('texto que não dá para entender é recusado e nada é gravado', () => {
        digitar(celula(CHAVE, 'dataObra'), 'qualquer coisa');
        assert.equal(pedirRevisao({ tirarSnapshot: snapshotOk }), false);
        assert.equal(confirmacaoAberta(), false);
        assert.equal(db.poemas[0].intertextualidade[0].dataObra.ano, 1972);
    });

    it('"Até" antes do começo é recusado', () => {
        digitar(celula(CHAVE, 'dataObraAte'), '1900');
        assert.equal(pedirRevisao({ tirarSnapshot: snapshotOk }), false);
        assert.equal(confirmacaoAberta(), false);
    });

    it('o filtro "Sem data da obra" deixa só as linhas sem data', () => {
        const filtro = el('revisao-faltando');
        filtro.value = 'dataObra';
        filtro.dispatchEvent(new window.Event('change', { bubbles: true }));
        assert.deepEqual(
            linhas().map((l) => l.dataset.revLinha),
            ['poema:2:intertextualidade:0', 'poema:2:hipertextualidade:0'],
        );
    });

    it('a busca acha pelo texto da data', () => {
        digitar(el('revisao-busca'), '1972');
        assert.deepEqual(
            linhas().map((l) => l.dataset.revLinha),
            [CHAVE],
        );
    });
});

describe('mensagemDeErroDaRevisao', () => {
    it('data da obra inválida diz a coluna e o motivo', () => {
        const msg = mensagemDeErroDaRevisao({
            erro: 'data-obra-invalida',
            valorComErro: 'dataObraAte',
            erroData: 'decada-invalida',
        });
        assert.match(msg, /^Até: /);
        assert.match(msg, /década/i);
    });

    it('sem o motivo, cai na mensagem geral; os outros erros seguem a tabela', () => {
        assert.match(mensagemDeErroDaRevisao({ erro: 'data-obra-invalida' }), /datas da obra/i);
        assert.match(mensagemDeErroDaRevisao({ erro: 'nome-vazio' }), /sem nome/i);
        assert.equal(mensagemDeErroDaRevisao({ erro: '???' }), 'Não foi possível gravar.');
    });
});
