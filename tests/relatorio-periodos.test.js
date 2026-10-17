import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    gerarMarkdownRelatorio,
    montarRelatorio,
    nomeDoArquivoDoRelatorio,
    normalizarOpcoesDoRelatorio,
    relatorioVazio,
    rotuloDoSeculo,
    textoDeHoje,
} from '../js/relatorio-periodos.js';

const HOJE = { ano: 2026, mes: 10, dia: 16 };

const dbHistoricos = () => ({
    periodosHistoricos: [
        { id: 1, nome: 'Romantismo', inicio: { ano: 1830 }, fim: { ano: 1880 }, pertenceA: [] },
        {
            id: 2,
            nome: 'Primeira geração',
            inicio: { ano: 1836 },
            fim: { ano: 1850 },
            pertenceA: [1],
        },
        { id: 3, nome: 'Sem data', pertenceA: [] },
        { id: 4, nome: 'Modernismo', inicio: { ano: 1922 }, fim: { ano: 1945 }, pertenceA: [] },
    ],
    poemas: [
        { id: 10, titulo: 'Poema A', periodosHistoricosIds: [2] },
        { id: 11, titulo: 'Poema B', periodosHistoricosIds: [1] },
    ],
    prosas: [{ id: 20, titulo: 'Prosa A', periodosHistoricosIds: [2] }],
    autores: [],
});

describe('relatorio-periodos: opções e nomes', () => {
    it('normaliza opções inválidas para o padrão', () => {
        assert.deepEqual(normalizarOpcoesDoRelatorio({ organizacao: 'x', textos: 'y' }), {
            organizacao: 'data',
            textos: 'contagem',
            incluirOcultos: false,
        });
    });

    it('nome de arquivo em minúsculas e sem acento', () => {
        assert.equal(
            nomeDoArquivoDoRelatorio('periodosHistoricos', 'arvore', 'md'),
            'periodos-historicos-em-arvore.md',
        );
        assert.equal(
            nomeDoArquivoDoRelatorio('correntes', 'data', 'pdf'),
            'correntes-literarias-por-data.pdf',
        );
    });

    it('formata a data de hoje e o século', () => {
        assert.equal(textoDeHoje({ ano: 2026, mes: 3, dia: 5 }), '05/03/2026');
        assert.equal(rotuloDoSeculo(1830), 'Século XIX');
        assert.equal(rotuloDoSeculo(1900), 'Século XIX');
        assert.equal(rotuloDoSeculo(1901), 'Século XX');
        assert.equal(rotuloDoSeculo(null), 'Sem data');
    });
});

