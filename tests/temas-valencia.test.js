// Valência do Tema (30/10/2026): lógica pura (temas.js), exportação do
// cadastro em .md e a Importação Aditiva casando pelo nome.
import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import {
    VALENCIAS_TEMA,
    ROTULOS_VALENCIA_TEMA,
    normalizarValenciaTema,
    definirValenciaDoTema,
    sincronizarTemas,
    resolverTemasEditados,
    mesclarTemas,
} from '../js/temas.js';
import { gerarMarkdownTemas } from '../js/exportar-temas.js';
import { aplicarImportacaoAditiva, classificarImportacaoAditiva } from '../js/importar-aditivo.js';

describe('normalizarValenciaTema', () => {
    it('tem quatro valores, com rótulo para cada um', () => {
        assert.deepEqual(VALENCIAS_TEMA, ['agradavel', 'neutro', 'desagradavel', 'ambivalente']);
        VALENCIAS_TEMA.forEach((v) => assert.ok(ROTULOS_VALENCIA_TEMA[v]));
    });

    it('aceita a chave ou o rótulo, sem caixa e sem acento', () => {
        assert.equal(normalizarValenciaTema('agradavel'), 'agradavel');
        assert.equal(normalizarValenciaTema('Desagradável'), 'desagradavel');
        assert.equal(normalizarValenciaTema('  AMBIVALENTE '), 'ambivalente');
        assert.equal(normalizarValenciaTema('Neutro'), 'neutro');
    });

    it('o que não bate vira vazio (não classificado)', () => {
        assert.equal(normalizarValenciaTema(''), '');
        assert.equal(normalizarValenciaTema(undefined), '');
        assert.equal(normalizarValenciaTema(null), '');
        assert.equal(normalizarValenciaTema('positivo'), '');
        assert.equal(normalizarValenciaTema(3), '');
    });
});

describe('definirValenciaDoTema', () => {
    it('grava a chave e apaga o campo quando o valor é vazio ou inválido', () => {
        const t = { id: 1, nome: 'Luto', notas: '' };
        assert.equal(definirValenciaDoTema(t, 'Desagradável'), 'desagradavel');
        assert.equal(t.valencia, 'desagradavel');
        assert.equal(definirValenciaDoTema(t, ''), '');
        assert.equal('valencia' in t, false);
        definirValenciaDoTema(t, 'neutro');
        definirValenciaDoTema(t, 'lixo');
        assert.equal('valencia' in t, false);
    });

    it('aceita tema inexistente sem estourar', () => {
        assert.equal(definirValenciaDoTema(null, 'neutro'), '');
    });
});

describe('sincronizarTemas e a valência', () => {
    it('não cria o campo em Tema sem valência (migração vazia)', () => {
        const db = { poemas: [{ id: 1, sinalizacoesTema: 'Luto' }], prosas: [], temas: [] };
        sincronizarTemas(db);
        assert.equal(db.temas.length, 1);
        assert.equal('valencia' in db.temas[0], false);
    });

    it('normaliza a valência gravada e descarta a inválida', () => {
        const db = {
            poemas: [],
            prosas: [],
            temas: [
                { id: 1, nome: 'A', notas: '', valencia: 'Agradável' },
                { id: 2, nome: 'B', notas: '', valencia: 'bom' },
                { id: 3, nome: 'C', notas: '', valencia: '' },
            ],
        };
        sincronizarTemas(db);
        assert.equal(db.temas[0].valencia, 'agradavel');
        assert.equal('valencia' in db.temas[1], false);
        assert.equal('valencia' in db.temas[2], false);
    });
});

describe('resolverTemasEditados com valência vinda de fora', () => {
    it('cria o Tema novo já com a valência', () => {
        const db = { temas: [] };
        resolverTemasEditados(db, [{ nome: 'Luto', papel: 'principal', valencia: 'desagradavel' }]);
        assert.equal(db.temas[0].valencia, 'desagradavel');
    });

    it('só preenche o vazio: valência que o destino já tem não é trocada', () => {
        const db = {
            temas: [
                { id: 1, nome: 'Luto', notas: '', valencia: 'ambivalente' },
                { id: 2, nome: 'Amizade', notas: '' },
            ],
        };
        resolverTemasEditados(db, [
            { nome: 'luto', valencia: 'desagradavel' },
            { nome: 'Amizade', valencia: 'agradavel' },
        ]);
        assert.equal(db.temas[0].valencia, 'ambivalente');
        assert.equal(db.temas[1].valencia, 'agradavel');
    });

    it('valência inválida ou ausente não mexe no cadastro', () => {
        const db = { temas: [] };
        resolverTemasEditados(db, [{ nome: 'Mar', valencia: 'x' }, { nome: 'Rio' }]);
        assert.equal(db.temas.length, 2);
        db.temas.forEach((t) => assert.equal('valencia' in t, false));
    });
});

