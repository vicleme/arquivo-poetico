import './helpers/localstorage-shim.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const {
    filtrarLivrosPorConsulta,
    juntarVinculosComAspas,
    livroCombinaComConsulta,
    separarNomeEPapel,
    CAMPOS_ATRIBUTO_LIVRO,
    PREFIXOS_CANONICOS_LIVRO,
} = await import('../js/busca-livros.js');

const AUTORES = [
    { id: 1, nome: 'Maria Silva' },
    { id: 2, nome: 'João Pereira' },
    { id: 3, nome: 'Pedro Alves' },
];
const COLABS = [
    { id: 10, nome: 'Ana Souza' },
    { id: 11, nome: 'Bia Lima' },
];

const LIVROS = [
    {
        id: 1,
        titulo: 'Dom Casmurro',
        siglaOficial: 'DC',
        isbn13: '978-85-1234-567-8',
        autoriaLivro: [{ autorId: 1, papeis: ['Autor'] }],
        equipeLivro: [{ colaboradorId: 10, papeis: [{ papel: 'Capista', escopo: 'Capa' }] }],
    },
    {
        id: 2,
        titulo: 'Poemas Traduzidos',
        autoriaLivro: [
            { autorId: 2, papeis: ['Autor'] },
            { autorId: 1, papeis: ['Tradutor'] },
        ],
        equipeLivro: [{ colaboradorId: 11, papeis: [{ papel: 'Revisor' }] }],
    },
    {
        id: 3,
        titulo: 'Coletânea Viva',
        isbn10: '8512345679',
        autoriaLivro: [
            { autorId: 3, papeis: ['Coautor'] },
            { autorId: 1, papeis: ['Autor', 'Tradutor'] },
        ],
    },
    { id: 4, titulo: 'Sem nada' },
];

const ids = (q) => filtrarLivrosPorConsulta(LIVROS, q, AUTORES, COLABS).map((l) => l.id);

describe('separarNomeEPapel', () => {
    it('divide no último @; vazio de um lado vale qualquer', () => {
        assert.deepEqual(separarNomeEPapel('Maria@Tradutor'), { nome: 'Maria', papel: 'Tradutor' });
        assert.deepEqual(separarNomeEPapel('Maria'), { nome: 'Maria', papel: '' });
        assert.deepEqual(separarNomeEPapel('@Tradutor'), { nome: '', papel: 'Tradutor' });
        assert.deepEqual(separarNomeEPapel('Maria@'), { nome: 'Maria', papel: '' });
    });
});

describe('prefixos', () => {
    it('o mapa tem os canônicos e os apelidos', () => {
        PREFIXOS_CANONICOS_LIVRO.forEach((p) => assert.ok(CAMPOS_ATRIBUTO_LIVRO[p], p));
        assert.equal(CAMPOS_ATRIBUTO_LIVRO.colaborador, 'equipe');
    });
});

describe('busca solta (a de antes)', () => {
    it('consulta vazia não filtra', () => {
        assert.deepEqual(ids(''), [1, 2, 3, 4]);
        assert.deepEqual(ids('   '), [1, 2, 3, 4]);
    });
    it('título, sigla, autoria e equipe, sem caixa nem acento', () => {
        assert.deepEqual(ids('casmurro'), [1]);
        assert.deepEqual(ids('dc'), [1]);
        assert.deepEqual(ids('COLETANEA'), [3]);
        assert.deepEqual(ids('joao'), [2]);
        assert.deepEqual(ids('capista'), [1]);
        assert.deepEqual(ids('revisor'), [2]);
    });
    it('ISBN com ou sem hífen; letra solta não casa ISBN', () => {
        assert.deepEqual(ids('9788512345678'), [1]);
        assert.deepEqual(ids('978-85'), [1]);
        assert.deepEqual(ids('8512345679'), [3]);
        assert.deepEqual(ids('x'), []);
    });
    it('palavras separadas valem E', () => {
        assert.deepEqual(ids('dom casmurro'), [1]);
        assert.deepEqual(ids('dom poemas'), []);
    });
});

