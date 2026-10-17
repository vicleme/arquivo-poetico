import './helpers/dom-real.js';

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Vários Períodos Biográficos por texto: `epocaRetratada` guarda
// `{ periodos: [{ epocaId, recorte }], inicio, fim, na }`. O recorte é por
// período; De/Até e N/A valem para o texto inteiro.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ler = (f) => fs.readFileSync(path.resolve(__dirname, '../modais', f), 'utf8');
document.body.innerHTML =
    ler('modal-poema.html') + ler('modal-prosa.html') + '<div id="avisos-toast"></div>';
for (const pref of ['p', 'pr']) {
    for (const cat of [
        'tradicao',
        'estilo',
        'relacao',
        'sensibilidade',
        'tom',
        'outros',
        'dominioImagetico',
    ]) {
        const id = `${pref}-sinal-${cat}`;
        if (!document.getElementById(id)) {
            document.body.insertAdjacentHTML('beforeend', `<input type="hidden" id="${id}" />`);
        }
    }
}

const D = await import('../js/db.js');
const { db, deleteItem } = D;
const U = await import('../js/utils.js');
const { decorarCamposBusca } = await import('../js/render-listas.js');
const { montarRegistro } = await import('../js/exportar.js');
const { gerarCsvTextos } = await import('../js/exportar-csv.js');
const { itemParaMarkdown } = await import('../js/exportar-md.js');
const { classificarImportacaoAditiva, aplicarImportacaoAditiva } =
    await import('../js/importar-aditivo.js');
const { initFormPoema } = await import('../js/forms.js');
const E = await import('../js/editor.js');
const { badgeEpocaRetratada } = await import('../js/celulas-tabela.js');

const LUTO = 1;
const CORTE = 2;
const FACULDADE = 3;

const epocas = () => [
    { id: LUTO, nome: 'Luto', autorId: 1, esferas: ['Afetiva'], categorias: [], pertenceA: [] },
    { id: CORTE, nome: 'Corte de contato', autorId: 1, esferas: [], categorias: [], pertenceA: [] },
    { id: FACULDADE, nome: 'Faculdade', autorId: 1, esferas: ['Estudos'], pertenceA: [] },
];
const dois = () => ({
    periodos: [
        { epocaId: CORTE, recorte: 'momento' },
        { epocaId: LUTO, recorte: 'repercussão' },
    ],
    inicio: { ano: 2020 },
    fim: { ano: 2021 },
    na: false,
});

describe('helpers: periodosDaEpocaRetratada', () => {
    it('lista nova: cópia sem repetidos, recorte por período', () => {
        const er = {
            periodos: [
                { epocaId: 1, recorte: 'momento' },
                { epocaId: 1, recorte: 'repercussão' },
                { epocaId: 2 },
                null,
            ],
        };
        assert.deepEqual(U.periodosDaEpocaRetratada(er), [
            { epocaId: 1, recorte: 'momento' },
            { epocaId: 2, recorte: null },
        ]);
    });

    it('formato antigo (epocaId e recorte direto) vira lista de um; sem período vira []', () => {
        assert.deepEqual(U.periodosDaEpocaRetratada({ epocaId: 5, recorte: 'momento' }), [
            { epocaId: 5, recorte: 'momento' },
        ]);
        assert.deepEqual(U.periodosDaEpocaRetratada({ epocaId: null, inicio: { ano: 1 } }), []);
        assert.deepEqual(U.periodosDaEpocaRetratada(null), []);
    });

    it('com o cadastro, id que não existe mais sai', () => {
        const er = { periodos: [{ epocaId: 1 }, { epocaId: 99 }] };
        assert.deepEqual(U.periodosDaEpocaRetratada(er, epocas()), [{ epocaId: 1, recorte: null }]);
    });
});

describe('formatarEpocaRetratada com vários períodos', () => {
    it('um período mantém o formato de sempre', () => {
        const er = {
            periodos: [{ epocaId: LUTO, recorte: 'repercussão' }],
            inicio: { ano: 2020 },
            fim: { ano: 2021 },
        };
        assert.equal(U.formatarEpocaRetratada(er, epocas()), 'Luto e pós (2020 – 2021)');
    });

    it('cada período leva o seu recorte e o intervalo vem uma vez só', () => {
        assert.equal(
            U.formatarEpocaRetratada(dois(), epocas()),
            'Corte de contato [Momento]; Luto e pós (2020 – 2021)',
        );
    });

    it('formato antigo continua formatando', () => {
        assert.equal(
            U.formatarEpocaRetratada({ epocaId: LUTO, recorte: 'momento' }, epocas()),
            'Luto [Momento]',
        );
    });
});

