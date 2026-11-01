import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// T14, entrega 2: tela de análise Tema × Pessoa na aba Cruzamentos.
const { db } = await import('../js/db.js');
const T = await import('../js/ligacoes-tema-pessoa-tela.js');
const { renderCruzamentos } = await import('../js/estatisticas-tela-cruzamentos.js');

const HTML = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const SECAO = HTML.match(/<section id="estatisticas-cruzamentos"[\s\S]*?<\/section>/)[0];

function acervo() {
    localStorage.clear();
    ['livros', 'partes', 'secoes', 'elementos', 'epocas', 'autores', 'grupos'].forEach(
        (c) => (db[c] = []),
    );
    db.assuntos = [];
    db.temas = [
        { id: 1, nome: 'Amor', notas: '' },
        { id: 2, nome: 'Mar', notas: '' },
    ];
    db.pessoas = [
        { id: 1, nome: 'Ana', grupoIds: [] },
        { id: 2, nome: 'Bia', grupoIds: [] },
        { id: 3, nome: 'Caio', grupoIds: [] },
    ];
    const ps = (...ids) => ids.map((pessoaId) => ({ pessoaId, papeis: [] }));
    const tm = (...ids) => ids.map((temaId) => ({ temaId, papel: 'principal' }));
    const t = (id, temas, pessoas) => ({
        id,
        titulo: `T${id}`,
        ano: 2020,
        temas: tm(...temas),
        sinalizacoesTema: temas.map((x) => (x === 1 ? 'Amor' : 'Mar')).join(', '),
        pessoas: ps(...pessoas),
    });
    // 1 e 3: ambiguidade (2+ pessoas e tema). 2: uma pessoa só. 4 (prosa): ambiguidade.
    db.poemas = [t(1, [1, 2], [1, 2]), t(2, [1], [1]), t(3, [1], [1, 2, 3])];
    db.prosas = [t(4, [2], [2, 3])];
}

const painel = () => document.getElementById('painel-ligacoes-tema-pessoa');
const caixas = () => [...painel().querySelectorAll('input[type=checkbox][aria-label]')];

describe('fila e dados da tela', () => {
    beforeEach(acervo);

    it('a fila traz só textos com ambiguidade, poemas antes de prosas', () => {
        const fila = T.filaDaTelaLigacoes(db);
        assert.deepEqual(
            fila.map((f) => [f.tipo, f.texto.id, f.estado]),
            [
                ['poema', 1, 'nao-analisado'],
                ['poema', 3, 'nao-analisado'],
                ['prosa', 4, 'nao-analisado'],
            ],
        );
    });

    it('texto já analisado sai da fila, a não ser que se peça para incluir', () => {
        db.poemas[0].ligacoesTemaPessoa = { temaIds: [1, 2], pessoaIds: [1, 2], desligados: [] };
        assert.equal(T.filaDaTelaLigacoes(db).length, 2);
        const todos = T.filaDaTelaLigacoes(db, true);
        assert.equal(todos.length, 3);
        assert.equal(todos[0].estado, 'analisado');
    });

    it('texto que ganhou pessoa depois da análise volta como "revisar"', () => {
        db.poemas[0].ligacoesTemaPessoa = { temaIds: [1, 2], pessoaIds: [1], desligados: [] };
        assert.equal(T.filaDaTelaLigacoes(db)[0].estado, 'revisar');
    });

    it('os dados trazem nomes de temas e pessoas e a posição limitada à fila', () => {
        const d = T.dadosTelaLigacoes(db, { posicao: 99 });
        assert.equal(d.posicao, 2);
        assert.deepEqual(
            d.temas.map((x) => x.nome),
            ['Mar'],
        );
        assert.deepEqual(
            d.pessoas.map((x) => x.nome),
            ['Bia', 'Caio'],
        );
        assert.equal(d.tipo, 'prosa');
    });

    it('sem rascunho, as marcas vêm do que está gravado', () => {
        db.poemas[0].ligacoesTemaPessoa = {
            temaIds: [1, 2],
            pessoaIds: [1, 2],
            desligados: [{ temaId: 2, pessoaId: 1 }],
        };
        const d = T.dadosTelaLigacoes(db, { posicao: 0, incluirAnalisados: true });
        assert.deepEqual([...d.desligados], ['2|1']);
    });

    it('sem nada a analisar a visão vem vazia', () => {
        db.poemas = [db.poemas[1]];
        db.prosas = [];
        assert.equal(T.dadosTelaLigacoes(db).vazio, true);
    });
});

