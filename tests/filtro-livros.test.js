import './helpers/dom-real.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const {
    FASE_SEM_FASE,
    SITUACAO_NAO_ESPECIFICADA,
    filtrarLivros,
    filtrosLivrosAtivos,
    filtrosLivrosVazios,
    fasesDosLivros,
    haLivroSemFase,
    livroCombinaComBusca,
    livroTemDataDePublicacao,
    tipoDoLivro,
    PUBLICADO,
    PROGRAMADO,
    NAO_PUBLICADO,
    livroEhProgramado,
    situacaoDePublicacao,
    filtroDataLivrosAtivo,
} = await import('../js/filtro-livros.js');

const livros = () => [
    {
        id: 1,
        titulo: 'Água Viva',
        siglaOficial: 'AV',
        tipo: 'Inéditos',
        fase: 'Juventude',
        situacaoEditorial: 'em-circulacao',
        isbn13: '978-85-1234-567-8',
        isbn10: '85-1234-567-X',
    },
    {
        id: 2,
        titulo: 'Poemas Reunidos',
        siglaOficial: 'PR',
        tipo: 'Coletânea',
        fase: 'Maturidade',
        situacaoEditorial: 'esgotado',
    },
    { id: 3, titulo: 'Sem nada', tipo: 'Livro' },
    {
        id: 4,
        titulo: 'Outro',
        tipo: 'Inéditos',
        fase: ' Juventude ',
        situacaoEditorial: 'valor-desconhecido',
    },
];

const ids = (lista) => lista.map((l) => l.id);

describe('filtro-livros: busca', () => {
    it('termo vazio ou só espaços passa todos', () => {
        assert.deepEqual(ids(filtrarLivros(livros(), { busca: '' })), [1, 2, 3, 4]);
        assert.deepEqual(ids(filtrarLivros(livros(), { busca: '   ' })), [1, 2, 3, 4]);
    });

    it('acha por trecho do título, ignorando caixa e acento', () => {
        assert.deepEqual(ids(filtrarLivros(livros(), { busca: 'agua' })), [1]);
        assert.deepEqual(ids(filtrarLivros(livros(), { busca: 'REUNIDOS' })), [2]);
    });

    it('acha pela sigla', () => {
        assert.deepEqual(ids(filtrarLivros(livros(), { busca: 'pr' })), [2]);
    });

    it('acha pelo ISBN com ou sem hífen e espaço, nos dois ISBNs', () => {
        assert.deepEqual(ids(filtrarLivros(livros(), { busca: '9788512345678' })), [1]);
        assert.deepEqual(ids(filtrarLivros(livros(), { busca: '978-85 1234' })), [1]);
        assert.deepEqual(ids(filtrarLivros(livros(), { busca: '851234567x' })), [1]);
    });

    it('a letra x digitada sozinha não casa com o X do ISBN-10, só com o título', () => {
        assert.ok(!livroCombinaComBusca(livros()[0], 'x'));
        assert.ok(livroCombinaComBusca({ titulo: 'Xadrez' }, 'x'));
    });

    it('termo de letras não casa com ISBN', () => {
        assert.deepEqual(ids(filtrarLivros(livros(), { busca: 'zzz' })), []);
    });

    it('livro sem sigla nem ISBN não quebra', () => {
        assert.ok(livroCombinaComBusca({ id: 9, titulo: 'X' }, 'x'));
        assert.ok(!livroCombinaComBusca({ id: 9 }, 'abc'));
    });
});

describe('filtro-livros: tipo, fase e situação', () => {
    it('tipo: Coletânea é Coletânea; o resto é Inéditos', () => {
        assert.equal(tipoDoLivro({ tipo: 'Coletânea' }), 'Coletânea');
        assert.equal(tipoDoLivro({ tipo: 'Livro' }), 'Inéditos');
        assert.equal(tipoDoLivro({}), 'Inéditos');
        assert.deepEqual(ids(filtrarLivros(livros(), { tipo: 'Coletânea' })), [2]);
        assert.deepEqual(ids(filtrarLivros(livros(), { tipo: 'Inéditos' })), [1, 3, 4]);
    });

    it('fase: igual ao texto, sem espaços nas pontas', () => {
        assert.deepEqual(ids(filtrarLivros(livros(), { fase: 'Juventude' })), [1, 4]);
        assert.deepEqual(ids(filtrarLivros(livros(), { fase: 'Maturidade' })), [2]);
    });

    it('fase: "Sem fase" pega livro sem o campo ou com campo vazio', () => {
        assert.deepEqual(ids(filtrarLivros(livros(), { fase: FASE_SEM_FASE })), [3]);
    });

    it('situação: cada valor e "Não especificada"', () => {
        assert.deepEqual(ids(filtrarLivros(livros(), { situacao: 'em-circulacao' })), [1]);
        assert.deepEqual(ids(filtrarLivros(livros(), { situacao: 'esgotado' })), [2]);
        assert.deepEqual(ids(filtrarLivros(livros(), { situacao: 'fora-de-catalogo' })), []);
    });

    it('situação: ausente e valor desconhecido contam como não especificada', () => {
        assert.deepEqual(
            ids(filtrarLivros(livros(), { situacao: SITUACAO_NAO_ESPECIFICADA })),
            [3, 4],
        );
    });

    it('os filtros se combinam com E', () => {
        assert.deepEqual(
            ids(filtrarLivros(livros(), { tipo: 'Inéditos', fase: 'Juventude' })),
            [1, 4],
        );
        assert.deepEqual(
            ids(filtrarLivros(livros(), { tipo: 'Inéditos', fase: 'Juventude', busca: 'agua' })),
            [1],
        );
        assert.deepEqual(
            ids(filtrarLivros(livros(), { tipo: 'Coletânea', fase: 'Juventude' })),
            [],
        );
    });

    it('mantém a ordem da lista de entrada', () => {
        const invertida = livros().reverse();
        assert.deepEqual(ids(filtrarLivros(invertida, { tipo: 'Inéditos' })), [4, 3, 1]);
    });

    it('sem filtros, devolve todos, e lista nula não quebra', () => {
        assert.equal(filtrarLivros(livros()).length, 4);
        assert.deepEqual(filtrarLivros(null, { busca: 'a' }), []);
    });
});

