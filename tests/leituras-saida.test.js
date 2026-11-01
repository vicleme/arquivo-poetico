import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

document.body.innerHTML = `<div><span class="leituras-slot"></span></div>`;

const { db } = await import('../js/db.js');
const saida = await import('../js/leituras-saida.js');
const dl = await import('../js/leituras-download.js');
const { enriquecerItensComExtras, blocosExtrasMarkdown } =
    await import('../js/download-abrangente.js');
const { itensParaDownload } = await import('../js/exportar.js');
const { gerarMarkdownExportacao } = await import('../js/exportar-md.js');
const { gerarCsvTextos } = await import('../js/exportar-csv.js');
const { renderVisualizacaoHtml } = await import('../js/visualizar.js');

const CH = 'arquivoPoetico_downloadLeituras';

const leitura = (extra = {}) => ({
    id: 1,
    textoId: 11,
    tipo: 'poema',
    data: '2026-11-01',
    pegou: [
        { item: 'imagem', peso: 'forte' },
        { item: 'voz', peso: 'centro' },
    ],
    incomodou: ['cliche'],
    releria: 'sim',
    mostraria: 'talvez',
    sugerido: 3.5,
    escolhido: 4,
    ...extra,
});

function limpar() {
    localStorage.removeItem(CH);
    localStorage.removeItem('arquivoPoetico_downloadMetadados');
    localStorage.removeItem('arquivoPoetico_downloadSonoridade');
    localStorage.removeItem('arquivoPoetico_downloadProgressao');
    localStorage.removeItem('arquivoPoetico_downloadAbrangente');
    db.escansoes = [];
    db.estruturasTextuais = [];
    db.poemas = [{ id: 11, titulo: 'Casco', texto: 'primeiro verso', status: 'publicado' }];
    db.prosas = [{ id: 11, titulo: 'Conto', texto: 'um parágrafo' }];
    db.leituras = [
        leitura(),
        leitura({ id: 2, data: '2026-10-01', textoId: 11, tipo: 'prosa', escolhido: null }),
    ];
}

