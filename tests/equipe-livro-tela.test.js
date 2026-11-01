import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Equipe e créditos do livro, etapa 6, entrega 3 (tela): seção no modal do Livro,
// salvar e editar, linha no card, busca e filtros da aba Livros e a seção do Ver.
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
const { abrirVisualizacaoLivro, renderEquipeLivroHtml } = await import('../js/visualizar-livro.js');

registrarModal('modal-livro', 'modal-livro.html', initFormLivro, rastreadorLivro);
registrarModal('modal-visualizar-livro', 'modal-visualizar-livro.html', () => {});

const aberto = (id) => {
    const el = document.getElementById(id);
    return !!el && !el.classList.contains('hidden');
};
const esperar = () => new Promise((r) => setTimeout(r, 30));
const linhas = () => Array.from(document.querySelectorAll('#l-equipe-lista [data-equipe-linha]'));
const papeisDe = (linha) => Array.from(linha.querySelectorAll('[data-equipe-papel]'));
const clicar = (el) => el.dispatchEvent(new window.Event('click', { bubbles: true }));
const mudar = (el, valor) => {
    el.value = valor;
    el.dispatchEvent(new window.Event('change', { bubbles: true }));
};
const escolherPessoa = (linha, id) =>
    mudar(linha.querySelector('[data-equipe="colaborador"]'), String(id));
const definirPapel = (linhaPapel, papel, escopo = '') => {
    mudar(linhaPapel.querySelector('[data-equipe="papel"]'), papel);
    linhaPapel.querySelector('[data-equipe="escopo"]').value = escopo;
};
const salvar = async () => {
    document.getElementById('form-livro').requestSubmit();
    await esperar();
};

function semear() {
    localStorage.clear();
    db.autores = [];
    db.colaboradores = [
        { id: 1, nome: 'Ana Souza', papeisHabituais: [], contato: '' },
        { id: 2, nome: 'Bruno Lima', papeisHabituais: [], contato: '' },
        { id: 3, nome: 'Carla Dias', papeisHabituais: [], contato: '' },
    ];
    db.livros = [
        {
            id: 7,
            titulo: 'Livro Sete',
            sequencia: 1,
            tipo: 'Coletânea',
            equipeLivro: [
                {
                    colaboradorId: 1,
                    papeis: [{ papel: 'Ilustrador', escopo: 'Capa' }, { papel: 'Revisor' }],
                },
                { colaboradorId: 2, papeis: [{ papel: 'Diagramador' }] },
            ],
        },
        { id: 8, titulo: 'Livro Oito', sequencia: 2, tipo: 'Inéditos' },
        {
            id: 9,
            titulo: 'Livro Nove',
            sequencia: 3,
            tipo: 'Inéditos',
            equipeLivro: [{ colaboradorId: 3, papeis: [{ papel: 'Tipógrafo', escopo: 'Miolo' }] }],
        },
    ];
    db.partes = [];
    db.secoes = [];
    db.poemas = [];
    db.prosas = [];
    db.itensColetanea = [];
    db.elementos = [];
}

