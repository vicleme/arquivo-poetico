import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// "Faz parte de" entre Períodos Biográficos: modal (pais em chips, regras de
// autor e de intervalo ao salvar), aba em árvore (recuo, recolher, contexto,
// datas derivadas, seleção), exclusão, mesclagem, migração, backup e Ver.
const html = readFileSync(new URL('../modais/modal-epoca.html', import.meta.url), 'utf8');
document.body.innerHTML = `
    <div id="modais-container">${html}</div>
    <div id="filtros-periodo-epocas"></div>
    <input type="checkbox" id="toggle-todos-epocas" />
    <div id="lista-epocas"></div>
`;

const D = await import('../js/db.js');
const { db, deleteItem, mesclarEpocas, importarDB, migrarHierarquiaPeriodosBiograficos } = D;
const { initFormEpoca, editarEpoca, validarHierarquiaDaEpoca } = await import('../js/forms.js');
const { preencherCamposPeriodoBiografico } = await import('../js/periodo-biografico-ui.js');
const R = await import('../js/render-listas.js');
const { selecaoEpocas } = await import('../js/epocas-acoes.js');
const { definirExibirOcultasDosPeriodos } = await import('../js/ocultas-periodos.js');
const { renderVisualizacaoPeriodoBiograficoHtml } =
    await import('../js/visualizar-periodo-biografico.js');

const el = (id) => document.getElementById(id);
const por = (id) => db.epocas.find((e) => e.id === id);
const textoDe = (h) => {
    const d = document.createElement('div');
    d.innerHTML = h;
    return d.textContent.replace(/\s+/g, ' ').trim();
};
const enviar = () =>
    el('form-epoca').dispatchEvent(new window.Event('submit', { cancelable: true, bubbles: true }));
const escolherPai = (id) => {
    el('ep-pais-select').value = String(id);
    el('ep-pais-select').onchange();
};
const chips = () => [...document.querySelectorAll('#ep-pais-chips span')];
const opcoesDePai = () =>
    [...document.querySelectorAll('#ep-pais-select option:not([disabled])')]
        .map((o) => o.getAttribute('value'))
        .filter(Boolean);
const cartoes = () => [...document.querySelectorAll('#lista-epocas [style*="margin-left"]')];
const cartaoDe = (nome) => cartoes().find((c) => c.querySelector('h4')?.textContent.includes(nome));

const base = (extra) => ({
    notas: '',
    esferas: [],
    categorias: [],
    pessoasEnvolvidas: [],
    relacoes: [],
    oculto: false,
    ...extra,
});

// Ensino médio (Ana, 2005 a 2008) > Pré-vestibular (2008 a 2009);
// Relação com X (sem datas) > Fase 1 (2011 a 2012) e Fase 2 (2013, em aberto);
// Outra fase de Bia (outro autor).
function montarBanco() {
    db.autores = [
        { id: 1, nome: 'Ana' },
        { id: 2, nome: 'Bia' },
    ];
    db.pessoas = [];
    db.poemas = [];
    db.prosas = [];
    db.opcoesPeriodoBiografico = { esferas: [], vinculos: [], naturezas: [] };
    db.epocas = [
        base({
            id: 1,
            nome: 'Ensino médio',
            autorId: 1,
            inicio: { ano: 2005 },
            fim: { ano: 2008 },
            pertenceA: [],
        }),
        base({
            id: 2,
            nome: 'Pré-vestibular',
            autorId: 1,
            inicio: { ano: 2008 },
            fim: { ano: 2009 },
            pertenceA: [1],
        }),
        base({
            id: 3,
            nome: 'Fase de Bia',
            autorId: 2,
            inicio: { ano: 2005 },
            fim: { ano: 2008 },
            pertenceA: [],
        }),
        base({ id: 4, nome: 'Relação com X', autorId: 1, inicio: null, fim: null, pertenceA: [] }),
        base({
            id: 5,
            nome: 'Fase 1',
            autorId: 1,
            inicio: { ano: 2011 },
            fim: { ano: 2012 },
            pertenceA: [4],
        }),
        base({
            id: 6,
            nome: 'Fase 2',
            autorId: 1,
            inicio: { ano: 2013 },
            fim: null,
            pertenceA: [4],
        }),
    ];
    el('ep-autor').innerHTML = '<option value="1">Ana</option><option value="2">Bia</option>';
    el('ep-autor').value = '1';
    el('ep-edit-id').value = '';
    el('ep-nome').value = '';
    ['ini', 'fim'].forEach((l) =>
        ['dia', 'mes', 'ano'].forEach((p) => {
            el(`ep-${l}-${p}`).value = '';
        }),
    );
    el('avisos-toast')?.replaceChildren();
    definirExibirOcultasDosPeriodos(false);
    selecaoEpocas.clear();
    R.expandirTodasEpocas();
}

