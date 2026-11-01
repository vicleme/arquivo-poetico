import './helpers/dom-real.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Marca "sorteável", entrega 3b: coluna e ordenação, busca `sorteavel:`,
// edição em massa (Preencher campo) e Importar campos.
const { db } = await import('../js/db.js');
const { DEFINICAO_COLUNAS } = await import('../js/colunas.js');
const { celulaSorteavel } = await import('../js/celulas-tabela.js');
const { filtrarTextos, PREFIXOS_CANONICOS_POR_CAMPO } = await import('../js/utils.js');
const { decorarCamposBusca } = await import('../js/render-listas.js');
const {
    obterCampoPreenchivel,
    planejarPreenchimento,
    aplicarPreenchimento,
    planejarLimpeza,
    aplicarLimpeza,
} = await import('../js/campos-preenchiveis.js');
const { lerExtrasDaEntrada, aplicarCamposSimples } =
    await import('../js/importar-campos-extras.js');
const { ehSorteavel } = await import('../js/sorteavel.js');

describe('coluna Sorteável', () => {
    it('existe em Poemas e em Prosas, escondida por padrão, ordenável como número', () => {
        for (const tabela of ['poemas', 'prosas']) {
            const def = DEFINICAO_COLUNAS[tabela].find((c) => c.key === 'sorteavel');
            assert.ok(def, `${tabela} sem a coluna`);
            assert.equal(def.default, false);
            assert.equal(def.sortType, 'numero');
            assert.equal(def.label, 'Sorteável');
        }
    });
    it('a célula mostra "Sim" só nos marcados', () => {
        assert.match(celulaSorteavel({ sorteavel: true }), /Sim/);
        assert.doesNotMatch(celulaSorteavel({ sorteavel: false }), /Sim/);
        assert.doesNotMatch(celulaSorteavel({}), /Sim/);
    });
});

describe('busca sorteavel:', () => {
    const itens = () => {
        db.poemas = [
            { id: 1, titulo: 'A', sorteavel: true },
            { id: 2, titulo: 'B' },
            { id: 3, titulo: 'C', sorteavel: false },
            { id: 4, titulo: 'D', sorteavel: true },
        ];
        return db.poemas.map((p) => decorarCamposBusca(p, '', 'poema'));
    };
    const ids = (lista) => lista.map((i) => i.id);

    it('`sorteavel:*` acha os marcados e `-sorteavel:*` os demais', () => {
        const lista = itens();
        assert.deepEqual(ids(filtrarTextos(lista, 'sorteavel:*')), [1, 4]);
        assert.deepEqual(ids(filtrarTextos(lista, '-sorteavel:*')), [2, 3]);
    });
    it('o prefixo é canônico (a legenda da busca o descreve)', () => {
        assert.ok(Object.values(PREFIXOS_CANONICOS_POR_CAMPO).includes('sorteavel'));
    });
});

describe('Preencher campo em massa', () => {
    const campo = obterCampoPreenchivel('sorteavel');
    const itens = () => [{ id: 1, sorteavel: true }, { id: 2 }, { id: 3, sorteavel: false }];

    it('o campo é booleano e não é só de importação', () => {
        assert.equal(campo.tipo, 'booleano');
        assert.ok(!campo.soImportacao);
        assert.equal(campo.rotulo, 'Pode ser sorteado');
    });
    it('marcar muda só quem não estava marcado', () => {
        const lista = itens();
        const p = planejarPreenchimento(lista, campo, true);
        assert.deepEqual(
            p.alterar.map((i) => i.id),
            [2, 3],
        );
        assert.equal(p.jaIguais, 1);
        aplicarPreenchimento(p.alterar, campo, true);
        assert.ok(lista.every(ehSorteavel));
    });
    it('desmarcar grava false e pula quem já não estava marcado', () => {
        const lista = itens();
        const p = planejarPreenchimento(lista, campo, false);
        assert.deepEqual(
            p.alterar.map((i) => i.id),
            [1],
        );
        aplicarPreenchimento(p.alterar, campo, false);
        assert.equal(lista[0].sorteavel, false);
    });
    it('Limpar campo desmarca os marcados', () => {
        const lista = itens();
        const { alterar, jaVazios } = planejarLimpeza(lista, campo);
        assert.equal(alterar.length, 1);
        assert.equal(jaVazios, 2);
        aplicarLimpeza(alterar, campo);
        assert.ok(!lista.some(ehSorteavel));
    });
});

describe('Importar campos', () => {
    const simples = (bruta) => {
        const problemas = [];
        const e = lerExtrasDaEntrada(bruta, problemas);
        return { simples: e.simples, problemas };
    };
    it('`sorteavel` verdadeiro vira campo simples; falso e vazio são ignorados', () => {
        for (const v of [true, 'sim', 'true']) {
            assert.deepEqual(simples({ titulo: 'a', sorteavel: v }).simples, [
                { chave: 'sorteavel', valor: true },
            ]);
        }
        for (const v of [false, 'não', '', null]) {
            const r = simples({ titulo: 'a', sorteavel: v });
            assert.deepEqual(r.simples, []);
            assert.deepEqual(r.problemas, []);
        }
    });
    it('valor que não é sim ou não vai para o relatório', () => {
        const r = simples({ titulo: 'a', sorteavel: 'talvez' });
        assert.deepEqual(r.simples, []);
        assert.equal(r.problemas.length, 1);
        assert.equal(r.problemas[0].campo, 'sorteavel');
    });
    it('aplicar marca o texto, relata o que fez e nunca desmarca', () => {
        const item = { id: 1 };
        const rel = { camposSimples: [] };
        aplicarCamposSimples(item, [{ chave: 'sorteavel', valor: true }], rel);
        assert.equal(ehSorteavel(item), true);
        assert.equal(rel.camposSimples[0].acao, 'preenchido');
        const rel2 = { camposSimples: [] };
        aplicarCamposSimples(item, [{ chave: 'sorteavel', valor: true }], rel2);
        assert.equal(rel2.camposSimples[0].acao, 'igual');
        assert.equal(ehSorteavel(item), true);
    });
});
