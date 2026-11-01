import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Autoria do livro, entrega 2 (tela): seção no modal do Livro, salvar e editar,
// linha no card, filtros e busca por Autor na aba Livros e as duas seções do Ver.
// Usa o modal real e o salvar real, registrados como no main.js.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
globalThis.fetch = async (url) => ({
    ok: true,
    status: 200,
    text: async () =>
        fs.readFileSync(path.resolve(__dirname, '../modais', path.basename(url)), 'utf8'),
});

const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const m = html.match(/<section id="livros"[\s\S]*?<\/section>/);
document.body.innerHTML = `<main>${m[0]}</main><div id="modais-container"></div>`;

const { registrarModal, toggleModal } = await import('../js/modais.js');
const { db } = await import('../js/db.js');
const { initFormLivro, editarLivro, rastreadorLivro } = await import('../js/forms.js');
const { prepararNovo } = await import('../js/ui.js');
const { renderLivros, setBuscaLivros, limparFiltrosLivros, getListaVisivelLivros } =
    await import('../js/render-listas.js');
const { abrirVisualizacaoLivro } = await import('../js/visualizar-livro.js');

registrarModal('modal-livro', 'modal-livro.html', initFormLivro, rastreadorLivro);
registrarModal('modal-visualizar-livro', 'modal-visualizar-livro.html', () => {});

const aberto = (id) => {
    const el = document.getElementById(id);
    return !!el && !el.classList.contains('hidden');
};
const esperar = () => new Promise((r) => setTimeout(r, 30));
const linhas = () => Array.from(document.querySelectorAll('#l-autoria-lista [data-autoria-linha]'));
const clicar = (el) => el.dispatchEvent(new window.Event('click', { bubbles: true }));
const marcar = (linha, papel, valor = true) => {
    const caixa = linha.querySelector(`[data-autoria-papel][value="${papel}"]`);
    caixa.checked = valor;
    caixa.dispatchEvent(new window.Event('change', { bubbles: true }));
};
const escolherAutor = (linha, id) => {
    const sel = linha.querySelector('[data-autoria="autor"]');
    sel.value = String(id);
    sel.dispatchEvent(new window.Event('change', { bubbles: true }));
};

function semear() {
    localStorage.clear();
    db.autores = [
        { id: 1, nome: 'Ana Souza' },
        { id: 2, nome: 'Bruno Lima' },
        { id: 3, nome: 'Carla Dias' },
    ];
    db.livros = [
        {
            id: 7,
            titulo: 'Livro Sete',
            sequencia: 1,
            tipo: 'Coletânea',
            autoriaLivro: [
                { autorId: 1, papeis: ['Autor', 'Tradutor'] },
                { autorId: 2, papeis: ['Organizador'] },
            ],
        },
        { id: 8, titulo: 'Livro Oito', sequencia: 2, tipo: 'Inéditos' },
        {
            id: 9,
            titulo: 'Livro Nove',
            sequencia: 3,
            tipo: 'Inéditos',
            autoriaLivro: [{ autorId: 3, papeis: ['Autor', 'Ilustrador de capa'] }],
        },
    ];
    db.partes = [];
    db.secoes = [];
    db.poemas = [];
    db.prosas = [];
    db.itensColetanea = [];
    db.elementos = [];
}

