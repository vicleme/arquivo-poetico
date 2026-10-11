import './helpers/dom-real.js';

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// Papel do Assunto no texto. Decisão do Victor: se um texto elenca um Tema
// como principal ou secundário, os Assuntos desse Tema são puxados com o
// mesmo papel por padrão, mas a pessoa pode fixar outro papel para um
// Assunto naquele texto (Tema principal com Assunto secundário, ou o
// contrário). O texto guarda só as sobrescritas (`assuntosPapel`).

const { db } = await import('../js/db.js');
const U = await import('../js/utils.js');
const E = await import('../js/editor.js');
const { temasParaSalvar } = await import('../js/forms.js');
const { badgesTemas, badgesAssuntos, badgesEtiquetasPorCategoria } =
    await import('../js/celulas-tabela.js');
const { DEFINICAO_COLUNAS } = await import('../js/colunas.js');
const { colunasTexto } = await import('../js/exportar-csv.js');
const { itemParaMarkdown } = await import('../js/exportar-md.js');
const { renderVisualizacaoHtml } = await import('../js/visualizar.js');
const { montarRegistro } = await import('../js/exportar.js');
const { aplicarImportacaoAditiva, classificarImportacaoAditiva } =
    await import('../js/importar-aditivo.js');

const TEMAS = [
    { id: 1, nome: 'Amor', notas: '' },
    { id: 2, nome: 'Perda', notas: '' },
    { id: 3, nome: 'Brasil', notas: '' },
];
const ASSUNTOS = [
    { id: 10, nome: 'Vida emocional', notas: '', temaIds: [1, 2] },
    { id: 11, nome: 'Sociedade', notas: '', temaIds: [3] },
];

function texto(temas, assuntosPapel) {
    const item = { id: 7, titulo: 'T', temas };
    if (assuntosPapel) item.assuntosPapel = assuntosPapel;
    return item;
}
const papeisPorNome = (lista) => Object.fromEntries(lista.map((e) => [e.nome, e.papel]));

beforeEach(() => {
    db.temas = structuredClone(TEMAS);
    db.assuntos = structuredClone(ASSUNTOS);
    db.pessoas = [];
    db.grupos = [];
    db.autores = [];
    db.livros = [];
});

describe('papel automático do Assunto (herdado dos Temas)', () => {
    it('é o papel mais forte entre os Temas do texto que trazem o Assunto', () => {
        const t = texto([
            { temaId: 1, papel: 'secundario' },
            { temaId: 2, papel: 'principal' },
            { temaId: 3, papel: '' },
        ]);
        const r = U.assuntosComPapel(t, db.assuntos, db.temas);
        assert.deepEqual(papeisPorNome(r), { 'Vida emocional': 'principal', Sociedade: '' });
        assert.ok(r.every((e) => e.fixado === false));
    });

    it('principal > secundário > sem papel, mesmo empatando o cadastro', () => {
        assert.equal(U.papelMaisForte(['', 'secundario']), 'secundario');
        assert.equal(U.papelMaisForte(['secundario', 'principal', '']), 'principal');
        assert.equal(U.papelMaisForte([]), '');
    });

    it('Assunto sem nenhum Tema no texto não aparece; Assunto nunca fica solto', () => {
        const t = texto([{ temaId: 3, papel: 'principal' }]);
        assert.deepEqual(
            U.assuntosComPapel(t, db.assuntos, db.temas).map((e) => e.nome),
            ['Sociedade'],
        );
    });

    it('ordena principal → secundário → sem papel (dentro do papel, ordem do cadastro)', () => {
        const t = texto([
            { temaId: 3, papel: 'principal' },
            { temaId: 1, papel: 'secundario' },
        ]);
        assert.deepEqual(
            U.assuntosComPapel(t, db.assuntos, db.temas).map((e) => e.nome),
            ['Sociedade', 'Vida emocional'],
        );
    });

    it('bate com assuntosDoTexto (mesmos Assuntos, só acrescenta o papel)', () => {
        const t = {
            ...texto([
                { temaId: 1, papel: 'principal' },
                { temaId: 3, papel: 'secundario' },
            ]),
            sinalizacoesTema: 'Amor, Brasil',
        };
        const comPapel = U.assuntosComPapel(t, db.assuntos, db.temas).map((e) => e.nome);
        const semPapel = U.assuntosDoTexto(t, db.assuntos, db.temas).map((a) => a.nome);
        assert.deepEqual([...comPapel].sort(), [...semPapel].sort());
    });

    it('texto antigo (só o espelho, sem `temas`) funciona, todos sem papel', () => {
        const antigo = { id: 1, titulo: 'X', sinalizacoesTema: 'Amor' };
        const r = U.assuntosComPapel(antigo, db.assuntos, db.temas);
        assert.deepEqual(papeisPorNome(r), { 'Vida emocional': '' });
    });
});

