import './helpers/localstorage-shim.js';

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
    sortLivros,
    sortPartes,
    sortSecoes,
    sortPoemas,
    sortElementos,
    calcularCascataColetanea,
    migrarPapeisPessoa,
    migrarNomesDePapel,
    migrarIdioma,
    migrarReconhecimentos,
    migrarAutoria,
    calcularImpactoExclusaoAutor,
    migrarEpocas,
    migrarDatasPeriodoHistorico,
    migrarDatasEpoca,
    calcularImpactoExclusaoEpoca,
    calcularImpactoExclusaoPeriodoHistorico,
    calcularImpactoExclusaoPoema,
    mesclarPessoas,
    mesclarEpocas,
    mesclarGrupos,
    mesclarPeriodosHistoricos,
    obterOuCriarGrupoPorNome,
    obterOuCriarEpocaPorNome,
    obterGrupoPaiValido,
    nivelGrupo,
    alturaSubarvoreGrupo,
    cadeiaAncestraisGrupo,
    NIVEL_MAXIMO_GRUPO,
    obterOuCriarPeriodoHistoricoPorNome,
    calcularImpactoExclusaoGrupo,
    migrarMovimentosEscolasEmbutidos,
    migrarPeriodosHistoricosEmbutidos,
    migrarRegiaoPeriodoHistorico,
    db,
} from '../js/db.js';

// ─── sortSecoes ─────────────────────────────────────────────────

describe('sortSecoes (ordenação hierárquica: Livro → Parte/Livro → própria sequência)', () => {
    it('agrupa Seções pelo Livro a que pertencem, na ordem dos Livros', () => {
        const livros = [
            { id: 1, sequencia: 1 },
            { id: 2, sequencia: 2 },
        ];
        const partes = [];
        const secoes = [
            { id: 10, paiTipo: 'livro', paiId: 2, sequencia: 1 },
            { id: 11, paiTipo: 'livro', paiId: 1, sequencia: 1 },
        ];
        sortSecoes(secoes, livros, partes);
        assert.deepEqual(
            secoes.map((s) => s.id),
            [11, 10],
        );
    });

    it('Seção ligada a uma Parte usa a sequência da Parte pra se posicionar dentro do Livro', () => {
        const livros = [{ id: 1, sequencia: 1 }];
        const partes = [
            { id: 100, livroId: 1, sequencia: 1 },
            { id: 101, livroId: 1, sequencia: 2 },
        ];
        const secoes = [
            { id: 20, paiTipo: 'parte', paiId: 101, sequencia: 1 }, // dentro da Parte 2
            { id: 21, paiTipo: 'parte', paiId: 100, sequencia: 1 }, // dentro da Parte 1
        ];
        sortSecoes(secoes, livros, partes);
        assert.deepEqual(
            secoes.map((s) => s.id),
            [21, 20],
        );
    });

    it('Seção direta no Livro usa a própria sequência (senão sempre iria pro fim)', () => {
        // Regressão do bug descrito no comentário original: uma Seção presa
        // direto ao Livro (sem Parte) não pode perder pra qualquer Parte
        // numerada só por não ter `db.partes.find(...)` retornando algo.
        const livros = [{ id: 1, sequencia: 1 }];
        const partes = [{ id: 100, livroId: 1, sequencia: 2 }];
        const secoes = [
            { id: 30, paiTipo: 'parte', paiId: 100, sequencia: 1 },
            { id: 31, paiTipo: 'livro', paiId: 1, sequencia: 1 }, // deve vir antes da Parte 2
        ];
        sortSecoes(secoes, livros, partes);
        assert.deepEqual(
            secoes.map((s) => s.id),
            [31, 30],
        );
    });

    it('sequência ausente/inválida vai pro fim do grupo (cai no sentinela 9999)', () => {
        const livros = [{ id: 1, sequencia: 1 }];
        const partes = [];
        const secoes = [
            { id: 40, paiTipo: 'livro', paiId: 1, sequencia: null },
            { id: 41, paiTipo: 'livro', paiId: 1, sequencia: 1 },
        ];
        sortSecoes(secoes, livros, partes);
        assert.deepEqual(
            secoes.map((s) => s.id),
            [41, 40],
        );
    });

    it('Parte referenciada que não existe mais não quebra a ordenação (cai no sentinela)', () => {
        const livros = [{ id: 1, sequencia: 1 }];
        const partes = []; // paiId 999 não existe em nenhuma Parte
        const secoes = [
            { id: 50, paiTipo: 'parte', paiId: 999, sequencia: 1 },
            { id: 51, paiTipo: 'livro', paiId: 1, sequencia: 1 },
        ];
        assert.doesNotThrow(() => sortSecoes(secoes, livros, partes));
    });
});

// ─── sortPoemas ─────────────────────────────────────────────────

describe('sortPoemas (ordenação hierárquica: Livro → Parte → Seção → própria sequência)', () => {
    const livros = [
        { id: 1, sequencia: 1 },
        { id: 2, sequencia: 2 },
    ];
    const partes = [
        { id: 10, livroId: 1, sequencia: 1 },
        { id: 11, livroId: 1, sequencia: 2 },
    ];
    const secoes = [
        { id: 20, paiTipo: 'parte', paiId: 10, sequencia: 1 },
        { id: 21, paiTipo: 'livro', paiId: 1, sequencia: 2 },
    ];

    it('poema direto no Livro vem antes de poema dentro de uma Parte daquele Livro', () => {
        const poemas = [
            { id: 1, paiTipo: 'parte', paiId: 10, sequencia: 1 },
            { id: 2, paiTipo: 'livro', paiId: 1, sequencia: 1 },
        ];
        sortPoemas(poemas, livros, partes, secoes);
        assert.deepEqual(
            poemas.map((p) => p.id),
            [2, 1],
        );
    });

    it('poema dentro de uma Seção herda a posição da Parte/Livro da Seção', () => {
        const poemas = [
            { id: 1, paiTipo: 'secao', paiId: 20, sequencia: 1 }, // Seção dentro da Parte 1 (livro 1)
            { id: 2, paiTipo: 'parte', paiId: 11, sequencia: 1 }, // Parte 2 (livro 1) direto
        ];
        sortPoemas(poemas, livros, partes, secoes);
        // Poema 1 está na Seção 20, que está na Parte 10 (sequencia 1) — vem antes
        // da Parte 11 (sequencia 2).
        assert.deepEqual(
            poemas.map((p) => p.id),
            [1, 2],
        );
    });

    it('poemas de Livros diferentes respeitam a ordem dos Livros, não a ordem de criação', () => {
        const poemas = [
            { id: 1, paiTipo: 'livro', paiId: 2, sequencia: 1 },
            { id: 2, paiTipo: 'livro', paiId: 1, sequencia: 1 },
        ];
        sortPoemas(poemas, livros, partes, secoes);
        assert.deepEqual(
            poemas.map((p) => p.id),
            [2, 1],
        );
    });

    it('dentro do mesmo caminho hierárquico, desempata pela própria sequência', () => {
        const poemas = [
            { id: 1, paiTipo: 'livro', paiId: 1, sequencia: 3 },
            { id: 2, paiTipo: 'livro', paiId: 1, sequencia: 1 },
            { id: 3, paiTipo: 'livro', paiId: 1, sequencia: 2 },
        ];
        sortPoemas(poemas, livros, partes, secoes);
        assert.deepEqual(
            poemas.map((p) => p.id),
            [2, 3, 1],
        );
    });

    it('vínculo quebrado (paiId de Seção/Parte inexistente) não quebra a ordenação, só empurra pro fim', () => {
        const poemas = [
            { id: 1, paiTipo: 'secao', paiId: 999, sequencia: 1 },
            { id: 2, paiTipo: 'livro', paiId: 1, sequencia: 1 },
        ];
        assert.doesNotThrow(() => sortPoemas(poemas, livros, partes, secoes));
        assert.deepEqual(
            poemas.map((p) => p.id),
            [2, 1],
        );
    });
});

// ─── sortLivros / sortPartes / sortElementos (cobertura de regressão básica) ──

describe('sortLivros', () => {
    it('ordena por sequência e desempata por id', () => {
        const livros = [
            { id: 3, sequencia: 1 },
            { id: 1, sequencia: 1 },
            { id: 2, sequencia: null },
        ];
        sortLivros(livros);
        assert.deepEqual(
            livros.map((l) => l.id),
            [1, 3, 2],
        );
    });
});

describe('sortPartes', () => {
    it('agrupa por Livro, na ordem dos Livros, depois por sequência própria', () => {
        const livros = [
            { id: 1, sequencia: 1 },
            { id: 2, sequencia: 2 },
        ];
        const partes = [
            { id: 10, livroId: 2, sequencia: 1 },
            { id: 11, livroId: 1, sequencia: 2 },
            { id: 12, livroId: 1, sequencia: 1 },
        ];
        sortPartes(partes, livros);
        assert.deepEqual(
            partes.map((p) => p.id),
            [12, 11, 10],
        );
    });
});

describe('sortElementos', () => {
    it('usa getPosicaoElemento (via db completo) pra ordenar por Livro→Parte→Seção', () => {
        const db = {
            livros: [
                { id: 1, sequencia: 2 },
                { id: 2, sequencia: 1 },
            ],
            partes: [],
            secoes: [],
        };
        const elementos = [
            { id: 1, paiTipo: 'livro', paiId: 1, sequencia: 1 },
            { id: 2, paiTipo: 'livro', paiId: 2, sequencia: 1 },
        ];
        sortElementos(elementos, db);
        assert.deepEqual(
            elementos.map((e) => e.id),
            [2, 1],
        );
    });
});

// ─── calcularCascataColetanea ─────────────────────────────────────

describe('calcularCascataColetanea (o que seria apagado junto com uma Coletânea)', () => {
    it('encontra as Partes exclusivas da Coletânea e os itens dessas Partes', () => {
        const db = {
            partes: [
                { id: 100, livroId: 1 }, // pertence à coletânea 1
                { id: 101, livroId: 1 }, // pertence à coletânea 1
                { id: 102, livroId: 2 }, // pertence a outra coletânea/livro
            ],
            itensColetanea: [
                { id: 1, parteId: 100 },
                { id: 2, parteId: 101 },
                { id: 3, parteId: 102 },
            ],
        };
        const { partesIds, itensIds } = calcularCascataColetanea(db, 1);
        assert.deepEqual(partesIds.sort(), [100, 101]);
        assert.deepEqual(itensIds.sort(), [1, 2]);
    });

    it('Coletânea sem Partes ainda retorna listas vazias, sem quebrar', () => {
        const db = { partes: [], itensColetanea: [] };
        const { partesIds, itensIds } = calcularCascataColetanea(db, 1);
        assert.deepEqual(partesIds, []);
        assert.deepEqual(itensIds, []);
    });

    it('funciona mesmo se itensColetanea estiver ausente do db (backup antigo)', () => {
        const db = { partes: [{ id: 100, livroId: 1 }] };
        const { partesIds, itensIds } = calcularCascataColetanea(db, 1);
        assert.deepEqual(partesIds, [100]);
        assert.deepEqual(itensIds, []);
    });

    it('não confunde Partes de Livros diferentes: apagar a Coletânea 1 não pega Partes da 2', () => {
        const db = {
            partes: [
                { id: 100, livroId: 1 },
                { id: 200, livroId: 2 },
            ],
            itensColetanea: [
                { id: 1, parteId: 100 },
                { id: 2, parteId: 200 },
            ],
        };
        const { partesIds, itensIds } = calcularCascataColetanea(db, 2);
        assert.deepEqual(partesIds, [200]);
        assert.deepEqual(itensIds, [2]);
    });
});

// ─── migrarPapeisPessoa ──────────────────────────────────────────

describe('migrarPapeisPessoa (papel string única → papeis: array, multi-select)', () => {
    it('converte papel preenchido em array de um item', () => {
        const itens = [{ pessoas: [{ nome: 'Pedro', papel: 'Retratado(a)' }] }];
        migrarPapeisPessoa(itens);
        assert.deepEqual(itens[0].pessoas, [{ nome: 'Pedro', papeis: ['Retratado(a)'] }]);
    });

    it('converte papel "" (não especificado) em array vazio', () => {
        const itens = [{ pessoas: [{ nome: 'Pedro', papel: '' }] }];
        migrarPapeisPessoa(itens);
        assert.deepEqual(itens[0].pessoas, [{ nome: 'Pedro', papeis: [] }]);
    });

    it('idempotente: item que já tem papeis (array) passa intacto', () => {
        const itens = [
            { pessoas: [{ nome: 'Pedro', papeis: ['Retratado(a)', 'Dedicatário(a)'] }] },
        ];
        migrarPapeisPessoa(itens);
        assert.deepEqual(itens[0].pessoas, [
            { nome: 'Pedro', papeis: ['Retratado(a)', 'Dedicatário(a)'] },
        ]);
    });

    it('ignora item sem pessoas migradas ainda (pessoas não é array)', () => {
        const itens = [{ pessoas: 'Pedro, Dani' }];
        migrarPapeisPessoa(itens);
        assert.equal(itens[0].pessoas, 'Pedro, Dani');
    });
});

