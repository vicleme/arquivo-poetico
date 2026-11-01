import './helpers/localstorage-shim.js';

// Paratexto na página do sorteio, entrega 1 de 3: lógica pura (blocos de
// paratexto, créditos e reconhecimentos) e as linhas novas da ficha.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    anexosDe,
    anotacoesMarginaisDe,
    blocosParatextoDoTexto,
    creditosDe,
    descricaoVisualDe,
    linkSeguro,
    reconhecimentosDe,
} from '../js/paratexto-publico.js';
import { fichaDoTexto } from '../js/ficha-do-texto.js';

// Um segmento vira texto simples, para comparar linhas inteiras.
const plano = (linha) => linha.map((s) => s.texto).join('');

describe('linkSeguro', () => {
    it('aceita só http e https', () => {
        assert.equal(linkSeguro(' https://drive.google.com/x '), 'https://drive.google.com/x');
        assert.equal(linkSeguro('http://a.com'), 'http://a.com');
        for (const v of ['javascript:alert(1)', 'data:text/html,x', 'ftp://a.com', '', null]) {
            assert.equal(linkSeguro(v), '');
        }
    });
});

describe('descrição visual e anotações marginais', () => {
    it('a descrição vem sem os espaços das pontas e vazia quando não há', () => {
        assert.equal(descricaoVisualDe({ descricaoVisual: '  Fundo preto.\n' }), 'Fundo preto.');
        assert.equal(descricaoVisualDe({}), '');
        assert.equal(descricaoVisualDe(null), '');
    });

    it('a anotação segue o formato do Ver e a sem texto não entra', () => {
        const linhas = anotacoesMarginaisDe({
            anotacoesMarginais: [
                {
                    trecho: 'Que audácia sua',
                    posicao: 'Ao lado direito',
                    fonte: 'Baguet Script',
                    texto: 'Me curar de alguém',
                    notas: 'em duas colunas',
                },
                { posicao: 'Abaixo', texto: '   ' },
                { texto: 'Solta' },
            ],
        });
        assert.equal(linhas.length, 2);
        assert.equal(
            plano(linhas[0]),
            '(Que audácia sua) Ao lado direito, Baguet Script: Me curar de alguém (em duas colunas)',
        );
        assert.equal(linhas[0][0].estilo, 'italico');
        assert.equal(linhas[0][1].estilo, 'forte');
        assert.equal(plano(linhas[1]), 'Solta');
    });

    it('prosa não tem as duas coisas e não quebra', () => {
        assert.deepEqual(anotacoesMarginaisDe({ tipo: 'prosa' }), []);
        assert.equal(descricaoVisualDe({ tipo: 'prosa' }), '');
    });
});

describe('anexos', () => {
    it('mostra tipo e texto, com o link e a data de acesso quando há', () => {
        const linhas = anexosDe({
            anexos: [
                {
                    tipo: 'Ilustração',
                    texto: 'Versão ilustrada',
                    link: 'https://drive.google.com/abc',
                    linkTexto: 'Abrir',
                    dataAcesso: '2026-10-31',
                },
            ],
        });
        assert.equal(
            plano(linhas[0]),
            'Ilustração: Versão ilustrada · Abrir (acesso em 31/10/2026)',
        );
        const link = linhas[0].find((s) => s.href);
        assert.equal(link.href, 'https://drive.google.com/abc');
        assert.equal(link.texto, 'Abrir');
    });

    it('link que não é http ou https some, e a descrição fica', () => {
        const linhas = anexosDe({
            anexos: [{ tipo: 'Foto', texto: 'Bilhete', link: 'javascript:alert(1)' }],
        });
        assert.equal(plano(linhas[0]), 'Foto: Bilhete');
        assert.equal(
            linhas[0].some((s) => s.href),
            false,
        );
    });

    it('anexo só com link usa o próprio endereço como rótulo', () => {
        const linhas = anexosDe({ anexos: [{ link: 'https://a.com/x' }] });
        assert.equal(plano(linhas[0]), 'https://a.com/x');
    });

    it('formato antigo (texto solto) e anexo vazio', () => {
        const linhas = anexosDe({ anexos: ['Capa original', { tipo: 'Foto' }, null] });
        assert.deepEqual(linhas.map(plano), ['Capa original']);
    });
});

