import './helpers/dom-real.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// "Faz parte de" entre Períodos Biográficos: regra de intervalo (sobrepor, não
// conter), regra de autor, intervalo derivado e ordem em árvore.

const H = await import('../js/periodos-biograficos-hierarquia.js');

const ids = (lista) => lista.map((i) => i.id);

describe('ordemSemSobreposicao', () => {
    const p = (ini, fim) => ({
        inicio: ini == null ? null : { ano: ini },
        fim: fim == null ? null : { ano: fim },
    });

    it('sobrepor sem conter vale (filho começa antes e termina depois)', () => {
        assert.equal(H.ordemSemSobreposicao(p(2008, 2016), p(2010, 2014)), null);
    });

    it('filho que começa depois do fim do pai é acusado', () => {
        assert.equal(H.ordemSemSobreposicao(p(2015, 2016), p(2010, 2014)), 'depois');
    });

    it('filho que termina antes do começo do pai é acusado', () => {
        assert.equal(H.ordemSemSobreposicao(p(2005, 2009), p(2010, 2014)), 'antes');
    });

    it('encostar no mesmo ano conta como sobrepor', () => {
        assert.equal(H.ordemSemSobreposicao(p(2014, 2016), p(2010, 2014)), null);
        assert.equal(H.ordemSemSobreposicao(p(2008, 2010), p(2010, 2014)), null);
    });

    it('fim em aberto vale como infinito', () => {
        assert.equal(H.ordemSemSobreposicao(p(2020, null), p(2010, null)), null);
        assert.equal(H.ordemSemSobreposicao(p(2010, 2012), p(2005, null)), null);
        // Filho em aberto começando depois do fim do pai continua acusado.
        assert.equal(H.ordemSemSobreposicao(p(2020, null), p(2010, 2014)), 'depois');
    });

    it('sem data em um dos lados, a regra não se aplica', () => {
        assert.equal(H.ordemSemSobreposicao(p(null, null), p(2010, 2014)), null);
        assert.equal(H.ordemSemSobreposicao(p(2020, 2021), p(null, null)), null);
        assert.equal(H.ordemSemSobreposicao(null, null), null);
    });

    it('só o limite que existe é comparado', () => {
        // Filho só com fim 2005, pai só com começo 2010: termina antes.
        assert.equal(H.ordemSemSobreposicao(p(null, 2005), p(2010, null)), 'antes');
        // Pai só com fim 2014, filho só com fim 2016: não dá para dizer.
        assert.equal(H.ordemSemSobreposicao(p(null, 2016), p(null, 2014)), null);
    });

    it('compara no nível de precisão mais grosso (ano contra mês e dia)', () => {
        const filho = { inicio: { ano: 2014, mes: 12, dia: 31 }, fim: null };
        const pai = { inicio: { ano: 2010 }, fim: { ano: 2014 } };
        // O pai termina "em 2014" e o filho começa no último dia de 2014: encosta.
        assert.equal(H.ordemSemSobreposicao(filho, pai), null);
        const depois = { inicio: { ano: 2015, mes: 1, dia: 1 }, fim: null };
        assert.equal(H.ordemSemSobreposicao(depois, pai), 'depois');
    });

    it('com mês e dia dos dois lados, compara o dia', () => {
        const pai = { inicio: { ano: 2010 }, fim: { ano: 2014, mes: 6, dia: 15 } };
        const filho = (mes, dia) => ({ inicio: { ano: 2014, mes, dia }, fim: null });
        assert.equal(H.ordemSemSobreposicao(filho(6, 16), pai), 'depois');
        assert.equal(H.ordemSemSobreposicao(filho(6, 15), pai), null);
        assert.equal(H.ordemSemSobreposicao(filho(5, 1), pai), null);
    });

    it('data aproximada (c.) compara só o ano', () => {
        const pai = { inicio: { ano: 2010 }, fim: { ano: 2014, mes: 3, dia: 1 } };
        const filho = { inicio: { ano: 2014, mes: 9, dia: 9, aprox: true }, fim: null };
        // Sem aprox seria depois do fim (setembro > março); com aprox, mesmo ano.
        assert.equal(H.ordemSemSobreposicao(filho, pai), null);
        assert.equal(
            H.ordemSemSobreposicao({ inicio: { ano: 2016, aprox: true }, fim: null }, pai),
            'depois',
        );
    });
});