describe('modal: Faz parte de', () => {
    beforeEach(() => {
        montarBanco();
        initFormEpoca();
    });

    it('mostra os pais em chips (o primeiro é o principal) e só oferece quem pode ser pai', async () => {
        await editarEpoca(2);
        assert.equal(chips().length, 1);
        assert.match(chips()[0].textContent, /Ensino médio · principal/);
        // Sem ele mesmo (2), sem quem já é pai (1) e sem outro autor (3).
        assert.deepEqual(opcoesDePai().sort(), ['4', '5', '6']);
    });

    it('não oferece os períodos de dentro (nem ele mesmo) como pai', async () => {
        await editarEpoca(1);
        assert.deepEqual(opcoesDePai().sort(), ['4', '5', '6']);
    });

    it('salva um período novo dentro de outro, com datas que se sobrepõem', () => {
        preencherCamposPeriodoBiografico(null);
        el('ep-nome').value = 'Cursinho';
        el('ep-ini-ano').value = '2007';
        el('ep-fim-ano').value = '2010';
        escolherPai(1);
        enviar();
        const novo = db.epocas.find((e) => e.nome === 'Cursinho');
        assert.deepEqual(novo.pertenceA, [1]);
    });

    it('dois pais: adicionar, tornar principal e remover', async () => {
        await editarEpoca(5);
        escolherPai(1);
        assert.equal(chips().length, 2);
        chips()[1].querySelector('button').click(); // tornar principal
        assert.match(chips()[0].textContent, /Ensino médio · principal/);
        chips()[0].querySelectorAll('button')[1].click(); // remover
        assert.equal(chips().length, 1);
        assert.match(chips()[0].textContent, /Relação com X · principal/);
    });

    it('bloqueia o filho que começa depois do fim do pai', () => {
        preencherCamposPeriodoBiografico(null);
        el('ep-nome').value = 'Tarde demais';
        el('ep-ini-ano').value = '2010';
        el('ep-fim-ano').value = '2011';
        escolherPai(1);
        enviar();
        assert.equal(
            db.epocas.find((e) => e.nome === 'Tarde demais'),
            undefined,
        );
        assert.match(document.body.textContent, /começa depois do fim de "Ensino médio"/);
    });

    it('bloqueia o filho que termina antes do começo do pai', () => {
        preencherCamposPeriodoBiografico(null);
        el('ep-nome').value = 'Cedo demais';
        el('ep-ini-ano').value = '2000';
        el('ep-fim-ano').value = '2004';
        escolherPai(1);
        enviar();
        assert.equal(
            db.epocas.find((e) => e.nome === 'Cedo demais'),
            undefined,
        );
        assert.match(document.body.textContent, /termina antes do começo de "Ensino médio"/);
    });

    it('pai sem datas aceita qualquer filho', () => {
        preencherCamposPeriodoBiografico(null);
        el('ep-nome').value = 'Fase 3';
        el('ep-ini-ano').value = '1990';
        escolherPai(4);
        enviar();
        assert.deepEqual(db.epocas.find((e) => e.nome === 'Fase 3').pertenceA, [4]);
    });

    it('validarHierarquiaDaEpoca acusa pai de outro autor e ciclo', () => {
        const dados = { id: null, nome: 'X', autorId: 1, inicio: null, fim: null, pertenceA: [3] };
        assert.match(validarHierarquiaDaEpoca(dados), /"Fase de Bia".*é de outro autor/);
        const ciclo = {
            id: 1,
            nome: 'Ensino médio',
            autorId: 1,
            inicio: null,
            fim: null,
            pertenceA: [2],
        };
        assert.match(validarHierarquiaDaEpoca(ciclo), /não pode fazer parte de si mesmo/);
    });

    it('editar as datas do pai bloqueia se um filho deixaria de caber, e diz qual', async () => {
        await editarEpoca(1);
        el('ep-fim-ano').value = '2006'; // Pré-vestibular começa em 2008
        enviar();
        assert.deepEqual(por(1).fim, { ano: 2008 });
        assert.match(document.body.textContent, /"Pré-vestibular".*começaria depois do fim/);
    });

    it('editar o pai de modo que os filhos ainda caibam salva', async () => {
        await editarEpoca(1);
        el('ep-fim-ano').value = '2010';
        enviar();
        assert.deepEqual(por(1).fim, { ano: 2010 });
        assert.deepEqual(por(2).pertenceA, [1]);
    });

    it('trocar o autor tira do campo os pais de outro autor, com aviso', async () => {
        await editarEpoca(2);
        el('ep-autor').value = '2';
        el('ep-autor').onchange();
        assert.equal(chips().length, 0);
        assert.match(document.body.textContent, /"Ensino médio" saiu de "Faz parte de"/);
        assert.deepEqual(opcoesDePai(), ['3']);
    });

    it('trocar o autor de um pai com filhos bloqueia ao salvar', async () => {
        await editarEpoca(1);
        el('ep-autor').value = '2';
        el('ep-autor').onchange();
        enviar();
        assert.equal(por(1).autorId, 1);
        assert.match(document.body.textContent, /"Pré-vestibular".*é de outro autor/);
    });

    it('pai oculto não aparece no modal, mas é regravado sem mudança', async () => {
        por(1).oculto = true;
        await editarEpoca(2);
        assert.equal(chips().length, 0);
        assert.ok(!opcoesDePai().includes('1'));
        enviar();
        assert.deepEqual(por(2).pertenceA, [1]);
    });
});

