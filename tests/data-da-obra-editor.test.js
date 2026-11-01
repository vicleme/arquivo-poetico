import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Data da obra ou do fato nos modais de Poema e Prosa (T9, entrega 6):
// o campo de Intertextualidade, Hipertextualidade e Referências, a data
// gravada nas chaves `dataObra` e `dataObraAte`, o editar que devolve a data
// ao campo (senão ela se perderia ao salvar) e a sugestão que só preenche
// quando o campo está vazio. Esqueleto de DOM antes do import, como em
// data-acesso-editor.test.js.
const blocoBase = (nome, extra = '') => `
    <input id="p-${nome}-tipo" />
    ${extra}
    <input id="p-${nome}-link" />
    <input id="p-${nome}-data-acesso" type="date" />
    <input id="p-${nome}-link-texto" />
    <input id="p-${nome}-nota" />
    <div id="p-${nome}-data"></div>
    <button id="p-${nome}-btn-add"></button>
    <button id="p-${nome}-btn-cancelar" class="hidden"></button>
    <div id="p-${nome}-lista"></div>`;

const autor = (nome) =>
    `<input id="p-${nome}-autor" /><div id="p-${nome}-autor-chips"></div><input id="p-${nome}-descricao" />`;

document.body.innerHTML = `
    <div id="p-pessoa-input-wrapper">
        <input id="p-pessoa-input" />
        <div id="p-pessoas-container"></div>
        <div id="p-pessoas-grupos-info"></div>
    </div>
    <input id="p-grupo-direto-input" />
    <div id="p-grupos-diretos-container"></div>
    <input id="pr-grupo-direto-input" />
    <div id="pr-grupos-diretos-container"></div>
    <input id="p-fonte-link" />
    <input id="p-fonte-data-acesso" type="date" />
    ${blocoBase('intertexto', `<input id="p-intertexto-obra" />${autor('intertexto')}`)}
    ${blocoBase('refext', '<input id="p-refext-texto" />')}
    ${blocoBase(
        'hipertexto',
        `<input id="p-hipertexto-relacao" /><input id="p-hipertexto-hipotexto" />${autor('hipertexto')}`,
    )}
    <div id="pr-sinalizacoes-corpo"></div>
`;

const ed = await import('../js/editor.js');
const { db } = await import('../js/db.js');
const { rotulosDaData, mensagemDeErroDaData, camposDeData } =
    await import('../js/campo-data-obra.js');
const { criarDataObra } = await import('../js/data-da-obra.js');

const val = (id, v) => (document.getElementById(id).value = v);
const lista = (id) => document.getElementById(id).textContent;

const muda = (el, tipo = 'change') => el.dispatchEvent(new window.Event(tipo, { bubbles: true }));

// Preenche uma ponta ('inicio' ou 'fim') do campo de data de um formulário.
function data(campo, ponta, { nivel, numero = '', mes = '', dia = '', aC = false, aprox = false }) {
    const linha = document.querySelector(`#p-${campo}-data [data-ponta="${ponta}"]`);
    const q = (c) => linha.querySelector(`[data-campo="${c}"]`);
    q('nivel').value = nivel;
    muda(q('nivel'));
    q('numero').value = numero;
    q('mes').value = mes;
    q('dia').value = dia;
    q('aC').checked = aC;
    q('aprox').checked = aprox;
    muda(q('numero'), 'input');
}

const lerPonta = (campo, ponta, nome) =>
    document.querySelector(`#p-${campo}-data [data-ponta="${ponta}"] [data-campo="${nome}"]`);

function limpar() {
    document.querySelectorAll('input, textarea, select').forEach((el) => {
        if (el.type === 'checkbox') el.checked = false;
        else el.value = '';
    });
    ed.resetIntertextualidade('poemas');
    ed.resetHipertextualidade('poemas');
    ed.resetReferenciasExternas('poemas');
    db.poemas = [];
}

