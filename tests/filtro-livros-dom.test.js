import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Aba Livros: barra de busca e filtros (tipo, fase, situação editorial), a lista
// que o Ver do Livro usa para o "n de N" e os botões ▲▼ com filtro ligado.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const lerModal = (arquivo) =>
    fs.readFileSync(path.resolve(__dirname, '../modais', arquivo), 'utf8');

globalThis.fetch = async (url) => ({
    ok: true,
    status: 200,
    text: async () => lerModal(path.basename(url)),
});

document.body.innerHTML = `
    <main>
        <input type="search" id="filtro-busca-livros" />
        <select id="filtro-tipo-livros">
            <option value="">-- Todos os tipos --</option>
            <option value="Inéditos">Inéditos</option>
            <option value="Coletânea">Coletânea</option>
        </select>
        <select id="filtro-fase-livros"><option value="">-- Todas as fases --</option></select>
        <select id="filtro-situacao-livros">
            <option value="">-- Todas as situações --</option>
            <option value="em-circulacao">Em circulação</option>
            <option value="esgotado">Esgotado</option>
            <option value="nao-especificada">Não especificada</option>
        </select>
        <select id="filtro-publicacao-livros">
            <option value="">-- Publicados ou não --</option>
            <option value="publicado">Publicados</option>
            <option value="programado">Programados</option>
            <option value="nao-publicado">Não publicados</option>
        </select>
        <input type="text" id="filtro-data-livros" />
        <button id="limpar-filtros-livros" class="hidden">Limpar filtros</button>
        <span id="contagem-livros"></span>
        <div id="lista-livros"></div>
    </main>
    <div id="modais-container"></div>
`;

const { registrarModal } = await import('../js/modais.js');
const { db } = await import('../js/db.js');
const {
    renderLivros,
    getListaVisivelLivros,
    moverLivro,
    setBuscaLivros,
    setFiltroTipoLivros,
    setFiltroFaseLivros,
    setFiltroSituacaoLivros,
    setFiltroPublicacaoLivros,
    setFiltroDataLivros,
    limparFiltrosLivros,
} = await import('../js/render-listas.js');
const { abrirVisualizacaoLivro, navegarVisualizacaoLivro, registrarListaNavegacaoLivros } =
    await import('../js/visualizar-livro.js');

registrarModal('modal-visualizar-livro', 'modal-visualizar-livro.html', () => {});

const titulosNaTela = () =>
    Array.from(document.querySelectorAll('#lista-livros h4')).map((h) => h.textContent);
const contagem = () => document.getElementById('contagem-livros').textContent;
const botaoLimpar = () => document.getElementById('limpar-filtros-livros');
const opcoesDaFase = () =>
    Array.from(document.querySelectorAll('#filtro-fase-livros option')).map((o) => o.textContent);
const posicao = () =>
    `${document.getElementById('visualizar-livro-posicao').value} ${document.getElementById('visualizar-livro-total').textContent}`;
const tituloDoVer = () => document.getElementById('modal-visualizar-livro-titulo').innerText;

function dadosBase() {
    localStorage.clear();
    db.livros = [
        {
            id: 1,
            titulo: 'Água Viva',
            siglaOficial: 'AV',
            tipo: 'Inéditos',
            fase: 'Juventude',
            situacaoEditorial: 'em-circulacao',
            isbn13: '9788512345678',
            data: { ano: 2018 },
            sequencia: 1,
        },
        {
            id: 2,
            titulo: 'Poemas Reunidos',
            siglaOficial: 'PR',
            tipo: 'Coletânea',
            fase: 'Maturidade',
            situacaoEditorial: 'esgotado',
            data: { dia: 4, mes: 9, ano: 2021 },
            sequencia: 2,
        },
        { id: 3, titulo: 'Rascunhos', tipo: 'Inéditos', sequencia: 3 },
        {
            id: 4,
            titulo: 'Segunda Água',
            siglaOficial: 'SA',
            tipo: 'Inéditos',
            fase: 'Juventude',
            situacaoEditorial: 'esgotado',
            sequencia: 4,
        },
    ];
    db.partes = [];
    db.secoes = [];
    db.poemas = [];
    db.prosas = [];
    db.itensColetanea = [];
    limparFiltrosLivros();
}

