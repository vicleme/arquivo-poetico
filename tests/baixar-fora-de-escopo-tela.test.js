import './helpers/dom-real.js';

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// T11, entrega 4b: a caixa "Incluir Fora de escopo" (lembrada) no Baixar do Ver,
// do card e da barra da aba Livros. Só vale junto da estrutura; a aba
// Coletâneas não tem a caixa.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
globalThis.fetch = async (url) => ({
    ok: true,
    status: 200,
    text: async () =>
        fs.readFileSync(path.resolve(__dirname, '../modais', path.basename(url)), 'utf8'),
});
const trecho = (inicio, fim) => {
    const i = html.indexOf(inicio);
    const f = html.indexOf(fim, i);
    assert.ok(i !== -1 && f !== -1, `trecho ${inicio} não achado`);
    return html.slice(i, f);
};
document.body.innerHTML = `<main>${trecho('<section id="livros"', 'id="lista-livros"')}id="lista-livros"></div></section>
${trecho('<section id="coletaneas"', '<section id="partes"')}</main><div id="modais-container"></div>`;

const { db } = await import('../js/db.js');
const { registrarModal, toggleModal } = await import('../js/modais.js');
const { renderLivros } = await import('../js/render-listas.js');
const { renderColetaneas } = await import('../js/coletaneas.js');
const {
    getIncluirForaDeEscopoBaixarLivros,
    salvarIncluirForaDeEscopoBaixarLivros,
    salvarIncluirEstruturaBaixarLivros,
    salvarFormatoBaixarLivros,
    baixarLivro,
} = await import('../js/baixar-livros.js');
const { baixarLivrosDaAba } = await import('../js/selecao-livros-aba.js');
const { abrirVisualizacaoLivro, baixarDoModalVisualizacaoLivro } =
    await import('../js/visualizar-livro.js');
registrarModal('modal-visualizar-livro', 'modal-visualizar-livro.html', () => {});

const CHAVE = 'arquivoPoetico_incluirForaDeEscopo_livros';
const el = (id) => document.getElementById(id);

function cenario() {
    Object.assign(db, {
        livros: [
            { id: 1, titulo: 'Livro Um', tipo: 'Inéditos', sequencia: 1 },
            { id: 2, titulo: 'Livro Dois', tipo: 'Inéditos', sequencia: 2 },
            { id: 3, titulo: 'Antologia', tipo: 'Coletânea', sequencia: 3 },
        ],
        autores: [],
        colaboradores: [],
        partes: [],
        secoes: [
            { id: 20, paiTipo: 'livro', paiId: 1, titulo: 'Seção X', sequencia: 1 },
            { id: 21, paiTipo: 'livro', paiId: 2, titulo: 'Cofre', sequencia: 1 },
        ],
        elementos: [],
        itensColetanea: [],
        poemas: [
            {
                id: 1,
                titulo: 'Poema Firme',
                texto: 'CORPO-FIRME',
                status: 'publicado',
                paiTipo: 'secao',
                paiId: 20,
                sequencia: 1,
                livrosIds: [1],
            },
            {
                id: 2,
                titulo: 'Poema Cortado',
                texto: 'CORPO-CORTADO',
                status: 'descartado',
                paiTipo: 'secao',
                paiId: 20,
                sequencia: null,
                livrosIds: [1],
                cortadoDe: { livro: 'Livro Um', secao: 'Seção X', posicao: 3 },
            },
            {
                id: 3,
                titulo: 'Poema Mudado',
                texto: 'CORPO-MUDADO',
                status: 'migrado',
                paiTipo: 'secao',
                paiId: 21,
                sequencia: 1,
                livrosIds: [2],
                cortadoDe: { livro: 'Livro Um', secao: 'Seção X', posicao: 2 },
                lancadoEm: { livro: 'Livro Dois', secao: 'Cofre' },
            },
        ],
        prosas: [],
    });
}