describe('mesclarTemas e a valência', () => {
    function montar(valOrigem, valDestino) {
        const db = {
            poemas: [{ id: 1, sinalizacoesTema: 'Origem' }],
            prosas: [],
            assuntos: [],
            temas: [
                { id: 1, nome: 'Origem', notas: '' },
                { id: 2, nome: 'Destino', notas: '' },
            ],
        };
        if (valOrigem) db.temas[0].valencia = valOrigem;
        if (valDestino) db.temas[1].valencia = valDestino;
        sincronizarTemas(db);
        return db;
    }

    it('o destino sem valência herda a da origem', () => {
        const db = montar('desagradavel', '');
        const r = mesclarTemas(db, 1, 2);
        assert.equal(r.ok, true);
        assert.equal(db.temas.find((t) => t.id == 2).valencia, 'desagradavel');
    });

    it('o destino com valência mantém a própria', () => {
        const db = montar('desagradavel', 'neutro');
        mesclarTemas(db, 1, 2);
        assert.equal(db.temas.find((t) => t.id == 2).valencia, 'neutro');
    });

    it('desfazer devolve o destino como estava (com e sem valência)', () => {
        const sem = montar('desagradavel', '');
        const r1 = mesclarTemas(sem, 1, 2);
        r1.desfazer();
        assert.equal('valencia' in sem.temas.find((t) => t.id == 2), false);
        assert.equal(sem.temas.find((t) => t.id == 1).valencia, 'desagradavel');

        const com = montar('desagradavel', 'neutro');
        const r2 = mesclarTemas(com, 1, 2);
        r2.desfazer();
        assert.equal(com.temas.find((t) => t.id == 2).valencia, 'neutro');
    });
});

describe('gerarMarkdownTemas e a valência', () => {
    const base = () => ({
        temas: [
            { id: 1, nome: 'Luto', notas: '', valencia: 'desagradavel' },
            { id: 2, nome: 'Mar', notas: '' },
        ],
        assuntos: [{ id: 10, nome: 'Perda', temaIds: [1] }],
        poemas: [{ id: 1, sinalizacoesTema: 'Luto' }],
        prosas: [],
    });

    it('mostra a valência do tema classificado, antes dos assuntos', () => {
        const md = gerarMarkdownTemas(base());
        assert.match(md, /- Luto \(1\)\. Valência: Desagradável\. Assuntos: Perda/);
    });

    it('tema sem valência sai como sempre', () => {
        const md = gerarMarkdownTemas(base());
        assert.match(md, /- Mar \(0\)\n?/);
        assert.doesNotMatch(md, /Mar \(0\)\. Valência/);
    });
});

describe('Importação Aditiva e a valência', () => {
    const dbVazio = () => ({
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
        temas: [],
        assuntos: [],
    });
    const poema = (temas) => ({
        id: 42,
        tipo: 'poema',
        titulo: 'Elegia',
        texto: 'texto',
        pessoas: [],
        autoria: [],
        gruposDiretosResolvidos: [],
        livrosResolvidos: [],
        contexto: { livro: null, parte: null, secao: null },
        temas,
    });
    const deps = () => ({
        tirarSnapshotSeNecessario: mock.fn(async () => true),
        save: mock.fn(() => {}),
    });

    it('o Tema criado pela importação chega com a valência do arquivo', async () => {
        const db = dbVazio();
        const payload = {
            itens: [
                poema([{ temaId: 7, nome: 'Luto', papel: 'principal', valencia: 'desagradavel' }]),
            ],
        };
        const rel = classificarImportacaoAditiva(payload, db);
        const r = await aplicarImportacaoAditiva(payload, rel, db, deps());
        assert.equal(r.sucesso, true);
        assert.equal(db.temas.length, 1);
        assert.equal(db.temas[0].valencia, 'desagradavel');
    });

    it('Tema que o acervo já tem: preenche o vazio e respeita o que já estava classificado', async () => {
        const db = dbVazio();
        db.temas.push(
            { id: 1, nome: 'Luto', notas: '', valencia: 'ambivalente' },
            { id: 2, nome: 'Amizade', notas: '' },
        );
        const payload = {
            itens: [
                poema([
                    { temaId: 7, nome: 'luto', papel: '', valencia: 'desagradavel' },
                    { temaId: 8, nome: 'Amizade', papel: '', valencia: 'agradavel' },
                ]),
            ],
        };
        const rel = classificarImportacaoAditiva(payload, db);
        await aplicarImportacaoAditiva(payload, rel, db, deps());
        assert.equal(db.temas.find((t) => t.nome === 'Luto').valencia, 'ambivalente');
        assert.equal(db.temas.find((t) => t.nome === 'Amizade').valencia, 'agradavel');
        assert.equal(db.temas.length, 2);
    });

    it('JSON antigo, sem valência, importa como sempre', async () => {
        const db = dbVazio();
        const payload = { itens: [poema([{ temaId: 7, nome: 'Mar', papel: '' }])] };
        const rel = classificarImportacaoAditiva(payload, db);
        await aplicarImportacaoAditiva(payload, rel, db, deps());
        assert.equal(db.temas.length, 1);
        assert.equal('valencia' in db.temas[0], false);
    });
});
