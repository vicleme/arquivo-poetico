import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    AUTOR,
    ESFERAS_DE_FABRICA,
    VINCULOS_DE_FABRICA,
    ROTULOS_VINCULO_DE_FABRICA,
    ROTULOS_PLURAIS_DE_FABRICA,
    normalizarLista,
    normalizarRelacoes,
    normalizarPessoasEnvolvidas,
    normalizarEnvolvidosDoPeriodo,
    migrarCamposPeriodoBiografico,
    migrarOpcoesPeriodoBiografico,
    opcoesDoPeriodoBiografico,
    registrarValoresNovos,
    contarUsoOpcao,
    renomearOpcaoPeriodoBiografico,
    removerOpcaoPeriodoBiografico,
    definirRotuloVinculo,
    categoriaGenero,
    fraseDaRelacao,
    chaveTipoVinculo,
    mesclarPessoaNosPeriodos,
    removerPessoaDosPeriodos,
    restaurarPessoaNosPeriodos,
    mesclarCamposDosPeriodos,
    pessoasVisiveisDoPeriodo,
    relacoesVisiveisDoPeriodo,
    linhasDoPeriodoBiografico,
    periodoBateFiltroBiografico,
    filtrarPeriodosBiograficos,
    opcoesDeFiltroBiografico,
    textoBuscaPessoasDoPeriodo,
    textoBuscaVinculos,
} from '../js/periodo-biografico-campos.js';

const nomesFabrica = ROTULOS_VINCULO_DE_FABRICA.map((r) => r.nome);

const novoDb = () => ({
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
            esferas: ['Acadêmica', 'Afetiva'],
            categorias: ['Transição'],
            pessoasEnvolvidas: [{ pessoaId: 1 }, { pessoaId: 3 }],
            relacoes: [
                { de: AUTOR, para: 1, natureza: '', vinculo: 'Amizade' },
                { de: AUTOR, para: 3, natureza: '', vinculo: 'Romântico' },
            ],
        },
        {
            id: 11,
            nome: 'Intercâmbio',
            autorId: 1,
            esferas: ['Turística'],
            categorias: [],
            pessoasEnvolvidas: [{ pessoaId: 2 }],
            relacoes: [
                { de: AUTOR, para: 2, natureza: '', vinculo: 'Colega' },
                { de: AUTOR, para: 2, natureza: '', vinculo: 'Amizade' },
            ],
        },
    ],
    opcoesPeriodoBiografico: {
        esferas: ['Acadêmica'],
        vinculos: ['Amizade', 'Familiar', ...nomesFabrica],
        rotulosVinculo: ROTULOS_VINCULO_DE_FABRICA.map((r) => ({ ...r })),
    },
});

// Período de um casal (Ana e Davi) que são os responsáveis pelo autor.
const comFamilia = (d) => {
    d.epocas.push({
        id: 12,
        nome: 'Casamento',
        autorId: 1,
        esferas: ['Familiar'],
        categorias: [],
        pessoasEnvolvidas: [{ pessoaId: 1 }, { pessoaId: 4 }],
        relacoes: [
            { de: 1, para: 4, natureza: '', vinculo: 'Romântico' },
            { de: 1, para: AUTOR, natureza: '', vinculo: 'Responsável por' },
            { de: 4, para: AUTOR, natureza: '', vinculo: 'Responsável por' },
        ],
    });
    return d;
};

