import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Obra pessoal (entrega 3): a marca nas saídas (Ver, .md, .csv, células da
// tabela, busca `obrapessoal:` e relatórios de Fora do acervo).

const { db } = await import('../js/db.js');
const { partesEntradaIntertexto, filtrarTextos } = await import('../js/utils.js');
const { renderVisualizacaoHtml } = await import('../js/visualizar.js');
const { gerarMarkdownExportacao } = await import('../js/exportar-md.js');
const { gerarCsvTextos } = await import('../js/exportar-csv.js');
const { montarRegistro } = await import('../js/exportar.js');
const { decorarCamposBusca, celulaIntertextualidade, celulaHipertextualidade } =
    await import('../js/render-listas.js');
const { itemTemObraPessoal } = await import('../js/intertextualidade.js');
const { montarForaDoAcervo } = await import('../js/fora-do-acervo.js');
const { gerarMarkdownForaDoAcervo, gerarCsvForaDoAcervo } =
    await import('../js/exportar-fora-do-acervo.js');

const INTER = [
    { relacao: 'Citação', tipoObra: 'Texto', obra: 'Diário de 2019', obraPessoal: true },
    { relacao: 'Citação', tipoObra: 'Livro', obra: 'Dom Casmurro' },
];
const HIPER = [
    { relacao: 'Resposta', tipoObra: 'Texto', hipotexto: 'Carta de Pedro', obraPessoal: true },
    { relacao: 'Paródia', tipoObra: 'Livro', hipotexto: 'Iracema' },
];

function poema(extra = {}) {
    return {
        id: 100,
        titulo: 'T',
        texto: 'x',
        intertextualidade: INTER,
        hipertextualidade: HIPER,
        ...extra,
    };
}

function resetarDb() {
    Object.assign(db, {
        livros: [],
        partes: [],
        secoes: [],
        poemas: [],
        prosas: [],
        elementos: [],
        coletaneas: [],
        itensColetanea: [],
        autores: [],
        pessoas: [],
        grupos: [],
    });
}

// Leitor mínimo de CSV (aspas duplas, vírgula, quebra de linha).
function lerCsv(csv) {
    const linhas = [];
    let linha = [];
    let celula = '';
    let aspas = false;
    const texto = csv.replace(/^\uFEFF/, '');
    for (let i = 0; i < texto.length; i++) {
        const c = texto[i];
        if (aspas) {
            if (c === '"' && texto[i + 1] === '"') {
                celula += '"';
                i++;
            } else if (c === '"') aspas = false;
            else celula += c;
        } else if (c === '"') aspas = true;
        else if (c === ',') {
            linha.push(celula);
            celula = '';
        } else if (c === '\n' || c === '\r') {
            if (c === '\r' && texto[i + 1] === '\n') i++;
            linha.push(celula);
            linhas.push(linha);
            linha = [];
            celula = '';
        } else celula += c;
    }
    if (celula || linha.length) {
        linha.push(celula);
        linhas.push(linha);
    }
    const [cab, ...resto] = linhas;
    return resto.map((l) => Object.fromEntries(cab.map((h, i) => [h, l[i]])));
}

describe('partesEntradaIntertexto: obraPessoal', () => {
    it('só true vale', () => {
        assert.equal(partesEntradaIntertexto({ obra: 'x', obraPessoal: true }).obraPessoal, true);
        assert.equal(partesEntradaIntertexto({ obra: 'x', obraPessoal: 'sim' }).obraPessoal, false);
        assert.equal(partesEntradaIntertexto({ obra: 'x' }).obraPessoal, false);
    });
});

describe('Ver e Markdown', () => {
    beforeEach(resetarDb);

    it('Ver mostra "(obra pessoal)" só nas entradas marcadas, em Inter e Hiper', () => {
        const h = renderVisualizacaoHtml({ tipo: 'poema', ...poema() });
        assert.match(h, /Diário de 2019 \(obra pessoal\)/);
        assert.match(h, /Carta de Pedro \(obra pessoal\)/);
        assert.equal(h.match(/\(obra pessoal\)/g).length, 2);
    });

    it('.md mostra a marca nas duas listas e nada nas entradas comuns', () => {
        db.poemas = [poema()];
        const md = gerarMarkdownExportacao(db.poemas);
        assert.match(md, /Diário de 2019 \(obra pessoal\)/);
        assert.match(md, /Carta de Pedro \(obra pessoal\)/);
        assert.doesNotMatch(md, /Dom Casmurro \(obra pessoal\)/);
        assert.doesNotMatch(md, /Iracema \(obra pessoal\)/);
    });

    it('com traduzido, a marca vem depois', () => {
        const h = renderVisualizacaoHtml({
            tipo: 'poema',
            ...poema({
                intertextualidade: [
                    { relacao: 'Citação', obra: 'Carta', traduzido: true, obraPessoal: true },
                ],
            }),
        });
        assert.match(h, /\(traduzido\) \(obra pessoal\)/);
    });
});

describe('CSV de Poemas', () => {
    beforeEach(resetarDb);

    const linha = () => {
        const csv = gerarCsvTextos('poema', [montarRegistro('poema', poema())], db);
        return lerCsv(csv)[0];
    };

    it('a coluna de leitura traz "(obra pessoal)" nas duas listas', () => {
        const l = linha();
        assert.match(l.intertextualidade, /Diário de 2019 \(obra pessoal\)/);
        assert.doesNotMatch(l.intertextualidade, /Dom Casmurro \(obra pessoal\)/);
        assert.match(l.hipertextualidade, /Carta de Pedro \(Resposta\) \(obra pessoal\)/);
    });

    it('as colunas paralelas marcam "sim" por posição, e vazio onde não é', () => {
        const l = linha();
        assert.equal(l.intertextualidade_obra_pessoal, 'sim | ');
        assert.equal(l.hipertextualidade_obra_pessoal, 'sim | ');
    });
});

describe('Células da tabela', () => {
    it('mostram "(obra pessoal)" só na entrada marcada', () => {
        const inter = celulaIntertextualidade(INTER);
        assert.equal(inter.match(/\(obra pessoal\)/g).length, 1);
        assert.match(inter, /Diário de 2019.*\(obra pessoal\)/);
        const hiper = celulaHipertextualidade(HIPER);
        assert.equal(hiper.match(/\(obra pessoal\)/g).length, 1);
        assert.match(hiper, /Carta de Pedro.*\(obra pessoal\)/);
    });
});

describe('Busca obrapessoal:', () => {
    const itens = () =>
        [
            { id: 1, titulo: 'Com Inter', intertextualidade: INTER },
            { id: 2, titulo: 'Com Hiper', hipertextualidade: HIPER },
            { id: 3, titulo: 'Sem marca', intertextualidade: [INTER[1]] },
            { id: 4, titulo: 'Sem nada' },
        ].map((p) => decorarCamposBusca(p, '', 'poema'));
    const ids = (lista) => lista.map((p) => p.id).sort();

    it('itemTemObraPessoal olha Inter e Hiper', () => {
        assert.equal(itemTemObraPessoal({ intertextualidade: INTER }), true);
        assert.equal(itemTemObraPessoal({ hipertextualidade: HIPER }), true);
        assert.equal(itemTemObraPessoal({ intertextualidade: [INTER[1]] }), false);
        assert.equal(itemTemObraPessoal({}), false);
        assert.equal(itemTemObraPessoal(null), false);
    });

    it('obrapessoal:* acha quem tem alguma entrada marcada, em Inter ou Hiper', () => {
        assert.deepEqual(ids(filtrarTextos(itens(), 'obrapessoal:*')), [1, 2]);
    });

    it('-obrapessoal:* acha quem não tem nenhuma', () => {
        assert.deepEqual(ids(filtrarTextos(itens(), '-obrapessoal:*')), [3, 4]);
    });

    it('obrapessoal:sim também funciona, e combina com outros termos', () => {
        assert.deepEqual(ids(filtrarTextos(itens(), 'obrapessoal:sim')), [1, 2]);
        assert.deepEqual(ids(filtrarTextos(itens(), 'obrapessoal:* Hiper')), [2]);
    });
});

describe('Relatórios de Fora do acervo', () => {
    const dados = () =>
        montarForaDoAcervo({
            poemas: [
                { id: 1, titulo: 'A', intertextualidade: [INTER[0]] },
                {
                    id: 2,
                    titulo: 'B',
                    intertextualidade: [{ ...INTER[0], obraPessoal: undefined }],
                },
                { id: 3, titulo: 'C', intertextualidade: [INTER[1]] },
            ],
            prosas: [],
        });

    it('.md diz "Obra pessoal: em 1 de 2 entradas" na obra que diverge e nada nas outras', () => {
        const md = gerarMarkdownForaDoAcervo(dados(), 'tudo');
        assert.match(md, /Obra pessoal: em 1 de 2 entradas/);
        assert.equal(md.match(/Obra pessoal:/g).length, 1);
    });

    it('.csv tem a coluna obra_pessoal com sim, em parte ou vazio', () => {
        const linhas = lerCsv(gerarCsvForaDoAcervo(dados(), 'obras'));
        const porObra = Object.fromEntries(linhas.map((l) => [l.obra, l.obra_pessoal]));
        assert.equal(porObra['Diário de 2019'], 'em 1 de 2 entradas');
        assert.equal(porObra['Dom Casmurro'], '');
        const todas = lerCsv(
            gerarCsvForaDoAcervo(
                montarForaDoAcervo({
                    poemas: [{ id: 1, titulo: 'A', intertextualidade: [INTER[0]] }],
                    prosas: [],
                }),
                'obras',
            ),
        );
        assert.equal(todas[0].obra_pessoal, 'sim');
    });
});
