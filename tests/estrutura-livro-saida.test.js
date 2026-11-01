import './helpers/dom-real.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// T3, entrega 1: a estrutura do livro só com títulos nas saídas (.json, .md e
// .csv), com a opção `incluirEstrutura`. Sem a opção, nada muda.

const { estruturaDeTitulos, linhasDaEstrutura, estruturaParaMarkdown } =
    await import('../js/estrutura-livro-saida.js');
const { montarArvoreDoLivro, tituloDoNo, rotuloTipoDoNo } =
    await import('../js/estrutura-livro.js');
const {
    montarRegistroLivro,
    registrosDeLivros,
    gerarJsonLivros,
    livroParaMarkdown,
    modeloDocumentoLivro,
    conteudoDoDownloadLivros,
    arquivosDoDownloadLivros,
} = await import('../js/exportar-livros.js');

function banco() {
    return {
        livros: [
            { id: 1, tipo: 'Livro', titulo: 'Casa de Vidro', sequencia: 1 },
            { id: 2, tipo: 'Coletânea', titulo: 'Seleta' },
            { id: 3, tipo: 'Livro', titulo: 'Vazio' },
        ],
        partes: [
            { id: 10, livroId: 1, titulo: 'Parte I', sequencia: 2 },
            { id: 11, livroId: 1, titulo: 'Parte II', sequencia: 3 },
            { id: 12, livroId: 2, titulo: 'Parte única', sequencia: 1 },
        ],
        secoes: [{ id: 20, paiTipo: 'parte', paiId: 10, titulo: 'Seção A', sequencia: 1 }],
        elementos: [
            {
                id: 30,
                paiTipo: 'livro',
                paiId: 1,
                tipo: 'Epígrafe',
                titulo: 'De alguém',
                sequencia: 1,
            },
        ],
        poemas: [
            {
                id: 40,
                paiTipo: 'secao',
                paiId: 20,
                titulo: 'Poema na seção',
                texto: 'SEGREDO UM',
                sequencia: 1,
            },
            {
                id: 41,
                paiTipo: 'parte',
                paiId: 11,
                titulo: 'Poema direto',
                texto: 'SEGREDO DOIS',
                sequencia: 1,
            },
            { id: 42, paiTipo: null, titulo: 'Poema solto', texto: 'SEGREDO TRES', livrosIds: [1] },
        ],
        prosas: [
            {
                id: 50,
                paiTipo: 'secao',
                paiId: 20,
                titulo: 'Prosa na seção',
                texto: 'SEGREDO',
                sequencia: 2,
            },
        ],
        itensColetanea: [
            {
                id: 60,
                parteId: 12,
                refTipo: 'poema',
                refId: 40,
                titulo: 'Poema na seção',
                sequencia: 1,
            },
            { id: 61, parteId: 12, titulo: 'Inédito da seleta', sequencia: 2 },
        ],
        autores: [],
        colaboradores: [],
    };
}

const livro = (b, id) => b.livros.find((l) => l.id === id);

describe('estruturaDeTitulos', () => {
    it('mantém a ordem e o aninhamento da árvore, só com títulos', () => {
        const b = banco();
        const e = estruturaDeTitulos(montarArvoreDoLivro(b, 1));
        assert.deepEqual(
            e.arvore.map((n) => [n.tipo, n.titulo]),
            [
                ['elemento', 'Epígrafe: De alguém'],
                ['parte', 'Parte I'],
                ['parte', 'Parte II'],
            ],
        );
        const parteI = e.arvore[1];
        assert.deepEqual(
            parteI.filhos.map((n) => [n.tipo, n.titulo]),
            [['secao', 'Seção A']],
        );
        assert.deepEqual(
            parteI.filhos[0].filhos.map((n) => [n.tipo, n.titulo]),
            [
                ['poema', 'Poema na seção'],
                ['prosa', 'Prosa na seção'],
            ],
        );
    });

    it('nunca leva o texto dos poemas e prosas', () => {
        const e = estruturaDeTitulos(montarArvoreDoLivro(banco(), 1));
        assert.ok(!JSON.stringify(e).includes('SEGREDO'));
    });

    it('poema ligado só por livrosIds sai em vinculados, fora da árvore', () => {
        const e = estruturaDeTitulos(montarArvoreDoLivro(banco(), 1));
        assert.deepEqual(e.vinculados, [{ tipo: 'poema', titulo: 'Poema solto' }]);
    });

    it('Coletânea: Partes e itens, com o tipo do item (poema, prosa ou inédito)', () => {
        const e = estruturaDeTitulos(montarArvoreDoLivro(banco(), 2));
        assert.equal(e.arvore.length, 1);
        assert.deepEqual(
            e.arvore[0].filhos.map((n) => [n.tipo, n.titulo]),
            [
                ['poema', 'Poema na seção'],
                ['inédito', 'Inédito da seleta'],
            ],
        );
    });

    it('usa os mesmos títulos e tipos do Ver do livro', () => {
        const no = { tipo: 'elemento', dados: { tipo: 'Pórtico', titulo: 'X' } };
        assert.equal(tituloDoNo(no), 'Pórtico: X');
        assert.equal(rotuloTipoDoNo({ tipo: 'item', dados: {} }), 'inédito');
    });
});

