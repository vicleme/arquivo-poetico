import './helpers/dom-real.js';

import fs from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Inspiração pública, entrega 1: o dado, os modais, o salvar e a exibição na
// página do sorteio. Mesmo padrão das Notas públicas (comentarios-publicos.test.js).
const {
    ehInspiracaoPublica,
    definirInspiracaoPublica,
    inspiracaoPublicaDe,
    blocosPublicosDoTexto,
} = await import('../js/comentarios-publicos.js');
const { montarBlocosPublicos } = await import('../js/sortear-pagina.js');

const ler = (caminho) => fs.readFileSync(new URL(caminho, import.meta.url), 'utf8');

describe('Inspiração pública: lógica pura', () => {
    it('só `true` marca a Inspiração como pública', () => {
        assert.equal(ehInspiracaoPublica({ inspiracaoPublica: true }), true);
        for (const v of [false, undefined, null, 'true', 1, 'sim']) {
            assert.equal(ehInspiracaoPublica({ inspiracaoPublica: v }), false);
        }
        assert.equal(ehInspiracaoPublica(null), false);
    });

    it('definirInspiracaoPublica liga, desliga (grava false) e diz se mudou', () => {
        const item = {};
        assert.equal(definirInspiracaoPublica(item, true), true);
        assert.equal(item.inspiracaoPublica, true);
        assert.equal(definirInspiracaoPublica(item, true), false);
        assert.equal(definirInspiracaoPublica(item, false), true);
        assert.equal(item.inspiracaoPublica, false);
        assert.equal(definirInspiracaoPublica({}, false), false);
        assert.equal(definirInspiracaoPublica(null, true), false);
    });

    it('a Inspiração privada ou vazia nunca sai', () => {
        assert.equal(inspiracaoPublicaDe({ contextoHistorico: 'segredo' }), '');
        assert.equal(inspiracaoPublicaDe({ inspiracaoPublica: true, contextoHistorico: '  ' }), '');
        assert.equal(inspiracaoPublicaDe({ inspiracaoPublica: true }), '');
        assert.equal(
            inspiracaoPublicaDe({
                inspiracaoPublica: true,
                contextoHistorico: ' uma tarde de chuva ',
            }),
            'uma tarde de chuva',
        );
    });

    it('os blocos saem na ordem Comentários, Inspiração, Notas', () => {
        const blocos = blocosPublicosDoTexto({
            comentariosPublicos: 'oi',
            inspiracaoPublica: true,
            contextoHistorico: 'chuva',
            notasPublicas: true,
            notas: 'nota',
        });
        assert.deepEqual(
            blocos.map((b) => b.rotulo),
            ['Comentários ao leitor', 'Inspiração', 'Notas'],
        );
        assert.deepEqual(blocosPublicosDoTexto({ contextoHistorico: 'chuva', notas: 'nota' }), []);
    });
});

describe('Inspiração pública: página do sorteio', () => {
    it('mostra a Inspiração marcada e esconde a privada', () => {
        const aberta = montarBlocosPublicos({
            inspiracaoPublica: true,
            contextoHistorico: 'chuva',
        });
        assert.match(aberta.textContent, /Inspiração/);
        assert.match(aberta.textContent, /chuva/);
        assert.equal(montarBlocosPublicos({ contextoHistorico: 'chuva' }), null);
    });
});

describe('Inspiração pública: modais e salvar', () => {
    for (const [arq, pref] of [
        ['../modais/modal-poema.html', 'p'],
        ['../modais/modal-prosa.html', 'pr'],
    ]) {
        it(`${arq} tem a caixa Pública logo depois da Inspiração`, () => {
            const html = ler(arq);
            const textarea = html.indexOf(`id="${pref}-contexto"`);
            const caixa = html.indexOf(`id="${pref}-inspiracao-publica"`);
            assert.ok(textarea > 0 && caixa > textarea);
            assert.ok(caixa - textarea < 1500);
        });
    }

    it('forms.js salva e preenche a marca nos dois modais', () => {
        const forms = ler('../js/forms.js');
        for (const pref of ['p', 'pr']) {
            assert.match(
                forms,
                new RegExp(
                    `inspiracaoPublica: document\\.getElementById\\('${pref}-inspiracao-publica'\\)`,
                ),
            );
            assert.match(forms, new RegExp(`inspiracaoPublica: '${pref}-inspiracao-publica'`));
        }
    });
});

// ─── Entrega 2: coluna, busca, saídas, preenchimento em massa e importação ──

