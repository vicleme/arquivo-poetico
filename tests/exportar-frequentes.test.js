import './helpers/localstorage-shim.js';
import './helpers/dom-shim.js';

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';

import { db } from '../js/db.js';
import { gerarId } from '../js/utils.js';
import {
    baixarFixo,
    baixarTodosFixos,
    salvarNomeFixo,
    baixarTemplate,
    baixarTodosTemplates,
    excluirTemplate,
    abrirFormularioTemplate,
} from '../js/exportar-frequentes.js';

const LS_KEY_VERSOES = 'arquivoPoetico_versoesFiltradas_v1';
const LS_KEY_TEMPLATES = 'arquivoPoetico_exportTemplates_v1';
const LS_KEY_NOMES = 'arquivoPoetico_nomesFrequentes_v1';

function resetarDb() {
    db.livros = [];
    db.partes = [];
    db.secoes = [];
    db.poemas = [];
    db.prosas = [];
    db.elementos = [];
    db.coletaneas = [];
    db.itensColetanea = [];
    db.pessoas = [];
    db.grupos = [];
}

// ─── Captura de downloads ───────────────────────────────────────────
// baixarBlobComoArquivo (não exportada) cria um <a download> e clica
// nele. O dom-shim padrão devolve elementos "de pano" com click: noop,
// então aqui a gente substitui document.createElement/URL.createObjectURL
// só pra esses testes, registrando cada download disparado (nome + blob)
// numa lista inspecionável — sem depender da UI de verdade.
let downloads;
let elementoGetById;
let createElementOriginal;
let getElementByIdOriginal;
let createObjectURLOriginal;
let revokeObjectURLOriginal;

beforeEach(() => {
    resetarDb();
    localStorage.clear();
    downloads = [];
    elementoGetById = {};

    createElementOriginal = document.createElement;
    getElementByIdOriginal = document.getElementById;
    createObjectURLOriginal = globalThis.URL.createObjectURL;
    revokeObjectURLOriginal = globalThis.URL.revokeObjectURL;

    const urlParaBlob = new Map();
    globalThis.URL.createObjectURL = (blob) => {
        const url = `blob:test-${urlParaBlob.size}`;
        urlParaBlob.set(url, blob);
        return url;
    };
    globalThis.URL.revokeObjectURL = () => {};

    document.createElement = (tag) => {
        if (tag !== 'a') return createElementOriginal(tag);
        const el = {
            style: {},
            appendChild: () => {},
            removeChild: () => {},
            setAttribute: () => {},
        };
        el.click = () => downloads.push({ nome: el.download, blob: urlParaBlob.get(el.href) });
        return el;
    };

    document.getElementById = (id) =>
        Object.prototype.hasOwnProperty.call(elementoGetById, id) ? elementoGetById[id] : null;
});

afterEach(() => {
    document.createElement = createElementOriginal;
    document.getElementById = getElementByIdOriginal;
    globalThis.URL.createObjectURL = createObjectURLOriginal;
    globalThis.URL.revokeObjectURL = revokeObjectURLOriginal;
});

async function textoDoBlob(blob) {
    return Buffer.from(await blob.arrayBuffer()).toString('utf-8');
}

function definirModoLote(modo) {
    elementoGetById['modo-lote-exportacoes-frequentes'] = { value: modo };
}

// ─── Fixos ───────────────────────────────────────────────────────

