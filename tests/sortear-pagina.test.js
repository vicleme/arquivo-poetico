import './helpers/dom-real.js';

import fs from 'node:fs';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Tela de leitura do sorteio (entrega 4b-1): a página sortear.html e o módulo
// que monta os controles, a mensagem de cada caso e o texto sorteado.
const html = fs.readFileSync(new URL('../sortear.html', import.meta.url), 'utf8');
const {
    montarSortear,
    lerAcervoDoNavegador,
    montarCorpo,
    lerRecentes,
    gravarRecentes,
    CHAVE_ACERVO,
    CHAVE_RECENTES,
    PERCURSO_MAXIMO,
    CHAVE_POSICAO_FICHA,
    CHAVE_SENSIVEIS,
    lerEscolhaSensiveis,
    gravarEscolhaSensiveis,
    lerPosicaoDaFicha,
    gravarPosicaoDaFicha,
    textoEhLongo,
    LINHAS_TEXTO_LONGO,
    CHAVE_IDIOMA,
    lerIdiomaPreferido,
    gravarIdiomaPreferido,
} = await import('../js/sortear-pagina.js');

// Armazenamento em memória: cada teste tem o seu, para os recentes guardados de
// um não vazarem para o outro pelo localStorage compartilhado do happy-dom.
const memoria = (inicial = {}) => {
    const dados = { ...inicial };
    return {
        dados,
        getItem: (k) => (k in dados ? dados[k] : null),
        setItem: (k, v) => {
            dados[k] = String(v);
        },
    };
};

const t = (id, extra = {}) => ({
    id,
    titulo: `T${id}`,
    texto: `verso ${id}`,
    status: 'publicado',
    sorteavel: true,
    temas: [],
    ...extra,
});
const tm = (...ids) => ids.map((temaId) => ({ temaId, papel: '' }));

const dbBase = () => ({
    temas: [
        { id: 1, nome: 'Saudade' },
        { id: 2, nome: 'Cotidiano' },
    ],
    temasUniversais: [
        { id: 10, nome: 'Perda', temaIds: [1] },
        { id: 11, nome: 'Dia a dia', temaIds: [2] },
        { id: 12, nome: 'Vazio', temaIds: [] },
    ],
    poemas: [
        t(1, { temas: tm(1), autoclassificacao: 5 }),
        t(2, { temas: tm(1), autoclassificacao: 2 }),
        t(3, { temas: tm(2), autoclassificacao: 1 }),
    ],
    prosas: [t(20, { temas: tm(2), autoclassificacao: 0 })],
});

const fixo = (n) => () => n;
const $ = (id) => document.getElementById(id);
const botaoPorTexto = (texto) =>
    [...document.querySelectorAll('button')].find((b) => b.textContent === texto);
let raiz;

function montar(db, opcoes = {}) {
    raiz = document.createElement('main');
    document.body.innerHTML = '';
    document.body.append(raiz);
    return montarSortear(raiz, {
        db,
        aleatorio: fixo(0),
        armazenamento: memoria(),
        ...opcoes,
    });
}

