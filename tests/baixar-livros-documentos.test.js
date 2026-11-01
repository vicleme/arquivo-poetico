import './helpers/dom-real.js';
import { instalarDocxReal, removerDocxReal } from './helpers/docx-shim.js';

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';

// Baixar do livro em .pdf e .docx pela tela (Fase 19, etapa 8, entrega 2):
// download assíncrono, capa carregada do mapa e aviso quando a biblioteca falta.

const { db } = await import('../js/db.js');
const { baixarLivro, baixarLivros, salvarFormatoBaixarLivros } =
    await import('../js/baixar-livros.js');

function cenario() {
    return {
        livros: [
            {
                id: 1,
                titulo: 'Livro Um',
                tipo: 'Inéditos',
                sequencia: 1,
                sinopse: 'Sobre o livro.',
            },
            { id: 2, titulo: 'Coração & Razão', tipo: 'Inéditos', sequencia: 2 },
        ],
        autores: [],
        colaboradores: [],
        partes: [],
        secoes: [],
        elementos: [],
        poemas: [{ id: 9, titulo: 'P', texto: 'CORPO SECRETO', paiTipo: 'livro', paiId: 1 }],
        prosas: [],
        itensColetanea: [],
    };
}

let salvos;
class JsPdfFalso {
    constructor() {
        this.internal = {
            pageSize: { getWidth: () => 595, getHeight: () => 842 },
            getNumberOfPages: () => 1,
        };
        this.textos = [];
    }
    setFont() {}
    setFontSize() {}
    setTextColor() {}
    setDrawColor() {}
    getTextWidth(t) {
        return String(t).length * 5;
    }
    text(t) {
        this.textos.push(t);
    }
    link() {}
    line() {}
    addPage() {}
    setPage() {}
    addImage() {}
    save(nome) {
        salvos.push({ nome, textos: this.textos.join(' ') });
    }
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
        const url = `blob:doc-${porUrl.size}`;
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

describe('baixarLivro em .pdf e .docx', () => {
    beforeEach(() => {
        localStorage.clear();
        Object.assign(db, cenario());
        salvos = [];
        capturarDownloads();
        globalThis.window = globalThis.window || {};
        globalThis.window.jspdf = { jsPDF: JsPdfFalso };
        instalarDocxReal();
    });
    afterEach(() => {
        document.createElement = criarOriginal;
        globalThis.URL.createObjectURL = urlOriginal;
        globalThis.URL.revokeObjectURL = revogarOriginal;
        delete globalThis.window.jspdf;
        removerDocxReal();
    });

    it('.pdf: devolve uma Promise e salva com o título no nome', async () => {
        const p = baixarLivro(1, 'pdf');
        assert.ok(p instanceof Promise);
        await p;
        assert.equal(salvos.length, 1);
        assert.equal(salvos[0].nome, 'livro-um.pdf');
        assert.match(salvos[0].textos, /Livro Um/);
        assert.doesNotMatch(salvos[0].textos, /CORPO SECRETO/);
    });

    it('.docx: baixa um pacote com o título e sem o conteúdo dos textos', async () => {
        await baixarLivro(1, 'docx');
        assert.equal(downloads.length, 1);
        assert.equal(downloads[0].nome, 'livro-um.docx');
        const zip = await JSZip.loadAsync(Buffer.from(await downloads[0].blob.arrayBuffer()));
        const xml = await zip.file('word/document.xml').async('string');
        assert.match(xml, /Livro Um/);
        assert.match(xml, /Sobre o livro\./);
        assert.doesNotMatch(xml, /CORPO SECRETO/);
    });

    it('sem formato, usa o lembrado, inclusive .pdf', async () => {
        salvarFormatoBaixarLivros('pdf');
        await baixarLivro(2);
        assert.equal(salvos[0].nome, 'coracao-razao.pdf');
    });

    it('vários livros, no nome-base recebido', async () => {
        await baixarLivros(db.livros, 'pdf', 'livros-filtrados');
        assert.equal(salvos[0].nome, 'livros-filtrados.pdf');
        assert.match(salvos[0].textos, /Livros/);
    });

    it('capa que não carrega não derruba o download', async () => {
        db.livros[0].capa = 'capa_inexistente';
        await baixarLivro(1, 'pdf');
        assert.equal(salvos.length, 1);
    });

    it('sem a biblioteca de PDF, avisa na tela e não baixa nada', async () => {
        delete globalThis.window.jspdf;
        await baixarLivro(1, 'pdf');
        assert.equal(salvos.length, 0);
        assert.match(document.body.textContent, /biblioteca de PDF não carregou/);
    });

    it('sem a biblioteca de .docx, avisa na tela e não baixa nada', async () => {
        removerDocxReal();
        await baixarLivro(1, 'docx');
        assert.equal(downloads.length, 0);
        assert.match(document.body.textContent, /biblioteca de \.docx não carregou/);
    });
});
