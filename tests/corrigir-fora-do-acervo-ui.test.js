import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Tela das correções da seção "Fora do acervo": botões, diálogo, confirmação,
// backup antes de gravar e Desfazer.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const i = html.indexOf('<section id="conexoes"');
const f = html.indexOf('<section id="sonoridade"', i);
assert.ok(i !== -1 && f !== -1);
document.body.innerHTML = `<main>${html.slice(i, f)}</main>`;

const { db } = await import('../js/db.js');
const { renderConexoes } = await import('../js/render-conexoes.js');
const { abrirCorrecaoObra, abrirCorrecaoAutor, manterObraDoAviso, pedirCorrecao, fecharDialogo } =
    await import('../js/corrigir-fora-do-acervo-ui.js');

const el = (id) => document.getElementById(id);
const tick = () => new Promise((r) => setTimeout(r, 0));
const confirmacaoAberta = () => {
    const c = el('modal-confirmar-exclusao');
    return Boolean(c) && c.style.display !== 'none';
};
const dialogoAberto = () => Boolean(el('modal-corrigir-fora-do-acervo'));
const snapshotOk = async () => true;
const snapshotFalha = async () => false;

function cenario() {
    Object.assign(db, {
        livros: [],
        partes: [],
        secoes: [],
        elementos: [],
        itensColetanea: [],
        poemas: [
            {
                id: 1,
                titulo: 'Águas',
                intertextualidade: [
                    {
                        relacao: 'Citação',
                        tipoObra: 'Música',
                        obra: 'Águas de Março',
                        autor: 'Tom Jobim',
                    },
                ],
            },
            {
                id: 2,
                titulo: 'Casmurro',
                intertextualidade: [
                    {
                        relacao: 'Alusão',
                        tipoObra: 'Música',
                        obra: 'aguas de março',
                        autor: 'tom jobim',
                    },
                ],
                hipertextualidade: [
                    {
                        relacao: 'Paródia',
                        tipoObra: 'Livro',
                        hipotexto: 'Dom Casmurro, de Machado',
                        autor: '',
                    },
                ],
            },
        ],
        prosas: [],
    });
    fecharDialogo();
    document.getElementById('modal-confirmar-exclusao')?.remove();
    document.querySelectorAll('button').forEach((b) => {
        if (b.textContent === 'Desfazer') b.closest('div')?.remove();
    });
    renderConexoes();
}

async function confirmar() {
    const botao = el('excl-confirmar');
    assert.ok(botao, 'confirmação aberta');
    botao.onclick();
    await tick();
    await tick();
}

describe('botões na seção', () => {
    beforeEach(cenario);

    it('cada obra tem Corrigir obra e cada autor tem Corrigir autor', () => {
        const raiz = el('conexoes-fora');
        assert.ok(raiz.querySelectorAll('[data-action="corrigir-obra-fora"]').length >= 2);
        assert.ok(raiz.querySelectorAll('[data-action="corrigir-autor-fora"]').length >= 1);
        raiz.querySelectorAll('[data-action="corrigir-obra-fora"]').forEach((b) =>
            assert.ok(b.dataset.chave.includes('|')),
        );
    });

    it('cada item dos avisos tem Manter esta', () => {
        const botoes = el('conexoes-fora').querySelectorAll('[data-action="manter-obra-fora"]');
        assert.ok(botoes.length >= 2);
        botoes.forEach((b) => {
            assert.ok(b.dataset.aviso !== undefined && b.dataset.item !== undefined);
        });
    });
});

