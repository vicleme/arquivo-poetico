import './helpers/localstorage-shim.js';
import './helpers/dom-shim.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Botão "Baixar" da seção Fora do acervo (T9, entrega 12 de 13): lê escopo e
// formato dos selects e chama o relatório com o filtro e a ordem da tela.

const { baixarForaDoAcervo, atualizarBaixarForaDoAcervo, escopoEFormatoEscolhidos } =
    await import('../js/baixar-fora-do-acervo.js');

const ID_ESCOPO = 'conexoes-fora-baixar-escopo';
const ID_FORMATO = 'conexoes-fora-baixar-formato';

function select(valores, valor) {
    return {
        value: valor,
        options: valores.map((v) => ({ value: v, disabled: false })),
    };
}

let elementos;
beforeEach(() => {
    elementos = {
        [ID_ESCOPO]: select(
            ['tudo', 'obras', 'autores', 'origens', 'derivacoes', 'referencias', 'avisos'],
            'tudo',
        ),
        [ID_FORMATO]: select(['md', 'csv', 'pdf'], 'md'),
    };
    globalThis.document.getElementById = (id) => elementos[id] || null;
});

describe('escopoEFormatoEscolhidos', () => {
    it('lê os selects', () => {
        elementos[ID_ESCOPO].value = 'autores';
        elementos[ID_FORMATO].value = 'pdf';
        assert.deepEqual(escopoEFormatoEscolhidos(), { escopo: 'autores', formato: 'pdf' });
    });

    it('valor desconhecido ou select ausente cai em tudo e .md', () => {
        elementos[ID_ESCOPO].value = '???';
        elementos[ID_FORMATO].value = 'docx';
        assert.deepEqual(escopoEFormatoEscolhidos(), { escopo: 'tudo', formato: 'md' });
        elementos = {};
        assert.deepEqual(escopoEFormatoEscolhidos(), { escopo: 'tudo', formato: 'md' });
    });
});

describe('atualizarBaixarForaDoAcervo', () => {
    it('com .csv, desabilita "Tudo" e passa para Obras', () => {
        elementos[ID_FORMATO].value = 'csv';
        atualizarBaixarForaDoAcervo();
        assert.equal(elementos[ID_ESCOPO].value, 'obras');
        assert.equal(elementos[ID_ESCOPO].options[0].disabled, true);
    });

    it('com .csv, mantém o bloco já escolhido', () => {
        elementos[ID_ESCOPO].value = 'avisos';
        elementos[ID_FORMATO].value = 'csv';
        atualizarBaixarForaDoAcervo();
        assert.equal(elementos[ID_ESCOPO].value, 'avisos');
    });

    it('voltando para .md ou .pdf, "Tudo" reabilita', () => {
        elementos[ID_FORMATO].value = 'csv';
        atualizarBaixarForaDoAcervo();
        elementos[ID_FORMATO].value = 'pdf';
        atualizarBaixarForaDoAcervo();
        assert.equal(elementos[ID_ESCOPO].options[0].disabled, false);
    });

    it('sem os selects na página, não faz nada', () => {
        elementos = {};
        assert.doesNotThrow(() => atualizarBaixarForaDoAcervo());
    });
});

describe('baixarForaDoAcervo', () => {
    it('em erro, avisa com a mensagem em vez de quebrar', async () => {
        elementos[ID_FORMATO].value = 'pdf';
        const avisos = [];
        const antes = globalThis.alert;
        const antesErro = console.error;
        globalThis.alert = (m) => avisos.push(m);
        console.error = () => {};
        const antesWindow = globalThis.window;
        // Sem jsPDF carregado, o gerador de PDF lança a mensagem da biblioteca.
        globalThis.window = { ...(antesWindow || {}), jspdf: undefined };
        try {
            await baixarForaDoAcervo();
        } finally {
            globalThis.alert = antes;
            console.error = antesErro;
            globalThis.window = antesWindow;
        }
        assert.equal(avisos.length, 1);
        assert.ok(avisos[0].length > 10);
    });
});
