import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Modal "Ver" de Parte e de Seção: conteúdo, Estrutura, botão no card e navegação
// Anterior/Próximo/[n] de N na ordem dos cards, com Editar e Excluir no rodapé.

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
        <select id="filtro-livro-partes"></select>
        <div id="lista-partes"></div>
        <select id="filtro-livro-secoes"></select>
        <select id="filtro-parte-secoes"></select>
        <div id="lista-secoes"></div>
    </main>
    <div id="modais-container"></div>
`;

const { registrarModal, toggleModal } = await import('../js/modais.js');
const { db } = await import('../js/db.js');
const { renderPartes, renderSecoes, getListaVisivelPartes, getListaVisivelSecoes } =
    await import('../js/render-listas.js');
const {
    abrirVisualizacaoParteSecao,
    navegarVisualizacaoParteSecao,
    irParaPosicaoVisualizacaoParteSecao,
    editarParteSecaoDoVisualizador,
    excluirParteSecaoDoVisualizador,
    registrarListaNavegacaoParteSecao,
    renderVisualizacaoParteHtml,
    renderVisualizacaoSecaoHtml,
    textoContagemEstrutura,
} = await import('../js/visualizar-parte-secao.js');
const { montarArvoreDaParte, montarArvoreDaSecao } = await import('../js/estrutura-livro.js');

registrarModal('modal-visualizar-parte', 'modal-visualizar-parte.html', () => {});
registrarModal('modal-visualizar-secao', 'modal-visualizar-secao.html', () => {});

const titulo = (t) => document.getElementById(`modal-visualizar-${t}-titulo`).innerText;
const posicao = (t) =>
    `${document.getElementById(`visualizar-${t}-posicao`).value} ${document.getElementById(`visualizar-${t}-total`).textContent}`;
const aberto = (t) =>
    !document.getElementById(`modal-visualizar-${t}`).classList.contains('hidden');
const conteudo = (t) => document.getElementById(`visualizar-${t}-conteudo`);
const tick = () => new Promise((r) => setTimeout(r, 20));

function dadosBase() {
    localStorage.clear();
    db.livros = [{ id: 1, titulo: 'Livro Um', tipo: 'Livro', sequencia: 1 }];
    db.partes = [
        { id: 10, livroId: 1, titulo: 'Parte C', sequencia: 3 },
        { id: 11, livroId: 1, titulo: 'Parte A', sequencia: 1, abertura: 'Primeiras linhas' },
        { id: 12, livroId: 1, titulo: 'Parte B', sequencia: 2 },
    ];
    db.secoes = [
        { id: 20, paiTipo: 'parte', paiId: 11, titulo: 'Seção X', sequencia: 2 },
        { id: 21, paiTipo: 'parte', paiId: 11, titulo: 'Seção Y', sequencia: 1 },
        { id: 22, paiTipo: 'livro', paiId: 1, titulo: 'Seção Z', sequencia: 1 },
    ];
    db.poemas = [{ id: 30, titulo: 'Poema 1', paiTipo: 'secao', paiId: 21, sequencia: 1 }];
    db.prosas = [];
    db.elementos = [];
    db.itensColetanea = [];
    document.querySelectorAll('.fixed[id^="modal-"]').forEach((m) => m.classList.add('hidden'));
    ['modal-parte', 'modal-secao'].forEach((id) => document.getElementById(id)?.remove());
}

describe('modais Ver de Parte e Seção: marcação', () => {
    for (const tipo of ['parte', 'secao']) {
        it(`${tipo}: ligações e ids do modal`, () => {
            const html = lerModal(`modal-visualizar-${tipo}.html`);
            assert.match(html, new RegExp(`id="modal-visualizar-${tipo}"`));
            assert.match(html, new RegExp(`navegarVisualizacaoParteSecao\\('${tipo}', -1\\)`));
            assert.match(html, new RegExp(`navegarVisualizacaoParteSecao\\('${tipo}', 1\\)`));
            assert.match(html, new RegExp(`editarParteSecaoDoVisualizador\\('${tipo}'\\)`));
            assert.match(html, new RegExp(`excluirParteSecaoDoVisualizador\\('${tipo}'\\)`));
            assert.match(html, new RegExp(`id="visualizar-${tipo}-conteudo"`));
            assert.doesNotMatch(html, /ivro/);
        });
    }
});

describe('estrutura: árvore de uma Parte e de uma Seção', () => {
    beforeEach(dadosBase);

    it('a Parte traz as Seções dela, em ordem, com o que há dentro', () => {
        const { arvore, vinculados } = montarArvoreDaParte(db, 11);
        assert.deepEqual(
            arvore.map((n) => n.dados.titulo),
            ['Seção Y', 'Seção X'],
        );
        assert.deepEqual(
            arvore[0].filhos.map((n) => n.dados.titulo),
            ['Poema 1'],
        );
        assert.deepEqual(vinculados, []);
    });

    it('a Seção traz só o conteúdo dela', () => {
        const { arvore } = montarArvoreDaSecao(db, 21);
        assert.deepEqual(
            arvore.map((n) => n.dados.titulo),
            ['Poema 1'],
        );
    });
});

describe('renderVisualizacaoParteHtml e Seção', () => {
    beforeEach(dadosBase);

    it('Parte: livro, sequência, abertura, estrutura e contagem', () => {
        const html = renderVisualizacaoParteHtml(db.partes[1], {
            livro: db.livros[0],
            estrutura: montarArvoreDaParte(db, 11),
        });
        assert.match(html, /Livro:<\/strong> Livro Um/);
        assert.match(html, /Sequência:<\/strong> 1/);
        assert.match(html, /Primeiras linhas/);
        assert.match(html, /data-estrutura-livro/);
        assert.match(html, /Contém 2 seções e 1 poema\./);
    });

    it('campos vazios não aparecem (sem Abertura, sem descrição, sem link)', () => {
        const html = renderVisualizacaoParteHtml(db.partes[0], {
            livro: db.livros[0],
            estrutura: montarArvoreDaParte(db, 10),
        });
        assert.doesNotMatch(html, /Abertura/);
        assert.doesNotMatch(html, /Descrição da capa/);
        assert.doesNotMatch(html, /Imagem:/);
        assert.doesNotMatch(html, /data-estrutura-livro/);
        assert.match(html, /Ainda sem seções, textos nem elementos\./);
    });

    it('imagem, link da imagem (só http) e descrição da capa aparecem quando há', () => {
        const html = renderVisualizacaoParteHtml(
            {
                id: 1,
                titulo: 'P',
                capa: 'abc',
                imagemUrl: 'https://exemplo.com/p.png',
                capaDesc: 'Uma descrição',
            },
            { livro: null, estrutura: { arvore: [], vinculados: [] } },
        );
        assert.match(html, /data-capa-id="abc"/);
        assert.match(html, /exemplo\.com\/p\.png/);
        assert.match(html, /Descrição da capa/);
        assert.match(html, /Uma descrição/);
    });

    it('Seção dentro de Parte mostra Parte e Livro; ligada ao Livro, só o Livro', () => {
        const emParte = renderVisualizacaoSecaoHtml(db.secoes[0], {
            pai: db.partes[1],
            livro: db.livros[0],
            estrutura: montarArvoreDaSecao(db, 20),
        });
        assert.match(emParte, /Parte:<\/strong> Parte A/);
        assert.match(emParte, /Livro:<\/strong> Livro Um/);
        assert.match(emParte, /Posição:<\/strong> 2/);
        const noLivro = renderVisualizacaoSecaoHtml(db.secoes[2], {
            pai: db.livros[0],
            livro: db.livros[0],
            estrutura: montarArvoreDaSecao(db, 22),
        });
        assert.doesNotMatch(noLivro, /Parte:/);
        assert.match(noLivro, /Livro:<\/strong> Livro Um/);
    });

    it('escapa HTML em título, abertura e nomes', () => {
        const html = renderVisualizacaoParteHtml(
            { id: 1, titulo: '<b>x</b>', abertura: '<script>1</script>' },
            { livro: { titulo: '<i>L</i>' }, estrutura: null },
        );
        assert.doesNotMatch(html, /<script>1/);
        assert.doesNotMatch(html, /<i>L<\/i>/);
    });

    it('textoContagemEstrutura junta os tipos com vírgula e "e"', () => {
        const est = {
            arvore: [
                { tipo: 'secao', dados: {}, filhos: [] },
                { tipo: 'poema', dados: {} },
                { tipo: 'prosa', dados: {} },
                { tipo: 'elemento', dados: {} },
            ],
        };
        assert.equal(textoContagemEstrutura(est), 'Contém 1 seção, 1 poema, 1 prosa e 1 elemento.');
    });
});

describe('cards: botão Ver e lista de navegação', () => {
    beforeEach(dadosBase);

    it('Parte: botão Ver e ordem da lista iguais aos cards', () => {
        renderPartes();
        const ordem = [...document.querySelectorAll('[data-action="ver-parte"]')].map((b) =>
            Number(b.dataset.id),
        );
        assert.deepEqual(ordem, [11, 12, 10]);
        assert.deepEqual(getListaVisivelPartes(), ordem);
    });

    it('Seção: botão Ver e ordem da lista iguais aos cards', () => {
        renderSecoes();
        const ordem = [...document.querySelectorAll('[data-action="ver-secao"]')].map((b) =>
            Number(b.dataset.id),
        );
        assert.equal(ordem.length, 3);
        assert.deepEqual(getListaVisivelSecoes(), ordem);
    });

    it('Parte de Coletânea fica fora da lista (vive na aba Coletâneas)', () => {
        db.livros.push({ id: 2, titulo: 'Col', tipo: 'Coletânea', sequencia: 2 });
        db.partes.push({ id: 13, livroId: 2, titulo: 'Parte de col', sequencia: 1 });
        assert.deepEqual(getListaVisivelPartes(), [11, 12, 10]);
    });
});

describe('Ver de Parte: navegação', () => {
    beforeEach(() => {
        dadosBase();
        registrarListaNavegacaoParteSecao('parte', () => getListaVisivelPartes());
    });

    it('abre na Parte certa, com "n de N" na ordem dos cards', async () => {
        await abrirVisualizacaoParteSecao('parte', 12);
        assert.ok(aberto('parte'));
        assert.equal(titulo('parte'), 'Parte B');
        assert.equal(posicao('parte'), '2 de 3');
    });

    it('Anterior e Próximo andam pela lista e desabilitam nas pontas', async () => {
        await abrirVisualizacaoParteSecao('parte', 11);
        assert.ok(document.getElementById('visualizar-parte-anterior').disabled);
        navegarVisualizacaoParteSecao('parte', 1);
        assert.equal(titulo('parte'), 'Parte B');
        navegarVisualizacaoParteSecao('parte', 1);
        assert.equal(titulo('parte'), 'Parte C');
        assert.ok(document.getElementById('visualizar-parte-proximo').disabled);
        navegarVisualizacaoParteSecao('parte', 1);
        assert.equal(titulo('parte'), 'Parte C', 'na ponta não dá a volta');
    });

    it('a caixa de posição vai direto e corrige o que está fora da faixa', async () => {
        await abrirVisualizacaoParteSecao('parte', 11);
        irParaPosicaoVisualizacaoParteSecao('parte', '3');
        assert.equal(titulo('parte'), 'Parte C');
        irParaPosicaoVisualizacaoParteSecao('parte', '99');
        assert.equal(titulo('parte'), 'Parte C');
        irParaPosicaoVisualizacaoParteSecao('parte', '1');
        assert.equal(titulo('parte'), 'Parte A');
    });

    it('pula item que deixou de existir', async () => {
        await abrirVisualizacaoParteSecao('parte', 11);
        db.partes = db.partes.filter((p) => p.id !== 12);
        navegarVisualizacaoParteSecao('parte', 1);
        assert.equal(titulo('parte'), 'Parte C');
    });

    it('com navegar: false a navegação fica escondida; id inexistente não abre', async () => {
        await abrirVisualizacaoParteSecao('parte', 12, { navegar: false });
        assert.ok(document.getElementById('visualizar-parte-nav').classList.contains('hidden'));
        document.getElementById('modal-visualizar-parte').classList.add('hidden');
        await abrirVisualizacaoParteSecao('parte', 999);
        assert.ok(!aberto('parte'));
    });

    it('mostra a Estrutura da Parte com as Seções dela', async () => {
        await abrirVisualizacaoParteSecao('parte', 11);
        const titulos = [...conteudo('parte').querySelectorAll('[data-estrutura-no] summary')].map(
            (s) => s.textContent,
        );
        assert.ok(titulos.some((t) => t.includes('Seção X')));
        assert.ok(titulos.some((t) => t.includes('Seção Y')));
    });
});

describe('Ver de Seção: navegação e conteúdo', () => {
    beforeEach(() => {
        dadosBase();
        registrarListaNavegacaoParteSecao('secao', () => getListaVisivelSecoes());
    });

    it('abre na Seção certa e mostra a Estrutura dela', async () => {
        await abrirVisualizacaoParteSecao('secao', 21);
        assert.equal(titulo('secao'), 'Seção Y');
        assert.match(conteudo('secao').innerHTML, /Poema 1/);
        assert.match(conteudo('secao').innerHTML, /Parte:<\/strong> Parte A/);
    });

    it('Próximo anda pela lista das Seções', async () => {
        const lista = getListaVisivelSecoes();
        await abrirVisualizacaoParteSecao('secao', lista[0]);
        navegarVisualizacaoParteSecao('secao', 1);
        const t = db.secoes.find((s) => s.id === lista[1]).titulo;
        assert.equal(titulo('secao'), t);
        assert.equal(posicao('secao'), '2 de 3');
    });
});

describe('Ver de Parte e Seção: voltar do Editar', () => {
    beforeEach(() => {
        dadosBase();
        registrarListaNavegacaoParteSecao('parte', () => getListaVisivelPartes());
    });

    // O formulário real não monta no ambiente de teste (o modal de edição não é
    // registrado aqui): o editar falha depois de registrar a volta, então o
    // fechamento é simulado com um elemento no lugar do modal.
    const editarEFechar = async (tipo, idModal) => {
        await editarParteSecaoDoVisualizador(tipo).catch(() => {});
        assert.ok(!aberto(tipo), 'o Ver fecha ao ir editar');
        const stub = document.createElement('div');
        stub.id = idModal;
        stub.className = 'fixed';
        document.body.appendChild(stub);
        await toggleModal(idModal);
        await tick();
    };

    it('ao fechar o formulário, o Ver da mesma Parte reabre, na mesma lista', async () => {
        await abrirVisualizacaoParteSecao('parte', 12);
        await editarEFechar('parte', 'modal-parte');
        assert.ok(aberto('parte'));
        assert.equal(titulo('parte'), 'Parte B');
        assert.equal(posicao('parte'), '2 de 3');
    });

    it('só vale uma vez', async () => {
        await abrirVisualizacaoParteSecao('parte', 12);
        await editarEFechar('parte', 'modal-parte');
        document.getElementById('modal-visualizar-parte').classList.add('hidden');
        document.getElementById('modal-parte').classList.remove('hidden');
        await toggleModal('modal-parte');
        await tick();
        assert.ok(!aberto('parte'));
    });
});

describe('Ver de Parte: Excluir', () => {
    beforeEach(() => {
        dadosBase();
        registrarListaNavegacaoParteSecao('parte', () => getListaVisivelPartes());
    });
    const confirmar = () => document.getElementById('excl-confirmar').click();

    it('confirmada a exclusão, vai para a próxima e o total diminui', async () => {
        await abrirVisualizacaoParteSecao('parte', 12);
        excluirParteSecaoDoVisualizador('parte');
        assert.equal(titulo('parte'), 'Parte B', 'antes de confirmar nada muda');
        confirmar();
        await tick();
        assert.equal(titulo('parte'), 'Parte C');
        assert.equal(posicao('parte'), '2 de 2');
        assert.ok(db.partes.every((p) => p.id !== 12));
    });

    it('se era a última, vai para a anterior', async () => {
        await abrirVisualizacaoParteSecao('parte', 10);
        excluirParteSecaoDoVisualizador('parte');
        confirmar();
        await tick();
        assert.equal(titulo('parte'), 'Parte B');
    });

    it('sem outra Parte, fecha o modal depois de excluir', async () => {
        db.partes = [{ id: 11, livroId: 1, titulo: 'Única', sequencia: 1 }];
        await abrirVisualizacaoParteSecao('parte', 11);
        excluirParteSecaoDoVisualizador('parte');
        confirmar();
        await tick();
        assert.ok(!aberto('parte'));
    });

    it('cancelar não exclui nem muda o modal', async () => {
        await abrirVisualizacaoParteSecao('parte', 12);
        excluirParteSecaoDoVisualizador('parte');
        document.getElementById('excl-cancelar')?.click();
        await tick();
        assert.equal(db.partes.length, 3);
        assert.equal(titulo('parte'), 'Parte B');
    });
});
