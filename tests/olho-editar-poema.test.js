import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Olho do cabeçalho do Editar poema: abre o Ver do mesmo poema, trocando um
// modal pelo outro (sem empilhar), perguntando antes quando há alteração não
// salva. Mais: os links de Elos e Ecos na aba Conexões abrem o Ver, e os
// Buracos continuam abrindo o Editar.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const lerModal = (arquivo) =>
    fs.readFileSync(path.resolve(__dirname, '../modais', arquivo), 'utf8');

globalThis.fetch = async (url) => ({
    ok: true,
    status: 200,
    text: async () => lerModal(path.basename(url)),
});

document.body.innerHTML = '<main></main><div id="modais-container"></div>';

const { registrarModal, toggleModal } = await import('../js/modais.js');
const { db } = await import('../js/db.js');
const { rastreadorPoema, editarPoema } = await import('../js/forms.js');
const { abrirVisualizacao, verDoModalEdicao, editarDoModalVisualizacao } =
    await import('../js/visualizar.js');
const { prepararNovo } = await import('../js/ui.js');

// O formulário real (initFormPoema/initEditor) é pesado e não é o assunto aqui:
// o envio de mentira salva como o de verdade (marca limpo e fecha) e dá para
// forçar a recusa (campo obrigatório, data fora de ordem).
let recusarEnvio = false;
let envios = 0;
registrarModal(
    'modal-poema',
    'modal-poema.html',
    () => {
        const form = document.getElementById('form-poema');
        rastreadorPoema.observar(form);
        // O título é obrigatório e o formulário de teste não tem título: sem isto
        // nenhum envio passaria (um teste abaixo liga a validação de propósito).
        form.noValidate = true;
        form.onsubmit = (e) => {
            e.preventDefault();
            envios++;
            if (recusarEnvio) return;
            rastreadorPoema.marcarLimpo();
            toggleModal('modal-poema');
        };
    },
    rastreadorPoema,
);
registrarModal('modal-visualizar', 'modal-visualizar.html', () => {});

const aberto = (id) => {
    const el = document.getElementById(id);
    return !!el && !el.classList.contains('hidden');
};
const olho = () => document.getElementById('poema-ver');
const botaoConfirmacao = (id) => document.getElementById(id);

// Abre o Editar como a aba faz: modal carregado, id no campo e aberto.
async function abrirEditor(id) {
    await toggleModal('modal-poema');
    document.getElementById('p-edit-id').value = String(id);
}

function deixarSujo() {
    document
        .getElementById('form-poema')
        .dispatchEvent(new window.Event('input', { bubbles: true }));
}

async function esperar() {
    await new Promise((r) => setTimeout(r, 20));
}

