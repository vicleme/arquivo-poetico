import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
    entradasDeFilaPorAparicao,
    espelhoDesatualizado,
    definirAparicoes,
    reconciliarAparicoesDoTexto,
    sincronizarAparicoesComCamposAntigos,
} from '../js/aparicoes-dado.js';
import { salvarAparicoesDoTexto } from '../js/aparicoes-salvar.js';
import {
    abrirEspaco,
    fecharEspaco,
    getIrmaosPorEscopo,
    proximaPosicaoDoLugar,
    reordenarPosicao,
} from '../js/utils.js';

// Fase 21, 21-2, entrega 1: a lista `aparicoes` é a verdade; o save() a
// reconcilia com o que as telas antigas gravam; as filas de posição enxergam
// as aparições que o Destino não mostra; uma função única grava as linhas do
// modal e renumera cada fila.

const { db, save, deleteItem } = await import('../js/db.js');

const ap = (livroId, parteId, secaoId, sequencia) => ({ livroId, parteId, secaoId, sequencia });

// Livro 1 (Partes 10 e 11, Seção 20 na Parte 10), Livro 2 (Parte 12), Livro 3.
function acervo() {
    return {
        livros: [
            { id: 1, titulo: 'Um', tipo: 'Inéditos' },
            { id: 2, titulo: 'Dois', tipo: 'Inéditos' },
            { id: 3, titulo: 'Três', tipo: 'Inéditos' },
            { id: 9, titulo: 'Antologia', tipo: 'Coletânea' },
        ],
        partes: [
            { id: 10, livroId: 1, titulo: 'A', sequencia: 1 },
            { id: 11, livroId: 1, titulo: 'B', sequencia: 2 },
            { id: 12, livroId: 2, titulo: 'C', sequencia: 1 },
        ],
        secoes: [{ id: 20, paiTipo: 'parte', paiId: 10, titulo: 'S', sequencia: 1 }],
        elementos: [],
        poemas: [],
        prosas: [],
    };
}

const poema = (id, campos = {}) => ({
    id,
    titulo: `p${id}`,
    paiTipo: null,
    paiId: null,
    sequencia: null,
    livrosIds: [],
    ...campos,
});

// ─── Reconciliação: a lista é a verdade ────────────────────────

