import './helpers/localstorage-shim.js';
import './helpers/dom-shim.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { db } from '../js/db.js';
import { gerarMarkdownExportacao } from '../js/exportar-md.js';
import { renderVisualizacaoHtml } from '../js/visualizar.js';
import { agruparIntertextualidadePorRelacao, partesEntradaIntertexto } from '../js/utils.js';

function resetarDb() {
    db.livros = [];
    db.partes = [];
    db.secoes = [];
    db.poemas = [];
    db.prosas = [];
    db.elementos = [];
    db.coletaneas = [];
    db.itensColetanea = [];
    db.autores = [];
}

const ENTRADAS = [
    { relacao: 'Citação', tipoObra: 'Livro', obra: 'Dom Casmurro', autor: 'Machado de Assis' },
    { relacao: 'Alusão', tipoObra: 'Filme', obra: 'Cidade de Deus' },
    { relacao: 'Citação', tipoObra: 'Livro', obra: 'Grande Sertão' },
    { relacao: 'citação', tipoObra: 'Música', obra: 'Construção', link: 'https://x.test' },
    { tipo: 'Notícia', texto: 'Algo antigo' },
];

describe('agruparIntertextualidadePorRelacao', () => {
    it('agrupa pela relação e, dentro dela, pelo tipo de obra, na ordem de primeira aparição', () => {
        const { relacoes, semRelacao } = agruparIntertextualidadePorRelacao(ENTRADAS);
        assert.deepEqual(
            relacoes.map((r) => [r.relacao, r.tipos.map((t) => t.tipo)]),
            [
                ['Citação', ['Livro', 'Música']],
                ['Alusão', ['Filme']],
            ],
        );
        assert.equal(relacoes[0].tipos[0].entradas.length, 2);
        assert.equal(semRelacao.length, 1);
        assert.equal(semRelacao[0].tipo, 'Notícia');
    });

    it('junta relações que só diferem na caixa e nos espaços das pontas', () => {
        const { relacoes } = agruparIntertextualidadePorRelacao([
            { relacao: 'Citação', obra: 'a' },
            { relacao: '  citação ', obra: 'b' },
        ]);
        assert.equal(relacoes.length, 1);
        assert.equal(relacoes[0].tipos[0].entradas.length, 2);
    });

    it('sem entradas devolve tudo vazio', () => {
        assert.deepEqual(agruparIntertextualidadePorRelacao([]), { relacoes: [], semRelacao: [] });
        assert.deepEqual(agruparIntertextualidadePorRelacao(undefined), {
            relacoes: [],
            semRelacao: [],
        });
    });

    it('entrada sem tipo de obra fica solta dentro da relação', () => {
        const { relacoes } = agruparIntertextualidadePorRelacao([
            { relacao: 'Menção', obra: 'mirrorball' },
        ]);
        assert.equal(relacoes[0].tipos[0].tipo, '');
    });

    it('descrição ou trecho num grupo com mais de uma entrada força a sub-lista', () => {
        const { relacoes } = agruparIntertextualidadePorRelacao([
            { relacao: 'Citação', tipoObra: 'Livro', obra: 'A', descricao: 'um romance' },
            { relacao: 'Citação', tipoObra: 'Livro', obra: 'B' },
        ]);
        assert.equal(relacoes[0].tipos[0].subBullet, true);
    });

    it('só autor, sem vírgula, mantém a linha única com vírgulas', () => {
        const { relacoes } = agruparIntertextualidadePorRelacao([
            { relacao: 'Citação', tipoObra: 'Livro', obra: 'A', autor: 'X' },
            { relacao: 'Citação', tipoObra: 'Livro', obra: 'B', autor: 'Y' },
        ]);
        assert.equal(relacoes[0].tipos[0].subBullet, false);
    });
});

