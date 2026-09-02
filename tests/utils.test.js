import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    gerarId,
    escapeHtml,
    sortBySeq,
    seqOuNull,
    reordenarPosicao,
    fecharEspaco,
    getIrmaosTopoLivro,
    getIrmaosDentroParte,
    getIrmaosDentroSecao,
    getIrmaosPorEscopo,
    getPosicaoElemento,
    getElementHierarchy,
    formatarDataParcial,
    anoDeDataParcial,
    itemBateFiltroData,
    itemFaltaDataParaFiltro,
    filtroDataVazio,
    parseFiltroDataRapido,
    nomesPessoas,
    nomesGrupos,
    paresGrupoPessoa,
    paresAutoria,
    AUTORIA_PAPEIS,
    CORES_GRUPO,
    CORES_GRUPO_PADRAO,
    classesCorGrupo,
    extrairSinalizacoesUnicas,
    extrairFasesUnicas,
    IDIOMAS_SUGERIDOS,
    extrairIdiomasUnicos,
    extrairMeiosEnviosUnicos,
    extrairPremiosUnicos,
    filtrarTextos,
    debounce,
    criarRastreadorDeAlteracoes,
    RELACOES_ELO,
    TIPOS_REFERENCIA,
    ROTULOS_RELACAO_ELO,
    rotuloElo,
    direcaoInversa,
    RECORTES_EPOCA,
    ROTULOS_RECORTE_EPOCA,
    nomeEpoca,
    contextoRelacaoEpoca,
    formatarEpocaRetratada,
    obterSugestaoEpocaPorId,
} from '../js/utils.js';

describe('gerarId', () => {
    it('nunca repete um id, mesmo em chamadas em rajada no mesmo milissegundo', () => {
        const ids = new Set();
        for (let i = 0; i < 5000; i++) ids.add(gerarId());
        assert.equal(ids.size, 5000, 'todos os ids gerados devem ser únicos');
    });

    it('é estritamente crescente', () => {
        let anterior = gerarId();
        for (let i = 0; i < 100; i++) {
            const atual = gerarId();
            assert.ok(atual > anterior, `${atual} deveria ser maior que ${anterior}`);
            anterior = atual;
        }
    });
});

describe('escapeHtml', () => {
    it('escapa os 5 caracteres perigosos', () => {
        assert.equal(
            escapeHtml(`<script>alert("x")&'y'</script>`),
            '&lt;script&gt;alert(&quot;x&quot;)&amp;&#39;y&#39;&lt;/script&gt;',
        );
    });

    it('trata null/undefined como string vazia (não "null"/"undefined" literal)', () => {
        assert.equal(escapeHtml(null), '');
        assert.equal(escapeHtml(undefined), '');
    });

    it('converte números e outros tipos pra string antes de escapar', () => {
        assert.equal(escapeHtml(2024), '2024');
        assert.equal(escapeHtml(0), '0');
    });

    it('texto sem caracteres especiais passa direto', () => {
        assert.equal(escapeHtml('Fragmentos do Infinito'), 'Fragmentos do Infinito');
    });
});

describe('sortBySeq', () => {
    it('ordena por sequencia crescente', () => {
        const lista = [
            { id: 1, sequencia: 3 },
            { id: 2, sequencia: 1 },
            { id: 3, sequencia: 2 },
        ];
        assert.deepEqual(
            sortBySeq(lista).map((i) => i.id),
            [2, 3, 1],
        );
    });

    it('itens sem sequencia (null/undefined/inválida) vão pro fim, desempatando por id', () => {
        const lista = [
            { id: 5, sequencia: null },
            { id: 1, sequencia: 1 },
            { id: 3, sequencia: undefined },
        ];
        assert.deepEqual(
            sortBySeq(lista).map((i) => i.id),
            [1, 3, 5],
        );
    });

    it('não modifica o array original (retorna cópia)', () => {
        const lista = [
            { id: 2, sequencia: 2 },
            { id: 1, sequencia: 1 },
        ];
        const original = [...lista];
        sortBySeq(lista);
        assert.deepEqual(lista, original);
    });
});

describe('seqOuNull', () => {
    it('string vazia, null e undefined viram null', () => {
        assert.equal(seqOuNull(''), null);
        assert.equal(seqOuNull(null), null);
        assert.equal(seqOuNull(undefined), null);
    });

    it('string numérica válida vira inteiro', () => {
        assert.equal(seqOuNull('7'), 7);
        assert.equal(seqOuNull('07'), 7);
    });

    it('texto não numérico vira null', () => {
        assert.equal(seqOuNull('abc'), null);
    });

    it('zero é um valor de posição válido (não deve virar null)', () => {
        assert.equal(seqOuNull('0'), 0);
        assert.equal(seqOuNull(0), 0);
    });
});

describe('reordenarPosicao', () => {
    it('posicaoDesejada null limpa a sequência do item (não disputa posição)', () => {
        const item = { id: 1, sequencia: 3 };
        reordenarPosicao([item], item, null);
        assert.equal(item.sequencia, null);
    });

    it('inserção nova empurra pra frente quem já ocupava aquela posição em diante', () => {
        const a = { id: 1, sequencia: 1 };
        const b = { id: 2, sequencia: 2 };
        const c = { id: 3, sequencia: 3 };
        const novo = { id: 4, sequencia: null };
        const irmaos = [a, b, c, novo];

        reordenarPosicao(irmaos, novo, 2); // insere o novo na posição 2

        assert.equal(a.sequencia, 1, 'quem estava antes da posição não muda');
        assert.equal(b.sequencia, 3, 'empurrado uma casa pra frente');
        assert.equal(c.sequencia, 4, 'empurrado uma casa pra frente');
        assert.equal(novo.sequencia, 2);
    });

    it('mover pra uma posição DEPOIS da atual desloca só quem está entre elas pra trás', () => {
        // Posições: A=1, B=2, C=3, D=4. Move A da posição 1 pra posição 3.
        const A = { id: 1, sequencia: 1 };
        const B = { id: 2, sequencia: 2 };
        const C = { id: 3, sequencia: 3 };
        const D = { id: 4, sequencia: 4 };
        const irmaos = [A, B, C, D];

        reordenarPosicao(irmaos, A, 3, 1);

        assert.equal(B.sequencia, 1, 'B ocupa o lugar que A deixou');
        assert.equal(C.sequencia, 2, 'C anda uma casa pra trás');
        assert.equal(D.sequencia, 4, 'D está depois do destino, não se move');
        assert.equal(A.sequencia, 3);
    });

    it('mover pra uma posição ANTES da atual desloca só quem está entre elas pra frente', () => {
        // Posições: A=1, B=2, C=3, D=4. Move D da posição 4 pra posição 2.
        const A = { id: 1, sequencia: 1 };
        const B = { id: 2, sequencia: 2 };
        const C = { id: 3, sequencia: 3 };
        const D = { id: 4, sequencia: 4 };
        const irmaos = [A, B, C, D];

        reordenarPosicao(irmaos, D, 2, 4);

        assert.equal(A.sequencia, 1, 'A está antes do destino, não se move');
        assert.equal(B.sequencia, 3, 'B anda uma casa pra frente');
        assert.equal(C.sequencia, 4, 'C anda uma casa pra frente');
        assert.equal(D.sequencia, 2);
    });

    it('itens sem posição definida não são afetados pelo deslocamento', () => {
        const A = { id: 1, sequencia: 1 };
        const semPosicao = { id: 2, sequencia: null };
        const C = { id: 3, sequencia: 2 };
        const irmaos = [A, semPosicao, C];

        reordenarPosicao(irmaos, C, 1, 2);

        assert.equal(semPosicao.sequencia, null);
    });
});