const { db } = await import('../js/db.js');
const { DEFINICAO_COLUNAS } = await import('../js/colunas.js');
const { celulaInspiracaoPublica } = await import('../js/celulas-tabela.js');
const { filtrarTextos, PREFIXOS_CANONICOS_POR_CAMPO } = await import('../js/utils.js');
const { decorarCamposBusca } = await import('../js/render-listas.js');
const { PREFIXOS_SO_ASTERISCO_TEXTO } = await import('../js/sugestoes-busca-texto.js');
const { montarRegistro } = await import('../js/exportar.js');
const { gerarCsvTextos } = await import('../js/exportar-csv.js');
const { gerarMarkdownItem } = await import('../js/exportar-md.js');
const { renderVisualizacaoHtml } = await import('../js/visualizar.js');
const { obterCampoPreenchivel, planejarPreenchimento, aplicarPreenchimento } =
    await import('../js/campos-preenchiveis.js');
const { lerExtrasDaEntrada, aplicarCamposSimples } =
    await import('../js/importar-campos-extras.js');

db.livros = [];
db.partes = [];
db.secoes = [];
db.autores = [];
db.itensColetanea = [];

const poema = (extra = {}) => ({
    id: 1,
    titulo: 'Teste',
    texto: 'verso',
    status: 'publicado',
    contextoHistorico: 'uma tarde de chuva',
    ...extra,
});

describe('Inspiração pública: colunas', () => {
    it('existe em Poemas e Prosas, escondida, logo depois de Inspiração', () => {
        for (const tabela of ['poemas', 'prosas']) {
            const cols = DEFINICAO_COLUNAS[tabela];
            const chaves = cols.map((c) => c.key);
            const col = cols.find((c) => c.key === 'inspiracaoPublica');
            assert.ok(col, `${tabela} sem a coluna`);
            assert.equal(col.default, false);
            assert.equal(col.sortType, 'numero');
            assert.equal(col.label, 'Inspiração pública');
            assert.equal(chaves[chaves.indexOf('contextoHistorico') + 1], 'inspiracaoPublica');
        }
    });

    it('a célula mostra "Sim" só nos marcados', () => {
        assert.match(celulaInspiracaoPublica({ inspiracaoPublica: true }), /Sim/);
        assert.doesNotMatch(celulaInspiracaoPublica({ inspiracaoPublica: false }), /Sim/);
        assert.doesNotMatch(celulaInspiracaoPublica({}), /Sim/);
    });
});

describe('Inspiração pública: busca', () => {
    const itens = () => {
        db.poemas = [
            { id: 1, titulo: 'A', contextoHistorico: 'chuva', inspiracaoPublica: true },
            { id: 2, titulo: 'B', contextoHistorico: 'mar' },
            { id: 3, titulo: 'C', contextoHistorico: 'sol', inspiracaoPublica: false },
        ];
        return db.poemas.map((p) => decorarCamposBusca(p, '', 'poema'));
    };
    const ids = (lista) => lista.map((i) => i.id);

    it('`inspiracaopublica:*` acha os marcados e `-inspiracaopublica:*` os demais', () => {
        assert.deepEqual(ids(filtrarTextos(itens(), 'inspiracaopublica:*')), [1]);
        assert.deepEqual(ids(filtrarTextos(itens(), '-inspiracaopublica:*')), [2, 3]);
    });

    it('o prefixo é canônico e vale só com `*`', () => {
        assert.ok(Object.values(PREFIXOS_CANONICOS_POR_CAMPO).includes('inspiracaopublica'));
        assert.ok(PREFIXOS_SO_ASTERISCO_TEXTO.includes('inspiracaopublica'));
    });
});

