import './helpers/localstorage-shim.js';
import './helpers/dom-shim.js';
import { instalarDocxReal, removerDocxReal } from './helpers/docx-shim.js';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Packer } from 'docx';
import JSZip from 'jszip';

// T11, entrega 4a: o Fora de escopo nas saídas de Livros (.json, .md, .csv, .pdf e
// .docx), só com a opção "Incluir fora de escopo" e só junto da estrutura.

const {
    registrosDeLivros,
    gerarJsonLivros,
    gerarMarkdownLivros,
    arquivosDoDownloadLivros,
    modeloDocumentoLivro,
} = await import('../js/exportar-livros.js');
const { gerarPdfLivros } = await import('../js/exportar-livros-pdf.js');
const { gerarDocxLivros } = await import('../js/exportar-livros-docx.js');
const { foraDeEscopoParaSaida, foraDeEscopoParaMarkdown } =
    await import('../js/estrutura-livro-saida.js');
const { textoDaEntradaForaDeEscopo, detalheDaEntradaForaDeEscopo } =
    await import('../js/fora-de-escopo.js');

const banco = {
    livros: [
        { id: 1, titulo: 'Livro Um', tipo: 'Inéditos', sequencia: 1 },
        { id: 2, titulo: 'Livro Dois', tipo: 'Inéditos', sequencia: 2 },
        { id: 3, titulo: 'Vazio', tipo: 'Inéditos', sequencia: 3 },
        { id: 4, titulo: 'Coletânea X', tipo: 'Coletânea', sequencia: 4 },
    ],
    autores: [],
    colaboradores: [],
    partes: [],
    secoes: [
        { id: 20, paiTipo: 'livro', paiId: 1, titulo: 'Seção X', sequencia: 1 },
        { id: 21, paiTipo: 'livro', paiId: 2, titulo: 'Cofre', sequencia: 1 },
    ],
    elementos: [],
    itensColetanea: [],
    poemas: [
        {
            id: 1,
            titulo: 'Poema Firme',
            texto: 'CORPO-FIRME',
            status: 'publicado',
            paiTipo: 'secao',
            paiId: 20,
            sequencia: 1,
            livrosIds: [1],
        },
        {
            id: 2,
            titulo: 'Poema Cortado',
            texto: 'CORPO-CORTADO',
            status: 'descartado',
            paiTipo: 'secao',
            paiId: 20,
            sequencia: null,
            livrosIds: [1],
            cortadoDe: { livro: 'Livro Um', secao: 'Seção X', posicao: 3 },
        },
        {
            id: 3,
            titulo: 'Poema Mudado',
            texto: 'CORPO-MUDADO',
            status: 'migrado',
            paiTipo: 'secao',
            paiId: 21,
            sequencia: 1,
            livrosIds: [2],
            cortadoDe: { livro: 'Livro Um', secao: 'Seção X', posicao: 2 },
            lancadoEm: { livro: 'Livro Dois', secao: 'Cofre' },
        },
    ],
    prosas: [
        {
            id: 5,
            titulo: 'Prosa Solta',
            texto: 'CORPO-PROSA',
            status: 'descartado',
            livrosIds: [1],
            cortadoDe: { livro: 'Livro Um' },
        },
    ],
};

const livros = banco.livros;
const so = registrosDeLivros(livros, banco, { incluirEstrutura: true });
const com = registrosDeLivros(livros, banco, {
    incluirEstrutura: true,
    incluirForaDeEscopo: true,
});
const sem = registrosDeLivros(livros, banco);
const porTitulo = (regs, t) => regs.find((r) => r.titulo === t);

