import './helpers/dom-real.js';

import { describe, it, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Rodapé do modal "Ver" de Poema e Prosa: Abrangente (só Poema) antes de
// Dados ocultados, e o download por select (json, csv, md, pdf, docx) mais um
// botão "Baixar", no lugar dos quatro botões soltos.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const lerModal = (arquivo) =>
    fs.readFileSync(path.resolve(__dirname, '../modais', arquivo), 'utf8');

globalThis.fetch = async (url) => ({
    ok: true,
    status: 200,
    text: async () => lerModal(path.basename(url)),
});

document.body.innerHTML = '<main></main><div id="modais-container"></div>';

const { registrarModal } = await import('../js/modais.js');
const { db } = await import('../js/db.js');
const { abrirVisualizacao, baixarDoModalVisualizacao } = await import('../js/visualizar.js');
const { setFormatoBaixarColuna } = await import('../js/acoes-coluna.js');
const { montarControlesIncluirOcultos } = await import('../js/ocultos-exportacao.js');

registrarModal('modal-visualizar', 'modal-visualizar.html', () => {});

// Captura o nome do arquivo de cada download (âncora criada e clicada).
const baixados = [];
const clickOriginal = window.HTMLAnchorElement.prototype.click;
window.HTMLAnchorElement.prototype.click = function () {
    if (this.download) baixados.push(this.download);
};
if (!URL.createObjectURL) URL.createObjectURL = () => 'blob:teste';
if (!URL.revokeObjectURL) URL.revokeObjectURL = () => {};

const html = lerModal('modal-visualizar.html');

describe('modal Ver: rodapé (marcação)', () => {
    it('o rótulo é "Abrangente", sem "Download"', () => {
        assert.match(html, /📦 Abrangente\s*<\/label>/);
        assert.doesNotMatch(html, /Download abrangente/);
    });

    it('Abrangente vem antes de Dados ocultados e usa o mesmo tamanho (text-xs) e cor', () => {
        const iAbr = html.indexOf('download-abrangente-modal-visualizar-wrap');
        const iOcultos = html.indexOf('incluir-ocultos-slot');
        assert.ok(iAbr > 0 && iOcultos > iAbr, 'Abrangente deve vir primeiro');
        const rotulo = html.slice(iAbr, html.indexOf('>', iAbr));
        assert.match(rotulo, /text-xs/);
        assert.match(rotulo, /text-gray-600/);
        assert.doesNotMatch(rotulo, /text-\[11px\]/);
    });

    it('a caixa do Abrangente não usa width: auto (1rem do CSS global, como as outras)', () => {
        assert.doesNotMatch(html, /width: auto/);
    });

    it('não sobraram os quatro botões soltos de formato', () => {
        assert.doesNotMatch(html, /baixarDoModalVisualizacao\('(md|pdf|docx|json)'\)/);
    });

    it('tem um select com json, csv, md, pdf e docx e o botão Baixar', () => {
        const select = html.match(/<select[^>]*id="visualizar-baixar-formato"[\s\S]*?<\/select>/);
        assert.ok(select, 'select de formato');
        const valores = [...select[0].matchAll(/<option value="(\w+)"/g)].map((m) => m[1]);
        assert.deepEqual(valores, ['json', 'csv', 'md', 'pdf', 'docx']);
        assert.match(html, /onclick="baixarDoModalVisualizacao\(\)"/);
    });
});

describe('modal Ver: abrir e baixar', () => {
    beforeEach(() => {
        localStorage.clear();
        baixados.length = 0;
        db.poemas = [{ id: 1, titulo: 'Meu Poema', texto: 'verso', autoria: [] }];
        db.prosas = [{ id: 2, titulo: 'Minha Prosa', texto: 'texto', autoria: [] }];
        document.querySelectorAll('.fixed[id^="modal-"]').forEach((m) => m.classList.add('hidden'));
    });

    it('Abrangente aparece só para Poema', async () => {
        await abrirVisualizacao('poema', 1);
        const wrap = () => document.getElementById('download-abrangente-modal-visualizar-wrap');
        assert.ok(!wrap().classList.contains('hidden'));
        document.getElementById('modal-visualizar').classList.add('hidden');
        await abrirVisualizacao('prosa', 2);
        assert.ok(wrap().classList.contains('hidden'));
    });

    it('Abrangente e Dados ocultados ficam lado a lado, o Abrangente primeiro', async () => {
        await abrirVisualizacao('poema', 1);
        montarControlesIncluirOcultos();
        const rodape = document.getElementById(
            'download-abrangente-modal-visualizar-wrap',
        ).parentElement;
        const filhos = [...rodape.children];
        const iAbr = filhos.findIndex(
            (el) => el.id === 'download-abrangente-modal-visualizar-wrap',
        );
        const iOcultos = filhos.findIndex((el) => el.classList.contains('incluir-ocultos-slot'));
        assert.ok(iAbr >= 0 && iOcultos > iAbr);
        assert.match(filhos[iOcultos].innerHTML, /Dados ocultados/);
    });

    it('o select começa no "Formato do Baixar" da coluna Ações da aba', async () => {
        setFormatoBaixarColuna('poemas', 'csv');
        await abrirVisualizacao('poema', 1);
        assert.equal(document.getElementById('visualizar-baixar-formato').value, 'csv');
        document.getElementById('modal-visualizar').classList.add('hidden');
        await abrirVisualizacao('prosa', 2);
        assert.equal(document.getElementById('visualizar-baixar-formato').value, 'md');
    });

    it('Baixar usa o formato escolhido no select (.csv incluído)', async () => {
        await abrirVisualizacao('poema', 1);
        document.getElementById('visualizar-baixar-formato').value = 'csv';
        baixarDoModalVisualizacao();
        await new Promise((r) => setTimeout(r, 20));
        assert.deepEqual(baixados, ['meu-poema.csv']);
    });

    it('Baixar com o formato direto como argumento ainda funciona', async () => {
        await abrirVisualizacao('poema', 1);
        baixarDoModalVisualizacao('json');
        await new Promise((r) => setTimeout(r, 20));
        assert.deepEqual(baixados, ['meu-poema.json']);
    });
});

after(() => {
    window.HTMLAnchorElement.prototype.click = clickOriginal;
});
