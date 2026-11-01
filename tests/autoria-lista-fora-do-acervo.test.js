import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { montarForaDoAcervo, filtrarObras, filtrarAutores } from '../js/fora-do-acervo.js';
import {
    aplicarPlano,
    chaveDaObra,
    descreverPlano,
    planejarCorrecao,
} from '../js/corrigir-fora-do-acervo.js';
import {
    FILTRO_AUTOR_VARIOS_NOMES,
    aplicarRevisao,
    filtrarLinhasRevisao,
    listarLinhasRevisao,
    planejarRevisao,
    sugestoesDaRevisao,
} from '../js/revisao-fora-do-acervo.js';
import {
    extrairAutoresUnicos,
    extrairDescricoesDaObra,
    extrairObrasUnicas,
} from '../js/intertextualidade.js';
import { partesEntradaIntertexto } from '../js/utils.js';

// Autoria em lista, entrega 1: Fora do acervo, correções e Modo revisão leem e
// gravam lista de autores, sem tela e sem mudar o formato de quem tem um autor só.

const inter = (obra, autorOuLista, extra = {}) => ({
    relacao: 'Citação',
    tipoObra: 'Música',
    obra,
    ...(Array.isArray(autorOuLista) ? { autores: autorOuLista } : { autor: autorOuLista }),
    ...extra,
});

const garota = ['Tom Jobim', 'Vinicius de Moraes'];

const poemas = () => [
    { id: 1, titulo: 'Um', intertextualidade: [inter('Garota de Ipanema', garota)] },
    {
        id: 2,
        titulo: 'Dois',
        intertextualidade: [inter('garota de ipanema', ['vinicius de moraes', 'Tom Jobim'])],
    },
    { id: 3, titulo: 'Três', intertextualidade: [inter('Chega de Saudade', 'Tom Jobim')] },
];