describe('sobrescrita do papel do Assunto (o usuário manda)', () => {
    it('Tema principal com Assunto secundário', () => {
        const t = texto(
            [{ temaId: 1, papel: 'principal' }],
            [{ assuntoId: 10, papel: 'secundario' }],
        );
        const [a] = U.assuntosComPapel(t, db.assuntos, db.temas);
        assert.equal(a.papelAuto, 'principal');
        assert.equal(a.papel, 'secundario');
        assert.equal(a.fixado, true);
    });

    it('Tema secundário com Assunto principal', () => {
        const t = texto(
            [{ temaId: 3, papel: 'secundario' }],
            [{ assuntoId: 11, papel: 'principal' }],
        );
        const [a] = U.assuntosComPapel(t, db.assuntos, db.temas);
        assert.deepEqual([a.papelAuto, a.papel, a.fixado], ['secundario', 'principal', true]);
    });

    it('"sem papel definido" fixado de propósito vale (não confunde com automático)', () => {
        const t = texto([{ temaId: 1, papel: 'principal' }], [{ assuntoId: 10, papel: '' }]);
        const [a] = U.assuntosComPapel(t, db.assuntos, db.temas);
        assert.deepEqual([a.papelAuto, a.papel, a.fixado], ['principal', '', true]);
    });

    it('fixado continua fixado se o papel do Tema mudar depois', () => {
        const t = texto(
            [{ temaId: 1, papel: 'principal' }],
            [{ assuntoId: 10, papel: 'secundario' }],
        );
        t.temas[0].papel = '';
        const [a] = U.assuntosComPapel(t, db.assuntos, db.temas);
        assert.deepEqual([a.papelAuto, a.papel], ['', 'secundario']);
    });

    it('sobrescrita de Assunto excluído (órfã) é ignorada', () => {
        const t = texto(
            [{ temaId: 1, papel: 'principal' }],
            [{ assuntoId: 999, papel: 'secundario' }],
        );
        const r = U.assuntosComPapel(t, db.assuntos, db.temas);
        assert.deepEqual(papeisPorNome(r), { 'Vida emocional': 'principal' });
    });

    it('podar mantém só as fixadas de Assuntos que ainda se aplicam', () => {
        const entradas = [{ nome: 'Amor', papel: 'principal' }];
        const sobre = [
            { assuntoId: '10', papel: 'secundario' },
            { assuntoId: '11', papel: 'principal' }, // Tema Brasil saiu do texto
            { assuntoId: '999', papel: '' }, // Assunto excluído
        ];
        assert.deepEqual(U.podarSobrescritasAssunto(entradas, sobre, db.assuntos, db.temas), [
            { assuntoId: 10, papel: 'secundario' },
        ]);
    });

    it('texto e nomes por papel usam o papel efetivo', () => {
        const t = texto(
            [
                { temaId: 1, papel: 'principal' },
                { temaId: 3, papel: '' },
            ],
            [{ assuntoId: 10, papel: 'secundario' }],
        );
        assert.equal(
            U.textoAssuntosComPapel(t, db.assuntos, db.temas),
            'Vida emocional (secundário), Sociedade',
        );
        assert.deepEqual(U.nomesAssuntosPorPapel(t, db.assuntos, db.temas, 'principal'), []);
        assert.deepEqual(U.nomesAssuntosPorPapel(t, db.assuntos, db.temas, 'secundario'), [
            'Vida emocional',
        ]);
        assert.deepEqual(U.nomesAssuntosPorPapel(t, db.assuntos, db.temas, ''), ['Sociedade']);
    });
});