describe('aba: árvore dentro de cada autor', () => {
    beforeEach(() => {
        montarBanco();
    });

    it('filho fica recuado e traz a marca de estar dentro de outro', () => {
        R.renderEpocas();
        assert.equal(cartaoDe('Ensino médio').style.marginLeft, '0rem');
        assert.equal(cartaoDe('Pré-vestibular').style.marginLeft, '1.5rem');
        assert.equal(cartaoDe('Pré-vestibular').dataset.dentroDeOutro, 'true');
    });

    it('a ordem é a da árvore: pai, filhos, depois o próximo de topo', () => {
        R.renderEpocas();
        const nomes = cartoes().map((c) => c.querySelector('h4').textContent);
        assert.deepEqual(nomes, [
            'Ensino médio',
            'Pré-vestibular',
            'Relação com X',
            'Fase 1',
            'Fase 2',
            'Fase de Bia',
        ]);
    });

    it('os filhos ficam sob o autor certo (um cabeçalho por autor)', () => {
        R.renderEpocas();
        const cabecalhos = [...document.querySelectorAll('#lista-epocas h3')].map((h) =>
            h.textContent.trim(),
        );
        assert.deepEqual(cabecalhos, ['Ana', 'Bia']);
    });

    it('recolher esconde os de dentro e diz quantos; expandir devolve', () => {
        R.renderEpocas();
        R.alternarRamoEpoca(4);
        assert.equal(cartaoDe('Fase 1'), undefined);
        assert.equal(cartaoDe('Fase 2'), undefined);
        assert.match(cartaoDe('Relação com X').textContent, /2 escondidos no ramo/);
        const botao = cartaoDe('Relação com X').querySelector(
            '[data-action="alternar-ramo-epoca"]',
        );
        assert.equal(botao.getAttribute('aria-expanded'), 'false');
        R.alternarRamoEpoca(4);
        assert.ok(cartaoDe('Fase 1'));
    });

    it('Recolher tudo e Expandir tudo', () => {
        R.recolherTodasEpocas();
        const nomes = cartoes().map((c) => c.querySelector('h4').textContent);
        assert.deepEqual(nomes, ['Ensino médio', 'Relação com X', 'Fase de Bia']);
        R.expandirTodasEpocas();
        assert.equal(cartoes().length, 6);
    });

    it('só tem botão de recolher quem tem período dentro', () => {
        R.renderEpocas();
        assert.ok(cartaoDe('Ensino médio').querySelector('[data-action="alternar-ramo-epoca"]'));
        assert.equal(
            cartaoDe('Pré-vestibular').querySelector('[data-action="alternar-ramo-epoca"]'),
            null,
        );
    });

    it('pai sem datas mostra, só na tela, o que os de dentro cobrem', () => {
        R.renderEpocas();
        assert.match(
            cartaoDe('Relação com X').textContent,
            /dos períodos de dentro: A partir de 2011/,
        );
        assert.equal(por(4).inicio, null);
        assert.doesNotMatch(cartaoDe('Ensino médio').textContent, /dos períodos de dentro/);
    });

    it('o cartão do filho não repete o caminho; o do pai diz quantos há dentro', () => {
        R.renderEpocas();
        assert.match(cartaoDe('Ensino médio').textContent, /1 período dentro/);
        assert.doesNotMatch(cartaoDe('Pré-vestibular').textContent, /dentro de Ensino médio/);
    });

    it('filtro ativo ignora o recolhimento e mostra o pai apagado como contexto', () => {
        R.renderEpocas();
        R.alternarRamoEpoca(1);
        assert.equal(cartaoDe('Pré-vestibular'), undefined);
        el('fp-epocas-nome').value = 'Pré';
        R.setFiltroPeriodo('epocas');
        assert.ok(cartaoDe('Pré-vestibular'));
        const pai = cartaoDe('Ensino médio');
        assert.equal(pai.dataset.contexto, 'true');
        assert.match(pai.textContent, /só como contexto/);
        // Pai de contexto não tem caixa de seleção.
        assert.equal(pai.querySelector('[data-action="toggle-epoca"]'), null);
        el('fp-epocas-nome').value = '';
        R.setFiltroPeriodo('epocas');
    });

    it('pai oculto some por inteiro: o filho vira de topo e o nome do pai não aparece', () => {
        por(1).oculto = true;
        R.renderEpocas();
        assert.equal(cartaoDe('Pré-vestibular').style.marginLeft, '0rem');
        assert.doesNotMatch(document.getElementById('lista-epocas').textContent, /Ensino médio/);
        // Com "Exibir ocultas" a árvore volta.
        definirExibirOcultasDosPeriodos(true);
        R.renderEpocas();
        assert.equal(cartaoDe('Pré-vestibular').style.marginLeft, '1.5rem');
    });

    it('cada filho aparece sob o pai principal; os outros pais entram em "também em"', () => {
        por(5).pertenceA = [4, 1];
        R.renderEpocas();
        assert.equal(cartaoDe('Fase 1').style.marginLeft, '1.5rem');
        assert.match(cartaoDe('Fase 1').textContent, /também em Ensino médio/);
    });
});

