import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Grupo "Região e Idioma" dos modais de Poema e Prosa: Territorialidade e
// Local onde foi escrito, por id, puxando do cadastro de Locais.
document.body.innerHTML = `
    <div id="p-regiao-corpo"></div>
    <div id="pr-regiao-corpo"></div>
`;

const { db } = await import('../js/db.js');
const {
    renderRegiaoPoema,
    renderRegiaoProsa,
    adicionarTerritorialidadeTexto,
    removerTerritorialidadeTexto,
    definirLocalEscritaTexto,
    limparLocalEscritaTexto,
    obterLocaisTexto,
    resetLocaisTexto,
    carregarLocaisTexto,
    adicionarIdiomaTexto,
    removerIdiomaTexto,
    definirPapelIdiomaTexto,
    adicionarDialetoIdiomaTexto,
    removerDialetoIdiomaTexto,
    obterIdiomasTexto,
    resetIdiomasTexto,
    carregarIdiomasTexto,
} = await import('../js/editor.js');
const { locaisParaSalvar, idiomasParaSalvar } = await import('../js/forms.js');
const { sincronizarLocais, rotuloCaminhoLocal } = await import('../js/locais.js');

const $ = (id) => document.getElementById(id);
const chips = (id) => [...$(id).querySelectorAll('span')].map((e) => e.textContent.trim());

function preparar() {
    db.poemas = [];
    db.prosas = [];
    db.locais = [
        { id: 1, nome: 'Brasil', tipo: 'País', pertenceA: [], notas: '' },
        { id: 2, nome: 'São Paulo', tipo: 'Estado', pertenceA: [1], notas: '' },
        { id: 3, nome: 'São Paulo', tipo: 'Cidade', pertenceA: [2], notas: '' },
        { id: 4, nome: 'Lapa', tipo: 'Bairro', pertenceA: [3], notas: '' },
        { id: 5, nome: 'Metrô de São Paulo', tipo: 'Rede ou sistema', pertenceA: [3], notas: '' },
        { id: 6, nome: 'Estação Lapa', tipo: 'Estação', pertenceA: [4, 5], notas: '' },
        { id: 7, nome: 'Santos', tipo: 'Cidade', pertenceA: [], notas: '' },
    ];
    renderRegiaoPoema();
    renderRegiaoProsa();
    resetLocaisTexto('poemas');
    resetLocaisTexto('prosas');
    resetIdiomasTexto('poemas');
    resetIdiomasTexto('prosas');
}

