import './helpers/localstorage-shim.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    aplicarEsvaziamento,
    contarVersoesFiltradas,
    normalizarCaixas,
    planoArmazenamento,
    resumirEsvaziamento,
    ROTULOS_DADOS,
} from '../js/esvaziar-acervo.js';
import { CHAVES_DB, chavesDbDe } from '../js/inventario-armazenamento.js';
import {
    migrarMovimentosEscolasEmbutidos,
    migrarPeriodosHistoricosEmbutidos,
    migrarTemplatesEstruturaEmbutidos,
} from '../js/db.js';

// Fase 13, etapa 13a: lógica pura de esvaziar o acervo. Os testes montam um `db`
// à mão, com os cadastros de fábrica gerados pela própria migração (nunca
// contagens fixas, para o teste sobreviver a um seed que cresça).

const TODAS = { dados: true, preferencias: true, preProntos: true };
const SO_DADOS = { dados: true };
const SO_PRE = { preProntos: true };
const SO_PREFS = { preferencias: true };

function fabrica() {
    const periodosHistoricos = [];
    const movimentosEscolas = [];
    const templatesEstrutura = [];
    migrarPeriodosHistoricosEmbutidos(periodosHistoricos, []);
    migrarMovimentosEscolasEmbutidos(movimentosEscolas, []);
    migrarTemplatesEstruturaEmbutidos(templatesEstrutura, []);
    return { periodosHistoricos, movimentosEscolas, templatesEstrutura };
}

const nomes = (arr) => arr.map((i) => i.nome).sort();

// db com todas as chaves de dado preenchidas, os três cadastros de fábrica e
// um registro da pessoa em cada um deles.
function criarDb() {
    const db = {};
    for (const chave of chavesDbDe('dado')) {
        db[chave] = chave === 'padroesColunas' ? { a: 1, b: 2 } : [{ id: `${chave}-1` }];
    }
    Object.assign(db, fabrica());
    db.periodosHistoricosOcultos = [];
    db.movimentosEscolasOcultos = [];
    db.templatesEstruturaOcultos = [];
    db.periodosHistoricos.push({ id: 'p-meu', nome: 'Meu período', embutido: false });
    db.movimentosEscolas.push({
        id: 'm-meu',
        nome: 'Meu movimento',
        embutido: false,
        paiId: null,
        divisao: '',
        generoDivisao: '',
    });
    db.templatesEstrutura.push({ id: 't-meu', nome: 'Meu template', embutido: false });
    db.poemas = [{ id: 'poema-1', periodosHistoricosIds: [], movimentosEscolasIds: [] }];
    db.prosas = [{ id: 'prosa-1', periodosHistoricosIds: [], movimentosEscolasIds: [] }];
    db.autores = [{ id: 'autor-1', movimentosEscolasIds: [] }];
    db.programaDeFabricaAplicado = true;
    return db;
}

const deFabrica = (arr) => arr.filter((i) => i.embutido === true);

// Simula o recarregamento: a migração aditiva roda de novo sobre o que sobrou.
function recarregar(db) {
    migrarPeriodosHistoricosEmbutidos(db.periodosHistoricos, db.periodosHistoricosOcultos);
    migrarMovimentosEscolasEmbutidos(db.movimentosEscolas, db.movimentosEscolasOcultos);
    migrarTemplatesEstruturaEmbutidos(db.templatesEstrutura, db.templatesEstruturaOcultos);
}

describe('esvaziar acervo: caixas', () => {
    it('só true liga uma caixa', () => {
        assert.deepEqual(normalizarCaixas(), {
            dados: false,
            preferencias: false,
            preProntos: false,
        });
        assert.deepEqual(normalizarCaixas({ dados: 1, preProntos: true }), {
            dados: false,
            preferencias: false,
            preProntos: true,
        });
    });

    it('sem caixa marcada: resumo vazio e nada muda', () => {
        const db = criarDb();
        const antes = JSON.stringify(db);
        const resumo = aplicarEsvaziamento(db, {});
        assert.equal(resumo.vazio, true);
        assert.equal(JSON.stringify(db), antes);
    });
});