describe('Autoria do livro: modal, salvar e editar', () => {
    beforeEach(async () => {
        semear();
        rastreadorLivro.marcarLimpo();
        for (const id of ['modal-livro', 'modal-visualizar-livro']) {
            if (aberto(id)) await toggleModal(id);
        }
        const conf = document.getElementById('modal-confirmar-exclusao');
        if (conf) conf.style.display = 'none';
    });

    it('o modal tem a seção Autoria, com o botão de adicionar', async () => {
        await editarLivro(8);
        assert.ok(document.getElementById('l-autoria-lista'));
        assert.ok(document.getElementById('l-autoria-adicionar'));
        assert.equal(linhas().length, 0);
        assert.equal(document.getElementById('l-autoria-contagem').textContent, 'Nenhum autor');
    });

    it('Editar carrega os vínculos, com os papéis na ordem gravada', async () => {
        await editarLivro(7);
        assert.equal(linhas().length, 2);
        const [a, b] = linhas();
        assert.equal(a.querySelector('[data-autoria="autor"]').value, '1');
        assert.deepEqual(a._papeis, ['Autor', 'Tradutor']);
        assert.equal(a.querySelector('[data-autoria-papel][value="Tradutor"]').checked, true);
        assert.equal(a.querySelector('[data-autoria-papel][value="Coautor"]').checked, false);
        assert.deepEqual(b._papeis, ['Organizador']);
        assert.equal(document.getElementById('l-autoria-contagem').textContent, '2 autores');
    });

    it('adicionar autor, marcar papéis e salvar grava autoriaLivro', async () => {
        await editarLivro(8);
        clicar(document.getElementById('l-autoria-adicionar'));
        assert.equal(linhas().length, 1);
        escolherAutor(linhas()[0], 2);
        marcar(linhas()[0], 'Prefaciador');
        marcar(linhas()[0], 'Autor');
        document.getElementById('form-livro').requestSubmit();
        await esperar();
        assert.equal(aberto('modal-livro'), false);
        assert.deepEqual(db.livros.find((l) => l.id === 8).autoriaLivro, [
            { autorId: 2, papeis: ['Prefaciador', 'Autor'] },
        ]);
    });

    it('a ordem dos papéis é a da escolha, não a das caixas', async () => {
        await editarLivro(8);
        clicar(document.getElementById('l-autoria-adicionar'));
        escolherAutor(linhas()[0], 1);
        marcar(linhas()[0], 'Tradutor');
        marcar(linhas()[0], 'Autor');
        marcar(linhas()[0], 'Tradutor', false);
        marcar(linhas()[0], 'Tradutor');
        assert.deepEqual(linhas()[0]._papeis, ['Autor', 'Tradutor']);
    });

    it('Outro: Enter confirma o papel livre como chip e não envia o formulário', async () => {
        await editarLivro(8);
        clicar(document.getElementById('l-autoria-adicionar'));
        const linha = linhas()[0];
        escolherAutor(linha, 3);
        const campo = linha.querySelector('[data-autoria="outro"]');
        campo.value = 'Revisor técnico';
        campo.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        assert.deepEqual(linha._papeis, ['Revisor técnico']);
        assert.equal(campo.value, '');
        assert.equal(linha.querySelectorAll('[data-autoria-livres] span').length, 1);
        assert.equal(aberto('modal-livro'), true);
    });

    it('papel livre digitado e não confirmado entra ao salvar', async () => {
        await editarLivro(8);
        clicar(document.getElementById('l-autoria-adicionar'));
        const linha = linhas()[0];
        escolherAutor(linha, 3);
        linha.querySelector('[data-autoria="outro"]').value = 'Curador';
        document.getElementById('form-livro').requestSubmit();
        await esperar();
        assert.deepEqual(db.livros.find((l) => l.id === 8).autoriaLivro, [
            { autorId: 3, papeis: ['Curador'] },
        ]);
    });

    it('o x do chip tira só aquele papel livre', async () => {
        await editarLivro(9);
        const linha = linhas()[0];
        assert.deepEqual(linha._papeis, ['Autor', 'Ilustrador de capa']);
        clicar(linha.querySelector('[data-autoria-acao="remover-papel"]'));
        assert.deepEqual(linha._papeis, ['Autor']);
    });

    it('Autor sem papel: recusa o salvar, avisa e não grava nada', async () => {
        await editarLivro(8);
        clicar(document.getElementById('l-autoria-adicionar'));
        escolherAutor(linhas()[0], 1);
        document.getElementById('l-titulo').value = 'Não pode gravar';
        document.getElementById('form-livro').requestSubmit();
        await esperar();
        assert.equal(aberto('modal-livro'), true);
        assert.equal(db.livros.find((l) => l.id === 8).titulo, 'Livro Oito');
        assert.equal(db.livros.find((l) => l.id === 8).autoriaLivro, undefined);
    });

    it('linha com papel e sem Autor também recusa', async () => {
        await editarLivro(8);
        clicar(document.getElementById('l-autoria-adicionar'));
        marcar(linhas()[0], 'Autor');
        document.getElementById('form-livro').requestSubmit();
        await esperar();
        assert.equal(aberto('modal-livro'), true);
        assert.equal(db.livros.find((l) => l.id === 8).autoriaLivro, undefined);
    });

    it('linha em branco é ignorada: o livro fica sem a chave', async () => {
        await editarLivro(8);
        clicar(document.getElementById('l-autoria-adicionar'));
        document.getElementById('form-livro').requestSubmit();
        await esperar();
        assert.equal(aberto('modal-livro'), false);
        assert.equal('autoriaLivro' in db.livros.find((l) => l.id === 8), false);
    });

    it('salvar um livro com autoria sem mexer nela não a perde', async () => {
        await editarLivro(7);
        document.getElementById('l-titulo').value = 'Livro Sete (revisto)';
        document.getElementById('form-livro').requestSubmit();
        await esperar();
        assert.deepEqual(db.livros.find((l) => l.id === 7).autoriaLivro, [
            { autorId: 1, papeis: ['Autor', 'Tradutor'] },
            { autorId: 2, papeis: ['Organizador'] },
        ]);
    });

    it('remover a única linha e salvar tira a chave do livro', async () => {
        await editarLivro(9);
        clicar(document.querySelector('[data-autoria-acao="remover"]'));
        document.getElementById('form-livro').requestSubmit();
        await esperar();
        assert.equal('autoriaLivro' in db.livros.find((l) => l.id === 9), false);
    });

    it('o mesmo Autor em duas linhas vira um vínculo só, com os papéis somados', async () => {
        await editarLivro(8);
        for (let i = 0; i < 2; i++) {
            clicar(document.getElementById('l-autoria-adicionar'));
            escolherAutor(linhas()[i], 1);
        }
        marcar(linhas()[0], 'Autor');
        marcar(linhas()[1], 'Tradutor');
        document.getElementById('form-livro').requestSubmit();
        await esperar();
        assert.deepEqual(db.livros.find((l) => l.id === 8).autoriaLivro, [
            { autorId: 1, papeis: ['Autor', 'Tradutor'] },
        ]);
    });

    it('adicionar, marcar e remover deixam o formulário sujo (rastreador)', async () => {
        await editarLivro(8);
        assert.equal(rastreadorLivro.estaSujo(), false);
        clicar(document.getElementById('l-autoria-adicionar'));
        assert.equal(rastreadorLivro.estaSujo(), true);
    });

    it('livro novo abre sem linhas, mesmo depois de editar um livro com autoria', async () => {
        await editarLivro(7);
        assert.equal(linhas().length, 2);
        await toggleModal('modal-livro');
        const conf = document.getElementById('excl-confirmar');
        if (conf && document.getElementById('modal-confirmar-exclusao').style.display === 'flex') {
            conf.click();
            await esperar();
        }
        await prepararNovo('livro');
        await esperar();
        assert.equal(linhas().length, 0);
    });

    it('sem Autor no cadastro, adicionar não cria linha', async () => {
        db.autores = [];
        await editarLivro(8);
        clicar(document.getElementById('l-autoria-adicionar'));
        assert.equal(linhas().length, 0);
    });

    it('Autor que não está no cadastro mantém o id (opção própria) ao salvar', async () => {
        db.livros.find((l) => l.id === 8).autoriaLivro = [{ autorId: 99, papeis: ['Autor'] }];
        await editarLivro(8);
        assert.equal(linhas()[0].querySelector('[data-autoria="autor"]').value, '99');
        document.getElementById('form-livro').requestSubmit();
        await esperar();
        assert.deepEqual(db.livros.find((l) => l.id === 8).autoriaLivro, [
            { autorId: 99, papeis: ['Autor'] },
        ]);
    });
});

