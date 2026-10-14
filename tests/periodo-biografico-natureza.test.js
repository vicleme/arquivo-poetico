// Item 3 do planejamento (13/10/2026): Esfera, Natureza Relacional e Vínculo.
// Três níveis independentes: a Natureza e o Vínculo moram na relação
// `{ de, para, natureza, vinculo }`, com pelo menos um dos dois preenchido.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    AUTOR,
    NATUREZAS_DE_FABRICA,
    NATUREZA_TERAPEUTICA,
    VINCULOS_DE_FABRICA,
    ROTULOS_VINCULO_DE_FABRICA,
    converterVinculoLegado,
    normalizarRelacoes,
    normalizarEnvolvidosDoPeriodo,
    migrarCamposPeriodoBiografico,
    migrarOpcoesPeriodoBiografico,
    opcoesDoPeriodoBiografico,
    opcoesDeFabricaPeriodoBiografico,
    registrarValoresNovos,
    contarUsoOpcao,
    renomearOpcaoPeriodoBiografico,
    removerOpcaoPeriodoBiografico,
    naturezaSugeridaDoVinculo,
    definirNaturezaSugerida,
    fraseDaRelacao,
    pluralDoVinculo,
    notaDoVinculo,
    definirRotuloVinculo,
    mesclarCamposDosPeriodos,
    linhasDoPeriodoBiografico,
    filtrarPeriodosBiograficos,
    opcoesDeFiltroBiografico,
    textoBuscaNaturezas,
    textoBuscaVinculos,
} from '../js/periodo-biografico-campos.js';

const nomesFabrica = ROTULOS_VINCULO_DE_FABRICA.map((r) => r.nome);

const novoDb = () => {
    const d = {
        autores: [{ id: 1, nome: 'Eva', genero: 'Mulher' }],
        pessoas: [
            { id: 1, nome: 'Ana', genero: 'Mulher', oculto: false },
            { id: 2, nome: 'Bia', genero: 'Não-binário', oculto: false },
            { id: 3, nome: 'Caio', genero: 'Homem', oculto: true },
            { id: 4, nome: 'Davi', genero: 'Homem', oculto: false },
        ],
        epocas: [
            {
                id: 10,
                nome: 'Faculdade',
                autorId: 1,
                esferas: [],
                categorias: [],
                pessoasEnvolvidas: [{ pessoaId: 1 }, { pessoaId: 4 }],
                relacoes: [
                    { de: AUTOR, para: 1, natureza: 'Amizade', vinculo: '' },
                    { de: AUTOR, para: 4, natureza: 'Romance', vinculo: 'Namorados' },
                ],
            },
            {
                id: 11,
                nome: 'Viagem',
                autorId: 1,
                esferas: [],
                categorias: [],
                pessoasEnvolvidas: [{ pessoaId: 1 }, { pessoaId: 3 }],
                relacoes: [
                    { de: AUTOR, para: 1, natureza: 'Amizade', vinculo: 'Amigos' },
                    { de: AUTOR, para: 3, natureza: 'Romance', vinculo: '' },
                ],
            },
        ],
    };
    migrarOpcoesPeriodoBiografico(d);
    return d;
};

describe('Natureza: modelo da relação', () => {
    it('as listas de fábrica separam categoria (Natureza) de laço (Vínculo)', () => {
        assert.deepEqual(NATUREZAS_DE_FABRICA, [
            'Familiar',
            'Amizade',
            'Romance',
            'Sexual',
            'Profissional',
            'Colega',
        ]);
        assert.ok(!NATUREZAS_DE_FABRICA.includes('Romântico'));
        ['Namorados', 'Ex-namorados', 'Conversantes', 'Webnamorados', 'Situationship'].forEach(
            (v) => assert.ok(VINCULOS_DE_FABRICA.includes(v), v),
        );
        NATUREZAS_DE_FABRICA.forEach((n) => assert.ok(!VINCULOS_DE_FABRICA.includes(n), n));
    });

    it('aceita só Natureza, só Vínculo ou os dois; sem nenhum dos dois, descarta', () => {
        const rels = normalizarRelacoes([
            { de: AUTOR, para: 1, natureza: 'Familiar', vinculo: '' },
            { de: AUTOR, para: 2, natureza: '', vinculo: 'Mentoria' },
            { de: AUTOR, para: 3, natureza: 'Romance', vinculo: 'Namorados' },
            { de: AUTOR, para: 4, natureza: '', vinculo: '' },
            { de: AUTOR, para: 4, natureza: '  ', vinculo: '  ' },
        ]);
        assert.deepEqual(rels, [
            { de: AUTOR, para: 1, natureza: 'Familiar', vinculo: '' },
            { de: AUTOR, para: 2, natureza: '', vinculo: 'Mentoria' },
            { de: AUTOR, para: 3, natureza: 'Romance', vinculo: 'Namorados' },
        ]);
    });

    it('repetida some; mesma dupla com Natureza diferente é outra relação', () => {
        const rels = normalizarRelacoes([
            { de: AUTOR, para: 1, natureza: 'Amizade', vinculo: 'Amigos' },
            { de: AUTOR, para: '1', natureza: ' amizade ', vinculo: ' amigos ' },
            { de: AUTOR, para: 1, natureza: 'Profissional', vinculo: 'Amigos' },
            { de: AUTOR, para: 1, natureza: 'Amizade', vinculo: '' },
        ]);
        assert.equal(rels.length, 3);
    });

    it('relação com as pontas iguais continua inválida', () => {
        assert.deepEqual(
            normalizarRelacoes([{ de: 1, para: 1, natureza: 'Familiar', vinculo: '' }]),
            [],
        );
    });
});