describe('esvaziar acervo: só Dados', () => {
    it('esvazia todas as chaves de dado do inventário, no lugar', () => {
        const db = criarDb();
        const referencias = Object.fromEntries(chavesDbDe('dado').map((k) => [k, db[k]]));
        aplicarEsvaziamento(db, SO_DADOS);
        for (const chave of chavesDbDe('dado')) {
            assert.equal(db[chave], referencias[chave], `${chave} manteve a mesma referência`);
            const vazio = Array.isArray(db[chave])
                ? db[chave].length
                : Object.keys(db[chave]).length;
            assert.equal(vazio, 0, `${chave} esvaziado`);
        }
    });

    it('tira só os cadastros da pessoa e mantém os de fábrica', () => {
        const db = criarDb();
        const ref = fabrica();
        aplicarEsvaziamento(db, SO_DADOS);
        assert.deepEqual(nomes(db.periodosHistoricos), nomes(ref.periodosHistoricos));
        assert.deepEqual(nomes(db.movimentosEscolas), nomes(ref.movimentosEscolas));
        assert.deepEqual(nomes(db.templatesEstrutura), nomes(ref.templatesEstrutura));
        assert.ok(db.periodosHistoricos.every((p) => p.embutido === true));
        assert.ok(db.movimentosEscolas.every((m) => m.embutido === true));
        assert.ok(db.templatesEstrutura.every((t) => t.embutido === true));
    });

    it('resultado de instalação nova: ocultos vazios e excluídos de fábrica voltam', () => {
        const db = criarDb();
        const ref = fabrica();
        // a pessoa tinha excluído um de cada, de propósito
        for (const [colecao, ocultos] of [
            ['periodosHistoricos', 'periodosHistoricosOcultos'],
            ['movimentosEscolas', 'movimentosEscolasOcultos'],
            ['templatesEstrutura', 'templatesEstruturaOcultos'],
        ]) {
            const i = db[colecao].findIndex((x) => x.embutido === true);
            db[ocultos].push(db[colecao][i].nome);
            db[colecao].splice(i, 1);
        }
        aplicarEsvaziamento(db, SO_DADOS);
        assert.deepEqual(db.periodosHistoricosOcultos, []);
        assert.deepEqual(db.movimentosEscolasOcultos, []);
        assert.deepEqual(db.templatesEstruturaOcultos, []);
        assert.deepEqual(nomes(db.periodosHistoricos), nomes(ref.periodosHistoricos));
        assert.deepEqual(nomes(db.movimentosEscolas), nomes(ref.movimentosEscolas));
        assert.deepEqual(nomes(db.templatesEstrutura), nomes(ref.templatesEstrutura));
    });

    it('movimento de fábrica cujo pai era da pessoa vira corrente de topo', () => {
        const db = criarDb();
        const filho = db.movimentosEscolas.find((m) => m.embutido === true);
        filho.paiId = 'm-meu';
        filho.divisao = 'Fase';
        filho.generoDivisao = 'feminino';
        aplicarEsvaziamento(db, SO_DADOS);
        const depois = db.movimentosEscolas.find((m) => m.id === filho.id);
        assert.equal(depois.paiId, null);
        assert.equal(depois.divisao, '');
        assert.equal(depois.generoDivisao, '');
    });

    it('hierarquia de fábrica (filho e pai de fábrica) fica intacta', () => {
        const db = criarDb();
        const comPai = db.movimentosEscolas.filter((m) => m.embutido && m.paiId != null);
        assert.ok(comPai.length > 0, 'o seed tem ao menos uma divisão');
        const antes = comPai.map((m) => [m.id, m.paiId, m.divisao]);
        aplicarEsvaziamento(db, SO_DADOS);
        for (const [id, paiId, divisao] of antes) {
            const m = db.movimentosEscolas.find((x) => x.id === id);
            assert.equal(m.paiId, paiId);
            assert.equal(m.divisao, divisao);
        }
    });

    it('não toca a marca do programa de fábrica (estado)', () => {
        const db = criarDb();
        aplicarEsvaziamento(db, SO_DADOS);
        assert.equal(db.programaDeFabricaAplicado, true);
    });

    it('é idempotente', () => {
        const db = criarDb();
        aplicarEsvaziamento(db, SO_DADOS);
        const uma = JSON.stringify(db);
        aplicarEsvaziamento(db, SO_DADOS);
        assert.equal(JSON.stringify(db), uma);
    });
});

