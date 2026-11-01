import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Posição "no fim da fila" / "específica" / "sem posição" (o seletor do modal
// agora mora em `onde-aparece-ui.js`, testado em `onde-aparece-modal.test.js`) e
// linha "Localização" com a posição (Ver e exportações).

const { db } = await import('../js/db.js');
const { posicaoNoFimDaFila, sequenciaDoModal, textoLocalizacaoDoTexto } =
    await import('../js/utils.js');
const { renderVisualizacaoHtml } = await import('../js/visualizar.js');
const { itemParaMarkdown } = await import('../js/exportar-md.js');

function montar() {
    ['livros', 'partes', 'secoes', 'elementos', 'poemas', 'prosas'].forEach((c) => {
        db[c].length = 0;
    });
    db.livros.push({ id: 1, titulo: 'L', sequencia: 1 });
    db.partes.push({ id: 10, livroId: 1, titulo: 'P', sequencia: 1 });
}

describe('posicaoNoFimDaFila', () => {
    beforeEach(montar);

    it('texto novo: próxima livre', () => {
        db.poemas.push(
            { id: 1, paiTipo: 'parte', paiId: 10, sequencia: 1 },
            { id: 2, paiTipo: 'parte', paiId: 10, sequencia: 2 },
        );
        assert.equal(posicaoNoFimDaFila(db, 'parte', 10), 3);
    });

    it('texto já no lugar e já último: continua onde está', () => {
        const a = { id: 1, paiTipo: 'parte', paiId: 10, sequencia: 1 };
        const b = { id: 2, paiTipo: 'parte', paiId: 10, sequencia: 2 };
        db.poemas.push(a, b);
        assert.equal(posicaoNoFimDaFila(db, 'parte', 10, b), 2);
    });

    it('texto já no lugar, no meio: vai para o maior dos outros (sem deixar buraco)', () => {
        const a = { id: 1, paiTipo: 'parte', paiId: 10, sequencia: 1 };
        db.poemas.push(
            a,
            { id: 2, paiTipo: 'parte', paiId: 10, sequencia: 2 },
            { id: 3, paiTipo: 'parte', paiId: 10, sequencia: 3 },
        );
        assert.equal(posicaoNoFimDaFila(db, 'parte', 10, a), 3);
    });

    it('texto de outro lugar ou sem posição: próxima livre', () => {
        const x = { id: 9, paiTipo: 'secao', paiId: 99, sequencia: 4 };
        const y = { id: 8, paiTipo: 'parte', paiId: 10, sequencia: null };
        db.poemas.push(x, y, { id: 2, paiTipo: 'parte', paiId: 10, sequencia: 2 });
        assert.equal(posicaoNoFimDaFila(db, 'parte', 10, x), 3);
        assert.equal(posicaoNoFimDaFila(db, 'parte', 10, y), 3);
    });

    it('único texto do lugar, já na posição 1: continua 1', () => {
        const a = { id: 1, paiTipo: 'parte', paiId: 10, sequencia: 1 };
        db.poemas.push(a);
        assert.equal(posicaoNoFimDaFila(db, 'parte', 10, a), 1);
    });
});

describe('sequenciaDoModal', () => {
    beforeEach(montar);

    it('sem destino: sempre null', () => {
        assert.equal(sequenciaDoModal('especifica', '3', db, null, null), null);
        assert.equal(sequenciaDoModal('fim', '', db, '', ''), null);
    });
    it('"nenhuma" dá null mesmo com número digitado', () => {
        assert.equal(sequenciaDoModal('nenhuma', '5', db, 'parte', 10), null);
    });
    it('"especifica" usa o número (0 e vazio viram null)', () => {
        assert.equal(sequenciaDoModal('especifica', '5', db, 'parte', 10), 5);
        assert.equal(sequenciaDoModal('especifica', '0', db, 'parte', 10), null);
        assert.equal(sequenciaDoModal('especifica', '', db, 'parte', 10), null);
    });
    it('"fim" calcula na hora', () => {
        db.poemas.push({ id: 1, paiTipo: 'parte', paiId: 10, sequencia: 4 });
        assert.equal(sequenciaDoModal('fim', '', db, 'parte', 10), 5);
    });
    it('modo ausente (DOM antigo) se comporta como "especifica"', () => {
        assert.equal(sequenciaDoModal(undefined, '7', db, 'parte', 10), 7);
    });
});

describe('linha Localização com posição', () => {
    const base = { tipo: 'poema', id: 1, titulo: 'T', texto: 'x' };

    it('caminho com posição', () => {
        const item = { ...base, sequencia: 3, contexto: { livro: 'L', parte: 'P', secao: 'S' } };
        assert.equal(textoLocalizacaoDoTexto(item), 'L › P › S · posição 3');
    });
    it('caminho sem posição: "sem posição" explícito', () => {
        const item = {
            ...base,
            sequencia: null,
            contexto: { livro: 'L', parte: null, secao: 'S' },
        };
        assert.equal(textoLocalizacaoDoTexto(item), 'L › S · sem posição');
    });
    it('0 legado também é "sem posição"', () => {
        const item = { ...base, sequencia: 0, contexto: { livro: 'L' } };
        assert.equal(textoLocalizacaoDoTexto(item), 'L · sem posição');
    });
    it('avulso (sem caminho): null', () => {
        assert.equal(textoLocalizacaoDoTexto({ ...base, sequencia: 2, contexto: {} }), null);
        assert.equal(textoLocalizacaoDoTexto(base), null);
    });
    it('Ver e .md mostram a linha', () => {
        const item = { ...base, sequencia: 2, contexto: { livro: 'L', parte: 'P' } };
        assert.match(renderVisualizacaoHtml(item), /L › P · posição 2/);
        assert.match(itemParaMarkdown(item, 1), /\*\*Localização:\*\* L › P · posição 2/);
        const sem = { ...item, sequencia: null };
        assert.match(renderVisualizacaoHtml(sem), /L › P · sem posição/);
        assert.match(itemParaMarkdown(sem, 1), /L › P · sem posição/);
    });
});