describe('sortear.html', () => {
    it('é uma página de módulo que monta a tela, sem onclick inline', () => {
        assert.match(html, /<script type="module">/);
        assert.match(html, /from '\.\/js\/sortear-pagina\.js'/);
        assert.match(html, /id="sortear-raiz"/);
        assert.doesNotMatch(html, /\sonclick=/);
        assert.match(html, /href="index\.html"/);
        // Botão de tema próprio, como filtrar.html, e DOMPurify como o index.html.
        assert.match(html, /id="btn-tema"/);
        assert.match(html, /id="painel-tema"/);
        assert.match(html, /window\.setTema = setTema/);
        assert.match(html, /assets\/js\/purify\.min\.js/);
        assert.match(html, /html\.dark\s*\{\s*color-scheme:\s*dark/);
    });
});

describe('lerAcervoDoNavegador', () => {
    const guarda = (valor) => ({ getItem: () => valor });
    it('lê o JSON do acervo, e devolve null para ausente ou inválido', () => {
        assert.deepEqual(lerAcervoDoNavegador(guarda('{"poemas":[]}')), { poemas: [] });
        assert.equal(lerAcervoDoNavegador(guarda(null)), null);
        assert.equal(lerAcervoDoNavegador(guarda('não é json')), null);
        assert.equal(lerAcervoDoNavegador(guarda('[1,2]')), null);
        assert.equal(CHAVE_ACERVO, 'arquivoPoetico_v3');
    });
});

describe('controles', () => {
    beforeEach(() => montar(dbBase()));

    it('o select e as opções têm cores do tema escuro (nada de fundo branco com texto claro)', () => {
        const selecao = $('sortear-universal');
        assert.match(selecao.className, /dark:bg-slate-900/);
        assert.match(selecao.className, /dark:text-slate-100/);
        [...selecao.options].forEach((o) => assert.match(o.className, /dark:bg-slate-900/));
    });

    it('lista as opções com a contagem e desabilita o universal sem texto', () => {
        const opcoes = [...$('sortear-universal').options];
        assert.deepEqual(
            opcoes.map((o) => o.textContent),
            ['Qualquer tema (4)', 'Perda (2)', 'Dia a dia (2)', 'Vazio (nenhum texto)'],
        );
        assert.equal(opcoes[3].disabled, true);
        assert.equal(
            $('sortear-contagem').textContent,
            '4 textos podem ser sorteados com esses critérios.',
        );
    });

    it('a caixa de favoritos refaz as contagens, e o universal sem nota alta segue escolhível', () => {
        $('sortear-favoritos').checked = true;
        $('sortear-favoritos').dispatchEvent(new window.Event('change'));
        const opcoes = [...$('sortear-universal').options];
        assert.deepEqual(
            opcoes.map((o) => o.textContent),
            [
                'Qualquer tema (1)',
                'Perda (1)',
                'Dia a dia (nenhum com nota alta)',
                'Vazio (nenhum texto)',
            ],
        );
        assert.equal(opcoes[2].disabled, false);
        assert.equal(opcoes[3].disabled, true);
        assert.equal(
            $('sortear-contagem').textContent,
            '1 texto pode ser sorteado com esses critérios.',
        );
    });
});

const versos = (n) => Array.from({ length: n }, () => 'verso').join('\n');
const palavras = (n) => Array.from({ length: n }, () => 'palavra').join(' ');
const mudar = (no, valor) => {
    no.value = valor;
    no.dispatchEvent(new window.Event('change'));
};
const montarComSorteio = (n) => montar(dbExtensao(), { aleatorio: fixo(n) });
const rotulos = (id) => [...$(id).options].map((o) => o.textContent);

// Extensão: Breve tem 2 textos (um poema de 3 versos e uma prosa de 120
// palavras), Curto 1 (8 versos), Médio 1 (20 versos); Longo e Extenso, nenhum.
const dbExtensao = () => ({
    temas: [
        { id: 1, nome: 'Saudade' },
        { id: 2, nome: 'Cotidiano' },
    ],
    temasUniversais: [
        { id: 10, nome: 'Perda', temaIds: [1] },
        { id: 11, nome: 'Dia a dia', temaIds: [2] },
    ],
    poemas: [
        t(1, { texto: versos(3), temas: tm(1), autoclassificacao: 5 }),
        t(2, { texto: versos(8), temas: tm(1), autoclassificacao: 2 }),
        t(3, { texto: versos(20), temas: tm(2), autoclassificacao: 1 }),
    ],
    prosas: [t(20, { texto: palavras(120), temas: tm(2), autoclassificacao: 0 })],
});

describe('extensão', () => {
    beforeEach(() => montar(dbExtensao()));

    it('o seletor tem cores do tema escuro e vem logo depois do seletor de convites', () => {
        const sel = $('sortear-extensao');
        assert.match(sel.className, /dark:bg-slate-900/);
        assert.match(sel.className, /dark:text-slate-100/);
        [...sel.options].forEach((o) => assert.match(o.className, /dark:bg-slate-900/));
        assert.equal(
            document.querySelector('label[for="sortear-extensao"]').textContent,
            'Extensão',
        );
        assert.equal($('sortear-universal').nextElementSibling.htmlFor, 'sortear-extensao');
    });

    it('lista as faixas em ordem de tamanho, com a contagem; sem texto algum, desabilita', () => {
        assert.deepEqual(rotulos('sortear-extensao'), [
            'Qualquer tamanho (4)',
            'Breve (2)',
            'Curto (1)',
            'Médio (1)',
            'Longo (nenhum texto)',
            'Extenso (nenhum texto)',
        ]);
        const opcoes = [...$('sortear-extensao').options];
        assert.deepEqual(
            opcoes.map((o) => o.disabled),
            [false, false, false, false, true, true],
        );
    });

    it('sem faixa escolhida a legenda fica escondida', () => {
        assert.equal($('sortear-extensao-legenda').classList.contains('hidden'), true);
        assert.equal($('sortear-extensao-legenda').textContent, '');
    });

    it('escolher a faixa mostra a legenda com os limites, as âncoras e a nota de convenção', () => {
        mudar($('sortear-extensao'), 'breve');
        const legenda = $('sortear-extensao-legenda');
        assert.equal(legenda.classList.contains('hidden'), false);
        assert.match(
            legenda.textContent,
            /^Breve: até 4 versos \(poema\) ou até 300 palavras \(prosa\)\./,
        );
        assert.match(legenda.textContent, /Âncoras: quadra; microficção\./);
        assert.match(legenda.textContent, /convenção editorial/);
        mudar($('sortear-extensao'), 'medio');
        assert.match($('sortear-extensao-legenda').textContent, /^Médio: 15 a 40 versos/);
        mudar($('sortear-extensao'), '');
        assert.equal($('sortear-extensao-legenda').classList.contains('hidden'), true);
    });

    it('a faixa entra na contagem e refaz a dos Temas', () => {
        mudar($('sortear-extensao'), 'breve');
        assert.equal(
            $('sortear-contagem').textContent,
            '2 textos podem ser sorteados com esses critérios.',
        );
        assert.deepEqual(rotulos('sortear-universal'), [
            'Qualquer tema (2)',
            'Perda (1)',
            'Dia a dia (1)',
        ]);
    });

    it('o Tema escolhido refaz a contagem das faixas', () => {
        mudar($('sortear-universal'), '10');
        assert.deepEqual(rotulos('sortear-extensao'), [
            'Qualquer tamanho (2)',
            'Breve (1)',
            'Curto (1)',
            'Médio (0)',
            'Longo (nenhum texto)',
            'Extenso (nenhum texto)',
        ]);
        // Médio tem texto no acervo, só não nesse Tema: continua escolhível.
        assert.equal([...$('sortear-extensao').options][3].disabled, false);
    });

    it('a combinação sem texto avisa, desabilita o Sortear e não apaga nenhuma escolha', () => {
        mudar($('sortear-universal'), '10');
        mudar($('sortear-extensao'), 'medio');
        assert.equal($('sortear-universal').value, '10');
        assert.equal($('sortear-extensao').value, 'medio');
        assert.equal(
            $('sortear-contagem').textContent,
            'Nenhum texto pode ser sorteado com esses critérios.',
        );
        assert.equal($('sortear-botao').disabled, true);
        // O Tema aparece com (0), sem dizer que falta nota alta, e segue escolhível.
        const opcao = [...$('sortear-universal').options].find((o) => o.value === '10');
        assert.equal(opcao.textContent, 'Perda (0)');
        assert.equal(opcao.disabled, false);
        // Voltar a Qualquer tamanho reabre o sorteio.
        mudar($('sortear-extensao'), '');
        assert.equal($('sortear-botao').disabled, false);
    });

    it('a caixa de favoritos refaz a contagem das faixas', () => {
        $('sortear-favoritos').checked = true;
        $('sortear-favoritos').dispatchEvent(new window.Event('change'));
        assert.deepEqual(rotulos('sortear-extensao'), [
            'Qualquer tamanho (1)',
            'Breve (1)',
            'Curto (0)',
            'Médio (0)',
            'Longo (nenhum texto)',
            'Extenso (nenhum texto)',
        ]);
    });

    it('o texto sorteado é sempre da faixa escolhida', () => {
        const sortearComAleatorio = (n) => {
            montarComSorteio(n);
            mudar($('sortear-extensao'), 'breve');
            $('sortear-botao').click();
            return $('sortear-resultado').querySelector('h2').textContent;
        };
        assert.equal(sortearComAleatorio(0), 'T1');
        assert.equal(sortearComAleatorio(0.999), 'T20');
    });

    it('o Sortear outro mantém a faixa', () => {
        mudar($('sortear-extensao'), 'breve');
        $('sortear-botao').click();
        assert.equal($('sortear-resultado').querySelector('h2').textContent, 'T1');
        // Sem a faixa, o segundo sorteio (que evita T1) cairia em T2.
        botaoPorTexto('Sortear outro').click();
        assert.equal($('sortear-resultado').querySelector('h2').textContent, 'T20');
    });

    it('com favoritos ligados e nenhum favorito na faixa, oferece sortear sem o filtro, mantendo a faixa', () => {
        mudar($('sortear-extensao'), 'curto');
        $('sortear-favoritos').checked = true;
        $('sortear-favoritos').dispatchEvent(new window.Event('change'));
        $('sortear-botao').click();
        assert.match(
            $('sortear-resultado').textContent,
            /Nenhum texto desse tema está entre os meus preferidos/,
        );
        $('sortear-sem-favoritos').click();
        assert.equal($('sortear-favoritos').checked, false);
        assert.equal($('sortear-extensao').value, 'curto');
        assert.equal($('sortear-resultado').querySelector('h2').textContent, 'T2');
    });
});

describe('extensão junto ao tipo', () => {
    const tipoNaTela = () => $('sortear-resultado').querySelector('article p').textContent;

    it('poema mostra os versos e prosa mostra o tempo, junto ao tipo', () => {
        montarComSorteio(0);
        $('sortear-botao').click();
        assert.equal(tipoNaTela(), 'Poema · 3 versos');
        montarComSorteio(0.999);
        $('sortear-botao').click();
        assert.equal(tipoNaTela(), 'Prosa · cerca de 1 min');
    });

    it('fica visível durante o aviso de conteúdo sensível e não muda com a posição da ficha', () => {
        const db = dbExtensao();
        db.poemas[0].conteudoSensivel = 'violência';
        montar(db, { aleatorio: fixo(0) });
        $('sortear-botao').click();
        assert.match($('sortear-resultado').textContent, /Antes de ler, um aviso/);
        assert.equal(tipoNaTela(), 'Poema · 3 versos');
        mudar($('sortear-ficha-posicao'), 'antes');
        assert.equal(tipoNaTela(), 'Poema · 3 versos');
    });
});

describe('em construção junto ao tipo', () => {
    const tipoNaTela = () => $('sortear-resultado').querySelector('article p').textContent;

    it('texto Incompleto mostra "em construção" depois da extensão; os demais não', () => {
        const db = dbExtensao();
        db.poemas[0].status = 'incompleto';
        montar(db, { aleatorio: fixo(0) });
        $('sortear-botao').click();
        assert.equal(tipoNaTela(), 'Poema · 3 versos · em construção');

        montarComSorteio(0.999);
        $('sortear-botao').click();
        assert.equal(tipoNaTela(), 'Prosa · cerca de 1 min');
    });

    it('prosa Incompleta também leva o aviso', () => {
        const db = dbExtensao();
        db.prosas[0].status = 'incompleto';
        montar(db, { aleatorio: fixo(0.999) });
        $('sortear-botao').click();
        assert.equal(tipoNaTela(), 'Prosa · cerca de 1 min · em construção');
    });

    it('fica visível durante o aviso de conteúdo sensível', () => {
        const db = dbExtensao();
        db.poemas[0].status = 'incompleto';
        db.poemas[0].conteudoSensivel = 'violência';
        montar(db, { aleatorio: fixo(0) });
        $('sortear-botao').click();
        assert.match($('sortear-resultado').textContent, /Antes de ler, um aviso/);
        assert.equal(tipoNaTela(), 'Poema · 3 versos · em construção');
    });
});

describe('sortear', () => {
    it('mostra o tipo, o título e o corpo do texto sorteado', () => {
        const api = montar(dbBase());
        api.sortear();
        const r = $('sortear-resultado');
        assert.equal(r.querySelector('h2').textContent, 'T1');
        assert.match(r.textContent, /Poema/);
        assert.match(r.textContent, /verso 1/);
        assert.ok(botaoPorTexto('Sortear outro'));
    });

    it('respeita o universal escolhido', () => {
        const api = montar(dbBase());
        $('sortear-universal').value = '11';
        $('sortear-universal').dispatchEvent(new window.Event('change'));
        api.sortear();
        assert.equal($('sortear-resultado').querySelector('h2').textContent, 'T3');
    });

    it('Sortear outro evita o que acabou de sair', () => {
        const api = montar(dbBase());
        api.sortear();
        assert.equal($('sortear-resultado').querySelector('h2').textContent, 'T1');
        botaoPorTexto('Sortear outro').click();
        assert.equal($('sortear-resultado').querySelector('h2').textContent, 'T2');
    });

    it('prosa aparece como Prosa', () => {
        const db = dbBase();
        db.poemas = [];
        const api = montar(db);
        api.sortear();
        assert.match($('sortear-resultado').textContent, /Prosa/);
        assert.equal($('sortear-resultado').querySelector('h2').textContent, 'T20');
    });

    it('conteúdo sensível esconde o corpo até "Ler mesmo assim" e não cita o vocabulário', () => {
        const db = dbBase();
        db.poemas[0].conteudoSensivel = 'luto';
        db.poemas[0].vocabularioHiperacionante = 'sangue';
        const api = montar(db);
        api.sortear();
        const r = $('sortear-resultado');
        assert.match(r.textContent, /Conteúdo sensível: luto/);
        assert.doesNotMatch(r.textContent, /hiperacionante/i);
        assert.doesNotMatch(r.textContent, /sangue/);
        assert.doesNotMatch(r.textContent, /verso 1/);
        $('sortear-ler-mesmo-assim').click();
        assert.match($('sortear-resultado').textContent, /verso 1/);
    });

    it('mostra a ficha: Localização, Status, Primeira publicação e Autoria', () => {
        const db = dbBase();
        db.livros = [{ id: 1, titulo: 'Livro 1' }];
        db.autores = [{ id: 6, nome: 'Victor Leme' }];
        Object.assign(db.poemas[0], {
            paiTipo: 'livro',
            paiId: 1,
            sequencia: 2,
            dataPublicacao: { ano: 2020 },
            autoria: [{ autorId: 6, papel: 'Autor' }],
        });
        montar(db).sortear();
        const ficha = document.querySelector('#sortear-resultado dl');
        assert.ok(ficha);
        const linhas = [...ficha.querySelectorAll('dt')].map(
            (dt) => `${dt.textContent} ${dt.nextElementSibling.textContent}`,
        );
        assert.deepEqual(linhas, [
            'Localização: Livro 1 · posição 2',
            'Status: 🟢 Publicado',
            'Primeira publicação: 2020',
            'Autoria: Victor Leme (Autor)',
        ]);
    });

    // Posição da ficha escolhida já na abertura da página (como se tivesse sido
    // guardada numa visita anterior).
    const comPosicao = (db, posicao) =>
        montar(db, { armazenamento: memoria({ [CHAVE_POSICAO_FICHA]: posicao }) });
    const artigo = () => document.querySelector('#sortear-resultado article');
    const tags = () => [...artigo().children].map((c) => c.tagName);

    it('por padrão a ficha vem depois do texto: tipo, título, corpo, ficha, rodapé', () => {
        montar(dbBase()).sortear();
        assert.deepEqual(tags(), ['P', 'H2', 'DIV', 'DL', 'DIV']);
        const ficha = artigo().querySelector('dl');
        assert.match(ficha.previousElementSibling.textContent, /verso 1/);
        assert.ok(ficha.nextElementSibling.querySelector('button'));
        const texto = artigo().textContent;
        assert.ok(texto.indexOf('T1') < texto.indexOf('verso 1'));
        assert.ok(texto.indexOf('verso 1') < texto.indexOf('Status:'));
        assert.equal($('sortear-ficha-posicao').value, 'depois');
    });

    it('na escolha "antes", a ficha vem logo depois do título e antes do corpo', () => {
        comPosicao(dbBase(), 'antes').sortear();
        assert.deepEqual(tags(), ['P', 'H2', 'DL', 'DIV', 'DIV']);
        const ficha = artigo().querySelector('dl');
        assert.equal(ficha.previousElementSibling.tagName, 'H2');
        assert.match(ficha.nextElementSibling.textContent, /verso 1/);
        assert.equal($('sortear-ficha-posicao').value, 'antes');
    });

    it('conteúdo sensível, padrão: só o aviso aparece; a ficha espera o texto abrir', () => {
        const db = dbBase();
        db.poemas[0].conteudoSensivel = 'luto';
        montar(db).sortear();
        assert.equal(artigo().querySelector('dl'), null);
        assert.match(artigo().textContent, /Conteúdo sensível: luto/);
        assert.doesNotMatch(artigo().textContent, /verso 1/);
        assert.doesNotMatch(artigo().textContent, /Status:/);
        $('sortear-ler-mesmo-assim').click();
        const ficha = artigo().querySelector('dl');
        assert.ok(ficha);
        assert.match(ficha.previousElementSibling.textContent, /verso 1/);
    });

    it('conteúdo sensível, escolha "antes": a ficha vem antes do aviso, sem revelar o corpo', () => {
        const db = dbBase();
        db.poemas[0].conteudoSensivel = 'luto';
        comPosicao(db, 'antes').sortear();
        const ficha = artigo().querySelector('dl');
        assert.equal(ficha.previousElementSibling.tagName, 'H2');
        assert.match(ficha.nextElementSibling.textContent, /Antes de ler, um aviso/);
        assert.ok(ficha.nextElementSibling.contains($('sortear-ler-mesmo-assim')));
        assert.doesNotMatch(artigo().textContent, /verso 1/);
        $('sortear-ler-mesmo-assim').click();
        assert.match(artigo().querySelector('dl').nextElementSibling.textContent, /verso 1/);
    });

    it('trocar a posição refaz o mesmo texto na hora, sem sortear de novo e sem perder o "Ler mesmo assim"', () => {
        const db = dbBase();
        db.poemas[0].conteudoSensivel = 'luto';
        montar(db).sortear();
        $('sortear-ler-mesmo-assim').click();
        assert.deepEqual(tags(), ['P', 'H2', 'DIV', 'DL', 'DIV']);
        $('sortear-ficha-posicao').value = 'antes';
        $('sortear-ficha-posicao').dispatchEvent(new window.Event('change'));
        assert.equal(artigo().querySelector('h2').textContent, 'T1');
        assert.deepEqual(tags(), ['P', 'H2', 'DL', 'DIV', 'DIV']);
        assert.match(artigo().textContent, /verso 1/);
    });

    it('a escolha de posição fica guardada neste navegador, sem texto do acervo', () => {
        const guarda = memoria();
        montar(dbBase(), { armazenamento: guarda }).sortear();
        $('sortear-ficha-posicao').value = 'antes';
        $('sortear-ficha-posicao').dispatchEvent(new window.Event('change'));
        assert.equal(guarda.dados[CHAVE_POSICAO_FICHA], 'antes');
        assert.equal(lerPosicaoDaFicha(guarda), 'antes');
        assert.doesNotMatch(JSON.stringify(guarda.dados), /verso/);
    });

    it('texto longo, ficha depois: botão "Ir para a ficha" leva o foco à ficha', () => {
        const db = dbBase();
        db.poemas[0].texto = Array.from(
            { length: LINHAS_TEXTO_LONGO + 1 },
            (_, i) => `verso ${i}`,
        ).join('\n');
        montar(db).sortear();
        const botaoIr = $('sortear-ir-ficha');
        assert.ok(botaoIr);
        assert.equal(botaoIr.previousElementSibling.tagName, 'H2');
        botaoIr.click();
        assert.equal(document.activeElement, $('sortear-ficha'));
    });

    const textoLongo = () =>
        Array.from({ length: LINHAS_TEXTO_LONGO + 1 }, (_, i) => `verso ${i}`).join('\n');

    it('texto longo: "Voltar ao início" no rodapé, ao lado do Sortear outro, e leva o foco ao título', () => {
        const db = dbBase();
        db.poemas[0].texto = textoLongo();
        montar(db).sortear();
        const voltar = $('sortear-voltar-inicio');
        assert.ok(voltar);
        assert.equal(voltar.parentElement, botaoPorTexto('Sortear outro').parentElement);
        assert.equal(voltar.parentElement.parentElement.lastElementChild, voltar.parentElement);
        voltar.click();
        assert.equal(document.activeElement, $('sortear-titulo'));
        assert.equal($('sortear-titulo').textContent, 'T1');
    });

    it('"Voltar ao início" aparece nas duas posições da ficha', () => {
        ['depois', 'antes'].forEach((posicao) => {
            const db = dbBase();
            db.poemas[0].texto = textoLongo();
            comPosicao(db, posicao).sortear();
            assert.ok($('sortear-voltar-inicio'), posicao);
            assert.equal(Boolean($('sortear-ir-ficha')), posicao === 'depois');
        });
    });

    it('sem "Voltar ao início": texto curto e conteúdo sensível ainda fechado', () => {
        montar(dbBase()).sortear();
        assert.equal($('sortear-voltar-inicio'), null);

        const db = dbBase();
        db.poemas[0].texto = textoLongo();
        db.poemas[0].conteudoSensivel = 'luto';
        montar(db).sortear();
        assert.equal($('sortear-voltar-inicio'), null);
        $('sortear-ler-mesmo-assim').click();
        assert.ok($('sortear-voltar-inicio'));
    });

    it('sem o botão: texto curto, ficha antes, ou conteúdo sensível ainda fechado', () => {
        montar(dbBase()).sortear();
        assert.equal($('sortear-ir-ficha'), null);

        const longo = dbBase();
        longo.poemas[0].texto = Array.from({ length: LINHAS_TEXTO_LONGO + 1 }, () => 'v').join(
            '\n',
        );
        comPosicao(longo, 'antes').sortear();
        assert.equal($('sortear-ir-ficha'), null);

        longo.poemas[0].conteudoSensivel = 'luto';
        montar(longo).sortear();
        assert.equal($('sortear-ir-ficha'), null);
        $('sortear-ler-mesmo-assim').click();
        assert.ok($('sortear-ir-ficha'));
    });

    it('a ficha mostra Coletâneas e Aparece em, sem revelar o corpo', () => {
        const db = dbBase();
        db.livros = [
            { id: 1, titulo: 'Livro 1', tipo: 'Livro' },
            { id: 2, titulo: 'Livro 2', tipo: 'Livro' },
            { id: 3, titulo: 'Seleta', tipo: 'Coletânea' },
        ];
        db.partes = [{ id: 40, livroId: 3, titulo: 'Parte Seleta' }];
        db.itensColetanea = [{ id: 1, parteId: 40, refTipo: 'poema', refId: 1, sequencia: 2 }];
        Object.assign(db.poemas[0], {
            paiTipo: 'livro',
            paiId: 1,
            sequencia: 2,
            aparicoes: [
                { livroId: 1, parteId: null, secaoId: null, sequencia: 2 },
                { livroId: 2, parteId: null, secaoId: null, sequencia: 5 },
            ],
        });
        montar(db).sortear();
        const linhas = [...document.querySelectorAll('#sortear-resultado dt')].map(
            (dt) => `${dt.textContent} ${dt.nextElementSibling.textContent}`,
        );
        assert.deepEqual(linhas, [
            'Localização: Livro 1 · posição 2',
            'Coletâneas: Seleta',
            'Aparece em: Livro 1 · posição 2; Livro 2 · posição 5',
            'Status: 🟢 Publicado',
        ]);
    });

    it('sem avisos, o corpo aparece direto', () => {
        const api = montar(dbBase());
        api.sortear();
        assert.equal($('sortear-ler-mesmo-assim'), null);
    });

    it('favoritos sem nota alta no Tema: oferece sortear entre todos do Tema', () => {
        const api = montar(dbBase());
        $('sortear-favoritos').checked = true;
        $('sortear-favoritos').dispatchEvent(new window.Event('change'));
        $('sortear-universal').value = '11';
        $('sortear-universal').dispatchEvent(new window.Event('change'));
        api.sortear();
        assert.match(
            $('sortear-resultado').textContent,
            /Nenhum texto desse tema está entre os meus preferidos/,
        );
        $('sortear-sem-favoritos').click();
        assert.equal($('sortear-favoritos').checked, false);
        assert.equal($('sortear-resultado').querySelector('h2').textContent, 'T3');
    });

    it('sem nenhum texto marcado: botão desabilitado e mensagem ao sortear', () => {
        const db = dbBase();
        db.poemas.forEach((p) => (p.sorteavel = false));
        db.prosas.forEach((p) => (p.sorteavel = false));
        const api = montar(db);
        assert.equal($('sortear-botao').disabled, true);
        assert.equal(
            $('sortear-contagem').textContent,
            'Nenhum texto pode ser sorteado com esses critérios.',
        );
        api.sortear();
        assert.match($('sortear-resultado').textContent, /Pode ser sorteado/);
    });

    it('descartado e privado nunca saem, mesmo marcados', () => {
        const db = dbBase();
        db.poemas[0].status = 'descartado';
        db.poemas[1].status = 'privado';
        const api = montar(db);
        api.sortear();
        assert.notEqual($('sortear-resultado').querySelector('h2').textContent, 'T1');
        assert.notEqual($('sortear-resultado').querySelector('h2').textContent, 'T2');
    });
});

describe('lerRecentes e gravarRecentes', () => {
    it('vai e volta, e devolve [] para ausente, inválido ou de outro formato', () => {
        const guarda = memoria();
        assert.deepEqual(lerRecentes(guarda), []);
        assert.equal(gravarRecentes(['poema:1', 'prosa:20'], guarda), true);
        assert.equal(CHAVE_RECENTES, 'arquivoPoetico_sorteioRecentes');
        assert.deepEqual(lerRecentes(guarda), ['poema:1', 'prosa:20']);
        assert.deepEqual(lerRecentes(memoria({ [CHAVE_RECENTES]: 'não é json' })), []);
        assert.deepEqual(lerRecentes(memoria({ [CHAVE_RECENTES]: '{"a":1}' })), []);
        assert.deepEqual(lerRecentes(memoria({ [CHAVE_RECENTES]: 'null' })), []);
    });

    it('descarta o que não é texto e guarda só os últimos 10', () => {
        const bruto = JSON.stringify([1, null, '', 'poema:1', {}, 'poema:2']);
        assert.deepEqual(lerRecentes(memoria({ [CHAVE_RECENTES]: bruto })), ['poema:1', 'poema:2']);
        const muitos = Array.from({ length: 15 }, (_, i) => `poema:${i}`);
        const guarda = memoria();
        gravarRecentes(muitos, guarda);
        assert.deepEqual(lerRecentes(guarda), muitos.slice(-10));
    });

    it('falha em silêncio quando o navegador recusa ou não há armazenamento', () => {
        const recusa = {
            getItem: () => {
                throw new Error('bloqueado');
            },
            setItem: () => {
                throw new Error('cheio');
            },
        };
        assert.deepEqual(lerRecentes(recusa), []);
        assert.equal(gravarRecentes(['poema:1'], recusa), false);
        assert.deepEqual(lerRecentes(null), []);
        assert.equal(gravarRecentes(['poema:1'], null), false);
    });
});

describe('recentes guardados no navegador', () => {
    it('cada sorteio grava a lista, e a página reaberta continua evitando os últimos', () => {
        const guarda = memoria();
        let api = montar(dbBase(), { armazenamento: guarda });
        api.sortear();
        assert.equal($('sortear-resultado').querySelector('h2').textContent, 'T1');
        assert.deepEqual(JSON.parse(guarda.dados[CHAVE_RECENTES]), ['poema:1']);
        api.sortear();
        assert.deepEqual(JSON.parse(guarda.dados[CHAVE_RECENTES]), ['poema:1', 'poema:2']);

        // "Reabrir a página": monta de novo com o mesmo armazenamento. Com o
        // aleatório em 0 o primeiro seria T1, mas T1 e T2 saíram há pouco.
        api = montar(dbBase(), { armazenamento: guarda });
        api.sortear();
        const titulo = $('sortear-resultado').querySelector('h2').textContent;
        assert.equal(titulo, 'T3');
    });

    it('sem recentes guardados, o primeiro sorteio é o do aleatório', () => {
        const api = montar(dbBase());
        api.sortear();
        assert.equal($('sortear-resultado').querySelector('h2').textContent, 'T1');
    });

    it('lista guardada estragada não derruba a tela', () => {
        const guarda = memoria({ [CHAVE_RECENTES]: '{estragado' });
        const api = montar(dbBase(), { armazenamento: guarda });
        api.sortear();
        assert.equal($('sortear-resultado').querySelector('h2').textContent, 'T1');
        assert.deepEqual(JSON.parse(guarda.dados[CHAVE_RECENTES]), ['poema:1']);
    });

    it('armazenamento que recusa gravar não impede o sorteio nem o "Sortear outro"', () => {
        const recusa = {
            getItem: () => null,
            setItem: () => {
                throw new Error('cheio');
            },
        };
        const api = montar(dbBase(), { armazenamento: recusa });
        api.sortear();
        assert.equal($('sortear-resultado').querySelector('h2').textContent, 'T1');
        botaoPorTexto('Sortear outro').click();
        assert.equal($('sortear-resultado').querySelector('h2').textContent, 'T2');
    });

    it('guardar só a chave: nenhum texto do acervo vai para o armazenamento', () => {
        const guarda = memoria();
        montar(dbBase(), { armazenamento: guarda }).sortear();
        assert.deepEqual(Object.keys(guarda.dados), [CHAVE_RECENTES]);
        assert.doesNotMatch(guarda.dados[CHAVE_RECENTES], /verso/);
    });
});

describe('posição da ficha e texto longo', () => {
    it('lê "antes" e "depois"; ausente, estragado ou desconhecido vale "depois"', () => {
        assert.equal(lerPosicaoDaFicha(memoria({ [CHAVE_POSICAO_FICHA]: 'antes' })), 'antes');
        assert.equal(lerPosicaoDaFicha(memoria({ [CHAVE_POSICAO_FICHA]: 'depois' })), 'depois');
        assert.equal(lerPosicaoDaFicha(memoria()), 'depois');
        assert.equal(lerPosicaoDaFicha(memoria({ [CHAVE_POSICAO_FICHA]: '{x' })), 'depois');
        assert.equal(lerPosicaoDaFicha(memoria({ [CHAVE_POSICAO_FICHA]: 'meio' })), 'depois');
        assert.equal(
            lerPosicaoDaFicha({
                getItem: () => {
                    throw new Error('x');
                },
            }),
            'depois',
        );
    });

    it('só grava valor válido e falha em silêncio', () => {
        const guarda = memoria();
        assert.equal(gravarPosicaoDaFicha('meio', guarda), false);
        assert.deepEqual(guarda.dados, {});
        assert.equal(gravarPosicaoDaFicha('antes', guarda), true);
        assert.equal(guarda.dados[CHAVE_POSICAO_FICHA], 'antes');
        const recusa = {
            setItem: () => {
                throw new Error('cheio');
            },
        };
        assert.equal(gravarPosicaoDaFicha('antes', recusa), false);
    });

    it('a chave é uma só, do app', () => {
        assert.equal(CHAVE_POSICAO_FICHA, 'arquivoPoetico_sorteioFicha');
    });

    it('texto longo passa de 25 linhas; vazio e curto não', () => {
        const linhas = (n) => Array.from({ length: n }, () => 'v').join('\n');
        assert.equal(LINHAS_TEXTO_LONGO, 25);
        assert.equal(textoEhLongo(linhas(25)), false);
        assert.equal(textoEhLongo(linhas(26)), true);
        assert.equal(textoEhLongo(''), false);
        assert.equal(textoEhLongo(null), false);
    });
});

describe('montarCorpo', () => {
    // O DOMPurify de verdade é um script da página; aqui um stand-in que deixa o
    // HTML passar, porque o filtro por allowlist de estilos é o do utils.js.
    beforeEach(() => {
        window.DOMPurify = { sanitize: (x) => x };
    });

    it('mantém negrito, itálico e sublinhado', () => {
        const corpo = montarCorpo('**forte** _suave_ <u>riscado</u>');
        assert.equal(corpo.querySelector('strong').textContent, 'forte');
        assert.equal(corpo.querySelector('em').textContent, 'suave');
        assert.equal(corpo.querySelector('u').textContent, 'riscado');
    });

    it('mantém cor e fundo do texto, que carregam sentido', () => {
        const corpo = montarCorpo(
            '<div style="color: #ff0000; background-color: #000000">sangue</div>',
        );
        const caixa = corpo.querySelector('div');
        assert.match(caixa.getAttribute('style'), /color:\s*#ff0000/);
        assert.match(caixa.getAttribute('style'), /background-color:\s*#000000/);
        assert.equal(caixa.textContent, 'sangue');
    });

    it('preserva as quebras de linha dos versos (pre-wrap)', () => {
        const corpo = montarCorpo('verso um\nverso dois');
        assert.ok(corpo.className.includes('whitespace-pre-wrap'));
        assert.equal(corpo.textContent, 'verso um\nverso dois');
    });

    it('sem o DOMPurify, o texto aparece sem formatação e nunca como marcação', () => {
        delete window.DOMPurify;
        const corpo = montarCorpo('<script>alert(1)</script>');
        assert.equal(corpo.querySelector('script'), null);
        assert.match(corpo.textContent, /<script>alert\(1\)<\/script>/);
    });
});

describe('Leitura autônoma na página do sorteio', () => {
    it('textos que não se leem sozinhos não saem, e a contagem não os inclui', () => {
        const db = dbBase();
        db.poemas.forEach((p) => (p.leituraAutonoma = 'sequencia'));
        db.prosas.forEach((p) => (p.leituraAutonoma = 'conjunto'));
        const api = montar(db);
        assert.equal($('sortear-botao').disabled, true);
        const contagem = $('sortear-contagem').textContent;
        assert.match(contagem, /^Nenhum texto pode ser sorteado com esses critérios\./);
        assert.match(contagem, /ficam de fora porque não se leem sozinhos \(Leitura autônoma\)/);
        api.sortear();
        assert.match(
            $('sortear-resultado').textContent,
            /ficam de fora porque não se leem sozinhos/,
        );
        assert.doesNotMatch($('sortear-resultado').textContent, /Marque textos como/);
    });
    it('sem textos barrados pela leitura, a mensagem segue a de sempre', () => {
        const db = dbBase();
        db.poemas.forEach((p) => (p.sorteavel = false));
        db.prosas.forEach((p) => (p.sorteavel = false));
        const api = montar(db);
        assert.doesNotMatch($('sortear-contagem').textContent, /Leitura autônoma/);
        api.sortear();
        assert.match($('sortear-resultado').textContent, /Marque textos como/);
    });
    it('um texto condicionado entre outros: o sorteio nunca o escolhe e a contagem não avisa', () => {
        const db = dbBase();
        const condicionados = db.poemas.filter((p) => p.sorteavel === true).slice(0, 1);
        condicionados.forEach((p) => (p.leituraAutonoma = 'sequencia'));
        const api = montar(db, { aleatorio: () => 0 });
        assert.doesNotMatch($('sortear-contagem').textContent, /Leitura autônoma/);
        api.sortear();
        const titulo = $('sortear-resultado').querySelector('h2').textContent;
        assert.notEqual(titulo, `T${condicionados[0].id}`);
    });
});

describe('Só como início na página do sorteio', () => {
    it('o texto é sorteado e mostra "só o começo" junto ao tipo', () => {
        const db = dbBase();
        db.poemas.forEach((p) => (p.sorteavel = false));
        db.prosas.forEach((p) => (p.sorteavel = false));
        db.poemas[0].leituraAutonoma = 'inicio';
        db.poemas[0].sorteavel = true;
        const api = montar(db);
        assert.equal($('sortear-botao').disabled, false);
        assert.doesNotMatch($('sortear-contagem').textContent, /Leitura autônoma/);
        api.sortear();
        assert.equal($('sortear-resultado').querySelector('h2').textContent, 'T1');
        assert.match($('sortear-resultado').textContent, /Poema · 1 verso · só o começo/);
    });
});

describe('Conteúdo sensível: escolher se entra no sorteio', () => {
    const dbComSensivel = () => {
        const db = dbBase();
        db.poemas[0].conteudoSensivel = 'luto';
        return db;
    };
    const mudar = (caixa, marcado) => {
        caixa.checked = marcado;
        caixa.dispatchEvent(new Event('change', { bubbles: true }));
    };

    it('a caixa vem marcada por padrão e o sorteio segue como era (com aviso antes)', () => {
        const api = montar(dbComSensivel());
        assert.equal($('sortear-sensiveis').checked, true);
        assert.match($('sortear-contagem').textContent, /^4 textos podem ser sorteados/);
        api.sortear();
        assert.match($('sortear-resultado').textContent, /Conteúdo sensível: luto/);
    });

    it('desmarcar tira o texto sensível da contagem e do sorteio', () => {
        const api = montar(dbComSensivel());
        mudar($('sortear-sensiveis'), false);
        assert.match($('sortear-contagem').textContent, /^3 textos podem ser sorteados/);
        for (let i = 0; i < 10; i++) {
            api.sortear();
            assert.notEqual($('sortear-resultado').querySelector('h2').textContent, 'T1');
            assert.doesNotMatch($('sortear-resultado').textContent, /Conteúdo sensível/);
        }
    });

    it('as contagens do Tema e da extensão acompanham a escolha', () => {
        montar(dbComSensivel());
        const rotulos = () => [...$('sortear-universal').options].map((o) => o.textContent);
        assert.ok(rotulos().includes('Perda (2)'));
        mudar($('sortear-sensiveis'), false);
        assert.ok(rotulos().includes('Perda (1)'));
        assert.match($('sortear-universal').options[0].textContent, /^Qualquer tema \(3\)/);
    });

    it('sem nenhum outro texto, avisa que o de fora ficou por escolha e desliga o Sortear', () => {
        const db = dbBase();
        db.poemas = [t(1, { conteudoSensivel: 'luto' })];
        db.prosas = [];
        montar(db);
        assert.equal($('sortear-botao').disabled, false);
        mudar($('sortear-sensiveis'), false);
        assert.equal($('sortear-botao').disabled, true);
        assert.match($('sortear-contagem').textContent, /Nenhum texto pode ser sorteado/);
        assert.match(
            $('sortear-contagem').textContent,
            /1 texto com conteúdo sensível ficou de fora por sua escolha/,
        );
        mudar($('sortear-sensiveis'), true);
        assert.equal($('sortear-botao').disabled, false);
    });

    it('a escolha fica guardada neste navegador e volta ao reabrir a página', () => {
        const armazenamento = memoria();
        montar(dbComSensivel(), { armazenamento });
        mudar($('sortear-sensiveis'), false);
        assert.equal(armazenamento.dados[CHAVE_SENSIVEIS], 'excluir');
        montar(dbComSensivel(), { armazenamento });
        assert.equal($('sortear-sensiveis').checked, false);
        assert.match($('sortear-contagem').textContent, /^3 textos podem ser sorteados/);
        mudar($('sortear-sensiveis'), true);
        assert.equal(armazenamento.dados[CHAVE_SENSIVEIS], 'incluir');
    });

    it('lerEscolhaSensiveis: ausente, estragado ou com erro vale "incluir"; gravar recusa valor estranho', () => {
        assert.equal(lerEscolhaSensiveis(memoria()), 'incluir');
        assert.equal(lerEscolhaSensiveis(memoria({ [CHAVE_SENSIVEIS]: 'talvez' })), 'incluir');
        assert.equal(lerEscolhaSensiveis(memoria({ [CHAVE_SENSIVEIS]: 'excluir' })), 'excluir');
        assert.equal(
            lerEscolhaSensiveis({
                getItem: () => {
                    throw new Error('bloqueado');
                },
            }),
            'incluir',
        );
        const m = memoria();
        assert.equal(gravarEscolhaSensiveis('talvez', m), false);
        assert.equal(gravarEscolhaSensiveis('excluir', m), true);
        assert.equal(
            gravarEscolhaSensiveis('excluir', {
                setItem: () => {
                    throw new Error('cheio');
                },
            }),
            false,
        );
    });
});

describe('Peso do texto: escolher a valência no sorteio', () => {
    const dbPeso = () => ({
        temas: [
            { id: 1, nome: 'Alegria', valencia: 'agradavel' },
            { id: 2, nome: 'Luto', valencia: 'desagradavel' },
            { id: 3, nome: 'Dia', valencia: 'neutro' },
        ],
        temasUniversais: [{ id: 10, nome: 'Tudo', temaIds: [1, 2, 3] }],
        poemas: [
            t(1, { temas: tm(1) }),
            t(2, { temas: tm(2) }),
            t(3, { temas: tm(3) }),
            t(4, { temas: [] }),
        ],
        prosas: [t(20, { temas: tm(2) })],
    });
    const caixa = (faixa) => $(`sortear-peso-${faixa}`);
    const marcar = (faixa, valor) => {
        caixa(faixa).checked = valor;
        caixa(faixa).dispatchEvent(new Event('change', { bubbles: true }));
    };
    const rotulosPeso = () =>
        ['leve', 'neutro', 'pesado', 'sem'].map((f) => caixa(f).parentElement.textContent);

    it('quatro caixas, nenhuma marcada: qualquer peso, com a contagem de cada uma', () => {
        montar(dbPeso());
        ['leve', 'neutro', 'pesado', 'sem'].forEach((f) => assert.equal(caixa(f).checked, false));
        assert.deepEqual(rotulosPeso(), [
            'Leve (1)',
            'Neutro ou ambivalente (1)',
            'Pesado (2)',
            'Sem valência (1)',
        ]);
        assert.match($('sortear-contagem').textContent, /^5 textos podem ser sorteados/);
    });

    it('marcar uma faixa restringe a contagem e o sorteio, sem o texto sem valência', () => {
        const api = montar(dbPeso());
        marcar('pesado', true);
        assert.match($('sortear-contagem').textContent, /^2 textos podem ser sorteados/);
        assert.doesNotMatch($('sortear-contagem').textContent, /sem valência/);
        for (let i = 0; i < 6; i++) {
            api.sortear();
            assert.ok(
                ['T2', 'T20'].includes($('sortear-resultado').querySelector('h2').textContent),
            );
        }
    });

    it('"Sem valência" sorteia só os textos sem valência, e soma com as outras faixas', () => {
        const api = montar(dbPeso());
        marcar('sem', true);
        assert.match($('sortear-contagem').textContent, /^1 texto pode ser sorteado/);
        api.sortear();
        assert.equal($('sortear-resultado').querySelector('h2').textContent, 'T4');
        marcar('leve', true);
        assert.match($('sortear-contagem').textContent, /^2 textos podem ser sorteados/);
    });

    it('"Sem valência" some das contas dos outros pesos e vale quando todos estão marcados', () => {
        montar(dbPeso());
        marcar('leve', true);
        marcar('neutro', true);
        marcar('pesado', true);
        assert.match($('sortear-contagem').textContent, /^4 textos podem ser sorteados/);
        marcar('sem', true);
        assert.match($('sortear-contagem').textContent, /^5 textos podem ser sorteados/);
    });

    it('"Sem valência" sem nenhum texto no acervo fica desabilitada e diz "nenhum texto"', () => {
        const db = dbPeso();
        db.poemas = db.poemas.filter((p) => p.id !== 4);
        montar(db);
        assert.equal(caixa('sem').disabled, true);
        assert.match(rotulosPeso()[3], /nenhum texto/);
    });

    it('várias faixas juntas somam, e desmarcar tudo volta ao aberto', () => {
        montar(dbPeso());
        marcar('leve', true);
        marcar('neutro', true);
        assert.match($('sortear-contagem').textContent, /^2 textos podem ser sorteados/);
        marcar('leve', false);
        marcar('neutro', false);
        assert.match($('sortear-contagem').textContent, /^5 textos podem ser sorteados/);
        assert.doesNotMatch($('sortear-contagem').textContent, /sem valência/);
    });

    it('as contagens de Tema e de extensão acompanham o peso escolhido', () => {
        montar(dbPeso());
        const rotulosTema = () => [...$('sortear-universal').options].map((o) => o.textContent);
        assert.ok(rotulosTema().includes('Tudo (4)'));
        marcar('pesado', true);
        assert.ok(rotulosTema().includes('Tudo (2)'));
        assert.match($('sortear-universal').options[0].textContent, /^Qualquer tema \(2\)/);
    });

    it('o peso se conta com o conteúdo sensível: desmarcar a caixa tira os sensíveis da faixa', () => {
        const db = dbPeso();
        db.prosas[0].conteudoSensivel = 'luto';
        montar(db);
        assert.equal(rotulosPeso()[2], 'Pesado (2)');
        const sens = $('sortear-sensiveis');
        sens.checked = false;
        sens.dispatchEvent(new Event('change', { bubbles: true }));
        assert.equal(rotulosPeso()[2], 'Pesado (1)');
    });

    it('faixa sem nenhum texto no acervo fica desabilitada e diz "nenhum texto"', () => {
        const db = dbPeso();
        db.poemas = db.poemas.filter((p) => p.id !== 3);
        montar(db);
        assert.equal(caixa('neutro').disabled, true);
        assert.match(rotulosPeso()[1], /nenhum texto/);
        assert.equal(caixa('leve').disabled, false);
    });

    it('combinação sem texto avisa e desliga o Sortear', () => {
        const db = dbPeso();
        db.poemas = [t(1, { temas: tm(1) })];
        db.prosas = [];
        montar(db);
        marcar('leve', true);
        assert.equal($('sortear-botao').disabled, false);
        marcar('pesado', true);
        marcar('leve', false);
        assert.equal($('sortear-botao').disabled, true);
        assert.match($('sortear-contagem').textContent, /Nenhum texto pode ser sorteado/);
    });
});

describe('Elo de tradução na página do sorteio', () => {
    const dbTraducao = () => ({
        temas: [],
        temasUniversais: [],
        poemas: [
            t(1, {
                titulo: 'Original',
                conceitos: { elos: [{ id: 2, relacao: 'Tradução', direcao: 'origem' }] },
            }),
            t(2, { titulo: 'Tradução' }),
        ],
        prosas: [],
    });

    it('a obra tem uma chance só e a página avisa da outra versão', () => {
        const api = montar(dbTraducao());
        api.sortear();
        const aviso = $('sortear-traducao');
        assert.ok(aviso);
        assert.match(aviso.textContent, /Traduzido para: Tradução/);
        assert.equal($('sortear-resultado').querySelector('h2').textContent, 'Original');
    });
    it('clicar no link abre a outra versão ali mesmo, com o link de volta', () => {
        const mem = memoria();
        const api = montar(dbTraducao(), { armazenamento: mem });
        api.sortear();
        $('sortear-traducao').querySelector('button').click();
        assert.equal($('sortear-resultado').querySelector('h2').textContent, 'Tradução');
        assert.match($('sortear-resultado').textContent, /verso 2/);
        assert.match($('sortear-traducao').textContent, /Tradução de: Original/);
        assert.deepEqual(lerRecentes(mem), ['poema:1', 'poema:2']);
    });
    it('texto sem tradução não mostra o aviso', () => {
        const api = montar(dbBase());
        api.sortear();
        assert.equal($('sortear-traducao'), null);
    });
    it('versão não sorteável não vira link', () => {
        const db = dbTraducao();
        db.poemas[1].sorteavel = false;
        const api = montar(db);
        api.sortear();
        assert.equal($('sortear-traducao'), null);
    });
});

describe('Idioma de preferência na página do sorteio', () => {
    const idi = (idioma) => [{ idioma, papel: 'principal', dialetos: [] }];
    const dbIdiomas = () => ({
        temas: [],
        temasUniversais: [],
        poemas: [
            t(1, {
                titulo: 'Original',
                idiomas: idi('Inglês'),
                conceitos: { elos: [{ id: 2, relacao: 'Tradução', direcao: 'origem' }] },
            }),
            t(2, { titulo: 'Tradução', idiomas: idi('pt-BR') }),
        ],
        prosas: [],
    });

    it('oferece os idiomas das versões; sem tradução no acervo, o campo fica escondido', () => {
        montar(dbIdiomas());
        const opcoes = [...$('sortear-idioma').options].map((o) => o.value);
        assert.deepEqual(opcoes, ['', 'Inglês', 'pt-BR']);
        assert.equal($('sortear-idioma').parentElement.hidden, false);
        montar(dbBase());
        assert.equal($('sortear-idioma').parentElement.hidden, true);
    });
    it('a escolha decide a versão sorteada e fica guardada', () => {
        const mem = memoria();
        const api = montar(dbIdiomas(), { armazenamento: mem });
        $('sortear-idioma').value = 'pt-BR';
        $('sortear-idioma').dispatchEvent(new window.Event('change'));
        assert.equal(mem.dados[CHAVE_IDIOMA], 'pt-BR');
        api.sortear();
        assert.equal($('sortear-resultado').querySelector('h2').textContent, 'Tradução');
    });
    it('a escolha guardada volta ao reabrir; escolha que não existe mais vale como nenhuma', () => {
        montar(dbIdiomas(), { armazenamento: memoria({ [CHAVE_IDIOMA]: 'Inglês' }) });
        assert.equal($('sortear-idioma').value, 'Inglês');
        montar(dbIdiomas(), { armazenamento: memoria({ [CHAVE_IDIOMA]: 'Alemão' }) });
        assert.equal($('sortear-idioma').value, '');
    });
    it('o link da outra versão mostra o idioma dela', () => {
        const api = montar(dbIdiomas());
        api.sortear();
        assert.match($('sortear-traducao').textContent, /\(pt-BR; ler esta\)/);
    });
    it('lerIdiomaPreferido e gravarIdiomaPreferido', () => {
        const mem = memoria();
        assert.equal(lerIdiomaPreferido(mem), '');
        assert.equal(gravarIdiomaPreferido(' Inglês ', mem), true);
        assert.equal(lerIdiomaPreferido(mem), 'Inglês');
        assert.equal(
            lerIdiomaPreferido({
                getItem: () => {
                    throw new Error('x');
                },
            }),
            '',
        );
    });
});

describe('Só os reconhecidos na página do sorteio', () => {
    const dbRec = () => ({
        temas: [],
        temasUniversais: [],
        poemas: [
            t(1, { titulo: 'Comum' }),
            t(2, {
                titulo: 'Premiado',
                reconhecimentos: [{ premio: 'Concurso X', posicao: '', ano: 2026, texto: '' }],
            }),
            t(3, {
                titulo: 'Mencionado',
                reconhecimentos: [{ premio: '', posicao: 'Menção honrosa', ano: '', texto: '' }],
            }),
        ],
        prosas: [],
    });
    const marcar = (valor) => {
        $('sortear-reconhecidos').checked = valor;
        $('sortear-reconhecidos').dispatchEvent(new window.Event('change'));
    };

    it('a caixa existe, vem desmarcada e a contagem a segue', () => {
        montar(dbRec());
        assert.equal($('sortear-reconhecidos').checked, false);
        assert.match($('sortear-resultado').parentElement.textContent, /3 textos podem/);
        marcar(true);
        assert.match(raiz.textContent, /2 textos podem ser sorteados/);
        marcar(false);
        assert.match(raiz.textContent, /3 textos podem ser sorteados/);
    });
    it('só sai premiado ou mencionado', () => {
        const api = montar(dbRec(), { aleatorio: fixo(0) });
        marcar(true);
        api.sortear();
        assert.equal($('sortear-resultado').querySelector('h2').textContent, 'Premiado');
        botaoPorTexto('Sortear outro').click();
        assert.equal($('sortear-resultado').querySelector('h2').textContent, 'Mencionado');
    });
    it('sem nenhum reconhecido: contagem zero com o aviso e o botão desligado', () => {
        montar(dbBase());
        marcar(true);
        assert.match(raiz.textContent, /Nenhum texto pode ser sorteado/);
        assert.match(raiz.textContent, /sem prêmio nem menção cadastrados ficaram de fora/);
        assert.equal($('sortear-botao').disabled, true);
        marcar(false);
        assert.equal($('sortear-botao').disabled, false);
    });
    it('as contagens do Tema e da Extensão também seguem o critério', () => {
        montar(dbRec());
        marcar(true);
        assert.match($('sortear-extensao').options[0].textContent, /Qualquer tamanho \(2\)/);
    });
});

describe('Poema ou prosa na página do sorteio', () => {
    const dbTipo = () => ({
        temas: [],
        temasUniversais: [],
        poemas: [t(1, { titulo: 'Verso A' }), t(2, { titulo: 'Verso B' })],
        prosas: [t(20, { titulo: 'Prosa A' })],
    });
    const escolher = (valor) => {
        $('sortear-tipo').value = valor;
        $('sortear-tipo').dispatchEvent(new window.Event('change'));
    };

    it('o seletor existe, vem em "poemas e prosas" e traz a contagem de cada opção', () => {
        montar(dbTipo());
        const rotulos = [...$('sortear-tipo').options].map((o) => o.textContent);
        assert.deepEqual(rotulos, ['Poemas e prosas (3)', 'Só poemas (2)', 'Só prosas (1)']);
        assert.equal($('sortear-tipo').value, '');
    });
    it('a contagem e as outras listas seguem o tipo escolhido', () => {
        montar(dbTipo());
        escolher('prosa');
        assert.match(raiz.textContent, /1 texto pode ser sorteado/);
        assert.match($('sortear-extensao').options[0].textContent, /Qualquer tamanho \(1\)/);
        assert.match($('sortear-universal').options[0].textContent, /Qualquer tema \(1\)/);
        escolher('poema');
        assert.match(raiz.textContent, /2 textos podem ser sorteados/);
    });
    it('só sai texto do tipo escolhido', () => {
        const api = montar(dbTipo(), { aleatorio: fixo(0) });
        escolher('prosa');
        api.sortear();
        assert.equal($('sortear-resultado').querySelector('h2').textContent, 'Prosa A');
        botaoPorTexto('Sortear outro').click();
        assert.equal($('sortear-resultado').querySelector('h2').textContent, 'Prosa A');
        escolher('poema');
        api.sortear();
        assert.match($('sortear-resultado').querySelector('h2').textContent, /^Verso/);
    });
    it('tipo sem nenhum texto no acervo fica desabilitado', () => {
        montar({ temas: [], temasUniversais: [], poemas: [t(1)], prosas: [] });
        const prosa = [...$('sortear-tipo').options].find((o) => o.value === 'prosa');
        assert.equal(prosa.disabled, true);
        assert.match(prosa.textContent, /nenhum texto/);
    });
    it('tipo combinado com outro critério sem texto: contagem zero e botão desligado', () => {
        montar(dbTipo());
        escolher('prosa');
        $('sortear-reconhecidos').checked = true;
        $('sortear-reconhecidos').dispatchEvent(new window.Event('change'));
        assert.match(raiz.textContent, /Nenhum texto pode ser sorteado/);
        assert.equal($('sortear-botao').disabled, true);
    });
    it('o tipo não fica guardado entre visitas', () => {
        const armazenamento = memoria();
        montar(dbTipo(), { armazenamento });
        escolher('prosa');
        assert.deepEqual(Object.keys(armazenamento.dados), []);
        montar(dbTipo(), { armazenamento });
        assert.equal($('sortear-tipo').value, '');
    });
});

describe('Sortear outro leva a tela ao começo do texto novo', () => {
    // O jsdom não tem layout: troca a posição medida do bloco e conta as rolagens.
    function espiar(topo) {
        const proto = window.HTMLElement.prototype;
        const original = {
            rect: proto.getBoundingClientRect,
            rolar: proto.scrollIntoView,
        };
        const rolagens = [];
        proto.getBoundingClientRect = function () {
            return { top: topo.valor, bottom: topo.valor + 100, left: 0, right: 0 };
        };
        proto.scrollIntoView = function (opcoes) {
            rolagens.push({ no: this.tagName, opcoes });
        };
        return {
            rolagens,
            restaurar() {
                proto.getBoundingClientRect = original.rect;
                proto.scrollIntoView = original.rolar;
            },
        };
    }

    it('começo do texto acima da tela (fim de um texto longo): rola até ele, sem animação', () => {
        const topo = { valor: -900 };
        const e = espiar(topo);
        try {
            const api = montar(dbBase());
            api.sortear();
            botaoPorTexto('Sortear outro').click();
            assert.ok(e.rolagens.length >= 1);
            const ultima = e.rolagens[e.rolagens.length - 1];
            assert.equal(ultima.no, 'ARTICLE');
            assert.equal(ultima.opcoes.block, 'start');
            assert.equal(ultima.opcoes.behavior, 'auto');
        } finally {
            e.restaurar();
        }
    });

    it('começo do texto já à vista: a tela não se mexe', () => {
        const e = espiar({ valor: 120 });
        try {
            const api = montar(dbBase());
            api.sortear();
            botaoPorTexto('Sortear outro').click();
            assert.equal(e.rolagens.length, 0);
        } finally {
            e.restaurar();
        }
    });

    it('trocar a posição da ficha não rola, mesmo com o começo fora da tela', () => {
        const topo = { valor: 120 };
        const e = espiar(topo);
        try {
            const api = montar(dbBase());
            api.sortear();
            topo.valor = -900;
            const sel = $('sortear-ficha-posicao');
            sel.value = 'antes';
            sel.dispatchEvent(new window.Event('change'));
            assert.equal(e.rolagens.length, 0);
        } finally {
            e.restaurar();
        }
    });
});

describe('rótulo da caixa de favoritos', () => {
    it('diz "Só os meus preferidos" com o piso de corações', () => {
        montar(dbBase());
        const rotulo = $('sortear-favoritos').closest('label').textContent;
        assert.equal(rotulo, 'Só os meus preferidos (4 corações ou mais)');
    });

    it('sem texto entre os preferidos do tema, a mensagem fala em "meus preferidos"', () => {
        const api = montar(dbBase());
        $('sortear-universal').value = '11';
        $('sortear-universal').dispatchEvent(new window.Event('change'));
        $('sortear-favoritos').checked = true;
        $('sortear-favoritos').dispatchEvent(new window.Event('change'));
        api.sortear();
        assert.match($('sortear-resultado').textContent, /entre os meus preferidos/);
        assert.doesNotMatch($('sortear-resultado').textContent, /do autor/);
    });
});

describe('Anterior e Próximo no sorteio', () => {
    const titulo = () => $('sortear-resultado').querySelector('h2').textContent;

    it('com um só texto na tela, não aparece nada de percurso', () => {
        const api = montar(dbBase());
        api.sortear();
        assert.equal($('sortear-anterior'), null);
        assert.equal($('sortear-proximo'), null);
        assert.equal($('sortear-posicao'), null);
    });

    it('Anterior reabre o texto de antes, e Próximo volta ao seguinte, com "2 de 2"', () => {
        const api = montar(dbBase());
        api.sortear();
        botaoPorTexto('Sortear outro').click();
        assert.equal(titulo(), 'T2');
        assert.equal($('sortear-proximo'), null);
        assert.equal($('sortear-posicao').textContent, '2 de 2');
        $('sortear-anterior').click();
        assert.equal(titulo(), 'T1');
        assert.equal($('sortear-anterior'), null);
        assert.equal($('sortear-posicao').textContent, '1 de 2');
        $('sortear-proximo').click();
        assert.equal(titulo(), 'T2');
    });

    it('os botões ficam no rodapé, junto do Sortear outro', () => {
        const api = montar(dbBase());
        api.sortear();
        botaoPorTexto('Sortear outro').click();
        assert.equal(
            $('sortear-anterior').parentElement,
            botaoPorTexto('Sortear outro').parentElement,
        );
    });

    it('voltar e avançar não mexem nos recentes guardados', () => {
        const mem = memoria();
        const api = montar(dbBase(), { armazenamento: mem });
        api.sortear();
        botaoPorTexto('Sortear outro').click();
        const antes = mem.dados[CHAVE_RECENTES];
        $('sortear-anterior').click();
        $('sortear-proximo').click();
        assert.equal(mem.dados[CHAVE_RECENTES], antes);
    });

    it('Sortear outro, depois de voltar, entra no fim do percurso e não apaga o que havia', () => {
        const api = montar(dbBase());
        api.sortear();
        botaoPorTexto('Sortear outro').click();
        $('sortear-anterior').click();
        botaoPorTexto('Sortear outro').click();
        assert.equal($('sortear-posicao').textContent, '3 de 3');
        assert.equal($('sortear-proximo'), null);
        $('sortear-anterior').click();
        $('sortear-anterior').click();
        assert.equal(titulo(), 'T1');
        $('sortear-proximo').click();
        assert.equal(titulo(), 'T2');
    });

    it('o percurso guarda no máximo PERCURSO_MAXIMO textos', () => {
        const db = dbBase();
        db.poemas = Array.from({ length: PERCURSO_MAXIMO + 5 }, (_, i) => t(i + 1));
        db.prosas = [];
        const api = montar(db);
        api.sortear();
        for (let i = 0; i < PERCURSO_MAXIMO + 3; i++) botaoPorTexto('Sortear outro').click();
        assert.equal($('sortear-posicao').textContent, `${PERCURSO_MAXIMO} de ${PERCURSO_MAXIMO}`);
    });

    it('voltar a um texto com conteúdo sensível abre com o aviso fechado, e o Anterior continua lá', () => {
        const db = dbBase();
        db.poemas[1].conteudoSensivel = 'luto';
        const api = montar(db);
        api.sortear();
        botaoPorTexto('Sortear outro').click();
        assert.equal(titulo(), 'T2');
        assert.ok($('sortear-ler-mesmo-assim'));
        assert.ok($('sortear-anterior'));
        $('sortear-anterior').click();
        $('sortear-proximo').click();
        assert.ok($('sortear-ler-mesmo-assim'));
        assert.ok($('sortear-anterior'));
    });
});

describe('Histórico do sorteio', () => {
    const titulo = () => $('sortear-resultado').querySelector('h2').textContent;
    const titulos = () =>
        [...$('sortear-historico').querySelectorAll('li button')].map((b) => b.textContent);

    it('começa escondido e aparece com o que foi sorteado, do mais novo para o mais velho', () => {
        const api = montar(dbBase());
        assert.equal($('sortear-historico').hidden, true);
        api.sortear();
        botaoPorTexto('Sortear outro').click();
        assert.equal($('sortear-historico').hidden, false);
        assert.match(
            $('sortear-historico').querySelector('summary').textContent,
            /Últimos sorteados \(2\)/,
        );
        assert.deepEqual(titulos(), ['T2', 'T1']);
    });

    it('sobrevive a fechar e reabrir a página, pelos recentes guardados', () => {
        const mem = memoria();
        const api = montar(dbBase(), { armazenamento: mem });
        api.sortear();
        botaoPorTexto('Sortear outro').click();
        montar(dbBase(), { armazenamento: mem });
        assert.deepEqual(titulos(), ['T2', 'T1']);
    });

    it('clicar num título reabre o texto, entra no percurso e não mexe nos recentes', () => {
        const mem = memoria();
        const api = montar(dbBase(), { armazenamento: mem });
        api.sortear();
        botaoPorTexto('Sortear outro').click();
        const antes = mem.dados[CHAVE_RECENTES];
        [...$('sortear-historico').querySelectorAll('li button')]
            .find((b) => b.textContent === 'T1')
            .click();
        assert.equal(titulo(), 'T1');
        assert.equal($('sortear-posicao').textContent, '3 de 3');
        assert.ok($('sortear-anterior'));
        assert.equal(mem.dados[CHAVE_RECENTES], antes);
    });

    it('clicar no texto que já está na tela não repete no percurso', () => {
        const api = montar(dbBase());
        api.sortear();
        botaoPorTexto('Sortear outro').click();
        [...$('sortear-historico').querySelectorAll('li button')]
            .find((b) => b.textContent === 'T2')
            .click();
        assert.equal($('sortear-posicao').textContent, '2 de 2');
    });

    it('texto apagado do acervo some do histórico', () => {
        const mem = memoria({ [CHAVE_RECENTES]: JSON.stringify(['poema:999', 'poema:1']) });
        montar(dbBase(), { armazenamento: mem });
        assert.deepEqual(titulos(), ['T1']);
    });
});

describe('Anterior e Próximo também ao lado do Sortear', () => {
    const titulo = () => $('sortear-resultado').querySelector('h2').textContent;

    it('ficam no mesmo bloco do botão Sortear, só quando há para onde ir', () => {
        const api = montar(dbBase());
        assert.equal($('sortear-anterior-topo'), null);
        api.sortear();
        assert.equal($('sortear-anterior-topo'), null);
        assert.equal($('sortear-proximo-topo'), null);
        assert.equal($('sortear-posicao-topo'), null);
        botaoPorTexto('Sortear outro').click();
        assert.equal($('sortear-anterior-topo').parentElement, $('sortear-controles-topo'));
        assert.equal($('sortear-controles-topo').parentElement, $('sortear-botao').parentElement);
        assert.equal($('sortear-posicao-topo').textContent, '2 de 2');
    });

    it('funcionam como os do rodapé e os dois pares ficam sempre iguais', () => {
        const api = montar(dbBase());
        api.sortear();
        botaoPorTexto('Sortear outro').click();
        $('sortear-anterior-topo').click();
        assert.equal(titulo(), 'T1');
        assert.equal($('sortear-anterior-topo'), null);
        assert.equal($('sortear-anterior'), null);
        assert.ok($('sortear-proximo-topo'));
        assert.ok($('sortear-proximo'));
        assert.equal($('sortear-posicao-topo').textContent, $('sortear-posicao').textContent);
        $('sortear-proximo-topo').click();
        assert.equal(titulo(), 'T2');
        assert.equal($('sortear-proximo-topo'), null);
    });

    it('o par de cima não traz outro "Sortear outro"', () => {
        const api = montar(dbBase());
        api.sortear();
        botaoPorTexto('Sortear outro').click();
        assert.equal(
            [...document.querySelectorAll('button')].filter(
                (b) => b.textContent === 'Sortear outro',
            ).length,
            1,
        );
    });
});
