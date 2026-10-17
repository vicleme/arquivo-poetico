import './helpers/dom-real.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    ESFERAS_HISTORICAS_DE_FABRICA,
    CATEGORIAS_HISTORICAS_DE_FABRICA,
    CLASSIFICACAO_DE_FABRICA_PERIODOS_HISTORICOS,
    FILTRO_PERIODO_HISTORICO_SEM_VALOR,
    opcoesDeFabricaPeriodoHistorico,
    migrarOpcoesPeriodoHistorico,
    migrarClassificacaoPeriodosHistoricos,
    opcoesDoPeriodoHistorico,
    registrarValoresNovosPeriodoHistorico,
    contarUsoOpcaoPeriodoHistorico,
    renomearOpcaoPeriodoHistorico,
    removerOpcaoPeriodoHistorico,
    mesclarClassificacaoDosPeriodosHistoricos,
    opcoesDeFiltroDosPeriodosHistoricos,
    filtrarPeriodosHistoricosPorClassificacao,
    textoBuscaEsferasHistoricas,
    textoBuscaCategoriasHistoricas,
    classificacaoDosPeriodosHistoricosDoTexto,
} from '../js/periodos-historicos-campos.js';
const { db } = await import('../js/db.js');

// Os 16 de fábrica, sem a classificação (como um backup anterior à feature).
const seedSemClassificacao = () =>
    db.periodosHistoricos
        .filter((p) => p.embutido)
        .map(({ id, nome, embutido }) => ({ id, nome, embutido }));

// Esfera (onde o fenômeno acontece) e Categoria (que tipo de acontecimento é)
// dos Períodos Históricos: vocabulário próprio, migração dos 16 de fábrica,
// renomear/apagar, mesclagem, filtro e o derivado no texto.

const novoDb = () => ({
    opcoesPeriodoHistorico: { esferas: ['Política', 'Social'], categorias: ['Guerra e conflito'] },
    periodosHistoricos: [
        { id: 1, nome: 'A', esferas: ['Política'], categorias: ['Guerra e conflito'] },
        { id: 2, nome: 'B', esferas: ['Política', 'Social'], categorias: [] },
        { id: 3, nome: 'C', esferas: [], categorias: [] },
    ],
});

describe('listas de fábrica', () => {
    it('Evento pontual não é Categoria (evento é a marca da fase 14)', () => {
        assert.ok(!CATEGORIAS_HISTORICAS_DE_FABRICA.includes('Evento pontual'));
        assert.deepEqual(CATEGORIAS_HISTORICAS_DE_FABRICA, [
            'Revolução',
            'Guerra e conflito',
            'Regime político',
            'Movimento artístico',
            'Movimento intelectual',
            'Crise',
            'Era',
        ]);
        assert.equal(ESFERAS_HISTORICAS_DE_FABRICA.length, 6);
    });

    it('opcoesDeFabrica devolve cópias, não as listas constantes', () => {
        const o = opcoesDeFabricaPeriodoHistorico();
        o.esferas.push('X');
        assert.ok(!ESFERAS_HISTORICAS_DE_FABRICA.includes('X'));
    });

    it('toda classificação de fábrica usa só valores das listas de fábrica', () => {
        CLASSIFICACAO_DE_FABRICA_PERIODOS_HISTORICOS.forEach((m) => {
            m.esferas.forEach((e) => assert.ok(ESFERAS_HISTORICAS_DE_FABRICA.includes(e), e));
            m.categorias.forEach((c) => assert.ok(CATEGORIAS_HISTORICAS_DE_FABRICA.includes(c), c));
        });
    });

    it('a tabela cobre exatamente os 16 períodos de fábrica do app', () => {
        const nomes = seedSemClassificacao().map((p) => p.nome);
        assert.equal(nomes.length, 16);
        assert.deepEqual(
            CLASSIFICACAO_DE_FABRICA_PERIODOS_HISTORICOS.map((m) => m.nome).sort(),
            [...nomes].sort(),
        );
    });
});

describe('migrarOpcoesPeriodoHistorico', () => {
    it('chave ausente: semeia a lista de fábrica', () => {
        const dbRef = { periodosHistoricos: [] };
        migrarOpcoesPeriodoHistorico(dbRef);
        assert.deepEqual(dbRef.opcoesPeriodoHistorico, opcoesDeFabricaPeriodoHistorico());
    });

    it('chave presente: o que foi apagado de propósito não volta', () => {
        const dbRef = {
            opcoesPeriodoHistorico: { esferas: ['Política'], categorias: [] },
            periodosHistoricos: [],
        };
        migrarOpcoesPeriodoHistorico(dbRef);
        assert.deepEqual(dbRef.opcoesPeriodoHistorico, { esferas: ['Política'], categorias: [] });
    });

    it('valor já usado num período (backup de outro aparelho) entra na lista', () => {
        const dbRef = {
            opcoesPeriodoHistorico: { esferas: [], categorias: [] },
            periodosHistoricos: [{ id: 1, esferas: ['Religiosa'], categorias: ['Cisma'] }],
        };
        migrarOpcoesPeriodoHistorico(dbRef);
        assert.deepEqual(dbRef.opcoesPeriodoHistorico, {
            esferas: ['Religiosa'],
            categorias: ['Cisma'],
        });
    });

    it('é idempotente', () => {
        const dbRef = novoDb();
        migrarOpcoesPeriodoHistorico(dbRef);
        const antes = structuredClone(dbRef.opcoesPeriodoHistorico);
        migrarOpcoesPeriodoHistorico(dbRef);
        assert.deepEqual(dbRef.opcoesPeriodoHistorico, antes);
    });
});

