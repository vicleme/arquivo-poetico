import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Fase 1, etapa 1c: "Por gênero" como terceiro modo do gráfico de Pessoas,
// botão "Considerar cis/trans" (padrão desligado), filtro de Gênero (e de
// identidade, com o botão ligado) em "Por pessoa". O cartão separado de gênero
// saiu. Contagem continua por aparição.
const { db } = await import('../js/db.js');
const E = await import('../js/estatisticas.js');
const { renderPessoasGrupos } = await import('../js/estatisticas-tela-pessoas.js');

const HTML = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const SECAO = HTML.match(/<section id="estatisticas-pessoas-grupos"[\s\S]*?<\/section>/)[0];

function acervo() {
    localStorage.clear();
    ['livros', 'partes', 'secoes', 'elementos', 'epocas', 'autores', 'grupos'].forEach(
        (c) => (db[c] = []),
    );
    db.temas = [];
    db.assuntos = [];
    db.grupos = [{ id: 7, nome: 'Amigas', autorId: 1, paiId: null }];
    db.pessoas = [
        { id: 1, nome: 'Ana', genero: 'Mulher', identidadeCisTrans: 'Cisgênero', grupoIds: [7] },
        { id: 2, nome: 'Bia', genero: 'mulher', identidadeCisTrans: 'Transgênero' },
        { id: 3, nome: 'Caio', genero: 'Homem' },
        { id: 4, nome: 'Dani', genero: '', identidadeCisTrans: 'Não se aplica' },
        { id: 5, nome: 'Eva', genero: 'Mulher', grupoIds: [7] },
    ];
    const ps = (...ids) => ids.map((pessoaId) => ({ pessoaId }));
    db.poemas = [
        { id: 1, titulo: 'A', ano: 2020, pessoas: ps(1, 2, 3) },
        { id: 2, titulo: 'B', ano: 2021, pessoas: ps(1, 4) },
        { id: 3, titulo: 'C', ano: 2021, pessoas: ps(5) },
    ];
    db.prosas = [];
}

const mapa = (r) => Object.fromEntries(r.labels.map((l, i) => [l, r.data[i]]));

describe('1c: estado salvo', () => {
    beforeEach(() => localStorage.clear());

    it('modo aceita genero e cai em pessoa com valor inválido', () => {
        assert.equal(E.getModoGraficoPessoas(), 'pessoa');
        E.definirModoGraficoPessoas('genero');
        assert.equal(E.getModoGraficoPessoas(), 'genero');
        E.definirModoGraficoPessoas('lixo');
        assert.equal(E.getModoGraficoPessoas(), 'pessoa');
    });

    it('cis/trans vem desligado e a escolha persiste', () => {
        assert.equal(E.getConsiderarCisTrans(), false);
        E.definirConsiderarCisTrans(true);
        assert.equal(E.getConsiderarCisTrans(), true);
        E.definirConsiderarCisTrans(false);
        assert.equal(E.getConsiderarCisTrans(), false);
    });

    it('filtros de gênero e identidade: marcar, desmarcar e limpar', () => {
        E.toggleGeneroFiltroPessoas('mulher', true);
        E.toggleGeneroFiltroPessoas('homem', true);
        E.toggleGeneroFiltroPessoas('homem', false);
        assert.deepEqual(E.getGenerosFiltroPessoas(), ['mulher']);
        E.limparGenerosFiltroPessoas();
        assert.deepEqual(E.getGenerosFiltroPessoas(), []);
        E.toggleIdentidadeFiltroPessoas('Cisgênero', true);
        assert.deepEqual(E.getIdentidadesFiltroPessoas(), ['Cisgênero']);
        E.limparIdentidadesFiltroPessoas();
        assert.deepEqual(E.getIdentidadesFiltroPessoas(), []);
    });
});

