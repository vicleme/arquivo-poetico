import './helpers/dom-real.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    montarForaDoAcervo,
    filtrarObras,
    filtrarAutores,
    filtrarOrigens,
} from '../js/fora-do-acervo.js';
import {
    CAMPOS_BUSCA_CONEXOES,
    PREFIXOS_BUSCA_CONEXOES,
    interpretarBuscaConexoes,
    valoresDeBuscaConexoes,
} from '../js/busca-campos-conexoes.js';
import {
    gerarMarkdownForaDoAcervo,
    gerarCsvForaDoAcervo,
    obrasDoRelatorio,
    autoresDoRelatorio,
    origensDoRelatorio,
} from '../js/exportar-fora-do-acervo.js';
import { sugerirBuscaConexoes } from '../js/sugestoes-busca-conexoes.js';

// T15, entrega 3: a busca por campo (`campo:valor`) das listas de Obras,
// Autores e Origens da seção Fora do acervo.

const ano = (n) => ({ nivel: 'ano', ano: n });

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
                        dataObra: ano(1572),
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
                    {
                        relacao: 'Citação',
                        tipoObra: 'Livro',
                        obra: 'Sem lugar',
                        autor: 'Fulano',
                        obraPessoal: true,
                    },
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
                hipertextualidade: [
                    {
                        relacao: 'Paródia',
                        tipoObra: 'Livro',
                        hipotexto: 'Dom Casmurro',
                        autor: 'Machado de Assis',
                        origemObra: ['Brasil'],
                        dataObra: ano(1899),
                    },
                ],
            },
        ],
    });
}

const nomesDeObras = (lista) => lista.map((o) => o.obra).sort();
const nomesDeAutores = (lista) => lista.map((a) => a.autor).sort();
const nomesDeOrigens = (lista) => lista.map((g) => g.origem).sort();

describe('interpretarBuscaConexoes', () => {
    it('consulta simples não é avançada (a busca de sempre)', () => {
        assert.equal(interpretarBuscaConexoes(''), null);
        assert.equal(interpretarBuscaConexoes('   '), null);
        assert.equal(interpretarBuscaConexoes('os lusíadas camões'), null);
    });

    it('campo, exclusão, ou e aspas viram avançada', () => {
        assert.ok(interpretarBuscaConexoes('origem:Grécia'));
        assert.ok(interpretarBuscaConexoes('-mito'));
        assert.ok(interpretarBuscaConexoes('a ou b'));
        assert.ok(interpretarBuscaConexoes('"os lusíadas"'));
    });

    it('prefixo sem valor é avançado, mas sem termos (não filtra)', () => {
        const q = interpretarBuscaConexoes('origem:');
        assert.ok(q);
        assert.deepEqual(q.gruposIncluir, []);
        assert.equal(filtrarObras(acervo().obras, 'origem:').length, acervo().obras.length);
    });

    it('prefixo desconhecido continua sendo palavra solta', () => {
        assert.equal(interpretarBuscaConexoes('foo:bar'), null);
    });

    it('cada prefixo canônico existe no mapa de campos', () => {
        PREFIXOS_BUSCA_CONEXOES.forEach((p) => assert.ok(CAMPOS_BUSCA_CONEXOES[p], p));
        assert.equal(CAMPOS_BUSCA_CONEXOES.nome, 'obra');
        assert.equal(CAMPOS_BUSCA_CONEXOES.titulo, 'texto');
    });
});

