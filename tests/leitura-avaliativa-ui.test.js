import './helpers/dom-real.js';

import fs from 'node:fs';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Leitura avaliativa (Fase 22, entrega 2b): a tela da aba, com o `db` real.
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

document.body.innerHTML = `<main><div id="leitura-conteudo"></div></main>`;

const { db } = await import('../js/db.js');
const ui = await import('../js/leitura-avaliativa-ui.js');
const { GRUPOS_NAV } = await import('../js/ui.js');

const conteudo = () => document.getElementById('leitura-conteudo');

beforeEach(() => {
    db.poemas = [
        { id: 1, titulo: 'Árvore', texto: 'Raiz e <b>copa</b>', autoclassificacao: 0 },
        { id: 2, titulo: 'Mar alto', texto: 'Onda', autoclassificacao: 3, autoavaliacao: 'bom' },
    ];
    db.prosas = [{ id: 1, titulo: 'Carta', texto: 'Querida', autoclassificacao: 0 }];
    db.leituras = [];
    ui.reiniciarEstado();
    ui.renderLeituraAvaliativa();
});

describe('Leitura avaliativa: ligação da aba', () => {
    it('o botão, a seção e o item de navegação existem', () => {
        assert.match(html, /id="btn-leitura-avaliativa"/);
        assert.match(html, /<section id="leitura-avaliativa" class="tab-content">/);
        const analise = GRUPOS_NAV.find((g) => g.id === 'analise');
        const ids = analise.abas.map((a) => a.id);
        assert.deepEqual(ids.slice(-2), ['morfofuncionalidade', 'leitura-avaliativa']);
    });
});

describe('Leitura avaliativa: lista de textos', () => {
    it('abre na lista, em ordem alfabética, com poemas e prosas', () => {
        const botoes = [...conteudo().querySelectorAll('#leitura-lista button')];
        assert.equal(botoes.length, 3);
        assert.match(botoes[0].textContent, /Árvore/);
        assert.match(botoes[2].textContent, /Mar alto/);
        assert.match(botoes[1].textContent, /Carta/);
    });

    it('o filtro separa avaliados de não avaliados', () => {
        db.leituras = [
            { id: 9, textoId: 2, tipo: 'poema', data: '2026-11-01', pegou: [], incomodou: [] },
        ];
        ui.aoFiltrarLeitura('avaliados');
        let botoes = [...conteudo().querySelectorAll('#leitura-lista button')];
        assert.equal(botoes.length, 1);
        assert.match(botoes[0].textContent, /Mar alto/);
        ui.aoFiltrarLeitura('nao-avaliados');
        botoes = [...conteudo().querySelectorAll('#leitura-lista button')];
        assert.equal(botoes.length, 2);
        ui.aoFiltrarLeitura('todos');
        assert.equal(conteudo().querySelectorAll('#leitura-lista button').length, 3);
        ui.aoFiltrarLeitura('invalido');
        assert.equal(ui.estado.filtro, 'todos');
    });

    it('o filtro de classificação combina com o de leitura', () => {
        db.leituras = [
            { id: 9, textoId: 2, tipo: 'poema', data: '2026-11-01', pegou: [], incomodou: [] },
        ];
        ui.aoFiltrarClassificacaoLeitura('classificados');
        let botoes = [...conteudo().querySelectorAll('#leitura-lista button')];
        assert.equal(botoes.length, 1);
        assert.match(botoes[0].textContent, /Mar alto/);
        ui.aoFiltrarLeitura('nao-avaliados');
        assert.match(conteudo().textContent, /Nenhum texto com esse filtro e essa busca/);
        ui.aoFiltrarClassificacaoLeitura('sem-classificacao');
        botoes = [...conteudo().querySelectorAll('#leitura-lista button')];
        assert.equal(botoes.length, 2);
        ui.aoFiltrarClassificacaoLeitura('xx');
        assert.equal(ui.estado.classificacao, 'sem-classificacao');
    });

    it('a busca filtra a lista sem refazer o campo', () => {
        const campo = document.getElementById('leitura-busca');
        ui.aoBuscarLeitura('MAR');
        assert.equal(document.getElementById('leitura-busca'), campo);
        assert.equal(conteudo().querySelectorAll('#leitura-lista button').length, 1);
        ui.aoBuscarLeitura('zzz');
        assert.match(conteudo().textContent, /Nenhum texto com esse filtro e essa busca/);
    });
});