describe('reconciliarAparicoesDoTexto', () => {
    it('sem diferença, a lista fica como está, inclusive o que o espelho não vê', () => {
        const d = acervo();
        const t = poema(1);
        d.poemas.push(t);
        // Duas aparições com posição: o espelho só sabe dizer a primeira.
        definirAparicoes(d, t, [ap(1, 10, null, 2), ap(2, 12, null, 5)]);
        assert.equal(reconciliarAparicoesDoTexto(d, t), 'igual');
        assert.deepEqual(t.aparicoes, [ap(1, 10, null, 2), ap(2, 12, null, 5)]);
        assert.equal(espelhoDesatualizado(t), false);
    });

    it('a posição renumerada por uma tela antiga chega à aparição certa', () => {
        const d = acervo();
        const t = poema(1);
        d.poemas.push(t);
        definirAparicoes(d, t, [ap(1, 10, null, 2), ap(2, 12, null, 5)]);
        t.sequencia = 3; // a tela antiga empurrou o texto no Destino
        assert.equal(reconciliarAparicoesDoTexto(d, t), 'atualizado');
        assert.deepEqual(t.aparicoes, [ap(1, 10, null, 3), ap(2, 12, null, 5)]);
    });

    it('Destino trocado de lugar substitui a aparição no mesmo ponto da lista', () => {
        const d = acervo();
        const t = poema(1);
        d.poemas.push(t);
        definirAparicoes(d, t, [ap(1, 10, null, 2), ap(2, 12, null, 5)]);
        t.paiTipo = 'parte';
        t.paiId = 11;
        t.sequencia = 1;
        reconciliarAparicoesDoTexto(d, t);
        assert.deepEqual(t.aparicoes, [ap(1, 11, null, 1), ap(2, 12, null, 5)]);
    });

    it('Destino limpo pela tela antiga tira só a aparição do Destino', () => {
        const d = acervo();
        const t = poema(1);
        d.poemas.push(t);
        definirAparicoes(d, t, [ap(1, 10, null, 2), ap(2, 12, null, 5)]);
        t.paiTipo = null;
        t.paiId = null;
        t.sequencia = null;
        reconciliarAparicoesDoTexto(d, t);
        assert.deepEqual(t.aparicoes, [ap(2, 12, null, 5)]);
    });

    it('Destino novo em texto sem Destino entra no fim; o "só consta" do mesmo livro cede', () => {
        const d = acervo();
        const t = poema(1);
        d.poemas.push(t);
        definirAparicoes(d, t, [ap(2, null, null, null), ap(3, null, null, null)]);
        t.paiTipo = 'parte';
        t.paiId = 12;
        t.sequencia = 4;
        t.livrosIds = [3];
        reconciliarAparicoesDoTexto(d, t);
        assert.deepEqual(t.aparicoes, [ap(2, 12, null, 4), ap(3, null, null, null)]);
    });

    it('livro que sai de livrosIds sai da lista; o que entra vira "só consta"', () => {
        const d = acervo();
        const t = poema(1);
        d.poemas.push(t);
        definirAparicoes(d, t, [ap(1, 10, null, 2), ap(2, null, null, null)]);
        t.livrosIds = [3];
        reconciliarAparicoesDoTexto(d, t);
        assert.deepEqual(t.aparicoes, [ap(1, 10, null, 2), ap(3, null, null, null)]);
    });

    it('livro que sai de livrosIds leva a aparição com posição que o espelho listava lá', () => {
        const d = acervo();
        const t = poema(1);
        d.poemas.push(t);
        definirAparicoes(d, t, [ap(1, 10, null, 2), ap(2, 12, null, 5)]);
        assert.deepEqual(t.livrosIds, [2]);
        t.livrosIds = [];
        reconciliarAparicoesDoTexto(d, t);
        assert.deepEqual(t.aparicoes, [ap(1, 10, null, 2)]);
    });

    it('o Desfazer de uma exclusão (campos antigos de volta) devolve a aparição', () => {
        const d = acervo();
        const t = poema(1, { paiTipo: 'parte', paiId: 10, sequencia: 2 });
        d.poemas.push(t);
        sincronizarAparicoesComCamposAntigos(d);
        t.paiTipo = null;
        t.paiId = null;
        t.sequencia = null;
        sincronizarAparicoesComCamposAntigos(d);
        assert.deepEqual(t.aparicoes, []);
        t.paiTipo = 'parte';
        t.paiId = 10;
        t.sequencia = 2;
        sincronizarAparicoesComCamposAntigos(d);
        assert.deepEqual(t.aparicoes, [ap(1, 10, null, 2)]);
    });

    it('limpa aparição que aponta para algo que não existe mais', () => {
        const d = acervo();
        const t = poema(1);
        d.poemas.push(t);
        definirAparicoes(d, t, [ap(1, 10, null, 2), ap(2, 12, null, 5)]);
        d.partes = d.partes.filter((p) => p.id !== 12);
        reconciliarAparicoesDoTexto(d, t);
        assert.deepEqual(t.aparicoes, [ap(1, 10, null, 2)]);
    });

    it('é idempotente e não toca no espelho', () => {
        const d = acervo();
        const t = poema(1, { paiTipo: 'livro', paiId: 1, sequencia: null, livrosIds: [2] });
        d.poemas.push(t);
        sincronizarAparicoesComCamposAntigos(d);
        const antes = JSON.stringify(t);
        assert.deepEqual(sincronizarAparicoesComCamposAntigos(d), { migrados: 0, atualizados: 0 });
        assert.equal(JSON.stringify(t), antes);
        assert.equal(t.paiTipo, 'livro');
    });

    it('a tela antiga sem posição no livro (só consta pelo Destino) não vira diferença', () => {
        const d = acervo();
        const t = poema(1, { paiTipo: 'livro', paiId: 1, sequencia: null });
        d.poemas.push(t);
        sincronizarAparicoesComCamposAntigos(d);
        assert.deepEqual(t.aparicoes, [ap(1, null, null, null)]);
        assert.deepEqual(sincronizarAparicoesComCamposAntigos(d), { migrados: 0, atualizados: 0 });
    });

    it('custa pouco com um acervo grande', () => {
        const d = acervo();
        for (let i = 0; i < 3000; i++) {
            d.poemas.push(poema(1000 + i, { paiTipo: 'parte', paiId: 10, sequencia: i + 1 }));
        }
        sincronizarAparicoesComCamposAntigos(d);
        const t0 = performance.now();
        sincronizarAparicoesComCamposAntigos(d);
        const ms = performance.now() - t0;
        assert.ok(ms < 500, `levou ${ms.toFixed(0)} ms`);
    });
});