describe('fecharEspaco', () => {
    it('fecha o buraco: quem estava depois da posição removida anda uma casa pra trás', () => {
        const lista = [
            { id: 1, sequencia: 1 },
            { id: 2, sequencia: 3 }, // era o 3º, o 2º (posição 2) foi removido
            { id: 3, sequencia: 4 },
        ];
        fecharEspaco(lista, 2);
        assert.deepEqual(
            lista.map((i) => i.sequencia),
            [1, 2, 3],
        );
    });

    it('não faz nada se a posição removida for null (item sem posição não deixa buraco)', () => {
        const lista = [
            { id: 1, sequencia: 1 },
            { id: 2, sequencia: 2 },
        ];
        fecharEspaco(lista, null);
        assert.deepEqual(
            lista.map((i) => i.sequencia),
            [1, 2],
        );
    });

    it('ignora itens sem sequência definida', () => {
        const lista = [
            { id: 1, sequencia: null },
            { id: 2, sequencia: 5 },
        ];
        fecharEspaco(lista, 3);
        assert.equal(lista[0].sequencia, null);
        assert.equal(lista[1].sequencia, 4);
    });
});

describe('getIrmaos* (quem compete por posição em cada nível)', () => {
    const db = {
        partes: [
            { id: 10, livroId: 1 },
            { id: 11, livroId: 2 },
        ],
        secoes: [
            { id: 20, paiTipo: 'livro', paiId: 1 },
            { id: 21, paiTipo: 'parte', paiId: 10 },
        ],
        elementos: [
            { id: 30, paiTipo: 'livro', paiId: 1 },
            { id: 31, paiTipo: 'parte', paiId: 10 },
            { id: 32, paiTipo: 'secao', paiId: 20 },
        ],
        poemas: [
            { id: 40, paiTipo: 'livro', paiId: 1 },
            { id: 41, paiTipo: 'secao', paiId: 20 },
        ],
        prosas: [
            { id: 50, paiTipo: 'livro', paiId: 1 },
            { id: 51, paiTipo: 'secao', paiId: 20 },
            // Prosa de acervo antigo: nunca teve paiTipo/paiId migrados pra
            // apontar pra Seção, só o campo legado secaoId (ver filtro em
            // getIrmaosDentroSecao — é o único helper com esse fallback OR).
            { id: 52, secaoId: 20 },
        ],
    };

    it('getIrmaosTopoLivro junta Partes + Seções/Elementos/Poemas/Prosas ligados direto ao livro', () => {
        const irmaos = getIrmaosTopoLivro(db, 1)
            .map((i) => i.id)
            .sort((a, b) => a - b);
        assert.deepEqual(irmaos, [10, 20, 30, 40, 50]);
    });

    it('getIrmaosDentroParte só pega quem está ligado àquela Parte específica', () => {
        const irmaos = getIrmaosDentroParte(db, 10)
            .map((i) => i.id)
            .sort((a, b) => a - b);
        assert.deepEqual(irmaos, [21, 31]);
    });

    it('getIrmaosDentroSecao junta Elementos/Poemas/Prosas ligados àquela Seção — inclui prosas antigas só com o campo legado secaoId, sem paiTipo/paiId', () => {
        const irmaos = getIrmaosDentroSecao(db, 20)
            .map((i) => i.id)
            .sort((a, b) => a - b);
        assert.deepEqual(irmaos, [32, 41, 51, 52]);
    });

    it('getIrmaosDentroSecao não pega itens de Partes/Livros nem de outra Seção', () => {
        assert.deepEqual(getIrmaosDentroSecao(db, 999), []);
        // Seção 21 (dentro da Parte 10) não tem nenhum filho — não deve
        // vazar nada da Seção 20 nem dos irmãos da Parte.
        assert.deepEqual(getIrmaosDentroSecao(db, 21), []);
    });

    it('getIrmaosPorEscopo delega pro helper certo conforme paiTipo', () => {
        const porId = (arr) => arr.map((i) => i.id).sort((a, b) => a - b);

        assert.deepEqual(
            porId(getIrmaosPorEscopo(db, 'livro', 1)),
            porId(getIrmaosTopoLivro(db, 1)),
        );
        assert.deepEqual(
            porId(getIrmaosPorEscopo(db, 'parte', 10)),
            porId(getIrmaosDentroParte(db, 10)),
        );
        assert.deepEqual(
            porId(getIrmaosPorEscopo(db, 'secao', 20)),
            porId(getIrmaosDentroSecao(db, 20)),
        );
        assert.equal(getIrmaosPorEscopo(db, 'tipo-inexistente', 1).length, 0);
    });
});

describe('getPosicaoElemento / getElementHierarchy', () => {
    const db = {
        livros: [{ id: 1, sequencia: 5 }],
        partes: [{ id: 10, livroId: 1, sequencia: 2 }],
        secoes: [{ id: 20, paiTipo: 'parte', paiId: 10, sequencia: 3 }],
    };

    it('elemento ligado direto a uma Seção carrega a sequência do Livro→Parte→Seção inteira', () => {
        const el = { paiTipo: 'secao', paiId: 20, sequencia: 1 };
        assert.deepEqual(getPosicaoElemento(el, db), [5, 2, 3]);
    });

    it('elemento sem vínculo válido (paiId inexistente) usa os valores-sentinela (9999)', () => {
        const el = { paiTipo: 'secao', paiId: 999, sequencia: 1 };
        assert.deepEqual(getPosicaoElemento(el, db), [9999, 9999, 9999]);
    });

    it('getElementHierarchy calcula o nível certo (1=livro, 2=parte, 3=seção)', () => {
        assert.equal(getElementHierarchy({ paiTipo: 'livro', paiId: 1 }, db)[1], 1);
        assert.equal(getElementHierarchy({ paiTipo: 'parte', paiId: 10 }, db)[1], 2);
        assert.equal(getElementHierarchy({ paiTipo: 'secao', paiId: 20 }, db)[1], 3);
    });
});

describe('formatarDataParcial', () => {
    it('data ausente vira travessão', () => {
        assert.equal(formatarDataParcial(null), '—');
        assert.equal(formatarDataParcial(undefined), '—');
    });

    it('só o ano', () => {
        assert.equal(formatarDataParcial({ ano: 2023 }), '2023');
    });

    it('dia/mês/ano completos, com padding de 2 dígitos', () => {
        assert.equal(formatarDataParcial({ dia: 5, mes: 3, ano: 2023 }), '05/03/2023');
    });

    it('inclui hora:minuto quando presente', () => {
        assert.equal(
            formatarDataParcial({ dia: 5, mes: 3, ano: 2023, hora: 9, minuto: 5 }),
            '05/03/2023 09:05',
        );
    });

    it('só hora, sem data (caso raro mas válido)', () => {
        assert.equal(formatarDataParcial({ hora: 14 }), '14:00');
    });
});

describe('anoDeDataParcial', () => {
    it('extrai o ano quando presente', () => {
        assert.equal(anoDeDataParcial({ ano: 1999 }), 1999);
    });
    it('retorna null quando não há data ou não há ano', () => {
        assert.equal(anoDeDataParcial(null), null);
        assert.equal(anoDeDataParcial({ mes: 3 }), null);
    });
});