describe('1c: agregarPorPessoa no modo genero', () => {
    beforeEach(acervo);

    it('desligado: barras literais por aparição (mulher e Mulher separadas)', () => {
        const r = mapa(E.agregarPorPessoa({ modo: 'genero' }));
        // Ana 2 + Eva 1 = 3; Bia 1; Caio 1; Dani sem gênero 1.
        assert.deepEqual(r, { Mulher: 3, mulher: 1, Homem: 1, '(Sem gênero definido)': 1 });
    });

    it('ligado: combina Gênero e identidade; vazio vira "não documentada"', () => {
        const r = mapa(E.agregarPorPessoa({ modo: 'genero', considerarCisTrans: true }));
        assert.deepEqual(r, {
            'Mulher, Cisgênero': 2,
            'Mulher, (Identidade não documentada)': 1,
            'mulher, Transgênero': 1,
            'Homem, (Identidade não documentada)': 1,
            '(Sem gênero definido), Não se aplica': 1,
        });
    });

    it('a soma das barras é a mesma com cis/trans ligado ou desligado', () => {
        const soma = (r) => r.data.reduce((a, b) => a + b, 0);
        assert.equal(
            soma(E.agregarPorPessoa({ modo: 'genero' })),
            soma(E.agregarPorPessoa({ modo: 'genero', considerarCisTrans: true })),
        );
        assert.equal(soma(E.agregarPorPessoa({ modo: 'genero' })), 6);
    });

    it('o filtro de Grupo vale no modo genero', () => {
        const r = mapa(E.agregarPorPessoa({ modo: 'genero', grupoIds: [7] }));
        assert.deepEqual(r, { Mulher: 3 });
    });

    it('o filtro de gênero não se aplica no modo genero', () => {
        const r = mapa(E.agregarPorPessoa({ modo: 'genero', generos: ['homem'] }));
        assert.equal(r.Mulher, 3);
    });
});

describe('1c: filtro de gênero em "Por pessoa"', () => {
    beforeEach(acervo);

    it('compara sem caixa nem acento: "mulher" traz Mulher e mulher', () => {
        const r = mapa(E.agregarPorPessoa({ modo: 'pessoa', generos: ['mulher'] }));
        assert.deepEqual(r, { Ana: 2, Eva: 1, Bia: 1 });
    });

    it('"(Sem gênero definido)" tem chave própria', () => {
        const r = mapa(E.agregarPorPessoa({ modo: 'pessoa', generos: [E.CHAVE_SEM_GENERO] }));
        assert.deepEqual(r, { Dani: 1 });
    });

    it('vários gêneros combinam por OU', () => {
        const r = mapa(E.agregarPorPessoa({ modo: 'pessoa', generos: ['homem', 'mulher'] }));
        assert.deepEqual(r, { Ana: 2, Eva: 1, Bia: 1, Caio: 1 });
    });

    it('combina por E com o filtro de Grupo', () => {
        const r = mapa(E.agregarPorPessoa({ modo: 'pessoa', generos: ['mulher'], grupoIds: [7] }));
        assert.deepEqual(r, { Ana: 2, Eva: 1 });
    });

    it('identidade só vale com cis/trans ligado', () => {
        const base = { modo: 'pessoa', identidades: ['Transgênero'] };
        assert.equal(E.agregarPorPessoa(base).labels.length, 5, 'ignorada com o botão desligado');
        assert.deepEqual(mapa(E.agregarPorPessoa({ ...base, considerarCisTrans: true })), {
            Bia: 1,
        });
        assert.deepEqual(
            mapa(
                E.agregarPorPessoa({
                    modo: 'pessoa',
                    identidades: [E.CHAVE_SEM_IDENTIDADE],
                    considerarCisTrans: true,
                }),
            ),
            { Caio: 1, Eva: 1 },
        );
    });

    it('sem passar generos explicitamente, o estado salvo NÃO restringe (linha do tempo intacta)', () => {
        E.toggleGeneroFiltroPessoas('homem', true);
        const r = mapa(E.agregarPorPessoa({ modo: 'pessoa' }));
        assert.equal(r.Ana, 2);
        assert.equal(r.Caio, 1);
    });

    it('no modo grupo o filtro de gênero não se aplica', () => {
        const r = mapa(E.agregarPorPessoa({ modo: 'grupo', generos: ['homem'] }));
        assert.deepEqual(r, { Amigas: 3 });
    });
});

describe('1c: opções do filtro de gênero', () => {
    beforeEach(acervo);

    it('deduplica por chave, usa a grafia mais comum e conta pessoas', () => {
        const op = E.opcoesFiltroGenero();
        const mulher = op.find((o) => o.chave === 'mulher');
        assert.equal(mulher.rotulo, 'Mulher');
        assert.equal(mulher.pessoas, 3);
        assert.equal(op.filter((o) => o.chave === 'mulher').length, 1);
        assert.ok(op.some((o) => o.chave === E.CHAVE_SEM_GENERO && o.pessoas === 1));
    });
});

