// dom-real.js (happy-dom): o registro de cada texto vem de `montarRegistro`
// (exportar.js), que puxa a cadeia de imports com DOM; e o teste do
// download precisa de <a>/Blob de verdade.
import './helpers/dom-real.js';

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { db } = await import('../js/db.js');
const { montarRegistro, exportarSelecaoCsv } = await import('../js/exportar.js');
const {
    celulaCsv,
    gerarCsv,
    gerarCsvTextos,
    colunasTexto,
    analisarTexto,
    dataTexto,
    virgulasParaLista,
    CAMPOS_TEXTO_IGNORADOS,
} = await import('../js/exportar-csv.js');
const { COLUNAS_AUTOR, gerarCsvAutores, itensDaSelecaoAutores, exportarAutoresCsv } =
    await import('../js/exportar-autores.js');

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Leitor de CSV mínimo (RFC 4180) só pra conferir o round-trip: se o que
// sai daqui não volta idêntico por um parser de verdade, o arquivo está errado.
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

// Uma linha do CSV como objeto { cabecalho: valor }.
function registros(csv) {
    const [cabecalho, ...resto] = lerCsv(csv);
    return resto.map((l) => Object.fromEntries(cabecalho.map((h, i) => [h, l[i]])));
}

describe('celulaCsv', () => {
    it('vazio, nulo e indefinido viram célula vazia; 0 e false continuam', () => {
        assert.equal(celulaCsv(null), '');
        assert.equal(celulaCsv(undefined), '');
        assert.equal(celulaCsv(''), '');
        assert.equal(celulaCsv(0), '0');
        assert.equal(celulaCsv(false), 'false');
        assert.equal(celulaCsv(true), 'true');
    });

    it('só usa aspas quando o conteúdo exige, e dobra as aspas internas', () => {
        assert.equal(celulaCsv('simples'), 'simples');
        assert.equal(celulaCsv('a,b'), '"a,b"');
        assert.equal(celulaCsv('ele disse "oi"'), '"ele disse ""oi"""');
        assert.equal(celulaCsv('linha 1\nlinha 2'), '"linha 1\nlinha 2"');
        assert.equal(celulaCsv(' espaço na ponta'), '" espaço na ponta"');
    });
});

describe('gerarCsv', () => {
    const colunas = [
        { cabecalho: 'a', valor: (r) => r.a },
        { cabecalho: 'b', valor: (r) => r.b },
    ];

    it('começa com BOM UTF-8, usa CRLF e termina com quebra de linha', () => {
        const csv = gerarCsv(colunas, [{ a: 1, b: 'x' }]);
        assert.ok(csv.startsWith('\uFEFFa,b\r\n'));
        assert.ok(csv.endsWith('1,x\r\n'));
    });

    it('conteúdo com vírgula, aspas e quebra de linha volta idêntico ao ler', () => {
        const dificil = 'verso 1, "verso 2"\nverso 3';
        const csv = gerarCsv(colunas, [{ a: dificil, b: 'ok' }]);
        assert.deepEqual(lerCsv(csv), [
            ['a', 'b'],
            [dificil, 'ok'],
        ]);
    });

    it('sem registros, só o cabeçalho', () => {
        assert.deepEqual(lerCsv(gerarCsv(colunas, [])), [['a', 'b']]);
    });
});

describe('helpers de célula', () => {
    it('dataTexto não inventa o que falta', () => {
        assert.equal(dataTexto({ dia: 5, mes: 3, ano: 2023 }), '2023-03-05');
        assert.equal(dataTexto({ mes: 3, ano: 2023 }), '2023-03');
        assert.equal(dataTexto({ ano: 2023 }), '2023');
        assert.equal(dataTexto(null), '');
    });

    it('virgulasParaLista troca a vírgula pelo separador " | "', () => {
        assert.equal(virgulasParaLista('a, b,  c'), 'a | b | c');
        assert.equal(virgulasParaLista(''), '');
        assert.equal(virgulasParaLista(undefined), '');
    });
});