describe('normalização', () => {
    it('lista: tira vazios e repetidos sem diferenciar caixa nem acento', () => {
        assert.deepEqual(normalizarLista(['  Luto ', 'luto', '', 'Transição', 'transicao', 5]), [
            'Luto',
            'Transição',
        ]);
        assert.deepEqual(normalizarLista(null), []);
    });

    it('relações: descarta vazias, repetidas e de uma ponta com ela mesma', () => {
        const r = normalizarRelacoes([
            { de: AUTOR, para: 1, natureza: '', vinculo: 'Amizade' },
            { de: AUTOR, para: '1', natureza: '', vinculo: ' amizade ' },
            { de: 1, para: 1, natureza: '', vinculo: 'Amizade' },
            { de: AUTOR, para: AUTOR, natureza: '', vinculo: 'Amizade' },
            { de: AUTOR, para: 2, natureza: '', vinculo: '' },
            { de: null, para: 2, natureza: '', vinculo: 'X' },
            { de: 2, para: AUTOR, natureza: '', vinculo: 'Amizade' },
        ]);
        assert.deepEqual(r, [
            { de: AUTOR, para: 1, natureza: '', vinculo: 'Amizade' },
            { de: 2, para: AUTOR, natureza: '', vinculo: 'Amizade' },
        ]);
    });

    it('pessoas: um item por pessoa, sem vínculo, e quem está numa relação entra', () => {
        const r = normalizarPessoasEnvolvidas(
            [{ pessoaId: 1, vinculos: ['Amizade'] }, { pessoaId: '1' }, { vinculos: ['X'] }, {}],
            [{ de: AUTOR, para: 5, natureza: '', vinculo: 'Amizade' }],
        );
        assert.deepEqual(r, [{ pessoaId: 1 }, { pessoaId: 5 }]);
    });

    it('formato antigo: vínculos por pessoa viram relações autor → pessoa', () => {
        const r = normalizarEnvolvidosDoPeriodo({
            pessoasEnvolvidas: [{ pessoaId: 1, vinculos: ['Amizade', 'amizade', 'Colega'] }],
        });
        assert.deepEqual(r.pessoasEnvolvidas, [{ pessoaId: 1 }]);
        assert.deepEqual(r.relacoes, [
            { de: AUTOR, para: 1, natureza: 'Amizade', vinculo: '' },
            { de: AUTOR, para: 1, natureza: 'Colega', vinculo: '' },
        ]);
    });
});

