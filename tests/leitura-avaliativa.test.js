// Leitura avaliativa (Fase 22, entrega 1): lógica pura das listas, da
// validação, da sugestão de corações (F22-D9) e do histórico.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    ITENS_PEGOU,
    ITENS_INCOMODOU,
    PESOS,
    RESPOSTAS,
    coracoesValidos,
    maiorPeso,
    sugerirCoracoes,
    temDivergencia,
    criarLeitura,
    limparLeitura,
    validarLeitura,
    ordenarLeiturasRecentes,
    ultimaLeitura,
    rotuloItemPegou,
    rotuloItemIncomodou,
    rotuloDoPeso,
    valorDoPeso,
} from '../js/leitura-avaliativa.js';

const leituraBoa = (extra = {}) => ({
    id: 1,
    textoId: 10,
    tipo: 'poema',
    data: '2026-11-01',
    pegou: [{ item: 'imagem', peso: 'forte' }],
    incomodou: ['cliche'],
    releria: 'sim',
    mostraria: 'talvez',
    sugerido: 3.5,
    escolhido: 4,
    ...extra,
});

describe('listas de fábrica', () => {
    it('De que maneira te pegou tem 13 itens e O que incomodou tem 12', () => {
        assert.equal(ITENS_PEGOU.length, 13);
        assert.equal(ITENS_INCOMODOU.length, 12);
    });

    it('De que maneira te pegou segue a ordem combinada: Graça junto de Surpresa, Comoção depois de Identificação', () => {
        assert.deepEqual(
            ITENS_PEGOU.map((i) => i.id),
            [
                'som',
                'palavra',
                'imagem',
                'ideia',
                'voz',
                'atmosfera',
                'surpresa',
                'graca',
                'identificacao',
                'comocao',
                'construcao',
                'engenho',
                'originalidade',
            ],
        );
    });

    it('os ids são únicos, em minúsculas e sem acento', () => {
        for (const lista of [ITENS_PEGOU, ITENS_INCOMODOU, PESOS, RESPOSTAS]) {
            const ids = lista.map((i) => i.id);
            assert.equal(new Set(ids).size, ids.length);
            for (const id of ids) assert.match(id, /^[a-z_]+$/);
        }
    });

    it('os pesos são leve, forte e centro, em ordem crescente', () => {
        assert.deepEqual(
            PESOS.map((p) => p.id),
            ['leve', 'forte', 'centro'],
        );
        assert.ok(valorDoPeso('leve') < valorDoPeso('forte'));
        assert.ok(valorDoPeso('forte') < valorDoPeso('centro'));
        assert.equal(valorDoPeso('xyz'), 0);
    });

    it('os rótulos dos pesos falam da experiência: Pontual, Marcante e Central (F22-D23)', () => {
        assert.deepEqual(
            PESOS.map((p) => p.rotulo),
            ['Pontual', 'Marcante', 'Central'],
        );
        assert.equal(rotuloDoPeso('leve'), 'Pontual');
        assert.equal(rotuloDoPeso('forte'), 'Marcante');
        assert.equal(rotuloDoPeso('centro'), 'Central');
        assert.equal(rotuloDoPeso('xyz'), '');
        for (const p of PESOS) assert.ok(p.descricao, `${p.id} sem descrição`);
    });

    it('as respostas são sim, talvez e nao', () => {
        assert.deepEqual(
            RESPOSTAS.map((r) => r.id),
            ['sim', 'talvez', 'nao'],
        );
    });

    it('todo item tem rótulo e descrição', () => {
        for (const i of [...ITENS_PEGOU, ...ITENS_INCOMODOU]) {
            assert.ok(i.rotulo.length > 0);
            assert.ok(i.descricao.length > 0);
        }
        assert.equal(rotuloItemPegou('engenho'), 'Engenho');
        assert.equal(rotuloItemIncomodou('explica_demais'), 'Explica demais');
        assert.equal(rotuloItemPegou('nada'), '');
    });

    it('as listas não têm travessão', () => {
        const todos = JSON.stringify([ITENS_PEGOU, ITENS_INCOMODOU, PESOS, RESPOSTAS]);
        assert.ok(!todos.includes('—'));
    });
});

describe('coracoesValidos', () => {
    it('aceita 0,5 a 5 em passos de 0,5', () => {
        for (const n of [0.5, 1, 1.5, 2.5, 4, 5]) assert.equal(coracoesValidos(n), true);
    });

    it('recusa 0, fora da faixa, passos quebrados e vazios', () => {
        for (const n of [0, -1, 5.5, 0.3, 2.25, 'x', null, undefined, '', NaN]) {
            assert.equal(coracoesValidos(n), false, String(n));
        }
    });
});

describe('maiorPeso', () => {
    it('devolve o maior peso entre os marcados', () => {
        assert.equal(
            maiorPeso([
                { item: 'som', peso: 'leve' },
                { item: 'voz', peso: 'centro' },
                { item: 'ideia', peso: 'forte' },
            ]),
            'centro',
        );
    });

    it('devolve null sem marcas, com lista inválida ou com peso desconhecido', () => {
        assert.equal(maiorPeso([]), null);
        assert.equal(maiorPeso(undefined), null);
        assert.equal(maiorPeso([{ item: 'som', peso: 'enorme' }]), null);
    });
});

