import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// main.js registra o listener de clique delegado em
// document.querySelector('main') já na importação — por isso o esqueleto
// mínimo de DOM (containers que os renderers preenchem via innerHTML)
// precisa existir ANTES do import. Structure baseada no index.html real
// (ver ids), só reduzida ao que os renderers usados aqui realmente tocam.
document.body.innerHTML = `
    <main>
        <div id="lista-livros"></div>
        <div id="lista-grupos"></div>

        <div id="barra-acoes-poemas" class="hidden">
            <span id="contador-selecao-poemas"></span>
        </div>
        <div id="painel-colunas-poemas"></div>
        <select id="filtro-livro-poemas"></select>
        <table>
            <thead><tr id="cabecalho-poemas"></tr></thead>
            <tbody id="lista-poemas"></tbody>
        </table>
        <div id="paginacao-poemas"></div>
    </main>
`;

const { db } = await import('../js/db.js');
const { renderLivros, renderPoemas, renderGrupos, toggleSelecaoPoema } =
    await import('../js/render-listas.js');
const { toggleColuna } = await import('../js/colunas.js');
await import('../js/main.js');

function limparDb() {
    db.livros.length = 0;
    db.poemas.length = 0;
    document.getElementById('modal-confirmar-exclusao')?.remove();
    document.getElementById('avisos-toast')?.remove();
}

describe('Livros — renderização + exclusão (DOM real via happy-dom)', () => {
    beforeEach(limparDb);

    it('renderiza um card com data-action/data-id certos no botão Excluir', () => {
        db.livros.push({ id: 42, titulo: 'Meu Livro', sequencia: 1 });
        renderLivros();

        const btn = document.querySelector('[data-action="excluir-item"]');
        assert.ok(btn, 'botão de excluir deveria existir no DOM');
        assert.equal(btn.dataset.tipo, 'livros');
        assert.equal(btn.dataset.id, '42');
    });

    it('mostra "Nenhum livro encontrado" quando não há livros', () => {
        renderLivros();
        assert.match(
            document.getElementById('lista-livros').textContent,
            /Nenhum livro encontrado/,
        );
    });

    it('clicar em "Excluir" abre o modal de confirmação; confirmar remove o item de verdade', () => {
        db.livros.push({ id: 7, titulo: 'Livro Alvo', sequencia: 1 });
        renderLivros();

        document.querySelector('[data-action="excluir-item"][data-id="7"]').click();

        const overlay = document.getElementById('modal-confirmar-exclusao');
        assert.ok(overlay, 'abrirModalExclusao deveria ter criado o overlay do modal');
        assert.equal(overlay.style.display, 'flex');
        assert.equal(document.getElementById('excl-titulo').textContent, 'Livro Alvo');

        // Integração completa: clique -> deleteItem -> abrirModalExclusao ->
        // onConfirmar -> remoção real do array db.livros.
        document.getElementById('excl-confirmar').click();
        assert.equal(db.livros.length, 0);
    });
});

describe('Poemas — exclusão em massa (DOM real via happy-dom)', () => {
    beforeEach(limparDb);

    it('selecionar 2 poemas e clicar em "Excluir selecionados" remove só os selecionados, com 1 confirmação só', () => {
        db.poemas.push(
            { id: 1, titulo: 'Poema A', sequencia: 1, paiTipo: 'livro', paiId: 999 },
            { id: 2, titulo: 'Poema B', sequencia: 2, paiTipo: 'livro', paiId: 999 },
            { id: 3, titulo: 'Poema C', sequencia: 3, paiTipo: 'livro', paiId: 999 },
        );
        renderPoemas();

        // Seleciona A e B via a mesma função que o checkbox chama (o
        // checkbox em si é só um <input> gerado por template string, sem
        // benefício extra em simular o clique nele especificamente).
        toggleSelecaoPoema(true, 1);
        toggleSelecaoPoema(true, 2);

        excluirSelecaoPoemasGlobal();

        // A ação em massa abre confirmação (mesmo componente de
        // abrirModalConfirmacao usado pelo excluir de item único).
        const overlay = document.getElementById('modal-confirmar-exclusao');
        assert.ok(overlay);
        assert.match(document.getElementById('excl-titulo').textContent, /Excluir 2 poemas/);

        document.getElementById('excl-confirmar').click();

        const idsRestantes = db.poemas.map((p) => p.id);
        assert.deepEqual(idsRestantes, [3], 'só o poema C (não selecionado) deveria sobrar');
    });
});