describe('migração', () => {
    it('cria listas vazias nos períodos antigos', () => {
        const epocas = [{ id: 1, nome: 'A' }];
        migrarCamposPeriodoBiografico(epocas);
        assert.deepEqual(epocas[0].esferas, []);
        assert.deepEqual(epocas[0].categorias, []);
        assert.deepEqual(epocas[0].pessoasEnvolvidas, []);
        assert.deepEqual(epocas[0].relacoes, []);
    });

    describe('contextoRelacao (campo antigo, absorvido)', () => {
        it('sem pessoa ligada, o texto vai para o fim das Notas e a chave some', () => {
            const epocas = [
                { id: 1, nome: 'A', notas: 'nota minha', contextoRelacao: 'Parceiro A e B' },
                { id: 2, nome: 'B', notas: '', contextoRelacao: 'Davi e eu' },
            ];
            migrarCamposPeriodoBiografico(epocas);
            assert.equal(
                epocas[0].notas,
                'nota minha\n\nContexto do relacionamento (texto antigo): Parceiro A e B',
            );
            assert.equal(epocas[1].notas, 'Contexto do relacionamento (texto antigo): Davi e eu');
            epocas.forEach((e) => assert.equal('contextoRelacao' in e, false));
        });

        it('com pessoa ligada, o texto é descartado e as Notas ficam como estavam', () => {
            const epocas = [
                {
                    id: 1,
                    nome: 'A',
                    notas: 'nota minha',
                    contextoRelacao: 'Parceiro A e B',
                    pessoasEnvolvidas: [{ pessoaId: 3 }],
                },
            ];
            migrarCamposPeriodoBiografico(epocas);
            assert.equal(epocas[0].notas, 'nota minha');
            assert.equal('contextoRelacao' in epocas[0], false);
        });

        it('texto vazio ou já presente nas Notas não duplica nem acrescenta nada', () => {
            const epocas = [
                { id: 1, nome: 'A', notas: '', contextoRelacao: '   ' },
                {
                    id: 2,
                    nome: 'B',
                    notas: 'já falei de Davi e eu aqui',
                    contextoRelacao: 'Davi e eu',
                },
            ];
            migrarCamposPeriodoBiografico(epocas);
            assert.equal(epocas[0].notas, '');
            assert.equal(epocas[1].notas, 'já falei de Davi e eu aqui');
        });

        it('é idempotente: rodar de novo não acrescenta de novo', () => {
            const epocas = [{ id: 1, nome: 'A', notas: '', contextoRelacao: 'Davi e eu' }];
            migrarCamposPeriodoBiografico(epocas);
            const depois = epocas[0].notas;
            migrarCamposPeriodoBiografico(epocas);
            assert.equal(epocas[0].notas, depois);
        });
    });

    it('converte os vínculos do formato anterior e fica estável na segunda vez', () => {
        const epocas = [
            {
                id: 1,
                pessoasEnvolvidas: [
                    { pessoaId: 1, vinculos: ['Amizade'] },
                    { pessoaId: 2, vinculos: [] },
                ],
            },
        ];
        migrarCamposPeriodoBiografico(epocas);
        assert.deepEqual(epocas[0].pessoasEnvolvidas, [{ pessoaId: 1 }, { pessoaId: 2 }]);
        assert.deepEqual(epocas[0].relacoes, [
            { de: AUTOR, para: 1, natureza: 'Amizade', vinculo: '' },
        ]);
        const antes = structuredClone(epocas);
        migrarCamposPeriodoBiografico(epocas);
        assert.deepEqual(epocas, antes);
    });

    it('é idempotente com o modelo novo', () => {
        const d = novoDb();
        migrarCamposPeriodoBiografico(d.epocas);
        const antes = structuredClone(d.epocas);
        migrarCamposPeriodoBiografico(d.epocas);
        assert.deepEqual(d.epocas, antes);
    });

    it('semeia as listas e os rótulos de fábrica só quando a chave não existe', () => {
        const d = { epocas: [] };
        migrarOpcoesPeriodoBiografico(d);
        assert.deepEqual(d.opcoesPeriodoBiografico.esferas, ESFERAS_DE_FABRICA);
        assert.deepEqual(d.opcoesPeriodoBiografico.vinculos, [
            ...VINCULOS_DE_FABRICA,
            ...nomesFabrica,
            'Psicoterapeuta de',
        ]);
        assert.equal(
            d.opcoesPeriodoBiografico.rotulosVinculo.length,
            nomesFabrica.length + ROTULOS_PLURAIS_DE_FABRICA.length + 1, // + Psicoterapeuta de
        );
        assert.ok(!ESFERAS_DE_FABRICA.includes('Pessoal'));
        // lista esvaziada de propósito não é re-semeada
        d.opcoesPeriodoBiografico.esferas = [];
        d.opcoesPeriodoBiografico.rotulosVinculo = [];
        migrarOpcoesPeriodoBiografico(d);
        assert.deepEqual(d.opcoesPeriodoBiografico.esferas, []);
        assert.deepEqual(d.opcoesPeriodoBiografico.rotulosVinculo, []);
    });

    it('opções da versão anterior (sem rótulos) ganham os rótulos de fábrica', () => {
        const d = {
            epocas: [],
            opcoesPeriodoBiografico: { esferas: ['X'], vinculos: ['Amizade'] },
        };
        migrarOpcoesPeriodoBiografico(d);
        assert.deepEqual(d.opcoesPeriodoBiografico.esferas, ['X']);
        assert.ok(d.opcoesPeriodoBiografico.vinculos.includes('Responsável por'));
        assert.ok(
            d.opcoesPeriodoBiografico.rotulosVinculo.some((r) => r.nome === 'Responsável por'),
        );
    });

    it('valor usado por um período entra na lista (backup de outro aparelho)', () => {
        const d = novoDb();
        d.opcoesPeriodoBiografico.vinculos = ['Amizade'];
        migrarOpcoesPeriodoBiografico(d);
        assert.ok(d.opcoesPeriodoBiografico.esferas.includes('Turística'));
        assert.ok(d.opcoesPeriodoBiografico.vinculos.includes('Romântico'));
    });
});