describe('aba: seleção em massa com a árvore', () => {
    beforeEach(() => {
        montarBanco();
    });

    it('a lista visível segue a ordem da tela e pula o que está recolhido', () => {
        assert.deepEqual(
            R.getListaVisivelEpocas().map((e) => e.id),
            [1, 2, 4, 5, 6, 3],
        );
        R.alternarRamoEpoca(4);
        assert.deepEqual(
            R.getListaVisivelEpocas().map((e) => e.id),
            [1, 2, 4, 3],
        );
    });

    it('recolher um ramo tira da seleção os períodos que sumiram da tela', () => {
        selecaoEpocas.add(5);
        selecaoEpocas.add(6);
        selecaoEpocas.add(1);
        R.alternarRamoEpoca(4);
        assert.deepEqual([...selecaoEpocas].sort(), [1]);
    });

    it('Recolher tudo também tira o que ficou escondido; o que continua à vista fica', () => {
        selecaoEpocas.add(2);
        selecaoEpocas.add(1);
        selecaoEpocas.add(3);
        R.recolherTodasEpocas();
        assert.deepEqual([...selecaoEpocas].sort(), [1, 3]);
    });

    it('selecionar todos pega só os que aparecem, e não arrasta descendentes', async () => {
        const { toggleSelecaoTodosEpocas } = await import('../js/epocas-acoes.js');
        R.alternarRamoEpoca(4);
        toggleSelecaoTodosEpocas(true);
        assert.deepEqual([...selecaoEpocas].sort(), [1, 2, 3, 4]);
        selecaoEpocas.clear();
        // Marcar só o pai recolhido não marca os de dentro.
        const { toggleSelecaoEpoca } = await import('../js/epocas-acoes.js');
        toggleSelecaoEpoca(4, true);
        assert.deepEqual([...selecaoEpocas], [4]);
    });

    it('shift-click marca o intervalo na ordem da árvore', async () => {
        const { toggleSelecaoEpoca } = await import('../js/epocas-acoes.js');
        toggleSelecaoEpoca(2, true);
        toggleSelecaoEpoca(5, true, true);
        assert.deepEqual([...selecaoEpocas].sort(), [2, 4, 5]);
    });
});

