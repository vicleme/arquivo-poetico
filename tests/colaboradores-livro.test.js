import './helpers/dom-real.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const {
    PAPEIS_EQUIPE_LIVRO,
    ESCOPOS_EQUIPE_SUGERIDOS,
    papelEquipeDaLista,
    papelEquipeEhOutro,
    normalizarPapelEquipe,
    normalizarPapeisEquipe,
    textoPapelEquipe,
    normalizarEquipeLivro,
    equipeDoLivro,
    camposEquipeLivro,
    pendenciasDaEquipe,
    papeisEquipeLivresUsados,
    escoposEquipeSugeridos,
    normalizarPapeisHabituais,
    normalizarColaborador,
    colaboradorComNome,
    colaboradorPorId,
    colaboradoresOrdenados,
    paresEquipeLivro,
    textoEquipeLivro,
    equipeLivroPorNome,
    livrosDoColaborador,
    livroTemColaborador,
    colaboradoresDosLivros,
    papeisEquipeNosLivros,
    trabalhosDoColaborador,
    impactoExclusaoColaboradorNosLivros,
    removerColaboradorDosLivros,
    restaurarColaboradorNosLivros,
    colaboradoresDoAutor,
    desligarAutorDosColaboradores,
    religarAutorAosColaboradores,
} = await import('../js/colaboradores-livro.js');

const colaboradores = () => [
    { id: 1, nome: 'Ana Souza', papeisHabituais: ['Capista'], contato: '' },
    { id: 2, nome: 'Bruno Lima', papeisHabituais: [], contato: '' },
    { id: 3, nome: 'Carla Dias', papeisHabituais: [], contato: '', autorId: 9 },
];

describe('papéis da equipe do livro', () => {
    it('a lista fechada tem os sete papéis combinados', () => {
        assert.deepEqual(PAPEIS_EQUIPE_LIVRO, [
            'Capista',
            'Ilustrador',
            'Diagramador',
            'Revisor',
            'Preparador de texto',
            'Editor',
            'Fotógrafo',
        ]);
    });

    it('as sugestões de escopo são as combinadas', () => {
        assert.deepEqual(ESCOPOS_EQUIPE_SUGERIDOS, [
            'Capa',
            'Miolo',
            'Capa e miolo',
            'Capitulares',
            'Encarte',
        ]);
    });

    it('reconhece papel da lista ignorando caixa e acento', () => {
        assert.equal(papelEquipeDaLista('fotografo'), 'Fotógrafo');
        assert.equal(papelEquipeDaLista('  PREPARADOR   de texto '), 'Preparador de texto');
        assert.equal(papelEquipeDaLista('Tradutor'), null);
        assert.equal(papelEquipeEhOutro('Tradutor'), true);
        assert.equal(papelEquipeEhOutro('revisor'), false);
    });

    it('papel limpo usa a grafia da lista e só tem escopo quando há', () => {
        assert.deepEqual(normalizarPapelEquipe('revisor'), { papel: 'Revisor' });
        assert.deepEqual(normalizarPapelEquipe({ papel: 'ilustrador', escopo: '  Capa ' }), {
            papel: 'Ilustrador',
            escopo: 'Capa',
        });
        assert.deepEqual(normalizarPapelEquipe({ papel: 'Revisor', escopo: '   ' }), {
            papel: 'Revisor',
        });
        assert.deepEqual(normalizarPapelEquipe('Tipógrafo  artesanal'), {
            papel: 'Tipógrafo artesanal',
        });
    });

    it('papel vazio, só "Outro" ou que não é texto nem objeto sai', () => {
        assert.equal(normalizarPapelEquipe(''), null);
        assert.equal(normalizarPapelEquipe('Outro'), null);
        assert.equal(normalizarPapelEquipe({ escopo: 'Capa' }), null);
        assert.equal(normalizarPapelEquipe(null), null);
        assert.equal(normalizarPapelEquipe(42), null);
    });

    it('mesmo papel com escopos diferentes convive; igual some', () => {
        assert.deepEqual(
            normalizarPapeisEquipe([
                { papel: 'Ilustrador', escopo: 'Capa' },
                { papel: 'ilustrador', escopo: 'Miolo' },
                { papel: 'Ilustrador', escopo: 'capa' },
                'Revisor',
                'revisor',
            ]),
            [
                { papel: 'Ilustrador', escopo: 'Capa' },
                { papel: 'Ilustrador', escopo: 'Miolo' },
                { papel: 'Revisor' },
            ],
        );
        assert.deepEqual(normalizarPapeisEquipe('Revisor'), []);
    });

    it('o texto do papel junta o escopo com dois-pontos', () => {
        assert.equal(
            textoPapelEquipe({ papel: 'Revisor', escopo: 'de provas' }),
            'Revisor: de provas',
        );
        assert.equal(textoPapelEquipe({ papel: 'Editor' }), 'Editor');
    });
});