// ─── migrarNomesDePapel ───────────────────────────────────────────

describe('migrarNomesDePapel (renomeação de gênero + direção gramatical em PAPEIS_PESSOA: Alusão/Dedicatária/Inspirado por/Inspirado(a) por)', () => {
    it('renomeia os valores antigos pros novos', () => {
        const itens = [
            {
                pessoas: [
                    { pessoaId: 1, papeis: ['Alusão'] },
                    { pessoaId: 2, papeis: ['Dedicatária', 'Inspirado por'] },
                ],
            },
        ];
        migrarNomesDePapel(itens);
        assert.deepEqual(itens[0].pessoas, [
            { pessoaId: 1, papeis: ['Aludido(a)'] },
            { pessoaId: 2, papeis: ['Dedicatário(a)', 'Inspiração para'] },
        ]);
    });

    it('mapeia direto pro nome final mesmo a partir do nome intermediário ("Inspirado(a) por")', () => {
        const itens = [{ pessoas: [{ pessoaId: 1, papeis: ['Inspirado(a) por'] }] }];
        migrarNomesDePapel(itens);
        assert.deepEqual(itens[0].pessoas, [{ pessoaId: 1, papeis: ['Inspiração para'] }]);
    });

    it('dedup: nome antigo + nome novo já marcados manualmente no mesmo item viram um só', () => {
        const itens = [{ pessoas: [{ pessoaId: 1, papeis: ['Alusão', 'Aludido(a)'] }] }];
        migrarNomesDePapel(itens);
        assert.deepEqual(itens[0].pessoas, [{ pessoaId: 1, papeis: ['Aludido(a)'] }]);
    });

    it('idempotente: rodar de novo não muda nada', () => {
        const itens = [{ pessoas: [{ pessoaId: 1, papeis: ['Retratado(a)', 'Mencionado(a)'] }] }];
        migrarNomesDePapel(itens);
        migrarNomesDePapel(itens);
        assert.deepEqual(itens[0].pessoas, [
            { pessoaId: 1, papeis: ['Retratado(a)', 'Mencionado(a)'] },
        ]);
    });

    it('ignora item sem pessoas (não é array) e pessoa sem papeis (não é array)', () => {
        const itens = [
            { pessoas: 'Pedro, Dani' },
            { pessoas: [{ pessoaId: 1, papeis: undefined }] },
        ];
        migrarNomesDePapel(itens);
        assert.equal(itens[0].pessoas, 'Pedro, Dani');
        assert.equal(itens[1].pessoas[0].papeis, undefined);
    });
});

// ─── migrarIdioma ───────────────────────────────────────────────

describe('migrarIdioma (item 9 do plano de schema — campo idioma)', () => {
    it('preenche "pt-BR" em item sem o campo idioma', () => {
        const itens = [{ titulo: 'A' }];
        migrarIdioma(itens);
        assert.equal(itens[0].idioma, 'pt-BR');
    });

    it('não sobrescreve idioma já preenchido, seja o padrão ou uma escolha manual', () => {
        const itens = [{ idioma: 'pt-BR' }, { idioma: 'en' }];
        migrarIdioma(itens);
        assert.equal(itens[0].idioma, 'pt-BR');
        assert.equal(itens[1].idioma, 'en');
    });

    it('idempotente: rodar de novo não muda nada', () => {
        const itens = [{ titulo: 'A' }];
        migrarIdioma(itens);
        migrarIdioma(itens);
        assert.equal(itens[0].idioma, 'pt-BR');
    });

    it('trata string vazia como valor já preenchido (não sobrescreve) — só undefined dispara o padrão', () => {
        const itens = [{ idioma: '' }];
        migrarIdioma(itens);
        assert.equal(itens[0].idioma, '');
    });
});

// ─── migrarReconhecimentos ────────────────────────────────────────

describe('migrarReconhecimentos (item 8 do plano de schema — campo reconhecimentos)', () => {
    it('preenche reconhecimentos: [] em item sem a tag "Premiados"', () => {
        const itens = [{ titulo: 'A' }];
        migrarReconhecimentos(itens);
        assert.deepEqual(itens[0].reconhecimentos, []);
    });

    it('item com a tag "Premiados" em sinalizacoesOutros ganha uma entrada em branco e perde a tag', () => {
        const itens = [{ titulo: 'beija-flor', sinalizacoesOutros: 'Premiados' }];
        migrarReconhecimentos(itens);
        assert.deepEqual(itens[0].reconhecimentos, [
            { premio: '', posicao: '', ano: null, texto: '' },
        ]);
        assert.equal(itens[0].sinalizacoesOutros, '');
    });

    it('remove só a tag "Premiados", preservando as demais tags soltas', () => {
        const itens = [{ sinalizacoesOutros: 'Premiados, Tradução' }];
        migrarReconhecimentos(itens);
        assert.equal(itens[0].sinalizacoesOutros, 'Tradução');
    });

    it('não sobrescreve reconhecimentos já preenchido (seja vazio ou com dados de uma rodada anterior)', () => {
        const itens = [
            { reconhecimentos: [] },
            {
                reconhecimentos: [
                    { premio: 'Concurso X', posicao: '1º lugar', ano: 2020, texto: '' },
                ],
            },
        ];
        migrarReconhecimentos(itens);
        assert.deepEqual(itens[0].reconhecimentos, []);
        assert.equal(itens[1].reconhecimentos[0].premio, 'Concurso X');
    });

    it('idempotente: rodar de novo não duplica a entrada nem recria a tag', () => {
        const itens = [{ sinalizacoesOutros: 'Premiados' }];
        migrarReconhecimentos(itens);
        migrarReconhecimentos(itens);
        assert.equal(itens[0].reconhecimentos.length, 1);
        assert.equal(itens[0].sinalizacoesOutros, '');
    });
});

// ─── migrarAutoria ────────────────────────────────────────────────

describe('migrarAutoria (cadastro central de Autores + backfill Victor Leme como Autor)', () => {
    it('preenche autoria: [{autorId, papel: "Autor"}] em item sem o campo, criando Victor Leme no cadastro', () => {
        const dbRef = { autores: [], poemas: [{ titulo: 'A' }], prosas: [] };
        migrarAutoria(dbRef);
        assert.equal(dbRef.autores.length, 1);
        assert.equal(dbRef.autores[0].nome, 'Victor Leme');
        assert.deepEqual(dbRef.poemas[0].autoria, [
            { autorId: dbRef.autores[0].id, papel: 'Autor' },
        ]);
    });

    it('não sobrescreve autoria já preenchida (ex.: coautoria marcada manualmente)', () => {
        const dbRef = {
            autores: [{ id: 1, nome: 'Victor Leme', sobre: '' }],
            poemas: [
                {
                    autoria: [
                        { autorId: 1, papel: 'Autor' },
                        { autorId: 2, papel: 'Coautor' },
                    ],
                },
            ],
            prosas: [],
        };
        migrarAutoria(dbRef);
        assert.equal(dbRef.poemas[0].autoria.length, 2);
    });

    it('reaproveita o Victor Leme já cadastrado em vez de duplicar', () => {
        const dbRef = {
            autores: [{ id: 42, nome: 'Victor Leme', sobre: 'já existia' }],
            poemas: [{ titulo: 'A' }, { titulo: 'B' }],
            prosas: [{ titulo: 'C' }],
        };
        migrarAutoria(dbRef);
        assert.equal(dbRef.autores.length, 1);
        assert.equal(dbRef.poemas[0].autoria[0].autorId, 42);
        assert.equal(dbRef.poemas[1].autoria[0].autorId, 42);
        assert.equal(dbRef.prosas[0].autoria[0].autorId, 42);
    });

    it('idempotente: rodar de novo não muda nada nem duplica o cadastro', () => {
        const dbRef = { autores: [], poemas: [{ titulo: 'A' }], prosas: [] };
        migrarAutoria(dbRef);
        const autoriaAntes = dbRef.poemas[0].autoria;
        migrarAutoria(dbRef);
        assert.equal(dbRef.autores.length, 1);
        assert.deepEqual(dbRef.poemas[0].autoria, autoriaAntes);
    });

    it('não cria Victor Leme no cadastro se não houver item pra migrar', () => {
        const dbRef = {
            autores: [],
            poemas: [{ autoria: [{ autorId: 1, papel: 'Autor' }] }],
            prosas: [],
        };
        migrarAutoria(dbRef);
        assert.equal(dbRef.autores.length, 0);
    });

    it('aplica a Poema e Prosa juntos, com o mesmo autorId de Victor Leme', () => {
        const dbRef = { autores: [], poemas: [{ titulo: 'A' }], prosas: [{ titulo: 'B' }] };
        migrarAutoria(dbRef);
        assert.equal(dbRef.poemas[0].autoria[0].autorId, dbRef.prosas[0].autoria[0].autorId);
    });
});

// ─── calcularImpactoExclusaoAutor ──────────────────────────────────

describe('calcularImpactoExclusaoAutor (quem referencia o Autor, pra avisar antes de excluir)', () => {
    it('encontra poemas e prosas onde o autor está vinculado, independente do papel', () => {
        const dbRef = {
            poemas: [
                { id: 1, autoria: [{ autorId: 10, papel: 'Autor' }] },
                { id: 2, autoria: [{ autorId: 20, papel: 'Autor' }] },
            ],
            prosas: [{ id: 3, autoria: [{ autorId: 10, papel: 'Coautor' }] }],
        };
        const { poemasIds, prosasIds } = calcularImpactoExclusaoAutor(dbRef, 10);
        assert.deepEqual(poemasIds, [1]);
        assert.deepEqual(prosasIds, [3]);
    });

    it('autor sem nenhum vínculo retorna listas vazias', () => {
        const dbRef = {
            poemas: [{ id: 1, autoria: [{ autorId: 10, papel: 'Autor' }] }],
            prosas: [],
        };
        const { poemasIds, prosasIds } = calcularImpactoExclusaoAutor(dbRef, 999);
        assert.deepEqual(poemasIds, []);
        assert.deepEqual(prosasIds, []);
    });

    it('funciona mesmo se poemas/prosas estiverem ausentes do db (backup antigo)', () => {
        const { poemasIds, prosasIds } = calcularImpactoExclusaoAutor({}, 10);
        assert.deepEqual(poemasIds, []);
        assert.deepEqual(prosasIds, []);
    });

    // Desde 27/09/2026, Grupo e Época (Período Biográfico) são exclusivos
    // de um Autor e somem em cascata junto com ele — calcularImpactoExclusaoAutor
    // também precisa listar esses dois, não só poemas/prosas.
    it('encontra os Grupos e Épocas que pertencem ao Autor (serão apagados em cascata)', () => {
        const dbRef = {
            poemas: [],
            prosas: [],
            grupos: [
                { id: 1, nome: 'Família', autorId: 10, paiId: null },
                { id: 2, nome: 'Amigos', autorId: 20, paiId: null },
            ],
            epocas: [
                { id: 100, nome: 'Corte de contato', autorId: 10 },
                { id: 200, nome: 'Infância', autorId: 20 },
            ],
        };
        const { gruposIds, epocasIds } = calcularImpactoExclusaoAutor(dbRef, 10);
        assert.deepEqual(gruposIds, [1]);
        assert.deepEqual(epocasIds, [100]);
    });

    it('autor sem Grupos/Épocas próprios retorna gruposIds/epocasIds vazios', () => {
        const dbRef = {
            poemas: [],
            prosas: [],
            grupos: [{ id: 1, nome: 'Família', autorId: 20, paiId: null }],
            epocas: [],
        };
        const { gruposIds, epocasIds } = calcularImpactoExclusaoAutor(dbRef, 10);
        assert.deepEqual(gruposIds, []);
        assert.deepEqual(epocasIds, []);
    });

    it('funciona mesmo se grupos/epocas estiverem ausentes do db (backup antigo)', () => {
        const { gruposIds, epocasIds } = calcularImpactoExclusaoAutor({}, 10);
        assert.deepEqual(gruposIds, []);
        assert.deepEqual(epocasIds, []);
    });

    // `pessoasIds` (nova, 27/09/2026) segue o espírito OPOSTO de
    // gruposIds/epocasIds acima: Pessoa não é exclusiva de um Autor
    // (autorIds é N:N, ver migrarPessoasAutorIds) — excluir o Autor não
    // apaga a Pessoa, só a lista pra saber quem vai perder essa
    // associação específica.
    it('encontra as Pessoas associadas ao Autor (só desvinculam, não são apagadas)', () => {
        const dbRef = {
            poemas: [],
            prosas: [],
            grupos: [],
            epocas: [],
            pessoas: [
                { id: 1, nome: 'Pedro', autorIds: [10] },
                { id: 2, nome: 'Ana', autorIds: [10, 20] },
                { id: 3, nome: 'Bia', autorIds: [20] },
            ],
        };
        const { pessoasIds } = calcularImpactoExclusaoAutor(dbRef, 10);
        assert.deepEqual(pessoasIds, [1, 2]);
    });

    it('autor sem Pessoas associadas retorna pessoasIds vazio', () => {
        const dbRef = {
            poemas: [],
            prosas: [],
            pessoas: [{ id: 1, nome: 'Pedro', autorIds: [20] }],
        };
        const { pessoasIds } = calcularImpactoExclusaoAutor(dbRef, 10);
        assert.deepEqual(pessoasIds, []);
    });

    it('funciona mesmo se pessoas estiver ausente do db (backup antigo)', () => {
        const { pessoasIds } = calcularImpactoExclusaoAutor({}, 10);
        assert.deepEqual(pessoasIds, []);
    });
});

