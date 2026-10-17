import './helpers/localstorage-shim.js';
import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Fase 14, etapa 2: campo "Divisões" de corrente nos textos. A divisão é
// derivada (corrente com pai, F14-D6): o texto segue guardando uma lista só,
// `movimentosEscolasIds`, e a separação entre "Correntes" e "Divisões" é de
// exibição (modal, colunas, Ver, .md, .csv) e de contagem (Estatísticas,
// modos Agrupado e Separado, F14-D9).

document.body.innerHTML = `
    <main>
        <div id="lista-livros"></div>
        <div id="barra-acoes-poemas" class="hidden"><span id="contador-selecao-poemas"></span></div>
        <div id="painel-colunas-poemas"></div>
        <div id="painel-acoes-poemas"></div>
        <select id="filtro-livro-poemas"></select>
        <table>
            <thead><tr id="cabecalho-poemas"></tr></thead>
            <tbody id="lista-poemas"></tbody>
        </table>
        <div id="paginacao-poemas"></div>
    </main>
    <div id="modal-poema">
        <input id="p-movimento-escola-input" />
        <datalist id="sugestoes-movimentos-escolas"></datalist>
        <div id="p-movimentos-escolas-container"></div>
        <input id="p-divisao-corrente-input" />
        <datalist id="sugestoes-divisoes-correntes"></datalist>
        <div id="p-divisoes-correntes-container"></div>
    </div>
    <div id="modal-prosa">
        <input id="pr-movimento-escola-input" />
        <datalist id="sugestoes-movimentos-escolas-prosa"></datalist>
        <div id="pr-movimentos-escolas-container"></div>
        <input id="pr-divisao-corrente-input" />
        <datalist id="sugestoes-divisoes-correntes-prosa"></datalist>
        <div id="pr-divisoes-correntes-container"></div>
    </div>
    <div id="modal-autor">
        <input id="au-movimento-escola-input" />
        <datalist id="sugestoes-movimentos-escolas-autor"></datalist>
        <div id="au-movimentos-escolas-container"></div>
    </div>
`;

const { db } = await import('../js/db.js');
const H = await import('../js/correntes-hierarquia.js');
const E = await import('../js/estatisticas.js');
const { filtrarTextos } = await import('../js/utils.js');
const { decorarCamposBusca, renderPoemas, ordenarPor } = await import('../js/render-listas.js');
const { toggleColuna, resetarColunas, DEFINICAO_COLUNAS } = await import('../js/colunas.js');
const {
    adicionarMovimentoEscolaDireto,
    adicionarDivisaoCorrenteDireta,
    removerMovimentoEscolaDireto,
    carregarMovimentosEscolasDiretos,
    obterMovimentosEscolasDiretos,
    resetMovimentosEscolasDiretos,
    atualizarDatalistMovimentosEscolas,
} = await import('../js/editor.js');
const { gerarMarkdownExportacao } = await import('../js/exportar-md.js');
const { renderVisualizacaoHtml } = await import('../js/visualizar.js');
const { montarRegistro } = await import('../js/exportar.js');
const { gerarCsvTextos } = await import('../js/exportar-csv.js');
await import('../js/main.js');
const { resumoDosTextosPorCorrente } = await import('../js/estatisticas-tela-correntes.js');

const $ = (id) => document.getElementById(id);
const chips = (id) =>
    [...$(id).querySelectorAll('span')].map((e) => e.firstChild.textContent.trim());
const titulos = (id) => [...$(id).querySelectorAll('span')].map((e) => e.getAttribute('title'));