describe('Região e Idioma: modal', () => {
    beforeEach(preparar);

    it('renderiza os dois campos e sugere os Locais com o caminho completo', () => {
        assert.ok($('p-local-escrita-input'));
        assert.ok($('p-territorialidade-input'));
        assert.ok($('pr-territorialidade-input'));
        const opcoes = [...$('p-locais-sugestoes').querySelectorAll('option')];
        assert.equal(opcoes.length, 7);
        const lapa = opcoes.find((o) => o.value === 'Estação Lapa');
        assert.equal(lapa.getAttribute('label'), rotuloCaminhoLocal(db, 6));
        // Homônimos se distinguem pelo tipo no valor digitado.
        const valores = opcoes.map((o) => o.value);
        assert.ok(valores.includes('São Paulo (Estado)'));
        assert.ok(valores.includes('São Paulo (Cidade)'));
    });

    it('digitar um Local cadastrado o escolhe por id, sem criar outro', () => {
        $('p-territorialidade-input').value = 'estação lapa';
        adicionarTerritorialidadeTexto('poemas');
        assert.deepEqual(obterLocaisTexto('poemas').territorialidade, [
            { id: 6, nome: 'Estação Lapa' },
        ]);
        assert.equal($('p-territorialidade-input').value, '');
        assert.equal(db.locais.length, 7);
    });

    it('homônimos: o rótulo com o tipo escolhe o certo', () => {
        adicionarTerritorialidadeTexto('poemas', 'São Paulo (Estado)');
        adicionarTerritorialidadeTexto('poemas', 'São Paulo (Cidade)');
        assert.deepEqual(
            obterLocaisTexto('poemas').territorialidade.map((e) => e.id),
            [2, 3],
        );
        assert.equal(chips('p-territorialidade-container').length, 2);
    });

    it('vírgula separa vários; repetido é ignorado', () => {
        adicionarTerritorialidadeTexto('poemas', 'Santos, Brasil, santos');
        assert.deepEqual(
            obterLocaisTexto('poemas').territorialidade.map((e) => e.id),
            [7, 1],
        );
    });

    it('nome que não existe entra como novo, marcado, e NÃO cria Local antes de salvar', () => {
        adicionarTerritorialidadeTexto('poemas', 'Praça Coração de Maria');
        assert.deepEqual(obterLocaisTexto('poemas').territorialidade, [
            { id: null, nome: 'Praça Coração de Maria' },
        ]);
        assert.match($('p-territorialidade-container').textContent, /\(novo\)/);
        assert.equal(db.locais.length, 7);
        resetLocaisTexto('poemas'); // cancelar o modal
        assert.equal(db.locais.length, 7);
    });

    it('Local onde foi escrito é um só: definir de novo troca; × limpa', () => {
        definirLocalEscritaTexto('poemas', 'Santos');
        definirLocalEscritaTexto('poemas', 'Lapa');
        assert.equal(obterLocaisTexto('poemas').escrita.id, 4);
        assert.equal(chips('p-local-escrita-container').length, 1);
        limparLocalEscritaTexto('poemas');
        assert.equal(obterLocaisTexto('poemas').escrita, null);
    });

    it('remover tira só aquele Local', () => {
        adicionarTerritorialidadeTexto('poemas', 'Santos, Brasil');
        removerTerritorialidadeTexto('poemas', 0);
        assert.deepEqual(
            obterLocaisTexto('poemas').territorialidade.map((e) => e.id),
            [1],
        );
    });

    it('Poema e Prosa têm estados separados', () => {
        adicionarTerritorialidadeTexto('poemas', 'Santos');
        assert.deepEqual(obterLocaisTexto('prosas').territorialidade, []);
    });

    it('carregar um texto mostra o que já estava gravado (ids, sem apagar o local de escrita)', () => {
        carregarLocaisTexto('poemas', { territorialidade: [6, 7], localEscrita: 7 });
        assert.deepEqual(
            obterLocaisTexto('poemas').territorialidade.map((e) => e.id),
            [6, 7],
        );
        assert.equal(obterLocaisTexto('poemas').escrita.id, 7);
    });

    it('texto antigo sem ids: cai nos nomes do espelho', () => {
        carregarLocaisTexto('poemas', { sinalizacoesTerritorialidade: 'Santos, Lugar Novo' });
        const t = obterLocaisTexto('poemas').territorialidade;
        assert.equal(t[0].id, 7);
        assert.deepEqual(t[1], { id: null, nome: 'Lugar Novo' });
    });
});

describe('Região e Idioma: salvar', () => {
    beforeEach(preparar);

    it('grava ids, espelho por nomes e local de escrita', () => {
        adicionarTerritorialidadeTexto('poemas', 'Estação Lapa, Santos');
        definirLocalEscritaTexto('poemas', 'Santos');
        assert.deepEqual(locaisParaSalvar('poemas'), {
            territorialidade: [6, 7],
            sinalizacoesTerritorialidade: 'Estação Lapa, Santos',
            localEscrita: 7,
        });
    });

    it('Local novo é criado ao salvar, sem tipo e sem pai, e reaproveitado na 2ª vez', () => {
        adicionarTerritorialidadeTexto('poemas', 'Praça Coração de Maria');
        const r = locaisParaSalvar('poemas');
        const criado = db.locais.find((l) => l.nome === 'Praça Coração de Maria');
        assert.ok(criado);
        assert.equal(criado.tipo, '');
        assert.deepEqual(criado.pertenceA, []);
        assert.deepEqual(r.territorialidade, [criado.id]);
        locaisParaSalvar('poemas');
        assert.equal(db.locais.filter((l) => l.nome === 'Praça Coração de Maria').length, 1);
    });

    it('São Paulo cidade + estado: os dois ids ficam; o espelho mostra o nome uma vez', () => {
        adicionarTerritorialidadeTexto('poemas', 'São Paulo (Estado), São Paulo (Cidade)');
        const r = locaisParaSalvar('poemas');
        assert.deepEqual(r.territorialidade, [2, 3]);
        assert.equal(r.sinalizacoesTerritorialidade, 'São Paulo');
    });

    it('a reconciliação do save() mantém os ids escolhidos (não os refaz por nome)', () => {
        adicionarTerritorialidadeTexto('poemas', 'São Paulo (Estado)');
        const texto = { id: 9, titulo: 'T', ...locaisParaSalvar('poemas') };
        db.poemas.push(texto);
        sincronizarLocais(db);
        assert.deepEqual(texto.territorialidade, [2]);
    });

    it('sem nada no grupo, o texto fica sem Territorialidade e sem local de escrita', () => {
        assert.deepEqual(locaisParaSalvar('prosas'), {
            territorialidade: [],
            sinalizacoesTerritorialidade: '',
            localEscrita: null,
        });
    });
});

