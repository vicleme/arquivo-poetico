import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Fontes de um Período Histórico: `fontes: [{ autor, obra, ano, nota }]`, o
// mesmo formato das Correntes literárias. A professora de Linguagens perguntou
// a fonte das classificações que o sistema traz por padrão; o cadastro registra
// o que embasa cada recorte, e quem cria um período também pode registrar o
// que consultou. O Período Biográfico não tem fontes.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
document.body.innerHTML = `
    <main>
        <div id="filtros-periodo-periodosHistoricos"></div>
        <div id="contagem-periodos-historicos"></div>
        <div id="lista-periodos-historicos"></div>
    </main>
    ${fs.readFileSync(path.resolve(__dirname, '../modais/modal-periodo-historico.html'), 'utf8')}
`;

const F = await import('../js/fontes-corrente.js');
const P = await import('../js/fontes-periodo-historico.js');
const UI = await import('../js/fontes-periodo-historico-ui.js');
const D = await import('../js/db.js');
const { db } = D;
const { editarPeriodoHistorico, initFormPeriodoHistorico } = await import('../js/forms.js');
const { renderVisualizacaoPeriodoHistoricoHtml } =
    await import('../js/visualizar-periodo-historico.js');
const { renderPeriodosHistoricos } = await import('../js/render-listas.js');
const { prepararNovo } = await import('../js/ui.js');

// Nomes dos períodos de fábrica, lidos do seed real (instalação nova).
const NOMES_DE_FABRICA = D.db.periodosHistoricos.filter((p) => p.embutido).map((p) => p.nome);

describe('catálogo de fábrica dos períodos', () => {
    it('todo período de fábrica tem fonte, e só eles (a lista bate com o seed)', () => {
        assert.equal(NOMES_DE_FABRICA.length, 16);
        assert.deepEqual(
            [...P.nomesDePeriodosComFontesDeFabrica()].sort(),
            [...NOMES_DE_FABRICA].sort(),
        );
        NOMES_DE_FABRICA.forEach((nome) =>
            assert.ok(P.fontesDeFabricaDoPeriodoHistorico(nome).length >= 1, nome),
        );
    });

    it('nome fora do seed não recebe fonte', () => {
        assert.deepEqual(P.fontesDeFabricaDoPeriodoHistorico('Meu período'), []);
    });

    it('nenhuma chave morta: o que o período cita existe, e tudo do catálogo próprio é usado', () => {
        const usadas = P.chavesUsadasNoCatalogoDosPeriodos();
        usadas.forEach((chave) => assert.ok(P.chaveExiste(chave), `chave morta: ${chave}`));
        Object.keys(P.CATALOGO_FONTES_PERIODOS).forEach((chave) =>
            assert.ok(usadas.has(chave), `sem uso no catálogo: ${chave}`),
        );
    });

    it('não repete no catálogo dos períodos o que já está no das Correntes', () => {
        Object.keys(P.CATALOGO_FONTES_PERIODOS).forEach((chave) =>
            assert.equal(F.CATALOGO_FONTES[chave], undefined, `duplicada: ${chave}`),
        );
    });

    it('toda referência tem autor, obra e ano de quatro dígitos que já passou', () => {
        Object.entries(P.CATALOGO_FONTES_PERIODOS).forEach(([chave, f]) => {
            assert.ok(f.autor && f.obra, chave);
            assert.match(f.ano, /^\d{4}$/, chave);
            assert.ok(Number(f.ano) <= 2026, chave);
        });
    });

    it('sem repetir fonte dentro de um período e sem travessão nos textos', () => {
        NOMES_DE_FABRICA.forEach((nome) => {
            const fontes = P.fontesDeFabricaDoPeriodoHistorico(nome);
            assert.equal(F.normalizarFontes(fontes).length, fontes.length, nome);
            fontes.forEach((f) => {
                [f.autor, f.obra, f.ano, f.nota].forEach((t) =>
                    assert.doesNotMatch(t, /[—–]/, `${nome}: travessão`),
                );
            });
        });
    });

    it('devolve cópias: mexer num período não muda o catálogo nem outro período', () => {
        const a = P.fontesDeFabricaDoPeriodoHistorico('Guerra Fria');
        a[0].obra = 'ALTERADA';
        a.push({ autor: 'X', obra: 'Y' });
        const b = P.fontesDeFabricaDoPeriodoHistorico('Guerra Fria');
        assert.notEqual(b[0].obra, 'ALTERADA');
        assert.equal(P.CATALOGO_FONTES_PERIODOS.gaddis.obra, 'The Cold War: A New History');
        assert.ok(b.length < a.length);
    });

    it('referência das Correntes é reaproveitada pela mesma chave (Semana de Arte Moderna)', () => {
        const semana = P.fontesDeFabricaDoPeriodoHistorico('Semana de Arte Moderna');
        const brito = semana.find((f) => /Mário da Silva Brito/.test(f.autor));
        assert.equal(brito.obra, F.CATALOGO_FONTES['mario-brito'].obra);
        assert.equal(brito.ano, F.CATALOGO_FONTES['mario-brito'].ano);
    });

    it('divergência conhecida fica anotada onde importa', () => {
        const nota = (nome, autor) =>
            P.fontesDeFabricaDoPeriodoHistorico(nome).find((f) => autor.test(f.autor))?.nota;
        assert.match(nota('Renascimento', /Huizinga/), /diverge de Burckhardt/);
        assert.match(nota('Guerra Fria', /Gaddis/), /1991/);
        assert.match(nota('Estado Novo (Portugal)', /Rosas/), /1933/);
        assert.match(nota('Ditadura Militar Brasileira', /Aarão Reis/), /1988/);
        assert.match(nota('Nova República', /Fausto/), /Sarney/);
        assert.match(nota('Quarta Revolução Industrial (Indústria 4.0)', /Schwab/), /contestada/);
        assert.match(nota('Primeira Revolução Industrial', /Ashton/), /1760 a 1830/);
    });

    it('as datas oficiais da Covid têm como fonte as declarações da OMS', () => {
        const covid = P.fontesDeFabricaDoPeriodoHistorico('Pandemia de Covid-19');
        assert.equal(covid.filter((f) => /Organização Mundial da Saúde/.test(f.autor)).length, 2);
    });
});

