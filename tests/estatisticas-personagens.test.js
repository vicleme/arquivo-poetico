import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Fase 11, etapa 7: Estatísticas de Personagem. Textos por Personagem, por
// papel, por centralidade, Personagens por texto, Ecos por Personagem âncora
// e a matriz Personagem × Tema da aba Cruzamentos. O teste mais importante
// confere que cada barra clicável bate com a lista que o clique abre.
const { db } = await import('../js/db.js');
const E = await import('../js/estatisticas.js');
const { filtrarTextos } = await import('../js/utils.js');
const { decorarCamposBusca } = await import('../js/render-listas.js');
const { renderPersonagens } = await import('../js/estatisticas-tela-personagens.js');
const { renderCruzamentos } = await import('../js/estatisticas-tela-cruzamentos.js');

const HTML = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const secao = (id) => HTML.match(new RegExp(`<section id="${id}"[\\s\\S]*?</section>`))[0];
const SECAO = secao('estatisticas-personagens');
const SECAO_CRUZAMENTOS = secao('estatisticas-cruzamentos');

function zerar() {
    localStorage.clear();
    ['livros', 'partes', 'secoes', 'elementos', 'pessoas', 'grupos', 'autores', 'epocas'].forEach(
        (c) => (db[c] = []),
    );
    db.temas = [];
    db.assuntos = [];
}

const vinculo = (personagemId, papeis, centralidade = '') => ({
    personagemId,
    papeis,
    centralidade,
});

const ecoPersonagem = (id, ancoras) => ({
    id,
    tipo: 'Personagem em comum',
    texto: '',
    ...(ancoras ? { ancoras } : {}),
});

function acervo() {
    zerar();
    db.personagens = [
        { id: 1, nome: 'Capitu' },
        { id: 2, nome: 'Bento' },
        { id: 3, nome: 'Escobar' },
        { id: 4, nome: 'Capitú' }, // mesmo nome sem acento: a busca e a barra juntam
    ];
    db.poemas = [
        {
            id: 1,
            titulo: 'A',
            ano: 2020,
            sinalizacoesTema: 'Amor',
            personagens: [
                vinculo(1, ['Voz', 'Aparição'], 'protagonista'),
                vinculo(2, ['Interlocutor']),
            ],
            conceitos: {
                ecos: [
                    ecoPersonagem(2, [
                        { especie: 'personagem', id: 1 },
                        { especie: 'personagem', id: 2 },
                    ]),
                ],
            },
        },
        {
            id: 2,
            titulo: 'B',
            ano: 2020,
            sinalizacoesTema: 'Cidade',
            personagens: [vinculo(2, ['Aparição'], 'secundario'), vinculo(3, ['Menção'])],
        },
        // Alusão sozinha: a centralidade não se aplica, mesmo gravada por engano.
        { id: 3, titulo: 'C', ano: 2020, personagens: [vinculo(1, ['Alusão'], 'protagonista')] },
        { id: 4, titulo: 'D', ano: 2020, personagens: [] },
        // Sem papel nem centralidade ainda.
        {
            id: 5,
            titulo: 'E',
            ano: 2020,
            sinalizacoesTema: 'Amor, Cidade',
            personagens: [vinculo(3, [])],
        },
    ];
    db.prosas = [
        {
            id: 101,
            titulo: 'P',
            ano: 2020,
            sinalizacoesTema: 'Cidade',
            personagens: [vinculo(4, ['Voz'], 'protagonista')],
            conceitos: {
                ecos: [
                    ecoPersonagem(1), // sem âncora
                    ecoPersonagem(2, [{ especie: 'personagem', id: 99 }]), // âncora fora do cadastro
                    { id: 3, tipo: 'Pessoa em comum', texto: '', ancoras: [] }, // outro tipo
                ],
            },
        },
    ];
}

const mapa = (r) => Object.fromEntries(r.labels.map((l, i) => [l, r.data[i]]));
const itens = () => [...db.poemas, ...db.prosas].map((i) => decorarCamposBusca({ ...i }));