describe('editor: papel do Assunto no modal (DOM real)', () => {
    const $ = (id) => document.getElementById(id);
    const opcoes = (sel) => [...sel.options].map((o) => o.value);
    const selecionado = (sel) => sel.value;

    beforeEach(() => {
        document.body.innerHTML = '<div id="p-temas-corpo"></div><div id="pr-temas-corpo"></div>';
        E.renderTemasPoema();
        E.renderTemasProsa();
        E.resetTemasTexto('poemas');
        E.resetTemasTexto('prosas');
    });

    function selectDoAssunto(nome) {
        const linha = [...$('p-temas-assuntos').children].find((el) =>
            el.textContent.includes(nome),
        );
        return linha.querySelector('select');
    }

    it('cada Assunto ganha um seletor: Automático (papel herdado), os três papéis e "não se aplica"', () => {
        $('p-tema-papel').value = 'principal';
        $('p-tema-input').value = 'Amor';
        E.adicionarTemaTexto('poemas');
        const sel = selectDoAssunto('Vida emocional');
        assert.deepEqual(opcoes(sel), ['auto', '', 'principal', 'secundario', 'excluir']);
        assert.equal(selecionado(sel), 'auto');
        assert.match(sel.options[0].textContent, /Automático \(Principal\)/);
    });

    it('fixar um papel grava a sobrescrita e marca o Assunto como (fixado)', () => {
        E.adicionarTemaTexto('poemas', 'Amor');
        E.mudarPapelAssuntoTexto('poemas', '10', 'secundario');
        assert.deepEqual(E.obterAssuntosPapelTexto('poemas'), [
            { assuntoId: '10', papel: 'secundario' },
        ]);
        assert.match($('p-temas-assuntos').textContent, /\(fixado\)/);
        assert.equal(selecionado(selectDoAssunto('Vida emocional')), 'secundario');
    });

    it('voltar a "auto" remove a sobrescrita e o Assunto volta a seguir o Tema', () => {
        E.adicionarTemaTexto('poemas', 'Amor');
        E.mudarPapelAssuntoTexto('poemas', '10', 'secundario');
        E.mudarPapelAssuntoTexto('poemas', '10', 'auto');
        assert.deepEqual(E.obterAssuntosPapelTexto('poemas'), []);
        assert.doesNotMatch($('p-temas-assuntos').textContent, /\(fixado\)/);
    });

    it('mudar o papel do Tema muda o automático do Assunto', () => {
        E.adicionarTemaTexto('poemas', 'Amor');
        assert.match(selectDoAssunto('Vida emocional').options[0].textContent, /Indefinido/);
        E.mudarPapelTemaTexto('poemas', 0, 'principal');
        assert.match(selectDoAssunto('Vida emocional').options[0].textContent, /Principal/);
    });

    it('abrir um texto com papel fixado carrega a sobrescrita; abrir outro a limpa', () => {
        E.carregarTemasTexto(
            'poemas',
            texto([{ temaId: 1, papel: 'principal' }], [{ assuntoId: 10, papel: 'secundario' }]),
        );
        assert.equal(selecionado(selectDoAssunto('Vida emocional')), 'secundario');
        E.carregarTemasTexto('poemas', texto([{ temaId: 1, papel: 'principal' }]));
        assert.equal(selecionado(selectDoAssunto('Vida emocional')), 'auto');
    });

    it('poema e prosa têm estados separados', () => {
        E.adicionarTemaTexto('poemas', 'Amor');
        E.mudarPapelAssuntoTexto('poemas', '10', 'principal');
        assert.deepEqual(E.obterAssuntosPapelTexto('prosas'), []);
    });

    it('o campo oculto (rastreio de alterações) muda quando o papel do Assunto muda', () => {
        E.adicionarTemaTexto('poemas', 'Amor');
        const antes = $('p-temas-json').value;
        E.mudarPapelAssuntoTexto('poemas', '10', 'principal');
        assert.notEqual($('p-temas-json').value, antes);
    });

    it('layout: campo do Tema em linha própria, sem ficar espremido pelo select', () => {
        const input = $('p-tema-input');
        const papel = $('p-tema-papel');
        assert.ok(input && papel);
        assert.ok(!input.parentElement.contains(papel), 'input e select em linhas diferentes');
        assert.ok(papel.classList.contains('w-auto'));
        assert.ok(papel.classList.contains('mb-0'));
    });
});

describe('salvar: temasParaSalvar grava só as sobrescritas que valem', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="p-temas-corpo"></div><div id="pr-temas-corpo"></div>';
        E.renderTemasPoema();
        E.renderTemasProsa();
        E.resetTemasTexto('poemas');
        E.resetTemasTexto('prosas');
    });

    it('grava Tema principal + Assunto secundário', () => {
        E.adicionarTemaTexto('poemas', 'Amor');
        E.mudarPapelTemaTexto('poemas', 0, 'principal');
        E.mudarPapelAssuntoTexto('poemas', '10', 'secundario');
        const r = temasParaSalvar('poemas');
        assert.deepEqual(r.temas, [{ temaId: 1, papel: 'principal' }]);
        assert.deepEqual(r.assuntosPapel, [{ assuntoId: 10, papel: 'secundario' }]);
    });

    it('sem sobrescrita grava lista vazia (papel segue os Temas)', () => {
        E.adicionarTemaTexto('poemas', 'Amor');
        assert.deepEqual(temasParaSalvar('poemas').assuntosPapel, []);
    });

    it('tirar o Tema descarta a sobrescrita do Assunto que ele trazia', () => {
        E.adicionarTemaTexto('poemas', 'Amor');
        E.mudarPapelAssuntoTexto('poemas', '10', 'secundario');
        E.removerTemaTexto('poemas', 0);
        assert.deepEqual(temasParaSalvar('poemas').assuntosPapel, []);
    });

    it('outro Tema do mesmo Assunto mantém a sobrescrita', () => {
        E.adicionarTemaTexto('poemas', 'Amor, Perda');
        E.mudarPapelAssuntoTexto('poemas', '10', 'principal');
        E.removerTemaTexto('poemas', 0);
        assert.deepEqual(temasParaSalvar('poemas').assuntosPapel, [
            { assuntoId: 10, papel: 'principal' },
        ]);
    });
});

