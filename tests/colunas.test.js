import './helpers/localstorage-shim.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// colunas.js não importa nada (nem document): só usa localStorage e
// window.dispatchEvent/CustomEvent. Montamos aqui um "window" próprio
// que REGISTRA os eventos disparados (ao contrário do dom-shim.js
// genérico, cujo dispatchEvent é um no-op) — precisamos disso pra
// testar que toggleColuna/moverColuna avisam quem estiver ouvindo.
globalThis.window = {
    _eventos: [],
    dispatchEvent(e) {
        this._eventos.push(e);
    },
    addEventListener() {},
    removeEventListener() {},
};
globalThis.CustomEvent = class CustomEvent {
    constructor(type, opts) {
        this.type = type;
        Object.assign(this, opts);
    }
};

const {
    DEFINICAO_COLUNAS,
    getColunasAtivas,
    isColunaAtiva,
    toggleColuna,
    moverColuna,
    resetarColunas,
    listarPadroesColunas,
    salvarPadraoColunas,
    aplicarPadraoColunas,
    excluirPadraoColunas,
    padraoAtivoColunas,
    renderSeletorColunas,
} = await import('../js/colunas.js');

// Mesmo prefixo usado internamente em colunas.js (LS_PREFIX, não
// exportado) — duplicado aqui de propósito pra poder inspecionar e
// pré-popular o localStorage diretamente nos testes.
const LS_PREFIX = 'arquivoPoetico_colunas_';

function resetar() {
    localStorage.clear();
    window._eventos = [];
}

function salvarEstado(tabela, ordem, ativas) {
    localStorage.setItem(LS_PREFIX + tabela, JSON.stringify({ ordem, ativas }));
}

// ─── DEFINICAO_COLUNAS ───────────────────────────────────────────

describe('DEFINICAO_COLUNAS', () => {
    it('cada coluna definida tem key, label e default, e as keys não se repetem dentro da mesma tabela', () => {
        for (const [tabela, colunas] of Object.entries(DEFINICAO_COLUNAS)) {
            const keys = colunas.map((c) => c.key);
            assert.equal(new Set(keys).size, keys.length, `keys duplicadas em "${tabela}"`);
            colunas.forEach((c) => {
                assert.equal(typeof c.key, 'string');
                assert.equal(typeof c.label, 'string');
                assert.equal(typeof c.default, 'boolean');
            });
        }
    });
});

// ─── getColunasAtivas / isColunaAtiva ────────────────────────────

describe('getColunasAtivas (sem nada salvo ainda — estado padrão)', () => {
    beforeEach(resetar);

    it('tabela desconhecida retorna lista vazia, sem quebrar', () => {
        assert.deepEqual(getColunasAtivas('tabela-que-nao-existe'), []);
    });

    it(
        'sem nada no localStorage, retorna só as colunas com default:true, ' +
            'na mesma ordem em que estão definidas',
        () => {
            assert.deepEqual(getColunasAtivas('poemas'), [
                'estrutura',
                'dataEscrita',
                'dataPublicacao',
                'status',
            ]);
            assert.deepEqual(getColunasAtivas('prosas'), [
                'vinculo',
                'genero',
                'dataEscrita',
                'dataPublicacao',
                'status',
            ]);
        },
    );
});