describe('registro com Fora de escopo', () => {
    it('sem a opção, não há fora_de_escopo, e o descartado sai da árvore e da contagem', () => {
        const r = porTitulo(so, 'Livro Um');
        assert.equal(r.estrutura_arvore.fora_de_escopo, undefined);
        const titulos = JSON.stringify(r.estrutura_arvore);
        assert.ok(!titulos.includes('Poema Cortado'));
        assert.ok(!titulos.includes('Prosa Solta'), 'o vinculado descartado também sai');
        assert.equal(porTitulo(sem, 'Livro Um').estrutura.poemas, 1);
        assert.equal(porTitulo(sem, 'Livro Um').estrutura.prosas, 0);
    });

    it('a opção sozinha, sem a estrutura, não muda nada', () => {
        const r = registrosDeLivros(livros, banco, { incluirForaDeEscopo: true });
        assert.equal(porTitulo(r, 'Livro Um').estrutura_arvore, undefined);
    });

    it('com a opção, migrados e descartados entram, com origem, destino e detalhe, sem id nem texto', () => {
        const fora = porTitulo(com, 'Livro Um').estrutura_arvore.fora_de_escopo;
        assert.deepEqual(
            fora.descartados.map((e) => [e.tipo, e.titulo]),
            [
                ['poema', 'Poema Cortado'],
                ['prosa', 'Prosa Solta'],
            ],
        );
        assert.deepEqual(
            fora.migrados.map((e) => e.titulo),
            ['Poema Mudado'],
        );
        const [m] = fora.migrados;
        assert.equal(m.status, 'migrado');
        assert.deepEqual(m.origem, { caminho: ['Seção X'], posicao: 2 });
        assert.deepEqual(m.destino, { livro: 'Livro Dois', secao: 'Cofre', posicao: 1 });
        assert.match(m.detalhe, /de Seção X · era a nº 2 na época → agora em Livro Dois › Cofre/);
        const json = JSON.stringify(fora);
        assert.ok(!json.includes('CORPO'));
        assert.ok(!('id' in m));
        const [d] = fora.descartados;
        assert.equal(d.detalhe, 'de Seção X · era a nº 3 na época');
        assert.equal(fora.descartados[1].detalhe, '', 'sem origem, sem detalhe');
    });

    it('o detalhe é a mesma frase das telas', () => {
        const fora = porTitulo(com, 'Livro Um').estrutura_arvore.fora_de_escopo;
        const e = fora.migrados[0];
        assert.equal(textoDaEntradaForaDeEscopo(e), `Migrado (${detalheDaEntradaForaDeEscopo(e)})`);
        assert.equal(
            textoDaEntradaForaDeEscopo({ status: 'descartado', origem: {} }),
            'Descartado',
        );
    });

    it('livro sem nada fora de escopo leva as listas vazias; Coletânea não leva a chave', () => {
        assert.deepEqual(porTitulo(com, 'Vazio').estrutura_arvore.fora_de_escopo, {
            migrados: [],
            descartados: [],
        });
        assert.equal(porTitulo(com, 'Coletânea X').estrutura_arvore.fora_de_escopo, undefined);
    });

    it('o livro de destino do migrado não repete o texto como fora de escopo', () => {
        const fora = porTitulo(com, 'Livro Dois').estrutura_arvore.fora_de_escopo;
        assert.deepEqual(fora, { migrados: [], descartados: [] });
        assert.ok(
            JSON.stringify(porTitulo(com, 'Livro Dois').estrutura_arvore).includes('Poema Mudado'),
        );
    });

    it('foraDeEscopoParaSaida aceita vazio', () => {
        assert.deepEqual(foraDeEscopoParaSaida(null), { migrados: [], descartados: [] });
        assert.equal(foraDeEscopoParaMarkdown({ migrados: [], descartados: [] }), '');
    });
});

