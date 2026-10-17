// Fase 16, entrega 2: os sete campos de etiqueta guardam ids. Confere a
// migração no import (backup antigo e novo), o save(), e os leitores que
// continuam vendo nomes (busca por prefixo, combinadas, agrupadas, badges).
import './helpers/localstorage-shim.js';
import './helpers/dom-shim.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const { db, importarDB, save } = await import('../js/db.js');
const {
    filtrarTextos,
    sinalizacoesCombinadas,
    sinalizacoesAgrupadas,
    extrairSinalizacoesUnicas,
    textoDeEtiquetas,
} = await import('../js/utils.js');
const { decorarCamposBusca } = await import('../js/render-listas.js');
const { badgesEtiquetasPorCategoria } = await import('../js/celulas-tabela.js');
const { nomesDeEtiquetasDoTexto } = await import('../js/etiquetas.js');
const DB_KEY = 'arquivoPoetico_v3';

function backupAntigo() {
    return {
        livros: [],
        poemas: [
            {
                id: 1,
                titulo: 'Um',
                texto: 'x',
                sinalizacoesTom: 'Lírico, Sombrio',
                sinalizacoesEstilo: 'Barroco',
                sinalizacoesOutros: 'Premiado',
            },
            { id: 2, titulo: 'Dois', texto: 'y', sinalizacoesTom: 'lirico' },
        ],
        prosas: [{ id: 3, titulo: 'Três', texto: 'z', sinalizacoesTom: 'Sombrio' }],
    };
}

describe('troca dos dados para ids', () => {
    beforeEach(async () => {
        localStorage.clear();
        await importarDB(backupAntigo());
    });

    it('importar backup antigo converte os sete campos e cria o cadastro', () => {
        assert.ok(Array.isArray(db.poemas[0].sinalizacoesTom));
        assert.deepEqual(nomesDeEtiquetasDoTexto(db, db.poemas[0], 'tom'), ['Lírico', 'Sombrio']);
        assert.deepEqual(nomesDeEtiquetasDoTexto(db, db.poemas[0], 'estilo'), ['Barroco']);
        assert.equal(db.poemas[1].sinalizacoesTom[0], db.poemas[0].sinalizacoesTom[0]);
        const nomes = db.etiquetas.map((e) => `${e.categoria}:${e.nome}`).sort();
        assert.deepEqual(nomes, ['estilo:Barroco', 'outros:Premiado', 'tom:Lírico', 'tom:Sombrio']);
    });

    it('importar de novo um backup já em ids mantém tudo igual', async () => {
        const novo = JSON.parse(JSON.stringify(db));
        await importarDB(novo);
        assert.deepEqual(nomesDeEtiquetasDoTexto(db, db.poemas[0], 'tom'), ['Lírico', 'Sombrio']);
        assert.equal(db.etiquetas.length, 4);
    });

    it('backup bem antigo (campo único `sinalizacoes`) também chega em ids', async () => {
        await importarDB({
            livros: [],
            poemas: [{ id: 1, titulo: 'A', texto: 'a', sinalizacoes: 'Concretista, Premiados' }],
            prosas: [],
        });
        assert.deepEqual(nomesDeEtiquetasDoTexto(db, db.poemas[0], 'estilo'), ['Concretista']);
    });

    it('save() não muda o que já está em ids e guarda o cadastro', () => {
        save();
        const lido = JSON.parse(localStorage.getItem(DB_KEY));
        assert.equal(lido.etiquetas.length, 4);
        assert.ok(lido.poemas[0].sinalizacoesTom.every((id) => typeof id === 'number'));
    });

    it('os leitores centrais seguem devolvendo nomes', () => {
        const poema = db.poemas[0];
        assert.equal(textoDeEtiquetas(poema.sinalizacoesTom), 'Lírico, Sombrio');
        assert.match(sinalizacoesCombinadas(poema), /Lírico/);
        const agrupadas = sinalizacoesAgrupadas(poema, db.temas);
        assert.deepEqual(
            agrupadas.find((b) => b.rotulo === 'Tom'),
            { rotulo: 'Tom', valor: 'Lírico, Sombrio' },
        );
        assert.deepEqual(extrairSinalizacoesUnicas(db.poemas, 'sinalizacoesTom'), [
            'Lírico',
            'Sombrio',
        ]);
    });

    it('a busca por prefixo acha pelo nome', () => {
        const lista = [...db.poemas, ...db.prosas].map((p) => decorarCamposBusca(p));
        assert.deepEqual(
            filtrarTextos(lista, 'tom:Sombrio').map((p) => p.id),
            [1, 3],
        );
        assert.deepEqual(
            filtrarTextos(lista, 'estilo:barroco').map((p) => p.id),
            [1],
        );
        assert.deepEqual(
            filtrarTextos(lista, 'etiqueta:premiado').map((p) => p.id),
            [1],
        );
    });

    it('os badges da tabela mostram os nomes', () => {
        const html = badgesEtiquetasPorCategoria(db.poemas[0]);
        const texto = Array.isArray(html) ? html.join('') : String(html);
        assert.match(texto, /Lírico/);
        assert.match(texto, /Barroco/);
    });
});
