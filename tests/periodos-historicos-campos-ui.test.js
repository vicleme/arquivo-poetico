import './helpers/dom-real.js';

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// Esfera e Categoria dos Períodos Históricos na interface: filtros e cartões
// da aba, chips do modal, modal "Gerenciar", Visualização, exportação e
// Importação Aditiva.

document.body.innerHTML =
    '<div id="lista-periodos-historicos"></div><div id="filtros-periodo-periodosHistoricos"></div>' +
    '<span id="contagem-periodos-historicos"></span>';

const { db, mesclarPeriodosHistoricos } = await import('../js/db.js');
const R = await import('../js/render-listas.js');
const { preencherCamposPeriodoHistorico, lerCamposPeriodoHistorico } =
    await import('../js/periodo-historico-campos-ui.js');
const { salvarTudoOpcoesPeriodoHistorico, rastreadorOpcoesPeriodoHistorico } =
    await import('../js/periodo-historico-opcoes-ui.js');
const { renderVisualizacaoPeriodoHistoricoHtml } =
    await import('../js/visualizar-periodo-historico.js');
const { montarRegistro } = await import('../js/exportar.js');
const { gerarCsvTextos } = await import('../js/exportar-csv.js');
const { itemParaMarkdown } = await import('../js/exportar-md.js');
const { classificarImportacaoAditiva, aplicarImportacaoAditiva } =
    await import('../js/importar-aditivo.js');

const cadastro = () => [
    {
        id: 1,
        nome: 'Guerra Fria',
        regiao: [],
        esferas: ['Política'],
        categorias: ['Guerra e conflito'],
        pertenceA: [],
    },
    {
        id: 2,
        nome: 'Belle Époque',
        regiao: [],
        esferas: ['Artística e cultural', 'Social'],
        categorias: ['Movimento artístico'],
        pertenceA: [],
    },
    { id: 3, nome: 'Sem nada', regiao: [], esferas: [], categorias: [], pertenceA: [] },
];

const opcoes = () => ({
    esferas: ['Artística e cultural', 'Política', 'Social'],
    categorias: ['Guerra e conflito', 'Movimento artístico'],
});

const lista = () => document.getElementById('lista-periodos-historicos').innerHTML;
const select = (sufixo) => document.getElementById(`fp-periodosHistoricos-${sufixo}`);

describe('filtros Esfera e Categoria na aba', () => {
    beforeEach(() => {
        db.periodosHistoricos = cadastro();
        R.limparFiltrosPeriodosHistoricos();
    });

    it('monta os selects só com o que o cadastro usa, mais "sem valor"', () => {
        R.renderPeriodosHistoricos();
        const valores = (el) => [...el.options].map((o) => o.value);
        assert.deepEqual(valores(select('esfera')), [
            '',
            'Artística e cultural',
            'Política',
            'Social',
            '__vazio__',
        ]);
        assert.deepEqual(valores(select('categoria')), [
            '',
            'Guerra e conflito',
            'Movimento artístico',
            '__vazio__',
        ]);
    });

    it('filtra por esfera, conta e limpa', () => {
        R.renderPeriodosHistoricos();
        select('esfera').value = 'Política';
        R.setFiltroPeriodo('periodosHistoricos');
        assert.ok(lista().includes('Guerra Fria'));
        assert.ok(!lista().includes('Belle Époque'));
        assert.match(document.getElementById('contagem-periodos-historicos').textContent, /1 de 3/);
        R.limparFiltrosPeriodosHistoricos();
        assert.ok(lista().includes('Belle Époque'));
        assert.equal(select('esfera').value, '');
    });

    it('esfera e categoria combinam por E; "sem categoria" traz quem não tem', () => {
        R.renderPeriodosHistoricos();
        select('esfera').value = 'Social';
        select('categoria').value = 'Guerra e conflito';
        R.setFiltroPeriodo('periodosHistoricos');
        assert.ok(!lista().includes('Belle Époque'));
        assert.ok(!lista().includes('Guerra Fria'));
        R.limparFiltrosPeriodosHistoricos();
        select('categoria').value = '__vazio__';
        R.setFiltroPeriodo('periodosHistoricos');
        assert.ok(lista().includes('Sem nada'));
        assert.ok(!lista().includes('Guerra Fria'));
    });

    it('o cartão mostra as etiquetas e a busca por nome acha por esfera e categoria', () => {
        R.renderPeriodosHistoricos();
        assert.ok(lista().includes('Artística e cultural'));
        assert.ok(lista().includes('Movimento artístico'));
        document.getElementById('fp-periodosHistoricos-nome').value = 'guerra e conflito';
        R.setFiltroPeriodo('periodosHistoricos');
        assert.ok(lista().includes('Guerra Fria'));
        assert.ok(!lista().includes('Belle Époque'));
    });
});

