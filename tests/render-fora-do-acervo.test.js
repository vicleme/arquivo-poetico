import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// T9, entrega 2: a seção "Fora do acervo" da aba Conexões.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const i = html.indexOf('<section id="conexoes"');
const f = html.indexOf('<section id="sonoridade"', i);
assert.ok(i !== -1 && f !== -1);
document.body.innerHTML = `<main>${html.slice(i, f)}</main>`;

const { db } = await import('../js/db.js');
const { renderConexoes } = await import('../js/render-conexoes.js');
const { htmlForaDoAcervo, setFiltroForaDoAcervo, setOrdemForaDoAcervo } =
    await import('../js/render-fora-do-acervo.js');
const { montarForaDoAcervo } = await import('../js/fora-do-acervo.js');

const el = (id) => document.getElementById(id);

function cenario() {
    Object.assign(db, {
        livros: [],
        partes: [],
        secoes: [],
        elementos: [],
        itensColetanea: [],
        poemas: [
            {
                id: 1,
                titulo: 'Águas <b>',
                intertextualidade: [
                    {
                        relacao: 'Citação',
                        tipoObra: 'Música',
                        obra: 'Águas de Março',
                        autor: 'Tom Jobim',
                    },
                ],
                referenciasExternas: [{ tipo: 'Marco histórico', texto: 'Enchente de 2011' }],
            },
            {
                id: 2,
                titulo: 'Casmurro',
                intertextualidade: [
                    {
                        relacao: 'Alusão',
                        tipoObra: 'Música',
                        obra: 'aguas de março',
                        autor: 'tom jobim',
                    },
                ],
                hipertextualidade: [
                    {
                        relacao: 'Paródia',
                        tipoObra: 'Livro',
                        hipotexto: 'Dom Casmurro',
                        autor: 'Machado de Assis',
                    },
                ],
                referenciasExternas: [{ tipo: 'Marco histórico', texto: 'Enchente de 2011' }],
            },
        ],
        prosas: [
            {
                id: 7,
                titulo: 'Conto',
                intertextualidade: [
                    { relacao: 'Menção', tipoObra: 'Música', obra: 'Águas de Março', autor: '' },
                ],
                referenciasExternas: [{ tipo: 'Notícia', texto: 'Só uma vez' }],
            },
        ],
    });
}

describe('seção Fora do acervo na aba Conexões', () => {
    beforeEach(cenario);

    it('a aba tem as duas seções recolhíveis, abertas, e o contêiner novo', () => {
        assert.ok(el('conexoes-dentro'));
        assert.ok(el('conexoes-fora-secao'));
        assert.ok(el('conexoes-fora'));
        assert.equal(el('conexoes-dentro').open, true);
        assert.equal(el('conexoes-fora-secao').open, true);
        ['conexoes-buracos', 'conexoes-elos', 'conexoes-ecos'].forEach((id) =>
            assert.ok(el('conexoes-dentro').contains(el(id)), id),
        );
    });

    it('renderConexoes desenha a seção com resumo, obras, autores, derivações e referências', () => {
        renderConexoes();
        const t = el('conexoes-fora').textContent;
        assert.match(t, /3 textos/);
        assert.match(t, /Águas de Março/);
        assert.match(t, /Tom Jobim/);
        assert.match(t, /Dom Casmurro/);
        assert.match(t, /Enchente de 2011/);
    });

    it('o título abre o Ver do poema ou da prosa, e a prosa vem marcada', () => {
        renderConexoes();
        const raiz = el('conexoes-fora');
        // Nas listas de Obras, Autores e Referências o título abre o Ver já com o
        // Anterior/Próximo da lista (ação 'ver-texto-da-lista', com o tipo).
        assert.ok(
            raiz.querySelector(
                '[data-lista-textos] [data-action="ver-texto-da-lista"][data-tipo="poema"][data-id="2"]',
            ),
        );
        const prosa = raiz.querySelector(
            '[data-lista-textos] [data-action="ver-texto-da-lista"][data-tipo="prosa"][data-id="7"]',
        );
        assert.ok(prosa);
        assert.match(prosa.parentElement.textContent, /prosa/i);
    });

    it('referência de um texto só vai para uma seção recolhida, fechada por padrão', () => {
        renderConexoes();
        const unicas = el('conexoes-fora-referencias-unicas');
        assert.ok(unicas);
        assert.equal(unicas.open, false);
        assert.match(unicas.textContent, /1 referência em um texto só/);
        assert.match(unicas.textContent, /Só uma vez/);
        // a recorrente continua na lista principal, fora da seção recolhida
        assert.doesNotMatch(unicas.textContent, /Enchente de 2011/);
    });

    it('sem referência de um texto só, não cria a seção recolhida', () => {
        db.poemas.forEach(
            (p) => (p.referenciasExternas = [{ tipo: 'Marco histórico', texto: 'Igual' }]),
        );
        db.prosas = [];
        renderConexoes();
        assert.equal(el('conexoes-fora-referencias-unicas'), null);
    });

    it('mostra os avisos de quase-duplicata', () => {
        renderConexoes();
        const t = el('conexoes-fora').textContent;
        assert.match(t, /Mesma obra escrita de jeitos diferentes/);
        assert.match(t, /Mesmo título com autor diferente ou sem autor/);
        assert.match(t, /sem autor/);
    });

    it('escapa o título do texto', () => {
        renderConexoes();
        assert.equal(el('conexoes-fora').querySelector('b'), null);
        assert.match(el('conexoes-fora').innerHTML, /Águas &lt;b&gt;/);
    });

    it('acervo sem nada mostra a mensagem vazia', () => {
        db.poemas = [{ id: 1, titulo: 'A' }];
        db.prosas = [];
        renderConexoes();
        assert.match(el('conexoes-fora').textContent, /Nenhuma Intertextualidade/);
    });

    it('sem o contêiner na página, não quebra', () => {
        const antes = el('conexoes-fora');
        antes.id = 'outro';
        assert.doesNotThrow(() => renderConexoes());
        antes.id = 'conexoes-fora';
    });
});