describe('analisarTexto', () => {
    it('remove marcação de formatação e comentários pessoais', () => {
        const { plano } = analisarTexto(
            'um **verso** em _itálico_\n<!-- nota minha -->outro ~~riscado~~ <u>sublinhado</u>',
        );
        assert.equal(plano, 'um verso em itálico\noutro riscado sublinhado');
    });

    it('conta versos (linhas não vazias), estrofes (blocos) e palavras', () => {
        const r = analisarTexto('um dois\ntrês\n\n\nquatro cinco seis\n');
        assert.equal(r.versos, 3);
        assert.equal(r.blocos, 2);
        assert.equal(r.palavras, 6);
    });

    it('texto vazio: tudo zero, sem quebrar', () => {
        const r = analisarTexto('');
        assert.deepEqual(
            { p: r.plano, v: r.versos, b: r.blocos, w: r.palavras },
            { p: '', v: 0, b: 0, w: 0 },
        );
    });

    it('HTML colado: <br> e </p> viram quebra, o resto das tags some', () => {
        const { plano, versos } = analisarTexto(
            '<span style="color:red;">um</span> verso<br>outro verso</p>terceiro',
        );
        assert.equal(plano, 'um verso\noutro verso\nterceiro');
        assert.equal(versos, 3);
    });

    it('"<" solto no poema fica como está', () => {
        assert.equal(analisarTexto('eu <3 você\n<-- seta').plano, 'eu <3 você\n<-- seta');
    });

    it('conta palavras do mesmo jeito que as Estatísticas (acentos, hífen separa)', () => {
        assert.equal(analisarTexto('água-de-cheiro, coração!').palavras, 4);
    });
});

// ─── Poema / Prosa ────────────────────────────────────────────────

function montarBanco() {
    db.livros = [{ id: 1, titulo: 'Livro Um' }];
    db.partes = [{ id: 2, titulo: 'Parte A', livroId: 1 }];
    db.secoes = [{ id: 3, titulo: 'Seção X', paiTipo: 'parte', paiId: 2 }];
    db.grupos = [{ id: 20, nome: 'Família' }];
    db.pessoas = [
        { id: 10, nome: 'Ana', grupoIds: [20] },
        { id: 11, nome: 'Beto', grupoIds: [] },
    ];
    db.autores = [
        {
            id: 30,
            nome: 'Fernando Pessoa',
            nomesLiterarios: [{ nome: 'Álvaro de Campos', tipo: 'Heterônimo' }],
        },
        { id: 31, nome: 'Eu Mesmo', souEu: true },
    ];
    db.epocas = [{ id: 40, nome: 'Adolescência' }];
    db.prosas = [{ id: 200, titulo: 'Conto, "vizinho"' }];
    db.poemas = [
        {
            id: 100,
            titulo: 'Poema, com "aspas"',
            texto: 'primeiro **verso**\nsegundo verso\n\nterceiro',
            paiTipo: 'secao',
            paiId: 3,
            sequencia: 4,
            idioma: 'pt-BR',
            status: 'publicado',
            dataEscrita: { dia: 5, mes: 3, ano: 2023, exata: true },
            dataPublicacao: { ano: 2024 },
            ano: 2023,
            livrosIds: [1],
            conceitos: {
                elos: [
                    { id: 1, poemaId: 200, relacao: 'Reescrita', direcao: 'destino', texto: 'v2' },
                    { id: 2, poemaId: 999, relacao: 'Díptico', direcao: 'origem' },
                ],
                ecos: [{ id: 3, poemaId: 200, tipo: 'Aceno a' }],
            },
            notas: 'nota\ncom quebra',
            sinalizacoesTema: 'amor, perda',
            sinalizacoesDominioImagetico: 'Astrologia',
            pessoas: [
                { pessoaId: 10, papeis: ['Retratado(a)', 'Dedicatário(a)'] },
                { pessoaId: 11, papeis: [] },
                { pessoaId: 777, papeis: ['Mencionado(a)'] },
            ],
            gruposDiretos: [20],
            autoria: [
                {
                    autorId: 30,
                    papel: 'Autor',
                    assinatura: 'Heterônimo',
                    nomeLiterario: 'Álvaro de Campos',
                },
                { autorId: 31, papel: 'Coautor' },
            ],
            envios: [
                {
                    pessoa: 'Dani',
                    data: { dia: 12, mes: 5, ano: 2023 },
                    meio: 'WhatsApp',
                    reacao: 'gostou',
                    notas: '',
                },
            ],
            reconhecimentos: [{ premio: 'Concurso X', posicao: '1º lugar', ano: 2026, texto: '' }],
            autoavaliacao: 'bom',
            autoclassificacao: 0,
            epocaRetratada: {
                epocaId: 40,
                inicio: { ano: 2010, mes: 2 },
                fim: { ano: 2012 },
                recorte: 'momento',
                na: false,
            },
            intertextualidade: [
                {
                    tipo: 'Notícia',
                    texto: 'Algo',
                    link: 'https://x.test',
                    linkTexto: 'X',
                    nota: 'n',
                },
            ],
            hipertextualidade: [{ tipo: 'Livro', hipotexto: 'Obra', relacao: 'Paródia' }],
            referenciasExternas: [{ tipo: 'Marco histórico', texto: 'Data' }],
            anexos: [{ tipo: 'Ilustração', texto: 'desenho', link: '' }],
            anotacoesMarginais: [
                {
                    trecho: 'v1',
                    posicao: 'Margem direita',
                    fonte: 'lápis',
                    texto: 'ver',
                    observacoes: 'diagonal',
                },
            ],
            cortadoDe: { livro: 'Livro Velho', secao: 'Sec Velha' },
            lancadoEm: null,
            fonteTexto: {
                origem: 'Obra própria',
                edicao: '',
                link: '',
                conferido: true,
                grafia: 'atual',
            },
        },
        { id: 101, titulo: 'Só o básico', texto: '', autoria: [] },
    ];
}