describe('tabela: coluna Tema e papel na coluna Assunto', () => {
    it('existe a coluna Tema (Poemas e Prosas), desligada, entre Etiquetas e Assunto', () => {
        for (const tabela of ['poemas', 'prosas']) {
            const chaves = DEFINICAO_COLUNAS[tabela].map((c) => c.key);
            const i = chaves.indexOf('temas');
            assert.ok(i > 0, `${tabela} tem a coluna temas`);
            assert.equal(chaves[i - 1], 'etiquetas');
            assert.equal(chaves[i + 1], 'assuntos');
            assert.equal(DEFINICAO_COLUNAS[tabela][i].default, false);
        }
    });

    it('badgesTemas mostra ★ (principal) e ☆ (secundário); sem Tema, traço', () => {
        const html = badgesTemas(
            texto([
                { temaId: 1, papel: 'principal' },
                { temaId: 2, papel: 'secundario' },
                { temaId: 3, papel: '' },
            ]),
        );
        assert.match(html, /Amor[\s\S]*★/);
        assert.match(html, /Perda[\s\S]*☆/);
        assert.match(html, /title="Amor \(principal\)"/);
        assert.match(html, /title="Brasil"/);
        assert.match(badgesTemas({ id: 1, temas: [] }), /—/);
    });

    it('badgesAssuntos mostra o papel efetivo e avisa quando foi fixado', () => {
        const html = badgesAssuntos(
            texto(
                [
                    { temaId: 1, papel: 'principal' },
                    { temaId: 3, papel: 'secundario' },
                ],
                [{ assuntoId: 10, papel: 'secundario' }],
            ),
        );
        assert.match(html, /title="Vida emocional \(secundário\) — papel fixado neste texto"/);
        assert.match(html, /title="Sociedade \(secundário\)"/);
        assert.match(badgesAssuntos({ id: 1, titulo: 'x' }), /—/);
    });

    it('Etiquetas na tabela não repete o Tema (semTema), mas o resto continua', () => {
        const item = {
            ...texto([{ temaId: 1, papel: 'principal' }]),
            sinalizacoesTema: 'Amor',
            sinalizacoesTom: 'Melancólico',
        };
        const com = badgesEtiquetasPorCategoria(item);
        const sem = badgesEtiquetasPorCategoria(item, { semTema: true });
        assert.match(com, /Amor/);
        assert.doesNotMatch(sem, /Amor/);
        assert.match(sem, /Melancólico/);
    });
});

