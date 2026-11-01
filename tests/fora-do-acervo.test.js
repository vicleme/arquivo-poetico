import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    chaveDeNome,
    montarForaDoAcervo,
    filtrarObras,
    filtrarAutores,
    ordenarObrasDaLista,
    ordenarAutoresDaLista,
} from '../js/fora-do-acervo.js';

// T9, entrega 1: lógica pura da seção "Fora do acervo" da aba Conexões.

const inter = (obra, autor = '', extra = {}) => ({
    relacao: 'Citação',
    tipoObra: 'Música',
    obra,
    autor,
    ...extra,
});
const hiper = (hipotexto, autor = '', extra = {}) => ({
    relacao: 'Paródia',
    tipoObra: 'Livro',
    hipotexto,
    autor,
    ...extra,
});

const poemas = [
    {
        id: 1,
        titulo: 'Águas',
        intertextualidade: [inter('Águas de Março', 'Tom Jobim')],
        hipertextualidade: [],
        referenciasExternas: [{ tipo: 'Marco histórico', texto: 'Enchente de 2011' }],
    },
    {
        id: 2,
        titulo: 'Casmurro',
        intertextualidade: [inter('aguas de março', 'tom jobim', { relacao: 'Alusão' })],
        hipertextualidade: [hiper('Dom Casmurro', 'Machado de Assis')],
        referenciasExternas: [{ tipo: 'marco histórico', texto: 'enchente de 2011' }],
    },
    { id: 3, titulo: 'Sem nada', intertextualidade: [], hipertextualidade: [] },
];
const prosas = [
    {
        id: 1,
        titulo: 'Conto',
        intertextualidade: [
            inter('Águas de Março', 'Tom Jobim'),
            inter('Águas de Março', 'Tom Jobim', { relacao: 'Menção' }),
            inter('Aguas de Marco', ''),
        ],
        hipertextualidade: [hiper('Dom Casmurro', 'Machado de Assis')],
        referenciasExternas: [{ tipo: 'Notícia', texto: 'Só uma vez' }],
    },
];
const r = montarForaDoAcervo({ poemas, prosas });
const obra = (nome, autor) =>
    r.obras.find((o) => o.chaveObra === chaveDeNome(nome) && o.autor === autor);

describe('chaveDeNome', () => {
    it('ignora acento, caixa, pontuação e espaços repetidos', () => {
        assert.equal(chaveDeNome('  Águas,  de   Março! '), 'aguas de marco');
        assert.equal(chaveDeNome(null), '');
        assert.equal(chaveDeNome(42), '');
    });
});

describe('obras', () => {
    it('une grafias da mesma obra e autor, conta cada texto uma vez e junta Poema e Prosa', () => {
        const o = obra('Águas de Março', 'Tom Jobim');
        assert.equal(o.totalTextos, 3);
        assert.deepEqual(
            o.textos.map((t) => `${t.tipo}:${t.id}`),
            ['poema:1', 'poema:2', 'prosa:1'],
        );
        assert.equal(o.usos.length, 4, 'a prosa usa duas vezes e o uso fica registrado');
        assert.deepEqual(o.porRelacao, { Citação: 2, Alusão: 1, Menção: 1 });
        assert.equal(o.tipoObra, 'Música');
    });

    it('a grafia mostrada é a mais usada e todas ficam em grafias', () => {
        const o = obra('Águas de Março', 'Tom Jobim');
        assert.equal(o.obra, 'Águas de Março');
        assert.deepEqual(o.grafias, ['aguas de março', 'Águas de Março']);
    });

    it('obra sem autor é outra entrada; o hipotexto entra pela mesma conta', () => {
        assert.ok(obra('Aguas de Marco', ''));
        const d = obra('Dom Casmurro', 'Machado de Assis');
        assert.equal(d.totalTextos, 2);
        assert.equal(d.comoHipotexto, true);
        assert.equal(obra('Águas de Março', 'Tom Jobim').comoHipotexto, false);
    });

    it('ordena por quantidade de textos e depois pelo nome', () => {
        assert.equal(r.obras[0].obra, 'Águas de Março');
        assert.equal(r.obras[1].obra, 'Dom Casmurro');
    });

    it('entrada sem nome de obra não vira obra e é contada à parte', () => {
        const x = montarForaDoAcervo({
            poemas: [{ id: 1, titulo: 'A', intertextualidade: [inter('', 'Alguém')] }],
        });
        assert.equal(x.obras.length, 0);
        assert.equal(x.totais.entradasSemNome, 1);
    });
});

describe('autores', () => {
    it('agrupa por autor sem diferenciar caixa e lista as obras', () => {
        const jobim = r.autores.find((a) => a.chave === 'tom jobim');
        assert.equal(jobim.autor, 'Tom Jobim');
        assert.equal(jobim.totalTextos, 3);
        assert.deepEqual(
            jobim.obras.map((o) => o.obra),
            ['Águas de Março'],
        );
        assert.equal(r.autores.find((a) => a.chave === 'machado de assis').totalTextos, 2);
    });

    it('autor vazio não vira autor', () => {
        assert.ok(r.autores.every((a) => a.chave));
    });
});