describe('gênero e frases', () => {
    it('só Mulher e Homem escolhem forma; o resto usa a neutra', () => {
        assert.equal(categoriaGenero('Mulher'), 'feminino');
        assert.equal(categoriaGenero(' mulher '), 'feminino');
        assert.equal(categoriaGenero('FEMININO'), 'feminino');
        assert.equal(categoriaGenero('Homem'), 'masculino');
        assert.equal(categoriaGenero('Não-binário'), '');
        assert.equal(categoriaGenero(''), '');
        assert.equal(categoriaGenero(undefined), '');
    });

    it('vínculo orientado: forma por gênero de quem ocupa o papel', () => {
        const d = comFamilia(novoDb());
        const frases = relacoesVisiveisDoPeriodo(d.epocas[2], d).map((r) => r.frase);
        assert.deepEqual(frases, [
            'Ana e Davi: Romântico',
            'Ana é mãe de Eva',
            'Davi é pai de Eva',
        ]);
    });

    it('o lado oposto usa o gênero de quem é de: "Eva é filha de Ana"', () => {
        const d = novoDb();
        const de = { id: AUTOR, nome: 'Eva', genero: 'Mulher' };
        const para = { id: 1, nome: 'Ana', genero: 'Mulher' };
        const rel = { de: AUTOR, para: 1, natureza: '', vinculo: 'Filho ou filha de' };
        assert.equal(fraseDaRelacao(rel, de, para, d), 'Eva é filha de Ana');
        assert.equal(
            fraseDaRelacao(rel, { ...de, genero: 'Homem' }, para, d),
            'Eva é filho de Ana',
        );
    });

    it('gênero fora de Mulher e Homem usa o rótulo neutro', () => {
        const d = novoDb();
        const bia = { id: 2, nome: 'Bia', genero: 'Não-binário' };
        const eva = { id: AUTOR, nome: 'Eva', genero: '' };
        assert.equal(
            fraseDaRelacao(
                { de: 2, para: AUTOR, natureza: '', vinculo: 'Responsável por' },
                bia,
                eva,
                d,
            ),
            'Bia é responsável por Eva',
        );
        assert.equal(
            fraseDaRelacao(
                { de: AUTOR, para: 2, natureza: '', vinculo: 'Filho ou filha de' },
                eva,
                bia,
                d,
            ),
            'Eva é filho ou filha de Bia',
        );
    });

    it('vínculo simétrico com forma por gênero: "Ana é irmã de Davi"', () => {
        const d = novoDb();
        const ana = { id: 1, nome: 'Ana', genero: 'Mulher' };
        const davi = { id: 4, nome: 'Davi', genero: 'Homem' };
        assert.equal(
            fraseDaRelacao(
                { de: 1, para: 4, natureza: '', vinculo: 'Irmão ou irmã de' },
                ana,
                davi,
                d,
            ),
            'Ana é irmã de Davi',
        );
    });

    it('os dois lados do mesmo tipo têm a mesma chave de tipo', () => {
        const d = novoDb();
        assert.equal(
            chaveTipoVinculo(d, 'Filho ou filha de'),
            chaveTipoVinculo(d, 'responsável por'),
        );
        assert.notEqual(chaveTipoVinculo(d, 'Amizade'), chaveTipoVinculo(d, 'Colega'));
    });
});