describe('Corrigir obra', () => {
    beforeEach(cenario);

    it('abre o diálogo preenchido com o que a obra tem hoje', () => {
        assert.equal(abrirCorrecaoObra('aguas de marco|tom jobim'), true);
        assert.ok(dialogoAberto());
        assert.equal(el('corrigir-fora-obra').value, 'Águas de Março');
        // O autor vira uma tag; o campo de digitação fica vazio.
        assert.equal(el('corrigir-fora-autor').value, '');
        assert.deepEqual(
            [...el('corrigir-fora-autor-chips').children].map((c) => c.firstChild.textContent),
            ['Tom Jobim'],
        );
        assert.equal(el('corrigir-fora-tipo').value, 'Música');
    });

    it('chave desconhecida não abre nada', () => {
        assert.equal(abrirCorrecaoObra('nao existe|'), false);
        assert.equal(dialogoAberto(), false);
    });

    it('Revisar abre a confirmação com a contagem; confirmar grava e fecha o diálogo', async () => {
        abrirCorrecaoObra('dom casmurro de machado|', { tirarSnapshot: snapshotOk });
        el('corrigir-fora-obra').value = 'Dom Casmurro';
        el('corrigir-fora-autor').value = 'Machado de Assis';
        document.querySelector('[data-corrigir="revisar"]').click();
        assert.match(el('excl-mensagem').textContent, /1 texto/);
        assert.match(el('excl-mensagem').textContent, /backup/i);
        // nada gravado antes de confirmar
        assert.equal(db.poemas[1].hipertextualidade[0].hipotexto, 'Dom Casmurro, de Machado');
        await confirmar();
        assert.equal(db.poemas[1].hipertextualidade[0].hipotexto, 'Dom Casmurro');
        assert.equal(db.poemas[1].hipertextualidade[0].autor, 'Machado de Assis');
        assert.equal(dialogoAberto(), false);
        assert.match(el('conexoes-fora').textContent, /Machado de Assis/);
    });

    it('sem mexer em nada, avisa que não há o que alterar e mantém o diálogo', () => {
        abrirCorrecaoObra('dom casmurro de machado|');
        document.querySelector('[data-corrigir="revisar"]').click();
        assert.equal(confirmacaoAberta(), false);
        assert.ok(dialogoAberto());
    });

    it('uma grafia diferente conta como mudança: a confirmação abre', () => {
        abrirCorrecaoObra('aguas de marco|tom jobim');
        document.querySelector('[data-corrigir="revisar"]').click();
        assert.equal(confirmacaoAberta(), true);
        assert.match(el('excl-mensagem').textContent, /1 texto/);
    });

    it('nome vazio é recusado sem abrir a confirmação', () => {
        abrirCorrecaoObra('aguas de marco|tom jobim');
        el('corrigir-fora-obra').value = '   ';
        document.querySelector('[data-corrigir="revisar"]').click();
        assert.equal(confirmacaoAberta(), false);
    });

    it('o tipo só vai no pedido se foi mexido', async () => {
        abrirCorrecaoObra('aguas de marco|tom jobim', { tirarSnapshot: snapshotOk });
        el('corrigir-fora-autor-chips').querySelector('[data-autor-remover="0"]').click();
        el('corrigir-fora-autor').value = 'Antonio Carlos Jobim';
        document.querySelector('[data-corrigir="revisar"]').click();
        await confirmar();
        assert.equal(db.poemas[0].intertextualidade[0].tipoObra, 'Música');
        assert.equal(db.poemas[0].intertextualidade[0].autor, 'Antonio Carlos Jobim');
    });

    it('Cancelar e Esc fecham o diálogo', () => {
        abrirCorrecaoObra('aguas de marco|tom jobim');
        document.querySelector('[data-corrigir="cancelar"]').click();
        assert.equal(dialogoAberto(), false);
        abrirCorrecaoObra('aguas de marco|tom jobim');
        document.dispatchEvent(
            new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
        );
        assert.equal(dialogoAberto(), false);
    });
});

describe('backup, Desfazer e Corrigir autor', () => {
    beforeEach(cenario);

    it('sem backup, nada é gravado', async () => {
        pedirCorrecao(
            { tipo: 'autor', alvos: ['tom jobim'], novo: { autor: 'Outro' } },
            { tirarSnapshot: snapshotFalha },
        );
        await confirmar();
        assert.equal(db.poemas[0].intertextualidade[0].autor, 'Tom Jobim');
    });

    it('o diálogo rola dentro da tela e os botões ficam fora da rolagem', () => {
        abrirCorrecaoObra('dom casmurro de machado|');
        const cartao = document.querySelector('#modal-corrigir-fora-do-acervo [role="dialog"]');
        assert.match(cartao.className, /max-h-\[90vh\]/);
        assert.match(cartao.className, /md:max-w-xl/);
        const corpo = el('modal-corrigir-fora-do-acervo-corpo');
        assert.match(corpo.className, /overflow-y-auto/);
        assert.ok(corpo.querySelector('#corrigir-fora-obra'), 'campos dentro da rolagem');
        const revisar = document.querySelector('[data-corrigir="revisar"]');
        const cancelar = document.querySelector('[data-corrigir="cancelar"]');
        assert.equal(corpo.contains(revisar), false);
        assert.equal(corpo.contains(cancelar), false);
    });

    it('Corrigir autor troca em todos os textos e Desfazer devolve', async () => {
        abrirCorrecaoAutor('tom jobim', { tirarSnapshot: snapshotOk });
        el('corrigir-fora-autor-nome').value = 'Antonio Carlos Jobim';
        document.querySelector('[data-corrigir="revisar"]').click();
        await confirmar();
        assert.equal(db.poemas[0].intertextualidade[0].autor, 'Antonio Carlos Jobim');
        assert.equal(db.poemas[1].intertextualidade[0].autor, 'Antonio Carlos Jobim');

        const desfazer = [...document.querySelectorAll('button')].find(
            (b) => b.textContent === 'Desfazer',
        );
        assert.ok(desfazer, 'aviso com Desfazer');
        desfazer.click();
        assert.equal(db.poemas[0].intertextualidade[0].autor, 'Tom Jobim');
        assert.equal(db.poemas[1].intertextualidade[0].autor, 'tom jobim');
    });

    it('autor vazio é recusado', () => {
        abrirCorrecaoAutor('tom jobim');
        el('corrigir-fora-autor-nome').value = '';
        document.querySelector('[data-corrigir="revisar"]').click();
        assert.equal(confirmacaoAberta(), false);
    });
});