describe('htmlForaDoAcervo', () => {
    it('é só leitura: não traz caixa de seleção nem botão de editar', () => {
        cenario();
        const out = htmlForaDoAcervo(montarForaDoAcervo({ poemas: db.poemas, prosas: db.prosas }));
        assert.doesNotMatch(out, /type="checkbox"/);
        assert.doesNotMatch(out, /editar-poema/);
    });
});

describe('filtro das listas de Obras e Autores', () => {
    beforeEach(() => {
        cenario();
        el('conexoes-fora-filtro').value = '';
        setFiltroForaDoAcervo('');
        renderConexoes();
    });

    it('o campo existe e fica visível quando há dados', () => {
        assert.ok(el('conexoes-fora-filtro'));
        assert.equal(el('conexoes-fora-filtro-caixa').classList.contains('hidden'), false);
    });

    it('esconde o campo quando não há nada fora do acervo', () => {
        db.poemas = [{ id: 1, titulo: 'A' }];
        db.prosas = [];
        renderConexoes();
        assert.equal(el('conexoes-fora-filtro-caixa').classList.contains('hidden'), true);
    });

    it('filtra as obras sem acento nem caixa e mostra a contagem', () => {
        setFiltroForaDoAcervo('DOM casmurro');
        const obras = el('conexoes-fora-obras').textContent;
        assert.match(obras, /Dom Casmurro/);
        assert.doesNotMatch(obras, /Águas de Março/);
        assert.match(obras, /Mostrando 1 de 3 obras/);
    });

    it('acha a obra pelo título de um texto que a usa', () => {
        setFiltroForaDoAcervo('conto');
        assert.match(el('conexoes-fora-obras').textContent, /Águas de Março/);
    });

    it('filtra também os autores', () => {
        setFiltroForaDoAcervo('machado');
        const autores = el('conexoes-fora-autores').textContent;
        assert.match(autores, /Machado de Assis/);
        assert.doesNotMatch(autores, /Tom Jobim/);
    });

    it('sem resultado, avisa; limpar o campo traz a lista inteira de volta', () => {
        setFiltroForaDoAcervo('zzzz');
        assert.match(el('conexoes-fora-obras').textContent, /Nenhuma obra combina com o filtro/);
        setFiltroForaDoAcervo('');
        assert.match(el('conexoes-fora-obras').textContent, /Dom Casmurro/);
        assert.match(el('conexoes-fora-obras').textContent, /Águas de Março/);
        assert.doesNotMatch(el('conexoes-fora-obras').textContent, /Mostrando/);
    });

    it('só mexe nas listas de Obras e Autores: o que foi aberto nas outras partes continua', () => {
        const unicas = el('conexoes-fora-referencias-unicas');
        unicas.open = true;
        setFiltroForaDoAcervo('casmurro');
        assert.equal(el('conexoes-fora-referencias-unicas'), unicas);
        assert.equal(el('conexoes-fora-referencias-unicas').open, true);
    });

    it('o filtro continua valendo quando a aba é redesenhada', () => {
        setFiltroForaDoAcervo('dom casmurro');
        renderConexoes();
        assert.match(el('conexoes-fora-obras').textContent, /Mostrando 1 de 3 obras/);
    });

    it('não filtra Hipertextualidade, referências nem avisos', () => {
        setFiltroForaDoAcervo('casmurro');
        const t = el('conexoes-fora').textContent;
        assert.match(t, /Enchente de 2011/);
        assert.match(t, /Mesma obra escrita de jeitos diferentes/);
    });
});

