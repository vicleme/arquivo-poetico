import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Fase 21, etapa 21-3c: na aba Estrutura, ▲▼, a posição digitada e o "mover para
// outro nível" de Poema e Prosa mexem só na APARIÇÃO do lugar da linha clicada.
// O Destino (espelho) e as aparições dos outros lugares e livros não mudam, a não
// ser que a aparição mexida seja a do próprio Destino. O Ver de Parte e Seção lê
// pelas aparições, como o Ver do livro.

const { db } = await import('../js/db.js');
const { definirAparicoes } = await import('../js/aparicoes-dado.js');
const {
    setLivroEstrutura,
    moverItemEstrutura,
    definirPosicaoEstrutura,
    executarMoverNivel,
    abrirModalMoverNivel,
} = await import('../js/render-estrutura.js');
const { montarArvoreDaParte } = await import('../js/estrutura-livro.js');
const { moverAparicaoDeLugar } = await import('../js/mover-aparicao-na-fila.js');

const COLECOES = ['livros', 'partes', 'secoes', 'elementos', 'poemas', 'prosas', 'pessoas'];
const ap = (livroId, parteId, secaoId, sequencia) => ({ livroId, parteId, secaoId, sequencia });

function texto(id, aparicoes) {
    const t = { id, titulo: `Texto ${id}`, texto: 'x', paiTipo: null, paiId: null };
    definirAparicoes(db, t, aparicoes);
    return t;
}

// Livro 1: Parte 10 e Parte 11. Livro 2: Parte 30.
// Texto 1: L1 Parte 10 (1, Destino) e L2 Parte 30 (1).
// Texto 2: L2 Parte 30 (2, Destino) e L1 Parte 10 (2).
// Texto 3: L1 Parte 10 (3).
// Texto 4: L1 Parte 10 (4) e L1 Parte 11 (1).
function montar() {
    COLECOES.forEach((c) => {
        db[c].length = 0;
    });
    localStorage.clear();
    document.body.innerHTML = '<div id="estrutura-arvore"></div>';
    db.livros.push(
        { id: 1, titulo: 'Livro Um', tipo: 'Inéditos', sequencia: 1 },
        { id: 2, titulo: 'Livro Dois', tipo: 'Inéditos', sequencia: 2 },
    );
    db.partes.push(
        { id: 10, livroId: 1, titulo: 'Parte A', sequencia: 1 },
        { id: 11, livroId: 1, titulo: 'Parte B', sequencia: 2 },
        { id: 30, livroId: 2, titulo: 'Parte C', sequencia: 1 },
    );
    db.poemas.push(
        texto(1, [ap(1, 10, null, 1), ap(2, 30, null, 1)]),
        texto(2, [ap(2, 30, null, 2), ap(1, 10, null, 2)]),
        texto(3, [ap(1, 10, null, 3)]),
        texto(4, [ap(1, 10, null, 4), ap(1, 11, null, 1)]),
    );
    setLivroEstrutura(1);
}

const poema = (id) => db.poemas.find((p) => p.id === id);
const lista = (id) =>
    poema(id).aparicoes.map((a) => [a.livroId, a.parteId, a.secaoId, a.sequencia]);
const espelho = (id) => [poema(id).paiTipo, poema(id).paiId, poema(id).sequencia];