describe('Natureza: migração do formato anterior (vínculo era categoria)', () => {
    it('cada vínculo de fábrica antigo vira Natureza, com o vínculo vazio', () => {
        const casos = [
            ['Romântico', 'Romance'],
            ['Sexual', 'Sexual'],
            ['Amizade', 'Amizade'],
            ['Familiar', 'Familiar'],
            ['Profissional', 'Profissional'],
            ['Colega', 'Colega'],
        ];
        casos.forEach(([antigo, natureza]) => {
            assert.deepEqual(converterVinculoLegado(antigo), { natureza, vinculo: '' }, antigo);
        });
    });

    it('compara sem caixa e sem acento', () => {
        assert.deepEqual(converterVinculoLegado('romantico'), { natureza: 'Romance', vinculo: '' });
        assert.deepEqual(converterVinculoLegado('  AMIZADE '), {
            natureza: 'Amizade',
            vinculo: '',
        });
    });

    it('rótulo de fábrica (e o lado oposto) mantém o vínculo e ganha Natureza Familiar', () => {
        nomesFabrica.forEach((nome) => {
            assert.deepEqual(converterVinculoLegado(nome), { natureza: 'Familiar', vinculo: nome });
        });
        assert.deepEqual(converterVinculoLegado('Filho ou filha de'), {
            natureza: 'Familiar',
            vinculo: 'Filho ou filha de',
        });
    });

    it('vínculo criado pela pessoa mantém o nome e fica sem Natureza', () => {
        assert.deepEqual(converterVinculoLegado('Mentoria'), { natureza: '', vinculo: 'Mentoria' });
    });

    it('relação sem a chave natureza é do formato antigo e é convertida', () => {
        const rels = normalizarRelacoes([
            { de: AUTOR, para: 1, vinculo: 'Romântico' },
            { de: AUTOR, para: 2, vinculo: 'Responsável por' },
            { de: AUTOR, para: 3, vinculo: 'Mentoria' },
        ]);
        assert.deepEqual(rels, [
            { de: AUTOR, para: 1, natureza: 'Romance', vinculo: '' },
            { de: AUTOR, para: 2, natureza: 'Familiar', vinculo: 'Responsável por' },
            { de: AUTOR, para: 3, natureza: '', vinculo: 'Mentoria' },
        ]);
    });

    it('relação que já tem a chave natureza nunca é convertida de novo', () => {
        // "Amizade" digitado hoje, como vínculo, é um laço da pessoa: fica.
        const rels = normalizarRelacoes([{ de: AUTOR, para: 1, natureza: '', vinculo: 'Amizade' }]);
        assert.deepEqual(rels, [{ de: AUTOR, para: 1, natureza: '', vinculo: 'Amizade' }]);
    });

    it('vínculos por pessoa do formato mais antigo também passam pela conversão', () => {
        const r = normalizarEnvolvidosDoPeriodo({
            pessoasEnvolvidas: [{ pessoaId: 1, vinculos: ['Amizade', 'Mentoria'] }],
        });
        assert.deepEqual(r.relacoes, [
            { de: AUTOR, para: 1, natureza: 'Amizade', vinculo: '' },
            { de: AUTOR, para: 1, natureza: '', vinculo: 'Mentoria' },
        ]);
    });

    it('migrarCamposPeriodoBiografico é idempotente sobre dado antigo', () => {
        const epocas = [
            {
                id: 1,
                pessoasEnvolvidas: [{ pessoaId: 1 }, { pessoaId: 2 }],
                relacoes: [
                    { de: AUTOR, para: 1, vinculo: 'Romântico' },
                    { de: AUTOR, para: 2, vinculo: 'Tio ou tia de' },
                ],
            },
        ];
        migrarCamposPeriodoBiografico(epocas);
        const depois = structuredClone(epocas);
        assert.deepEqual(depois[0].relacoes, [
            { de: AUTOR, para: 1, natureza: 'Romance', vinculo: '' },
            { de: AUTOR, para: 2, natureza: 'Familiar', vinculo: 'Tio ou tia de' },
        ]);
        migrarCamposPeriodoBiografico(epocas);
        assert.deepEqual(epocas, depois);
    });
});

