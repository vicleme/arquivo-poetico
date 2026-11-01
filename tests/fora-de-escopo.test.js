import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    agruparMigradosSemLivro,
    chaveDeNomeDeLivro,
    dadosForaDeEscopoDaTela,
    descartadosSemLivroDeOrigem,
    foraDeEscopoDoLivro,
    migradosSemLivroDeOrigem,
    selosDeMigracaoDoLivro,
    textoAvisoDescartadosSemOrigem,
    textoAvisoMigradosSemLivro,
    textoDaEntradaForaDeEscopo,
    textoDeLugar,
    totalForaDeEscopo,
} from '../js/fora-de-escopo.js';
import {
    montarArvoreDoLivro,
    montarArvoreDaParte,
    montarArvoreDaSecao,
} from '../js/estrutura-livro.js';

// Fora de escopo: descartados e migrados, os dois com a origem em cortadoDe e só no
// livro de origem. Nada aparece em dois lugares.

function banco() {
    return {
        livros: [
            { id: 1, titulo: 'Livro Um', tipo: 'Inéditos' },
            { id: 2, titulo: 'Livro Dois ', tipo: 'Inéditos' },
            { id: 3, titulo: 'Coletânea X', tipo: 'Coletânea' },
        ],
        partes: [{ id: 100, livroId: 1, titulo: 'Parte A', sequencia: 1 }],
        secoes: [
            { id: 200, paiTipo: 'parte', paiId: 100, titulo: '1. Viagens', sequencia: 1 },
            { id: 201, paiTipo: 'parte', paiId: 100, titulo: '10. Fim', sequencia: 2 },
            { id: 202, paiTipo: 'livro', paiId: 1, titulo: 'Solta', sequencia: 2 },
            { id: 210, paiTipo: 'livro', paiId: 2, titulo: 'Cofre', sequencia: 1 },
        ],
        elementos: [],
        itensColetanea: [],
        poemas: [
            // descartados no Livro Um
            {
                id: 1,
                titulo: 'D da seção',
                status: 'descartado',
                paiTipo: 'secao',
                paiId: 200,
                sequencia: 3,
                livrosIds: [1],
                cortadoDe: { livro: 'Livro Um', secao: 'Parte A / 1. Viagens', posicao: 3 },
            },
            {
                id: 2,
                titulo: 'D sem posição',
                status: 'descartado',
                paiTipo: 'secao',
                paiId: 200,
                sequencia: null,
                livrosIds: [1],
                cortadoDe: { livro: ' LIVRO  um ', secao: 'Parte A / 1. Viagens' },
            },
            {
                id: 3,
                titulo: 'D do fim',
                status: 'descartado',
                paiTipo: 'secao',
                paiId: 201,
                sequencia: 1,
                livrosIds: [1],
                cortadoDe: { livro: 'Livro Um', secao: 'Parte A / 10. Fim', posicao: 1 },
            },
            {
                id: 4,
                titulo: 'D só vinculado',
                status: 'descartado',
                livrosIds: [1],
                cortadoDe: { livro: 'Livro Um' },
            },
            {
                id: 5,
                titulo: 'D direto no livro',
                status: 'descartado',
                paiTipo: 'livro',
                paiId: 1,
                sequencia: 7,
                livrosIds: [1],
                cortadoDe: { livro: 'Livro Um', posicao: 7 },
            },
            // publicado normal
            {
                id: 6,
                titulo: 'Normal',
                status: 'publicado',
                paiTipo: 'secao',
                paiId: 200,
                sequencia: 1,
                livrosIds: [1],
            },
            // migrados do Livro Um para o Livro Dois
            {
                id: 7,
                titulo: 'Migrado B',
                status: 'migrado',
                paiTipo: 'secao',
                paiId: 210,
                sequencia: 2,
                livrosIds: [2],
                cortadoDe: { livro: 'LIVRO UM', secao: '1. Viagens', posicao: 5 },
                lancadoEm: { livro: 'Livro Dois', secao: 'Cofre' },
            },
            {
                id: 8,
                titulo: 'Migrado A',
                status: 'migrado',
                paiTipo: 'secao',
                paiId: 210,
                sequencia: 1,
                livrosIds: [2],
                cortadoDe: { livro: 'livro um', secao: '1. Viagens', posicao: 2 },
            },
            // migrado dentro do mesmo livro (outra seção)
            {
                id: 9,
                titulo: 'Migrado interno',
                status: 'migrado',
                paiTipo: 'secao',
                paiId: 202,
                sequencia: 1,
                livrosIds: [1],
                cortadoDe: { livro: 'Livro Um', secao: '1. Viagens', posicao: 4 },
            },
            // migrado sem livro de origem informado
            {
                id: 10,
                titulo: 'Migrado sem livro',
                status: 'migrado',
                paiTipo: 'livro',
                paiId: 1,
                sequencia: 9,
                livrosIds: [1],
                cortadoDe: { livro: '', secao: 'Gaveta' },
            },
            // migrado de livro não cadastrado
            {
                id: 11,
                titulo: 'Veio de fora',
                status: 'migrado',
                paiTipo: 'livro',
                paiId: 2,
                sequencia: 3,
                livrosIds: [2],
                cortadoDe: { livro: 'Livro Antigo vol 1', secao: '' },
            },
        ],
        prosas: [
            {
                id: 50,
                titulo: 'Prosa descartada',
                status: 'descartado',
                secaoId: 200,
                sequencia: 4,
                livrosIds: [1],
                cortadoDe: { livro: 'Livro Um', secao: 'Parte A / 1. Viagens', posicao: 4 },
            },
            {
                id: 51,
                titulo: 'Prosa migrada',
                status: 'migrado',
                paiTipo: 'livro',
                paiId: 2,
                sequencia: 4,
                livrosIds: [2],
                cortadoDe: { livro: 'Livro Um', secao: '', posicao: 1 },
            },
        ],
    };
}