describe('saídas: .md, Visualização, CSV, JSON e importação', () => {
    const item = {
        ...texto(
            [
                { temaId: 1, papel: 'principal' },
                { temaId: 3, papel: 'secundario' },
            ],
            [{ assuntoId: 10, papel: 'secundario' }],
        ),
        sinalizacoesTema: 'Amor, Brasil',
        texto: 'corpo',
    };

    it('.md: linha Assunto com o papel', () => {
        assert.match(
            itemParaMarkdown(item, 1),
            /Assunto[^\n]*Vida emocional \(secundário\), Sociedade \(secundário\)/,
        );
    });

    it('Visualização: linha Assunto com o papel', () => {
        assert.match(renderVisualizacaoHtml(item), /Vida emocional \(secundário\)/);
    });

    it('CSV: assunto_principal e assunto_secundario, logo após `assuntos`', () => {
        const colunas = colunasTexto('poema');
        const cab = colunas.map((c) => c.cabecalho);
        const i = cab.indexOf('assuntos');
        assert.deepEqual(cab.slice(i, i + 3), [
            'assuntos',
            'assunto_principal',
            'assunto_secundario',
        ]);
        const ctx = { banco: { assuntos: db.assuntos, temas: db.temas } };
        const valor = (nome) => colunas.find((c) => c.cabecalho === nome).valor(item, ctx);
        assert.equal(valor('assunto_principal'), '');
        assert.equal(valor('assunto_secundario'), 'Vida emocional | Sociedade');
    });

    it('JSON exportado leva o nome do Assunto junto (o id não vale em outro acervo)', () => {
        const reg = montarRegistro('poema', item);
        assert.deepEqual(reg.assuntosPapel, [
            { assuntoId: 10, papel: 'secundario', nome: 'Vida emocional' },
        ]);
    });

    describe('importação aditiva', () => {
        const registro = () => ({
            id: 42,
            tipo: 'poema',
            titulo: 'Poema Importado',
            texto: 'x',
            pessoas: [],
            autoria: [],
            gruposDiretosResolvidos: [],
            livrosResolvidos: [],
            contexto: { livro: null, parte: null, secao: null },
            temas: [{ temaId: 900, papel: 'principal', nome: 'Amor' }],
            assuntosPapel: [
                { assuntoId: 555, papel: 'secundario', nome: 'Vida Emocional' },
                { assuntoId: 556, papel: 'principal', nome: 'Assunto que não existe aqui' },
            ],
        });
        const dbDestino = () => ({
            poemas: [],
            prosas: [],
            pessoas: [],
            grupos: [],
            autores: [],
            epocas: [],
            periodosHistoricos: [],
            livros: [],
            escansoes: [],
            estruturasTextuais: [],
            temas: [{ id: 1, nome: 'Amor', notas: '' }],
            assuntos: [{ id: 77, nome: 'Vida emocional', notas: '', temaIds: [1] }],
        });
        const deps = () => ({
            tirarSnapshotSeNecessario: mock.fn(async () => true),
            save: mock.fn(() => {}),
        });

        it('casa o Assunto pelo nome (ignora caixa/acento) e descarta o que não existe', async () => {
            const destino = dbDestino();
            const payload = { itens: [registro()] };
            const relatorio = classificarImportacaoAditiva(payload, destino);
            const r = await aplicarImportacaoAditiva(payload, relatorio, destino, deps());
            assert.equal(r.sucesso, true);
            assert.deepEqual(destino.poemas[0].assuntosPapel, [
                { assuntoId: 77, papel: 'secundario' },
            ]);
        });

        it('JSON antigo (sem assuntosPapel) importa com lista vazia', async () => {
            const destino = dbDestino();
            const antigo = registro();
            delete antigo.assuntosPapel;
            const payload = { itens: [antigo] };
            const relatorio = classificarImportacaoAditiva(payload, destino);
            await aplicarImportacaoAditiva(payload, relatorio, destino, deps());
            assert.deepEqual(destino.poemas[0].assuntosPapel, []);
        });
    });
});

describe('editor: cada item em duas linhas (nome, depois o seletor)', () => {
    const $ = (id) => document.getElementById(id);

    beforeEach(() => {
        document.body.innerHTML = '<div id="p-temas-corpo"></div>';
        E.renderTemasPoema();
        E.resetTemasTexto('poemas');
    });

    it('Tema: nome do Tema num elemento e o select de papel em outra linha', () => {
        E.adicionarTemaTexto('poemas', 'Amor');
        const linha = $('p-temas-container').children[0];
        const select = linha.querySelector('select');
        const nome = [...linha.children].find((el) => el.textContent.trim() === 'Amor');
        assert.ok(nome && select);
        assert.ok(!nome.contains(select));
        assert.notEqual(nome, select.parentElement, 'select fica em outra linha');
        assert.match(select.options[0].textContent, /Indefinido/);
    });

    it('Assunto: "(fixado)" vem depois do select, não ao lado do nome', () => {
        E.adicionarTemaTexto('poemas', 'Amor');
        E.mudarPapelAssuntoTexto('poemas', '10', 'secundario');
        const linha = $('p-temas-assuntos').children[0];
        const filhos = [...linha.children];
        const iSelect = filhos.findIndex((el) => el.tagName === 'SELECT');
        const iFixado = filhos.findIndex((el) => el.textContent.includes('(fixado)'));
        const iNome = filhos.findIndex((el) => el.textContent.includes('Vida emocional'));
        assert.ok(iNome < iSelect && iSelect < iFixado);
    });

    it('rótulos: "Indefinido" no lugar de "Sem papel definido"', () => {
        E.adicionarTemaTexto('poemas', 'Amor');
        const html = $('p-temas-corpo').innerHTML;
        assert.doesNotMatch(html, /Sem papel definido/);
        assert.match($('p-temas-assuntos').innerHTML, /Automático \(Indefinido\)/);
    });
});