describe('esvaziar acervo: só Pré-prontos (Dados mantidos)', () => {
    it('apaga os de fábrica sem uso, guarda os da pessoa e não deixa voltar', () => {
        const db = criarDb();
        const poemasAntes = JSON.stringify(db.poemas);
        aplicarEsvaziamento(db, SO_PRE);
        assert.equal(deFabrica(db.periodosHistoricos).length, 0);
        assert.equal(deFabrica(db.movimentosEscolas).length, 0);
        assert.equal(deFabrica(db.templatesEstrutura).length, 0);
        assert.deepEqual(
            db.periodosHistoricos.map((p) => p.id),
            ['p-meu'],
        );
        assert.deepEqual(
            db.movimentosEscolas.map((m) => m.id),
            ['m-meu'],
        );
        assert.deepEqual(
            db.templatesEstrutura.map((t) => t.id),
            ['t-meu'],
        );
        assert.equal(JSON.stringify(db.poemas), poemasAntes);

        // o ponto central da 13a: a migração do próximo carregamento não os recoloca
        recarregar(db);
        assert.equal(deFabrica(db.periodosHistoricos).length, 0);
        assert.equal(deFabrica(db.movimentosEscolas).length, 0);
        assert.equal(deFabrica(db.templatesEstrutura).length, 0);
    });

    it('limpar só o array não bastaria: sem os ocultos a migração recoloca tudo', () => {
        const db = criarDb();
        db.periodosHistoricos.length = 0;
        recarregar(db);
        assert.ok(db.periodosHistoricos.length > 0);
    });

    it('período de fábrica usado por texto fica; os ocultos cobrem só os apagados', () => {
        const db = criarDb();
        const usado = db.periodosHistoricos.find((p) => p.embutido);
        db.prosas[0].periodosHistoricosIds = [usado.id];
        const total = deFabrica(db.periodosHistoricos).length;
        const resumo = aplicarEsvaziamento(db, SO_PRE);

        assert.deepEqual(
            deFabrica(db.periodosHistoricos).map((p) => p.id),
            [usado.id],
        );
        assert.equal(resumo.preProntos.cadastros.periodosHistoricos.mantidosPorUso, 1);
        assert.equal(resumo.preProntos.cadastros.periodosHistoricos.apagar, total - 1);
        assert.equal(db.periodosHistoricosOcultos.length, total - 1);
        assert.ok(!db.periodosHistoricosOcultos.includes(usado.nome));

        recarregar(db);
        assert.equal(deFabrica(db.periodosHistoricos).length, 1, 'sem duplicar o que ficou');
    });

    it('comparação de id é por texto: id numérico no poema e texto no cadastro', () => {
        const db = criarDb();
        const usado = db.periodosHistoricos.find((p) => p.embutido);
        usado.id = '123';
        db.poemas[0].periodosHistoricosIds = [123];
        aplicarEsvaziamento(db, SO_PRE);
        assert.ok(db.periodosHistoricos.some((p) => p.id === '123'));
    });

    it('movimento de fábrica usado por autor ou por texto fica', () => {
        const db = criarDb();
        const [a, b] = db.movimentosEscolas.filter((m) => m.embutido && m.paiId == null);
        db.autores[0].movimentosEscolasIds = [a.id];
        db.poemas[0].movimentosEscolasIds = [b.id];
        const resumo = aplicarEsvaziamento(db, SO_PRE);
        const ficaram = deFabrica(db.movimentosEscolas).map((m) => m.id);
        assert.ok(ficaram.includes(a.id) && ficaram.includes(b.id));
        assert.equal(resumo.preProntos.cadastros.movimentosEscolas.mantidosPorUso, 2);
    });

    it('pai de fábrica fica quando um filho que fica depende dele (hierarquia)', () => {
        const db = criarDb();
        const filho = db.movimentosEscolas.find((m) => m.embutido && m.paiId != null);
        const pai = db.movimentosEscolas.find((m) => m.id === filho.paiId);
        // filho de fábrica usado por texto: o pai, sem uso próprio, tem de ficar
        db.poemas[0].movimentosEscolasIds = [filho.id];
        const resumo = aplicarEsvaziamento(db, SO_PRE);
        const ids = db.movimentosEscolas.map((m) => m.id);
        assert.ok(ids.includes(filho.id));
        assert.ok(ids.includes(pai.id), 'o pai ficou');
        assert.equal(db.movimentosEscolas.find((m) => m.id === filho.id).paiId, pai.id);
        assert.ok(resumo.preProntos.cadastros.movimentosEscolas.mantidosPorHierarquia >= 1);
    });

    it('pai de fábrica fica quando o filho é da pessoa', () => {
        const db = criarDb();
        const pai = db.movimentosEscolas.find((m) => m.embutido && m.paiId == null);
        const meu = db.movimentosEscolas.find((m) => m.id === 'm-meu');
        meu.paiId = pai.id;
        meu.divisao = 'Fase';
        aplicarEsvaziamento(db, SO_PRE);
        assert.ok(db.movimentosEscolas.some((m) => m.id === pai.id));
        assert.equal(db.movimentosEscolas.find((m) => m.id === 'm-meu').paiId, pai.id);
    });

    it('avô de fábrica também fica (cadeia de pais)', () => {
        const db = criarDb();
        const [avo, pai] = db.movimentosEscolas.filter((m) => m.embutido && m.paiId == null);
        const neto = db.movimentosEscolas.find((m) => m.id === 'm-meu');
        pai.paiId = avo.id;
        neto.paiId = pai.id;
        aplicarEsvaziamento(db, SO_PRE);
        const ids = db.movimentosEscolas.map((m) => m.id);
        assert.ok(ids.includes(avo.id) && ids.includes(pai.id));
    });

    it('templates: nenhum fica por uso, mesmo com estrutura textual preenchida', () => {
        const db = criarDb();
        db.estruturasTextuais = [{ id: 'e1', poemaId: 'poema-1', unidades: [], eventos: [] }];
        const resumo = aplicarEsvaziamento(db, SO_PRE);
        assert.equal(deFabrica(db.templatesEstrutura).length, 0);
        assert.equal(resumo.preProntos.cadastros.templatesEstrutura.mantidosPorUso, 0);
    });

    it('resumo.preProntos.mantidos soma o que ficou', () => {
        const db = criarDb();
        db.prosas[0].periodosHistoricosIds = [db.periodosHistoricos[0].id];
        db.autores[0].movimentosEscolasIds = [db.movimentosEscolas[0].id];
        const resumo = resumirEsvaziamento(db, SO_PRE);
        assert.equal(resumo.preProntos.mantidos, 2);
    });
});

