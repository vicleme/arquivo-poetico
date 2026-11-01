// Fase 2, Etapa 5: o campo antigo `sinalizacoesTema` (espelho dos Temas) não é
// mais gravado e é apagado de todo texto. Os Temas vivem só em `temas` (por
// id); os nomes saem de `nomesTemasDoTexto`. Estes testes cobrem a migração
// que apaga o campo (sem perder Tema), a entrada de dados antiga, a saída
// (JSON, CSV, busca) e a categoria virtual `tema`.
import './helpers/localstorage-shim.js';
import './helpers/dom-shim.js';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nomesDosTemas } from './helpers/temas-do-texto.js';

const { db, importarDB, save } = await import('../js/db.js');
const { sincronizarTemas } = await import('../js/temas.js');
const U = await import('../js/utils.js');
const { montarRegistro } = await import('../js/exportar.js');
const { colunasTexto } = await import('../js/exportar-csv.js');

const TEM_CAMPO = (t) => Object.prototype.hasOwnProperty.call(t, 'sinalizacoesTema');
const nomeDe = (id) => db.temas.find((t) => t.id == id)?.nome;

describe('sincronizarTemas apaga o campo antigo', () => {
    it('de todo texto, com ou sem Tema, sem perder nenhum Tema', () => {
        const banco = {
            temas: [{ id: 1, nome: 'Luto', notas: '' }],
            assuntos: [],
            poemas: [
                { id: 1, sinalizacoesTema: 'Amor, Exílio' }, // só o espelho
                { id: 2, temas: [{ temaId: 1, papel: 'principal' }], sinalizacoesTema: 'Luto' },
                { id: 3, temas: [{ temaId: 1, papel: '' }], sinalizacoesTema: 'outro, Luto' },
                { id: 4, sinalizacoesTema: '' },
                { id: 5 },
            ],
            prosas: [{ id: 6, sinalizacoesTema: 'Amor' }],
        };
        sincronizarTemas(banco);
        [...banco.poemas, ...banco.prosas].forEach((t) => assert.equal(TEM_CAMPO(t), false));
        assert.equal(nomesDosTemas(banco.poemas[0], banco), 'Amor, Exílio');
        assert.equal(nomesDosTemas(banco.poemas[1], banco), 'Luto');
        assert.equal(banco.poemas[1].temas[0].papel, 'principal');
        // os `temas` mandam: o espelho que divergia não acrescenta "outro"
        assert.equal(nomesDosTemas(banco.poemas[2], banco), 'Luto');
        assert.equal(nomesDosTemas(banco.poemas[3], banco), '');
        assert.equal(nomesDosTemas(banco.prosas[0], banco), 'Amor');
        assert.deepEqual(banco.temas.map((t) => t.nome).sort(), ['Amor', 'Exílio', 'Luto']);
    });

    it('é idempotente: a segunda rodada não muda nada', () => {
        const banco = {
            temas: [],
            assuntos: [],
            poemas: [{ id: 1, sinalizacoesTema: 'Amor, Exílio' }],
            prosas: [],
        };
        sincronizarTemas(banco);
        const antes = JSON.stringify(banco);
        assert.equal(sincronizarTemas(banco), 0);
        assert.equal(JSON.stringify(banco), antes);
    });

    it('`temas` só com id inexistente e o campo antigo cheio: o campo é a fonte, depois some', () => {
        const banco = {
            temas: [],
            assuntos: [],
            poemas: [
                { id: 1, temas: [{ temaId: 999, papel: 'principal' }], sinalizacoesTema: 'Luto' },
            ],
            prosas: [],
        };
        sincronizarTemas(banco);
        assert.equal(nomesDosTemas(banco.poemas[0], banco), 'Luto');
        assert.equal(TEM_CAMPO(banco.poemas[0]), false);
    });
});

describe('entrada de dados antiga (importarDB)', () => {
    beforeEach(() => localStorage.clear());

    it('backup só com o campo antigo: `temas` por id e nenhum rastro do campo no acervo', async () => {
        await importarDB({
            poemas: [
                { id: 1, titulo: 'Um', texto: 'x', sinalizacoesTema: 'Amor, Exílio' },
                { id: 2, titulo: 'Dois', texto: 'y', sinalizacoesTema: '' },
            ],
            prosas: [{ id: 3, titulo: 'Três', texto: 'z', sinalizacoesTema: 'Luto' }],
        });
        assert.deepEqual(
            db.poemas[0].temas.map((t) => nomeDe(t.temaId)),
            ['Amor', 'Exílio'],
        );
        assert.deepEqual(
            db.prosas[0].temas.map((t) => nomeDe(t.temaId)),
            ['Luto'],
        );
        // o que `exportarJSON` serializa é o próprio `db`: o campo não pode estar lá
        assert.equal(JSON.stringify(db).includes('sinalizacoesTema'), false);
    });

    it('backup muito antigo (campo `sinalizacoes` único): a tag "Brasil" chega a Tema', async () => {
        await importarDB({
            poemas: [{ id: 1, titulo: 'Velho', texto: 'x', sinalizacoes: 'Brasil, Concretista' }],
            prosas: [],
        });
        assert.deepEqual(
            db.poemas[0].temas.map((t) => nomeDe(t.temaId)),
            ['Brasil'],
        );
        assert.equal(TEM_CAMPO(db.poemas[0]), false);
    });

    it('o save() não recria o campo e não mexe em papel nem em Tema', async () => {
        await importarDB({
            poemas: [{ id: 1, titulo: 'Um', texto: 'x', sinalizacoesTema: 'Amor, Exílio' }],
            prosas: [],
        });
        db.poemas[0].temas[1].papel = 'principal';
        save();
        const antes = JSON.stringify([db.poemas, db.temas]);
        save();
        assert.equal(JSON.stringify([db.poemas, db.temas]), antes);
        assert.equal(TEM_CAMPO(db.poemas[0]), false);
        assert.equal(nomesDosTemas(db.poemas[0], db), 'Exílio, Amor');
    });
});