describe('Natureza: migração do vocabulário', () => {
    it('instalação nova: semeia Naturezas, Vínculos de fábrica e sugestões', () => {
        const d = { epocas: [] };
        migrarOpcoesPeriodoBiografico(d);
        const op = d.opcoesPeriodoBiografico;
        assert.deepEqual(op.naturezas, [...NATUREZAS_DE_FABRICA, NATUREZA_TERAPEUTICA]);
        assert.deepEqual(op.vinculos, [
            ...VINCULOS_DE_FABRICA,
            ...nomesFabrica,
            'Psicoterapeuta de',
        ]);
        assert.equal(naturezaSugeridaDoVinculo(d, 'Namorados'), 'Romance');
        assert.equal(naturezaSugeridaDoVinculo(d, 'Amigos'), 'Amizade');
        assert.equal(naturezaSugeridaDoVinculo(d, 'Responsável por'), 'Familiar');
        assert.equal(naturezaSugeridaDoVinculo(d, 'Filho ou filha de'), 'Familiar');
    });

    it('a chave de fábrica do db (opcoesDeFabrica) já vem completa e fica estável', () => {
        const d = { epocas: [], opcoesPeriodoBiografico: opcoesDeFabricaPeriodoBiografico() };
        migrarOpcoesPeriodoBiografico(d);
        const antes = structuredClone(d.opcoesPeriodoBiografico);
        migrarOpcoesPeriodoBiografico(d);
        assert.deepEqual(d.opcoesPeriodoBiografico, antes);
        assert.deepEqual(d.opcoesPeriodoBiografico.naturezas, [
            ...NATUREZAS_DE_FABRICA,
            NATUREZA_TERAPEUTICA,
        ]);
    });

    it('vocabulário antigo: os seis vínculos de fábrica saem de Vínculos e viram Naturezas', () => {
        const d = {
            epocas: [],
            opcoesPeriodoBiografico: {
                esferas: ['X'],
                vinculos: [
                    'Romântico',
                    'Sexual',
                    'Amizade',
                    'Familiar',
                    'Profissional',
                    'Colega',
                    'Mentoria',
                ],
            },
        };
        migrarOpcoesPeriodoBiografico(d);
        const op = d.opcoesPeriodoBiografico;
        assert.deepEqual(op.naturezas, [...NATUREZAS_DE_FABRICA, NATUREZA_TERAPEUTICA]);
        ['Romântico', 'Sexual', 'Amizade', 'Familiar', 'Profissional', 'Colega'].forEach((v) =>
            assert.ok(!op.vinculos.includes(v), v),
        );
        assert.ok(op.vinculos.includes('Mentoria'), 'vínculo da pessoa fica');
        assert.ok(op.vinculos.includes('Namorados'), 'laços de fábrica entram');
        assert.deepEqual(op.esferas, ['X']);
    });

    it('é idempotente: a segunda vez não mexe em nada', () => {
        const d = {
            epocas: [
                {
                    id: 1,
                    pessoasEnvolvidas: [{ pessoaId: 1 }],
                    relacoes: [{ de: AUTOR, para: 1, vinculo: 'Romântico' }],
                },
            ],
            opcoesPeriodoBiografico: { esferas: [], vinculos: ['Romântico', 'Mentoria'] },
        };
        migrarCamposPeriodoBiografico(d.epocas);
        migrarOpcoesPeriodoBiografico(d);
        const antes = structuredClone(d);
        migrarCamposPeriodoBiografico(d.epocas);
        migrarOpcoesPeriodoBiografico(d);
        assert.deepEqual(d, antes);
    });

    it('depois de migrado, "Amizade" digitado como vínculo não é arrancado da lista', () => {
        const d = { epocas: [], opcoesPeriodoBiografico: { vinculos: ['Mentoria'] } };
        migrarOpcoesPeriodoBiografico(d);
        d.opcoesPeriodoBiografico.vinculos.push('Amizade');
        migrarOpcoesPeriodoBiografico(d);
        assert.ok(d.opcoesPeriodoBiografico.vinculos.includes('Amizade'));
    });

    it('lista de Naturezas esvaziada de propósito não é re-semeada', () => {
        const d = { epocas: [] };
        migrarOpcoesPeriodoBiografico(d);
        d.opcoesPeriodoBiografico.naturezas = [];
        migrarOpcoesPeriodoBiografico(d);
        assert.deepEqual(d.opcoesPeriodoBiografico.naturezas, []);
    });

    it('Natureza usada por uma relação entra no vocabulário', () => {
        const d = novoDb();
        d.epocas[0].relacoes.push({ de: AUTOR, para: 2, natureza: 'Vizinhança', vinculo: '' });
        registrarValoresNovos(d, d.epocas[0]);
        assert.ok(d.opcoesPeriodoBiografico.naturezas.includes('Vizinhança'));
        assert.ok(opcoesDoPeriodoBiografico(d, 'naturezas').includes('Vizinhança'));
    });

    it('relação só com Natureza não põe vazio na lista de Vínculos', () => {
        const d = novoDb();
        assert.ok(!opcoesDoPeriodoBiografico(d, 'vinculos').includes(''));
        assert.ok(!d.opcoesPeriodoBiografico.vinculos.includes(''));
    });
});

