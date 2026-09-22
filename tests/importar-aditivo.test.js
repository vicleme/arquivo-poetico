import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import {
    normalizarItensPayload,
    classificarImportacaoAditiva,
    relatorioProntoParaAplicar,
    aplicarImportacaoAditiva,
} from '../js/importar-aditivo.js';

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

function poemaExportado(overrides = {}) {
    return {
        id: 42,
        tipo: 'poema',
        titulo: 'Movimento Circular',
        texto: 'texto qualquer',
        pessoas: [],
        autoria: [],
        gruposDiretosResolvidos: [],
        livrosResolvidos: [],
        contexto: { livro: null, parte: null, secao: null },
        ...overrides,
    };
}

function depsFake(dbRef) {
    return {
        tirarSnapshotSeNecessario: mock.fn(async () => true),
        save: mock.fn(() => {}),
    };
    void dbRef;
}

// ─── normalizarItensPayload ────────────────────────────────────────

describe('normalizarItensPayload', () => {
    it('aceita qualquer payload com `itens` (exportação seletiva, tudo_flat, seleção, template)', () => {
        assert.deepEqual(
            normalizarItensPayload({ export_format: 'selecao', itens: [1, 2] }),
            [1, 2],
        );
    });

    it('payload sem `itens`, nulo ou malformado vira lista vazia', () => {
        assert.deepEqual(normalizarItensPayload(null), []);
        assert.deepEqual(normalizarItensPayload({}), []);
        assert.deepEqual(normalizarItensPayload({ itens: 'nao é array' }), []);
    });
});

// ─── Fase 1 — classificação ─────────────────────────────────────────

describe('classificarImportacaoAditiva — erros', () => {
    it('tipo desconhecido vira status erro, sem travar o lote', () => {
        const payload = { itens: [poemaExportado({ tipo: 'coletanea' })] };
        const { itensOrigem, resumo } = classificarImportacaoAditiva(payload, dbVazio());
        assert.equal(itensOrigem[0].status, 'erro');
        assert.match(itensOrigem[0].erro, /Tipo de item desconhecido/);
        assert.equal(resumo.comErro, 1);
    });

    it('título vazio vira status erro', () => {
        const payload = { itens: [poemaExportado({ titulo: '  ' })] };
        const { itensOrigem, resumo } = classificarImportacaoAditiva(payload, dbVazio());
        assert.equal(itensOrigem[0].status, 'erro');
        assert.match(itensOrigem[0].erro, /Título vazio/);
        assert.equal(resumo.comErro, 1);
    });
});

describe('classificarImportacaoAditiva — referências sem candidato', () => {
    it('pessoa sem nenhum candidato no destino é pré-marcada "criar" automaticamente', () => {
        const payload = {
            itens: [
                poemaExportado({
                    pessoas: [{ pessoaId: 7, papeis: ['Dedicatário(a)'], nome: 'Pedro Maia' }],
                }),
            ],
        };
        const { itensOrigem, resumo } = classificarImportacaoAditiva(payload, dbVazio());
        assert.equal(itensOrigem[0].status, 'pronto');
        assert.equal(resumo.prontos, 1);
        const ref = itensOrigem[0].referencias[0];
        assert.equal(ref.campo, 'pessoas');
        assert.equal(ref.decisao, 'criar');
        assert.equal(ref.entidadeDestinoId, null);
    });
});

describe('classificarImportacaoAditiva — referências com candidato exato', () => {
    it('candidato de match exato (case-insensitive) é pré-marcado "casar", trocável', () => {
        const db = dbVazio();
        db.pessoas.push({ id: 12, nome: 'Pedro Maia' });
        const payload = {
            itens: [
                poemaExportado({
                    pessoas: [{ pessoaId: 7, papeis: [], nome: 'pedro maia' }],
                }),
            ],
        };
        const { itensOrigem } = classificarImportacaoAditiva(payload, db);
        assert.equal(itensOrigem[0].status, 'pronto');
        const ref = itensOrigem[0].referencias[0];
        assert.equal(ref.decisao, 'casar');
        assert.equal(ref.entidadeDestinoId, 12);
        assert.equal(ref.candidatos[0].match, 'exato');
    });
});

