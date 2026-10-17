import './helpers/dom-real.js';

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Bloco 2e: cada Poema/Prosa guarda uma LISTA de Períodos Históricos
// (`periodosHistoricosIds`, sem período principal) no lugar do antigo
// `periodoHistoricoId`. Exemplo do projeto: um texto sobre a pandemia no
// governo Bolsonaro entra em "Governo Bolsonaro" e em "Pandemia de covid-19",
// que é um período de topo, independente (se estende até 2023).

const __dirname = path.dirname(fileURLToPath(import.meta.url));
document.body.innerHTML =
    fs.readFileSync(path.resolve(__dirname, '../modais/modal-periodo-historico.html'), 'utf8') +
    '<div id="lista-periodos-historicos"></div><div id="filtros-periodo-periodosHistoricos"></div>';

const D = await import('../js/db.js');
const { db, deleteItem } = D;
const { periodosHistoricosIdsDoItem, nomesPeriodosHistoricosDoItem, filtrarTextos } =
    await import('../js/utils.js');
const { decorarCamposBusca } = await import('../js/render-listas.js');
const { montarRegistro } = await import('../js/exportar.js');
const { gerarCsvTextos } = await import('../js/exportar-csv.js');
const { itemParaMarkdown } = await import('../js/exportar-md.js');
const { classificarImportacaoAditiva, aplicarImportacaoAditiva } =
    await import('../js/importar-aditivo.js');
const { caminhoDoPeriodo } = await import('../js/periodos-historicos-hierarquia.js');

const BOLSONARO = 3;
const PANDEMIA = 5;

// Nova República > Governo Bolsonaro; Nova República > Governo Lula;
// Pandemia de covid-19 (topo, fora dos dois); Ditadura Militar (topo).
const arvore = () => [
    { id: 1, nome: 'Nova República', pertenceA: [] },
    { id: 2, nome: 'Governo Lula', pertenceA: [1] },
    { id: BOLSONARO, nome: 'Governo Bolsonaro', pertenceA: [1] },
    { id: 4, nome: 'Ditadura Militar', pertenceA: [] },
    { id: PANDEMIA, nome: 'Pandemia de covid-19', pertenceA: [] },
];

const ids = (lista) => lista.map((i) => i.id);

describe('helpers: periodosHistoricosIdsDoItem e nomesPeriodosHistoricosDoItem', () => {
    it('lista nova: devolve sem repetidos nem vazios', () => {
        const item = { periodosHistoricosIds: [3, 5, 3, null, ''] };
        assert.deepEqual(periodosHistoricosIdsDoItem(item), [3, 5]);
    });

    it('dado antigo (periodoHistoricoId) ainda é entendido', () => {
        assert.deepEqual(periodosHistoricosIdsDoItem({ periodoHistoricoId: 7 }), [7]);
        assert.deepEqual(periodosHistoricosIdsDoItem({ periodoHistoricoId: null }), []);
        assert.deepEqual(periodosHistoricosIdsDoItem({}), []);
    });

    it('com o cadastro, id que não existe mais sai', () => {
        assert.deepEqual(
            periodosHistoricosIdsDoItem({ periodosHistoricosIds: [3, 999] }, arvore()),
            [3],
        );
    });

    it('nomes na ordem da lista', () => {
        const item = { periodosHistoricosIds: [PANDEMIA, BOLSONARO] };
        assert.deepEqual(nomesPeriodosHistoricosDoItem(item, arvore()), [
            'Pandemia de covid-19',
            'Governo Bolsonaro',
        ]);
    });
});

