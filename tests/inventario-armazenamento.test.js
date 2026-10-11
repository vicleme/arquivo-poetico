import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    BANCOS_INDEXEDDB,
    CHAVES_DB,
    CHAVES_LOCALSTORAGE,
    PREFIXOS_LOCALSTORAGE,
    categoriaValida,
    chavesDbDe,
    chavesLocalStorageDe,
    classificarBancoIndexedDB,
    classificarChaveDb,
    classificarChaveLocalStorage,
    prefixosLocalStorageDe,
} from '../js/inventario-armazenamento.js';

// Mesmo padrão de wiring-onclick.test.js e sinalizacoes-consistencia.test.js:
// lê o código-fonte como texto, sem DOM.
//
// Por que existe (Fase 13, etapa 13-0): "Esvaziar o acervo" precisa saber o
// que cada coisa guardada no navegador é (dado, preferência, pré-pronto,
// estado ou retrato). Cada fase nova acrescenta chaves; sem este teste, a
// função de apagar esqueceria a próxima. Chave nova: classifique em
// js/inventario-armazenamento.js.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(__dirname, '..');
const JS_DIR = path.join(RAIZ, 'js');

const lerArquivo = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

const FONTES = [
    ...fs
        .readdirSync(JS_DIR)
        .filter((f) => f.endsWith('.js') && f !== 'inventario-armazenamento.js')
        .map((f) => path.join('js', f)),
    ...fs.readdirSync(RAIZ).filter((f) => f.endsWith('.html')),
    ...fs
        .readdirSync(path.join(RAIZ, 'modais'))
        .filter((f) => f.endsWith('.html'))
        .map((f) => path.join('modais', f)),
];

function achar(regex, grupo = 0) {
    const achados = [];
    for (const rel of FONTES) {
        const texto = lerArquivo(rel);
        for (const m of texto.matchAll(regex)) achados.push({ arquivo: rel, valor: m[grupo] });
    }
    return achados;
}

describe('inventário de armazenamento: consistência interna', () => {
    it('toda entrada tem categoria válida', () => {
        const todas = [
            ...CHAVES_LOCALSTORAGE,
            ...PREFIXOS_LOCALSTORAGE,
            ...BANCOS_INDEXEDDB,
            ...CHAVES_DB,
        ];
        for (const e of todas) {
            assert.ok(categoriaValida(e.categoria), `categoria inválida em ${JSON.stringify(e)}`);
        }
    });

    it('não há entrada repetida', () => {
        const chaves = CHAVES_LOCALSTORAGE.map((e) => e.chave);
        assert.equal(new Set(chaves).size, chaves.length, 'chave repetida no localStorage');
        const prefixos = PREFIXOS_LOCALSTORAGE.map((e) => e.prefixo);
        assert.equal(new Set(prefixos).size, prefixos.length, 'prefixo repetido');
        const dbs = CHAVES_DB.map((e) => e.chave);
        assert.equal(new Set(dbs).size, dbs.length, 'chave repetida no db');
    });

    it('nenhuma chave exata cai dentro de um prefixo (classificação ambígua)', () => {
        for (const { chave } of CHAVES_LOCALSTORAGE) {
            const caiem = PREFIXOS_LOCALSTORAGE.filter((p) => chave.startsWith(p.prefixo));
            assert.deepEqual(
                caiem,
                [],
                `${chave} começa com um prefixo registrado e ficaria duplamente classificada`,
            );
        }
    });

    it('nenhum prefixo é prefixo de outro', () => {
        for (const a of PREFIXOS_LOCALSTORAGE) {
            for (const b of PREFIXOS_LOCALSTORAGE) {
                if (a === b) continue;
                assert.ok(
                    !b.prefixo.startsWith(a.prefixo),
                    `${a.prefixo} engole ${b.prefixo}: a classificação dependeria da ordem`,
                );
            }
        }
    });

    it('os classificadores respondem pelas listas e devolvem null para o desconhecido', () => {
        assert.equal(classificarChaveLocalStorage('arquivoPoetico_v3'), 'dado');
        assert.equal(classificarChaveLocalStorage('arquivoPoetico_colunas_poemas'), 'preferencia');
        assert.equal(classificarChaveLocalStorage('arquivoPoetico_est_papelTema'), 'preferencia');
        assert.equal(classificarChaveLocalStorage('arquivoPoetico_inventada'), null);
        assert.equal(classificarBancoIndexedDB('arquivoPoetico_snapshots'), 'retrato');
        assert.equal(classificarBancoIndexedDB('outro'), null);
        assert.equal(classificarChaveDb('periodosHistoricosOcultos'), 'pre-pronto');
        assert.equal(classificarChaveDb('inventada'), null);
    });

    it('os seletores por categoria devolvem só o que pertence a ela', () => {
        assert.deepEqual(chavesLocalStorageDe('dado').sort(), [
            'arquivoPoetico_v3',
            'arquivoPoetico_versoesFiltradas_v1',
        ]);
        assert.ok(prefixosLocalStorageDe('preferencia').includes('arquivoPoetico_est_'));
        assert.ok(chavesDbDe('pre-pronto').includes('movimentosEscolas'));
        assert.ok(!chavesDbDe('dado').includes('movimentosEscolas'));
    });
});

