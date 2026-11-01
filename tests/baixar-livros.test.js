import './helpers/dom-real.js';

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Baixar do Ver do livro (Fase 19, etapa 7, entrega 2): formato lembrado,
// download de um livro e o botão do rodapé do modal.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
globalThis.fetch = async (url) => ({
    ok: true,
    status: 200,
    text: async () =>
        fs.readFileSync(path.resolve(__dirname, '../modais', path.basename(url)), 'utf8'),
});
document.body.innerHTML = '<main></main><div id="modais-container"></div>';

const { db } = await import('../js/db.js');
const { registrarModal, toggleModal } = await import('../js/modais.js');
const {
    getFormatoBaixarLivros,
    salvarFormatoBaixarLivros,
    baixarLivro,
    baixarLivros,
    FORMATO_PADRAO_LIVROS,
} = await import('../js/baixar-livros.js');
const { abrirVisualizacaoLivro, baixarDoModalVisualizacaoLivro, navegarVisualizacaoLivro } =
    await import('../js/visualizar-livro.js');

registrarModal('modal-visualizar-livro', 'modal-visualizar-livro.html', () => {});

const CHAVE = 'arquivoPoetico_formatoSelecao_livros';

function cenario() {
    return {
        livros: [
            {
                id: 1,
                titulo: 'Livro Um',
                tipo: 'Inéditos',
                sequencia: 1,
                isbn13: '978-85-00000-00-0',
                capa: 55,
                autoriaLivro: [{ autorId: 3, papeis: ['Autor'] }],
            },
            { id: 2, titulo: 'Coração & Razão', tipo: 'Inéditos', sequencia: 2 },
        ],
        autores: [{ id: 3, nome: 'Victor Leme' }],
        colaboradores: [],
        partes: [],
        secoes: [],
        elementos: [],
        poemas: [{ id: 9, titulo: 'P', texto: 'CORPO SECRETO', paiTipo: 'livro', paiId: 1 }],
        prosas: [],
        itensColetanea: [],
    };
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
        const url = `blob:test-${porUrl.size}`;
        porUrl.set(url, blob);
        return url;
    };
    globalThis.URL.revokeObjectURL = () => {};
    document.createElement = (tag) => {
        const el = criarOriginal.call(document, tag);
        if (tag !== 'a') return el;
        const clicar = el.click.bind(el);
        el.click = () => {
            downloads.push({ nome: el.download, blob: porUrl.get(el.href) });
            clicar();
        };
        return el;
    };
}

function restaurarDownloads() {
    document.createElement = criarOriginal;
    globalThis.URL.createObjectURL = urlOriginal;
    globalThis.URL.revokeObjectURL = revogarOriginal;
}

const texto = async (blob) => Buffer.from(await blob.arrayBuffer()).toString('utf-8');

describe('formato lembrado', () => {
    beforeEach(() => localStorage.clear());

    it('sem escolha, vale o padrão (.json)', () => {
        assert.equal(FORMATO_PADRAO_LIVROS, 'json');
        assert.equal(getFormatoBaixarLivros(), 'json');
    });

    it('guarda a escolha na chave da seleção de Livros, que o inventário já classifica', () => {
        salvarFormatoBaixarLivros('md');
        assert.equal(localStorage.getItem(CHAVE), 'md');
        assert.equal(getFormatoBaixarLivros(), 'md');
    });

    it('formato que não existe não é guardado, e valor estranho já salvo cai no padrão', () => {
        salvarFormatoBaixarLivros('csv');
        salvarFormatoBaixarLivros('rtf');
        assert.equal(getFormatoBaixarLivros(), 'csv');
        localStorage.setItem(CHAVE, 'rtf');
        assert.equal(getFormatoBaixarLivros(), 'json');
    });

    it('.pdf e .docx também são guardados e lembrados', () => {
        salvarFormatoBaixarLivros('pdf');
        assert.equal(getFormatoBaixarLivros(), 'pdf');
        salvarFormatoBaixarLivros('docx');
        assert.equal(getFormatoBaixarLivros(), 'docx');
    });
});