describe('HTML do cartão', () => {
    beforeEach(acervo);

    it('fechado mostra só o progresso e o botão de abrir', () => {
        const html = T.htmlPainelLigacoes(db, { aberto: false });
        assert.match(html, /0 de 3 textos/);
        assert.match(html, /Analisar textos/);
        assert.doesNotMatch(html, /type="checkbox"/);
    });

    it('aberto mostra o texto, a grade toda marcada e os botões', () => {
        const html = T.htmlPainelLigacoes(db, { aberto: true, posicao: 0 });
        assert.match(html, /Texto 1 de 3 na fila/);
        assert.match(html, />T1</);
        assert.equal((html.match(/aria-label="[^"]*×[^"]*"/g) || []).length, 4);
        assert.equal((html.match(/ checked aria-label/g) || []).length, 4);
        assert.match(html, /Salvar e próximo/);
        assert.match(html, /disabled/); // "Anterior" no primeiro texto
    });

    it('escapa nomes com HTML', () => {
        db.pessoas[0].nome = '<b>Ana</b>';
        const html = T.htmlPainelLigacoes(db, { aberto: true, posicao: 0 });
        assert.doesNotMatch(html, /<b>Ana<\/b>/);
        assert.match(html, /&lt;b&gt;Ana/);
    });

    it('sem ambiguidade em nenhum texto explica e não oferece análise', () => {
        db.poemas = [db.poemas[1]];
        db.prosas = [];
        const html = T.htmlPainelLigacoes(db, { aberto: true });
        assert.match(html, /nada a analisar/);
        assert.doesNotMatch(html, /Analisar textos/);
    });
});