describe('esvaziar acervo: Dados e Pré-prontos juntos', () => {
    it('zera tudo e os pré-prontos não voltam no carregamento seguinte', () => {
        const db = criarDb();
        aplicarEsvaziamento(db, { dados: true, preProntos: true });
        for (const chave of chavesDbDe('dado')) {
            const v = db[chave];
            assert.equal(Array.isArray(v) ? v.length : Object.keys(v).length, 0, chave);
        }
        assert.equal(db.periodosHistoricos.length, 0);
        assert.equal(db.movimentosEscolas.length, 0);
        assert.equal(db.templatesEstrutura.length, 0);
        const ref = fabrica();
        assert.deepEqual(nomes(db.periodosHistoricos.concat([])), []);
        assert.deepEqual([...db.periodosHistoricosOcultos].sort(), nomes(ref.periodosHistoricos));
        assert.deepEqual([...db.movimentosEscolasOcultos].sort(), nomes(ref.movimentosEscolas));
        assert.deepEqual([...db.templatesEstruturaOcultos].sort(), nomes(ref.templatesEstrutura));

        recarregar(db);
        assert.equal(db.periodosHistoricos.length, 0);
        assert.equal(db.movimentosEscolas.length, 0);
        assert.equal(db.templatesEstrutura.length, 0);
    });

    it('com Dados também apagados, o uso por texto deixa de valer: sai tudo', () => {
        const db = criarDb();
        db.prosas[0].periodosHistoricosIds = [db.periodosHistoricos[0].id];
        const resumo = aplicarEsvaziamento(db, { dados: true, preProntos: true });
        assert.equal(resumo.preProntos.mantidos, 0);
        assert.equal(db.periodosHistoricos.length, 0);
    });
});