describe('linhasDaEstrutura e Markdown', () => {
    it('achata com nível e caminho', () => {
        const e = estruturaDeTitulos(montarArvoreDoLivro(banco(), 1));
        const linhas = linhasDaEstrutura(e);
        const poema = linhas.find((l) => l.titulo === 'Poema na seção');
        assert.equal(poema.nivel, 3);
        assert.deepEqual(poema.caminho, ['Parte I', 'Seção A', 'Poema na seção']);
    });

    it('lista aninhada com dois espaços por nível; elemento sem rótulo repetido', () => {
        const e = estruturaDeTitulos(montarArvoreDoLivro(banco(), 1));
        const { corpo, vinculados } = estruturaParaMarkdown(e);
        assert.equal(
            corpo,
            [
                '- Epígrafe: De alguém',
                '- Parte: Parte I',
                '  - Seção: Seção A',
                '    - Poema: Poema na seção',
                '    - Prosa: Prosa na seção',
                '- Parte: Parte II',
                '  - Poema: Poema direto',
            ].join('\n'),
        );
        assert.equal(vinculados, '- Poema: Poema solto');
    });
});

describe('registro do livro com e sem a opção', () => {
    it('sem a opção, o registro não ganha estrutura_arvore (o que existe não muda)', () => {
        const b = banco();
        const r = montarRegistroLivro(livro(b, 1), b);
        assert.equal('estrutura_arvore' in r, false);
        assert.equal(r.estrutura.partes, 2);
    });

    it('com a opção, leva estrutura_arvore e mantém a contagem', () => {
        const b = banco();
        const r = montarRegistroLivro(livro(b, 1), b, { incluirEstrutura: true });
        assert.equal(r.estrutura.partes, 2);
        assert.equal(r.estrutura_arvore.arvore.length, 3);
    });

    it('registrosDeLivros repassa a opção a todos', () => {
        const b = banco();
        const rs = registrosDeLivros(b.livros, b, { incluirEstrutura: true });
        assert.ok(rs.every((r) => r.estrutura_arvore));
    });
});

describe('.json, .md e modelo', () => {
    it('.json: estrutura_arvore aninhada, sem o texto dos poemas', () => {
        const b = banco();
        const json = gerarJsonLivros(
            registrosDeLivros([livro(b, 1)], b, { incluirEstrutura: true }),
        );
        const item = JSON.parse(json).itens[0];
        assert.equal(item.estrutura_arvore.arvore[1].filhos[0].filhos[0].titulo, 'Poema na seção');
        assert.ok(!json.includes('SEGREDO'));
    });

    it('.json sem a opção não tem a chave', () => {
        const b = banco();
        const json = gerarJsonLivros(registrosDeLivros([livro(b, 1)], b));
        assert.ok(!json.includes('estrutura_arvore'));
    });

    it('.md: blocos Estrutura e Vinculados depois dos textos do livro', () => {
        const b = banco();
        const [r] = registrosDeLivros([livro(b, 1)], b, { incluirEstrutura: true });
        const md = livroParaMarkdown(r);
        assert.match(md, /\*\*Estrutura:\*\*\n\n- Epígrafe: De alguém\n- Parte: Parte I\n/);
        assert.match(md, /\*\*Vinculados, sem posição na estrutura:\*\*\n\n- Poema: Poema solto\n/);
    });

    it('.md: livro vazio diz "Sem conteúdo." e não abre bloco de vinculados', () => {
        const b = banco();
        const [r] = registrosDeLivros([livro(b, 3)], b, { incluirEstrutura: true });
        const md = livroParaMarkdown(r);
        assert.match(md, /\*\*Estrutura:\*\*\n\nSem conteúdo\.\n/);
        assert.ok(!md.includes('Vinculados'));
    });

    it('.md sem a opção é o de antes', () => {
        const b = banco();
        const [r] = registrosDeLivros([livro(b, 1)], b);
        assert.ok(!livroParaMarkdown(r).includes('Estrutura:'));
    });

    it('modelo do documento (.md, .pdf e .docx) só ganha estrutura com a opção', () => {
        const b = banco();
        const com = modeloDocumentoLivro(
            registrosDeLivros([livro(b, 1)], b, { incluirEstrutura: true })[0],
        );
        assert.equal(com.estrutura.linhas.length, 7);
        assert.deepEqual(com.estrutura.vinculados, [{ rotulo: 'Poema', titulo: 'Poema solto' }]);
        const sem = modeloDocumentoLivro(registrosDeLivros([livro(b, 1)], b)[0]);
        assert.equal('estrutura' in sem, false);
    });
});

