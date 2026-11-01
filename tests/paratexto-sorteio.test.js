import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Paratexto na página do sorteio, entrega 2 de 3: a tela. A lógica pura mora
// em paratexto-publico.test.js.
const { montarSortear, montarParatexto } = await import('../js/sortear-pagina.js');

const memoria = () => {
    const dados = {};
    return {
        getItem: (k) => (k in dados ? dados[k] : null),
        setItem: (k, v) => {
            dados[k] = String(v);
        },
    };
};

const base = (extra = {}) => ({
    temas: [],
    temasUniversais: [],
    prosas: [],
    poemas: [
        {
            id: 1,
            titulo: 'T1',
            texto: 'verso 1',
            status: 'publicado',
            sorteavel: true,
            temas: [],
            ...extra,
        },
    ],
});

describe('montarParatexto', () => {
    it('sem nada para mostrar devolve null', () => {
        assert.equal(montarParatexto({ notas: 'privada', contextoHistorico: 'x' }), null);
    });

    it('monta os blocos em texto puro, com as quebras de linha', () => {
        const sec = montarParatexto({
            descricaoVisual: 'Fundo preto.\nLetras <b>brancas</b>.',
            anexosNotaGeral: 'Acompanha 1 foto.',
        });
        assert.equal(sec.id, 'sortear-paratexto');
        assert.match(sec.textContent, /Descrição Visual/);
        assert.match(sec.textContent, /Fundo preto\.\nLetras <b>brancas<\/b>\./);
        assert.equal(sec.querySelector('b'), null);
        assert.match(sec.textContent, /Nota sobre o conjunto de anexos/);
    });

    it('lista com tipo em negrito, link só para http e https, aberto em outra aba', () => {
        const sec = montarParatexto({
            anexos: [
                {
                    tipo: 'Ilustração',
                    texto: 'Versão ilustrada',
                    link: 'https://drive.google.com/x',
                },
                { tipo: 'Foto', texto: 'Bilhete', link: 'javascript:alert(1)' },
            ],
        });
        const itens = sec.querySelectorAll('li');
        assert.equal(itens.length, 2);
        assert.equal(itens[0].querySelector('strong').textContent, 'Ilustração: ');
        const a = itens[0].querySelector('a');
        assert.equal(a.getAttribute('href'), 'https://drive.google.com/x');
        assert.equal(a.getAttribute('target'), '_blank');
        assert.match(a.getAttribute('rel'), /noopener/);
        assert.equal(itens[1].querySelector('a'), null);
        assert.match(itens[1].textContent, /Bilhete/);
    });

    it('anotação marginal: trecho em itálico e posição em negrito', () => {
        const sec = montarParatexto({
            anotacoesMarginais: [{ trecho: 'Que audácia', posicao: 'Abaixo', texto: 'É um corte' }],
        });
        const li = sec.querySelector('li');
        assert.equal(li.querySelector('em').textContent, '(Que audácia) ');
        assert.equal(li.querySelector('strong').textContent, 'Abaixo: ');
    });

    it('nada de Inspiração, Ocultação, Pessoas nem Elos', () => {
        const sec = montarParatexto({
            descricaoVisual: 'ok',
            contextoHistorico: 'inspiração secreta',
            ocultacao: 'oculto secreto',
            pessoas: [{ nome: 'Fulano' }],
            conceitos: { elos: [1], ecos: [2] },
            referenciasExternas: [{ tipo: 'Notícia', texto: 'manchete' }],
            intertextualidade: [{ relacao: 'Alusão', obra: 'Obra alusiva', autor: 'X' }],
        });
        assert.doesNotMatch(sec.textContent, /secret|Fulano|manchete|alusiva/);
    });
});

describe('paratexto na página do sorteio', () => {
    let raiz;
    beforeEach(() => {
        document.body.innerHTML = '<main id="raiz"></main>';
        raiz = document.getElementById('raiz');
    });
    const sortear = (db) => {
        montarSortear(raiz, { db, aleatorio: () => 0, armazenamento: memoria() });
        raiz.querySelector('#sortear-botao')?.click();
    };
    const depois = (a, b) =>
        !!(a.compareDocumentPosition(b) & window.Node.DOCUMENT_POSITION_FOLLOWING);

    it('texto sem paratexto não ganha o bloco', () => {
        sortear(base());
        assert.equal(raiz.querySelector('#sortear-paratexto'), null);
    });

    it('fica depois do texto e do bloco do autor, e antes da ficha', () => {
        sortear(
            base({
                descricaoVisual: 'Fundo preto.',
                comentariosPublicos: 'olá',
                status: 'publicado',
            }),
        );
        const autor = raiz.querySelector('#sortear-comentarios');
        const para = raiz.querySelector('#sortear-paratexto');
        const ficha = raiz.querySelector('#sortear-ficha');
        assert.ok(para && autor && ficha);
        assert.ok(depois(autor, para), 'o paratexto vem depois do bloco do autor');
        assert.ok(depois(para, ficha), 'a ficha vem depois do paratexto');
    });

    it('com a ficha antes do texto, o paratexto continua depois do texto', () => {
        const armazenamento = memoria();
        armazenamento.setItem('arquivoPoetico_sorteioFicha', 'antes');
        montarSortear(raiz, {
            db: base({ descricaoVisual: 'Fundo preto.' }),
            aleatorio: () => 0,
            armazenamento,
        });
        raiz.querySelector('#sortear-botao').click();
        const ficha = raiz.querySelector('#sortear-ficha');
        const para = raiz.querySelector('#sortear-paratexto');
        assert.ok(ficha && para);
        assert.ok(depois(ficha, para));
    });

    it('com conteúdo sensível fechado, nada do paratexto aparece até ler mesmo assim', () => {
        sortear(base({ conteudoSensivel: 'luto', descricaoVisual: 'Fundo preto.' }));
        assert.equal(raiz.querySelector('#sortear-paratexto'), null);
        assert.doesNotMatch(raiz.textContent, /Fundo preto/);
        raiz.querySelector('#sortear-ler-mesmo-assim').click();
        assert.match(raiz.querySelector('#sortear-paratexto').textContent, /Fundo preto/);
    });

    it('Reconhecimentos e créditos aparecem, e a obra pessoal não', () => {
        sortear(
            base({
                reconhecimentos: [{ premio: 'Concurso X', posicao: '1º lugar', ano: 2026 }],
                intertextualidade: [
                    { relacao: 'Citação', obra: 'A República', autor: 'Platão' },
                    {
                        relacao: 'Citação',
                        obra: 'Carta íntima',
                        autor: 'Alguém',
                        obraPessoal: true,
                    },
                ],
            }),
        );
        const txt = raiz.querySelector('#sortear-paratexto').textContent;
        assert.match(txt, /Concurso X, 1º lugar, 2026/);
        assert.match(txt, /Citação: A República \(Platão\)/);
        assert.doesNotMatch(txt, /Carta íntima|Alguém/);
    });
});