// Romantismo
//   └ Romantismo no Brasil
//       └ 3ª geração
//   └ Romantismo em Portugal
// Concretismo
// Parnasianismo
//   └ 3ª geração (outro pai, mesmo nome de fase: o tooltip desambigua)
function cadastro() {
    return [
        { id: 1, nome: 'Romantismo', paiId: null },
        { id: 2, nome: 'Romantismo no Brasil', paiId: 1, divisao: 'Variante regional' },
        { id: 3, nome: 'Condoreirismo', paiId: 2, divisao: 'Fase ou geração' },
        { id: 4, nome: 'Romantismo em Portugal', paiId: 1, divisao: 'Variante regional' },
        { id: 5, nome: 'Concretismo', paiId: null },
        { id: 6, nome: 'Parnasianismo', paiId: null },
        { id: 7, nome: 'Vertente poética', paiId: 6, divisao: 'Vertente' },
    ];
}

function zerar() {
    localStorage.clear();
    ['livros', 'partes', 'secoes', 'elementos', 'pessoas', 'grupos', 'autores', 'epocas'].forEach(
        (c) => (db[c] = []),
    );
    db.periodosHistoricos = [];
    db.movimentosEscolas = cadastro();
    db.poemas = [];
    db.prosas = [];
    ['poemas', 'prosas', 'autores'].forEach((t) => resetMovimentosEscolasDiretos(t));
    $('p-movimento-escola-input').value = '';
    $('p-divisao-corrente-input').value = '';
    resetarColunas('poemas');
}

const poema = (id, ids) => ({ id, titulo: `P${id}`, movimentosEscolasIds: ids });

describe('lógica pura: separar topo e divisões', () => {
    beforeEach(zerar);

    it('ehDivisaoDaCorrente é derivado do pai que existe no cadastro', () => {
        const l = db.movimentosEscolas;
        assert.equal(H.ehDivisaoDaCorrente(l, 1), false);
        assert.equal(H.ehDivisaoDaCorrente(l, 2), true);
        assert.equal(H.ehDivisaoDaCorrente(l, 3), true);
        assert.equal(H.ehDivisaoDaCorrente(l, 999), false);
    });

    it('registro antigo sem `paiId` (backup anterior à hierarquia) conta como corrente de topo', () => {
        const antigo = [{ id: 1, nome: 'Barroco' }];
        assert.equal(H.ehDivisaoDaCorrente(antigo, 1), false);
        assert.deepEqual(H.idsDeCorrentesDeTopo(antigo, [1]), [1]);
        assert.deepEqual(H.idsDeDivisoes(antigo, [1]), []);
    });

    it('paiId que aponta para registro inexistente não torna ninguém divisão', () => {
        const l = [{ id: 1, nome: 'Órfã', paiId: 42 }];
        assert.equal(H.ehDivisaoDaCorrente(l, 1), false);
    });

    it('idsDeCorrentesDeTopo e idsDeDivisoes mantêm a ordem, tiram repetidos e ids que não existem mais', () => {
        const ids = [3, 1, 3, 999, 5, 2];
        assert.deepEqual(H.idsDeCorrentesDeTopo(db.movimentosEscolas, ids), [1, 5]);
        assert.deepEqual(H.idsDeDivisoes(db.movimentosEscolas, ids), [3, 2]);
        assert.deepEqual(H.idsDeDivisoes(db.movimentosEscolas, null), []);
    });

    it('sugestoesDeCorrentes separa por `somente` e sem ele devolve todas', () => {
        const nomes = (somente) =>
            H.sugestoesDeCorrentes(db.movimentosEscolas, 'poemas', null, somente).map(
                (o) => o.nome,
            );
        assert.deepEqual(nomes('topo'), ['Concretismo', 'Parnasianismo', 'Romantismo']);
        assert.deepEqual(nomes('divisoes'), [
            'Condoreirismo',
            'Romantismo em Portugal',
            'Romantismo no Brasil',
            'Vertente poética',
        ]);
        assert.equal(nomes(null).length, 7);
        const rotulos = H.sugestoesDeCorrentes(db.movimentosEscolas, 'poemas', null, 'divisoes');
        assert.equal(
            rotulos.find((o) => o.nome === 'Condoreirismo').rotulo,
            'Romantismo › Romantismo no Brasil',
        );
    });
});

