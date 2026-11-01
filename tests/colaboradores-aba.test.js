// Etapa 6, entrega 2: aba Colaboradores (lista, busca, filtros, cartões com
// "tudo o que fez", modal de cadastro, ligação ao Autor) e a ligação na
// navegação.
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
const HTML_MODAL = lerArquivo('modais/modal-colaborador.html');
const MAIN_JS = lerArquivo('js/main.js');

document.body.innerHTML = `
    <main>
        <input id="busca-colaboradores" />
        <select id="filtro-papel-colaboradores"><option value="">Todos os papéis</option></select>
        <select id="filtro-uso-colaboradores">
            <option value="todos">todos</option>
            <option value="com-livros">com</option>
            <option value="sem-livros">sem</option>
        </select>
        <span id="resumo-colaboradores"></span>
        <div id="lista-colaboradores"></div>
    </main>
    <div id="modais-container">${HTML_MODAL}</div>
`;

const { db } = await import('../js/db.js');
const { GRUPOS_NAV } = await import('../js/ui.js');
const U = await import('../js/colaboradores-aba.js');

const lista = () => document.getElementById('lista-colaboradores');
const cartoes = () => Array.from(lista().querySelectorAll('[data-colaborador-id]'));
const nomes = () => cartoes().map((c) => c.querySelector('.font-semibold').textContent);
const definir = (id, valor) => {
    document.getElementById(id).value = valor;
};

function semear() {
    ['colaboradores', 'livros', 'autores', 'poemas', 'prosas'].forEach((c) => {
        db[c].length = 0;
    });
    localStorage.clear();
    definir('busca-colaboradores', '');
    definir('filtro-papel-colaboradores', '');
    definir('filtro-uso-colaboradores', 'todos');
    document.getElementById('modal-colaborador').classList.add('hidden');
    db.autores.push({ id: 1, nome: 'Victor Leme', sobre: '' });
    db.colaboradores.push(
        {
            id: 5,
            nome: 'Ana Souza',
            papeisHabituais: ['Capista'],
            contato: 'https://ana.exemplo.com',
        },
        { id: 6, nome: 'Bruno Lima', papeisHabituais: ['Tipógrafo'], contato: 'bruno@exemplo.com' },
        { id: 7, nome: 'Carla Dias', papeisHabituais: [], contato: '', autorId: 1 },
    );
    db.livros.push(
        {
            id: 10,
            titulo: 'Água Viva',
            equipeLivro: [
                {
                    colaboradorId: 5,
                    papeis: [{ papel: 'Ilustrador', escopo: 'Capa' }, { papel: 'Revisor' }],
                },
                { colaboradorId: 6, papeis: [{ papel: 'Diagramador' }] },
            ],
        },
        {
            id: 11,
            titulo: 'Só dela',
            equipeLivro: [{ colaboradorId: 5, papeis: [{ papel: 'Editor' }] }],
        },
    );
}

