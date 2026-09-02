import './helpers/localstorage-shim.js';
import './helpers/dom-shim.js';
import { instalarJsPdfFalso, removerJsPdfFalso } from './helpers/jspdf-shim.js';

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { db } from '../js/db.js';
import { exportarSelecaoPdf } from '../js/exportar.js';

function resetarDb() {
    db.livros = [];
    db.partes = [];
    db.secoes = [];
    db.poemas = [];
    db.prosas = [];
    db.elementos = [];
    db.coletaneas = [];
    db.itensColetanea = [];
    db.pessoas = [];
    db.grupos = [];
}

describe('exportarSelecaoPdf', () => {
    let ConstrutorFalso;

    beforeEach(() => {
        resetarDb();
        ConstrutorFalso = instalarJsPdfFalso();
    });
    afterEach(removerJsPdfFalso);

    it('gera um PDF só com os poemas cujos ids foram passados, ignorando os demais', () => {
        db.poemas = [
            { id: 1, titulo: 'Poema A', texto: 'verso A' },
            { id: 2, titulo: 'Poema B', texto: 'verso B' },
            { id: 3, titulo: 'Poema C', texto: 'verso C' },
        ];

        let docCapturado = null;
        class Espiao extends ConstrutorFalso {
            constructor(...args) {
                super(...args);
                docCapturado = this;
            }
        }
        globalThis.window.jspdf = { jsPDF: Espiao };

        exportarSelecaoPdf('poema', [1, 3]);

        assert.ok(docCapturado);
        const textos = docCapturado.chamadas
            .filter((c) => c.tipo === 'text')
            .map((c) => c.texto)
            .join(' ');
        assert.match(textos, /Poema A/);
        assert.match(textos, /Poema C/);
        assert.ok(!textos.includes('Poema B'));
    });

    it('funciona também pra prosas', () => {
        db.prosas = [{ id: 1, titulo: 'Prosa X', texto: 'linha 1' }];

        let docCapturado = null;
        class Espiao extends ConstrutorFalso {
            constructor(...args) {
                super(...args);
                docCapturado = this;
            }
        }
        globalThis.window.jspdf = { jsPDF: Espiao };

        exportarSelecaoPdf('prosa', [1]);

        assert.ok(docCapturado);
        const textos = docCapturado.chamadas
            .filter((c) => c.tipo === 'text')
            .map((c) => c.texto)
            .join(' ');
        assert.match(textos, /Prosa X/);
    });

    it('nenhum id selecionado: não tenta gerar PDF (não instancia jsPDF)', (t) => {
        t.mock.timers.enable({ apis: ['setTimeout'] });
        db.poemas = [{ id: 1, titulo: 'Poema A', texto: 'x' }];
        let instancias = 0;
        class Espiao extends ConstrutorFalso {
            constructor(...args) {
                super(...args);
                instancias += 1;
            }
        }
        globalThis.window.jspdf = { jsPDF: Espiao };

        assert.doesNotThrow(() => exportarSelecaoPdf('poema', []));
        assert.equal(instancias, 0, 'jsPDF não deveria ter sido instanciado sem itens selecionados');
    });

    it('lib jsPDF indisponível: não lança, só avisa (mesmo padrão de exportarItem)', (t) => {
        t.mock.timers.enable({ apis: ['setTimeout'] });
        db.poemas = [{ id: 1, titulo: 'Poema A', texto: 'x' }];
        removerJsPdfFalso();
        assert.doesNotThrow(() => exportarSelecaoPdf('poema', [1]));
    });

    it('chama save() com um nome de arquivo previsível ("selecao_<tipo>s_...")', () => {
        db.poemas = [{ id: 1, titulo: 'Poema A', texto: 'x' }];

        let docCapturado = null;
        class Espiao extends ConstrutorFalso {
            constructor(...args) {
                super(...args);
                docCapturado = this;
            }
        }
        globalThis.window.jspdf = { jsPDF: Espiao };

        exportarSelecaoPdf('poema', [1]);

        const chamadaSave = docCapturado.chamadas.find((c) => c.tipo === 'save');
        assert.match(chamadaSave.nomeArquivo, /^selecao_poemas_\d+\.pdf$/);
    });
});