const titulos = (lista) => lista.map((e) => e.titulo);

describe('chaveDeNomeDeLivro', () => {
    it('ignora caixa, acento e espaços', () => {
        assert.equal(chaveDeNomeDeLivro('  Memórias   de um Poeta '), 'memorias de um poeta');
        assert.equal(chaveDeNomeDeLivro(null), '');
    });
});

describe('Descartados no Fora de escopo', () => {
    const fora = foraDeEscopoDoLivro(banco(), 1);

    it('traz os descartados do livro, na ordem de Parte/Seção do livro e posição; sem Seção por último', () => {
        assert.deepEqual(titulos(fora.descartados), [
            'D da seção',
            'Prosa descartada',
            'D sem posição',
            'D do fim',
            'D direto no livro',
            'D só vinculado',
        ]);
    });

    it('a origem é o Cortado de: Parte, Seção e posição', () => {
        const da = fora.descartados.find((e) => e.titulo === 'D da seção');
        assert.deepEqual(da.origem, { caminho: ['Parte A', '1. Viagens'], posicao: 3 });
        const fim = fora.descartados.find((e) => e.titulo === 'D do fim');
        assert.deepEqual(fim.origem.caminho, ['Parte A', '10. Fim']);
    });

    it('sem posição fica null; só o livro no Cortado de não inventa Seção nem posição', () => {
        const sem = fora.descartados.find((e) => e.titulo === 'D sem posição');
        assert.equal(sem.origem.posicao, null);
        const vinc = fora.descartados.find((e) => e.titulo === 'D só vinculado');
        assert.deepEqual(vinc.origem, { caminho: [], posicao: null });
    });

    it('texto direto no livro tem posição e nenhum caminho', () => {
        const d = fora.descartados.find((e) => e.titulo === 'D direto no livro');
        assert.deepEqual(d.origem, { caminho: [], posicao: 7 });
    });

    it('prosa também entra', () => {
        const p = fora.descartados.find((e) => e.tipo === 'prosa');
        assert.deepEqual(p.origem, { caminho: ['Parte A', '1. Viagens'], posicao: 4 });
    });

    it('descartado de um livro não aparece no Fora de escopo de outro', () => {
        assert.equal(foraDeEscopoDoLivro(banco(), 2).descartados.length, 0);
    });

    it('o destino guardado não conta: vale o livro do Cortado de', () => {
        const d = banco();
        const t = d.poemas.find((x) => x.id === 1);
        // Destino apontando para o Livro Dois, Cortado de ainda no Livro Um.
        Object.assign(t, { paiTipo: 'secao', paiId: 210, livrosIds: [2] });
        assert.ok(titulos(foraDeEscopoDoLivro(d, 1).descartados).includes('D da seção'));
        assert.ok(!titulos(foraDeEscopoDoLivro(d, 2).descartados).includes('D da seção'));
        // Sem destino nenhum, também continua no Livro Um.
        Object.assign(t, { paiTipo: null, paiId: null, livrosIds: [] });
        assert.ok(titulos(foraDeEscopoDoLivro(d, 1).descartados).includes('D da seção'));
    });

    it('sem livro no Cortado de, ou com livro fora do cadastro, não entra em livro algum', () => {
        const d = banco();
        d.poemas.find((x) => x.id === 1).cortadoDe = undefined;
        d.poemas.find((x) => x.id === 2).cortadoDe = { livro: 'Livro Antigo', secao: 'X' };
        const todos = [1, 2].flatMap((id) => titulos(foraDeEscopoDoLivro(d, id).descartados));
        assert.ok(!todos.includes('D da seção'));
        assert.ok(!todos.includes('D sem posição'));
    });

    it('o Cortado de do descartado casa o livro ignorando caixa e espaços', () => {
        assert.ok(titulos(fora.descartados).includes('D sem posição'));
    });

    it('o publicado nunca entra', () => {
        assert.ok(!titulos(fora.descartados).includes('Normal'));
    });
});

