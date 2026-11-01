// dom-real.js: as saídas (CSV, .md, badges, Estatísticas) puxam a cadeia de imports com DOM.
import './helpers/dom-real.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { nomesDosTemas } from './helpers/temas-do-texto.js';

// Fase 2 (aposentar o espelho `sinalizacoesTema`), Etapa 0: teste de
// caracterização. Trava o resultado ATUAL de cada saída que lê os Temas de um
// texto, para as etapas 1 a 4 provarem que "nada mudou". Só é editado na
// Etapa 5 (quando o campo deixa de existir): ali saem as afirmações sobre o
// campo e ficam as sobre as saídas.
const { db } = await import('../js/db.js');
const U = await import('../js/utils.js');
const T = await import('../js/temas.js');
const { badgesEtiquetasPorCategoria } = await import('../js/celulas-tabela.js');
const { montarRegistro } = await import('../js/exportar.js');
const { gerarCsvTextos } = await import('../js/exportar-csv.js');
const { gerarMarkdownItem } = await import('../js/exportar-md.js');
const E = await import('../js/estatisticas-dados.js');

// Leitor de CSV mínimo (RFC 4180), só para pegar uma coluna pelo cabeçalho.
function lerCsv(texto) {
    const limpo = texto.replace(/^\uFEFF/, '');
    const linhas = [];
    let linha = [];
    let celula = '';
    let aspas = false;
    for (let i = 0; i < limpo.length; i++) {
        const c = limpo[i];
        if (aspas) {
            if (c === '"' && limpo[i + 1] === '"') {
                celula += '"';
                i++;
            } else if (c === '"') aspas = false;
            else celula += c;
        } else if (c === '"') aspas = true;
        else if (c === ',') {
            linha.push(celula);
            celula = '';
        } else if (c === '\r' && limpo[i + 1] === '\n') {
            linha.push(celula);
            linhas.push(linha);
            linha = [];
            celula = '';
            i++;
        } else celula += c;
    }
    if (celula !== '' || linha.length) {
        linha.push(celula);
        linhas.push(linha);
    }
    return linhas;
}

// Poemas do cenário:
//  1: três papéis misturados, gravados fora de ordem (espelho em ordem de papel)
//  2: só espelho (sem `temas`), com "café" e "Café" (mesmo Tema por chave)
//  3: sem nenhum Tema
//  4: `temas` com um id que não existe no cadastro (órfão) mais "Café"
// Prosa 1: um Tema principal.
function cenario() {
    localStorage.clear();
    [
        'livros',
        'partes',
        'secoes',
        'elementos',
        'grupos',
        'pessoas',
        'autores',
        'assuntos',
        'prosas',
        'coletaneas',
        'itensColetanea',
    ].forEach((c) => (db[c] = []));
    db.temas = [
        { id: 1, nome: 'Amor', notas: '' },
        { id: 2, nome: 'Saudade', notas: '' },
        { id: 3, nome: 'Brasil', notas: '' },
        { id: 4, nome: 'Café', notas: '' },
        { id: 5, nome: 'Sem texto', notas: '' },
    ];
    db.assuntos = [
        { id: 1, nome: 'Afetos', notas: '', temaIds: [1, 2] },
        { id: 2, nome: 'Lugar', notas: '', temaIds: [3] },
    ];
    db.poemas = [
        {
            id: 1,
            titulo: 'Misto',
            texto: 'verso',
            temas: [
                { temaId: 2, papel: 'secundario' },
                { temaId: 3, papel: '' },
                { temaId: 1, papel: 'principal' },
            ],
            sinalizacoesTema: 'Amor, Saudade, Brasil',
        },
        { id: 2, titulo: 'So espelho', texto: 'verso', sinalizacoesTema: 'Amor, café, Café' },
        { id: 3, titulo: 'Sem tema', texto: 'verso', sinalizacoesTema: '' },
        {
            id: 4,
            titulo: 'Com orfao',
            texto: 'verso',
            temas: [
                { temaId: 99, papel: 'principal' },
                { temaId: 4, papel: 'principal' },
            ],
            sinalizacoesTema: 'Café',
        },
    ];
    db.prosas = [
        {
            id: 1,
            titulo: 'Prosa',
            texto: 'texto',
            temas: [{ temaId: 3, papel: 'principal' }],
            sinalizacoesTema: 'Brasil',
        },
    ];
}

const poema = (id) => db.poemas.find((p) => p.id === id);