describe('baixarFixo — backup/aninhado/flat', () => {
    it('backup baixa o db inteiro como JSON compacto (mesmo formato de exportarJSON() em db.js)', async () => {
        db.poemas = [{ id: 'p1', titulo: 'Um poema' }];
        await baixarFixo('backup');
        assert.equal(downloads.length, 1);
        assert.equal(downloads[0].nome, 'arquivo_poetico_backup.json');
        const texto = await textoDoBlob(downloads[0].blob);
        assert.deepEqual(JSON.parse(texto).poemas, db.poemas);
    });

    it('aninhado inclui coletâneas resolvidas junto com a árvore de buildNesting', async () => {
        db.livros = [{ id: 'l1', titulo: 'Livro normal', tipo: 'Livro' }];
        await baixarFixo('aninhado');
        const texto = await textoDoBlob(downloads[0].blob);
        const saida = JSON.parse(texto);
        assert.ok(Array.isArray(saida.coletaneas));
        assert.equal(saida.coletaneas.length, 0); // nenhum livro tipo Coletânea
    });

    it('flatJson lista poemas e prosas com tipo e contexto resolvidos', async () => {
        db.poemas = [{ id: 'p1', titulo: 'Poema A' }];
        db.prosas = [{ id: 'r1', titulo: 'Prosa B' }];
        await baixarFixo('flatJson');
        const texto = await textoDoBlob(downloads[0].blob);
        const saida = JSON.parse(texto);
        assert.equal(saida.export_format, 'tudo_flat');
        assert.equal(saida.itens.length, 2);
        assert.equal(saida.itens.find((i) => i.id === 'p1').tipo, 'poema');
        assert.equal(saida.itens.find((i) => i.id === 'r1').tipo, 'prosa');
    });

    it('flatMd gera markdown legível (não JSON) com o título do poema', async () => {
        db.poemas = [{ id: 'p1', titulo: 'Poema Único' }];
        await baixarFixo('flatMd');
        const texto = await textoDoBlob(downloads[0].blob);
        assert.match(texto, /Poema Único/);
        assert.throws(() => JSON.parse(texto));
    });

    it('backup sem o checkbox de capas renderizado não inclui _capasBase64 (padrão seguro fora da aba)', async () => {
        db.poemas = [{ id: 'p1', titulo: 'Um poema' }];
        await baixarFixo('backup');
        const texto = await textoDoBlob(downloads[0].blob);
        assert.equal(Object.prototype.hasOwnProperty.call(JSON.parse(texto), '_capasBase64'), false);
    });

    it('backup com o checkbox de capas desmarcado não inclui _capasBase64', async () => {
        elementoGetById['chk-capas-fixo-backup'] = { checked: false };
        await baixarFixo('backup');
        const texto = await textoDoBlob(downloads[0].blob);
        assert.equal(Object.prototype.hasOwnProperty.call(JSON.parse(texto), '_capasBase64'), false);
    });
});

describe('baixarFixo — filtrado (aplica banco de versões alternativas)', () => {
    it('substitui título/texto do poema pela versão filtrada salva no localStorage', async () => {
        db.poemas = [{ id: 'p1', titulo: 'Original', texto: 'Texto original' }];
        localStorage.setItem(
            LS_KEY_VERSOES,
            JSON.stringify({
                'poema:p1': {
                    tituloFiltrado: 'Título filtrado',
                    textoFiltrado: 'Texto filtrado',
                    notaOriginalExportar: false,
                },
            }),
        );
        await baixarFixo('filtradoJson');
        const texto = await textoDoBlob(downloads[0].blob);
        const saida = JSON.parse(texto);
        const itens = saida.itens || saida.conteudo_poemas_diretos || [];
        // gerarFiltradoJsonBlob usa buildNesting — procura em qualquer nível.
        const encontrado = JSON.stringify(saida).includes('Título filtrado');
        assert.ok(encontrado);
        assert.ok(!JSON.stringify(saida).includes('Texto original'));
        void itens;
    });

    it('filtradoMd também aplica a substituição (via montarRegistro + gerarMarkdownExportacao)', async () => {
        db.poemas = [{ id: 'p1', titulo: 'Original', texto: 'Texto original' }];
        localStorage.setItem(
            LS_KEY_VERSOES,
            JSON.stringify({
                'poema:p1': {
                    tituloFiltrado: 'Título filtrado MD',
                    textoFiltrado: 'Texto filtrado MD',
                    notaOriginalExportar: false,
                },
            }),
        );
        await baixarFixo('filtradoMd');
        const texto = await textoDoBlob(downloads[0].blob);
        assert.match(texto, /Título filtrado MD/);
        assert.doesNotMatch(texto, /^Original$/m);
    });

    it('sem versão alternativa cadastrada, o filtrado sai igual ao original', async () => {
        db.poemas = [{ id: 'p1', titulo: 'Sem alteração', texto: 'Nada muda' }];
        await baixarFixo('filtradoJson');
        const texto = await textoDoBlob(downloads[0].blob);
        assert.ok(texto.includes('Sem alteração'));
    });
});

