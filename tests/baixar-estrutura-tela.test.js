import './helpers/dom-real.js';

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

// T3, entrega 2: a caixa "Incluir estrutura" (lembrada) no Baixar do Ver, do
// card, da barra da aba Livros e da aba Coletâneas, e o .zip do .csv.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const mainJs = fs.readFileSync(path.resolve(__dirname, '../js/main.js'), 'utf8');
globalThis.fetch = async (url) => ({
    ok: true,
    status: 200,
    text: async () =>
        fs.readFileSync(path.resolve(__dirname, '../modais', path.basename(url)), 'utf8'),
});
const trecho = (inicio, fim) => {
    const i = html.indexOf(inicio);
    const f = html.indexOf(fim, i);
    assert.ok(i !== -1 && f !== -1, `trecho ${inicio} não achado`);
    return html.slice(i, f);
};
document.body.innerHTML = `<main>${trecho('<section id="livros"', 'id="lista-livros"')}id="lista-livros"></div></section>
${trecho('<section id="coletaneas"', '<section id="partes"')}</main><div id="modais-container"></div>`;

const { db } = await import('../js/db.js');
const { registrarModal, toggleModal } = await import('../js/modais.js');
const { renderLivros, limparFiltrosLivros } = await import('../js/render-listas.js');
const { renderColetaneas } = await import('../js/coletaneas.js');
const {
    getIncluirEstruturaBaixarLivros,
    salvarIncluirEstruturaBaixarLivros,
    salvarFormatoBaixarLivros,
    baixarLivro,
    baixarLivros,
} = await import('../js/baixar-livros.js');
const { baixarLivrosDaAba } = await import('../js/selecao-livros-aba.js');
const { abrirVisualizacaoLivro, baixarDoModalVisualizacaoLivro } =
    await import('../js/visualizar-livro.js');
registrarModal('modal-visualizar-livro', 'modal-visualizar-livro.html', () => {});

const CHAVE_ESTRUTURA = 'arquivoPoetico_incluirEstrutura_livros';
const el = (id) => document.getElementById(id);

function cenario() {
    Object.assign(db, {
        livros: [
            { id: 1, titulo: 'Livro Um', tipo: 'Inéditos', sequencia: 1 },
            { id: 2, titulo: 'Antologia', tipo: 'Coletânea', sequencia: 2 },
        ],
        autores: [],
        colaboradores: [],
        partes: [
            { id: 10, livroId: 1, titulo: 'Parte A', sequencia: 1 },
            { id: 20, livroId: 2, titulo: 'Parte da Antologia', sequencia: 1 },
        ],
        secoes: [],
        elementos: [],
        poemas: [
            { id: 9, titulo: 'Poema Nove', texto: 'CORPO SECRETO', paiTipo: 'parte', paiId: 10 },
        ],
        prosas: [],
        itensColetanea: [
            { id: 5, parteId: 20, refTipo: 'poema', refId: 9, titulo: 'Poema Nove', sequencia: 1 },
        ],
    });
}

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
        const url = `blob:estr-${porUrl.size}`;
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
function restaurarDownloads() {
    document.createElement = criarOriginal;
    globalThis.URL.createObjectURL = urlOriginal;
    globalThis.URL.revokeObjectURL = revogarOriginal;
}
const texto = async (blob) => Buffer.from(await blob.arrayBuffer()).toString('utf-8');

describe('escolha lembrada de "Incluir estrutura"', () => {
    beforeEach(() => localStorage.clear());

    it('desligada na primeira vez', () => {
        assert.equal(getIncluirEstruturaBaixarLivros(), false);
    });

    it('guarda e devolve a escolha', () => {
        salvarIncluirEstruturaBaixarLivros(true);
        assert.equal(localStorage.getItem(CHAVE_ESTRUTURA), '1');
        assert.equal(getIncluirEstruturaBaixarLivros(), true);
        salvarIncluirEstruturaBaixarLivros(false);
        assert.equal(getIncluirEstruturaBaixarLivros(), false);
    });
});

