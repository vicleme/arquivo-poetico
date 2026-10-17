// Importar campos por .json (lógica pura de js/importar-campos.js).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { garantirTema } from '../js/temas.js';
import { garantirEtiqueta } from '../js/etiquetas.js';
import {
    lerArquivoDeCampos,
    lerPapelDeTema,
    lerAcaoDeAssunto,
    categoriaDeEtiquetaPorRotulo,
    acharTextoDaEntrada,
    executarImportacaoCampos,
    preverImportacaoCampos,
} from '../js/importar-campos.js';

function texto(id, titulo, extra = {}) {
    return {
        id,
        titulo,
        temas: [],
        sinalizacoesTema: '',
        assuntosPapel: [],
        assuntosExcluidos: [],
        sinalizacoesTom: [],
        sinalizacoesEstilo: [],
        ...extra,
    };
}

function montar() {
    const dbRef = {
        poemas: [texto(1, 'Olhar Lírico'), texto(2, 'Caveira'), texto(3, 'Sem Nada')],
        prosas: [texto(10, 'Caveira'), texto(11, 'Crônica Azul')],
        temas: [],
        etiquetas: [],
        assuntos: [],
    };
    const saudade = garantirTema(dbRef, 'Saudade');
    const perda = garantirTema(dbRef, 'Perda');
    const festa = garantirTema(dbRef, 'Festa');
    dbRef.assuntos.push(
        { id: 100, nome: 'Tempo, memória e perda', notas: '', temaIds: [saudade, perda] },
        { id: 101, nome: 'Vida emocional', notas: '', temaIds: [saudade] },
        { id: 102, nome: 'Sociedade', notas: '', temaIds: [festa] },
    );
    garantirEtiqueta(dbRef, 'tom', 'Melancólico');
    garantirEtiqueta(dbRef, 'tradicao', 'Barroco');
    return dbRef;
}

const entradas = (payload) => lerArquivoDeCampos(payload).entradas;
const nomesTemas = (dbRef, item) =>
    item.temas.map((e) => [dbRef.temas.find((t) => t.id == e.temaId).nome, e.papel]);
const nomesEtiquetas = (dbRef, item, campo) =>
    item[campo].map((id) => dbRef.etiquetas.find((e) => e.id == id).nome);

