import './helpers/dom-real.js';

import { describe, it, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Rodapé do modal "Ver" de Poema e Prosa: os checks em ordem alfabética (Dados ocultados,
// Infos de papel, Metadados, Progressão e Sonoridade; as duas últimas só Poema), e o download
// por select (json, csv, md, pdf, docx) mais um botão "Baixar", no lugar dos quatro botões soltos.

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
const download = await import('../js/download-abrangente.js');

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
    it('tem os pontos de montagem de Metadados e de Sonoridade e Progressão, sem o antigo Abrangente', () => {
        assert.match(html, /class="metadados-slot"/);
        assert.match(html, /class="sonoridade-progressao-slot"/);
        assert.doesNotMatch(html, /Abrangente/);
    });

    it('os pontos de montagem seguem a ordem alfabética e Sonoridade e Progressão usam text-xs e a mesma cor', () => {
        const ordem = [
            'incluir-ocultos-slot',
            'infos-papel-slot',
            'metadados-slot',
            'download-extras-modal-visualizar-wrap',
        ].map((nome) => html.indexOf(nome));
        assert.ok(ordem[0] > 0, 'Dados ocultados presente');
        assert.deepEqual(
            ordem,
            [...ordem].sort((a, b) => a - b),
            'ordem alfabética',
        );
        const caixa = download.renderCaixasSonoridadeProgressao();
        assert.match(caixa, /text-xs/);
        assert.match(caixa, /text-gray-600/);
        assert.doesNotMatch(caixa, /text-\[11px\]/);
    });

    it('as caixas não usam width: auto (1rem do CSS global, como as outras)', () => {
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

    it('Sonoridade e Progressão aparecem só para Poema; Metadados, nos dois', async () => {
        await abrirVisualizacao('poema', 1);
        const wrap = () => document.getElementById('download-extras-modal-visualizar-wrap');
        assert.ok(!wrap().classList.contains('hidden'));
        assert.ok(wrap().querySelector('.download-sonoridade-check'));
        assert.ok(wrap().querySelector('.download-progressao-check'));
        assert.ok(document.querySelector('.download-metadados-check'));
        document.getElementById('modal-visualizar').classList.add('hidden');
        await abrirVisualizacao('prosa', 2);
        assert.ok(wrap().classList.contains('hidden'));
        assert.ok(document.querySelector('.download-metadados-check'));
    });

    it('Dados ocultados, Infos de papel, Metadados, Progressão e Sonoridade seguem a ordem alfabética', async () => {
        await abrirVisualizacao('poema', 1);
        montarControlesIncluirOcultos();
        const wrap = document.getElementById('download-extras-modal-visualizar-wrap');
        const filhos = [...wrap.parentElement.children];
        const indice = (classe) => filhos.findIndex((el) => el.classList.contains(classe));
        const iOcultos = indice('incluir-ocultos-slot');
        const iInfos = indice('infos-papel-slot');
        const iMeta = indice('metadados-slot');
        const iExtras = filhos.indexOf(wrap);
        assert.ok(iOcultos >= 0 && iInfos > iOcultos && iMeta > iInfos && iExtras > iMeta);
        assert.match(filhos[iOcultos].innerHTML, /Dados ocultados/);
        const ordemExtras = [...wrap.querySelectorAll('input')].map((el) => el.className);
        assert.match(ordemExtras[0], /progressao/);
        assert.match(ordemExtras[1], /sonoridade/);
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