describe('Natureza sugerida por Vínculo', () => {
    it('vem do vocabulário, vale para os dois lados de um rótulo e é só sugestão', () => {
        const d = novoDb();
        assert.equal(naturezaSugeridaDoVinculo(d, 'namorados'), 'Romance');
        assert.equal(naturezaSugeridaDoVinculo(d, 'Neto ou neta de'), 'Familiar');
        assert.equal(naturezaSugeridaDoVinculo(d, 'Mentoria'), '');
        assert.equal(naturezaSugeridaDoVinculo(d, ''), '');
    });

    it('define, troca e limpa a sugestão', () => {
        const d = novoDb();
        assert.equal(definirNaturezaSugerida(d, 'Mentoria', 'Profissional').ok, true);
        assert.equal(naturezaSugeridaDoVinculo(d, 'Mentoria'), 'Profissional');
        assert.ok(d.opcoesPeriodoBiografico.naturezas.includes('Profissional'));
        definirNaturezaSugerida(d, 'Mentoria', 'Amizade');
        assert.equal(naturezaSugeridaDoVinculo(d, 'Mentoria'), 'Amizade');
        definirNaturezaSugerida(d, 'Mentoria', '');
        assert.equal(naturezaSugeridaDoVinculo(d, 'Mentoria'), '');
    });

    it('Natureza nova escolhida como sugestão entra na lista de Naturezas', () => {
        const d = novoDb();
        definirNaturezaSugerida(d, 'Mentoria', 'Mestria');
        assert.ok(d.opcoesPeriodoBiografico.naturezas.includes('Mestria'));
    });

    it('renomear o Vínculo leva a sugestão junto; juntar mantém a do destino', () => {
        const d = novoDb();
        definirNaturezaSugerida(d, 'Mentoria', 'Profissional');
        renomearOpcaoPeriodoBiografico(d, 'vinculos', 'Mentoria', 'Orientação');
        assert.equal(naturezaSugeridaDoVinculo(d, 'Orientação'), 'Profissional');
        assert.equal(naturezaSugeridaDoVinculo(d, 'Mentoria'), '');
        // juntar com um que já tem sugestão própria
        renomearOpcaoPeriodoBiografico(d, 'vinculos', 'Orientação', 'Namorados');
        assert.equal(naturezaSugeridaDoVinculo(d, 'Namorados'), 'Romance');
    });

    it('apagar o Vínculo apaga a sugestão dele', () => {
        const d = novoDb();
        definirNaturezaSugerida(d, 'Mentoria', 'Profissional');
        assert.equal(removerOpcaoPeriodoBiografico(d, 'vinculos', 'Mentoria').ok, true);
        assert.deepEqual(
            d.opcoesPeriodoBiografico.sugestoesNatureza.filter((s) => s.vinculo === 'Mentoria'),
            [],
        );
    });
});

describe('Natureza: gerenciar a lista', () => {
    it('conta o uso (períodos com alguma relação daquela Natureza)', () => {
        const d = novoDb();
        assert.equal(contarUsoOpcao(d, 'naturezas', 'amizade'), 2);
        assert.equal(contarUsoOpcao(d, 'naturezas', 'Romance'), 2);
        assert.equal(contarUsoOpcao(d, 'naturezas', 'Colega'), 0);
    });

    it('renomear propaga para as relações, para a lista e para as sugestões', () => {
        const d = novoDb();
        assert.equal(
            renomearOpcaoPeriodoBiografico(d, 'naturezas', 'Romance', 'Romântica').ok,
            true,
        );
        assert.ok(d.opcoesPeriodoBiografico.naturezas.includes('Romântica'));
        assert.ok(!d.opcoesPeriodoBiografico.naturezas.includes('Romance'));
        assert.equal(d.epocas[0].relacoes[1].natureza, 'Romântica');
        assert.equal(d.epocas[1].relacoes[1].natureza, 'Romântica');
        assert.equal(naturezaSugeridaDoVinculo(d, 'Namorados'), 'Romântica');
    });

    it('renomear para uma que já existe junta as duas e some a relação repetida', () => {
        const d = novoDb();
        d.epocas[0].relacoes.push({ de: AUTOR, para: 1, natureza: 'Colega', vinculo: '' });
        renomearOpcaoPeriodoBiografico(d, 'naturezas', 'Colega', 'Amizade');
        assert.equal(
            d.epocas[0].relacoes.filter((r) => r.para === 1 && r.natureza === 'Amizade').length,
            1,
        );
        assert.ok(!d.opcoesPeriodoBiografico.naturezas.includes('Colega'));
    });

    it('nome vazio é recusado', () => {
        const d = novoDb();
        assert.deepEqual(renomearOpcaoPeriodoBiografico(d, 'naturezas', 'Romance', '  '), {
            ok: false,
            motivo: 'vazio',
        });
    });

    it('só apaga a que nenhum período usa; apagar limpa as sugestões que apontavam para ela', () => {
        const d = novoDb();
        const emUso = removerOpcaoPeriodoBiografico(d, 'naturezas', 'Romance');
        assert.equal(emUso.ok, false);
        assert.equal(emUso.motivo, 'em-uso');
        assert.equal(removerOpcaoPeriodoBiografico(d, 'naturezas', 'Colega').ok, true);
        assert.ok(!d.opcoesPeriodoBiografico.naturezas.includes('Colega'));
        definirNaturezaSugerida(d, 'Mentoria', 'Sexual');
        removerOpcaoPeriodoBiografico(d, 'naturezas', 'Sexual');
        assert.equal(naturezaSugeridaDoVinculo(d, 'Mentoria'), '');
    });
});

