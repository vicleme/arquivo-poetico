import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Dois períodos com o mesmo nome em lugares diferentes da hierarquia
// ("Primeiro mandato" sob Lula e sob Dilma): o campo dos modais de Poema
// e Prosa distingue pelo caminho e nunca liga ao errado em silêncio.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ler = (f) => fs.readFileSync(path.resolve(__dirname, '../modais', f), 'utf8');
document.body.innerHTML =
    ler('modal-poema.html') + ler('modal-prosa.html') + '<div id="avisos-toast"></div>';

// Os campos de Sinalizações nascem por script no app; aqui entram como
// inputs simples só para o envio do formulário ler.
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

const H = await import('../js/periodos-historicos-hierarquia.js');
const { db } = await import('../js/db.js');
const { initFormPoema, initFormProsa } = await import('../js/forms.js');
const { atualizarDatalistPeriodoHistorico, resetPeriodosHistoricosDoTexto } =
    await import('../js/editor.js');

const arvore = () => [
    { id: 1, nome: 'Governo Lula', pertenceA: [] },
    { id: 2, nome: 'Governo Dilma', pertenceA: [] },
    { id: 3, nome: 'Primeiro mandato', pertenceA: [1] },
    { id: 4, nome: 'Primeiro mandato', pertenceA: [2] },
    { id: 5, nome: 'Ditadura Militar', pertenceA: [] },
];

describe('rótulo e resolução', () => {
    const lista = arvore();

    it('nome único fica como está; homônimos ganham o caminho dos ancestrais', () => {
        assert.equal(H.rotuloDeEscolhaDoPeriodo(lista, 5), 'Ditadura Militar');
        assert.equal(H.rotuloDeEscolhaDoPeriodo(lista, 3), 'Primeiro mandato (Governo Lula)');
        assert.equal(H.rotuloDeEscolhaDoPeriodo(lista, 4), 'Primeiro mandato (Governo Dilma)');
        assert.equal(H.rotuloDeEscolhaDoPeriodo(lista, 999), '');
    });

    it('homônimos sem caminho que os separe ganham o id', () => {
        const l = [
            { id: 7, nome: 'X', pertenceA: [] },
            { id: 8, nome: 'X', pertenceA: [] },
        ];
        assert.equal(H.rotuloDeEscolhaDoPeriodo(l, 7), 'X #7');
        assert.equal(H.resolverPeriodoPorRotulo(l, 'X #8').id, 8);
    });

    it('o rótulo volta ao id; nome único resolve pelo nome', () => {
        assert.equal(H.resolverPeriodoPorRotulo(lista, 'Primeiro mandato (Governo Dilma)').id, 4);
        assert.equal(H.resolverPeriodoPorRotulo(lista, ' Ditadura Militar ').id, 5);
    });

    it('nome ambíguo: pede escolha, exceto se o texto já estava ligado a um deles', () => {
        assert.deepEqual(H.resolverPeriodoPorRotulo(lista, 'Primeiro mandato'), {
            ambiguo: true,
            nome: 'Primeiro mandato',
        });
        assert.equal(H.resolverPeriodoPorRotulo(lista, 'Primeiro mandato', 4).id, 4);
        assert.equal(H.resolverPeriodoPorRotulo(lista, 'Primeiro mandato', 5).ambiguo, true);
    });

    it('vazio e nome novo', () => {
        assert.deepEqual(H.resolverPeriodoPorRotulo(lista, '  '), { id: null });
        assert.deepEqual(H.resolverPeriodoPorRotulo(lista, 'Pandemia'), { id: null, novo: true });
    });
});

describe('opções do campo (nome em cima, caminho embaixo)', () => {
    const porAno = (a, b) => (a.inicio?.ano ?? 9999) - (b.inicio?.ano ?? 9999);

    it('em árvore e por data; valor é o nome, só homônimo leva o caminho', () => {
        const lista = [
            { id: 1, nome: 'Governo Lula', inicio: { ano: 2003 }, pertenceA: [] },
            { id: 2, nome: 'Governo Dilma', inicio: { ano: 2011 }, pertenceA: [] },
            { id: 3, nome: 'Primeiro mandato', inicio: { ano: 2003 }, pertenceA: [1] },
            { id: 4, nome: 'Primeiro mandato', inicio: { ano: 2011 }, pertenceA: [2] },
            { id: 5, nome: 'Segundo mandato', inicio: { ano: 2007 }, pertenceA: [1] },
            { id: 6, nome: 'Ditadura Militar', inicio: { ano: 1964 }, pertenceA: [] },
        ];
        const opcoes = H.opcoesDeEscolhaDosPeriodosHistoricos(lista, porAno);
        assert.deepEqual(
            opcoes.map((o) => [o.rotulo, o.caminho, o.nivel]),
            [
                ['Ditadura Militar', '', 0],
                ['Governo Lula', '', 0],
                ['Primeiro mandato (Governo Lula)', 'Governo Lula', 1],
                ['Segundo mandato', 'Governo Lula', 1],
                ['Governo Dilma', '', 0],
                ['Primeiro mandato (Governo Dilma)', 'Governo Dilma', 1],
            ],
        );
    });

    it('o valor escolhido volta ao período certo, também o nome puro quando é único', () => {
        const lista = arvore();
        lista.push({ id: 6, nome: 'Segundo mandato', pertenceA: [1] });
        H.opcoesDeEscolhaDosPeriodosHistoricos(lista, porAno).forEach((o) => {
            assert.deepEqual(H.resolverPeriodoPorRotulo(lista, o.rotulo), { id: o.id });
        });
    });
});

