import './helpers/localstorage-shim.js';
import './helpers/dom-shim.js';
import { instalarDocxReal, removerDocxReal } from './helpers/docx-shim.js';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Packer } from 'docx';
import JSZip from 'jszip';

// Download do Livro em .pdf e .docx (Fase 19, etapa 8, entrega 1: lógica pura).

const {
    registrosDeLivros,
    modeloDocumentoLivro,
    livroParaMarkdown,
    segmentarLinks,
    dividirCamposDaFicha,
} = await import('../js/exportar-livros.js');
const { saneParaPdf } = await import('../js/exportar-pdf.js');
const { prepararCapa } = await import('../js/capas-para-exportar.js');
const { gerarPdfLivros, baixarPdfLivros } = await import('../js/exportar-livros-pdf.js');
const { gerarDocxLivros } = await import('../js/exportar-livros-docx.js');

const banco = {
    autores: [],
    colaboradores: [],
    partes: [],
    secoes: [],
    elementos: [],
    poemas: [{ id: 1, titulo: 'Poema secreto', texto: 'CORPO-DO-POEMA-NAO-PODE-SAIR', livroId: 1 }],
    prosas: [],
    itensColetanea: [],
};

const livros = [
    {
        id: 1,
        titulo: 'Água Viva',
        tipo: 'Inéditos',
        sequencia: 1,
        isbn13: '978-85-359-0277-5',
        sinopse: 'Primeira linha “curva”.\nSegunda linha — com travessão.',
        lojas: [{ nome: 'Amazon', url: 'https://amazon.example/x' }],
    },
    { id: 2, titulo: 'Rascunhos', tipo: 'Inéditos', sequencia: 2 },
];
const registros = registrosDeLivros(livros, banco);

function criarJsPdfFalso() {
    const reg = {
        textos: [],
        paginas: 1,
        salvo: null,
        fontes: new Set(),
        links: [],
        linhas: 0,
        imagens: [],
    };
    class JsPdfFalso {
        constructor() {
            this.pagina = 1;
            this.internal = {
                pageSize: { getWidth: () => 595, getHeight: () => 842 },
                getNumberOfPages: () => reg.paginas,
            };
        }
        setFont(_n, estilo) {
            reg.fontes.add(estilo);
            this.estilo = estilo;
        }
        setFontSize() {}
        setTextColor() {}
        getTextWidth(t) {
            return String(t).length * 5;
        }
        text(t, x, y) {
            reg.textos.push({ t, x, y, pagina: this.pagina, estilo: this.estilo });
        }
        addPage() {
            reg.paginas += 1;
            this.pagina = reg.paginas;
        }
        setPage(n) {
            this.pagina = n;
        }
        save(nome) {
            reg.salvo = nome;
        }
        link(x, y, w, h, opcoes) {
            reg.links.push({ x, y, w, h, url: opcoes.url });
        }
        line() {
            reg.linhas += 1;
        }
        setDrawColor() {}
        addImage(dados, formato, x, y, w, h) {
            reg.imagens.push({ dados, formato, x, y, w, h, pagina: this.pagina });
        }
    }
    return { JsPdfFalso, reg };
}
const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
);
const textoDoPdf = (reg) => reg.textos.map((t) => t.t).join(' ');

describe('divisão da ficha com capa', () => {
    it('corta em Lojas ou no primeiro valor com link', () => {
        const c = (rotulo, valor) => ({ rotulo, valor });
        const d = dividirCamposDaFicha([c('Tipo', 'x'), c('Lojas', 'A'), c('Fase', 'y')]);
        assert.deepEqual(
            d.aoLado.map((f) => f.rotulo),
            ['Tipo'],
        );
        assert.deepEqual(
            d.abaixo.map((f) => f.rotulo),
            ['Lojas', 'Fase'],
        );
        const e = dividirCamposDaFicha([c('Tipo', 'x'), c('PDF', 'https://a.example/b')]);
        assert.deepEqual(
            e.aoLado.map((f) => f.rotulo),
            ['Tipo'],
        );
        assert.equal(dividirCamposDaFicha([c('Tipo', 'x')]).abaixo.length, 0);
    });
});