describe('lerArquivoDeCampos', () => {
    it('aceita { textos } ou a lista direta e recusa o que não é lista', () => {
        assert.equal(lerArquivoDeCampos({ textos: [] }).ok, true);
        assert.equal(lerArquivoDeCampos([{ titulo: 'a' }]).entradas.length, 1);
        assert.equal(lerArquivoDeCampos({ itens: [] }).ok, false);
        assert.equal(lerArquivoDeCampos('x').ok, false);
        assert.equal(lerArquivoDeCampos(null).ok, false);
    });

    it('avisa quando o campo "formato" é de outra coisa', () => {
        const r = lerArquivoDeCampos({ formato: 'outro', textos: [] });
        assert.deepEqual(r.avisos, [{ motivo: 'formato-diferente', valor: 'outro' }]);
    });

    it('lê etiquetas em objeto, com rótulo, chave ou sem acento, em lista ou em texto', () => {
        const [e] = entradas({
            textos: [
                {
                    titulo: 'x',
                    etiquetas: {
                        Tom: ['Melancólico', ' Irônico '],
                        'Domínio Imagético': 'Astrologia, Mitologia',
                        dominioimagetico: ['Mar'],
                        tradicao: ['Barroco'],
                        OUTROS: ['Soltas'],
                    },
                },
            ],
        });
        assert.deepEqual(
            e.etiquetas.map((x) => [x.categoria, x.nome]),
            [
                ['tom', 'Melancólico'],
                ['tom', 'Irônico'],
                ['dominioImagetico', 'Astrologia'],
                ['dominioImagetico', 'Mitologia'],
                ['dominioImagetico', 'Mar'],
                ['tradicao', 'Barroco'],
                ['outros', 'Soltas'],
            ],
        );
        assert.deepEqual(e.problemas, []);
    });

    it('lê etiquetas em lista de { categoria, nome }', () => {
        const [e] = entradas([
            {
                titulo: 'x',
                etiquetas: [
                    { categoria: 'Tom', nome: 'Solar' },
                    { categoria: 'Estilo', etiqueta: 'Barroco, Árcade' },
                ],
            },
        ]);
        assert.deepEqual(
            e.etiquetas.map((x) => [x.categoria, x.nome]),
            [
                ['tom', 'Solar'],
                ['estilo', 'Barroco'],
                ['estilo', 'Árcade'],
            ],
        );
    });

    it('categoria desconhecida vira problema e não derruba o resto', () => {
        const [e] = entradas([{ titulo: 'x', etiquetas: { Humor: ['a'], Tom: ['b'] } }]);
        assert.deepEqual(e.problemas, [
            { campo: 'etiquetas', valor: 'Humor', motivo: 'categoria-desconhecida' },
        ]);
        assert.deepEqual(
            e.etiquetas.map((x) => x.nome),
            ['b'],
        );
    });

    it('lê temas como texto ou objeto, com papel em várias grafias', () => {
        const [e] = entradas([
            {
                titulo: 'x',
                temas: [
                    'Amor',
                    { tema: 'Saudade', papel: 'principal' },
                    { nome: 'Perda', papel: 'Secundário' },
                    { tema: 'Festa', papel: 'sem papel' },
                    { tema: 'Mar', papel: null },
                    { tema: 'Rio', papel: 'importantíssimo' },
                ],
            },
        ]);
        assert.deepEqual(e.temas, [
            { nome: 'Amor', papel: undefined },
            { nome: 'Saudade', papel: 'principal' },
            { nome: 'Perda', papel: 'secundario' },
            { nome: 'Festa', papel: '' },
            { nome: 'Mar', papel: '' },
        ]);
        assert.deepEqual(e.problemas, [
            { campo: 'temas', valor: 'Rio', motivo: 'papel-invalido', detalhe: 'importantíssimo' },
        ]);
    });

    it('lê assuntos: sem papel vale automático e "não se aplica" vira excluir', () => {
        const [e] = entradas([
            {
                titulo: 'x',
                assuntos: [
                    'Vida emocional',
                    { assunto: 'A', papel: 'Automático' },
                    { assunto: 'B', papel: 'principal' },
                    { assunto: 'C', papel: 'secundário' },
                    { assunto: 'D', papel: 'indefinido' },
                    { assunto: 'E', papel: 'não se aplica' },
                    { assunto: 'F', papel: 'nao-se-aplica' },
                    { assunto: 'G', papel: 'talvez' },
                ],
            },
        ]);
        assert.deepEqual(
            e.assuntos.map((a) => [a.nome, a.acao]),
            [
                ['Vida emocional', 'auto'],
                ['A', 'auto'],
                ['B', 'principal'],
                ['C', 'secundario'],
                ['D', ''],
                ['E', 'excluir'],
                ['F', 'excluir'],
            ],
        );
        assert.equal(e.problemas[0].motivo, 'papel-invalido');
    });

    it('entrada que não é objeto, tipo inválido e campos não-lista viram problema', () => {
        const [a, b, c] = entradas([
            'texto solto',
            { titulo: 'x', tipo: 'conto' },
            { titulo: 'y', temas: 'Amor', assuntos: 3 },
        ]);
        assert.equal(a.problemas[0].motivo, 'formato-invalido');
        assert.equal(b.problemas[0].motivo, 'tipo-invalido');
        assert.equal(b.tipo, null);
        assert.deepEqual(
            c.problemas.map((p) => p.campo),
            ['temas', 'assuntos'],
        );
    });

    it('aceita "título" com acento e tipo no plural', () => {
        const [e] = entradas([{ título: 'Olhar', tipo: 'Prosas' }]);
        assert.equal(e.titulo, 'Olhar');
        assert.equal(e.tipo, 'prosa');
    });

    it('lerPapelDeTema, lerAcaoDeAssunto e categoriaDeEtiquetaPorRotulo', () => {
        assert.deepEqual(lerPapelDeTema(undefined), { ok: true, papel: undefined });
        assert.deepEqual(lerPapelDeTema('Indefinido'), { ok: true, papel: '' });
        assert.equal(lerPapelDeTema('x').ok, false);
        assert.deepEqual(lerAcaoDeAssunto(undefined), { ok: true, acao: 'auto' });
        assert.equal(lerAcaoDeAssunto('Não se aplica').acao, 'excluir');
        assert.equal(categoriaDeEtiquetaPorRotulo('Domínio Imagético'), 'dominioImagetico');
        assert.equal(categoriaDeEtiquetaPorRotulo('Tema'), null);
    });
});

