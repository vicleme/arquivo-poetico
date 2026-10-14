import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Botão Ver do Período Biográfico: o cartão ganha o botão, a visualização
// mostra os campos, as relações por extenso e os textos ligados, e nada de
// pessoa oculta (nem relação com ela, nem o texto antigo que a cite).
document.body.innerHTML = `
    <main>
        <div id="filtros-periodo-epocas"></div>
        <div id="lista-epocas"></div>
    </main>
`;

const { db } = await import('../js/db.js');
const { renderEpocas } = await import('../js/render-listas.js');
const { renderVisualizacaoPeriodoBiograficoHtml } =
    await import('../js/visualizar-periodo-biografico.js');
const { ROTULOS_VINCULO_DE_FABRICA } = await import('../js/periodo-biografico-campos.js');

const textoDe = (html) => {
    const el = document.createElement('div');
    el.innerHTML = html;
    return el.textContent.replace(/\s+/g, ' ').trim();
};

function montarBanco() {
    db.autores = [{ id: 1, nome: 'Ana', genero: 'Mulher' }];
    db.pessoas = [
        { id: 100, nome: 'Carla', genero: 'Mulher', oculto: false },
        { id: 101, nome: 'Davi', genero: 'Homem', oculto: true },
    ];
    db.opcoesPeriodoBiografico = {
        esferas: ['Afetiva'],
        vinculos: ['Amizade', 'Romântico', ...ROTULOS_VINCULO_DE_FABRICA.map((r) => r.nome)],
        rotulosVinculo: ROTULOS_VINCULO_DE_FABRICA.map((r) => ({ ...r })),
    };
    db.epocas = [
        {
            id: 10,
            nome: 'Faculdade',
            autorId: 1,
            inicio: { ano: 2010 },
            fim: { ano: 2014 },
            esferas: ['Afetiva'],
            categorias: ['Transição'],
            pessoasEnvolvidas: [{ pessoaId: 100 }, { pessoaId: 101 }],
            relacoes: [
                { de: 'autor', para: 100, natureza: '', vinculo: 'Amizade' },
                { de: 'autor', para: 101, natureza: '', vinculo: 'Romântico' },
            ],
            notas: 'Anos de formação.',
            contextoRelacao: 'texto antigo com Davi', // resto de dado antigo: nunca aparece
        },
        {
            id: 11,
            nome: 'Sem pessoas',
            autorId: 1,
            esferas: [],
            categorias: [],
            pessoasEnvolvidas: [],
            relacoes: [],
            contextoRelacao: 'Parceiro A e Parceiro B', // idem
        },
    ];
    db.poemas = [{ id: 1, titulo: 'Poema da Faculdade', epocaRetratada: { epocaId: 10 } }];
    db.prosas = [];
}

describe('botão Ver no cartão', () => {
    beforeEach(() => {
        montarBanco();
        renderEpocas();
    });

    it('cada cartão tem o botão Ver ligado ao id do período', () => {
        const botoes = [
            ...document.querySelectorAll('#lista-epocas [data-action="ver-periodo-biografico"]'),
        ];
        assert.deepEqual(botoes.map((b) => b.dataset.id).sort(), ['10', '11']);
    });
});

describe('visualização do período biográfico', () => {
    beforeEach(montarBanco);

    it('mostra autor, intervalo, esfera, categoria, notas e textos ligados', () => {
        const html = renderVisualizacaoPeriodoBiograficoHtml(db.epocas[0], db, {
            poemas: [{ id: 1, titulo: 'Poema da Faculdade' }],
            prosas: [],
        });
        const texto = textoDe(html);
        assert.match(texto, /Autor: Ana/);
        assert.match(texto, /Esfera: Afetiva/);
        assert.match(texto, /Categoria: Transição/);
        assert.match(texto, /Anos de formação\./);
        assert.match(texto, /Poemas \(1\)/);
        assert.match(texto, /Poema da Faculdade/);
    });

    it('mostra a relação por extenso e esconde a que envolve pessoa oculta', () => {
        const texto = textoDe(renderVisualizacaoPeriodoBiograficoHtml(db.epocas[0], db));
        assert.match(texto, /Carla/);
        assert.doesNotMatch(texto, /Davi/);
        assert.doesNotMatch(texto, /Romântico/);
    });

    it('não mostra pessoa oculta nem resto do texto antigo, mesmo com todas as pessoas ocultas', () => {
        const texto = textoDe(renderVisualizacaoPeriodoBiograficoHtml(db.epocas[0], db));
        assert.doesNotMatch(texto, /texto antigo/i);
        db.pessoas.forEach((p) => (p.oculto = true));
        const todasOcultas = textoDe(renderVisualizacaoPeriodoBiograficoHtml(db.epocas[0], db));
        assert.doesNotMatch(todasOcultas, /Carla|Davi|texto antigo/i);
    });

    it('não mostra mais o Contexto do relacionamento, nem sem pessoa ligada', () => {
        const texto = textoDe(renderVisualizacaoPeriodoBiograficoHtml(db.epocas[1], db));
        assert.doesNotMatch(texto, /texto antigo/i);
        assert.doesNotMatch(texto, /Parceiro A e Parceiro B/);
        assert.match(texto, /Ainda não está ligado a nenhum texto\./);
    });

    it('escapa HTML nos campos de texto', () => {
        db.epocas[1].notas = '<img src=x onerror=alert(1)>';
        const html = renderVisualizacaoPeriodoBiograficoHtml(db.epocas[1], db);
        assert.ok(!html.includes('<img'));
        assert.ok(html.includes('&lt;img'));
    });
});

describe('ligação do botão Ver', () => {
    const MAIN_JS = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');

    it('o modal está registrado e o clique tem handler (sem isso o olho não abre nada)', () => {
        assert.match(
            MAIN_JS,
            /registrarModal\(\s*'modal-visualizar-periodo-biografico',\s*'modal-visualizar-periodo-biografico\.html'/,
        );
        assert.match(
            MAIN_JS,
            /'ver-periodo-biografico':\s*\(el\) =>\s*abrirVisualizacaoPeriodoBiografico/,
        );
    });
});