describe('reconhecimentos', () => {
    it('segue o formato do Ver e não deixa dois-pontos pendurados', () => {
        const linhas = reconhecimentosDe({
            reconhecimentos: [
                { premio: '2º Concurso de Poesias', posicao: '1º lugar', ano: 2026 },
                { premio: 'Menção', ano: '2025', texto: 'Júri popular' },
            ],
        });
        assert.deepEqual(linhas.map(plano), [
            '2º Concurso de Poesias, 1º lugar, 2026',
            'Menção, 2025: Júri popular',
        ]);
    });

    it('sem nada preenchido não gera linha', () => {
        assert.deepEqual(reconhecimentosDe({ reconhecimentos: [{}, null] }), []);
        assert.deepEqual(reconhecimentosDe({}), []);
    });
});

describe('créditos', () => {
    const inter = (extra) => ({
        relacao: 'Citação',
        obra: 'A República',
        autor: 'Platão',
        ...extra,
    });

    it('entram Citação e Paráfrase, com obra e autor e mais nada', () => {
        const linhas = creditosDe({
            intertextualidade: [
                inter({ nota: 'privada', link: 'https://a.com', descricao: 'aposto', trecho: 'x' }),
                inter({
                    relacao: 'paráfrase',
                    obra: 'Mrs. Potato Head',
                    autor: 'Melanie Martinez',
                }),
            ],
        });
        assert.deepEqual(linhas.map(plano), [
            'Citação: A República (Platão)',
            'paráfrase: Mrs. Potato Head (Melanie Martinez)',
        ]);
    });

    it('Alusão, Menção, Bricolagem e relação vazia ficam de fora', () => {
        const linhas = creditosDe({
            intertextualidade: ['Alusão', 'Menção', 'Bricolagem', ''].map((relacao) =>
                inter({ relacao }),
            ),
        });
        assert.deepEqual(linhas, []);
    });

    it('obra pessoal nunca entra, em nenhum dos dois campos', () => {
        const linhas = creditosDe({
            intertextualidade: [inter({ obraPessoal: true })],
            hipertextualidade: [{ relacao: 'Tradução', hipotexto: 'Carta', obraPessoal: true }],
        });
        assert.deepEqual(linhas, []);
    });

    it('Hipertextualidade entra inteira, com o texto que o Ver mostra', () => {
        const linhas = creditosDe({
            hipertextualidade: [
                { relacao: 'Tradução', hipotexto: 'Chloe or Sam', autor: 'Taylor Swift' },
                { relacao: 'Paródia' },
            ],
        });
        assert.deepEqual(linhas.map(plano), [
            'Tradução da obra/(hipo)texto Chloe or Sam (Taylor Swift)',
            'Paródia',
        ]);
    });

    it('entrada antiga (texto no lugar de obra) conta, e linha repetida sai uma vez', () => {
        const linhas = creditosDe({
            intertextualidade: [
                { relacao: 'Citação', texto: 'Hamlet', autor: 'Shakespeare' },
                { relacao: 'Citação', texto: 'Hamlet', autor: 'Shakespeare' },
                { relacao: 'Citação' },
            ],
        });
        assert.deepEqual(linhas.map(plano), ['Citação: Hamlet (Shakespeare)']);
    });

    it('vários autores saem numa frase só', () => {
        const linhas = creditosDe({
            intertextualidade: [inter({ autor: undefined, autores: ['A', 'B', 'C'] })],
        });
        assert.equal(plano(linhas[0]), 'Citação: A República (A, B e C)');
    });
});

