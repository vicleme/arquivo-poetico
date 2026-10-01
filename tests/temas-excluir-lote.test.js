import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// "Excluir temas sem texto" (aba Temas) e "Excluir todos os assuntos"
// (aba Assuntos): lógica pura em temas.js + fluxo de confirmação/Desfazer
// em forms.js, com DOM real (happy-dom).
document.body.innerHTML = '<main></main>';

const { db } = await import('../js/db.js');
const {
    temasSemTexto,
    resumoExclusaoTemasSemTexto,
    excluirTemasSemTexto,
    excluirTodosAssuntos,
    sincronizarTemas,
} = await import('../js/temas.js');
const { excluirTemasSemTextoComConfirmacao, excluirTodosAssuntosComConfirmacao } =
    await import('../js/forms.js');

function novoBanco() {
    return {
        poemas: [{ id: 1, titulo: 'A', sinalizacoesTema: 'Amor' }],
        prosas: [{ id: 2, titulo: 'B', sinalizacoesTema: 'Machismo' }],
        temas: [
            { id: 101, nome: 'Amor', notas: '' },
            { id: 102, nome: 'Fantasma', notas: 'nota do fantasma' },
            { id: 103, nome: 'Machismo', notas: '' },
            { id: 104, nome: 'Silêncio', notas: '' },
        ],
        assuntos: [
            { id: 10, nome: 'Afetos', notas: '', temaIds: [101, 102] },
            { id: 11, nome: 'Sociedade', notas: '', temaIds: [103, 104, 102] },
            { id: 12, nome: 'Vazio', notas: '', temaIds: [] },
        ],
    };
}

const nomes = (lista) => lista.map((t) => t.nome);

describe('temasSemTexto / resumoExclusaoTemasSemTexto', () => {
    it('separa os temas que nenhum texto usa dos que estão em uso', () => {
        const banco = novoBanco();
        assert.deepEqual(nomes(temasSemTexto(banco)), ['Fantasma', 'Silêncio']);
        assert.deepEqual(resumoExclusaoTemasSemTexto(banco), { excluir: 2, manter: 2 });
    });

    it('compara sem caixa nem acento (silencio usado por um texto conta como em uso)', () => {
        const banco = novoBanco();
        banco.poemas.push({ id: 5, titulo: 'C', sinalizacoesTema: 'silencio' });
        assert.deepEqual(nomes(temasSemTexto(banco)), ['Fantasma']);
    });

    it('todos em uso: nada a excluir', () => {
        const banco = novoBanco();
        banco.poemas[0].sinalizacoesTema = 'Amor, Fantasma, Silêncio';
        assert.deepEqual(resumoExclusaoTemasSemTexto(banco), { excluir: 0, manter: 4 });
    });
});

describe('excluirTemasSemTexto', () => {
    it('remove só os temas sem texto e os tira das listas dos Assuntos', () => {
        const banco = novoBanco();
        const r = excluirTemasSemTexto(banco);
        assert.equal(r.excluidos, 2);
        assert.equal(r.manter, 2);
        assert.deepEqual(nomes(banco.temas), ['Amor', 'Machismo']);
        assert.deepEqual(banco.assuntos[0].temaIds, [101]);
        assert.deepEqual(banco.assuntos[1].temaIds, [103]);
    });

    it('não altera nenhum texto', () => {
        const banco = novoBanco();
        const antes = JSON.stringify([banco.poemas, banco.prosas]);
        excluirTemasSemTexto(banco);
        assert.equal(JSON.stringify([banco.poemas, banco.prosas]), antes);
    });

    it('desfazer devolve os temas (com notas) nas posições e nas listas de origem', () => {
        const banco = novoBanco();
        const antes = JSON.stringify(banco);
        const r = excluirTemasSemTexto(banco);
        r.desfazer();
        assert.equal(JSON.stringify(banco), antes);
        assert.equal(banco.temas[1].notas, 'nota do fantasma');
    });

    it('sem candidatos, não muda nada e não oferece desfazer', () => {
        const banco = novoBanco();
        banco.poemas[0].sinalizacoesTema = 'Amor, Fantasma, Silêncio';
        const antes = JSON.stringify(banco);
        const r = excluirTemasSemTexto(banco);
        assert.equal(r.excluidos, 0);
        assert.equal(r.desfazer, undefined);
        assert.equal(JSON.stringify(banco), antes);
    });

    it('mantém a mesma referência do array db.temas (edição no lugar)', () => {
        const banco = novoBanco();
        const ref = banco.temas;
        excluirTemasSemTexto(banco);
        assert.equal(banco.temas, ref);
    });

    it('banco só de temas soltos (sem textos): apaga tudo', () => {
        const banco = { poemas: [], prosas: [], assuntos: [], temas: novoBanco().temas };
        const r = excluirTemasSemTexto(banco);
        assert.equal(r.excluidos, 4);
        assert.equal(banco.temas.length, 0);
    });
});

