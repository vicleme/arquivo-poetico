import './helpers/localstorage-shim.js';
import './helpers/dom-shim.js';
import { instalarDocxReal, removerDocxReal } from './helpers/docx-shim.js';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Packer } from 'docx';
import JSZip from 'jszip';

// T3, entrega 3: a estrutura (só títulos) no .pdf e no .docx de Livros.

const { registrosDeLivros } = await import('../js/exportar-livros.js');
const { gerarPdfLivros } = await import('../js/exportar-livros-pdf.js');
const { gerarDocxLivros } = await import('../js/exportar-livros-docx.js');

const banco = {
    livros: [
        { id: 1, titulo: 'Água Viva', tipo: 'Inéditos', sequencia: 1 },
        { id: 2, titulo: 'Vazio', tipo: 'Inéditos', sequencia: 2 },
    ],
    autores: [],
    colaboradores: [],
    partes: [{ id: 10, livroId: 1, titulo: 'Parte A', sequencia: 1 }],
    secoes: [{ id: 20, paiTipo: 'parte', paiId: 10, titulo: 'Seção X', sequencia: 1 }],
    elementos: [],
    poemas: [
        {
            id: 1,
            titulo: 'Poema Fundo',
            texto: 'CORPO-DO-POEMA-NAO-PODE-SAIR',
            paiTipo: 'secao',
            paiId: 20,
        },
        { id: 2, titulo: 'Poema Solto', texto: 'OUTRO-CORPO', livrosIds: [1] },
    ],
    prosas: [],
    itensColetanea: [],
};
const livros = banco.livros;
const com = registrosDeLivros(livros, banco, { incluirEstrutura: true });
const sem = registrosDeLivros(livros, banco);

function pdfFalso() {
    const reg = { textos: [], paginas: 1 };
    class JsPdfFalso {
        constructor() {
            this.pagina = 1;
            this.internal = {
                pageSize: { getWidth: () => 595, getHeight: () => 842 },
                getNumberOfPages: () => reg.paginas,
            };
        }
        setFont() {}
        setFontSize() {}
        setTextColor() {}
        setDrawColor() {}
        getTextWidth(t) {
            return String(t).length * 5;
        }
        text(t, x, y) {
            reg.textos.push({ t, x, y });
        }
        addPage() {
            reg.paginas += 1;
            this.pagina = reg.paginas;
        }
        setPage(n) {
            this.pagina = n;
        }
        link() {}
        line() {}
        addImage() {}
    }
    return { JsPdfFalso, reg };
}

describe('.pdf com estrutura', () => {
    it('sem a opção, nada de Estrutura', () => {
        const { JsPdfFalso, reg } = pdfFalso();
        gerarPdfLivros([sem[0]], JsPdfFalso);
        assert.ok(!reg.textos.some((t) => /Estrutura:/.test(t.t)));
    });

    it('com a opção: título, itens com recuo por nível, vinculados, e nunca o corpo dos textos', () => {
        const { JsPdfFalso, reg } = pdfFalso();
        gerarPdfLivros([com[0]], JsPdfFalso);
        const todos = reg.textos.map((t) => t.t).join(' ');
        assert.match(todos, /Estrutura:/);
        assert.match(todos, /Vinculados, sem posição na estrutura:/);
        assert.ok(!todos.includes('CORPO-DO-POEMA') && !todos.includes('OUTRO-CORPO'));
        // Uma palavra por chamada de text(): os "-" marcam o começo de cada item.
        const xs = reg.textos.filter((t) => t.t === '-').map((t) => t.x);
        assert.ok(xs[1] > xs[0], 'seção mais recuada que a parte');
        assert.ok(xs[2] > xs[1], 'poema mais recuado que a seção');
    });

    it('livro vazio com a opção: "Sem conteúdo."', () => {
        const { JsPdfFalso, reg } = pdfFalso();
        gerarPdfLivros([com[1]], JsPdfFalso);
        assert.ok(reg.textos.some((t) => /Sem/.test(t.t)));
        assert.ok(reg.textos.some((t) => /Estrutura:/.test(t.t)));
    });
});

describe('.docx com estrutura', () => {
    before(() => instalarDocxReal());
    after(() => removerDocxReal());

    const xml = async (regs) => {
        const zip = await JSZip.loadAsync(await Packer.toBuffer(gerarDocxLivros(regs)));
        return zip.file('word/document.xml').async('string');
    };

    it('sem a opção, nada de Estrutura', async () => {
        assert.ok(!(await xml([sem[0]])).includes('Estrutura:'));
    });

    it('com a opção: marcadores com nível por profundidade, vinculados, sem o corpo dos textos', async () => {
        const x = await xml([com[0]]);
        assert.match(x, /Estrutura:/);
        assert.match(x, /Vinculados, sem posição na estrutura:/);
        assert.match(x, /Parte: Parte A|Parte A/);
        assert.match(x, /Poema Fundo/);
        assert.match(x, /<w:ilvl w:val="0"\/>/);
        assert.match(x, /<w:ilvl w:val="2"\/>/);
        assert.ok(!x.includes('CORPO-DO-POEMA') && !x.includes('OUTRO-CORPO'));
    });

    it('livro vazio com a opção: "Sem conteúdo."', async () => {
        const x = await xml([com[1]]);
        assert.match(x, /Estrutura:/);
        assert.match(x, /Sem conteúdo\./);
    });
});