describe('busca por campo nas Obras', () => {
    const { obras } = acervo();

    it('origem: casa a obra com qualquer uma das origens (sem acento nem caixa)', () => {
        assert.deepEqual(nomesDeObras(filtrarObras(obras, 'origem:grecia')), [
            'Prometeu',
            'Zeus e Hera',
        ]);
        assert.deepEqual(nomesDeObras(filtrarObras(obras, 'origem:"Roma Antiga"')), [
            'Zeus e Hera',
        ]);
    });

    it('autor:, tipo:, relacao: e obra: olham só o campo', () => {
        assert.deepEqual(nomesDeObras(filtrarObras(obras, 'autor:camoes')), ['Os Lusíadas']);
        assert.deepEqual(nomesDeObras(filtrarObras(obras, 'tipo:livro')), [
            'Dom Casmurro',
            'Os Lusíadas',
            'Sem lugar',
        ]);
        assert.deepEqual(nomesDeObras(filtrarObras(obras, 'relacao:paródia')), ['Dom Casmurro']);
        assert.deepEqual(nomesDeObras(filtrarObras(obras, 'nome:zeus')), ['Zeus e Hera']);
        // "Camões" é autor, não nome de obra.
        assert.deepEqual(filtrarObras(obras, 'obra:camoes'), []);
    });

    it('texto: casa o título de algum texto da obra', () => {
        assert.deepEqual(nomesDeObras(filtrarObras(obras, 'texto:fogo')), [
            'Os Lusíadas',
            'Prometeu',
        ]);
    });

    it('data: casa a data da obra como aparece na tela', () => {
        assert.deepEqual(nomesDeObras(filtrarObras(obras, 'data:1572')), ['Os Lusíadas']);
        assert.deepEqual(nomesDeObras(filtrarObras(obras, 'data:1899')), ['Dom Casmurro']);
    });

    it('pessoal: acha a obra marcada; -pessoal:* deixa as outras', () => {
        assert.deepEqual(nomesDeObras(filtrarObras(obras, 'pessoal:*')), ['Sem lugar']);
        assert.deepEqual(nomesDeObras(filtrarObras(obras, 'pessoal:sim')), ['Sem lugar']);
        assert.equal(filtrarObras(obras, '-pessoal:*').length, obras.length - 1);
    });

    it('campo:* exige o campo preenchido; -origem:* deixa as obras sem origem', () => {
        assert.deepEqual(nomesDeObras(filtrarObras(obras, '-origem:*')), ['Sem lugar']);
        assert.equal(filtrarObras(obras, 'origem:*').length, obras.length - 1);
        assert.deepEqual(nomesDeObras(filtrarObras(obras, 'autor:*')), [
            'Dom Casmurro',
            'Os Lusíadas',
            'Sem lugar',
        ]);
    });

    it('termos se somam (E); ou junta alternativas; -termo exclui', () => {
        assert.deepEqual(nomesDeObras(filtrarObras(obras, 'origem:grecia tipo:mito')), [
            'Prometeu',
            'Zeus e Hera',
        ]);
        assert.deepEqual(nomesDeObras(filtrarObras(obras, 'origem:grecia -origem:roma')), [
            'Prometeu',
        ]);
        assert.deepEqual(nomesDeObras(filtrarObras(obras, 'autor:camoes ou autor:machado')), [
            'Dom Casmurro',
            'Os Lusíadas',
        ]);
    });

    it('termo solto numa consulta avançada é procurado em nome, autor, tipo, relação e títulos', () => {
        assert.deepEqual(nomesDeObras(filtrarObras(obras, 'casmurro origem:brasil')), [
            'Dom Casmurro',
        ]);
        assert.deepEqual(nomesDeObras(filtrarObras(obras, 'paródia -origem:grecia')), [
            'Dom Casmurro',
        ]);
    });

    it('a busca simples continua a de sempre', () => {
        assert.deepEqual(nomesDeObras(filtrarObras(obras, 'lusiadas camoes')), ['Os Lusíadas']);
        assert.equal(filtrarObras(obras, '').length, obras.length);
    });
});

describe('busca por campo nos Autores e nas Origens', () => {
    const dados = acervo();

    it('o autor casa pelo que as obras dele têm', () => {
        assert.deepEqual(nomesDeAutores(filtrarAutores(dados.autores, 'relacao:paródia')), [
            'Machado de Assis',
        ]);
        assert.deepEqual(nomesDeAutores(filtrarAutores(dados.autores, 'origem:portugal')), [
            'Camões',
        ]);
        assert.deepEqual(nomesDeAutores(filtrarAutores(dados.autores, 'tipo:livro')), [
            'Camões',
            'Fulano',
            'Machado de Assis',
        ]);
        assert.deepEqual(nomesDeAutores(filtrarAutores(dados.autores, 'data:1572')), ['Camões']);
        assert.deepEqual(nomesDeAutores(filtrarAutores(dados.autores, 'pessoal:*')), ['Fulano']);
        assert.deepEqual(nomesDeAutores(filtrarAutores(dados.autores, 'obra:lusiadas')), [
            'Camões',
        ]);
        assert.deepEqual(nomesDeAutores(filtrarAutores(dados.autores, 'autor:fulano')), ['Fulano']);
    });

    it('a origem casa pelo que as obras dela têm', () => {
        assert.deepEqual(nomesDeOrigens(filtrarOrigens(dados.origens, 'autor:camoes')), [
            'Portugal',
        ]);
        assert.deepEqual(nomesDeOrigens(filtrarOrigens(dados.origens, 'relacao:paródia')), [
            'Brasil',
        ]);
        assert.deepEqual(nomesDeOrigens(filtrarOrigens(dados.origens, 'data:1899')), ['Brasil']);
        assert.deepEqual(nomesDeOrigens(filtrarOrigens(dados.origens, 'origem:roma')), [
            'Roma Antiga',
        ]);
        assert.deepEqual(nomesDeOrigens(filtrarOrigens(dados.origens, 'pessoal:*')), [
            'Sem origem preenchida',
        ]);
    });

    it('-origem:* deixa o item "Sem origem preenchida"', () => {
        assert.deepEqual(nomesDeOrigens(filtrarOrigens(dados.origens, '-origem:*')), [
            'Sem origem preenchida',
        ]);
        assert.equal(filtrarOrigens(dados.origens, 'origem:*').length, dados.origens.length - 1);
    });

    it('os valores de busca de um item vêm em listas de texto sem vazios', () => {
        const prometeu = dados.obras.find((o) => o.obra === 'Prometeu');
        const v = valoresDeBuscaConexoes('obras', prometeu);
        assert.deepEqual(v.origem, ['Grécia']);
        assert.deepEqual(v.pessoal, []);
        assert.deepEqual(v.autor, []);
        assert.deepEqual(valoresDeBuscaConexoes('xyz', prometeu), {});
    });
});