describe('equipe do livro', () => {
    it('livro sem o campo, ou com o campo quebrado, tem equipe vazia', () => {
        assert.deepEqual(equipeDoLivro({}), []);
        assert.deepEqual(equipeDoLivro(null), []);
        assert.deepEqual(equipeDoLivro({ equipeLivro: 'x' }), []);
    });

    it('vínculo sem colaboradorId sai; o mesmo Colaborador vira um só', () => {
        const equipe = normalizarEquipeLivro([
            { colaboradorId: 1, papeis: ['Capista'] },
            { papeis: ['Revisor'] },
            null,
            { colaboradorId: 2, papeis: ['Editor'] },
            { colaboradorId: '1', papeis: [{ papel: 'Revisor', escopo: 'de provas' }, 'capista'] },
        ]);
        assert.deepEqual(equipe, [
            {
                colaboradorId: 1,
                papeis: [{ papel: 'Capista' }, { papel: 'Revisor', escopo: 'de provas' }],
            },
            { colaboradorId: 2, papeis: [{ papel: 'Editor' }] },
        ]);
    });

    it('vínculo com lista de papéis vazia é mantido (o formulário é quem exige)', () => {
        assert.deepEqual(normalizarEquipeLivro([{ colaboradorId: 1, papeis: [] }]), [
            { colaboradorId: 1, papeis: [] },
        ]);
    });

    it('a chave só existe quando há vínculo', () => {
        assert.deepEqual(camposEquipeLivro([]), {});
        assert.deepEqual(camposEquipeLivro(undefined), {});
        assert.deepEqual(camposEquipeLivro([{ colaboradorId: 1, papeis: ['Editor'] }]), {
            equipeLivro: [{ colaboradorId: 1, papeis: [{ papel: 'Editor' }] }],
        });
    });

    it('aponta vínculos sem papel, que o formulário recusa', () => {
        assert.deepEqual(
            pendenciasDaEquipe([
                { colaboradorId: 1, papeis: ['Editor'] },
                { colaboradorId: 2, papeis: [] },
                { colaboradorId: 3, papeis: ['Outro', ' '] },
                { papeis: [] },
            ]),
            { semPapel: [2, 3] },
        );
        assert.deepEqual(pendenciasDaEquipe(undefined), { semPapel: [] });
    });

    it('papéis livres usados: só os de fora da lista, sem repetir, em ordem', () => {
        const livros = [
            {
                equipeLivro: [
                    { colaboradorId: 1, papeis: ['Revisor', 'Tipógrafo'] },
                    { colaboradorId: 2, papeis: ['Arte-finalista'] },
                ],
            },
            { equipeLivro: [{ colaboradorId: 1, papeis: ['tipografo', 'Capista'] }] },
            {},
        ];
        assert.deepEqual(papeisEquipeLivresUsados(livros), ['Arte-finalista', 'Tipógrafo']);
    });

    it('escopos sugeridos: os fixos primeiro, depois os já digitados', () => {
        const livros = [
            {
                equipeLivro: [
                    {
                        colaboradorId: 1,
                        papeis: [
                            { papel: 'Revisor', escopo: 'de provas' },
                            { papel: 'Fotógrafo', escopo: 'capa' },
                            { papel: 'Editor', escopo: 'De texto' },
                        ],
                    },
                ],
            },
            {
                equipeLivro: [
                    { colaboradorId: 2, papeis: [{ papel: 'Revisor', escopo: 'DE PROVAS' }] },
                ],
            },
        ];
        assert.deepEqual(escoposEquipeSugeridos(livros), [
            ...ESCOPOS_EQUIPE_SUGERIDOS,
            'de provas',
            'De texto',
        ]);
        assert.deepEqual(escoposEquipeSugeridos([]), ESCOPOS_EQUIPE_SUGERIDOS);
    });
});