describe('excluir, mesclar, migrar e importar', () => {
    beforeEach(() => {
        montarBanco();
    });

    it('excluir um pai: os de dentro sobem e o desfazer devolve tudo', () => {
        db.epocas.push(
            base({ id: 7, nome: 'Neto', autorId: 1, inicio: null, fim: null, pertenceA: [2] }),
        );
        deleteItem('epocas', 2);
        assert.match(
            document.body.textContent,
            /1 período dentro dele passa a ficar no período acima/,
        );
        el('excl-confirmar').click();
        assert.equal(por(2), undefined);
        assert.deepEqual(por(7).pertenceA, [1]);
        document.querySelector('#avisos-toast button').click();
        assert.deepEqual(por(2).pertenceA, [1]);
        assert.deepEqual(por(7).pertenceA, [2]);
    });

    it('excluir um período de topo: os de dentro viram de topo', () => {
        deleteItem('epocas', 4);
        assert.match(document.body.textContent, /2 períodos dentro dele viram períodos de topo/);
        el('excl-confirmar').click();
        assert.deepEqual(por(5).pertenceA, []);
        assert.deepEqual(por(6).pertenceA, []);
        document.querySelector('#avisos-toast button').click();
        assert.deepEqual(por(5).pertenceA, [4]);
        assert.deepEqual(por(6).pertenceA, [4]);
    });

    it('excluir quem tem outro pai: continua dentro do outro', () => {
        por(5).pertenceA = [4, 1];
        deleteItem('epocas', 4);
        assert.match(
            document.body.textContent,
            /1 período dentro dele continua dentro de outro período/,
        );
        el('excl-confirmar').click();
        assert.deepEqual(por(5).pertenceA, [1]);
        document.querySelector('#avisos-toast button').click();
        assert.deepEqual(por(5).pertenceA, [4, 1]);
    });

    it('mesclar: os filhos da origem passam ao destino', () => {
        db.epocas.push(
            base({
                id: 8,
                nome: 'Ensino médio (de novo)',
                autorId: 1,
                inicio: null,
                fim: null,
                pertenceA: [],
            }),
        );
        mesclarEpocas(db, 1, 8);
        assert.equal(por(1), undefined);
        assert.deepEqual(por(2).pertenceA, [8]);
        assert.deepEqual(por(8).pertenceA, []);
    });

    it('mesclar: o destino herda os pais da origem se não tinha nenhum', () => {
        db.epocas.push(
            base({ id: 8, nome: 'Outro', autorId: 1, inicio: null, fim: null, pertenceA: [] }),
        );
        mesclarEpocas(db, 5, 8);
        assert.deepEqual(por(8).pertenceA, [4]);
    });

    it('migração: registro antigo ganha a lista vazia; ciclo e id inexistente saem', () => {
        const lista = [
            { id: 1, nome: 'A' },
            { id: 2, nome: 'B', pertenceA: [1, 999, 2] },
            { id: 3, nome: 'C', pertenceA: [4] },
            { id: 4, nome: 'D', pertenceA: [3] },
        ];
        assert.equal(migrarHierarquiaPeriodosBiograficos(lista), true);
        assert.deepEqual(lista[0].pertenceA, []);
        assert.deepEqual(lista[1].pertenceA, [1]);
        assert.equal(lista[2].pertenceA.length + lista[3].pertenceA.length, 1);
        // Idempotente.
        assert.equal(migrarHierarquiaPeriodosBiograficos(lista), false);
    });

    it('a migração só cuida da estrutura: não derruba pai fora do intervalo ou de outro autor', () => {
        const lista = [
            { id: 1, nome: 'A', autorId: 1, inicio: { ano: 2000 }, fim: { ano: 2001 } },
            {
                id: 2,
                nome: 'B',
                autorId: 2,
                inicio: { ano: 2010 },
                fim: { ano: 2011 },
                pertenceA: [1],
            },
        ];
        migrarHierarquiaPeriodosBiograficos(lista);
        assert.deepEqual(lista[1].pertenceA, [1]);
    });

    it('backup: pertenceA vai e volta; backup antigo (sem o campo) ganha a lista vazia', async () => {
        const backup = JSON.parse(JSON.stringify(db));
        db.epocas = [];
        await importarDB(backup);
        assert.deepEqual(por(2).pertenceA, [1]);
        assert.deepEqual(por(5).pertenceA, [4]);

        const antigo = JSON.parse(JSON.stringify(backup));
        antigo.epocas.forEach((e) => delete e.pertenceA);
        db.epocas = [];
        await importarDB(antigo);
        assert.ok(db.epocas.every((e) => Array.isArray(e.pertenceA) && e.pertenceA.length === 0));
    });

    it('backup com ciclo corrompido é saneado em vez de falhar', async () => {
        const backup = JSON.parse(JSON.stringify(db));
        backup.epocas.find((e) => e.id === 1).pertenceA = [2];
        await importarDB(backup);
        assert.equal(por(1).pertenceA.length + por(2).pertenceA.length, 1);
    });
});