describe('autor:', () => {
    it('um autor, por trecho do nome', () => {
        assert.deepEqual(ids('autor:Maria'), [1, 2, 3]);
        assert.deepEqual(ids('autor:pereira'), [2]);
    });
    it('ou entre dois autores', () => {
        assert.deepEqual(ids('autor:Pedro ou autor:João'), [2, 3]);
    });
    it('exclusão', () => {
        assert.deepEqual(ids('autor:Maria -autor:Pedro'), [1, 2]);
        assert.deepEqual(ids('-autor:Maria'), [4]);
    });
    it('presença: com e sem autoria', () => {
        assert.deepEqual(ids('autor:*'), [1, 2, 3]);
        assert.deepEqual(ids('-autor:*'), [4]);
    });
    it('frase exata com espaço', () => {
        assert.deepEqual(ids('autor:"Maria Silva"'), [1, 2, 3]);
        assert.deepEqual(ids('autor:"Silva Maria"'), []);
    });
    it('termo vazio (digitando) não filtra', () => {
        assert.deepEqual(ids('autor:'), [1, 2, 3, 4]);
    });
});

describe('papel:', () => {
    it('qualquer pessoa com o papel', () => {
        assert.deepEqual(ids('papel:Tradutor'), [2, 3]);
    });
    it('palavra inteira: Autor não acha Coautor', () => {
        assert.deepEqual(ids('papel:Autor'), [1, 2, 3]);
        assert.deepEqual(ids('papel:Coautor'), [3]);
        // livro 3 só aparece por causa de Maria (Autor), não de Pedro (Coautor)
        assert.deepEqual(ids('autor:Pedro@Autor'), []);
    });
    it('termos soltos são independentes', () => {
        // Maria é autora no 1, e há tradutor (Maria) nos 2 e 3; no 1 não há tradutor
        assert.deepEqual(ids('autor:Pedro papel:Tradutor'), [3]);
        assert.deepEqual(ids('autor:João papel:Tradutor'), [2]);
    });
    it('presença e exclusão', () => {
        assert.deepEqual(ids('papel:*'), [1, 2, 3]);
        assert.deepEqual(ids('-papel:Tradutor'), [1, 4]);
    });
});

describe('vínculo autor@papel', () => {
    it('a pessoa COM o papel no mesmo livro', () => {
        assert.deepEqual(ids('autor:Maria@Tradutor'), [2, 3]);
        assert.deepEqual(ids('autor:João@Tradutor'), []);
        // João só é Autor no 2, onde quem traduz é a Maria: termos soltos casam, vínculo não
        assert.deepEqual(ids('autor:João papel:Tradutor'), [2]);
    });
    it('entre aspas, com espaço no nome', () => {
        assert.deepEqual(ids('autor:"Maria Silva@Tradutor"'), [2, 3]);
    });
    it('só @papel vale qualquer pessoa; só nome@ vale qualquer papel', () => {
        assert.deepEqual(ids('autor:@Coautor'), [3]);
        assert.deepEqual(ids('autor:Pedro@'), [3]);
    });
    it('exclusão por vínculo', () => {
        assert.deepEqual(ids('autor:Maria -autor:Maria@Tradutor'), [1]);
    });
});

describe('equipe: e papelequipe:', () => {
    it('equipe por nome', () => {
        assert.deepEqual(ids('equipe:Ana'), [1]);
        assert.deepEqual(ids('colaborador:Bia'), [2]);
    });
    it('papelequipe', () => {
        assert.deepEqual(ids('papelequipe:Capista'), [1]);
        assert.deepEqual(ids('papelequipe:Revisor'), [2]);
        assert.deepEqual(ids('papelequipe:Capa'), []); // escopo não é papel
    });
    it('vínculo equipe@papel', () => {
        assert.deepEqual(ids('equipe:Ana@Capista'), [1]);
        assert.deepEqual(ids('equipe:Ana@Revisor'), []);
        assert.deepEqual(ids('equipe:Bia@Capista'), []);
    });
    it('presença: com e sem equipe', () => {
        assert.deepEqual(ids('equipe:*'), [1, 2]);
        assert.deepEqual(ids('-equipe:*'), [3, 4]);
        assert.deepEqual(ids('papelequipe:*'), [1, 2]);
    });
});