describe('filtro de faixa de data (itemBateFiltroData / itemFaltaDataParaFiltro)', () => {
    it('sem filtro ativo, qualquer item bate (inclusive sem data)', () => {
        assert.equal(itemBateFiltroData(null, filtroDataVazio()), true);
        assert.equal(itemBateFiltroData({ ano: 2020 }, filtroDataVazio()), true);
    });

    it('com filtro ativo, item sem data cadastrada NÃO bate', () => {
        const filtro = { de: { ano: 2020 }, ate: {} };
        assert.equal(itemBateFiltroData(null, filtro), false);
    });

    it('item com só o ano bate num filtro por mês daquele ano (a faixa se sobrepõe)', () => {
        // Filtro: março/2023. Item: só "2023" (sem mês) — cobre o ano inteiro,
        // logo a faixa dele inclui março, então deve bater.
        const filtro = { de: { ano: 2023, mes: 3 }, ate: { ano: 2023, mes: 3 } };
        assert.equal(itemBateFiltroData({ ano: 2023 }, filtro), true);
    });

    it('item fora da faixa pedida não bate', () => {
        const filtro = { de: { ano: 2023 }, ate: { ano: 2023 } };
        assert.equal(itemBateFiltroData({ ano: 2022 }, filtro), false);
    });

    it('faixa aberta só de um lado (só "de", sem "até")', () => {
        const filtro = { de: { ano: 2020 }, ate: {} };
        assert.equal(itemBateFiltroData({ ano: 2025 }, filtro), true);
        assert.equal(itemBateFiltroData({ ano: 2019 }, filtro), false);
    });

    it('itemFaltaDataParaFiltro distingue "sem data" de "fora da faixa"', () => {
        const filtro = { de: { ano: 2023 }, ate: {} };
        assert.equal(
            itemFaltaDataParaFiltro(null, filtro),
            true,
            'sem data cadastrada, com filtro ativo',
        );
        assert.equal(
            itemFaltaDataParaFiltro({ ano: 2010 }, filtro),
            false,
            'tem data, só está fora da faixa',
        );
        assert.equal(
            itemFaltaDataParaFiltro(null, filtroDataVazio()),
            false,
            'sem filtro ativo, não conta como "faltando"',
        );
    });
});

describe('parseFiltroDataRapido', () => {
    it('reconhece um ano isolado como faixa de/até igual', () => {
        assert.deepEqual(parseFiltroDataRapido('2020'), {
            de: { ano: 2020 },
            ate: { ano: 2020 },
        });
    });

    it('reconhece um intervalo de anos "2020-2023"', () => {
        assert.deepEqual(parseFiltroDataRapido('2020-2023'), {
            de: { ano: 2020 },
            ate: { ano: 2023 },
        });
    });

    it('reconhece mês/ano "03/2020"', () => {
        assert.deepEqual(parseFiltroDataRapido('03/2020'), {
            de: { mes: 3, ano: 2020 },
            ate: { mes: 3, ano: 2020 },
        });
    });

    it('reconhece data completa "15/03/2020"', () => {
        assert.deepEqual(parseFiltroDataRapido('15/03/2020'), {
            de: { dia: 15, mes: 3, ano: 2020 },
            ate: { dia: 15, mes: 3, ano: 2020 },
        });
    });

    it('aceita dia e mês sem zero à esquerda ("5/3/2020")', () => {
        assert.deepEqual(parseFiltroDataRapido('5/3/2020'), {
            de: { dia: 5, mes: 3, ano: 2020 },
            ate: { dia: 5, mes: 3, ano: 2020 },
        });
    });

    it('ignora espaços nas pontas', () => {
        assert.deepEqual(parseFiltroDataRapido('  2020  '), {
            de: { ano: 2020 },
            ate: { ano: 2020 },
        });
    });

    it('texto vazio limpa o filtro (retorna filtroDataVazio)', () => {
        assert.deepEqual(parseFiltroDataRapido(''), filtroDataVazio());
        assert.deepEqual(parseFiltroDataRapido('   '), filtroDataVazio());
        assert.deepEqual(parseFiltroDataRapido(undefined), filtroDataVazio());
    });

    it('retorna null pra texto em formato não reconhecido', () => {
        assert.equal(parseFiltroDataRapido('março de 2020'), null);
        assert.equal(parseFiltroDataRapido('2020/03/15'), null);
        assert.equal(parseFiltroDataRapido('abc'), null);
    });

    it('retorna null pra valores fora da faixa válida', () => {
        assert.equal(parseFiltroDataRapido('32/01/2020'), null, 'dia inválido');
        assert.equal(parseFiltroDataRapido('15/13/2020'), null, 'mês inválido');
        assert.equal(parseFiltroDataRapido('15/03/1899'), null, 'ano abaixo do mínimo');
        assert.equal(parseFiltroDataRapido('13/2020'), null, 'mês inválido em mês/ano');
    });
});

describe('extrairSinalizacoesUnicas / extrairFasesUnicas', () => {
    it('extrai sinalizações únicas do mesmo jeito', () => {
        const poemas = [{ sinalizacoesTema: 'saudade, mar' }, { sinalizacoesTema: 'mar, chegada' }];
        assert.deepEqual(extrairSinalizacoesUnicas(poemas, 'sinalizacoesTema'), [
            'chegada',
            'mar',
            'saudade',
        ]);
    });

    it('extrai fases de vida únicas de livros, ignorando vazias', () => {
        const livros = [
            { fase: 'Mongaguá' },
            { fase: '  ' },
            { fase: 'Santos' },
            { fase: 'Mongaguá' },
        ];
        assert.deepEqual(extrairFasesUnicas(livros), ['Mongaguá', 'Santos']);
    });
});

describe('extrairIdiomasUnicos (item 9 — campo idioma)', () => {
    it('sempre inclui a semente IDIOMAS_SUGERIDOS, mesmo com lista vazia', () => {
        assert.deepEqual(extrairIdiomasUnicos([]), [...IDIOMAS_SUGERIDOS].sort());
    });

    it('soma idiomas já salvos que não estão na semente, sem duplicar os que já estão', () => {
        const itens = [{ idioma: 'pt-BR' }, { idioma: 'ja' }, { idioma: 'en' }];
        const resultado = extrairIdiomasUnicos(itens);
        assert.ok(resultado.includes('ja'));
        assert.equal(resultado.filter((i) => i === 'en').length, 1);
        assert.deepEqual(resultado, [...resultado].sort());
    });

    it('ignora itens sem idioma (ex.: dado ainda não migrado)', () => {
        const itens = [{ idioma: 'ja' }, {}, { titulo: 'sem idioma' }];
        assert.deepEqual(extrairIdiomasUnicos(itens), ['ja', ...IDIOMAS_SUGERIDOS].sort());
    });
});

describe('extrairMeiosEnviosUnicos (item 7 — campo envios)', () => {
    it('lista vazia sem envios retorna array vazio (sem semente fixa, ao contrário de idioma)', () => {
        assert.deepEqual(extrairMeiosEnviosUnicos([]), []);
    });

    it('soma meios de todos os itens, sem duplicar, em ordem alfabética', () => {
        const itens = [
            { envios: [{ meio: 'WhatsApp' }, { meio: 'Instagram' }] },
            { envios: [{ meio: 'WhatsApp' }] },
        ];
        assert.deepEqual(extrairMeiosEnviosUnicos(itens), ['Instagram', 'WhatsApp']);
    });

    it('ignora itens sem envios ou com envios sem meio', () => {
        const itens = [
            {},
            { envios: [] },
            { envios: [{ pessoa: 'Dani' }] }, // sem meio
            { envios: [{ meio: 'presencial' }] },
        ];
        assert.deepEqual(extrairMeiosEnviosUnicos(itens), ['presencial']);
    });
});