describe('Ver: caminho e períodos de dentro', () => {
    beforeEach(() => {
        montarBanco();
    });

    it('o filho mostra de onde faz parte; o pai lista os de dentro com as datas', () => {
        const filho = textoDe(renderVisualizacaoPeriodoBiograficoHtml(por(2), db));
        assert.match(filho, /Faz parte de: Ensino médio/);
        const pai = textoDe(renderVisualizacaoPeriodoBiograficoHtml(por(1), db));
        assert.match(pai, /Períodos dentro \(1\)/);
        assert.match(pai, /Pré-vestibular \(2008 – 2009\)/);
    });

    it('caminho completo em dois níveis e pai sem datas com as datas derivadas', () => {
        db.epocas.push(
            base({ id: 9, nome: 'Detalhe', autorId: 1, inicio: null, fim: null, pertenceA: [5] }),
        );
        const detalhe = textoDe(renderVisualizacaoPeriodoBiograficoHtml(por(9), db));
        assert.match(detalhe, /Faz parte de: Relação com X › Fase 1/);
        const x = textoDe(renderVisualizacaoPeriodoBiograficoHtml(por(4), db));
        assert.match(x, /A partir de 2011 \(dos períodos de dentro\)/);
    });

    it('período de topo sem filhos não ganha as linhas novas', () => {
        const t = textoDe(renderVisualizacaoPeriodoBiograficoHtml(por(3), db));
        assert.doesNotMatch(t, /Faz parte de|Períodos dentro/);
    });

    it('pai ou filho oculto não aparece no Ver', () => {
        por(1).oculto = true;
        const filho = textoDe(renderVisualizacaoPeriodoBiograficoHtml(por(2), db));
        assert.doesNotMatch(filho, /Ensino médio/);
        por(1).oculto = false;
        por(2).oculto = true;
        const pai = textoDe(renderVisualizacaoPeriodoBiograficoHtml(por(1), db));
        assert.doesNotMatch(pai, /Pré-vestibular|Períodos dentro/);
    });
});