describe('texto das leituras (leituras-saida)', () => {
    it('lista pegou do peso maior para o menor, com rótulos e sem travessão', () => {
        const linhas = saida.linhasDaLeitura(leitura());
        assert.deepEqual(linhas[0], [
            'De que maneira te pegou',
            'Voz (central), Imagem (marcante)',
        ]);
        assert.deepEqual(linhas[1], ['O que incomodou', 'Clichê']);
        assert.deepEqual(linhas[2], ['Releria?', 'Sim']);
        assert.deepEqual(linhas[3], ['Mostraria a alguém?', 'Talvez']);
        assert.deepEqual(linhas[4], ['Corações', '4 (sugeridos 3,5)']);
        assert.ok(!JSON.stringify(linhas).includes('—'));
    });

    it('corações: igual ao sugerido, só sugerido e nenhum', () => {
        const so = (l) => saida.linhasDaLeitura(l).find(([r]) => r === 'Corações')?.[1];
        assert.equal(so(leitura({ sugerido: 4 })), '4');
        assert.equal(so(leitura({ escolhido: null })), 'sem escolha (sugeridos 3,5)');
        assert.equal(so(leitura({ escolhido: null, sugerido: null })), undefined);
        assert.equal(so(leitura({ escolhido: 2.5, sugerido: null })), '2,5');
    });

    it('markdown: vazio sem leitura; com leitura traz data e linhas', () => {
        assert.equal(saida.leiturasParaMarkdown([]), '');
        const md = saida.leiturasParaMarkdown([leitura()]);
        assert.match(md, /^## Leituras avaliativas\n\n### Leitura de 01\/11\/2026\n\n/);
        assert.match(md, /\*\*De que maneira te pegou:\*\* Voz \(central\), Imagem \(marcante\)/);
    });

    it('leitura sem respostas avisa em vez de sumir', () => {
        const md = saida.leiturasParaMarkdown([
            { id: 3, textoId: 1, tipo: 'poema', data: '2026-11-02' },
        ]);
        assert.match(md, /Sem respostas registradas/);
    });

    it('html escapa o conteúdo e conta as leituras', () => {
        const html = saida.leiturasParaHtml([
            leitura({ incomodou: [] }),
            leitura({ id: 9, data: '2026-09-01' }),
        ]);
        assert.match(html, /Leituras avaliativas \(2\)/);
        assert.match(html, /Leitura de 01\/09\/2026/);
        assert.equal(saida.leiturasParaHtml([]), '');
    });
});

describe('caixa Leituras do download', () => {
    beforeEach(limpar);

    it('nasce desligada; ligar e desligar grava', () => {
        assert.equal(dl.isDownloadLeiturasAtivo(), false);
        dl.toggleDownloadLeituras(true);
        assert.equal(dl.isDownloadLeiturasAtivo(), true);
        dl.toggleDownloadLeituras(false);
        assert.equal(dl.isDownloadLeiturasAtivo(), false);
    });

    it('a caixa monta uma vez e acompanha a preferência', () => {
        dl.montarControlesLeituras();
        dl.montarControlesLeituras();
        const caixas = document.querySelectorAll('.download-leituras-check');
        assert.equal(caixas.length, 1);
        assert.equal(caixas[0].checked, false);
        dl.toggleDownloadLeituras(true);
        assert.equal(caixas[0].checked, true);
    });

    it('o antigo Abrangente ligado não liga as leituras', () => {
        localStorage.setItem('arquivoPoetico_downloadAbrangente', '1');
        assert.equal(dl.isDownloadLeiturasAtivo(), false);
    });
});

describe('leituras nas saídas', () => {
    beforeEach(limpar);

    it('desligada, nada sai: nem .json nem .md', () => {
        const [item] = itensParaDownload('poema', [11]);
        assert.equal(item.leituras, undefined);
        assert.ok(!gerarMarkdownExportacao([item]).includes('Leituras avaliativas'));
    });

    it('ligada, o poema leva só as leituras dele (não as da prosa de mesmo id)', () => {
        dl.toggleDownloadLeituras(true);
        const [poema] = itensParaDownload('poema', [11]);
        assert.equal(poema.leituras.length, 1);
        assert.equal(poema.leituras[0].tipo, 'poema');
        const [prosa] = itensParaDownload('prosa', [11]);
        assert.equal(prosa.leituras.length, 1);
        assert.equal(prosa.leituras[0].tipo, 'prosa');
    });

    it('ligada, o .md traz o bloco depois do texto, em poema e em prosa', () => {
        dl.toggleDownloadLeituras(true);
        const mdPoema = gerarMarkdownExportacao(itensParaDownload('poema', [11]));
        assert.match(mdPoema, /## Leituras avaliativas/);
        const mdProsa = gerarMarkdownExportacao(itensParaDownload('prosa', [11]));
        assert.match(mdProsa, /### Leitura de 01\/10\/2026/);
    });

    it('ligada, vale também com Metadados desmarcado', () => {
        dl.toggleDownloadLeituras(true);
        localStorage.setItem('arquivoPoetico_downloadMetadados', '0');
        const [item] = itensParaDownload('poema', [11]);
        assert.equal(item.leituras.length, 1);
        assert.equal(item.titulo, 'Casco');
    });

    it('texto sem leitura segue igual, com a caixa ligada', () => {
        dl.toggleDownloadLeituras(true);
        db.leituras = [];
        const [item] = enriquecerItensComExtras([{ id: 11, tipo: 'poema', titulo: 'A' }]);
        assert.equal(item.leituras, undefined);
        assert.equal(blocosExtrasMarkdown({ titulo: 'A' }), '');
    });

    it('o .csv não muda com a caixa ligada', () => {
        const registros = itensParaDownload('poema', [11]);
        const antes = gerarCsvTextos('poema', registros, db, {});
        dl.toggleDownloadLeituras(true);
        const depois = gerarCsvTextos('poema', itensParaDownload('poema', [11]), db, {});
        assert.equal(depois, antes);
        assert.ok(!depois.includes('leituras'));
    });
});

describe('leituras no Ver', () => {
    beforeEach(limpar);

    it('aparecem no grupo Avaliação pessoal mesmo com a caixa desligada', () => {
        const html = renderVisualizacaoHtml({ id: 11, tipo: 'poema', titulo: 'Casco', texto: 'x' });
        assert.match(html, /Leitura avaliativa/);
        assert.match(html, /Voz \(central\), Imagem \(marcante\)/);
    });

    it('a prosa mostra só as leituras dela', () => {
        const html = renderVisualizacaoHtml({ id: 11, tipo: 'prosa', titulo: 'Conto', texto: 'x' });
        assert.match(html, /Leitura de 01\/10\/2026/);
        assert.ok(!html.includes('Leitura de 01/11/2026'));
    });

    it('texto sem leitura não ganha bloco', () => {
        const html = renderVisualizacaoHtml({ id: 999, tipo: 'poema', titulo: 'Z', texto: 'x' });
        assert.ok(!html.includes('Leitura avaliativa'));
    });
});