describe('ordem das listas de Obras e Autores na tela', () => {
    const ordemNaTela = (id, nomes) =>
        nomes
            .map((n) => [n, el(id).textContent.indexOf(n)])
            .sort((a, b) => a[1] - b[1])
            .map((x) => x[0]);

    beforeEach(() => {
        cenario();
        db.poemas.push({
            id: 9,
            titulo: 'Extra',
            intertextualidade: [
                { relacao: 'Citação', tipoObra: 'Livro', obra: 'Abecedário', autor: 'Zé Autor' },
            ],
        });
        el('conexoes-fora-filtro').value = '';
        setFiltroForaDoAcervo('');
        setOrdemForaDoAcervo('textos');
        el('conexoes-fora-ordem').value = 'textos';
        renderConexoes();
    });

    it('o seletor existe, abre em "Mais textos primeiro" e tem a opção alfabética', () => {
        const sel = el('conexoes-fora-ordem');
        assert.ok(sel);
        assert.equal(sel.value, 'textos');
        assert.deepEqual(
            [...sel.options].map((o) => o.value),
            ['textos', 'alfabetica', 'data-antiga', 'data-recente'],
        );
        assert.ok(el('conexoes-fora-filtro-caixa').contains(sel));
    });

    it('por padrão, a obra em mais textos vem antes (Águas de Março antes de Abecedário)', () => {
        assert.deepEqual(ordemNaTela('conexoes-fora-obras', ['Águas de Março', 'Abecedário']), [
            'Águas de Março',
            'Abecedário',
        ]);
    });

    it('alfabética: Abecedário passa na frente, nas Obras e nos Autores', () => {
        setOrdemForaDoAcervo('alfabetica');
        assert.deepEqual(ordemNaTela('conexoes-fora-obras', ['Águas de Março', 'Abecedário']), [
            'Abecedário',
            'Águas de Março',
        ]);
        assert.deepEqual(ordemNaTela('conexoes-fora-autores', ['Zé Autor', 'Tom Jobim']), [
            'Tom Jobim',
            'Zé Autor',
        ]);
    });

    it('voltar para "textos" restaura a ordem de sempre', () => {
        setOrdemForaDoAcervo('alfabetica');
        setOrdemForaDoAcervo('textos');
        assert.deepEqual(ordemNaTela('conexoes-fora-obras', ['Águas de Março', 'Abecedário']), [
            'Águas de Março',
            'Abecedário',
        ]);
    });

    it('a ordem escolhida continua quando a aba é redesenhada e vale junto com o filtro', () => {
        setOrdemForaDoAcervo('alfabetica');
        renderConexoes();
        assert.deepEqual(ordemNaTela('conexoes-fora-obras', ['Águas de Março', 'Abecedário']), [
            'Abecedário',
            'Águas de Março',
        ]);
        setFiltroForaDoAcervo('abecedario');
        assert.match(el('conexoes-fora-obras').textContent, /Mostrando 1 de 4 obras/);
    });

    it('valor desconhecido volta para "textos"; só mexe em Obras e Autores', () => {
        const unicas = el('conexoes-fora-referencias-unicas');
        unicas.open = true;
        setOrdemForaDoAcervo('alfabetica');
        setOrdemForaDoAcervo('bobagem');
        assert.deepEqual(ordemNaTela('conexoes-fora-obras', ['Águas de Março', 'Abecedário']), [
            'Águas de Março',
            'Abecedário',
        ]);
        assert.equal(el('conexoes-fora-referencias-unicas'), unicas);
        assert.equal(el('conexoes-fora-referencias-unicas').open, true);
    });
});