describe('autores', () => {
    it('autoresDoPeriodo devolve a lista de autores do período', () => {
        assert.deepEqual(H.autoresDoPeriodo({ autorId: 3 }), [3]);
        assert.deepEqual(H.autoresDoPeriodo({ autorId: null }), []);
        assert.deepEqual(H.autoresDoPeriodo({}), []);
        assert.deepEqual(H.autoresDoPeriodo(null), []);
    });

    it('autoresCabemNoPai: os autores do filho precisam estar entre os do pai', () => {
        assert.equal(H.autoresCabemNoPai({ autorId: 1 }, { autorId: 1 }), true);
        assert.equal(H.autoresCabemNoPai({ autorId: '1' }, { autorId: 1 }), true);
        assert.equal(H.autoresCabemNoPai({ autorId: 1 }, { autorId: 2 }), false);
        assert.equal(H.autoresCabemNoPai({ autorId: 1 }, { autorId: null }), false);
        // Filho sem autor: nada a conferir.
        assert.equal(H.autoresCabemNoPai({ autorId: null }, { autorId: 2 }), true);
    });
});

const arvore = () => [
    {
        id: 1,
        nome: 'Ensino médio',
        autorId: 1,
        inicio: { ano: 2005 },
        fim: { ano: 2008 },
        pertenceA: [],
    },
    {
        id: 2,
        nome: 'Pré-vestibular',
        autorId: 1,
        inicio: { ano: 2008 },
        fim: { ano: 2009 },
        pertenceA: [1],
    },
    {
        id: 3,
        nome: 'Outro autor',
        autorId: 2,
        inicio: { ano: 2005 },
        fim: { ano: 2008 },
        pertenceA: [],
    },
    { id: 4, nome: 'Relação com X', autorId: 1, inicio: null, fim: null, pertenceA: [] },
    {
        id: 5,
        nome: 'Fase 1',
        autorId: 1,
        inicio: { ano: 2011 },
        fim: { ano: 2012 },
        pertenceA: [4],
    },
    { id: 6, nome: 'Fase 2', autorId: 1, inicio: { ano: 2013 }, fim: null, pertenceA: [4] },
];

describe('paisInvalidosParaOFilho', () => {
    it('aceita pai do mesmo autor com datas que se sobrepõem', () => {
        const filho = { id: 9, autorId: 1, inicio: { ano: 2007 }, fim: { ano: 2010 } };
        assert.deepEqual(H.paisInvalidosParaOFilho(arvore(), filho, [1]), []);
    });

    it('acusa pai de outro autor', () => {
        const filho = { id: 9, autorId: 1, inicio: { ano: 2006 }, fim: null };
        assert.deepEqual(H.paisInvalidosParaOFilho(arvore(), filho, [3]), [
            { paiId: 3, motivo: 'autor' },
        ]);
    });

    it('acusa filho que começa depois do fim do pai e filho que termina antes do começo', () => {
        const tarde = { id: 9, autorId: 1, inicio: { ano: 2010 }, fim: { ano: 2011 } };
        assert.deepEqual(H.paisInvalidosParaOFilho(arvore(), tarde, [1]), [
            { paiId: 1, motivo: 'depois' },
        ]);
        const cedo = { id: 9, autorId: 1, inicio: { ano: 2000 }, fim: { ano: 2004 } };
        assert.deepEqual(H.paisInvalidosParaOFilho(arvore(), cedo, [1]), [
            { paiId: 1, motivo: 'antes' },
        ]);
    });

    it('com vários pais, o filho precisa se sobrepor a cada um', () => {
        const lista = arvore();
        lista.push({
            id: 7,
            nome: 'Faculdade',
            autorId: 1,
            inicio: { ano: 2010 },
            fim: { ano: 2014 },
            pertenceA: [],
        });
        const filho = { id: 9, autorId: 1, inicio: { ano: 2009 }, fim: { ano: 2011 } };
        // Sobrepõe a Faculdade (7) e o Ensino médio (1)? 2009 > 2008: não.
        assert.deepEqual(H.paisInvalidosParaOFilho(lista, filho, [7, 1]), [
            { paiId: 1, motivo: 'depois' },
        ]);
    });

    it('pai sem datas nunca é acusado; ids repetidos ou inexistentes são ignorados', () => {
        const filho = { id: 9, autorId: 1, inicio: { ano: 1990 }, fim: { ano: 1991 } };
        assert.deepEqual(H.paisInvalidosParaOFilho(arvore(), filho, [4, 4, 999]), []);
    });
});