describe('1c: a tela', () => {
    const graficos = {};
    beforeEach(() => {
        acervo();
        document.body.innerHTML = SECAO;
        Object.keys(graficos).forEach((k) => delete graficos[k]);
        globalThis.Chart = class {
            constructor(canvas, cfg) {
                this.data = cfg.data;
                graficos[canvas.id] = this;
            }
            destroy() {}
            static getChart(canvas) {
                return graficos[canvas.id];
            }
        };
    });
    const dados = () => {
        const d = graficos['grafico-pessoas'].data;
        return Object.fromEntries(d.labels.map((l, i) => [l, d.datasets[0].data[i]]));
    };
    const html = (id) => document.getElementById(id).innerHTML;

    it('o seletor de modo tem os três botões e o cartão separado de gênero não existe', () => {
        renderPessoasGrupos();
        const modo = html('painel-modo-pessoas');
        assert.match(modo, /Por pessoa/);
        assert.match(modo, /Por grupo/);
        assert.match(modo, /Por gênero/);
        assert.ok(!document.getElementById('grafico-generos-pessoa'));
        assert.ok(!SECAO.includes('Gênero das pessoas retratadas'));
    });

    it('Por gênero: o gráfico traz as barras de gênero e o clique fica desligado', () => {
        E.definirModoGraficoPessoas('genero');
        renderPessoasGrupos();
        assert.deepEqual(dados(), {
            Mulher: 3,
            mulher: 1,
            Homem: 1,
            '(Sem gênero definido)': 1,
        });
        assert.equal(document.getElementById('grafico-pessoas').onclick, null);
    });

    it('o botão cis/trans alterna as barras e o texto do botão', () => {
        E.definirModoGraficoPessoas('genero');
        renderPessoasGrupos();
        assert.match(html('painel-cistrans-pessoas'), /desligado/);
        E.definirConsiderarCisTrans(true);
        renderPessoasGrupos();
        assert.match(html('painel-cistrans-pessoas'), /ligado/);
        assert.ok('Mulher, Cisgênero' in dados());
    });

    it('o botão some no modo Por grupo', () => {
        E.definirModoGraficoPessoas('grupo');
        renderPessoasGrupos();
        assert.equal(html('painel-cistrans-pessoas'), '');
    });

    it('Por pessoa: o painel de gênero lista as opções e o filtro restringe o gráfico', () => {
        renderPessoasGrupos();
        assert.match(html('painel-genero-pessoas'), /toggleGeneroFiltroPessoas\('mulher'/);
        assert.ok(!/Identidade/.test(html('painel-genero-pessoas')));
        E.toggleGeneroFiltroPessoas('homem', true);
        renderPessoasGrupos();
        assert.deepEqual(dados(), { Caio: 1 });
    });

    it('com cis/trans ligado, o painel ganha o filtro de identidade', () => {
        E.definirConsiderarCisTrans(true);
        renderPessoasGrupos();
        assert.match(html('painel-genero-pessoas'), /Identidade/);
        E.toggleIdentidadeFiltroPessoas('Transgênero', true);
        renderPessoasGrupos();
        assert.deepEqual(dados(), { Bia: 1 });
    });

    it('a linha do tempo de Pessoa não muda com o filtro de gênero', () => {
        renderPessoasGrupos();
        const antes = JSON.stringify(graficos['grafico-pessoa-tempo'].data);
        E.toggleGeneroFiltroPessoas('homem', true);
        renderPessoasGrupos();
        assert.equal(JSON.stringify(graficos['grafico-pessoa-tempo'].data), antes);
    });

    it('Por gênero guarda os "ocultos" numa chave própria', () => {
        E.definirModoGraficoPessoas('genero');
        E.toggleOcultoItem('pessoas-genero', 'Homem');
        renderPessoasGrupos();
        assert.ok(!('Homem' in dados()));
        E.definirModoGraficoPessoas('pessoa');
        renderPessoasGrupos();
        assert.ok('Caio' in dados());
    });
});
