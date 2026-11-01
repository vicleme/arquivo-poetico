import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// "Corrigir obra" com o campo de data (T9, entrega 7, parte 2): o diálogo abre
// com o par mais usado, só a ponta mexida vai no pedido, data que não vale
// avisa e não segue, e a confirmação conta as datas que serão trocadas.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const i = html.indexOf('<section id="conexoes"');
const f = html.indexOf('<section id="sonoridade"', i);
assert.ok(i !== -1 && f !== -1);
document.body.innerHTML = `<main>${html.slice(i, f)}</main>`;

const { db } = await import('../js/db.js');
const { renderConexoes } = await import('../js/render-conexoes.js');
const { criarDataObra } = await import('../js/data-da-obra.js');
const { abrirCorrecaoObra, fecharDialogo, mensagemDeErroDaCorrecao } =
    await import('../js/corrigir-fora-do-acervo-ui.js');

const el = (id) => document.getElementById(id);
const tick = () => new Promise((r) => setTimeout(r, 0));
const confirmacaoAberta = () => {
    const c = el('modal-confirmar-exclusao');
    return Boolean(c) && c.style.display !== 'none';
};
const dialogoAberto = () => Boolean(el('modal-corrigir-fora-do-acervo'));
const snapshotOk = async () => true;

const ano = (n) => criarDataObra({ nivel: 'ano', ano: String(n) }).data;
const CHAVE = 'aguas de marco|tom jobim';

const campoDaData = (ponta, nome) =>
    document.querySelector(`#corrigir-fora-data [data-ponta="${ponta}"] [data-campo="${nome}"]`);

function mudar(campo, valor) {
    campo.value = valor;
    campo.dispatchEvent(new window.Event('change', { bubbles: true }));
}

function cenario(datas = [ano(1972), ano(1972)]) {
    const entrada = (dataObra) => ({
        relacao: 'Citação',
        tipoObra: 'Música',
        obra: 'Águas de Março',
        autor: 'Tom Jobim',
        ...(dataObra ? { dataObra } : {}),
    });
    Object.assign(db, {
        livros: [],
        partes: [],
        secoes: [],
        elementos: [],
        itensColetanea: [],
        poemas: [
            { id: 1, titulo: 'Águas', intertextualidade: [entrada(datas[0])] },
            { id: 2, titulo: 'Rio', intertextualidade: [entrada(datas[1])] },
        ],
        prosas: [],
    });
    fecharDialogo();
    document.getElementById('modal-confirmar-exclusao')?.remove();
    renderConexoes();
}

async function confirmar() {
    const botao = el('excl-confirmar');
    assert.ok(botao, 'confirmação aberta');
    botao.onclick();
    await tick();
    await tick();
}

const revisar = () => document.querySelector('[data-corrigir="revisar"]').click();

