// Etapa 2 dos Personagens: aba (lista, filtros, cartões), modal de
// cadastro com tags, "Ver textos" (prefixo de busca `personagem:`) e a
// ligação na navegação.
import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(__dirname, '..');
const lerArquivo = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const INDEX_HTML = lerArquivo('index.html');
const HTML_MODAL = lerArquivo('modais/modal-personagem.html');
const MAIN_JS = lerArquivo('js/main.js');

document.body.innerHTML = `
    <main>
        <input id="busca-personagens" />
        <select id="filtro-origem-personagens">
            <option value="todos">todas</option>
            <option value="Criado">Criado</option>
            <option value="Reinterpretado">Reinterpretado</option>
            <option value="sem-origem">sem origem</option>
        </select>
        <select id="filtro-uso-personagens">
            <option value="todos">todos</option>
            <option value="com-textos">com</option>
            <option value="sem-textos">sem</option>
        </select>
        <span id="resumo-personagens"></span>
        <div id="lista-personagens"></div>
    </main>
    <div id="modais-container">${HTML_MODAL}</div>
`;

const { db } = await import('../js/db.js');
const { GRUPOS_NAV } = await import('../js/ui.js');
const { filtrarTextos } = await import('../js/utils.js');
const { decorarCamposBusca } = await import('../js/render-listas.js');
const U = await import('../js/ui-personagens.js');

const lista = () => document.getElementById('lista-personagens');
const definir = (id, valor) => {
    document.getElementById(id).value = valor;
};

function semear() {
    db.personagens.length = 0;
    db.poemas.length = 0;
    db.prosas.length = 0;
    db.personagens.push(
        {
            id: 1,
            nome: 'Capitu',
            origem: 'Reinterpretado',
            genero: 'Mulher',
            orientacao: 'Heterossexual',
            corRaca: 'Parda',
            nascimento: { ano: 1850 },
            obito: { ano: 1900 },
            caracteristicas: { personalidade: ['Dissimulada'], backstory: ['Abandono parental'] },
        },
        { id: 2, nome: 'Medusa', origem: 'Criado' },
        { id: 3, nome: 'Zélia' },
    );
    db.poemas.push({
        id: 10,
        titulo: 'P1',
        personagens: [{ personagemId: 1, papeis: ['Voz'], centralidade: 'protagonista' }],
    });
    db.prosas.push({
        id: 20,
        titulo: 'Pr1',
        personagens: [{ personagemId: 1, papeis: ['Menção'], centralidade: '' }],
    });
}

