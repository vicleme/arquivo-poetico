import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Lógica pura do botão "Temas" da edição em massa (temas.js): adicionar e
// remover vários temas pela fonte da verdade (`item.temas`, por id), com o
// espelho `sinalizacoesTema` sempre coerente.
const {
    nomesDeTemasDigitados,
    sugestoesDeTemasEncadeadas,
    temasInexistentes,
    adicionarTemasAosTextos,
    removerTemasDosTextos,
    sincronizarTemas,
} = await import('../js/temas.js');

function novoBanco() {
    const banco = {
        poemas: [
            { id: 1, titulo: 'A', sinalizacoesTema: 'Amor' },
            { id: 2, titulo: 'B', sinalizacoesTema: '' },
        ],
        prosas: [{ id: 3, titulo: 'C', sinalizacoesTema: 'Saudade' }],
        temas: [
            { id: 101, nome: 'Amor', notas: '' },
            { id: 102, nome: 'Saudade', notas: '' },
        ],
        assuntos: [],
    };
    sincronizarTemas(banco);
    return banco;
}

const nomesDoTexto = (banco, item) =>
    item.temas.map((e) => banco.temas.find((t) => t.id === e.temaId).nome);

describe('nomesDeTemasDigitados', () => {
    it('separa por vírgula, limpa espaços e ignora vazios', () => {
        assert.deepEqual(nomesDeTemasDigitados(' amor ,, saudade  , '), ['amor', 'saudade']);
    });

    it('não repete (sem caixa nem acento) e mantém a primeira grafia', () => {
        assert.deepEqual(nomesDeTemasDigitados('Saudade, saudade, SAÚDADE, Amor'), [
            'Saudade',
            'Amor',
        ]);
    });

    it('vazio, null e só vírgulas dão lista vazia', () => {
        assert.deepEqual(nomesDeTemasDigitados(''), []);
        assert.deepEqual(nomesDeTemasDigitados(null), []);
        assert.deepEqual(nomesDeTemasDigitados(' , , '), []);
    });
});

describe('sugestoesDeTemasEncadeadas', () => {
    const cadastro = ['Amor', 'Saudade', 'Morte'];

    it('sem vírgula: os próprios nomes', () => {
        assert.deepEqual(sugestoesDeTemasEncadeadas('sa', cadastro), cadastro);
    });

    it('com vírgula: cada sugestão leva o que já foi digitado', () => {
        assert.deepEqual(sugestoesDeTemasEncadeadas('Amor, sa', cadastro), [
            'Amor, Saudade',
            'Amor, Morte',
        ]);
    });

    it('não sugere o que já está no campo (sem caixa nem acento)', () => {
        assert.deepEqual(sugestoesDeTemasEncadeadas('amor,', cadastro), [
            'amor, Saudade',
            'amor, Morte',
        ]);
    });

    it('respeita o espaçamento digitado depois da vírgula', () => {
        assert.deepEqual(sugestoesDeTemasEncadeadas('Amor,sa', ['Saudade']), ['Amor,Saudade']);
    });

    it('cadastro vazio ou ausente não quebra', () => {
        assert.deepEqual(sugestoesDeTemasEncadeadas('a', []), []);
        assert.deepEqual(sugestoesDeTemasEncadeadas('a', undefined), []);
    });
});