describe('dado: seed, migração, criação e mesclagem', () => {
    it('instalação nova: os períodos de fábrica já nascem com as fontes', () => {
        D.db.periodosHistoricos
            .filter((p) => p.embutido)
            .forEach((p) => {
                assert.deepEqual(p.fontes, P.fontesDeFabricaDoPeriodoHistorico(p.nome), p.nome);
            });
    });

    it('migrarPeriodosHistoricosEmbutidos cria o que falta já com as fontes', () => {
        const lista = [];
        D.migrarPeriodosHistoricosEmbutidos(lista, []);
        assert.equal(lista.length, 16);
        lista.forEach((p) => assert.ok(p.fontes.length >= 1, p.nome));
    });

    it('registro antigo (sem o campo) recebe as fontes de fábrica uma única vez, por nome', () => {
        const lista = [
            { id: 1, nome: 'Guerra Fria' },
            { id: 2, nome: 'Meu período' },
            { id: 3, nome: 'Iluminismo', embutido: true },
            { id: 4, nome: 'Guerra Fria copiada', embutido: false },
            { id: 5, nome: 'Renascimento', embutido: false },
        ];
        D.migrarFontesPeriodosHistoricos(lista);
        assert.deepEqual(lista[0].fontes, P.fontesDeFabricaDoPeriodoHistorico('Guerra Fria'));
        assert.deepEqual(lista[1].fontes, []);
        assert.deepEqual(lista[2].fontes, P.fontesDeFabricaDoPeriodoHistorico('Iluminismo'));
        assert.deepEqual(lista[3].fontes, []);
        assert.deepEqual(lista[4].fontes, []);
    });

    it('a cadeia completa de migrações dá as fontes a um backup antigo, sem mexer no resto', () => {
        const lista = [
            { id: 1, nome: 'Guerra Fria', embutido: true, notas: 'minha nota' },
            { id: 2, nome: 'Meu período', notas: '' },
        ];
        D.migrarDatasPeriodoHistorico(lista);
        D.migrarPeriodosHistoricosEmbutidos(lista, []);
        D.migrarFontesPeriodosHistoricos(lista);
        const guerra = lista.find((p) => p.nome === 'Guerra Fria');
        assert.equal(guerra.notas, 'minha nota');
        assert.deepEqual(guerra.fontes, P.fontesDeFabricaDoPeriodoHistorico('Guerra Fria'));
        assert.deepEqual(lista.find((p) => p.nome === 'Meu período').fontes, []);
    });

    it('nunca sobrescreve: nem fonte da pessoa, nem lista esvaziada de propósito', () => {
        const propria = [{ autor: 'Eu', obra: 'Minhas notas', ano: '2026', nota: '' }];
        const lista = [
            { id: 1, nome: 'Guerra Fria', embutido: true, fontes: propria },
            { id: 2, nome: 'Iluminismo', embutido: true, fontes: [] },
        ];
        D.migrarFontesPeriodosHistoricos(lista);
        D.migrarFontesPeriodosHistoricos(lista);
        assert.deepEqual(lista[0].fontes, propria);
        assert.deepEqual(lista[1].fontes, []);
    });

    it('a migração limpa fonte torta e lista que não é lista', () => {
        const lista = [
            {
                id: 1,
                nome: 'X',
                embutido: false,
                fontes: [null, { autor: ' A ' }, 5, { ano: '1' }],
            },
            { id: 2, nome: 'Y', embutido: false, fontes: 'texto solto' },
        ];
        D.migrarFontesPeriodosHistoricos(lista);
        assert.deepEqual(lista[0].fontes, [{ autor: 'A', obra: '', ano: '', nota: '' }]);
        assert.deepEqual(lista[1].fontes, []);
    });

    it('obterOuCriarPeriodoHistoricoPorNome cria sem fontes', () => {
        db.periodosHistoricos.length = 0;
        const p = D.obterOuCriarPeriodoHistoricoPorNome('Período X');
        assert.deepEqual(p.fontes, []);
    });

    it('mesclar une as fontes sem repetir, e o destino manda', () => {
        const dbRef = {
            poemas: [],
            prosas: [],
            periodosHistoricos: [
                {
                    id: 1,
                    nome: 'Origem',
                    pertenceA: [],
                    fontes: [
                        { autor: 'A', obra: 'X', ano: '', nota: '' },
                        { autor: 'B', obra: 'Y', ano: '', nota: '' },
                    ],
                },
                {
                    id: 2,
                    nome: 'Destino',
                    pertenceA: [],
                    fontes: [{ autor: 'A', obra: 'X', ano: '', nota: 'minha' }],
                },
            ],
        };
        D.mesclarPeriodosHistoricos(dbRef, 1, 2);
        const destino = dbRef.periodosHistoricos.find((p) => p.id === 2);
        assert.deepEqual(
            destino.fontes.map((f) => [f.autor, f.nota]),
            [
                ['A', 'minha'],
                ['B', ''],
            ],
        );
    });

    it('mesclar período sem o campo (registro antigo) não quebra', () => {
        const dbRef = {
            poemas: [],
            prosas: [],
            periodosHistoricos: [
                { id: 1, nome: 'Origem', pertenceA: [] },
                { id: 2, nome: 'Destino', pertenceA: [], fontes: [{ autor: 'A' }] },
            ],
        };
        D.mesclarPeriodosHistoricos(dbRef, 1, 2);
        assert.equal(dbRef.periodosHistoricos[0].fontes.length, 1);
    });
});

