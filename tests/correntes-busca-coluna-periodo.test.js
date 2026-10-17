import './helpers/localstorage-shim.js';
import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Postura estética e Programa das correntes ligadas a um texto ou autor
// (valor efetivo, com a herança do pai): busca `postura:` e `programa:`,
// colunas de Poemas e Prosas e ordenação. E o filtro De/Até da aba Correntes
// literárias conhecendo a hierarquia (divisão sem data usa o período do pai;
// pai fora do filtro fica como contexto).

document.body.innerHTML = `
    <main>
        <div id="filtros-periodo-movimentosEscolas"></div>
        <div id="lista-movimentos-escolas"></div>
        <div id="lista-livros"></div>
        <div id="barra-acoes-poemas" class="hidden"><span id="contador-selecao-poemas"></span></div>
        <div id="painel-colunas-poemas"></div>
        <div id="painel-acoes-poemas"></div>
        <select id="filtro-livro-poemas"></select>
        <table>
            <thead><tr id="cabecalho-poemas"></tr></thead>
            <tbody id="lista-poemas"></tbody>
        </table>
        <div id="paginacao-poemas"></div>
    </main>
`;

const { db } = await import('../js/db.js');
const H = await import('../js/correntes-hierarquia.js');
const { filtrarTextos, filtrarPeriodosPorData, periodoTemData, PREFIXOS_CANONICOS_POR_CAMPO } =
    await import('../js/utils.js');
const rl = await import('../js/render-listas.js');
const {
    decorarCamposBusca,
    renderPoemas,
    renderMovimentosEscolas,
    setFiltroPeriodo,
    limparFiltrosCorrentes,
    ordenarPor,
} = rl;
const { filtrarAutores } = await import('../js/busca-autores.js');
const { toggleColuna, resetarColunas, DEFINICAO_COLUNAS } = await import('../js/colunas.js');
await import('../js/main.js');

const ids = (lista) => lista.map((i) => i.id);

// Romantismo (Movimento, Inovadora, 1836–1881)
//   ├ Romantismo no Brasil (tudo herdado, 1836–1881)
//   │   └ 3ª geração (Postura própria: Iconoclasta; sem data própria)
//   └ Romantismo em Portugal (1825–1865)
// Concretismo (Vanguarda, Iconoclasta, 1956–1960)
// Pré-Modernismo (Não se aplica nos dois)
// Sem dados
const ano = (a) => ({ ano: a });
function arvore() {
    return [
        {
            id: 1,
            nome: 'Romantismo',
            paiId: null,
            programa: 'Movimento',
            posturaEstetica: 'Inovadora',
            inicio: ano(1836),
            fim: ano(1881),
        },
        { id: 2, nome: 'Romantismo no Brasil', paiId: 1, inicio: ano(1836), fim: ano(1881) },
        { id: 3, nome: '3ª geração', paiId: 2, posturaEstetica: 'Iconoclasta' },
        { id: 4, nome: 'Romantismo em Portugal', paiId: 1, inicio: ano(1825), fim: ano(1865) },
        {
            id: 5,
            nome: 'Concretismo',
            paiId: null,
            programa: 'Vanguarda',
            posturaEstetica: 'Iconoclasta',
            inicio: ano(1956),
            fim: ano(1960),
        },
        {
            id: 6,
            nome: 'Pré-Modernismo',
            paiId: null,
            programa: 'Não se aplica',
            posturaEstetica: 'Não se aplica',
        },
        { id: 7, nome: 'Sem dados', paiId: null },
    ];
}

const poema = (id, movimentosEscolasIds) => ({ id, titulo: `P${id}`, movimentosEscolasIds });

function zerar() {
    db.movimentosEscolas = arvore();
    db.autores = [];
    db.poemas = [];
    db.prosas = [];
    resetarColunas('poemas');
}