describe('esvaziar acervo: só Preferências', () => {
    it('não mexe no db', () => {
        const db = criarDb();
        const antes = JSON.stringify(db);
        aplicarEsvaziamento(db, SO_PREFS);
        assert.equal(JSON.stringify(db), antes);
    });
});

describe('esvaziar acervo: resumo', () => {
    it('conta o que será apagado em Dados, sem contar o que fica', () => {
        const db = criarDb();
        const resumo = resumirEsvaziamento(db, SO_DADOS, { capas: 3, versoesFiltradas: 2 });
        const poemas = resumo.dados.itens.find((i) => i.chave === 'poemas');
        assert.equal(poemas.quantidade, 1);
        assert.equal(poemas.rotulo, 'poemas');
        assert.deepEqual(resumo.dados.cadastrosProprios, {
            periodosHistoricos: 1,
            movimentosEscolas: 1,
            templatesEstrutura: 1,
        });
        assert.equal(resumo.dados.capas, 3);
        assert.equal(resumo.dados.versoesFiltradas, 2);
        assert.equal(resumo.preProntos, null);
        assert.equal(resumo.preferencias, null);
    });

    it('omite do resumo as chaves de dado vazias', () => {
        const db = criarDb();
        db.poemas = [];
        const resumo = resumirEsvaziamento(db, SO_DADOS);
        assert.ok(!resumo.dados.itens.some((i) => i.chave === 'poemas'));
    });

    it('toda chave de dado do inventário tem rótulo (chave nova sem rótulo falha aqui)', () => {
        for (const chave of chavesDbDe('dado')) {
            assert.ok(chave in ROTULOS_DADOS, `falta rótulo para db.${chave}`);
        }
    });

    it('backup: obrigatório só com Dados; extras só se houver o que eles guardam (F13-D6, F13-D7)', () => {
        const db = criarDb();
        const forma = (caixas, externos) => resumirEsvaziamento(db, caixas, externos).backup;
        assert.deepEqual(forma(SO_DADOS, { versoesFiltradas: 0 }), {
            obrigatorio: true,
            acervo: true,
            incluiExtras: false,
        });
        assert.deepEqual(forma(SO_DADOS, { versoesFiltradas: 4 }), {
            obrigatorio: true,
            acervo: true,
            incluiExtras: true,
        });
        // pré-prontos mexem no acervo, mas não apagam versões nem preferências
        assert.deepEqual(forma(SO_PRE, { versoesFiltradas: 4, preferencias: 9 }), {
            obrigatorio: false,
            acervo: true,
            incluiExtras: false,
        });
        // preferências: o JSON do acervo não perderia nada, os extras sim
        assert.deepEqual(forma(SO_PREFS, { preferencias: 3 }), {
            obrigatorio: false,
            acervo: false,
            incluiExtras: true,
        });
        assert.deepEqual(forma(SO_PREFS, { preferencias: 0 }), {
            obrigatorio: false,
            acervo: false,
            incluiExtras: false,
        });
        assert.equal(forma(TODAS, { preferencias: 2 }).incluiExtras, true);
    });

    it('retratos automáticos sempre ficam (F13-D5)', () => {
        for (const caixas of [SO_DADOS, SO_PRE, SO_PREFS, TODAS]) {
            assert.equal(resumirEsvaziamento(criarDb(), caixas).retratosFicam, true);
        }
    });

    it('o resumo bate com o que o apagar realmente faz', () => {
        const db = criarDb();
        db.prosas[0].periodosHistoricosIds = [db.periodosHistoricos[0].id];
        const totalFabrica = deFabrica(db.periodosHistoricos).length;
        const previsto = resumirEsvaziamento(db, SO_PRE);
        const devolvido = aplicarEsvaziamento(db, SO_PRE);
        assert.deepEqual(devolvido, previsto);
        assert.equal(
            deFabrica(db.periodosHistoricos).length,
            totalFabrica - previsto.preProntos.cadastros.periodosHistoricos.apagar,
        );
    });
});

