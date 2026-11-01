import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    RELACOES_INTERTEXTUALIDADE_SUGERIDAS,
    TIPOS_OBRA_SUGERIDOS,
    migrarEntradaIntertextualidade,
    migrarEntradaHipertextualidade,
    migrarIntertextualidadeDosItens,
    migrarHipertextualidadeDosItens,
    migrarTranstextualidadeDosItens,
    extrairRelacoesIntertextualidadeUnicas,
    extrairRelacoesHipertextualidadeUnicas,
    extrairTiposObraUnicos,
    extrairObrasUnicas,
    extrairAutoresUnicos,
    extrairPersonagensUnicos,
    extrairHipotextosDoFormatoNovo,
    extrairDescricoesDaObra,
    descricaoUnicaDaObra,
} from '../js/intertextualidade.js';

describe('Intertextualidade: migração da entrada', () => {
    it('tipo vira tipoObra e texto vira obra, sem separar o conteúdo', () => {
        const nova = migrarEntradaIntertextualidade({
            tipo: 'Música',
            texto: 'Chico Buarque - Construção',
            link: 'https://x.test',
            nota: 'n',
        });
        assert.equal(nova.tipoObra, 'Música');
        assert.equal(nova.obra, 'Chico Buarque - Construção');
        assert.equal(nova.relacao, '');
        assert.deepEqual(nova.autores, []);
        assert.ok(!('autor' in nova));
        assert.deepEqual(nova.personagens, []);
        assert.ok(!('personagem' in nova));
        assert.equal(nova.descricao, '');
        assert.equal(nova.trecho, '');
        assert.equal(nova.traduzido, false);
        assert.equal(nova.link, 'https://x.test');
        assert.equal(nova.nota, 'n');
        assert.ok(!('tipo' in nova));
        assert.ok(!('texto' in nova));
    });

    it('é idempotente', () => {
        const uma = migrarEntradaIntertextualidade({ tipo: 'Livro', texto: 'Dom Casmurro' });
        const duas = migrarEntradaIntertextualidade(uma);
        assert.deepEqual(duas, uma);
    });

    it('entrada já no formato novo mantém os valores', () => {
        const nova = migrarEntradaIntertextualidade({
            relacao: 'Citação',
            tipoObra: 'Livro',
            obra: 'Grande Sertão',
            traduzido: true,
        });
        assert.equal(nova.relacao, 'Citação');
        assert.equal(nova.obra, 'Grande Sertão');
        assert.equal(nova.traduzido, true);
    });

    it('não sobrescreve tipoObra e obra já preenchidos com tipo e texto antigos', () => {
        const nova = migrarEntradaIntertextualidade({
            tipo: 'A',
            texto: 'B',
            tipoObra: 'C',
            obra: 'D',
        });
        assert.equal(nova.tipoObra, 'C');
        assert.equal(nova.obra, 'D');
    });

    it('traduzido que não é boolean volta a false', () => {
        assert.equal(migrarEntradaIntertextualidade({ traduzido: 'sim' }).traduzido, false);
    });

    it('o que não é objeto volta como veio', () => {
        for (const v of [null, undefined, 'x', 3, [1]]) {
            assert.equal(migrarEntradaIntertextualidade(v), v);
            assert.equal(migrarEntradaHipertextualidade(v), v);
        }
    });
});

describe('Hipertextualidade: migração da entrada', () => {
    it('tipo vira tipoObra e entram autor e descricao', () => {
        const nova = migrarEntradaHipertextualidade({
            tipo: 'Livro',
            relacao: 'Releitura',
            hipotexto: 'Dom Casmurro',
            link: 'l',
        });
        assert.equal(nova.tipoObra, 'Livro');
        assert.deepEqual(nova.autores, []);
        assert.ok(!('autor' in nova));
        assert.equal(nova.descricao, '');
        assert.equal(nova.relacao, 'Releitura');
        assert.equal(nova.hipotexto, 'Dom Casmurro');
        assert.equal(nova.link, 'l');
        assert.ok(!('tipo' in nova));
    });

    it('é idempotente', () => {
        const uma = migrarEntradaHipertextualidade({ tipo: 'Filme', hipotexto: 'X' });
        assert.deepEqual(migrarEntradaHipertextualidade(uma), uma);
    });
});