describe('Fora do acervo com autores em lista', () => {
    it('a ordem dos autores não separa a obra', () => {
        const { obras } = montarForaDoAcervo({ poemas: poemas() });
        const garotaDeIpanema = obras.filter((o) => o.chaveObra === 'garota de ipanema');
        assert.equal(garotaDeIpanema.length, 1);
        const o = garotaDeIpanema[0];
        assert.equal(o.totalTextos, 2);
        assert.deepEqual(o.autores, garota);
        assert.equal(o.autor, 'Tom Jobim e Vinicius de Moraes');
        assert.equal(o.grafias.length, 2);
    });

    it('a obra aparece sob cada um dos autores, e o total de textos de cada um fica certo', () => {
        const { autores, totais } = montarForaDoAcervo({ poemas: poemas() });
        const tom = autores.find((a) => a.chave === 'tom jobim');
        const vinicius = autores.find((a) => a.chave === 'vinicius de moraes');
        assert.equal(tom.totalTextos, 3);
        assert.equal(tom.obras.length, 2);
        assert.equal(vinicius.totalTextos, 2);
        assert.equal(vinicius.obras.length, 1);
        assert.deepEqual(vinicius.obras[0].autores, garota);
        assert.equal(totais.autores, 2);
        assert.equal(totais.obras, 2);
    });

    it('autor antigo em texto e lista de um autor só dão a mesma obra', () => {
        const { obras } = montarForaDoAcervo({
            poemas: [
                { id: 1, titulo: 'A', intertextualidade: [inter('Casa', 'Ana')] },
                { id: 2, titulo: 'B', intertextualidade: [inter('Casa', ['Ana'])] },
            ],
        });
        assert.equal(obras.length, 1);
        assert.equal(obras[0].totalTextos, 2);
        assert.deepEqual(obras[0].autores, ['Ana']);
    });

    it('a mesma obra com autores diferentes continua separada e vira aviso de autor', () => {
        const { obras, quaseDuplicatas } = montarForaDoAcervo({
            poemas: [
                { id: 1, titulo: 'A', intertextualidade: [inter('Casa', ['Ana'])] },
                { id: 2, titulo: 'B', intertextualidade: [inter('Casa', ['Ana', 'Beto'])] },
            ],
        });
        assert.equal(obras.length, 2);
        const aviso = quaseDuplicatas.find((q) => q.motivo === 'autor');
        assert.ok(aviso);
        const listas = aviso.itens.map((i) => i.autores.join('+')).sort();
        assert.deepEqual(listas, ['Ana', 'Ana+Beto']);
    });

    it('títulos parecidos entram no aviso quando as obras dividem um autor', () => {
        const { quaseDuplicatas } = montarForaDoAcervo({
            poemas: [
                {
                    id: 1,
                    titulo: 'A',
                    intertextualidade: [inter('Construcao', ['Chico', 'Outro'])],
                },
                { id: 2, titulo: 'B', intertextualidade: [inter('Construcão!', ['Chico'])] },
                { id: 3, titulo: 'C', intertextualidade: [inter('Construcao ', ['Fulano'])] },
            ],
        });
        // 1 e 2 têm títulos iguais após a chave (mesmo título, autores diferentes: aviso de autor);
        // o parecido exige títulos de chave diferente, então aqui só vale o aviso de autor.
        assert.ok(quaseDuplicatas.some((q) => q.motivo === 'autor'));
    });

    it('títulos de chave diferente que dividem um autor viram "parecido"; sem autor em comum, não', () => {
        const base = [
            {
                id: 1,
                titulo: 'A',
                intertextualidade: [inter('Construcao Maior', ['Chico', 'Outro'])],
            },
            { id: 2, titulo: 'B', intertextualidade: [inter('Construcao Maio', ['Chico'])] },
        ];
        const com = montarForaDoAcervo({ poemas: base });
        assert.ok(com.quaseDuplicatas.some((q) => q.motivo === 'parecido'));
        const sem = montarForaDoAcervo({
            poemas: [
                base[0],
                { id: 2, titulo: 'B', intertextualidade: [inter('Construcao Maio', ['Fulano'])] },
            ],
        });
        assert.equal(
            sem.quaseDuplicatas.some((q) => q.motivo === 'parecido'),
            false,
        );
    });

    it('a Hipertextualidade também lê a lista, nas obras e nas derivações', () => {
        const { obras, derivacoes } = montarForaDoAcervo({
            poemas: [
                {
                    id: 1,
                    titulo: 'A',
                    hipertextualidade: [
                        {
                            relacao: 'Paródia',
                            tipoObra: 'Livro',
                            hipotexto: 'Obra',
                            autores: ['X', 'Y'],
                        },
                    ],
                },
            ],
        });
        assert.deepEqual(obras[0].autores, ['X', 'Y']);
        assert.equal(derivacoes[0].hipotextos[0].autor, 'X e Y');
        assert.deepEqual(derivacoes[0].hipotextos[0].autores, ['X', 'Y']);
    });

    it('os filtros de Obras e Autores acham pelo segundo autor', () => {
        const dados = montarForaDoAcervo({ poemas: poemas() });
        assert.equal(filtrarObras(dados.obras, 'vinicius').length, 1);
        assert.equal(filtrarAutores(dados.autores, 'vinicius').length, 1);
    });
});

