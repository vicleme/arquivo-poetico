import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Modal "Ver" de Elemento textual: conteúdo por tipo, botão no card e navegação
// Anterior/Próximo/[n] de N na ordem e com os filtros dos cards, com Editar e
// Excluir no rodapé.

// happy-dom não tem IndexedDB: um `open` que nunca responde deixa o preencherCapas
// esperando em silêncio, em vez de gerar uma rejeição solta depois do teste.
globalThis.indexedDB = { open: () => ({}) };

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
        <select id="filtro-livro-elementos"></select>
        <select id="filtro-tipo-elementos"></select>
        <div id="lista-elementos"></div>
    </main>
    <div id="modais-container"></div>
`;

const { registrarModal, toggleModal } = await import('../js/modais.js');
const { db } = await import('../js/db.js');
const {
    renderElementos,
    getListaVisivelElementos,
    setFiltroTipoElementos,
    setFiltroLivroElementos,
} = await import('../js/render-listas.js');
const {
    abrirVisualizacaoElemento,
    navegarVisualizacaoElemento,
    irParaPosicaoVisualizacaoElemento,
    editarElementoDoVisualizador,
    excluirElementoDoVisualizador,
    registrarListaNavegacaoElemento,
    renderVisualizacaoElementoHtml,
    resolverVinculoElemento,
} = await import('../js/visualizar-elemento.js');

registrarModal('modal-visualizar-elemento', 'modal-visualizar-elemento.html', () => {});

const titulo = () => document.getElementById('modal-visualizar-elemento-titulo').innerText;
const posicao = () =>
    `${document.getElementById('visualizar-elemento-posicao').value} ${document.getElementById('visualizar-elemento-total').textContent}`;
const aberto = () =>
    !document.getElementById('modal-visualizar-elemento').classList.contains('hidden');
const conteudo = () => document.getElementById('visualizar-elemento-conteudo');
const tick = () => new Promise((r) => setTimeout(r, 20));

function dadosBase() {
    localStorage.clear();
    setFiltroLivroElementos('');
    setFiltroTipoElementos('');
    db.livros = [{ id: 1, titulo: 'Livro Um', tipo: 'Livro', sequencia: 1 }];
    db.partes = [{ id: 11, livroId: 1, titulo: 'Parte A', sequencia: 1 }];
    db.secoes = [
        { id: 21, paiTipo: 'parte', paiId: 11, titulo: 'Seção Y', sequencia: 1 },
        { id: 22, paiTipo: 'livro', paiId: 1, titulo: 'Seção Z', sequencia: 3 },
    ];
    db.poemas = [];
    db.prosas = [];
    db.itensColetanea = [];
    db.elementos = [
        {
            id: 40,
            paiTipo: 'livro',
            paiId: 1,
            tipo: 'Introdução',
            titulo: 'Intro',
            sequencia: 1,
            texto: 'Texto da introdução',
            avisoConteudo: 'Aviso de gatilho',
            versosPosIntroducao: 'Verso depois',
            notas: 'Nota de contexto',
        },
        {
            id: 41,
            paiTipo: 'parte',
            paiId: 11,
            tipo: 'Epígrafe',
            titulo: 'Epi',
            sequencia: 1,
            texto: 'Uma epígrafe',
        },
        {
            id: 42,
            paiTipo: 'secao',
            paiId: 21,
            tipo: 'Sumário',
            titulo: 'Sum',
            sequencia: 1,
            itensSumario: Array.from({ length: 8 }, (_, i) => ({
                nivel: i % 2 === 0 ? 1 : 2,
                item: `Item ${i + 1}`,
                pagina: String(i + 10),
            })),
        },
        {
            id: 43,
            paiTipo: 'livro',
            paiId: 1,
            tipo: 'Ficha catalográfica',
            titulo: 'Ficha',
            sequencia: 2,
            fichaCdd: 'B869.1',
            fichaNumeroControle: '123-45',
            fichaBibliotecario: 'Maria Souza',
            fichaCrb: 'CRB-8/9253',
            fichaUrl: 'https://exemplo.com/ficha',
        },
    ];
    document.querySelectorAll('.fixed[id^="modal-"]').forEach((m) => m.classList.add('hidden'));
    document.getElementById('modal-elemento')?.remove();
}

describe('modal Ver de Elemento: marcação', () => {
    it('ligações e ids do modal', () => {
        const html = lerModal('modal-visualizar-elemento.html');
        assert.match(html, /id="modal-visualizar-elemento"/);
        assert.match(html, /navegarVisualizacaoElemento\(-1\)/);
        assert.match(html, /navegarVisualizacaoElemento\(1\)/);
        assert.match(html, /irParaPosicaoVisualizacaoElemento\(this\.value\)/);
        assert.match(html, /editarElementoDoVisualizador\(\)/);
        assert.match(html, /excluirElementoDoVisualizador\(\)/);
        assert.match(html, /id="visualizar-elemento-conteudo"/);
        assert.match(html, /id="visualizar-elemento-nav"/);
        assert.doesNotMatch(html, /ivro|eção|secao/);
    });
});

describe('resolverVinculoElemento', () => {
    beforeEach(dadosBase);

    it('ligado ao Livro: só o Livro', () => {
        const v = resolverVinculoElemento(db.elementos[0], db);
        assert.equal(v.livro.titulo, 'Livro Um');
        assert.equal(v.parte, null);
        assert.equal(v.secao, null);
    });

    it('ligado a uma Parte: Parte e Livro', () => {
        const v = resolverVinculoElemento(db.elementos[1], db);
        assert.equal(v.parte.titulo, 'Parte A');
        assert.equal(v.livro.titulo, 'Livro Um');
        assert.equal(v.secao, null);
    });

    it('ligado a uma Seção de Parte: Seção, Parte e Livro', () => {
        const v = resolverVinculoElemento(db.elementos[2], db);
        assert.equal(v.secao.titulo, 'Seção Y');
        assert.equal(v.parte.titulo, 'Parte A');
        assert.equal(v.livro.titulo, 'Livro Um');
    });

    it('ligado a uma Seção do Livro: Seção e Livro, sem Parte', () => {
        const v = resolverVinculoElemento({ paiTipo: 'secao', paiId: 22 }, db);
        assert.equal(v.secao.titulo, 'Seção Z');
        assert.equal(v.parte, null);
        assert.equal(v.livro.titulo, 'Livro Um');
    });

    it('pai que não existe mais: tudo nulo, sem erro', () => {
        const v = resolverVinculoElemento({ paiTipo: 'parte', paiId: 999 }, db);
        assert.deepEqual(v, { livro: null, parte: null, secao: null });
    });
});

describe('renderVisualizacaoElementoHtml', () => {
    beforeEach(dadosBase);
    const html = (el) =>
        renderVisualizacaoElementoHtml(el, { vinculo: resolverVinculoElemento(el, db) });

    it('Introdução: tipo, vínculo, sequência, aviso, texto, versos e notas', () => {
        const h = html(db.elementos[0]);
        assert.match(h, /Tipo:<\/strong> Introdução/);
        assert.match(h, /Livro:<\/strong> Livro Um/);
        assert.match(h, /Sequência:<\/strong> 1/);
        assert.match(h, /Aviso de conteúdo/);
        assert.match(h, /Aviso de gatilho/);
        assert.match(h, /Texto da introdução/);
        assert.match(h, /Versos pós-Introdução/);
        assert.match(h, /Verso depois/);
        assert.match(h, /Notas de contexto/);
        assert.match(h, /Nota de contexto/);
    });

    it('Seção dentro de Parte mostra Livro, Parte e Seção', () => {
        const h = html(db.elementos[2]);
        assert.match(h, /Livro:<\/strong> Livro Um/);
        assert.match(h, /Parte:<\/strong> Parte A/);
        assert.match(h, /Seção:<\/strong> Seção Y/);
    });

    it('campos vazios não aparecem', () => {
        const h = html(db.elementos[1]);
        assert.doesNotMatch(h, /Aviso de conteúdo/);
        assert.doesNotMatch(h, /Versos pós-Introdução/);
        assert.doesNotMatch(h, /Notas de contexto/);
        assert.doesNotMatch(h, /Imagem:/);
        assert.doesNotMatch(h, /data-capa-id/);
        assert.doesNotMatch(h, /Itens do sumário/);
        assert.doesNotMatch(h, /CDD/);
        assert.match(h, /Uma epígrafe/);
    });

    it('dado de outro tipo que sobrou no registro não aparece', () => {
        const h = html({
            ...db.elementos[1],
            avisoConteudo: 'Resto de Introdução',
            versosPosIntroducao: 'Resto de versos',
            fichaCdd: 'X-1',
            itensSumario: [{ nivel: 1, item: 'Fantasma', pagina: '1' }],
        });
        assert.doesNotMatch(h, /Resto de Introdução/);
        assert.doesNotMatch(h, /Resto de versos/);
        assert.doesNotMatch(h, /X-1/);
        assert.doesNotMatch(h, /Fantasma/);
    });

    it('Ficha catalográfica: CDD, controle, bibliotecário(a) com CRB e link', () => {
        const h = html(db.elementos[3]);
        assert.match(h, /CDD:<\/strong> B869\.1/);
        assert.match(h, /Número de controle \(CIP\):<\/strong> 123-45/);
        assert.match(h, /Bibliotecário\(a\):<\/strong> Maria Souza, CRB-8\/9253/);
        assert.match(h, /href="https:\/\/exemplo\.com\/ficha"/);
    });

    it('link da ficha só vira link com http ou https', () => {
        const h = html({ ...db.elementos[3], fichaUrl: 'javascript:alert(1)' });
        assert.doesNotMatch(h, /javascript:/);
        assert.doesNotMatch(h, /Abrir link da ficha/);
    });

    it('Sumário: todos os itens (sem o limite do card), com recuo por nível', () => {
        const h = html(db.elementos[2]);
        assert.match(h, /Itens do sumário \(8\)/);
        for (let i = 1; i <= 8; i++) assert.match(h, new RegExp(`Item ${i}<`));
        assert.match(h, /padding-left:0px/);
        assert.match(h, /padding-left:16px/);
    });

    it('imagem e link da imagem aparecem quando há', () => {
        const h = html({
            id: 1,
            tipo: 'Respiro (Imagem)',
            paiTipo: 'livro',
            paiId: 1,
            imagem: 'abc',
            imagemUrl: 'https://exemplo.com/p.png',
        });
        assert.match(h, /data-capa-id="abc"/);
        assert.match(h, /exemplo\.com\/p\.png/);
    });

    it('escapa HTML em título, notas e nomes', () => {
        const h = html({
            id: 1,
            tipo: 'Introdução',
            titulo: '<b>x</b>',
            notas: '<script>1</script>',
            avisoConteudo: '<i>aviso</i>',
            paiTipo: 'livro',
            paiId: 1,
        });
        assert.doesNotMatch(h, /<script>1/);
        assert.doesNotMatch(h, /<i>aviso<\/i>/);
        assert.doesNotMatch(h, /<b>x<\/b>/);
    });
});

describe('cards: botão Ver e lista de navegação', () => {
    beforeEach(dadosBase);

    it('botão Ver e ordem da lista iguais aos cards', () => {
        renderElementos();
        const ordem = [...document.querySelectorAll('[data-action="ver-elemento"]')].map((b) =>
            Number(b.dataset.id),
        );
        assert.equal(ordem.length, 4);
        assert.deepEqual(getListaVisivelElementos(), ordem);
    });

    it('a lista acompanha o filtro por tipo e por livro', () => {
        setFiltroTipoElementos('Epígrafe');
        assert.deepEqual(getListaVisivelElementos(), [41]);
        setFiltroTipoElementos('');
        db.livros.push({ id: 2, titulo: 'Livro Dois', tipo: 'Livro', sequencia: 2 });
        db.elementos.push({ id: 44, paiTipo: 'livro', paiId: 2, tipo: 'Pórtico', sequencia: 1 });
        setFiltroLivroElementos('2');
        assert.deepEqual(getListaVisivelElementos(), [44]);
    });
});

describe('Ver de Elemento: navegação', () => {
    beforeEach(() => {
        dadosBase();
        registrarListaNavegacaoElemento(() => getListaVisivelElementos());
    });

    it('abre no Elemento certo, com "n de N" na ordem dos cards', async () => {
        const lista = getListaVisivelElementos();
        await abrirVisualizacaoElemento(lista[1]);
        assert.ok(aberto());
        const el = db.elementos.find((e) => e.id === lista[1]);
        assert.equal(titulo(), el.titulo);
        assert.equal(posicao(), '2 de 4');
    });

    it('sem título, o cabeçalho mostra o tipo', async () => {
        db.elementos[1].titulo = '';
        await abrirVisualizacaoElemento(41);
        assert.equal(titulo(), 'Epígrafe');
    });

    it('Anterior e Próximo andam pela lista e desabilitam nas pontas', async () => {
        const lista = getListaVisivelElementos();
        await abrirVisualizacaoElemento(lista[0]);
        assert.ok(document.getElementById('visualizar-elemento-anterior').disabled);
        navegarVisualizacaoElemento(1);
        assert.equal(posicao(), '2 de 4');
        navegarVisualizacaoElemento(1);
        navegarVisualizacaoElemento(1);
        assert.equal(posicao(), '4 de 4');
        assert.ok(document.getElementById('visualizar-elemento-proximo').disabled);
        navegarVisualizacaoElemento(1);
        assert.equal(posicao(), '4 de 4', 'na ponta não dá a volta');
    });

    it('a caixa de posição vai direto e corrige o que está fora da faixa', async () => {
        const lista = getListaVisivelElementos();
        await abrirVisualizacaoElemento(lista[0]);
        irParaPosicaoVisualizacaoElemento('3');
        assert.equal(posicao(), '3 de 4');
        irParaPosicaoVisualizacaoElemento('99');
        assert.equal(posicao(), '4 de 4');
        irParaPosicaoVisualizacaoElemento('1');
        assert.equal(posicao(), '1 de 4');
    });

    it('pula item que deixou de existir', async () => {
        const lista = getListaVisivelElementos();
        await abrirVisualizacaoElemento(lista[0]);
        db.elementos = db.elementos.filter((e) => e.id !== lista[1]);
        navegarVisualizacaoElemento(1);
        const el = db.elementos.find((e) => e.id === lista[2]);
        assert.equal(titulo(), el.titulo);
    });

    it('com a lista filtrada, a navegação só anda pelo que o card mostra', async () => {
        setFiltroTipoElementos('Epígrafe');
        await abrirVisualizacaoElemento(41);
        assert.ok(document.getElementById('visualizar-elemento-nav').classList.contains('hidden'));
    });

    it('com navegar: false a navegação fica escondida; id inexistente não abre', async () => {
        await abrirVisualizacaoElemento(41, { navegar: false });
        assert.ok(document.getElementById('visualizar-elemento-nav').classList.contains('hidden'));
        document.getElementById('modal-visualizar-elemento').classList.add('hidden');
        await abrirVisualizacaoElemento(999);
        assert.ok(!aberto());
    });

    it('o texto inteiro aparece no Ver (o card corta em 3 linhas)', async () => {
        await abrirVisualizacaoElemento(40);
        assert.match(conteudo().innerHTML, /Texto da introdução/);
        assert.match(conteudo().innerHTML, /Aviso de gatilho/);
    });
});

describe('Ver de Elemento: retorno', () => {
    beforeEach(() => {
        dadosBase();
        registrarListaNavegacaoElemento(() => getListaVisivelElementos());
    });

    it('`retorno` roda uma vez ao fechar o Ver', async () => {
        let vezes = 0;
        await abrirVisualizacaoElemento(41, { navegar: false, retorno: () => vezes++ });
        await toggleModal('modal-visualizar-elemento');
        await tick();
        assert.equal(vezes, 1);
        await abrirVisualizacaoElemento(41, { navegar: false });
        await toggleModal('modal-visualizar-elemento');
        await tick();
        assert.equal(vezes, 1, 'uma abertura nova sem retorno apaga o retorno antigo');
    });
});

describe('Ver de Elemento: voltar do Editar', () => {
    beforeEach(() => {
        dadosBase();
        registrarListaNavegacaoElemento(() => getListaVisivelElementos());
    });

    // O formulário real não monta no ambiente de teste (o modal de edição não é
    // registrado aqui): o editar falha depois de registrar a volta, então o
    // fechamento é simulado com um elemento no lugar do modal.
    const editarEFechar = async () => {
        await editarElementoDoVisualizador().catch(() => {});
        assert.ok(!aberto(), 'o Ver fecha ao ir editar');
        const stub = document.createElement('div');
        stub.id = 'modal-elemento';
        stub.className = 'fixed';
        document.body.appendChild(stub);
        await toggleModal('modal-elemento');
        await tick();
    };

    it('ao fechar o formulário, o Ver do mesmo Elemento reabre, na mesma lista', async () => {
        const lista = getListaVisivelElementos();
        await abrirVisualizacaoElemento(lista[1]);
        await editarEFechar();
        assert.ok(aberto());
        assert.equal(titulo(), db.elementos.find((e) => e.id === lista[1]).titulo);
        assert.equal(posicao(), '2 de 4');
    });

    it('só vale uma vez', async () => {
        await abrirVisualizacaoElemento(41);
        await editarEFechar();
        document.getElementById('modal-visualizar-elemento').classList.add('hidden');
        document.getElementById('modal-elemento').classList.remove('hidden');
        await toggleModal('modal-elemento');
        await tick();
        assert.ok(!aberto());
    });
});

describe('Ver de Elemento: Excluir', () => {
    beforeEach(() => {
        dadosBase();
        registrarListaNavegacaoElemento(() => getListaVisivelElementos());
    });
    const confirmar = () => document.getElementById('excl-confirmar').click();

    it('confirmada a exclusão, vai para o próximo e o total diminui', async () => {
        const lista = getListaVisivelElementos();
        await abrirVisualizacaoElemento(lista[1]);
        const antes = titulo();
        excluirElementoDoVisualizador();
        assert.equal(titulo(), antes, 'antes de confirmar nada muda');
        confirmar();
        await tick();
        assert.equal(titulo(), db.elementos.find((e) => e.id === lista[2]).titulo);
        assert.equal(posicao(), '2 de 3');
        assert.ok(db.elementos.every((e) => e.id !== lista[1]));
    });

    it('se era o último, vai para o anterior', async () => {
        const lista = getListaVisivelElementos();
        await abrirVisualizacaoElemento(lista[3]);
        excluirElementoDoVisualizador();
        confirmar();
        await tick();
        assert.equal(titulo(), db.elementos.find((e) => e.id === lista[2]).titulo);
    });

    it('sem outro Elemento, fecha o modal depois de excluir', async () => {
        db.elementos = [db.elementos[0]];
        await abrirVisualizacaoElemento(40);
        excluirElementoDoVisualizador();
        confirmar();
        await tick();
        assert.ok(!aberto());
    });

    it('cancelar não exclui nem muda o modal', async () => {
        await abrirVisualizacaoElemento(41);
        excluirElementoDoVisualizador();
        document.getElementById('excl-cancelar')?.click();
        await tick();
        assert.equal(db.elementos.length, 4);
        assert.equal(titulo(), 'Epi');
    });
});