// ─── obterOuCriarGrupoPorNome ───────────────────────────────────────
// Desde 27/09/2026, Grupo deixou de ter nome único globalmente — o dedup
// passou a ser por (nome, autorId): dois Autores diferentes podem, cada
// um, ter um Grupo chamado "Família" sem colidir.

describe('obterOuCriarGrupoPorNome (dedup por (nome, autorId), não mais nome global)', () => {
    beforeEach(() => {
        db.grupos.length = 0;
    });

    it('nome que já existe pro MESMO Autor retorna o grupo existente, sem duplicar', () => {
        db.grupos.push({ id: 1, nome: 'Família', cor: 'blue', autorId: 10, paiId: null });

        const grupo = obterOuCriarGrupoPorNome('Família', 10);

        assert.equal(grupo.id, 1);
        assert.equal(db.grupos.length, 1);
    });

    it('mesmo nome em Autores DIFERENTES não colide — cria um grupo novo pro segundo Autor', () => {
        db.grupos.push({ id: 1, nome: 'Família', cor: 'blue', autorId: 10, paiId: null });

        const grupo = obterOuCriarGrupoPorNome('Família', 20);

        assert.notEqual(grupo.id, 1);
        assert.equal(grupo.autorId, 20);
        assert.equal(
            db.grupos.length,
            2,
            'Família de outro Autor é um grupo à parte, não duplicata',
        );
    });

    it('nome novo cria um grupo com cor padrão, autorId gravado e paiId nulo (nível 1)', () => {
        const grupo = obterOuCriarGrupoPorNome('Trabalho', 10);

        assert.equal(db.grupos.length, 1);
        assert.equal(grupo.nome, 'Trabalho');
        assert.equal(grupo.autorId, 10);
        assert.equal(grupo.paiId, null);
        assert.ok(grupo.cor, 'grupo novo deveria vir com uma cor padrão preenchida');
    });

    it('nome com espaços nas pontas é normalizado antes de comparar/criar, dentro do mesmo Autor', () => {
        db.grupos.push({ id: 1, nome: 'Amigos', cor: 'emerald', autorId: 10, paiId: null });

        const grupo = obterOuCriarGrupoPorNome('  Amigos  ', 10);

        assert.equal(grupo.id, 1);
        assert.equal(db.grupos.length, 1, 'não deveria criar um grupo duplicado só por espaços');
    });
});

// ─── obterOuCriarEpocaPorNome ───────────────────────────────────────
// Mesmo raciocínio de obterOuCriarGrupoPorNome acima — Época (Período
// Biográfico) também passou a dedupar por (nome, autorId).

describe('obterOuCriarEpocaPorNome (dedup por (nome, autorId), não mais nome global)', () => {
    beforeEach(() => {
        db.epocas.length = 0;
    });

    it('nome que já existe pro MESMO Autor retorna a época existente, sem duplicar', () => {
        db.epocas.push({
            id: 1,
            nome: 'Corte de contato',
            notas: '',
            autorId: 10,
        });

        const epoca = obterOuCriarEpocaPorNome('Corte de contato', 10);

        assert.equal(epoca.id, 1);
        assert.equal(db.epocas.length, 1);
    });

    it('mesmo nome em Autores DIFERENTES não colide — cria uma época nova pro segundo Autor', () => {
        db.epocas.push({ id: 1, nome: 'Infância', notas: '', autorId: 10 });

        const epoca = obterOuCriarEpocaPorNome('Infância', 20);

        assert.notEqual(epoca.id, 1);
        assert.equal(epoca.autorId, 20);
        assert.equal(db.epocas.length, 2);
    });

    it('nome novo cria uma época com autorId gravado', () => {
        const epoca = obterOuCriarEpocaPorNome('Luto', 10);

        assert.equal(db.epocas.length, 1);
        assert.equal(epoca.nome, 'Luto');
        assert.equal(epoca.autorId, 10);
    });

    it('nome vazio (só espaços) não cria nada, retorna null', () => {
        const epoca = obterOuCriarEpocaPorNome('   ', 10);

        assert.equal(epoca, null);
        assert.equal(db.epocas.length, 0);
    });
});

// ─── nivelGrupo ──────────────────────────────────────────────────────

describe('nivelGrupo (nível 1 a NIVEL_MAXIMO_GRUPO de um Grupo, subindo a cadeia de paiId)', () => {
    it('teto atual é 5', () => {
        assert.equal(NIVEL_MAXIMO_GRUPO, 5);
    });

    it('grupo sem pai é nível 1', () => {
        const dbRef = { grupos: [{ id: 1, autorId: 10, paiId: null }] };
        assert.equal(nivelGrupo(dbRef, 1), 1);
    });

    it('grupo com pai de nível 1 é nível 2', () => {
        const dbRef = {
            grupos: [
                { id: 1, autorId: 10, paiId: null },
                { id: 2, autorId: 10, paiId: 1 },
            ],
        };
        assert.equal(nivelGrupo(dbRef, 2), 2);
    });

    it('cadeia de 5 grupos encaixados chega a nível 5', () => {
        const dbRef = {
            grupos: [
                { id: 1, autorId: 10, paiId: null },
                { id: 2, autorId: 10, paiId: 1 },
                { id: 3, autorId: 10, paiId: 2 },
                { id: 4, autorId: 10, paiId: 3 },
                { id: 5, autorId: 10, paiId: 4 },
            ],
        };
        assert.equal(nivelGrupo(dbRef, 5), 5);
    });
});

// ─── alturaSubarvoreGrupo ──────────────────────────────────────────────

describe('alturaSubarvoreGrupo (altura da subárvore abaixo de um Grupo)', () => {
    it('grupo sem filho tem altura 0', () => {
        const dbRef = { grupos: [{ id: 1, autorId: 10, paiId: null }] };
        assert.equal(alturaSubarvoreGrupo(dbRef, 1), 0);
    });

    it('grupo com filho mas sem neto tem altura 1', () => {
        const dbRef = {
            grupos: [
                { id: 1, autorId: 10, paiId: null },
                { id: 2, autorId: 10, paiId: 1 },
            ],
        };
        assert.equal(alturaSubarvoreGrupo(dbRef, 1), 1);
    });

    it('grupo com neto tem altura 2', () => {
        const dbRef = {
            grupos: [
                { id: 1, autorId: 10, paiId: null },
                { id: 2, autorId: 10, paiId: 1 },
                { id: 3, autorId: 10, paiId: 2 },
            ],
        };
        assert.equal(alturaSubarvoreGrupo(dbRef, 1), 2);
    });

    it('grupo inexistente (ainda não gravado, cadastro novo) tem altura 0', () => {
        const dbRef = { grupos: [] };
        assert.equal(alturaSubarvoreGrupo(dbRef, 999), 0);
    });
});

// ─── cadeiaAncestraisGrupo ──────────────────────────────────────────────
// Usada só pelas Estatísticas (agregarPorPessoa/coocorrenciaTemasGrupos em
// estatisticas-dados.js) pra fazer um subgrupo "repicar" a contagem pro(s)
// grupo(s) acima dele — nunca em atribuição de Grupo à Pessoa ou em
// exibição/exportação de poema/prosa (paresGrupoPessoa, utils.js).
describe('cadeiaAncestraisGrupo (do próprio grupo até a raiz, self-inclusive)', () => {
    it('grupo sem pai: cadeia é só ele mesmo', () => {
        const dbRef = { grupos: [{ id: 1, autorId: 10, paiId: null }] };
        assert.deepEqual(cadeiaAncestraisGrupo(dbRef, 1), [1]);
    });

    it('subgrupo de nível 2: cadeia inclui ele mesmo e o pai, nessa ordem', () => {
        const dbRef = {
            grupos: [
                { id: 1, autorId: 10, paiId: null },
                { id: 2, autorId: 10, paiId: 1 },
            ],
        };
        assert.deepEqual(cadeiaAncestraisGrupo(dbRef, 2), [2, 1]);
    });

    it('cadeia de 5 grupos encaixados sobe até a raiz', () => {
        const dbRef = {
            grupos: [
                { id: 1, autorId: 10, paiId: null },
                { id: 2, autorId: 10, paiId: 1 },
                { id: 3, autorId: 10, paiId: 2 },
                { id: 4, autorId: 10, paiId: 3 },
                { id: 5, autorId: 10, paiId: 4 },
            ],
        };
        assert.deepEqual(cadeiaAncestraisGrupo(dbRef, 5), [5, 4, 3, 2, 1]);
    });

    it('grupo inexistente devolve cadeia vazia', () => {
        const dbRef = { grupos: [] };
        assert.deepEqual(cadeiaAncestraisGrupo(dbRef, 999), []);
    });
});

// ─── obterGrupoPaiValido ─────────────────────────────────────────────
// Hierarquia travada em NIVEL_MAXIMO_GRUPO níveis fixos (2 até
// 27/09/2026, destravada pro 3º no mesmo dia por um caso de uso real, e
// direto pro 5º ainda no mesmo dia por decisão do Victor de já deixar
// gordura — ver decisoes.md): o candidato a "Grupo pai" precisa existir,
// ser do mesmo Autor do filho, e a ÁRVORE INTEIRA resultante (candidato +
// 1 + a subárvore que o próprio grupo filho já carrega) precisa caber no
// teto — nunca aponta pra outro Autor nem forma ciclo (virar pai de um
// ancestral seu).

