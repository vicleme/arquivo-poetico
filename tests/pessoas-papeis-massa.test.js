import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    normalizarPapeis,
    normalizarEntradas,
    resolverPessoa,
    planejarAplicacao,
    aplicarPlanoPessoas,
    planejarRemocao,
    aplicarRemocaoPessoas,
    resumirAplicacao,
    resumirRemocao,
} from '../js/pessoas-papeis-massa.js';

// Lógica pura de "Pessoas e papéis" em massa: sem DOM e sem db.js, então roda só
// com objetos. `pessoas` do texto é [{ pessoaId, papeis }].
const RE = 'Retratado(a)';
const IN = 'Inspiração para';
const DE = 'Dedicatário(a)';
const ME = 'Mencionado(a)';
const AL = 'Aludido(a)';

const pessoa = (id, nome, extra = {}) => ({
    id,
    nome,
    grupoIds: [],
    autorIds: [],
    oculto: false,
    ...extra,
});
const texto = (id, pessoas) => (pessoas === undefined ? { id } : { id, pessoas });
const vinculo = (pessoaId, papeis = []) => ({ pessoaId, papeis });
const copia = (x) => JSON.parse(JSON.stringify(x));

describe('normalizarPapeis', () => {
    it('descarta o que não é papel, tira repetição e mantém a ordem recebida', () => {
        assert.deepEqual(normalizarPapeis([AL, 'Inventado', RE, AL, DE]), [AL, RE, DE]);
    });

    it('aceita ausência e valor que não é lista', () => {
        assert.deepEqual(normalizarPapeis(undefined), []);
        assert.deepEqual(normalizarPapeis('Retratado(a)'), []);
    });
});

describe('normalizarEntradas', () => {
    it('duas entradas do mesmo nome somam os papéis na ordem em que vieram', () => {
        const r = normalizarEntradas([
            { nome: 'Ana', papeis: [DE] },
            { nome: 'ana', papeis: [RE, DE] },
        ]);
        assert.deepEqual(r[0].papeis, [DE, RE]);
    });

    it('limpa o nome e descarta entrada vazia', () => {
        const r = normalizarEntradas([
            { nome: '  Ana   Maria ', papeis: [RE] },
            { nome: '   ', papeis: [DE] },
            { papeis: [DE] },
        ]);
        assert.deepEqual(r, [{ nome: 'Ana Maria', papeis: [RE] }]);
    });

    it('junta o mesmo nome (sem caixa nem acento) somando os papéis', () => {
        const r = normalizarEntradas([
            { nome: 'José', papeis: [DE] },
            { nome: 'jose', papeis: [RE, DE] },
        ]);
        assert.deepEqual(r, [{ nome: 'José', papeis: [DE, RE] }]);
    });

    it('mantém entradas de nomes diferentes com papéis próprios', () => {
        const r = normalizarEntradas([
            { nome: 'Ana', papeis: [RE] },
            { nome: 'Davi', papeis: [ME] },
        ]);
        assert.equal(r.length, 2);
        assert.deepEqual(r[1], { nome: 'Davi', papeis: [ME] });
    });
});

describe('resolverPessoa', () => {
    const d = { pessoas: [pessoa(1, 'José'), pessoa(2, 'Ana')] };

    it('acha pelo nome exato', () => {
        assert.equal(resolverPessoa(d, 'Ana').pessoa.id, 2);
    });

    it('acha ignorando caixa e acento', () => {
        assert.equal(resolverPessoa(d, 'jose').pessoa.id, 1);
    });

    it('diz que é nova quando não existe', () => {
        assert.deepEqual(resolverPessoa(d, 'Carla'), { nova: true });
    });

    it('é ambígua quando duas casam e nenhuma tem o nome exato', () => {
        const dup = { pessoas: [pessoa(1, 'José'), pessoa(2, 'Jose')] };
        assert.equal(resolverPessoa(dup, ' José ').pessoa.id, 1);
        assert.equal(resolverPessoa(dup, 'Jose').pessoa.id, 2);
        assert.deepEqual(resolverPessoa(dup, 'JOSÉ'), { ambigua: true });
        assert.deepEqual(resolverPessoa(dup, 'jose'), { ambigua: true });
    });

    it('cadastro ausente conta como vazio', () => {
        assert.deepEqual(resolverPessoa({}, 'Ana'), { nova: true });
    });
});

