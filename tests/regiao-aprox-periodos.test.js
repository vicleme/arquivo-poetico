import './helpers/localstorage-shim.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    db,
    migrarAproxPeriodosHistoricos,
    migrarMovimentosEscolas,
    migrarPeriodosHistoricosEmbutidos,
    migrarRegiaoPeriodoHistorico,
    mesclarMovimentosEscolas,
    renomearPeriodosHistoricosDeFabrica,
} from '../js/db.js';
import {
    lugaresDaRegiao,
    lugaresUsados,
    mesmaRegiao,
    normalizarRegiao,
    regiaoVazia,
    textoDaRegiao,
} from '../js/regiao.js';
import {
    FILTRO_CORRENTE_VAZIO,
    filtrarCorrentesPorAtributos,
    opcoesDeRegiaoDasCorrentes,
    regiaoEfetivaDaCorrente,
} from '../js/correntes-hierarquia.js';
import { paisQueNaoContem } from '../js/periodos-historicos-hierarquia.js';
import { formatarDataParcial, formatarIntervaloPeriodoHistorico } from '../js/utils.js';

const periodoDeFabrica = (nome) =>
    structuredClone(db.periodosHistoricos.find((p) => p.nome === nome));

// ─── Região como lista de lugares ───────────────────────────────────

describe('regiao.js (lista de lugares)', () => {
    it('lugaresDaRegiao aceita array e texto antigo com barras, sem vazios nem repetição', () => {
        assert.deepEqual(lugaresDaRegiao(['Inglaterra', ' Europa ', '', 'europa']), [
            'Inglaterra',
            'Europa',
        ]);
        assert.deepEqual(lugaresDaRegiao('Brasil/Portugal'), ['Brasil', 'Portugal']);
        assert.deepEqual(lugaresDaRegiao(' Portugal / Galiza '), ['Portugal', 'Galiza']);
        assert.deepEqual(lugaresDaRegiao(''), []);
        assert.deepEqual(lugaresDaRegiao(undefined), []);
        assert.deepEqual(lugaresDaRegiao(null), []);
    });

    it('normalizarRegiao sempre devolve array', () => {
        assert.deepEqual(normalizarRegiao('Itália'), ['Itália']);
        assert.deepEqual(normalizarRegiao(['Itália']), ['Itália']);
        assert.deepEqual(normalizarRegiao(undefined), []);
    });

    it('textoDaRegiao junta os lugares para exibir', () => {
        assert.equal(
            textoDaRegiao(['Inglaterra', 'Europa', 'América do Norte']),
            'Inglaterra, Europa, América do Norte',
        );
        assert.equal(textoDaRegiao([]), '');
        assert.equal(textoDaRegiao('Brasil/Portugal'), 'Brasil, Portugal');
    });

    it('regiaoVazia e mesmaRegiao ignoram ordem e maiúsculas', () => {
        assert.equal(regiaoVazia([]), true);
        assert.equal(regiaoVazia(['Brasil']), false);
        assert.equal(mesmaRegiao(['Europa', 'Inglaterra'], 'inglaterra/europa'), true);
        assert.equal(mesmaRegiao(['Europa'], ['Europa', 'Inglaterra']), false);
    });

    it('lugaresUsados une as listas, sem repetir, em ordem alfabética', () => {
        const lugares = lugaresUsados(
            { lista: [{ r: ['França', 'Europa'] }, { r: 'Brasil/Portugal' }], ler: (x) => x.r },
            { lista: [{ regiao: ['europa', 'Internacional'] }], ler: (x) => x.regiao },
        );
        assert.deepEqual(lugares, ['Brasil', 'Europa', 'França', 'Internacional', 'Portugal']);
    });
});

