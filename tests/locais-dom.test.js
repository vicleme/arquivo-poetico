import './helpers/dom-real.js';

import fs from 'node:fs';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Aba Locais (renderLocais em ui-locais.js) e modal de Local
// (modais/modal-local.html + initFormLocal).
const modal = fs.readFileSync(new URL('../modais/modal-local.html', import.meta.url), 'utf8');
const modalMesclar = fs.readFileSync(
    new URL('../modais/modal-mesclar.html', import.meta.url),
    'utf8',
);
document.body.innerHTML = `
    <main>
        <input id="busca-locais" />
        <select id="filtro-locais">
            <option value="todos"></option>
            <option value="sem-tipo"></option>
            <option value="sem-pai"></option>
        </select>
        <select id="filtro-uso-locais">
            <option value="todos"></option>
            <option value="citados"></option>
            <option value="escritos"></option>
        </select>
        <span id="resumo-locais"></span>
        <div id="lista-locais"></div>
    </main>
    ${modal}
    ${modalMesclar}
`;

const { db } = await import('../js/db.js');
const UI = await import('../js/ui-locais.js');
const { abrirModalMesclar } = await import('../js/forms.js');
const { sincronizarLocais } = await import('../js/locais.js');

const $ = (id) => document.getElementById(id);
const nomes = () =>
    [...$('lista-locais').querySelectorAll('[data-local-id] h4')].map((h) => h.textContent);
const linha = (id) => $('lista-locais').querySelector(`[data-local-id="${id}"]`);
const referencias = () =>
    [...$('lista-locais').querySelectorAll('[data-local-ref]')].map((e) => e.dataset.localRef);
const enviar = () => $('form-local').dispatchEvent(new Event('submit', { cancelable: true }));

function preparar() {
    db.locais = [
        { id: 1, nome: 'Brasil', tipo: 'País', pertenceA: [], notas: '' },
        { id: 2, nome: 'São Paulo', tipo: 'Estado', pertenceA: [1], notas: '' },
        { id: 3, nome: 'São Paulo', tipo: 'Cidade', pertenceA: [2], notas: '' },
        { id: 4, nome: 'Lapa', tipo: 'Bairro', pertenceA: [3], notas: '' },
        { id: 5, nome: 'Metrô de São Paulo', tipo: 'Rede ou sistema', pertenceA: [3], notas: '' },
        { id: 6, nome: 'Estação Lapa', tipo: 'Estação', pertenceA: [4, 5], notas: 'perto de casa' },
        { id: 7, nome: 'Santos', tipo: 'Cidade', pertenceA: [2], notas: '' },
        { id: 8, nome: 'Ponta da Praia', tipo: 'Bairro', pertenceA: [7], notas: '' },
    ];
    db.poemas = [
        {
            id: 101,
            titulo: 'A',
            territorialidade: [6],
            sinalizacoesTerritorialidade: 'Estação Lapa',
            localEscrita: 8,
        },
        {
            id: 102,
            titulo: 'B',
            territorialidade: [8],
            sinalizacoesTerritorialidade: 'Ponta da Praia',
            localEscrita: 8,
        },
    ];
    db.prosas = [];
    sincronizarLocais(db);
    $('busca-locais').value = '';
    $('filtro-locais').value = 'todos';
    $('filtro-uso-locais').value = 'todos';
    UI.initFormLocal();
}

