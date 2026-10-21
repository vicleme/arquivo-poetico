import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    TIPO_SUMARIO,
    NOME_ARQUIVO_MODELO_SUMARIO,
    MAX_ITENS_SUMARIO,
    lerNivel,
    normalizarItensSumario,
    validarJsonSumario,
    camposDoSumario,
    gerarModeloSumario,
    modeloSumarioComoTexto,
} from '../js/sumario.js';

describe('Sumário: nível', () => {
    it('aceita inteiro de 1 a 9, como número ou texto', () => {
        assert.equal(lerNivel(1), 1);
        assert.equal(lerNivel('3'), 3);
        assert.equal(lerNivel(' 9 '), 9);
    });

    it('recusa ausente, zero, acima de 9, decimal e texto', () => {
        for (const v of [undefined, null, '', 0, 10, 2.5, -1, 'a', 'dois', {}, true]) {
            assert.equal(lerNivel(v), null, String(v));
        }
    });
});

describe('Sumário: normalizar itens', () => {
    it('mantém nível, item e página, limpando espaços', () => {
        const { itens, avisos } = normalizarItensSumario([
            { nivel: 2, item: '  Seção   de   abertura ', pagina: ' 11 ' },
        ]);
        assert.deepEqual(itens, [{ nivel: 2, item: 'Seção de abertura', pagina: '11' }]);
        assert.deepEqual(avisos, []);
    });

    it('página pode ser número, romano ou ausente', () => {
        const { itens } = normalizarItensSumario([
            { nivel: 1, item: 'A', pagina: 15 },
            { nivel: 1, item: 'B', pagina: 'xii' },
            { nivel: 1, item: 'C' },
            { nivel: 1, item: 'D', pagina: null },
        ]);
        assert.deepEqual(
            itens.map((i) => i.pagina),
            ['15', 'xii', '', ''],
        );
    });

    it('descarta item sem texto e avisa', () => {
        const { itens, avisos } = normalizarItensSumario([
            { nivel: 1, item: 'Ok' },
            { nivel: 1, item: '   ' },
            { nivel: 1 },
            null,
        ]);
        assert.equal(itens.length, 1);
        assert.equal(avisos.length, 1);
        assert.match(avisos[0], /3 itens sem texto foram descartados/);
    });

    it('nível ausente ou inválido entra no nível 1 e avisa', () => {
        const { itens, avisos } = normalizarItensSumario([
            { item: 'Sem nível' },
            { nivel: 12, item: 'Alto demais' },
            { nivel: 2, item: 'Certo' },
        ]);
        assert.deepEqual(
            itens.map((i) => i.nivel),
            [1, 1, 2],
        );
        assert.match(avisos[0], /2 itens sem nível válido entraram no nível 1/);
    });

    it('página que não é texto nem número fica vazia e avisa', () => {
        const { itens, avisos } = normalizarItensSumario([
            { nivel: 1, item: 'A', pagina: { x: 1 } },
        ]);
        assert.equal(itens[0].pagina, '');
        assert.match(avisos[0], /1 item com página inválida ficou sem página/);
    });

    it('mantém a ordem recebida e ignora campos extras', () => {
        const { itens } = normalizarItensSumario([
            { nivel: 1, item: 'B', pagina: '2', cor: 'azul' },
            { nivel: 1, item: 'A', pagina: '1' },
        ]);
        assert.deepEqual(itens, [
            { nivel: 1, item: 'B', pagina: '2' },
            { nivel: 1, item: 'A', pagina: '1' },
        ]);
    });

    it('entrada que não é lista dá resultado vazio, sem quebrar', () => {
        assert.deepEqual(normalizarItensSumario(undefined), { itens: [], avisos: [] });
        assert.deepEqual(normalizarItensSumario('x'), { itens: [], avisos: [] });
    });
});