describe('saídas sem o campo', () => {
    beforeEach(async () => {
        localStorage.clear();
        await importarDB({
            poemas: [
                {
                    id: 1,
                    titulo: 'Um',
                    texto: 'x',
                    temas: [
                        { temaId: 7, papel: '' },
                        { temaId: 8, papel: 'principal' },
                    ],
                    sinalizacoesEstilo: [],
                },
            ],
            prosas: [],
            temas: [
                { id: 7, nome: 'Mar', notas: '' },
                { id: 8, nome: 'Luto', notas: '' },
            ],
        });
    });

    it('o registro do JSON exportado traz `temas` com nome e papel, sem o campo antigo', () => {
        const registro = montarRegistro('poema', db.poemas[0]);
        assert.equal(TEM_CAMPO(registro), false);
        assert.deepEqual(
            registro.temas.map((t) => [t.nome, t.papel]),
            [
                ['Mar', ''],
                ['Luto', 'principal'],
            ],
        );
    });

    it('a coluna `sinal_tema` do CSV continua, derivada dos `temas`', () => {
        const colunas = colunasTexto('poema');
        const coluna = colunas.find((c) => c.cabecalho === 'sinal_tema');
        assert.ok(coluna);
        assert.deepEqual(coluna.campos, [], 'categoria virtual: sem campo de dado');
        const valor = coluna.valor(db.poemas[0], { banco: db });
        assert.equal(valor, 'Luto | Mar');
    });

    it('a contagem da coluna Etiquetas conta os Temas por id', () => {
        assert.equal(U.CAMPOS_CONTAVEIS.etiquetas.contar(db.poemas[0], db), 2);
        assert.equal(U.CAMPOS_CONTAVEIS.etiquetas.contar(db.poemas[0], { temas: [] }), 0);
    });
});

describe('categoria virtual `tema`', () => {
    it('só `tema` é virtual; as demais categorias continuam com campo de dado', () => {
        assert.equal(U.categoriaEhVirtual('tema'), true);
        Object.keys(U.SINALIZACOES_CATEGORIAS)
            .filter((k) => k !== 'tema')
            .forEach((k) => assert.equal(U.categoriaEhVirtual(k), false, k));
    });

    it('valorDaCategoria lê o Tema pelo cadastro e ignora o campo antigo', () => {
        const temas = [{ id: 1, nome: 'Luto', notas: '' }];
        const item = { temas: [{ temaId: 1, papel: '' }], sinalizacoesTema: 'lixo' };
        assert.equal(U.valorDaCategoria(item, 'tema', { temas }), 'Luto');
        assert.equal(U.sinalizacoesCombinadas(item, { temas }), 'Luto');
        assert.equal(U.valorDaCategoria(item, 'tema'), '');
    });
});

describe('quem ainda cita `sinalizacoesTema` no código', () => {
    const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../js');
    const semComentarios = (src) =>
        src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

    it('só a migração, a leitura do formato antigo e a entrada de dados', () => {
        const achados = {};
        fs.readdirSync(raiz)
            .filter((f) => f.endsWith('.js'))
            .forEach((f) => {
                const n = (
                    semComentarios(fs.readFileSync(path.join(raiz, f), 'utf8')).match(
                        /sinalizacoesTema/g,
                    ) || []
                ).length;
                if (n) achados[f] = n;
            });
        assert.deepEqual(Object.keys(achados).sort(), [
            'db.js', // migrarSinalizacoes: tag solta "Brasil" do formato mais antigo
            'importar-aditivo.js', // tira o campo do texto que chega de um JSON antigo
            'pacote-texto.js', // pacotes da Biblioteca ainda saem no formato antigo
            'temas.js', // migração: lê e apaga o campo
            'utils.js', // identificador da categoria virtual e leitor do formato antigo
        ]);
    });
});