describe('modelo do documento do Livro', () => {
    it('lista só campos preenchidos, e o .md lê do mesmo modelo', () => {
        const m = modeloDocumentoLivro(registros[0]);
        assert.equal(m.titulo, 'Água Viva');
        const rotulos = m.campos.map((c) => c.rotulo);
        assert.ok(rotulos.includes('ISBN-13'));
        assert.ok(rotulos.includes('Lojas'));
        assert.ok(!rotulos.includes('ISBN-10'));
        assert.deepEqual(
            m.blocos.map((b) => b.rotulo),
            ['Sinopse'],
        );
        const md = livroParaMarkdown(registros[0]);
        assert.match(md, /^## Água Viva\n\n- \*\*Sigla|^## Água Viva\n\n- \*\*Tipo:\*\* Inéditos/);
        assert.match(md, /\*\*Sinopse:\*\*\n\nPrimeira linha/);
    });

    it('sem Uso de IA informado, usoIa é null', () => {
        assert.equal(modeloDocumentoLivro(registros[1]).usoIa, null);
    });
});

describe('.pdf do Livro', () => {
    it('um livro: título, campos com rótulo em negrito e rodapé de página', () => {
        const { JsPdfFalso, reg } = criarJsPdfFalso();
        gerarPdfLivros([registros[0]], JsPdfFalso);
        const t = textoDoPdf(reg);
        assert.match(t, /Água Viva/);
        assert.match(t, /ISBN-13:/);
        assert.match(t, /978-85-359-0277-5/);
        assert.match(t, /Sinopse:/);
        assert.match(t, /Página 1 de 1/);
        assert.ok(reg.fontes.has('bold'));
        assert.ok(!/\bLivros\b/.test(reg.textos[0].t), 'um livro só não leva o título "Livros"');
    });

    it('vários livros abrem com "Livros" e levam todos os títulos', () => {
        const { JsPdfFalso, reg } = criarJsPdfFalso();
        gerarPdfLivros(registros, JsPdfFalso);
        assert.equal(reg.textos[0].t, 'Livros');
        const t = textoDoPdf(reg);
        assert.match(t, /Água/);
        assert.match(t, /Rascunhos/);
    });

    it('mantém aspas curvas, travessão e reticências, e nunca leva o conteúdo dos textos', () => {
        const { JsPdfFalso, reg } = criarJsPdfFalso();
        gerarPdfLivros(registros, JsPdfFalso);
        const t = textoDoPdf(reg);
        assert.match(t, /“curva”\./);
        assert.match(t, /—/);
        assert.ok(!t.includes('CORPO-DO-POEMA'));
    });

    it('endereços saem clicáveis: um link por endereço, com a URL certa', () => {
        const { JsPdfFalso, reg } = criarJsPdfFalso();
        gerarPdfLivros([registros[0]], JsPdfFalso);
        assert.deepEqual(
            reg.links.map((l) => l.url),
            ['https://amazon.example/x'],
        );
        assert.ok(reg.linhas >= 1, 'link sublinhado');
    });

    it('link maior que a linha é partido em pedaços, todos clicáveis, sem estourar a margem', () => {
        const { JsPdfFalso, reg } = criarJsPdfFalso();
        const url = `https://exemplo.example/${'a'.repeat(300)}`;
        const longo = registrosDeLivros([{ id: 5, titulo: 'Link longo', pdfUrl: url }], banco);
        gerarPdfLivros(longo, JsPdfFalso);
        assert.ok(reg.links.length > 1);
        assert.ok(reg.links.every((l) => l.url === url));
        assert.ok(reg.textos.every((t) => t.x + String(t.t).length * 5 <= 595 - 48 + 0.001));
    });

    it('pontuação colada ao endereço não ganha espaço, e o link partido não ganha espaço no meio', () => {
        const { JsPdfFalso, reg } = criarJsPdfFalso();
        gerarPdfLivros([registros[0]], JsPdfFalso);
        const loja = reg.textos.find((t) => t.t === 'https://amazon.example/x');
        const fecha = reg.textos.find((t) => t.t === ']');
        assert.equal(fecha.x, loja.x + loja.t.length * 5, 'o colchete cola no link');
        const longo = registrosDeLivros(
            [{ id: 6, titulo: 'L', pdfUrl: `https://e.example/${'b'.repeat(200)}` }],
            banco,
        );
        const outro = criarJsPdfFalso();
        gerarPdfLivros(longo, outro.JsPdfFalso);
        const pedacos = outro.reg.textos.filter((t) => /^(https|b)/.test(t.t));
        assert.ok(pedacos.length > 1);
        const primeiraLinha = pedacos.filter((t) => t.y === pedacos[0].y);
        primeiraLinha.slice(1).forEach((t, i) => {
            assert.equal(t.x, primeiraLinha[i].x + primeiraLinha[i].t.length * 5);
        });
    });

    it('capa embutida: addImage com o formato certo e a proporção mantida', () => {
        const { JsPdfFalso, reg } = criarJsPdfFalso();
        const capas = new Map([['1', { bytes: PNG, tipo: 'png', largura: 400, altura: 600 }]]);
        gerarPdfLivros(registros, JsPdfFalso, { capas });
        assert.equal(reg.imagens.length, 1);
        const img = reg.imagens[0];
        assert.equal(img.formato, 'PNG');
        assert.ok(img.w <= 120 && img.h <= 170);
        assert.ok(Math.abs(img.w / img.h - 400 / 600) < 0.001);
    });

    it('com capa, os campos ficam ao lado dela e o resto desce para baixo dela', () => {
        const { JsPdfFalso, reg } = criarJsPdfFalso();
        const capas = new Map([['1', { bytes: PNG, tipo: 'png', largura: 400, altura: 600 }]]);
        gerarPdfLivros([registros[0]], JsPdfFalso, { capas });
        const img = reg.imagens[0];
        const tipo = reg.textos.find((t) => t.t === 'Tipo:');
        assert.ok(tipo.x >= img.x + img.w, 'campo à direita da capa');
        assert.ok(tipo.y >= img.y && tipo.y < img.y + img.h, 'campo na altura da capa');
        const sinopse = reg.textos.find((t) => t.t === 'Sinopse:');
        const lojas = reg.textos.find((t) => t.t === 'Lojas:');
        assert.equal(lojas.x, img.x, 'a partir de Lojas, volta para a largura toda');
        assert.ok(lojas.y >= img.y + img.h, 'Lojas abaixo da capa');
        assert.equal(sinopse.x, img.x, 'texto longo na largura toda');
        assert.ok(sinopse.y >= img.y + img.h, 'texto longo abaixo da capa');
    });

    it('com a capa embutida, o campo "Capa: tem capa" some; sem a imagem, continua', () => {
        const comCapa = [{ ...livros[0], capa: 7 }];
        const reg1 = registrosDeLivros(comCapa, banco);
        const { JsPdfFalso, reg } = criarJsPdfFalso();
        const capas = new Map([['1', { bytes: PNG, tipo: 'png', largura: 400, altura: 600 }]]);
        gerarPdfLivros(reg1, JsPdfFalso, { capas });
        assert.ok(!reg.textos.some((t) => t.t === 'Capa:'));
        const outro = criarJsPdfFalso();
        gerarPdfLivros(reg1, outro.JsPdfFalso);
        assert.ok(outro.reg.textos.some((t) => t.t === 'Capa:'));
    });

    it('sem capa, os campos começam na margem', () => {
        const { JsPdfFalso, reg } = criarJsPdfFalso();
        gerarPdfLivros([registros[0]], JsPdfFalso);
        const tipo = reg.textos.find((t) => t.t === 'Tipo:');
        const sinopse = reg.textos.find((t) => t.t === 'Sinopse:');
        assert.equal(tipo.x, sinopse.x);
    });

    it('sem capa no mapa, ou com capa inválida, não embute nada', () => {
        const { JsPdfFalso, reg } = criarJsPdfFalso();
        gerarPdfLivros(registros, JsPdfFalso, {
            capas: new Map([['1', { bytes: PNG, tipo: 'png', largura: 0, altura: 0 }]]),
        });
        assert.equal(reg.imagens.length, 0);
    });

    it('quebra de página quando o conteúdo não cabe', () => {
        const { JsPdfFalso, reg } = criarJsPdfFalso();
        const longo = registrosDeLivros(
            [{ id: 9, titulo: 'Longo', sinopse: Array(120).fill('linha de texto').join('\n') }],
            banco,
        );
        gerarPdfLivros(longo, JsPdfFalso);
        assert.ok(reg.paginas > 1);
        assert.match(textoDoPdf(reg), new RegExp(`Página ${reg.paginas} de ${reg.paginas}`));
    });

    it('sem a biblioteca, avisa com mensagem clara', () => {
        assert.throws(() => gerarPdfLivros(registros, null), /biblioteca de PDF não carregou/);
    });

    it('baixarPdfLivros salva com o nome base e .pdf', () => {
        const { JsPdfFalso, reg } = criarJsPdfFalso();
        globalThis.window = globalThis.window || {};
        globalThis.window.jspdf = { jsPDF: JsPdfFalso };
        try {
            baixarPdfLivros(registros, 'livros');
        } finally {
            delete globalThis.window.jspdf;
        }
        assert.equal(reg.salvo, 'livros.pdf');
    });
});

describe('.docx do Livro', () => {
    before(() => instalarDocxReal());
    after(() => removerDocxReal());

    const xml = async (regs) => {
        const buffer = await Packer.toBuffer(gerarDocxLivros(regs));
        const zip = await JSZip.loadAsync(buffer);
        return zip.file('word/document.xml').async('string');
    };

    it('um livro: título como Título 1, campos com rótulo em negrito', async () => {
        const x = await xml([registros[0]]);
        assert.match(x, /w:pStyle w:val="Heading1"/);
        assert.match(x, /Água Viva/);
        assert.match(x, /<w:b\/>/);
        assert.match(x, /ISBN-13: /);
        assert.match(x, /978-85-359-0277-5/);
    });

    it('vários livros: "Livros" no topo e cada título como Título 2', async () => {
        const x = await xml(registros);
        assert.match(x, /Livros/);
        assert.match(x, /w:pStyle w:val="Heading2"/);
        assert.match(x, /Rascunhos/);
    });

    it('o texto longo vira um parágrafo por linha, com os símbolos de verdade, sem o corpo dos textos', async () => {
        const x = await xml([registros[0]]);
        assert.match(x, /Primeira linha “curva”\./);
        assert.match(x, /Segunda linha — com travessão\./);
        assert.ok(!x.includes('CORPO-DO-POEMA'));
    });

    it('endereços viram hiperlinks de verdade (w:hyperlink e relação externa)', async () => {
        const doc = gerarDocxLivros([registros[0]]);
        const zip = await JSZip.loadAsync(await Packer.toBuffer(doc));
        const x = await zip.file('word/document.xml').async('string');
        const rels = await zip.file('word/_rels/document.xml.rels').async('string');
        assert.match(x, /<w:hyperlink /);
        assert.match(rels, /Target="https:\/\/amazon\.example\/x"/);
        assert.match(rels, /TargetMode="External"/);
    });

    it('capa embutida: a imagem vai para word/media', async () => {
        const capas = new Map([['1', { bytes: PNG, tipo: 'png', largura: 400, altura: 600 }]]);
        const zip = await JSZip.loadAsync(
            await Packer.toBuffer(gerarDocxLivros(registros, { capas })),
        );
        const midia = Object.keys(zip.files).filter((n) => n.startsWith('word/media/'));
        assert.ok(midia.length >= 1);
        assert.ok(midia.some((n) => n.endsWith('.png')));
        const x = await zip.file('word/document.xml').async('string');
        assert.match(x, /<w:drawing>/);
    });

    it('com capa, capa e campos ficam numa tabela de duas colunas sem bordas', async () => {
        const capas = new Map([['1', { bytes: PNG, tipo: 'png', largura: 400, altura: 600 }]]);
        const zip = await JSZip.loadAsync(
            await Packer.toBuffer(gerarDocxLivros([registros[0]], { capas })),
        );
        const x = await zip.file('word/document.xml').async('string');
        const tabela = x.match(/<w:tbl>[\s\S]*<\/w:tbl>/)[0];
        assert.equal((tabela.match(/<w:tc>/g) || []).length, 2);
        assert.match(tabela, /<w:drawing>/);
        assert.match(tabela, /ISBN-13/);
        assert.ok(!/<w:val="single"/.test(tabela) && !/w:val="single"/.test(tabela));
        assert.ok(!tabela.includes('Lojas:'), 'Lojas fica fora da tabela');
        assert.ok(!tabela.includes('Sinopse:'), 'texto longo fica fora da tabela');
        assert.ok(x.includes('Sinopse:'));
    });

    it('com a capa embutida, o campo "Capa" some do .docx', async () => {
        const reg1 = registrosDeLivros([{ ...livros[0], capa: 7 }], banco);
        const capas = new Map([['1', { bytes: PNG, tipo: 'png', largura: 400, altura: 600 }]]);
        const zip = await JSZip.loadAsync(await Packer.toBuffer(gerarDocxLivros(reg1, { capas })));
        const x = await zip.file('word/document.xml').async('string');
        assert.ok(!x.includes('tem capa'));
        const sem = await JSZip.loadAsync(await Packer.toBuffer(gerarDocxLivros(reg1)));
        assert.ok((await sem.file('word/document.xml').async('string')).includes('tem capa'));
    });

    it('sem capa, não há tabela', async () => {
        const zip = await JSZip.loadAsync(await Packer.toBuffer(gerarDocxLivros(registros)));
        const x = await zip.file('word/document.xml').async('string');
        assert.ok(!x.includes('<w:tbl>'));
    });

    it('sem capa no mapa, o documento não tem mídia', async () => {
        const zip = await JSZip.loadAsync(await Packer.toBuffer(gerarDocxLivros(registros)));
        assert.equal(Object.keys(zip.files).filter((n) => n.startsWith('word/media/')).length, 0);
    });

    it('sem a biblioteca, avisa com mensagem clara', () => {
        removerDocxReal();
        try {
            assert.throws(() => gerarDocxLivros(registros), /biblioteca de \.docx não carregou/);
        } finally {
            instalarDocxReal();
        }
    });
});

describe('segmentarLinks, saneParaPdf e prepararCapa', () => {
    it('segmentarLinks separa o endereço e deixa a pontuação de fora', () => {
        assert.deepEqual(segmentarLinks('Amazon [https://a.example/x].'), [
            { texto: 'Amazon [' },
            { texto: 'https://a.example/x', url: 'https://a.example/x' },
            { texto: '].' },
        ]);
        assert.deepEqual(segmentarLinks('sem link'), [{ texto: 'sem link' }]);
        assert.deepEqual(segmentarLinks(''), [{ texto: '' }]);
    });

    it('saneParaPdf mantém o que a WinAnsi tem e continua tirando emoji e a seta', () => {
        assert.equal(saneParaPdf('“a” — b – c … ‘d’ ação'), '“a” — b – c … ‘d’ ação');
        assert.equal(saneParaPdf('x → y 🟢 • z'), 'x -> y  - z');
    });

    it('prepararCapa: PNG e JPEG passam como estão, outro formato é convertido', async () => {
        const medir = async () => ({ largura: 10, altura: 20 });
        const png = await prepararCapa(new Blob([PNG], { type: 'image/png' }), medir);
        assert.equal(png.tipo, 'png');
        assert.equal(png.bytes.length, PNG.length);
        assert.deepEqual([png.largura, png.altura], [10, 20]);
        const jpg = await prepararCapa(new Blob([PNG], { type: 'image/jpeg' }), medir);
        assert.equal(jpg.tipo, 'jpeg');
        let convertido = false;
        const webp = await prepararCapa(
            new Blob([PNG], { type: 'image/webp' }),
            medir,
            async () => {
                convertido = true;
                return new Blob([PNG], { type: 'image/jpeg' });
            },
        );
        assert.ok(convertido);
        assert.equal(webp.tipo, 'jpeg');
    });
});