describe('.csv da estrutura (arquivo à parte)', () => {
    function linhasCsv(arquivo) {
        const c = arquivo.conteudo;
        const limpo = c.charCodeAt(0) === 0xfeff ? c.slice(1) : c;
        return limpo
            .trim()
            .split('\r\n')
            .map((l) => l.split(','));
    }
    const comOpcao = (ids) => {
        const b = banco();
        return registrosDeLivros(
            b.livros.filter((l) => ids.includes(l.id)),
            b,
            { incluirEstrutura: true },
        );
    };

    it('sem a opção, o .csv é um arquivo só, o largo de sempre', () => {
        const b = banco();
        const arquivos = arquivosDoDownloadLivros(registrosDeLivros([livro(b, 1)], b), 'csv');
        assert.equal(arquivos.length, 1);
        assert.equal(arquivos[0].sufixo, '');
        assert.equal(linhasCsv(arquivos[0]).length, 2);
        assert.ok(linhasCsv(arquivos[0])[0].includes('sinopse'));
    });

    it('com a opção, saem dois: o largo (inalterado) e o -estrutura', () => {
        const arquivos = arquivosDoDownloadLivros(comOpcao([1]), 'csv');
        assert.deepEqual(
            arquivos.map((a) => [a.sufixo, a.extensao]),
            [
                ['', 'csv'],
                ['-estrutura', 'csv'],
            ],
        );
        const largo = linhasCsv(arquivos[0]);
        assert.equal(largo.length, 2);
        assert.ok(largo[0].includes('sinopse'));
        assert.ok(!largo[0].includes('caminho'));
    });

    it('conteudoDoDownloadLivros segue devolvendo o largo, com ou sem a opção', () => {
        const { conteudo } = conteudoDoDownloadLivros(comOpcao([1]), 'csv');
        assert.ok(conteudo.includes('sinopse'));
        assert.ok(!conteudo.includes('caminho'));
    });

    it('as outras saídas continuam em um arquivo só, mesmo com a opção', () => {
        assert.equal(arquivosDoDownloadLivros(comOpcao([1]), 'json').length, 1);
        assert.equal(arquivosDoDownloadLivros(comOpcao([1]), 'md').length, 1);
        assert.deepEqual(arquivosDoDownloadLivros(comOpcao([1]), 'xyz'), []);
    });

    it('o -estrutura tem uma linha por nó, com nível e caminho', () => {
        const l = linhasCsv(arquivosDoDownloadLivros(comOpcao([1]), 'csv')[1]);
        assert.deepEqual(l[0], [
            'livro_id',
            'livro',
            'nivel',
            'tipo',
            'titulo',
            'caminho',
            'sequencia',
            'vinculado',
        ]);
        assert.deepEqual(l[1].slice(0, 5), ['1', 'Casa de Vidro', '0', 'livro', 'Casa de Vidro']);
        const poema = l.find((x) => x[4] === 'Poema na seção');
        assert.equal(poema[2], '3');
        assert.equal(poema[5], 'Casa de Vidro › Parte I › Seção A › Poema na seção');
        const solto = l.find((x) => x[4] === 'Poema solto');
        assert.equal(solto[7], 'sim');
        assert.equal(l.length, 1 + 1 + 7 + 1);
    });

    it('Coletânea sai com tipo "coletânea" na linha do nível 0', () => {
        const l = linhasCsv(arquivosDoDownloadLivros(comOpcao([2]), 'csv')[1]);
        assert.equal(l[1][3], 'coletânea');
    });

    it('vários livros: cada nó leva o id e o título do livro dele', () => {
        const l = linhasCsv(arquivosDoDownloadLivros(comOpcao([1, 2, 3]), 'csv')[1]);
        assert.deepEqual([...new Set(l.slice(1).map((x) => x[0]))], ['1', '2', '3']);
    });
});
