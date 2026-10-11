// Etapa 4b: modal "Sugerir Ecos", botões nos cartões e ligação no main.js.
import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(__dirname, '..');
const lerArquivo = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const HTML_MODAL = lerArquivo('modais/modal-sugestao-ecos.html');
const MAIN_JS = lerArquivo('js/main.js');

document.body.innerHTML = `
    <main>
        <div id="lista-personagens"></div>
    </main>
    <div id="modais-container">${HTML_MODAL}</div>
`;

const { db } = await import('../js/db.js');
const U = await import('../js/ui-sugestao-ecos.js');
const P = await import('../js/ui-personagens.js');

const modal = () => document.getElementById('modal-sugestao-ecos');
const aberto = () => !modal().classList.contains('hidden');
const clicar = (seletor) => document.querySelector(seletor).click();
const pares = () => [...document.querySelectorAll('[data-sug-par]')];

const voz = (id) => ({ personagemId: id, papeis: ['Voz'], centralidade: 'protagonista' });
const mencao = (id) => ({ personagemId: id, papeis: ['Menção'], centralidade: '' });

function semear() {
    db.personagens.length = 0;
    db.poemas.length = 0;
    db.prosas.length = 0;
    db.pessoas.length = 0;
    db.ecosIgnorados = [];
    db.personagens.push({ id: 10, nome: 'Iara' }, { id: 11, nome: 'Sozinho' });
    db.poemas.push(
        { id: 1, titulo: 'Maré', dataEscrita: { ano: 2019 }, personagens: [voz(10), voz(11)] },
        { id: 2, titulo: 'Rede <b>', dataEscrita: { ano: 2021 }, personagens: [mencao(10)] },
        { id: 3, titulo: 'Sem Data', personagens: [voz(10)] },
    );
    db.prosas.push({ id: 1, titulo: 'Cais', dataEscrita: { ano: 2023 }, personagens: [voz(10)] });
}

let iniciado = false;
beforeEach(() => {
    semear();
    if (aberto()) modal().classList.add('hidden');
    if (!iniciado) {
        U.initSugestaoEcos();
        iniciado = true;
    }
});

