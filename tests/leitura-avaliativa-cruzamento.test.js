import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    CATEGORIAS_CRUZAMENTO,
    ID_SEM_CLUSTER,
    ID_SEM_ETIQUETA,
    calcularCruzamento,
    cruzarDetalheDoCluster,
    rotuloDaCategoriaCruzamento,
} from '../js/leitura-avaliativa-cruzamento.js';
import { MINIMO_PARA_PADRAO } from '../js/leitura-avaliativa-padrao.js';
import { ITENS_INCOMODOU, ITENS_PEGOU } from '../js/leitura-avaliativa.js';
import { garantirEtiqueta } from '../js/etiquetas.js';
import { atribuirEtiquetasAoCluster, criarCluster } from '../js/tag-clusters.js';

let seq = 0;
const leitura = (extra = {}) => ({
    id: ++seq,
    textoId: seq,
    tipo: 'poema',
    data: '2026-11-01',
    pegou: [],
    incomodou: [],
    releria: null,
    mostraria: null,
    sugerido: null,
    escolhido: 4,
    ...extra,
});

// Acervo pequeno: Tom com dois clusters (Sombrio com um subcluster) e uma etiqueta solta.
function montar() {
    const dbRef = { etiquetas: [], tagClusters: [], poemas: [], prosas: [] };
    const melan = garantirEtiqueta(dbRef, 'tom', 'Melancólico');
    const triste = garantirEtiqueta(dbRef, 'tom', 'Triste');
    const raiva = garantirEtiqueta(dbRef, 'tom', 'Raivoso');
    const solta = garantirEtiqueta(dbRef, 'tom', 'Irônico');
    const sombrio = criarCluster(dbRef, 'Sombrio', 'tom').cluster;
    const sub = criarCluster(dbRef, 'Luto', 'tom', sombrio.id).cluster;
    const intenso = criarCluster(dbRef, 'Intenso', 'tom').cluster;
    atribuirEtiquetasAoCluster(dbRef, [melan], sombrio.id);
    atribuirEtiquetasAoCluster(dbRef, [triste], sub.id);
    atribuirEtiquetasAoCluster(dbRef, [raiva], intenso.id);
    return { dbRef, melan, triste, raiva, solta, sombrio, sub, intenso };
}

const poema = (dbRef, id, tom = []) => {
    dbRef.poemas.push({ id, sinalizacoesTom: tom });
    return id;
};

const coluna = (r, id) => r.colunas.findIndex((c) => c.id === String(id));
const celula = (r, item, id) => r.linhas.find((l) => l.item === item).celulas[coluna(r, id)];

describe('categorias do cruzamento', () => {
    it('são Tom, Estilo, Domínio Imagético e Tradição', () => {
        assert.deepEqual(
            [...CATEGORIAS_CRUZAMENTO],
            ['tom', 'estilo', 'dominioImagetico', 'tradicao'],
        );
        assert.equal(rotuloDaCategoriaCruzamento('dominioImagetico'), 'Domínio Imagético');
        assert.equal(rotuloDaCategoriaCruzamento('relacao'), '');
    });

    it('categoria ou medida fora da lista devolve resultado vazio', () => {
        const { dbRef } = montar();
        assert.equal(
            calcularCruzamento([], dbRef, { categoria: 'sensibilidade' }).colunas.length,
            0,
        );
        assert.equal(calcularCruzamento([], dbRef, { medida: 'x' }).linhas.length, 0);
    });
});