ed.ligarCamposDeData('poemas');
ed.ligarCamposDeAutor('poemas');
ed.ligarConhecidoComo('poemas');

describe('rotulosDaData, mensagemDeErroDaData e camposDeData (lógica pura)', () => {
    it('Obra: "Data da obra" e "Até"; Referência muda com o tipo', () => {
        assert.deepEqual([rotulosDaData().inicio, rotulosDaData().fim], ['Data da obra', 'Até']);
        const par = (tipo) => [rotulosDaData(tipo).inicio, rotulosDaData(tipo).fim];
        assert.deepEqual(par('Marco histórico'), ['Início', 'Fim']);
        assert.deepEqual(par('marco historico'), ['Início', 'Fim']);
        assert.deepEqual(par('Pessoa pública'), ['Nascimento', 'Óbito']);
        assert.deepEqual(par('Notícia'), ['Data da notícia', 'Até']);
        assert.deepEqual(par(''), ['Data', 'Até']);
        assert.deepEqual(par('Astrologia'), ['Data', 'Até']);
    });

    it('a mensagem de erro leva o rótulo da ponta, menos no intervalo', () => {
        assert.equal(mensagemDeErroDaData(''), '');
        assert.match(mensagemDeErroDaData('ano-invalido', 'Nascimento'), /^Nascimento: O ano/);
        assert.equal(
            mensagemDeErroDaData('fim-antes-do-inicio', 'Óbito'),
            'A data final vem antes da inicial.',
        );
    });

    it('camposDeData só leva as pontas que existem, na forma normalizada', () => {
        const { data: ano } = criarDataObra({ nivel: 'ano', ano: '1922' });
        assert.deepEqual(camposDeData({}), {});
        assert.deepEqual(camposDeData({ inicio: ano, fim: null }), { dataObra: ano });
        assert.deepEqual(Object.keys(camposDeData({ inicio: null, fim: ano })), ['dataObraAte']);
        assert.deepEqual(camposDeData({ inicio: { nivel: 'ano', ano: 0 } }), {});
    });
});

describe('Data da obra: o campo desenhado', () => {
    beforeEach(limpar);

    it('cada formulário ganha duas pontas com os rótulos de Obra', () => {
        const rotulos = [...document.querySelectorAll('#p-intertexto-data [data-campo="rotulo"]')];
        assert.deepEqual(
            rotulos.map((r) => r.textContent),
            ['Data da obra', 'Até'],
        );
        assert.equal(lerPonta('intertexto', 'inicio', 'numero').classList.contains('hidden'), true);
    });

    it('o nível mostra só o que pede', () => {
        const visivel = (nome) =>
            !lerPonta('intertexto', 'inicio', nome).classList.contains('hidden');
        data('intertexto', 'inicio', { nivel: 'seculo' });
        assert.deepEqual([visivel('numero'), visivel('mes'), visivel('dia')], [true, false, false]);
        data('intertexto', 'inicio', { nivel: 'mes' });
        assert.deepEqual([visivel('numero'), visivel('mes'), visivel('dia')], [true, true, false]);
        data('intertexto', 'inicio', { nivel: 'dia' });
        assert.deepEqual([visivel('numero'), visivel('mes'), visivel('dia')], [true, true, true]);
        data('intertexto', 'inicio', { nivel: '' });
        assert.deepEqual(
            [visivel('numero'), visivel('mes'), visivel('dia')],
            [false, false, false],
        );
    });

    it('o rótulo da Referência segue o Tipo (Pessoa pública: Nascimento e Óbito)', () => {
        const rotulos = () =>
            [...document.querySelectorAll('#p-refext-data [data-campo="rotulo"]')].map(
                (r) => r.textContent,
            );
        assert.deepEqual(rotulos(), ['Data', 'Até']);
        val('p-refext-tipo', 'Pessoa pública');
        muda(document.getElementById('p-refext-tipo'), 'input');
        assert.deepEqual(rotulos(), ['Nascimento', 'Óbito']);
        val('p-refext-tipo', 'Marco histórico');
        muda(document.getElementById('p-refext-tipo'), 'input');
        assert.deepEqual(rotulos(), ['Início', 'Fim']);
    });
});

