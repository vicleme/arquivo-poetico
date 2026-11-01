import './helpers/dom-real.js';

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Aba Livros: seleção por caixinha, barra de download e Baixar com escopo
// (Fase 19, etapa 7, entrega 3).

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const trecho = (inicio, fim) => {
    const i = html.indexOf(inicio);
    const f = html.indexOf(fim, i);
    assert.ok(i !== -1 && f !== -1, `trecho ${inicio} não achado`);
    return html.slice(i, f);
};

// A seção Livros do index.html de verdade, até a lista de cards.
document.body.innerHTML = `<main>${trecho('<section id="livros"', 'id="lista-livros"')}id="lista-livros"></div></section></main><div id="modais-container"></div>`;

const { db } = await import('../js/db.js');
const { renderLivros, setBuscaLivros, limparFiltrosLivros } =
    await import('../js/render-listas.js');
const {
    alternarModoSelecaoLivros,
    baixarLivrosDaAba,
    modoSelecaoLivrosAtivo,
    limparSelecaoLivros,
    marcarTodosLivros,
    selecaoLivros,
    toggleSelecaoLivro,
} = await import('../js/selecao-livros-aba.js');

const CHAVE = 'arquivoPoetico_formatoSelecao_livros';
const el = (id) => document.getElementById(id);
const cards = () => Array.from(document.querySelectorAll('#lista-livros [data-livro-card]'));
const caixas = () => Array.from(document.querySelectorAll('#lista-livros input[data-id]'));
const opcao = (v) => el('livros-baixar-escopo').querySelector(`option[value="${v}"]`);

let downloads;
let criarOriginal;
let urlOriginal;
let revogarOriginal;

function capturarDownloads() {
    downloads = [];
    criarOriginal = document.createElement;
    urlOriginal = globalThis.URL.createObjectURL;
    revogarOriginal = globalThis.URL.revokeObjectURL;
    const porUrl = new Map();
    globalThis.URL.createObjectURL = (blob) => {
        const url = `blob:aba-${porUrl.size}`;
        porUrl.set(url, blob);
        return url;
    };
    globalThis.URL.revokeObjectURL = () => {};
    document.createElement = (tag) => {
        const e = criarOriginal.call(document, tag);
        if (tag !== 'a') return e;
        const clicar = e.click.bind(e);
        e.click = () => {
            downloads.push({ nome: e.download, blob: porUrl.get(e.href) });
            clicar();
        };
        return e;
    };
}
const texto = async (blob) => Buffer.from(await blob.arrayBuffer()).toString('utf-8');

function dados() {
    localStorage.clear();
    db.livros = [
        { id: 1, titulo: 'Água Viva', tipo: 'Inéditos', sequencia: 1 },
        { id: 2, titulo: 'Poemas Reunidos', tipo: 'Coletânea', sequencia: 2 },
        { id: 3, titulo: 'Rascunhos', tipo: 'Inéditos', sequencia: 3 },
        { id: 4, titulo: 'Segunda Água', tipo: 'Inéditos', sequencia: 4 },
    ];
    db.autores = [];
    db.colaboradores = [];
    db.partes = [];
    db.secoes = [];
    db.elementos = [];
    db.poemas = [];
    db.prosas = [];
    db.itensColetanea = [];
    limparFiltrosLivros();
    if (modoSelecaoLivrosAtivo()) alternarModoSelecaoLivros();
    selecaoLivros.clear();
    el('livros-baixar-escopo').value = 'filtrados';
}

