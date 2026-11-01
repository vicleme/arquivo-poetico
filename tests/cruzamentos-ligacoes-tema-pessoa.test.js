import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// T14, entrega 3: a matriz de Cruzamentos passa a respeitar os pares Tema × Pessoa
// desligados na análise e ganha o controle para os textos ainda não analisados.
const { db } = await import('../js/db.js');
const E = await import('../js/estatisticas.js');
const { renderCruzamentos } = await import('../js/estatisticas-tela-cruzamentos.js');
const { gravarLigacoes } = await import('../js/ligacoes-tema-pessoa.js');

const HTML = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const SECAO = HTML.match(/<section id="estatisticas-cruzamentos"[\s\S]*?<\/section>/)[0];

function acervo() {
    localStorage.clear();
    ['livros', 'partes', 'secoes', 'elementos', 'epocas', 'autores'].forEach((c) => (db[c] = []));
    db.assuntos = [];
    db.grupos = [
        { id: 1, nome: 'Amigas' },
        { id: 2, nome: 'Família' },
    ];
    db.temas = [
        { id: 1, nome: 'Amor' },
        { id: 2, nome: 'Mar' },
    ];
    db.pessoas = [
        { id: 1, nome: 'Ana', grupoIds: [1] },
        { id: 2, nome: 'Bia', grupoIds: [2] },
        { id: 3, nome: 'Caio', grupoIds: [] },
    ];
    const ps = (...ids) => ids.map((pessoaId) => ({ pessoaId, papeis: [] }));
    const tm = (...ids) => ids.map((temaId) => ({ temaId, papel: 'principal' }));
    const nomes = (ids) => ids.map((id) => db.temas.find((t) => t.id === id).nome).join(', ');
    const t = (id, temas, pessoas) => ({
        id,
        titulo: `T${id}`,
        ano: 2020,
        temas: tm(...temas),
        sinalizacoesTema: nomes(temas),
        pessoas: ps(...pessoas),
    });
    db.poemas = [
        t(1, [1, 2], [1, 2]), // Amor e Mar com Ana e Bia (ambíguo)
        t(2, [1], [1]), // Amor só com Ana (sem ambiguidade)
        t(3, [2], [2, 3]), // Mar com Bia e Caio (ambíguo)
    ];
    db.prosas = [];
}

const celula = (dados, pessoa, tema) =>
    dados.valores[dados.pessoas.indexOf(pessoa)][dados.temas.indexOf(tema)];
const TEMAS = ['Amor', 'Mar'];
const LIGACOES = { excluirNaoAnalisados: false };

