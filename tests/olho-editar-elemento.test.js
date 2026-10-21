import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Olho do cabeçalho do Editar elemento: abre o Ver do mesmo elemento, trocando um
// modal pelo outro (sem empilhar), perguntando antes quando há alteração não salva;
// o aviso "Alterações não salvas" ao fechar com alteração; e o título do Elemento
// abrindo o Ver nas Estruturas (Livro, Parte e Seção). Usa o formulário real e os
// modais reais, registrados como no main.js.

globalThis.indexedDB = { open: () => ({}) };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
globalThis.fetch = async (url) => ({
    ok: true,
    status: 200,
    text: async () =>
        fs.readFileSync(path.resolve(__dirname, '../modais', path.basename(url)), 'utf8'),
});

document.body.innerHTML = '<main></main><div id="modais-container"></div>';

const { registrarModal, toggleModal } = await import('../js/modais.js');
const { db } = await import('../js/db.js');
const { initFormElemento, editarElemento, rastreadorElemento } = await import('../js/forms.js');
const { abrirVisualizacaoElemento, verDoModalEdicaoElemento, editarElementoDoVisualizador } =
    await import('../js/visualizar-elemento.js');
const { abrirVisualizacaoLivro } = await import('../js/visualizar-livro.js');
const { abrirVisualizacaoParteSecao } = await import('../js/visualizar-parte-secao.js');
const { prepararNovo } = await import('../js/ui.js');

registrarModal('modal-elemento', 'modal-elemento.html', initFormElemento, rastreadorElemento);
registrarModal('modal-visualizar-elemento', 'modal-visualizar-elemento.html', () => {});
registrarModal('modal-visualizar-livro', 'modal-visualizar-livro.html', () => {});
registrarModal('modal-visualizar-parte', 'modal-visualizar-parte.html', () => {});

const MODAL = 'modal-elemento';
const VER = 'modal-visualizar-elemento';
const aberto = (id) => {
    const el = document.getElementById(id);
    return !!el && !el.classList.contains('hidden');
};
const botao = (id) => document.getElementById(id);
const esperar = () => new Promise((r) => setTimeout(r, 30));
const olho = () => botao('elemento-ver');
const sujar = () =>
    document
        .getElementById('form-elemento')
        .dispatchEvent(new window.Event('input', { bubbles: true }));
const tituloDoVer = () => document.getElementById(`${VER}-titulo`).textContent;

function dados() {
    db.livros = [{ id: 1, titulo: 'Livro Um', sequencia: 1, tipo: 'Inéditos' }];
    db.partes = [{ id: 11, livroId: 1, titulo: 'Parte Onze', sequencia: 2 }];
    db.secoes = [];
    db.poemas = [];
    db.prosas = [];
    db.itensColetanea = [];
    db.elementos = [
        {
            id: 40,
            paiTipo: 'livro',
            paiId: 1,
            tipo: 'Epígrafe',
            titulo: 'Epi Um',
            sequencia: 1,
            texto: 'a',
        },
        {
            id: 41,
            paiTipo: 'livro',
            paiId: 1,
            tipo: 'Pórtico',
            titulo: 'Port Dois',
            sequencia: 2,
            texto: 'b',
        },
        {
            id: 42,
            paiTipo: 'parte',
            paiId: 11,
            tipo: 'Epígrafe',
            titulo: 'Epi na parte',
            sequencia: 1,
        },
    ];
}