describe('modal de Poema e Prosa: dois campos, uma lista só', () => {
    beforeEach(zerar);

    it('os chips se repartem pelo pai e o nome vai no chip, com o caminho completo na dica', () => {
        carregarMovimentosEscolasDiretos('poemas', [1, 3, 5, 7]);
        assert.deepEqual(chips('p-movimentos-escolas-container'), ['Romantismo', 'Concretismo']);
        assert.deepEqual(chips('p-divisoes-correntes-container'), [
            'Condoreirismo',
            'Vertente poética',
        ]);
        assert.deepEqual(titulos('p-divisoes-correntes-container'), [
            'Romantismo › Romantismo no Brasil › Condoreirismo',
            'Parnasianismo › Vertente poética',
        ]);
    });

    it('o que é gravado continua uma lista só, na ordem em que foi escolhido', () => {
        carregarMovimentosEscolasDiretos('poemas', [3, 1]);
        $('p-divisao-corrente-input').value = 'Vertente poética';
        adicionarDivisaoCorrenteDireta('poemas');
        $('p-movimento-escola-input').value = 'Concretismo';
        adicionarMovimentoEscolaDireto('poemas');
        assert.deepEqual(obterMovimentosEscolasDiretos('poemas'), [3, 1, 7, 5]);
        assert.deepEqual(chips('p-divisoes-correntes-container'), [
            'Condoreirismo',
            'Vertente poética',
        ]);
    });

    it('não repete o que já está na lista', () => {
        carregarMovimentosEscolasDiretos('poemas', [2]);
        adicionarDivisaoCorrenteDireta('poemas', 'Romantismo no Brasil');
        assert.deepEqual(obterMovimentosEscolasDiretos('poemas'), [2]);
    });

    it('nome que existe entra por qualquer dos dois campos e aparece no campo a que pertence', () => {
        adicionarDivisaoCorrenteDireta('poemas', 'Romantismo');
        assert.deepEqual(chips('p-movimentos-escolas-container'), ['Romantismo']);
        assert.deepEqual(chips('p-divisoes-correntes-container'), []);
        adicionarMovimentoEscolaDireto('poemas', 'Condoreirismo');
        assert.deepEqual(chips('p-divisoes-correntes-container'), ['Condoreirismo']);
    });

    it('nome novo digitado em Divisões não cria nada (divisão precisa de pai) e avisa', () => {
        const antes = db.movimentosEscolas.length;
        $('p-divisao-corrente-input').value = 'Divisão Que Não Existe';
        adicionarDivisaoCorrenteDireta('poemas');
        assert.equal(db.movimentosEscolas.length, antes);
        assert.deepEqual(obterMovimentosEscolasDiretos('poemas'), []);
        assert.equal($('p-divisao-corrente-input').value, '');
        assert.match(document.body.textContent, /precisa de uma corrente pai/);
    });

    it('o × de um chip de divisão tira só aquele', () => {
        carregarMovimentosEscolasDiretos('poemas', [1, 2, 3]);
        removerMovimentoEscolaDireto('poemas', '2');
        assert.deepEqual(obterMovimentosEscolasDiretos('poemas'), [1, 3]);
        assert.deepEqual(chips('p-divisoes-correntes-container'), ['Condoreirismo']);
    });

    it('id removido do cadastro aparece como corrente removida, no campo de Correntes', () => {
        carregarMovimentosEscolasDiretos('poemas', [999]);
        assert.deepEqual(chips('p-movimentos-escolas-container'), [
            '(corrente literária removida)',
        ]);
        assert.deepEqual(chips('p-divisoes-correntes-container'), []);
    });

    it('a Prosa tem os mesmos dois campos', () => {
        carregarMovimentosEscolasDiretos('prosas', [1, 4]);
        assert.deepEqual(chips('pr-movimentos-escolas-container'), ['Romantismo']);
        assert.deepEqual(chips('pr-divisoes-correntes-container'), ['Romantismo em Portugal']);
    });

    it('o modal de Autor segue com um campo só, com o caminho no chip', () => {
        carregarMovimentosEscolasDiretos('autores', [1, 3]);
        assert.deepEqual(chips('au-movimentos-escolas-container'), [
            'Romantismo',
            'Condoreirismo (Romantismo › Romantismo no Brasil)',
        ]);
    });

    it('as sugestões: Correntes só com as de topo, Divisões só com as que têm pai, Autor com todas', () => {
        atualizarDatalistMovimentosEscolas();
        const valores = (id) => [...$(id).querySelectorAll('option')].map((o) => o.value);
        assert.deepEqual(valores('sugestoes-movimentos-escolas').sort(), [
            'Concretismo',
            'Parnasianismo',
            'Romantismo',
        ]);
        assert.equal(valores('sugestoes-divisoes-correntes').length, 4);
        assert.ok(valores('sugestoes-divisoes-correntes').includes('Condoreirismo'));
        assert.equal(valores('sugestoes-movimentos-escolas-prosa').length, 3);
        assert.equal(valores('sugestoes-divisoes-correntes-prosa').length, 4);
        assert.equal(valores('sugestoes-movimentos-escolas-autor').length, 7);
    });
});

