import './helpers/localstorage-shim.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mesmo padrão de colunas.test.js: colunas-contagem.js só usa
// localStorage e window.dispatchEvent/CustomEvent, sem tocar em
// document — montamos um "window" próprio que registra os eventos
// disparados, pra poder checar que as mudanças avisam quem escuta.
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
    OPERADORES_CONTAGEM,
    getColunasContagem,
    adicionarColunaContagem,
    removerColunaContagem,
    definirCampoColunaContagem,
    definirOperadorColunaContagem,
    definirValorColunaContagem,
    bateFiltroContagem,
    itemBateFiltrosContagem,
    registroContavel,
    renderOpcoesCampoContagem,
    renderSeletorColunasContagem,
} = await import('../js/colunas-contagem.js');
const { CAMPOS_CONTAVEIS } = await import('../js/utils.js');
const { CAMPOS_CONTAVEIS_RIMA, camposContaveisEco, construirCamposContaveisSonoridade } =
    await import('../js/editor-sonoridade.js');
// colunas-contagem.js lê db.escansoes pra montar o registro dinâmico de
// Eco (ver camposContaveisEco/tiposEcoPresentes em editor-sonoridade.js)
// — importa o mesmo `db` singleton pra poder popular escansoes com um
// tipo de Eco personalizado nos testes que cobrem esse caso.
const { db } = await import('../js/db.js');

const LS_PREFIX = 'arquivoPoetico_colunasContagem_';

function resetar() {
    localStorage.clear();
    window._eventos = [];
    // `db` é o singleton de verdade (ver import acima) — zera escansoes a
    // cada teste pra um tipo de Eco personalizado criado num teste não
    // vazar pro registro dinâmico (camposContaveisEco) de outro.
    db.escansoes = [];
}

// ─── bateFiltroContagem (comparador puro) ─────────────────────────

describe('bateFiltroContagem', () => {
    beforeEach(resetar);

    it('sem operador ou sem valor, não filtra (sempre true)', () => {
        assert.equal(bateFiltroContagem(3, '', ''), true);
        assert.equal(bateFiltroContagem(3, '', '2'), true);
        assert.equal(bateFiltroContagem(3, '>=', ''), true);
        assert.equal(bateFiltroContagem(3, '>=', null), true);
        assert.equal(bateFiltroContagem(3, '>=', undefined), true);
    });

    it('valor não-numérico não filtra (sempre true)', () => {
        assert.equal(bateFiltroContagem(3, '>=', 'abc'), true);
    });

    it('cada operador compara corretamente', () => {
        assert.equal(bateFiltroContagem(2, '<', 3), true);
        assert.equal(bateFiltroContagem(3, '<', 3), false);
        assert.equal(bateFiltroContagem(3, '<=', 3), true);
        assert.equal(bateFiltroContagem(4, '<=', 3), false);
        assert.equal(bateFiltroContagem(3, '=', 3), true);
        assert.equal(bateFiltroContagem(2, '=', 3), false);
        assert.equal(bateFiltroContagem(3, '>=', 3), true);
        assert.equal(bateFiltroContagem(2, '>=', 3), false);
        assert.equal(bateFiltroContagem(4, '>', 3), true);
        assert.equal(bateFiltroContagem(3, '>', 3), false);
    });

    it('aceita valor como string numérica (vem de input.value)', () => {
        assert.equal(bateFiltroContagem(5, '>=', '5'), true);
        assert.equal(bateFiltroContagem(4, '>=', '5'), false);
    });
});

// ─── Estado (getColunasContagem / adicionar / remover / definir*) ─