describe('relatorio-periodos: Períodos Históricos', () => {
    it('por data agrupa por século e deixa o sem data no fim', () => {
        const m = montarRelatorio(
            'periodosHistoricos',
            dbHistoricos(),
            { organizacao: 'data' },
            HOJE,
        );
        const titulos = m.grupos[0].secoes.map((s) => s.titulo);
        assert.deepEqual(titulos, ['Século XIX', 'Século XX', 'Sem data']);
    });

    it('em árvore mantém o filho sob o pai, com nível', () => {
        const m = montarRelatorio(
            'periodosHistoricos',
            dbHistoricos(),
            { organizacao: 'arvore' },
            HOJE,
        );
        const itens = m.grupos[0].secoes[0].itens;
        const iPai = itens.findIndex((i) => i.nome === 'Romantismo');
        assert.equal(itens[iPai + 1].nome, 'Primeira geração');
        assert.equal(itens[iPai + 1].nivel, 1);
    });

    it('o pai conta os textos de dentro, cada texto uma vez', () => {
        const m = montarRelatorio(
            'periodosHistoricos',
            dbHistoricos(),
            { organizacao: 'arvore' },
            HOJE,
        );
        const itens = m.grupos[0].secoes[0].itens;
        assert.equal(itens.find((i) => i.nome === 'Romantismo').textos.total, 3);
        assert.equal(itens.find((i) => i.nome === 'Primeira geração').textos.total, 2);
    });

    it('markdown tem título, data de exportação e sem travessão', () => {
        const md = gerarMarkdownRelatorio(
            'periodosHistoricos',
            dbHistoricos(),
            { organizacao: 'data', textos: 'titulos' },
            HOJE,
        );
        assert.match(md, /^# Períodos Históricos/);
        assert.match(md, /Exportado em 16\/10\/2026/);
        assert.match(md, /### Romantismo/);
        assert.match(md, /- \*\*Textos:\*\* 3 \(2 poemas, 1 prosa\)/);
        assert.match(md, / {2}- Poema A \(poema\)/);
        assert.doesNotMatch(md, /—/);
    });

    it('com textos "nenhum" não escreve a linha de textos', () => {
        const md = gerarMarkdownRelatorio(
            'periodosHistoricos',
            dbHistoricos(),
            { textos: 'nenhum' },
            HOJE,
        );
        assert.doesNotMatch(md, /\*\*Textos:\*\*/);
    });
});

describe('relatorio-periodos: em andamento e em aberto', () => {
    const db = () => ({
        autores: [],
        poemas: [],
        prosas: [],
        periodosHistoricos: [
            {
                id: 1,
                nome: 'Andamento',
                inicio: { ano: 2024, mes: 3 },
                emAndamento: true,
                pertenceA: [],
            },
            {
                id: 2,
                nome: 'Aberto',
                inicio: { ano: 2024, mes: 3 },
                emAndamento: true,
                emAberto: true,
                pertenceA: [],
            },
            {
                id: 3,
                nome: 'Terminou hoje',
                inicio: { ano: 2024, mes: 3 },
                fim: { ano: 2026, mes: 10, dia: 16 },
                pertenceA: [],
            },
        ],
    });
    const datasDe = (md, nome) => new RegExp(`### ${nome}\\n- \\*\\*Datas:\\*\\* (.*)`).exec(md)[1];

    it('cada marca vem escrita junto da data da exportação', () => {
        const md = gerarMarkdownRelatorio('periodosHistoricos', db(), { textos: 'nenhum' }, HOJE);
        assert.match(
            datasDe(md, 'Andamento'),
            /\(2 anos e 7 meses, em andamento, até 16\/10\/2026\)/,
        );
        assert.match(datasDe(md, 'Aberto'), /\(2 anos e 7 meses, em aberto, até 16\/10\/2026\)/);
    });

    it('o que terminou na data da exportação não leva marca', () => {
        const md = gerarMarkdownRelatorio('periodosHistoricos', db(), { textos: 'nenhum' }, HOJE);
        const datas = datasDe(md, 'Terminou hoje');
        assert.doesNotMatch(datas, /em andamento|em aberto/);
        assert.match(datas, /16\/10\/2026/);
    });
});

describe('relatorio-periodos: ocultos e vazio', () => {
    const dbEpocas = () => ({
        autores: [{ id: 1, nome: 'Autor Um' }],
        epocas: [
            {
                id: 1,
                autorId: 1,
                nome: 'Infância',
                inicio: { ano: 1900 },
                fim: { ano: 1910 },
                pertenceA: [],
            },
            {
                id: 2,
                autorId: 1,
                nome: 'Secreto',
                inicio: { ano: 1905 },
                fim: { ano: 1906 },
                pertenceA: [1],
                oculto: true,
            },
        ],
        poemas: [{ id: 5, titulo: 'P', periodosBiograficos: [{ epocaId: 2 }] }],
        prosas: [],
    });

    it('oculto fica de fora por padrão e seu texto não vaza para o pai', () => {
        const m = montarRelatorio('epocas', dbEpocas(), { organizacao: 'arvore' }, HOJE);
        const itens = m.grupos[0].secoes[0].itens;
        assert.deepEqual(
            itens.map((i) => i.nome),
            ['Infância'],
        );
        assert.equal(itens[0].textos.total, 0);
        assert.equal(m.grupos[0].titulo, 'Autor Um');
    });

    it('com incluirOcultos o oculto entra', () => {
        const m = montarRelatorio(
            'epocas',
            dbEpocas(),
            { organizacao: 'arvore', incluirOcultos: true },
            HOJE,
        );
        assert.equal(m.grupos[0].secoes[0].itens.length, 2);
    });

    it('cada tipo tem a frase certa de relatório vazio', () => {
        const vazio = { epocas: [], periodosHistoricos: [], movimentosEscolas: [], autores: [] };
        const md = gerarMarkdownRelatorio('correntes', vazio, {}, HOJE);
        assert.ok(relatorioVazio(montarRelatorio('correntes', vazio, {}, HOJE)));
        assert.match(md, /Nenhuma corrente literária cadastrada ainda\./);
        assert.match(
            gerarMarkdownRelatorio('epocas', vazio, {}, HOJE),
            /Nenhum período biográfico/,
        );
    });
});

describe('relatorio-periodos: Correntes', () => {
    it('lista autores e herança de tipo', () => {
        const db = {
            autores: [{ id: 7, nome: 'Ana', movimentosEscolasIds: [2] }],
            movimentosEscolas: [
                {
                    id: 1,
                    nome: 'Simbolismo',
                    inicio: { ano: 1880 },
                    fim: { ano: 1910 },
                    tipo: 'Escola',
                },
                { id: 2, nome: 'Subcorrente', paiId: 1, inicio: { ano: 1890 }, fim: { ano: 1900 } },
            ],
            poemas: [],
            prosas: [],
        };
        const md = gerarMarkdownRelatorio(
            'correntes',
            db,
            { organizacao: 'arvore', textos: 'titulos' },
            HOJE,
        );
        assert.match(md, /Simbolismo/);
        assert.match(md, /\*\*Autores:\*\* 1 \(Ana\)/);
        assert.match(md, /\*\*Dentro de:\*\*|### Subcorrente|#### Subcorrente/);
    });
});

describe('relatorio-periodos: árvore funda no Markdown', () => {
    const item = (nome, nivel, extra = {}) => ({
        id: nome,
        nome,
        evento: false,
        nivel,
        datas: null,
        dentroDe: null,
        tambemEm: [],
        detalhes: [],
        notas: '',
        textos: { poemas: [], prosas: [] },
        autores: null,
        ...extra,
    });

    const modelo = (itens, textos = 'contagem') => ({
        tipo: 'periodosHistoricos',
        titulo: 'Períodos Históricos',
        organizacao: 'arvore',
        textos,
        hoje: null,
        grupos: [{ titulo: null, secoes: [{ titulo: null, itens }] }],
    });

    // Sem título de grupo, o nível 0 vira ## (nível 2): o 6º nível é o item 4
    // e o item de nível 5 já passa do limite do Markdown.
    const cadeia = () => [
        item('N0', 0),
        item('N1', 1),
        item('N2', 2),
        item('N3', 3),
        item('N4', 4),
        item('N5', 5, { datas: { texto: '2000' } }),
        item('N6', 6, { evento: true }),
        item('Irmão de N5', 5),
    ];

    it('até o 6º nível segue em títulos', async () => {
        const { relatorioParaMarkdown } = await import('../js/relatorio-periodos.js');
        const md = relatorioParaMarkdown(modelo(cadeia()));
        assert.match(md, /^## N0$/m);
        assert.match(md, /^###### N4$/m);
    });

    it('do 7º nível em diante vira marcador recuado, sem passar de ######', async () => {
        const { relatorioParaMarkdown } = await import('../js/relatorio-periodos.js');
        const md = relatorioParaMarkdown(modelo(cadeia()));
        assert.ok(!/^#######/m.test(md));
        assert.match(md, /^- \*\*N5\*\*$/m);
        assert.match(md, /^ {2}- \*\*Datas:\*\* 2000$/m);
        // Neto: um recuo a mais e os campos mais recuados ainda.
        assert.match(md, /^ {2}- \*\*N6 \(evento\)\*\*$/m);
        assert.match(md, /^ {4}- \*\*Textos:\*\* /m);
        // Irmão do N5 volta ao recuo do N5.
        assert.match(md, /^- \*\*Irmão de N5\*\*$/m);
    });

    it('cola os marcadores ao título do pai, sem linha em branco no meio', async () => {
        const { relatorioParaMarkdown } = await import('../js/relatorio-periodos.js');
        const md = relatorioParaMarkdown(modelo(cadeia()));
        const bloco = md.split('\n\n').find((b) => b.startsWith('###### N4'));
        assert.ok(bloco.includes('- **N5**'));
        assert.ok(bloco.includes('  - **N6 (evento)**'));
        assert.ok(bloco.includes('- **Irmão de N5**'));
    });

    it('lista de títulos de textos também fica recuada', async () => {
        const { relatorioParaMarkdown } = await import('../js/relatorio-periodos.js');
        const itens = cadeia();
        itens[5].textos = { poemas: [{ titulo: 'Poema X' }], prosas: [{ titulo: 'Prosa Y' }] };
        const md = relatorioParaMarkdown(modelo(itens, 'titulos'));
        assert.match(md, /^ {4}- Poema X \(poema\)$/m);
        assert.match(md, /^ {4}- Prosa Y \(prosa\)$/m);
    });
});
