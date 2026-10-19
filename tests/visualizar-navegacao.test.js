import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Modal "Ver" de Poema e Prosa: botões Anterior e Próximo, seguindo a lista que
// a aba mostra (o main.js registra a lista por tipo; aqui registramos uma de teste).

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const lerModal = (arquivo) =>
    fs.readFileSync(path.resolve(__dirname, '../modais', arquivo), 'utf8');

globalThis.fetch = async (url) => ({
    ok: true,
    status: 200,
    text: async () => lerModal(path.basename(url)),
});

document.body.innerHTML = '<main></main><div id="modais-container"></div>';

const { registrarModal, toggleModal, aoFecharModalUmaVez } = await import('../js/modais.js');
const { db } = await import('../js/db.js');
const {
    abrirVisualizacao,
    navegarVisualizacao,
    irParaPosicaoVisualizacao,
    editarDoModalVisualizacao,
    excluirDoModalVisualizacao,
    registrarListaNavegacaoVisualizacao,
} = await import('../js/visualizar.js');

registrarModal('modal-visualizar', 'modal-visualizar.html', () => {});

let listaPoemas = [];
registrarListaNavegacaoVisualizacao('poema', () => listaPoemas);

const titulo = () => document.getElementById('modal-visualizar-titulo').innerText;
const nav = () => document.getElementById('visualizar-nav');
const posicao = () =>
    `${document.getElementById('visualizar-posicao').value} ${document.getElementById('visualizar-total').textContent}`;
const ant = () => document.getElementById('visualizar-anterior');
const prox = () => document.getElementById('visualizar-proximo');
const aberto = () => !document.getElementById('modal-visualizar').classList.contains('hidden');

describe('modal Ver: marcação da navegação', () => {
    const html = lerModal('modal-visualizar.html');
    it('tem os dois botões ligados a navegarVisualizacao e a caixa de posição', () => {
        assert.match(html, /onclick="navegarVisualizacao\(-1\)"/);
        assert.match(html, /onclick="navegarVisualizacao\(1\)"/);
        assert.match(html, /<input[^>]*id="visualizar-posicao"/);
        assert.match(html, /irParaPosicaoVisualizacao\(this\.value\)/);
    });
});

describe('modal Ver: Editar e Excluir no rodapé', () => {
    const html = lerModal('modal-visualizar.html');
    it('Baixar, Editar e Excluir são só ícone (sem texto), nessa ordem', () => {
        const iBaixar = html.indexOf('id="visualizar-baixar"');
        const iEditar = html.indexOf('editarDoModalVisualizacao()');
        const iExcluir = html.indexOf('excluirDoModalVisualizacao()');
        assert.ok(iBaixar > 0 && iEditar > iBaixar && iExcluir > iEditar);
        for (const id of ['visualizar-baixar', 'visualizar-editar', 'visualizar-excluir']) {
            const m = html.match(new RegExp(`<button[^>]*id="${id}"[\\s\\S]*?</button>`));
            assert.ok(m, id);
            assert.match(m[0], /aria-label=/);
            assert.doesNotMatch(m[0].replace(/<svg[\s\S]*?<\/svg>/, ''), />\s*[A-Za-zÀ-ú]+\s*</);
        }
    });
});