describe('pegou: peso inteiro em cada cluster', () => {
    it('conta o peso inteiro em cada cluster do texto e avisa que a soma passa do total', () => {
        const { dbRef, melan, raiva } = montar();
        const id = poema(dbRef, 1, [melan, raiva]);
        const r = calcularCruzamento(
            [leitura({ textoId: id, pegou: [{ item: 'voz', peso: 'centro' }] })],
            dbRef,
        );
        assert.equal(r.totalTextos, 1);
        assert.equal(r.colunas.length, 2);
        assert.equal(r.somaPassaDoTotal, true);
        const voz = r.linhas.find((l) => l.item === 'voz');
        assert.equal(voz.total.ponderado, 3);
        assert.deepEqual(
            voz.celulas.map((c) => c.ponderado),
            [3, 3],
        );
    });

    it('ponderado divide pelo n da coluna (quem não marcou conta 0) e mediaPeso pelos que marcaram', () => {
        const { dbRef, melan } = montar();
        const a = poema(dbRef, 1, [melan]);
        const b = poema(dbRef, 2, [melan]);
        const c = poema(dbRef, 3, [melan]);
        const r = calcularCruzamento(
            [
                leitura({ textoId: a, pegou: [{ item: 'voz', peso: 'centro' }] }),
                leitura({ textoId: b, pegou: [{ item: 'voz', peso: 'leve' }] }),
                leitura({ textoId: c }),
            ],
            dbRef,
        );
        const cel = celula(r, 'voz', ID_COLUNA(r, 'Sombrio'));
        assert.equal(cel.n, 3);
        assert.equal(cel.marcaram, 2);
        assert.equal(cel.soma, 4);
        assert.equal(cel.ponderado, 1.33);
        assert.equal(cel.mediaPeso, 2);
        assert.equal(r.somaPassaDoTotal, false);
    });

    it('as linhas seguem a lista de itens de "De que maneira te pegou"', () => {
        const { dbRef, melan } = montar();
        const id = poema(dbRef, 1, [melan]);
        const r = calcularCruzamento([leitura({ textoId: id })], dbRef);
        assert.deepEqual(
            r.linhas.map((l) => l.item),
            ITENS_PEGOU.map((i) => i.id),
        );
    });
});

function ID_COLUNA(r, rotulo) {
    return r.colunas.find((c) => c.rotulo === rotulo).id;
}

describe('colunas: cluster de topo, subcluster e especiais', () => {
    it('etiqueta de subcluster conta para o cluster de topo', () => {
        const { dbRef, triste, sombrio } = montar();
        const id = poema(dbRef, 1, [triste]);
        const r = calcularCruzamento([leitura({ textoId: id })], dbRef);
        assert.equal(r.colunas.length, 1);
        assert.equal(r.colunas[0].id, String(sombrio.id));
        assert.equal(r.colunas[0].rotulo, 'Sombrio');
    });

    it('duas etiquetas do mesmo cluster contam uma vez nele', () => {
        const { dbRef, melan, triste } = montar();
        const id = poema(dbRef, 1, [melan, triste]);
        const r = calcularCruzamento(
            [leitura({ textoId: id, pegou: [{ item: 'voz', peso: 'forte' }] })],
            dbRef,
        );
        assert.equal(r.colunas.length, 1);
        assert.equal(r.colunas[0].n, 1);
        assert.equal(r.linhas.find((l) => l.item === 'voz').celulas[0].soma, 2);
    });

    it('etiqueta sem cluster vai para "Sem cluster" e texto sem etiqueta para "Sem etiqueta", sempre no fim', () => {
        const { dbRef, melan, solta } = montar();
        const a = poema(dbRef, 1, [solta]);
        const b = poema(dbRef, 2, []);
        const c = poema(dbRef, 3, [melan]);
        const d = poema(dbRef, 4, [melan]);
        const r = calcularCruzamento(
            [a, b, c, d].map((id) => leitura({ textoId: id })),
            dbRef,
        );
        assert.deepEqual(
            r.colunas.map((x) => x.id),
            [r.colunas[0].id, ID_SEM_CLUSTER, ID_SEM_ETIQUETA],
        );
        assert.equal(r.colunas[0].rotulo, 'Sombrio');
        assert.equal(r.colunas[0].n, 2);
        assert.equal(r.colunas[1].tipo, 'semCluster');
        assert.equal(r.colunas[2].tipo, 'semEtiqueta');
    });

    it('colunas de cluster vêm dos maiores para os menores, e o empate por nome', () => {
        const { dbRef, melan, raiva } = montar();
        const ids = [poema(dbRef, 1, [raiva]), poema(dbRef, 2, [melan]), poema(dbRef, 3, [melan])];
        const r = calcularCruzamento(
            ids.map((id) => leitura({ textoId: id })),
            dbRef,
        );
        assert.deepEqual(
            r.colunas.map((c) => c.rotulo),
            ['Sombrio', 'Intenso'],
        );
        const empate = calcularCruzamento(
            [leitura({ textoId: ids[0] }), leitura({ textoId: ids[1] })],
            dbRef,
        );
        assert.deepEqual(
            empate.colunas.map((c) => c.rotulo),
            ['Intenso', 'Sombrio'],
        );
    });
});