describe('modal: seção Fontes', () => {
    const linhas = () => [...document.querySelectorAll('#ph-fontes-lista [data-fonte-linha]')];
    const preencher = (linha, valores) =>
        Object.entries(valores).forEach(([campo, v]) => {
            linha.querySelector(`[data-campo-fonte="${campo}"]`).value = v;
        });

    beforeEach(() => {
        db.periodosHistoricos = [
            {
                id: 7,
                nome: 'Guerra Fria',
                embutido: true,
                notas: 'n',
                regiao: ['Internacional'],
                inicio: { ano: 1947 },
                fim: { ano: 1991 },
                pertenceA: [],
                fontes: [
                    {
                        autor: 'John Lewis Gaddis',
                        obra: 'The Cold War',
                        ano: '2005',
                        nota: 'cap. 1',
                    },
                    {
                        autor: 'Odd Arne Westad',
                        obra: 'The Global Cold War',
                        ano: '2005',
                        nota: '',
                    },
                ],
            },
            { id: 8, nome: 'Sem fonte', pertenceA: [], fontes: [] },
        ];
        db.poemas = [];
        db.prosas = [];
    });

    it('editar carrega uma linha por fonte, com os quatro campos', async () => {
        await editarPeriodoHistorico(7);
        assert.equal(linhas().length, 2);
        const valor = (c) => linhas()[0].querySelector(`[data-campo-fonte="${c}"]`).value;
        assert.equal(valor('autor'), 'John Lewis Gaddis');
        assert.equal(valor('obra'), 'The Cold War');
        assert.equal(valor('ano'), '2005');
        assert.equal(valor('nota'), 'cap. 1');
        assert.equal(document.getElementById('ph-fontes-vazio').classList.contains('hidden'), true);
    });

    it('sem fonte: lista vazia e o aviso aparece', async () => {
        await editarPeriodoHistorico(8);
        assert.equal(linhas().length, 0);
        assert.equal(
            document.getElementById('ph-fontes-vazio').classList.contains('hidden'),
            false,
        );
    });

    it('registro antigo sem o campo abre sem fontes e sem erro', async () => {
        delete db.periodosHistoricos[1].fontes;
        await editarPeriodoHistorico(8);
        assert.equal(linhas().length, 0);
    });

    it('adicionar cria linha em branco com o foco no Autor; remover tira só aquela', async () => {
        await editarPeriodoHistorico(8);
        UI.adicionarFontePeriodoHistorico();
        UI.adicionarFontePeriodoHistorico();
        assert.equal(linhas().length, 2);
        assert.equal(document.getElementById('ph-fontes-vazio').classList.contains('hidden'), true);
        preencher(linhas()[1], { autor: 'Segunda' });
        UI.removerFontePeriodoHistorico(linhas()[0].querySelector('button'));
        assert.equal(linhas().length, 1);
        assert.equal(linhas()[0].querySelector('[data-campo-fonte="autor"]').value, 'Segunda');
    });

    it('o botão e o remover usam handlers do window (wiring)', () => {
        assert.match(
            document.getElementById('ph-fontes-adicionar').getAttribute('onclick'),
            /adicionarFontePeriodoHistorico\(\)/,
        );
        UI.adicionarFontePeriodoHistorico();
        assert.match(
            linhas()[0].querySelector('button').getAttribute('onclick'),
            /removerFontePeriodoHistorico\(this\)/,
        );
    });

    it('o modal é estreito: as linhas ficam em uma coluna só (sem md:grid-cols-6)', () => {
        UI.adicionarFontePeriodoHistorico();
        assert.doesNotMatch(linhas()[0].className, /md:grid-cols-6/);
        assert.equal(linhas()[0].querySelector('[class*="md:col-span"]'), null);
    });

    it('salvar grava as fontes, descarta linha vazia e repetida, e preserva o resto', async () => {
        initFormPeriodoHistorico();
        await editarPeriodoHistorico(7);
        UI.adicionarFontePeriodoHistorico(); // fica vazia: some ao salvar
        UI.adicionarFontePeriodoHistorico();
        preencher(linhas()[3], { autor: ' Eric Hobsbawm ', obra: 'Era dos extremos', ano: '1994' });
        UI.adicionarFontePeriodoHistorico();
        preencher(linhas()[4], { autor: 'eric hobsbawm', obra: 'ERA DOS EXTREMOS' }); // repetida
        preencher(linhas()[0], { nota: 'cap. 1, p. 40' });
        document.getElementById('form-periodo-historico').requestSubmit();
        const p = db.periodosHistoricos.find((x) => x.id === 7);
        assert.deepEqual(
            p.fontes.map((f) => [f.autor, f.obra, f.ano, f.nota]),
            [
                ['John Lewis Gaddis', 'The Cold War', '2005', 'cap. 1, p. 40'],
                ['Odd Arne Westad', 'The Global Cold War', '2005', ''],
                ['Eric Hobsbawm', 'Era dos extremos', '1994', ''],
            ],
        );
        // o objeto é substituído por inteiro: nada do resto pode se perder
        assert.equal(p.nome, 'Guerra Fria');
        assert.equal(p.embutido, true);
        assert.deepEqual(p.regiao, ['Internacional']);
        assert.equal(p.inicio.ano, 1947);
    });

    it('remover todas as linhas e salvar deixa o período sem fontes (e a migração não as devolve)', async () => {
        initFormPeriodoHistorico();
        await editarPeriodoHistorico(7);
        UI.resetFontesPeriodoHistorico();
        document.getElementById('form-periodo-historico').requestSubmit();
        const p = db.periodosHistoricos.find((x) => x.id === 7);
        assert.deepEqual(p.fontes, []);
        D.migrarFontesPeriodosHistoricos(db.periodosHistoricos);
        assert.deepEqual(p.fontes, []);
    });

    it('período novo: a lista nasce vazia mesmo depois de editar um com fontes', async () => {
        initFormPeriodoHistorico();
        await editarPeriodoHistorico(7);
        assert.equal(linhas().length, 2);
        await prepararNovo('periodo-historico');
        assert.equal(linhas().length, 0);
        document.getElementById('ph-nome').value = 'Período novo';
        document.getElementById('form-periodo-historico').requestSubmit();
        const novo = db.periodosHistoricos.find((x) => x.nome === 'Período novo');
        assert.deepEqual(novo.fontes, []);
    });

    it('o HTML escapa o que a pessoa digitou (nada vira marcação)', async () => {
        db.periodosHistoricos[1].fontes = [
            { autor: '<img src=x onerror=1>', obra: '"aspas" & cia', ano: '', nota: '' },
        ];
        await editarPeriodoHistorico(8);
        assert.equal(document.querySelector('#ph-fontes-lista img'), null);
        assert.equal(UI.lerFontesPeriodoHistorico()[0].autor, '<img src=x onerror=1>');
        const html = renderVisualizacaoPeriodoHistoricoHtml(db.periodosHistoricos[1]);
        assert.doesNotMatch(html, /<img/);
    });
});