describe('coocorrenciaTemasPessoas com as ligações', () => {
    beforeEach(acervo);

    it('sem o parâmetro `ligacoes`, nada muda (tudo ligado)', () => {
        gravarLigacoes(db.poemas[0], [{ temaId: 1, pessoaId: 2 }]);
        const r = E.coocorrenciaTemasPessoas({ temas: TEMAS, pessoas: ['Ana', 'Bia', 'Caio'] });
        assert.equal(celula(r, 'Bia', 'Amor'), 1);
    });

    it('texto não analisado conta o tema para todas as pessoas', () => {
        const r = E.coocorrenciaTemasPessoas({
            temas: TEMAS,
            pessoas: ['Ana', 'Bia', 'Caio'],
            ligacoes: LIGACOES,
        });
        assert.equal(celula(r, 'Ana', 'Amor'), 2);
        assert.equal(celula(r, 'Bia', 'Mar'), 2);
        assert.equal(celula(r, 'Caio', 'Mar'), 1);
        assert.equal(r.totalTextos, 3);
    });

    it('par desligado não conta; os outros pares do texto continuam', () => {
        // No texto 1, Amor não se liga a Bia e Mar não se liga a Ana.
        gravarLigacoes(db.poemas[0], [
            { temaId: 1, pessoaId: 2 },
            { temaId: 2, pessoaId: 1 },
        ]);
        const r = E.coocorrenciaTemasPessoas({
            temas: TEMAS,
            pessoas: ['Ana', 'Bia', 'Caio'],
            ligacoes: LIGACOES,
        });
        assert.equal(celula(r, 'Ana', 'Amor'), 2); // texto 1 e texto 2
        assert.equal(celula(r, 'Ana', 'Mar'), 0);
        assert.equal(celula(r, 'Bia', 'Amor'), 0);
        assert.equal(celula(r, 'Bia', 'Mar'), 2); // texto 1 e texto 3
        assert.equal(r.totalTextos, 3);
    });

    it('os totais de textos contam só textos com par que sobrou', () => {
        // Tudo desligado no texto 1: ele sai da conta inteira.
        gravarLigacoes(db.poemas[0], [
            { temaId: 1, pessoaId: 1 },
            { temaId: 1, pessoaId: 2 },
            { temaId: 2, pessoaId: 1 },
            { temaId: 2, pessoaId: 2 },
        ]);
        const r = E.coocorrenciaTemasPessoas({
            temas: TEMAS,
            pessoas: ['Ana', 'Bia', 'Caio'],
            ligacoes: LIGACOES,
        });
        assert.equal(r.totalTextos, 2);
        assert.equal(r.textosPorTema[r.temas.indexOf('Amor')], 1);
        assert.equal(r.textosPorLinha[r.pessoas.indexOf('Ana')], 1);
    });

    it('com `excluirNaoAnalisados`, só os textos ambíguos não analisados saem', () => {
        const r = E.coocorrenciaTemasPessoas({
            temas: TEMAS,
            pessoas: ['Ana', 'Bia', 'Caio'],
            ligacoes: { excluirNaoAnalisados: true },
        });
        // Sobra só o texto 2 (uma pessoa, sem ambiguidade).
        assert.equal(r.totalTextos, 1);
        assert.deepEqual(r.pessoas, ['Ana']);
        assert.equal(celula(r, 'Ana', 'Amor'), 1);
    });

    it('texto analisado volta a entrar mesmo com `excluirNaoAnalisados`', () => {
        gravarLigacoes(db.poemas[0], [{ temaId: 1, pessoaId: 2 }]);
        const r = E.coocorrenciaTemasPessoas({
            temas: TEMAS,
            pessoas: ['Ana', 'Bia', 'Caio'],
            ligacoes: { excluirNaoAnalisados: true },
        });
        assert.equal(r.totalTextos, 2); // textos 1 (analisado) e 2
        assert.equal(celula(r, 'Bia', 'Amor'), 0);
        assert.equal(celula(r, 'Bia', 'Mar'), 1);
    });

    it('texto que ganhou tema depois da análise conta o tema novo como ligado', () => {
        gravarLigacoes(db.poemas[1 - 1], [{ temaId: 1, pessoaId: 2 }]);
        db.poemas[0].temas.push({ temaId: 3, papel: 'principal' });
        db.temas.push({ id: 3, nome: 'Sol' });
        db.poemas[0].sinalizacoesTema += ', Sol';
        const r = E.coocorrenciaTemasPessoas({
            temas: ['Amor', 'Mar', 'Sol'],
            pessoas: ['Ana', 'Bia'],
            ligacoes: { excluirNaoAnalisados: true },
        });
        assert.equal(celula(r, 'Bia', 'Sol'), 1);
        assert.equal(celula(r, 'Bia', 'Amor'), 0);
    });
});