describe('aba Livros: busca e filtros', () => {
    beforeEach(dadosBase);

    it('sem filtro mostra todos, sem contagem e sem botão Limpar', () => {
        renderLivros();
        assert.deepEqual(titulosNaTela(), [
            'Água Viva',
            'Poemas Reunidos',
            'Rascunhos',
            'Segunda Água',
        ]);
        assert.equal(contagem(), '');
        assert.ok(botaoLimpar().classList.contains('hidden'));
    });

    it('busca por título, sigla e ISBN', () => {
        setBuscaLivros('agua');
        assert.deepEqual(titulosNaTela(), ['Água Viva', 'Segunda Água']);
        assert.equal(contagem(), '2 de 4 livros');
        assert.ok(!botaoLimpar().classList.contains('hidden'));
        setBuscaLivros('PR');
        assert.deepEqual(titulosNaTela(), ['Poemas Reunidos']);
        setBuscaLivros('978-85-1234');
        assert.deepEqual(titulosNaTela(), ['Água Viva']);
    });

    it('tipo, situação e fase', () => {
        setFiltroTipoLivros('Coletânea');
        assert.deepEqual(titulosNaTela(), ['Poemas Reunidos']);
        setFiltroTipoLivros('');
        setFiltroSituacaoLivros('esgotado');
        assert.deepEqual(titulosNaTela(), ['Poemas Reunidos', 'Segunda Água']);
        setFiltroSituacaoLivros('nao-especificada');
        assert.deepEqual(titulosNaTela(), ['Rascunhos']);
        setFiltroSituacaoLivros('');
        setFiltroFaseLivros('Juventude');
        assert.deepEqual(titulosNaTela(), ['Água Viva', 'Segunda Água']);
    });

    it('os filtros se combinam', () => {
        setFiltroFaseLivros('Juventude');
        setFiltroSituacaoLivros('esgotado');
        assert.deepEqual(titulosNaTela(), ['Segunda Água']);
        setBuscaLivros('viva');
        assert.deepEqual(titulosNaTela(), []);
        assert.match(
            document.getElementById('lista-livros').textContent,
            /corresponde aos filtros/,
        );
        assert.equal(contagem(), '0 de 4 livros');
    });

    it('o select de fase lista só as fases usadas, e "Sem fase" quando há livro sem', () => {
        renderLivros();
        assert.deepEqual(opcoesDaFase(), [
            '-- Todas as fases --',
            'Juventude',
            'Maturidade',
            'Sem fase',
        ]);
        db.livros[2].fase = 'Infância';
        db.livros.splice(0, 0);
        renderLivros();
        assert.deepEqual(opcoesDaFase(), [
            '-- Todas as fases --',
            'Infância',
            'Juventude',
            'Maturidade',
        ]);
    });

    it('"Sem fase" filtra os livros sem fase', () => {
        renderLivros();
        setFiltroFaseLivros('__sem-fase__');
        assert.deepEqual(titulosNaTela(), ['Rascunhos']);
    });

    it('fase escolhida que deixou de existir volta para "todas" em vez de esconder tudo', () => {
        setFiltroFaseLivros('Maturidade');
        assert.deepEqual(titulosNaTela(), ['Poemas Reunidos']);
        db.livros[1].fase = 'Outra';
        renderLivros();
        assert.equal(titulosNaTela().length, 4);
        assert.equal(document.getElementById('filtro-fase-livros').value, '');
    });

    it('Limpar filtros zera busca, selects, contagem e botão', () => {
        setBuscaLivros('agua');
        setFiltroTipoLivros('Inéditos');
        document.getElementById('filtro-busca-livros').value = 'agua';
        document.getElementById('filtro-tipo-livros').value = 'Inéditos';
        limparFiltrosLivros();
        assert.equal(titulosNaTela().length, 4);
        assert.equal(document.getElementById('filtro-busca-livros').value, '');
        assert.equal(document.getElementById('filtro-tipo-livros').value, '');
        assert.equal(contagem(), '');
        assert.ok(botaoLimpar().classList.contains('hidden'));
    });

    it('sem nenhum livro cadastrado, a mensagem de sempre', () => {
        db.livros = [];
        renderLivros();
        assert.match(
            document.getElementById('lista-livros').textContent,
            /Nenhum livro encontrado/,
        );
    });

    it('HTML na busca não vira marcação (a lista é montada só com os dados)', () => {
        setBuscaLivros('<img src=x onerror=alert(1)>');
        assert.equal(document.querySelectorAll('#lista-livros img').length, 0);
    });
});

describe('aba Livros: filtro de publicação', () => {
    beforeEach(dadosBase);

    it('Programados pega só a data futura, e Publicados deixa de incluí-la', () => {
        db.livros[3].data = { ano: 2100 };
        setFiltroPublicacaoLivros('programado');
        assert.deepEqual(titulosNaTela(), ['Segunda Água']);
        setFiltroPublicacaoLivros('publicado');
        assert.deepEqual(titulosNaTela(), ['Água Viva', 'Poemas Reunidos']);
        setFiltroPublicacaoLivros('nao-publicado');
        assert.deepEqual(titulosNaTela(), ['Rascunhos']);
    });

    it('Publicados e Não publicados seguem a data de primeira publicação', () => {
        setFiltroPublicacaoLivros('publicado');
        assert.deepEqual(titulosNaTela(), ['Água Viva', 'Poemas Reunidos']);
        assert.equal(contagem(), '2 de 4 livros');
        setFiltroPublicacaoLivros('nao-publicado');
        assert.deepEqual(titulosNaTela(), ['Rascunhos', 'Segunda Água']);
        setFiltroPublicacaoLivros('');
        assert.equal(titulosNaTela().length, 4);
    });

    it('combina com os outros filtros e o Limpar zera', () => {
        setFiltroPublicacaoLivros('nao-publicado');
        setFiltroSituacaoLivros('esgotado');
        assert.deepEqual(titulosNaTela(), ['Segunda Água']);
        document.getElementById('filtro-publicacao-livros').value = 'nao-publicado';
        limparFiltrosLivros();
        assert.equal(document.getElementById('filtro-publicacao-livros').value, '');
        assert.equal(titulosNaTela().length, 4);
        assert.ok(botaoLimpar().classList.contains('hidden'));
    });

    it('preencher a data tira o livro de "Não publicados" ao redesenhar', () => {
        setFiltroPublicacaoLivros('nao-publicado');
        db.livros[2].data = { ano: 2024 };
        renderLivros();
        assert.deepEqual(titulosNaTela(), ['Segunda Água']);
    });

    it('a lista do Ver segue o filtro', () => {
        setFiltroPublicacaoLivros('publicado');
        assert.deepEqual(getListaVisivelLivros(), [1, 2]);
    });
});