describe('vocabulário', () => {
    it('opções = lista + lado oposto + o que está em uso, em ordem alfabética', () => {
        const d = novoDb();
        assert.deepEqual(opcoesDoPeriodoBiografico(d, 'esferas'), [
            'Acadêmica',
            'Afetiva',
            'Turística',
        ]);
        assert.deepEqual(opcoesDoPeriodoBiografico(d, 'categorias'), ['Transição']);
        const vinculos = opcoesDoPeriodoBiografico(d, 'vinculos');
        assert.ok(vinculos.includes('Colega'));
        assert.ok(vinculos.includes('Filho ou filha de'));
    });

    it('valor novo digitado entra na lista; o lado oposto de um rótulo não', () => {
        const d = novoDb();
        d.epocas[0].esferas.push('Luto');
        d.epocas[0].relacoes.push({ de: AUTOR, para: 1, natureza: '', vinculo: 'Mentoria' });
        d.epocas[0].relacoes.push({
            de: AUTOR,
            para: 1,
            natureza: '',
            vinculo: 'Filho ou filha de',
        });
        registrarValoresNovos(d, d.epocas[0]);
        assert.ok(d.opcoesPeriodoBiografico.esferas.includes('Luto'));
        assert.ok(d.opcoesPeriodoBiografico.vinculos.includes('Mentoria'));
        assert.ok(!d.opcoesPeriodoBiografico.vinculos.includes('Filho ou filha de'));
    });

    it('conta uso (os dois lados contam juntos) e renomeia na lista e nos períodos', () => {
        const d = comFamilia(novoDb());
        d.epocas[2].relacoes.push({
            de: AUTOR,
            para: 4,
            natureza: '',
            vinculo: 'Filho ou filha de',
        });
        assert.equal(contarUsoOpcao(d, 'vinculos', 'amizade'), 2);
        assert.equal(contarUsoOpcao(d, 'vinculos', 'Responsável por'), 1);
        assert.equal(contarUsoOpcao(d, 'vinculos', 'Filho ou filha de'), 1);
        const r = renomearOpcaoPeriodoBiografico(d, 'vinculos', 'Amizade', 'Amigo(a)');
        assert.equal(r.ok, true);
        assert.deepEqual(
            d.epocas[1].relacoes.map((x) => x.vinculo),
            ['Colega', 'Amigo(a)'],
        );
        assert.ok(d.opcoesPeriodoBiografico.vinculos.includes('Amigo(a)'));
        assert.ok(!d.opcoesPeriodoBiografico.vinculos.includes('Amizade'));
    });

    it('renomear para um nome que já existe junta os dois sem duplicar', () => {
        const d = novoDb();
        renomearOpcaoPeriodoBiografico(d, 'vinculos', 'Amizade', 'Colega');
        assert.deepEqual(
            d.epocas[1].relacoes.map((x) => x.vinculo),
            ['Colega'],
        );
    });

    it('renomear um vínculo com lado oposto leva o rótulo junto', () => {
        const d = comFamilia(novoDb());
        renomearOpcaoPeriodoBiografico(d, 'vinculos', 'Responsável por', 'Cuida de');
        const rotulo = d.opcoesPeriodoBiografico.rotulosVinculo.find((r) => r.nome === 'Cuida de');
        assert.equal(rotulo.inverso, 'Filho ou filha de');
        const frases = relacoesVisiveisDoPeriodo(d.epocas[2], d).map((r) => r.frase);
        assert.ok(frases.includes('Ana é mãe de Eva'));
    });

    it('juntar um vínculo com lado oposto a outro troca as pontas do lado oposto', () => {
        const d = comFamilia(novoDb());
        d.epocas[2].relacoes.push({
            de: AUTOR,
            para: 1,
            natureza: '',
            vinculo: 'Filho ou filha de',
        });
        renomearOpcaoPeriodoBiografico(d, 'vinculos', 'Responsável por', 'Familiar');
        assert.ok(
            !d.opcoesPeriodoBiografico.rotulosVinculo.some((r) => r.nome === 'Responsável por'),
        );
        const todas = d.epocas[2].relacoes.filter((r) => r.vinculo === 'Familiar');
        assert.ok(todas.some((r) => r.de === 1 && r.para === AUTOR));
        assert.ok(!d.epocas[2].relacoes.some((r) => r.vinculo === 'Filho ou filha de'));
    });

    it('recusa nome vazio e tipo inválido', () => {
        const d = novoDb();
        assert.equal(renomearOpcaoPeriodoBiografico(d, 'esferas', 'Afetiva', '  ').ok, false);
        assert.equal(renomearOpcaoPeriodoBiografico(d, 'categorias', 'Luto', 'X').ok, false);
    });

    it('só remove da lista o que nenhum período usa', () => {
        const d = novoDb();
        d.opcoesPeriodoBiografico.esferas.push('Espiritual');
        assert.equal(removerOpcaoPeriodoBiografico(d, 'esferas', 'Espiritual').ok, true);
        assert.ok(!d.opcoesPeriodoBiografico.esferas.includes('Espiritual'));
        const r = removerOpcaoPeriodoBiografico(d, 'esferas', 'Acadêmica');
        assert.equal(r.ok, false);
        assert.equal(r.motivo, 'em-uso');
        assert.equal(r.uso, 1);
    });

    it('apagar um vínculo sem uso apaga também o rótulo dele', () => {
        const d = novoDb();
        assert.equal(removerOpcaoPeriodoBiografico(d, 'vinculos', 'Responsável por').ok, true);
        assert.ok(
            !d.opcoesPeriodoBiografico.rotulosVinculo.some((r) => r.nome === 'Responsável por'),
        );
    });
});