describe('colunas Corrente literária e Divisões de corrente', () => {
    beforeEach(zerar);

    it('a coluna nova vem logo depois da Corrente literária, desligada, em Poemas e Prosas', () => {
        for (const tabela of ['poemas', 'prosas']) {
            const chaves = DEFINICAO_COLUNAS[tabela].map((c) => c.key);
            const i = chaves.indexOf('movimentosEscolas');
            assert.equal(chaves[i + 1], 'divisoesCorrentes', tabela);
            const col = DEFINICAO_COLUNAS[tabela].find((c) => c.key === 'divisoesCorrentes');
            assert.equal(col.default, false);
            assert.equal(col.label, 'Divisões de corrente');
        }
    });

    function celula(rotulo, linha = 0) {
        const cabecalhos = Array.from(document.querySelectorAll('#cabecalho-poemas th'));
        const i = cabecalhos.findIndex((th) => th.textContent.includes(rotulo));
        assert.ok(i >= 0, `coluna "${rotulo}" deveria estar no cabeçalho`);
        return document.querySelectorAll('#lista-poemas tr')[linha].querySelectorAll('td')[i];
    }

    it('Corrente literária mostra só as de topo e Divisões só as divisões, com o caminho na dica', () => {
        db.poemas = [poema(1, [1, 3, 7]), poema(2, [5]), poema(3, [2]), poema(4, [])];
        toggleColuna('poemas', 'movimentosEscolas', true);
        toggleColuna('poemas', 'divisoesCorrentes', true);
        renderPoemas();
        const selos = (td) => [...td.querySelectorAll('span')].map((s) => s.textContent.trim());
        assert.deepEqual(selos(celula('Corrente literária', 0)), ['Romantismo']);
        assert.deepEqual(selos(celula('Divisões de corrente', 0)), [
            'Condoreirismo',
            'Vertente poética',
        ]);
        const dicas = [...celula('Divisões de corrente', 0).querySelectorAll('span')].map((s) =>
            s.getAttribute('title'),
        );
        assert.deepEqual(dicas, [
            'Romantismo › Romantismo no Brasil › Condoreirismo',
            'Parnasianismo › Vertente poética',
        ]);
        // só topo: Divisões vazia
        assert.deepEqual(selos(celula('Corrente literária', 1)), ['Concretismo']);
        assert.equal(celula('Divisões de corrente', 1).textContent.trim(), '—');
        // só divisão (o pai não está marcado): Corrente vazia, Divisões com o nome
        assert.equal(celula('Corrente literária', 2).textContent.trim(), '—');
        assert.deepEqual(selos(celula('Divisões de corrente', 2)), ['Romantismo no Brasil']);
        assert.equal(celula('Divisões de corrente', 3).textContent.trim(), '—');
    });

    it('ordenam pelo texto mostrado (vazio por último em asc)', () => {
        db.poemas = [poema(1, [7]), poema(2, []), poema(3, [2])];
        toggleColuna('poemas', 'divisoesCorrentes', true);
        renderPoemas();
        ordenarPor('poemas', 'divisoesCorrentes');
        const ordem = [...document.querySelectorAll('#lista-poemas tr')].map(
            (tr) => tr.textContent.match(/P\d/)?.[0],
        );
        // "Romantismo › Romantismo no Brasil" antes de "Parnasianismo › ..."? não:
        // comparação alfabética, Parnasianismo vem antes de Romantismo.
        assert.deepEqual(ordem, ['P1', 'P3', 'P2']);
    });
});