describe('extrairPremiosUnicos (item 8 — campo reconhecimentos)', () => {
    it('lista vazia sem reconhecimentos retorna array vazio (sem semente fixa, ao contrário de idioma)', () => {
        assert.deepEqual(extrairPremiosUnicos([]), []);
    });

    it('soma prêmios de todos os itens, sem duplicar, em ordem alfabética', () => {
        const itens = [
            { reconhecimentos: [{ premio: 'Concurso Y' }, { premio: 'Concurso X' }] },
            { reconhecimentos: [{ premio: 'Concurso X' }] },
        ];
        assert.deepEqual(extrairPremiosUnicos(itens), ['Concurso X', 'Concurso Y']);
    });

    it('ignora itens sem reconhecimentos ou com reconhecimentos sem premio', () => {
        const itens = [
            {},
            { reconhecimentos: [] },
            { reconhecimentos: [{ posicao: '1º lugar' }] }, // sem premio
            { reconhecimentos: [{ premio: 'Concurso Z' }] },
        ];
        assert.deepEqual(extrairPremiosUnicos(itens), ['Concurso Z']);
    });
});

describe('nomesPessoas / nomesGrupos (resolução via cadastro central)', () => {
    const pessoasCadastro = [
        { id: 1, nome: 'Dani', grupoIds: [10, 11] },
        { id: 2, nome: 'Dalton', grupoIds: [10] },
    ];
    const gruposCadastro = [
        { id: 10, nome: 'Amigos' },
        { id: 11, nome: 'Melhores Amigos' },
    ];

    it('resolve pessoaId → nome via o cadastro passado', () => {
        const item = {
            pessoas: [
                { pessoaId: 2, papeis: ['Mencionado(a)'] },
                { pessoaId: 1, papeis: [] },
            ],
        };
        assert.deepEqual(nomesPessoas(item, pessoasCadastro), ['Dalton', 'Dani']);
    });

    it('ignora pessoaId sem correspondência no cadastro, sem quebrar os demais', () => {
        const item = {
            pessoas: [
                { pessoaId: 999, papeis: [] },
                { pessoaId: 1, papeis: [] },
            ],
        };
        assert.deepEqual(nomesPessoas(item, pessoasCadastro), ['Dani']);
    });

    it('devolve array vazio quando item.pessoas não é array (dado ainda não migrado)', () => {
        assert.deepEqual(nomesPessoas({}), []);
        assert.deepEqual(nomesPessoas({ pessoas: 'Dani' }), []);
    });

    it('resolve grupoIds de uma Pessoa → nomes via o cadastro de grupos', () => {
        const dani = pessoasCadastro[0];
        assert.deepEqual(nomesGrupos(dani, gruposCadastro), ['Amigos', 'Melhores Amigos']);
    });

    it('devolve array vazio pra pessoa sem grupo, ou pessoa ausente', () => {
        assert.deepEqual(nomesGrupos({ grupoIds: [] }, gruposCadastro), []);
        assert.deepEqual(nomesGrupos(null, gruposCadastro), []);
    });
});

describe('paresGrupoPessoa (pares Grupo+Pessoa de um item, achatados)', () => {
    const pessoasCadastro = [
        { id: 1, nome: 'Dalton', grupoIds: [10] },
        { id: 2, nome: 'Pedro', grupoIds: [10, 11] },
        { id: 3, nome: 'Sem Grupo', grupoIds: [] },
    ];
    const gruposCadastro = [
        { id: 10, nome: 'Namorado', cor: 'blue' },
        { id: 11, nome: 'Ex-namorado', cor: 'amber' },
    ];

    it('gera um par {grupo, pessoa} por grupo de cada pessoa do item', () => {
        const item = {
            pessoas: [
                { pessoaId: 1, papeis: [] },
                { pessoaId: 2, papeis: [] },
            ],
        };
        const pares = paresGrupoPessoa(item, pessoasCadastro, gruposCadastro);
        assert.deepEqual(
            pares.map((p) => [p.grupo.nome, p.pessoa.nome]),
            [
                ['Namorado', 'Dalton'],
                ['Namorado', 'Pedro'],
                ['Ex-namorado', 'Pedro'],
            ],
        );
    });

    it('pessoa em mais de um grupo gera um par por grupo, não uma linha combinada', () => {
        const item = { pessoas: [{ pessoaId: 2, papeis: [] }] };
        const pares = paresGrupoPessoa(item, pessoasCadastro, gruposCadastro);
        assert.equal(pares.length, 2);
    });

    it('pessoa sem grupo não gera par nenhum', () => {
        const item = { pessoas: [{ pessoaId: 3, papeis: [] }] };
        assert.deepEqual(paresGrupoPessoa(item, pessoasCadastro, gruposCadastro), []);
    });

    it('ignora pessoaId ou grupoId sem correspondência no cadastro', () => {
        const item = {
            pessoas: [
                { pessoaId: 999, papeis: [] },
                { pessoaId: 1, papeis: [] },
            ],
        };
        const pares = paresGrupoPessoa(item, pessoasCadastro, [
            { id: 999, nome: 'Grupo Fantasma' },
        ]);
        assert.deepEqual(pares, []);
    });

    it('devolve array vazio quando item.pessoas não é array', () => {
        assert.deepEqual(paresGrupoPessoa({}, pessoasCadastro, gruposCadastro), []);
    });
});

describe('paresAutoria (Autor/Coautor, resolução via cadastro central)', () => {
    const autoresCadastro = [
        { id: 1, nome: 'Victor Leme', sobre: '' },
        { id: 2, nome: 'Dalton', sobre: '' },
    ];

    it('AUTORIA_PAPEIS tem exatamente Autor e Coautor', () => {
        assert.deepEqual(AUTORIA_PAPEIS, ['Autor', 'Coautor']);
    });

    it('resolve autorId → autor (objeto) + papel, na ordem do item', () => {
        const item = {
            autoria: [
                { autorId: 1, papel: 'Autor' },
                { autorId: 2, papel: 'Coautor' },
            ],
        };
        const pares = paresAutoria(item, autoresCadastro);
        assert.deepEqual(
            pares.map((p) => [p.autor.nome, p.papel]),
            [
                ['Victor Leme', 'Autor'],
                ['Dalton', 'Coautor'],
            ],
        );
    });

    it('ignora autorId sem correspondência no cadastro (autor excluído), sem quebrar os demais', () => {
        const item = {
            autoria: [
                { autorId: 999, papel: 'Autor' },
                { autorId: 1, papel: 'Autor' },
            ],
        };
        const pares = paresAutoria(item, autoresCadastro);
        assert.deepEqual(
            pares.map((p) => p.autor.nome),
            ['Victor Leme'],
        );
    });

    it('devolve array vazio quando item.autoria não é array (dado ainda não migrado)', () => {
        assert.deepEqual(paresAutoria({}), []);
        assert.deepEqual(paresAutoria({ autoria: 'Victor Leme' }), []);
    });
});

describe('CORES_GRUPO / classesCorGrupo (paleta curada de cor por Grupo)', () => {
    it('paleta não inclui rose — cor já reservada pra badge de Pessoa', () => {
        assert.ok(!CORES_GRUPO.some((c) => c.chave === 'rose'));
    });

    it('cada cor da paleta resolve pra uma classe própria (claro + escuro)', () => {
        const classes = new Set(CORES_GRUPO.map((c) => classesCorGrupo(c.chave)));
        assert.equal(classes.size, CORES_GRUPO.length, 'nenhuma cor deveria colidir com outra');
        CORES_GRUPO.forEach(({ chave }) => {
            const cls = classesCorGrupo(chave);
            assert.match(cls, new RegExp(`bg-${chave}-100`));
            assert.match(cls, /dark:bg-.*-900/);
        });
    });

    it('cor desconhecida ou ausente cai no padrão, sem quebrar', () => {
        assert.equal(classesCorGrupo('cor-que-nao-existe'), classesCorGrupo(CORES_GRUPO_PADRAO));
        assert.equal(classesCorGrupo(undefined), classesCorGrupo(CORES_GRUPO_PADRAO));
        assert.equal(classesCorGrupo(null), classesCorGrupo(CORES_GRUPO_PADRAO));
    });
});

