// Seleção de itens da aba Conexões para baixar: chaves, filtro, relatórios
// no escopo "selecao" e o fluxo das caixinhas na tela (happy-dom).
import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
    chaveBuraco,
    chaveCluster,
    chaveGrafo,
    todasAsChaves,
    filtrarSelecionados,
} from '../js/selecao-conexoes.js';
import {
    gerarMarkdownConexoes,
    resumoConexoes,
    secoesDoEscopo,
    ESCOPOS_CONEXOES,
    NOME_ARQUIVO_CONEXOES,
    TITULOS_CONEXOES,
} from '../js/exportar-conexoes.js';
import { montarSvgRelatorio } from '../js/exportar-conexoes-png.js';

// ─── Dados de exemplo (mesma forma de render-conexoes.js) ───────

const buraco = (de, para) => ({
    deId: de,
    deTitulo: `P${de}`,
    paraId: para,
    paraTitulo: `P${para}`,
    rotulo: 'Reescrita de',
});

const par = (a, b) => ({
    ids: [a, b],
    tamanho: 2,
    arestas: [
        { aId: a, aTitulo: `P${a}`, bId: b, bTitulo: `P${b}`, rotulo: 'Resposta a' },
        { aId: b, aTitulo: `P${b}`, bId: a, bTitulo: `P${a}`, rotulo: 'Respondido em' },
    ],
});

const cadeia = (a, b) => ({
    nos: [
        { id: a, titulo: `P${a}` },
        { id: b, titulo: `P${b}` },
    ],
    arestas: [{ deId: a, deTitulo: `P${a}`, paraId: b, paraTitulo: `P${b}`, tipo: 'Tema' }],
    camadas: [[a], [b]],
    linear: true,
});

const DADOS = () => ({
    buracos: [buraco(3, 4), buraco(5, 6)],
    clusters: [par(1, 2), par(7, 8)],
    grafos: [cadeia(10, 11), cadeia(12, 13)],
});

// ─── Chaves ─────────────────────────────────────────────────────

describe('chaves da seleção', () => {
    it('não dependem da ordem dos poemas dentro do cartão', () => {
        assert.equal(chaveCluster({ ids: [2, 1] }), chaveCluster({ ids: [1, 2] }));
        assert.equal(
            chaveGrafo({ nos: [{ id: 11 }, { id: 10 }] }),
            chaveGrafo({ nos: [{ id: 10 }, { id: 11 }] }),
        );
    });

    it('o buraco distingue o sentido (A para B não é B para A)', () => {
        assert.notEqual(chaveBuraco(buraco(1, 2)), chaveBuraco(buraco(2, 1)));
    });

    it('Elo e Eco com os mesmos poemas não colidem', () => {
        assert.notEqual(chaveCluster({ ids: [1, 2] }), chaveGrafo({ nos: [{ id: 1 }, { id: 2 }] }));
    });

    it('todasAsChaves lista buracos, elos e ecos, sem repetir', () => {
        const chaves = todasAsChaves(DADOS());
        assert.equal(chaves.length, 6);
        assert.equal(new Set(chaves).size, 6);
    });

    it('sem dados não quebra', () => {
        assert.deepEqual(todasAsChaves(undefined), []);
    });
});

describe('filtrarSelecionados', () => {
    it('mantém só os marcados, na ordem da tela', () => {
        const d = DADOS();
        const marcadas = new Set([
            chaveGrafo(d.grafos[1]),
            chaveCluster(d.clusters[0]),
            chaveBuraco(d.buracos[1]),
        ]);
        const f = filtrarSelecionados(d, marcadas);
        assert.deepEqual(f.buracos, [d.buracos[1]]);
        assert.deepEqual(f.clusters, [d.clusters[0]]);
        assert.deepEqual(f.grafos, [d.grafos[1]]);
    });

    it('sem nada marcado devolve tudo vazio', () => {
        assert.deepEqual(filtrarSelecionados(DADOS(), new Set()), {
            buracos: [],
            clusters: [],
            grafos: [],
        });
    });

    it('aceita lista no lugar de Set e ignora chave que não existe', () => {
        const d = DADOS();
        const f = filtrarSelecionados(d, [chaveCluster(d.clusters[1]), 'e:99,100']);
        assert.deepEqual(f.clusters, [d.clusters[1]]);
    });
});

