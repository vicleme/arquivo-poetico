import './helpers/localstorage-shim.js';
import './helpers/dom-shim.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { db } from '../js/db.js';
import {
    separarLinhasComuns,
    blocoLinhasComuns,
    ROTULOS_COMUNS,
    TITULO_COMUNS,
} from '../js/exportar-comuns.js';
import { gerarMarkdownExportacao, itemParaMarkdown, linhasMetaDoItem } from '../js/exportar-md.js';

const mapa = (obj) => new Map(Object.entries(obj));

describe('separarLinhasComuns (lógica pura)', () => {
    it('sobe o rótulo que é igual em todos os textos e deixa o diferente', () => {
        const { comuns, omitir } = separarLinhasComuns([
            mapa({ Autoria: ['- **Autoria:** A (Autor)'], Fonte: ['- **Fonte:** X'] }),
            mapa({ Autoria: ['- **Autoria:** A (Autor)'], Fonte: ['- **Fonte:** Y'] }),
        ]);
        assert.deepEqual(comuns, ['- **Autoria:** A (Autor)']);
        assert.deepEqual([...omitir], ['Autoria']);
    });

    it('com menos de 2 textos não agrupa nada', () => {
        const um = separarLinhasComuns([mapa({ Autoria: ['- **Autoria:** A (Autor)'] })]);
        assert.deepEqual(um.comuns, []);
        assert.equal(um.omitir.size, 0);
        assert.deepEqual(separarLinhasComuns([]).comuns, []);
    });

    it('texto sem a linha conta como diferente (regra estrita)', () => {
        const { comuns } = separarLinhasComuns([
            mapa({ Grafia: ['- **Grafia:** Atual'] }),
            mapa({ Grafia: ['- **Grafia:** Atual'] }),
            mapa({}),
        ]);
        assert.deepEqual(comuns, []);
    });

    it('rótulo ausente no primeiro texto nunca sobe', () => {
        const { comuns } = separarLinhasComuns([mapa({}), mapa({})]);
        assert.deepEqual(comuns, []);
    });

    it('rótulo com várias linhas (Domínio público) só sobe se a lista inteira for igual', () => {
        const duas = ['- **Domínio público:** A', '- **Domínio público:** B'];
        const iguais = separarLinhasComuns([
            mapa({ 'Domínio público': duas }),
            mapa({ 'Domínio público': [...duas] }),
        ]);
        assert.deepEqual(iguais.comuns, duas);
        const diferentes = separarLinhasComuns([
            mapa({ 'Domínio público': duas }),
            mapa({ 'Domínio público': [duas[0]] }),
        ]);
        assert.deepEqual(diferentes.comuns, []);
    });

    it('as linhas do topo seguem a ordem de ROTULOS_COMUNS, não a ordem dos textos', () => {
        const linhas = {
            Idioma: ['- **Idioma:** pt-BR'],
            Autoria: ['- **Autoria:** A (Autor)'],
        };
        const { comuns } = separarLinhasComuns([mapa(linhas), mapa(linhas)]);
        assert.deepEqual(comuns, ['- **Autoria:** A (Autor)', '- **Idioma:** pt-BR']);
    });

    it('a lista de rótulos cobre o combinado', () => {
        assert.deepEqual(ROTULOS_COMUNS, [
            'Autoria',
            'Fonte',
            'Edição',
            'Link da fonte',
            'Grafia',
            'Texto conferido',
            'Domínio público',
            'Corrente literária',
            'Idioma',
        ]);
    });

    it('blocoLinhasComuns é vazio sem linhas e traz título, frase e linhas quando há', () => {
        assert.equal(blocoLinhasComuns([]), '');
        const bloco = blocoLinhasComuns(['- **Fonte:** Obra própria']);
        assert.match(bloco, new RegExp(`^## ${TITULO_COMUNS}\\n\\n`));
        assert.match(bloco, /não se repetem em cada um\./);
        assert.match(bloco, /- \*\*Fonte:\*\* Obra própria\n\n$/);
        assert.doesNotMatch(bloco, /—/);
    });
});

function resetarDb() {
    db.livros = [];
    db.partes = [];
    db.secoes = [];
    db.poemas = [];
    db.prosas = [];
    db.elementos = [];
    db.coletaneas = [];
    db.itensColetanea = [];
    db.autores = [{ id: 1, nome: 'Victor Leme', sobre: '' }];
    db.movimentosEscolas = [];
}

const autoria = [{ autorId: 1, papel: 'Autor' }];
const obraPropria = (extra = {}) => ({ origem: 'Obra própria', ...extra });

function poema(id, extra = {}) {
    return { id, titulo: `Poema ${id}`, texto: `verso ${id}`, autoria, ...extra };
}

