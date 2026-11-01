import './helpers/dom-real.js';

import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import {
    estadoAnaliseLigacoes,
    parLigado,
    pessoasLigadasAoTema,
    grade,
    gravarLigacoes,
    limparLigacoes,
    filaAnaliseLigacoes,
    resumoAnaliseLigacoes,
    migrarLigacoesTemaPessoa,
    remapearLigacoesDosTextos,
    preservarLigacoesTemaPessoa,
    ligacoesParaExportar,
    importarLigacoes,
} from '../js/ligacoes-tema-pessoa.js';
import { mesclarTemas } from '../js/temas.js';

const { db, mesclarPessoas } = await import('../js/db.js');
const { montarRegistro } = await import('../js/exportar.js');
const { classificarImportacaoAditiva, aplicarImportacaoAditiva } =
    await import('../js/importar-aditivo.js');

const ts = (...ids) => ids.map((temaId) => ({ temaId, papel: '' }));
const ps = (...ids) => ids.map((pessoaId) => ({ pessoaId, papeis: [] }));
const texto = (temas, pessoas, extra = {}) => ({
    id: 1,
    temas: ts(...temas),
    pessoas: ps(...pessoas),
    ...extra,
});

describe('estadoAnaliseLigacoes', () => {
    it('menos de 2 pessoas ou nenhum tema: sem ambiguidade', () => {
        assert.equal(estadoAnaliseLigacoes(texto([1], [1])), 'sem-ambiguidade');
        assert.equal(estadoAnaliseLigacoes(texto([], [1, 2])), 'sem-ambiguidade');
        assert.equal(estadoAnaliseLigacoes({}), 'sem-ambiguidade');
    });

    it('com ambiguidade e sem campo: não analisado', () => {
        assert.equal(estadoAnaliseLigacoes(texto([1], [1, 2])), 'nao-analisado');
    });

    it('analisado e nada desligado é diferente de não analisado', () => {
        const t = texto([1], [1, 2]);
        gravarLigacoes(t, []);
        assert.equal(estadoAnaliseLigacoes(t), 'analisado');
    });

    it('ganhar tema ou pessoa depois de analisado pede revisão; tirar não', () => {
        const t = texto([1], [1, 2]);
        gravarLigacoes(t, []);
        t.temas = ts(1, 2);
        assert.equal(estadoAnaliseLigacoes(t), 'revisar');
        gravarLigacoes(t, []);
        t.pessoas = ps(1, 2, 3);
        assert.equal(estadoAnaliseLigacoes(t), 'revisar');
        gravarLigacoes(t, []);
        t.pessoas = ps(1, 2);
        t.temas = ts(1);
        assert.equal(estadoAnaliseLigacoes(t), 'analisado');
    });
});

describe('parLigado, pessoasLigadasAoTema e grade', () => {
    it('não analisado e par novo contam ligados; só o par desligado dá false', () => {
        const t = texto([1, 2], [1, 2]);
        assert.equal(parLigado(t, 1, 2), true);
        gravarLigacoes(t, [{ temaId: 1, pessoaId: 2 }]);
        assert.equal(parLigado(t, 1, 2), false);
        assert.equal(parLigado(t, 1, 1), true);
        assert.equal(parLigado(t, 2, 2), true);
        t.temas = ts(1, 2, 3); // par novo (tema 3)
        assert.equal(parLigado(t, 3, 2), true);
        assert.deepEqual(pessoasLigadasAoTema(t, 1), [1]);
        assert.deepEqual(pessoasLigadasAoTema(t, 2), [1, 2]);
    });

    it('grade traz temas nas linhas e pessoas nas colunas', () => {
        const t = texto([1, 2], [5, 6]);
        gravarLigacoes(t, [{ temaId: 2, pessoaId: 6 }]);
        const g = grade(t);
        assert.deepEqual(g.temaIds, [1, 2]);
        assert.deepEqual(g.pessoaIds, [5, 6]);
        assert.deepEqual(
            g.celulas.map((l) => l.map((c) => c.ligado)),
            [
                [true, true],
                [true, false],
            ],
        );
    });
});

