// Importar campos por .json, extras da entrega 3: territorialidade, local de
// escrita, pessoas com papéis e campos simples (pendência e fonte).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { criarLocal } from '../js/locais.js';
import { PAPEIS_PESSOA } from '../js/utils.js';
import { papelDePessoaPorRotulo } from '../js/importar-campos-extras.js';
import {
    lerArquivoDeCampos,
    executarImportacaoCampos,
    preverImportacaoCampos,
} from '../js/importar-campos.js';

function texto(id, titulo, extra = {}) {
    return {
        id,
        titulo,
        temas: [],
        assuntosPapel: [],
        assuntosExcluidos: [],
        territorialidade: [],
        sinalizacoesTerritorialidade: '',
        localEscrita: null,
        pessoas: [],
        pendencia: '',
        fonteTexto: null,
        ...extra,
    };
}

function montar() {
    const dbRef = {
        poemas: [texto(1, 'Olhar Lírico'), texto(2, 'Caveira')],
        prosas: [texto(10, 'Crônica Azul')],
        temas: [],
        etiquetas: [],
        assuntos: [],
        locais: [],
        pessoas: [
            {
                id: 500,
                nome: 'Dani',
                grupoIds: [],
                autorIds: [],
                genero: '',
                identidadeCisTrans: '',
                corRaca: '',
                oculto: false,
            },
        ],
    };
    criarLocal(dbRef, { nome: 'Brasil', tipo: 'País' });
    return dbRef;
}

const entradas = (payload) => lerArquivoDeCampos(payload).entradas;
const nomesLocais = (dbRef, ids) =>
    ids.map((id) => dbRef.locais.find((l) => String(l.id) === String(id)).nome);

describe('papéis de pessoa', () => {
    it('aceita com ou sem (a), no feminino e sem acento', () => {
        assert.equal(papelDePessoaPorRotulo('Retratado(a)'), 'Retratado(a)');
        assert.equal(papelDePessoaPorRotulo('retratada'), 'Retratado(a)');
        assert.equal(papelDePessoaPorRotulo('Dedicatário'), 'Dedicatário(a)');
        assert.equal(papelDePessoaPorRotulo('dedicataria'), 'Dedicatário(a)');
        assert.equal(papelDePessoaPorRotulo('Inspiração'), 'Inspiração para');
        assert.equal(papelDePessoaPorRotulo('inspiracao para'), 'Inspiração para');
        assert.equal(papelDePessoaPorRotulo('Aludida'), 'Aludido(a)');
        assert.equal(
            papelDePessoaPorRotulo('associado retroativamente'),
            'Associado(a) retroativamente',
        );
        assert.equal(papelDePessoaPorRotulo('Padrinho'), null);
    });

    it('todo papel da lista fechada se reconhece pelo próprio rótulo', () => {
        PAPEIS_PESSOA.forEach((p) => assert.equal(papelDePessoaPorRotulo(p), p));
    });
});

describe('leitura dos extras', () => {
    it('lê territorialidade, local de escrita, pessoas, pendência e fonte', () => {
        const [e] = entradas({
            textos: [
                {
                    titulo: 'x',
                    territorialidade: ['Brasil', ' Santos ', { local: 'Rio Tietê' }],
                    local_escrita: 'Santos',
                    pessoas: [
                        { pessoa: 'Dani', papeis: ['dedicatário', 'Retratada'] },
                        'Gab',
                        { nome: 'Sam', papel: 'Mencionado(a)' },
                    ],
                    pendencia: ' revisar  métrica ',
                    fonte: {
                        origem: 'Obra própria',
                        edicao: '1ª',
                        link: 'https://x.org',
                        conferido: 'sim',
                        grafia: 'Etimologica',
                    },
                },
            ],
        });
        assert.deepEqual(e.territorialidade, ['Brasil', 'Santos', 'Rio Tietê']);
        assert.equal(e.localEscrita, 'Santos');
        assert.deepEqual(e.pessoas, [
            { nome: 'Dani', papeis: ['Dedicatário(a)', 'Retratado(a)'] },
            { nome: 'Gab', papeis: [] },
            { nome: 'Sam', papeis: ['Mencionado(a)'] },
        ]);
        assert.deepEqual(
            e.simples.map((s) => [s.chave, s.valor]),
            [
                ['pendencia', 'revisar métrica'],
                ['fonteOrigem', 'Obra própria'],
                ['fonteEdicao', '1ª'],
                ['fonteLink', 'https://x.org'],
                ['fonteConferido', true],
                ['fonteGrafia', 'etimológica'],
            ],
        );
        assert.deepEqual(e.problemas, []);
    });

    it('fonte em texto solto vale como origem; valores vazios e conferido falso são ignorados', () => {
        const [a, b] = entradas({
            textos: [
                { titulo: 'a', fonte: 'Wikisource' },
                { titulo: 'b', pendencia: '', fonte: { origem: '', conferido: false } },
            ],
        });
        assert.deepEqual(a.simples, [{ chave: 'fonteOrigem', valor: 'Wikisource' }]);
        assert.deepEqual(b.simples, []);
    });

    it('registra problemas sem derrubar o resto da entrada', () => {
        const [e] = entradas({
            textos: [
                {
                    titulo: 'x',
                    territorialidade: 5,
                    localEscrita: ['A', 'B'],
                    pessoas: [{ pessoa: 'Dani', papeis: ['Padrinho'] }, { pessoa: 'Gab' }],
                    fonte: { conferido: 'talvez', grafia: 'moderna' },
                },
            ],
        });
        assert.deepEqual(
            e.problemas.map((p) => p.motivo),
            [
                'mais-de-um-local-de-escrita',
                'formato-invalido',
                'papel-pessoa-invalido',
                'valor-invalido',
                'valor-invalido',
            ],
        );
        assert.equal(e.localEscrita, null);
        assert.deepEqual(e.pessoas, [{ nome: 'Gab', papeis: [] }]);
    });
});