describe('Autoria do livro: card, busca e filtros da aba Livros', () => {
    beforeEach(() => {
        semear();
        limparFiltrosLivros();
        renderLivros();
    });

    it('o card mostra a autoria só quando há (nome e papéis)', () => {
        const textos = Array.from(document.querySelectorAll('[data-autoria-livro]')).map((e) =>
            e.textContent.replace(/\s+/g, ' ').trim(),
        );
        assert.equal(textos.length, 2);
        assert.ok(textos[0].includes('Ana Souza (Autor, Tradutor); Bruno Lima (Organizador)'));
        assert.ok(textos[1].includes('Carla Dias (Autor, Ilustrador de capa)'));
    });

    it('a busca acha o livro pelo nome do Autor, sem caixa nem acento', () => {
        setBuscaLivros('bruno');
        assert.deepEqual(getListaVisivelLivros(), [7]);
        setBuscaLivros('CARLA');
        assert.deepEqual(getListaVisivelLivros(), [9]);
    });

    it('os selects de autor e papel não existem mais: a busca por prefixo os substituiu', () => {
        ['filtro-autor-livros', 'filtro-papel-livros'].forEach((id) =>
            assert.equal(document.getElementById(id), null, id),
        );
    });

    it('autor: acha pelo nome; papel: pelo papel; autor:* e -autor:* pela presença', () => {
        setBuscaLivros('autor:ana');
        assert.deepEqual(getListaVisivelLivros(), [7]);
        setBuscaLivros('papel:Organizador');
        assert.deepEqual(getListaVisivelLivros(), [7]);
        setBuscaLivros('papel:Autor');
        assert.deepEqual(getListaVisivelLivros(), [7, 9]);
        setBuscaLivros('-autor:*');
        assert.deepEqual(getListaVisivelLivros(), [8]);
        setBuscaLivros('autor:*');
        assert.deepEqual(getListaVisivelLivros(), [7, 9]);
    });

    it('o vínculo autor@papel exige a pessoa com o papel no mesmo livro', () => {
        setBuscaLivros('autor:Ana@Tradutor');
        assert.deepEqual(getListaVisivelLivros(), [7]);
        // Ana tem Autor e Tradutor, não Organizador; quem organiza é o Bruno.
        setBuscaLivros('autor:Ana@Organizador');
        assert.deepEqual(getListaVisivelLivros(), []);
        setBuscaLivros('autor:Ana papel:Organizador');
        assert.deepEqual(getListaVisivelLivros(), [7]);
        setBuscaLivros('autor:Bruno@Organizador');
        assert.deepEqual(getListaVisivelLivros(), [7]);
    });

    it('Limpar filtros esvazia a busca e a contagem mostra "N de M"', () => {
        setBuscaLivros('autor:carla');
        assert.match(document.getElementById('contagem-livros').textContent, /1 de 3 livros/);
        limparFiltrosLivros();
        assert.equal(document.getElementById('filtro-busca-livros').value, '');
        assert.deepEqual(getListaVisivelLivros(), [7, 8, 9]);
    });
});