describe('esvaziar acervo: armazenamento fora do db', () => {
    const PRESENTES = [
        'arquivoPoetico_v3',
        'arquivoPoetico_versoesFiltradas_v1',
        'arquivoPoetico_ultimoBackup',
        'arquivoPoetico_tema',
        'arquivoPoetico_colunas_poemas',
        'arquivoPoetico_est_filtros',
        'arquivoPoetico_chave_desconhecida',
        'outraCoisa',
    ];

    it('Dados: versões alternativas e último backup saem; o acervo é regravado, não removido', () => {
        const plano = planoArmazenamento(SO_DADOS, PRESENTES);
        assert.deepEqual(plano.localStorageRemover, [
            'arquivoPoetico_ultimoBackup',
            'arquivoPoetico_versoesFiltradas_v1',
        ]);
        assert.equal(plano.regravarAcervo, true);
        assert.deepEqual(plano.indexedDBLimpar, ['arquivoPoetico_capas']);
    });

    it('Preferências: só as preferências; o último backup e os dados ficam', () => {
        const plano = planoArmazenamento(SO_PREFS, PRESENTES);
        assert.deepEqual(plano.localStorageRemover, [
            'arquivoPoetico_colunas_poemas',
            'arquivoPoetico_est_filtros',
            'arquivoPoetico_tema',
        ]);
        assert.equal(plano.regravarAcervo, false);
        assert.deepEqual(plano.indexedDBLimpar, []);
    });

    it('Pré-prontos: regrava o acervo e não remove nenhuma chave', () => {
        const plano = planoArmazenamento(SO_PRE, PRESENTES);
        assert.deepEqual(plano.localStorageRemover, []);
        assert.equal(plano.regravarAcervo, true);
    });

    it('chave sem classificação nunca é apagada e o retrato nunca é limpo', () => {
        const plano = planoArmazenamento(TODAS, PRESENTES);
        assert.ok(!plano.localStorageRemover.includes('arquivoPoetico_chave_desconhecida'));
        assert.ok(!plano.localStorageRemover.includes('outraCoisa'));
        assert.ok(!plano.localStorageRemover.includes('arquivoPoetico_v3'));
        assert.ok(!plano.indexedDBLimpar.includes('arquivoPoetico_snapshots'));
    });

    it('sem caixa: nada a fazer', () => {
        assert.deepEqual(planoArmazenamento({}, PRESENTES), {
            localStorageRemover: [],
            regravarAcervo: false,
            indexedDBLimpar: [],
        });
    });
});

describe('esvaziar acervo: Versões Alternativas (F13-D7) e formato do acervo', () => {
    const banco = JSON.stringify({
        'poema:1': { tipo: 'poema', tituloOriginal: 'A', textoFiltrado: 'x' },
        'prosa:2': { tipo: 'prosa', tituloOriginal: 'B', textoFiltrado: 'y' },
    });

    it('conta versões e tolera lixo', () => {
        assert.equal(contarVersoesFiltradas(banco), 2);
        assert.equal(contarVersoesFiltradas('{}'), 0);
        assert.equal(contarVersoesFiltradas(null), 0);
        assert.equal(contarVersoesFiltradas('não é json'), 0);
        assert.equal(contarVersoesFiltradas('[1,2]'), 0);
    });

    it('o formato do JSON do acervo não ganha chave nova: as 30 chaves seguem as do inventário', () => {
        const db = criarDb();
        aplicarEsvaziamento(db, TODAS);
        const permitidas = new Set([...CHAVES_DB.map((c) => c.chave)]);
        for (const chave of Object.keys(db)) assert.ok(permitidas.has(chave), chave);
    });
});