describe('Migrados no Fora de escopo', () => {
    const fora = foraDeEscopoDoLivro(banco(), 1);

    it('só no livro de origem, ordenados por seção de origem e posição', () => {
        assert.deepEqual(titulos(fora.migrados), ['Migrado A', 'Migrado B', 'Prosa migrada']);
    });

    it('casa o livro ignorando caixa e acento', () => {
        assert.ok(titulos(fora.migrados).includes('Migrado B'));
        assert.ok(titulos(fora.migrados).includes('Migrado A'));
    });

    it('guarda a origem (cortadoDe) e o destino (lugar real, posição = sequência)', () => {
        const b = fora.migrados.find((e) => e.titulo === 'Migrado B');
        assert.deepEqual(b.origem, { caminho: ['1. Viagens'], posicao: 5 });
        assert.deepEqual(b.destino, { livro: 'Livro Dois', secao: 'Cofre', posicao: 2 });
    });

    it('sem lancadoEm, o destino vem do lugar real (título aparado)', () => {
        const a = fora.migrados.find((e) => e.titulo === 'Migrado A');
        assert.deepEqual(a.destino, { livro: 'Livro Dois', secao: 'Cofre', posicao: 1 });
    });

    it('migrado que continua no mesmo livro não entra (só selo na árvore)', () => {
        assert.ok(!titulos(fora.migrados).includes('Migrado interno'));
        assert.ok(!titulos(fora.migrados).includes('Migrado sem livro'));
    });

    it('migrado não aparece no Fora de escopo do livro de destino', () => {
        assert.equal(foraDeEscopoDoLivro(banco(), 2).migrados.length, 0);
    });

    it('migrado de livro não cadastrado não aparece em livro algum', () => {
        const todos = [1, 2].flatMap((id) => titulos(foraDeEscopoDoLivro(banco(), id).migrados));
        assert.ok(!todos.includes('Veio de fora'));
    });

    it('sem posição de origem, a posição fica null', () => {
        const p = fora.migrados.find((e) => e.tipo === 'prosa');
        assert.deepEqual(p.origem, { caminho: [], posicao: 1 });
        const sem = banco();
        sem.poemas.find((x) => x.id === 8).cortadoDe.posicao = undefined;
        const a = foraDeEscopoDoLivro(sem, 1).migrados.find((e) => e.titulo === 'Migrado A');
        assert.equal(a.origem.posicao, null);
    });
});