describe('planejarAplicacao', () => {
    it('separa quem entra, quem completa papéis e quem já estava assim', () => {
        const d = { pessoas: [pessoa(1, 'Victor')] };
        const a = texto(10, []);
        const b = texto(11, [vinculo(1, [RE])]);
        const c = texto(12, [vinculo(1, [RE, DE])]);
        const plano = planejarAplicacao(d, [a, b, c], [{ nome: 'Victor', papeis: [RE, DE] }]);
        const [linha] = plano.linhas;
        assert.equal(linha.nova, false);
        assert.deepEqual(
            linha.entram.map((x) => x.item.id),
            [10],
        );
        assert.deepEqual(
            linha.completam.map((x) => [x.item.id, x.faltam]),
            [[11, [DE]]],
        );
        assert.equal(linha.jaTinham, 1);
        assert.equal(plano.textos, 2);
    });

    it('sem papéis, quem já tem a pessoa conta como já estando assim', () => {
        const d = { pessoas: [pessoa(1, 'Ana')] };
        const plano = planejarAplicacao(
            d,
            [texto(1, [vinculo(1, [])]), texto(2, [])],
            [{ nome: 'Ana', papeis: [] }],
        );
        assert.equal(plano.linhas[0].jaTinham, 1);
        assert.equal(plano.linhas[0].entram.length, 1);
    });

    it('cada pessoa tem os próprios papéis na mesma operação', () => {
        const d = { pessoas: [pessoa(1, 'Ana'), pessoa(2, 'Davi')] };
        const plano = planejarAplicacao(
            d,
            [texto(1, [])],
            [
                { nome: 'Ana', papeis: [RE] },
                { nome: 'Davi', papeis: [ME, AL] },
            ],
        );
        assert.deepEqual(
            plano.linhas.map((l) => l.papeis),
            [[RE], [ME, AL]],
        );
        assert.equal(plano.textos, 1);
    });

    it('pessoa que não existe fica marcada como nova e entra em todos os textos', () => {
        const plano = planejarAplicacao(
            { pessoas: [] },
            [texto(1, []), texto(2, undefined)],
            [{ nome: 'Carla', papeis: [DE] }],
        );
        assert.equal(plano.linhas[0].nova, true);
        assert.equal(plano.linhas[0].pessoa, null);
        assert.equal(plano.linhas[0].entram.length, 2);
    });

    it('nome ambíguo fica de fora e não conta texto', () => {
        const d = { pessoas: [pessoa(1, 'José'), pessoa(2, 'Jose')] };
        const plano = planejarAplicacao(d, [texto(1, [])], [{ nome: 'JOSE', papeis: [RE] }]);
        assert.equal(plano.linhas[0].ambigua, true);
        assert.equal(plano.linhas[0].entram.length, 0);
        assert.equal(plano.textos, 0);
    });

    it('não altera nada: nem os textos nem o cadastro', () => {
        const d = { pessoas: [pessoa(1, 'Ana')] };
        const itens = [texto(1, [vinculo(1, [RE])]), texto(2, [])];
        const antes = copia({ d, itens });
        planejarAplicacao(d, itens, [
            { nome: 'Ana', papeis: [DE] },
            { nome: 'Nova', papeis: [] },
        ]);
        assert.deepEqual(copia({ d, itens }), antes);
    });

    it('casa pessoaId número com texto (1 e "1" são a mesma pessoa)', () => {
        const d = { pessoas: [pessoa(1, 'Ana')] };
        const plano = planejarAplicacao(
            d,
            [texto(1, [vinculo('1', [RE])])],
            [{ nome: 'Ana', papeis: [RE] }],
        );
        assert.equal(plano.linhas[0].jaTinham, 1);
    });
});

