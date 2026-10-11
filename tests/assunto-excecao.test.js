import './helpers/localstorage-shim.js';
import './helpers/dom-shim.js';

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// Exceção de Assunto no texto. Pedido do Victor: um Tema como "Retrato de
// caráter" pode estar em dois Assuntos (Identidade e autoconhecimento;
// Vínculos e relações), mas num texto específico pertencer só a um deles.
// O Assunto segue derivado do Tema; o texto guarda só a lista dos Assuntos
// que a pessoa tirou dele (`assuntosExcluidos`). A exceção some junto se o
// Tema sair do texto ou deixar de levar àquele Assunto.

const { db } = await import('../js/db.js');
const U = await import('../js/utils.js');
const E = await import('../js/editor.js');
const { temasParaSalvar } = await import('../js/forms.js');
const { colunasTexto } = await import('../js/exportar-csv.js');
const { itemParaMarkdown } = await import('../js/exportar-md.js');
const { montarRegistro } = await import('../js/exportar.js');
const { aplicarImportacaoAditiva, classificarImportacaoAditiva } =
    await import('../js/importar-aditivo.js');

const TEMAS = [
    { id: 1, nome: 'Retrato de caráter', notas: '' },
    { id: 2, nome: 'Amor', notas: '' },
    { id: 3, nome: 'Brasil', notas: '' },
];
const ASSUNTOS = [
    { id: 10, nome: 'Identidade e autoconhecimento', notas: '', temaIds: [1] },
    { id: 11, nome: 'Vínculos e relações', notas: '', temaIds: [1, 2] },
    { id: 12, nome: 'Sociedade', notas: '', temaIds: [3] },
];

// `temas` é a fonte da verdade; `sinalizacoesTema` é o espelho de nomes que
// assuntosDoTexto lê (o app o mantém em sincronia ao salvar).
function texto(temas, extra = {}) {
    const porId = new Map(TEMAS.map((t) => [t.id, t.nome]));
    const espelho = temas.map((t) => porId.get(t.temaId)).join(', ');
    return { id: 7, titulo: 'T', temas, sinalizacoesTema: espelho, ...extra };
}
const nomes = (lista) => lista.map((e) => e.nome);

beforeEach(() => {
    db.temas = structuredClone(TEMAS);
    db.assuntos = structuredClone(ASSUNTOS);
    db.pessoas = [];
    db.grupos = [];
    db.autores = [];
    db.livros = [];
    db.poemas = [];
    db.prosas = [];
    E.resetTemasTexto('poemas');
    E.resetTemasTexto('prosas');
});