describe('Fase 2, Etapa 0: leitura dos Temas de um texto', () => {
    beforeEach(cenario);

    it('temasDoTexto lê o espelho na ordem gravada, sem repetir por chave', () => {
        assert.deepEqual(U.temasDoTexto(poema(1)), ['Amor', 'Saudade', 'Brasil']);
        assert.deepEqual(U.temasDoTexto(poema(2)), ['Amor', 'café']);
        assert.deepEqual(U.temasDoTexto(poema(3)), []);
        assert.deepEqual(U.temasDoTexto(poema(4)), ['Café']);
    });

    it('temasComPapel ordena principal, secundário, indefinido e ignora id órfão', () => {
        assert.deepEqual(
            U.temasComPapel(poema(1), db.temas).map((e) => [e.nome, e.papel]),
            [
                ['Amor', 'principal'],
                ['Saudade', 'secundario'],
                ['Brasil', ''],
            ],
        );
        // Sem `temas`: cai no espelho, tudo sem papel.
        assert.deepEqual(
            U.temasComPapel(poema(2), db.temas).map((e) => [e.nome, e.papel]),
            [
                ['Amor', ''],
                ['café', ''],
            ],
        );
        assert.deepEqual(
            U.temasComPapel(poema(4), db.temas).map((e) => [e.nome, e.papel]),
            [['Café', 'principal']],
        );
        assert.deepEqual(U.temasComPapel(poema(3), db.temas), []);
    });

    it('textoTemasComPapel e nomesTemasPorPapel', () => {
        assert.equal(
            U.textoTemasComPapel(poema(1), db.temas),
            'Amor (principal), Saudade (secundário), Brasil',
        );
        assert.equal(U.textoTemasComPapel(poema(2), db.temas), 'Amor, café');
        assert.equal(U.textoTemasComPapel(poema(3), db.temas), '');
        assert.deepEqual(U.nomesTemasPorPapel(poema(1), db.temas, 'principal'), ['Amor']);
        assert.deepEqual(U.nomesTemasPorPapel(poema(1), db.temas, 'secundario'), ['Saudade']);
        assert.deepEqual(U.nomesTemasPorPapel(poema(1), db.temas, ''), ['Brasil']);
        assert.deepEqual(U.nomesTemasPorPapel(poema(2), db.temas, ''), ['Amor', 'café']);
    });

    it('sinalizacoesCombinadas e sinalizacoesAgrupadas (busca geral e .md)', () => {
        const cadastros = { temas: db.temas };
        assert.equal(U.sinalizacoesCombinadas(poema(1), cadastros), 'Amor | Saudade | Brasil');
        assert.equal(U.sinalizacoesCombinadas(poema(3), cadastros), '');
        // Sem o cadastro de Temas a categoria virtual sai vazia (o campo antigo não é lido).
        assert.equal(U.sinalizacoesCombinadas(poema(1)), '');
        assert.deepEqual(U.sinalizacoesAgrupadas(poema(1), db.temas), [
            { rotulo: 'Tema', valor: 'Amor (principal), Saudade (secundário), Brasil' },
        ]);
        assert.deepEqual(U.sinalizacoesAgrupadas(poema(2), db.temas), [
            { rotulo: 'Tema', valor: 'Amor, café' },
        ]);
    });

    it('Assuntos do texto saem dos Temas lidos (por chave, sem caixa nem acento)', () => {
        const nomes = (item) => U.assuntosDoTexto(item, db.assuntos, db.temas).map((a) => a.nome);
        assert.deepEqual(nomes(poema(1)), ['Afetos', 'Lugar']);
        assert.deepEqual(nomes(poema(2)), ['Afetos']);
        assert.deepEqual(nomes(poema(3)), []);
        assert.deepEqual(nomes(poema(4)), []);
    });
});

describe('Fase 2, Etapa 0: contagens e cadastro', () => {
    beforeEach(cenario);

    it('contarTextosPorTema conta por chave (café e Café são um Tema só)', () => {
        const c = T.contarTextosPorTema(db);
        assert.equal(c.get(U.chaveTema('Amor')), 2);
        assert.equal(c.get(U.chaveTema('Saudade')), 1);
        assert.equal(c.get(U.chaveTema('Brasil')), 2); // poema 1 e prosa 1
        assert.equal(c.get(U.chaveTema('Café')), 2); // poemas 2 e 4
        assert.equal(c.get(U.chaveTema('Sem texto')), undefined);
    });

    it('textosDoTema devolve ids de poemas e prosas', () => {
        assert.deepEqual(T.textosDoTema(db, 'Brasil'), { poemasIds: [1], prosasIds: [1] });
        assert.deepEqual(T.textosDoTema(db, 'cafe'), { poemasIds: [2, 4], prosasIds: [] });
        assert.deepEqual(T.textosDoTema(db, 'Sem texto'), { poemasIds: [], prosasIds: [] });
    });

    it('resumoTemas lista os Temas usados, mais usados primeiro', () => {
        const resumo = U.resumoTemas([...db.poemas, ...db.prosas], db.assuntos, db.temas);
        const porNome = Object.fromEntries(resumo.map((r) => [r.nome, r.contagem]));
        assert.equal(porNome.Amor, 2);
        assert.equal(porNome.Brasil, 2);
        assert.equal(porNome.Saudade, 1);
        assert.equal(resumo[resumo.length - 1].contagem <= resumo[0].contagem, true);
    });

    it('reconciliarTemasDoTexto: texto só com espelho vira `temas`; na divergência os `temas` mandam (Etapa 4)', () => {
        const p2 = poema(2);
        assert.equal(T.reconciliarTemasDoTexto(db, p2), true);
        assert.deepEqual(
            p2.temas.map((e) => [db.temas.find((t) => t.id === e.temaId).nome, e.papel]),
            [
                ['Amor', ''],
                ['Café', ''],
            ],
        );
        assert.equal(nomesDosTemas(p2, db), 'Amor, Café');

        // Divergência: alguém trocou só o espelho de um texto que já tinha `temas`.
        // Desde a Etapa 4 os `temas` mandam: o espelho é refeito, os papéis ficam.
        const p1 = poema(1);
        p1.sinalizacoesTema = 'Amor, Brasil';
        T.reconciliarTemasDoTexto(db, p1);
        assert.deepEqual(
            p1.temas.map((e) => [db.temas.find((t) => t.id === e.temaId).nome, e.papel]),
            [
                ['Saudade', 'secundario'],
                ['Brasil', ''],
                ['Amor', 'principal'],
            ],
        );
        assert.equal(nomesDosTemas(p1, db), 'Amor, Saudade, Brasil');
    });
});