describe('sugerirCoracoes (F22-D9)', () => {
    it('soma Releria, Mostraria e o maior peso', () => {
        const r = sugerirCoracoes(leituraBoa());
        // sim 2 + talvez 0,5 + forte 1
        assert.equal(r.coracoes, 3.5);
        assert.deepEqual(r.partes, { releria: 2, mostraria: 0.5, maiorPeso: 1 });
    });

    it('o máximo é 5: sim, sim e centro', () => {
        const r = sugerirCoracoes(
            leituraBoa({ mostraria: 'sim', pegou: [{ item: 'ideia', peso: 'centro' }] }),
        );
        assert.equal(r.coracoes, 5);
    });

    it('sem nada marcado em De que maneira te pegou, o peso conta 0', () => {
        const r = sugerirCoracoes(leituraBoa({ pegou: [] }));
        assert.equal(r.partes.maiorPeso, 0);
        assert.equal(r.coracoes, 2.5);
        assert.match(r.motivo, /nada marcado/);
    });

    it('o mínimo é 0,5, nunca 0 (0 é "não avaliado")', () => {
        const r = sugerirCoracoes(leituraBoa({ releria: 'nao', mostraria: 'nao', pegou: [] }));
        assert.equal(r.coracoes, 0.5);
        assert.match(r.motivo, /mínimo é 0,5/);
    });

    it('um peso leve vale meio coração', () => {
        const r = sugerirCoracoes(
            leituraBoa({
                releria: 'nao',
                mostraria: 'nao',
                pegou: [{ item: 'som', peso: 'leve' }],
            }),
        );
        assert.equal(r.coracoes, 0.5);
        assert.equal(r.partes.maiorPeso, 0.5);
    });

    it('o resultado é sempre um valor válido de corações', () => {
        for (const releria of ['sim', 'talvez', 'nao']) {
            for (const mostraria of ['sim', 'talvez', 'nao']) {
                for (const pegou of [
                    [],
                    [{ item: 'som', peso: 'leve' }],
                    [{ item: 'som', peso: 'forte' }],
                    [{ item: 'som', peso: 'centro' }],
                ]) {
                    const r = sugerirCoracoes({ releria, mostraria, pegou });
                    assert.equal(coracoesValidos(r.coracoes), true);
                }
            }
        }
    });

    it('sem resposta em Releria ou Mostraria não sugere nada e explica', () => {
        for (const extra of [{ releria: null }, { mostraria: null }, { releria: 'quem sabe' }]) {
            const r = sugerirCoracoes(leituraBoa(extra));
            assert.equal(r.coracoes, null);
            assert.match(r.motivo, /Responda/);
        }
        assert.equal(sugerirCoracoes(null).coracoes, null);
    });

    it('o motivo é uma frase com a conta, com vírgula decimal e sem travessão', () => {
        const r = sugerirCoracoes(leituraBoa());
        assert.match(r.motivo, /Releria: sim \(\+2\)/);
        assert.match(r.motivo, /mostraria: talvez \(\+0,5\)/);
        assert.match(r.motivo, /marcante \(\+1\)/);
        assert.match(r.motivo, /total 3,5\.$/);
        assert.ok(!r.motivo.includes('—'));
    });

    it('"O que incomodou" não muda a sugestão', () => {
        const a = sugerirCoracoes(leituraBoa({ incomodou: [] }));
        const b = sugerirCoracoes(leituraBoa({ incomodou: ['cliche', 'frouxo', 'cansativo'] }));
        assert.equal(a.coracoes, b.coracoes);
    });
});

describe('temDivergencia', () => {
    it('só existe com os dois preenchidos e diferentes', () => {
        assert.equal(temDivergencia(leituraBoa()), true);
        assert.equal(temDivergencia(leituraBoa({ escolhido: 3.5 })), false);
        assert.equal(temDivergencia(leituraBoa({ escolhido: null })), false);
        assert.equal(temDivergencia(leituraBoa({ sugerido: null })), false);
        assert.equal(temDivergencia(null), false);
    });
});

describe('criarLeitura', () => {
    it('nasce vazia, sem corações e sem respostas', () => {
        const l = criarLeitura({ id: 7, textoId: 3, tipo: 'prosa', data: '2026-11-01' });
        assert.deepEqual(l, {
            id: 7,
            textoId: 3,
            tipo: 'prosa',
            data: '2026-11-01',
            pegou: [],
            incomodou: [],
            releria: null,
            mostraria: null,
            sugerido: null,
            escolhido: null,
        });
    });

    it('cada chamada devolve listas novas', () => {
        const a = criarLeitura();
        const b = criarLeitura();
        a.pegou.push({ item: 'som', peso: 'leve' });
        assert.equal(b.pegou.length, 0);
    });
});