describe('Região em Corrente literária (lista, herança e filtro)', () => {
    const lista = [
        { id: 1, nome: 'Romantismo', paiId: null, regiaoOrigem: ['Europa'] },
        { id: 2, nome: 'Romantismo no Brasil', paiId: 1, regiaoOrigem: ['Brasil', 'Portugal'] },
        { id: 3, nome: 'Primeira geração', paiId: 2, regiaoOrigem: [] },
        { id: 4, nome: 'Sem região', paiId: null, regiaoOrigem: [] },
    ];

    it('lista vazia herda do ancestral mais próximo (um array vazio não conta como valor)', () => {
        const r = regiaoEfetivaDaCorrente(lista, lista[2]);
        assert.deepEqual(r.valor, ['Brasil', 'Portugal']);
        assert.equal(r.herdadoDe, 'Romantismo no Brasil');
        assert.deepEqual(regiaoEfetivaDaCorrente(lista, lista[3]).valor, []);
    });

    it('as opções do select de Região trazem cada lugar uma vez, com herança', () => {
        assert.deepEqual(opcoesDeRegiaoDasCorrentes(lista), ['Brasil', 'Europa', 'Portugal']);
    });

    it('filtrar por um lugar acha quem tem esse lugar, inclusive por herança', () => {
        const { passam } = filtrarCorrentesPorAtributos(lista, lista, { regiao: 'Portugal' });
        assert.deepEqual(
            passam.map((m) => m.id),
            [2, 3],
        );
        const vazias = filtrarCorrentesPorAtributos(lista, lista, {
            regiao: FILTRO_CORRENTE_VAZIO,
        });
        assert.deepEqual(
            vazias.passam.map((m) => m.id),
            [4],
        );
    });

    it('migrarMovimentosEscolas converte texto antigo e preenche a falta com lista vazia', () => {
        const itens = [
            { id: 1, nome: 'A', embutido: false, regiaoOrigem: 'Brasil/Portugal' },
            { id: 2, nome: 'B', embutido: false },
            { id: 3, nome: 'C', embutido: false, regiaoOrigem: ['Itália'] },
        ];
        migrarMovimentosEscolas(itens);
        assert.deepEqual(itens[0].regiaoOrigem, ['Brasil', 'Portugal']);
        assert.deepEqual(itens[1].regiaoOrigem, []);
        assert.deepEqual(itens[2].regiaoOrigem, ['Itália']);
    });

    it('os itens de fábrica de Correntes vêm com a região em lista', () => {
        db.movimentosEscolas.forEach((m) => {
            assert.ok(Array.isArray(m.regiaoOrigem), `"${m.nome}" sem lista`);
        });
        const trovadorismo = db.movimentosEscolas.find((m) => m.nome === 'Trovadorismo');
        assert.deepEqual(trovadorismo.regiaoOrigem, ['Portugal', 'Galiza']);
    });

    it('mesclar preenche a região do destino só se estiver vazia', () => {
        const dbRef = {
            movimentosEscolas: [
                { id: 1, nome: 'X', regiaoOrigem: [], paiId: null },
                { id: 2, nome: 'X', regiaoOrigem: ['Itália', 'Europa'], paiId: null },
            ],
            autores: [],
            poemas: [],
            prosas: [],
        };
        mesclarMovimentosEscolas(dbRef, 2, 1);
        assert.deepEqual(dbRef.movimentosEscolas[0].regiaoOrigem, ['Itália', 'Europa']);
    });
});

// ─── Marca "c." (circa) ─────────────────────────────────────────────