describe('Manter esta', () => {
    beforeEach(cenario);

    it('junta as obras do aviso na escolhida, depois de confirmar', async () => {
        const avisos = el('conexoes-fora').querySelectorAll('[data-action="manter-obra-fora"]');
        // a primeira linha de aviso é "mesmo título com autor diferente ou sem autor"?
        // procura o item "Tom Jobim" entre os botões de uma mesma linha
        let alvo = null;
        avisos.forEach((b) => {
            if (
                b.parentElement.textContent.includes('Águas de Março') &&
                b.parentElement.textContent.includes('Tom Jobim')
            ) {
                alvo = b;
            }
        });
        assert.ok(alvo, 'botão do item com autor');
        manterObraDoAviso(Number(alvo.dataset.aviso), Number(alvo.dataset.item), {
            tirarSnapshot: snapshotOk,
        });
        await confirmar();
        const chaves = new Set(
            [...db.poemas.flatMap((p) => p.intertextualidade)].map((e) => `${e.obra}|${e.autor}`),
        );
        assert.equal(chaves.size, 1);
    });

    it('item que não existe não faz nada', () => {
        assert.equal(manterObraDoAviso(99, 0), false);
    });
});

describe('Descrição no diálogo de Corrigir obra', () => {
    beforeEach(() => {
        cenario();
        db.poemas[0].intertextualidade[0].descricao = 'Canção de 1972';
        db.poemas[1].intertextualidade[0].descricao = 'Música brasileira';
        renderConexoes();
    });

    it('o diálogo traz a descrição mais usada e avisa que há descrições diferentes', () => {
        abrirCorrecaoObra('aguas de marco|tom jobim');
        assert.equal(el('corrigir-fora-descricao').tagName, 'TEXTAREA');
        assert.equal(el('corrigir-fora-descricao').value, 'Canção de 1972');
        assert.match(el('modal-corrigir-fora-do-acervo').textContent, /2 descrições diferentes/);
    });

    it('sem mexer na descrição, ela não vai no pedido e as exceções ficam como estão', async () => {
        abrirCorrecaoObra('aguas de marco|tom jobim', { tirarSnapshot: snapshotOk });
        el('corrigir-fora-autor').value = 'Antonio Carlos Jobim';
        document.querySelector('[data-corrigir="revisar"]').click();
        await confirmar();
        assert.equal(db.poemas[0].intertextualidade[0].descricao, 'Canção de 1972');
        assert.equal(db.poemas[1].intertextualidade[0].descricao, 'Música brasileira');
    });

    it('mexendo na descrição, a confirmação avisa a sobrescrita e vale para todos', async () => {
        abrirCorrecaoObra('aguas de marco|tom jobim', { tirarSnapshot: snapshotOk });
        el('corrigir-fora-descricao').value = 'Bossa nova, 1972';
        document.querySelector('[data-corrigir="revisar"]').click();
        assert.match(
            el('modal-confirmar-exclusao').textContent,
            /substitui uma descrição diferente em 2 entradas/,
        );
        await confirmar();
        assert.equal(db.poemas[0].intertextualidade[0].descricao, 'Bossa nova, 1972');
        assert.equal(db.poemas[1].intertextualidade[0].descricao, 'Bossa nova, 1972');
    });

    it('apagar o texto da descrição limpa nas duas entradas', async () => {
        abrirCorrecaoObra('aguas de marco|tom jobim', { tirarSnapshot: snapshotOk });
        el('corrigir-fora-descricao').value = '';
        document.querySelector('[data-corrigir="revisar"]').click();
        await confirmar();
        assert.equal(db.poemas[0].intertextualidade[0].descricao, '');
        assert.equal(db.poemas[1].intertextualidade[0].descricao, '');
    });
});

