import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// O período histórico do texto sai com o caminho na hierarquia: coluna
// nova no CSV (a do nome continua), caminho completo no MD e no JSON da
// exportação seletiva (para a Importação Aditiva religar os pais).

const { db } = await import('../js/db.js');
const { montarRegistro } = await import('../js/exportar.js');
const { gerarCsvTextos } = await import('../js/exportar-csv.js');
const { itemParaMarkdown } = await import('../js/exportar-md.js');

const arvore = () => [
    { id: 1, nome: 'Nova República', pertenceA: [] },
    { id: 2, nome: 'Governo Dilma Rousseff', pertenceA: [1] },
    { id: 3, nome: 'Segundo mandato', pertenceA: [2] },
    { id: 4, nome: 'Ditadura Militar', pertenceA: [] },
];

const lerLinha = (csv) => {
    const [cab, ...resto] = csv
        .replace(/^\u{FEFF}/u, '')
        .trim()
        .split(/\r?\n/);
    const cols = cab.split(',').map((c) => c.replace(/^"|"$/g, ''));
    return { cols, linha: resto[0] };
};

describe('exportação com o caminho do período histórico', () => {
    beforeEach(() => {
        db.periodosHistoricos = arvore();
    });
    const poema = (periodoHistoricoId) => ({
        id: 1,
        titulo: 'T',
        texto: 'a',
        periodosHistoricosIds: periodoHistoricoId == null ? [] : [periodoHistoricoId],
    });

    it('CSV: mantém a coluna do nome e acrescenta a do caminho logo depois', () => {
        const { cols } = lerLinha(gerarCsvTextos('poema', [montarRegistro('poema', poema(3))], db));
        const i = cols.indexOf('periodo_historico');
        assert.ok(i >= 0);
        assert.equal(cols[i + 1], 'periodo_historico_caminho');
    });

    it('CSV: nome solto e caminho completo; texto sem período fica vazio', () => {
        const csv = gerarCsvTextos('poema', [montarRegistro('poema', poema(3))], db);
        assert.ok(csv.includes('Segundo mandato'));
        assert.ok(csv.includes('Nova República › Governo Dilma Rousseff › Segundo mandato'));
        const vazio = gerarCsvTextos('poema', [montarRegistro('poema', poema(null))], db);
        assert.ok(!vazio.includes('Nova República'));
    });

    it('MD: Período Histórico Retratado mostra o caminho; de topo, só o nome', () => {
        assert.match(
            itemParaMarkdown({ ...poema(3), tipo: 'poema' }, 1),
            /Nova República › Governo Dilma Rousseff › Segundo mandato/,
        );
        const topo = itemParaMarkdown({ ...poema(4), tipo: 'poema' }, 1);
        assert.match(topo, /Ditadura Militar/);
        assert.doesNotMatch(topo, /›/);
    });

    it('JSON seletivo: leva nome e caminho de cada período da lista', () => {
        const r = montarRegistro('poema', poema(3));
        assert.deepEqual(r.periodosHistoricosResolvidos, [
            {
                id: 3,
                nome: 'Segundo mandato',
                caminho: 'Nova República › Governo Dilma Rousseff › Segundo mandato',
                esferas: [],
                categorias: [],
            },
        ]);
        assert.equal(montarRegistro('poema', poema(null)).periodosHistoricosResolvidos, undefined);
    });

    it('JSON seletivo: texto com dois períodos leva os dois, na ordem', () => {
        const p = { ...poema(3), periodosHistoricosIds: [3, 1] };
        const r = montarRegistro('poema', p);
        assert.deepEqual(
            r.periodosHistoricosResolvidos.map((x) => x.id),
            [3, 1],
        );
    });
});
