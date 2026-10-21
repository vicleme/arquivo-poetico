import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

// Fase 1, etapa 1a: a aba "Temas e pessoas" foi dividida em três —
// Temas e Assuntos, Pessoas e Grupos e Cruzamentos (a matriz). Estrutural:
// nenhum número muda. Estes testes conferem que cada gráfico mora na aba
// certa, que o menu e o despachante conhecem as abas novas, que nada
// aponta para a aba antiga e que as três telas desenham sem erro.
const { db } = await import('../js/db.js');
const E = await import('../js/estatisticas.js');
const { renderTemasAssuntos } = await import('../js/estatisticas-tela-temas.js');
const { renderPessoasGrupos } = await import('../js/estatisticas-tela-pessoas.js');
const { renderCruzamentos } = await import('../js/estatisticas-tela-cruzamentos.js');
const comum = await import('../js/estatisticas-tela-comum.js');
const filtros = await import('../js/estatisticas-filtros.js');

const HTML = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const secao = (id) => HTML.match(new RegExp(`<section id="${id}"[\\s\\S]*?</section>`))[0];
const SECOES = {
    'estatisticas-temas-assuntos': secao('estatisticas-temas-assuntos'),
    'estatisticas-pessoas-grupos': secao('estatisticas-pessoas-grupos'),
    'estatisticas-cruzamentos': secao('estatisticas-cruzamentos'),
};

const IDS_POR_ABA = {
    'estatisticas-temas-assuntos': [
        'grafico-temas-assuntos',
        'painel-modo-temas-assuntos',
        'painel-ordem-temas-assuntos',
        'painel-ocultos-temas-assuntos',
        'grafico-tema-tempo',
        'painel-temporal-temas',
        'painel-papel-tema-tempo',
        'est-tema-temporal-legenda',
    ],
    'estatisticas-pessoas-grupos': [
        'grafico-pessoas',
        'painel-modo-pessoas',
        'painel-grupo-pessoas',
        'painel-ocultos-pessoas',
        'painel-cistrans-pessoas',
        'painel-genero-pessoas',
        'grafico-pessoa-tempo',
        'painel-temporal-pessoas',
        'painel-grupo-pessoa-tempo',
        'est-pessoa-temporal-legenda',
    ],
    'estatisticas-cruzamentos': [
        'est-coocorrencia-modo',
        'painel-colunas-coocorrencia',
        'tabela-coocorrencia',
        'painel-papel-tema-cruzamentos',
    ],
};

function zerar() {
    localStorage.clear();
    ['livros', 'partes', 'secoes', 'elementos', 'epocas', 'autores', 'grupos'].forEach(
        (c) => (db[c] = []),
    );
    db.temas = [
        { id: 1, nome: 'Amor', notas: '' },
        { id: 2, nome: 'Mar', notas: '' },
    ];
    db.assuntos = [{ id: 10, nome: 'Vida emocional', notas: '', temaIds: [1] }];
    db.pessoas = [
        { id: 1, nome: 'Ana', genero: 'Mulher' },
        { id: 2, nome: 'Bia', genero: 'Mulher' },
        { id: 3, nome: 'Caio', genero: 'Homem' },
    ];
    db.poemas = [
        {
            id: 1,
            titulo: 'A',
            ano: 2020,
            temas: [
                { temaId: 1, papel: 'principal' },
                { temaId: 2, papel: 'secundario' },
            ],
            sinalizacoesTema: 'Amor, Mar',
            pessoas: [{ pessoaId: 1 }, { pessoaId: 2 }, { pessoaId: 3 }],
        },
        {
            id: 2,
            titulo: 'B',
            ano: 2021,
            temas: [{ temaId: 1, papel: 'principal' }],
            sinalizacoesTema: 'Amor',
            pessoas: [{ pessoaId: 1 }],
        },
    ];
    db.prosas = [];
}

