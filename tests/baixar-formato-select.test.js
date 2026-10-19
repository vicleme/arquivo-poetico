import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// "Formato do Baixar" (coluna Ações) e o download da barra de seleção viram
// select; o .csv entra nos dois (no Baixar da linha, só em Poemas e Prosas).

const A = await import('../js/acoes-coluna.js');
const { baixarSelecaoPorFormato, getFormatoSelecao, salvarFormatoSelecao, atualizarBarraSelecao } =
    await import('../js/selecao-massa.js');

describe('Formato do Baixar na coluna Ações', () => {
    beforeEach(() => localStorage.clear());

    it('é um select, sem radios, com .csv em Poemas e Prosas', () => {
        for (const t of ['poemas', 'prosas']) {
            const html = A.renderSeletorAcoes(t);
            assert.match(html, /<select[^>]*setFormatoBaixarColuna\('\w+', this\.value\)/);
            assert.doesNotMatch(html, /type="radio"/);
            assert.match(html, /<option value="csv" >\.csv<\/option>/);
            assert.match(html, /<option value="md" selected>/);
        }
    });

    it('as outras abas com formato (Sonoridade, Estrutura textual) não oferecem .csv', () => {
        for (const t of ['sonoridade', 'estrutura-textual']) {
            const html = A.renderSeletorAcoes(t);
            assert.match(html, /<select/);
            assert.doesNotMatch(html, /value="csv"/);
            A.setFormatoBaixarColuna(t, 'csv');
            assert.equal(A.getFormatoBaixar(t), 'md');
        }
    });

    it('escolher .csv fica salvo por tabela e volta selecionado', () => {
        A.setFormatoBaixarColuna('poemas', 'csv');
        assert.equal(A.getFormatoBaixar('poemas'), 'csv');
        assert.equal(A.getFormatoBaixar('prosas'), 'md');
        assert.match(A.renderSeletorAcoes('poemas'), /<option value="csv" selected>/);
    });

    it('Moldes segue sem seção de formato', () => {
        assert.doesNotMatch(A.renderSeletorAcoes('moldes'), /Formato do Baixar/);
    });
});

describe('download da barra de seleção por select', () => {
    it('não quebra sem seleção nem com formato desconhecido', () => {
        document.body.innerHTML =
            '<select id="baixar-formato-poemas"><option value="x" selected>x</option></select>';
        assert.doesNotThrow(() => baixarSelecaoPorFormato('poemas'));
        assert.doesNotThrow(() => baixarSelecaoPorFormato('prosas'));
    });
});

describe('formato do download da seleção fica salvo', () => {
    const OPCOES = ['json', 'csv', 'md', 'pdf', 'docx']
        .map((f) => `<option value="${f}">${f}</option>`)
        .join('');

    beforeEach(() => {
        localStorage.clear();
        document.body.innerHTML = ['poemas', 'prosas']
            .map(
                (t) =>
                    `<div id="barra-acoes-${t}" class="hidden"><select id="baixar-formato-${t}">${OPCOES}</select></div>`,
            )
            .join('');
    });

    it('sem nada salvo, o padrão é .json', () => {
        assert.equal(getFormatoSelecao('poemas'), 'json');
        assert.equal(getFormatoSelecao('prosas'), 'json');
    });

    it('guarda a escolha por tabela, sem misturar Poemas e Prosas', () => {
        salvarFormatoSelecao('poemas', 'pdf');
        assert.equal(getFormatoSelecao('poemas'), 'pdf');
        assert.equal(getFormatoSelecao('prosas'), 'json');
    });

    it('recusa formato desconhecido e ignora valor salvo inválido', () => {
        salvarFormatoSelecao('poemas', 'xyz');
        assert.equal(getFormatoSelecao('poemas'), 'json');
        localStorage.setItem('arquivoPoetico_formatoSelecao_prosas', 'toString');
        assert.equal(getFormatoSelecao('prosas'), 'json');
    });

    it('não é a mesma chave do Formato do Baixar da coluna Ações', () => {
        A.setFormatoBaixarColuna('poemas', 'docx');
        assert.equal(getFormatoSelecao('poemas'), 'json');
        salvarFormatoSelecao('poemas', 'csv');
        assert.equal(A.getFormatoBaixar('poemas'), 'docx');
    });

    it('ao atualizar a barra, o select volta com o formato salvo', () => {
        salvarFormatoSelecao('prosas', 'md');
        atualizarBarraSelecao('prosas');
        assert.equal(document.getElementById('baixar-formato-prosas').value, 'md');
        assert.equal(document.getElementById('baixar-formato-poemas').value, 'json');
    });

    it('o select do index.html grava a escolha ao mudar', async () => {
        const fs = await import('node:fs');
        const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
        for (const t of ['poemas', 'prosas']) {
            assert.ok(html.includes(`onchange="salvarFormatoSelecao('${t}', this.value)"`));
        }
    });
});

describe('exportarItem em .csv', () => {
    it('gera uma linha para o texto, com o nome do arquivo pelo título', async () => {
        const { db } = await import('../js/db.js');
        const { exportarItem } = await import('../js/exportar.js');
        db.poemas = [
            { id: 7, titulo: 'Meu Poema', texto: 'verso', jargaoGiria: ['Gíria juvenil'] },
        ];
        let nome = null;
        let conteudo = null;
        const criar = URL.createObjectURL;
        const OrigBlob = globalThis.Blob;
        globalThis.Blob = class extends OrigBlob {
            constructor(partes, o) {
                super(partes, o);
                conteudo = partes.join('');
            }
        };
        URL.createObjectURL = () => 'blob:x';
        URL.revokeObjectURL = () => {};
        const criarElemento = document.createElement.bind(document);
        document.createElement = (tag) => {
            const el = criarElemento(tag);
            if (tag === 'a') el.click = () => (nome = el.download);
            return el;
        };
        try {
            await exportarItem('poema', 7, 'csv');
        } finally {
            globalThis.Blob = OrigBlob;
            URL.createObjectURL = criar;
            document.createElement = criarElemento;
        }
        assert.equal(nome, 'meu-poema.csv');
        assert.match(conteudo, /Meu Poema/);
        assert.match(conteudo, /Gíria juvenil/);
    });
});