describe('blocos recolhíveis da seção Fora do acervo', () => {
    const CHAVE = 'arquivoPoetico_blocosConexoesFechados';
    const bloco = (chave) =>
        el('conexoes-fora').querySelector(`details[data-bloco-conexoes="${chave}"]`);
    // O estado é gravado logo depois do clique (depois de o navegador trocar o
    // `open`), então os testes esperam um instante.
    const clicarTitulo = async (chave) => {
        bloco(chave).querySelector('summary[data-bloco-resumo]').click();
        await new Promise((r) => setTimeout(r, 5));
    };
    const clicarBotao = (acao) =>
        el('conexoes-fora').querySelector(`button[data-bloco-acao="${acao}"]`).click();

    beforeEach(() => {
        cenario();
        localStorage.removeItem(CHAVE);
        setFiltroForaDoAcervo('');
        renderConexoes();
    });

    it('os seis blocos são recolhíveis, abertos por padrão, com a contagem no título', () => {
        [
            'obras',
            'autores',
            'origens',
            'hipertextualidade',
            'referencias',
            'quase-duplicatas',
        ].forEach((c) => {
            assert.ok(bloco(c), c);
            assert.equal(bloco(c).open, true, c);
        });
        assert.match(bloco('obras').querySelector('summary').textContent, /^Obras \(\d+\)$/);
        assert.match(bloco('autores').querySelector('summary').textContent, /^Autores \(\d+\)$/);
        assert.match(
            bloco('referencias').querySelector('summary').textContent,
            /^Referências recorrentes \(1\)$/,
        );
    });

    it('os ids do conteúdo de Obras e Autores continuam os mesmos, dentro do bloco', () => {
        assert.ok(bloco('obras').contains(el('conexoes-fora-obras')));
        assert.ok(bloco('autores').contains(el('conexoes-fora-autores')));
    });

    it('clicar no título fecha o bloco e guarda; reabrir tira da lista guardada', async () => {
        await clicarTitulo('autores');
        assert.equal(bloco('autores').open, false);
        assert.deepEqual(JSON.parse(localStorage.getItem(CHAVE)), ['autores']);
        await clicarTitulo('autores');
        assert.equal(bloco('autores').open, true);
        assert.deepEqual(JSON.parse(localStorage.getItem(CHAVE)), []);
    });

    it('o estado guardado vale quando a aba é redesenhada', async () => {
        await clicarTitulo('hipertextualidade');
        renderConexoes();
        assert.equal(bloco('hipertextualidade').open, false);
        assert.equal(bloco('obras').open, true);
    });

    it('Recolher tudo e Expandir tudo', () => {
        clicarBotao('recolher');
        [
            'obras',
            'autores',
            'origens',
            'hipertextualidade',
            'referencias',
            'quase-duplicatas',
        ].forEach((c) => assert.equal(bloco(c).open, false, c));
        renderConexoes();
        assert.equal(bloco('obras').open, false);
        clicarBotao('expandir');
        [
            'obras',
            'autores',
            'origens',
            'hipertextualidade',
            'referencias',
            'quase-duplicatas',
        ].forEach((c) => assert.equal(bloco(c).open, true, c));
        assert.deepEqual(JSON.parse(localStorage.getItem(CHAVE)), []);
    });

    it('os cartões de dentro (cada obra) continuam abrindo sem mexer no estado dos blocos', () => {
        const cartao = bloco('obras').querySelector('details:not([data-bloco-conexoes]) summary');
        assert.ok(cartao);
        cartao.click();
        assert.equal(localStorage.getItem(CHAVE), null);
    });

    it('com busca ativa, Obras, Autores e Origens abrem sozinhos sem mudar o que foi guardado', () => {
        clicarBotao('recolher');
        setFiltroForaDoAcervo('casmurro');
        assert.equal(bloco('obras').open, true);
        assert.equal(bloco('autores').open, true);
        assert.equal(bloco('origens').open, true);
        assert.equal(bloco('hipertextualidade').open, false);
        assert.equal(JSON.parse(localStorage.getItem(CHAVE)).length, 6);
        setFiltroForaDoAcervo('');
        assert.equal(bloco('obras').open, false);
        assert.equal(bloco('autores').open, false);
    });

    it('a busca abre os blocos também no redesenho da aba', () => {
        clicarBotao('recolher');
        setFiltroForaDoAcervo('casmurro');
        renderConexoes();
        assert.equal(bloco('obras').open, true);
        setFiltroForaDoAcervo('');
    });
});