describe('getColunasAtivas (com estado salvo no localStorage)', () => {
    beforeEach(resetar);

    it('respeita a ordem e o subconjunto ativo salvos', () => {
        salvarEstado(
            'poemas',
            [
                'status',
                'dataEscrita',
                'dataPublicacao',
                'estrutura',
                'elos',
                'referencias',
                'etiquetas',
                'notas',
            ],
            ['dataEscrita', 'elos'],
        );
        assert.deepEqual(getColunasAtivas('poemas'), ['dataEscrita', 'elos']);
    });

    it('JSON corrompido no localStorage cai pro padrão, sem quebrar', () => {
        localStorage.setItem(LS_PREFIX + 'poemas', '{ isso não é json válido');
        assert.deepEqual(getColunasAtivas('poemas'), [
            'estrutura',
            'dataEscrita',
            'dataPublicacao',
            'status',
        ]);
    });

    it('JSON válido mas em formato inesperado (sem ordem/ativas como arrays) cai pro padrão', () => {
        localStorage.setItem(LS_PREFIX + 'poemas', JSON.stringify({ outraCoisa: true }));
        assert.deepEqual(getColunasAtivas('poemas'), [
            'estrutura',
            'dataEscrita',
            'dataPublicacao',
            'status',
        ]);
    });

    it('keys salvas que não existem mais em DEFINICAO_COLUNAS são descartadas (não quebram nem aparecem)', () => {
        salvarEstado(
            'poemas',
            ['dataEscrita', 'colunaAntigaRemovida', 'status'],
            ['dataEscrita', 'colunaAntigaRemovida'],
        );
        assert.deepEqual(getColunasAtivas('poemas'), ['dataEscrita']);
    });

    it(
        'coluna nova, adicionada a DEFINICAO_COLUNAS depois que já existia uma escolha salva, ' +
            'entra no fim da ordem e começa desligada (migração automática)',
        () => {
            salvarEstado(
                'poemas',
                [
                    'status',
                    'dataEscrita',
                    'dataPublicacao',
                    'estrutura',
                    'elos',
                    'referencias',
                    'etiquetas',
                    'notas',
                ],
                ['status'],
            );

            DEFINICAO_COLUNAS.poemas.push({ key: 'colunaNova', label: 'Nova', default: false });
            try {
                assert.deepEqual(getColunasAtivas('poemas'), ['status']); // continua só "status" ativa
                // mas a coluna nova já existe na ordem interna — confirmamos
                // ativando-a e checando se aparece no fim
                toggleColuna('poemas', 'colunaNova', true);
                const ativas = getColunasAtivas('poemas');
                assert.equal(ativas[ativas.length - 1], 'colunaNova');
            } finally {
                DEFINICAO_COLUNAS.poemas.pop(); // desfaz a mutação pra não vazar pros outros testes
            }
        },
    );
});

describe('isColunaAtiva', () => {
    beforeEach(resetar);

    it('true pra coluna ativa, false pra inativa ou inexistente', () => {
        assert.equal(isColunaAtiva('poemas', 'status'), true); // default: true
        assert.equal(isColunaAtiva('poemas', 'elos'), false); // default: false
        assert.equal(isColunaAtiva('poemas', 'coluna-fantasma'), false);
    });
});

// ─── toggleColuna ─────────────────────────────────────────────────

describe('toggleColuna', () => {
    beforeEach(resetar);

    it('liga uma coluna desligada — ela passa a aparecer em getColunasAtivas', () => {
        assert.equal(isColunaAtiva('poemas', 'elos'), false);
        toggleColuna('poemas', 'elos', true);
        assert.equal(isColunaAtiva('poemas', 'elos'), true);
    });

    it('desliga uma coluna ligada — ela some de getColunasAtivas', () => {
        assert.equal(isColunaAtiva('poemas', 'status'), true);
        toggleColuna('poemas', 'status', false);
        assert.equal(isColunaAtiva('poemas', 'status'), false);
    });

    it('ligar uma coluna desligada põe ela depois das colunas ligadas de fábrica', () => {
        toggleColuna('poemas', 'elos', true);
        assert.deepEqual(getColunasAtivas('poemas'), [
            'estrutura',
            'dataEscrita',
            'dataPublicacao',
            'status',
            'elos',
        ]);
    });

    it('persiste a mudança — uma nova leitura (nova chamada) reflete o estado salvo', () => {
        toggleColuna('poemas', 'elos', true);
        // getColunasAtivas relê do localStorage a cada chamada; simula reabrir a página
        assert.equal(isColunaAtiva('poemas', 'elos'), true);
    });

    it('tabela desconhecida não quebra e não altera nada', () => {
        assert.doesNotThrow(() => toggleColuna('tabela-fantasma', 'x', true));
        assert.equal(localStorage.getItem(LS_PREFIX + 'tabela-fantasma'), null);
    });

    it('dispara o evento "colunas:alteradas" com a tabela certa no detail', () => {
        toggleColuna('prosas', 'etiquetas', true);
        assert.equal(window._eventos.length, 1);
        assert.equal(window._eventos[0].type, 'colunas:alteradas');
        assert.equal(window._eventos[0].detail.tabela, 'prosas');
    });

    it('tabela desconhecida NÃO dispara evento (retorna antes de chegar lá)', () => {
        toggleColuna('tabela-fantasma', 'x', true);
        assert.equal(window._eventos.length, 0);
    });
});