describe('Casos de borda', () => {
    it('livro inexistente e Coletânea devolvem vazio', () => {
        assert.deepEqual(foraDeEscopoDoLivro(banco(), 999), { descartados: [], migrados: [] });
        assert.deepEqual(foraDeEscopoDoLivro(banco(), 3), { descartados: [], migrados: [] });
        assert.equal(totalForaDeEscopo(foraDeEscopoDoLivro(banco(), 3)), 0);
    });

    it('banco sem coleções não quebra', () => {
        assert.deepEqual(foraDeEscopoDoLivro({ livros: [{ id: 1, titulo: 'A' }] }, 1), {
            descartados: [],
            migrados: [],
        });
    });

    it('vínculo quebrado (Seção que não existe) não quebra, e a origem não muda', () => {
        const d = banco();
        d.poemas.find((x) => x.id === 1).paiId = 99999;
        const e = foraDeEscopoDoLivro(d, 1).descartados.find((x) => x.titulo === 'D da seção');
        assert.deepEqual(e.origem, { caminho: ['Parte A', '1. Viagens'], posicao: 3 });
    });

    it('livro sem título não pega descartado sem livro no Cortado de', () => {
        const d = banco();
        d.livros.push({ id: 9, titulo: '', tipo: 'Inéditos' });
        d.poemas.find((x) => x.id === 1).cortadoDe = undefined;
        assert.deepEqual(foraDeEscopoDoLivro(d, 9).descartados, []);
    });

    it('total soma os dois grupos', () => {
        assert.equal(totalForaDeEscopo(foraDeEscopoDoLivro(banco(), 1)), 6 + 3);
    });
});

describe('Textos das entradas', () => {
    it('textoDeLugar monta "Livro › Seção · posição N" (e "era a nº N na época" na origem)', () => {
        assert.equal(
            textoDeLugar({ livro: 'L', caminho: ['P', 'S'], posicao: 3 }),
            'L › P › S · posição 3',
        );
        assert.equal(
            textoDeLugar({ livro: 'L', caminho: ['P', 'S'], posicao: 3 }, { origem: true }),
            'L › P › S · era a nº 3 na época',
        );
        assert.equal(textoDeLugar({ posicao: 2 }, { origem: true }), 'era a nº 2 na época');
        assert.equal(textoDeLugar({ posicao: 0 }, { origem: true }), '');
        assert.equal(textoDeLugar({ livro: 'L', secao: 'S' }), 'L › S');
        // O Cortado de grava "Parte / Seção" em uma peça só: a barra vira seta.
        assert.equal(
            textoDeLugar({ livro: 'L', secao: 'P / S', posicao: 2 }, { origem: true }),
            'L › P › S · era a nº 2 na época',
        );
        assert.equal(textoDeLugar({ posicao: 2 }), 'posição 2');
        assert.equal(textoDeLugar({ posicao: 0 }), '');
        assert.equal(textoDeLugar(), '');
    });

    it('descartado e migrado têm a linha própria', () => {
        const fora = foraDeEscopoDoLivro(banco(), 1);
        const d = fora.descartados.find((e) => e.titulo === 'D da seção');
        assert.equal(
            textoDaEntradaForaDeEscopo(d),
            'Descartado (de Parte A › 1. Viagens · era a nº 3 na época)',
        );
        const vinc = fora.descartados.find((e) => e.titulo === 'D só vinculado');
        assert.equal(textoDaEntradaForaDeEscopo(vinc), 'Descartado');
        const b = fora.migrados.find((e) => e.titulo === 'Migrado B');
        assert.equal(
            textoDaEntradaForaDeEscopo(b),
            'Migrado (de 1. Viagens · era a nº 5 na época → agora em Livro Dois › Cofre · posição 2)',
        );
    });
});

describe('Selos de migração na árvore', () => {
    it('outro livro: "veio de Livro › Seção · posição N" no livro de destino', () => {
        const selos = selosDeMigracaoDoLivro(banco(), 2);
        assert.equal(
            selos.get('poema-7').texto,
            'veio de LIVRO UM › 1. Viagens · era a nº 5 na época',
        );
        assert.equal(selos.get('poema-7').mesmoLivro, false);
        assert.equal(selos.get('prosa-51').texto, 'veio de Livro Um · era a nº 1 na época');
    });

    it('mesmo livro: só Seção e posição, sem repetir o livro', () => {
        const selos = selosDeMigracaoDoLivro(banco(), 1);
        assert.equal(selos.get('poema-9').texto, 'veio de 1. Viagens · era a nº 4 na época');
        assert.equal(selos.get('poema-9').mesmoLivro, true);
    });

    it('sem livro informado vale como mesmo livro', () => {
        const selos = selosDeMigracaoDoLivro(banco(), 1);
        assert.equal(selos.get('poema-10').texto, 'veio de Gaveta');
        assert.equal(selos.get('poema-10').mesmoLivro, true);
    });

    it('migrado sem Seção nem posição de origem, no mesmo livro, não ganha selo', () => {
        const d = banco();
        d.poemas.find((x) => x.id === 9).cortadoDe = { livro: 'Livro Um', secao: '' };
        assert.equal(selosDeMigracaoDoLivro(d, 1).has('poema-9'), false);
    });

    it('só os migrados que estão no livro; Coletânea sem selos', () => {
        const selos = selosDeMigracaoDoLivro(banco(), 1);
        assert.equal(selos.has('poema-7'), false);
        assert.equal(selosDeMigracaoDoLivro(banco(), 3).size, 0);
    });
});