let downloads;
let criarOriginal;
let urlOriginal;
let revogarOriginal;
function capturarDownloads() {
    downloads = [];
    criarOriginal = document.createElement;
    urlOriginal = globalThis.URL.createObjectURL;
    revogarOriginal = globalThis.URL.revokeObjectURL;
    const porUrl = new Map();
    globalThis.URL.createObjectURL = (blob) => {
        const url = `blob:fora-${porUrl.size}`;
        porUrl.set(url, blob);
        return url;
    };
    globalThis.URL.revokeObjectURL = () => {};
    document.createElement = (tag) => {
        const e = criarOriginal.call(document, tag);
        if (tag !== 'a') return e;
        const clicar = e.click.bind(e);
        e.click = () => {
            downloads.push({ nome: e.download, blob: porUrl.get(e.href) });
            clicar();
        };
        return e;
    };
}
function restaurarDownloads() {
    document.createElement = criarOriginal;
    globalThis.URL.createObjectURL = urlOriginal;
    globalThis.URL.revokeObjectURL = revogarOriginal;
}
const texto = async (blob) => Buffer.from(await blob.arrayBuffer()).toString('utf-8');

describe('escolha lembrada de "Incluir Fora de escopo"', () => {
    beforeEach(() => localStorage.clear());

    it('desligada na primeira vez', () => {
        assert.equal(getIncluirForaDeEscopoBaixarLivros(), false);
    });

    it('guarda e devolve a escolha, em chave própria', () => {
        salvarIncluirForaDeEscopoBaixarLivros(true);
        assert.equal(localStorage.getItem(CHAVE), '1');
        assert.equal(getIncluirForaDeEscopoBaixarLivros(), true);
        salvarIncluirForaDeEscopoBaixarLivros(false);
        assert.equal(localStorage.getItem(CHAVE), '0');
        assert.equal(getIncluirForaDeEscopoBaixarLivros(), false);
    });

    it('a chave está no inventário de armazenamento', () => {
        const fonte = fs.readFileSync(
            path.resolve(__dirname, '../js/inventario-armazenamento.js'),
            'utf8',
        );
        assert.match(fonte, /prefixo: 'arquivoPoetico_incluirForaDeEscopo_'/);
    });
});

describe('barra da aba Livros', () => {
    beforeEach(() => {
        localStorage.clear();
        cenario();
        capturarDownloads();
    });
    afterEach(restaurarDownloads);

    it('a caixa existe, abre desligada e desabilitada enquanto a estrutura está desligada', () => {
        renderLivros();
        const caixa = el('livros-baixar-fora-de-escopo');
        assert.ok(caixa);
        assert.equal(caixa.checked, false);
        assert.equal(caixa.disabled, true);
    });

    it('com a estrutura ligada, a caixa fica habilitada em todos os formatos', () => {
        salvarIncluirEstruturaBaixarLivros(true);
        for (const f of ['json', 'md', 'csv', 'pdf', 'docx']) {
            salvarFormatoBaixarLivros(f);
            renderLivros();
            assert.equal(el('livros-baixar-fora-de-escopo').disabled, false, f);
        }
    });

    it('marcar e desmarcar a estrutura habilita e desabilita a caixa na hora', () => {
        renderLivros();
        const estrutura = el('livros-baixar-estrutura');
        const fora = el('livros-baixar-fora-de-escopo');
        estrutura.checked = true;
        estrutura.onchange();
        assert.equal(fora.disabled, false);
        estrutura.checked = false;
        estrutura.onchange();
        assert.equal(fora.disabled, true);
    });

    it('abre ligada na escolha lembrada, e marcar guarda', () => {
        salvarIncluirEstruturaBaixarLivros(true);
        salvarIncluirForaDeEscopoBaixarLivros(true);
        renderLivros();
        const caixa = el('livros-baixar-fora-de-escopo');
        assert.equal(caixa.checked, true);
        caixa.checked = false;
        caixa.onchange();
        assert.equal(getIncluirForaDeEscopoBaixarLivros(), false);
    });

    it('Baixar da barra leva o Fora de escopo só com a estrutura e a caixa ligadas', async () => {
        salvarFormatoBaixarLivros('json');
        salvarIncluirEstruturaBaixarLivros(true);
        salvarIncluirForaDeEscopoBaixarLivros(true);
        renderLivros();
        baixarLivrosDaAba();
        const json = JSON.parse(await texto(downloads[0].blob));
        const livroUm = json.itens.find((i) => i.titulo === 'Livro Um');
        assert.ok(livroUm.estrutura_arvore.fora_de_escopo);
        assert.equal(
            livroUm.estrutura_arvore.fora_de_escopo.descartados[0].titulo,
            'Poema Cortado',
        );
        assert.doesNotMatch(JSON.stringify(json), /CORPO-/);
    });

    it('Fora de escopo ligado e estrutura desligada: o arquivo sai sem estrutura', async () => {
        salvarFormatoBaixarLivros('json');
        salvarIncluirEstruturaBaixarLivros(false);
        salvarIncluirForaDeEscopoBaixarLivros(true);
        renderLivros();
        baixarLivrosDaAba();
        const json = JSON.parse(await texto(downloads[0].blob));
        assert.ok(json.itens.every((i) => i.estrutura_arvore === undefined));
    });

    it('o botão do card usa a escolha lembrada das duas caixas', async () => {
        salvarIncluirEstruturaBaixarLivros(true);
        salvarIncluirForaDeEscopoBaixarLivros(true);
        baixarLivro(1, 'json');
        const json = JSON.parse(await texto(downloads[0].blob));
        assert.ok(json.itens[0].estrutura_arvore.fora_de_escopo);
    });
});