// ─── moverColuna ────────────────────────────────────────────────

describe('moverColuna', () => {
    beforeEach(resetar);

    it('"up" troca de posição com o vizinho anterior', () => {
        // ordem de fábrica (início): estrutura, dataEscrita, dataPublicacao, status, e depois as demais na ordem de definição (idioma, localEscrita, territorialidade, epocaRetratada...)
        moverColuna('poemas', 'notas', 'up');
        const estado = JSON.parse(localStorage.getItem(LS_PREFIX + 'poemas'));
        assert.deepEqual(estado.ordem.slice(0, 17), [
            'estrutura',
            'dataEscrita',
            'dataPublicacao',
            'status',
            'idioma',
            'localEscrita',
            'territorialidade',
            'epocaRetratada',
            'periodoHistoricoId',
            'movimentosEscolas',
            'posturaEstetica',
            'programa',
            'notas',
            'contextoHistorico',
            'autoria',
            'envios',
            'reconhecimentos',
        ]);
    });

    it('"down" troca de posição com o vizinho seguinte', () => {
        moverColuna('poemas', 'estrutura', 'down');
        const estado = JSON.parse(localStorage.getItem(LS_PREFIX + 'poemas'));
        assert.deepEqual(estado.ordem.slice(0, 2), ['dataEscrita', 'estrutura']);
    });

    it('mover a primeira coluna pra "up" não faz nada (já está no topo)', () => {
        moverColuna('poemas', 'estrutura', 'up');
        const estado = JSON.parse(localStorage.getItem(LS_PREFIX + 'poemas'));
        assert.equal(estado, null, 'nem chega a salvar, porque a posição-alvo é inválida');
    });

    it('mover a última coluna pra "down" não faz nada (já está no fim)', () => {
        moverColuna('poemas', 'contagemLinha', 'down');
        assert.equal(localStorage.getItem(LS_PREFIX + 'poemas'), null);
    });

    it('key inexistente não quebra e não salva nada', () => {
        assert.doesNotThrow(() => moverColuna('poemas', 'coluna-fantasma', 'up'));
        assert.equal(localStorage.getItem(LS_PREFIX + 'poemas'), null);
    });

    it('tabela desconhecida não quebra', () => {
        assert.doesNotThrow(() => moverColuna('tabela-fantasma', 'x', 'up'));
    });

    it('mexe só na ORDEM, não na lista de ativas — coluna continua no mesmo estado ligado/desligado', () => {
        assert.equal(isColunaAtiva('poemas', 'elos'), false);
        moverColuna('poemas', 'elos', 'up');
        assert.equal(isColunaAtiva('poemas', 'elos'), false, 'mover não liga a coluna');
        assert.equal(isColunaAtiva('poemas', 'status'), true, 'nem desliga as outras');
    });

    it('dispara o evento "colunas:alteradas" quando o movimento é válido', () => {
        moverColuna('poemas', 'dataEscrita', 'up');
        assert.equal(window._eventos.length, 1);
        assert.equal(window._eventos[0].detail.tabela, 'poemas');
    });

    it('NÃO dispara evento quando o movimento é inválido (limite, key/tabela inexistente)', () => {
        moverColuna('poemas', 'estrutura', 'up'); // já está no topo
        moverColuna('poemas', 'coluna-fantasma', 'up');
        moverColuna('tabela-fantasma', 'x', 'up');
        assert.equal(window._eventos.length, 0);
    });
});

// ─── resetarColunas ────────────────────────────────────────────────