describe('cálculo: Assunto excluído do texto some de tudo que é derivado', () => {
    it('sem exceção, o Tema em dois Assuntos põe o texto nos dois (comportamento de sempre)', () => {
        const t = texto([{ temaId: 1, papel: 'principal' }]);
        assert.deepEqual(nomes(U.assuntosDoTexto(t, db.assuntos, db.temas)), [
            'Identidade e autoconhecimento',
            'Vínculos e relações',
        ]);
    });

    it('assuntosDoTexto ignora o Assunto excluído e mantém o outro', () => {
        const t = texto([{ temaId: 1, papel: 'principal' }], { assuntosExcluidos: [11] });
        assert.deepEqual(nomes(U.assuntosDoTexto(t, db.assuntos, db.temas)), [
            'Identidade e autoconhecimento',
        ]);
    });

    it('assuntosComPapel também (e nomesAssuntosPorPapel, texto e contagem)', () => {
        const t = texto([{ temaId: 1, papel: 'principal' }], { assuntosExcluidos: ['11'] });
        assert.deepEqual(nomes(U.assuntosComPapel(t, db.assuntos, db.temas)), [
            'Identidade e autoconhecimento',
        ]);
        assert.deepEqual(U.nomesAssuntosPorPapel(t, db.assuntos, db.temas, 'principal'), [
            'Identidade e autoconhecimento',
        ]);
        assert.equal(
            U.textoAssuntosComPapel(t, db.assuntos, db.temas),
            'Identidade e autoconhecimento (principal)',
        );
        const contagem = U.contarTextosPorAssunto([t], db.assuntos, db.temas);
        assert.equal(contagem.get(10), 1);
        assert.equal(contagem.get(11), 0);
    });

    it('aceita id numérico ou texto, e objetos { assuntoId }', () => {
        for (const lista of [[11], ['11'], [{ assuntoId: 11 }], [{ assuntoId: '11' }]]) {
            const t = texto([{ temaId: 1, papel: '' }], { assuntosExcluidos: lista });
            const doTexto = nomes(U.assuntosDoTexto(t, db.assuntos, db.temas));
            assert.ok(!doTexto.includes('Vínculos e relações'));
        }
    });

    it('excluir todos os Assuntos do texto deixa o texto sem Assunto, com o Tema intacto', () => {
        const t = texto([{ temaId: 1, papel: 'principal' }], { assuntosExcluidos: [10, 11] });
        assert.deepEqual(U.assuntosDoTexto(t, db.assuntos, db.temas), []);
        assert.deepEqual(U.temasDoTexto({ ...t, sinalizacoesTema: 'Retrato de caráter' }), [
            'Retrato de caráter',
        ]);
    });

    it('exceção de Assunto que o texto nem tem (órfã) não faz nada, nem cria Assunto', () => {
        const t = texto([{ temaId: 3, papel: '' }], { assuntosExcluidos: [10, 999] });
        assert.deepEqual(nomes(U.assuntosDoTexto(t, db.assuntos, db.temas)), ['Sociedade']);
    });

    it('dado ausente ou malformado não quebra', () => {
        for (const ruim of [undefined, null, 'x', 5, {}, [null, undefined, '']]) {
            const t = texto([{ temaId: 3, papel: '' }], { assuntosExcluidos: ruim });
            assert.deepEqual(nomes(U.assuntosDoTexto(t, db.assuntos, db.temas)), ['Sociedade']);
        }
    });

    it('com incluirExcluidos o modal vê o excluído (excluido: true, sem papel, no fim)', () => {
        const entradas = [{ nome: 'Retrato de caráter', papel: 'principal' }];
        const r = U.assuntosComPapelDeEntradas(entradas, [], db.assuntos, db.temas, [10], {
            incluirExcluidos: true,
        });
        assert.deepEqual(
            r.map((e) => [e.nome, e.excluido, e.papel]),
            [
                ['Vínculos e relações', false, 'principal'],
                ['Identidade e autoconhecimento', true, ''],
            ],
        );
    });

    it('a exceção vence a sobrescrita de papel do mesmo Assunto', () => {
        const t = texto([{ temaId: 1, papel: 'principal' }], {
            assuntosPapel: [{ assuntoId: 11, papel: 'secundario' }],
            assuntosExcluidos: [11],
        });
        const lista = nomes(U.assuntosComPapel(t, db.assuntos, db.temas));
        assert.ok(!lista.includes('Vínculos e relações'));
    });
});

describe('podarExcecoesAssunto: a exceção some junto com o que a justificava', () => {
    it('mantém só a de Assunto que existe e ainda se aplica aos Temas do texto', () => {
        const entradas = [{ nome: 'Retrato de caráter', papel: '' }];
        assert.deepEqual(
            U.podarExcecoesAssunto(entradas, ['11', '12', '999', '11'], db.assuntos, db.temas),
            [11],
        );
    });

    it('Tema saiu do texto: a exceção do Assunto que ele trazia é descartada', () => {
        assert.deepEqual(U.podarExcecoesAssunto([], ['11'], db.assuntos, db.temas), []);
        const entradas = [{ nome: 'Brasil', papel: '' }];
        assert.deepEqual(U.podarExcecoesAssunto(entradas, ['11'], db.assuntos, db.temas), []);
    });

    it('outro Tema do mesmo Assunto mantém a exceção', () => {
        const entradas = [
            { nome: 'Amor', papel: '' },
            { nome: 'Brasil', papel: '' },
        ];
        assert.deepEqual(U.podarExcecoesAssunto(entradas, [11], db.assuntos, db.temas), [11]);
    });
});

