import './helpers/dom-real.js';

import fs from 'node:fs';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// "Autor em sigilo" no texto (entrega 3c-1): o dado, a regra pública, a linha
// ao vivo e a ligação nos modais de Poema e Prosa e no salvar.
const { ehAutorEmSigilo, definirAutorEmSigilo } = await import('../js/autor-em-sigilo.js');
const { textoAutoriaPublica, chavesDeAutoresSigilosos, linhaSigiloDoTexto } =
    await import('../js/autoria-publica.js');
const { creditosDe } = await import('../js/paratexto-publico.js');
const { db } = await import('../js/db.js');
const { carregarAutoria, resetAutoria, atualizarLinhaSigiloTexto } =
    await import('../js/editor.js');

const ler = (caminho) => fs.readFileSync(new URL(caminho, import.meta.url), 'utf8');

const MARIA = {
    id: 1,
    nome: 'Maria Real',
    nomesLiterarios: [
        { nome: 'Job', tipo: 'Pseudônimo' },
        { nome: 'Álvaro', tipo: 'Heterônimo' },
    ],
};
const OUTRO = { id: 2, nome: 'João Aberto' };
const vinc = (autorId, extra = {}) => ({
    autorId,
    papel: 'Autor',
    assinatura: 'Ortônimo',
    ...extra,
});
const comJob = vinc(1, { assinatura: 'Pseudônimo', nomeLiterario: 'Job' });
const texto = (autoria, extra = {}) => ({ id: 10, titulo: 'T', autoria, ...extra });

describe('autor-em-sigilo: lógica pura', () => {
    it('só `true` conta', () => {
        assert.equal(ehAutorEmSigilo({ autorEmSigilo: true }), true);
        for (const v of [false, undefined, null, 'true', 1, 'sim']) {
            assert.equal(ehAutorEmSigilo({ autorEmSigilo: v }), false);
        }
        assert.equal(ehAutorEmSigilo(null), false);
        assert.equal(ehAutorEmSigilo({}), false);
    });

    it('definirAutorEmSigilo liga, desliga (grava false) e diz se mudou', () => {
        const item = {};
        assert.equal(definirAutorEmSigilo(item, true), true);
        assert.equal(item.autorEmSigilo, true);
        assert.equal(definirAutorEmSigilo(item, true), false);
        assert.equal(definirAutorEmSigilo(item, false), true);
        assert.equal(item.autorEmSigilo, false);
        assert.equal(definirAutorEmSigilo({}, false), false);
        assert.equal(definirAutorEmSigilo(null, true), false);
    });
});

describe('autoria pública com o texto em sigilo', () => {
    const emSigilo = (autoria) => texto(autoria, { autorEmSigilo: true });

    it('sem a marca, nada muda', () => {
        assert.equal(
            textoAutoriaPublica(texto([comJob]), [MARIA]),
            'Job (Autor, pseudônimo de Maria Real)',
        );
    });

    it('assinado com nome literário: só o nome literário, sem "pseudônimo de"', () => {
        assert.equal(textoAutoriaPublica(emSigilo([comJob]), [MARIA]), 'Job (Autor)');
    });

    it('assinado com o nome civil: a linha some (null)', () => {
        assert.equal(textoAutoriaPublica(emSigilo([vinc(1)]), [MARIA]), null);
    });

    it('vale para todos os coautores do texto', () => {
        const item = emSigilo([comJob, { ...vinc(2), papel: 'Coautor' }]);
        assert.equal(textoAutoriaPublica(item, [MARIA, OUTRO]), 'Job (Autor)');
    });

    it('a marca é só daquele texto: outro texto do mesmo Autor segue aberto', () => {
        assert.equal(textoAutoriaPublica(texto([vinc(1)]), [MARIA]), 'Maria Real (Autor)');
    });

    it('somada à caixa do Autor ou à marca do nome, o efeito é o mesmo', () => {
        const sigilosa = { ...MARIA, sigiloso: true };
        assert.equal(textoAutoriaPublica(emSigilo([comJob]), [sigilosa]), 'Job (Autor)');
        const marcada = {
            ...MARIA,
            nomesLiterarios: [{ nome: 'Job', tipo: 'Pseudônimo', anonimizar: true }],
        };
        assert.equal(textoAutoriaPublica(emSigilo([comJob]), [marcada]), 'Job (Autor)');
    });
});