describe('.json e .md com Fora de escopo', () => {
    it('.json leva fora_de_escopo dentro de estrutura_arvore', () => {
        const obj = JSON.parse(gerarJsonLivros([porTitulo(com, 'Livro Um')]));
        assert.equal(obj.itens[0].estrutura_arvore.fora_de_escopo.migrados.length, 1);
    });

    it('.md: bloco "Fora de escopo" com Migrados e Descartados, sem o corpo dos textos', () => {
        const md = gerarMarkdownLivros([porTitulo(com, 'Livro Um')]);
        assert.match(md, /\*\*Fora de escopo:\*\*/);
        assert.match(md, /Migrados:\n\n- Poema: Poema Mudado \(de Seção X · era a nº 2 na época/);
        assert.match(
            md,
            /Descartados:\n\n- Poema: Poema Cortado \(de Seção X · era a nº 3 na época\)/,
        );
        assert.match(md, /- Prosa: Prosa Solta\n/);
        assert.ok(!md.includes('CORPO'));
    });

    it('.md: livro sem nada diz "Nada fora de escopo."; sem a opção, o bloco não existe', () => {
        assert.match(gerarMarkdownLivros([porTitulo(com, 'Vazio')]), /Nada fora de escopo\./);
        assert.ok(!gerarMarkdownLivros([porTitulo(so, 'Livro Um')]).includes('Fora de escopo'));
    });

    it('Coletânea com as duas opções não ganha o bloco', () => {
        assert.ok(!gerarMarkdownLivros([porTitulo(com, 'Coletânea X')]).includes('Fora de escopo'));
    });

    it('o modelo dos documentos traz as linhas só quando há fora_de_escopo', () => {
        assert.equal(
            modeloDocumentoLivro(porTitulo(so, 'Livro Um')).estrutura.foraDeEscopo,
            undefined,
        );
        const f = modeloDocumentoLivro(porTitulo(com, 'Livro Um')).estrutura.foraDeEscopo;
        assert.equal(f.migrados[0].rotulo, 'Poema');
        assert.equal(f.descartados.length, 2);
    });
});

describe('.csv da estrutura com Fora de escopo', () => {
    const estrutura = (regs) => arquivosDoDownloadLivros(regs, 'csv').find((a) => a.sufixo);

    it('sem a opção, o cabeçalho é o de sempre', () => {
        const cab = estrutura(so).conteudo.split('\n')[0];
        assert.ok(!cab.includes('fora_de_escopo'));
    });

    it('com a opção, duas colunas no fim e uma linha por entrada', () => {
        const linhas = estrutura(com).conteudo.split(/\r?\n/);
        assert.match(linhas[0], /,fora_de_escopo,detalhe$/);
        const fora = linhas.filter((l) => l.includes('Fora de escopo'));
        assert.equal(fora.length, 3);
        assert.ok(fora.some((l) => l.includes(',migrado,') && l.includes('Poema Mudado')));
        assert.ok(fora.some((l) => l.includes(',descartado,') && l.includes('Prosa Solta')));
        assert.ok(!estrutura(com).conteudo.includes('CORPO'));
    });
});

function pdfFalso() {
    const reg = { textos: [], paginas: 1 };
    class JsPdfFalso {
        constructor() {
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
        }
        setPage() {}
        link() {}
        line() {}
        addImage() {}
    }
    return { JsPdfFalso, reg };
}

describe('.pdf com Fora de escopo', () => {
    it('com a opção: título, grupos e os itens, sem o corpo dos textos', () => {
        const { JsPdfFalso, reg } = pdfFalso();
        gerarPdfLivros([porTitulo(com, 'Livro Um')], JsPdfFalso);
        const todos = reg.textos.map((t) => t.t).join(' ');
        assert.match(todos, /Fora de escopo:/);
        assert.match(todos, /Migrados:/);
        assert.match(todos, /Descartados:/);
        assert.match(todos, /Mudado/);
        assert.match(todos, /Solta/);
        assert.ok(!todos.includes('CORPO'));
    });

    it('sem a opção, nada; livro vazio diz que não há nada', () => {
        const a = pdfFalso();
        gerarPdfLivros([porTitulo(so, 'Livro Um')], a.JsPdfFalso);
        assert.ok(!a.reg.textos.some((t) => /Fora/.test(t.t)));
        const b = pdfFalso();
        gerarPdfLivros([porTitulo(com, 'Vazio')], b.JsPdfFalso);
        assert.ok(b.reg.textos.some((t) => /Nada/.test(t.t)));
    });
});

describe('.docx com Fora de escopo', () => {
    before(() => instalarDocxReal());
    after(() => removerDocxReal());

    const xml = async (regs) => {
        const zip = await JSZip.loadAsync(await Packer.toBuffer(gerarDocxLivros(regs)));
        return zip.file('word/document.xml').async('string');
    };

    it('com a opção: título, grupos e itens, sem o corpo dos textos', async () => {
        const x = await xml([porTitulo(com, 'Livro Um')]);
        assert.match(x, /Fora de escopo:/);
        assert.match(x, /Migrados/);
        assert.match(x, /Descartados/);
        assert.match(x, /Poema: Poema Mudado/);
        assert.ok(!x.includes('CORPO'));
    });

    it('sem a opção, nada; livro vazio diz que não há nada', async () => {
        assert.ok(!(await xml([porTitulo(so, 'Livro Um')])).includes('Fora de escopo'));
        assert.match(await xml([porTitulo(com, 'Vazio')]), /Nada fora de escopo\./);
    });
});