describe('olho do Editar elemento', () => {
    beforeEach(async () => {
        localStorage.clear();
        dados();
        rastreadorElemento.marcarLimpo();
        for (const id of [MODAL, VER, 'modal-visualizar-livro', 'modal-visualizar-parte']) {
            if (aberto(id)) await toggleModal(id);
        }
        const conf = document.getElementById('modal-confirmar-exclusao');
        if (conf) conf.style.display = 'none';
        document.getElementById('avisos-toast')?.replaceChildren();
    });

    it('o botão existe, é o primeiro do cabeçalho e começa escondido', async () => {
        await toggleModal(MODAL);
        assert.ok(olho(), 'botão do olho');
        assert.ok(olho().classList.contains('hidden'));
        assert.match(olho().getAttribute('onclick'), /verDoModalEdicaoElemento\(\)/);
        assert.equal(olho().getAttribute('aria-label'), 'Ver');
        const botoes = [...olho().parentElement.querySelectorAll('button')];
        assert.equal(botoes[0], olho(), 'antes do check e do X');
        assert.equal(botoes.length, 3);
    });

    it('editar mostra o olho; novo esconde', async () => {
        await editarElemento(40);
        assert.ok(!olho().classList.contains('hidden'), 'item existente mostra o olho');
        await prepararNovo('elemento');
        assert.ok(olho().classList.contains('hidden'), 'item novo esconde o olho');
    });

    it('abrir o Editar não deixa o formulário sujo', async () => {
        await editarElemento(40);
        assert.equal(rastreadorElemento.estaSujo(), false);
    });

    it('sem alteração: troca o Editar pelo Ver do mesmo elemento, sem pergunta', async () => {
        await editarElemento(40);
        await verDoModalEdicaoElemento();
        await esperar();
        assert.equal(aberto(MODAL), false, 'o Editar fechou');
        assert.equal(aberto(VER), true, 'o Ver abriu');
        assert.equal(tituloDoVer(), 'Epi Um');
    });

    it('elemento novo (sem id) não faz nada', async () => {
        await prepararNovo('elemento');
        await toggleModal(MODAL);
        await verDoModalEdicaoElemento();
        await esperar();
        assert.equal(aberto(MODAL), true);
        assert.equal(aberto(VER), false);
    });

    it('com alteração: pergunta "Salvar antes de ver?" e nada muda até responder', async () => {
        await editarElemento(40);
        sujar();
        await verDoModalEdicaoElemento();
        const caixa = document.getElementById('modal-confirmar-exclusao');
        assert.equal(caixa.style.display, 'flex');
        assert.equal(document.getElementById('excl-titulo').textContent, 'Salvar antes de ver?');
        assert.equal(botao('excl-confirmar').textContent.trim(), 'Salvar e ver');
        assert.equal(botao('excl-secundaria').textContent.trim(), 'Descartar e ver');
        assert.equal(aberto(MODAL), true);
        assert.equal(aberto(VER), false);
    });

    it('adicionar item no Sumário conta como alteração', async () => {
        await editarElemento(40);
        document.getElementById('el-tipo').value = 'Sumário';
        document
            .getElementById('el-tipo')
            .dispatchEvent(new window.Event('change', { bubbles: true }));
        rastreadorElemento.marcarLimpo();
        document.getElementById('el-sumario-adicionar').click();
        assert.equal(rastreadorElemento.estaSujo(), true);
    });

    it('Salvar e ver: salva de verdade, fecha o Editar e abre o Ver com o título novo', async () => {
        await editarElemento(40);
        document.getElementById('el-titulo').value = 'Epi Um (revisto)';
        sujar();
        await verDoModalEdicaoElemento();
        botao('excl-confirmar').click();
        await esperar();
        assert.equal(db.elementos.find((x) => x.id === 40).titulo, 'Epi Um (revisto)');
        assert.equal(aberto(MODAL), false);
        assert.equal(aberto(VER), true);
        assert.match(tituloDoVer(), /\(revisto\)/);
        assert.equal(rastreadorElemento.estaSujo(), false);
    });

    it('Salvar e ver recusado pelo formulário: segue no Editar e um X depois não abre o Ver', async () => {
        await editarElemento(40);
        document.getElementById('el-imagem-url').value = 'isto não é um link';
        sujar();
        await verDoModalEdicaoElemento();
        botao('excl-confirmar').click();
        await esperar();
        assert.equal(aberto(MODAL), true, 'continua no Editar');
        assert.equal(aberto(VER), false);
        assert.equal(db.elementos.find((x) => x.id === 40).titulo, 'Epi Um');
        await toggleModal(MODAL);
        assert.equal(aberto(MODAL), true, 'pediu confirmação antes de fechar');
        botao('excl-confirmar').click();
        await esperar();
        assert.equal(aberto(MODAL), false);
        assert.equal(aberto(VER), false);
    });

    async function prepararSegundaFicha() {
        db.elementos.push(
            { id: 50, paiTipo: 'livro', paiId: 1, tipo: 'Ficha catalográfica', sequencia: 3 },
            { id: 51, paiTipo: 'livro', paiId: 1, tipo: 'Ficha catalográfica', sequencia: 4 },
        );
        await editarElemento(51);
        document.getElementById('el-ficha-cdd').value = 'B869';
        sujar();
        await verDoModalEdicaoElemento();
        botao('excl-confirmar').click();
        await esperar();
    }

    it('Salvar e ver com a segunda ficha: enquanto o aviso espera, nada é gravado e o Editar segue aberto', async () => {
        await prepararSegundaFicha();
        assert.equal(db.elementos.find((x) => x.id === 51).fichaCdd, undefined, 'nada gravado');
        assert.equal(aberto(MODAL), true);
        assert.equal(aberto(VER), false);
        assert.equal(
            document.getElementById('excl-titulo').textContent,
            'Livro Um',
            'o aviso da segunda ficha está na tela, esperando a resposta',
        );
    });

    it('Salvar e ver com a segunda ficha: confirmar o aviso salva e abre o Ver', async () => {
        await prepararSegundaFicha();
        botao('excl-confirmar').click();
        await esperar();
        assert.equal(db.elementos.find((x) => x.id === 51).fichaCdd, 'B869', 'gravou');
        assert.equal(aberto(MODAL), false);
        assert.equal(aberto(VER), true, 'o Ver abre logo depois');
        assert.equal(tituloDoVer(), 'Ficha catalográfica', 'é o elemento salvo');
    });

    it('Salvar e ver com a segunda ficha: cancelar o aviso não grava e um X depois não abre o Ver', async () => {
        await prepararSegundaFicha();
        botao('excl-cancelar').click();
        await esperar();
        assert.equal(db.elementos.find((x) => x.id === 51).fichaCdd, undefined, 'nada gravado');
        assert.equal(aberto(MODAL), true, 'o Editar continua aberto');
        assert.equal(aberto(VER), false);
        rastreadorElemento.marcarLimpo();
        await toggleModal(MODAL);
        await esperar();
        assert.equal(aberto(MODAL), false);
        assert.equal(aberto(VER), false, 'ninguém pediu o Ver');
    });

    it('Salvar e ver com a segunda ficha: Esc no aviso também cancela', async () => {
        await prepararSegundaFicha();
        document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));
        await esperar();
        assert.equal(aberto(MODAL), true);
        rastreadorElemento.marcarLimpo();
        await toggleModal(MODAL);
        await esperar();
        assert.equal(aberto(VER), false);
    });

    it('Descartar e ver: fecha o Editar sem salvar e abre o Ver', async () => {
        await editarElemento(40);
        document.getElementById('el-titulo').value = 'Mudou mas vai ser descartado';
        sujar();
        await verDoModalEdicaoElemento();
        botao('excl-secundaria').click();
        await esperar();
        assert.equal(aberto(MODAL), false);
        assert.equal(aberto(VER), true);
        assert.equal(tituloDoVer(), 'Epi Um');
        assert.equal(db.elementos.find((x) => x.id === 40).titulo, 'Epi Um');
    });

    it('Cancelar na pergunta não muda nada', async () => {
        await editarElemento(40);
        sujar();
        await verDoModalEdicaoElemento();
        botao('excl-cancelar').click();
        await esperar();
        assert.equal(aberto(MODAL), true);
        assert.equal(aberto(VER), false);
        assert.equal(rastreadorElemento.estaSujo(), true, 'continua com a alteração');
        rastreadorElemento.marcarLimpo();
        await toggleModal(MODAL);
        await esperar();
        assert.equal(aberto(VER), false);
    });

    it('fechar o Editar com alteração pede confirmação; sem alteração fecha direto', async () => {
        await editarElemento(40);
        await toggleModal(MODAL);
        assert.equal(aberto(MODAL), false, 'sem alteração fecha direto');
        await editarElemento(40);
        sujar();
        await toggleModal(MODAL);
        assert.equal(aberto(MODAL), true, 'com alteração, espera a resposta');
        assert.equal(document.getElementById('excl-titulo').textContent, 'Alterações não salvas');
        botao('excl-confirmar').click();
        await esperar();
        assert.equal(aberto(MODAL), false);
    });

    it('Ver, Editar, olho: o Ver abre uma vez só, na mesma lista de navegação', async () => {
        await abrirVisualizacaoElemento(41, { ids: [40, 41] });
        await editarElementoDoVisualizador();
        await esperar();
        assert.equal(aberto(VER), false, 'o Ver fechou ao ir editar');
        assert.equal(aberto(MODAL), true);
        await verDoModalEdicaoElemento();
        await esperar();
        assert.equal(aberto(MODAL), false);
        assert.equal(aberto(VER), true);
        assert.equal(tituloDoVer(), 'Port Dois');
        assert.equal(document.getElementById('visualizar-elemento-posicao').value, '2');
        assert.equal(document.getElementById('visualizar-elemento-total').textContent, 'de 2');
        await toggleModal(VER);
        await esperar();
        assert.equal(aberto(VER), false);
        assert.equal(aberto(MODAL), false);
    });

    it('Editar, olho, Editar de novo: ida e volta sem empilhar', async () => {
        await editarElemento(40);
        await verDoModalEdicaoElemento();
        await esperar();
        assert.equal(aberto(VER), true);
        await editarElementoDoVisualizador();
        await esperar();
        assert.equal(aberto(VER), false);
        assert.equal(aberto(MODAL), true);
        await verDoModalEdicaoElemento();
        await esperar();
        assert.equal(aberto(MODAL), false);
        assert.equal(aberto(VER), true);
    });
});