describe('migrarClassificacaoPeriodosHistoricos', () => {
    it('os de fábrica recebem a classificação, casada por nome', () => {
        const periodos = seedSemClassificacao();
        migrarClassificacaoPeriodosHistoricos(periodos);
        const guerra = periodos.find((p) => p.nome === 'Guerra Fria');
        assert.deepEqual(guerra.esferas, ['Política']);
        assert.deepEqual(guerra.categorias, ['Guerra e conflito']);
        const renasc = periodos.find((p) => p.nome === 'Renascimento');
        assert.deepEqual(renasc.categorias, ['Movimento artístico', 'Movimento intelectual']);
        assert.ok(periodos.every((p) => p.esferas.length > 0 && p.categorias.length > 0));
    });

    it('só vale uma vez: campo esvaziado pela pessoa não é repreenchido', () => {
        const periodos = [{ id: 1, nome: 'Guerra Fria', embutido: true }];
        migrarClassificacaoPeriodosHistoricos(periodos);
        periodos[0].esferas = [];
        migrarClassificacaoPeriodosHistoricos(periodos);
        assert.deepEqual(periodos[0].esferas, []);
        assert.deepEqual(periodos[0].categorias, ['Guerra e conflito']);
    });

    it('período criado pela pessoa, mesmo com nome de fábrica, nasce vazio', () => {
        const periodos = [{ id: 1, nome: 'Guerra Fria' }];
        migrarClassificacaoPeriodosHistoricos(periodos);
        assert.deepEqual(periodos[0].esferas, []);
        assert.deepEqual(periodos[0].categorias, []);
    });

    it('sanea listas já existentes (vazio e repetição saem)', () => {
        const periodos = [{ id: 1, nome: 'X', esferas: ['Social', ' ', 'social', 'Social'] }];
        migrarClassificacaoPeriodosHistoricos(periodos);
        assert.deepEqual(periodos[0].esferas, ['Social']);
        assert.deepEqual(periodos[0].categorias, []);
    });
});

describe('vocabulário', () => {
    it('opcoesDoPeriodoHistorico: lista + o que está em uso, em ordem alfabética', () => {
        const dbRef = novoDb();
        dbRef.periodosHistoricos[2].esferas = ['Artística'];
        assert.deepEqual(opcoesDoPeriodoHistorico(dbRef, 'esferas'), [
            'Artística',
            'Política',
            'Social',
        ]);
        assert.deepEqual(opcoesDoPeriodoHistorico(dbRef, 'inexistente'), []);
    });

    it('registrarValoresNovos: valor digitado entra na lista', () => {
        const dbRef = novoDb();
        registrarValoresNovosPeriodoHistorico(dbRef, { esferas: ['Religiosa'], categorias: [] });
        assert.ok(dbRef.opcoesPeriodoHistorico.esferas.includes('Religiosa'));
    });

    it('contar uso ignora maiúscula e acento de borda', () => {
        const dbRef = novoDb();
        assert.equal(contarUsoOpcaoPeriodoHistorico(dbRef, 'esferas', 'política'), 2);
        assert.equal(contarUsoOpcaoPeriodoHistorico(dbRef, 'esferas', 'Nada'), 0);
    });

    it('renomear troca na lista e em todos os períodos', () => {
        const dbRef = novoDb();
        assert.deepEqual(renomearOpcaoPeriodoHistorico(dbRef, 'esferas', 'Política', 'Poder'), {
            ok: true,
        });
        assert.deepEqual(dbRef.periodosHistoricos[0].esferas, ['Poder']);
        assert.deepEqual(dbRef.periodosHistoricos[1].esferas, ['Poder', 'Social']);
        assert.ok(dbRef.opcoesPeriodoHistorico.esferas.includes('Poder'));
        assert.ok(!dbRef.opcoesPeriodoHistorico.esferas.includes('Política'));
    });

    it('renomear para um nome que já existe junta os dois, sem duplicar', () => {
        const dbRef = novoDb();
        renomearOpcaoPeriodoHistorico(dbRef, 'esferas', 'Política', 'Social');
        assert.deepEqual(dbRef.periodosHistoricos[1].esferas, ['Social']);
        assert.deepEqual(dbRef.opcoesPeriodoHistorico.esferas, ['Social']);
    });

    it('renomear recusa nome vazio e tipo inválido', () => {
        const dbRef = novoDb();
        assert.deepEqual(renomearOpcaoPeriodoHistorico(dbRef, 'esferas', 'Política', '  '), {
            ok: false,
            motivo: 'vazio',
        });
        assert.equal(renomearOpcaoPeriodoHistorico(dbRef, 'x', 'a', 'b').ok, false);
    });

    it('esfera e categoria são vocabulários separados', () => {
        const dbRef = novoDb();
        renomearOpcaoPeriodoHistorico(dbRef, 'categorias', 'Guerra e conflito', 'Guerra');
        assert.deepEqual(dbRef.periodosHistoricos[0].categorias, ['Guerra']);
        assert.deepEqual(dbRef.periodosHistoricos[0].esferas, ['Política']);
    });

    it('apagar: recusa o que está em uso e remove o que ninguém usa', () => {
        const dbRef = novoDb();
        assert.deepEqual(removerOpcaoPeriodoHistorico(dbRef, 'esferas', 'Política'), {
            ok: false,
            motivo: 'em-uso',
            uso: 2,
        });
        dbRef.opcoesPeriodoHistorico.esferas.push('Religiosa');
        assert.equal(removerOpcaoPeriodoHistorico(dbRef, 'esferas', 'Religiosa').ok, true);
        assert.ok(!dbRef.opcoesPeriodoHistorico.esferas.includes('Religiosa'));
    });
});