describe('Natureza: frase da relação', () => {
    const ana = { nome: 'Ana', genero: 'Mulher' };
    const davi = { nome: 'Davi', genero: 'Homem' };

    it('sem vínculo, a frase é simétrica e usa a Natureza', () => {
        const d = novoDb();
        assert.equal(
            fraseDaRelacao({ de: 1, para: 4, natureza: 'Romance', vinculo: '' }, ana, davi, d),
            'Ana e Davi têm uma relação de romance',
        );
        assert.equal(
            fraseDaRelacao({ de: 1, para: 4, natureza: 'Familiar', vinculo: '' }, ana, davi, d),
            'Ana e Davi têm uma relação de familiar',
        );
    });

    it('com vínculo, nada muda (papéis e forma por gênero)', () => {
        const d = novoDb();
        assert.equal(
            fraseDaRelacao(
                { de: 1, para: 4, natureza: 'Familiar', vinculo: 'Responsável por' },
                ana,
                davi,
                d,
            ),
            'Ana é mãe de Davi',
        );
    });

    it('com vínculo simétrico, a frase mostra o vínculo (a Natureza fica no filtro)', () => {
        const d = novoDb();
        assert.equal(
            fraseDaRelacao(
                { de: 1, para: 4, natureza: 'Romance', vinculo: 'Namorados' },
                ana,
                davi,
                d,
            ),
            'Ana e Davi são namorados',
        );
    });

    describe('plural do vínculo simétrico', () => {
        const mariana = { nome: 'Mariana', genero: 'Mulher' };
        const caio = { nome: 'Caio', genero: 'Homem' };
        const bia = { nome: 'Bia', genero: 'Não-binário' };
        const rel = (vinculo) => ({ de: 1, para: 2, natureza: 'Amizade', vinculo });

        it('duas Mulheres usam o plural feminino', () => {
            const d = novoDb();
            assert.equal(
                fraseDaRelacao(rel('Amigos'), ana, mariana, d),
                'Ana e Mariana são amigas',
            );
        });

        it('dois Homens, um de cada, outro gênero ou vazio caem no masculino plural', () => {
            const d = novoDb();
            assert.equal(fraseDaRelacao(rel('Amigos'), davi, caio, d), 'Davi e Caio são amigos');
            assert.equal(fraseDaRelacao(rel('Amigos'), ana, caio, d), 'Ana e Caio são amigos');
            assert.equal(fraseDaRelacao(rel('Amigos'), ana, bia, d), 'Ana e Bia são amigos');
            assert.equal(
                fraseDaRelacao(rel('Amigos'), ana, { nome: 'Lu', genero: '' }, d),
                'Ana e Lu são amigos',
            );
        });

        it('sem o campo preenchido, volta ao formato com dois-pontos', () => {
            const d = novoDb();
            assert.equal(
                fraseDaRelacao(rel('Mentoria'), ana, mariana, d),
                'Ana e Mariana: Mentoria',
            );
            definirRotuloVinculo(d, 'Mentoria', { pluralMasculino: 'Mentorados' });
            assert.equal(
                fraseDaRelacao(rel('Mentoria'), ana, caio, d),
                'Ana e Caio são mentorados',
            );
            assert.equal(
                fraseDaRelacao(rel('Mentoria'), ana, mariana, d),
                'Ana e Mariana: Mentoria',
                'duas Mulheres sem plural feminino: não cai no masculino',
            );
        });

        it('pluralDoVinculo escolhe o campo pelo gênero das duas pontas', () => {
            const r = { pluralFeminino: 'amigas', pluralMasculino: 'amigos' };
            assert.equal(pluralDoVinculo(r, 'Mulher', 'Feminino'), 'amigas');
            assert.equal(pluralDoVinculo(r, 'Mulher', 'Homem'), 'amigos');
            assert.equal(pluralDoVinculo({}, 'Homem', 'Homem'), '');
        });

        it('os vínculos de fábrica já vêm com o plural (instalação nova e vocabulário antigo)', () => {
            const nova = { epocas: [] };
            migrarOpcoesPeriodoBiografico(nova);
            const antiga = {
                epocas: [],
                opcoesPeriodoBiografico: { esferas: [], vinculos: ['Mentoria'] },
            };
            migrarOpcoesPeriodoBiografico(antiga);
            [nova, antiga].forEach((d) =>
                assert.equal(
                    fraseDaRelacao(rel('Ex-namorados'), ana, mariana, d),
                    'Ana e Mariana são ex-namoradas',
                ),
            );
        });

        it('vínculo com lado oposto continua com "é": o plural não se aplica', () => {
            const d = novoDb();
            assert.equal(fraseDaRelacao(rel('Responsável por'), ana, davi, d), 'Ana é mãe de Davi');
        });
    });

    it('as linhas do cartão usam as frases novas', () => {
        const d = novoDb();
        assert.deepEqual(linhasDoPeriodoBiografico(d.epocas[0], d), [
            'Eva e Ana têm uma relação de amizade',
            'Eva e Davi são namorados',
        ]);
    });
});