describe('Postura e Programa de um texto (funções puras)', () => {
    beforeEach(zerar);

    it('a divisão sem valor próprio herda do pai; o valor próprio vence', () => {
        assert.deepEqual(H.posturasDasCorrentes(db.movimentosEscolas, [2]), ['Inovadora']);
        assert.deepEqual(H.posturasDasCorrentes(db.movimentosEscolas, [3]), ['Iconoclasta']);
        assert.deepEqual(H.programasDasCorrentes(db.movimentosEscolas, [3]), ['Movimento']);
    });

    it('junta os valores de várias correntes, sem repetir, na ordem dos vínculos', () => {
        assert.deepEqual(H.posturasDasCorrentes(db.movimentosEscolas, [3, 1, 5]), [
            'Iconoclasta',
            'Inovadora',
        ]);
        assert.deepEqual(H.programasDasCorrentes(db.movimentosEscolas, [5, 3, 1]), [
            'Vanguarda',
            'Movimento',
        ]);
    });

    it('"Não se aplica" é valor; corrente sem nada e id órfão não entram', () => {
        assert.deepEqual(H.posturasDasCorrentes(db.movimentosEscolas, [6]), ['Não se aplica']);
        assert.deepEqual(H.programasDasCorrentes(db.movimentosEscolas, [7, 999]), []);
        assert.deepEqual(H.posturasDasCorrentes(db.movimentosEscolas, undefined), []);
    });
});

describe('busca por postura: e programa: em textos', () => {
    beforeEach(zerar);

    function decorados() {
        db.poemas = [poema(1, [3]), poema(2, [4]), poema(3, [5]), poema(4, [6]), poema(5, [])];
        return db.poemas.map((p) => decorarCamposBusca(p, 'poemas'));
    }

    it('postura: usa o valor efetivo (a 3ª geração é Iconoclasta; Portugal herda Inovadora)', () => {
        const lista = decorados();
        assert.deepEqual(ids(filtrarTextos(lista, 'postura:iconoclasta')), [1, 3]);
        assert.deepEqual(ids(filtrarTextos(lista, 'postura:inovadora')), [2]);
    });

    it('programa: acha o herdado e "Não se aplica"', () => {
        const lista = decorados();
        assert.deepEqual(ids(filtrarTextos(lista, 'programa:movimento')), [1, 2]);
        assert.deepEqual(ids(filtrarTextos(lista, 'programa:vanguarda')), [3]);
        assert.deepEqual(ids(filtrarTextos(lista, 'programa:"não se aplica"')), [4]);
    });

    it('presença: postura:* acha quem tem alguma, -postura:* quem não tem', () => {
        const lista = decorados();
        assert.deepEqual(ids(filtrarTextos(lista, 'postura:*')), [1, 2, 3, 4]);
        assert.deepEqual(ids(filtrarTextos(lista, '-postura:*')), [5]);
    });

    it('a busca sem prefixo não enxerga Postura nem Programa', () => {
        const lista = decorados();
        assert.deepEqual(ids(filtrarTextos(lista, 'vanguarda')), []);
        assert.deepEqual(ids(filtrarTextos(lista, 'inovadora')), []);
    });

    it('os dois prefixos têm forma canônica (alimentam o atalho de lupa da coluna)', () => {
        assert.equal(PREFIXOS_CANONICOS_POR_CAMPO._buscaPosturas, 'postura');
        assert.equal(PREFIXOS_CANONICOS_POR_CAMPO._buscaProgramas, 'programa');
    });
});

describe('busca por postura: e programa: em autores', () => {
    beforeEach(zerar);

    it('o autor ligado a uma geração acha pela postura e pelo programa efetivos', () => {
        const autores = [
            { id: 1, nome: 'Castro', movimentosEscolasIds: [3] },
            { id: 2, nome: 'Garrett', movimentosEscolasIds: [4] },
            { id: 3, nome: 'Augusto', movimentosEscolasIds: [5] },
            { id: 4, nome: 'Sem corrente', movimentosEscolasIds: [] },
        ];
        assert.deepEqual(ids(filtrarAutores(autores, 'postura:iconoclasta')), [1, 3]);
        assert.deepEqual(ids(filtrarAutores(autores, 'programa:movimento')), [1, 2]);
        assert.deepEqual(ids(filtrarAutores(autores, '-programa:*')), [4]);
    });
});