describe('Data da obra: Intertextualidade (Poema)', () => {
    beforeEach(limpar);

    it('grava o ano em dataObra e mostra na lista; o campo volta ao vazio', () => {
        val('p-intertexto-obra', 'Águas de Março');
        data('intertexto', 'inicio', { nivel: 'ano', numero: '1972' });
        ed.adicionarIntertexto('poemas');

        const [item] = ed.obterIntertextualidade('poemas');
        assert.equal(item.dataObra.nivel, 'ano');
        assert.equal(item.dataObra.ano, 1972);
        assert.equal(item.dataObra.de, 1972);
        assert.equal('dataObraAte' in item, false);
        assert.match(lista('p-intertexto-lista'), /· 1972/);
        assert.equal(lerPonta('intertexto', 'inicio', 'nivel').value, '');
    });

    it('começo e fim em níveis diferentes, com aprox. e a.C.', () => {
        val('p-intertexto-obra', 'Odisseia');
        data('intertexto', 'inicio', { nivel: 'seculo', numero: 'VIII', aC: true, aprox: true });
        data('intertexto', 'fim', { nivel: 'seculo', numero: '7', aC: true });
        ed.adicionarIntertexto('poemas');

        const [item] = ed.obterIntertextualidade('poemas');
        assert.deepEqual(
            [item.dataObra.seculo, item.dataObra.aC, item.dataObra.aprox],
            [8, true, true],
        );
        assert.deepEqual([item.dataObra.de, item.dataObra.ate], [-800, -701]);
        assert.deepEqual([item.dataObraAte.de, item.dataObraAte.ate], [-700, -601]);
        assert.match(lista('p-intertexto-lista'), /aprox\. séc\. VIII a\.C\. até séc\. VII a\.C\./);
    });

    it('sem data, a entrada não ganha chave nenhuma', () => {
        val('p-intertexto-obra', 'Sem data');
        ed.adicionarIntertexto('poemas');
        const [item] = ed.obterIntertextualidade('poemas');
        assert.equal('dataObra' in item, false);
        assert.equal('dataObraAte' in item, false);
    });

    it('data incompleta não salva e avisa; o que foi digitado fica', () => {
        val('p-intertexto-obra', 'X');
        data('intertexto', 'inicio', { nivel: 'ano', numero: '' });
        ed.adicionarIntertexto('poemas');
        assert.deepEqual(ed.obterIntertextualidade('poemas'), []);
        assert.equal(document.getElementById('p-intertexto-obra').value, 'X');
        assert.match(document.body.textContent, /Data da obra: O ano precisa ser/);
    });

    it('dia que não existe no mês não salva', () => {
        val('p-intertexto-obra', 'X');
        data('intertexto', 'inicio', { nivel: 'dia', numero: '1923', mes: '2', dia: '29' });
        ed.adicionarIntertexto('poemas');
        assert.deepEqual(ed.obterIntertextualidade('poemas'), []);
    });

    it('fim antes do começo não salva', () => {
        val('p-intertexto-obra', 'X');
        data('intertexto', 'inicio', { nivel: 'ano', numero: '1950' });
        data('intertexto', 'fim', { nivel: 'ano', numero: '1940' });
        ed.adicionarIntertexto('poemas');
        assert.deepEqual(ed.obterIntertextualidade('poemas'), []);
    });

    it('datas que se sobrepõem valem (começo 1920, fim séc. XX)', () => {
        val('p-intertexto-obra', 'X');
        data('intertexto', 'inicio', { nivel: 'ano', numero: '1920' });
        data('intertexto', 'fim', { nivel: 'seculo', numero: 'XX' });
        ed.adicionarIntertexto('poemas');
        assert.equal(ed.obterIntertextualidade('poemas').length, 1);
    });

    it('só a data preenchida não cria entrada', () => {
        data('intertexto', 'inicio', { nivel: 'ano', numero: '1972' });
        ed.adicionarIntertexto('poemas');
        assert.deepEqual(ed.obterIntertextualidade('poemas'), []);
    });

    it('editar devolve a data ao campo, e salvar sem mexer a preserva', () => {
        val('p-intertexto-obra', 'Odisseia');
        data('intertexto', 'inicio', { nivel: 'seculo', numero: 'VIII', aC: true });
        data('intertexto', 'fim', { nivel: 'mes', numero: '1922', mes: '2' });
        ed.adicionarIntertexto('poemas');
        const antes = structuredClone(ed.obterIntertextualidade('poemas')[0]);

        ed.editarIntertexto('poemas', 0);
        assert.equal(lerPonta('intertexto', 'inicio', 'nivel').value, 'seculo');
        assert.equal(lerPonta('intertexto', 'inicio', 'numero').value, 'VIII');
        assert.equal(lerPonta('intertexto', 'inicio', 'aC').checked, true);
        assert.equal(lerPonta('intertexto', 'fim', 'mes').value, '2');

        ed.adicionarIntertexto('poemas');
        assert.deepEqual(ed.obterIntertextualidade('poemas')[0], antes);
    });

    it('editar uma entrada sem data deixa o campo vazio, e dá para tirar a data', () => {
        val('p-intertexto-obra', 'X');
        data('intertexto', 'inicio', { nivel: 'ano', numero: '1972' });
        ed.adicionarIntertexto('poemas');
        ed.editarIntertexto('poemas', 0);
        data('intertexto', 'inicio', { nivel: '' });
        ed.adicionarIntertexto('poemas');
        assert.equal('dataObra' in ed.obterIntertextualidade('poemas')[0], false);
    });

    it('cancelar a edição limpa a data do campo', () => {
        val('p-intertexto-obra', 'X');
        data('intertexto', 'inicio', { nivel: 'ano', numero: '1972' });
        ed.adicionarIntertexto('poemas');
        ed.editarIntertexto('poemas', 0);
        ed.cancelarEdicaoIntertexto('poemas');
        assert.equal(lerPonta('intertexto', 'inicio', 'nivel').value, '');
    });

    it('carregar e reset também limpam o campo', () => {
        data('intertexto', 'inicio', { nivel: 'ano', numero: '1972' });
        ed.carregarIntertextualidade('poemas', []);
        assert.equal(lerPonta('intertexto', 'inicio', 'nivel').value, '');
        data('intertexto', 'inicio', { nivel: 'ano', numero: '1972' });
        ed.resetIntertextualidade('poemas');
        assert.equal(lerPonta('intertexto', 'inicio', 'nivel').value, '');
    });

    it('a entrada carregada do acervo mantém a data ao ser lida de novo', () => {
        const { data: d } = criarDataObra({ nivel: 'decada', decada: '1920' });
        ed.carregarIntertextualidade('poemas', [{ tipo: 'Livro', texto: 'Y', dataObra: d }]);
        assert.deepEqual(ed.obterIntertextualidade('poemas')[0].dataObra, d);
        assert.match(lista('p-intertexto-lista'), /· década de 1920/);
    });
});

