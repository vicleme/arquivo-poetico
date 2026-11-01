import './helpers/dom-real.js';

import fs from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// "Autor em sigilo", entrega 3c-2: coluna e ordenação, busca `autoremsigilo:`,
// edição em massa (Preencher campo), Importar campos e as saídas (.md, Ver,
// .csv e .json).
const { db } = await import('../js/db.js');
const { DEFINICAO_COLUNAS, toggleColuna, resetarColunas } = await import('../js/colunas.js');
const { celulaAutorEmSigilo, montarCabecalho } = await import('../js/celulas-tabela.js');
const { filtrarTextos, PREFIXOS_CANONICOS_POR_CAMPO } = await import('../js/utils.js');
const { decorarCamposBusca, buscarPorPrefixo } = await import('../js/render-listas.js');
const { PREFIXOS_SO_ASTERISCO_TEXTO } = await import('../js/sugestoes-busca-texto.js');
const {
    obterCampoPreenchivel,
    planejarPreenchimento,
    aplicarPreenchimento,
    planejarLimpeza,
    aplicarLimpeza,
} = await import('../js/campos-preenchiveis.js');
const { lerExtrasDaEntrada, aplicarCamposSimples } =
    await import('../js/importar-campos-extras.js');
const { ehAutorEmSigilo } = await import('../js/autor-em-sigilo.js');
const { montarRegistro } = await import('../js/exportar.js');
const { gerarCsvTextos } = await import('../js/exportar-csv.js');
const { gerarMarkdownItem } = await import('../js/exportar-md.js');
const { renderVisualizacaoHtml } = await import('../js/visualizar.js');

const ler = (rel) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');

describe('coluna Autor em sigilo', () => {
    it('existe em Poemas e em Prosas, escondida por padrão, ordenável como número', () => {
        for (const tabela of ['poemas', 'prosas']) {
            const def = DEFINICAO_COLUNAS[tabela].find((c) => c.key === 'autorEmSigilo');
            assert.ok(def, `${tabela} sem a coluna`);
            assert.equal(def.default, false);
            assert.equal(def.sortType, 'numero');
            assert.equal(def.label, 'Autor em sigilo');
        }
    });
    it('a célula mostra "Sim" só nos marcados', () => {
        assert.match(celulaAutorEmSigilo({ autorEmSigilo: true }), /Sim/);
        assert.doesNotMatch(celulaAutorEmSigilo({ autorEmSigilo: false }), /Sim/);
        assert.doesNotMatch(celulaAutorEmSigilo({}), /Sim/);
    });
    for (const tabela of ['poemas', 'prosas']) {
        it(`${tabela}: ligada, a coluna mostra a lupa de autoremsigilo:`, () => {
            resetarColunas(tabela);
            toggleColuna(tabela, 'autorEmSigilo', true);
            const html = montarCabecalho(tabela, '', '');
            assert.ok(html.includes("buscarPorPrefixo('" + tabela + "', '_buscaAutorEmSigilo')"));
            assert.ok(html.includes('Buscar por autoremsigilo:'));
            resetarColunas(tabela);
        });
    }
});

describe('busca autoremsigilo:', () => {
    const itens = () => {
        db.poemas = [
            { id: 1, titulo: 'A', autorEmSigilo: true },
            { id: 2, titulo: 'B' },
            { id: 3, titulo: 'C', autorEmSigilo: false },
            { id: 4, titulo: 'D', autorEmSigilo: true },
        ];
        return db.poemas.map((p) => decorarCamposBusca(p, '', 'poema'));
    };
    const ids = (lista) => lista.map((i) => i.id);

    it('`autoremsigilo:*` acha os marcados e `-autoremsigilo:*` os demais', () => {
        const lista = itens();
        assert.deepEqual(ids(filtrarTextos(lista, 'autoremsigilo:*')), [1, 4]);
        assert.deepEqual(ids(filtrarTextos(lista, '-autoremsigilo:*')), [2, 3]);
    });
    it('o prefixo é canônico e vale só com `*`', () => {
        assert.ok(Object.values(PREFIXOS_CANONICOS_POR_CAMPO).includes('autoremsigilo'));
        assert.ok(PREFIXOS_SO_ASTERISCO_TEXTO.includes('autoremsigilo'));
    });
    it('o clique na lupa já escreve o asterisco', () => {
        const input = document.createElement('input');
        input.id = 'busca-poemas';
        document.body.appendChild(input);
        buscarPorPrefixo('poemas', '_buscaAutorEmSigilo');
        assert.equal(input.value, 'autoremsigilo:*');
        input.remove();
    });
});

describe('Preencher campo em massa', () => {
    const campo = obterCampoPreenchivel('autorEmSigilo');
    const itens = () => [
        { id: 1, autorEmSigilo: true },
        { id: 2 },
        { id: 3, autorEmSigilo: false },
    ];

    it('o campo é booleano e não é só de importação', () => {
        assert.equal(campo.tipo, 'booleano');
        assert.ok(!campo.soImportacao);
        assert.equal(campo.rotulo, 'Autor em sigilo');
    });
    it('marcar muda só quem não estava marcado', () => {
        const lista = itens();
        const p = planejarPreenchimento(lista, campo, true);
        assert.deepEqual(
            p.alterar.map((i) => i.id),
            [2, 3],
        );
        assert.equal(p.jaIguais, 1);
        aplicarPreenchimento(p.alterar, campo, true);
        assert.ok(lista.every(ehAutorEmSigilo));
    });
    it('desmarcar grava false e pula quem já não estava marcado', () => {
        const lista = itens();
        const p = planejarPreenchimento(lista, campo, false);
        assert.deepEqual(
            p.alterar.map((i) => i.id),
            [1],
        );
        aplicarPreenchimento(p.alterar, campo, false);
        assert.equal(lista[0].autorEmSigilo, false);
    });
    it('Limpar campo desmarca os marcados', () => {
        const lista = itens();
        const { alterar, jaVazios } = planejarLimpeza(lista, campo);
        assert.equal(alterar.length, 1);
        assert.equal(jaVazios, 2);
        aplicarLimpeza(alterar, campo);
        assert.ok(!lista.some(ehAutorEmSigilo));
    });
});