describe('busca: continua igual (F14-D8)', () => {
    beforeEach(zerar);

    it('movimento:Romantismo acha também o texto ligado só a uma divisão; a divisão acha só aquela', () => {
        db.poemas = [poema(1, [3]), poema(2, [4]), poema(3, [1]), poema(4, [5])];
        const lista = db.poemas.map((p) => decorarCamposBusca({ ...p }, 'poemas'));
        const ids = (q) => filtrarTextos(lista, q).map((i) => i.id);
        assert.deepEqual(ids('movimento:Romantismo'), [1, 2, 3]);
        assert.deepEqual(ids('movimento:"Romantismo em Portugal"'), [2]);
        assert.deepEqual(ids('movimento:Condoreirismo'), [1]);
        assert.deepEqual(ids('movimentodireto:Condoreirismo'), [1]);
        // A busca é por trecho do nome: "Romantismo" também está em "Romantismo em Portugal".
        // É o limite que a tela de Estatísticas avisa (ver `consultaDaCorrente`).
        assert.deepEqual(ids('movimentodireto:Romantismo'), [2, 3]);
    });
});

describe('.md, Visualização, .csv e .json', () => {
    beforeEach(zerar);

    const item = () => ({ id: 1, titulo: 'Olhos', texto: 'x', movimentosEscolasIds: [1, 3, 7] });

    it('o .md separa Corrente literária e Divisões, com o caminho completo', () => {
        const md = gerarMarkdownExportacao([item()]);
        assert.match(md, /\*\*Corrente literária:\*\* Romantismo\n/);
        assert.match(
            md,
            /\*\*Divisões:\*\* Romantismo › Romantismo no Brasil › Condoreirismo; Parnasianismo › Vertente poética/,
        );
    });

    it('o .md não cria a linha que não tem conteúdo', () => {
        const soTopo = gerarMarkdownExportacao([{ ...item(), movimentosEscolasIds: [5] }]);
        assert.match(soTopo, /Corrente literária:\*\* Concretismo/);
        assert.doesNotMatch(soTopo, /Divisões/);
        const soDivisao = gerarMarkdownExportacao([{ ...item(), movimentosEscolasIds: [2] }]);
        assert.doesNotMatch(soDivisao, /Corrente literária/);
        assert.match(soDivisao, /Divisões:\*\* Romantismo › Romantismo no Brasil/);
    });

    it('a Visualização mostra as mesmas duas linhas', () => {
        const html = renderVisualizacaoHtml(item());
        assert.match(html, /Corrente literária:/);
        assert.match(html, /Divisões:/);
        assert.match(html, /Condoreirismo/);
        const so = renderVisualizacaoHtml({ ...item(), movimentosEscolasIds: [5] });
        assert.doesNotMatch(so, /Divisões/);
    });

    function linhaCsv(it) {
        const csv = gerarCsvTextos('poema', [montarRegistro('poema', it)], db);
        const [cab, ...resto] = csv
            .replace(/^\uFEFF/, '')
            .trim()
            .split(/\r?\n/);
        const cols = cab.split(',');
        const vals = resto[0].split(',');
        return Object.fromEntries(cols.map((c, i) => [c, vals[i]]));
    }

    it('o .csv mantém as colunas antigas completas e acrescenta as das divisões', () => {
        const l = linhaCsv(item());
        assert.equal(l.movimentos_escolas, 'Romantismo | Condoreirismo | Vertente poética');
        assert.match(
            l.movimentos_escolas_caminho,
            /Romantismo \| Romantismo › Romantismo no Brasil › Condoreirismo/,
        );
        assert.equal(l.divisoes_corrente, 'Condoreirismo | Vertente poética');
        assert.equal(
            l.divisoes_corrente_caminho,
            'Romantismo › Romantismo no Brasil › Condoreirismo | Parnasianismo › Vertente poética',
        );
    });

    it('o .csv deixa as colunas das divisões vazias quando só há correntes de topo', () => {
        const l = linhaCsv({ ...item(), movimentosEscolasIds: [5] });
        assert.equal(l.divisoes_corrente, '');
        assert.equal(l.divisoes_corrente_caminho, '');
    });

    it('o .json não muda de formato: lista única, cada uma com o caminho (backup antigo importa igual)', () => {
        const r = montarRegistro('poema', item());
        assert.deepEqual(
            r.movimentosEscolasResolvidos.map((m) => m.nome),
            ['Romantismo', 'Condoreirismo', 'Vertente poética'],
        );
        assert.equal(
            r.movimentosEscolasResolvidos[1].caminho,
            'Romantismo › Romantismo no Brasil › Condoreirismo',
        );
        assert.equal('divisoesResolvidas' in r, false);
    });
});