describe('interação na aba Cruzamentos', () => {
    beforeEach(() => {
        acervo();
        T.reiniciarTelaLigacoes();
        document.body.innerHTML = SECAO;
        globalThis.Chart = class {
            destroy() {}
            static getChart() {}
        };
        renderCruzamentos();
    });

    it('o cartão existe na seção e começa fechado', () => {
        assert.ok(painel());
        assert.equal(caixas().length, 0);
        assert.match(painel().textContent, /Analisar textos/);
    });

    it('abrir mostra a grade do primeiro texto; desmarcar e salvar grava só o par desligado', () => {
        window.abrirPainelLigacoesTemaPessoa(true);
        assert.equal(caixas().length, 4); // T1: Amor e Mar × Ana e Bia
        // Desmarca "Mar × Ana" (linha 1, coluna 0).
        window.alternarLigacaoTemaPessoa(1, 0, false);
        window.salvarLigacoesTemaPessoa();
        assert.deepEqual(db.poemas[0].ligacoesTemaPessoa, {
            temaIds: [1, 2],
            pessoaIds: [1, 2],
            desligados: [{ temaId: 2, pessoaId: 1 }],
        });
        // O texto saiu da fila e a tela já mostra o seguinte (T3).
        assert.match(painel().textContent, /T3/);
        assert.match(painel().textContent, /Texto 1 de 2 na fila/);
    });

    it('salvar sem desmarcar nada grava "analisado, nada desligado"', () => {
        window.abrirPainelLigacoesTemaPessoa(true);
        window.salvarLigacoesTemaPessoa();
        assert.deepEqual(db.poemas[0].ligacoesTemaPessoa.desligados, []);
        assert.equal(db.poemas[1].ligacoesTemaPessoa, undefined);
    });

    it('desmarcar e navegar sem salvar não grava nada', () => {
        window.abrirPainelLigacoesTemaPessoa(true);
        window.alternarLigacaoTemaPessoa(0, 0, false);
        window.navegarAnaliseLigacoes(1);
        assert.equal(db.poemas[0].ligacoesTemaPessoa, undefined);
        assert.match(painel().textContent, /Texto 2 de 3 na fila/);
        // Voltar descarta o rascunho: a grade do T1 volta toda marcada.
        window.navegarAnaliseLigacoes(-1);
        assert.equal(
            caixas().every((c) => c.checked),
            true,
        );
    });

    it('"Marcar tudo" limpa o rascunho', () => {
        window.abrirPainelLigacoesTemaPessoa(true);
        window.alternarLigacaoTemaPessoa(0, 1, false);
        window.marcarTudoLigacoesTemaPessoa();
        assert.equal(
            caixas().every((c) => c.checked),
            true,
        );
    });

    it('analisar o último da fila mostra a fila vazia', () => {
        window.abrirPainelLigacoesTemaPessoa(true);
        window.salvarLigacoesTemaPessoa();
        window.salvarLigacoesTemaPessoa();
        window.salvarLigacoesTemaPessoa();
        assert.match(painel().textContent, /Fila vazia/);
        assert.match(painel().textContent, /3 de 3 textos/);
    });

    it('com "incluir já analisados", o texto salvo continua na fila e avança um', () => {
        window.abrirPainelLigacoesTemaPessoa(true);
        window.salvarLigacoesTemaPessoa();
        window.definirIncluirAnalisadosLigacoes(true);
        assert.match(painel().textContent, /Texto 1 de 3 na fila/);
        assert.match(painel().textContent, /Já analisado/);
        window.alternarLigacaoTemaPessoa(0, 1, false);
        window.salvarLigacoesTemaPessoa();
        assert.deepEqual(db.poemas[0].ligacoesTemaPessoa.desligados, [{ temaId: 1, pessoaId: 2 }]);
        assert.match(painel().textContent, /Texto 2 de 3 na fila/);
    });

    it('"Voltar a não analisado" apaga a análise do texto', () => {
        window.abrirPainelLigacoesTemaPessoa(true);
        window.salvarLigacoesTemaPessoa();
        window.definirIncluirAnalisadosLigacoes(true);
        window.voltarLigacoesNaoAnalisado();
        assert.equal(db.poemas[0].ligacoesTemaPessoa, undefined);
        assert.match(painel().textContent, /Não analisado/);
    });

    it('salvar uma análise muda a matriz de Cruzamentos (entrega 3)', () => {
        const antes = document.getElementById('tabela-coocorrencia').innerHTML;
        window.abrirPainelLigacoesTemaPessoa(true);
        window.alternarLigacaoTemaPessoa(1, 0, false);
        window.salvarLigacoesTemaPessoa();
        renderCruzamentos();
        const depois = document.getElementById('tabela-coocorrencia').innerHTML;
        assert.notEqual(depois, antes);
        assert.match(depois, /Ana × Mar: 0 texto\(s\)/);
    });
});