describe('filtrarTextos (busca com sintaxe estilo Google)', () => {
    const itens = [
        {
            id: 1,
            titulo: 'Beira do Mar',
            ano: 2023,
            _buscaSinalizacoes: 'saudade',
            _buscaPessoas: 'dalton',
            notas: '',
            _livros: 'Fragmentos',
        },
        {
            id: 2,
            titulo: 'Rascunho Solto',
            ano: 2021,
            _buscaSinalizacoes: 'rascunho',
            _buscaPessoas: 'dani',
            notas: '',
            _livros: '',
        },
        {
            id: 3,
            titulo: 'Chegada ao Mar',
            ano: 2023,
            _buscaSinalizacoes: '',
            _buscaPessoas: '',
            notas: 'nota sobre Dalton',
            _livros: '',
            conteudoSensivel: 'menção a suicídio',
        },
        {
            id: 4,
            titulo: 'Árvore Só',
            ano: 2022,
            _buscaSinalizacoes: '',
            _buscaPessoas: '',
            notas: '',
            _livros: '',
        },
    ];

    it('sem query, retorna a lista intacta', () => {
        assert.equal(filtrarTextos(itens, '').length, 4);
        assert.equal(filtrarTextos(itens, '   ').length, 4);
    });

    it('termo solto busca em todos os campos gerais (título, ano, etiquetas, pessoas, notas, livros)', () => {
        const r = filtrarTextos(itens, 'mar');
        assert.deepEqual(
            r.map((i) => i.id),
            [1, 3],
        );
    });

    it('múltiplos termos soltos exigem TODOS (E lógico)', () => {
        const r = filtrarTextos(itens, 'mar dalton');
        assert.deepEqual(
            r.map((i) => i.id),
            [1, 3],
        ); // ambos mencionam "Dalton" e "mar"
    });

    it('"-termo" exclui quem contém aquele termo', () => {
        const r = filtrarTextos(itens, '-rascunho');
        assert.deepEqual(
            r.map((i) => i.id),
            [1, 3, 4],
        );
    });

    it('frase entre aspas busca a sequência exata, preservando espaços', () => {
        const r = filtrarTextos(itens, '"beira do mar"');
        assert.deepEqual(
            r.map((i) => i.id),
            [1],
        );
    });

    it('prefixo campo: restringe a busca àquele atributo', () => {
        assert.deepEqual(
            filtrarTextos(itens, 'pessoa:dalton').map((i) => i.id),
            [1],
        );
        assert.deepEqual(
            filtrarTextos(itens, 'etiqueta:rascunho').map((i) => i.id),
            [2],
        );
    });

    it('prefixo papel: busca só nos papéis marcados, sem olhar nome de pessoa', () => {
        const comPapeis = [
            { id: 20, titulo: 'A', _buscaPapeis: 'melhor amiga confidente' },
            { id: 21, titulo: 'B', _buscaPapeis: 'dedicataria' },
            { id: 22, titulo: 'C', _buscaPapeis: '' },
        ];
        assert.deepEqual(
            filtrarTextos(comPapeis, 'papel:confidente').map((i) => i.id),
            [20],
        );
        // "amiga" só aparece como papel, não como nome de pessoa — não teria
        // achado nada via pessoa: se não houvesse alguém chamado assim
        assert.deepEqual(
            filtrarTextos(comPapeis, 'papel:amiga').map((i) => i.id),
            [20],
        );
    });

    it('prefixo grupo: acha quem menciona alguém que pertence àquele Grupo', () => {
        const comGrupos = [
            { id: 30, titulo: 'A', _buscaGrupos: 'Família Melhores Amigos' },
            { id: 31, titulo: 'B', _buscaGrupos: 'Família' },
            { id: 32, titulo: 'C', _buscaGrupos: '' },
        ];
        assert.deepEqual(
            filtrarTextos(comGrupos, 'grupo:familia').map((i) => i.id),
            [30, 31],
        );
        assert.deepEqual(
            filtrarTextos(comGrupos, 'grupo:"melhores amigos"').map((i) => i.id),
            [30],
        );
    });

    it('combina prefixo de campo com exclusão: -etiqueta:rascunho', () => {
        const r = filtrarTextos(itens, '-etiqueta:rascunho');
        assert.deepEqual(r.map((i) => i.id).sort(), [1, 3, 4]);
    });

    it('busca é case-insensitive', () => {
        assert.deepEqual(
            filtrarTextos(itens, 'MAR').map((i) => i.id),
            [1, 3],
        );
    });

    it('campo desconhecido (não mapeado) não quebra — vira só um termo geral', () => {
        // "xyz:mar" — "xyz" não está em CAMPOS_ATRIBUTO, então cai como termo geral "xyz:mar" literal
        const r = filtrarTextos(itens, 'xyz:mar');
        assert.equal(r.length, 0); // nenhum item tem literalmente "xyz:mar" em algum campo
    });

    it('busca ignora acento tanto no termo quanto no valor comparado', () => {
        assert.deepEqual(
            filtrarTextos(itens, 'arvore').map((i) => i.id),
            [4],
        ); // termo sem acento acha título "Árvore Só"
        assert.deepEqual(
            filtrarTextos(itens, 'árvore').map((i) => i.id),
            [4],
        ); // termo com acento também acha, do mesmo jeito
    });

    it('prefixo de campo aceita acento ou não, indiferentemente (sensivel:/sensível:)', () => {
        assert.deepEqual(
            filtrarTextos(itens, 'sensivel:suicidio').map((i) => i.id),
            [3],
        );
        assert.deepEqual(
            filtrarTextos(itens, 'sensível:suicídio').map((i) => i.id),
            [3],
        );
    });

    it('campo:* acha quem tem aquele campo preenchido, não importa com o quê', () => {
        assert.deepEqual(
            filtrarTextos(itens, 'sensivel:*').map((i) => i.id),
            [3],
        );
    });

    it('-campo:* inverte: acha quem tem aquele campo vazio', () => {
        assert.deepEqual(
            filtrarTextos(itens, '-sensivel:*')
                .map((i) => i.id)
                .sort(),
            [1, 2, 4],
        );
    });

    it('prefixo genero: restringe a busca ao campo Gênero (só existe em Prosa)', () => {
        const prosas = [
            { id: 10, titulo: 'Carta ao Mar', genero: 'Cartas' },
            { id: 11, titulo: 'Diálogo Curto', genero: 'Diálogos' },
        ];
        assert.deepEqual(
            filtrarTextos(prosas, 'genero:cartas').map((i) => i.id),
            [10],
        );
    });

    it('prefixo idioma: restringe a busca ao campo Idioma (item 9)', () => {
        const comIdioma = [
            { id: 40, titulo: 'A', idioma: 'pt-BR' },
            { id: 41, titulo: 'B', idioma: 'en' },
            { id: 42, titulo: 'C', idioma: 'ja' },
        ];
        assert.deepEqual(
            filtrarTextos(comIdioma, 'idioma:en').map((i) => i.id),
            [41],
        );
    });

    it('prefixo autor: restringe a busca ao campo de Autoria (nome + papel)', () => {
        const comAutoria = [
            { id: 50, titulo: 'A', _buscaAutoria: 'Victor Leme Autor' },
            { id: 51, titulo: 'B', _buscaAutoria: 'Dalton Coautor' },
            { id: 52, titulo: 'C', _buscaAutoria: 'Victor Leme Autor' },
        ];
        assert.deepEqual(
            filtrarTextos(comAutoria, 'autor:dalton').map((i) => i.id),
            [51],
        );
        assert.deepEqual(
            filtrarTextos(comAutoria, 'autor:coautor').map((i) => i.id),
            [51],
        );
    });

    it('prefixo epoca: restringe a busca ao campo de Época Retratada (nome + recorte)', () => {
        const comEpoca = [
            { id: 60, titulo: 'A', _buscaEpoca: 'Corte de contato Momento' },
            { id: 61, titulo: 'B', _buscaEpoca: 'Luto Repercussão (e Pós)' },
            { id: 62, titulo: 'C', _buscaEpoca: 'Corte de contato Momento' },
        ];
        assert.deepEqual(
            filtrarTextos(comEpoca, 'epoca:luto').map((i) => i.id),
            [61],
        );
        assert.deepEqual(
            filtrarTextos(comEpoca, 'epoca:contato').map((i) => i.id),
            [60, 62],
        );
    });

    it('busca geral (sem prefixo) também acha por autoria, grupo, papel e época', () => {
        const itensRelacionais = [
            { id: 70, titulo: 'A', _buscaAutoria: 'Victor Leme Autor' },
            { id: 71, titulo: 'B', _buscaGrupos: 'Família Melhores Amigos' },
            { id: 72, titulo: 'C', _buscaPapeis: 'dedicataria' },
            { id: 73, titulo: 'D', _buscaEpoca: 'Corte de contato Momento' },
            { id: 74, titulo: 'E' },
        ];
        assert.deepEqual(
            filtrarTextos(itensRelacionais, 'leme').map((i) => i.id),
            [70],
        );
        assert.deepEqual(
            filtrarTextos(itensRelacionais, 'familia').map((i) => i.id),
            [71],
        );
        assert.deepEqual(
            filtrarTextos(itensRelacionais, 'dedicataria').map((i) => i.id),
            [72],
        );
        assert.deepEqual(
            filtrarTextos(itensRelacionais, 'contato').map((i) => i.id),
            [73],
        );
    });

    it('prefixo envio: restringe a busca ao campo de Envios (pessoa + meio + reação + notas)', () => {
        const comEnvios = [
            { id: 60, titulo: 'A', _buscaEnvios: 'Dani WhatsApp Achou linda ' },
            { id: 61, titulo: 'B', _buscaEnvios: 'Rafa Instagram Curtiu muito ' },
            { id: 62, titulo: 'C', _buscaEnvios: '' },
        ];
        assert.deepEqual(
            filtrarTextos(comEnvios, 'envio:dani').map((i) => i.id),
            [60],
        );
        assert.deepEqual(
            filtrarTextos(comEnvios, 'envio:instagram').map((i) => i.id),
            [61],
        );
        assert.deepEqual(
            filtrarTextos(comEnvios, 'envio:curtiu').map((i) => i.id),
            [61],
        );
    });

    it('prefixo reconhecimento: restringe a busca ao campo de Reconhecimentos (premio + posição + ano + texto)', () => {
        const comReconhecimentos = [
            { id: 70, titulo: 'A', _buscaReconhecimentos: 'Concurso X 1º lugar 2020 ' },
            { id: 71, titulo: 'B', _buscaReconhecimentos: 'Concurso Y Menção honrosa 2021 ' },
            { id: 72, titulo: 'C', _buscaReconhecimentos: '' },
        ];
        assert.deepEqual(
            filtrarTextos(comReconhecimentos, 'reconhecimento:concurso').map((i) => i.id),
            [70, 71],
        );
        assert.deepEqual(
            filtrarTextos(comReconhecimentos, 'reconhecimentos:menção').map((i) => i.id),
            [71],
        );
        assert.deepEqual(
            filtrarTextos(comReconhecimentos, 'reconhecimento:2020').map((i) => i.id),
            [70],
        );
    });

    it('"*" sem prefixo de campo não vira presença — é termo literal (não bate em nada aqui)', () => {
        const r = filtrarTextos(itens, '*');
        assert.equal(r.length, 0);
    });
});