describe('baixarFixo — bancoVersoes (cadastro bruto de filtrar.html)', () => {
    it('baixa o objeto bancoVersoes como está — nome padrão versoes_filtradas_banco.json', async () => {
        const banco = {
            'poema:p1': { tituloFiltrado: 'T', textoFiltrado: 'X', notaOriginalExportar: false },
        };
        localStorage.setItem(LS_KEY_VERSOES, JSON.stringify(banco));
        await baixarFixo('bancoVersoes');
        assert.equal(downloads.length, 1);
        assert.equal(downloads[0].nome, 'versoes_filtradas_banco.json');
        const saida = JSON.parse(await textoDoBlob(downloads[0].blob));
        assert.equal(saida.export_format, 'banco_versoes_filtradas');
        assert.equal(saida.total, 1);
        assert.deepEqual(saida.versoes, banco);
    });

    it('banco vazio ainda baixa (total 0, versoes {})', async () => {
        await baixarFixo('bancoVersoes');
        const saida = JSON.parse(await textoDoBlob(downloads[0].blob));
        assert.equal(saida.total, 0);
        assert.deepEqual(saida.versoes, {});
    });
});

describe('salvarNomeFixo — nome de arquivo configurável e persistente', () => {
    it('usa o nome customizado (com token {data} resolvido) no próximo download', async () => {
        salvarNomeFixo('backup', 'meu-backup-{data}');
        await baixarFixo('backup');
        const hoje = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const dataEsperada = `${hoje.getFullYear()}-${pad(hoje.getMonth() + 1)}-${pad(hoje.getDate())}`;
        assert.equal(downloads[0].nome, `meu-backup-${dataEsperada}.json`);
    });

    it('persiste no localStorage sob a chave própria dos fixos', () => {
        salvarNomeFixo('aninhado', 'meu-aninhado');
        const salvo = JSON.parse(localStorage.getItem(LS_KEY_NOMES));
        assert.equal(salvo.aninhado, 'meu-aninhado');
    });

    it('nome em branco cai de volta pro padrão "exportacao"', async () => {
        salvarNomeFixo('backup', '   ');
        await baixarFixo('backup');
        assert.equal(downloads[0].nome, 'exportacao.json');
    });
});

describe('baixarTodosFixos — lote (.zip ou sequencial)', () => {
    afterEach(() => {
        delete globalThis.window.JSZip;
    });

    it('sem JSZip carregado, avisa e não dispara nenhum download (modo zip é o padrão)', async () => {
        definirModoLote('zip');
        await baixarTodosFixos();
        assert.equal(downloads.length, 0);
    });

    it('com JSZip disponível, gera um único .zip com os 7 arquivos fixos', async () => {
        globalThis.window.JSZip = JSZip;
        db.poemas = [{ id: 'p1', titulo: 'X' }];
        definirModoLote('zip');
        await baixarTodosFixos();
        assert.equal(downloads.length, 1);
        assert.match(downloads[0].nome, /\.zip$/);
        const zip = await JSZip.loadAsync(await downloads[0].blob.arrayBuffer());
        const nomes = Object.keys(zip.files).sort();
        assert.deepEqual(nomes, [
            'arquivo_poetico_aninhado.json',
            'arquivo_poetico_backup.json',
            'arquivo_poetico_filtrado.json',
            'arquivo_poetico_filtrado.md',
            'arquivo_poetico_flat.json',
            'arquivo_poetico_flat.md',
            'versoes_filtradas_banco.json',
        ]);
    });

    it('modo sequencial dispara 7 downloads separados, sem zip', async () => {
        definirModoLote('sequencial');
        await baixarTodosFixos();
        assert.equal(downloads.length, 7);
        assert.ok(downloads.every((d) => !d.nome.endsWith('.zip')));
    });
});