describe('Natureza: filtro, busca e opções do filtro', () => {
    const f = (o) => ({
        esfera: '',
        categoria: '',
        pessoa: '',
        natureza: '',
        vinculo: '',
        ...o,
    });
    const ids = (lista) => lista.map((e) => e.id);

    it('filtra por Natureza (sem caixa nem acento)', () => {
        const d = novoDb();
        assert.deepEqual(
            ids(filtrarPeriodosBiograficos(d.epocas, f({ natureza: 'amizade' }), d)),
            [10, 11],
        );
        assert.deepEqual(
            ids(filtrarPeriodosBiograficos(d.epocas, f({ natureza: 'Romance' }), d)),
            [10],
            'o Romance do período 11 é com a pessoa oculta',
        );
        assert.deepEqual(filtrarPeriodosBiograficos(d.epocas, f({ natureza: 'Colega' }), d), []);
    });

    it('Natureza + Vínculo: a mesma relação tem de ter os dois', () => {
        const d = novoDb();
        assert.deepEqual(
            ids(
                filtrarPeriodosBiograficos(
                    d.epocas,
                    f({ natureza: 'Amizade', vinculo: 'Amigos' }),
                    d,
                ),
            ),
            [11],
        );
        assert.deepEqual(
            filtrarPeriodosBiograficos(
                d.epocas,
                f({ natureza: 'Amizade', vinculo: 'Namorados' }),
                d,
            ),
            [],
            'Amizade e Namorados existem no período 10, mas em relações diferentes',
        );
    });

    it('Natureza + Pessoa: a relação tem de ser daquela pessoa', () => {
        const d = novoDb();
        assert.deepEqual(
            ids(filtrarPeriodosBiograficos(d.epocas, f({ natureza: 'Amizade', pessoa: '1' }), d)),
            [10, 11],
        );
        assert.deepEqual(
            filtrarPeriodosBiograficos(d.epocas, f({ natureza: 'Amizade', pessoa: '4' }), d),
            [],
        );
    });

    it('Natureza com pessoa oculta não é achada, a menos que a tela peça', () => {
        const d = novoDb();
        assert.deepEqual(
            filtrarPeriodosBiograficos(d.epocas, f({ natureza: 'Romance', pessoa: '3' }), d),
            [],
        );
        assert.deepEqual(
            ids(
                filtrarPeriodosBiograficos(d.epocas, f({ natureza: 'Romance' }), d, {
                    incluirOcultas: true,
                }),
            ),
            [10, 11],
        );
    });

    it('relação só com Natureza não aparece no filtro de Vínculo', () => {
        const d = novoDb();
        assert.deepEqual(
            ids(filtrarPeriodosBiograficos(d.epocas, f({ vinculo: 'Amigos' }), d)),
            [11],
        );
    });

    it('opções do filtro: Naturezas em uso (só em relações visíveis)', () => {
        const d = novoDb();
        const o = opcoesDeFiltroBiografico(d);
        assert.deepEqual(o.naturezas, ['Amizade', 'Romance']);
        d.epocas[0].relacoes = d.epocas[0].relacoes.filter((r) => r.natureza !== 'Romance');
        assert.deepEqual(opcoesDeFiltroBiografico(d).naturezas, ['Amizade']);
    });

    it('texto de busca de Naturezas usa só relações visíveis, sem repetir', () => {
        const d = novoDb();
        assert.equal(textoBuscaNaturezas(d.epocas[0], d), 'Amizade, Romance');
        assert.equal(textoBuscaNaturezas(d.epocas[1], d), 'Amizade');
    });

    it('texto de busca de Vínculos ignora relação sem vínculo', () => {
        const d = novoDb();
        assert.equal(textoBuscaVinculos(d.epocas[0], d), 'Namorados');
    });
});

describe('Natureza: mesclar períodos', () => {
    it('relações iguais (mesma dupla, Natureza e Vínculo) se juntam', () => {
        const destino = {
            esferas: [],
            categorias: [],
            pessoasEnvolvidas: [{ pessoaId: 1 }],
            relacoes: [{ de: AUTOR, para: 1, natureza: 'Amizade', vinculo: '' }],
        };
        const origem = {
            esferas: [],
            categorias: [],
            pessoasEnvolvidas: [{ pessoaId: 1 }],
            relacoes: [
                { de: AUTOR, para: 1, natureza: 'Amizade', vinculo: '' },
                { de: AUTOR, para: 1, natureza: 'Profissional', vinculo: '' },
            ],
        };
        mesclarCamposDosPeriodos(destino, origem);
        assert.deepEqual(destino.relacoes, [
            { de: AUTOR, para: 1, natureza: 'Amizade', vinculo: '' },
            { de: AUTOR, para: 1, natureza: 'Profissional', vinculo: '' },
        ]);
    });
});

