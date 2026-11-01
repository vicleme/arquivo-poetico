import './helpers/dom-real.js';

// Valência do Tema, entrega 2: seleção, edição em massa, amostra sugerida.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    selecaoTemas,
    definirTemasVisiveis,
    temasVisiveis,
    alternarSelecaoTema,
    alternarSelecaoTodosTemas,
    limparSelecaoTemas,
    aplicarValenciaEmMassa,
    aplicarValenciasSugeridas,
} from '../js/temas-massa.js';
import { VALENCIA_SEED_TEMAS, valenciaSugeridaDoTema } from '../js/valencia-seed.js';
import { VALENCIAS_TEMA } from '../js/temas.js';
import { semearTemasEAssuntos } from '../js/db.js';

const dbBase = () => ({
    temas: [
        { id: 1, nome: 'Luto/Finitude', notas: '' },
        { id: 2, nome: 'Saudade', notas: '', valencia: 'ambivalente' },
        { id: 3, nome: 'Tema meu', notas: '' },
        { id: 4, nome: 'Cotidiano', notas: '' },
    ],
});

describe('seleção dos Temas', () => {
    it('Shift-clique marca o intervalo da lista visível', () => {
        limparSelecaoTemas();
        definirTemasVisiveis([1, 2, 3, 4]);
        alternarSelecaoTema(1, true);
        alternarSelecaoTema(3, true, true);
        assert.deepEqual([...selecaoTemas].sort(), ['1', '2', '3']);
        alternarSelecaoTema(2, false);
        assert.deepEqual([...selecaoTemas].sort(), ['1', '3']);
    });

    it('"Selecionar todos" vale só para a lista visível', () => {
        limparSelecaoTemas();
        definirTemasVisiveis([2, 4]);
        alternarSelecaoTodosTemas(true);
        assert.deepEqual([...selecaoTemas].sort(), ['2', '4']);
        alternarSelecaoTodosTemas(false);
        assert.equal(selecaoTemas.size, 0);
        assert.deepEqual(temasVisiveis(), ['2', '4']);
    });

    it('tema que sai da lista visível sai da seleção', () => {
        limparSelecaoTemas();
        definirTemasVisiveis([1, 2, 3]);
        alternarSelecaoTodosTemas(true);
        definirTemasVisiveis([2]);
        assert.deepEqual([...selecaoTemas], ['2']);
    });
});

describe('aplicarValenciaEmMassa', () => {
    it('define a valência dos selecionados e conta só os que mudaram', () => {
        const db = dbBase();
        const r = aplicarValenciaEmMassa(db, ['1', 2, 3], 'Desagradável');
        assert.equal(r.ok, true);
        assert.equal(r.alterados, 3);
        assert.equal(r.valencia, 'desagradavel');
        db.temas.slice(0, 3).forEach((t) => assert.equal(t.valencia, 'desagradavel'));
        assert.equal('valencia' in db.temas[3], false);
        const de_novo = aplicarValenciaEmMassa(db, [1, 2], 'desagradavel');
        assert.equal(de_novo.alterados, 0);
        assert.equal(de_novo.iguais, 2);
    });

    it('"" limpa o campo (não classificado)', () => {
        const db = dbBase();
        const r = aplicarValenciaEmMassa(db, [2], '');
        assert.equal(r.alterados, 1);
        assert.equal('valencia' in db.temas[1], false);
    });

    it('desfazer devolve cada tema como estava, com e sem o campo', () => {
        const db = dbBase();
        const r = aplicarValenciaEmMassa(db, [1, 2], 'agradavel');
        r.desfazer();
        assert.equal('valencia' in db.temas[0], false);
        assert.equal(db.temas[1].valencia, 'ambivalente');
    });

    it('recusa valência inválida e seleção vazia sem mexer em nada', () => {
        const db = dbBase();
        assert.equal(aplicarValenciaEmMassa(db, [1], 'bom').ok, false);
        assert.equal(aplicarValenciaEmMassa(db, [], 'neutro').motivo, 'sem-temas');
        assert.equal(aplicarValenciaEmMassa(db, [99], 'neutro').ok, false);
        assert.equal('valencia' in db.temas[0], false);
    });
});

describe('amostra sugerida (44 temas)', () => {
    it('cobre os 44 temas do seed e só usa valores válidos', () => {
        const { temas } = semearTemasEAssuntos();
        assert.equal(temas.length, 44);
        assert.equal(Object.keys(VALENCIA_SEED_TEMAS).length, 44);
        temas.forEach((t) => {
            assert.ok(VALENCIAS_TEMA.includes(t.valencia), `sem valência: ${t.nome}`);
        });
    });

    it('casa sem caixa e sem acento; tema fora da amostra devolve vazio', () => {
        assert.equal(valenciaSugeridaDoTema('luto/finitude'), 'desagradavel');
        assert.equal(valenciaSugeridaDoTema('MEMORIA'), 'ambivalente');
        assert.equal(valenciaSugeridaDoTema('Tema meu'), '');
    });

    it('aplicarValenciasSugeridas preenche só o vazio e não toca no resto', () => {
        const db = dbBase();
        db.temas[3].valencia = 'agradavel'; // Cotidiano: o usuário já definiu
        const r = aplicarValenciasSugeridas(db);
        assert.equal(r.aplicados, 1); // só Luto/Finitude
        assert.equal(r.jaTinham, 2); // Saudade e Cotidiano
        assert.equal(r.foraDaAmostra, 1); // Tema meu
        assert.equal(db.temas[0].valencia, 'desagradavel');
        assert.equal(db.temas[3].valencia, 'agradavel');
        assert.equal('valencia' in db.temas[2], false);
        r.desfazer();
        assert.equal('valencia' in db.temas[0], false);
    });
});