describe('o relatório baixado usa a mesma busca por campo', () => {
    const dados = acervo();
    const opcoes = { consulta: 'origem:grecia tipo:mito', ordem: 'textos' };

    it('as listas do relatório saem filtradas', () => {
        assert.deepEqual(nomesDeObras(obrasDoRelatorio(dados, opcoes)), [
            'Prometeu',
            'Zeus e Hera',
        ]);
        // A origem casa pelo próprio nome: "Roma Antiga" não vira "Grécia" só
        // porque uma obra traz as duas.
        assert.deepEqual(nomesDeOrigens(origensDoRelatorio(dados, opcoes)), ['Grécia']);
        assert.deepEqual(autoresDoRelatorio(dados, opcoes), []);
    });

    it('o .md traz a consulta na linha "Filtro" e só as obras filtradas', () => {
        const md = gerarMarkdownForaDoAcervo(dados, 'obras', opcoes);
        assert.match(md, /Filtro: “origem:grecia tipo:mito”/);
        assert.match(md, /Prometeu/);
        assert.doesNotMatch(md, /Os Lusíadas/);
    });

    it('o .csv das Obras sai filtrado', () => {
        const csv = gerarCsvForaDoAcervo(dados, 'obras', opcoes);
        assert.match(csv, /Prometeu/);
        assert.doesNotMatch(csv, /Os Lusíadas/);
    });
});

describe('sugestões da busca de Obras, Autores e Origens', () => {
    const { obras } = acervo();

    it('oferece os prefixos que começam como o digitado', () => {
        const s = sugerirBuscaConexoes('or', obras);
        assert.deepEqual(
            s.itens.map((i) => i.rotulo),
            ['origem:'],
        );
        assert.equal(s.itens[0].completo, false);
        const todos = sugerirBuscaConexoes('-', obras);
        assert.equal(todos, null);
        const t = sugerirBuscaConexoes('t', obras);
        assert.deepEqual(
            t.itens.map((i) => i.rotulo),
            ['texto:', 'tipo:'],
        );
    });

    it('origem: oferece * e as origens em uso, da mais comum à menos comum', () => {
        const s = sugerirBuscaConexoes('origem:', obras);
        assert.equal(s.itens[0].rotulo, '*');
        const rotulos = s.itens.map((i) => i.rotulo);
        assert.equal(rotulos[1], 'Grécia');
        assert.deepEqual(rotulos.slice(2).sort(), ['Brasil', 'Portugal', 'Roma Antiga']);
        assert.equal(s.itens[1].detalhe, '2 obras');
        assert.equal(s.itens[1].texto, 'origem:Grécia');
    });

    it('filtra pelo que foi digitado e mantém o sinal de menos', () => {
        const s = sugerirBuscaConexoes('tipo:Livro -origem:ro', obras);
        assert.equal(s.inicio, 'tipo:Livro '.length);
        assert.deepEqual(
            s.itens.map((i) => i.texto),
            ['-origem:"Roma Antiga"'],
        );
    });

    it('autor, relação e título também oferecem valores; pessoal só o *', () => {
        assert.deepEqual(
            sugerirBuscaConexoes('autor:ma', obras).itens.map((i) => i.rotulo),
            ['Machado de Assis'],
        );
        assert.ok(
            sugerirBuscaConexoes('relacao:', obras).itens.some((i) => i.rotulo === 'Paródia'),
        );
        assert.ok(sugerirBuscaConexoes('texto:ti', obras).itens.some((i) => i.rotulo === 'Titã'));
        assert.deepEqual(
            sugerirBuscaConexoes('pessoal:', obras).itens.map((i) => i.rotulo),
            ['*'],
        );
    });

    it('não repete o termo já completo nem oferece nada sem prefixo', () => {
        assert.equal(sugerirBuscaConexoes('origem:*', obras), null);
        assert.equal(sugerirBuscaConexoes('prometeu', obras), null);
        assert.equal(sugerirBuscaConexoes('', obras), null);
        assert.equal(sugerirBuscaConexoes('origem:Grécia', obras), null);
    });

    it('respeita o limite', () => {
        const s = sugerirBuscaConexoes('texto:', obras, 2);
        assert.equal(s.itens.length, 2);
    });
});