// ─── Autoria em lista (entrega 3 de 13) ──────────────────────

function cenarioDoisAutores() {
    Object.assign(db, {
        livros: [],
        partes: [],
        secoes: [],
        elementos: [],
        itensColetanea: [],
        poemas: [
            {
                id: 1,
                titulo: 'Ipanema',
                intertextualidade: [
                    {
                        relacao: 'Citação',
                        tipoObra: 'Música',
                        obra: 'Garota de Ipanema',
                        autores: ['Tom Jobim', 'Vinicius de Moraes'],
                    },
                ],
            },
            {
                id: 2,
                titulo: 'Praia',
                intertextualidade: [
                    {
                        relacao: 'Alusão',
                        tipoObra: 'Música',
                        obra: 'garota de ipanema',
                        autores: ['vinicius de moraes', 'tom jobim'],
                    },
                ],
                hipertextualidade: [
                    {
                        relacao: 'Paródia',
                        tipoObra: 'Música',
                        hipotexto: 'Chega de Saudade',
                        autores: ['Tom Jobim', 'Vinicius de Moraes'],
                    },
                ],
            },
        ],
        prosas: [],
    });
    fecharDialogo();
    document.getElementById('modal-confirmar-exclusao')?.remove();
    // Avisos "Desfazer" de testes anteriores ficam na tela; sem tirá-los, o
    // `find` pegaria um botão velho.
    document.querySelectorAll('button').forEach((b) => {
        if (b.textContent === 'Desfazer') b.closest('div')?.remove();
    });
    renderConexoes();
}

const tagsDoDialogo = () =>
    [...el('corrigir-fora-autor-chips').children].map((c) => c.firstChild.textContent);
const teclar = (alvo, key) =>
    alvo.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