describe('Fase 2, Etapa 0: saídas', () => {
    beforeEach(cenario);

    // Texto visível de cada selo, na ordem (o selo de papel traz um símbolo aninhado).
    function textosDosBadges(html) {
        return [...html.matchAll(/inline-block">([^<]+?)\s*(?:<|$)/g)].map((m) => m[1].trim());
    }

    it('badges de Etiquetas: um selo por Tema, na ordem de papel', () => {
        const html1 = badgesEtiquetasPorCategoria(poema(1));
        assert.deepEqual(textosDosBadges(html1), ['Amor', 'Saudade', 'Brasil']);
        assert.match(html1, /title="Amor \(principal\)"/);
        assert.match(html1, /title="Saudade \(secundário\)"/);
        // Texto só com espelho: nomes do espelho, sem papel. "café, Café" vira um selo
        // só (por chave) desde a Etapa 2; esse dado não sobrevive ao `sincronizarTemas`.
        assert.deepEqual(textosDosBadges(badgesEtiquetasPorCategoria(poema(2))), ['Amor', 'café']);
        // `semTema` tira os Temas (a tabela tem coluna própria).
        assert.match(badgesEtiquetasPorCategoria(poema(1), { semTema: true }), /—/);
        assert.equal(textosDosBadges(badgesEtiquetasPorCategoria(poema(3))).length, 0);
    });

    it('CSV: sinal_tema (todos, na ordem do espelho) e tema por papel', () => {
        const regs = [1, 2, 3, 4].map((id) => montarRegistro('poema', poema(id)));
        const [cab, ...linhas] = lerCsv(gerarCsvTextos('poema', regs, db));
        const col = (nome) => cab.indexOf(nome);
        assert.ok(col('sinal_tema') >= 0);
        const valor = (linha, nome) => linhas[linha][col(nome)];
        assert.equal(valor(0, 'sinal_tema'), 'Amor | Saudade | Brasil');
        assert.equal(valor(1, 'sinal_tema'), 'Amor | café');
        assert.equal(valor(2, 'sinal_tema'), '');
        assert.equal(valor(3, 'sinal_tema'), 'Café');
        assert.equal(valor(0, 'tema_principal'), 'Amor');
        assert.equal(valor(0, 'tema_secundario'), 'Saudade');
        assert.equal(valor(3, 'tema_principal'), 'Café');
    });

    it('.md: linha Tema com o papel entre parênteses', () => {
        const md = gerarMarkdownItem({ ...poema(1), _tipo: 'poema' });
        assert.match(md, /Tema:?\*{0,2} Amor \(principal\), Saudade \(secundário\), Brasil/);
        const md2 = gerarMarkdownItem({ ...poema(2), _tipo: 'poema' });
        assert.match(md2, /Tema:?\*{0,2} Amor, café/);
        const md3 = gerarMarkdownItem({ ...poema(3), _tipo: 'poema' });
        assert.doesNotMatch(md3, /Tema:/);
    });

    it('Estatísticas: contagem de Temas por tipo de etiqueta (papel "todos")', () => {
        const dados = E.agregarPorTema(['tema']);
        const porNome = Object.fromEntries(dados.labels.map((l, i) => [l, dados.data[i]]));
        // Amor: poemas 1 e 2. Brasil: poema 1 e prosa 1. Saudade: poema 1.
        assert.equal(porNome.Amor, 2);
        assert.equal(porNome.Brasil, 2);
        assert.equal(porNome.Saudade, 1);
        // Café: poema 2 (só espelho, "café, Café" conta uma vez por chave desde a Etapa 1;
        // antes contava duas, dado que não sobrevive ao `sincronizarTemas` do load) e poema 4.
        assert.equal((porNome['café'] || 0) + (porNome['Café'] || 0), 2);
        assert.equal(dados.labels.length, dados.categorias.length);
    });
});