describe('estado das colunas de contagem', () => {
    beforeEach(resetar);

    it('nova coluna nasce sem filtro (operador e valor vazios)', () => {
        adicionarColunaContagem('poemas');
        const [coluna] = getColunasContagem('poemas');
        assert.equal(coluna.operador, '');
        assert.equal(coluna.valor, '');
    });

    it('definirOperadorColunaContagem só aceita operadores da lista fechada', () => {
        adicionarColunaContagem('poemas');
        const [coluna] = getColunasContagem('poemas');
        definirOperadorColunaContagem('poemas', coluna.id, '>=');
        assert.equal(getColunasContagem('poemas')[0].operador, '>=');

        definirOperadorColunaContagem('poemas', coluna.id, 'operador-invalido');
        assert.equal(
            getColunasContagem('poemas')[0].operador,
            '>=',
            'operador inválido não deve sobrescrever o valor válido anterior',
        );
    });

    it('definirValorColunaContagem guarda o valor cru do input', () => {
        adicionarColunaContagem('poemas');
        const [coluna] = getColunasContagem('poemas');
        definirValorColunaContagem('poemas', coluna.id, '2');
        assert.equal(getColunasContagem('poemas')[0].valor, '2');
    });

    it('estado salvo ANTES desta feature (sem operador/valor) recebe os defaults ao ler', () => {
        // Simula uma coluna de contagem criada por uma versão anterior do
        // app, persistida sem os campos novos — lerEstado (via
        // getColunasContagem) deve preencher operador/valor com ''.
        localStorage.setItem(LS_PREFIX + 'poemas', JSON.stringify([{ id: 1, campo: 'pessoas' }]));
        const [coluna] = getColunasContagem('poemas');
        assert.equal(coluna.operador, '');
        assert.equal(coluna.valor, '');
    });

    it('removerColunaContagem tira a coluna e dispara o evento de alteração', () => {
        adicionarColunaContagem('poemas');
        const [coluna] = getColunasContagem('poemas');
        window._eventos = [];
        removerColunaContagem('poemas', coluna.id);
        assert.equal(getColunasContagem('poemas').length, 0);
        assert.equal(window._eventos.length, 1);
        assert.equal(window._eventos[0].type, 'colunas-contagem:alteradas');
    });

    it('OPERADORES_CONTAGEM começa com a opção vazia ("sem filtro")', () => {
        assert.equal(OPERADORES_CONTAGEM[0].value, '');
    });
});

// ─── itemBateFiltrosContagem (aplicação no item, ver getListaVisivelPoemas) ─

describe('itemBateFiltrosContagem', () => {
    beforeEach(resetar);

    it('sem nenhuma coluna com filtro configurado, todo item bate', () => {
        adicionarColunaContagem('poemas'); // sem operador/valor
        const item = { pessoas: [{ pessoaId: 1, papeis: [] }] };
        assert.equal(itemBateFiltrosContagem(item, 'poemas', {}), true);
    });

    it('filtra pela contagem do campo configurado (ex.: Qtd. Pessoas >= 2)', () => {
        adicionarColunaContagem('poemas');
        const [coluna] = getColunasContagem('poemas');
        definirCampoColunaContagem('poemas', coluna.id, 'pessoas');
        definirOperadorColunaContagem('poemas', coluna.id, '>=');
        definirValorColunaContagem('poemas', coluna.id, '2');

        const comDuas = {
            pessoas: [
                { pessoaId: 1, papeis: [] },
                { pessoaId: 2, papeis: [] },
            ],
        };
        const comUma = { pessoas: [{ pessoaId: 1, papeis: [] }] };

        assert.equal(itemBateFiltrosContagem(comDuas, 'poemas', {}), true);
        assert.equal(itemBateFiltrosContagem(comUma, 'poemas', {}), false);
    });

    it('combina múltiplas colunas de contagem com filtro como E (precisa bater em todas)', () => {
        adicionarColunaContagem('poemas');
        adicionarColunaContagem('poemas');
        const [c1, c2] = getColunasContagem('poemas');
        definirCampoColunaContagem('poemas', c1.id, 'pessoas');
        definirOperadorColunaContagem('poemas', c1.id, '>=');
        definirValorColunaContagem('poemas', c1.id, '1');
        definirCampoColunaContagem('poemas', c2.id, 'elos');
        definirOperadorColunaContagem('poemas', c2.id, '=');
        definirValorColunaContagem('poemas', c2.id, '0');

        const bateOsDois = { pessoas: [{ pessoaId: 1, papeis: [] }], conceitos: { elos: [] } };
        const bateSoUm = {
            pessoas: [{ pessoaId: 1, papeis: [] }],
            conceitos: { elos: [{ relacao: 'x' }] },
        };

        assert.equal(itemBateFiltrosContagem(bateOsDois, 'poemas', {}), true);
        assert.equal(itemBateFiltrosContagem(bateSoUm, 'poemas', {}), false);
    });
});

// ─── registroContavel (registro por tabela, ver comentário de topo) ─

