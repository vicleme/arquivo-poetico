import './helpers/dom-real.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Comentários ao leitor e Notas públicas, entrega 2: colunas e ordenação,
// buscas `notapublica:` e `comentarioleitor:`, edição em massa (Preencher
// campo) e Importar campos.
const { db } = await import('../js/db.js');
const { DEFINICAO_COLUNAS } = await import('../js/colunas.js');
const { celulaNotaPublica } = await import('../js/celulas-tabela.js');
const { filtrarTextos, PREFIXOS_CANONICOS_POR_CAMPO } = await import('../js/utils.js');
const { decorarCamposBusca } = await import('../js/render-listas.js');
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
const { ehNotaPublica } = await import('../js/comentarios-publicos.js');

describe('colunas', () => {
    it('Notas públicas e Comentários ao leitor existem em Poemas e Prosas, escondidas, depois de Notas', () => {
        for (const tabela of ['poemas', 'prosas']) {
            const cols = DEFINICAO_COLUNAS[tabela];
            const chaves = cols.map((c) => c.key);
            const np = cols.find((c) => c.key === 'notasPublicas');
            const cp = cols.find((c) => c.key === 'comentariosPublicos');
            assert.ok(np && cp, `${tabela} sem as colunas`);
            assert.equal(np.default, false);
            assert.equal(cp.default, false);
            assert.equal(np.sortType, 'numero');
            assert.equal(cp.sortType, 'alfabetico');
            assert.equal(np.label, 'Notas públicas');
            assert.equal(cp.label, 'Comentários ao leitor');
            const i = chaves.indexOf('notas');
            assert.equal(chaves[i + 1], 'notasPublicas');
            assert.equal(chaves[i + 2], 'comentariosPublicos');
        }
    });
    it('a célula de Notas públicas mostra "Sim" só nos marcados', () => {
        assert.match(celulaNotaPublica({ notasPublicas: true }), /Sim/);
        assert.doesNotMatch(celulaNotaPublica({ notasPublicas: false }), /Sim/);
        assert.doesNotMatch(celulaNotaPublica({}), /Sim/);
    });
});

describe('busca', () => {
    const itens = () => {
        db.poemas = [
            {
                id: 1,
                titulo: 'A',
                notas: 'x',
                notasPublicas: true,
                comentariosPublicos: 'Escrevi na praia',
            },
            { id: 2, titulo: 'B', notas: 'y' },
            { id: 3, titulo: 'C', notasPublicas: false, comentariosPublicos: 'Sobre a saudade' },
            { id: 4, titulo: 'D', notasPublicas: true },
        ];
        return db.poemas.map((p) => decorarCamposBusca(p, '', 'poema'));
    };
    const ids = (lista) => lista.map((i) => i.id);

    it('`notapublica:*` acha os marcados e `-notapublica:*` os demais', () => {
        const lista = itens();
        assert.deepEqual(ids(filtrarTextos(lista, 'notapublica:*')), [1, 4]);
        assert.deepEqual(ids(filtrarTextos(lista, '-notapublica:*')), [2, 3]);
    });
    it('`comentarioleitor:` busca no texto do comentário, sem diferenciar acento', () => {
        const lista = itens();
        assert.deepEqual(ids(filtrarTextos(lista, 'comentarioleitor:praia')), [1]);
        assert.deepEqual(ids(filtrarTextos(lista, 'comentarioleitor:saudade')), [3]);
        assert.deepEqual(ids(filtrarTextos(lista, 'comentarioleitor:nada')), []);
    });
    it('`nota:` continua achando as Notas, públicas ou não', () => {
        assert.deepEqual(ids(filtrarTextos(itens(), 'nota:x')), [1]);
        assert.deepEqual(ids(filtrarTextos(itens(), 'nota:y')), [2]);
    });
    it('os prefixos são canônicos e `notapublica` vale só com `*`', () => {
        const canonicos = Object.values(PREFIXOS_CANONICOS_POR_CAMPO);
        assert.ok(canonicos.includes('notapublica'));
        assert.ok(canonicos.includes('comentarioleitor'));
        assert.ok(PREFIXOS_SO_ASTERISCO_TEXTO.includes('notapublica'));
    });
});

describe('Preencher campo em massa', () => {
    it('Notas públicas é booleano: marcar muda só quem não estava, desmarcar grava false', () => {
        const campo = obterCampoPreenchivel('notasPublicas');
        assert.equal(campo.tipo, 'booleano');
        assert.equal(campo.rotulo, 'Notas públicas');
        const lista = [{ id: 1, notasPublicas: true }, { id: 2 }, { id: 3, notasPublicas: false }];
        const p = planejarPreenchimento(lista, campo, true);
        assert.deepEqual(
            p.alterar.map((i) => i.id),
            [2, 3],
        );
        aplicarPreenchimento(p.alterar, campo, true);
        assert.ok(lista.every(ehNotaPublica));
        const { alterar } = planejarLimpeza(lista, campo);
        assert.equal(alterar.length, 3);
        aplicarLimpeza(alterar, campo);
        assert.ok(lista.every((i) => i.notasPublicas === false));
    });
    it('marcar Notas públicas não mexe no texto das Notas', () => {
        const campo = obterCampoPreenchivel('notasPublicas');
        const item = { id: 1, notas: 'minhas notas' };
        aplicarPreenchimento([item], campo, true);
        assert.equal(item.notas, 'minhas notas');
    });
    it('Comentários ao leitor é texto: preenche vazios e Limpar campo esvazia', () => {
        const campo = obterCampoPreenchivel('comentariosPublicos');
        assert.equal(campo.tipo, 'texto');
        assert.equal(campo.rotulo, 'Comentários ao leitor');
        const lista = [{ id: 1, comentariosPublicos: 'já tem' }, { id: 2 }];
        const p = planejarPreenchimento(lista, campo, '  Olá, leitor  ');
        assert.deepEqual(
            p.alterar.map((i) => i.id),
            [2],
        );
        aplicarPreenchimento(p.alterar, campo, '  Olá, leitor  ');
        assert.equal(lista[1].comentariosPublicos, 'Olá, leitor');
        const { alterar } = planejarLimpeza(lista, campo);
        aplicarLimpeza(alterar, campo);
        assert.ok(lista.every((i) => !i.comentariosPublicos));
    });
});