describe('classificarImportacaoAditiva — referências ambíguas', () => {
    it('mais de um candidato (mesmo aproximado) exige decisão manual', () => {
        const db = dbVazio();
        db.pessoas.push({ id: 1, nome: 'Pedro Maia' }, { id: 2, nome: 'Pedro Maia Jr' });
        const payload = {
            itens: [poemaExportado({ pessoas: [{ pessoaId: 7, papeis: [], nome: 'Pedro Maia' }] })],
        };
        // Um dos dois é match exato ("Pedro Maia"), então isso sozinho
        // já deveria resolver — testa o caso de dois candidatos exatos
        // (nomes duplicados no destino) separadamente.
        db.pessoas.length = 0;
        db.pessoas.push({ id: 1, nome: 'Pedro Maia' }, { id: 2, nome: 'Pedro Maia' });
        const { itensOrigem, resumo } = classificarImportacaoAditiva(payload, db);
        assert.equal(itensOrigem[0].status, 'ambiguo');
        assert.equal(resumo.ambiguos, 1);
        assert.equal(itensOrigem[0].referencias[0].decisao, null);
        assert.equal(itensOrigem[0].referencias[0].candidatos.length, 2);
    });

    it('só candidato aproximado (sem exato) também é ambíguo', () => {
        const db = dbVazio();
        db.grupos.push({ id: 5, nome: 'Amigos de infância' });
        const payload = {
            itens: [
                poemaExportado({
                    gruposDiretosResolvidos: [{ id: 9, nome: 'Amigos' }],
                }),
            ],
        };
        const { itensOrigem } = classificarImportacaoAditiva(payload, db);
        assert.equal(itensOrigem[0].status, 'ambiguo');
        assert.equal(itensOrigem[0].referencias[0].candidatos[0].match, 'aproximado');
    });
});

describe('classificarImportacaoAditiva — título duplicado', () => {
    it('título igual a um item já existente (mesmo tipo) vira referência ambígua própria', () => {
        const db = dbVazio();
        db.poemas.push({ id: 999, titulo: 'Movimento Circular' });
        const payload = { itens: [poemaExportado()] };
        const { itensOrigem } = classificarImportacaoAditiva(payload, db);
        assert.equal(itensOrigem[0].status, 'ambiguo');
        const dup = itensOrigem[0].referencias.find((r) => r.campo === 'duplicataTitulo');
        assert.ok(dup);
        assert.equal(dup.candidatos[0].id, 999);
        assert.equal(dup.decisao, null);
    });

    it('mesmo título em Prosa não conflita com Poema (coleções separadas)', () => {
        const db = dbVazio();
        db.prosas.push({ id: 999, titulo: 'Movimento Circular' });
        const payload = { itens: [poemaExportado()] }; // é poema, não prosa
        const { itensOrigem } = classificarImportacaoAditiva(payload, db);
        assert.equal(itensOrigem[0].status, 'pronto');
    });
});

describe('classificarImportacaoAditiva — extras (Sonoridade/Estrutura Textual)', () => {
    it('sinaliza a presença de Sonoridade/Estrutura Textual sem virar referência (não exige decisão)', () => {
        const payload = {
            itens: [
                poemaExportado({
                    sonoridade: { id: 1, poemaId: 42 },
                }),
            ],
        };
        const { itensOrigem } = classificarImportacaoAditiva(payload, dbVazio());
        assert.equal(itensOrigem[0].status, 'pronto'); // não vira ambíguo
        assert.deepEqual(itensOrigem[0].extras, { sonoridade: true, estruturaTextual: false });
    });

    it('ausência de ambos vira extras {false, false}', () => {
        const payload = { itens: [poemaExportado()] };
        const { itensOrigem } = classificarImportacaoAditiva(payload, dbVazio());
        assert.deepEqual(itensOrigem[0].extras, { sonoridade: false, estruturaTextual: false });
    });
});

describe('relatorioProntoParaAplicar', () => {
    it('false enquanto houver referência ambígua sem decisão', () => {
        const relatorio = {
            itensOrigem: [
                { status: 'ambiguo', referencias: [{ decisao: null }] },
                { status: 'pronto', referencias: [] },
            ],
        };
        assert.equal(relatorioProntoParaAplicar(relatorio), false);
    });

    it('true quando toda referência ambígua foi decidida (erro não bloqueia)', () => {
        const relatorio = {
            itensOrigem: [
                { status: 'ambiguo', referencias: [{ decisao: 'criar' }] },
                { status: 'erro', referencias: [{ decisao: null }] },
            ],
        };
        assert.equal(relatorioProntoParaAplicar(relatorio), true);
    });
});

// ─── Fase 3 + 4 — aplicar ────────────────────────────────────────────