describe('"agora em" do migrado: lugar real primeiro, lancadoEm só como reserva', () => {
    // Migrado do Livro Um que hoje está na Seção "Cofre" do Livro Dois (cadastrados).
    const destinoDe = (mexer) => {
        const b = banco();
        mexer(b);
        const fora = foraDeEscopoDoLivro(b, 1);
        return fora.migrados.find((e) => e.titulo === 'Migrado B').destino;
    };

    it('seção renomeada depois: vale o nome de hoje, não o que foi digitado', () => {
        const d = destinoDe((b) => {
            b.poemas.find((p) => p.id === 7).lancadoEm = {
                livro: 'Livro Dois',
                secao: 'Poemas do Cofre',
            };
        });
        assert.deepEqual(d, { livro: 'Livro Dois', secao: 'Cofre', posicao: 2 });
    });

    it('movido de novo, para o topo do livro: vale o lugar real, e a posição acompanha', () => {
        const d = destinoDe((b) => {
            const p = b.poemas.find((x) => x.id === 7);
            p.paiTipo = 'livro';
            p.paiId = 2;
            p.sequencia = 4;
        });
        assert.deepEqual(d, { livro: 'Livro Dois', secao: '', posicao: 4 });
    });

    it('seção real com Parte: caminho completo, do topo para baixo', () => {
        const d = destinoDe((b) => {
            b.partes.push({ id: 300, livroId: 2, titulo: 'Parte Z', sequencia: 1 });
            b.secoes.find((s) => s.id === 210).paiTipo = 'parte';
            b.secoes.find((s) => s.id === 210).paiId = 300;
        });
        assert.deepEqual(d, { livro: 'Livro Dois', secao: 'Parte Z / Cofre', posicao: 2 });
    });

    it('destino fora do cadastro: usa o lancadoEm como reserva, sem posição', () => {
        const d = destinoDe((b) => {
            const p = b.poemas.find((x) => x.id === 7);
            p.paiTipo = null;
            p.paiId = null;
            p.livrosIds = [];
            p.lancadoEm = { livro: 'Blocos de Noite', secao: 'Poemas do Cofre' };
        });
        assert.deepEqual(d, { livro: 'Blocos de Noite', secao: 'Poemas do Cofre', posicao: null });
    });

    it('só vinculado a livro cadastrado: livro real e seção declarada do mesmo livro', () => {
        const d = destinoDe((b) => {
            const p = b.poemas.find((x) => x.id === 7);
            p.paiTipo = null;
            p.paiId = null;
            p.sequencia = 3;
            p.livrosIds = [2];
            p.lancadoEm = { livro: 'livro dois', secao: 'Cofre antigo' };
        });
        assert.deepEqual(d, { livro: 'Livro Dois', secao: 'Cofre antigo', posicao: null });
    });

    it('só vinculado: seção declarada de OUTRO livro não é reaproveitada', () => {
        const d = destinoDe((b) => {
            const p = b.poemas.find((x) => x.id === 7);
            p.paiTipo = null;
            p.paiId = null;
            p.livrosIds = [2];
            p.lancadoEm = { livro: 'Outro Livro', secao: 'Cofre antigo' };
        });
        assert.deepEqual(d, { livro: 'Livro Dois', secao: '', posicao: null });
    });

    it('sem lugar real e sem lancadoEm: destino vazio e a linha diz só "migrado"', () => {
        const b = banco();
        const p = b.poemas.find((x) => x.id === 7);
        p.paiTipo = null;
        p.paiId = null;
        p.livrosIds = [];
        delete p.lancadoEm;
        const e = foraDeEscopoDoLivro(b, 1).migrados.find((x) => x.titulo === 'Migrado B');
        assert.deepEqual(e.destino, { livro: '', secao: '', posicao: null });
        assert.equal(
            textoDaEntradaForaDeEscopo(e),
            'Migrado (de 1. Viagens · era a nº 5 na época → migrado)',
        );
    });
});

