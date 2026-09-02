import './helpers/dom-real.js';
import { instalarJsPdfFalso, removerJsPdfFalso } from './helpers/jspdf-shim.js';

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// Skeleton mínimo do formulário da aba Exportação (ver index.html,
// seção #exportar-filtrado) — só os campos que lerFiltrosDoFormulario()
// de exportar.js efetivamente lê, mais o <span> de resultado.
document.body.innerHTML = `
    <input type="checkbox" id="exp-tipo-poema" checked>
    <input type="checkbox" id="exp-tipo-prosa" checked>
    <input type="text" id="exp-pessoas-incluir">
    <input type="text" id="exp-temas-incluir">
    <input type="text" id="exp-temas-excluir">
    <input type="number" id="exp-data-de-dia">
    <input type="number" id="exp-data-de-mes">
    <input type="number" id="exp-data-de-ano">
    <input type="number" id="exp-data-ate-dia">
    <input type="number" id="exp-data-ate-mes">
    <input type="number" id="exp-data-ate-ano">
    <select id="exp-status"><option value="todos" selected>Todos</option></select>
    <div id="exp-livros-checks"></div>
    <div id="exp-coletaneas-checks"></div>
    <span id="exp-resultado"></span>
`;

const { db } = await import('../js/db.js');
const { executarExportacaoSeletivaPdf, exportarTudoFlatPdf } = await import('../js/exportar.js');

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

function marcarTipos({ poema = true, prosa = true } = {}) {
    document.getElementById('exp-tipo-poema').checked = poema;
    document.getElementById('exp-tipo-prosa').checked = prosa;
}

describe('executarExportacaoSeletivaPdf (aba Exportação — Baixar .pdf seletivo)', () => {
    let ConstrutorFalso;

    beforeEach(() => {
        resetarDb();
        marcarTipos();
        document.getElementById('exp-resultado').textContent = '';
        ConstrutorFalso = instalarJsPdfFalso();
    });
    afterEach(removerJsPdfFalso);

    it('gera um PDF com os poemas/prosas que passam nos filtros do formulário', () => {
        db.poemas = [{ id: 1, titulo: 'Poema A', texto: 'verso A' }];
        db.prosas = [{ id: 2, titulo: 'Prosa B', texto: 'linha B' }];

        let docCapturado = null;
        class Espiao extends ConstrutorFalso {
            constructor(...args) {
                super(...args);
                docCapturado = this;
            }
        }
        globalThis.window.jspdf = { jsPDF: Espiao };

        executarExportacaoSeletivaPdf();

        assert.ok(docCapturado);
        const textos = docCapturado.chamadas
            .filter((c) => c.tipo === 'text')
            .map((c) => c.texto)
            .join(' ');
        assert.match(textos, /Poema A/);
        assert.match(textos, /Prosa B/);
    });

    it('respeita o filtro de tipo (só Poemas desmarca Prosas do PDF)', () => {
        marcarTipos({ poema: true, prosa: false });
        db.poemas = [{ id: 1, titulo: 'Poema A', texto: 'verso A' }];
        db.prosas = [{ id: 2, titulo: 'Prosa B', texto: 'linha B' }];

        let docCapturado = null;
        class Espiao extends ConstrutorFalso {
            constructor(...args) {
                super(...args);
                docCapturado = this;
            }
        }
        globalThis.window.jspdf = { jsPDF: Espiao };

        executarExportacaoSeletivaPdf();

        const textos = docCapturado.chamadas
            .filter((c) => c.tipo === 'text')
            .map((c) => c.texto)
            .join(' ');
        assert.match(textos, /Poema A/);
        assert.ok(!textos.includes('Prosa B'));
    });

    it('nenhum item encontrado: não instancia jsPDF e avisa no #exp-resultado', () => {
        marcarTipos({ poema: false, prosa: false });

        let instancias = 0;
        class Espiao extends ConstrutorFalso {
            constructor(...args) {
                super(...args);
                instancias += 1;
            }
        }
        globalThis.window.jspdf = { jsPDF: Espiao };

        executarExportacaoSeletivaPdf();

        assert.equal(instancias, 0);
        assert.match(document.getElementById('exp-resultado').textContent, /Nenhum item encontrado/);
    });

    it('chama save() com um nome de arquivo previsível ("exportacao_seletiva_...")', () => {
        db.poemas = [{ id: 1, titulo: 'Poema A', texto: 'x' }];

        let docCapturado = null;
        class Espiao extends ConstrutorFalso {
            constructor(...args) {
                super(...args);
                docCapturado = this;
            }
        }
        globalThis.window.jspdf = { jsPDF: Espiao };

        executarExportacaoSeletivaPdf();

        const chamadaSave = docCapturado.chamadas.find((c) => c.tipo === 'save');
        assert.ok(chamadaSave, 'deveria ter chamado save()');
        assert.match(chamadaSave.nomeArquivo, /^exportacao_seletiva_\d+\.pdf$/);
    });

    it('lib jsPDF indisponível: não lança, só avisa (mesmo padrão de exportarSelecaoPdf)', () => {
        db.poemas = [{ id: 1, titulo: 'Poema A', texto: 'x' }];
        removerJsPdfFalso();
        assert.doesNotThrow(() => executarExportacaoSeletivaPdf());
    });
});

