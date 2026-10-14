import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Hierarquia dos Períodos Históricos: um período pode estar dentro de outro
// (Segundo mandato, dentro do Governo Dilma Rousseff, dentro da Nova
// República), ligado por `pertenceA` (lista de ids; o primeiro é o principal).

const __dirname = path.dirname(fileURLToPath(import.meta.url));
document.body.innerHTML =
    fs.readFileSync(path.resolve(__dirname, '../modais/modal-periodo-historico.html'), 'utf8') +
    '<div id="lista-periodos-historicos"></div><div id="filtros-periodo-periodosHistoricos"></div>';

const H = await import('../js/periodos-historicos-hierarquia.js');
const D = await import('../js/db.js');
const { db } = D;
const { filtrarTextos } = await import('../js/utils.js');
const { editarPeriodoHistorico, initFormPeriodoHistorico } = await import('../js/forms.js');
const { renderPeriodosHistoricos, decorarCamposBusca } = await import('../js/render-listas.js');
const { prepararNovo } = await import('../js/ui.js');
const { deleteItem } = D;

const ids = (lista) => lista.map((i) => i.id);

// Nova República > Governo Dilma Rousseff > 2º mandato; Nova República >
// Governo Lula; Era PT (outro recorte) contém Governo Lula e Governo Dilma.
const arvore = () => [
    { id: 1, nome: 'Nova República', pertenceA: [], inicio: { ano: 1985 }, fim: null },
    {
        id: 2,
        nome: 'Governo Dilma Rousseff',
        pertenceA: [1, 6],
        inicio: { ano: 2011 },
        fim: { ano: 2016 },
    },
    {
        id: 3,
        nome: 'Segundo mandato',
        pertenceA: [2],
        inicio: { ano: 2015 },
        fim: { ano: 2016 },
    },
    { id: 4, nome: 'Governo Lula', pertenceA: [1, 6], inicio: { ano: 2003 }, fim: { ano: 2010 } },
    { id: 5, nome: 'Ditadura Militar', pertenceA: [], inicio: { ano: 1964 }, fim: { ano: 1985 } },
    { id: 6, nome: 'Era PT', pertenceA: [], inicio: { ano: 2003 }, fim: { ano: 2016 } },
];

describe('módulo: relações', () => {
    const lista = arvore();

    it('pais na ordem gravada, ignorando id que não existe e o próprio período', () => {
        assert.deepEqual(H.paisDoPeriodo(lista, 2), [1, 6]);
        const suja = [
            { id: 1, nome: 'A', pertenceA: [9, 1, 2, 2] },
            { id: 2, nome: 'B' },
        ];
        assert.deepEqual(H.paisDoPeriodo(suja, 1), [2]);
        assert.deepEqual(H.paisDoPeriodo(suja, 2), []);
    });

    it('filhos diretos, descendentes e ancestrais', () => {
        assert.deepEqual(H.filhosDoPeriodo(lista, 1), [2, 4]);
        assert.deepEqual(H.descendentesDoPeriodo(lista, 1).sort(), [2, 3, 4]);
        assert.deepEqual(H.descendentesDoPeriodo(lista, 6).sort(), [2, 3, 4]);
        assert.deepEqual(H.ancestraisDoPeriodo(lista, 3), [2, 1, 6]);
        assert.deepEqual(H.ancestraisDoPeriodo(lista, 5), []);
    });

    it('caminho segue o primeiro pai; o dos ancestrais não inclui o próprio', () => {
        assert.equal(
            H.caminhoDoPeriodo(lista, 3),
            'Nova República › Governo Dilma Rousseff › Segundo mandato',
        );
        assert.equal(H.caminhoDoPeriodo(lista, 5), 'Ditadura Militar');
        assert.equal(H.caminhoDoPeriodo(lista, 999), '');
        assert.equal(
            H.caminhoDosAncestraisDoPeriodo(lista, 3),
            'Nova República › Governo Dilma Rousseff',
        );
        assert.equal(H.caminhoDosAncestraisDoPeriodo(lista, 1), '');
    });

    it('ciclo: ser filho de si mesmo ou de um descendente', () => {
        assert.equal(H.criaCicloPeriodo(lista, 1, [1]), true);
        assert.equal(H.criaCicloPeriodo(lista, 1, [3]), true);
        assert.equal(H.criaCicloPeriodo(lista, 3, [6]), false);
        assert.equal(H.criaCicloPeriodo(lista, 3, []), false);
    });

    it('opções de pai: todos menos o período e os de dentro dele', () => {
        // ordem alfabética: Ditadura Militar, Era PT, Governo Lula, Nova República
        assert.deepEqual(ids(H.opcoesDePaiDoPeriodo(lista, 2)), [5, 6, 4, 1]);
        assert.equal(H.opcoesDePaiDoPeriodo(lista, null).length, 6);
    });

    it('tolera ciclo em dado corrompido', () => {
        const ciclo = [
            { id: 1, nome: 'A', pertenceA: [2] },
            { id: 2, nome: 'B', pertenceA: [1] },
        ];
        assert.deepEqual(H.ancestraisDoPeriodo(ciclo, 1), [2]);
        assert.equal(H.caminhoDoPeriodo(ciclo, 1), 'B › A');
        assert.equal(H.ordenarPeriodosEmArvore(ciclo, () => 0).length, 2);
    });
});

