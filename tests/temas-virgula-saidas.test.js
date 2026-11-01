// dom-real.js: as saídas puxam a cadeia de imports com DOM.
import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Fase 2, Etapa 7, entrega 3: um Tema com vírgula no nome ("Amor, perda")
// continua sendo UM Tema em todas as saídas e filtros; o separador das saídas
// em texto é ` | ` e o dos filtros digitados é `;`.
const { db } = await import('../js/db.js');
const U = await import('../js/utils.js');
const T = await import('../js/temas.js');
const { badgesEtiquetasPorCategoria } = await import('../js/celulas-tabela.js');
const { montarRegistro, correspondeFiltro, listaDeTemasDigitados } =
    await import('../js/exportar.js');
const { gerarCsvTextos } = await import('../js/exportar-csv.js');
const { gerarMarkdownItem } = await import('../js/exportar-md.js');

const texto = (extra = {}) => ({
    id: 1,
    titulo: 'P1',
    texto: 'verso',
    temas: [
        { temaId: 101, papel: 'principal' },
        { temaId: 102, papel: '' },
    ],
    sinalizacoesEstilo: 'Lírico, Sombrio',
    ...extra,
});

describe('Tema com vírgula no nome: saídas e filtros', () => {
    beforeEach(() => {
        db.temas = [
            { id: 101, nome: 'Amor, perda', notas: '' },
            { id: 102, nome: 'Brasil', notas: '' },
        ];
    });

    it('o separador das saídas é " | " e vem de utils.js (temas.js reexporta)', () => {
        assert.equal(U.SEPARADOR_SAIDA_TEMAS, ' | ');
        assert.equal(T.SEPARADOR_SAIDA_TEMAS, ' | ');
    });

    it('valorDaCategoria junta por " | " e textoTemasComPapel prefere a vírgula', () => {
        assert.equal(
            U.valorDaCategoria(texto(), 'tema', { temas: db.temas }),
            'Amor, perda | Brasil',
        );
        // Leitura (Ver e .md): `;` só porque um nome tem vírgula; sem isso, vírgula.
        assert.equal(U.textoTemasComPapel(texto(), db.temas), 'Amor, perda (principal); Brasil');
        const semVirgula = texto({ temas: [{ temaId: 102, papel: 'principal' }] });
        assert.equal(U.textoTemasComPapel(semVirgula, db.temas), 'Brasil (principal)');
        const doisSimples = texto({
            temas: [
                { temaId: 102, papel: '' },
                { temaId: 103, papel: '' },
            ],
        });
        db.temas.push({ id: 103, nome: 'Luto', notas: '' });
        assert.equal(U.textoTemasComPapel(doisSimples, db.temas), 'Brasil, Luto');
    });

    it('listaSinalizacoes: cada Tema é um item e as outras categorias quebram por vírgula', () => {
        assert.deepEqual(U.listaSinalizacoes(texto(), { temas: db.temas }), [
            'Lírico',
            'Sombrio',
            'Amor, perda',
            'Brasil',
        ]);
    });

    it('a contagem da coluna Etiquetas conta o Tema com vírgula uma vez', () => {
        assert.equal(U.CAMPOS_CONTAVEIS.etiquetas.contar(texto(), db), 4);
    });

    it('.md e Visualização usam ";" só quando um nome tem vírgula', () => {
        const md = gerarMarkdownItem({ ...texto(), _tipo: 'poema' });
        assert.match(md, /Tema:?\*{0,2} Amor, perda \(principal\); Brasil/);
    });

    it('CSV: sinal_tema traz um item por Tema, mesmo com vírgula no nome', () => {
        const regs = [montarRegistro('poema', texto())];
        const csv = gerarCsvTextos('poema', regs, db);
        assert.ok(csv.includes('"Amor, perda | Brasil"'), csv);
        assert.ok(csv.includes('sinal_tema'));
    });

    it('badges de Etiquetas: um selo "Amor, perda", sem quebrar na vírgula', () => {
        const html = badgesEtiquetasPorCategoria(texto());
        assert.match(html, />Amor, perda /);
        assert.doesNotMatch(html, />Amor /);
    });

    it('filtro de exportação: o ponto e vírgula separa e a vírgula fica no nome', () => {
        assert.deepEqual(listaDeTemasDigitados('Amor, perda; Brasil'), ['amor, perda', 'brasil']);
        const base = {
            livrosIncluir: [],
            pessoasIncluir: [],
            temasIncluir: [],
            temasExcluir: [],
            status: 'todos',
        };
        const incluir = (...t) => correspondeFiltro(texto(), { ...base, temasIncluir: t }, 'poema');
        assert.equal(incluir('amor, perda'), true);
        assert.equal(incluir('amor'), false, 'o pedaço antes da vírgula não é um Tema');
        assert.equal(incluir('lírico'), true, 'outras categorias seguem valendo');
        const excluir = (...t) => correspondeFiltro(texto(), { ...base, temasExcluir: t }, 'poema');
        assert.equal(excluir('amor, perda'), false);
        assert.equal(excluir('perda'), true);
    });
});