function linhaDoPoema(id) {
    const item = db.poemas.find((p) => p.id === id);
    const csv = gerarCsvTextos('poema', [montarRegistro('poema', item)], db);
    return registros(csv)[0];
}

describe('CSV de Poemas', () => {
    beforeEach(montarBanco);

    it('achata os campos simples e resolve o contexto por nome', () => {
        const l = linhaDoPoema(100);
        assert.equal(l.id, '100');
        assert.equal(l.tipo, 'poema');
        assert.equal(l.titulo, 'Poema, com "aspas"');
        assert.equal(l.texto, 'primeiro verso\nsegundo verso\n\nterceiro');
        assert.equal(l.n_versos, '3');
        assert.equal(l.n_estrofes, '2');
        assert.equal(l.n_palavras, '5');
        assert.equal(l.status, 'publicado');
        assert.equal(l.livro, 'Livro Um');
        assert.equal(l.parte, 'Parte A');
        assert.equal(l.secao, 'Seção X');
        assert.equal(l.sequencia, '4');
        assert.equal(l.livros_vinculados, 'Livro Um');
        assert.equal(l.notas, 'nota\ncom quebra');
    });

    it('datas viram colunas de ano, mês e dia (sem inventar o que falta)', () => {
        const l = linhaDoPoema(100);
        assert.deepEqual(
            [l.escrita_ano, l.escrita_mes, l.escrita_dia, l.escrita_exata],
            ['2023', '3', '5', 'true'],
        );
        assert.deepEqual([l.publicacao_ano, l.publicacao_mes, l.publicacao_dia], ['2024', '', '']);
        assert.deepEqual(
            [l.epoca_inicio_ano, l.epoca_inicio_mes, l.epoca_inicio_dia],
            ['2010', '2', ''],
        );
        assert.deepEqual([l.epoca_fim_ano, l.epoca_fim_mes, l.epoca_fim_dia], ['2012', '', '']);
    });

    it('autoria e pessoas: nomes na coluna simples, detalhe na outra', () => {
        const l = linhaDoPoema(100);
        assert.equal(l.autores, 'Fernando Pessoa | Eu Mesmo');
        assert.equal(
            l.autoria_detalhe,
            'Fernando Pessoa (Autor, Heterônimo: Álvaro de Campos) | Eu Mesmo (Coautor, Ortônimo)',
        );
        // Pessoa não cadastrada (777) é ignorada, como no resto do app.
        assert.equal(l.pessoas, 'Ana | Beto');
        assert.equal(l.pessoas_papeis, 'Ana: Retratado(a), Dedicatário(a) | Beto');
        assert.equal(l.grupos_via_pessoas, 'Família');
        assert.equal(l.grupos_diretos, 'Família');
    });

    it('sinalizações: uma coluna por categoria, lista com " | "', () => {
        const l = linhaDoPoema(100);
        assert.equal(l.sinal_tema, 'amor | perda');
        assert.equal(l.sinal_dominio_imagetico, 'Astrologia');
        assert.equal(l.sinal_estilo, '');
    });

    it('elos e ecos apontam pro título do texto; alvo excluído não quebra', () => {
        const l = linhaDoPoema(100);
        assert.equal(l.elos, 'Reescrita de: Conto, "vizinho" (v2) | Díptico com: (texto excluído)');
        assert.equal(l.ecos, 'Aceno a: Conto, "vizinho"');
    });

    it('listas de objetos viram uma entrada de texto por objeto', () => {
        const l = linhaDoPoema(100);
        assert.equal(l.intertextualidade, 'Notícia: Algo [https://x.test] (n)');
        assert.equal(l.hipertextualidade, 'Livro: Obra (Paródia)');
        assert.equal(l.referencias_externas, 'Marco histórico: Data');
        assert.equal(l.anexos, 'Ilustração: desenho');
        assert.equal(l.anotacoes_marginais, 'Margem direita "v1": ver [lápis] (diagonal)');
        assert.equal(l.envios, 'Dani (2023-05-12; WhatsApp); reação: gostou');
        assert.equal(l.reconhecimentos, 'Concurso X (1º lugar; 2026)');
    });

    it('época, migração e fonte', () => {
        const l = linhaDoPoema(100);
        assert.equal(l.epoca, 'Adolescência');
        assert.equal(l.epoca_recorte, 'momento');
        assert.equal(l.epoca_nao_se_aplica, 'false');
        assert.equal(l.cortado_de_livro, 'Livro Velho');
        assert.equal(l.cortado_de_secao, 'Sec Velha');
        assert.equal(l.lancado_em_livro, '');
        assert.equal(l.fonte_origem, 'Obra própria');
        assert.equal(l.fonte_conferido, 'true');
        assert.equal(l.fonte_grafia, 'atual');
    });

    it('autoclassificação 0 ("não avaliado") sai vazia, não 0', () => {
        assert.equal(linhaDoPoema(100).autoclassificacao, '');
        db.poemas[0].autoclassificacao = 3.5;
        assert.equal(linhaDoPoema(100).autoclassificacao, '3.5');
    });

    it('de_terceiros: vazio sem Autor "sou eu"; true/false quando há', () => {
        // Poema 100 tem um Autor "sou eu" entre os autores: não é de terceiros.
        assert.equal(linhaDoPoema(100).de_terceiros, 'false');
        db.poemas[0].autoria = [{ autorId: 30, papel: 'Autor' }];
        assert.equal(linhaDoPoema(100).de_terceiros, 'true');
        db.poemas[0].autoria = [];
        assert.equal(linhaDoPoema(100).de_terceiros, 'false');
        db.autores.forEach((a) => delete a.souEu);
        assert.equal(linhaDoPoema(100).de_terceiros, '');
    });

    it('poema mínimo: nenhuma coluna quebra e todas existem', () => {
        const l = linhaDoPoema(101);
        assert.equal(l.titulo, 'Só o básico');
        assert.equal(l.texto, '');
        assert.equal(l.n_versos, '0');
        assert.equal(l.autores, '');
        assert.equal(l.livro, '');
        assert.equal(Object.keys(l).length, colunasTexto('poema').length);
    });

    it('vários textos: uma linha por texto, mesmas colunas, ordem preservada', () => {
        const regs = db.poemas.map((p) => montarRegistro('poema', p));
        const tabela = lerCsv(gerarCsvTextos('poema', regs, db));
        assert.equal(tabela.length, 3);
        assert.ok(tabela.every((l) => l.length === tabela[0].length));
        assert.deepEqual([tabela[1][0], tabela[2][0]], ['100', '101']);
    });

    it('cabeçalhos únicos', () => {
        const nomes = colunasTexto('poema').map((c) => c.cabecalho);
        assert.equal(new Set(nomes).size, nomes.length);
    });
});