describe('bloco Origens da seção Fora do acervo', () => {
    const comOrigens = () => {
        cenario();
        db.poemas[0].intertextualidade[0].origemObra = ['Brasil'];
        db.poemas[1].intertextualidade[0].origemObra = ['brasil'];
        db.prosas[0].intertextualidade[0].origemObra = ['Brasil', 'Portugal'];
        setFiltroForaDoAcervo('');
        setOrdemForaDoAcervo('textos');
        renderConexoes();
    };

    beforeEach(comOrigens);

    it('lista cada origem com a contagem no título do bloco e no cartão', () => {
        const caixa = el('conexoes-fora-origens');
        assert.ok(caixa);
        assert.match(caixa.textContent, /Brasil/);
        assert.match(caixa.textContent, /Portugal/);
        assert.match(caixa.textContent, /Sem origem preenchida/);
        const titulo = caixa.closest('details').querySelector('summary').textContent;
        assert.equal(titulo, 'Origens (2)');
        assert.match(caixa.textContent, /3 textos · 2 obras · 1 autor/);
    });

    it('o botão leva o nome e os ids dos textos, só nas origens com valor', () => {
        const botoes = el('conexoes-fora-origens').querySelectorAll(
            'button[data-action="abrir-lista-origem"]',
        );
        assert.equal(botoes.length, 2);
        const brasil = [...botoes].find((b) => b.dataset.origem === 'Brasil');
        assert.equal(brasil.dataset.poemas, '1,2');
        assert.equal(brasil.dataset.prosas, '7');
        const portugal = [...botoes].find((b) => b.dataset.origem === 'Portugal');
        assert.equal(portugal.dataset.poemas, '');
        assert.equal(portugal.dataset.prosas, '7');
    });

    it('os títulos da lista de textos abrem o Ver com o rótulo da origem', () => {
        const lista = el('conexoes-fora-origens').querySelector('[data-lista-textos]');
        assert.equal(lista.dataset.rotulo, 'Origem: Brasil');
    });

    it('o filtro e a ordem redesenham as origens', () => {
        setFiltroForaDoAcervo('portugal');
        const t = el('conexoes-fora-origens').textContent;
        assert.match(t, /Mostrando 1 de 3 origens/);
        assert.doesNotMatch(t, /Brasil/);
        setFiltroForaDoAcervo('xyz');
        assert.match(
            el('conexoes-fora-origens').textContent,
            /Nenhuma origem combina com o filtro/,
        );
        setFiltroForaDoAcervo('');
        setOrdemForaDoAcervo('alfabetica');
        const nomes = [
            ...el('conexoes-fora-origens').querySelectorAll('summary .font-semibold'),
        ].map((n) => n.textContent);
        assert.deepEqual(nomes, ['Brasil', 'Portugal', 'Sem origem preenchida']);
        setOrdemForaDoAcervo('textos');
    });

    it('escapa a origem no HTML e no botão', () => {
        db.poemas[0].intertextualidade[0].origemObra = ['<i>Terra</i> "X"'];
        renderConexoes();
        const caixa = el('conexoes-fora-origens');
        assert.equal(caixa.querySelector('i'), null);
        assert.match(caixa.innerHTML, /&lt;i&gt;Terra&lt;\/i&gt;/);
    });
});