describe('acharTextoDaEntrada', () => {
    const db = montar();
    const achar = (e) => acharTextoDaEntrada(db, { id: null, titulo: '', tipo: null, ...e });

    it('acha por id, por título (sem caixa e sem acento) e informa a via', () => {
        assert.equal(achar({ id: 1 }).item.titulo, 'Olhar Lírico');
        assert.equal(achar({ id: '1' }).via, 'id');
        const r = achar({ titulo: 'olhar lirico' });
        assert.equal(r.item.id, 1);
        assert.equal(r.via, 'titulo');
    });

    it('título que existe em Poema e em Prosa é ambíguo, e o tipo desempata', () => {
        const r = achar({ titulo: 'Caveira' });
        assert.equal(r.status, 'ambiguo');
        assert.deepEqual(
            r.candidatos.map((c) => [c.tipo, c.id]),
            [
                ['poema', 2],
                ['prosa', 10],
            ],
        );
        assert.equal(achar({ titulo: 'Caveira', tipo: 'prosa' }).item.id, 10);
        assert.equal(achar({ titulo: 'Caveira', tipo: 'poema' }).item.id, 2);
    });

    it('id vence título ambíguo', () => {
        assert.equal(achar({ id: 10, titulo: 'Caveira' }).item.id, 10);
    });

    it('id que não bate com o título é conflito (não chuta)', () => {
        assert.equal(achar({ id: 1, titulo: 'Caveira' }).status, 'conflito');
    });

    it('id que não existe cai no título e avisa; sem título, não acha', () => {
        const r = achar({ id: 999, titulo: 'Sem Nada' });
        assert.equal(r.item.id, 3);
        assert.equal(r.aviso, 'id-nao-existe-usou-titulo');
        assert.equal(achar({ id: 999 }).status, 'nao-achado');
        assert.equal(achar({ titulo: 'Nenhum' }).status, 'nao-achado');
        assert.equal(achar({}).status, 'sem-referencia');
    });

    it('tipo restringe: id de poema com tipo prosa não acha', () => {
        assert.equal(achar({ id: 1, tipo: 'prosa' }).status, 'nao-achado');
    });
});

describe('executarImportacaoCampos: etiquetas', () => {
    it('soma etiquetas por categoria, cria as novas e não duplica', () => {
        const db = montar();
        const antes = db.etiquetas.length;
        const r = executarImportacaoCampos(
            db,
            entradas({
                textos: [
                    {
                        id: 1,
                        etiquetas: { Tom: ['melancólico', 'Irônico'], Estilo: ['Barroco'] },
                    },
                ],
            }),
        );
        const p = db.poemas[0];
        assert.deepEqual(nomesEtiquetas(db, p, 'sinalizacoesTom'), ['Melancólico', 'Irônico']);
        assert.deepEqual(nomesEtiquetas(db, p, 'sinalizacoesEstilo'), ['Barroco']);
        // Melancólico já existia; Irônico e o Barroco de Estilo são novos
        // (o Barroco de Tradição é outra etiqueta).
        assert.equal(db.etiquetas.length, antes + 2);
        assert.deepEqual(
            r.cadastroNovo.etiquetas.map((e) => [e.categoria, e.nome]),
            [
                ['tom', 'Irônico'],
                ['estilo', 'Barroco'],
            ],
        );
        assert.equal(r.resumo.vinculosEtiqueta, 3);
        assert.equal(r.resumo.alterados, 1);
    });

    it('etiqueta que o texto já tem vai para jaTinha e não conta como mudança', () => {
        const db = montar();
        executarImportacaoCampos(db, entradas([{ id: 1, etiquetas: { Tom: ['Melancólico'] } }]));
        const r = executarImportacaoCampos(
            db,
            entradas([{ id: 1, etiquetas: { Tom: ['Melancólico'] } }]),
        );
        assert.equal(r.itens[0].adicionados.etiquetas.length, 0);
        assert.equal(r.itens[0].jaTinha.etiquetas.length, 1);
        assert.equal(r.itens[0].mudou, false);
        assert.equal(r.resumo.semMudanca, 1);
        assert.equal(db.poemas[0].sinalizacoesTom.length, 1);
    });

    it('nunca tira etiqueta que o texto já tinha', () => {
        const db = montar();
        executarImportacaoCampos(db, entradas([{ id: 1, etiquetas: { Tom: ['Melancólico'] } }]));
        executarImportacaoCampos(db, entradas([{ id: 1, etiquetas: { Tom: ['Solar'] } }]));
        assert.deepEqual(nomesEtiquetas(db, db.poemas[0], 'sinalizacoesTom'), [
            'Melancólico',
            'Solar',
        ]);
    });
});