describe('agregarPorPersonagem', () => {
    beforeEach(acervo);

    it('conta textos por Personagem em qualquer papel e junta nomes iguais sem acento', () => {
        const r = E.agregarPorPersonagem();
        assert.deepEqual(mapa(r), { Capitu: 3, Bento: 2, Escobar: 2 });
        assert.deepEqual(r.labels, ['Capitu', 'Bento', 'Escobar']); // empate: ordem alfabética
    });

    it('ignora vínculo de Personagem fora do cadastro', () => {
        db.poemas[3].personagens = [vinculo(99, ['Voz'])];
        assert.deepEqual(mapa(E.agregarPorPersonagem()), { Capitu: 3, Bento: 2, Escobar: 2 });
    });

    it('respeita o recorte do corpus (só Prosas)', () => {
        E.definirFiltrosCompartilhados({ tipo: 'prosas' });
        assert.deepEqual(mapa(E.agregarPorPersonagem()), { Capitú: 1 });
    });
});

describe('agregarPersonagensPorPapel', () => {
    beforeEach(acervo);

    it('conta textos por papel e sempre devolve os cinco papéis', () => {
        const r = E.agregarPersonagensPorPapel();
        assert.deepEqual(r.labels, ['Voz', 'Interlocutor', 'Aparição', 'Menção', 'Alusão']);
        assert.deepEqual(mapa(r), { Voz: 2, Interlocutor: 1, Aparição: 2, Menção: 1, Alusão: 1 });
    });

    it('um texto com dois Personagens no mesmo papel conta uma vez', () => {
        db.poemas[0].personagens.push(vinculo(3, ['Voz']));
        assert.equal(mapa(E.agregarPersonagensPorPapel()).Voz, 2);
    });

    it('sem Personagem devolve zeros, não lista vazia', () => {
        db.poemas.forEach((p) => (p.personagens = []));
        db.prosas.forEach((p) => (p.personagens = []));
        assert.deepEqual(E.agregarPersonagensPorPapel().data, [0, 0, 0, 0, 0]);
    });
});

describe('agregarPersonagensPorCentralidade', () => {
    beforeEach(acervo);

    it('separa Indefinido (a preencher) de Só Menção/Alusão', () => {
        const r = E.agregarPersonagensPorCentralidade();
        assert.deepEqual(mapa(r), {
            Protagonista: 2,
            Secundário: 1,
            Indefinido: 2,
            'Só Menção/Alusão': 2,
        });
        assert.equal(r.prefixos[3], null);
    });

    it('Alusão com centralidade gravada por engano conta como Só Menção/Alusão', () => {
        const r = E.agregarPersonagensPorCentralidade();
        // O texto 3 só tem Alusão: não entra em Protagonista, mesmo com o valor gravado.
        assert.equal(r.data[0], 2); // textos 1 e 101
    });
});

describe('distribuicaoPersonagensPorTexto', () => {
    beforeEach(acervo);

    it('cada texto cai numa faixa só e a soma é o total de textos', () => {
        const r = E.distribuicaoPersonagensPorTexto();
        assert.deepEqual(r.labels, ['Nenhum', '1', '2', '3', '4 ou mais']);
        assert.deepEqual(r.data, [1, 3, 2, 0, 0]);
        assert.equal(
            r.data.reduce((a, b) => a + b, 0),
            r.textos,
        );
        assert.equal(r.textos, 6);
    });

    it('dois cadastros de mesmo nome no mesmo texto contam um Personagem', () => {
        db.poemas[3].personagens = [vinculo(1, ['Voz']), vinculo(4, ['Aparição'])];
        const r = E.distribuicaoPersonagensPorTexto();
        assert.equal(r.data[1], 4); // o texto 4 passou de "nenhum" para "1"
        assert.equal(r.data[0], 0);
    });
});

