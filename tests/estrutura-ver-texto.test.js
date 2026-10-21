import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Fase 19, etapa 2: cada título de texto da Estrutura abre o Ver do texto.
// No Ver do Livro: fecha o livro, abre o texto e, ao fechar o texto, o livro
// volta com a Estrutura e a rolagem como estavam (também pelo desvio do Editar).
// Na aba Estrutura: o título abre o Ver, e "Expandir tudo" e "Recolher tudo"
// abrem e fecham todas as Partes e Seções.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const lerModal = (arquivo) =>
    fs.readFileSync(path.resolve(__dirname, '../modais', arquivo), 'utf8');

globalThis.fetch = async (url) => ({
    ok: true,
    status: 200,
    text: async () => lerModal(path.basename(url)),
});
document.body.innerHTML =
    '<main><div id="estrutura-arvore"></div></main><div id="modais-container"></div>';

const { registrarModal, toggleModal } = await import('../js/modais.js');
const { db } = await import('../js/db.js');
const { rastreadorPoema } = await import('../js/forms.js');
const { abrirVisualizacao, editarDoModalVisualizacao } = await import('../js/visualizar.js');
const {
    abrirVisualizacaoLivro,
    abrirTextoDaEstruturaLivro,
    renderEstruturaLivroHtml,
    navegarVisualizacaoLivro,
} = await import('../js/visualizar-livro.js');
const {
    setLivroEstrutura,
    expandirTodosEstrutura,
    renderEstrutura,
    definirPosicaoEstrutura,
    editarPosicaoEstrutura,
} = await import('../js/render-estrutura.js');

registrarModal('modal-visualizar-livro', 'modal-visualizar-livro.html', () => {});
registrarModal('modal-visualizar', 'modal-visualizar.html', () => {});
registrarModal(
    'modal-poema',
    'modal-poema.html',
    () => {
        const form = document.getElementById('form-poema');
        rastreadorPoema.observar(form);
        form.noValidate = true;
        form.onsubmit = (e) => {
            e.preventDefault();
            rastreadorPoema.marcarLimpo();
            toggleModal('modal-poema');
        };
    },
    rastreadorPoema,
);

const conceitos = { elos: [], ecos: [] };

function dados() {
    return {
        livros: [
            { id: 1, titulo: 'Livro Um', tipo: 'Inéditos', sequencia: 1 },
            { id: 2, titulo: 'Coletânea Dois', tipo: 'Coletânea', sequencia: 2 },
        ],
        partes: [
            { id: 10, livroId: 1, titulo: 'Parte A', sequencia: 1 },
            { id: 20, livroId: 2, titulo: 'Parte da Coletânea', sequencia: 1 },
        ],
        secoes: [{ id: 100, paiTipo: 'parte', paiId: 10, titulo: 'Seção A1', sequencia: 1 }],
        elementos: [{ id: 900, paiTipo: 'secao', paiId: 100, tipo: 'Respiro', sequencia: 1 }],
        poemas: [
            {
                id: 1,
                titulo: 'Poema na seção',
                paiTipo: 'secao',
                paiId: 100,
                sequencia: 2,
                conceitos,
            },
            {
                id: 2,
                titulo: 'Poema na parte',
                paiTipo: 'parte',
                paiId: 10,
                sequencia: 2,
                conceitos,
            },
            { id: 3, titulo: 'Poema só vinculado', livrosIds: [1], conceitos },
        ],
        prosas: [
            {
                id: 1,
                titulo: 'Prosa no livro',
                paiTipo: 'livro',
                paiId: 1,
                sequencia: 4,
                conceitos,
            },
        ],
        itensColetanea: [
            { id: 1, parteId: 20, titulo: 'Item ligado', sequencia: 2, refId: 1, refTipo: 'poema' },
            { id: 2, parteId: 20, titulo: 'Item inédito', sequencia: 1 },
        ],
    };
}