describe('executarImportacaoCampos: temas', () => {
    it('soma temas com papel, cria o novo e relata', () => {
        const db = montar();
        const r = executarImportacaoCampos(
            db,
            entradas([
                {
                    id: 1,
                    temas: [
                        { tema: 'Saudade', papel: 'principal' },
                        { tema: 'Horizonte', papel: 'secundario' },
                        'Perda',
                    ],
                },
            ]),
        );
        assert.deepEqual(nomesTemas(db, db.poemas[0]), [
            ['Saudade', 'principal'],
            ['Horizonte', 'secundario'],
            ['Perda', ''],
        ]);
        assert.equal(db.poemas[0].sinalizacoesTema, 'Saudade, Horizonte, Perda');
        assert.deepEqual(r.cadastroNovo.temas, ['Horizonte']);
        assert.equal(r.resumo.vinculosTema, 3);
    });

    it('muda o papel de um tema que o texto já tem, e sem papel no arquivo não mexe no papel', () => {
        const db = montar();
        executarImportacaoCampos(
            db,
            entradas([{ id: 1, temas: [{ tema: 'Saudade', papel: 'principal' }] }]),
        );
        const r1 = executarImportacaoCampos(
            db,
            entradas([{ id: 1, temas: [{ tema: 'saudade', papel: 'secundario' }] }]),
        );
        assert.deepEqual(r1.itens[0].papeisTema, [
            { nome: 'Saudade', de: 'principal', para: 'secundario' },
        ]);
        assert.deepEqual(nomesTemas(db, db.poemas[0]), [['Saudade', 'secundario']]);
        assert.equal(r1.resumo.papeisTema, 1);

        const r2 = executarImportacaoCampos(db, entradas([{ id: 1, temas: ['Saudade'] }]));
        assert.equal(r2.itens[0].mudou, false);
        assert.deepEqual(nomesTemas(db, db.poemas[0]), [['Saudade', 'secundario']]);

        executarImportacaoCampos(
            db,
            entradas([{ id: 1, temas: [{ tema: 'Saudade', papel: null }] }]),
        );
        assert.deepEqual(nomesTemas(db, db.poemas[0]), [['Saudade', '']]);
    });

    it('texto ainda sem `temas` (dado antigo, só o espelho) é migrado antes de somar', () => {
        const db = montar();
        db.poemas[2].sinalizacoesTema = 'Perda';
        delete db.poemas[2].temas;
        executarImportacaoCampos(
            db,
            entradas([{ id: 3, temas: [{ tema: 'Saudade', papel: 'principal' }] }]),
        );
        // O Tema que já estava (vindo do espelho) fica, e o novo entra depois.
        assert.deepEqual(nomesTemas(db, db.poemas[2]), [
            ['Perda', ''],
            ['Saudade', 'principal'],
        ]);
        assert.equal(db.poemas[2].sinalizacoesTema, 'Saudade, Perda');
    });
});