describe('Marca "c." nas datas de Período Histórico', () => {
    it('aparece só quando a data é só o ano', () => {
        assert.equal(formatarDataParcial({ ano: 1760, aprox: true }), 'c. 1760');
        assert.equal(formatarDataParcial({ ano: 1760, aprox: false }), '1760');
        assert.equal(formatarDataParcial({ ano: 1760 }), '1760');
        assert.equal(
            formatarDataParcial({ dia: 15, mes: 3, ano: 1985, aprox: true }),
            '15/03/1985',
        );
    });

    it('o intervalo mostra os dois lados', () => {
        assert.equal(
            formatarIntervaloPeriodoHistorico({
                inicio: { ano: 1870, aprox: true },
                fim: { ano: 1914, aprox: true },
            }),
            'c. 1870 – c. 1914',
        );
        assert.equal(
            formatarIntervaloPeriodoHistorico({
                inicio: { ano: 1871 },
                fim: { ano: 1914, aprox: true },
            }),
            '1871 – c. 1914',
        );
    });

    it('o ano continua numérico (a marca não entra no número)', () => {
        const semente = periodoDeFabrica('Segunda Revolução Industrial');
        assert.equal(semente.inicio.ano, 1870);
        assert.equal(typeof semente.inicio.ano, 'number');
        assert.equal(semente.inicio.aprox, true);
    });

    describe('aviso de datas fora do pai', () => {
        const lista = [{ id: 1, nome: 'Belle Époque', inicio: { ano: 1871 }, fim: { ano: 1914 } }];

        it('acusa quando as datas saem do pai e nada está marcado "c."', () => {
            const fora = paisQueNaoContem(
                lista,
                { inicio: { ano: 1870 }, fim: { ano: 1914 } },
                [1],
            );
            assert.deepEqual(fora, [1]);
        });

        it('cala quando o início do filho é "c."', () => {
            const fora = paisQueNaoContem(
                lista,
                { inicio: { ano: 1870, aprox: true }, fim: { ano: 1914 } },
                [1],
            );
            assert.deepEqual(fora, []);
        });

        it('cala quando o início do pai é "c."', () => {
            const aprox = [{ ...lista[0], inicio: { ano: 1871, aprox: true } }];
            const fora = paisQueNaoContem(
                aprox,
                { inicio: { ano: 1870 }, fim: { ano: 1914 } },
                [1],
            );
            assert.deepEqual(fora, []);
        });

        it('cala o fim só quando é o fim que está marcado; o outro lado continua valendo', () => {
            const fora = paisQueNaoContem(
                lista,
                { inicio: { ano: 1870 }, fim: { ano: 1920, aprox: true } },
                [1],
            );
            assert.deepEqual(fora, [1], 'o início exato ainda sai do pai');
            const soFim = paisQueNaoContem(
                lista,
                { inicio: { ano: 1880 }, fim: { ano: 1920, aprox: true } },
                [1],
            );
            assert.deepEqual(soFim, []);
        });
    });
});

// ─── Padrões de fábrica ─────────────────────────────────────────────

describe('Períodos de fábrica: Revoluções Industriais e Nova República', () => {
    it('Primeira Revolução Industrial: região em lista e datas "c."', () => {
        const p = periodoDeFabrica('Primeira Revolução Industrial');
        assert.deepEqual(p.regiao, ['Inglaterra', 'Europa', 'América do Norte']);
        assert.deepEqual(p.inicio, { ano: 1760, aprox: true });
        assert.deepEqual(p.fim, { ano: 1840, aprox: true });
        assert.equal(p.embutido, true);
    });

    it('Segunda Revolução Industrial: Europa, América do Norte e Ásia Oriental, c. 1870 a c. 1914', () => {
        const p = periodoDeFabrica('Segunda Revolução Industrial');
        assert.deepEqual(p.regiao, ['Europa', 'América do Norte', 'Ásia Oriental']);
        assert.deepEqual(p.inicio, { ano: 1870, aprox: true });
        assert.deepEqual(p.fim, { ano: 1914, aprox: true });
    });

    it('Nova República: Brasil, desde 15/03/1985 e sem fim', () => {
        const p = periodoDeFabrica('Nova República');
        assert.deepEqual(p.regiao, ['Brasil']);
        assert.deepEqual(p.inicio, { dia: 15, mes: 3, ano: 1985 });
        assert.equal(p.fim, null);
    });

    it('nenhum dos três nasce com pai', () => {
        ['Primeira Revolução Industrial', 'Segunda Revolução Industrial', 'Nova República'].forEach(
            (nome) => {
                const p = db.periodosHistoricos.find((x) => x.nome === nome);
                assert.deepEqual(p.pertenceA, [], nome);
            },
        );
    });

    it('o nome antigo "Revolução Industrial (primeira fase)" não existe mais no seed', () => {
        assert.equal(
            db.periodosHistoricos.some((p) => p.nome === 'Revolução Industrial (primeira fase)'),
            false,
        );
    });

    it('a data exata não ganha a marca onde o seed não a pede (Belle Époque, Iluminismo)', () => {
        assert.deepEqual(periodoDeFabrica('Belle Époque').inicio, { ano: 1871 });
        assert.deepEqual(periodoDeFabrica('Iluminismo').fim, { ano: 1789 });
    });
});