// ─── debounce ────────────────────────────────────────────────────
// Usa mock.timers do node:test em vez de esperas reais — evita testes
// lentos e instáveis por causa de timing real.

describe('debounce', () => {
    it('só executa a função depois do tempo de espera sem novas chamadas', (t) => {
        t.mock.timers.enable({ apis: ['setTimeout'] });
        let chamadas = 0;
        const fn = debounce(() => {
            chamadas++;
        }, 200);

        fn();
        assert.equal(chamadas, 0, 'não deve rodar antes do tempo passar');
        t.mock.timers.tick(199);
        assert.equal(chamadas, 0, 'ainda não deve ter rodado 1ms antes do prazo');
        t.mock.timers.tick(1);
        assert.equal(chamadas, 1, 'deve rodar exatamente quando o prazo se completa');
    });

    it('rajada de chamadas seguidas reinicia o temporizador — só a última conta', (t) => {
        t.mock.timers.enable({ apis: ['setTimeout'] });
        let chamadas = 0;
        const fn = debounce(() => {
            chamadas++;
        }, 200);

        fn();
        t.mock.timers.tick(150);
        fn(); // reinicia o contador antes de completar os 200ms da 1ª chamada
        t.mock.timers.tick(150);
        assert.equal(
            chamadas,
            0,
            'a 1ª chamada foi cancelada pela 2ª, ainda não passou 200ms da 2ª',
        );
        t.mock.timers.tick(50);
        assert.equal(chamadas, 1, 'só executa uma vez, referente à última chamada da rajada');
    });

    it('repassa os argumentos da última chamada da rajada pra função original', (t) => {
        t.mock.timers.enable({ apis: ['setTimeout'] });
        let recebido = null;
        const fn = debounce((...args) => {
            recebido = args;
        }, 200);

        fn('a', 1);
        fn('b', 2);
        fn('c', 3);
        t.mock.timers.tick(200);
        assert.deepEqual(recebido, ['c', 3]);
    });

    it('usa 200ms como espera padrão quando nenhum valor é passado', (t) => {
        t.mock.timers.enable({ apis: ['setTimeout'] });
        let chamadas = 0;
        const fn = debounce(() => {
            chamadas++;
        });

        fn();
        t.mock.timers.tick(199);
        assert.equal(chamadas, 0);
        t.mock.timers.tick(1);
        assert.equal(chamadas, 1);
    });

    it('chamadas em janelas de tempo separadas (sem sobreposição) executam uma vez cada', (t) => {
        t.mock.timers.enable({ apis: ['setTimeout'] });
        let chamadas = 0;
        const fn = debounce(() => {
            chamadas++;
        }, 200);

        fn();
        t.mock.timers.tick(200);
        assert.equal(chamadas, 1);

        fn();
        t.mock.timers.tick(200);
        assert.equal(chamadas, 2);
    });
});

// ─── criarRastreadorDeAlteracoes ──────────────────────────────────
// observar(form) usa form.addEventListener — simulamos um "form" com
// addEventListener guardando os callbacks, e disparamos manualmente,
// no mesmo espírito do dom-shim.js usado por outros testes: só o
// suficiente pra exercitar a lógica pura (o estado sujo/limpo), sem
// simular DOM de verdade.