describe('colunas Postura e Programa em Poemas', () => {
    beforeEach(zerar);

    it('estão na definição de Poemas e de Prosas, logo depois da Corrente literária e das Divisões', () => {
        for (const tabela of ['poemas', 'prosas']) {
            const chaves = DEFINICAO_COLUNAS[tabela].map((c) => c.key);
            const i = chaves.indexOf('movimentosEscolas');
            assert.equal(chaves[i + 1], 'divisoesCorrentes', tabela);
            assert.equal(chaves[i + 2], 'posturaEstetica', tabela);
            assert.equal(chaves[i + 3], 'programa', tabela);
            const col = DEFINICAO_COLUNAS[tabela].find((c) => c.key === 'posturaEstetica');
            assert.equal(col.default, false);
        }
    });

    function celula(rotulo, linha = 0) {
        const cabecalhos = Array.from(document.querySelectorAll('#cabecalho-poemas th'));
        const i = cabecalhos.findIndex((th) => th.textContent.includes(rotulo));
        assert.ok(i >= 0, `coluna "${rotulo}" deveria estar no cabeçalho`);
        return document.querySelectorAll('#lista-poemas tr')[linha].querySelectorAll('td')[i];
    }

    it('mostram os valores efetivos, um selo por valor, e traço quando não há', () => {
        db.poemas = [poema(1, [3, 1]), poema(2, [])];
        toggleColuna('poemas', 'posturaEstetica', true);
        toggleColuna('poemas', 'programa', true);
        renderPoemas();
        const selos = (td) => [...td.querySelectorAll('span')].map((s) => s.textContent.trim());
        assert.deepEqual(selos(celula('Postura estética da corrente', 0)), [
            'Iconoclasta',
            'Inovadora',
        ]);
        assert.deepEqual(selos(celula('Programa da corrente', 0)), ['Movimento']);
        assert.equal(celula('Postura estética da corrente', 1).textContent.trim(), '—');
        assert.equal(celula('Programa da corrente', 1).textContent.trim(), '—');
    });

    it('ordenam pelo texto dos valores (vazio por último)', () => {
        db.poemas = [poema(1, [5]), poema(2, []), poema(3, [1]), poema(4, [6])];
        toggleColuna('poemas', 'posturaEstetica', true);
        renderPoemas();
        // O happy-dom não executa onclick inline: chama a função do cabeçalho direto.
        ordenarPor('poemas', 'posturaEstetica');
        const titulos = [...document.querySelectorAll('#lista-poemas tr')].map(
            (tr) => tr.textContent.match(/P\d/)?.[0],
        );
        // Inovadora (P3), Iconoclasta (P1)... em ordem alfabética: Iconoclasta, Inovadora,
        // Não se aplica, e o vazio por último.
        assert.deepEqual(titulos, ['P1', 'P3', 'P4', 'P2']);
    });
});

describe('período efetivo da corrente', () => {
    beforeEach(zerar);
    const tem = (x) => periodoTemData(x, { movimento: true });

    it('a divisão sem data usa o período do ancestral mais próximo que tem data', () => {
        const lista = db.movimentosEscolas;
        assert.equal(H.periodoEfetivoDaCorrente(lista, lista[2], tem).id, 2);
        assert.equal(H.periodoEfetivoDaCorrente(lista, lista[1], tem).id, 2);
        assert.equal(H.periodoEfetivoDaCorrente(lista, lista[6], tem), null);
    });

    it('filtrarPeriodosPorData: o De/Até usa o período efetivo; Só com/sem data olha o próprio', () => {
        const lista = db.movimentosEscolas;
        const efetivo = (m) => H.periodoEfetivoDaCorrente(lista, m, tem);
        const de = { de: { ano: 1840 }, ate: { ano: 1850 } };
        const fora = { de: { ano: 1956 }, ate: { ano: 1957 } };
        // 3ª geração não tem data própria: com o hook entra no recorte do pai.
        assert.ok(
            ids(
                filtrarPeriodosPorData(lista, {
                    intervalo: de,
                    movimento: true,
                    periodoEfetivo: efetivo,
                }),
            ).includes(3),
        );
        // E sai quando o recorte não alcança o período do pai.
        assert.ok(
            !ids(
                filtrarPeriodosPorData(lista, {
                    intervalo: fora,
                    movimento: true,
                    periodoEfetivo: efetivo,
                }),
            ).includes(3),
        );
        // Sem o hook, o comportamento antigo: sem data própria continua visível.
        assert.ok(
            ids(filtrarPeriodosPorData(lista, { intervalo: fora, movimento: true })).includes(3),
        );
        // "Só sem data" e "Só com data" olham as datas gravadas no próprio item.
        const semData = filtrarPeriodosPorData(lista, {
            modoData: 'sem-data',
            movimento: true,
            periodoEfetivo: efetivo,
        });
        assert.deepEqual(ids(semData), [3, 6, 7]);
        const comData = filtrarPeriodosPorData(lista, {
            modoData: 'com-data',
            movimento: true,
            periodoEfetivo: efetivo,
        });
        assert.deepEqual(ids(comData), [1, 2, 4, 5]);
    });

    it('um período sem data em lugar nenhum continua visível no De/Até (como antes)', () => {
        const lista = db.movimentosEscolas;
        const efetivo = (m) => H.periodoEfetivoDaCorrente(lista, m, tem);
        const r = filtrarPeriodosPorData(lista, {
            intervalo: { de: { ano: 1956 }, ate: { ano: 1957 } },
            movimento: true,
            periodoEfetivo: efetivo,
        });
        assert.ok(ids(r).includes(7));
    });
});