const aberto = (id) => {
    const el = document.getElementById(id);
    return !!el && !el.classList.contains('hidden');
};
const abertos = () =>
    [...document.querySelectorAll('.fixed[id^="modal-"]:not(.hidden)')].map((m) => m.id);
const conteudoLivro = () => document.getElementById('visualizar-livro-conteudo');
const secao = () => conteudoLivro().querySelector('details[data-estrutura-livro]');
const noPorChave = (chave) =>
    conteudoLivro().querySelector(`details[data-estrutura-chave="${chave}"]`);
const tituloClicavel = (texto) =>
    [...conteudoLivro().querySelectorAll('[data-estrutura-ver]')].find(
        (el) => el.textContent.trim() === texto,
    );
const esperar = () => new Promise((r) => setTimeout(r, 20));

// Fechar o Ver do texto dispara a volta ao livro (de propósito), então a limpeza
// repete até nada ficar aberto.
async function fecharTudo() {
    for (let volta = 0; volta < 4 && abertos().length; volta++) {
        for (const id of ['modal-poema', 'modal-visualizar', 'modal-visualizar-livro']) {
            if (aberto(id)) {
                rastreadorPoema.marcarLimpo();
                await toggleModal(id);
                await esperar();
            }
        }
    }
}

describe('Ver do Livro: quais títulos são clicáveis', () => {
    it('Poema, Prosa, Parte, Seção e Elemento são clicáveis', () => {
        const html = renderEstruturaLivroHtml({
            arvore: [
                {
                    tipo: 'parte',
                    dados: { id: 10, titulo: 'Parte A', sequencia: 1 },
                    filhos: [
                        { tipo: 'poema', dados: { id: 5, titulo: 'P', sequencia: 1 } },
                        { tipo: 'prosa', dados: { id: 6, titulo: 'R', sequencia: 2 } },
                        { tipo: 'elemento', dados: { id: 7, tipo: 'Respiro', sequencia: 3 } },
                    ],
                },
            ],
            vinculados: [],
        });
        const raiz = document.createElement('div');
        raiz.innerHTML = html;
        const alvos = [...raiz.querySelectorAll('[data-estrutura-ver]')];
        assert.deepEqual(
            alvos.map((a) => [a.dataset.tipo, a.dataset.id, a.textContent.trim()]),
            [
                ['parte', '10', 'Parte A'],
                ['poema', '5', 'P'],
                ['prosa', '6', 'R'],
                ['elemento', '7', 'Respiro'],
            ],
        );
    });

    it('item de Coletânea só é clicável quando aponta para poema ou prosa', () => {
        const html = renderEstruturaLivroHtml({
            arvore: [
                {
                    tipo: 'parte',
                    dados: { id: 20, titulo: 'Parte', sequencia: 1 },
                    filhos: [
                        {
                            tipo: 'item',
                            dados: { id: 1, titulo: 'Ligado', refId: 3, refTipo: 'prosa' },
                        },
                        { tipo: 'item', dados: { id: 2, titulo: 'Inédito' } },
                    ],
                },
            ],
            vinculados: [],
        });
        const raiz = document.createElement('div');
        raiz.innerHTML = html;
        // A Parte é clicável; dos dois itens, só o que aponta para uma prosa.
        const alvos = [...raiz.querySelectorAll('[data-estrutura-ver]')].filter(
            (el) => el.dataset.tipo !== 'parte',
        );
        assert.equal(alvos.length, 1);
        assert.equal(alvos[0].dataset.tipo, 'prosa');
        assert.equal(alvos[0].dataset.id, '3');
    });

    it('os textos vinculados também são clicáveis', async () => {
        Object.assign(db, dados());
        await abrirVisualizacaoLivro(1);
        assert.ok(tituloClicavel('Poema só vinculado'));
        await fecharTudo();
    });
});

