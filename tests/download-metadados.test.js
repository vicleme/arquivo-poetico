import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

document.body.innerHTML = `<div><span class="metadados-slot"></span></div>`;

const { db } = await import('../js/db.js');
const meta = await import('../js/metadados-download.js');
const { gerarMarkdownExportacao } = await import('../js/exportar-md.js');
const { gerarCsvTextos } = await import('../js/exportar-csv.js');
const { itensParaDownload, itensDaSelecao } = await import('../js/exportar.js');
const { toggleDownloadSonoridade } = await import('../js/download-abrangente.js');

const CH = 'arquivoPoetico_downloadMetadados';

function limpar() {
    localStorage.removeItem(CH);
    localStorage.removeItem('arquivoPoetico_downloadSonoridade');
    localStorage.removeItem('arquivoPoetico_downloadProgressao');
    localStorage.removeItem('arquivoPoetico_downloadAbrangente');
    db.escansoes = [];
    db.estruturasTextuais = [];
    db.poemas = [
        {
            id: 11,
            titulo: 'Casco',
            texto: 'primeiro verso\nsegundo verso',
            status: 'publicado',
            idioma: 'pt-BR',
            notas: 'uma nota',
            autoria: [],
        },
    ];
    db.prosas = [{ id: 12, titulo: 'Conto', texto: 'um parágrafo', notas: 'nota da prosa' }];
}

describe('caixa Metadados do download', () => {
    beforeEach(limpar);

    it('vale ligada quando nunca foi mexida; desligar e religar grava', () => {
        assert.equal(meta.downloadComMetadados(), true);
        meta.toggleDownloadMetadados(false);
        assert.equal(meta.downloadComMetadados(), false);
        meta.toggleDownloadMetadados(true);
        assert.equal(meta.downloadComMetadados(), true);
    });

    it('a caixa monta uma vez e acompanha a preferência', () => {
        meta.montarControlesMetadados();
        meta.montarControlesMetadados();
        const caixas = document.querySelectorAll('.download-metadados-check');
        assert.equal(caixas.length, 1);
        assert.equal(caixas[0].checked, true);
        meta.toggleDownloadMetadados(false);
        assert.equal(caixas[0].checked, false);
    });

    it('ligada, o registro baixado segue completo', () => {
        const [item] = itensParaDownload('poema', [11]);
        assert.equal(item.notas, 'uma nota');
        assert.equal(item.status, 'publicado');
        assert.equal(meta.ehSomenteTituloTexto(item), false);
    });

    it('desligada, o registro baixado é só tipo, título e texto, e o JSON não vê a marca', () => {
        meta.toggleDownloadMetadados(false);
        const [item] = itensParaDownload('poema', [11]);
        assert.deepEqual(JSON.parse(JSON.stringify(item)), {
            tipo: 'poema',
            titulo: 'Casco',
            texto: 'primeiro verso\nsegundo verso',
        });
        assert.equal(meta.ehSomenteTituloTexto(item), true);
    });

    it('a tela do Ver (itensDaSelecao) não é reduzida', () => {
        meta.toggleDownloadMetadados(false);
        const [item] = itensDaSelecao('poema', [11]);
        assert.equal(item.notas, 'uma nota');
    });

    it('.md sem Metadados traz só o cabeçalho e o Texto', () => {
        meta.toggleDownloadMetadados(false);
        const md = gerarMarkdownExportacao(itensParaDownload('poema', [11]));
        assert.match(md, /## 1\. "Casco" \*\(Poema\)\*/);
        assert.match(md, /### Texto/);
        assert.match(md, /primeiro verso/);
        assert.doesNotMatch(
            md,
            /Idioma|Status|Publicado|Notas|Autoria|Fonte|Legenda|Comum a todos/,
        );
    });

    it('.md com Metadados segue com as linhas de metadado', () => {
        const md = gerarMarkdownExportacao(itensParaDownload('poema', [11]));
        assert.match(md, /\*\*Idioma:\*\*/);
        assert.match(md, /### Notas/);
    });

    it('Prosa também: sem Metadados, só título e texto', () => {
        meta.toggleDownloadMetadados(false);
        const md = gerarMarkdownExportacao(itensParaDownload('prosa', [12]));
        assert.match(md, /"Conto" \*\(Prosa\)\*/);
        assert.match(md, /um parágrafo/);
        assert.doesNotMatch(md, /Notas|nota da prosa/);
    });

    it('Sonoridade marcada entra mesmo sem Metadados', () => {
        db.escansoes = [{ id: 1, poemaId: 11, forma: 'Soneto' }];
        meta.toggleDownloadMetadados(false);
        toggleDownloadSonoridade(true);
        const [item] = itensParaDownload('poema', [11]);
        assert.ok(item.sonoridade);
        assert.equal(meta.ehSomenteTituloTexto(item), true);
        assert.equal(item.notas, undefined);
        const md = gerarMarkdownExportacao([item]);
        assert.match(md, /Escansão/);
        assert.doesNotMatch(md, /Notas/);
    });

    it('.csv sem Metadados tem só as colunas titulo e texto', () => {
        const [registro] = itensDaSelecao('poema', [11]);
        const csv = gerarCsvTextos('poema', [registro], db, { somenteTituloTexto: true });
        const linhas = csv.replace('\uFEFF', '').trim().split('\r\n');
        assert.equal(linhas[0], 'titulo,texto');
        const completo = gerarCsvTextos('poema', [registro], db);
        assert.ok(completo.split('\r\n')[0].split(',').length > 5);
    });
});