describe('renderLocais: árvore', () => {
    beforeEach(preparar);

    it('mostra cada Local uma vez, em árvore, e a Estação Lapa como referência sob o Metrô', () => {
        UI.renderLocais();
        assert.deepEqual(nomes(), [
            'Brasil',
            'São Paulo',
            'Santos',
            'Ponta da Praia',
            'São Paulo',
            'Lapa',
            'Estação Lapa',
            'Metrô de São Paulo',
        ]);
        assert.deepEqual(referencias(), ['6']);
        assert.match($('resumo-locais').textContent, /8 locais · 0 sem tipo · 1 sem local maior/);
    });

    it('indenta por nível e mostra tipo, nota e "também em"', () => {
        UI.renderLocais();
        assert.match(linha(6).style.marginLeft, /5rem/);
        assert.match(linha(6).textContent, /Estação/);
        assert.match(linha(6).textContent, /perto de casa/);
        assert.match(linha(6).textContent, /também em Metrô de São Paulo/);
    });

    it('conta citados e escritos, direto e com sublocais', () => {
        UI.renderLocais();
        assert.match(linha(6).textContent, /1 citado/);
        assert.match(linha(4).textContent, /0 citados \(1 com sublocais\)/);
        assert.match(linha(8).textContent, /1 citado · 2 escritos aqui/);
        assert.match(linha(7).textContent, /0 escritos aqui \(2 com sublocais\)/);
        assert.match(linha(1).textContent, /2 com sublocais/);
    });

    it('recolher esconde os descendentes e expandir devolve', () => {
        UI.renderLocais();
        UI.alternarColapsoLocal(3);
        assert.deepEqual(nomes(), ['Brasil', 'São Paulo', 'Santos', 'Ponta da Praia', 'São Paulo']);
        UI.alternarColapsoLocal(3);
        assert.equal(nomes().length, 8);
    });

    it('busca filtra em lista plana com o caminho; filtros por tipo e pai', () => {
        $('busca-locais').value = 'LAPA';
        UI.renderLocais();
        assert.deepEqual(nomes(), ['Estação Lapa', 'Lapa']);
        assert.match(linha(6).textContent, /Estação Lapa › Lapa › São Paulo › São Paulo › Brasil/);
        assert.equal($('resumo-locais').textContent, '2 de 8');

        $('busca-locais').value = '';
        $('filtro-locais').value = 'sem-pai';
        UI.renderLocais();
        assert.deepEqual(nomes(), ['Brasil']);

        db.locais.push({ id: 9, nome: 'Copacabana', tipo: '', pertenceA: [], notas: '' });
        $('filtro-locais').value = 'sem-tipo';
        UI.renderLocais();
        assert.deepEqual(nomes(), ['Copacabana']);
    });

    it('filtro de uso: só citados, só locais de escrita, e combinado com os outros filtros', () => {
        $('filtro-uso-locais').value = 'citados';
        UI.renderLocais();
        assert.deepEqual(nomes().sort(), ['Estação Lapa', 'Ponta da Praia']);
        assert.equal($('resumo-locais').textContent, '2 de 8');

        $('filtro-uso-locais').value = 'escritos';
        UI.renderLocais();
        assert.deepEqual(nomes(), ['Ponta da Praia']);

        $('filtro-uso-locais').value = 'citados';
        $('filtro-locais').value = 'sem-pai';
        UI.renderLocais();
        assert.deepEqual(nomes(), []);

        $('filtro-locais').value = 'todos';
        $('busca-locais').value = 'lapa';
        UI.renderLocais();
        assert.deepEqual(nomes(), ['Estação Lapa']);

        $('busca-locais').value = '';
        $('filtro-uso-locais').value = 'todos';
        UI.renderLocais();
        assert.equal(nomes().length, 8);
    });

    it('acervo sem Locais mostra o aviso', () => {
        db.locais = [];
        UI.renderLocais();
        assert.match($('lista-locais').textContent, /Nenhum local cadastrado ainda/);
    });

    it('escapa HTML em nome, tipo e nota', () => {
        db.locais.push({
            id: 9,
            nome: '<b>x</b>',
            tipo: '<i>t</i>',
            pertenceA: [],
            notas: '<u>n</u>',
        });
        UI.renderLocais();
        assert.equal($('lista-locais').querySelector('b'), null);
        assert.equal($('lista-locais').querySelector('i'), null);
        assert.equal($('lista-locais').querySelector('u'), null);
    });
});

