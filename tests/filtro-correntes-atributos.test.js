import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Filtros de Tipo, Região, Programa e Postura estética na aba Correntes
// literárias: valor efetivo (a divisão herda do pai), pai só como contexto,
// Região composta ("Brasil/Portugal") e botão Limpar filtros.

document.body.innerHTML = `
    <main>
        <div id="filtros-periodo-movimentosEscolas"></div>
        <div id="lista-movimentos-escolas"></div>
    </main>
`;

const H = await import('../js/correntes-hierarquia.js');
const { db } = await import('../js/db.js');
const { renderMovimentosEscolas, setFiltroPeriodo, limparFiltrosCorrentes } =
    await import('../js/render-listas.js');

const VAZIO = H.FILTRO_CORRENTE_VAZIO;

// Romantismo (Literário, Movimento, Inovadora, Brasil/Portugal)
//   ├ Romantismo no Brasil (região própria: Brasil; resto herdado)
//   │   └ 3ª geração (tudo herdado, exceto Postura própria: Iconoclasta)
//   └ Romantismo em Portugal (Portugal)
// Concretismo (Artístico, Vanguarda, Iconoclasta, Brasil), sem divisões
// Sem dados (nada preenchido)
const arvore = () => [
    {
        id: 1,
        nome: 'Romantismo',
        paiId: null,
        tipo: 'Literário',
        programa: 'Movimento',
        posturaEstetica: 'Inovadora',
        regiaoOrigem: 'Brasil/Portugal',
    },
    { id: 2, nome: 'Romantismo no Brasil', paiId: 1, regiaoOrigem: 'Brasil' },
    { id: 3, nome: '3ª geração', paiId: 2, posturaEstetica: 'Iconoclasta' },
    { id: 4, nome: 'Romantismo em Portugal', paiId: 1, regiaoOrigem: 'Portugal' },
    {
        id: 5,
        nome: 'Concretismo',
        paiId: null,
        tipo: 'Artístico',
        programa: 'Vanguarda',
        posturaEstetica: 'Iconoclasta',
        regiaoOrigem: 'Brasil',
    },
    { id: 6, nome: 'Sem dados', paiId: null },
];

const ids = (lista) => lista.map((m) => m.id);

describe('filtrarCorrentesPorAtributos (função pura)', () => {
    it('sem filtro devolve tudo e nenhum contexto', () => {
        const lista = arvore();
        const r = H.filtrarCorrentesPorAtributos(lista, lista, {});
        assert.deepEqual(ids(r.passam), [1, 2, 3, 4, 5, 6]);
        assert.deepEqual(r.contexto, []);
    });

    it('Programa usa o valor herdado: as divisões do Romantismo contam como Movimento', () => {
        const lista = arvore();
        const r = H.filtrarCorrentesPorAtributos(lista, lista, { programa: 'Movimento' });
        assert.deepEqual(ids(r.passam), [1, 2, 3, 4]);
        assert.deepEqual(r.contexto, []);
    });

    it('Postura própria vence a herdada', () => {
        const lista = arvore();
        const inovadora = H.filtrarCorrentesPorAtributos(lista, lista, { postura: 'Inovadora' });
        assert.deepEqual(ids(inovadora.passam), [1, 2, 4]);
        const icono = H.filtrarCorrentesPorAtributos(lista, lista, { postura: 'Iconoclasta' });
        assert.deepEqual(ids(icono.passam), [3, 5]);
    });

    it('pai que não passa mas tem divisão que passa entra como contexto (ancestrais todos)', () => {
        const lista = arvore();
        const r = H.filtrarCorrentesPorAtributos(lista, lista, { postura: 'Iconoclasta' });
        assert.deepEqual(ids(r.contexto), [1, 2]);
    });

    it('Região é composta: "Brasil/Portugal" casa com Brasil e com Portugal', () => {
        const lista = arvore();
        const brasil = H.filtrarCorrentesPorAtributos(lista, lista, { regiao: 'Brasil' });
        assert.deepEqual(ids(brasil.passam), [1, 2, 3, 5]);
        const portugal = H.filtrarCorrentesPorAtributos(lista, lista, { regiao: 'Portugal' });
        assert.deepEqual(ids(portugal.passam), [1, 4]);
    });

    it('Região herdada: a 3ª geração vale Brasil pelo pai', () => {
        const lista = arvore();
        assert.equal(H.regiaoEfetivaDaCorrente(lista, lista[2]).valor, 'Brasil');
    });

    it('filtros se combinam em E', () => {
        const lista = arvore();
        const r = H.filtrarCorrentesPorAtributos(lista, lista, {
            tipo: 'Literário',
            regiao: 'Portugal',
            programa: 'Movimento',
        });
        assert.deepEqual(ids(r.passam), [1, 4]);
    });

    it('"não preenchido" acha só quem não tem valor nem herda', () => {
        const lista = arvore();
        assert.deepEqual(
            ids(H.filtrarCorrentesPorAtributos(lista, lista, { tipo: VAZIO }).passam),
            [6],
        );
        assert.deepEqual(
            ids(H.filtrarCorrentesPorAtributos(lista, lista, { regiao: VAZIO }).passam),
            [6],
        );
        assert.deepEqual(
            ids(H.filtrarCorrentesPorAtributos(lista, lista, { programa: VAZIO }).passam),
            [6],
        );
    });

    it('"Não se aplica" é decisão, não vazio: vale para a corrente e é herdado pelas divisões dela', () => {
        const lista = arvore();
        lista[1].programa = 'Não se aplica';
        const r = H.filtrarCorrentesPorAtributos(lista, lista, { programa: 'Não se aplica' });
        assert.deepEqual(ids(r.passam), [2, 3]);
        const vazio = H.filtrarCorrentesPorAtributos(lista, lista, { programa: VAZIO });
        assert.deepEqual(ids(vazio.passam), [6]);
    });

    it('respeita as candidatas (já filtradas por nome/período) e acha o contexto na lista inteira', () => {
        const lista = arvore();
        const candidatas = lista.filter((m) => m.id === 3);
        const r = H.filtrarCorrentesPorAtributos(lista, candidatas, { programa: 'Movimento' });
        assert.deepEqual(ids(r.passam), [3]);
        assert.deepEqual(ids(r.contexto), [1, 2]);
    });

    it('opcoesDeRegiaoDasCorrentes separa os lugares e ordena', () => {
        assert.deepEqual(H.opcoesDeRegiaoDasCorrentes(arvore()), ['Brasil', 'Portugal']);
        assert.deepEqual(H.lugaresDaRegiao(' Portugal / Galiza '), ['Portugal', 'Galiza']);
        assert.deepEqual(H.lugaresDaRegiao(''), []);
    });
});

