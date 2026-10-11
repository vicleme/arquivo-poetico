import './helpers/localstorage-shim.js';
import './helpers/dom-shim.js';

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { db } from '../js/db.js';
import {
    contarPorAno,
    contarPorMesEscrita,
    distribuicaoPorTrimestre,
    sazonalidadePorAno,
    contarPorLivro,
    contarPorTema,
    contarPorPessoa,
    agregarPorPessoa,
    agregarPessoaPorAno,
    palavrasMaisFrequentes,
    resumoLinguagem,
    resumoGeral,
    filtrarPorIntervalo,
    filtrarOcultos,
    getTiposEtiquetaSelecionados,
    toggleTipoEtiqueta,
    separacaoTerceirosAtiva,
    ehTextoDeTerceiros,
    contarTerceiros,
    getIncluirTerceiros,
    definirIncluirTerceiros,
    getModoTerceiros,
    agregarPorAssunto,
    definirModoTerceiros,
    getModoGraficoPessoas,
    getPapelTemaEstatisticas,
    definirPapelTemaEstatisticas,
    getPapelAssuntoEstatisticas,
    definirPapelAssuntoEstatisticas,
    agregarPorTema,
    agregarTemaPorAno,
    anosDistintosPorTema,
    definirModoGraficoPessoas,
    getGruposFiltroPessoas,
    toggleGrupoFiltroPessoas,
    getOcultosGrafico,
    toggleOcultoItem,
    restaurarOcultosGrafico,
    getFiltrosCompartilhados,
    definirFiltrosCompartilhados,
    limparFiltrosCompartilhados,
    contarTextosFiltrados,
    getModoColunasCoocorrencia,
    definirModoColunasCoocorrencia,
    getTemasColunasSelecionados,
    toggleTemaColunaCoocorrencia,
    selecionarTodosTemasColunas,
    limparTemasColunas,
} from '../js/estatisticas.js';

function resetarDb() {
    db.livros = [];
    db.partes = [];
    db.secoes = [];
    db.poemas = [];
    db.prosas = [];
    db.elementos = [];
    db.coletaneas = [];
    db.itensColetanea = [];
    db.pessoas = [];
    db.grupos = [];
    db.autores = [];
    db.assuntos = [];
    localStorage.clear(); // zera tipos/modo/grupo-filtro/ocultos salvos por um teste anterior
}

// ─── contarPorAno ───────────────────────────────────────────────

describe('contarPorAno', () => {
    beforeEach(resetarDb);

    it('acervo vazio retorna listas vazias', () => {
        assert.deepEqual(contarPorAno(), { labels: [], data: [] });
    });

    it('conta poemas e prosas juntos, agrupando por ano', () => {
        db.poemas = [{ ano: 2020 }, { ano: 2020 }, { ano: 2021 }];
        db.prosas = [{ ano: 2020 }];
        assert.deepEqual(contarPorAno(), { labels: ['2020', '2021'], data: [3, 1] });
    });

    it('anos vêm ordenados crescentemente, independente da ordem de inserção', () => {
        db.poemas = [{ ano: 2023 }, { ano: 2019 }, { ano: 2021 }];
        assert.deepEqual(contarPorAno().labels, ['2019', '2021', '2023']);
    });

    it('itens sem ano (null/undefined/0/string vazia) são ignorados', () => {
        db.poemas = [{ ano: null }, { ano: undefined }, { ano: '' }, { ano: 0 }, { ano: 2020 }];
        assert.deepEqual(contarPorAno(), { labels: ['2020'], data: [1] });
    });

    it('ano como string numérica é convertido corretamente', () => {
        db.poemas = [{ ano: '2020' }, { ano: '2020' }];
        assert.deepEqual(contarPorAno(), { labels: ['2020'], data: [2] });
    });
});

// ─── sazonalidade da escrita ───────────────────────────────────