describe('Corrigir obra: campo de data', () => {
    beforeEach(() => cenario());

    it('abre com a data que a obra já tem nos textos', () => {
        assert.equal(abrirCorrecaoObra(CHAVE), true);
        assert.equal(campoDaData('inicio', 'nivel').value, 'ano');
        assert.equal(campoDaData('inicio', 'numero').value, '1972');
        assert.equal(campoDaData('fim', 'nivel').value, '');
    });

    it('sem mexer na data, o pedido não leva data (só o que foi mexido)', async () => {
        abrirCorrecaoObra(CHAVE, { tirarSnapshot: snapshotOk });
        el('corrigir-fora-descricao').value = 'Canção de 1972';
        revisar();
        assert.equal(confirmacaoAberta(), true);
        assert.doesNotMatch(el('excl-mensagem').textContent, /data nova/i);
        await confirmar();
        assert.equal(db.poemas[0].intertextualidade[0].descricao, 'Canção de 1972');
        assert.equal(db.poemas[0].intertextualidade[0].dataObra.ano, 1972);
        assert.equal(db.poemas[1].intertextualidade[0].dataObra.ano, 1972);
    });

    it('mudar o ano troca a data em todos os textos e a confirmação avisa', async () => {
        abrirCorrecaoObra(CHAVE, { tirarSnapshot: snapshotOk });
        const numero = campoDaData('inicio', 'numero');
        numero.value = '1973';
        numero.dispatchEvent(new window.Event('input', { bubbles: true }));
        revisar();
        assert.equal(confirmacaoAberta(), true);
        assert.match(el('excl-mensagem').textContent, /data nova substitui/i);
        await confirmar();
        assert.equal(db.poemas[0].intertextualidade[0].dataObra.ano, 1973);
        assert.equal(db.poemas[1].intertextualidade[0].dataObra.ano, 1973);
        assert.equal(dialogoAberto(), false);
    });

    it('"Sem data" no começo apaga a data de todos os textos', async () => {
        abrirCorrecaoObra(CHAVE, { tirarSnapshot: snapshotOk });
        mudar(campoDaData('inicio', 'nivel'), '');
        revisar();
        await confirmar();
        assert.equal('dataObra' in db.poemas[0].intertextualidade[0], false);
        assert.equal('dataObra' in db.poemas[1].intertextualidade[0], false);
    });

    it('um fim novo vale para todos e não mexe no começo', async () => {
        abrirCorrecaoObra(CHAVE, { tirarSnapshot: snapshotOk });
        mudar(campoDaData('fim', 'nivel'), 'ano');
        const numero = campoDaData('fim', 'numero');
        numero.value = '1980';
        numero.dispatchEvent(new window.Event('input', { bubbles: true }));
        revisar();
        await confirmar();
        const e = db.poemas[1].intertextualidade[0];
        assert.equal(e.dataObra.ano, 1972);
        assert.equal(e.dataObraAte.ano, 1980);
    });

    it('data incompleta avisa e não abre a confirmação', () => {
        abrirCorrecaoObra(CHAVE);
        campoDaData('inicio', 'numero').value = '';
        revisar();
        assert.equal(confirmacaoAberta(), false);
        assert.equal(dialogoAberto(), true);
    });

    it('fim antes do começo avisa e não abre a confirmação', () => {
        abrirCorrecaoObra(CHAVE);
        mudar(campoDaData('fim', 'nivel'), 'ano');
        campoDaData('fim', 'numero').value = '1900';
        revisar();
        assert.equal(confirmacaoAberta(), false);
        assert.equal(dialogoAberto(), true);
    });
});

describe('Corrigir obra: obra com duas datas diferentes', () => {
    beforeEach(() => cenario([ano(1972), ano(1973)]));

    it('abre com a mais usada (no empate, a mais antiga) e oferece as outras', () => {
        abrirCorrecaoObra(CHAVE);
        assert.equal(campoDaData('inicio', 'numero').value, '1972');
        const botoes = [...document.querySelectorAll('#corrigir-fora-data [data-sugestao]')];
        assert.equal(botoes.length, 1);
        assert.match(botoes[0].textContent, /1973/);
    });

    it('mexer só no nome não iguala as datas de ninguém', async () => {
        abrirCorrecaoObra(CHAVE, { tirarSnapshot: snapshotOk });
        el('corrigir-fora-obra').value = 'Águas de Março (canção)';
        revisar();
        await confirmar();
        assert.equal(db.poemas[0].intertextualidade[0].dataObra.ano, 1972);
        assert.equal(db.poemas[1].intertextualidade[0].dataObra.ano, 1973);
    });

    it('escolher a sugestão iguala a data nos dois textos', async () => {
        abrirCorrecaoObra(CHAVE, { tirarSnapshot: snapshotOk });
        document.querySelector('#corrigir-fora-data [data-sugestao]').click();
        revisar();
        assert.match(el('excl-mensagem').textContent, /data nova substitui/i);
        await confirmar();
        assert.equal(db.poemas[0].intertextualidade[0].dataObra.ano, 1973);
        assert.equal(db.poemas[1].intertextualidade[0].dataObra.ano, 1973);
    });
});

describe('mensagemDeErroDaCorrecao', () => {
    it('data que não vale diz o motivo; os outros erros usam a tabela', () => {
        assert.match(
            mensagemDeErroDaCorrecao({ erro: 'data-invalida', erroData: 'ano-invalido' }),
            /ano/i,
        );
        assert.equal(mensagemDeErroDaCorrecao({ erro: 'nome-vazio' }), 'Escreva o nome da obra.');
        assert.equal(mensagemDeErroDaCorrecao({ erro: '???' }), 'Não foi possível corrigir.');
    });
});