describe('▲▼ na aba Estrutura mexem só na aparição do lugar', () => {
    beforeEach(montar);

    it('sobe o texto cuja aparição na Parte não é o Destino, sem mexer no Destino', () => {
        moverItemEstrutura('poema', 2, 'up', 'parte', 10);
        assert.deepEqual(lista(2), [
            [2, 30, null, 2],
            [1, 10, null, 1],
        ]);
        assert.deepEqual(espelho(2), ['parte', 30, 2]);
        // O vizinho trocou: o Texto 1 (Destino na Parte A) vai para 2, e o espelho acompanha.
        assert.deepEqual(lista(1)[0], [1, 10, null, 2]);
        assert.deepEqual(espelho(1), ['parte', 10, 2]);
        // A aparição do Texto 1 no outro livro não mudou.
        assert.deepEqual(lista(1)[1], [2, 30, null, 1]);
    });

    it('desce o texto do Destino e não mexe na aparição dele no outro livro', () => {
        moverItemEstrutura('poema', 1, 'down', 'parte', 10);
        assert.deepEqual(lista(1), [
            [1, 10, null, 2],
            [2, 30, null, 1],
        ]);
        assert.deepEqual(lista(2)[1], [1, 10, null, 1]);
    });

    it('a mesma linha no outro livro tem a fila dele', () => {
        setLivroEstrutura(2);
        moverItemEstrutura('poema', 2, 'up', 'parte', 30);
        assert.deepEqual(lista(2)[0], [2, 30, null, 1]);
        assert.deepEqual(lista(1)[1], [2, 30, null, 2]);
        // A fila do Livro 1 ficou como estava.
        assert.deepEqual(lista(2)[1], [1, 10, null, 2]);
    });
});

describe('posição digitada', () => {
    beforeEach(montar);

    it('grava só a aparição daquele lugar', () => {
        assert.equal(definirPosicaoEstrutura('poema', 2, '9', 'parte', 10), true);
        assert.deepEqual(lista(2), [
            [2, 30, null, 2],
            [1, 10, null, 9],
        ]);
        assert.deepEqual(espelho(2), ['parte', 30, 2]);
    });

    it('texto que não está naquele lugar não grava', () => {
        assert.equal(definirPosicaoEstrutura('poema', 3, '9', 'parte', 11), false);
        assert.deepEqual(lista(3), [[1, 10, null, 3]]);
    });

    it('sem o lugar (chamada antiga) vale o Destino', () => {
        assert.equal(definirPosicaoEstrutura('poema', 2, '8'), true);
        assert.deepEqual(espelho(2), ['parte', 30, 8]);
    });
});

describe('mover para outro nível', () => {
    beforeEach(montar);

    it('move só a aparição do lugar; o Destino e o outro livro ficam', () => {
        executarMoverNivel('poema', 2, 'parte:11', '', 'parte', 10);
        // Entra no fim da Parte B (depois do Texto 4, que está em 1).
        assert.deepEqual(lista(2), [
            [2, 30, null, 2],
            [1, 11, null, 2],
        ]);
        assert.deepEqual(espelho(2), ['parte', 30, 2]);
        // A fila da Parte A fechou o buraco: Texto 3 e Texto 4 sobem uma casa.
        assert.deepEqual(lista(3), [[1, 10, null, 2]]);
        assert.deepEqual(lista(4)[0], [1, 10, null, 3]);
    });

    it('com a posição pedida, empurra quem está na frente', () => {
        executarMoverNivel('poema', 2, 'parte:11', '1', 'parte', 10);
        assert.deepEqual(lista(2)[1], [1, 11, null, 1]);
        assert.deepEqual(lista(4)[1], [1, 11, null, 2]);
    });

    it('mover a aparição do Destino recalcula o espelho e não toca no outro livro', () => {
        executarMoverNivel('poema', 1, 'parte:11', '', 'parte', 10);
        assert.deepEqual(lista(1), [
            [1, 11, null, 2],
            [2, 30, null, 1],
        ]);
        assert.deepEqual(espelho(1), ['parte', 11, 2]);
    });

    it('para o livro inteiro', () => {
        executarMoverNivel('poema', 3, 'livro:1', '', 'parte', 10);
        // Na fila do Livro as duas Partes ocupam 1 e 2: o texto entra em 3.
        assert.deepEqual(lista(3), [[1, null, null, 3]]);
        assert.deepEqual(espelho(3), ['livro', 1, 3]);
    });

    it('recusa mover para onde o texto já aparece, e nada muda', () => {
        const antes = JSON.stringify(db.poemas);
        executarMoverNivel('poema', 4, 'parte:11', '', 'parte', 10);
        assert.equal(JSON.stringify(db.poemas), antes);
    });

    it('o modal não oferece o lugar de origem nem os lugares onde o texto já está', () => {
        abrirModalMoverNivel('poema', 4, 'parte', 10);
        const valores = [...document.querySelectorAll('#mov-destino option')].map((o) => o.value);
        assert.ok(valores.includes('livro:1'));
        assert.ok(!valores.includes('parte:10'));
        assert.ok(!valores.includes('parte:11'));
        abrirModalMoverNivel('poema', 2, 'parte', 10);
        const v2 = [...document.querySelectorAll('#mov-destino option')].map((o) => o.value);
        assert.ok(v2.includes('parte:11'));
        assert.ok(!v2.includes('parte:10'));
    });

    it('Prosa também', () => {
        db.prosas.push({ id: 9, titulo: 'Prosa', texto: 'y', paiTipo: null, paiId: null });
        definirAparicoes(db, db.prosas[0], [ap(2, 30, null, 5), ap(1, 10, null, 5)]);
        executarMoverNivel('prosa', 9, 'parte:11', '', 'parte', 10);
        assert.deepEqual(
            db.prosas[0].aparicoes.map((a) => [a.livroId, a.parteId, a.sequencia]),
            [
                [2, 30, 5],
                [1, 11, 2],
            ],
        );
    });
});

