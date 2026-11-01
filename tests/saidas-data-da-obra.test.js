import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// A data da obra nas saídas (T9, entrega 8 de 13): texto puro, Ver, .md, .csv
// e .json. A data aparece depois da obra, depois de um " · ", e só quando há.

const { db } = await import('../js/db.js');
const { criarDataObra } = await import('../js/data-da-obra.js');
const { textoDaDataDaEntrada, textosDasPontasDaEntrada } =
    await import('../js/data-da-entrada-texto.js');
const { gerarMarkdownExportacao } = await import('../js/exportar-md.js');
const { renderVisualizacaoHtml } = await import('../js/visualizar.js');
const { montarRegistro } = await import('../js/exportar.js');
const { gerarCsvTextos } = await import('../js/exportar-csv.js');

const d = (e) => criarDataObra(e).data;
const ano = (n) => d({ nivel: 'ano', ano: String(n) });
const seculo = (n) => d({ nivel: 'seculo', seculo: String(n) });

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
        grupos: [],
        pessoas: [],
    });
}

const poema = () => ({
    id: 1,
    tipo: 'poema',
    titulo: 'Solo',
    texto: 'x',
    intertextualidade: [
        {
            relacao: 'Citação',
            tipoObra: 'Música',
            obra: 'Águas de Março',
            autores: ['Tom Jobim'],
            dataObra: ano(1972),
        },
        { relacao: 'Alusão', tipoObra: 'Livro', obra: 'Sem data', autor: 'X' },
    ],
    hipertextualidade: [
        {
            relacao: 'Paródia',
            tipoObra: 'Livro',
            hipotexto: 'Dom Casmurro',
            autor: 'Machado de Assis',
            dataObra: ano(1899),
            dataObraAte: ano(1900),
        },
    ],
    referenciasExternas: [
        { tipo: 'Pessoa pública', texto: 'Clarice', dataObra: ano(1920), dataObraAte: ano(1977) },
        { tipo: 'Marco histórico', texto: 'Semana de 22', dataObra: ano(1922) },
        { tipo: 'Notícia', texto: 'Sem data' },
    ],
});

describe('textoDaDataDaEntrada', () => {
    it('obra: um ano, um intervalo ou nada', () => {
        assert.equal(textoDaDataDaEntrada({ dataObra: ano(1972) }), '1972');
        assert.equal(
            textoDaDataDaEntrada({ dataObra: seculo(19), dataObraAte: ano(1900) }),
            'séc. XIX até 1900',
        );
        assert.equal(textoDaDataDaEntrada({}), '');
        assert.equal(textoDaDataDaEntrada(null), '');
    });

    it('pessoa pública: nascimento e óbito; viva só tem o nascimento', () => {
        assert.equal(
            textoDaDataDaEntrada({
                tipo: 'Pessoa pública',
                dataObra: ano(1920),
                dataObraAte: ano(1977),
            }),
            'nasc. 1920, óbito 1977',
        );
        assert.equal(
            textoDaDataDaEntrada({ tipo: 'Pessoa pública', dataObra: ano(1980) }),
            'nasc. 1980',
        );
    });

    it('marco histórico segue o intervalo da obra', () => {
        assert.equal(
            textoDaDataDaEntrada({
                tipo: 'Marco histórico',
                dataObra: ano(1914),
                dataObraAte: ano(1918),
            }),
            '1914 até 1918',
        );
    });

    it('as pontas em separado, para as colunas do CSV', () => {
        assert.deepEqual(textosDasPontasDaEntrada({ dataObra: ano(1972) }), {
            inicio: '1972',
            fim: '',
        });
    });
});

describe('.md', () => {
    beforeEach(resetarDb);

    it('a data vem depois da obra, nas três seções, e só onde existe', () => {
        db.poemas = [poema()];
        const md = gerarMarkdownExportacao(db.poemas);
        assert.match(md, /Águas de Março \(Tom Jobim\) · 1972/);
        assert.doesNotMatch(md, /Sem data ·/);
        assert.match(md, /Dom Casmurro \(Machado de Assis\) · 1899 até 1900/);
        assert.match(md, /Clarice · nasc\. 1920, óbito 1977/);
        assert.match(md, /Semana de 22 · 1922/);
    });
});

describe('Ver', () => {
    it('mostra a data depois da obra, escapada', () => {
        const html = renderVisualizacaoHtml(poema());
        assert.match(html, /Águas de Março \(Tom Jobim\) · 1972/);
        assert.match(html, /Dom Casmurro \(Machado de Assis\) · 1899 até 1900/);
        assert.match(html, /Clarice · nasc\. 1920, óbito 1977/);
    });
});

describe('.csv', () => {
    beforeEach(resetarDb);

    function linha() {
        db.poemas = [poema()];
        const csv = gerarCsvTextos('poema', [montarRegistro('poema', db.poemas[0])], db);
        // Colunas por nome: lê o cabeçalho e a primeira linha sem aspas
        // dentro dos campos que testamos (sem vírgula nem quebra de linha).
        return csv;
    }

    it('a coluna de leitura leva a data e as paralelas guardam começo e fim por entrada', () => {
        const csv = linha();
        const [cabecalho] = csv.replace(/^\uFEFF/, '').split('\r\n');
        const nomes = cabecalho.split(',');
        ['intertextualidade_data_obra', 'intertextualidade_data_obra_ate'].forEach((n) =>
            assert.ok(nomes.includes(n), n),
        );
        ['hipertextualidade_data_obra', 'hipertextualidade_data_obra_ate'].forEach((n) =>
            assert.ok(nomes.includes(n), n),
        );
        ['referencias_externas_data', 'referencias_externas_data_ate'].forEach((n) =>
            assert.ok(nomes.includes(n), n),
        );
        assert.match(csv, /1972 \| /);
        assert.match(csv, /1899/);
        assert.match(csv, /1920 \| 1922 \| /);
        assert.match(csv, /1977/);
        assert.match(csv, /Águas de Março \(Tom Jobim\) · 1972/);
    });
});

describe('.json', () => {
    beforeEach(resetarDb);

    it('o registro do texto leva as datas das entradas como estão gravadas', () => {
        db.poemas = [poema()];
        const registro = montarRegistro('poema', db.poemas[0]);
        assert.equal(registro.intertextualidade[0].dataObra.ano, 1972);
        assert.equal(registro.hipertextualidade[0].dataObraAte.ano, 1900);
        assert.equal(registro.referenciasExternas[0].dataObraAte.ano, 1977);
        assert.equal('dataObra' in registro.intertextualidade[1], false);
    });
});