describe('filtro-livros: apoio da tela', () => {
    it('filtrosLivrosAtivos', () => {
        assert.equal(filtrosLivrosAtivos(filtrosLivrosVazios()), false);
        assert.equal(filtrosLivrosAtivos({ busca: '   ' }), false);
        assert.equal(filtrosLivrosAtivos({ busca: 'a' }), true);
        assert.equal(filtrosLivrosAtivos({ tipo: 'Coletânea' }), true);
        assert.equal(filtrosLivrosAtivos({ fase: FASE_SEM_FASE }), true);
        assert.equal(filtrosLivrosAtivos({ situacao: 'esgotado' }), true);
    });

    it('fasesDosLivros: únicas, aparadas e em ordem; haLivroSemFase', () => {
        assert.deepEqual(fasesDosLivros(livros()), ['Juventude', 'Maturidade']);
        assert.equal(haLivroSemFase(livros()), true);
        assert.equal(haLivroSemFase([{ fase: 'A' }]), false);
        assert.deepEqual(fasesDosLivros([]), []);
    });
});

const HOJE = { ano: 2026, mes: 10, dia: 21 };

describe('filtro-livros: programados', () => {
    it('data inteira no futuro é programada, em qualquer precisão', () => {
        assert.equal(livroEhProgramado({ data: { ano: 2027 } }, HOJE), true);
        assert.equal(livroEhProgramado({ data: { ano: 2026, mes: 11 } }, HOJE), true);
        assert.equal(livroEhProgramado({ data: { ano: 2026, mes: 10, dia: 22 } }, HOJE), true);
        assert.equal(livroEhProgramado({ data: { ano: 2100, mes: 1, dia: 1 } }, HOJE), true);
    });

    it('hoje, passado, ano ou mês em curso e datas sem ano não são programadas', () => {
        assert.equal(livroEhProgramado({ data: { ano: 2026, mes: 10, dia: 21 } }, HOJE), false);
        assert.equal(livroEhProgramado({ data: { ano: 2026, mes: 10, dia: 20 } }, HOJE), false);
        assert.equal(livroEhProgramado({ data: { ano: 2026 } }, HOJE), false, 'ano em curso');
        assert.equal(
            livroEhProgramado({ data: { ano: 2026, mes: 10 } }, HOJE),
            false,
            'mês em curso',
        );
        assert.equal(livroEhProgramado({ data: { ano: 2020 } }, HOJE), false);
        assert.equal(livroEhProgramado({ data: { mes: 12, dia: 25 } }, HOJE), false, 'sem ano');
        assert.equal(livroEhProgramado({ data: '2030' }, HOJE), false, 'texto antigo');
        assert.equal(livroEhProgramado({}, HOJE), false);
    });

    it('os três grupos não se sobrepõem', () => {
        assert.equal(situacaoDePublicacao({}, HOJE), NAO_PUBLICADO);
        assert.equal(situacaoDePublicacao({ data: { ano: 2020 } }, HOJE), PUBLICADO);
        assert.equal(situacaoDePublicacao({ data: { ano: 2027 } }, HOJE), PROGRAMADO);
        const lista = [
            { id: 1, data: { ano: 2020 } },
            { id: 2 },
            { id: 3, data: { ano: 2027 } },
            { id: 4, data: { ano: 2026, mes: 12, dia: 1 } },
        ];
        assert.deepEqual(ids(filtrarLivros(lista, { publicacao: PROGRAMADO }, HOJE)), [3, 4]);
        assert.deepEqual(ids(filtrarLivros(lista, { publicacao: PUBLICADO }, HOJE)), [1]);
        assert.deepEqual(ids(filtrarLivros(lista, { publicacao: NAO_PUBLICADO }, HOJE)), [2]);
    });

    it('sem `hoje` usa a data do aparelho (data de 2100 é sempre futura)', () => {
        assert.deepEqual(
            ids(filtrarLivros([{ id: 1, data: { ano: 2100 } }], { publicacao: PROGRAMADO })),
            [1],
        );
    });
});