describe('adicionarTemasAosTextos', () => {
    it('adiciona vários temas, sem papel, e regrava o espelho', () => {
        const banco = novoBanco();
        const r = adicionarTemasAosTextos(banco, [banco.poemas[1]], ['Amor', 'Saudade']);
        assert.deepEqual(r, { textos: 1, vinculos: 2, criados: 0 });
        assert.deepEqual(banco.poemas[1].temas, [
            { temaId: 101, papel: '' },
            { temaId: 102, papel: '' },
        ]);
        assert.equal(banco.poemas[1].sinalizacoesTema, 'Amor, Saudade');
    });

    it('cria no cadastro o tema que não existe (uma vez só, mesmo em vários textos)', () => {
        const banco = novoBanco();
        const r = adicionarTemasAosTextos(banco, [banco.poemas[0], banco.poemas[1]], ['Exílio']);
        assert.equal(r.criados, 1);
        assert.equal(r.textos, 2);
        assert.equal(banco.temas.filter((t) => t.nome === 'Exílio').length, 1);
        assert.deepEqual(nomesDoTexto(banco, banco.poemas[0]), ['Amor', 'Exílio']);
    });

    it('quem já tem o tema não muda e o papel dele é preservado', () => {
        const banco = novoBanco();
        banco.poemas[0].temas = [{ temaId: 101, papel: 'principal' }];
        const r = adicionarTemasAosTextos(banco, [banco.poemas[0]], ['amor', 'Saudade']);
        assert.deepEqual(r, { textos: 1, vinculos: 1, criados: 0 });
        assert.deepEqual(banco.poemas[0].temas, [
            { temaId: 101, papel: 'principal' },
            { temaId: 102, papel: '' },
        ]);
    });

    it('todos já tinham: nada muda', () => {
        const banco = novoBanco();
        const r = adicionarTemasAosTextos(banco, [banco.poemas[0]], ['Amor']);
        assert.deepEqual(r, { textos: 0, vinculos: 0, criados: 0 });
    });

    it('texto de dado antigo (só o espelho) é reconciliado antes de receber o tema', () => {
        const banco = novoBanco();
        delete banco.prosas[0].temas;
        adicionarTemasAosTextos(banco, [banco.prosas[0]], ['Amor']);
        assert.deepEqual(nomesDoTexto(banco, banco.prosas[0]), ['Saudade', 'Amor']);
        assert.equal(banco.prosas[0].sinalizacoesTema, 'Saudade, Amor');
    });

    it('o resultado sobrevive a um novo sincronizarTemas (espelho e temas coerentes)', () => {
        const banco = novoBanco();
        adicionarTemasAosTextos(banco, [banco.poemas[1]], ['Exílio', 'Amor']);
        const antes = JSON.parse(JSON.stringify(banco.poemas[1]));
        sincronizarTemas(banco);
        assert.deepEqual(banco.poemas[1], antes);
    });
});

describe('removerTemasDosTextos', () => {
    it('tira só os vínculos pedidos, regrava o espelho e mantém o cadastro', () => {
        const banco = novoBanco();
        adicionarTemasAosTextos(banco, [banco.poemas[0]], ['Saudade']);
        const r = removerTemasDosTextos(banco, [banco.poemas[0]], ['saudade']);
        assert.deepEqual(r, { textos: 1, vinculos: 1, desconhecidos: [] });
        assert.deepEqual(nomesDoTexto(banco, banco.poemas[0]), ['Amor']);
        assert.equal(banco.poemas[0].sinalizacoesTema, 'Amor');
        assert.equal(banco.temas.length, 2);
    });

    it('tirar o último tema deixa o texto sem tema', () => {
        const banco = novoBanco();
        removerTemasDosTextos(banco, [banco.poemas[0]], ['Amor']);
        assert.deepEqual(banco.poemas[0].temas, []);
        assert.equal(banco.poemas[0].sinalizacoesTema, '');
    });

    it('tema que o texto não tem: nenhum texto alterado', () => {
        const banco = novoBanco();
        const r = removerTemasDosTextos(banco, [banco.poemas[1]], ['Amor']);
        assert.deepEqual(r, { textos: 0, vinculos: 0, desconhecidos: [] });
    });

    it('nunca cria tema: nome fora do cadastro vai para `desconhecidos`', () => {
        const banco = novoBanco();
        const r = removerTemasDosTextos(banco, [banco.poemas[0]], ['Inexistente', 'Amor']);
        assert.deepEqual(r.desconhecidos, ['Inexistente']);
        assert.equal(r.vinculos, 1);
        assert.equal(banco.temas.length, 2);
    });
});

describe('temasInexistentes', () => {
    it('compara sem caixa nem acento', () => {
        const banco = novoBanco();
        assert.deepEqual(temasInexistentes(banco, ['AMOR', 'saudáde', 'Novo']), ['Novo']);
    });
});
