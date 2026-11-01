import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Barra "Editar em massa" do Modo revisão: controles, contagem do filtro,
// confirmação, backup antes de gravar, Desfazer e o bloqueio com edição pendente.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const i = html.indexOf('<section id="conexoes"');
const f = html.indexOf('<section id="sonoridade"', i);
assert.ok(i !== -1 && f !== -1);
document.body.innerHTML = `<main>${html.slice(i, f)}</main>`;

const { db } = await import('../js/db.js');
const { renderConexoes } = await import('../js/render-conexoes.js');
const { resetarColunas } = await import('../js/colunas.js');
const { alternarModoRevisao, aplicarMassaDaBarra, reiniciarRevisaoParaTestes } =
    await import('../js/revisao-fora-do-acervo-ui.js');

const el = (id) => document.getElementById(id);
const tick = () => new Promise((r) => setTimeout(r, 0));
const confirmacaoAberta = () => {
    const c = el('modal-confirmar-exclusao');
    return Boolean(c) && c.style.display !== 'none';
};
const snapshotOk = async () => true;
const snapshotFalha = async () => false;

const celula = (chave, valor) =>
    [...el('conexoes-revisao').querySelectorAll('[data-rev-valor]')].find(
        (c) => c.dataset.revChave === chave && c.dataset.revValor === valor,
    );