describe('gravar, limpar, fila e resumo', () => {
    it('gravar ignora pares que não existem no texto e repetidos', () => {
        const t = texto([1], [1, 2]);
        gravarLigacoes(t, [
            { temaId: 1, pessoaId: 2 },
            { temaId: 1, pessoaId: 2 },
            { temaId: 9, pessoaId: 2 },
        ]);
        assert.deepEqual(t.ligacoesTemaPessoa, {
            temaIds: [1],
            pessoaIds: [1, 2],
            desligados: [{ temaId: 1, pessoaId: 2 }],
        });
    });

    it('limpar volta para não analisado', () => {
        const t = texto([1], [1, 2]);
        gravarLigacoes(t, []);
        limparLigacoes(t);
        assert.equal(estadoAnaliseLigacoes(t), 'nao-analisado');
    });

    it('fila e resumo contam só textos com ambiguidade', () => {
        const analisado = texto([1], [1, 2], { id: 1 });
        gravarLigacoes(analisado, []);
        const revisar = texto([1], [1, 2], { id: 2 });
        gravarLigacoes(revisar, []);
        revisar.temas = ts(1, 2);
        const pendente = texto([1], [1, 2], { id: 3 });
        const simples = texto([1], [1], { id: 4 });
        const dbRef = { poemas: [analisado, revisar], prosas: [pendente, simples] };
        const fila = filaAnaliseLigacoes(dbRef);
        assert.deepEqual(
            fila.map((f) => [f.tipo, f.texto.id, f.estado]),
            [
                ['poema', 2, 'revisar'],
                ['prosa', 3, 'nao-analisado'],
            ],
        );
        assert.deepEqual(resumoAnaliseLigacoes(dbRef), {
            total: 3,
            analisados: 1,
            revisar: 1,
            pendentes: 1,
        });
    });
});

describe('migrarLigacoesTemaPessoa', () => {
    it('apaga campo inválido e limpa listas e pares', () => {
        const dbRef = {
            poemas: [
                { id: 1, ligacoesTemaPessoa: 'x' },
                {
                    id: 2,
                    ligacoesTemaPessoa: {
                        temaIds: [1, 1],
                        pessoaIds: [2, 3],
                        desligados: [
                            { temaId: 1, pessoaId: 2 },
                            { temaId: 1, pessoaId: 2 },
                            { temaId: 9, pessoaId: 2 },
                        ],
                    },
                },
                { id: 3 },
            ],
            prosas: [],
        };
        migrarLigacoesTemaPessoa(dbRef);
        assert.equal('ligacoesTemaPessoa' in dbRef.poemas[0], false);
        assert.deepEqual(dbRef.poemas[1].ligacoesTemaPessoa, {
            temaIds: [1],
            pessoaIds: [2, 3],
            desligados: [{ temaId: 1, pessoaId: 2 }],
        });
        assert.equal('ligacoesTemaPessoa' in dbRef.poemas[2], false);
    });
});

describe('remapearLigacoesDosTextos', () => {
    const base = () => ({
        poemas: [
            {
                id: 1,
                ligacoesTemaPessoa: {
                    temaIds: [1],
                    pessoaIds: [10, 11],
                    desligados: [{ temaId: 1, pessoaId: 10 }],
                },
            },
        ],
        prosas: [],
    });

    it('pessoa: a origem vira o destino nos pares', () => {
        const dbRef = base();
        remapearLigacoesDosTextos(dbRef, 'pessoa', 10, 20);
        assert.deepEqual(dbRef.poemas[0].ligacoesTemaPessoa, {
            temaIds: [1],
            pessoaIds: [20, 11],
            desligados: [{ temaId: 1, pessoaId: 20 }],
        });
    });

    it('pessoa com os dois no texto: só fica desligado se todos estavam; na dúvida, liga', () => {
        const dbRef = base();
        remapearLigacoesDosTextos(dbRef, 'pessoa', 10, 11);
        assert.deepEqual(dbRef.poemas[0].ligacoesTemaPessoa.pessoaIds, [11]);
        assert.deepEqual(dbRef.poemas[0].ligacoesTemaPessoa.desligados, []);

        const dbRef2 = base();
        dbRef2.poemas[0].ligacoesTemaPessoa.desligados.push({ temaId: 1, pessoaId: 11 });
        remapearLigacoesDosTextos(dbRef2, 'pessoa', 10, 11);
        assert.deepEqual(dbRef2.poemas[0].ligacoesTemaPessoa.desligados, [
            { temaId: 1, pessoaId: 11 },
        ]);
    });

    it('tema: renomeia e o desfazer devolve tudo', () => {
        const dbRef = base();
        const antes = JSON.stringify(dbRef.poemas[0].ligacoesTemaPessoa);
        const desfazer = remapearLigacoesDosTextos(dbRef, 'tema', 1, 2);
        assert.deepEqual(dbRef.poemas[0].ligacoesTemaPessoa.temaIds, [2]);
        assert.deepEqual(dbRef.poemas[0].ligacoesTemaPessoa.desligados, [
            { temaId: 2, pessoaId: 10 },
        ]);
        desfazer();
        assert.equal(JSON.stringify(dbRef.poemas[0].ligacoesTemaPessoa), antes);
    });

    it('texto sem análise ou sem a origem não muda', () => {
        const dbRef = { poemas: [{ id: 1 }, base().poemas[0]], prosas: [] };
        remapearLigacoesDosTextos(dbRef, 'pessoa', 99, 20);
        assert.equal('ligacoesTemaPessoa' in dbRef.poemas[0], false);
        assert.deepEqual(dbRef.poemas[1].ligacoesTemaPessoa.pessoaIds, [10, 11]);
    });
});