describe('Vínculo terapêutico de fábrica e plural neutro', () => {
    const ana = { nome: 'Ana', genero: 'Mulher' };
    const pablo = { nome: 'Pablo', genero: 'Homem' };
    const lu = { nome: 'Lu', genero: 'Não-binário' };
    const rel = (vinculo) => ({ de: 1, para: 2, natureza: NATUREZA_TERAPEUTICA, vinculo });
    const LADO_OPOSTO = 'Psicoterapeutizando de';

    it('Psicoterapeuta serve para qualquer gênero (sem forma feminina nem masculina)', () => {
        const d = novoDb();
        assert.equal(
            fraseDaRelacao(rel('Psicoterapeuta de'), ana, pablo, d),
            'Ana é psicoterapeuta de Pablo',
        );
        assert.equal(
            fraseDaRelacao(rel('Psicoterapeuta de'), pablo, ana, d),
            'Pablo é psicoterapeuta de Ana',
        );
        assert.equal(
            fraseDaRelacao(rel('Psicoterapeuta de'), lu, ana, d),
            'Lu é psicoterapeuta de Ana',
        );
        const rotulo = d.opcoesPeriodoBiografico.rotulosVinculo.find(
            (r) => r.nome === 'Psicoterapeuta de',
        );
        assert.equal(rotulo.feminino, '');
        assert.equal(rotulo.masculino, '');
    });

    it('o lado oposto tem forma feminina e o masculino cobre o neutro', () => {
        const d = novoDb();
        assert.equal(
            fraseDaRelacao(rel(LADO_OPOSTO), ana, pablo, d),
            'Ana é psicoterapeutizanda de Pablo',
        );
        assert.equal(
            fraseDaRelacao(rel(LADO_OPOSTO), pablo, ana, d),
            'Pablo é psicoterapeutizando de Ana',
        );
        assert.equal(
            fraseDaRelacao(rel(LADO_OPOSTO), lu, ana, d),
            'Lu é psicoterapeutizando de Ana',
        );
    });

    it('o vínculo traz a nota que explica o termo, vista pelos dois lados', () => {
        const d = novoDb();
        const nota = notaDoVinculo(d, 'Psicoterapeuta de');
        assert.match(nota, /^Psicoterapeutizando: paciente, cliente ou pessoa em psicoterapia\./);
        assert.match(nota, /passividade de "paciente" e comercial de "cliente"\.$/);
        assert.equal(notaDoVinculo(d, LADO_OPOSTO), nota);
        assert.equal(notaDoVinculo(d, 'Amigos'), '');
        assert.equal(notaDoVinculo(d, ''), '');
    });

    it('a nota é editável em Papéis e some quando limpa', () => {
        const d = novoDb();
        definirRotuloVinculo(d, 'Mentoria', { nota: 'Orientação de carreira' });
        assert.equal(notaDoVinculo(d, 'Mentoria'), 'Orientação de carreira');
        definirRotuloVinculo(d, 'Mentoria', { nota: '' });
        assert.equal(notaDoVinculo(d, 'Mentoria'), '');
        assert.ok(!d.opcoesPeriodoBiografico.rotulosVinculo.some((r) => r.nome === 'Mentoria'));
    });

    it('a Natureza é sugerida ao escolher o vínculo (nos dois lados)', () => {
        const d = novoDb();
        assert.equal(naturezaSugeridaDoVinculo(d, 'Psicoterapeuta de'), NATUREZA_TERAPEUTICA);
        assert.equal(naturezaSugeridaDoVinculo(d, LADO_OPOSTO), NATUREZA_TERAPEUTICA);
        assert.ok(d.opcoesPeriodoBiografico.naturezas.includes(NATUREZA_TERAPEUTICA));
    });

    it('entra uma única vez em quem já tinha o vocabulário, e o que foi apagado não volta', () => {
        const d = {
            epocas: [],
            opcoesPeriodoBiografico: {
                esferas: [],
                naturezas: ['Familiar'],
                vinculos: ['Mentoria'],
                sugestoesNatureza: [],
                rotulosVinculo: [],
            },
        };
        migrarOpcoesPeriodoBiografico(d);
        const op = d.opcoesPeriodoBiografico;
        assert.deepEqual(op.naturezas, ['Familiar', NATUREZA_TERAPEUTICA]);
        assert.ok(op.vinculos.includes('Psicoterapeuta de') && op.vinculos.includes('Mentoria'));
        assert.deepEqual(op.fabricaAplicada, ['psicoterapia']);
        removerOpcaoPeriodoBiografico(d, 'naturezas', NATUREZA_TERAPEUTICA);
        removerOpcaoPeriodoBiografico(d, 'vinculos', 'Psicoterapeuta de');
        migrarOpcoesPeriodoBiografico(d);
        assert.ok(!d.opcoesPeriodoBiografico.naturezas.includes(NATUREZA_TERAPEUTICA));
        assert.ok(!d.opcoesPeriodoBiografico.vinculos.includes('Psicoterapeuta de'));
    });

    describe('quem recebeu a primeira versão (Terapeutizante de)', () => {
        const v1 = () => ({
            nome: 'Terapeutizante de',
            inverso: 'Terapeutizando ou terapeutizanda de',
            feminino: 'Psicóloga de',
            masculino: 'Psicólogo de',
            inversoFeminino: 'Terapeutizanda de',
            inversoMasculino: 'Terapeutizando de',
        });
        const vocabulario = (rotulo, epocas = []) => ({
            epocas,
            opcoesPeriodoBiografico: {
                esferas: [],
                naturezas: ['Familiar', NATUREZA_TERAPEUTICA],
                vinculos: ['Terapeutizante de'],
                sugestoesNatureza: [
                    { vinculo: 'Terapeutizante de', natureza: NATUREZA_TERAPEUTICA },
                ],
                rotulosVinculo: [rotulo],
                fabricaAplicada: ['terapeutico'],
            },
        });

        it('intacta e sem uso: sai, e entra a versão nova', () => {
            const d = vocabulario(v1());
            migrarOpcoesPeriodoBiografico(d);
            const op = d.opcoesPeriodoBiografico;
            assert.ok(!op.vinculos.includes('Terapeutizante de'));
            assert.ok(!op.rotulosVinculo.some((r) => r.nome === 'Terapeutizante de'));
            assert.ok(op.vinculos.includes('Psicoterapeuta de'));
            assert.equal(naturezaSugeridaDoVinculo(d, 'Terapeutizante de'), '');
            assert.deepEqual(op.fabricaAplicada, ['terapeutico', 'psicoterapia']);
            const antes = structuredClone(op);
            migrarOpcoesPeriodoBiografico(d);
            assert.deepEqual(d.opcoesPeriodoBiografico, antes);
        });

        it('em uso por algum período: fica como está (nada se perde)', () => {
            const epocas = [
                {
                    id: 1,
                    pessoasEnvolvidas: [{ pessoaId: 1 }],
                    relacoes: [
                        {
                            de: 'autor',
                            para: 1,
                            natureza: NATUREZA_TERAPEUTICA,
                            vinculo: 'Terapeutizante de',
                        },
                    ],
                },
            ];
            const d = vocabulario(v1(), epocas);
            migrarOpcoesPeriodoBiografico(d);
            assert.ok(d.opcoesPeriodoBiografico.vinculos.includes('Terapeutizante de'));
            assert.ok(d.opcoesPeriodoBiografico.vinculos.includes('Psicoterapeuta de'));
        });

        it('editada pela pessoa: fica como está', () => {
            const editado = { ...v1(), feminino: 'Terapeuta mulher de' };
            const d = vocabulario(editado);
            migrarOpcoesPeriodoBiografico(d);
            assert.ok(d.opcoesPeriodoBiografico.vinculos.includes('Terapeutizante de'));
        });
    });

    it('não duplica nem sobrescreve o que a pessoa já tinha com o mesmo nome', () => {
        const d = {
            epocas: [],
            opcoesPeriodoBiografico: {
                esferas: [],
                naturezas: ['vínculo terapêutico'],
                vinculos: [LADO_OPOSTO],
                sugestoesNatureza: [],
                rotulosVinculo: [],
            },
        };
        migrarOpcoesPeriodoBiografico(d);
        const op = d.opcoesPeriodoBiografico;
        assert.deepEqual(op.naturezas, ['vínculo terapêutico']);
        assert.ok(!op.rotulosVinculo.some((r) => r.nome === 'Psicoterapeuta de'));
    });

    describe('plural neutro', () => {
        const rotulo = {
            pluralFeminino: 'amigas',
            pluralMasculino: 'amigos',
            pluralNeutro: 'amigues',
        };

        it('um de cada, outro gênero ou vazio usam o neutro', () => {
            assert.equal(pluralDoVinculo(rotulo, 'Mulher', 'Homem'), 'amigues');
            assert.equal(pluralDoVinculo(rotulo, 'Mulher', 'Não-binário'), 'amigues');
            assert.equal(pluralDoVinculo(rotulo, '', ''), 'amigues');
        });

        it('duas Mulheres e dois Homens continuam no feminino e no masculino', () => {
            assert.equal(pluralDoVinculo(rotulo, 'Mulher', 'Mulher'), 'amigas');
            assert.equal(pluralDoVinculo(rotulo, 'Homem', 'Homem'), 'amigos');
        });

        it('neutro vazio cai no masculino', () => {
            const sem = { pluralFeminino: 'amigas', pluralMasculino: 'amigos' };
            assert.equal(pluralDoVinculo(sem, 'Mulher', 'Homem'), 'amigos');
            assert.equal(pluralDoVinculo(sem, 'Mulher', 'Não-binário'), 'amigos');
        });

        it('sem campo nenhum para o caso, devolve vazio (a frase usa os dois-pontos)', () => {
            assert.equal(pluralDoVinculo({ pluralMasculino: 'amigos' }, 'Mulher', 'Mulher'), '');
            assert.equal(pluralDoVinculo({}, 'Mulher', 'Homem'), '');
        });

        it('a frase usa o neutro quando configurado', () => {
            const d = novoDb();
            definirRotuloVinculo(d, 'Amigos', { ...rotulo });
            assert.equal(
                fraseDaRelacao(
                    { de: 1, para: 2, natureza: 'Amizade', vinculo: 'Amigos' },
                    ana,
                    pablo,
                    d,
                ),
                'Ana e Pablo são amigues',
            );
            assert.equal(
                fraseDaRelacao(
                    { de: 1, para: 2, natureza: 'Amizade', vinculo: 'Amigos' },
                    ana,
                    ana,
                    d,
                ),
                'Ana e Ana são amigas',
            );
        });
    });
});