describe('migrarPeriodosHistoricosMultiplos', () => {
    it('com valor vira [valor], sem valor vira [], e o campo antigo sai', () => {
        const itens = [
            { id: 1, periodoHistoricoId: 3 },
            { id: 2, periodoHistoricoId: null },
            { id: 3 },
        ];
        D.migrarPeriodosHistoricosMultiplos(itens);
        assert.deepEqual(
            itens.map((i) => i.periodosHistoricosIds),
            [[3], [], []],
        );
        assert.ok(itens.every((i) => !('periodoHistoricoId' in i)));
    });

    it('é idempotente e normaliza lista que já existe', () => {
        const itens = [{ id: 1, periodosHistoricosIds: [3, 3, 5] }];
        D.migrarPeriodosHistoricosMultiplos(itens);
        D.migrarPeriodosHistoricosMultiplos(itens);
        assert.deepEqual(itens[0].periodosHistoricosIds, [3, 5]);
    });

    it('com o cadastro, tira id que não existe mais sem barulho', () => {
        const itens = [{ id: 1, periodoHistoricoId: 999 }];
        D.migrarPeriodosHistoricosMultiplos(itens, arvore());
        assert.deepEqual(itens[0].periodosHistoricosIds, []);
    });

    const caminhoBackup = path.resolve(__dirname, '../data/arquivo_poetico_backup_2026-10-08.json');
    it(
        'backup real antigo: os mesmos períodos continuam nos textos',
        {
            skip: !fs.existsSync(caminhoBackup),
        },
        () => {
            const backup = JSON.parse(fs.readFileSync(caminhoBackup, 'utf8'));
            const antes = new Map();
            for (const col of ['poemas', 'prosas']) {
                for (const it of backup[col]) {
                    const valido =
                        it.periodoHistoricoId != null &&
                        backup.periodosHistoricos.some((p) => p.id == it.periodoHistoricoId);
                    antes.set(`${col}:${it.id}`, valido ? [it.periodoHistoricoId] : []);
                }
            }
            for (const col of ['poemas', 'prosas']) {
                D.migrarPeriodosHistoricosMultiplos(backup[col], backup.periodosHistoricos);
            }
            let comPeriodo = 0;
            for (const col of ['poemas', 'prosas']) {
                for (const it of backup[col]) {
                    assert.ok(Array.isArray(it.periodosHistoricosIds));
                    assert.ok(!('periodoHistoricoId' in it));
                    const esperado = antes.get(`${col}:${it.id}`);
                    assert.deepEqual(it.periodosHistoricosIds, esperado);
                    if (esperado.length) comPeriodo++;
                }
            }
            assert.ok(comPeriodo > 0, 'o backup tem textos com período para provar a migração');
        },
    );
});

describe('busca e contagem com mais de um período por texto', () => {
    let itens;
    beforeEach(() => {
        db.periodosHistoricos = arvore();
        db.poemas = [
            { id: 1, titulo: 'Condução da pandemia', periodosHistoricosIds: [BOLSONARO, PANDEMIA] },
            { id: 2, titulo: 'Só governo', periodosHistoricosIds: [BOLSONARO] },
            { id: 3, titulo: 'Só pandemia', periodosHistoricosIds: [PANDEMIA] },
            { id: 4, titulo: 'Dois dentro do mesmo ramo', periodosHistoricosIds: [2, BOLSONARO] },
            { id: 5, titulo: 'Sem período', periodosHistoricosIds: [] },
        ];
        db.prosas = [];
        itens = db.poemas.map((p) => decorarCamposBusca({ ...p }));
    });

    it('acha o texto por qualquer um dos períodos dele', () => {
        assert.deepEqual(
            ids(filtrarTextos(itens, 'periodohistorico:"Governo Bolsonaro"')),
            [1, 2, 4],
        );
        assert.deepEqual(
            ids(filtrarTextos(itens, 'periodohistorico:"Pandemia de covid-19"')),
            [1, 3],
        );
    });

    it('acha o texto por qualquer ancestral de qualquer um dos períodos', () => {
        assert.deepEqual(ids(filtrarTextos(itens, 'periodohistorico:"Nova República"')), [1, 2, 4]);
    });

    it('periodohistoricodireto: só os períodos ligados ao texto', () => {
        assert.deepEqual(
            ids(filtrarTextos(itens, 'periodohistoricodireto:"Pandemia de covid-19"')),
            [1, 3],
        );
        assert.deepEqual(ids(filtrarTextos(itens, 'periodohistoricodireto:"Nova República"')), []);
    });

    it('card do período: o texto entra uma vez em cada período', () => {
        assert.deepEqual(D.textosDoPeriodoHistorico(db, BOLSONARO).poemasIds, [1, 2, 4]);
        assert.deepEqual(D.textosDoPeriodoHistorico(db, PANDEMIA).poemasIds, [1, 3]);
    });

    it('"com os de dentro" conta cada texto uma única vez', () => {
        // O texto 4 está em dois períodos de dentro de Nova República.
        const todos = D.textosDoPeriodoHistorico(db, 1, { comDentro: true }).poemasIds;
        assert.deepEqual([...todos].sort(), [1, 2, 4]);
        assert.equal(new Set(todos).size, todos.length);
    });
});