describe('créditos com o texto em sigilo', () => {
    const item = texto([vinc(1)], {
        autorEmSigilo: true,
        intertextualidade: [{ relacao: 'Citação', obra: 'X', autor: 'Maria Real' }],
    });
    const linhas = (ocultos) =>
        creditosDe(item, ocultos).map((l) => l.map((s) => s.texto).join(''));

    it('o nome civil dos Autores do texto sai dos créditos dele', () => {
        const ocultos = chavesDeAutoresSigilosos([MARIA], item);
        assert.deepEqual([...ocultos], ['maria real']);
        assert.deepEqual(linhas(ocultos), ['Citação: X']);
    });

    it('sem o texto (ou sem a marca), só os Autores sigilosos contam', () => {
        assert.equal(chavesDeAutoresSigilosos([MARIA]).size, 0);
        assert.equal(chavesDeAutoresSigilosos([MARIA], { ...item, autorEmSigilo: false }).size, 0);
        assert.deepEqual(linhas(chavesDeAutoresSigilosos([MARIA])), ['Citação: X (Maria Real)']);
    });
});

describe('linhaSigiloDoTexto', () => {
    it('sem autoria ou sem nenhum sigilo, não aplica', () => {
        assert.deepEqual(linhaSigiloDoTexto(texto([]), [MARIA]), { aplica: false, texto: '' });
        assert.equal(linhaSigiloDoTexto(texto([comJob]), [MARIA]).aplica, false);
    });

    it('mostra o que o leitor verá, ou "sem linha de Autoria"', () => {
        const a = linhaSigiloDoTexto(texto([comJob], { autorEmSigilo: true }), [MARIA]);
        assert.deepEqual(a, { aplica: true, texto: 'No sorteio: Job (Autor)' });
        const b = linhaSigiloDoTexto(texto([vinc(1)], { autorEmSigilo: true }), [MARIA]);
        assert.deepEqual(b, { aplica: true, texto: 'No sorteio: sem linha de Autoria' });
    });
});

describe('modais e salvar', () => {
    for (const [arquivo, p, tabela] of [
        ['../modais/modal-poema.html', 'p', 'poemas'],
        ['../modais/modal-prosa.html', 'pr', 'prosas'],
    ]) {
        it(`${arquivo}: caixa, linha ao vivo e ligação`, () => {
            const html = ler(arquivo);
            assert.match(html, new RegExp(`id="${p}-autor-em-sigilo"`));
            assert.match(html, new RegExp(`id="${p}-autor-sigilo-linha"`));
            assert.match(html, new RegExp(`atualizarLinhaSigiloTexto\\('${tabela}'\\)`));
        });
    }

    it('forms.js grava e recarrega o campo nos dois modais', () => {
        const js = ler('../js/forms.js');
        for (const p of ['p', 'pr']) {
            assert.match(
                js,
                new RegExp(
                    `autorEmSigilo: document.getElementById\\('${p}-autor-em-sigilo'\\)\\?\\.checked === true`,
                ),
            );
            assert.match(js, new RegExp(`autorEmSigilo: '${p}-autor-em-sigilo'`));
        }
    });
});

describe('linha ao vivo no modal', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div id="p-autoria-container"></div>
            <input type="checkbox" id="p-autor-em-sigilo" />
            <p id="p-autor-sigilo-linha" class="hidden"></p>`;
        db.autores = [MARIA, OUTRO];
        resetAutoria('poemas');
    });

    it('fica escondida sem sigilo e aparece ao marcar a caixa', () => {
        carregarAutoria('poemas', [comJob]);
        const linha = document.getElementById('p-autor-sigilo-linha');
        assert.equal(linha.classList.contains('hidden'), true);
        document.getElementById('p-autor-em-sigilo').checked = true;
        atualizarLinhaSigiloTexto('poemas');
        assert.equal(linha.classList.contains('hidden'), false);
        assert.equal(linha.textContent, 'No sorteio: Job (Autor)');
        document.getElementById('p-autor-em-sigilo').checked = false;
        atualizarLinhaSigiloTexto('poemas');
        assert.equal(linha.classList.contains('hidden'), true);
    });

    it('acompanha mudanças na Autoria sem precisar mexer na caixa', () => {
        document.getElementById('p-autor-em-sigilo').checked = true;
        carregarAutoria('poemas', [vinc(1)]);
        assert.equal(
            document.getElementById('p-autor-sigilo-linha').textContent,
            'No sorteio: sem linha de Autoria',
        );
    });
});