describe('Corrigir obra e autor com lista', () => {
    const entrada = () => ({
        poemas: [
            {
                id: 1,
                titulo: 'Um',
                intertextualidade: [
                    inter('Garota', 'Tom Jobim'),
                    inter('Outra', ['A', 'Tom', 'B']),
                ],
            },
            {
                id: 2,
                titulo: 'Dois',
                hipertextualidade: [
                    { hipotexto: 'Garota', tipoObra: 'Música', autor: 'Tom Jobim' },
                ],
            },
        ],
    });

    it('a chave da obra ignora a ordem dos autores', () => {
        assert.equal(
            chaveDaObra({ obra: 'X', autores: ['B', 'A'] }, 'obra'),
            chaveDaObra({ obra: 'x', autores: ['A', 'B'] }, 'obra'),
        );
    });

    it('corrigir a obra com lista grava `autores`, e o Desfazer devolve o formato antigo', () => {
        const e = entrada();
        const plano = planejarCorrecao(e, {
            tipo: 'obra',
            alvos: ['garota|tom jobim'],
            novo: { obra: 'Garota de Ipanema', autores: garota },
        });
        assert.equal(plano.entradas, 2);
        const aplicado = aplicarPlano(plano);
        assert.deepEqual(e.poemas[0].intertextualidade[0].autores, garota);
        assert.equal('autor' in e.poemas[0].intertextualidade[0], false);
        assert.deepEqual(e.poemas[1].hipertextualidade[0].autores, garota);
        aplicado.desfazer();
        assert.deepEqual(e, entrada());
    });

    it('`novo.autor` em texto continua valendo e não muda o formato da entrada', () => {
        const e = entrada();
        const plano = planejarCorrecao(e, {
            tipo: 'obra',
            alvos: ['garota|tom jobim'],
            novo: { obra: 'Garota', autor: 'Antonio Carlos Jobim' },
        });
        aplicarPlano(plano);
        assert.equal(e.poemas[0].intertextualidade[0].autor, 'Antonio Carlos Jobim');
        assert.equal('autores' in e.poemas[0].intertextualidade[0], false);
    });

    it('mudar só a ordem dos autores conta como mudança, e a obra continua a mesma', () => {
        const e = { poemas: [{ id: 1, titulo: 'A', intertextualidade: [inter('X', ['B', 'A'])] }] };
        const alvo = chaveDaObra(e.poemas[0].intertextualidade[0], 'obra');
        const plano = planejarCorrecao(e, {
            tipo: 'obra',
            alvos: [alvo],
            novo: { obra: 'X', autores: ['A', 'B'] },
        });
        assert.equal(plano.entradas, 1);
        aplicarPlano(plano);
        assert.deepEqual(e.poemas[0].intertextualidade[0].autores, ['A', 'B']);
        assert.equal(chaveDaObra(e.poemas[0].intertextualidade[0], 'obra'), alvo);
    });

    it('repetir a mesma lista não muda nada', () => {
        const e = { poemas: [{ id: 1, titulo: 'A', intertextualidade: [inter('X', ['A', 'B'])] }] };
        const plano = planejarCorrecao(e, {
            tipo: 'obra',
            alvos: [chaveDaObra(e.poemas[0].intertextualidade[0], 'obra')],
            novo: { obra: 'X', autores: ['A', 'B'] },
        });
        assert.equal(plano.entradas, 0);
        assert.equal(plano.jaIguais, 1);
    });

    it('lista vazia tira os autores da obra', () => {
        const e = entrada();
        const plano = planejarCorrecao(e, {
            tipo: 'obra',
            alvos: ['garota|tom jobim'],
            novo: { obra: 'Garota', autores: [] },
        });
        aplicarPlano(plano);
        assert.equal(e.poemas[0].intertextualidade[0].autor, '');
    });

    it('corrigir um autor troca só a tag dele, em qualquer posição da lista', () => {
        const e = entrada();
        const plano = planejarCorrecao(e, {
            tipo: 'autor',
            alvos: ['tom'],
            novo: { autor: 'Tom Jobim' },
        });
        assert.equal(plano.entradas, 1);
        const aplicado = aplicarPlano(plano);
        assert.deepEqual(e.poemas[0].intertextualidade[1].autores, ['A', 'Tom Jobim', 'B']);
        aplicado.desfazer();
        assert.deepEqual(e, entrada());
    });

    it('corrigir um autor atinge a entrada de um autor só e a de vários, sem trocar o formato da antiga', () => {
        const e = entrada();
        const plano = planejarCorrecao(e, {
            tipo: 'autor',
            alvos: ['tom jobim', 'tom'],
            novo: { autor: 'Antonio Carlos Jobim' },
        });
        assert.equal(plano.entradas, 3);
        aplicarPlano(plano);
        assert.equal(e.poemas[0].intertextualidade[0].autor, 'Antonio Carlos Jobim');
        assert.deepEqual(e.poemas[0].intertextualidade[1].autores, [
            'A',
            'Antonio Carlos Jobim',
            'B',
        ]);
        assert.equal(e.poemas[1].hipertextualidade[0].autor, 'Antonio Carlos Jobim');
    });

    it('se o autor novo já estava na lista, as tags se juntam', () => {
        const e = {
            poemas: [{ id: 1, titulo: 'A', intertextualidade: [inter('X', ['Tom', 'Tom Jobim'])] }],
        };
        const plano = planejarCorrecao(e, {
            tipo: 'autor',
            alvos: ['tom'],
            novo: { autor: 'Tom Jobim' },
        });
        aplicarPlano(plano);
        assert.deepEqual(e.poemas[0].intertextualidade[0].autores, ['Tom Jobim']);
    });

    it('conta com quem a correção de autor se junta', () => {
        const e = {
            poemas: [
                { id: 1, titulo: 'A', intertextualidade: [inter('X', ['Tom'])] },
                { id: 2, titulo: 'B', intertextualidade: [inter('Y', ['Tom Jobim', 'Elis'])] },
            ],
        };
        const plano = planejarCorrecao(e, {
            tipo: 'autor',
            alvos: ['tom'],
            novo: { autor: 'Tom Jobim' },
        });
        assert.equal(plano.juntaCom, 1);
    });

    it('as frases da confirmação mostram a lista inteira', () => {
        const e = entrada();
        const plano = planejarCorrecao(e, {
            tipo: 'obra',
            alvos: ['garota|tom jobim'],
            novo: { obra: 'Garota de Ipanema', autores: garota },
        });
        const { linhas } = descreverPlano(plano);
        assert.match(
            linhas[0],
            /«Garota» \(Tom Jobim\) → «Garota de Ipanema» \(Tom Jobim e Vinicius de Moraes\)/,
        );
    });
});