describe('Ver do Livro: título abre o Ver do texto e a volta restaura a Estrutura', () => {
    beforeEach(async () => {
        localStorage.clear();
        Object.assign(db, dados());
        await fecharTudo();
    });

    it('clicar no título fecha o livro e abre o texto, um modal só', async () => {
        await abrirVisualizacaoLivro(1);
        secao().open = true;
        tituloClicavel('Poema na parte').click();
        await esperar();
        assert.deepEqual(abertos(), ['modal-visualizar']);
        assert.equal(
            document.getElementById('modal-visualizar-titulo').innerText,
            'Poema na parte',
        );
    });

    it('prosa abre o Ver da prosa', async () => {
        await abrirVisualizacaoLivro(1);
        tituloClicavel('Prosa no livro').click();
        await esperar();
        assert.deepEqual(abertos(), ['modal-visualizar']);
        assert.equal(
            document.getElementById('modal-visualizar-titulo').innerText,
            'Prosa no livro',
        );
    });

    it('item de Coletânea ligado a um poema abre o Ver dele', async () => {
        await abrirVisualizacaoLivro(2);
        secao().open = true;
        tituloClicavel('Item ligado').click();
        await esperar();
        assert.deepEqual(abertos(), ['modal-visualizar']);
        assert.equal(
            document.getElementById('modal-visualizar-titulo').innerText,
            'Poema na seção',
        );
    });

    it('fechar o Ver do texto reabre o livro com a Estrutura e os níveis como estavam', async () => {
        await abrirVisualizacaoLivro(1);
        secao().open = true;
        noPorChave('parte-10').open = true;
        // Seção A1 fica fechada de propósito
        tituloClicavel('Poema na parte').click();
        await esperar();
        await toggleModal('modal-visualizar');
        await esperar();
        assert.deepEqual(abertos(), ['modal-visualizar-livro']);
        assert.equal(secao().open, true);
        assert.equal(noPorChave('parte-10').open, true);
        assert.equal(noPorChave('secao-100').open, false);
    });

    it('a seção Estrutura fechada continua fechada na volta', async () => {
        await abrirVisualizacaoLivro(1);
        tituloClicavel('Prosa no livro').click();
        await esperar();
        await toggleModal('modal-visualizar');
        await esperar();
        assert.equal(secao().open, false);
    });

    it('a rolagem do modal volta onde estava', async () => {
        await abrirVisualizacaoLivro(1);
        secao().open = true;
        conteudoLivro().scrollTop = 240;
        tituloClicavel('Prosa no livro').click();
        await esperar();
        await toggleModal('modal-visualizar');
        await esperar();
        assert.equal(conteudoLivro().scrollTop, 240);
    });

    it('a navegação "n de N" do livro é a mesma depois da volta', async () => {
        await abrirVisualizacaoLivro(1, { ids: [1, 2] });
        tituloClicavel('Prosa no livro').click();
        await esperar();
        await toggleModal('modal-visualizar');
        await esperar();
        assert.equal(document.getElementById('visualizar-livro-total').textContent, 'de 2');
        assert.equal(document.getElementById('visualizar-livro-posicao').value, '1');
        navegarVisualizacaoLivro(1);
        assert.match(
            document.getElementById('modal-visualizar-livro-titulo').innerText,
            /Coletânea/,
        );
    });

    it('o título aberto não alterna o <details> ao redor', async () => {
        await abrirVisualizacaoLivro(1);
        secao().open = true;
        const parte = noPorChave('parte-10');
        parte.open = true;
        const ev = new window.Event('click', { bubbles: true, cancelable: true });
        tituloClicavel('Poema na parte').dispatchEvent(ev);
        assert.equal(ev.defaultPrevented, true);
    });

    it('texto que não existe mais não fecha o livro', async () => {
        await abrirVisualizacaoLivro(1);
        await abrirTextoDaEstruturaLivro('poema', 999);
        assert.deepEqual(abertos(), ['modal-visualizar-livro']);
    });

    it('Editar no Ver do texto: o livro espera, e reabre só quando o Ver do texto fecha', async () => {
        await abrirVisualizacaoLivro(1);
        secao().open = true;
        noPorChave('parte-10').open = true;
        tituloClicavel('Poema na parte').click();
        await esperar();
        await editarDoModalVisualizacao();
        await esperar();
        assert.deepEqual(abertos(), ['modal-poema'], 'só o Editar, o livro não reabriu ainda');
        rastreadorPoema.marcarLimpo();
        await toggleModal('modal-poema');
        await esperar();
        assert.deepEqual(abertos(), ['modal-visualizar'], 'o Ver do texto voltou');
        await toggleModal('modal-visualizar');
        await esperar();
        assert.deepEqual(abertos(), ['modal-visualizar-livro']);
        assert.equal(noPorChave('parte-10').open, true, 'a Estrutura segue como estava');
    });

    it('Ver aberto fora do livro não herda uma volta antiga', async () => {
        await abrirVisualizacaoLivro(1);
        tituloClicavel('Prosa no livro').click();
        await esperar();
        await toggleModal('modal-visualizar');
        await esperar();
        await fecharTudo();
        // abertura nova, sem retorno: fechar não deve reabrir livro nenhum
        await abrirVisualizacao('poema', 1);
        await toggleModal('modal-visualizar');
        await esperar();
        assert.deepEqual(abertos(), []);
    });
});