describe('salvar do texto', () => {
    it('leva a análise do objeto anterior para o novo', () => {
        const anterior = texto([1], [1, 2]);
        gravarLigacoes(anterior, [{ temaId: 1, pessoaId: 2 }]);
        const dados = { id: 1, titulo: 'novo' };
        preservarLigacoesTemaPessoa(anterior, dados);
        assert.deepEqual(dados.ligacoesTemaPessoa, anterior.ligacoesTemaPessoa);
        preservarLigacoesTemaPessoa(null, { id: 2 });
    });
});

describe('mesclarTemas', () => {
    it('refaz os pares e o Desfazer devolve as ligações', () => {
        const poema = {
            id: 1,
            sinalizacoesTema: 'A, B',
            temas: ts(1, 2),
            pessoas: ps(10, 11),
            ligacoesTemaPessoa: {
                temaIds: [1, 2],
                pessoaIds: [10, 11],
                desligados: [
                    { temaId: 1, pessoaId: 10 },
                    { temaId: 2, pessoaId: 10 },
                ],
            },
        };
        const dbRef = {
            temas: [
                { id: 1, nome: 'A', notas: '' },
                { id: 2, nome: 'B', notas: '' },
            ],
            assuntos: [],
            poemas: [poema],
            prosas: [],
        };
        const antes = JSON.stringify(poema.ligacoesTemaPessoa);
        const r = mesclarTemas(dbRef, 1, 2);
        assert.equal(r.ok, true);
        assert.deepEqual(poema.ligacoesTemaPessoa.temaIds, [2]);
        assert.deepEqual(poema.ligacoesTemaPessoa.desligados, [{ temaId: 2, pessoaId: 10 }]);
        r.desfazer();
        assert.equal(JSON.stringify(poema.ligacoesTemaPessoa), antes);
    });
});

describe('mesclarPessoas', () => {
    it('a origem vira o destino nas ligações', () => {
        db.pessoas = [
            { id: 10, nome: 'Ana', grupoIds: [] },
            { id: 11, nome: 'Bia', grupoIds: [] },
        ];
        db.poemas = [
            {
                id: 1,
                temas: ts(1),
                pessoas: ps(10, 11),
                ligacoesTemaPessoa: {
                    temaIds: [1],
                    pessoaIds: [10, 11],
                    desligados: [{ temaId: 1, pessoaId: 10 }],
                },
            },
        ];
        db.prosas = [];
        mesclarPessoas(db, 10, 11);
        assert.deepEqual(db.poemas[0].ligacoesTemaPessoa.pessoaIds, [11]);
        assert.deepEqual(db.poemas[0].ligacoesTemaPessoa.desligados, []);
    });
});