describe('Leitura avaliativa: formulário', () => {
    it('escolher um texto mostra o texto e o formulário, com a Avaliação atual', () => {
        ui.aoSelecionarTextoLeitura('poema', '2');
        assert.match(conteudo().textContent, /Onda/);
        assert.match(conteudo().textContent, /De que maneira te pegou/);
        assert.match(conteudo().textContent, /O que incomodou/);
        assert.equal(document.getElementById('leitura-avaliacao').value, 'bom');
    });

    it('marcar peso e responder atualizam a sugestão com o motivo', () => {
        ui.aoSelecionarTextoLeitura('poema', '1');
        assert.match(conteudo().textContent, /Responda "Releria\?"/);
        ui.aoMarcarPegouLeitura('som', 'forte');
        ui.aoResponderLeitura('releria', 'sim');
        ui.aoResponderLeitura('mostraria', 'talvez');
        assert.match(conteudo().textContent, /Sugestão: 3,5 corações/);
        assert.match(conteudo().textContent, /maior peso em "De que maneira te pegou": marcante/);
        ui.aoMarcarPegouLeitura('som', 'forte');
        assert.equal(ui.estado.rascunho.pegou.length, 0);
    });

    it('avisa que o valor escolhido é o do texto e vale no sorteio', () => {
        ui.aoSelecionarTextoLeitura('poema', '1');
        assert.match(conteudo().textContent, /sorteio de leitura/);
        assert.match(conteudo().textContent, /a Classificação do texto não muda/);
    });

    it('o título do texto é escapado', () => {
        db.poemas[0].titulo = '<img src=x onerror=alert(1)>';
        ui.aoSelecionarTextoLeitura('poema', '1');
        assert.equal(conteudo().querySelector('article h3 img'), null);
    });
});

describe('Leitura avaliativa: terminar', () => {
    it('grava a leitura, a Classificação escolhida e a Avaliação, e recomeça em branco', () => {
        ui.aoSelecionarTextoLeitura('poema', '1');
        ui.aoMarcarPegouLeitura('imagem', 'centro');
        ui.aoResponderLeitura('releria', 'sim');
        ui.aoResponderLeitura('mostraria', 'sim');
        ui.aoEscolherCoracoesLeitura(4.5);
        ui.aoDigitarAvaliacaoLeitura('fica na cabeça');
        ui.aoConcluirLeitura();
        assert.equal(db.leituras.length, 1);
        assert.equal(db.leituras[0].sugerido, 5);
        assert.equal(db.leituras[0].escolhido, 4.5);
        assert.equal(db.poemas[0].autoclassificacao, 4.5);
        assert.equal(db.poemas[0].autoavaliacao, 'fica na cabeça');
        assert.equal(ui.estado.rascunho.releria, null);
        assert.match(conteudo().textContent, /Última leitura/);
    });

    it('sem corações escolhidos, a Classificação existente não muda', () => {
        ui.aoSelecionarTextoLeitura('poema', '2');
        ui.aoResponderLeitura('releria', 'nao');
        ui.aoResponderLeitura('mostraria', 'nao');
        ui.aoConcluirLeitura();
        assert.equal(db.leituras.length, 1);
        assert.equal(db.poemas[1].autoclassificacao, 3);
    });

    it('trocar uma Classificação existente pede confirmação e não grava antes', () => {
        ui.aoSelecionarTextoLeitura('poema', '2');
        ui.aoEscolherCoracoesLeitura(1);
        ui.aoConcluirLeitura();
        assert.equal(db.leituras.length, 0);
        assert.equal(db.poemas[1].autoclassificacao, 3);
        assert.ok(document.getElementById('modal-confirmar-exclusao'));
    });

    it('clicar de novo no mesmo valor desfaz a escolha', () => {
        ui.aoSelecionarTextoLeitura('poema', '1');
        ui.aoEscolherCoracoesLeitura(2);
        ui.aoEscolherCoracoesLeitura(2);
        assert.equal(ui.estado.escolhido, null);
    });

    it('"Partir desta leitura" copia o que pegou e as respostas, sem os corações', () => {
        ui.aoSelecionarTextoLeitura('prosa', '1');
        ui.aoMarcarPegouLeitura('voz', 'leve');
        ui.aoAlternarIncomodouLeitura('cliche');
        ui.aoResponderLeitura('releria', 'talvez');
        ui.aoResponderLeitura('mostraria', 'nao');
        ui.aoEscolherCoracoesLeitura(2);
        ui.aoConcluirLeitura();
        ui.aoPartirDaUltimaLeitura();
        assert.deepEqual(ui.estado.rascunho.pegou, [{ item: 'voz', peso: 'leve' }]);
        assert.deepEqual(ui.estado.rascunho.incomodou, ['cliche']);
        assert.equal(ui.estado.rascunho.releria, 'talvez');
        assert.equal(ui.estado.escolhido, null);
    });
});

