import './helpers/dom-real.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Padrões de colunas de fábrica: semeados uma vez na lista da própria pessoa.

const F = await import('../js/padroes-colunas-fabrica.js');
const C = await import('../js/colunas.js');
const D = await import('../js/db.js');

const NOMES = [
    'Tags & Temas',
    'Ondes & Quandos (Produção)',
    'Ondes & Quandos (Retrato)',
    'Revisão',
    'Intertexto',
    'Circulação',
    'Correntes',
    'Pessoas & Personagens',
];

describe('padrões de colunas de fábrica', () => {
    it('toda coluna citada existe em Poemas e em Prosas', () => {
        for (const tabela of F.TABELAS_PADROES_COLUNAS_FABRICA) {
            const validas = new Set(C.DEFINICAO_COLUNAS[tabela].map((c) => c.key));
            for (const p of F.PADROES_COLUNAS_FABRICA) {
                for (const k of [...p.colunas, ...(p.extras?.[tabela] ?? [])]) {
                    assert.ok(validas.has(k), `${p.nome}: ${k} não existe em ${tabela}`);
                }
            }
        }
    });

    it('nenhum padrão de fábrica traz coluna fixa (ID/Título, Ações)', () => {
        for (const p of F.PADROES_COLUNAS_FABRICA) {
            assert.ok(!p.colunas.includes('id') && !p.colunas.includes('acoes'), p.nome);
        }
    });

    it('acervo sem nada recebe os oito em Poemas e Prosas, e só nelas', () => {
        const banco = {};
        F.aplicarPadroesColunasDeFabrica(banco);
        assert.deepEqual(Object.keys(banco.padroesColunas).sort(), ['poemas', 'prosas']);
        for (const tabela of ['poemas', 'prosas']) {
            assert.deepEqual(
                banco.padroesColunas[tabela].map((p) => p.nome),
                NOMES,
            );
        }
        assert.equal(banco.padroesColunasFabricaVersao, F.VERSAO_PADROES_COLUNAS_FABRICA);
    });

    it('padrões da pessoa ficam na frente e o mesmo nome não é duplicado nem trocado', () => {
        const banco = {
            padroesColunas: {
                poemas: [
                    { nome: 'Meu', colunas: ['notas'] },
                    { nome: 'revisão', colunas: ['status'] },
                ],
            },
        };
        F.aplicarPadroesColunasDeFabrica(banco);
        const nomes = banco.padroesColunas.poemas.map((p) => p.nome);
        assert.deepEqual(nomes, ['Meu', 'revisão', ...NOMES.filter((n) => n !== 'Revisão')]);
        assert.deepEqual(banco.padroesColunas.poemas[1].colunas, ['status']);
    });

    it('depois de aplicado, excluir um padrão de fábrica não o traz de volta', () => {
        const banco = {};
        F.aplicarPadroesColunasDeFabrica(banco);
        banco.padroesColunas.poemas = banco.padroesColunas.poemas.filter(
            (p) => p.nome !== 'Revisão',
        );
        F.aplicarPadroesColunasDeFabrica(banco);
        assert.ok(!banco.padroesColunas.poemas.some((p) => p.nome === 'Revisão'));
    });

    it('o db real já nasce com os padrões e aplicar um liga exatamente as colunas', () => {
        C.usarArmazenamentoPadroes({
            ler: (tabela) => D.db.padroesColunas?.[tabela] ?? [],
            gravar: (tabela, lista) => {
                D.db.padroesColunas = { ...D.db.padroesColunas, [tabela]: lista };
            },
        });
        assert.deepEqual(
            D.db.padroesColunas.poemas.slice(0, 8).map((p) => p.nome),
            NOMES,
        );
        assert.equal(C.listarPadroesColunas('poemas').length >= 8, true);
        assert.equal(C.aplicarPadraoColunas('poemas', 'Tags & Temas'), true);
        assert.deepEqual(C.getColunasAtivas('poemas'), ['etiquetas', 'temas', 'assuntos']);
    });

    it('Circulação leva a coluna estrutural de cada aba', () => {
        const banco = {};
        F.aplicarPadroesColunasDeFabrica(banco);
        const de = (tabela) =>
            banco.padroesColunas[tabela].find((p) => p.nome === 'Circulação').colunas;
        assert.equal(de('poemas').at(-1), 'estrutura');
        assert.equal(de('prosas').at(-1), 'vinculo');
        assert.ok(!de('poemas').includes('vinculo') && !de('prosas').includes('estrutura'));
    });

    it('acervo que já estava na versão 1 só recebe os três novos, sem recriar o excluído', () => {
        const banco = {
            padroesColunasFabricaVersao: 1,
            padroesColunas: { poemas: [], prosas: [] },
        };
        F.aplicarPadroesColunasDeFabrica(banco);
        assert.deepEqual(
            banco.padroesColunas.poemas.map((p) => p.nome),
            ['Circulação', 'Correntes', 'Pessoas & Personagens'],
        );
        assert.equal(banco.padroesColunasFabricaVersao, F.VERSAO_PADROES_COLUNAS_FABRICA);
    });

    it('o seletor lista os padrões em ordem alfabética, sem diferenciar caixa nem acento', () => {
        C.usarArmazenamentoPadroes({
            ler: () => [
                { nome: 'zebra', colunas: ['notas'] },
                { nome: 'Última', colunas: ['notas'] },
                { nome: 'Árvore', colunas: ['notas'] },
                { nome: 'beta', colunas: ['notas'] },
            ],
            gravar: () => {},
        });
        const html = C.renderSeletorColunas('poemas');
        const ordem = [...html.matchAll(/<option value="([^"]+)"/g)].map((m) => m[1]);
        assert.deepEqual(ordem, ['Árvore', 'beta', 'Última', 'zebra']);
    });
});