describe('aba Livros: controles de download', () => {
    beforeEach(dados);

    it('o markup tem escopo, formato, Baixar, Selecionar e a barra, sem onclick inline novo', () => {
        const topo = trecho('<section id="livros"', 'id="lista-livros"');
        for (const id of [
            'livros-baixar-escopo',
            'livros-baixar-formato',
            'livros-baixar',
            'livros-modo-selecao',
            'livros-selecao-barra',
        ]) {
            assert.ok(topo.includes(`id="${id}"`), id);
        }
        for (const acao of ['baixar-livros', 'alternar-modo-selecao-livros']) {
            assert.ok(topo.includes(`data-action="${acao}"`), acao);
        }
    });

    it('formatos na mesma ordem do Ver, e "Só selecionados" começa escondido', () => {
        const valores = Array.from(el('livros-baixar-formato').options).map((o) => o.value);
        assert.deepEqual(valores, ['json', 'csv', 'md', 'pdf', 'docx']);
        renderLivros();
        assert.equal(opcao('selecao').hidden, true);
        assert.equal(opcao('selecao').disabled, true);
    });

    it('os rótulos do escopo levam a contagem e acompanham o filtro', () => {
        renderLivros();
        assert.match(opcao('filtrados').textContent, /\(4\)/);
        assert.match(opcao('tudo').textContent, /\(4\)/);
        setBuscaLivros('água');
        assert.match(opcao('filtrados').textContent, /\(2\)/);
        assert.match(opcao('tudo').textContent, /\(4\)/);
    });

    it('o select de formato abre no formato lembrado e guarda a troca', () => {
        localStorage.setItem(CHAVE, 'md');
        renderLivros();
        assert.equal(el('livros-baixar-formato').value, 'md');
        el('livros-baixar-formato').value = 'csv';
        el('livros-baixar-formato').onchange();
        assert.equal(localStorage.getItem(CHAVE), 'csv');
    });
});

describe('aba Livros: seleção por caixinha', () => {
    beforeEach(dados);

    it('sem o modo ligado não há caixinha nem barra', () => {
        renderLivros();
        assert.equal(caixas().length, 0);
        assert.equal(el('livros-selecao-barra').classList.contains('hidden'), true);
    });

    it('Selecionar liga o modo: caixinha em cada card, barra e botão pressionado', () => {
        renderLivros();
        alternarModoSelecaoLivros();
        assert.equal(caixas().length, 4);
        assert.equal(el('livros-selecao-barra').classList.contains('hidden'), false);
        assert.equal(el('livros-modo-selecao').getAttribute('aria-pressed'), 'true');
        assert.match(el('livros-selecao-contagem').textContent, /Nada selecionado/);
    });

    it('marcar põe o anel e a contagem sem redesenhar, e passa o escopo para "Só selecionados"', () => {
        renderLivros();
        alternarModoSelecaoLivros();
        const antes = cards()[1];
        toggleSelecaoLivro(2, true);
        assert.equal(cards()[1], antes, 'o card não foi redesenhado');
        assert.ok(antes.classList.contains('ring-2'));
        assert.equal(caixas()[1].checked, true);
        assert.match(el('livros-selecao-contagem').textContent, /1 livro selecionado/);
        assert.equal(opcao('selecao').hidden, false);
        assert.equal(el('livros-baixar-escopo').value, 'selecao');
        assert.match(opcao('selecao').textContent, /\(1\)/);
    });

    it('desmarcar o último volta o escopo para o padrão e esconde a opção', () => {
        renderLivros();
        alternarModoSelecaoLivros();
        toggleSelecaoLivro(2, true);
        toggleSelecaoLivro(2, false);
        assert.equal(el('livros-baixar-escopo').value, 'filtrados');
        assert.equal(opcao('selecao').hidden, true);
    });

    it('shift marca o intervalo entre o último clicado e este', () => {
        renderLivros();
        alternarModoSelecaoLivros();
        toggleSelecaoLivro(1, true);
        toggleSelecaoLivro(3, true, true);
        assert.deepEqual([...selecaoLivros].sort(), [1, 2, 3]);
    });

    it('Marcar os que a tela mostra respeita a busca; Limpar zera', () => {
        renderLivros();
        alternarModoSelecaoLivros();
        setBuscaLivros('água');
        marcarTodosLivros();
        assert.deepEqual([...selecaoLivros].sort(), [1, 4]);
        limparSelecaoLivros();
        assert.equal(selecaoLivros.size, 0);
        assert.equal(
            caixas().every((c) => !c.checked),
            true,
        );
    });

    it('a seleção sobrevive ao filtro e ao redesenho, e as marcas voltam', () => {
        renderLivros();
        alternarModoSelecaoLivros();
        toggleSelecaoLivro(1, true);
        setBuscaLivros('rascunhos');
        assert.equal(selecaoLivros.has(1), true);
        setBuscaLivros('');
        assert.ok(cards()[0].classList.contains('ring-2'));
    });

    it('desligar o modo limpa a seleção', () => {
        renderLivros();
        alternarModoSelecaoLivros();
        toggleSelecaoLivro(1, true);
        alternarModoSelecaoLivros();
        assert.equal(selecaoLivros.size, 0);
        assert.equal(caixas().length, 0);
    });

    it('livro excluído depois de marcado sai da seleção no próximo desenho', () => {
        renderLivros();
        alternarModoSelecaoLivros();
        toggleSelecaoLivro(4, true);
        db.livros = db.livros.filter((l) => l.id !== 4);
        renderLivros();
        assert.equal(selecaoLivros.size, 0);
    });
});

