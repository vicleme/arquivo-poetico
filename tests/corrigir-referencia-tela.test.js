import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Corrigir referência (entrega 2 de 2): o botão na lista de Referências, o
// diálogo (Nome, Tipo, Data), a confirmação com os avisos e o Desfazer.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const i = html.indexOf('<section id="conexoes"');
const f = html.indexOf('<section id="sonoridade"', i);
assert.ok(i !== -1 && f !== -1);
document.body.innerHTML = `<main>${html.slice(i, f)}</main>`;

const { db } = await import('../js/db.js');
const { criarDataObra } = await import('../js/data-da-obra.js');
const { renderConexoes } = await import('../js/render-conexoes.js');
const { abrirCorrecaoReferencia, fecharDialogo } =
    await import('../js/corrigir-fora-do-acervo-ui.js');

const el = (id) => document.getElementById(id);
const tick = () => new Promise((r) => setTimeout(r, 0));
const snapshotOk = async () => true;
const PP = 'Pessoa pública';
const CHAVE = 'pessoa publica|karl marx';
const ano = (n) => criarDataObra({ nivel: 'ano', ano: n }).data;

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
                titulo: 'Capital',
                referenciasExternas: [
                    {
                        tipo: PP,
                        texto: 'Karl Marx',
                        dataObra: ano(1818),
                        conhecidoComo: ['Filósofo(a)'],
                        genero: 'Homem',
                        nota: 'fica',
                    },
                ],
            },
            {
                id: 2,
                titulo: 'Greve',
                referenciasExternas: [{ tipo: 'Notícia', texto: 'Karl Marx' }],
            },
        ],
        prosas: [
            {
                id: 7,
                titulo: 'Conto',
                referenciasExternas: [{ tipo: PP, texto: 'Karl Marx', genero: 'Homem' }],
            },
        ],
    });
}

const entradas = () => [db.poemas[0].referenciasExternas[0], db.prosas[0].referenciasExternas[0]];
const confirmacao = () => {
    const c = el('modal-confirmar-exclusao');
    return c && c.style.display !== 'none' ? c : null;
};
const confirmar = async () => {
    el('modal-confirmar-exclusao')
        .querySelector('#btn-confirmar-exclusao, [data-confirmar], button:last-of-type')
        ?.click();
    await tick();
    await tick();
};
const revisar = () => document.querySelector('[data-corrigir="revisar"]').click();

describe('Corrigir referência: botão e diálogo', () => {
    beforeEach(() => {
        cenario();
        renderConexoes();
    });

    it('cada referência da lista ganha o botão Corrigir referência', () => {
        const botao = document.querySelector(
            `[data-action="corrigir-referencia-fora"][data-chave="${CHAVE}"]`,
        );
        assert.ok(botao);
        assert.match(botao.textContent, /Corrigir referência/);
    });

    it('abre com o nome e o tipo da referência e com o campo de data', () => {
        abrirCorrecaoReferencia(CHAVE, { tirarSnapshot: snapshotOk });
        assert.equal(el('corrigir-fora-referencia-texto').value, 'Karl Marx');
        assert.equal(el('corrigir-fora-referencia-tipo').value, PP);
        assert.ok(el('corrigir-fora-data'));
        assert.match(
            el('modal-corrigir-fora-do-acervo').textContent,
            /Corrigir referência: Karl Marx/,
        );
        fecharDialogo();
    });

    it('chave que não existe não abre diálogo', () => {
        assert.equal(abrirCorrecaoReferencia('nada|nada'), false);
        assert.equal(el('modal-corrigir-fora-do-acervo'), null);
    });

    it('revisar sem mexer em nada não abre confirmação', () => {
        abrirCorrecaoReferencia(CHAVE, { tirarSnapshot: snapshotOk });
        revisar();
        assert.equal(confirmacao(), null);
        fecharDialogo();
    });

    it('renomear vale para todos os textos e não mexe na nota nem na caracterização', async () => {
        abrirCorrecaoReferencia(CHAVE, { tirarSnapshot: snapshotOk });
        el('corrigir-fora-referencia-texto').value = 'Karl Heinrich Marx';
        revisar();
        assert.match(
            confirmacao().textContent,
            /«Karl Marx» \(Pessoa pública\) → «Karl Heinrich Marx»/,
        );
        await confirmar();
        entradas().forEach((e) => assert.equal(e.texto, 'Karl Heinrich Marx'));
        assert.equal(db.poemas[0].referenciasExternas[0].nota, 'fica');
        assert.deepEqual(db.poemas[0].referenciasExternas[0].conhecidoComo, ['Filósofo(a)']);
        assert.equal(db.prosas[0].referenciasExternas[0].genero, 'Homem');
        // A Notícia de mesmo texto tem outra chave e não é tocada.
        assert.equal(db.poemas[1].referenciasExternas[0].texto, 'Karl Marx');
    });

    it('trocar o tipo avisa a junção e a Pessoa pública perdida, e o Desfazer devolve', async () => {
        abrirCorrecaoReferencia(CHAVE, { tirarSnapshot: snapshotOk });
        el('corrigir-fora-referencia-tipo').value = 'Notícia';
        revisar();
        const msg = confirmacao().textContent;
        assert.match(msg, /Já há 1 texto com o resultado/);
        assert.match(msg, /O tipo muda em 2 entradas/);
        assert.match(msg, /Deixar de ser Pessoa pública apaga .* de 2 entradas/);
        await confirmar();
        entradas().forEach((e) => {
            assert.equal(e.tipo, 'Notícia');
            assert.equal('genero' in e, false);
        });
        assert.equal('conhecidoComo' in db.poemas[0].referenciasExternas[0], false);
        assert.equal(db.poemas[0].referenciasExternas[0].nota, 'fica');

        // O aviso de um teste anterior pode ainda estar na tela: vale o último.
        const desfazer = [...document.querySelectorAll('button')]
            .filter((b) => b.textContent.trim() === 'Desfazer')
            .at(-1);
        assert.ok(desfazer);
        desfazer.click();
        entradas().forEach((e) => assert.equal(e.tipo, PP));
        assert.equal(db.prosas[0].referenciasExternas[0].genero, 'Homem');
        assert.deepEqual(db.poemas[0].referenciasExternas[0].conhecidoComo, ['Filósofo(a)']);
    });

    it('nome vazio recusa com aviso e não abre confirmação', () => {
        abrirCorrecaoReferencia(CHAVE, { tirarSnapshot: snapshotOk });
        el('corrigir-fora-referencia-texto').value = '   ';
        revisar();
        assert.equal(confirmacao(), null);
        fecharDialogo();
    });
});