describe('definir rótulo de vínculo', () => {
    it('cria lado oposto e formas por gênero para um vínculo próprio', () => {
        const d = novoDb();
        d.epocas[0].relacoes.push({ de: AUTOR, para: 1, natureza: '', vinculo: 'Mentoria' });
        registrarValoresNovos(d, d.epocas[0]);
        const r = definirRotuloVinculo(d, 'Mentoria', {
            inverso: 'Mentorado(a) por',
            feminino: 'Mentora de',
            masculino: 'Mentor de',
        });
        assert.equal(r.ok, true);
        const ana = { id: 1, nome: 'Ana', genero: 'Mulher' };
        const eva = { id: AUTOR, nome: 'Eva', genero: 'Mulher' };
        assert.equal(
            fraseDaRelacao({ de: 1, para: AUTOR, natureza: '', vinculo: 'Mentoria' }, ana, eva, d),
            'Ana é mentora de Eva',
        );
        assert.ok(opcoesDoPeriodoBiografico(d, 'vinculos').includes('Mentorado(a) por'));
    });

    it('recusa lado oposto que repete outro nome', () => {
        const d = novoDb();
        const r = definirRotuloVinculo(d, 'Responsável por', { inverso: 'Amizade' });
        assert.equal(r.ok, false);
        assert.equal(r.motivo, 'conflito');
    });

    it('mudar o lado oposto acompanha as relações que o usam', () => {
        const d = comFamilia(novoDb());
        d.epocas[2].relacoes.push({
            de: AUTOR,
            para: 1,
            natureza: '',
            vinculo: 'Filho ou filha de',
        });
        const atual = d.opcoesPeriodoBiografico.rotulosVinculo.find(
            (r) => r.nome === 'Responsável por',
        );
        definirRotuloVinculo(d, 'Responsável por', { ...atual, inverso: 'Dependente de' });
        assert.ok(d.epocas[2].relacoes.some((r) => r.vinculo === 'Dependente de'));
        assert.ok(!d.epocas[2].relacoes.some((r) => r.vinculo === 'Filho ou filha de'));
    });

    it('tirar o lado oposto vira as relações dele para o nome direto', () => {
        const d = novoDb();
        d.epocas[0].relacoes.push({
            de: AUTOR,
            para: 1,
            natureza: '',
            vinculo: 'Filho ou filha de',
        });
        definirRotuloVinculo(d, 'Responsável por', { feminino: 'Mãe de', masculino: 'Pai de' });
        assert.deepEqual(d.epocas[0].relacoes.at(-1), {
            de: 1,
            para: AUTOR,
            natureza: '',
            vinculo: 'Responsável por',
        });
    });

    it('tudo vazio apaga o rótulo e o vínculo vira simétrico', () => {
        const d = novoDb();
        definirRotuloVinculo(d, 'Irmão ou irmã de', {});
        assert.ok(
            !d.opcoesPeriodoBiografico.rotulosVinculo.some((r) => r.nome === 'Irmão ou irmã de'),
        );
    });
});