describe('módulo: nomes de busca', () => {
    const lista = arvore();

    it('direto: só o período; com ancestrais: toda a cadeia, sem repetir', () => {
        assert.deepEqual(H.nomesDeBuscaDosPeriodos(lista, 3), ['Segundo mandato']);
        assert.deepEqual(H.nomesDeBuscaDosPeriodos(lista, 3, { comAncestrais: true }), [
            'Segundo mandato',
            'Governo Dilma Rousseff',
            'Nova República',
            'Era PT',
        ]);
    });

    it('aceita id solto, vazio e id inexistente', () => {
        assert.deepEqual(H.nomesDeBuscaDosPeriodos(lista, 5), ['Ditadura Militar']);
        assert.deepEqual(H.nomesDeBuscaDosPeriodos(lista, null), []);
        assert.deepEqual(H.nomesDeBuscaDosPeriodos(lista, [999]), []);
    });
});

describe('módulo: datas fora do pai', () => {
    const lista = arvore();

    it('dentro do pai: ninguém acusado', () => {
        assert.deepEqual(
            H.paisQueNaoContem(lista, { inicio: { ano: 2015 }, fim: { ano: 2016 } }, [2]),
            [],
        );
    });

    it('começa antes ou termina depois do pai: acusa', () => {
        assert.deepEqual(
            H.paisQueNaoContem(lista, { inicio: { ano: 2009 }, fim: { ano: 2012 } }, [2]),
            [2],
        );
        assert.deepEqual(
            H.paisQueNaoContem(lista, { inicio: { ano: 2012 }, fim: { ano: 2020 } }, [2]),
            [2],
        );
    });

    it('pai sem fim (em aberto) não acusa o término; só o começo', () => {
        assert.deepEqual(
            H.paisQueNaoContem(lista, { inicio: { ano: 2020 }, fim: { ano: 2030 } }, [1]),
            [],
        );
        assert.deepEqual(H.paisQueNaoContem(lista, { inicio: { ano: 1970 }, fim: null }, [1]), [1]);
    });

    it('evento pontual conta como começo e fim na mesma data', () => {
        assert.deepEqual(H.paisQueNaoContem(lista, { inicio: { ano: 2013 }, fim: null }, [2]), []);
        assert.deepEqual(H.paisQueNaoContem(lista, { inicio: { ano: 2020 }, fim: null }, [2]), [2]);
    });

    it('data ambígua (só o ano) não gera falso positivo; sem data nunca acusa', () => {
        const l = [{ id: 1, nome: 'P', inicio: { ano: 2011, mes: 6 }, fim: { ano: 2016, mes: 8 } }];
        assert.deepEqual(
            H.paisQueNaoContem(l, { inicio: { ano: 2011 }, fim: { ano: 2016 } }, [1]),
            [],
        );
        assert.deepEqual(H.paisQueNaoContem(l, { inicio: null, fim: null }, [1]), []);
        assert.deepEqual(
            H.paisQueNaoContem([{ id: 1, nome: 'P' }], { inicio: { ano: 1 } }, [1]),
            [],
        );
    });
});