describe('Região e Idioma: HTML dos modais', () => {
    it('o grupo tem só o ponto de montagem (o Idioma é montado por dentro) e vem antes de Datas', async () => {
        const { readFile } = await import('node:fs/promises');
        for (const [arq, pre] of [
            ['modais/modal-poema.html', 'p'],
            ['modais/modal-prosa.html', 'pr'],
        ]) {
            const html = await readFile(new URL(`../${arq}`, import.meta.url), 'utf8');
            const inicio = html.indexOf('Região e Idioma');
            const fim = html.indexOf('</details>', inicio);
            assert.ok(inicio > 0, `${arq}: grupo ausente`);
            const grupo = html.slice(inicio, fim);
            assert.ok(grupo.includes(`id="${pre}-regiao-corpo"`), `${arq}: sem ponto de montagem`);
            assert.ok(grupo.includes('(idioma, local onde foi escrito, territorialidade)'));
            assert.equal(
                html.includes(`id="${pre}-idioma"`),
                false,
                `${arq}: sobrou o Idioma antigo`,
            );
            assert.ok(
                inicio < html.indexOf('>\n                            Datas'),
                `${arq}: fora de ordem`,
            );
        }
    });
    it('o grupo montado traz o bloco de Idioma', () => {
        preparar();
        for (const pre of ['p', 'pr']) {
            assert.ok($(`${pre}-idioma-input`));
            assert.ok($(`${pre}-idiomas-container`));
            assert.ok($(`${pre}-idiomas-sugestoes`));
        }
    });
});

const linhas = (id) => [...$(id).children];
const papeis = (tabela) => obterIdiomasTexto(tabela).map((e) => `${e.idioma}:${e.papel}`);

