import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Uso de IA do livro, entrega 2 (tela): seção no modal do Livro, salvar e editar,
// linha no card, filtro da aba e seção do Ver. Modal e salvar reais.

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
const { renderLivros, setFiltroUsoIaLivros, limparFiltrosLivros, getListaVisivelLivros } =
    await import('../js/render-listas.js');
const { abrirVisualizacaoLivro } = await import('../js/visualizar-livro.js');

registrarModal('modal-livro', 'modal-livro.html', initFormLivro, rastreadorLivro);
registrarModal('modal-visualizar-livro', 'modal-visualizar-livro.html', () => {});

const aberto = (id) => {
    const el = document.getElementById(id);
    return !!el && !el.classList.contains('hidden');
};
const esperar = () => new Promise((r) => setTimeout(r, 30));
const linhas = () => Array.from(document.querySelectorAll('#l-uso-ia-lista [data-uso-linha]'));
const clicar = (el) => el.dispatchEvent(new window.Event('click', { bubbles: true }));
const campo = (linha, n) => linha.querySelector(`[data-uso="${n}"]`);
const por = (el, valor) => {
    el.value = valor;
    el.dispatchEvent(new window.Event('input', { bubbles: true }));
    el.dispatchEvent(new window.Event('change', { bubbles: true }));
};
const estado = (v) => por(document.getElementById('l-uso-ia-estado'), v);

function semear() {
    localStorage.clear();
    db.autores = [];
    db.poemas = [{ id: 5, titulo: 'Poema Cinco' }];
    db.prosas = [{ id: 5, titulo: 'Prosa Cinco' }];
    db.livros = [
        {
            id: 7,
            titulo: 'Livro Sete',
            sequencia: 1,
            tipo: 'Inéditos',
            usoIa: {
                estado: 'usou',
                usos: [
                    {
                        onde: 'Capa',
                        ferramenta: 'Midjourney',
                        modelo: 'v6',
                        descricao: 'Gerei a capa',
                        data: { mes: 3, ano: 2025 },
                        texto: { tipo: 'poema', id: 5 },
                        como: 'Gerou do zero',
                    },
                ],
                nota: 'Só na capa.',
            },
        },
        { id: 8, titulo: 'Livro Oito', sequencia: 2, tipo: 'Inéditos' },
        {
            id: 9,
            titulo: 'Livro Nove',
            sequencia: 3,
            tipo: 'Inéditos',
            usoIa: { estado: 'nao-usou' },
        },
    ];
    db.partes = [];
    db.secoes = [];
    db.itensColetanea = [];
    db.elementos = [];
}