describe('Data da obra: Hipertextualidade e Referências (Poema)', () => {
    beforeEach(limpar);

    it('Hipertextualidade grava, edita e preserva', () => {
        val('p-hipertexto-hipotexto', 'Romeu e Julieta');
        data('hipertexto', 'inicio', { nivel: 'ano', numero: '1597' });
        ed.adicionarHipertextualidade('poemas');
        const antes = structuredClone(ed.obterHipertextualidade('poemas')[0]);
        assert.equal(antes.dataObra.ano, 1597);
        assert.match(lista('p-hipertexto-lista'), /· 1597/);

        ed.editarHipertextualidade('poemas', 0);
        assert.equal(lerPonta('hipertexto', 'inicio', 'numero').value, '1597');
        ed.adicionarHipertextualidade('poemas');
        assert.deepEqual(ed.obterHipertextualidade('poemas')[0], antes);
    });

    it('Referência de Pessoa pública: nascimento e óbito', () => {
        val('p-refext-tipo', 'Pessoa pública');
        muda(document.getElementById('p-refext-tipo'), 'input');
        val('p-refext-texto', 'Clarice Lispector');
        data('refext', 'inicio', { nivel: 'dia', numero: '1920', mes: '12', dia: '10' });
        data('refext', 'fim', { nivel: 'dia', numero: '1977', mes: '12', dia: '9' });
        ed.adicionarReferenciaExterna('poemas');

        const [item] = ed.obterReferenciasExternas('poemas');
        assert.deepEqual([item.dataObra.dia, item.dataObra.mes, item.dataObra.ano], [10, 12, 1920]);
        assert.equal(item.dataObraAte.ano, 1977);
        assert.match(lista('p-refext-lista'), /· 10\/12\/1920 até 09\/12\/1977/);
    });

    it('Pessoa pública viva: só o nascimento, sem óbito', () => {
        val('p-refext-tipo', 'Pessoa pública');
        val('p-refext-texto', 'Alguém');
        data('refext', 'inicio', { nivel: 'ano', numero: '1980' });
        ed.adicionarReferenciaExterna('poemas');
        const [item] = ed.obterReferenciasExternas('poemas');
        assert.equal(item.dataObra.ano, 1980);
        assert.equal('dataObraAte' in item, false);
    });

    it('editar uma Referência devolve a data e os rótulos do tipo', () => {
        val('p-refext-tipo', 'Marco histórico');
        val('p-refext-texto', 'Enchente');
        data('refext', 'inicio', { nivel: 'mes', numero: '2011', mes: '1' });
        data('refext', 'fim', { nivel: 'mes', numero: '2011', mes: '2' });
        ed.adicionarReferenciaExterna('poemas');
        const antes = structuredClone(ed.obterReferenciasExternas('poemas')[0]);

        ed.editarReferenciaExterna('poemas', 0);
        assert.equal(lerPonta('refext', 'inicio', 'mes').value, '1');
        assert.equal(
            document.querySelector('#p-refext-data [data-campo="rotulo"]').textContent,
            'Início',
        );
        ed.adicionarReferenciaExterna('poemas');
        assert.deepEqual(ed.obterReferenciasExternas('poemas')[0], antes);
    });

    it('Referência com data inválida não salva', () => {
        val('p-refext-tipo', 'Notícia');
        val('p-refext-texto', 'Manchete');
        data('refext', 'inicio', { nivel: 'mes', numero: '2011', mes: '' });
        ed.adicionarReferenciaExterna('poemas');
        assert.deepEqual(ed.obterReferenciasExternas('poemas'), []);
    });
});