describe('cadastro de Colaboradores', () => {
    it('papéis habituais: texto, sem vazio nem repetido, grafia da lista', () => {
        assert.deepEqual(
            normalizarPapeisHabituais([
                'capista',
                ' Capista ',
                '',
                'Outro',
                'Tipógrafo',
                { papel: 'revisor' },
            ]),
            ['Capista', 'Tipógrafo', 'Revisor'],
        );
        assert.deepEqual(normalizarPapeisHabituais(undefined), []);
    });

    it('colaborador limpo: nome arrumado, lista e contato sempre presentes', () => {
        assert.deepEqual(normalizarColaborador({ id: 5, nome: '  Ana   Souza ' }), {
            id: 5,
            nome: 'Ana Souza',
            papeisHabituais: [],
            contato: '',
        });
        assert.deepEqual(
            normalizarColaborador({
                id: 5,
                nome: 'Ana',
                papeisHabituais: ['revisor'],
                contato: ' https://a.com ',
                autorId: 3,
            }),
            {
                id: 5,
                nome: 'Ana',
                papeisHabituais: ['Revisor'],
                contato: 'https://a.com',
                autorId: 3,
            },
        );
    });

    it('autorId vazio ou ausente não vira chave', () => {
        assert.equal('autorId' in normalizarColaborador({ nome: 'A', autorId: '' }), false);
        assert.equal('autorId' in normalizarColaborador({ nome: 'A', autorId: null }), false);
        assert.equal('autorId' in normalizarColaborador(null), false);
    });

    it('acha nome repetido ignorando caixa, acento e espaços, e a edição não bate em si', () => {
        const lista = colaboradores();
        assert.equal(colaboradorComNome(lista, ' ANA  souza')?.id, 1);
        assert.equal(colaboradorComNome(lista, 'Ana Souza', 1), null);
        assert.equal(colaboradorComNome(lista, 'Ana Souza', '2')?.id, 1);
        assert.equal(colaboradorComNome(lista, '   '), null);
        assert.equal(colaboradorComNome(lista, 'Inexistente'), null);
        assert.equal(colaboradorComNome(undefined, 'Ana'), null);
    });

    it('acha por id (número ou texto) e ordena por nome', () => {
        const lista = colaboradores();
        assert.equal(colaboradorPorId(lista, '2').nome, 'Bruno Lima');
        assert.equal(colaboradorPorId(lista, 99), null);
        assert.equal(colaboradorPorId(lista, null), null);
        assert.deepEqual(
            colaboradoresOrdenados([{ nome: 'Édson' }, { nome: 'Ana' }, { nome: 'Bia' }]).map(
                (c) => c.nome,
            ),
            ['Ana', 'Bia', 'Édson'],
        );
    });
});