describe('obterGrupoPaiValido (valida "Grupo pai": mesmo Autor, dentro do teto, sem ciclo)', () => {
    it('candidato de nível 1 do mesmo Autor é aceito', () => {
        const dbRef = {
            grupos: [{ id: 1, nome: 'Família', autorId: 10, paiId: null }],
        };
        assert.equal(obterGrupoPaiValido(dbRef, 2, 10, 1), 1);
    });

    it('candidato de nível 2 do mesmo Autor também é aceito (filho vira nível 3)', () => {
        const dbRef = {
            grupos: [
                { id: 1, nome: 'Ex-namorados', autorId: 10, paiId: null },
                { id: 2, nome: 'Pedro', autorId: 10, paiId: 1 },
            ],
        };
        assert.equal(obterGrupoPaiValido(dbRef, 3, 10, 2), 2);
    });

    it('candidato de nível 4 é aceito (filho vira nível 5, o teto)', () => {
        const dbRef = {
            grupos: [
                { id: 1, autorId: 10, paiId: null },
                { id: 2, autorId: 10, paiId: 1 },
                { id: 3, autorId: 10, paiId: 2 },
                { id: 4, autorId: 10, paiId: 3 },
            ],
        };
        assert.equal(obterGrupoPaiValido(dbRef, 5, 10, 4), 4);
    });

    it('recusa candidato de nível 5 — já é o teto, não pode ter filho (viraria nível 6)', () => {
        const dbRef = {
            grupos: [
                { id: 1, autorId: 10, paiId: null },
                { id: 2, autorId: 10, paiId: 1 },
                { id: 3, autorId: 10, paiId: 2 },
                { id: 4, autorId: 10, paiId: 3 },
                { id: 5, autorId: 10, paiId: 4 },
            ],
        };
        assert.equal(obterGrupoPaiValido(dbRef, 6, 10, 5), null);
    });

    it('recusa reatribuir um grupo que já tem neto pra um pai que estouraria o teto com a subárvore junto', () => {
        // "Amigos" (1) é nível 1 e já tem filho (2) que por sua vez tem
        // neto (3) — altura 2. "Base" (10) é nível 4: se "Amigos" virasse
        // filho de "Base", "Amigos" iria pra nível 5, o filho (2) pra
        // nível 6 e o neto (3) pra nível 7 — estoura o teto de 5. Bug real
        // corrigido 27/09/2026: antes só checava o nível de "Base"
        // (4 < 5, passava), sem olhar a altura da subárvore de "Amigos".
        const dbRef = {
            grupos: [
                { id: 1, nome: 'Amigos', autorId: 10, paiId: null },
                { id: 2, nome: 'Amigos de infância', autorId: 10, paiId: 1 },
                { id: 3, nome: 'Grupo do colégio', autorId: 10, paiId: 2 },
                { id: 7, autorId: 10, paiId: null },
                { id: 8, autorId: 10, paiId: 7 },
                { id: 9, autorId: 10, paiId: 8 },
                { id: 10, nome: 'Base', autorId: 10, paiId: 9 },
            ],
        };
        assert.equal(obterGrupoPaiValido(dbRef, 1, 10, 10), null);
    });

    it('aceita reatribuir um grupo com neto pra um pai raso o bastante pra subárvore inteira caber', () => {
        // Mesmo "Amigos" (altura 2) de cima, mas agora o candidato a pai é
        // nível 1 — "Amigos" vai pra nível 2, filho pra 3, neto pra 4:
        // cabe dentro do teto de 5.
        const dbRef = {
            grupos: [
                { id: 1, nome: 'Amigos', autorId: 10, paiId: null },
                { id: 2, nome: 'Amigos de infância', autorId: 10, paiId: 1 },
                { id: 3, nome: 'Grupo do colégio', autorId: 10, paiId: 2 },
                { id: 20, nome: 'Relações afetivas', autorId: 10, paiId: null },
            ],
        };
        assert.equal(obterGrupoPaiValido(dbRef, 1, 10, 20), 20);
    });

    it('paiIdCandidato null (querer virar nível 1) é aceito, sem checar mais nada', () => {
        const dbRef = { grupos: [] };
        assert.equal(obterGrupoPaiValido(dbRef, 2, 10, null), null);
    });

    it('recusa candidato de Autor DIFERENTE do grupo filho', () => {
        const dbRef = {
            grupos: [{ id: 1, nome: 'Família', autorId: 20, paiId: null }],
        };
        assert.equal(obterGrupoPaiValido(dbRef, 2, 10, 1), null);
    });

    it('recusa o grupo apontar pra si mesmo como pai', () => {
        const dbRef = {
            grupos: [{ id: 1, nome: 'Família', autorId: 10, paiId: null }],
        };
        assert.equal(obterGrupoPaiValido(dbRef, 1, 10, 1), null);
    });

    it('recusa candidato inexistente no cadastro', () => {
        const dbRef = { grupos: [] };
        assert.equal(obterGrupoPaiValido(dbRef, 2, 10, 999), null);
    });

    it('recusa ciclo: um grupo virar pai do próprio pai (o filho direto como candidato)', () => {
        const dbRef = {
            grupos: [
                { id: 1, nome: 'Família', autorId: 10, paiId: null },
                { id: 2, nome: 'Tios', autorId: 10, paiId: 1 },
            ],
        };
        // grupo 1 (pai de 2) tentando adotar 2 (seu próprio filho) como pai
        assert.equal(obterGrupoPaiValido(dbRef, 1, 10, 2), null);
    });

    it('recusa ciclo: um grupo virar pai de um neto seu', () => {
        const dbRef = {
            grupos: [
                { id: 1, nome: 'Ex-namorados', autorId: 10, paiId: null },
                { id: 2, nome: 'Pedro', autorId: 10, paiId: 1 },
                { id: 3, nome: 'Crushes de Pedro', autorId: 10, paiId: 2 },
            ],
        };
        // grupo 1 (avô de 3) tentando adotar 3 (seu próprio neto) como pai
        assert.equal(obterGrupoPaiValido(dbRef, 1, 10, 3), null);
    });
});

// ─── mesclarGrupos ───────────────────────────────────────────────────

describe('mesclarGrupos (junta dois Grupos do MESMO Autor numa só entrada)', () => {
    it('reatribui grupoIds de Pessoa e gruposDiretos de Poema/Prosa da origem pro destino', () => {
        const dbRef = {
            grupos: [
                { id: 1, nome: 'Família', autorId: 10, paiId: null },
                { id: 2, nome: 'Familia', autorId: 10, paiId: null },
            ],
            pessoas: [{ id: 100, nome: 'Ana', grupoIds: [2] }],
            poemas: [{ id: 200, gruposDiretos: [2] }],
            prosas: [{ id: 300, gruposDiretos: [2] }],
        };
        mesclarGrupos(dbRef, 2, 1);

        assert.deepEqual(dbRef.pessoas[0].grupoIds, [1]);
        assert.deepEqual(dbRef.poemas[0].gruposDiretos, [1]);
        assert.deepEqual(dbRef.prosas[0].gruposDiretos, [1]);
        assert.equal(dbRef.grupos.length, 1);
        assert.equal(dbRef.grupos[0].id, 1);
    });

    it('não duplica vínculo se a Pessoa/texto já tiver os dois ids (origem e destino)', () => {
        const dbRef = {
            grupos: [
                { id: 1, nome: 'Família', autorId: 10, paiId: null },
                { id: 2, nome: 'Familia', autorId: 10, paiId: null },
            ],
            pessoas: [{ id: 100, nome: 'Ana', grupoIds: [1, 2] }],
            poemas: [],
            prosas: [],
        };
        mesclarGrupos(dbRef, 2, 1);

        assert.deepEqual(dbRef.pessoas[0].grupoIds, [1]);
    });

    it('reatribui os subgrupos da origem (paiId == origemId) pro destino', () => {
        const dbRef = {
            grupos: [
                { id: 1, nome: 'Família', autorId: 10, paiId: null },
                { id: 2, nome: 'Familia', autorId: 10, paiId: null },
                { id: 3, nome: 'Tios', autorId: 10, paiId: 2 },
            ],
            pessoas: [],
            poemas: [],
            prosas: [],
        };
        mesclarGrupos(dbRef, 2, 1);

        const tios = dbRef.grupos.find((g) => g.id == 3);
        assert.equal(tios.paiId, 1);
    });

    it('recusa mesclar Grupos de Autores DIFERENTES', () => {
        const dbRef = {
            grupos: [
                { id: 1, nome: 'Família', autorId: 10, paiId: null },
                { id: 2, nome: 'Família', autorId: 20, paiId: null },
            ],
            pessoas: [],
            poemas: [],
            prosas: [],
        };
        mesclarGrupos(dbRef, 2, 1);

        assert.equal(dbRef.grupos.length, 2, 'não deveria mesclar grupos de Autores diferentes');
    });

    it('não faz nada se origem e destino forem o mesmo id', () => {
        const dbRef = {
            grupos: [{ id: 1, nome: 'Família', autorId: 10, paiId: null }],
            pessoas: [],
            poemas: [],
            prosas: [],
        };
        mesclarGrupos(dbRef, 1, 1);
        assert.equal(dbRef.grupos.length, 1);
    });

    it('não faz nada se origem ou destino não existirem no cadastro', () => {
        const dbRef = {
            grupos: [{ id: 1, nome: 'Família', autorId: 10, paiId: null }],
            pessoas: [],
            poemas: [],
            prosas: [],
        };
        mesclarGrupos(dbRef, 999, 1);
        assert.equal(dbRef.grupos.length, 1);
    });

    it('recusa mesclar quando reatribuir a subárvore da origem estouraria o teto', () => {
        const dbRef = {
            // destino já é nível 4 (bisneto de 1); origem é nível 1 mas
            // tem um subgrupo (3) que por sua vez tem o seu próprio
            // subgrupo (4b) — altura 2. Reatribuir essa subárvore pro
            // destino (nível 4) faria 3 virar nível 5 e 4b virar nível 6,
            // estourando o teto de 5.
            grupos: [
                { id: 1, autorId: 10, paiId: null },
                { id: 6, autorId: 10, paiId: 1 },
                { id: 7, autorId: 10, paiId: 6 },
                { id: 2, nome: 'Atual', autorId: 10, paiId: 7 },
                { id: 5, nome: 'Origem', autorId: 10, paiId: null },
                { id: 3, nome: 'Amigos de Origem', autorId: 10, paiId: 5 },
                { id: 4, nome: 'Crushes de Amigos', autorId: 10, paiId: 3 },
            ],
            pessoas: [],
            poemas: [],
            prosas: [],
        };
        mesclarGrupos(dbRef, 5, 2);

        assert.equal(dbRef.grupos.length, 7, 'nada deveria mudar, a mesclagem é recusada');
        assert.equal(dbRef.grupos.find((g) => g.id == 3).paiId, 5, 'subgrupo continua na origem');
    });

    it('permite mesclar quando a subárvore reatribuída ainda cabe no teto', () => {
        // destino é nível 1; origem é nível 1 com um subgrupo só (sem
        // neto) — reatribuir esse subgrupo pro destino deixa ele em
        // nível 2, dentro do limite.
        const dbRef = {
            grupos: [
                { id: 1, nome: 'Família', autorId: 10, paiId: null },
                { id: 2, nome: 'Familia', autorId: 10, paiId: null },
                { id: 3, nome: 'Tios', autorId: 10, paiId: 2 },
            ],
            pessoas: [],
            poemas: [],
            prosas: [],
        };
        mesclarGrupos(dbRef, 2, 1);

        assert.equal(dbRef.grupos.length, 2);
        assert.equal(dbRef.grupos.find((g) => g.id == 3).paiId, 1);
    });
});

// ─── calcularImpactoExclusaoGrupo ───────────────────────────────────

describe('calcularImpactoExclusaoGrupo (quem referencia o Grupo, pra avisar antes de excluir)', () => {
    it('encontra pessoas que pertencem ao grupo', () => {
        const dbRef = {
            pessoas: [
                { id: 1, nome: 'Ana', grupoIds: [10] },
                { id: 2, nome: 'Beto', grupoIds: [20] },
            ],
            poemas: [],
            prosas: [],
        };
        const { pessoasIds, poemasIds, prosasIds } = calcularImpactoExclusaoGrupo(dbRef, 10);
        assert.deepEqual(pessoasIds, [1]);
        assert.deepEqual(poemasIds, []);
        assert.deepEqual(prosasIds, []);
    });

    it('encontra também poemas e prosas que referenciam o grupo diretamente (sem pessoa)', () => {
        const dbRef = {
            pessoas: [],
            poemas: [
                { id: 100, gruposDiretos: [10] },
                { id: 101, gruposDiretos: [20] },
            ],
            prosas: [{ id: 200, gruposDiretos: [10] }],
        };
        const { pessoasIds, poemasIds, prosasIds } = calcularImpactoExclusaoGrupo(dbRef, 10);
        assert.deepEqual(pessoasIds, []);
        assert.deepEqual(poemasIds, [100]);
        assert.deepEqual(prosasIds, [200]);
    });

    it('combina os dois tipos de vínculo (via pessoa e direto) sem misturar as listas', () => {
        const dbRef = {
            pessoas: [{ id: 1, nome: 'Ana', grupoIds: [10] }],
            poemas: [{ id: 100, gruposDiretos: [10] }],
            prosas: [],
        };
        const { pessoasIds, poemasIds, prosasIds } = calcularImpactoExclusaoGrupo(dbRef, 10);
        assert.deepEqual(pessoasIds, [1]);
        assert.deepEqual(poemasIds, [100]);
        assert.deepEqual(prosasIds, []);
    });

    it('grupo sem nenhum vínculo retorna listas vazias', () => {
        const dbRef = {
            pessoas: [{ id: 1, nome: 'Ana', grupoIds: [10] }],
            poemas: [{ id: 100, gruposDiretos: [10] }],
            prosas: [],
        };
        const { pessoasIds, poemasIds, prosasIds } = calcularImpactoExclusaoGrupo(dbRef, 999);
        assert.deepEqual(pessoasIds, []);
        assert.deepEqual(poemasIds, []);
        assert.deepEqual(prosasIds, []);
    });

    it('funciona mesmo se pessoas/poemas/prosas estiverem ausentes do db (backup antigo)', () => {
        const { pessoasIds, poemasIds, prosasIds } = calcularImpactoExclusaoGrupo({}, 10);
        assert.deepEqual(pessoasIds, []);
        assert.deepEqual(poemasIds, []);
        assert.deepEqual(prosasIds, []);
    });

    it('item com gruposDiretos ausente (dado antigo, sem o campo) não quebra e não bate', () => {
        const dbRef = {
            pessoas: [],
            poemas: [{ id: 100 }],
            prosas: [{ id: 200 }],
        };
        const { poemasIds, prosasIds } = calcularImpactoExclusaoGrupo(dbRef, 10);
        assert.deepEqual(poemasIds, []);
        assert.deepEqual(prosasIds, []);
    });
});

