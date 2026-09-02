import './helpers/localstorage-shim.js';

import { describe, it } from 'node:test';
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
    calcularImpactoExclusaoEpoca,
    mesclarPessoas,
    mesclarEpocas,
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

describe('migrarNomesDePapel (renomeação de gênero em PAPEIS_PESSOA: Alusão/Dedicatária/Inspirado por)', () => {
    it('renomeia os 3 valores antigos pros novos', () => {
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
            { pessoaId: 2, papeis: ['Dedicatário(a)', 'Inspirado(a) por'] },
        ]);
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
            epocas: [{ id: 5, nome: 'Luto', contextoRelacao: '', notas: '' }],
            poemas: [{ id: 1, epocaRetratada: { epocaId: 5, inicio: null, fim: null } }],
        };
        migrarEpocas(dbRef);
        assert.equal(dbRef.epocas.length, 1);
        assert.equal(dbRef.poemas[0].epocaRetratada.epocaId, 5);
    });

    it('nome que já tem Época cadastrada reaproveita o id em vez de duplicar', () => {
        const dbRef = {
            epocas: [{ id: 7, nome: 'Luto', contextoRelacao: '', notas: '' }],
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
                { id: 1, nome: 'Corte de contato', contextoRelacao: '', notas: '' },
                { id: 2, nome: 'Corte de contato', contextoRelacao: '', notas: '' },
            ],
            poemas: [{ id: 10, epocaRetratada: { epocaId: 2 } }],
            prosas: [{ id: 20, epocaRetratada: { epocaId: 2 } }],
        };
        mesclarEpocas(dbRef, 2, 1);
        assert.equal(dbRef.poemas[0].epocaRetratada.epocaId, 1);
        assert.equal(dbRef.prosas[0].epocaRetratada.epocaId, 1);
        assert.equal(dbRef.epocas.length, 1);
        assert.equal(dbRef.epocas[0].id, 1);
    });

    it('preenche contextoRelacao/notas do destino a partir da origem, só se o destino estiver vazio', () => {
        const dbRef = {
            epocas: [
                { id: 1, nome: 'Corte de contato', contextoRelacao: '', notas: '' },
                {
                    id: 2,
                    nome: 'Corte de contato',
                    contextoRelacao: 'Pedro e Victor',
                    notas: 'período difícil',
                },
            ],
            poemas: [],
            prosas: [],
        };
        mesclarEpocas(dbRef, 2, 1);
        assert.equal(dbRef.epocas[0].contextoRelacao, 'Pedro e Victor');
        assert.equal(dbRef.epocas[0].notas, 'período difícil');
    });

    it('nunca sobrescreve contextoRelacao/notas do destino já preenchidos', () => {
        const dbRef = {
            epocas: [
                {
                    id: 1,
                    nome: 'Corte de contato',
                    contextoRelacao: 'Pedro e Victor',
                    notas: 'nota original',
                },
                { id: 2, nome: 'Corte de contato', contextoRelacao: 'Outro contexto', notas: 'outra nota' },
            ],
            poemas: [],
            prosas: [],
        };
        mesclarEpocas(dbRef, 2, 1);
        assert.equal(dbRef.epocas[0].contextoRelacao, 'Pedro e Victor');
        assert.equal(dbRef.epocas[0].notas, 'nota original');
    });

    it('não faz nada se origem e destino forem o mesmo id', () => {
        const dbRef = {
            epocas: [{ id: 1, nome: 'Luto', contextoRelacao: '', notas: '' }],
            poemas: [],
            prosas: [],
        };
        mesclarEpocas(dbRef, 1, 1);
        assert.equal(dbRef.epocas.length, 1);
    });

    it('não faz nada se origem ou destino não existirem no cadastro', () => {
        const dbRef = {
            epocas: [{ id: 1, nome: 'Luto', contextoRelacao: '', notas: '' }],
            poemas: [],
            prosas: [],
        };
        mesclarEpocas(dbRef, 999, 1);
        assert.equal(dbRef.epocas.length, 1);
    });
});