describe('modal Ver: voltar do Editar', () => {
    beforeEach(() => {
        db.poemas = [
            { id: 1, titulo: 'Um', texto: 'a', autoria: [] },
            { id: 2, titulo: 'Dois', texto: 'b', autoria: [] },
            { id: 3, titulo: 'Três', texto: 'c', autoria: [] },
        ];
        listaPoemas = [3, 1, 2];
        document.querySelectorAll('.fixed[id^="modal-"]').forEach((m) => m.classList.add('hidden'));
        document.getElementById('modal-poema')?.remove();
    });
    const tick = () => new Promise((r) => setTimeout(r, 20));
    // O formulário real de Poema não monta no ambiente de teste: o editarPoema
    // falha depois de registrar a volta, então o fechamento é simulado com um
    // elemento no lugar do modal.
    const editarEFechar = async () => {
        await editarDoModalVisualizacao().catch(() => {});
        assert.ok(!aberto(), 'o Ver fecha ao ir editar');
        const stub = document.createElement('div');
        stub.id = 'modal-poema';
        stub.className = 'fixed';
        document.body.appendChild(stub);
        await toggleModal('modal-poema');
        await tick();
    };

    it('ao fechar o formulário, o Ver do mesmo texto reabre, na mesma lista', async () => {
        await abrirVisualizacao('poema', 1, { navegar: true });
        navegarVisualizacao(0);
        await editarEFechar();
        assert.ok(aberto());
        assert.equal(titulo(), 'Um');
        assert.equal(posicao(), '2 de 3');
        navegarVisualizacao(1);
        assert.equal(titulo(), 'Dois');
    });

    it('sem navegação, o Ver reabre sem os botões', async () => {
        await abrirVisualizacao('poema', 1);
        await editarEFechar();
        assert.equal(titulo(), 'Um');
        assert.ok(nav().classList.contains('hidden'));
    });

    it('só vale uma vez: fechar o formulário de novo não reabre o Ver', async () => {
        await abrirVisualizacao('poema', 1, { navegar: true });
        await editarEFechar();
        document.getElementById('modal-visualizar').classList.add('hidden');
        document.getElementById('modal-poema').classList.remove('hidden');
        await toggleModal('modal-poema');
        await tick();
        assert.ok(!aberto());
    });

    it('formulário aberto por outro caminho não reabre o Ver', async () => {
        const stub = document.createElement('div');
        stub.id = 'modal-poema';
        stub.className = 'fixed';
        document.body.appendChild(stub);
        await toggleModal('modal-poema');
        assert.ok(!aberto());
    });

    it('aoFecharModalUmaVez roda no fechamento e depois some', async () => {
        const stub = document.createElement('div');
        stub.id = 'modal-poema';
        stub.className = 'fixed';
        document.body.appendChild(stub);
        let n = 0;
        aoFecharModalUmaVez('modal-poema', () => n++);
        await toggleModal('modal-poema'); // estava aberto: fecha
        assert.equal(n, 1);
        document.getElementById('modal-poema').classList.remove('hidden');
        await toggleModal('modal-poema');
        assert.equal(n, 1);
    });
});

describe('modal Ver: Excluir', () => {
    beforeEach(() => {
        localStorage.clear();
        db.poemas = [
            { id: 1, titulo: 'Um', texto: 'a', autoria: [] },
            { id: 2, titulo: 'Dois', texto: 'b', autoria: [] },
            { id: 3, titulo: 'Três', texto: 'c', autoria: [] },
        ];
        listaPoemas = [1, 2, 3];
        document.querySelectorAll('.fixed[id^="modal-"]').forEach((m) => m.classList.add('hidden'));
    });
    const confirmar = () => document.getElementById('excl-confirmar').click();

    it('confirmada a exclusão, vai para o próximo e o total diminui', async () => {
        await abrirVisualizacao('poema', 2, { navegar: true });
        excluirDoModalVisualizacao();
        assert.equal(titulo(), 'Dois', 'antes de confirmar nada muda');
        confirmar();
        await new Promise((r) => setTimeout(r, 20));
        assert.equal(titulo(), 'Três');
        assert.equal(posicao(), '2 de 2');
        assert.ok(aberto());
        assert.deepEqual(
            db.poemas.map((p) => p.id),
            [1, 3],
        );
    });

    it('se era o último, vai para o anterior', async () => {
        await abrirVisualizacao('poema', 3, { navegar: true });
        excluirDoModalVisualizacao();
        confirmar();
        await new Promise((r) => setTimeout(r, 20));
        assert.equal(titulo(), 'Dois');
        assert.equal(posicao(), '2 de 2');
    });

    it('sem navegação, fecha o modal depois de excluir', async () => {
        await abrirVisualizacao('poema', 2);
        excluirDoModalVisualizacao();
        confirmar();
        await new Promise((r) => setTimeout(r, 20));
        assert.ok(!aberto());
    });

    it('cancelar não exclui nem muda o modal', async () => {
        await abrirVisualizacao('poema', 2, { navegar: true });
        excluirDoModalVisualizacao();
        document.getElementById('excl-cancelar')?.click();
        await new Promise((r) => setTimeout(r, 20));
        assert.equal(db.poemas.length, 3);
        assert.equal(titulo(), 'Dois');
    });
});