describe('inventário de armazenamento: o código-fonte não usa nada sem classificação', () => {
    it('todo literal arquivoPoetico_* no código está classificado', () => {
        const achados = achar(/arquivoPoetico_[A-Za-z0-9_]*/g);
        assert.ok(achados.length > 20, 'a busca deveria achar dezenas de ocorrências');
        const sem = achados.filter(({ valor }) => {
            const ehPrefixo = valor.endsWith('_');
            if (ehPrefixo) return !PREFIXOS_LOCALSTORAGE.some((p) => p.prefixo === valor);
            return (
                classificarChaveLocalStorage(valor) === null &&
                classificarBancoIndexedDB(valor) === null
            );
        });
        assert.deepEqual(
            sem,
            [],
            'Chave sem classificação em js/inventario-armazenamento.js: ' +
                [...new Set(sem.map((s) => `${s.valor} (${s.arquivo})`))].join(', '),
        );
    });

    it('todo literal passado ao localStorage fica no espaço arquivoPoetico_', () => {
        const achados = achar(
            /localStorage\.(?:getItem|setItem|removeItem)\(\s*['"`]([^'"`]+)['"`]/g,
            1,
        );
        const fora = achados.filter(({ valor }) => !valor.startsWith('arquivoPoetico_'));
        assert.deepEqual(
            fora,
            [],
            'localStorage com chave fora de arquivoPoetico_*: o apagar não a enxergaria',
        );
    });

    it('ninguém usa sessionStorage, cookies ou Cache API sem avisar', () => {
        for (const regex of [
            /\bsessionStorage\b/g,
            /document\.cookie/g,
            /\bcaches\.(open|keys)\b/g,
        ]) {
            assert.deepEqual(
                achar(regex),
                [],
                `${regex} apareceu: classifique em js/inventario-armazenamento.js e trate no apagar`,
            );
        }
    });

    it('todo banco do IndexedDB aberto no código está na lista', () => {
        const aberturas = achar(/indexedDB\.open\(/g);
        assert.equal(
            aberturas.length,
            BANCOS_INDEXEDDB.length,
            `${aberturas.length} indexedDB.open no código contra ${BANCOS_INDEXEDDB.length} bancos listados`,
        );
        const nomes = achar(/const DB_NAME\s*=\s*['"]([^'"]+)['"]/g, 1).map((a) => a.valor);
        for (const nome of nomes) {
            assert.notEqual(
                classificarBancoIndexedDB(nome),
                null,
                `banco ${nome} sem classificação`,
            );
        }
    });
});

describe('inventário de armazenamento: chaves do db', () => {
    // importarDB (db.js) copia cada chave do backup para o db: é a lista
    // autoritativa do que o acervo guarda.
    const dbJs = lerArquivo(path.join('js', 'db.js'));
    const inicio = dbJs.indexOf('export async function importarDB(');
    assert.ok(inicio >= 0, 'importarDB não encontrada em db.js');
    const fim = dbJs.indexOf('\n}\n', inicio);
    const corpo = dbJs.slice(inicio, fim);
    const copiadas = [
        ...new Set([...corpo.matchAll(/^\s{4}db\.([A-Za-z]+)\s*=/gm)].map((m) => m[1])),
    ];

    it('a leitura de importarDB achou as chaves esperadas', () => {
        assert.ok(copiadas.length >= 25, `só ${copiadas.length} chaves achadas em importarDB`);
        assert.ok(copiadas.includes('poemas'));
        assert.ok(copiadas.includes('moldes'));
    });

    it('toda chave que importarDB copia está classificada', () => {
        const sem = copiadas.filter((c) => classificarChaveDb(c) === null);
        assert.deepEqual(sem, [], `Chave do db sem classificação: ${sem.join(', ')}`);
    });

    it('toda chave classificada ainda existe em importarDB (sem sobra)', () => {
        const sobra = CHAVES_DB.map((e) => e.chave).filter((c) => !copiadas.includes(c));
        assert.deepEqual(sobra, [], `Classificada mas ausente de importarDB: ${sobra.join(', ')}`);
    });
});