describe('agregarEcosPorPersonagem', () => {
    beforeEach(acervo);

    it('conta Ecos por Personagem âncora e separa o Eco sem âncora', () => {
        const r = E.agregarEcosPorPersonagem();
        assert.deepEqual(mapa(r), { Bento: 1, Capitu: 1 });
        assert.equal(r.ecos, 3); // só os do tipo "Personagem em comum"
        assert.equal(r.semAncora, 2); // sem âncora e com âncora fora do cadastro
    });

    it('um Eco com duas âncoras conta uma vez em cada, então a soma passa dos Ecos ancorados', () => {
        const r = E.agregarEcosPorPersonagem();
        const soma = r.data.reduce((a, b) => a + b, 0);
        assert.equal(soma, 2);
        assert.equal(r.ecos - r.semAncora, 1);
    });

    it('não conta Eco de outro tipo', () => {
        db.poemas[0].conceitos.ecos[0].tipo = 'Pessoa em comum';
        const r = E.agregarEcosPorPersonagem();
        assert.deepEqual(r.labels, []);
        assert.equal(r.ecos, 2);
    });
});

describe('a barra bate com a lista que o clique abre', () => {
    beforeEach(acervo);

    it('Textos por Personagem: personagem:"Nome"', () => {
        const r = E.agregarPorPersonagem();
        r.labels.forEach((nome, i) => {
            assert.equal(filtrarTextos(itens(), `personagem:"${nome}"`).length, r.data[i], nome);
        });
    });

    it('Papéis: prefixo do papel com *', () => {
        const r = E.agregarPersonagensPorPapel();
        r.labels.forEach((papel, i) => {
            const prefixo = E.PREFIXO_BUSCA_PAPEL_PERSONAGEM[papel];
            assert.ok(prefixo, papel);
            assert.equal(filtrarTextos(itens(), `${prefixo}:*`).length, r.data[i], papel);
        });
    });

    it('Centralidade: prefixo da categoria com *, menos "não se aplica"', () => {
        const r = E.agregarPersonagensPorCentralidade();
        r.labels.forEach((rotulo, i) => {
            if (!r.prefixos[i]) return;
            assert.equal(filtrarTextos(itens(), `${r.prefixos[i]}:*`).length, r.data[i], rotulo);
        });
    });
});

describe('Personagem × Tema (Cruzamentos)', () => {
    beforeEach(acervo);

    it('conta textos com o Personagem e o Tema ao mesmo tempo', () => {
        const r = E.coocorrenciaTemasPersonagens({
            temas: ['Amor', 'Cidade'],
            personagens: ['Capitu', 'Bento', 'Escobar'],
        });
        assert.deepEqual(r.temas, ['Amor', 'Cidade']);
        const linha = (nome) => r.valores[r.personagens.indexOf(nome)];
        assert.deepEqual(linha('Escobar'), [1, 2]); // textos 5 (Amor e Cidade) e 2 (Cidade)
        assert.deepEqual(linha('Bento'), [1, 1]);
        assert.deepEqual(linha('Capitu'), [1, 0]); // o texto 3 não tem tema; a prosa é de Capitú
    });

    it('ordena as linhas pelo total, do maior para o menor', () => {
        const r = E.coocorrenciaTemasPersonagens({
            temas: ['Amor', 'Cidade'],
            personagens: ['Capitu', 'Bento', 'Escobar'],
        });
        assert.equal(r.personagens[0], 'Escobar');
    });

    it('um texto com dois cadastros de mesmo nome conta uma vez', () => {
        db.poemas[0].personagens.push(vinculo(4, ['Aparição']));
        const r = E.coocorrenciaTemasPersonagens({ temas: ['Amor'], personagens: [] });
        assert.equal(r.valores[r.personagens.indexOf('Capitu')][0], 1);
    });
});