describe('navegação e ligação', () => {
    it('Personagens está no grupo Cadastros, com botão e seção no index.html', () => {
        const cadastros = GRUPOS_NAV.find((g) => g.id === 'cadastros');
        assert.ok(cadastros.abas.some((a) => a.id === 'personagens'));
        assert.match(INDEX_HTML, /id="btn-personagens"/);
        assert.match(INDEX_HTML, /<section id="personagens" class="tab-content">/);
        assert.match(INDEX_HTML, /onclick="novoPersonagem\(\)"/);
    });

    it('ordem em Cadastros: Pessoas, Grupos (Pessoas), Personagens, no menu e no index.html', () => {
        const abas = GRUPOS_NAV.find((g) => g.id === 'cadastros').abas;
        const ids = abas.map((a) => a.id);
        assert.deepEqual(ids.slice(ids.indexOf('pessoas'), ids.indexOf('pessoas') + 3), [
            'pessoas',
            'grupos',
            'personagens',
        ]);
        assert.equal(abas.find((a) => a.id === 'grupos').rotulo, 'Grupos (Pessoas)');
        const pos = (id) => INDEX_HTML.indexOf(`id="btn-${id}"`);
        assert.ok(pos('pessoas') < pos('grupos') && pos('grupos') < pos('personagens'));
    });

    it('main.js registra o modal, as ações dos cartões e expõe as funções do index.html', () => {
        assert.match(MAIN_JS, /registrarModal\('modal-personagem', 'modal-personagem\.html'/);
        for (const acao of ['editar-personagem', 'ver-textos-personagem']) {
            assert.ok(MAIN_JS.includes(`'${acao}'`), acao);
        }
        assert.match(MAIN_JS, /window\.renderPersonagens = renderPersonagens/);
        assert.match(MAIN_JS, /window\.novoPersonagem = novoPersonagem/);
    });
});

describe('lista', () => {
    beforeEach(semear);

    it('mostra o cartão com identidade, vida, tags, contagem de textos e as ações', () => {
        U.renderPersonagens();
        const cartao = document.querySelector('[data-personagem-id="1"]');
        assert.ok(cartao);
        const txt = cartao.textContent;
        assert.match(txt, /Capitu/);
        assert.match(txt, /Reinterpretado/);
        assert.match(txt, /Mulher · Heterossexual · Parda/);
        assert.match(txt, /1850 – 1900 \(50 anos\)/);
        assert.match(txt, /Dissimulada/);
        assert.match(txt, /Abandono parental/);
        assert.match(txt, /aparece em 1 poema e 1 prosa/);
        assert.ok(cartao.querySelector('[data-action="ver-textos-personagem"]'));
        assert.ok(cartao.querySelector('[data-action="editar-personagem"]'));
        assert.ok(cartao.querySelector('[data-action="excluir-item"][data-tipo="personagens"]'));
    });

    it('sem textos: diz isso e não oferece "Ver textos"', () => {
        U.renderPersonagens();
        const cartao = document.querySelector('[data-personagem-id="2"]');
        assert.match(cartao.textContent, /ainda sem textos/);
        assert.equal(cartao.querySelector('[data-action="ver-textos-personagem"]'), null);
    });

    it('ordem alfabética (pt-BR) e resumo com o total', () => {
        U.renderPersonagens();
        const nomes = [...lista().querySelectorAll('[data-personagem-id] .font-semibold')].map(
            (e) => e.textContent.trim(),
        );
        assert.deepEqual(nomes, ['Capitu', 'Medusa', 'Zélia']);
        assert.equal(document.getElementById('resumo-personagens').textContent, '3 personagens');
    });

    it('busca por nome, identidade e tag, sem acento nem caixa', () => {
        definir('busca-personagens', 'zelia');
        U.renderPersonagens();
        assert.equal(lista().querySelectorAll('[data-personagem-id]').length, 1);
        definir('busca-personagens', 'ABANDONO');
        U.renderPersonagens();
        assert.ok(document.querySelector('[data-personagem-id="1"]'));
        assert.equal(lista().querySelectorAll('[data-personagem-id]').length, 1);
        assert.equal(document.getElementById('resumo-personagens').textContent, '1 de 3');
        definir('busca-personagens', '');
    });

    it('filtros de origem e de uso', () => {
        definir('filtro-origem-personagens', 'sem-origem');
        U.renderPersonagens();
        assert.ok(document.querySelector('[data-personagem-id="3"]'));
        assert.equal(lista().querySelectorAll('[data-personagem-id]').length, 1);
        definir('filtro-origem-personagens', 'todos');

        definir('filtro-uso-personagens', 'com-textos');
        U.renderPersonagens();
        assert.deepEqual(
            [...lista().querySelectorAll('[data-personagem-id]')].map(
                (e) => e.dataset.personagemId,
            ),
            ['1'],
        );
        definir('filtro-uso-personagens', 'sem-textos');
        U.renderPersonagens();
        assert.equal(lista().querySelectorAll('[data-personagem-id]').length, 2);
        definir('filtro-uso-personagens', 'todos');
    });

    it('acervo sem personagens: mensagem de vazio', () => {
        db.personagens.length = 0;
        U.renderPersonagens();
        assert.match(lista().textContent, /Nenhum personagem cadastrado ainda/);
    });

    it('escapa HTML no nome e nas tags', () => {
        db.personagens.push({
            id: 9,
            nome: '<img src=x onerror=alert(1)>',
            caracteristicas: { medos: ['<b>x</b>'] },
        });
        U.renderPersonagens();
        assert.equal(lista().querySelector('img'), null);
        assert.equal(lista().querySelector('b'), null);
    });
});

describe('"Ver textos": prefixo de busca personagem:', () => {
    beforeEach(semear);

    it('o texto com o personagem é achado por personagem:"Nome" e pela busca geral', () => {
        const item = decorarCamposBusca(db.poemas[0]);
        assert.match(item._buscaPersonagens, /Capitu/);
        assert.equal(filtrarTextos([item], 'personagem:"Capitu"').length, 1);
        assert.equal(filtrarTextos([item], 'personagem:"Medusa"').length, 0);
        assert.equal(filtrarTextos([item], 'capitu').length, 1);
    });
});

describe('modal', () => {
    beforeEach(() => {
        semear();
        U.initFormPersonagem();
    });

    const enviar = () =>
        document
            .getElementById('form-personagem')
            .dispatchEvent(new Event('submit', { cancelable: true }));
    const digitarTag = (grupo, texto) => {
        const input = document.getElementById(`per-tag-${grupo}`);
        input.value = texto;
        input.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
        );
    };

    it('tem os 7 grupos de tag, a nota do passado e os campos de identidade e vida', () => {
        for (const g of [
            'personalidade',
            'valoresCrencas',
            'desejos',
            'medos',
            'tracosFisicos',
            'arquetipos',
            'backstory',
        ]) {
            assert.ok(document.getElementById(`per-tag-${g}`), g);
            assert.ok(document.getElementById(`per-chips-${g}`), g);
        }
        for (const id of [
            'per-backstory-nota',
            'per-genero',
            'per-orientacao',
            'per-cor-raca',
            'per-nascimento',
            'per-obito',
            'per-origem',
            'per-notas',
        ]) {
            assert.ok(document.getElementById(id), id);
        }
    });

    it('novo: salva identidade, vida e tags (Enter adiciona, repetição é ignorada, texto pendente entra)', async () => {
        await U.novoPersonagem();
        assert.equal(
            document.getElementById('modal-personagem-titulo').innerText,
            'Cadastrar Personagem',
        );
        definir('per-nome', 'Beatriz');
        definir('per-origem', 'Criado');
        definir('per-genero', 'Mulher');
        definir('per-orientacao', 'Lésbica');
        definir('per-cor-raca', 'Preta');
        definir('per-nascimento', '1900');
        definir('per-obito', '1970');
        definir('per-backstory-nota', 'Criada pela avó.');
        digitarTag('medos', 'Abandono');
        digitarTag('medos', 'abandono');
        digitarTag('backstory', 'Abandono parental');
        definir('per-tag-desejos', 'Liberdade'); // digitado, sem Enter
        enviar();

        const p = db.personagens.find((x) => x.nome === 'Beatriz');
        assert.ok(p, 'deveria ter salvo');
        assert.equal(p.origem, 'Criado');
        assert.equal(p.genero, 'Mulher');
        assert.equal(p.orientacao, 'Lésbica');
        assert.equal(p.corRaca, 'Preta');
        assert.deepEqual(p.nascimento, { ano: 1900 });
        assert.deepEqual(p.obito, { ano: 1970 });
        assert.deepEqual(p.caracteristicas.medos, ['Abandono']);
        assert.deepEqual(p.caracteristicas.backstory, ['Abandono parental']);
        assert.deepEqual(p.caracteristicas.desejos, ['Liberdade']);
        assert.equal(p.caracteristicas.backstoryNota, 'Criada pela avó.');
    });

    it('recusa óbito anterior ao nascimento e nome vazio', async () => {
        await U.novoPersonagem();
        const antes = db.personagens.length;
        definir('per-nome', 'Ruim');
        definir('per-nascimento', '1950');
        definir('per-obito', '1900');
        enviar();
        assert.equal(db.personagens.length, antes);
        definir('per-nome', '   ');
        definir('per-nascimento', '');
        definir('per-obito', '');
        enviar();
        assert.equal(db.personagens.length, antes);
    });

    it('editar devolve tudo ao formulário e salvar atualiza o mesmo registro, sem duplicar', async () => {
        await U.editarPersonagem(1);
        assert.equal(
            document.getElementById('modal-personagem-titulo').innerText,
            'Editar Personagem',
        );
        assert.equal(document.getElementById('per-nome').value, 'Capitu');
        assert.equal(document.getElementById('per-genero').value, 'Mulher');
        assert.equal(document.getElementById('per-cor-raca').value, 'Parda');
        assert.equal(document.getElementById('per-nascimento').value, '1850');
        assert.match(document.getElementById('per-chips-personalidade').textContent, /Dissimulada/);
        assert.match(
            document.getElementById('per-chips-backstory').textContent,
            /Abandono parental/,
        );

        definir('per-orientacao', 'Bissexual');
        document.querySelector('#per-chips-personalidade [data-tags-remover]').click();
        digitarTag('personalidade', 'Enigmática');
        const total = db.personagens.length;
        enviar();

        assert.equal(db.personagens.length, total);
        const p = db.personagens.find((x) => x.id === 1);
        assert.equal(p.orientacao, 'Bissexual');
        assert.deepEqual(p.caracteristicas.personalidade, ['Enigmática']);
        assert.deepEqual(p.caracteristicas.backstory, ['Abandono parental']);
    });

    it('novo depois de editar abre limpo (nada do personagem anterior)', async () => {
        await U.editarPersonagem(1);
        await U.novoPersonagem();
        assert.equal(document.getElementById('per-edit-id').value, '');
        assert.equal(document.getElementById('per-nome').value, '');
        assert.equal(document.getElementById('per-chips-personalidade').textContent.trim(), '');
        assert.equal(document.getElementById('per-nascimento').value, '');
    });

    it('as sugestões de gênero/orientação juntam a lista do Autor e o que já foi usado', async () => {
        db.personagens.push({
            id: 50,
            nome: 'Z',
            genero: 'Mulher trans',
            orientacao: 'Demissexual',
        });
        await U.novoPersonagem();
        const opcoes = (id) => [...document.querySelectorAll(`#${id} option`)].map((o) => o.value);
        assert.ok(opcoes('per-sugestoes-genero').includes('Mulher'));
        assert.ok(opcoes('per-sugestoes-genero').includes('Mulher trans'));
        assert.ok(opcoes('per-sugestoes-orientacao').includes('Lésbica'));
        assert.ok(opcoes('per-sugestoes-orientacao').includes('Demissexual'));
        assert.ok(opcoes('per-sugestoes-personalidade').includes('Dissimulada'));
    });
});