describe('modal Ver: Anterior e Próximo', () => {
    beforeEach(() => {
        db.poemas = [
            { id: 1, titulo: 'Um', texto: 'a', autoria: [] },
            { id: 2, titulo: 'Dois', texto: 'b', autoria: [] },
            { id: 3, titulo: 'Três', texto: 'c', autoria: [] },
            { id: 4, titulo: 'Quatro', texto: 'd', autoria: [] },
        ];
        db.prosas = [{ id: 9, titulo: 'Prosa', texto: 'p', autoria: [] }];
        // A lista da aba (filtrada e ordenada) não é a ordem do banco.
        listaPoemas = [3, 1, 4];
        document.querySelectorAll('.fixed[id^="modal-"]').forEach((m) => m.classList.add('hidden'));
    });

    it('segue a ordem da lista filtrada, não a do banco, e mostra a posição', async () => {
        await abrirVisualizacao('poema', 3, { navegar: true });
        assert.equal(titulo(), 'Três');
        assert.equal(posicao(), '1 de 3');
        navegarVisualizacao(1);
        assert.equal(titulo(), 'Um');
        assert.equal(posicao(), '2 de 3');
        navegarVisualizacao(1);
        assert.equal(titulo(), 'Quatro');
        navegarVisualizacao(-1);
        assert.equal(titulo(), 'Um');
    });

    it('navegar não fecha o modal', async () => {
        await abrirVisualizacao('poema', 3, { navegar: true });
        navegarVisualizacao(1);
        assert.ok(aberto());
    });

    it('nas pontas, o botão fica desabilitado e navegar não dá a volta', async () => {
        await abrirVisualizacao('poema', 3, { navegar: true });
        assert.ok(ant().disabled);
        assert.ok(!prox().disabled);
        navegarVisualizacao(-1);
        assert.equal(titulo(), 'Três');
        navegarVisualizacao(1);
        navegarVisualizacao(1);
        assert.ok(prox().disabled);
        navegarVisualizacao(1);
        assert.equal(titulo(), 'Quatro');
    });

    it('sem a opção navegar, ou com um texto só na lista, os botões ficam escondidos', async () => {
        await abrirVisualizacao('poema', 3);
        assert.ok(nav().classList.contains('hidden'));
        document.getElementById('modal-visualizar').classList.add('hidden');
        listaPoemas = [3];
        await abrirVisualizacao('poema', 3, { navegar: true });
        assert.ok(nav().classList.contains('hidden'));
    });

    it('a caixa de posição leva direto ao número digitado, com limites nas pontas', async () => {
        await abrirVisualizacao('poema', 3, { navegar: true });
        irParaPosicaoVisualizacao('3');
        assert.equal(titulo(), 'Quatro');
        assert.equal(posicao(), '3 de 3');
        irParaPosicaoVisualizacao('2');
        assert.equal(titulo(), 'Um');
        irParaPosicaoVisualizacao('99');
        assert.equal(titulo(), 'Quatro');
        irParaPosicaoVisualizacao('0');
        assert.equal(titulo(), 'Três');
        irParaPosicaoVisualizacao('abc');
        assert.equal(titulo(), 'Três');
        assert.equal(document.getElementById('visualizar-posicao').value, '1');
        assert.ok(aberto());
    });

    it('número de um texto apagado cai no existente mais próximo', async () => {
        await abrirVisualizacao('poema', 3, { navegar: true });
        db.poemas = db.poemas.filter((p) => p.id !== 1);
        irParaPosicaoVisualizacao('2');
        assert.equal(titulo(), 'Quatro');
    });

    it('texto fora da lista (ex.: aberto de outro lugar) não ativa a navegação', async () => {
        await abrirVisualizacao('poema', 2, { navegar: true });
        assert.equal(titulo(), 'Dois');
        assert.ok(nav().classList.contains('hidden'));
        navegarVisualizacao(1);
        assert.equal(titulo(), 'Dois');
    });

    it('pula um texto que foi apagado depois da abertura', async () => {
        await abrirVisualizacao('poema', 3, { navegar: true });
        db.poemas = db.poemas.filter((p) => p.id !== 1);
        navegarVisualizacao(1);
        assert.equal(titulo(), 'Quatro');
        assert.equal(posicao(), '3 de 3');
    });

    it('prosa sem lista registrada abre normalmente, sem navegação', async () => {
        await abrirVisualizacao('prosa', 9, { navegar: true });
        assert.equal(titulo(), 'Prosa');
        assert.ok(nav().classList.contains('hidden'));
    });

    it('mantém o formato escolhido no select ao navegar', async () => {
        await abrirVisualizacao('poema', 3, { navegar: true });
        document.getElementById('visualizar-baixar-formato').value = 'pdf';
        navegarVisualizacao(1);
        assert.equal(document.getElementById('visualizar-baixar-formato').value, 'pdf');
    });

    it('seta → navega; com o foco no select, não', async () => {
        await abrirVisualizacao('poema', 3, { navegar: true });
        document.body.dispatchEvent(
            new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
        );
        assert.equal(titulo(), 'Um');
        document
            .getElementById('visualizar-baixar-formato')
            .dispatchEvent(
                new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
            );
        assert.equal(titulo(), 'Um');
        document.body.dispatchEvent(
            new window.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
        );
        assert.equal(titulo(), 'Três');
    });
});