describe('módulo: ordem em árvore', () => {
    const porNome = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR');

    // Era PT contém Lula e Dilma, mas eles ficam sob Nova República (pai principal)
    it('cada período seguido dos de dentro, com o nível; vários pais ficam sob o principal', () => {
        const saida = H.ordenarPeriodosEmArvore(arvore(), porNome);
        assert.deepEqual(
            saida.map(({ m, nivel }) => `${nivel}:${m.nome}`),
            [
                '0:Ditadura Militar',
                '0:Era PT',
                '0:Nova República',
                '1:Governo Dilma Rousseff',
                '2:Segundo mandato',
                '1:Governo Lula',
            ],
        );
    });

    it('pai que ficou fora da lista (filtro) deixa o filho como de topo', () => {
        const so = arvore().filter((p) => p.id !== 1 && p.id !== 6);
        const saida = H.ordenarPeriodosEmArvore(so, porNome);
        assert.deepEqual(
            saida.map(({ m, nivel }) => `${nivel}:${m.nome}`),
            [
                '0:Ditadura Militar',
                '0:Governo Dilma Rousseff',
                '1:Segundo mandato',
                '0:Governo Lula',
            ],
        );
    });
});

describe('módulo: manutenção do dado', () => {
    it('sanear: cria lista, tira id inexistente, repetido e o próprio, e desfaz ciclo', () => {
        const lista = [
            { id: 1, nome: 'A' },
            { id: 2, nome: 'B', pertenceA: [1, 1, 99, 2] },
            { id: 3, nome: 'C', pertenceA: [4] },
            { id: 4, nome: 'D', pertenceA: [3] },
        ];
        assert.equal(H.sanearHierarquiaDePeriodos(lista), true);
        assert.deepEqual(lista[0].pertenceA, []);
        assert.deepEqual(lista[1].pertenceA, [1]);
        const ciclo34 = H.criaCicloPeriodo(lista, 3, lista[2].pertenceA);
        assert.equal(ciclo34, false, 'o ciclo foi cortado em um dos lados');
        assert.equal(H.sanearHierarquiaDePeriodos(lista), false, 'idempotente');
    });

    it('retirar: os filhos sobem para os pais do excluído e o anterior fica guardado', () => {
        const lista = arvore();
        const alterados = H.retirarPeriodoDaHierarquia(lista, 2);
        assert.deepEqual(alterados, [{ id: 3, anterior: [2] }]);
        assert.deepEqual(lista.find((p) => p.id === 3).pertenceA, [1, 6]);
    });

    it('retirar com o período já fora da lista usa os pais informados', () => {
        const lista = arvore();
        const paisDele = H.paisDoPeriodo(lista, 2);
        const semEle = lista.filter((p) => p.id !== 2);
        H.retirarPeriodoDaHierarquia(semEle, 2, paisDele);
        assert.deepEqual(semEle.find((p) => p.id === 3).pertenceA, [1, 6]);
    });

    it('destino dos filhos ao excluir: sobem, mantêm ou viram de topo', () => {
        const lista = arvore();
        assert.deepEqual(H.destinoDosFilhosAoExcluir(lista, 2), {
            topo: [],
            sobem: [3],
            mantem: [],
        });
        assert.deepEqual(H.destinoDosFilhosAoExcluir(lista, 6), {
            topo: [],
            sobem: [],
            mantem: [2, 4],
        });
        const solto = [
            { id: 1, nome: 'A', pertenceA: [] },
            { id: 2, nome: 'B', pertenceA: [1] },
        ];
        assert.deepEqual(H.destinoDosFilhosAoExcluir(solto, 1), {
            topo: [2],
            sobem: [],
            mantem: [],
        });
        assert.deepEqual(H.destinoDosFilhosAoExcluir(solto, 2), {
            topo: [],
            sobem: [],
            mantem: [],
        });
    });

    it('retirar período de topo solta os filhos', () => {
        const lista = [
            { id: 1, nome: 'A', pertenceA: [] },
            { id: 2, nome: 'B', pertenceA: [1] },
        ];
        H.retirarPeriodoDaHierarquia(lista, 1);
        assert.deepEqual(lista[1].pertenceA, []);
    });

    it('mesclar: filhos da origem passam ao destino; origem sai da hierarquia', () => {
        const lista = arvore();
        const origem = lista.find((p) => p.id === 2);
        const destino = lista.find((p) => p.id === 4);
        H.mesclarHierarquiaDePeriodos(lista, origem, destino);
        assert.deepEqual(lista.find((p) => p.id === 3).pertenceA, [4]);
        assert.deepEqual(destino.pertenceA, [1, 6], 'destino com pais mantém os seus');
    });

    it('mesclar: destino sem pai herda os da origem; destino filho da origem não vira filho de si', () => {
        const a = arvore();
        const origemA = a.find((p) => p.id === 2);
        const destinoA = a.find((p) => p.id === 5);
        H.mesclarHierarquiaDePeriodos(a, origemA, destinoA);
        assert.deepEqual(destinoA.pertenceA, [1, 6]);

        const b = arvore();
        const origemB = b.find((p) => p.id === 2);
        const destinoB = b.find((p) => p.id === 3); // filho da origem
        H.mesclarHierarquiaDePeriodos(b, origemB, destinoB);
        const semOrigem = b.filter((p) => p.id !== 2);
        assert.deepEqual(destinoB.pertenceA, [1, 6]);
        assert.equal(H.criaCicloPeriodo(semOrigem, 3, destinoB.pertenceA), false);
    });
});

