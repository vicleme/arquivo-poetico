import './helpers/localstorage-shim.js';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    chaveTema,
    temasDoTexto,
    assuntosDoTexto,
    resumoTemas,
    temasSemAssunto,
    contarTextosPorAssunto,
} from '../js/utils.js';
import { migrarAssuntos, adicionarTemaAoAssunto } from '../js/db.js';

const assuntos = () => [
    { id: 1, nome: 'Sociedade', notas: '', temas: ['Machismo', 'Polarização'] },
    { id: 2, nome: 'Gênero', notas: '', temas: ['machismo', 'Objetificação'] },
    { id: 3, nome: 'Vazio', notas: '', temas: [] },
];

describe('chaveTema', () => {
    it('ignora caixa, acento e espaços nas pontas', () => {
        assert.equal(chaveTema('  Polarização '), chaveTema('polarizacao'));
        assert.equal(chaveTema(null), '');
    });
});

describe('temasDoTexto', () => {
    it('separa por vírgula, tira espaços e vazios', () => {
        assert.deepEqual(temasDoTexto({ sinalizacoesTema: 'A,  B , ,C' }), ['A', 'B', 'C']);
    });
    it('não repete tema que só difere em caixa/acento', () => {
        assert.deepEqual(temasDoTexto({ sinalizacoesTema: 'Brasil, brasil, Amor' }), [
            'Brasil',
            'Amor',
        ]);
    });
    it('aceita array e ausência do campo', () => {
        assert.deepEqual(temasDoTexto({ sinalizacoesTema: ['X', 'Y'] }), ['X', 'Y']);
        assert.deepEqual(temasDoTexto({}), []);
        assert.deepEqual(temasDoTexto(null), []);
    });
});

describe('assuntosDoTexto', () => {
    it('deriva os Assuntos dos Temas, um tema em vários Assuntos', () => {
        const nomes = assuntosDoTexto({ sinalizacoesTema: 'Machismo' }, assuntos()).map(
            (a) => a.nome,
        );
        assert.deepEqual(nomes, ['Sociedade', 'Gênero']);
    });
    it('não repete o Assunto quando vários temas do texto caem nele', () => {
        const r = assuntosDoTexto(
            { sinalizacoesTema: 'Machismo, Polarização' },
            assuntos().slice(0, 1),
        );
        assert.equal(r.length, 1);
    });
    it('texto sem tema ou com tema solto não tem Assunto', () => {
        assert.deepEqual(assuntosDoTexto({}, assuntos()), []);
        assert.deepEqual(assuntosDoTexto({ sinalizacoesTema: 'Outro' }, assuntos()), []);
        assert.deepEqual(assuntosDoTexto({ sinalizacoesTema: 'Machismo' }, undefined), []);
    });
    it('compara sem diferenciar caixa nem acento', () => {
        const r = assuntosDoTexto({ sinalizacoesTema: 'polarizacao' }, assuntos());
        assert.deepEqual(
            r.map((a) => a.id),
            [1],
        );
    });
});

describe('resumoTemas / temasSemAssunto', () => {
    const textos = [
        { sinalizacoesTema: 'Machismo, Brasil' },
        { sinalizacoesTema: 'machismo' },
        { sinalizacoesTema: 'Machismo, Amor' },
        { sinalizacoesTema: 'Brasil' },
    ];
    it('conta textos por tema unindo variações e usa a grafia mais frequente', () => {
        const r = resumoTemas(textos, assuntos());
        const m = r.find((t) => chaveTema(t.nome) === 'machismo');
        assert.equal(m.nome, 'Machismo');
        assert.equal(m.contagem, 3);
        assert.deepEqual(m.assuntoIds, [1, 2]);
    });
    it('ordena por uso e depois alfabeticamente', () => {
        const r = resumoTemas(textos, assuntos()).map((t) => t.nome);
        assert.deepEqual(r, ['Machismo', 'Brasil', 'Amor']);
    });
    it('lista só os temas sem Assunto', () => {
        assert.deepEqual(
            temasSemAssunto(textos, assuntos()).map((t) => t.nome),
            ['Brasil', 'Amor'],
        );
    });
});

describe('contarTextosPorAssunto', () => {
    it('conta o texto uma vez por Assunto e inclui Assunto sem textos', () => {
        const textos = [
            { sinalizacoesTema: 'Machismo, Polarização' },
            { sinalizacoesTema: 'Objetificação' },
            { sinalizacoesTema: 'Outro' },
        ];
        const c = contarTextosPorAssunto(textos, assuntos());
        assert.equal(c.get(1), 1);
        assert.equal(c.get(2), 2);
        assert.equal(c.get(3), 0);
    });
});

describe('migrarAssuntos', () => {
    it('normaliza nome/notas e, no formato antigo, tira vazios e repetições, sem apagar Assunto', () => {
        const lista = [
            { id: 1, nome: '  Amor ', temas: ['Paixão', 'paixao', '', null, ' Saudade '] },
            { id: 2, nome: 'Sem temas' },
            { id: 3, nome: 'Ruim', notas: 5, temaIds: [10] },
        ];
        migrarAssuntos(lista);
        assert.equal(lista.length, 3);
        assert.equal(lista[0].nome, 'Amor');
        assert.deepEqual(lista[0].temas, ['Paixão', 'Saudade']);
        // Sem `temas` antigo, não inventa a lista: o formato atual é `temaIds`.
        assert.equal(lista[1].temas, undefined);
        assert.equal(lista[1].notas, '');
        assert.deepEqual(lista[2].temaIds, [10]);
        assert.equal(lista[2].notas, '');
    });
    it('é idempotente e tolera entrada vazia', () => {
        const lista = [{ id: 1, nome: 'A', notas: 'n', temas: ['X'] }];
        migrarAssuntos(lista);
        const antes = JSON.stringify(lista);
        migrarAssuntos(lista);
        assert.equal(JSON.stringify(lista), antes);
        migrarAssuntos(undefined);
    });
});
describe('adicionarTemaAoAssunto (por id do Tema)', () => {
    const cadastro = () => [
        { id: 100, nome: 'Luto', notas: '' },
        { id: 101, nome: 'Tema', notas: '' },
    ];
    it('acrescenta o id e recusa repetição, Tema inexistente e Assunto inexistente', () => {
        const dbRef = { assuntos: assuntos(), temas: cadastro() };
        assert.equal(adicionarTemaAoAssunto(dbRef, 3, 100), true);
        assert.deepEqual(dbRef.assuntos[2].temaIds, [100]);
        assert.equal(adicionarTemaAoAssunto(dbRef, 3, 100), false);
        assert.equal(adicionarTemaAoAssunto(dbRef, 3, 999), false);
        assert.equal(adicionarTemaAoAssunto(dbRef, 99, 100), false);
        assert.equal(dbRef.assuntos[2].temaIds.length, 1);
    });
    it('cria a lista de ids quando o Assunto veio sem ela', () => {
        const dbRef = { assuntos: [{ id: 7, nome: 'Novo' }], temas: cadastro() };
        assert.equal(adicionarTemaAoAssunto(dbRef, 7, 101), true);
        assert.deepEqual(dbRef.assuntos[0].temaIds, [101]);
    });
});