describe('chips do modal do período', () => {
    beforeEach(() => {
        db.periodosHistoricos = cadastro();
        db.opcoesPeriodoHistorico = opcoes();
        document.body.insertAdjacentHTML(
            'beforeend',
            `<div id="ph-campos">
                <div id="ph-esferas-chips"></div><input id="ph-esferas-input" />
                <datalist id="sugestoes-ph-esferas"></datalist>
                <div id="ph-categorias-chips"></div><input id="ph-categorias-input" />
                <datalist id="sugestoes-ph-categorias"></datalist>
            </div>`,
        );
    });
    const limpar = () => document.getElementById('ph-campos')?.remove();

    it('abre com os valores do período e as sugestões sem os já escolhidos', () => {
        preencherCamposPeriodoHistorico(db.periodosHistoricos[1]);
        const chips = [...document.querySelectorAll('#ph-esferas-chips > span')].map(
            (c) => c.firstChild.textContent,
        );
        assert.deepEqual(chips, ['Artística e cultural', 'Social']);
        const sugestoes = [...document.querySelectorAll('#sugestoes-ph-esferas option')].map(
            (o) => o.value,
        );
        assert.deepEqual(sugestoes, ['Política']);
        limpar();
    });

    it('período novo abre vazio; o digitado e não confirmado também entra', () => {
        preencherCamposPeriodoHistorico(null);
        document.getElementById('ph-esferas-input').value = 'Religiosa';
        document.getElementById('ph-categorias-input').value = 'Cisma, Crise';
        assert.deepEqual(lerCamposPeriodoHistorico(), {
            esferas: ['Religiosa'],
            categorias: ['Cisma Crise'],
        });
        limpar();
    });

    it('remover um chip tira o valor', () => {
        preencherCamposPeriodoHistorico(db.periodosHistoricos[1]);
        document.querySelector('#ph-esferas-chips > span button').click();
        assert.deepEqual(lerCamposPeriodoHistorico().esferas, ['Social']);
        limpar();
    });
});

describe('modal Gerenciar: salvar tudo', () => {
    beforeEach(() => {
        db.periodosHistoricos = cadastro();
        db.opcoesPeriodoHistorico = opcoes();
        document.body.insertAdjacentHTML(
            'beforeend',
            `<div id="modal-opcoes-periodo-historico">
                <div id="oph-esferas-lista"></div><input id="oph-esferas-novo" />
                <div id="oph-categorias-lista"></div><input id="oph-categorias-novo" />
            </div>`,
        );
    });
    const limpar = () => document.getElementById('modal-opcoes-periodo-historico')?.remove();

    const linhaComInput = (tipo, valor) => {
        const input = document.createElement('input');
        input.dataset.nomeOriginal = valor;
        input.value = valor;
        document.getElementById(`oph-${tipo}-lista`).appendChild(input);
        return input;
    };

    it('aplica o novo valor digitado e o renomear pendente de uma vez', () => {
        const input = linhaComInput('esferas', 'Política');
        input.value = 'Poder';
        document.getElementById('oph-categorias-novo').value = 'Era';
        assert.equal(rastreadorOpcoesPeriodoHistorico.estaSujo(), true);
        assert.equal(salvarTudoOpcoesPeriodoHistorico(), true);
        assert.deepEqual(db.periodosHistoricos[0].esferas, ['Poder']);
        assert.ok(db.opcoesPeriodoHistorico.categorias.includes('Era'));
        limpar();
    });

    it('nome vazio ou já existente não aplica nada', () => {
        const input = linhaComInput('esferas', 'Política');
        input.value = 'Social';
        assert.equal(salvarTudoOpcoesPeriodoHistorico(), false);
        assert.deepEqual(db.periodosHistoricos[0].esferas, ['Política']);
        input.value = '  ';
        assert.equal(salvarTudoOpcoesPeriodoHistorico(), false);
        limpar();
    });
});

