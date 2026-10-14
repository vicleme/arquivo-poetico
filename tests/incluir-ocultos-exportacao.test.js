import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Caixa "Incluir dados ocultados": por padrão a exportação sai sem a Pessoa oculta e
// sem o Período Biográfico oculto; marcada, leva os dois. A persistência da
// caixa é escolha da pessoa ("lembrar"), desligada por padrão.

const { db } = await import('../js/db.js');
const { montarRegistro } = await import('../js/exportar.js');
const { gerarMarkdownExportacao } = await import('../js/exportar-md.js');
const { gerarCsvTextos } = await import('../js/exportar-csv.js');
const {
    incluirOcultosNaExportacao,
    lembrarIncluirOcultos,
    toggleIncluirOcultos,
    toggleLembrarIncluirOcultos,
    recarregarEstadoIncluirOcultos,
    renderIncluirOcultosAcoes,
} = await import('../js/ocultos-exportacao.js');
const { classificarChaveLocalStorage } = await import('../js/inventario-armazenamento.js');

const LS_VALOR = 'arquivoPoetico_incluirOcultosExportacao';
const LS_LEMBRAR = 'arquivoPoetico_incluirOcultosLembrar';

function montarBanco() {
    db.autores = [{ id: 1, nome: 'Ana' }];
    db.pessoas = [
        { id: 100, nome: 'Carla', oculto: false },
        { id: 101, nome: 'Davi', oculto: true },
    ];
    db.epocas = [
        {
            id: 10,
            nome: 'Namoro com Davi',
            autorId: 1,
            oculto: true,
            esferas: ['Amorosa'],
            categorias: ['Passada'],
        },
        { id: 11, nome: 'Faculdade', autorId: 1, oculto: false, esferas: [], categorias: [] },
    ];
    db.poemas = [
        {
            id: 1,
            titulo: 'A',
            pessoas: [
                { pessoaId: 100, papeis: ['Musa'] },
                { pessoaId: 101, papeis: ['Destinatário'] },
            ],
            epocaRetratada: { epocaId: 10 },
            conceitos: {
                ecos: [
                    { tipo: 'Eco', ancoras: [{ especie: 'pessoa', id: 101 }] },
                    {
                        tipo: 'Eco',
                        ancoras: [
                            { especie: 'pessoa', id: 101 },
                            { especie: 'pessoa', id: 100 },
                        ],
                    },
                ],
            },
        },
    ];
    db.prosas = [];
}

beforeEach(() => {
    localStorage.clear();
    recarregarEstadoIncluirOcultos();
    montarBanco();
});

describe('filtro nas exportações', () => {
    it('por padrão a Pessoa oculta sai inteira do registro', () => {
        const r = montarRegistro('poema', db.poemas[0]);
        assert.deepEqual(
            r.pessoas.map((p) => p.nome),
            ['Carla'],
        );
    });

    it('a âncora de Eco para Pessoa oculta some; Eco sem outra âncora fica sem o campo', () => {
        const { ecos } = montarRegistro('poema', db.poemas[0]).conceitos;
        assert.equal(ecos.length, 2);
        assert.equal('ancoras' in ecos[0], false);
        assert.deepEqual(
            ecos[1].ancoras.map((a) => a.nome),
            ['Carla'],
        );
    });

    it('o período oculto sai sem nome, Esfera e Categoria', () => {
        const r = montarRegistro('poema', db.poemas[0]);
        assert.equal(r.epocaRetratada.nomeEpoca, '');
        assert.equal(r.epocaRetratada.epocaId, null);
        assert.deepEqual(r.epocaRetratada.esferas, []);
    });

    it('Markdown e CSV não trazem o nome da Pessoa nem do período ocultos', () => {
        const itens = [montarRegistro('poema', db.poemas[0])];
        const md = gerarMarkdownExportacao(itens);
        const csv = gerarCsvTextos('poema', itens, db);
        for (const saida of [md, csv]) {
            assert.ok(!saida.includes('Davi'));
            assert.ok(!saida.includes('Namoro'));
            assert.ok(saida.includes('Carla'));
        }
    });

    it('com "Incluir dados ocultados" os dois saem', () => {
        toggleIncluirOcultos(true);
        const r = montarRegistro('poema', db.poemas[0]);
        assert.deepEqual(
            r.pessoas.map((p) => p.nome),
            ['Carla', 'Davi'],
        );
        assert.equal(r.conceitos.ecos[0].ancoras[0].nome, 'Davi');
        assert.equal(r.epocaRetratada.nomeEpoca, 'Namoro com Davi');
        assert.equal(r.epocaRetratada.epocaId, 10);
        assert.deepEqual(r.epocaRetratada.esferas, ['Amorosa']);
        const md = gerarMarkdownExportacao([r]);
        assert.ok(md.includes('Davi'));
        assert.ok(md.includes('Namoro com Davi'));
        assert.ok(md.includes('Amorosa'));
    });

    it('o registro não altera o acervo', () => {
        const antes = JSON.stringify(db.poemas);
        montarRegistro('poema', db.poemas[0]);
        assert.equal(JSON.stringify(db.poemas), antes);
    });
});