describe('derivações', () => {
    it('lista, por texto, de qual obra ele deriva', () => {
        assert.deepEqual(
            r.derivacoes.map((d) => [d.tipo, d.id, d.hipotextos[0].hipotexto]),
            [
                ['poema', 2, 'Dom Casmurro'],
                ['prosa', 1, 'Dom Casmurro'],
            ],
        );
        assert.equal(r.derivacoes[0].hipotextos[0].relacao, 'Paródia');
    });
});

describe('referências', () => {
    it('a mesma referência com tipo e texto escritos diferente é recorrente', () => {
        const enchente = r.referencias.find((x) => x.chave === 'marco historico|enchente de 2011');
        assert.equal(enchente.totalTextos, 2);
        assert.equal(enchente.recorrente, true);
        assert.equal(r.referencias[0], enchente, 'a recorrente vem primeiro');
    });

    it('referência de um texto só não é recorrente, e o mínimo é ajustável', () => {
        const so = r.referencias.find((x) => x.texto === 'Só uma vez');
        assert.equal(so.recorrente, false);
        const tres = montarForaDoAcervo({ poemas, prosas }, { minimoRecorrente: 3 });
        assert.equal(tres.totais.referenciasRecorrentes, 0);
        assert.equal(r.totais.referenciasRecorrentes, 1);
    });
});

describe('quase-duplicatas', () => {
    it('acusa grafias diferentes da mesma obra', () => {
        const g = r.quaseDuplicatas.find((q) => q.motivo === 'grafias');
        assert.deepEqual(g.itens.map((i) => i.obra).sort(), ['aguas de março', 'Águas de Março']);
    });

    it('acusa o mesmo título com autor diferente ou sem autor', () => {
        const a = r.quaseDuplicatas.find((q) => q.motivo === 'autor');
        assert.deepEqual(a.itens.map((i) => i.autor).sort(), ['', 'Tom Jobim']);
    });

    it('acusa títulos parecidos do mesmo autor, e não os curtos ou de autores diferentes', () => {
        const x = montarForaDoAcervo({
            poemas: [
                {
                    id: 1,
                    titulo: 'A',
                    intertextualidade: [
                        inter('Construção', 'Chico Buarque'),
                        inter('Construcao ', 'Chico Buarque'),
                        inter('Contrução', 'Chico Buarque'),
                        inter('Roda Viva', 'Chico Buarque'),
                        inter('Roda Vida', 'Outro Autor'),
                        inter('Ela', 'X'),
                        inter('Elo', 'X'),
                    ],
                },
            ],
        });
        const parecidos = x.quaseDuplicatas.filter((q) => q.motivo === 'parecido');
        assert.equal(parecidos.length, 1);
        assert.deepEqual(parecidos[0].itens.map((i) => i.obra).sort(), ['Construção', 'Contrução']);
    });

    it('acervo sem repetição não acusa nada', () => {
        const x = montarForaDoAcervo({
            poemas: [{ id: 1, titulo: 'A', intertextualidade: [inter('Obra Um', 'Ana')] }],
            prosas: [{ id: 1, titulo: 'B', intertextualidade: [inter('Outra Coisa', 'Bia')] }],
        });
        assert.deepEqual(x.quaseDuplicatas, []);
    });
});

describe('totais e robustez', () => {
    it('conta textos, obras, autores e referências', () => {
        assert.equal(r.totais.textosComForaDoAcervo, 3);
        assert.equal(r.totais.obras, 3);
        assert.equal(r.totais.autores, 2);
        assert.equal(r.totais.referencias, 2);
    });

    it('aguenta entrada vazia, itens e entradas fora do formato', () => {
        const vazio = montarForaDoAcervo();
        assert.deepEqual(vazio.obras, []);
        assert.equal(vazio.totais.textosComForaDoAcervo, 0);
        const sujo = montarForaDoAcervo({
            poemas: [
                null,
                'x',
                { id: 1, intertextualidade: 'não é lista' },
                { id: 2, hipertextualidade: [null, 3] },
            ],
            prosas: null,
        });
        assert.equal(sujo.obras.length, 0);
    });

    it('não altera os dados recebidos', () => {
        const antes = JSON.stringify({ poemas, prosas });
        montarForaDoAcervo({ poemas, prosas });
        assert.equal(JSON.stringify({ poemas, prosas }), antes);
    });
});