describe('banco: migração, criação, impacto e mesclagem', () => {
    beforeEach(() => {
        db.periodosHistoricos = arvore();
        db.periodosHistoricosOcultos = [];
        db.poemas = [
            { id: 10, titulo: 'P10', periodosHistoricosIds: [3] },
            { id: 11, titulo: 'P11', periodosHistoricosIds: [2] },
            { id: 12, titulo: 'P12', periodosHistoricosIds: [5] },
        ];
        db.prosas = [{ id: 20, titulo: 'R20', periodosHistoricosIds: [1] }];
    });

    it('migração dá `pertenceA` vazio a quem não tem e é idempotente', () => {
        const lista = [
            { id: 1, nome: 'A' },
            { id: 2, nome: 'B', pertenceA: [1] },
        ];
        assert.equal(D.migrarHierarquiaPeriodosHistoricos(lista), true);
        assert.deepEqual(lista[0].pertenceA, []);
        assert.equal(D.migrarHierarquiaPeriodosHistoricos(lista), false);
    });

    it('os períodos de fábrica nascem de topo (sem pai definido)', () => {
        const seed = D.db.periodosHistoricos;
        db.periodosHistoricos = [];
        D.migrarPeriodosHistoricosEmbutidos(db.periodosHistoricos, []);
        D.migrarHierarquiaPeriodosHistoricos(db.periodosHistoricos);
        assert.ok(db.periodosHistoricos.length > 0);
        assert.ok(db.periodosHistoricos.every((p) => (p.pertenceA || []).length === 0));
        db.periodosHistoricos = seed;
    });

    it('criação por nome nasce de topo', () => {
        const p = D.obterOuCriarPeriodoHistoricoPorNome('Período novo X');
        assert.deepEqual(p.pertenceA, []);
    });

    it('impacto lista os períodos de dentro (fora da conta de textos)', () => {
        const imp = D.calcularImpactoExclusaoPeriodoHistorico(db, 1);
        assert.deepEqual(imp.filhosIds, [2, 4]);
        assert.deepEqual(imp.poemasIds, []);
        assert.deepEqual(imp.prosasIds, [20]);
    });

    it('textos com e sem os períodos de dentro', () => {
        const direto = D.textosDoPeriodoHistorico(db, 1);
        assert.deepEqual([direto.poemasIds, direto.prosasIds], [[], [20]]);
        const todos = D.textosDoPeriodoHistorico(db, 1, { comDentro: true });
        assert.deepEqual(todos.poemasIds.sort(), [10, 11]);
        assert.deepEqual(todos.prosasIds, [20]);
    });

    it('mesclar passa os filhos da origem ao destino', () => {
        D.mesclarPeriodosHistoricos(db, 2, 4);
        const por = (id) => db.periodosHistoricos.find((p) => p.id === id);
        assert.equal(por(2), undefined);
        assert.deepEqual(por(3).pertenceA, [4]);
        assert.deepEqual(db.poemas.find((p) => p.id === 11).periodosHistoricosIds, [4]);
    });
});