describe('filtro-livros: publicado e não publicado', () => {
    it('data com dia, mês ou ano conta como publicado', () => {
        assert.equal(livroTemDataDePublicacao({ data: { ano: 2020 } }), true);
        assert.equal(livroTemDataDePublicacao({ data: { mes: 5 } }), true);
        assert.equal(livroTemDataDePublicacao({ data: { dia: 3 } }), true);
        assert.equal(livroTemDataDePublicacao({ data: '2019' }), true);
    });

    it('sem data, data vazia, hora sozinha e texto em branco contam como não publicado', () => {
        assert.equal(livroTemDataDePublicacao({}), false);
        assert.equal(livroTemDataDePublicacao({ data: null }), false);
        assert.equal(livroTemDataDePublicacao({ data: {} }), false);
        assert.equal(livroTemDataDePublicacao({ data: { dia: '', mes: '', ano: '' } }), false);
        assert.equal(livroTemDataDePublicacao({ data: { hora: 10, minuto: 30 } }), false);
        assert.equal(livroTemDataDePublicacao({ data: '   ' }), false);
        assert.equal(livroTemDataDePublicacao(null), false);
    });

    it('filtra, combina com os outros e conta como filtro ativo', () => {
        const lista = [
            { id: 1, titulo: 'A', tipo: 'Inéditos', data: { ano: 2020 } },
            { id: 2, titulo: 'B', tipo: 'Inéditos' },
            { id: 3, titulo: 'C', tipo: 'Coletânea', data: { ano: 2022 } },
        ];
        assert.deepEqual(ids(filtrarLivros(lista, { publicacao: PUBLICADO }, HOJE)), [1, 3]);
        assert.deepEqual(ids(filtrarLivros(lista, { publicacao: NAO_PUBLICADO }, HOJE)), [2]);
        assert.deepEqual(ids(filtrarLivros(lista, { publicacao: '' }, HOJE)), [1, 2, 3]);
        assert.deepEqual(
            ids(filtrarLivros(lista, { publicacao: PUBLICADO, tipo: 'Coletânea' }, HOJE)),
            [3],
        );
        assert.equal(filtrosLivrosAtivos({ publicacao: PUBLICADO }), true);
        assert.equal(filtrosLivrosVazios().publicacao, '');
    });
});

describe('filtro de data de publicação (campo único)', () => {
    const lista = [
        { id: 1, data: { ano: 2020 } },
        { id: 2, data: { mes: 3, ano: 2021 } },
        { id: 3, data: { dia: 5, mes: 3, ano: 2021 } },
        { id: 4, data: { dia: 5, mes: 3 } },
        { id: 5, data: '2021' },
        { id: 6 },
    ];
    const ids = (l) => l.map((x) => x.id);
    const f = (de, ate = de) => ({ data: { de, ate } });

    it('ano pega quem se sobrepõe a ele; texto antigo e sem data ficam de fora', () => {
        assert.deepEqual(ids(filtrarLivros(lista, f({ ano: 2021 }))), [2, 3]);
        assert.deepEqual(ids(filtrarLivros(lista, f({ ano: 2020 }))), [1]);
    });

    it('mês/ano, dia completo e período', () => {
        assert.deepEqual(ids(filtrarLivros(lista, f({ mes: 3, ano: 2021 }))), [2, 3]);
        assert.deepEqual(ids(filtrarLivros(lista, f({ dia: 5, mes: 3, ano: 2021 }))), [2, 3]);
        assert.deepEqual(ids(filtrarLivros(lista, f({ dia: 6, mes: 3, ano: 2021 }))), [2]);
        assert.deepEqual(ids(filtrarLivros(lista, f({ ano: 2020 }, { ano: 2021 }))), [1, 2, 3]);
    });

    it('livro só com o ano aparece ao filtrar um mês desse ano', () => {
        assert.deepEqual(ids(filtrarLivros(lista, f({ mes: 7, ano: 2020 }))), [1]);
    });

    it('filtro vazio não filtra e não conta como ativo', () => {
        assert.equal(filtroDataLivrosAtivo(filtrosLivrosVazios().data), false);
        assert.equal(ids(filtrarLivros(lista, filtrosLivrosVazios())).length, 6);
        assert.equal(
            filtrosLivrosAtivos({ data: { de: { ano: 2021 }, ate: { ano: 2021 } } }),
            true,
        );
    });
});