describe('registroContavel', () => {
    it("'poemas' e 'prosas' caem no registro compartilhado CAMPOS_CONTAVEIS", () => {
        assert.equal(registroContavel('poemas'), CAMPOS_CONTAVEIS);
        assert.equal(registroContavel('prosas'), CAMPOS_CONTAVEIS);
    });

    it("'sonoridade' devolve o registro COMBINADO Rima+Eco (mesmas chaves de construirCamposContaveisSonoridade)", () => {
        const registro = registroContavel('sonoridade');
        const esperado = construirCamposContaveisSonoridade(db.escansoes);
        assert.deepEqual(Object.keys(registro).sort(), Object.keys(esperado).sort());
        assert.ok(registro.rimasTotal);
        assert.ok(registro.ecosTotal);
    });

    it("'sonoridade' reflete tipo de Eco personalizado já presente em db.escansoes (bug relatado pelo Victor)", () => {
        db.escansoes = [{ ecos: [{ tipo: 'Eco disperso' }] }];
        const registro = registroContavel('sonoridade');
        const chave = Object.keys(registro).find((k) => registro[k].label === 'Ecos Eco disperso');
        assert.ok(chave, 'tipo personalizado deveria aparecer no registro de Sonoridade');
    });

    it("adicionarColunaContagem('sonoridade') sem família usa o primeiro campo de Rima como padrão", () => {
        adicionarColunaContagem('sonoridade');
        const [coluna] = getColunasContagem('sonoridade');
        assert.equal(coluna.campo, Object.keys(CAMPOS_CONTAVEIS_RIMA)[0]);
    });

    it("adicionarColunaContagem('sonoridade', 'eco') usa o primeiro campo de Eco como padrão", () => {
        localStorage.clear();
        adicionarColunaContagem('sonoridade', 'eco');
        const [coluna] = getColunasContagem('sonoridade');
        assert.equal(coluna.campo, Object.keys(camposContaveisEco(db.escansoes))[0]);
    });

    it('adicionarColunaContagem usa o primeiro campo do registro daquela tabela como padrão (Poemas/Prosas)', () => {
        adicionarColunaContagem('poemas');
        const [coluna] = getColunasContagem('poemas');
        assert.equal(coluna.campo, Object.keys(CAMPOS_CONTAVEIS)[0]);
    });

    it('definirCampoColunaContagem valida o campo contra o registro certo da tabela — aceita tanto Rima quanto Eco em Sonoridade', () => {
        adicionarColunaContagem('sonoridade');
        const [coluna] = getColunasContagem('sonoridade');
        definirCampoColunaContagem('sonoridade', coluna.id, 'rimasExternas');
        assert.equal(getColunasContagem('sonoridade')[0].campo, 'rimasExternas');

        // Trocar pra um campo de Eco também é válido — os dois selects
        // escrevem no mesmo estado, só a apresentação é separada.
        definirCampoColunaContagem('sonoridade', coluna.id, 'ecosTotal');
        assert.equal(getColunasContagem('sonoridade')[0].campo, 'ecosTotal');

        // 'pessoas' é campo de Poemas/Prosas, não existe no registro de
        // Sonoridade — não deve sobrescrever o campo válido anterior.
        definirCampoColunaContagem('sonoridade', coluna.id, 'pessoas');
        assert.equal(getColunasContagem('sonoridade')[0].campo, 'ecosTotal');
    });

    it('estado salvo de uma tabela não vaza pra outra ao filtrar por campos válidos', () => {
        // Uma coluna salva antes com um campo que só existe em Poemas não
        // deveria "sobreviver" à leitura se a tabela associada virasse
        // sonoridade por engano — lerEstado (via getColunasContagem) filtra
        // pelo registro da própria tabela.
        localStorage.setItem(
            LS_PREFIX + 'sonoridade',
            JSON.stringify([{ id: 1, campo: 'pessoas' }]),
        );
        assert.equal(getColunasContagem('sonoridade').length, 0);
    });
});

// ─── renderOpcoesCampoContagem (<option>s do seletor, com/sem <optgroup>) ─
// Em Sonoridade, isto monta o <select> de UMA família só (a que contém o
// campo já escolhido) — nunca as duas juntas, pra cada um dos dois
// blocos (Rima/Eco, ver renderSeletorColunasContagem mais abaixo) ficar
// pequeno em vez de um select gigante combinando os ~18+7 campos.