describe('Autoria do livro: Ver do Livro', () => {
    beforeEach(async () => {
        semear();
        if (aberto('modal-visualizar-livro')) await toggleModal('modal-visualizar-livro');
    });

    const conteudo = () => document.getElementById('visualizar-livro-conteudo');

    it('mostra a Autoria do livro com os papéis', async () => {
        await abrirVisualizacaoLivro(7, { navegar: false });
        const lista = conteudo().querySelector('[data-autoria-propria]');
        assert.ok(lista);
        const texto = lista.textContent.replace(/\s+/g, ' ');
        assert.ok(texto.includes('Ana Souza (Autor, Tradutor)'));
        assert.ok(texto.includes('Bruno Lima (Organizador)'));
    });

    it('livro sem autoria não tem a seção Autoria', async () => {
        await abrirVisualizacaoLivro(8, { navegar: false });
        assert.equal(conteudo().querySelector('[data-autoria-propria]'), null);
        assert.equal(conteudo().querySelector('[data-autoria-dos-textos]'), null);
    });

    it('"Autores dos textos deste livro" é derivado dos textos e separado da autoria', async () => {
        db.poemas = [
            { id: 1, titulo: 'P1', livrosIds: [8], autoria: [{ autorId: 3, papel: 'Autor' }] },
            { id: 2, titulo: 'P2', livrosIds: [8], autoria: [{ autorId: 3, papel: 'Autor' }] },
            { id: 3, titulo: 'P3', livrosIds: [8], autoria: [{ autorId: 1, papel: 'Autor' }] },
        ];
        await abrirVisualizacaoLivro(8, { navegar: false });
        assert.equal(conteudo().querySelector('[data-autoria-propria]'), null);
        const derivado = conteudo().querySelector('[data-autoria-dos-textos]');
        assert.ok(derivado);
        const texto = derivado.textContent.replace(/\s+/g, ' ');
        assert.ok(texto.indexOf('Carla Dias (2 textos)') < texto.indexOf('Ana Souza (1 texto)'));
        // Só leitura: nada gravado no livro.
        assert.equal(db.livros.find((l) => l.id === 8).autoriaLivro, undefined);
    });

    it('escapa HTML no nome do Autor', async () => {
        db.autores[0].nome = '<b>Ana</b>';
        await abrirVisualizacaoLivro(7, { navegar: false });
        assert.equal(conteudo().querySelector('[data-autoria-propria] b'), null);
        assert.ok(
            conteudo().querySelector('[data-autoria-propria]').textContent.includes('<b>Ana</b>'),
        );
    });
});