// ─── Templates ───────────────────────────────────────────────────

function salvarTemplateBruto(tpl) {
    const lista = JSON.parse(localStorage.getItem(LS_KEY_TEMPLATES) || '[]');
    lista.push(tpl);
    localStorage.setItem(LS_KEY_TEMPLATES, JSON.stringify(lista));
}

describe('baixarTemplate — filtro por critérios combinados (E lógico)', () => {
    it('filtra por Pessoa (dedicado), case-insensitive', async () => {
        db.pessoas = [{ id: 1, nome: 'Dalton' }];
        db.poemas = [
            { id: 'p1', titulo: 'Pra Dalton', pessoas: [{ pessoaId: 1, papeis: [] }] },
            { id: 'p2', titulo: 'Pra ninguém', pessoas: [] },
        ];
        salvarTemplateBruto({
            id: 't1',
            nome: 'Pra Dalton',
            criterios: [{ campo: 'pessoa', valor: 'dalton' }],
            tipos: ['poema'],
            formatos: { json: true, md: false },
        });
        baixarTemplate('t1');
        assert.equal(downloads.length, 1);
        const saida = JSON.parse(await textoDoBlob(downloads[0].blob));
        assert.equal(saida.itens.length, 1);
        assert.equal(saida.itens[0].id, 'p1');
    });

    it('distingue a mesma tag em categorias diferentes (Tecnologia em Domínio Imagético != Tema)', async () => {
        db.poemas = [
            { id: 'p1', titulo: 'Tema tech', sinalizacoesTema: 'Tecnologia' },
            { id: 'p2', titulo: 'Imagem tech', sinalizacoesDominioImagetico: 'Tecnologia' },
        ];
        salvarTemplateBruto({
            id: 't2',
            nome: 'Só tema tecnologia',
            criterios: [{ campo: 'sinalizacoesTema', valor: 'tecnologia' }],
            tipos: ['poema'],
            formatos: { json: true, md: false },
        });
        baixarTemplate('t2');
        const saida = JSON.parse(await textoDoBlob(downloads[0].blob));
        assert.equal(saida.itens.length, 1);
        assert.equal(saida.itens[0].id, 'p1');
    });

    it('combina vários critérios com E lógico (pessoa E sinalização)', async () => {
        db.pessoas = [{ id: 1, nome: 'Dalton' }];
        db.poemas = [
            {
                id: 'p1',
                titulo: 'Bate os dois',
                pessoas: [{ pessoaId: 1, papeis: [] }],
                sinalizacoesTema: 'Tecnologia',
            },
            {
                id: 'p2',
                titulo: 'Só pessoa',
                pessoas: [{ pessoaId: 1, papeis: [] }],
                sinalizacoesTema: 'Natureza',
            },
        ];
        salvarTemplateBruto({
            id: 't3',
            nome: 'Dalton + Tecnologia',
            criterios: [
                { campo: 'pessoa', valor: 'dalton' },
                { campo: 'sinalizacoesTema', valor: 'tecnologia' },
            ],
            tipos: ['poema'],
            formatos: { json: true, md: false },
        });
        baixarTemplate('t3');
        const saida = JSON.parse(await textoDoBlob(downloads[0].blob));
        assert.equal(saida.itens.length, 1);
        assert.equal(saida.itens[0].id, 'p1');
    });

    it('respeita os tipos marcados (só poema, só prosa, ou os dois)', async () => {
        db.poemas = [{ id: 'p1', titulo: 'P', genero: 'Crônica' }];
        db.prosas = [{ id: 'r1', titulo: 'R', genero: 'Crônica' }];
        salvarTemplateBruto({
            id: 't4',
            nome: 'Só prosa crônica',
            criterios: [{ campo: 'genero', valor: 'crônica' }],
            tipos: ['prosa'],
            formatos: { json: true, md: false },
        });
        baixarTemplate('t4');
        const saida = JSON.parse(await textoDoBlob(downloads[0].blob));
        assert.equal(saida.itens.length, 1);
        assert.equal(saida.itens[0].id, 'r1');
    });

    it('gera JSON e MD juntos quando os dois formatos estão marcados', async () => {
        db.poemas = [{ id: 'p1', titulo: 'Único', sinalizacoesTema: 'Amor' }];
        salvarTemplateBruto({
            id: 't5',
            nome: 'Amor',
            criterios: [{ campo: 'sinalizacoesTema', valor: 'amor' }],
            tipos: ['poema'],
            formatos: { json: true, md: true },
        });
        baixarTemplate('t5');
        assert.equal(downloads.length, 2);
        const extensoes = downloads.map((d) => d.nome.split('.').pop()).sort();
        assert.deepEqual(extensoes, ['json', 'md']);
    });

    it('usarVersaoFiltrada aplica a substituição só nesse template', async () => {
        db.poemas = [{ id: 'p1', titulo: 'Original', texto: 'X', sinalizacoesTema: 'Amor' }];
        localStorage.setItem(
            LS_KEY_VERSOES,
            JSON.stringify({
                'poema:p1': {
                    tituloFiltrado: 'Filtrado!',
                    textoFiltrado: 'Y',
                    notaOriginalExportar: false,
                },
            }),
        );
        salvarTemplateBruto({
            id: 't6',
            nome: 'Amor filtrado',
            criterios: [{ campo: 'sinalizacoesTema', valor: 'amor' }],
            tipos: ['poema'],
            formatos: { json: true, md: false },
            usarVersaoFiltrada: true,
        });
        baixarTemplate('t6');
        const saida = JSON.parse(await textoDoBlob(downloads[0].blob));
        assert.equal(saida.itens[0].titulo, 'Filtrado!');
    });

    it('nome de arquivo do template usa o padrão {nome}-{formato} por padrão', async () => {
        db.poemas = [{ id: 'p1', titulo: 'X', sinalizacoesTema: 'Amor' }];
        salvarTemplateBruto({
            id: 't7',
            nome: 'Meu Template',
            criterios: [{ campo: 'sinalizacoesTema', valor: 'amor' }],
            tipos: ['poema'],
            formatos: { json: true, md: false },
        });
        baixarTemplate('t7');
        assert.equal(downloads[0].nome, 'Meu Template-json.json');
    });

    it('nenhum item bate com os critérios: avisa e não baixa nada', async () => {
        db.poemas = [{ id: 'p1', titulo: 'X', sinalizacoesTema: 'Natureza' }];
        salvarTemplateBruto({
            id: 't8',
            nome: 'Vazio',
            criterios: [{ campo: 'sinalizacoesTema', valor: 'inexistente' }],
            tipos: ['poema'],
            formatos: { json: true, md: false },
        });
        baixarTemplate('t8');
        assert.equal(downloads.length, 0);
    });
});