describe('leitura da equipe', () => {
    const livro = {
        id: 10,
        equipeLivro: [
            {
                colaboradorId: 2,
                papeis: [{ papel: 'Diagramador' }],
            },
            {
                colaboradorId: 1,
                papeis: [{ papel: 'Capista', escopo: 'Capa' }, { papel: 'Revisor' }],
            },
            { colaboradorId: 99, papeis: [{ papel: 'Editor' }] },
        ],
    };

    it('pares usam o cadastro e ignoram quem não existe mais', () => {
        const pares = paresEquipeLivro(livro, colaboradores());
        assert.deepEqual(
            pares.map((p) => p.colaborador.nome),
            ['Bruno Lima', 'Ana Souza'],
        );
    });

    it('texto de uma linha, na ordem dos vínculos', () => {
        assert.equal(
            textoEquipeLivro(livro, colaboradores()),
            'Bruno Lima (Diagramador); Ana Souza (Capista: Capa, Revisor)',
        );
        assert.equal(textoEquipeLivro({}, colaboradores()), '');
    });

    it('saída por nome não leva id e copia os papéis', () => {
        const saida = equipeLivroPorNome(livro, colaboradores());
        assert.deepEqual(saida, [
            { colaborador: 'Bruno Lima', papeis: [{ papel: 'Diagramador' }] },
            {
                colaborador: 'Ana Souza',
                papeis: [{ papel: 'Capista', escopo: 'Capa' }, { papel: 'Revisor' }],
            },
        ]);
        saida[1].papeis[0].escopo = 'mudou';
        assert.equal(livro.equipeLivro[1].papeis[0].escopo, 'Capa');
    });

    it('livros do colaborador, com id em número ou texto', () => {
        const livros = [
            livro,
            { id: 11 },
            { id: 12, equipeLivro: [{ colaboradorId: 1, papeis: [] }] },
        ];
        assert.deepEqual(
            livrosDoColaborador(livros, '1').map((l) => l.id),
            [10, 12],
        );
        assert.deepEqual(livrosDoColaborador(livros, 5), []);
        assert.deepEqual(livrosDoColaborador(undefined, 1), []);
    });

    it('livro tem o colaborador, com papel opcional que ignora o escopo', () => {
        assert.equal(livroTemColaborador(livro, 1), true);
        assert.equal(livroTemColaborador(livro, 1, 'capista'), true);
        assert.equal(livroTemColaborador(livro, 1, 'Diagramador'), false);
        assert.equal(livroTemColaborador(livro, 7), false);
    });

    it('colaboradores dos livros: só quem existe, em ordem, sem repetir', () => {
        const livros = [livro, { equipeLivro: [{ colaboradorId: 1, papeis: [] }] }];
        assert.deepEqual(
            colaboradoresDosLivros(livros, colaboradores()).map((c) => c.id),
            [1, 2],
        );
    });

    it('papéis nos livros: os da lista na ordem dela, depois os livres', () => {
        const livros = [
            {
                equipeLivro: [
                    { colaboradorId: 1, papeis: ['Revisor', 'Tipógrafo'] },
                    { colaboradorId: 2, papeis: ['Capista'] },
                ],
            },
        ];
        assert.deepEqual(papeisEquipeNosLivros(livros), ['Capista', 'Revisor', 'Tipógrafo']);
        assert.deepEqual(papeisEquipeNosLivros([]), []);
    });

    it('tudo o que fulano fez: um item por livro, com os papéis dele', () => {
        const livros = [
            livro,
            { id: 11 },
            { id: 12, equipeLivro: [{ colaboradorId: 1, papeis: ['Editor'] }] },
        ];
        const trabalhos = trabalhosDoColaborador(livros, 1);
        assert.deepEqual(
            trabalhos.map((t) => t.livro.id),
            [10, 12],
        );
        assert.deepEqual(trabalhos[0].papeis, [
            { papel: 'Capista', escopo: 'Capa' },
            { papel: 'Revisor' },
        ]);
        assert.deepEqual(trabalhos[1].papeis, [{ papel: 'Editor' }]);
    });
});