describe('Equipe e créditos: modal, salvar e editar', () => {
    beforeEach(async () => {
        semear();
        rastreadorLivro.marcarLimpo();
        for (const id of ['modal-livro', 'modal-visualizar-livro']) {
            if (aberto(id)) await toggleModal(id);
        }
        const conf = document.getElementById('modal-confirmar-exclusao');
        if (conf) conf.style.display = 'none';
    });

    it('o modal tem a seção, com o botão de adicionar e as listas de sugestão', async () => {
        await editarLivro(8);
        assert.ok(document.getElementById('l-equipe-lista'));
        assert.ok(document.getElementById('l-equipe-adicionar'));
        assert.ok(document.getElementById('sugestoes-papel-equipe-livro'));
        assert.ok(document.getElementById('sugestoes-escopo-equipe-livro'));
        assert.equal(linhas().length, 0);
        assert.equal(document.getElementById('l-equipe-contagem').textContent, 'Ninguém');
    });

    it('as sugestões de escopo têm as fixas mais as já usadas', async () => {
        await editarLivro(8);
        const escopos = Array.from(
            document.querySelectorAll('#sugestoes-escopo-equipe-livro option'),
        ).map((o) => o.value);
        assert.deepEqual(escopos, ['Capa', 'Miolo', 'Capa e miolo', 'Capitulares', 'Encarte']);
        const livres = Array.from(
            document.querySelectorAll('#sugestoes-papel-equipe-livro option'),
        ).map((o) => o.value);
        assert.deepEqual(livres, ['Tipógrafo']);
    });

    it('Editar carrega as pessoas, os papéis e os escopos', async () => {
        await editarLivro(7);
        assert.equal(linhas().length, 2);
        const [a, b] = linhas();
        assert.equal(a.querySelector('[data-equipe="colaborador"]').value, '1');
        const [p1, p2] = papeisDe(a);
        assert.equal(p1.querySelector('[data-equipe="papel"]').value, 'Ilustrador');
        assert.equal(p1.querySelector('[data-equipe="escopo"]').value, 'Capa');
        assert.equal(p2.querySelector('[data-equipe="papel"]').value, 'Revisor');
        assert.equal(p2.querySelector('[data-equipe="escopo"]').value, '');
        assert.equal(papeisDe(b).length, 1);
        assert.equal(document.getElementById('l-equipe-contagem').textContent, '2 pessoas');
    });

    it('papel livre abre como "Outro", com o texto no campo', async () => {
        await editarLivro(9);
        const [p] = papeisDe(linhas()[0]);
        assert.equal(p.querySelector('[data-equipe="papel"]').value, '__outro__');
        const outro = p.querySelector('[data-equipe="papel-outro"]');
        assert.equal(outro.value, 'Tipógrafo');
        assert.equal(outro.classList.contains('hidden'), false);
    });

    it('escolher "Outro" mostra o campo de texto; trocar de volta esconde e limpa', async () => {
        await editarLivro(8);
        clicar(document.getElementById('l-equipe-adicionar'));
        const [p] = papeisDe(linhas()[0]);
        const outro = p.querySelector('[data-equipe="papel-outro"]');
        assert.equal(outro.classList.contains('hidden'), true);
        mudar(p.querySelector('[data-equipe="papel"]'), '__outro__');
        assert.equal(outro.classList.contains('hidden'), false);
        outro.value = 'Letrista';
        mudar(p.querySelector('[data-equipe="papel"]'), 'Editor');
        assert.equal(outro.classList.contains('hidden'), true);
        assert.equal(outro.value, '');
    });

    it('adicionar pessoa, papéis e escopos e salvar grava equipeLivro', async () => {
        await editarLivro(8);
        clicar(document.getElementById('l-equipe-adicionar'));
        assert.equal(linhas().length, 1);
        const linha = linhas()[0];
        escolherPessoa(linha, 2);
        definirPapel(papeisDe(linha)[0], 'Capista', 'Capa');
        clicar(linha.querySelector('[data-equipe-acao="adicionar-papel"]'));
        const p2 = papeisDe(linha)[1];
        mudar(p2.querySelector('[data-equipe="papel"]'), '__outro__');
        p2.querySelector('[data-equipe="papel-outro"]').value = 'Letrista';
        await salvar();
        assert.equal(aberto('modal-livro'), false);
        assert.deepEqual(db.livros.find((l) => l.id === 8).equipeLivro, [
            {
                colaboradorId: 2,
                papeis: [{ papel: 'Capista', escopo: 'Capa' }, { papel: 'Letrista' }],
            },
        ]);
    });

    it('o mesmo papel com escopos diferentes é mantido', async () => {
        await editarLivro(8);
        clicar(document.getElementById('l-equipe-adicionar'));
        const linha = linhas()[0];
        escolherPessoa(linha, 1);
        definirPapel(papeisDe(linha)[0], 'Ilustrador', 'Capa');
        clicar(linha.querySelector('[data-equipe-acao="adicionar-papel"]'));
        definirPapel(papeisDe(linha)[1], 'Ilustrador', 'Miolo');
        await salvar();
        assert.deepEqual(db.livros.find((l) => l.id === 8).equipeLivro, [
            {
                colaboradorId: 1,
                papeis: [
                    { papel: 'Ilustrador', escopo: 'Capa' },
                    { papel: 'Ilustrador', escopo: 'Miolo' },
                ],
            },
        ]);
    });

    it('o x do papel tira só aquele papel', async () => {
        await editarLivro(7);
        const linha = linhas()[0];
        clicar(papeisDe(linha)[0].querySelector('[data-equipe-acao="remover-papel"]'));
        assert.equal(papeisDe(linha).length, 1);
        await salvar();
        assert.deepEqual(db.livros.find((l) => l.id === 7).equipeLivro[0].papeis, [
            { papel: 'Revisor' },
        ]);
    });

    it('pessoa sem papel: recusa o salvar, avisa e não grava nada', async () => {
        await editarLivro(8);
        clicar(document.getElementById('l-equipe-adicionar'));
        escolherPessoa(linhas()[0], 1);
        document.getElementById('l-titulo').value = 'Não pode gravar';
        await salvar();
        assert.equal(aberto('modal-livro'), true);
        assert.equal(db.livros.find((l) => l.id === 8).titulo, 'Livro Oito');
        assert.equal(db.livros.find((l) => l.id === 8).equipeLivro, undefined);
    });

    it('só escopo, sem papel, também recusa', async () => {
        await editarLivro(8);
        clicar(document.getElementById('l-equipe-adicionar'));
        escolherPessoa(linhas()[0], 1);
        definirPapel(papeisDe(linhas()[0])[0], '', 'Capa');
        await salvar();
        assert.equal(aberto('modal-livro'), true);
        assert.equal(db.livros.find((l) => l.id === 8).equipeLivro, undefined);
    });

    it('papel sem pessoa também recusa', async () => {
        await editarLivro(8);
        clicar(document.getElementById('l-equipe-adicionar'));
        definirPapel(papeisDe(linhas()[0])[0], 'Editor');
        await salvar();
        assert.equal(aberto('modal-livro'), true);
        assert.equal(db.livros.find((l) => l.id === 8).equipeLivro, undefined);
    });

    it('linha em branco é ignorada: o livro fica sem a chave', async () => {
        await editarLivro(8);
        clicar(document.getElementById('l-equipe-adicionar'));
        await salvar();
        assert.equal(aberto('modal-livro'), false);
        assert.equal('equipeLivro' in db.livros.find((l) => l.id === 8), false);
    });

    it('salvar um livro com equipe sem mexer nela não a perde', async () => {
        await editarLivro(7);
        document.getElementById('l-titulo').value = 'Livro Sete (revisto)';
        await salvar();
        assert.deepEqual(db.livros.find((l) => l.id === 7).equipeLivro, [
            {
                colaboradorId: 1,
                papeis: [{ papel: 'Ilustrador', escopo: 'Capa' }, { papel: 'Revisor' }],
            },
            { colaboradorId: 2, papeis: [{ papel: 'Diagramador' }] },
        ]);
    });

    it('remover a única linha e salvar tira a chave do livro', async () => {
        await editarLivro(9);
        clicar(document.querySelector('[data-equipe-acao="remover"]'));
        await salvar();
        assert.equal('equipeLivro' in db.livros.find((l) => l.id === 9), false);
    });

    it('a mesma pessoa em duas linhas vira um vínculo só, com os papéis somados', async () => {
        await editarLivro(8);
        for (let i = 0; i < 2; i++) {
            clicar(document.getElementById('l-equipe-adicionar'));
            escolherPessoa(linhas()[i], 1);
        }
        definirPapel(papeisDe(linhas()[0])[0], 'Capista');
        definirPapel(papeisDe(linhas()[1])[0], 'Editor');
        await salvar();
        assert.deepEqual(db.livros.find((l) => l.id === 8).equipeLivro, [
            { colaboradorId: 1, papeis: [{ papel: 'Capista' }, { papel: 'Editor' }] },
        ]);
    });

    it('adicionar e remover deixam o formulário sujo (rastreador)', async () => {
        await editarLivro(8);
        assert.equal(rastreadorLivro.estaSujo(), false);
        clicar(document.getElementById('l-equipe-adicionar'));
        assert.equal(rastreadorLivro.estaSujo(), true);
    });

    it('livro novo abre sem linhas, mesmo depois de editar um livro com equipe', async () => {
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

    it('sem Colaborador no cadastro, adicionar não cria linha', async () => {
        db.colaboradores = [];
        await editarLivro(8);
        clicar(document.getElementById('l-equipe-adicionar'));
        assert.equal(linhas().length, 0);
    });

    it('Colaborador que não está no cadastro mantém o id (opção própria) ao salvar', async () => {
        db.livros.find((l) => l.id === 8).equipeLivro = [
            { colaboradorId: 99, papeis: [{ papel: 'Editor' }] },
        ];
        await editarLivro(8);
        assert.equal(linhas()[0].querySelector('[data-equipe="colaborador"]').value, '99');
        await salvar();
        assert.deepEqual(db.livros.find((l) => l.id === 8).equipeLivro, [
            { colaboradorId: 99, papeis: [{ papel: 'Editor' }] },
        ]);
    });

    it('a Autoria e o Uso de IA continuam sendo salvos junto', async () => {
        db.autores = [{ id: 5, nome: 'Autor X' }];
        db.livros.find((l) => l.id === 7).autoriaLivro = [{ autorId: 5, papeis: ['Autor'] }];
        db.livros.find((l) => l.id === 7).usoIa = { estado: 'nao-usou' };
        await editarLivro(7);
        await salvar();
        const l = db.livros.find((x) => x.id === 7);
        assert.deepEqual(l.autoriaLivro, [{ autorId: 5, papeis: ['Autor'] }]);
        assert.equal(l.usoIa.estado, 'nao-usou');
        assert.equal(l.equipeLivro.length, 2);
    });
});

describe('Equipe e créditos: card, busca e filtros da aba Livros', () => {
    beforeEach(() => {
        semear();
        limparFiltrosLivros();
        renderLivros();
    });

    const oculto = (id) => document.getElementById(id).classList.contains('hidden');

    it('o card mostra a equipe só quando há (nome, papel e escopo)', () => {
        const textos = Array.from(document.querySelectorAll('[data-equipe-livro]')).map((e) =>
            e.textContent.replace(/\s+/g, ' ').trim(),
        );
        assert.equal(textos.length, 2);
        assert.ok(
            textos[0].includes('Ana Souza (Ilustrador: Capa, Revisor); Bruno Lima (Diagramador)'),
        );
        assert.ok(textos[1].includes('Carla Dias (Tipógrafo: Miolo)'));
    });

    it('a busca acha o livro pelo nome, papel ou escopo da equipe, sem caixa nem acento', () => {
        setBuscaLivros('bruno');
        assert.deepEqual(getListaVisivelLivros(), [7]);
        setBuscaLivros('TIPOGRAFO');
        assert.deepEqual(getListaVisivelLivros(), [9]);
        setBuscaLivros('ilustrador: capa');
        assert.deepEqual(getListaVisivelLivros(), [7]);
    });

    it('os selects de equipe não existem mais: a busca por prefixo os substituiu', () => {
        ['filtro-equipe-livros', 'filtro-papel-equipe-livros'].forEach((id) =>
            assert.equal(document.getElementById(id), null, id),
        );
    });

    it('equipe: acha pela pessoa; papelequipe: pelo papel; equipe:* e -equipe:* pela presença', () => {
        setBuscaLivros('equipe:ana');
        assert.deepEqual(getListaVisivelLivros(), [7]);
        setBuscaLivros('papelequipe:Tipógrafo');
        assert.deepEqual(getListaVisivelLivros(), [9]);
        setBuscaLivros('papelequipe:Capa');
        assert.deepEqual(getListaVisivelLivros(), []);
        setBuscaLivros('-equipe:*');
        assert.deepEqual(getListaVisivelLivros(), [8]);
        setBuscaLivros('equipe:*');
        assert.deepEqual(getListaVisivelLivros(), [7, 9]);
    });

    it('o vínculo equipe@papel exige a pessoa com o papel no mesmo livro', () => {
        setBuscaLivros('equipe:Ana@Revisor');
        assert.deepEqual(getListaVisivelLivros(), [7]);
        setBuscaLivros('equipe:Ana@Diagramador');
        assert.deepEqual(getListaVisivelLivros(), []);
        setBuscaLivros('equipe:Ana papelequipe:Diagramador');
        assert.deepEqual(getListaVisivelLivros(), [7]);
    });

    it('"Limpar filtros" esvazia a busca', () => {
        setBuscaLivros('equipe:ana');
        limparFiltrosLivros();
        assert.equal(document.getElementById('filtro-busca-livros').value, '');
        assert.equal(getListaVisivelLivros().length, 3);
    });

    it('a busca com prefixo conta como filtro ligado (botão Limpar aparece)', () => {
        assert.equal(oculto('limpar-filtros-livros'), true);
        setBuscaLivros('papelequipe:Revisor');
        assert.equal(oculto('limpar-filtros-livros'), false);
    });
});

describe('Equipe e créditos: Ver do livro', () => {
    beforeEach(async () => {
        semear();
        for (const id of ['modal-livro', 'modal-visualizar-livro']) {
            if (aberto(id)) await toggleModal(id);
        }
    });

    it('mostra a seção com nome, papéis e escopos, e sem ela quando não há equipe', async () => {
        await abrirVisualizacaoLivro(7);
        const conteudo = document.getElementById('visualizar-livro-conteudo');
        const ul = conteudo.querySelector('[data-equipe-livro]');
        assert.ok(ul);
        assert.match(ul.textContent, /Ana Souza/);
        assert.match(ul.textContent, /Ilustrador: Capa, Revisor/);
        assert.match(ul.textContent, /Bruno Lima \(Diagramador\)/);
        assert.match(conteudo.textContent, /Equipe e créditos/);
        await toggleModal('modal-visualizar-livro');
        await abrirVisualizacaoLivro(8);
        assert.equal(
            document
                .getElementById('visualizar-livro-conteudo')
                .querySelector('[data-equipe-livro]'),
            null,
        );
    });

    it('a seção sai vazia sem equipe e escapa HTML', () => {
        assert.equal(renderEquipeLivroHtml([]), '');
        assert.equal(renderEquipeLivroHtml(null), '');
        const saida = renderEquipeLivroHtml([
            {
                colaborador: { nome: '<b>x</b>' },
                papeis: [{ papel: '<i>y</i>', escopo: '<u>z</u>' }],
            },
        ]);
        assert.doesNotMatch(saida, /<b>|<i>|<u>/);
    });
});