describe('Modo revisão com lista de autores', () => {
    const dados = () => ({
        poemas: [
            {
                id: 1,
                titulo: 'Um',
                intertextualidade: [
                    inter('A', ['Elis Regina', 'Tom Jobim']),
                    inter('B', 'Tom Jobim e Vinicius de Moraes'),
                    inter('C', 'Machado de Assis'),
                ],
            },
        ],
    });

    it('a linha traz a lista e a frase', () => {
        const [a, b] = listarLinhasRevisao(dados());
        assert.deepEqual(a.valores.autores, ['Elis Regina', 'Tom Jobim']);
        assert.equal(a.valores.autor, 'Elis Regina e Tom Jobim');
        assert.deepEqual(b.valores.autores, ['Tom Jobim e Vinicius de Moraes']);
    });

    it('editar com uma lista grava `autores`, e o Desfazer devolve o formato antigo', () => {
        const d = dados();
        const [, b] = listarLinhasRevisao(d);
        const plano = planejarRevisao(d, [
            { chave: b.chave, valores: { autores: ['Tom Jobim', 'Vinicius de Moraes'] } },
        ]);
        assert.equal(plano.entradas, 1);
        assert.deepEqual(plano.camposAlterados, { autor: 1 });
        const aplicado = aplicarRevisao(plano);
        assert.deepEqual(d.poemas[0].intertextualidade[1].autores, [
            'Tom Jobim',
            'Vinicius de Moraes',
        ]);
        assert.equal('autor' in d.poemas[0].intertextualidade[1], false);
        aplicado.desfazer();
        assert.deepEqual(d, dados());
    });

    it('editar com um nome em texto continua valendo como uma tag e mantém o formato antigo', () => {
        const d = dados();
        const [, , c] = listarLinhasRevisao(d);
        aplicarRevisao(planejarRevisao(d, [{ chave: c.chave, valores: { autor: 'Machado' } }]));
        assert.equal(d.poemas[0].intertextualidade[2].autor, 'Machado');
    });

    it('a mesma lista, ou a mesma tag em texto, não muda nada', () => {
        const d = dados();
        const [a, , c] = listarLinhasRevisao(d);
        const plano = planejarRevisao(d, [
            { chave: a.chave, valores: { autores: ['Elis Regina', 'Tom Jobim'] } },
            { chave: c.chave, valores: { autor: 'Machado de Assis' } },
        ]);
        assert.equal(plano.entradas, 0);
    });

    it('mudar a ordem dos autores é uma mudança', () => {
        const d = dados();
        const [a] = listarLinhasRevisao(d);
        const plano = planejarRevisao(d, [
            { chave: a.chave, valores: { autores: ['Tom Jobim', 'Elis Regina'] } },
        ]);
        assert.equal(plano.entradas, 1);
    });

    it('a busca olha cada tag, sem inventar vírgulas', () => {
        const linhas = listarLinhasRevisao(dados());
        assert.equal(filtrarLinhasRevisao(linhas, 'elis').length, 1);
        assert.equal(filtrarLinhasRevisao(linhas, 'tom jobim').length, 2);
        // A frase "Elis Regina e Tom Jobim" tem "e", mas a vírgula só existe se foi digitada.
        assert.equal(filtrarLinhasRevisao(linhas, ',').length, 0);
    });

    it('"autor parece ter mais de um nome" acha só o que pede divisão', () => {
        const linhas = listarLinhasRevisao(dados());
        const achadas = filtrarLinhasRevisao(linhas, '', { faltando: FILTRO_AUTOR_VARIOS_NOMES });
        assert.deepEqual(
            achadas.map((l) => l.valores.nome),
            ['B'],
        );
    });

    it('"Por preencher: autor" segue achando linhas sem nenhum autor', () => {
        const d = {
            poemas: [
                {
                    id: 1,
                    titulo: 'A',
                    intertextualidade: [inter('X', []), inter('Y', ''), inter('Z', ['A'])],
                },
            ],
        };
        const achadas = filtrarLinhasRevisao(listarLinhasRevisao(d), '', { faltando: 'autor' });
        assert.deepEqual(
            achadas.map((l) => l.valores.nome),
            ['X', 'Y'],
        );
    });

    it('as sugestões de autor são uma por tag', () => {
        const { autor } = sugestoesDaRevisao(listarLinhasRevisao(dados()));
        assert.ok(autor.includes('Elis Regina'));
        assert.ok(autor.includes('Tom Jobim'));
        assert.equal(autor.includes('Elis Regina e Tom Jobim'), false);
    });
});