describe('persistência opcional', () => {
    it('padrão: desmarcada, sem lembrar, nada guardado', () => {
        assert.equal(incluirOcultosNaExportacao(), false);
        assert.equal(lembrarIncluirOcultos(), false);
        toggleIncluirOcultos(true);
        assert.equal(localStorage.getItem(LS_VALOR), null);
        recarregarEstadoIncluirOcultos();
        assert.equal(incluirOcultosNaExportacao(), false);
    });

    it('com "lembrar", o estado é guardado e restaurado', () => {
        toggleLembrarIncluirOcultos(true);
        toggleIncluirOcultos(true);
        assert.equal(localStorage.getItem(LS_VALOR), '1');
        recarregarEstadoIncluirOcultos();
        assert.equal(incluirOcultosNaExportacao(), true);
        toggleIncluirOcultos(false);
        recarregarEstadoIncluirOcultos();
        assert.equal(incluirOcultosNaExportacao(), false);
    });

    it('ligar "lembrar" com a caixa já marcada guarda o estado atual', () => {
        toggleIncluirOcultos(true);
        toggleLembrarIncluirOcultos(true);
        recarregarEstadoIncluirOcultos();
        assert.equal(incluirOcultosNaExportacao(), true);
    });

    it('desligar "lembrar" apaga o valor guardado: a caixa volta desmarcada na recarga', () => {
        toggleLembrarIncluirOcultos(true);
        toggleIncluirOcultos(true);
        toggleLembrarIncluirOcultos(false);
        assert.equal(localStorage.getItem(LS_VALOR), null);
        assert.equal(incluirOcultosNaExportacao(), true); // na sessão atual segue marcada
        recarregarEstadoIncluirOcultos();
        assert.equal(incluirOcultosNaExportacao(), false);
    });

    it('valor guardado sem "lembrar" é ignorado', () => {
        localStorage.setItem(LS_VALOR, '1');
        recarregarEstadoIncluirOcultos();
        assert.equal(incluirOcultosNaExportacao(), false);
    });
});

describe('controles e inventário', () => {
    it('o bloco do painel Ações traz as duas caixas e reflete o estado', () => {
        toggleLembrarIncluirOcultos(true);
        toggleIncluirOcultos(true);
        const html = renderIncluirOcultosAcoes();
        assert.match(html, /incluir-ocultos-check[^>]*checked/);
        assert.match(html, /incluir-ocultos-lembrar-check[^>]*checked/);
    });

    it('as duas chaves do localStorage estão classificadas como preferência', () => {
        assert.equal(classificarChaveLocalStorage(LS_VALOR), 'preferencia');
        assert.equal(classificarChaveLocalStorage(LS_LEMBRAR), 'preferencia');
    });
});
