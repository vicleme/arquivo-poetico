import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Valência do Tema, entrega 3: "peso dos temas" nas Estatísticas (por autor e
// ao longo de ano, Período Biográfico e livro).
const { db } = await import('../js/db.js');
const E = await import('../js/estatisticas.js');
const { renderValencia, formatarIndiceValencia } =
    await import('../js/estatisticas-tela-valencia.js');

const HTML = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const SECAO = HTML.match(/<section id="estatisticas-temas-assuntos"[\s\S]*?<\/section>/)[0];

function acervo() {
    localStorage.clear();
    ['partes', 'secoes', 'elementos', 'grupos', 'pessoas', 'assuntos'].forEach((c) => (db[c] = []));
    db.autores = [
        { id: 1, nome: 'Ana' },
        { id: 2, nome: 'Bia' },
    ];
    db.epocas = [
        { id: 50, nome: 'Infância', inicio: { ano: 1990 } },
        { id: 51, nome: 'Juventude', inicio: { ano: 2005 } },
        { id: 52, nome: 'Reservada', inicio: { ano: 2000 }, oculto: true },
    ];
    db.livros = [{ id: 70, titulo: 'Primeiro', tipo: 'Livro' }];
    db.temas = [
        { id: 1, nome: 'Amizade', notas: '', valencia: 'agradavel' },
        { id: 2, nome: 'Violência', notas: '', valencia: 'desagradavel' },
        { id: 3, nome: 'Cotidiano', notas: '', valencia: 'neutro' },
        { id: 4, nome: 'Saudade', notas: '', valencia: 'ambivalente' },
        { id: 5, nome: 'Sem classe', notas: '' },
    ];
    const t = (id, autorId, ano, temas, extra = {}) => ({
        id,
        titulo: `T${id}`,
        ano,
        autoria: [{ autorId }],
        temas,
        sinalizacoesTema: temas.map((e) => db.temas.find((x) => x.id === e.temaId).nome).join(', '),
        ...extra,
    });
    db.poemas = [
        t(
            1,
            1,
            2010,
            [
                { temaId: 1, papel: 'principal' },
                { temaId: 2, papel: 'secundario' },
            ],
            {
                epocaRetratada: { periodos: [{ epocaId: 50 }] },
            },
        ),
        t(
            2,
            1,
            2010,
            [
                { temaId: 1, papel: 'principal' },
                { temaId: 3, papel: '' },
            ],
            {
                epocaRetratada: { periodos: [{ epocaId: 50 }, { epocaId: 51 }] },
            },
        ),
        t(
            3,
            2,
            2012,
            [
                { temaId: 2, papel: 'principal' },
                { temaId: 4, papel: 'secundario' },
            ],
            {
                epocaRetratada: { periodos: [{ epocaId: 52 }] },
            },
        ),
        t(4, 2, 2012, [
            { temaId: 5, papel: 'principal' },
            { temaId: 2, papel: 'principal' },
        ]),
        t(5, 2, null, [{ temaId: 2, papel: 'principal' }]),
    ];
    db.prosas = [];
}

const porRotulo = (lista, rotulo) => lista.find((g) => g.rotulo === rotulo);

describe('valenciaGeral', () => {
    beforeEach(acervo);

    it('conta as ligações por valência e deixa as sem valência fora do índice', () => {
        const g = E.valenciaGeral();
        assert.equal(g.textos, 5);
        assert.equal(g.ligacoes, 9);
        assert.equal(g.agradavel, 2);
        assert.equal(g.neutro, 1);
        assert.equal(g.desagradavel, 4);
        assert.equal(g.ambivalente, 1);
        assert.equal(g.semValencia, 1);
        assert.equal(g.classificados, 8);
        assert.ok(Math.abs(g.cobertura - 8 / 9) < 1e-9);
        // (4 - 2) / (2 + 1 + 4): ambivalente fora da média
        assert.ok(Math.abs(g.indice - 2 / 7) < 1e-9);
    });

    it('o seletor de papel recorta as ligações', () => {
        const g = E.valenciaGeral({ papel: 'principal' });
        assert.equal(g.ligacoes, 6);
        assert.equal(g.agradavel, 2);
        assert.equal(g.desagradavel, 3);
        const s = E.valenciaGeral({ papel: 'secundario' });
        assert.equal(s.ligacoes, 2);
        assert.equal(s.ambivalente, 1);
    });

    it('sem nenhum tema classificado o índice é nulo', () => {
        db.temas.forEach((t) => delete t.valencia);
        const g = E.valenciaGeral();
        assert.equal(g.classificados, 0);
        assert.equal(g.indice, null);
        assert.equal(g.cobertura, 0);
    });

    it('o mesmo tema duas vezes no texto conta uma ligação', () => {
        db.poemas[0].temas.push({ temaId: 1, papel: 'secundario' });
        assert.equal(E.valenciaGeral().ligacoes, 9);
    });
});

describe('valenciaPorAutor', () => {
    beforeEach(acervo);

    it('um grupo por autor, mais ligações primeiro, com o índice de cada um', () => {
        const r = E.valenciaPorAutor();
        assert.deepEqual(
            r.map((g) => g.rotulo),
            ['Bia', 'Ana'],
        );
        const ana = porRotulo(r, 'Ana');
        assert.equal(ana.textos, 2);
        assert.ok(Math.abs(ana.indice - (1 - 2) / 4) < 1e-9);
        assert.equal(porRotulo(r, 'Bia').semValencia, 1);
    });

    it('coautoria conta para cada autor; sem autor vai para "(sem autor)"', () => {
        db.poemas[0].autoria = [{ autorId: 1 }, { autorId: 2 }];
        db.poemas[4].autoria = [];
        const r = E.valenciaPorAutor();
        assert.equal(porRotulo(r, 'Bia').textos, 3);
        assert.equal(porRotulo(r, '(sem autor)').textos, 1);
    });
});

describe('valenciaPorEixo', () => {
    beforeEach(acervo);

    it('ano: ordem cronológica, texto sem data fica de fora', () => {
        const r = E.valenciaPorEixo({ eixo: 'ano' });
        assert.deepEqual(
            r.map((g) => g.rotulo),
            ['2010', '2012'],
        );
        assert.equal(porRotulo(r, '2010').textos, 2);
        assert.equal(porRotulo(r, '2012').ligacoes, 4);
    });

    it('período: ordem pelo início, vários períodos contam em cada, oculto agrupado no fim', () => {
        const r = E.valenciaPorEixo({ eixo: 'periodo' });
        assert.deepEqual(
            r.map((g) => g.rotulo),
            ['Infância', 'Juventude', '(período oculto)'],
        );
        assert.equal(porRotulo(r, 'Infância').textos, 2);
        assert.equal(porRotulo(r, 'Juventude').textos, 1);
        assert.equal(porRotulo(r, 'Reservada'), undefined);
    });

    it('livro: pelos livros onde o texto aparece', () => {
        db.poemas[0].aparicoes = [{ livroId: 70 }];
        const r = E.valenciaPorEixo({ eixo: 'livro' });
        assert.deepEqual(
            r.map((g) => [g.rotulo, g.textos]),
            [['Primeiro', 1]],
        );
    });

    it('marca grupo com poucas ligações classificadas', () => {
        const r = E.valenciaPorEixo({ eixo: 'ano' });
        assert.equal(porRotulo(r, '2010').poucosDados, true);
        assert.equal(porRotulo(r, '2010').classificados, 4);
        for (let i = 0; i < 4; i++) {
            db.poemas.push({
                id: 100 + i,
                titulo: 'x',
                ano: 2010,
                temas: [
                    { temaId: 1, papel: 'principal' },
                    { temaId: 2, papel: 'principal' },
                ],
                sinalizacoesTema: 'Amizade, Violência',
            });
        }
        assert.equal(porRotulo(E.valenciaPorEixo({ eixo: 'ano' }), '2010').poucosDados, false);
    });
});

describe('painel Peso dos temas', () => {
    beforeEach(() => {
        acervo();
        document.body.innerHTML = SECAO;
    });

    it('o index.html tem o cartão e as áreas do painel', () => {
        [
            'card-valencia-temas',
            'painel-valencia-resumo',
            'painel-valencia-autores',
            'painel-valencia-eixo',
        ].forEach((id) => assert.match(SECAO, new RegExp(`id="${id}"`)));
    });

    it('desenha o resumo, os autores e o eixo escolhido', () => {
        renderValencia();
        const doc = (id) => document.getElementById(id);
        assert.ok(doc('painel-valencia-resumo').textContent.includes('89% das ligações'));
        const autores = [
            ...doc('painel-valencia-autores').querySelectorAll('[data-grupo-valencia]'),
        ];
        assert.deepEqual(
            autores.map((e) => e.dataset.grupoValencia),
            ['Bia', 'Ana'],
        );
        const eixo = [...doc('painel-valencia-eixo').querySelectorAll('[data-grupo-valencia]')];
        assert.deepEqual(
            eixo.map((e) => e.dataset.grupoValencia),
            ['2010', '2012'],
        );
        const barras = autores[1].querySelectorAll('[data-segmento]');
        assert.ok(barras.length >= 2);
    });

    it('trocar o eixo muda as linhas (a escolha fica guardada)', () => {
        E.definirEixoValencia('periodo');
        renderValencia();
        const eixo = [
            ...document
                .getElementById('painel-valencia-eixo')
                .querySelectorAll('[data-grupo-valencia]'),
        ];
        assert.deepEqual(
            eixo.map((e) => e.dataset.grupoValencia),
            ['Infância', 'Juventude', '(período oculto)'],
        );
        assert.equal(E.getEixoValencia(), 'periodo');
        E.definirEixoValencia('qualquer');
        assert.equal(E.getEixoValencia(), 'ano');
    });

    it('sem tema classificado, orienta a classificar na aba Temas', () => {
        db.temas.forEach((t) => delete t.valencia);
        renderValencia();
        assert.match(
            document.getElementById('painel-valencia-resumo').textContent,
            /Cadastros → Temas/,
        );
        assert.equal(document.getElementById('painel-valencia-autores').innerHTML, '');
    });

    it('formata o índice com sinal e vírgula', () => {
        assert.equal(formatarIndiceValencia(0.2857), '+0,29');
        assert.equal(formatarIndiceValencia(-0.5), '-0,50');
        assert.equal(formatarIndiceValencia(0), '0,00');
        assert.equal(formatarIndiceValencia(null), 'n/d');
    });
});