describe('moverAparicaoDeLugar: recusas', () => {
    beforeEach(montar);

    const de = { paiTipo: 'parte', paiId: 10 };
    it('sem aparição no lugar de origem', () => {
        assert.deepEqual(moverAparicaoDeLugar(db, poema(3), { paiTipo: 'parte', paiId: 11 }, de), {
            ok: false,
            motivo: 'sem-aparicao',
        });
    });
    it('mesmo lugar', () => {
        assert.equal(moverAparicaoDeLugar(db, poema(3), de, de).motivo, 'mesmo-lugar');
    });
    it('destino que não existe', () => {
        const r = moverAparicaoDeLugar(db, poema(3), de, { paiTipo: 'parte', paiId: 999 });
        assert.equal(r.motivo, 'destino-invalido');
    });
    it('destino de outro livro', () => {
        const r = moverAparicaoDeLugar(db, poema(3), de, { paiTipo: 'parte', paiId: 30 });
        assert.equal(r.motivo, 'outro-livro');
        assert.deepEqual(lista(3), [[1, 10, null, 3]]);
    });
});

describe('a aba Estrutura e o Ver de Parte leem por aparição', () => {
    beforeEach(montar);

    it('o texto aparece na linha de cada lugar, com o lugar nos botões e no número', () => {
        const html = document.getElementById('estrutura-arvore').innerHTML;
        // O Texto 2 só tem Destino no Livro 2, mas aparece na Parte A do Livro 1.
        assert.match(html, /moverItemEstrutura\('poema', 2, 'up', 'parte', '10'\)/);
        assert.match(html, /data-tipo="poema" data-id="2" data-pai-tipo="parte" data-pai-id="10"/);
        // O Texto 4 aparece nas duas Partes do livro.
        assert.match(html, /moverItemEstrutura\('poema', 4, 'up', 'parte', '10'\)/);
        assert.match(html, /moverItemEstrutura\('poema', 4, 'up', 'parte', '11'\)/);
    });

    it('o Ver de Parte traz o texto cuja aparição na Parte não é o Destino', () => {
        const { arvore } = montarArvoreDaParte(db, 10);
        assert.deepEqual(
            arvore.map((n) => [n.dados.titulo, n.dados.sequencia]),
            [
                ['Texto 1', 1],
                ['Texto 2', 2],
                ['Texto 3', 3],
                ['Texto 4', 4],
            ],
        );
    });
});