describe('exclusão de Colaborador com Desfazer', () => {
    const montar = () => ({
        livros: [
            {
                id: 10,
                titulo: 'A',
                equipeLivro: [
                    { colaboradorId: 2, papeis: [{ papel: 'Diagramador' }] },
                    { colaboradorId: 1, papeis: [{ papel: 'Capista', escopo: 'Capa' }] },
                    { colaboradorId: 3, papeis: [{ papel: 'Editor' }] },
                ],
            },
            {
                id: 11,
                titulo: 'B',
                equipeLivro: [{ colaboradorId: 1, papeis: [{ papel: 'Revisor' }] }],
            },
            { id: 12, titulo: 'C' },
            {
                id: 13,
                titulo: 'D',
                equipeLivro: [{ colaboradorId: 2, papeis: [{ papel: 'Editor' }] }],
            },
        ],
    });

    it('o impacto conta os livros em que ele consta', () => {
        assert.deepEqual(impactoExclusaoColaboradorNosLivros(montar(), 1), { livrosIds: [10, 11] });
        assert.deepEqual(impactoExclusaoColaboradorNosLivros(montar(), 77), { livrosIds: [] });
    });

    it('remover tira dos livros, o livro fica e a chave some quando a equipe zera', () => {
        const dbRef = montar();
        const removidos = removerColaboradorDosLivros(dbRef, 1);
        assert.equal(removidos.length, 2);
        assert.equal(dbRef.livros.length, 4);
        assert.deepEqual(
            dbRef.livros[0].equipeLivro.map((v) => v.colaboradorId),
            [2, 3],
        );
        assert.equal('equipeLivro' in dbRef.livros[1], false);
        assert.deepEqual(dbRef.livros[3].equipeLivro.length, 1);
    });

    it('restaurar devolve a entrada com papéis, escopo e na mesma posição', () => {
        const dbRef = montar();
        const antes = JSON.stringify(dbRef);
        const removidos = removerColaboradorDosLivros(dbRef, 1);
        restaurarColaboradorNosLivros(dbRef, removidos);
        assert.equal(JSON.stringify(dbRef), antes);
    });

    it('restaurar duas vezes não duplica; livro apagado no meio é ignorado', () => {
        const dbRef = montar();
        const removidos = removerColaboradorDosLivros(dbRef, 1);
        dbRef.livros = dbRef.livros.filter((l) => l.id !== 11);
        restaurarColaboradorNosLivros(dbRef, removidos);
        restaurarColaboradorNosLivros(dbRef, removidos);
        assert.equal(dbRef.livros[0].equipeLivro.filter((v) => v.colaboradorId === 1).length, 1);
        assert.equal(
            dbRef.livros.some((l) => l.id === 11),
            false,
        );
    });

    it('remover um Colaborador que não está em nenhum livro não muda nada', () => {
        const dbRef = montar();
        const antes = JSON.stringify(dbRef);
        assert.deepEqual(removerColaboradorDosLivros(dbRef, 77), []);
        assert.equal(JSON.stringify(dbRef), antes);
    });
});

describe('vínculo opcional com o Autor (F19-D13)', () => {
    it('acha os Colaboradores ligados a um Autor', () => {
        assert.deepEqual(
            colaboradoresDoAutor(colaboradores(), '9').map((c) => c.id),
            [3],
        );
        assert.deepEqual(colaboradoresDoAutor(colaboradores(), 5), []);
        assert.deepEqual(colaboradoresDoAutor(colaboradores(), null), []);
        assert.deepEqual(colaboradoresDoAutor(undefined, 9), []);
    });

    it('excluir o Autor desliga o Colaborador, que fica, e o Desfazer religa', () => {
        const dbRef = { colaboradores: colaboradores() };
        const antes = JSON.stringify(dbRef);
        const desligados = desligarAutorDosColaboradores(dbRef, 9);
        assert.deepEqual(desligados, [{ colaboradorId: 3, autorId: 9 }]);
        assert.equal(dbRef.colaboradores.length, 3);
        assert.equal('autorId' in dbRef.colaboradores[2], false);
        religarAutorAosColaboradores(dbRef, desligados);
        assert.equal(JSON.stringify(dbRef), antes);
    });

    it('religar não sobrescreve um vínculo novo nem acha quem sumiu', () => {
        const dbRef = { colaboradores: colaboradores() };
        const desligados = desligarAutorDosColaboradores(dbRef, 9);
        dbRef.colaboradores[2].autorId = 4;
        religarAutorAosColaboradores(dbRef, [...desligados, { colaboradorId: 99, autorId: 9 }]);
        assert.equal(dbRef.colaboradores[2].autorId, 4);
    });
});
