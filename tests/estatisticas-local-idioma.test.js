import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Estatísticas de Local e Idioma: textos por Local citado e por Local de
// escrita (direto x com o que está dentro, filtro por tipo), Assuntos por
// local de escrita e Idiomas por papel. O teste mais importante confere que
// cada barra bate com a lista que o clique abre.
const { db } = await import('../js/db.js');
const E = await import('../js/estatisticas.js');
const L = await import('../js/locais.js');
const { filtrarTextos } = await import('../js/utils.js');
const { decorarCamposBusca } = await import('../js/render-listas.js');
const { renderLocalIdioma } = await import('../js/estatisticas-tela-local-idioma.js');

const HTML = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const SECAO = HTML.match(/<section id="estatisticas-local-idioma"[\s\S]*?<\/section>/)[0];

function zerar() {
    localStorage.clear();
    ['livros', 'partes', 'secoes', 'elementos', 'pessoas', 'grupos', 'autores', 'epocas'].forEach(
        (c) => (db[c] = []),
    );
    db.temas = [
        { id: 1, nome: 'Amor', notas: '' },
        { id: 2, nome: 'Cidade', notas: '' },
    ];
    db.assuntos = [
        { id: 10, nome: 'Vida emocional', notas: '', temaIds: [1] },
        { id: 11, nome: 'Urbano', notas: '', temaIds: [2] },
    ];
    db.locais = [
        { id: 1, nome: 'Brasil', tipo: 'País', pertenceA: [], notas: '' },
        { id: 2, nome: 'São Paulo', tipo: 'Estado', pertenceA: [1], notas: '' },
        { id: 3, nome: 'São Paulo', tipo: 'Cidade', pertenceA: [2], notas: '' },
        { id: 4, nome: 'Lapa', tipo: 'Bairro', pertenceA: [3], notas: '' },
        { id: 5, nome: 'Metrô de São Paulo', tipo: 'Rede ou sistema', pertenceA: [3], notas: '' },
        { id: 6, nome: 'Estação Lapa', tipo: 'Estação', pertenceA: [4, 5], notas: '' },
        { id: 7, nome: 'Santos', tipo: 'Cidade', pertenceA: [2], notas: '' },
        { id: 8, nome: 'Ponta da Praia', tipo: 'Bairro', pertenceA: [7], notas: '' },
        { id: 9, nome: 'Praça Coração de Maria', tipo: 'Logradouro', pertenceA: [8], notas: '' },
        { id: 10, nome: 'Paris', tipo: '', pertenceA: [], notas: '' },
    ];
}

function texto(id, cita, escrita, extra = {}) {
    return {
        id,
        titulo: `T${id}`,
        ano: 2020,
        territorialidade: cita,
        sinalizacoesTerritorialidade: L.espelhoDeLocais(db, cita),
        localEscrita: escrita,
        ...extra,
    };
}

function acervo() {
    zerar();
    db.poemas = [
        texto(1, [6], 8, {
            idiomas: [{ idioma: 'pt-BR', papel: 'principal', dialetos: [] }],
            sinalizacoesTema: 'Amor',
            temas: [{ temaId: 1, papel: 'principal' }],
        }),
        texto(2, [4, 6], 7, {
            idiomas: [{ idioma: 'pt-BR', papel: 'principal', dialetos: [] }],
            sinalizacoesTema: 'Cidade',
            temas: [{ temaId: 2, papel: 'principal' }],
        }),
        texto(3, [7], null, { idioma: 'pt-BR' }),
        texto(4, [10], 10, {
            idiomas: [
                { idioma: 'pt-BR', papel: 'principal', dialetos: [] },
                { idioma: 'Inglês', papel: 'secundario', dialetos: [] },
            ],
        }),
        texto(5, [], 9, {
            sinalizacoesTema: 'Amor, Cidade',
            temas: [
                { temaId: 1, papel: 'principal' },
                { temaId: 2, papel: 'secundario' },
            ],
        }),
    ];
    db.prosas = [
        texto(101, [3], 3, {
            idiomas: [
                { idioma: 'pt-BR', papel: 'principal', dialetos: [] },
                { idioma: 'ingles', papel: 'principal', dialetos: [] },
            ],
            sinalizacoesTema: 'Cidade',
            temas: [{ temaId: 2, papel: 'principal' }],
        }),
    ];
}