describe('Importar campos', () => {
    const simples = (bruta) => {
        const problemas = [];
        const e = lerExtrasDaEntrada(bruta, problemas);
        return { simples: e.simples, problemas };
    };
    it('`autorEmSigilo` verdadeiro vira campo simples; falso e vazio são ignorados', () => {
        for (const v of [true, 'sim', 'true']) {
            assert.deepEqual(simples({ titulo: 'a', autorEmSigilo: v }).simples, [
                { chave: 'autorEmSigilo', valor: true },
            ]);
        }
        for (const v of [false, 'não', '', null]) {
            const r = simples({ titulo: 'a', autorEmSigilo: v });
            assert.deepEqual(r.simples, []);
            assert.deepEqual(r.problemas, []);
        }
    });
    it('valor que não é sim ou não vai para o relatório', () => {
        const r = simples({ titulo: 'a', autorEmSigilo: 'talvez' });
        assert.deepEqual(r.simples, []);
        assert.equal(r.problemas[0].campo, 'autorEmSigilo');
    });
    it('aplicar liga o sigilo, relata e nunca desliga (nem com `false` no arquivo)', () => {
        const item = { id: 1 };
        const rel = { camposSimples: [] };
        aplicarCamposSimples(item, [{ chave: 'autorEmSigilo', valor: true }], rel);
        assert.equal(ehAutorEmSigilo(item), true);
        assert.equal(rel.camposSimples[0].acao, 'preenchido');
        const rel2 = { camposSimples: [] };
        aplicarCamposSimples(item, [{ chave: 'autorEmSigilo', valor: true }], rel2);
        assert.equal(rel2.camposSimples[0].acao, 'igual');
        const marcado = { id: 2, autorEmSigilo: true };
        const lido = simples({ titulo: 'b', autorEmSigilo: false }).simples;
        aplicarCamposSimples(marcado, lido, { camposSimples: [] });
        assert.equal(ehAutorEmSigilo(marcado), true);
    });
});

describe('saídas: .md, Ver, .csv e .json', () => {
    db.livros = [];
    db.partes = [];
    db.secoes = [];
    db.autores = [];
    db.itensColetanea = [];
    const poema = (extra = {}) => ({
        id: 1,
        titulo: 'Teste',
        texto: 'verso',
        status: 'publicado',
        ...extra,
    });

    it('.md e Ver mostram "Autor em sigilo: Sim" só nos marcados', () => {
        const marcado = montarRegistro('poema', poema({ autorEmSigilo: true }));
        assert.match(gerarMarkdownItem(marcado), /### Autor em sigilo\n\nSim/);
        assert.match(renderVisualizacaoHtml(marcado), /Autor em sigilo/);
        for (const extra of [{}, { autorEmSigilo: false }]) {
            const reg = montarRegistro('poema', poema(extra));
            assert.doesNotMatch(gerarMarkdownItem(reg), /Autor em sigilo/);
            assert.doesNotMatch(renderVisualizacaoHtml(reg), /Autor em sigilo/);
        }
    });
    it('.csv: coluna autor_em_sigilo ("sim" ou vazio), depois de sorteavel', () => {
        const todos = [
            poema({ id: 1, autorEmSigilo: true }),
            poema({ id: 2 }),
            poema({ id: 3, autorEmSigilo: false }),
        ];
        db.poemas = todos;
        db.prosas = [];
        const csv = gerarCsvTextos(
            'poema',
            todos.map((p) => montarRegistro('poema', p)),
            db,
        );
        const limpo = csv.charCodeAt(0) === 0xfeff ? csv.slice(1) : csv;
        const [cab, ...linhas] = limpo.trim().split(/\r?\n/);
        const cols = cab.split(',');
        const i = cols.indexOf('autor_em_sigilo');
        assert.ok(i >= 0, 'coluna ausente');
        assert.equal(i, cols.indexOf('sorteavel') + 1);
        assert.deepEqual(
            linhas.map((l) => l.split(',')[i]),
            ['sim', '', ''],
        );
    });
    it('.json: o registro leva o campo (spread do item)', () => {
        assert.equal(montarRegistro('poema', poema({ autorEmSigilo: true })).autorEmSigilo, true);
        assert.equal(montarRegistro('poema', poema()).autorEmSigilo, undefined);
    });
    it('o pacote da Biblioteca não leva o campo e os docs para IAs o descrevem', () => {
        assert.doesNotMatch(ler('../js/pacote-texto.js'), /autorEmSigilo/);
        for (const arq of [
            '../docs/campos-poema-prosa-for-ai.md',
            '../docs/campos-poema-prosa-for-ai-pt-br.md',
            '../docs/importar-campos-for-ai.md',
            '../docs/importar-campos-for-ai-pt-br.md',
        ]) {
            assert.match(ler(arq), /`autorEmSigilo`/, arq);
        }
    });
});