describe('incomodou: contagem sem peso', () => {
    it('conta uma vez por cluster de cada texto e dá a proporção', () => {
        const { dbRef, melan, raiva } = montar();
        const a = poema(dbRef, 1, [melan, raiva]);
        const b = poema(dbRef, 2, [melan]);
        const r = calcularCruzamento(
            [
                leitura({ textoId: a, incomodou: ['cliche', 'frouxo'] }),
                leitura({ textoId: b, incomodou: ['cliche'] }),
            ],
            dbRef,
            { medida: 'incomodou' },
        );
        assert.deepEqual(
            r.linhas.map((l) => l.item),
            ITENS_INCOMODOU.map((i) => i.id),
        );
        const sombrio = ID_COLUNA(r, 'Sombrio');
        assert.deepEqual(celula(r, 'cliche', sombrio), { n: 2, marcaram: 2, proporcao: 1 });
        assert.deepEqual(celula(r, 'frouxo', sombrio), { n: 2, marcaram: 1, proporcao: 0.5 });
        assert.equal(celula(r, 'frouxo', ID_COLUNA(r, 'Intenso')).proporcao, 1);
        assert.equal(r.linhas.find((l) => l.item === 'cliche').total.marcaram, 2);
    });
});

describe('uma leitura por texto, traduções sem agrupar', () => {
    it('fica a leitura mais recente de cada texto', () => {
        const { dbRef, melan } = montar();
        const id = poema(dbRef, 1, [melan]);
        const r = calcularCruzamento(
            [
                leitura({
                    textoId: id,
                    data: '2026-10-01',
                    pegou: [{ item: 'voz', peso: 'leve' }],
                }),
                leitura({
                    textoId: id,
                    data: '2026-11-01',
                    pegou: [{ item: 'voz', peso: 'centro' }],
                }),
            ],
            dbRef,
        );
        assert.equal(r.totalTextos, 1);
        assert.equal(r.linhas.find((l) => l.item === 'voz').total.soma, 3);
    });

    it('a versão pt-br e a francesa contam como dois textos', () => {
        const { dbRef, melan } = montar();
        const ptbr = poema(dbRef, 1, [melan]);
        const fr = poema(dbRef, 2, [melan]);
        dbRef.poemas[0].elos = [{ tipo: 'traducao', alvo: fr }];
        const r = calcularCruzamento(
            [
                leitura({ textoId: ptbr, pegou: [{ item: 'som', peso: 'centro' }] }),
                leitura({ textoId: fr, pegou: [{ item: 'som', peso: 'leve' }] }),
            ],
            dbRef,
        );
        assert.equal(r.totalTextos, 2);
        assert.equal(r.colunas[0].n, 2);
        assert.equal(celula(r, 'som', r.colunas[0].id).soma, 4);
    });

    it('poema e prosa de mesmo id são textos diferentes, cada um com as próprias etiquetas', () => {
        const { dbRef, melan, raiva } = montar();
        poema(dbRef, 1, [melan]);
        dbRef.prosas.push({ id: 1, sinalizacoesTom: [raiva] });
        const r = calcularCruzamento(
            [leitura({ textoId: 1 }), leitura({ textoId: 1, tipo: 'prosa' })],
            dbRef,
        );
        assert.equal(r.totalTextos, 2);
        assert.deepEqual(r.colunas.map((c) => c.rotulo).sort(), ['Intenso', 'Sombrio']);
    });
});

