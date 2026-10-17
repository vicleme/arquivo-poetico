import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Período Biográfico oculto (`oculto: true` em db.epocas): esconde o nome do
// período em listas, coluna Época Retratada, busca, sugestões e exportações,
// sem desvincular o texto. Ocultar uma Pessoa avisa sobre os períodos ligados.

const { db, migrarEpocasOculto, mesclarEpocas } = await import('../js/db.js');
const {
    periodoVisivel,
    periodosVisiveis,
    periodosLigadosAPessoa,
    definirOcultoNosPeriodos,
    opcoesDeFiltroBiografico,
} = await import('../js/periodo-biografico-campos.js');
const { nomeEpocaExibivel, formatarEpocaRetratada, ROTULO_PERIODO_OCULTO } =
    await import('../js/utils.js');
const { definirExibirOcultasDosPeriodos, opcoesOcultasDosPeriodos } =
    await import('../js/ocultas-periodos.js');
const { badgeEpocaRetratada } = await import('../js/celulas-tabela.js');
const { montarRegistro } = await import('../js/exportar.js');
const { atualizarDatalistEpoca } = await import('../js/editor.js');

function montarBanco() {
    db.autores = [{ id: 1, nome: 'Ana', genero: 'Mulher' }];
    db.pessoas = [
        { id: 100, nome: 'Carla', genero: 'Mulher', oculto: false },
        { id: 101, nome: 'Davi', genero: 'Homem', oculto: false },
    ];
    db.epocas = [
        {
            id: 10,
            nome: 'Namoro com Davi',
            autorId: 1,
            oculto: true,
            esferas: ['Amorosa'],
            categorias: ['Relação passada'],
            pessoasEnvolvidas: [{ pessoaId: 101 }],
            relacoes: [{ de: 'autor', para: 101, natureza: '', vinculo: '' }],
        },
        {
            id: 11,
            nome: 'Faculdade',
            autorId: 1,
            oculto: false,
            esferas: ['Estudos'],
            categorias: [],
            pessoasEnvolvidas: [{ pessoaId: 100 }],
            relacoes: [],
        },
    ];
    db.poemas = [
        { id: 1, titulo: 'A', epocaRetratada: { epocaId: 10, recorte: 'momento' } },
        { id: 2, titulo: 'B', epocaRetratada: { epocaId: 11 } },
    ];
    db.prosas = [];
    definirExibirOcultasDosPeriodos(false);
}

describe('migração e funções puras', () => {
    it('migrarEpocasOculto só preenche quem não tem o campo', () => {
        const lista = [{ id: 1 }, { id: 2, oculto: true }, { id: 3, oculto: false }];
        migrarEpocasOculto(lista);
        assert.deepEqual(
            lista.map((e) => e.oculto),
            [false, true, false],
        );
    });

    it('periodoVisivel/periodosVisiveis respeitam incluirOcultas', () => {
        montarBanco();
        assert.equal(periodoVisivel(db.epocas[0]), false);
        assert.equal(periodoVisivel(db.epocas[0], { incluirOcultas: true }), true);
        assert.deepEqual(
            periodosVisiveis(db.epocas).map((e) => e.id),
            [11],
        );
        assert.deepEqual(
            periodosVisiveis(db.epocas, { incluirOcultas: true }).map((e) => e.id),
            [10, 11],
        );
    });

    it('periodosLigadosAPessoa acha por envolvida e por ponta de relação', () => {
        montarBanco();
        assert.deepEqual(
            periodosLigadosAPessoa(db, 101).map((e) => e.id),
            [10],
        );
        db.epocas[1].relacoes = [{ de: 100, para: 101, natureza: '', vinculo: '' }];
        assert.deepEqual(
            periodosLigadosAPessoa(db, 101)
                .map((e) => e.id)
                .sort(),
            [10, 11],
        );
    });

    it('definirOcultoNosPeriodos devolve só os ids que mudaram', () => {
        montarBanco();
        assert.deepEqual(definirOcultoNosPeriodos(db, [10, 11], true), [11]);
        assert.equal(db.epocas[1].oculto, true);
        assert.deepEqual(definirOcultoNosPeriodos(db, [11], false), [11]);
        assert.equal(db.epocas[1].oculto, false);
    });

    it('mesclar mantém oculto se qualquer um dos dois estava oculto', () => {
        montarBanco();
        mesclarEpocas(db, 10, 11);
        assert.equal(db.epocas.length, 1);
        assert.equal(db.epocas[0].oculto, true);
        assert.equal(db.poemas[0].epocaRetratada.periodos[0].epocaId, 11);
    });

    it('opções dos filtros não trazem Esfera/Categoria/Pessoa de período oculto', () => {
        montarBanco();
        const op = opcoesDeFiltroBiografico(db);
        assert.deepEqual(op.esferas, ['Estudos']);
        assert.deepEqual(op.categorias, []);
        assert.deepEqual(
            op.pessoas.map((p) => p.nome),
            ['Carla'],
        );
        const todas = opcoesDeFiltroBiografico(db, { incluirOcultas: true });
        assert.deepEqual(todas.esferas.sort(), ['Amorosa', 'Estudos']);
    });
});