describe('resetarColunas', () => {
    beforeEach(resetar);

    it('sem nada personalizado, não quebra e mantém o padrão', () => {
        resetarColunas('poemas');
        assert.deepEqual(getColunasAtivas('poemas'), [
            'estrutura',
            'dataEscrita',
            'dataPublicacao',
            'status',
        ]);
    });

    it('descarta reordenação e seleção personalizadas, voltando ao padrão de fábrica', () => {
        salvarEstado(
            'poemas',
            ['status', 'dataEscrita', 'dataPublicacao', 'estrutura', 'elos', 'referencias'],
            ['status', 'elos'],
        );
        resetarColunas('poemas');
        assert.deepEqual(getColunasAtivas('poemas'), [
            'estrutura',
            'dataEscrita',
            'dataPublicacao',
            'status',
        ]);
    });

    it('mexe só na tabela indicada, não na outra', () => {
        salvarEstado('prosas', ['dataEscrita', 'genero', 'vinculo'], ['genero']);
        resetarColunas('poemas');
        assert.deepEqual(getColunasAtivas('prosas'), ['genero']);
    });

    it('tabela desconhecida não quebra e não mexe em nada', () => {
        assert.doesNotThrow(() => resetarColunas('tabela-fantasma'));
    });

    it('dispara o evento "colunas:alteradas" com a tabela certa no detail', () => {
        resetarColunas('prosas');
        assert.equal(window._eventos.length, 1);
        assert.equal(window._eventos[0].type, 'colunas:alteradas');
        assert.equal(window._eventos[0].detail.tabela, 'prosas');
    });

    it('tabela desconhecida NÃO dispara evento', () => {
        resetarColunas('tabela-fantasma');
        assert.equal(window._eventos.length, 0);
    });
});

// ─── Rótulos e padrão de fábrica ───────────────────────────────────

describe('rótulos e ordem de fábrica de Poemas e Prosas', () => {
    beforeEach(resetar);

    it('as duas tabelas chamam as datas de "Data de escrita" e "Data de publicação"', () => {
        for (const t of ['poemas', 'prosas']) {
            const rot = (k) => DEFINICAO_COLUNAS[t].find((c) => c.key === k).label;
            assert.equal(rot('dataEscrita'), 'Data de escrita');
            assert.equal(rot('dataPublicacao'), 'Data de publicação');
        }
    });

    it('Pessoas não vem ligada por padrão', () => {
        for (const t of ['poemas', 'prosas']) {
            assert.equal(DEFINICAO_COLUNAS[t].find((c) => c.key === 'pessoas').default, false);
            assert.ok(!getColunasAtivas(t).includes('pessoas'));
        }
    });

    it('religar Pessoas num acervo sem nada salvo põe a coluna depois das ligadas, na ordem de definição', () => {
        toggleColuna('poemas', 'pessoas', true);
        const ativas = getColunasAtivas('poemas');
        assert.deepEqual(ativas.slice(0, 4), [
            'estrutura',
            'dataEscrita',
            'dataPublicacao',
            'status',
        ]);
        assert.equal(ativas.length, 5);
    });
});

// ─── Padrões personalizados ────────────────────────────────────────

