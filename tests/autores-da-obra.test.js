import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    autoresDaEntrada,
    capturarAutoresDaEntrada,
    chaveDeAutor,
    chaveDosAutores,
    definirAutoresDaEntrada,
    entradaTemAutorComVariosNomes,
    mesmaListaDeAutores,
    migrarAutoresDaEntrada,
    migrarAutoresDasEntradas,
    normalizarAutores,
    pareceMaisDeUmNome,
    restaurarAutoresDaEntrada,
    substituirAutorNaLista,
    textoAutoresDaEntrada,
    textoDosAutores,
} from '../js/autores-da-obra.js';

// Autoria em lista (entrega 1): lógica pura dos autores de uma obra citada.

describe('normalizarAutores e autoresDaEntrada', () => {
    it('apara, tira vazios e repetidos e mantém a ordem', () => {
        assert.deepEqual(
            normalizarAutores([' Elis Regina ', '', 'Tom Jobim', 'elis regina', 3, null]),
            ['Elis Regina', 'Tom Jobim'],
        );
        assert.deepEqual(normalizarAutores('não é lista'), []);
    });

    it('lê o formato antigo como UMA tag, sem dividir nomes', () => {
        assert.deepEqual(autoresDaEntrada({ autor: 'Tom Jobim e Vinicius de Moraes' }), [
            'Tom Jobim e Vinicius de Moraes',
        ]);
        assert.deepEqual(autoresDaEntrada({ autor: '  ' }), []);
        assert.deepEqual(autoresDaEntrada({}), []);
        assert.deepEqual(autoresDaEntrada(null), []);
    });

    it('lê o formato novo e a lista vence o texto antigo', () => {
        assert.deepEqual(autoresDaEntrada({ autores: ['A', 'B'] }), ['A', 'B']);
        assert.deepEqual(autoresDaEntrada({ autor: 'Velho', autores: ['Novo'] }), ['Novo']);
    });
});

describe('texto e identidade', () => {
    it('monta a frase com vírgulas e "e"', () => {
        assert.equal(textoDosAutores([]), '');
        assert.equal(textoDosAutores(['A']), 'A');
        assert.equal(textoDosAutores(['A', 'B']), 'A e B');
        assert.equal(textoDosAutores(['A', 'B', 'C']), 'A, B e C');
        assert.equal(textoAutoresDaEntrada({ autores: ['A', 'B'] }), 'A e B');
        assert.equal(textoAutoresDaEntrada({ autor: ' Machado ' }), 'Machado');
    });

    it('a ordem dos autores não conta na identidade, e acento, caixa e pontuação também não', () => {
        assert.equal(
            chaveDosAutores(['Tom Jobim', 'Elis Regina']),
            chaveDosAutores(['elis regina', 'TOM JÓBIM']),
        );
        assert.notEqual(chaveDosAutores(['A']), chaveDosAutores(['A', 'B']));
        assert.equal(chaveDosAutores([]), '');
        assert.equal(chaveDeAutor('  Álvaro  de Campos! '), 'alvaro de campos');
    });

    it('mesmaListaDeAutores vale a ordem e a grafia', () => {
        assert.equal(mesmaListaDeAutores(['A', 'B'], ['A', 'B']), true);
        assert.equal(mesmaListaDeAutores(['A', 'B'], ['B', 'A']), false);
        assert.equal(mesmaListaDeAutores(['tom'], ['Tom']), false);
        assert.equal(mesmaListaDeAutores([], undefined), true);
    });
});

describe('definirAutoresDaEntrada e Desfazer', () => {
    it('entrada antiga com no máximo um autor continua com `autor`', () => {
        const e = { autor: 'Velho' };
        definirAutoresDaEntrada(e, ['Novo']);
        assert.deepEqual(e, { autor: 'Novo' });
        definirAutoresDaEntrada(e, []);
        assert.deepEqual(e, { autor: '' });
    });

    it('mais de um autor grava `autores` e tira `autor`', () => {
        const e = { autor: 'Velho' };
        definirAutoresDaEntrada(e, ['A', 'B']);
        assert.deepEqual(e, { autores: ['A', 'B'] });
    });

    it('entrada já no formato novo continua nele, mesmo com um autor só', () => {
        const e = { autores: ['A', 'B'] };
        definirAutoresDaEntrada(e, ['A']);
        assert.deepEqual(e, { autores: ['A'] });
    });

    it('o Desfazer devolve as chaves como estavam, inclusive a ausência delas', () => {
        const antigo = { autor: 'Velho', obra: 'X' };
        const foto = capturarAutoresDaEntrada(antigo);
        definirAutoresDaEntrada(antigo, ['A', 'B']);
        restaurarAutoresDaEntrada(antigo, foto);
        assert.deepEqual(antigo, { autor: 'Velho', obra: 'X' });

        const semAutor = { obra: 'Y' };
        const foto2 = capturarAutoresDaEntrada(semAutor);
        definirAutoresDaEntrada(semAutor, ['A']);
        assert.deepEqual(semAutor, { obra: 'Y', autor: 'A' });
        restaurarAutoresDaEntrada(semAutor, foto2);
        assert.deepEqual(semAutor, { obra: 'Y' });

        const novo = { autores: ['A', 'B'] };
        const foto3 = capturarAutoresDaEntrada(novo);
        definirAutoresDaEntrada(novo, ['C']);
        restaurarAutoresDaEntrada(novo, foto3);
        assert.deepEqual(novo, { autores: ['A', 'B'] });
    });
});