// ─── Filas que enxergam as aparições ───────────────────────────

describe('filas de posição com aparições', () => {
    let d;
    let t;
    beforeEach(() => {
        d = acervo();
        t = poema(1);
        d.poemas.push(t);
        // Destino na Parte 10 (posição 2); outra aparição na Parte 12 (posição 5).
        definirAparicoes(d, t, [ap(1, 10, null, 2), ap(2, 12, null, 5)]);
    });

    it('a fila da Parte 12 traz a aparição que o Destino não mostra', () => {
        const fila = getIrmaosPorEscopo(d, 'parte', 12);
        assert.equal(fila.length, 1);
        assert.equal(fila[0]._texto, t);
        assert.equal(fila[0].sequencia, 5);
    });

    it('a fila do Destino traz o texto uma vez só (o objeto dele)', () => {
        const fila = getIrmaosPorEscopo(d, 'parte', 10);
        assert.equal(fila.filter((it) => it === t).length, 1);
        assert.equal(fila.filter((it) => it._texto).length, 0);
    });

    it('a entrada lê e grava a posição da aparição, não a do espelho', () => {
        const [entrada] = getIrmaosPorEscopo(d, 'parte', 12);
        entrada.sequencia = 7;
        assert.equal(t.aparicoes[1].sequencia, 7);
        assert.equal(t.sequencia, 2);
        assert.equal(espelhoDesatualizado(t), false);
    });

    it('serve às três fábricas de fila: Livro, Parte e Seção', () => {
        const u = poema(2);
        d.poemas.push(u);
        definirAparicoes(d, u, [ap(3, null, null, 4), ap(1, 10, 20, 1), ap(2, 12, null, 2)]);
        assert.equal(getIrmaosPorEscopo(d, 'livro', 3).length, 1);
        assert.equal(getIrmaosPorEscopo(d, 'secao', 20).length, 1);
        // O Destino de `u` é o Livro 3 (posição 4): ele mesmo na fila do Livro 3.
        assert.equal(getIrmaosPorEscopo(d, 'livro', 3)[0], u);
        assert.equal(getIrmaosPorEscopo(d, 'secao', 20)[0]._texto, u);
    });

    it('aparição "só consta" no livro não entra na fila', () => {
        const u = poema(2);
        d.poemas.push(u);
        definirAparicoes(d, u, [ap(1, 10, null, 1), ap(3, null, null, null)]);
        assert.deepEqual(entradasDeFilaPorAparicao(d, 'livro', 3), []);
    });

    it('proximaPosicaoDoLugar conta a aparição e ignora as do texto em edição', () => {
        assert.equal(proximaPosicaoDoLugar(d, 'parte', 12), 6);
        assert.equal(proximaPosicaoDoLugar(d, 'parte', 12, t), 1);
    });

    it('texto descartado não conta para a próxima posição', () => {
        t.status = 'descartado';
        assert.equal(proximaPosicaoDoLugar(d, 'parte', 12), 1);
    });

    it('reordenarPosicao, fecharEspaco e abrirEspaco funcionam sobre a entrada', () => {
        const novo = { id: 99, sequencia: null };
        reordenarPosicao([...getIrmaosPorEscopo(d, 'parte', 12), novo], novo, 5, null);
        assert.equal(novo.sequencia, 5);
        assert.equal(t.aparicoes[1].sequencia, 6);
        fecharEspaco(getIrmaosPorEscopo(d, 'parte', 12), 1);
        assert.equal(t.aparicoes[1].sequencia, 5);
        abrirEspaco(getIrmaosPorEscopo(d, 'parte', 12), 1);
        assert.equal(t.aparicoes[1].sequencia, 6);
    });
});

