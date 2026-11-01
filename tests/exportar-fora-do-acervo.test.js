import './helpers/localstorage-shim.js';
import './helpers/dom-shim.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Relatório do Fora do acervo em .md e .csv (T9, entrega 10 de 13): escopos,
// filtro e ordem, autores em lista e datas. Lógica pura sobre
// `montarForaDoAcervo`.

const { montarForaDoAcervo } = await import('../js/fora-do-acervo.js');
const { criarDataObra } = await import('../js/data-da-obra.js');
const {
    ESCOPOS_FORA_DO_ACERVO,
    ESCOPOS_CSV_FORA_DO_ACERVO,
    NOME_ARQUIVO_FORA_DO_ACERVO,
    gerarMarkdownForaDoAcervo,
    gerarCsvForaDoAcervo,
    escopoDoCsvForaDoAcervo,
    obrasDoRelatorio,
    autoresDoRelatorio,
    resumoForaDoAcervo,
} = await import('../js/exportar-fora-do-acervo.js');

const ano = (n) => criarDataObra({ nivel: 'ano', ano: String(n) }).data;

function acervo() {
    return montarForaDoAcervo({
        poemas: [
            {
                id: 1,
                titulo: 'Águas',
                intertextualidade: [
                    {
                        relacao: 'Citação',
                        tipoObra: 'Música',
                        obra: 'Águas de Março',
                        autores: ['Tom Jobim', 'Elis Regina'],
                        descricao: 'Canção de 1972',
                        dataObra: ano(1972),
                    },
                ],
                referenciasExternas: [
                    {
                        tipo: 'Pessoa pública',
                        texto: 'Clarice',
                        dataObra: ano(1920),
                        dataObraAte: ano(1977),
                    },
                    { tipo: 'Notícia', texto: 'Enchente' },
                ],
            },
            {
                id: 2,
                titulo: 'Rio',
                intertextualidade: [
                    {
                        relacao: 'Alusão',
                        tipoObra: 'Música',
                        obra: 'Águas de Março',
                        autores: ['Elis Regina', 'Tom Jobim'],
                    },
                    {
                        relacao: 'Citação',
                        tipoObra: 'Livro',
                        obra: 'Sagarana',
                        autor: 'Guimarães Rosa',
                    },
                ],
                hipertextualidade: [
                    {
                        relacao: 'Paródia',
                        tipoObra: 'Livro',
                        hipotexto: 'Dom Casmurro',
                        autor: 'Machado de Assis',
                    },
                ],
                referenciasExternas: [{ tipo: 'Pessoa pública', texto: 'Clarice' }],
            },
        ],
        prosas: [
            {
                id: 1,
                titulo: 'Conto',
                intertextualidade: [
                    {
                        relacao: 'Citação',
                        tipoObra: 'Livro',
                        obra: 'Sagarana',
                        autor: 'Guimarães Rosa',
                    },
                ],
            },
        ],
    });
}

const vazio = () => montarForaDoAcervo({ poemas: [], prosas: [] });

describe('escopos e nomes', () => {
    it('tudo e um por bloco, cada um com nome de arquivo', () => {
        assert.deepEqual(ESCOPOS_FORA_DO_ACERVO, [
            'tudo',
            'obras',
            'autores',
            'origens',
            'derivacoes',
            'referencias',
            'avisos',
        ]);
        ESCOPOS_FORA_DO_ACERVO.forEach((e) => assert.ok(NOME_ARQUIVO_FORA_DO_ACERVO[e], e));
    });

    it('no .csv "tudo" e o desconhecido viram a tabela de obras', () => {
        assert.equal(escopoDoCsvForaDoAcervo('tudo'), 'obras');
        assert.equal(escopoDoCsvForaDoAcervo('???'), 'obras');
        assert.equal(escopoDoCsvForaDoAcervo('avisos'), 'avisos');
        assert.equal(ESCOPOS_CSV_FORA_DO_ACERVO.includes('tudo'), false);
    });
});