const mapa = (r) => Object.fromEntries(r.labels.map((l, i) => [l, r.data[i]]));

describe('agregarPorLocal: Territorialidade', () => {
    beforeEach(acervo);

    it('direto conta só o Local marcado e separa homônimos pelo tipo (São Paulo cidade x estado)', () => {
        assert.deepEqual(mapa(E.agregarPorLocal({ campo: 'territorialidade', modo: 'direto' })), {
            'Estação Lapa': 2,
            Lapa: 1,
            Santos: 1,
            Paris: 1,
            'São Paulo (Cidade)': 1,
        });
    });

    it('com o que está dentro soma sublocais, cada texto uma vez por Local', () => {
        const r = mapa(E.agregarPorLocal({ campo: 'territorialidade', modo: 'agregado' }));
        assert.equal(r.Brasil, 4); // textos 1, 2, 3 e 101 (Paris não é do Brasil)
        assert.equal(r['São Paulo (Estado)'], 4);
        assert.equal(r['São Paulo (Cidade)'], 3); // 1, 2 e 101; Santos fica no Estado
        assert.equal(r.Lapa, 2); // texto 2 cita Lapa e Estação Lapa: conta uma vez
        assert.equal(r['Metrô de São Paulo'], 2);
        assert.equal(r.Santos, 1);
        assert.equal(r.Paris, 1);
    });

    it('filtra por tipo, sem diferenciar caixa', () => {
        const cidades = mapa(
            E.agregarPorLocal({ campo: 'territorialidade', modo: 'agregado', tipo: 'cidade' }),
        );
        assert.deepEqual(Object.keys(cidades).sort(), ['Santos', 'São Paulo (Cidade)']);
        const semTipo = E.agregarPorLocal({
            campo: 'territorialidade',
            modo: 'direto',
            tipo: E.TIPO_LOCAL_SEM_TIPO,
        });
        assert.deepEqual(semTipo.labels, ['Paris']);
    });

    it('o rótulo não muda quando o tipo escolhido muda', () => {
        const todos = E.agregarPorLocal({ campo: 'territorialidade', modo: 'agregado' });
        const so = E.agregarPorLocal({
            campo: 'territorialidade',
            modo: 'agregado',
            tipo: 'Estado',
        });
        assert.deepEqual(so.labels, ['São Paulo (Estado)']);
        assert.ok(todos.labels.includes('São Paulo (Estado)'));
    });

    it('usa o modo e o tipo guardados quando nada é passado', () => {
        E.definirModoLocalEstatisticas('territorialidade', 'agregado');
        E.definirTipoLocalEstatisticas('territorialidade', 'País');
        assert.deepEqual(E.agregarPorLocal({ campo: 'territorialidade' }).labels, ['Brasil']);
    });

    it('respeita o corpus filtrado das Estatísticas', () => {
        E.definirFiltrosCompartilhados({ tipo: 'prosas' });
        assert.deepEqual(mapa(E.agregarPorLocal({ campo: 'territorialidade', modo: 'direto' })), {
            'São Paulo (Cidade)': 1,
        });
    });

    it('ordena do maior para o menor, desempatando pelo nome', () => {
        const r = E.agregarPorLocal({ campo: 'territorialidade', modo: 'direto' });
        assert.equal(r.labels[0], 'Estação Lapa');
        assert.deepEqual(
            r.labels.slice(1),
            [...r.labels.slice(1)].sort((a, b) => a.localeCompare(b, 'pt-BR')),
        );
    });
});