function criarFormFalso() {
    const ouvintes = {};
    return {
        addEventListener(tipo, cb) {
            (ouvintes[tipo] = ouvintes[tipo] || []).push(cb);
        },
        disparar(tipo) {
            (ouvintes[tipo] || []).forEach((cb) => cb());
        },
    };
}

describe('criarRastreadorDeAlteracoes', () => {
    it('começa limpo (não sujo)', () => {
        const r = criarRastreadorDeAlteracoes();
        assert.equal(r.estaSujo(), false);
    });

    it('evento "input" no form observado marca como sujo', () => {
        const r = criarRastreadorDeAlteracoes();
        const form = criarFormFalso();
        r.observar(form);
        form.disparar('input');
        assert.equal(r.estaSujo(), true);
    });

    it('evento "change" no form observado também marca como sujo', () => {
        const r = criarRastreadorDeAlteracoes();
        const form = criarFormFalso();
        r.observar(form);
        form.disparar('change');
        assert.equal(r.estaSujo(), true);
    });

    it('marcarLimpo() volta o estado pra não-sujo', () => {
        const r = criarRastreadorDeAlteracoes();
        const form = criarFormFalso();
        r.observar(form);
        form.disparar('input');
        assert.equal(r.estaSujo(), true);
        r.marcarLimpo();
        assert.equal(r.estaSujo(), false);
    });

    it('observar(null) não quebra (ex.: modal ainda sem form carregado)', () => {
        const r = criarRastreadorDeAlteracoes();
        assert.doesNotThrow(() => r.observar(null));
        assert.equal(r.estaSujo(), false);
    });

    it('cada rastreador tem seu próprio estado, independente dos outros', () => {
        const r1 = criarRastreadorDeAlteracoes();
        const r2 = criarRastreadorDeAlteracoes();
        const form1 = criarFormFalso();
        r1.observar(form1);
        form1.disparar('input');
        assert.equal(r1.estaSujo(), true);
        assert.equal(r2.estaSujo(), false);
    });

    it(
        'eventos em formulários diferentes observados pelo mesmo rastreador ' +
            '(ex.: reaproveitado entre telas) todos marcam o mesmo estado sujo',
        () => {
            const r = criarRastreadorDeAlteracoes();
            const formA = criarFormFalso();
            const formB = criarFormFalso();
            r.observar(formA);
            r.observar(formB);
            formB.disparar('change');
            assert.equal(r.estaSujo(), true);
        },
    );
});

describe('RELACOES_ELO / TIPOS_REFERENCIA / rotuloElo (redesenho Relação+Direção)', () => {
    it('RELACOES_ELO cobre as 8 relações bilaterais, incluindo Díptico e Outro', () => {
        for (const relacao of [
            'Reescrita',
            'Continuidade',
            'Tradução',
            'Variação',
            'Versão',
            'Resposta',
            'Díptico',
            'Outro',
        ]) {
            assert.ok(RELACOES_ELO.includes(relacao), `RELACOES_ELO deveria incluir "${relacao}"`);
        }
        assert.equal(RELACOES_ELO.length, 8);
    });

    it('TIPOS_REFERENCIA cobre as relações unidirecionais, incluindo o novo tipo Aceno a', () => {
        for (const tipo of [
            'Personagem em comum',
            'Imagem central compartilhada',
            'Aceno a',
            'Outro',
        ]) {
            assert.ok(
                TIPOS_REFERENCIA.includes(tipo),
                `TIPOS_REFERENCIA deveria incluir "${tipo}"`,
            );
        }
    });

    it('rotuloElo devolve o rótulo certo pros dois lados de cada relação assimétrica', () => {
        assert.equal(rotuloElo('Reescrita', 'origem'), 'Reescrito em');
        assert.equal(rotuloElo('Reescrita', 'destino'), 'Reescrita de');
        assert.equal(rotuloElo('Continuidade', 'origem'), 'Continuado em');
        assert.equal(rotuloElo('Continuidade', 'destino'), 'Continuação de');
        assert.equal(rotuloElo('Tradução', 'origem'), 'Traduzido para');
        assert.equal(rotuloElo('Tradução', 'destino'), 'Tradução de');
        assert.equal(rotuloElo('Variação', 'origem'), 'Variado em');
        assert.equal(rotuloElo('Variação', 'destino'), 'Variação de');
        assert.equal(rotuloElo('Versão', 'origem'), 'Versão anterior de');
        assert.equal(rotuloElo('Versão', 'destino'), 'Versão oficial de');
        assert.equal(rotuloElo('Resposta', 'origem'), 'Respondido em');
        assert.equal(rotuloElo('Resposta', 'destino'), 'Resposta a');
    });

    it('rotuloElo devolve o mesmo rótulo nos dois lados pra Díptico e Outro', () => {
        assert.equal(rotuloElo('Díptico', 'origem'), 'Díptico com');
        assert.equal(rotuloElo('Díptico', 'destino'), 'Díptico com');
        assert.equal(rotuloElo('Outro', 'origem'), 'Outro');
        assert.equal(rotuloElo('Outro', 'destino'), 'Outro');
    });

    it('rotuloElo devolve string vazia pra relação não reconhecida (elo legado sem relação definida)', () => {
        assert.equal(rotuloElo('', 'origem'), '');
        assert.equal(rotuloElo(undefined, 'destino'), '');
    });

    it('direcaoInversa troca origem por destino e vice-versa', () => {
        assert.equal(direcaoInversa('origem'), 'destino');
        assert.equal(direcaoInversa('destino'), 'origem');
    });

    it('direcaoInversa preserva valores vazios/desconhecidos sem inventar direção', () => {
        assert.equal(direcaoInversa(''), '');
        assert.equal(direcaoInversa(undefined), undefined);
    });

    it('ROTULOS_RELACAO_ELO tem um par origem/destino pra cada uma das 8 relações', () => {
        for (const relacao of RELACOES_ELO) {
            assert.ok(
                ROTULOS_RELACAO_ELO[relacao],
                `ROTULOS_RELACAO_ELO deveria ter entrada pra "${relacao}"`,
            );
            assert.ok(ROTULOS_RELACAO_ELO[relacao].origem);
            assert.ok(ROTULOS_RELACAO_ELO[relacao].destino);
        }
    });
});

// ─── Época (item 3 do plano de schema) ─────────────────────────────

describe('RECORTES_EPOCA / ROTULOS_RECORTE_EPOCA', () => {
    it('RECORTES_EPOCA tem exatamente momento e repercussão', () => {
        assert.deepEqual(RECORTES_EPOCA, ['momento', 'repercussão']);
    });

    it('ROTULOS_RECORTE_EPOCA tem rótulo pros dois valores', () => {
        assert.equal(ROTULOS_RECORTE_EPOCA.momento, 'Momento');
        assert.equal(ROTULOS_RECORTE_EPOCA.repercussão, 'Momento e Repercussão');
    });
});