describe('ligação na navegação', () => {
    it('a aba existe no index.html, depois de Autores, e no menu', () => {
        assert.match(INDEX_HTML, /id="btn-colaboradores"/);
        assert.match(INDEX_HTML, /<section id="colaboradores" class="tab-content">/);
        assert.match(INDEX_HTML, /onclick="novoColaborador\(\)"/);
        assert.match(INDEX_HTML, /oninput="renderColaboradores\(\)"/);
        const pos = (id) => INDEX_HTML.indexOf(`id="btn-${id}"`);
        assert.ok(pos('autores') < pos('colaboradores') && pos('colaboradores') < pos('estrutura'));
        const grupo = GRUPOS_NAV.find((g) => g.id === 'estrutura-acervo');
        const ids = grupo.abas.map((a) => a.id);
        assert.equal(ids.indexOf('colaboradores'), ids.indexOf('autores') + 1);
        assert.equal(grupo.abas.find((a) => a.id === 'colaboradores').rotulo, 'Colaboradores');
    });

    it('o main.js registra modal, ações e funções de janela', () => {
        assert.match(MAIN_JS, /registrarModal\('modal-colaborador', 'modal-colaborador\.html'/);
        for (const acao of ['editar-colaborador', 'ver-livro-colaborador']) {
            assert.ok(MAIN_JS.includes(`'${acao}'`), acao);
        }
        assert.match(MAIN_JS, /window\.renderColaboradores = renderColaboradores/);
        assert.match(MAIN_JS, /window\.novoColaborador = novoColaborador/);
    });

    it('render.js redesenha a aba a cada salvamento', () => {
        assert.match(lerArquivo('js/render.js'), /renderColaboradores\(\);/);
    });
});

describe('lista', () => {
    beforeEach(semear);

    it('sem cadastro, mostra a mensagem de vazio', () => {
        db.colaboradores.length = 0;
        U.renderColaboradores();
        assert.match(lista().textContent, /Nenhum colaborador cadastrado ainda/);
        assert.equal(document.getElementById('resumo-colaboradores').textContent, '');
    });

    it('mostra os cartões em ordem alfabética, com o resumo', () => {
        U.renderColaboradores();
        assert.deepEqual(nomes(), ['Ana Souza', 'Bruno Lima', 'Carla Dias']);
        assert.equal(
            document.getElementById('resumo-colaboradores').textContent,
            '3 colaboradores',
        );
    });

    it('o cartão mostra papéis habituais, contato, Autor ligado e os livros com papel e escopo', () => {
        U.renderColaboradores();
        const [ana, , carla] = cartoes();
        assert.match(ana.textContent, /Capista/);
        assert.match(ana.textContent, /consta em 2 livros/);
        assert.match(ana.textContent, /Água Viva/);
        assert.match(ana.textContent, /Ilustrador: Capa, Revisor/);
        assert.match(ana.textContent, /Só dela/);
        assert.match(ana.textContent, /Editor/);
        const link = ana.querySelector('a');
        assert.equal(link.getAttribute('href'), 'https://ana.exemplo.com');
        assert.equal(link.getAttribute('rel'), 'noopener noreferrer');
        assert.match(carla.textContent, /Autor: Victor Leme/);
        assert.match(carla.textContent, /ainda sem livros/);
    });

    it('contato que não é endereço vira texto, sem link', () => {
        U.renderColaboradores();
        const bruno = cartoes()[1];
        assert.equal(bruno.querySelector('a'), null);
        assert.match(bruno.textContent, /bruno@exemplo\.com/);
    });

    it('cada livro do cartão abre o Ver do livro, e excluir usa a exclusão com aviso', () => {
        U.renderColaboradores();
        const ana = cartoes()[0];
        const botoesLivro = ana.querySelectorAll('[data-action="ver-livro-colaborador"]');
        assert.deepEqual(
            Array.from(botoesLivro).map((b) => b.dataset.id),
            ['10', '11'],
        );
        const excluir = ana.querySelector('[data-action="excluir-item"]');
        assert.equal(excluir.dataset.tipo, 'colaboradores');
        assert.equal(excluir.dataset.id, '5');
        assert.ok(ana.querySelector('[data-action="editar-colaborador"]'));
    });

    it('escapa HTML no nome, nos papéis e no título do livro', () => {
        db.colaboradores.push({
            id: 8,
            nome: '<img src=x onerror=alert(1)>',
            papeisHabituais: ['<b>x</b>'],
            contato: '',
        });
        db.livros.push({
            id: 12,
            titulo: '<script>1</script>',
            equipeLivro: [{ colaboradorId: 8, papeis: [{ papel: 'Revisor' }] }],
        });
        U.renderColaboradores();
        assert.equal(lista().querySelector('img'), null);
        assert.equal(lista().querySelector('script'), null);
        assert.equal(lista().querySelector('b'), null);
    });
});

describe('busca e filtros', () => {
    beforeEach(semear);

    it('busca por nome, sem acento nem caixa', () => {
        definir('busca-colaboradores', 'CARLA');
        U.renderColaboradores();
        assert.deepEqual(nomes(), ['Carla Dias']);
        assert.equal(document.getElementById('resumo-colaboradores').textContent, '1 de 3');
    });

    it('busca por título de livro, papel, escopo, contato e Autor ligado', () => {
        const buscar = (texto) => {
            definir('busca-colaboradores', texto);
            U.renderColaboradores();
            return nomes();
        };
        assert.deepEqual(buscar('agua viva'), ['Ana Souza', 'Bruno Lima']);
        assert.deepEqual(buscar('diagramador'), ['Bruno Lima']);
        assert.deepEqual(buscar('capa'), ['Ana Souza']);
        assert.deepEqual(buscar('bruno@'), ['Bruno Lima']);
        assert.deepEqual(buscar('victor'), ['Carla Dias']);
        assert.deepEqual(buscar('xyz'), []);
        assert.match(lista().textContent, /Nenhum colaborador encontrado/);
    });

    it('o filtro de papel junta os habituais e os usados nos livros, com os livres no fim', () => {
        U.renderColaboradores();
        const opcoes = Array.from(
            document.getElementById('filtro-papel-colaboradores').options,
        ).map((o) => o.value);
        assert.deepEqual(opcoes, [
            '',
            'Capista',
            'Ilustrador',
            'Diagramador',
            'Revisor',
            'Preparador de texto',
            'Editor',
            'Fotógrafo',
            'Tipógrafo',
        ]);
    });

    it('filtra por papel, seja habitual ou de um livro', () => {
        U.renderColaboradores();
        definir('filtro-papel-colaboradores', 'Capista');
        U.renderColaboradores();
        assert.deepEqual(nomes(), ['Ana Souza']);
        definir('filtro-papel-colaboradores', 'Diagramador');
        U.renderColaboradores();
        assert.deepEqual(nomes(), ['Bruno Lima']);
        definir('filtro-papel-colaboradores', 'Tipógrafo');
        U.renderColaboradores();
        assert.deepEqual(nomes(), ['Bruno Lima']);
    });

    it('o filtro de papel volta para "todos" quando o papel some', () => {
        U.renderColaboradores();
        definir('filtro-papel-colaboradores', 'Tipógrafo');
        db.colaboradores.find((c) => c.id === 6).papeisHabituais = [];
        U.renderColaboradores();
        assert.equal(document.getElementById('filtro-papel-colaboradores').value, '');
        assert.equal(cartoes().length, 3);
    });

    it('filtra por ter ou não ter livros', () => {
        definir('filtro-uso-colaboradores', 'com-livros');
        U.renderColaboradores();
        assert.deepEqual(nomes(), ['Ana Souza', 'Bruno Lima']);
        definir('filtro-uso-colaboradores', 'sem-livros');
        U.renderColaboradores();
        assert.deepEqual(nomes(), ['Carla Dias']);
    });
});

describe('modal', () => {
    beforeEach(() => {
        semear();
        U.initFormColaborador();
    });

    const enviar = () =>
        document
            .getElementById('form-colaborador')
            .dispatchEvent(new Event('submit', { cancelable: true }));
    const marcar = (papel, valor = true) => {
        const caixa = document.querySelector(`#col-papeis input[value="${papel}"]`);
        caixa.checked = valor;
    };

    it('tem os campos e uma caixa para cada papel da lista fechada', () => {
        for (const id of [
            'col-nome',
            'col-papeis-outros',
            'col-contato',
            'col-autor',
            'col-edit-id',
        ]) {
            assert.ok(document.getElementById(id), id);
        }
        const valores = Array.from(document.querySelectorAll('#col-papeis input')).map(
            (i) => i.value,
        );
        assert.deepEqual(valores, [
            'Capista',
            'Ilustrador',
            'Diagramador',
            'Revisor',
            'Preparador de texto',
            'Editor',
            'Fotógrafo',
        ]);
    });

    it('novo: abre limpo e o select de Autor lista Nenhum mais os autores', async () => {
        await U.novoColaborador();
        assert.equal(
            document.getElementById('modal-colaborador-titulo').innerText,
            'Cadastrar Colaborador',
        );
        assert.equal(document.getElementById('col-nome').value, '');
        assert.equal(document.getElementById('col-autor').value, '');
        assert.deepEqual(
            Array.from(document.getElementById('col-autor').options).map((o) => o.textContent),
            ['Nenhum', 'Victor Leme'],
        );
    });

    it('novo: salva nome, papéis (caixas e outros), contato e Autor ligado', async () => {
        await U.novoColaborador();
        definir('col-nome', '  Dora   Reis ');
        marcar('Revisor');
        marcar('Fotógrafo');
        definir('col-papeis-outros', 'Letrista, tipógrafo, Revisor');
        definir('col-contato', ' dora@exemplo.com ');
        definir('col-autor', '1');
        enviar();
        const salvo = db.colaboradores.find((c) => c.nome === 'Dora Reis');
        assert.ok(salvo);
        assert.deepEqual(salvo.papeisHabituais, ['Revisor', 'Fotógrafo', 'Letrista', 'tipógrafo']);
        assert.equal(salvo.contato, 'dora@exemplo.com');
        assert.equal(salvo.autorId, 1);
        assert.equal(typeof salvo.id, 'number');
        assert.equal(db.colaboradores.length, 4);
    });

    it('novo sem Autor não grava autorId', async () => {
        await U.novoColaborador();
        definir('col-nome', 'Eva');
        enviar();
        assert.equal('autorId' in db.colaboradores.find((c) => c.nome === 'Eva'), false);
    });

    it('sem nome, não salva', async () => {
        await U.novoColaborador();
        definir('col-nome', '   ');
        enviar();
        assert.equal(db.colaboradores.length, 3);
    });

    it('nome repetido (ignorando caixa e acento) não salva, mas editar a si mesmo vale', async () => {
        await U.novoColaborador();
        definir('col-nome', 'ana  SOUZA');
        enviar();
        assert.equal(db.colaboradores.length, 3);

        await U.editarColaborador(5);
        definir('col-nome', 'Ana Souza');
        definir('col-contato', 'novo@exemplo.com');
        enviar();
        assert.equal(db.colaboradores.find((c) => c.id === 5).contato, 'novo@exemplo.com');
        assert.equal(db.colaboradores.length, 3);
    });

    it('editar: carrega os dados, mantém id e equipe dos livros, e permite tirar o Autor', async () => {
        await U.editarColaborador(7);
        assert.equal(
            document.getElementById('modal-colaborador-titulo').innerText,
            'Editar Colaborador',
        );
        assert.equal(document.getElementById('col-nome').value, 'Carla Dias');
        assert.equal(document.getElementById('col-autor').value, '1');
        definir('col-autor', '');
        enviar();
        const carla = db.colaboradores.find((c) => c.id === 7);
        assert.equal('autorId' in carla, false);
        assert.equal(db.colaboradores.length, 3);
        assert.equal(db.livros[0].equipeLivro.length, 2);
    });

    it('editar: marca as caixas dos papéis da lista e põe os livres no campo de outros', async () => {
        db.colaboradores.find((c) => c.id === 6).papeisHabituais = ['Revisor', 'Tipógrafo'];
        await U.editarColaborador(6);
        assert.equal(document.querySelector('#col-papeis input[value="Revisor"]').checked, true);
        assert.equal(document.querySelector('#col-papeis input[value="Capista"]').checked, false);
        assert.equal(document.getElementById('col-papeis-outros').value, 'Tipógrafo');
    });

    it('editar um id que não existe não faz nada', async () => {
        await U.editarColaborador(999);
        assert.equal(
            document.getElementById('modal-colaborador').classList.contains('hidden'),
            true,
        );
    });
});