describe('baixarLivro com e sem a estrutura', () => {
    beforeEach(() => {
        localStorage.clear();
        cenario();
        capturarDownloads();
    });
    afterEach(restaurarDownloads);

    it('desligada: o .json sai como sempre, sem estrutura_arvore', async () => {
        baixarLivro(1, 'json');
        const json = JSON.parse(await texto(downloads[0].blob));
        assert.equal(json.itens[0].estrutura_arvore, undefined);
    });

    it('ligada (lembrada): o .json leva só os títulos, nunca o texto', async () => {
        salvarIncluirEstruturaBaixarLivros(true);
        baixarLivro(1, 'json');
        const conteudo = await texto(downloads[0].blob);
        const item = JSON.parse(conteudo).itens[0];
        assert.equal(item.estrutura_arvore.arvore[0].titulo, 'Parte A');
        assert.equal(item.estrutura_arvore.arvore[0].filhos[0].titulo, 'Poema Nove');
        assert.doesNotMatch(conteudo, /CORPO SECRETO/);
    });

    it('a opção passada à função vale no lugar da lembrada', async () => {
        salvarIncluirEstruturaBaixarLivros(true);
        baixarLivro(1, 'json', { incluirEstrutura: false });
        assert.equal(
            JSON.parse(await texto(downloads[0].blob)).itens[0].estrutura_arvore,
            undefined,
        );
    });

    it('.md com a opção ligada ganha o bloco Estrutura', async () => {
        salvarIncluirEstruturaBaixarLivros(true);
        baixarLivro(1, 'md');
        assert.match(await texto(downloads[0].blob), /Estrutura/);
        assert.match(await texto(downloads[0].blob), /Poema Nove/);
    });

    it('.csv sem a opção: um arquivo só, sem .zip', () => {
        baixarLivro(1, 'csv');
        assert.deepEqual(
            downloads.map((d) => d.nome),
            ['livro-um.csv'],
        );
    });

    it('.csv com a opção: um .zip com o .csv largo e o -estrutura.csv', async () => {
        salvarIncluirEstruturaBaixarLivros(true);
        globalThis.JSZip = JSZip;
        await baixarLivro(1, 'csv');
        assert.deepEqual(
            downloads.map((d) => d.nome),
            ['livro-um.zip'],
        );
        const zip = await JSZip.loadAsync(await downloads[0].blob.arrayBuffer());
        assert.deepEqual(Object.keys(zip.files).sort(), ['livro-um-estrutura.csv', 'livro-um.csv']);
        const estrutura = await zip.file('livro-um-estrutura.csv').async('string');
        assert.match(estrutura, /Poema Nove/);
        assert.doesNotMatch(estrutura, /CORPO SECRETO/);
    });

    it('.csv com a opção e sem JSZip: baixa os dois arquivos, um depois do outro', async () => {
        salvarIncluirEstruturaBaixarLivros(true);
        delete globalThis.JSZip;
        await baixarLivros([db.livros[0]], 'csv', 'x');
        assert.deepEqual(
            downloads.map((d) => d.nome),
            ['x.csv', 'x-estrutura.csv'],
        );
        globalThis.JSZip = JSZip;
    });
});

describe('barra da aba Livros', () => {
    beforeEach(() => {
        localStorage.clear();
        cenario();
        limparFiltrosLivros();
        capturarDownloads();
    });
    afterEach(restaurarDownloads);

    it('a caixa existe, abre desligada e sem formato fica habilitada no .json', () => {
        renderLivros();
        const caixa = el('livros-baixar-estrutura');
        assert.ok(caixa);
        assert.equal(caixa.checked, false);
        assert.equal(caixa.disabled, false);
    });

    it('abre ligada quando a escolha lembrada é ligada, e marcar guarda', () => {
        salvarIncluirEstruturaBaixarLivros(true);
        renderLivros();
        const caixa = el('livros-baixar-estrutura');
        assert.equal(caixa.checked, true);
        caixa.checked = false;
        caixa.onchange();
        assert.equal(getIncluirEstruturaBaixarLivros(), false);
    });

    it('a caixa fica habilitada em todos os formatos, inclusive .pdf e .docx', () => {
        salvarIncluirEstruturaBaixarLivros(true);
        for (const f of ['json', 'md', 'csv', 'pdf', 'docx']) {
            salvarFormatoBaixarLivros(f);
            renderLivros();
            const caixa = el('livros-baixar-estrutura');
            assert.equal(caixa.disabled, false, f);
            assert.equal(caixa.checked, true, f);
        }
    });

    it('Baixar da barra leva a estrutura quando a caixa está ligada', async () => {
        salvarIncluirEstruturaBaixarLivros(true);
        salvarFormatoBaixarLivros('json');
        renderLivros();
        baixarLivrosDaAba();
        const json = JSON.parse(await texto(downloads[0].blob));
        assert.ok(json.itens.every((i) => i.estrutura_arvore));
    });

    it('o botão do card usa a escolha lembrada', async () => {
        salvarIncluirEstruturaBaixarLivros(true);
        renderLivros();
        assert.match(mainJs, /'baixar-livro': \(el\) => baixarLivro\(Number\(el\.dataset\.id\)\)/);
        baixarLivro(1);
        const json = JSON.parse(await texto(downloads[0].blob));
        assert.ok(json.itens[0].estrutura_arvore);
    });
});