describe('aplicarPlanoPessoas', () => {
    it('liga a pessoa com os papéis pedidos, na ordem em que foram pedidos', () => {
        const d = { pessoas: [pessoa(1, 'Victor')] };
        const itens = [texto(1, []), texto(2, [])];
        const plano = planejarAplicacao(d, itens, [{ nome: 'Victor', papeis: [AL, RE] }]);
        const r = aplicarPlanoPessoas(d, plano);
        assert.equal(r.textos, 2);
        assert.deepEqual(itens[0].pessoas, [{ pessoaId: 1, papeis: [AL, RE] }]);
        assert.deepEqual(itens[1].pessoas, [{ pessoaId: 1, papeis: [AL, RE] }]);
    });

    it('papel novo entra depois dos que o texto já tinha, sem reordenar os antigos', () => {
        const d = { pessoas: [pessoa(1, 'Ana')] };
        const itens = [texto(1, [vinculo(1, [ME, DE])])];
        aplicarPlanoPessoas(d, planejarAplicacao(d, itens, [{ nome: 'Ana', papeis: [IN, RE] }]));
        assert.deepEqual(itens[0].pessoas[0].papeis, [ME, DE, IN, RE]);
    });

    it('nenhum papel marcado liga a pessoa com a lista vazia', () => {
        const d = { pessoas: [pessoa(1, 'Ana')] };
        const itens = [texto(1, [])];
        aplicarPlanoPessoas(d, planejarAplicacao(d, itens, [{ nome: 'Ana', papeis: [] }]));
        assert.deepEqual(itens[0].pessoas, [{ pessoaId: 1, papeis: [] }]);
    });

    it('quem já tem a pessoa ganha só o que falta e nunca perde papel', () => {
        const d = { pessoas: [pessoa(1, 'Ana')] };
        const itens = [texto(1, [vinculo(1, [DE, ME])])];
        const plano = planejarAplicacao(d, itens, [{ nome: 'Ana', papeis: [RE] }]);
        aplicarPlanoPessoas(d, plano);
        assert.deepEqual(itens[0].pessoas, [{ pessoaId: 1, papeis: [DE, ME, RE] }]);
    });

    it('mantém as outras pessoas do texto como estavam', () => {
        const d = { pessoas: [pessoa(1, 'Ana'), pessoa(2, 'Davi')] };
        const itens = [texto(1, [vinculo(2, [ME])])];
        aplicarPlanoPessoas(d, planejarAplicacao(d, itens, [{ nome: 'Ana', papeis: [RE] }]));
        assert.deepEqual(itens[0].pessoas, [vinculo(2, [ME]), vinculo(1, [RE])]);
    });

    it('texto sem o campo pessoas ganha a lista', () => {
        const d = { pessoas: [pessoa(1, 'Ana')] };
        const itens = [texto(1)];
        aplicarPlanoPessoas(d, planejarAplicacao(d, itens, [{ nome: 'Ana', papeis: [RE] }]));
        assert.deepEqual(itens[0].pessoas, [{ pessoaId: 1, papeis: [RE] }]);
    });

    it('cria a pessoa nova uma vez só, com o cadastro completo, e liga em todos', () => {
        const d = { pessoas: [] };
        const itens = [texto(1, []), texto(2, []), texto(3, [])];
        const plano = planejarAplicacao(d, itens, [{ nome: ' Carla ', papeis: [DE] }]);
        const r = aplicarPlanoPessoas(d, plano);
        assert.equal(d.pessoas.length, 1);
        assert.deepEqual(r.pessoasCriadas, ['Carla']);
        const nova = d.pessoas[0];
        assert.equal(nova.nome, 'Carla');
        assert.deepEqual(
            [nova.grupoIds, nova.autorIds, nova.genero, nova.corRaca, nova.oculto, nova.souEu],
            [[], [], '', '', false, false],
        );
        assert.equal(nova.identidadeCisTrans, '');
        itens.forEach((t) => assert.deepEqual(t.pessoas, [{ pessoaId: nova.id, papeis: [DE] }]));
    });

    it('duas pessoas novas no mesmo lote recebem ids diferentes', () => {
        const d = { pessoas: [] };
        const itens = [texto(1, [])];
        aplicarPlanoPessoas(
            d,
            planejarAplicacao(d, itens, [
                { nome: 'Ana', papeis: [RE] },
                { nome: 'Davi', papeis: [ME] },
            ]),
        );
        assert.equal(d.pessoas.length, 2);
        assert.notEqual(d.pessoas[0].id, d.pessoas[1].id);
        assert.equal(itens[0].pessoas.length, 2);
    });

    it('pessoa ambígua não liga nada nem cria nada', () => {
        const d = { pessoas: [pessoa(1, 'José'), pessoa(2, 'Jose')] };
        const itens = [texto(1, [])];
        const r = aplicarPlanoPessoas(
            d,
            planejarAplicacao(d, itens, [{ nome: 'JOSE', papeis: [RE] }]),
        );
        assert.equal(r.textos, 0);
        assert.deepEqual(itens[0].pessoas, []);
        assert.equal(d.pessoas.length, 2);
    });

    it('operação sem efeito não cria a pessoa nova (nenhum texto selecionado)', () => {
        const d = { pessoas: [] };
        const r = aplicarPlanoPessoas(d, planejarAplicacao(d, [], [{ nome: 'Ana', papeis: [] }]));
        assert.equal(r.textos, 0);
        assert.equal(d.pessoas.length, 0);
    });

    it('desfazer devolve os textos como estavam e apaga as pessoas criadas', () => {
        const d = { pessoas: [pessoa(1, 'Ana')] };
        const itens = [texto(1, [vinculo(1, [DE])]), texto(2, []), texto(3)];
        const antes = copia(itens);
        const plano = planejarAplicacao(d, itens, [
            { nome: 'Ana', papeis: [RE] },
            { nome: 'Carla', papeis: [ME] },
        ]);
        const r = aplicarPlanoPessoas(d, plano);
        assert.equal(d.pessoas.length, 2);
        assert.notDeepEqual(copia(itens), antes);
        r.desfazer();
        assert.deepEqual(copia(itens), antes);
        assert.equal('pessoas' in itens[2], false);
        assert.deepEqual(
            d.pessoas.map((p) => p.nome),
            ['Ana'],
        );
    });

    it('desfazer não mexe em texto que a operação não tocou', () => {
        const d = { pessoas: [pessoa(1, 'Ana')] };
        const intocado = texto(9, [vinculo(1, [RE])]);
        const itens = [texto(1, []), intocado];
        const r = aplicarPlanoPessoas(
            d,
            planejarAplicacao(d, itens, [{ nome: 'Ana', papeis: [RE] }]),
        );
        intocado.pessoas[0].papeis.push(ME);
        r.desfazer();
        assert.deepEqual(intocado.pessoas, [vinculo(1, [RE, ME])]);
    });

    it('caso de uso: vincular o próprio autor com papéis diferentes por grupo de textos', () => {
        const d = { pessoas: [pessoa(1, 'Victor', { souEu: true })] };
        const retratam = [texto(1, []), texto(2, [])];
        const aludem = [texto(3, [vinculo(1, [RE])])];
        aplicarPlanoPessoas(
            d,
            planejarAplicacao(d, retratam, [{ nome: 'Victor', papeis: [RE, IN] }]),
        );
        aplicarPlanoPessoas(d, planejarAplicacao(d, aludem, [{ nome: 'Victor', papeis: [AL] }]));
        assert.deepEqual(retratam[0].pessoas, [{ pessoaId: 1, papeis: [RE, IN] }]);
        assert.deepEqual(aludem[0].pessoas, [{ pessoaId: 1, papeis: [RE, AL] }]);
    });
});