describe('exportação e importação em nomes', () => {
    const dbRef = {
        temas: [
            { id: 1, nome: 'Amor' },
            { id: 2, nome: 'Mar' },
        ],
        pessoas: [
            { id: 10, nome: 'Ana' },
            { id: 11, nome: 'Bia' },
            { id: 12, nome: 'Oculta', oculto: true },
        ],
    };

    it('ligacoesParaExportar leva nomes, sem pessoa oculta, e some sem análise', () => {
        const t = texto([1, 2], [10, 11, 12]);
        assert.equal(ligacoesParaExportar(dbRef, t), null);
        gravarLigacoes(t, [
            { temaId: 1, pessoaId: 11 },
            { temaId: 2, pessoaId: 12 },
        ]);
        assert.deepEqual(
            ligacoesParaExportar(dbRef, t, (id) => id !== 12),
            {
                temas: ['Amor', 'Mar'],
                pessoas: ['Ana', 'Bia'],
                desligados: [{ tema: 'Amor', pessoa: 'Bia' }],
            },
        );
    });

    it('importarLigacoes recasa pelo nome (sem caixa nem acento) e descarta o que não existe', () => {
        const novo = texto([5, 6], [50, 51]);
        const destino = {
            temas: [
                { id: 5, nome: 'AMOR' },
                { id: 6, nome: 'Mar' },
            ],
            pessoas: [
                { id: 50, nome: 'Ana' },
                { id: 51, nome: 'Bia' },
            ],
        };
        const r = importarLigacoes(
            destino,
            {
                temas: ['amor', 'Mar', 'Fantasma'],
                pessoas: ['Ana', 'Bia'],
                desligados: [
                    { tema: 'Amor', pessoa: 'Bia' },
                    { tema: 'Fantasma', pessoa: 'Ana' },
                ],
            },
            novo,
        );
        assert.deepEqual(r, {
            temaIds: [5, 6],
            pessoaIds: [50, 51],
            desligados: [{ temaId: 5, pessoaId: 51 }],
        });
        assert.equal(importarLigacoes(destino, undefined, novo), null);
    });

    it('montarRegistro leva em nomes e o campo some sem análise', () => {
        db.temas = [
            { id: 1, nome: 'Amor' },
            { id: 2, nome: 'Mar' },
        ];
        db.pessoas = [
            { id: 10, nome: 'Ana' },
            { id: 11, nome: 'Bia' },
        ];
        const t = texto([1, 2], [10, 11]);
        assert.equal('ligacoesTemaPessoa' in montarRegistro('poema', t), false);
        gravarLigacoes(t, [{ temaId: 2, pessoaId: 10 }]);
        assert.deepEqual(montarRegistro('poema', t).ligacoesTemaPessoa, {
            temas: ['Amor', 'Mar'],
            pessoas: ['Ana', 'Bia'],
            desligados: [{ tema: 'Mar', pessoa: 'Ana' }],
        });
    });

    it('a Importação Aditiva recasa a análise e JSON antigo importa como não analisado', async () => {
        const dbDestino = {
            poemas: [],
            prosas: [],
            pessoas: [],
            grupos: [],
            autores: [],
            epocas: [],
            periodosHistoricos: [],
            livros: [],
            temas: [],
            assuntos: [],
            escansoes: [],
            estruturasTextuais: [],
        };
        const item = (id, extra) => ({
            id,
            tipo: 'poema',
            titulo: `P${id}`,
            texto: 'x',
            pessoas: [
                { pessoaId: 1, nome: 'Ana', papeis: [] },
                { pessoaId: 2, nome: 'Bia', papeis: [] },
            ],
            temas: [
                { temaId: 1, nome: 'Amor', papel: '' },
                { temaId: 2, nome: 'Mar', papel: '' },
            ],
            autoria: [],
            gruposDiretosResolvidos: [],
            livrosResolvidos: [],
            contexto: { livro: null, parte: null, secao: null },
            ...extra,
        });
        const payload = {
            itens: [
                item(1, {
                    ligacoesTemaPessoa: {
                        temas: ['Amor', 'Mar'],
                        pessoas: ['Ana', 'Bia'],
                        desligados: [{ tema: 'Amor', pessoa: 'Bia' }],
                    },
                }),
                item(2, {}),
            ],
        };
        const deps = {
            tirarSnapshotSeNecessario: mock.fn(async () => true),
            save: mock.fn(() => {}),
        };
        const relatorio = classificarImportacaoAditiva(payload, dbDestino);
        const r = await aplicarImportacaoAditiva(payload, relatorio, dbDestino, deps);
        assert.equal(r.sucesso, true);
        const [com, sem] = dbDestino.poemas;
        assert.equal(estadoAnaliseLigacoes(com), 'analisado');
        const amor = dbDestino.temas.find((t) => t.nome === 'Amor').id;
        const bia = dbDestino.pessoas.find((p) => p.nome === 'Bia').id;
        assert.equal(parLigado(com, amor, bia), false);
        assert.equal('ligacoesTemaPessoa' in sem, false);
        assert.equal(estadoAnaliseLigacoes(sem), 'nao-analisado');
    });
});
