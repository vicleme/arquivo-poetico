import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import { montarPacote } from '../js/pacote-texto.js';
import { classificarImportacaoAditiva, aplicarImportacaoAditiva } from '../js/importar-aditivo.js';

const MD = '# Um\nv1\n\n# Dois\nprosa dois\n\n# Tres\nv3\n';

function metaBase(extra = {}) {
    return {
        id: 'x',
        titulo: 'X',
        autor: {
            nome: 'Fulano',
            nacionalidade: 'Brasileira',
            obito: { ano: 1900 },
            nomesLiterarios: [{ nome: 'Beltrano', tipo: 'Heterônimo' }],
        },
        ...extra,
    };
}

function dbVazio() {
    return {
        poemas: [],
        prosas: [],
        pessoas: [],
        grupos: [],
        autores: [],
        epocas: [],
        livros: [],
        escansoes: [],
        estruturasTextuais: [],
    };
}

const deps = () => ({
    tirarSnapshotSeNecessario: mock.fn(async () => true),
    save: mock.fn(() => {}),
});

describe('pacote: tipo por texto, por pacote e por envio', () => {
    it('precedência: meta.textos > argumento > meta.tipo > poema', () => {
        const meta = metaBase({ tipo: 'prosa', textos: { Um: { tipo: 'poema' } } });
        const p = montarPacote(MD, meta);
        assert.deepEqual(
            p.itens.map((i) => i.tipo),
            ['poema', 'prosa', 'prosa'],
        );
        const q = montarPacote(MD, metaBase({ tipo: 'prosa' }), { tipo: 'poema' });
        assert.deepEqual(
            q.itens.map((i) => i.tipo),
            ['poema', 'poema', 'poema'],
        );
        const r = montarPacote(MD, metaBase());
        assert.deepEqual(
            r.itens.map((i) => i.tipo),
            ['poema', 'poema', 'poema'],
        );
    });

    it('Prosa não leva descricaoVisual; Poema leva', () => {
        const p = montarPacote(MD, metaBase({ textos: { Dois: { tipo: 'prosa' } } }));
        assert.equal('descricaoVisual' in p.itens[0], true);
        assert.equal('descricaoVisual' in p.itens[1], false);
    });

    it('tipo inválido no meta é recusado', () => {
        assert.throws(
            () => montarPacote(MD, metaBase({ textos: { Um: { tipo: 'conto' } } })),
            /Tipo inválido/,
        );
    });
});

describe('pacote: assinatura (heterônimo) e nome literário', () => {
    it('grava assinatura e nomeLiterario só nos textos que os declaram', () => {
        const meta = metaBase({
            textos: { Dois: { assinatura: 'Heterônimo', nomeLiterario: 'Beltrano' } },
        });
        const p = montarPacote(MD, meta);
        assert.deepEqual(p.itens[0].autoria, [{ autorId: 1, papel: 'Autor', nome: 'Fulano' }]);
        assert.deepEqual(p.itens[1].autoria, [
            {
                autorId: 1,
                papel: 'Autor',
                nome: 'Fulano',
                assinatura: 'Heterônimo',
                nomeLiterario: 'Beltrano',
            },
        ]);
    });

    it('recusa nome fora do cadastro do Autor, tipo divergente, nome faltando e nome com Ortônimo', () => {
        const com = (t) => () => montarPacote(MD, metaBase({ textos: { Um: t } }));
        assert.throws(com({ assinatura: 'Heterônimo', nomeLiterario: 'Ninguém' }), /não está em/);
        assert.throws(com({ assinatura: 'Pseudônimo', nomeLiterario: 'Beltrano' }), /não está em/);
        assert.throws(com({ assinatura: 'Heterônimo' }), /exige nomeLiterario/);
        assert.throws(com({ nomeLiterario: 'Beltrano' }), /só vale com assinatura/);
        assert.throws(com({ assinatura: 'Apelido' }), /assinatura inválida/);
    });

    it('valida nomesLiterarios, sexo e corRaca do Autor', () => {
        const com = (autor) => () => montarPacote(MD, metaBase({ autor: { nome: 'F', ...autor } }));
        assert.throws(com({ sexo: 'M' }), /sexo inválido/);
        assert.throws(com({ corRaca: 'Negra' }), /corRaca inválido/);
        assert.throws(com({ nomesLiterarios: 'x' }), /lista de/);
        assert.throws(com({ nomesLiterarios: [{ nome: 'A', tipo: 'Ortônimo' }] }), /nome e tipo/);
        assert.doesNotThrow(com({ sexo: 'Feminino', corRaca: 'Parda' }));
    });
});