describe('exibição do nome', () => {
    beforeEach(() => montarBanco());

    it('nomeEpocaExibivel troca o nome pelo rótulo e respeita incluirOcultas', () => {
        const er = db.poemas[0].epocaRetratada;
        assert.equal(nomeEpocaExibivel(er, db.epocas), ROTULO_PERIODO_OCULTO);
        assert.equal(nomeEpocaExibivel(er, db.epocas, { incluirOcultas: true }), 'Namoro com Davi');
        assert.equal(nomeEpocaExibivel(db.poemas[1].epocaRetratada, db.epocas), 'Faculdade');
    });

    it('formatarEpocaRetratada usa o rótulo e mantém o recorte', () => {
        const txt = formatarEpocaRetratada(db.poemas[0].epocaRetratada, db.epocas);
        assert.ok(txt.startsWith(ROTULO_PERIODO_OCULTO));
        assert.ok(!txt.includes('Davi'));
    });

    it('a coluna Época Retratada mostra o rótulo, e o nome real com Exibir ocultas', () => {
        const er = db.poemas[0].epocaRetratada;
        assert.ok(badgeEpocaRetratada(er).includes(ROTULO_PERIODO_OCULTO));
        assert.ok(!badgeEpocaRetratada(er).includes('Davi'));
        definirExibirOcultasDosPeriodos(true);
        assert.deepEqual(opcoesOcultasDosPeriodos(), { incluirOcultas: true });
        assert.ok(badgeEpocaRetratada(er).includes('Namoro com Davi'));
    });
});

describe('exportação e sugestões', () => {
    beforeEach(() => montarBanco());

    it('a exportação não leva nome, Esfera nem Categoria de período oculto', () => {
        const r = montarRegistro('poema', db.poemas[0]);
        const periodo = r.epocaRetratada.periodos[0];
        assert.equal(periodo.nomeEpoca, '');
        assert.deepEqual(periodo.esferas, []);
        assert.deepEqual(periodo.categorias, []);
        assert.equal(periodo.epocaId, null);
        assert.equal(periodo.recorte, 'momento');
    });

    it('a exportação segue normal para período visível', () => {
        const r = montarRegistro('poema', db.poemas[1]);
        assert.equal(r.epocaRetratada.periodos[0].nomeEpoca, 'Faculdade');
        assert.deepEqual(r.epocaRetratada.periodos[0].esferas, ['Estudos']);
    });

    it('as sugestões do modal não incluem período oculto', () => {
        document.body.innerHTML = '<datalist id="sugestoes-epoca-nome"></datalist>';
        atualizarDatalistEpoca('poemas');
        const nomes = [...document.querySelectorAll('#sugestoes-epoca-nome option')].map((o) =>
            o.getAttribute('value'),
        );
        assert.deepEqual(nomes, ['Faculdade']);
        definirExibirOcultasDosPeriodos(true);
        atualizarDatalistEpoca('poemas');
        const todos = [...document.querySelectorAll('#sugestoes-epoca-nome option')].map((o) =>
            o.getAttribute('value'),
        );
        assert.deepEqual(todos.sort(), ['Faculdade', 'Namoro com Davi']);
    });
});
