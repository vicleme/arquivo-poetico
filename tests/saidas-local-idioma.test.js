import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Base mínima de DOM para renderPoemas (mesmo padrão de
// colunas-contagem-estrutura-linha.test.js).
document.body.innerHTML = `
    <main>
        <div id="lista-livros"></div>
        <div id="barra-acoes-poemas" class="hidden">
            <span id="contador-selecao-poemas"></span>
        </div>
        <div id="painel-colunas-poemas"></div>
        <div id="painel-acoes-poemas"></div>
        <select id="filtro-livro-poemas"></select>
        <table>
            <thead><tr id="cabecalho-poemas"></tr></thead>
            <tbody id="lista-poemas"></tbody>
        </table>
        <div id="paginacao-poemas"></div>
    </main>
`;

const { db } = await import('../js/db.js');
const rl = await import('../js/render-listas.js');
const { renderPoemas, setFiltroLivroPoemas, setItensPorPagina } = rl;
const { toggleColuna, resetarColunas } = await import('../js/colunas.js');
const { textoIdiomasComPapel } = await import('../js/utils.js');
const { criarLocal, textoLocalComCaminho, textoLocalEscrita, textoTerritorialidadeComCaminho } =
    await import('../js/locais.js');
const { gerarMarkdownExportacao } = await import('../js/exportar-md.js');
const { renderVisualizacaoHtml } = await import('../js/visualizar.js');
const { colunasTexto, gerarCsvTextos, SEPARADOR_LISTA } = await import('../js/exportar-csv.js');
await import('../js/main.js');

// Brasil > São Paulo (Estado) > São Paulo (Cidade) > Lapa > Estação Lapa,
// com Estação Lapa também sob o Metrô (segundo pai, que não entra no caminho).
function montarLocais() {
    db.locais = [];
    const brasil = criarLocal(db, { nome: 'Brasil', tipo: 'País' }).id;
    const estado = criarLocal(db, { nome: 'São Paulo', tipo: 'Estado', pais: [brasil] }).id;
    const cidade = criarLocal(db, { nome: 'São Paulo', tipo: 'Cidade', pais: [estado] }).id;
    const lapa = criarLocal(db, { nome: 'Lapa', tipo: 'Bairro', pais: [cidade] }).id;
    const metro = criarLocal(db, { nome: 'Metrô', tipo: 'Rede', pais: [cidade] }).id;
    const estacao = criarLocal(db, {
        nome: 'Estação Lapa',
        tipo: 'Estação',
        pais: [lapa, metro],
    }).id;
    return { brasil, estado, cidade, lapa, metro, estacao };
}

function limpar() {
    db.livros.length = 0;
    db.partes.length = 0;
    db.secoes.length = 0;
    db.poemas.length = 0;
    db.prosas.length = 0;
    db.locais = [];
    resetarColunas('poemas');
    setFiltroLivroPoemas('');
    setItensPorPagina('todos');
}

describe('textoIdiomasComPapel', () => {
    it('um idioma Principal sem dialeto sai só com o nome', () => {
        assert.equal(
            textoIdiomasComPapel({ idiomas: [{ idioma: 'pt-BR', papel: 'principal' }] }),
            'pt-BR',
        );
    });

    it('dado antigo (só `idioma`) sai com o nome', () => {
        assert.equal(textoIdiomasComPapel({ idioma: 'en' }), 'en');
    });

    it('sem idioma devolve vazio', () => {
        assert.equal(textoIdiomasComPapel({}), '');
    });

    it('papel e dialetos entram entre parênteses, Principais primeiro', () => {
        const item = {
            idiomas: [
                { idioma: 'Inglês', papel: 'secundario', dialetos: [] },
                { idioma: 'pt-BR', papel: 'principal', dialetos: ['paulistano', 'gaúcho'] },
            ],
        };
        assert.equal(
            textoIdiomasComPapel(item),
            'pt-BR (principal; dialetos: paulistano, gaúcho), Inglês (secundário)',
        );
    });

    it('um dialeto só usa o singular', () => {
        const item = {
            idiomas: [{ idioma: 'Espanhol', papel: 'principal', dialetos: ['rioplatense'] }],
        };
        assert.equal(textoIdiomasComPapel(item), 'Espanhol (principal; dialeto: rioplatense)');
    });

    it('um idioma só nunca fica Secundário: a regra "ao menos um Principal" o promove', () => {
        const item = { idiomas: [{ idioma: 'Inglês', papel: 'secundario', dialetos: [] }] };
        assert.equal(textoIdiomasComPapel(item), 'Inglês');
    });
});

describe('textos de Local com caminho', () => {
    beforeEach(limpar);

    it('o caminho sobe pelo primeiro pai e não repete o próprio Local', () => {
        const { estacao, brasil } = montarLocais();
        assert.equal(
            textoLocalComCaminho(db, estacao),
            'Estação Lapa (Lapa › São Paulo › São Paulo › Brasil)',
        );
        assert.equal(textoLocalComCaminho(db, brasil), 'Brasil');
    });

    it('textoLocalEscrita devolve vazio sem Local ou com Local que não existe mais', () => {
        montarLocais();
        assert.equal(textoLocalEscrita(db, {}), '');
        assert.equal(textoLocalEscrita(db, { localEscrita: 'fantasma' }), '');
    });

    it('textoTerritorialidadeComCaminho junta os Locais citados e ignora ids inexistentes', () => {
        const { lapa, brasil } = montarLocais();
        const item = { territorialidade: [lapa, brasil, 'fantasma'] };
        assert.equal(
            textoTerritorialidadeComCaminho(db, item),
            'Lapa (São Paulo › São Paulo › Brasil), Brasil',
        );
    });

    it('texto só com o espelho de nomes (sem ids) devolve vazio', () => {
        montarLocais();
        assert.equal(
            textoTerritorialidadeComCaminho(db, { sinalizacoesTerritorialidade: 'Brasil' }),
            '',
        );
    });
});

describe('.md e Visualização', () => {
    beforeEach(limpar);

    function poemaCompleto() {
        const l = montarLocais();
        return {
            id: 1,
            tipo: 'poema',
            titulo: 'Lapa de noite',
            texto: 'verso',
            idiomas: [
                { idioma: 'pt-BR', papel: 'principal', dialetos: ['paulistano'] },
                { idioma: 'Inglês', papel: 'secundario', dialetos: [] },
            ],
            idioma: 'pt-BR, Inglês',
            localEscrita: l.estacao,
            territorialidade: [l.lapa],
            sinalizacoesTerritorialidade: 'Lapa',
        };
    }

    it('.md traz Idioma com papel e dialeto, Local onde foi escrito e Territorialidade com caminho', () => {
        db.poemas = [poemaCompleto()];
        const md = gerarMarkdownExportacao(db.poemas);
        assert.match(
            md,
            /\*\*Idioma:\*\* pt-BR \(principal; dialeto: paulistano\), Inglês \(secundário\)/,
        );
        assert.match(
            md,
            /\*\*Local onde foi escrito:\*\* Estação Lapa \(Lapa › São Paulo › São Paulo › Brasil\)/,
        );
        assert.match(md, /\*\*Territorialidade:\*\* Lapa \(São Paulo › São Paulo › Brasil\)/);
    });

    it('.md de texto antigo (só espelho) mantém a Territorialidade pelos nomes e Idioma simples', () => {
        db.poemas = [
            {
                id: 2,
                titulo: 'Antigo',
                texto: 'x',
                idioma: 'en',
                sinalizacoesTerritorialidade: 'Brasil',
            },
        ];
        const md = gerarMarkdownExportacao(db.poemas);
        assert.match(md, /\*\*Idioma:\*\* en\n/);
        assert.match(md, /\*\*Territorialidade:\*\* Brasil\n/);
        assert.doesNotMatch(md, /Local onde foi escrito/);
    });

    it('Visualização mostra as mesmas três linhas', () => {
        const html = renderVisualizacaoHtml(poemaCompleto());
        assert.match(html, /Idioma/);
        assert.match(html, /pt-BR \(principal; dialeto: paulistano\), Inglês \(secundário\)/);
        assert.match(html, /Local onde foi escrito/);
        assert.match(html, /Estação Lapa \(Lapa › São Paulo › São Paulo › Brasil\)/);
        assert.match(html, /Lapa \(São Paulo › São Paulo › Brasil\)/);
    });

    it('Visualização sem idioma nem Local não cria as linhas', () => {
        const html = renderVisualizacaoHtml({ id: 3, tipo: 'poema', titulo: 'Vazio', texto: 'x' });
        assert.doesNotMatch(html, /Local onde foi escrito/);
        assert.doesNotMatch(html, /Idioma/);
    });
});

describe('.csv', () => {
    beforeEach(limpar);

    function linhaCsv(item) {
        const cols = colunasTexto('poema');
        const ctx = { banco: db, texto: { versos: 0, blocos: 0, palavras: 0, plano: '' } };
        return Object.fromEntries(cols.map((c) => [c.cabecalho, c.valor(item, ctx)]));
    }

    it('separa idioma Principal, Secundário e dialetos, e mantém `idioma` com o espelho', () => {
        const linha = linhaCsv({
            id: 1,
            idioma: 'pt-BR, Inglês, Espanhol',
            idiomas: [
                { idioma: 'pt-BR', papel: 'principal', dialetos: ['paulistano', 'gaúcho'] },
                { idioma: 'Inglês', papel: 'secundario', dialetos: [] },
                { idioma: 'Espanhol', papel: 'secundario', dialetos: ['rioplatense'] },
            ],
        });
        assert.equal(linha.idioma, 'pt-BR, Inglês, Espanhol');
        assert.equal(linha.idioma_principal, 'pt-BR');
        assert.equal(linha.idioma_secundario, ['Inglês', 'Espanhol'].join(SEPARADOR_LISTA));
        assert.equal(
            linha.dialetos,
            ['paulistano (pt-BR)', 'gaúcho (pt-BR)', 'rioplatense (Espanhol)'].join(
                SEPARADOR_LISTA,
            ),
        );
    });

    it('Local de escrita e Territorialidade saem com o caminho do mais alto até o Local', () => {
        const l = montarLocais();
        const linha = linhaCsv({
            id: 2,
            localEscrita: l.estacao,
            territorialidade: [l.lapa, l.brasil],
        });
        assert.equal(linha.local_escrita, 'Estação Lapa');
        assert.equal(
            linha.local_escrita_caminho,
            'Brasil › São Paulo › São Paulo › Lapa › Estação Lapa',
        );
        assert.equal(
            linha.territorialidade_caminho,
            ['Brasil › São Paulo › São Paulo › Lapa', 'Brasil'].join(SEPARADOR_LISTA),
        );
    });

    it('texto sem idioma nem Local deixa as colunas vazias', () => {
        montarLocais();
        const linha = linhaCsv({ id: 3, localEscrita: 'fantasma' });
        [
            'idioma_principal',
            'idioma_secundario',
            'dialetos',
            'local_escrita',
            'local_escrita_caminho',
            'territorialidade_caminho',
        ].forEach((c) => assert.equal(linha[c], '', c));
    });

    it('gerarCsvTextos inclui os cabeçalhos novos', () => {
        const csv = gerarCsvTextos('poema', [], db);
        [
            'idioma_principal',
            'idioma_secundario',
            'dialetos',
            'local_escrita',
            'local_escrita_caminho',
            'territorialidade_caminho',
        ].forEach((c) => assert.match(csv, new RegExp(c)));
    });
});

describe('colunas da tabela de Poemas', () => {
    beforeEach(limpar);

    function celulasDaLinha(rotulo) {
        const cabecalhos = Array.from(document.querySelectorAll('#cabecalho-poemas th'));
        const i = cabecalhos.findIndex((th) => th.textContent.includes(rotulo));
        assert.ok(i >= 0, `coluna "${rotulo}" deveria estar no cabeçalho`);
        const tds = document.querySelectorAll('#lista-poemas tr')[0].querySelectorAll('td');
        return tds[i];
    }

    it('Idioma mostra papel e dialeto', () => {
        db.poemas.push({
            id: 1,
            titulo: 'A',
            idioma: 'pt-BR, Inglês',
            idiomas: [
                { idioma: 'pt-BR', papel: 'principal', dialetos: ['paulistano'] },
                { idioma: 'Inglês', papel: 'secundario', dialetos: [] },
            ],
        });
        toggleColuna('poemas', 'idioma', true);
        renderPoemas();
        assert.equal(
            celulasDaLinha('Idioma').textContent.trim(),
            'pt-BR (principal; dialeto: paulistano), Inglês (secundário)',
        );
    });

    it('Idioma sem valor segue mostrando pt-BR', () => {
        db.poemas.push({ id: 1, titulo: 'A' });
        toggleColuna('poemas', 'idioma', true);
        renderPoemas();
        assert.equal(celulasDaLinha('Idioma').textContent.trim(), 'pt-BR');
    });

    it('Local de escrita mostra o nome com o caminho; vazio mostra traço', () => {
        const l = montarLocais();
        db.poemas.push({ id: 1, titulo: 'A', localEscrita: l.lapa });
        toggleColuna('poemas', 'localEscrita', true);
        renderPoemas();
        assert.equal(
            celulasDaLinha('Local de escrita').textContent.trim(),
            'Lapa (São Paulo › São Paulo › Brasil)',
        );

        db.poemas.length = 0;
        db.poemas.push({ id: 2, titulo: 'B' });
        renderPoemas();
        assert.equal(celulasDaLinha('Local de escrita').textContent.trim(), '—');
    });

    it('Territorialidade mostra um selo por Local, com o caminho na dica', () => {
        const l = montarLocais();
        db.poemas.push({ id: 1, titulo: 'A', territorialidade: [l.lapa, l.brasil] });
        toggleColuna('poemas', 'territorialidade', true);
        renderPoemas();
        const selos = Array.from(celulasDaLinha('Territorialidade').querySelectorAll('span'));
        assert.deepEqual(
            selos.map((s) => s.textContent.trim()),
            ['Lapa', 'Brasil'],
        );
        assert.equal(selos[0].getAttribute('title'), 'Lapa (São Paulo › São Paulo › Brasil)');
    });

    it('Territorialidade de texto só com espelho mostra os nomes do espelho', () => {
        montarLocais();
        db.poemas.push({ id: 1, titulo: 'A', sinalizacoesTerritorialidade: 'Brasil, Portugal' });
        toggleColuna('poemas', 'territorialidade', true);
        renderPoemas();
        const selos = Array.from(celulasDaLinha('Territorialidade').querySelectorAll('span'));
        assert.deepEqual(
            selos.map((s) => s.textContent.trim()),
            ['Brasil', 'Portugal'],
        );
    });

    it('Idioma, Local de escrita, Territorialidade e Movimento/Escola têm a lupa no cabeçalho, com o prefixo certo', () => {
        db.poemas.push({ id: 1, titulo: 'A' });
        ['idioma', 'localEscrita', 'territorialidade', 'movimentosEscolas'].forEach((k) =>
            toggleColuna('poemas', k, true),
        );
        renderPoemas();
        const esperado = {
            Idioma: 'idioma:',
            'Local de escrita': 'localescrita:',
            Territorialidade: 'territorialidade:',
            'Movimento/Escola': 'movimento:',
        };
        const ths = Array.from(document.querySelectorAll('#cabecalho-poemas th'));
        Object.entries(esperado).forEach(([rotulo, prefixo]) => {
            const th = ths.find((x) => x.textContent.includes(rotulo));
            assert.ok(th, `coluna ${rotulo}`);
            assert.ok(
                th.querySelector(`[title="Buscar por ${prefixo}"]`),
                `lupa de ${rotulo} deveria buscar por ${prefixo}`,
            );
        });
    });
});