describe('aplicarImportacaoAditiva', () => {
    it('recusa aplicar enquanto o relatório tiver pendência', async () => {
        const db = dbVazio();
        const payload = { itens: [poemaExportado()] };
        const relatorio = classificarImportacaoAditiva(payload, db);
        db.poemas.push({ id: 999, titulo: 'Movimento Circular' }); // força ambiguidade
        const relatorioAmbiguo = classificarImportacaoAditiva(payload, db);
        const deps = depsFake(db);
        const r = await aplicarImportacaoAditiva(payload, relatorioAmbiguo, db, deps);
        assert.equal(r.sucesso, false);
        assert.equal(r.motivo, 'pendente');
        assert.equal(db.poemas.length, 1); // nada foi criado
        void relatorio;
    });

    it('aborta sem escrever nada se o snapshot forçado falhar', async () => {
        const db = dbVazio();
        const payload = { itens: [poemaExportado()] };
        const relatorio = classificarImportacaoAditiva(payload, db);
        const deps = {
            tirarSnapshotSeNecessario: mock.fn(async () => false),
            save: mock.fn(() => {}),
        };
        const r = await aplicarImportacaoAditiva(payload, relatorio, db, deps);
        assert.equal(r.sucesso, false);
        assert.equal(r.motivo, 'snapshot');
        assert.equal(db.poemas.length, 0);
        assert.equal(deps.save.mock.callCount(), 0);
    });

    it('cria o poema com id novo, sem posicionar em Livro/Parte/Seção', async () => {
        const db = dbVazio();
        const payload = { itens: [poemaExportado()] };
        const relatorio = classificarImportacaoAditiva(payload, db);
        const deps = depsFake(db);
        const r = await aplicarImportacaoAditiva(payload, relatorio, db, deps);
        assert.equal(r.sucesso, true);
        assert.equal(r.criados.poemas, 1);
        assert.equal(db.poemas.length, 1);
        const novo = db.poemas[0];
        assert.notEqual(novo.id, 42); // id de origem não reaproveitado
        assert.equal(novo.paiId, null);
        assert.equal(novo.paiTipo, null);
        assert.equal(novo.tipo, undefined); // campo de exportação removido
        assert.equal(novo.contexto, undefined);
        assert.equal(deps.save.mock.callCount(), 1);
    });

    it('referência "criar" gera entidade nova e remapeia o id no item', async () => {
        const db = dbVazio();
        const payload = {
            itens: [
                poemaExportado({
                    pessoas: [{ pessoaId: 7, papeis: ['Dedicatário(a)'], nome: 'Pedro Maia' }],
                }),
            ],
        };
        const relatorio = classificarImportacaoAditiva(payload, db);
        const deps = depsFake(db);
        await aplicarImportacaoAditiva(payload, relatorio, db, deps);

        assert.equal(db.pessoas.length, 1);
        assert.equal(db.pessoas[0].nome, 'Pedro Maia');
        const novoPoema = db.poemas[0];
        assert.equal(novoPoema.pessoas.length, 1);
        assert.equal(novoPoema.pessoas[0].pessoaId, db.pessoas[0].id);
        assert.deepEqual(novoPoema.pessoas[0].papeis, ['Dedicatário(a)']);
    });

    it('referência "casar" reaproveita a entidade existente, sem criar nada', async () => {
        const db = dbVazio();
        db.autores.push({ id: 55, nome: 'Victor Leme', sobre: '' });
        const payload = {
            itens: [
                poemaExportado({ autoria: [{ autorId: 1, papel: 'Autor', nome: 'Victor Leme' }] }),
            ],
        };
        const relatorio = classificarImportacaoAditiva(payload, db);
        const deps = depsFake(db);
        await aplicarImportacaoAditiva(payload, relatorio, db, deps);

        assert.equal(db.autores.length, 1); // não duplicou
        assert.equal(db.poemas[0].autoria[0].autorId, 55);
    });

    it('duas entidades "criar" com a mesma idOrigem no lote reaproveitam a mesma nova entidade', async () => {
        const db = dbVazio();
        const payload = {
            itens: [
                poemaExportado({
                    id: 1,
                    pessoas: [{ pessoaId: 7, papeis: [], nome: 'Pedro Maia' }],
                }),
                poemaExportado({
                    id: 2,
                    titulo: 'Outro Poema',
                    pessoas: [{ pessoaId: 7, papeis: [], nome: 'Pedro Maia' }],
                }),
            ],
        };
        const relatorio = classificarImportacaoAditiva(payload, db);
        const deps = depsFake(db);
        await aplicarImportacaoAditiva(payload, relatorio, db, deps);

        assert.equal(db.pessoas.length, 1); // uma pessoa só, não duas
        const [p1, p2] = db.poemas;
        assert.equal(p1.pessoas[0].pessoaId, p2.pessoas[0].pessoaId);
    });

    it('Livro casado por nome só linka livrosIds — nunca posiciona em Partes/Seções', async () => {
        const db = dbVazio();
        db.livros.push({ id: 3, titulo: 'Ruínas Domésticas' });
        const payload = {
            itens: [
                poemaExportado({
                    livrosResolvidos: [{ id: 7, titulo: 'Ruínas Domésticas' }],
                }),
            ],
        };
        const relatorio = classificarImportacaoAditiva(payload, db);
        const deps = depsFake(db);
        await aplicarImportacaoAditiva(payload, relatorio, db, deps);

        const novo = db.poemas[0];
        assert.deepEqual(novo.livrosIds, [3]);
        assert.equal(novo.paiId, null);
        assert.equal(novo.paiTipo, null);
    });

    it('duplicata de título com decisão "casar" pula o item, sem criar nada', async () => {
        const db = dbVazio();
        db.poemas.push({ id: 999, titulo: 'Movimento Circular' });
        const payload = { itens: [poemaExportado()] };
        const relatorio = classificarImportacaoAditiva(payload, db);
        const dup = relatorio.itensOrigem[0].referencias.find((r) => r.campo === 'duplicataTitulo');
        dup.decisao = 'casar';

        const deps = depsFake(db);
        const r = await aplicarImportacaoAditiva(payload, relatorio, db, deps);

        assert.equal(r.sucesso, true);
        assert.equal(r.duplicatasPuladas, 1);
        assert.equal(db.poemas.length, 1); // só o já existente
    });

    it('duplicata de título com decisão "criar" importa mesmo assim, como item novo', async () => {
        const db = dbVazio();
        db.poemas.push({ id: 999, titulo: 'Movimento Circular' });
        const payload = { itens: [poemaExportado()] };
        const relatorio = classificarImportacaoAditiva(payload, db);
        const dup = relatorio.itensOrigem[0].referencias.find((r) => r.campo === 'duplicataTitulo');
        dup.decisao = 'criar';

        const deps = depsFake(db);
        const r = await aplicarImportacaoAditiva(payload, relatorio, db, deps);

        assert.equal(r.sucesso, true);
        assert.equal(r.duplicatasPuladas, 0);
        assert.equal(db.poemas.length, 2);
    });

    it('itens com status erro nunca entram no lote aplicado', async () => {
        const db = dbVazio();
        const payload = { itens: [poemaExportado({ titulo: '' }), poemaExportado({ id: 2 })] };
        const relatorio = classificarImportacaoAditiva(payload, db);
        const deps = depsFake(db);
        const r = await aplicarImportacaoAditiva(payload, relatorio, db, deps);
        assert.equal(r.sucesso, true);
        assert.equal(r.criados.poemas, 1);
        assert.equal(db.poemas.length, 1);
    });

    it('Prosa é criada em db.prosas, não em db.poemas', async () => {
        const db = dbVazio();
        const payload = { itens: [poemaExportado({ tipo: 'prosa' })] };
        const relatorio = classificarImportacaoAditiva(payload, db);
        const deps = depsFake(db);
        const r = await aplicarImportacaoAditiva(payload, relatorio, db, deps);
        assert.equal(r.criados.prosas, 1);
        assert.equal(db.prosas.length, 1);
        assert.equal(db.poemas.length, 0);
    });

    it('Sonoridade/Estrutura Textual do "download abrangente" acompanham o Poema, com poemaId remapeado', async () => {
        const db = dbVazio();
        const payload = {
            itens: [
                poemaExportado({
                    id: 42,
                    sonoridade: { id: 900, poemaId: 42, forma: 'Soneto', escansaoLinhas: [] },
                    estruturaTextual: { id: 901, poemaId: 42, unidades: [], eventos: [] },
                }),
            ],
        };
        const relatorio = classificarImportacaoAditiva(payload, db);
        const deps = depsFake(db);
        const r = await aplicarImportacaoAditiva(payload, relatorio, db, deps);

        assert.equal(r.criados.escansoes, 1);
        assert.equal(r.criados.estruturasTextuais, 1);
        assert.equal(db.escansoes.length, 1);
        assert.equal(db.estruturasTextuais.length, 1);

        const novoPoemaId = db.poemas[0].id;
        assert.equal(db.escansoes[0].poemaId, novoPoemaId);
        assert.equal(db.estruturasTextuais[0].poemaId, novoPoemaId);
        // id do registro em si também não pode ser reaproveitado do
        // arquivo de origem — colidiria com um id já existente no destino.
        assert.notEqual(db.escansoes[0].id, 900);
        assert.notEqual(db.estruturasTextuais[0].id, 901);
        assert.equal(db.escansoes[0].forma, 'Soneto'); // resto do conteúdo preservado

        // Não vaza como campo do Poema em si.
        assert.equal(db.poemas[0].sonoridade, undefined);
        assert.equal(db.poemas[0].estruturaTextual, undefined);
    });

    it('sem "download abrangente" (sem sonoridade/estruturaTextual no arquivo), nada é criado nessas coleções', async () => {
        const db = dbVazio();
        const payload = { itens: [poemaExportado()] };
        const relatorio = classificarImportacaoAditiva(payload, db);
        const deps = depsFake(db);
        const r = await aplicarImportacaoAditiva(payload, relatorio, db, deps);
        assert.equal(r.criados.escansoes, 0);
        assert.equal(r.criados.estruturasTextuais, 0);
        assert.equal(db.escansoes.length, 0);
        assert.equal(db.estruturasTextuais.length, 0);
    });
});