function digitar(campo, valor) {
    campo.value = valor;
    campo.dispatchEvent(new window.Event('input', { bubbles: true }));
}

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
                        obra: 'Águas de Março, de Tom Jobim',
                        autor: '',
                        trecho: 'é pau, é pedra',
                    },
                ],
            },
            {
                id: 2,
                titulo: 'Casmurro',
                intertextualidade: [
                    {
                        relacao: 'Alusão',
                        tipoObra: 'Livro',
                        obra: 'Sagarana',
                        autor: 'Guimarães Rosa',
                    },
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

const barra = () => el('revisao-massa');
const escolher = (id, valor) => {
    const s = el(id);
    s.value = valor;
    s.dispatchEvent(new window.Event('change', { bubbles: true }));
};
const botaoMassa = () => el('revisao-massa-aplicar');
const botaoDesfazer = () =>
    [...document.querySelectorAll('button')].find((b) => b.textContent === 'Desfazer');
const entradaDe = (obra) =>
    db.poemas
        .flatMap((p) => [...(p.intertextualidade || []), ...(p.hipertextualidade || [])])
        .find((e) => (e.obra || e.hipotexto) === obra);

describe('barra de edição em massa', () => {
    beforeEach(() => {
        cenario();
        alternarModoRevisao(true);
    });

    it('nasce fechada, com a contagem de todas as linhas', () => {
        assert.ok(barra());
        assert.equal(barra().open, false);
        assert.equal(botaoMassa().textContent.trim(), 'Aplicar às 3 linhas do filtro');
    });

    it('a contagem acompanha a busca e o botão desliga sem linhas', () => {
        digitar(el('revisao-busca'), 'Sagarana');
        assert.equal(botaoMassa().textContent.trim(), 'Aplicar à 1 linha do filtro');
    });

    it('os modos mudam com o campo e personagem não tem "Trocar tudo"', () => {
        const modos = () => [...el('revisao-massa-modo').options].map((o) => o.value);
        assert.deepEqual(modos(), ['adicionar', 'substituir', 'remover', 'limpar']);
        escolher('revisao-massa-campo', 'personagem');
        assert.deepEqual(modos(), ['adicionar', 'remover', 'limpar']);
        escolher('revisao-massa-campo', 'obraPessoal');
        assert.deepEqual(modos(), ['marcar', 'desmarcar']);
        assert.equal(el('revisao-massa-valor-caixa').classList.contains('hidden'), true);
        escolher('revisao-massa-campo', 'tipoObra');
        assert.deepEqual(modos(), ['definir', 'tirar']);
        assert.equal(el('revisao-massa-valor-caixa').classList.contains('hidden'), false);
        assert.equal(el('revisao-massa-valor').getAttribute('list'), 'rev-dl-tipo');
    });

    it('adicionar origem às linhas do filtro: confirma, grava e o Desfazer devolve', async () => {
        digitar(el('revisao-busca'), 'Livro');
        digitar(el('revisao-massa-valor'), 'Brasil; Portugal');
        assert.equal(aplicarMassaDaBarra({ tirarSnapshot: snapshotOk }), true);
        assert.equal(confirmacaoAberta(), true);
        assert.equal(
            'origemObra' in entradaDe('Sagarana'),
            false,
            'nada gravado antes de confirmar',
        );
        const texto = el('modal-confirmar-exclusao').textContent;
        assert.match(texto, /2 linhas no filtro/);
        assert.match(texto, /adicionar origem «Brasil» e «Portugal»/);
        await confirmar();
        assert.deepEqual(entradaDe('Sagarana').origemObra, ['Brasil', 'Portugal']);
        assert.deepEqual(entradaDe('Dom Casmurro').origemObra, ['Brasil', 'Portugal']);
        assert.equal('origemObra' in entradaDe('Águas de Março, de Tom Jobim'), false);
        assert.ok(botaoDesfazer(), 'aviso com Desfazer');
        botaoDesfazer().click();
        assert.equal('origemObra' in entradaDe('Sagarana'), false);
        assert.equal('origemObra' in entradaDe('Dom Casmurro'), false);
    });

    it('valor em branco avisa e não abre a confirmação', () => {
        assert.equal(aplicarMassaDaBarra({ tirarSnapshot: snapshotOk }), false);
        assert.equal(confirmacaoAberta(), false);
    });

    it('sem backup, nada é alterado', async () => {
        digitar(el('revisao-massa-valor'), 'Grécia');
        aplicarMassaDaBarra({ tirarSnapshot: snapshotFalha });
        await confirmar();
        assert.equal('origemObra' in entradaDe('Sagarana'), false);
        assert.equal(botaoDesfazer(), undefined);
    });

    it('com linhas alteradas e não gravadas, pede para gravar ou descartar antes', () => {
        const chave = [...el('conexoes-revisao').querySelectorAll('[data-rev-linha]')][0].dataset
            .revLinha;
        digitar(celula(chave, 'nome'), 'Outro nome');
        digitar(el('revisao-massa-valor'), 'Grécia');
        assert.equal(aplicarMassaDaBarra({ tirarSnapshot: snapshotOk }), false);
        assert.equal(confirmacaoAberta(), false);
    });

    it('obra pessoal em massa e tipo de obra "tirar o valor"', async () => {
        escolher('revisao-massa-campo', 'obraPessoal');
        aplicarMassaDaBarra({ tirarSnapshot: snapshotOk });
        await confirmar();
        assert.equal(entradaDe('Sagarana').obraPessoal, true);
        assert.equal(entradaDe('Dom Casmurro').obraPessoal, true);

        escolher('revisao-massa-campo', 'tipoObra');
        escolher('revisao-massa-modo', 'tirar');
        aplicarMassaDaBarra({ tirarSnapshot: snapshotOk });
        await confirmar();
        assert.equal(entradaDe('Sagarana').tipoObra, '');
    });

    it('traduzido só em Hipertextualidade avisa que nenhuma linha tem o campo', () => {
        escolher('revisao-campo', 'hipertextualidade');
        escolher('revisao-massa-campo', 'traduzido');
        assert.equal(aplicarMassaDaBarra({ tirarSnapshot: snapshotOk }), false);
        assert.equal(confirmacaoAberta(), false);
    });
});

const caixas = () => [...el('conexoes-revisao').querySelectorAll('[data-rev-sel]')];
function marcarCaixa(caixa, marcado) {
    caixa.checked = marcado;
    caixa.dispatchEvent(new window.Event('change', { bubbles: true }));
}

describe('seleção de linhas para a edição em massa', () => {
    beforeEach(() => {
        cenario();
        alternarModoRevisao(true);
    });

    it('cada linha tem uma caixinha e o cabeçalho tem a de marcar todas', () => {
        assert.equal(caixas().length, 3);
        assert.ok(el('revisao-sel-todas'));
        assert.equal(el('revisao-sel-todas').checked, false);
    });

    it('marcar uma linha muda o botão e a edição vale só para ela', async () => {
        const chave = caixas()[0].dataset.revSel;
        marcarCaixa(caixas()[0], true);
        assert.equal(botaoMassa().textContent.trim(), 'Aplicar à 1 selecionada');
        assert.equal(el('revisao-sel-todas').indeterminate, true);
        digitar(el('revisao-massa-valor'), 'Grécia');
        aplicarMassaDaBarra({ tirarSnapshot: snapshotOk });
        assert.match(el('modal-confirmar-exclusao').textContent, /1 linha selecionada/);
        await confirmar();
        const comOrigem = db.poemas
            .flatMap((p) => [...(p.intertextualidade || []), ...(p.hipertextualidade || [])])
            .filter((e) => 'origemObra' in e);
        assert.equal(comOrigem.length, 1);
        assert.ok(chave);
    });

    it('a caixinha do cabeçalho marca e desmarca todas as linhas do filtro', () => {
        marcarCaixa(el('revisao-sel-todas'), true);
        assert.equal(
            caixas().every((c) => c.checked),
            true,
        );
        assert.equal(botaoMassa().textContent.trim(), 'Aplicar às 3 selecionadas');
        marcarCaixa(el('revisao-sel-todas'), false);
        assert.equal(
            caixas().some((c) => c.checked),
            false,
        );
        assert.equal(botaoMassa().textContent.trim(), 'Aplicar às 3 linhas do filtro');
    });

    it('mudar o filtro solta as marcadas que saíram dele', () => {
        marcarCaixa(el('revisao-sel-todas'), true);
        digitar(el('revisao-busca'), 'Sagarana');
        assert.equal(botaoMassa().textContent.trim(), 'Aplicar à 1 selecionada');
        digitar(el('revisao-busca'), '');
        assert.equal(botaoMassa().textContent.trim(), 'Aplicar à 1 selecionada');
        assert.equal(caixas().filter((c) => c.checked).length, 1);
    });

    it('sem nenhuma marcada, volta a valer para todas as linhas do filtro', async () => {
        marcarCaixa(caixas()[0], true);
        marcarCaixa(caixas()[0], false);
        digitar(el('revisao-massa-valor'), 'Grécia');
        aplicarMassaDaBarra({ tirarSnapshot: snapshotOk });
        assert.match(el('modal-confirmar-exclusao').textContent, /3 linhas no filtro/);
        await confirmar();
    });
});

describe('busca por campo na tela', () => {
    beforeEach(() => {
        cenario();
        alternarModoRevisao(true);
    });

    const lupas = () => [...el('conexoes-revisao').querySelectorAll('[data-rev-acao="lupa"]')];

    it('o cabeçalho tem a lupa do Texto e das colunas com prefixo', () => {
        const prefixos = lupas().map((b) => b.dataset.revPrefixo);
        assert.equal(prefixos[0], 'texto');
        assert.ok(prefixos.length > 1);
        assert.equal(prefixos.includes('campo'), false);
    });

    it('clicar na lupa põe o prefixo na busca e não filtra nada ainda', () => {
        lupas()[0].click();
        assert.equal(el('revisao-busca').value, 'texto:');
        assert.equal(botaoMassa().textContent.trim(), 'Aplicar às 3 linhas do filtro');
        lupas()[1].click();
        assert.match(el('revisao-busca').value, /^texto: \w+:$/);
    });

    it('buscar com campo:valor filtra e a contagem da barra acompanha', () => {
        digitar(el('revisao-busca'), 'tipo:Livro');
        assert.equal(botaoMassa().textContent.trim(), 'Aplicar às 2 linhas do filtro');
        digitar(el('revisao-busca'), '-tipo:Livro');
        assert.equal(botaoMassa().textContent.trim(), 'Aplicar à 1 linha do filtro');
    });

    it('a ajuda da busca lista os prefixos', () => {
        const ajuda = el('revisao-ajuda-busca');
        assert.ok(ajuda);
        assert.equal(ajuda.open, false);
        assert.match(ajuda.textContent, /origem:/);
        assert.match(ajuda.textContent, /-origem:\*/);
    });
});

describe('sugestões na busca do Modo revisão', () => {
    beforeEach(() => {
        cenario();
        alternarModoRevisao(true);
    });

    const lista = () => el('revisao-sugestoes');
    const itens = () => [...lista().querySelectorAll('[data-indice]')].map((i) => i.textContent);
    const teclar = (key) =>
        el('revisao-busca').dispatchEvent(
            new window.KeyboardEvent('keydown', { key, bubbles: true }),
        );

    it('a caixinha começa fechada e abre com o começo de um prefixo', () => {
        assert.equal(lista().classList.contains('hidden'), true);
        digitar(el('revisao-busca'), 'or');
        assert.equal(lista().classList.contains('hidden'), false);
        assert.match(itens()[0], /^origem:/);
    });

    it('Enter aplica a sugestão, filtra a tabela e já oferece os valores', () => {
        digitar(el('revisao-busca'), 'ti');
        teclar('Enter');
        assert.equal(el('revisao-busca').value, 'tipo:');
        assert.equal(lista().classList.contains('hidden'), false);
        assert.equal(itens()[0].startsWith('*'), true);
        teclar('ArrowDown');
        teclar('Enter');
        assert.match(el('revisao-busca').value, /^tipo:\S+ $/);
    });

    it('Esc fecha, e o clique do mouse aplica', () => {
        digitar(el('revisao-busca'), 'or');
        teclar('Escape');
        assert.equal(lista().classList.contains('hidden'), true);
        digitar(el('revisao-busca'), 'or');
        lista()
            .querySelector('[data-indice="0"]')
            .dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        assert.equal(el('revisao-busca').value, 'origem:');
    });

    it('a lupa do cabeçalho já abre os valores da coluna', () => {
        const lupa = [...el('conexoes-revisao').querySelectorAll('[data-rev-acao="lupa"]')][0];
        lupa.click();
        assert.equal(lista().classList.contains('hidden'), false);
        assert.equal(itens()[0].startsWith('*'), true);
    });
});

describe('alinhamento da barra de edição em massa', () => {
    beforeEach(() => {
        cenario();
        alternarModoRevisao(true);
    });

    it('a dica fica fora da coluna do Valor e some quando não há valor a digitar', () => {
        const dica = el('revisao-massa-dica');
        assert.equal(el('revisao-massa-valor-caixa').contains(dica), false);
        assert.equal(dica.classList.contains('hidden'), false);
        escolher('revisao-massa-campo', 'obraPessoal');
        assert.equal(dica.classList.contains('hidden'), true);
    });

    it('os controles têm a mesma altura', () => {
        for (const id of ['revisao-massa-campo', 'revisao-massa-modo', 'revisao-massa-valor']) {
            assert.ok(el(id).classList.contains('h-9'), id);
        }
        assert.ok(botaoMassa().classList.contains('h-9'));
    });
});