describe('modais de Poema e Prosa', () => {
    beforeEach(() => {
        db.periodosHistoricos = arvore();
        db.poemas = [];
        db.prosas = [];
        initFormPoema();
        initFormProsa();
    });

    it('as sugestões mostram o rótulo com caminho nos homônimos', () => {
        atualizarDatalistPeriodoHistorico();
        const valores = [
            ...document.querySelectorAll('#sugestoes-periodo-historico-nome option'),
        ].map((o) => o.getAttribute('value'));
        assert.ok(valores.includes('Primeiro mandato (Governo Lula)'));
        assert.ok(valores.includes('Primeiro mandato (Governo Dilma)'));
        assert.ok(!valores.includes('Primeiro mandato'));
        assert.ok(valores.includes('Ditadura Militar'));
    });

    it('as sugestões levam o caminho no label, e o topo fica sem label', () => {
        atualizarDatalistPeriodoHistorico();
        const labels = Object.fromEntries(
            [...document.querySelectorAll('#sugestoes-periodo-historico-nome option')].map((o) => [
                o.getAttribute('value'),
                o.getAttribute('label'),
            ]),
        );
        assert.equal(labels['Primeiro mandato (Governo Lula)'], 'Governo Lula');
        assert.equal(labels['Ditadura Militar'], null);
    });

    const enviar = (prefixo, formId, titulo, periodo) => {
        // Como o app: abrir o modal de texto novo zera os chips (ui.js).
        resetPeriodosHistoricosDoTexto(prefixo === 'p' ? 'poemas' : 'prosas');
        document.getElementById(`${prefixo}-titulo`).value = titulo;
        document.getElementById(`${prefixo}-periodo-historico-nome`).value = periodo;
        document.getElementById(formId).onsubmit({ preventDefault() {} });
    };

    it('poema: o rótulo liga ao período certo', () => {
        enviar('p', 'form-poema', 'Poema A', 'Primeiro mandato (Governo Dilma)');
        assert.deepEqual(db.poemas.find((p) => p.titulo === 'Poema A')?.periodosHistoricosIds, [4]);
    });

    it('poema: nome ambíguo não salva e não cria nada', () => {
        enviar('p', 'form-poema', 'Poema B', 'Primeiro mandato');
        assert.equal(
            db.poemas.find((p) => p.titulo === 'Poema B'),
            undefined,
        );
        assert.equal(db.periodosHistoricos.length, 5);
        assert.match(document.getElementById('avisos-toast').textContent, /mais de um período/);
    });

    it('poema: nome novo cria o período; vazio fica sem período', () => {
        enviar('p', 'form-poema', 'Poema C', 'Pandemia');
        const c = db.poemas.find((p) => p.titulo === 'Poema C');
        assert.equal(
            db.periodosHistoricos.find((x) => x.id === c.periodosHistoricosIds[0]).nome,
            'Pandemia',
        );
        enviar('p', 'form-poema', 'Poema D', '');
        assert.deepEqual(db.poemas.find((p) => p.titulo === 'Poema D').periodosHistoricosIds, []);
    });

    it('prosa: o rótulo liga ao período certo e a ambiguidade bloqueia', () => {
        enviar('pr', 'form-prosa', 'Prosa A', 'Primeiro mandato (Governo Lula)');
        assert.deepEqual(db.prosas.find((p) => p.titulo === 'Prosa A')?.periodosHistoricosIds, [3]);
        enviar('pr', 'form-prosa', 'Prosa B', 'Primeiro mandato');
        assert.equal(
            db.prosas.find((p) => p.titulo === 'Prosa B'),
            undefined,
        );
    });
});