describe('Leitores de autores no resto do app', () => {
    it('a linha de Intertextualidade mostra os autores juntos', () => {
        const p = partesEntradaIntertexto({ obra: 'Garota', autores: garota, personagem: 'Ela' });
        assert.equal(p.corpo, 'Garota (Tom Jobim e Vinicius de Moraes; personagem Ela)');
        assert.equal(partesEntradaIntertexto({ obra: 'Casa', autor: 'Ana' }).corpo, 'Casa (Ana)');
    });

    it('as sugestões de autor e de obra olham cada tag', () => {
        const itens = poemas();
        assert.ok(extrairAutoresUnicos(itens).includes('Tom Jobim'));
        assert.ok(extrairAutoresUnicos(itens).includes('Vinicius de Moraes'));
        // O filtro vale pela chave do autor (sem caixa nem acento): a grafia
        // "vinicius de moraes" da segunda entrada também conta.
        assert.deepEqual(extrairObrasUnicas(itens, { autor: 'Vinicius de Moraes' }), [
            'garota de ipanema',
            'Garota de Ipanema',
        ]);
        assert.deepEqual(
            extrairDescricoesDaObra(
                [
                    {
                        intertextualidade: [inter('Garota', garota, { descricao: 'bossa nova' })],
                    },
                ],
                { obra: 'Garota', autor: 'Vinicius de Moraes' },
            ),
            ['bossa nova'],
        );
    });
});
