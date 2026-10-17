import './helpers/dom-real.js';

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// Bloco 3: Esfera e Categoria do período viajam nas exportações (MD, CSV) e na
// Importação Aditiva; Pessoas envolvidas e Vínculo não viajam.
const { db } = await import('../js/db.js');
const { montarRegistro } = await import('../js/exportar.js');
const { gerarCsvTextos } = await import('../js/exportar-csv.js');
const { gerarMarkdownExportacao } = await import('../js/exportar-md.js');
const { classificarImportacaoAditiva, aplicarImportacaoAditiva } =
    await import('../js/importar-aditivo.js');

function lerCsvSimples(csv) {
    const [cab, ...linhas] = csv
        .replace(/^\uFEFF/, '')
        .trim()
        .split('\r\n');
    const chaves = cab.split(',');
    return linhas.map((l) => Object.fromEntries(l.split(',').map((v, i) => [chaves[i], v])));
}

function montarBanco() {
    db.autores = [{ id: 1, nome: 'Ana' }];
    db.pessoas = [{ id: 100, nome: 'Carla', oculto: false }];
    db.opcoesPeriodoBiografico = { esferas: ['Afetiva'], vinculos: ['Amizade'] };
    db.epocas = [
        {
            id: 7,
            nome: 'Namoro',
            autorId: 1,
            esferas: ['Afetiva', 'Social'],
            categorias: ['Transição'],
            pessoasEnvolvidas: [{ pessoaId: 100 }],
            relacoes: [{ de: 'autor', para: 100, natureza: '', vinculo: 'Amizade' }],
        },
    ];
    db.poemas = [
        {
            id: 1,
            titulo: 'T',
            texto: 'x',
            epocaRetratada: { epocaId: 7, recorte: 'momento' },
        },
    ];
}

describe('exportação: Esfera e Categoria do período (Bloco 3)', () => {
    beforeEach(montarBanco);

    it('o registro exportado leva esferas e categorias, e não leva pessoas nem vínculo', () => {
        const reg = montarRegistro('poema', db.poemas[0]);
        assert.deepEqual(reg.epocaRetratada.periodos[0].esferas, ['Afetiva', 'Social']);
        assert.deepEqual(reg.epocaRetratada.periodos[0].categorias, ['Transição']);
        const json = JSON.stringify(reg);
        assert.ok(!json.includes('pessoasEnvolvidas'));
        assert.ok(!json.includes('relacoes'));
        assert.ok(!json.includes('Amizade'));
        assert.ok(!json.includes('Carla'));
    });

    it('CSV tem colunas de esferas e categorias, sem pessoas', () => {
        const csv = gerarCsvTextos('poema', [montarRegistro('poema', db.poemas[0])], db);
        const [linha] = lerCsvSimples(csv);
        assert.equal(linha.periodo_biografico_esferas, 'Afetiva | Social');
        assert.equal(linha.periodo_biografico_categorias, 'Transição');
        assert.ok(!csv.includes('Carla'));
    });

    it('Markdown mostra Esfera e Categoria, sem pessoas', () => {
        const md = gerarMarkdownExportacao(db.poemas);
        assert.match(md, /\*\*Esfera do Período Biográfico:\*\* Afetiva, Social/);
        assert.match(md, /\*\*Categoria do Período Biográfico:\*\* Transição/);
        assert.ok(!md.includes('Carla'));
    });

    it('Markdown não mostra as linhas quando o período não tem esfera nem categoria', () => {
        db.epocas[0].esferas = [];
        db.epocas[0].categorias = [];
        const md = gerarMarkdownExportacao(db.poemas);
        assert.ok(!md.includes('Esfera do Período Biográfico'));
        assert.ok(!md.includes('Categoria do Período Biográfico'));
    });
});

describe('Importação Aditiva: período novo (Bloco 3)', () => {
    const destinoVazio = () => ({
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
        opcoesPeriodoBiografico: { esferas: ['Afetiva'], vinculos: ['Amizade'] },
    });
    const poemaDoPacote = (epocaRetratada) => ({
        id: 42,
        tipo: 'poema',
        titulo: 'Movimento Circular',
        texto: 'x',
        pessoas: [],
        autoria: [],
        gruposDiretosResolvidos: [],
        livrosResolvidos: [],
        contexto: { livro: null, parte: null, secao: null },
        epocaRetratada,
    });
    const deps = () => ({
        tirarSnapshotSeNecessario: mock.fn(async () => true),
        save: mock.fn(() => {}),
    });

    it('cria o período com Esfera e Categoria do pacote e registra a esfera nova', async () => {
        const dest = destinoVazio();
        const payload = {
            itens: [
                poemaDoPacote({
                    epocaId: 9,
                    nomeEpoca: 'Faculdade',
                    recorte: 'momento',
                    esferas: ['Acadêmica', 'Afetiva'],
                    categorias: ['Transição'],
                }),
            ],
        };
        const rel = classificarImportacaoAditiva(payload, dest);
        const r = await aplicarImportacaoAditiva(payload, rel, dest, deps());
        assert.equal(r.sucesso, true);
        assert.equal(dest.epocas.length, 1);
        const epoca = dest.epocas[0];
        assert.deepEqual(epoca.esferas, ['Acadêmica', 'Afetiva']);
        assert.deepEqual(epoca.categorias, ['Transição']);
        assert.deepEqual(epoca.pessoasEnvolvidas, []);
        assert.ok(dest.opcoesPeriodoBiografico.esferas.includes('Acadêmica'));
    });

    it('pacote antigo, sem os campos novos, cria o período com listas vazias', async () => {
        const dest = destinoVazio();
        const payload = {
            itens: [poemaDoPacote({ epocaId: 9, nomeEpoca: 'Faculdade', recorte: 'momento' })],
        };
        const rel = classificarImportacaoAditiva(payload, dest);
        await aplicarImportacaoAditiva(payload, rel, dest, deps());
        assert.deepEqual(dest.epocas[0].esferas, []);
        assert.deepEqual(dest.epocas[0].categorias, []);
        assert.deepEqual(dest.epocas[0].pessoasEnvolvidas, []);
    });
});