describe('CSV de Prosas', () => {
    beforeEach(() => {
        montarBanco();
        db.poemas = [];
        db.prosas = [
            {
                id: 300,
                titulo: 'Conto',
                texto: 'primeiro parágrafo aqui\n\nsegundo parágrafo',
                genero: 'Conto, Crônica',
                publicado: true,
                autoria: [],
            },
        ];
    });

    it('usa colunas de prosa (parágrafos, gênero) e não as de poema', () => {
        const cab = colunasTexto('prosa').map((c) => c.cabecalho);
        assert.ok(
            cab.includes('n_paragrafos') && cab.includes('genero') && cab.includes('publicado'),
        );
        assert.ok(!cab.includes('n_versos') && !cab.includes('anotacoes_marginais'));
        assert.ok(!colunasTexto('poema').some((c) => c.cabecalho === 'genero'));
    });

    it('linha da prosa', () => {
        const csv = gerarCsvTextos('prosa', [montarRegistro('prosa', db.prosas[0])], db);
        const [l] = registros(csv);
        assert.equal(l.tipo, 'prosa');
        assert.equal(l.n_paragrafos, '2');
        assert.equal(l.n_palavras, '5');
        assert.equal(l.genero, 'Conto | Crônica');
        assert.equal(l.publicado, 'true');
    });
});