describe('filhosInvalidosParaOPai', () => {
    it('lista os filhos que deixariam de caber nas datas novas do pai', () => {
        const dados = { autorId: 1, inicio: { ano: 2005 }, fim: { ano: 2006 } };
        // Pré-vestibular começa em 2008, depois do novo fim (2006).
        assert.deepEqual(H.filhosInvalidosParaOPai(arvore(), 1, dados), [
            { filhoId: 2, motivo: 'depois' },
        ]);
    });

    it('lista os filhos de outro autor se o autor do pai mudar', () => {
        const dados = { autorId: 2, inicio: { ano: 2005 }, fim: { ano: 2009 } };
        assert.deepEqual(H.filhosInvalidosParaOPai(arvore(), 1, dados), [
            { filhoId: 2, motivo: 'autor' },
        ]);
    });

    it('nada a acusar quando o pai continua cobrindo os filhos', () => {
        const dados = { autorId: 1, inicio: { ano: 2000 }, fim: { ano: 2020 } };
        assert.deepEqual(H.filhosInvalidosParaOPai(arvore(), 1, dados), []);
    });

    it('pai que perde as datas não acusa ninguém', () => {
        const dados = { autorId: 1, inicio: null, fim: null };
        assert.deepEqual(H.filhosInvalidosParaOPai(arvore(), 1, dados), []);
    });
});

describe('opcoesDePaiBiografico', () => {
    it('oferece só períodos do mesmo autor, sem o próprio nem os de dentro dele', () => {
        const lista = arvore();
        const comparar = H.criarComparadorDeEpocas(lista);
        const opcoes = H.opcoesDePaiBiografico(lista, { id: 1, autorId: 1 }, comparar);
        // 1 é ele mesmo, 2 está dentro dele, 3 é de outro autor.
        assert.deepEqual(ids(opcoes.map((o) => o.m)).sort(), [4, 5, 6]);
    });

    it('período novo (sem id) vê todos do autor, em árvore com recuo', () => {
        const lista = arvore();
        const comparar = H.criarComparadorDeEpocas(lista);
        const opcoes = H.opcoesDePaiBiografico(lista, { id: null, autorId: 1 }, comparar);
        assert.deepEqual(
            opcoes.map((o) => [o.m.id, o.nivel]),
            [
                [1, 0],
                [2, 1],
                [4, 0],
                [5, 1],
                [6, 1],
            ],
        );
    });
});

describe('intervalo derivado e datas efetivas', () => {
    it('pai sem datas mostra do começo mais cedo ao fim mais tarde dos de dentro', () => {
        const lista = arvore();
        lista[5].fim = { ano: 2015 }; // Fase 2 termina em 2015
        assert.deepEqual(H.intervaloDerivadoDoPeriodo(lista, 4), {
            inicio: { ano: 2011 },
            fim: { ano: 2015 },
        });
    });

    it('algum de dentro em aberto deixa o conjunto em aberto', () => {
        assert.deepEqual(H.intervaloDerivadoDoPeriodo(arvore(), 4), {
            inicio: { ano: 2011 },
            fim: null,
        });
    });

    it('conta também os netos', () => {
        const lista = arvore();
        lista.push({
            id: 8,
            nome: 'Neto',
            autorId: 1,
            inicio: { ano: 2001 },
            fim: { ano: 2002 },
            pertenceA: [5],
        });
        assert.equal(H.intervaloDerivadoDoPeriodo(lista, 4).inicio.ano, 2001);
    });

    it('sem nenhuma data nos de dentro: null', () => {
        const lista = [
            { id: 1, nome: 'A', pertenceA: [] },
            { id: 2, nome: 'B', pertenceA: [1] },
        ];
        assert.equal(H.intervaloDerivadoDoPeriodo(lista, 1), null);
        assert.equal(H.intervaloDerivadoDoPeriodo(lista, 2), null);
    });

    it('datasEfetivasDoPeriodo prefere as próprias e marca as derivadas', () => {
        const lista = arvore();
        assert.deepEqual(H.datasEfetivasDoPeriodo(lista, lista[0]), {
            inicio: { ano: 2005 },
            fim: { ano: 2008 },
            derivado: false,
        });
        const derivadas = H.datasEfetivasDoPeriodo(lista, lista[3]);
        assert.equal(derivadas.derivado, true);
        assert.equal(derivadas.inicio.ano, 2011);
        assert.deepEqual(H.datasEfetivasDoPeriodo(lista, { id: 99, nome: 'Solto' }), {
            inicio: null,
            fim: null,
            derivado: false,
        });
    });

    it('o intervalo derivado nunca é gravado no período', () => {
        const lista = arvore();
        H.datasEfetivasDoPeriodo(lista, lista[3]);
        assert.equal(lista[3].inicio, null);
        assert.equal(lista[3].fim, null);
    });
});