describe('mesclar períodos', () => {
    it('o destino fica com a soma, sem repetir, as dele primeiro', () => {
        const destino = { esferas: ['Social'], categorias: ['Crise'] };
        const origem = { esferas: ['Política', 'Social'], categorias: [] };
        mesclarClassificacaoDosPeriodosHistoricos(destino, origem);
        assert.deepEqual(destino.esferas, ['Social', 'Política']);
        assert.deepEqual(destino.categorias, ['Crise']);
    });
});

describe('filtro e busca', () => {
    const lista = novoDb().periodosHistoricos;

    it('sem filtro devolve tudo', () => {
        assert.equal(filtrarPeriodosHistoricosPorClassificacao(lista).length, 3);
    });

    it('casa exatamente com a esfera escolhida', () => {
        const nomes = filtrarPeriodosHistoricosPorClassificacao(lista, { esfera: 'Social' }).map(
            (p) => p.nome,
        );
        assert.deepEqual(nomes, ['B']);
    });

    it('esfera e categoria combinam por E', () => {
        const nomes = filtrarPeriodosHistoricosPorClassificacao(lista, {
            esfera: 'Política',
            categoria: 'Guerra e conflito',
        }).map((p) => p.nome);
        assert.deepEqual(nomes, ['A']);
    });

    it('"sem valor" traz só quem não tem nada no campo', () => {
        const semCategoria = filtrarPeriodosHistoricosPorClassificacao(lista, {
            categoria: FILTRO_PERIODO_HISTORICO_SEM_VALOR,
        }).map((p) => p.nome);
        assert.deepEqual(semCategoria, ['B', 'C']);
        const semEsfera = filtrarPeriodosHistoricosPorClassificacao(lista, {
            esfera: FILTRO_PERIODO_HISTORICO_SEM_VALOR,
        }).map((p) => p.nome);
        assert.deepEqual(semEsfera, ['C']);
    });

    it('as opções do filtro são só os valores usados, sem repetir', () => {
        assert.deepEqual(opcoesDeFiltroDosPeriodosHistoricos(lista, 'esferas'), [
            'Política',
            'Social',
        ]);
        assert.deepEqual(opcoesDeFiltroDosPeriodosHistoricos(lista, 'categorias'), [
            'Guerra e conflito',
        ]);
    });

    it('texto de busca junta os valores', () => {
        assert.equal(textoBuscaEsferasHistoricas(lista[1]), 'Política Social');
        assert.equal(textoBuscaCategoriasHistoricas(lista[2]), '');
    });
});

describe('derivado no texto', () => {
    const cadastro = novoDb().periodosHistoricos;

    it('soma as esferas dos períodos do texto, sem repetir', () => {
        const texto = { periodosHistoricosIds: [1, 2] };
        assert.deepEqual(classificacaoDosPeriodosHistoricosDoTexto(texto, cadastro, 'esferas'), [
            'Política',
            'Social',
        ]);
        assert.deepEqual(classificacaoDosPeriodosHistoricosDoTexto(texto, cadastro, 'categorias'), [
            'Guerra e conflito',
        ]);
    });

    it('texto sem período, período apagado e tipo inválido saem vazios', () => {
        assert.deepEqual(classificacaoDosPeriodosHistoricosDoTexto({}, cadastro, 'esferas'), []);
        assert.deepEqual(
            classificacaoDosPeriodosHistoricosDoTexto(
                { periodosHistoricosIds: [99] },
                cadastro,
                'esferas',
            ),
            [],
        );
        assert.deepEqual(
            classificacaoDosPeriodosHistoricosDoTexto(
                { periodosHistoricosIds: [1] },
                cadastro,
                'x',
            ),
            [],
        );
    });
});
