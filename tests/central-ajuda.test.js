import './helpers/dom-real.js';

import { describe, it, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML_CENTRAL_AJUDA = fs.readFileSync(
    path.resolve(__dirname, '../modais/modal-central-ajuda.html'),
    'utf8',
);
const HTML_MODO_APRENDIZADO = fs.readFileSync(
    path.resolve(__dirname, '../modais/modal-modo-aprendizado.html'),
    'utf8',
);

// modais.js carrega cada modal via fetch (lazy), pela URL registrada —
// aqui devolvemos o HTML REAL certo conforme o arquivo pedido, então um
// id renomeado em qualquer um dos dois quebra este teste.
globalThis.fetch = async (url) => ({
    ok: true,
    status: 200,
    text: async () =>
        String(url).includes('modal-central-ajuda') ? HTML_CENTRAL_AJUDA : HTML_MODO_APRENDIZADO,
});
document.body.innerHTML = '<div id="modais-container"></div>';

const { registrarModal, toggleModal } = await import('../js/modais.js');
const ma = await import('../js/modo-aprendizado.js');
const ca = await import('../js/central-ajuda.js');
const tour = await import('../js/tour.js');
const { TAREFAS_COMO_FACO, tarefasPorGrupo } = await import('../js/como-faco-passos.js');
const { CATEGORIAS_FAQ } = await import('../js/faq-conteudo.js');
const { buscarNaAjuda } = await import('../js/busca-ajuda.js');

registrarModal('modal-modo-aprendizado', 'modal-modo-aprendizado.html', ma.initModoAprendizado);
registrarModal('modal-central-ajuda', 'modal-central-ajuda.html', ca.initCentralAjuda);

const el = (id) => document.getElementById(id);
const aberto = (id) => !el(id).classList.contains('hidden');

describe('Central de Ajuda — modal', () => {
    before(async () => {
        await ca.abrirCentralAjuda();
        await toggleModal('modal-central-ajuda');
    });

    beforeEach(() => {
        localStorage.clear();
        el('modal-central-ajuda').classList.add('hidden');
    });

    it('abre e monta as duas listas a partir dos dados', async () => {
        await ca.abrirCentralAjuda();
        assert.ok(aberto('modal-central-ajuda'));

        const itensComoFaco = el('ca-como-faco-lista').querySelectorAll('summary');
        assert.equal(itensComoFaco.length, TAREFAS_COMO_FACO.length);

        const totalPerguntas = CATEGORIAS_FAQ.flatMap((c) => c.perguntas).length;
        const detalhesFaq = el('ca-faq-lista').querySelectorAll('details');
        assert.equal(detalhesFaq.length, totalPerguntas);
    });

    it('o Como eu faço para... mostra um rótulo por grupo, com as tarefas dele logo abaixo', async () => {
        await ca.abrirCentralAjuda();
        const blocos = Array.from(el('ca-como-faco-lista').children);
        const esperado = tarefasPorGrupo();
        assert.equal(blocos.length, esperado.length);
        blocos.forEach((bloco, i) => {
            assert.equal(bloco.querySelector('h5').textContent, esperado[i].rotulo);
            assert.equal(bloco.querySelectorAll('details').length, esperado[i].tarefas.length);
        });
    });

    it('cada tarefa mostra a descrição acima do botão "Mostrar na tela"', async () => {
        await ca.abrirCentralAjuda();
        const itens = el('ca-como-faco-lista').querySelectorAll('details');
        assert.equal(itens.length, TAREFAS_COMO_FACO.length);
        itens.forEach((item, i) => {
            const paragrafo = item.querySelector('p');
            const botao = item.querySelector('button');
            // na tela as tarefas seguem a ordem dos grupos
            const naOrdemDaTela = tarefasPorGrupo().flatMap((g) => g.tarefas);
            assert.equal(paragrafo.textContent, naOrdemDaTela[i].descricao);
            // a descrição vem antes do botão no corpo do item
            assert.ok(paragrafo.compareDocumentPosition(botao) & 4, 'descrição depois do botão');
        });
    });

    it('botão de apresentação diz "Ver" sem perfil salvo', async () => {
        await ca.abrirCentralAjuda();
        assert.equal(el('ca-btn-apresentacao').textContent, 'Ver a apresentação completa');
    });

    it('botão de apresentação diz "Rever" com perfil já salvo', async () => {
        ma.salvarPerfilModoAprendizado('escritor');
        await ca.abrirCentralAjuda();
        assert.equal(el('ca-btn-apresentacao').textContent, 'Rever a apresentação completa');
    });

    it('"Ver/Rever a apresentação" fecha esta e abre o modal do Modo Aprendizado', async () => {
        await ca.abrirCentralAjuda();
        await ca.abrirApresentacaoDaAjuda();
        assert.ok(!aberto('modal-central-ajuda'));
        assert.ok(aberto('modal-modo-aprendizado'));
        await toggleModal('modal-modo-aprendizado'); // devolve ao estado fechado pro próximo teste
    });

    it('"Mostrar na tela" numa tarefa fecha o modal e inicia o mini-tour dela', async () => {
        await ca.abrirCentralAjuda();
        const botao = el('ca-como-faco-lista').querySelector('button');
        botao.dispatchEvent(new Event('click', { bubbles: true }));
        // toggleModal e iniciarTour são assíncronos/imediatos o bastante pra
        // já refletir no próximo tick de microtarefas (mesmo padrão dos
        // outros testes de clique deste arquivo).
        await Promise.resolve();
        await Promise.resolve();
        assert.ok(!aberto('modal-central-ajuda'));
        assert.ok(tour.tourAtivo());
        tour.encerrarTour();
    });
});

describe('Central de Ajuda: caixa de busca', () => {
    function digitar(texto) {
        const caixa = el('ca-busca');
        caixa.value = texto;
        caixa.dispatchEvent(new Event('input', { bubbles: true }));
    }
    function teclar(tecla) {
        el('ca-busca').dispatchEvent(
            new KeyboardEvent('keydown', { key: tecla, bubbles: true, cancelable: true }),
        );
    }
    const visivel = (id) => !el(id).classList.contains('hidden');

    beforeEach(() => {
        localStorage.clear();
        el('modal-central-ajuda').classList.add('hidden');
    });

    it('sem busca mostra tudo recolhido, sem aviso', async () => {
        await ca.abrirCentralAjuda();
        assert.ok(visivel('ca-secao-apresentacao'));
        assert.ok(visivel('ca-secao-como-faco'));
        assert.ok(visivel('ca-secao-faq'));
        assert.ok(!visivel('ca-busca-status'));
        const abertos = el('modal-central-ajuda').querySelectorAll('details[open]');
        assert.equal(abertos.length, 0);
    });

    it('digitar filtra as duas listas e abre o que casa', async () => {
        await ca.abrirCentralAjuda();
        const esperado = buscarNaAjuda('backup');
        assert.ok(esperado.total > 0, 'o termo de teste precisa achar algo');
        digitar('backup');
        const itens = el('modal-central-ajuda').querySelectorAll(
            '#ca-como-faco-lista details, #ca-faq-lista details',
        );
        assert.equal(itens.length, esperado.total);
        assert.ok(Array.from(itens).every((d) => d.open));
        assert.equal(el('ca-busca-status').textContent, `${esperado.total} resultados`);
        assert.ok(visivel('ca-busca-status'));
    });

    it('com busca ativa a apresentação some', async () => {
        await ca.abrirCentralAjuda();
        digitar('backup');
        assert.ok(!visivel('ca-secao-apresentacao'));
    });

    it('grupo e categoria sem achado somem', async () => {
        await ca.abrirCentralAjuda();
        digitar('backup');
        const r = buscarNaAjuda('backup');
        assert.equal(el('ca-como-faco-lista').children.length, r.grupos.length);
        assert.equal(el('ca-faq-lista').children.length, r.categorias.length);
        assert.ok(r.grupos.length < tarefasPorGrupo().length);
    });

    it('seção sem nenhum achado some por inteiro', async () => {
        await ca.abrirCentralAjuda();
        // pergunta inteira da FAQ: acha a própria pergunta; confere o lado vazio pela lógica
        const faq = CATEGORIAS_FAQ[0].perguntas[0].pergunta;
        const r = buscarNaAjuda(faq);
        digitar(faq);
        assert.equal(visivel('ca-secao-como-faco'), r.grupos.length > 0);
        assert.ok(visivel('ca-secao-faq'));
    });

    it('frase entre aspas funciona na tela', async () => {
        await ca.abrirCentralAjuda();
        const titulo = TAREFAS_COMO_FACO[0].titulo;
        digitar(`"${titulo}"`);
        const resumos = Array.from(el('ca-como-faco-lista').querySelectorAll('summary')).map(
            (s) => s.textContent,
        );
        assert.ok(resumos.includes(titulo));
    });

    it('um resultado usa o singular', async () => {
        await ca.abrirCentralAjuda();
        digitar(`"${CATEGORIAS_FAQ[0].perguntas[0].pergunta}"`);
        const r = buscarNaAjuda(`"${CATEGORIAS_FAQ[0].perguntas[0].pergunta}"`);
        if (r.total === 1) assert.equal(el('ca-busca-status').textContent, '1 resultado');
        else assert.equal(el('ca-busca-status').textContent, `${r.total} resultados`);
    });

    it('nada casando mostra a mensagem e esconde as duas seções', async () => {
        await ca.abrirCentralAjuda();
        digitar('zzqxwv');
        assert.ok(visivel('ca-busca-status'));
        assert.match(el('ca-busca-status').textContent, /Nada encontrado/);
        assert.ok(!visivel('ca-secao-como-faco'));
        assert.ok(!visivel('ca-secao-faq'));
        assert.ok(!visivel('ca-secao-apresentacao'));
    });

    it('acha pelo sinônimo das palavras-chave, sem mostrá-lo na tela', async () => {
        await ca.abrirCentralAjuda();
        digitar('zerar');
        const resumos = Array.from(el('ca-como-faco-lista').querySelectorAll('summary')).map(
            (s) => s.textContent,
        );
        assert.ok(
            resumos.some((r) => /recome/i.test(r)),
            'esvaziar o acervo deveria aparecer',
        );
        // a palavra-chave não é texto de tela
        assert.ok(!el('ca-como-faco-lista').textContent.includes('zerar'));
    });

    it('sem item com todas as palavras, avisa e mostra os parciais', async () => {
        await ca.abrirCentralAjuda();
        const consulta = 'esvaziar xyzabc';
        const r = buscarNaAjuda(consulta);
        assert.equal(r.parcial, true);
        digitar(consulta);
        assert.match(
            el('ca-busca-status').textContent,
            /^Nenhum item tem todas as palavras\. Mostrando /,
        );
        assert.match(el('ca-busca-status').textContent, / 1 de 2\.$/);
        const itens = el('modal-central-ajuda').querySelectorAll(
            '#ca-como-faco-lista details, #ca-faq-lista details',
        );
        assert.equal(itens.length, r.total);
    });

    it('apagar o texto à mão volta ao estado de sempre', async () => {
        await ca.abrirCentralAjuda();
        digitar('backup');
        digitar('');
        assert.ok(visivel('ca-secao-apresentacao'));
        assert.ok(visivel('ca-secao-como-faco'));
        assert.ok(visivel('ca-secao-faq'));
        assert.ok(!visivel('ca-busca-status'));
        assert.equal(el('modal-central-ajuda').querySelectorAll('details[open]').length, 0);
        assert.equal(
            el('modal-central-ajuda').querySelectorAll('#ca-como-faco-lista details').length,
            TAREFAS_COMO_FACO.length,
        );
    });

    it('Esc com texto limpa a caixa e restaura as listas', async () => {
        await ca.abrirCentralAjuda();
        digitar('zzqxwv');
        teclar('Escape');
        assert.equal(el('ca-busca').value, '');
        assert.ok(visivel('ca-secao-como-faco'));
        assert.ok(visivel('ca-secao-faq'));
        assert.ok(!visivel('ca-busca-status'));
    });

    it('Esc com a caixa vazia fecha a Central, uma vez só', async () => {
        await ca.abrirCentralAjuda();
        teclar('Escape');
        await Promise.resolve();
        await Promise.resolve();
        assert.ok(!aberto('modal-central-ajuda'));
    });

    it('Esc com texto limpa a caixa e não fecha a Central', async () => {
        await ca.abrirCentralAjuda();
        digitar('zzqxwv');
        teclar('Escape');
        await Promise.resolve();
        assert.ok(aberto('modal-central-ajuda'));
    });

    it('reabrir a Central zera a busca', async () => {
        await ca.abrirCentralAjuda();
        digitar('zzqxwv');
        await toggleModal('modal-central-ajuda'); // fecha
        await ca.abrirCentralAjuda();
        assert.equal(el('ca-busca').value, '');
        assert.ok(visivel('ca-secao-como-faco'));
        assert.ok(visivel('ca-secao-faq'));
        assert.ok(!visivel('ca-busca-status'));
    });

    it('"Mostrar na tela" continua funcionando num resultado de busca', async () => {
        await ca.abrirCentralAjuda();
        digitar(`"${TAREFAS_COMO_FACO[0].titulo}"`);
        const botao = el('ca-como-faco-lista').querySelector('button');
        botao.dispatchEvent(new Event('click', { bubbles: true }));
        await Promise.resolve();
        await Promise.resolve();
        assert.ok(!aberto('modal-central-ajuda'));
        assert.ok(tour.tourAtivo());
        tour.encerrarTour();
    });
});

describe('Central de Ajuda: resposta do FAQ em blocos', () => {
    it('a resposta reformatada vira parágrafos, lista e negrito, sem HTML solto', async () => {
        await ca.abrirCentralAjuda();
        const detalhes = Array.from(el('ca-faq-lista').querySelectorAll('details')).find((d) =>
            d.querySelector('summary').textContent.startsWith('Como funciona a Leitura avaliativa'),
        );
        assert.ok(detalhes, 'pergunta não encontrada');
        const corpo = detalhes.querySelector('.campo-grupo-corpo');
        assert.ok(corpo.querySelectorAll('p').length > 3, 'parágrafos');
        assert.ok(corpo.querySelectorAll('ul li').length > 5, 'itens de lista');
        assert.ok(corpo.querySelector('strong'), 'negrito');
        assert.ok(corpo.querySelector('code'), 'código');
        assert.ok(!corpo.textContent.includes('**'), 'sinal de negrito aparecendo');
    });
});

describe('Central de Ajuda: Expandir tudo e Recolher tudo', () => {
    const abertos = (lista) =>
        Array.from(el(lista).querySelectorAll('details')).filter((d) => d.open).length;
    const total = (lista) => el(lista).querySelectorAll('details').length;

    it('cada lista expande e recolhe só os próprios itens', async () => {
        await ca.abrirCentralAjuda();
        assert.equal(abertos('ca-faq-lista'), 0);
        assert.equal(abertos('ca-como-faco-lista'), 0);

        el('ca-faq-expandir').click();
        assert.equal(abertos('ca-faq-lista'), total('ca-faq-lista'));
        assert.equal(abertos('ca-como-faco-lista'), 0, 'a outra lista não mexe');

        el('ca-faq-recolher').click();
        assert.equal(abertos('ca-faq-lista'), 0);

        el('ca-como-faco-expandir').click();
        assert.equal(abertos('ca-como-faco-lista'), total('ca-como-faco-lista'));
        assert.equal(abertos('ca-faq-lista'), 0);
        el('ca-como-faco-recolher').click();
        assert.equal(abertos('ca-como-faco-lista'), 0);
    });

    it('com a busca ativa, expandir só alcança os achados', async () => {
        await ca.abrirCentralAjuda();
        const caixa = el('ca-busca');
        caixa.value = 'sorteio';
        caixa.dispatchEvent(new Event('input'));
        el('ca-faq-recolher').click();
        assert.equal(abertos('ca-faq-lista'), 0);
        el('ca-faq-expandir').click();
        assert.equal(abertos('ca-faq-lista'), total('ca-faq-lista'));
        assert.ok(total('ca-faq-lista') < CATEGORIAS_FAQ.flatMap((c) => c.perguntas).length);
    });
});