describe('pacote: datas por texto', () => {
    it('dataEscrita (com exata e ano denormalizado) e dataPublicacao', () => {
        const meta = metaBase({
            textos: {
                Um: { dataEscrita: { dia: 15, mes: 1, ano: 1928, exata: true } },
                Dois: { dataPublicacao: { ano: 1884 } },
            },
        });
        const p = montarPacote(MD, meta);
        assert.deepEqual(p.itens[0].dataEscrita, { dia: 15, mes: 1, ano: 1928, exata: true });
        assert.equal(p.itens[0].ano, 1928);
        assert.deepEqual(p.itens[1].dataPublicacao, { ano: 1884 });
        assert.equal(p.itens[1].dataEscrita, null);
        assert.equal(p.itens[2].dataPublicacao, null);
    });

    it('recusa data que não seja objeto de inteiros positivos', () => {
        const com = (d) => () => montarPacote(MD, metaBase({ textos: { Um: { dataEscrita: d } } }));
        assert.throws(com('1928'), /objeto/);
        assert.throws(com({ ano: '1928' }), /inteiro positivo/);
    });
});

describe('Importação Aditiva: Autor novo, assinatura e nomes literários', () => {
    const meta = () =>
        metaBase({
            autor: {
                nome: 'Fulano',
                obito: { ano: 1900 },
                sexo: 'Feminino',
                corRaca: 'Parda',
                genero: 'mulher',
                nomesLiterarios: [{ nome: 'Beltrano', tipo: 'Heterônimo' }],
            },
            textos: { Dois: { assinatura: 'Heterônimo', nomeLiterario: 'Beltrano' } },
        });

    it('Autor novo nasce com sexo, gênero, cor/raça e nomes literários do pacote', async () => {
        const payload = montarPacote(MD, meta());
        const db = dbVazio();
        const rel = classificarImportacaoAditiva(payload, db);
        const r = await aplicarImportacaoAditiva(payload, rel, db, deps());
        assert.equal(r.sucesso, true);
        assert.equal(db.autores.length, 1);
        const a = db.autores[0];
        assert.equal(a.sexo, 'Feminino');
        assert.equal(a.corRaca, 'Parda');
        assert.equal(a.genero, 'mulher');
        assert.deepEqual(a.nomesLiterarios, [{ nome: 'Beltrano', tipo: 'Heterônimo' }]);
        assert.equal(a.orientacaoSexual, undefined);
    });

    it('a assinatura atravessa a importação (o heterônimo não vira Ortônimo)', async () => {
        const payload = montarPacote(MD, meta());
        const db = dbVazio();
        const rel = classificarImportacaoAditiva(payload, db);
        await aplicarImportacaoAditiva(payload, rel, db, deps());
        const dois = db.prosas.length ? db.prosas : db.poemas;
        const item = dois.find((i) => i.titulo === 'Dois');
        assert.equal(item.autoria[0].assinatura, 'Heterônimo');
        assert.equal(item.autoria[0].nomeLiterario, 'Beltrano');
        const um = db.poemas.find((i) => i.titulo === 'Um');
        assert.equal(um.autoria[0].assinatura, undefined);
    });

    function relatorioCasandoAutor(payload, db) {
        const rel = classificarImportacaoAditiva(payload, db);
        rel.itensOrigem.forEach((it) =>
            it.referencias
                .filter((r) => r.campo === 'autores')
                .forEach((r) => {
                    if (r.decisao !== 'casar' && r.entidadeDestinoId != null) r.decisao = 'casar';
                }),
        );
        return rel;
    }

    it('Autor que já existe só GANHA o nome literário usado; nada mais muda', async () => {
        const payload = montarPacote(MD, meta());
        const db = dbVazio();
        db.autores.push({ id: 7, nome: 'Fulano', sobre: 'meu', sexo: 'Masculino' });
        const rel = relatorioCasandoAutor(payload, db);
        const r = await aplicarImportacaoAditiva(payload, rel, db, deps());
        assert.equal(r.sucesso, true);
        assert.deepEqual(db.autores, [
            {
                id: 7,
                nome: 'Fulano',
                sobre: 'meu',
                sexo: 'Masculino',
                nomesLiterarios: [{ nome: 'Beltrano', tipo: 'Heterônimo' }],
            },
        ]);
    });

    it('nome já cadastrado no Autor existente não duplica nem muda de tipo', async () => {
        const payload = montarPacote(MD, meta());
        const db = dbVazio();
        db.autores.push({
            id: 7,
            nome: 'Fulano',
            nomesLiterarios: [{ nome: 'Beltrano', tipo: 'Pseudônimo' }],
        });
        const rel = relatorioCasandoAutor(payload, db);
        await aplicarImportacaoAditiva(payload, rel, db, deps());
        assert.deepEqual(db.autores[0].nomesLiterarios, [{ nome: 'Beltrano', tipo: 'Pseudônimo' }]);
    });
});
