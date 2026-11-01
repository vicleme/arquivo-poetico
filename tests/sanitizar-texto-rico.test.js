import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { escaparMenorSolto, sanitizarTextoRico } from '../js/utils.js';

// Caso real: no poema "disposable thing" o verso ">Amor<?" faz o parser de HTML
// ler "<?" como o começo de um comentário e descartar tudo até o próximo ">"
// (ou até o fim do texto), então o resto do poema sumia do Ver e do sorteio.
// O parser dos testes (happy-dom) é mais tolerante que o do navegador e não
// reproduz o corte, por isso aqui se confere o que entra no DOMPurify, e não o
// que sai dele. A conferência com o parser de verdade foi feita no Chromium.

describe('escaparMenorSolto', () => {
    it('escapa "<?" (o caso do poema "disposable thing")', () => {
        assert.equal(escaparMenorSolto('>Amor<?\n\nAMOR,'), '>Amor&lt;?\n\nAMOR,');
    });

    it('escapa "<" seguido de espaço, número, "!" ou "/" sem letra', () => {
        assert.equal(escaparMenorSolto('a < b'), 'a &lt; b');
        assert.equal(escaparMenorSolto('<3 você'), '&lt;3 você');
        assert.equal(escaparMenorSolto('oi <! tchau'), 'oi &lt;! tchau');
        assert.equal(escaparMenorSolto('x </> y'), 'x &lt;/> y');
        assert.equal(escaparMenorSolto('x </3 y'), 'x &lt;/3 y');
    });

    it('escapa "<" que parece tag mas não tem nenhum ">" depois', () => {
        assert.equal(escaparMenorSolto('se a<b\nentão c'), 'se a&lt;b\nentão c');
        assert.equal(escaparMenorSolto('fim <'), 'fim &lt;');
    });

    it('não mexe nas tags de verdade', () => {
        const html =
            '<div style="color: #595959; display: inline;">_oi_</div>\n<u>sublinhado</u><br>';
        assert.equal(escaparMenorSolto(html), html);
    });

    it('escapa só o "<" solto quando há tag de verdade no mesmo texto', () => {
        const entrada = '<div style="color: red;">verso</div>\n>Amor<?\nfim';
        assert.equal(
            escaparMenorSolto(entrada),
            '<div style="color: red;">verso</div>\n>Amor&lt;?\nfim',
        );
    });

    it('devolve texto sem "<" como está e trata vazio e nulo', () => {
        assert.equal(escaparMenorSolto('sem sinal nenhum & > aqui'), 'sem sinal nenhum & > aqui');
        assert.equal(escaparMenorSolto(''), '');
        assert.equal(escaparMenorSolto(null), '');
        assert.equal(escaparMenorSolto(undefined), '');
    });
});

describe('sanitizarTextoRico com "<" solto', () => {
    const janelaOriginal = globalThis.window;

    afterEach(() => {
        if (janelaOriginal === undefined) delete globalThis.window;
        else globalThis.window = janelaOriginal;
    });

    // Um DOMPurify de mentira que só guarda o que recebeu e devolve igual.
    function instalarDomPurifyDeMentira() {
        const registro = { recebidos: [] };
        globalThis.window = {
            DOMPurify: {
                sanitize: (entrada) => {
                    registro.recebidos.push(entrada);
                    return entrada;
                },
            },
        };
        return registro;
    }

    it('entrega ao DOMPurify o "<?" já escapado, sem o poema depois dele', () => {
        const registro = instalarDomPurifyDeMentira();
        const poema =
            '<div style="color: #595959;">_fala_</div>\n\nÉ isso tudo\n>Amor<?\n\nAMOR,\nCapitalizado\n\nProveito\nE agrado?';
        const saida = sanitizarTextoRico(poema);
        assert.equal(registro.recebidos.length, 1);
        assert.ok(!registro.recebidos[0].includes('<?'));
        assert.ok(registro.recebidos[0].includes('>Amor&lt;?'));
        assert.ok(saida.includes('Capitalizado'));
        assert.ok(saida.includes('E agrado?'));
    });

    it('texto só com "<" solto passa pelo DOMPurify e continua inteiro', () => {
        const registro = instalarDomPurifyDeMentira();
        const saida = sanitizarTextoRico('a < b\nc <3 d');
        assert.equal(registro.recebidos.length, 1);
        assert.equal(saida, 'a &lt; b\nc &lt;3 d');
    });

    it('sem DOMPurify, o "<" solto aparece uma vez só, não escapado duas', () => {
        delete globalThis.window;
        const original = console.warn;
        console.warn = () => {};
        try {
            assert.equal(sanitizarTextoRico('>Amor<?\nfim'), '&gt;Amor&lt;?\nfim');
        } finally {
            console.warn = original;
        }
    });

    it('texto sem "<" volta idêntico, sem chamar o DOMPurify', () => {
        const registro = instalarDomPurifyDeMentira();
        assert.equal(sanitizarTextoRico('um verso\n_outro_'), 'um verso\n_outro_');
        assert.equal(registro.recebidos.length, 0);
    });

    it('comentário da toolbar continua sumindo', () => {
        const registro = instalarDomPurifyDeMentira();
        const saida = sanitizarTextoRico('verso <!-- nota pessoal --> fim <?');
        assert.ok(!saida.includes('nota pessoal'));
        assert.ok(registro.recebidos[0].includes('fim &lt;?'));
    });
});