// ─── migrarEpocas ───────────────────────────────────────────────────

describe('migrarEpocas (item 3 do plano de schema — cadastro central de Épocas)', () => {
    it('cria uma Época pra cada nome único e troca {nome} por {epocaId} no poema', () => {
        const dbRef = {
            epocas: [],
            poemas: [{ id: 1, epocaRetratada: { nome: 'Luto', inicio: null, fim: null } }],
        };
        migrarEpocas(dbRef);
        assert.equal(dbRef.epocas.length, 1);
        assert.equal(dbRef.epocas[0].nome, 'Luto');
        assert.equal(dbRef.poemas[0].epocaRetratada.epocaId, dbRef.epocas[0].id);
        assert.equal(dbRef.poemas[0].epocaRetratada.nome, undefined);
    });

    it('dedup por nome exato: dois poemas com o mesmo nome apontam pra uma única Época', () => {
        const dbRef = {
            epocas: [],
            poemas: [
                { id: 1, epocaRetratada: { nome: 'Pandemia' } },
                { id: 2, epocaRetratada: { nome: 'Pandemia' } },
            ],
        };
        migrarEpocas(dbRef);
        assert.equal(dbRef.epocas.length, 1);
        assert.equal(
            dbRef.poemas[0].epocaRetratada.epocaId,
            dbRef.poemas[1].epocaRetratada.epocaId,
        );
    });

    it('"X" e "X e Pós" viram duas Épocas separadas (limitação conhecida, igual Pessoas)', () => {
        const dbRef = {
            epocas: [],
            poemas: [
                { id: 1, epocaRetratada: { nome: 'Namoro' } },
                { id: 2, epocaRetratada: { nome: 'Namoro e Pós' } },
            ],
        };
        migrarEpocas(dbRef);
        assert.equal(dbRef.epocas.length, 2);
    });

    it('recorte vem sempre null no dado migrado (não dá pra adivinhar a partir do nome antigo)', () => {
        const dbRef = { epocas: [], poemas: [{ id: 1, epocaRetratada: { nome: 'Luto' } }] };
        migrarEpocas(dbRef);
        assert.equal(dbRef.poemas[0].epocaRetratada.recorte, null);
    });

    it('preserva inicio/fim/na do dado antigo', () => {
        const dbRef = {
            epocas: [],
            poemas: [
                {
                    id: 1,
                    epocaRetratada: { nome: 'Luto', inicio: { ano: 2022 }, fim: null, na: false },
                },
            ],
        };
        migrarEpocas(dbRef);
        assert.deepEqual(dbRef.poemas[0].epocaRetratada.inicio, { ano: 2022 });
        assert.equal(dbRef.poemas[0].epocaRetratada.na, false);
    });

    it('epocaRetratada sem nome (N/A puro ou só datas) migra com epocaId: null', () => {
        const dbRef = {
            epocas: [],
            poemas: [{ id: 1, epocaRetratada: { nome: '', na: true } }],
        };
        migrarEpocas(dbRef);
        assert.equal(dbRef.poemas[0].epocaRetratada.epocaId, null);
        assert.equal(dbRef.epocas.length, 0);
    });

    it('poema sem epocaRetratada não é afetado', () => {
        const dbRef = { epocas: [], poemas: [{ id: 1 }] };
        migrarEpocas(dbRef);
        assert.equal(dbRef.poemas[0].epocaRetratada, undefined);
    });

    it('idempotente: item cuja epocaRetratada já tem epocaId passa intacto', () => {
        const dbRef = {
            epocas: [{ id: 5, nome: 'Luto', notas: '' }],
            poemas: [{ id: 1, epocaRetratada: { epocaId: 5, inicio: null, fim: null } }],
        };
        migrarEpocas(dbRef);
        assert.equal(dbRef.epocas.length, 1);
        assert.equal(dbRef.poemas[0].epocaRetratada.epocaId, 5);
    });

    it('nome que já tem Época cadastrada reaproveita o id em vez de duplicar', () => {
        const dbRef = {
            epocas: [{ id: 7, nome: 'Luto', notas: '' }],
            poemas: [{ id: 1, epocaRetratada: { nome: 'Luto' } }],
        };
        migrarEpocas(dbRef);
        assert.equal(dbRef.epocas.length, 1);
        assert.equal(dbRef.poemas[0].epocaRetratada.epocaId, 7);
    });
});

// ─── calcularImpactoExclusaoEpoca ───────────────────────────────────

describe('calcularImpactoExclusaoEpoca (quem referencia a Época, pra avisar antes de excluir)', () => {
    it('encontra os poemas cuja epocaRetratada aponta pra essa época', () => {
        const dbRef = {
            poemas: [
                { id: 1, epocaRetratada: { epocaId: 10 } },
                { id: 2, epocaRetratada: { epocaId: 20 } },
                { id: 3, epocaRetratada: { epocaId: 10 } },
            ],
        };
        const { poemasIds } = calcularImpactoExclusaoEpoca(dbRef, 10);
        assert.deepEqual(poemasIds, [1, 3]);
    });

    it('encontra também as prosas cuja epocaRetratada aponta pra essa época (gap corrigido — só checava poemas antes)', () => {
        const dbRef = {
            poemas: [{ id: 1, epocaRetratada: { epocaId: 10 } }],
            prosas: [
                { id: 100, epocaRetratada: { epocaId: 10 } },
                { id: 101, epocaRetratada: { epocaId: 20 } },
            ],
        };
        const { poemasIds, prosasIds } = calcularImpactoExclusaoEpoca(dbRef, 10);
        assert.deepEqual(poemasIds, [1]);
        assert.deepEqual(prosasIds, [100]);
    });

    it('época sem nenhum vínculo retorna listas vazias', () => {
        const dbRef = { poemas: [{ id: 1, epocaRetratada: { epocaId: 10 } }] };
        const { poemasIds, prosasIds } = calcularImpactoExclusaoEpoca(dbRef, 999);
        assert.deepEqual(poemasIds, []);
        assert.deepEqual(prosasIds, []);
    });

    it('funciona mesmo se poemas/prosas estiverem ausentes do db (backup antigo)', () => {
        const { poemasIds, prosasIds } = calcularImpactoExclusaoEpoca({}, 10);
        assert.deepEqual(poemasIds, []);
        assert.deepEqual(prosasIds, []);
    });
});

// ─── calcularImpactoExclusaoPoema ───────────────────────────────────

describe('calcularImpactoExclusaoPoema (quem referencia o Poema do lado de Moldes, pra avisar antes de excluir)', () => {
    it('encontra o Molde cujo poemaId aponta pra esse Poema (já promovido)', () => {
        const dbRef = {
            moldes: [
                { id: 1, status: 'promovido', poemaId: 50 },
                { id: 2, status: 'em andamento', poemaId: null },
                { id: 3, status: 'promovido', poemaId: 51 },
            ],
        };
        const { moldesIds } = calcularImpactoExclusaoPoema(dbRef, 50);
        assert.deepEqual(moldesIds, [1]);
    });

    it('poema sem nenhum Molde de origem retorna lista vazia', () => {
        const dbRef = { moldes: [{ id: 1, status: 'promovido', poemaId: 50 }] };
        const { moldesIds } = calcularImpactoExclusaoPoema(dbRef, 999);
        assert.deepEqual(moldesIds, []);
    });

    it('funciona mesmo se moldes estiver ausente do db (backup antigo)', () => {
        const { moldesIds } = calcularImpactoExclusaoPoema({}, 50);
        assert.deepEqual(moldesIds, []);
    });
});

// ─── mesclarPessoas ──────────────────────────────────────────────

describe('mesclarPessoas (junta duas entradas do cadastro de Pessoas numa só)', () => {
    it('reatribui pessoaId da origem pro destino em poemas e prosas', () => {
        const dbRef = {
            pessoas: [
                { id: 1, nome: 'Pedro', grupoIds: [] },
                { id: 2, nome: 'Pedro ', grupoIds: [] },
            ],
            poemas: [{ id: 10, pessoas: [{ pessoaId: 2, papeis: ['Retratado(a)'] }] }],
            prosas: [{ id: 20, pessoas: [{ pessoaId: 2, papeis: ['Mencionado(a)'] }] }],
        };
        mesclarPessoas(dbRef, 2, 1);
        assert.equal(dbRef.poemas[0].pessoas[0].pessoaId, 1);
        assert.equal(dbRef.prosas[0].pessoas[0].pessoaId, 1);
        assert.equal(dbRef.pessoas.length, 1);
        assert.equal(dbRef.pessoas[0].id, 1);
    });

    it('une papeis quando o mesmo item já vinculava as duas pessoas, sem deixar entrada duplicada', () => {
        const dbRef = {
            pessoas: [
                { id: 1, nome: 'Pedro', grupoIds: [] },
                { id: 2, nome: 'Pedro (dup)', grupoIds: [] },
            ],
            poemas: [
                {
                    id: 10,
                    pessoas: [
                        { pessoaId: 1, papeis: ['Retratado(a)'] },
                        { pessoaId: 2, papeis: ['Dedicatário(a)'] },
                    ],
                },
            ],
            prosas: [],
        };
        mesclarPessoas(dbRef, 2, 1);
        assert.equal(dbRef.poemas[0].pessoas.length, 1);
        assert.deepEqual(
            new Set(dbRef.poemas[0].pessoas[0].papeis),
            new Set(['Retratado(a)', 'Dedicatário(a)']),
        );
    });

    it('une grupoIds das duas pessoas sem duplicar', () => {
        const dbRef = {
            pessoas: [
                { id: 1, nome: 'Pedro', grupoIds: [100] },
                { id: 2, nome: 'Pedro (dup)', grupoIds: [100, 200] },
            ],
            poemas: [],
            prosas: [],
        };
        mesclarPessoas(dbRef, 2, 1);
        assert.deepEqual(new Set(dbRef.pessoas[0].grupoIds), new Set([100, 200]));
    });

    it('une autorIds das duas pessoas sem duplicar', () => {
        const dbRef = {
            pessoas: [
                { id: 1, nome: 'Pedro', grupoIds: [], autorIds: [10] },
                { id: 2, nome: 'Pedro (dup)', grupoIds: [], autorIds: [10, 20] },
            ],
            poemas: [],
            prosas: [],
        };
        mesclarPessoas(dbRef, 2, 1);
        assert.deepEqual(new Set(dbRef.pessoas[0].autorIds), new Set([10, 20]));
    });

    it('não faz nada se origem e destino forem o mesmo id', () => {
        const dbRef = { pessoas: [{ id: 1, nome: 'Pedro', grupoIds: [] }], poemas: [], prosas: [] };
        mesclarPessoas(dbRef, 1, 1);
        assert.equal(dbRef.pessoas.length, 1);
    });

    it('não faz nada se origem ou destino não existirem no cadastro', () => {
        const dbRef = { pessoas: [{ id: 1, nome: 'Pedro', grupoIds: [] }], poemas: [], prosas: [] };
        mesclarPessoas(dbRef, 999, 1);
        assert.equal(dbRef.pessoas.length, 1);
    });
});

// ─── mesclarEpocas ───────────────────────────────────────────────