describe('ancestraisForaDe', () => {
    beforeEach(zerar);

    it('devolve os ancestrais que não estão no conjunto, na ordem da lista', () => {
        const lista = db.movimentosEscolas;
        assert.deepEqual(ids(H.ancestraisForaDe(lista, [lista[2]])), [1, 2]);
        assert.deepEqual(ids(H.ancestraisForaDe(lista, [lista[1], lista[2]])), [1]);
        assert.deepEqual(ids(H.ancestraisForaDe(lista, lista)), []);
        assert.deepEqual(H.ancestraisForaDe(lista, []), []);
    });
});

describe('aba Correntes literárias: período com hierarquia', () => {
    beforeEach(() => {
        zerar();
        renderMovimentosEscolas();
        limparFiltrosCorrentes();
    });

    const nomesNaLista = () =>
        [...document.querySelectorAll('#lista-movimentos-escolas h4')].map((h) =>
            h.textContent.trim(),
        );
    const contexto = () =>
        [...document.querySelectorAll('#lista-movimentos-escolas [data-contexto="true"] h4')].map(
            (h) => h.textContent.trim(),
        );
    function definir(campo, valor) {
        document.getElementById(`fp-movimentosEscolas-${campo}`).value = valor;
        setFiltroPeriodo('movimentosEscolas');
    }

    it('o intervalo que só alcança Portugal deixa o Romantismo como contexto', () => {
        // 1826–1830: Portugal (1825–1865) entra; o Romantismo (1836–1881) não.
        definir('de', '1826');
        definir('ate', '1830');
        const nomes = nomesNaLista();
        assert.ok(nomes.includes('Romantismo em Portugal'));
        assert.ok(nomes.includes('Romantismo'));
        // O Brasil (1836–1881) e a 3ª geração, que herda o período dele, ficam de fora.
        assert.ok(!nomes.includes('Romantismo no Brasil'));
        assert.ok(!nomes.includes('3ª geração'));
        assert.ok(!nomes.includes('Concretismo'));
        assert.deepEqual(contexto(), ['Romantismo']);
        assert.match(
            document.getElementById('fp-movimentosEscolas-contagem').textContent,
            /^\d+ de 7 correntes$/,
        );
    });

    it('a 3ª geração sem data entra pelo período do pai e traz os pais como contexto', () => {
        definir('de', '1840');
        definir('ate', '1850');
        const nomes = nomesNaLista();
        assert.ok(nomes.includes('3ª geração'));
        assert.ok(nomes.includes('Romantismo no Brasil'));
        assert.ok(!nomes.includes('Concretismo'));
        assert.deepEqual(contexto(), []);
    });

    it('filtro por nome também mantém o pai como contexto', () => {
        definir('nome', '3ª');
        assert.deepEqual(nomesNaLista(), ['Romantismo', 'Romantismo no Brasil', '3ª geração']);
        assert.deepEqual(contexto(), ['Romantismo', 'Romantismo no Brasil']);
    });

    it('sem filtro nenhum não há contexto', () => {
        assert.equal(nomesNaLista().length, 7);
        assert.deepEqual(contexto(), []);
    });
});