describe('busca e filtros da fila de análise', () => {
    beforeEach(() => {
        acervo();
        document.body.innerHTML = SECAO;
        globalThis.Chart = class {
            destroy() {}
            static getChart() {}
        };
        T.reiniciarTelaLigacoes();
        renderCruzamentos();
        window.abrirPainelLigacoesTemaPessoa(true);
    });
    const titulo = () => painel().querySelector('button[onclick="abrirTextoDaAnaliseLigacoes()"]');
    const marcaProgresso = () => painel().textContent.match(/Texto \d+ de \d+ na fila[^·]*/)?.[0];

    it('filaDaTelaLigacoes recorta por título, tema e pessoa (sem mudar o progresso)', () => {
        assert.equal(T.filaDaTelaLigacoes(db, false, { busca: 't3' }).length, 1);
        assert.equal(T.filaDaTelaLigacoes(db, false, { busca: 'T' }).length, 3);
        assert.equal(T.filaDaTelaLigacoes(db, false, { temaFiltro: 2 }).length, 2); // T1 e T4
        assert.equal(T.filaDaTelaLigacoes(db, false, { pessoaFiltro: 3 }).length, 2); // T3 e T4
        assert.equal(T.filaDaTelaLigacoes(db, false, { temaFiltro: 2, pessoaFiltro: 3 }).length, 1);
        assert.equal(T.dadosTelaLigacoes(db, { busca: 't3' }).resumo.total, 3);
    });

    it('a busca ignora caixa e acento', () => {
        db.poemas[0].titulo = 'Canção do Mar';
        assert.equal(T.filaDaTelaLigacoes(db, false, { busca: 'cancao' }).length, 1);
        assert.equal(T.filaDaTelaLigacoes(db, false, { busca: 'MAR' }).length, 1);
    });

    it('as listas dos filtros só trazem Temas e Pessoas que estão na fila', () => {
        db.poemas[1].ligacoesTemaPessoa = undefined;
        const o = T.opcoesDeFiltroLigacoes(db);
        assert.deepEqual(
            o.temas.map((t) => t.nome),
            ['Amor', 'Mar'],
        );
        assert.deepEqual(
            o.pessoas.map((p) => p.nome),
            ['Ana', 'Bia', 'Caio'],
        );
    });

    it('a barra aparece e digitar na busca mostra só o texto achado', () => {
        assert.ok(document.getElementById('busca-ligacoes-tema-pessoa'));
        assert.ok(document.getElementById('filtro-tema-ligacoes'));
        assert.ok(document.getElementById('filtro-pessoa-ligacoes'));
        window.definirBuscaLigacoes('t4');
        assert.equal(titulo().textContent.trim(), 'T4');
        assert.match(marcaProgresso(), /Texto 1 de 1 na fila \(filtrada\)/);
        assert.equal(document.getElementById('busca-ligacoes-tema-pessoa').value, 't4');
    });

    it('filtrar por tema e por pessoa juntos', () => {
        window.definirFiltroTemaLigacoes('2');
        window.definirFiltroPessoaLigacoes('3');
        assert.equal(titulo().textContent.trim(), 'T4');
        assert.equal(document.querySelector('#filtro-tema-ligacoes option[selected]')?.value, '2');
    });

    it('sem resultado mostra o aviso e "Limpar filtros" devolve a fila', () => {
        window.definirBuscaLigacoes('nada disso');
        assert.match(painel().textContent, /Nenhum texto da fila bate/);
        assert.ok(document.getElementById('busca-ligacoes-tema-pessoa'));
        window.limparFiltrosLigacoes();
        assert.match(marcaProgresso(), /Texto 1 de 3 na fila/);
        assert.equal(document.getElementById('busca-ligacoes-tema-pessoa').value, '');
    });

    it('salvar com filtro grava o texto certo e segue na fila filtrada', () => {
        window.definirFiltroPessoaLigacoes('3'); // T3 e T4
        window.salvarLigacoesTemaPessoa();
        assert.ok(db.poemas[2].ligacoesTemaPessoa); // T3
        assert.equal(db.poemas[0].ligacoesTemaPessoa, undefined);
        assert.equal(titulo().textContent.trim(), 'T4');
    });

    it('mudar o filtro descarta o rascunho do texto que saiu da tela', () => {
        window.alternarLigacaoTemaPessoa(0, 0, false);
        window.definirBuscaLigacoes('t3');
        window.limparFiltrosLigacoes();
        assert.equal(
            [...painel().querySelectorAll('input[type=checkbox][aria-label]')].every(
                (c) => c.checked,
            ),
            true,
        );
    });

    it('filtro que aponta para algo que saiu da fila deixa de valer', () => {
        const d = T.dadosTelaLigacoes(db, { temaFiltro: '99', pessoaFiltro: '99' });
        assert.equal(d.filtrando, false);
        assert.equal(d.fila.length, 3);
    });
});