describe('modal de Local', () => {
    beforeEach(preparar);

    it('editar abre com os dados e os pais na ordem, o primeiro como principal', async () => {
        await UI.editarLocalNaTela(6);
        assert.equal($('lo-nome').value, 'Estação Lapa');
        assert.equal($('lo-tipo').value, 'Estação');
        assert.equal($('lo-notas').value, 'perto de casa');
        assert.equal($('modal-local-titulo').innerText, 'Editar Local');
        const linhas = [...$('lo-pais-lista').querySelectorAll('[data-pai-linha]')];
        assert.equal(linhas.length, 2);
        assert.match(linhas[0].textContent, /Lapa › São Paulo › São Paulo › Brasil/);
        assert.match(linhas[0].textContent, /principal/);
        assert.match(linhas[1].textContent, /Metrô de São Paulo/);
    });

    it('as opções de pai não incluem o próprio Local, quem pertence a ele nem os já escolhidos', async () => {
        await UI.editarLocalNaTela(3); // São Paulo (cidade)
        const ids = [...$('lo-pais-add').options].map((o) => o.value).filter(Boolean);
        for (const fora of ['3', '4', '5', '6', '2']) assert.equal(ids.includes(fora), false, fora);
        // Brasil é ancestral, não descendente: pode ser adicionado (vínculo redundante, inofensivo).
        assert.ok(ids.includes('1'));
    });

    it('cria um Local novo com dois pais (Estação Sé: Sé e Metrô), o primeiro principal', async () => {
        db.locais.push({ id: 9, nome: 'Sé', tipo: 'Bairro', pertenceA: [3], notas: '' });
        await UI.novoLocal();
        assert.equal($('modal-local-titulo').innerText, 'Cadastrar Local');
        assert.equal($('lo-edit-id').value, '');
        $('lo-nome').value = 'Estação Sé';
        $('lo-tipo').value = 'Estação';
        $('lo-pais-add').value = '9';
        $('lo-pais-add').onchange();
        $('lo-pais-add').value = '5';
        $('lo-pais-add').onchange();
        enviar();
        const criado = db.locais.find((l) => l.nome === 'Estação Sé');
        assert.ok(criado);
        assert.deepEqual(criado.pertenceA, [9, 5]);
        assert.equal(criado.tipo, 'Estação');
    });

    it('"tornar principal" troca a ordem e remover tira o pai', async () => {
        await UI.editarLocalNaTela(6);
        $('lo-pais-lista').querySelector('[data-pai-principal="1"]').onclick();
        assert.match(
            $('lo-pais-lista').querySelector('[data-pai-linha="0"]').textContent,
            /Metrô de São Paulo/,
        );
        enviar();
        assert.deepEqual(db.locais.find((l) => l.id === 6).pertenceA, [5, 4]);

        await UI.editarLocalNaTela(6);
        $('lo-pais-lista').querySelector('[data-pai-remover="0"]').onclick();
        enviar();
        assert.deepEqual(db.locais.find((l) => l.id === 6).pertenceA, [4]);
    });

    it('novo sublocal já vem com o pai escolhido', async () => {
        await UI.novoSublocal(7);
        assert.match($('lo-pais-lista').textContent, /Santos › São Paulo › Brasil/);
        $('lo-nome').value = 'Gonzaga';
        $('lo-tipo').value = 'Bairro';
        enviar();
        assert.deepEqual(db.locais.find((l) => l.nome === 'Gonzaga').pertenceA, [7]);
    });

    it('renomear atualiza o espelho dos textos', async () => {
        await UI.editarLocalNaTela(6);
        $('lo-nome').value = 'Estação da Lapa';
        enviar();
        assert.equal(db.poemas[0].sinalizacoesTerritorialidade, 'Estação da Lapa');
    });

    it('recusa duplicata e nome vazio sem mudar o cadastro', async () => {
        const antes = JSON.stringify(db.locais);
        await UI.novoLocal();
        $('lo-nome').value = 'Santos';
        $('lo-tipo').value = 'Cidade';
        $('lo-pais-add').value = '2';
        $('lo-pais-add').onchange();
        enviar();
        assert.equal(JSON.stringify(db.locais), antes);
        $('lo-nome').value = '   ';
        enviar();
        assert.equal(JSON.stringify(db.locais), antes);
    });

    it('sugere os tipos já usados e os padrão', async () => {
        db.locais.push({ id: 9, nome: 'X', tipo: 'Viagem', pertenceA: [], notas: '' });
        await UI.novoLocal();
        const tipos = [...$('lo-tipos-lista').options].map((o) => o.value);
        assert.ok(tipos.includes('Viagem'));
        assert.ok(tipos.includes('Cidade'));
        assert.equal(tipos.filter((t) => t === 'Cidade').length, 1);
    });
});

describe('excluir, ver textos e mesclar', () => {
    beforeEach(preparar);

    it('excluir Local sem texto nem filho vai direto', () => {
        db.locais.push({ id: 9, nome: 'Vazio', tipo: '', pertenceA: [], notas: '' });
        UI.excluirLocalComAviso(9);
        assert.equal(
            db.locais.some((l) => l.id === 9),
            false,
        );
    });

    it('destinos de mesclagem excluem o próprio Local e o que pertence a ele', () => {
        const ids = UI.destinosDeMesclagemDeLocal(3).map((d) => d.id);
        for (const fora of [3, 4, 5, 6]) assert.equal(ids.includes(fora), false, String(fora));
        assert.ok(ids.includes(7));
        assert.match(
            UI.destinosDeMesclagemDeLocal(3).find((d) => d.id === 7).rotulo,
            /Santos › São Paulo/,
        );
    });

    it('o modal de Mesclar oferece destinos com o caminho, sem o que pertence à origem', async () => {
        await abrirModalMesclar('locais', 3);
        assert.equal($('modal-mesclar-titulo').innerText, 'Mesclar Local');
        assert.equal($('ms-tipo').value, 'locais');
        const opcoes = [...$('ms-destino-id').options].map((o) => [o.value, o.textContent]);
        assert.ok(opcoes.some(([v, t]) => v === '8' && /Ponta da Praia › Santos/.test(t)));
        for (const fora of ['3', '4', '5', '6']) {
            assert.equal(
                opcoes.some(([v]) => v === fora),
                false,
                fora,
            );
        }
    });

    it('ver textos abre a busca com o Local e os sublocais', () => {
        document.body.insertAdjacentHTML(
            'beforeend',
            '<input id="busca-poemas" /><input id="busca-prosas" />',
        );
        UI.verTextosLocal(4);
        assert.equal($('busca-poemas').value, 'territorialidade:"Lapa (Bairro)"');
    });
});