describe('Visualização', () => {
    it('mostra Esfera e Categoria; sem valor, a linha some', () => {
        const [guerra, , vazio] = cadastro();
        const com = renderVisualizacaoPeriodoHistoricoHtml(guerra);
        assert.ok(com.includes('Esfera'));
        assert.ok(com.includes('Política'));
        assert.ok(com.includes('Guerra e conflito'));
        const sem = renderVisualizacaoPeriodoHistoricoHtml(vazio);
        assert.ok(!sem.includes('Esfera'));
        assert.ok(!sem.includes('Categoria'));
    });
});

describe('exportação do texto', () => {
    beforeEach(() => {
        db.periodosHistoricos = cadastro();
    });
    const poema = (ids) => ({ id: 1, titulo: 'T', texto: 'a', periodosHistoricosIds: ids });

    it('JSON seletivo leva Esfera e Categoria de cada período', () => {
        const r = montarRegistro('poema', poema([2]));
        assert.deepEqual(r.periodosHistoricosResolvidos[0].esferas, [
            'Artística e cultural',
            'Social',
        ]);
        assert.deepEqual(r.periodosHistoricosResolvidos[0].categorias, ['Movimento artístico']);
    });

    it('CSV: colunas derivadas, somando os períodos do texto sem repetir', () => {
        const csv = gerarCsvTextos('poema', [montarRegistro('poema', poema([1, 2]))], db);
        const [cab, linha] = csv
            .replace(/^\u{FEFF}/u, '')
            .trim()
            .split(/\r?\n/);
        assert.match(cab, /periodo_historico_esferas,periodo_historico_categorias/);
        assert.ok(linha.includes('Política | Artística e cultural | Social'));
        assert.ok(linha.includes('Guerra e conflito | Movimento artístico'));
    });

    it('MD: linhas Esfera e Categoria do Período Histórico; sem período, nada', () => {
        const md = itemParaMarkdown({ ...poema([1, 2]), tipo: 'poema' }, 1);
        assert.match(md, /Esfera do Período Histórico.*Política, Artística e cultural, Social/);
        assert.match(md, /Categoria do Período Histórico.*Guerra e conflito, Movimento artístico/);
        const semPeriodo = itemParaMarkdown({ ...poema([]), tipo: 'poema' }, 1);
        assert.doesNotMatch(semPeriodo, /do Período Histórico/);
    });
});