describe('aba Livros: Baixar', () => {
    beforeEach(() => {
        dados();
        capturarDownloads();
    });
    afterEach(() => {
        document.createElement = criarOriginal;
        globalThis.URL.createObjectURL = urlOriginal;
        globalThis.URL.revokeObjectURL = revogarOriginal;
    });

    const titulos = async (blob) => JSON.parse(await texto(blob)).itens.map((l) => l.titulo);

    it('sem filtro baixa todos, na ordem da aba, como livros.json', async () => {
        renderLivros();
        baixarLivrosDaAba();
        assert.equal(downloads.length, 1);
        assert.equal(downloads[0].nome, 'livros.json');
        assert.deepEqual(await titulos(downloads[0].blob), [
            'Água Viva',
            'Poemas Reunidos',
            'Rascunhos',
            'Segunda Água',
        ]);
    });

    it('com busca, "Filtrados" baixa só o que a tela mostra e leva o nome livros-filtrados', async () => {
        renderLivros();
        setBuscaLivros('água');
        baixarLivrosDaAba();
        assert.equal(downloads[0].nome, 'livros-filtrados.json');
        assert.deepEqual(await titulos(downloads[0].blob), ['Água Viva', 'Segunda Água']);
    });

    it('"Todos os livros" ignora o filtro', async () => {
        renderLivros();
        setBuscaLivros('água');
        el('livros-baixar-escopo').value = 'tudo';
        baixarLivrosDaAba();
        assert.equal(downloads[0].nome, 'livros.json');
        assert.equal((await titulos(downloads[0].blob)).length, 4);
    });

    it('"Só selecionados" baixa os marcados, mesmo fora do filtro', async () => {
        renderLivros();
        alternarModoSelecaoLivros();
        toggleSelecaoLivro(2, true);
        toggleSelecaoLivro(3, true);
        setBuscaLivros('água');
        baixarLivrosDaAba();
        assert.equal(downloads[0].nome, 'livros-selecionados.json');
        assert.deepEqual(await titulos(downloads[0].blob), ['Poemas Reunidos', 'Rascunhos']);
    });

    it('escolhe o formato do select e o lembra para o Ver', async () => {
        renderLivros();
        el('livros-baixar-formato').value = 'csv';
        baixarLivrosDaAba();
        assert.equal(downloads[0].nome, 'livros.csv');
        assert.equal(localStorage.getItem(CHAVE), 'csv');
        el('livros-baixar-formato').value = 'md';
        baixarLivrosDaAba();
        assert.equal(downloads[1].nome, 'livros.md');
        assert.match(await texto(downloads[1].blob), /Água Viva/);
    });

    it('escopo "selecao" sem ninguém marcado avisa e não baixa', () => {
        renderLivros();
        opcao('selecao').hidden = false;
        opcao('selecao').disabled = false;
        el('livros-baixar-escopo').value = 'selecao';
        baixarLivrosDaAba();
        assert.equal(downloads.length, 0);
    });

    it('filtro que não acha nada não baixa arquivo vazio', () => {
        renderLivros();
        setBuscaLivros('zzzz');
        baixarLivrosDaAba();
        assert.equal(downloads.length, 0);
    });

    it('o conteúdo dos textos nunca sai', async () => {
        db.poemas = [{ id: 9, titulo: 'P', texto: 'CORPO SECRETO', paiTipo: 'livro', paiId: 1 }];
        renderLivros();
        baixarLivrosDaAba();
        assert.ok(!(await texto(downloads[0].blob)).includes('CORPO SECRETO'));
    });
});