describe('aba Estrutura: título abre o Ver e Expandir/Recolher tudo', () => {
    const arvore = () => document.getElementById('estrutura-arvore');
    const nos = () => [...arvore().querySelectorAll('details.details-icone[data-key]')];

    beforeEach(async () => {
        localStorage.clear();
        Object.assign(db, dados());
        await fecharTudo();
        setLivroEstrutura(1);
    });

    it('título de Poema, Prosa, Parte, Seção e Elemento leva data-action', () => {
        const acoes = [...arvore().querySelectorAll('[data-action^="ver-"]')].map((el) => [
            el.dataset.action,
            el.textContent.trim(),
        ]);
        assert.deepEqual(acoes.sort(), [
            ['ver-elemento-estrutura', 'Respiro'],
            ['ver-parte-estrutura', 'Parte A'],
            ['ver-poema', 'Poema na parte'],
            ['ver-poema', 'Poema na seção'],
            ['ver-prosa', 'Prosa no livro'],
            ['ver-secao-estrutura', 'Seção A1'],
        ]);
    });

    it('Recolher tudo fecha todas as Partes e Seções, com o emoji de pasta fechada', () => {
        assert.ok(nos().length >= 2);
        assert.ok(nos().every((d) => d.open));
        expandirTodosEstrutura(false);
        assert.ok(nos().every((d) => !d.open));
        assert.ok(
            nos().every(
                (d) =>
                    d.querySelector(':scope > summary .icone-details').textContent ===
                    d.dataset.iconeFechado,
            ),
        );
    });

    it('Expandir tudo reabre tudo, com o emoji de pasta aberta', () => {
        expandirTodosEstrutura(false);
        expandirTodosEstrutura(true);
        assert.ok(nos().every((d) => d.open));
        assert.ok(
            nos().every(
                (d) =>
                    d.querySelector(':scope > summary .icone-details').textContent ===
                    d.dataset.iconeAberto,
            ),
        );
    });

    it('o estado escolhido sobrevive a uma nova renderização (como depois de um ▲▼)', () => {
        expandirTodosEstrutura(false);
        renderEstrutura();
        assert.ok(nos().every((d) => !d.open));
        expandirTodosEstrutura(true);
        renderEstrutura();
        assert.ok(nos().every((d) => d.open));
    });

    it('escolher o livro de novo começa com tudo aberto', () => {
        expandirTodosEstrutura(false);
        setLivroEstrutura(1);
        assert.ok(nos().every((d) => d.open));
    });
});