describe('mesclarEpocas (junta duas entradas do cadastro de Épocas numa só)', () => {
    it('reatribui epocaId da origem pro destino em poemas e prosas', () => {
        const dbRef = {
            epocas: [
                { id: 1, nome: 'Corte de contato', notas: '' },
                { id: 2, nome: 'Corte de contato', notas: '' },
            ],
            poemas: [{ id: 10, epocaRetratada: { epocaId: 2 } }],
            prosas: [{ id: 20, epocaRetratada: { epocaId: 2 } }],
        };
        mesclarEpocas(dbRef, 2, 1);
        assert.deepEqual(dbRef.poemas[0].epocaRetratada.periodos, [{ epocaId: 1, recorte: null }]);
        assert.deepEqual(dbRef.prosas[0].epocaRetratada.periodos, [{ epocaId: 1, recorte: null }]);
        assert.equal(dbRef.poemas[0].epocaRetratada.epocaId, undefined);
        assert.equal(dbRef.epocas.length, 1);
        assert.equal(dbRef.epocas[0].id, 1);
    });

    it('texto com os dois períodos fica com um só (o recorte do destino vale, senão herda o da origem)', () => {
        const dbRef = {
            epocas: [
                { id: 1, nome: 'Luto', notas: '' },
                { id: 2, nome: 'Luto', notas: '' },
                { id: 3, nome: 'Faculdade', notas: '' },
            ],
            poemas: [
                {
                    id: 10,
                    epocaRetratada: {
                        periodos: [
                            { epocaId: 3, recorte: 'momento' },
                            { epocaId: 2, recorte: 'repercussão' },
                            { epocaId: 1, recorte: null },
                        ],
                    },
                },
            ],
            prosas: [],
        };
        mesclarEpocas(dbRef, 2, 1);
        assert.deepEqual(dbRef.poemas[0].epocaRetratada.periodos, [
            { epocaId: 3, recorte: 'momento' },
            { epocaId: 1, recorte: 'repercussão' },
        ]);
    });

    it('preenche as notas do destino a partir da origem, só se o destino estiver vazio', () => {
        const dbRef = {
            epocas: [
                { id: 1, nome: 'Corte de contato', notas: '' },
                { id: 2, nome: 'Corte de contato', notas: 'período difícil' },
            ],
            poemas: [],
            prosas: [],
        };
        mesclarEpocas(dbRef, 2, 1);
        assert.equal(dbRef.epocas[0].notas, 'período difícil');
    });

    it('nunca sobrescreve as notas do destino já preenchidas', () => {
        const dbRef = {
            epocas: [
                { id: 1, nome: 'Corte de contato', notas: 'nota original' },
                { id: 2, nome: 'Corte de contato', notas: 'outra nota' },
            ],
            poemas: [],
            prosas: [],
        };
        mesclarEpocas(dbRef, 2, 1);
        assert.equal(dbRef.epocas[0].notas, 'nota original');
    });

    it('não faz nada se origem e destino forem o mesmo id', () => {
        const dbRef = {
            epocas: [{ id: 1, nome: 'Luto', notas: '' }],
            poemas: [],
            prosas: [],
        };
        mesclarEpocas(dbRef, 1, 1);
        assert.equal(dbRef.epocas.length, 1);
    });

    it('não faz nada se origem ou destino não existirem no cadastro', () => {
        const dbRef = {
            epocas: [{ id: 1, nome: 'Luto', notas: '' }],
            poemas: [],
            prosas: [],
        };
        mesclarEpocas(dbRef, 999, 1);
        assert.equal(dbRef.epocas.length, 1);
    });

    it('recusa mesclar Épocas de Autores DIFERENTES (Período Biográfico é exclusivo de um Autor)', () => {
        const dbRef = {
            epocas: [
                { id: 1, nome: 'Corte de contato', notas: '', autorId: 10 },
                { id: 2, nome: 'Corte de contato', notas: '', autorId: 20 },
            ],
            poemas: [],
            prosas: [],
        };
        mesclarEpocas(dbRef, 2, 1);
        assert.equal(dbRef.epocas.length, 2, 'não deveria mesclar épocas de Autores diferentes');
    });
});

// ─── obterOuCriarPeriodoHistoricoPorNome ────────────────────────────

describe('obterOuCriarPeriodoHistoricoPorNome (dedup por nome exato, mesmo padrão de Grupo)', () => {
    // `db.periodosHistoricos` já vem com os 16 períodos de fábrica (seed) e é
    // o `db` real do módulo, compartilhado com os describes seguintes (ex.:
    // "Seed de Período Histórico"). Zerar aqui sem restaurar deixava o
    // cadastro com 0/1 item pra quem rodasse depois — mesmo tipo de vazamento
    // entre testes já corrigido em filtro-periodos-dom.test.js.
    const seedOriginal = structuredClone(db.periodosHistoricos);

    beforeEach(() => {
        db.periodosHistoricos.length = 0;
    });

    afterEach(() => {
        db.periodosHistoricos.length = 0;
        db.periodosHistoricos.push(...structuredClone(seedOriginal));
    });

    it('nome que já existe no cadastro retorna o período existente, sem duplicar', () => {
        db.periodosHistoricos.push({ id: 1, nome: 'Ditadura Militar', notas: '' });

        const periodo = obterOuCriarPeriodoHistoricoPorNome('Ditadura Militar');

        assert.equal(periodo.id, 1);
        assert.equal(db.periodosHistoricos.length, 1);
    });

    it('nome novo cria um Período Histórico', () => {
        const periodo = obterOuCriarPeriodoHistoricoPorNome('Pandemia de Covid-19');

        assert.equal(db.periodosHistoricos.length, 1);
        assert.equal(periodo.nome, 'Pandemia de Covid-19');
    });

    it('nome com espaços nas pontas é normalizado antes de comparar/criar', () => {
        db.periodosHistoricos.push({ id: 1, nome: 'Pandemia de Covid-19', notas: '' });

        const periodo = obterOuCriarPeriodoHistoricoPorNome('  Pandemia de Covid-19  ');

        assert.equal(periodo.id, 1);
        assert.equal(
            db.periodosHistoricos.length,
            1,
            'não deveria criar um período duplicado só por espaços',
        );
    });

    it('nome vazio (ou só espaços) retorna null sem criar nada', () => {
        const periodo = obterOuCriarPeriodoHistoricoPorNome('   ');
        assert.equal(periodo, null);
        assert.equal(db.periodosHistoricos.length, 0);
    });

    it('período criado por nome nasce com `regiao` vazia (preenche depois, na gestão)', () => {
        const periodo = obterOuCriarPeriodoHistoricoPorNome('Enchente de 2024');
        assert.deepEqual(periodo.regiao, []);
    });

    it('período criado por nome fica com inicio/fim null (data se preenche depois, na gestão)', () => {
        const periodo = obterOuCriarPeriodoHistoricoPorNome('Semana de Arte Moderna');
        assert.equal(periodo.inicio, null);
        assert.equal(periodo.fim, null);
    });
});

// ─── migrarDatasPeriodoHistorico ─────────────────────────────────────

describe('migrarDatasPeriodoHistorico (período histórico cadastrado antes de inicio/fim existirem)', () => {
    it('preenche inicio/fim com null quando ausentes', () => {
        const periodosHistoricos = [{ id: 1, nome: 'Ditadura Militar', notas: '' }];
        migrarDatasPeriodoHistorico(periodosHistoricos);
        assert.equal(periodosHistoricos[0].inicio, null);
        assert.equal(periodosHistoricos[0].fim, null);
    });

    it('é idempotente: não sobrescreve inicio/fim já preenchidos', () => {
        const periodosHistoricos = [
            {
                id: 1,
                nome: 'Segunda Guerra Mundial',
                notas: '',
                inicio: { dia: 1, mes: 9, ano: 1939 },
                fim: { dia: 2, mes: 9, ano: 1945 },
            },
        ];
        migrarDatasPeriodoHistorico(periodosHistoricos);
        assert.deepEqual(periodosHistoricos[0].inicio, { dia: 1, mes: 9, ano: 1939 });
        assert.deepEqual(periodosHistoricos[0].fim, { dia: 2, mes: 9, ano: 1945 });
    });

    it('não confunde fim já null explícito com ausente (continua null, sem erro)', () => {
        const periodosHistoricos = [
            { id: 1, nome: 'Pandemia de Covid-19', notas: '', inicio: { ano: 2020 }, fim: null },
        ];
        migrarDatasPeriodoHistorico(periodosHistoricos);
        assert.deepEqual(periodosHistoricos[0].inicio, { ano: 2020 });
        assert.equal(periodosHistoricos[0].fim, null);
    });
});

// ─── migrarDatasEpoca / datas oficiais do Período Biográfico ─────────

describe('migrarDatasEpoca (Período Biográfico cadastrado antes de inicio/fim existirem)', () => {
    it('preenche inicio/fim com null quando ausentes, sem deduzir dos textos', () => {
        const epocas = [{ id: 1, nome: 'Luto', notas: '', autorId: 1 }];
        migrarDatasEpoca(epocas);
        assert.equal(epocas[0].inicio, null);
        assert.equal(epocas[0].fim, null);
    });

    it('é idempotente: não sobrescreve datas já preenchidas', () => {
        const epocas = [{ id: 1, nome: 'Luto', inicio: { ano: 2020 }, fim: { mes: 3, ano: 2021 } }];
        migrarDatasEpoca(epocas);
        assert.deepEqual(epocas[0].inicio, { ano: 2020 });
        assert.deepEqual(epocas[0].fim, { mes: 3, ano: 2021 });
    });
});

describe('mesclarEpocas (datas oficiais do cadastro)', () => {
    const base = (destino, origem) => ({
        epocas: [
            { id: 1, nome: 'A', autorId: 7, notas: '', ...destino },
            { id: 2, nome: 'A', autorId: 7, notas: '', ...origem },
        ],
        poemas: [],
        prosas: [],
    });

    it('destino mantém as próprias datas mesmo se a origem tiver outras', () => {
        const dbRef = base(
            { inicio: { ano: 2018 }, fim: { ano: 2019 } },
            { inicio: { ano: 2000 }, fim: { ano: 2001 } },
        );
        mesclarEpocas(dbRef, 2, 1);
        assert.deepEqual(dbRef.epocas[0].inicio, { ano: 2018 });
        assert.deepEqual(dbRef.epocas[0].fim, { ano: 2019 });
    });

    it('destino herda da origem só o que estiver vazio', () => {
        const dbRef = base(
            { inicio: { ano: 2018 }, fim: null },
            { inicio: { ano: 2000 }, fim: { ano: 2001 } },
        );
        mesclarEpocas(dbRef, 2, 1);
        assert.deepEqual(dbRef.epocas[0].inicio, { ano: 2018 });
        assert.deepEqual(dbRef.epocas[0].fim, { ano: 2001 });
    });
});

// ─── migrarMovimentosEscolasEmbutidos ────────────────────────────────