describe('renomearPeriodosHistoricosDeFabrica (primeira fase → Primeira Revolução Industrial)', () => {
    const antigo = (extra = {}) => ({
        id: 77,
        nome: 'Revolução Industrial (primeira fase)',
        embutido: true,
        notas: 'minhas notas',
        regiao: ['Inglaterra', 'Europa'],
        inicio: { ano: 1760 },
        fim: { ano: 1840 },
        ...extra,
    });

    it('renomeia no lugar: mesmo id, mesmas notas, e a região do seed se ela não foi editada', () => {
        const lista = [antigo()];
        renomearPeriodosHistoricosDeFabrica(lista, []);
        assert.equal(lista.length, 1);
        assert.equal(lista[0].id, 77);
        assert.equal(lista[0].nome, 'Primeira Revolução Industrial');
        assert.equal(lista[0].notas, 'minhas notas');
        assert.deepEqual(lista[0].regiao, ['Inglaterra', 'Europa', 'América do Norte']);
    });

    it('não troca a região se a pessoa já a editou', () => {
        const lista = [antigo({ regiao: ['Inglaterra', 'Escócia'] })];
        renomearPeriodosHistoricosDeFabrica(lista, []);
        assert.deepEqual(lista[0].regiao, ['Inglaterra', 'Escócia']);
    });

    it('região no formato antigo (texto) também é reconhecida como não editada', () => {
        const lista = [antigo({ regiao: 'Inglaterra/Europa' })];
        renomearPeriodosHistoricosDeFabrica(lista, []);
        assert.deepEqual(lista[0].regiao, ['Inglaterra', 'Europa', 'América do Norte']);
    });

    it('não toca em período do próprio usuário com o nome antigo (embutido: false)', () => {
        const lista = [antigo({ embutido: false })];
        renomearPeriodosHistoricosDeFabrica(lista, []);
        assert.equal(lista[0].nome, 'Revolução Industrial (primeira fase)');
    });

    it('quem excluiu o período de propósito continua sem ele sob o nome novo', () => {
        const ocultos = ['Revolução Industrial (primeira fase)', 'Guerra Fria'];
        renomearPeriodosHistoricosDeFabrica([], ocultos);
        assert.deepEqual(ocultos, ['Guerra Fria', 'Primeira Revolução Industrial']);
    });

    it('é idempotente', () => {
        const lista = [antigo()];
        const ocultos = [];
        renomearPeriodosHistoricosDeFabrica(lista, ocultos);
        const depois = JSON.stringify([lista, ocultos]);
        renomearPeriodosHistoricosDeFabrica(lista, ocultos);
        assert.equal(JSON.stringify([lista, ocultos]), depois);
    });

    it('migrarPeriodosHistoricosEmbutidos: renomeia em vez de criar um segundo período', () => {
        const lista = [antigo()];
        migrarPeriodosHistoricosEmbutidos(lista, []);
        const revolucoes = lista.filter((p) => /Revolução Industrial/.test(p.nome));
        assert.deepEqual(revolucoes.map((p) => p.nome).sort(), [
            'Primeira Revolução Industrial',
            'Quarta Revolução Industrial (Indústria 4.0)',
            'Segunda Revolução Industrial',
            'Terceira Revolução Industrial (Era da Informação)',
        ]);
        assert.equal(lista.find((p) => p.nome === 'Primeira Revolução Industrial').id, 77);
        assert.equal(lista.length, 16);
    });

    it('migrarPeriodosHistoricosEmbutidos: instalação que já tem os dois novos ganha só o que falta', () => {
        const lista = db.periodosHistoricos.map((p) => structuredClone(p));
        migrarPeriodosHistoricosEmbutidos(lista, []);
        assert.equal(lista.length, 16);
    });

    it('a Nova República já cadastrada pelo usuário é marcada de fábrica sem duplicar nem perder dados', () => {
        const lista = [
            {
                id: 5,
                nome: 'Nova República',
                notas: 'minha',
                regiao: ['Brasil'],
                inicio: { dia: 5, mes: 10, ano: 1988 },
                fim: null,
            },
        ];
        migrarPeriodosHistoricosEmbutidos(lista, []);
        const novas = lista.filter((p) => p.nome === 'Nova República');
        assert.equal(novas.length, 1);
        assert.equal(novas[0].embutido, true);
        assert.equal(novas[0].notas, 'minha');
        assert.deepEqual(novas[0].inicio, { dia: 5, mes: 10, ano: 1988 });
    });
});