describe('partesEntradaIntertexto', () => {
    it('monta a obra com autor e personagem entre parênteses', () => {
        const p = partesEntradaIntertexto({
            obra: 'Dom Casmurro',
            autor: 'Machado de Assis',
            personagem: 'Capitu',
        });
        assert.equal(p.corpo, 'Dom Casmurro (Machado de Assis; personagem Capitu)');
    });

    it('só personagem, sem autor', () => {
        assert.equal(
            partesEntradaIntertexto({ obra: 'Mitologia grega', personagem: 'Medusa' }).corpo,
            'Mitologia grega (personagem Medusa)',
        );
    });

    it('entrada antiga (texto) sai só com a obra', () => {
        assert.equal(partesEntradaIntertexto({ tipo: 'Livro', texto: 'Algo' }).corpo, 'Algo');
    });

    it('trecho com quebras vira uma linha só; traduzido só vale com true', () => {
        const p = partesEntradaIntertexto({
            obra: 'x',
            trecho: 'verso um\nverso dois',
            traduzido: true,
        });
        assert.equal(p.trecho, 'verso um / verso dois');
        assert.equal(p.traduzido, true);
        assert.equal(partesEntradaIntertexto({ obra: 'x', traduzido: 'sim' }).traduzido, false);
    });
});

describe('Ver: Intertextualidade em dois níveis', () => {
    function html(intertextualidade, extra = {}) {
        return renderVisualizacaoHtml({
            id: 1,
            tipo: 'poema',
            titulo: 'T',
            texto: 'x',
            intertextualidade,
            ...extra,
        });
    }

    it('mostra a relação por fora e o tipo de obra por dentro', () => {
        const h = html(ENTRADAS.slice(0, 3));
        assert.match(h, /<strong>Citação:<\/strong><ul[^>]*><li[^>]*><strong>Livro:<\/strong>/);
        assert.match(
            h,
            /<strong>Alusão:<\/strong><ul[^>]*><li[^>]*><strong>Filme:<\/strong> Cidade de Deus/,
        );
        assert.match(h, /Dom Casmurro \(Machado de Assis\), Grande Sertão/);
    });

    it('não repete o rótulo da relação nem o do tipo de obra por entrada', () => {
        const h = html(ENTRADAS.slice(0, 3));
        assert.equal(h.match(/<strong>Citação:<\/strong>/g).length, 1);
        assert.equal(h.match(/<strong>Livro:<\/strong>/g).length, 1);
    });

    it('descrição vira aposto, trecho sai em itálico e traduzido aparece', () => {
        const h = html([
            {
                relacao: 'Citação',
                tipoObra: 'Música',
                obra: 'Construção',
                autor: 'Chico Buarque',
                descricao: 'canção de 1971',
                trecho: 'Amou daquela vez',
                traduzido: true,
            },
        ]);
        assert.match(
            h,
            /Construção \(Chico Buarque\), canção de 1971 <em>“Amou daquela vez”<\/em> \(traduzido\)/,
        );
    });

    it('escapa HTML nos campos novos', () => {
        const h = html([
            {
                relacao: 'Citação',
                tipoObra: 'Livro',
                obra: 'A',
                descricao: '<b>x</b>',
                trecho: '<i>y</i>',
            },
        ]);
        assert.ok(!h.includes('<b>x</b>'));
        assert.ok(!h.includes('<i>y</i>'));
        assert.match(h, /&lt;b&gt;x&lt;\/b&gt;/);
    });

    it('entrada antiga fica num bloco no fim, sem grupo "Sem relação"', () => {
        const h = html([ENTRADAS[0], ENTRADAS[4]]);
        assert.ok(!/Sem relação/i.test(h));
        assert.ok(h.indexOf('Notícia:') > h.indexOf('Dom Casmurro'));
        assert.match(h, /<li[^>]*><strong>Notícia:<\/strong> Algo antigo<\/li>/);
    });

    it('só entradas antigas saem como antes (sem nível de relação)', () => {
        const h = html([{ tipo: 'Citação', texto: 'Trecho' }]);
        assert.match(h, /<li[^>]*><strong>Citação:<\/strong> Trecho<\/li>/);
    });

    it('Referências continuam agrupadas só por tipo', () => {
        const h = html([], { referenciasExternas: [{ tipo: 'Marco histórico', texto: 'Data' }] });
        assert.match(h, /<strong>Marco histórico:<\/strong> Data/);
    });

    it('Hipertextualidade mostra autor e descrição', () => {
        const h = html([], {
            hipertextualidade: [
                {
                    tipoObra: 'Livro',
                    relacao: 'Paródia',
                    hipotexto: 'Dom Casmurro',
                    autor: 'Machado de Assis',
                    descricao: 'romance de 1899',
                },
            ],
        });
        assert.match(
            h,
            /Paródia da obra\/\(hipo\)texto Dom Casmurro \(Machado de Assis\), romance de 1899/,
        );
    });
});

