import './helpers/dom-real.js';

import fs from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Valência do texto, entrega 1: a lógica pura (derivada dos temas, com ajuste
// do autor) e o campo de ajuste nos modais, no salvar e no abrir.
import {
    CORTE_INDICE,
    FAIXAS_VALENCIA_TEXTO,
    ROTULOS_VALENCIA_TEXTO,
    contagemDeTemasDoTexto,
    definirValenciaAjuste,
    faixaDeValencia,
    faixaDoIndice,
    lerValenciaTexto,
    rotuloValenciaTexto,
    valenciaAjusteDe,
    valenciaDoTexto,
    valenciaPelosTemas,
} from '../js/valencia-texto.js';
import { colunasTexto } from '../js/exportar-csv.js';
import { DEFINICAO_COLUNAS } from '../js/colunas.js';
import { celulaValencia } from '../js/celulas-tabela.js';
import { filtrarTextos, PREFIXOS_CANONICOS_POR_CAMPO } from '../js/utils.js';
import { decorarCamposBusca } from '../js/render-listas.js';
import { gerarMarkdownItem } from '../js/exportar-md.js';
import { renderVisualizacaoHtml } from '../js/visualizar.js';
import {
    obterCampoPreenchivel,
    planejarPreenchimento,
    aplicarPreenchimento,
    planejarLimpeza,
    aplicarLimpeza,
} from '../js/campos-preenchiveis.js';
import { lerExtrasDaEntrada, aplicarCamposSimples } from '../js/importar-campos-extras.js';
import { textoDaValencia, ordemDaValencia } from '../js/valencia-texto.js';
import { valenciaGeral } from '../js/estatisticas-dados-valencia.js';

const ler = (rel) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');

const temas = [
    { id: 1, nome: 'Alegria', valencia: 'agradavel' },
    { id: 2, nome: 'Cotidiano', valencia: 'neutro' },
    { id: 3, nome: 'Luto', valencia: 'desagradavel' },
    { id: 4, nome: 'Saudade', valencia: 'ambivalente' },
    { id: 5, nome: 'Sem classe' },
    { id: 6, nome: 'Perda', valencia: 'desagradavel' },
];
const com = (...ids) => ({ temas: ids.map((temaId) => ({ temaId, papel: '' })) });

describe('faixaDoIndice', () => {
    it('um terço de cada lado: leve, neutro, pesado', () => {
        assert.equal(CORTE_INDICE, 1 / 3);
        assert.equal(faixaDoIndice(-1), 'leve');
        assert.equal(faixaDoIndice(-1 / 3), 'leve');
        assert.equal(faixaDoIndice(-0.2), 'neutro');
        assert.equal(faixaDoIndice(0), 'neutro');
        assert.equal(faixaDoIndice(0.2), 'neutro');
        assert.equal(faixaDoIndice(1 / 3), 'pesado');
        assert.equal(faixaDoIndice(1), 'pesado');
    });
    it('sem índice, sem faixa', () => {
        assert.equal(faixaDoIndice(null), '');
        assert.equal(faixaDoIndice(undefined), '');
        assert.equal(faixaDoIndice(NaN), '');
    });
});

describe('valência pelos temas', () => {
    it('só temas agradáveis: leve; só desagradáveis: pesado', () => {
        assert.equal(valenciaPelosTemas(com(1), temas).faixa, 'leve');
        assert.equal(valenciaPelosTemas(com(3, 6), temas).faixa, 'pesado');
    });
    it('o índice é o das Estatísticas: (desagradáveis - agradáveis) / (agradáveis + neutros + desagradáveis)', () => {
        const r = valenciaPelosTemas(com(1, 2, 3), temas);
        assert.equal(r.indice, 0);
        assert.equal(r.faixa, 'neutro');
        const r2 = valenciaPelosTemas(com(3, 6, 1), temas);
        assert.ok(Math.abs(r2.indice - 1 / 3) < 1e-9);
        assert.equal(r2.faixa, 'pesado');
    });
    it('tema ambivalente fica fora do índice; só ambivalente dá neutro', () => {
        assert.equal(valenciaPelosTemas(com(3, 4), temas).faixa, 'pesado');
        const r = valenciaPelosTemas(com(4), temas);
        assert.equal(r.faixa, 'neutro');
        assert.equal(r.indice, null);
    });
    it('sem tema classificado, ou sem tema, não há valência', () => {
        assert.equal(valenciaPelosTemas(com(5), temas).faixa, '');
        assert.equal(valenciaPelosTemas({ temas: [] }, temas).faixa, '');
        assert.equal(valenciaPelosTemas({}, temas).faixa, '');
    });
    it('tema sem classificação não entra na conta, e cada tema conta uma vez', () => {
        assert.equal(valenciaPelosTemas(com(3, 5), temas).faixa, 'pesado');
        const dup = {
            temas: [
                { temaId: 1, papel: '' },
                { temaId: 1, papel: 'principal' },
            ],
        };
        assert.equal(contagemDeTemasDoTexto(dup, temas).agradavel, 1);
    });
    it('o papel do tema não pesa: principal e secundário contam igual', () => {
        const t = {
            temas: [
                { temaId: 3, papel: 'principal' },
                { temaId: 1, papel: 'secundario' },
                { temaId: 1, papel: '' },
            ],
        };
        assert.equal(contagemDeTemasDoTexto(t, temas).agradavel, 1);
        assert.equal(contagemDeTemasDoTexto(t, temas).desagradavel, 1);
    });
    it('bate com o que as Estatísticas calculam para o mesmo texto', async () => {
        const { db } = await import('../js/db.js');
        const antes = { temas: db.temas };
        db.temas = temas;
        try {
            const texto = com(3, 6, 1);
            const g = valenciaGeral({ textos: [texto], papel: 'todos' });
            assert.ok(Math.abs(g.indice - valenciaPelosTemas(texto, temas).indice) < 1e-9);
        } finally {
            db.temas = antes.temas;
        }
    });
});

describe('ajuste do autor', () => {
    it('valenciaAjusteDe: só os três valores valem; o resto segue os temas', () => {
        assert.equal(valenciaAjusteDe({ valenciaAjuste: 'leve' }), 'leve');
        assert.equal(valenciaAjusteDe({ valenciaAjuste: 'pesado' }), 'pesado');
        assert.equal(valenciaAjusteDe({ valenciaAjuste: 'neutro' }), 'neutro');
        assert.equal(valenciaAjusteDe({ valenciaAjuste: '' }), '');
        assert.equal(valenciaAjusteDe({ valenciaAjuste: 'talvez' }), '');
        assert.equal(valenciaAjusteDe({ valenciaAjuste: 3 }), '');
        assert.equal(valenciaAjusteDe({}), '');
        assert.equal(valenciaAjusteDe(null), '');
    });
    it('o ajuste vence os temas, e a faixa dos temas continua disponível', () => {
        const t = { ...com(3, 6), valenciaAjuste: 'leve' };
        const v = valenciaDoTexto(t, temas);
        assert.equal(v.faixa, 'leve');
        assert.equal(v.origem, 'ajuste');
        assert.equal(v.pelosTemas.faixa, 'pesado');
        assert.equal(faixaDeValencia(t, temas), 'leve');
    });
    it('o ajuste vale mesmo sem nenhum tema classificado', () => {
        const v = valenciaDoTexto({ valenciaAjuste: 'pesado' }, temas);
        assert.deepEqual([v.faixa, v.origem], ['pesado', 'ajuste']);
    });
    it('sem ajuste, a origem é "temas"; sem nada, é vazia', () => {
        assert.equal(valenciaDoTexto(com(1), temas).origem, 'temas');
        assert.deepEqual(
            [valenciaDoTexto({}, temas).faixa, valenciaDoTexto({}, temas).origem],
            ['', ''],
        );
    });
    it('definirValenciaAjuste grava sempre string, diz se mudou e limpa o inválido', () => {
        const t = {};
        assert.equal(definirValenciaAjuste(t, 'leve'), true);
        assert.equal(t.valenciaAjuste, 'leve');
        assert.equal(definirValenciaAjuste(t, 'leve'), false);
        assert.equal(definirValenciaAjuste(t, 'xyz'), true);
        assert.equal(t.valenciaAjuste, '');
        assert.equal(definirValenciaAjuste(null, 'leve'), false);
    });
});

describe('rótulos e leitura de importação', () => {
    it('as três faixas têm rótulo, sem travessão', () => {
        assert.deepEqual([...FAIXAS_VALENCIA_TEXTO], ['leve', 'neutro', 'pesado']);
        assert.equal(rotuloValenciaTexto('neutro'), 'Neutro ou ambivalente');
        assert.equal(rotuloValenciaTexto('xyz'), '');
        Object.values(ROTULOS_VALENCIA_TEXTO).forEach((r) => assert.doesNotMatch(r, /—/));
    });
    it('lerValenciaTexto aceita chave, rótulo e formas soltas', () => {
        assert.equal(lerValenciaTexto('leve'), 'leve');
        assert.equal(lerValenciaTexto('Mais leve'), 'leve');
        assert.equal(lerValenciaTexto('PESADO'), 'pesado');
        assert.equal(lerValenciaTexto('mais pesados'), 'pesado');
        assert.equal(lerValenciaTexto('Neutro ou ambivalente'), 'neutro');
        assert.equal(lerValenciaTexto('ambivalente'), 'neutro');
        assert.equal(lerValenciaTexto('seguir os temas'), '');
        assert.equal(lerValenciaTexto('talvez'), undefined);
        assert.equal(lerValenciaTexto(null), undefined);
    });
});

describe('modais, salvar e abrir', () => {
    it('os dois modais têm o select com as quatro opções, e o salvar e o abrir o ligam', () => {
        for (const [arq, id] of [
            ['../modais/modal-poema.html', 'p-valencia-ajuste'],
            ['../modais/modal-prosa.html', 'pr-valencia-ajuste'],
        ]) {
            const html = ler(arq);
            assert.match(html, new RegExp(`<select[^>]*id="${id}"`), arq);
            for (const v of ['', 'leve', 'neutro', 'pesado']) {
                assert.ok(html.includes(`<option value="${v}"`), `${arq} sem "${v}"`);
            }
        }
        const forms = ler('../js/forms.js');
        assert.match(forms, /valenciaAjuste: document\.getElementById\('p-valencia-ajuste'\)/);
        assert.match(forms, /valenciaAjuste: document\.getElementById\('pr-valencia-ajuste'\)/);
        assert.match(forms, /valenciaAjuste: \['p-valencia-ajuste'/);
        assert.match(forms, /valenciaAjuste: \['pr-valencia-ajuste'/);
    });
});

describe('.csv', () => {
    it('a coluna valencia traz a faixa final e valencia_ajuste só o juízo do autor', () => {
        for (const tipo of ['poema', 'prosa']) {
            const cols = colunasTexto(tipo);
            const val = cols.find((c) => c.cabecalho === 'valencia');
            const aj = cols.find((c) => c.cabecalho === 'valencia_ajuste');
            assert.ok(val && aj, tipo);
            const ctx = { banco: { temas } };
            const pesado = com(3, 6);
            assert.equal(val.valor(pesado, ctx), 'Pesado');
            assert.equal(aj.valor(pesado, ctx), '');
            const ajustado = { ...pesado, valenciaAjuste: 'leve' };
            assert.equal(val.valor(ajustado, ctx), 'Leve');
            assert.equal(aj.valor(ajustado, ctx), 'Leve');
            assert.equal(val.valor({}, ctx), '');
        }
    });
});

describe('entrega 2: tabela, busca, Ver, .md, Preencher campo e Importar campos', () => {
    let db;
    const comDb = async (fn) => {
        ({ db } = await import('../js/db.js'));
        const antes = db.temas;
        db.temas = temas;
        try {
            return await fn();
        } finally {
            db.temas = antes;
        }
    };

    it('a coluna existe em Poemas e Prosas, escondida por padrão, ordenada por número', () => {
        for (const tabela of ['poemas', 'prosas']) {
            const def = DEFINICAO_COLUNAS[tabela].find((c) => c.key === 'valencia');
            assert.ok(def, tabela);
            assert.equal(def.default, false);
            assert.equal(def.label, 'Valência');
            assert.equal(def.sortType, 'numero');
        }
    });

    it('a célula mostra a faixa, "(ajuste)" quando é do autor e "—" sem valência', () =>
        comDb(() => {
            assert.match(celulaValencia(com(1)), /Leve/);
            assert.doesNotMatch(celulaValencia(com(1)), /ajuste/);
            assert.match(
                celulaValencia({ ...com(1), valenciaAjuste: 'pesado' }),
                /Pesado \(ajuste\)/,
            );
            assert.match(celulaValencia({}), /—/);
        }));

    it('ordemDaValencia: 1 leve, 2 neutro, 3 pesado, 0 sem valência', () => {
        assert.deepEqual(
            [com(1), com(2), com(3), {}].map((t) => ordemDaValencia(t, temas)),
            [1, 2, 3, 0],
        );
    });

    it('busca valencia: pela faixa final, com * para quem tem e -* para quem não tem', () =>
        comDb(() => {
            db.poemas = [
                { id: 1, titulo: 'A', ...com(1) },
                { id: 2, titulo: 'B', ...com(3) },
                { id: 3, titulo: 'C' },
                { id: 4, titulo: 'D', ...com(3), valenciaAjuste: 'leve' },
                { id: 5, titulo: 'E', ...com(2) },
            ];
            const lista = () => db.poemas.map((p) => decorarCamposBusca(p, '', 'poema'));
            const ids = (l) => l.map((i) => i.id);
            assert.deepEqual(ids(filtrarTextos(lista(), 'valencia:leve')), [1, 4]);
            assert.deepEqual(ids(filtrarTextos(lista(), 'valencia:pesado')), [2]);
            assert.deepEqual(ids(filtrarTextos(lista(), 'valencia:ambivalente')), [5]);
            assert.deepEqual(ids(filtrarTextos(lista(), 'valencia:*')), [1, 2, 4, 5]);
            assert.deepEqual(ids(filtrarTextos(lista(), '-valencia:*')), [3]);
            assert.ok(Object.values(PREFIXOS_CANONICOS_POR_CAMPO).includes('valencia'));
        }));

    it('textoDaValencia diz a origem e, no ajuste, o que os temas dão', () => {
        assert.equal(textoDaValencia(com(3), temas), 'Pesado (pelos temas)');
        assert.equal(
            textoDaValencia({ ...com(3), valenciaAjuste: 'leve' }, temas),
            'Leve (ajuste do autor; os temas dão Pesado)',
        );
        assert.equal(
            textoDaValencia({ valenciaAjuste: 'leve' }, temas),
            'Leve (ajuste do autor; os temas não classificam)',
        );
        assert.equal(
            textoDaValencia({ ...com(1), valenciaAjuste: 'leve' }, temas),
            'Leve (ajuste do autor; os temas dão o mesmo)',
        );
        assert.equal(textoDaValencia({}, temas), '');
        assert.doesNotMatch(textoDaValencia({ ...com(3), valenciaAjuste: 'leve' }, temas), /—/);
    });

    it('o Ver e o .md trazem o bloco Valência só quando há valência', () =>
        comDb(() => {
            const t = { id: 9, titulo: 'X', texto: 'v', tipo: 'poema', ...com(3) };
            assert.match(renderVisualizacaoHtml(t, 'poemas'), /Valência/);
            assert.match(renderVisualizacaoHtml(t, 'poemas'), /Pesado \(pelos temas\)/);
            assert.match(gerarMarkdownItem(t, 'poemas'), /Valência[\s\S]*Pesado \(pelos temas\)/);
            const sem = { id: 10, titulo: 'Y', texto: 'v', tipo: 'poema' };
            assert.doesNotMatch(renderVisualizacaoHtml(sem, 'poemas'), /Valência/);
            assert.doesNotMatch(gerarMarkdownItem(sem, 'poemas'), /Valência/);
        }));

    it('Preencher campo grava o ajuste, e Limpar campo volta a seguir os temas', () => {
        const campo = obterCampoPreenchivel('valenciaAjuste');
        assert.equal(campo.tipo, 'opcoes');
        assert.deepEqual(
            campo.opcoes.map((o) => o.valor),
            ['leve', 'neutro', 'pesado'],
        );
        const lista = [{ id: 1, valenciaAjuste: 'pesado' }, { id: 2 }];
        const p = planejarPreenchimento(lista, campo, 'pesado');
        assert.deepEqual(
            p.alterar.map((i) => i.id),
            [2],
        );
        aplicarPreenchimento(p.alterar, campo, 'pesado');
        assert.equal(lista[1].valenciaAjuste, 'pesado');
        const { alterar } = planejarLimpeza(lista, campo);
        aplicarLimpeza(alterar, campo);
        assert.ok(lista.every((i) => valenciaAjusteDe(i) === ''));
    });

    it('Importar campos: valor válido entra, vazio e "temas" são ignorados, desconhecido vai ao relatório', () => {
        const ler = (bruta) => {
            const problemas = [];
            return { simples: lerExtrasDaEntrada(bruta, problemas).simples, problemas };
        };
        assert.deepEqual(ler({ titulo: 'a', valenciaAjuste: 'Mais pesado' }).simples, [
            { chave: 'valenciaAjuste', valor: 'pesado' },
        ]);
        for (const v of ['', null, 'seguir os temas']) {
            const r = ler({ titulo: 'a', valenciaAjuste: v });
            assert.deepEqual(r.simples, []);
            assert.deepEqual(r.problemas, []);
        }
        assert.equal(
            ler({ titulo: 'a', valenciaAjuste: 'talvez' }).problemas[0].campo,
            'valenciaAjuste',
        );
        const item = {};
        aplicarCamposSimples(item, [{ chave: 'valenciaAjuste', valor: 'leve' }], {
            camposSimples: [],
        });
        assert.equal(item.valenciaAjuste, 'leve');
    });
});

describe('documentação das entregas 1 e 2', () => {
    it('os guias for-ai descrevem o campo nas duas línguas, sem travessão', () => {
        for (const arq of [
            '../docs/campos-poema-prosa-for-ai.md',
            '../docs/campos-poema-prosa-for-ai-pt-br.md',
            '../docs/importar-campos-for-ai.md',
            '../docs/importar-campos-for-ai-pt-br.md',
        ]) {
            const t = ler(arq);
            assert.match(t, /`valenciaAjuste`/, arq);
            const trecho = t.slice(
                t.indexOf('`valenciaAjuste`'),
                t.indexOf('`valenciaAjuste`') + 900,
            );
            assert.doesNotMatch(trecho, /[—–]/, `${arq}: travessão`);
        }
    });
});