// ─── Escopo "selecao" nos relatórios ────────────────────────────

describe('escopo "selecao"', () => {
    it('está nas listas de escopos, nomes e títulos', () => {
        assert.ok(ESCOPOS_CONEXOES.includes('selecao'));
        assert.equal(NOME_ARQUIVO_CONEXOES.selecao, 'conexoes-selecao');
        assert.equal(TITULOS_CONEXOES.selecao, 'Conexões: seleção');
    });

    it('secoesDoEscopo: na seleção só entra a seção com item marcado', () => {
        const d = DADOS();
        const so = filtrarSelecionados(d, [chaveGrafo(d.grafos[0])]);
        assert.deepEqual(secoesDoEscopo('selecao', so), {
            buracos: false,
            elos: false,
            ecos: true,
        });
        assert.deepEqual(secoesDoEscopo('tudo', so), { buracos: true, elos: true, ecos: true });
        assert.deepEqual(secoesDoEscopo('elos', so), { buracos: true, elos: true, ecos: false });
        assert.deepEqual(secoesDoEscopo('ecos', so), { buracos: false, elos: false, ecos: true });
    });

    it('resumo conta só o marcado', () => {
        const d = DADOS();
        const f = filtrarSelecionados(d, [chaveBuraco(d.buracos[0]), chaveGrafo(d.grafos[0])]);
        assert.equal(resumoConexoes(f, 'selecao'), '1 buraco; 1 Eco em 1 cadeia e 0 grafos.');
    });

    it('resumo de um buraco só não fala de Elos', () => {
        const d = DADOS();
        const f = filtrarSelecionados(d, [chaveBuraco(d.buracos[0])]);
        assert.equal(resumoConexoes(f, 'selecao'), '1 buraco.');
    });

    it('resumo sem nada marcado avisa', () => {
        assert.equal(
            resumoConexoes({ buracos: [], clusters: [], grafos: [] }, 'selecao'),
            'Nada selecionado.',
        );
    });

    it('.md: só os cartões marcados, com título de seleção', () => {
        const d = DADOS();
        const f = filtrarSelecionados(d, [
            chaveBuraco(d.buracos[1]),
            chaveCluster(d.clusters[1]),
            chaveGrafo(d.grafos[0]),
        ]);
        const md = gerarMarkdownConexoes(f, 'selecao');
        assert.match(md, /^# Conexões: seleção\n\n/);
        assert.match(md, /- P5 \(Reescrita de\) → P6\. Falta o vínculo de volta\./);
        assert.ok(!md.includes('P3'), 'buraco não marcado ficou de fora');
        assert.match(md, /### Par 1\n\n- P7 \(Resposta a\) ↔ P8/);
        assert.ok(!md.includes('P1 ') && !md.includes('↔ P2'), 'par não marcado ficou de fora');
        assert.match(md, /### Cadeia 1 \(2 poemas\)\n\nP10 → \(Tema\) P11\n/);
        assert.ok(!md.includes('P12'), 'cadeia não marcada ficou de fora');
    });

    it('.md: seção sem nada marcado nem aparece', () => {
        const d = DADOS();
        const md = gerarMarkdownConexoes(
            filtrarSelecionados(d, [chaveGrafo(d.grafos[0])]),
            'selecao',
        );
        assert.ok(md.includes('## Ecos'));
        assert.ok(!md.includes('## Buracos') && !md.includes('## Elos'));
        assert.ok(!md.includes('Nenhum'));
    });

    it('.md: não usa travessão', () => {
        const d = DADOS();
        assert.ok(
            !gerarMarkdownConexoes(filtrarSelecionados(d, todasAsChaves(d)), 'selecao').includes(
                '—',
            ),
        );
    });

    it('escopos antigos continuam avisando seção vazia', () => {
        const md = gerarMarkdownConexoes({ buracos: [], clusters: [], grafos: [] }, 'elos');
        assert.match(md, /Nenhum: todo Elo registrado tem os dois lados\./);
    });

    describe('desenho (.png e .pdf)', () => {
        const medir = (t) => String(t).length * 6;
        const diagrama = {
            svg: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100"></svg>',
            largura: 400,
            altura: 100,
        };

        it('leva só as seções com item marcado', () => {
            const d = DADOS();
            const f = filtrarSelecionados(d, [chaveCluster(d.clusters[0])]);
            const { svg } = montarSvgRelatorio({ dados: f, escopo: 'selecao', medir });
            assert.ok(svg.includes('Conexões: seleção'));
            assert.ok(svg.includes('Elos (pares e clusters)'));
            assert.ok(!svg.includes('Buracos (Elos'));
            assert.ok(!svg.includes('Ecos (cadeias'));
        });

        it('buraco marcado entra sem a seção de Elos', () => {
            const d = DADOS();
            const f = filtrarSelecionados(d, [chaveBuraco(d.buracos[0])]);
            const { svg } = montarSvgRelatorio({ dados: f, escopo: 'selecao', medir });
            assert.ok(svg.includes('Buracos (Elos'));
            assert.ok(!svg.includes('Elos (pares e clusters)'));
        });

        it('Eco marcado entra com o diagrama e gera pontos de quebra', () => {
            const d = DADOS();
            const f = filtrarSelecionados(d, [chaveGrafo(d.grafos[0]), chaveGrafo(d.grafos[1])]);
            const r = montarSvgRelatorio({
                dados: f,
                escopo: 'selecao',
                medir,
                diagramasEcos: [diagrama, diagrama],
            });
            assert.ok(r.svg.includes('Ecos (cadeias'));
            assert.ok(r.quebras.length >= 2);
            assert.ok(!r.svg.includes('Elos (pares'));
        });

        it('escopos fixos seguem iguais: "elos" mostra Buracos e Elos, sem Ecos', () => {
            const { svg } = montarSvgRelatorio({ dados: DADOS(), escopo: 'elos', medir });
            assert.ok(svg.includes('Buracos (Elos'));
            assert.ok(svg.includes('Elos (pares e clusters)'));
            assert.ok(!svg.includes('Ecos (cadeias'));
        });
    });
});

// ─── Fluxo na tela (DOM real) ───────────────────────────────────

document.body.innerHTML = `
    <main>
        <select id="conexoes-baixar-escopo">
            <option value="tudo">Todas as conexões</option>
            <option value="elos">Só Elos</option>
            <option value="ecos">Só Ecos</option>
            <option value="selecao" hidden disabled>Só selecionados</option>
        </select>
        <select id="conexoes-baixar-formato"><option value="md">.md</option></select>
        <button id="conexoes-modo-selecao">☐ Selecionar</button>
        <div id="conexoes-selecao-barra" class="hidden"><span id="conexoes-selecao-contagem"></span></div>
        <div id="conexoes-buracos"></div>
        <div id="conexoes-elos"></div>
        <div id="conexoes-ecos"></div>
    </main>
`;

// happy-dom não tem canvas de verdade: medida falsa, só para o desenho dos
// diagramas de Ecos não quebrar.
const criarElementoOriginal = document.createElement.bind(document);
document.createElement = (tag, ...resto) => {
    const el = criarElementoOriginal(tag, ...resto);
    if (String(tag).toLowerCase() === 'canvas') {
        el.getContext = () => ({
            font: '',
            measureText: (t) => ({ width: String(t).length * 6 }),
        });
    }
    return el;
};

const { db } = await import('../js/db.js');
const tela = await import('../js/render-conexoes.js');

const poema = (id, titulo, conceitos = {}) => ({
    id,
    titulo,
    conceitos: { elos: [], ecos: [], ...conceitos },
});

function montarAcervo() {
    db.prosas = [];
    db.poemas = [
        poema(1, 'A', { elos: [{ id: 2, relacao: 'Resposta', direcao: 'destino', texto: '' }] }),
        poema(2, 'B', { elos: [{ id: 1, relacao: 'Resposta', direcao: 'origem', texto: '' }] }),
        poema(3, 'C', { elos: [{ id: 4, relacao: 'Reescrita', direcao: 'destino', texto: '' }] }),
        poema(4, 'D'),
        poema(5, 'E', { ecos: [{ id: 6, tipo: 'Tema', texto: '' }] }),
        poema(6, 'F'),
    ];
}

const escopo = () => document.getElementById('conexoes-baixar-escopo');
const caixas = () => [...document.querySelectorAll('input[data-action="toggle-selecao-conexao"]')];
const contagem = () => document.getElementById('conexoes-selecao-contagem').textContent;
const opcao = () => escopo().querySelector('option[value="selecao"]');

function marcar(caixa, valor = true) {
    caixa.checked = valor;
    tela.toggleSelecaoConexao(caixa);
}

describe('seleção na aba Conexões (DOM real)', () => {
    beforeEach(() => {
        montarAcervo();
        // volta ao estado inicial: modo desligado, nada marcado
        if (caixas().length) tela.alternarModoSelecaoConexoes();
        tela.limparSelecaoConexoes();
        escopo().value = 'tudo';
        tela.renderConexoes();
    });

    it('sem o modo ligado não há caixinhas', () => {
        assert.equal(caixas().length, 0);
        assert.ok(document.getElementById('conexoes-selecao-barra').classList.contains('hidden'));
        assert.equal(opcao().disabled, true);
    });

    it('ligar o modo põe uma caixinha em cada buraco, elo e eco', () => {
        tela.alternarModoSelecaoConexoes();
        // 1 buraco (C para D), 1 par (A e B), 1 par (C e D), 1 cadeia (E e F)
        assert.equal(caixas().length, 4);
        assert.ok(!document.getElementById('conexoes-selecao-barra').classList.contains('hidden'));
        assert.equal(
            document.getElementById('conexoes-modo-selecao').getAttribute('aria-pressed'),
            'true',
        );
        assert.match(contagem(), /Nada selecionado/);
    });

    it('marcar libera "Só selecionados", conta e já escolhe o escopo', () => {
        tela.alternarModoSelecaoConexoes();
        marcar(caixas()[0]);
        assert.equal(opcao().disabled, false);
        assert.equal(opcao().textContent, 'Só selecionados (1)');
        assert.equal(escopo().value, 'selecao');
        assert.equal(contagem(), '1 item selecionado');
        marcar(caixas()[1]);
        assert.equal(contagem(), '2 itens selecionados');
    });

    it('marcar destaca o cartão e desmarcar tira o destaque', () => {
        tela.alternarModoSelecaoConexoes();
        const caixa = caixas()[2];
        marcar(caixa);
        const card = caixa.closest('[data-card-selecao]');
        assert.ok(card.classList.contains('ring-2'));
        marcar(caixa, false);
        assert.ok(!card.classList.contains('ring-2'));
    });

    it('desmarcar o último volta o escopo para "tudo" e esconde a opção', () => {
        tela.alternarModoSelecaoConexoes();
        marcar(caixas()[0]);
        marcar(caixas()[0], false);
        assert.equal(escopo().value, 'tudo');
        assert.equal(opcao().disabled, true);
    });

    it('a marcação sobrevive ao redesenho da aba', () => {
        tela.alternarModoSelecaoConexoes();
        marcar(caixas()[1]);
        const chave = caixas()[1].dataset.chave;
        tela.renderConexoes();
        const de_novo = caixas().find((c) => c.dataset.chave === chave);
        assert.equal(de_novo.checked, true);
        assert.ok(de_novo.closest('[data-card-selecao]').classList.contains('ring-2'));
        assert.equal(contagem(), '1 item selecionado');
    });

    it('item que deixou de existir sai da seleção no redesenho', () => {
        tela.alternarModoSelecaoConexoes();
        const buracoCaixa = caixas().find((c) => c.dataset.chave.startsWith('b:'));
        marcar(buracoCaixa);
        db.poemas = db.poemas.filter((p) => p.id !== 3); // some o poema que originava o buraco
        tela.renderConexoes();
        assert.equal(contagem(), 'Nada selecionado. Marque as caixinhas dos cartões.');
        assert.equal(escopo().value, 'tudo');
    });

    it('"Marcar todos" marca tudo e "Limpar" desmarca', () => {
        tela.alternarModoSelecaoConexoes();
        tela.marcarTodosConexoes();
        assert.equal(caixas().filter((c) => c.checked).length, 4);
        assert.equal(escopo().value, 'selecao');
        tela.limparSelecaoConexoes();
        assert.equal(caixas().filter((c) => c.checked).length, 0);
        assert.equal(escopo().value, 'tudo');
    });

    it('desligar o modo limpa a seleção e some com as caixinhas', () => {
        tela.alternarModoSelecaoConexoes();
        marcar(caixas()[0]);
        tela.alternarModoSelecaoConexoes();
        assert.equal(caixas().length, 0);
        assert.equal(escopo().value, 'tudo');
        tela.alternarModoSelecaoConexoes();
        assert.match(contagem(), /Nada selecionado/);
    });

    it('caixinha sem chave não faz nada', () => {
        assert.doesNotThrow(() => tela.toggleSelecaoConexao({ dataset: {}, checked: true }));
    });
});

describe('baixar a seleção (botão da aba)', () => {
    const guardado = {};
    let baixado;
    let aviso;

    beforeEach(() => {
        montarAcervo();
        tela.renderConexoes();
        if (!caixas().length) tela.alternarModoSelecaoConexoes();
        tela.limparSelecaoConexoes();
        baixado = null;
        aviso = null;
        guardado.createObjectURL = URL.createObjectURL;
        guardado.revokeObjectURL = URL.revokeObjectURL;
        guardado.alert = globalThis.alert;
        URL.createObjectURL = (blob) => {
            baixado = { blob };
            return 'blob:teste';
        };
        URL.revokeObjectURL = () => {};
        globalThis.alert = (m) => {
            aviso = m;
        };
        const original = document.createElement;
        guardado.createElement = original;
        document.createElement = (tag, ...r) => {
            const el = original(tag, ...r);
            if (String(tag).toLowerCase() === 'a') {
                el.click = function () {
                    baixado.nome = this.download;
                };
            }
            return el;
        };
    });

    it('baixa só o que foi marcado, em conexoes-selecao.md', async () => {
        const chaveBuracoCaixa = caixas().find((c) => c.dataset.chave.startsWith('b:'));
        const chaveEco = caixas().find((c) => c.dataset.chave.startsWith('c:'));
        marcar(chaveBuracoCaixa);
        marcar(chaveEco);
        assert.equal(escopo().value, 'selecao');
        tela.baixarConexoes();
        assert.equal(baixado.nome, 'conexoes-selecao.md');
        const md = await baixado.blob.text();
        assert.match(md, /^# Conexões: seleção\n\n1 buraco; 1 Eco em 1 cadeia e 0 grafos\./);
        assert.ok(md.includes('## Buracos') && md.includes('## Ecos'));
        assert.ok(!md.includes('## Elos'));
        assert.match(md, /- C \(Reescrita de\) → D\./);
        assert.match(md, /E → \(Tema\) F/);
        document.createElement = guardado.createElement;
    });

    it('escopo "selecao" sem nada marcado avisa e não baixa', () => {
        escopo().value = 'selecao'; // o select ainda tem a opção, só desabilitada
        tela.baixarConexoes();
        assert.equal(baixado, null);
        assert.match(aviso, /Marque ao menos um item/);
        document.createElement = guardado.createElement;
    });
});