describe('Ver do livro', () => {
    beforeEach(async () => {
        localStorage.clear();
        cenario();
        capturarDownloads();
        await abrirVisualizacaoLivro(1);
    });
    afterEach(async () => {
        restaurarDownloads();
        if (el('modal-visualizar-livro')) await toggleModal('modal-visualizar-livro');
    });

    it('a caixa existe, abre desligada e o Baixar de sempre não leva o Fora de escopo', async () => {
        const caixa = el('visualizar-livro-baixar-fora-de-escopo');
        assert.ok(caixa);
        assert.equal(caixa.checked, false);
        salvarIncluirEstruturaBaixarLivros(true);
        baixarDoModalVisualizacaoLivro('json');
        const item = JSON.parse(await texto(downloads[0].blob)).itens[0];
        assert.ok(item.estrutura_arvore);
        assert.equal(item.estrutura_arvore.fora_de_escopo, undefined);
    });

    it('marcar a caixa guarda a escolha e o Baixar leva o Fora de escopo', async () => {
        const estrutura = el('visualizar-livro-baixar-estrutura');
        estrutura.checked = true;
        estrutura.onchange();
        const caixa = el('visualizar-livro-baixar-fora-de-escopo');
        assert.equal(caixa.disabled, false);
        caixa.checked = true;
        caixa.onchange();
        assert.equal(getIncluirForaDeEscopoBaixarLivros(), true);
        baixarDoModalVisualizacaoLivro('json');
        const item = JSON.parse(await texto(downloads[0].blob)).itens[0];
        assert.equal(item.estrutura_arvore.fora_de_escopo.migrados[0].titulo, 'Poema Mudado');
    });

    it('.md traz o bloco "Fora de escopo:" com a opção ligada', async () => {
        salvarIncluirEstruturaBaixarLivros(true);
        salvarIncluirForaDeEscopoBaixarLivros(true);
        baixarDoModalVisualizacaoLivro('md');
        const md = await texto(downloads[0].blob);
        assert.match(md, /Fora de escopo:/);
        assert.match(md, /Poema Cortado/);
        assert.doesNotMatch(md, /CORPO-/);
    });
});

describe('aba Coletâneas', () => {
    beforeEach(() => {
        localStorage.clear();
        cenario();
        capturarDownloads();
        renderColetaneas();
    });
    afterEach(restaurarDownloads);

    it('não ganha a caixa de Fora de escopo (Coletânea não tem)', () => {
        assert.ok(el('coletanea-baixar-estrutura'));
        assert.equal(el('coletanea-baixar-fora-de-escopo'), null);
        assert.equal(
            document.querySelector('#coletaneas input[data-incluir-fora-de-escopo]'),
            null,
        );
    });

    it('baixar a coletânea com a escolha ligada não traz Fora de escopo', async () => {
        salvarIncluirEstruturaBaixarLivros(true);
        salvarIncluirForaDeEscopoBaixarLivros(true);
        baixarLivro(3, 'json');
        const item = JSON.parse(await texto(downloads[0].blob)).itens[0];
        assert.equal(item.estrutura_arvore?.fora_de_escopo, undefined);
    });
});