describe('nomeEpoca (resolução epocaId → nome via cadastro central)', () => {
    const epocasCadastro = [
        { id: 1, nome: 'Corte de contato', contextoRelacao: 'Pedro e Victor' },
        { id: 2, nome: 'Luto' },
    ];

    it('resolve epocaId pro nome cadastrado', () => {
        assert.equal(nomeEpoca({ epocaId: 1 }, epocasCadastro), 'Corte de contato');
        assert.equal(nomeEpoca({ epocaId: 2 }, epocasCadastro), 'Luto');
    });

    it('devolve string vazia quando epocaId não existe mais no cadastro (época excluída)', () => {
        assert.equal(nomeEpoca({ epocaId: 999 }, epocasCadastro), '');
    });

    it('devolve string vazia pra epoca ausente/null', () => {
        assert.equal(nomeEpoca(null, epocasCadastro), '');
        assert.equal(nomeEpoca(undefined, epocasCadastro), '');
    });

    it('cai no fallback direto (.nome cru) pra dado ainda não migrado, mesmo sem epocaId', () => {
        assert.equal(nomeEpoca({ nome: 'Pandemia' }, epocasCadastro), 'Pandemia');
    });

    it('funciona mesmo sem cadastro passado (default [])', () => {
        assert.equal(nomeEpoca({ epocaId: 1 }), '');
    });
});

describe('contextoRelacaoEpoca (resolução epocaId → contexto do relacionamento)', () => {
    const epocasCadastro = [
        { id: 1, nome: 'Corte de contato', contextoRelacao: 'Pedro e Victor' },
        { id: 2, nome: 'Luto' },
    ];

    it('resolve epocaId pro contexto cadastrado', () => {
        assert.equal(contextoRelacaoEpoca({ epocaId: 1 }, epocasCadastro), 'Pedro e Victor');
    });

    it('devolve string vazia quando a época não tem contexto preenchido', () => {
        assert.equal(contextoRelacaoEpoca({ epocaId: 2 }, epocasCadastro), '');
    });

    it('devolve string vazia sem epocaId (dado legado não migrado)', () => {
        assert.equal(contextoRelacaoEpoca({ nome: 'Pandemia' }, epocasCadastro), '');
    });

    it('devolve string vazia pra epoca ausente/null', () => {
        assert.equal(contextoRelacaoEpoca(null, epocasCadastro), '');
        assert.equal(contextoRelacaoEpoca(undefined, epocasCadastro), '');
    });

    it('devolve string vazia quando epocaId não existe mais no cadastro (época excluída)', () => {
        assert.equal(contextoRelacaoEpoca({ epocaId: 999 }, epocasCadastro), '');
    });
});

describe('formatarEpocaRetratada (item 3 — epocaId + recorte)', () => {
    const epocasCadastro = [{ id: 1, nome: 'Corte de contato' }];

    it('N/A com nome resolvido mostra "Nome (N/A)"', () => {
        assert.equal(
            formatarEpocaRetratada({ epocaId: 1, na: true }, epocasCadastro),
            'Corte de contato (N/A)',
        );
    });

    it('N/A sem nome mostra só "N/A"', () => {
        assert.equal(formatarEpocaRetratada({ na: true }, epocasCadastro), 'N/A');
    });

    it('nome + intervalo + recorte, todos presentes', () => {
        const epoca = {
            epocaId: 1,
            inicio: { ano: 2023 },
            fim: { ano: 2024 },
            recorte: 'repercussão',
        };
        assert.equal(
            formatarEpocaRetratada(epoca, epocasCadastro),
            'Corte de contato e pós (2023 – 2024)',
        );
    });

    it('recorte "momento" continua marcado em colchete no fim (sem ambiguidade a resolver)', () => {
        const epoca = {
            epocaId: 1,
            inicio: { ano: 2023 },
            fim: { ano: 2024 },
            recorte: 'momento',
        };
        assert.equal(
            formatarEpocaRetratada(epoca, epocasCadastro),
            'Corte de contato (2023 – 2024) [Momento]',
        );
    });

    it('sem recorte não mostra o colchete', () => {
        const epoca = { epocaId: 1, inicio: { ano: 2023 }, fim: null };
        assert.equal(
            formatarEpocaRetratada(epoca, epocasCadastro),
            'Corte de contato (A partir de 2023)',
        );
    });

    it('só nome, sem datas nem recorte', () => {
        assert.equal(formatarEpocaRetratada({ epocaId: 1 }, epocasCadastro), 'Corte de contato');
    });

    it('só intervalo, sem nome (época ainda não cadastrada/resolvida)', () => {
        const epoca = { inicio: { ano: 2020 }, fim: { ano: 2021 } };
        assert.equal(formatarEpocaRetratada(epoca, epocasCadastro), '2020 – 2021');
    });

    it('campo totalmente vazio devolve travessão', () => {
        assert.equal(formatarEpocaRetratada({}, epocasCadastro), '—');
    });

    it('epoca null/ausente devolve travessão, igual ao campo vazio', () => {
        assert.equal(formatarEpocaRetratada(null, epocasCadastro), '—');
        assert.equal(formatarEpocaRetratada(undefined, epocasCadastro), '—');
    });

    describe('com Contexto do relacionamento cadastrado', () => {
        const epocasComContexto = [
            { id: 1, nome: 'Corte de contato', contextoRelacao: 'Pedro e Victor' },
        ];

        it('contexto entra na frente, separado por "•"', () => {
            const epoca = { epocaId: 1, inicio: { ano: 2023 }, fim: { ano: 2024 } };
            assert.equal(
                formatarEpocaRetratada(epoca, epocasComContexto),
                'Pedro e Victor • Corte de contato (2023 – 2024)',
            );
        });

        it('contexto + N/A', () => {
            assert.equal(
                formatarEpocaRetratada({ epocaId: 1, na: true }, epocasComContexto),
                'Pedro e Victor • Corte de contato (N/A)',
            );
        });

        it('contexto + recorte "repercussão"', () => {
            const epoca = { epocaId: 1, inicio: { ano: 2023 }, recorte: 'repercussão' };
            assert.equal(
                formatarEpocaRetratada(epoca, epocasComContexto),
                'Pedro e Victor • Corte de contato e pós (A partir de 2023)',
            );
        });

        it('sem contexto cadastrado (época sem o campo preenchido) não mostra o "•"', () => {
            const epocasSemContexto = [{ id: 1, nome: 'Luto' }];
            assert.equal(
                formatarEpocaRetratada({ epocaId: 1 }, epocasSemContexto),
                'Luto',
            );
        });
    });
});

describe('obterSugestaoEpocaPorId (sugestão de datas/contexto pro poema mais recente com a mesma época)', () => {
    it('devolve datas e contexto do poema de maior id (mais recente) com o mesmo epocaId', () => {
        const poemas = [
            {
                id: 100,
                epocaRetratada: { epocaId: 1, inicio: { ano: 2020 }, fim: null },
                contextoHistorico: 'primeiro',
            },
            {
                id: 200,
                epocaRetratada: { epocaId: 1, inicio: { ano: 2021 }, fim: { ano: 2022 } },
                contextoHistorico: 'mais recente',
            },
        ];
        const sugestao = obterSugestaoEpocaPorId(poemas, 1);
        assert.deepEqual(sugestao.inicio, { ano: 2021 });
        assert.deepEqual(sugestao.fim, { ano: 2022 });
        assert.equal(sugestao.contextoHistorico, 'mais recente');
    });

    it('ignora poemas com epocaId diferente', () => {
        const poemas = [
            { id: 1, epocaRetratada: { epocaId: 2 }, contextoHistorico: 'outra época' },
        ];
        assert.equal(obterSugestaoEpocaPorId(poemas, 1), null);
    });

    it('devolve null quando epocaId não é informado', () => {
        assert.equal(obterSugestaoEpocaPorId([{ id: 1 }], null), null);
        assert.equal(obterSugestaoEpocaPorId([{ id: 1 }], undefined), null);
    });

    it('devolve null quando não há nenhum poema com essa época ainda', () => {
        assert.equal(obterSugestaoEpocaPorId([{ id: 1, epocaRetratada: null }], 5), null);
    });
});