describe('migradosSemLivroDeOrigem', () => {
    it('lista o migrado cujo livro de origem não casa com o cadastro', () => {
        const lista = migradosSemLivroDeOrigem(banco());
        assert.deepEqual(lista, [
            { tipo: 'poema', id: 11, titulo: 'Veio de fora', livroDeOrigem: 'Livro Antigo vol 1' },
        ]);
    });
});

describe('aviso de migrados com livro de origem fora do cadastro', () => {
    const m = (titulo, livroDeOrigem) => ({ tipo: 'poema', id: titulo, titulo, livroDeOrigem });

    it('sem migrados, sem aviso', () => {
        assert.equal(textoAvisoMigradosSemLivro([]), '');
        assert.equal(textoAvisoMigradosSemLivro(), '');
    });

    it('um migrado, um livro', () => {
        assert.equal(
            textoAvisoMigradosSemLivro([m('Veio de fora', 'Livro Antigo vol 1')]),
            '1 migrado cita um livro que não está no cadastro: \u201cLivro Antigo vol 1\u201d (Veio de fora).',
        );
    });

    it('agrupa pelo nome citado, ignorando caixa, acento e espaços, e ordena os títulos', () => {
        const grupos = agruparMigradosSemLivro([
            m('Zeta', 'Dores do Crescimento '),
            m('Alfa', 'dores do  crescimento'),
            m('Beta', 'Outro'),
        ]);
        assert.deepEqual(grupos, [
            { livro: 'Dores do Crescimento', titulos: ['Alfa', 'Zeta'] },
            { livro: 'Outro', titulos: ['Beta'] },
        ]);
    });

    it('vários migrados e livros: plural e separador', () => {
        assert.equal(
            textoAvisoMigradosSemLivro([m('A', 'Livro X'), m('B', 'Livro X'), m('C', 'Livro Y')]),
            '3 migrados citam 2 livros que não estão no cadastro: \u201cLivro X\u201d (A, B); \u201cLivro Y\u201d (C).',
        );
    });

    it('corta em 4 títulos por livro e em 5 livros', () => {
        const muitos = ['a', 'b', 'c', 'd', 'e', 'f'].map((t) => m(t, 'Livro X'));
        assert.match(textoAvisoMigradosSemLivro(muitos), /\(a, b, c, d e mais 2\)\.$/);
        const livros = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((l) => m('t' + l, 'Livro ' + l));
        const texto = textoAvisoMigradosSemLivro(livros);
        assert.match(texto, /^7 migrados citam 7 livros que não estão no cadastro: /);
        assert.match(texto, /; e mais 2 livros\.$/);
        assert.ok(!texto.includes('Livro F'));
    });

    it('com o banco de teste, bate com a lista de migradosSemLivroDeOrigem', () => {
        assert.equal(
            textoAvisoMigradosSemLivro(migradosSemLivroDeOrigem(banco())),
            '1 migrado cita um livro que não está no cadastro: \u201cLivro Antigo vol 1\u201d (Veio de fora).',
        );
    });
});