describe('migrarPeriodosBiograficosMultiplos', () => {
    it('epocaId e recorte viram a lista; datas e N/A ficam no texto', () => {
        const itens = [
            {
                epocaRetratada: {
                    epocaId: 7,
                    recorte: 'momento',
                    inicio: { ano: 2001 },
                    fim: null,
                    na: false,
                },
            },
            { epocaRetratada: { epocaId: null, recorte: null, na: true } },
            { epocaRetratada: null },
            {},
        ];
        D.migrarPeriodosBiograficosMultiplos(itens);
        assert.deepEqual(itens[0].epocaRetratada, {
            periodos: [{ epocaId: 7, recorte: 'momento' }],
            inicio: { ano: 2001 },
            fim: null,
            na: false,
        });
        assert.deepEqual(itens[1].epocaRetratada, {
            periodos: [],
            inicio: null,
            fim: null,
            na: true,
        });
        assert.equal(itens[2].epocaRetratada, null);
        assert.equal(itens[3].epocaRetratada, undefined);
    });

    it('é idempotente e, com o cadastro, tira id que não existe mais', () => {
        const itens = [{ epocaRetratada: { epocaId: 1, recorte: 'momento' } }];
        D.migrarPeriodosBiograficosMultiplos(itens);
        const uma = JSON.stringify(itens);
        D.migrarPeriodosBiograficosMultiplos(itens);
        assert.equal(JSON.stringify(itens), uma);
        itens[0].epocaRetratada.periodos.push({ epocaId: 99, recorte: null });
        D.migrarPeriodosBiograficosMultiplos(itens, epocas());
        assert.deepEqual(itens[0].epocaRetratada.periodos, [{ epocaId: 1, recorte: 'momento' }]);
    });

    it('migrarEpocas não apaga a lista de um texto já migrado', () => {
        const dbRef = { epocas: epocas(), poemas: [{ id: 1, epocaRetratada: dois() }], prosas: [] };
        D.migrarEpocas(dbRef);
        assert.deepEqual(dbRef.poemas[0].epocaRetratada.periodos, dois().periodos);
    });

    const caminhoBackup = path.resolve(__dirname, '../data/arquivo_poetico_backup_2026-10-08.json');
    it(
        'backup real antigo: o mesmo período e recorte continuam em cada texto',
        { skip: !fs.existsSync(caminhoBackup) },
        () => {
            const backup = JSON.parse(fs.readFileSync(caminhoBackup, 'utf8'));
            let comPeriodo = 0;
            for (const col of ['poemas', 'prosas']) {
                const antes = new Map(
                    backup[col].map((it) => [it.id, it.epocaRetratada?.epocaId ?? null]),
                );
                const recortes = new Map(
                    backup[col].map((it) => [it.id, it.epocaRetratada?.recorte ?? null]),
                );
                D.migrarPeriodosBiograficosMultiplos(backup[col]);
                for (const it of backup[col]) {
                    if (!it.epocaRetratada) continue;
                    assert.ok(Array.isArray(it.epocaRetratada.periodos));
                    assert.ok(!('epocaId' in it.epocaRetratada));
                    const esperado = antes.get(it.id);
                    if (esperado == null) {
                        assert.deepEqual(it.epocaRetratada.periodos, []);
                    } else {
                        comPeriodo++;
                        assert.deepEqual(it.epocaRetratada.periodos, [
                            { epocaId: esperado, recorte: recortes.get(it.id) || null },
                        ]);
                    }
                }
            }
            assert.ok(comPeriodo > 0, 'o backup tem textos com período para provar a migração');
        },
    );
});

describe('tabela e busca', () => {
    beforeEach(() => {
        db.epocas = epocas();
        db.periodosHistoricos = [];
        db.poemas = [
            { id: 1, titulo: 'Os dois', epocaRetratada: dois() },
            {
                id: 2,
                titulo: 'Só faculdade',
                epocaRetratada: { periodos: [{ epocaId: FACULDADE }] },
            },
            { id: 3, titulo: 'Sem período', epocaRetratada: null },
        ];
        db.prosas = [];
    });

    it('qualquer período do texto acha o texto, e Esfera vem de qualquer um', () => {
        const itens = db.poemas.map((p) => decorarCamposBusca({ ...p }));
        const achar = (campo, termo) =>
            itens.filter((i) => (i[campo] || '').includes(termo)).map((i) => i.id);
        assert.deepEqual(achar('_buscaEpoca', 'Luto'), [1]);
        assert.deepEqual(achar('_buscaEpoca', 'Corte de contato'), [1]);
        assert.deepEqual(achar('_buscaEpoca', 'Faculdade'), [2]);
        assert.deepEqual(achar('_buscaEsferas', 'Afetiva'), [1]);
    });

    it('a célula mostra um selo por período, com o "e pós" do recorte de cada um', () => {
        const html = badgeEpocaRetratada(db.poemas[0].epocaRetratada);
        assert.match(html, />Corte de contato</);
        assert.match(html, />Luto e pós</);
        assert.equal((html.match(/<div>/g) || []).length, 2);
    });

    it('mais de três períodos: três selos e reticências', () => {
        db.epocas.push({ id: 4, nome: 'Quarto', autorId: 1 });
        const er = { periodos: [1, 2, 3, 4].map((epocaId) => ({ epocaId })) };
        const html = badgeEpocaRetratada(er);
        assert.equal((html.match(/<span/g) || []).length, 3);
        assert.match(html, /…/);
    });
});