describe('agregarPorLocal: Local de escrita', () => {
    beforeEach(acervo);

    it('direto: só o Local onde foi escrito', () => {
        assert.deepEqual(mapa(E.agregarPorLocal({ campo: 'escrita', modo: 'direto' })), {
            'Ponta da Praia': 1,
            Santos: 1,
            Paris: 1,
            'Praça Coração de Maria': 1,
            'São Paulo (Cidade)': 1,
        });
    });

    it('agregado: escrever em Santos conta para o Brasil', () => {
        const r = mapa(E.agregarPorLocal({ campo: 'escrita', modo: 'agregado' }));
        assert.equal(r.Brasil, 4);
        assert.equal(r.Santos, 3);
        assert.equal(r['Ponta da Praia'], 2);
    });

    it('texto sem local de escrita não conta em lugar nenhum', () => {
        const soma = E.agregarPorLocal({ campo: 'escrita', modo: 'direto' }).data.reduce(
            (a, b) => a + b,
            0,
        );
        assert.equal(soma, 5); // 6 textos, 1 sem local de escrita
    });
});

describe('a barra bate com a lista que o clique abre', () => {
    beforeEach(acervo);

    const itens = () => [...db.poemas, ...db.prosas].map((i) => decorarCamposBusca({ ...i }));

    function conferir(campo, modo, prefixo) {
        const r = E.agregarPorLocal({ campo, modo });
        assert.ok(r.ids.length > 0);
        r.ids.forEach((id, i) => {
            const consulta = L.consultaBuscaDoLocal(db, id, prefixo);
            const achados = filtrarTextos(itens(), consulta).length;
            assert.equal(achados, r.data[i], `${r.labels[i]} (${consulta})`);
        });
    }

    it('Territorialidade, com o que está dentro', () =>
        conferir('territorialidade', 'agregado', 'territorialidade'));
    it('Territorialidade, direto', () =>
        conferir('territorialidade', 'direto', 'territorialidadedireta'));
    it('Local de escrita, com o que está dentro', () =>
        conferir('escrita', 'agregado', 'localescrita'));
    it('Local de escrita, direto', () => conferir('escrita', 'direto', 'localescritadireta'));
});

describe('rotulosUnicosDeLocais', () => {
    beforeEach(zerar);

    it('dois Locais de mesmo nome e tipo em pais diferentes ganham o pai no rótulo', () => {
        db.locais.push(
            { id: 20, nome: 'Centro', tipo: 'Bairro', pertenceA: [7], notas: '' },
            { id: 21, nome: 'Centro', tipo: 'Bairro', pertenceA: [3], notas: '' },
        );
        const r = L.rotulosUnicosDeLocais(db, [20, 21]);
        assert.equal(r.get('20'), 'Centro (Bairro, em Santos)');
        assert.equal(r.get('21'), 'Centro (Bairro, em São Paulo)');
    });

    it('nunca devolve dois rótulos iguais', () => {
        db.locais.push(
            { id: 30, nome: 'Vila', tipo: 'Bairro', pertenceA: [], notas: '' },
            { id: 31, nome: 'Vila', tipo: 'Bairro', pertenceA: [], notas: '' },
        );
        const r = [...L.rotulosUnicosDeLocais(db, [30, 31]).values()];
        assert.equal(new Set(r).size, 2);
    });

    it('Local sem homônimo mantém o nome simples', () => {
        assert.equal(L.rotulosUnicosDeLocais(db, [10]).get('10'), 'Paris');
    });
});

describe('tiposDeLocalComTexto', () => {
    beforeEach(acervo);

    it('lista só tipos de Locais com texto, com a quantidade de Locais', () => {
        const tipos = E.tiposDeLocalComTexto('territorialidade', 'direto');
        assert.deepEqual(
            tipos.map((t) => [t.rotulo, t.locais]),
            [
                ['Bairro', 1],
                ['Cidade', 2],
                ['Estação', 1],
                ['Sem tipo', 1],
            ],
        );
        assert.equal(tipos.at(-1).valor, E.TIPO_LOCAL_SEM_TIPO);
    });

    it('com o que está dentro entram os tipos dos ancestrais', () => {
        const rotulos = E.tiposDeLocalComTexto('territorialidade', 'agregado').map((t) => t.rotulo);
        assert.ok(rotulos.includes('País') && rotulos.includes('Estado'));
    });
});