describe('Fase 1a: as três abas novas no HTML', () => {
    it('cada aba existe, com filtros compartilhados e um botão no menu', () => {
        for (const id of Object.keys(SECOES)) {
            assert.ok(SECOES[id].includes('est-filtros-compartilhados'), `${id}: filtros`);
            assert.ok(HTML.includes(`id="btn-${id}"`), `${id}: botão`);
            assert.ok(HTML.includes(`onclick="abrirAba('${id}')"`), `${id}: onclick`);
        }
    });

    it('cada gráfico e painel mora só na aba certa', () => {
        for (const [aba, ids] of Object.entries(IDS_POR_ABA)) {
            for (const id of ids) {
                assert.ok(SECOES[aba].includes(`id="${id}"`), `${id} deveria estar em ${aba}`);
                const fora = Object.keys(SECOES).filter((o) => o !== aba);
                for (const o of fora) {
                    assert.ok(!SECOES[o].includes(`id="${id}"`), `${id} não deveria estar em ${o}`);
                }
                assert.equal((HTML.match(new RegExp(`id="${id}"`, 'g')) || []).length, 1, id);
            }
        }
    });

    it('os cartões em grade têm min-w-0 para o canvas não esticar a coluna', () => {
        assert.equal(
            (SECOES['estatisticas-temas-assuntos'].match(/class="min-w-0 bg-white/g) || []).length,
            1,
        );
        assert.equal(
            (SECOES['estatisticas-pessoas-grupos'].match(/class="min-w-0 bg-white/g) || []).length,
            1,
        );
    });

    it('nada no código, no HTML ou nos testes aponta para a aba antiga', () => {
        const dirs = ['../js/', '../tests/'];
        for (const d of dirs) {
            for (const f of readdirSync(new URL(d, import.meta.url))) {
                if (!f.endsWith('.js') || f === 'estatisticas-abas-temas-pessoas.test.js') continue;
                const txt = readFileSync(new URL(d + f, import.meta.url), 'utf8');
                assert.ok(!txt.includes('estatisticas-temas-pessoas'), `${d}${f}`);
            }
        }
        assert.ok(!HTML.includes('estatisticas-temas-pessoas'));
    });

    it('o menu de Estatísticas tem 9 itens, na ordem combinada', () => {
        const ui = readFileSync(new URL('../js/ui.js', import.meta.url), 'utf8');
        const bloco = ui.match(
            /id: 'estatisticas',\s*rotulo: 'Estatísticas',\s*abas: \[([\s\S]*?)\],\s*\}/,
        )[1];
        const ids = [...bloco.matchAll(/id: '([^']+)'/g)].map((m) => m[1]);
        assert.deepEqual(ids, [
            'estatisticas',
            'estatisticas-producao',
            'estatisticas-temas-assuntos',
            'estatisticas-pessoas-grupos',
            'estatisticas-personagens',
            'estatisticas-cruzamentos',
            'estatisticas-local-idioma',
            'estatisticas-correntes',
            'estatisticas-linguagem',
        ]);
        // Todo id do menu tem seção e botão no HTML.
        for (const id of ids) {
            assert.ok(HTML.includes(`<section id="${id}"`), `seção ${id}`);
            assert.ok(HTML.includes(`id="btn-${id}"`), `botão ${id}`);
        }
    });

    it('o despachante redesenha quando qualquer das abas novas está ativa', () => {
        const src = readFileSync(new URL('../js/estatisticas.js', import.meta.url), 'utf8');
        for (const id of Object.keys(SECOES)) assert.ok(src.includes(`'${id}'`), id);
    });
});

describe('Fase 1a: seletorOcultos virou componente comum', () => {
    it('é exportado de estatisticas-tela-comum.js, não mais da aba de Temas', () => {
        assert.equal(typeof comum.seletorOcultos, 'function');
        const local = readFileSync(
            new URL('../js/estatisticas-tela-local-idioma.js', import.meta.url),
            'utf8',
        );
        assert.match(local, /seletorOcultos,\n\} from '\.\/estatisticas-tela-comum\.js'/);
    });
});

describe('Fase 1a: as três telas desenham', () => {
    const graficos = {};
    beforeEach(() => {
        zerar();
        document.body.innerHTML = Object.values(SECOES).join('\n');
        Object.keys(graficos).forEach((k) => delete graficos[k]);
        globalThis.Chart = class {
            constructor(canvas, cfg) {
                this.data = cfg.data;
                graficos[canvas.id] = this;
            }
            destroy() {}
            static getChart(canvas) {
                return graficos[canvas.id];
            }
        };
    });

    it('Temas e Assuntos: o total empilhado é o de sempre (Amor 2, Mar 1)', () => {
        renderTemasAssuntos();
        const t = graficos['grafico-temas-assuntos'].data;
        const soma = (i) => t.datasets.reduce((acc, d) => acc + d.data[i], 0);
        assert.deepEqual(Object.fromEntries(t.labels.map((l, i) => [l, soma(i)])), {
            Amor: 2,
            Mar: 1,
        });
        assert.ok(graficos['grafico-tema-tempo']);
        // O seletor de papel do tema fica na linha do tempo, não no gráfico de barras.
        assert.match(document.getElementById('painel-papel-tema-tempo').innerHTML, /Papel do tema/);
    });

    it('Pessoas e Grupos: pessoas e linha do tempo (o gênero agora é um modo do gráfico)', () => {
        renderPessoasGrupos();
        const p = graficos['grafico-pessoas'].data;
        assert.deepEqual(Object.fromEntries(p.labels.map((l, i) => [l, p.datasets[0].data[i]])), {
            Ana: 2,
            Bia: 1,
            Caio: 1,
        });
        assert.ok(!graficos['grafico-generos-pessoa'], 'o cartão separado de gênero saiu');
        assert.ok(graficos['grafico-pessoa-tempo']);
        assert.match(document.getElementById('painel-modo-pessoas').innerHTML, /Por pessoa/);
    });

    it('Cruzamentos: a matriz aparece e o seletor de papel do tema está ao lado dela', () => {
        renderCruzamentos();
        const html = document.getElementById('tabela-coocorrencia').innerHTML;
        assert.match(html, /<table/);
        assert.match(html, /Pessoa × tema/);
        assert.match(
            document.getElementById('painel-papel-tema-cruzamentos').innerHTML,
            /Papel do tema/,
        );
    });

    it('Cruzamentos: a lista de "Selecionar temas" pode ser recolhida e a escolha persiste', () => {
        localStorage.clear();
        filtros.definirModoColunasCoocorrencia('selecionar');
        const painel = () => document.getElementById('painel-colunas-coocorrencia');

        renderCruzamentos();
        assert.equal(filtros.getPainelColunasCoocorrenciaAberto(), true);
        assert.ok(!painel().firstElementChild.nextElementSibling.className.includes('hidden'));
        assert.match(painel().innerHTML, /Recolher lista/);

        filtros.definirPainelColunasCoocorrenciaAberto(false);
        renderCruzamentos();
        assert.equal(filtros.getPainelColunasCoocorrenciaAberto(), false);
        assert.match(painel().innerHTML, /Editar seleção/);
        assert.match(painel().innerHTML, /temas exibidos\./);
        assert.match(painel().innerHTML, /id="painel-colunas-coocorrencia" class="hidden/);
        // A matriz continua lá, só a lista sumiu.
        assert.match(
            document.getElementById('tabela-coocorrencia').innerHTML,
            /<table|Selecione ao menos/,
        );

        filtros.definirPainelColunasCoocorrenciaAberto(true);
        localStorage.clear();
    });

    it('renderEstatisticas desenha as três de uma vez, sem erro', () => {
        document.body.innerHTML += '<div id="estatisticas"></div>';
        assert.doesNotThrow(() => E.renderEstatisticas());
    });
});