describe('mesclar, excluir e desfazer', () => {
    beforeEach(() => {
        db.epocas = epocas();
        db.autores = [{ id: 1, nome: 'Autor' }];
        db.periodosHistoricos = [];
        db.periodosHistoricosOcultos = [];
        db.poemas = [{ id: 10, titulo: 'A', epocaRetratada: dois() }];
        db.prosas = [
            { id: 20, titulo: 'B', epocaRetratada: { periodos: [{ epocaId: LUTO }], na: false } },
        ];
    });

    it('impacto olha dentro da lista', () => {
        const imp = D.calcularImpactoExclusaoEpoca(db, LUTO);
        assert.deepEqual(imp.poemasIds, [10]);
        assert.deepEqual(imp.prosasIds, [20]);
    });

    it('excluir tira só aquele período, mantém o recorte dos outros; desfazer devolve na posição', () => {
        deleteItem('epocas', LUTO);
        document.getElementById('excl-confirmar').click();
        assert.deepEqual(db.poemas[0].epocaRetratada.periodos, [
            { epocaId: CORTE, recorte: 'momento' },
        ]);
        assert.deepEqual(db.prosas[0].epocaRetratada.periodos, []);

        document.querySelector('#avisos-toast button').click();
        assert.deepEqual(db.poemas[0].epocaRetratada.periodos, dois().periodos);
        assert.deepEqual(db.prosas[0].epocaRetratada.periodos, [{ epocaId: LUTO, recorte: null }]);
    });
});

describe('exportar e importar a lista', () => {
    const texto = () => ({
        id: 1,
        titulo: 'Dois períodos',
        texto: 'x',
        epocaRetratada: dois(),
    });
    beforeEach(() => {
        db.epocas = epocas();
        db.periodosHistoricos = [];
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
        opcoesPeriodoBiografico: { esferas: [], vinculos: [] },
    });
    const importar = async (payload, destino) => {
        const relatorio = classificarImportacaoAditiva(payload, destino);
        const deps = { tirarSnapshotSeNecessario: mock.fn(async () => true), save: mock.fn() };
        return aplicarImportacaoAditiva(payload, relatorio, destino, deps);
    };

    it('o JSON leva um item por período, com recorte, nome e Esfera', () => {
        const er = montarRegistro('poema', texto()).epocaRetratada;
        assert.deepEqual(
            er.periodos.map((p) => [p.nomeEpoca, p.recorte, p.esferas]),
            [
                ['Corte de contato', 'momento', []],
                ['Luto', 'repercussão', ['Afetiva']],
            ],
        );
        assert.deepEqual(er.inicio, { ano: 2020 });
    });

    it('CSV e MD juntam os períodos; o recorte sai na mesma ordem', () => {
        const registro = montarRegistro('poema', texto());
        const csv = gerarCsvTextos('poema', [registro], db);
        assert.match(csv, /Corte de contato \| Luto/);
        assert.match(csv, /momento \| repercussão/);
        const md = itemParaMarkdown(registro, db);
        assert.match(md, /Corte de contato \[Momento\]; Luto e pós/);
        assert.match(md, /Esfera do Período Biográfico[^\n]*Afetiva/);
    });

    it('exportar e importar num acervo vazio preserva os dois períodos e cada recorte', async () => {
        const payload = JSON.parse(JSON.stringify({ itens: [montarRegistro('poema', texto())] }));
        const destino = dbVazio();
        const r = await importar(payload, destino);
        assert.equal(r.sucesso, true);
        assert.deepEqual(destino.epocas.map((e) => e.nome).sort(), ['Corte de contato', 'Luto']);
        const er = destino.poemas[0].epocaRetratada;
        const nome = (id) => destino.epocas.find((e) => e.id == id).nome;
        assert.deepEqual(
            er.periodos.map((p) => [nome(p.epocaId), p.recorte]),
            [
                ['Corte de contato', 'momento'],
                ['Luto', 'repercussão'],
            ],
        );
        assert.deepEqual(er.inicio, { ano: 2020 });
        assert.equal(er.nomeEpoca, undefined);
        assert.ok(destino.epocas.find((e) => e.nome === 'Luto').esferas.includes('Afetiva'));
    });

    it('arquivo antigo (epocaId, nomeEpoca e recorte no objeto) continua aceito', async () => {
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
            epocaRetratada: {
                epocaId: 9,
                nomeEpoca: 'Faculdade',
                recorte: 'momento',
                inicio: null,
                fim: null,
                na: false,
            },
        };
        const destino = dbVazio();
        await importar({ itens: [antigo] }, destino);
        assert.equal(destino.epocas.length, 1);
        assert.deepEqual(destino.poemas[0].epocaRetratada.periodos, [
            { epocaId: destino.epocas[0].id, recorte: 'momento' },
        ]);
    });
});