describe('planejarRemocao e aplicarRemocaoPessoas', () => {
    it('com papéis marcados, tira só esses e mantém o vínculo, mesmo sem papel', () => {
        const d = { pessoas: [pessoa(1, 'Ana')] };
        const itens = [texto(1, [vinculo(1, [RE, DE])]), texto(2, [vinculo(1, [DE])])];
        const plano = planejarRemocao(d, itens, [{ nome: 'Ana', papeis: [DE] }]);
        assert.equal(plano.linhas[0].modo, 'papeis');
        assert.equal(plano.textos, 2);
        aplicarRemocaoPessoas(plano);
        assert.deepEqual(itens[0].pessoas, [vinculo(1, [RE])]);
        assert.deepEqual(itens[1].pessoas, [vinculo(1, [])]);
    });

    it('sem papéis marcados, tira a pessoa do texto e deixa as outras', () => {
        const d = { pessoas: [pessoa(1, 'Ana'), pessoa(2, 'Davi')] };
        const itens = [texto(1, [vinculo(1, [RE]), vinculo(2, [ME])]), texto(2, [])];
        const plano = planejarRemocao(d, itens, [{ nome: 'Ana', papeis: [] }]);
        assert.equal(plano.linhas[0].modo, 'pessoa');
        assert.equal(plano.linhas[0].naoTinham, 1);
        aplicarRemocaoPessoas(plano);
        assert.deepEqual(itens[0].pessoas, [vinculo(2, [ME])]);
        assert.deepEqual(itens[1].pessoas, []);
    });

    it('texto com a pessoa mas sem os papéis marcados conta como "não tinha"', () => {
        const d = { pessoas: [pessoa(1, 'Ana')] };
        const itens = [texto(1, [vinculo(1, [RE])]), texto(2, [vinculo(1, [DE])])];
        const plano = planejarRemocao(d, itens, [{ nome: 'Ana', papeis: [DE] }]);
        assert.equal(plano.linhas[0].alterar.length, 1);
        assert.equal(plano.linhas[0].naoTinham, 1);
        assert.deepEqual(plano.linhas[0].alterar[0].tirar, [DE]);
    });

    it('nome fora do cadastro não tem o que remover e nunca é criado', () => {
        const d = { pessoas: [pessoa(1, 'Ana')] };
        const itens = [texto(1, [vinculo(1, [RE])])];
        const plano = planejarRemocao(d, itens, [{ nome: 'Fantasma', papeis: [] }]);
        assert.equal(plano.linhas[0].desconhecida, true);
        assert.equal(plano.textos, 0);
        aplicarRemocaoPessoas(plano);
        assert.equal(d.pessoas.length, 1);
        assert.deepEqual(itens[0].pessoas, [vinculo(1, [RE])]);
    });

    it('nome ambíguo fica de fora', () => {
        const d = { pessoas: [pessoa(1, 'José'), pessoa(2, 'Jose')] };
        const itens = [texto(1, [vinculo(1, [RE])])];
        const plano = planejarRemocao(d, itens, [{ nome: 'JOSE', papeis: [] }]);
        assert.equal(plano.linhas[0].ambigua, true);
        assert.equal(plano.textos, 0);
    });

    it('não altera nada ao planejar', () => {
        const d = { pessoas: [pessoa(1, 'Ana')] };
        const itens = [texto(1, [vinculo(1, [RE, DE])])];
        const antes = copia({ d, itens });
        planejarRemocao(d, itens, [{ nome: 'Ana', papeis: [RE] }]);
        assert.deepEqual(copia({ d, itens }), antes);
    });

    it('desfazer devolve o vínculo, com papéis, na posição de antes', () => {
        const d = { pessoas: [pessoa(1, 'Ana'), pessoa(2, 'Davi')] };
        const itens = [texto(1, [vinculo(1, [RE]), vinculo(2, [ME])])];
        const antes = copia(itens);
        const r = aplicarRemocaoPessoas(planejarRemocao(d, itens, [{ nome: 'Ana', papeis: [] }]));
        assert.notDeepEqual(copia(itens), antes);
        r.desfazer();
        assert.deepEqual(copia(itens), antes);
    });

    it('desfazer de papéis devolve os papéis tirados', () => {
        const d = { pessoas: [pessoa(1, 'Ana')] };
        const itens = [texto(1, [vinculo(1, [RE, DE])])];
        const antes = copia(itens);
        const r = aplicarRemocaoPessoas(
            planejarRemocao(d, itens, [{ nome: 'Ana', papeis: [RE, DE] }]),
        );
        assert.deepEqual(itens[0].pessoas, [vinculo(1, [])]);
        r.desfazer();
        assert.deepEqual(copia(itens), antes);
    });
});

