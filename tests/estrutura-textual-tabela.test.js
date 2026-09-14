import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mesma base mínima de render-dom.test.js/colunas-contagem-estrutura-linha.test.js
// — só o que renderSonoridade/renderEstruturaTextual realmente tocam
// (ambos toleram elementos ausentes via getElementById + checagem de
// null, exceto a própria tbody, que é obrigatória).
document.body.innerHTML = `
    <main>
        <div id="lista-livros"></div>

        <div id="painel-colunas-sonoridade"></div>
        <div id="painel-acoes-sonoridade"></div>
        <table>
            <thead><tr id="cabecalho-sonoridade"></tr></thead>
            <tbody id="lista-sonoridade"></tbody>
        </table>
        <div id="paginacao-sonoridade"></div>

        <div id="painel-colunas-estrutura-textual"></div>
        <div id="painel-acoes-estrutura-textual"></div>
        <table>
            <thead><tr id="cabecalho-estrutura-textual"></tr></thead>
            <tbody id="lista-estrutura-textual"></tbody>
        </table>
        <div id="paginacao-estrutura-textual"></div>
    </main>
`;

const { db } = await import('../js/db.js');
const {
    renderSonoridade,
    renderEstruturaTextual,
    setPaginaSonoridade,
    setPaginaEstruturaTextual,
    setItensPorPagina,
    setFiltroEstruturaTextual,
} = await import('../js/render-listas.js');
const { toggleColuna, resetarColunas } = await import('../js/colunas.js');
await import('../js/main.js');

function limparDb() {
    db.poemas.length = 0;
    db.escansoes.length = 0;
    db.estruturasTextuais.length = 0;
    resetarColunas('estrutura-textual');
    setFiltroEstruturaTextual('');
    setItensPorPagina('todos'); // também zera a página atual das 4 tabelas
}