describe('editor: estado da exceção (excluir, restaurar, poda)', () => {
    it('"excluir" guarda a exceção e tira a sobrescrita de papel desse Assunto', () => {
        E.adicionarTemaTexto('poemas', 'Retrato de caráter');
        E.mudarPapelAssuntoTexto('poemas', '11', 'secundario');
        E.mudarPapelAssuntoTexto('poemas', '10', 'principal');
        E.mudarPapelAssuntoTexto('poemas', '11', 'excluir');
        assert.deepEqual(E.obterAssuntosExcluidosTexto('poemas'), ['11']);
        assert.deepEqual(E.obterAssuntosPapelTexto('poemas'), [
            { assuntoId: '10', papel: 'principal' },
        ]);
    });

    it('"auto" restaura: some a exceção e o Assunto volta a seguir o Tema', () => {
        E.adicionarTemaTexto('poemas', 'Retrato de caráter');
        E.mudarPapelAssuntoTexto('poemas', '11', 'excluir');
        E.mudarPapelAssuntoTexto('poemas', '11', 'auto');
        assert.deepEqual(E.obterAssuntosExcluidosTexto('poemas'), []);
        assert.deepEqual(E.obterAssuntosPapelTexto('poemas'), []);
    });

    it('tirar o Tema do texto limpa a exceção; recolocar o Tema traz o Assunto de volta', () => {
        E.adicionarTemaTexto('poemas', 'Retrato de caráter');
        E.mudarPapelAssuntoTexto('poemas', '11', 'excluir');
        E.removerTemaTexto('poemas', 0);
        assert.deepEqual(E.obterAssuntosExcluidosTexto('poemas'), []);
        E.adicionarTemaTexto('poemas', 'Retrato de caráter');
        assert.deepEqual(E.obterAssuntosExcluidosTexto('poemas'), []);
    });

    it('outro Tema do mesmo Assunto mantém a exceção ao remover um deles', () => {
        E.adicionarTemaTexto('poemas', 'Retrato de caráter, Amor');
        E.mudarPapelAssuntoTexto('poemas', '11', 'excluir');
        E.removerTemaTexto('poemas', 0); // sai "Retrato de caráter"; "Amor" ainda leva a 11
        assert.deepEqual(E.obterAssuntosExcluidosTexto('poemas'), ['11']);
    });

    it('abrir um texto carrega a exceção; abrir outro a limpa; poema e prosa são separados', () => {
        E.carregarTemasTexto(
            'poemas',
            texto([{ temaId: 1, papel: '' }], { assuntosExcluidos: [11] }),
        );
        assert.deepEqual(E.obterAssuntosExcluidosTexto('poemas'), ['11']);
        assert.deepEqual(E.obterAssuntosExcluidosTexto('prosas'), []);
        E.carregarTemasTexto('poemas', texto([{ temaId: 1, papel: '' }]));
        assert.deepEqual(E.obterAssuntosExcluidosTexto('poemas'), []);
    });

    it('texto antigo (sem o campo) abre sem exceção', () => {
        E.carregarTemasTexto('poemas', { id: 1, titulo: 'X', sinalizacoesTema: 'Amor' });
        assert.deepEqual(E.obterAssuntosExcluidosTexto('poemas'), []);
    });
});

describe('salvar: temasParaSalvar grava a exceção que ainda vale', () => {
    it('grava `assuntosExcluidos` com o id do cadastro', () => {
        E.adicionarTemaTexto('poemas', 'Retrato de caráter');
        E.mudarPapelAssuntoTexto('poemas', '11', 'excluir');
        const r = temasParaSalvar('poemas');
        assert.deepEqual(r.assuntosExcluidos, [11]);
        assert.deepEqual(r.temas, [{ temaId: 1, papel: '' }]);
        assert.deepEqual(r.assuntosPapel, []);
    });

    it('sem exceção grava lista vazia (e o Assunto segue os Temas)', () => {
        E.adicionarTemaTexto('poemas', 'Retrato de caráter');
        assert.deepEqual(temasParaSalvar('poemas').assuntosExcluidos, []);
    });

    it('o texto salvo e relido mostra só o Assunto que ficou', () => {
        E.adicionarTemaTexto('poemas', 'Retrato de caráter');
        E.mudarPapelAssuntoTexto('poemas', '11', 'excluir');
        const salvo = { id: 1, titulo: 'X', ...temasParaSalvar('poemas') };
        assert.deepEqual(nomes(U.assuntosDoTexto(salvo, db.assuntos, db.temas)), [
            'Identidade e autoconhecimento',
        ]);
    });
});