describe('migrarMovimentosEscolasEmbutidos (cadastro de Movimento/Escola ganhando novos itens de fábrica, ex.: Tropicalismo)', () => {
    // `db.movimentosEscolas` já passou pelo seed + pela própria migração
    // no momento em que este módulo foi importado, então reflete o
    // cadastro de fábrica completo e atualizado (todos
    // `embutido: true`) — usamos esse estado como base pra simular
    // instalações antigas, em vez de reescrever o seed aqui.
    const seedCompleto = () => structuredClone(db.movimentosEscolas);
    // Tamanho do cadastro de fábrica completo (22 originais + as divisões do
    // Romantismo). Os testes abaixo tiram só o Tropicalismo, então esperam
    // este total menos um.
    const TOTAL_DE_FABRICA = seedCompleto().length;

    it('instalação antiga (sem `embutido`, sem Tropicalismo) ganha só o item novo, sem duplicar os demais', () => {
        const antigos = seedCompleto()
            .filter((m) => m.nome !== 'Tropicalismo')
            .map((m) => {
                delete m.embutido;
                return m;
            });
        assert.equal(antigos.length, TOTAL_DE_FABRICA - 1);

        migrarMovimentosEscolasEmbutidos(antigos, []);

        assert.equal(antigos.length, TOTAL_DE_FABRICA);
        const porNome = antigos.filter((m) => m.nome === 'Tropicalismo');
        assert.equal(porNome.length, 1);
        assert.equal(porNome[0].embutido, true);
        // os 21 originais não duplicaram — cada nome do seed aparece uma
        // única vez no resultado.
        const nomesSeed = seedCompleto().map((m) => m.nome);
        nomesSeed.forEach((nome) => {
            assert.equal(
                antigos.filter((m) => m.nome === nome).length,
                1,
                `"${nome}" deveria aparecer uma única vez`,
            );
        });
    });

    it('backfill: marca `embutido: true` por nome nos originais que não tinham a chave', () => {
        const antigos = seedCompleto()
            .filter((m) => m.nome !== 'Tropicalismo')
            .map((m) => {
                delete m.embutido;
                return m;
            });
        migrarMovimentosEscolasEmbutidos(antigos, []);
        antigos
            .filter((m) => m.nome !== 'Tropicalismo')
            .forEach((m) => assert.equal(m.embutido, true));
    });

    it('item de fábrica excluído de propósito (em `ocultos`) não volta', () => {
        const antigos = seedCompleto()
            .filter((m) => m.nome !== 'Tropicalismo')
            .map((m) => {
                delete m.embutido;
                return m;
            });
        migrarMovimentosEscolasEmbutidos(antigos, ['Tropicalismo']);
        assert.equal(antigos.length, TOTAL_DE_FABRICA - 1);
        assert.equal(
            antigos.some((m) => m.nome === 'Tropicalismo'),
            false,
        );
    });

    it('é idempotente: rodar de novo num cadastro já completo não duplica nada', () => {
        const completos = seedCompleto();
        migrarMovimentosEscolasEmbutidos(completos, []);
        assert.equal(completos.length, TOTAL_DE_FABRICA);
    });

    it('não mexe em movimento personalizado do usuário (nome fora do seed)', () => {
        const antigos = seedCompleto()
            .filter((m) => m.nome !== 'Tropicalismo')
            .map((m) => {
                delete m.embutido;
                return m;
            });
        antigos.push({ id: 'custom-1', nome: 'Movimento Inventado por Mim', notas: '' });

        migrarMovimentosEscolasEmbutidos(antigos, []);

        const custom = antigos.find((m) => m.nome === 'Movimento Inventado por Mim');
        assert.ok(custom);
        assert.equal(custom.embutido, undefined);
        assert.equal(antigos.filter((m) => m.nome === 'Movimento Inventado por Mim').length, 1);
    });
});

// ─── Seed de Período Histórico ──────────────────────────────────────

describe('Seed de Período Histórico (16 períodos de relevância ampla/internacional pra literatura)', () => {
    // Mesma técnica de seedCompleto() usada pra Movimento/Escola acima:
    // `db.periodosHistoricos` já passou pelo seed no momento em que este
    // módulo foi importado.
    const seedCompleto = () => structuredClone(db.periodosHistoricos);

    it('tem os 16 períodos, todos `embutido: true` e com nome único', () => {
        const seed = seedCompleto();
        assert.equal(seed.length, 16);
        seed.forEach((p) => assert.equal(p.embutido, true));
        const nomes = seed.map((p) => p.nome);
        assert.equal(new Set(nomes).size, 16, 'nomes deveriam ser todos únicos');
    });

    it('ids são únicos e cada item tem `notas` preenchida (contexto literário)', () => {
        const seed = seedCompleto();
        const ids = seed.map((p) => p.id);
        assert.equal(new Set(ids).size, 16);
        seed.forEach((p) => assert.ok(p.notas && p.notas.length > 0, `"${p.nome}" sem notas`));
    });

    it('inclui os períodos pedidos pelo Victor: Guerras Mundiais e Semana de Arte Moderna', () => {
        const nomes = seedCompleto().map((p) => p.nome);
        assert.ok(nomes.includes('Primeira Guerra Mundial'));
        assert.ok(nomes.includes('Segunda Guerra Mundial'));
        assert.ok(nomes.includes('Semana de Arte Moderna'));
    });

    it('toda data tem só as chaves realmente preenchidas (nunca dia/mes/ano como `null` explícito)', () => {
        seedCompleto().forEach((p) => {
            [p.inicio, p.fim].forEach((data) => {
                if (data === null) return;
                Object.values(data).forEach((v) => assert.notEqual(v, null));
            });
        });
    });

    it('todo período com início e fim no mesmo campo (ano) tem início <= fim', () => {
        seedCompleto().forEach((p) => {
            if (p.inicio?.ano != null && p.fim?.ano != null) {
                assert.ok(
                    p.inicio.ano <= p.fim.ano,
                    `"${p.nome}": início (${p.inicio.ano}) depois do fim (${p.fim.ano})`,
                );
            }
        });
    });

    it('todo período de fábrica tem `regiao` preenchida (lista de lugares, sem espaços nas pontas)', () => {
        seedCompleto().forEach((p) => {
            assert.ok(Array.isArray(p.regiao), `"${p.nome}" sem regiao em lista`);
            assert.ok(p.regiao.length > 0, `"${p.nome}" com regiao vazia`);
            p.regiao.forEach((lugar) => {
                assert.equal(typeof lugar, 'string');
                assert.ok(lugar.length > 0);
                assert.equal(lugar, lugar.trim());
            });
        });
    });

    it('regiões dos recortes locais e dos globais estão coerentes', () => {
        const porNome = Object.fromEntries(seedCompleto().map((p) => [p.nome, p.regiao]));
        assert.deepEqual(porNome['Semana de Arte Moderna'], ['Brasil']);
        assert.deepEqual(porNome['Ditadura Militar Brasileira'], ['Brasil']);
        assert.deepEqual(porNome['Estado Novo (Portugal)'], ['Portugal']);
        assert.deepEqual(porNome['Guerra Fria'], ['Internacional']);
        assert.deepEqual(porNome['Segunda Guerra Mundial'], ['Internacional']);
    });

    it('as quatro Revoluções Industriais estão no seed, a Terceira e a Quarta com datas aproximadas e a Quarta em curso', () => {
        const porNome = Object.fromEntries(seedCompleto().map((p) => [p.nome, p]));
        const terceira = porNome['Terceira Revolução Industrial (Era da Informação)'];
        const quarta = porNome['Quarta Revolução Industrial (Indústria 4.0)'];
        assert.ok(porNome['Primeira Revolução Industrial']);
        assert.ok(porNome['Segunda Revolução Industrial']);
        assert.ok(terceira, 'Terceira Revolução Industrial ausente');
        assert.ok(quarta, 'Quarta Revolução Industrial ausente');
        assert.equal(terceira.inicio.ano, 1950);
        assert.equal(terceira.fim.ano, 2000);
        assert.equal(quarta.inicio.ano, 2011);
        assert.ok(!quarta.fim?.ano, 'a Quarta está em curso (sem fim)');
        assert.deepEqual(terceira.regiao, ['Internacional']);
        assert.deepEqual(quarta.regiao, ['Internacional']);
    });

    it('Semana de Arte Moderna tem a mesma âncora de 1922 já usada em Modernismo (Movimento/Escola)', () => {
        const semana = seedCompleto().find((p) => p.nome === 'Semana de Arte Moderna');
        assert.equal(semana.inicio.ano, 1922);
        const modernismo = db.movimentosEscolas.find((m) => m.nome === 'Modernismo');
        assert.equal(modernismo.inicio.decada, 1922);
    });
});

// ─── migrarPeriodosHistoricosEmbutidos ───────────────────────────────

describe('migrarPeriodosHistoricosEmbutidos (cadastro de Período Histórico ganhando os itens de fábrica)', () => {
    const seedCompleto = () => structuredClone(db.periodosHistoricos);

    it('instalação antiga (sem `embutido`, sem nenhum item de fábrica) ganha os 16, sem duplicar', () => {
        const antigos = [];
        migrarPeriodosHistoricosEmbutidos(antigos, []);
        assert.equal(antigos.length, 16);
        antigos.forEach((p) => assert.equal(p.embutido, true));
    });

    it('instalação com só parte do seed (sem Pandemia de Covid-19) ganha só o item que falta', () => {
        const parcial = seedCompleto().filter((p) => p.nome !== 'Pandemia de Covid-19');
        assert.equal(parcial.length, 15);
        migrarPeriodosHistoricosEmbutidos(parcial, []);
        assert.equal(parcial.length, 16);
        const porNome = parcial.filter((p) => p.nome === 'Pandemia de Covid-19');
        assert.equal(porNome.length, 1);
        assert.equal(porNome[0].embutido, true);
    });

    it('backfill: marca `embutido: true` por nome nos itens que não tinham a chave', () => {
        const antigos = seedCompleto().map((p) => {
            delete p.embutido;
            return p;
        });
        migrarPeriodosHistoricosEmbutidos(antigos, []);
        antigos.forEach((p) => assert.equal(p.embutido, true));
        assert.equal(antigos.length, 16, 'não deveria duplicar ao só fazer o backfill');
    });

    it('item de fábrica excluído de propósito (em `ocultos`) não volta', () => {
        const antigos = seedCompleto()
            .filter((p) => p.nome !== 'Guerra Fria')
            .map((p) => {
                delete p.embutido;
                return p;
            });
        migrarPeriodosHistoricosEmbutidos(antigos, ['Guerra Fria']);
        assert.equal(antigos.length, 15);
        assert.equal(
            antigos.some((p) => p.nome === 'Guerra Fria'),
            false,
        );
    });

    it('é idempotente: rodar de novo num cadastro já completo não duplica nada', () => {
        const completos = seedCompleto();
        migrarPeriodosHistoricosEmbutidos(completos, []);
        assert.equal(completos.length, 16);
    });

    it('não mexe em período cadastrado pelo próprio usuário (nome fora do seed)', () => {
        const antigos = seedCompleto();
        antigos.push({ id: 'custom-1', nome: 'Enchente de 2024 na minha cidade', notas: '' });

        migrarPeriodosHistoricosEmbutidos(antigos, []);

        const custom = antigos.find((p) => p.nome === 'Enchente de 2024 na minha cidade');
        assert.ok(custom);
        assert.equal(custom.embutido, undefined);
        assert.equal(
            antigos.filter((p) => p.nome === 'Enchente de 2024 na minha cidade').length,
            1,
        );
        assert.equal(antigos.length, 17);
    });
});

// ─── calcularImpactoExclusaoPeriodoHistorico ────────────────────────

describe('calcularImpactoExclusaoPeriodoHistorico (quem referencia o Período Histórico, pra avisar antes de excluir)', () => {
    it('encontra os poemas cujo periodoHistoricoId aponta pra esse período', () => {
        const dbRef = {
            poemas: [
                { id: 1, periodosHistoricosIds: [10] },
                { id: 2, periodosHistoricosIds: [20] },
                { id: 3, periodosHistoricosIds: [10] },
            ],
        };
        const { poemasIds } = calcularImpactoExclusaoPeriodoHistorico(dbRef, 10);
        assert.deepEqual(poemasIds, [1, 3]);
    });

    it('encontra também as prosas cujo periodoHistoricoId aponta pra esse período', () => {
        const dbRef = {
            poemas: [{ id: 1, periodosHistoricosIds: [10] }],
            prosas: [
                { id: 100, periodosHistoricosIds: [10] },
                { id: 101, periodosHistoricosIds: [20] },
            ],
        };
        const { poemasIds, prosasIds } = calcularImpactoExclusaoPeriodoHistorico(dbRef, 10);
        assert.deepEqual(poemasIds, [1]);
        assert.deepEqual(prosasIds, [100]);
    });

    it('período sem nenhum vínculo retorna listas vazias', () => {
        const dbRef = { poemas: [{ id: 1, periodosHistoricosIds: [10] }] };
        const { poemasIds, prosasIds } = calcularImpactoExclusaoPeriodoHistorico(dbRef, 999);
        assert.deepEqual(poemasIds, []);
        assert.deepEqual(prosasIds, []);
    });

    it('funciona mesmo se poemas/prosas estiverem ausentes do db (backup antigo)', () => {
        const { poemasIds, prosasIds } = calcularImpactoExclusaoPeriodoHistorico({}, 10);
        assert.deepEqual(poemasIds, []);
        assert.deepEqual(prosasIds, []);
    });
});

// ─── mesclarPeriodosHistoricos ───────────────────────────────────────