function idsDaTabela(tbodyId) {
    return Array.from(document.querySelectorAll(`#${tbodyId} tr`)).map((tr) => {
        const m = tr.querySelector('td')?.textContent.match(/#(\d+)/);
        return m ? Number(m[1]) : null;
    });
}

describe('Paginação — Sonoridade e Morfofuncionalidade (réplica de Poemas/Prosas)', () => {
    beforeEach(limparDb);

    it('renderSonoridade pagina 2 por página, sem repetir nem pular itens entre páginas', () => {
        db.poemas.push({ id: 1, titulo: 'Poema Único' });
        for (let i = 1; i <= 5; i++) {
            db.escansoes.push({ id: i, poemaId: 1 });
        }
        setItensPorPagina('2');

        setPaginaSonoridade(1);
        renderSonoridade();
        assert.deepEqual(idsDaTabela('lista-sonoridade'), [1, 2]);

        setPaginaSonoridade(2);
        renderSonoridade();
        assert.deepEqual(idsDaTabela('lista-sonoridade'), [3, 4]);

        setPaginaSonoridade(3);
        renderSonoridade();
        assert.deepEqual(idsDaTabela('lista-sonoridade'), [5]);
    });

    it('renderEstruturaTextual pagina 2 por página, sem repetir nem pular itens entre páginas', () => {
        db.poemas.push({ id: 1, titulo: 'Poema Único' });
        for (let i = 1; i <= 5; i++) {
            db.estruturasTextuais.push({ id: i, poemaId: 1, unidades: [], eventos: [] });
        }
        setItensPorPagina('2');

        setPaginaEstruturaTextual(1);
        renderEstruturaTextual();
        assert.deepEqual(idsDaTabela('lista-estrutura-textual'), [1, 2]);

        setPaginaEstruturaTextual(2);
        renderEstruturaTextual();
        assert.deepEqual(idsDaTabela('lista-estrutura-textual'), [3, 4]);

        setPaginaEstruturaTextual(3);
        renderEstruturaTextual();
        assert.deepEqual(idsDaTabela('lista-estrutura-textual'), [5]);
    });

    it('trocar "itens por página" pra "todos" volta a mostrar tudo numa página só', () => {
        db.poemas.push({ id: 1, titulo: 'Poema Único' });
        for (let i = 1; i <= 5; i++) {
            db.estruturasTextuais.push({ id: i, poemaId: 1, unidades: [], eventos: [] });
        }
        setItensPorPagina('2');
        setPaginaEstruturaTextual(2);
        renderEstruturaTextual();
        assert.equal(idsDaTabela('lista-estrutura-textual').length, 2);

        setItensPorPagina('todos');
        renderEstruturaTextual();
        assert.deepEqual(idsDaTabela('lista-estrutura-textual'), [1, 2, 3, 4, 5]);
    });

    it('mudar o filtro (menos itens que antes) clampa a página de volta pra dentro do intervalo válido', () => {
        db.poemas.push({ id: 1, titulo: 'Alfa' }, { id: 2, titulo: 'Beta' });
        for (let i = 1; i <= 3; i++) {
            db.estruturasTextuais.push({ id: i, poemaId: 1, unidades: [], eventos: [] });
        }
        db.estruturasTextuais.push({ id: 4, poemaId: 2, unidades: [], eventos: [] });
        setItensPorPagina('1');
        setPaginaEstruturaTextual(3); // última página com o filtro "Alfa"
        renderEstruturaTextual();
        assert.equal(idsDaTabela('lista-estrutura-textual').length, 1);

        setFiltroEstruturaTextual('beta'); // só 1 item bate agora — página 3 não existe mais
        assert.equal(idsDaTabela('lista-estrutura-textual').length, 1);
        assert.deepEqual(idsDaTabela('lista-estrutura-textual'), [4]);
    });
});

describe('Colunas dinâmicas (Unidades/Eventos) em Morfofuncionalidade', () => {
    beforeEach(limparDb);

    it('as duas colunas aparecem ligadas por padrão', () => {
        db.poemas.push({ id: 1, titulo: 'Poema Único' });
        db.estruturasTextuais.push({ id: 1, poemaId: 1, unidades: [], eventos: [] });
        renderEstruturaTextual();

        const cabecalho = Array.from(
            document.querySelectorAll('#cabecalho-estrutura-textual th'),
        ).map((th) => th.textContent.trim());
        assert.deepEqual(cabecalho, ['ID / Título', 'Unidades', 'Eventos', 'Ações']);

        const primeiraLinha = document.querySelector('#lista-estrutura-textual tr');
        // ID/Título + Unidades + Eventos + Ações = 4 <td>
        assert.equal(primeiraLinha.querySelectorAll('td').length, 4);
    });

    it('desligar a coluna "Eventos" tira a th e a td correspondentes, sem afetar "Unidades"', () => {
        db.poemas.push({ id: 1, titulo: 'Poema Único' });
        db.estruturasTextuais.push({
            id: 1,
            poemaId: 1,
            unidades: [
                {
                    id: 'u1',
                    nome: '',
                    unidadeEstrofica: 'Quartetos',
                    unidadeDiscursiva: 'Proposição',
                    posicao: { estrofes: [], versos: 'todos' },
                },
            ],
            eventos: [{ id: 'e1', progressaoDialetica: 'Volta', posicao: { estrofes: [], versos: 'todos' } }],
        });

        toggleColuna('estrutura-textual', 'eventos', false);
        renderEstruturaTextual();

        const cabecalho = Array.from(
            document.querySelectorAll('#cabecalho-estrutura-textual th'),
        ).map((th) => th.textContent.trim());
        assert.deepEqual(cabecalho, ['ID / Título', 'Unidades', 'Ações']);

        const primeiraLinha = document.querySelector('#lista-estrutura-textual tr');
        assert.equal(primeiraLinha.querySelectorAll('td').length, 3);
        assert.match(primeiraLinha.innerHTML, /Quartetos · Proposição/);
        assert.doesNotMatch(primeiraLinha.innerHTML, /Volta/);
    });

    it('resumo de Unidades prioriza o nome quando preenchido, enumera item a item com quebra de linha', () => {
        db.poemas.push({ id: 1, titulo: 'Poema Único' });
        db.estruturasTextuais.push({
            id: 1,
            poemaId: 1,
            unidades: [
                {
                    id: 'u1',
                    nome: 'Presença e ausência',
                    unidadeEstrofica: 'Dísticos',
                    unidadeDiscursiva: 'Proposição',
                    posicao: { estrofes: [], versos: 'todos' },
                },
                {
                    id: 'u2',
                    nome: '',
                    unidadeEstrofica: 'Quartetos',
                    unidadeDiscursiva: 'Resolução',
                    posicao: { estrofes: [], versos: 'todos' },
                },
            ],
            eventos: [],
        });
        renderEstruturaTextual();

        const primeiraLinha = document.querySelector('#lista-estrutura-textual tr');
        const celulaUnidades = primeiraLinha.querySelectorAll('td')[1];
        const divs = Array.from(celulaUnidades.querySelectorAll('div')).map((d) =>
            d.textContent.trim(),
        );
        // Com nome preenchido, mostra o nome (não "Dísticos · Proposição");
        // sem nome, cai pro par estrófica·discursiva — cada um em sua
        // própria linha, numerado.
        assert.deepEqual(divs, ['1. Presença e ausência', '2. Quartetos · Resolução']);
    });

    it('sem nenhuma Unidade cadastrada, mostra o traço de "vazio" em vez de lista', () => {
        db.poemas.push({ id: 1, titulo: 'Poema Único' });
        db.estruturasTextuais.push({ id: 1, poemaId: 1, unidades: [], eventos: [] });
        renderEstruturaTextual();

        const primeiraLinha = document.querySelector('#lista-estrutura-textual tr');
        const celulaUnidades = primeiraLinha.querySelectorAll('td')[1];
        assert.equal(celulaUnidades.querySelectorAll('div').length, 0);
        assert.match(celulaUnidades.innerHTML, /—/);
    });
});