describe('Uso de IA do livro: modal, salvar e editar', () => {
    beforeEach(async () => {
        semear();
        rastreadorLivro.marcarLimpo();
        for (const id of ['modal-livro', 'modal-visualizar-livro']) {
            if (aberto(id)) await toggleModal(id);
        }
        const conf = document.getElementById('modal-confirmar-exclusao');
        if (conf) conf.style.display = 'none';
    });

    it('livro sem registro abre em Não informado, sem linhas e com o bloco escondido', async () => {
        await editarLivro(8);
        assert.equal(document.getElementById('l-uso-ia-estado').value, '');
        assert.equal(linhas().length, 0);
        assert.ok(document.getElementById('l-uso-ia-bloco').classList.contains('hidden'));
    });

    it('Editar carrega estado, uso e nota', async () => {
        await editarLivro(7);
        assert.equal(document.getElementById('l-uso-ia-estado').value, 'usou');
        assert.equal(document.getElementById('l-uso-ia-bloco').classList.contains('hidden'), false);
        const [l] = linhas();
        assert.equal(campo(l, 'onde').value, 'Capa');
        assert.equal(campo(l, 'ferramenta').value, 'Midjourney');
        assert.equal(campo(l, 'mes').value, '3');
        assert.equal(campo(l, 'ano').value, '2025');
        assert.equal(campo(l, 'texto').value, 'poema:5');
        assert.equal(campo(l, 'como').value, 'Gerou do zero');
        assert.equal(document.getElementById('l-uso-ia-nota').value, 'Só na capa.');
        assert.equal(document.getElementById('l-uso-ia-contagem').textContent, '1 uso');
    });

    it('"Como foi usada" é o último campo da linha', async () => {
        await editarLivro(7);
        const campos = Array.from(linhas()[0].querySelectorAll('[data-uso]')).map(
            (e) => e.dataset.uso,
        );
        assert.equal(campos[campos.length - 1], 'como');
    });

    it('escolher Usou numa lista vazia abre a primeira linha; salvar grava o uso', async () => {
        await editarLivro(8);
        estado('usou');
        assert.equal(linhas().length, 1);
        por(campo(linhas()[0], 'onde'), 'Revisão');
        por(campo(linhas()[0], 'ferramenta'), 'Claude');
        por(campo(linhas()[0], 'ano'), '2026');
        por(campo(linhas()[0], 'texto'), 'prosa:5');
        document.getElementById('form-livro').requestSubmit();
        await esperar();
        assert.equal(aberto('modal-livro'), false);
        assert.deepEqual(db.livros.find((l) => l.id === 8).usoIa, {
            estado: 'usou',
            usos: [
                {
                    onde: 'Revisão',
                    ferramenta: 'Claude',
                    data: { ano: 2026 },
                    texto: { tipo: 'prosa', id: 5 },
                },
            ],
        });
    });

    it('uso sem "onde" recusa o salvar', async () => {
        await editarLivro(8);
        estado('usou');
        por(campo(linhas()[0], 'ferramenta'), 'Claude');
        document.getElementById('form-livro').requestSubmit();
        await esperar();
        assert.equal(aberto('modal-livro'), true);
        assert.equal('usoIa' in db.livros.find((l) => l.id === 8), false);
    });

    it('editar sem mexer não apaga o uso de IA', async () => {
        const antes = JSON.stringify(db.livros.find((l) => l.id === 7).usoIa);
        await editarLivro(7);
        document.getElementById('form-livro').requestSubmit();
        await esperar();
        assert.deepEqual(db.livros.find((l) => l.id === 7).usoIa, JSON.parse(antes));
    });

    it('trocar para Não usou descarta os usos; Não informado sem nota remove a chave', async () => {
        await editarLivro(7);
        estado('nao-usou');
        document.getElementById('form-livro').requestSubmit();
        await esperar();
        assert.deepEqual(db.livros.find((l) => l.id === 7).usoIa, {
            estado: 'nao-usou',
            nota: 'Só na capa.',
        });
        await editarLivro(9);
        estado('');
        document.getElementById('form-livro').requestSubmit();
        await esperar();
        assert.equal('usoIa' in db.livros.find((l) => l.id === 9), false);
    });

    it('remover a linha tira o uso e avisa o rastreador', async () => {
        await editarLivro(7);
        assert.equal(rastreadorLivro.temAlteracao?.() ?? false, false);
        clicar(linhas()[0].querySelector('[data-uso-acao="remover"]'));
        assert.equal(linhas().length, 0);
        assert.equal(document.getElementById('l-uso-ia-contagem').textContent, 'Nenhum uso');
    });

    it('Livro novo começa zerado', async () => {
        await editarLivro(7);
        await toggleModal('modal-livro');
        await prepararNovo('livro');
        assert.equal(document.getElementById('l-uso-ia-estado').value, '');
        assert.equal(linhas().length, 0);
        assert.equal(document.getElementById('l-uso-ia-nota').value, '');
    });
});

describe('Uso de IA do livro: card, filtro e Ver', () => {
    beforeEach(async () => {
        semear();
        limparFiltrosLivros();
        for (const id of ['modal-livro', 'modal-visualizar-livro']) {
            if (aberto(id)) await toggleModal(id);
        }
    });

    it('o card mostra a linha só quando há registro', () => {
        renderLivros();
        const cards = Array.from(document.querySelectorAll('#lista-livros [data-uso-ia-livro]'));
        const textos = cards.map((c) => c.textContent);
        assert.equal(textos.length, 2);
        assert.match(textos[0], /Usou: Capa: Midjourney v6, 03\/2025 \(Gerou do zero\)/);
        assert.match(textos[1], /Não usou/);
    });

    it('o filtro separa Usou, Não usou e Não informado, e Limpar zera', () => {
        setFiltroUsoIaLivros('usou');
        assert.deepEqual(getListaVisivelLivros(), [7]);
        setFiltroUsoIaLivros('nao-usou');
        assert.deepEqual(getListaVisivelLivros(), [9]);
        setFiltroUsoIaLivros('nao-informado');
        assert.deepEqual(getListaVisivelLivros(), [8]);
        limparFiltrosLivros();
        assert.equal(getListaVisivelLivros().length, 3);
        assert.equal(document.getElementById('filtro-uso-ia-livros').value, '');
    });

    it('o Ver mostra a seção com o texto do acervo e a nota; Não informado não mostra', async () => {
        await abrirVisualizacaoLivro(7);
        const c = document.getElementById('visualizar-livro-conteudo');
        assert.match(c.textContent, /Uso de IA/);
        assert.match(c.textContent, /Midjourney v6/);
        assert.match(c.textContent, /Gerei a capa/);
        assert.match(c.textContent, /Texto do acervo: Poema Cinco/);
        assert.match(c.textContent, /Só na capa\./);
        await abrirVisualizacaoLivro(8);
        assert.doesNotMatch(
            document.getElementById('visualizar-livro-conteudo').textContent,
            /Uso de IA/,
        );
    });

    it('escapa HTML na descrição', async () => {
        db.livros[1].usoIa = {
            estado: 'usou',
            usos: [{ onde: 'X', descricao: '<img src=x onerror=1>' }],
        };
        await abrirVisualizacaoLivro(8);
        assert.equal(document.querySelector('#visualizar-livro-conteudo img[src="x"]'), null);
    });
});