describe('chips das obras e dos autores', () => {
    const comOrigens = () => {
        cenario();
        db.poemas[0].intertextualidade[0].origemObra = ['Brasil'];
        db.poemas[1].intertextualidade[0].origemObra = ['brasil'];
        db.prosas[0].intertextualidade[0].origemObra = ['Brasil', 'Portugal'];
        db.poemas[1].hipertextualidade[0].origemObra = ['Brasil'];
        setFiltroForaDoAcervo('');
        setOrdemForaDoAcervo('textos');
        renderConexoes();
    };

    beforeEach(comOrigens);

    const cartaoDe = (origem) =>
        [...el('conexoes-fora-origens').querySelectorAll('details')].find(
            (d) => d.querySelector('summary .font-semibold')?.textContent === origem,
        );

    it('o cartão da origem mostra um chip por obra, com o autor em cinza', () => {
        const chips = [...cartaoDe('Brasil').querySelectorAll('[data-chip]')];
        const obras = chips.filter((c) => /Águas de Março|Dom Casmurro/.test(c.textContent));
        // Águas de Março com autor, Águas de Março sem autor e Dom Casmurro.
        assert.equal(obras.length, 3);
        const aguas = obras.find((c) => /Tom Jobim/.test(c.textContent));
        assert.equal(aguas.children[0].textContent, 'Águas de Março');
        assert.equal(aguas.children[1].textContent, '· Tom Jobim');
        assert.doesNotMatch(aguas.textContent, /[“”"()]/);
    });

    it('título com vírgula e parênteses fica num chip só, sem aspas nem parênteses', () => {
        db.poemas[0].intertextualidade[0].obra = 'Quantas vezes (...) amor, de deus';
        db.poemas[0].intertextualidade[0].autor = 'Pedro Maia';
        renderConexoes();
        const chip = [...cartaoDe('Brasil').querySelectorAll('[data-chip]')].find((c) =>
            c.textContent.includes('amor, de deus'),
        );
        assert.ok(chip);
        assert.equal(chip.children[0].textContent, 'Quantas vezes (...) amor, de deus');
        assert.equal(chip.children[1].textContent, '· Pedro Maia');
    });

    it('obra sem autor é só o título', () => {
        const chip = [...el('conexoes-fora-origens').querySelectorAll('[data-chip]')].find(
            (c) => c.children[0].textContent === 'Águas de Março' && c.children.length === 1,
        );
        assert.ok(chip, 'a obra sem autor (da prosa) tem chip sem texto de apoio');
    });

    it('os chips são estáticos: sem ação de clique', () => {
        const chips = el('conexoes-fora').querySelectorAll('[data-chip]');
        assert.ok(chips.length > 0);
        chips.forEach((c) => {
            assert.equal(c.getAttribute('data-action'), null);
            assert.doesNotMatch(c.className, /cursor-pointer|hover:/);
        });
    });

    it('o cartão do autor mostra as obras dele em chips, com a contagem de textos', () => {
        const autores = [...el('conexoes-fora-autores').querySelectorAll('details')];
        const jobim = autores.find(
            (d) => d.querySelector('summary .font-semibold').textContent === 'Tom Jobim',
        );
        const chips = [...jobim.querySelectorAll('summary [data-chip]')];
        assert.equal(chips.length, 1);
        assert.equal(chips[0].children[0].textContent, 'Águas de Março');
        assert.match(chips[0].children[1].textContent, /2 textos/);
    });

    it('o rótulo das listas do cartão da origem não leva dois-pontos', () => {
        const rotulos = [...cartaoDe('Brasil').querySelectorAll('p')].map((p) => p.textContent);
        assert.deepEqual(rotulos, ['Obras', 'Autores']);
    });
});

describe('filtro por campo na aba Conexões', () => {
    beforeEach(() => {
        cenario();
        db.poemas[0].intertextualidade[0].origemObra = ['Brasil'];
        db.prosas[0].intertextualidade[0].origemObra = ['Brasil', 'Portugal'];
        setFiltroForaDoAcervo('');
        setOrdemForaDoAcervo('textos');
        renderConexoes();
    });

    const nomesNaLista = (id) =>
        [...el(id).querySelectorAll(':scope > details > summary > span.font-semibold')].map(
            (n) => n.textContent,
        );

    it('campo:valor filtra as três listas e a contagem aparece', () => {
        setFiltroForaDoAcervo('tipo:livro');
        assert.deepEqual(nomesNaLista('conexoes-fora-obras'), ['Dom Casmurro']);
        assert.match(el('conexoes-fora-obras').textContent, /Mostrando 1 de 3 obras/);
        assert.deepEqual(nomesNaLista('conexoes-fora-autores'), ['Machado de Assis']);
        assert.match(el('conexoes-fora-autores').textContent, /Mostrando 1 de 2 autores/);
    });

    it('-origem:* deixa só o que está sem origem, também nas Origens', () => {
        setFiltroForaDoAcervo('-origem:*');
        assert.deepEqual(nomesNaLista('conexoes-fora-obras'), ['Dom Casmurro']);
        assert.deepEqual(nomesNaLista('conexoes-fora-origens'), ['Sem origem preenchida']);
    });

    it('sem resultado diz que nada combina', () => {
        setFiltroForaDoAcervo('origem:Marte');
        assert.match(el('conexoes-fora-obras').textContent, /Nenhuma obra combina com o filtro/);
        assert.match(el('conexoes-fora-origens').textContent, /Nenhuma origem combina/);
        setFiltroForaDoAcervo('');
    });

    it('a busca abre os blocos, e o estado guardado volta ao limpar', () => {
        const bloco = (c) => document.querySelector(`details[data-bloco-conexoes="${c}"]`);
        bloco('obras').open = false;
        setFiltroForaDoAcervo('autor:tom');
        assert.equal(bloco('obras').open, true);
        setFiltroForaDoAcervo('');
    });
});

describe('sugestões na caixa de filtro da aba Conexões', () => {
    const caixa = () => el('conexoes-fora-filtro');
    const painel = () => el('conexoes-fora-sugestoes');
    const linhas = () => [...painel().querySelectorAll('[data-indice]')];
    const digitar = (texto) => {
        caixa().value = texto;
        caixa().dispatchEvent(new window.Event('input', { bubbles: true }));
    };
    const tecla = (key) =>
        caixa().dispatchEvent(
            new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
        );
    const nomesDeObras = () =>
        [
            ...el('conexoes-fora-obras').querySelectorAll(
                ':scope > details > summary > span.font-semibold',
            ),
        ].map((n) => n.textContent);

    beforeEach(() => {
        cenario();
        db.poemas[0].intertextualidade[0].origemObra = ['Brasil'];
        db.prosas[0].intertextualidade[0].origemObra = ['Brasil', 'Portugal'];
        setFiltroForaDoAcervo('');
        renderConexoes();
        caixa().value = '';
        digitar('');
    });

    it('o markup tem a caixinha escondida e a ajuda "Como filtrar"', () => {
        assert.ok(painel());
        assert.equal(painel().classList.contains('hidden'), true);
        assert.match(el('conexoes-fora-ajuda-busca').textContent, /campo:valor/);
        assert.match(el('conexoes-fora-ajuda-busca').textContent, /relacao:/);
    });

    it('digitar um prefixo abre as opções; sem relação, fecha', () => {
        digitar('or');
        assert.equal(painel().classList.contains('hidden'), false);
        assert.deepEqual(
            linhas().map((l) => l.firstChild.textContent),
            ['origem:'],
        );
        digitar('zzz');
        assert.equal(painel().classList.contains('hidden'), true);
    });

    it('Enter aplica a sugestão, filtra as listas e segue oferecendo', () => {
        digitar('tipo:li');
        tecla('Enter');
        assert.equal(caixa().value, 'tipo:Livro ');
        assert.deepEqual(nomesDeObras(), ['Dom Casmurro']);
    });

    it('o clique (mousedown) aplica a linha', () => {
        digitar('origem:por');
        linhas()[0].dispatchEvent(
            new window.MouseEvent('mousedown', { bubbles: true, cancelable: true }),
        );
        assert.equal(caixa().value, 'origem:Portugal ');
        assert.deepEqual(nomesDeObras(), ['Águas de Março']);
    });

    it('o Esc fecha e as setas movem a escolha', () => {
        digitar('origem:');
        tecla('ArrowDown');
        const escolhida = linhas().findIndex((l) => l.getAttribute('aria-selected') === 'true');
        assert.equal(escolhida, 1);
        tecla('Escape');
        assert.equal(painel().classList.contains('hidden'), true);
    });

    it('desligado o estado da caixa de busca do Modo revisão: as duas caixas não se misturam', () => {
        assert.notEqual(caixa().id, 'revisao-busca');
        assert.notEqual(painel().id, 'revisao-sugestoes');
    });
});

describe('subtítulos recolhíveis de Dentro do acervo', () => {
    const CHAVE = 'arquivoPoetico_blocosConexoesFechados';
    const bloco = (chave) =>
        el('conexoes-dentro').querySelector(`details[data-bloco-dentro="${chave}"]`);
    const clicarTitulo = async (chave) => {
        bloco(chave).querySelector('summary[data-bloco-dentro-resumo]').click();
        await new Promise((r) => setTimeout(r, 5));
    };
    const clicarBotao = (acao) =>
        el('conexoes-dentro').querySelector(`button[data-bloco-dentro-acao="${acao}"]`).click();

    beforeEach(() => {
        cenario();
        localStorage.removeItem(CHAVE);
        setFiltroForaDoAcervo('');
        renderConexoes();
    });

    it('Buracos, Elos e Ecos são recolhíveis, abertos por padrão, com a contagem no título', () => {
        ['buracos', 'elos', 'ecos'].forEach((c) => {
            assert.ok(bloco(c), c);
            assert.equal(bloco(c).open, true, c);
        });
        const titulo = (c) => bloco(c).querySelector('summary').textContent.trim();
        assert.equal(titulo('buracos'), '⚠️ Buracos (Elos com só um lado cadastrado) (0)');
        assert.equal(titulo('elos'), 'Elos (pares e clusters) (0)');
        assert.equal(titulo('ecos'), 'Ecos (cadeias) (0)');
    });

    it('a contagem acompanha os dados', () => {
        db.poemas[0].elos = [{ id: 2, tipo: 'Eco', bilateral: true }];
        renderConexoes();
        const n = (id) => el(id).textContent;
        assert.match(n('conexoes-buracos-contagem'), /^ \(\d+\)$/);
        assert.match(n('conexoes-elos-contagem'), /^ \(\d+\)$/);
        assert.match(n('conexoes-ecos-contagem'), /^ \(\d+\)$/);
    });

    it('os contêineres de conteúdo continuam com os mesmos ids, dentro do bloco', () => {
        assert.ok(bloco('buracos').contains(el('conexoes-buracos')));
        assert.ok(bloco('elos').contains(el('conexoes-elos')));
        assert.ok(bloco('ecos').contains(el('conexoes-ecos')));
    });

    it('clicar no título fecha, guarda e sobrevive ao redesenho; reabrir tira da lista', async () => {
        await clicarTitulo('elos');
        assert.equal(bloco('elos').open, false);
        assert.deepEqual(JSON.parse(localStorage.getItem(CHAVE)), ['elos']);
        renderConexoes();
        assert.equal(bloco('elos').open, false);
        assert.equal(bloco('buracos').open, true);
        await clicarTitulo('elos');
        assert.equal(bloco('elos').open, true);
        assert.deepEqual(JSON.parse(localStorage.getItem(CHAVE)), []);
    });

    it('Recolher tudo e Expandir tudo de Dentro não mexem nos blocos de Fora, e vice-versa', async () => {
        const foraBloco = (c) =>
            el('conexoes-fora').querySelector(`details[data-bloco-conexoes="${c}"]`);
        const foraTitulo = async (c) => {
            foraBloco(c).querySelector('summary[data-bloco-resumo]').click();
            await new Promise((r) => setTimeout(r, 5));
        };
        await foraTitulo('obras');
        clicarBotao('recolher');
        ['buracos', 'elos', 'ecos'].forEach((c) => assert.equal(bloco(c).open, false, c));
        assert.equal(foraBloco('obras').open, false);
        assert.equal(foraBloco('autores').open, true);
        assert.deepEqual(JSON.parse(localStorage.getItem(CHAVE)), [
            'buracos',
            'elos',
            'ecos',
            'obras',
        ]);
        clicarBotao('expandir');
        ['buracos', 'elos', 'ecos'].forEach((c) => assert.equal(bloco(c).open, true, c));
        assert.equal(foraBloco('obras').open, false);
        // O "Recolher tudo" de Fora também não fecha Dentro.
        el('conexoes-fora').querySelector('button[data-bloco-acao="recolher"]').click();
        ['buracos', 'elos', 'ecos'].forEach((c) => assert.equal(bloco(c).open, true, c));
    });
});