describe('exclusão com desfazer', () => {
    beforeEach(() => {
        db.periodosHistoricos = arvore();
        db.periodosHistoricosOcultos = [];
        db.poemas = [];
        db.prosas = [];
        db.autores = [];
    });

    const por = (id) => db.periodosHistoricos.find((p) => p.id === id);

    it('os de dentro sobem para os pais do excluído; o desfazer devolve tudo', () => {
        deleteItem('periodosHistoricos', 2);
        assert.match(
            document.body.textContent,
            /1 período dentro dele passa a ficar nos períodos acima/,
        );
        document.getElementById('excl-confirmar').click();
        assert.equal(por(2), undefined);
        assert.deepEqual(por(3).pertenceA, [1, 6]);

        document.querySelector('#avisos-toast button').click();
        assert.deepEqual(por(2).pertenceA, [1, 6]);
        assert.deepEqual(por(3).pertenceA, [2]);
    });

    it('excluir um dos pais: quem tem outro pai continua dentro dele; o desfazer devolve', () => {
        deleteItem('periodosHistoricos', 6);
        assert.match(
            document.body.textContent,
            /2 períodos dentro dele continuam dentro de outro período/,
        );
        document.getElementById('excl-confirmar').click();
        assert.deepEqual(por(2).pertenceA, [1]);
        assert.deepEqual(por(4).pertenceA, [1]);

        document.querySelector('#avisos-toast button').click();
        assert.deepEqual(por(2).pertenceA, [1, 6]);
        assert.deepEqual(por(4).pertenceA, [1, 6]);
    });
});

describe('exclusão: aviso para quem fica sem pai', () => {
    it('filho de um período de topo vira de topo', () => {
        db.periodosHistoricos = [
            { id: 1, nome: 'A', pertenceA: [] },
            { id: 2, nome: 'B', pertenceA: [1] },
        ];
        db.periodosHistoricosOcultos = [];
        db.poemas = [];
        db.prosas = [];
        db.autores = [];
        deleteItem('periodosHistoricos', 1);
        assert.match(document.body.textContent, /1 período dentro dele vira período de topo/);
        document.getElementById('excl-confirmar').click();
        assert.deepEqual(db.periodosHistoricos.find((p) => p.id === 2).pertenceA, []);
    });
});

describe('formulário: Pertence a', () => {
    beforeEach(() => {
        db.periodosHistoricos = arvore();
        db.periodosHistoricosOcultos = [];
        db.poemas = [];
        db.prosas = [];
        initFormPeriodoHistorico();
    });

    const opcoes = () =>
        [...document.querySelectorAll('#ph-pais-select option:not([disabled])')]
            .map((o) => o.getAttribute('value'))
            .filter(Boolean);
    const chips = () => [...document.querySelectorAll('#ph-pais-chips span')];
    const salvar = () => document.getElementById('form-periodo-historico').requestSubmit();
    const por = (id) => db.periodosHistoricos.find((p) => p.id === id);

    it('mostra os pais como chips (o primeiro é o principal) e não oferece quem não pode ser pai', async () => {
        await editarPeriodoHistorico(2);
        assert.equal(chips().length, 2);
        assert.match(chips()[0].textContent, /Nova República · principal/);
        assert.doesNotMatch(chips()[1].textContent, /principal/);
        // sem ele mesmo, sem os de dentro (3) e sem quem já é pai (1, 6)
        assert.deepEqual(opcoes().sort(), ['4', '5']);
    });

    it('adicionar, tornar principal e remover pai', async () => {
        await editarPeriodoHistorico(3);
        assert.equal(chips().length, 1);
        const select = document.getElementById('ph-pais-select');
        select.value = '6';
        select.dispatchEvent(new window.Event('change'));
        assert.equal(chips().length, 2);
        chips()[1].querySelector('button').click(); // tornar principal
        assert.match(chips()[0].textContent, /Era PT · principal/);
        chips()[0].querySelectorAll('button')[1].click(); // remover
        assert.equal(chips().length, 1);
        assert.match(
            chips()[0].textContent,
            /Governo Dilma Rousseff \(Nova República\) · principal/,
        );
    });

    it('salvar grava `pertenceA` na ordem escolhida e preserva o resto', async () => {
        await editarPeriodoHistorico(3);
        const select = document.getElementById('ph-pais-select');
        select.value = '1';
        select.dispatchEvent(new window.Event('change'));
        salvar();
        assert.deepEqual(por(3).pertenceA, [2, 1]);
        assert.equal(por(3).nome, 'Segundo mandato');
    });

    it('novo período começa sem pai e salva como de topo', async () => {
        await prepararNovo('periodo-historico');
        assert.equal(chips().length, 0);
        assert.equal(opcoes().length, 6);
        document.getElementById('ph-nome').value = 'Período do teste';
        salvar();
        const novo = db.periodosHistoricos.find((p) => p.nome === 'Período do teste');
        assert.deepEqual(novo.pertenceA, []);
    });

    it('datas fora do pai: salva mesmo assim e avisa', async () => {
        await editarPeriodoHistorico(3);
        document.getElementById('ph-ini-ano').value = '2005';
        salvar();
        assert.equal(por(3).inicio.ano, 2005);
        assert.match(
            document.getElementById('avisos-toast').textContent,
            /saem do intervalo de "Governo Dilma Rousseff"/,
        );
    });
});