describe('blocosParatextoDoTexto', () => {
    it('devolve os blocos na ordem, sem os vazios', () => {
        const blocos = blocosParatextoDoTexto({
            descricaoVisual: 'Fundo preto.',
            anotacoesMarginais: [{ texto: 'nota' }],
            anexos: [{ tipo: 'Foto', texto: 'x' }],
            anexosNotaGeral: 'Acompanha 1 foto.',
            intertextualidade: [{ relacao: 'Citação', obra: 'O', autor: 'P' }],
            reconhecimentos: [{ premio: 'Prêmio' }],
            // Nunca saem:
            contextoHistorico: 'inspiração',
            ocultacao: 'oculto',
            notas: 'privada',
        });
        assert.deepEqual(
            blocos.map((b) => b.rotulo),
            [
                'Descrição Visual',
                'Anotações Marginais',
                'Anexos',
                'Nota sobre o conjunto de anexos',
                'Obras citadas e adaptadas',
                'Reconhecimentos',
            ],
        );
        assert.equal(blocos[0].texto, 'Fundo preto.');
        assert.equal(blocos[3].texto, 'Acompanha 1 foto.');
        assert.equal(JSON.stringify(blocos).includes('inspiração'), false);
        assert.equal(JSON.stringify(blocos).includes('privada'), false);
    });

    it('texto sem nada devolve lista vazia', () => {
        assert.deepEqual(blocosParatextoDoTexto({ titulo: 'T', texto: 'verso' }), []);
        assert.deepEqual(blocosParatextoDoTexto(null), []);
    });
});

describe('ficha: Idioma, Jargão e gíria, Gênero e Fonte', () => {
    const base = { id: 1, titulo: 'T', texto: 'verso', status: 'publicado' };
    const valor = (ficha, rotulo) => ficha.find((l) => l.rotulo === rotulo)?.valor;
    const rotulos = (ficha) => ficha.map((l) => l.rotulo);

    it('sem os campos, a ficha continua como era', () => {
        const ficha = fichaDoTexto({ autores: [] }, 'poema', base);
        assert.deepEqual(rotulos(ficha), ['Status']);
    });

    it('Idioma, Jargão e gíria e Gênero entram antes do Status', () => {
        const ficha = fichaDoTexto({ autores: [] }, 'prosa', {
            ...base,
            idiomas: [{ idioma: 'Inglês', papel: 'principal', dialetos: [] }],
            jargaoGiria: ['Pajubá'],
            genero: 'Conto',
        });
        assert.deepEqual(rotulos(ficha), ['Idioma', 'Jargão e gíria', 'Gênero', 'Status']);
        assert.equal(valor(ficha, 'Idioma'), 'Inglês');
        assert.equal(valor(ficha, 'Jargão e gíria'), 'Pajubá');
        assert.equal(valor(ficha, 'Gênero'), 'Conto');
    });

    it('obra própria não ganha linha de Fonte', () => {
        const ficha = fichaDoTexto({ autores: [] }, 'poema', {
            ...base,
            fonteTexto: { origem: 'Obra própria', link: 'https://a.com', conferido: true },
        });
        assert.deepEqual(rotulos(ficha), ['Status']);
    });

    it('texto de outra fonte mostra Fonte, Edição e Grafia, sem link nem conferência', () => {
        const ficha = fichaDoTexto({ autores: [] }, 'poema', {
            ...base,
            fonteTexto: {
                origem: 'Wikisource',
                edicao: '1ª edição, 1912',
                link: 'https://pt.wikisource.org/x',
                conferido: true,
            },
        });
        assert.equal(valor(ficha, 'Fonte'), 'Wikisource');
        assert.equal(valor(ficha, 'Edição'), '1ª edição, 1912');
        assert.equal(valor(ficha, 'Link da fonte'), undefined);
        assert.equal(valor(ficha, 'Texto conferido'), undefined);
    });
});