// ─── Consistência com o cadastro ──────────────────────────────────
// Mesmo espírito de sinalizacoes-consistencia.test.js: lê forms.js como
// texto e compara com as colunas. Se um campo novo entrar no cadastro sem
// coluna no .csv, este teste falha, em vez de o campo sumir do dataset
// em silêncio.
function chavesDeDados(marcadorDeUnicidade) {
    const fonte = fs.readFileSync(path.join(RAIZ, 'js', 'forms.js'), 'utf8');
    const meio = fonte.indexOf(marcadorDeUnicidade);
    assert.ok(meio > -1, `marcador não encontrado em forms.js: ${marcadorDeUnicidade}`);
    const ini = fonte.lastIndexOf('const dados = {', meio);
    const fim = fonte.indexOf('\n        };', ini);
    const chaves = [...fonte.slice(ini, fim).matchAll(/^ {12}(\w+)[:,]/gm)].map((m) => m[1]);
    assert.ok(chaves.length > 10, 'não extraiu as chaves de `dados`');
    return chaves;
}

function camposCobertos(colunas, extra = []) {
    return new Set([...colunas.flatMap((c) => c.campos), ...extra]);
}

describe('consistência: todo campo do cadastro tem coluna no .csv', () => {
    it('Poema', () => {
        const cobertos = camposCobertos(colunasTexto('poema'), CAMPOS_TEXTO_IGNORADOS);
        const faltando = chavesDeDados("titulo: document.getElementById('p-titulo').value").filter(
            (k) => !cobertos.has(k),
        );
        assert.deepEqual(faltando, [], `campos de Poema sem coluna no .csv: ${faltando}`);
    });

    it('Prosa', () => {
        const cobertos = camposCobertos(colunasTexto('prosa'), CAMPOS_TEXTO_IGNORADOS);
        const faltando = chavesDeDados("titulo: document.getElementById('pr-titulo').value").filter(
            (k) => !cobertos.has(k),
        );
        assert.deepEqual(faltando, [], `campos de Prosa sem coluna no .csv: ${faltando}`);
    });

    it('Autor', () => {
        const cobertos = camposCobertos(COLUNAS_AUTOR);
        const faltando = chavesDeDados("nome: document.getElementById('au-nome').value").filter(
            (k) => !cobertos.has(k),
        );
        assert.deepEqual(faltando, [], `campos de Autor sem coluna no .csv: ${faltando}`);
    });
});

// ─── Autores ──────────────────────────────────────────────────────