describe('.md', () => {
    it('acervo vazio: título e a frase de nada cadastrado, sem seções', () => {
        const md = gerarMarkdownForaDoAcervo(vazio());
        assert.match(md, /^# Fora do acervo\n/);
        assert.match(md, /Nenhuma Intertextualidade, Hipertextualidade ou Referência/);
        assert.doesNotMatch(md, /## Obras/);
    });

    it('"tudo" traz resumo e as seis seções, separadas por linha', () => {
        const md = gerarMarkdownForaDoAcervo(acervo());
        assert.match(md, /3 textos · 3 obras · 4 autores · 2 referências/);
        [
            '## Obras',
            '## Autores',
            '## Origens',
            '## Hipertextualidade',
            '## Referências',
            '## Avisos',
        ].forEach((h) => assert.ok(md.includes(h), h));
        assert.equal(md.split('\n---\n').length, 7);
    });

    it('a obra leva autores em lista, tipo, data, relações, descrição e textos', () => {
        const md = gerarMarkdownForaDoAcervo(acervo(), 'obras');
        assert.match(
            md,
            /- \*\*Águas de Março\*\* \(Tom Jobim e Elis Regina\) · Música · 2 textos/,
        );
        assert.match(md, / {2}- Data: 1972/);
        assert.match(md, / {2}- Relações: Citação, Alusão/);
        assert.match(md, / {2}- Descrição: Canção de 1972/);
        assert.match(md, / {2}- Textos: Águas \(poema\), Rio \(poema\)/);
        // O mesmo par de autores em ordem diferente é a mesma obra.
        assert.equal((md.match(/\*\*Águas de Março\*\*/g) || []).length, 1);
    });

    it('a data de Pessoa pública sai como nascimento e óbito', () => {
        const md = gerarMarkdownForaDoAcervo(acervo(), 'referencias');
        assert.match(md, /\*\*Clarice\*\* · Pessoa pública · nasc\. 1920, óbito 1977 · 2 textos/);
        assert.match(md, /### Em um texto só \(1\)/);
        assert.match(md, /\*\*Enchente\*\* · Notícia · 1 texto/);
    });

    it('as derivações mostram o texto, a relação, o hipotexto e o autor', () => {
        const md = gerarMarkdownForaDoAcervo(acervo(), 'derivacoes');
        assert.match(md, /- Rio \(poema\) ← Paródia: \*\*Dom Casmurro\*\* \(Machado de Assis\)/);
    });

    it('um escopo só traz o título dele e só aquela seção', () => {
        const md = gerarMarkdownForaDoAcervo(acervo(), 'autores');
        assert.match(md, /^# Fora do acervo: autores\n/);
        assert.match(md, /## Autores/);
        assert.doesNotMatch(md, /## Obras/);
        assert.equal(md.split('\n---\n').length, 2);
    });

    it('escopo desconhecido vale "tudo"', () => {
        assert.match(gerarMarkdownForaDoAcervo(acervo(), '???'), /^# Fora do acervo\n/);
    });

    it('filtro e ordem valem para Obras, Autores e Origens e aparecem no cabeçalho', () => {
        const md = gerarMarkdownForaDoAcervo(acervo(), 'tudo', {
            consulta: 'rosa',
            ordem: 'alfabetica',
        });
        assert.match(
            md,
            /Filtro: “rosa” \(1 obra de 3; 1 autor de 4; 1 origem de 1\)\. Ordem: A → Z\./,
        );
        assert.match(md, /\*\*Sagarana\*\*/);
        assert.doesNotMatch(md, /\*\*Águas de Março\*\*/);
        // Derivações e referências saem inteiras, como na tela.
        assert.match(md, /Dom Casmurro/);
        assert.match(md, /Clarice/);
    });

    it('filtro sem resultado avisa', () => {
        const md = gerarMarkdownForaDoAcervo(acervo(), 'obras', { consulta: 'zzzz' });
        assert.match(md, /Nenhuma obra combina com o filtro\./);
    });
});

describe('obrasDoRelatorio e autoresDoRelatorio', () => {
    it('respeitam o filtro e a ordem; ordem desconhecida vale "mais textos"', () => {
        const dados = acervo();
        assert.deepEqual(
            obrasDoRelatorio(dados, { ordem: 'alfabetica' }).map((o) => o.obra),
            ['Águas de Março', 'Dom Casmurro', 'Sagarana'],
        );
        assert.equal(obrasDoRelatorio(dados, { ordem: '???' })[0].totalTextos, 2);
        assert.deepEqual(
            autoresDoRelatorio(dados, { consulta: 'machado' }).map((a) => a.autor),
            ['Machado de Assis'],
        );
    });
});

describe('.csv', () => {
    const linhas = (csv) =>
        csv
            .replace(/^\uFEFF/, '')
            .split('\r\n')
            .filter(Boolean);

    it('obras: uma linha por obra, autores em lista e datas em colunas', () => {
        const csv = gerarCsvForaDoAcervo(acervo(), 'obras');
        assert.ok(csv.startsWith('\uFEFF'));
        const [cab, ...resto] = linhas(csv);
        assert.equal(
            cab,
            'obra,autor,tipo_obra,hipotexto,obra_pessoal,data_obra,data_obra_ate,outras_datas,relacoes,n_textos,textos,descricao,grafias',
        );
        assert.equal(resto.length, 3);
        const aguas = resto.find((l) => l.startsWith('Águas de Março'));
        assert.match(aguas, /Música,,,1972,,,Citação \| Alusão,2,/);
        assert.match(aguas, /Águas \(poema\) \| Rio \(poema\)/);
        assert.match(aguas, /Canção de 1972/);
        assert.match(
            resto.find((l) => l.startsWith('Dom Casmurro')),
            /,sim,/,
        );
    });

    it('autores: com as obras e os textos', () => {
        const [cab, ...resto] = linhas(gerarCsvForaDoAcervo(acervo(), 'autores'));
        assert.equal(cab, 'autor,n_textos,obras,textos');
        assert.equal(resto.length, 4);
    });

    it('derivações: uma linha por hipotexto', () => {
        const [cab, ...resto] = linhas(gerarCsvForaDoAcervo(acervo(), 'derivacoes'));
        assert.equal(cab, 'texto,tipo_texto,relacao,hipotexto,autor,tipo_obra');
        assert.deepEqual(resto, ['Rio,poema,Paródia,Dom Casmurro,Machado de Assis,Livro']);
    });

    it('referências: começo e fim da data e se é recorrente', () => {
        const [cab, ...resto] = linhas(gerarCsvForaDoAcervo(acervo(), 'referencias'));
        assert.equal(cab, 'referencia,tipo,data,data_ate,n_textos,recorrente,textos');
        const clarice = resto.find((l) => l.startsWith('Clarice'));
        assert.match(clarice, /^Clarice,Pessoa pública,1920,1977,2,sim,/);
    });

    it('avisos: acervo sem quase-duplicata dá só o cabeçalho', () => {
        const [cab, ...resto] = linhas(gerarCsvForaDoAcervo(acervo(), 'avisos'));
        assert.equal(cab, 'motivo,obras');
        assert.equal(resto.length, 0);
    });

    it('filtro e ordem valem na tabela de obras', () => {
        const [, ...resto] = linhas(gerarCsvForaDoAcervo(acervo(), 'obras', { consulta: 'rosa' }));
        assert.equal(resto.length, 1);
        assert.match(resto[0], /^Sagarana,Guimarães Rosa,/);
    });

    it('acervo vazio: só o cabeçalho', () => {
        assert.equal(linhas(gerarCsvForaDoAcervo(vazio(), 'obras')).length, 1);
    });
});

describe('resumoForaDoAcervo', () => {
    it('conta textos, obras, autores e referências', () => {
        assert.equal(
            resumoForaDoAcervo(acervo()),
            '3 textos · 3 obras · 4 autores · 2 referências',
        );
    });
});
