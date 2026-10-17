import './helpers/localstorage-shim.js';
import './helpers/dom-shim.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Bloco 3: o backup completo leva Esfera, Categoria, Pessoas envolvidas com
// Vínculo, o cadastro de Pessoas (com o flag oculto) e a lista de valores.
const { db, importarDB } = await import('../js/db.js');

function montar() {
    db.autores = [{ id: 1, nome: 'Ana' }];
    db.pessoas = [
        { id: 100, nome: 'Carla', oculto: false },
        { id: 101, nome: 'Davi', oculto: true },
    ];
    db.opcoesPeriodoBiografico = {
        esferas: ['Afetiva', 'Criada'],
        vinculos: ['Amizade', 'Outro', 'Mentoria'],
        rotulosVinculo: [{ nome: 'Mentoria', inverso: 'Mentorado(a) por', feminino: 'Mentora de' }],
    };
    db.epocas = [
        {
            id: 7,
            nome: 'Fase A',
            autorId: 1,
            esferas: ['Afetiva', 'Criada'],
            categorias: ['Transição'],
            pessoasEnvolvidas: [{ pessoaId: 100 }, { pessoaId: 101 }],
            relacoes: [
                { de: 'autor', para: 100, natureza: '', vinculo: 'Amizade' },
                { de: 100, para: 101, natureza: '', vinculo: 'Mentoria' },
            ],
        },
    ];
}