describe('gerarMarkdownExportacao com linhas comuns', () => {
    beforeEach(resetarDb);

    it('sobe Autoria e Fonte iguais para o topo e tira de cada texto', () => {
        const itens = [
            poema(1, { fonteTexto: obraPropria() }),
            poema(2, { fonteTexto: obraPropria() }),
            poema(3, { fonteTexto: obraPropria() }),
        ];
        const md = gerarMarkdownExportacao(itens);
        assert.match(md, /## Comum a todos os textos/);
        const [topo, ...resto] = md.split(/^## 1\. /m);
        assert.match(topo, /- \*\*Autoria:\*\* Victor Leme \(Autor\)/);
        assert.match(topo, /- \*\*Fonte:\*\* Obra própria/);
        assert.doesNotMatch(resto.join(''), /\*\*Autoria:\*\*/);
        assert.doesNotMatch(resto.join(''), /\*\*Fonte:\*\*/);
        assert.equal((md.match(/\*\*Autoria:\*\*/g) || []).length, 1);
    });

    it('só sobe o rótulo que é igual em todos; o que difere continua em cada texto', () => {
        const itens = [
            poema(1, { fonteTexto: obraPropria() }),
            poema(2, { fonteTexto: { origem: 'Antologia X' } }),
        ];
        const md = gerarMarkdownExportacao(itens);
        assert.equal((md.match(/\*\*Autoria:\*\*/g) || []).length, 1);
        assert.equal((md.match(/\*\*Fonte:\*\*/g) || []).length, 2);
    });

    it('texto sem a linha impede o rótulo de subir', () => {
        const itens = [poema(1), poema(2), { id: 3, titulo: 'Poema 3', texto: 'v' }];
        const md = gerarMarkdownExportacao(itens);
        assert.doesNotMatch(md, /Comum a todos os textos/);
        assert.equal((md.match(/\*\*Autoria:\*\*/g) || []).length, 2);
    });

    it('um texto só sai como sempre, sem bloco comum', () => {
        const md = gerarMarkdownExportacao([poema(1, { fonteTexto: obraPropria() })]);
        assert.doesNotMatch(md, /Comum a todos os textos/);
        assert.match(md, /\*\*Autoria:\*\*/);
        assert.match(md, /\*\*Fonte:\*\*/);
    });

    it('agruparComuns: false mantém todas as linhas em cada texto', () => {
        const itens = [poema(1), poema(2)];
        const md = gerarMarkdownExportacao(itens, { agruparComuns: false });
        assert.doesNotMatch(md, /Comum a todos os textos/);
        assert.equal((md.match(/\*\*Autoria:\*\*/g) || []).length, 2);
    });

    it('Idioma só sobe quando é igual em todos (regra absoluta, sem maioria)', () => {
        const todos = gerarMarkdownExportacao([
            poema(1, { idioma: 'pt-BR' }),
            poema(2, { idioma: 'pt-BR' }),
        ]);
        assert.equal((todos.match(/\*\*Idioma:\*\*/g) || []).length, 1);
        const misto = gerarMarkdownExportacao([
            poema(1, { idioma: 'pt-BR' }),
            poema(2, { idioma: 'en' }),
        ]);
        assert.equal((misto.match(/\*\*Idioma:\*\*/g) || []).length, 2);
    });

    it('o resto do texto não muda: o cabeçalho e o Texto continuam em cada item', () => {
        const itens = [poema(1), poema(2)];
        const md = gerarMarkdownExportacao(itens);
        assert.match(md, /## 1\. "Poema 1"/);
        assert.match(md, /## 2\. "Poema 2"/);
        assert.match(md, /verso 1/);
        assert.match(md, /verso 2/);
    });
});

describe('itemParaMarkdown e linhasMetaDoItem', () => {
    beforeEach(resetarDb);

    it('sem opções, itemParaMarkdown traz tudo (Visualização e item avulso não mudam)', () => {
        const md = itemParaMarkdown(poema(1, { fonteTexto: obraPropria() }), 1);
        assert.match(md, /\*\*Autoria:\*\*/);
        assert.match(md, /\*\*Fonte:\*\*/);
    });

    it('omitirRotulos tira só os rótulos pedidos', () => {
        const md = itemParaMarkdown(poema(1, { fonteTexto: obraPropria() }), 1, {
            omitirRotulos: ['Fonte'],
        });
        assert.match(md, /\*\*Autoria:\*\*/);
        assert.doesNotMatch(md, /\*\*Fonte:\*\*/);
    });

    it('a omissão de uma chamada não vaza para a seguinte', () => {
        const item = poema(1, { fonteTexto: obraPropria() });
        itemParaMarkdown(item, 1, { omitirRotulos: ['Autoria', 'Fonte'] });
        assert.match(itemParaMarkdown(item, 1), /\*\*Autoria:\*\*/);
    });

    it('linhasMetaDoItem devolve as linhas geradas, por rótulo, sem a quebra final', () => {
        const linhas = linhasMetaDoItem(poema(1, { fonteTexto: obraPropria(), idioma: 'en' }));
        assert.deepEqual(linhas.get('Autoria'), ['- **Autoria:** Victor Leme (Autor)']);
        assert.deepEqual(linhas.get('Fonte'), ['- **Fonte:** Obra própria']);
        assert.deepEqual(linhas.get('Idioma'), ['- **Idioma:** en']);
        assert.equal(linhas.has('Edição'), false);
    });

    it('linha escrita pelo usuário no corpo do texto não é confundida com metadado', () => {
        const linhas = linhasMetaDoItem(
            poema(1, { texto: '- **Autoria:** Fulano (Autor)', notas: '- **Fonte:** falsa' }),
        );
        assert.deepEqual(linhas.get('Autoria'), ['- **Autoria:** Victor Leme (Autor)']);
        assert.equal(linhas.has('Fonte'), false);
    });
});