describe('aba Livros: lista do Ver acompanha o filtro', () => {
    beforeEach(() => {
        dadosBase();
        registrarListaNavegacaoLivros(() => getListaVisivelLivros());
    });

    it('getListaVisivelLivros devolve só os que passam, na ordem dos cards', () => {
        setFiltroSituacaoLivros('esgotado');
        assert.deepEqual(getListaVisivelLivros(), [2, 4]);
    });

    it('o "n de N" do Ver segue a lista filtrada e Próximo pula os escondidos', async () => {
        setFiltroFaseLivros('Juventude');
        await abrirVisualizacaoLivro(4);
        assert.equal(tituloDoVer(), 'Segunda Água');
        assert.equal(posicao(), '2 de 2');
        navegarVisualizacaoLivro(-1);
        assert.equal(tituloDoVer(), 'Água Viva');
        assert.equal(posicao(), '1 de 2');
    });
});

describe('aba Livros: ▲▼ com filtro ligado', () => {
    beforeEach(dadosBase);

    const sequencias = () => Object.fromEntries(db.livros.map((l) => [l.id, l.sequencia]));

    it('sem filtro, troca com o vizinho de sempre', () => {
        moverLivro(3, 'up');
        assert.deepEqual(sequencias(), { 1: 1, 2: 3, 3: 2, 4: 4 });
    });

    it('com filtro, troca com o vizinho que aparece na tela', () => {
        setFiltroSituacaoLivros('esgotado'); // vê o 2 e o 4; o 3 fica escondido entre eles
        moverLivro(4, 'up');
        assert.deepEqual(sequencias(), { 1: 1, 2: 4, 3: 3, 4: 2 });
        assert.deepEqual(getListaVisivelLivros(), [4, 2]);
    });

    it('livro fora do filtro não se move, e as pontas não fazem nada', () => {
        setFiltroSituacaoLivros('esgotado');
        moverLivro(1, 'down');
        moverLivro(2, 'up');
        assert.deepEqual(sequencias(), { 1: 1, 2: 2, 3: 3, 4: 4 });
    });
});

describe('aba Livros: filtro de data de publicação (campo único)', () => {
    beforeEach(dadosBase);

    it('aceita ano, mês/ano, dia completo e período de anos', () => {
        setFiltroDataLivros('2018');
        assert.deepEqual(titulosNaTela(), ['Água Viva']);
        assert.equal(contagem(), '1 de 4 livros');
        setFiltroDataLivros('09/2021');
        assert.deepEqual(titulosNaTela(), ['Poemas Reunidos']);
        setFiltroDataLivros('04/09/2021');
        assert.deepEqual(titulosNaTela(), ['Poemas Reunidos']);
        setFiltroDataLivros('05/09/2021');
        assert.deepEqual(titulosNaTela(), []);
        setFiltroDataLivros('2018-2021');
        assert.deepEqual(titulosNaTela(), ['Água Viva', 'Poemas Reunidos']);
    });

    it('livro só com o ano aparece quando se filtra por mês desse ano', () => {
        setFiltroDataLivros('03/2018');
        assert.deepEqual(titulosNaTela(), ['Água Viva']);
    });

    it('texto incompleto não muda o filtro e marca o campo; vazio limpa', () => {
        const campo = document.getElementById('filtro-data-livros');
        setFiltroDataLivros('2018');
        setFiltroDataLivros('03/20');
        assert.deepEqual(titulosNaTela(), ['Água Viva']);
        assert.ok(campo.classList.contains('border-red-400'));
        setFiltroDataLivros('');
        assert.equal(titulosNaTela().length, 4);
        assert.ok(!campo.classList.contains('border-red-400'));
    });

    it('combina com os outros filtros e o Limpar zera o campo', () => {
        const campo = document.getElementById('filtro-data-livros');
        campo.value = '2021';
        setFiltroDataLivros('2021');
        setFiltroTipoLivros('Inéditos');
        assert.deepEqual(titulosNaTela(), []);
        limparFiltrosLivros();
        assert.equal(campo.value, '');
        assert.equal(titulosNaTela().length, 4);
    });
});