describe('territorialidade e local de escrita', () => {
    it('soma Locais, cria o que falta e mantém o espelho coerente', () => {
        const dbRef = montar();
        const antes = dbRef.locais.length;
        const r = executarImportacaoCampos(
            dbRef,
            entradas({ textos: [{ id: 1, territorialidade: ['brasil', 'Santos'] }] }),
        );
        const item = dbRef.poemas[0];
        assert.deepEqual(nomesLocais(dbRef, item.territorialidade), ['Brasil', 'Santos']);
        assert.equal(item.sinalizacoesTerritorialidade, 'Brasil, Santos');
        assert.equal(dbRef.locais.length, antes + 1);
        assert.deepEqual(r.cadastroNovo.locais, ['Santos']);
        assert.equal(r.resumo.vinculosLocal, 2);
        assert.equal(r.resumo.alterados, 1);
    });

    it('não repete Local que o texto já cita nem tira os que já tinha', () => {
        const dbRef = montar();
        executarImportacaoCampos(
            dbRef,
            entradas({ textos: [{ id: 1, territorialidade: ['Santos'] }] }),
        );
        const r = executarImportacaoCampos(
            dbRef,
            entradas({ textos: [{ id: 1, territorialidade: ['Brasil', 'Santos'] }] }),
        );
        assert.deepEqual(nomesLocais(dbRef, dbRef.poemas[0].territorialidade), [
            'Santos',
            'Brasil',
        ]);
        assert.equal(r.itens[0].jaTinha.locais.length, 1);
        assert.equal(r.itens[0].adicionados.locais.length, 1);
    });

    it('local de escrita preenche o vazio e só troca com a opção ligada', () => {
        const dbRef = montar();
        const um = executarImportacaoCampos(
            dbRef,
            entradas({ textos: [{ id: 1, localEscrita: 'Santos' }] }),
        );
        assert.equal(nomesLocais(dbRef, [dbRef.poemas[0].localEscrita])[0], 'Santos');
        assert.equal(um.itens[0].camposSimples[0].acao, 'preenchido');
        assert.deepEqual(um.cadastroNovo.locais, ['Santos']);

        const dois = executarImportacaoCampos(
            dbRef,
            entradas({ textos: [{ id: 1, localEscrita: 'Brasil' }] }),
        );
        assert.equal(dois.itens[0].camposSimples[0].acao, 'mantido');
        assert.equal(dois.itens[0].mudou, false);
        assert.equal(nomesLocais(dbRef, [dbRef.poemas[0].localEscrita])[0], 'Santos');

        const tres = executarImportacaoCampos(
            dbRef,
            entradas({ textos: [{ id: 1, localEscrita: 'Brasil' }] }),
            { substituirCamposSimples: true },
        );
        assert.equal(tres.itens[0].camposSimples[0].acao, 'substituido');
        assert.equal(nomesLocais(dbRef, [dbRef.poemas[0].localEscrita])[0], 'Brasil');
    });
});

describe('pessoas com papéis', () => {
    it('vincula Pessoa existente, cria a nova e ordena os papéis pela hierarquia', () => {
        const dbRef = montar();
        const r = executarImportacaoCampos(
            dbRef,
            entradas({
                textos: [
                    {
                        id: 1,
                        pessoas: [
                            { pessoa: 'dani', papeis: ['Mencionado(a)', 'Retratado(a)'] },
                            { pessoa: 'Gab', papeis: ['Dedicatário(a)'] },
                        ],
                    },
                ],
            }),
        );
        const item = dbRef.poemas[0];
        assert.equal(item.pessoas.length, 2);
        assert.deepEqual(item.pessoas[0], {
            pessoaId: 500,
            papeis: ['Retratado(a)', 'Mencionado(a)'],
        });
        const gab = dbRef.pessoas.find((p) => p.nome === 'Gab');
        assert.ok(gab);
        assert.equal(gab.oculto, false);
        assert.deepEqual(r.cadastroNovo.pessoas, ['Gab']);
        assert.equal(dbRef.pessoas.filter((p) => p.nome === 'Dani').length, 1);
    });

    it('soma só os papéis que faltam numa pessoa já vinculada', () => {
        const dbRef = montar();
        dbRef.poemas[0].pessoas = [{ pessoaId: 500, papeis: ['Mencionado(a)'] }];
        const r = executarImportacaoCampos(
            dbRef,
            entradas({
                textos: [
                    {
                        id: 1,
                        pessoas: [{ pessoa: 'Dani', papeis: ['Mencionado(a)', 'Aludido(a)'] }],
                    },
                ],
            }),
        );
        assert.deepEqual(dbRef.poemas[0].pessoas[0].papeis, ['Mencionado(a)', 'Aludido(a)']);
        assert.deepEqual(r.itens[0].papeisPessoa, [{ nome: 'Dani', papeis: ['Aludido(a)'] }]);
        assert.equal(r.resumo.papeisPessoa, 1);

        const de_novo = executarImportacaoCampos(
            dbRef,
            entradas({
                textos: [{ id: 1, pessoas: [{ pessoa: 'Dani', papeis: ['Aludido(a)'] }] }],
            }),
        );
        assert.equal(de_novo.itens[0].mudou, false);
        assert.equal(de_novo.itens[0].jaTinha.pessoas.length, 1);
    });
});