describe('combinações', () => {
    it('mistura solta, autor e equipe', () => {
        assert.deepEqual(ids('autor:Maria equipe:Ana'), [1]);
        assert.deepEqual(ids('traduzidos autor:Maria@Tradutor'), [2]);
    });
    it('autor ou equipe', () => {
        assert.deepEqual(ids('equipe:Ana ou equipe:Bia'), [1, 2]);
    });
    it('cadastro apagado: vínculo órfão é ignorado', () => {
        const l = { id: 9, titulo: 'X', autoriaLivro: [{ autorId: 99, papeis: ['Autor'] }] };
        assert.equal(livroCombinaComConsulta(l, 'autor:*', AUTORES, COLABS), false);
        assert.equal(livroCombinaComConsulta(l, '-autor:*', AUTORES, COLABS), true);
    });
    it('mantém a ordem de entrada', () => {
        const invertida = [...LIVROS].reverse();
        assert.deepEqual(
            filtrarLivrosPorConsulta(invertida, 'autor:Maria', AUTORES, COLABS).map((l) => l.id),
            [3, 2, 1],
        );
    });
});

describe('aspas só no nome ou só no papel', () => {
    const AUT = [{ id: 1, nome: 'Victor Leme' }];
    const COL = [
        { id: 10, nome: 'Victor Leme' },
        { id: 11, nome: 'Ana Souza' },
    ];
    const LV = [
        {
            id: 1,
            titulo: 'A',
            autoriaLivro: [{ autorId: 1, papeis: ['Autor'] }],
            equipeLivro: [
                {
                    colaboradorId: 10,
                    papeis: [{ papel: 'Ilustrador' }, { papel: 'Ilustrador de capa' }],
                },
            ],
        },
        {
            id: 2,
            titulo: 'B',
            equipeLivro: [{ colaboradorId: 11, papeis: [{ papel: 'Ilustrador' }] }],
        },
    ];
    const achar = (q) => filtrarLivrosPorConsulta(LV, q, AUT, COL).map((l) => l.id);

    it('juntarVinculosComAspas refaz um termo só', () => {
        assert.equal(juntarVinculosComAspas('equipe:"A B"@Cap'), 'equipe:"A B@Cap"');
        assert.equal(juntarVinculosComAspas('equipe:Ana@"X Y"'), 'equipe:"Ana@X Y"');
        assert.equal(juntarVinculosComAspas('-equipe:"A B"@"X Y"'), '-equipe:"A B@X Y"');
        assert.equal(juntarVinculosComAspas('dom casmurro'), 'dom casmurro');
    });
    it('equipe:"Nome Com Espaço"@Papel', () => {
        assert.deepEqual(achar('equipe:"Victor Leme"@Ilustrador'), [1]);
        assert.deepEqual(achar('equipe:"Victor Leme"@Revisor'), []);
        assert.deepEqual(achar('-equipe:"Victor Leme"@Ilustrador'), [2]);
    });
    it('papel com espaço entre aspas', () => {
        assert.deepEqual(achar('equipe:Victor@"Ilustrador de capa"'), [1]);
        assert.deepEqual(achar('equipe:"Victor Leme"@"Ilustrador de capa"'), [1]);
    });
    it('sem prefixo, "Nome"@Papel vale na autoria ou na equipe', () => {
        assert.deepEqual(achar('"Victor Leme"@Ilustrador'), [1]);
        assert.deepEqual(achar('"Victor Leme"@Autor'), [1]);
        assert.deepEqual(achar('"Victor Leme"@Revisor'), []);
    });
});
