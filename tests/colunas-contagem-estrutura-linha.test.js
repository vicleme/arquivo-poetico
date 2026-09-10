import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mesma base mínima de DOM de render-dom.test.js — só o que renderPoemas
// realmente toca (renderPoemas tolera elementos ausentes via getElementById
// + checagem de null, ver comentário lá).
document.body.innerHTML = `
    <main>
        <div id="lista-livros"></div>
        <div id="barra-acoes-poemas" class="hidden">
            <span id="contador-selecao-poemas"></span>
        </div>
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

const { db, sortPoemas } = await import('../js/db.js');
// Import como namespace (não desestruturado): `ordenacaoPoemas` é
// reatribuído dentro do módulo (não mutado in-place) a cada chamada de
// ordenarPor — desestruturar `{ ordenacaoPoemas }` de um `await import()`
// dinâmico congela o valor no momento do import (não é um live binding
// de verdade, ao contrário de um `import {...} from` estático), então
// teria ficado sempre lendo o valor inicial. Acessando via `rl.ordenacaoPoemas`
// sempre pegamos o valor atual.
const rl = await import('../js/render-listas.js');
const { renderPoemas, setFiltroLivroPoemas, ordenarPor, setItensPorPagina, setPaginaPoemas } = rl;
const { toggleColuna, resetarColunas } = await import('../js/colunas.js');
await import('../js/main.js');

// ordenacaoPoemas é módulo-level (persiste entre testes deste arquivo,
// já que não há como "reimportar" o módulo do zero) — garante que cada
// teste comece sempre em 'estrutura' asc, não importa em que estado o
// teste anterior deixou.
function resetarOrdenacao() {
    if (rl.ordenacaoPoemas.campo !== 'estrutura' || rl.ordenacaoPoemas.direcao !== 'asc') {
        ordenarPor('poemas', 'estrutura');
        if (rl.ordenacaoPoemas.campo !== 'estrutura' || rl.ordenacaoPoemas.direcao !== 'asc') {
            ordenarPor('poemas', 'estrutura');
        }
    }
}

function limparDb() {
    db.livros.length = 0;
    db.partes.length = 0;
    db.secoes.length = 0;
    db.poemas.length = 0;
    resetarColunas('poemas');
    setFiltroLivroPoemas('');
    setItensPorPagina('todos');
    resetarOrdenacao();
}

// Lê a coluna "meio" (excluindo checkbox e ID/Título) da linha `i`,
// pelo texto de cada <td> renderizada, na ordem em que colunasAtivas
// as monta.
function celulasLinha(i) {
    const linhas = document.querySelectorAll('#lista-poemas tr');
    return Array.from(linhas[i].querySelectorAll('td')).map((td) => td.textContent.trim());
}

describe('Coluna "Contagem de Poemas" (contagemTipo) — numeração pela estrutura do livro', () => {
    beforeEach(limparDb);

    it('conta 1..N na ordem estrutural, mesmo ordenando a tabela por outra coluna', () => {
        db.livros.push({ id: 1, titulo: 'Livro Único', sequencia: 1 });
        db.poemas.push(
            { id: 10, titulo: 'Zebra', paiTipo: 'livro', paiId: 1, sequencia: 3 },
            { id: 11, titulo: 'Abacate', paiTipo: 'livro', paiId: 1, sequencia: 1 },
            { id: 12, titulo: 'Manga', paiTipo: 'livro', paiId: 1, sequencia: 2 },
        );
        // sortPoemas roda normalmente em db.save() — aqui simulamos o
        // mesmo efeito direto, sem persistir: Abacate(1), Manga(2), Zebra(3).
        sortPoemas(db.poemas, db.livros, db.partes, db.secoes);

        toggleColuna('poemas', 'contagemTipo', true);
        toggleColuna('poemas', 'contagemLinha', true);

        // Ordem padrão (estrutura): Abacate, Manga, Zebra — contagemTipo
        // e contagemLinha devem coincidir aqui (1, 2, 3 pros dois).
        renderPoemas();
        assert.equal(document.querySelectorAll('#lista-poemas tr').length, 3);
        const titulos = Array.from(
            document.querySelectorAll('#lista-poemas tr td:nth-child(2)'),
        ).map((td) => td.textContent.trim());
        assert.ok(titulos[0].includes('Abacate'));
        assert.ok(titulos[1].includes('Manga'));
        assert.ok(titulos[2].includes('Zebra'));

        // Agora ordena por Título (alfabético asc): Abacate, Manga, Zebra
        // — mesma ordem por coincidência alfabética, então troca pra
        // Idioma (mesmo comparador alfabético, mas todos vazios = mantém
        // ordem) não muda nada; usamos Título DESC pra garantir reordenação
        // visível: Zebra, Manga, Abacate.
        ordenarPor('poemas', 'titulo'); // asc
        ordenarPor('poemas', 'titulo'); // desc
        renderPoemas();

        const titulosDesc = Array.from(
            document.querySelectorAll('#lista-poemas tr td:nth-child(2)'),
        ).map((td) => td.textContent.trim());
        assert.ok(titulosDesc[0].includes('Zebra'));
        assert.ok(titulosDesc[1].includes('Manga'));
        assert.ok(titulosDesc[2].includes('Abacate'));

        // contagemTipo "gruda" no item (posição na estrutura: Zebra=3,
        // Manga=2, Abacate=1), não na linha — contagemLinha sempre seria
        // 1,2,3 na ordem de exibição atual, o que aqui É a mesma coisa
        // (1,2,3), então usamos contagemTipo pra provar o desacoplamento.
        const linha0 = celulasLinha(0); // Zebra
        const linha1 = celulasLinha(1); // Manga
        const linha2 = celulasLinha(2); // Abacate
        // colunasAtivas por padrão inclui bem mais coisa; contagemTipo e
        // contagemLinha foram ligadas por último, então são as duas
        // últimas células do meio — mas a própria célula de Ações
        // (vazia, só com botões — sem texto) ainda vem depois delas,
        // então é a ÚLTIMA <td> da linha (índice length-1); contagemLinha
        // é length-2 e contagemTipo é length-3.
        const contagemTipoZebra = linha0[linha0.length - 3];
        const contagemTipoManga = linha1[linha1.length - 3];
        const contagemTipoAbacate = linha2[linha2.length - 3];
        assert.equal(contagemTipoZebra, '3');
        assert.equal(contagemTipoManga, '2');
        assert.equal(contagemTipoAbacate, '1');

        // contagemLinha, ao contrário, sempre seguindo a exibição atual:
        const contagemLinhaZebra = linha0[linha0.length - 2];
        const contagemLinhaManga = linha1[linha1.length - 2];
        const contagemLinhaAbacate = linha2[linha2.length - 2];
        assert.equal(contagemLinhaZebra, '1');
        assert.equal(contagemLinhaManga, '2');
        assert.equal(contagemLinhaAbacate, '3');
    });

    it('reinicia em 1 quando um livro é selecionado no filtro', () => {
        db.livros.push(
            { id: 1, titulo: 'Livro A', sequencia: 1 },
            { id: 2, titulo: 'Livro B', sequencia: 2 },
        );
        db.poemas.push(
            { id: 10, titulo: 'A1', paiTipo: 'livro', paiId: 1, sequencia: 1 },
            { id: 11, titulo: 'A2', paiTipo: 'livro', paiId: 1, sequencia: 2 },
            { id: 12, titulo: 'B1', paiTipo: 'livro', paiId: 2, sequencia: 1 },
        );
        sortPoemas(db.poemas, db.livros, db.partes, db.secoes);

        toggleColuna('poemas', 'contagemTipo', true);

        setFiltroLivroPoemas('2');
        renderPoemas();

        const linhas = document.querySelectorAll('#lista-poemas tr');
        assert.equal(linhas.length, 1, 'só o poema do Livro B deveria aparecer');
        const celulas = Array.from(linhas[0].querySelectorAll('td')).map((td) =>
            td.textContent.trim(),
        );
        // contagemTipo é a penúltima célula (só ela está ativa, ao lado
        // de Ações)
        assert.equal(celulas[celulas.length - 2], '1', 'reinicia em 1 dentro do livro filtrado');
    });
});

describe('Coluna "Contagem de Linhas" (contagemLinha) — numeração da exibição, com paginação', () => {
    beforeEach(limparDb);

    it('continua contando através das páginas (não reinicia a cada página)', () => {
        db.livros.push({ id: 1, titulo: 'Livro Único', sequencia: 1 });
        for (let i = 1; i <= 5; i++) {
            db.poemas.push({
                id: i,
                titulo: `Poema ${i}`,
                paiTipo: 'livro',
                paiId: 1,
                sequencia: i,
            });
        }
        sortPoemas(db.poemas, db.livros, db.partes, db.secoes);

        toggleColuna('poemas', 'contagemLinha', true);
        setItensPorPagina('2');

        setPaginaPoemas(1);
        renderPoemas();
        let linhas = document.querySelectorAll('#lista-poemas tr');
        let ultimaCelula = (tr) => tr.querySelectorAll('td');
        assert.equal(linhas.length, 2);
        assert.equal(
            ultimaCelula(linhas[0])[ultimaCelula(linhas[0]).length - 2].textContent.trim(),
            '1',
        );
        assert.equal(
            ultimaCelula(linhas[1])[ultimaCelula(linhas[1]).length - 2].textContent.trim(),
            '2',
        );

        setPaginaPoemas(2);
        renderPoemas();
        linhas = document.querySelectorAll('#lista-poemas tr');
        assert.equal(linhas.length, 2);
        assert.equal(
            ultimaCelula(linhas[0])[ultimaCelula(linhas[0]).length - 2].textContent.trim(),
            '3',
            'terceiro item no total, primeiro da página 2',
        );
        assert.equal(
            ultimaCelula(linhas[1])[ultimaCelula(linhas[1]).length - 2].textContent.trim(),
            '4',
        );
    });
});