describe('criarComparadorDeEpocas e ordem em árvore', () => {
    it('pai sem datas vai pela data do mais antigo dos de dentro', () => {
        const lista = arvore();
        const ordenados = H.ordenarPeriodosEmArvore(
            lista.filter((p) => p.autorId === 1),
            H.criarComparadorDeEpocas(lista, 'cronologica'),
        );
        // Ensino médio (2005) e filho, depois Relação com X (derivado de 2011) e filhos.
        assert.deepEqual(
            ordenados.map((o) => [o.m.id, o.nivel]),
            [
                [1, 0],
                [2, 1],
                [4, 0],
                [5, 1],
                [6, 1],
            ],
        );
    });

    it('sem nenhuma data, vai para o fim e desempata pelo nome', () => {
        const lista = [
            { id: 1, nome: 'Zeta', pertenceA: [] },
            { id: 2, nome: 'Alfa', pertenceA: [] },
            { id: 3, nome: 'Com data', inicio: { ano: 2000 }, pertenceA: [] },
        ];
        const ordenados = H.ordenarPeriodosEmArvore(lista, H.criarComparadorDeEpocas(lista));
        assert.deepEqual(ids(ordenados.map((o) => o.m)), [3, 2, 1]);
    });

    it('mesmo ano: ordena por mês e dia, não pelo nome', () => {
        const d = (dia, mes, ano) => ({ dia, mes, ano });
        const lista = [
            {
                id: 1,
                nome: 'Compromisso sustentado',
                inicio: d(null, 7, 2018),
                fim: d(2, 2, 2023),
                pertenceA: [],
            },
            {
                id: 2,
                nome: 'Era Afetivo-Romântica',
                inicio: d(19, 1, 2018),
                fim: d(14, 3, 2021),
                pertenceA: [],
            },
            {
                id: 3,
                nome: 'Reconciliação Narrativa',
                inicio: d(8, 11, 2020),
                fim: d(1, 1, 2021),
                pertenceA: [],
            },
            {
                id: 4,
                nome: 'Reparo',
                inicio: d(null, 1, 2020),
                fim: d(null, 11, 2020),
                pertenceA: [],
            },
        ];
        const ordenados = H.ordenarPeriodosEmArvore(lista, H.criarComparadorDeEpocas(lista));
        assert.deepEqual(ids(ordenados.map((o) => o.m)), [2, 1, 4, 3]);
    });

    it('mesmo começo: termina antes primeiro, em aberto por último', () => {
        const d = (dia, mes, ano) => ({ dia, mes, ano });
        const lista = [
            { id: 1, nome: 'Luto', inicio: d(14, 3, 2021), fim: null, pertenceA: [] },
            {
                id: 2,
                nome: 'Separação em bons termos',
                inicio: d(14, 3, 2021),
                fim: d(10, 2, 2022),
                pertenceA: [],
            },
        ];
        const ordenados = H.ordenarPeriodosEmArvore(lista, H.criarComparadorDeEpocas(lista));
        assert.deepEqual(ids(ordenados.map((o) => o.m)), [2, 1]);
    });

    it('modo alfabético ordena só pelo nome', () => {
        const lista = arvore().filter((p) => p.autorId === 1);
        const comparar = H.criarComparadorDeEpocas(lista, 'alfabetica');
        assert.deepEqual(
            ids([...lista].sort(comparar)),
            [5, 6, 1, 2, 4].sort((a, b) => {
                const n = (i) => lista.find((p) => p.id === i).nome;
                return n(a).localeCompare(n(b), 'pt-BR');
            }),
        );
    });
});