describe('Sumário: validar o .json importado', () => {
    it('aceita o objeto do modelo', () => {
        const r = validarJsonSumario({
            tipo: 'sumario',
            versao: 1,
            itens: [{ nivel: 1, item: 'Parte I', pagina: '9' }],
        });
        assert.deepEqual(r.itens, [{ nivel: 1, item: 'Parte I', pagina: '9' }]);
        assert.deepEqual(r.avisos, []);
    });

    it('aceita uma lista solta de itens', () => {
        const r = validarJsonSumario([{ nivel: 1, item: 'Só um' }]);
        assert.equal(r.itens.length, 1);
    });

    it('aceita objeto sem "tipo" e sem "versao", se tiver itens', () => {
        assert.equal(validarJsonSumario({ itens: [{ nivel: 1, item: 'A' }] }).itens.length, 1);
    });

    it('recusa arquivo de outro tipo', () => {
        const r = validarJsonSumario({ tipo: 'molde', itens: [{ nivel: 1, item: 'A' }] });
        assert.match(r.erro, /não é um JSON de Sumário/);
    });

    it('recusa versão desconhecida', () => {
        const r = validarJsonSumario({ tipo: 'sumario', versao: 2, itens: [] });
        assert.match(r.erro, /Versão de arquivo de Sumário não suportada \(2\)/);
    });

    it('recusa o que não é objeto nem lista', () => {
        for (const v of [null, 'texto', 42, undefined]) {
            assert.match(validarJsonSumario(v).erro, /não é um JSON de Sumário válido/);
        }
    });

    it('recusa objeto sem a lista "itens"', () => {
        assert.match(validarJsonSumario({ tipo: 'sumario' }).erro, /lista "itens"/);
    });

    it('recusa lista grande demais', () => {
        const lista = Array.from({ length: MAX_ITENS_SUMARIO + 1 }, () => ({
            nivel: 1,
            item: 'x',
        }));
        assert.match(validarJsonSumario(lista).erro, /limite é 2000/);
    });

    it('recusa quando nenhum item presta', () => {
        const r = validarJsonSumario({ tipo: 'sumario', itens: [{ nivel: 1, item: '' }] });
        assert.match(r.erro, /nenhum item de sumário válido/);
    });

    it('devolve os avisos junto dos itens aproveitados', () => {
        const r = validarJsonSumario({
            tipo: 'sumario',
            itens: [
                { nivel: 1, item: 'Bom' },
                { nivel: 1, item: '' },
            ],
        });
        assert.equal(r.itens.length, 1);
        assert.equal(r.avisos.length, 1);
    });
});

describe('Sumário: campos gravados no elemento', () => {
    it('só o tipo Sumário guarda itensSumario', () => {
        const lista = [{ nivel: 1, item: 'A', pagina: '1' }];
        assert.deepEqual(camposDoSumario('Pórtico', lista), {});
        assert.deepEqual(camposDoSumario(TIPO_SUMARIO, lista), { itensSumario: lista });
    });

    it('lista vazia ou sem item válido não grava nada', () => {
        assert.deepEqual(camposDoSumario(TIPO_SUMARIO, []), {});
        assert.deepEqual(camposDoSumario(TIPO_SUMARIO, [{ nivel: 1, item: '' }]), {});
    });
});

describe('Sumário: modelo .json para a IA', () => {
    it('traz tipo, versão, instruções e itens de exemplo com os três campos', () => {
        const m = gerarModeloSumario();
        assert.equal(m.tipo, 'sumario');
        assert.equal(m.versao, 1);
        assert.ok(Array.isArray(m.instrucoes) && m.instrucoes.length >= 5);
        assert.ok(m.itens.length >= 3);
        for (const it of m.itens) {
            assert.deepEqual(Object.keys(it).sort(), ['item', 'nivel', 'pagina']);
        }
        assert.ok(new Set(m.itens.map((i) => i.nivel)).size >= 3);
    });

    it('o próprio modelo passa na validação de importação', () => {
        const r = validarJsonSumario(JSON.parse(modeloSumarioComoTexto()));
        assert.ok(!r.erro);
        assert.equal(r.itens.length, gerarModeloSumario().itens.length);
        assert.deepEqual(r.avisos, []);
    });

    it('as instruções explicam os três campos e não usam travessão', () => {
        const texto = gerarModeloSumario().instrucoes.join('\n');
        for (const campo of ['nivel', 'item', 'pagina']) assert.ok(texto.includes(campo), campo);
        assert.ok(!texto.includes('\u2014') && !texto.includes('\u2013'));
    });

    it('o nome do arquivo de modelo é fixo e em minúsculas', () => {
        assert.equal(NOME_ARQUIVO_MODELO_SUMARIO, 'modelo-sumario.json');
    });
});