describe('aba Estrutura: editar a posição direto no selo', () => {
    const arvore = () => document.getElementById('estrutura-arvore');
    const selo = (titulo) => {
        const linha = [...arvore().querySelectorAll('span')].find(
            (el) => el.textContent.trim() === titulo,
        );
        return linha.parentElement.querySelector('[data-action="editar-posicao-estrutura"]');
    };

    beforeEach(async () => {
        localStorage.clear();
        Object.assign(db, dados());
        await fecharTudo();
        setLivroEstrutura(1);
    });

    it('todo selo de posição leva a ação de editar, com tipo e id', () => {
        const s = selo('Poema na parte');
        assert.equal(s.dataset.tipo, 'poema');
        assert.equal(s.dataset.id, '2');
        assert.equal(selo('Parte A').dataset.tipo, 'parte');
    });

    it('definirPosicaoEstrutura grava só o item, sem empurrar os vizinhos', () => {
        assert.equal(definirPosicaoEstrutura('poema', 2, '12'), true);
        assert.equal(db.poemas.find((p) => p.id === 2).sequencia, 12);
        assert.equal(db.poemas.find((p) => p.id === 1).sequencia, 2, 'vizinho intacto');
    });

    it('aceita número igual ao de outro irmão (o selo fica âmbar, como já ficava)', () => {
        definirPosicaoEstrutura('prosa', 1, '1');
        setLivroEstrutura(1);
        assert.match(selo('Prosa no livro').className, /amber/);
    });

    it('funciona também para Parte, Seção e Elemento', () => {
        assert.equal(definirPosicaoEstrutura('parte', 10, '7'), true);
        assert.equal(db.partes.find((p) => p.id === 10).sequencia, 7);
        assert.equal(definirPosicaoEstrutura('secao', 100, '5'), true);
        assert.equal(definirPosicaoEstrutura('elemento', 900, '9'), true);
    });

    it('valor inválido ou item inexistente não muda nada', () => {
        for (const v of ['', '0', '-3', '2,5', 'abc', '1e3', null]) {
            assert.equal(definirPosicaoEstrutura('poema', 2, v), false, String(v));
        }
        assert.equal(db.poemas.find((p) => p.id === 2).sequencia, 2);
        assert.equal(definirPosicaoEstrutura('poema', 999, '3'), false);
    });

    it('clicar abre uma caixa com o número atual; Enter grava e redesenha', () => {
        editarPosicaoEstrutura(selo('Poema na parte'));
        const campo = arvore().querySelector('input[aria-label="Posição"]');
        assert.ok(campo);
        assert.equal(campo.value, '2');
        campo.value = '12';
        campo.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        assert.equal(db.poemas.find((p) => p.id === 2).sequencia, 12);
        assert.equal(arvore().querySelector('input[aria-label="Posição"]'), null);
        assert.equal(selo('Poema na parte').textContent.trim(), '12');
    });

    it('Esc cancela sem gravar', () => {
        editarPosicaoEstrutura(selo('Poema na parte'));
        const campo = arvore().querySelector('input[aria-label="Posição"]');
        campo.value = '40';
        campo.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        assert.equal(db.poemas.find((p) => p.id === 2).sequencia, 2);
        assert.equal(selo('Poema na parte').textContent.trim(), '2');
    });

    it('sair do campo (blur) grava', () => {
        editarPosicaoEstrutura(selo('Poema na parte'));
        const campo = arvore().querySelector('input[aria-label="Posição"]');
        campo.value = '8';
        campo.dispatchEvent(new window.Event('blur'));
        assert.equal(db.poemas.find((p) => p.id === 2).sequencia, 8);
    });

    it('no selo de uma Parte, o clique não alterna o <details>', () => {
        const ev = new window.Event('click', { bubbles: true, cancelable: true });
        editarPosicaoEstrutura(selo('Parte A'), ev);
        assert.equal(ev.defaultPrevented, true);
        assert.ok(arvore().querySelector('input[aria-label="Posição"]'));
    });
});