describe('renderOpcoesCampoContagem', () => {
    it('Poemas/Prosas (sem `grupo` em nenhum campo) rendem lista achatada, sem <optgroup>', () => {
        const html = renderOpcoesCampoContagem('poemas', '');
        assert.doesNotMatch(html, /<optgroup/);
        Object.keys(CAMPOS_CONTAVEIS).forEach((chave) => {
            assert.match(html, new RegExp(`value="${chave}"`));
        });
    });

    it('Sonoridade com um campo de Rima escolhido: só as opções de Rima, agrupadas em <optgroup> por subgrupo', () => {
        const html = renderOpcoesCampoContagem('sonoridade', 'rimasTotal');
        assert.match(html, /<optgroup label="Geral">/);
        assert.match(html, /<optgroup label="Posição">/);
        assert.match(html, /<optgroup label="Proximidade">/);
        assert.match(html, /<optgroup label="Acentuação">/);
        assert.match(html, /<optgroup label="Tonalidade">/);
        assert.match(html, /<optgroup label="Riqueza">/);
        Object.keys(CAMPOS_CONTAVEIS_RIMA).forEach((chave) => {
            assert.match(html, new RegExp(`value="${chave}"`));
        });
        // Nenhuma opção de Eco deve vazar pro select de Rima.
        Object.keys(camposContaveisEco(db.escansoes)).forEach((chave) => {
            assert.doesNotMatch(html, new RegExp(`value="${chave}"`));
        });
    });

    it('Sonoridade com um campo de Eco escolhido: só as opções de Eco, lista achatada (sem <optgroup>)', () => {
        const html = renderOpcoesCampoContagem('sonoridade', 'ecosTotal');
        assert.doesNotMatch(html, /<optgroup/);
        Object.keys(camposContaveisEco(db.escansoes)).forEach((chave) => {
            assert.match(html, new RegExp(`value="${chave}"`));
        });
        Object.keys(CAMPOS_CONTAVEIS_RIMA).forEach((chave) => {
            assert.doesNotMatch(html, new RegExp(`value="${chave}"`));
        });
    });

    it('sem campo escolhido (coluna nova), cai no select de Rima por padrão', () => {
        const html = renderOpcoesCampoContagem('sonoridade', '');
        assert.match(html, new RegExp(`value="${Object.keys(CAMPOS_CONTAVEIS_RIMA)[0]}"`));
    });

    it('marca `selected` na option do campo atualmente escolhido, tanto em Rima quanto em Eco', () => {
        const campoRima = Object.keys(CAMPOS_CONTAVEIS_RIMA)[0];
        assert.match(
            renderOpcoesCampoContagem('sonoridade', campoRima),
            new RegExp(`value="${campoRima}" selected`),
        );
        const campoEco = Object.keys(camposContaveisEco(db.escansoes))[0];
        assert.match(
            renderOpcoesCampoContagem('sonoridade', campoEco),
            new RegExp(`value="${campoEco}" selected`),
        );
    });

    it('um tipo de Eco personalizado em db.escansoes aparece como opção selecionável', () => {
        db.escansoes = [{ ecos: [{ tipo: 'Eco disperso' }] }];
        const chave = Object.keys(camposContaveisEco(db.escansoes)).find(
            (k) => camposContaveisEco(db.escansoes)[k].label === 'Ecos Eco disperso',
        );
        const html = renderOpcoesCampoContagem('sonoridade', chave);
        assert.match(html, new RegExp(`value="${chave}"`));
        assert.match(html, />Ecos Eco disperso</);
    });
});

// ─── renderSeletorColunasContagem('sonoridade') — dois blocos (Rima/Eco) ─

describe("renderSeletorColunasContagem('sonoridade')", () => {
    it('sem nenhuma coluna ativa, ainda renderiza os dois blocos com seus botões de adicionar', () => {
        const html = renderSeletorColunasContagem('sonoridade');
        assert.match(html, /Colunas de contagem — Rimas/);
        assert.match(html, /Colunas de contagem — Ecos/);
        assert.match(html, /adicionarColunaContagem\('sonoridade', 'rima'\)/);
        assert.match(html, /adicionarColunaContagem\('sonoridade', 'eco'\)/);
    });

    it('uma coluna de Rima ativa aparece só no bloco de Rima, e uma de Eco só no bloco de Eco', () => {
        adicionarColunaContagem('sonoridade'); // Rima (padrão)
        adicionarColunaContagem('sonoridade', 'eco');
        const [colRima, colEco] = getColunasContagem('sonoridade');

        const html = renderSeletorColunasContagem('sonoridade');
        const blocoRima = html.slice(0, html.indexOf('Colunas de contagem — Ecos'));
        const blocoEco = html.slice(html.indexOf('Colunas de contagem — Ecos'));

        assert.match(
            blocoRima,
            new RegExp(`definirCampoColunaContagem\\('sonoridade', ${colRima.id}`),
        );
        assert.doesNotMatch(
            blocoRima,
            new RegExp(`definirCampoColunaContagem\\('sonoridade', ${colEco.id}`),
        );
        assert.match(
            blocoEco,
            new RegExp(`definirCampoColunaContagem\\('sonoridade', ${colEco.id}`),
        );
        assert.doesNotMatch(
            blocoEco,
            new RegExp(`definirCampoColunaContagem\\('sonoridade', ${colRima.id}`),
        );
    });

    it('Poemas/Prosas continuam com um bloco só (não têm família Rima/Eco)', () => {
        const html = renderSeletorColunasContagem('poemas');
        assert.doesNotMatch(html, /Colunas de contagem — Rimas/);
        assert.match(html, /Colunas de contagem(?!\s*—)/);
        assert.match(html, /adicionarColunaContagem\('poemas'\)/);
    });
});