describe('Importação Aditiva', () => {
    const dbVazio = () => ({
        poemas: [],
        prosas: [],
        pessoas: [],
        grupos: [],
        autores: [],
        epocas: [],
        periodosHistoricos: [],
        opcoesPeriodoHistorico: { esferas: [], categorias: [] },
        livros: [],
        escansoes: [],
        estruturasTextuais: [],
    });
    const poemaExportado = (resolvidos) => ({
        id: 1,
        tipo: 'poema',
        titulo: 'P',
        texto: 't',
        pessoas: [],
        autoria: [],
        gruposDiretosResolvidos: [],
        livrosResolvidos: [],
        contexto: { livro: null, parte: null, secao: null },
        periodosHistoricosResolvidos: resolvidos,
    });
    const importar = async (payload, destino) => {
        const relatorio = classificarImportacaoAditiva(payload, destino);
        const deps = { tirarSnapshotSeNecessario: mock.fn(async () => true), save: mock.fn() };
        await aplicarImportacaoAditiva(payload, relatorio, destino, deps);
    };

    it('período novo nasce com Esfera e Categoria do pacote e alimenta o vocabulário', async () => {
        const destino = dbVazio();
        await importar(
            {
                itens: [
                    poemaExportado([
                        {
                            id: 9,
                            nome: 'Guerra Fria',
                            caminho: 'Guerra Fria',
                            esferas: ['Política'],
                            categorias: ['Guerra e conflito'],
                        },
                    ]),
                ],
            },
            destino,
        );
        const p = destino.periodosHistoricos[0];
        assert.deepEqual(p.esferas, ['Política']);
        assert.deepEqual(p.categorias, ['Guerra e conflito']);
        assert.deepEqual(destino.opcoesPeriodoHistorico.esferas, ['Política']);
    });

    it('só o período do texto leva a classificação; o pai criado pelo caminho nasce vazio', async () => {
        const destino = dbVazio();
        await importar(
            {
                itens: [
                    poemaExportado([
                        {
                            id: 9,
                            nome: 'Segundo mandato',
                            caminho: 'Nova República › Segundo mandato',
                            esferas: ['Política'],
                            categorias: ['Regime político'],
                        },
                    ]),
                ],
            },
            destino,
        );
        const pai = destino.periodosHistoricos.find((p) => p.nome === 'Nova República');
        const filho = destino.periodosHistoricos.find((p) => p.nome === 'Segundo mandato');
        assert.deepEqual(pai.esferas, []);
        assert.deepEqual(filho.esferas, ['Política']);
    });

    it('pacote antigo, sem os campos, cria o período com listas vazias', async () => {
        const destino = dbVazio();
        await importar({ itens: [poemaExportado([{ id: 9, nome: 'X', caminho: 'X' }])] }, destino);
        assert.deepEqual(destino.periodosHistoricos[0].esferas, []);
        assert.deepEqual(destino.periodosHistoricos[0].categorias, []);
    });

    it('período que já existe no destino não é alterado', async () => {
        const destino = dbVazio();
        destino.periodosHistoricos.push({
            id: 100,
            nome: 'Guerra Fria',
            pertenceA: [],
            esferas: ['Social'],
            categorias: [],
        });
        await importar(
            {
                itens: [
                    poemaExportado([
                        {
                            id: 9,
                            nome: 'Guerra Fria',
                            caminho: 'Guerra Fria',
                            esferas: ['Política'],
                            categorias: ['Guerra e conflito'],
                        },
                    ]),
                ],
            },
            destino,
        );
        assert.equal(destino.periodosHistoricos.length, 1);
        assert.deepEqual(destino.periodosHistoricos[0].esferas, ['Social']);
    });
});

describe('mesclar dois períodos (db)', () => {
    it('o destino fica com a soma de Esfera e Categoria; a origem some', () => {
        const dbRef = {
            poemas: [],
            prosas: [],
            periodosHistoricos: [
                { id: 1, nome: 'A', esferas: ['Política'], categorias: ['Crise'], pertenceA: [] },
                {
                    id: 2,
                    nome: 'A',
                    esferas: ['Social', 'Política'],
                    categorias: ['Guerra e conflito'],
                    pertenceA: [],
                },
            ],
        };
        mesclarPeriodosHistoricos(dbRef, 2, 1);
        assert.equal(dbRef.periodosHistoricos.length, 1);
        assert.deepEqual(dbRef.periodosHistoricos[0].esferas, ['Política', 'Social']);
        assert.deepEqual(dbRef.periodosHistoricos[0].categorias, ['Crise', 'Guerra e conflito']);
    });
});