describe('mesclar período', () => {
    it('A vira B no lugar e não repete B se o texto já tinha', () => {
        const dbRef = {
            periodosHistoricos: [
                { id: 1, nome: 'Pandemia', pertenceA: [] },
                { id: 2, nome: 'Pandemia', pertenceA: [] },
                { id: 3, nome: 'Governo', pertenceA: [] },
            ],
            poemas: [
                { id: 10, periodosHistoricosIds: [3, 2] },
                { id: 11, periodosHistoricosIds: [1, 2] },
            ],
            prosas: [],
        };
        D.mesclarPeriodosHistoricos(dbRef, 2, 1);
        assert.deepEqual(dbRef.poemas[0].periodosHistoricosIds, [3, 1]);
        assert.deepEqual(dbRef.poemas[1].periodosHistoricosIds, [1]);
    });
});

describe('excluir período e desfazer', () => {
    beforeEach(() => {
        db.periodosHistoricos = arvore();
        db.periodosHistoricosOcultos = [];
        db.poemas = [
            { id: 1, titulo: 'A', periodosHistoricosIds: [BOLSONARO, PANDEMIA, 4] },
            { id: 2, titulo: 'B', periodosHistoricosIds: [PANDEMIA] },
        ];
        db.prosas = [{ id: 20, titulo: 'C', periodosHistoricosIds: [4, PANDEMIA] }];
        db.autores = [];
    });

    it('impacto olha dentro da lista e cada texto vale uma vez', () => {
        const imp = D.calcularImpactoExclusaoPeriodoHistorico(db, PANDEMIA);
        assert.deepEqual(imp.poemasIds, [1, 2]);
        assert.deepEqual(imp.prosasIds, [20]);
    });

    it('o texto perde só aquele id; o desfazer devolve o id à posição original', () => {
        deleteItem('periodosHistoricos', PANDEMIA);
        document.getElementById('excl-confirmar').click();
        assert.deepEqual(db.poemas[0].periodosHistoricosIds, [BOLSONARO, 4]);
        assert.deepEqual(db.poemas[1].periodosHistoricosIds, []);
        assert.deepEqual(db.prosas[0].periodosHistoricosIds, [4]);

        document.querySelector('#avisos-toast button').click();
        assert.deepEqual(db.poemas[0].periodosHistoricosIds, [BOLSONARO, PANDEMIA, 4]);
        assert.deepEqual(db.poemas[1].periodosHistoricosIds, [PANDEMIA]);
        assert.deepEqual(db.prosas[0].periodosHistoricosIds, [4, PANDEMIA]);
    });
});