describe('Migração dos itens', () => {
    it('migra a lista de cada item e devolve quantos itens mudaram', () => {
        const itens = [
            { intertextualidade: [{ tipo: 'Livro', texto: 'A' }] },
            { intertextualidade: [] },
            { hipertextualidade: [{ tipo: 'Filme', hipotexto: 'B' }] },
            {},
            null,
        ];
        const r = migrarTranstextualidadeDosItens(itens);
        assert.deepEqual(r, { intertextualidade: 1, hipertextualidade: 1 });
        assert.equal(itens[0].intertextualidade[0].obra, 'A');
        assert.equal(itens[2].hipertextualidade[0].tipoObra, 'Filme');
    });

    it('segunda passada não altera nada', () => {
        const itens = [{ intertextualidade: [{ tipo: 'Livro', texto: 'A' }] }];
        migrarIntertextualidadeDosItens(itens);
        assert.equal(migrarIntertextualidadeDosItens(itens), 0);
        assert.equal(migrarHipertextualidadeDosItens(itens), 0);
    });

    it('campo que não é lista (formato de objeto único) fica como está', () => {
        const itens = [{ intertextualidade: { tipo: 'Livro', texto: 'A' } }];
        assert.equal(migrarIntertextualidadeDosItens(itens), 0);
        assert.deepEqual(itens[0].intertextualidade, { tipo: 'Livro', texto: 'A' });
    });

    it('aceita lista ausente', () => {
        assert.equal(migrarIntertextualidadeDosItens(undefined), 0);
        assert.equal(migrarHipertextualidadeDosItens(null), 0);
    });
});

const ACERVO = [
    {
        intertextualidade: [
            {
                relacao: 'Citação',
                tipoObra: 'Livro',
                obra: 'Dom Casmurro',
                autor: 'Machado de Assis',
            },
            { relacao: 'Alusão', tipoObra: 'Mitologia', obra: 'Medusa', personagem: 'Medusa' },
            { relacao: 'Homenagem velada', tipoObra: 'Série', obra: 'Friends', personagem: 'Ross' },
            { tipoObra: 'Livro', obra: 'Grande Sertão', autor: 'Guimarães Rosa' },
        ],
        hipertextualidade: [
            {
                relacao: 'Paródia',
                tipoObra: 'Poema',
                hipotexto: 'Canção do Exílio',
                autor: 'Gonçalves Dias',
            },
            {
                relacao: 'Releitura',
                tipoObra: 'Livro',
                hipotexto: 'Dom Casmurro',
                autor: 'Machado de Assis',
            },
        ],
    },
    {
        intertextualidade: [
            { relacao: 'Citação', tipoObra: 'Música', obra: 'Construção', autor: 'Chico Buarque' },
        ],
    },
    {},
];

describe('Sugestões e autocompletar', () => {
    it('relações de Inter: 5 fixas mais as digitadas, "Outro" não aparece sem ser digitado', () => {
        const r = extrairRelacoesIntertextualidadeUnicas(ACERVO);
        for (const s of RELACOES_INTERTEXTUALIDADE_SUGERIDAS) assert.ok(r.includes(s));
        assert.ok(r.includes('Homenagem velada'));
        assert.equal(r.length, 6);
    });

    it('relações de Hiper: sugestões do utils mais as digitadas', () => {
        const r = extrairRelacoesHipertextualidadeUnicas(ACERVO);
        assert.ok(r.includes('Paródia'));
        assert.ok(r.includes('Homenagem'));
    });

    it('tipos de obra: semente mais Inter e Hiper, Outro por último', () => {
        const r = extrairTiposObraUnicos(ACERVO);
        for (const s of TIPOS_OBRA_SUGERIDOS) assert.ok(r.includes(s));
        assert.ok(r.includes('Poema'));
        assert.equal(r[r.length - 1], 'Outro');
    });

    it('obras: ordenadas, sem repetir, com filtro por tipo e por autor', () => {
        assert.deepEqual(extrairObrasUnicas(ACERVO), [
            'Construção',
            'Dom Casmurro',
            'Friends',
            'Grande Sertão',
            'Medusa',
        ]);
        assert.deepEqual(extrairObrasUnicas(ACERVO, { tipoObra: 'Livro' }), [
            'Dom Casmurro',
            'Grande Sertão',
        ]);
        assert.deepEqual(extrairObrasUnicas(ACERVO, { autor: 'Chico Buarque' }), ['Construção']);
    });

    it('autores: junta Inter e Hiper, e filtra obra só pela Inter e hipotexto pela Hiper', () => {
        const todos = extrairAutoresUnicos(ACERVO);
        assert.deepEqual(todos, [
            'Chico Buarque',
            'Gonçalves Dias',
            'Guimarães Rosa',
            'Machado de Assis',
        ]);
        assert.deepEqual(extrairAutoresUnicos(ACERVO, { obra: 'Dom Casmurro' }), [
            'Machado de Assis',
        ]);
        assert.deepEqual(extrairAutoresUnicos(ACERVO, { obra: 'Canção do Exílio' }), [
            'Gonçalves Dias',
        ]);
        assert.deepEqual(extrairAutoresUnicos(ACERVO, { tipoObra: 'Poema' }), ['Gonçalves Dias']);
    });

    it('personagens: com filtro por obra', () => {
        assert.deepEqual(extrairPersonagensUnicos(ACERVO), ['Medusa', 'Ross']);
        assert.deepEqual(extrairPersonagensUnicos(ACERVO, { obra: 'Friends' }), ['Ross']);
    });

    it('hipotextos no formato novo, com filtros', () => {
        assert.deepEqual(extrairHipotextosDoFormatoNovo(ACERVO), [
            'Canção do Exílio',
            'Dom Casmurro',
        ]);
        assert.deepEqual(extrairHipotextosDoFormatoNovo(ACERVO, { tipoObra: 'Poema' }), [
            'Canção do Exílio',
        ]);
        assert.deepEqual(extrairHipotextosDoFormatoNovo(ACERVO, { autor: 'Machado de Assis' }), [
            'Dom Casmurro',
        ]);
    });

    it('lixo no acervo não quebra', () => {
        const sujo = [
            null,
            { intertextualidade: [null, 'x', { obra: 5, autor: '  ' }] },
            { hipertextualidade: 3 },
        ];
        assert.deepEqual(extrairObrasUnicas(sujo), []);
        assert.deepEqual(extrairAutoresUnicos(sujo), []);
        assert.deepEqual(extrairPersonagensUnicos(undefined), []);
    });
});