describe('coocorrenciaTemasGrupos com as ligações', () => {
    beforeEach(acervo);

    it('o tema só conta nos grupos das pessoas a quem ele se liga', () => {
        gravarLigacoes(db.poemas[0], [{ temaId: 1, pessoaId: 2 }]); // Amor não é da Bia
        const r = E.coocorrenciaTemasGrupos({
            temas: TEMAS,
            grupos: ['Amigas', 'Família'],
            ligacoes: LIGACOES,
        });
        const c = (g, t) => r.valores[r.grupos.indexOf(g)][r.temas.indexOf(t)];
        assert.equal(c('Amigas', 'Amor'), 2); // textos 1 e 2 (Ana)
        assert.equal(c('Família', 'Amor'), 0);
        assert.equal(c('Família', 'Mar'), 2); // textos 1 e 3 (Bia)
    });

    it('um grupo com duas pessoas conta o tema uma vez só por texto', () => {
        db.pessoas[2].grupoIds = [2]; // Caio entra na Família, junto com a Bia
        const r = E.coocorrenciaTemasGrupos({
            temas: TEMAS,
            grupos: ['Família'],
            ligacoes: LIGACOES,
        });
        // Texto 3 tem Bia e Caio (ambos da Família) e o tema Mar: conta 1.
        assert.equal(r.valores[0][r.temas.indexOf('Mar')], 2); // textos 1 e 3
    });

    it('`excluirNaoAnalisados` tira os textos ambíguos não analisados', () => {
        const r = E.coocorrenciaTemasGrupos({
            temas: TEMAS,
            grupos: ['Amigas', 'Família'],
            ligacoes: { excluirNaoAnalisados: true },
        });
        assert.equal(r.totalTextos, 1);
        assert.deepEqual(r.grupos, ['Amigas']);
    });

    it('sem `ligacoes`, o resultado é o de sempre', () => {
        gravarLigacoes(db.poemas[0], [{ temaId: 1, pessoaId: 2 }]);
        const r = E.coocorrenciaTemasGrupos({ temas: TEMAS, grupos: ['Amigas', 'Família'] });
        assert.equal(r.valores[r.grupos.indexOf('Família')][r.temas.indexOf('Amor')], 1);
    });
});

describe('a tela de Cruzamentos com as ligações', () => {
    beforeEach(() => {
        acervo();
        document.body.innerHTML = SECAO;
        globalThis.Chart = class {
            destroy() {}
            static getChart() {}
        };
    });
    const linha = (nome) =>
        [...document.querySelectorAll('#tabela-coocorrencia tbody tr')]
            .map((tr) => [...tr.children].map((c) => c.textContent.trim()))
            .find((l) => l[0] === nome);
    const colunas = () =>
        [...document.querySelectorAll('#tabela-coocorrencia thead th')].map((c) =>
            c.textContent.trim(),
        );
    const marcada = () =>
        document.querySelector('#est-coocorrencia-nao-analisados option[selected]')?.value;

    it('o par desligado não entra na matriz da tela', () => {
        gravarLigacoes(db.poemas[0], [{ temaId: 1, pessoaId: 2 }]);
        renderCruzamentos();
        const cab = colunas();
        const iAmor = cab.indexOf('Amor');
        assert.equal(linha('Bia')[iAmor], '—');
    });

    it('o controle nasce em "contar" e o preferido fica lembrado', () => {
        renderCruzamentos();
        assert.ok(document.getElementById('est-coocorrencia-nao-analisados'));
        assert.equal(marcada(), 'contar');
        E.definirNaoAnalisadosLigacoes('excluir');
        renderCruzamentos();
        assert.equal(marcada(), 'excluir');
        assert.deepEqual(
            [...document.querySelectorAll('#tabela-coocorrencia tbody tr')].map((tr) =>
                tr.children[0].textContent.trim(),
            ),
            ['Ana'],
        );
    });

    it('valor desconhecido guardado volta para "contar"', () => {
        localStorage.setItem('arquivoPoetico_est_naoAnalisadosLigacoes', 'qualquer');
        assert.equal(E.getNaoAnalisadosLigacoes(), 'contar');
    });

    it('o controle some no modo Personagens e nunca aparece sem textos ambíguos', () => {
        document.getElementById('est-coocorrencia-modo').value = 'personagens';
        renderCruzamentos();
        assert.equal(document.getElementById('est-coocorrencia-nao-analisados'), null);
        document.getElementById('est-coocorrencia-modo').value = 'pessoas';
        db.poemas = [db.poemas[1]]; // só o texto com uma pessoa
        renderCruzamentos();
        assert.equal(document.getElementById('est-coocorrencia-nao-analisados'), null);
    });

    it('salvar uma análise na tela de ligações redesenha a matriz', async () => {
        renderCruzamentos();
        assert.equal(linha('Bia')[colunas().indexOf('Amor')], '1');
        window.abrirPainelLigacoesTemaPessoa(true);
        // Fila: texto 1 (Ana e Bia). Desmarca Amor × Bia e salva.
        window.alternarLigacaoTemaPessoa(0, 1, false);
        window.salvarLigacoesTemaPessoa();
        assert.equal(linha('Bia')[colunas().indexOf('Amor')], '—');
    });
});