// ─── Estatísticas ───────────────────────────────────────────────────────────
// Nomes sem relação de "contido em" para a busca de cada barra bater com a
// contagem (ver a nota em `consultaDaCorrente`): usa só o cadastro de cima
// com os textos abaixo.
function acervoEstatisticas() {
    zerar();
    db.poemas = [
        poema(1, [3]), // Condoreirismo (neto de Romantismo, pai direto não marcado)
        poema(2, [2]), // Romantismo no Brasil
        poema(3, [1]), // Romantismo
        poema(4, [1, 2, 3]), // Romantismo + duas divisões: um só no grupo
        poema(5, [5]), // Concretismo
        poema(6, []), // sem corrente
        poema(7, [4, 7]), // Portugal (Romantismo) + Vertente (Parnasianismo): dois grupos
    ];
    db.prosas = [poema(101, [999])]; // id órfão: sem corrente
}
const mapa = (r) => Object.fromEntries(r.labels.map((l, i) => [l, r.data[i]]));

describe('Estatísticas: textos por corrente, Agrupado e Separado', () => {
    beforeEach(acervoEstatisticas);

    it('Agrupado: o pai soma o que foi marcado nele e em todas as divisões, cada texto uma vez por grupo', () => {
        const r = E.agregarTextosPorCorrente('agrupado');
        assert.deepEqual(mapa(r), {
            Romantismo: 5, // 1, 2, 3, 4 e 7 (o 4 conta uma vez, apesar de três marcas)
            Concretismo: 1,
            Parnasianismo: 1, // 7, pela Vertente poética
        });
        assert.equal(r.semCorrente, 2); // 6 e 101 (id órfão)
        assert.equal(r.comCorrente, 6);
        assert.equal(r.textos, 8);
    });

    it('Agrupado: divisão cujo pai não está marcado no texto conta no pai', () => {
        const r = E.agregarTextosPorCorrente('agrupado', [db.poemas[0]]);
        assert.deepEqual(mapa(r), { Romantismo: 1 });
    });

    it('Separado: uma barra por corrente, cada uma só com o marcado nela', () => {
        const r = E.agregarTextosPorCorrente('separado');
        assert.deepEqual(mapa(r), {
            Romantismo: 2, // 3 e 4
            'Romantismo no Brasil': 2, // 2 e 4
            Condoreirismo: 2, // 1 e 4
            'Romantismo em Portugal': 1,
            Concretismo: 1,
            'Vertente poética': 1,
        });
    });

    it('Separado: o que não tem texto não aparece, e as barras vêm da maior para a menor', () => {
        const r = E.agregarTextosPorCorrente('separado');
        assert.ok(!r.labels.includes('Parnasianismo'));
        const ordenado = [...r.data].sort((a, b) => b - a);
        assert.deepEqual(r.data, ordenado);
    });

    it('Separado: o caminho completo vai na dica das divisões, não das correntes de topo', () => {
        const r = E.agregarTextosPorCorrente('separado');
        assert.equal(
            r.titulos.get('Condoreirismo'),
            'Romantismo › Romantismo no Brasil › Condoreirismo',
        );
        assert.equal(r.titulos.has('Concretismo'), false);
        assert.equal(E.agregarTextosPorCorrente('agrupado').titulos.size, 0);
    });

    it('o padrão é Agrupado', () => {
        assert.deepEqual(E.agregarTextosPorCorrente(), E.agregarTextosPorCorrente('agrupado'));
    });

    it('cada barra Agrupado e Separado bate com a lista que o clique abre (nomes sem sobreposição)', () => {
        // Troca o nome de quem é substring de outro, para a busca por trecho ser exata.
        db.movimentosEscolas.find((m) => m.id === 2).nome = 'Fase brasileira';
        db.movimentosEscolas.find((m) => m.id === 4).nome = 'Fase portuguesa';
        const lista = [...db.poemas, ...db.prosas].map((i) =>
            decorarCamposBusca({ ...i }, 'poemas'),
        );
        for (const modo of ['agrupado', 'separado']) {
            const r = E.agregarTextosPorCorrente(modo);
            r.labels.forEach((l, i) => {
                assert.equal(
                    filtrarTextos(lista, r.consultas[i]).length,
                    r.data[i],
                    `${modo}: ${l} (${r.consultas[i]})`,
                );
            });
        }
    });

    it('a consulta usa movimento: (hierárquica) no Agrupado e movimentodireto: no Separado', () => {
        assert.equal(E.consultaDaCorrente('agrupado', 'Romantismo'), 'movimento:"Romantismo"');
        assert.equal(
            E.consultaDaCorrente('separado', 'Romantismo'),
            'movimentodireto:"Romantismo"',
        );
        assert.equal(E.consultaDaCorrente('agrupado', 'A "b"'), 'movimento:"A \\"b\\""');
    });

    it('o resumo diz o modo, o que fica fora e por que a soma passa do total', () => {
        const agrupado = resumoDosTextosPorCorrente(E.agregarTextosPorCorrente('agrupado'));
        assert.match(agrupado, /Agrupado/);
        assert.match(agrupado, /6 textos têm corrente literária, de 8 textos neste recorte/);
        assert.match(agrupado, /2 sem corrente literária ligada/);
        assert.match(agrupado, /A soma das barras \(7\) passa do total/);
        const separado = resumoDosTextosPorCorrente(E.agregarTextosPorCorrente('separado'));
        assert.match(separado, /Separado/);
        assert.equal(
            resumoDosTextosPorCorrente(E.agregarTextosPorCorrente('agrupado', [])),
            'Nenhum texto neste recorte.',
        );
    });

    it('o modo é lembrado e só aceita os dois valores', () => {
        assert.equal(E.getModoGraficoCorrentes(), 'agrupado');
        E.definirModoGraficoCorrentes('separado');
        assert.equal(E.getModoGraficoCorrentes(), 'separado');
        E.definirModoGraficoCorrentes('qualquer');
        assert.equal(E.getModoGraficoCorrentes(), 'agrupado');
    });

    it('um recorte vazio não quebra', () => {
        const r = E.agregarTextosPorCorrente('agrupado', []);
        assert.deepEqual(r.labels, []);
        assert.equal(r.textos, 0);
    });
});