describe('título do Elemento abre o Ver a partir da Estrutura', () => {
    beforeEach(async () => {
        localStorage.clear();
        dados();
        for (const id of [MODAL, VER, 'modal-visualizar-livro', 'modal-visualizar-parte']) {
            if (aberto(id)) await toggleModal(id);
        }
    });

    it('Ver do Livro: clicar no Elemento abre o Ver dele sem navegação e, ao fechar, o livro volta', async () => {
        await abrirVisualizacaoLivro(1);
        const alvo = document.querySelector(
            '#visualizar-livro-conteudo [data-estrutura-ver][data-tipo="elemento"][data-id="41"]',
        );
        assert.ok(alvo, 'o título do Elemento é clicável');
        alvo.click();
        await esperar();
        assert.equal(aberto('modal-visualizar-livro'), false, 'um modal só de cada vez');
        assert.equal(aberto(VER), true);
        assert.equal(tituloDoVer(), 'Port Dois');
        assert.ok(document.getElementById('visualizar-elemento-nav').classList.contains('hidden'));
        await toggleModal(VER);
        await esperar();
        assert.equal(aberto(VER), false);
        assert.equal(aberto('modal-visualizar-livro'), true, 'o livro voltou');
    });

    it('Ver de Parte: clicar no Elemento abre o Ver dele e, ao fechar, a Parte volta', async () => {
        await abrirVisualizacaoParteSecao('parte', 11);
        const alvo = document.querySelector(
            '#visualizar-parte-conteudo [data-estrutura-ver][data-tipo="elemento"][data-id="42"]',
        );
        assert.ok(alvo, 'o título do Elemento é clicável');
        alvo.click();
        await esperar();
        assert.equal(aberto('modal-visualizar-parte'), false);
        assert.equal(aberto(VER), true);
        assert.equal(tituloDoVer(), 'Epi na parte');
        await toggleModal(VER);
        await esperar();
        assert.equal(aberto('modal-visualizar-parte'), true, 'a Parte voltou');
    });

    it('Elemento apagado entre o clique e a abertura não faz nada', async () => {
        await abrirVisualizacaoLivro(1);
        const alvo = document.querySelector(
            '#visualizar-livro-conteudo [data-estrutura-ver][data-tipo="elemento"][data-id="41"]',
        );
        db.elementos = db.elementos.filter((e) => e.id !== 41);
        alvo.click();
        await esperar();
        assert.equal(aberto('modal-visualizar-livro'), true);
        assert.equal(aberto(VER), false);
    });
});