describe('substituirAutorNaLista', () => {
    it('troca no lugar sem mexer nos outros', () => {
        assert.deepEqual(substituirAutorNaLista(['A', 'Tom', 'B'], new Set(['tom']), 'Tom Jobim'), [
            'A',
            'Tom Jobim',
            'B',
        ]);
    });

    it('junta quando o autor novo já estava na lista ou dois alvos viram um', () => {
        assert.deepEqual(substituirAutorNaLista(['Tom', 'Tom Jobim'], ['tom'], 'Tom Jobim'), [
            'Tom Jobim',
        ]);
        assert.deepEqual(
            substituirAutorNaLista(['T. Jobim', 'Tom', 'B'], ['t jobim', 'tom'], 'Tom Jobim'),
            ['Tom Jobim', 'B'],
        );
    });

    it('não muda a lista original', () => {
        const lista = ['A', 'B'];
        substituirAutorNaLista(lista, ['a'], 'Z');
        assert.deepEqual(lista, ['A', 'B']);
    });
});

describe('migração', () => {
    it('cada autor vira uma tag só e `autor` sai', () => {
        const e = { obra: 'X', autor: 'Tom Jobim e Vinicius de Moraes' };
        assert.equal(migrarAutoresDaEntrada(e), true);
        assert.deepEqual(e, { obra: 'X', autores: ['Tom Jobim e Vinicius de Moraes'] });
    });

    it('autor vazio ou ausente vira lista vazia', () => {
        const vazio = { autor: '' };
        migrarAutoresDaEntrada(vazio);
        assert.deepEqual(vazio, { autores: [] });
        const ausente = { obra: 'X' };
        migrarAutoresDaEntrada(ausente);
        assert.deepEqual(ausente, { obra: 'X', autores: [] });
    });

    it('é idempotente e não mexe em quem já está no formato novo', () => {
        const e = { autores: ['A', 'B'] };
        assert.equal(migrarAutoresDaEntrada(e), false);
        assert.deepEqual(e, { autores: ['A', 'B'] });
        const velho = { autor: 'A' };
        migrarAutoresDaEntrada(velho);
        assert.equal(migrarAutoresDaEntrada(velho), false);
    });

    it('com os dois formatos, o `autor` que não está na lista entra no fim', () => {
        const e = { autor: 'C', autores: ['A', 'B'] };
        migrarAutoresDaEntrada(e);
        assert.deepEqual(e, { autores: ['A', 'B', 'C'] });
        const igual = { autor: 'a', autores: ['A'] };
        migrarAutoresDaEntrada(igual);
        assert.deepEqual(igual, { autores: ['A'] });
    });

    it('migra Intertextualidade e Hipertextualidade dos itens e conta quantos mudaram', () => {
        const itens = [
            {
                id: 1,
                intertextualidade: [{ obra: 'X', autor: 'A' }],
                hipertextualidade: [{ hipotexto: 'Y', autor: '' }],
            },
            { id: 2, intertextualidade: [{ obra: 'Z', autores: ['B'] }] },
            { id: 3 },
            null,
        ];
        assert.equal(migrarAutoresDasEntradas(itens), 1);
        assert.deepEqual(itens[0].intertextualidade[0], { obra: 'X', autores: ['A'] });
        assert.deepEqual(itens[0].hipertextualidade[0], { hipotexto: 'Y', autores: [] });
        assert.equal(migrarAutoresDasEntradas(itens), 0);
        assert.equal(migrarAutoresDasEntradas(undefined), 0);
    });

    it('não toca em Referências', () => {
        const itens = [{ referenciasExternas: [{ tipo: 'Notícia', texto: 'X', autor: 'Y' }] }];
        migrarAutoresDasEntradas(itens);
        assert.deepEqual(itens[0].referenciasExternas[0], {
            tipo: 'Notícia',
            texto: 'X',
            autor: 'Y',
        });
    });
});

describe('autor que parece ter mais de um nome', () => {
    it('acha " e ", " & ", feat., vírgula e afins', () => {
        [
            'Tom Jobim e Vinicius de Moraes',
            'Simon and Garfunkel',
            'Sergio Mendes & Brasil 66',
            'Anitta feat. Caetano',
            'Anitta (feat. Caetano)',
            'Fulano ft. Ciclano',
            'Silva, João',
            'A; B',
            'A + B',
        ].forEach((nome) => assert.equal(pareceMaisDeUmNome(nome), true, nome));
    });

    it('deixa passar nome de uma pessoa só', () => {
        ['Machado de Assis', 'Caetano Veloso', 'Clarice Lispector', 'Ferreira Gullar', ''].forEach(
            (nome) => assert.equal(pareceMaisDeUmNome(nome), false, nome),
        );
    });

    it('olha cada tag da entrada', () => {
        assert.equal(
            entradaTemAutorComVariosNomes({ autores: ['Elis Regina', 'Tom Jobim'] }),
            false,
        );
        assert.equal(
            entradaTemAutorComVariosNomes({ autores: ['Elis Regina', 'Tom e Vinicius'] }),
            true,
        );
        assert.equal(entradaTemAutorComVariosNomes({ autor: 'Tom e Vinicius' }), true);
    });
});