describe('Assuntos por local de escrita', () => {
    beforeEach(acervo);

    it('sem Local, conta os textos que têm local de escrita', () => {
        const r = E.agregarAssuntosPorLocalEscrita('');
        assert.equal(r.textos, 5);
        assert.deepEqual(mapa(r), { Urbano: 3, 'Vida emocional': 2 });
    });

    it('com Local, inclui o que foi escrito dentro dele', () => {
        const r = E.agregarAssuntosPorLocalEscrita(7); // Santos: textos 1, 2 e 5
        assert.equal(r.textos, 3);
        assert.deepEqual(mapa(r), { Urbano: 2, 'Vida emocional': 2 });
    });

    it('Local sem texto devolve vazio', () => {
        const r = E.agregarAssuntosPorLocalEscrita(1);
        assert.equal(r.textos, 4);
        assert.equal(E.agregarAssuntosPorLocalEscrita(6).textos, 0);
    });

    it('lista os Locais de escrita escolhíveis, do maior para o menor', () => {
        const opcoes = E.locaisDeEscritaParaSelecao();
        assert.equal(opcoes[0].rotulo, 'Brasil');
        assert.equal(opcoes[0].n, 4);
        assert.ok(!opcoes.some((o) => o.rotulo === 'Estação Lapa'));
    });

    it('a barra bate com a lista (assunto + local de escrita)', () => {
        const itens = [...db.poemas, ...db.prosas].map((i) => decorarCamposBusca({ ...i }));
        const alvo = L.consultaBuscaDoLocal(db, 7, 'localescrita');
        const r = E.agregarAssuntosPorLocalEscrita(7);
        r.labels.forEach((nome, i) => {
            assert.equal(filtrarTextos(itens, `assunto:"${nome}" ${alvo}`).length, r.data[i], nome);
        });
        // Sem Local escolhido, `localescrita:*` limita aos textos com local.
        const geral = E.agregarAssuntosPorLocalEscrita('');
        geral.labels.forEach((nome, i) => {
            assert.equal(
                filtrarTextos(itens, `assunto:"${nome}" localescrita:*`).length,
                geral.data[i],
                nome,
            );
        });
    });
});

describe('agregarPorIdioma', () => {
    beforeEach(acervo);

    it('todos: um texto conta uma vez em cada idioma que tem', () => {
        const r = E.agregarPorIdioma('todos');
        assert.deepEqual(mapa(r), { 'pt-BR': 5, Inglês: 2 });
        assert.equal(r.textos, 5);
    });

    it('principal: dois Principais contam um em cada', () => {
        const r = E.agregarPorIdioma('principal');
        assert.deepEqual(mapa(r), { 'pt-BR': 5, Inglês: 1 });
    });

    it('secundário: só os idiomas com esse papel', () => {
        const r = E.agregarPorIdioma('secundario');
        assert.deepEqual(mapa(r), { Inglês: 1 });
        assert.equal(r.textos, 1);
    });

    it('junta grafias iguais sem caixa nem acento', () => {
        const r = mapa(E.agregarPorIdioma('todos'));
        assert.equal(r.Inglês, 2); // "Inglês" e "ingles"
        assert.equal(r.ingles, undefined);
    });

    it('a grafia do rótulo não muda quando o papel muda', () => {
        // "Inglês" (poema 4, secundário) e "ingles" (prosa 101, principal): empate
        // de uso, vence a que apareceu primeiro, em qualquer papel.
        ['todos', 'principal', 'secundario'].forEach((papel) => {
            const rotulos = E.agregarPorIdioma(papel).labels.filter((l) => /ingl/i.test(l));
            assert.deepEqual(rotulos, ['Inglês'], papel);
        });
    });

    it('dado antigo, só com `idioma`, vale como Principal', () => {
        // texto 3 só tem `idioma: 'pt-BR'`
        assert.equal(mapa(E.agregarPorIdioma('principal'))['pt-BR'], 5);
    });

    it('texto sem idioma não entra', () => {
        assert.equal(E.agregarPorIdioma('todos').textos, 5); // o texto 5 não tem idioma
    });

    it('respeita o corpus filtrado', () => {
        E.definirFiltrosCompartilhados({ tipo: 'prosas' });
        // Só a prosa fica no corpus, e nela a grafia é "ingles".
        assert.deepEqual(mapa(E.agregarPorIdioma('todos')), { 'pt-BR': 1, ingles: 1 });
    });
});

