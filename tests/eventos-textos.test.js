import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Fase 14, etapa 3: Eventos. Evento é uma marca do cadastro (`evento: true`,
// F14-D3); o texto guarda períodos e eventos na MESMA lista (F14-D4) e a marca
// decide em qual campo, coluna e linha cada um aparece.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ler = (f) => fs.readFileSync(path.resolve(__dirname, '../modais', f), 'utf8');
document.body.innerHTML =
    ler('modal-poema.html') +
    ler('modal-prosa.html') +
    ler('modal-epoca.html') +
    ler('modal-periodo-historico.html') +
    '<div id="avisos-toast"></div>';
for (const pref of ['p', 'pr']) {
    for (const cat of [
        'tradicao',
        'estilo',
        'relacao',
        'sensibilidade',
        'tom',
        'outros',
        'dominioImagetico',
    ]) {
        const id = `${pref}-sinal-${cat}`;
        if (!document.getElementById(id)) {
            document.body.insertAdjacentHTML('beforeend', `<input type="hidden" id="${id}" />`);
        }
    }
}

const { db } = await import('../js/db.js');
const U = await import('../js/utils.js');
const { decorarCamposBusca, ordenarPor } = await import('../js/render-listas.js');
const { montarRegistro } = await import('../js/exportar.js');
const { gerarCsvTextos } = await import('../js/exportar-csv.js');
const { itemParaMarkdown } = await import('../js/exportar-md.js');
const { classificarImportacaoAditiva, aplicarImportacaoAditiva } =
    await import('../js/importar-aditivo.js');
const { initFormPoema, initFormEpoca, initFormPeriodoHistorico } = await import('../js/forms.js');
const E = await import('../js/editor.js');
const { badgeEpocaRetratada } = await import('../js/celulas-tabela.js');
const { DEFINICAO_COLUNAS } = await import('../js/colunas.js');

const FASE = 1;
const FORMATURA = 2;
const GUERRA = 10;
const SEMANA = 11;

const epocas = () => [
    { id: FASE, nome: 'Faculdade', autorId: 1, esferas: [], categorias: [], pertenceA: [] },
    {
        id: FORMATURA,
        nome: 'Formatura',
        autorId: 1,
        esferas: [],
        categorias: [],
        pertenceA: [],
        evento: true,
    },
];
const historicos = () => [
    { id: GUERRA, nome: 'Guerra Fria', regiao: [], pertenceA: [], esferas: [], categorias: [] },
    {
        id: SEMANA,
        nome: 'Semana de Arte Moderna',
        regiao: [],
        pertenceA: [],
        esferas: [],
        categorias: [],
        evento: true,
    },
];
const preparar = () => {
    db.epocas = epocas();
    db.periodosHistoricos = historicos();
    db.poemas = [];
    db.prosas = [];
    db.autores = [{ id: 1, nome: 'Ana' }];
    E.resetEpocasRetratadasDoTexto('poemas');
    E.resetPeriodosHistoricosDoTexto('poemas');
};
const texto = () => ({
    id: 99,
    titulo: 'T',
    texto: 'x',
    epocaRetratada: {
        periodos: [
            { epocaId: FASE, recorte: null },
            { epocaId: FORMATURA, recorte: 'momento' },
        ],
        inicio: null,
        fim: null,
        na: false,
    },
    periodosHistoricosIds: [GUERRA, SEMANA],
});

describe('helpers de evento', () => {
    beforeEach(preparar);

    it('ehEvento só vale para evento: true', () => {
        assert.equal(U.ehEvento({ evento: true }), true);
        assert.equal(U.ehEvento({ evento: false }), false);
        assert.equal(U.ehEvento({}), false);
        assert.equal(U.ehEvento(null), false);
    });

    it('as listas do texto se separam pela marca do cadastro', () => {
        const t = texto();
        const bio = (tipo) => U.periodosBiograficosDoItem(t, db.epocas, tipo).map((p) => p.epocaId);
        assert.deepEqual(bio('todos'), [FASE, FORMATURA]);
        assert.deepEqual(bio('periodos'), [FASE]);
        assert.deepEqual(bio('eventos'), [FORMATURA]);
        const his = (tipo) => U.periodosHistoricosIdsDoItem(t, db.periodosHistoricos, tipo);
        assert.deepEqual(his('periodos'), [GUERRA]);
        assert.deepEqual(his('eventos'), [SEMANA]);
    });

    it('marcar ou desmarcar o evento no cadastro move o item sem migração', () => {
        const t = texto();
        db.epocas.find((e) => e.id === FASE).evento = true;
        delete db.epocas.find((e) => e.id === FORMATURA).evento;
        assert.deepEqual(
            U.periodosBiograficosDoItem(t, db.epocas, 'eventos').map((p) => p.epocaId),
            [FASE],
        );
        assert.deepEqual(
            U.periodosBiograficosDoItem(t, db.epocas, 'periodos').map((p) => p.epocaId),
            [FORMATURA],
        );
    });
});

describe('cadastros: caixa "É um evento"', () => {
    beforeEach(preparar);

    it('Período Biográfico: grava evento só quando marcado e remove ao desmarcar', () => {
        initFormEpoca();
        document.getElementById('ep-edit-id').value = '';
        document.getElementById('ep-autor').innerHTML = '<option value="1">Ana</option>';
        document.getElementById('ep-autor').value = '1';
        document.getElementById('ep-nome').value = 'Casamento';
        document.getElementById('ep-evento').checked = true;
        document.getElementById('form-epoca').onsubmit({ preventDefault() {} });
        const criado = db.epocas.find((e) => e.nome === 'Casamento');
        assert.equal(criado.evento, true);

        document.getElementById('ep-edit-id').value = String(criado.id);
        document.getElementById('ep-evento').checked = false;
        document.getElementById('form-epoca').onsubmit({ preventDefault() {} });
        assert.equal('evento' in db.epocas.find((e) => e.id === criado.id), false);
    });

    it('Período Histórico: grava evento só quando marcado', () => {
        initFormPeriodoHistorico();
        document.getElementById('ph-edit-id').value = '';
        document.getElementById('ph-nome').value = 'Queda do Muro';
        document.getElementById('ph-evento').checked = true;
        document.getElementById('form-periodo-historico').onsubmit({ preventDefault() {} });
        assert.equal(db.periodosHistoricos.find((p) => p.nome === 'Queda do Muro').evento, true);

        document.getElementById('ph-nome').value = 'Outro';
        document.getElementById('ph-evento').checked = false;
        document.getElementById('ph-edit-id').value = '';
        document.getElementById('form-periodo-historico').onsubmit({ preventDefault() {} });
        assert.equal('evento' in db.periodosHistoricos.find((p) => p.nome === 'Outro'), false);
    });
});

describe('modal de Poema: campos Períodos e Eventos', () => {
    const enviar = (titulo) => {
        document.getElementById('p-titulo').value = titulo;
        document.getElementById('form-poema').onsubmit({ preventDefault() {} });
        return db.poemas.find((x) => x.titulo === titulo);
    };
    const chips = (id) => [...document.querySelectorAll(`#${id} > span`)];

    beforeEach(() => {
        preparar();
        initFormPoema();
        document.getElementById('p-epoca-na').checked = false;
    });

    it('carregar separa os chips pela marca, nos dois campos', () => {
        E.carregarEpocasRetratadasDoTexto('poemas', texto().epocaRetratada.periodos);
        E.carregarPeriodosHistoricosDoTexto('poemas', texto().periodosHistoricosIds);
        assert.equal(chips('p-epocas-container').length, 1);
        assert.equal(chips('p-eventos-biograficos-container').length, 1);
        assert.equal(chips('p-periodos-historicos-container').length, 1);
        assert.equal(chips('p-eventos-historicos-container').length, 1);
    });

    it('salvar junta períodos e eventos na mesma lista do texto', () => {
        E.adicionarEpocaRetratadaDoTexto('poemas', 'Faculdade', 'periodos');
        E.adicionarEpocaRetratadaDoTexto('poemas', 'Formatura', 'eventos');
        E.adicionarPeriodoHistoricoDoTexto('poemas', 'Guerra Fria', 'periodos');
        E.adicionarPeriodoHistoricoDoTexto('poemas', 'Semana de Arte Moderna', 'eventos');
        const p = enviar('Juntos');
        assert.deepEqual(
            p.epocaRetratada.periodos.map((x) => x.epocaId),
            [FASE, FORMATURA],
        );
        assert.deepEqual(p.periodosHistoricosIds, [GUERRA, SEMANA]);
    });

    it('nome de evento digitado no campo de Períodos vai para Eventos, com aviso', () => {
        E.adicionarEpocaRetratadaDoTexto('poemas', 'Formatura', 'periodos');
        assert.equal(chips('p-epocas-container').length, 0);
        assert.equal(chips('p-eventos-biograficos-container').length, 1);
        assert.match(document.getElementById('avisos-toast').textContent, /é um evento/);

        E.adicionarPeriodoHistoricoDoTexto('poemas', 'Guerra Fria', 'eventos');
        assert.equal(chips('p-eventos-historicos-container').length, 0);
        assert.equal(chips('p-periodos-historicos-container').length, 1);
    });

    it('nome novo digitado em Eventos é criado já como evento ao salvar', () => {
        document.getElementById('p-titulo').value = 'Novo';
        E.adicionarPeriodoHistoricoDoTexto('poemas', 'Golpe de 64', 'eventos');
        const p = enviar('Novo');
        const criado = db.periodosHistoricos.find((x) => x.nome === 'Golpe de 64');
        assert.equal(criado.evento, true);
        assert.deepEqual(p.periodosHistoricosIds, [criado.id]);
    });

    it('remover um chip de evento tira só ele', () => {
        E.adicionarEpocaRetratadaDoTexto('poemas', 'Faculdade', 'periodos');
        E.adicionarEpocaRetratadaDoTexto('poemas', 'Formatura', 'eventos');
        E.removerEpocaRetratadaDoTexto('poemas', String(FORMATURA), 'eventos');
        const p = enviar('Sem evento');
        assert.deepEqual(
            p.epocaRetratada.periodos.map((x) => x.epocaId),
            [FASE],
        );
    });

    it('as sugestões de cada campo trazem só o que é da sua marca', () => {
        E.atualizarDatalistEpoca('poemas');
        E.atualizarDatalistPeriodoHistorico();
        const vals = (id) =>
            [...document.querySelectorAll(`#${id} option`)].map((o) => o.getAttribute('value'));
        assert.deepEqual(vals('sugestoes-epoca-nome'), ['Faculdade']);
        assert.deepEqual(vals('sugestoes-evento-biografico-nome'), ['Formatura']);
        assert.deepEqual(vals('sugestoes-periodo-historico-nome'), ['Guerra Fria']);
        assert.deepEqual(vals('sugestoes-evento-historico-nome'), ['Semana de Arte Moderna']);
    });
});

describe('colunas, busca e exportações', () => {
    beforeEach(preparar);

    it('as colunas novas existem, desligadas, depois de Categoria', () => {
        for (const tabela of ['poemas', 'prosas']) {
            const chaves = DEFINICAO_COLUNAS[tabela].map((c) => c.key);
            assert.equal(
                chaves[chaves.indexOf('categoriaPeriodoBiografico') + 1],
                'eventosBiograficos',
            );
            assert.equal(
                chaves[chaves.indexOf('categoriaPeriodoHistorico') + 1],
                'eventosHistoricos',
            );
            for (const k of ['eventosBiograficos', 'eventosHistoricos']) {
                assert.equal(DEFINICAO_COLUNAS[tabela].find((c) => c.key === k).default, false);
            }
        }
    });

    it('a célula Período Biográfico não mostra evento e a de Eventos mostra', () => {
        const t = texto();
        assert.match(badgeEpocaRetratada(t.epocaRetratada), /Faculdade/);
        assert.doesNotMatch(badgeEpocaRetratada(t.epocaRetratada), /Formatura/);
        assert.match(badgeEpocaRetratada(t.epocaRetratada, 'eventos'), /Formatura/);
        assert.doesNotMatch(badgeEpocaRetratada(t.epocaRetratada, 'eventos'), /Faculdade/);
    });

    it('busca: eventobiografico: e eventohistorico: acham só eventos; epoca: acha os dois', () => {
        db.poemas = [texto()];
        const [item] = db.poemas.map((p) => ({ ...p, ...decorarCamposBusca(p) }));
        const acha = (q) => U.filtrarTextos([item], q).length;
        assert.equal(acha('eventobiografico:Formatura'), 1);
        assert.equal(acha('eventobiografico:Faculdade'), 0);
        assert.equal(acha('eventohistorico:"Semana de Arte"'), 1);
        assert.equal(acha('eventohistorico:"Guerra Fria"'), 0);
        assert.equal(acha('epoca:Formatura'), 1);
        assert.equal(acha('epoca:Faculdade'), 1);
        assert.equal(acha('periodohistorico:"Semana de Arte"'), 1);
    });

    it('ordenar pelas colunas novas não quebra', () => {
        db.poemas = [
            texto(),
            { ...texto(), id: 100, epocaRetratada: null, periodosHistoricosIds: [] },
        ];
        for (const k of ['eventosBiograficos', 'eventosHistoricos']) {
            ordenarPor('poemas', k);
            ordenarPor('poemas', k);
        }
    });

    it('.md tem linhas separadas de período e evento', () => {
        const md = itemParaMarkdown(montarRegistro('poema', texto()), 1);
        assert.match(md, /Período Biográfico Retratado.*Faculdade/);
        assert.doesNotMatch(md, /Período Biográfico Retratado[^\n]*Formatura/);
        assert.match(md, /Evento Biográfico Retratado[^\n]*Formatura/);
        assert.match(md, /Período Histórico Retratado[^\n]*Guerra Fria/);
        assert.match(md, /Evento Histórico Retratado[^\n]*Semana de Arte Moderna/);
    });

    it('.json leva a marca só nos eventos e o .csv ganha colunas de evento', () => {
        const reg = montarRegistro('poema', texto());
        const porId = Object.fromEntries(reg.epocaRetratada.periodos.map((p) => [p.epocaId, p]));
        assert.equal(porId[FORMATURA].evento, true);
        assert.equal('evento' in porId[FASE], false);
        const his = Object.fromEntries(reg.periodosHistoricosResolvidos.map((p) => [p.id, p]));
        assert.equal(his[SEMANA].evento, true);
        assert.equal('evento' in his[GUERRA], false);

        const csv = gerarCsvTextos('poema', [reg], db);
        const [cab, linha] = csv.replace(/^\uFEFF/, '').split(/\r?\n/);
        const cols = cab.split(',');
        assert.ok(cols.includes('evento_biografico'));
        assert.ok(cols.includes('evento_historico'));
        assert.match(linha, /Formatura/);
    });

    it('importação aditiva cria o período novo já como evento', async () => {
        const reg = montarRegistro('poema', texto());
        const payload = { itens: [reg], autores: [{ id: 1, nome: 'Ana' }] };
        const destino = {
            poemas: [],
            prosas: [],
            pessoas: [],
            grupos: [],
            autores: [{ id: 5, nome: 'Ana' }],
            epocas: [],
            periodosHistoricos: [],
            livros: [],
            escansoes: [],
            estruturasTextuais: [],
            opcoesPeriodoBiografico: { esferas: [], vinculos: [] },
        };
        const relatorio = classificarImportacaoAditiva(payload, destino);
        await aplicarImportacaoAditiva(payload, relatorio, destino, {
            tirarSnapshotSeNecessario: async () => true,
            save: () => {},
        });
        assert.equal(destino.epocas.find((e) => e.nome === 'Formatura')?.evento, true);
        assert.equal(
            destino.periodosHistoricos.find((p) => p.nome === 'Semana de Arte Moderna')?.evento,
            true,
        );
        assert.equal('evento' in destino.epocas.find((e) => e.nome === 'Faculdade'), false);
    });
});