describe('campos simples', () => {
    it('preenche pendência e fonte onde está vazio e mantém o que já existe', () => {
        const dbRef = montar();
        dbRef.poemas[1].pendencia = 'conferir rima';
        dbRef.poemas[1].fonteTexto = {
            origem: 'Wikisource',
            edicao: '',
            link: '',
            conferido: false,
            grafia: '',
        };
        const arq = {
            textos: [
                {
                    id: 1,
                    pendencia: 'revisar métrica',
                    fonte: { origem: 'Obra própria', conferido: true },
                },
                {
                    id: 2,
                    pendencia: 'revisar métrica',
                    fonte: { origem: 'Obra própria', edicao: '2ª' },
                },
            ],
        };
        const r = executarImportacaoCampos(dbRef, entradas(arq));
        assert.equal(dbRef.poemas[0].pendencia, 'revisar métrica');
        assert.equal(dbRef.poemas[0].fonteTexto.origem, 'Obra própria');
        assert.equal(dbRef.poemas[0].fonteTexto.conferido, true);
        assert.equal(dbRef.poemas[1].pendencia, 'conferir rima');
        assert.equal(dbRef.poemas[1].fonteTexto.origem, 'Wikisource');
        assert.equal(dbRef.poemas[1].fonteTexto.edicao, '2ª');
        assert.equal(r.resumo.camposSimplesMantidos, 2);
        assert.equal(r.resumo.camposSimplesGravados, 4);
    });

    it('com a opção de substituir, o arquivo troca o valor que já existe', () => {
        const dbRef = montar();
        dbRef.poemas[1].pendencia = 'conferir rima';
        const r = executarImportacaoCampos(
            dbRef,
            entradas({ textos: [{ id: 2, pendencia: 'revisar métrica' }] }),
            { substituirCamposSimples: true },
        );
        assert.equal(dbRef.poemas[1].pendencia, 'revisar métrica');
        assert.equal(r.itens[0].camposSimples[0].acao, 'substituido');
    });

    it('um conferido que já está marcado não conta como mudança', () => {
        const dbRef = montar();
        dbRef.poemas[0].fonteTexto = {
            origem: '',
            edicao: '',
            link: '',
            conferido: true,
            grafia: '',
        };
        const r = executarImportacaoCampos(
            dbRef,
            entradas({ textos: [{ id: 1, fonte: { conferido: true } }] }),
        );
        assert.equal(r.itens[0].mudou, false);
    });
});

describe('prévia, desfazer e entrada só com extras', () => {
    const arquivo = {
        textos: [
            {
                id: 1,
                territorialidade: ['Santos'],
                localEscrita: 'Santos',
                pessoas: [{ pessoa: 'Gab', papeis: ['Retratado(a)'] }],
                pendencia: 'revisar',
            },
        ],
    };

    it('a prévia não toca no acervo e traz as opções', () => {
        const dbRef = montar();
        const antes = JSON.stringify(dbRef);
        const r = preverImportacaoCampos(dbRef, entradas(arquivo));
        assert.equal(JSON.stringify(dbRef), antes);
        assert.equal(r.resumo.alterados, 1);
        assert.deepEqual(r.cadastroNovo.locais, ['Santos']);
        assert.deepEqual(r.cadastroNovo.pessoas, ['Gab']);
    });

    it('desfazer devolve textos, Locais e Pessoas ao que eram', () => {
        const dbRef = montar();
        const antes = JSON.stringify(dbRef);
        const r = executarImportacaoCampos(dbRef, entradas(arquivo));
        assert.notEqual(JSON.stringify(dbRef), antes);
        r.desfazer();
        assert.equal(JSON.stringify(dbRef), antes);
    });

    it('entrada só com extras não é tratada como vazia', () => {
        const dbRef = montar();
        const r = executarImportacaoCampos(
            dbRef,
            entradas({ textos: [{ id: 1, pendencia: 'x' }] }),
        );
        assert.deepEqual(r.itens[0].avisos, []);
    });
});