describe('Leitura avaliativa: filtro por tipo e navegação entre textos', () => {
    const titulos = () =>
        [...conteudo().querySelectorAll('#leitura-lista button')].map((b) =>
            b.querySelector('span').textContent.trim(),
        );

    it('o filtro Tipo mostra só poemas ou só prosas e combina com os outros', () => {
        ui.aoFiltrarTipoLeitura('prosa');
        assert.deepEqual(titulos(), ['Carta']);
        ui.aoFiltrarTipoLeitura('poema');
        assert.deepEqual(titulos(), ['Árvore', 'Mar alto']);
        ui.aoFiltrarClassificacaoLeitura('classificados');
        assert.deepEqual(titulos(), ['Mar alto']);
        ui.aoFiltrarTipoLeitura('todos');
        ui.aoFiltrarClassificacaoLeitura('todos');
        assert.equal(titulos().length, 3);
        ui.aoFiltrarTipoLeitura('xx');
        assert.equal(ui.estado.tipo, 'todos');
    });

    it('Anterior e Próximo seguem a lista filtrada e mostram a posição', () => {
        ui.aoFiltrarTipoLeitura('poema');
        ui.aoSelecionarTextoLeitura('poema', 1);
        assert.match(conteudo().textContent, /1 de 2/);
        assert.equal(conteudo().querySelector('[onclick="leituraNavegar(-1)"]').disabled, true);
        ui.aoNavegarLeitura(1);
        assert.deepEqual(ui.estado.selecionado, { tipo: 'poema', id: 2 });
        assert.match(conteudo().textContent, /2 de 2/);
        assert.equal(conteudo().querySelector('[onclick="leituraNavegar(1)"]').disabled, true);
        ui.aoNavegarLeitura(1);
        assert.equal(ui.estado.selecionado.id, 2);
        ui.aoNavegarLeitura(-1);
        assert.equal(ui.estado.selecionado.id, 1);
    });

    it('passa de poema para prosa na lista sem filtro de tipo', () => {
        ui.aoSelecionarTextoLeitura('poema', 1);
        ui.aoNavegarLeitura(1);
        assert.deepEqual(ui.estado.selecionado, { tipo: 'prosa', id: 1 });
        assert.equal(ui.estado.rascunho.tipo, 'prosa');
    });

    it('terminar uma leitura não tira o texto da fila (filtro Não avaliados)', () => {
        ui.aoFiltrarLeitura('nao-avaliados');
        ui.aoSelecionarTextoLeitura('poema', 1);
        ui.aoMarcarPegouLeitura('voz', 'forte');
        ui.aoConcluirLeitura();
        assert.deepEqual(ui.estado.selecionado, { tipo: 'poema', id: 1 });
        assert.match(conteudo().textContent, /1 de 3/);
        ui.aoNavegarLeitura(1);
        assert.equal(ui.estado.selecionado.id, 1);
        assert.equal(ui.estado.selecionado.tipo, 'prosa');
    });

    it('pula texto excluído e não navega com um só texto na fila', () => {
        ui.aoSelecionarTextoLeitura('poema', 1);
        db.prosas = [];
        ui.aoNavegarLeitura(1);
        assert.deepEqual(ui.estado.selecionado, { tipo: 'poema', id: 2 });
        ui.aoVoltarListaLeitura();
        ui.aoFiltrarTipoLeitura('prosa');
        ui.aoFiltrarTipoLeitura('todos');
        ui.aoFiltrarLeitura('avaliados');
        ui.aoFiltrarLeitura('todos');
        db.poemas = [db.poemas[0]];
        ui.aoSelecionarTextoLeitura('poema', 1);
        assert.equal(conteudo().querySelector('[onclick="leituraNavegar(1)"]'), null);
    });
});