function excluirSelecaoPoemasGlobal() {
    // window.excluirSelecaoPoemas é exposto por main.js (ver window.X no
    // final do arquivo) — mesma função que o botão da barra chama via
    // onclick="excluirSelecaoPoemas()" no index.html.
    window.excluirSelecaoPoemas();
}

describe('Grupos — bolinha de cor no card (DOM real via happy-dom)', () => {
    beforeEach(() => {
        db.grupos.length = 0;
        db.pessoas.length = 0;
    });

    it('mostra a bolinha com a cor cadastrada do grupo', () => {
        db.grupos.push({ id: 1, nome: 'Amigos', cor: 'emerald' });
        renderGrupos();

        const ponto = document.querySelector('[title="Cor do grupo"]');
        assert.ok(ponto, 'a bolinha de cor deveria estar no card do grupo');
        assert.match(ponto.className, /bg-emerald-500/);
    });

    it('grupo sem cor salva (dado anterior à feature) cai no padrão, sem quebrar', () => {
        db.grupos.push({ id: 1, nome: 'Legado' });
        renderGrupos();

        const ponto = document.querySelector('[title="Cor do grupo"]');
        assert.ok(ponto);
        assert.match(ponto.className, /bg-blue-500/);
    });
});

describe('Poemas — coluna "Grupos" (DOM real via happy-dom)', () => {
    beforeEach(() => {
        limparDb();
        db.pessoas.length = 0;
        db.grupos.length = 0;
        localStorage.clear(); // estado de colunas salvo (ver colunas.js) começaria "vazado" entre testes
    });

    it('coluna desligada por padrão: cabeçalho "Grupos" não aparece', () => {
        db.poemas.push({ id: 1, titulo: 'Poema A', sequencia: 1 });
        renderPoemas();

        assert.doesNotMatch(document.getElementById('cabecalho-poemas').textContent, /Grupos/);
    });

    it('ligar a coluna via toggleColuna mostra o cabeçalho e um badge "Grupo (Pessoa)" por vínculo', () => {
        db.grupos.push({ id: 10, nome: 'Namorado', cor: 'blue' });
        db.pessoas.push({ id: 1, nome: 'Dalton', grupoIds: [10] });
        db.poemas.push({
            id: 1,
            titulo: 'Poema A',
            sequencia: 1,
            pessoas: [{ pessoaId: 1, papeis: [] }],
        });

        toggleColuna('poemas', 'grupos', true);
        renderPoemas();

        assert.match(document.getElementById('cabecalho-poemas').textContent, /Grupos/);
        const celula = document.getElementById('lista-poemas').textContent;
        assert.match(celula, /Namorado/);
        assert.match(celula, /Dalton/);
    });

    it('poema sem ninguém em grupo mostra "—" na coluna, mesmo com pessoas atribuídas', () => {
        db.pessoas.push({ id: 1, nome: 'Sem Grupo', grupoIds: [] });
        db.poemas.push({
            id: 1,
            titulo: 'Poema A',
            sequencia: 1,
            pessoas: [{ pessoaId: 1, papeis: [] }],
        });

        toggleColuna('poemas', 'grupos', true);
        renderPoemas();

        const linha = document.querySelector('#lista-poemas tr');
        assert.match(linha.textContent, /—/);
    });
});
