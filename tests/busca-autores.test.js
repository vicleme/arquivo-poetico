import './helpers/localstorage-shim.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { filtrarAutores, decorarAutorParaBusca, CAMPOS_ATRIBUTO_AUTOR, PREFIXOS_CANONICOS_AUTOR } =
    await import('../js/busca-autores.js');
const { parseConsultaBusca } = await import('../js/utils.js');

const AUTORES = [
    {
        id: 1,
        nome: 'Fernando Pessoa',
        nacionalidade: 'Portuguesa',
        nascimento: { dia: 13, mes: 6, ano: 1888 },
        obito: { dia: 30, mes: 11, ano: 1935 },
        ocupacoes: 'Tradutor, Comerciante',
        nomesLiterarios: [
            { nome: 'Álvaro de Campos', tipo: 'Heterônimo' },
            { nome: 'Bernardo Soares', tipo: 'Heterônimo' },
        ],
        orientacaoSexual: 'Heterossexual',
        condicoesClinicas: [{ nome: 'Depressão', tipo: 'Mental' }],
        religiao: 'Esoterismo',
    },
    {
        id: 2,
        nome: 'Machado de Assis',
        nacionalidade: 'Brasileira',
        nascimento: { ano: 1839 },
        obito: { ano: 1908 },
        ocupacoes: 'Funcionário público',
        deficiencias: [{ nome: 'Epilepsia', tipo: 'Física' }],
        nomesLiterarios: [{ nome: 'Job', tipo: 'Pseudônimo' }],
    },
    { id: 3, nome: 'Victor Leme', souEu: true },
];

const ids = (lista) => lista.map((a) => a.id);

describe('filtrarAutores', () => {
    it('sem consulta devolve a lista inteira', () => {
        assert.deepEqual(ids(filtrarAutores(AUTORES, '')), [1, 2, 3]);
        assert.deepEqual(ids(filtrarAutores(AUTORES, '   ')), [1, 2, 3]);
    });

    it('busca solta acha por nome, ignorando acento e caixa', () => {
        assert.deepEqual(ids(filtrarAutores(AUTORES, 'alvaro')), [1]);
        assert.deepEqual(ids(filtrarAutores(AUTORES, 'MACHADO')), [2]);
    });

    it('prefixo restringe ao campo', () => {
        assert.deepEqual(ids(filtrarAutores(AUTORES, 'nacionalidade:brasileira')), [2]);
        assert.deepEqual(ids(filtrarAutores(AUTORES, 'ocupacao:tradutor')), [1]);
        // "Pessoa" está no nome, não na nacionalidade
        assert.deepEqual(ids(filtrarAutores(AUTORES, 'nacionalidade:pessoa')), []);
    });

    it('prefixo aceita acento no nome do campo', () => {
        assert.deepEqual(ids(filtrarAutores(AUTORES, 'religião:esoterismo')), [1]);
    });

    it('E, OU, exclusão e frase exata', () => {
        assert.deepEqual(ids(filtrarAutores(AUTORES, 'portuguesa ou brasileira')), [1, 2]);
        assert.deepEqual(ids(filtrarAutores(AUTORES, 'portuguesa brasileira')), []);
        assert.deepEqual(ids(filtrarAutores(AUTORES, 'de -nacionalidade:brasileira')), [1]);
        assert.deepEqual(ids(filtrarAutores(AUTORES, 'nome:"machado de assis"')), [2]);
    });

    it('campo:* checa presença e -campo:* checa vazio', () => {
        assert.deepEqual(ids(filtrarAutores(AUTORES, 'obito:*')), [1, 2]);
        assert.deepEqual(ids(filtrarAutores(AUTORES, '-obito:*')), [3]);
        assert.deepEqual(ids(filtrarAutores(AUTORES, 'voce:*')), [3]);
    });

    it('heterônimo e pseudônimo separam pelo tipo do nome literário', () => {
        assert.deepEqual(ids(filtrarAutores(AUTORES, 'heteronimo:*')), [1]);
        assert.deepEqual(ids(filtrarAutores(AUTORES, 'pseudonimo:job')), [2]);
        assert.deepEqual(ids(filtrarAutores(AUTORES, 'literario:job')), [2]);
    });

    it('datas: casa pelo ano e pela data formatada', () => {
        assert.deepEqual(ids(filtrarAutores(AUTORES, 'obito:1935')), [1]);
        assert.deepEqual(ids(filtrarAutores(AUTORES, 'nascimento:13/06')), [1]);
    });

    it('domínio público é derivado do óbito', () => {
        // 1935 + 71 = 2006 (livre); 1908 + 71 = 1979 (livre)
        assert.deepEqual(ids(filtrarAutores(AUTORES, 'dominio:livre')), [1, 2]);
        assert.deepEqual(ids(filtrarAutores(AUTORES, 'dominio:protegido')), []);
    });

    it('campos sensíveis NÃO entram na busca solta, só por prefixo', () => {
        assert.deepEqual(ids(filtrarAutores(AUTORES, 'heterossexual')), []);
        assert.deepEqual(ids(filtrarAutores(AUTORES, 'epilepsia')), []);
        assert.deepEqual(ids(filtrarAutores(AUTORES, 'depressao')), []);
        assert.deepEqual(ids(filtrarAutores(AUTORES, 'orientacao:heterossexual')), [1]);
        assert.deepEqual(ids(filtrarAutores(AUTORES, 'deficiencia:epilepsia')), [2]);
        assert.deepEqual(ids(filtrarAutores(AUTORES, 'condicao:depressao')), [1]);
        // o tipo (Física/Mental) também é pesquisável
        assert.deepEqual(ids(filtrarAutores(AUTORES, 'condicao:mental')), [1]);
    });

    it('interruptores: palavra inteira e diacríticos', () => {
        const base = { caseSensitive: false, matchDiacritics: false, palavraInteira: false };
        assert.deepEqual(ids(filtrarAutores(AUTORES, 'nome:ass', base)), [2]);
        assert.deepEqual(
            ids(filtrarAutores(AUTORES, 'nome:ass', { ...base, palavraInteira: true })),
            [],
        );
        assert.deepEqual(
            ids(filtrarAutores(AUTORES, 'alvaro', { ...base, matchDiacritics: true })),
            [],
        );
    });

    it('prefixo desconhecido vira termo solto, sem quebrar', () => {
        assert.deepEqual(ids(filtrarAutores(AUTORES, 'titulo:alvaro')), []);
    });
});

describe('mapa de prefixos', () => {
    it('todo prefixo canônico existe no mapa', () => {
        PREFIXOS_CANONICOS_AUTOR.forEach((p) => assert.ok(CAMPOS_ATRIBUTO_AUTOR[p], p));
    });

    it('toda chave do mapa existe no objeto decorado', () => {
        const d = decorarAutorParaBusca(AUTORES[0]);
        Object.values(CAMPOS_ATRIBUTO_AUTOR).forEach((chave) =>
            assert.ok(chave in d, `falta ${chave} em decorarAutorParaBusca`),
        );
    });

    it('parseConsultaBusca com mapa de Autores não reconhece prefixos de Poemas', () => {
        const { gruposIncluir } = parseConsultaBusca('etiqueta:x', CAMPOS_ATRIBUTO_AUTOR);
        assert.equal(gruposIncluir[0][0].campo, null);
    });

    it('parseConsultaBusca sem mapa segue reconhecendo os de Poemas', () => {
        const { gruposIncluir } = parseConsultaBusca('etiqueta:x');
        assert.equal(gruposIncluir[0][0].campo, '_buscaSinalizacoes');
    });
});
