import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Ligar Tema a Assunto pelo modal do texto (temas.js): pendências que só
// viram cadastro ao salvar. Lógica pura.
const {
    adicionarAssuntoPendente,
    podarAssuntosPendentes,
    sobreporAssuntosPendentes,
    aplicarAssuntosPendentes,
    assuntoEhNovo,
    limparNomeAssunto,
} = await import('../js/temas.js');

function novoBanco() {
    return {
        temas: [
            { id: 1, nome: 'Amor', notas: '' },
            { id: 2, nome: 'Machismo', notas: '' },
        ],
        assuntos: [
            { id: 10, nome: 'Sociedade', notas: '', temaIds: [2] },
            { id: 11, nome: 'Afetos', notas: '', temaIds: [] },
        ],
    };
}
const entradas = (...nomes) => nomes.map((nome) => ({ nome, papel: '' }));

describe('adicionarAssuntoPendente', () => {
    it('nome que já existe (sem caixa nem acento) liga ao Assunto existente', () => {
        const banco = novoBanco();
        const r = adicionarAssuntoPendente(banco, [], 'Amor', ' afetos ');
        assert.equal(r.resultado, 'ok');
        assert.deepEqual(r.pendentes, [{ temaChave: 'amor', assuntoId: 11, nome: 'Afetos' }]);
    });

    it('nome que não existe vira Assunto novo (assuntoId null)', () => {
        const r = adicionarAssuntoPendente(novoBanco(), [], 'Amor', 'Corpo   e desejo');
        assert.equal(r.resultado, 'ok');
        assert.deepEqual(r.pendentes, [
            { temaChave: 'amor', assuntoId: null, nome: 'Corpo e desejo' },
        ]);
    });

    it('vírgula faz parte do nome: um Assunto por vez', () => {
        const r = adicionarAssuntoPendente(novoBanco(), [], 'Amor', 'Corpo, desejo');
        assert.equal(r.pendentes[0].nome, 'Corpo, desejo');
    });

    it('vazio, "já está" no cadastro e repetido não mudam a lista', () => {
        const banco = novoBanco();
        assert.equal(adicionarAssuntoPendente(banco, [], 'Amor', '  ').resultado, 'vazio');
        const jaEsta = adicionarAssuntoPendente(banco, [], 'Machismo', 'sociedade');
        assert.equal(jaEsta.resultado, 'ja-esta');
        assert.equal(jaEsta.assunto.nome, 'Sociedade');
        const primeira = adicionarAssuntoPendente(banco, [], 'Amor', 'Afetos');
        const repetida = adicionarAssuntoPendente(banco, primeira.pendentes, 'amor', 'AFETOS');
        assert.equal(repetida.resultado, 'repetido');
        assert.deepEqual(repetida.pendentes, primeira.pendentes);
    });

    it('um Assunto novo repetido (mesmo nome) não duplica a pendência', () => {
        const banco = novoBanco();
        const a = adicionarAssuntoPendente(banco, [], 'Amor', 'Corpo');
        const b = adicionarAssuntoPendente(banco, a.pendentes, 'Amor', 'corpo');
        assert.equal(b.resultado, 'repetido');
    });

    it('não altera a lista recebida', () => {
        const lista = [];
        adicionarAssuntoPendente(novoBanco(), lista, 'Amor', 'Afetos');
        assert.deepEqual(lista, []);
    });

    it('tema ainda fora do cadastro pode receber Assunto existente', () => {
        const r = adicionarAssuntoPendente(novoBanco(), [], 'Exílio', 'Sociedade');
        assert.equal(r.resultado, 'ok');
        assert.equal(r.pendentes[0].temaChave, 'exilio');
    });
});

describe('podarAssuntosPendentes', () => {
    it('descarta as pendências de Tema que saiu da lista do texto', () => {
        const pend = [
            { temaChave: 'amor', assuntoId: 11, nome: 'Afetos' },
            { temaChave: 'machismo', assuntoId: 11, nome: 'Afetos' },
        ];
        assert.deepEqual(podarAssuntosPendentes(entradas('Amor'), pend), [pend[0]]);
        assert.deepEqual(podarAssuntosPendentes([], pend), []);
        assert.deepEqual(podarAssuntosPendentes(entradas('Amor'), null), []);
    });
});