describe('escolha do período num texto (campo com sugestões)', () => {
    const doAutor1 = (lista) => lista.filter((p) => p.autorId === 1);
    const opcoesDe = (lista, candidatos = doAutor1(lista)) =>
        H.opcoesDeEscolhaDoPeriodoBiografico(lista, candidatos, H.criarComparadorDeEpocas(lista));

    it('opções em árvore: o valor é o nome e o caminho vai à parte', () => {
        const opcoes = opcoesDe(arvore());
        assert.deepEqual(
            opcoes.map((o) => [o.id, o.rotulo, o.caminho, o.nivel]),
            [
                [1, 'Ensino médio', '', 0],
                [2, 'Pré-vestibular', 'Ensino médio', 1],
                [4, 'Relação com X', '', 0],
                [5, 'Fase 1', 'Relação com X', 1],
                [6, 'Fase 2', 'Relação com X', 1],
            ],
        );
    });

    it('neto leva o caminho todo, da raiz ao pai', () => {
        const lista = arvore();
        lista.push({ id: 8, nome: 'Neto', autorId: 1, inicio: { ano: 2011 }, pertenceA: [5] });
        const neto = opcoesDe(lista).find((o) => o.id === 8);
        assert.equal(neto.caminho, 'Relação com X › Fase 1');
        assert.equal(neto.nivel, 2);
    });

    it('o caminho vem do cadastro inteiro, mesmo com o pai fora das opções', () => {
        const lista = arvore();
        const opcoes = opcoesDe(
            lista,
            lista.filter((p) => p.id === 5),
        );
        assert.deepEqual(
            opcoes.map((o) => [o.rotulo, o.caminho]),
            [['Fase 1', 'Relação com X']],
        );
    });

    it('nome repetido ganha o caminho no valor e, se ainda repetir, #id', () => {
        const lista = [
            { id: 1, nome: 'Faculdade', autorId: 1, inicio: { ano: 2010 }, pertenceA: [] },
            { id: 2, nome: 'Faculdade', autorId: 1, inicio: { ano: 2015 }, pertenceA: [] },
            { id: 3, nome: 'Estágio', autorId: 1, inicio: { ano: 2011 }, pertenceA: [1] },
            { id: 4, nome: 'Estágio', autorId: 1, inicio: { ano: 2016 }, pertenceA: [2] },
        ];
        // As duas Faculdades têm o mesmo nome e o mesmo caminho (topo): #id. Os dois
        // Estágios têm o mesmo nome, mas caminhos diferentes... que viram o mesmo
        // texto "Estágio (Faculdade)": #id também.
        assert.deepEqual(
            opcoesDe(lista).map((o) => o.rotulo),
            ['Faculdade #1', 'Estágio (Faculdade) #3', 'Faculdade #2', 'Estágio (Faculdade) #4'],
        );
    });

    it('resolve o nome, nome fora das sugestões, de outro autor e nome novo', () => {
        const lista = arvore();
        const extras = {
            candidatos: doAutor1(lista).filter((p) => p.id !== 6),
            preferidos: doAutor1(lista),
            comparar: H.criarComparadorDeEpocas(lista),
        };
        const r = (texto) => H.resolverPeriodoBiograficoPorRotulo(lista, texto, extras);
        assert.deepEqual(r('Fase 1'), { id: 5 });
        assert.deepEqual(r('  Pré-vestibular  '), { id: 2 });
        assert.deepEqual(r('Fase 2'), { id: 6 }); // fora das sugestões, mas do autor
        assert.deepEqual(r('Outro autor'), { id: 3 }); // de outro autor: último recurso
        assert.deepEqual(r('Intercâmbio'), { id: null, novo: true });
        assert.deepEqual(r('   '), { id: null });
    });

    it('nome repetido: o valor com caminho aponta o período certo', () => {
        const lista = [
            { id: 1, nome: 'Faculdade', autorId: 1, pertenceA: [] },
            { id: 2, nome: 'Estágio', autorId: 1, pertenceA: [1] },
            { id: 3, nome: 'Faculdade', autorId: 1, pertenceA: [] },
            { id: 4, nome: 'Estágio', autorId: 1, pertenceA: [3] },
        ];
        const extras = {
            candidatos: lista,
            preferidos: lista,
            comparar: H.criarComparadorDeEpocas(lista),
        };
        const rotulos = H.opcoesDeEscolhaDoPeriodoBiografico(lista, lista, extras.comparar).map(
            (o) => o.rotulo,
        );
        rotulos.forEach((rotulo, i) => {
            const esperado = H.opcoesDeEscolhaDoPeriodoBiografico(lista, lista, extras.comparar)[i]
                .id;
            assert.deepEqual(H.resolverPeriodoBiograficoPorRotulo(lista, rotulo, extras), {
                id: esperado,
            });
        });
    });

    it('nome igual em dois autores: vale o do autor do texto', () => {
        const lista = [
            { id: 1, nome: 'Faculdade', autorId: 2, pertenceA: [] },
            { id: 2, nome: 'Faculdade', autorId: 1, pertenceA: [] },
        ];
        const dele = lista.filter((p) => p.autorId === 1);
        const extras = {
            candidatos: dele,
            preferidos: dele,
            comparar: H.criarComparadorDeEpocas(lista),
        };
        assert.deepEqual(H.resolverPeriodoBiograficoPorRotulo(lista, 'Faculdade', extras), {
            id: 2,
        });
    });
});