describe('filtros de atributos na aba (UI)', () => {
    const definir = (sufixo, valor) => {
        document.getElementById(`fp-movimentosEscolas-${sufixo}`).value = valor;
        setFiltroPeriodo('movimentosEscolas');
    };
    const titulos = () =>
        [...document.querySelectorAll('#lista-movimentos-escolas h4')].map((h) =>
            h.textContent.trim(),
        );
    const cartoesContexto = () =>
        [...document.querySelectorAll('#lista-movimentos-escolas [data-contexto="true"] h4')].map(
            (h) => h.textContent.trim(),
        );

    beforeEach(() => {
        db.movimentosEscolas = arvore();
        db.autores = [];
        db.poemas = [];
        db.prosas = [];
        renderMovimentosEscolas();
        limparFiltrosCorrentes();
    });

    it('monta os quatro selects e o botão uma única vez', () => {
        ['tipo', 'regiao', 'programa', 'postura'].forEach((c) =>
            assert.ok(document.getElementById(`fp-movimentosEscolas-${c}`), c),
        );
        assert.ok(document.getElementById('fp-movimentosEscolas-limpar'));
        const antes = document.getElementById('fp-movimentosEscolas-tipo');
        renderMovimentosEscolas();
        assert.equal(document.getElementById('fp-movimentosEscolas-tipo'), antes);
    });

    it('o select de Região lista os lugares do cadastro', () => {
        const opcoes = [...document.getElementById('fp-movimentosEscolas-regiao').options].map(
            (o) => o.value,
        );
        assert.deepEqual(opcoes, ['', 'Brasil', 'Portugal', VAZIO]);
    });

    it('filtrar por Programa mostra a árvore inteira do Romantismo, sem contexto', () => {
        definir('programa', 'Movimento');
        assert.deepEqual(titulos(), [
            'Romantismo',
            'Romantismo em Portugal',
            'Romantismo no Brasil',
            '3ª geração',
        ]);
        assert.deepEqual(cartoesContexto(), []);
        assert.match(
            document.getElementById('fp-movimentosEscolas-contagem').textContent,
            /^4 de 6 correntes$/,
        );
    });

    it('divisão que passa traz os pais apagados como contexto, fora da contagem', () => {
        definir('postura', 'Iconoclasta');
        assert.deepEqual(titulos(), [
            'Concretismo',
            'Romantismo',
            'Romantismo no Brasil',
            '3ª geração',
        ]);
        assert.deepEqual(cartoesContexto(), ['Romantismo', 'Romantismo no Brasil']);
        assert.match(
            document.getElementById('fp-movimentosEscolas-contagem').textContent,
            /^2 de 6 correntes$/,
        );
    });

    it('sem resultado mostra a mensagem de filtro', () => {
        definir('tipo', 'Artístico');
        definir('programa', 'Movimento');
        assert.match(
            document.getElementById('lista-movimentos-escolas').textContent,
            /Nenhuma corrente literária encontrada com esse filtro/,
        );
    });

    it('combina com a busca por nome', () => {
        document.getElementById('fp-movimentosEscolas-nome').value = 'portugal';
        definir('programa', 'Movimento');
        assert.deepEqual(titulos(), ['Romantismo', 'Romantismo em Portugal']);
        assert.deepEqual(cartoesContexto(), ['Romantismo']);
    });

    it('Limpar filtros zera os controles e volta a lista inteira', () => {
        document.getElementById('fp-movimentosEscolas-nome').value = 'rom';
        definir('regiao', 'Portugal');
        definir('tipo', 'Literário');
        limparFiltrosCorrentes();
        ['nome', 'tipo', 'regiao', 'programa', 'postura'].forEach((c) =>
            assert.equal(document.getElementById(`fp-movimentosEscolas-${c}`).value, '', c),
        );
        assert.equal(titulos().length, 6);
        assert.equal(document.getElementById('fp-movimentosEscolas-contagem').textContent, '');
    });

    it('região escolhida que deixa de existir volta para Todas', () => {
        definir('regiao', 'Portugal');
        db.movimentosEscolas = db.movimentosEscolas.filter((m) => m.id !== 4);
        db.movimentosEscolas[0].regiaoOrigem = 'Brasil';
        renderMovimentosEscolas();
        assert.equal(document.getElementById('fp-movimentosEscolas-regiao').value, '');
        assert.equal(titulos().length, 5);
    });
});