describe('olho do Editar poema', () => {
    beforeEach(async () => {
        localStorage.clear();
        db.poemas = [{ id: 7, titulo: 'Poema Sete', conceitos: { elos: [], ecos: [] } }];
        db.prosas = [];
        recusarEnvio = false;
        envios = 0;
        for (const id of ['modal-poema', 'modal-visualizar']) {
            if (aberto(id)) {
                rastreadorPoema.marcarLimpo();
                await toggleModal(id);
            }
        }
        const conf = document.getElementById('modal-confirmar-exclusao');
        if (conf) conf.style.display = 'none';
    });

    it('o botão existe, é o primeiro do cabeçalho e começa escondido', async () => {
        await toggleModal('modal-poema');
        assert.ok(olho(), 'botão do olho');
        assert.ok(olho().classList.contains('hidden'));
        assert.match(olho().getAttribute('onclick'), /verDoModalEdicao\(\)/);
        assert.equal(olho().getAttribute('aria-label'), 'Ver');
        const botoes = [...olho().parentElement.querySelectorAll('button')];
        assert.equal(botoes[0], olho(), 'antes do check e do X');
        assert.equal(botoes.length, 3);
    });

    it('editar um poema mostra o olho; novo poema esconde', async () => {
        await editarPoema(7);
        assert.ok(!olho().classList.contains('hidden'), 'poema existente mostra o olho');
        await prepararNovo('poema');
        assert.ok(olho().classList.contains('hidden'), 'poema novo esconde o olho');
    });

    it('sem alteração: troca o Editar pelo Ver do mesmo poema, sem pergunta', async () => {
        await abrirEditor(7);
        await verDoModalEdicao();
        await esperar();
        assert.equal(aberto('modal-poema'), false, 'o Editar fechou');
        assert.equal(aberto('modal-visualizar'), true, 'o Ver abriu');
        assert.match(
            document.getElementById('modal-visualizar-titulo')?.textContent || '',
            /Poema Sete/,
        );
    });

    it('poema novo (sem id) não faz nada', async () => {
        await abrirEditor('');
        await verDoModalEdicao();
        await esperar();
        assert.equal(aberto('modal-poema'), true);
        assert.equal(aberto('modal-visualizar'), false);
    });

    it('com alteração: pergunta "Salvar antes de ver?" e nada muda até responder', async () => {
        await abrirEditor(7);
        deixarSujo();
        assert.equal(rastreadorPoema.estaSujo(), true);
        await verDoModalEdicao();
        const caixa = document.getElementById('modal-confirmar-exclusao');
        assert.equal(caixa.style.display, 'flex');
        assert.equal(document.getElementById('excl-titulo').textContent, 'Salvar antes de ver?');
        assert.equal(botaoConfirmacao('excl-confirmar').textContent.trim(), 'Salvar e ver');
        assert.equal(botaoConfirmacao('excl-secundaria').textContent.trim(), 'Descartar e ver');
        assert.equal(aberto('modal-poema'), true);
        assert.equal(aberto('modal-visualizar'), false);
    });

    it('Salvar e ver: envia o formulário, fecha o Editar e abre o Ver', async () => {
        await abrirEditor(7);
        deixarSujo();
        await verDoModalEdicao();
        botaoConfirmacao('excl-confirmar').click();
        await esperar();
        assert.equal(envios, 1);
        assert.equal(aberto('modal-poema'), false);
        assert.equal(aberto('modal-visualizar'), true);
    });

    it('Salvar e ver com o envio recusado: segue no Editar e um X depois não abre o Ver', async () => {
        await abrirEditor(7);
        deixarSujo();
        recusarEnvio = true;
        await verDoModalEdicao();
        botaoConfirmacao('excl-confirmar').click();
        await esperar();
        assert.equal(envios, 1);
        assert.equal(aberto('modal-poema'), true, 'continua no Editar');
        assert.equal(aberto('modal-visualizar'), false);
        // fecha pelo X, descartando: não pode aparecer um Ver que ninguém pediu
        rastreadorPoema.marcarLimpo();
        await toggleModal('modal-poema');
        await esperar();
        assert.equal(aberto('modal-poema'), false);
        assert.equal(aberto('modal-visualizar'), false);
    });

    it('Salvar e ver com campo obrigatório vazio (validação do navegador): segue no Editar', async () => {
        await abrirEditor(7);
        document.getElementById('form-poema').noValidate = false;
        document.getElementById('p-titulo').value = '';
        deixarSujo();
        await verDoModalEdicao();
        botaoConfirmacao('excl-confirmar').click();
        await esperar();
        assert.equal(envios, 0, 'o navegador barrou o envio');
        assert.equal(aberto('modal-poema'), true);
        assert.equal(aberto('modal-visualizar'), false);
        document.getElementById('form-poema').noValidate = true;
        rastreadorPoema.marcarLimpo();
        await toggleModal('modal-poema');
        await esperar();
        assert.equal(aberto('modal-visualizar'), false, 'o combinado foi desfeito');
    });

    it('Descartar e ver: fecha o Editar sem salvar e abre o Ver', async () => {
        await abrirEditor(7);
        deixarSujo();
        await verDoModalEdicao();
        botaoConfirmacao('excl-secundaria').click();
        await esperar();
        assert.equal(envios, 0, 'não salvou');
        assert.equal(aberto('modal-poema'), false);
        assert.equal(aberto('modal-visualizar'), true);
        assert.equal(rastreadorPoema.estaSujo(), false);
    });

    it('Cancelar: continua no Editar, com as alterações, e um X depois não abre o Ver', async () => {
        await abrirEditor(7);
        deixarSujo();
        await verDoModalEdicao();
        botaoConfirmacao('excl-cancelar').click();
        await esperar();
        assert.equal(aberto('modal-poema'), true);
        assert.equal(aberto('modal-visualizar'), false);
        assert.equal(rastreadorPoema.estaSujo(), true);
        rastreadorPoema.marcarLimpo();
        await toggleModal('modal-poema');
        await esperar();
        assert.equal(aberto('modal-visualizar'), false);
    });

    it('Editar aberto pelo Ver: o olho volta ao Ver uma vez só (sem empilhar)', async () => {
        await abrirVisualizacao('poema', 7);
        assert.equal(aberto('modal-visualizar'), true);
        await editarDoModalVisualizacao();
        await esperar();
        assert.equal(aberto('modal-visualizar'), false, 'o Ver fechou ao abrir o Editar');
        assert.equal(aberto('modal-poema'), true);
        await verDoModalEdicao();
        await esperar();
        assert.equal(aberto('modal-poema'), false);
        assert.equal(aberto('modal-visualizar'), true);
        // um único Ver aberto, nenhum Editar esquecido por baixo
        const abertos = [...document.querySelectorAll('.fixed[id^="modal-"]:not(.hidden)')];
        assert.deepEqual(
            abertos.map((m) => m.id),
            ['modal-visualizar'],
        );
    });

    it('Editar aberto pelo Ver, envio recusado: o combinado de voltar ao Ver continua valendo', async () => {
        await abrirVisualizacao('poema', 7);
        await editarDoModalVisualizacao();
        await esperar();
        deixarSujo();
        recusarEnvio = true;
        await verDoModalEdicao();
        botaoConfirmacao('excl-confirmar').click();
        await esperar();
        assert.equal(aberto('modal-poema'), true);
        // fechar o Editar (como sempre, volta ao Ver)
        rastreadorPoema.marcarLimpo();
        await toggleModal('modal-poema');
        await esperar();
        assert.equal(aberto('modal-visualizar'), true);
    });

    it('ida e volta: Ver, Editar, olho, Editar de novo, sempre um modal só', async () => {
        await abrirVisualizacao('poema', 7);
        for (let i = 0; i < 2; i++) {
            await editarDoModalVisualizacao();
            await esperar();
            assert.equal(aberto('modal-poema'), true);
            assert.equal(aberto('modal-visualizar'), false);
            await verDoModalEdicao();
            await esperar();
            assert.equal(aberto('modal-poema'), false);
            assert.equal(aberto('modal-visualizar'), true);
        }
    });
});

