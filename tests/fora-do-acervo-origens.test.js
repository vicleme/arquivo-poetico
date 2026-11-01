import './helpers/dom-real.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    montarForaDoAcervo,
    filtrarOrigens,
    ordenarOrigensDaLista,
    ROTULO_SEM_ORIGEM,
} from '../js/fora-do-acervo.js';
import {
    gerarMarkdownForaDoAcervo,
    gerarCsvForaDoAcervo,
    origensDoRelatorio,
    ESCOPOS_CSV_FORA_DO_ACERVO,
} from '../js/exportar-fora-do-acervo.js';
import { consultaDaOrigem } from '../js/abrir-lista-origem.js';

// Origens das obras na seção Fora do acervo (T15, entrega 2).

function acervo() {
    return montarForaDoAcervo({
        poemas: [
            {
                id: 1,
                titulo: 'Fogo roubado',
                intertextualidade: [
                    {
                        relacao: 'Alusão',
                        tipoObra: 'Mito',
                        obra: 'Prometeu',
                        origemObra: ['Grécia'],
                    },
                    {
                        relacao: 'Citação',
                        tipoObra: 'Livro',
                        obra: 'Os Lusíadas',
                        autor: 'Camões',
                        origemObra: ['Portugal'],
                    },
                ],
            },
            {
                id: 2,
                titulo: 'Titã',
                intertextualidade: [
                    {
                        relacao: 'Menção',
                        tipoObra: 'Mito',
                        obra: 'Prometeu',
                        origemObra: ['grécia'],
                    },
                    { relacao: 'Citação', tipoObra: 'Livro', obra: 'Sem lugar', autor: 'Fulano' },
                ],
            },
        ],
        prosas: [
            {
                id: 7,
                titulo: 'Conto',
                intertextualidade: [
                    {
                        relacao: 'Menção',
                        tipoObra: 'Mito',
                        obra: 'Zeus e Hera',
                        origemObra: ['Grécia', 'Roma Antiga'],
                    },
                ],
            },
        ],
    });
}

const achar = (dados, rotulo) => dados.origens.find((g) => g.origem === rotulo);

describe('origens: agrupamento', () => {
    it('cada origem traz os textos, as obras e os autores dela', () => {
        const g = achar(acervo(), 'Grécia');
        assert.equal(g.totalTextos, 3);
        assert.deepEqual(g.textos.map((t) => `${t.tipo}:${t.id}`).sort(), [
            'poema:1',
            'poema:2',
            'prosa:7',
        ]);
        assert.deepEqual(
            g.obras.map((o) => o.obra),
            ['Prometeu', 'Zeus e Hera'],
        );
        assert.equal(g.totalObras, 2);
        assert.equal(g.totalAutores, 0);
        assert.equal(g.semOrigem, false);
    });

    it('acento e caixa não separam a origem, e vale a primeira grafia vista', () => {
        const dados = acervo();
        assert.equal(dados.origens.filter((g) => g.origem.toLowerCase() === 'grécia').length, 1);
        assert.ok(achar(dados, 'Grécia'));
        assert.equal(achar(dados, 'grécia'), undefined);
    });

    it('obra com duas origens entra nas duas, e o autor aparece onde a obra aparece', () => {
        const dados = acervo();
        assert.equal(achar(dados, 'Roma Antiga').obras[0].obra, 'Zeus e Hera');
        const portugal = achar(dados, 'Portugal');
        assert.deepEqual(portugal.autores, ['Camões']);
        assert.equal(portugal.totalAutores, 1);
    });

    it('entrada sem origem vai para "Sem origem preenchida", sempre por último', () => {
        const dados = acervo();
        const ultimo = dados.origens[dados.origens.length - 1];
        assert.equal(ultimo.semOrigem, true);
        assert.equal(ultimo.origem, ROTULO_SEM_ORIGEM);
        assert.deepEqual(
            ultimo.obras.map((o) => o.obra),
            ['Sem lugar'],
        );
        assert.equal(dados.origens.filter((g) => g.semOrigem).length, 1);
    });

    it('sem nenhuma entrada sem origem, o item "sem origem" não existe', () => {
        const dados = montarForaDoAcervo({
            poemas: [
                {
                    id: 1,
                    titulo: 'A',
                    intertextualidade: [{ obra: 'X', origemObra: ['Brasil'] }],
                },
            ],
            prosas: [],
        });
        assert.equal(dados.origens.length, 1);
        assert.equal(dados.origens[0].semOrigem, false);
    });

    it('o total de origens não conta o item "sem origem"', () => {
        const dados = acervo();
        assert.equal(dados.totais.origens, 3);
        assert.equal(dados.origens.length, 4);
    });

    it('obra sem nome não entra em nenhuma origem', () => {
        const dados = montarForaDoAcervo({
            poemas: [
                { id: 1, titulo: 'A', intertextualidade: [{ obra: '', origemObra: ['Grécia'] }] },
            ],
            prosas: [],
        });
        assert.deepEqual(dados.origens, []);
    });

    it('a origem nunca é confundida com um texto digitado igual ao marcador interno', () => {
        const dados = montarForaDoAcervo({
            poemas: [
                {
                    id: 1,
                    titulo: 'A',
                    intertextualidade: [
                        { obra: 'X', origemObra: [ROTULO_SEM_ORIGEM] },
                        { obra: 'Y' },
                    ],
                },
            ],
            prosas: [],
        });
        assert.equal(dados.origens.length, 2);
        assert.equal(dados.origens.filter((g) => g.semOrigem).length, 1);
    });
});