describe('migrarAproxPeriodosHistoricos (marca "c." nos itens de fábrica já existentes)', () => {
    it('marca a data que ainda é a do seed, sem `aprox` gravado', () => {
        const lista = [
            {
                id: 1,
                nome: 'Renascimento',
                embutido: true,
                inicio: { ano: 1400 },
                fim: { ano: 1600 },
            },
        ];
        migrarAproxPeriodosHistoricos(lista);
        assert.deepEqual(lista[0].inicio, { ano: 1400, aprox: true });
        assert.deepEqual(lista[0].fim, { ano: 1600, aprox: true });
    });

    it('não reescreve data que a pessoa já decidiu (aprox: false) nem a que mudou', () => {
        const lista = [
            {
                id: 1,
                nome: 'Renascimento',
                embutido: true,
                inicio: { ano: 1400, aprox: false },
                fim: { ano: 1650 },
            },
        ];
        migrarAproxPeriodosHistoricos(lista);
        assert.deepEqual(lista[0].inicio, { ano: 1400, aprox: false });
        assert.deepEqual(lista[0].fim, { ano: 1650 });
    });

    it('não mexe em período que não é de fábrica, nem em item cujo seed é exato', () => {
        const lista = [
            { id: 1, nome: 'Renascimento', inicio: { ano: 1400 }, fim: { ano: 1600 } },
            {
                id: 2,
                nome: 'Belle Époque',
                embutido: true,
                inicio: { ano: 1871 },
                fim: { ano: 1914 },
            },
        ];
        migrarAproxPeriodosHistoricos(lista);
        assert.deepEqual(lista[0].inicio, { ano: 1400 });
        assert.deepEqual(lista[1].inicio, { ano: 1871 });
    });

    it('é idempotente e tolera lista ausente', () => {
        const lista = [
            { id: 1, nome: 'Renascimento', embutido: true, inicio: { ano: 1400 }, fim: null },
        ];
        migrarAproxPeriodosHistoricos(lista);
        const depois = JSON.stringify(lista);
        migrarAproxPeriodosHistoricos(lista);
        assert.equal(JSON.stringify(lista), depois);
        assert.doesNotThrow(() => migrarAproxPeriodosHistoricos(undefined));
    });
});

describe('migrarRegiaoPeriodoHistorico com a região dos novos itens', () => {
    it('item de fábrica sem a chave ganha a região em lista do seed', () => {
        const lista = [{ id: 1, nome: 'Segunda Revolução Industrial', embutido: true }];
        migrarRegiaoPeriodoHistorico(lista);
        assert.deepEqual(lista[0].regiao, ['Europa', 'América do Norte', 'Ásia Oriental']);
    });
});
