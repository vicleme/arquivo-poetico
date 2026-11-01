import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Vitrine de leitura na aba Temas: logica pura (quais convites tem o tema e
// como juntar temas a um convite), select e selos no cartao, filtro
// "Só sem vitrine" com triagem, resumo e a barra em massa.
document.body.innerHTML = `
    <main>
        <input id="busca-temas" />
        <input type="checkbox" id="filtro-temas-sem-assunto" />
        <label id="rotulo-temas-sem-vitrine" class="hidden">
            <input type="checkbox" id="filtro-temas-sem-vitrine" />
        </label>
        <button id="atualizar-temas-sem-assunto" class="hidden">Atualizar lista</button>
        <select id="ordem-temas">
            <option value="alfabetica"></option>
            <option value="usados"></option>
        </select>
        <input type="checkbox" id="toggle-todos-temas" />
        <div id="barra-acoes-temas" class="hidden">
            <span id="contador-selecao-temas"></span>
            <div id="temas-massa-vitrine-bloco" class="hidden">
                <select id="temas-massa-vitrine"><option value=""></option></select>
            </div>
        </div>
        <span id="resumo-temas"></span>
        <div id="lista-temas"></div>
    </main>
`;

const { db } = await import('../js/db.js');
const { renderTemas, atualizarListaSemAssunto, filtrarTemasSemAssunto, definirBuscaTemas } =
    await import('../js/render-listas.js');
const ui = await import('../js/temas-massa-ui.js');
const { selecaoTemas, limparSelecaoTemas } = await import('../js/temas-massa.js');
const { listarTemasUniversais, universaisDoTema, adicionarTemasAoUniversal } =
    await import('../js/temas-universais.js');

const $ = (id) => document.getElementById(id);
const nomes = () => [...$('lista-temas').querySelectorAll('h4')].map((h) => h.textContent);
const cartao = (nome) =>
    [...$('lista-temas').children].find((c) => c.querySelector('h4')?.textContent === nome);
const marcados = () =>
    [...$('lista-temas').querySelectorAll('[data-atribuido="true"] h4')].map((h) => h.textContent);
const opcoes = (select) => [...select.options].map((o) => o.textContent);
const selectVitrine = (nome) =>
    cartao(nome)?.querySelector('select[aria-label^="Adicionar o tema"]');
const clicarDesfazer = () => {
    const botoes = [...document.body.querySelectorAll('button')].filter(
        (b) => b.textContent === 'Desfazer',
    );
    botoes.at(-1).click();
};

function preparar() {
    db.poemas = [];
    db.prosas = [];
    db.temas = [
        { id: 1, nome: 'Amor' },
        { id: 2, nome: 'Brasil' },
        { id: 3, nome: 'Cidade' },
        { id: 4, nome: 'Desistência' },
    ];
    db.assuntos = [
        { id: 10, nome: 'Afetos', notas: '', temaIds: [1] },
        { id: 11, nome: 'Sociedade', notas: '', temaIds: [] },
    ];
    db.temasUniversais = [
        { id: 'u1', nome: 'Amor e desejo', temaIds: [1] },
        { id: 'u2', nome: 'Quando o amor acaba', temaIds: [1, 4] },
    ];
    for (const id of ['busca-temas', 'ordem-temas'])
        $(id).value = id === 'ordem-temas' ? 'alfabetica' : '';
    $('filtro-temas-sem-assunto').checked = false;
    $('filtro-temas-sem-vitrine').checked = false;
    limparSelecaoTemas();
    document.body.querySelectorAll('div[style*="box-shadow"]').forEach((t) => t.remove());
    renderTemas(); // desligado: zera os retratos da triagem
}

describe('lógica: convites de um tema', () => {
    beforeEach(preparar);

    it('universaisDoTema devolve os convites que reúnem o tema, na ordem da tela', () => {
        assert.deepEqual(
            universaisDoTema(db, 1).map((u) => u.nome),
            ['Amor e desejo', 'Quando o amor acaba'],
        );
        assert.deepEqual(universaisDoTema(db, 2), []);
        assert.deepEqual(
            universaisDoTema(db, '4').map((u) => u.id),
            ['u2'],
        );
    });

    it('listarTemasUniversais não cria o array no db', () => {
        delete db.temasUniversais;
        assert.deepEqual(listarTemasUniversais(db), []);
        assert.equal('temasUniversais' in db, false);
        assert.deepEqual(universaisDoTema(db, 1), []);
    });

    it('adicionarTemasAoUniversal junta sem repetir e conta os que já estavam', () => {
        const r = adicionarTemasAoUniversal(db, 'u2', [1, 2, '3']);
        assert.equal(r.ok, true);
        assert.equal(r.adicionados, 2);
        assert.equal(r.jaTinham, 1);
        assert.deepEqual(db.temasUniversais[1].temaIds, [1, 4, 2, 3]);
    });

    it('ignora temas que não existem e recusa lista sem tema existente', () => {
        assert.deepEqual(adicionarTemasAoUniversal(db, 'u1', [99]), { ok: false, motivo: 'vazio' });
        assert.deepEqual(adicionarTemasAoUniversal(db, 'nao-existe', [2]), {
            ok: false,
            motivo: 'inexistente',
        });
        const r = adicionarTemasAoUniversal(db, 'u1', [2, 99]);
        assert.equal(r.adicionados, 1);
        assert.deepEqual(db.temasUniversais[0].temaIds, [1, 2]);
    });

    it('quando todos já estavam, nada muda e adicionados é 0', () => {
        const r = adicionarTemasAoUniversal(db, 'u2', [1, 4]);
        assert.equal(r.adicionados, 0);
        assert.equal(r.jaTinham, 2);
        assert.deepEqual(db.temasUniversais[1].temaIds, [1, 4]);
    });

    it('desfazer devolve a lista de temas do convite ao que era', () => {
        const r = adicionarTemasAoUniversal(db, 'u1', [2, 3]);
        assert.deepEqual(db.temasUniversais[0].temaIds, [1, 2, 3]);
        r.desfazer();
        assert.deepEqual(db.temasUniversais[0].temaIds, [1]);
    });
});

describe('cartão do tema', () => {
    beforeEach(preparar);

    it('o select de assunto passa a dizer "Adicionar ao assunto…" ou "Atribuir a assunto…"', () => {
        const comAssunto = cartao('Amor').querySelector('select[aria-label*="a um assunto"]');
        const semAssunto = cartao('Brasil').querySelector('select[aria-label*="a um assunto"]');
        assert.equal(opcoes(comAssunto)[0], 'Adicionar ao assunto…');
        assert.equal(opcoes(semAssunto)[0], 'Atribuir a assunto…');
    });

    it('mostra um selo por convite e o select só com os convites que faltam', () => {
        const amor = cartao('Amor');
        assert.match(amor.textContent, /◇ Amor e desejo/);
        assert.match(amor.textContent, /◇ Quando o amor acaba/);
        assert.equal(selectVitrine('Amor'), null); // já está nos dois convites
        const desistencia = selectVitrine('Desistência');
        assert.deepEqual(opcoes(desistencia), ['Adicionar à vitrine…', 'Amor e desejo']);
        const brasil = selectVitrine('Brasil');
        assert.deepEqual(opcoes(brasil), [
            'Adicionar à vitrine…',
            'Amor e desejo',
            'Quando o amor acaba',
        ]);
    });

    it('sem convites, não há select, selo, filtro nem "sem vitrine" no resumo', () => {
        db.temasUniversais = [];
        renderTemas();
        assert.equal(selectVitrine('Brasil'), null);
        assert.doesNotMatch($('lista-temas').textContent, /◇/);
        assert.ok($('rotulo-temas-sem-vitrine').classList.contains('hidden'));
        assert.doesNotMatch($('resumo-temas').textContent, /sem vitrine/);
        assert.ok($('temas-massa-vitrine-bloco').classList.contains('hidden'));
    });

    it('com convites, o filtro aparece e o resumo conta os temas sem vitrine', () => {
        assert.ok(!$('rotulo-temas-sem-vitrine').classList.contains('hidden'));
        assert.match($('resumo-temas').textContent, /2 sem vitrine/); // Brasil e Cidade
    });

    it('adicionarTemaAVitrineDoCard grava, atualiza o cartão e o Desfazer volta', () => {
        const sel = selectVitrine('Brasil');
        sel.value = 'u2';
        ui.adicionarTemaAVitrineDoCard(sel);
        assert.deepEqual(db.temasUniversais[1].temaIds, [1, 4, 2]);
        assert.match(cartao('Brasil').textContent, /◇ Quando o amor acaba/);
        assert.deepEqual(opcoes(selectVitrine('Brasil')), [
            'Adicionar à vitrine…',
            'Amor e desejo',
        ]);
        clicarDesfazer();
        assert.deepEqual(db.temasUniversais[1].temaIds, [1, 4]);
        assert.doesNotMatch(cartao('Brasil').textContent, /◇/);
    });
});

describe('triagem de "Só sem vitrine"', () => {
    beforeEach(preparar);
    const ligar = () => {
        $('filtro-temas-sem-vitrine').checked = true;
        renderTemas();
    };

    it('ao ligar, mostra só os temas fora de todos os convites e o botão Atualizar aparece', () => {
        ligar();
        assert.deepEqual(nomes(), ['Brasil', 'Cidade']);
        assert.ok(!$('atualizar-temas-sem-assunto').classList.contains('hidden'));
    });

    it('tema que entra num convite continua na lista, marcado "✓ na vitrine"', () => {
        ligar();
        db.temasUniversais[0].temaIds.push(2); // Brasil → Amor e desejo
        renderTemas();
        assert.deepEqual(nomes(), ['Brasil', 'Cidade']);
        assert.deepEqual(marcados(), ['Brasil']);
        assert.match(cartao('Brasil').textContent, /✓ na vitrine/);
        assert.match($('resumo-temas').textContent, /1 atribuído nesta triagem/);
        assert.equal(
            $('atualizar-temas-sem-assunto').textContent,
            'Atualizar lista (1 já atribuído sai)',
        );
    });

    it('um tema pode entrar em dois convites em sequência sem sumir', () => {
        ligar();
        db.temasUniversais[0].temaIds.push(2);
        renderTemas();
        db.temasUniversais[1].temaIds.push(2);
        renderTemas();
        assert.ok(nomes().includes('Brasil'));
    });

    it('"Atualizar lista" tira os que já entraram', () => {
        ligar();
        db.temasUniversais[0].temaIds.push(2);
        renderTemas();
        atualizarListaSemAssunto();
        assert.deepEqual(nomes(), ['Cidade']);
        assert.deepEqual(marcados(), []);
    });

    it('combinado com "Só sem assunto": só o que está sem os dois, e Atualizar refaz os dois', () => {
        $('filtro-temas-sem-assunto').checked = true;
        ligar();
        assert.deepEqual(nomes(), ['Brasil', 'Cidade']);
        db.assuntos[1].temaIds.push(2); // Brasil ganha assunto
        db.temasUniversais[0].temaIds.push(3); // Cidade ganha convite
        renderTemas();
        assert.deepEqual(marcados(), ['Brasil', 'Cidade']);
        assert.match(cartao('Brasil').textContent, /✓ atribuído/);
        assert.match(cartao('Cidade').textContent, /✓ na vitrine/);
        atualizarListaSemAssunto();
        assert.deepEqual(nomes(), []);
    });

    it('lista vazia diz que todos já estão na vitrine', () => {
        db.temasUniversais[0].temaIds.push(2, 3);
        ligar();
        assert.match($('lista-temas').textContent, /Todos os temas já estão na vitrine/);
    });

    it('filtrarTemasSemAssunto e definirBuscaTemas desligam "Só sem vitrine"', () => {
        ligar();
        filtrarTemasSemAssunto();
        assert.equal($('filtro-temas-sem-vitrine').checked, false);
        ligar();
        definirBuscaTemas('Amor');
        assert.equal($('filtro-temas-sem-vitrine').checked, false);
    });

    it('se os convites somem, o filtro marcado deixa de valer', () => {
        ligar();
        db.temasUniversais = [];
        renderTemas();
        assert.deepEqual(nomes(), ['Amor', 'Brasil', 'Cidade', 'Desistência']);
        assert.ok($('atualizar-temas-sem-assunto').classList.contains('hidden'));
    });
});

describe('barra em massa: Adicionar à vitrine', () => {
    beforeEach(preparar);

    it('o select da barra lista os convites de agora', () => {
        assert.deepEqual(opcoes($('temas-massa-vitrine')), [
            'Escolha um convite…',
            'Amor e desejo',
            'Quando o amor acaba',
        ]);
        assert.ok(!$('temas-massa-vitrine-bloco').classList.contains('hidden'));
    });

    it('sem escolher o convite, avisa e não grava', () => {
        selecaoTemas.add('2');
        ui.aoAdicionarTemasAVitrine();
        assert.deepEqual(db.temasUniversais[0].temaIds, [1]);
    });

    it('junta os selecionados ao convite, conta os que já estavam e o Desfazer volta', () => {
        selecaoTemas.add('1');
        selecaoTemas.add('2');
        selecaoTemas.add('3');
        renderTemas();
        $('temas-massa-vitrine').value = 'u1';
        ui.aoAdicionarTemasAVitrine();
        assert.deepEqual(db.temasUniversais[0].temaIds, [1, 2, 3]);
        assert.match(cartao('Brasil').textContent, /◇ Amor e desejo/);
        clicarDesfazer();
        assert.deepEqual(db.temasUniversais[0].temaIds, [1]);
    });

    it('nenhum selecionado: não grava', () => {
        $('temas-massa-vitrine').value = 'u1';
        ui.aoAdicionarTemasAVitrine();
        assert.deepEqual(db.temasUniversais[0].temaIds, [1]);
    });

    it('a escolha do select sobrevive ao novo render, se o convite ainda existe', () => {
        $('temas-massa-vitrine').value = 'u2';
        renderTemas();
        assert.equal($('temas-massa-vitrine').value, 'u2');
    });
});