describe('padrões personalizados de colunas', () => {
    beforeEach(resetar);

    it('sem nada salvo, a lista é vazia e nenhum padrão está ativo', () => {
        assert.deepEqual(listarPadroesColunas('poemas'), []);
        assert.equal(padraoAtivoColunas('poemas'), null);
    });

    it('salva as colunas ligadas, na ordem da tela, e aplica de volta depois de mexer', () => {
        toggleColuna('poemas', 'elos', true);
        moverColuna('poemas', 'elos', 'up');
        const antes = getColunasAtivas('poemas');
        const r = salvarPadraoColunas('poemas', 'Revisão');
        assert.deepEqual(r, { ok: true, nome: 'Revisão', substituiu: false });
        assert.deepEqual(listarPadroesColunas('poemas'), [{ nome: 'Revisão', colunas: antes }]);

        resetarColunas('poemas');
        assert.notDeepEqual(getColunasAtivas('poemas'), antes);
        assert.equal(aplicarPadraoColunas('poemas', 'Revisão'), true);
        assert.deepEqual(getColunasAtivas('poemas'), antes);
        assert.equal(padraoAtivoColunas('poemas'), 'Revisão');
    });

    it('aplicar mantém todas as colunas na lista (as desligadas ficam depois, ainda religáveis)', () => {
        salvarPadraoColunas('prosas', 'Enxuto');
        toggleColuna('prosas', 'genero', false);
        aplicarPadraoColunas('prosas', 'Enxuto');
        const todas = DEFINICAO_COLUNAS.prosas.map((c) => c.key).sort();
        const html = renderSeletorColunas('prosas');
        for (const k of todas) assert.ok(html.includes(`toggleColuna('prosas', '${k}'`), k);
    });

    it('mexer em qualquer coluna tira o "padrão ativo"', () => {
        salvarPadraoColunas('poemas', 'Base');
        assert.equal(padraoAtivoColunas('poemas'), 'Base');
        toggleColuna('poemas', 'notas', true);
        assert.equal(padraoAtivoColunas('poemas'), null);
        toggleColuna('poemas', 'notas', false);
        assert.equal(padraoAtivoColunas('poemas'), 'Base');
    });

    it('mesmo nome (sem diferenciar caixa nem espaços) substitui no mesmo lugar', () => {
        salvarPadraoColunas('poemas', 'A');
        salvarPadraoColunas('poemas', 'B');
        toggleColuna('poemas', 'notas', true);
        const r = salvarPadraoColunas('poemas', '  a ');
        assert.deepEqual(r, { ok: true, nome: 'a', substituiu: true });
        const lista = listarPadroesColunas('poemas');
        assert.deepEqual(
            lista.map((p) => p.nome),
            ['a', 'B'],
        );
        assert.ok(lista[0].colunas.includes('notas'));
    });

    it('nome vazio é recusado e não grava nada', () => {
        assert.deepEqual(salvarPadraoColunas('poemas', '   '), { ok: false, motivo: 'nome' });
        assert.deepEqual(listarPadroesColunas('poemas'), []);
    });

    it('nome longo é cortado em 40 caracteres', () => {
        const r = salvarPadraoColunas('poemas', 'x'.repeat(80));
        assert.equal(r.nome.length, 40);
    });

    it('cada tabela tem a sua lista', () => {
        salvarPadraoColunas('poemas', 'Só poemas');
        assert.deepEqual(listarPadroesColunas('prosas'), []);
        assert.equal(aplicarPadraoColunas('prosas', 'Só poemas'), false);
    });

    it('excluir tira só o padrão, sem mexer nas colunas da tela', () => {
        salvarPadraoColunas('poemas', 'Base');
        const antes = getColunasAtivas('poemas');
        assert.equal(excluirPadraoColunas('poemas', 'base'), true);
        assert.deepEqual(listarPadroesColunas('poemas'), []);
        assert.deepEqual(getColunasAtivas('poemas'), antes);
        assert.equal(excluirPadraoColunas('poemas', 'base'), false);
    });

    it('coluna que deixou de existir sai do padrão sem quebrar a aplicação', () => {
        localStorage.setItem(
            'arquivoPoetico_colunasPadroes_poemas',
            JSON.stringify([{ nome: 'Velho', colunas: ['status', 'colunaQueSumiu', 'estrutura'] }]),
        );
        assert.equal(aplicarPadraoColunas('poemas', 'Velho'), true);
        assert.deepEqual(getColunasAtivas('poemas'), ['status', 'estrutura']);
    });

    it('JSON corrompido na lista de padrões cai pra lista vazia', () => {
        localStorage.setItem('arquivoPoetico_colunasPadroes_poemas', '{ quebrado');
        assert.deepEqual(listarPadroesColunas('poemas'), []);
    });

    it('salvar, aplicar e excluir disparam "colunas:alteradas"; tabela desconhecida não', () => {
        salvarPadraoColunas('poemas', 'Base');
        aplicarPadraoColunas('poemas', 'Base');
        excluirPadraoColunas('poemas', 'Base');
        assert.deepEqual(
            window._eventos.map((e) => e.detail.tabela),
            ['poemas', 'poemas', 'poemas'],
        );
        window._eventos = [];
        assert.deepEqual(salvarPadraoColunas('fantasma', 'X'), { ok: false, motivo: 'tabela' });
        assert.equal(window._eventos.length, 0);
    });

    it('o painel mostra o seletor com o padrão em uso selecionado, escapando o nome', () => {
        assert.ok(renderSeletorColunas('poemas').includes('Nenhum padrão salvo'));
        salvarPadraoColunas('poemas', 'A <b>"x"</b>');
        const html = renderSeletorColunas('poemas');
        assert.ok(html.includes('&lt;b&gt;'));
        assert.ok(!html.includes('<b>"x"</b>'));
        assert.ok(html.includes('selected'));
        assert.ok(html.includes('Excluir padrão'));
    });
});