describe('sobreporAssuntosPendentes (só para exibir)', () => {
    it('mostra o Assunto existente já com o Tema, sem tocar no cadastro', () => {
        const banco = novoBanco();
        const pend = [{ temaChave: 'amor', assuntoId: 11, nome: 'Afetos' }];
        const { assuntos } = sobreporAssuntosPendentes(banco, entradas('Amor'), pend);
        assert.deepEqual(assuntos.find((a) => a.id === 11).temaIds, [1]);
        assert.deepEqual(banco.assuntos[1].temaIds, []);
    });

    it('Assunto novo ganha id "novo:" e Tema fora do cadastro ganha id temporário', () => {
        const banco = novoBanco();
        const pend = [{ temaChave: 'exilio', assuntoId: null, nome: 'Memória' }];
        const { assuntos, temas } = sobreporAssuntosPendentes(banco, entradas('Exílio'), pend);
        const novo = assuntos.find((a) => a.nome === 'Memória');
        assert.ok(assuntoEhNovo(novo.id));
        assert.equal(banco.assuntos.length, 2);
        assert.equal(banco.temas.length, 2);
        const temp = temas.find((t) => t.nome === 'Exílio');
        assert.deepEqual(novo.temaIds, [temp.id]);
    });

    it('dois Temas no mesmo Assunto novo compartilham o mesmo Assunto', () => {
        const banco = novoBanco();
        const pend = [
            { temaChave: 'amor', assuntoId: null, nome: 'Corpo' },
            { temaChave: 'machismo', assuntoId: null, nome: 'corpo' },
        ];
        const { assuntos } = sobreporAssuntosPendentes(banco, entradas('Amor', 'Machismo'), pend);
        const novos = assuntos.filter((a) => assuntoEhNovo(a.id));
        assert.equal(novos.length, 1);
        assert.deepEqual(novos[0].temaIds, [1, 2]);
    });

    it('ignora pendência de Tema que saiu do texto e de Assunto excluído', () => {
        const banco = novoBanco();
        const pend = [
            { temaChave: 'amor', assuntoId: 99, nome: 'Fantasma' },
            { temaChave: 'machismo', assuntoId: 11, nome: 'Afetos' },
        ];
        const { assuntos } = sobreporAssuntosPendentes(banco, entradas('Amor'), pend);
        assert.equal(assuntos.length, 2);
        assert.deepEqual(assuntos.find((a) => a.id === 11).temaIds, []);
    });
});

describe('aplicarAssuntosPendentes (ao salvar)', () => {
    it('liga o Tema ao Assunto existente', () => {
        const banco = novoBanco();
        const pend = [{ temaChave: 'amor', assuntoId: 11, nome: 'Afetos' }];
        const r = aplicarAssuntosPendentes(banco, entradas('Amor'), pend);
        assert.deepEqual(r, { criados: 0, vinculos: 1 });
        assert.deepEqual(banco.assuntos[1].temaIds, [1]);
    });

    it('cria o Assunto novo uma vez só, mesmo com vários Temas', () => {
        const banco = novoBanco();
        const pend = [
            { temaChave: 'amor', assuntoId: null, nome: 'Corpo' },
            { temaChave: 'machismo', assuntoId: null, nome: 'Corpo' },
        ];
        const r = aplicarAssuntosPendentes(banco, entradas('Amor', 'Machismo'), pend);
        assert.deepEqual(r, { criados: 1, vinculos: 2 });
        const criado = banco.assuntos.find((a) => a.nome === 'Corpo');
        assert.deepEqual(criado.temaIds, [1, 2]);
        assert.equal(criado.notas, '');
        assert.ok(criado.id != null);
    });

    it('reaproveita o Assunto se o nome passou a existir, e é idempotente', () => {
        const banco = novoBanco();
        banco.assuntos.push({ id: 12, nome: 'Corpo', notas: '', temaIds: [] });
        const pend = [{ temaChave: 'amor', assuntoId: null, nome: 'corpo' }];
        aplicarAssuntosPendentes(banco, entradas('Amor'), pend);
        const depois = aplicarAssuntosPendentes(banco, entradas('Amor'), pend);
        assert.equal(banco.assuntos.length, 3);
        assert.deepEqual(banco.assuntos[2].temaIds, [1]);
        assert.deepEqual(depois, { criados: 0, vinculos: 0 });
    });

    it('ignora Assunto excluído, Tema que saiu do texto e Tema sem registro', () => {
        const banco = novoBanco();
        const pend = [
            { temaChave: 'amor', assuntoId: 99, nome: 'Fantasma' },
            { temaChave: 'machismo', assuntoId: 11, nome: 'Afetos' },
            { temaChave: 'exilio', assuntoId: 11, nome: 'Afetos' },
        ];
        const r = aplicarAssuntosPendentes(banco, entradas('Amor', 'Exílio'), pend);
        assert.deepEqual(r, { criados: 0, vinculos: 0 });
        assert.equal(banco.assuntos.length, 2);
        assert.deepEqual(banco.assuntos[1].temaIds, []);
    });

    it('sem pendências não muda nada', () => {
        const banco = novoBanco();
        const antes = JSON.stringify(banco);
        assert.deepEqual(aplicarAssuntosPendentes(banco, entradas('Amor'), []), {
            criados: 0,
            vinculos: 0,
        });
        assert.equal(JSON.stringify(banco), antes);
    });
});

describe('limparNomeAssunto', () => {
    it('aparar e juntar espaços, mantendo a vírgula', () => {
        assert.equal(limparNomeAssunto('  Corpo,   desejo '), 'Corpo, desejo');
        assert.equal(limparNomeAssunto(null), '');
    });
});