describe('Data da obra: a sugestão só preenche o que está vazio', () => {
    const ano = (n) => criarDataObra({ nivel: 'ano', ano: n }).data;
    beforeEach(limpar);

    function acervo(entradas) {
        db.poemas = [{ id: 1, titulo: 'A', intertextualidade: entradas }];
    }
    const confirmarAutor = (nome) => {
        const el = document.getElementById('p-intertexto-autor');
        el.value = nome;
        el.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    };

    it('uma data só para a obra: preenche ao confirmar o autor', () => {
        acervo([
            {
                tipoObra: 'Música',
                obra: 'Águas de Março',
                autores: ['Tom Jobim'],
                dataObra: ano(1972),
            },
        ]);
        val('p-intertexto-obra', 'Águas de Março');
        confirmarAutor('Tom Jobim');
        assert.equal(lerPonta('intertexto', 'inicio', 'nivel').value, 'ano');
        assert.equal(lerPonta('intertexto', 'inicio', 'numero').value, '1972');
    });

    it('não sobrescreve o que já foi escolhido', () => {
        acervo([
            {
                tipoObra: 'Música',
                obra: 'Águas de Março',
                autores: ['Tom Jobim'],
                dataObra: ano(1972),
            },
        ]);
        val('p-intertexto-obra', 'Águas de Março');
        data('intertexto', 'inicio', { nivel: 'ano', numero: '1973' });
        confirmarAutor('Tom Jobim');
        assert.equal(lerPonta('intertexto', 'inicio', 'numero').value, '1973');
    });

    it('com duas datas diferentes não preenche, e oferece as duas', () => {
        acervo([
            { obra: 'Águas de Março', autores: ['Tom Jobim'], dataObra: ano(1972) },
            { obra: 'Águas de Março', autores: ['Tom Jobim'], dataObra: ano(1973) },
        ]);
        val('p-intertexto-obra', 'Águas de Março');
        confirmarAutor('Tom Jobim');
        assert.equal(lerPonta('intertexto', 'inicio', 'nivel').value, '');
        const botoes = [...document.querySelectorAll('#p-intertexto-data [data-sugestao]')];
        assert.deepEqual(botoes.map((b) => b.textContent).sort(), ['1972', '1973']);

        botoes.find((b) => b.textContent === '1973').click();
        assert.equal(lerPonta('intertexto', 'inicio', 'numero').value, '1973');
        // O que foi escolhido deixa de ser oferecido.
        assert.deepEqual(
            [...document.querySelectorAll('#p-intertexto-data [data-sugestao]')].map(
                (b) => b.textContent,
            ),
            ['1972'],
        );
    });

    it('obra sem data no acervo não sugere nada', () => {
        acervo([{ obra: 'Águas de Março', autores: ['Tom Jobim'] }]);
        val('p-intertexto-obra', 'Águas de Março');
        confirmarAutor('Tom Jobim');
        assert.equal(lerPonta('intertexto', 'inicio', 'nivel').value, '');
        assert.equal(document.querySelectorAll('#p-intertexto-data [data-sugestao]').length, 0);
    });

    it('Referência: ao sair de Tipo e Texto, preenche nascimento e óbito', () => {
        db.poemas = [
            {
                id: 1,
                titulo: 'A',
                referenciasExternas: [
                    {
                        tipo: 'Pessoa pública',
                        texto: 'Clarice Lispector',
                        dataObra: ano(1920),
                        dataObraAte: ano(1977),
                    },
                ],
            },
        ];
        val('p-refext-tipo', 'Pessoa pública');
        val('p-refext-texto', 'clarice lispector');
        muda(document.getElementById('p-refext-texto'));
        assert.equal(lerPonta('refext', 'inicio', 'numero').value, '1920');
        assert.equal(lerPonta('refext', 'fim', 'numero').value, '1977');
    });
});

describe('Data da obra: os modais de Poema e Prosa', () => {
    it('cada modal tem os três contêineres de data, um por formulário', async () => {
        const { readFile } = await import('node:fs/promises');
        for (const [arquivo, p] of [
            ['modais/modal-poema.html', 'p'],
            ['modais/modal-prosa.html', 'pr'],
        ]) {
            const html = await readFile(new URL(`../${arquivo}`, import.meta.url), 'utf8');
            for (const campo of ['intertexto', 'hipertexto', 'refext']) {
                const ocorrencias = html.split(`id="${p}-${campo}-data"`).length - 1;
                assert.equal(ocorrencias, 1, `${arquivo}: ${p}-${campo}-data`);
            }
        }
    });
});