describe('Corrigir obra com vários autores', () => {
    beforeEach(cenarioDoisAutores);

    function chaveDaObraIpanema() {
        const botao = [...document.querySelectorAll('[data-action="corrigir-obra-fora"]')].find(
            (b) => b.dataset.chave.startsWith('garota de ipanema|'),
        );
        assert.ok(botao, 'botão da obra');
        return botao.dataset.chave;
    }

    it('abre com uma tag por autor, na ordem mais usada', () => {
        abrirCorrecaoObra(chaveDaObraIpanema());
        assert.deepEqual(tagsDoDialogo(), ['Tom Jobim', 'Vinicius de Moraes']);
    });

    it('sem mexer nas tags, a ordem e a grafia diferentes do outro texto ainda contam como mudança', () => {
        abrirCorrecaoObra(chaveDaObraIpanema());
        document.querySelector('[data-corrigir="revisar"]').click();
        // O texto 2 escreve \"vinicius de moraes, tom jobim\": igualar é uma correção.
        assert.equal(confirmacaoAberta(), true);
        assert.match(el('excl-mensagem').textContent, /1 texto/);
    });

    it('Enter com texto cria a tag e NÃO revisa; Enter com o campo vazio revisa', () => {
        abrirCorrecaoObra(chaveDaObraIpanema());
        const campo = el('corrigir-fora-autor');
        campo.value = 'Chico Buarque';
        teclar(campo, 'Enter');
        assert.deepEqual(tagsDoDialogo(), ['Tom Jobim', 'Vinicius de Moraes', 'Chico Buarque']);
        assert.equal(confirmacaoAberta(), false);
        teclar(campo, 'Enter');
        assert.equal(confirmacaoAberta(), true);
    });

    it('tirar uma tag e confirmar grava a lista nova em todos os textos; Desfazer devolve', async () => {
        abrirCorrecaoObra(chaveDaObraIpanema(), { tirarSnapshot: snapshotOk });
        el('corrigir-fora-autor-chips').querySelector('[data-autor-remover="1"]').click();
        assert.deepEqual(tagsDoDialogo(), ['Tom Jobim']);
        document.querySelector('[data-corrigir="revisar"]').click();
        await confirmar();
        const entradas = db.poemas.map((p) => p.intertextualidade[0]);
        entradas.forEach((e) => {
            const lista = e.autores || [e.autor];
            assert.deepEqual(lista, ['Tom Jobim']);
        });
        // A Hipertextualidade tem outra obra (outro nome): não mudou.
        assert.deepEqual(db.poemas[1].hipertextualidade[0].autores, [
            'Tom Jobim',
            'Vinicius de Moraes',
        ]);
        const desfazer = [...document.querySelectorAll('button')].find(
            (b) => b.textContent === 'Desfazer',
        );
        desfazer.click();
        assert.deepEqual(db.poemas[0].intertextualidade[0].autores, [
            'Tom Jobim',
            'Vinicius de Moraes',
        ]);
        assert.deepEqual(db.poemas[1].intertextualidade[0].autores, [
            'vinicius de moraes',
            'tom jobim',
        ]);
    });

    it('texto digitado e sem Enter entra como tag ao revisar', async () => {
        abrirCorrecaoObra(chaveDaObraIpanema(), { tirarSnapshot: snapshotOk });
        el('corrigir-fora-autor').value = 'Chico Buarque';
        document.querySelector('[data-corrigir="revisar"]').click();
        await confirmar();
        assert.deepEqual(db.poemas[0].intertextualidade[0].autores, [
            'Tom Jobim',
            'Vinicius de Moraes',
            'Chico Buarque',
        ]);
    });

    it('sem nenhuma tag, tira os autores da obra', async () => {
        abrirCorrecaoObra(chaveDaObraIpanema(), { tirarSnapshot: snapshotOk });
        el('corrigir-fora-autor-chips').querySelector('[data-autor-remover="1"]').click();
        el('corrigir-fora-autor-chips').querySelector('[data-autor-remover="0"]').click();
        assert.deepEqual(tagsDoDialogo(), []);
        document.querySelector('[data-corrigir="revisar"]').click();
        await confirmar();
        db.poemas.forEach((p) => {
            const e = p.intertextualidade[0];
            assert.deepEqual(e.autores || (e.autor ? [e.autor] : []), []);
        });
    });

    it('as sugestões do campo não oferecem quem já é tag', () => {
        abrirCorrecaoObra(chaveDaObraIpanema());
        const opcoes = [...document.querySelectorAll('#corrigir-fora-lista-autores option')].map(
            (o) => o.value,
        );
        assert.ok(!opcoes.includes('Tom Jobim'));
        assert.ok(!opcoes.includes('Vinicius de Moraes'));
    });
});

describe('Manter esta e Corrigir autor com vários autores', () => {
    beforeEach(cenarioDoisAutores);

    it('Manter esta guarda a lista de autores inteira, sem juntar tudo numa tag', async () => {
        const botoes = [
            ...el('conexoes-fora').querySelectorAll('[data-action="manter-obra-fora"]'),
        ];
        const alvo = botoes.find((b) => b.parentElement.textContent.includes('Garota de Ipanema'));
        assert.ok(alvo, 'há um aviso com a obra de dois autores');
        manterObraDoAviso(Number(alvo.dataset.aviso), Number(alvo.dataset.item), {
            tirarSnapshot: snapshotOk,
        });
        if (confirmacaoAberta()) await confirmar();
        db.poemas.forEach((p) => {
            const e = p.intertextualidade[0];
            assert.deepEqual(e.autores, ['Tom Jobim', 'Vinicius de Moraes']);
            assert.equal(e.autor, undefined);
        });
    });

    it('Corrigir autor troca só a tag, também nas obras com mais de um autor', async () => {
        abrirCorrecaoAutor('tom jobim', { tirarSnapshot: snapshotOk });
        el('corrigir-fora-autor-nome').value = 'Antonio Carlos Jobim';
        document.querySelector('[data-corrigir="revisar"]').click();
        await confirmar();
        assert.deepEqual(db.poemas[0].intertextualidade[0].autores, [
            'Antonio Carlos Jobim',
            'Vinicius de Moraes',
        ]);
        assert.deepEqual(db.poemas[1].intertextualidade[0].autores, [
            'vinicius de moraes',
            'Antonio Carlos Jobim',
        ]);
        assert.deepEqual(db.poemas[1].hipertextualidade[0].autores, [
            'Antonio Carlos Jobim',
            'Vinicius de Moraes',
        ]);
    });
});