// ─── Regressão: id numérico (gerarId()) vs. id string (onclick) ────
// Os botões Baixar/Editar/Excluir da lista chamam essas funções via
// onclick="...('${tpl.id}')" — o atributo HTML sempre entrega STRING,
// mesmo que tpl.id (gerado por gerarId()) seja number. Comparação
// estrita (===/!==) nunca bate nesse caso; precisa ser == (mesmo
// padrão usado em todo o resto do app pra esse descasamento — ver
// db.js/coletaneas.js/editor.js). Estes testes usam gerarId() de
// verdade (não IDs de string escritos à mão como os de cima) pra
// reproduzir o bug tal como ele acontecia na UI real.
describe('id numérico (gerarId) comparado à string do onclick', () => {
    it('baixarTemplate encontra o template mesmo com id number salvo e string recebida', async () => {
        const idNumerico = gerarId();
        db.poemas = [{ id: 'p1', titulo: 'X', sinalizacoesTema: 'Amor' }];
        salvarTemplateBruto({
            id: idNumerico,
            nome: 'Template numérico',
            criterios: [{ campo: 'sinalizacoesTema', valor: 'amor' }],
            tipos: ['poema'],
            formatos: { json: true, md: false },
        });
        baixarTemplate(String(idNumerico));
        assert.equal(downloads.length, 1);
    });

    it('excluirTemplate remove o template mesmo com id number salvo e string recebida', () => {
        const idNumerico = gerarId();
        salvarTemplateBruto({
            id: idNumerico,
            nome: 'A excluir',
            criterios: [],
            tipos: [],
            formatos: {},
        });
        excluirTemplate(String(idNumerico));
        const lista = JSON.parse(localStorage.getItem(LS_KEY_TEMPLATES));
        assert.equal(lista.length, 0);
    });

    it('abrirFormularioTemplate encontra o template e preenche o formulário (não retorna cedo)', () => {
        const idNumerico = gerarId();
        salvarTemplateBruto({
            id: idNumerico,
            nome: 'Template pra editar',
            nomeArquivo: '',
            criterios: [{ campo: 'pessoa', valor: 'dalton' }],
            tipos: ['poema'],
            formatos: { json: true, md: false },
            usarVersaoFiltrada: false,
        });

        const classListChamadas = [];
        const campoNome = {};
        elementoGetById['painel-form-template'] = {
            classList: { remove: (c) => classListChamadas.push(c) },
        };
        elementoGetById['form-tpl-nome'] = campoNome;
        elementoGetById['form-tpl-nome-arquivo'] = {};
        elementoGetById['form-tpl-tipo-poema'] = {};
        elementoGetById['form-tpl-tipo-prosa'] = {};
        elementoGetById['form-tpl-formato-json'] = {};
        elementoGetById['form-tpl-formato-md'] = {};
        elementoGetById['form-tpl-versao-filtrada'] = {};

        abrirFormularioTemplate(String(idNumerico));

        assert.ok(
            classListChamadas.includes('hidden'),
            'painel deveria ter sido revelado (classList.remove)',
        );
        assert.equal(campoNome.value, 'Template pra editar');
    });
});