describe('mesclar e excluir Pessoa', () => {
    it('mesclar: origem vira destino nas relações e nas envolvidas', () => {
        const d = novoDb();
        mesclarPessoaNosPeriodos(d, 2, 1);
        assert.deepEqual(d.epocas[1].pessoasEnvolvidas, [{ pessoaId: 1 }]);
        assert.deepEqual(d.epocas[1].relacoes, [
            { de: AUTOR, para: 1, natureza: '', vinculo: 'Colega' },
            { de: AUTOR, para: 1, natureza: '', vinculo: 'Amizade' },
        ]);
    });

    it('mesclar duas pessoas que se relacionam apaga a relação entre elas', () => {
        const d = comFamilia(novoDb());
        mesclarPessoaNosPeriodos(d, 4, 1);
        assert.ok(!d.epocas[2].relacoes.some((r) => r.vinculo === 'Romântico'));
        assert.deepEqual(d.epocas[2].pessoasEnvolvidas, [{ pessoaId: 1 }]);
    });

    it('excluir devolve o que saiu e o Desfazer repõe no mesmo lugar', () => {
        const d = comFamilia(novoDb());
        const antes = structuredClone(d.epocas);
        const removidos = removerPessoaDosPeriodos(d, 1);
        assert.equal(removidos.length, 2);
        assert.equal(d.epocas[0].pessoasEnvolvidas.length, 1);
        assert.deepEqual(
            d.epocas[2].relacoes,
            [{ de: 4, para: AUTOR, natureza: '', vinculo: 'Responsável por' }],
            'relações da pessoa saem junto',
        );
        restaurarPessoaNosPeriodos(d, removidos);
        assert.deepEqual(d.epocas, antes);
    });

    it('mesclar períodos soma Esfera, Categoria, pessoas e relações', () => {
        const d = novoDb();
        mesclarCamposDosPeriodos(d.epocas[0], d.epocas[1]);
        assert.deepEqual(d.epocas[0].esferas, ['Acadêmica', 'Afetiva', 'Turística']);
        assert.equal(d.epocas[0].pessoasEnvolvidas.length, 3);
        assert.equal(d.epocas[0].relacoes.length, 4);
    });
});

describe('privacidade: pessoa oculta', () => {
    it('some do período, da frase, da busca e das opções de filtro; o período fica', () => {
        const d = novoDb();
        assert.deepEqual(
            pessoasVisiveisDoPeriodo(d.epocas[0], d).map((p) => p.nome),
            ['Ana'],
        );
        assert.deepEqual(linhasDoPeriodoBiografico(d.epocas[0], d), ['Eva e Ana: Amizade']);
        assert.equal(textoBuscaPessoasDoPeriodo(d.epocas[0], d), 'Ana');
        assert.deepEqual(
            opcoesDeFiltroBiografico(d).pessoas.map((p) => p.nome),
            ['Ana', 'Bia'],
        );
        assert.equal(
            periodoBateFiltroBiografico(d.epocas[0], { pessoa: '3' }, d),
            false,
            'filtrar por pessoa oculta não acha nada',
        );
        assert.equal(d.epocas.length, 2);
    });

    it('relação entre pessoa visível e oculta some inteira', () => {
        const d = comFamilia(novoDb());
        d.pessoas.find((p) => p.id === 4).oculto = true;
        const linhas = linhasDoPeriodoBiografico(d.epocas[2], d);
        assert.deepEqual(linhas, ['Ana é mãe de Eva']);
        assert.ok(!linhas.join(' ').includes('Davi'));
        assert.ok(!textoBuscaVinculos(d.epocas[2], d).includes('Romântico'));
    });

    it('pessoa visível sem relação visível aparece só pelo nome', () => {
        const d = comFamilia(novoDb());
        d.pessoas.find((p) => p.id === 4).oculto = true;
        d.epocas[2].pessoasEnvolvidas.push({ pessoaId: 2 });
        assert.deepEqual(linhasDoPeriodoBiografico(d.epocas[2], d), ['Ana é mãe de Eva', 'Bia']);
    });

    it('pessoa excluída do cadastro também não aparece', () => {
        const d = novoDb();
        d.pessoas = d.pessoas.filter((p) => p.id !== 1);
        assert.deepEqual(pessoasVisiveisDoPeriodo(d.epocas[0], d), []);
        assert.deepEqual(linhasDoPeriodoBiografico(d.epocas[0], d), []);
    });
});