describe('telas', () => {
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

    it('desenha os cinco gráficos', () => {
        renderPersonagens();
        [
            'grafico-personagens-textos',
            'grafico-personagens-papeis',
            'grafico-personagens-centralidade',
            'grafico-personagens-por-texto',
            'grafico-personagens-ecos',
        ].forEach((id) => assert.ok(graficos[id], id));
        assert.deepEqual(graficos['grafico-personagens-textos'].data.labels, [
            'Capitu',
            'Bento',
            'Escobar',
        ]);
        assert.deepEqual(
            graficos['grafico-personagens-papeis'].data.datasets[0].data,
            [2, 1, 2, 1, 1],
        );
    });

    it('todos os ids que a tela usa existem no index.html', () => {
        [
            'grafico-personagens-textos',
            'painel-ocultos-personagens',
            'est-personagens-contexto',
            'grafico-personagens-papeis',
            'est-personagens-papeis-contexto',
            'grafico-personagens-centralidade',
            'est-personagens-centralidade-contexto',
            'grafico-personagens-por-texto',
            'est-personagens-por-texto-contexto',
            'grafico-personagens-ecos',
            'painel-ocultos-personagens-ecos',
            'est-personagens-ecos-contexto',
        ].forEach((id) => assert.ok(SECAO.includes(`id="${id}"`), id));
    });

    it('clicar numa barra de Personagem abre personagem:"Nome"', () => {
        renderPersonagens();
        clicar('grafico-personagens-textos', 0);
        assert.equal(consultas.at(-1), 'personagem:"Capitu"');
    });

    it('clicar numa barra de papel abre o prefixo do papel', () => {
        renderPersonagens();
        clicar('grafico-personagens-papeis', 0);
        assert.equal(consultas.at(-1), 'personagemvoz:*');
        clicar('grafico-personagens-papeis', 4);
        assert.equal(consultas.at(-1), 'personagemalusao:*');
    });

    it('clicar numa barra de centralidade abre a busca, e "Só Menção/Alusão" não abre nada', () => {
        renderPersonagens();
        clicar('grafico-personagens-centralidade', 2);
        assert.equal(consultas.at(-1), 'personagemsemcentralidade:*');
        const antes = consultas.length;
        clicar('grafico-personagens-centralidade', 3);
        assert.equal(consultas.length, antes);
    });

    it('o contexto dos Ecos explica a soma por âncora e o Eco sem âncora', () => {
        renderPersonagens();
        const texto = document.getElementById('est-personagens-ecos-contexto').textContent;
        assert.match(texto, /3 Ecos "Personagem em comum"/);
        assert.match(texto, /passa do total/);
        assert.match(texto, /2 Ecos estão sem âncora/);
    });

    it('ocultar um Personagem tira a barra, sem mexer nas contagens dos outros', () => {
        E.toggleOcultoItem('personagens', 'Capitu');
        renderPersonagens();
        assert.deepEqual(graficos['grafico-personagens-textos'].data.labels, ['Bento', 'Escobar']);
    });

    it('sem Personagem no recorte, avisa e não quebra', () => {
        db.poemas.forEach((p) => (p.personagens = []));
        db.prosas.forEach((p) => (p.personagens = []));
        renderPersonagens();
        assert.match(
            document.getElementById('est-personagens-contexto').textContent,
            /Nenhum texto deste recorte tem Personagem/,
        );
    });

    it('a aba Cruzamentos desenha a matriz Personagem × tema', () => {
        document.body.innerHTML = SECAO_CRUZAMENTOS;
        document.getElementById('est-coocorrencia-modo').value = 'personagens';
        db.temas = [
            { id: 1, nome: 'Amor', notas: '' },
            { id: 2, nome: 'Cidade', notas: '' },
        ];
        renderCruzamentos();
        const html = document.getElementById('tabela-coocorrencia').innerHTML;
        assert.match(html, /Personagem × tema/);
        assert.match(html, /Escobar/);
        assert.match(html, /textos que possuem simultaneamente o personagem/);
    });
});

describe('menu e despachante', () => {
    it('a aba Personagens está no menu, no HTML e no despachante', () => {
        const ui = readFileSync(new URL('../js/ui.js', import.meta.url), 'utf8');
        assert.match(ui, /id: 'estatisticas-personagens', rotulo: 'Personagens'/);
        assert.ok(HTML.includes('<section id="estatisticas-personagens"'));
        assert.ok(HTML.includes('id="btn-estatisticas-personagens"'));
        const src = readFileSync(new URL('../js/estatisticas.js', import.meta.url), 'utf8');
        assert.ok(src.includes("'estatisticas-personagens'"));
        assert.ok(src.includes('renderPersonagens();'));
    });

    it('o seletor de Cruzamentos oferece Temas × personagens', () => {
        assert.match(
            SECAO_CRUZAMENTOS,
            /<option value="personagens">Temas × personagens<\/option>/,
        );
    });
});