describe('mesclarPeriodosHistoricos (junta duas entradas do cadastro de Período Histórico numa só)', () => {
    it('reatribui periodoHistoricoId da origem pro destino em poemas e prosas', () => {
        const dbRef = {
            periodosHistoricos: [
                { id: 1, nome: 'Ditadura Militar', notas: '' },
                { id: 2, nome: 'Ditadura Militar', notas: '' },
            ],
            poemas: [{ id: 10, periodosHistoricosIds: [2] }],
            prosas: [{ id: 20, periodosHistoricosIds: [2] }],
        };
        mesclarPeriodosHistoricos(dbRef, 2, 1);
        assert.deepEqual(dbRef.poemas[0].periodosHistoricosIds, [1]);
        assert.deepEqual(dbRef.prosas[0].periodosHistoricosIds, [1]);
        assert.equal(dbRef.periodosHistoricos.length, 1);
        assert.equal(dbRef.periodosHistoricos[0].id, 1);
    });

    it('preenche `regiao` do destino a partir da origem, só se o destino estiver vazio', () => {
        const vazioNoDestino = {
            periodosHistoricos: [
                { id: 1, nome: 'Guerra Fria', regiao: [] },
                { id: 2, nome: 'Guerra Fria', regiao: ['Internacional'] },
            ],
            poemas: [],
            prosas: [],
        };
        mesclarPeriodosHistoricos(vazioNoDestino, 2, 1);
        assert.deepEqual(vazioNoDestino.periodosHistoricos[0].regiao, ['Internacional']);

        const jaPreenchido = {
            periodosHistoricos: [
                { id: 1, nome: 'Guerra Fria', regiao: ['Europa'] },
                { id: 2, nome: 'Guerra Fria', regiao: ['Internacional'] },
            ],
            poemas: [],
            prosas: [],
        };
        mesclarPeriodosHistoricos(jaPreenchido, 2, 1);
        assert.deepEqual(jaPreenchido.periodosHistoricos[0].regiao, ['Europa']);
    });

    it('preenche notas do destino a partir da origem, só se o destino estiver vazio', () => {
        const dbRef = {
            periodosHistoricos: [
                { id: 1, nome: 'Ditadura Militar', notas: '' },
                { id: 2, nome: 'Ditadura Militar', notas: 'anos de chumbo' },
            ],
            poemas: [],
            prosas: [],
        };
        mesclarPeriodosHistoricos(dbRef, 2, 1);
        assert.equal(dbRef.periodosHistoricos[0].notas, 'anos de chumbo');
    });

    it('nunca sobrescreve notas do destino já preenchidas', () => {
        const dbRef = {
            periodosHistoricos: [
                { id: 1, nome: 'Ditadura Militar', notas: 'nota original' },
                { id: 2, nome: 'Ditadura Militar', notas: 'outra nota' },
            ],
            poemas: [],
            prosas: [],
        };
        mesclarPeriodosHistoricos(dbRef, 2, 1);
        assert.equal(dbRef.periodosHistoricos[0].notas, 'nota original');
    });

    it('preenche inicio/fim do destino a partir da origem, só se o destino estiver vazio', () => {
        const dbRef = {
            periodosHistoricos: [
                { id: 1, nome: 'Segunda Guerra Mundial', notas: '', inicio: null, fim: null },
                {
                    id: 2,
                    nome: 'Segunda Guerra Mundial',
                    notas: '',
                    inicio: { dia: 1, mes: 9, ano: 1939 },
                    fim: { dia: 2, mes: 9, ano: 1945 },
                },
            ],
            poemas: [],
            prosas: [],
        };
        mesclarPeriodosHistoricos(dbRef, 2, 1);
        assert.deepEqual(dbRef.periodosHistoricos[0].inicio, { dia: 1, mes: 9, ano: 1939 });
        assert.deepEqual(dbRef.periodosHistoricos[0].fim, { dia: 2, mes: 9, ano: 1945 });
    });

    it('nunca sobrescreve inicio/fim do destino já preenchidos', () => {
        const dbRef = {
            periodosHistoricos: [
                {
                    id: 1,
                    nome: 'Guerra Fria',
                    notas: '',
                    inicio: { ano: 1947 },
                    fim: { ano: 1991 },
                },
                { id: 2, nome: 'Guerra Fria', notas: '', inicio: { ano: 1945 }, fim: null },
            ],
            poemas: [],
            prosas: [],
        };
        mesclarPeriodosHistoricos(dbRef, 2, 1);
        assert.deepEqual(dbRef.periodosHistoricos[0].inicio, { ano: 1947 });
        assert.deepEqual(dbRef.periodosHistoricos[0].fim, { ano: 1991 });
    });

    it('não faz nada se origem e destino forem o mesmo id', () => {
        const dbRef = {
            periodosHistoricos: [{ id: 1, nome: 'Guerra Fria', notas: '' }],
            poemas: [],
            prosas: [],
        };
        mesclarPeriodosHistoricos(dbRef, 1, 1);
        assert.equal(dbRef.periodosHistoricos.length, 1);
    });

    it('não faz nada se origem ou destino não existirem no cadastro', () => {
        const dbRef = {
            periodosHistoricos: [{ id: 1, nome: 'Guerra Fria', notas: '' }],
            poemas: [],
            prosas: [],
        };
        mesclarPeriodosHistoricos(dbRef, 999, 1);
        assert.equal(dbRef.periodosHistoricos.length, 1);
    });
});

// ─── migrarRegiaoPeriodoHistorico ────────────────────────────────────

describe('migrarRegiaoPeriodoHistorico (campo `regiao` nascendo depois do seed)', () => {
    const seedCompleto = () => structuredClone(db.periodosHistoricos);

    it('item de fábrica sem a chave ganha a região do seed, por nome', () => {
        const antigos = seedCompleto().map((p) => {
            delete p.regiao;
            return p;
        });
        migrarRegiaoPeriodoHistorico(antigos);
        const guerraFria = antigos.find((p) => p.nome === 'Guerra Fria');
        assert.deepEqual(guerraFria.regiao, ['Internacional']);
        antigos.forEach((p) => assert.ok(p.regiao.length, `"${p.nome}" ficou sem regiao`));
    });

    it('período do próprio usuário (fora do seed) ganha `regiao` vazia, não inventada', () => {
        const lista = [{ id: 'c1', nome: 'Enchente de 2024 na minha cidade', notas: '' }];
        migrarRegiaoPeriodoHistorico(lista);
        assert.deepEqual(lista[0].regiao, []);
    });

    it('mesmo nome de item de fábrica, mas sem `embutido`, não recebe região do seed', () => {
        const lista = [{ id: 'c2', nome: 'Guerra Fria', notas: 'minha' }];
        migrarRegiaoPeriodoHistorico(lista);
        assert.deepEqual(lista[0].regiao, []);
    });

    it('não sobrescreve `regiao` já gravada, inclusive a lista vazia apagada de propósito', () => {
        const lista = [
            { id: 1, nome: 'Guerra Fria', embutido: true, regiao: [] },
            { id: 2, nome: 'Renascimento', embutido: true, regiao: ['Itália'] },
        ];
        migrarRegiaoPeriodoHistorico(lista);
        assert.deepEqual(lista[0].regiao, []);
        assert.deepEqual(lista[1].regiao, ['Itália']);
    });

    it('texto antigo com barras (e texto vazio) vira lista de lugares', () => {
        const lista = [
            { id: 1, nome: 'Guerra Fria', embutido: true, regiao: 'Inglaterra/Europa' },
            { id: 2, nome: 'Outro', regiao: '' },
            { id: 3, nome: 'Mais um', regiao: ' Brasil / Portugal ' },
        ];
        migrarRegiaoPeriodoHistorico(lista);
        assert.deepEqual(lista[0].regiao, ['Inglaterra', 'Europa']);
        assert.deepEqual(lista[1].regiao, []);
        assert.deepEqual(lista[2].regiao, ['Brasil', 'Portugal']);
    });

    it('é idempotente e tolera lista ausente', () => {
        const lista = seedCompleto();
        const antes = JSON.stringify(lista);
        migrarRegiaoPeriodoHistorico(lista);
        assert.equal(JSON.stringify(lista), antes);
        assert.doesNotThrow(() => migrarRegiaoPeriodoHistorico(undefined));
    });

    it('migrarPeriodosHistoricosEmbutidos cria os que faltam já com `regiao`', () => {
        const vazio = [];
        migrarPeriodosHistoricosEmbutidos(vazio, []);
        vazio.forEach((p) => assert.ok(p.regiao.length, `"${p.nome}" criado sem regiao`));
    });
});

describe('Seed do Romantismo: variantes regionais, gerações e vertentes', () => {
    const porNome = (n) => db.movimentosEscolas.find((m) => m.nome === n);
    const filhosDe = (n) => db.movimentosEscolas.filter((m) => m.paiId === porNome(n).id);

    it('Romantismo tem as duas variantes regionais como filhas diretas', () => {
        assert.deepEqual(
            filhosDe('Romantismo')
                .map((m) => m.nome)
                .sort(),
            ['Romantismo em Portugal', 'Romantismo no Brasil'],
        );
        filhosDe('Romantismo').forEach((m) => assert.equal(m.divisao, 'Variante regional'));
    });

    it('Brasil: três gerações só de poesia e quatro vertentes só de prosa', () => {
        const filhos = filhosDe('Romantismo no Brasil');
        const geracoes = filhos.filter((m) => m.divisao === 'Fase ou geração');
        const vertentes = filhos.filter((m) => m.divisao === 'Vertente');
        assert.equal(geracoes.length, 3);
        assert.equal(vertentes.length, 4);
        geracoes.forEach((m) => assert.equal(m.generoDivisao, 'Poesia', m.nome));
        vertentes.forEach((m) => assert.equal(m.generoDivisao, 'Prosa', m.nome));
    });

    it('Portugal: três gerações para todos os gêneros e quatro vertentes só de prosa', () => {
        const filhos = filhosDe('Romantismo em Portugal');
        const geracoes = filhos.filter((m) => m.divisao === 'Fase ou geração');
        const vertentes = filhos.filter((m) => m.divisao === 'Vertente');
        assert.equal(filhos.length, 7);
        assert.equal(geracoes.length, 3);
        assert.equal(vertentes.length, 4);
        geracoes.forEach((m) => assert.equal(m.generoDivisao, '', m.nome));
        vertentes.forEach((m) => assert.equal(m.generoDivisao, 'Prosa', m.nome));
        assert.deepEqual(vertentes.map((m) => m.nome).sort(), [
            'Novela passional (Portugal)',
            'Romance campesino (Portugal)',
            'Romance de costumes (Portugal)',
            'Romance histórico (Portugal)',
        ]);
    });

    it('as gerações brasileiras se sucedem sem sobrepor e cabem dentro do pai', () => {
        const pai = porNome('Romantismo no Brasil');
        const g = [
            '1ª geração: Indianista (Brasil)',
            '2ª geração: Ultrarromântica (Brasil)',
            '3ª geração: Condoreira (Brasil)',
        ].map((n) => porNome(n));
        for (let i = 0; i < g.length; i++) {
            assert.ok(g[i].inicio.ano >= pai.inicio.ano && g[i].fim.ano <= pai.fim.ano, g[i].nome);
            if (i > 0) assert.ok(g[i].inicio.ano > g[i - 1].fim.ano, g[i].nome);
        }
    });

    it('nomes de fábrica são únicos e as divisões herdam Postura e Programa do pai (campos vazios)', () => {
        const nomes = db.movimentosEscolas.map((m) => m.nome);
        assert.equal(new Set(nomes).size, nomes.length);
        db.movimentosEscolas
            .filter((m) => m.paiId !== null)
            .forEach((m) => {
                assert.equal(m.posturaEstetica, '', m.nome);
                assert.equal(m.programa, '', m.nome);
            });
    });

    it('instalação antiga ganha as divisões ligadas ao Romantismo que já existia, sem duplicar o pai', () => {
        const antiga = db.movimentosEscolas
            .filter((m) => m.paiId === null)
            .map((m) => structuredClone(m));
        const romantismo = antiga.find((m) => m.nome === 'Romantismo');
        migrarMovimentosEscolasEmbutidos(antiga, []);
        assert.equal(antiga.filter((m) => m.nome === 'Romantismo').length, 1);
        const brasil = antiga.find((m) => m.nome === 'Romantismo no Brasil');
        assert.equal(brasil.paiId, romantismo.id);
        const g1 = antiga.find((m) => m.nome === '1ª geração: Indianista (Brasil)');
        assert.equal(g1.paiId, brasil.id);
    });

    it('se o pai foi excluído de propósito, a divisão nasce como corrente de topo', () => {
        const semPai = db.movimentosEscolas
            .filter((m) => m.paiId === null && m.nome !== 'Romantismo')
            .map((m) => structuredClone(m));
        migrarMovimentosEscolasEmbutidos(semPai, ['Romantismo']);
        const brasil = semPai.find((m) => m.nome === 'Romantismo no Brasil');
        assert.equal(brasil.paiId, null);
        assert.equal(brasil.divisao, '');
    });
});