describe('Leitura avaliativa: bloco Padrão das leituras', () => {
    const leit = (id, tipo, textoId, escolhido, extra = {}) => ({
        id,
        textoId,
        tipo,
        data: '2026-11-01',
        pegou: [],
        incomodou: [],
        releria: null,
        mostraria: null,
        sugerido: null,
        escolhido,
        ...extra,
    });

    it('sem leituras, explica que o padrão aparece depois', () => {
        const d = conteudo().querySelector('details');
        assert.ok(d);
        assert.equal(d.hasAttribute('open'), false);
        assert.match(d.textContent, /Ainda não há leituras/);
    });

    it('com leituras, mostra faixas, aviso de poucos textos e divergências', () => {
        db.poemas[0].autoclassificacao = 5;
        db.poemas[1].autoclassificacao = 1;
        db.leituras = [
            leit(1, 'poema', 1, 5, { pegou: [{ item: 'voz', peso: 'centro' }], sugerido: 3 }),
            leit(2, 'poema', 2, 1, { incomodou: ['cliche'] }),
        ];
        ui.renderLeituraAvaliativa();
        const t = conteudo().querySelector('details').textContent;
        assert.match(t, /2 textos com corações/);
        assert.match(t, /Poucos textos com corações/);
        assert.match(t, /Voz/);
        assert.match(t, /Contraste/);
        assert.match(t, /sugerido 3, escolhido 5/);
        assert.ok(!t.includes('—'));
    });

    it('reler sem escolher corações não tira o texto das faixas, pela Classificação atual', () => {
        db.poemas[0].autoclassificacao = 4.5;
        db.leituras = [
            leit(1, 'poema', 1, 4.5, { pegou: [{ item: 'voz', peso: 'centro' }] }),
            leit(2, 'poema', 1, null, { pegou: [{ item: 'graca', peso: 'forte' }] }),
        ];
        ui.renderLeituraAvaliativa();
        const t = conteudo().querySelector('details').textContent;
        assert.match(t, /1 texto com corações/);
        assert.ok(!/sem Classificação (fica|ficam)/.test(t));
        db.poemas[0].autoclassificacao = 0;
        db.leituras = [leit(3, 'poema', 1, null)];
        ui.renderLeituraAvaliativa();
        assert.match(
            conteudo().querySelector('details').textContent,
            /sem Classificação fica de fora/,
        );
    });

    it('o filtro Tipo vale para o bloco e a escolha de abrir é lembrada', () => {
        db.leituras = [leit(1, 'poema', 1, 5), leit(2, 'prosa', 1, 2)];
        ui.aoFiltrarTipoLeitura('prosa');
        assert.match(conteudo().querySelector('details').textContent, /1 texto com corações/);
        ui.aoAlternarPadraoLeitura(true);
        ui.aoFiltrarTipoLeitura('todos');
        assert.equal(conteudo().querySelector('details').hasAttribute('open'), true);
    });
});

