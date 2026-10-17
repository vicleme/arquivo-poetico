// Fase 16, entrega 4: Localizar e Substituir nas sete categorias de etiqueta
// e nomes (não ids) nos `.json` exportados.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    garantirEtiqueta,
    etiquetasParaExportar,
    nomesDeEtiquetasDoTexto,
} from '../js/etiquetas.js';
import {
    CAMPOS_ETIQUETAS,
    categoriaDoCampoEtiqueta,
    acharEtiquetasParaSubstituir,
    substituirEtiquetasNoTexto,
    resumoDeEtiquetas,
} from '../js/localizar-etiquetas.js';

function montar() {
    const dbRef = { etiquetas: [], poemas: [], prosas: [] };
    const mel = garantirEtiqueta(dbRef, 'tom', 'Melancólico');
    const int = garantirEtiqueta(dbRef, 'tom', 'Íntimo');
    const melEstilo = garantirEtiqueta(dbRef, 'estilo', 'Melancólico');
    dbRef.poemas.push({ id: 1, sinalizacoesTom: [mel, int], sinalizacoesEstilo: [melEstilo] });
    dbRef.poemas.push({ id: 2, sinalizacoesTom: [int] });
    return { dbRef, mel, int, melEstilo };
}

describe('Localizar e Substituir: campos de etiqueta', () => {
    it('oferece as sete categorias, com rótulo e categoria', () => {
        assert.equal(CAMPOS_ETIQUETAS.length, 7);
        assert.ok(CAMPOS_ETIQUETAS.every((c) => c.label.startsWith('Etiquetas')));
        assert.equal(categoriaDoCampoEtiqueta('sinalizacoesTom'), 'tom');
        assert.equal(categoriaDoCampoEtiqueta('sinalizacoesTema'), null);
        assert.equal(categoriaDoCampoEtiqueta('titulo'), null);
    });

    it('acha ocorrências nos nomes, sem caixa', () => {
        const { dbRef } = montar();
        const r = acharEtiquetasParaSubstituir(
            dbRef,
            dbRef.poemas[0],
            'tom',
            'MELANC',
            'Triste',
            false,
        );
        assert.equal(r.length, 1);
        assert.equal(r[0].nome, 'Melancólico');
        assert.equal(r[0].novoNome, 'Tristeólico');
        assert.equal(
            acharEtiquetasParaSubstituir(dbRef, dbRef.poemas[0], 'tom', 'MELANC', 'x', true).length,
            0,
        );
    });

    it('resumo traz antes e depois, e null sem ocorrência', () => {
        const { dbRef } = montar();
        const r = resumoDeEtiquetas(dbRef, dbRef.poemas[0], 'tom', 'Íntimo', 'Reservado', true);
        assert.deepEqual(r, { count: 1, antes: ['Íntimo'], depois: ['Reservado'] });
        assert.equal(
            resumoDeEtiquetas(dbRef, dbRef.poemas[1], 'tom', 'Melancólico', 'x', true),
            null,
        );
    });

    it('substitui só naquele texto e cria a etiqueta nova no cadastro', () => {
        const { dbRef, int } = montar();
        const n = substituirEtiquetasNoTexto(
            dbRef,
            dbRef.poemas[0],
            'tom',
            'Íntimo',
            'Reservado',
            true,
        );
        assert.equal(n, 1);
        assert.deepEqual(nomesDeEtiquetasDoTexto(dbRef, dbRef.poemas[0], 'tom'), [
            'Melancólico',
            'Reservado',
        ]);
        // O outro texto e o cadastro antigo ficam como estavam.
        assert.deepEqual(nomesDeEtiquetasDoTexto(dbRef, dbRef.poemas[1], 'tom'), ['Íntimo']);
        assert.ok(dbRef.etiquetas.some((e) => e.id === int && e.nome === 'Íntimo'));
        assert.ok(dbRef.etiquetas.some((e) => e.nome === 'Reservado' && e.categoria === 'tom'));
    });

    it('reaproveita etiqueta existente e não duplica no texto', () => {
        const { dbRef } = montar();
        const antes = dbRef.etiquetas.length;
        substituirEtiquetasNoTexto(dbRef, dbRef.poemas[0], 'tom', 'Melancólico', 'Íntimo', true);
        assert.deepEqual(nomesDeEtiquetasDoTexto(dbRef, dbRef.poemas[0], 'tom'), ['Íntimo']);
        assert.equal(dbRef.etiquetas.length, antes);
    });

    it('nome que fica vazio remove a etiqueta do texto', () => {
        const { dbRef } = montar();
        substituirEtiquetasNoTexto(dbRef, dbRef.poemas[0], 'tom', 'Íntimo', '', true);
        assert.deepEqual(nomesDeEtiquetasDoTexto(dbRef, dbRef.poemas[0], 'tom'), ['Melancólico']);
    });

    it('não mexe em outra categoria com o mesmo nome', () => {
        const { dbRef } = montar();
        substituirEtiquetasNoTexto(dbRef, dbRef.poemas[0], 'tom', 'Melancólico', 'Sombrio', true);
        assert.deepEqual(nomesDeEtiquetasDoTexto(dbRef, dbRef.poemas[0], 'estilo'), [
            'Melancólico',
        ]);
    });

    it('sem ocorrência devolve 0 e não altera o campo', () => {
        const { dbRef } = montar();
        const antes = JSON.stringify(dbRef.poemas[1]);
        assert.equal(
            substituirEtiquetasNoTexto(dbRef, dbRef.poemas[1], 'tom', 'zzz', 'a', true),
            0,
        );
        assert.equal(JSON.stringify(dbRef.poemas[1]), antes);
    });
});

describe('JSON exportado: etiquetas por nome', () => {
    it('troca ids por nomes nos sete campos', () => {
        const { dbRef } = montar();
        const saida = etiquetasParaExportar(dbRef, dbRef.poemas[0]);
        assert.deepEqual(saida, {
            sinalizacoesTom: ['Melancólico', 'Íntimo'],
            sinalizacoesEstilo: ['Melancólico'],
        });
    });

    it('campo em texto antigo vira lista de nomes e id órfão some', () => {
        const dbRef = { etiquetas: [] };
        const saida = etiquetasParaExportar(dbRef, {
            sinalizacoesTom: 'Calmo, Seco',
            sinalizacoesEstilo: [999],
        });
        assert.deepEqual(saida, { sinalizacoesTom: ['Calmo', 'Seco'], sinalizacoesEstilo: [] });
    });
});
