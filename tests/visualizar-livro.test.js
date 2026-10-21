import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Modal "Ver" de Livro: conteúdo, contagem, botão no card e navegação
// Anterior/Próximo/[n] de N na ordem dos cards, com Editar e Excluir no rodapé.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const lerModal = (arquivo) =>
    fs.readFileSync(path.resolve(__dirname, '../modais', arquivo), 'utf8');

globalThis.fetch = async (url) => ({
    ok: true,
    status: 200,
    text: async () => lerModal(path.basename(url)),
});

document.body.innerHTML = `
    <main><div id="lista-livros"></div></main>
    <div id="modais-container"></div>
`;

const { registrarModal, toggleModal } = await import('../js/modais.js');
const { db } = await import('../js/db.js');
const { renderLivros, getListaVisivelLivros } = await import('../js/render-listas.js');
const {
    abrirVisualizacaoLivro,
    navegarVisualizacaoLivro,
    irParaPosicaoVisualizacaoLivro,
    editarLivroDoVisualizador,
    excluirLivroDoVisualizador,
    registrarListaNavegacaoLivros,
    renderVisualizacaoLivroHtml,
    contarConteudoDoLivro,
    textoDataDoLivro,
} = await import('../js/visualizar-livro.js');

registrarModal('modal-visualizar-livro', 'modal-visualizar-livro.html', () => {});

const titulo = () => document.getElementById('modal-visualizar-livro-titulo').innerText;
const nav = () => document.getElementById('visualizar-livro-nav');
const posicao = () =>
    `${document.getElementById('visualizar-livro-posicao').value} ${document.getElementById('visualizar-livro-total').textContent}`;
const ant = () => document.getElementById('visualizar-livro-anterior');
const prox = () => document.getElementById('visualizar-livro-proximo');
const aberto = () =>
    !document.getElementById('modal-visualizar-livro').classList.contains('hidden');
const tick = () => new Promise((r) => setTimeout(r, 20));

function dadosBase() {
    localStorage.clear();
    db.livros = [
        { id: 1, titulo: 'Terceiro', sequencia: 3 },
        { id: 2, titulo: 'Primeiro', sequencia: 1 },
        { id: 3, titulo: 'Segundo', sequencia: 2 },
    ];
    db.partes = [];
    db.secoes = [];
    db.poemas = [];
    db.prosas = [];
    db.itensColetanea = [];
    document.querySelectorAll('.fixed[id^="modal-"]').forEach((m) => m.classList.add('hidden'));
    document.getElementById('modal-livro')?.remove();
}