describe('Descrição compartilhada pela mesma obra', () => {
    const itens = [
        {
            intertextualidade: [
                {
                    tipoObra: 'Livro',
                    obra: 'Dom Casmurro',
                    autor: 'Machado de Assis',
                    descricao: 'romance de 1899',
                },
                {
                    tipoObra: 'Música',
                    obra: 'Construção',
                    autor: 'Chico Buarque',
                    descricao: 'canção de 1971',
                },
                {
                    tipoObra: 'Livro',
                    obra: 'Construção',
                    autor: 'Outro Autor',
                    descricao: 'livro qualquer',
                },
                { tipoObra: 'Livro', obra: 'Sem descrição' },
            ],
            hipertextualidade: [
                {
                    tipoObra: 'Livro',
                    hipotexto: 'dom casmurro',
                    autor: 'Machado de Assis',
                    descricao: 'romance de 1899',
                },
                {
                    tipoObra: 'Livro',
                    hipotexto: 'Dom Casmurro',
                    autor: 'Machado de Assis',
                    descricao: 'clássico machadiano',
                },
            ],
        },
    ];

    it('junta Inter e Hiper para a mesma obra e o mesmo autor, sem repetir', () => {
        assert.deepEqual(
            extrairDescricoesDaObra(itens, {
                tipoObra: 'Livro',
                obra: 'Dom Casmurro',
                autor: 'Machado de Assis',
            }),
            ['clássico machadiano', 'romance de 1899'],
        );
    });

    it('o mesmo título com tipo de obra diferente não se mistura', () => {
        assert.deepEqual(
            extrairDescricoesDaObra(itens, { tipoObra: 'Música', obra: 'Construção' }),
            ['canção de 1971'],
        );
        assert.deepEqual(
            extrairDescricoesDaObra(itens, { tipoObra: 'Livro', obra: 'Construção' }),
            ['livro qualquer'],
        );
    });

    it('tipo e autor só restringem quando preenchidos; ignora caixa e espaços', () => {
        assert.deepEqual(extrairDescricoesDaObra(itens, { obra: '  CONSTRUÇÃO ' }), [
            'canção de 1971',
            'livro qualquer',
        ]);
    });

    it('autor diferente do digitado não sugere', () => {
        assert.deepEqual(
            extrairDescricoesDaObra(itens, { obra: 'Construção', autor: 'Fulano' }),
            [],
        );
    });

    it('sem obra, ou obra sem descrição, não sugere nada', () => {
        assert.deepEqual(extrairDescricoesDaObra(itens, { tipoObra: 'Livro' }), []);
        assert.deepEqual(extrairDescricoesDaObra(itens, { obra: 'Sem descrição' }), []);
    });

    it('descricaoUnicaDaObra só devolve quando há exatamente uma', () => {
        assert.equal(
            descricaoUnicaDaObra(itens, { tipoObra: 'Música', obra: 'Construção' }),
            'canção de 1971',
        );
        assert.equal(descricaoUnicaDaObra(itens, { obra: 'Dom Casmurro' }), '');
        assert.equal(descricaoUnicaDaObra(itens, { obra: 'Nada' }), '');
    });

    it('lixo no acervo não quebra', () => {
        assert.deepEqual(
            extrairDescricoesDaObra([null, { intertextualidade: [null, 'x'] }], { obra: 'a' }),
            [],
        );
        assert.deepEqual(extrairDescricoesDaObra(undefined, { obra: 'a' }), []);
    });
});