describe('executarImportacaoCampos: assuntos', () => {
    function comTemas(db) {
        executarImportacaoCampos(
            db,
            entradas([
                {
                    id: 1,
                    temas: [
                        { tema: 'Saudade', papel: 'principal' },
                        { tema: 'Perda', papel: 'secundario' },
                    ],
                },
            ]),
        );
        return db.poemas[0];
    }

    it('fixa o papel do assunto e volta ao automático', () => {
        const db = montar();
        const p = comTemas(db);
        executarImportacaoCampos(
            db,
            entradas([{ id: 1, assuntos: [{ assunto: 'Vida emocional', papel: 'secundario' }] }]),
        );
        assert.deepEqual(p.assuntosPapel, [{ assuntoId: 101, papel: 'secundario' }]);
        const r = executarImportacaoCampos(
            db,
            entradas([{ id: 1, assuntos: [{ assunto: 'vida emocional', papel: 'automatico' }] }]),
        );
        assert.deepEqual(p.assuntosPapel, []);
        assert.equal(r.resumo.assuntosAjustados, 1);
    });

    it('"indefinido" é um papel fixado de propósito (entrada com papel vazio)', () => {
        const db = montar();
        const p = comTemas(db);
        executarImportacaoCampos(
            db,
            entradas([{ id: 1, assuntos: [{ assunto: 'Vida emocional', papel: 'indefinido' }] }]),
        );
        assert.deepEqual(p.assuntosPapel, [{ assuntoId: 101, papel: '' }]);
    });

    it('"não se aplica" tira o assunto do texto, e automático o restaura', () => {
        const db = montar();
        const p = comTemas(db);
        executarImportacaoCampos(
            db,
            entradas([{ id: 1, assuntos: [{ assunto: 'Vida emocional', papel: 'principal' }] }]),
        );
        executarImportacaoCampos(
            db,
            entradas([
                { id: 1, assuntos: [{ assunto: 'Vida emocional', papel: 'não se aplica' }] },
            ]),
        );
        assert.deepEqual(p.assuntosExcluidos, [101]);
        assert.deepEqual(p.assuntosPapel, []);
        executarImportacaoCampos(db, entradas([{ id: 1, assuntos: ['Vida emocional'] }]));
        assert.deepEqual(p.assuntosExcluidos, []);
    });

    it('o assunto pode depender de um tema que vem na mesma entrada', () => {
        const db = montar();
        const r = executarImportacaoCampos(
            db,
            entradas([
                {
                    id: 3,
                    temas: [{ tema: 'Saudade', papel: 'principal' }],
                    assuntos: [{ assunto: 'Vida emocional', papel: 'secundario' }],
                },
            ]),
        );
        assert.deepEqual(db.poemas[2].assuntosPapel, [{ assuntoId: 101, papel: 'secundario' }]);
        assert.deepEqual(r.itens[0].problemas, []);
    });

    it('assunto inexistente ou sem tema no texto vira problema e nada é gravado', () => {
        const db = montar();
        const r = executarImportacaoCampos(
            db,
            entradas([
                {
                    id: 3,
                    assuntos: [
                        { assunto: 'Não Existe', papel: 'principal' },
                        { assunto: 'Sociedade', papel: 'principal' },
                    ],
                },
            ]),
        );
        assert.deepEqual(
            r.itens[0].problemas.map((p) => [p.valor, p.motivo]),
            [
                ['Não Existe', 'assunto-inexistente'],
                ['Sociedade', 'assunto-sem-tema-no-texto'],
            ],
        );
        assert.deepEqual(db.poemas[2].assuntosPapel, []);
        assert.equal(db.assuntos.length, 3);
        assert.equal(r.resumo.comProblema, 1);
    });

    it('tirar o tema depois não deixa sobrescrita órfã (a poda é a do modal)', () => {
        const db = montar();
        const p = comTemas(db);
        executarImportacaoCampos(
            db,
            entradas([{ id: 1, assuntos: [{ assunto: 'Sociedade', papel: 'principal' }] }]),
        );
        assert.deepEqual(p.assuntosPapel, []);
    });
});