describe('CSV de Autores', () => {
    beforeEach(() => {
        montarBanco();
        db.autores = [
            { id: 2, nome: 'Zé', souEu: true, ocupacoes: 'Tradutor, Comerciante' },
            {
                id: 1,
                nome: 'Fernando Pessoa',
                isni: '0000 0001',
                nacionalidade: 'Portuguesa',
                nascimento: { dia: 13, mes: 6, ano: 1888 },
                obito: { ano: 1935 },
                nomesLiterarios: [{ nome: 'Álvaro de Campos', tipo: 'Heterônimo' }],
                condicoesClinicas: [{ nome: 'Depressão', tipo: 'Mental' }],
                neurodivergencias: 'TDAH',
                sobre: 'Poeta, "múltiplo"',
            },
        ];
        db.poemas = [{ id: 1, titulo: 'A', autoria: [{ autorId: 1, papel: 'Autor' }] }];
        db.prosas = [];
    });

    it('uma linha por Autor, em ordem alfabética, com cadastro e derivados', () => {
        const ls = registros(gerarCsvAutores(itensDaSelecaoAutores([2, 1])));
        assert.deepEqual(
            ls.map((l) => l.nome),
            ['Fernando Pessoa', 'Zé'],
        );
        const f = ls[0];
        assert.equal(f.nomes_literarios, 'Álvaro de Campos (Heterônimo)');
        assert.equal(f.condicoes_clinicas, 'Depressão (Mental)');
        assert.equal(f.neurodivergencias, 'TDAH');
        assert.deepEqual(
            [f.nascimento_ano, f.nascimento_mes, f.nascimento_dia],
            ['1888', '6', '13'],
        );
        assert.deepEqual([f.obito_ano, f.obito_mes, f.obito_dia], ['1935', '', '']);
        assert.equal(f.sobre, 'Poeta, "múltiplo"');
        assert.equal(f.dominio_publico_desde, '2006');
        assert.equal(f.total_poemas, '1');
        assert.equal(f.sou_eu, 'false');
        assert.equal(ls[1].sou_eu, 'true');
        assert.equal(ls[1].ocupacoes, 'Tradutor | Comerciante');
    });

    it('cabeçalhos únicos e mesmo nº de colunas em toda linha', () => {
        const nomes = COLUNAS_AUTOR.map((c) => c.cabecalho);
        assert.equal(new Set(nomes).size, nomes.length);
        const tabela = lerCsv(gerarCsvAutores(itensDaSelecaoAutores([1, 2])));
        assert.ok(tabela.every((l) => l.length === nomes.length));
    });
});

// ─── Download ─────────────────────────────────────────────────────
// Mesma técnica de exportar-sonoridade.test.js: captura o <a download>.
describe('download do .csv', () => {
    let downloads;
    let criarOriginal;
    let urlOriginal;
    let revogarOriginal;

    beforeEach(() => {
        montarBanco();
        downloads = [];
        criarOriginal = document.createElement;
        urlOriginal = globalThis.URL.createObjectURL;
        revogarOriginal = globalThis.URL.revokeObjectURL;
        const porUrl = new Map();
        globalThis.URL.createObjectURL = (blob) => {
            const url = `blob:test-${porUrl.size}`;
            porUrl.set(url, blob);
            return url;
        };
        globalThis.URL.revokeObjectURL = () => {};
        document.createElement = (tag) => {
            const el = criarOriginal.call(document, tag);
            if (tag !== 'a') return el;
            const clicar = el.click.bind(el);
            el.click = () => {
                downloads.push({ nome: el.download, blob: porUrl.get(el.href) });
                clicar();
            };
            return el;
        };
    });

    afterEach(() => {
        document.createElement = criarOriginal;
        globalThis.URL.createObjectURL = urlOriginal;
        globalThis.URL.revokeObjectURL = revogarOriginal;
    });

    const bytes = async (blob) => Buffer.from(await blob.arrayBuffer());

    it('Poemas: só os ids pedidos, arquivo .csv, UTF-8 com BOM', async () => {
        exportarSelecaoCsv('poema', [101]);
        assert.equal(downloads.length, 1);
        assert.match(downloads[0].nome, /^selecao_poemas_\d+\.csv$/);
        assert.match(downloads[0].blob.type, /^text\/csv/);
        const b = await bytes(downloads[0].blob);
        assert.deepEqual([...b.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
        const ls = registros(b.toString('utf-8'));
        assert.deepEqual(
            ls.map((l) => l.id),
            ['101'],
        );
    });

    it('Prosas: nome do arquivo próprio', () => {
        db.prosas = [{ id: 300, titulo: 'Conto', texto: 'x', autoria: [] }];
        exportarSelecaoCsv('prosa', [300]);
        assert.match(downloads[0].nome, /^selecao_prosas_\d+\.csv$/);
    });

    it('sem seleção não baixa nada', () => {
        exportarSelecaoCsv('poema', []);
        assert.equal(downloads.length, 0);
    });

    it('acentos sobrevivem ao UTF-8', async () => {
        exportarSelecaoCsv('poema', [100]);
        const texto = (await bytes(downloads[0].blob)).toString('utf-8');
        assert.ok(texto.includes('Álvaro de Campos'));
    });

    it('Autores: .csv com o nome de arquivo próprio', () => {
        exportarAutoresCsv([30]);
        assert.match(downloads[0].nome, /^selecao_autores_\d+\.csv$/);
    });
});