describe('filtros guardados', () => {
    beforeEach(zerar);

    it('modo de Local: padrão direto, só aceita direto ou agregado', () => {
        assert.equal(E.getModoLocalEstatisticas('escrita'), 'direto');
        E.definirModoLocalEstatisticas('escrita', 'agregado');
        assert.equal(E.getModoLocalEstatisticas('escrita'), 'agregado');
        assert.equal(E.getModoLocalEstatisticas('territorialidade'), 'direto'); // chave própria
        E.definirModoLocalEstatisticas('escrita', 'qualquer');
        assert.equal(E.getModoLocalEstatisticas('escrita'), 'direto');
    });

    it('campo desconhecido cai em territorialidade', () => {
        E.definirModoLocalEstatisticas('xyz', 'agregado');
        assert.equal(E.getModoLocalEstatisticas('territorialidade'), 'agregado');
    });

    it('tipo de Local: vazio apaga a escolha', () => {
        E.definirTipoLocalEstatisticas('escrita', 'Cidade');
        assert.equal(E.getTipoLocalEstatisticas('escrita'), 'Cidade');
        E.definirTipoLocalEstatisticas('escrita', '');
        assert.equal(E.getTipoLocalEstatisticas('escrita'), '');
    });

    it('Local dos Assuntos: vazio apaga a escolha', () => {
        E.definirLocalAssuntosEscrita(7);
        assert.equal(E.getLocalAssuntosEscrita(), '7');
        E.definirLocalAssuntosEscrita('');
        assert.equal(E.getLocalAssuntosEscrita(), '');
    });

    it('papel do idioma: valor inválido volta a todos', () => {
        E.definirPapelIdiomaEstatisticas('principal');
        assert.equal(E.getPapelIdiomaEstatisticas(), 'principal');
        E.definirPapelIdiomaEstatisticas('terciario');
        assert.equal(E.getPapelIdiomaEstatisticas(), 'todos');
    });
});

