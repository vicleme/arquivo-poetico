import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import {
    classificarImportacaoAditiva,
    aplicarImportacaoAditiva,
    criarPeriodoHistoricoComCaminho,
} from '../js/importar-aditivo.js';
import { caminhoDoPeriodo } from '../js/periodos-historicos-hierarquia.js';

// Importação Aditiva e a hierarquia dos Períodos Históricos: o caminho
// exportado recria os pais ao criar o período e desempata homônimos.

const CAMINHO = 'Nova República › Governo Dilma Rousseff › Segundo mandato';

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

const poema = (id, extra = {}) => ({
    id,
    tipo: 'poema',
    titulo: `Poema ${id}`,
    texto: 't',
    pessoas: [],
    autoria: [],
    gruposDiretosResolvidos: [],
    livrosResolvidos: [],
    contexto: { livro: null, parte: null, secao: null },
    periodoHistoricoId: 9,
    periodoHistoricoNome: 'Segundo mandato',
    periodoHistoricoCaminho: CAMINHO,
    ...extra,
});

const importar = async (payload, db) => {
    const relatorio = classificarImportacaoAditiva(payload, db);
    const deps = { tirarSnapshotSeNecessario: mock.fn(async () => true), save: mock.fn() };
    return { relatorio, resultado: await aplicarImportacaoAditiva(payload, relatorio, db, deps) };
};

const por = (db, nome) => db.periodosHistoricos.filter((p) => p.nome === nome);

describe('importação: período criado com a cadeia de pais', () => {
    it('acervo vazio: cria os três níveis ligados e conta os pais', async () => {
        const db = dbVazio();
        const { resultado } = await importar({ itens: [poema(1)] }, db);
        assert.equal(db.periodosHistoricos.length, 3);
        const folha = por(db, 'Segundo mandato')[0];
        assert.equal(caminhoDoPeriodo(db.periodosHistoricos, folha.id), CAMINHO);
        assert.deepEqual(db.poemas[0].periodosHistoricosIds, [folha.id]);
        assert.equal(db.poemas[0].periodoHistoricoCaminho, undefined, 'não persiste no texto');
        assert.deepEqual(resultado.periodos, { paisCriados: 2, homonimos: 0 });
    });

    it('dois textos do mesmo período criam a cadeia uma vez só', async () => {
        const db = dbVazio();
        await importar({ itens: [poema(1), poema(2)] }, db);
        assert.equal(db.periodosHistoricos.length, 3);
    });

    it('pai que já existe com nome único é reaproveitado', async () => {
        const db = dbVazio();
        db.periodosHistoricos.push({ id: 100, nome: 'Nova República', pertenceA: [] });
        const { resultado } = await importar({ itens: [poema(1)] }, db);
        assert.equal(por(db, 'Nova República').length, 1);
        const dilma = por(db, 'Governo Dilma Rousseff')[0];
        assert.deepEqual(dilma.pertenceA, [100]);
        assert.equal(resultado.periodos.paisCriados, 1);
    });

    it('pai com homônimos no destino: casa só pelo caminho exato; senão cria outro e avisa', async () => {
        const db = dbVazio();
        db.periodosHistoricos.push(
            { id: 100, nome: 'Nova República', pertenceA: [] },
            { id: 101, nome: 'Governo Dilma Rousseff', pertenceA: [100] },
            { id: 102, nome: 'Governo Dilma Rousseff', pertenceA: [] },
        );
        const { resultado } = await importar({ itens: [poema(1)] }, db);
        assert.equal(
            por(db, 'Governo Dilma Rousseff').length,
            2,
            'o do caminho exato foi reaproveitado',
        );
        assert.deepEqual(por(db, 'Segundo mandato')[0].pertenceA, [101]);
        assert.equal(resultado.periodos.homonimos, 0);

        const db2 = dbVazio();
        db2.periodosHistoricos.push(
            { id: 201, nome: 'Governo Dilma Rousseff', pertenceA: [] },
            { id: 202, nome: 'Governo Dilma Rousseff', pertenceA: [] },
        );
        const r2 = await importar({ itens: [poema(1)] }, db2);
        assert.equal(por(db2, 'Governo Dilma Rousseff').length, 3, 'nasce um terceiro, separado');
        assert.equal(r2.resultado.periodos.homonimos, 1);
    });

    it('sem caminho, ou com caminho que não termina no nome: nasce de topo', async () => {
        const db = dbVazio();
        await importar({ itens: [poema(1, { periodoHistoricoCaminho: undefined })] }, db);
        assert.deepEqual(por(db, 'Segundo mandato')[0].pertenceA, []);
        assert.equal(db.periodosHistoricos.length, 1);

        const db2 = dbVazio();
        await importar({ itens: [poema(1, { periodoHistoricoCaminho: 'A › B › Outro' })] }, db2);
        assert.equal(db2.periodosHistoricos.length, 1);
    });

    it('função: o caminho comparado sem caixa no último trecho', () => {
        const db = dbVazio();
        const id = criarPeriodoHistoricoComCaminho(db, 'Segundo Mandato', 'A › segundo mandato');
        assert.equal(db.periodosHistoricos.length, 2);
        assert.deepEqual(db.periodosHistoricos.find((p) => p.id === id).pertenceA.length, 1);
    });
});

describe('importação: desempate de homônimos ao casar', () => {
    const destino = () => {
        const db = dbVazio();
        db.periodosHistoricos.push(
            { id: 1, nome: 'Governo Lula', pertenceA: [] },
            { id: 2, nome: 'Governo Dilma', pertenceA: [] },
            { id: 3, nome: 'Primeiro mandato', pertenceA: [1] },
            { id: 4, nome: 'Primeiro mandato', pertenceA: [2] },
        );
        return db;
    };
    const item = (caminho) =>
        poema(1, {
            periodoHistoricoNome: 'Primeiro mandato',
            periodoHistoricoCaminho: caminho,
        });

    it('um só candidato com o mesmo caminho: casa sozinho', () => {
        const rel = classificarImportacaoAditiva(
            { itens: [item('Governo Dilma › Primeiro mandato')] },
            destino(),
        );
        const ref = rel.itensOrigem[0].referencias.find((r) => r.campo === 'periodoHistoricoId');
        assert.equal(ref.decisao, 'casar');
        assert.equal(ref.entidadeDestinoId, 4);
    });

    it('sem caminho que desempate: segue ambíguo, decisão manual', () => {
        const rel = classificarImportacaoAditiva({ itens: [item(undefined)] }, destino());
        const ref = rel.itensOrigem[0].referencias.find((r) => r.campo === 'periodoHistoricoId');
        assert.equal(ref.decisao, null);
        assert.equal(ref.candidatos.length, 2);
    });
});