describe('origens: filtro e ordem', () => {
    it('o filtro acha pela origem, pela obra, pelo autor e pelo título do texto', () => {
        const { origens } = acervo();
        assert.deepEqual(
            filtrarOrigens(origens, 'greci').map((g) => g.origem),
            ['Grécia'],
        );
        assert.deepEqual(
            filtrarOrigens(origens, 'lusiadas').map((g) => g.origem),
            ['Portugal'],
        );
        assert.deepEqual(
            filtrarOrigens(origens, 'camoes').map((g) => g.origem),
            ['Portugal'],
        );
        assert.ok(filtrarOrigens(origens, 'conto').some((g) => g.origem === 'Roma Antiga'));
        assert.equal(filtrarOrigens(origens, '').length, origens.length);
        assert.equal(filtrarOrigens(origens, 'nada disso').length, 0);
    });

    it('padrão: mais textos primeiro; A → Z na alfabética; "sem origem" sempre no fim', () => {
        const { origens } = acervo();
        const porTextos = ordenarOrigensDaLista(origens, 'textos');
        assert.equal(porTextos[0].origem, 'Grécia');
        assert.equal(porTextos[porTextos.length - 1].semOrigem, true);
        const az = ordenarOrigensDaLista(origens, 'alfabetica');
        assert.deepEqual(
            az.slice(0, 3).map((g) => g.origem),
            ['Grécia', 'Portugal', 'Roma Antiga'],
        );
        assert.equal(az[az.length - 1].semOrigem, true);
    });

    it('as ordens por data valem como "mais textos"', () => {
        const { origens } = acervo();
        assert.deepEqual(
            ordenarOrigensDaLista(origens, 'data-antiga').map((g) => g.chave),
            ordenarOrigensDaLista(origens, 'textos').map((g) => g.chave),
        );
    });
});

describe('origens: relatório baixado', () => {
    it('o .md tem a seção Origens, com contagens, obras, autores e textos', () => {
        const md = gerarMarkdownForaDoAcervo(acervo(), 'origens');
        assert.match(md, /^# Fora do acervo: origens/);
        assert.match(md, /## Origens/);
        assert.match(md, /- \*\*Grécia\*\* · 3 textos · 2 obras · 0 autores/);
        assert.match(md, /Obras: Prometeu, Zeus e Hera/);
        assert.match(md, /Autores: Camões/);
        assert.match(md, new RegExp(`\\*\\*${ROTULO_SEM_ORIGEM}\\*\\*`));
    });

    it('"tudo" inclui a seção entre Autores e Hipertextualidade', () => {
        const md = gerarMarkdownForaDoAcervo(acervo(), 'tudo');
        assert.ok(md.indexOf('## Autores') < md.indexOf('## Origens'));
        assert.ok(md.indexOf('## Origens') < md.indexOf('## Hipertextualidade'));
    });

    it('filtro e ordem valem para as origens, como na tela', () => {
        const dados = acervo();
        assert.deepEqual(
            origensDoRelatorio(dados, { consulta: 'portugal' }).map((g) => g.origem),
            ['Portugal'],
        );
        const md = gerarMarkdownForaDoAcervo(dados, 'tudo', { consulta: 'portugal' });
        assert.match(md, /1 origem de 4/);
    });

    it('o .csv de origens tem uma linha por origem e marca a "sem origem"', () => {
        assert.ok(ESCOPOS_CSV_FORA_DO_ACERVO.includes('origens'));
        const linhas = gerarCsvForaDoAcervo(acervo(), 'origens').trim().split(/\r?\n/);
        assert.match(linhas[0], /origem.*sem_origem.*n_textos.*n_obras.*n_autores/);
        assert.equal(linhas.length, 1 + 4);
        assert.ok(linhas.some((l) => l.includes(',sim,') && l.includes(ROTULO_SEM_ORIGEM)));
    });

    it('acervo vazio: a seção diz que não há nada para listar', () => {
        const md = gerarMarkdownForaDoAcervo(
            montarForaDoAcervo({
                poemas: [
                    { id: 1, titulo: 'A', referenciasExternas: [{ tipo: 'Notícia', texto: 'X' }] },
                ],
                prosas: [],
            }),
            'origens',
        );
        assert.match(md, /Nenhuma obra cadastrada para listar por origem/);
    });
});

describe('origens: consulta do clique', () => {
    it('monta origem:"Nome" e escapa as aspas', () => {
        assert.equal(consultaDaOrigem('Grécia'), 'origem:"Grécia"');
        assert.equal(consultaDaOrigem('  Roma Antiga '), 'origem:"Roma Antiga"');
        assert.equal(consultaDaOrigem('A "B"'), 'origem:"A \\"B\\""');
    });

    it('sem nome, não há consulta', () => {
        assert.equal(consultaDaOrigem(''), '');
        assert.equal(consultaDaOrigem(undefined), '');
    });
});