describe('Idiomas do texto: modal', () => {
    beforeEach(preparar);

    it('texto novo começa com pt-BR como Principal', () => {
        assert.deepEqual(papeis('poemas'), ['pt-BR:principal']);
        assert.equal(linhas('p-idiomas-container').length, 1);
    });

    it('o segundo idioma entra como Secundário; vírgula separa vários; repetido é ignorado', () => {
        adicionarIdiomaTexto('poemas', 'en, ES, EN');
        assert.deepEqual(papeis('poemas'), ['pt-BR:principal', 'en:secundario', 'ES:secundario']);
        adicionarIdiomaTexto('poemas', 'pt-br');
        assert.equal(obterIdiomasTexto('poemas').length, 3);
    });

    it('vale o input digitado, que é esvaziado depois', () => {
        $('p-idioma-input').value = 'fr';
        adicionarIdiomaTexto('poemas');
        assert.equal($('p-idioma-input').value, '');
        assert.deepEqual(papeis('poemas'), ['pt-BR:principal', 'fr:secundario']);
    });

    it('mais de um Principal é permitido (texto meio a meio)', () => {
        adicionarIdiomaTexto('poemas', 'es');
        definirPapelIdiomaTexto('poemas', 1, 'principal');
        assert.deepEqual(papeis('poemas'), ['pt-BR:principal', 'es:principal']);
    });

    it('rebaixar o único Principal promove o próximo da lista', () => {
        adicionarIdiomaTexto('poemas', 'es, en');
        definirPapelIdiomaTexto('poemas', 0, 'secundario');
        assert.deepEqual(papeis('poemas'), ['pt-BR:secundario', 'es:principal', 'en:secundario']);
    });

    it('rebaixar o único Principal sendo o último promove o primeiro', () => {
        adicionarIdiomaTexto('poemas', 'es');
        definirPapelIdiomaTexto('poemas', 1, 'principal');
        definirPapelIdiomaTexto('poemas', 0, 'secundario');
        definirPapelIdiomaTexto('poemas', 1, 'secundario');
        assert.deepEqual(papeis('poemas'), ['pt-BR:principal', 'es:secundario']);
    });

    it('o único idioma não pode virar Secundário', () => {
        definirPapelIdiomaTexto('poemas', 0, 'secundario');
        assert.deepEqual(papeis('poemas'), ['pt-BR:principal']);
    });

    it('remover o Principal promove o primeiro que sobra; remover todos é permitido', () => {
        adicionarIdiomaTexto('poemas', 'es, en');
        removerIdiomaTexto('poemas', 0);
        assert.deepEqual(papeis('poemas'), ['es:principal', 'en:secundario']);
        removerIdiomaTexto('poemas', 0);
        removerIdiomaTexto('poemas', 0);
        assert.deepEqual(obterIdiomasTexto('poemas'), []);
        assert.equal(linhas('p-idiomas-container').length, 0);
    });

    it('dialeto pertence ao idioma e vira chip', () => {
        adicionarIdiomaTexto('poemas', 'es');
        adicionarDialetoIdiomaTexto('poemas', 1, 'rioplatense');
        assert.deepEqual(obterIdiomasTexto('poemas')[1], {
            idioma: 'es',
            papel: 'secundario',
            dialetos: ['rioplatense'],
        });
        const chips = [...linhas('p-idiomas-container')[1].querySelectorAll('span')].map((c) =>
            c.textContent.replace('×', '').trim(),
        );
        assert.ok(chips.includes('rioplatense'));
        // O dialeto acompanha o idioma quando outro é removido.
        removerIdiomaTexto('poemas', 0);
        assert.deepEqual(obterIdiomasTexto('poemas')[0].dialetos, ['rioplatense']);
    });

    it('mais de um dialeto no mesmo idioma: vírgula separa, repetido é ignorado, × remove', () => {
        adicionarDialetoIdiomaTexto('poemas', 0, 'paulistano, gaúcho');
        adicionarDialetoIdiomaTexto('poemas', 0, 'GAUCHO');
        adicionarDialetoIdiomaTexto('poemas', 0, '   ');
        assert.deepEqual(obterIdiomasTexto('poemas')[0].dialetos, ['paulistano', 'gaúcho']);
        removerDialetoIdiomaTexto('poemas', 0, 0);
        assert.deepEqual(obterIdiomasTexto('poemas')[0].dialetos, ['gaúcho']);
        removerDialetoIdiomaTexto('poemas', 0, 0);
        assert.deepEqual(obterIdiomasTexto('poemas')[0].dialetos, []);
    });

    it('o campo de dialeto recupera o foco depois de adicionar', () => {
        adicionarDialetoIdiomaTexto('poemas', 0, 'paulistano');
        assert.equal(document.activeElement?.id, 'p-dialeto-input-0');
    });

    it('dialeto digitado e ainda não confirmado entra ao ler o estado (não se perde ao salvar)', () => {
        $('p-dialeto-input-0').value = 'mineiro, carioca';
        assert.deepEqual(obterIdiomasTexto('poemas')[0].dialetos, ['mineiro', 'carioca']);
        // Ler não muda o estado guardado.
        $('p-dialeto-input-0').value = '';
        assert.deepEqual(obterIdiomasTexto('poemas')[0].dialetos, []);
    });

    it('o seletor de papel reflete o estado e o dialeto sugere o que já foi usado', () => {
        db.poemas = [
            { id: 1, idiomas: [{ idioma: 'es', papel: 'principal', dialetos: ['mexicano'] }] },
        ];
        carregarIdiomasTexto('poemas', {
            idiomas: [{ idioma: 'es', papel: 'principal', dialetos: [] }],
        });
        const linha = linhas('p-idiomas-container')[0];
        assert.equal(linha.querySelector('select').value, 'principal');
        const sugestoes = [...linha.querySelectorAll('datalist option')].map((o) => o.value);
        assert.deepEqual(sugestoes, ['mexicano']);
    });

    it('carregar texto antigo (só `idioma`) mostra um Principal; texto sem idioma, lista vazia', () => {
        carregarIdiomasTexto('prosas', { idioma: 'en' });
        assert.deepEqual(papeis('prosas'), ['en:principal']);
        carregarIdiomasTexto('prosas', { idioma: '' });
        assert.deepEqual(obterIdiomasTexto('prosas'), []);
    });

    it('Poema e Prosa têm estados independentes', () => {
        adicionarIdiomaTexto('poemas', 'en');
        assert.deepEqual(papeis('prosas'), ['pt-BR:principal']);
    });

    it('o campo oculto acompanha o estado (rastreador de alterações)', () => {
        adicionarIdiomaTexto('poemas', 'en');
        assert.deepEqual(
            JSON.parse($('p-idiomas-json').value).map((e) => e.idioma),
            ['pt-BR', 'en'],
        );
    });
});

describe('Idiomas do texto: salvar', () => {
    beforeEach(preparar);

    it('grava a lista e o espelho com os Principais primeiro', () => {
        adicionarIdiomaTexto('poemas', 'en, es');
        definirPapelIdiomaTexto('poemas', 2, 'principal');
        adicionarDialetoIdiomaTexto('poemas', 2, 'rioplatense');
        assert.deepEqual(idiomasParaSalvar('poemas'), {
            idiomas: [
                { idioma: 'pt-BR', papel: 'principal', dialetos: [] },
                { idioma: 'en', papel: 'secundario', dialetos: [] },
                { idioma: 'es', papel: 'principal', dialetos: ['rioplatense'] },
            ],
            idioma: 'pt-BR, es, en',
        });
    });

    it('sem nenhum idioma, o texto fica sem idioma', () => {
        removerIdiomaTexto('prosas', 0);
        assert.deepEqual(idiomasParaSalvar('prosas'), { idiomas: [], idioma: '' });
    });
});