describe('filtrarObras e filtrarAutores', () => {
    const dados = montarForaDoAcervo({ poemas, prosas: [] });

    it('consulta vazia devolve tudo, na mesma ordem', () => {
        assert.deepEqual(filtrarObras(dados.obras, ''), dados.obras);
        assert.deepEqual(filtrarObras(dados.obras, '   '), dados.obras);
        assert.deepEqual(filtrarAutores(dados.autores), dados.autores);
    });

    it('ignora acento, caixa e pontuação', () => {
        const a = filtrarObras(dados.obras, 'AGUAS, de março!');
        assert.ok(a.length >= 1);
        a.forEach((o) => assert.equal(o.chaveObra, 'aguas de marco'));
    });

    it('exige todas as palavras, em qualquer ordem', () => {
        assert.ok(filtrarObras(dados.obras, 'jobim aguas').length >= 1);
        assert.equal(filtrarObras(dados.obras, 'jobim machado').length, 0);
    });

    it('procura no autor, no tipo e no título dos textos', () => {
        assert.ok(filtrarObras(dados.obras, 'tom jobim').length >= 1);
        assert.ok(filtrarObras(dados.obras, 'musica').length >= 1);
        assert.ok(filtrarObras(dados.obras, 'casmurro').length >= 1);
        assert.ok(filtrarAutores(dados.autores, 'casmurro').length >= 1);
    });

    it('não altera a lista recebida', () => {
        const antes = JSON.stringify(dados.obras);
        filtrarObras(dados.obras, 'jobim');
        assert.equal(JSON.stringify(dados.obras), antes);
    });

    it('entrada vazia ou ausente não quebra', () => {
        assert.deepEqual(filtrarObras(undefined, 'x'), []);
        assert.deepEqual(filtrarAutores([], 'x'), []);
    });
});

describe('ordem das listas de Obras e Autores', () => {
    const dados = () =>
        montarForaDoAcervo({
            poemas: [
                { id: 1, titulo: 'A', intertextualidade: [inter('Zebra', 'Zélia')] },
                { id: 2, titulo: 'B', intertextualidade: [inter('Zebra', 'Zélia')] },
                {
                    id: 3,
                    titulo: 'C',
                    intertextualidade: [inter('Zebra', 'Zélia'), inter('Ácaro', 'Beto')],
                },
                { id: 4, titulo: 'D', intertextualidade: [inter('Mapa', 'Ana')] },
                { id: 5, titulo: 'E', intertextualidade: [inter('Mapa', 'Ana')] },
            ],
            prosas: [],
        });
    const nomes = (lista, campo) => lista.map((x) => x[campo]);

    it('"textos" (padrão) põe quem aparece em mais textos primeiro, e no empate o nome', () => {
        const d = dados();
        assert.deepEqual(nomes(ordenarObrasDaLista(d.obras), 'obra'), ['Zebra', 'Mapa', 'Ácaro']);
        assert.deepEqual(nomes(ordenarObrasDaLista(d.obras, 'textos'), 'obra'), [
            'Zebra',
            'Mapa',
            'Ácaro',
        ]);
        assert.deepEqual(nomes(ordenarAutoresDaLista(d.autores), 'autor'), [
            'Zélia',
            'Ana',
            'Beto',
        ]);
    });

    it('"alfabetica" ordena pelo nome, sem acento pesando, ignorando a contagem', () => {
        const d = dados();
        assert.deepEqual(nomes(ordenarObrasDaLista(d.obras, 'alfabetica'), 'obra'), [
            'Ácaro',
            'Mapa',
            'Zebra',
        ]);
        assert.deepEqual(nomes(ordenarAutoresDaLista(d.autores, 'alfabetica'), 'autor'), [
            'Ana',
            'Beto',
            'Zélia',
        ]);
    });

    it('mesma obra com autores diferentes: alfabética desempata pelo autor', () => {
        const d = montarForaDoAcervo({
            poemas: [
                {
                    id: 1,
                    titulo: 'A',
                    intertextualidade: [inter('Sol', 'Bia'), inter('Sol', 'Ana')],
                },
            ],
            prosas: [],
        });
        assert.deepEqual(nomes(ordenarObrasDaLista(d.obras, 'alfabetica'), 'autor'), [
            'Ana',
            'Bia',
        ]);
    });

    it('devolve uma cópia e não mexe na lista original', () => {
        const d = dados();
        const antes = nomes(d.obras, 'obra');
        const out = ordenarObrasDaLista(d.obras, 'alfabetica');
        assert.notEqual(out, d.obras);
        assert.deepEqual(nomes(d.obras, 'obra'), antes);
    });

    it('ordem desconhecida vale "textos"; lista vazia ou ausente não quebra', () => {
        const d = dados();
        assert.deepEqual(
            nomes(ordenarObrasDaLista(d.obras, 'xyz'), 'obra'),
            nomes(ordenarObrasDaLista(d.obras, 'textos'), 'obra'),
        );
        assert.deepEqual(ordenarObrasDaLista(undefined, 'alfabetica'), []);
        assert.deepEqual(ordenarAutoresDaLista([], 'textos'), []);
    });

    it('combina com o filtro: filtra e depois ordena', () => {
        const d = dados();
        const filtradas = filtrarObras(d.obras, 'a');
        assert.deepEqual(nomes(ordenarObrasDaLista(filtradas, 'alfabetica'), 'obra'), [
            'Ácaro',
            'Mapa',
            'Zebra',
        ]);
    });
});