describe('excluirTodosAssuntos', () => {
    it('esvazia os Assuntos sem tocar em Temas nem em textos', () => {
        const banco = novoBanco();
        const temasAntes = JSON.stringify(banco.temas);
        const textosAntes = JSON.stringify([banco.poemas, banco.prosas]);
        const r = excluirTodosAssuntos(banco);
        assert.equal(r.excluidos, 3);
        assert.equal(banco.assuntos.length, 0);
        assert.equal(JSON.stringify(banco.temas), temasAntes);
        assert.equal(JSON.stringify([banco.poemas, banco.prosas]), textosAntes);
    });

    it('preserva as sobrescritas de papel do texto e o desfazer devolve tudo em ordem', () => {
        const banco = novoBanco();
        banco.poemas[0].assuntosPapel = [{ assuntoId: 10, papel: 'secundario' }];
        const antes = JSON.stringify(banco);
        const r = excluirTodosAssuntos(banco);
        assert.deepEqual(banco.poemas[0].assuntosPapel, [{ assuntoId: 10, papel: 'secundario' }]);
        r.desfazer();
        assert.equal(JSON.stringify(banco), antes);
    });

    it('sem Assuntos, não faz nada', () => {
        const banco = { ...novoBanco(), assuntos: [] };
        const r = excluirTodosAssuntos(banco);
        assert.equal(r.excluidos, 0);
        assert.equal(r.desfazer, undefined);
    });
});

// ─── Fluxo com confirmação e toast de Desfazer ──────────────────────────

function preparar() {
    Object.assign(db, novoBanco());
    document.getElementById('modal-confirmar-exclusao')?.remove();
    document.querySelectorAll('button').forEach((b) => {
        if (b.textContent.trim() === 'Desfazer') b.closest('div')?.remove();
    });
    sincronizarTemas(db);
}

const clicar = (id) => document.getElementById(id).click();
const modalAberto = () => {
    const m = document.getElementById('modal-confirmar-exclusao');
    return !!m && m.style.display !== 'none';
};
const botaoDesfazer = () =>
    [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Desfazer');

describe('excluirTemasSemTextoComConfirmacao', () => {
    beforeEach(preparar);

    it('pergunta antes, dizendo quantos saem e quantos ficam; cancelar não exclui', () => {
        excluirTemasSemTextoComConfirmacao();
        assert.ok(modalAberto());
        const texto = document.getElementById('modal-confirmar-exclusao').textContent;
        assert.match(texto, /Excluir 2 temas sem texto\?/);
        assert.match(texto, /2 temas ficam, porque algum texto os usa/);
        clicar('excl-cancelar');
        assert.equal(db.temas.length, 4);
    });

    it('confirmar exclui só os sem texto e o Desfazer restaura', () => {
        excluirTemasSemTextoComConfirmacao();
        clicar('excl-confirmar');
        assert.deepEqual(nomes(db.temas), ['Amor', 'Machismo']);
        const desfazer = botaoDesfazer();
        assert.ok(desfazer, 'toast com Desfazer');
        desfazer.click();
        assert.deepEqual(nomes(db.temas), ['Amor', 'Fantasma', 'Machismo', 'Silêncio']);
        assert.deepEqual(db.assuntos[0].temaIds, [101, 102]);
    });

    it('sem tema sem texto, avisa e não abre confirmação', () => {
        db.poemas[0].sinalizacoesTema = 'Amor, Fantasma, Silêncio';
        sincronizarTemas(db);
        excluirTemasSemTextoComConfirmacao();
        assert.equal(modalAberto(), false);
        assert.equal(db.temas.length, 4);
    });
});

describe('excluirTodosAssuntosComConfirmacao', () => {
    beforeEach(preparar);

    it('confirmar esvazia os Assuntos e o Desfazer devolve todos', () => {
        excluirTodosAssuntosComConfirmacao();
        assert.ok(modalAberto());
        assert.match(
            document.getElementById('modal-confirmar-exclusao').textContent,
            /Excluir todos os 3 assuntos\?/,
        );
        clicar('excl-confirmar');
        assert.equal(db.assuntos.length, 0);
        assert.equal(db.temas.length, 4);
        botaoDesfazer().click();
        assert.deepEqual(
            db.assuntos.map((a) => a.nome),
            ['Afetos', 'Sociedade', 'Vazio'],
        );
    });

    it('cancelar não exclui nada', () => {
        excluirTodosAssuntosComConfirmacao();
        clicar('excl-cancelar');
        assert.equal(db.assuntos.length, 3);
    });

    it('sem Assuntos, não abre confirmação', () => {
        db.assuntos = [];
        excluirTodosAssuntosComConfirmacao();
        assert.equal(modalAberto(), false);
    });
});
