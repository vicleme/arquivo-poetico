import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Assunto como atributo derivado de Poema/Prosa: prefixo de busca
// `assunto:`, busca geral, coluna e "Ver textos" do card. O Assunto não
// é gravado no texto — vem dos Temas (assuntosDoTexto, utils.js). O
// Assunto guarda `temaIds` (ids do cadastro `db.temas`), não nomes.
document.body.innerHTML = `
    <main>
        <input id="busca-poemas" />
        <input id="busca-prosas" />
        <div id="lista-assuntos"></div>
        <div id="temas-sem-assunto"></div>
    </main>
`;

const { db } = await import('../js/db.js');
const {
    getListaVisivelPoemas,
    getListaVisivelProsas,
    setFiltroPoemas,
    setFiltroProsas,
    verTextosAssunto,
} = await import('../js/render-listas.js');
const { DEFINICAO_COLUNAS } = await import('../js/colunas.js');

const titulos = (lista) => lista.map((t) => t.titulo).sort();

describe('busca por Assunto (DOM real via happy-dom)', () => {
    beforeEach(() => {
        db.livros = [];
        db.partes = [];
        db.secoes = [];
        db.itensColetanea = [];
        db.poemas = [
            { id: 1, titulo: 'Um', sinalizacoesTema: 'Machismo' },
            { id: 2, titulo: 'Dois', sinalizacoesTema: 'Amor' },
            { id: 3, titulo: 'Tres', sinalizacoesTema: 'Objetificação, Amor' },
        ];
        db.prosas = [{ id: 9, titulo: 'Prosa Um', sinalizacoesTema: 'Polarização' }];
        db.temas = [
            { id: 1, nome: 'Machismo' },
            { id: 2, nome: 'Amor' },
            { id: 3, nome: 'Objetificação' },
            { id: 4, nome: 'Polarização' },
        ];
        db.assuntos = [
            { id: 10, nome: 'Sociedade', notas: '', temaIds: [1, 4] },
            { id: 11, nome: 'Gênero', notas: '', temaIds: [1, 3] },
        ];
        setFiltroPoemas('');
        setFiltroProsas('');
    });

    it('assunto:"Nome" acha os textos cujos temas caem no Assunto', () => {
        setFiltroPoemas('assunto:"Gênero"');
        assert.deepEqual(titulos(getListaVisivelPoemas()), ['Tres', 'Um']);
        setFiltroPoemas('assunto:Sociedade');
        assert.deepEqual(titulos(getListaVisivelPoemas()), ['Um']);
    });

    it('funciona sem diferenciar acento e vale também para Prosas', () => {
        setFiltroProsas('assunto:sociedade');
        assert.deepEqual(titulos(getListaVisivelProsas()), ['Prosa Um']);
        setFiltroPoemas('assunto:genero');
        assert.deepEqual(titulos(getListaVisivelPoemas()), ['Tres', 'Um']);
    });

    it('assunto:* acha quem tem algum Assunto; -assunto:* quem não tem', () => {
        setFiltroPoemas('assunto:*');
        assert.deepEqual(titulos(getListaVisivelPoemas()), ['Tres', 'Um']);
        setFiltroPoemas('-assunto:*');
        assert.deepEqual(titulos(getListaVisivelPoemas()), ['Dois']);
    });

    it('a busca geral (sem prefixo) também encontra pelo nome do Assunto', () => {
        setFiltroPoemas('Sociedade');
        assert.deepEqual(titulos(getListaVisivelPoemas()), ['Um']);
    });

    it('reorganizar o Assunto reflete na busca sem tocar nos textos', () => {
        db.assuntos[0].temaIds.push(2);
        setFiltroPoemas('assunto:Sociedade');
        assert.deepEqual(titulos(getListaVisivelPoemas()), ['Dois', 'Tres', 'Um']);
        assert.equal(db.poemas[1].assuntos, undefined);
    });

    it('"Ver textos" do card abre a lista de Poemas filtrada pelo Assunto', () => {
        window.abrirAba = () => {};
        verTextosAssunto(11);
        assert.equal(document.getElementById('busca-poemas').value, 'assunto:"Gênero"');
        assert.deepEqual(titulos(getListaVisivelPoemas()), ['Tres', 'Um']);
    });

    it('"Ver textos" de Assunto que só tem prosa abre Prosas', () => {
        db.assuntos = [{ id: 12, nome: 'So Prosa', notas: '', temaIds: [4] }];
        verTextosAssunto(12);
        assert.equal(document.getElementById('busca-prosas').value, 'assunto:"So Prosa"');
        assert.deepEqual(titulos(getListaVisivelProsas()), ['Prosa Um']);
    });
});

describe('coluna Assunto', () => {
    it('existe nas duas tabelas, desligada por padrão, logo depois de Tema', () => {
        for (const tabela of ['poemas', 'prosas']) {
            const chaves = DEFINICAO_COLUNAS[tabela].map((c) => c.key);
            const i = chaves.indexOf('assuntos');
            assert.ok(i > 0, `${tabela} tem a coluna assuntos`);
            assert.equal(chaves[i - 1], 'temas');
            assert.equal(DEFINICAO_COLUNAS[tabela][i].default, false);
        }
    });
});