describe('resumirAplicacao', () => {
    it('conta textos, pessoas novas, ambíguas, sem efeito e já estavam assim', () => {
        const d = {
            pessoas: [pessoa(1, 'Ana'), pessoa(2, 'José'), pessoa(3, 'Jose'), pessoa(4, 'Davi')],
        };
        const itens = [texto(1, [vinculo(1, [RE]), vinculo(4, [ME])])];
        const plano = planejarAplicacao(d, itens, [
            { nome: 'Ana', papeis: [RE] },
            { nome: 'Carla', papeis: [DE] },
            { nome: 'JOSE', papeis: [RE] },
            { nome: 'Davi', papeis: [ME] },
        ]);
        const r = resumirAplicacao(plano);
        assert.deepEqual(r.novas, ['Carla']);
        assert.deepEqual(r.ambiguas, ['JOSE']);
        assert.deepEqual(r.semEfeito, ['Ana', 'Davi']);
        assert.equal(r.jaTinham, 2);
        assert.equal(r.textos, 1);
        assert.deepEqual(
            r.linhas.map((l) => l.nome),
            ['Ana', 'Carla', 'Davi'],
        );
        assert.deepEqual(
            [r.linhas[0].entram, r.linhas[0].completam, r.linhas[0].jaTinham],
            [0, 0, 1],
        );
        assert.deepEqual([r.linhas[1].entram, r.linhas[1].nova], [1, true]);
    });
});

describe('resumirRemocao', () => {
    it('separa desconhecidas, ambíguas, sem efeito e as que mudam textos', () => {
        const d = {
            pessoas: [pessoa(1, 'Ana'), pessoa(2, 'José'), pessoa(3, 'Jose'), pessoa(4, 'Davi')],
        };
        const itens = [texto(1, [vinculo(1, [RE])])];
        const plano = planejarRemocao(d, itens, [
            { nome: 'Ana', papeis: [] },
            { nome: 'Fantasma', papeis: [] },
            { nome: 'JOSE', papeis: [] },
            { nome: 'Davi', papeis: [RE] },
        ]);
        const r = resumirRemocao(plano);
        assert.deepEqual(r.desconhecidas, ['Fantasma']);
        assert.deepEqual(r.ambiguas, ['JOSE']);
        assert.deepEqual(r.semEfeito, ['Davi']);
        assert.equal(r.textos, 1);
        assert.deepEqual(r.linhas, [
            { nome: 'Ana', modo: 'pessoa', papeis: [], alterar: 1, naoTinham: 0 },
        ]);
    });
});