describe('Importar campos', () => {
    const simples = (bruta) => {
        const problemas = [];
        const e = lerExtrasDaEntrada(bruta, problemas);
        return { simples: e.simples, problemas };
    };
    it('`notasPublicas` verdadeiro vira campo simples; falso e vazio são ignorados', () => {
        for (const v of [true, 'sim', 'true']) {
            assert.deepEqual(simples({ titulo: 'a', notasPublicas: v }).simples, [
                { chave: 'notasPublicas', valor: true },
            ]);
        }
        for (const v of [false, 'não', '', null]) {
            const r = simples({ titulo: 'a', notasPublicas: v });
            assert.deepEqual(r.simples, []);
            assert.deepEqual(r.problemas, []);
        }
        const ruim = simples({ titulo: 'a', notasPublicas: 'talvez' });
        assert.equal(ruim.problemas[0].campo, 'notasPublicas');
    });
    it('`comentariosPublicos` (ou `comentariosAoLeitor`) vira campo simples; vazio é ignorado', () => {
        assert.deepEqual(simples({ titulo: 'a', comentariosPublicos: ' Olá ' }).simples, [
            { chave: 'comentariosPublicos', valor: 'Olá' },
        ]);
        assert.deepEqual(simples({ titulo: 'a', comentariosAoLeitor: 'Oi' }).simples, [
            { chave: 'comentariosPublicos', valor: 'Oi' },
        ]);
        assert.deepEqual(simples({ titulo: 'a', comentariosPublicos: '  ' }).simples, []);
    });
    it('aplicar preenche o vazio, mantém o que já existe e só troca com a opção de substituir', () => {
        const item = { id: 1 };
        const rel = { camposSimples: [] };
        aplicarCamposSimples(
            item,
            [
                { chave: 'notasPublicas', valor: true },
                { chave: 'comentariosPublicos', valor: 'Primeiro' },
            ],
            rel,
        );
        assert.equal(ehNotaPublica(item), true);
        assert.equal(item.comentariosPublicos, 'Primeiro');
        const rel2 = { camposSimples: [] };
        aplicarCamposSimples(item, [{ chave: 'comentariosPublicos', valor: 'Segundo' }], rel2);
        assert.equal(item.comentariosPublicos, 'Primeiro');
        assert.equal(rel2.camposSimples[0].acao, 'mantido');
        const rel3 = { camposSimples: [] };
        aplicarCamposSimples(item, [{ chave: 'comentariosPublicos', valor: 'Segundo' }], rel3, {
            substituir: true,
        });
        assert.equal(item.comentariosPublicos, 'Segundo');
    });
});

const { montarCabecalho } = await import('../js/celulas-tabela.js');
const { toggleColuna, resetarColunas } = await import('../js/colunas.js');

describe('lupa do cabeçalho: Notas públicas e Sorteável', () => {
    for (const tabela of ['poemas', 'prosas']) {
        it(`${tabela}: as duas colunas ligadas mostram a lupa de notapublica: e sorteavel:`, () => {
            resetarColunas(tabela);
            toggleColuna(tabela, 'notasPublicas', true);
            toggleColuna(tabela, 'sorteavel', true);
            const html = montarCabecalho(tabela, '', '');
            assert.ok(html.includes("buscarPorPrefixo('" + tabela + "', '_buscaNotaPublica')"));
            assert.ok(html.includes("buscarPorPrefixo('" + tabela + "', '_buscaSorteavel')"));
            assert.ok(html.includes('Buscar por notapublica:'));
            assert.ok(html.includes('Buscar por sorteavel:'));
            resetarColunas(tabela);
        });
    }
});

describe('clique na lupa: prefixos que só valem com `*`', () => {
    it('notapublica: e sorteavel: já saem com o asterisco; os demais não', async () => {
        const { buscarPorPrefixo } = await import('../js/render-listas.js');
        const input = document.createElement('input');
        input.id = 'busca-poemas';
        document.body.appendChild(input);
        buscarPorPrefixo('poemas', '_buscaNotaPublica');
        assert.equal(input.value, 'notapublica:*');
        buscarPorPrefixo('poemas', '_buscaSorteavel');
        assert.equal(input.value, 'notapublica:* sorteavel:*');
        input.value = '';
        buscarPorPrefixo('poemas', 'comentariosPublicos');
        assert.equal(input.value, 'comentarioleitor:');
        input.remove();
    });
});