describe('exportar e importar a lista', () => {
    const texto = {
        id: 1,
        titulo: 'Condução da pandemia',
        texto: 'x',
        periodosHistoricosIds: [BOLSONARO, PANDEMIA],
    };
    beforeEach(() => {
        db.periodosHistoricos = arvore();
    });

    const dbVazio = () => ({
        poemas: [],
        prosas: [],
        pessoas: [],
        grupos: [],
        autores: [],
        epocas: [],
        periodosHistoricos: [],
        livros: [],
        escansoes: [],
        estruturasTextuais: [],
    });
    const importar = async (payload, destino) => {
        const relatorio = classificarImportacaoAditiva(payload, destino);
        const deps = { tirarSnapshotSeNecessario: mock.fn(async () => true), save: mock.fn() };
        await aplicarImportacaoAditiva(payload, relatorio, destino, deps);
    };

    it('o JSON leva os dois períodos com nome e caminho', () => {
        const r = montarRegistro('poema', texto);
        assert.deepEqual(
            r.periodosHistoricosResolvidos.map((p) => p.caminho),
            ['Nova República › Governo Bolsonaro', 'Pandemia de covid-19'],
        );
    });

    it('CSV e MD juntam os períodos com ponto e vírgula', () => {
        const csv = gerarCsvTextos('poema', [montarRegistro('poema', texto)], db);
        assert.match(csv, /Governo Bolsonaro; Pandemia de covid-19/);
        const md = itemParaMarkdown(montarRegistro('poema', texto), db);
        assert.match(md, /Governo Bolsonaro[^\n]*; [^\n]*Pandemia de covid-19/);
    });

    it('exportar e importar num acervo vazio preserva a lista e a hierarquia', async () => {
        const payload = JSON.parse(JSON.stringify({ itens: [montarRegistro('poema', texto)] }));
        const destino = dbVazio();
        await importar(payload, destino);

        const nomes = destino.periodosHistoricos.map((p) => p.nome).sort();
        assert.deepEqual(nomes, ['Governo Bolsonaro', 'Nova República', 'Pandemia de covid-19']);
        const poema = destino.poemas[0];
        assert.equal(poema.periodosHistoricosIds.length, 2);
        assert.deepEqual(
            poema.periodosHistoricosIds.map((id) =>
                caminhoDoPeriodo(destino.periodosHistoricos, id),
            ),
            ['Nova República › Governo Bolsonaro', 'Pandemia de covid-19'],
        );
        assert.ok(!('periodoHistoricoId' in poema));
        assert.equal(
            poema.periodosHistoricosResolvidos,
            undefined,
            'não persiste a cópia decorativa',
        );
    });

    it('importar outro texto com os mesmos períodos casa pelos que já existem', async () => {
        const destino = dbVazio();
        await importar(
            JSON.parse(JSON.stringify({ itens: [montarRegistro('poema', texto)] })),
            destino,
        );
        const total = destino.periodosHistoricos.length;
        const outro = { ...texto, id: 2, titulo: 'Outro texto da pandemia' };
        await importar(
            JSON.parse(JSON.stringify({ itens: [montarRegistro('poema', outro)] })),
            destino,
        );
        assert.equal(destino.periodosHistoricos.length, total, 'não duplicou períodos');
        assert.equal(destino.poemas.length, 2);
        assert.deepEqual(
            destino.poemas[1].periodosHistoricosIds,
            destino.poemas[0].periodosHistoricosIds,
        );
    });

    it('arquivo antigo (periodoHistoricoId + nome/caminho) continua sendo aceito', async () => {
        const antigo = {
            id: 1,
            tipo: 'poema',
            titulo: 'Antigo',
            texto: 'x',
            pessoas: [],
            autoria: [],
            gruposDiretosResolvidos: [],
            livrosResolvidos: [],
            contexto: { livro: null, parte: null, secao: null },
            periodoHistoricoId: 3,
            periodoHistoricoNome: 'Governo Bolsonaro',
            periodoHistoricoCaminho: 'Nova República › Governo Bolsonaro',
        };
        const destino = dbVazio();
        await importar({ itens: [antigo] }, destino);
        assert.equal(destino.periodosHistoricos.length, 2);
        assert.equal(destino.poemas[0].periodosHistoricosIds.length, 1);
        assert.equal(
            caminhoDoPeriodo(
                destino.periodosHistoricos,
                destino.poemas[0].periodosHistoricosIds[0],
            ),
            'Nova República › Governo Bolsonaro',
        );
    });
});

describe('exportar movimentos/escolas para a importação aditiva', () => {
    it('o JSON leva movimentosEscolasResolvidos e a importação religa pelo nome', async () => {
        db.periodosHistoricos = [];
        db.movimentosEscolas = [
            { id: 11, nome: 'Modernismo' },
            { id: 12, nome: 'Simbolismo' },
        ];
        const r = montarRegistro('poema', {
            id: 1,
            titulo: 'T',
            texto: 'x',
            movimentosEscolasIds: [12, 11],
        });
        assert.deepEqual(r.movimentosEscolasResolvidos, [
            { id: 12, nome: 'Simbolismo', caminho: 'Simbolismo' },
            { id: 11, nome: 'Modernismo', caminho: 'Modernismo' },
        ]);

        const destino = {
            poemas: [],
            prosas: [],
            pessoas: [],
            grupos: [],
            autores: [],
            epocas: [],
            periodosHistoricos: [],
            movimentosEscolas: [{ id: 700, nome: 'Modernismo' }],
            livros: [],
            escansoes: [],
            estruturasTextuais: [],
        };
        const payload = JSON.parse(JSON.stringify({ itens: [r] }));
        const relatorio = classificarImportacaoAditiva(payload, destino);
        const deps = { tirarSnapshotSeNecessario: mock.fn(async () => true), save: mock.fn() };
        await aplicarImportacaoAditiva(payload, relatorio, destino, deps);
        const nomes = destino.poemas[0].movimentosEscolasIds.map(
            (id) => destino.movimentosEscolas.find((m) => m.id === id).nome,
        );
        assert.deepEqual(nomes, ['Simbolismo', 'Modernismo']);
        assert.equal(
            destino.movimentosEscolas.length,
            2,
            'Modernismo casou, Simbolismo foi criado',
        );
    });
});