describe('rótulo do período já escolhido (chip)', () => {
    it('nome, e dentro de outro leva o caminho dos pais', () => {
        const lista = arvore();
        lista.push({ id: 8, nome: 'Neto', autorId: 1, inicio: { ano: 2011 }, pertenceA: [5] });
        assert.equal(H.rotuloDoPeriodoBiografico(lista, 1), 'Ensino médio');
        assert.equal(H.rotuloDoPeriodoBiografico(lista, 2), 'Pré-vestibular (Ensino médio)');
        assert.equal(H.rotuloDoPeriodoBiografico(lista, 8), 'Neto (Relação com X › Fase 1)');
        assert.equal(H.rotuloDoPeriodoBiografico(lista, 999), '');
    });
});

describe('peças reaproveitadas do Histórico', () => {
    it('ciclo, caminho, mesclar e excluir funcionam sobre períodos biográficos', () => {
        const lista = arvore();
        assert.equal(H.criaCicloPeriodo(lista, 1, [2]), true);
        assert.equal(H.criaCicloPeriodo(lista, 2, [4]), false);
        assert.equal(H.caminhoDoPeriodo(lista, 5), 'Relação com X › Fase 1');
        assert.deepEqual(H.destinoDosFilhosAoExcluir(lista, 1), {
            topo: [2],
            sobem: [],
            mantem: [],
        });
        const alterados = H.retirarPeriodoDaHierarquia(lista, 4, []);
        assert.deepEqual(
            alterados.map((a) => a.id),
            [5, 6],
        );
        assert.deepEqual(lista[4].pertenceA, []);
    });

    it('sanearHierarquiaDePeriodos cria a lista vazia e corta ciclo', () => {
        const lista = [
            { id: 1, nome: 'A' },
            { id: 2, nome: 'B', pertenceA: [1, 999, 2] },
            { id: 3, nome: 'C', pertenceA: [4] },
            { id: 4, nome: 'D', pertenceA: [3] },
        ];
        assert.equal(H.sanearHierarquiaDePeriodos(lista), true);
        assert.deepEqual(lista[0].pertenceA, []);
        assert.deepEqual(lista[1].pertenceA, [1]);
        assert.equal(lista[2].pertenceA.length + lista[3].pertenceA.length, 1);
        assert.equal(H.sanearHierarquiaDePeriodos(lista), false);
    });
});