// ─── A função única do modal ───────────────────────────────────

describe('salvarAparicoesDoTexto', () => {
    let d;
    beforeEach(() => {
        d = acervo();
    });

    const coerente = (t) => assert.equal(espelhoDesatualizado(t), false, `espelho de ${t.id}`);

    it('grava as linhas, a lista e o espelho', () => {
        const t = poema(1);
        d.poemas.push(t);
        const r = salvarAparicoesDoTexto(d, t, [
            { livroId: 1, parteId: 10, sequencia: 3 },
            { livroId: 2, parteId: 12, sequencia: 1 },
            { livroId: 3 },
        ]);
        assert.deepEqual(r.aparicoes, [
            ap(1, 10, null, 3),
            ap(2, 12, null, 1),
            ap(3, null, null, null),
        ]);
        assert.deepEqual(t.aparicoes, r.aparicoes);
        assert.equal(t.paiTipo, 'parte');
        assert.equal(t.paiId, 10);
        assert.equal(t.sequencia, 3);
        assert.deepEqual(t.livrosIds, [2, 3]);
        coerente(t);
    });

    it('posição nova empurra quem estava na frente, em texto, Seção e outra aparição', () => {
        const a = poema(1, { paiTipo: 'parte', paiId: 12, sequencia: 1 });
        const b = poema(2);
        d.poemas.push(a, b);
        definirAparicoes(d, b, [ap(1, 10, null, 4), ap(2, 12, null, 2)]);
        d.secoes.push({ id: 21, paiTipo: 'parte', paiId: 12, titulo: 'T', sequencia: 3 });
        sincronizarAparicoesComCamposAntigos(d);
        const t = poema(3);
        d.poemas.push(t);
        salvarAparicoesDoTexto(d, t, [{ livroId: 2, parteId: 12, sequencia: 1 }]);
        assert.equal(t.sequencia, 1);
        assert.equal(a.sequencia, 2);
        assert.equal(b.aparicoes[1].sequencia, 3);
        assert.equal(d.secoes.find((s) => s.id === 21).sequencia, 4);
        // A aparição de `b` na Parte 10 é outra fila e não se mexe.
        assert.equal(b.aparicoes[0].sequencia, 4);
        d.poemas.forEach(coerente);
        // A lista de `a` acompanhou a posição que o espelho dele recebeu.
        assert.equal(a.aparicoes[0].sequencia, 2);
    });

    it('mover dentro do mesmo lugar desloca só quem estava no meio', () => {
        const t = poema(1);
        const x = poema(2, { paiTipo: 'parte', paiId: 10, sequencia: 1 });
        const y = poema(3, { paiTipo: 'parte', paiId: 10, sequencia: 2 });
        const z = poema(4, { paiTipo: 'parte', paiId: 10, sequencia: 3 });
        d.poemas.push(t, x, y, z);
        salvarAparicoesDoTexto(d, t, [{ livroId: 1, parteId: 10, sequencia: 1 }]);
        salvarAparicoesDoTexto(d, t, [{ livroId: 1, parteId: 10, sequencia: 3 }]);
        assert.deepEqual(
            [t, x, y, z].map((p) => p.sequencia),
            [3, 1, 2, 4],
        );
        d.poemas.forEach(coerente);
    });

    it('tirar a aparição fecha o buraco na fila dela, e só nela', () => {
        const t = poema(1);
        const x = poema(2, { paiTipo: 'parte', paiId: 10, sequencia: 2 });
        const w = poema(3, { paiTipo: 'parte', paiId: 12, sequencia: 2 });
        d.poemas.push(t, x, w);
        salvarAparicoesDoTexto(d, t, [
            { livroId: 1, parteId: 10, sequencia: 1 },
            { livroId: 2, parteId: 12, sequencia: 1 },
        ]);
        assert.equal(x.sequencia, 3);
        assert.equal(w.sequencia, 3);
        salvarAparicoesDoTexto(d, t, [{ livroId: 2, parteId: 12, sequencia: 1 }]);
        assert.equal(x.sequencia, 2);
        assert.equal(w.sequencia, 3);
        d.poemas.forEach(coerente);
    });

    it('trocar o lugar da linha fecha a fila antiga e abre na nova', () => {
        const t = poema(1);
        const x = poema(2, { paiTipo: 'parte', paiId: 10, sequencia: 2 });
        const w = poema(3, { paiTipo: 'parte', paiId: 11, sequencia: 1 });
        d.poemas.push(t, x, w);
        salvarAparicoesDoTexto(d, t, [{ livroId: 1, parteId: 10, sequencia: 1 }]);
        assert.equal(x.sequencia, 3);
        salvarAparicoesDoTexto(d, t, [{ livroId: 1, parteId: 11, sequencia: 1 }]);
        assert.equal(x.sequencia, 2);
        assert.equal(w.sequencia, 2);
        assert.equal(t.sequencia, 1);
        d.poemas.forEach(coerente);
    });

    it('modo "fim" vai para a próxima livre, e "nenhuma" tira a posição', () => {
        const x = poema(2, { paiTipo: 'parte', paiId: 10, sequencia: 4 });
        const t = poema(1);
        d.poemas.push(t, x);
        salvarAparicoesDoTexto(d, t, [{ livroId: 1, parteId: 10, modo: 'fim' }]);
        assert.equal(t.sequencia, 5);
        // Já é o último: continua onde está.
        salvarAparicoesDoTexto(d, t, [{ livroId: 1, parteId: 10, modo: 'fim' }]);
        assert.equal(t.sequencia, 5);
        // Estava no meio: vai para o fim e fecha o buraco.
        const y = poema(3, { paiTipo: 'parte', paiId: 10, sequencia: 6 });
        d.poemas.push(y);
        salvarAparicoesDoTexto(d, t, [{ livroId: 1, parteId: 10, modo: 'fim' }]);
        assert.equal(t.sequencia, 6);
        assert.equal(y.sequencia, 5);
        salvarAparicoesDoTexto(d, t, [{ livroId: 1, parteId: 10, modo: 'nenhuma', sequencia: 2 }]);
        assert.equal(t.sequencia, null);
        assert.equal(y.sequencia, 5);
        d.poemas.forEach(coerente);
    });

    it('lugar repetido vale a primeira linha; Coletânea e livro que não existe são ignorados', () => {
        const t = poema(1);
        d.poemas.push(t);
        const r = salvarAparicoesDoTexto(d, t, [
            { livroId: 1, parteId: 10, sequencia: 2 },
            { livroId: 1, parteId: 10, sequencia: 7 },
            { livroId: 9 },
            { livroId: 99 },
            {},
        ]);
        assert.deepEqual(r.aparicoes, [ap(1, 10, null, 2)]);
    });

    it('posição 0 ou negativa vira sem posição', () => {
        const t = poema(1);
        d.poemas.push(t);
        const r = salvarAparicoesDoTexto(d, t, [{ livroId: 1, parteId: 10, sequencia: 0 }]);
        assert.equal(r.aparicoes[0].sequencia, null);
    });

    it('duas aparições do mesmo texto em filas diferentes não se atrapalham', () => {
        const t = poema(1);
        const x = poema(2, { paiTipo: 'parte', paiId: 12, sequencia: 1 });
        d.poemas.push(t, x);
        salvarAparicoesDoTexto(d, t, [
            { livroId: 1, parteId: 10, sequencia: 1 },
            { livroId: 2, parteId: 12, sequencia: 1 },
        ]);
        assert.equal(x.sequencia, 2);
        // Reabrir o texto e regravar o mesmo não muda nada.
        const antes = JSON.stringify(d);
        salvarAparicoesDoTexto(d, t, [
            { livroId: 1, parteId: 10, sequencia: 1 },
            { livroId: 2, parteId: 12, sequencia: 1 },
        ]);
        assert.equal(JSON.stringify(d), antes);
    });

    it('Prosa também (as filas misturam as duas coleções)', () => {
        const t = poema(1);
        const pr = {
            id: 50,
            titulo: 'pr',
            paiTipo: 'parte',
            paiId: 10,
            sequencia: 1,
            livrosIds: [],
        };
        d.poemas.push(t);
        d.prosas.push(pr);
        salvarAparicoesDoTexto(d, t, [{ livroId: 1, parteId: 10, sequencia: 1 }]);
        assert.equal(pr.sequencia, 2);
        sincronizarAparicoesComCamposAntigos(d);
        assert.equal(pr.aparicoes[0].sequencia, 2);
    });
});