describe('filtros', () => {
    const f = (o) => ({ esfera: '', categoria: '', pessoa: '', vinculo: '', ...o });
    const ids = (lista) => lista.map((e) => e.id);

    it('sem filtro, passa tudo', () => {
        const d = novoDb();
        assert.equal(filtrarPeriodosBiograficos(d.epocas, f(), d).length, 2);
    });

    it('por Esfera e por Categoria (sem diferenciar caixa e acento)', () => {
        const d = novoDb();
        assert.deepEqual(
            ids(filtrarPeriodosBiograficos(d.epocas, f({ esfera: 'turistica' }), d)),
            [11],
        );
        assert.deepEqual(
            ids(filtrarPeriodosBiograficos(d.epocas, f({ categoria: 'transicao' }), d)),
            [10],
        );
    });

    it('por Pessoa e por Vínculo', () => {
        const d = novoDb();
        assert.deepEqual(ids(filtrarPeriodosBiograficos(d.epocas, f({ pessoa: '2' }), d)), [11]);
        assert.deepEqual(
            ids(filtrarPeriodosBiograficos(d.epocas, f({ vinculo: 'Amizade' }), d)),
            [10, 11],
        );
    });

    it('Pessoa + Vínculo: o vínculo tem de ser daquela pessoa', () => {
        const d = novoDb();
        assert.deepEqual(
            filtrarPeriodosBiograficos(d.epocas, f({ pessoa: '1', vinculo: 'Colega' }), d),
            [],
        );
        assert.deepEqual(
            ids(filtrarPeriodosBiograficos(d.epocas, f({ pessoa: '2', vinculo: 'Colega' }), d)),
            [11],
        );
    });

    it('vínculo com pessoa oculta não é achado', () => {
        const d = novoDb();
        assert.deepEqual(filtrarPeriodosBiograficos(d.epocas, f({ vinculo: 'Romântico' }), d), []);
    });

    it('vínculo orientado: os dois lados são o mesmo filtro', () => {
        const d = comFamilia(novoDb());
        assert.deepEqual(
            ids(filtrarPeriodosBiograficos(d.epocas, f({ vinculo: 'Filho ou filha de' }), d)),
            [12],
        );
        assert.deepEqual(
            ids(filtrarPeriodosBiograficos(d.epocas, f({ vinculo: 'Responsável por' }), d)),
            [12],
        );
    });

    it('Pessoa + Vínculo vale para pessoa em qualquer ponta da relação', () => {
        const d = comFamilia(novoDb());
        assert.deepEqual(
            ids(filtrarPeriodosBiograficos(d.epocas, f({ pessoa: '4', vinculo: 'Romântico' }), d)),
            [12],
            'Davi é a ponta "para" da relação romântica',
        );
        assert.deepEqual(
            ids(filtrarPeriodosBiograficos(d.epocas, f({ pessoa: '4', vinculo: 'Amizade' }), d)),
            [],
        );
    });

    it('filtros juntos valem ao mesmo tempo', () => {
        const d = novoDb();
        assert.equal(
            filtrarPeriodosBiograficos(d.epocas, f({ esfera: 'Afetiva', pessoa: '2' }), d).length,
            0,
        );
    });

    it('opções de filtro só trazem o que algum período usa', () => {
        const d = comFamilia(novoDb());
        const o = opcoesDeFiltroBiografico(d);
        assert.deepEqual(o.esferas, ['Acadêmica', 'Afetiva', 'Familiar', 'Turística']);
        assert.deepEqual(o.categorias, ['Transição']);
        const resp = o.vinculos.find((v) => v.valor === 'Responsável por');
        assert.equal(resp.rotulo, 'Responsável por / Filho ou filha de');
        assert.ok(!o.vinculos.some((v) => v.rotulo === 'Filho ou filha de'));
    });

    it('texto de busca de vínculos usa só relações visíveis, sem repetir', () => {
        const d = novoDb();
        assert.equal(textoBuscaVinculos(d.epocas[1], d), 'Colega, Amizade');
        assert.equal(textoBuscaVinculos(d.epocas[0], d), 'Amizade');
        comFamilia(d);
        const texto = textoBuscaVinculos(d.epocas[2], d);
        assert.ok(texto.includes('Responsável por') && texto.includes('Filho ou filha de'));
    });
});