describe('filtros e avisos', () => {
    it('filtra por tipo', () => {
        const { dbRef, melan, raiva } = montar();
        poema(dbRef, 1, [melan]);
        dbRef.prosas.push({ id: 2, sinalizacoesTom: [raiva] });
        const base = [leitura({ textoId: 1 }), leitura({ textoId: 2, tipo: 'prosa' })];
        assert.equal(calcularCruzamento(base, dbRef, { tipo: 'prosa' }).totalTextos, 1);
        assert.equal(calcularCruzamento(base, dbRef, { tipo: 'poema' }).totalTextos, 1);
        assert.equal(calcularCruzamento(base, dbRef).totalTextos, 2);
    });

    it('filtra por faixa pela Classificação atual do texto (F22-D19)', () => {
        const { dbRef, melan } = montar();
        const a = poema(dbRef, 1, [melan]);
        const b = poema(dbRef, 2, [melan]);
        const base = [
            leitura({ textoId: a, escolhido: null }),
            leitura({ textoId: b, escolhido: 1 }),
        ];
        const classificacaoDe = (_tipo, id) => (id === a ? 5 : 1);
        const alta = calcularCruzamento(base, dbRef, { faixa: 'alta', classificacaoDe });
        assert.equal(alta.totalTextos, 1);
        assert.equal(alta.foraDaFaixa, 1);
        assert.equal(
            calcularCruzamento(base, dbRef, { faixa: 'baixa', classificacaoDe }).totalTextos,
            1,
        );
        assert.equal(
            calcularCruzamento(base, dbRef, { faixa: 'media', classificacaoDe }).totalTextos,
            0,
        );
    });

    it('leitura de texto que não existe mais fica de fora e é contada à parte', () => {
        const { dbRef, melan } = montar();
        const a = poema(dbRef, 1, [melan]);
        const r = calcularCruzamento([leitura({ textoId: a }), leitura({ textoId: 999 })], dbRef);
        assert.equal(r.totalTextos, 1);
        assert.equal(r.semTexto, 1);
    });

    it('avisa que são poucos textos abaixo do mínimo', () => {
        const { dbRef, melan } = montar();
        const ids = Array.from({ length: MINIMO_PARA_PADRAO }, (_, i) =>
            poema(dbRef, i + 1, [melan]),
        );
        const base = ids.map((id) => leitura({ textoId: id }));
        assert.equal(calcularCruzamento(base.slice(0, -1), dbRef).poucos, true);
        assert.equal(calcularCruzamento(base, dbRef).poucos, false);
    });

    it('sem leituras, sem colunas e com o aviso de poucos', () => {
        const { dbRef } = montar();
        const r = calcularCruzamento([], dbRef);
        assert.equal(r.totalTextos, 0);
        assert.deepEqual(r.colunas, []);
        assert.equal(r.poucos, true);
        assert.equal(calcularCruzamento(null, dbRef).totalTextos, 0);
    });
});

describe('detalhe: abrir um cluster por etiqueta', () => {
    it('uma coluna por etiqueta do cluster e dos subclusters, só com as usadas', () => {
        const { dbRef, melan, triste, raiva, sombrio } = montar();
        const a = poema(dbRef, 1, [melan]);
        const b = poema(dbRef, 2, [triste]);
        const c = poema(dbRef, 3, [raiva]);
        const r = cruzarDetalheDoCluster(
            [
                leitura({ textoId: a, pegou: [{ item: 'voz', peso: 'centro' }] }),
                leitura({ textoId: b, pegou: [{ item: 'voz', peso: 'leve' }] }),
                leitura({ textoId: c }),
            ],
            dbRef,
            { clusterId: sombrio.id },
        );
        assert.deepEqual(r.colunas.map((x) => x.rotulo).sort(), ['Melancólico', 'Triste']);
        assert.equal(r.colunas[0].tipo, 'etiqueta');
        // O total do detalhe são só os textos com etiqueta do cluster (o de Raivoso fica fora).
        assert.equal(r.totalTextos, 2);
        assert.equal(r.linhas.find((l) => l.item === 'voz').total.soma, 4);
        assert.equal(celula(r, 'voz', melan).soma, 3);
        assert.equal(celula(r, 'voz', triste).soma, 1);
    });

    it('sem clusterId, resultado vazio; a soma das etiquetas pode passar do total', () => {
        const { dbRef, melan, triste, sombrio } = montar();
        const id = poema(dbRef, 1, [melan, triste]);
        assert.equal(cruzarDetalheDoCluster([leitura({ textoId: id })], dbRef).colunas.length, 0);
        const r = cruzarDetalheDoCluster([leitura({ textoId: id })], dbRef, {
            clusterId: sombrio.id,
        });
        assert.equal(r.totalTextos, 1);
        assert.equal(r.colunas.length, 2);
        assert.equal(r.somaPassaDoTotal, true);
    });
});