describe('montarArvoreDoLivro com semDescartados', () => {
    const textos = (arvore) => {
        const saida = [];
        const visitar = (nos) =>
            nos.forEach((n) => {
                if (n.tipo === 'poema' || n.tipo === 'prosa') saida.push(n.dados.titulo);
                if (n.filhos) visitar(n.filhos);
            });
        visitar(arvore);
        return saida;
    };

    it('padrão: nada muda, descartados continuam na árvore e nos vinculados', () => {
        const m = montarArvoreDoLivro(banco(), 1);
        assert.ok(textos(m.arvore).includes('D da seção'));
        assert.ok(m.vinculados.some((n) => n.dados.titulo === 'D só vinculado'));
    });

    it('com semDescartados: some da árvore e dos vinculados, e o resto fica', () => {
        const m = montarArvoreDoLivro(banco(), 1, { semDescartados: true });
        const todos = [...textos(m.arvore), ...m.vinculados.map((n) => n.dados.titulo)];
        assert.ok(!todos.some((t) => t.startsWith('D ') || t === 'Prosa descartada'));
        assert.ok(todos.includes('Normal'));
        assert.ok(todos.includes('Migrado interno'));
    });

    it('migrado de outro livro fica na árvore do destino', () => {
        const m = montarArvoreDoLivro(banco(), 2, { semDescartados: true });
        assert.ok(textos(m.arvore).includes('Migrado B'));
    });

    it('Parte e Seção aceitam a mesma opção', () => {
        const d = banco();
        assert.ok(textos(montarArvoreDaParte(d, 100).arvore).includes('D da seção'));
        assert.ok(
            !textos(montarArvoreDaParte(d, 100, { semDescartados: true }).arvore).includes(
                'D da seção',
            ),
        );
        assert.ok(textos(montarArvoreDaSecao(d, 200).arvore).includes('D da seção'));
        assert.ok(
            !textos(montarArvoreDaSecao(d, 200, { semDescartados: true }).arvore).includes(
                'D da seção',
            ),
        );
    });
});

describe('Descartados fora de qualquer livro', () => {
    function comProblemas() {
        const d = banco();
        d.poemas.find((x) => x.id === 1).cortadoDe = undefined; // D da seção
        d.poemas.find((x) => x.id === 2).cortadoDe = { livro: 'Livro Antigo vol 1', secao: 'X' };
        d.prosas.find((x) => x.id === 50).cortadoDe = { livro: '  ' }; // Prosa descartada
        return d;
    }

    it('separa os sem livro no Cortado de dos que citam livro fora do cadastro', () => {
        const sem = descartadosSemLivroDeOrigem(comProblemas());
        assert.deepEqual(
            sem.semOrigem.map((e) => e.titulo),
            ['D da seção', 'Prosa descartada'],
        );
        assert.deepEqual(
            sem.foraDoCadastro.map((e) => [e.titulo, e.livroDeOrigem]),
            [['D sem posição', 'Livro Antigo vol 1']],
        );
    });

    it('banco sem problemas não devolve nada', () => {
        assert.deepEqual(descartadosSemLivroDeOrigem(banco()), {
            foraDoCadastro: [],
            semOrigem: [],
        });
    });

    it('aviso: frases separadas, no singular e no plural', () => {
        assert.equal(
            textoAvisoDescartadosSemOrigem(descartadosSemLivroDeOrigem(comProblemas())),
            '1 descartado cita um livro que não está no cadastro: \u201cLivro Antigo vol 1\u201d (D sem posição). ' +
                '2 descartados estão sem o livro em Cortado de e não aparecem em livro algum: D da seção, Prosa descartada.',
        );
        const um = banco();
        um.poemas.find((x) => x.id === 1).cortadoDe = undefined;
        assert.equal(
            textoAvisoDescartadosSemOrigem(descartadosSemLivroDeOrigem(um)),
            '1 descartado está sem o livro em Cortado de e não aparece em livro algum: D da seção.',
        );
    });

    it('sem nada a avisar, o aviso é vazio', () => {
        assert.equal(textoAvisoDescartadosSemOrigem(), '');
        assert.equal(textoAvisoDescartadosSemOrigem({ foraDoCadastro: [], semOrigem: [] }), '');
    });

    it('a tela recebe o aviso dos descartados junto com o dos migrados', () => {
        const { aviso } = dadosForaDeEscopoDaTela(comProblemas(), 1);
        assert.match(aviso, /1 migrado cita/);
        assert.match(aviso, /1 descartado cita um livro/);
        assert.match(aviso, /2 descartados estão sem o livro em Cortado de/);
        assert.ok(!dadosForaDeEscopoDaTela(banco(), 1).aviso.includes('descartado'));
    });

    it('muitos títulos viram "e mais N"', () => {
        const d = banco();
        for (let i = 0; i < 6; i++) {
            d.poemas.push({ id: 900 + i, titulo: `Solto ${i}`, status: 'descartado' });
        }
        assert.match(
            textoAvisoDescartadosSemOrigem(descartadosSemLivroDeOrigem(d)),
            /6 descartados estão sem o livro em Cortado de .*: Solto 0, Solto 1, Solto 2, Solto 3 e mais 2\./,
        );
    });
});