describe('Ver do livro', () => {
    beforeEach(async () => {
        localStorage.clear();
        cenario();
        capturarDownloads();
        await abrirVisualizacaoLivro(1);
    });
    afterEach(async () => {
        restaurarDownloads();
        if (el('modal-visualizar-livro')) await toggleModal('modal-visualizar-livro');
    });

    it('a caixa abre desligada e o Baixar sem ela mantém o arquivo de sempre', async () => {
        const caixa = el('visualizar-livro-baixar-estrutura');
        assert.ok(caixa);
        assert.equal(caixa.checked, false);
        baixarDoModalVisualizacaoLivro('json');
        assert.equal(
            JSON.parse(await texto(downloads[0].blob)).itens[0].estrutura_arvore,
            undefined,
        );
    });

    it('marcar a caixa guarda a escolha e o Baixar leva a estrutura', async () => {
        const caixa = el('visualizar-livro-baixar-estrutura');
        caixa.checked = true;
        caixa.onchange();
        assert.equal(getIncluirEstruturaBaixarLivros(), true);
        baixarDoModalVisualizacaoLivro('json');
        assert.ok(JSON.parse(await texto(downloads[0].blob)).itens[0].estrutura_arvore);
    });

    it('a caixa e a da aba Livros dividem a mesma escolha', () => {
        salvarIncluirEstruturaBaixarLivros(true);
        // reabre o Ver: a caixa nasce ligada
        el('visualizar-livro-baixar-formato').onchange();
        assert.equal(el('visualizar-livro-baixar-estrutura').checked, true);
    });
});

describe('aba Coletâneas', () => {
    beforeEach(() => {
        localStorage.clear();
        cenario();
        capturarDownloads();
        renderColetaneas();
    });
    afterEach(restaurarDownloads);

    it('o editor ganha formato, caixa e botão Baixar', () => {
        assert.ok(el('coletanea-baixar-formato'));
        assert.ok(el('coletanea-baixar-estrutura'));
        const botao = document.querySelector('button[data-action="baixar-coletanea"]');
        assert.ok(botao);
        assert.equal(botao.dataset.id, '2');
    });

    it('a ação está ligada no main.js', () => {
        assert.match(mainJs, /'baixar-coletanea':/);
    });

    it('abre no formato lembrado e na escolha lembrada da caixa', () => {
        salvarFormatoBaixarLivros('md');
        salvarIncluirEstruturaBaixarLivros(true);
        renderColetaneas();
        assert.equal(el('coletanea-baixar-formato').value, 'md');
        assert.equal(el('coletanea-baixar-estrutura').checked, true);
    });

    it('trocar o formato guarda; marcar a caixa guarda a escolha compartilhada', () => {
        const sel = el('coletanea-baixar-formato');
        sel.value = 'csv';
        sel.onchange();
        assert.equal(localStorage.getItem('arquivoPoetico_formatoSelecao_livros'), 'csv');
        const caixa = el('coletanea-baixar-estrutura');
        caixa.checked = true;
        caixa.onchange();
        assert.equal(getIncluirEstruturaBaixarLivros(), true);
    });

    it('baixar a coletânea com estrutura traz os itens dela, só os títulos', async () => {
        salvarIncluirEstruturaBaixarLivros(true);
        baixarLivro(2, 'json');
        assert.equal(downloads[0].nome, 'antologia.json');
        const conteudo = await texto(downloads[0].blob);
        const item = JSON.parse(conteudo).itens[0];
        assert.equal(item.estrutura_arvore.arvore[0].titulo, 'Parte da Antologia');
        assert.match(JSON.stringify(item.estrutura_arvore), /Poema Nove/);
        assert.doesNotMatch(conteudo, /CORPO SECRETO/);
    });
});