describe('Leitura avaliativa: rolagem e aviso', () => {
    const painel = (nome) => conteudo().querySelector(`[data-rolagem="${nome}"]`);

    it('marcar algo no formulário mantém a rolagem dos dois painéis', () => {
        ui.aoSelecionarTextoLeitura('poema', '1');
        painel('formulario').scrollTop = 240;
        painel('texto').scrollTop = 60;
        ui.aoMarcarPegouLeitura('imagem', 'forte');
        assert.equal(painel('formulario').scrollTop, 240);
        assert.equal(painel('texto').scrollTop, 60);
        ui.aoResponderLeitura('releria', 'sim');
        assert.equal(painel('formulario').scrollTop, 240);
    });

    it('trocar de texto recomeça os painéis no topo', () => {
        ui.aoSelecionarTextoLeitura('poema', '1');
        painel('formulario').scrollTop = 240;
        ui.aoSelecionarTextoLeitura('poema', '2');
        assert.equal(painel('formulario').scrollTop, 0);
    });

    it('terminar a leitura recomeça o formulário no topo e avisa como sucesso', () => {
        ui.aoSelecionarTextoLeitura('poema', '1');
        ui.aoResponderLeitura('releria', 'sim');
        ui.aoResponderLeitura('mostraria', 'sim');
        ui.aoEscolherCoracoesLeitura(4);
        painel('formulario').scrollTop = 500;
        ui.aoConcluirLeitura();
        assert.equal(painel('formulario').scrollTop, 0);
        const toasts = [...document.querySelectorAll('div')].filter((d) =>
            d.textContent.startsWith('Leitura registrada'),
        );
        assert.ok(toasts.length > 0);
        const cor = toasts[toasts.length - 1].style.background;
        assert.ok(/5, 150, 105|#059669/i.test(cor), `cor do aviso: ${cor}`);
    });
});

describe('Leitura avaliativa: filtro pelo que pegou', () => {
    const leit = (id, tipo, textoId, pegou) => ({
        id,
        textoId,
        tipo,
        data: '2026-11-01',
        pegou,
        incomodou: [],
    });
    const titulos = () =>
        [...conteudo().querySelectorAll('#leitura-lista button')].map((b) =>
            b.querySelector('.font-medium').textContent.trim(),
        );

    beforeEach(() => {
        db.leituras = [
            leit(1, 'poema', 1, [{ item: 'originalidade', peso: 'leve' }]),
            leit(2, 'poema', 2, [{ item: 'originalidade', peso: 'centro' }]),
            leit(3, 'prosa', 1, [{ item: 'graca', peso: 'forte' }]),
        ];
        ui.reiniciarEstado();
        ui.renderLeituraAvaliativa();
    });

    it('a linha Pegou tem Todos, Algum e os 13 itens, com a descrição ao passar o mouse', () => {
        const grupo = conteudo().querySelector('[aria-label="Filtrar pelo que pegou"]');
        const botoes = [...grupo.querySelectorAll('button')];
        assert.equal(botoes.length, 15);
        assert.equal(botoes[0].textContent, 'Todos');
        assert.equal(botoes[1].textContent, 'Algum');
        assert.match(botoes[1].title, /pelo menos um item marcado/);
        const graca = botoes.find((b) => b.textContent === 'Graça');
        assert.match(graca.title, /humor, o gracioso/);
        assert.ok(botoes.some((b) => b.textContent === 'Originalidade'));
        assert.ok(botoes.some((b) => b.textContent === 'Comoção'));
    });

    it('escolher um item mostra só os textos que o marcaram, do peso maior ao menor, com o peso', () => {
        ui.aoFiltrarPegouLeitura('originalidade');
        assert.deepEqual(titulos(), ['Mar alto', 'Árvore']);
        const primeiro = conteudo().querySelector('#leitura-lista button');
        assert.match(primeiro.textContent, /Originalidade: Central/);
        ui.aoFiltrarPegouLeitura('graca');
        assert.deepEqual(titulos(), ['Carta']);
        assert.match(conteudo().querySelector('#leitura-lista').textContent, /Graça: Marcante/);
    });

    it('Todos desfaz o filtro, item desconhecido é ignorado e a busca respeita o item', () => {
        ui.aoFiltrarPegouLeitura('originalidade');
        ui.aoFiltrarPegouLeitura('xx');
        assert.equal(ui.estado.pegou, 'originalidade');
        ui.aoBuscarLeitura('arv');
        assert.deepEqual(titulos(), ['Árvore']);
        ui.aoBuscarLeitura('');
        ui.aoFiltrarPegouLeitura('todos');
        assert.equal(titulos().length, 3);
    });

    it('item sem nenhum texto mostra o aviso de lista vazia', () => {
        ui.aoFiltrarPegouLeitura('comocao');
        assert.match(
            conteudo().querySelector('#leitura-lista').textContent,
            /Nenhum texto com esse filtro/,
        );
    });

    it('a fila de Anterior e Próximo segue a lista filtrada por item', () => {
        ui.aoFiltrarPegouLeitura('originalidade');
        ui.aoSelecionarTextoLeitura('poema', 2);
        assert.deepEqual(
            ui.estado.fila.map((f) => `${f.tipo}${f.id}`),
            ['poema2', 'poema1'],
        );
    });
});

describe('Leitura avaliativa: do padrão para a lista pelo item', () => {
    const leit = (id, tipo, textoId, escolhido, pegou) => ({
        id,
        textoId,
        tipo,
        data: '2026-11-01',
        pegou,
        incomodou: [],
        releria: null,
        mostraria: null,
        sugerido: null,
        escolhido,
    });
    const titulos = () =>
        [...conteudo().querySelectorAll('#leitura-lista button')].map((b) =>
            b.querySelector('.font-medium').textContent.trim(),
        );

    beforeEach(() => {
        db.leituras = [
            leit(1, 'poema', 1, 5, [{ item: 'originalidade', peso: 'forte' }]),
            leit(2, 'poema', 2, 4, [{ item: 'originalidade', peso: 'centro' }]),
            leit(3, 'prosa', 1, 2, [{ item: 'voz', peso: 'leve' }]),
        ];
        ui.reiniciarEstado();
        ui.renderLeituraAvaliativa();
    });

    it('o nome de cada item da tabela do padrão é um botão que chama o filtro', () => {
        const botoes = [...conteudo().querySelectorAll('details table button')];
        assert.equal(botoes.length, 25);
        const orig = botoes.find((b) => b.textContent === 'Originalidade');
        assert.match(orig.getAttribute('onclick'), /leituraAbrirItemPegou\('originalidade'\)/);
        assert.match(orig.title, /Ver os textos que pegaram por Originalidade/);
        assert.match(conteudo().querySelector('details').textContent, /Clique no nome de um item/);
    });

    it('clicar no item aplica o filtro Pegou, mostra a lista por peso e mantém o bloco aberto', () => {
        ui.aoAlternarPadraoLeitura(true);
        ui.aoAbrirItemPegouLeitura('originalidade');
        assert.equal(ui.estado.pegou, 'originalidade');
        assert.deepEqual(titulos(), ['Mar alto', 'Árvore']);
        const grupo = conteudo().querySelector('[aria-label="Filtrar pelo que pegou"]');
        const ligado = [...grupo.querySelectorAll('button')].find(
            (b) => b.getAttribute('aria-pressed') === 'true',
        );
        assert.equal(ligado.textContent, 'Originalidade');
        assert.equal(conteudo().querySelector('details').hasAttribute('open'), true);
    });

    it('item desconhecido é ignorado e o filtro Tipo vale para a tabela e para a lista', () => {
        ui.aoAbrirItemPegouLeitura('xx');
        assert.equal(ui.estado.pegou, 'todos');
        ui.aoAbrirItemPegouLeitura('voz');
        ui.aoFiltrarTipoLeitura('poema');
        assert.equal(titulos().length, 0);
        ui.aoFiltrarTipoLeitura('prosa');
        assert.deepEqual(titulos(), ['Carta']);
    });
});

describe('Leitura avaliativa: filtro pelo que incomodou', () => {
    const leit = (id, tipo, textoId, incomodou, extra = {}) => ({
        id,
        textoId,
        tipo,
        data: '2026-11-01',
        pegou: [],
        incomodou,
        releria: null,
        mostraria: null,
        sugerido: null,
        escolhido: null,
        ...extra,
    });
    const titulos = () =>
        [...conteudo().querySelectorAll('#leitura-lista button')].map((b) =>
            b.querySelector('.font-medium').textContent.trim(),
        );

    beforeEach(() => {
        db.poemas[0].autoclassificacao = 0;
        db.poemas[1].autoclassificacao = 3;
        db.leituras = [
            leit(1, 'poema', 1, ['cliche']),
            leit(2, 'poema', 2, ['cliche', 'previsivel'], {
                pegou: [{ item: 'voz', peso: 'forte' }],
            }),
            leit(3, 'prosa', 1, ['problematico']),
        ];
        ui.reiniciarEstado();
        ui.renderLeituraAvaliativa();
    });

    it('a linha Incomodou tem Todos, Algum e os 12 itens, com a descrição ao passar o mouse', () => {
        const grupo = conteudo().querySelector('[aria-label="Filtrar pelo que incomodou"]');
        const botoes = [...grupo.querySelectorAll('button')];
        assert.equal(botoes.length, 14);
        assert.equal(botoes[0].textContent, 'Todos');
        assert.equal(botoes[1].textContent, 'Algum');
        const problematico = botoes.find((b) => b.textContent === 'Problemático');
        assert.match(problematico.title, /reproduz violência/);
        assert.ok(botoes.some((b) => b.textContent === 'Pouco trabalhado'));
    });

    it('escolher um item mostra só os textos que o marcaram, com o item na linha', () => {
        ui.aoFiltrarIncomodouLeitura('cliche');
        assert.deepEqual(titulos(), ['Mar alto', 'Árvore']);
        assert.match(conteudo().querySelector('#leitura-lista').textContent, /Incomodou: Clichê/);
        ui.aoFiltrarIncomodouLeitura('problematico');
        assert.deepEqual(titulos(), ['Carta']);
    });

    it('Todos desfaz o filtro, item desconhecido é ignorado e a busca respeita o item', () => {
        ui.aoFiltrarIncomodouLeitura('cliche');
        ui.aoFiltrarIncomodouLeitura('xx');
        assert.equal(ui.estado.incomodou, 'cliche');
        ui.aoBuscarLeitura('arv');
        assert.deepEqual(titulos(), ['Árvore']);
        ui.aoBuscarLeitura('');
        ui.aoFiltrarIncomodouLeitura('todos');
        assert.equal(titulos().length, 3);
    });

    it('combina com o filtro Pegou e mostra o aviso quando nada resta', () => {
        ui.aoFiltrarIncomodouLeitura('cliche');
        ui.aoFiltrarPegouLeitura('voz');
        assert.deepEqual(titulos(), ['Mar alto']);
        ui.aoFiltrarIncomodouLeitura('problematico');
        assert.match(
            conteudo().querySelector('#leitura-lista').textContent,
            /Nenhum texto com esse filtro/,
        );
    });

    it('a fila de Anterior e Próximo segue a lista filtrada por incomodou', () => {
        ui.aoFiltrarIncomodouLeitura('cliche');
        ui.aoSelecionarTextoLeitura('poema', 2);
        assert.deepEqual(
            ui.estado.fila.map((f) => `${f.tipo}${f.id}`),
            ['poema2', 'poema1'],
        );
    });

    it('reiniciar o estado desfaz o filtro', () => {
        ui.aoFiltrarIncomodouLeitura('cliche');
        ui.reiniciarEstado();
        assert.equal(ui.estado.incomodou, 'todos');
    });

    it('o nome de cada item de "O que incomodou" no padrão é um botão que chama o filtro', () => {
        const botoes = [...conteudo().querySelectorAll('details table button')];
        const cliche = botoes.find((b) => b.textContent === 'Clichê');
        assert.match(cliche.getAttribute('onclick'), /leituraAbrirItemIncomodou\('cliche'\)/);
        assert.match(cliche.title, /Ver os textos que incomodaram por Clichê/);
        assert.match(conteudo().querySelector('details').textContent, /que incomodaram por ele/);
    });

    it('clicar no item do padrão aplica o filtro, mostra a lista e mantém o bloco aberto', () => {
        ui.aoAlternarPadraoLeitura(true);
        ui.aoAbrirItemIncomodouLeitura('previsivel');
        assert.equal(ui.estado.incomodou, 'previsivel');
        assert.deepEqual(titulos(), ['Mar alto']);
        const grupo = conteudo().querySelector('[aria-label="Filtrar pelo que incomodou"]');
        const ligado = [...grupo.querySelectorAll('button')].find(
            (b) => b.getAttribute('aria-pressed') === 'true',
        );
        assert.equal(ligado.textContent, 'Previsível');
        assert.equal(conteudo().querySelector('details').hasAttribute('open'), true);
        ui.aoAbrirItemIncomodouLeitura('xx');
        assert.equal(ui.estado.incomodou, 'previsivel');
    });
});

describe('Leitura avaliativa: opção Algum nos filtros Pegou e Incomodou', () => {
    const leit = (id, tipo, textoId, pegou, incomodou) => ({
        id,
        textoId,
        tipo,
        data: '2026-11-01',
        pegou,
        incomodou,
        releria: null,
        mostraria: null,
        sugerido: null,
        escolhido: null,
    });
    const titulos = () =>
        [...conteudo().querySelectorAll('#leitura-lista button')].map((b) =>
            b.querySelector('.font-medium').textContent.trim(),
        );
    const textoLista = () => conteudo().querySelector('#leitura-lista').textContent;

    beforeEach(() => {
        db.poemas[0].autoclassificacao = 0;
        db.poemas[1].autoclassificacao = 3;
        db.leituras = [
            leit(1, 'poema', 1, [], ['cliche']),
            leit(
                2,
                'poema',
                2,
                [
                    { item: 'voz', peso: 'leve' },
                    { item: 'originalidade', peso: 'centro' },
                ],
                [],
            ),
            leit(3, 'prosa', 1, [], []),
        ];
        ui.reiniciarEstado();
        ui.renderLeituraAvaliativa();
    });

    it('Pegou: Algum mostra só quem marcou algo, dizendo o que, do maior peso para o menor', () => {
        ui.aoFiltrarPegouLeitura('algum');
        assert.deepEqual(titulos(), ['Mar alto']);
        assert.match(textoLista(), /Pegou: Originalidade \(central\), Voz \(pontual\)/);
        const grupo = conteudo().querySelector('[aria-label="Filtrar pelo que pegou"]');
        const ligado = [...grupo.querySelectorAll('button')].find(
            (b) => b.getAttribute('aria-pressed') === 'true',
        );
        assert.equal(ligado.textContent, 'Algum');
    });

    it('Incomodou: Algum mostra só quem marcou algo, dizendo o que', () => {
        ui.aoFiltrarIncomodouLeitura('algum');
        assert.deepEqual(titulos(), ['Árvore']);
        assert.match(textoLista(), /Incomodou: Clichê/);
    });

    it('os dois Algum juntos, e voltar a Todos, funcionam', () => {
        ui.aoFiltrarPegouLeitura('algum');
        ui.aoFiltrarIncomodouLeitura('algum');
        assert.match(textoLista(), /Nenhum texto com esse filtro/);
        ui.aoFiltrarIncomodouLeitura('todos');
        assert.deepEqual(titulos(), ['Mar alto']);
        ui.aoFiltrarPegouLeitura('todos');
        assert.equal(titulos().length, 3);
    });
});

describe('Leitura avaliativa: filtros Releria e Mostraria (F22-D29)', () => {
    const leit = (id, tipo, textoId, releria, mostraria) => ({
        id,
        tipo,
        textoId,
        data: '2026-11-01',
        pegou: [],
        incomodou: [],
        releria,
        mostraria,
        sugerido: null,
        escolhido: null,
    });
    const titulos = () =>
        [...conteudo().querySelectorAll('#leitura-lista button')].map((b) =>
            b.querySelector('.font-medium').textContent.trim(),
        );
    const textoLista = () => conteudo().querySelector('#leitura-lista').textContent;
    const botoesDe = (rotulo) => [
        ...conteudo().querySelectorAll(`[aria-label="${rotulo}"] button`),
    ];

    beforeEach(() => {
        db.leituras = [
            leit(1, 'poema', 1, 'sim', 'nao'),
            leit(2, 'poema', 2, 'sim', null),
            leit(3, 'prosa', 1, null, null),
        ];
        ui.reiniciarEstado();
        ui.renderLeituraAvaliativa();
    });

    it('as linhas Releria e Mostraria existem, com cinco opções cada e Todos ligado', () => {
        for (const rotulo of ['Filtrar por Releria', 'Filtrar por Mostraria a alguém']) {
            const botoes = botoesDe(rotulo);
            assert.deepEqual(
                botoes.map((b) => b.textContent),
                ['Todos', 'Sim', 'Talvez', 'Não', 'Sem resposta'],
            );
            assert.equal(botoes[0].getAttribute('aria-pressed'), 'true');
        }
    });

    it('Releria: Sim mostra só quem respondeu sim, com a resposta na linha', () => {
        ui.aoFiltrarReleriaLeitura('sim');
        assert.deepEqual(titulos(), ['Mar alto', 'Árvore']);
        assert.match(textoLista(), /Releria: sim/);
        assert.doesNotMatch(textoLista(), /Mostraria:/);
        const ligado = botoesDe('Filtrar por Releria').find(
            (b) => b.getAttribute('aria-pressed') === 'true',
        );
        assert.equal(ligado.textContent, 'Sim');
    });

    it('Mostraria: Sem resposta mostra a leitura que deixou em branco', () => {
        ui.aoFiltrarMostrariaLeitura('sem-resposta');
        assert.deepEqual(titulos(), ['Mar alto', 'Carta']);
        assert.match(textoLista(), /Mostraria: sem resposta/);
    });

    it('os dois filtros se combinam: relê, mas não mostraria', () => {
        ui.aoFiltrarReleriaLeitura('sim');
        ui.aoFiltrarMostrariaLeitura('nao');
        assert.deepEqual(titulos(), ['Árvore']);
        assert.match(textoLista(), /Releria: sim/);
        assert.match(textoLista(), /Mostraria: não/);
        ui.aoFiltrarMostrariaLeitura('talvez');
        assert.match(textoLista(), /Nenhum texto com esse filtro/);
    });

    it('valor desconhecido é ignorado, Todos desfaz e a busca respeita o filtro', () => {
        ui.aoFiltrarReleriaLeitura('sim');
        ui.aoFiltrarReleriaLeitura('xx');
        assert.equal(ui.estado.releria, 'sim');
        ui.aoBuscarLeitura('arv');
        assert.deepEqual(titulos(), ['Árvore']);
        ui.aoBuscarLeitura('');
        ui.aoFiltrarReleriaLeitura('todos');
        assert.equal(titulos().length, 3);
    });

    it('a fila de Anterior e Próximo segue a lista filtrada', () => {
        ui.aoFiltrarReleriaLeitura('sim');
        ui.aoSelecionarTextoLeitura('poema', 1);
        assert.deepEqual(
            ui.estado.fila.map((f) => `${f.tipo}:${f.id}`),
            ['poema:2', 'poema:1'],
        );
    });

    it('reiniciar o estado limpa os dois filtros', () => {
        ui.aoFiltrarReleriaLeitura('nao');
        ui.aoFiltrarMostrariaLeitura('sim');
        ui.reiniciarEstado();
        assert.equal(ui.estado.releria, 'todos');
        assert.equal(ui.estado.mostraria, 'todos');
    });
});