describe('exportarTudoFlatPdf (aba Exportação — Baixar tudo — .pdf)', () => {
    let ConstrutorFalso;

    beforeEach(() => {
        resetarDb();
        document.getElementById('exp-resultado').textContent = '';
        ConstrutorFalso = instalarJsPdfFalso();
    });
    afterEach(removerJsPdfFalso);

    it('gera um PDF com todo o acervo, sem depender dos filtros do formulário', () => {
        marcarTipos({ poema: false, prosa: false }); // filtros da aba não afetam "baixar tudo"
        db.poemas = [{ id: 1, titulo: 'Poema A', texto: 'verso A' }];
        db.prosas = [{ id: 2, titulo: 'Prosa B', texto: 'linha B' }];

        let docCapturado = null;
        class Espiao extends ConstrutorFalso {
            constructor(...args) {
                super(...args);
                docCapturado = this;
            }
        }
        globalThis.window.jspdf = { jsPDF: Espiao };

        exportarTudoFlatPdf();

        assert.ok(docCapturado);
        const textos = docCapturado.chamadas
            .filter((c) => c.tipo === 'text')
            .map((c) => c.texto)
            .join(' ');
        assert.match(textos, /Poema A/);
        assert.match(textos, /Prosa B/);
    });

    it('acervo vazio: não instancia jsPDF', () => {
        let instancias = 0;
        class Espiao extends ConstrutorFalso {
            constructor(...args) {
                super(...args);
                instancias += 1;
            }
        }
        globalThis.window.jspdf = { jsPDF: Espiao };

        exportarTudoFlatPdf();

        assert.equal(instancias, 0);
    });

    it('chama save() com um nome de arquivo previsível ("arquivo_poetico_flat_...")', () => {
        db.poemas = [{ id: 1, titulo: 'Poema A', texto: 'x' }];

        let docCapturado = null;
        class Espiao extends ConstrutorFalso {
            constructor(...args) {
                super(...args);
                docCapturado = this;
            }
        }
        globalThis.window.jspdf = { jsPDF: Espiao };

        exportarTudoFlatPdf();

        const chamadaSave = docCapturado.chamadas.find((c) => c.tipo === 'save');
        assert.ok(chamadaSave, 'deveria ter chamado save()');
        assert.match(chamadaSave.nomeArquivo, /^arquivo_poetico_flat_\d+\.pdf$/);
    });

    it('lib jsPDF indisponível: não lança, só avisa', () => {
        db.poemas = [{ id: 1, titulo: 'Poema A', texto: 'x' }];
        removerJsPdfFalso();
        assert.doesNotThrow(() => exportarTudoFlatPdf());
    });
});