describe('baixarLivro', () => {
    beforeEach(() => {
        localStorage.clear();
        Object.assign(db, cenario());
        capturarDownloads();
    });
    afterEach(restaurarDownloads);

    it('.json: nome pelo título, só as informações do livro', async () => {
        baixarLivro(1, 'json');
        assert.equal(downloads.length, 1);
        assert.equal(downloads[0].nome, 'livro-um.json');
        assert.match(downloads[0].blob.type, /^application\/json/);
        const conteudo = await texto(downloads[0].blob);
        const json = JSON.parse(conteudo);
        assert.equal(json.export_format, 'selecao_livros');
        assert.equal(json.itens.length, 1);
        assert.equal(json.itens[0].titulo, 'Livro Um');
        assert.equal(json.itens[0].tem_capa, true);
        assert.equal(json.itens[0].capa, undefined);
        assert.deepEqual(json.itens[0].autoria_livro, [
            { autor: 'Victor Leme', papeis: ['Autor'] },
        ]);
        assert.equal(json.itens[0].estrutura.poemas, 1);
        assert.doesNotMatch(conteudo, /CORPO SECRETO/);
    });

    it('.md e .csv, com extensão e tipo certos', async () => {
        baixarLivro(2, 'md');
        baixarLivro(2, 'csv');
        assert.deepEqual(
            downloads.map((d) => d.nome),
            ['coracao-razao.md', 'coracao-razao.csv'],
        );
        assert.match(downloads[0].blob.type, /^text\/markdown/);
        assert.match(await texto(downloads[0].blob), /^# Livros\n\n## Coração & Razão/);
        assert.match(downloads[1].blob.type, /^text\/csv/);
        const bytes = Buffer.from(await downloads[1].blob.arrayBuffer());
        assert.deepEqual([...bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
    });

    it('sem formato, usa o lembrado', () => {
        salvarFormatoBaixarLivros('md');
        baixarLivro(1);
        assert.equal(downloads[0].nome, 'livro-um.md');
    });

    it('id como texto também acha o livro', () => {
        baixarLivro('1', 'json');
        assert.equal(downloads.length, 1);
    });

    it('livro que não existe: nada é baixado', () => {
        baixarLivro(999, 'json');
        assert.equal(downloads.length, 0);
    });

    it('baixarLivros com lista vazia não baixa nada', () => {
        baixarLivros([], 'json', 'x');
        assert.equal(downloads.length, 0);
    });

    it('baixarLivros respeita a ordem da lista recebida', async () => {
        baixarLivros([db.livros[1], db.livros[0]], 'json', 'dois');
        const json = JSON.parse(await texto(downloads[0].blob));
        assert.deepEqual(
            json.itens.map((i) => i.id),
            [2, 1],
        );
        assert.equal(downloads[0].nome, 'dois.json');
    });
});

describe('Baixar no rodapé do Ver do livro', () => {
    beforeEach(async () => {
        localStorage.clear();
        Object.assign(db, cenario());
        capturarDownloads();
        if (!document.getElementById('modal-visualizar-livro')?.classList.contains('hidden')) {
            await toggleModal('modal-visualizar-livro');
        }
    });
    afterEach(async () => {
        restaurarDownloads();
        if (!document.getElementById('modal-visualizar-livro')?.classList.contains('hidden')) {
            await toggleModal('modal-visualizar-livro');
        }
    });

    it('o select abre no formato lembrado', async () => {
        salvarFormatoBaixarLivros('csv');
        await abrirVisualizacaoLivro(1);
        assert.equal(document.getElementById('visualizar-livro-baixar-formato').value, 'csv');
    });

    it('sem escolha anterior abre em .json', async () => {
        await abrirVisualizacaoLivro(1);
        assert.equal(document.getElementById('visualizar-livro-baixar-formato').value, 'json');
    });

    it('trocar o formato guarda a escolha (vale também para a aba Livros)', async () => {
        await abrirVisualizacaoLivro(1);
        const sel = document.getElementById('visualizar-livro-baixar-formato');
        sel.value = 'md';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        assert.equal(getFormatoBaixarLivros(), 'md');
    });

    it('o botão baixa o livro aberto, no formato do select', async () => {
        await abrirVisualizacaoLivro(1);
        document.getElementById('visualizar-livro-baixar-formato').value = 'md';
        baixarDoModalVisualizacaoLivro();
        assert.equal(downloads.length, 1);
        assert.equal(downloads[0].nome, 'livro-um.md');
        assert.match(await texto(downloads[0].blob), /## Livro Um/);
    });

    it('ao navegar para outro livro, baixa o livro que está na tela', async () => {
        await abrirVisualizacaoLivro(1, { ids: [1, 2] });
        navegarVisualizacaoLivro(1);
        baixarDoModalVisualizacaoLivro('json');
        assert.equal(downloads[0].nome, 'coracao-razao.json');
    });

    it('o formato passado direto vence o select', async () => {
        await abrirVisualizacaoLivro(1);
        assert.equal(document.getElementById('visualizar-livro-baixar-formato').value, 'json');
        baixarDoModalVisualizacaoLivro('csv');
        assert.equal(downloads[0].nome, 'livro-um.csv');
    });

    it('o botão do HTML chama a função que está em window', () => {
        const html = fs.readFileSync(
            path.resolve(__dirname, '../modais/modal-visualizar-livro.html'),
            'utf8',
        );
        assert.match(html, /onclick="baixarDoModalVisualizacaoLivro\(\)"/);
        const main = fs.readFileSync(path.resolve(__dirname, '../js/main.js'), 'utf8');
        assert.match(
            main,
            /window\.baixarDoModalVisualizacaoLivro = baixarDoModalVisualizacaoLivro;/,
        );
    });
});