// ─── Com o db de verdade: save(), exclusão e Desfazer ──────────

describe('db real: save() e exclusão com aparições', () => {
    function montar() {
        ['livros', 'partes', 'secoes', 'elementos', 'poemas', 'prosas'].forEach((c) => {
            db[c].length = 0;
        });
        localStorage.clear();
        document.getElementById('modal-confirmar-exclusao')?.remove();
        document.getElementById('avisos-toast')?.remove();
        const d = acervo();
        d.livros.forEach((l, i) => db.livros.push({ ...l, sequencia: i + 1 }));
        d.partes.forEach((p) => db.partes.push(p));
        d.secoes.forEach((s) => db.secoes.push(s));
    }

    it('save() não desfaz a segunda aparição quando uma tela antiga edita o Destino', () => {
        montar();
        const t = poema(1);
        db.poemas.push(t);
        salvarAparicoesDoTexto(db, t, [
            { livroId: 1, parteId: 10, sequencia: 2 },
            { livroId: 2, parteId: 12, sequencia: 5 },
        ]);
        save();
        // Tela antiga: muda só o Destino.
        t.paiTipo = 'parte';
        t.paiId = 11;
        t.sequencia = 1;
        save();
        assert.deepEqual(t.aparicoes, [ap(1, 11, null, 1), ap(2, 12, null, 5)]);
        save();
        assert.deepEqual(t.aparicoes, [ap(1, 11, null, 1), ap(2, 12, null, 5)]);
    });

    it('save() dá lista ao texto novo gravado só pelos campos antigos', () => {
        montar();
        db.prosas.push({ id: 7, titulo: 'x', paiTipo: 'livro', paiId: 3, sequencia: 2 });
        save();
        assert.deepEqual(db.prosas[0].aparicoes, [ap(3, null, null, 2)]);
        db.prosas.length = 0;
    });

    it('excluir o texto fecha o buraco da outra aparição; Desfazer reabre', () => {
        montar();
        const t = poema(1);
        const x = poema(2, { paiTipo: 'parte', paiId: 12, sequencia: 6 });
        db.poemas.push(t, x);
        salvarAparicoesDoTexto(db, t, [
            { livroId: 1, parteId: 10, sequencia: 1 },
            { livroId: 2, parteId: 12, sequencia: 5 },
        ]);
        assert.equal(x.sequencia, 7);
        save();

        deleteItem('poemas', 1);
        document.getElementById('excl-confirmar').click();
        assert.equal(db.poemas.length, 1);
        assert.equal(x.sequencia, 6);

        document.querySelector('#avisos-toast button').click();
        assert.equal(db.poemas.length, 2);
        assert.equal(db.poemas.find((p) => p.id === 2).sequencia, 7);
        const volta = db.poemas.find((p) => p.id === 1);
        assert.deepEqual(volta.aparicoes, [ap(1, 10, null, 1), ap(2, 12, null, 5)]);
        db.poemas.length = 0;
    });
});