describe('links nas Conexões: Elos e Ecos abrem o Ver, Buracos abrem o Editar', () => {
    it('a ação "ver-poema" e a "editar-poema" estão ligadas em main.js', () => {
        const main = fs.readFileSync(path.resolve(__dirname, '../js/main.js'), 'utf8');
        assert.match(
            main,
            /'ver-poema': \(el\) => abrirVisualizacao\('poema', Number\(el\.dataset\.id\)\)/,
        );
        assert.match(main, /'editar-poema': \(el\) => editarPoema/);
        assert.match(main, /window\.verDoModalEdicao = verDoModalEdicao/);
    });

    it('renderiza buraco com editar-poema, elo e eco com ver-poema', async () => {
        document.body.innerHTML = `<main>
            <div id="conexoes-buracos"></div><div id="conexoes-elos"></div><div id="conexoes-ecos"></div>
        </main>`;
        const criar = document.createElement.bind(document);
        document.createElement = (tag, ...r) => {
            const el = criar(tag, ...r);
            if (String(tag).toLowerCase() === 'canvas') {
                el.getContext = () => ({
                    font: '',
                    measureText: (t) => ({ width: String(t).length * 6 }),
                });
            }
            return el;
        };
        const p = (id, titulo, conceitos = {}) => ({
            id,
            titulo,
            conceitos: { elos: [], ecos: [], ...conceitos },
        });
        db.poemas = [
            p(1, 'A', { elos: [{ id: 2, relacao: 'Resposta', direcao: 'destino', texto: '' }] }),
            p(2, 'B', { elos: [{ id: 1, relacao: 'Resposta', direcao: 'origem', texto: '' }] }),
            p(3, 'C', { elos: [{ id: 4, relacao: 'Reescrita', direcao: 'destino', texto: '' }] }),
            p(4, 'D'),
            p(5, 'E', { ecos: [{ id: 6, tipo: 'Tema', texto: '' }] }),
            p(6, 'F', { ecos: [{ id: 7, tipo: 'Imagem', texto: '' }] }),
            p(7, 'G'),
            p(8, 'H', { ecos: [{ id: 10, tipo: '', texto: '' }] }),
            p(9, 'I', { ecos: [{ id: 10, tipo: '', texto: '' }] }),
            p(10, 'J'),
        ];
        const { renderConexoes } = await import('../js/render-conexoes.js');
        renderConexoes();
        document.createElement = criar;

        const acoes = (id) =>
            [...document.querySelectorAll(`#${id} [data-action$="-poema"]`)].map(
                (n) => n.dataset.action,
            );
        const buracos = acoes('conexoes-buracos');
        assert.ok(buracos.length > 0 && buracos.every((a) => a === 'editar-poema'));
        const elos = acoes('conexoes-elos');
        assert.ok(elos.length > 0 && elos.every((a) => a === 'ver-poema'));
        const ecos = acoes('conexoes-ecos');
        assert.ok(ecos.length > 0 && ecos.every((a) => a === 'ver-poema'));
        // cadeia linear (E, F, G) e grafo que converge (H, I, J): os dois tipos
        assert.ok(document.querySelector('#conexoes-ecos .grafo-no[data-action="ver-poema"]'));
    });
});