describe('sazonalidade da escrita', () => {
    beforeEach(resetarDb);

    it('conta textos por mês usando dataEscrita.mes', () => {
        db.poemas = [
            { dataEscrita: { ano: 2024, mes: 1 } },
            { dataEscrita: { ano: 2024, mes: 1 } },
            { dataEscrita: { ano: 2024, mes: 7 } },
            { dataEscrita: { ano: 2024, mes: 12 } },
            { dataEscrita: { ano: 2024 } },
        ];
        assert.deepEqual(contarPorMesEscrita().data, [2, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    });

    it('ignora mês ausente ou inválido', () => {
        db.poemas = [
            { dataEscrita: { ano: 2024, mes: 0 } },
            { dataEscrita: { ano: 2024, mes: 13 } },
            { dataEscrita: { ano: 2024 } },
            { dataEscrita: { ano: 2024, mes: 2 } },
        ];
        assert.deepEqual(contarPorMesEscrita().data, [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    });

    it('agrega por ano e trimestre', () => {
        db.poemas = [
            { dataEscrita: { ano: 2024, mes: 1 } },
            { dataEscrita: { ano: 2024, mes: 2 } },
            { dataEscrita: { ano: 2024, mes: 7 } },
            { dataEscrita: { ano: 2024, mes: 12 } },
        ];
        assert.deepEqual(sazonalidadePorAno(), [
            {
                ano: 2024,
                total: 4,
                meses: [1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
                trimestres: [2, 0, 1, 1],
                percentuais: [50, 0, 25, 25],
            },
        ]);
        assert.deepEqual(distribuicaoPorTrimestre(), {
            labels: ['1º trimestre', '2º trimestre', '3º trimestre', '4º trimestre'],
            data: [2, 0, 1, 1],
            percentuais: [50, 0, 25, 25],
            total: 4,
        });
    });
});

// ─── contarPorLivro ─────────────────────────────────────────────

describe('contarPorLivro', () => {
    beforeEach(resetarDb);

    it('agrupa por livro direto (paiTipo livro), usando sigla oficial > pessoal > título', () => {
        db.livros = [
            { id: 1, titulo: 'Livro Completo', siglaOficial: 'LC' },
            { id: 2, titulo: 'Livro Pessoal', siglaPessoal: 'LP' },
            { id: 3, titulo: 'Livro Sem Sigla' },
        ];
        db.poemas = [
            { paiTipo: 'livro', paiId: 1 },
            { paiTipo: 'livro', paiId: 1 },
            { paiTipo: 'livro', paiId: 2 },
            { paiTipo: 'livro', paiId: 3 },
        ];
        const { labels, data } = contarPorLivro();
        assert.deepEqual(labels, ['LC', 'LP', 'Livro Sem Sigla']);
        assert.deepEqual(data, [2, 1, 1]);
    });

    it('resolve item dentro de uma Parte até o livro dono', () => {
        db.livros = [{ id: 1, titulo: 'Livro A' }];
        db.partes = [{ id: 100, livroId: 1 }];
        db.poemas = [{ paiTipo: 'parte', paiId: 100 }];
        assert.deepEqual(contarPorLivro(), { labels: ['Livro A'], data: [1] });
    });

    it('resolve item dentro de uma Seção que está dentro de uma Parte', () => {
        db.livros = [{ id: 1, titulo: 'Livro A' }];
        db.partes = [{ id: 100, livroId: 1 }];
        db.secoes = [{ id: 200, paiTipo: 'parte', paiId: 100 }];
        db.poemas = [{ paiTipo: 'secao', paiId: 200 }];
        assert.deepEqual(contarPorLivro(), { labels: ['Livro A'], data: [1] });
    });

    it('resolve item dentro de uma Seção presa direto num livro', () => {
        db.livros = [{ id: 1, titulo: 'Livro A' }];
        db.secoes = [{ id: 200, paiTipo: 'livro', paiId: 1 }];
        db.poemas = [{ paiTipo: 'secao', paiId: 200 }];
        assert.deepEqual(contarPorLivro(), { labels: ['Livro A'], data: [1] });
    });

    it('item sem livro resolvível (pai órfão, ou paiTipo desconhecido) vira "Avulso"', () => {
        db.poemas = [
            { paiTipo: 'parte', paiId: 999 },
            { paiTipo: null, paiId: null },
        ];
        assert.deepEqual(contarPorLivro(), { labels: ['Avulso'], data: [2] });
    });

    it('coletâneas reais (db.livros com tipo Coletânea) contam via partes + itensColetanea', () => {
        db.livros = [{ id: 2, tipo: 'Coletânea', titulo: 'Seleta', siglaOficial: 'SEL' }];
        db.partes = [
            { id: 100, livroId: 2 },
            { id: 101, livroId: 2 },
        ];
        db.itensColetanea = [
            { id: 1, parteId: 100 },
            { id: 2, parteId: 100 },
            { id: 3, parteId: 101 },
        ];
        assert.deepEqual(contarPorLivro(), { labels: ['SEL'], data: [3] });
    });

    it('coletânea sem nenhum item não aparece no resultado', () => {
        db.livros = [{ id: 2, tipo: 'Coletânea', titulo: 'Vazia' }];
        assert.deepEqual(contarPorLivro(), { labels: [], data: [] });
    });

    it('resultado vem ordenado do mais frequente para o menos frequente', () => {
        db.livros = [
            { id: 1, titulo: 'A' },
            { id: 2, titulo: 'B' },
        ];
        db.poemas = [
            { paiTipo: 'livro', paiId: 2 },
            { paiTipo: 'livro', paiId: 1 },
            { paiTipo: 'livro', paiId: 1 },
            { paiTipo: 'livro', paiId: 1 },
        ];
        assert.deepEqual(contarPorLivro(), { labels: ['A', 'B'], data: [3, 1] });
    });
});

// ─── contarPorTema / contarPorPessoa ────────────────────────────

describe('contarPorTema', () => {
    beforeEach(resetarDb);

    it('separa a lista de temas por vírgula, ignorando espaços em volta', () => {
        db.poemas = [{ sinalizacoesTema: 'mar, noite' }, { sinalizacoesTema: 'mar' }];
        const { labels, data } = contarPorTema();
        assert.deepEqual(labels, ['mar', 'noite']);
        assert.deepEqual(data, [2, 1]);
    });

    it('item sem sinalizações não contribui em nada', () => {
        db.poemas = [
            { sinalizacoesTema: '' },
            { sinalizacoesTema: null },
            { sinalizacoesTema: undefined },
        ];
        assert.deepEqual(contarPorTema(), { labels: [], data: [], categorias: [] });
    });

    it('combina as 9 categorias de Sinalizações na mesma contagem, por padrão (nenhum tipo salvo em preferências)', () => {
        db.poemas = [
            { sinalizacoesEstilo: 'Concretista', sinalizacoesTema: 'mar' },
            { sinalizacoesRelacao: '∞ Pedrictor', sinalizacoesTom: 'mar' },
        ];
        const { labels, data } = contarPorTema();
        assert.deepEqual(labels.slice().sort(), ['Concretista', '∞ Pedrictor', 'mar'].sort());
        assert.deepEqual(data[labels.indexOf('mar')], 2);
    });

    it('cada label vem acompanhado da categoria de origem, na mesma ordem/índice', () => {
        db.poemas = [{ sinalizacoesEstilo: 'Concretista', sinalizacoesTema: 'mar' }];
        const { labels, categorias } = contarPorTema();
        assert.equal(categorias[labels.indexOf('Concretista')], 'estilo');
        assert.equal(categorias[labels.indexOf('mar')], 'tema');
    });

    it('parâmetro `tipos` restringe a contagem só às categorias informadas', () => {
        db.poemas = [{ sinalizacoesEstilo: 'Concretista', sinalizacoesTema: 'mar' }];
        assert.deepEqual(contarPorTema(12, ['tema']), {
            labels: ['mar'],
            data: [1],
            categorias: ['tema'],
        });
    });

    it('respeita o parâmetro `top`, cortando os menos frequentes', () => {
        db.poemas = [
            { sinalizacoesTema: 'a' },
            { sinalizacoesTema: 'a' },
            { sinalizacoesTema: 'a' },
            { sinalizacoesTema: 'b' },
            { sinalizacoesTema: 'b' },
            { sinalizacoesTema: 'c' },
        ];
        assert.deepEqual(contarPorTema(2), {
            labels: ['a', 'b'],
            data: [3, 2],
            categorias: ['tema', 'tema'],
        });
    });

    it('valor padrão de `top` é 12', () => {
        db.poemas = Array.from({ length: 15 }, (_, i) => ({ sinalizacoesTema: `tema${i}` }));
        assert.equal(contarPorTema().labels.length, 12);
    });
});

describe('getTiposEtiquetaSelecionados / toggleTipoEtiqueta (preferência persistida)', () => {
    beforeEach(resetarDb);

    it('sem nada salvo, retorna as 9 categorias (equivalente ao combinado de antes)', () => {
        assert.equal(getTiposEtiquetaSelecionados().length, 9);
    });

    it('toggleTipoEtiqueta(tipo, false) tira o tipo da seleção salva', () => {
        toggleTipoEtiqueta('estilo', false);
        assert.ok(!getTiposEtiquetaSelecionados().includes('estilo'));
    });

    it('desmarcar o último tipo restante volta pro padrão (todos), em vez de ficar vazio', () => {
        const TODOS = getTiposEtiquetaSelecionados();
        TODOS.forEach((t) => (t === TODOS[0] ? null : toggleTipoEtiqueta(t, false)));
        toggleTipoEtiqueta(TODOS[0], false);
        assert.equal(getTiposEtiquetaSelecionados().length, 9);
    });
});

describe('contarPorPessoa', () => {
    beforeEach(resetarDb);

    it('mesma lógica de contarPorTema, aplicada ao campo pessoas (resolvido via cadastro central)', () => {
        db.pessoas = [
            { id: 1, nome: 'Dalton', grupoIds: [] },
            { id: 2, nome: 'Dani', grupoIds: [] },
        ];
        db.poemas = [
            {
                pessoas: [
                    { pessoaId: 1, papeis: [] },
                    { pessoaId: 2, papeis: [] },
                ],
            },
            { pessoas: [{ pessoaId: 1, papeis: ['Dedicatário(a)'] }] },
        ];
        assert.deepEqual(contarPorPessoa(), { labels: ['Dalton', 'Dani'], data: [2, 1] });
    });

    it('modo "grupo": conta por Grupo (via paresGrupoPessoa), não por Pessoa', () => {
        db.grupos = [{ id: 10, nome: 'Amigos' }];
        db.pessoas = [
            { id: 1, nome: 'Dalton', grupoIds: [10] },
            { id: 2, nome: 'Dani', grupoIds: [10] },
        ];
        db.poemas = [
            {
                pessoas: [
                    { pessoaId: 1, papeis: [] },
                    { pessoaId: 2, papeis: [] },
                ],
            },
        ];
        assert.deepEqual(contarPorPessoa(12, { modo: 'grupo' }), { labels: ['Amigos'], data: [2] });
    });

    it('modo "pessoa" com `grupoIds`: só conta pessoas de algum dos grupos informados', () => {
        db.grupos = [
            { id: 10, nome: 'Família' },
            { id: 20, nome: 'Trabalho' },
        ];
        db.pessoas = [
            { id: 1, nome: 'Dalton', grupoIds: [10] },
            { id: 2, nome: 'Dani', grupoIds: [20] },
        ];
        db.poemas = [
            {
                pessoas: [
                    { pessoaId: 1, papeis: [] },
                    { pessoaId: 2, papeis: [] },
                ],
            },
        ];
        assert.deepEqual(contarPorPessoa(12, { modo: 'pessoa', grupoIds: [10] }), {
            labels: ['Dalton'],
            data: [1],
        });
    });

    it('modo "grupo": subgrupo repica a contagem pro grupo pai (só nas Estatísticas)', () => {
        db.grupos = [
            { id: 10, nome: 'Família', paiId: null },
            { id: 11, nome: 'Filhos', paiId: 10 },
        ];
        db.pessoas = [{ id: 1, nome: 'Dalton', grupoIds: [11] }];
        db.poemas = [{ pessoas: [{ pessoaId: 1, papeis: [] }] }];
        assert.deepEqual(contarPorPessoa(12, { modo: 'grupo' }), {
            labels: ['Filhos', 'Família'],
            data: [1, 1],
        });
    });

    it('modo "pessoa" com `grupoIds` do grupo pai: inclui quem só está marcado no subgrupo', () => {
        db.grupos = [
            { id: 10, nome: 'Família', paiId: null },
            { id: 11, nome: 'Filhos', paiId: 10 },
        ];
        db.pessoas = [
            { id: 1, nome: 'Dalton', grupoIds: [11] },
            { id: 2, nome: 'Dani', grupoIds: [20] },
        ];
        db.poemas = [
            {
                pessoas: [
                    { pessoaId: 1, papeis: [] },
                    { pessoaId: 2, papeis: [] },
                ],
            },
        ];
        assert.deepEqual(contarPorPessoa(12, { modo: 'pessoa', grupoIds: [10] }), {
            labels: ['Dalton'],
            data: [1],
        });
    });
});

describe('getModoGraficoPessoas / definirModoGraficoPessoas (preferência persistida)', () => {
    beforeEach(resetarDb);

    it('sem nada salvo, o padrão é "pessoa"', () => {
        assert.equal(getModoGraficoPessoas(), 'pessoa');
    });

    it('definirModoGraficoPessoas("grupo") persiste a escolha', () => {
        definirModoGraficoPessoas('grupo');
        assert.equal(getModoGraficoPessoas(), 'grupo');
    });
});

describe('getGruposFiltroPessoas / toggleGrupoFiltroPessoas (preferência persistida)', () => {
    beforeEach(resetarDb);

    it('sem nada salvo, retorna lista vazia (sem filtro)', () => {
        assert.deepEqual(getGruposFiltroPessoas(), []);
    });

    it('toggleGrupoFiltroPessoas liga e desliga um grupo específico', () => {
        toggleGrupoFiltroPessoas(10, true);
        assert.deepEqual(getGruposFiltroPessoas(), ['10']);
        toggleGrupoFiltroPessoas(10, false);
        assert.deepEqual(getGruposFiltroPessoas(), []);
    });
});

describe('getOcultosGrafico / toggleOcultoItem / restaurarOcultosGrafico (preferência persistida)', () => {
    beforeEach(resetarDb);

    it('sem nada salvo, retorna Set vazio', () => {
        assert.deepEqual(getOcultosGrafico('pessoas-pessoa'), new Set());
    });

    it('toggleOcultoItem liga e desliga a ocultação de um item específico', () => {
        toggleOcultoItem('pessoas-pessoa', 'Dalton');
        assert.deepEqual(getOcultosGrafico('pessoas-pessoa'), new Set(['Dalton']));
        toggleOcultoItem('pessoas-pessoa', 'Dalton');
        assert.deepEqual(getOcultosGrafico('pessoas-pessoa'), new Set());
    });

    it('cada `chave` de gráfico guarda sua própria lista de ocultos, sem misturar', () => {
        toggleOcultoItem('pessoas-pessoa', 'Dalton');
        toggleOcultoItem('ano', '2020');
        assert.deepEqual(getOcultosGrafico('pessoas-pessoa'), new Set(['Dalton']));
        assert.deepEqual(getOcultosGrafico('ano'), new Set(['2020']));
    });

    it('restaurarOcultosGrafico limpa só a lista daquela chave', () => {
        toggleOcultoItem('pessoas-pessoa', 'Dalton');
        toggleOcultoItem('ano', '2020');
        restaurarOcultosGrafico('pessoas-pessoa');
        assert.deepEqual(getOcultosGrafico('pessoas-pessoa'), new Set());
        assert.deepEqual(getOcultosGrafico('ano'), new Set(['2020']));
    });
});

describe('filtrarOcultos', () => {
    it('sem ocultos, retorna a lista intacta', () => {
        const base = { labels: ['a', 'b'], data: [1, 2] };
        assert.deepEqual(filtrarOcultos(base, new Set()), base);
    });

    it('remove só os labels presentes no Set de ocultos', () => {
        const base = { labels: ['a', 'b', 'c'], data: [1, 2, 3] };
        assert.deepEqual(filtrarOcultos(base, new Set(['b'])), {
            labels: ['a', 'c'],
            data: [1, 3],
        });
    });

    it('preserva `categorias` (alinhado por índice) quando presente', () => {
        const base = { labels: ['a', 'b'], data: [1, 2], categorias: ['tema', 'tom'] };
        assert.deepEqual(filtrarOcultos(base, new Set(['a'])), {
            labels: ['b'],
            data: [2],
            categorias: ['tom'],
        });
    });
});

describe('agregarPorPessoa (lista completa, sem corte de Top N)', () => {
    beforeEach(resetarDb);

    it('traz todas as pessoas, não só as 12 mais frequentes — pra alimentar o seletor de "ocultar"', () => {
        db.pessoas = Array.from({ length: 15 }, (_, i) => ({
            id: i,
            nome: `Pessoa${i}`,
            grupoIds: [],
        }));
        db.poemas = db.pessoas.map((p) => ({ pessoas: [{ pessoaId: p.id, papeis: [] }] }));
        assert.equal(agregarPorPessoa().labels.length, 15);
    });
});

describe('agregarPessoaPorAno com filtro de grupo', () => {
    beforeEach(resetarDb);

    it('restringe a série temporal às pessoas pertencentes aos grupos selecionados', () => {
        db.grupos = [
            { id: 10, nome: 'Família' },
            { id: 20, nome: 'Trabalho' },
        ];
        db.pessoas = [
            { id: 1, nome: 'Dalton', grupoIds: [10] },
            { id: 2, nome: 'Dani', grupoIds: [20] },
        ];
        db.poemas = [
            { ano: 2020, pessoas: [{ pessoaId: 1, papeis: [] }] },
            { ano: 2020, pessoas: [{ pessoaId: 2, papeis: [] }] },
            { ano: 2021, pessoas: [{ pessoaId: 1, papeis: [] }] },
        ];

        assert.deepEqual(agregarPessoaPorAno('', [10]), { labels: ['2020', '2021'], data: [1, 1] });
        assert.deepEqual(agregarPessoaPorAno('Dalton', [20]), { labels: [], data: [] });
        assert.deepEqual(agregarPessoaPorAno('Dalton', [10]), {
            labels: ['2020', '2021'],
            data: [1, 1],
        });
    });

    it('quando pessoa e grupo são selecionados, ambos precisam corresponder à mesma pessoa', () => {
        db.grupos = [
            { id: 10, nome: 'Família' },
            { id: 20, nome: 'Trabalho' },
        ];
        db.pessoas = [
            { id: 1, nome: 'Dalton', grupoIds: [10] },
            { id: 2, nome: 'Dani', grupoIds: [20] },
        ];
        db.poemas = [
            {
                ano: 2020,
                pessoas: [
                    { pessoaId: 1, papeis: [] },
                    { pessoaId: 2, papeis: [] },
                ],
            },
            { ano: 2021, pessoas: [{ pessoaId: 1, papeis: [] }] },
        ];

        assert.deepEqual(agregarPessoaPorAno('Dalton', [20]), { labels: [], data: [] });
        assert.deepEqual(agregarPessoaPorAno('Dalton', [10]), {
            labels: ['2020', '2021'],
            data: [1, 1],
        });
    });
});

// ─── palavrasMaisFrequentes ─────────────────────────────────────

describe('palavrasMaisFrequentes', () => {
    beforeEach(resetarDb);

    it('ignora palavras com menos de 3 letras', () => {
        db.poemas = [{ texto: 'eu vi um sol lá' }];
        // "eu", "vi", "um", "lá" ficam de fora por tamanho (e "eu"/"um" também são stopword)
        const resultado = palavrasMaisFrequentes();
        assert.ok(resultado.some(([p]) => p === 'sol'));
        assert.ok(!resultado.some(([p]) => p === 'vi'));
    });

    it('ignora stopwords mesmo com 3+ letras', () => {
        db.poemas = [{ texto: 'para com sobre o mar' }];
        const resultado = palavrasMaisFrequentes();
        assert.deepEqual(
            resultado.map(([p]) => p),
            ['mar'],
        );
    });

    it('remove tags HTML antes de tokenizar', () => {
        db.poemas = [{ texto: '<p>oceano</p><div>oceano</div>' }];
        assert.deepEqual(palavrasMaisFrequentes(), [['oceano', 2]]);
    });

    it('é case-insensitive e conta acentuadas corretamente', () => {
        db.poemas = [{ texto: 'Coração coração CORAÇÃO' }];
        assert.deepEqual(palavrasMaisFrequentes(), [['coração', 3]]);
    });

    it('sem filtro de livro, considera poemas e prosas de todo o acervo', () => {
        db.poemas = [{ texto: 'oceano' }];
        db.prosas = [{ texto: 'oceano' }];
        assert.deepEqual(palavrasMaisFrequentes(), [['oceano', 2]]);
    });

    it('respeita o parâmetro `top`', () => {
        db.poemas = [{ texto: 'alfa beta gama' }];
        assert.equal(palavrasMaisFrequentes('', 2).length, 2);
    });

    it('filtro por livro comum: só conta palavras dos textos daquele livro', () => {
        db.livros = [
            { id: 1, titulo: 'Livro A' },
            { id: 2, titulo: 'Livro B' },
        ];
        db.poemas = [
            { paiTipo: 'livro', paiId: 1, texto: 'oceano' },
            { paiTipo: 'livro', paiId: 2, texto: 'montanha' },
        ];
        assert.deepEqual(palavrasMaisFrequentes('1'), [['oceano', 1]]);
    });

    it('filtro por coletânea: busca texto via refId/refTipo apontando pra poema/prosa', () => {
        db.livros = [{ id: 2, tipo: 'Coletânea', titulo: 'Seleta' }];
        db.partes = [{ id: 100, livroId: 2 }];
        db.poemas = [{ id: 10, texto: 'oceano profundo' }];
        db.itensColetanea = [{ id: 1, parteId: 100, refId: 10, refTipo: 'poema' }];
        assert.deepEqual(
            palavrasMaisFrequentes('2')
                .map(([p]) => p)
                .sort(),
            ['oceano', 'profundo'],
        );
    });

    it(
        'BUG CORRIGIDO: item "inédito" de coletânea (só textoOverride, sem refId/refTipo) ' +
            'entra na análise de palavras. Antes, o filtro de refs exigia refId && refTipo ' +
            'antes mesmo de olhar pro textoOverride, então um item inédito (caso suportado e ' +
            'exibido com o badge "inédito" em coletaneas.js, onde !item.refId é esperado) ' +
            'era descartado silenciosamente — divergindo de coletaneas.js (que resolve ' +
            'textoOverride PRIMEIRO, com refId só como fallback) e de exportar.js (que já ' +
            'incluía esses itens inteiros na exportação seletiva). Corrigido pra seguir a ' +
            'mesma prioridade de coletaneas.js.',
        () => {
            db.livros = [{ id: 2, tipo: 'Coletânea', titulo: 'Seleta' }];
            db.partes = [{ id: 100, livroId: 2 }];
            db.itensColetanea = [
                { id: 1, parteId: 100, textoOverride: 'texto avulso da coletânea' },
            ];
            const resultado = palavrasMaisFrequentes('2').map(([p]) => p);
            assert.ok(resultado.includes('avulso'));
        },
    );

    it(
        'filtro por coletânea: item COM refId/refTipo e também textoOverride usa o texto próprio ' +
            '(override vence sobre o texto original)',
        () => {
            db.livros = [{ id: 2, tipo: 'Coletânea', titulo: 'Seleta' }];
            db.partes = [{ id: 100, livroId: 2 }];
            db.poemas = [{ id: 10, texto: 'texto original ignorado' }];
            db.itensColetanea = [
                {
                    id: 1,
                    parteId: 100,
                    refId: 10,
                    refTipo: 'poema',
                    textoOverride: 'texto avulso vencedor',
                },
            ];
            const resultado = palavrasMaisFrequentes('2')
                .map(([p]) => p)
                .sort();
            assert.deepEqual(resultado, ['avulso', 'texto', 'vencedor']);
        },
    );

    it('livroId inexistente cai no ramo de livro comum e não quebra (retorna vazio)', () => {
        db.poemas = [{ paiTipo: 'livro', paiId: 1, texto: 'oceano' }];
        assert.deepEqual(palavrasMaisFrequentes('999'), []);
    });
});

// ─── resumoGeral ─────────────────────────────────────────────────

describe('agregarPorAssunto', () => {
    beforeEach(resetarDb);

    it('conta um texto uma vez por Assunto a que pertence (via Temas)', () => {
        db.assuntos = [
            { id: 1, nome: 'Sociedade', temas: ['Machismo', 'Polarização'] },
            { id: 2, nome: 'Gênero', temas: ['machismo'] },
        ];
        db.poemas = [
            { sinalizacoesTema: 'Machismo' },
            { sinalizacoesTema: 'Polarização' },
            { sinalizacoesTema: 'Outro' },
        ];
        const { labels, data } = agregarPorAssunto();
        assert.deepEqual(labels, ['Sociedade', 'Gênero']);
        assert.deepEqual(data, [2, 1]);
    });

    it('Assunto sem nenhum texto fica de fora do gráfico', () => {
        db.assuntos = [{ id: 1, nome: 'Vazio', temas: ['Nada'] }];
        db.poemas = [{ sinalizacoesTema: 'Outro' }];
        assert.deepEqual(agregarPorAssunto(), { labels: [], data: [] });
    });

    it('sem Assuntos cadastrados, devolve listas vazias', () => {
        db.poemas = [{ sinalizacoesTema: 'Machismo' }];
        assert.deepEqual(agregarPorAssunto(), { labels: [], data: [] });
    });

    it('soma Poemas e Prosas juntos', () => {
        db.assuntos = [{ id: 1, nome: 'Sociedade', temas: ['Machismo'] }];
        db.poemas = [{ sinalizacoesTema: 'Machismo' }];
        db.prosas = [{ sinalizacoesTema: 'Machismo' }];
        assert.deepEqual(agregarPorAssunto(), { labels: ['Sociedade'], data: [2] });
    });
});

describe('resumoLinguagem', () => {
    beforeEach(resetarDb);

    it('conta textos e palavras no contexto atual', () => {
        db.poemas = [
            { id: 1, texto: 'Casa azul e mar', paiTipo: 'livro', paiId: 10 },
            { id: 2, texto: 'Noite longa e clara', paiTipo: 'livro', paiId: 20 },
        ];
        db.livros = [
            { id: 10, titulo: 'Livro A', tipo: 'Livro' },
            { id: 20, titulo: 'Livro B', tipo: 'Livro' },
        ];

        assert.deepEqual(resumoLinguagem(), { textos: 2, palavras: 8 });
        assert.deepEqual(resumoLinguagem(10), { textos: 1, palavras: 4 });
        assert.deepEqual(resumoLinguagem(20), { textos: 1, palavras: 4 });
    });

    it('respeita os filtros compartilhados também quando uma obra é selecionada', () => {
        db.poemas = [
            { id: 1, texto: 'Casa azul', ano: 2020, paiTipo: 'livro', paiId: 10 },
            { id: 2, texto: 'Noite clara', ano: 2024, paiTipo: 'livro', paiId: 10 },
        ];
        db.livros = [{ id: 10, titulo: 'Livro A', tipo: 'Livro' }];

        definirFiltrosCompartilhados({ anoDe: '2024', anoAte: '2024' });
        assert.deepEqual(resumoLinguagem(10), { textos: 1, palavras: 2 });
    });
});

describe('resumoGeral', () => {
    beforeEach(resetarDb);

    it('acervo vazio retorna valores neutros, sem quebrar', () => {
        assert.deepEqual(resumoGeral(), {
            totalPoemas: 0,
            totalProsas: 0,
            totalPalavras: 0,
            mediaPalavras: 0,
            anoMaisProdutivo: '—',
            livroComMais: '—',
        });
    });

    it('conta totalPoemas e totalProsas separadamente', () => {
        db.poemas = [{ texto: '' }, { texto: '' }];
        db.prosas = [{ texto: '' }];
        const r = resumoGeral();
        assert.equal(r.totalPoemas, 2);
        assert.equal(r.totalProsas, 1);
    });

    it('soma o total de palavras tokenizadas de poemas e prosas', () => {
        db.poemas = [{ texto: 'uma frase com cinco palavras' }]; // "uma" e "com" são stopword, mas ainda contam como token pro total
        db.prosas = [{ texto: 'outra frase' }];
        const r = resumoGeral();
        // tokenizar não filtra stopword/tamanho — isso só acontece em palavrasMaisFrequentes
        assert.equal(r.totalPalavras, 5 + 2);
    });

    it('mediaPalavras é a média arredondada de palavras por texto', () => {
        db.poemas = [{ texto: 'um dois tres quatro' }, { texto: 'um' }];
        const r = resumoGeral();
        assert.equal(r.mediaPalavras, Math.round((4 + 1) / 2));
    });

    it('anoMaisProdutivo aponta o ano com mais textos', () => {
        db.poemas = [
            { texto: '', ano: 2020 },
            { texto: '', ano: 2021 },
            { texto: '', ano: 2021 },
        ];
        assert.equal(resumoGeral().anoMaisProdutivo, '2021');
    });

    it('livroComMais aponta o livro (ou coletânea) com mais textos', () => {
        db.livros = [
            { id: 1, titulo: 'Livro A' },
            { id: 2, titulo: 'Livro B' },
        ];
        db.poemas = [
            { texto: '', paiTipo: 'livro', paiId: 1 },
            { texto: '', paiTipo: 'livro', paiId: 2 },
            { texto: '', paiTipo: 'livro', paiId: 2 },
        ];
        assert.equal(resumoGeral().livroComMais, 'Livro B');
    });
});

// ─── filtrarPorIntervalo ─────────────────────────────────────────

describe('filtrarPorIntervalo (recorte de min/max usado nos gráficos)', () => {
    const base = { labels: ['a', 'b', 'c'], data: [1, 5, 10] };

    it('sem min nem max, retorna a lista intacta', () => {
        assert.deepEqual(filtrarPorIntervalo(base, '', ''), base);
        assert.deepEqual(filtrarPorIntervalo(base, null, null), base);
    });

    it('só min: mantém valores >= min', () => {
        assert.deepEqual(filtrarPorIntervalo(base, 5, ''), { labels: ['b', 'c'], data: [5, 10] });
    });

    it('só max: mantém valores <= max', () => {
        assert.deepEqual(filtrarPorIntervalo(base, '', 5), { labels: ['a', 'b'], data: [1, 5] });
    });

    it('min e max juntos: mantém só o que está no intervalo fechado', () => {
        assert.deepEqual(filtrarPorIntervalo(base, 2, 9), { labels: ['b'], data: [5] });
    });

    it('min/max não numéricos são tratados como ausentes (sem quebrar)', () => {
        assert.deepEqual(filtrarPorIntervalo(base, 'abc', ''), base);
    });

    it('intervalo que não bate em nada retorna listas vazias', () => {
        assert.deepEqual(filtrarPorIntervalo(base, 100, 200), { labels: [], data: [] });
    });
});

// ─── Textos de terceiros ────────────────────────────────────────

describe('textos de terceiros nas Estatísticas', () => {
    beforeEach(() => {
        resetarDb();
        db.autores = [
            { id: 1, nome: 'Victor Leme', souEu: true },
            { id: 2, nome: 'Augusto dos Anjos' },
        ];
    });

    const meu = (extra = {}) => ({
        ano: 2020,
        texto: 'um dois',
        autoria: [{ autorId: 1, papel: 'Autor' }],
        ...extra,
    });
    const alheio = (extra = {}) => ({
        ano: 1912,
        texto: 'um dois três',
        autoria: [{ autorId: 2, papel: 'Autor' }],
        ...extra,
    });

    it('separação fica inativa se nenhum Autor está marcado souEu', () => {
        db.autores = [{ id: 2, nome: 'Augusto dos Anjos' }];
        db.poemas = [alheio()];
        assert.equal(separacaoTerceirosAtiva(), false);
        assert.equal(ehTextoDeTerceiros(db.poemas[0]), false);
        assert.equal(resumoGeral().totalPoemas, 1);
    });

    it('texto só com Autor não-souEu é de terceiros', () => {
        assert.equal(ehTextoDeTerceiros(alheio()), true);
    });

    it('texto sem autoria, com autoria vazia ou só com autor excluído conta como seu', () => {
        assert.equal(ehTextoDeTerceiros({ texto: 'x' }), false);
        assert.equal(ehTextoDeTerceiros({ autoria: [] }), false);
        assert.equal(ehTextoDeTerceiros({ autoria: [{ autorId: 99, papel: 'Autor' }] }), false);
    });

    it('coautoria com você (ou tradução sua) conta como sua', () => {
        const misto = {
            autoria: [
                { autorId: 2, papel: 'Autor' },
                { autorId: 1, papel: 'Coautor' },
            ],
        };
        assert.equal(ehTextoDeTerceiros(misto), false);
    });

    it('por padrão, resumo e agregações ignoram textos de terceiros', () => {
        db.poemas = [meu(), alheio()];
        db.prosas = [alheio()];
        const r = resumoGeral();
        assert.equal(r.totalPoemas, 1);
        assert.equal(r.totalProsas, 0);
        assert.deepEqual(contarTerceiros(), { total: 2, excluidos: 2 });
        assert.equal(r.totalPalavras, 2);
        assert.deepEqual(contarPorAno(), { labels: ['2020'], data: [1] });
        assert.deepEqual(palavrasMaisFrequentes('', 5), [['dois', 1]]);
    });

    it('incluir terceiros volta a contar tudo e persiste a escolha', () => {
        db.poemas = [meu(), alheio()];
        assert.equal(getIncluirTerceiros(), false);
        definirIncluirTerceiros(true);
        assert.equal(getIncluirTerceiros(), true);
        const r = resumoGeral();
        assert.equal(r.totalPoemas, 2);
        assert.deepEqual(contarTerceiros(), { total: 1, excluidos: 0 });
        assert.deepEqual(contarPorAno().labels, ['1912', '2020']);
        definirIncluirTerceiros(false);
        assert.equal(resumoGeral().totalPoemas, 1);
    });

    it('modo "somente" conta só os de terceiros e persiste a escolha', () => {
        db.poemas = [meu(), alheio()];
        assert.equal(getModoTerceiros(), 'excluir');
        definirModoTerceiros('somente');
        assert.equal(getModoTerceiros(), 'somente');
        const r = resumoGeral();
        assert.equal(r.totalPoemas, 1);
        assert.deepEqual(contarTerceiros(), { total: 1, excluidos: 1 });
        assert.deepEqual(contarPorAno(), { labels: ['1912'], data: [1] });
        definirModoTerceiros('excluir');
        assert.equal(resumoGeral().totalPoemas, 1);
    });

    it('coletânea não conta itens que apontam pra texto de terceiros', () => {
        db.poemas = [
            { id: 10, ...meu() },
            { id: 11, ...alheio() },
        ];
        db.livros = [{ id: 5, tipo: 'Coletânea', titulo: 'Col', siglaOficial: 'COL' }];
        db.partes = [{ id: 7, livroId: 5 }];
        db.itensColetanea = [
            { id: 1, parteId: 7, refTipo: 'poema', refId: 10 },
            { id: 2, parteId: 7, refTipo: 'poema', refId: 11 },
            { id: 3, parteId: 7, textoOverride: 'texto solto' },
        ];
        const idx = (r) => r.data[r.labels.indexOf('COL')];
        assert.equal(idx(contarPorLivro()), 2);
        definirIncluirTerceiros(true);
        assert.equal(idx(contarPorLivro()), 3);
    });
});

describe('filtros compartilhados das Estatísticas', () => {
    beforeEach(resetarDb);

    it('começa em Meus textos, todos os tipos e sem período, aproveitando o modo legado', () => {
        assert.deepEqual(getFiltrosCompartilhados(), {
            corpus: 'meus',
            tipo: 'todos',
            anoDe: '',
            anoAte: '',
            autorId: '',
        });
    });

    it('aplica corpus, tipo e período ao N de textos', () => {
        db.autores = [
            { id: 1, nome: 'Eu', souEu: true },
            { id: 2, nome: 'Terceiro', souEu: false },
        ];
        db.poemas = [
            { ano: 2020, texto: 'meu', autoria: [{ autorId: 1, papel: 'Autor' }] },
            { ano: 2022, texto: 'meu', autoria: [{ autorId: 1, papel: 'Autor' }] },
            { ano: 2021, texto: 'outro', autoria: [{ autorId: 2, papel: 'Autor' }] },
        ];
        db.prosas = [{ ano: 2022, texto: 'prosa', autoria: [{ autorId: 1, papel: 'Autor' }] }];

        definirFiltrosCompartilhados({
            corpus: 'tudo',
            tipo: 'poemas',
            anoDe: '2021',
            anoAte: '2022',
        });
        assert.deepEqual(contarTextosFiltrados(), { poemas: 2, prosas: 0, total: 2 });
    });

    it('limpar filtros volta ao padrão compartilhado', () => {
        definirFiltrosCompartilhados({
            corpus: 'importadas',
            tipo: 'prosas',
            anoDe: '2000',
            anoAte: '2001',
        });
        limparFiltrosCompartilhados();
        assert.deepEqual(getFiltrosCompartilhados(), {
            corpus: 'meus',
            tipo: 'todos',
            anoDe: '',
            anoAte: '',
            autorId: '',
        });
    });
});

// ─── Temas e pessoas: séries temporais / coocorrência ───────────

describe('agregarTemaPorAno / agregarPessoaPorAno / coocorrenciaTemasPessoas', () => {
    beforeEach(resetarDb);

    it('agrega a presença de um tema por ano, respeitando dataEscrita', async () => {
        db.poemas = [
            { dataEscrita: { ano: 2020 }, sinalizacoesTema: 'mar, noite' },
            { dataEscrita: { ano: 2020 }, sinalizacoesTema: 'noite' },
            { dataEscrita: { ano: 2021 }, sinalizacoesTema: 'mar' },
        ];
        const { agregarTemaPorAno } = await import('../js/estatisticas-dados.js');
        assert.deepEqual(agregarTemaPorAno('mar'), { labels: ['2020', '2021'], data: [1, 1] });
    });

    it('agrega a presença de uma pessoa por ano', async () => {
        db.pessoas = [
            { id: 1, nome: 'Ana' },
            { id: 2, nome: 'Bia' },
        ];
        db.poemas = [
            { dataEscrita: { ano: 2020 }, pessoas: [{ pessoaId: 1, papeis: [] }] },
            { dataEscrita: { ano: 2020 }, pessoas: [{ pessoaId: 2, papeis: [] }] },
            { dataEscrita: { ano: 2021 }, pessoas: [{ pessoaId: 1, papeis: [] }] },
        ];
        const { agregarPessoaPorAno } = await import('../js/estatisticas-dados.js');
        assert.deepEqual(agregarPessoaPorAno('Ana'), { labels: ['2020', '2021'], data: [1, 1] });
    });

    it('conta coocorrência uma vez por texto, mesmo se houver duplicação nos campos', async () => {
        db.pessoas = [{ id: 1, nome: 'Ana' }];
        db.poemas = [
            {
                sinalizacoesTema: 'mar, mar',
                pessoas: [
                    { pessoaId: 1, papeis: [] },
                    { pessoaId: 1, papeis: [] },
                ],
            },
            { sinalizacoesTema: 'mar', pessoas: [{ pessoaId: 1, papeis: [] }] },
        ];
        const { coocorrenciaTemasPessoas } = await import('../js/estatisticas-dados.js');
        assert.deepEqual(coocorrenciaTemasPessoas({ temas: ['mar'], pessoas: ['Ana'] }), {
            pessoas: ['Ana'],
            temas: ['mar'],
            valores: [[2]],
            textosPorTema: [2],
            textosPorLinha: [2],
            totalTextos: 2,
        });
    });

    it('calcula coocorrência Temas × grupos uma vez por grupo em cada texto', async () => {
        db.grupos = [
            { id: 10, nome: 'Amigos' },
            { id: 20, nome: 'Família' },
        ];
        db.pessoas = [
            { id: 1, nome: 'Ana', grupoIds: [10] },
            { id: 2, nome: 'Bia', grupoIds: [10, 20] },
        ];
        db.poemas = [
            {
                sinalizacoesTema: 'mar',
                pessoas: [
                    { pessoaId: 1, papeis: [] },
                    { pessoaId: 2, papeis: [] },
                ],
            },
            { sinalizacoesTema: 'mar', pessoas: [{ pessoaId: 2, papeis: [] }] },
        ];
        const { coocorrenciaTemasGrupos } = await import('../js/estatisticas-dados.js');
        assert.deepEqual(
            coocorrenciaTemasGrupos({ temas: ['mar'], grupos: ['Amigos', 'Família'] }),
            {
                grupos: ['Amigos', 'Família'],
                temas: ['mar'],
                valores: [[2], [2]],
                textosPorTema: [2],
                textosPorLinha: [2, 2],
                totalTextos: 2,
            },
        );
    });

    it('coocorrência Temas × grupos: subgrupo repica pro grupo pai (só nas Estatísticas)', async () => {
        db.grupos = [
            { id: 10, nome: 'Família', paiId: null },
            { id: 11, nome: 'Filhos', paiId: 10 },
        ];
        db.pessoas = [{ id: 1, nome: 'Dalton', grupoIds: [11] }];
        db.poemas = [{ sinalizacoesTema: 'mar', pessoas: [{ pessoaId: 1, papeis: [] }] }];
        const { coocorrenciaTemasGrupos } = await import('../js/estatisticas-dados.js');
        assert.deepEqual(
            coocorrenciaTemasGrupos({ temas: ['mar'], grupos: ['Filhos', 'Família'] }),
            {
                grupos: ['Filhos', 'Família'],
                temas: ['mar'],
                valores: [[1], [1]],
                textosPorTema: [1],
                textosPorLinha: [1, 1],
                totalTextos: 1,
            },
        );
    });
});

// ─── Drill-down (estatisticas-tela-comum.js) ───────────────────────
// Funções chamadas a partir do clique numa barra de gráfico. Não têm
// import de tela (é DOM/Chart.js puro), mas a lógica de navegação em
// si (qual aba abre, qual filtro é aplicado) é pura o bastante pra
// testar com window/document simulados.

describe('navegarParaLista', () => {
    let navegarParaLista;
    let chamadas;

    beforeEach(async () => {
        ({ navegarParaLista } = await import('../js/estatisticas-tela-comum.js'));
        chamadas = [];
        window.abrirAba = (...args) => chamadas.push(['abrirAba', ...args]);
        window.setFiltroPoemas = (...args) => chamadas.push(['setFiltroPoemas', ...args]);
        window.setFiltroProsas = (...args) => chamadas.push(['setFiltroProsas', ...args]);
        window.setFiltroDataRapidoPoemasEscrita = (...args) =>
            chamadas.push(['setFiltroDataRapidoPoemasEscrita', ...args]);
        window.setFiltroDataRapidoProsasEscrita = (...args) =>
            chamadas.push(['setFiltroDataRapidoProsasEscrita', ...args]);
    });

    it('com prefixo e sem ano: abre Poemas e aplica só o filtro de texto', () => {
        navegarParaLista('tema:', 'Amor', 'poema');
        assert.deepEqual(chamadas, [
            ['abrirAba', 'poemas'],
            ['setFiltroPoemas', 'tema:Amor'],
        ]);
    });

    it('tipo "prosa": abre Prosas em vez de Poemas', () => {
        navegarParaLista('pessoa:', 'Ana', 'prosa');
        assert.deepEqual(chamadas, [
            ['abrirAba', 'prosas'],
            ['setFiltroProsas', 'pessoa:Ana'],
        ]);
    });

    it('sem prefixo (drill-down só por ano): não mexe no filtro de texto', () => {
        navegarParaLista('', '', 'poema', '2020');
        assert.deepEqual(chamadas, [
            ['abrirAba', 'poemas'],
            ['setFiltroDataRapidoPoemasEscrita', '2020'],
        ]);
    });

    it('sem prefixo, tipo prosa: usa o atalho de data de Prosas, não o de Poemas', () => {
        navegarParaLista('', '', 'prosa', '2019');
        assert.deepEqual(chamadas, [
            ['abrirAba', 'prosas'],
            ['setFiltroDataRapidoProsasEscrita', '2019'],
        ]);
        assert.equal(
            chamadas.some((c) => c[0] === 'setFiltroDataRapidoPoemasEscrita'),
            false,
        );
    });

    it('com prefixo e ano juntos: aplica os dois filtros', () => {
        navegarParaLista('livro:', 'Cidade Cinza', 'poema', '2021');
        assert.deepEqual(chamadas, [
            ['abrirAba', 'poemas'],
            ['setFiltroPoemas', 'livro:Cidade Cinza'],
            ['setFiltroDataRapidoPoemasEscrita', '2021'],
        ]);
    });
});

describe('tipoDestino', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('retorna "poema" para o padrão e para "todos"', async () => {
        const { tipoDestino } = await import('../js/estatisticas-tela-comum.js');
        assert.equal(tipoDestino(), 'poema');
        definirFiltrosCompartilhados({ tipo: 'poemas' });
        assert.equal(tipoDestino(), 'poema');
    });

    it('retorna "prosa" quando o filtro de Tipo compartilhado é "prosas"', async () => {
        const { tipoDestino } = await import('../js/estatisticas-tela-comum.js');
        definirFiltrosCompartilhados({ tipo: 'prosas' });
        assert.equal(tipoDestino(), 'prosa');
    });
});

describe('bindDrillDownBarra', () => {
    let bindDrillDownBarra;
    let canvasFalso;
    let elementoAnterior;

    beforeEach(async () => {
        ({ bindDrillDownBarra } = await import('../js/estatisticas-tela-comum.js'));
        canvasFalso = { onclick: null };
        elementoAnterior = document.getElementById;
        document.getElementById = (id) => (id === 'grafico-teste' ? canvasFalso : null);
        global.Chart = {
            getChart: () => ({
                data: { labels: ['Amor', 'Morte', 'Mar'] },
                getElementsAtEventForMode: () => [{ index: 1 }],
            }),
        };
    });

    afterEach(() => {
        document.getElementById = elementoAnterior;
        delete global.Chart;
    });

    it('chama o callback com o label da barra clicada', () => {
        let recebido = null;
        bindDrillDownBarra('grafico-teste', (label) => {
            recebido = label;
        });
        assert.equal(typeof canvasFalso.onclick, 'function');
        canvasFalso.onclick({});
        assert.equal(recebido, 'Morte');
    });

    it('não chama o callback quando não há ponto clicado (fora de uma barra)', () => {
        global.Chart.getChart = () => ({
            data: { labels: ['Amor'] },
            getElementsAtEventForMode: () => [],
        });
        let chamado = false;
        bindDrillDownBarra('grafico-teste', () => {
            chamado = true;
        });
        canvasFalso.onclick({});
        assert.equal(chamado, false);
    });

    it('não quebra quando o canvas não existe na tela', () => {
        document.getElementById = () => null;
        assert.doesNotThrow(() => bindDrillDownBarra('grafico-inexistente', () => {}));
    });
});

describe('colunas da matriz de coocorrência', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('começa exibindo todos os temas', () => {
        assert.equal(getModoColunasCoocorrencia(), 'todos');
        assert.deepEqual(getTemasColunasSelecionados(), []);
    });

    it('persiste o modo de seleção e os temas escolhidos', () => {
        definirModoColunasCoocorrencia('selecionar');
        toggleTemaColunaCoocorrencia('Amor', true);
        toggleTemaColunaCoocorrencia('Morte', true);
        toggleTemaColunaCoocorrencia('Amor', false);
        assert.equal(getModoColunasCoocorrencia(), 'selecionar');
        assert.deepEqual(getTemasColunasSelecionados(), ['Morte']);
    });

    it('selecionar todos e limpar seleção alteram apenas a lista de temas visíveis', () => {
        selecionarTodosTemasColunas(['Amor', 'Morte', 'Cidade']);
        assert.deepEqual(getTemasColunasSelecionados(), ['Amor', 'Morte', 'Cidade']);
        limparTemasColunas();
        assert.deepEqual(getTemasColunasSelecionados(), []);
    });
});

describe('Papel do tema nas Estatísticas', () => {
    beforeEach(() => {
        resetarDb();
        db.temas = [
            { id: 1, nome: 'Amor', notas: '' },
            { id: 2, nome: 'Machismo', notas: '' },
            { id: 3, nome: 'Brasil', notas: '' },
        ];
        db.poemas = [
            {
                ano: 2020,
                sinalizacoesTema: 'Amor, Machismo, Brasil',
                temas: [
                    { temaId: 1, papel: 'principal' },
                    { temaId: 2, papel: 'secundario' },
                    { temaId: 3, papel: '' },
                ],
            },
            {
                ano: 2021,
                sinalizacoesTema: 'Machismo, Amor',
                temas: [
                    { temaId: 2, papel: 'principal' },
                    { temaId: 1, papel: 'secundario' },
                ],
            },
        ];
        db.prosas = [];
        definirPapelTemaEstatisticas('todos');
    });
    afterEach(() => definirPapelTemaEstatisticas('todos'));

    it('padrão é "todos" e valor inválido cai em "todos"', () => {
        assert.equal(getPapelTemaEstatisticas(), 'todos');
        definirPapelTemaEstatisticas('xyz');
        assert.equal(getPapelTemaEstatisticas(), 'todos');
    });

    it('"todos" conta qualquer papel', () => {
        const { labels, data } = agregarPorTema(['tema']);
        assert.deepEqual(Object.fromEntries(labels.map((l, i) => [l, data[i]])), {
            Amor: 2,
            Machismo: 2,
            Brasil: 1,
        });
    });

    it('principal, secundário e sem papel recortam a contagem', () => {
        const contar = (papel) => {
            definirPapelTemaEstatisticas(papel);
            const { labels, data } = agregarPorTema(['tema']);
            return Object.fromEntries(labels.map((l, i) => [l, data[i]]));
        };
        assert.deepEqual(contar('principal'), { Amor: 1, Machismo: 1 });
        assert.deepEqual(contar('secundario'), { Machismo: 1, Amor: 1 });
        assert.deepEqual(contar('semPapel'), { Brasil: 1 });
    });

    it('vale também pro "ao longo do tempo" e pros anos distintos', () => {
        definirPapelTemaEstatisticas('principal');
        assert.deepEqual(agregarTemaPorAno('Amor'), { labels: ['2020'], data: [1] });
        assert.deepEqual(anosDistintosPorTema(), { Amor: 1, Machismo: 1 });
    });

    it('não afeta as outras categorias de etiqueta', () => {
        db.poemas[0].sinalizacoesTom = 'Ironia';
        definirPapelTemaEstatisticas('semPapel');
        const { labels } = agregarPorTema(['tom']);
        assert.deepEqual(labels, ['Ironia']);
    });
});

describe('Papel do assunto nas Estatísticas', () => {
    const porNome = () => {
        const { labels, data } = agregarPorAssunto();
        return Object.fromEntries(labels.map((l, i) => [l, data[i]]));
    };

    beforeEach(() => {
        resetarDb();
        db.temas = [
            { id: 1, nome: 'Amor', notas: '' },
            { id: 2, nome: 'Machismo', notas: '' },
            { id: 3, nome: 'Brasil', notas: '' },
        ];
        db.assuntos = [
            { id: 10, nome: 'Vida emocional', notas: '', temaIds: [1] },
            { id: 11, nome: 'Sociedade', notas: '', temaIds: [2, 3] },
        ];
        // Poema 1: Amor principal, Machismo secundário, Brasil indefinido.
        //   Vida emocional herda principal; Sociedade herda o mais forte (secundário).
        // Poema 2: Machismo principal, Amor secundário.
        //   Sociedade principal; Vida emocional secundário.
        db.poemas = [
            {
                ano: 2020,
                sinalizacoesTema: 'Amor, Machismo, Brasil',
                temas: [
                    { temaId: 1, papel: 'principal' },
                    { temaId: 2, papel: 'secundario' },
                    { temaId: 3, papel: '' },
                ],
            },
            {
                ano: 2021,
                sinalizacoesTema: 'Machismo, Amor',
                temas: [
                    { temaId: 2, papel: 'principal' },
                    { temaId: 1, papel: 'secundario' },
                ],
            },
        ];
        db.prosas = [];
        definirPapelAssuntoEstatisticas('todos');
    });
    afterEach(() => definirPapelAssuntoEstatisticas('todos'));

    it('padrão é "todos" e valor inválido cai em "todos"', () => {
        assert.equal(getPapelAssuntoEstatisticas(), 'todos');
        definirPapelAssuntoEstatisticas('xyz');
        assert.equal(getPapelAssuntoEstatisticas(), 'todos');
    });

    it('"todos" conta qualquer papel, como sempre', () => {
        assert.deepEqual(porNome(), { 'Vida emocional': 2, Sociedade: 2 });
    });

    it('principal, secundário e indefinido recortam pelo papel efetivo do Assunto', () => {
        const contar = (papel) => {
            definirPapelAssuntoEstatisticas(papel);
            return porNome();
        };
        assert.deepEqual(contar('principal'), { 'Vida emocional': 1, Sociedade: 1 });
        assert.deepEqual(contar('secundario'), { 'Vida emocional': 1, Sociedade: 1 });
        assert.deepEqual(contar('semPapel'), {});
    });

    it('papel fixado no texto vale no recorte (sobrescreve o herdado do Tema)', () => {
        db.poemas[0].assuntosPapel = [{ assuntoId: 11, papel: '' }];
        definirPapelAssuntoEstatisticas('semPapel');
        assert.deepEqual(porNome(), { Sociedade: 1 });
        definirPapelAssuntoEstatisticas('secundario');
        assert.deepEqual(porNome(), { 'Vida emocional': 1 });
    });

    it('a escolha é independente da do Tema', () => {
        definirPapelTemaEstatisticas('principal');
        assert.equal(getPapelAssuntoEstatisticas(), 'todos');
        definirPapelAssuntoEstatisticas('secundario');
        assert.equal(getPapelTemaEstatisticas(), 'principal');
        definirPapelTemaEstatisticas('todos');
    });
});