describe('modal Ver do Livro: marcação', () => {
    const html = lerModal('modal-visualizar-livro.html');

    it('tem Anterior, Próximo e a caixa de posição ligados às funções do livro', () => {
        assert.match(html, /onclick="navegarVisualizacaoLivro\(-1\)"/);
        assert.match(html, /onclick="navegarVisualizacaoLivro\(1\)"/);
        assert.match(html, /<input[^>]*id="visualizar-livro-posicao"/);
        assert.match(html, /irParaPosicaoVisualizacaoLivro\(this\.value\)/);
    });

    it('não reaproveita nenhum id do modal de texto (os dois podem coexistir na página)', () => {
        const texto = lerModal('modal-visualizar.html');
        const idsTexto = [...texto.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
        const idsLivro = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
        for (const id of idsLivro) assert.ok(!idsTexto.includes(id), `id repetido: ${id}`);
    });

    it('rodapé tem só Editar e Excluir, como ícone, nessa ordem', () => {
        const iEditar = html.indexOf('editarLivroDoVisualizador()');
        const iExcluir = html.indexOf('excluirLivroDoVisualizador()');
        assert.ok(iEditar > 0 && iExcluir > iEditar);
        assert.doesNotMatch(html, /baixarDoModalVisualizacao|visualizar-baixar/);
        for (const id of ['visualizar-livro-editar', 'visualizar-livro-excluir']) {
            const m = html.match(new RegExp(`<button[^>]*id="${id}"[\\s\\S]*?</button>`));
            assert.ok(m, id);
            assert.match(m[0], /aria-label=/);
        }
    });

    it('sem travessão no texto da tela', () => {
        assert.doesNotMatch(html.replace(/<svg[\s\S]*?<\/svg>/g, ''), /—/);
    });
});

describe('textoDataDoLivro', () => {
    it('data parcial, texto antigo e vazio', () => {
        assert.equal(textoDataDoLivro({ dia: 5, mes: 3, ano: 2020 }), '05/03/2020');
        assert.equal(textoDataDoLivro({ ano: 1999 }), '1999');
        assert.equal(textoDataDoLivro('março de 2001'), 'março de 2001');
        assert.equal(textoDataDoLivro(null), '');
        assert.equal(textoDataDoLivro({}), '');
    });
});

describe('renderVisualizacaoLivroHtml', () => {
    const livro = {
        id: 9,
        titulo: 'Casa de Vidro',
        tipo: 'Inéditos',
        fase: 'Primeira fase',
        sequencia: 4,
        siglaOficial: 'CV',
        siglaPessoal: 'cv-pessoal',
        data: { mes: 3, ano: 2020 },
        dataUltimaEdicao: { ano: 2022 },
        isbn13: '978-65-00-00000-0',
        isbn10: '65-00-00000-0',
        situacaoEditorial: 'esgotado',
        situacaoDesde: { ano: 2024 },
        situacaoNota: 'Nova edição prevista',
        abertura: 'Primeira linha\nsegunda linha',
        sinopse: 'Uma sinopse <b>com tag</b>',
        capaDesc: 'Vidro fosco',
        fraseCapa: 'Ninguém atira pedras',
        orelha1: 'Orelha um',
        orelha2: 'Orelha dois',
        contracapa: 'Texto da contracapa',
        lojas: [
            { nome: 'Loja A', url: 'https://loja.exemplo/a' },
            { nome: 'Sem link', url: '' },
            { nome: 'Perigosa', url: 'javascript:alert(1)' },
        ],
        pdfUrl: 'https://exemplo.com/livro.pdf',
        epubUrl: 'https://exemplo.com/livro.epub',
        codigoBarrasUrl: 'https://exemplo.com/barras.png',
        fichaCatalograficaUrl: 'https://exemplo.com/ficha',
        certificadoDireitoAutoralUrl: 'https://exemplo.com/cert',
        cartaExclusividadeUrl: 'https://exemplo.com/carta',
        capa: 'capa-123',
    };

    it('mostra os campos preenchidos, com rótulo', () => {
        const html = renderVisualizacaoLivroHtml(livro);
        for (const t of [
            'Inéditos',
            'Primeira fase',
            'CV',
            'cv-pessoal',
            '03/2020',
            '2022',
            '978-65-00-00000-0',
            '65-00-00000-0',
            'Nova edição prevista',
            'Vidro fosco',
            'Ninguém atira pedras',
            'Orelha um',
            'Orelha dois',
            'Texto da contracapa',
        ]) {
            assert.ok(html.includes(t), t);
        }
        for (const r of ['Sinopse', 'Abertura', 'Contracapa', 'Onde comprar']) {
            assert.ok(html.includes(r), r);
        }
    });

    it('mostra o selo de situação editorial e o aviso nas lojas', () => {
        const html = renderVisualizacaoLivroHtml(livro);
        assert.match(html, /data-situacao-editorial="esgotado"/);
        assert.match(html, /data-aviso-lojas-fora-de-circulacao/);
    });

    it('sem situação ou em circulação, não há aviso de loja', () => {
        const html = renderVisualizacaoLivroHtml({ ...livro, situacaoEditorial: 'em-circulacao' });
        assert.doesNotMatch(html, /data-aviso-lojas-fora-de-circulacao/);
        const sem = renderVisualizacaoLivroHtml({ ...livro, situacaoEditorial: '' });
        assert.doesNotMatch(sem, /data-situacao-editorial/);
    });

    it('escapa HTML dos textos', () => {
        const html = renderVisualizacaoLivroHtml(livro);
        assert.ok(html.includes('&lt;b&gt;com tag&lt;/b&gt;'));
        assert.ok(!html.includes('<b>com tag</b>'));
    });

    it('só http(s) vira link; javascript: fica como texto', () => {
        const html = renderVisualizacaoLivroHtml(livro);
        assert.match(html, /href="https:\/\/loja\.exemplo\/a"/);
        assert.doesNotMatch(html, /href="javascript:/);
        assert.ok(html.includes('Perigosa'));
        assert.ok(!html.includes('Sem link'), 'loja sem url não aparece');
    });

    it('lista os seis links de arquivos e documentos', () => {
        const html = renderVisualizacaoLivroHtml(livro);
        for (const r of [
            'PDF',
            'Epub',
            'Código de barras',
            'Ficha catalográfica',
            'Certificado de direito autoral',
            'Carta de exclusividade',
        ]) {
            assert.ok(html.includes(r), r);
        }
    });

    it('capa vira img com data-capa-id (o src vem do IndexedDB depois)', () => {
        assert.match(renderVisualizacaoLivroHtml(livro), /<img data-capa-id="capa-123"/);
        assert.doesNotMatch(renderVisualizacaoLivroHtml({ ...livro, capa: null }), /<img/);
    });

    it('livro quase vazio não mostra seções nem rótulos vazios', () => {
        const html = renderVisualizacaoLivroHtml({ id: 1, titulo: 'Só título' });
        assert.doesNotMatch(html, /<section/);
        assert.doesNotMatch(html, /Sinopse|Abertura|Onde comprar|ISBN/);
    });

    it('livro sem nenhum dado avisa em vez de ficar em branco', () => {
        const html = renderVisualizacaoLivroHtml({ id: 1, titulo: 'X', tipo: '' });
        assert.match(html, /Nenhum dado cadastrado/);
    });

    it('sem travessão no texto da tela', () => {
        assert.doesNotMatch(renderVisualizacaoLivroHtml(livro), /—/);
    });
});

describe('contarConteudoDoLivro', () => {
    const base = () => ({
        livros: [
            { id: 1, titulo: 'L1' },
            { id: 2, titulo: 'L2' },
            { id: 3, titulo: 'Col', tipo: 'Coletânea' },
        ],
        partes: [
            { id: 10, livroId: 1 },
            { id: 11, livroId: 2 },
            { id: 12, livroId: 3 },
        ],
        secoes: [
            { id: 20, paiTipo: 'livro', paiId: 1 },
            { id: 21, paiTipo: 'parte', paiId: 10 },
            { id: 22, paiTipo: 'parte', paiId: 11 },
        ],
        poemas: [
            { id: 100, paiTipo: 'livro', paiId: 1 },
            { id: 101, paiTipo: 'parte', paiId: 10 },
            { id: 102, paiTipo: 'secao', paiId: 21 },
            { id: 103, paiTipo: 'secao', paiId: 22 },
            { id: 104, livrosIds: [1] },
            { id: 105, paiTipo: 'livro', paiId: 1, livrosIds: [1] },
        ],
        prosas: [{ id: 200, paiTipo: 'secao', paiId: 20 }],
        itensColetanea: [
            { id: 300, parteId: 12 },
            { id: 301, parteId: 12 },
            { id: 302, parteId: 10 },
        ],
    });

    it('conta partes, seções e textos do livro, cada texto uma vez só', () => {
        assert.deepEqual(contarConteudoDoLivro(base(), 1), {
            coletanea: false,
            partes: 1,
            secoes: 2,
            poemas: 5,
            prosas: 1,
        });
    });

    it('não conta o que é de outro livro', () => {
        assert.deepEqual(contarConteudoDoLivro(base(), 2), {
            coletanea: false,
            partes: 1,
            secoes: 1,
            poemas: 1,
            prosas: 0,
        });
    });

    it('coletânea conta partes e itens, não textos', () => {
        assert.deepEqual(contarConteudoDoLivro(base(), 3), {
            coletanea: true,
            partes: 1,
            itens: 2,
        });
    });

    it('a frase da contagem entra no fim do HTML', () => {
        const d = base();
        const html = renderVisualizacaoLivroHtml(d.livros[0], contarConteudoDoLivro(d, 1));
        assert.match(html, /Contém 1 parte, 2 seções, 5 poemas e 1 prosa\./);
        const vazio = renderVisualizacaoLivroHtml(d.livros[1], {
            coletanea: false,
            partes: 0,
            secoes: 0,
            poemas: 0,
            prosas: 0,
        });
        assert.match(vazio, /Ainda sem partes, seções nem textos\./);
        const col = renderVisualizacaoLivroHtml(d.livros[2], contarConteudoDoLivro(d, 3));
        assert.match(col, /Contém 1 parte e 2 itens\./);
    });
});

describe('card de Livro: botão Ver e lista de navegação', () => {
    beforeEach(dadosBase);

    it('o card tem o botão Ver com data-action e data-id', () => {
        renderLivros();
        const btn = document.querySelector('[data-action="ver-livro"][data-id="2"]');
        assert.ok(btn);
        assert.equal(btn.getAttribute('aria-label'), 'Ver');
    });

    it('getListaVisivelLivros segue a ordem dos cards (por sequência)', () => {
        assert.deepEqual(getListaVisivelLivros(), [2, 3, 1]);
        renderLivros();
        const ordem = [...document.querySelectorAll('[data-action="ver-livro"]')].map((b) =>
            Number(b.dataset.id),
        );
        assert.deepEqual(ordem, getListaVisivelLivros());
    });

    it('livro sem sequência vai para o fim, como no card', () => {
        db.livros.push({ id: 4, titulo: 'Sem seq' });
        assert.deepEqual(getListaVisivelLivros(), [2, 3, 1, 4]);
    });
});

describe('modal Ver do Livro: navegação', () => {
    beforeEach(() => {
        dadosBase();
        registrarListaNavegacaoLivros(() => getListaVisivelLivros());
    });

    it('abre no livro certo, com "n de N" e a posição na ordem dos cards', async () => {
        await abrirVisualizacaoLivro(3);
        assert.ok(aberto());
        assert.equal(titulo(), 'Segundo');
        assert.ok(!nav().classList.contains('hidden'));
        assert.equal(posicao(), '2 de 3');
    });

    it('Anterior e Próximo andam pela lista e desabilitam nas pontas', async () => {
        await abrirVisualizacaoLivro(2);
        assert.equal(posicao(), '1 de 3');
        assert.ok(ant().disabled, 'no primeiro, Anterior desabilitado');
        assert.ok(!prox().disabled);
        navegarVisualizacaoLivro(1);
        assert.equal(titulo(), 'Segundo');
        navegarVisualizacaoLivro(1);
        assert.equal(titulo(), 'Terceiro');
        assert.equal(posicao(), '3 de 3');
        assert.ok(prox().disabled, 'no último, Próximo desabilitado');
        navegarVisualizacaoLivro(1);
        assert.equal(titulo(), 'Terceiro', 'sem dar a volta');
        navegarVisualizacaoLivro(-1);
        assert.equal(titulo(), 'Segundo');
    });

    it('a caixa de posição vai direto ao livro e limita às pontas', async () => {
        await abrirVisualizacaoLivro(2);
        irParaPosicaoVisualizacaoLivro('3');
        assert.equal(titulo(), 'Terceiro');
        irParaPosicaoVisualizacaoLivro('99');
        assert.equal(titulo(), 'Terceiro');
        irParaPosicaoVisualizacaoLivro('1');
        assert.equal(titulo(), 'Primeiro');
        irParaPosicaoVisualizacaoLivro('0');
        assert.equal(titulo(), 'Primeiro');
    });

    it('valor inválido na caixa só restaura o número atual', async () => {
        await abrirVisualizacaoLivro(3);
        irParaPosicaoVisualizacaoLivro('');
        irParaPosicaoVisualizacaoLivro('abc');
        assert.equal(titulo(), 'Segundo');
        assert.equal(posicao(), '2 de 3');
    });

    it('pula livro que deixou de existir', async () => {
        await abrirVisualizacaoLivro(2);
        db.livros = db.livros.filter((l) => l.id !== 3);
        navegarVisualizacaoLivro(1);
        assert.equal(titulo(), 'Terceiro');
    });

    it('com um livro só, a navegação fica escondida', async () => {
        db.livros = [{ id: 1, titulo: 'Único', sequencia: 1 }];
        await abrirVisualizacaoLivro(1);
        assert.equal(titulo(), 'Único');
        assert.ok(nav().classList.contains('hidden'));
    });

    it('com navegar: false, a navegação fica escondida', async () => {
        await abrirVisualizacaoLivro(3, { navegar: false });
        assert.ok(nav().classList.contains('hidden'));
    });

    it('livro inexistente não abre nada', async () => {
        await abrirVisualizacaoLivro(999);
        assert.ok(!aberto());
    });

    it('as setas do teclado navegam; com o foco na caixa de posição, não', async () => {
        await abrirVisualizacaoLivro(3);
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
        assert.equal(titulo(), 'Terceiro');
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
        assert.equal(titulo(), 'Segundo');
        document
            .getElementById('visualizar-livro-posicao')
            .dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
        assert.equal(titulo(), 'Segundo');
    });

    it('as setas não fazem nada com o modal fechado', async () => {
        await abrirVisualizacaoLivro(3);
        await toggleModal('modal-visualizar-livro');
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
        assert.equal(titulo(), 'Segundo');
    });
});

describe('modal Ver do Livro: voltar do Editar', () => {
    beforeEach(() => {
        dadosBase();
        registrarListaNavegacaoLivros(() => getListaVisivelLivros());
    });

    // O formulário real de Livro não monta no ambiente de teste (o modal de
    // edição não é registrado aqui): o editarLivro falha depois de registrar a
    // volta, então o fechamento é simulado com um elemento no lugar do modal.
    const editarEFechar = async () => {
        await editarLivroDoVisualizador().catch(() => {});
        assert.ok(!aberto(), 'o Ver fecha ao ir editar');
        const stub = document.createElement('div');
        stub.id = 'modal-livro';
        stub.className = 'fixed';
        document.body.appendChild(stub);
        await toggleModal('modal-livro');
        await tick();
    };

    it('ao fechar o formulário, o Ver do mesmo livro reabre, na mesma lista', async () => {
        await abrirVisualizacaoLivro(3);
        await editarEFechar();
        assert.ok(aberto());
        assert.equal(titulo(), 'Segundo');
        assert.equal(posicao(), '2 de 3');
        navegarVisualizacaoLivro(1);
        assert.equal(titulo(), 'Terceiro');
    });

    it('só vale uma vez: fechar o formulário de novo não reabre o Ver', async () => {
        await abrirVisualizacaoLivro(3);
        await editarEFechar();
        document.getElementById('modal-visualizar-livro').classList.add('hidden');
        document.getElementById('modal-livro').classList.remove('hidden');
        await toggleModal('modal-livro');
        await tick();
        assert.ok(!aberto());
    });

    it('formulário aberto por outro caminho (card) não reabre o Ver', async () => {
        const stub = document.createElement('div');
        stub.id = 'modal-livro';
        stub.className = 'fixed';
        document.body.appendChild(stub);
        await toggleModal('modal-livro');
        assert.ok(!aberto());
    });
});

describe('modal Ver do Livro: Excluir', () => {
    beforeEach(() => {
        dadosBase();
        registrarListaNavegacaoLivros(() => getListaVisivelLivros());
    });
    const confirmar = () => document.getElementById('excl-confirmar').click();

    it('confirmada a exclusão, vai para o próximo e o total diminui', async () => {
        await abrirVisualizacaoLivro(3);
        excluirLivroDoVisualizador();
        assert.equal(titulo(), 'Segundo', 'antes de confirmar nada muda');
        confirmar();
        await tick();
        assert.equal(titulo(), 'Terceiro');
        assert.equal(posicao(), '2 de 2');
        assert.ok(aberto());
        assert.deepEqual(db.livros.map((l) => l.id).sort(), [1, 2]);
    });

    it('se era o último, vai para o anterior', async () => {
        await abrirVisualizacaoLivro(1);
        excluirLivroDoVisualizador();
        confirmar();
        await tick();
        assert.equal(titulo(), 'Segundo');
        assert.equal(posicao(), '2 de 2');
    });

    it('sem outro livro, fecha o modal depois de excluir', async () => {
        db.livros = [{ id: 1, titulo: 'Único', sequencia: 1 }];
        await abrirVisualizacaoLivro(1);
        excluirLivroDoVisualizador();
        confirmar();
        await tick();
        assert.ok(!aberto());
    });

    it('cancelar não exclui nem muda o modal', async () => {
        await abrirVisualizacaoLivro(3);
        excluirLivroDoVisualizador();
        document.getElementById('excl-cancelar')?.click();
        await tick();
        assert.equal(db.livros.length, 3);
        assert.equal(titulo(), 'Segundo');
        assert.ok(aberto());
    });
});
