import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ui-relatorio-periodos.js importa db.js, que lê o localStorage ao carregar.
globalThis.localStorage ??= {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
};
globalThis.document ??= { addEventListener: () => {}, getElementById: () => null };

const {
    arquivosDoRelatorio,
    descreverArquivo,
    gerarArquivosDoRelatorio,
    podeBaixar,
    tipoTemOcultos,
} = await import('../js/ui-relatorio-periodos.js');

const HOJE = { ano: 2026, mes: 10, dia: 16 };

describe('ui-relatorio-periodos: lista de arquivos', () => {
    it('um arquivo por organização marcada', () => {
        const a = arquivosDoRelatorio('periodosHistoricos', {
            organizacoes: ['arvore', 'data'],
            formatos: ['md'],
        });
        assert.deepEqual(
            a.map((x) => x.nome),
            ['periodos-historicos-por-data.md', 'periodos-historicos-em-arvore.md'],
        );
    });

    it('combina organização e formato: dois por dois dão quatro arquivos', () => {
        const a = arquivosDoRelatorio('correntes', {
            organizacoes: ['data', 'arvore'],
            formatos: ['pdf', 'md'],
        });
        assert.deepEqual(
            a.map((x) => x.nome),
            [
                'correntes-literarias-por-data.md',
                'correntes-literarias-por-data.pdf',
                'correntes-literarias-em-arvore.md',
                'correntes-literarias-em-arvore.pdf',
            ],
        );
    });

    it('ignora organização e formato desconhecidos', () => {
        const a = arquivosDoRelatorio('correntes', {
            organizacoes: ['data', 'xis'],
            formatos: ['md', 'docx', 'odt'],
        });
        assert.equal(a.length, 1);
        assert.equal(a[0].nome, 'correntes-literarias-por-data.md');
    });

    it('sem nada marcado não há arquivo e o botão fica travado', () => {
        const a = arquivosDoRelatorio('epocas', { organizacoes: [], formatos: ['md'] });
        assert.equal(a.length, 0);
        assert.equal(podeBaixar(a), false);
    });

    it('o botão trava enquanto há download em andamento', () => {
        const a = arquivosDoRelatorio('epocas', { organizacoes: ['data'], formatos: ['md'] });
        assert.equal(podeBaixar(a, false), true);
        assert.equal(podeBaixar(a, true), false);
    });

    it('descreve o arquivo sem travessão', () => {
        const [a] = arquivosDoRelatorio('epocas', { organizacoes: ['arvore'], formatos: ['md'] });
        assert.equal(descreverArquivo(a), 'periodos-biograficos-em-arvore.md (em árvore)');
    });

    it('só o Período Biográfico tem ocultos', () => {
        assert.equal(tipoTemOcultos('epocas'), true);
        assert.equal(tipoTemOcultos('correntes'), false);
        assert.equal(tipoTemOcultos('periodosHistoricos'), false);
    });
});

describe('ui-relatorio-periodos: geração', () => {
    const dbRef = {
        periodosHistoricos: [{ id: 1, nome: 'Romantismo', inicio: { ano: 1830 }, pertenceA: [] }],
        poemas: [],
        prosas: [],
        autores: [],
    };

    it('gera todos os arquivos com conteúdo e tipo', async () => {
        const saida = await gerarArquivosDoRelatorio(
            'periodosHistoricos',
            { organizacoes: ['data', 'arvore'], formatos: ['md'], textos: 'contagem' },
            dbRef,
            HOJE,
        );
        assert.equal(saida.length, 2);
        assert.match(saida[0].conteudo, /Linha do tempo por data/);
        assert.match(saida[1].conteudo, /Linha do tempo em árvore/);
        assert.equal(saida[0].mime, 'text/markdown');
    });

    it('o PDF sai com o tipo certo e usa o gerador de PDF', async () => {
        const saida = await gerarArquivosDoRelatorio(
            'periodosHistoricos',
            { organizacoes: ['data'], formatos: ['md', 'pdf'], textos: 'nenhum' },
            dbRef,
            HOJE,
            { md: () => 'texto', pdf: async () => new Uint8Array([37, 80, 68, 70]) },
        );
        assert.deepEqual(
            saida.map((x) => [x.formato, x.mime]),
            [
                ['md', 'text/markdown'],
                ['pdf', 'application/pdf'],
            ],
        );
        assert.equal(saida[1].conteudo.length, 4);
    });

    it('se um gerador falha, nada é devolvido', async () => {
        await assert.rejects(
            gerarArquivosDoRelatorio(
                'periodosHistoricos',
                { organizacoes: ['data', 'arvore'], formatos: ['md'], textos: 'contagem' },
                dbRef,
                HOJE,
                {
                    md: (tipo, d, opcoes) => {
                        if (opcoes.organizacao === 'arvore') throw new Error('falhou');
                        return 'ok';
                    },
                },
            ),
            /falhou/,
        );
    });
});

describe('ui-relatorio-periodos: ligação com a página', () => {
    const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const ler = (arq) => fs.readFileSync(path.join(RAIZ, arq), 'utf8');

    it('as três abas têm o botão Baixar relatório', () => {
        const html = ler('index.html');
        ['epocas', 'periodosHistoricos', 'correntes'].forEach((tipo) => {
            assert.ok(html.includes(`abrirModalRelatorioPeriodos('${tipo}')`), tipo);
        });
    });

    it('o main.js registra o modal e liga as três funções no window', () => {
        const main = ler('js/main.js');
        assert.match(main, /registrarModal\('modal-relatorio-periodos'/);
        [
            'abrirModalRelatorioPeriodos',
            'atualizarModalRelatorioPeriodos',
            'baixarRelatorioPeriodos',
        ].forEach((f) => assert.ok(main.includes(`window.${f} = ${f};`), f));
    });

    it('o modal traz os ids que o módulo usa', () => {
        const modal = ler('modais/modal-relatorio-periodos.html');
        [
            'rel-per-org-data',
            'rel-per-org-arvore',
            'rel-per-fmt-md',
            'rel-per-fmt-pdf',
            'rel-per-textos-contagem',
            'rel-per-ocultos',
            'rel-per-bloco-ocultos',
            'rel-per-arquivos',
            'rel-per-aviso-varios',
            'rel-per-baixar',
            'rel-per-intro',
            'modal-relatorio-periodos-titulo',
        ].forEach((id) => assert.ok(modal.includes(`id="${id}"`), id));
    });
});