describe('ligação', () => {
    it('main.js registra o modal, a ação e o init', () => {
        assert.match(
            MAIN_JS,
            /registrarModal\('modal-sugestao-ecos', 'modal-sugestao-ecos\.html', initSugestaoEcos\)/,
        );
        assert.match(MAIN_JS, /'sugerir-ecos': \(el\) => abrirSugestaoEcos\(/);
    });

    it('o HTML do modal tem os ids que o módulo usa', () => {
        for (const id of [
            'modal-sugestao-ecos-titulo',
            'sug-ecos-intro',
            'sug-ecos-superficiais',
            'sug-ecos-rotulo-superficiais',
            'sug-ecos-criados',
            'sug-ecos-lista',
            'sug-ecos-mais',
        ]) {
            assert.ok(document.getElementById(id), id);
        }
    });

    it('sem travessão no texto do modal', () => {
        assert.ok(!HTML_MODAL.includes('—'));
    });
});

describe('botão no cartão do Personagem', () => {
    it('aparece só com dois textos ou mais, com espécie e id', () => {
        P.renderPersonagens();
        const iara = document.querySelector('[data-personagem-id="10"]');
        const btn = iara.querySelector('[data-action="sugerir-ecos"]');
        assert.ok(btn);
        assert.equal(btn.dataset.especie, 'personagem');
        assert.equal(btn.dataset.id, '10');
        const sozinho = document.querySelector('[data-personagem-id="11"]');
        assert.equal(sozinho.querySelector('[data-action="sugerir-ecos"]'), null);
    });
});

describe('modal', () => {
    it('abre com os pares, mais prováveis primeiro, e escapa o HTML dos títulos', async () => {
        await U.abrirSugestaoEcos('personagem', 10);
        assert.ok(aberto());
        assert.equal(
            document.getElementById('modal-sugestao-ecos-titulo').textContent,
            'Sugerir Ecos: Iara',
        );
        assert.match(document.getElementById('sug-ecos-intro').textContent, /4 textos \(6 pares/);
        // Rede só menciona, então os 3 pares dela (força 1) vêm depois dos 3 de força 2.
        assert.equal(pares().length, 6);
        // O título com HTML aparece como texto, sem virar elemento.
        assert.equal(document.querySelector('#sug-ecos-lista b'), null);
        assert.ok(document.getElementById('sug-ecos-lista').textContent.includes('Rede <b>'));
    });

    it('par com datas que decidem tem botão principal e o inverso; sem datas, dois neutros', async () => {
        await U.abrirSugestaoEcos('personagem', 10);
        const mareCais = pares().find(
            (p) => p.textContent.includes('Maré') && p.textContent.includes('Cais'),
        );
        const botoes = [...mareCais.querySelectorAll('[data-sug-criar]')];
        assert.equal(botoes.length, 2);
        assert.match(botoes[0].textContent, /^Criar: “Cais” ecoa “Maré”/);
        assert.match(botoes[1].textContent, /^“Maré” ecoa “Cais”/);
        assert.match(mareCais.textContent, /o mais novo é “Cais”/);

        const semData = pares().find((p) => p.textContent.includes('Sem Data'));
        assert.match(semData.textContent, /As datas não decidem/);
        assert.ok(
            ![...semData.querySelectorAll('button')].some((b) => /^Criar:/.test(b.textContent)),
        );
    });

    it('criar grava o Eco no texto mais novo, tira o par da lista e mostra "Criados agora"', async () => {
        await U.abrirSugestaoEcos('personagem', 10);
        const antes = pares().length;
        const mareCais = pares().find(
            (p) => p.textContent.includes('Maré') && p.textContent.includes('Cais'),
        );
        mareCais.querySelector('[data-sug-criar][data-dono]').click();
        // Dos dois botões, o primeiro é o principal (Cais ecoa Maré).
        assert.deepEqual(db.prosas[0].conceitos.ecos, [
            {
                id: 1,
                tipo: 'Personagem em comum',
                texto: '',
                ancoras: [{ especie: 'personagem', id: 10 }],
            },
        ]);
        assert.equal(pares().length, antes - 1);
        assert.match(
            document.getElementById('sug-ecos-criados').textContent,
            /Criados agora \(1\)/,
        );
        assert.match(document.getElementById('sug-ecos-criados').textContent, /“Cais” ecoa “Maré”/);
        assert.match(document.getElementById('sug-ecos-intro').textContent, /1 já tem Eco/);
    });

    it('desfazer devolve o par à lista e remove o Eco', async () => {
        await U.abrirSugestaoEcos('personagem', 10);
        const antes = pares().length;
        document.querySelector('[data-sug-par] [data-sug-criar]').click();
        assert.equal(pares().length, antes - 1);
        clicar('[data-sug-desfazer]');
        assert.equal(pares().length, antes);
        assert.equal(document.getElementById('sug-ecos-criados').textContent.trim(), '');
        const total = [...db.poemas, ...db.prosas].flatMap((t) => t.conceitos?.ecos || []);
        assert.equal(total.length, 0);
    });

    it('a caixa de superficiais revela os pares de menção nos dois lados e o contador some', async () => {
        db.poemas[2].personagens = [mencao(10)]; // Sem Data passa a só mencionar
        await U.abrirSugestaoEcos('personagem', 10);
        assert.equal(pares().length, 5);
        assert.match(
            document.getElementById('sug-ecos-rotulo-superficiais').textContent,
            /\(1 ocultos\)/,
        );
        const caixa = document.getElementById('sug-ecos-superficiais');
        caixa.checked = true;
        caixa.dispatchEvent(new window.Event('change', { bubbles: true }));
        assert.equal(pares().length, 6);
        assert.ok(
            !document
                .getElementById('sug-ecos-rotulo-superficiais')
                .textContent.includes('ocultos'),
        );
    });

    it('pagina: mostra 15 e "Mostrar mais" libera o resto', async () => {
        db.poemas.length = 0;
        db.prosas.length = 0;
        for (let i = 1; i <= 8; i++) {
            db.poemas.push({
                id: i,
                titulo: `T${i}`,
                dataEscrita: { ano: 2000 + i },
                personagens: [voz(10)],
            });
        }
        await U.abrirSugestaoEcos('personagem', 10); // 28 pares
        assert.equal(pares().length, 15);
        assert.match(document.getElementById('sug-ecos-lista').textContent, /15 de 28 pares/);
        assert.match(document.querySelector('[data-sug-mais]').textContent, /Mostrar mais 13/);
        clicar('[data-sug-mais]');
        assert.equal(pares().length, 28);
        assert.equal(document.querySelector('[data-sug-mais]'), null);
    });

    it('reabrir começa do zero: sem "criados", caixa desmarcada, 15 pares', async () => {
        await U.abrirSugestaoEcos('personagem', 10);
        document.querySelector('[data-sug-par] [data-sug-criar]').click();
        modal().classList.add('hidden');
        await U.abrirSugestaoEcos('personagem', 10);
        assert.equal(document.getElementById('sug-ecos-criados').textContent.trim(), '');
        assert.equal(document.getElementById('sug-ecos-superficiais').checked, false);
    });

    it('sujeito com um texto só mostra o motivo, sem lista', async () => {
        await U.abrirSugestaoEcos('personagem', 11);
        assert.match(
            document.getElementById('sug-ecos-intro').textContent,
            /pelo menos dois textos/,
        );
        assert.equal(pares().length, 0);
    });

    it('id que não existe não abre nada', async () => {
        await U.abrirSugestaoEcos('personagem', 999);
        assert.equal(aberto(), false);
    });

    it('par que ganhou Eco por outro caminho avisa e atualiza a lista', async () => {
        await U.abrirSugestaoEcos('personagem', 10);
        const par = document.querySelector('[data-sug-par] [data-sug-criar]');
        // Antes do clique, o Eco aparece por fora do modal.
        const chave = par.dataset.sugCriar;
        const [a, b] = chave.split('|').map((c) => c.split(':'));
        const col = (c) => (c === 'poemas' ? db.poemas : db.prosas);
        const textoA = col(a[0]).find((t) => t.id == a[1]);
        const textoB = col(b[0]).find((t) => t.id == b[1]);
        textoA.conceitos = { ecos: [{ id: textoB.id, tipo: 'Aceno a', texto: '' }] };
        par.click();
        const total = [...db.poemas, ...db.prosas].flatMap((t) => t.conceitos?.ecos || []);
        assert.equal(total.length, 1, 'nada foi criado por cima');
        assert.equal(document.querySelector(`[data-sug-par="${chave}"]`), null);
    });
});

describe('ignorar par', () => {
    it('Ignorar tira o par da lista, grava no acervo e lista em "Ignorados"', async () => {
        await U.abrirSugestaoEcos('personagem', 10);
        const antes = pares().length;
        const par = pares()[0];
        const chave = par.dataset.sugPar;
        par.querySelector('[data-sug-ignorar]').click();
        assert.equal(pares().length, antes - 1);
        assert.deepEqual(db.ecosIgnorados, [{ especie: 'personagem', id: 10, chave }]);
        const caixa = document.getElementById('sug-ecos-ignorados');
        assert.match(caixa.textContent, /Ignorados \(1\)/);
        assert.ok(caixa.querySelector(`[data-sug-ignorado="${chave}"]`));
    });

    it('"Voltar a sugerir" devolve o par e esvazia a seção', async () => {
        await U.abrirSugestaoEcos('personagem', 10);
        const antes = pares().length;
        pares()[0].querySelector('[data-sug-ignorar]').click();
        clicar('[data-sug-restaurar]');
        assert.equal(pares().length, antes);
        assert.deepEqual(db.ecosIgnorados, []);
        assert.equal(document.getElementById('sug-ecos-ignorados').textContent.trim(), '');
    });

    it('o ignorado continua ignorado ao reabrir o modal', async () => {
        await U.abrirSugestaoEcos('personagem', 10);
        const antes = pares().length;
        pares()[0].querySelector('[data-sug-ignorar]').click();
        modal().classList.add('hidden');
        await U.abrirSugestaoEcos('personagem', 10);
        assert.equal(pares().length, antes - 1);
    });

    it('todo par tem o botão Ignorar', async () => {
        await U.abrirSugestaoEcos('personagem', 10);
        assert.ok(pares().every((p) => p.querySelector('[data-sug-ignorar]')));
    });
});