describe('backup: período biográfico (ida e volta)', () => {
    it('preserva esferas, categorias, pessoas envolvidas, vínculos e oculto', async () => {
        montar();
        const backup = JSON.parse(JSON.stringify(db));
        db.epocas = [];
        db.pessoas = [];
        db.opcoesPeriodoBiografico = null;

        await importarDB(backup);

        const e = db.epocas.find((x) => x.id === 7);
        assert.deepEqual(e.esferas, ['Afetiva', 'Criada']);
        assert.deepEqual(e.categorias, ['Transição']);
        assert.deepEqual(e.pessoasEnvolvidas, [{ pessoaId: 100 }, { pessoaId: 101 }]);
        assert.deepEqual(e.relacoes, [
            { de: 'autor', para: 100, natureza: '', vinculo: 'Amizade' },
            { de: 100, para: 101, natureza: '', vinculo: 'Mentoria' },
        ]);
        assert.equal(db.opcoesPeriodoBiografico.rotulosVinculo[0].inverso, 'Mentorado(a) por');
        assert.equal(db.pessoas.find((p) => p.id === 101).oculto, true);
        assert.ok(db.opcoesPeriodoBiografico.esferas.includes('Criada'));
        assert.ok(db.opcoesPeriodoBiografico.vinculos.includes('Outro'));
    });

    it('backup do formato anterior (vínculo dentro da pessoa) vira relação autor → pessoa', async () => {
        await importarDB({
            epocas: [
                {
                    id: 2,
                    nome: 'Formato anterior',
                    autorId: 1,
                    pessoasEnvolvidas: [{ pessoaId: 100, vinculos: ['Amizade', 'Colega'] }],
                },
            ],
            autores: [{ id: 1, nome: 'Ana' }],
            pessoas: [{ id: 100, nome: 'Carla' }],
            opcoesPeriodoBiografico: { esferas: ['Afetiva'], vinculos: ['Amizade'] },
        });
        const e = db.epocas[0];
        assert.deepEqual(e.pessoasEnvolvidas, [{ pessoaId: 100 }]);
        assert.deepEqual(e.relacoes, [
            { de: 'autor', para: 100, natureza: 'Amizade', vinculo: '' },
            { de: 'autor', para: 100, natureza: 'Colega', vinculo: '' },
        ]);
        assert.ok(
            db.opcoesPeriodoBiografico.rotulosVinculo.some((r) => r.nome === 'Responsável por'),
        );
    });

    it('backup com relações do formato antigo (vínculo era categoria) vira Natureza, uma vez só', async () => {
        const backup = () => ({
            epocas: [
                {
                    id: 3,
                    nome: 'Relações antigas',
                    autorId: 1,
                    pessoasEnvolvidas: [{ pessoaId: 100 }, { pessoaId: 101 }],
                    relacoes: [
                        { de: 'autor', para: 100, vinculo: 'Romântico' },
                        { de: 'autor', para: 101, vinculo: 'Responsável por' },
                        { de: 100, para: 101, vinculo: 'Mentoria' },
                    ],
                },
            ],
            autores: [{ id: 1, nome: 'Ana' }],
            pessoas: [
                { id: 100, nome: 'Carla' },
                { id: 101, nome: 'Davi' },
            ],
            opcoesPeriodoBiografico: {
                esferas: [],
                vinculos: ['Romântico', 'Amizade', 'Mentoria'],
            },
        });
        await importarDB(backup());
        const esperadas = [
            { de: 'autor', para: 100, natureza: 'Romance', vinculo: '' },
            { de: 'autor', para: 101, natureza: 'Familiar', vinculo: 'Responsável por' },
            { de: 100, para: 101, natureza: '', vinculo: 'Mentoria' },
        ];
        assert.deepEqual(db.epocas[0].relacoes, esperadas);
        const op = db.opcoesPeriodoBiografico;
        assert.ok(op.naturezas.includes('Romance'));
        assert.ok(!op.vinculos.includes('Romântico') && !op.vinculos.includes('Amizade'));
        assert.ok(op.vinculos.includes('Mentoria'));
        // Backup novo (já migrado) restaurado de novo: nada muda.
        const novo = JSON.parse(
            JSON.stringify({ ...backup(), epocas: db.epocas, opcoesPeriodoBiografico: op }),
        );
        await importarDB(novo);
        assert.deepEqual(db.epocas[0].relacoes, esperadas);
        assert.deepEqual(db.opcoesPeriodoBiografico, op);
    });

    it('backup antigo sem os campos novos ganha listas vazias e opções de fábrica; o texto antigo vai para as Notas', async () => {
        await importarDB({
            epocas: [{ id: 1, nome: 'Antigo', autorId: 1, contextoRelacao: 'texto' }],
            autores: [{ id: 1, nome: 'Ana' }],
        });
        const e = db.epocas[0];
        assert.deepEqual(e.esferas, []);
        assert.deepEqual(e.categorias, []);
        assert.deepEqual(e.pessoasEnvolvidas, []);
        assert.deepEqual(e.relacoes, []);
        assert.equal('contextoRelacao' in e, false);
        assert.equal(e.notas, 'Contexto do relacionamento (texto antigo): texto');
        assert.ok(db.opcoesPeriodoBiografico.esferas.includes('Afetiva'));
    });

    it('backup do formato anterior (Categoria era etiqueta livre) ganha a lista de fábrica e nada some', async () => {
        await importarDB({
            epocas: [
                { id: 1, nome: 'A', autorId: 1, categorias: ['crise', 'Pandemia'] },
                { id: 2, nome: 'B', autorId: 1, categorias: ['Luto'] },
            ],
            autores: [{ id: 1, nome: 'Ana' }],
            opcoesPeriodoBiografico: { esferas: ['Afetiva'], naturezas: [], vinculos: [] },
        });
        const lista = db.opcoesPeriodoBiografico.categorias;
        assert.equal(lista.length, 18);
        ['Novo começo', 'Encerramento de ciclo', 'Superação'].forEach((v) =>
            assert.ok(lista.includes(v), v),
        );
        assert.ok(lista.includes('Pandemia') && lista.includes('Luto'));
        assert.deepEqual(db.epocas[0].categorias, ['Crise', 'Pandemia']);
        assert.deepEqual(db.epocas[1].categorias, ['Luto']);
    });

    it('lista de Categoria editada sobrevive ao backup, e o que foi apagado não volta', async () => {
        await importarDB({
            epocas: [{ id: 1, nome: 'A', autorId: 1, categorias: ['Crise'] }],
            autores: [{ id: 1, nome: 'Ana' }],
            opcoesPeriodoBiografico: {
                esferas: [],
                naturezas: [],
                vinculos: [],
                categorias: ['Crise'],
            },
        });
        assert.deepEqual(db.opcoesPeriodoBiografico.categorias, ['Crise']);
        const copia = JSON.parse(JSON.stringify(db));
        await importarDB(copia);
        assert.deepEqual(db.opcoesPeriodoBiografico.categorias, ['Crise']);
    });
});