describe('lista em árvore', () => {
    beforeEach(() => {
        db.periodosHistoricos = arvore();
        db.poemas = [{ id: 10, titulo: 'P10', periodosHistoricosIds: [3] }];
        db.prosas = [];
    });

    it('os de dentro vêm recuados abaixo do pai, com contagem com os de dentro', () => {
        renderPeriodosHistoricos();
        const cards = [...document.querySelectorAll('#lista-periodos-historicos > div')];
        const titulos = cards.map((c) => c.querySelector('h4').textContent);
        const iNova = titulos.indexOf('Nova República');
        // os de dentro seguem a ordem da lista (aqui, cronológica): Lula, Dilma
        assert.equal(titulos[iNova + 1], 'Governo Lula');
        assert.equal(titulos[iNova + 2], 'Governo Dilma Rousseff');
        assert.equal(titulos[iNova + 3], 'Segundo mandato');
        assert.equal(cards[iNova].getAttribute('style'), 'margin-left: 0rem');
        assert.equal(cards[iNova + 1].getAttribute('style'), 'margin-left: 1.5rem');
        assert.equal(cards[iNova + 2].getAttribute('style'), 'margin-left: 1.5rem');
        assert.equal(cards[iNova + 3].getAttribute('style'), 'margin-left: 3rem');
        assert.match(
            cards[iNova].textContent,
            /aparece em 0 textos \(1 com os de dentro\) · 2 períodos dentro/,
        );
        assert.match(cards[iNova + 1].textContent, /também em Era PT/);
    });
});

describe('busca por período histórico', () => {
    let itens;
    const texto = (id, periodoHistoricoId) => ({
        id,
        titulo: `T${id}`,
        periodosHistoricosIds: periodoHistoricoId == null ? [] : [periodoHistoricoId],
    });
    beforeEach(() => {
        db.periodosHistoricos = arvore();
        itens = [
            texto(1, 3), // Segundo mandato
            texto(2, 2), // Governo Dilma
            texto(3, 4), // Governo Lula
            texto(4, 5), // Ditadura
            texto(5, null),
        ].map((i) => decorarCamposBusca(i));
    });

    it('o período que contém acha o texto dos de dentro', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'periodohistorico:"Nova República"')), [1, 2, 3]);
        assert.deepEqual(ids(filtrarTextos(itens, 'periodohistorico:"Governo Dilma"')), [1, 2]);
        assert.deepEqual(ids(filtrarTextos(itens, 'periodohistorico:"Segundo mandato"')), [1]);
    });

    it('a busca geral também acha pelo período que contém', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'Nova República')), [1, 2, 3]);
    });

    it('periodohistoricodireto: só o período exato', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'periodohistoricodireto:"Governo Dilma"')), [2]);
        assert.deepEqual(ids(filtrarTextos(itens, 'periodohistoricodireto:"Nova República"')), []);
    });

    it('quem não tem período não aparece', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'periodohistorico:"Era PT"')), [1, 2, 3]);
        assert.ok(!ids(filtrarTextos(itens, 'periodohistorico:*')).includes(5));
    });
});