describe('executarImportacaoCampos: achar texto e relatório', () => {
    it('não grava nada em texto não achado, ambíguo ou em conflito', () => {
        const db = montar();
        const r = executarImportacaoCampos(
            db,
            entradas([
                { titulo: 'Nenhum', etiquetas: { Tom: ['x'] } },
                { titulo: 'Caveira', etiquetas: { Tom: ['x'] } },
                { id: 1, titulo: 'Caveira', etiquetas: { Tom: ['x'] } },
                { etiquetas: { Tom: ['x'] } },
            ]),
        );
        assert.deepEqual(
            r.itens.map((i) => i.status),
            ['nao-achado', 'ambiguo', 'conflito', 'sem-referencia'],
        );
        assert.equal(r.resumo.naoAchados, 2);
        assert.equal(r.resumo.ambiguos, 1);
        assert.equal(r.resumo.conflitos, 1);
        assert.equal(r.resumo.alterados, 0);
        assert.equal(db.etiquetas.length, 2);
        assert.ok(db.poemas.every((p) => p.sinalizacoesTom.length === 0));
    });

    it('texto repetido no arquivo avisa, e entrada sem campos também', () => {
        const db = montar();
        const r = executarImportacaoCampos(
            db,
            entradas([
                { id: 1, etiquetas: { Tom: ['a'] } },
                { id: 1, etiquetas: { Tom: ['b'] } },
                { id: 2 },
            ]),
        );
        assert.deepEqual(r.itens[1].avisos, ['texto-repetido-no-arquivo']);
        assert.deepEqual(r.itens[2].avisos, ['entrada-sem-campos']);
        assert.equal(db.poemas[0].sinalizacoesTom.length, 2);
    });

    it('etiqueta nova repetida em vários textos conta uma vez no cadastro novo', () => {
        const db = montar();
        const r = executarImportacaoCampos(
            db,
            entradas([
                { id: 1, etiquetas: { Tom: ['Inédito'] }, temas: ['Tema Novo'] },
                { id: 2, etiquetas: { Tom: ['inédito'] }, temas: ['tema novo'] },
            ]),
        );
        assert.equal(r.cadastroNovo.etiquetas.length, 1);
        assert.deepEqual(r.cadastroNovo.temas, ['Tema Novo']);
        assert.equal(r.resumo.vinculosEtiqueta, 2);
    });
});

describe('desfazer e prévia', () => {
    function fotografia(db) {
        return JSON.stringify({
            poemas: db.poemas,
            prosas: db.prosas,
            temas: db.temas,
            etiquetas: db.etiquetas,
        });
    }
    const arquivo = [
        {
            id: 1,
            etiquetas: { Tom: ['Inédito'] },
            temas: [{ tema: 'Saudade', papel: 'principal' }, 'Tema Novo'],
            assuntos: [{ assunto: 'Vida emocional', papel: 'secundario' }],
        },
        { id: 11, etiquetas: { Estilo: ['Barroco'] } },
    ];

    it('desfazer devolve textos e cadastros ao que eram', () => {
        const db = montar();
        const antes = fotografia(db);
        const r = executarImportacaoCampos(db, entradas(arquivo));
        assert.notEqual(fotografia(db), antes);
        r.desfazer();
        assert.equal(fotografia(db), antes);
    });

    it('desfazer mantém os mesmos arrays (outros módulos seguram a referência)', () => {
        const db = montar();
        const temas = db.temas;
        const poemas = db.poemas;
        const r = executarImportacaoCampos(db, entradas(arquivo));
        r.desfazer();
        assert.equal(db.temas, temas);
        assert.equal(db.poemas, poemas);
    });

    it('a prévia devolve o mesmo relatório e não muda nada no db', () => {
        const db = montar();
        const antes = fotografia(db);
        const antesAssuntos = JSON.stringify(db.assuntos);
        const previa = preverImportacaoCampos(db, entradas(arquivo));
        assert.equal(fotografia(db), antes);
        assert.equal(JSON.stringify(db.assuntos), antesAssuntos);
        const real = executarImportacaoCampos(db, entradas(arquivo));
        assert.deepEqual(previa.resumo, real.resumo);
        assert.deepEqual(previa.cadastroNovo, real.cadastroNovo);
    });
});