describe('.md: Intertextualidade em dois níveis', () => {
    beforeEach(resetarDb);

    function md(intertextualidade, extra = {}) {
        db.poemas = [{ id: 1, titulo: 'Solo', texto: 'x', intertextualidade, ...extra }];
        return gerarMarkdownExportacao(db.poemas);
    }

    it('relação por fora, tipo de obra por dentro, entrada antiga no fim', () => {
        const saida = md(ENTRADAS);
        assert.match(
            saida,
            /### Intertextualidade\n\n- \*\*Citação:\*\*\n {2}- \*\*Livro:\*\* Dom Casmurro \(Machado de Assis\), Grande Sertão\n {2}- \*\*Música:\*\* Construção — \[https:\/\/x\.test\]\(https:\/\/x\.test\)\n- \*\*Alusão:\*\*\n {2}- \*\*Filme:\*\* Cidade de Deus\n- \*\*Notícia:\*\* Algo antigo\n/,
        );
    });

    it('descrição, trecho e traduzido entram na linha; sub-lista com mais de uma entrada', () => {
        const saida = md([
            {
                relacao: 'Citação',
                tipoObra: 'Música',
                obra: 'Construção',
                autor: 'Chico Buarque',
                descricao: 'canção de 1971',
                trecho: 'Amou daquela vez',
                traduzido: true,
            },
            { relacao: 'Citação', tipoObra: 'Música', obra: 'Cálice' },
        ]);
        assert.match(
            saida,
            /- \*\*Citação:\*\*\n {2}- \*\*Música:\*\*\n {4}- Construção \(Chico Buarque\), canção de 1971 \*“Amou daquela vez”\* \(traduzido\)\n {4}- Cálice\n/,
        );
    });

    it('trecho de vários versos não quebra a lista', () => {
        const saida = md([
            { relacao: 'Citação', tipoObra: 'Livro', obra: 'A', trecho: 'verso um\nverso dois' },
        ]);
        assert.match(saida, /\*“verso um \/ verso dois”\*/);
    });

    it('só entradas antigas saem exatamente como antes', () => {
        const saida = md([{ tipo: 'Citação', texto: 'Trecho' }]);
        assert.match(saida, /### Intertextualidade\n\n- \*\*Citação:\*\* Trecho\n\n/);
    });

    it('Hipertextualidade traz autor e descrição', () => {
        const saida = md([], {
            hipertextualidade: [
                {
                    tipoObra: 'Livro',
                    relacao: 'Paródia',
                    hipotexto: 'Dom Casmurro',
                    autor: 'Machado de Assis',
                    descricao: 'romance de 1899',
                },
            ],
        });
        assert.match(
            saida,
            /- \*\*Livro:\*\* Paródia da obra\/\(hipo\)texto Dom Casmurro \(Machado de Assis\), romance de 1899\n/,
        );
    });

    it('Referências seguem agrupadas só por tipo', () => {
        const saida = md([], { referenciasExternas: [{ tipo: 'Marco histórico', texto: 'Data' }] });
        assert.match(saida, /### Referências\n\n- \*\*Marco histórico:\*\* Data\n/);
    });
});