describe('saídas: tabela, busca, .md, CSV e JSON', () => {
    const item = {
        ...texto([{ temaId: 1, papel: 'principal' }], { assuntosExcluidos: [11] }),
        sinalizacoesTema: 'Retrato de caráter',
        texto: 'corpo',
    };

    it('.md lista só o Assunto que ficou', () => {
        const md = itemParaMarkdown(item, 1);
        assert.match(md, /Assunto[^\n]*Identidade e autoconhecimento/);
        assert.doesNotMatch(md, /Vínculos e relações/);
    });

    it('CSV: coluna `assuntos` só com o que ficou', () => {
        const colunas = colunasTexto('poema');
        const ctx = { banco: { assuntos: db.assuntos, temas: db.temas } };
        const valor = (nome) => colunas.find((c) => c.cabecalho === nome).valor(item, ctx);
        assert.equal(valor('assuntos'), 'Identidade e autoconhecimento');
        assert.equal(valor('assunto_principal'), 'Identidade e autoconhecimento');
    });

    it('JSON exportado leva o nome do Assunto excluído (o id não vale em outro acervo)', () => {
        const reg = montarRegistro('poema', item);
        assert.deepEqual(reg.assuntosExcluidos, [{ assuntoId: '11', nome: 'Vínculos e relações' }]);
    });

    it('JSON de texto sem exceção leva lista vazia', () => {
        const reg = montarRegistro('poema', texto([{ temaId: 1, papel: '' }]));
        assert.deepEqual(reg.assuntosExcluidos, []);
    });
});

describe('importação aditiva: casa o Assunto excluído pelo nome', () => {
    const registro = () => ({
        id: 42,
        tipo: 'poema',
        titulo: 'Poema Importado',
        texto: 'x',
        pessoas: [],
        autoria: [],
        gruposDiretosResolvidos: [],
        livrosResolvidos: [],
        contexto: { livro: null, parte: null, secao: null },
        temas: [{ temaId: 900, papel: 'principal', nome: 'Retrato de caráter' }],
        assuntosExcluidos: [
            { assuntoId: 555, nome: 'Vínculos E Relações' },
            { assuntoId: 556, nome: 'Assunto que não existe aqui' },
        ],
    });
    const dbDestino = () => ({
        poemas: [],
        prosas: [],
        pessoas: [],
        grupos: [],
        autores: [],
        epocas: [],
        periodosHistoricos: [],
        livros: [],
        escansoes: [],
        estruturasTextuais: [],
        temas: [{ id: 1, nome: 'Retrato de caráter', notas: '' }],
        assuntos: [
            { id: 77, nome: 'Identidade e autoconhecimento', notas: '', temaIds: [1] },
            { id: 78, nome: 'Vínculos e relações', notas: '', temaIds: [1] },
        ],
    });
    const deps = () => ({
        tirarSnapshotSeNecessario: mock.fn(async () => true),
        save: mock.fn(() => {}),
    });

    it('casa pelo nome (ignora caixa/acento) e descarta o que não existe no destino', async () => {
        const destino = dbDestino();
        const payload = { itens: [registro()] };
        const relatorio = classificarImportacaoAditiva(payload, destino);
        const r = await aplicarImportacaoAditiva(payload, relatorio, destino, deps());
        assert.equal(r.sucesso, true);
        assert.deepEqual(destino.poemas[0].assuntosExcluidos, [78]);
    });

    it('JSON antigo (sem assuntosExcluidos) importa com lista vazia', async () => {
        const destino = dbDestino();
        const antigo = registro();
        delete antigo.assuntosExcluidos;
        const payload = { itens: [antigo] };
        const relatorio = classificarImportacaoAditiva(payload, destino);
        await aplicarImportacaoAditiva(payload, relatorio, destino, deps());
        assert.deepEqual(destino.poemas[0].assuntosExcluidos, []);
    });

    it('exceção de Assunto que o texto importado não traz pelos Temas é descartada', async () => {
        const destino = dbDestino();
        const reg = registro();
        reg.temas = []; // sem Tema, o Assunto não se aplica
        const payload = { itens: [reg] };
        const relatorio = classificarImportacaoAditiva(payload, destino);
        await aplicarImportacaoAditiva(payload, relatorio, destino, deps());
        assert.deepEqual(destino.poemas[0].assuntosExcluidos, []);
    });
});