describe('Visualização e cartão', () => {
    it('Ver mostra a seção Fontes com a contagem, autor, obra, ano e a nota; sem fonte, sem seção', () => {
        const com = renderVisualizacaoPeriodoHistoricoHtml({
            nome: 'X',
            fontes: [
                { autor: 'Eric Hobsbawm', obra: 'Era dos extremos', ano: '1994', nota: 'cap. 8' },
                { autor: 'B', obra: 'Y', ano: '', nota: '' },
            ],
        });
        assert.match(com, /Fontes \(2\)/);
        assert.match(com, /Eric Hobsbawm\. Era dos extremos \(1994\)\./);
        assert.match(com, /cap\. 8/);
        const sem = renderVisualizacaoPeriodoHistoricoHtml({ nome: 'X', fontes: [] });
        assert.doesNotMatch(sem, /Fontes/);
        assert.doesNotMatch(renderVisualizacaoPeriodoHistoricoHtml({ nome: 'X' }), /Fontes/);
    });

    it('o cartão diz quantas fontes o período tem, ou que não tem nenhuma', () => {
        db.poemas = [];
        db.prosas = [];
        db.periodosHistoricos = [
            { id: 1, nome: 'Com uma', pertenceA: [], fontes: [{ autor: 'A', obra: 'B' }] },
            { id: 2, nome: 'Com duas', pertenceA: [], fontes: [{ autor: 'A' }, { autor: 'B' }] },
            { id: 3, nome: 'Sem nada', pertenceA: [], fontes: [] },
            { id: 4, nome: 'Registro antigo', pertenceA: [] },
        ];
        renderPeriodosHistoricos();
        const texto = document.getElementById('lista-periodos-historicos').textContent;
        assert.match(texto, /1 fonte(?!s)/);
        assert.match(texto, /2 fontes/);
        assert.equal((texto.match(/sem fontes/g) || []).length, 2);
    });
});

describe('Período Biográfico fica de fora', () => {
    it('as épocas não ganham o campo fontes', () => {
        (D.db.epocas || []).forEach((e) => assert.equal('fontes' in e, false));
    });
});