describe('tela Local e idioma', () => {
    const graficos = {};
    let consultas;

    beforeEach(() => {
        acervo();
        document.body.innerHTML = `${SECAO}
            <section id="poemas" class="tab-content"><input id="busca-poemas" /></section>
            <section id="prosas" class="tab-content"><input id="busca-prosas" /></section>`;
        Object.keys(graficos).forEach((k) => delete graficos[k]);
        globalThis.Chart = class {
            constructor(canvas, cfg) {
                this.canvas = canvas;
                this.data = cfg.data;
                this.options = cfg.options;
                graficos[canvas.id] = this;
            }
            destroy() {}
            getElementsAtEventForMode() {
                return [{ index: globalThis.Chart.clique }];
            }
            static getChart(canvas) {
                return graficos[canvas.id];
            }
        };
        consultas = [];
        window.abrirAba = () => {};
        window.setFiltroPoemas = (q) => consultas.push(q);
        window.setFiltroProsas = (q) => consultas.push(q);
    });

    const clicar = (canvasId, indice) => {
        globalThis.Chart.clique = indice;
        document.getElementById(canvasId).onclick({});
    };

    it('desenha os quatro gráficos', () => {
        renderLocalIdioma();
        [
            'grafico-local-territorialidade',
            'grafico-local-escrita',
            'grafico-assuntos-escrita',
            'grafico-idiomas',
        ].forEach((id) => assert.ok(graficos[id], id));
        assert.equal(graficos['grafico-local-territorialidade'].data.labels[0], 'Estação Lapa');
        assert.deepEqual(graficos['grafico-idiomas'].data.labels, ['pt-BR', 'Inglês']);
    });

    it('Local com apelido: a barra traz o apelido e o tooltip, o nome completo com o tipo', () => {
        L.editarLocal(db, 6, { apelido: 'Lapa (metrô)' });
        renderLocalIdioma();
        const g = graficos['grafico-local-territorialidade'];
        const i = g.data.labels.indexOf('Lapa (metrô)');
        assert.ok(i >= 0, 'o rótulo da barra é o apelido');
        const title = g.options.plugins.tooltip.callbacks.title;
        assert.equal(title([{ label: 'Lapa (metrô)' }]), 'Estação Lapa (Estação)');
        // quem aparece pelo nome não muda de título
        assert.equal(title([{ label: 'Brasil' }]), 'Brasil');
    });

    it('sem nenhum apelido, o tooltip não ganha título próprio', () => {
        renderLocalIdioma();
        const cb = graficos['grafico-local-territorialidade'].options.plugins.tooltip.callbacks;
        assert.equal(cb.title, undefined);
    });

    it('o seletor de Assuntos por local de escrita põe o nome completo na dica da opção', () => {
        L.editarLocal(db, 8, { apelido: 'Ponta' });
        renderLocalIdioma();
        const html = document.getElementById('painel-local-assuntos-escrita').innerHTML;
        assert.match(html, /title="Ponta da Praia \(Bairro\)"[^>]*>Ponta \(/);
    });

    it('todos os ids que a tela usa existem no index.html', () => {
        const ids = [
            'grafico-local-territorialidade',
            'painel-controles-local-territorialidade',
            'painel-ocultos-local-territorialidade',
            'grafico-local-escrita',
            'painel-controles-local-escrita',
            'painel-ocultos-local-escrita',
            'grafico-assuntos-escrita',
            'painel-local-assuntos-escrita',
            'painel-ocultos-assuntos-escrita',
            'est-assuntos-escrita-contexto',
            'grafico-idiomas',
            'painel-papel-idioma',
            'painel-ocultos-idiomas',
            'est-idiomas-contexto',
        ];
        ids.forEach((id) => assert.ok(SECAO.includes(`id="${id}"`), id));
        assert.ok(HTML.includes(`abrirAba('estatisticas-local-idioma')`));
    });

    it('põe os quatro gráficos numa grade de duas colunas a partir do md, uma no celular', () => {
        const grade = SECAO.match(/<div class="grid ([^"]*)">/);
        assert.ok(grade, 'falta a grade que envolve os cartões');
        assert.match(grade[1], /\bgrid-cols-1\b/);
        assert.match(grade[1], /\bmd:grid-cols-2\b/);
        // Os quatro canvas estão dentro da grade, não fora dela.
        const dentro = SECAO.slice(SECAO.indexOf(grade[0]));
        [
            'grafico-local-territorialidade',
            'grafico-local-escrita',
            'grafico-assuntos-escrita',
            'grafico-idiomas',
        ].forEach((id) => assert.ok(dentro.includes(`id="${id}"`), id));
        // `min-w-0` impede o canvas de esticar a coluna da grade além da tela.
        assert.equal((SECAO.match(/class="min-w-0 bg-white/g) || []).length, 4);
    });

    it('mostra os controles de modo e tipo, com o modo ativo destacado', () => {
        E.definirModoLocalEstatisticas('territorialidade', 'agregado');
        renderLocalIdioma();
        const html = document.getElementById('painel-controles-local-territorialidade').innerHTML;
        assert.match(html, /definirModoLocalEstatisticas\('territorialidade', 'direto'\)/);
        assert.match(html, /Com o que está dentro/);
        assert.match(html, /<option value="">Todos os tipos<\/option>/);
        assert.match(html, /Cidade \(2\)/);
        assert.match(html, /passa do total de textos/);
    });

    it('avisa o tipo ativo e mantém um tipo salvo que ficou sem texto', () => {
        E.definirTipoLocalEstatisticas('escrita', 'Aldeia');
        renderLocalIdioma();
        const html = document.getElementById('painel-controles-local-escrita').innerHTML;
        assert.match(html, /Só Locais do tipo Aldeia/);
        assert.match(html, /<option value="Aldeia" selected(="")?>Aldeia \(0\)<\/option>/);
    });

    it('clicar numa barra de Local abre a busca do modo escolhido', () => {
        renderLocalIdioma();
        const labels = graficos['grafico-local-territorialidade'].data.labels;
        clicar('grafico-local-territorialidade', labels.indexOf('Estação Lapa'));
        assert.equal(consultas.at(-1), 'territorialidadedireta:"Estação Lapa (Estação)"');

        E.definirModoLocalEstatisticas('territorialidade', 'agregado');
        renderLocalIdioma();
        const agreg = graficos['grafico-local-territorialidade'].data.labels;
        clicar('grafico-local-territorialidade', agreg.indexOf('São Paulo (Estado)'));
        assert.equal(consultas.at(-1), 'territorialidade:"São Paulo (Estado)"');
    });

    it('clicar numa barra de escrita usa localescrita', () => {
        E.definirModoLocalEstatisticas('escrita', 'agregado');
        renderLocalIdioma();
        const labels = graficos['grafico-local-escrita'].data.labels;
        clicar('grafico-local-escrita', labels.indexOf('Brasil'));
        assert.equal(consultas.at(-1), 'localescrita:"Brasil (País)"');
    });

    it('clicar num Assunto sem Local limita aos textos com local de escrita', () => {
        renderLocalIdioma();
        const labels = graficos['grafico-assuntos-escrita'].data.labels;
        clicar('grafico-assuntos-escrita', labels.indexOf('Urbano'));
        assert.equal(consultas.at(-1), 'assunto:"Urbano" localescrita:*');
    });

    it('clicar num Assunto com Local junta o Local escolhido', () => {
        E.definirLocalAssuntosEscrita(7);
        renderLocalIdioma();
        assert.match(
            document.getElementById('painel-local-assuntos-escrita').innerHTML,
            /<option value="7" selected(="")?>Santos \(3\)<\/option>/,
        );
        assert.match(
            document.getElementById('est-assuntos-escrita-contexto').textContent,
            /3 textos/,
        );
        const labels = graficos['grafico-assuntos-escrita'].data.labels;
        clicar('grafico-assuntos-escrita', labels.indexOf('Urbano'));
        assert.equal(consultas.at(-1), 'assunto:"Urbano" localescrita:"Santos (Cidade)"');
    });

    it('Local escolhido que sumiu volta a "todos" sem quebrar', () => {
        E.definirLocalAssuntosEscrita(999);
        renderLocalIdioma();
        assert.match(
            document.getElementById('est-assuntos-escrita-contexto').textContent,
            /5 textos/,
        );
    });

    it('Idiomas: avisa que a soma passa do total e abre o prefixo do papel', () => {
        renderLocalIdioma();
        assert.match(
            document.getElementById('est-idiomas-contexto').textContent,
            /5 textos neste recorte\. A soma das barras \(7\) passa do total/,
        );
        clicar('grafico-idiomas', 1);
        assert.equal(consultas.at(-1), 'idioma:"Inglês"');

        E.definirPapelIdiomaEstatisticas('secundario');
        renderLocalIdioma();
        assert.match(
            document.getElementById('painel-papel-idioma').innerHTML,
            /Contando só idiomas com papel: Secundário/,
        );
        clicar('grafico-idiomas', 0);
        assert.equal(consultas.at(-1), 'idiomasecundario:"Inglês"');
    });

    it('acervo sem Local nem idioma mostra os avisos de vazio', () => {
        db.poemas = [{ id: 1, titulo: 'x', ano: 2020 }];
        db.prosas = [];
        db.locais = [];
        renderLocalIdioma();
        assert.match(
            document.getElementById('est-idiomas-contexto').textContent,
            /Nenhum texto com idioma/,
        );
        assert.match(
            document.getElementById('est-assuntos-escrita-contexto').textContent,
            /Nenhum texto com local de escrita/,
        );
        assert.deepEqual(graficos['grafico-local-escrita'].data.labels, []);
    });
});