describe('validarLeitura', () => {
    it('aceita uma leitura boa', () => {
        assert.deepEqual(validarLeitura(leituraBoa()), { ok: true, erros: [] });
    });

    it('aceita uma leitura recém-criada com texto e data', () => {
        const l = criarLeitura({ id: 1, textoId: 2, tipo: 'poema', data: '2026-11-01' });
        assert.equal(validarLeitura(l).ok, true);
    });

    it('recusa leitura ausente', () => {
        assert.equal(validarLeitura(null).ok, false);
        assert.equal(validarLeitura('x').ok, false);
    });

    it('recusa sem texto, com tipo ruim ou com data ruim', () => {
        assert.equal(validarLeitura(leituraBoa({ textoId: null })).ok, false);
        assert.equal(validarLeitura(leituraBoa({ tipo: 'livro' })).ok, false);
        assert.equal(validarLeitura(leituraBoa({ data: '2026-02-30' })).ok, false);
        assert.equal(validarLeitura(leituraBoa({ data: '01/11/2026' })).ok, false);
    });

    it('recusa item desconhecido, repetido ou peso inválido em De que maneira te pegou', () => {
        assert.equal(
            validarLeitura(leituraBoa({ pegou: [{ item: 'cheiro', peso: 'leve' }] })).ok,
            false,
        );
        assert.equal(
            validarLeitura(
                leituraBoa({
                    pegou: [
                        { item: 'som', peso: 'leve' },
                        { item: 'som', peso: 'forte' },
                    ],
                }),
            ).ok,
            false,
        );
        assert.equal(validarLeitura(leituraBoa({ pegou: [{ item: 'som', peso: 'x' }] })).ok, false);
    });

    it('recusa item desconhecido ou repetido em O que incomodou', () => {
        assert.equal(validarLeitura(leituraBoa({ incomodou: ['longo_demais'] })).ok, false);
        assert.equal(validarLeitura(leituraBoa({ incomodou: ['cliche', 'cliche'] })).ok, false);
    });

    it('recusa resposta e corações inválidos, mas aceita null', () => {
        assert.equal(validarLeitura(leituraBoa({ releria: 'quem sabe' })).ok, false);
        assert.equal(validarLeitura(leituraBoa({ escolhido: 0 })).ok, false);
        assert.equal(validarLeitura(leituraBoa({ sugerido: 7 })).ok, false);
        assert.equal(validarLeitura(leituraBoa({ releria: null, escolhido: null })).ok, true);
    });

    it('lista todos os erros de uma vez', () => {
        const r = validarLeitura(leituraBoa({ textoId: null, tipo: 'x', data: '' }));
        assert.equal(r.erros.length, 3);
    });
});

describe('limparLeitura', () => {
    it('mantém uma leitura boa como está', () => {
        assert.deepEqual(limparLeitura(leituraBoa()), leituraBoa());
    });

    it('tira o que não reconhece e não inventa o que falta', () => {
        const l = limparLeitura({
            id: 5,
            textoId: 9,
            tipo: 'xx',
            data: 'ontem',
            pegou: [
                { item: 'som', peso: 'leve' },
                { item: 'som', peso: 'forte' },
                { item: 'cheiro', peso: 'leve' },
                { item: 'voz', peso: 'enorme' },
                null,
            ],
            incomodou: ['cliche', 'cliche', 'outro'],
            releria: 'quem sabe',
            mostraria: 'nao',
            sugerido: 0,
            escolhido: 9,
        });
        assert.deepEqual(l.pegou, [{ item: 'som', peso: 'leve' }]);
        assert.deepEqual(l.incomodou, ['cliche']);
        assert.equal(l.tipo, 'poema');
        assert.equal(l.data, '');
        assert.equal(l.releria, null);
        assert.equal(l.mostraria, 'nao');
        assert.equal(l.sugerido, null);
        assert.equal(l.escolhido, null);
    });

    it('não muda a leitura recebida', () => {
        const original = leituraBoa({ incomodou: ['cliche', 'cliche'] });
        const copia = JSON.parse(JSON.stringify(original));
        limparLeitura(original);
        assert.deepEqual(original, copia);
    });

    it('aguenta entrada que não é objeto', () => {
        assert.equal(limparLeitura(null).textoId, null);
        assert.deepEqual(limparLeitura(undefined).pegou, []);
    });
});

describe('histórico', () => {
    const lista = [
        leituraBoa({ id: 1, data: '2026-10-01' }),
        leituraBoa({ id: 3, data: '2026-11-01' }),
        leituraBoa({ id: 2, data: '2026-11-01' }),
    ];

    it('ordena da mais recente para a mais antiga, desempatando pelo id', () => {
        assert.deepEqual(
            ordenarLeiturasRecentes(lista).map((l) => l.id),
            [3, 2, 1],
        );
    });

    it('não muda a lista recebida', () => {
        const antes = lista.map((l) => l.id);
        ordenarLeiturasRecentes(lista);
        assert.deepEqual(
            lista.map((l) => l.id),
            antes,
        );
    });

    it('ultimaLeitura devolve a mais recente, ou null se não houver', () => {
        assert.equal(ultimaLeitura(lista).id, 3);
        assert.equal(ultimaLeitura([]), null);
        assert.equal(ultimaLeitura(undefined), null);
    });
});