describe('Inspiração pública: .md, Ver, .csv e .json', () => {
    it('.md e Ver mostram "Inspiração pública: Sim" depois da Inspiração, só nos marcados', () => {
        const marcado = montarRegistro('poema', poema({ inspiracaoPublica: true }));
        const md = gerarMarkdownItem(marcado);
        assert.match(md, /### Inspiração pública\n\nSim/);
        assert.ok(md.indexOf('### Inspiração\n') < md.indexOf('### Inspiração pública'));
        assert.match(renderVisualizacaoHtml(marcado), /Inspiração pública/);
        for (const extra of [{}, { inspiracaoPublica: false }]) {
            const reg = montarRegistro('poema', poema(extra));
            assert.doesNotMatch(gerarMarkdownItem(reg), /Inspiração pública/);
            assert.doesNotMatch(renderVisualizacaoHtml(reg), /Inspiração pública/);
        }
    });

    it('.csv: coluna inspiracao_publica ("sim" ou vazio) logo depois de inspiracao', () => {
        const itens = [
            poema({ id: 1, inspiracaoPublica: true }),
            poema({ id: 2 }),
            poema({ id: 3, inspiracaoPublica: false }),
        ];
        db.poemas = itens;
        db.prosas = [];
        const regs = itens.map((p) => montarRegistro('poema', p));
        const csv = gerarCsvTextos('poema', regs, db);
        const limpo = csv.charCodeAt(0) === 0xfeff ? csv.slice(1) : csv;
        const [cab, ...linhas] = limpo.trim().split(/\r?\n/);
        const colunas = cab.split(',');
        const i = colunas.indexOf('inspiracao_publica');
        assert.ok(i >= 0, 'coluna ausente');
        assert.equal(i, colunas.indexOf('inspiracao') + 1);
        assert.deepEqual(
            linhas.map((l) => l.split(',')[i]),
            ['sim', '', ''],
        );
    });

    it('.json: o registro leva a marca (spread do item)', () => {
        assert.equal(
            montarRegistro('poema', poema({ inspiracaoPublica: true })).inspiracaoPublica,
            true,
        );
        assert.equal(montarRegistro('poema', poema()).inspiracaoPublica, undefined);
    });
});

describe('Inspiração pública: Preencher campo em massa', () => {
    it('é booleano e marcar não mexe no texto da Inspiração', () => {
        const campo = obterCampoPreenchivel('inspiracaoPublica');
        assert.equal(campo.tipo, 'booleano');
        assert.equal(campo.rotulo, 'Inspiração pública');
        const lista = [
            { id: 1, inspiracaoPublica: true, contextoHistorico: 'a' },
            { id: 2, contextoHistorico: 'b' },
        ];
        const p = planejarPreenchimento(lista, campo, true);
        assert.deepEqual(
            p.alterar.map((i) => i.id),
            [2],
        );
        aplicarPreenchimento(p.alterar, campo, true);
        assert.ok(lista.every(ehInspiracaoPublica));
        assert.deepEqual(
            lista.map((i) => i.contextoHistorico),
            ['a', 'b'],
        );
    });
});

describe('Inspiração pública: Importar campos', () => {
    const simples = (bruta) => {
        const problemas = [];
        const e = lerExtrasDaEntrada(bruta, problemas);
        return { simples: e.simples, problemas };
    };

    it('só `true` vira campo simples; falso e vazio são ignorados; lixo é problema', () => {
        for (const v of [true, 'sim', 'true']) {
            assert.deepEqual(simples({ titulo: 'a', inspiracaoPublica: v }).simples, [
                { chave: 'inspiracaoPublica', valor: true },
            ]);
        }
        for (const v of [false, 'não', '', null]) {
            const r = simples({ titulo: 'a', inspiracaoPublica: v });
            assert.deepEqual(r.simples, []);
            assert.deepEqual(r.problemas, []);
        }
        assert.equal(
            simples({ titulo: 'a', inspiracaoPublica: 'talvez' }).problemas[0].campo,
            'inspiracaoPublica',
        );
    });

    it('aplicar liga a marca sem mexer no texto da Inspiração', () => {
        const item = { id: 1, contextoHistorico: 'chuva' };
        aplicarCamposSimples(item, [{ chave: 'inspiracaoPublica', valor: true }], {
            camposSimples: [],
        });
        assert.equal(ehInspiracaoPublica(item), true);
        assert.equal(item.contextoHistorico, 'chuva');
    });
});

// ─── Entrega 3: FAQ e documentação ──────────────────────────────

describe('Inspiração pública: FAQ e documentação', () => {
    it('os docs para IAs descrevem o campo, em inglês e em português', () => {
        for (const arq of [
            '../docs/campos-poema-prosa-for-ai.md',
            '../docs/campos-poema-prosa-for-ai-pt-br.md',
            '../docs/importar-campos-for-ai.md',
            '../docs/importar-campos-for-ai-pt-br.md',
        ]) {
            assert.match(ler(arq), /`inspiracaoPublica`/, arq);
        }
    });

    it('o schema e as decisões têm a seção', () => {
        assert.match(ler('../manutencao/schema.md'), /## Inspiração pública \(01\/11\/2026\)/);
        assert.match(ler('../manutencao/decisoes.md'), /## Inspiração pública \(01\/11\/2026\)/);
    });

    it('a pergunta do FAQ sobre Notas públicas cobre a Inspiração', () => {
        const fonte = ler('../js/faq-conteudo.js');
        assert.match(fonte, /id: 'faq-comentarios-ao-leitor'/);
        assert.match(fonte, /inspiracaopublica:\*/);
        assert.match(fonte, /inspiracao_publica/);
    });
});