describe('excluirTemplate / baixarTodosTemplates', () => {
    it('excluirTemplate remove só o template indicado, preservando os demais', () => {
        salvarTemplateBruto({ id: 'a', nome: 'A', criterios: [], tipos: [], formatos: {} });
        salvarTemplateBruto({ id: 'b', nome: 'B', criterios: [], tipos: [], formatos: {} });
        excluirTemplate('a');
        const lista = JSON.parse(localStorage.getItem(LS_KEY_TEMPLATES));
        assert.deepEqual(
            lista.map((t) => t.id),
            ['b'],
        );
    });

    it('baixarTodosTemplates agrupa os arquivos de todos os templates num único .zip', async () => {
        globalThis.window.JSZip = JSZip;
        db.poemas = [
            { id: 'p1', titulo: 'A', sinalizacoesTema: 'Amor' },
            { id: 'p2', titulo: 'B', sinalizacoesTema: 'Natureza' },
        ];
        salvarTemplateBruto({
            id: 't1',
            nome: 'Amor',
            criterios: [{ campo: 'sinalizacoesTema', valor: 'amor' }],
            tipos: ['poema'],
            formatos: { json: true, md: false },
        });
        salvarTemplateBruto({
            id: 't2',
            nome: 'Natureza',
            criterios: [{ campo: 'sinalizacoesTema', valor: 'natureza' }],
            tipos: ['poema'],
            formatos: { json: true, md: true },
        });
        definirModoLote('zip');
        await baixarTodosTemplates();
        assert.equal(downloads.length, 1);
        const zip = await JSZip.loadAsync(await downloads[0].blob.arrayBuffer());
        assert.deepEqual(Object.keys(zip.files).sort(), [
            'Amor-json.json',
            'Natureza-json.json',
            'Natureza-md.md',
        ]);
        delete globalThis.window.JSZip;
    });
});