describe('modal de Poema: chips com recorte por período', () => {
    const enviar = (titulo) => {
        document.getElementById('p-titulo').value = titulo;
        document.getElementById('form-poema').onsubmit({ preventDefault() {} });
    };
    const chips = () => [...document.querySelectorAll('#p-epocas-container > span')];

    beforeEach(() => {
        db.epocas = epocas();
        db.poemas = [];
        db.autores = [];
        initFormPoema();
        E.resetEpocasRetratadasDoTexto('poemas');
        document.getElementById('p-epoca-na').checked = false;
    });

    it('adicionar pelo nome cria um chip; repetir o mesmo não duplica', () => {
        E.adicionarEpocaRetratadaDoTexto('poemas', 'Luto');
        E.adicionarEpocaRetratadaDoTexto('poemas', 'Luto');
        E.adicionarEpocaRetratadaDoTexto('poemas', 'Corte de contato');
        assert.equal(chips().length, 2);
    });

    it('cada chip guarda o próprio recorte e o salvar grava a lista na ordem', () => {
        E.adicionarEpocaRetratadaDoTexto('poemas', 'Corte de contato');
        E.adicionarEpocaRetratadaDoTexto('poemas', 'Luto');
        E.alterarRecorteEpocaRetratadaDoTexto('poemas', String(CORTE), 'momento');
        E.alterarRecorteEpocaRetratadaDoTexto('poemas', String(LUTO), 'repercussão');
        enviar('Dois períodos');
        const p = db.poemas.find((x) => x.titulo === 'Dois períodos');
        assert.deepEqual(p.epocaRetratada.periodos, [
            { epocaId: CORTE, recorte: 'momento' },
            { epocaId: LUTO, recorte: 'repercussão' },
        ]);
    });

    it('remover um chip tira só aquele período', () => {
        E.adicionarEpocaRetratadaDoTexto('poemas', 'Corte de contato');
        E.adicionarEpocaRetratadaDoTexto('poemas', 'Luto');
        E.removerEpocaRetratadaDoTexto('poemas', String(CORTE));
        enviar('Um só');
        assert.deepEqual(
            db.poemas
                .find((x) => x.titulo === 'Um só')
                .epocaRetratada.periodos.map((x) => x.epocaId),
            [LUTO],
        );
    });

    it('sem período, datas nem N/A, o campo fica null', () => {
        enviar('Vazio');
        assert.equal(db.poemas.find((x) => x.titulo === 'Vazio').epocaRetratada, null);
    });

    it('só N/A marcado: guarda o objeto com lista vazia', () => {
        document.getElementById('p-epoca-na').checked = true;
        enviar('NA');
        const er = db.poemas.find((x) => x.titulo === 'NA').epocaRetratada;
        assert.equal(er.na, true);
        assert.deepEqual(er.periodos, []);
    });

    it('texto que ficou digitado no campo entra ao salvar', () => {
        document.getElementById('p-epoca-nome').value = 'Faculdade';
        enviar('Pendente');
        assert.deepEqual(
            db.poemas
                .find((x) => x.titulo === 'Pendente')
                .epocaRetratada.periodos.map((x) => x.epocaId),
            [FACULDADE],
        );
    });

    it('carregar um texto salvo mostra os chips com o recorte de cada um', () => {
        E.carregarEpocasRetratadasDoTexto('poemas', dois().periodos);
        // O HTML marca `selected` na opção certa de cada chip (lê o atributo
        // porque o happy-dom erra `select.value` com vários selects iguais).
        const marcadas = [...document.querySelectorAll('#p-epocas-container select')].map((sel) =>
            sel.querySelector('option[selected]').getAttribute('value'),
        );
        assert.deepEqual(marcadas, ['momento', 'repercussão']);
    });

    it('nome novo sem Autor no texto: avisa e não cria o período', () => {
        E.adicionarEpocaRetratadaDoTexto('poemas', 'Período inventado');
        enviar('Sem autor');
        assert.match(document.getElementById('avisos-toast').textContent, /Adicione um Autor/);
        assert.equal(db.epocas.length, 3);
        assert.equal(db.poemas.find((x) => x.titulo === 'Sem autor').epocaRetratada, null);
    });
});
